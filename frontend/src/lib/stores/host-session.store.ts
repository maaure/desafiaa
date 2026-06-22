import { writable, derived } from "svelte/store";
import type { Socket } from "socket.io-client";
import { createHostSocket } from "$lib/game/socket-host";
import type { LeaderboardEntry } from "$lib/types/session";

export type HostPhase = "idle" | "lobby" | "playing" | "leaderboard" | "ended";

interface QuestionData {
  text: string;
  timeLimit: number;
  alternatives: { id: string; text: string; sortOrder: number }[];
}

interface HostSessionState {
  phase: HostPhase;
  pin: string | null;
  sessionId: string | null;
  quizId: string | null;
  playerCount: number;
  nicknames: string[];
  currentQuestion: { index: number; total: number } | null;
  currentQuestionData: QuestionData | null;
  timeLimitSeconds: number;
  progress: { answered: number; total: number };
  leaderboard: LeaderboardEntry[];
  error: string | null;
  isConnected: boolean;
  questionsExhausted: boolean;
}

function createHostSessionStore() {
  const state = writable<HostSessionState>({
    phase: "idle",
    pin: null,
    sessionId: null,
    quizId: null,
    playerCount: 0,
    nicknames: [],
    currentQuestion: null,
    currentQuestionData: null,
    timeLimitSeconds: 30,
    progress: { answered: 0, total: 0 },
    leaderboard: [],
    error: null,
    isConnected: false,
    questionsExhausted: false,
  });

  let socket: Socket | null = null;
  let pendingQuizId: string | null = null;

  function connect() {
    const token = localStorage.getItem("accessToken");
    if (!token || socket?.connected) return;

    socket = createHostSocket(token);

    socket.on("connect", () => {
      state.update((s) => ({ ...s, isConnected: true }));
      if (pendingQuizId) {
        socket?.emit("host:session:create", { quizId: pendingQuizId });
        pendingQuizId = null;
      }
    });

    socket.on("disconnect", () => {
      state.update((s) => ({ ...s, isConnected: false }));
    });

    socket.on("session:created", (payload: { pin: string; sessionId: string }) => {
      state.update((s) => ({
        ...s,
        phase: "lobby",
        pin: payload.pin,
        sessionId: payload.sessionId,
      }));
    });

    socket.on("session:started", (payload: { pin: string; timeLimitSeconds: number }) => {
      state.update((s) => ({
        ...s,
        timeLimitSeconds: payload.timeLimitSeconds,
      }));
    });

    socket.on("player:lobby:update", (payload: { playerCount: number; nicknames: string[] }) => {
      state.update((s) => ({
        ...s,
        playerCount: payload.playerCount,
        nicknames: payload.nicknames,
      }));
    });

    socket.on(
      "game:question:show",
      (payload: {
        questionIndex: number;
        text: string;
        timeLimit: number;
        alternatives: { id: string; text: string; sortOrder: number }[];
      }) => {
        state.update((s) => ({
          ...s,
          currentQuestionData: {
            text: payload.text,
            timeLimit: payload.timeLimit,
            alternatives: payload.alternatives,
          },
        }));
      },
    );

    socket.on(
      "host:question:active",
      (payload: { questionIndex: number; total: number }) => {
        state.update((s) => ({
          ...s,
          phase: "playing",
          currentQuestion: { index: payload.questionIndex, total: payload.total },
          progress: { answered: 0, total: 0 },
        }));
      },
    );

    socket.on(
      "host:answers:progress",
      (payload: { answered: number; total: number }) => {
        state.update((s) => ({
          ...s,
          progress: { answered: payload.answered, total: payload.total },
        }));
      },
    );

    socket.on(
      "host:questions:exhausted",
      (payload: { rankings: LeaderboardEntry[] }) => {
        state.update((s) => ({
          ...s,
          phase: "leaderboard",
          leaderboard: payload.rankings,
          questionsExhausted: true,
        }));
      },
    );

    socket.on(
      "game:leaderboard:show",
      (payload: { rankings: LeaderboardEntry[] }) => {
        state.update((s) => ({
          ...s,
          phase: "leaderboard",
          leaderboard: payload.rankings,
        }));
      },
    );

    socket.on(
      "game:ended",
      (payload: { finalRankings: LeaderboardEntry[]; totalPlayers: number }) => {
        state.update((s) => ({
          ...s,
          phase: "ended",
          leaderboard: payload.finalRankings,
          playerCount: payload.totalPlayers,
        }));
      },
    );

    socket.on("error", (payload: { message: string }) => {
      state.update((s) => ({ ...s, error: payload.message }));
    });
  }

  function disconnect() {
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }
  }

  function createSession(quizId: string) {
    // Persist quizId for page-refresh survival
    localStorage.setItem("currentQuizId", quizId);

    // Reset state before starting a new session
    state.update((s) => ({
      ...s,
      phase: "idle" as HostPhase,
      pin: null,
      sessionId: null,
      quizId,
      error: null,
      playerCount: 0,
      nicknames: [],
      currentQuestion: null,
      currentQuestionData: null,
      progress: { answered: 0, total: 0 },
      leaderboard: [],
      questionsExhausted: false,
    }));

    if (socket?.connected) {
      socket.emit("host:session:create", { quizId });
    } else {
      pendingQuizId = quizId;
    }
  }

  function startSession(timeLimitSeconds: number) {
    if (!socket?.connected) return;
    const clamped = Math.min(300, Math.max(5, timeLimitSeconds ?? 30));
    socket.emit("host:session:start", { timeLimitSeconds: clamped });
  }

  function nextQuestion() {
    socket?.emit("host:question:next");
  }

  function showLeaderboard() {
    socket?.emit("host:leaderboard:show");
  }

  function endSession() {
    socket?.emit("host:session:end");
  }

  function clearError() {
    state.update((s) => ({ ...s, error: null }));
  }

  return {
    subscribe: state.subscribe,
    phase: derived(state, ($s) => $s.phase),
    pin: derived(state, ($s) => $s.pin),
    sessionId: derived(state, ($s) => $s.sessionId),
    quizId: derived(state, ($s) => $s.quizId),
    playerCount: derived(state, ($s) => $s.playerCount),
    nicknames: derived(state, ($s) => $s.nicknames),
    currentQuestion: derived(state, ($s) => $s.currentQuestion),
    currentQuestionData: derived(state, ($s) => $s.currentQuestionData),
    timeLimitSeconds: derived(state, ($s) => $s.timeLimitSeconds),
    progress: derived(state, ($s) => $s.progress),
    leaderboard: derived(state, ($s) => $s.leaderboard),
    error: derived(state, ($s) => $s.error),
    isConnected: derived(state, ($s) => $s.isConnected),
    questionsExhausted: derived(state, ($s) => $s.questionsExhausted),

    connect,
    disconnect,
    createSession,
    startSession,
    nextQuestion,
    showLeaderboard,
    endSession,
    clearError,
  };
}

export const hostSession = createHostSessionStore();
