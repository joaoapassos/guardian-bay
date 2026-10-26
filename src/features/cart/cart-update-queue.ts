export type CartUpdateResult =
  | { success: true; changed?: false }
  | { success: false; code: string; retryAfterMs?: number };

type Job = {
  quantity: number;
  due: number;
  resolve: (result: CartUpdateResult) => void;
};

// UI intentions only. Server responses remain authoritative for every write.
export class CartUpdateQueue {
  private jobs = new Map<string, Job>();
  private confirmed = new Map<string, number>();
  private failed = new Set<string>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private active: { id: string; job: Job; epoch: number } | undefined;
  private lastSent = Number.NEGATIVE_INFINITY;
  private epoch = 0;
  private refreshing = false;
  private needsRefresh = false;
  private force = false;
  private waiters: ((ok: boolean) => void)[] = [];

  constructor(
    private send: (id: string, quantity: number) => Promise<CartUpdateResult>,
    private refresh: () => Promise<void>,
  ) {}

  request(
    id: string,
    quantity: number,
    baseline: number,
  ): Promise<CartUpdateResult> {
    this.jobs.get(id)?.resolve({ success: false, code: "SUPERSEDED" });
    this.jobs.delete(id);
    if (!this.confirmed.has(id)) this.confirmed.set(id, baseline);
    if (this.active?.id !== id && this.confirmed.get(id) === quantity) {
      this.failed.delete(id);
      this.schedule();
      return Promise.resolve({ success: true, changed: false });
    }
    const result = new Promise<CartUpdateResult>((resolve) => {
      this.jobs.set(id, { quantity, due: Date.now() + 500, resolve });
    });
    this.schedule();
    return result;
  }

  cancel(id: string) {
    this.jobs.get(id)?.resolve({ success: false, code: "CANCELLED" });
    this.jobs.delete(id);
    this.failed.delete(id);
    this.schedule();
  }

  clear() {
    this.epoch++;
    clearTimeout(this.timer);
    for (const job of this.jobs.values())
      job.resolve({ success: false, code: "CANCELLED" });
    this.active?.job.resolve({ success: false, code: "CANCELLED" });
    this.jobs.clear();
    this.confirmed.clear();
    this.failed.clear();
    this.needsRefresh = false;
    this.force = false;
    for (const resolve of this.waiters.splice(0)) resolve(false);
  }

  flush(): Promise<boolean> {
    this.force = true;
    const result = new Promise<boolean>((resolve) =>
      this.waiters.push(resolve),
    );
    this.schedule();
    return result;
  }

  private schedule() {
    clearTimeout(this.timer);
    if (this.active || this.refreshing) return;
    const entry = this.jobs.entries().next().value;
    if (!entry) {
      if (this.needsRefresh) {
        void this.reconcile();
      } else {
        const cooldown = this.lastSent + 500 - Date.now();
        if (this.force && cooldown > 0) {
          this.timer = setTimeout(() => this.schedule(), cooldown);
          return;
        }
        this.force = false;
        for (const resolve of this.waiters.splice(0))
          resolve(this.failed.size === 0);
      }
      return;
    }
    const [id, job] = entry;
    const delay = Math.max(
      0,
      this.lastSent + 500 - Date.now(),
      this.force ? 0 : job.due - Date.now(),
    );
    this.timer = setTimeout(() => {
      void this.dispatch(id, job);
    }, delay);
  }

  private async dispatch(id: string, job: Job) {
    if (this.jobs.get(id) !== job || this.active) return;
    this.jobs.delete(id);
    const epoch = this.epoch;
    this.active = { id, job, epoch };
    this.lastSent = Date.now();
    let result: CartUpdateResult;
    try {
      result = await this.send(id, job.quantity);
    } catch {
      result = { success: false, code: "OPERATION_FAILED" };
    }
    // Start the next write interval after acknowledgement, not before network latency.
    this.lastSent = Date.now();
    if (epoch === this.epoch) {
      if (result.success) {
        this.confirmed.set(id, job.quantity);
        this.failed.delete(id);
        if (result.changed !== false) this.needsRefresh = true;
      } else {
        this.failed.add(id);
      }
      job.resolve(result);
    }
    this.active = undefined;
    this.schedule();
  }

  private async reconcile() {
    this.refreshing = true;
    this.needsRefresh = false;
    const epoch = this.epoch;
    try {
      await this.refresh();
      if (epoch === this.epoch) this.failed.delete("__read__");
    } catch {
      if (epoch === this.epoch) this.failed.add("__read__");
    } finally {
      this.refreshing = false;
      this.schedule();
    }
  }
}
