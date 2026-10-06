import { z } from "zod";
import { multiplyPrice, priceSchema, sumMoney } from "@/lib/money/price";

const snapshotInput = z
  .array(
    z.strictObject({
      productId: z.uuid(),
      productName: z.string().trim().min(1).max(120),
      quantity: z.number().int().min(1).max(99),
      price: priceSchema,
    }),
  )
  .min(1)
  .max(100);

// Input is assembled from locked DB rows; it is never the checkout contract.
export function createOrderSnapshot(input: unknown) {
  const rows = snapshotInput.parse(input);
  if (new Set(rows.map((row) => row.productId)).size !== rows.length)
    throw new Error("Itens duplicados.");
  const items = rows.map((row) => ({
    productId: row.productId,
    productName: row.productName,
    quantity: row.quantity,
    unitAmount: row.price.amount,
    currency: row.price.currency,
    subtotalAmount: multiplyPrice(row.price, row.quantity).amount,
  }));
  const total = sumMoney(items.map((item) => item.subtotalAmount));
  return { items, total };
}
