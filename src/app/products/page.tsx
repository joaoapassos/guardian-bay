import Link from "next/link";
import { connection } from "next/server";
import { listProducts } from "@/features/catalog/server/list-products";

export default async function ProductsPage({
  searchParams,
}: PageProps<"/products">) {
  await connection();
  const result = await listProducts(await searchParams);
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <h1 className="mb-6 text-3xl font-semibold">Produtos</h1>
      {!result.success ? (
        <output>Filtros inválidos.</output>
      ) : (
        <>
          {result.products.length === 0 ? (
            <p>Nenhum produto encontrado.</p>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2">
              {result.products.map((product) => (
                <li
                  key={product.id}
                  className="rounded border border-zinc-300 p-5"
                >
                  <h2 className="text-xl font-semibold">{product.name}</h2>
                  <p>{product.category}</p>
                  <p>{product.price.formatted}</p>
                </li>
              ))}
            </ul>
          )}
          <nav aria-label="Paginação" className="mt-8 flex gap-6">
            {result.page > 1 && (
              <Link
                href={`/products?page=${result.page - 1}&limit=${result.limit}`}
              >
                Anterior
              </Link>
            )}
            {result.hasNext && result.page < 1000 && (
              <Link
                href={`/products?page=${result.page + 1}&limit=${result.limit}`}
              >
                Próxima
              </Link>
            )}
          </nav>
        </>
      )}
    </main>
  );
}
