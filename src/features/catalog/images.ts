import { z } from "zod";

export const imageKeySchema = z.enum(["lock", "shield"]);
export const catalogImages = { lock: "Cadeado", shield: "Escudo" } as const;

const mediaSchema = z
  .object({
    id: z.uuid(),
    origin: z.literal("upload"),
    width: z.number().int().min(1).max(20000),
    height: z.number().int().min(1).max(20000),
  })
  .refine((data) => data.width * data.height <= 20000000);
type ImageBase = {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
};
export type ProductImageDto =
  | { kind: "none"; key: "lock" | "shield" | null; alt: string }
  | (ImageBase & { kind: "upload" });

export function productImage(
  key: unknown,
  name: string,
  media?: unknown,
): ProductImageDto {
  const parsedMedia = mediaSchema.safeParse(media);
  if (parsedMedia.success) {
    const { id, origin, width, height } = parsedMedia.data;
    const base = { id, alt: name, width, height };
    if (origin === "upload")
      return { ...base, kind: "upload", src: `/media/products/${id}` };
  }
  const parsed = imageKeySchema.safeParse(key);
  return parsed.success
    ? { kind: "none", key: parsed.data, alt: `Sem imagem de ${name}` }
    : { kind: "none", key: null, alt: `Sem imagem de ${name}` };
}
