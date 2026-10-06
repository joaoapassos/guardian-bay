import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({
  getDb: () => ({
    transaction: async () => {
      throw new Error("Synthetic private SQL connection details");
    },
  }),
}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

import { readAudit } from "./read-audit";

it("ECMSG-114: erro operacional sanitizado mesmo com logger indisponível", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {
    throw new Error("Synthetic unavailable log sink");
  });
  try {
    await expect(readAudit()).rejects.toThrow(
      /^Não foi possível consultar a auditoria\.$/,
    );
  } finally {
    warn.mockRestore();
  }
});
