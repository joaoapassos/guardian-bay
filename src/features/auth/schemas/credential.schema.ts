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
export const passwordSchema = z
  .string()
  .max(256)
  .pipe(
    z.string().refine((value) => {
      const length = [...value].length;
      return length >= 15 && length <= 128 && !/\p{Surrogate}/u.test(value);
    }),
  );

export const credentialSchema = z.strictObject({
  email: emailSchema,
  password: passwordSchema,
});
