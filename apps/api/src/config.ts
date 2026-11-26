import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().default(4000),
  HOST: z.string().default("0.0.0.0"),
  CORS_ORIGINS: z.string().default("http://localhost:3000,http://127.0.0.1:3000"),
  VIGIL_INTERNAL_TOKEN: z.string().min(32).optional(),
});

export const config = schema.parse(process.env);
export const corsOrigins = config.CORS_ORIGINS.split(",").map((o) => o.trim());
