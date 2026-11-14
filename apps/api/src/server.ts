import Fastify from "fastify";
import { config } from "./config.js";
import { pool } from "./db.js";
import { ingestRoutes } from "./routes/ingest.js";

const app = Fastify({ logger: true, bodyLimit: 16 * 1024 });

app.get("/health", async (_req, reply) => {
  try {
    await pool.query("SELECT 1");
    return { status: "ok" };
  } catch {
    return reply.code(503).send({ status: "db_unavailable" });
  }
});

await app.register(ingestRoutes, { prefix: "/api/v1" });

const close = async () => {
  await app.close();
  await pool.end();
  process.exit(0);
};
process.on("SIGINT", close);
process.on("SIGTERM", close);

await app.listen({ port: config.PORT, host: config.HOST });