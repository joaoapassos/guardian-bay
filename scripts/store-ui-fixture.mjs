import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { startAdminFixture } from "./admin-ui-fixture.mjs";

export const fixtureId = "00000000-0000-4000-8000-000000000001";
export async function startStoreFixture() {
  return startAdminFixture({
    prefix: "store-ui-",
    port: 3212,
    customize({ write, root, directory }) {
      // Reuse the actual built font assets offline, preserving the application's typography.
      const chunks = join(root, ".next/static/chunks");
      if (existsSync(chunks)) {
        const css = readdirSync(chunks)
          .filter((name) => name.endsWith(".css"))
          .map((name) => readFileSync(join(chunks, name), "utf8"))
          .join("\n");
        const faces = [...css.matchAll(/@font-face\{[^}]+\}/g)]
          .map(([face]) => face)
          .filter((face) =>
            /font-family:(?:Fraunces|Geist|Geist Mono|IBM Plex Sans);/.test(
              face,
            ),
          );
        if (faces.length) {
          mkdirSync(join(directory, "public/fixture-fonts"), {
            recursive: true,
          });
          for (const face of faces)
            for (const [, filename] of face.matchAll(/\.\.\/media\/([^)"]+)/g))
              cpSync(
                join(root, ".next/static/media", filename),
                join(directory, "public/fixture-fonts", filename),
              );
          writeFileSync(
            join(directory, "src/app/fixture-fonts.css"),
            faces.join("\n").replaceAll("../media/", "/fixture-fonts/") +
              '\n:root{--font-fraunces:Fraunces;--font-ibm-plex-sans:"IBM Plex Sans";--font-geist-sans:Geist;--font-geist-mono:"Geist Mono"}',
          );
          const layout = readFileSync(join(root, "src/app/layout.tsx"), "utf8")
            .replace(
              /import \{ Fraunces[^\n]+next\/font\/google";\r?\n/,
              'import "./fixture-fonts.css";\n',
            )
            .replace(
              /const geistSans = Geist\([\s\S]+?(?=export const metadata)/,
              'const geistSans={variable:""},geistMono={variable:""},fraunces={variable:""},plexSans={variable:""};\n\n',
            );
          write("app/layout.tsx", layout);
        }
      }
      const money = { amount: 12990, currency: "BRL", formatted: "R$ 129,90" };
      const product = {
        id: fixtureId,
        name: "Kit de preparo",
        description: "Equipamento de teste visual, sem dados reais.",
        category: "Equipamentos",
        inStock: true,
        price: money,
      };
      const category = { id: fixtureId, name: "Equipamentos" };
      const address = {
        id: fixtureId,
        revision: 1,
        recipient: "Pessoa de teste",
        postalCode: "12345678",
        street: "Rua das Flores",
        number: "120",
        complement: "Apartamento 12",
        neighborhood: "Centro",
        city: "São Paulo",
        state: "SP",
        country: "BR",
      };
      const item = {
        productId: fixtureId,
        productName: product.name,
        quantity: 1,
        unitAmount: 12990,
        subtotalAmount: 12990,
        price: money,
        subtotal: money,
      };
      const order = {
        orderId: fixtureId,
        createdAt: "2026-10-25T12:00:00.000Z",
        status: "PAID",
        paymentMethod: "PIX",
        total: money,
        items: [item],
        shippingAddress: { ...address, id: undefined, revision: undefined },
      };
      write(
        "features/catalog/server/read-public-categories.ts",
        `export async function readPublicCategories() { return [${JSON.stringify(category)}]; }`,
      );
      write(
        "features/catalog/server/list-products.ts",
        `import {productImage} from '../images'; import {publicListQuerySchema} from '../schemas/list-query'; export async function listProducts(input:unknown) { const parsed=publicListQuerySchema.safeParse(input); if(!parsed.success) return {success:false as const,code:'INVALID_INPUT' as const}; const q=parsed.data; const products=q.query==='empty'?[]:Array.from({length:q.limit===8?8:3},(_,i)=>({...${JSON.stringify(product)},id:'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),name:'Kit de preparo '+(i+1),image:productImage(null,'Kit de preparo')})); return {success:true as const,...q,total:products.length,categories:[${JSON.stringify(category)}],hasNext:false,products}; }`,
      );
      write(
        "features/catalog/server/read-product.ts",
        `import {productImage} from '../images'; export async function readProduct(id:unknown) { return id==='${fixtureId}' ? {...${JSON.stringify(product)},image:productImage(null,'Kit de preparo')} : null; }`,
      );
      write(
        "features/cart/server/read-cart.ts",
        `import {productImage} from '@/features/catalog/images'; export async function readCart() { return {success:true as const,items:[{productId:'${fixtureId}',name:'Kit de preparo',quantity:1,available:true,availableQuantity:8,stockSufficient:true,price:${JSON.stringify(money)},subtotal:${JSON.stringify(money)},image:productImage(null,'Kit de preparo')}],total:${JSON.stringify(money)}}; }`,
      );
      write(
        "features/orders/server/checkout-preview.ts",
        readFileSync(
          join(root, "src/features/orders/server/checkout-preview.ts"),
          "utf8",
        ).replace(
          "export async function checkoutPreview()",
          "async function unusedCheckoutPreview()",
        ) +
          `\nexport async function checkoutPreview(): Promise<Awaited<ReturnType<typeof unusedCheckoutPreview>>> { return {success:true as const,snapshot:{items:[${JSON.stringify({ productId: fixtureId, productName: product.name, quantity: 1, unitAmount: 12990, subtotalAmount: 12990, currency: "BRL" })}],total:${JSON.stringify(money)}}}; }`,
      );
      write(
        "features/addresses/server/read-addresses.ts",
        `export async function readAddresses() { if (false) return {success:false as const,code:'UNAUTHENTICATED' as const}; return {success:true as const,addresses:[${JSON.stringify(address)} as const]}; } export const readCheckoutAddresses=readAddresses;`,
      );
      write(
        "features/orders/server/order-history.ts",
        `export async function orderHistory(_input:unknown) { if (false) return {success:false as const,code:'UNAUTHENTICATED' as const}; return {success:true as const,page:1,hasNext:false,orders:[${JSON.stringify(order)}]}; }`,
      );
      write(
        "features/orders/server/order-detail.ts",
        `export async function orderDetail(_input:unknown) { if (false) return {success:false as const,code:'UNAUTHENTICATED' as const}; return {success:true as const,order:${JSON.stringify(order)}}; }`,
      );
      write(
        "features/orders/server/read-payment.ts",
        "export async function readPayment(_input:unknown): Promise<null | {id:string;method:string;status:string;cardLast4:string|null;expiresAt:string;approvableAt:string;serverNow:string}> { return null; }",
      );
      write(
        "features/auth/server/read-account.ts",
        "export async function readAccount() { return {email:'pessoa@example.test'}; }",
      );
      const cardsSource = readFileSync(
        join(root, "src/features/orders/server/test-cards.ts"),
        "utf8",
      );
      write(
        "features/orders/server/test-cards.ts",
        cardsSource.replace(
          "export async function readTestCards()",
          "async function unusedReadTestCards()",
        ) +
          `\nexport async function readTestCards() { return [{id:'${fixtureId}',brand:'TEST',last4:'4242',expiryMonth:12,expiryYear:2030}]; }`,
      );
    },
  });
}
