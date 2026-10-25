import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { RefreshButton } from "@/components/shared/refresh-button";
import { ProductGrid } from "@/features/catalog/components/product-grid";
import { listProducts } from "@/features/catalog/server/list-products";
export async function HomeProducts() {
  const result = await listProducts({ limit: "8" }).catch(() => null);
  if (!result?.success)
    return (
      <section className="store-panel space-y-4">
        <h2 className="font-editorial text-2xl text-coast">
          Uma pausa na consulta dos produtos.
        </h2>
        <p role="alert" className="text-muted">
          Não foi possível carregar o catálogo agora. Você pode tentar
          novamente.
        </p>
        <RefreshButton />
      </section>
    );
  return (
    <section aria-labelledby="home-products-title" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">
            O essencial, por perto
          </p>
          <h2
            id="home-products-title"
            className="font-editorial text-3xl text-coast"
          >
            Prepare o seu dia.
          </h2>
        </div>
        <Link href="/products" className="auth-link">
          Ver todos os produtos
        </Link>
      </div>
      {result.products.length ? (
        <ProductGrid products={result.products} returnTo="/products" />
      ) : (
        <EmptyState title="Nosso catálogo está sendo preparado.">
          <p>Em breve, os produtos publicados aparecerão aqui.</p>
        </EmptyState>
      )}
      <div className="pt-3 text-center">
        <Link href="/products" className="admin-action">
          Ver catálogo completo
        </Link>
      </div>
    </section>
  );
}
