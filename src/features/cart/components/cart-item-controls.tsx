"use client";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { removeCartItemAction } from "../actions/cart-item.action";
import { useCartDrawer } from "./cart-drawer-context";
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
  const {
    refreshCart,
    requestQuantityUpdate,
    cancelQuantityUpdate,
    flushQuantityUpdates,
  } = useCartDrawer();
  const updateRequested = useRef(false);
  const generation = useRef(0);
  const submitting = useRef(false);
  const [edit, setEdit] = useState({
    confirmed: quantity,
    draft: String(quantity),
  });
  if (edit.confirmed !== quantity) {
    if (!updateRequested.current)
      setEdit({ confirmed: quantity, draft: String(quantity) });
  }
  const draft = edit.draft;
  function setDraft(value: string) {
    setEdit({ confirmed: quantity, draft: value });
    if (updateRequested.current) submit("update", value);
  }
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  function submit(operation: "update" | "remove", value = draft) {
    if (submitting.current && operation === "remove") return;
    const currentGeneration = ++generation.current;
    const amount = Number(value);
    if (
      operation === "update" &&
      (!Number.isInteger(amount) || amount < 1 || amount > 99)
    ) {
      updateRequested.current = false;
      cancelQuantityUpdate(productId);
      setMessage("Quantidade inválida. Use um inteiro entre 1 e 99.");
      return;
    }
    updateRequested.current = operation === "update";
    submitting.current = true;
    setMessage("");
    startTransition(async () => {
      try {
        if (operation === "remove") {
          cancelQuantityUpdate(productId);
          await flushQuantityUpdates();
        }
        const result =
          operation === "remove"
            ? await removeCartItemAction({ productId })
            : await requestQuantityUpdate(productId, amount, quantity);
        if (
          currentGeneration !== generation.current ||
          (!result.success && ["SUPERSEDED", "CANCELLED"].includes(result.code))
        )
          return;
        updateRequested.current = false;
        if (result.success && "changed" in result && result.changed === false) {
          setMessage("Já está atualizado.");
        } else if (result.success) {
          if (operation === "remove") await refreshCart();
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
            router.push("/login?returnTo=%2Fproducts%3Fcart%3Dopen");
          setMessage(
            result.code === "UNAUTHENTICATED"
              ? "Sessão expirada. Entre novamente."
              : result.code === "OUT_OF_STOCK"
                ? "Estoque insuficiente. O carrinho não reserva unidades."
                : result.code === "UNAVAILABLE"
                  ? "Produto indisponível. Você pode removê-lo."
                  : result.code === "CONFLICT"
                    ? "O item mudou. Recarregue o carrinho."
                    : result.code === "RATE_LIMITED"
                      ? "Muitas atualizações. Aguarde um momento e tente novamente."
                      : "Quantidade inválida. Use um inteiro entre 1 e 99.",
          );
        }
      } catch {
        if (currentGeneration === generation.current) {
          updateRequested.current = false;
          setMessage(
            "Não foi possível confirmar. Confira o carrinho antes de tentar novamente.",
          );
        }
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
          disabled={!available}
          describedBy={`${id}-feedback`}
        />
        <Button type="submit" disabled={!available}>
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
