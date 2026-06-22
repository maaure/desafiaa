import { api } from "./client";

export const quizzesApi = {
  list: (page = 1) => api.fetch<any>(`/api/quizzes?page=${page}`),
  getById: (id: string) => api.fetch<any>(`/api/quizzes/${id}`),
  create: (body: { title: string; description?: string }) =>
    api.fetch<any>("/api/quizzes", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: any) =>
    api.fetch<any>(`/api/quizzes/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (id: string) => api.fetch<void>(`/api/quizzes/${id}`, { method: "DELETE" }),

  // Questions
  addQuestion: (quizId: string, body: any) =>
    api.fetch<any>(`/api/quizzes/${quizId}/questions`, { method: "POST", body: JSON.stringify(body) }),
  updateQuestion: (id: string, body: any) =>
    api.fetch<any>(`/api/questions/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteQuestion: (id: string) =>
    api.fetch<void>(`/api/questions/${id}`, { method: "DELETE" }),
  reorderQuestion: (id: string, sortOrder: number) =>
    api.fetch<any>(`/api/questions/${id}/order`, { method: "PUT", body: JSON.stringify({ sortOrder }) }),

  // Alternatives
  addAlternative: (questionId: string, body: any) =>
    api.fetch<any>(`/api/questions/${questionId}/alternatives`, { method: "POST", body: JSON.stringify(body) }),
  updateAlternative: (id: string, body: any) =>
    api.fetch<any>(`/api/alternatives/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteAlternative: (id: string) =>
    api.fetch<void>(`/api/alternatives/${id}`, { method: "DELETE" }),
  markCorrect: (id: string) =>
    api.fetch<any>(`/api/alternatives/${id}/correct`, { method: "PUT" }),
};
