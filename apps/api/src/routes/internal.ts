import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { config } from "../config.js";
import { openIncident, resolveIncident } from "../alerts/incidents.js";
import { pool } from "../db.js";

const Metric = z.enum(["cpu_pct", "ram_pct", "disk_pct", "system"]);
const Anomaly = z.object({
  server_id: z.string().uuid(),
  method: z.enum(["ewma", "iforest"]),
  metric: Metric,
  severity: z.enum(["warning", "critical"]).default("warning"),
  message: z.string().min(1).max(500),
});
const Experiment = z.object({
  server_id: z.string().uuid(),
  scenario: z.enum(["cpu", "memory", "disk", "agent_offline", "other"]),
});
const Since = z.object({ since: z.coerce.date().optional() });

function authorized(header: unknown): boolean {
  const expected = config.VIGIL_INTERNAL_TOKEN;
  if (!expected || typeof header !== "string") return false;
  const actual = Buffer.from(header);
  const wanted = Buffer.from(expected);
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

export async function internalRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (req, reply) => {
    if (!config.VIGIL_INTERNAL_TOKEN) {
      return reply.code(503).send({ error: "internal_api_not_configured" });
    }
    if (!authorized(req.headers["x-vigil-internal-token"])) {
      return reply.code(401).send({ error: "unauthorized" });
    }
  });

  // Initial history seeds the detector; later requests use `since` as its watermark.
  app.get("/metrics", async (req, reply) => {
    const query = Since.safeParse(req.query);
    if (!query.success) return reply.code(400).send({ error: "invalid_request" });
    const since = query.data.since ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const { rows } = await pool.query(
      `SELECT server_id, ts, cpu_pct, ram_pct, disk_pct, load1,
              net_rx_bps, net_tx_bps
       FROM metrics
       WHERE ts > $1
       ORDER BY ts DESC
       LIMIT 20000`,
      [since],
    );
    return rows.reverse();
  });

  app.post("/anomalies", async (req, reply) => {
    const parsed = Anomaly.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_body" });
    const item = parsed.data;
    const created = await openIncident({
      serverId: item.server_id,
      method: item.method,
      metric: item.metric,
      severity: item.severity,
      message: item.message,
    });
    return reply.code(created ? 201 : 200).send({ ok: true, created });
  });

  app.post("/anomalies/resolve", async (req, reply) => {
    const parsed = Anomaly.pick({ server_id: true, method: true, metric: true }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_body" });
    const resolved = await resolveIncident(
      parsed.data.server_id,
      parsed.data.method,
      parsed.data.metric,
    );
    return { ok: true, resolved };
  });

  app.post("/experiments", async (req, reply) => {
    const parsed = Experiment.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_body" });
    const { rows } = await pool.query(
      `INSERT INTO experiments (server_id, scenario, injected_at)
       VALUES ($1, $2, now()) RETURNING id, server_id, scenario, injected_at`,
      [parsed.data.server_id, parsed.data.scenario],
    );
    return reply.code(201).send(rows[0]);
  });

  app.post("/experiments/:id/end", async (req, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: "invalid_request" });
    const { rows } = await pool.query(
      `UPDATE experiments SET ended_at = now()
       WHERE id = $1 AND ended_at IS NULL
       RETURNING id, server_id, scenario, injected_at, ended_at`,
      [params.data.id],
    );
    if (!rows.length) return reply.code(404).send({ error: "experiment_not_found" });
    return rows[0];
  });

  app.get("/evaluation-data", async () => {
    const [experiments, incidents] = await Promise.all([
      pool.query(
        `SELECT id, server_id, scenario, injected_at, ended_at
         FROM experiments ORDER BY injected_at`,
      ),
      pool.query(
        `SELECT server_id, method, metric, detected_at, resolved_at, status
         FROM incidents WHERE method IN ('ewma', 'iforest')
         ORDER BY detected_at`,
      ),
    ]);
    return { experiments: experiments.rows, incidents: incidents.rows };
  });
}
