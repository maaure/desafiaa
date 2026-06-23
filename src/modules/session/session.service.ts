import { randomInt } from "node:crypto";
import { NotFoundError } from "../../shared/errors";
import { sessionRepo } from "./session.repository";
import type { SessionResponse, PinInfo, SessionResult } from "./session.types";

function generatePin(): string {
  return String(randomInt(100000, 999999));
}

async function ensureUniquePin(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const pin = generatePin();
    const exists = await sessionRepo.pinExists(pin);
    if (!exists) return pin;
  }
  throw new Error("Could not generate unique PIN after 10 attempts");
}

export const sessionService = {
  async create(quizId: string, hostId: string): Promise<SessionResponse> {
    const quiz = await sessionRepo.getQuizOwnedBy(quizId, hostId);
    if (!quiz) throw new NotFoundError("Quiz");
    if (quiz.authorId !== hostId) throw new NotFoundError("Quiz");
    if (!quiz.isPublished) throw new NotFoundError("Quiz não publicado");

    const pin = await ensureUniquePin();

    const session = await sessionRepo.insertSession({
      quizId,
      hostId,
      pin,
      status: "lobby",
      timeLimitSeconds: 30,
    });

    await sessionRepo.savePinMapping(pin, session.id);
    await sessionRepo.setSessionStatus(pin, "lobby");
    await sessionRepo.saveSessionConfig(pin, {
      quiz_id: quizId,
      time_limit_seconds: 30,
      current_question_index: 0,
    });

    return {
      id: session.id,
      pin,
      quizTitle: quiz.title,
      status: "lobby",
      timeLimitSeconds: 30,
    };
  },

  async getById(sessionId: string, hostId: string) {
    const session = await sessionRepo.getSessionWithQuiz(sessionId);
    if (!session || session.hostId !== hostId) throw new NotFoundError("Sessão");
    return session;
  },

  async verifyPin(pin: string): Promise<PinInfo> {
    const sessionId = await sessionRepo.getSessionIdByPin(pin);
    if (!sessionId) throw new NotFoundError("Sessão");

    const status = await sessionRepo.getSessionStatus(pin);
    if (!status || status === "finished") throw new NotFoundError("Sessão");

    const session = await sessionRepo.getSessionWithQuiz(sessionId);
    if (!session) throw new NotFoundError("Sessão");

    return {
      sessionId: session.id,
      pin,
      quizTitle: session.quiz.title,
      status: status as "lobby" | "playing",
    };
  },

  async getResults(sessionId: string, hostId: string): Promise<SessionResult[]> {
    const session = await sessionRepo.getSessionWithQuiz(sessionId);
    if (!session || session.hostId !== hostId) throw new NotFoundError("Sessão");

    return sessionRepo.getResultsBySession(sessionId);
  },
};
