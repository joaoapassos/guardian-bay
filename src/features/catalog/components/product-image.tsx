import { ImageOff, LockKeyhole, ShieldCheck } from "lucide-react";
import type { productImage } from "../images";

export function ProductImage({
  image,
}: {
  image: ReturnType<typeof productImage>;
}) {
  const Icon =
    image.key === "lock"
      ? LockKeyhole
      : image.key === "shield"
        ? ShieldCheck
        : ImageOff;
  return (
    <div className="my-4 flex h-40 items-center justify-center rounded bg-teal-50 text-teal-800">
      <Icon size={80} aria-hidden={false} aria-label={image.alt} role="img" />
    </div>
  );
}
