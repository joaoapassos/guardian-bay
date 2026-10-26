import { ProductCard, type ProductCardData } from "./product-card";
export function ProductGrid({
  products,
  returnTo,
  layout = "home",
}: {
  products: ProductCardData[];
  returnTo?: string;
  layout?: "home" | "catalog";
}) {
  return (
    <ul
      className={
        layout === "catalog"
          ? "catalog-product-grid"
          : "grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4"
      }
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} returnTo={returnTo} />
      ))}
    </ul>
  );
}
