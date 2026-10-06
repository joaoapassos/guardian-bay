"use client";
import { useId, useState, useTransition } from "react";
import {
  removeCartItemAction,
  updateCartItemAction,
} from "../actions/cart-item.action";

export function CartItemControls({
  productId,
  quantity,
  available,
}: {
  productId: string;
  quantity: number;
  available: boolean;
}) {
  const id = useId();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  function submit(operation: "update" | "remove", form: FormData) {
    setMessage("");
    startTransition(async () => {
      try {
        const result =
          operation === "remove"
            ? await removeCartItemAction({ productId })
            : await updateCartItemAction({
                productId,
                quantity: Number(form.get("quantity")),
              });
        if (result.success)
          setMessage(
            operation === "remove"
              ? "Item removido."
              : "Quantidade atualizada.",
          );
        else
          setMessage(
            result.code === "UNAUTHENTICATED"
              ? "Sessão expirada. Entre novamente."
              : result.code === "UNAVAILABLE"
                ? "Produto indisponível. Você pode removê-lo."
                : result.code === "CONFLICT"
                  ? "O item mudou. Recarregue o carrinho."
                  : "Quantidade inválida. Use um inteiro entre 1 e 99.",
          );
      } catch {
        setMessage("Não foi possível concluir a operação. Tente novamente.");
      }
    });
  }
  return (
    <div className="mt-4">
      <form
        action={(form) => submit("update", form)}
        className="flex flex-wrap items-end gap-3"
      >
        <label htmlFor={id}>
          Quantidade
          <input
            key={quantity}
            id={id}
            name="quantity"
            type="number"
            min={1}
            max={99}
            step={1}
            required
            defaultValue={quantity}
            disabled={pending || !available}
            aria-describedby={`${id}-feedback`}
            className="ml-2 w-20 border p-2"
          />
        </label>
        <button
          type="submit"
          disabled={pending || !available}
          className="rounded border px-4 py-2 disabled:opacity-50"
        >
          Atualizar quantidade
        </button>
      </form>
      <form action={(form) => submit("remove", form)} className="mt-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded border px-4 py-2 disabled:opacity-50"
        >
          Remover item
        </button>
      </form>
      <output id={`${id}-feedback`} aria-live="polite">
        {pending ? "Atualizando carrinho…" : message}
      </output>
    </div>
  );
}
