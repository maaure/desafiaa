import { Namespace } from "socket.io";
import { redis } from "../../redis/client";
import { keys } from "../../redis/keys";
import { scoringService } from "./scoring.service";
import { db, schema } from "../../db";
import { eq } from "drizzle-orm";

export function registerPlayGateway(io: Namespace) {
  // Validação de PIN no handshake
  io.use(async (socket, next) => {
    const pin = socket.handshake.query.pin as string;
    if (!pin || pin.length !== 6) {
      return next(new Error("PIN inválido"));
    }
    const status = await redis.get(keys.sessionStatus(pin));
    if (!status || status === "finished") {
      return next(new Error("Sessão inválida ou encerrada"));
    }
    if (status === "playing") {
      return next(new Error("A partida já está em andamento"));
    }
    socket.data.pin = pin;
    next();
  });

  io.on("connection", (socket) => {
    const pin: string = socket.data.pin;
    socket.data.nickname = null;

    socket.on("player:join", async ({ nickname }: { nickname: string }) => {
      try {
        const normalizedNick = nickname.trim().toLowerCase();
        if (!normalizedNick || normalizedNick.length < 2 || normalizedNick.length > 20) {
          socket.emit("error", { message: "Apelido deve ter entre 2 e 20 caracteres" });
          return;
        }

        // Atomic uniqueness check via SADD (Issue 2: TOCTOU fix)
        const added = await redis.sadd(keys.sessionNicknames(pin), normalizedNick);

        if (added === 0) {
          // Nickname already in use — check if from a disconnected player (Issue 1: reconnection)
          const oldSocketId = await redis.hget(keys.disconnectedPlayers(pin), normalizedNick);
          if (!oldSocketId) {
            socket.emit("error", { message: "Apelido já está em uso nesta partida" });
            return;
          }

          // Reconnection: migrate data from old socket ID to the new one
          const oldPlayerData = await redis.hgetall(keys.sessionPlayer(pin, oldSocketId));

          // 1. Migrate player hash (includes total_score, correct_count, nickname)
          await redis.hset(keys.sessionPlayer(pin, socket.id), oldPlayerData);

          // 2. Migrate score in sorted set
          const oldScore = await redis.zscore(keys.sessionScores(pin), oldSocketId);
          if (oldScore !== null) {
            await redis.zadd(keys.sessionScores(pin), parseInt(oldScore, 10), socket.id);
          }
          await redis.zrem(keys.sessionScores(pin), oldSocketId);

          // 3. Swap socket IDs in sessionPlayers set
          await redis.srem(keys.sessionPlayers(pin), oldSocketId);
          await redis.sadd(keys.sessionPlayers(pin), socket.id);

          // 4. Remove from disconnected mapping
          await redis.hdel(keys.disconnectedPlayers(pin), normalizedNick);
        }

        socket.data.nickname = normalizedNick;

        // Only initialize player hash for first-time join (reconnection already migrated)
        if (added === 1) {
          await redis.hset(keys.sessionPlayer(pin, socket.id), {
            nickname: normalizedNick,
            total_score: "0",
            correct_count: "0",
          });
          await redis.zadd(keys.sessionScores(pin), 0, socket.id);
          await redis.sadd(keys.sessionPlayers(pin), socket.id);
        }

        socket.join(`session:${pin}`);
        socket.emit("player:joined", {
          sessionId: await redis.get(keys.pinLookup(pin)),
          totalPlayers: await redis.scard(keys.sessionPlayers(pin)),
        });

        // Notifica lobby
        const members = await redis.smembers(keys.sessionPlayers(pin));
        const nicknames: string[] = [];
        for (const sid of members) {
          const p = await redis.hgetall(keys.sessionPlayer(pin, sid));
          nicknames.push(p.nickname ?? "?");
        }
        io.server.of('/host').to(`session:${pin}`).emit("player:lobby:update", {
          playerCount: members.length,
          nicknames,
        });
      } catch (err) {
        socket.emit("error", { message: "Erro interno" });
      }
    });

    socket.on("player:answer", async ({ questionIndex, answer }: {
      questionIndex: number; answer: string;
    }) => {
      try {
        if (!socket.data.nickname) {
          socket.emit("error", { message: "Entre na partida primeiro" });
          return;
        }

        // Verifica se a partida está em andamento (Issue 4)
        const status = await redis.get(keys.sessionStatus(pin));
        if (status !== "playing") {
          socket.emit("error", { message: "A partida não está em andamento" });
          return;
        }

        // Gate: uma resposta por pergunta
        const alreadyAnswered = await redis.hexists(
          keys.questionAnswers(pin, questionIndex), socket.data.nickname,
        );
        if (alreadyAnswered) {
          socket.emit("error", { code: "ALREADY_ANSWERED" });
          return;
        }

        // Busca a pergunta correta
        const config = await redis.hgetall(keys.sessionConfig(pin));
        const quizId = config.quiz_id;
        const question = await db.query.questions.findFirst({
          where: eq(schema.questions.quizId, quizId),
          with: { alternatives: true },
          orderBy: (q, { asc }) => [asc(q.sortOrder)],
          offset: questionIndex - 1,
        });

        if (!question) {
          socket.emit("error", { message: "Pergunta não encontrada" });
          return;
        }

        const selectedAlt = question.alternatives.find((a) => a.text === answer || a.id === answer);
        const isCorrect = selectedAlt?.isCorrect ?? false;

        // Calcula tempo de resposta
        const revealedTs = await redis.get(keys.questionRevealed(pin, questionIndex));
        const responseMs = revealedTs ? Date.now() - parseInt(revealedTs, 10) : 0;

        const timeLimit = parseInt(config.time_limit_seconds ?? "30", 10);
        const points = scoringService.calculate({
          basePoints: question.basePoints,
          responseMs,
          timeLimitSeconds: timeLimit,
          isCorrect,
        });

        // Atualiza Redis
        await redis.hset(keys.questionAnswers(pin, questionIndex), socket.data.nickname, JSON.stringify({
          answer, responseMs, points,
        }));
        await redis.zincrby(keys.sessionScores(pin), points, socket.id);
        const totalScore = await redis.zscore(keys.sessionScores(pin), socket.id);
        await redis.hset(keys.sessionPlayer(pin, socket.id), "total_score", String(totalScore ?? 0));
        if (isCorrect) {
          await redis.hincrby(keys.sessionPlayer(pin, socket.id), "correct_count", 1);
        }

        socket.emit("player:answer:ack", {
          isCorrect,
          pointsEarned: points,
          totalScore: parseInt(totalScore ?? "0", 10),
        });

        // Notifica Host sobre progresso
        const totalAnswered = await redis.hlen(keys.questionAnswers(pin, questionIndex));
        const totalPlayers = await redis.scard(keys.sessionPlayers(pin));
        socket.server.of('/host').to(`session:${pin}`).emit("host:answers:progress", {
          answered: totalAnswered,
          total: totalPlayers,
        });
      } catch (err) {
        socket.emit("error", { message: "Erro interno" });
      }
    });

    // Reconexão
    socket.on("disconnect", async () => {
      try {
        const nickname = socket.data.nickname;
        if (nickname) {
          // Store mapping for reconnection (Issue 1)
          await redis.hset(keys.disconnectedPlayers(pin), nickname, socket.id);
        }
      } catch (err) {
        // Can't emit on disconnect — log only
        console.error("Erro no disconnect handler:", err);
      }
    });
  });
}
