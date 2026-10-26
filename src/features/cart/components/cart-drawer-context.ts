"use client";
import { createContext, useContext } from "react";

export const CartDrawerContext = createContext<{
  openCart: (message?: string) => void;
  refreshCart: () => Promise<void>;
  closeCart: () => void;
} | null>(null);

export function useCartDrawer() {
  const context = useContext(CartDrawerContext);
  if (!context) throw new Error("Carrinho fora do contexto da loja.");
  return context;
}
