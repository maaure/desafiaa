import { createMutation, useQueryClient } from "@tanstack/svelte-query";
import { quizRequests } from "./quizzes.requests";
import { quizKeys } from "./quizzes.queries";
import type { Quiz, QuizSavePayload } from "./quizzes.types";

// ── Save em uma única requisição ─────────────────────────────────────
// Envia o documento completo (quiz + perguntas + alternativas) ao upsert
// POST /api/quizzes. IDs temporários do draft ficam de fora — presença de
// id = atualizar, ausência = criar.

const TEMP_ID_PREFIXES = ["temp_", "a_", "ta_", "tb_"];

// id vazio também é "criar" — nunca envie id "" como update
function isRealId(id: string): boolean {
  return id !== "" && !TEMP_ID_PREFIXES.some((prefix) => id.startsWith(prefix));
}

/** Monta o payload do upsert — usado pela mutation e por quem cria clone (ex.: copiar quiz público) */
export function buildSavePayload(draft: Quiz): QuizSavePayload {
  return {
    id: draft.id || undefined,
    title: draft.title,
    description: draft.description,
    // Todo quiz é criado publicado — não existe mais rascunho não publicado
    isPublished: true,
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
}

export function useSaveQuiz() {
  const qc = useQueryClient();

  return createMutation(() => ({
    mutationFn: (draft: Quiz) => quizRequests.save(buildSavePayload(draft)),
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
