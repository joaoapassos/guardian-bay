"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { confirmPaymentAction } from "../actions/confirm-payment.action";

export function PaymentControls({
  orderId,
  approvableAt,
  expiresAt,
  serverNow,
}: {
  orderId: string;
  approvableAt: string;
  expiresAt: string;
  serverNow: string;
}) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const started = performance.now();
    const timer = window.setInterval(
      () => setElapsed(performance.now() - started),
      1000,
    );
    return () => window.clearInterval(timer);
  }, []);
  const remaining = Math.max(
    0,
    Math.ceil((Date.parse(expiresAt) - Date.parse(serverNow) - elapsed) / 1000),
  );
  const ready = Date.parse(approvableAt) <= Date.parse(serverNow) + elapsed;
  return (
    <div
      className="rounded-panel border border-line bg-surface p-5"
      aria-busy={pending}
    >
      <p>
        Tempo restante:{" "}
        <span role="timer" aria-label="Tempo restante do pagamento">
          {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
        </span>
      </p>
      <p>
        O servidor confirma prazo, valor e estoque. O contador não aprova o
        pagamento.
      </p>
      <Button
        className="mt-4"
        type="button"
        disabled={pending || (!ready && remaining > 0)}
        onClick={() =>
          startTransition(async () => {
            try {
              const result = await confirmPaymentAction({ orderId });
              setMessage(
                result.success
                  ? "Status confirmado no servidor."
                  : result.code === "NOT_READY"
                    ? "Aguarde o intervalo da simulação."
                    : result.code === "RATE_LIMITED"
                      ? "Muitas confirmações. Aguarde um minuto."
                      : "Não foi possível confirmar. Confira sua sessão.",
              );
              router.refresh();
            } catch {
              setMessage(
                "Não foi possível confirmar. Tente novamente; a confirmação é idempotente.",
              );
            }
          })
        }
      >
        {remaining === 0
          ? "Verificar expiração no servidor"
          : ready
            ? "Confirmar pagamento simulado"
            : "Aguardando intervalo de simulação"}
      </Button>
      <Button
        className="mt-3 sm:ml-3"
        type="button"
        disabled={pending}
        onClick={() => router.refresh()}
      >
        Atualizar status
      </Button>
      <output className="block" aria-live="polite">
        {message}
      </output>
    </div>
  );
}
