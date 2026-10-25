import Link from "next/link";
import { ProductForm } from "@/features/catalog/components/product-form";
import { readAdminCategories } from "@/features/catalog/server/read-admin-categories";
import { AccessState } from "../../_components/access-state";
import { catalogReturn } from "../../_components/catalog-return";
export default async function NewProductPage({
  searchParams,
}: PageProps<"/admin/catalog/new">) {
  const returnHref = catalogReturn((await searchParams).returnTo);
  const result = await readAdminCategories();
  if (!result.success) return <AccessState code={result.code} />;
  return (
    <main id="main-content" tabIndex={-1} className="admin-page">
      <Link href={returnHref} className="auth-link">
        ← Produtos
      </Link>
      <h1>Novo produto</h1>
      <p className="text-muted">
        Cadastre os dados do produto. O estoque inicial é zero e pode ser
        ajustado após salvar.
      </p>
      {!result.categories.length ? (
        <p className="admin-panel">
          Antes de criar um produto,{" "}
          <Link href="/admin/categories" className="auth-link">
            cadastre uma categoria
          </Link>
          .
        </p>
      ) : (
        <ProductForm categories={result.categories} returnHref={returnHref} />
      )}
    </main>
  );
}
