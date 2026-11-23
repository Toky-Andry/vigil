import type { ReactNode } from "react";

type Props = { title: string; current: string; children: ReactNode };

export function ChartCard({ title, current, children }: Props) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        <span className="font-mono text-sm text-muted">{current}</span>
      </header>
      <div className="h-56">{children}</div>
    </section>
  );
}
