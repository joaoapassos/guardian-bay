import { z } from "zod";

export const brazilStates = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;
const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1, "Campo obrigatório.")
    .max(max, `Use até ${max} caracteres.`);
export const addressSnapshotSchema = z
  .object({
    recipient: text(100),
    postalCode: z
      .string()
      .trim()
      .regex(/^\d{5}-?\d{3}$/, "Informe um CEP com 8 dígitos.")
      .transform((value) => value.replace("-", "")),
    street: text(160),
    number: text(20),
    complement: z.string().trim().max(100),
    neighborhood: text(100),
    city: text(100),
    state: z.enum(brazilStates, "Selecione uma UF válida."),
    country: z.literal("BR"),
  })
  .strict();
export const addressReferenceSchema = z
  .object({ id: z.uuid(), revision: z.number().int().min(1).max(2147483646) })
  .strict();
export const updateAddressSchema = addressSnapshotSchema
  .extend(addressReferenceSchema.shape)
  .strict();
export type AddressSnapshot = z.infer<typeof addressSnapshotSchema>;
export type AddressDto = AddressSnapshot &
  z.infer<typeof addressReferenceSchema>;
