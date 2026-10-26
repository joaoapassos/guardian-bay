import "server-only";
import { productMedia } from "@/db/schema/product-media";

// Only these columns can cross into the public image DTO; storage stays private.
export const mediaSelection = {
  id: productMedia.id,
  origin: productMedia.origin,
  width: productMedia.width,
  height: productMedia.height,
};
