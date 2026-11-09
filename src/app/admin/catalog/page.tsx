import Link from "next/link";
import { requireAuthenticatedAdmin } from "@/features/auth/server/require-admin";
import { ProductImage } from "@/features/catalog/components/product-image";
import { readAdminCatalog } from "@/features/catalog/server/read-admin-catalog";
import { moneyDto } from "@/lib/money/price";
import { AccessState } from "../_components/access-state";
import { AdminTable } from "../_components/admin-table";
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
        <AdminTable
          caption="Produtos cadastrados"
          headers={[
            "Produto",
            "Categoria",
            "Preço",
            "Publicação",
            "Estoque",
            "Ações",
          ]}
          rows={result.products.map((product) => ({
            id: product.id,
            cells: [
              <div key="product" className="flex min-w-48 items-center gap-4">
                <div className="w-16 shrink-0">
                  <ProductImage image={product.image} size="thumbnail" />
                </div>
                <span className="font-semibold">{product.name}</span>
              </div>,
              result.categories.find(
                (category) => category.id === product.categoryId,
              )?.name ?? "Categoria cadastrada",
              moneyDto(product.amount).formatted,
              <span
                key="publication"
                className="inline-flex rounded-control border border-line px-3 py-1 text-sm"
              >
                {product.isPublished ? "Publicado" : "Rascunho"}
              </span>,
              product.availableQuantity === null
                ? "Estoque indisponível"
                : `${product.availableQuantity} em estoque`,
              <Link
                key="edit"
                href={`/admin/catalog/${product.id}${returnQuery}`}
                className="auth-link"
                aria-label={`Editar ${product.name}`}
              >
                Editar produto
              </Link>,
            ],
          }))}
        />
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
