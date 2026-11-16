type Props = { label: string; value: number | null };

function barColor(v: number): string {
  if (v >= 90) return "bg-danger";
  if (v >= 75) return "bg-warning";
  return "bg-primary-strong";
}

export function Meter({ label, value }: Props) {
  const v = value ?? 0;
  return (
    <div>
      <div className="flex justify-between font-mono text-xs text-muted">
        <span>{label}</span>
        <span className="text-text">{value === null ? "--" : `${value.toFixed(1)}%`}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-border">
        <div
          className={`h-1.5 rounded-full ${barColor(v)}`}
          style={{ width: `${Math.min(100, v)}%` }}
        />
      </div>
    </div>
  );
}