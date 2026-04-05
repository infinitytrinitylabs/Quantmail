import fs from "node:fs";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { authRoutes } from "./routes/auth";
import { inboxRoutes } from "./routes/inbox";
import { digitalTwinRoutes } from "./routes/digitalTwin";
import { iotRoutes } from "./routes/iot";
import { quanteditsRoutes } from "./routes/quantedits";
import { pushRoutes } from "./routes/push";
import { quanttubeRoutes } from "./routes/quanttube";

/** Build TLS options when certificate/key paths are supplied via env vars. */
function buildHttpsOptions():
  | { key: string; cert: string; ca?: string }
  | undefined {
  const keyPath = process.env["TLS_KEY_PATH"];
  const certPath = process.env["TLS_CERT_PATH"];
  if (!keyPath || !certPath) return undefined;

  return {
    key: fs.readFileSync(keyPath, "utf8"),
    cert: fs.readFileSync(certPath, "utf8"),
    ...(process.env["TLS_CA_PATH"]
      ? { ca: fs.readFileSync(process.env["TLS_CA_PATH"], "utf8") }
      : {}),
  };
}

const httpsOptions = buildHttpsOptions();

const app = Fastify({
  logger: true,
  // Enforce a 1 MB request body limit across all routes.
  bodyLimit: 1_048_576,
  ...(httpsOptions ? { https: httpsOptions } : {}),
});

async function main(): Promise<void> {
  // Security headers (HSTS, X-Frame-Options, CSP, etc.)
  await app.register(helmet);

  // Global rate limit: 200 requests per minute per IP.
  // Auth-specific endpoints apply a stricter limit (see routes/auth.ts).
  await app.register(rateLimit, {
    max: 200,
    timeWindow: "1 minute",
  });

  await app.register(cors, { origin: true });
  await app.register(authRoutes);
  await app.register(inboxRoutes);
  await app.register(digitalTwinRoutes);
  await app.register(iotRoutes);
  await app.register(quanteditsRoutes);
  await app.register(pushRoutes);
  await app.register(quanttubeRoutes);

  app.get("/health", async () => ({ status: "ok", service: "quantmail" }));

  const port = parseInt(process.env["PORT"] || "3000", 10);
  await app.listen({ port, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
