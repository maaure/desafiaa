// WebSocket event payload types derived from backend gateways:
// - src/modules/session/session.gateway.ts (host)
// - src/modules/gameplay/gameplay.gateway.ts (player)

// ── Error ──

export interface ErrorPayload {
  code?: string;
  message: string;
}

// ── Player events ──

export interface PlayerJoinPayload {
  nickname: string;
}

export interface PlayerJoinedPayload {
  sessionId: string;
  totalPlayers: number;
}

export interface PlayerLobbyUpdatePayload {
  playerCount: number;
  nicknames: string[];
}

export interface PlayerAnswerPayload {
  questionIndex: number;
  answer: string;
}

export interface PlayerAnswerAckPayload {
  isCorrect: boolean;
  pointsEarned: number;
  totalScore: number;
}

// ── Host events ──

export interface HostSessionCreatePayload {
  quizId: string;
}

export interface HostSessionStartPayload {
  timeLimitSeconds: number;
}

export interface HostQuestionActivePayload {
  questionIndex: number;
  total: number;
}

export interface HostAnswersProgressPayload {
  answered: number;
  total: number;
}

// ── Game (broadcast) events ──

export interface SessionCreatedPayload {
  pin: string;
  sessionId: string;
}

export interface SessionStartedPayload {
  pin: string;
  timeLimitSeconds: number;
}

export interface GameQuestionShowPayload {
  questionIndex: number;
  text: string;
  timeLimit: number;
  alternatives: {
    id: string;
    text: string;
    sortOrder: number;
  }[];
}

export interface GameQuestionTimeoutPayload {
  correctAnswer: string;
}

export interface GameLeaderboardShowPayload {
  rankings: {
    nickname: string;
    score: number;
    rank: number;
    correctCount: number;
  }[];
}

export interface GameEndedPayload {
  finalRankings: {
    nickname: string;
    score: number;
    rank: number;
    correctCount: number;
  }[];
  totalPlayers: number;
}

export interface HostSessionEndedPayload {
  sessionId: string;
  playerCount: number;
}

export interface HostSessionRejoinedPayload {
  sessionId: string;
  pin: string;
  quizId: string;
  status: "lobby" | "playing" | "leaderboard" | "drumroll";
  timeLimitSeconds: number;
  presentationMode: boolean;
  playerCount: number;
  nicknames: string[];
  currentQuestionIndex: number;
  totalQuestions: number;
  questionsExhausted: boolean;
  lobbyStarted: boolean;
  questionText: string | null;
  questionImageUrl: string | null;
  alternatives: {
    id: string;
    text: string;
    imageUrl: string | null;
    sortOrder: number;
  }[];
  progress: { answered: number; total: number };
  rankings: {
    nickname: string;
    score: number;
    rank: number;
    correctCount: number;
  }[];
  countdown: number;
}

// ── Event name map for typed listeners ──

export interface ServerToClientEvents {
  /** Connection-level errors (invalid PIN, nickname, etc.) */
  error: (payload: ErrorPayload) => void;

  /** Player joined the session successfully */
  "player:joined": (payload: PlayerJoinedPayload) => void;

  /** Lobby player list updated */
  "player:lobby:update": (payload: PlayerLobbyUpdatePayload) => void;

  /** Answer acknowledged with score result */
  "player:answer:ack": (payload: PlayerAnswerAckPayload) => void;

  /** Session created by host */
  "session:created": (payload: SessionCreatedPayload) => void;

  /** Session started by host */
  "session:started": (payload: SessionStartedPayload) => void;

  /** New question displayed */
  "game:question:show": (payload: GameQuestionShowPayload) => void;

  /** Question time limit reached */
  "game:question:timeout": (payload: GameQuestionTimeoutPayload) => void;

  /** Drumroll before final leaderboard */
  "game:drumroll": () => void;

  /** Host aborted the session — players are kicked to the aborted screen */
  "game:aborted": () => void;

  /** Leaderboard snapshot broadcast */
  "game:leaderboard:show": (payload: GameLeaderboardShowPayload) => void;

  /** Game ended with final rankings */
  "game:ended": (payload: GameEndedPayload) => void;

  /** Host-only: question is now active with count */
  "host:question:active": (payload: HostQuestionActivePayload) => void;

  /** Host-only: answer progress update */
  "host:answers:progress": (payload: HostAnswersProgressPayload) => void;

  /** Host-only: leaderboard shown between questions */
  "host:leaderboard:show": (payload: GameLeaderboardShowPayload) => void;

  /** Host-only: last question closed, drumroll before final placar */
  "host:drumroll": () => void;

  /** Host-only: all questions answered, final leaderboard */
  "host:questions:exhausted": (payload: GameLeaderboardShowPayload) => void;

  /** Host-only: session finished, final screen */
  "host:session:ended": (payload: HostSessionEndedPayload) => void;

  /** Host-only: rejoin restored full session state */
  "host:session:rejoined": (payload: HostSessionRejoinedPayload) => void;

  /** Host-only: abort confirmed — caches can sync */
  "host:session:aborted": (payload: { sessionId: string }) => void;
}

export interface ClientToServerEvents {
  /** Player joins session */
  "player:join": (payload: PlayerJoinPayload) => void;

  /** Player submits answer */
  "player:answer": (payload: PlayerAnswerPayload) => void;

  /** Host creates a new session */
  "host:session:create": (payload: HostSessionCreatePayload) => void;

  /** Host rejoins an active session */
  "host:session:rejoin": (payload: { sessionId: string }) => void;

  /** Host aborts an active session (players kicked) */
  "host:session:abort": (payload: { sessionId: string }) => void;

  /** Host starts the session */
  "host:session:start": (payload: HostSessionStartPayload) => void;

  /** Host advances the game: Pergunta → Placar → Pergunta → Tambores → Placar Final */
  "host:question:next": () => void;

  /** Host ends the session */
  "host:session:end": () => void;
}
