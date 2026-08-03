import { writable, derived, get } from "svelte/store";
import type { Socket } from "socket.io-client";
import { createHostSocket } from "$lib/game/socket-host";
import { queryClient } from "$lib/query-client";
import type { LeaderboardEntry } from "$lib/api/sessions/sessions.types";

// Lista de sessões ativas — invalidada nos eventos de ciclo de vida da sessão
const ACTIVE_SESSIONS_KEY = ["sessions", "active"] as const;

export type HostPhase = "idle" | "lobby" | "playing" | "leaderboard" | "drumroll" | "ended";

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
  isSubmitting: boolean;
  countdown: number;
  /** Lobby já aberto (tempo configurado) — restaurado no rejoin */
  lobbyStarted: boolean;
  /** Criando/reconectando sessão — feedback de loading nos botões de ação */
  creatingSession: boolean;
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
    isSubmitting: false,
    countdown: 0,
    lobbyStarted: false,
    creatingSession: false,
  });

  let socket: Socket | null = null;
  let pendingQuizId: string | null = null;
  let pendingRejoinId: string | null = null;
  let pendingAbortId: string | null = null;
  // Se o rejoin falhar, cria sessão nova com este quiz (recarga de página)
  let rejoinFallbackQuizId: string | null = null;

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
      if (pendingAbortId) {
        socket?.emit("host:session:abort", { sessionId: pendingAbortId });
        pendingAbortId = null;
      } else if (pendingRejoinId) {
        socket?.emit("host:session:rejoin", { sessionId: pendingRejoinId });
        pendingRejoinId = null;
      } else if (pendingQuizId) {
        socket?.emit("host:session:create", { quizId: pendingQuizId });
        pendingQuizId = null;
      }
    });

    socket.on("disconnect", () => {
      state.update((s) => ({ ...s, isConnected: false }));
    });

    socket.on("session:created", (payload: { pin: string; sessionId: string }) => {
      localStorage.setItem("currentSessionId", payload.sessionId);
      state.update((s) => ({
        ...s,
        phase: "lobby",
        pin: payload.pin,
        sessionId: payload.sessionId,
        creatingSession: false,
      }));
      queryClient.invalidateQueries({ queryKey: ACTIVE_SESSIONS_KEY });
    });

    socket.on("session:started", (payload: { pin: string; timeLimitSeconds: number }) => {
      state.update((s) => ({
        ...s,
        timeLimitSeconds: payload.timeLimitSeconds,
        lobbyStarted: true,
        isSubmitting: false,
      }));
    });

    socket.on("player:lobby:update", (payload: { playerCount: number; nicknames: string[] }) => {
      state.update((s) => ({
        ...s,
        playerCount: payload.playerCount,
        nicknames: payload.nicknames,
      }));
    });

    // Restaura estado completo ao reconectar em sessão ativa
    socket.on(
      "host:session:rejoined",
      (payload: {
        sessionId: string;
        pin: string;
        quizId: string;
        status: HostPhase;
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
        alternatives: { id: string; text: string; imageUrl: string | null; sortOrder: number }[];
        progress: { answered: number; total: number };
        rankings: LeaderboardEntry[];
        countdown: number;
      }) => {
        stopCountdown();
        rejoinFallbackQuizId = null;
        localStorage.setItem("currentSessionId", payload.sessionId);
        state.update((s) => ({
          ...s,
          phase: payload.status,
          pin: payload.pin,
          sessionId: payload.sessionId,
          quizId: payload.quizId,
          timeLimitSeconds: payload.timeLimitSeconds,
          presentationMode: payload.presentationMode,
          playerCount: payload.playerCount,
          nicknames: payload.nicknames,
          currentQuestion:
            payload.currentQuestionIndex > 0
              ? { index: payload.currentQuestionIndex, total: payload.totalQuestions }
              : null,
          currentQuestionData:
            payload.status === "playing"
              ? {
                  text: payload.questionText ?? "",
                  imageUrl: payload.questionImageUrl ?? null,
                  timeLimit: payload.timeLimitSeconds,
                  alternatives: payload.alternatives ?? [],
                }
              : null,
          progress: payload.progress ?? { answered: 0, total: 0 },
          leaderboard: payload.rankings ?? [],
          questionsExhausted: payload.questionsExhausted,
          lobbyStarted: payload.lobbyStarted,
          isSubmitting: false,
          creatingSession: false,
          error: null,
        }));
        if (payload.status === "playing" && payload.countdown != null) {
          startCountdown(payload.countdown);
        }
      },
    );

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
          isSubmitting: false,
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
        isSubmitting: false,
      }));
    });

    socket.on("host:leaderboard:show", (payload: { rankings: LeaderboardEntry[] }) => {
      stopCountdown();
      state.update((s) => ({
        ...s,
        phase: "leaderboard",
        leaderboard: payload.rankings,
        isSubmitting: false,
      }));
    });

    socket.on("host:drumroll", () => {
      stopCountdown();
      state.update((s) => ({
        ...s,
        phase: "drumroll",
        isSubmitting: false,
      }));
    });

    socket.on("host:session:ended", (payload: { sessionId: string; playerCount: number }) => {
      stopCountdown();
      localStorage.removeItem("currentSessionId");
      state.update((s) => ({
        ...s,
        phase: "ended",
        playerCount: payload.playerCount,
        isSubmitting: false,
      }));
      queryClient.invalidateQueries({ queryKey: ACTIVE_SESSIONS_KEY });
    });

    socket.on("host:session:aborted", () => {
      queryClient.invalidateQueries({ queryKey: ACTIVE_SESSIONS_KEY });
    });

    socket.on("error", (payload: { message: string }) => {
      // Rejoin falhou (sessão encerrada/expirou) → cai no fluxo de criar sessão nova
      if (rejoinFallbackQuizId) {
        const fallbackQuizId = rejoinFallbackQuizId;
        rejoinFallbackQuizId = null;
        createSession(fallbackQuizId);
        return;
      }
      state.update((s) => ({
        ...s,
        error: payload.message,
        isSubmitting: false,
        creatingSession: false,
      }));
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
    // Nova sessão = recomeço: id antigo de sessão não vale mais
    localStorage.removeItem("currentSessionId");

    // Reset state before starting a new session
    state.update((s) => ({
      ...s,
      phase: "idle" as HostPhase,
      pin: null,
      sessionId: null,
      quizId,
      creatingSession: true,
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
      lobbyStarted: false,
    }));

    if (socket?.connected) {
      socket.emit("host:session:create", { quizId });
    } else {
      pendingQuizId = quizId;
    }
  }

  function abortSession(sessionId: string) {
    if (!sessionId) return;
    if (socket?.connected) {
      socket.emit("host:session:abort", { sessionId });
    } else {
      pendingAbortId = sessionId;
      connect();
    }
  }

  function rejoinSession(sessionId: string, fallbackQuizId?: string) {
    if (!sessionId) return;
    rejoinFallbackQuizId = fallbackQuizId ?? null;
    localStorage.setItem("currentSessionId", sessionId);
    state.update((s) => ({
      ...s,
      sessionId,
      quizId: fallbackQuizId ?? s.quizId,
      error: null,
      isSubmitting: false,
      creatingSession: true,
    }));
    if (socket?.connected) {
      socket.emit("host:session:rejoin", { sessionId });
    } else {
      pendingRejoinId = sessionId;
      connect();
    }
  }

  function startSession(timeLimitSeconds: number) {
    if (!socket?.connected) return;
    const clamped = Math.min(300, Math.max(5, timeLimitSeconds ?? 30));
    state.update((s) => ({ ...s, isSubmitting: true }));
    socket.emit("host:session:start", { timeLimitSeconds: clamped });
  }

  function setPresentationMode(enabled: boolean) {
    state.update((s) => ({ ...s, presentationMode: enabled }));
    socket?.emit("host:session:presentation-mode", { enabled });
  }

  // Botão único: avança Pergunta → Placar Parcial → Pergunta → Tambores → Placar Final
  function advance() {
    state.update((s) => ({ ...s, isSubmitting: true }));
    socket?.emit("host:question:next");
  }

  function endSession() {
    state.update((s) => ({ ...s, isSubmitting: true }));
    socket?.emit("host:session:end");
  }

  function clearError() {
    state.update((s) => ({ ...s, error: null }));
  }

  function reset() {
    disconnect();
    // Mantém currentSessionId/currentQuizId no localStorage: se o host page for
    // remontado (navegação duplicada etc.), o onMount reconecta na sessão salva
    // em vez de criar uma nova (createSession limpa o id antigo ao recomeçar).
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
      isSubmitting: false,
      countdown: 0,
      lobbyStarted: false,
      creatingSession: false,
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
    isSubmitting: derived(state, ($s) => $s.isSubmitting),
    countdown: derived(state, ($s) => $s.countdown),
    lobbyStarted: derived(state, ($s) => $s.lobbyStarted),
    creatingSession: derived(state, ($s) => $s.creatingSession),

    connect,
    disconnect,
    createSession,
    rejoinSession,
    abortSession,
    startSession,
    setPresentationMode,
    advance,
    endSession,
    clearError,
    reset,
  };
}

export const hostSession = createHostSessionStore();
