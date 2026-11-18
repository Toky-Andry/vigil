import type { FastifyInstance } from "fastify";
import { corsOrigins } from "../config.js";
import { subscribe } from "../events/bus.js";

// Les navigateurs n'appliquent pas CORS aux WebSockets : on vérifie l'origine ici.
export async function streamRoutes(app: FastifyInstance) {
  app.get("/ws", { websocket: true }, (socket, req) => {
    const origin = req.headers.origin;
    if (origin && !corsOrigins.includes(origin)) {
      socket.close(1008, "origin not allowed");
      return;
    }
    const unsubscribe = subscribe((event) => {
      if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(event));
    });
    socket.on("close", unsubscribe);
    socket.on("error", unsubscribe);
  });
}