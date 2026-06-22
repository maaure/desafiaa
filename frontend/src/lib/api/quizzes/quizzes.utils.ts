import type { Quiz } from "./quizzes.types";

/** Minimal validation — full server validation still applies on save. */
export function validateQuiz(q: Quiz): Record<string, string> {
  const e: Record<string, string> = {};
  if (q.questions.length < 2) e.questions = "Mínimo 2 perguntas";
  for (const qn of q.questions) {
    if (qn.alternatives.length < 2) e[`q_${qn.id}`] = "Mínimo 2 alternativas";
    if (!qn.alternatives.some((a) => a.isCorrect)) e[`q_${qn.id}`] = "Defina a correta";
  }
  return e;
}
