"use client";

import { ServerTable } from "@/components/servers/server-table";
import { useServers } from "@/hooks/use-servers";

export function ServersView() {
  const { servers, error } = useServers();

  return (
    <>
      <h1 className="text-2xl font-semibold">Serveurs</h1>
      <p className="mt-1 text-sm text-muted">Machines surveillées par Vigil.</p>
      <div className="mt-6">
        {error && !servers && <p className="text-sm text-danger">Erreur : {error}</p>}
        {!servers && !error && <p className="text-sm text-muted">Chargement…</p>}
        {servers?.length === 0 && <p className="text-sm text-muted">Aucun serveur.</p>}
        {servers && servers.length > 0 && <ServerTable servers={servers} />}
      </div>
    </>
  );
}
