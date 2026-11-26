import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { startAlertEngine } from "./alerts/scheduler.js";
import { config, corsOrigins } from "./config.js";
import { pool } from "./db.js";
import { incidentRoutes } from "./routes/incidents.js";
import { evaluationRoutes } from "./routes/evaluation.js";
import { ingestRoutes } from "./routes/ingest.js";
import { serverRoutes } from "./routes/servers.js";
import { streamRoutes } from "./routes/stream.js";
import { internalRoutes } from "./routes/internal.js";
import { settingsRoutes } from "./routes/settings.js";

const app = Fastify({ logger: true, bodyLimit: 16 * 1024 });

app.get("/health", async (_req, reply) => {
  try {
    await pool.query("SELECT 1");
    return { status: "ok" };
  } catch {
    return reply.code(503).send({ status: "db_unavailable" });
  }
});

await app.register(cors, { origin: corsOrigins });
await app.register(websocket);

await app.register(ingestRoutes, { prefix: "/api/v1" });
await app.register(serverRoutes, { prefix: "/api/v1" });
await app.register(incidentRoutes, { prefix: "/api/v1" });
await app.register(evaluationRoutes, { prefix: "/api/v1" });
await app.register(settingsRoutes, { prefix: "/api/v1" });
await app.register(streamRoutes);
await app.register(internalRoutes, { prefix: "/internal/v1" });

const stopAlerts = startAlertEngine(app.log);

const close = async () => {
  stopAlerts();
  await app.close();
  await pool.end();
  process.exit(0);
};
process.on("SIGINT", close);
process.on("SIGTERM", close);

await app.listen({ port: config.PORT, host: config.HOST });
