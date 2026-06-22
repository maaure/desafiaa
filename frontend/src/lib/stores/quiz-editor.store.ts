import { writable, derived, get } from "svelte/store";
import { quizzesApi } from "$lib/api/quizzes";
import type { Quiz, QuizListItem } from "$lib/types/quiz";

function createQuizEditorStore() {
  const quiz = writable<Quiz | null>(null);
  const selectedQuestionIdx = writable<number | null>(null);
  const isSaving = writable(false);
  const errors = writable<Record<string, string>>({});

  // List management for dashboard
  const quizList = writable<QuizListItem[]>([]);
  const isLoadingList = writable(false);
  const listError = writable<string | null>(null);

  const selectedQuestion = derived([quiz, selectedQuestionIdx], ([$q, $i]) =>
    $i !== null && $q ? $q.questions[$i] : null,
  );

  function validate(q: Quiz): Record<string, string> {
    const e: Record<string, string> = {};
    if (q.questions.length < 2) e.questions = "Mínimo 2 perguntas";
    for (const qn of q.questions) {
      if (qn.alternatives.length < 2) e[`q_${qn.id}`] = "Mínimo 2 alternativas";
      if (!qn.alternatives.some((a) => a.isCorrect)) e[`q_${qn.id}`] = "Defina a correta";
    }
    return e;
  }

  return {
    subscribe: quiz.subscribe,
    selectedQuestion,
    isSaving: { subscribe: isSaving.subscribe },
    errors: { subscribe: errors.subscribe },
    quizList: { subscribe: quizList.subscribe },
    isLoadingList: { subscribe: isLoadingList.subscribe },
    listError: { subscribe: listError.subscribe },

    async load(quizId: string) {
      const data = await quizzesApi.getById(quizId);
      quiz.set(data);
    },

    initNew(title: string) {
      quiz.set({
        id: "",
        title,
        description: null,
        isPublished: false,
        createdAt: "",
        questions: [],
      });
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

    async save(): Promise<boolean> {
      const current = get(quiz);
      if (!current) return false;
      const validationErrors = validate(current);
      if (Object.keys(validationErrors).length > 0) {
        errors.set(validationErrors);
        return false;
      }
      isSaving.set(true);
      try {
        let quizId = current.id;

        // Step 1: Create or update quiz metadata
        if (quizId) {
          await quizzesApi.update(quizId, {
            title: current.title,
            description: current.description,
            isPublished: current.isPublished,
          });
        } else {
          const created = await quizzesApi.create({
            title: current.title,
            description: current.description ?? undefined,
          });
          quizId = created.id;
        }

        // Step 2: Sync questions and alternatives
        const qIdToRealId = new Map<string, string>();
        const updatedQuestions: typeof current.questions = [];

        for (const qn of current.questions) {
          let questionId = qn.id;

          const isNewQuestion = questionId.startsWith("temp_");
          const questionPayload = {
            text: qn.text,
            questionType: qn.questionType,
            basePoints: qn.basePoints,
          };

          if (isNewQuestion) {
            const created = await quizzesApi.addQuestion(quizId, questionPayload);
            questionId = created.id;
            qIdToRealId.set(qn.id, questionId);
          } else {
            await quizzesApi.updateQuestion(questionId, questionPayload);
          }

          // Sync alternatives
          const updatedAlternatives = [];
          for (const alt of qn.alternatives) {
            let altId = alt.id;
            const isNewAlt =
              alt.id.startsWith("a_") || alt.id.startsWith("ta_") || alt.id.startsWith("tb_");

            if (isNewAlt) {
              const created = await quizzesApi.addAlternative(questionId, {
                text: alt.text,
                isCorrect: alt.isCorrect,
              });
              altId = created.id;
            } else {
              await quizzesApi.updateAlternative(altId, {
                text: alt.text,
                isCorrect: alt.isCorrect,
              });
              // If marked correct, ensure consistency via the /correct endpoint
              if (alt.isCorrect) {
                await quizzesApi.markCorrect(altId);
              }
            }

            updatedAlternatives.push({ ...alt, id: altId });
          }

          updatedQuestions.push({ ...qn, id: questionId, alternatives: updatedAlternatives });
        }

        // Step 3: Update store with real IDs from server
        quiz.update((q) => {
          if (!q) return q;
          return { ...q, id: quizId, questions: updatedQuestions };
        });

        errors.set({});
        return true;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erro ao salvar";
        errors.set({ save: msg });
        return false;
      } finally {
        isSaving.set(false);
      }
    },

    async loadList() {
      isLoadingList.set(true);
      listError.set(null);
      try {
        const response = await quizzesApi.list();
        const items: QuizListItem[] = (response.data ?? []) as QuizListItem[];
        quizList.set(items);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erro ao carregar lista";
        listError.set(msg);
      } finally {
        isLoadingList.set(false);
      }
    },

    async deleteQuiz(id: string) {
      await quizzesApi.remove(id);
      quizList.update((list) => list.filter((q) => q.id !== id));
    },
  };
}

export const quizEditor = createQuizEditorStore();
