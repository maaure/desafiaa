import { eq, asc } from "drizzle-orm";
import { db, schema } from "../../db";
import { redis } from "../../redis/client";
import { keys } from "../../redis/keys";

const PIN_TTL_SECONDS = 24 * 3600;

export const sessionRepo = {
  // ── PostgreSQL ────────────────────────────────────────────────

  async getQuizOwnedBy(quizId: string, hostId: string) {
    return db.query.quizzes.findFirst({
      where: eq(schema.quizzes.id, quizId),
    });
  },

  async insertSession(data: {
    quizId: string;
    hostId: string;
    pin: string;
    status: "lobby";
    timeLimitSeconds: number;
  }) {
    const [session] = await db.insert(schema.gameSessions).values(data).returning();
    return session;
  },

  async getSessionWithQuiz(sessionId: string) {
    return db.query.gameSessions.findFirst({
      where: eq(schema.gameSessions.id, sessionId),
      with: { quiz: true },
    });
  },

  async getResultsBySession(sessionId: string) {
    return db.query.gameResults.findMany({
      where: eq(schema.gameResults.sessionId, sessionId),
      orderBy: (r, { asc }) => [asc(r.rank)],
    });
  },

  // ── Redis ─────────────────────────────────────────────────────

  async pinExists(pin: string) {
    return redis.exists(keys.pinLookup(pin));
  },

  async savePinMapping(pin: string, sessionId: string) {
    await redis.set(keys.pinLookup(pin), sessionId, "EX", PIN_TTL_SECONDS);
  },

  async setSessionStatus(pin: string, status: string) {
    await redis.set(keys.sessionStatus(pin), status);
  },

  async getSessionStatus(pin: string) {
    return redis.get(keys.sessionStatus(pin));
  },

  async saveSessionConfig(pin: string, config: Record<string, string | number>) {
    await redis.hset(keys.sessionConfig(pin), config);
  },

  async getSessionIdByPin(pin: string) {
    return redis.get(keys.pinLookup(pin));
  },
};
