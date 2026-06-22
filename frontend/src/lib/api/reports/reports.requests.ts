import { api } from "$lib/api/client";
import type { QuizReportItem, SessionSummary, SessionReport } from "./reports.types";

export const reportRequests = {
  quizReport: (quizId: string) => api.get<QuizReportItem[]>(`/api/quizzes/${quizId}/report`),

  quizSessions: (quizId: string) => api.get<SessionSummary[]>(`/api/quizzes/${quizId}/sessions`),

  sessionReport: (sessionId: string) => api.get<SessionReport>(`/api/sessions/${sessionId}/report`),
};
