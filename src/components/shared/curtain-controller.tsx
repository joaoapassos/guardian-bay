"use client";
import { usePathname } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { CurtainContext } from "./curtain-context";

type Intent = {
  sequence: number;
  from: string;
  href: string;
  started: number;
  phase: "entering" | "covered" | "exiting";
  ready: boolean;
  phaseStarted: number;
};

const CURTAIN_PHASE_MS = 500;
const CURTAIN_HOLD_MS = 900;

export function CurtainController({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [intent, setIntent] = useState<Intent | null>(null);
  const current = useRef<Intent | null>(null);
  const sequence = useRef(0);
  const publish = useCallback((next: Intent | null) => {
    current.current = next;
    setIntent(next);
  }, []);
  const release = useCallback(() => {
    publish(null);
    delete document.documentElement.dataset.curtain;
  }, [publish]);
  const begin = useCallback(
    (href: string) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        release();
        return;
      }
      const destination = new URL(href, window.location.origin);
      if (destination.origin !== window.location.origin) return;
      document.documentElement.dataset.curtain = "active";
      // A newer intention never extends an existing occlusion deadline.
      publish({
        sequence: ++sequence.current,
        from: window.location.pathname,
        href: destination.pathname + destination.search,
        started: current.current?.started ?? Date.now(),
        phase: "entering",
        phaseStarted: Date.now(),
        ready: false,
      });
    },
    [publish, release],
  );
  const ready = useCallback(
    (href: string) => {
      const active = current.current;
      if (!active || active.href !== href) return;
      publish({
        ...active,
        ready: true,
      });
    },
    [publish],
  );
  const phase = intent?.phase;
  const activeSequence = intent?.sequence;
  const started = intent?.started;
  const destinationReady = intent?.ready;
  const phaseStarted = intent?.phaseStarted;
  useEffect(() => {
    if (
      !phase ||
      activeSequence === undefined ||
      started === undefined ||
      phaseStarted === undefined
    )
      return;
    document.documentElement.dataset.curtain = "active";
    // CSS events are optional: both each phase and total occlusion are bounded.
    const watchdog = setTimeout(
      release,
      Math.max(0, 5000 - (Date.now() - started)),
    );
    const phaseTimer =
      phase === "covered" && !destinationReady
        ? undefined
        : setTimeout(
            () => {
              const active = current.current;
              if (!active || active.sequence !== activeSequence) return;
              if (active.phase === "exiting") release();
              else if (active.phase === "covered")
                publish({
                  ...active,
                  phase: "exiting",
                  phaseStarted: Date.now(),
                });
              else
                publish({
                  ...active,
                  phase: "covered",
                  phaseStarted: Date.now(),
                });
            },
            Math.max(
              0,
              (phase === "covered" ? CURTAIN_HOLD_MS : CURTAIN_PHASE_MS) -
                (Date.now() - phaseStarted),
            ),
          );
    return () => {
      clearTimeout(watchdog);
      clearTimeout(phaseTimer);
      delete document.documentElement.dataset.curtain;
    };
  }, [
    phase,
    activeSequence,
    started,
    destinationReady,
    phaseStarted,
    publish,
    release,
  ]);
  useEffect(() => {
    const active = current.current;
    // A redirect is terminal; never wait for the originally requested private page.
    if (
      active &&
      path !== active.from &&
      path !== new URL(active.href, window.location.origin).pathname
    )
      release();
  }, [path, release]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reduced = () => {
      if (media.matches) release();
    };
    const visible = () => {
      if (!document.hidden) release();
    };
    const cancel = (event: KeyboardEvent) => {
      if (event.key === "Escape") release();
    };
    media.addEventListener("change", reduced);
    window.addEventListener("pageshow", release);
    window.addEventListener("popstate", release);
    document.addEventListener("visibilitychange", visible);
    document.addEventListener("keydown", cancel);
    return () => {
      media.removeEventListener("change", reduced);
      window.removeEventListener("pageshow", release);
      window.removeEventListener("popstate", release);
      document.removeEventListener("visibilitychange", visible);
      document.removeEventListener("keydown", cancel);
      delete document.documentElement.dataset.curtain;
    };
  }, [release]);
  return (
    <CurtainContext value={{ begin, ready }}>
      <div inert={Boolean(intent)} className="flex flex-1 flex-col">
        {children}
      </div>
      {intent && (
        <div
          className="gb-curtain"
          data-phase={intent.phase}
          key={intent.sequence}
          style={{ animationDuration: `${CURTAIN_PHASE_MS}ms` }}
        >
          <span
            className="font-editorial text-3xl font-extrabold tracking-tight sm:text-5xl"
            aria-hidden="true"
          >
            GUARDIAN BAY
          </span>
          <output className="mt-5 text-sm">
            {intent.phase === "covered" && !intent.ready
              ? "Carregando página…"
              : "Abrindo página…"}
          </output>
          <button
            type="button"
            onClick={release}
            className="mt-6 cursor-pointer rounded-control border border-current px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            Continuar navegação
          </button>
        </div>
      )}
    </CurtainContext>
  );
}
