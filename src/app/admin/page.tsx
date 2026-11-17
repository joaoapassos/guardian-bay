import { forbidden, redirect } from "next/navigation";
import { countAdminRecords } from "@/features/admin/server/count-records";
import { requireAuthenticatedAdmin } from "@/features/auth/server/require-admin";
import { DashboardAreas } from "./_components/dashboard-areas";

export default async function AdminPage() {
  const access = await requireAuthenticatedAdmin();
  if (!access.success) {
    if (access.code === "UNAUTHENTICATED") redirect("/login");
    forbidden();
  }
  const counts = await countAdminRecords([
    "products",
    "categories",
    "orders",
    "users",
  ]);
  if (!counts.success) {
    if (counts.code === "UNAUTHENTICATED") redirect("/login");
    forbidden();
  }
  return (
    <main id="main-content" tabIndex={-1} className="admin-page">
      <p className="admin-eyebrow">Tudo em seu lugar</p>
      <h1>Dashboard</h1>
      <p className="max-w-xl text-muted">
        Um ponto de partida para cuidar da operação Guardian Bay.
      </p>
      <DashboardAreas
        key={`${counts.totals.products}:${counts.totals.categories}:${counts.totals.orders}:${counts.totals.users}`}
        initialCounts={counts.totals}
      />
      <p className="mt-10 border-t border-line pt-6 text-sm text-muted">
        Os totais são atualizados automaticamente. Pagamentos são simulações
        acadêmicas.
      </p>
    </main>
  );
}
