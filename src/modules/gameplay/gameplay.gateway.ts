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
      const normalizedNick = nickname.trim().toLowerCase();
      if (!normalizedNick || normalizedNick.length < 2 || normalizedNick.length > 20) {
        socket.emit("error", { message: "Apelido deve ter entre 2 e 20 caracteres" });
        return;
      }

      // Verifica unicidade
      const existing = await redis.smembers(keys.sessionPlayers(pin));
      for (const sid of existing) {
        const player = await redis.hgetall(keys.sessionPlayer(pin, sid));
        if (player.nickname?.toLowerCase() === normalizedNick) {
          socket.emit("error", { message: "Apelido já está em uso nesta partida" });
          return;
        }
      }

      socket.data.nickname = normalizedNick;

      // Adiciona ao Redis
      await redis.sadd(keys.sessionPlayers(pin), socket.id);
      await redis.hset(keys.sessionPlayer(pin, socket.id), {
        nickname: normalizedNick,
        total_score: "0",
        correct_count: "0",
      });
      await redis.zadd(keys.sessionScores(pin), 0, socket.id);

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
      io.to(`session:${pin}`).emit("player:lobby:update", {
        playerCount: members.length,
        nicknames,
      });
    });

    socket.on("player:answer", async ({ questionIndex, answer }: {
      questionIndex: number; answer: string;
    }) => {
      if (!socket.data.nickname) {
        socket.emit("error", { message: "Entre na partida primeiro" });
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
      socket.to(`session:${pin}`).emit("host:answers:progress", {
        answered: totalAnswered,
        total: totalPlayers,
      });
    });

    // Reconexão
    socket.on("disconnect", () => {
      // Player saiu — não remove do Redis para permitir reconexão
      // O estado expira via TTL se o jogo acabar
    });
  });
}
