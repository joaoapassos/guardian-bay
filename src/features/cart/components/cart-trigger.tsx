"use client";
import { ShoppingBag } from "lucide-react";
import { useCartDrawer } from "./cart-drawer-context";

export function CartTrigger() {
  const { openCart } = useCartDrawer();
  return (
    <button
      type="button"
      onClick={() => openCart()}
      id="store-cart-trigger"
      className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-control text-sm text-coast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coast"
    >
      <ShoppingBag size={20} aria-hidden="true" />
      <span>Carrinho</span>
    </button>
  );
}
