import "server-only";
import { eq } from "drizzle-orm";

import { z } from "zod";
import { users } from "@/db/schema/users";

import { withAuthenticatedTransaction } from "@/features/auth/server/with-session-transaction";
import { reserveAbuseBudget } from "@/lib/abuse/server";
import { sealPersonalData } from "@/lib/security/personal-data";
import { cpfSchema, optionalNameSchema } from "../schemas/buyer";

const schema = z
  .strictObject({
    name: optionalNameSchema,
    cpf: cpfSchema.optional(),
    removeCpf: z.boolean().optional(),
  })
  .refine((value) => !(value.cpf && value.removeCpf));
export async function saveProfile(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, code: "INVALID_INPUT" as const };
  const result = await withAuthenticatedTransaction(async (tx, userId) => {
    if (!(await reserveAbuseBudget(tx, userId, "profile.write")))
      return { success: false as const, code: "RATE_LIMITED" as const };
    const cpf = parsed.data.cpf;
    await tx
      .update(users)
      .set({
        name: parsed.data.name || null,
        ...(cpf
          ? {
              cpfEncrypted: sealPersonalData(cpf, `profile:${userId}`),
              cpfLast2: cpf.slice(-2),
            }
          : parsed.data.removeCpf
            ? { cpfEncrypted: null, cpfLast2: null }
            : {}),
      })
      .where(eq(users.id, userId));
    return { success: true as const };
  });

  return result;
}
