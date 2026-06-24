// src/modules/quiz/quiz.routes.ts
import { FastifyInstance } from "fastify";
import { quizService } from "./quiz.service";
import { createQuizSchema, updateQuizSchema } from "./quiz.schema";
import { authenticate } from "../../middleware/auth";
import { z } from "zod";

const questionSchema = z.object({
  text: z.string().min(1),
  questionType: z.enum(["multiple_choice", "true_false"]),
  basePoints: z.number().int().min(1).default(1000),
  imageUrl: z.string().nullable().optional(),
});

const alternativeSchema = z.object({
  text: z.string().min(1),
  isCorrect: z.boolean().default(false),
  imageUrl: z.string().nullable().optional(),
});

const reorderSchema = z.object({ sortOrder: z.number().int().min(0) });

export async function quizRoutes(app: FastifyInstance) {
  app.addHook("onRequest", authenticate);

  // === QUIZZES ===

  app.get("/api/quizzes", async (request) => {
    const { page, limit } = request.query as any;
    return quizService.list(
      (request as any).userId,
      Number(page) || 1,
      Number(limit) || 20,
    );
  });

  app.get<{ Params: { id: string } }>("/api/quizzes/:id", async (request) => {
    return quizService.getById(request.params.id, (request as any).userId);
  });

  app.post("/api/quizzes", async (request, reply) => {
    const input = createQuizSchema.parse(request.body);
    const quiz = await quizService.create(input, (request as any).userId);
    return reply.status(201).send(quiz);
  });

  app.put<{ Params: { id: string } }>("/api/quizzes/:id", async (request) => {
    const input = updateQuizSchema.parse(request.body);
    return quizService.update(
      request.params.id,
      (request as any).userId,
      input,
    );
  });

  app.delete<{ Params: { id: string } }>(
    "/api/quizzes/:id",
    async (request, reply) => {
      await quizService.remove(request.params.id, (request as any).userId);
      return reply.status(204).send();
    },
  );

  // === QUESTIONS ===

  app.post<{ Params: { id: string } }>(
    "/api/quizzes/:id/questions",
    async (request, reply) => {
      const input = questionSchema.parse(request.body);
      const question = await quizService.createQuestion(
        request.params.id,
        (request as any).userId,
        input,
      );
      return reply.status(201).send(question);
    },
  );

  app.put<{ Params: { id: string } }>("/api/questions/:id", async (request) => {
    const input = questionSchema.partial().parse(request.body);
    return quizService.updateQuestion(
      request.params.id,
      (request as any).userId,
      input,
    );
  });

  app.delete<{ Params: { id: string } }>(
    "/api/questions/:id",
    async (request, reply) => {
      await quizService.deleteQuestion(
        request.params.id,
        (request as any).userId,
      );
      return reply.status(204).send();
    },
  );

  app.put<{ Params: { id: string } }>(
    "/api/questions/:id/order",
    async (request) => {
      const { sortOrder } = reorderSchema.parse(request.body);
      return quizService.reorderQuestion(
        request.params.id,
        (request as any).userId,
        sortOrder,
      );
    },
  );

  // === ALTERNATIVES ===

  app.post<{ Params: { id: string } }>(
    "/api/questions/:id/alternatives",
    async (request, reply) => {
      const input = alternativeSchema.parse(request.body);
      const alt = await quizService.createAlternative(
        request.params.id,
        (request as any).userId,
        input,
      );
      return reply.status(201).send(alt);
    },
  );

  app.put<{ Params: { id: string } }>(
    "/api/alternatives/:id",
    async (request) => {
      const input = alternativeSchema.partial().parse(request.body);
      return quizService.updateAlternative(
        request.params.id,
        (request as any).userId,
        input,
      );
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/api/alternatives/:id",
    async (request, reply) => {
      await quizService.deleteAlternative(
        request.params.id,
        (request as any).userId,
      );
      return reply.status(204).send();
    },
  );

  app.put<{ Params: { id: string } }>(
    "/api/alternatives/:id/correct",
    async (request) => {
      return quizService.markAlternativeCorrect(
        request.params.id,
        (request as any).userId,
      );
    },
  );
}
