import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/features/catalog/components/product-form";
import { ProductImage } from "@/features/catalog/components/product-image";
import { productImage } from "@/features/catalog/images";
import { readAdminCategories } from "@/features/catalog/server/read-admin-categories";
import { readAdminProduct } from "@/features/catalog/server/read-admin-product";
import { InventoryForm } from "@/features/inventory/components/inventory-form";
import { AccessState } from "../../_components/access-state";
import { catalogReturn } from "../../_components/catalog-return";
export default async function EditProductPage({
  params,
  searchParams,
}: PageProps<"/admin/catalog/[id]">) {
  const result = await readAdminProduct((await params).id);
  if (!result.success) {
    if (result.code === "NOT_FOUND") notFound();
    return <AccessState code={result.code} />;
  }
  const categories = await readAdminCategories();
  if (!categories.success) return <AccessState code={categories.code} />;
  const product = result.product;
  const returnHref = catalogReturn((await searchParams).returnTo);
  return (
    <main id="main-content" tabIndex={-1} className="admin-page">
      <Link href={returnHref} className="auth-link">
        ← Produtos
      </Link>
      <h1>Editar produto</h1>
      <p className="text-muted">{product.name}</p>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <ProductForm
          key={`${product.id}:${product.revision}`}
          product={product}
          categories={categories.categories}
          returnHref={returnHref}
        />
        <aside className="space-y-6">
          <div className="admin-panel">
            <ProductImage
              image={productImage(product.imageKey, product.name)}
            />
            <p className="text-sm text-muted">
              Prévia da imagem disponível. Não há upload de mídia nesta versão.
            </p>
          </div>
          {product.inventoryRevision !== null &&
          product.availableQuantity !== null ? (
            <InventoryForm
              key={product.inventoryRevision}
              productId={product.id}
              name={product.name}
              quantity={product.availableQuantity}
              revision={product.inventoryRevision}
            />
          ) : (
            <p className="admin-panel">Estoque temporariamente indisponível.</p>
          )}
        </aside>
      </div>
    </main>
  );
}
