import { createHash, randomBytes } from "node:crypto";

export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey() {
  const key = `vgl_live_${randomBytes(24).toString("base64url")}`;
  return { key, prefix: key.slice(0, 14), hash: hashKey(key) };
}