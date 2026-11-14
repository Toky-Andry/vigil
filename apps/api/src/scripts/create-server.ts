import { pool } from "../db.js";
import { generateApiKey } from "../apiKey.js";

const [name, ip, os] = process.argv.slice(2);
if (!name) {
  console.error("Usage: npm run server:create -- <nom> [ip] [os]");
  process.exit(1);
}

const { key, prefix, hash } = generateApiKey();
const { rows } = await pool.query(
  `INSERT INTO servers (name, ip, os, api_key_prefix, api_key_hash)
   VALUES ($1, $2, $3, $4, $5) RETURNING id`,
  [name, ip ?? null, os ?? null, prefix, hash],
);

console.log(`Serveur créé : ${rows[0].id}`);
console.log("Clé d'API (affichée UNE SEULE FOIS) :");
console.log(key);
await pool.end();