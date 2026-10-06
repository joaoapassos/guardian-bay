"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
  return (
    <form
      aria-label={product ? `Editar produto ${product.name}` : "Criar produto"}
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
        if (
          product?.isPublished &&
          !fields.isPublished &&
          !window.confirm("Retirar este produto do catálogo público?")
        )
          return;
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
              : result.code === "CONFLICT"
                ? "O produto mudou. Atualize a página antes de editar."
                : "Não foi possível salvar o produto.",
          );
          if (result.success) router.refresh();
        } catch {
          setMessage("Não foi possível concluir agora.");
        } finally {
          setBusy(false);
        }
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
        type="submit"
        disabled={busy || !categories.length}
        className="rounded bg-teal-800 px-4 py-2 text-white"
      >
        {product ? "Salvar produto" : "Criar produto"}
      </button>
      <output className="block">{message}</output>
    </form>
  );
}
