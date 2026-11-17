import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { hash } from "argon2";
import { sql } from "drizzle-orm";
import { emailSchema } from "../../src/features/auth/credential-policy.mjs";
import { passwordHashOptions } from "../../src/features/auth/password-hash-policy.mjs";
import { productContentSchema } from "../../src/features/catalog/product-content.mjs";
import { sealPersonalData } from "../../src/lib/security/personal-data-core.mjs";

const kinds = new Set(["user", "category", "product", "order"]);
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const cpf = "52998224725";
const address = {
  recipient: "Pessoa Simulada",
  postalCode: "01001000",
  street: "Rua de Simulação",
  number: "1",
  complement: "",
  neighborhood: "Centro",
  city: "São Paulo",
  state: "SP",
  country: "BR",
};

async function audit(
  tx,
  event,
  actor,
  targetType,
  targetId,
  outcome = "SUCCESS",
) {
  await tx.execute(
    sql`INSERT INTO audit_events (event_type, outcome, actor_user_id, target_type, target_id, correlation_id) VALUES (${event}, ${outcome}, ${actor}, ${targetType}, ${targetId}, ${randomUUID()})`,
  );
}

export function createSimulationStore({ db, adminEmail, maxPerType }) {
  const admin = emailSchema.safeParse(adminEmail);
  if (
    !admin.success ||
    !Number.isSafeInteger(maxPerType) ||
    maxPerType < 1 ||
    maxPerType > 1_000_000 ||
    typeof db?.transaction !== "function"
  )
    throw new Error("Configuração da simulação inválida.");
  return {
    async create(kind, id) {
      if (!kinds.has(kind) || typeof id !== "string" || !uuid.test(id))
        throw new Error("Intenção de simulação inválida.");
      return db.transaction(async (tx) => {
        // Serializes idempotency, caps and synthetic target selection across workers.
        await tx.execute(sql`SELECT pg_advisory_xact_lock(1195521366, 1)`);
        const [role] = await tx.execute(
          sql`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`,
        );
        if (!role || role.rolsuper || role.rolbypassrls)
          throw new Error("Papel de banco inválido.");
        const [existing] = await tx.execute(
          sql`SELECT kind FROM simulation_records WHERE id = ${id}`,
        );
        if (existing) {
          if (existing.kind !== kind) throw new Error("Intenção conflitante.");
          return id;
        }
        const [count] = await tx.execute(
          sql`SELECT count(*)::integer AS total FROM simulation_records WHERE kind = ${kind}`,
        );
        if (count.total >= maxPerType) throw new Error("SIMULATION_LIMIT");
        let actor;
        if (kind !== "order") {
          [actor] = await tx.execute(
            sql`SELECT id FROM users WHERE email = ${admin.data} AND role IN ('admin', 'superadmin') AND NOT suspended FOR SHARE`,
          );
          if (!actor) throw new Error("ADMIN_UNAVAILABLE");
        }
        if (kind === "user") {
          const email = `sim-${id}@simulation.invalid`;
          const passwordHash = await hash(
            randomBytes(32).toString("base64url"),
            passwordHashOptions,
          );
          await tx.execute(
            sql`INSERT INTO users (id, email, name, password_hash) VALUES (${id}, ${email}, ${"Pessoa simulada"}, ${passwordHash})`,
          );
          await audit(tx, "admin.user.created", actor.id, "user", id);
        } else if (kind === "category") {
          await tx.execute(
            sql`INSERT INTO categories (id, name) VALUES (${id}, ${`Simulação ${id}`})`,
          );
          await audit(tx, "admin.category.created", actor.id, "category", id);
        } else if (kind === "product") {
          const [category] = await tx.execute(
            sql`SELECT c.id FROM simulation_records s JOIN categories c ON c.id = s.id WHERE s.kind = 'category' ORDER BY s.created_at DESC, s.id LIMIT 1 FOR SHARE OF c`,
          );
          if (!category) throw new Error("CATEGORY_UNAVAILABLE");
          const product = productContentSchema.parse({
            name: `Produto simulado ${id}`,
            description: "Produto fictício criado pela simulação.",
            amount: randomInt(1000, 100_000),
            currency: "BRL",
          });
          await tx.execute(
            sql`INSERT INTO products (id, name, description, category_id, amount, currency, is_published) VALUES (${id}, ${product.name}, ${product.description}, ${category.id}, ${product.amount}, ${product.currency}, true)`,
          );
          await tx.execute(
            sql`INSERT INTO inventory (product_id, available_quantity) VALUES (${id}, 100)`,
          );
          await audit(tx, "admin.product.created", actor.id, "product", id);
          await audit(tx, "admin.inventory.updated", actor.id, "inventory", id);
        } else {
          const [buyer] = await tx.execute(
            sql`SELECT u.id, u.name FROM simulation_records s JOIN users u ON u.id = s.id WHERE s.kind = 'user' AND u.role = 'customer' AND NOT u.suspended ORDER BY s.created_at DESC, s.id LIMIT 1 FOR UPDATE OF u`,
          );
          const [product] = await tx.execute(
            sql`SELECT p.id, p.name, p.amount, i.available_quantity FROM simulation_records s JOIN products p ON p.id = s.id JOIN inventory i ON i.product_id = p.id WHERE s.kind = 'product' AND p.is_published AND i.available_quantity > 0 AND i.revision < 2147483647 ORDER BY s.created_at DESC, s.id LIMIT 1 FOR SHARE OF p FOR UPDATE OF i`,
          );
          if (!buyer || !product)
            throw new Error("SIMULATED_INPUT_UNAVAILABLE");
          const protectedCpf = sealPersonalData(cpf, `order:${buyer.id}:${id}`);
          await tx.execute(
            sql`INSERT INTO orders (id, user_id, checkout_key, buyer_name, buyer_cpf_encrypted, buyer_cpf_last2, shipping_address, total_amount, currency, status) VALUES (${id}, ${buyer.id}, ${id}, ${buyer.name}, ${protectedCpf}, ${cpf.slice(-2)}, ${JSON.stringify(address)}::jsonb, ${product.amount}, 'BRL', 'PAID')`,
          );
          await tx.execute(
            sql`INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_amount, currency, subtotal_amount) VALUES (${id}, ${product.id}, ${product.name}, 1, ${product.amount}, 'BRL', ${product.amount})`,
          );
          await tx.execute(
            sql`UPDATE inventory SET available_quantity = available_quantity - 1, revision = revision + 1 WHERE product_id = ${product.id}`,
          );
          await audit(tx, "order.completed", buyer.id, "order", id);
        }
        await tx.execute(
          sql`INSERT INTO simulation_records (id, kind) VALUES (${id}, ${kind})`,
        );
        return id;
      });
    },
  };
}
