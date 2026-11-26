"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Clock3, Database, RefreshCw, ShieldAlert, TreeDeciduous } from "lucide-react";
import {
  fetchMethodsSummary,
  type DetectionMethodKey,
  type MethodEvaluation,
  type MethodsSummary,
} from "@/lib/methods-api";

const METHOD_INFO: {
  key: DetectionMethodKey;
  title: string;
  kind: string;
  color: string;
  icon: typeof Activity;
  description: string;
  behavior: string;
  configuration: string[];
}[] = [
  {
    key: "static",
    title: "Seuils fixes",
    kind: "Règles déterministes · API Node",
    color: "text-primary",
    icon: ShieldAlert,
    description: "Compare directement chaque mesure à des limites configurées.",
    behavior: "Une règle se déclenche quand toutes les mesures de sa fenêtre dépassent le seuil et que la couverture attendue est suffisante.",
    configuration: ["CPU > 85 % pendant 300 s", "RAM > 90 % pendant 300 s", "Disque > 90 % pendant 600 s"],
  },
  {
    key: "ewma",
    title: "EWMA",
    kind: "Référence adaptative · Service Python",
    color: "text-success",
    icon: Activity,
    description: "Repère un changement important par rapport au niveau habituel récent du serveur.",
    behavior: "La moyenne mobile évolue avec les mesures normales et se fige sur une métrique pendant l’anomalie. L’incident se résout après trois mesures normales.",
    configuration: ["30 mesures de démarrage", "Alpha : 0,2", "Écart minimal : 12 points ou 4× la variation récente"],
  },
  {
    key: "iforest",
    title: "Isolation Forest",
    kind: "Modèle multivarié · Service Python",
    color: "text-primary-strong",
    icon: TreeDeciduous,
    description: "Cherche des combinaisons inhabituelles entre plusieurs mesures du même serveur.",
    behavior: "Le modèle apprend les mesures normales et analyse CPU, RAM, disque, charge système et réseau. L’incident se résout après cinq mesures normales.",
    configuration: ["Au moins 100 mesures normales", "150 arbres · contamination : 1 %", "Jusqu’aux 2 000 mesures normales récentes"],
  },
];

const SCENARIO_LABELS: Record<string, string> = {
  cpu: "Surcharge CPU",
  memory: "Pression mémoire",
  disk: "Remplissage disque",
  agent_offline: "Agent interrompu",
  other: "Autre scénario",
};

function percent(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)} %`;
}

function metric(value: number | null, suffix: string): string {
  return value === null ? "—" : `${value.toFixed(2)} ${suffix}`;
}

function periodLabel(summary: MethodsSummary): string {
  if (!summary.period) return "Aucune période évaluée";
  const minutes = Math.max(1, Math.round(summary.period.days * 1440));
  if (minutes < 60) return `${minutes} min observées`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h observées`;
  return `${summary.period.days.toFixed(1)} jours observés`;
}

function MethodCard({
  item,
  stats,
  experimentCount,
}: {
  item: (typeof METHOD_INFO)[number];
  stats: MethodEvaluation;
  experimentCount: number;
}) {
  const Icon = item.icon;
  const values = [
    { label: "Rappel événementiel", value: percent(stats.recall) },
    { label: "Précision événementielle", value: percent(stats.event_precision) },
    { label: "Délai moyen", value: metric(stats.mean_detection_delay_s, "s") },
    { label: "Fausses alertes / jour", value: metric(stats.false_alerts_per_day, "/j") },
  ];

  return (
    <article className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`rounded-md bg-bg p-2 ${item.color}`}><Icon size={20} /></span>
          <div>
            <h2 className="font-semibold">{item.title}</h2>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">{item.kind}</p>
          </div>
        </div>
        <span className="rounded border border-border px-2 py-1 font-mono text-[10px] text-muted">
          {stats.detected_experiments}/{experimentCount} essais
        </span>
      </div>

      <p className="mt-4 text-sm leading-6 text-muted">{item.description}</p>
      <p className="mt-3 text-sm leading-6">{item.behavior}</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {values.map((value) => (
          <div key={value.label} className="rounded-md border border-border bg-bg p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted">{value.label}</p>
            <p className="mt-1 font-mono text-sm font-semibold">{value.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <p className="text-xs font-semibold">Réglages actuels</p>
        <ul className="mt-2 space-y-1.5 text-xs text-muted">
          {item.configuration.map((line) => <li key={line}>• {line}</li>)}
        </ul>
      </div>
    </article>
  );
}

export function MethodsView() {
  const [summary, setSummary] = useState<MethodsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const reload = useCallback(() => setRefresh((current) => current + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    fetchMethodsSummary(controller.signal)
      .then((result) => {
        setSummary(result);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Impossible de charger l’évaluation");
        }
      });
    return () => controller.abort();
  }, [refresh]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">Évaluation des détections</p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Detection methods</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Compare les seuils fixes, EWMA et Isolation Forest à partir des expériences enregistrées dans Vigil.
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

      {summary && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-3">
            <Database size={18} className="text-primary" />
            <div>
              <p className="text-sm font-medium">
                {summary.experiment_count === 0
                  ? "Aucune expérience terminée"
                  : `${summary.experiment_count} expérience(s) enregistrée(s)`}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Les indicateurs sont calculés sur les incidents détectés pendant chaque fenêtre d’injection.
              </p>
            </div>
          </div>
          <span className="font-mono text-xs text-muted">{periodLabel(summary)}</span>
        </div>
      )}

      {error && !summary && (
        <p className="mt-6 rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          Impossible de charger les résultats : {error}
        </p>
      )}
      {!summary && !error && <p className="mt-6 text-sm text-muted">Chargement des résultats…</p>}

      {summary && summary.experiment_count === 0 && (
        <div className="mt-6 rounded-lg border border-border bg-surface p-6">
          <h2 className="font-semibold">Comment lire cette page</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Les réglages de chaque méthode sont affichés ci-dessous. Pour remplir les indicateurs, enregistre et termine une expérience de panne, puis utilise Actualiser.
          </p>
        </div>
      )}

      {summary && summary.experiment_count > 0 && (
        <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted">
          <Clock3 size={14} className="mt-0.5 shrink-0" />
          <p>
            Ces mesures sont descriptives. Avec peu d’expériences ou une période courte, précision et fausses alertes par jour restent préliminaires; elles ne constituent pas une validation statistique.
          </p>
        </div>
      )}

      {summary && (
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {METHOD_INFO.map((item) => (
            <MethodCard
              key={item.key}
              item={item}
              stats={summary.methods[item.key]}
              experimentCount={summary.experiment_count}
            />
          ))}
        </div>
      )}

      {summary && summary.scenarios.length > 0 && (
        <section className="mt-6 rounded-lg border border-border bg-surface p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <TreeDeciduous size={18} className="text-primary" />
            <div>
              <h2 className="font-semibold">Résultats par scénario</h2>
              <p className="mt-0.5 text-xs text-muted">Nombre d’expériences détectées sur le nombre terminé pour ce scénario.</p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-3 font-medium">Scénario</th>
                  <th className="px-3 py-3 font-medium">Essais</th>
                  <th className="px-3 py-3 font-medium">Seuils fixes</th>
                  <th className="px-3 py-3 font-medium">EWMA</th>
                  <th className="px-3 py-3 font-medium">Isolation Forest</th>
                </tr>
              </thead>
              <tbody>
                {summary.scenarios.map((scenario) => (
                  <tr key={scenario.scenario} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium">{SCENARIO_LABELS[scenario.scenario] ?? scenario.scenario}</td>
                    <td className="px-3 py-3 font-mono text-muted">{scenario.experiment_count}</td>
                    {METHOD_INFO.map((method) => (
                      <td key={method.key} className="px-3 py-3 font-mono">
                        {scenario.methods[method.key]}/{scenario.experiment_count}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {summary && (
        <p className="mt-4 text-xs text-muted">
          <Activity size={13} className="mr-1 inline" />
          Rappel = expériences avec détection / expériences terminées. Précision événementielle = détections dans les fenêtres / incidents de la période.
        </p>
      )}
    </>
  );
}
