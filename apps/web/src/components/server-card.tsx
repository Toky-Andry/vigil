import Link from "next/link";
import { Meter } from "@/components/meter";
import type { ServerSummary } from "@/lib/api";

const CARD = [
  "block rounded-lg border border-border bg-surface p-4",
  "transition-colors hover:border-primary-strong",
].join(" ");

const BADGE = {
  online: "bg-success/15 text-success",
  offline: "bg-danger/15 text-danger",
} as const;

export function ServerCard({ server }: { server: ServerSummary }) {
  const m = server.latest;
  const subtitle = [server.ip, server.os].filter(Boolean).join(" · ") || "—";
  return (
    <Link href={`/servers/${server.id}`} className={CARD}>
      <header className="flex items-start justify-between">
        <div>
          <h2 className="font-semibold">{server.name}</h2>
          <p className="font-mono text-xs text-muted">{subtitle}</p>
        </div>
        <span className={`rounded px-2 py-0.5 font-mono text-xs ${BADGE[server.status]}`}>
          {server.status === "online" ? "Online" : "Offline"}
        </span>
      </header>
      <div className="mt-4 space-y-3">
        <Meter label="CPU" value={m?.cpu_pct ?? null} />
        <Meter label="RAM" value={m?.ram_pct ?? null} />
        <Meter label="DISK" value={m?.disk_pct ?? null} />
      </div>
    </Link>
  );
}