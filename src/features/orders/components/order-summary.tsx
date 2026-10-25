export function OrderSummary({
  items,
  total,
  priceLabel = "Preço aceito",
}: {
  items: {
    productName: string;
    quantity: number;
    price: { formatted: string };
    subtotal: { formatted: string };
  }[];
  total: { formatted: string };
  priceLabel?: "Preço aceito" | "Preço atual";
}) {
  return (
    <section
      aria-label="Resumo do pedido"
      className="rounded-panel border border-line bg-surface p-5 sm:p-7"
    >
      <h2 className="font-editorial text-2xl text-coast">Resumo do pedido</h2>
      <ul className="mt-5 divide-y divide-line">
        {items.map((item, index) => (
          <li
            key={`${index}-${item.productName}`}
            className="grid gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div>
              <h3 className="break-words font-semibold">{item.productName}</h3>
              <p className="mt-2 text-sm text-muted">
                Quantidade: {item.quantity} · {priceLabel}:{" "}
                {item.price.formatted}
              </p>
            </div>
            <p className="font-semibold tabular-nums">
              <span className="sr-only">Subtotal: </span>
              {item.subtotal.formatted}
            </p>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-line pt-5">
        <span className="font-semibold">Total</span>
        <strong className="text-2xl tabular-nums text-coast">
          {total.formatted}
        </strong>
      </div>
    </section>
  );
}
