import { api } from "$lib/api/client";
import type { PublicQuizListItem, Quiz, QuizListItem, QuizSavePayload } from "./quizzes.types";

export const quizRequests = {
  list: (page = 1) =>
    api.get<{ data: QuizListItem[]; total: number; page: number; limit: number }>(
      `/api/quizzes?page=${page}`,
    ),

  getById: (id: string) =>
    api.get<{
      id: string;
      title: string;
      description: string | null;
      isPublished: boolean;
      isPublic: boolean;
      createdAt: string;
      questions: Array<{
        id: string;
        text: string;
        imageUrl?: string | null;
        questionType: "multiple_choice" | "true_false";
        basePoints: number;
        sortOrder: number;
        alternatives: Array<{
          id: string;
          text: string;
          imageUrl?: string | null;
          isCorrect: boolean;
          sortOrder: number;
        }>;
      }>;
    }>(`/api/quizzes/${id}`),

  // Upsert único: id no payload = edição, ausente = criação
  save: (body: QuizSavePayload) => api.post<Quiz>("/api/quizzes", body),

  listPublic: (search: string, page = 1) =>
    api.get<{ data: PublicQuizListItem[]; total: number; page: number; limit: number }>(
      `/api/quizzes/public?search=${encodeURIComponent(search)}&page=${page}`,
    ),

  remove: (id: string) => api.delete<void>(`/api/quizzes/${id}`),

  // Upload de imagem
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.upload<{ url: string }>("/api/upload", formData);
  },
};
