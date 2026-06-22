import { eq, and, asc, sql } from "drizzle-orm";
import { db, schema } from "../../db";
import { NotFoundError } from "../../shared/errors";
import type { CreateQuizInput, UpdateQuizInput } from "./quiz.schema";

export const quizService = {
  async list(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.quizzes)
      .where(eq(schema.quizzes.authorId, userId));

    const quizzes = await db.query.quizzes.findMany({
      where: eq(schema.quizzes.authorId, userId),
      with: { questions: true },
      orderBy: (q, { desc }) => [desc(q.createdAt)],
      limit,
      offset,
    });

    return {
      data: quizzes.map((q) => ({
        id: q.id,
        title: q.title,
        description: q.description,
        isPublished: q.isPublished,
        questionCount: q.questions.length,
        createdAt: q.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  },

  async getById(quizId: string, userId: string) {
    const quiz = await db.query.quizzes.findFirst({
      where: and(eq(schema.quizzes.id, quizId), eq(schema.quizzes.authorId, userId)),
      with: {
        questions: {
          orderBy: asc(schema.questions.sortOrder),
          with: {
            alternatives: { orderBy: asc(schema.alternatives.sortOrder) },
          },
        },
      },
    });
    if (!quiz) throw new NotFoundError("Quiz");

    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      isPublished: quiz.isPublished,
      createdAt: quiz.createdAt.toISOString(),
      questions: quiz.questions.map((q) => ({
        id: q.id,
        text: q.text,
        questionType: q.questionType as "multiple_choice" | "true_false",
        basePoints: q.basePoints,
        sortOrder: q.sortOrder,
        alternatives: q.alternatives.map((a) => ({
          id: a.id,
          text: a.text,
          isCorrect: a.isCorrect,
          sortOrder: a.sortOrder,
        })),
      })),
    };
  },

  async create(input: CreateQuizInput, userId: string) {
    const [quiz] = await db
      .insert(schema.quizzes)
      .values({ title: input.title, description: input.description ?? null, authorId: userId })
      .returning();
    return { id: quiz.id, title: quiz.title };
  },

  async update(quizId: string, userId: string, input: UpdateQuizInput) {
    const quiz = await db.query.quizzes.findFirst({
      where: and(eq(schema.quizzes.id, quizId), eq(schema.quizzes.authorId, userId)),
    });
    if (!quiz) throw new NotFoundError("Quiz");

    const [updated] = await db
      .update(schema.quizzes)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(schema.quizzes.id, quizId))
      .returning();
    return { id: updated.id, title: updated.title, isPublished: updated.isPublished };
  },

  async remove(quizId: string, userId: string) {
    const quiz = await db.query.quizzes.findFirst({
      where: and(eq(schema.quizzes.id, quizId), eq(schema.quizzes.authorId, userId)),
    });
    if (!quiz) throw new NotFoundError("Quiz");
    await db.delete(schema.quizzes).where(eq(schema.quizzes.id, quizId));
  },
};
