"use client";
import Link from "next/link";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { CardNumberInput } from "@/features/payments/components/card-number-input";
import { CardValidityFields } from "@/features/payments/components/card-validity-fields";
import {
  cardExpirySchema,
  cardNumberSchema,
  isCardExpired,
  type PaymentMethodDto,
} from "@/features/payments/schemas/card";
import type { CheckoutFormValues } from "./checkout-form-values";

export function CheckoutCardFields({
  cards,
  paymentMethodId,
  onCardChange,
  register,
  errors,
}: {
  cards: PaymentMethodDto[];
  paymentMethodId: string;
  onCardChange: (id: string) => void;
  register: UseFormRegister<CheckoutFormValues>;
  errors: FieldErrors<CheckoutFormValues>;
}) {
  return (
    <div className="space-y-5">
      <FormField id="checkout-card" label="Cartão para a simulação">
        <select
          id="checkout-card"
          className="auth-input"
          value={paymentMethodId}
          onChange={(event) => onCardChange(event.target.value)}
        >
          <option value="">Informar um cartão para este pedido</option>
          {cards.map((card) => (
            <option
              key={card.id}
              value={card.id}
              disabled={isCardExpired(card.expiryMonth, card.expiryYear)}
            >
              {card.brand} · final {card.last4} ·{" "}
              {String(card.expiryMonth).padStart(2, "0")}/{card.expiryYear}
              {isCardExpired(card.expiryMonth, card.expiryYear)
                ? " · expirado"
                : ""}
            </option>
          ))}
        </select>
      </FormField>
      {!paymentMethodId && (
        <>
          <p className="text-sm text-muted">
            Use somente um número de teste Visa, Mastercard ou American Express.
            Todos os campos são obrigatórios.
          </p>
          <FormField
            id="checkout-card-number"
            label="Número do cartão"
            error={errors.card?.number?.message}
          >
            <CardNumberInput
              id="checkout-card-number"
              className="auth-input"
              autoComplete="off"
              required
              aria-invalid={!!errors.card?.number}
              aria-describedby="checkout-card-number-error"
              {...register("card.number", {
                validate: (value) =>
                  cardNumberSchema.safeParse(value).success ||
                  "Informe um número válido Visa, Mastercard ou American Express.",
              })}
            />
          </FormField>
          <CardValidityFields
            id="checkout-card"
            expiry={register("card.expiry", {
              validate: (value) => {
                const result = cardExpirySchema.safeParse(value);
                return result.success || result.error.issues[0].message;
              },
            })}
            cvv={register("card.cvv")}
            expiryError={errors.card?.expiry?.message}
            cvvError={errors.card?.cvv?.message}
          />
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-coast"
              {...register("saveCard")}
            />
            <span>
              Salvar bandeira, final e validade para próximas simulações.
            </span>
          </label>
        </>
      )}
      <Link href="/account/payment-methods" className="auth-link inline-block">
        Gerenciar formas de pagamento
      </Link>
    </div>
  );
}
