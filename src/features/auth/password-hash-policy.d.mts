import type { HashOptions } from "argon2";
export const passwordHashOptions: Readonly<
  HashOptions & { type: 2; raw?: false }
>;
