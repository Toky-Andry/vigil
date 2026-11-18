import { EventEmitter } from "node:events";

export type LiveEvent =
  | { type: "metric"; server_id: string }
  | { type: "incident"; action: "opened" | "resolved"; server_id: string };

const emitter = new EventEmitter();

export function publish(event: LiveEvent): void {
  emitter.emit("event", event);
}

export function subscribe(listener: (event: LiveEvent) => void): () => void {
  emitter.on("event", listener);
  return () => emitter.off("event", listener);
}