import { readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import postgres from "postgres";
import {
  mediaDirectory,
  removeMedia,
  removeTemporaryMedia,
} from "../src/features/catalog/media-files.mjs";
import {
  loadLocalEnvironment,
  localDemoDatabase,
} from "./local-demo-environment.mjs";

export async function cleanupProductMedia(sql, limit = 100) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000)
    throw new Error("INVALID_LIMIT");
  const rows = await sql.begin(async (tx) => {
    const candidates =
      await tx`SELECT m.id,m.storage_key FROM product_media m WHERE m.origin='upload' AND (m.expires_at<=clock_timestamp() OR (m.expires_at IS NULL AND m.created_at<clock_timestamp()-interval '24 hours')) AND NOT EXISTS(SELECT 1 FROM products p WHERE p.media_id=m.id) ORDER BY m.created_at LIMIT ${limit} FOR UPDATE SKIP LOCKED`;
    const removed = [];
    for (const row of candidates) {
      const deleted =
        await tx`DELETE FROM product_media m WHERE id=${row.id} AND NOT EXISTS(SELECT 1 FROM products p WHERE p.media_id=m.id) RETURNING storage_key`;
      if (deleted.length) removed.push(row.storage_key);
    }
    return removed;
  });
  for (const key of rows) await removeMedia(key);
  const root = await mediaDirectory();
  let orphanCount = 0;
  for (const file of await readdir(root)) {
    if (orphanCount + rows.length >= limit) break;
    if (!/^[0-9a-f-]{36}[.]webp([.]tmp)?$/.test(file)) continue;
    if ((await stat(join(root, file))).mtimeMs > Date.now() - 86400000)
      continue;
    if (file.endsWith(".tmp")) {
      await removeTemporaryMedia(file);
      orphanCount++;
      continue;
    }
    const [exists] =
      await sql`SELECT id FROM product_media WHERE storage_key=${file} LIMIT 1`;
    if (!exists) {
      await removeMedia(file);
      orphanCount++;
    }
  }
  return { media: rows.length, files: orphanCount };
}
if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  const raw = process.argv[2] ?? "100";
  if (!/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > 1000) {
    console.error("Use npm run media:cleanup -- [1–1000]; padrão100.");
    process.exitCode = 1;
  } else {
    await loadLocalEnvironment();
    let sql;
    try {
      sql = postgres(localDemoDatabase(), { max: 1, onnotice: () => {} });
      const result = await cleanupProductMedia(sql, Number(raw));
      console.info(
        `Limpeza concluída: ${result.media} mídias e${result.files} arquivos sem registro.`,
      );
    } catch {
      console.error(
        "Limpeza interrompida. Confira configuração local, banco e permissões; detalhes sensíveis omitidos.",
      );
      process.exitCode = 1;
    } finally {
      await sql?.end();
    }
  }
}
