// Derived from backend src/db/schema.ts, src/modules/session/session.schema.ts,
// and src/modules/gameplay/leaderboard.service.ts

export type SessionStatus = "lobby" | "playing" | "finished";

export interface GameSession {
  id: string;
  pin: string;
  quizTitle: string;
  status: SessionStatus;
  timeLimitSeconds: number;
}

export interface PlayerState {
  nickname: string;
  totalScore: number;
  correctCount: number;
}

export interface LeaderboardEntry {
  nickname: string;
  score: number;
  rank: number;
  correctCount: number;
}

export interface PinInfo {
  id: string;
  quizTitle: string;
  status: SessionStatus;
  playerCount: number;
  maxPlayers: number;
}
