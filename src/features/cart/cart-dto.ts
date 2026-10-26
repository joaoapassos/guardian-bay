import type { productImage } from "@/features/catalog/images";
import type { priceDto } from "@/lib/money/price";

export type CartDto = {
  success: true;
  items: {
    productId: string;
    name: string;
    quantity: number;
    available: boolean;
    availableQuantity: number;
    stockSufficient: boolean;
    price: ReturnType<typeof priceDto>;
    image: ReturnType<typeof productImage>;
    subtotal: ReturnType<typeof priceDto> | null;
  }[];
  total: ReturnType<typeof priceDto>;
};
