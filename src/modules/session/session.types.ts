// Tipos do módulo session — entidades, inputs e respostas

export type SessionStatus = "lobby" | "playing" | "finished";

export interface SessionEntity {
  id: string;
  quizId: string;
  hostId: string;
  pin: string;
  status: SessionStatus;
  timeLimitSeconds: number;
  playerCount: number;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
}

export interface SessionResponse {
  id: string;
  pin: string;
  quizTitle: string;
  status: SessionStatus;
  timeLimitSeconds: number;
}

export interface PinInfo {
  sessionId: string;
  pin: string;
  quizTitle: string;
  status: "lobby" | "playing";
}

export interface SessionResult {
  id: string;
  sessionId: string;
  playerNickname: string;
  totalScore: number;
  correctCount: number;
  totalCount: number;
  avgResponseMs: number;
  rank: number;
}
