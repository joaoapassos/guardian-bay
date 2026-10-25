import Link from "next/link";
import type { productImage } from "../images";
import { ProductImage } from "./product-image";
import { ProductTransition } from "./product-transition";
export type ProductCardData = {
  id: string;
  name: string;
  category: string;
  inStock: boolean;
  price: { formatted: string };
  image: ReturnType<typeof productImage>;
};
export function ProductCard({
  product,
  returnTo,
}: {
  product: ProductCardData;
  returnTo?: string;
}) {
  return (
    <li className="min-w-0">
      <Link
        href={`/products/${product.id}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
        className="group block h-full rounded-card border border-line bg-surface p-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-coast sm:p-4"
      >
        <ProductTransition id={product.id}>
          <div className="overflow-hidden rounded-card bg-white">
            <ProductImage image={product.image} />
          </div>
        </ProductTransition>
        <p className="mt-4 text-xs text-muted">{product.category}</p>
        <h2 className="mt-1 break-words font-auth text-base font-semibold leading-snug text-ink group-hover:text-coast sm:text-lg">
          {product.name}
        </h2>
        <p className="mt-3 font-auth text-base font-semibold text-coast">
          {product.price.formatted}
        </p>
        <p className="mt-2 text-xs text-muted">
          {product.inStock ? "Disponível" : "Sem estoque no momento"}
        </p>
        <span className="mt-3 inline-block text-sm text-coast underline underline-offset-4">
          Ver detalhes
        </span>
      </Link>
    </li>
  );
}
