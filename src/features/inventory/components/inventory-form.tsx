"use client";
import { useState, useTransition } from "react";
import { setInventoryQuantityAction } from "../actions/set-inventory.action";

export function InventoryForm({
  productId,
  quantity,
  revision,
  name,
}: {
  productId: string;
  quantity: number;
  revision: number;
  name: string;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <form
      aria-label={`Estoque de ${name}`}
      aria-busy={pending}
      className="admin-panel space-y-4"
      action={(form) => {
        if (Number(form.get("quantity")) === quantity) {
          setMessage("Já está atualizado.");
          return;
        }
        setMessage("");
        startTransition(async () => {
          try {
            const result = await setInventoryQuantityAction({
              productId,
              quantity: Number(form.get("quantity")),
              revision,
            });
            setMessage(
              result.success
                ? "changed" in result && result.changed === false
                  ? "Já está atualizado."
                  : "Estoque atualizado."
                : result.code === "RATE_LIMITED"
                  ? "Muitas operações. Aguarde e tente novamente."
                  : result.code === "CONFLICT"
                    ? "O estoque mudou. Recarregue antes de editar."
                    : result.code === "FORBIDDEN"
                      ? "Acesso administrativo negado. Entre novamente."
                      : result.code === "INVALID_INPUT"
                        ? "Informe uma quantidade inteira válida."
                        : "Não foi possível atualizar o estoque.",
            );
          } catch {
            setMessage("Não foi possível atualizar o estoque.");
          }
        });
      }}
    >
      <p>Estoque atual: {quantity} unidades.</p>
      <p>Defina uma quantidade absoluta. O carrinho não reserva unidades.</p>
      <label>
        Nova quantidade em estoque de {name}
        <input
          key={`${revision}:${quantity}`}
          name="quantity"
          type="number"
          min={0}
          max={2147483647}
          step={1}
          required
          defaultValue={quantity}
          disabled={pending}
          className="ml-2 border p-2"
        />
      </label>
      <button disabled={pending} className="admin-action" type="submit">
        {pending ? "Atualizando estoque…" : "Definir estoque"}
      </button>
      <output aria-live="polite" className="block">
        {message}
      </output>
    </form>
  );
}
