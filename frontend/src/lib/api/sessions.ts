import { api } from "./client";

export const sessionsApi = {
  create: (quizId: string) =>
    api.post<{
      id: string;
      pin: string;
      quizTitle: string;
      status: string;
      timeLimitSeconds: number;
    }>("/api/sessions", { quizId }),

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
