import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { pool } from "./db.js";
import { ingestRoutes } from "./routes/ingest.js";
import { serverRoutes } from "./routes/servers.js";

const app = Fastify({ logger: true, bodyLimit: 16 * 1024 });

app.get("/health", async (_req, reply) => {
  try {
    await pool.query("SELECT 1");
    return { status: "ok" };
  } catch {
    return reply.code(503).send({ status: "db_unavailable" });
  }
});

await app.register(cors, {
  origin: config.CORS_ORIGINS.split(",").map((o) => o.trim()),
});

await app.register(ingestRoutes, { prefix: "/api/v1" });
await app.register(serverRoutes, { prefix: "/api/v1" });

const close = async () => {
  await app.close();
  await pool.end();
  process.exit(0);
};
process.on("SIGINT", close);
process.on("SIGTERM", close);

await app.listen({ port: config.PORT, host: config.HOST });