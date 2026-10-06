"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { checkoutAction } from "../actions/checkout.action";

export function CheckoutConfirmation({ checkoutKey }: { checkoutKey: string }) {
  const [key] = useState(checkoutKey);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <form
      aria-label="Confirmar checkout"
      aria-busy={pending}
      action={() => {
        setMessage("");
        startTransition(async () => {
          try {
            const result = await checkoutAction({ checkoutKey: key });
            if (result.success) router.push(`/orders/${result.orderId}`);
            else
              setMessage(
                result.code === "UNAUTHENTICATED"
                  ? "Sessão expirada. Entre novamente."
                  : result.code === "EMPTY_CART"
                    ? "O carrinho está vazio. Volte ao catálogo."
                    : result.code === "UNAVAILABLE"
                      ? "Um produto está indisponível. Corrija o carrinho."
                      : "Confirmação inválida. Recarregue o checkout.",
              );
          } catch {
            setMessage(
              "Não foi possível confirmar. Tente novamente com esta mesma confirmação.",
            );
          }
        });
      }}
    >
      <button
        type="submit"
        disabled={pending}
        className="mt-6 rounded border px-4 py-2 disabled:opacity-50"
        aria-describedby="checkout-feedback"
      >
        Confirmar pedido simulado
      </button>
      <output id="checkout-feedback" aria-live="polite" className="block mt-3">
        {pending ? "Confirmando pedido…" : message}
      </output>
    </form>
  );
}
