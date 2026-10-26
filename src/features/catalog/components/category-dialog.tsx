"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { CategoryForm } from "./category-form";
export function CategoryDialog({
  category,
}: {
  category?: { id: string; name: string; revision: number };
}) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setSaved(false);
      }}
    >
      <Dialog.Trigger className={category ? "auth-link" : "admin-action"}>
        {category ? `Editar ${category.name}` : "Nova categoria"}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay-strong" />
        <Dialog.Content className="admin-shell fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-panel border border-line bg-surface p-6 font-auth">
          <Dialog.Title className="font-editorial text-2xl text-coast">
            {category ? "Editar categoria" : "Nova categoria"}
          </Dialog.Title>
          <Dialog.Description className="my-4 text-sm text-muted">
            Use um nome claro para organizar os produtos.
          </Dialog.Description>
          <CategoryForm
            key={category?.revision ?? "new"}
            category={category}
            onSaved={() => {
              setSaved(true);
              setOpen(false);
            }}
          />
          <Dialog.Close className="auth-link mt-4">Fechar</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
      <output className="sr-only">{saved ? "Categoria salva." : ""}</output>
    </Dialog.Root>
  );
}
