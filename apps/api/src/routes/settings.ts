import type { FastifyInstance } from "fastify";
import { pool } from "../db.js";

type AlertRuleRow = {
  id: string;
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  duration_s: number;
  severity: "info" | "warning" | "critical";
};

export async function settingsRoutes(app: FastifyInstance) {
  app.get("/settings/alert-rules", async () => {
    const { rows } = await pool.query<AlertRuleRow>(
      `SELECT id, name, metric, operator, threshold, duration_s, severity
       FROM alert_rules
       WHERE enabled = true
       ORDER BY metric, threshold`,
    );

    return rows.map((rule) => ({
      ...rule,
      threshold: Number(rule.threshold),
      duration_s: Number(rule.duration_s),
    }));
  });
}
