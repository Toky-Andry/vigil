import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../db.js";

// Un serveur est "online" s'il a envoyé une mesure dans la dernière minute
const ONLINE_WINDOW_MS = 60_000;

const RANGES = {
  "1h": { window: "1 hour", bucket: "10 seconds", bucketS: 10 },
  "6h": { window: "6 hours", bucket: "1 minute", bucketS: 60 },
  "24h": { window: "24 hours", bucket: "5 minutes", bucketS: 300 },
  "7d": { window: "7 days", bucket: "30 minutes", bucketS: 1800 },
} as const;

const Params = z.object({ id: z.string().uuid() });
const Query = z.object({
  range: z.enum(["1h", "6h", "24h", "7d"]).default("1h"),
});

export async function serverRoutes(app: FastifyInstance) {
  app.get("/servers", async () => {
    const { rows } = await pool.query(`
      SELECT s.id, s.name, host(s.ip) AS ip, s.os, s.last_seen_at, s.created_at,
             m.ts AS metric_ts, m.cpu_pct, m.ram_pct, m.disk_pct, m.load1,
             m.net_rx_bps, m.net_tx_bps
      FROM servers s
      LEFT JOIN LATERAL (
        SELECT * FROM metrics WHERE server_id = s.id ORDER BY ts DESC LIMIT 1
      ) m ON true
      WHERE s.revoked_at IS NULL
      ORDER BY s.name
    `);

    const now = Date.now();
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      ip: r.ip,
      os: r.os,
      status:
        r.last_seen_at && now - new Date(r.last_seen_at).getTime() < ONLINE_WINDOW_MS
          ? "online"
          : "offline",
      last_seen_at: r.last_seen_at,
      latest: r.metric_ts
        ? {
            ts: r.metric_ts,
            cpu_pct: r.cpu_pct,
            ram_pct: r.ram_pct,
            disk_pct: r.disk_pct,
            load1: r.load1,
            net_rx_bps: r.net_rx_bps === null ? null : Number(r.net_rx_bps),
            net_tx_bps: r.net_tx_bps === null ? null : Number(r.net_tx_bps),
          }
        : null,
    }));
  });

  app.get("/servers/:id/metrics", async (req, reply) => {
    const params = Params.safeParse(req.params);
    const query = Query.safeParse(req.query);
    if (!params.success || !query.success) {
      return reply.code(400).send({ error: "invalid_request" });
    }
    const { id } = params.data;
    const range = RANGES[query.data.range];

    const server = await pool.query(
      "SELECT id, name FROM servers WHERE id = $1 AND revoked_at IS NULL",
      [id],
    );
    if (server.rows.length === 0) {
      return reply.code(404).send({ error: "server_not_found" });
    }

    const { rows } = await pool.query(
      `SELECT date_bin($3::interval, ts, TIMESTAMPTZ '2000-01-01') AS ts,
              avg(cpu_pct)::float8     AS cpu_pct,
              avg(ram_pct)::float8     AS ram_pct,
              avg(disk_pct)::float8    AS disk_pct,
              avg(load1)::float8       AS load1,
              avg(net_rx_bps)::float8  AS net_rx_bps,
              avg(net_tx_bps)::float8  AS net_tx_bps
       FROM metrics
       WHERE server_id = $1 AND ts >= now() - $2::interval
       GROUP BY 1
       ORDER BY 1`,
      [id, range.window, range.bucket],
    );

    return {
      server: server.rows[0],
      range: query.data.range,
      bucket_s: range.bucketS,
      points: rows,
    };
  });
}