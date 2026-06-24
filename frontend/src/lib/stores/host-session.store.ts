import { writable, derived, get } from "svelte/store";
import type { Socket } from "socket.io-client";
import { createHostSocket } from "$lib/game/socket-host";
import type { LeaderboardEntry } from "$lib/api/sessions/sessions.types";

export type HostPhase = "idle" | "lobby" | "playing" | "leaderboard" | "ended";

interface QuestionData {
  text: string;
  imageUrl: string | null;
  timeLimit: number;
  alternatives: { id: string; text: string; imageUrl: string | null; sortOrder: number }[];
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
  presentationMode: boolean;
  countdown: number;
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
    presentationMode: false,
    countdown: 0,
  });

  let socket: Socket | null = null;
  let pendingQuizId: string | null = null;

  // --- Countdown timer ---

  let countdownTimer: ReturnType<typeof setInterval> | null = null;

  function startCountdown(seconds: number) {
    stopCountdown();
    state.update((s) => ({ ...s, countdown: seconds }));
    countdownTimer = setInterval(() => {
      state.update((s) => {
        const next = s.countdown - 1;
        if (next <= 0) stopCountdown();
        return { ...s, countdown: Math.max(0, next) };
      });
    }, 1000);
  }

  function stopCountdown() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  // --- Socket lifecycle ---

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
      "host:question:active",
      (payload: {
        questionIndex: number;
        total: number;
        questionText: string;
        questionImageUrl: string | null;
        alternatives: { id: string; text: string; imageUrl: string | null; sortOrder: number }[];
      }) => {
        const timeLimit = get(state).timeLimitSeconds;
        state.update((s) => ({
          ...s,
          phase: "playing",
          currentQuestion: { index: payload.questionIndex, total: payload.total },
          currentQuestionData: {
            text: payload.questionText,
            imageUrl: payload.questionImageUrl ?? null,
            timeLimit: s.timeLimitSeconds,
            alternatives: payload.alternatives ?? [],
          },
          progress: { answered: 0, total: 0 },
        }));
        startCountdown(timeLimit);
      },
    );

    socket.on("host:answers:progress", (payload: { answered: number; total: number }) => {
      state.update((s) => ({
        ...s,
        progress: { answered: payload.answered, total: payload.total },
      }));
    });

    socket.on("host:questions:exhausted", (payload: { rankings: LeaderboardEntry[] }) => {
      stopCountdown();
      state.update((s) => ({
        ...s,
        phase: "leaderboard",
        leaderboard: payload.rankings,
        questionsExhausted: true,
      }));
    });

    socket.on("game:leaderboard:show", (payload: { rankings: LeaderboardEntry[] }) => {
      stopCountdown();
      state.update((s) => ({
        ...s,
        phase: "leaderboard",
        leaderboard: payload.rankings,
      }));
    });

    socket.on(
      "game:ended",
      (payload: { finalRankings: LeaderboardEntry[]; totalPlayers: number }) => {
        stopCountdown();
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
    stopCountdown();
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
      presentationMode: false,
      countdown: 0,
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

  function setPresentationMode(enabled: boolean) {
    state.update((s) => ({ ...s, presentationMode: enabled }));
    socket?.emit("host:session:presentation-mode", { enabled });
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

  function reset() {
    disconnect();
    localStorage.removeItem("currentQuizId");
    state.set({
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
      presentationMode: false,
      countdown: 0,
    });
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
    presentationMode: derived(state, ($s) => $s.presentationMode),
    countdown: derived(state, ($s) => $s.countdown),

    connect,
    disconnect,
    createSession,
    startSession,
    setPresentationMode,
    nextQuestion,
    showLeaderboard,
    endSession,
    clearError,
    reset,
  };
}

export const hostSession = createHostSessionStore();
