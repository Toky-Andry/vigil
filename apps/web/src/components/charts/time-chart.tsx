"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RangeKey } from "@/lib/api";
import type { Row, RowKey } from "@/lib/chart-data";
import { formatDateTime, formatTick } from "@/lib/format";

export type Series = { key: RowKey; label: string; color: string };

type Props = {
  rows: Row[];
  series: Series[];
  range: RangeKey;
  unit: string;
  domain: [number, number | "auto"];
};

const TOOLTIP_STYLE = {
  background: "#1c1f2a",
  border: "1px solid #424754",
  borderRadius: 8,
  fontSize: 12,
};

export function TimeChart({ rows, series, range, unit, domain }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#424754" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="t"
          type="number"
          scale="time"
          domain={["dataMin", "dataMax"]}
          tickFormatter={(t: number) => formatTick(t, range)}
          stroke="#c2c6d6"
          fontSize={11}
        />
        <YAxis domain={domain} stroke="#c2c6d6" fontSize={11} width={44} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelFormatter={(t) => formatDateTime(Number(t))}
          formatter={(v) => (typeof v === "number" ? `${v.toFixed(1)} ${unit}` : "—")}
        />
        {series.map((s) => (
          <Line
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}