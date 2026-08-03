import { writable, derived } from "svelte/store";
import type { Quiz } from "$lib/api/quizzes/quizzes.types";

/**
 * Draft em edição do editor de quiz. É estado local do editor — o fetch
 * (useQuiz) alimenta via setQuiz e a persistência (useSaveQuiz) é mutation.
 */
function createQuizEditorStore() {
  const quiz = writable<Quiz | null>(null);
  const selectedQuestionIdx = writable<number | null>(null);
  // Snapshot do último estado carregado/salvo — base da comparação de dirty
  let original: Quiz | null = null;

  const selectedQuestion = derived([quiz, selectedQuestionIdx], ([$q, $i]) =>
    $i !== null && $q ? $q.questions[$i] : null,
  );

  /** Há alterações não salvas no draft? (JSON-serializable — comparação simples) */
  const isDirty = derived(quiz, ($q) => {
    if (!$q || !original) return false;
    return JSON.stringify($q) !== JSON.stringify(original);
  });

  return {
    subscribe: quiz.subscribe,
    selectedQuestion,
    isDirty,

    /** Alimenta o draft com os dados do servidor (via query) — reseta o snapshot */
    setQuiz(data: Quiz) {
      original = data;
      quiz.set(data);
    },

    /** Descarta o draft (ex.: quiz não encontrado / sem permissão) */
    clear() {
      original = null;
      quiz.set(null);
    },

    initNew(title: string) {
      const draft: Quiz = {
        id: "",
        title,
        description: null,
        isPublished: false,
        isPublic: false,
        createdAt: "",
        questions: [],
      };
      original = draft;
      quiz.set(draft);
    },

    updateTitle(title: string) {
      quiz.update((q) => (q ? { ...q, title } : q));
    },

    updateDescription(description: string | null) {
      quiz.update((q) => (q ? { ...q, description } : q));
    },

    togglePublished() {
      quiz.update((q) => (q ? { ...q, isPublished: !q.isPublished } : q));
    },

    togglePublic() {
      quiz.update((q) => (q ? { ...q, isPublic: !q.isPublic } : q));
    },

    addQuestion(type: "multiple_choice" | "true_false") {
      quiz.update((q) => {
        if (!q) return q;
        const newQ = {
          id: `temp_${Date.now()}`,
          text: "",
          questionType: type,
          basePoints: 1000,
          sortOrder: q.questions.length,
          alternatives:
            type === "true_false"
              ? [
                  { id: `ta_${Date.now()}`, text: "Verdadeiro", isCorrect: false, sortOrder: 0 },
                  { id: `tb_${Date.now()}`, text: "Falso", isCorrect: false, sortOrder: 1 },
                ]
              : [],
        };
        return { ...q, questions: [...q.questions, newQ] };
      });
    },

    removeQuestion(id: string) {
      quiz.update((q) => (q ? { ...q, questions: q.questions.filter((x) => x.id !== id) } : q));
    },

    updateQuestionText(questionId: string, text: string) {
      quiz.update((q) => {
        if (!q) return q;
        return {
          ...q,
          questions: q.questions.map((qn) => (qn.id === questionId ? { ...qn, text } : qn)),
        };
      });
    },

    updateAlternativeText(questionId: string, altId: string, text: string) {
      quiz.update((q) => {
        if (!q) return q;
        return {
          ...q,
          questions: q.questions.map((qn) =>
            qn.id === questionId
              ? {
                  ...qn,
                  alternatives: qn.alternatives.map((a) => (a.id === altId ? { ...a, text } : a)),
                }
              : qn,
          ),
        };
      });
    },

    addAlternative(questionId: string) {
      quiz.update((q) => {
        if (!q) return q;
        return {
          ...q,
          questions: q.questions.map((qn) =>
            qn.id === questionId
              ? {
                  ...qn,
                  alternatives: [
                    ...qn.alternatives,
                    {
                      id: `a_${Date.now()}`,
                      text: "",
                      isCorrect: false,
                      sortOrder: qn.alternatives.length,
                    },
                  ],
                }
              : qn,
          ),
        };
      });
    },

    updateQuestionImageUrl(questionId: string, url: string) {
      quiz.update((q) => {
        if (!q) return q;
        return {
          ...q,
          questions: q.questions.map((qn) =>
            qn.id === questionId ? { ...qn, imageUrl: url } : qn,
          ),
        };
      });
    },

    removeQuestionImage(questionId: string) {
      quiz.update((q) => {
        if (!q) return q;
        return {
          ...q,
          questions: q.questions.map((qn) =>
            qn.id === questionId ? { ...qn, imageUrl: null } : qn,
          ),
        };
      });
    },

    updateAlternativeImageUrl(questionId: string, altId: string, url: string) {
      quiz.update((q) => {
        if (!q) return q;
        return {
          ...q,
          questions: q.questions.map((qn) =>
            qn.id === questionId
              ? {
                  ...qn,
                  alternatives: qn.alternatives.map((a) =>
                    a.id === altId ? { ...a, imageUrl: url } : a,
                  ),
                }
              : qn,
          ),
        };
      });
    },

    removeAlternativeImage(questionId: string, altId: string) {
      quiz.update((q) => {
        if (!q) return q;
        return {
          ...q,
          questions: q.questions.map((qn) =>
            qn.id === questionId
              ? {
                  ...qn,
                  alternatives: qn.alternatives.map((a) =>
                    a.id === altId ? { ...a, imageUrl: null } : a,
                  ),
                }
              : qn,
          ),
        };
      });
    },

    markCorrect(questionId: string, alternativeId: string) {
      quiz.update((q) => {
        if (!q) return q;
        return {
          ...q,
          questions: q.questions.map((qn) =>
            qn.id === questionId
              ? {
                  ...qn,
                  alternatives: qn.alternatives.map((a) => ({
                    ...a,
                    isCorrect: a.id === alternativeId,
                  })),
                }
              : qn,
          ),
        };
      });
    },
  };
}

export const quizEditor = createQuizEditorStore();
