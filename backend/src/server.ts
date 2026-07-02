import path from "node:path";
import { mkdir } from "node:fs/promises";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { Server as SocketIOServer } from "socket.io";
import { env } from "./config/env";
import { redis } from "./redis/client";
import { errorHandler } from "./middleware/error-handler";
import { authRoutes } from "./modules/auth/auth.routes";
import { quizRoutes } from "./modules/quiz/quiz.routes";
import { sessionRoutes } from "./modules/session/session.routes";
import { reportRoutes } from "./modules/report/report.routes";
import { uploadRoutes } from "./modules/upload/upload.routes";
import { registerHostGateway } from "./modules/session/session.gateway";
import { registerPlayGateway } from "./modules/gameplay/gameplay.gateway";

const MB = 1024 * 1024;
const LOGGER_CONFIG = {
  transport: {
    target: "pino-pretty",
    options: { colorize: true, translateTime: "HH:MM:ss" },
  },
};
const BODY_LIMIT = 10 * MB;
const UPLOAD_FILE_SIZE_LIMIT = 5 * MB;
const WS_PING_TIMEOUT = 30_000;
const WS_PING_INTERVAL = 10_000;

const ROUTE_MODULES = [
  authRoutes,
  quizRoutes,
  sessionRoutes,
  reportRoutes,
  uploadRoutes,
];

async function registerPlugins(app: FastifyInstance) {
  await app.register(cors, { origin: true, credentials: true });
  await app.register(cookie);
  await app.register(multipart, {
    limits: { fileSize: UPLOAD_FILE_SIZE_LIMIT },
  });

  const uploadsRoot = path.resolve(process.env.UPLOAD_DIR || "./uploads");
  await mkdir(uploadsRoot, { recursive: true });
  await app.register(fastifyStatic, { root: uploadsRoot, prefix: "/uploads/" });
  await app.register(rateLimit, { global: false, redis: undefined });

  await app.register(swagger, {
    openapi: {
      info: {
        title: "N-de-Água API",
        version: "1.0.0",
        description: "API do sistema de quizzes N-de-Água",
      },
      servers: [{ url: `http://${env.HOST}:${env.PORT}` }],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
  });
}

function createSocketServer(app: FastifyInstance) {
  const io = new SocketIOServer(app.server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    pingTimeout: WS_PING_TIMEOUT,
    pingInterval: WS_PING_INTERVAL,
  });

  registerHostGateway(io.of("/host"));
  registerPlayGateway(io.of("/play"));

  return io;
}

async function main() {
  const app = Fastify({ logger: LOGGER_CONFIG, bodyLimit: BODY_LIMIT });

  await registerPlugins(app);
  app.setErrorHandler(errorHandler);

  for (const register of ROUTE_MODULES) {
    await app.register(register);
  }

  app.get("/api/health", {
    schema: { tags: ["health"] },
  }, async () => {
    const redisOk = redis.status === "ready" || redis.status === "connect";
    return { status: redisOk ? "ok" : "degraded", redis: redisOk };
  });

  const io = createSocketServer(app);

  redis.on("error", (err) => {
    app.log.error({ err }, "Redis connection error");
  });

  if (redis.status !== "ready" && redis.status !== "connect") {
    await redis.connect();
    app.log.info("Redis connected");
  }

  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down...`);
    await Promise.allSettled([io.close(), redis.quit(), app.close()]);
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  await app.listen({ port: env.PORT, host: env.HOST });
  app.log.info(`Server running on http://${env.HOST}:${env.PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
