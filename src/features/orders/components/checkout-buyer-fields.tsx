"use client";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { buyerSchema } from "@/features/buyers/schemas/buyer";
import type {
  CheckoutBuyerProfile,
  CheckoutFormValues,
} from "./checkout-form-values";

export function CheckoutBuyerFields({
  profile,
  source,
  onSourceChange,
  register,
  errors,
}: {
  profile: CheckoutBuyerProfile;
  source: "new" | "saved";
  onSourceChange: (source: "new" | "saved") => void;
  register: UseFormRegister<CheckoutFormValues>;
  errors: FieldErrors<CheckoutFormValues>;
}) {
  return (
    <fieldset className="space-y-5">
      <legend className="mb-4 font-editorial text-2xl text-coast">
        Dados do comprador
      </legend>
      {profile.name && profile.cpfMask && (
        <FormField id="checkout-buyer-source" label="Dados para este pedido">
          <select
            id="checkout-buyer-source"
            className="auth-input"
            value={source}
            onChange={(event) =>
              onSourceChange(event.target.value === "saved" ? "saved" : "new")
            }
          >
            <option value="saved">Usar dados salvos</option>
            <option value="new">Informar outros dados</option>
          </select>
        </FormField>
      )}
      {source === "saved" ? (
        <p>
          {profile.name} · CPF {profile.cpfMask}
        </p>
      ) : (
        <>
          <p className="text-sm text-muted">
            Nome e CPF são obrigatórios para este pedido simulado.
          </p>
          <FormField
            id="checkout-buyer-name"
            label="Nome completo"
            error={errors.buyer?.name?.message}
          >
            <input
              id="checkout-buyer-name"
              className="auth-input"
              autoComplete="name"
              maxLength={100}
              required
              aria-invalid={!!errors.buyer?.name}
              aria-describedby="checkout-buyer-name-error"
              {...register("buyer.name", {
                validate: (value) =>
                  buyerSchema.shape.name.safeParse(value).success ||
                  "Informe seu nome completo (até 100 caracteres).",
              })}
            />
          </FormField>
          <FormField
            id="checkout-buyer-cpf"
            label="CPF"
            help="11 dígitos, com ou sem pontos e hífen."
            error={errors.buyer?.cpf?.message}
          >
            <input
              id="checkout-buyer-cpf"
              className="auth-input"
              inputMode="numeric"
              autoComplete="off"
              maxLength={14}
              required
              aria-invalid={!!errors.buyer?.cpf}
              aria-describedby="checkout-buyer-cpf-help checkout-buyer-cpf-error"
              {...register("buyer.cpf", {
                validate: (value) =>
                  buyerSchema.shape.cpf.safeParse(value).success ||
                  "Confira os 11 dígitos do CPF.",
              })}
            />
          </FormField>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-coast"
              {...register("buyer.save")}
            />
            <span>
              Salvar nome e CPF protegido no meu perfil para próximas compras.
            </span>
          </label>
        </>
      )}
    </fieldset>
  );
}
