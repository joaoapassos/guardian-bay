import { CategoryDialog } from "@/features/catalog/components/category-dialog";
import { readAdminCategories } from "@/features/catalog/server/read-admin-categories";
import { AccessState } from "../_components/access-state";
import { AdminTable } from "../_components/admin-table";
export default async function CategoriesPage() {
  const result = await readAdminCategories();
  if (!result.success) return <AccessState code={result.code} />;
  return (
    <main id="main-content" tabIndex={-1} className="admin-page">
      <p className="admin-eyebrow">Organização do catálogo</p>
      <div className="flex flex-wrap items-center justify-between gap-5">
        <h1>Categorias</h1>
        <CategoryDialog />
      </div>
      <p className="text-muted">
        Nomes simples para ajudar a encontrar o que importa.
      </p>
      <section aria-label="Categorias cadastradas">
        {result.categories.length ? (
          <AdminTable
            caption="Categorias cadastradas"
            headers={["Categoria", "Ações"]}
            rows={result.categories.map((category) => ({
              id: category.id,
              cells: [
                <span key="name" className="font-semibold">
                  {category.name}
                </span>,
                <CategoryDialog key="edit" category={category} />,
              ],
            }))}
          />
        ) : (
          <div className="admin-panel space-y-4 py-8">
            <h2 className="text-xl font-semibold">
              Tudo começa com uma categoria.
            </h2>
            <p className="text-muted">
              Crie a primeira para organizar seus produtos.
            </p>
            <CategoryDialog />
          </div>
        )}
        {result.hasMore && (
          <output className="mt-5 block text-sm text-muted">
            Exibindo as primeiras 100 categorias. A consulta completa requer
            paginação adicional.
          </output>
        )}
      </section>
    </main>
  );
}
