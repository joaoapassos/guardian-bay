import { ProductCard, type ProductCardData } from "./product-card";
export function ProductGrid({
  products,
  returnTo,
}: {
  products: ProductCardData[];
  returnTo?: string;
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} returnTo={returnTo} />
      ))}
    </ul>
  );
}
