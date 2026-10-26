"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import {
  createAddressAction,
  updateAddressAction,
} from "../actions/address.action";
import {
  type AddressDto,
  addressSnapshotSchema,
  brazilStates,
} from "../schemas/address";
import { PostalCodeInput } from "./postal-code-input";

const fields = [
  ["recipient", "Destinatário", 100, "name"],
  ["postalCode", "CEP", 9, "postal-code"],
  ["street", "Logradouro", 160, "address-line1"],
  ["number", "Número", 20, "off"],
  ["complement", "Complemento (opcional)", 100, "address-line2"],
  ["neighborhood", "Bairro", 100, "off"],
  ["city", "Cidade", 100, "address-level2"],
] as const;

export function AddressForm({
  address,
  onClose,
}: {
  address?: AddressDto;
  onClose: () => void;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof addressSnapshotSchema>>({
    defaultValues: address
      ? {
          recipient: address.recipient,
          postalCode: address.postalCode,
          street: address.street,
          number: address.number,
          complement: address.complement,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
          country: "BR",
        }
      : { country: "BR", complement: "" },
  });
  return (
    <form
      aria-label={address ? "Editar endereço" : "Cadastrar endereço"}
      noValidate
      aria-busy={isSubmitting}
      className="space-y-6 rounded-panel border border-line bg-surface p-5 sm:p-7"
      onSubmit={handleSubmit(async (values) => {
        setMessage("");
        // RHF stores only the intended fields; identifiers stay outside the form payload.
        const parsed = addressSnapshotSchema.safeParse(values);
        if (!parsed.success) {
          setMessage("Confira os campos informados.");
          return;
        }
        if (
          address &&
          Object.entries(parsed.data).every(
            ([key, value]) =>
              value === address[key as keyof typeof parsed.data],
          )
        ) {
          setMessage("Já está atualizado.");
          return;
        }
        try {
          const result = address
            ? await updateAddressAction({
                ...parsed.data,
                id: address.id,
                revision: address.revision,
              })
            : await createAddressAction(parsed.data);
          if (
            result.success &&
            "changed" in result &&
            result.changed === false
          ) {
            setMessage("Já está atualizado.");
          } else if (result.success) {
            onClose();
            router.refresh();
          } else if (result.code === "UNAUTHENTICATED")
            router.replace("/login?returnTo=%2Faccount%2Faddresses");
          else
            setMessage(
              result.code === "LIMIT_REACHED"
                ? "Você pode salvar até 20 endereços."
                : "Não foi possível salvar. Atualize a página e confira os dados.",
            );
        } catch {
          setMessage("Não foi possível salvar agora. Tente novamente.");
        }
      })}
    >
      <h2
        ref={heading}
        tabIndex={-1}
        className="font-editorial text-2xl text-coast"
      >
        {address ? "Editar endereço" : "Novo endereço"}
      </h2>
      <p className="text-sm text-muted">
        Endereço no Brasil. Todos os campos são obrigatórios, exceto
        complemento.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map(([key, label, maxLength, autoComplete]) => {
          const Input = key === "postalCode" ? PostalCodeInput : "input";
          return (
            <FormField
              key={key}
              id={`address-${key}`}
              label={label}
              error={errors[key]?.message}
            >
              <Input
                id={`address-${key}`}
                className="auth-input"
                maxLength={maxLength}
                autoComplete={autoComplete}
                inputMode={key === "postalCode" ? "numeric" : undefined}
                aria-invalid={!!errors[key]}
                aria-describedby={`address-${key}-error`}
                {...register(key, {
                  validate: (value) =>
                    addressSnapshotSchema.shape[key].safeParse(value).success ||
                    (key === "postalCode"
                      ? "Informe um CEP com 8 dígitos."
                      : `Confira o campo (até ${maxLength} caracteres).`),
                })}
              />
            </FormField>
          );
        })}
        <FormField
          id="address-state"
          label="Estado (UF)"
          error={errors.state?.message}
        >
          <select
            id="address-state"
            className="auth-input"
            autoComplete="address-level1"
            aria-invalid={!!errors.state}
            aria-describedby="address-state-error"
            {...register("state", {
              validate: (value) =>
                addressSnapshotSchema.shape.state.safeParse(value).success ||
                "Selecione uma UF.",
            })}
          >
            <option value="">Selecione</option>
            {brazilStates.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </FormField>
      </div>
      <input type="hidden" value="BR" {...register("country")} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando…" : "Salvar endereço"}
        </Button>
        <Button
          onClick={onClose}
          disabled={isSubmitting}
          className="bg-paper text-coast"
        >
          Cancelar
        </Button>
      </div>
      {message && <p role="alert">{message}</p>}
    </form>
  );
}
