import { RouteReady } from "@/components/shared/route-ready";
import { CategoryDialog } from "@/features/catalog/components/category-dialog";
import { readAdminCategories } from "@/features/catalog/server/read-admin-categories";
import { AccessState } from "../_components/access-state";
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
      <section className="admin-panel" aria-label="Categorias cadastradas">
        {result.categories.length ? (
          <ul className="divide-y divide-line">
            {result.categories.map((category) => (
              <li
                key={category.id}
                className="flex flex-wrap items-center justify-between gap-4 py-5"
              >
                <h2 className="font-semibold">{category.name}</h2>
                <CategoryDialog category={category} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="space-y-4 py-8">
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
      <RouteReady />
    </main>
  );
}
