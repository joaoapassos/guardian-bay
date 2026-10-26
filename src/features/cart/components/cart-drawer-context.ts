"use client";
import { createContext, useContext } from "react";
import type { CartUpdateResult } from "../cart-update-queue";

export const CartDrawerContext = createContext<{
  openCart: (message?: string) => void;
  refreshCart: () => Promise<void>;
  closeCart: () => void;
  requestQuantityUpdate: (
    id: string,
    quantity: number,
    baseline: number,
  ) => Promise<CartUpdateResult>;
  cancelQuantityUpdate: (id: string) => void;
  flushQuantityUpdates: () => Promise<boolean>;
} | null>(null);

export function useCartDrawer() {
  const context = useContext(CartDrawerContext);
  if (!context) throw new Error("Carrinho fora do contexto da loja.");
  return context;
}
