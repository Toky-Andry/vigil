import { API_URL } from "./api";

export type Topic = "metric" | "incident";

const WS_URL = `${API_URL.replace(/^http/, "ws")}/ws`;
const MAX_DELAY_MS = 30_000;

const counters: Record<Topic, number> = { metric: 0, incident: 0 };
const listeners = new Set<() => void>();
let socket: WebSocket | null = null;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let attempt = 0;
let hasConnected = false;
let connected = false;

const notify = () => listeners.forEach((l) => l());

function bump(topics: Topic[]) {
  topics.forEach((t) => (counters[t] += 1));
  notify();
}

function onMessage(ev: MessageEvent) {
  try {
    const { type } = JSON.parse(String(ev.data)) as { type: Topic };
    if (type in counters) bump([type]);
  } catch {
    // message illisible : ignoré
  }
}

function connect() {
  socket = new WebSocket(WS_URL);
  socket.onopen = () => {
    attempt = 0;
    connected = true;
    // Après une coupure, des événements ont pu être manqués : on resynchronise.
    if (hasConnected) bump(["metric", "incident"]);
    hasConnected = true;
    notify();
  };
  socket.onmessage = onMessage;
  socket.onclose = () => {
    socket = null;
    connected = false;
    notify();
    if (listeners.size === 0) return;
    retryTimer = setTimeout(connect, Math.min(MAX_DELAY_MS, 1000 * 2 ** attempt++));
  };
}

// Une seule connexion partagée par tous les composants de la page.
export function subscribeLive(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1 && !socket) connect();
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    clearTimeout(retryTimer);
    socket?.close();
  };
}

export const getCount = (topic: Topic) => counters[topic];
export const getConnected = () => connected;
