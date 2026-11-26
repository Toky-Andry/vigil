import { API_URL } from "./api";

export type AlertRule = {
  id: string;
  name: string;
  metric: string;
  operator: ">" | "<";
  threshold: number;
  duration_s: number;
  severity: "info" | "warning" | "critical";
};

export async function fetchAlertRules(signal?: AbortSignal): Promise<AlertRule[]> {
  const response = await fetch(`${API_URL}/api/v1/settings/alert-rules`, {
    signal,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`API ${response.status}`);
  return response.json();
}

export async function fetchApiHealth(signal?: AbortSignal): Promise<boolean> {
  const response = await fetch(`${API_URL}/health`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(`API ${response.status}`);
  const health: { status?: string } = await response.json();
  return health.status === "ok";
}
