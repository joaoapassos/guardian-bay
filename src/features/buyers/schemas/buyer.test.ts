import { expect, it } from "vitest";
import { buyerSchema, validCpf } from "./buyer";

it("validates CPF check digits without claiming identity verification", () => {
  expect(validCpf("52998224725")).toBe(true);
  expect(validCpf("52998224726")).toBe(false);
  expect(validCpf("11111111111")).toBe(false);
  expect(
    buyerSchema.safeParse({ name: "Pessoa Teste", cpf: "529.982.247-25" })
      .success,
  ).toBe(true);
  expect(
    buyerSchema.safeParse({
      name: "Pessoa Teste",
      cpf: "52998224725",
      role: "admin",
    }).success,
  ).toBe(false);
});
