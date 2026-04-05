import Fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { authRoutes } from "./routes/auth";
import { inboxRoutes } from "./routes/inbox";
import { digitalTwinRoutes } from "./routes/digitalTwin";
import { iotRoutes } from "./routes/iot";
import { quanteditsRoutes } from "./routes/quantedits";
import { pushRoutes } from "./routes/push";
import { quanttubeRoutes } from "./routes/quanttube";
import { prisma } from "./db";

const isProduction = process.env["NODE_ENV"] === "production";

const app = Fastify({
  logger: {
    level: process.env["LOG_LEVEL"] || (isProduction ? "info" : "debug"),
    ...(isProduction
      ? {}
      : {
          transport: {
            target: "pino-pretty",
            options: { colorize: true },
          },
        }),
  },
});

const allowedOrigins = process.env["CORS_ORIGINS"]
  ? process.env["CORS_ORIGINS"].split(",").map((o) => o.trim())
  : ["http://localhost:3000", "http://localhost:5173"];

async function main(): Promise<void> {
  // CORS – strict in production, permissive in development
  await app.register(cors, {
    origin: isProduction ? allowedOrigins : true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  // OpenAPI / Swagger
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Quantmail API",
        description: "Quantmail – Biometric Identity Gateway REST API",
        version: "1.0.0",
      },
      servers: [
        { url: "http://localhost:3000", description: "Local development" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: { docExpansion: "list", deepLinking: true },
  });

  // Feature routes
  await app.register(authRoutes);
  await app.register(inboxRoutes);
  await app.register(digitalTwinRoutes);
  await app.register(iotRoutes);
  await app.register(quanteditsRoutes);
  await app.register(pushRoutes);
  await app.register(quanttubeRoutes);

  // Health check – verifies DB connectivity
  app.get(
    "/health",
    {
      schema: {
        description: "Health check endpoint – verifies service and DB status",
        tags: ["system"],
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string" },
              service: { type: "string" },
              db: { type: "string" },
              uptime: { type: "number" },
              timestamp: { type: "string" },
            },
          },
          503: {
            type: "object",
            properties: {
              status: { type: "string" },
              service: { type: "string" },
              db: { type: "string" },
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      let dbStatus = "ok";
      let dbError: string | undefined;
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch (err) {
        dbStatus = "error";
        dbError = err instanceof Error ? err.message : String(err);
        app.log.error({ err }, "Health check – DB connectivity failed");
      }

      const payload = {
        status: dbStatus === "ok" ? "ok" : "degraded",
        service: "quantmail",
        db: dbStatus,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        ...(dbError ? { error: dbError } : {}),
      };

      return reply.code(dbStatus === "ok" ? 200 : 503).send(payload);
    }
  );

  const port = parseInt(process.env["PORT"] || "3000", 10);
  await app.listen({ port, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
