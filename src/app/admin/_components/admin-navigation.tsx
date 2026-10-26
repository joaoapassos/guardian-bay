"use client";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  ["/admin", "Dashboard"],
  ["/admin/catalog", "Produtos"],
  ["/admin/categories", "Categorias"],
  ["/admin/orders", "Pedidos"],
  ["/admin/audit", "Auditoria"],
] as const;
export function AdminNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const navigation = (
    <nav aria-label="Administração" className="flex h-full flex-col gap-2">
      <Link
        href="/admin"
        onClick={() => setOpen(false)}
        className="mb-6 font-editorial text-2xl font-extrabold text-coast"
      >
        GUARDIAN BAY
        <span className="mt-2 block font-auth text-xs font-semibold uppercase tracking-widest text-muted">
          Administração
        </span>
      </Link>
      {links.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          onClick={() => setOpen(false)}
          aria-current={
            (href === "/admin" ? pathname === href : pathname.startsWith(href))
              ? "page"
              : undefined
          }
          className="rounded-control px-4 py-3 text-muted hover:bg-paper aria-[current=page]:bg-coast aria-[current=page]:font-semibold aria-[current=page]:text-paper focus-visible:outline-2 focus-visible:outline-coast"
        >
          {label}
        </Link>
      ))}
      <div className="mt-8 space-y-4 border-t border-line pt-6">
        <Link href="/" className="auth-link block">
          Voltar à loja
        </Link>
      </div>
    </nav>
  );
  return (
    <>
      <aside className="hidden min-h-dvh border-r border-line bg-surface p-7 lg:block">
        {navigation}
      </aside>
      <div className="flex items-center justify-between border-b border-line bg-surface p-4 lg:hidden">
        <span className="font-editorial text-xl text-coast">
          Guardian Bay · Admin
        </span>
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger className="admin-action">Menu</Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay-strong" />
            <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-[min(90vw,320px)] overflow-auto bg-surface p-6">
              <Dialog.Title className="sr-only">
                Menu administrativo
              </Dialog.Title>
              <Dialog.Description className="sr-only">
                Navegue pelas áreas administrativas ou volte à loja.
              </Dialog.Description>
              <Dialog.Close className="mb-6 rounded border border-line px-3 py-2">
                Fechar menu
              </Dialog.Close>
              {navigation}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </>
  );
}
