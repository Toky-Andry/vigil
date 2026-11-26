"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, CircleHelp, RefreshCw, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { fetchAlertRules, fetchApiHealth, type AlertRule } from "@/lib/settings-api";

const METRICS: Record<string, string> = {
  cpu_pct: "CPU",
  ram_pct: "RAM",
  disk_pct: "Disque",
};

const SEVERITIES: Record<AlertRule["severity"], string> = {
  info: "Information",
  warning: "Avertissement",
  critical: "Critique",
};

function formatDuration(seconds: number): string {
  if (seconds % 3600 === 0) return `${seconds / 3600} h`;
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  return `${seconds} s`;
}

export function SettingsView() {
  const [rules, setRules] = useState<AlertRule[] | null>(null);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const reload = useCallback(() => setRefresh((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([fetchAlertRules(controller.signal), fetchApiHealth(controller.signal)])
      .then(([loadedRules, online]) => {
        setRules(loadedRules);
        setApiOnline(online);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Impossible de charger la configuration");
        }
      });
    return () => controller.abort();
  }, [refresh]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">Configuration Vigil</p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Settings</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Consulte l’état de l’API et les règles d’alerte actives pour cette installation.
          </p>
        </div>
        <button
          type="button"
          onClick={reload}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm hover:border-primary"
        >
          <RefreshCw size={15} /> Actualiser
        </button>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <article className="rounded-lg border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            {apiOnline
              ? <CheckCircle2 size={19} className="text-success" />
              : <AlertTriangle size={19} className="text-warning" />}
            <h2 className="font-semibold">Connexion API</h2>
          </div>
          <p className="mt-3 text-sm text-muted">
            {apiOnline === null ? "Vérification…" : apiOnline ? "API et base de données disponibles" : "API indisponible"}
          </p>
          <p className="mt-1 font-mono text-xs text-muted">http://localhost:4000</p>
        </article>

        <article className="rounded-lg border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <ShieldCheck size={19} className="text-primary" />
            <h2 className="font-semibold">Accès à la configuration</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">
            Cette page affiche les règles actives en lecture seule. Vigil n’a pas encore de connexion utilisateur;
            l’édition des règles sera disponible lorsqu’un contrôle d’accès sera en place.
          </p>
        </article>
      </section>

      <section className="mt-8">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={17} className="text-primary" />
          <h2 className="text-lg font-semibold">Règles d’alerte actives</h2>
        </div>
        <p className="mt-1 text-sm text-muted">Ces valeurs sont chargées depuis la base de données de Vigil.</p>

        {error && <p className="mt-4 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger">Erreur : {error}</p>}
        {!rules && !error && <p className="mt-4 text-sm text-muted">Chargement des règles…</p>}
        {rules?.length === 0 && (
          <p className="mt-4 rounded-md border border-border bg-surface p-4 text-sm text-muted">
            Aucune règle active n’est configurée dans la base de données.
          </p>
        )}
        {rules && rules.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b border-border bg-bg text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Règle</th>
                  <th className="px-4 py-3 font-medium">Seuil</th>
                  <th className="px-4 py-3 font-medium">Durée</th>
                  <th className="px-4 py-3 font-medium">Sévérité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rules.map((rule) => (
                  <tr key={rule.id}>
                    <td className="px-4 py-3 font-medium">{rule.name || METRICS[rule.metric] || rule.metric}</td>
                    <td className="px-4 py-3 font-mono">
                      {METRICS[rule.metric] ?? rule.metric} {rule.operator} {rule.threshold}%
                    </td>
                    <td className="px-4 py-3">{formatDuration(rule.duration_s)}</td>
                    <td className="px-4 py-3">{SEVERITIES[rule.severity]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <aside className="mt-6 flex items-start gap-3 rounded-lg border border-border bg-surface/60 p-4 text-sm text-muted">
        <CircleHelp size={17} className="mt-0.5 shrink-0 text-primary" />
        <p className="leading-6">
          Les paramètres EWMA et Isolation Forest sont présentés dans{" "}
          <Link href="/methods" className="font-medium text-primary hover:underline">Detection methods</Link>.
          Ils se règlent dans la configuration du service Python.
        </p>
      </aside>
    </>
  );
}
