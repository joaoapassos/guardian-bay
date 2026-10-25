import Link from "next/link";
import {
  orderStatusLabel,
  paymentMethodLabel,
} from "@/features/orders/order-status";
import { adminOrderList } from "@/features/orders/server/admin-order-list";
import { AccessState } from "../_components/access-state";
export default async function AdminOrdersPage({
  searchParams,
}: PageProps<"/admin/orders">) {
  const result = await adminOrderList(await searchParams);
  if (!result.success && result.code !== "INVALID_INPUT")
    return <AccessState code={result.code} />;
  if (!result.success)
    return (
      <main id="main-content" tabIndex={-1} className="admin-page">
        <h1>Pedidos</h1>
        <p role="alert">Filtros inválidos.</p>
        <Link href="/admin/orders" className="auth-link">
          Limpar filtros
        </Link>
      </main>
    );
  const pageLink = (page: number) =>
    `/admin/orders?${new URLSearchParams({ page: String(page), limit: String(result.query.limit), sort: result.query.sort, status: result.query.status, orderId: result.query.orderId })}`;
  return (
    <main id="main-content" tabIndex={-1} className="admin-page">
      <p className="admin-eyebrow">Acompanhamento da operação</p>
      <h1>Pedidos</h1>
      <p className="text-muted">
        Consulte os itens e o estado de cada pedido. Pagamentos são simulações
        acadêmicas.
      </p>
      <form
        action="/admin/orders"
        method="get"
        className="admin-panel grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        <label>
          Status{" "}
          <select name="status" defaultValue={result.query.status}>
            <option value="">Todos</option>
            <option value="PAID">Aprovado</option>
            <option value="PAYMENT_FAILED">Recusado</option>
            <option value="PENDING_PAYMENT">Pendente</option>
            <option value="PAYMENT_EXPIRED">Expirado</option>
          </select>
        </label>
        <label>
          ID exato{" "}
          <input
            name="orderId"
            maxLength={36}
            defaultValue={result.query.orderId}
          />
        </label>
        <label>
          Ordem{" "}
          <select name="sort" defaultValue={result.query.sort}>
            <option value="created-desc">Mais recentes</option>
            <option value="created-asc">Mais antigos</option>
          </select>
        </label>
        <label>
          Por página{" "}
          <input
            name="limit"
            type="number"
            min={1}
            max={50}
            defaultValue={result.query.limit}
          />
        </label>
        <div className="flex flex-wrap gap-4">
          <button type="submit" className="admin-action">
            Filtrar pedidos
          </button>
          <Link href="/admin/orders" className="auth-link self-center">
            Limpar
          </Link>
        </div>
      </form>
      {result.orders.length === 0 ? (
        <section className="admin-panel space-y-3 py-10">
          <h2 className="font-editorial text-2xl text-coast">
            Nenhum pedido por aqui.
          </h2>
          <p className="text-muted">
            Os pedidos aparecerão aqui quando forem criados. Se você aplicou
            filtros, tente ajustá-los.
          </p>
        </section>
      ) : (
        <ul className="grid gap-4">
          {result.orders.map((order) => (
            <li
              key={order.orderId}
              className="admin-panel grid gap-3 md:grid-cols-2"
            >
              <Link
                className="auth-link break-all"
                href={`/admin/orders/${order.orderId}`}
              >
                Pedido {order.orderId}
              </Link>
              <p>
                <time dateTime={order.createdAt}>
                  {new Date(order.createdAt).toLocaleString("pt-BR", {
                    timeZone: "UTC",
                  })}{" "}
                  UTC
                </time>
              </p>
              <p>
                <span className="inline-flex rounded-control border border-line bg-paper px-3 py-1 text-sm font-semibold">
                  {orderStatusLabel(order.status)}
                </span>
              </p>
              <p>{paymentMethodLabel(order.paymentMethod)}</p>
              <p>Total: {order.total.formatted}</p>
            </li>
          ))}
        </ul>
      )}
      <nav
        aria-label="Paginação de pedidos administrativos"
        className="flex gap-6"
      >
        {result.query.page > 1 && (
          <Link className="auth-link" href={pageLink(result.query.page - 1)}>
            Anterior
          </Link>
        )}
        {result.hasNext && (
          <Link className="auth-link" href={pageLink(result.query.page + 1)}>
            Próxima
          </Link>
        )}
      </nav>
    </main>
  );
}
