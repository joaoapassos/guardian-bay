import { z } from "zod";

export const personNameSchema = z
  .string()
  .trim()
  .min(2, "Informe o nome completo.")
  .max(100)
  .refine((value) => !/[\p{Cc}\p{Cf}]/u.test(value), "Informe um nome válido.");
export const optionalNameSchema = z
  .union([z.literal(""), personNameSchema])
  .optional();
export function validCpf(value: string) {
  if (!/^\d{11}$/.test(value) || /^(\d)\1{10}$/.test(value)) return false;
  for (const length of [9, 10]) {
    let sum = 0;
    for (let index = 0; index < length; index++)
      sum += Number(value[index]) * (length + 1 - index);
    const check = ((sum * 10) % 11) % 10;
    if (check !== Number(value[length])) return false;
  }
  return true;
}
export const cpfSchema = z
  .string()
  .max(14)
  .trim()
  .regex(/^(?:\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/, "Informe um CPF válido.")
  .transform((value) => value.replace(/[.-]/g, ""))
  .refine(validCpf, "Confira os dígitos do CPF.");
export const buyerSchema = z.strictObject({
  name: personNameSchema,
  cpf: cpfSchema,
});
export function maskedCpf(last2: string) {
  return `•••.•••.•••-${last2}`;
}
