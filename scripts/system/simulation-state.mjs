import { readFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { atomicPrivateFile } from "./state.mjs";

const kinds = new Set(["user", "category", "product", "order"]);
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function validate(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Estado da simulação inválido.");
  for (const [kind, item] of Object.entries(value)) {
    if (
      !kinds.has(kind) ||
      !item ||
      typeof item !== "object" ||
      Array.isArray(item) ||
      Object.keys(item).sort().join(",") !== "id,remaining" ||
      typeof item.id !== "string" ||
      !uuid.test(item.id) ||
      !Number.isInteger(item.remaining) ||
      item.remaining < 1 ||
      item.remaining > 5
    )
      throw new Error("Estado da simulação inválido.");
  }
  return value;
}
export function createSimulationState(directory) {
  if (typeof directory !== "string" || !isAbsolute(directory))
    throw new Error("Diretório da simulação inválido.");
  const path = join(directory, "pending.json");
  return {
    async load() {
      try {
        return validate(JSON.parse(await readFile(path, "utf8")));
      } catch (error) {
        if (error.code === "ENOENT") return {};
        throw new Error("Estado da simulação inválido.");
      }
    },
    async save(value) {
      await atomicPrivateFile(path, `${JSON.stringify(validate(value))}\n`);
    },
  };
}
