import type { RangeKey } from "./api";

export function formatTick(t: number, range: RangeKey): string {
  const d = new Date(t);
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (range !== "7d") return time;
  const day = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
  return `${day} ${time}`;
}

export const formatDateTime = (t: number) => new Date(t).toLocaleString("fr-FR");

export const formatPct = (v: number | null) => (v === null ? "--" : `${v.toFixed(1)} %`);