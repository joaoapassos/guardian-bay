import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { getDb } from "@/db";
import { hashPassword } from "@/features/auth/server/password";
import { createSession } from "@/features/auth/server/session";
import { readBuyerProfile } from "@/features/buyers/server/buyer-profile";
import {
  openPersonalData,
  sealPersonalData,
} from "@/lib/security/personal-data";
import { checkoutAction } from "../actions/checkout.action";
import { orderDetail } from "./order-detail";

vi.mock("server-only", () => ({}));
const request = vi.hoisted(() => ({ token: "" }));
vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({ origin: "http://localhost:3000", host: "localhost:3000" }),
  cookies: async () => ({ get: () => ({ value: request.token }) }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const value = process.env.TEST_DATABASE_URL;
if (
  !value ||
  !["postgres:", "postgresql:"].includes(new URL(value).protocol) ||
  new URL(value).pathname !== "/guardian_bay_test" ||
  !["127.0.0.1", "localhost", "[::1]"].includes(new URL(value).hostname) ||
  (process.env.DATABASE_URL &&
    new URL(process.env.DATABASE_URL).pathname === new URL(value).pathname)
)
  throw new Error("Dedicated local test database required");
const client = postgres(value, { max: 1, onnotice: () => {} });
let userId: string;
let otherId: string;
let productId: string;
let categoryId: string;
let originalProfile: string;
const originalCpf = "11144477735";
const buyer = {
  source: "new",
  name: "Ana Compradora",
  cpf: "529.982.247-25",
  save: false,
};
const card = { number: "4111111111111111", expiryMonth: 12, expiryYear: 2099 };
const address = {
  recipient: "Ana Compradora",
  postalCode: "12345-678",
  street: "Rua do Teste",
  number: "12",
  complement: "",
  neighborhood: "Centro",
  city: "São Paulo",
  state: "SP",
  country: "BR",
};
const input = (save = false) => ({
  checkoutKey: randomUUID(),
  buyer: { ...buyer, save },
  address,
  saveAddress: save,
  payment: { method: "CARD", card, save },
});

async function cleanup() {
  await client`DELETE FROM audit_events WHERE actor_user_id IN (${userId},${otherId})`;
  await client`DELETE FROM order_payments WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (${userId},${otherId}))`;
  await client`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (${userId},${otherId}))`;
  await client`DELETE FROM orders WHERE user_id IN (${userId},${otherId})`;
  await client`DELETE FROM cart_items WHERE user_id IN (${userId},${otherId})`;
  await client`DELETE FROM addresses WHERE user_id IN (${userId},${otherId})`;
  await client`DELETE FROM saved_payment_methods WHERE user_id IN (${userId},${otherId})`;
  await client`DELETE FROM abuse_budgets WHERE user_id IN (${userId},${otherId})`;
  await client`DELETE FROM sessions WHERE user_id IN (${userId},${otherId})`;
}
beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", value);
  vi.stubEnv("BUYER_DATA_ACTIVE_KEY_ID", "test");
  vi.stubEnv(
    "BUYER_DATA_KEYS",
    JSON.stringify({ test: Buffer.alloc(32, 7).toString("base64") }),
  );
  const hash = await hashPassword("Buyer checkout integration passphrase");
  const rows =
    await client`INSERT INTO users(email,password_hash) VALUES (${`${randomUUID()}@buyer-checkout.example.test`},${hash}),(${`${randomUUID()}@buyer-checkout.example.test`},${hash}) RETURNING id`;
  [userId, otherId] = rows.map((row) => row.id);
  const [category] =
    await client`INSERT INTO categories(name) VALUES (${`Buyer checkout ${randomUUID()}`}) RETURNING id`;
  categoryId = category.id;
  const [product] =
    await client`INSERT INTO products(name,category_id,amount,is_published) VALUES ('Buyer checkout fixture',${categoryId},1099,true) RETURNING id`;
  productId = product.id;
  await client`INSERT INTO inventory(product_id,available_quantity) VALUES (${productId},99)`;
});
beforeEach(async () => {
  await cleanup();
  originalProfile = sealPersonalData(originalCpf, `profile:${userId}`);
  await client`UPDATE users SET name='Perfil anterior',cpf_encrypted=${originalProfile},cpf_last2='35' WHERE id=${userId}`;
  await client`UPDATE products SET amount=1099,is_published=true WHERE id=${productId}`;
  await client`UPDATE inventory SET available_quantity=99,revision=1 WHERE product_id=${productId}`;
  request.token = (await createSession(userId)).token;
  await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${userId},${productId},2)`;
});
afterAll(async () => {
  await cleanup();
  await client`DELETE FROM users WHERE id IN (${userId},${otherId})`;
  await client`DELETE FROM inventory WHERE product_id=${productId}`;
  await client`DELETE FROM products WHERE id=${productId}`;
  await client`DELETE FROM categories WHERE id=${categoryId}`;
  await client.end();
  await getDb().$client.end();
  vi.unstubAllEnvs();
});

async function expectProfileUnchanged() {
  const [profile] =
    await client`SELECT name,cpf_encrypted FROM users WHERE id=${userId}`;
  expect(profile).toEqual({
    name: "Perfil anterior",
    cpf_encrypted: originalProfile,
  });
}
async function expectNoPurchase() {
  expect(
    await client`SELECT id FROM orders WHERE user_id=${userId}`,
  ).toHaveLength(0);
  const [stock] =
    await client`SELECT available_quantity FROM inventory WHERE product_id=${productId}`;
  expect(stock.available_quantity).toBe(99);
  const [cart] =
    await client`SELECT quantity FROM cart_items WHERE user_id=${userId} AND product_id=${productId}`;
  expect(cart.quantity).toBe(2);
}

it("one-time buyer, address and card create encrypted snapshots without saving account data", async () => {
  const result = await checkoutAction(input());
  expect(result).toMatchObject({ success: true, status: "PAID" });
  if (!result.success) throw new Error("Expected successful checkout");
  await expectProfileUnchanged();
  expect(
    await client`SELECT id FROM addresses WHERE user_id=${userId}`,
  ).toHaveLength(0);
  expect(
    await client`SELECT id FROM saved_payment_methods WHERE user_id=${userId}`,
  ).toHaveLength(0);
  const [stored] =
    await client`SELECT buyer_name,buyer_cpf_encrypted,buyer_cpf_last2,shipping_address FROM orders WHERE id=${result.orderId}`;
  expect(stored.buyer_name).toBe(buyer.name);
  expect(stored.buyer_cpf_last2).toBe("25");
  expect(stored.buyer_cpf_encrypted).toMatch(/^v1\./);
  expect(stored.buyer_cpf_encrypted).not.toContain("52998224725");
  expect(
    openPersonalData(
      stored.buyer_cpf_encrypted,
      `order:${userId}:${result.orderId}`,
    ),
  ).toBe("52998224725");
  expect(stored.shipping_address).toEqual({
    ...address,
    postalCode: "12345678",
  });
  const detail = await orderDetail(result.orderId);
  expect(detail).toMatchObject({
    success: true,
    order: { buyer: { name: buyer.name, cpfMask: "•••.•••.•••-25" } },
  });
  expect(JSON.stringify(detail)).not.toContain("52998224725");
  expect(JSON.stringify(detail)).not.toContain(card.number);
  const [payment] =
    await client`SELECT card_brand,card_last4 FROM order_payments WHERE order_id=${result.orderId}`;
  expect(payment).toEqual({ card_brand: "VISA", card_last4: "1111" });
});

it("opt-in saves all three kinds of data atomically and replay creates no duplicates", async () => {
  const payload = input(true);
  const result = await checkoutAction(payload);
  expect(result).toMatchObject({ success: true, status: "PAID" });
  if (!result.success) throw new Error("Expected successful checkout");
  expect(await checkoutAction(payload)).toEqual(result);
  const [profile] =
    await client`SELECT name,cpf_encrypted,cpf_last2 FROM users WHERE id=${userId}`;
  expect(profile.name).toBe(buyer.name);
  expect(profile.cpf_last2).toBe("25");
  expect(openPersonalData(profile.cpf_encrypted, `profile:${userId}`)).toBe(
    "52998224725",
  );
  expect(await readBuyerProfile()).toMatchObject({
    name: buyer.name,
    cpfMask: "•••.•••.•••-25",
  });
  for (const table of ["addresses", "saved_payment_methods", "orders"]) {
    const [count] =
      await client`SELECT count(*)::int AS n FROM ${client(table)} WHERE user_id=${userId}`;
    expect(count.n).toBe(1);
  }
  const [stock] =
    await client`SELECT available_quantity FROM inventory WHERE product_id=${productId}`;
  expect(stock.available_quantity).toBe(97);
});

it("requires buyer and shipping address and rejects invalid CPF/Luhn before purchase", async () => {
  const { buyer: _buyer, ...withoutBuyer } = input();
  const { address: _address, ...withoutAddress } = input();
  for (const payload of [
    withoutBuyer,
    withoutAddress,
    { ...input(), buyer: { ...buyer, cpf: "52998224724" } },
    {
      ...input(),
      payment: {
        method: "CARD",
        card: { ...card, number: "4111111111111112" },
        save: false,
      },
    },
  ]) {
    expect(await checkoutAction(payload)).toEqual({
      success: false,
      code: "INVALID_INPUT",
    });
  }
  await expectNoPurchase();
});

it("does not accept another user's saved payment metadata", async () => {
  const [foreign] =
    await client`INSERT INTO saved_payment_methods(user_id,brand,last4,expiry_month,expiry_year) VALUES (${otherId},'VISA','1111',12,2099) RETURNING id`;
  expect(
    await checkoutAction({
      ...input(),
      payment: { method: "CARD", paymentMethodId: foreign.id },
    }),
  ).toEqual({ success: false, code: "INVALID_CARD" });
  await expectNoPurchase();
  await expectProfileUnchanged();
});

it("rolls back the order, inventory and all opt-ins when the saved card cap is full", async () => {
  for (let index = 0; index < 3; index++)
    await client`INSERT INTO saved_payment_methods(user_id,brand,last4,expiry_month,expiry_year) VALUES (${userId},'VISA','1111',12,2099)`;
  expect(await checkoutAction(input(true))).toEqual({
    success: false,
    code: "LIMIT_REACHED",
  });
  await expectNoPurchase();
  await expectProfileUnchanged();
  expect(
    await client`SELECT id FROM addresses WHERE user_id=${userId}`,
  ).toHaveLength(0);
  expect(
    await client`SELECT id FROM saved_payment_methods WHERE user_id=${userId}`,
  ).toHaveLength(3);
});

it("an invalid cart does not save any requested buyer, address or card data", async () => {
  await client`UPDATE inventory SET available_quantity=0 WHERE product_id=${productId}`;
  expect(await checkoutAction(input(true))).toEqual({
    success: false,
    code: "OUT_OF_STOCK",
  });
  await expectProfileUnchanged();
  expect(
    await client`SELECT id FROM addresses WHERE user_id=${userId}`,
  ).toHaveLength(0);
  expect(
    await client`SELECT id FROM saved_payment_methods WHERE user_id=${userId}`,
  ).toHaveLength(0);
  expect(
    await client`SELECT id FROM orders WHERE user_id=${userId}`,
  ).toHaveLength(0);
});
