import Link from "next/link";
import { redirect } from "next/navigation";
import { CartItemControls } from "@/features/cart/components/cart-item-controls";
import { readCart } from "@/features/cart/server/read-cart";
import { ProductImage } from "@/features/catalog/components/product-image";

export default async function CartPage() {
  const result = await readCart();
  if (!result.success) redirect("/login");
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <h1 className="mb-6 text-3xl font-semibold">Carrinho</h1>
      <p className="mb-6">
        Preços atuais do catálogo. O carrinho não reserva estoque nem congela
        preços.
      </p>
      {result.items.length === 0 ? (
        <p>
          Seu carrinho está vazio. <Link href="/products">Ver produtos</Link>
        </p>
      ) : (
        <ul className="grid gap-6">
          {result.items.map((item) => (
            <li
              key={item.productId}
              className="rounded border border-zinc-300 p-5"
            >
              <ProductImage image={item.image} />
              <h2 className="text-xl font-semibold">
                {item.available ? (
                  <Link href={`/products/${item.productId}`}>{item.name}</Link>
                ) : (
                  item.name
                )}
              </h2>
              <p>
                Preço atual: {item.price.formatted}
                {!item.available && " (referência)"}
              </p>
              <p>Quantidade: {item.quantity}</p>
              {item.subtotal ? (
                <p>Subtotal: {item.subtotal.formatted}</p>
              ) : (
                <p>Produto indisponível. Não incluído no total.</p>
              )}
              <CartItemControls
                productId={item.productId}
                quantity={item.quantity}
                available={item.available}
              />
            </li>
          ))}
        </ul>
      )}
      {result.items.length > 0 && (
        <Link href="/checkout" className="mt-6 block underline">
          Revisar checkout
        </Link>
      )}
      <p className="mt-8 text-xl font-semibold">
        Total dos itens disponíveis: {result.total.formatted}
      </p>
    </main>
  );
}
