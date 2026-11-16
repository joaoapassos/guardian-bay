import { expect, it } from "vitest";
import { adminUserEditSchema } from "./admin-user-edit.schema";

const valid = {
  userId: "00000000-0000-4000-8000-000000000001",
  name: "Pessoa Exemplo",
  email: "pessoa@example.test",
  password: "",
};
it("validates editing and rejects authority or weak replacement passwords", () => {
  expect(adminUserEditSchema.safeParse(valid).success).toBe(true);
  expect(
    adminUserEditSchema.safeParse({ ...valid, password: "Senha Segura 123!" })
      .success,
  ).toBe(true);
  expect(
    adminUserEditSchema.safeParse({ ...valid, password: "weak" }).success,
  ).toBe(false);
  expect(
    adminUserEditSchema.safeParse({ ...valid, role: "admin" }).success,
  ).toBe(false);
});
