import Link from "next/link";
import { redirect } from "next/navigation";
import { orderStatusLabel } from "@/features/orders/order-status";
import { orderHistory } from "@/features/orders/server/order-history";
export default async function OrdersPage({
  searchParams,
}: PageProps<"/orders">) {
  const result = await orderHistory(await searchParams);
  if (!result.success && result.code === "UNAUTHENTICATED") redirect("/login");
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <h1 className="mb-6 text-3xl font-semibold">Meus pedidos</h1>
      {!result.success ? (
        <p role="alert">Paginação inválida.</p>
      ) : (
        <>
          {result.orders.length === 0 ? (
            <p>Você ainda não possui pedidos nesta página.</p>
          ) : (
            <ul className="grid gap-4">
              {result.orders.map((order) => (
                <li key={order.orderId} className="rounded border p-4">
                  <Link href={`/orders/${order.orderId}`} className="underline">
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
          <nav aria-label="Páginas de pedidos" className="mt-6 flex gap-4">
            {result.page > 1 && (
              <Link href={`/orders?page=${result.page - 1}`}>Anterior</Link>
            )}
            {result.hasNext && (
              <Link href={`/orders?page=${result.page + 1}`}>Próxima</Link>
            )}
          </nav>
        </>
      )}
    </main>
  );
}
