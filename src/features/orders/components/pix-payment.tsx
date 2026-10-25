import qrcode from "qrcode-generator";
import { simulatedPaymentCode } from "../simulated-payment-code";
import { CopyPaymentCode } from "./copy-payment-code";

export function PixPayment({ reference }: { reference: string }) {
  const code = simulatedPaymentCode("PIX", reference);
  const qr = qrcode(0, "M");
  qr.addData(code);
  qr.make();
  const size = qr.getModuleCount();
  let path = "";
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (qr.isDark(y, x)) path += `M${x + 4} ${y + 4}h1v1h-1z`;
  return (
    <section
      className="space-y-5 rounded-panel border border-line bg-surface p-5 sm:p-7"
      aria-label="Pix fictício"
    >
      <h2 className="font-editorial text-2xl text-coast">Pix fictício</h2>
      <p>
        SIMULAÇÃO — SEM VALOR FINANCEIRO. Este QR contém texto de teste; não
        transfere dinheiro e não é um código Pix bancário.
      </p>
      <svg
        className="max-w-full"
        role="img"
        aria-label="QR Code de texto fictício, sem transferência bancária"
        viewBox={`0 0 ${size + 8} ${size + 8}`}
        width="220"
        height="220"
        shapeRendering="crispEdges"
      >
        <title>QR Code de simulação Guardian Bay</title>
        <path fill="white" d={`M0 0h${size + 8}v${size + 8}H0z`} />
        <path fill="black" d={path} />
      </svg>
      <CopyPaymentCode code={code} />
    </section>
  );
}
