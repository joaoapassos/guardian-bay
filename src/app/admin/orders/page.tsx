import Link from "next/link";
import { notFound } from "next/navigation";
import { orderStatusLabel } from "@/features/orders/order-status";
import { adminOrderList } from "@/features/orders/server/admin-order-list";
export default async function AdminOrdersPage({
  searchParams,
}: PageProps<"/admin/orders">) {
  const result = await adminOrderList(await searchParams);
  if (!result.success && result.code !== "INVALID_INPUT") notFound();
  if (!result.success)
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1>Pedidos administrativos</h1>
        <p role="alert">Filtros inválidos.</p>
      </main>
    );
  const pageLink = (page: number) =>
    `/admin/orders?${new URLSearchParams({ page: String(page), limit: String(result.query.limit), sort: result.query.sort, status: result.query.status, orderId: result.query.orderId })}`;
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-12">
      <h1 className="text-3xl font-semibold">Pedidos administrativos</h1>
      <p>Consulta de snapshots. Não há edição administrativa de pedidos.</p>
      <form
        action="/admin/orders"
        method="get"
        className="flex flex-wrap gap-4"
      >
        <label>
          Status{" "}
          <select name="status" defaultValue={result.query.status}>
            <option value="">Todos</option>
            <option value="PAID">Aprovado</option>
            <option value="PAYMENT_FAILED">Recusado</option>
            <option value="PENDING_PAYMENT">Pendente</option>
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
        <button type="submit">Filtrar pedidos</button>
      </form>
      {result.orders.length === 0 ? (
        <p>Nenhum pedido nesta página.</p>
      ) : (
        <ul className="grid gap-4">
          {result.orders.map((order) => (
            <li key={order.orderId} className="rounded border p-4">
              <Link
                className="underline"
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
              <p>{orderStatusLabel(order.status)}</p>
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
          <Link href={pageLink(result.query.page - 1)}>Anterior</Link>
        )}
        {result.hasNext && (
          <Link href={pageLink(result.query.page + 1)}>Próxima</Link>
        )}
      </nav>
    </main>
  );
}
