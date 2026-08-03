import { and, eq, inArray } from "drizzle-orm";
import { NotFoundError } from "../../shared/errors";
import { db, schema } from "../../db";
import { quizRepo } from "./quiz.repository";
import type { SaveQuizInput, UpdateQuizInput } from "./quiz.schema";
import type {
  QuizListItem,
  QuizFull,
  PublicQuizListItem,
  QuestionEntity,
  AlternativeEntity,
  CreateQuestionInput,
  UpdateQuestionInput,
  CreateAlternativeInput,
  UpdateAlternativeInput,
} from "./quiz.types";

// ── Helpers internos ──────────────────────────────────────────────

async function assertQuizOwnership(userId: string, questionId: string): Promise<void> {
  const question = await quizRepo.getQuestionOwnedByUser(questionId);
  if (!question || question.quiz.authorId !== userId) {
    throw new NotFoundError("Pergunta");
  }
}

async function assertQuizOwnershipByAlt(userId: string, alternativeId: string): Promise<void> {
  const alt = await quizRepo.getAlternativeOwnedByUser(alternativeId);
  if (!alt || alt.question.quiz.authorId !== userId) {
    throw new NotFoundError("Alternativa");
  }
}

// ── Service ───────────────────────────────────────────────────────

export const quizService = {
  // ── Quizzes ───────────────────────────────────────────────────

  async list(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [total, quizzes] = await Promise.all([
      quizRepo.countByAuthor(userId),
      quizRepo.listByAuthor(userId, limit, offset),
    ]);

    const data: QuizListItem[] = quizzes.map((q) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      isPublished: q.isPublished,
      isPublic: q.isPublic,
      questionCount: q.questions.length,
      createdAt: q.createdAt.toISOString(),
    }));

    return { data, total, page, limit };
  },

  /** Quizzes públicos com busca por título + descrição */
  async listPublic(page = 1, limit = 20, search = "") {
    const offset = (page - 1) * limit;
    const [total, quizzes] = await Promise.all([
      quizRepo.countPublic(search),
      quizRepo.listPublic(limit, offset, search),
    ]);

    const data: PublicQuizListItem[] = quizzes.map((q) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      isPublished: q.isPublished,
      questionCount: q.questions.length,
      authorName: q.author.name,
      createdAt: q.createdAt.toISOString(),
    }));

    return { data, total, page, limit };
  },

  async getById(quizId: string, userId: string): Promise<QuizFull> {
    const quiz = await quizRepo.getWithQuestions(quizId, userId);
    if (!quiz) throw new NotFoundError("Quiz");

    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      isPublished: quiz.isPublished,
      isPublic: quiz.isPublic,
      createdAt: quiz.createdAt.toISOString(),
      questions: quiz.questions.map((q) => ({
        id: q.id,
        text: q.text,
        imageUrl: q.imageUrl ?? null,
        questionType: q.questionType as "multiple_choice" | "true_false",
        basePoints: q.basePoints,
        sortOrder: q.sortOrder,
        alternatives: q.alternatives.map((a) => ({
          id: a.id,
          text: a.text,
          imageUrl: a.imageUrl ?? null,
          isCorrect: a.isCorrect,
          sortOrder: a.sortOrder,
        })),
      })),
    };
  },

  /**
   * Upsert completo em uma única transação: cria ou edita o quiz e sincroniza
   * perguntas/alternativas (atualiza as que vieram com id, cria as novas e
   * remove as que saíram do documento).
   */
  async saveFull(input: SaveQuizInput, userId: string): Promise<QuizFull> {
    const quizId = await db.transaction(async (tx) => {
      let quizId: string;

      if (input.id) {
        const quiz = await tx.query.quizzes.findFirst({
          where: and(eq(schema.quizzes.id, input.id), eq(schema.quizzes.authorId, userId)),
        });
        if (!quiz) throw new NotFoundError("Quiz");
        quizId = quiz.id;
        await tx
          .update(schema.quizzes)
          .set({
            title: input.title,
            description: input.description ?? null,
            isPublished: input.isPublished ?? quiz.isPublished,
            isPublic: input.isPublic ?? quiz.isPublic,
            updatedAt: new Date(),
          })
          .where(eq(schema.quizzes.id, quizId));
      } else {
        const [quiz] = await tx
          .insert(schema.quizzes)
          .values({
            title: input.title,
            description: input.description ?? null,
            isPublished: input.isPublished ?? false,
            isPublic: input.isPublic ?? false,
            authorId: userId,
          })
          .returning();
        quizId = quiz.id;
      }

      // Estado anterior — usado para calcular remoções
      const existingQuestions = await tx.query.questions.findMany({
        where: eq(schema.questions.quizId, quizId),
      });
      const existingAlts = existingQuestions.length
        ? await tx.query.alternatives.findMany({
            where: inArray(
              schema.alternatives.questionId,
              existingQuestions.map((q) => q.id),
            ),
          })
        : [];
      const keptQuestionIds = new Set<string>();
      const keptAltIds = new Set<string>();

      for (let qi = 0; qi < input.questions.length; qi++) {
        const q = input.questions[qi];
        let questionId: string;

        if (q.id) {
          questionId = q.id;
          keptQuestionIds.add(questionId);
          await tx
            .update(schema.questions)
            .set({
              text: q.text,
              questionType: q.questionType,
              basePoints: q.basePoints ?? 1000,
              imageUrl: q.imageUrl ?? null,
              sortOrder: qi,
            })
            .where(eq(schema.questions.id, questionId));
        } else {
          const [created] = await tx
            .insert(schema.questions)
            .values({
              quizId,
              text: q.text,
              questionType: q.questionType,
              basePoints: q.basePoints ?? 1000,
              imageUrl: q.imageUrl ?? null,
              sortOrder: qi,
            })
            .returning();
          questionId = created.id;
        }

        // Uma correta por pergunta: limpa a marcação e aplica a do payload
        await tx
          .update(schema.alternatives)
          .set({ isCorrect: false })
          .where(eq(schema.alternatives.questionId, questionId));

        for (let ai = 0; ai < q.alternatives.length; ai++) {
          const alt = q.alternatives[ai];
          if (alt.id) {
            keptAltIds.add(alt.id);
            await tx
              .update(schema.alternatives)
              .set({
                text: alt.text,
                imageUrl: alt.imageUrl ?? null,
                isCorrect: alt.isCorrect,
                sortOrder: ai,
              })
              .where(eq(schema.alternatives.id, alt.id));
          } else {
            await tx.insert(schema.alternatives).values({
              questionId,
              text: alt.text,
              imageUrl: alt.imageUrl ?? null,
              isCorrect: alt.isCorrect,
              sortOrder: ai,
            });
          }
        }

        // Alternativas que saíram do documento
        const removedAlts = existingAlts.filter(
          (a) => a.questionId === questionId && !keptAltIds.has(a.id),
        );
        if (removedAlts.length) {
          await tx.delete(schema.alternatives).where(
            inArray(
              schema.alternatives.id,
              removedAlts.map((a) => a.id),
            ),
          );
        }
      }

      // Perguntas que saíram do documento (cascade apaga as alternativas)
      const removedQuestions = existingQuestions.filter((q) => !keptQuestionIds.has(q.id));
      if (removedQuestions.length) {
        await tx.delete(schema.questions).where(
          inArray(
            schema.questions.id,
            removedQuestions.map((q) => q.id),
          ),
        );
      }

      return quizId;
    });

    return this.getById(quizId, userId);
  },

  async update(quizId: string, userId: string, input: UpdateQuizInput) {
    const quiz = await quizRepo.getOwnedBy(quizId, userId);
    if (!quiz) throw new NotFoundError("Quiz");

    const updated = await quizRepo.updateOne(quizId, { ...input });
    return {
      id: updated.id,
      title: updated.title,
      isPublished: updated.isPublished,
    };
  },

  async remove(quizId: string, userId: string) {
    const quiz = await quizRepo.getOwnedBy(quizId, userId);
    if (!quiz) throw new NotFoundError("Quiz");
    await quizRepo.deleteOne(quizId);
  },

  // ── Questions ─────────────────────────────────────────────────

  async createQuestion(
    quizId: string,
    userId: string,
    input: CreateQuestionInput,
  ): Promise<QuestionEntity> {
    const quiz = await quizRepo.getOwnedBy(quizId, userId);
    if (!quiz) throw new NotFoundError("Quiz");

    const maxOrder = await quizRepo.getMaxQuestionSortOrder(quizId);
    const question = await quizRepo.insertQuestion({
      quizId,
      text: input.text,
      questionType: input.questionType,
      basePoints: input.basePoints,
      sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
      imageUrl: input.imageUrl ?? null,
    });

    return question as QuestionEntity;
  },

  async updateQuestion(
    questionId: string,
    userId: string,
    input: UpdateQuestionInput,
  ): Promise<QuestionEntity> {
    await assertQuizOwnership(userId, questionId);
    const updated = await quizRepo.updateQuestion(questionId, input);
    if (!updated) throw new NotFoundError("Pergunta");
    return updated as QuestionEntity;
  },

  async deleteQuestion(questionId: string, userId: string) {
    await assertQuizOwnership(userId, questionId);
    await quizRepo.deleteQuestion(questionId);
  },

  async reorderQuestion(
    questionId: string,
    userId: string,
    sortOrder: number,
  ): Promise<QuestionEntity> {
    await assertQuizOwnership(userId, questionId);
    const updated = await quizRepo.updateQuestion(questionId, { sortOrder });
    if (!updated) throw new NotFoundError("Pergunta");
    return updated as QuestionEntity;
  },

  // ── Alternatives ──────────────────────────────────────────────

  async createAlternative(
    questionId: string,
    userId: string,
    input: CreateAlternativeInput,
  ): Promise<AlternativeEntity> {
    await assertQuizOwnership(userId, questionId);
    const question = await quizRepo.getQuestionWithAlternatives(questionId);
    if (!question) throw new NotFoundError("Pergunta");

    if (input.isCorrect) {
      await quizRepo.unmarkCorrectInQuestion(questionId);
    }

    const maxOrder = question.alternatives.reduce((max, a) => Math.max(max, a.sortOrder), -1);
    const alt = await quizRepo.insertAlternative({
      questionId,
      text: input.text,
      isCorrect: input.isCorrect,
      sortOrder: maxOrder + 1,
      imageUrl: input.imageUrl ?? null,
    });

    return alt as AlternativeEntity;
  },

  async updateAlternative(
    alternativeId: string,
    userId: string,
    input: UpdateAlternativeInput,
  ): Promise<AlternativeEntity> {
    await assertQuizOwnershipByAlt(userId, alternativeId);
    const updated = await quizRepo.updateAlternative(alternativeId, input);
    if (!updated) throw new NotFoundError("Alternativa");
    return updated as AlternativeEntity;
  },

  async deleteAlternative(alternativeId: string, userId: string) {
    await assertQuizOwnershipByAlt(userId, alternativeId);
    await quizRepo.deleteAlternative(alternativeId);
  },

  async markAlternativeCorrect(alternativeId: string, userId: string): Promise<AlternativeEntity> {
    await assertQuizOwnershipByAlt(userId, alternativeId);
    const alt = await quizRepo.getAlternativeById(alternativeId);
    if (!alt) throw new NotFoundError("Alternativa");

    await quizRepo.unmarkCorrectInQuestion(alt.questionId);

    const updated = await quizRepo.updateAlternative(alternativeId, {
      isCorrect: true,
    });
    return updated as AlternativeEntity;
  },
};
