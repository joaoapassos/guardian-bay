import { randomUUID } from "node:crypto";
import postgres from "postgres";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { getDb } from "@/db";
import {
  createAddressAction,
  removeAddressAction,
  updateAddressAction,
} from "@/features/addresses/actions/address.action";
import { hashPassword } from "@/features/auth/server/password";
import { createSession } from "@/features/auth/server/session";
import { checkoutAction } from "../actions/checkout.action";
import { orderDetail } from "./order-detail";

vi.mock("server-only", () => ({}));
const request = vi.hoisted(() => ({
  token: undefined as string | undefined,
  headers: new Headers({
    origin: "http://localhost:3000",
    host: "localhost:3000",
  }),
}));
vi.mock("next/headers", () => ({
  headers: async () => request.headers,
  cookies: async () => ({
    get: () => (request.token ? { value: request.token } : undefined),
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const value = process.env.TEST_DATABASE_URL;
if (!value) throw new Error("TEST_DATABASE_URL é obrigatória.");
const url = new URL(value);
if (
  !["postgres:", "postgresql:"].includes(url.protocol) ||
  !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
  url.pathname !== "/guardian_bay_test" ||
  (process.env.DATABASE_URL &&
    new URL(process.env.DATABASE_URL).pathname === url.pathname)
)
  throw new Error("Banco local dedicado obrigatório.");
const client = postgres(value, { max: 1, onnotice: () => {} });
let userId: string;
let otherId: string;
let categoryId: string;
let productId: string;
let ownAddressId: string;
let foreignAddressId: string;
let ownToken: string;
let otherToken: string;
const address = {
  recipient: "Ana de Teste",
  postalCode: "12345-678",
  street: "Rua das Flores",
  number: "12",
  complement: "Casa 2",
  neighborhood: "Centro",
  city: "São Paulo",
  state: "SP",
  country: "BR",
};
const snapshot = { ...address, postalCode: "12345678" };

async function clearFixtures() {
  await client`DELETE FROM order_payments WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (${userId},${otherId}))`;
  await client`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (${userId},${otherId}))`;
  await client`DELETE FROM orders WHERE user_id IN (${userId},${otherId})`;
  await client`DELETE FROM cart_items WHERE user_id IN (${userId},${otherId})`;
  await client`DELETE FROM addresses WHERE user_id IN (${userId},${otherId})`;
  await client`DELETE FROM abuse_budgets WHERE user_id IN (${userId},${otherId})`;
  await client`DELETE FROM audit_events WHERE actor_user_id IN (${userId},${otherId})`;
  await client`DELETE FROM sessions WHERE user_id IN (${userId},${otherId})`;
}

beforeAll(async () => {
  // Migrations belong to the dedicated test harness, never this suite.
  vi.stubEnv("DATABASE_URL", value);
  const passwordHash = await hashPassword(
    "Checkout address integration passphrase",
  );
  const suffix = randomUUID();
  const [user] =
    await client`INSERT INTO users(email,password_hash) VALUES (${`${suffix}@checkout-address.example.test`},${passwordHash}) RETURNING id`;
  const [other] =
    await client`INSERT INTO users(email,password_hash) VALUES (${`${suffix}@checkout-other.example.test`},${passwordHash}) RETURNING id`;
  userId = user.id;
  otherId = other.id;
  const [category] =
    await client`INSERT INTO categories(name) VALUES (${`Checkout address ${suffix}`}) RETURNING id`;
  categoryId = category.id;
  const [product] =
    await client`INSERT INTO products(name,category_id,amount,is_published) VALUES ('Checkout address fixture',${categoryId},1099,true) RETURNING id`;
  productId = product.id;
  await client`INSERT INTO inventory(product_id,available_quantity) VALUES (${productId},99)`;
});

beforeEach(async () => {
  await clearFixtures();
  await client`UPDATE inventory SET available_quantity=99,revision=1 WHERE product_id=${productId}`;
  ownToken = (await createSession(userId)).token;
  otherToken = (await createSession(otherId)).token;
  request.token = ownToken;
  expect(await createAddressAction(address)).toEqual({ success: true });
  const [own] = await client`SELECT id FROM addresses WHERE user_id=${userId}`;
  ownAddressId = own.id;
  request.token = otherToken;
  expect(
    await createAddressAction({ ...address, recipient: "Outra pessoa" }),
  ).toEqual({ success: true });
  const [foreign] =
    await client`SELECT id FROM addresses WHERE user_id=${otherId}`;
  foreignAddressId = foreign.id;
  request.token = ownToken;
  await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${userId},${productId},2)`;
});

afterAll(async () => {
  await clearFixtures();
  await client`DELETE FROM users WHERE id IN (${userId},${otherId})`;
  await client`DELETE FROM inventory WHERE product_id=${productId}`;
  await client`DELETE FROM products WHERE id=${productId}`;
  await client`DELETE FROM categories WHERE id=${categoryId}`;
  await client.end();
  await getDb().$client.end();
  vi.unstubAllEnvs();
});

async function expectNoCheckoutEffects() {
  expect(
    await client`SELECT id FROM orders WHERE user_id=${userId}`,
  ).toHaveLength(0);
  const [cart] =
    await client`SELECT quantity FROM cart_items WHERE user_id=${userId} AND product_id=${productId}`;
  expect(cart.quantity).toBe(2);
  const [stock] =
    await client`SELECT available_quantity FROM inventory WHERE product_id=${productId}`;
  expect(stock.available_quantity).toBe(99);
}

describe("checkout shipping-address snapshots", () => {
  it("copies the complete own address into an owner-scoped order snapshot", async () => {
    const result = await checkoutAction({
      checkoutKey: randomUUID(),
      addressId: ownAddressId,
      payment: { method: "PIX" },
    });
    expect(result).toMatchObject({ success: true, status: "PENDING_PAYMENT" });
    if (!result.success) throw new Error("Expected checkout success");
    const [stored] =
      await client`SELECT shipping_address FROM orders WHERE id=${result.orderId}`;
    expect(stored.shipping_address).toEqual(snapshot);
    const detail = await orderDetail(result.orderId);
    expect(detail).toMatchObject({
      success: true,
      order: { shippingAddress: snapshot, total: { amount: 2198 } },
    });
    if (!detail.success) throw new Error("Expected order detail");
    expect(detail.order.shippingAddress).not.toHaveProperty("userId");
    expect(detail.order.shippingAddress).not.toHaveProperty("id");
    request.token = otherToken;
    expect(await orderDetail(result.orderId)).toEqual({
      success: false,
      code: "NOT_FOUND",
    });
  });

  it("rejects another owner's address without creating an order or changing the cart", async () => {
    expect(
      await checkoutAction({
        checkoutKey: randomUUID(),
        addressId: foreignAddressId,
        payment: { method: "PIX" },
      }),
    ).toEqual({ success: false, code: "INVALID_ADDRESS" });
    await expectNoCheckoutEffects();
  });

  it("rejects an address removed before checkout without consuming the cart", async () => {
    expect(
      await removeAddressAction({ id: ownAddressId, revision: 1 }),
    ).toEqual({ success: true });
    expect(
      await checkoutAction({
        checkoutKey: randomUUID(),
        addressId: ownAddressId,
        payment: { method: "BOLETO" },
      }),
    ).toEqual({ success: false, code: "INVALID_ADDRESS" });
    await expectNoCheckoutEffects();
  });

  it("keeps the original order detail after the saved address is edited and deleted", async () => {
    const result = await checkoutAction({
      checkoutKey: randomUUID(),
      addressId: ownAddressId,
      payment: { method: "PIX" },
    });
    if (!result.success) throw new Error("Expected checkout success");
    const original = await orderDetail(result.orderId);
    expect(original).toMatchObject({
      success: true,
      order: { shippingAddress: snapshot },
    });
    expect(
      await updateAddressAction({
        ...address,
        id: ownAddressId,
        revision: 1,
        city: "Santos",
        street: "Rua Nova",
        number: "45",
      }),
    ).toEqual({ success: true });
    expect(await orderDetail(result.orderId)).toEqual(original);
    expect(
      await removeAddressAction({ id: ownAddressId, revision: 2 }),
    ).toEqual({ success: true });
    expect(
      await client`SELECT id FROM addresses WHERE id=${ownAddressId}`,
    ).toHaveLength(0);
    expect(await orderDetail(result.orderId)).toEqual(original);
    const [stored] =
      await client`SELECT shipping_address FROM orders WHERE id=${result.orderId}`;
    expect(stored.shipping_address).toEqual(snapshot);
  });

  it("resolves an idempotent retry before looking up removed or foreign addresses", async () => {
    const checkoutKey = randomUUID();
    const original = await checkoutAction({
      checkoutKey,
      addressId: ownAddressId,
      payment: { method: "PIX" },
    });
    if (!original.success) throw new Error("Expected checkout success");
    expect(
      await removeAddressAction({ id: ownAddressId, revision: 1 }),
    ).toEqual({ success: true });
    await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${userId},${productId},3)`;
    expect(
      await checkoutAction({
        checkoutKey,
        addressId: ownAddressId,
        payment: { method: "PIX" },
      }),
    ).toEqual(original);
    expect(
      await checkoutAction({
        checkoutKey,
        addressId: foreignAddressId,
        payment: { method: "BOLETO" },
      }),
    ).toEqual(original);
    expect(
      await client`SELECT id FROM orders WHERE user_id=${userId}`,
    ).toHaveLength(1);
    const [stored] =
      await client`SELECT shipping_address FROM orders WHERE id=${original.orderId}`;
    expect(stored.shipping_address).toEqual(snapshot);
    const payments =
      await client`SELECT method FROM order_payments WHERE order_id=${original.orderId}`;
    expect(payments).toHaveLength(1);
    expect(payments[0].method).toBe("PIX");
    const [cart] =
      await client`SELECT quantity FROM cart_items WHERE user_id=${userId} AND product_id=${productId}`;
    expect(cart.quantity).toBe(3);
    const [stock] =
      await client`SELECT available_quantity FROM inventory WHERE product_id=${productId}`;
    expect(stock.available_quantity).toBe(99);
  });
});
