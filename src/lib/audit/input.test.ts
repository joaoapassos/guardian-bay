import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { auditInputSchema } from "./input";

const actor = randomUUID();
const valid = {
  eventType: "auth.login.succeeded",
  outcome: "SUCCESS",
  actorUserId: actor,
  targetType: "user",
  targetId: actor,
};
it("ECMSG-107: contrato fechado rejeita dados sensíveis, extras e semântica inválida", () => {
  expect(auditInputSchema.safeParse(valid).success).toBe(true);
  for (const field of [
    "password",
    "hash",
    "token",
    "cookie",
    "headers",
    "payload",
    "metadata",
    "checkoutKey",
    "DATABASE_URL",
    "sql",
    "stack",
    "ip",
    "snapshot",
    "cart",
    "correlationId",
  ])
    expect(
      auditInputSchema.safeParse({ ...valid, [field]: "synthetic-forbidden" })
        .success,
    ).toBe(false);
  for (const invalid of [
    { eventType: "client.free" },
    { outcome: "FAILED" },
    { targetType: "order" },
    { targetId: randomUUID() },
    { actorUserId: null },
  ])
    expect(auditInputSchema.safeParse({ ...valid, ...invalid }).success).toBe(
      false,
    );
});

it("ECMSG-116: nomes plausíveis fora da allowlist também são rejeitados", () => {
  for (const eventType of ["admin.product.free", "admin.inventory.free"])
    expect(
      auditInputSchema.safeParse({
        ...valid,
        eventType,
        targetId: randomUUID(),
        targetType: eventType.includes("product") ? "product" : "inventory",
      }).success,
    ).toBe(false);
});
