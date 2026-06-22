import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { Server as SocketIOServer } from "socket.io";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { authRoutes } from "./modules/auth/auth.routes";
import { quizRoutes } from "./modules/quiz/quiz.routes";
import { sessionRoutes } from "./modules/session/session.routes";
import { reportRoutes } from "./modules/report/report.routes";
import { registerHostGateway } from "./modules/session/session.gateway";
import { registerPlayGateway } from "./modules/gameplay/gameplay.gateway";

async function main() {
  const app = Fastify({ logger: true });

  // Plugins
  await app.register(cors, { origin: true, credentials: true });
  await app.register(cookie);
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

  // Health check
  app.get("/api/health", async () => ({ status: "ok" }));

  // Socket.IO
  const io = new SocketIOServer(app.server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  registerHostGateway(io.of("/host"));
  registerPlayGateway(io.of("/play"));

  // Start
  await app.listen({ port: env.PORT, host: env.HOST });
  console.log(`Server running on http://${env.HOST}:${env.PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
