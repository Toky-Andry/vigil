"use client";

import { useMemo, useState } from "react";
import { IncidentTable } from "@/components/alerts/incident-table";
import { SegmentedControl } from "@/components/segmented-control";
import { useIncidents } from "@/hooks/use-incidents";
import type { IncidentStatus } from "@/lib/incidents-api";

const OPTIONS: { value: IncidentStatus; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "open", label: "Ouvertes" },
  { value: "resolved", label: "Résolues" },
];

export function IncidentsView() {
  const [status, setStatus] = useState<IncidentStatus>("all");
  const [search, setSearch] = useState("");
  const { incidents, error } = useIncidents(status, 200);
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    if (!incidents || !query) return incidents;
    return incidents.filter((incident) =>
      [incident.server_name, incident.method, incident.metric, incident.message]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase("fr").includes(query)),
    );
  }, [incidents, search]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Incidents</h1>
          <p className="mt-1 text-sm text-muted">
            Historique des détections et de leur résolution sur vos serveurs.
          </p>
        </div>
        <SegmentedControl options={OPTIONS} value={status} onChange={setStatus} />
      </div>

      <div className="mt-6 rounded-lg border border-border bg-surface p-4">
        <label htmlFor="incident-search" className="mb-2 block text-xs font-medium text-muted">
          Rechercher un serveur, une méthode ou un message
        </label>
        <input
          id="incident-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Ex. omen-dev, EWMA, cpu_pct"
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm outline-none placeholder:text-muted/70 focus:border-primary sm:max-w-md"
        />
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-muted">
        <span>{filtered ? `${filtered.length} incident(s)` : "Chargement…"}</span>
        <span>Les 200 incidents les plus récents au maximum</span>
      </div>
      <div className="mt-3">
        {error && !incidents && <p className="text-sm text-danger">Erreur API : {error}</p>}
        {!incidents && !error && <p className="text-sm text-muted">Chargement des incidents…</p>}
        {filtered?.length === 0 && (
          <p className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
            {search ? "Aucun incident ne correspond à cette recherche." : "Aucun incident pour ce filtre."}
          </p>
        )}
        {filtered && filtered.length > 0 && <IncidentTable incidents={filtered} />}
      </div>
    </>
  );
}
