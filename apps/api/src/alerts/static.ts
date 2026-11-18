import { pool } from "../db.js";
import { openIncident, resolveIncident } from "./incidents.js";
import type { Rule } from "./rules.js";

const SAMPLE_S = 10; // intervalle d'envoi de l'agent
const MIN_COVERAGE = 0.8; // part minimale de mesures attendues dans la fenêtre

type Row = { id: string; n: number; n_hit: number; avg_value: number };

async function windowStats(rule: Rule): Promise<Row[]> {
  // rule.metric et rule.operator ont été validés par la liste blanche (rules.ts)
  const { rows } = await pool.query(
    `SELECT s.id, count(*)::int AS n,
            count(*) FILTER (WHERE m.${rule.metric} ${rule.operator} $1)::int AS n_hit,
            avg(m.${rule.metric})::float8 AS avg_value
     FROM servers s JOIN metrics m ON m.server_id = s.id
     WHERE s.revoked_at IS NULL AND m.ts >= now() - make_interval(secs => $2)
     GROUP BY s.id`,
    [rule.threshold, rule.duration_s],
  );
  return rows;
}

export async function evaluateStatic(rule: Rule): Promise<void> {
  const expected = Math.max(1, Math.floor((rule.duration_s / SAMPLE_S) * MIN_COVERAGE));
  for (const r of await windowStats(rule)) {
    const triggered = r.n >= expected && r.n_hit === r.n;
    if (triggered) {
      await openIncident({
        serverId: r.id,
        method: "static",
        metric: rule.metric,
        severity: rule.severity,
        message: `${rule.name} : ${r.avg_value.toFixed(1)} % en moyenne sur ${rule.duration_s} s`,
      });
    } else if (r.n_hit === 0) {
      await resolveIncident(r.id, "static", rule.metric);
    }
  }
}
