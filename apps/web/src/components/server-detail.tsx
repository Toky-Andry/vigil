"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChartCard } from "@/components/charts/chart-card";
import { TimeChart } from "@/components/charts/time-chart";
import { RangePicker } from "@/components/range-picker";
import { useMetrics } from "@/hooks/use-metrics";
import type { RangeKey } from "@/lib/api";
import { lastValue, scaleNetwork, toRows } from "@/lib/chart-data";
import { formatPct } from "@/lib/format";

const PERCENT_CHARTS = [
  { title: "CPU", key: "cpu", color: "#4d8eff" },
  { title: "Mémoire (RAM)", key: "ram", color: "#4ae176" },
  { title: "Disque", key: "disk", color: "#ffb3ad" },
] as const;

const NETWORK_SERIES = [
  { key: "rx", label: "Réception", color: "#adc6ff" },
  { key: "tx", label: "Émission", color: "#ffb4ab" },
] as const;

export function ServerDetail({ id }: { id: string }) {
  const [range, setRange] = useState<RangeKey>("1h");
  const { data, error } = useMetrics(id, range);
  const base = useMemo(() => (data ? toRows(data.points, data.bucket_s) : []), [data]);
  const { rows, unit } = useMemo(() => scaleNetwork(base), [base]);
  const net = (k: "rx" | "tx") => (lastValue(rows, k) ?? 0).toFixed(1);

  return (
    <>
      <Link href="/" className="text-sm text-primary hover:underline">
        ← Overview
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{data?.server.name ?? "Serveur"}</h1>
        <RangePicker value={range} onChange={setRange} />
      </div>

      {error && !data && <p className="mt-6 text-sm text-danger">Erreur : {error}</p>}
      {!data && !error && <p className="mt-6 text-sm text-muted">Chargement…</p>}
      {data && rows.length === 0 && (
        <p className="mt-6 text-sm text-muted">Aucune mesure sur cette période.</p>
      )}

      {rows.length > 0 && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {PERCENT_CHARTS.map((c) => (
            <ChartCard key={c.key} title={c.title} current={formatPct(lastValue(rows, c.key))}>
              <TimeChart
                rows={rows}
                range={range}
                unit="%"
                domain={[0, 100]}
                series={[{ key: c.key, label: c.title, color: c.color }]}
              />
            </ChartCard>
          ))}
          <ChartCard title="Réseau" current={`↓ ${net("rx")} · ↑ ${net("tx")} ${unit}`}>
            <TimeChart
              rows={rows}
              range={range}
              unit={unit}
              domain={[0, "auto"]}
              series={[...NETWORK_SERIES]}
            />
          </ChartCard>
        </div>
      )}
    </>
  );
}