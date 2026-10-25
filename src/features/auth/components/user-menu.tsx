"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  ScrollText,
  ShieldCheck,
  Store,
  Tags,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useLogout } from "./use-logout";

const itemClass =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-3 py-2 text-sm text-ink outline-none data-highlighted:bg-paper data-highlighted:text-coast data-disabled:cursor-wait data-disabled:opacity-60";

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/catalog", label: "Produtos", icon: Package },
  { href: "/admin/categories", label: "Categorias", icon: Tags },
  { href: "/admin/orders", label: "Pedidos", icon: ClipboardList },
  { href: "/admin/audit", label: "Auditoria", icon: ScrollText },
];

export function UserMenu({
  label,
  canAccessAdmin,
  context = "store",
}: {
  label: string;
  canAccessAdmin: boolean;
  context?: "store" | "admin";
}) {
  const { logout, pending, message } = useLogout();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`Menu de usuário: ${label}`}
        className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-control border border-line px-3 py-2 text-coast hover:border-coast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coast"
      >
        <UserRound size={20} aria-hidden="true" />
        <span className="max-w-36 truncate sm:max-w-48">{label}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          aria-label={
            context === "admin"
              ? "Opções da conta administrativa"
              : "Opções da conta"
          }
          aria-busy={pending}
          className="user-menu z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] w-64 max-w-[calc(100vw-24px)] overflow-y-auto rounded-panel border border-line bg-surface p-2 font-auth shadow-sm"
        >
          <DropdownMenu.Label className="break-all px-3 py-2 text-xs text-muted">
            {label}
          </DropdownMenu.Label>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          {context === "admin" &&
            canAccessAdmin &&
            adminLinks.map(({ href, label: text, icon: Icon }) => (
              <DropdownMenu.Item key={href} asChild disabled={pending}>
                <Link href={href} className={itemClass}>
                  <Icon size={18} aria-hidden="true" />
                  {text}
                </Link>
              </DropdownMenu.Item>
            ))}
          {context === "admin" && (
            <DropdownMenu.Separator className="my-1 h-px bg-line" />
          )}
          <DropdownMenu.Item asChild disabled={pending}>
            <Link href="/account" className={itemClass}>
              <UserRound size={18} aria-hidden="true" />
              Meu perfil
            </Link>
          </DropdownMenu.Item>
          {context === "store" && (
            <DropdownMenu.Item asChild disabled={pending}>
              <Link href="/orders" className={itemClass}>
                <Package size={18} aria-hidden="true" />
                Meus pedidos
              </Link>
            </DropdownMenu.Item>
          )}
          {canAccessAdmin && context === "store" && (
            <DropdownMenu.Item asChild disabled={pending}>
              <Link href="/admin" className={itemClass}>
                <ShieldCheck size={18} aria-hidden="true" />
                Administração
              </Link>
            </DropdownMenu.Item>
          )}
          {context === "admin" && (
            <DropdownMenu.Item asChild disabled={pending}>
              <Link href="/" className={itemClass}>
                <Store size={18} aria-hidden="true" />
                Voltar à loja
              </Link>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item
            disabled={pending}
            className={itemClass}
            onSelect={(event) => {
              event.preventDefault();
              void logout();
            }}
          >
            <LogOut size={18} aria-hidden="true" />
            {pending ? "Saindo…" : "Sair"}
          </DropdownMenu.Item>
          <output
            aria-live="polite"
            className={
              message ? "block px-3 py-2 text-sm text-danger" : "sr-only"
            }
          >
            {message || (pending ? "Saindo da conta…" : "")}
          </output>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
