/**
 * Insere os questionários de scripts/quizzes.csv nas tabelas
 * quizzes → questions → alternatives (NÃO destrutivo: não apaga nada).
 *
 * Uso: npx tsx scripts/insert-quizzes-from-csv.ts
 *
 * Regras:
 *  - Quiz já existente com o mesmo título é pulado (idempotente).
 *  - O autor é resolvido por e-mail (author_email) — o usuário precisa existir.
 *  - Ordem das perguntas/alternativas = ordem das linhas no CSV.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { db, schema } from "../src/db/index.js";

const CSV_PATH = join(dirname(fileURLToPath(import.meta.url)), "quizzes.csv");

// ── CSV mínimo (RFC 4180: aspas duplicadas dentro de campos citados) ──

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 && r.some((v) => v !== ""));
}

interface CsvRow {
  quizTitle: string;
  quizDescription: string;
  quizPublic: boolean;
  authorEmail: string;
  questionText: string;
  questionType: "multiple_choice" | "true_false";
  alternativeText: string;
  alternativeCorrect: boolean;
}

function parseRows(lines: string[][]): CsvRow[] {
  const [header, ...rest] = lines;
  const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i]));
  return rest.map((r) => ({
    quizTitle: r[idx["quiz_title"]],
    quizDescription: r[idx["quiz_description"]],
    quizPublic: r[idx["quiz_public"]] === "true",
    authorEmail: r[idx["author_email"]].trim().toLowerCase(),
    questionText: r[idx["question_text"]],
    questionType: r[idx["question_type"]] as CsvRow["questionType"],
    alternativeText: r[idx["alternative_text"]],
    alternativeCorrect: r[idx["alternative_is_correct"]] === "true",
  }));
}

// ── Inserção ──────────────────────────────────────────────────────────

async function insert() {
  const rows = parseRows(parseCsv(readFileSync(CSV_PATH, "utf-8")));
  console.log(`📄 ${CSV_PATH} — ${rows.length} linhas`);

  // Autores por e-mail (uma vez só)
  const emails = [...new Set(rows.map((r) => r.authorEmail))];
  const users = await db.query.users.findMany({
    where: (u, { inArray }) => inArray(u.email, emails),
  });
  const userByEmail = new Map(users.map((u) => [u.email, u]));
  for (const email of emails) {
    if (!userByEmail.has(email)) {
      console.error(`❌ Usuário não encontrado: ${email} — crie-o antes (ex.: via seed).`);
      process.exit(1);
    }
  }

  // Agrupa linhas: quiz → perguntas → alternativas (ordem do CSV preservada)
  const quizzes = new Map<
    string,
    {
      description: string;
      isPublic: boolean;
      authorId: string;
      questions: Map<
        string,
        { type: string; alternatives: { text: string; isCorrect: boolean }[] }
      >;
    }
  >();

  for (const r of rows) {
    const quiz = quizzes.get(r.quizTitle) ?? {
      description: r.quizDescription,
      isPublic: r.quizPublic,
      authorId: userByEmail.get(r.authorEmail)!.id,
      questions: new Map(),
    };
    const question = quiz.questions.get(r.questionText) ?? {
      type: r.questionType,
      alternatives: [],
    };
    question.alternatives.push({ text: r.alternativeText, isCorrect: r.alternativeCorrect });
    quiz.questions.set(r.questionText, question);
    quizzes.set(r.quizTitle, quiz);
  }

  let insertedQuizzes = 0;
  let insertedQuestions = 0;
  let insertedAlternatives = 0;
  let skippedQuizzes = 0;

  for (const [title, quiz] of quizzes) {
    const existing = await db.query.quizzes.findFirst({
      where: eq(schema.quizzes.title, title),
    });
    if (existing) {
      console.log(`   ⏭️  Quiz "${title}" já existe — pulando`);
      skippedQuizzes++;
      continue;
    }

    const [created] = await db
      .insert(schema.quizzes)
      .values({
        title,
        description: quiz.description || null,
        isPublished: true,
        isPublic: quiz.isPublic,
        authorId: quiz.authorId,
      })
      .returning();

    let qi = 0;
    for (const [questionText, question] of quiz.questions) {
      const [q] = await db
        .insert(schema.questions)
        .values({
          quizId: created.id,
          text: questionText,
          questionType: question.type as "multiple_choice" | "true_false",
          basePoints: 1000,
          sortOrder: qi++,
        })
        .returning();

      await db.insert(schema.alternatives).values(
        question.alternatives.map((a, ai) => ({
          questionId: q.id,
          text: a.text,
          isCorrect: a.isCorrect,
          sortOrder: ai,
        })),
      );

      insertedQuestions++;
      insertedAlternatives += question.alternatives.length;
    }

    insertedQuizzes++;
    console.log(
      `   ✅ Quiz "${title}" — ${quiz.questions.size} perguntas (autor ${quiz.authorId})`,
    );
  }

  console.log("\n══════════════════════════════════════════");
  console.log("📊 Resumo:");
  console.log(`   Quizzes inseridos:   ${insertedQuizzes}`);
  console.log(`   Quizzes pulados:     ${skippedQuizzes}`);
  console.log(`   Perguntas inseridas: ${insertedQuestions}`);
  console.log(`   Alternativas:        ${insertedAlternatives}`);
}

insert()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Inserção falhou:", err);
    process.exit(1);
  });
