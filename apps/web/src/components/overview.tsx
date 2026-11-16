"use client";

import { ServerCard } from "@/components/server-card";
import { useServers } from "@/hooks/use-servers";
import { API_URL } from "@/lib/api";

export function Overview() {
  const { servers, error } = useServers();

  if (error && !servers) {
    return (
      <div className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm">
        API injoignable ({error}). Vérifie qu&apos;elle tourne sur {API_URL}.
      </div>
    );
  }
  if (!servers) return <p className="text-sm text-muted">Chargement…</p>;
  if (servers.length === 0) {
    return <p className="text-sm text-muted">Aucun serveur enregistré.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {servers.map((s) => (
        <ServerCard key={s.id} server={s} />
      ))}
    </div>
  );
}