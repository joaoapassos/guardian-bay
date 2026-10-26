import type { UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import { FormField } from "@/components/forms/form-field";
import { PasswordField } from "@/components/forms/password-field";
import {
  authenticationPasswordSchema,
  type credentialSchema,
  emailSchema,
  registrationPasswordHelp,
  registrationPasswordSchema,
} from "../schemas/credential.schema";

export type CredentialInput = z.input<typeof credentialSchema>;

export function CredentialFields({
  form,
  mode,
}: {
  form: UseFormReturn<CredentialInput>;
  mode: "login" | "register";
}) {
  const {
    register,
    formState: { errors },
  } = form;
  const creating = mode === "register";
  return (
    <>
      <p className="text-sm text-muted">E-mail e senha são obrigatórios.</p>
      <FormField id="email" label="E-mail" error={errors.email?.message}>
        <input
          id="email"
          type="email"
          autoComplete="email"
          spellCheck={false}
          required
          maxLength={320}
          placeholder="voce@exemplo.com"
          aria-invalid={!!errors.email}
          aria-describedby="email-error"
          className="auth-input"
          {...register("email", {
            validate: (value) =>
              emailSchema.safeParse(value).success ||
              "Informe um e-mail válido.",
          })}
        />
      </FormField>
      <FormField
        id="password"
        label="Senha"
        help={
          creating
            ? registrationPasswordHelp
            : "Use sua senha atual. Você pode colar ou usar seu gerenciador de senhas."
        }
        error={errors.password?.message}
      >
        <PasswordField
          id="password"
          autoComplete={creating ? "new-password" : "current-password"}
          required
          maxLength={256}
          aria-invalid={!!errors.password}
          aria-describedby="password-help password-error"
          {...register("password", {
            validate: (value) =>
              (creating
                ? registrationPasswordSchema
                : authenticationPasswordSchema
              ).safeParse(value).success ||
              (creating
                ? registrationPasswordHelp
                : "Informe uma senha de até 128 caracteres."),
          })}
        />
      </FormField>
    </>
  );
}
