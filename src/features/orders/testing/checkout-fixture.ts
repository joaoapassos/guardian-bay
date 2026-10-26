// Regression fixtures for contracts written before buyer identity was required.
// Negative payload fields remain intact; new buyer-boundary tests use the raw Action.
import { checkoutAction as action } from "../actions/checkout.action";
import { createOrder as create } from "../server/create-order";
export const fixtureBuyer = {
  source: "new",
  name: "Comprador de teste",
  cpf: "52998224725",
  save: false,
} as const;
export const fixtureAddress = {
  recipient: "Pessoa de teste",
  postalCode: "12345678",
  street: "Rua de teste",
  number: "10",
  complement: "",
  neighborhood: "Centro",
  city: "São Paulo",
  state: "SP",
  country: "BR",
} as const;
export function checkoutAction(input: unknown, ...extra: unknown[]) {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const value = input as Record<string, unknown>;
    return action(
      {
        buyer: fixtureBuyer,
        ...(!value.addressId && !value.address
          ? { address: fixtureAddress }
          : {}),
        ...value,
      },
      ...extra,
    );
  }
  return action(input, ...extra);
}
export function createOrder(input: unknown) {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const value = input as Record<string, unknown>;
    return create({
      buyer: fixtureBuyer,
      ...(!value.addressId && !value.address
        ? { address: fixtureAddress }
        : {}),
      ...value,
    });
  }
  return create(input);
}
