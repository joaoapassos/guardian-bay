"use client";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { manageCatalogAction } from "../actions/manage-catalog.action";
import { catalogImages } from "../images";

type Product = {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  amount: number;
  currency: string;
  isPublished: boolean;
  revision: number;
  imageKey: string | null;
};
export function ProductForm({
  product,
  categories,
}: {
  product?: Product;
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState<Record<
    string,
    FormDataEntryValue | number | boolean | null
  > | null>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  async function save(
    fields: Record<string, FormDataEntryValue | number | boolean | null>,
  ) {
    setBusy(true);
    setMessage("");
    try {
      const result = await manageCatalogAction(
        product
          ? {
              operation: "update-product",
              id: product.id,
              revision: product.revision,
              ...fields,
            }
          : { operation: "create-product", ...fields },
      );
      setMessage(
        result.success
          ? "Produto salvo."
          : result.code === "RATE_LIMITED"
            ? "Muitas operações. Aguarde e tente novamente."
            : result.code === "CONFLICT"
              ? "O produto mudou. Atualize a página antes de editar."
              : result.code === "FORBIDDEN"
                ? "Acesso administrativo negado. Entre novamente."
                : result.code === "INVALID_INPUT"
                  ? "Confira os campos do produto."
                  : "Não foi possível salvar o produto.",
      );
      if (result.success) router.refresh();
    } catch {
      setMessage("Não foi possível concluir agora.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <form
        aria-label={
          product ? `Editar produto ${product.name}` : "Criar produto"
        }
        aria-busy={busy}
        className="space-y-3 rounded border p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          const form = new FormData(event.currentTarget);
          const fields = {
            name: form.get("name"),
            description: form.get("description"),
            categoryId: form.get("categoryId"),
            amount: Number(form.get("amount")),
            currency: "BRL",
            isPublished: form.has("isPublished"),
            imageKey: form.get("imageKey") || null,
          };
          if (product?.isPublished && !fields.isPublished) {
            setConfirmation(fields);
            return;
          }
          await save(fields);
        }}
      >
        <label className="block">
          Nome do produto
          <input
            name="name"
            required
            maxLength={120}
            defaultValue={product?.name ?? ""}
            className="block w-full border p-2"
          />
        </label>
        <label className="block">
          Descrição
          <textarea
            name="description"
            maxLength={2000}
            defaultValue={product?.description ?? ""}
            className="block w-full border p-2"
          />
        </label>
        <label className="block">
          Categoria
          <select
            name="categoryId"
            required
            defaultValue={product?.categoryId ?? ""}
            className="block w-full border p-2"
          >
            <option value="" disabled>
              Escolha uma categoria
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          Preço em centavos (BRL)
          <input
            name="amount"
            type="number"
            required
            min={1}
            max={2147483647}
            step={1}
            defaultValue={product?.amount}
            className="block w-full border p-2"
          />
        </label>
        <label className="block">
          Imagem
          <select
            name="imageKey"
            defaultValue={product?.imageKey ?? ""}
            className="block w-full border p-2"
          >
            <option value="">Sem imagem</option>
            {Object.keys(catalogImages).map((key) => (
              <option key={key} value={key}>
                {key === "lock" ? "Cadeado" : "Escudo"}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <input
            name="isPublished"
            type="checkbox"
            defaultChecked={product?.isPublished ?? false}
          />{" "}
          Publicado
        </label>
        <button
          ref={submitRef}
          type="submit"
          disabled={busy || !categories.length}
          className="rounded bg-teal-800 px-4 py-2 text-white"
        >
          {busy ? "Salvando…" : product ? "Salvar produto" : "Criar produto"}
        </button>
        <output aria-live="polite" className="block">
          {message}
        </output>
      </form>
      <AlertDialog.Root
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
          <AlertDialog.Content
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 space-y-4 rounded bg-white p-6 text-black"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              submitRef.current?.focus();
            }}
          >
            <AlertDialog.Title className="text-xl font-semibold">
              Despublicar produto?
            </AlertDialog.Title>
            <AlertDialog.Description>
              O produto sairá do catálogo público e ficará indisponível nos
              carrinhos existentes. Pedidos históricos serão preservados.
            </AlertDialog.Description>
            <div className="flex gap-4">
              <AlertDialog.Cancel className="rounded border p-2">
                Cancelar
              </AlertDialog.Cancel>
              <AlertDialog.Action
                className="rounded bg-red-800 p-2 text-white"
                onClick={() => {
                  const fields = confirmation;
                  setConfirmation(null);
                  if (fields) void save(fields);
                }}
              >
                Confirmar despublicação
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
