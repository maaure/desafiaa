import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "../../db";
import { redis } from "../../redis/client";
import { keys } from "../../redis/keys";
import { NotFoundError } from "../../shared/errors";

function generatePin(): string {
  return String(randomInt(100000, 999999));
}

async function ensureUniquePin(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const pin = generatePin();
    const exists = await redis.exists(keys.pinLookup(pin));
    if (!exists) return pin;
  }
  throw new Error("Could not generate unique PIN after 10 attempts");
}

export const sessionService = {
  async create(quizId: string, hostId: string) {
    // Valida que o quiz existe e pertence ao host
    const quiz = await db.query.quizzes.findFirst({
      where: eq(schema.quizzes.id, quizId),
    });
    if (!quiz) throw new NotFoundError("Quiz");
    if (quiz.authorId !== hostId) throw new NotFoundError("Quiz");
    if (!quiz.isPublished) throw new NotFoundError("Quiz não publicado");

    const pin = await ensureUniquePin();

    // Persiste no PostgreSQL
    const [session] = await db
      .insert(schema.gameSessions)
      .values({
        quizId,
        hostId,
        pin,
        status: "lobby",
        timeLimitSeconds: 30,
      })
      .returning();

    // Configura Redis
    await redis.set(keys.pinLookup(pin), session.id, "EX", 24 * 3600);
    await redis.set(keys.sessionStatus(pin), "lobby");
    await redis.hset(keys.sessionConfig(pin), {
      quiz_id: quizId,
      time_limit_seconds: "30",
      current_question_index: "0",
    });

    return {
      id: session.id,
      pin,
      quizTitle: quiz.title,
      status: "lobby" as const,
      timeLimitSeconds: 30,
    };
  },

  async getById(sessionId: string, hostId: string) {
    const session = await db.query.gameSessions.findFirst({
      where: eq(schema.gameSessions.id, sessionId),
      with: { quiz: true },
    });
    if (!session || session.hostId !== hostId) throw new NotFoundError("Sessão");
    return session;
  },

  async verifyPin(pin: string) {
    const sessionId = await redis.get(keys.pinLookup(pin));
    if (!sessionId) throw new NotFoundError("Sessão");

    const status = await redis.get(keys.sessionStatus(pin));
    if (!status || status === "finished") throw new NotFoundError("Sessão");

    const session = await db.query.gameSessions.findFirst({
      where: eq(schema.gameSessions.id, sessionId),
      with: { quiz: true },
    });
    if (!session) throw new NotFoundError("Sessão");

    return {
      sessionId: session.id,
      pin,
      quizTitle: session.quiz.title,
      status: status as "lobby" | "playing",
    };
  },

  async getResults(sessionId: string, hostId: string) {
    const session = await db.query.gameSessions.findFirst({
      where: eq(schema.gameSessions.id, sessionId),
    });
    if (!session || session.hostId !== hostId) throw new NotFoundError("Sessão");

    // Busca do Postgres (resultados já persistidos)
    const results = await db.query.gameResults.findMany({
      where: eq(schema.gameResults.sessionId, sessionId),
      orderBy: (r, { asc }) => [asc(r.rank)],
    });

    return results;
  },
};
