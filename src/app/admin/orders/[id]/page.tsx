import Link from "next/link";
import { notFound } from "next/navigation";
import {
  orderStatusLabel,
  paymentMethodLabel,
} from "@/features/orders/order-status";
import { adminOrderDetail } from "@/features/orders/server/admin-order-detail";
import { AccessState } from "../../_components/access-state";
import { RefreshQuery } from "../../_components/refresh-query";
export default async function AdminOrderDetailPage({
  params,
}: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  const result = await adminOrderDetail(id);
  if (!result.success) {
    if (result.code === "NOT_FOUND") notFound();
    return <AccessState code={result.code} />;
  }
  const order = result.order;
  return (
    <main id="main-content" tabIndex={-1} className="admin-page">
      <Link href="/admin/orders" className="auth-link">
        ← Pedidos
      </Link>
      <p className="admin-eyebrow">Detalhes do pedido</p>
      <h1 className="break-all text-3xl!">Pedido {order.orderId}</h1>
      <p>
        <span className="inline-flex rounded-control border border-line bg-surface px-3 py-2 font-semibold">
          {orderStatusLabel(order.status)}
        </span>
      </p>
      <p>{paymentMethodLabel(order.paymentMethod)}</p>
      {order.cardLast4 && (
        <p>
          {order.cardBrand ?? "Cartão"} •••• {order.cardLast4}
        </p>
      )}
      {order.buyer && (
        <section className="admin-panel" aria-label="Comprador">
          <h2 className="font-editorial text-2xl text-coast">Comprador</h2>
          <p className="mt-3">{order.buyer.name}</p>
          <p>CPF {order.buyer.cpfMask}</p>
        </section>
      )}
      {order.shippingAddress && (
        <section
          className="admin-panel break-words"
          aria-label="Endereço do pedido"
        >
          <h2 className="font-editorial text-2xl text-coast">
            Endereço registrado
          </h2>
          <p className="mt-3">{order.shippingAddress.recipient}</p>
          <p>
            {order.shippingAddress.street}, {order.shippingAddress.number}
            {order.shippingAddress.complement &&
              ` — ${order.shippingAddress.complement}`}
          </p>
          <p>
            {order.shippingAddress.neighborhood} · {order.shippingAddress.city}/
            {order.shippingAddress.state}
          </p>
          <p>CEP {order.shippingAddress.postalCode}</p>
        </section>
      )}
      {order.paymentExpiresAt && (
        <p>
          Prazo da simulação:{" "}
          <time dateTime={order.paymentExpiresAt}>
            {new Date(order.paymentExpiresAt).toLocaleString("pt-BR", {
              timeZone: "America/Sao_Paulo",
            })}{" "}
            (Brasília)
          </time>
        </p>
      )}
      <p>
        <time dateTime={order.createdAt}>
          {new Date(order.createdAt).toLocaleString("pt-BR", {
            timeZone: "UTC",
          })}{" "}
          UTC
        </time>
      </p>
      <p className="mt-3">
        Consulta administrativa read-only. Snapshot comercial preservado. Não
        representa estoque reservado ou pagamento real.
      </p>
      <h2 className="font-editorial text-2xl text-coast">Itens do pedido</h2>
      <ul className="grid gap-4">
        {order.items.map((item, index) => (
          <li
            key={`${index}-${item.productName}`}
            className="admin-panel grid gap-3 sm:grid-cols-2"
          >
            <h3 className="break-words font-semibold sm:col-span-2">
              {item.productName}
            </h3>
            <p>Quantidade: {item.quantity}</p>
            <p>Preço aceito: {item.price.formatted}</p>
            <p>Subtotal: {item.subtotal.formatted}</p>
          </li>
        ))}
      </ul>
      <p className="admin-panel flex flex-wrap justify-between gap-4 text-xl font-semibold text-coast">
        Total do pedido <span>{order.total.formatted}</span>
      </p>
      <RefreshQuery />
      <Link href="/admin/orders" className="mt-6 block underline">
        Pedidos administrativos
      </Link>
    </main>
  );
}
