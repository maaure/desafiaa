// src/modules/quiz/quiz.routes.ts
import { FastifyInstance } from "fastify";
import { db, schema } from "../../db";
import { quizService } from "./quiz.service";
import { createQuizSchema, updateQuizSchema } from "./quiz.schema";
import { authenticate } from "../../middleware/auth";
import { NotFoundError } from "../../shared/errors";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";

const questionSchema = z.object({
  text: z.string().min(1),
  questionType: z.enum(["multiple_choice", "true_false"]),
  basePoints: z.number().int().min(1).default(1000),
});

const alternativeSchema = z.object({
  text: z.string().min(1),
  isCorrect: z.boolean().default(false),
});

const reorderSchema = z.object({ sortOrder: z.number().int().min(0) });

export async function quizRoutes(app: FastifyInstance) {
  // Todas as rotas requerem autenticação
  app.addHook("onRequest", authenticate);

  // === QUIZZES ===
  app.get("/api/quizzes", async (request) => {
    const { page, limit } = request.query as any;
    return quizService.list((request as any).userId, Number(page) || 1, Number(limit) || 20);
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
    return quizService.update(request.params.id, (request as any).userId, input);
  });

  app.delete<{ Params: { id: string } }>("/api/quizzes/:id", async (request, reply) => {
    await quizService.remove(request.params.id, (request as any).userId);
    return reply.status(204).send();
  });

  // === QUESTIONS ===
  app.post<{ Params: { id: string } }>("/api/quizzes/:id/questions", async (request, reply) => {
    const quiz = await db.query.quizzes.findFirst({
      where: and(eq(schema.quizzes.id, request.params.id), eq(schema.quizzes.authorId, (request as any).userId)),
    });
    if (!quiz) throw new NotFoundError("Quiz");

    const input = questionSchema.parse(request.body);
    const maxOrder = await db.query.questions.findFirst({
      where: eq(schema.questions.quizId, request.params.id),
      orderBy: (q, { desc }) => [desc(q.sortOrder)],
    });

    const [question] = await db
      .insert(schema.questions)
      .values({
        quizId: request.params.id,
        text: input.text,
        questionType: input.questionType,
        basePoints: input.basePoints,
        sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
      })
      .returning();

    return reply.status(201).send(question);
  });

  app.put<{ Params: { id: string } }>("/api/questions/:id", async (request) => {
    const input = questionSchema.partial().parse(request.body);
    const [updated] = await db
      .update(schema.questions)
      .set(input)
      .where(eq(schema.questions.id, request.params.id))
      .returning();
    if (!updated) throw new NotFoundError("Pergunta");
    return updated;
  });

  app.delete<{ Params: { id: string } }>("/api/questions/:id", async (request, reply) => {
    await db.delete(schema.questions).where(eq(schema.questions.id, request.params.id));
    return reply.status(204).send();
  });

  app.put<{ Params: { id: string } }>("/api/questions/:id/order", async (request) => {
    const { sortOrder } = reorderSchema.parse(request.body);
    const [updated] = await db
      .update(schema.questions)
      .set({ sortOrder })
      .where(eq(schema.questions.id, request.params.id))
      .returning();
    if (!updated) throw new NotFoundError("Pergunta");
    return updated;
  });

  // === ALTERNATIVES ===
  app.post<{ Params: { id: string } }>("/api/questions/:id/alternatives", async (request, reply) => {
    const question = await db.query.questions.findFirst({
      where: eq(schema.questions.id, request.params.id),
      with: { alternatives: true },
    });
    if (!question) throw new NotFoundError("Pergunta");

    const input = alternativeSchema.parse(request.body);

    // Se isCorrect, desmarca as outras
    if (input.isCorrect) {
      await db
        .update(schema.alternatives)
        .set({ isCorrect: false })
        .where(eq(schema.alternatives.questionId, request.params.id));
    }

    const maxOrder = question.alternatives.reduce((max, a) => Math.max(max, a.sortOrder), -1);
    const [alt] = await db
      .insert(schema.alternatives)
      .values({
        questionId: request.params.id,
        text: input.text,
        isCorrect: input.isCorrect,
        sortOrder: maxOrder + 1,
      })
      .returning();

    return reply.status(201).send(alt);
  });

  app.put<{ Params: { id: string } }>("/api/alternatives/:id", async (request) => {
    const input = alternativeSchema.partial().parse(request.body);
    const [updated] = await db
      .update(schema.alternatives)
      .set(input)
      .where(eq(schema.alternatives.id, request.params.id))
      .returning();
    if (!updated) throw new NotFoundError("Alternativa");
    return updated;
  });

  app.delete<{ Params: { id: string } }>("/api/alternatives/:id", async (request, reply) => {
    await db.delete(schema.alternatives).where(eq(schema.alternatives.id, request.params.id));
    return reply.status(204).send();
  });

  app.put<{ Params: { id: string } }>("/api/alternatives/:id/correct", async (request) => {
    const alt = await db.query.alternatives.findFirst({
      where: eq(schema.alternatives.id, request.params.id),
    });
    if (!alt) throw new NotFoundError("Alternativa");

    // Desmarca todas e marca esta
    await db
      .update(schema.alternatives)
      .set({ isCorrect: false })
      .where(eq(schema.alternatives.questionId, alt.questionId));
    const [updated] = await db
      .update(schema.alternatives)
      .set({ isCorrect: true })
      .where(eq(schema.alternatives.id, request.params.id))
      .returning();
    return updated;
  });
}
