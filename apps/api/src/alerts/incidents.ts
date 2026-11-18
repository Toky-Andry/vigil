import { pool } from "../db.js";
import { publish } from "../events/bus.js";

export type NewIncident = {
  serverId: string;
  method: "static" | "heartbeat";
  metric: string | null;
  severity: string;
  message: string;
};

// Un seul incident ouvert par (serveur, méthode, métrique) : voir l'index
// unique partiel de la migration 003. Renvoie true si un incident vient d'être créé.
export async function openIncident(i: NewIncident): Promise<boolean> {
  const { rows } = await pool.query(
    `INSERT INTO incidents (server_id, method, metric, severity, message)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT DO NOTHING RETURNING id`,
    [i.serverId, i.method, i.metric, i.severity, i.message],
  );
  const created = rows.length > 0;
  if (created) publish({ type: "incident", action: "opened", server_id: i.serverId });
  return created;
}

export async function resolveIncident(
  serverId: string,
  method: string,
  metric: string | null,
): Promise<boolean> {
  const { rows } = await pool.query(
    `UPDATE incidents SET status = 'resolved', resolved_at = now()
     WHERE server_id = $1 AND method = $2
       AND COALESCE(metric, '') = COALESCE($3::text, '')
       AND status <> 'resolved'
     RETURNING id`,
    [serverId, method, metric],
  );
  const resolved = rows.length > 0;
  if (resolved) publish({ type: "incident", action: "resolved", server_id: serverId });
  return resolved;
}
