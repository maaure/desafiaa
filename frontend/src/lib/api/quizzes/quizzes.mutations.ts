import { createMutation, useQueryClient } from "@tanstack/svelte-query";
import { quizRequests } from "./quizzes.requests";
import { quizKeys } from "./quizzes.queries";
import type { Quiz } from "./quizzes.types";

// ── Save composto ────────────────────────────────────────────────────
// Persiste o draft completo do editor: cria/atualiza o quiz, sincroniza
// perguntas e alternativas, e devolve o quiz com os IDs reais do servidor.

export function useSaveQuiz() {
  const qc = useQueryClient();

  return createMutation(() => ({
    mutationFn: async (draft: Quiz): Promise<Quiz> => {
      let quizId = draft.id;

      // Step 1: Create or update quiz metadata
      if (quizId) {
        await quizRequests.update(quizId, {
          title: draft.title,
          description: draft.description,
          isPublished: draft.isPublished,
        });
      } else {
        const created = await quizRequests.create({
          title: draft.title,
          description: draft.description ?? undefined,
        });
        quizId = created.id;
      }

      // Step 2: Sync questions and alternatives
      const updatedQuestions: Quiz["questions"] = [];

      for (const qn of draft.questions) {
        let questionId = qn.id;
        const isNewQuestion = questionId.startsWith("temp_");
        const questionPayload: {
          text: string;
          questionType: "multiple_choice" | "true_false";
          basePoints?: number;
          imageUrl?: string | null;
        } = {
          text: qn.text,
          questionType: qn.questionType,
          basePoints: qn.basePoints,
          imageUrl: qn.imageUrl,
        };

        if (isNewQuestion) {
          const created = await quizRequests.addQuestion(quizId, questionPayload);
          questionId = created.id;
        } else {
          await quizRequests.updateQuestion(questionId, questionPayload);
        }

        // Sync alternatives
        const updatedAlternatives = [];
        for (const alt of qn.alternatives) {
          let altId = alt.id;
          const isNewAlt =
            alt.id.startsWith("a_") || alt.id.startsWith("ta_") || alt.id.startsWith("tb_");

          if (isNewAlt) {
            const created = await quizRequests.addAlternative(questionId, {
              text: alt.text,
              imageUrl: alt.imageUrl,
              isCorrect: alt.isCorrect,
            });
            altId = created.id;
          } else {
            await quizRequests.updateAlternative(altId, {
              text: alt.text,
              imageUrl: alt.imageUrl,
              isCorrect: alt.isCorrect,
            });
            // If marked correct, ensure consistency via the /correct endpoint
            if (alt.isCorrect) {
              await quizRequests.markCorrect(altId);
            }
          }

          updatedAlternatives.push({ ...alt, id: altId });
        }

        updatedQuestions.push({ ...qn, id: questionId, alternatives: updatedAlternatives });
      }

      return { ...draft, id: quizId, questions: updatedQuestions };
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
