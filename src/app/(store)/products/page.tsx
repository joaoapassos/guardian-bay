import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { RouteReady } from "@/components/shared/route-ready";
import {
  type CatalogCriteria,
  CatalogFilters,
} from "@/features/catalog/components/catalog-filters";
import { ProductGrid } from "@/features/catalog/components/product-grid";
import { listProducts } from "@/features/catalog/server/list-products";
import { readPublicCategories } from "@/features/catalog/server/read-public-categories";

export default async function ProductsPage({
  searchParams,
}: PageProps<"/products">) {
  const raw = await searchParams;
  const result = await listProducts(raw);
  const categories = result.success
    ? result.categories
    : await readPublicCategories();
  const get = (key: string, fallback = "") =>
    typeof raw[key] === "string" ? (raw[key] as string) : fallback;
  const criteria: CatalogCriteria = {
    query: get("query"),
    category: get("category"),
    minPrice: get("minPrice"),
    maxPrice: get("maxPrice"),
    availability: get("availability", "all"),
    sort: get("sort", "name"),
  };
  const params = new URLSearchParams(
    Object.entries(criteria).filter(([, value]) => value !== ""),
  );
  if (result.success) {
    params.set("limit", String(result.limit));
    params.set("page", String(result.page));
  }
  const returnTo = `/products?${params}`;
  const pageHref = (page: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(page));
    return `/products?${next}`;
  };
  const selectedCategory = categories.find(
    (category) => category.id === criteria.category,
  );
  return (
    <main id="main-content" tabIndex={-1} className="store-page catalog-page">
      <nav
        aria-label="Breadcrumb"
        className="catalog-heading text-sm text-muted"
      >
        <Link href="/" className="auth-link">
          Home
        </Link>
        <span aria-hidden="true"> / </span>
        <span>Produtos</span>
      </nav>
      <div className="catalog-heading">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
          Preparo para o dia a dia
        </p>
        <h1 className="store-title">
          {criteria.query
            ? `Resultados para “${criteria.query}”`
            : (selectedCategory?.name ?? "Produtos")}
        </h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-muted">
          Explore equipamentos e utilidades para cuidar do que importa.
        </p>
      </div>
      {!result.success && (
        <p role="alert" className="store-panel text-danger">
          Confira os filtros: preços devem ser válidos, com mínimo menor ou
          igual ao máximo.
        </p>
      )}
      <div className="catalog-results">
        <CatalogFilters
          key={JSON.stringify(criteria)}
          criteria={criteria}
          categories={categories}
        />
        <section
          aria-label="Resultados de produtos"
          className="min-w-0 space-y-5"
        >
          <p aria-live="polite" className="text-sm text-muted">
            {result.success
              ? `${result.total} produto${result.total === 1 ? "" : "s"} encontrado${result.total === 1 ? "" : "s"}`
              : "Filtros não aplicados"}
          </p>
          {result.success && result.products.length ? (
            <ProductGrid
              products={result.products}
              returnTo={returnTo}
              layout="catalog"
            />
          ) : (
            <EmptyState
              title={
                result.success
                  ? "Nenhum produto por aqui."
                  : "Vamos ajustar a busca?"
              }
            >
              <p>Altere os critérios ou explore o catálogo completo.</p>
              <Link href="/products" className="auth-link">
                Limpar filtros
              </Link>
            </EmptyState>
          )}
          {result.success && (
            <Pagination
              page={result.page}
              previous={result.page > 1 ? pageHref(result.page - 1) : undefined}
              next={
                result.hasNext && result.page < 1000
                  ? pageHref(result.page + 1)
                  : undefined
              }
            />
          )}
        </section>
      </div>
      <RouteReady />
    </main>
  );
}
