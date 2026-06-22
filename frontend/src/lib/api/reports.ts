import { api } from "./client";
import type { QuizReportItem, SessionSummary, SessionReport } from "$lib/types/report";

export const reportsApi = {
  quizReport: (quizId: string) => api.fetch<QuizReportItem[]>(`/api/quizzes/${quizId}/report`),
  quizSessions: (quizId: string) => api.fetch<SessionSummary[]>(`/api/quizzes/${quizId}/sessions`),
  sessionReport: (sessionId: string) => api.fetch<SessionReport>(`/api/sessions/${sessionId}/report`),
};
