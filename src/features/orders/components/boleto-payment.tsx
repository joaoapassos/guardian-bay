import { simulatedPaymentCode } from "../simulated-payment-code";
import { CopyPaymentCode } from "./copy-payment-code";

export function BoletoPayment({
  reference,
  orderId,
  total,
  expiresAt,
}: {
  reference: string;
  orderId: string;
  total: string;
  expiresAt: string;
}) {
  return (
    <section
      className="space-y-5 rounded-panel border border-line bg-surface p-5 sm:p-7"
      aria-label="Boleto fictício"
    >
      <h2 className="font-editorial text-2xl text-coast">
        Boleto fictício — Guardian Bay
      </h2>
      <p className="my-3 font-bold">
        SIMULAÇÃO — SEM VALOR FINANCEIRO — NÃO PAGÁVEL
      </p>
      <dl className="grid gap-2 border-y py-4">
        <div>
          <dt className="font-semibold">Pedido</dt>
          <dd className="break-all">{orderId}</dd>
        </div>
        <div>
          <dt className="font-semibold">Referência de simulação</dt>
          <dd className="break-all">{reference}</dd>
        </div>
        <div>
          <dt className="font-semibold">Valor fictício</dt>
          <dd>{total}</dd>
        </div>
        <div>
          <dt className="font-semibold">Vencimento</dt>
          <dd>
            <time dateTime={expiresAt}>
              {new Date(expiresAt).toLocaleString("pt-BR", {
                timeZone: "America/Sao_Paulo",
              })}{" "}
              (Brasília)
            </time>
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Emissor fictício</dt>
          <dd>
            Guardian Bay — ambiente de simulação, sem banco ou beneficiário
            financeiro
          </dd>
        </div>
      </dl>
      <p className="my-3">
        Esta linha de simulação contém letras e não é uma linha digitável
        bancária. Não tente pagar em aplicativos ou agências. Confirme a
        simulação somente nesta página após o intervalo.
      </p>
      <CopyPaymentCode code={simulatedPaymentCode("BOLETO", reference)} />
      <p className="mt-4 text-sm">
        Sem código de barras bancário. Nenhuma instituição financeira participa
        deste documento.
      </p>
    </section>
  );
}
