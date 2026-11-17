"use client";

import { useSyncExternalStore } from "react";
import { getCount, subscribeLive, type Topic } from "@/lib/live-socket";

// Renvoie un compteur qui augmente à chaque événement reçu sur ces sujets.
export function useLiveCount(...topics: Topic[]): number {
  return useSyncExternalStore(
    subscribeLive,
    () => topics.reduce((sum, t) => sum + getCount(t), 0),
    () => 0,
  );
}