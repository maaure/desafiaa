import { writable } from "svelte/store";
import { reportRequests } from "$lib/api/reports/reports.requests";
import { ApiError } from "$lib/api/client";
import type { QuizReportItem, SessionSummary, SessionReport } from "$lib/api/reports/reports.types";

function createReportStore() {
  const quizReport = writable<QuizReportItem[]>([]);
  const sessions = writable<SessionSummary[]>([]);
  const sessionReport = writable<SessionReport | null>(null);
  const loading = writable(false);
  const error = writable<string | null>(null);

  async function loadQuizReport(quizId: string): Promise<void> {
    error.set(null);
    loading.set(true);
    try {
      const [report, sessionList] = await Promise.all([
        reportRequests.quizReport(quizId),
        reportRequests.quizSessions(quizId),
      ]);
      quizReport.set(report ?? []);
      sessions.set(sessionList ?? []);
    } catch (err) {
      error.set(err instanceof ApiError ? err.message : "Erro ao carregar relatório");
      quizReport.set([]);
      sessions.set([]);
    } finally {
      loading.set(false);
    }
  }

  async function loadSessionReport(sessionId: string): Promise<void> {
    error.set(null);
    loading.set(true);
    try {
      const report = await reportRequests.sessionReport(sessionId);
      sessionReport.set(report ?? null);
    } catch (err) {
      error.set(err instanceof ApiError ? err.message : "Erro ao carregar relatório da sessão");
      sessionReport.set(null);
    } finally {
      loading.set(false);
    }
  }

  function reset() {
    quizReport.set([]);
    sessions.set([]);
    sessionReport.set(null);
    loading.set(false);
    error.set(null);
  }

  return {
    quizReport: { subscribe: quizReport.subscribe },
    sessions: { subscribe: sessions.subscribe },
    sessionReport: { subscribe: sessionReport.subscribe },
    loading: { subscribe: loading.subscribe },
    error: { subscribe: error.subscribe },
    loadQuizReport,
    loadSessionReport,
    reset,
  };
}

export const report = createReportStore();
