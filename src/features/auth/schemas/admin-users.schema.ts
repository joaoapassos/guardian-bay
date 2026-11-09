import { z } from "zod";

export const adminUserChangeSchema = z.strictObject({
  userId: z.uuid(),
  role: z.enum(["customer", "admin"]),
});
export const adminUserQuerySchema = z.strictObject({
  role: z.enum(["", "customer", "admin"]).default(""),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  search: z.string().trim().max(100).default(""),
  sort: z.enum(["newest", "oldest"]).default("newest"),
  status: z.enum(["", "active", "suspended"]).default(""),
});
