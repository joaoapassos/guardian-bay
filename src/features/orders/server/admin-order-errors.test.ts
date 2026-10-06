import { expect, it, vi } from "vitest";
import { adminOrderDetail } from "./admin-order-detail";
import { adminOrderList } from "./admin-order-list";

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({
  getDb: () => {
    throw new Error("Internal SQL and credential details");
  },
}));
it("ECMSG-102: falhas internas são sanitizadas e logs usam somente allowlist", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  try {
    await expect(adminOrderList()).rejects.toThrow(
      "Não foi possível consultar pedidos administrativos.",
    );
    await expect(
      adminOrderDetail("00000000-0000-4000-8000-000000000001"),
    ).rejects.toThrow("Não foi possível consultar o pedido administrativo.");
    expect(warn).toHaveBeenCalledTimes(2);
    for (const [event] of warn.mock.calls) {
      expect(Object.keys(event).sort()).toEqual([
        "correlationId",
        "event",
        "operation",
        "result",
        "timestamp",
      ]);
      expect(JSON.stringify(event)).not.toMatch(/Internal|credential|SQL/);
    }
  } finally {
    warn.mockRestore();
  }
});
