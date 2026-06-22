<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { playerSession } from "$lib/stores/player-session.store";
  import { leaderboardMyRank, leaderboardMyScore } from "$lib/stores/leaderboard.store";

  const LABELS = ["A", "B", "C", "D", "E", "F"];
  const BUTTON_COLORS = [
    "bg-red-500 hover:bg-red-600",
    "bg-blue-500 hover:bg-blue-600",
    "bg-emerald-500 hover:bg-emerald-600",
    "bg-purple-500 hover:bg-purple-600",
    "bg-amber-500 hover:bg-amber-600",
    "bg-teal-500 hover:bg-teal-600",
  ];

  let pin = $derived($page.params.pin ?? "");
  let nickInput = $state("");

  onMount(() => {
    if ($playerSession.phase === "join" && !$playerSession.isConnected) {
      playerSession.reconnect(pin);
    }
  });

  function handleJoin(e: Event) {
    e.preventDefault();
    if (nickInput.trim().length < 2) return;
    playerSession.join(pin, nickInput.trim());
  }

  function handleAnswer(altIndex: number, altText: string) {
    const q = $playerSession.currentQuestion;
    if (!q || $playerSession.hasAnswered) return;
    playerSession.submitAnswer(q.questionIndex, altText);
  }

  function handleLeave() {
    playerSession.reset();
    goto("/play");
  }

  let phase = $derived($playerSession.phase);

  function getLetter(index: number): string {
    return LABELS[index] ?? String(index + 1);
  }
</script>

<div class="min-h-screen bg-slate-50 flex flex-col">
  <!-- Header -->
  <header class="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
    <span class="text-sm font-bold text-slate-900 truncate flex-1">
      {$playerSession.nickname || "Jogador"}
    </span>
    {#if $playerSession.totalScore > 0}
      <span class="text-sm font-bold text-emerald-600 tabular-nums">{$playerSession.totalScore} pts</span>
    {/if}
    <button onclick={handleLeave}
      class="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
      Sair
    </button>
  </header>

  <!-- Error banner -->
  {#if $playerSession.error}
    <div class="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 flex items-center justify-between animate-fade-in">
      <span>{$playerSession.error}</span>
      <button onclick={() => playerSession.clearError()} class="text-red-400 hover:text-red-600 p-1">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  {/if}

  <!-- Main content -->
  <div class="flex-1 flex flex-col p-4">
    <!-- ── Phase: Join ── -->
    {#if phase === "join"}
      <div class="flex-1 flex flex-col items-center justify-center text-center">
        <h2 class="text-xl font-bold text-slate-800 mb-2">Entrar na partida</h2>
        <p class="text-2xl font-mono font-bold text-cyan-600 tracking-[0.3em] mb-6 tabular-nums">{pin}</p>

        <form onsubmit={handleJoin} class="w-full max-w-xs space-y-4">
          <input
            type="text"
            bind:value={nickInput}
            maxlength={20}
            placeholder="Seu apelido"
            required
            class="w-full px-4 py-3 rounded-xl border border-slate-200 text-center text-base
              placeholder:text-slate-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100
              outline-none transition-colors"
          />
          <button type="submit" disabled={nickInput.trim().length < 2}
            class="w-full py-3 rounded-xl bg-cyan-600 text-white text-base font-bold
              hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm">
            Entrar
          </button>
        </form>
      </div>

    <!-- ── Phase: Lobby ── -->
    {:else if phase === "lobby"}
      <div class="flex-1 flex flex-col items-center justify-center text-center">
        <div class="w-12 h-12 mb-4 rounded-full border-2 border-slate-200 border-t-cyan-500 animate-spin-slow"></div>
        <h2 class="text-lg font-semibold text-slate-800 mb-1">Aguardando o host</h2>
        <p class="text-sm text-slate-400 mb-8">A partida vai começar em breve</p>

        <div class="text-sm font-medium text-cyan-600 mb-4">
          {$playerSession.totalPlayers} jogador{($playerSession.totalPlayers ?? 0) !== 1 ? 'es' : ''} na sala
        </div>

        <div class="flex flex-wrap gap-2 justify-center max-w-sm">
          {#each $playerSession.nicknames as nick}
            <span class="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-sm font-medium text-slate-600">{nick}</span>
          {/each}
        </div>
      </div>

    <!-- ── Phase: Question ── -->
    {:else if phase === "question"}
      <div class="flex-1 flex flex-col">
        <!-- Timer -->
        <div class="text-center mb-4">
          <span class="inline-flex items-center justify-center w-16 h-16 rounded-full text-2xl font-bold font-mono tabular-nums
            {$playerSession.countdown <= 5 ? 'bg-red-50 text-red-500' : 'bg-white border border-slate-200 text-slate-800'}">
            {$playerSession.countdown}
          </span>
        </div>

        <!-- Question text -->
        {#if $playerSession.currentQuestion}
          <p class="text-lg font-semibold text-slate-800 text-center leading-relaxed mb-6">
            {$playerSession.currentQuestion.text}
          </p>

          <!-- Alternatives -->
          <div class="flex-1 flex flex-col gap-3 {($playerSession.currentQuestion?.alternatives?.length ?? 0) === 2 ? 'flex-row items-stretch' : ''}">
            {#each $playerSession.currentQuestion.alternatives as alt, i}
              <button
                onclick={() => handleAnswer(i, alt.text)}
                disabled={$playerSession.hasAnswered}
                class="flex items-center gap-3 p-4 rounded-xl text-white text-left font-semibold text-sm
                  transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
                  active:scale-[0.98] shadow-sm {BUTTON_COLORS[i % BUTTON_COLORS.length]}
                  {($playerSession.currentQuestion?.alternatives?.length ?? 0) === 2 ? 'flex-1 flex-col justify-center text-center gap-2 py-8' : ''}"
              >
                <span class="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 text-sm font-bold shrink-0">
                  {getLetter(i)}
                </span>
                <span>{alt.text}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>

    <!-- ── Phase: Feedback ── -->
    {:else if phase === "feedback"}
      <div class="flex-1 flex flex-col items-center justify-center text-center">
        {#if $playerSession.lastResult}
          <div class="w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-4
            {$playerSession.lastResult.isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}">
            {$playerSession.lastResult.isCorrect ? "✓" : "✗"}
          </div>

          <h2 class="text-2xl font-bold mb-3 {$playerSession.lastResult.isCorrect ? 'text-emerald-700' : 'text-red-600'}">
            {$playerSession.lastResult.isCorrect ? "Correto!" : "Errado!"}
          </h2>

          <div class="text-center mb-6">
            <p class="text-lg font-bold {$playerSession.lastResult.isCorrect ? 'text-emerald-600' : 'text-slate-400'}">
              {#if $playerSession.lastResult.isCorrect}+{$playerSession.lastResult.pointsEarned} pts{:else}0 pts{/if}
            </p>
            <p class="text-sm text-slate-400 mt-1">Total: {$playerSession.totalScore} pts</p>
          </div>
        {/if}

        {#if $playerSession.correctAnswer}
          <div class="bg-white rounded-xl border border-slate-200 px-5 py-3 max-w-xs w-full">
            <p class="text-xs text-slate-400 mb-1">Resposta correta</p>
            <p class="text-sm font-semibold text-emerald-600">{$playerSession.correctAnswer}</p>
          </div>
        {:else}
          <p class="text-sm text-slate-400">Aguardando o resultado...</p>
        {/if}
      </div>

    <!-- ── Phase: Leaderboard ── -->
    {:else if phase === "leaderboard"}
      <div class="flex-1 flex flex-col">
        <h2 class="text-xl font-bold text-slate-900 text-center mb-4">Placar</h2>

        {#if $leaderboardMyRank}
          <div class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
            <span class="text-lg font-bold text-amber-700">#{$leaderboardMyRank}</span>
            <span class="text-sm text-amber-700">Sua posição</span>
            <span class="ml-auto text-sm font-bold text-amber-700 tabular-nums">{$leaderboardMyScore} pts</span>
          </div>
        {/if}

        <div class="space-y-2">
          {#each $playerSession.leaderboard as entry, i}
            <div class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm
              {entry.nickname.toLowerCase() === ($playerSession.nickname ?? "").toLowerCase()
                ? 'bg-cyan-50 border border-cyan-200' : 'bg-white border border-slate-100'}">
              <span class="w-8 text-center font-bold shrink-0
                {entry.nickname.toLowerCase() === ($playerSession.nickname ?? "").toLowerCase() ? 'text-cyan-700' : 'text-slate-400'}">
                {#if i === 0}🥇
                {:else if i === 1}🥈
                {:else if i === 2}🥉
                {:else}#{entry.rank}
                {/if}
              </span>
              <span class="font-medium text-slate-700 truncate flex-1">{entry.nickname}</span>
              <span class="font-bold text-slate-900 tabular-nums">{entry.score}</span>
              <span class="text-xs text-slate-400 tabular-nums w-10 text-right">{entry.correctCount} ✓</span>
            </div>
          {/each}
        </div>
      </div>

    <!-- ── Phase: Ended ── -->
    {:else if phase === "ended"}
      <div class="flex-1 flex flex-col">
        <div class="text-center mb-6">
          <div class="w-14 h-14 mx-auto mb-3 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg class="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 class="text-xl font-bold text-slate-900">Partida encerrada!</h2>
        </div>

        <!-- Podium top 3 -->
        {#if $playerSession.leaderboard.length > 0}
          <div class="flex items-end justify-center gap-3 mb-6">
            {#each $playerSession.leaderboard.slice(0, 3) as entry, i}
              {@const medals = ["🥇", "🥈", "🥉"]}
              {@const heights = ["h-24", "h-16", "h-14"]}
              {@const podiumBg = ["bg-amber-50 border-amber-200", "bg-slate-50 border-slate-200", "bg-orange-50 border-orange-100"]}
              <div class="flex flex-col items-center gap-2">
                <span class="text-xs font-semibold text-slate-700 text-center max-w-[72px] truncate">{entry.nickname}</span>
                <div class="w-18 {heights[i]} rounded-t-lg {podiumBg[i]} border border-b-0 flex flex-col items-center justify-center">
                  <span class="text-xl">{medals[i]}</span>
                  <span class="text-xs font-bold text-slate-600 tabular-nums">{entry.score}</span>
                </div>
              </div>
            {/each}
          </div>
        {/if}

        <!-- Full rankings -->
        <div class="space-y-1.5 mb-6">
          {#each $playerSession.leaderboard as entry}
            <div class="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm
              {entry.nickname.toLowerCase() === ($playerSession.nickname ?? "").toLowerCase()
                ? 'bg-cyan-50 font-semibold' : 'bg-white'}">
              <span class="w-6 text-center text-slate-400 text-xs tabular-nums">#{entry.rank}</span>
              <span class="flex-1 text-slate-700 truncate">{entry.nickname}</span>
              <span class="font-bold text-slate-900 tabular-nums">{entry.score} pts</span>
            </div>
          {/each}
        </div>

        {#if $leaderboardMyRank}
          <div class="bg-cyan-50 border border-cyan-200 rounded-xl px-4 py-3 text-center text-sm font-medium text-cyan-700 mb-4">
            Você terminou em <span class="font-bold">#{$leaderboardMyRank}</span>
            de {$playerSession.totalPlayers} jogadores com <span class="font-bold">{$playerSession.totalScore} pts</span>
          </div>
        {/if}

        <button onclick={handleLeave}
          class="w-full py-3 rounded-xl bg-cyan-600 text-white text-base font-bold
            hover:bg-cyan-700 transition-colors shadow-sm">
          Voltar ao início
        </button>
      </div>
    {/if}
  </div>
</div>
