"use client";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { removePaymentMethodAction } from "../actions/payment-methods.action";
import { isCardExpired, type PaymentMethodDto } from "../schemas/card";
import { PaymentMethodForm } from "./payment-method-form";

const brandNames = {
  VISA: "Visa",
  MASTERCARD: "Mastercard",
  AMEX: "American Express",
};

export function PaymentMethodList({
  paymentMethods,
}: {
  paymentMethods: PaymentMethodDto[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<PaymentMethodDto | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const addTrigger = useRef<HTMLButtonElement>(null);
  const section = useRef<HTMLElement>(null);
  const removeTrigger = useRef<HTMLButtonElement | null>(null);
  return (
    <section
      ref={section}
      tabIndex={-1}
      aria-label="Formas de pagamento salvas"
      className="space-y-6"
    >
      <p className="rounded-panel border border-line bg-surface p-5 text-sm text-muted">
        Pagamento sempre simulado. Apenas bandeira, final e validade são salvos;
        esses dados não permitem realizar cobranças.
      </p>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted">
          {paymentMethods.length} de 3 cartões salvos.
        </p>
        <Button
          ref={addTrigger}
          disabled={adding || paymentMethods.length >= 3}
          onClick={() => setAdding(true)}
        >
          Adicionar cartão
        </Button>
      </div>
      {adding && (
        <PaymentMethodForm
          onClose={() => {
            setAdding(false);
            requestAnimationFrame(() => {
              (addTrigger.current?.disabled
                ? section.current
                : addTrigger.current
              )?.focus();
            });
          }}
        />
      )}
      {!paymentMethods.length && (
        <div className="rounded-panel border border-line bg-surface p-7">
          <h2 className="font-editorial text-2xl text-coast">
            Nenhum cartão salvo
          </h2>
          <p className="mt-3 text-muted">
            Adicione um cartão de teste ou informe seus dados durante a
            finalização da compra.
          </p>
        </div>
      )}
      <ul className="grid gap-5 md:grid-cols-2">
        {paymentMethods.map((card) => (
          <li
            key={card.id}
            className="rounded-panel border border-line bg-surface p-5"
          >
            <h2 className="text-lg font-semibold">
              {brandNames[card.brand]} · final {card.last4}
            </h2>
            <p className="mt-3 text-sm">
              Validade {String(card.expiryMonth).padStart(2, "0")}/
              {card.expiryYear}
            </p>
            {isCardExpired(card.expiryMonth, card.expiryYear) && (
              <p className="mt-2 text-sm text-danger">
                Cartão expirado. Remova-o e cadastre uma validade atual.
              </p>
            )}
            <Button
              className="mt-5 bg-paper text-danger"
              disabled={pending}
              onClick={(event) => {
                removeTrigger.current = event.currentTarget;
                setMessage("");
                setRemoving(card);
              }}
            >
              Remover<span className="sr-only"> cartão final {card.last4}</span>
            </Button>
          </li>
        ))}
      </ul>
      <AlertDialog.Root
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open && !pending) setRemoving(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-overlay-strong" />
          <AlertDialog.Content
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-panel border border-line bg-paper p-6"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              (removeTrigger.current?.isConnected
                ? removeTrigger.current
                : addTrigger.current
              )?.focus();
            }}
          >
            <AlertDialog.Title className="font-editorial text-2xl text-coast">
              Remover cartão final {removing?.last4}?
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-3 text-muted">
              O cartão será removido da sua conta. Pedidos anteriores mantêm os
              metadados de sua simulação.
            </AlertDialog.Description>
            <div className="mt-6 flex flex-wrap gap-3">
              <AlertDialog.Cancel asChild>
                <Button className="bg-surface text-coast" disabled={pending}>
                  Cancelar
                </Button>
              </AlertDialog.Cancel>
              <Button
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    if (!removing) return;
                    try {
                      const result = await removePaymentMethodAction({
                        id: removing.id,
                      });
                      if (result.success) {
                        setRemoving(null);
                        router.refresh();
                      } else if (result.code === "UNAUTHENTICATED")
                        router.replace("/login");
                      else {
                        setRemoving(null);
                        setMessage(
                          "Não foi possível remover agora. Aguarde e tente novamente.",
                        );
                      }
                    } catch {
                      setRemoving(null);
                      setMessage(
                        "Não foi possível remover agora. Atualize a página e tente novamente.",
                      );
                    }
                  })
                }
              >
                {pending ? "Removendo…" : "Remover cartão"}
              </Button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
      {message && (
        <p role="alert" className="text-danger">
          {message}
        </p>
      )}
    </section>
  );
}
