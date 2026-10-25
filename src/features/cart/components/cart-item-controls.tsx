"use client";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  removeCartItemAction,
  updateCartItemAction,
} from "../actions/cart-item.action";
import { QuantitySelector } from "./quantity-selector";

export function CartItemControls({
  productId,
  quantity,
  available,
  productName,
  nextItemId,
}: {
  productId: string;
  quantity: number;
  available: boolean;
  productName?: string;
  nextItemId?: string;
}) {
  const id = useId();
  const router = useRouter();
  const submitting = useRef(false);
  const [edit, setEdit] = useState({
    confirmed: quantity,
    draft: String(quantity),
  });
  if (edit.confirmed !== quantity) {
    setEdit({ confirmed: quantity, draft: String(quantity) });
  }
  const draft = edit.confirmed === quantity ? edit.draft : String(quantity);
  function setDraft(value: string) {
    setEdit({ confirmed: quantity, draft: value });
  }
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  function submit(operation: "update" | "remove") {
    if (submitting.current) return;
    const amount = Number(draft);
    if (
      operation === "update" &&
      (!Number.isInteger(amount) || amount < 1 || amount > 99)
    ) {
      setDraft(String(quantity));
      setMessage("Quantidade inválida. Use um inteiro entre 1 e 99.");
      return;
    }
    submitting.current = true;
    setMessage("");
    startTransition(async () => {
      try {
        const result =
          operation === "remove"
            ? await removeCartItemAction({ productId })
            : await updateCartItemAction({ productId, quantity: amount });
        if (result.success) {
          setMessage(
            operation === "remove"
              ? "Item removido."
              : "Quantidade atualizada.",
          );
          if (operation === "remove")
            requestAnimationFrame(() =>
              (
                document.getElementById(`cart-item-${nextItemId}`) ??
                document.getElementById("cart-title")
              )?.focus(),
            );
        } else {
          setDraft(String(quantity));
          if (result.code === "UNAUTHENTICATED")
            router.push("/login?returnTo=%2Fcart");
          setMessage(
            result.code === "UNAUTHENTICATED"
              ? "Sessão expirada. Entre novamente."
              : result.code === "OUT_OF_STOCK"
                ? "Estoque insuficiente. O carrinho não reserva unidades."
                : result.code === "UNAVAILABLE"
                  ? "Produto indisponível. Você pode removê-lo."
                  : result.code === "CONFLICT"
                    ? "O item mudou. Recarregue o carrinho."
                    : "Quantidade inválida. Use um inteiro entre 1 e 99.",
          );
        }
      } catch {
        setDraft(String(quantity));
        setMessage("Não foi possível concluir a operação. Tente novamente.");
      } finally {
        submitting.current = false;
      }
    });
  }
  return (
    <div className="mt-5 space-y-3" aria-busy={pending}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit("update");
        }}
        aria-label={`Alterar quantidade${productName ? ` de ${productName}` : ""}`}
        className="flex flex-wrap items-end gap-3"
      >
        <QuantitySelector
          id={id}
          value={draft}
          onChange={setDraft}
          disabled={pending || !available}
          describedBy={`${id}-feedback`}
        />
        <Button type="submit" disabled={pending || !available}>
          Atualizar quantidade
        </Button>
      </form>
      <button
        type="button"
        disabled={pending}
        onClick={() => submit("remove")}
        aria-label={
          productName ? `Remover item ${productName}` : "Remover item"
        }
        className="min-h-11 rounded-control text-sm font-semibold text-coast underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coast disabled:opacity-50"
      >
        Remover item
      </button>
      <output
        id={`${id}-feedback`}
        aria-live="polite"
        className="block text-sm"
      >
        {pending ? "Atualizando carrinho…" : message}
      </output>
    </div>
  );
}
