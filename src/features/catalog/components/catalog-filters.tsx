"use client";
import * as Dialog from "@radix-ui/react-dialog";
import Form from "next/form";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export type CatalogCriteria = {
  query: string;
  category: string;
  sort: string;
  minPrice: string;
  maxPrice: string;
  availability: string;
};
export function CatalogFilters({
  criteria,
  categories,
}: {
  criteria: CatalogCriteria;
  categories: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const form = (prefix: string) => (
    <Form
      action="/products"
      onSubmit={() => setOpen(false)}
      className="space-y-5"
    >
      <div>
        <label htmlFor={`${prefix}-query`}>Pesquisar</label>
        <input
          className="auth-input mt-2"
          id={`${prefix}-query`}
          name="query"
          defaultValue={criteria.query}
          maxLength={100}
        />
      </div>
      <div>
        <label htmlFor={`${prefix}-category`}>Categoria</label>
        <select
          className="auth-input mt-2"
          id={`${prefix}-category`}
          name="category"
          defaultValue={criteria.category}
        >
          <option value="">Todas as categorias</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <fieldset>
        <legend className="text-sm font-semibold">Faixa de preço em R$</legend>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <label htmlFor={`${prefix}-min`} className="text-sm">
            Mínimo
            <input
              className="auth-input mt-2"
              id={`${prefix}-min`}
              name="minPrice"
              inputMode="decimal"
              pattern="[0-9]{1,8}([.,][0-9]{1,2})?"
              defaultValue={criteria.minPrice}
              placeholder="0,00"
            />
          </label>
          <label htmlFor={`${prefix}-max`} className="text-sm">
            Máximo
            <input
              className="auth-input mt-2"
              id={`${prefix}-max`}
              name="maxPrice"
              inputMode="decimal"
              pattern="[0-9]{1,8}([.,][0-9]{1,2})?"
              defaultValue={criteria.maxPrice}
              placeholder="Sem limite"
            />
          </label>
        </div>
      </fieldset>
      <div>
        <label htmlFor={`${prefix}-availability`}>Disponibilidade</label>
        <select
          className="auth-input mt-2"
          id={`${prefix}-availability`}
          name="availability"
          defaultValue={criteria.availability}
        >
          <option value="all">Todos os publicados</option>
          <option value="in-stock">Somente em estoque</option>
        </select>
      </div>
      <div>
        <label htmlFor={`${prefix}-sort`}>Ordenar por</label>
        <select
          className="auth-input mt-2"
          id={`${prefix}-sort`}
          name="sort"
          defaultValue={criteria.sort}
        >
          <option value="name">Nome</option>
          <option value="price-asc">Menor preço</option>
          <option value="price-desc">Maior preço</option>
        </select>
      </div>
      <Button type="submit" className="w-full">
        Aplicar filtros
      </Button>
      <Link
        href="/products"
        className="auth-link block text-center"
        onClick={() => setOpen(false)}
      >
        Limpar filtros
      </Link>
    </Form>
  );
  return (
    <>
      <aside
        aria-label="Filtros de produtos"
        className="store-panel hidden self-start lg:block"
      >
        <h2 className="mb-6 font-semibold">Encontre o essencial</h2>
        {form("catalog-desktop")}
      </aside>
      <div className="lg:hidden">
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger className="admin-action">
            Filtrar e ordenar
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
            <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-[min(92vw,400px)] overflow-y-auto bg-surface p-5 font-auth">
              <Dialog.Title className="mb-3 font-editorial text-2xl text-coast">
                Filtros de produtos
              </Dialog.Title>
              <Dialog.Description className="mb-5 text-sm text-muted">
                Aplique os critérios ou feche para manter a seleção atual.
              </Dialog.Description>
              <Dialog.Close className="auth-link mb-6">
                Cancelar e fechar
              </Dialog.Close>
              {form("catalog-mobile")}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </>
  );
}
