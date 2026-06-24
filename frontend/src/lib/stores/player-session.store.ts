import { writable, derived } from "svelte/store";
import type { Socket } from "socket.io-client";
import { createPlayerSocket } from "$lib/game/socket-player";
import { setLeaderboard, resetLeaderboard } from "$lib/stores/leaderboard.store";
import type { LeaderboardEntry } from "$lib/api/sessions/sessions.types";

export type PlayerPhase = "join" | "lobby" | "question" | "feedback" | "leaderboard" | "ended";

interface QuestionData {
  questionIndex: number;
  text: string;
  imageUrl: string | null;
  timeLimit: number;
  alternatives: { id: string; text: string; imageUrl: string | null; sortOrder: number }[];
}

interface AnswerResult {
  isCorrect: boolean;
  pointsEarned: number;
  totalScore: number;
}

interface PlayerSessionState {
  phase: PlayerPhase;
  pin: string | null;
  nickname: string | null;
  sessionId: string | null;
  totalPlayers: number;
  nicknames: string[];
  currentQuestion: QuestionData | null;
  totalScore: number;
  hasAnswered: boolean;
  lastResult: AnswerResult | null;
  correctAnswer: string | null;
  timedOut: boolean;
  isSubmitting: boolean;
  countdown: number;
  leaderboard: LeaderboardEntry[];
  error: string | null;
  isConnected: boolean;
}

const STORAGE_KEY = "player_session";

function saveSession(pin: string, nickname: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ pin, nickname }));
  } catch {
    // localStorage not available
  }
}

function loadSession(): { pin: string; nickname: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage not available
  }
}

const initialState: PlayerSessionState = {
  phase: "join",
  pin: null,
  nickname: null,
  sessionId: null,
  totalPlayers: 0,
  nicknames: [],
  currentQuestion: null,
  totalScore: 0,
  hasAnswered: false,
  lastResult: null,
  correctAnswer: null,
  timedOut: false,
  isSubmitting: false,
  countdown: 0,
  leaderboard: [],
  error: null,
  isConnected: false,
};

function createPlayerSessionStore() {
  const state = writable<PlayerSessionState>({ ...initialState });
  let socket: Socket | null = null;

  // --- Reconnection helpers ---

  function tryRestoreSession(): { pin: string; nickname: string } | null {
    return loadSession();
  }

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

  function connect(pin: string) {
    if (socket?.connected) {
      socket.disconnect();
      socket.removeAllListeners();
    }

    socket = createPlayerSocket(pin);

    socket.on("connect", () => {
      state.update((s) => ({ ...s, isConnected: true, error: null }));
    });

    socket.on("disconnect", () => {
      state.update((s) => ({ ...s, isConnected: false }));
    });

    socket.on("player:joined", (payload: { sessionId: string; totalPlayers: number }) => {
      state.update((s) => ({
        ...s,
        phase: "lobby",
        sessionId: payload.sessionId,
        totalPlayers: payload.totalPlayers,
        isSubmitting: false,
      }));
    });

    socket.on("player:lobby:update", (payload: { playerCount: number; nicknames: string[] }) => {
      state.update((s) => ({
        ...s,
        totalPlayers: payload.playerCount,
        nicknames: payload.nicknames,
      }));
    });

    socket.on(
      "game:question:show",
      (payload: {
        questionIndex: number;
        text: string;
        imageUrl: string | null;
        timeLimit: number;
        alternatives: { id: string; text: string; imageUrl: string | null; sortOrder: number }[];
      }) => {
        state.update((s) => ({
          ...s,
          phase: "question",
          currentQuestion: {
            questionIndex: payload.questionIndex,
            text: payload.text,
            imageUrl: payload.imageUrl ?? null,
            timeLimit: payload.timeLimit,
            alternatives: payload.alternatives,
          },
          hasAnswered: false,
          lastResult: null,
          correctAnswer: null,
          timedOut: false,
        }));
        startCountdown(payload.timeLimit);
      },
    );

    socket.on(
      "player:answer:ack",
      (payload: { isCorrect: boolean; pointsEarned: number; totalScore: number }) => {
        state.update((s) => ({
          ...s,
          phase: "feedback",
          hasAnswered: true,
          lastResult: {
            isCorrect: payload.isCorrect,
            pointsEarned: payload.pointsEarned,
            totalScore: payload.totalScore,
          },
          totalScore: payload.totalScore,
        }));
      },
    );

    socket.on("game:question:timeout", (payload: { correctAnswer: string }) => {
      state.update((s) => ({
        ...s,
        phase: s.hasAnswered ? s.phase : "feedback",
        correctAnswer: payload.correctAnswer,
        timedOut: !s.hasAnswered,
        lastResult: s.hasAnswered
          ? s.lastResult
          : { isCorrect: false, pointsEarned: 0, totalScore: s.totalScore },
      }));
    });

    socket.on("game:leaderboard:show", (payload: { rankings: LeaderboardEntry[] }) => {
      state.update((s) => {
        const nickname = s.nickname;
        if (nickname) {
          setLeaderboard(payload.rankings, nickname);
        }
        return {
          ...s,
          phase: "leaderboard",
          leaderboard: payload.rankings,
        };
      });
    });

    socket.on(
      "game:ended",
      (payload: { finalRankings: LeaderboardEntry[]; totalPlayers: number }) => {
        state.update((s) => {
          const nickname = s.nickname;
          if (nickname) {
            setLeaderboard(payload.finalRankings, nickname);
          }
          return {
            ...s,
            phase: "ended",
            leaderboard: payload.finalRankings,
            totalPlayers: payload.totalPlayers,
          };
        });
        clearSession();
      },
    );

    socket.on("error", (payload: { code?: string; message: string }) => {
      state.update((s) => ({ ...s, error: payload.message, isSubmitting: false }));
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

  // --- Public actions ---

  function join(pin: string, nickname: string) {
    const trimmedNick = nickname.trim();
    if (trimmedNick.length < 2 || trimmedNick.length > 20) {
      state.update((s) => ({
        ...s,
        error: "Apelido deve ter entre 2 e 20 caracteres",
      }));
      return;
    }

    state.update((s) => ({
      ...s,
      pin,
      nickname: trimmedNick,
      phase: "join",
      error: null,
      isSubmitting: true,
    }));

    connect(pin);

    socket?.once("connect", () => {
      socket?.emit("player:join", { nickname: trimmedNick });
      saveSession(pin, trimmedNick);
    });

    // If already connected (reconnection path)
    if (socket?.connected) {
      socket.emit("player:join", { nickname: trimmedNick });
      saveSession(pin, trimmedNick);
    }
  }

  function reconnect(expectedPin?: string) {
    const saved = tryRestoreSession();
    if (!saved) return;
    if (expectedPin && saved.pin !== expectedPin) return;

    state.update((s) => ({
      ...s,
      pin: saved.pin,
      nickname: saved.nickname,
      phase: "join",
      error: null,
    }));

    connect(saved.pin);

    socket?.once("connect", () => {
      socket?.emit("player:join", { nickname: saved.nickname });
    });

    if (socket?.connected) {
      socket.emit("player:join", { nickname: saved.nickname });
    }
  }

  function submitAnswer(questionIndex: number, answer: string) {
    socket?.emit("player:answer", { questionIndex, answer });
  }

  function clearError() {
    state.update((s) => ({ ...s, error: null }));
  }

  function reset() {
    disconnect();
    clearSession();
    resetLeaderboard();
    state.set({ ...initialState });
  }

  return {
    subscribe: state.subscribe,
    phase: derived(state, ($s) => $s.phase),
    pin: derived(state, ($s) => $s.pin),
    nickname: derived(state, ($s) => $s.nickname),
    sessionId: derived(state, ($s) => $s.sessionId),
    totalPlayers: derived(state, ($s) => $s.totalPlayers),
    nicknames: derived(state, ($s) => $s.nicknames),
    currentQuestion: derived(state, ($s) => $s.currentQuestion),
    totalScore: derived(state, ($s) => $s.totalScore),
    hasAnswered: derived(state, ($s) => $s.hasAnswered),
    lastResult: derived(state, ($s) => $s.lastResult),
    correctAnswer: derived(state, ($s) => $s.correctAnswer),
    countdown: derived(state, ($s) => $s.countdown),
    leaderboard: derived(state, ($s) => $s.leaderboard),
    error: derived(state, ($s) => $s.error),
    isConnected: derived(state, ($s) => $s.isConnected),
    timedOut: derived(state, ($s) => $s.timedOut),
    isSubmitting: derived(state, ($s) => $s.isSubmitting),

    join,
    reconnect,
    submitAnswer,
    clearError,
    reset,
  };
}

export const playerSession = createPlayerSessionStore();
