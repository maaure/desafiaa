<script lang="ts">
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { hostSession, type HostPhase } from "$lib/stores/host-session.store";
  import type { LeaderboardEntry } from "$lib/types/session";

  const quizId = $page.params.id ?? "";

  let phase = $state<HostPhase>(get(hostSession.phase));
  let pin = $state<string | null>(get(hostSession.pin));
  let isConnected = $state(get(hostSession.isConnected));
  let playerCount = $state(get(hostSession.playerCount));
  let nicknames = $state<string[]>(get(hostSession.nicknames));
  let currentQuestion = $state<{ index: number; total: number } | null>(get(hostSession.currentQuestion));
  let currentQuestionData = $state<{
    text: string;
    timeLimit: number;
    alternatives: { id: string; text: string; sortOrder: number }[];
  } | null>(get(hostSession.currentQuestionData));
  let timeLimitSeconds = $state(get(hostSession.timeLimitSeconds));
  let progress = $state<{ answered: number; total: number }>(get(hostSession.progress));
  let leaderboard = $state<LeaderboardEntry[]>(get(hostSession.leaderboard));
  let error = $state<string | null>(get(hostSession.error));

  let selectedTimeLimit = $state(30);
  let sessionStarted = $state(false);

  const TIME_PRESETS = [
    { label: "15s", value: 15 },
    { label: "30s", value: 30 },
    { label: "60s", value: 60 },
    { label: "120s", value: 120 },
  ];

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
      hostSession.progress.subscribe((v) => (progress = v)),
      hostSession.leaderboard.subscribe((v) => (leaderboard = v)),
      hostSession.error.subscribe((v) => (error = v)),
    ];

    hostSession.connect();
    hostSession.createSession(quizId);

    return () => {
      unsubs.forEach((fn) => fn());
      hostSession.disconnect();
    };
  });

  function handleOpenRoom() { hostSession.startSession(selectedTimeLimit); sessionStarted = true; }
  function handleNextQuestion() { hostSession.nextQuestion(); }
  function handleShowLeaderboard() { hostSession.showLeaderboard(); }
  function handleEndSession() { hostSession.endSession(); }
  function handleBackToDashboard() { goto("/dashboard"); }
  function handleDismissError() { hostSession.clearError(); }

  const LETTERS = ["A", "B", "C", "D", "E", "F"];
</script>

<div class="px-8 py-8 max-w-3xl">
  <!-- Top bar -->
  <div class="flex items-center justify-between mb-6">
    <a href="/dashboard" class="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
      </svg>
      Dashboard
    </a>

    <div class="flex items-center gap-2">
      <span class="relative flex h-2.5 w-2.5">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          class:bg-emerald-400={isConnected} class:bg-red-400={!isConnected}></span>
        <span class="relative inline-flex rounded-full h-2.5 w-2.5"
          class:bg-emerald-500={isConnected} class:bg-red-500={!isConnected}></span>
      </span>
      <span class="text-xs font-medium" class:text-emerald-600={isConnected} class:text-red-500={!isConnected}>
        {isConnected ? "Conectado" : "Desconectado"}
      </span>
    </div>
  </div>

  <!-- Error banner -->
  {#if error}
    <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 mb-6 flex items-center justify-between animate-fade-in" role="alert">
      <span class="text-sm font-medium text-red-700">{error}</span>
      <button onclick={handleDismissError} class="text-red-400 hover:text-red-600 transition-colors p-1">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  {/if}

  <!-- ── Phase: Idle ── -->
  {#if phase === "idle"}
    <div class="flex flex-col items-center justify-center py-24">
      <div class="w-10 h-10 border-2 border-slate-200 border-t-cyan-500 rounded-full animate-spin mb-4"></div>
      <p class="text-sm font-medium text-slate-500">Criando sessão...</p>
    </div>

  <!-- ── Phase: Lobby ── -->
  {:else if phase === "lobby"}
    <div class="space-y-6 animate-slide-up">
      <!-- PIN card -->
      {#if pin}
        <div class="bg-white rounded-xl border-2 border-dashed border-cyan-200 p-8 text-center">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">PIN da Sessão</p>
          <p class="text-6xl font-bold text-slate-900 tabular-nums tracking-[0.3em] font-mono animate-pulse-glow rounded-xl inline-block px-8 py-2">
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
            {#each TIME_PRESETS as preset}
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
          <button onclick={handleOpenRoom}
            class="w-full py-3 rounded-lg bg-cyan-600 text-white text-sm font-bold
              hover:bg-cyan-700 active:bg-cyan-800 transition-colors shadow-sm">
            Abrir Sala
          </button>
        </div>

      <!-- Lobby status (after room opened) -->
      {:else}
        <div class="bg-white rounded-xl border border-slate-200 p-6 text-center">
          <h2 class="text-lg font-semibold text-slate-800 mb-1">Sala aberta</h2>
          <p class="text-sm text-slate-400 mb-4">Aguardando jogadores...</p>

          <div class="text-3xl font-bold text-cyan-600 mb-2 tabular-nums">{playerCount}</div>
          <p class="text-xs text-slate-400 mb-6">jogador{playerCount !== 1 ? 'es' : ''} conectado{playerCount !== 1 ? 's' : ''}</p>

          {#if nicknames.length > 0}
            <div class="flex flex-wrap gap-2 justify-center mb-6">
              {#each nicknames as nick}
                <span class="px-3 py-1.5 rounded-full bg-slate-100 text-sm font-medium text-slate-600">{nick}</span>
              {/each}
            </div>
          {:else}
            <p class="text-sm text-slate-300 italic mb-6">Nenhum jogador ainda</p>
          {/if}

          {#if playerCount > 0}
            <button onclick={handleNextQuestion}
              class="w-full py-3 rounded-lg bg-cyan-600 text-white text-sm font-bold
                hover:bg-cyan-700 active:bg-cyan-800 transition-colors shadow-sm">
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
        <p class="text-sm font-medium text-slate-500">
          Pergunta <span class="text-slate-900 font-bold">{currentQuestion?.index ?? "?"}</span>
          de <span class="text-slate-700">{currentQuestion?.total ?? "?"}</span>
        </p>
        <div class="flex items-center gap-2 px-4 py-2 rounded-lg font-mono tabular-nums
          {timeLimitSeconds <= 5 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-700'}">
          <span class="text-2xl font-bold">{timeLimitSeconds}</span>
          <span class="text-sm">s</span>
        </div>
      </div>

      <!-- Question card -->
      {#if currentQuestionData}
        <div class="bg-white rounded-xl border border-slate-200 p-6">
          <p class="text-lg font-semibold text-slate-800 leading-relaxed mb-6">{currentQuestionData.text}</p>

          <div class="space-y-2.5">
            {#each currentQuestionData.alternatives as alt, i}
              <div class="flex items-center gap-3 p-4 rounded-lg border border-slate-100 bg-slate-50">
                <span class="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-100 text-cyan-700
                  text-sm font-bold shrink-0">
                  {LETTERS[i] ?? String(i + 1)}
                </span>
                <span class="text-sm font-medium text-slate-700">{alt.text}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Progress -->
      <div class="bg-white rounded-xl border border-slate-200 p-5">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Respostas</span>
          <span class="text-sm font-medium text-slate-600 tabular-nums">
            {progress.answered} / {progress.total}
          </span>
        </div>
        <div class="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div class="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style="width: {progress.total > 0 ? (progress.answered / progress.total) * 100 : 0}%"></div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <button onclick={handleNextQuestion}
          class="flex-1 py-3 rounded-lg bg-cyan-600 text-white text-sm font-bold
            hover:bg-cyan-700 active:bg-cyan-800 transition-colors shadow-sm">
          Próxima Pergunta
        </button>
        <button onclick={handleShowLeaderboard}
          class="flex-1 py-3 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold
            hover:bg-slate-50 active:bg-slate-100 transition-colors">
          Mostrar Placar
        </button>
      </div>
    </div>

  <!-- ── Phase: Leaderboard ── -->
  {:else if phase === "leaderboard"}
    <div class="space-y-5 animate-slide-up">
      <div class="text-center">
        <h2 class="text-xl font-bold text-slate-900">Placar Parcial</h2>
        <p class="text-sm text-slate-400 mt-1">{playerCount} jogadores</p>
      </div>

      {#if leaderboard.length > 0}
        <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table class="w-full">
            <thead>
              <tr class="border-b border-slate-100">
                <th class="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-12">#</th>
                <th class="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Jogador</th>
                <th class="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Pontos</th>
                <th class="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-16">Certas</th>
              </tr>
            </thead>
            <tbody>
              {#each leaderboard as entry (entry.rank)}
                <tr class="border-b border-slate-50 last:border-0
                  {entry.rank === 1 ? 'bg-amber-50' : ''}">
                  <td class="px-5 py-3">
                    <span class="text-sm font-bold text-slate-400">{entry.rank}</span>
                  </td>
                  <td class="px-5 py-3">
                    <span class="text-sm font-medium text-slate-800">{entry.nickname}</span>
                  </td>
                  <td class="px-5 py-3 text-right">
                    <span class="text-sm font-bold text-slate-900 tabular-nums">{entry.score}</span>
                  </td>
                  <td class="px-5 py-3 text-right">
                    <span class="text-sm text-slate-500 tabular-nums">{entry.correctCount}</span>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <p class="text-center text-sm text-slate-400 py-8">Nenhum dado disponível</p>
      {/if}

      <button onclick={handleEndSession}
        class="w-full py-3 rounded-lg bg-red-500 text-white text-sm font-bold
          hover:bg-red-600 active:bg-red-700 transition-colors shadow-sm">
        Encerrar Sessão
      </button>
    </div>

  <!-- ── Phase: Ended ── -->
  {:else if phase === "ended"}
    <div class="space-y-5 animate-slide-up">
      <div class="text-center py-6">
        <div class="w-14 h-14 mx-auto mb-3 rounded-full bg-emerald-100 flex items-center justify-center">
          <svg class="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 class="text-xl font-bold text-slate-900">Sessão Encerrada</h2>
        <p class="text-sm text-slate-400 mt-1">{playerCount} jogadores participaram</p>
      </div>

      {#if leaderboard.length > 0}
        <!-- Top 3 podium -->
        <div class="flex items-end justify-center gap-3 mb-4">
          {#each leaderboard.slice(0, 3) as entry, i}
            {@const medals = ["🥇", "🥈", "🥉"]}
            {@const heights = ["h-28", "h-20", "h-16"]}
            {@const bgColors = ["bg-amber-50 border-amber-200", "bg-slate-50 border-slate-200", "bg-orange-50 border-orange-100"]}
            <div class="flex flex-col items-center gap-2">
              <span class="text-sm font-semibold text-slate-800 text-center max-w-[80px] truncate">{entry.nickname}</span>
              <div class="w-20 {heights[i]} rounded-t-lg {bgColors[i]} border border-b-0 flex flex-col items-center justify-center">
                <span class="text-2xl">{medals[i]}</span>
                <span class="text-sm font-bold text-slate-700 tabular-nums">{entry.score}</span>
              </div>
            </div>
          {/each}
        </div>

        <!-- Full rankings -->
        <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table class="w-full">
            <thead>
              <tr class="border-b border-slate-100">
                <th class="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-12">#</th>
                <th class="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Jogador</th>
                <th class="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Pontos</th>
                <th class="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-16">Certas</th>
              </tr>
            </thead>
            <tbody>
              {#each leaderboard as entry (entry.rank)}
                <tr class="border-b border-slate-50 last:border-0
                  {entry.rank === 1 ? 'bg-amber-50' : ''}">
                  <td class="px-5 py-3">
                    <span class="text-sm font-bold text-slate-400">{entry.rank}</span>
                  </td>
                  <td class="px-5 py-3">
                    <span class="text-sm font-medium text-slate-800">{entry.nickname}</span>
                  </td>
                  <td class="px-5 py-3 text-right">
                    <span class="text-sm font-bold text-slate-900 tabular-nums">{entry.score}</span>
                  </td>
                  <td class="px-5 py-3 text-right">
                    <span class="text-sm text-slate-500 tabular-nums">{entry.correctCount}</span>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}

      <button onclick={handleBackToDashboard}
        class="w-full py-3 rounded-lg bg-cyan-600 text-white text-sm font-bold
          hover:bg-cyan-700 active:bg-cyan-800 transition-colors shadow-sm">
        Voltar ao Dashboard
      </button>
    </div>
  {/if}
</div>
