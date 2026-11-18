import type { Incident } from "./incidents-api";

export const METHOD_LABELS: Record<Incident["method"], string> = {
  static: "Seuil fixe",
  heartbeat: "Heartbeat",
  ewma: "EWMA",
  iforest: "Isolation Forest",
};
