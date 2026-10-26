"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useCartDrawer } from "./cart-drawer-context";

export function CartUrlIntent() {
  const search = useSearchParams();
  const path = usePathname();
  const router = useRouter();
  const { openCart } = useCartDrawer();
  useEffect(() => {
    if (search.get("cart") !== "open") return;
    const result = search.get("cartResult");
    const notice =
      result === "ADDED"
        ? "Produto adicionado ao carrinho."
        : result === "OUT_OF_STOCK"
          ? "O produto não foi adicionado: estoque insuficiente."
          : result === "UNAVAILABLE"
            ? "O produto não está mais disponível."
            : result === "LIMIT_REACHED"
              ? "O produto não foi adicionado: limite do carrinho atingido."
              : result
                ? "Confira seu carrinho antes de tentar adicionar novamente."
                : "";
    openCart(notice);
    const next = new URLSearchParams(search.toString());
    next.delete("cart");
    next.delete("cartResult");
    router.replace(`${path}${next.size ? `?${next}` : ""}`, { scroll: false });
  }, [search, path, router, openCart]);
  return null;
}
