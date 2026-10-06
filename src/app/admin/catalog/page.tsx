import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryForm } from "@/features/catalog/components/category-form";
import { ProductForm } from "@/features/catalog/components/product-form";
import { readAdminCatalog } from "@/features/catalog/server/read-admin-catalog";
import { InventoryForm } from "@/features/inventory/components/inventory-form";

export default async function AdminCatalogPage({
  searchParams,
}: PageProps<"/admin/catalog">) {
  const result = await readAdminCatalog(await searchParams);
  if (!result) notFound();
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-6 py-12">
      <h1 className="text-3xl font-semibold">Administrar catálogo</h1>
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Categorias</h2>
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
        <ProductForm categories={result.categories} />
        {result.products.map((product) => (
          <div
            key={`${product.id}:${product.revision}:${product.inventoryRevision}`}
          >
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
          <Link href={`/admin/catalog?page=${result.page - 1}`}>Anterior</Link>
        )}
        {result.hasNext && result.page < 1000 && (
          <Link href={`/admin/catalog?page=${result.page + 1}`}>Próxima</Link>
        )}
      </nav>
    </main>
  );
}
