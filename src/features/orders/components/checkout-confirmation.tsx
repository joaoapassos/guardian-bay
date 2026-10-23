"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { checkoutAction } from "../actions/checkout.action";

export function CheckoutConfirmation({
  checkoutKey,
  cards,
}: {
  checkoutKey: string;
  cards: {
    id: string;
    last4: string;
    expiryMonth: number;
    expiryYear: number;
  }[];
}) {
  const [key] = useState(checkoutKey);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [method, setMethod] = useState(cards.length ? "CARD" : "PIX");
  const [cardId, setCardId] = useState(cards[0]?.id ?? "");
  return (
    <form
      aria-label="Confirmar checkout"
      aria-busy={pending}
      action={() => {
        setMessage("");
        startTransition(async () => {
          try {
            const result = await checkoutAction({
              checkoutKey: key,
              payment: method === "CARD" ? { method, cardId } : { method },
            });
            if (result.success) router.push(`/orders/${result.orderId}`);
            else
              setMessage(
                result.code === "RATE_LIMITED"
                  ? "Muitas confirmações. Aguarde e tente novamente."
                  : result.code === "UNAUTHENTICATED"
                    ? "Sessão expirada. Entre novamente."
                    : result.code === "INVALID_CARD"
                      ? "Cartão indisponível ou vencido. Selecione outro."
                      : result.code === "EMPTY_CART"
                        ? "O carrinho está vazio. Volte ao catálogo."
                        : result.code === "OUT_OF_STOCK"
                          ? "Estoque insuficiente. Revise o carrinho."
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
      <label className="mt-6 block">
        Método de pagamento simulado
        <select
          className="ml-3 rounded border p-2"
          value={method}
          disabled={pending}
          onChange={(event) => setMethod(event.target.value)}
        >
          <option value="CARD">Cartão fictício</option>
          <option value="PIX">Pix fictício</option>
          <option value="BOLETO">Boleto fictício</option>
        </select>
      </label>
      {method === "CARD" && (
        <label className="mt-3 block">
          Cartão cadastrado
          <select
            className="ml-3 rounded border p-2"
            value={cardId}
            disabled={pending}
            onChange={(event) => setCardId(event.target.value)}
          >
            <option value="">Selecione um cartão fictício</option>
            {cards.map((card) => (
              <option key={card.id} value={card.id}>
                TEST •••• {card.last4} —{" "}
                {String(card.expiryMonth).padStart(2, "0")}/{card.expiryYear}
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="mt-3">
        Nenhum dinheiro será movimentado. Pix e boleto convertem o carrinho em
        pedido pendente, sem reservar estoque; disponibilidade será verificada
        na confirmação. Falhas e expiração não restauram o carrinho
        automaticamente.
      </p>
      <button
        type="submit"
        disabled={
          pending ||
          (method === "CARD" && !cards.some((card) => card.id === cardId))
        }
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
