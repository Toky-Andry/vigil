import Link from "next/link";
import { SeverityBadge, StatusBadge } from "@/components/alerts/badges";
import { formatDateTime, formatDuration, formatRelative } from "@/lib/format";
import { METHOD_LABELS } from "@/lib/incident-labels";
import type { Incident } from "@/lib/incidents-api";

const HEAD = ["Gravité", "Serveur", "Méthode", "Message", "Détecté", "Durée", "Statut"];

function Row({ incident: i }: { incident: Incident }) {
  const detected = new Date(i.detected_at).getTime();
  return (
    <tr className="border-b border-border last:border-0 hover:bg-bg/40">
      <td className="px-4 py-3"><SeverityBadge severity={i.severity} /></td>
      <td className="px-4 py-3 font-medium">
        <Link href={`/servers/${i.server_id}`} className="hover:text-primary">
          {i.server_name}
        </Link>
      </td>
      <td className="px-4 py-3 font-mono text-xs text-muted">{METHOD_LABELS[i.method]}</td>
      <td className="px-4 py-3">
        <Link href={`/incidents/${i.id}`} className="hover:text-primary hover:underline">
          {i.message ?? "Voir l’incident"}
        </Link>
      </td>
      <td className="px-4 py-3 text-muted" title={formatDateTime(detected)}>
        {formatRelative(i.detected_at)}
      </td>
      <td className="px-4 py-3 font-mono text-xs">
        {formatDuration(i.detected_at, i.resolved_at)}
      </td>
      <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
    </tr>
  );
}

export function IncidentTable({ incidents }: { incidents: Incident[] }) {
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
          {incidents.map((i) => (
            <Row key={i.id} incident={i} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
