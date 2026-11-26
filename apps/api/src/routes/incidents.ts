import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../db.js";

const Query = z.object({
  status: z.enum(["open", "resolved", "all"]).default("all"),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export async function incidentRoutes(app: FastifyInstance) {
  app.get("/incidents", async (req, reply) => {
    const q = Query.safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: "invalid_request" });

    const { rows } = await pool.query(
      `SELECT i.id, i.server_id, s.name AS server_name, i.method, i.metric,
              i.severity, i.status, i.message, i.detected_at, i.resolved_at
       FROM incidents i JOIN servers s ON s.id = i.server_id
       WHERE $1::text = 'all'
          OR ($1::text = 'open' AND i.status <> 'resolved')
          OR ($1::text = 'resolved' AND i.status = 'resolved')
       ORDER BY i.detected_at DESC LIMIT $2`,
      [q.data.status, q.data.limit],
    );
    return rows;
  });

  app.get("/incidents/:id", async (req, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: "invalid_request" });

    const { rows } = await pool.query(
      `SELECT i.id, i.server_id, s.name AS server_name, host(s.ip) AS server_ip,
              s.os AS server_os, i.method, i.metric, i.severity, i.status,
              i.message, i.ai_summary, i.detected_at, i.resolved_at
       FROM incidents i
       JOIN servers s ON s.id = i.server_id
       WHERE i.id = $1`,
      [params.data.id],
    );
    const incident = rows[0];
    if (!incident) return reply.code(404).send({ error: "incident_not_found" });

    const { rows: points } = await pool.query(
      `SELECT date_bin('10 seconds', m.ts, TIMESTAMPTZ '2000-01-01') AS ts,
              avg(m.cpu_pct)::float8 AS cpu_pct,
              avg(m.ram_pct)::float8 AS ram_pct,
              avg(m.disk_pct)::float8 AS disk_pct,
              avg(m.load1)::float8 AS load1,
              avg(m.net_rx_bps)::float8 AS net_rx_bps,
              avg(m.net_tx_bps)::float8 AS net_tx_bps
       FROM metrics m
       WHERE m.server_id = $1
         AND m.ts >= $2::timestamptz - interval '15 minutes'
         AND m.ts <= LEAST(
           COALESCE($3::timestamptz, $2::timestamptz + interval '30 minutes'),
           $2::timestamptz + interval '30 minutes'
         )
       GROUP BY 1 ORDER BY 1`,
      [incident.server_id, incident.detected_at, incident.resolved_at],
    );

    return { incident, points, bucket_s: 10 };
  });
}
