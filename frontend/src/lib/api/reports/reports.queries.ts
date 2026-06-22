import { createQuery } from "@tanstack/svelte-query";
import { reportRequests } from "./reports.requests";

export const reportKeys = {
  all: ["reports"] as const,
  quizReport: (quizId: string) => ["reports", "quiz", quizId] as const,
  quizSessions: (quizId: string) => ["reports", "quiz-sessions", quizId] as const,
  sessionReport: (sessionId: string) => ["reports", "session", sessionId] as const,
};

export function useQuizReport(quizId: string) {
  return createQuery(() => ({
    queryKey: reportKeys.quizReport(quizId),
    queryFn: () => reportRequests.quizReport(quizId),
    enabled: !!quizId,
  }));
}

export function useQuizSessions(quizId: string) {
  return createQuery(() => ({
    queryKey: reportKeys.quizSessions(quizId),
    queryFn: () => reportRequests.quizSessions(quizId),
    enabled: !!quizId,
  }));
}

export function useSessionReport(sessionId: string) {
  return createQuery(() => ({
    queryKey: reportKeys.sessionReport(sessionId),
    queryFn: () => reportRequests.sessionReport(sessionId),
    enabled: !!sessionId,
  }));
}
