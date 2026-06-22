import { api } from "./client";

export const quizzesApi = {
  list: (page = 1) =>
    api.get<{ data?: unknown[]; total?: number; page?: number; limit?: number }>(
      `/api/quizzes?page=${page}`,
    ),

  getById: (id: string) =>
    api.get<{
      id: string;
      title: string;
      description: string | null;
      isPublished: boolean;
      createdAt: string;
      questions: Array<{
        id: string;
        text: string;
        questionType: "multiple_choice" | "true_false";
        basePoints: number;
        sortOrder: number;
        alternatives: Array<{
          id: string;
          text: string;
          isCorrect: boolean;
          sortOrder: number;
        }>;
      }>;
    }>(`/api/quizzes/${id}`),

  create: (body: { title: string; description?: string }) =>
    api.post<{ id: string; title: string }>("/api/quizzes", body),

  update: (
    id: string,
    body: { title?: string; description?: string | null; isPublished?: boolean },
  ) => api.put<{ id: string; title: string; isPublished: boolean }>(`/api/quizzes/${id}`, body),

  remove: (id: string) => api.delete<void>(`/api/quizzes/${id}`),

  // Questions
  addQuestion: (
    quizId: string,
    body: { text: string; questionType: "multiple_choice" | "true_false"; basePoints?: number },
  ) =>
    api.post<{ id: string; text: string; sortOrder: number }>(
      `/api/quizzes/${quizId}/questions`,
      body,
    ),

  updateQuestion: (id: string, body: { text?: string; basePoints?: number }) =>
    api.put<{ id: string }>(`/api/questions/${id}`, body),

  deleteQuestion: (id: string) => api.delete<void>(`/api/questions/${id}`),

  reorderQuestion: (id: string, sortOrder: number) =>
    api.put<{ id: string; sortOrder: number }>(`/api/questions/${id}/order`, { sortOrder }),

  // Alternatives
  addAlternative: (questionId: string, body: { text: string; isCorrect?: boolean }) =>
    api.post<{ id: string; text: string; sortOrder: number; isCorrect: boolean }>(
      `/api/questions/${questionId}/alternatives`,
      body,
    ),

  updateAlternative: (id: string, body: { text?: string; isCorrect?: boolean }) =>
    api.put<{ id: string; isCorrect: boolean }>(`/api/alternatives/${id}`, body),

  deleteAlternative: (id: string) => api.delete<void>(`/api/alternatives/${id}`),

  markCorrect: (id: string) =>
    api.put<{ id: string; isCorrect: boolean }>(`/api/alternatives/${id}/correct`),
};
