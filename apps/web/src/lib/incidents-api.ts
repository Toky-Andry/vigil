import { API_URL } from "./api";

export type IncidentStatus = "open" | "resolved" | "all";

export type Incident = {
  id: string;
  server_id: string;
  server_name: string;
  method: "static" | "heartbeat" | "ewma" | "iforest";
  metric: string | null;
  severity: "info" | "warning" | "critical";
  status: "open" | "acknowledged" | "resolved";
  message: string | null;
  detected_at: string;
  resolved_at: string | null;
};

export async function fetchIncidents(
  status: IncidentStatus,
  signal?: AbortSignal,
): Promise<Incident[]> {
  const url = `${API_URL}/api/v1/incidents?status=${status}`;
  const res = await fetch(url, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}
