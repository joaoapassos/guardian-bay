"use client";
import type { UseFormRegisterReturn } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";

export function CardValidityFields({
  id,
  expiry,
  cvv,
  expiryError,
  cvvError,
}: {
  id: string;
  expiry: UseFormRegisterReturn;
  cvv: UseFormRegisterReturn;
  expiryError?: string;
  cvvError?: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
      <FormField
        id={`${id}-expiry`}
        label="Validade (mês e ano)"
        error={expiryError}
      >
        <input
          {...expiry}
          id={`${id}-expiry`}
          type="month"
          className="auth-input min-w-0"
          autoComplete="off"
          min={new Date().toISOString().slice(0, 7)}
          max="2099-12"
          required
          aria-invalid={!!expiryError}
          aria-describedby={`${id}-expiry-error`}
        />
      </FormField>
      <FormField id={`${id}-cvv`} label="CVV" error={cvvError}>
        <input
          {...cvv}
          id={`${id}-cvv`}
          type="password"
          inputMode="numeric"
          className="auth-input min-w-0"
          autoComplete="off"
          placeholder="•••"
          maxLength={4}
          required
          aria-invalid={!!cvvError}
          aria-describedby={`${id}-cvv-error`}
        />
      </FormField>
    </div>
  );
}
