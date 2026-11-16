"use client";

import { useEffect, useState } from "react";
import { fetchMetrics, type MetricsResponse, type RangeKey } from "@/lib/api";

const REFRESH_MS = 10_000;

export function useMetrics(id: string, range: RangeKey) {
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        setData(await fetchMetrics(id, range, controller.signal));
        setError(null);
      } catch (e) {
        if (!controller.signal.aborted) setError((e as Error).message);
      }
    }

    void load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [id, range]);

  return { data, error };
}