"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { addToCartAction } from "../actions/add-to-cart.action";
import { QuantitySelector } from "./quantity-selector";

export function AddToCartButton({
  productId,
  inStock = true,
  returnTo,
}: {
  productId: string;
  inStock?: boolean;
  returnTo?: string;
}) {
  const router = useRouter();
  const id = useId();
  const submitting = useRef(false);
  const [pending, startTransition] = useTransition();
  const [quantity, setQuantity] = useState("1");
  const [message, setMessage] = useState("");
  const [added, setAdded] = useState(false);
  return (
    <form
      aria-label="Adicionar produto ao carrinho"
      aria-busy={pending}
      className="mt-6 space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (submitting.current || !inStock) return;
        const amount = Number(quantity);
        if (!Number.isInteger(amount) || amount < 1 || amount > 99) {
          setMessage("Use uma quantidade inteira entre 1 e 99.");
          return;
        }
        submitting.current = true;
        setMessage("");
        setAdded(false);
        startTransition(async () => {
          try {
            const result = await addToCartAction({
              productId,
              quantity: amount,
            });
            if (result.success) {
              setAdded(true);
              setMessage("Produto adicionado ao carrinho.");
              router.refresh();
            } else if (result.code === "UNAUTHENTICATED")
              router.push(
                `/login?returnTo=${encodeURIComponent(returnTo ?? `/products/${productId}`)}`,
              );
            else
              setMessage(
                result.code === "OUT_OF_STOCK"
                  ? "Estoque insuficiente. O carrinho não reserva unidades."
                  : result.code === "UNAVAILABLE"
                    ? "Produto indisponível."
                    : result.code === "LIMIT_REACHED"
                      ? "Limite do carrinho atingido."
                      : "Não foi possível adicionar o produto.",
              );
          } catch {
            setMessage(
              "Não foi possível confirmar a adição. Confira seu carrinho antes de tentar novamente.",
            );
          } finally {
            submitting.current = false;
          }
        });
      }}
    >
      <QuantitySelector
        id={id}
        value={quantity}
        onChange={setQuantity}
        disabled={pending || !inStock}
        describedBy={`${id}-feedback`}
      />
      <Button
        type="submit"
        disabled={pending || !inStock}
        className="w-full sm:w-auto"
      >
        {!inStock
          ? "Sem estoque"
          : pending
            ? "Adicionando…"
            : "Adicionar ao carrinho"}
      </Button>
      <output
        id={`${id}-feedback`}
        aria-live="polite"
        className="block text-sm leading-relaxed"
      >
        {message}
      </output>
      {added && (
        <Link href="/cart" className="auth-link inline-block">
          Ver carrinho
        </Link>
      )}
    </form>
  );
}
