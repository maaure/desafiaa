import { api } from "./client";

export const sessionsApi = {
  create: (quizId: string) =>
    api.fetch<{ id: string; pin: string; quizTitle: string; status: string; timeLimitSeconds: number }>(
      "/api/sessions",
      { method: "POST", body: JSON.stringify({ quizId }) },
    ),

  getById: (id: string) =>
    api.fetch<any>(`/api/sessions/${id}`),

  getResults: (id: string) =>
    api.fetch<any>(`/api/sessions/${id}/results`),

  verifyPin: (pin: string) =>
    api.fetch<{ sessionId: string; pin: string; quizTitle: string; status: string }>(
      `/api/sessions/join/${pin}`,
    ),
};
