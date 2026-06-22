import { createQuery } from "@tanstack/svelte-query";
import { reportsApi } from "$lib/api/reports";

// ── Query Keys ───────────────────────────────────────────────────────

export const reportKeys = {
  all: ["reports"] as const,
  quizReport: (quizId: string) => ["reports", "quiz", quizId] as const,
  quizSessions: (quizId: string) => ["reports", "quiz-sessions", quizId] as const,
  sessionReport: (sessionId: string) => ["reports", "session", sessionId] as const,
};

// ── Queries ──────────────────────────────────────────────────────────

export function useQuizReport(quizId: string) {
  return createQuery(() => ({
    queryKey: reportKeys.quizReport(quizId),
    queryFn: () => reportsApi.quizReport(quizId),
    enabled: !!quizId,
  }));
}

export function useQuizSessions(quizId: string) {
  return createQuery(() => ({
    queryKey: reportKeys.quizSessions(quizId),
    queryFn: () => reportsApi.quizSessions(quizId),
    enabled: !!quizId,
  }));
}

export function useSessionReport(sessionId: string) {
  return createQuery(() => ({
    queryKey: reportKeys.sessionReport(sessionId),
    queryFn: () => reportsApi.sessionReport(sessionId),
    enabled: !!sessionId,
  }));
}
