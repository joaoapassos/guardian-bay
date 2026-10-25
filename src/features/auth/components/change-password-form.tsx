"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { FormField } from "@/components/forms/form-field";
import { PasswordField } from "@/components/forms/password-field";
import { Button } from "@/components/ui/button";
import { changePasswordAction } from "../actions/change-password.action";
import { changePasswordSchema } from "../schemas/change-password.schema";

export function ChangePasswordForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const feedback = useRef<HTMLOutputElement>(null);
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof changePasswordSchema>>();
  useEffect(() => {
    if (message) feedback.current?.focus();
  }, [message]);
  return (
    <form
      noValidate
      className="mt-6 space-y-6"
      aria-busy={isSubmitting}
      onSubmit={handleSubmit(async (input) => {
        setMessage("");
        try {
          const result = await changePasswordAction(input);
          if (result.success || result.code === "UNAUTHENTICATED") {
            router.replace("/login");
            router.refresh();
          } else
            setMessage(
              result.code === "RATE_LIMITED"
                ? "Tente novamente mais tarde."
                : "Não foi possível alterar a senha com os dados informados.",
            );
        } catch {
          setMessage(
            "Não foi possível concluir agora. Tente novamente mais tarde.",
          );
        } finally {
          resetField("currentPassword");
          resetField("newPassword");
        }
      })}
    >
      <FormField
        id="currentPassword"
        label="Senha atual"
        error={errors.currentPassword?.message}
      >
        <PasswordField
          required
          id="currentPassword"
          autoComplete="current-password"
          maxLength={256}
          aria-invalid={!!errors.currentPassword}
          aria-describedby="currentPassword-error"
          className="auth-input"
          {...register("currentPassword", {
            validate: (value) =>
              changePasswordSchema.shape.currentPassword.safeParse(value)
                .success || "Informe sua senha atual, até 128 caracteres.",
          })}
        />
      </FormField>
      <FormField
        id="newPassword"
        label="Nova senha"
        error={errors.newPassword?.message}
        help="Use uma nova frase de 15 a 128 caracteres. Todas as sessões serão encerradas; entre novamente com a nova senha."
      >
        <PasswordField
          required
          id="newPassword"
          autoComplete="new-password"
          maxLength={256}
          aria-invalid={!!errors.newPassword}
          aria-describedby="newPassword-help newPassword-error"
          className="auth-input"
          {...register("newPassword", {
            validate: (value) =>
              changePasswordSchema.shape.newPassword.safeParse(value).success ||
              "Use entre 15 e 128 caracteres.",
          })}
        />
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Processando…" : "Alterar senha"}
      </Button>
      {message && (
        <output ref={feedback} tabIndex={-1} className="block">
          {message}
        </output>
      )}
    </form>
  );
}
