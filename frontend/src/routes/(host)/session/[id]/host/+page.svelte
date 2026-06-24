<script lang="ts">
  import { ArrowLeft, CheckCircle, Projector, Trophy, X } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { hostSession, type HostPhase } from "$lib/stores/host-session.store";
  import type { LeaderboardEntry } from "$lib/api/sessions/sessions.types";
  import Podium from "$lib/components/ui/Podium.svelte";
  import RankingsTable from "$lib/components/ui/RankingsTable.svelte";
  import QuestionCard from "$lib/components/host/QuestionCard.svelte";

  let phase = $state<HostPhase>(get(hostSession.phase));
  let pin = $state<string | null>(get(hostSession.pin));
  let isConnected = $state(get(hostSession.isConnected));
  let playerCount = $state(get(hostSession.playerCount));
  let nicknames = $state<string[]>(get(hostSession.nicknames));
  let currentQuestion = $state<{ index: number; total: number } | null>(
    get(hostSession.currentQuestion),
  );
  let currentQuestionData = $state<{
    text: string;
    imageUrl: string | null;
    timeLimit: number;
    alternatives: { id: string; text: string; imageUrl: string | null; sortOrder: number }[];
  } | null>(get(hostSession.currentQuestionData));
  let timeLimitSeconds = $state(get(hostSession.timeLimitSeconds));
  let countdown = $state(get(hostSession.countdown));
  let progress = $state<{ answered: number; total: number }>(get(hostSession.progress));
  let leaderboard = $state<LeaderboardEntry[]>(get(hostSession.leaderboard));
  let error = $state<string | null>(get(hostSession.error));
  let questionsExhausted = $state(get(hostSession.questionsExhausted));
  let presentationMode = $state(get(hostSession.presentationMode));

  let selectedTimeLimit = $state(30);
  let sessionStarted = $state(false);

  const TIME_PRESETS = [
    { label: "15s", value: 15 },
    { label: "30s", value: 30 },
    { label: "60s", value: 60 },
    { label: "120s", value: 120 },
  ];

  const quizId =
    $hostSession.quizId ||
    (typeof localStorage !== "undefined" ? localStorage.getItem("currentQuizId") : null);

  onMount(() => {
    const unsubs: (() => void)[] = [
      hostSession.phase.subscribe((v) => (phase = v)),
      hostSession.pin.subscribe((v) => (pin = v)),
      hostSession.isConnected.subscribe((v) => (isConnected = v)),
      hostSession.playerCount.subscribe((v) => (playerCount = v)),
      hostSession.nicknames.subscribe((v) => (nicknames = v)),
      hostSession.currentQuestion.subscribe((v) => (currentQuestion = v)),
      hostSession.currentQuestionData.subscribe((v) => (currentQuestionData = v)),
      hostSession.timeLimitSeconds.subscribe((v) => (timeLimitSeconds = v)),
      hostSession.countdown.subscribe((v) => (countdown = v)),
      hostSession.progress.subscribe((v) => (progress = v)),
      hostSession.leaderboard.subscribe((v) => (leaderboard = v)),
      hostSession.error.subscribe((v) => (error = v)),
      hostSession.questionsExhausted.subscribe((v) => (questionsExhausted = v)),
      hostSession.presentationMode.subscribe((v) => (presentationMode = v)),
    ];

    hostSession.connect();

    // Only create a session if we don't already have one (e.g. after page refresh)
    if (phase === "idle" && quizId) {
      hostSession.createSession(quizId);
    }

    return () => {
      unsubs.forEach((fn) => fn());
      hostSession.reset();
    };
  });

  function handleOpenRoom() {
    hostSession.startSession(selectedTimeLimit);
    sessionStarted = true;
  }
  function handleTogglePresentationMode() {
    hostSession.setPresentationMode(!presentationMode);
  }
  function handleNextQuestion() {
    hostSession.nextQuestion();
  }
  function handleShowLeaderboard() {
    hostSession.showLeaderboard();
  }
  function handleEndSession() {
    hostSession.endSession();
  }
  function handleBackToDashboard() {
    hostSession.reset();
    goto(resolve("/dashboard"));
  }
  function handleDismissError() {
    hostSession.clearError();
  }

  const LETTERS = ["A", "B", "C", "D", "E", "F"];
  const ALT_COLORS = [
    "border-l-red-400",
    "border-l-blue-400",
    "border-l-emerald-400",
    "border-l-purple-400",
    "border-l-amber-400",
    "border-l-teal-400",
  ];
</script>

<div class="px-8 py-8 max-w-3xl">
  <!-- Top bar -->
  <div class="flex items-center justify-between mb-6">
    <a
      href={resolve("/dashboard")}
      class="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
    >
      <ArrowLeft class="w-4 h-4" />
      Dashboard
    </a>

    <div class="flex items-center gap-2">
      <span class="relative flex h-2.5 w-2.5">
        <span
          class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          class:bg-emerald-400={isConnected}
          class:bg-red-400={!isConnected}
        ></span>
        <span
          class="relative inline-flex rounded-full h-2.5 w-2.5"
          class:bg-emerald-500={isConnected}
          class:bg-red-500={!isConnected}
        ></span>
      </span>
      <span
        class="text-xs font-medium"
        class:text-emerald-600={isConnected}
        class:text-red-500={!isConnected}
      >
        {isConnected ? "Conectado" : "Desconectado"}
      </span>
    </div>
  </div>

  <!-- Error banner -->
  {#if error}
    <div
      class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 mb-6 flex items-center justify-between animate-fade-in"
      role="alert"
    >
      <span class="text-sm font-medium text-red-700">{error}</span>
      <button
        onclick={handleDismissError}
        class="text-red-400 hover:text-red-600 transition-colors p-1"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  {/if}

  <!-- ── Phase: Idle ── -->
  {#if phase === "idle"}
    <div class="flex flex-col items-center justify-center py-24">
      <div
        class="w-10 h-10 border-2 border-slate-200 border-t-cyan-500 rounded-full animate-spin mb-4"
      ></div>
      <p class="text-sm font-medium text-slate-500">Criando sessão...</p>
    </div>

    <!-- ── Phase: Lobby ── -->
  {:else if phase === "lobby"}
    <div class="space-y-6 animate-slide-up">
      <!-- PIN card -->
      {#if pin}
        <div class="bg-white rounded-xl border-2 border-dashed border-cyan-200 p-8 text-center">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            PIN da Sessão
          </p>
          <p
            class="text-6xl font-bold text-slate-900 tabular-nums tracking-[0.3em] font-mono animate-pulse-glow rounded-xl inline-block px-8 py-2"
          >
            {pin}
          </p>
          <p class="text-sm text-slate-400 mt-4">Compartilhe este código com os participantes</p>
        </div>
      {/if}

      <!-- Timer config (before opening room) -->
      {#if !sessionStarted}
        <div class="bg-white rounded-xl border border-slate-200 p-6">
          <p class="text-sm font-semibold text-slate-700 mb-3">Tempo por pergunta</p>
          <div class="flex gap-2 mb-4">
            {#each TIME_PRESETS as preset (preset.label)}
              <button
                onclick={() => (selectedTimeLimit = preset.value)}
                class="flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors
                  {selectedTimeLimit === preset.value
                  ? 'border-cyan-300 bg-cyan-50 text-cyan-700'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}"
              >
                {preset.label}
              </button>
            {/each}
          </div>

          <!-- Presentation Mode Toggle -->
          <div
            class="flex items-center justify-between p-4 rounded-lg bg-purple-50 border border-purple-200 mb-4"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-9 h-9 rounded-lg flex items-center justify-center"
                class:bg-purple-100={!presentationMode}
                class:bg-purple-600={presentationMode}
              >
                <Projector
                  class={`w-5 h-5 ${presentationMode ? "text-white" : "text-purple-500"}`}
                />
              </div>
              <div>
                <p class="text-sm font-semibold text-purple-900">Modo Apresentação</p>
                <p class="text-xs text-purple-600">
                  Pergunta só na tela do host. Jogadores veem apenas alternativas.
                </p>
              </div>
            </div>
            <button
              onclick={handleTogglePresentationMode}
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0
                {presentationMode ? 'bg-purple-600' : 'bg-slate-300'}"
              role="switch"
              aria-checked={presentationMode}
              aria-label="presentation mode"
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  {presentationMode ? 'translate-x-6' : 'translate-x-1'}"
              ></span>
            </button>
          </div>

          <button
            onclick={handleOpenRoom}
            class="w-full py-3 rounded-lg bg-cyan-600 text-white text-sm font-bold
              hover:bg-cyan-700 active:bg-cyan-800 transition-colors shadow-sm"
          >
            Abrir Sala
          </button>
        </div>

        <!-- Lobby status (after room opened) -->
      {:else}
        <div class="bg-white rounded-xl border border-slate-200 p-6 text-center">
          <h2 class="text-lg font-semibold text-slate-800 mb-1">Sala aberta</h2>
          <p class="text-sm text-slate-400 mb-4">Aguardando jogadores...</p>

          <div class="text-3xl font-bold text-cyan-600 mb-2 tabular-nums">
            {playerCount}
          </div>
          <p class="text-xs text-slate-400 mb-6">
            jogador{playerCount !== 1 ? "es" : ""} conectado{playerCount !== 1 ? "s" : ""}
          </p>

          {#if nicknames.length > 0}
            <div class="flex flex-wrap gap-2 justify-center mb-6">
              {#each nicknames as nick (nick)}
                <span
                  class="px-3 py-1.5 rounded-full bg-slate-100 text-sm font-medium text-slate-600"
                  >{nick}</span
                >
              {/each}
            </div>
          {:else}
            <p class="text-sm text-slate-300 italic mb-6">Nenhum jogador ainda</p>
          {/if}

          {#if playerCount > 0}
            <button
              onclick={handleNextQuestion}
              class="w-full py-3 rounded-lg bg-cyan-600 text-white text-sm font-bold
                hover:bg-cyan-700 active:bg-cyan-800 transition-colors shadow-sm"
            >
              Iniciar Primeira Pergunta
            </button>
          {/if}
        </div>
      {/if}
    </div>

    <!-- ── Phase: Playing ── -->
  {:else if phase === "playing"}
    <div class="space-y-5 animate-slide-up">
      <!-- Question header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <p class="text-sm font-medium text-slate-500">
            Pergunta <span class="text-slate-900 font-bold">{currentQuestion?.index ?? "?"}</span>
            de <span class="text-slate-700">{currentQuestion?.total ?? "?"}</span>
          </p>
          {#if presentationMode}
            <span
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold"
            >
              <Projector class="w-3 h-3" />
              Apresentação
            </span>
          {/if}
        </div>
        <div
          class="flex items-center gap-2 rounded-lg font-mono tabular-nums
          {presentationMode ? 'px-6 py-3' : 'px-4 py-2'}
          {countdown <= 5 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-700'}"
        >
          <span class="font-bold {presentationMode ? 'text-4xl' : 'text-2xl'}">{countdown}</span>
          <span class={presentationMode ? "text-lg" : "text-sm"}>s</span>
        </div>
      </div>

      <!-- Question card -->
      {#if currentQuestionData}
        <QuestionCard
          question={currentQuestionData}
          {presentationMode}
          letters={LETTERS}
          altColors={ALT_COLORS}
        />
      {/if}

      <!-- Progress -->
      <div class="bg-white rounded-xl border border-slate-200 p-5">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Respostas</span
          >
          <span class="text-sm font-medium text-slate-600 tabular-nums">
            {progress.answered} / {progress.total}
          </span>
        </div>
        <div class="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            class="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style="width: {progress.total > 0 ? (progress.answered / progress.total) * 100 : 0}%"
          ></div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <button
          onclick={handleNextQuestion}
          class="flex-1 py-3 rounded-lg bg-cyan-600 text-white text-sm font-bold
            hover:bg-cyan-700 active:bg-cyan-800 transition-colors shadow-sm"
        >
          Próxima Pergunta
        </button>
        <button
          onclick={handleShowLeaderboard}
          class="flex-1 py-3 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold
            hover:bg-slate-50 active:bg-slate-100 transition-colors"
        >
          Mostrar Placar
        </button>
      </div>
    </div>

    <!-- ── Phase: Leaderboard ── -->
  {:else if phase === "leaderboard"}
    <div class="space-y-5 animate-slide-up">
      <div class="text-center">
        {#if questionsExhausted}
          <div
            class="w-14 h-14 mx-auto mb-3 rounded-full bg-amber-100 flex items-center justify-center"
          >
            <Trophy class="w-7 h-7 text-amber-500" />
          </div>
          <h2 class="text-xl font-bold text-slate-900">Fim de Jogo</h2>
          <p class="text-sm text-slate-400 mt-1">
            Placar final · {playerCount} jogadores
          </p>
        {:else}
          <h2 class="text-xl font-bold text-slate-900">Placar Parcial</h2>
          <p class="text-sm text-slate-400 mt-1">{playerCount} jogadores</p>
        {/if}
      </div>

      {#if leaderboard.length > 0}
        {#if questionsExhausted}
          <Podium entries={leaderboard} />
        {/if}
        <RankingsTable entries={leaderboard} />
      {:else}
        <p class="text-center text-sm text-slate-400 py-8">Nenhum dado disponível</p>
      {/if}

      {#if questionsExhausted}
        <button
          onclick={handleEndSession}
          class="w-full py-3 rounded-lg bg-emerald-600 text-white text-sm font-bold
            hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-sm"
        >
          Finalizar e Salvar Resultados
        </button>
      {:else}
        <button
          onclick={handleNextQuestion}
          class="w-full py-3 rounded-lg bg-cyan-600 text-white text-sm font-bold
            hover:bg-cyan-700 active:bg-cyan-800 transition-colors shadow-sm"
        >
          Próxima Pergunta
        </button>
        <button
          onclick={handleEndSession}
          class="w-full py-3 rounded-lg border border-red-200 text-red-500 text-sm font-semibold
            hover:bg-red-50 active:bg-red-100 transition-colors"
        >
          Encerrar Sessão
        </button>
      {/if}
    </div>

    <!-- ── Phase: Ended ── -->
  {:else if phase === "ended"}
    <div class="space-y-5 animate-slide-up">
      <div class="text-center py-6">
        <div
          class="w-14 h-14 mx-auto mb-3 rounded-full bg-emerald-100 flex items-center justify-center"
        >
          <CheckCircle class="w-7 h-7 text-emerald-500" />
        </div>
        <h2 class="text-xl font-bold text-slate-900">Sessão Encerrada</h2>
        <p class="text-sm text-slate-400 mt-1">
          {playerCount} jogadores participaram
        </p>
      </div>

      {#if leaderboard.length > 0}
        <Podium entries={leaderboard} />
        <RankingsTable entries={leaderboard} />
      {/if}

      <button
        onclick={handleBackToDashboard}
        class="w-full py-3 rounded-lg bg-cyan-600 text-white text-sm font-bold
          hover:bg-cyan-700 active:bg-cyan-800 transition-colors shadow-sm"
      >
        Voltar ao Dashboard
      </button>
    </div>
  {/if}
</div>
