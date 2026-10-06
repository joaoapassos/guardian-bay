"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addToCartAction } from "../actions/add-to-cart.action";

export function AddToCartButton({
  productId,
  inStock = true,
}: {
  productId: string;
  inStock?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <div className="mt-4">
      <button
        type="button"
        disabled={pending || !inStock}
        className="rounded border px-4 py-2 disabled:opacity-50"
        onClick={() => {
          setMessage("");
          startTransition(async () => {
            try {
              const result = await addToCartAction({ productId, quantity: 1 });
              if (result.success) setMessage("Produto adicionado ao carrinho.");
              else if (result.code === "UNAUTHENTICATED") router.push("/login");
              else
                setMessage(
                  result.code === "UNAVAILABLE"
                    ? "Produto indisponível."
                    : result.code === "LIMIT_REACHED"
                      ? "Limite do carrinho atingido."
                      : "Não foi possível adicionar o produto.",
                );
            } catch {
              setMessage(
                "Não foi possível adicionar o produto. Tente novamente.",
              );
            }
          });
        }}
      >
        {!inStock
          ? "Sem estoque"
          : pending
            ? "Adicionando…"
            : "Adicionar ao carrinho"}
      </button>
      <output aria-live="polite" className="block">
        {message}
      </output>
    </div>
  );
}
