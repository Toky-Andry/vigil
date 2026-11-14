import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../db.js";
import { hashKey } from "../apiKey.js";

const Body = z.object({
  ts: z.coerce.date().optional(),
  cpu_pct: z.number().min(0).max(100),
  ram_pct: z.number().min(0).max(100),
  disk_pct: z.number().min(0).max(100),
  load1: z.number().min(0).optional(),
  net_rx_bps: z.number().int().min(0).optional(),
  net_tx_bps: z.number().int().min(0).optional(),
});

const MAX_CLOCK_SKEW_MS = 10 * 60 * 1000;

function extractKey(headers: Record<string, unknown>): string | null {
  const direct = headers["x-api-key"];
  if (typeof direct === "string" && direct.length > 0) return direct;
  const auth = headers["authorization"];
  if (typeof auth === "string" && auth.startsWith("Bearer ")) {
    return auth.slice(7);
  }
  return null;
}

export async function ingestRoutes(app: FastifyInstance) {
  app.post("/ingest", async (req, reply) => {
    const key = extractKey(req.headers);
    if (!key) return reply.code(401).send({ error: "missing_api_key" });

    const { rows } = await pool.query(
      "SELECT id FROM servers WHERE api_key_hash = $1 AND revoked_at IS NULL",
      [hashKey(key)],
    );
    if (rows.length === 0) {
      return reply.code(401).send({ error: "invalid_api_key" });
    }
    const serverId: string = rows[0].id;

    const parsed = Body.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "invalid_body", details: parsed.error.issues });
    }
    const m = parsed.data;
    const ts = m.ts ?? new Date();
    if (Math.abs(ts.getTime() - Date.now()) > MAX_CLOCK_SKEW_MS) {
      return reply.code(400).send({ error: "timestamp_out_of_range" });
    }

    await pool.query(
      `INSERT INTO metrics
         (server_id, ts, cpu_pct, ram_pct, disk_pct, load1, net_rx_bps, net_tx_bps)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (server_id, ts) DO NOTHING`,
      [serverId, ts, m.cpu_pct, m.ram_pct, m.disk_pct,
       m.load1 ?? null, m.net_rx_bps ?? null, m.net_tx_bps ?? null],
    );
    await pool.query("UPDATE servers SET last_seen_at = now() WHERE id = $1", [
      serverId,
    ]);

    return reply.code(202).send({ ok: true });
  });
}