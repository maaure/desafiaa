// src/modules/quiz/quiz.routes.ts
import { FastifyInstance } from "fastify";
import { quizService } from "./quiz.service";
import { createQuizSchema, updateQuizSchema } from "./quiz.schema";
import { authenticate } from "../../middleware/auth";
import { zSchema } from "../../lib/swagger";
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

  app.get(
    "/api/quizzes",
    {
      schema: { tags: ["quizzes"] },
    },
    async (request) => {
      const { page, limit } = request.query as any;
      return quizService.list(
        (request as any).userId,
        Number(page) || 1,
        Number(limit) || 20,
      );
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/quizzes/:id",
    {
      schema: { tags: ["quizzes"] },
    },
    async (request) => {
      return quizService.getById(request.params.id, (request as any).userId);
    },
  );

  app.post(
    "/api/quizzes",
    {
      schema: { tags: ["quizzes"], body: zSchema(createQuizSchema) },
    },
    async (request, reply) => {
      const input = request.body as any;
      const quiz = await quizService.create(input, (request as any).userId);
      return reply.status(201).send(quiz);
    },
  );

  app.put<{ Params: { id: string } }>(
    "/api/quizzes/:id",
    {
      schema: { tags: ["quizzes"], body: zSchema(updateQuizSchema) },
    },
    async (request) => {
      const input = request.body as any;
      return quizService.update(
        request.params.id,
        (request as any).userId,
        input,
      );
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/api/quizzes/:id",
    { schema: { tags: ["quizzes"] } },
    async (request, reply) => {
      await quizService.remove(request.params.id, (request as any).userId);
      return reply.status(204).send();
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/quizzes/:id/questions",
    {
      schema: { tags: ["questions"], body: zSchema(questionSchema) },
    },
    async (request, reply) => {
      const input = request.body as any;
      const question = await quizService.createQuestion(
        request.params.id,
        (request as any).userId,
        input,
      );
      return reply.status(201).send(question);
    },
  );

  app.put<{ Params: { id: string } }>(
    "/api/questions/:id",
    {
      schema: { tags: ["questions"], body: zSchema(questionSchema.partial()) },
    },
    async (request) => {
      const input = request.body as any;
      return quizService.updateQuestion(
        request.params.id,
        (request as any).userId,
        input,
      );
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/api/questions/:id",
    { schema: { tags: ["questions"] } },
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
    {
      schema: { tags: ["questions"], body: zSchema(reorderSchema) },
    },
    async (request) => {
      const { sortOrder } = request.body as any;
      return quizService.reorderQuestion(
        request.params.id,
        (request as any).userId,
        sortOrder,
      );
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/questions/:id/alternatives",
    {
      schema: { tags: ["alternatives"], body: zSchema(alternativeSchema) },
    },
    async (request, reply) => {
      const input = request.body as any;
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
    {
      schema: {
        tags: ["alternatives"],
        body: zSchema(alternativeSchema.partial()),
      },
    },
    async (request) => {
      const input = request.body as any;
      return quizService.updateAlternative(
        request.params.id,
        (request as any).userId,
        input,
      );
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/api/alternatives/:id",
    { schema: { tags: ["alternatives"] } },
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
    { schema: { tags: ["alternatives"] } },
    async (request) => {
      return quizService.markAlternativeCorrect(
        request.params.id,
        (request as any).userId,
      );
    },
  );
}
