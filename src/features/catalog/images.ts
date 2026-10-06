import { z } from "zod";

export const imageKeySchema = z.enum(["lock", "shield"]);
export const catalogImages = { lock: "Cadeado", shield: "Escudo" } as const;

export function productImage(key: unknown, name: string) {
  const parsed = imageKeySchema.safeParse(key);
  return parsed.success
    ? { key: parsed.data, alt: `Ilustração de ${name}` }
    : { key: null, alt: `Sem imagem de ${name}` };
}
