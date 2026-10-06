"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { manageCatalogAction } from "../actions/manage-catalog.action";

export function CategoryForm({
  category,
}: {
  category?: { id: string; name: string; revision: number };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <form
      aria-label={
        category ? `Editar categoria ${category.name}` : "Criar categoria"
      }
      aria-busy={busy}
      className="space-y-3 rounded border p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        const name = new FormData(event.currentTarget).get("name");
        setBusy(true);
        setMessage("");
        try {
          const result = await manageCatalogAction(
            category
              ? {
                  operation: "update-category",
                  id: category.id,
                  revision: category.revision,
                  name,
                }
              : { operation: "create-category", name },
          );
          setMessage(
            result.success
              ? "Categoria salva."
              : result.code === "RATE_LIMITED"
                ? "Muitas operações. Aguarde e tente novamente."
                : result.code === "CONFLICT"
                  ? "A categoria mudou. Atualize a página antes de editar."
                  : result.code === "FORBIDDEN"
                    ? "Acesso administrativo negado. Entre novamente."
                    : result.code === "INVALID_INPUT"
                      ? "Confira o nome da categoria."
                      : "Não foi possível salvar a categoria.",
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
        Nome da categoria
        <input
          name="name"
          required
          maxLength={80}
          defaultValue={category?.name ?? ""}
          className="block w-full border p-2"
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="rounded bg-teal-800 px-4 py-2 text-white"
      >
        {busy ? "Salvando…" : category ? "Salvar categoria" : "Criar categoria"}
      </button>
      <output aria-live="polite" className="block">
        {message}
      </output>
    </form>
  );
}
