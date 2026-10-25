import Link from "next/link";
import { requireAuthenticatedAdmin } from "@/features/auth/server/require-admin";
import { ProductImage } from "@/features/catalog/components/product-image";
import { productImage } from "@/features/catalog/images";
import { readAdminCatalog } from "@/features/catalog/server/read-admin-catalog";
import { moneyDto } from "@/lib/money/price";
import { AccessState } from "../_components/access-state";
export default async function AdminCatalogPage({
  searchParams,
}: PageProps<"/admin/catalog">) {
  const access = await requireAuthenticatedAdmin();
  if (!access.success) return <AccessState code={access.code} />;
  const result = await readAdminCatalog(await searchParams);
  if (!result) {
    const fresh = await requireAuthenticatedAdmin();
    if (!fresh.success) return <AccessState code={fresh.code} />;
    return (
      <main id="main-content" tabIndex={-1} className="admin-page">
        <h1>Produtos</h1>
        <p role="alert">Não foi possível aplicar estes filtros.</p>
        <Link href="/admin/catalog" className="auth-link">
          Limpar filtros
        </Link>
      </main>
    );
  }
  const pageLink = (page: number) =>
    `/admin/catalog?${new URLSearchParams({ page: String(page), query: result.query.query, category: result.query.category ?? "", publication: result.query.publication })}`;
  const returnQuery = `?returnTo=${encodeURIComponent(pageLink(result.page))}`;
  return (
    <main id="main-content" tabIndex={-1} className="admin-page">
      <p className="admin-eyebrow">Catálogo e disponibilidade</p>
      <div className="flex flex-wrap items-center justify-between gap-5">
        <h1>Produtos</h1>
        <Link
          href={`/admin/catalog/new${returnQuery}`}
          className="admin-action"
        >
          Cadastrar produto
        </Link>
      </div>
      <p className="text-muted">
        Cuide dos produtos que acompanham seus clientes no dia a dia.
      </p>
      <form
        action="/admin/catalog"
        method="get"
        className="admin-panel grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <label>
          Nome
          <input
            name="query"
            maxLength={100}
            defaultValue={result.query.query}
          />
        </label>
        <label>
          Categoria
          <select name="category" defaultValue={result.query.category ?? ""}>
            <option value="">Todas</option>
            {result.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Publicação
          <select name="publication" defaultValue={result.query.publication}>
            <option value="all">Todos</option>
            <option value="published">Publicados</option>
            <option value="draft">Rascunhos</option>
          </select>
        </label>
        <div className="flex flex-wrap gap-4">
          <button type="submit" className="admin-action">
            Filtrar catálogo
          </button>
          <Link href="/admin/catalog" className="auth-link self-center">
            Limpar
          </Link>
        </div>
      </form>
      {result.products.length ? (
        <ul className="space-y-4">
          {result.products.map((product) => (
            <li
              key={product.id}
              className="admin-panel grid items-center gap-5 sm:grid-cols-[96px_minmax(0,1fr)_auto]"
            >
              <ProductImage
                image={productImage(product.imageKey, product.name)}
              />
              <div className="min-w-0 space-y-2">
                <h2 className="break-words text-xl font-semibold">
                  {product.name}
                </h2>
                <p className="text-sm text-muted">
                  {result.categories.find(
                    (category) => category.id === product.categoryId,
                  )?.name ?? "Categoria cadastrada"}
                </p>
                <p className="font-semibold text-coast">
                  {moneyDto(product.amount).formatted}
                </p>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="rounded border border-line px-2 py-1">
                    {product.isPublished ? "Publicado" : "Rascunho"}
                  </span>
                  <span className="py-1">
                    {product.availableQuantity === null
                      ? "Estoque indisponível"
                      : `${product.availableQuantity} em estoque`}
                  </span>
                </div>
              </div>
              <Link
                href={`/admin/catalog/${product.id}${returnQuery}`}
                className="auth-link"
                aria-label={`Editar ${product.name}`}
              >
                Editar produto
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <section className="admin-panel space-y-3 py-12">
          <h2 className="font-editorial text-2xl text-coast">
            Nenhum produto por aqui.
          </h2>
          <p className="text-muted">
            Cadastre seu primeiro produto ou ajuste os filtros da busca.
          </p>
          <Link href="/admin/catalog/new" className="auth-link">
            Cadastrar produto
          </Link>
        </section>
      )}
      <nav
        aria-label="Paginação administrativa"
        className="flex flex-wrap items-center gap-6"
      >
        <span className="text-sm text-muted">Página {result.page}</span>
        {result.page > 1 && (
          <Link className="auth-link" href={pageLink(result.page - 1)}>
            Anterior
          </Link>
        )}
        {result.hasNext && result.page < 1000 && (
          <Link className="auth-link" href={pageLink(result.page + 1)}>
            Próxima
          </Link>
        )}
      </nav>
    </main>
  );
}
