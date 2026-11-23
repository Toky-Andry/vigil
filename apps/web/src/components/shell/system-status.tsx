import type { Incident } from "@/lib/incidents-api";

type Props = { incidents: Incident[] | null; apiDown: boolean };

function describe({ incidents, apiDown }: Props): { text: string; style: string } {
  if (apiDown) return { text: "API injoignable", style: "bg-danger/15 text-danger" };
  if (!incidents) return { text: "Chargement…", style: "bg-surface text-muted" };
  if (incidents.some((i) => i.severity === "critical")) {
    return { text: "Incident critique", style: "bg-danger/15 text-danger" };
  }
  const n = incidents.length;
  if (n > 0) {
    const plural = n > 1 ? "s" : "";
    return { text: `${n} alerte${plural} active${plural}`, style: "bg-warning/15 text-warning" };
  }
  return { text: "Tous les systèmes opérationnels", style: "bg-success/15 text-success" };
}

export function SystemStatus(props: Props) {
  const { text, style } = describe(props);
  return <span className={`rounded px-2.5 py-1 font-mono text-xs ${style}`}>{text}</span>;
}
