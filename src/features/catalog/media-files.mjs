import {
  mkdir,
  readFile,
  realpath,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { isAbsolute, join, resolve, sep } from "node:path";

export async function mediaDirectory() {
  const configured = process.env.PRODUCT_MEDIA_DIR;
  if (!configured || !isAbsolute(configured))
    throw new Error("MEDIA_NOT_CONFIGURED");
  const root = resolve(configured);
  await mkdir(root, { recursive: true, mode: 0o700 });
  const actual = await realpath(root);
  for (const blocked of [resolve("public"), resolve(".next"), resolve("src")])
    if (actual === blocked || actual.startsWith(blocked + sep))
      throw new Error("MEDIA_NOT_CONFIGURED");
  return actual;
}
function validKey(key) {
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.webp$/.test(
      key,
    )
  )
    throw new Error("INVALID_MEDIA_KEY");
}
export async function storeMedia(key, bytes) {
  validKey(key);
  const destination = join(await mediaDirectory(), key);
  const temporary = `${destination}.tmp`;
  try {
    await writeFile(temporary, bytes, { flag: "wx", mode: 0o600 });
    await rename(temporary, destination);
  } catch (error) {
    await unlink(temporary).catch(() => {});
    throw error;
  }
}
export async function loadMedia(key) {
  validKey(key);
  return readFile(join(await mediaDirectory(), key));
}
export async function removeMedia(key) {
  validKey(key);
  await unlink(join(await mediaDirectory(), key)).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
}
export async function removeTemporaryMedia(key) {
  if (!key.endsWith(".tmp")) throw new Error("INVALID_MEDIA_KEY");
  validKey(key.slice(0, -4));
  await unlink(join(await mediaDirectory(), key)).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
}
