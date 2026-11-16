export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type Latest = {
  ts: string;
  cpu_pct: number | null;
  ram_pct: number | null;
  disk_pct: number | null;
  load1: number | null;
  net_rx_bps: number | null;
  net_tx_bps: number | null;
};

export type ServerSummary = {
  id: string;
  name: string;
  ip: string | null;
  os: string | null;
  status: "online" | "offline";
  last_seen_at: string | null;
  latest: Latest | null;
};

export async function fetchServers(signal?: AbortSignal): Promise<ServerSummary[]> {
  const res = await fetch(`${API_URL}/api/v1/servers`, {
    signal,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export type RangeKey = "1h" | "6h" | "24h" | "7d";

export type MetricPoint = {
  ts: string;
  cpu_pct: number | null;
  ram_pct: number | null;
  disk_pct: number | null;
  load1: number | null;
  net_rx_bps: number | null;
  net_tx_bps: number | null;
};

export type MetricsResponse = {
  server: { id: string; name: string };
  range: RangeKey;
  bucket_s: number;
  points: MetricPoint[];
};

export async function fetchMetrics(
  id: string,
  range: RangeKey,
  signal?: AbortSignal,
): Promise<MetricsResponse> {
  const url = `${API_URL}/api/v1/servers/${id}/metrics?range=${range}`;
  const res = await fetch(url, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}