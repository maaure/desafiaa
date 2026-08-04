import type { Quiz } from "./quizzes.types";

/** Espelha as regras do backend (quiz.schema.ts) — texto obrigatório em título, perguntas e alternativas */
export function validateQuiz(q: Quiz): Record<string, string> {
  const e: Record<string, string> = {};
  if (!q.title.trim()) e.title = "Título é obrigatório";
  if (q.questions.length < 2) e.questions = "Mínimo 2 perguntas";
  for (const qn of q.questions) {
    if (!qn.text.trim()) {
      e[`q_${qn.id}`] = "Preencha o texto da pergunta";
      continue;
    }
    if (qn.alternatives.some((a) => !a.text.trim())) {
      e[`q_${qn.id}`] = "Preencha o texto das alternativas";
      continue;
    }
    if (qn.alternatives.length < 2) e[`q_${qn.id}`] = "Mínimo 2 alternativas";
    if (!qn.alternatives.some((a) => a.isCorrect)) e[`q_${qn.id}`] = "Defina a correta";
  }
  return e;
}
