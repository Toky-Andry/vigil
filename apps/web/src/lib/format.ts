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

const RTF = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

export function formatRelative(iso: string): string {
  const s = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(s);
  if (abs < 60) return RTF.format(s, "second");
  if (abs < 3600) return RTF.format(Math.round(s / 60), "minute");
  if (abs < 86_400) return RTF.format(Math.round(s / 3600), "hour");
  return RTF.format(Math.round(s / 86_400), "day");
}

export function formatDuration(fromIso: string, toIso: string | null): string {
  const end = toIso ? new Date(toIso).getTime() : Date.now();
  const s = Math.max(0, Math.round((end - new Date(fromIso).getTime()) / 1000));
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  return `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`;
}
