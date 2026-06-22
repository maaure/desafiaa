import { Namespace } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { redis } from "../../redis/client";
import { keys } from "../../redis/keys";
import { db, schema } from "../../db";
import { and, eq, asc, desc } from "drizzle-orm";
import { leaderboardService } from "../gameplay/leaderboard.service";

export function registerHostGateway(io: Namespace) {
  // Autenticação obrigatória no handshake
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

    socket.on("host:session:create", async ({ quizId }: { quizId: string }) => {
      // Valida que o quiz pertence ao host
      const quiz = await db.query.quizzes.findFirst({
        where: and(eq(schema.quizzes.id, quizId), eq(schema.quizzes.authorId, socket.data.userId)),
      });
      if (!quiz) {
        socket.emit("error", { message: "Quiz não encontrado" });
        return;
      }

      // Reutiliza sessionService ou faz inline (KISS: inline é mais simples aqui)
      try {
        const { sessionService } = await import("../session/session.service.js");
        const session = await sessionService.create(quizId, socket.data.userId);
        currentPin = session.pin;
        socket.join(`session:${session.pin}`);
        socket.emit("session:created", { pin: session.pin, sessionId: session.id });
      } catch (e: any) {
        socket.emit("error", { message: e.message ?? "Erro ao criar sessão" });
      }
    });

    socket.on("host:session:start", async ({ timeLimitSeconds }: { timeLimitSeconds: number }) => {
      if (!currentPin) return;
      const limit = Math.min(300, Math.max(5, timeLimitSeconds ?? 30));
      await redis.hset(keys.sessionConfig(currentPin), "time_limit_seconds", String(limit));

      // Atualiza PG (only timeLimitSeconds; status is already "lobby")
      const sessionId = await redis.get(keys.pinLookup(currentPin));
      if (sessionId) {
        await db
          .update(schema.gameSessions)
          .set({ timeLimitSeconds: limit })
          .where(eq(schema.gameSessions.id, sessionId));
      }
      socket.emit("session:started", { pin: currentPin, timeLimitSeconds: limit });
    });

    socket.on("host:question:next", async () => {
      if (!currentPin) return;
      const config = await redis.hgetall(keys.sessionConfig(currentPin));
      const nextIndex = parseInt(config.current_question_index ?? "0", 10) + 1;

      // Busca a pergunta por offset (ordem estável durante a sessão)
      const quizId = config.quiz_id;
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
      await redis.set(keys.questionRevealed(currentPin, nextIndex), Date.now().toString(), "EX", 300);
      await redis.set(keys.sessionStatus(currentPin), "playing");

      // Atualiza PG com status e startedAt (reflete o momento em que a partida realmente inicia)
      const sessionId = await redis.get(keys.pinLookup(currentPin));
      if (sessionId) {
        await db
          .update(schema.gameSessions)
          .set({ status: "playing", startedAt: new Date() })
          .where(eq(schema.gameSessions.id, sessionId));
      }

      // Broadcast para room (Host + Players)
      io.server.of('/play').to(`session:${currentPin}`).emit("game:question:show", {
        questionIndex: nextIndex,
        text: question.text,
        timeLimit: parseInt(config.time_limit_seconds ?? "30", 10),
        alternatives: question.alternatives.map((a) => ({
          id: a.id,
          text: a.text,
          sortOrder: a.sortOrder,
          // ⚠️ SEM isCorrect
        })),
      });

      socket.emit("host:question:active", {
        questionIndex: nextIndex,
        total: await db.$count(schema.questions, eq(schema.questions.quizId, quizId)),
      });

      // Timer de timeout automático
      const timeLimitMs = parseInt(config.time_limit_seconds ?? "30", 10) * 1000;
      setTimeout(async () => {
        const status = await redis.get(keys.sessionStatus(currentPin!));
        if (status !== "playing") return;

        const correctAlt = question.alternatives.find((a) => a.isCorrect);
        io.server.of('/play').to(`session:${currentPin}`).emit("game:question:timeout", {
          correctAnswer: correctAlt?.text ?? "?",
        });
      }, timeLimitMs);
    });

    socket.on("host:leaderboard:show", async () => {
      if (!currentPin) return;
      const rankings = await leaderboardService.getTop(currentPin);
      io.server.of('/play').to(`session:${currentPin}`).emit("game:leaderboard:show", { rankings });
    });

    socket.on("host:session:end", async () => {
      if (!currentPin) return;
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
        const avgMs = totalCount > 0
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
        .set({ status: "finished", finishedAt: new Date(), playerCount: rankings.length })
        .where(eq(schema.gameSessions.id, sessionId));

      io.server.of('/play').to(`session:${currentPin}`).emit("game:ended", {
        finalRankings: rankings,
        totalPlayers: rankings.length,
      });

      // Limpa Redis
      const playerSockets = await redis.smembers(keys.sessionPlayers(currentPin));
      const pipeline = redis.pipeline();
      pipeline.del(keys.sessionStatus(currentPin));
      pipeline.del(keys.sessionConfig(currentPin));
      pipeline.del(keys.sessionScores(currentPin));
      pipeline.del(keys.sessionPlayers(currentPin));
      for (const sid of playerSockets) {
        pipeline.del(keys.sessionPlayer(currentPin, sid));
      }
      await pipeline.exec();
    });

    socket.on("disconnect", () => {
      // Host saiu — a sessão continua ativa para Players
    });
  });
}
