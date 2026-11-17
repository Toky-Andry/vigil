"use client";

import { useCallback } from "react";
import { useLiveCount } from "@/hooks/use-live-count";
import { FALLBACK_POLL_MS, usePolling } from "@/hooks/use-polling";
import { fetchMetrics, type RangeKey } from "@/lib/api";

export function useMetrics(id: string, range: RangeKey) {
  const live = useLiveCount("metric");
  const fetcher = useCallback(
    (signal: AbortSignal) => fetchMetrics(id, range, signal),
    [id, range],
  );
  return usePolling(fetcher, FALLBACK_POLL_MS, live);
}