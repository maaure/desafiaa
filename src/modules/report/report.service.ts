import { NotFoundError } from "../../shared/errors";
import { reportRepo } from "./report.repository";
import type { QuestionReport, SessionSummary, SessionReportFull } from "./report.types";

export const reportService = {
  /** Relatório por quiz: taxa de acerto e tempo médio por pergunta */
  async quizReport(quizId: string, userId: string): Promise<QuestionReport[]> {
    const quiz = await reportRepo.getQuizWithSessions(quizId, userId);
    if (!quiz) throw new NotFoundError("Quiz");

    return quiz.questions.map((q) => {
      const answers = quiz.sessions.flatMap((s) =>
        s.answers.filter((a) => a.questionId === q.id),
      );
      const total = answers.length;
      const correct = answers.filter((a) => a.isCorrect).length;
      const avgMs =
        total > 0 ? Math.round(answers.reduce((s, a) => s + a.responseMs, 0) / total) : 0;

      return {
        questionId: q.id,
        text: q.text,
        totalAnswers: total,
        correctCount: correct,
        accuracyRate: total > 0 ? Math.round((correct / total) * 100) : 0,
        avgResponseMs: avgMs,
      };
    });
  },

  /** Histórico de sessões de um quiz */
  async quizSessions(quizId: string, userId: string): Promise<SessionSummary[]> {
    const quiz = await reportRepo.getQuizWithSessions(quizId, userId);
    if (!quiz) throw new NotFoundError("Quiz");

    const sessions = await reportRepo.getSessionCountByQuiz(quizId);

    return sessions.map((s) => ({
      id: s.id,
      pin: s.pin,
      status: s.status,
      playerCount: s.playerCount,
      startedAt: s.startedAt?.toISOString() ?? null,
      finishedAt: s.finishedAt?.toISOString() ?? null,
      winner: s.results[0]?.playerNickname ?? null,
      winnerScore: s.results[0]?.totalScore ?? null,
    }));
  },

  /** Relatório detalhado de uma sessão */
  async sessionReport(sessionId: string, userId: string): Promise<SessionReportFull> {
    const session = await reportRepo.getSessionWithDetails(sessionId);
    if (!session || session.hostId !== userId) throw new NotFoundError("Sessão");

    return {
      session: {
        id: session.id,
        pin: session.pin,
        status: session.status,
        playerCount: session.playerCount,
        timeLimitSeconds: session.timeLimitSeconds,
        startedAt: session.startedAt?.toISOString() ?? null,
        finishedAt: session.finishedAt?.toISOString() ?? null,
      },
      results: session.results.map((r) => ({
        nickname: r.playerNickname,
        totalScore: r.totalScore,
        correctCount: r.correctCount,
        totalCount: r.totalCount,
        avgResponseMs: r.avgResponseMs,
        rank: r.rank,
      })),
      answers: session.answers.map((a) => ({
        questionText: a.question.text,
        nickname: a.playerNickname,
        selectedAnswer: a.selectedAnswer,
        isCorrect: a.isCorrect,
        responseMs: a.responseMs,
        pointsEarned: a.pointsEarned,
        answeredAt: a.answeredAt.toISOString(),
      })),
    };
  },
};
