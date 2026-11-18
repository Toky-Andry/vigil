import { pool } from "../db.js";
import { openIncident, resolveIncident } from "./incidents.js";

const OFFLINE_AFTER_S = 60;

export async function evaluateHeartbeat(): Promise<void> {
  const { rows } = await pool.query(
    `SELECT id, last_seen_at < now() - make_interval(secs => $1) AS offline
     FROM servers WHERE revoked_at IS NULL AND last_seen_at IS NOT NULL`,
    [OFFLINE_AFTER_S],
  );
  for (const r of rows) {
    if (r.offline) {
      await openIncident({
        serverId: r.id,
        method: "heartbeat",
        metric: null,
        severity: "critical",
        message: `Aucune mesure reçue depuis plus de ${OFFLINE_AFTER_S} s`,
      });
    } else {
      await resolveIncident(r.id, "heartbeat", null);
    }
  }
}
