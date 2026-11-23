"use client";

import { useLiveStatus } from "@/hooks/use-live-status";

export function LiveIndicator() {
  const live = useLiveStatus();
  return (
    <span className="flex items-center gap-2 font-mono text-xs text-muted">
      <span className={`h-2 w-2 rounded-full ${live ? "bg-success" : "bg-muted/50"}`} />
      {live ? "Live" : "Hors ligne"}
    </span>
  );
}
