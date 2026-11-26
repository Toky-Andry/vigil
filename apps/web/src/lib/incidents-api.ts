import { API_URL, type MetricPoint } from "./api";

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

export type IncidentDetail = {
  incident: Incident & {
    server_ip: string | null;
    server_os: string | null;
    ai_summary: string | null;
  };
  points: MetricPoint[];
  bucket_s: number;
};

export async function fetchIncidents(
  status: IncidentStatus,
  signal?: AbortSignal,
  limit = 50,
): Promise<Incident[]> {
  const url = `${API_URL}/api/v1/incidents?status=${status}&limit=${limit}`;
  const res = await fetch(url, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function fetchIncidentDetail(
  id: string,
  signal?: AbortSignal,
): Promise<IncidentDetail> {
  const res = await fetch(`${API_URL}/api/v1/incidents/${encodeURIComponent(id)}`, {
    signal,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(res.status === 404 ? "Incident introuvable" : `API ${res.status}`);
  return res.json();
}
