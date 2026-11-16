import type { MetricPoint } from "./api";

export type Row = {
  t: number;
  cpu: number | null;
  ram: number | null;
  disk: number | null;
  rx: number | null;
  tx: number | null;
};
export type RowKey = keyof Omit<Row, "t">;

const EMPTY = { cpu: null, ram: null, disk: null, rx: null, tx: null };

// Insère un point vide quand l'agent n'a rien envoyé : la ligne est coupée
// au lieu de relier deux mesures éloignées dans le temps.
export function toRows(points: MetricPoint[], bucketS: number): Row[] {
  const rows: Row[] = [];
  let prev: number | null = null;
  for (const p of points) {
    const t = new Date(p.ts).getTime();
    if (prev !== null && t - prev > bucketS * 3000) {
      rows.push({ t: prev + bucketS * 1000, ...EMPTY });
    }
    rows.push({
      t,
      cpu: p.cpu_pct,
      ram: p.ram_pct,
      disk: p.disk_pct,
      rx: p.net_rx_bps,
      tx: p.net_tx_bps,
    });
    prev = t;
  }
  return rows;
}

// bits/s -> kbit/s ou Mbit/s selon l'ordre de grandeur des données
export function scaleNetwork(rows: Row[]): { rows: Row[]; unit: string } {
  const max = Math.max(0, ...rows.flatMap((r) => [r.rx ?? 0, r.tx ?? 0]));
  const mbit = max >= 1_000_000;
  const div = mbit ? 1_000_000 : 1_000;
  const scale = (v: number | null) => (v === null ? null : v / div);
  return {
    unit: mbit ? "Mbit/s" : "kbit/s",
    rows: rows.map((r) => ({ ...r, rx: scale(r.rx), tx: scale(r.tx) })),
  };
}

export function lastValue(rows: Row[], key: RowKey): number | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const v = rows[i][key];
    if (v !== null) return v;
  }
  return null;
}