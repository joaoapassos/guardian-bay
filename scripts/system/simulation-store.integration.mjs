import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { hash } from "argon2";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { passwordHashOptions } from "../../src/features/auth/password-hash-policy.mjs";
import { createSimulationStore } from "./simulation-store.mjs";

const url = new URL(process.env.TEST_DATABASE_URL ?? "invalid:");
if (
  !["postgres:", "postgresql:"].includes(url.protocol) ||
  !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
  url.pathname !== "/guardian_bay_test" ||
  (process.env.DATABASE_URL &&
    new URL(process.env.DATABASE_URL).pathname === url.pathname)
)
  throw new Error("Banco local dedicado obrigatório.");

test("persistência associa auditoria aos atores e nunca usa dados fora do ledger", async () => {
  const client = postgres(url.toString(), { max: 1, onnotice: () => {} });
  const role = `simulation_test_${randomUUID().replaceAll("-", "")}`;
  const ids = {
    admin: randomUUID(),
    user: randomUUID(),
    category: randomUUID(),
    product: randomUUID(),
    order: randomUUID(),
  };
  const decoy = {
    user: randomUUID(),
    category: randomUUID(),
    product: randomUUID(),
  };
  const rolledBack = randomUUID();
  const email = `${ids.admin}@simulation.example.test`;
  let roleCreated = false;
  try {
    await client`CREATE ROLE ${client(role)} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS`;
    roleCreated = true;
    await client`GRANT USAGE ON SCHEMA public TO ${client(role)}`;
    await client`GRANT SELECT, INSERT ON users, categories, products, orders, order_items, audit_events, simulation_records TO ${client(role)}`;
    await client`GRANT UPDATE(name) ON users, categories, products TO ${client(role)}`;
    await client`GRANT SELECT, INSERT, UPDATE ON inventory TO ${client(role)}`;
    const passwordHash = await hash(randomUUID(), passwordHashOptions);
    await client`INSERT INTO users (id, email, password_hash, role) VALUES (${ids.admin}, ${email}, ${passwordHash}, 'admin')`;
    await client`INSERT INTO users (id, email, password_hash) VALUES (${decoy.user}, ${`${decoy.user}@example.test`}, ${passwordHash})`;
    await client`INSERT INTO categories (id, name) VALUES (${decoy.category}, ${`Fora da simulação ${decoy.category}`})`;
    await client`INSERT INTO products (id, name, category_id, amount, is_published) VALUES (${decoy.product}, 'Produto externo', ${decoy.category}, 1099, true)`;
    await client`INSERT INTO inventory (product_id, available_quantity) VALUES (${decoy.product}, 50)`;
    const db = drizzle(client);
    const store = createSimulationStore({
      db,
      adminEmail: email,
      maxPerType: 5,
    });
    await assert.rejects(store.create("user", ids.user));
    await client`SET ROLE ${client(role)}`;
    for (const kind of ["user", "category", "product", "order"])
      assert.equal(await store.create(kind, ids[kind]), ids[kind]);
    assert.equal(await store.create("order", ids.order), ids.order);
    await client`RESET ROLE`;
    const orders =
      await client`SELECT user_id, status FROM orders WHERE id=${ids.order}`;
    assert.equal(orders.length, 1);
    assert.equal(orders[0].user_id, ids.user);
    assert.equal(orders[0].status, "PAID");
    const items =
      await client`SELECT product_id, quantity FROM order_items WHERE order_id=${ids.order}`;
    assert.equal(items[0].product_id, ids.product);
    assert.equal(items[0].quantity, 1);
    const events =
      await client`SELECT event_type, actor_user_id FROM audit_events WHERE target_id IN (${ids.user}, ${ids.category}, ${ids.product}, ${ids.order})`;
    assert.ok(
      events.some(
        (event) =>
          event.event_type === "admin.user.created" &&
          event.actor_user_id === ids.admin,
      ),
    );
    assert.ok(
      events.some(
        (event) =>
          event.event_type === "admin.category.created" &&
          event.actor_user_id === ids.admin,
      ),
    );
    assert.ok(
      events.some(
        (event) =>
          event.event_type === "admin.product.created" &&
          event.actor_user_id === ids.admin,
      ),
    );
    assert.ok(
      events.some(
        (event) =>
          event.event_type === "order.completed" &&
          event.actor_user_id === ids.user,
      ),
    );
    assert.equal(
      (
        await client`SELECT available_quantity FROM inventory WHERE product_id=${ids.product}`
      )[0].available_quantity,
      99,
    );
    assert.equal(
      (
        await client`SELECT available_quantity FROM inventory WHERE product_id=${decoy.product}`
      )[0].available_quantity,
      50,
    );
    await client`REVOKE INSERT ON audit_events FROM ${client(role)}`;
    await client`SET ROLE ${client(role)}`;
    await assert.rejects(store.create("user", rolledBack));
    await client`RESET ROLE`;
    assert.equal(
      (
        await client`SELECT count(*)::integer AS total FROM users WHERE id=${rolledBack}`
      )[0].total,
      0,
    );
    assert.equal(
      (
        await client`SELECT count(*)::integer AS total FROM simulation_records WHERE id=${rolledBack}`
      )[0].total,
      0,
    );
  } finally {
    await client`RESET ROLE`.catch(() => {});
    await client`DELETE FROM audit_events WHERE actor_user_id IN (${ids.admin}, ${ids.user})`;
    await client`DELETE FROM simulation_records WHERE id IN (${ids.user}, ${ids.category}, ${ids.product}, ${ids.order}, ${rolledBack})`;
    await client`DELETE FROM order_items WHERE order_id=${ids.order}`;
    await client`DELETE FROM orders WHERE id=${ids.order}`;
    await client`DELETE FROM inventory WHERE product_id=${ids.product}`;
    await client`DELETE FROM products WHERE id=${ids.product}`;
    await client`DELETE FROM categories WHERE id=${ids.category}`;
    await client`DELETE FROM users WHERE id IN (${ids.admin}, ${ids.user}, ${rolledBack})`;
    await client`DELETE FROM inventory WHERE product_id=${decoy.product}`;
    await client`DELETE FROM products WHERE id=${decoy.product}`;
    await client`DELETE FROM categories WHERE id=${decoy.category}`;
    await client`DELETE FROM users WHERE id=${decoy.user}`;
    if (roleCreated) {
      await client`DROP OWNED BY ${client(role)}`;
      await client`DROP ROLE ${client(role)}`;
    }
    await client.end();
  }
});
