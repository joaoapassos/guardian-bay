import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

// Isolated UI-only build. No application files, database or credentials are changed.
export async function startAdminFixture({
  customize,
  prefix = "admin-ui-",
  port = 3211,
} = {}) {
  const root = resolve(".");
  mkdirSync(join(root, ".vitest"), { recursive: true });
  const directory = mkdtempSync(join(root, ".vitest", prefix));
  for (const file of [
    "package.json",
    "tsconfig.json",
    "next.config.ts",
    "postcss.config.mjs",
  ])
    cpSync(join(root, file), join(directory, file));
  cpSync(join(root, "src"), join(directory, "src"), {
    recursive: true,
    filter: (path) => !/\.test\.tsx?$/.test(path),
  });
  cpSync(join(root, "public"), join(directory, "public"), { recursive: true });
  const write = (path, text) =>
    writeFileSync(join(directory, "src", path), text);
  const databaseSource = readFileSync(join(root, "src/db/index.ts"), "utf8");
  write(
    "db/index.ts",
    databaseSource.slice(0, databaseSource.indexOf("export function getDb()")) +
      'export function getDb(): Database { throw new Error("Database forbidden in UI fixture"); }',
  );
  write(
    "features/auth/server/session-cookie.ts",
    readFileSync(
      join(root, "src/features/auth/server/session-cookie.ts"),
      "utf8",
    )
      .replace(
        "cache(async () =>",
        "cache(async (): Promise<Awaited<ReturnType<typeof resolveSession>>> =>",
      )
      .replace(
        "return resolveSession(store.get(sessionCookiePolicy().name)?.value);",
        "return store.get('ui-user') ? { id: 'fixture-user', email: 'pessoa@example.test' } : null;",
      ),
  );
  write(
    "features/auth/server/require-admin.ts",
    'import { cookies } from "next/headers"; export async function requireAuthenticatedAdmin(_tx?: unknown) { const value=(await cookies()).get("ui-access")?.value; return value==="customer" ? {success:false as const,code:"FORBIDDEN" as const} : value==="anonymous" ? {success:false as const,code:"UNAUTHENTICATED" as const} : {success:true as const,identity:{id:"fixture-admin"}}; }',
  );
  const id = "00000000-0000-4000-8000-000000000001";
  const category = { id, name: "Equipamentos", revision: 1 };
  const product = {
    id,
    name: "Kit de preparo",
    description: "Produto de teste visual",
    categoryId: id,
    amount: 12990,
    currency: "BRL",
    isPublished: true,
    revision: 1,
    imageKey: null,
    availableQuantity: 8,
    inventoryRevision: 1,
  };
  const productSource = `{...${JSON.stringify(product)},mediaId:null,image:{kind:'none' as const,key:null,alt:'Sem imagem de Kit de preparo'}}`;
  const order = {
    buyer: { name: "Pessoa de teste", cpfMask: "•••.•••.•••-25" },
    shippingAddress: {
      recipient: "Pessoa de teste",
      postalCode: "12345678",
      street: "Rua de teste",
      number: "10",
      complement: "",
      neighborhood: "Centro",
      city: "São Paulo",
      state: "SP",
      country: "BR",
    },
    cardBrand: "VISA",
    cardLast4: "4242",
    orderId: id,
    createdAt: "2026-10-25T12:00:00.000Z",
    status: "PAID",
    paymentMethod: "PIX",
    paymentExpiresAt: "2026-10-25T12:30:00.000Z",
    total: { amount: 12990, currency: "BRL", formatted: "R$ 129,90" },
    items: [
      {
        productName: product.name,
        quantity: 1,
        price: { formatted: "R$ 129,90" },
        subtotal: { formatted: "R$ 129,90" },
      },
    ],
  };
  write(
    "features/catalog/server/read-admin-catalog.ts",
    `let failed=false; export async function readAdminCatalog(raw:unknown = {}) { const input=(raw??{}) as Record<string,string>; if(input.query==='fail' && !failed) { failed=true; throw new Error('Fixture unavailable'); } return { query:{query:input.query??'',category:undefined,publication:'all'},products:input.query==='empty'?[]:[${productSource}],categories:[${JSON.stringify(category)}],page:1,hasNext:false}; }`,
  );
  write(
    "features/catalog/server/read-admin-categories.ts",
    `import {requireAuthenticatedAdmin} from '@/features/auth/server/require-admin'; export async function readAdminCategories() { const auth=await requireAuthenticatedAdmin(); if(!auth.success) return auth; return {success:true as const,categories:[${JSON.stringify(category)}],hasMore:false}; }`,
  );
  write(
    "features/catalog/server/read-admin-product.ts",
    `import {requireAuthenticatedAdmin} from '@/features/auth/server/require-admin'; export async function readAdminProduct(input: string) { const auth=await requireAuthenticatedAdmin(); if(!auth.success) return auth; return input==='${id}' ? {success:true as const,product:${productSource}} : {success:false as const,code:'NOT_FOUND' as const}; }`,
  );
  write(
    "features/orders/server/admin-order-list.ts",
    `import {requireAuthenticatedAdmin} from '@/features/auth/server/require-admin'; export async function adminOrderList(raw:unknown={}) { const auth=await requireAuthenticatedAdmin(); if(!auth.success) return auth; const input=(raw??{}) as Record<string,string>; if(input.status==='invalid') return {success:false as const,code:'INVALID_INPUT' as const}; return {success:true as const,query:{page:1,limit:20,sort:'created-desc',status:'',orderId:''},orders:input.orderId==='empty'?[]:[${JSON.stringify(order)}],hasNext:false}; }`,
  );
  write(
    "features/orders/server/admin-order-detail.ts",
    `import {requireAuthenticatedAdmin} from '@/features/auth/server/require-admin'; export async function adminOrderDetail(input:string) { const auth=await requireAuthenticatedAdmin(); if(!auth.success) return auth; return input==='${id}' ? {success:true as const,order:${JSON.stringify(order)}} : {success:false as const,code:'NOT_FOUND' as const}; }`,
  );
  if (customize) customize({ write, directory, root });
  const build = spawn(
    process.execPath,
    [join(root, "node_modules/next/dist/bin/next"), "build", "--webpack"],
    {
      cwd: directory,
      env: { ...process.env, DATABASE_URL: "", NODE_ENV: "production" },
      stdio: "pipe",
      windowsHide: true,
    },
  );
  let buildOutput = "";
  build.stdout.on("data", (chunk) => {
    buildOutput += chunk;
  });
  build.stderr.on("data", (chunk) => {
    buildOutput += chunk;
  });
  if ((await once(build, "close"))[0] !== 0)
    throw new Error(`UI fixture build failed: ${buildOutput.slice(-4000)}`);
  const server = spawn(
    process.execPath,
    [
      join(root, "node_modules/next/dist/bin/next"),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: directory,
      env: { ...process.env, DATABASE_URL: "", NODE_ENV: "production" },
      stdio: "pipe",
      windowsHide: true,
    },
  );
  let ready = false;
  server.stdout.on("data", (chunk) => {
    if (chunk.toString().includes("Ready in")) ready = true;
  });
  server.stderr.on("data", () => {});
  for (let i = 0; i < 100 && !ready && server.exitCode === null; i++)
    await new Promise((done) => setTimeout(done, 100));
  if (!ready) {
    server.kill();
    throw new Error("UI fixture did not start");
  }
  return { server, directory, origin: `http://127.0.0.1:${port}` };
}
