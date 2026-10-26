"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/features/catalog/components/product-image";
import type { CartDto } from "../cart-dto";
import { CartItemControls } from "./cart-item-controls";

async function fetchCart({
  signal,
}: {
  signal: AbortSignal;
}): Promise<CartDto | { success: false; code: "UNAUTHENTICATED" }> {
  const response = await fetch("/api/cart", {
    credentials: "same-origin",
    cache: "no-store",
    signal,
  });
  if (response.status === 401)
    return { success: false, code: "UNAUTHENTICATED" };
  if (!response.ok) throw new Error("Carrinho indisponível.");
  return response.json();
}

export function CartDrawer({
  open,
  onOpenChange,
  notice,
  restoreFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notice: string;
  restoreFocus: () => void;
}) {
  const query = useQuery({
    queryKey: ["cart"],
    queryFn: fetchCart,
    enabled: open,
    staleTime: 0,
  });
  const expired = !query.isError && query.data?.success === false;
  const cart = query.isError || !query.data?.success ? undefined : query.data;
  const blocked = cart?.items.some((item) => !item.subtotal);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
        <Dialog.Content
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            restoreFocus();
          }}
          className="gb-cart-drawer fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col overflow-y-auto bg-surface p-5 font-auth text-ink shadow-lg sm:p-8"
        >
          <div className="flex items-center justify-between gap-4">
            <Dialog.Title
              id="cart-title"
              tabIndex={-1}
              className="font-editorial text-3xl text-coast"
            >
              Carrinho
            </Dialog.Title>
            <Dialog.Close
              aria-label="Fechar carrinho"
              className="cursor-pointer rounded-control p-2 text-coast focus-visible:outline-2 focus-visible:outline-coast"
            >
              <X size={22} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-3 text-sm text-muted">
            Sua seleção, com preços e disponibilidade atuais. O carrinho não
            reserva estoque.
          </Dialog.Description>
          {notice && <output className="mt-4 block text-sm">{notice}</output>}
          {query.isPending && (
            <output className="block py-8">Carregando carrinho…</output>
          )}
          {expired ? (
            <div className="space-y-4 py-8">
              <p>Entre para consultar seu carrinho.</p>
              <Link
                className="auth-link"
                href="/login?returnTo=%2Fproducts%3Fcart%3Dopen"
                onClick={() => onOpenChange(false)}
              >
                Entrar
              </Link>
            </div>
          ) : query.isError ? (
            <div className="space-y-4 py-8">
              <p role="alert">Não foi possível carregar o carrinho.</p>
              <Button onClick={() => void query.refetch()}>
                Tentar novamente
              </Button>
            </div>
          ) : (
            cart &&
            (cart.items.length === 0 ? (
              <div className="space-y-4 py-8">
                <h2 className="font-editorial text-2xl text-coast">
                  Seu carrinho está vazio
                </h2>
                <Link
                  href="/products"
                  className="auth-link"
                  onClick={() => onOpenChange(false)}
                >
                  Ver produtos
                </Link>
              </div>
            ) : (
              <>
                <p className="mt-5 text-sm text-muted">
                  {cart.items.reduce((count, item) => count + item.quantity, 0)}{" "}
                  unidades confirmadas no carrinho
                </p>
                <ul className="my-6 space-y-6">
                  {cart.items.map((item, index) => (
                    <li
                      key={item.productId}
                      className="grid grid-cols-[72px_minmax(0,1fr)] gap-4 border-b border-line pb-6"
                    >
                      <ProductImage image={item.image} size="thumbnail" />
                      <div className="min-w-0">
                        <h2
                          id={`cart-item-${item.productId}`}
                          tabIndex={-1}
                          className="break-words font-semibold text-coast"
                        >
                          {item.available ? (
                            <Link
                              href={`/products/${item.productId}`}
                              onClick={() => onOpenChange(false)}
                            >
                              {item.name}
                            </Link>
                          ) : (
                            item.name
                          )}
                        </h2>
                        <p className="mt-2 text-sm">
                          Preço atual: {item.price.formatted}
                        </p>
                        <p className="mt-2 text-sm">
                          Quantidade confirmada: {item.quantity}
                        </p>
                        {item.subtotal ? (
                          <p className="mt-2 font-semibold">
                            Subtotal: {item.subtotal.formatted}
                          </p>
                        ) : (
                          <p className="mt-2 text-sm text-danger">
                            {item.available
                              ? "Estoque insuficiente."
                              : "Produto indisponível."}{" "}
                            Não incluído no total. Reduza a quantidade ou remova
                            o item.
                          </p>
                        )}
                        <CartItemControls
                          productId={item.productId}
                          productName={item.name}
                          quantity={item.quantity}
                          available={item.available}
                          nextItemId={cart.items[index + 1]?.productId}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto space-y-4 border-t border-line pt-6">
                  <p className="text-sm text-muted">
                    Total dos itens disponíveis
                  </p>
                  <p
                    aria-live="polite"
                    className="text-2xl font-semibold tabular-nums text-coast"
                  >
                    {cart.total.formatted}
                  </p>
                  {blocked ? (
                    <>
                      <p className="text-sm text-danger">
                        Resolva os itens indisponíveis antes de continuar.
                      </p>
                      <Button disabled className="w-full">
                        Revisar checkout
                      </Button>
                    </>
                  ) : (
                    <Link
                      href="/checkout"
                      onClick={() => onOpenChange(false)}
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-control bg-coast px-5 py-3 font-semibold text-paper focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-coast"
                    >
                      Revisar checkout
                    </Link>
                  )}
                </div>
              </>
            ))
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
