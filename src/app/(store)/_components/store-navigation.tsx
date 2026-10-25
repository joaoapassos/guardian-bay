"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import { useState } from "react";

export function StoreNavigation({
  categories,
  children,
}: {
  categories: { id: string; name: string }[] | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <header className="border-b border-line bg-paper px-5 py-4 font-auth text-ink sm:px-8">
      <div className="mx-auto grid max-w-7xl items-center gap-4 md:grid-cols-[auto_minmax(180px,1fr)_auto]">
        <Link
          href="/"
          className="font-editorial text-xl font-extrabold tracking-tight text-coast sm:text-2xl"
        >
          GUARDIAN BAY
        </Link>
        <Form
          action="/products"
          role="search"
          className="row-start-2 flex min-w-0 md:row-start-auto"
        >
          <label htmlFor="store-search" className="sr-only">
            Pesquisar produtos
          </label>
          <input
            id="store-search"
            name="query"
            maxLength={100}
            placeholder="O que você precisa preparar?"
            className="min-h-11 min-w-0 flex-1 rounded-l-control border border-muted bg-surface px-3 text-base"
          />
          <button
            type="submit"
            aria-label="Pesquisar"
            className="rounded-r-control border border-l-0 border-muted bg-surface px-3 text-coast"
          >
            <Search size={20} aria-hidden="true" />
          </button>
        </Form>
        <div className="flex min-w-0 flex-wrap items-center gap-3 md:justify-end">
          <Link
            href="/cart"
            className="inline-flex min-h-11 items-center gap-2 rounded-control text-sm text-coast"
          >
            <ShoppingBag size={20} aria-hidden="true" />
            <span>Carrinho</span>
          </Link>
          {children}
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger
              aria-label="Abrir navegação"
              className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line px-3 text-coast lg:hidden"
            >
              <Menu size={20} aria-hidden="true" />
              Menu
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
              <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-[min(90vw,360px)] overflow-y-auto bg-surface p-6 font-auth">
                <Dialog.Title className="font-editorial text-2xl text-coast">
                  Guardian Bay
                </Dialog.Title>
                <Dialog.Description className="sr-only">
                  Navegue pelo catálogo e pelas categorias.
                </Dialog.Description>
                <Dialog.Close
                  aria-label="Fechar navegação"
                  className="absolute right-4 top-4 rounded-control p-2 text-coast"
                >
                  <X size={20} aria-hidden="true" />
                </Dialog.Close>
                <nav aria-label="Navegação mobile" className="mt-8 space-y-3">
                  <Link
                    href="/products"
                    onClick={() => setOpen(false)}
                    className="store-nav-link block"
                  >
                    Todos os produtos
                  </Link>
                  {categories?.map((category) => (
                    <Link
                      key={category.id}
                      href={`/products?category=${category.id}`}
                      onClick={() => setOpen(false)}
                      className="store-nav-link block break-words"
                    >
                      {category.name}
                    </Link>
                  ))}
                  {categories === null && (
                    <p className="text-sm text-muted">
                      Categorias temporariamente indisponíveis. Explore todos os
                      produtos.
                    </p>
                  )}
                  <Link
                    href="/account"
                    onClick={() => setOpen(false)}
                    className="store-nav-link block"
                  >
                    Minha conta
                  </Link>
                  <Link
                    href="/orders"
                    onClick={() => setOpen(false)}
                    className="store-nav-link block"
                  >
                    Meus pedidos
                  </Link>
                </nav>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
      <nav
        aria-label="Navegação principal"
        className="mx-auto mt-4 hidden max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-3 lg:flex"
      >
        <Link href="/products" className="store-nav-link">
          Todos os produtos
        </Link>
        {categories?.map((category) => (
          <Link
            key={category.id}
            href={`/products?category=${category.id}`}
            className="store-nav-link"
          >
            {category.name}
          </Link>
        ))}
      </nav>
    </header>
  );
}
