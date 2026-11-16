import type { RangeKey } from "@/lib/api";

const RANGES: RangeKey[] = ["1h", "6h", "24h", "7d"];

type Props = { value: RangeKey; onChange: (r: RangeKey) => void };

export function RangePicker({ value, onChange }: Props) {
  return (
    <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
      {RANGES.map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={`rounded px-3 py-1 font-mono text-xs ${
            r === value ? "bg-primary-strong text-bg" : "text-muted hover:text-text"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}