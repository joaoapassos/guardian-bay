import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readCheckoutAddresses } from "@/features/addresses/server/read-addresses";
import { loginHref } from "@/features/auth/safe-return";
import { readBuyerProfile } from "@/features/buyers/server/buyer-profile";
import { readCart } from "@/features/cart/server/read-cart";
import { CheckoutConfirmation } from "@/features/orders/components/checkout-confirmation";
import { OrderSummary } from "@/features/orders/components/order-summary";
import { checkoutPreview } from "@/features/orders/server/checkout-preview";
import { readPaymentMethods } from "@/features/payments/server/payment-methods";
import { moneyDto } from "@/lib/money/price";

export default async function CheckoutPage() {
  const preview = await checkoutPreview();
  if (!preview.success && preview.code === "UNAUTHENTICATED")
    redirect(loginHref("/checkout"));
  const [cardResult, addressResult, profile] = preview.success
    ? await Promise.all([
        readPaymentMethods(),
        readCheckoutAddresses(),
        readBuyerProfile(),
      ])
    : [null, null, null];
  if (
    preview.success &&
    (!cardResult?.success || !addressResult?.success || !profile)
  )
    redirect(loginHref("/checkout"));
  const cart =
    !preview.success &&
    (preview.code === "UNAVAILABLE" || preview.code === "OUT_OF_STOCK")
      ? await readCart()
      : null;
  return (
    <main id="main-content" tabIndex={-1} className="store-page max-w-5xl">
      <header>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
          Revise sua compra
        </p>
        <h1 className="store-title">Checkout</h1>
      </header>
      <p>
        Valores e elegibilidade são confirmados novamente no servidor. O
        carrinho não reserva estoque nem congela preços.
      </p>
      <p className="mt-3">
        Pagamento exclusivamente simulado, sem movimentação financeira. Totais a
        partir de R$ 10.000,00 são recusados pela regra acadêmica.
      </p>
      {preview.success ? (
        <>
          <OrderSummary
            priceLabel="Preço atual"
            items={preview.snapshot.items.map((item) => ({
              productName: item.productName,
              quantity: item.quantity,
              price: moneyDto(item.unitAmount),
              subtotal: moneyDto(item.subtotalAmount),
            }))}
            total={preview.snapshot.total}
          />
          <CheckoutConfirmation
            checkoutKey={randomUUID()}
            cards={cardResult?.success ? cardResult.paymentMethods : []}
            addresses={addressResult?.success ? addressResult.addresses : []}
            profile={{
              name: profile?.name ?? null,
              cpfMask: profile?.cpfMask ?? null,
            }}
          />
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
      <Link href="/cart" className="auth-link mt-6 inline-block">
        Voltar ao carrinho
      </Link>
    </main>
  );
}
