import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readCart } from "@/features/cart/server/read-cart";
import { CheckoutConfirmation } from "@/features/orders/components/checkout-confirmation";
import { checkoutPreview } from "@/features/orders/server/checkout-preview";
import { moneyDto } from "@/lib/money/price";

export default async function CheckoutPage() {
  const preview = await checkoutPreview();
  if (!preview.success && preview.code === "UNAUTHENTICATED")
    redirect("/login");
  const cart =
    !preview.success &&
    (preview.code === "UNAVAILABLE" || preview.code === "OUT_OF_STOCK")
      ? await readCart()
      : null;
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <h1 className="mb-6 text-3xl font-semibold">Checkout</h1>
      <p>
        Valores e elegibilidade são confirmados novamente no servidor. O
        carrinho não reserva estoque nem congela preços.
      </p>
      <p className="mt-3">
        Pagamento exclusivamente simulado, sem dados financeiros. Totais a
        partir de R$ 10.000,00 são recusados pela regra acadêmica.
      </p>
      {preview.success ? (
        <>
          <ul className="mt-6 grid gap-4">
            {preview.snapshot.items.map((item) => (
              <li key={item.productId} className="rounded border p-4">
                <h2>{item.productName}</h2>
                <p>Quantidade: {item.quantity}</p>
                <p>Preço atual: {moneyDto(item.unitAmount).formatted}</p>
                <p>Subtotal: {moneyDto(item.subtotalAmount).formatted}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6 font-semibold">
            Total: {preview.snapshot.total.formatted}
          </p>
          <CheckoutConfirmation checkoutKey={randomUUID()} />
        </>
      ) : (
        <>
          <p role="alert" className="mt-6">
            {preview.code === "EMPTY_CART"
              ? "Seu carrinho está vazio."
              : preview.code === "OUT_OF_STOCK"
                ? "Estoque insuficiente. Corrija o carrinho; não há checkout parcial."
                : "Produto indisponível. Corrija o carrinho antes de confirmar; não há checkout parcial."}
          </p>
          {cart?.success && (
            <ul>
              {cart.items.map((item) => (
                <li key={item.productId}>
                  {item.name} — quantidade {item.quantity}
                  {!item.available && " — indisponível"}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <Link href="/cart" className="mt-6 block underline">
        Voltar ao carrinho
      </Link>
    </main>
  );
}
