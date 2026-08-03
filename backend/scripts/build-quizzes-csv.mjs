/**
 * Gera scripts/quizzes.csv a partir dos questionários em markdown (../questions/*.md).
 *
 * Uso: node scripts/build-quizzes-csv.mjs
 * Uma linha por alternativa — quiz e pergunta se repetem nas linhas.
 * Colunas: quiz_title, quiz_description, quiz_public, author_email,
 *          question_text, question_type, alternative_text, alternative_is_correct
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const QUESTIONS_DIR = resolve(ROOT, "../questions");
const CSV_PATH = join(ROOT, "scripts/quizzes.csv");

// Autores por posição (1–4 → clara, 5–7 → joao) — usuários existentes no banco
const AUTHORS = ["clara@quiz.com", "clara@quiz.com", "clara@quiz.com", "clara@quiz.com", "joao@quiz.com", "joao@quiz.com", "joao@quiz.com"];

function parseQuizFile(file) {
  const lines = readFileSync(join(QUESTIONS_DIR, file), "utf-8").split("\n");
  const title = (lines[0] ?? "").replace(/^#\s*/, "").replace(/^Questionário \d+ —\s*/, "").trim();
  const description = (lines[2] ?? "").trim();

  let section = null;
  const questions = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("## ")) {
      section = line.slice(3).trim();
      continue;
    }
    if (section === "Gabarito") continue;

    const qMatch = line.match(/^\*\*(\d+)\.\s*(.+?)\*\*$/);
    if (qMatch) {
      questions.push({ text: qMatch[2], type: null, alternatives: [] });
      continue;
    }

    const altMatch = line.match(/^- \[(x| )\]\s*(.+)$/);
    if (altMatch && questions.length > 0) {
      const current = questions[questions.length - 1];
      const isCorrect = altMatch[1] === "x";
      let text = altMatch[2];

      if (section === "Verdadeiro ou falso") {
        current.type = "true_false";
        text = text.startsWith("V") ? "Verdadeiro" : "Falso";
      } else {
        current.type = "multiple_choice";
        text = text.replace(/^[a-z]\)\s*/, "").split(" — ")[0];
      }
      current.alternatives.push({ text, isCorrect });
    }
  }

  return { title, description, questions };
}

// Escapa campo RFC4180: aspas duplicadas; aspas quando há vírgula/aspas/quebra
function csvField(value) {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const files = readdirSync(QUESTIONS_DIR)
  .filter((f) => f.startsWith("questionario-"))
  .sort();

const header = [
  "quiz_title",
  "quiz_description",
  "quiz_public",
  "author_email",
  "question_text",
  "question_type",
  "alternative_text",
  "alternative_is_correct",
];

const rows = [header.join(",")];
let totalAlternatives = 0;

files.forEach((file, i) => {
  const quiz = parseQuizFile(file);
  for (const q of quiz.questions) {
    for (const alt of q.alternatives) {
      rows.push(
        [
          csvField(quiz.title),
          csvField(quiz.description),
          "true",
          AUTHORS[i],
          csvField(q.text),
          q.type,
          csvField(alt.text),
          alt.isCorrect ? "true" : "false",
        ].join(","),
      );
      totalAlternatives++;
    }
  }
});

writeFileSync(CSV_PATH, rows.join("\n") + "\n");
console.log(`✅ ${files.length} questionários → ${CSV_PATH} (${totalAlternatives} alternativas em ${rows.length - 1} linhas)`);
