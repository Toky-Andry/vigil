"use client";

import { useCallback } from "react";
import { useLiveCount } from "@/hooks/use-live-count";
import { FALLBACK_POLL_MS, usePolling } from "@/hooks/use-polling";
import { fetchIncidents, type IncidentStatus } from "@/lib/incidents-api";

export function useIncidents(status: IncidentStatus, limit = 50) {
  const live = useLiveCount("incident");
  const fetcher = useCallback(
    (signal: AbortSignal) => fetchIncidents(status, signal, limit),
    [status, limit],
  );
  const { data, error } = usePolling(fetcher, FALLBACK_POLL_MS, live);
  return { incidents: data, error };
}
