"use client";

import { useEffect, useState } from "react";

type Fetcher<T> = (signal: AbortSignal) => Promise<T>;

// Filet de sécurité : rechargement lent si le WebSocket est coupé.
export const FALLBACK_POLL_MS = 30_000;

// Appelle `fetcher` tout de suite puis toutes les `intervalMs` millisecondes.
// `fetcher` doit être stable (useCallback). Quand `refreshKey` change
// (événement WebSocket), les données sont rechargées immédiatement.
export function usePolling<T>(fetcher: Fetcher<T>, intervalMs: number, refreshKey = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        setData(await fetcher(controller.signal));
        setError(null);
      } catch (e) {
        if (!controller.signal.aborted) setError((e as Error).message);
      }
    }

    void load();
    const timer = setInterval(load, intervalMs);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [fetcher, intervalMs, refreshKey]);

  return { data, error };
}