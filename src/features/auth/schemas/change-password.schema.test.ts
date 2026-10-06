import { describe, expect, it } from "vitest";
import { changePasswordSchema } from "./change-password.schema";

describe("políticas distintas na troca de senha", () => {
  it("aceita senha atual legada curta e preserva espaços", () => {
    const value = {
      currentPassword: " old ",
      newPassword: " new passphrase 37 ",
    };
    expect(changePasswordSchema.parse(value)).toEqual(value);
  });
  it("exige política de criação para nova senha e limita inputs", () => {
    for (const value of [
      { currentPassword: "old", newPassword: "short" },
      { currentPassword: "x".repeat(129), newPassword: "new passphrase 37" },
      { currentPassword: "old", newPassword: "x".repeat(129) },
      {
        currentPassword: "old",
        newPassword: "new passphrase 37",
        userId: "forged",
      },
    ])
      expect(changePasswordSchema.safeParse(value).success).toBe(false);
  });
});
