import { api } from "./client";
import type { QuizReportItem, SessionSummary, SessionReport } from "$lib/types/report";

export const reportsApi = {
  quizReport: (quizId: string) =>
    api.get<QuizReportItem[]>(`/api/quizzes/${quizId}/report`),

  quizSessions: (quizId: string) =>
    api.get<SessionSummary[]>(`/api/quizzes/${quizId}/sessions`),

  sessionReport: (sessionId: string) =>
    api.get<SessionReport>(`/api/sessions/${sessionId}/report`),
};
