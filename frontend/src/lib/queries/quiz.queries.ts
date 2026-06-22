import { createQuery, createMutation, useQueryClient } from "@tanstack/svelte-query";
import { quizzesApi } from "$lib/api/quizzes";

// ── Query Keys ───────────────────────────────────────────────────────

export const quizKeys = {
  all: ["quizzes"] as const,
  list: (page: number) => ["quizzes", "list", page] as const,
  detail: (id: string) => ["quizzes", "detail", id] as const,
};

// ── Queries ──────────────────────────────────────────────────────────

export function useQuizList(page = 1) {
  return createQuery(() => ({
    queryKey: quizKeys.list(page),
    queryFn: () => quizzesApi.list(page),
  }));
}

export function useQuiz(id: string) {
  return createQuery(() => ({
    queryKey: quizKeys.detail(id),
    queryFn: () => quizzesApi.getById(id),
    enabled: !!id,
  }));
}

// ── Mutations ────────────────────────────────────────────────────────

export function useCreateQuiz() {
  const qc = useQueryClient();

  return createMutation(() => ({
    mutationFn: (body: { title: string; description?: string }) => quizzesApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: quizKeys.all });
    },
  }));
}

export function useUpdateQuiz() {
  const qc = useQueryClient();

  return createMutation(() => ({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: { title?: string; description?: string | null };
    }) => quizzesApi.update(id, body),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: quizKeys.detail(variables.id) });
      qc.invalidateQueries({ queryKey: ["quizzes", "list"] });
    },
  }));
}

export function useDeleteQuiz() {
  const qc = useQueryClient();

  return createMutation(() => ({
    mutationFn: (id: string) => quizzesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: quizKeys.all });
    },
  }));
}

// ── Question mutations ───────────────────────────────────────────────

export function useAddQuestion() {
  const qc = useQueryClient();

  return createMutation(() => ({
    mutationFn: ({
      quizId,
      body,
    }: {
      quizId: string;
      body: { text: string; questionType: "multiple_choice" | "true_false"; basePoints?: number };
    }) => quizzesApi.addQuestion(quizId, body),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: quizKeys.detail(variables.quizId) });
    },
  }));
}

export function useUpdateQuestion() {
  const qc = useQueryClient();

  return createMutation(() => ({
    mutationFn: ({ id, body }: { id: string; body: { text?: string; basePoints?: number } }) =>
      quizzesApi.updateQuestion(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: quizKeys.all });
    },
  }));
}

export function useDeleteQuestion() {
  const qc = useQueryClient();

  return createMutation(() => ({
    mutationFn: ({ id }: { id: string; quizId: string }) => quizzesApi.deleteQuestion(id),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: quizKeys.detail(variables.quizId) });
    },
  }));
}

// ── Alternative mutations ────────────────────────────────────────────

export function useAddAlternative() {
  const qc = useQueryClient();

  return createMutation(() => ({
    mutationFn: ({ questionId, body }: { questionId: string; body: { text: string } }) =>
      quizzesApi.addAlternative(questionId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: quizKeys.all });
    },
  }));
}

export function useUpdateAlternative() {
  const qc = useQueryClient();

  return createMutation(() => ({
    mutationFn: ({ id, body }: { id: string; body: { text?: string } }) =>
      quizzesApi.updateAlternative(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: quizKeys.all });
    },
  }));
}

export function useDeleteAlternative() {
  const qc = useQueryClient();

  return createMutation(() => ({
    mutationFn: ({ id }: { id: string; quizId: string }) => quizzesApi.deleteAlternative(id),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: quizKeys.detail(variables.quizId) });
    },
  }));
}

export function useMarkCorrect() {
  const qc = useQueryClient();

  return createMutation(() => ({
    mutationFn: (id: string) => quizzesApi.markCorrect(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: quizKeys.all });
    },
  }));
}
