import { FastifyInstance } from "fastify";
import { sessionService } from "./session.service";
import { createSessionSchema } from "./session.schema";
import { authenticate } from "../../middleware/auth";

export async function sessionRoutes(app: FastifyInstance) {
  // Rotas autenticadas (Host)
  app.post("/api/sessions", { onRequest: authenticate }, async (request, reply) => {
    const { quizId } = createSessionSchema.parse(request.body);
    const session = await sessionService.create(quizId, (request as any).userId);
    return reply.status(201).send(session);
  });

  app.get<{ Params: { id: string } }>("/api/sessions/:id", { onRequest: authenticate }, async (request) => {
    return sessionService.getById(request.params.id, (request as any).userId);
  });

  app.get<{ Params: { id: string } }>("/api/sessions/:id/results", { onRequest: authenticate }, async (request) => {
    return sessionService.getResults(request.params.id, (request as any).userId);
  });

  // Rota anônima (Player)
  app.get<{ Params: { pin: string } }>("/api/sessions/join/:pin", async (request) => {
    return sessionService.verifyPin(request.params.pin);
  });
}
