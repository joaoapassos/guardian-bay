import "server-only";
import { asc, eq } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "@/db";
import { categories } from "@/db/schema/categories";
import { products } from "@/db/schema/products";

export const readPublicCategories = cache(async () =>
  getDb()
    .selectDistinct({ id: categories.id, name: categories.name })
    .from(categories)
    .innerJoin(products, eq(products.categoryId, categories.id))
    .where(eq(products.isPublished, true))
    .orderBy(asc(categories.name), asc(categories.id))
    .limit(100),
);
