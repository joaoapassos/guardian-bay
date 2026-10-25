"use client";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { removeAddressAction } from "../actions/address.action";
import type { AddressDto } from "../schemas/address";
import { AddressForm } from "./address-form";

export function AddressList({ addresses }: { addresses: AddressDto[] }) {
  const router = useRouter();
  const [editor, setEditor] = useState<AddressDto | "new" | null>(null);
  const [removing, setRemoving] = useState<AddressDto | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const removeTrigger = useRef<HTMLButtonElement | null>(null);
  return (
    <section aria-label="Seus endereços" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted">
          {addresses.length} de 20 endereços salvos.
        </p>
        <Button
          onClick={() => setEditor("new")}
          disabled={addresses.length >= 20 || editor !== null}
        >
          Adicionar endereço
        </Button>
      </div>
      {editor && (
        <AddressForm
          key={editor === "new" ? "new" : editor.id}
          address={editor === "new" ? undefined : editor}
          onClose={() => setEditor(null)}
        />
      )}
      {!addresses.length && (
        <div className="rounded-panel border border-line bg-surface p-7">
          <h2 className="font-editorial text-2xl text-coast">
            Nenhum endereço salvo
          </h2>
          <p className="mt-3 text-muted">
            Adicione seu endereço para selecioná-lo na finalização da compra.
          </p>
        </div>
      )}
      <ul className="grid gap-5 md:grid-cols-2">
        {addresses.map((address) => (
          <li
            key={address.id}
            className="min-w-0 break-words rounded-panel border border-line bg-surface p-5"
          >
            <h2 className="text-lg font-semibold">{address.recipient}</h2>
            <p className="mt-3">
              {address.street}, {address.number}
              {address.complement && ` — ${address.complement}`}
            </p>
            <p>
              {address.neighborhood} · {address.city}/{address.state}
            </p>
            <p>
              CEP {address.postalCode.slice(0, 5)}-{address.postalCode.slice(5)}{" "}
              · Brasil
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                className="bg-paper text-coast"
                onClick={() => setEditor(address)}
                disabled={editor !== null}
              >
                Editar
                <span className="sr-only">
                  {" "}
                  endereço de {address.recipient}
                </span>
              </Button>
              <Button
                className="bg-paper text-danger"
                onClick={(event) => {
                  removeTrigger.current = event.currentTarget;
                  setRemoving(address);
                }}
                disabled={pending}
              >
                Remover
                <span className="sr-only">
                  {" "}
                  endereço de {address.recipient}
                </span>
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <AlertDialog.Root
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open && !pending) setRemoving(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
          <AlertDialog.Content
            onCloseAutoFocus={(event) => {
              if (removeTrigger.current?.isConnected) {
                event.preventDefault();
                removeTrigger.current.focus();
              }
            }}
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-panel border border-line bg-paper p-6"
          >
            <AlertDialog.Title className="font-editorial text-2xl text-coast">
              Remover endereço?
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-3 text-muted">
              O endereço será removido da sua conta. Pedidos já realizados
              mantêm seus dados de entrega.
            </AlertDialog.Description>
            <div className="mt-6 flex flex-wrap gap-3">
              <AlertDialog.Cancel asChild>
                <Button className="bg-surface text-coast" disabled={pending}>
                  Cancelar
                </Button>
              </AlertDialog.Cancel>
              <Button
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    if (!removing) return;
                    setMessage("");
                    try {
                      const result = await removeAddressAction({
                        id: removing.id,
                        revision: removing.revision,
                      });
                      if (result.success) {
                        setRemoving(null);
                        router.refresh();
                      } else if (result.code === "UNAUTHENTICATED")
                        router.replace("/login");
                      else {
                        setRemoving(null);
                        setMessage(
                          "Não foi possível remover. Atualize a página e tente novamente.",
                        );
                      }
                    } catch {
                      setRemoving(null);
                      setMessage(
                        "Não foi possível remover agora. Tente novamente.",
                      );
                    }
                  })
                }
              >
                {pending ? "Removendo…" : "Remover"}
              </Button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
      {message && <p role="alert">{message}</p>}
    </section>
  );
}
