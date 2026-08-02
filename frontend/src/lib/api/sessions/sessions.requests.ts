import { api } from "$lib/api/client";
import type { ActiveSession } from "./sessions.types";

export const sessionRequests = {
  create: (quizId: string) =>
    api.post<{
      id: string;
      pin: string;
      quizTitle: string;
      status: string;
      timeLimitSeconds: number;
    }>("/api/sessions", { quizId }),

  listActive: () => api.get<ActiveSession[]>("/api/sessions"),

  getById: (id: string) =>
    api.get<{
      id: string;
      pin: string;
      quizTitle: string;
      status: string;
      timeLimitSeconds: number;
    }>(`/api/sessions/${id}`),

  getResults: (id: string) =>
    api.get<{
      rankings: Array<{
        nickname: string;
        score: number;
        correctCount: number;
      }>;
    }>(`/api/sessions/${id}/results`),

  verifyPin: (pin: string) =>
    api.get<{
      sessionId: string;
      pin: string;
      quizTitle: string;
      status: string;
    }>(`/api/sessions/join/${pin}`),
};
