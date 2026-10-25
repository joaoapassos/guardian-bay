"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import type { AddressDto } from "@/features/addresses/schemas/address";
import { checkoutAction } from "../actions/checkout.action";

export function CheckoutConfirmation({
  checkoutKey,
  cards,
  addresses,
}: {
  checkoutKey: string;
  addresses: AddressDto[];
  cards: {
    id: string;
    last4: string;
    expiryMonth: number;
    expiryYear: number;
  }[];
}) {
  const [key] = useState(checkoutKey);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [method, setMethod] = useState(cards.length ? "CARD" : "PIX");
  const [cardId, setCardId] = useState(cards[0]?.id ?? "");
  const [addressId, setAddressId] = useState(addresses[0]?.id ?? "");
  return (
    <form
      aria-label="Confirmar checkout"
      aria-busy={pending}
      className="mt-8 space-y-6 rounded-panel border border-line bg-surface p-5 sm:p-7"
      action={() => {
        setMessage("");
        if (!addresses.some((address) => address.id === addressId)) {
          setMessage("Selecione um endereço de entrega.");
          return;
        }
        startTransition(async () => {
          try {
            const result = await checkoutAction({
              checkoutKey: key,
              addressId,
              payment: method === "CARD" ? { method, cardId } : { method },
            });
            if (result.success) router.push(`/orders/${result.orderId}`);
            else
              setMessage(
                result.code === "RATE_LIMITED"
                  ? "Muitas confirmações. Aguarde e tente novamente."
                  : result.code === "UNAUTHENTICATED"
                    ? "Sessão expirada. Entre novamente."
                    : result.code === "INVALID_CARD"
                      ? "Cartão indisponível ou vencido. Selecione outro."
                      : result.code === "INVALID_ADDRESS"
                        ? "Endereço indisponível. Confira seus endereços e recarregue o checkout."
                        : result.code === "EMPTY_CART"
                          ? "O carrinho está vazio. Volte ao catálogo."
                          : result.code === "OUT_OF_STOCK"
                            ? "Estoque insuficiente. Revise o carrinho."
                            : result.code === "UNAVAILABLE"
                              ? "Um produto está indisponível. Corrija o carrinho."
                              : "Confirmação inválida. Recarregue o checkout.",
              );
          } catch {
            setMessage(
              "Não foi possível confirmar. Tente novamente com esta mesma confirmação.",
            );
          }
        });
      }}
    >
      <h2 className="font-editorial text-2xl text-coast">
        Entrega e pagamento
      </h2>
      {addresses.length ? (
        <FormField id="checkout-address" label="Endereço de entrega no Brasil">
          <select
            id="checkout-address"
            className="auth-input"
            value={addressId}
            disabled={pending}
            required
            onChange={(event) => setAddressId(event.target.value)}
          >
            {addresses.map((address) => (
              <option key={address.id} value={address.id}>
                {address.recipient} — {address.street}, {address.number} ·{" "}
                {address.city}/{address.state} · {address.postalCode}
              </option>
            ))}
          </select>
        </FormField>
      ) : (
        <p>Adicione um endereço brasileiro antes de confirmar o pedido.</p>
      )}
      <Link href="/account/addresses" className="auth-link inline-block">
        Gerenciar endereços
      </Link>
      <p className="text-sm text-muted">
        Nenhum frete é calculado neste checkout simulado.
      </p>
      <FormField
        id="checkout-payment-method"
        label="Método de pagamento simulado"
      >
        <select
          id="checkout-payment-method"
          className="auth-input"
          value={method}
          disabled={pending}
          onChange={(event) => setMethod(event.target.value)}
        >
          <option value="CARD">Cartão fictício</option>
          <option value="PIX">Pix fictício</option>
          <option value="BOLETO">Boleto fictício</option>
        </select>
      </FormField>
      {method === "CARD" && (
        <FormField id="checkout-card" label="Cartão cadastrado">
          <select
            id="checkout-card"
            className="auth-input"
            value={cardId}
            disabled={pending}
            onChange={(event) => setCardId(event.target.value)}
          >
            <option value="">Selecione um cartão fictício</option>
            {cards.map((card) => (
              <option key={card.id} value={card.id}>
                TEST •••• {card.last4} —{" "}
                {String(card.expiryMonth).padStart(2, "0")}/{card.expiryYear}
              </option>
            ))}
          </select>
        </FormField>
      )}
      <p className="mt-3">
        Nenhum dinheiro será movimentado. Pix e boleto convertem o carrinho em
        pedido pendente, sem reservar estoque; disponibilidade será verificada
        na confirmação. Falhas e expiração não restauram o carrinho
        automaticamente.
      </p>
      <p className="text-sm text-muted">
        Ao confirmar, serão usados os preços vigentes. Os valores e a
        disponibilidade serão conferidos novamente; o carrinho não congela
        preços nem reserva estoque.
      </p>
      <Button
        type="submit"
        disabled={
          pending ||
          !addresses.some((address) => address.id === addressId) ||
          (method === "CARD" && !cards.some((card) => card.id === cardId))
        }
        aria-describedby="checkout-feedback"
      >
        Confirmar pedido simulado
      </Button>
      <output id="checkout-feedback" aria-live="polite" className="block mt-3">
        {pending ? "Confirmando pedido…" : message}
      </output>
    </form>
  );
}
