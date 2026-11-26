"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Clock3, Server, TriangleAlert } from "lucide-react";
import { SeverityBadge, StatusBadge } from "@/components/alerts/badges";
import { ChartCard } from "@/components/charts/chart-card";
import { TimeChart, type Series } from "@/components/charts/time-chart";
import { useIncidents } from "@/hooks/use-incidents";
import { fetchIncidentDetail, type IncidentDetail } from "@/lib/incidents-api";
import { METHOD_LABELS } from "@/lib/incident-labels";
import { formatDateTime, formatDuration } from "@/lib/format";
import { lastValue, toRows } from "@/lib/chart-data";

const METRIC_INFO: Record<string, { label: string; key: "cpu" | "ram" | "disk" }> = {
  cpu_pct: { label: "CPU", key: "cpu" },
  ram_pct: { label: "Mémoire RAM", key: "ram" },
  disk_pct: { label: "Disque", key: "disk" },
};

const SERIES: Record<"cpu" | "ram" | "disk", Series> = {
  cpu: { key: "cpu", label: "CPU", color: "#4d8eff" },
  ram: { key: "ram", label: "RAM", color: "#4ae176" },
  disk: { key: "disk", label: "Disque", color: "#ffb3ad" },
};

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium">{children}</dd>
    </div>
  );
}

export function IncidentDetailView({ id }: { id: string }) {
  const { incidents } = useIncidents("open");
  const [data, setData] = useState<IncidentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError(null);
    fetchIncidentDetail(id, controller.signal)
      .then(setData)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Impossible de charger l’incident");
        }
      });
    return () => controller.abort();
  }, [id]);

  const incident = data?.incident;
  const rows = useMemo(
    () => (data ? toRows(data.points, data.bucket_s) : []),
    [data],
  );
  const series = useMemo<Series[]>(() => {
    if (!incident) return [];
    const metric = incident.metric ? METRIC_INFO[incident.metric] : null;
    return metric ? [SERIES[metric.key]] : [SERIES.cpu, SERIES.ram, SERIES.disk];
  }, [incident]);
  const nearestPoint = useMemo(() => {
    if (!incident || !data?.points.length) return null;
    const detectedAt = new Date(incident.detected_at).getTime();
    return data.points.reduce((nearest, point) =>
      Math.abs(new Date(point.ts).getTime() - detectedAt) <
      Math.abs(new Date(nearest.ts).getTime() - detectedAt)
        ? point
        : nearest,
    );
  }, [data, incident]);
  const title = incident
    ? `${incident.metric && METRIC_INFO[incident.metric] ? `${METRIC_INFO[incident.metric].label} : ` : ""}incident sur ${incident.server_name}`
    : "Détail de l’incident";

  if (error) {
    return (
      <section>
        <Link href="/incidents" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
          <ArrowLeft size={16} /> Retour aux incidents
        </Link>
        <p className="mt-6 rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </p>
      </section>
    );
  }

  if (!incident) return <p className="text-sm text-muted">Chargement du détail de l’incident…</p>;

  const visibleOpenCount = incidents?.length ?? 0;
  const currentValues = nearestPoint
    ? [
        `CPU ${nearestPoint.cpu_pct?.toFixed(1) ?? "—"}%`,
        `RAM ${nearestPoint.ram_pct?.toFixed(1) ?? "—"}%`,
        `Disque ${nearestPoint.disk_pct?.toFixed(1) ?? "—"}%`,
      ].join(" · ")
    : "Aucune mesure disponible autour de la détection";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/incidents" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
          <ArrowLeft size={16} /> Tous les incidents
        </Link>
        <span className="text-xs text-muted">{visibleOpenCount} incident(s) ouvert(s)</span>
      </div>

      <header className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-muted">Incidents / {incident.id.slice(0, 8).toUpperCase()}</p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            {incident.message ?? "Détection enregistrée par Vigil."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={incident.status} />
        </div>
      </header>

      <dl className="mt-6 grid grid-cols-2 gap-5 rounded-lg border border-border bg-surface p-4 sm:grid-cols-3 lg:grid-cols-5">
        <Info label="Serveur">
          <Link href={`/servers/${incident.server_id}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
            <Server size={14} /> {incident.server_name}
          </Link>
        </Info>
        <Info label="Adresse / OS">
          {[incident.server_ip, incident.server_os].filter(Boolean).join(" · ") || "Non renseigné"}
        </Info>
        <Info label="Détecté le">{formatDateTime(new Date(incident.detected_at).getTime())}</Info>
        <Info label="Méthode">{METHOD_LABELS[incident.method]}</Info>
        <Info label="Durée">{formatDuration(incident.detected_at, incident.resolved_at)}</Info>
      </dl>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
        <div className="space-y-5">
          <section className="rounded-lg border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold">Mesures autour de la détection</h2>
                <p className="mt-1 text-xs text-muted">Fenêtre de 15 minutes avant et jusqu’à 30 minutes après.</p>
              </div>
              <span className="font-mono text-xs text-muted">{data.points.length} points</span>
            </div>
            {rows.length > 0 ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {series.map((item) => (
                  <ChartCard
                    key={item.key}
                    title={item.label}
                    current={`${lastValue(rows, item.key)?.toFixed(1) ?? "—"} %`}
                  >
                    <TimeChart
                      rows={rows}
                      range="1h"
                      unit="%"
                      domain={[0, 100]}
                      series={[item]}
                    />
                  </ChartCard>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-md border border-border bg-bg p-4 text-sm text-muted">
                Aucune mesure n’est disponible dans cette fenêtre temporelle.
              </p>
            )}
          </section>

          {incident.ai_summary && (
            <section className="rounded-lg border border-border bg-surface p-4">
              <h2 className="font-semibold">Résumé</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{incident.ai_summary}</p>
            </section>
          )}
        </div>

        <aside className="space-y-5">
          <section className="rounded-lg border border-border bg-surface p-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <Clock3 size={17} className="text-primary" /> Chronologie
            </h2>
            <ol className="mt-4 space-y-4 border-l border-border pl-4">
              <li className="relative">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-warning" />
                <p className="text-sm font-medium">Incident détecté</p>
                <p className="mt-1 text-xs text-muted">{formatDateTime(new Date(incident.detected_at).getTime())}</p>
              </li>
              {incident.resolved_at ? (
                <li className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-success" />
                  <p className="flex items-center gap-1.5 text-sm font-medium"><Check size={14} /> Incident résolu</p>
                  <p className="mt-1 text-xs text-muted">{formatDateTime(new Date(incident.resolved_at).getTime())}</p>
                </li>
              ) : (
                <li className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-danger" />
                  <p className="flex items-center gap-1.5 text-sm font-medium"><TriangleAlert size={14} /> Surveillance en cours</p>
                  <p className="mt-1 text-xs text-muted">L’incident est toujours ouvert.</p>
                </li>
              )}
            </ol>
          </section>

          <section className="rounded-lg border border-border bg-surface p-4">
            <h2 className="font-semibold">Dernières mesures proches</h2>
            <p className="mt-1 text-xs text-muted">Échantillon le plus proche de la détection</p>
            <p className="mt-4 text-sm leading-6">{currentValues}</p>
            {nearestPoint && (
              <p className="mt-2 text-xs text-muted">{formatDateTime(new Date(nearestPoint.ts).getTime())}</p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
