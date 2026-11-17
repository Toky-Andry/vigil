"use client";

import { useCallback } from "react";
import { useLiveCount } from "@/hooks/use-live-count";
import { FALLBACK_POLL_MS, usePolling } from "@/hooks/use-polling";
import { fetchServers } from "@/lib/api";

export function useServers() {
  const live = useLiveCount("metric", "incident");
  const fetcher = useCallback((signal: AbortSignal) => fetchServers(signal), []);
  const { data, error } = usePolling(fetcher, FALLBACK_POLL_MS, live);
  return { servers: data, error };
}