import { z } from "zod";

export const emailSchema = z
  .string()
  .max(320)
  .trim()
  .pipe(
    z
      .string()
      .regex(/^[\x21-\x7e]+$/)
      .toLowerCase()
      .pipe(z.email().max(254)),
  );

// Preserve the password exactly; limit code units before counting code points.
export const authenticationPasswordSchema = z
  .string()
  .max(256)
  .pipe(
    z.string().refine((value) => {
      const length = [...value].length;
      return length >= 1 && length <= 128 && !/\p{Surrogate}/u.test(value);
    }),
  );

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
  email: emailSchema,
  password: registrationPasswordSchema,
});
