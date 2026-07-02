/**
 * Seed script — popula o banco com dados de demonstração.
 *
 * Uso: npx tsx src/db/seed.ts
 *
 * Cria:
 *  - 3 usuários (senha "123456" para todos)
 *  - 6 quizzes com questões e alternativas
 *  - 2 game sessions finalizadas com respostas e resultados
 *
 * ⚠️  Destrutivo: limpa todas as tabelas antes de inserir.
 */

import bcrypt from "bcrypt";
import { and, eq } from "drizzle-orm";
import { db, schema } from "./index";

// ── Helpers ──────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 4; // rounds baixos para seed ser rápido

async function hash(pw: string) {
  return bcrypt.hash(pw, BCRYPT_ROUNDS);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Seed principal ───────────────────────────────────────────────────

async function seed() {
  console.log("🧹 Limpando tabelas...");

  // Ordem reversa das FKs
  await db.delete(schema.gameResults);
  await db.delete(schema.playerAnswers);
  await db.delete(schema.gameSessions);
  await db.delete(schema.alternatives);
  await db.delete(schema.questions);
  await db.delete(schema.quizzes);
  await db.delete(schema.users);

  console.log("👤 Criando usuários...");

  const pw = await hash("123456");

  const [admin, clara, joao] = await db
    .insert(schema.users)
    .values([
      { name: "Admin", email: "admin@quiz.com", passwordHash: pw },
      { name: "Professora Clara", email: "clara@quiz.com", passwordHash: pw },
      { name: "Criador João", email: "joao@quiz.com", passwordHash: pw },
    ])
    .returning();

  console.log(`   ✅ ${admin.name} (${admin.email})`);
  console.log(`   ✅ ${clara.name} (${clara.email})`);
  console.log(`   ✅ ${joao.name} (${joao.email})`);

  // ── Quizzes ──────────────────────────────────────────────────────

  console.log("\n📝 Criando quizzes...");

  const quizDefs = [
    {
      authorId: admin.id,
      title: "Conhecimentos Gerais",
      description:
        "Teste seus conhecimentos sobre geografia, história e curiosidades do mundo.",
      isPublished: true,
    },
    {
      authorId: clara.id,
      title: "História do Brasil",
      description:
        "Do período colonial aos dias atuais: o quanto você sabe sobre a história brasileira?",
      isPublished: true,
    },
    {
      authorId: clara.id,
      title: "Matemática Básica",
      description:
        "Operações, frações, porcentagens e raciocínio lógico. Ideal para revisão do fundamental.",
      isPublished: true,
    },
    {
      authorId: joao.id,
      title: "Ciências da Natureza",
      description:
        "Biologia, química e física no cotidiano. Perguntas para todas as idades.",
      isPublished: true,
    },
    {
      authorId: joao.id,
      title: "Cultura Pop 🎬",
      description:
        "Filmes, séries, música e games. De clássicos a lançamentos recentes.",
      isPublished: true,
    },
    {
      authorId: admin.id,
      title: "Quiz Relâmpago ⚡",
      description:
        "Perguntas rápidas de verdadeiro ou falso — responda antes que o tempo acabe!",
      isPublished: false, // rascunho
    },
  ];

  const createdQuizzes = await db
    .insert(schema.quizzes)
    .values(quizDefs)
    .returning();

  for (const q of createdQuizzes) {
    console.log(
      `   ✅ "${q.title}" (${q.isPublished ? "publicado" : "rascunho"})`,
    );
  }

  // ── Questões e Alternativas ─────────────────────────────────────

  console.log("\n❓ Criando questões e alternativas...");

  const [conhecimentos, historia, matematica, ciencias, cultura, relampago] =
    createdQuizzes;

  // Cada questão: { text, type, basePoints, alternatives: { text, correct }[] }

  const questionDefs: Record<
    string,
    {
      quizId: string;
      text: string;
      questionType: "multiple_choice" | "true_false";
      basePoints: number;
      alternatives: { text: string; isCorrect: boolean }[];
    }[]
  > = {
    [conhecimentos.id]: [
      {
        quizId: conhecimentos.id,
        text: "Qual é o maior oceano do planeta?",
        questionType: "multiple_choice",
        basePoints: 1000,
        alternatives: [
          { text: "Atlântico", isCorrect: false },
          { text: "Pacífico", isCorrect: true },
          { text: "Índico", isCorrect: false },
          { text: "Ártico", isCorrect: false },
        ],
      },
      {
        quizId: conhecimentos.id,
        text: "Qual país tem o formato de uma bota?",
        questionType: "multiple_choice",
        basePoints: 1000,
        alternatives: [
          { text: "Espanha", isCorrect: false },
          { text: "Itália", isCorrect: true },
          { text: "Grécia", isCorrect: false },
          { text: "França", isCorrect: false },
        ],
      },
      {
        quizId: conhecimentos.id,
        text: "A Grande Muralha da China é visível do espaço a olho nu.",
        questionType: "true_false",
        basePoints: 1500,
        alternatives: [
          { text: "Verdadeiro", isCorrect: false },
          { text: "Falso", isCorrect: true },
        ],
      },
      {
        quizId: conhecimentos.id,
        text: "Qual elemento químico tem o símbolo 'O'?",
        questionType: "multiple_choice",
        basePoints: 1000,
        alternatives: [
          { text: "Ouro", isCorrect: false },
          { text: "Oxigênio", isCorrect: true },
          { text: "Ósmio", isCorrect: false },
          { text: "Orgânio", isCorrect: false },
        ],
      },
      {
        quizId: conhecimentos.id,
        text: "Quantos continentes existem no modelo mais comum ensinado no Brasil?",
        questionType: "multiple_choice",
        basePoints: 1000,
        alternatives: [
          { text: "5", isCorrect: false },
          { text: "6", isCorrect: true },
          { text: "7", isCorrect: false },
          { text: "8", isCorrect: false },
        ],
      },
      {
        quizId: conhecimentos.id,
        text: "O Sol é uma estrela.",
        questionType: "true_false",
        basePoints: 500,
        alternatives: [
          { text: "Verdadeiro", isCorrect: true },
          { text: "Falso", isCorrect: false },
        ],
      },
    ],
    [historia.id]: [
      {
        quizId: historia.id,
        text: "Em que ano o Brasil foi descoberto pelos portugueses?",
        questionType: "multiple_choice",
        basePoints: 1000,
        alternatives: [
          { text: "1492", isCorrect: false },
          { text: "1500", isCorrect: true },
          { text: "1498", isCorrect: false },
          { text: "1510", isCorrect: false },
        ],
      },
      {
        quizId: historia.id,
        text: "Quem proclamou a independência do Brasil?",
        questionType: "multiple_choice",
        basePoints: 1000,
        alternatives: [
          { text: "Dom Pedro I", isCorrect: true },
          { text: "Dom Pedro II", isCorrect: false },
          { text: "José Bonifácio", isCorrect: false },
          { text: "Tiradentes", isCorrect: false },
        ],
      },
      {
        quizId: historia.id,
        text: "A capital do Brasil sempre foi Brasília.",
        questionType: "true_false",
        basePoints: 800,
        alternatives: [
          { text: "Verdadeiro", isCorrect: false },
          { text: "Falso", isCorrect: true },
        ],
      },
      {
        quizId: historia.id,
        text: "Qual foi o período conhecido como 'Era Vargas'?",
        questionType: "multiple_choice",
        basePoints: 1200,
        alternatives: [
          { text: "1889–1900", isCorrect: false },
          { text: "1930–1945 e 1951–1954", isCorrect: true },
          { text: "1920–1935", isCorrect: false },
          { text: "1940–1960", isCorrect: false },
        ],
      },
      {
        quizId: historia.id,
        text: "O movimento da Inconfidência Mineira foi liderado por Tiradentes.",
        questionType: "true_false",
        basePoints: 800,
        alternatives: [
          { text: "Verdadeiro", isCorrect: true },
          { text: "Falso", isCorrect: false },
        ],
      },
    ],
    [matematica.id]: [
      {
        quizId: matematica.id,
        text: "Quanto é 25% de 200?",
        questionType: "multiple_choice",
        basePoints: 800,
        alternatives: [
          { text: "25", isCorrect: false },
          { text: "50", isCorrect: true },
          { text: "75", isCorrect: false },
          { text: "100", isCorrect: false },
        ],
      },
      {
        quizId: matematica.id,
        text: "Qual é o resultado de 12 × 8?",
        questionType: "multiple_choice",
        basePoints: 800,
        alternatives: [
          { text: "86", isCorrect: false },
          { text: "96", isCorrect: true },
          { text: "106", isCorrect: false },
          { text: "88", isCorrect: false },
        ],
      },
      {
        quizId: matematica.id,
        text: "Todo número primo é ímpar.",
        questionType: "true_false",
        basePoints: 1000,
        alternatives: [
          { text: "Verdadeiro", isCorrect: false },
          { text: "Falso", isCorrect: true },
        ],
      },
      {
        quizId: matematica.id,
        text: "Se um triângulo tem lados 3, 4 e 5, ele é um triângulo retângulo.",
        questionType: "true_false",
        basePoints: 1000,
        alternatives: [
          { text: "Verdadeiro", isCorrect: true },
          { text: "Falso", isCorrect: false },
        ],
      },
      {
        quizId: matematica.id,
        text: "Qual é a raiz quadrada de 144?",
        questionType: "multiple_choice",
        basePoints: 800,
        alternatives: [
          { text: "10", isCorrect: false },
          { text: "11", isCorrect: false },
          { text: "12", isCorrect: true },
          { text: "14", isCorrect: false },
        ],
      },
    ],
    [ciencias.id]: [
      {
        quizId: ciencias.id,
        text: "Qual é a fórmula química da água?",
        questionType: "multiple_choice",
        basePoints: 1000,
        alternatives: [
          { text: "CO₂", isCorrect: false },
          { text: "H₂O", isCorrect: true },
          { text: "NaCl", isCorrect: false },
          { text: "O₂", isCorrect: false },
        ],
      },
      {
        quizId: ciencias.id,
        text: "As plantas produzem seu alimento através da fotossíntese.",
        questionType: "true_false",
        basePoints: 800,
        alternatives: [
          { text: "Verdadeiro", isCorrect: true },
          { text: "Falso", isCorrect: false },
        ],
      },
      {
        quizId: ciencias.id,
        text: "Qual planeta é conhecido como 'Planeta Vermelho'?",
        questionType: "multiple_choice",
        basePoints: 1000,
        alternatives: [
          { text: "Vênus", isCorrect: false },
          { text: "Júpiter", isCorrect: false },
          { text: "Marte", isCorrect: true },
          { text: "Saturno", isCorrect: false },
        ],
      },
      {
        quizId: ciencias.id,
        text: "O som se propaga mais rápido na água do que no ar.",
        questionType: "true_false",
        basePoints: 1200,
        alternatives: [
          { text: "Verdadeiro", isCorrect: true },
          { text: "Falso", isCorrect: false },
        ],
      },
      {
        quizId: ciencias.id,
        text: "Quantos ossos tem o corpo humano adulto?",
        questionType: "multiple_choice",
        basePoints: 1000,
        alternatives: [
          { text: "106", isCorrect: false },
          { text: "156", isCorrect: false },
          { text: "186", isCorrect: false },
          { text: "206", isCorrect: true },
        ],
      },
    ],
    [cultura.id]: [
      {
        quizId: cultura.id,
        text: "Qual filme ganhou o Oscar de Melhor Filme em 2024?",
        questionType: "multiple_choice",
        basePoints: 1500,
        alternatives: [
          { text: "Barbie", isCorrect: false },
          { text: "Oppenheimer", isCorrect: true },
          { text: "Pobres Criaturas", isCorrect: false },
          { text: "Assassinos da Lua das Flores", isCorrect: false },
        ],
      },
      {
        quizId: cultura.id,
        text: "Qual banda lançou o álbum 'Abbey Road'?",
        questionType: "multiple_choice",
        basePoints: 1000,
        alternatives: [
          { text: "The Rolling Stones", isCorrect: false },
          { text: "The Beatles", isCorrect: true },
          { text: "Queen", isCorrect: false },
          { text: "Led Zeppelin", isCorrect: false },
        ],
      },
      {
        quizId: cultura.id,
        text: "Mario é o encanador mais famoso dos videogames.",
        questionType: "true_false",
        basePoints: 500,
        alternatives: [
          { text: "Verdadeiro", isCorrect: true },
          { text: "Falso", isCorrect: false },
        ],
      },
      {
        quizId: cultura.id,
        text: "Qual série é conhecida pela frase 'Winter is coming'?",
        questionType: "multiple_choice",
        basePoints: 1000,
        alternatives: [
          { text: "Breaking Bad", isCorrect: false },
          { text: "Game of Thrones", isCorrect: true },
          { text: "Stranger Things", isCorrect: false },
          { text: "The Witcher", isCorrect: false },
        ],
      },
      {
        quizId: cultura.id,
        text: "O anime 'One Piece' segue as aventuras de Monkey D. Luffy.",
        questionType: "true_false",
        basePoints: 800,
        alternatives: [
          { text: "Verdadeiro", isCorrect: true },
          { text: "Falso", isCorrect: false },
        ],
      },
    ],
    [relampago.id]: [
      {
        quizId: relampago.id,
        text: "O Brasil é o maior país da América do Sul.",
        questionType: "true_false",
        basePoints: 1000,
        alternatives: [
          { text: "Verdadeiro", isCorrect: true },
          { text: "Falso", isCorrect: false },
        ],
      },
      {
        quizId: relampago.id,
        text: "A Torre Eiffel fica em Londres.",
        questionType: "true_false",
        basePoints: 1000,
        alternatives: [
          { text: "Verdadeiro", isCorrect: false },
          { text: "Falso", isCorrect: true },
        ],
      },
      {
        quizId: relampago.id,
        text: "Shakespeare escreveu 'Romeu e Julieta'.",
        questionType: "true_false",
        basePoints: 1000,
        alternatives: [
          { text: "Verdadeiro", isCorrect: true },
          { text: "Falso", isCorrect: false },
        ],
      },
      {
        quizId: relampago.id,
        text: "O oxigênio é o gás mais abundante na atmosfera terrestre.",
        questionType: "true_false",
        basePoints: 1000,
        alternatives: [
          { text: "Verdadeiro", isCorrect: false },
          { text: "Falso", isCorrect: true },
        ],
      },
    ],
  };

  // ponytail: $inferInsert has optional id, but seed sets explicit IDs
  type SeedQuestion = typeof schema.questions.$inferInsert & { id: string };
  type SeedAlternative = typeof schema.alternatives.$inferInsert & { id: string; questionId: string };
  const allQuestions: SeedQuestion[] = [];
  const allAlternatives: SeedAlternative[] = [];

  for (const [quizId, questions] of Object.entries(questionDefs)) {
    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi];
      const questionId = crypto.randomUUID();
      allQuestions.push({
        id: questionId,
        quizId: q.quizId,
        text: q.text,
        questionType: q.questionType,
        basePoints: q.basePoints,
        sortOrder: qi,
      });
      for (let ai = 0; ai < q.alternatives.length; ai++) {
        const a = q.alternatives[ai];
        allAlternatives.push({
          id: crypto.randomUUID(),
          questionId,
          text: a.text,
          isCorrect: a.isCorrect,
          sortOrder: ai,
        });
      }
    }
  }

  await db.insert(schema.questions).values(allQuestions);
  await db.insert(schema.alternatives).values(allAlternatives);

  console.log(`   ✅ ${allQuestions.length} questões`);
  console.log(`   ✅ ${allAlternatives.length} alternativas`);

  // ── Game Sessions ────────────────────────────────────────────────

  console.log("\n🎮 Criando sessões de jogo...");

  // Agrupa questões por quiz para usar nas sessões
  const questionsByQuiz = new Map<string, SeedQuestion[]>();
  for (const q of allQuestions) {
    const list = questionsByQuiz.get(q.quizId) ?? [];
    list.push(q);
    questionsByQuiz.set(q.quizId, list);
  }

  // Sessão 1 — Conhecimentos Gerais, finalizada, com 6 jogadores
  const conhecimentosQuestions = questionsByQuiz.get(conhecimentos.id)!;
  const altByQuestion = new Map<string, SeedAlternative[]>();
  for (const a of allAlternatives) {
    const list = altByQuestion.get(a.questionId) ?? [];
    list.push(a);
    altByQuestion.set(a.questionId, list);
  }

  const [session1] = await db
    .insert(schema.gameSessions)
    .values({
      quizId: conhecimentos.id,
      hostId: admin.id,
      pin: "123456",
      status: "finished",
      timeLimitSeconds: 30,
      playerCount: 6,
      maxPlayers: 500,
      startedAt: new Date("2026-06-20T14:00:00Z"),
      finishedAt: new Date("2026-06-20T14:15:00Z"),
    })
    .returning();

  console.log(
    `   ✅ Sessão "${conhecimentos.title}" — PIN: ${session1.pin} (finalizada, 6 jogadores)`,
  );

  // Sessão 2 — Cultura Pop, finalizada, com 4 jogadores
  const [session2] = await db
    .insert(schema.gameSessions)
    .values({
      quizId: cultura.id,
      hostId: joao.id,
      pin: "789012",
      status: "finished",
      timeLimitSeconds: 20,
      playerCount: 4,
      maxPlayers: 500,
      startedAt: new Date("2026-06-21T10:00:00Z"),
      finishedAt: new Date("2026-06-21T10:10:00Z"),
    })
    .returning();

  console.log(
    `   ✅ Sessão "${cultura.title}" — PIN: ${session2.pin} (finalizada, 4 jogadores)`,
  );

  // ── Player Answers ───────────────────────────────────────────────

  console.log("\n🙋 Criando respostas dos jogadores...");

  const nicknames1 = [
    "JogadorX",
    "MestreAzul",
    "LuaNinja",
    "Foguete99",
    "PandaVoador",
    "Bolt",
  ];
  const nicknames2 = ["GamerTotal", "FeraQuiz", "EstrelaMar", "Rocket"];

  let totalAnswers = 0;

  // Respostas para session 1
  for (const nick of nicknames1) {
    for (const question of conhecimentosQuestions) {
      const alternatives = altByQuestion.get(question.id) ?? [];
      const correct = alternatives.find((a) => a.isCorrect);
      const wrongs = alternatives.filter((a) => !a.isCorrect);

      // ~70% de acerto para variar
      const isCorrect = Math.random() < 0.7;
      const chosen = isCorrect ? correct! : (pick(wrongs) ?? correct!);

      await db.insert(schema.playerAnswers).values({
        sessionId: session1.id,
        questionId: question.id,
        playerNickname: nick,
        selectedAnswer: chosen.text,
        isCorrect,
        responseMs: 2000 + Math.floor(Math.random() * 18000),
        pointsEarned: isCorrect ? question.basePoints : 0,
      });
      totalAnswers++;
    }
  }

  // Respostas para session 2
  const culturaQuestions = questionsByQuiz.get(cultura.id)!;
  for (const nick of nicknames2) {
    for (const question of culturaQuestions) {
      const alternatives = altByQuestion.get(question.id) ?? [];
      const correct = alternatives.find((a) => a.isCorrect);
      const wrongs = alternatives.filter((a) => !a.isCorrect);

      const isCorrect = Math.random() < 0.65;
      const chosen = isCorrect ? correct! : (pick(wrongs) ?? correct!);

      await db.insert(schema.playerAnswers).values({
        sessionId: session2.id,
        questionId: question.id,
        playerNickname: nick,
        selectedAnswer: chosen.text,
        isCorrect,
        responseMs: 1500 + Math.floor(Math.random() * 15000),
        pointsEarned: isCorrect ? question.basePoints : 0,
      });
      totalAnswers++;
    }
  }

  console.log(`   ✅ ${totalAnswers} respostas registradas`);

  // ── Game Results (leaderboard) ────────────────────────────────────

  console.log("\n🏆 Criando rankings...");

  async function computeResults(sessionId: string, nicknames: string[]) {
    // Agrupa respostas por jogador
    const results: {
      playerNickname: string;
      totalScore: number;
      correctCount: number;
      totalCount: number;
      avgResponseMs: number;
    }[] = [];

    for (const nick of nicknames) {
      const answers = await db
        .select()
        .from(schema.playerAnswers)
        .where(
          and(
            eq(schema.playerAnswers.sessionId, sessionId),
            eq(schema.playerAnswers.playerNickname, nick),
          ),
        );

      const totalScore = answers.reduce((sum, a) => sum + a.pointsEarned, 0);
      const correctCount = answers.filter((a) => a.isCorrect).length;
      const totalCount = answers.length;
      const avgResponseMs =
        totalCount > 0
          ? Math.round(
              answers.reduce((sum, a) => sum + a.responseMs, 0) / totalCount,
            )
          : 0;

      results.push({
        playerNickname: nick,
        totalScore,
        correctCount,
        totalCount,
        avgResponseMs,
      });
    }

    // Ordena por score (decrescente), depois por tempo médio (crescente)
    results.sort(
      (a, b) =>
        b.totalScore - a.totalScore || a.avgResponseMs - b.avgResponseMs,
    );

    await db.insert(schema.gameResults).values(
      results.map((r, i) => ({
        sessionId,
        playerNickname: r.playerNickname,
        totalScore: r.totalScore,
        correctCount: r.correctCount,
        totalCount: r.totalCount,
        avgResponseMs: r.avgResponseMs,
        rank: i + 1,
      })),
    );

    return results;
  }

  const results1 = await computeResults(session1.id, nicknames1);
  for (const r of results1) {
    console.log(
      `   🥇 ${r.playerNickname}: ${r.totalScore} pts (${r.correctCount}/${r.totalCount} acertos)`,
    );
  }

  console.log("   ---");
  const results2 = await computeResults(session2.id, nicknames2);
  for (const r of results2) {
    console.log(
      `   🥇 ${r.playerNickname}: ${r.totalScore} pts (${r.correctCount}/${r.totalCount} acertos)`,
    );
  }

  // ── Resumo ──────────────────────────────────────────────────────

  console.log("\n══════════════════════════════════════════");
  console.log("🌱 Seed concluído com sucesso!");
  console.log("══════════════════════════════════════════");
  console.log("");
  console.log("📊 Resumo:");
  console.log(`   Usuários:        3`);
  console.log(`   Quizzes:         ${createdQuizzes.length}`);
  console.log(`   Questões:        ${allQuestions.length}`);
  console.log(`   Alternativas:    ${allAlternatives.length}`);
  console.log(`   Sessões:         2`);
  console.log(`   Respostas:       ${totalAnswers}`);
  console.log(`   Rankings:        ${nicknames1.length + nicknames2.length}`);
  console.log("");
  console.log("🔑 Senha para todos os usuários: 123456");
  console.log("   admin@quiz.com / clara@quiz.com / joao@quiz.com");
  console.log("");
  console.log("🎯 PINs de sessão ativas:");
  console.log(`   Conhecimentos Gerais → ${session1.pin}`);
  console.log(`   Cultura Pop         → ${session2.pin}`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed falhou:", err);
    process.exit(1);
  });
