import Link from "next/link";
import { connection } from "next/server";
import { AddToCartButton } from "@/features/cart/components/add-to-cart-button";
import { ProductImage } from "@/features/catalog/components/product-image";
import { listProducts } from "@/features/catalog/server/list-products";

export default async function ProductsPage({
  searchParams,
}: PageProps<"/products">) {
  await connection();
  const result = await listProducts(await searchParams);
  const pageHref = (page: number) => {
    if (!result.success) return "/products";
    const params = new URLSearchParams({
      page: String(page),
      limit: String(result.limit),
      query: result.query,
      sort: result.sort,
    });
    if (result.category) params.set("category", result.category);
    return `/products?${params}`;
  };
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <h1 className="mb-6 text-3xl font-semibold">Produtos</h1>
      {!result.success ? (
        <output>Filtros inválidos.</output>
      ) : (
        <>
          <form
            action="/products"
            className="mb-8 flex flex-wrap items-end gap-4"
          >
            <label>
              Buscar produto
              <input
                name="query"
                maxLength={100}
                defaultValue={result.query}
                className="block border p-2"
              />
            </label>
            <label>
              Categoria
              <select
                name="category"
                defaultValue={result.category ?? ""}
                className="block border p-2"
              >
                <option value="">Todas</option>
                {result.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ordenar
              <select
                name="sort"
                defaultValue={result.sort}
                className="block border p-2"
              >
                <option value="name">Nome</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
              </select>
            </label>
            <button type="submit" className="rounded border px-4 py-2">
              Filtrar
            </button>
          </form>
          {result.products.length === 0 ? (
            <p>Nenhum produto encontrado.</p>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2">
              {result.products.map((product) => (
                <li
                  key={product.id}
                  className="rounded border border-zinc-300 p-5"
                >
                  <ProductImage image={product.image} />
                  <h2 className="text-xl font-semibold">
                    <Link href={`/products/${product.id}`}>{product.name}</Link>
                  </h2>
                  <p>{product.category}</p>
                  <p>{product.price.formatted}</p>
                  <AddToCartButton productId={product.id} />
                </li>
              ))}
            </ul>
          )}
          <nav aria-label="Paginação" className="mt-8 flex gap-6">
            {result.page > 1 && (
              <Link href={pageHref(result.page - 1)}>Anterior</Link>
            )}
            {result.hasNext && result.page < 1000 && (
              <Link href={pageHref(result.page + 1)}>Próxima</Link>
            )}
          </nav>
        </>
      )}
    </main>
  );
}
