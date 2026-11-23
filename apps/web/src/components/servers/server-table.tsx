import Link from "next/link";
import { OnlineBadge } from "@/components/servers/online-badge";
import type { ServerSummary } from "@/lib/api";
import { formatPct, formatRelative } from "@/lib/format";

const HEAD = ["Serveur", "Statut", "IP", "Système", "CPU", "RAM", "Disque", "Dernière mesure"];
const CELL = "px-4 py-3";
const MONO = `${CELL} font-mono text-xs`;

function Row({ server: s }: { server: ServerSummary }) {
  const m = s.latest;
  return (
    <tr className="border-b border-border last:border-0 hover:bg-bg/40">
      <td className={`${CELL} font-medium`}>
        <Link href={`/servers/${s.id}`} className="hover:text-primary">{s.name}</Link>
      </td>
      <td className={CELL}><OnlineBadge status={s.status} /></td>
      <td className={MONO}>{s.ip ?? "—"}</td>
      <td className={`${CELL} text-muted`}>{s.os ?? "—"}</td>
      <td className={MONO}>{formatPct(m?.cpu_pct ?? null)}</td>
      <td className={MONO}>{formatPct(m?.ram_pct ?? null)}</td>
      <td className={MONO}>{formatPct(m?.disk_pct ?? null)}</td>
      <td className={`${CELL} text-muted`}>
        {s.last_seen_at ? formatRelative(s.last_seen_at) : "—"}
      </td>
    </tr>
  );
}

export function ServerTable({ servers }: { servers: ServerSummary[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase text-muted">
            {HEAD.map((h) => (
              <th key={h} className="px-4 py-3 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {servers.map((s) => (
            <Row key={s.id} server={s} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
