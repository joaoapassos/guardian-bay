"use client";
import Link from "next/link";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { PostalCodeInput } from "@/features/addresses/components/postal-code-input";
import {
  type AddressDto,
  addressSnapshotSchema,
  brazilStates,
} from "@/features/addresses/schemas/address";
import type { CheckoutFormValues } from "./checkout-form-values";

const fields = [
  ["recipient", "Destinatário", 100, "name"],
  ["postalCode", "CEP", 9, "postal-code"],
  ["street", "Logradouro", 160, "address-line1"],
  ["number", "Número", 20, "off"],
  ["complement", "Complemento (opcional)", 100, "address-line2"],
  ["neighborhood", "Bairro", 100, "off"],
  ["city", "Cidade", 100, "address-level2"],
] as const;

export function CheckoutAddressFields({
  addresses,
  addressId,
  onAddressChange,
  register,
  errors,
}: {
  addresses: AddressDto[];
  addressId: string;
  onAddressChange: (id: string) => void;
  register: UseFormRegister<CheckoutFormValues>;
  errors: FieldErrors<CheckoutFormValues>;
}) {
  return (
    <fieldset className="space-y-5">
      <legend className="mb-4 font-editorial text-2xl text-coast">
        Endereço de entrega
      </legend>
      <FormField id="checkout-address" label="Endereço no Brasil">
        <select
          id="checkout-address"
          className="auth-input"
          value={addressId}
          onChange={(event) => onAddressChange(event.target.value)}
        >
          <option value="">Informar um endereço para este pedido</option>
          {addresses.map((address) => (
            <option key={address.id} value={address.id}>
              {address.recipient} — {address.street}, {address.number} ·{" "}
              {address.city}/{address.state}
            </option>
          ))}
        </select>
      </FormField>
      {!addressId && (
        <>
          <p className="text-sm text-muted">
            Todos os campos são obrigatórios, exceto complemento.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {fields.map(([name, label, maxLength, autoComplete]) => {
              const Input = name === "postalCode" ? PostalCodeInput : "input";
              return (
                <FormField
                  key={name}
                  id={`checkout-address-${name}`}
                  label={label}
                  error={errors.address?.[name]?.message}
                >
                  <Input
                    id={`checkout-address-${name}`}
                    className="auth-input"
                    maxLength={maxLength}
                    autoComplete={autoComplete}
                    inputMode={name === "postalCode" ? "numeric" : undefined}
                    required={name !== "complement"}
                    aria-invalid={!!errors.address?.[name]}
                    aria-describedby={`checkout-address-${name}-error`}
                    {...register(`address.${name}`, {
                      validate: (value) =>
                        addressSnapshotSchema.shape[name].safeParse(value)
                          .success ||
                        (name === "postalCode"
                          ? "Informe um CEP com 8 dígitos."
                          : `Confira este campo (até ${maxLength} caracteres).`),
                    })}
                  />
                </FormField>
              );
            })}
            <FormField
              id="checkout-address-state"
              label="Estado (UF)"
              error={errors.address?.state?.message}
            >
              <select
                id="checkout-address-state"
                className="auth-input"
                autoComplete="address-level1"
                required
                aria-invalid={!!errors.address?.state}
                aria-describedby="checkout-address-state-error"
                {...register("address.state", {
                  validate: (value) =>
                    addressSnapshotSchema.shape.state.safeParse(value)
                      .success || "Selecione uma UF.",
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
          <input type="hidden" value="BR" {...register("address.country")} />
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-coast"
              {...register("saveAddress")}
            />
            <span>Salvar este endereço na minha conta.</span>
          </label>
        </>
      )}
      <p className="text-sm text-muted">
        Entrega no Brasil. Nenhum frete é calculado neste checkout simulado.
      </p>
      <Link href="/account/addresses" className="auth-link inline-block">
        Gerenciar endereços
      </Link>
    </fieldset>
  );
}
