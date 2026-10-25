import Image from "next/image";
import type { productImage } from "../images";

export function ProductImage({
  image,
  size = "card",
}: {
  image: ReturnType<typeof productImage>;
  size?: "card" | "detail" | "thumbnail";
}) {
  return (
    <Image
      src="/images/products/product-fallback.webp"
      alt={`${image.alt}. Imagem de produto não definida; ilustração padrão.`}
      width={1200}
      height={1200}
      sizes="(max-width: 640px) 90vw, (max-width: 1024px) 40vw, 400px"
      className={`aspect-square w-full rounded-card object-contain ${size === "thumbnail" ? "max-w-24" : size === "detail" ? "max-w-md" : "max-w-xs"}`}
    />
  );
}
