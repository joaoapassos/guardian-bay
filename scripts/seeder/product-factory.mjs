import { randomInt, randomUUID } from "node:crypto";
import { z } from "zod";
import { productContentSchema } from "../../src/features/catalog/product-content.mjs";

export const seedNameKey = (name) =>
  name.normalize("NFKC").trim().toLocaleLowerCase("pt-BR");
const kinds = [
  "Kit de preparo",
  "Conjunto de viagem",
  "Acessório de campo",
  "Equipamento de trilha",
  "Item de organização",
  "Utilitário de acampamento",
];
const places = [
  "Serra",
  "Bosque",
  "Vale",
  "Campo",
  "Rio",
  "Lago",
  "Monte",
  "Costa",
  "Ilha",
  "Prado",
  "Duna",
  "Cedro",
  "Pinhal",
  "Aurora",
  "Sol",
  "Lua",
  "Estrela",
  "Norte",
  "Sul",
  "Leste",
  "Oeste",
  "Terra",
  "Céu",
  "Pedra",
  "Areia",
  "Mar",
  "Vento",
  "Brisa",
  "Floresta",
  "Planície",
  "Horizonte",
  "Refúgio",
];
const editions = [
  "Caminho",
  "Expedição",
  "Jornada",
  "Rota",
  "Estação",
  "Ciclo",
  "Passagem",
  "Encontro",
  "Destino",
  "Travessia",
  "Partida",
  "Chegada",
  "Reserva",
  "Exploração",
  "Trânsito",
  "Percurso",
  "Descoberta",
  "Rotina",
  "Acampamento",
  "Viagem",
  "Circuito",
  "Escala",
  "Ritmo",
  "Pausa",
  "Trecho",
  "Trajeto",
  "Volta",
  "Visita",
  "Passeio",
  "Caminhada",
  "Parada",
  "Itinerário",
];
export const seedProductSchema = productContentSchema
  .extend({
    id: z.uuid(),
    quantity: z.number().int().min(0).max(1000),
    seedNameKey: z.string().min(1).max(120),
  })
  .refine((product) => seedNameKey(product.name) === product.seedNameKey);
export function createProductFactory(existing = []) {
  const used = new Set(existing.map(seedNameKey));
  const capacity = kinds.length * places.length * editions.length;
  let cursor = randomInt(capacity),
    attempts = 0;
  return () => {
    while (attempts++ < capacity) {
      const index = cursor++ % capacity;
      const name = `${kinds[index % kinds.length]} ${places[Math.floor(index / kinds.length) % places.length]} — ${editions[Math.floor(index / kinds.length / places.length) % editions.length]}`;
      const key = seedNameKey(name);
      if (used.has(key)) continue;
      used.add(key);
      return seedProductSchema.parse({
        id: randomUUID(),
        name,
        seedNameKey: key,
        description:
          "Produto demonstrativo gerado para desenvolvimento. Sem fotografia associada; não representa especificações, certificações ou um SKU comercial real.",
        currency: "BRL",
        amount: randomInt(1000, 150001),
        quantity: randomInt(0, 1001),
      });
    }
    throw new Error("NAME_SPACE_EXHAUSTED");
  };
}
