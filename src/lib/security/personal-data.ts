import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function keys() {
  const active = process.env.BUYER_DATA_ACTIVE_KEY_ID;
  const raw = process.env.BUYER_DATA_KEYS;
  if (!active || !raw || !/^[a-zA-Z0-9_-]{1,32}$/.test(active))
    throw new Error("Personal data protection is not configured");
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("Invalid personal data key configuration");
  const configured = new Map<string, Buffer>();
  for (const [id, value] of Object.entries(parsed)) {
    if (
      !/^[a-zA-Z0-9_-]{1,32}$/.test(id) ||
      typeof value !== "string" ||
      !/^[A-Za-z0-9+/]{43}=$/.test(value)
    )
      throw new Error("Invalid personal data key configuration");
    const key = Buffer.from(value, "base64");
    if (key.length !== 32)
      throw new Error("Invalid personal data key configuration");
    configured.set(id, key);
  }
  if (!configured.has(active))
    throw new Error("Active personal data key is unavailable");
  return { active, configured };
}

export function sealPersonalData(value: string, context: string) {
  const { active, configured } = keys();
  const nonce = randomBytes(12);
  const key = configured.get(active);
  if (!key) throw new Error("Active personal data key is unavailable");
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(Buffer.from(context, "utf8"));
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    active,
    nonce.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

// Intentionally no public Action exposes decryption; callers need a specific
// server-authorized purpose and the same owner/resource context.
export function openPersonalData(envelope: string, context: string) {
  const [version, id, nonce, tag, encrypted, extra] = envelope.split(".");
  if (
    version !== "v1" ||
    !id ||
    !nonce ||
    !tag ||
    !encrypted ||
    extra !== undefined
  )
    throw new Error("Invalid protected data");
  const key = keys().configured.get(id);
  if (!key) throw new Error("Protected data key is unavailable");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(nonce, "base64url"),
  );
  decipher.setAAD(Buffer.from(context, "utf8"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
