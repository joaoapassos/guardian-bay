"use client";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
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
  const trigger = useRef<HTMLButtonElement | null>(null);
  const removed = useRef(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <div aria-busy={pending}>
      {cards.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {cards.map((card) => (
            <li
              className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-paper p-5"
              key={card.id}
            >
              {card.brand} •••• {card.last4} —{" "}
              {String(card.expiryMonth).padStart(2, "0")}/{card.expiryYear}
              <button
                className="min-h-11 rounded-control px-2 text-sm font-semibold text-coast underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-coast disabled:opacity-50"
                type="button"
                disabled={pending}
                aria-label={`Remover cartão fictício final ${card.last4}`}
                onClick={(event) => {
                  trigger.current = event.currentTarget;
                  removed.current = false;
                  setMessage("");
                  setSelected(card.id);
                }}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>Nenhum cartão fictício cadastrado.</p>
      )}
      <AlertDialog.Root
        open={selected !== null}
        onOpenChange={(open) => {
          if (!pending && !open) setSelected(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-ink/45" />
          <AlertDialog.Content
            className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-panel border border-line bg-surface p-6 font-auth text-ink"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              if (removed.current)
                document.getElementById("cards-title")?.focus();
              else trigger.current?.focus();
            }}
          >
            <AlertDialog.Title className="font-editorial text-2xl text-coast">
              Remover cartão fictício?
            </AlertDialog.Title>
            <AlertDialog.Description className="my-4 text-muted">
              O cartão final {cards.find((card) => card.id === selected)?.last4}{" "}
              será removido da sua conta. Seus pedidos anteriores permanecem
              preservados.
            </AlertDialog.Description>
            <div className="flex flex-wrap gap-3">
              <AlertDialog.Cancel asChild>
                <Button disabled={pending}>Manter cartão</Button>
              </AlertDialog.Cancel>
              <Button
                className="bg-danger"
                disabled={pending}
                onClick={() => {
                  if (!selected) return;
                  startTransition(async () => {
                    try {
                      const result = await removeTestCardAction({
                        cardId: selected,
                      });
                      setMessage(
                        result.success
                          ? "Cartão fictício removido."
                          : "Não foi possível remover. Confira sua sessão ou aguarde.",
                      );
                      if (result.success) {
                        removed.current = true;
                        setSelected(null);
                        router.refresh();
                      }
                    } catch {
                      setMessage("Não foi possível remover o cartão fictício.");
                    }
                  });
                }}
              >
                {pending ? "Removendo…" : "Remover cartão"}
              </Button>
            </div>
            <output className="mt-4 block text-sm" aria-live="polite">
              {message}
            </output>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
      <output aria-live="polite">{selected === null ? message : ""}</output>
    </div>
  );
}
