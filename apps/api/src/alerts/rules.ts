import { pool } from "../db.js";

const METRICS = ["cpu_pct", "ram_pct", "disk_pct"] as const;
const OPERATORS = [">", "<"] as const;

export type Rule = {
  id: string;
  name: string;
  metric: (typeof METRICS)[number];
  operator: (typeof OPERATORS)[number];
  threshold: number;
  duration_s: number;
  severity: "info" | "warning" | "critical";
};

// metric et operator sont insérés dans du SQL : liste blanche obligatoire.
function isSupported(r: Rule): boolean {
  return METRICS.includes(r.metric) && OPERATORS.includes(r.operator);
}

export async function loadRules(): Promise<Rule[]> {
  const { rows } = await pool.query(
    `SELECT id, name, metric, operator, threshold, duration_s, severity
     FROM alert_rules WHERE enabled`,
  );
  return (rows as Rule[]).filter(isSupported);
}
