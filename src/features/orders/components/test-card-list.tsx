"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { removeTestCardAction } from "../actions/test-cards.action";

export function TestCardList({
  cards,
}: {
  cards: {
    id: string;
    brand: string;
    last4: string;
    expiryMonth: number;
    expiryYear: number;
  }[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <div aria-busy={pending}>
      {cards.length ? (
        <ul className="grid gap-3">
          {cards.map((card) => (
            <li className="rounded border p-3" key={card.id}>
              {card.brand} •••• {card.last4} —{" "}
              {String(card.expiryMonth).padStart(2, "0")}/{card.expiryYear}
              <button
                className="ml-4 underline disabled:opacity-50"
                type="button"
                disabled={pending}
                aria-label={`Remover cartão fictício final ${card.last4}`}
                onClick={() =>
                  startTransition(async () => {
                    try {
                      const result = await removeTestCardAction({
                        cardId: card.id,
                      });
                      setMessage(
                        result.success
                          ? "Cartão fictício removido."
                          : "Não foi possível remover. Confira sua sessão ou aguarde.",
                      );
                      if (result.success) router.refresh();
                    } catch {
                      setMessage("Não foi possível remover o cartão fictício.");
                    }
                  })
                }
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>Nenhum cartão fictício cadastrado.</p>
      )}
      <output aria-live="polite">{message}</output>
    </div>
  );
}
