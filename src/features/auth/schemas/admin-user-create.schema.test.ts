import { expect, it } from "vitest";
import { adminUserCreateSchema } from "./admin-user-create.schema";

const valid = {
  name: "Pessoa Exemplo",
  email: "pessoa@example.test",
  password: "Senha Segura 123!",
};

it("accepts registration credentials and rejects client-supplied authority", () => {
  expect(adminUserCreateSchema.safeParse(valid).success).toBe(true);
  expect(
    adminUserCreateSchema.safeParse({ ...valid, role: "admin" }).success,
  ).toBe(false);
  expect(
    adminUserCreateSchema.safeParse({ ...valid, password: "short" }).success,
  ).toBe(false);
});
