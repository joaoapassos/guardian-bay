import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { orderStatusLabel } from "@/features/orders/order-status";
import { orderDetail } from "@/features/orders/server/order-detail";
export default async function OrderDetailPage({
  params,
}: PageProps<"/orders/[id]">) {
  const { id } = await params;
  const result = await orderDetail(id);
  if (!result.success) {
    if (result.code === "UNAUTHENTICATED") redirect("/login");
    notFound();
  }
  const order = result.order;
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <h1 className="mb-6 text-3xl font-semibold">Pedido {order.orderId}</h1>
      <p>{orderStatusLabel(order.status)}</p>
      <p>
        <time dateTime={order.createdAt}>
          {new Date(order.createdAt).toLocaleString("pt-BR", {
            timeZone: "UTC",
          })}{" "}
          UTC
        </time>
      </p>
      <p className="mt-3">
        Snapshot comercial preservado. Não representa estoque reservado ou
        pagamento real.
      </p>
      {order.status === "PAYMENT_FAILED" && (
        <p role="alert">
          Pagamento simulado recusado. Seu carrinho foi preservado. Corrija-o e
          inicie uma nova confirmação.
        </p>
      )}
      <ul className="mt-6 grid gap-4">
        {order.items.map((item, index) => (
          <li
            key={`${index}-${item.productName}`}
            className="rounded border p-4"
          >
            <h2>{item.productName}</h2>
            <p>Quantidade: {item.quantity}</p>
            <p>Preço aceito: {item.price.formatted}</p>
            <p>Subtotal: {item.subtotal.formatted}</p>
          </li>
        ))}
      </ul>
      <p className="mt-6 font-semibold">Total: {order.total.formatted}</p>
      <Link href="/orders" className="mt-6 block underline">
        Histórico de pedidos
      </Link>
      <Link href="/cart" className="mt-3 block underline">
        Voltar ao carrinho
      </Link>
    </main>
  );
}
