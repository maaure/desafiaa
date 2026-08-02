import { Namespace } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { redis } from "../../redis/client";
import { keys } from "../../redis/keys";
import { db, schema } from "../../db";
import { and, eq, asc } from "drizzle-orm";
import { leaderboardService } from "../gameplay/leaderboard.service";

/** Limpa o estado de runtime da sessão no Redis (fim normal ou aborto) */
async function clearSessionRedis(pin: string) {
  const playerSockets = await redis.smembers(keys.sessionPlayers(pin));
  const pipeline = redis.pipeline();
  pipeline.del(keys.sessionStatus(pin));
  pipeline.del(keys.sessionConfig(pin));
  pipeline.del(keys.sessionScores(pin));
  pipeline.del(keys.sessionPlayers(pin));
  for (const sid of playerSockets) {
    pipeline.del(keys.sessionPlayer(pin, sid));
  }
  await pipeline.exec();
}

export function registerHostGateway(io: Namespace) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token as string;
      const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error("Autenticação inválida"));
    }
  });

  io.on("connection", (socket) => {
    let currentPin: string | null = null;
    let questionTimeout: ReturnType<typeof setTimeout> | null = null;

    socket.on("host:session:create", async ({ quizId }: { quizId: string }) => {
      const quiz = await db.query.quizzes.findFirst({
        where: and(eq(schema.quizzes.id, quizId), eq(schema.quizzes.authorId, socket.data.userId)),
      });
      if (!quiz) {
        socket.emit("error", { message: "Quiz não encontrado" });
        return;
      }

      try {
        const { sessionService } = await import("../session/session.service.js");
        const session = await sessionService.create(quizId, socket.data.userId);
        currentPin = session.pin;
        socket.join(`session:${session.pin}`);
        socket.emit("session:created", {
          pin: session.pin,
          sessionId: session.id,
        });
      } catch (e: any) {
        socket.emit("error", { message: e.message ?? "Erro ao criar sessão" });
      }
    });

    // Reconexão do host em sessão ativa (após recarregar a página ou pela lista de sessões)
    socket.on("host:session:rejoin", async ({ sessionId }: { sessionId: string }) => {
      if (!sessionId) return;
      const session = await db.query.gameSessions.findFirst({
        where: and(
          eq(schema.gameSessions.id, sessionId),
          eq(schema.gameSessions.hostId, socket.data.userId),
        ),
        with: { quiz: true },
      });
      if (!session) {
        socket.emit("error", { message: "Sessão não encontrada" });
        return;
      }

      const pin = session.pin;
      const status = await redis.get(keys.sessionStatus(pin));
      if (!status || status === "finished") {
        socket.emit("error", { message: "Sessão encerrada ou expirada" });
        return;
      }

      currentPin = pin;
      socket.join(`session:${pin}`);
      const config = await redis.hgetall(keys.sessionConfig(pin));
      const quizId = config.quiz_id ?? session.quizId;
      const currentIndex = parseInt(config.current_question_index ?? "0", 10);
      const timeLimitSeconds = parseInt(config.time_limit_seconds ?? "30", 10);
      const presentationMode = config.presentation_mode === "1";
      const total = await db.$count(schema.questions, eq(schema.questions.quizId, quizId));

      const members = await redis.smembers(keys.sessionPlayers(pin));
      const nicknames: string[] = [];
      for (const sid of members) {
        const p = await redis.hgetall(keys.sessionPlayer(pin, sid));
        nicknames.push(p.nickname ?? "?");
      }

      const payload: Record<string, unknown> = {
        sessionId: session.id,
        pin,
        quizId,
        status,
        timeLimitSeconds,
        presentationMode,
        playerCount: members.length,
        nicknames,
        currentQuestionIndex: currentIndex,
        totalQuestions: total,
        questionsExhausted: status === "leaderboard" && currentIndex >= total,
        lobbyStarted: config.started === "1",
      };

      if (status === "playing") {
        // Restaura pergunta ativa, progresso e countdown
        const question = await db.query.questions.findFirst({
          where: eq(schema.questions.quizId, quizId),
          orderBy: [asc(schema.questions.sortOrder)],
          offset: currentIndex - 1,
          with: { alternatives: { orderBy: asc(schema.alternatives.sortOrder) } },
        });
        if (question) {
          payload.questionText = question.text;
          payload.questionImageUrl = question.imageUrl ?? null;
          payload.alternatives = question.alternatives.map((a) => ({
            id: a.id,
            text: a.text,
            imageUrl: a.imageUrl ?? null,
            sortOrder: a.sortOrder,
          }));
        }
        const answered = await redis.hlen(keys.questionAnswers(pin, currentIndex));
        payload.progress = { answered, total: members.length };

        const revealedTs = await redis.get(keys.questionRevealed(pin, currentIndex));
        const remainingMs = revealedTs
          ? Math.max(0, parseInt(revealedTs, 10) + timeLimitSeconds * 1000 - Date.now())
          : timeLimitSeconds * 1000;
        payload.countdown = Math.ceil(remainingMs / 1000);

        // O timer de timeout morreu com o socket antigo — re-arma o que falta
        if (questionTimeout) clearTimeout(questionTimeout);
        questionTimeout = setTimeout(async () => {
          const st = await redis.get(keys.sessionStatus(pin));
          if (st !== "playing") return;
          const correctAlt = question?.alternatives.find((a) => a.isCorrect);
          io.server
            .of("/play")
            .to(`session:${pin}`)
            .emit("game:question:timeout", {
              correctAnswer: presentationMode ? "" : (correctAlt?.text ?? "?"),
            });
        }, remainingMs);
      } else if (status === "leaderboard" || status === "drumroll") {
        payload.rankings = await leaderboardService.getTop(pin);
      }

      socket.emit("host:session:rejoined", payload);
    });

    socket.on("host:session:start", async ({ timeLimitSeconds }: { timeLimitSeconds: number }) => {
      if (!currentPin) return;
      const limit = Math.min(300, Math.max(5, timeLimitSeconds ?? 30));
      await redis.hset(
        keys.sessionConfig(currentPin),
        "time_limit_seconds",
        String(limit),
        "started",
        "1",
      );

      // Atualiza PG (only timeLimitSeconds; status is already "lobby")
      const sessionId = await redis.get(keys.pinLookup(currentPin));
      if (sessionId) {
        await db
          .update(schema.gameSessions)
          .set({ timeLimitSeconds: limit })
          .where(eq(schema.gameSessions.id, sessionId));
      }
      socket.emit("session:started", {
        pin: currentPin,
        timeLimitSeconds: limit,
      });
    });

    socket.on("host:session:presentation-mode", async ({ enabled }: { enabled: boolean }) => {
      if (!currentPin) return;
      await redis.hset(keys.sessionConfig(currentPin), "presentation_mode", enabled ? "1" : "0");
    });

    // Botão único "Avançar": Pergunta → Placar Parcial → Pergunta → ... → Última Pergunta
    // → "Rufem os tambores" → Placar Final. Decide o próximo estado pela fase atual.
    socket.on("host:question:next", async () => {
      if (!currentPin) return;
      const config = await redis.hgetall(keys.sessionConfig(currentPin));
      const quizId = config.quiz_id;
      const presentationMode = config.presentation_mode === "1";
      const status = await redis.get(keys.sessionStatus(currentPin));
      const currentIndex = parseInt(config.current_question_index ?? "0", 10);
      const total = await db.$count(schema.questions, eq(schema.questions.quizId, quizId));

      // Pergunta ativa → fecha e mostra placar (parcial, ou tambores se era a última)
      if (status === "playing") {
        if (questionTimeout) {
          clearTimeout(questionTimeout);
          questionTimeout = null;
        }
        const rankings = await leaderboardService.getTop(currentPin);
        if (currentIndex >= total) {
          await redis.set(keys.sessionStatus(currentPin), "drumroll");
          io.server.of("/play").to(`session:${currentPin}`).emit("game:drumroll");
          socket.emit("host:drumroll");
        } else {
          await redis.set(keys.sessionStatus(currentPin), "leaderboard");
          io.server.of("/play").to(`session:${currentPin}`).emit("game:leaderboard:show", {
            rankings,
          });
          socket.emit("host:leaderboard:show", { rankings });
        }
        return;
      }

      // Tambores → placar final
      if (status === "drumroll") {
        await redis.set(keys.sessionStatus(currentPin), "leaderboard");
        const rankings = await leaderboardService.getTop(currentPin);
        io.server.of("/play").to(`session:${currentPin}`).emit("game:leaderboard:show", {
          rankings,
        });
        socket.emit("host:questions:exhausted", { rankings });
        return;
      }

      // Lobby ou placar parcial → próxima pergunta
      const nextIndex = currentIndex + 1;

      // Busca a pergunta por offset (ordem estável durante a sessão)
      const question = await db.query.questions.findFirst({
        where: eq(schema.questions.quizId, quizId),
        orderBy: [asc(schema.questions.sortOrder)],
        offset: nextIndex - 1,
        with: { alternatives: { orderBy: asc(schema.alternatives.sortOrder) } },
      });

      if (!question) {
        // Todas as perguntas respondidas — gera ranking final e notifica host
        const rankings = await leaderboardService.getTop(currentPin);
        socket.emit("host:questions:exhausted", { rankings });
        return;
      }

      // Atualiza estado no Redis
      await redis.hset(keys.sessionConfig(currentPin), "current_question_index", String(nextIndex));
      await redis.set(
        keys.questionRevealed(currentPin, nextIndex),
        Date.now().toString(),
        "EX",
        300,
      );
      await redis.set(keys.sessionStatus(currentPin), "playing");

      // Atualiza PG com status e startedAt (reflete o momento em que a partida realmente inicia)
      const sessionId = await redis.get(keys.pinLookup(currentPin));
      if (sessionId) {
        await db
          .update(schema.gameSessions)
          .set({ status: "playing", startedAt: new Date() })
          .where(eq(schema.gameSessions.id, sessionId));
      }

      // Broadcast para jogadores
      // Em modo apresentação, omite o texto da pergunta — jogadores veem só alternativas
      io.server
        .of("/play")
        .to(`session:${currentPin}`)
        .emit("game:question:show", {
          questionIndex: nextIndex,
          text: presentationMode ? "" : question.text,
          imageUrl: question.imageUrl ?? null,
          timeLimit: parseInt(config.time_limit_seconds ?? "30", 10),
          alternatives: question.alternatives.map((a) => ({
            id: a.id,
            text: a.text,
            imageUrl: a.imageUrl ?? null,
            sortOrder: a.sortOrder,
          })),
        });

      // Host sempre recebe o texto completo (para projeção / tela grande)
      socket.emit("host:question:active", {
        questionIndex: nextIndex,
        total: await db.$count(schema.questions, eq(schema.questions.quizId, quizId)),
        questionText: question.text,
        questionImageUrl: question.imageUrl ?? null,
        alternatives: question.alternatives.map((a) => ({
          id: a.id,
          text: a.text,
          imageUrl: a.imageUrl ?? null,
          sortOrder: a.sortOrder,
        })),
      });

      // Timer de timeout automático (cancela o anterior se existir)
      if (questionTimeout) clearTimeout(questionTimeout);
      const timeLimitMs = parseInt(config.time_limit_seconds ?? "30", 10) * 1000;
      questionTimeout = setTimeout(async () => {
        const status = await redis.get(keys.sessionStatus(currentPin!));
        if (status !== "playing") return;

        const correctAlt = question.alternatives.find((a) => a.isCorrect);
        io.server
          .of("/play")
          .to(`session:${currentPin}`)
          .emit("game:question:timeout", {
            correctAnswer: presentationMode ? "" : (correctAlt?.text ?? "?"),
          });
      }, timeLimitMs);
    });

    socket.on("host:session:end", async () => {
      if (!currentPin) return;
      if (questionTimeout) {
        clearTimeout(questionTimeout);
        questionTimeout = null;
      }
      await redis.set(keys.sessionStatus(currentPin), "finished");

      const sessionId = await redis.get(keys.pinLookup(currentPin));
      if (!sessionId) return;

      // Coleta todas as respostas do Redis antes de limpar
      const config = await redis.hgetall(keys.sessionConfig(currentPin!));
      const totalQuestions = parseInt(config.current_question_index ?? "0", 10);
      const allAnswers = new Map<string, Record<string, string>>();
      for (let qi = 1; qi <= totalQuestions; qi++) {
        const answers = await redis.hgetall(keys.questionAnswers(currentPin!, qi));
        if (Object.keys(answers).length > 0) {
          allAnswers.set(String(qi), answers);
        }
      }

      const rankings = await leaderboardService.getFullRankings(currentPin);

      const quizId = config.quiz_id;

      // Persiste respostas individuais no PostgreSQL
      for (const [qIdx, answerMap] of allAnswers) {
        for (const [nickname, data] of Object.entries(answerMap as Record<string, string>)) {
          const parsed = JSON.parse(data);
          const question = await db.query.questions.findFirst({
            where: eq(schema.questions.quizId, quizId),
            orderBy: asc(schema.questions.sortOrder),
            offset: parseInt(qIdx) - 1,
          });
          if (!question) continue;
          const alt = await db.query.alternatives.findFirst({
            where: and(
              eq(schema.alternatives.questionId, question.id),
              eq(schema.alternatives.isCorrect, true),
            ),
          });
          await db.insert(schema.playerAnswers).values({
            sessionId,
            questionId: question.id,
            playerNickname: nickname,
            selectedAnswer: parsed.answer,
            isCorrect: alt ? parsed.answer === alt.text || parsed.answer === alt.id : false,
            responseMs: parsed.responseMs ?? 0,
            pointsEarned: parsed.points ?? 0,
          });
        }
      }

      // Persiste ranking final
      for (const entry of rankings) {
        // Calcula métricas do jogador a partir das respostas persistidas
        const playerAnswersList = await db.query.playerAnswers.findMany({
          where: and(
            eq(schema.playerAnswers.sessionId, sessionId),
            eq(schema.playerAnswers.playerNickname, entry.nickname),
          ),
        });
        const totalCount = playerAnswersList.length;
        const correctCount = playerAnswersList.filter((a) => a.isCorrect).length;
        const avgMs =
          totalCount > 0
            ? Math.round(playerAnswersList.reduce((s, a) => s + a.responseMs, 0) / totalCount)
            : 0;

        await db.insert(schema.gameResults).values({
          sessionId,
          playerNickname: entry.nickname,
          totalScore: entry.score,
          correctCount,
          totalCount,
          avgResponseMs: avgMs,
          rank: entry.rank,
        });
      }

      await db
        .update(schema.gameSessions)
        .set({
          status: "finished",
          finishedAt: new Date(),
          playerCount: rankings.length,
        })
        .where(eq(schema.gameSessions.id, sessionId));

      io.server.of("/play").to(`session:${currentPin}`).emit("game:ended", {
        finalRankings: rankings,
        totalPlayers: rankings.length,
      });

      // Host também precisa sair da tela de placar final
      socket.emit("host:session:ended", {
        sessionId,
        playerCount: rankings.length,
      });

      // Limpa Redis
      await clearSessionRedis(currentPin);
    });

    // Aborto: encerra a sessão sem persistir resultados — jogadores veem "O Host encerrou a sessão"
    socket.on("host:session:abort", async ({ sessionId }: { sessionId: string }) => {
      if (!sessionId) return;
      const session = await db.query.gameSessions.findFirst({
        where: and(
          eq(schema.gameSessions.id, sessionId),
          eq(schema.gameSessions.hostId, socket.data.userId),
        ),
      });
      if (!session) {
        socket.emit("error", { message: "Sessão não encontrada" });
        return;
      }

      const pin = session.pin;
      const status = await redis.get(keys.sessionStatus(pin));
      if (!status || status === "finished") {
        socket.emit("error", { message: "Sessão já encerrada" });
        return;
      }

      if (currentPin === pin && questionTimeout) {
        clearTimeout(questionTimeout);
        questionTimeout = null;
      }

      const playerCount = await redis.scard(keys.sessionPlayers(pin));
      await redis.set(keys.sessionStatus(pin), "finished");
      await db
        .update(schema.gameSessions)
        .set({ status: "finished", finishedAt: new Date(), playerCount })
        .where(eq(schema.gameSessions.id, session.id));

      // Jogadores conectados são derrubados e vão para a tela de encerramento
      io.server.of("/play").to(`session:${pin}`).emit("game:aborted");

      if (currentPin === pin) {
        socket.emit("host:session:ended", { sessionId: session.id, playerCount });
      }

      await clearSessionRedis(pin);

      // Ack para o cliente sincronizar o cache (lista de sessões ativas)
      socket.emit("host:session:aborted", { sessionId: session.id });
    });

    socket.on("disconnect", () => {
      if (questionTimeout) {
        clearTimeout(questionTimeout);
        questionTimeout = null;
      }
      // Host saiu — a sessão continua ativa para Players
    });
  });
}
