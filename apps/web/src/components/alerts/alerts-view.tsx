"use client";

import { useState } from "react";
import { IncidentTable } from "@/components/alerts/incident-table";
import { SegmentedControl } from "@/components/segmented-control";
import { useIncidents } from "@/hooks/use-incidents";
import type { IncidentStatus } from "@/lib/incidents-api";

const OPTIONS: { value: IncidentStatus; label: string }[] = [
  { value: "open", label: "Ouvertes" },
  { value: "resolved", label: "Résolues" },
  { value: "all", label: "Toutes" },
];

export function AlertsView() {
  const [status, setStatus] = useState<IncidentStatus>("open");
  const { incidents, error } = useIncidents(status);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Alertes</h1>
          <p className="mt-1 text-sm text-muted">Incidents détectés sur les serveurs.</p>
        </div>
        <SegmentedControl options={OPTIONS} value={status} onChange={setStatus} />
      </div>

      <div className="mt-6">
        {error && !incidents && <p className="text-sm text-danger">Erreur : {error}</p>}
        {!incidents && !error && <p className="text-sm text-muted">Chargement…</p>}
        {incidents?.length === 0 && (
          <p className="text-sm text-muted">Aucune alerte : tous les systèmes sont normaux.</p>
        )}
        {incidents && incidents.length > 0 && <IncidentTable incidents={incidents} />}
      </div>
    </>
  );
}
