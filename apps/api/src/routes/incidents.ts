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
}
