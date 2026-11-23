"use client";

import { useSyncExternalStore } from "react";
import { getConnected, subscribeLive } from "@/lib/live-socket";

// true quand le WebSocket est connecté à l'API.
export function useLiveStatus(): boolean {
  return useSyncExternalStore(subscribeLive, getConnected, () => false);
}
