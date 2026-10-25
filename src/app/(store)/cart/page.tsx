import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CartItemControls } from "@/features/cart/components/cart-item-controls";
import { readCart } from "@/features/cart/server/read-cart";
import { ProductImage } from "@/features/catalog/components/product-image";

export default async function CartPage() {
  const result = await readCart();
  if (!result.success) redirect("/login?returnTo=%2Fcart");
  const blocked = result.items.some((item) => item.subtotal === null);
  const count = result.items.reduce((total, item) => total + item.quantity, 0);
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-5 py-8 font-auth text-ink sm:px-8 lg:py-12"
    >
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/products" className="auth-link">
          Produtos
        </Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">Carrinho</span>
      </nav>
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
            Sua seleção
          </p>
          <h1
            id="cart-title"
            tabIndex={-1}
            className="font-editorial text-4xl leading-tight text-coast sm:text-5xl"
          >
            Carrinho
          </h1>
          <p className="mt-4 text-muted">
            {count}{" "}
            {count === 1 ? "unidade confirmada" : "unidades confirmadas"} no
            carrinho
          </p>
        </div>
        <Link href="/products" className="auth-link">
          Continuar comprando
        </Link>
      </header>
      {result.items.length === 0 ? (
        <section className="rounded-panel border border-line bg-surface p-8 sm:p-12">
          <h2 className="font-editorial text-2xl text-coast">
            Seu carrinho está vazio
          </h2>
          <p className="my-4 max-w-xl leading-relaxed text-muted">
            Explore o catálogo e escolha os produtos que fazem sentido para o
            seu dia a dia.
          </p>
          <Link href="/products" className="auth-link">
            Ver produtos
          </Link>
        </section>
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <ul className="grid min-w-0 gap-5">
            {result.items.map((item, index) => (
              <li
                key={item.productId}
                className="grid gap-5 rounded-panel border border-line bg-surface p-5 sm:grid-cols-[96px_minmax(0,1fr)] sm:p-6"
              >
                <div className="self-start rounded-card bg-white">
                  <ProductImage image={item.image} size="thumbnail" />
                </div>
                <div className="min-w-0">
                  <h2
                    id={`cart-item-${item.productId}`}
                    tabIndex={-1}
                    className="break-words text-lg font-semibold"
                  >
                    {item.available ? (
                      <Link
                        href={`/products/${item.productId}`}
                        className="rounded-sm text-coast hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coast"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      item.name
                    )}
                  </h2>
                  <p className="mt-3 text-sm text-muted">
                    Preço atual:{" "}
                    <span className="font-semibold tabular-nums text-ink">
                      {item.price.formatted}
                    </span>
                    {!item.available && " (referência)"}
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    Quantidade confirmada: {item.quantity}
                  </p>
                  {item.subtotal ? (
                    <p className="mt-3 font-semibold tabular-nums text-coast">
                      Subtotal: {item.subtotal.formatted}
                    </p>
                  ) : (
                    <p className="mt-3 rounded-control border border-danger p-3 text-sm text-danger">
                      {!item.available
                        ? "Produto indisponível."
                        : "Estoque insuficiente."}{" "}
                      Não incluído no total.{" "}
                      {item.available
                        ? "Reduza a quantidade ou remova este item para continuar."
                        : "Remova este item para continuar."}
                    </p>
                  )}
                  <CartItemControls
                    productId={item.productId}
                    productName={item.name}
                    nextItemId={result.items[index + 1]?.productId}
                    quantity={item.quantity}
                    available={item.available}
                  />
                </div>
              </li>
            ))}
          </ul>
          <aside
            aria-labelledby="cart-summary-title"
            className="space-y-5 rounded-panel border border-line bg-surface p-6"
          >
            <h2
              id="cart-summary-title"
              className="font-editorial text-2xl text-coast"
            >
              Resumo do carrinho
            </h2>
            <div
              aria-live="polite"
              aria-atomic="true"
              className="border-y border-line py-5"
            >
              <p className="text-sm text-muted">Total dos itens disponíveis</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-coast">
                {result.total.formatted}
              </p>
            </div>
            <p className="text-sm leading-relaxed text-muted">
              Preços atuais do catálogo. O carrinho não reserva estoque nem
              congela preços.
            </p>
            {blocked ? (
              <>
                <p className="text-sm font-semibold text-danger">
                  Resolva os itens indisponíveis ou com estoque insuficiente
                  antes de revisar o checkout. O pedido considera o conjunto
                  inteiro.
                </p>
                <Button disabled className="w-full">
                  Revisar checkout
                </Button>
              </>
            ) : (
              <Link
                href="/checkout"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-control bg-coast px-5 py-3 font-semibold text-paper hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-coast"
              >
                Revisar checkout
              </Link>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
