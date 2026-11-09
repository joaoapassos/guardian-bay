import Link from "next/link";
import { notFound } from "next/navigation";
import { readUserAudit } from "@/features/audit/server/read-user-audit";
import { adminUserDetail } from "@/features/auth/server/admin-users";
import { orderStatusLabel } from "@/features/orders/order-status";
import { adminUserOrders } from "@/features/orders/server/admin-user-orders";
import { AccessState } from "../../_components/access-state";
import { UserActions } from "../user-actions";

export default async function AdminUserPage({
  params,
  searchParams,
}: PageProps<"/admin/users/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const detail = await adminUserDetail(id);
  if (!detail.success) {
    if (detail.code === "NOT_FOUND") notFound();
    return <AccessState code={detail.code} />;
  }
  const result = await adminUserOrders({ userId: id, page: query.page });
  const audit = await readUserAudit({ userId: id, page: query.auditPage });
  if (!audit.success) {
    if (audit.code === "INVALID_INPUT") notFound();
    return <AccessState code={audit.code} />;
  }
  if (!result.success) {
    if (result.code === "INVALID_INPUT")
      return (
        <main className="admin-page">
          <p role="alert">Página inválida.</p>
          <Link href={`/admin/users/${id}`}>Limpar</Link>
        </main>
      );
    return <AccessState code={result.code} />;
  }
  return (
    <main id="main-content" tabIndex={-1} className="admin-page">
      <Link href="/admin/users" className="auth-link">
        Voltar aos usuários
      </Link>
      <h1>{detail.user.name || "Nome não informado"}</h1>
      <section className="admin-panel space-y-3">
        <h2>Informações gerais</h2>
        <p>E-mail: {detail.user.email}</p>
        <p>Status: {detail.user.suspended ? "Suspenso" : "Ativo"}</p>
        <p className="break-all">ID: {detail.user.id}</p>
        <p>
          Cadastro:{" "}
          <time dateTime={detail.user.createdAt}>
            {new Date(detail.user.createdAt).toLocaleDateString("pt-BR", {
              timeZone: "UTC",
            })}
          </time>
        </p>
        <p>
          Cargo:{" "}
          {detail.user.role === "admin" ? "Administrador" : "Usuário comum"}
        </p>
        <UserActions
          id={id}
          role={detail.user.role}
          self={detail.actorId === id}
          suspended={detail.user.suspended}
          label={detail.user.name || detail.user.email}
        />
      </section>
      <section id="pedidos" className="admin-panel space-y-3">
        <h2>Pedidos</h2>
        {result.orders.length === 0 ? (
          <p>Nenhum pedido encontrado.</p>
        ) : (
          <ul className="space-y-3">
            {result.orders.map((order) => (
              <li key={order.id}>
                <Link
                  className="auth-link break-all"
                  href={`/admin/orders/${order.id}`}
                >
                  {order.id}
                </Link>{" "}
                ·{" "}
                {new Date(order.createdAt).toLocaleDateString("pt-BR", {
                  timeZone: "UTC",
                })}{" "}
                · {orderStatusLabel(order.status)} · {order.total.formatted}
              </li>
            ))}
          </ul>
        )}
        <nav aria-label="Paginação de pedidos" className="flex gap-4">
          {result.page > 1 && (
            <Link className="auth-link" href={`?page=${result.page - 1}`}>
              Anterior
            </Link>
          )}
          {result.hasNext && (
            <Link className="auth-link" href={`?page=${result.page + 1}`}>
              Próxima
            </Link>
          )}
        </nav>
      </section>
      <section id="auditoria" className="admin-panel space-y-3">
        <h2>Auditoria</h2>
        {audit.events.length === 0 ? (
          <p>Nenhum evento administrativo encontrado.</p>
        ) : (
          <ul className="space-y-3">
            {audit.events.map((event) => (
              <li key={event.id}>
                <time dateTime={event.date}>
                  {new Date(event.date).toLocaleString("pt-BR", {
                    timeZone: "UTC",
                  })}{" "}
                  UTC
                </time>{" "}
                ·{" "}
                {(
                  {
                    "admin.user.promoted": "Promovido a administrador",
                    "admin.user.demoted": "Alterado para usuário comum",
                    "admin.user.suspended": "Conta suspensa",
                    "admin.user.reactivated": "Conta reativada",
                    "admin.user.sessions_revoked": "Sessões revogadas",
                  } as Record<string, string>
                )[event.event] ?? event.event}{" "}
                · Administrador: {event.actor} · {event.outcome}
              </li>
            ))}
          </ul>
        )}
        <nav aria-label="Paginação de auditoria" className="flex gap-4">
          {audit.page > 1 && (
            <Link className="auth-link" href={`?auditPage=${audit.page - 1}`}>
              Anterior
            </Link>
          )}
          {audit.hasNext && (
            <Link className="auth-link" href={`?auditPage=${audit.page + 1}`}>
              Próxima
            </Link>
          )}
        </nav>
      </section>
    </main>
  );
}
