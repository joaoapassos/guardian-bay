import { z } from "zod";
import { optionalNameSchema } from "@/features/buyers/schemas/buyer";

import {
  authenticationPasswordSchema,
  emailSchema,
} from "../credential-policy.mjs";

export {
  authenticationPasswordSchema,
  emailSchema,
} from "../credential-policy.mjs";

export const passwordSchema = authenticationPasswordSchema.refine(
  (value) => [...value].length >= 15,
);

// Registration policy is stricter than verification of an existing credential.
export const registrationPasswordHelp =
  "Use de 15 a 128 caracteres, com letra minúscula, maiúscula, número e caractere especial. Espaços são preservados.";

export const registrationPasswordSchema = passwordSchema
  .refine((value) => /\p{Ll}/u.test(value), registrationPasswordHelp)
  .refine((value) => /\p{Lu}/u.test(value), registrationPasswordHelp)
  .refine((value) => /\p{Nd}/u.test(value), registrationPasswordHelp)
  .refine((value) => /[\p{P}\p{S}]/u.test(value), registrationPasswordHelp);

export const authenticationCredentialSchema = z.strictObject({
  email: emailSchema,
  password: authenticationPasswordSchema,
});

export const credentialSchema = z.strictObject({
  name: optionalNameSchema,
  email: emailSchema,
  password: registrationPasswordSchema,
});
