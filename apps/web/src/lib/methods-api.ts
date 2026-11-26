import { API_URL } from "./api";

export type DetectionMethodKey = "static" | "ewma" | "iforest";

export type MethodEvaluation = {
  detections_in_windows: number;
  detected_experiments: number;
  recall: number | null;
  event_precision: number | null;
  false_alerts_per_day: number | null;
  mean_detection_delay_s: number | null;
};

export type ScenarioEvaluation = {
  scenario: string;
  experiment_count: number;
  methods: Record<DetectionMethodKey, number>;
};

export type MethodsSummary = {
  experiment_count: number;
  period: { from: string; to: string; days: number } | null;
  methods: Record<DetectionMethodKey, MethodEvaluation>;
  scenarios: ScenarioEvaluation[];
};

export async function fetchMethodsSummary(signal?: AbortSignal): Promise<MethodsSummary> {
  const response = await fetch(`${API_URL}/api/v1/evaluations/summary`, {
    signal,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`API ${response.status}`);
  return response.json();
}
