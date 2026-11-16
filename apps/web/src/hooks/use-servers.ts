"use client";

import { useEffect, useState } from "react";
import { fetchServers, type ServerSummary } from "@/lib/api";

const REFRESH_MS = 5_000;

export function useServers() {
  const [servers, setServers] = useState<ServerSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        setServers(await fetchServers(controller.signal));
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
  }, []);

  return { servers, error };
}