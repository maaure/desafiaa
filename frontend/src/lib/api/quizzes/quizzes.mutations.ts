import { createMutation, useQueryClient } from "@tanstack/svelte-query";
import { quizRequests } from "./quizzes.requests";
import { quizKeys } from "./quizzes.queries";

// ── Quiz mutations ───────────────────────────────────────────────────

export function useCreateQuiz() {
  const qc = useQueryClient();

  return createMutation(() => ({
    mutationFn: (body: { title: string; description?: string }) => quizRequests.create(body),
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
      body: { title?: string; description?: string | null; isPublished?: boolean };
    }) => quizRequests.update(id, body),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: quizKeys.detail(variables.id) });
      qc.invalidateQueries({ queryKey: ["quizzes", "list"] });
    },
  }));
}

export function useDeleteQuiz() {
  const qc = useQueryClient();

  return createMutation(() => ({
    mutationFn: (id: string) => quizRequests.remove(id),
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
    }) => quizRequests.addQuestion(quizId, body),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: quizKeys.detail(variables.quizId) });
    },
  }));
}

export function useUpdateQuestion() {
  const qc = useQueryClient();

  return createMutation(() => ({
    mutationFn: ({ id, body }: { id: string; body: { text?: string; basePoints?: number } }) =>
      quizRequests.updateQuestion(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: quizKeys.all });
    },
  }));
}

export function useDeleteQuestion() {
  const qc = useQueryClient();

  return createMutation(() => ({
    mutationFn: ({ id, quizId }: { id: string; quizId: string }) => quizRequests.deleteQuestion(id),
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
      quizRequests.addAlternative(questionId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: quizKeys.all });
    },
  }));
}

export function useUpdateAlternative() {
  const qc = useQueryClient();

  return createMutation(() => ({
    mutationFn: ({ id, body }: { id: string; body: { text?: string; isCorrect?: boolean } }) =>
      quizRequests.updateAlternative(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: quizKeys.all });
    },
  }));
}

export function useDeleteAlternative() {
  const qc = useQueryClient();

  return createMutation(() => ({
    mutationFn: ({ id, quizId }: { id: string; quizId: string }) =>
      quizRequests.deleteAlternative(id),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: quizKeys.detail(variables.quizId) });
    },
  }));
}

export function useMarkCorrect() {
  const qc = useQueryClient();

  return createMutation(() => ({
    mutationFn: (id: string) => quizRequests.markCorrect(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: quizKeys.all });
    },
  }));
}

// ── Upload mutation ─────────────────────────────────────────────────

export function useUploadImage() {
  return createMutation(() => ({
    mutationFn: (file: File) => quizRequests.uploadImage(file),
  }));
}
