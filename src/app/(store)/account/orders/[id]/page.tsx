import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { loginHref } from "@/features/auth/safe-return";
import { BoletoPayment } from "@/features/orders/components/boleto-payment";
import { OrderSummary } from "@/features/orders/components/order-summary";
import { PaymentControls } from "@/features/orders/components/payment-controls";
import { PixPayment } from "@/features/orders/components/pix-payment";
import {
  orderStatusLabel,
  paymentMethodLabel,
} from "@/features/orders/order-status";
import { orderDetail } from "@/features/orders/server/order-detail";
import { readPayment } from "@/features/orders/server/read-payment";
import { AccountShell } from "../../../_components/account-shell";
export default async function OrderDetailPage({
  params,
  searchParams,
}: PageProps<"/account/orders/[id]">) {
  const { id } = await params;
  const { page } = await searchParams;
  const historyPage =
    typeof page === "string" &&
    /^\d{1,4}$/.test(page) &&
    Number(page) >= 1 &&
    Number(page) <= 1000
      ? Number(page)
      : 1;
  const historyHref =
    historyPage > 1 ? `/account/orders?page=${historyPage}` : "/account/orders";
  const result = await orderDetail(id);
  if (!result.success) {
    if (result.code === "UNAUTHENTICATED")
      redirect(loginHref(`/account/orders/${id}?page=${historyPage}`));
    notFound();
  }
  const order = result.order;
  const payment = await readPayment(order.orderId);
  return (
    <AccountShell
      active="orders"
      title="Detalhes do pedido"
      description="Confira os itens registrados e o estado do pagamento simulado."
    >
      <Link href={historyHref} className="auth-link inline-block">
        Meus pedidos
      </Link>
      <section
        aria-label="Dados do pedido"
        className="space-y-3 rounded-panel border border-line bg-surface p-5 sm:p-7"
      >
        <h2 className="break-all text-sm font-semibold">
          Pedido {order.orderId}
        </h2>
        <p className="w-fit rounded-control border border-coast px-3 py-1 text-sm font-semibold text-coast">
          {orderStatusLabel(order.status)}
        </p>
        <p>
          {paymentMethodLabel(payment?.method)}
          {payment?.cardLast4 ? ` •••• ${payment.cardLast4}` : ""}
        </p>
        <p>
          <time dateTime={order.createdAt}>
            {new Date(order.createdAt).toLocaleString("pt-BR", {
              timeZone: "UTC",
            })}{" "}
            UTC
          </time>
        </p>
        <p className="mt-3">
          Itens e valores registrados na compra. Esta simulação não representa
          reserva de estoque ou pagamento real.
        </p>
        {order.status === "PAYMENT_FAILED" && (
          <p role="alert">
            {payment?.method === "PIX" || payment?.method === "BOLETO"
              ? "Pagamento simulado não aprovado por valor ou indisponibilidade. Os itens já foram convertidos em pedido; monte um novo carrinho se desejar tentar novamente."
              : "Pagamento simulado recusado. Seu carrinho foi preservado. Corrija-o e inicie uma nova confirmação."}
          </p>
        )}
        {order.status === "PAYMENT_EXPIRED" && (
          <p role="alert">
            Prazo encerrado. Nenhum pagamento foi realizado. Para tentar
            novamente, monte um novo carrinho e crie outro pedido.
          </p>
        )}
      </section>
      <OrderSummary items={order.items} total={order.total} />
      {order.buyer && (
        <section className="store-panel" aria-label="Comprador">
          <h2 className="font-editorial text-2xl text-coast">Comprador</h2>
          <p className="mt-4">{order.buyer.name}</p>
          <p className="mt-2">CPF {order.buyer.cpfMask}</p>
        </section>
      )}
      <section
        aria-labelledby="shipping-address-title"
        className="rounded-panel border border-line bg-surface p-5 sm:p-7"
      >
        <h2
          id="shipping-address-title"
          className="font-editorial text-2xl text-coast"
        >
          Endereço registrado no pedido
        </h2>
        {order.shippingAddress ? (
          <div className="mt-4 break-words">
            <p className="font-semibold">{order.shippingAddress.recipient}</p>
            <p>
              {order.shippingAddress.street}, {order.shippingAddress.number}
              {order.shippingAddress.complement &&
                ` — ${order.shippingAddress.complement}`}
            </p>
            <p>
              {order.shippingAddress.neighborhood} ·{" "}
              {order.shippingAddress.city}/{order.shippingAddress.state}
            </p>
            <p>
              CEP {order.shippingAddress.postalCode.slice(0, 5)}-
              {order.shippingAddress.postalCode.slice(5)} · Brasil
            </p>
          </div>
        ) : (
          <p className="mt-3 text-muted">
            Este pedido foi registrado sem endereço de entrega.
          </p>
        )}
      </section>
      {payment?.method === "PIX" && <PixPayment reference={payment.id} />}
      {payment?.method === "BOLETO" && (
        <BoletoPayment
          reference={payment.id}
          orderId={order.orderId}
          total={order.total.formatted}
          expiresAt={payment.expiresAt}
        />
      )}
      {payment?.status === "PENDING" && (
        <PaymentControls
          key={`${payment.id}-${payment.serverNow}`}
          orderId={order.orderId}
          approvableAt={payment.approvableAt}
          expiresAt={payment.expiresAt}
          serverNow={payment.serverNow}
        />
      )}
      <Link href={historyHref} className="auth-link mt-6 block">
        Histórico de pedidos
      </Link>
      <Link href="/cart" className="auth-link mt-3 block">
        Voltar ao carrinho
      </Link>
    </AccountShell>
  );
}
