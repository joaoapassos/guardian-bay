import { argon2id } from "argon2";
export const passwordHashOptions = Object.freeze({
  type: argon2id,
  version: 0x13,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
  hashLength: 32,
});
