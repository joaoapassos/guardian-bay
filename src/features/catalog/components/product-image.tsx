import { ImageOff } from "lucide-react";
import Image from "next/image";
import type { productImage } from "../images";

export function ProductImage({
  image,
  size = "card",
}: {
  image: ReturnType<typeof productImage>;
  size?: "card" | "detail" | "thumbnail";
}) {
  if (image.kind !== "none")
    return (
      <figure
        className={`w-full ${size === "thumbnail" ? "max-w-24" : size === "detail" ? "max-w-md" : ""}`}
      >
        <Image
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          unoptimized
          sizes={
            size === "thumbnail"
              ? "96px"
              : size === "detail"
                ? "(max-width:768px) 100vw, 448px"
                : "(max-width:768px) 50vw, 360px"
          }
          className="aspect-square w-full rounded-card bg-surface-card object-contain"
        />
      </figure>
    );
  return (
    <div
      role="img"
      aria-label={`${image.alt.replace(/^Ilustração de /, "Produto: ")}. Fotografia de produto ainda não disponível.`}
      className={`flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-card bg-surface-card text-muted ${size === "thumbnail" ? "max-w-24" : size === "detail" ? "max-w-md" : "max-w-xs"}`}
    >
      <ImageOff
        aria-hidden="true"
        size={size === "thumbnail" ? 20 : 32}
        strokeWidth={1.25}
      />
      {size !== "thumbnail" && (
        <span className="text-sm">Foto indisponível</span>
      )}
    </div>
  );
}
