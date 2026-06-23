import { NotFoundError } from "../../shared/errors";
import { quizRepo } from "./quiz.repository";
import type { CreateQuizInput, UpdateQuizInput } from "./quiz.schema";
import type {
  QuizListItem,
  QuizFull,
  QuestionEntity,
  AlternativeEntity,
  CreateQuestionInput,
  UpdateQuestionInput,
  CreateAlternativeInput,
  UpdateAlternativeInput,
} from "./quiz.types";

// ── Helpers internos ──────────────────────────────────────────────

async function assertQuizOwnership(
  userId: string,
  questionId: string,
): Promise<void> {
  const question = await quizRepo.getQuestionOwnedByUser(questionId);
  if (!question || question.quiz.authorId !== userId) {
    throw new NotFoundError("Pergunta");
  }
}

async function assertQuizOwnershipByAlt(
  userId: string,
  alternativeId: string,
): Promise<void> {
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
      questionCount: q.questions.length,
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
    const quiz = await quizRepo.insertOne({
      title: input.title,
      description: input.description ?? null,
      authorId: userId,
    });
    return { id: quiz.id, title: quiz.title };
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

    const maxOrder = question.alternatives.reduce(
      (max, a) => Math.max(max, a.sortOrder),
      -1,
    );
    const alt = await quizRepo.insertAlternative({
      questionId,
      text: input.text,
      isCorrect: input.isCorrect,
      sortOrder: maxOrder + 1,
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

  async markAlternativeCorrect(
    alternativeId: string,
    userId: string,
  ): Promise<AlternativeEntity> {
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
