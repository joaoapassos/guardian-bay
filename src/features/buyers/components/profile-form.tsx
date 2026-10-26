"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { saveProfileAction } from "../actions/profile.action";
import { cpfSchema, optionalNameSchema } from "../schemas/buyer";
export function ProfileForm({
  name,
  cpfMask,
}: {
  name: string | null;
  cpfMask: string | null;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<{ name: string; cpf: string; removeCpf: boolean }>({
    defaultValues: { name: name ?? "", cpf: "", removeCpf: false },
  });
  return (
    <form
      aria-label="Atualizar perfil"
      noValidate
      className="mt-6 space-y-5"
      onSubmit={handleSubmit(async (values) => {
        if (
          (optionalNameSchema.parse(values.name) || null) === name &&
          !values.cpf &&
          (!values.removeCpf || !cpfMask)
        ) {
          setMessage("Já está atualizado.");
          return;
        }
        setMessage("");
        try {
          const result = await saveProfileAction({
            name: values.name,
            ...(values.cpf ? { cpf: values.cpf } : {}),
            removeCpf: values.removeCpf,
          });
          if (result.success) {
            if ("changed" in result && result.changed === false)
              setMessage("Já está atualizado.");
            else {
              setMessage("Perfil atualizado.");
              router.refresh();
            }
          } else
            setMessage(
              "Não foi possível atualizar. Confira seus dados e sua sessão.",
            );
        } catch {
          setMessage("Não foi possível atualizar agora.");
        } finally {
          resetField("cpf");
        }
      })}
    >
      <FormField
        id="profile-name"
        label="Nome (opcional)"
        error={errors.name?.message}
      >
        <input
          id="profile-name"
          className="auth-input"
          autoComplete="name"
          maxLength={100}
          aria-invalid={!!errors.name}
          aria-describedby="profile-name-error"
          {...register("name", {
            validate: (v) =>
              optionalNameSchema.safeParse(v).success || "Confira seu nome.",
          })}
        />
      </FormField>
      <p className="text-sm text-muted">
        CPF salvo: {cpfMask ?? "nenhum"}. O pedido mantém seus dados históricos
        mesmo se você alterar ou remover os dados do perfil.
      </p>
      <FormField
        id="profile-cpf"
        label="Novo CPF (opcional)"
        error={errors.cpf?.message}
      >
        <input
          id="profile-cpf"
          className="auth-input"
          inputMode="numeric"
          autoComplete="off"
          maxLength={14}
          aria-invalid={!!errors.cpf}
          aria-describedby="profile-cpf-error"
          {...register("cpf", {
            validate: (v) =>
              !v ||
              cpfSchema.safeParse(v).success ||
              "Confira os dígitos do CPF.",
          })}
        />
      </FormField>
      {cpfMask && (
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 size-5 accent-coast"
            {...register("removeCpf")}
          />
          Remover o CPF salvo do perfil
        </label>
      )}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Salvando…" : "Salvar perfil"}
      </Button>
      <output className="block text-sm" aria-live="polite">
        {message}
      </output>
    </form>
  );
}
