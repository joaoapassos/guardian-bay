import type { z } from "zod";
import type { addressSnapshotSchema } from "@/features/addresses/schemas/address";
import type { CardFormInput } from "@/features/payments/schemas/card";

export type CheckoutFormValues = {
  buyer: { name: string; cpf: string; save: boolean };
  address: z.input<typeof addressSnapshotSchema>;
  saveAddress: boolean;
  card: CardFormInput;
  saveCard: boolean;
};
export type CheckoutBuyerProfile = {
  name: string | null;
  cpfMask: string | null;
};
