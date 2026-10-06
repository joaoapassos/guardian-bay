import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryForm } from "@/features/catalog/components/category-form";
import { ProductForm } from "@/features/catalog/components/product-form";
import { readAdminCatalog } from "@/features/catalog/server/read-admin-catalog";
import { InventoryForm } from "@/features/inventory/components/inventory-form";
import { moneyDto } from "@/lib/money/price";

export default async function AdminCatalogPage({
  searchParams,
}: PageProps<"/admin/catalog">) {
  const result = await readAdminCatalog(await searchParams);
  if (!result) notFound();
  const pageLink = (page: number) =>
    `/admin/catalog?${new URLSearchParams({ page: String(page), query: result.query.query, category: result.query.category ?? "", publication: result.query.publication })}`;
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-6 py-12">
      <h1 className="text-3xl font-semibold">Administrar catálogo</h1>
      <form
        action="/admin/catalog"
        method="get"
        className="flex flex-wrap gap-4"
      >
        <label>
          Nome{" "}
          <input
            name="query"
            maxLength={100}
            defaultValue={result.query.query}
          />
        </label>
        <label>
          Categoria{" "}
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
          Publicação{" "}
          <select name="publication" defaultValue={result.query.publication}>
            <option value="all">Todos</option>
            <option value="published">Publicados</option>
            <option value="draft">Rascunhos</option>
          </select>
        </label>
        <button type="submit">Filtrar catálogo</button>
      </form>
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Categorias</h2>
        <h3 className="font-semibold">Nova categoria</h3>
        <CategoryForm />
        {result.categories.map((category) => (
          <CategoryForm
            key={`${category.id}:${category.revision}`}
            category={category}
          />
        ))}
      </section>
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Produtos</h2>
        <h3 className="font-semibold">Novo produto</h3>
        <ProductForm categories={result.categories} />
        {result.products.length === 0 && <p>Nenhum produto nesta página.</p>}
        {result.products.map((product) => (
          <div
            className="space-y-4 rounded border p-4"
            key={`${product.id}:${product.revision}:${product.inventoryRevision}`}
          >
            <h3 className="text-xl font-semibold">{product.name}</h3>
            <p>
              {product.isPublished ? "Publicado" : "Rascunho"} ·{" "}
              {moneyDto(product.amount).formatted} · Categoria:{" "}
              {result.categories.find(
                (category) => category.id === product.categoryId,
              )?.name ?? "Categoria fora desta seleção"}
            </p>
            <p>
              Revisão de catálogo: {product.revision}. Alterações concorrentes
              exigem recarregar.
            </p>
            <ProductForm
              key={`${product.id}:${product.revision}`}
              product={product}
              categories={result.categories}
            />
            {product.inventoryRevision !== null &&
            product.availableQuantity !== null ? (
              <InventoryForm
                productId={product.id}
                name={product.name}
                quantity={product.availableQuantity}
                revision={product.inventoryRevision}
              />
            ) : (
              <p>Estoque indisponível. Requer revisão operacional.</p>
            )}
          </div>
        ))}
      </section>
      <nav aria-label="Paginação administrativa" className="flex gap-6">
        {result.page > 1 && (
          <Link href={pageLink(result.page - 1)}>Anterior</Link>
        )}
        {result.hasNext && result.page < 1000 && (
          <Link href={pageLink(result.page + 1)}>Próxima</Link>
        )}
      </nav>
    </main>
  );
}
