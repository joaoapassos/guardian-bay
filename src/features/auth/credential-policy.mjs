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
export const authenticationPasswordSchema = z
  .string()
  .max(256)
  .pipe(
    z.string().refine((value) => {
      const length = [...value].length;
      return length >= 1 && length <= 128 && !/\p{Surrogate}/u.test(value);
    }),
  );
