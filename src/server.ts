import path from "node:path";
import { mkdir } from "node:fs/promises";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import rateLimit from "@fastify/rate-limit";
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

async function main() {
  const app = Fastify({ logger: true });

  // Plugins
  await app.register(cors, { origin: true, credentials: true });
  await app.register(cookie);
  await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

  // Garante que o diretório de uploads existe antes de registrar o static
  const uploadsRoot = path.resolve(process.env.UPLOAD_DIR || "./uploads");
  await mkdir(uploadsRoot, { recursive: true });
  await app.register(fastifyStatic, {
    root: uploadsRoot,
    prefix: "/uploads/",
  });
  await app.register(rateLimit, {
    global: false,
    redis: undefined, // usa memory store para dev; Redis em produção
  });

  // Error handler
  app.setErrorHandler(errorHandler);

  // Rotas REST
  await app.register(authRoutes);
  await app.register(quizRoutes);
  await app.register(sessionRoutes);
  await app.register(reportRoutes);
  await app.register(uploadRoutes);

  // Health check (inclui Redis)
  app.get("/api/health", async () => {
    const redisOk = redis.status === "ready" || redis.status === "connect";
    return { status: redisOk ? "ok" : "degraded", redis: redisOk };
  });

  // Socket.IO
  const io = new SocketIOServer(app.server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  registerHostGateway(io.of("/host"));
  registerPlayGateway(io.of("/play"));

  // Redis — conecta se ainda não estiver conectado
  redis.on("error", (err) => {
    app.log.error({ err }, "Redis connection error");
  });

  if (redis.status !== "ready" && redis.status !== "connect") {
    await redis.connect();
    app.log.info("Redis connected");
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down...`);
    await Promise.allSettled([
      io.close(),
      redis.quit(),
      app.close(),
    ]);
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Start
  await app.listen({ port: env.PORT, host: env.HOST });
  app.log.info(`Server running on http://${env.HOST}:${env.PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
