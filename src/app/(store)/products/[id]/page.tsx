import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AddToCartButton } from "@/features/cart/components/add-to-cart-button";
import { catalogReturn } from "@/features/catalog/catalog-return";
import { ProductImage } from "@/features/catalog/components/product-image";
import { ProductTransition } from "@/features/catalog/components/product-transition";
import { readProduct } from "@/features/catalog/server/read-product";

export default async function ProductPage({
  params,
  searchParams,
}: PageProps<"/products/[id]">) {
  await connection();
  const product = await readProduct((await params).id);
  if (!product) notFound();
  const returnTo = catalogReturn((await searchParams).returnTo);
  const productHref = `/products/${product.id}?returnTo=${encodeURIComponent(returnTo)}`;
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-5 py-8 font-auth text-ink sm:px-8 lg:py-12"
    >
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-2 text-sm text-muted"
      >
        <Link href="/" className="auth-link">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={returnTo} className="auth-link">
          Produtos
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="break-words">
          {product.name}
        </span>
      </nav>
      <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-14">
        <ProductTransition id={product.id}>
          <div className="flex justify-center overflow-hidden rounded-panel border border-line bg-canvas p-6 sm:p-10">
            <ProductImage image={product.image} size="detail" />
          </div>
        </ProductTransition>
        <section aria-labelledby="product-title" className="min-w-0 py-2">
          <p className="mb-3 text-sm font-semibold text-muted">
            {product.category}
          </p>
          <h1
            id="product-title"
            className="break-words font-editorial text-4xl leading-tight text-coast sm:text-5xl"
          >
            {product.name}
          </h1>
          <p className="mt-6 text-3xl font-semibold tabular-nums text-coast">
            {product.price.formatted}
          </p>
          <p className="mt-5 w-fit rounded-control border border-line bg-surface px-3 py-2 text-sm font-semibold">
            {product.inStock
              ? "Disponível para adicionar ao carrinho"
              : "Sem estoque no momento"}
          </p>
          {!product.inStock && (
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Este produto está sem unidades disponíveis. A adição ao carrinho
              está temporariamente indisponível.
            </p>
          )}
          <AddToCartButton
            productId={product.id}
            inStock={product.inStock}
            returnTo={productHref}
          />
          <p className="mt-6 border-t border-line pt-5 text-sm leading-relaxed text-muted">
            O carrinho não reserva estoque nem congela preços. A disponibilidade
            é conferida novamente ao confirmar o pedido.
          </p>
        </section>
      </div>
      <section
        aria-labelledby="description-title"
        className="rounded-panel border border-line bg-surface p-5 sm:p-8"
      >
        <h2
          id="description-title"
          className="font-editorial text-2xl text-coast"
        >
          Sobre o produto
        </h2>
        <p className="mt-4 max-w-3xl whitespace-pre-wrap break-words leading-relaxed">
          {product.description}
        </p>
      </section>
      <Link href={returnTo} className="auth-link inline-block">
        Voltar aos produtos
      </Link>
    </main>
  );
}
