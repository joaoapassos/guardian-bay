import { multiplyPrice, sumMoney } from "@/lib/money/price";

export function calculateCart<
  T extends {
    quantity: number;
    available: boolean;
    stockSufficient?: boolean;
    price: { amount: number; currency: "BRL" };
  },
>(items: T[]) {
  if (items.length > 100) throw new Error("Limite do carrinho excedido.");
  const calculated = items.map((item) => ({
    ...item,
    subtotal:
      item.available && item.stockSufficient !== false
        ? multiplyPrice(
            { amount: item.price.amount, currency: item.price.currency },
            item.quantity,
          )
        : null,
  }));
  return {
    items: calculated,
    total: sumMoney(
      calculated.flatMap((item) =>
        item.subtotal ? [item.subtotal.amount] : [],
      ),
    ),
  };
}
