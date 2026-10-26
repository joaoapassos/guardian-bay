"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { CartDrawer } from "./cart-drawer";
import { CartDrawerContext } from "./cart-drawer-context";
import { CartUrlIntent } from "./cart-url-intent";

export function CartProvider({ children }: { children: ReactNode }) {
  // The cache is scoped to the store shell and is never persisted or authoritative.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false },
        },
      }),
  );
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const opener = useRef<HTMLElement | null>(null);
  const openCart = useCallback((message = "") => {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setNotice(message);
    setOpen(true);
  }, []);
  const restoreFocus = useCallback(() => {
    const target = opener.current?.isConnected
      ? opener.current
      : document.getElementById("store-cart-trigger");
    target?.focus();
  }, []);
  const closeCart = useCallback(() => {
    setOpen(false);
    setNotice("");
    // Abort the HTTP read before discarding all values from its previous owner.
    void client.cancelQueries({ queryKey: ["cart"] });
    client.removeQueries({ queryKey: ["cart"] });
  }, [client]);
  const refreshCart = useCallback(async () => {
    await client.invalidateQueries({ queryKey: ["cart"] });
  }, [client]);
  useEffect(() => {
    const channel =
      typeof BroadcastChannel === "function"
        ? new BroadcastChannel("guardian-auth")
        : null;
    const clear = (event: Event) => {
      closeCart();
      channel?.postMessage(
        event.type === "guardian:logout" ? "logout" : "identity-changed",
      );
    };
    const peerChange = (event: MessageEvent<unknown>) => {
      if (event.data === "logout" || event.data === "identity-changed")
        closeCart();
    };
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) closeCart();
    };
    channel?.addEventListener("message", peerChange);
    window.addEventListener("guardian:logout", clear);
    window.addEventListener("guardian:identity-changed", clear);
    window.addEventListener("pageshow", restore);
    return () => {
      window.removeEventListener("guardian:logout", clear);
      window.removeEventListener("guardian:identity-changed", clear);
      window.removeEventListener("pageshow", restore);
      channel?.removeEventListener("message", peerChange);
      channel?.close();
      client.clear();
    };
  }, [client, closeCart]);
  return (
    <QueryClientProvider client={client}>
      <CartDrawerContext value={{ openCart, closeCart, refreshCart }}>
        {children}
        <Suspense fallback={null}>
          <CartUrlIntent />
        </Suspense>
        <CartDrawer
          open={open}
          onOpenChange={(nextOpen) => {
            if (nextOpen) openCart();
            else closeCart();
          }}
          notice={notice}
          restoreFocus={restoreFocus}
        />
      </CartDrawerContext>
    </QueryClientProvider>
  );
}
