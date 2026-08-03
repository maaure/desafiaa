import { createMutation, useQueryClient } from "@tanstack/svelte-query";
import { quizRequests } from "./quizzes.requests";
import { quizKeys } from "./quizzes.queries";
import type { Quiz, QuizSavePayload } from "./quizzes.types";

// ── Save em uma única requisição ─────────────────────────────────────
// Envia o documento completo (quiz + perguntas + alternativas) ao upsert
// POST /api/quizzes. IDs temporários do draft ficam de fora — presença de
// id = atualizar, ausência = criar.

const TEMP_ID_PREFIXES = ["temp_", "a_", "ta_", "tb_"];

function isRealId(id: string): boolean {
  return !TEMP_ID_PREFIXES.some((prefix) => id.startsWith(prefix));
}

export function useSaveQuiz() {
  const qc = useQueryClient();

  return createMutation(() => ({
    mutationFn: async (draft: Quiz): Promise<Quiz> => {
      const payload: QuizSavePayload = {
        id: draft.id || undefined,
        title: draft.title,
        description: draft.description,
        isPublished: draft.isPublished,
        isPublic: draft.isPublic,
        questions: draft.questions.map((q) => ({
          ...(isRealId(q.id) ? { id: q.id } : {}),
          text: q.text,
          questionType: q.questionType,
          basePoints: q.basePoints,
          imageUrl: q.imageUrl,
          alternatives: q.alternatives.map((a) => ({
            ...(isRealId(a.id) ? { id: a.id } : {}),
            text: a.text,
            isCorrect: a.isCorrect,
            imageUrl: a.imageUrl,
          })),
        })),
      };
      return quizRequests.save(payload);
    },
    onSuccess: () => {
      // Refetch lista e detalhe — o editor volta a receber o estado real do servidor
      qc.invalidateQueries({ queryKey: quizKeys.all });
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

// ── Upload ───────────────────────────────────────────────────────────

export function useUploadImage() {
  return createMutation(() => ({
    mutationFn: (file: File) => quizRequests.uploadImage(file),
  }));
}
