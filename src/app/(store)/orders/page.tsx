import Link from "next/link";
import { redirect } from "next/navigation";
import {
  orderStatusLabel,
  paymentMethodLabel,
} from "@/features/orders/order-status";
import { orderHistory } from "@/features/orders/server/order-history";
import { AccountShell } from "../_components/account-shell";

export default async function OrdersPage({
  searchParams,
}: PageProps<"/orders">) {
  const result = await orderHistory(await searchParams);

  if (!result.success && result.code === "UNAUTHENTICATED") redirect("/login");

  return (
    <AccountShell
      active="orders"
      title="Meus pedidos"
      description="Acompanhe o estado dos seus pagamentos simulados e consulte os registros de cada pedido."
    >
      {!result.success ? (
        <p
          role="alert"
          className="rounded-panel border border-danger bg-surface p-5 text-danger"
        >
          Paginação inválida.{" "}
          <Link href="/orders" className="auth-link">
            Voltar ao histórico
          </Link>
        </p>
      ) : (
        <>
          {result.orders.length === 0 ? (
            <div className="rounded-panel border border-line bg-surface p-8">
              <h2 className="font-editorial text-2xl text-coast">
                Nenhum pedido por aqui
              </h2>
              <p className="my-4 text-muted">
                Você ainda não possui pedidos nesta página.
              </p>
              <Link href="/products" className="auth-link">
                Explorar catálogo
              </Link>
            </div>
          ) : (
            <div className="rounded-panel border border-line bg-surface p-5 sm:p-6">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  Histórico de pedidos, mais recentes primeiro
                </caption>
                <thead className="hidden border-b border-line text-muted md:table-header-group">
                  <tr>
                    <th scope="col" className="pb-4 pr-4">
                      Pedido
                    </th>
                    <th scope="col" className="pb-4 pr-4">
                      Data
                    </th>
                    <th scope="col" className="pb-4 pr-4">
                      Pagamento
                    </th>
                    <th scope="col" className="pb-4">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {result.orders.map((order) => (
                    <tr key={order.orderId} className="block py-5 md:table-row">
                      <td className="block min-w-0 py-2 md:table-cell md:w-1/3 md:py-5 md:pr-5">
                        <Link
                          href={`/orders/${order.orderId}?page=${result.page}`}
                          className="auth-link break-all"
                        >
                          Pedido {order.orderId}
                        </Link>
                      </td>
                      <td className="block py-2 md:table-cell md:pr-5">
                        <span className="md:sr-only">Data: </span>
                        <time dateTime={order.createdAt}>
                          {new Date(order.createdAt).toLocaleString("pt-BR", {
                            timeZone: "UTC",
                          })}{" "}
                          UTC
                        </time>
                      </td>
                      <td className="block space-y-2 py-2 md:table-cell md:pr-5">
                        <p className="w-fit rounded-control border border-line px-3 py-1 font-semibold">
                          {orderStatusLabel(order.status)}
                        </p>
                        <p>{paymentMethodLabel(order.paymentMethod)}</p>
                      </td>
                      <td className="block py-2 font-semibold tabular-nums text-coast md:table-cell">
                        <span className="md:sr-only">Total: </span>
                        {order.total.formatted}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <nav
            aria-label="Páginas de pedidos"
            className="mt-6 flex items-center gap-6 text-coast underline underline-offset-4"
          >
            {result.page > 1 && (
              <Link href={`/orders?page=${result.page - 1}`}>Anterior</Link>
            )}
            {result.hasNext && (
              <Link href={`/orders?page=${result.page + 1}`}>Próxima</Link>
            )}
          </nav>
        </>
      )}
    </AccountShell>
  );
}
