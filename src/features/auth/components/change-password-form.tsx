"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
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
      <div>
        <label htmlFor="currentPassword" className="block font-medium">
          Senha atual
        </label>
        <input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          maxLength={256}
          aria-invalid={!!errors.currentPassword}
          aria-describedby="current-password-error"
          className="mt-2 w-full rounded border border-zinc-400 px-3 py-2"
          {...register("currentPassword", {
            validate: (value) =>
              changePasswordSchema.shape.currentPassword.safeParse(value)
                .success || "Informe sua senha atual, até 128 caracteres.",
          })}
        />
        <p id="current-password-error" className="mt-2 text-red-700">
          {errors.currentPassword?.message}
        </p>
      </div>
      <div>
        <label htmlFor="newPassword" className="block font-medium">
          Nova senha
        </label>
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          maxLength={256}
          aria-invalid={!!errors.newPassword}
          aria-describedby="new-password-help new-password-error"
          className="mt-2 w-full rounded border border-zinc-400 px-3 py-2"
          {...register("newPassword", {
            validate: (value) =>
              changePasswordSchema.shape.newPassword.safeParse(value).success ||
              "Use entre 15 e 128 caracteres.",
          })}
        />
        <p id="new-password-help" className="mt-2 text-sm text-zinc-600">
          Use uma nova frase de 15 a 128 caracteres. Todas as sessões serão
          encerradas; entre novamente com a nova senha.
        </p>
        <p id="new-password-error" className="mt-2 text-red-700">
          {errors.newPassword?.message}
        </p>
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-teal-800 px-4 py-3 font-medium text-white disabled:opacity-60"
      >
        {isSubmitting ? "Processando…" : "Alterar senha"}
      </button>
      {message && (
        <output ref={feedback} tabIndex={-1} className="block">
          {message}
        </output>
      )}
    </form>
  );
}
