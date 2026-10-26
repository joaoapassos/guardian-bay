import { z } from "zod";
import { addressSnapshotSchema } from "@/features/addresses/schemas/address";
import { buyerSchema } from "@/features/buyers/schemas/buyer";
import { checkoutCardPaymentSchema } from "@/features/payments/schemas/card";
export const checkoutSchema = z
  .strictObject({
    checkoutKey: z.uuid(),
    addressId: z.uuid().optional(),
    address: addressSnapshotSchema.optional(),
    saveAddress: z.boolean().optional().default(false),
    buyer: z.union([
      buyerSchema.extend({
        source: z.literal("new"),
        save: z.boolean().optional().default(false),
      }),
      z.strictObject({ source: z.literal("saved") }),
    ]),
    payment: z
      .union([
        checkoutCardPaymentSchema,
        z.strictObject({ method: z.literal("CARD"), cardId: z.uuid() }),
        z.strictObject({ method: z.enum(["PIX", "BOLETO"]) }),
      ])
      .optional(),
  })
  .refine((value) => Boolean(value.addressId) !== Boolean(value.address), {
    path: ["address"],
    message: "Selecione ou informe um endereço.",
  })
  .refine((value) => !value.saveAddress || Boolean(value.address), {
    path: ["saveAddress"],
    message: "Somente um novo endereço pode ser salvo.",
  });
