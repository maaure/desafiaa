<script lang="ts">
  import { ArrowLeft, CheckCircle, Projector, Trophy, Users, X } from "@lucide/svelte";
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
  let isSubmitting = $state(get(hostSession.isSubmitting));

  let selectedTimeLimit = $state(30);
  let sessionStarted = $state(false);

  const TIME_PRESETS = [
    { label: "15s", value: 15 },
    { label: "30s", value: 30 },
    { label: "60s", value: 60 },
    { label: "120s", value: 120 },
  ];

  const PHASE_LABELS: Record<HostPhase, string> = {
    idle: "Preparando",
    lobby: "Lobby",
    playing: "Pergunta em jogo",
    leaderboard: "Placar",
    drumroll: "Rufem os tambores",
    ended: "Encerrado",
  };

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
      hostSession.isSubmitting.subscribe((v) => (isSubmitting = v)),
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
  function handleAdvance() {
    hostSession.advance();
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
  // Cores do jogo (tokens bg-answer-*) — cicla A→B→C→D
  const ALT_COLORS = [
    "border-l-answer-a",
    "border-l-answer-b",
    "border-l-answer-c",
    "border-l-answer-d",
    "border-l-answer-a",
    "border-l-answer-b",
  ];
</script>

<div class="min-h-screen bg-surface text-ink flex flex-col">
  <!-- ══ HUD — sempre visível: fase · PIN · jogadores · timer · conexão ══ -->
  <header class="sticky top-0 z-40 bg-surface-raised border-b-2 border-ink shrink-0">
    <div class="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3 sm:gap-5">
      <a
        href={resolve("/dashboard")}
        class="inline-flex items-center gap-1.5 text-base font-semibold text-ink-faint hover:text-ink transition-colors"
        title="Voltar ao Dashboard"
      >
        <ArrowLeft class="w-5 h-5" />
        <span class="hidden sm:inline">Sair</span>
      </a>

      <div class="flex-1 flex items-center gap-3 sm:gap-5 min-w-0">
        <!-- Fase atual -->
        <span
          class="text-sm sm:text-base font-bold uppercase tracking-wider truncate text-ink-faint"
        >
          {#if phase === "playing" && currentQuestion}
            Pergunta {currentQuestion.index} de {currentQuestion.total}
          {:else}
            {PHASE_LABELS[phase]}
          {/if}
        </span>

        <!-- PIN — sempre visível no HUD -->
        {#if pin}
          <span
            class="font-mono font-bold tracking-[0.25em] text-xl sm:text-2xl text-primary"
            title="PIN da sessão"
          >
            {pin}
          </span>
        {/if}

        <!-- Jogadores -->
        {#if playerCount > 0}
          <span class="flex items-center gap-1.5 text-base font-bold text-ink-soft">
            <Users class="w-5 h-5" />
            {playerCount}
          </span>
        {/if}

        <!-- Timer — grande e sempre à vista durante a pergunta -->
        {#if phase === "playing"}
          <span
            class="ml-auto flex items-center gap-1.5 rounded-lg border-2 border-ink bg-sand-50 px-4 py-2 font-mono tabular-nums font-bold shadow-soft
            {countdown <= 5 ? 'text-tomato-600 animate-pulse-soft' : 'text-ocean-700'}"
          >
            <span class="text-2xl">{countdown}</span>
            <span class="text-sm">s</span>
          </span>
        {/if}
      </div>

      <!-- Conexão -->
      <span class="flex items-center gap-1.5 shrink-0">
        <span class="relative flex h-3 w-3">
          <span
            class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            class:bg-leaf-400={isConnected}
            class:bg-tomato-400={!isConnected}
          ></span>
          <span
            class="relative inline-flex rounded-full h-3 w-3"
            class:bg-leaf-500={isConnected}
            class:bg-tomato-500={!isConnected}
          ></span>
        </span>
        <span class="hidden md:inline text-sm font-semibold text-ink-faint">
          {isConnected ? "Conectado" : "Desconectado"}
        </span>
      </span>
    </div>
  </header>

  <!-- ══ Conteúdo ══ -->
  <main class="flex-1 px-4 sm:px-6 py-8 sm:py-10">
    <div class="max-w-5xl mx-auto">
      <!-- Error banner -->
      {#if error}
        <div
          class="rounded-lg border-2 border-tomato-500 bg-tomato-50 px-4 py-3 mb-6 flex items-center justify-between animate-fade-in"
          role="alert"
        >
          <span class="text-base font-medium text-tomato-700">{error}</span>
          <button
            onclick={handleDismissError}
            class="text-tomato-400 hover:text-tomato-600 transition-colors p-1"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      {/if}

      <!-- ── Phase: Idle ── -->
      {#if phase === "idle"}
        <div class="flex flex-col items-center justify-center py-32">
          <div
            class="w-14 h-14 border-4 border-sand-300 border-t-ocean-500 rounded-full animate-spin mb-4"
          ></div>
          <p class="text-lg font-semibold text-ink-soft">Criando sessão...</p>
        </div>

        <!-- ── Phase: Lobby ── -->
      {:else if phase === "lobby"}
        <div class="space-y-6 animate-slide-up">
          <!-- PIN card — o selo da sessão -->
          {#if pin}
            <div
              class="bg-surface-raised rounded-organic border-[3px] border-dashed border-ink p-8 sm:p-12 text-center shadow-lift"
            >
              <p class="text-sm font-bold uppercase tracking-widest text-ink-faint mb-3">
                PIN da Sessão
              </p>
              <p
                class="font-display text-hero font-extrabold text-primary tabular-nums tracking-[0.2em] animate-pulse-soft inline-block select-all"
              >
                {pin}
              </p>
              <p class="text-base text-ink-faint mt-4">
                Compartilhe este código com os participantes
              </p>
            </div>
          {/if}

          <!-- Timer config (before opening room) -->
          {#if !sessionStarted}
            <div class="bg-surface-raised rounded-2xl border-2 border-ink shadow-lift p-6 sm:p-8">
              <p class="text-xl font-bold text-ink mb-4">Tempo por pergunta</p>
              <div class="grid grid-cols-4 gap-2 mb-6">
                {#each TIME_PRESETS as preset (preset.label)}
                  <button
                    onclick={() => (selectedTimeLimit = preset.value)}
                    class="py-4 rounded-xl text-lg font-bold border-2 border-ink shadow-soft transition-all
                      active:translate-y-[2px] active:shadow-none
                      {selectedTimeLimit === preset.value
                      ? 'bg-ocean-500 text-white'
                      : 'bg-surface-raised text-ink-soft hover:bg-sand-50'}"
                  >
                    {preset.label}
                  </button>
                {/each}
              </div>

              <!-- Presentation Mode Toggle -->
              <div
                class="flex items-center justify-between p-5 rounded-xl border-2 border-ink shadow-soft mb-6 bg-sand-50"
              >
                <div class="flex items-center gap-4">
                  <div
                    class="w-12 h-12 rounded-xl flex items-center justify-center
                    {presentationMode ? 'bg-ocean-600' : 'bg-ocean-100'}"
                  >
                    <Projector
                      class={`w-6 h-6 ${presentationMode ? "text-white" : "text-ocean-600"}`}
                    />
                  </div>
                  <div>
                    <p class="text-lg font-bold text-ink">Modo Apresentação</p>
                    <p class="text-sm text-ink-faint">
                      Tela de game show no projetor. Jogadores veem só alternativas.
                    </p>
                  </div>
                </div>
                <button
                  onclick={handleTogglePresentationMode}
                  class="relative inline-flex h-8 w-14 items-center rounded-full border-2 border-ink transition-colors shrink-0
                    {presentationMode ? 'bg-ocean-600' : 'bg-sand-300'}"
                  role="switch"
                  aria-checked={presentationMode}
                  aria-label="presentation mode"
                >
                  <span
                    class="inline-block h-5 w-5 transform rounded-full bg-white border border-ink transition-transform
                      {presentationMode ? 'translate-x-7' : 'translate-x-0.5'}"
                  ></span>
                </button>
              </div>

              <button
                onclick={handleOpenRoom}
                disabled={isSubmitting}
                class="w-full py-4 rounded-xl border-2 border-ink bg-primary text-white text-xl font-bold
                  shadow-lift hover:bg-primary-hover active:bg-coral-800 active:translate-y-[3px] active:shadow-none
                  transition-all disabled:opacity-40 disabled:active:translate-y-0 disabled:active:shadow-lift"
              >
                {isSubmitting ? "Abrindo..." : "Abrir Sala"}
              </button>
            </div>

            <!-- Lobby status (after room opened) -->
          {:else}
            <div
              class="bg-surface-raised rounded-2xl border-2 border-ink shadow-lift p-8 sm:p-12 text-center"
            >
              <h2 class="font-display text-3xl font-extrabold mb-2">Sala aberta</h2>
              <p class="text-lg text-ink-faint mb-8">Aguardando jogadores...</p>

              <div class="font-display text-7xl font-extrabold text-primary mb-2 tabular-nums">
                {playerCount}
              </div>
              <p class="text-lg text-ink-faint mb-8">
                jogador{playerCount !== 1 ? "es" : ""} conectado{playerCount !== 1 ? "s" : ""}
              </p>

              {#if nicknames.length > 0}
                <div class="flex flex-wrap gap-3 justify-center mb-8">
                  {#each nicknames as nick (nick)}
                    <span
                      class="px-5 py-2 rounded-full border-2 border-ink shadow-soft text-base font-semibold bg-sand-50 text-ink-soft"
                      >{nick}</span
                    >
                  {/each}
                </div>
              {:else}
                <p class="text-base text-ink-faint italic mb-8">Nenhum jogador ainda</p>
              {/if}

              {#if playerCount > 0}
                <button
                  onclick={handleAdvance}
                  disabled={isSubmitting}
                  class="w-full py-4 rounded-xl border-2 border-ink bg-primary text-white text-xl font-bold
                    shadow-lift hover:bg-primary-hover active:bg-coral-800 active:translate-y-[3px] active:shadow-none
                    transition-all disabled:opacity-40 disabled:active:translate-y-0 disabled:active:shadow-lift"
                >
                  {isSubmitting ? "Iniciando..." : "Iniciar Primeira Pergunta"}
                </button>
              {/if}
            </div>
          {/if}
        </div>

        <!-- ── Phase: Playing ── -->
      {:else if phase === "playing"}
        <div class="space-y-6 animate-slide-up">
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
          <div class="bg-surface-raised rounded-2xl border-2 border-ink shadow-lift p-6">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-bold uppercase tracking-wider text-ink-faint"
                >Respostas</span
              >
              <span class="text-lg font-bold text-ink-soft tabular-nums">
                {progress.answered} / {progress.total}
              </span>
            </div>
            <div class="h-5 rounded-full border-2 border-ink bg-sand-100 overflow-hidden">
              <div
                class="h-full rounded-full bg-leaf-500 transition-all duration-500"
                style="width: {progress.total > 0
                  ? (progress.answered / progress.total) * 100
                  : 0}%"
              ></div>
            </div>

            <!-- Todos responderam → sinaliza que pode avançar -->
            {#if progress.total > 0 && progress.answered >= progress.total}
              <div
                class="mt-4 rounded-xl border-2 border-leaf-500 bg-leaf-100 px-4 py-3 flex items-center gap-3 animate-pop"
                role="status"
              >
                <CheckCircle class="w-7 h-7 text-leaf-600 shrink-0" />
                <div>
                  <p class="text-lg font-bold text-leaf-700">Todos responderam!</p>
                  <p class="text-sm text-leaf-700/80">Pode avançar para o placar.</p>
                </div>
              </div>
            {/if}
          </div>

          <!-- Avançar: fecha a pergunta e mostra o placar parcial -->
          <button
            onclick={handleAdvance}
            disabled={isSubmitting}
            class="w-full py-4 rounded-xl border-2 border-ink bg-primary text-white text-xl font-bold
              shadow-lift hover:bg-primary-hover active:bg-coral-800 active:translate-y-[3px] active:shadow-none
              transition-all disabled:opacity-40 disabled:active:translate-y-0 disabled:active:shadow-lift"
          >
            {isSubmitting ? "Avançando..." : "Avançar"}
          </button>
        </div>

        <!-- ── Phase: Leaderboard ── -->
      {:else if phase === "leaderboard"}
        <div class="space-y-6 animate-slide-up">
          <div class="text-center">
            {#if questionsExhausted}
              <div
                class="w-20 h-20 mx-auto mb-4 rounded-full border-2 border-ink shadow-lift bg-mango-100 flex items-center justify-center"
              >
                <Trophy class="w-10 h-10 text-mango-600" />
              </div>
              <h2 class="font-display text-4xl font-extrabold">Fim de Jogo</h2>
              <p class="text-lg text-ink-faint mt-2">
                Placar final · {playerCount} jogadores
              </p>
            {:else}
              <h2 class="font-display text-4xl font-extrabold">Placar Parcial</h2>
              <p class="text-lg text-ink-faint mt-2">{playerCount} jogadores</p>
            {/if}
          </div>

          {#if leaderboard.length > 0}
            {#if questionsExhausted}
              <Podium entries={leaderboard} />
            {/if}
            <RankingsTable entries={leaderboard} />
          {:else}
            <p class="text-center text-lg text-ink-faint py-8">Nenhum dado disponível</p>
          {/if}

          {#if questionsExhausted}
            <button
              onclick={handleEndSession}
              disabled={isSubmitting}
              class="w-full py-4 rounded-xl border-2 border-ink bg-success text-white text-xl font-bold
                shadow-lift hover:bg-leaf-700 active:bg-leaf-800 active:translate-y-[3px] active:shadow-none
                transition-all disabled:opacity-40 disabled:active:translate-y-0 disabled:active:shadow-lift"
            >
              {isSubmitting ? "Finalizando..." : "Finalizar e Salvar Resultados"}
            </button>
          {:else}
            <!-- Placar parcial → Avançar para a próxima pergunta -->
            <button
              onclick={handleAdvance}
              disabled={isSubmitting}
              class="w-full py-4 rounded-xl border-2 border-ink bg-primary text-white text-xl font-bold
                shadow-lift hover:bg-primary-hover active:bg-coral-800 active:translate-y-[3px] active:shadow-none
                transition-all disabled:opacity-40 disabled:active:translate-y-0 disabled:active:shadow-lift"
            >
              {isSubmitting ? "Avançando..." : "Avançar"}
            </button>
          {/if}
        </div>

        <!-- ── Phase: Drumroll (Rufem os tambores) ── -->
      {:else if phase === "drumroll"}
        <div class="flex flex-col items-center justify-center py-16 text-center animate-pop">
          <div
            class="w-24 h-24 mx-auto mb-6 rounded-full border-[3px] border-ink shadow-lift bg-mango-100 flex items-center justify-center text-6xl animate-pulse-soft"
          >
            🥁
          </div>
          <h2 class="font-display text-5xl font-extrabold text-mango-700 mb-3">
            Rufem os tambores!
          </h2>
          <p class="text-lg text-ink-faint mb-10">
            A última pergunta foi respondida. Vamos ver o placar final...
          </p>

          <button
            onclick={handleAdvance}
            disabled={isSubmitting}
            class="w-full max-w-md py-4 rounded-xl border-2 border-ink bg-primary text-white text-xl font-bold
              shadow-lift hover:bg-primary-hover active:bg-coral-800 active:translate-y-[3px] active:shadow-none
              transition-all disabled:opacity-40 disabled:active:translate-y-0 disabled:active:shadow-lift"
          >
            {isSubmitting ? "Avançando..." : "Avançar"}
          </button>
        </div>

        <!-- ── Phase: Ended ── -->
      {:else if phase === "ended"}
        <div class="space-y-6 animate-slide-up">
          <div class="text-center py-6">
            <div
              class="w-20 h-20 mx-auto mb-4 rounded-full border-2 border-ink shadow-lift bg-leaf-100 flex items-center justify-center"
            >
              <CheckCircle class="w-10 h-10 text-leaf-600" />
            </div>
            <h2 class="font-display text-4xl font-extrabold">Sessão Encerrada</h2>
            <p class="text-lg text-ink-faint mt-2">
              {playerCount} jogadores participaram
            </p>
          </div>

          {#if leaderboard.length > 0}
            <Podium entries={leaderboard} />
            <RankingsTable entries={leaderboard} />
          {/if}

          <button
            onclick={handleBackToDashboard}
            class="w-full py-4 rounded-xl border-2 border-ink bg-primary text-white text-xl font-bold
              shadow-lift hover:bg-primary-hover active:bg-coral-800 active:translate-y-[3px] active:shadow-none transition-all"
          >
            Voltar ao Dashboard
          </button>
        </div>
      {/if}
    </div>
  </main>
</div>
