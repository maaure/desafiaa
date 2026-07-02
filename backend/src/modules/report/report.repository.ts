import { eq, and, asc, desc } from "drizzle-orm";
import { db, schema } from "../../db";

export const reportRepo = {
  async getQuizWithSessions(quizId: string, userId: string) {
    return db.query.quizzes.findFirst({
      where: and(
        eq(schema.quizzes.id, quizId),
        eq(schema.quizzes.authorId, userId),
      ),
      with: {
        questions: {
          orderBy: asc(schema.questions.sortOrder),
        },
        sessions: {
          with: {
            answers: true,
          },
        },
      },
    });
  },

  async getSessionCountByQuiz(quizId: string) {
    return db.query.gameSessions.findMany({
      where: eq(schema.gameSessions.quizId, quizId),
      orderBy: desc(schema.gameSessions.createdAt),
      with: { results: { orderBy: asc(schema.gameResults.rank), limit: 1 } },
    });
  },

  async getSessionWithDetails(sessionId: string) {
    return db.query.gameSessions.findFirst({
      where: eq(schema.gameSessions.id, sessionId),
      with: {
        answers: {
          with: { question: true },
        },
        results: {
          orderBy: asc(schema.gameResults.rank),
        },
      },
    });
  },
};
