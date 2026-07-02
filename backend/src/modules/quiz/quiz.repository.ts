import { eq, and, asc, desc, sql } from "drizzle-orm";
import { db, schema } from "../../db";
import type { UpdateQuestionInput, UpdateAlternativeInput } from "./quiz.types";

export const quizRepo = {
  // ── Quizzes ───────────────────────────────────────────────────

  async countByAuthor(userId: string): Promise<number> {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.quizzes)
      .where(eq(schema.quizzes.authorId, userId));
    return count;
  },

  async listByAuthor(userId: string, limit: number, offset: number) {
    return db.query.quizzes.findMany({
      where: eq(schema.quizzes.authorId, userId),
      with: { questions: true },
      orderBy: (q, { desc }) => [desc(q.createdAt)],
      limit,
      offset,
    });
  },

  async getWithQuestions(quizId: string, userId: string) {
    return db.query.quizzes.findFirst({
      where: and(
        eq(schema.quizzes.id, quizId),
        eq(schema.quizzes.authorId, userId),
      ),
      with: {
        questions: {
          orderBy: asc(schema.questions.sortOrder),
          with: {
            alternatives: { orderBy: asc(schema.alternatives.sortOrder) },
          },
        },
      },
    });
  },

  async getOwnedBy(quizId: string, userId: string) {
    return db.query.quizzes.findFirst({
      where: and(
        eq(schema.quizzes.id, quizId),
        eq(schema.quizzes.authorId, userId),
      ),
    });
  },

  async insertOne(data: {
    title: string;
    description: string | null;
    authorId: string;
  }) {
    const [quiz] = await db.insert(schema.quizzes).values(data).returning();
    return quiz;
  },

  async updateOne(quizId: string, data: Record<string, unknown>) {
    const [updated] = await db
      .update(schema.quizzes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.quizzes.id, quizId))
      .returning();
    return updated;
  },

  async deleteOne(quizId: string) {
    await db.delete(schema.quizzes).where(eq(schema.quizzes.id, quizId));
  },

  // ── Questions ─────────────────────────────────────────────────

  async getQuestionOwnedByUser(questionId: string) {
    return db.query.questions.findFirst({
      where: eq(schema.questions.id, questionId),
      with: { quiz: true },
    });
  },

  async getMaxQuestionSortOrder(quizId: string) {
    return db.query.questions.findFirst({
      where: eq(schema.questions.quizId, quizId),
      orderBy: (q, { desc }) => [desc(q.sortOrder)],
    });
  },

  async insertQuestion(data: {
    quizId: string;
    text: string;
    questionType: string;
    basePoints: number;
    sortOrder: number;
    imageUrl?: string | null;
  }) {
    const [question] = await db
      .insert(schema.questions)
      .values(data)
      .returning();
    return question;
  },

  async updateQuestion(questionId: string, data: UpdateQuestionInput) {
    const [updated] = await db
      .update(schema.questions)
      .set(data)
      .where(eq(schema.questions.id, questionId))
      .returning();
    return updated;
  },

  async deleteQuestion(questionId: string) {
    await db
      .delete(schema.questions)
      .where(eq(schema.questions.id, questionId));
  },

  // ── Alternatives ──────────────────────────────────────────────

  async getAlternativeOwnedByUser(alternativeId: string) {
    return db.query.alternatives.findFirst({
      where: eq(schema.alternatives.id, alternativeId),
      with: { question: { with: { quiz: true } } },
    });
  },

  async getQuestionWithAlternatives(questionId: string) {
    return db.query.questions.findFirst({
      where: eq(schema.questions.id, questionId),
      with: { alternatives: true },
    });
  },

  async unmarkCorrectInQuestion(questionId: string) {
    await db
      .update(schema.alternatives)
      .set({ isCorrect: false })
      .where(eq(schema.alternatives.questionId, questionId));
  },

  async insertAlternative(data: {
    questionId: string;
    text: string;
    isCorrect: boolean;
    sortOrder: number;
    imageUrl?: string | null;
  }) {
    const [alt] = await db.insert(schema.alternatives).values(data).returning();
    return alt;
  },

  async updateAlternative(alternativeId: string, data: UpdateAlternativeInput) {
    const [updated] = await db
      .update(schema.alternatives)
      .set(data)
      .where(eq(schema.alternatives.id, alternativeId))
      .returning();
    return updated;
  },

  async deleteAlternative(alternativeId: string) {
    await db
      .delete(schema.alternatives)
      .where(eq(schema.alternatives.id, alternativeId));
  },

  async getAlternativeById(alternativeId: string) {
    return db.query.alternatives.findFirst({
      where: eq(schema.alternatives.id, alternativeId),
    });
  },
};
