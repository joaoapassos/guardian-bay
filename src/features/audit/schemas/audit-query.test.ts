import { expect, it } from "vitest";
import { auditQuerySchema } from "./audit-query";

it("ECMSG-116: filtros fechados, UUIDs exatos, limites e sort allowlisted", () => {
  expect(auditQuerySchema.parse({})).toMatchObject({
    page: 1,
    limit: 20,
    sort: "newest",
  });
  expect(
    auditQuerySchema.safeParse({
      limit: "50",
      page: "1000",
      sort: "oldest",
      eventType: "order.completed",
      outcome: "FAILED",
    }).success,
  ).toBe(true);
  for (const input of [
    { limit: "0" },
    { limit: "51" },
    { page: "1001" },
    { page: "-1" },
    { page: "1.2" },
    { sort: "occurred_at;drop" },
    { eventType: "admin.free" },
    { outcome: "DENIED" },
    { actorUserId: "a".repeat(500) },
    { targetId: "' OR 1=1 --" },
    { actorUserId: ["valid"] },
    { role: "admin" },
    { correlationId: "forged" },
  ])
    expect(auditQuerySchema.safeParse(input).success).toBe(false);
});
