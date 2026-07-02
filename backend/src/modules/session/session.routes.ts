import { FastifyInstance } from "fastify";
import { sessionService } from "./session.service";
import { createSessionSchema, sessionResponseSchema } from "./session.schema";
import { authenticate } from "../../middleware/auth";
import { zSchema } from "../../lib/swagger";

export async function sessionRoutes(app: FastifyInstance) {
  app.post(
    "/api/sessions",
    {
      onRequest: authenticate,
      schema: {
        tags: ["sessions"],
        body: zSchema(createSessionSchema),
        response: { 201: zSchema(sessionResponseSchema) },
      },
    },
    async (request, reply) => {
      const { quizId } = request.body as any;
      const session = await sessionService.create(
        quizId,
        (request as any).userId,
      );
      return reply.status(201).send(session);
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/sessions/:id",
    {
      onRequest: authenticate,
      schema: { tags: ["sessions"] },
    },
    async (request) => {
      return sessionService.getById(request.params.id, (request as any).userId);
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/sessions/:id/results",
    {
      onRequest: authenticate,
      schema: { tags: ["sessions"] },
    },
    async (request) => {
      return sessionService.getResults(
        request.params.id,
        (request as any).userId,
      );
    },
  );

  app.get<{ Params: { pin: string } }>(
    "/api/sessions/join/:pin",
    {
      schema: { tags: ["sessions"] },
    },
    async (request) => {
      return sessionService.verifyPin(request.params.pin);
    },
  );
}
