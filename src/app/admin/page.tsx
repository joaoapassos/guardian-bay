import Link from "next/link";
import { redirect } from "next/navigation";
import { SystemState } from "@/components/shared/system-state";
import { requireAuthenticatedAdmin } from "@/features/auth/server/require-admin";

const areas = [
  {
    href: "/admin/catalog",
    number: "01",
    title: "Produtos",
    description: "Cuide do catálogo, da publicação e do estoque.",
  },
  {
    href: "/admin/categories",
    number: "02",
    title: "Categorias",
    description: "Organize os produtos com nomes claros e úteis.",
  },
  {
    href: "/admin/orders",
    number: "03",
    title: "Pedidos",
    description: "Acompanhe os pedidos e seus registros de pagamento simulado.",
  },
];
export default async function AdminPage() {
  const access = await requireAuthenticatedAdmin();
  if (!access.success) {
    if (access.code === "UNAUTHENTICATED") redirect("/login");
    return <SystemState kind="access-denied" />;
  }
  return (
    <main id="main-content" tabIndex={-1} className="admin-page">
      <p className="admin-eyebrow">Tudo em seu lugar</p>
      <h1>Dashboard</h1>
      <p className="max-w-xl text-muted">
        Um ponto de partida para cuidar da operação Guardian Bay.
      </p>
      <section
        className="mt-10 grid gap-5 xl:grid-cols-3"
        aria-label="Áreas de trabalho"
      >
        {areas.map((area) => (
          <Link
            key={area.href}
            href={area.href}
            className="admin-panel group block hover:border-coast focus-visible:outline-2 focus-visible:outline-coast"
          >
            <span className="font-editorial text-4xl text-sage">
              {area.number}
            </span>
            <h2 className="mt-8 text-xl font-semibold text-coast">
              {area.title} <span aria-hidden="true">↗</span>
            </h2>
            <p className="mt-3 leading-relaxed text-muted">
              {area.description}
            </p>
          </Link>
        ))}
      </section>
      <p className="mt-10 border-t border-line pt-6 text-sm text-muted">
        As informações de cada área são consultadas no momento do acesso.
        Pagamentos são simulações acadêmicas.
      </p>
    </main>
  );
}
