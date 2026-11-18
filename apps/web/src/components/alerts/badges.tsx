import type { Incident } from "@/lib/incidents-api";

const SEVERITY = {
  critical: "bg-danger/15 text-danger",
  warning: "bg-warning/15 text-warning",
  info: "bg-primary/15 text-primary",
} as const;

const STATUS = {
  open: "bg-danger/15 text-danger",
  acknowledged: "bg-warning/15 text-warning",
  resolved: "bg-success/15 text-success",
} as const;

const BASE = "rounded px-2 py-0.5 font-mono text-xs capitalize";

export function SeverityBadge({ severity }: { severity: Incident["severity"] }) {
  return <span className={`${BASE} ${SEVERITY[severity]}`}>{severity}</span>;
}

export function StatusBadge({ status }: { status: Incident["status"] }) {
  return <span className={`${BASE} ${STATUS[status]}`}>{status}</span>;
}
