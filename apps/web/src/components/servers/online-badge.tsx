import type { ServerSummary } from "@/lib/api";

const STYLES = {
  online: "bg-success/15 text-success",
  offline: "bg-danger/15 text-danger",
} as const;

export function OnlineBadge({ status }: { status: ServerSummary["status"] }) {
  return (
    <span className={`rounded px-2 py-0.5 font-mono text-xs ${STYLES[status]}`}>
      {status === "online" ? "Online" : "Offline"}
    </span>
  );
}
