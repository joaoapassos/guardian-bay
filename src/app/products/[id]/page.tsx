import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AddToCartButton } from "@/features/cart/components/add-to-cart-button";
import { ProductImage } from "@/features/catalog/components/product-image";
import { readProduct } from "@/features/catalog/server/read-product";

export default async function ProductPage({
  params,
}: PageProps<"/products/[id]">) {
  await connection();
  const product = await readProduct((await params).id);
  if (!product) notFound();
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <Link href="/products">Voltar aos produtos</Link>
      <ProductImage image={product.image} />
      <h1 className="mt-6 text-3xl font-semibold">{product.name}</h1>
      <p>{product.category}</p>
      <p className="my-4 text-xl">{product.price.formatted}</p>
      <p className="whitespace-pre-wrap">{product.description}</p>
      <AddToCartButton productId={product.id} />
    </main>
  );
}
