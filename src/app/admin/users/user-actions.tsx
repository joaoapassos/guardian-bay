"use client";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { changeUserRoleAction } from "@/features/auth/actions/change-user-role.action";
import { ManageUserForm } from "./manage-user-form";

export function UserActions({
  id,
  role,
  self,
  suspended,
  label,
}: {
  id: string;
  role: string;
  self: boolean;
  suspended: boolean;
  label: string;
}) {
  const [message, changeRole, pending] = useActionState(
    changeUserRoleAction,
    "",
  );
  const [operation, setOperation] = useState<
    "suspend" | "reactivate" | "revoke" | null
  >(null);
  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          className="admin-action"
          aria-label={`Ações de ${label}`}
        >
          Ações
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            className="z-50 rounded-control border border-line bg-paper p-2 shadow-sm"
          >
            <DropdownMenu.Item asChild>
              <Link
                className="block rounded-control px-3 py-2 outline-none data-highlighted:bg-surface"
                href={`/admin/users/${id}`}
              >
                Ver detalhes
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <Link
                className="block rounded-control px-3 py-2 outline-none data-highlighted:bg-surface"
                href={`/admin/users/${id}#pedidos`}
              >
                Ver pedidos
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <Link
                className="block rounded-control px-3 py-2 outline-none data-highlighted:bg-surface"
                href={`/admin/users/${id}#auditoria`}
              >
                Consultar auditoria
              </Link>
            </DropdownMenu.Item>
            {!self && (
              <DropdownMenu.Item
                className="cursor-pointer rounded-control px-3 py-2 outline-none data-highlighted:bg-surface"
                disabled={pending}
                onSelect={() => {
                  const form = new FormData();
                  form.set("userId", id);
                  form.set("role", role === "admin" ? "customer" : "admin");
                  startTransition(() => changeRole(form));
                }}
              >
                {pending
                  ? "Alterando cargo…"
                  : role === "admin"
                    ? "Remover administrador"
                    : "Tornar administrador"}
              </DropdownMenu.Item>
            )}
            {!self && (
              <>
                <DropdownMenu.Item
                  className="cursor-pointer rounded-control px-3 py-2 outline-none data-highlighted:bg-surface"
                  onSelect={() =>
                    setOperation(suspended ? "reactivate" : "suspend")
                  }
                >
                  {suspended ? "Reativar conta" : "Suspender conta"}
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="cursor-pointer rounded-control px-3 py-2 outline-none data-highlighted:bg-surface"
                  onSelect={() => setOperation("revoke")}
                >
                  Revogar sessões
                </DropdownMenu.Item>
              </>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <output
        aria-live="polite"
        className={message || pending ? "mt-2 block text-sm" : "sr-only"}
      >
        {pending ? "Alterando cargo…" : message}
      </output>
      <Dialog.Root
        open={operation !== null}
        onOpenChange={(value) => {
          if (!value) setOperation(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay-strong" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,480px)] -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-panel bg-paper p-6 shadow-sm">
            <Dialog.Title className="font-editorial text-2xl">
              {operation === "suspend"
                ? "Suspender conta"
                : operation === "reactivate"
                  ? "Reativar conta"
                  : "Revogar sessões"}
            </Dialog.Title>
            <Dialog.Description>
              {operation === "suspend"
                ? "A conta não poderá entrar e suas sessões serão encerradas."
                : operation === "reactivate"
                  ? "A conta poderá entrar novamente."
                  : "Todas as sessões da conta serão encerradas."}
            </Dialog.Description>
            {operation && <ManageUserForm id={id} operation={operation} />}
            <Dialog.Close className="admin-action">Fechar</Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
