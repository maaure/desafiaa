<script lang="ts">
  import { CheckCircle, X } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { playerSession } from "$lib/stores/player-session.store";
  import { leaderboardMyRank, leaderboardMyScore } from "$lib/stores/leaderboard.store";
  import Podium from "$lib/components/ui/Podium.svelte";

  const LABELS = ["A", "B", "C", "D", "E", "F"];
  // Cores do jogo (tokens bg-answer-*) — cicla A→B→C→D
  const BUTTON_COLORS = [
    "bg-answer-a",
    "bg-answer-b",
    "bg-answer-c",
    "bg-answer-d",
    "bg-answer-a",
    "bg-answer-b",
  ];

  const PHASE_LABELS: Record<string, string> = {
    join: "Entrada",
    lobby: "Lobby",
    question: "Pergunta",
    feedback: "Resultado",
    leaderboard: "Placar",
    drumroll: "Rufem os tambores",
    ended: "Fim de jogo",
  };

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
    goto(resolve("/play"));
  }

  let phase = $derived($playerSession.phase);

  function getLetter(index: number): string {
    return LABELS[index] ?? String(index + 1);
  }
</script>

<div class="min-h-screen bg-surface text-ink flex flex-col">
  <!-- ══ HUD — nickname · fase · placar ══ -->
  <header
    class="sticky top-0 z-40 bg-surface-raised border-b-2 border-ink px-4 py-3 flex items-center gap-3 shrink-0"
  >
    <span class="font-display text-lg font-bold truncate flex-1">
      {$playerSession.nickname || "Jogador"}
    </span>
    <span class="text-sm font-bold uppercase tracking-wider text-ink-faint">
      {PHASE_LABELS[phase]}
    </span>
    {#if $playerSession.totalScore > 0}
      <span class="font-display text-xl font-bold text-leaf-600 tabular-nums"
        >{$playerSession.totalScore} pts</span
      >
    {/if}
    <button
      onclick={handleLeave}
      class="px-4 py-2 rounded-lg border-2 border-ink text-base font-semibold text-ink-soft shadow-soft
        hover:text-danger hover:border-tomato-500 transition-colors"
    >
      Sair
    </button>
  </header>

  <!-- Error banner -->
  {#if $playerSession.error}
    <div
      class="mx-4 mt-4 rounded-lg border-2 border-tomato-500 bg-tomato-50 px-4 py-3 text-base font-medium text-tomato-700 flex items-center justify-between animate-fade-in"
    >
      <span>{$playerSession.error}</span>
      <button
        onclick={() => playerSession.clearError()}
        class="text-tomato-400 hover:text-tomato-600 p-1"
      >
        <X class="w-5 h-5" />
      </button>
    </div>
  {/if}

  <!-- Main content -->
  <div class="flex-1 flex flex-col p-4 sm:p-6">
    <!-- ── Phase: Join ── -->
    {#if phase === "join"}
      <div class="flex-1 flex flex-col items-center justify-center text-center">
        <h2 class="font-display text-3xl font-extrabold mb-2">Entrar na partida</h2>
        <p
          class="font-display text-5xl font-extrabold text-primary tracking-[0.2em] mb-8 tabular-nums animate-pulse-soft"
        >
          {pin}
        </p>

        <form onsubmit={handleJoin} class="w-full max-w-sm space-y-4">
          <input
            type="text"
            bind:value={nickInput}
            maxlength={20}
            placeholder="Seu apelido"
            required
            class="w-full px-4 py-4 rounded-xl border-2 border-ink bg-surface-raised text-center text-lg font-semibold shadow-soft
              placeholder:text-ink-faint focus:border-ocean-500
              outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={nickInput.trim().length < 2 || $playerSession.isSubmitting}
            class="w-full py-4 rounded-xl border-2 border-ink bg-primary text-white text-xl font-bold
              shadow-lift hover:bg-primary-hover active:translate-y-[3px] active:shadow-none
              disabled:opacity-40 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:shadow-lift
              transition-all"
          >
            {$playerSession.isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>

      <!-- ── Phase: Lobby ── -->
    {:else if phase === "lobby"}
      <div class="flex-1 flex flex-col items-center justify-center text-center">
        <div
          class="w-16 h-16 mb-5 rounded-full border-4 border-sand-300 border-t-ocean-500 animate-spin-slow"
        ></div>
        <h2 class="font-display text-3xl font-extrabold mb-2">Aguardando o host</h2>
        <p class="text-lg text-ink-faint mb-8">A partida vai começar em breve</p>

        <div class="font-display text-3xl font-extrabold text-leaf-600 mb-4">
          {$playerSession.totalPlayers} jogador{($playerSession.totalPlayers ?? 0) !== 1
            ? "es"
            : ""} na sala
        </div>

        <div class="flex flex-wrap gap-2 justify-center max-w-sm">
          {#each $playerSession.nicknames as nick (nick)}
            <span
              class="px-4 py-2 rounded-full border-2 border-ink bg-surface-raised text-base font-semibold text-ink-soft shadow-soft"
              >{nick}</span
            >
          {/each}
        </div>
      </div>

      <!-- ── Phase: Question ── -->
    {:else if phase === "question"}
      <div class="flex-1 flex flex-col">
        {#if $playerSession.currentQuestion}
          {#if $playerSession.currentQuestion.text}
            <!-- Normal mode: question text visible to player -->
            {#if $playerSession.currentQuestion.imageUrl}
              <img
                src={$playerSession.currentQuestion.imageUrl}
                alt=""
                class="max-h-52 w-auto mx-auto rounded-xl mb-4 object-contain"
              />
            {/if}
            <p class="font-display text-stage font-extrabold text-center leading-tight mb-6">
              {$playerSession.currentQuestion.text}
            </p>

            <!-- Timer (normal size) -->
            <div class="text-center mb-6">
              <span
                class="inline-flex items-center justify-center w-24 h-24 rounded-full border-[3px] border-ink shadow-lift text-4xl font-bold font-mono tabular-nums
                {$playerSession.countdown <= 5
                  ? 'border-tomato-500 text-tomato-600 bg-tomato-50 animate-pulse-soft'
                  : 'bg-surface-raised text-ink'}"
              >
                {$playerSession.countdown}
              </span>
            </div>
          {:else}
            <!-- Presentation mode: no question text — larger timer + hint -->
            <div class="text-center mb-3">
              <span
                class="inline-flex items-center justify-center w-36 h-36 rounded-full border-[3px] border-ink shadow-lift text-7xl font-bold font-mono tabular-nums
                {$playerSession.countdown <= 5
                  ? 'border-tomato-500 text-tomato-600 bg-tomato-50 animate-pulse-soft'
                  : 'bg-surface-raised text-ink'}"
              >
                {$playerSession.countdown}
              </span>
            </div>
            <p class="text-center text-lg text-ocean-600 font-semibold mb-6">
              Veja a pergunta na tela do apresentador
            </p>
          {/if}

          <!-- Alternatives -->
          <div
            class="flex-1 flex flex-col gap-4 {($playerSession.currentQuestion?.alternatives
              ?.length ?? 0) === 2
              ? 'flex-row items-stretch'
              : ''}"
          >
            {#each $playerSession.currentQuestion.alternatives as alt, i (alt.id)}
              <button
                onclick={() => handleAnswer(i, alt.text)}
                disabled={$playerSession.hasAnswered}
                class="flex flex-col gap-3 p-5 min-h-16 rounded-2xl border-2 border-ink text-white text-left font-display font-bold text-xl
                  transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
                  active:translate-y-[3px] active:shadow-none shadow-lift {BUTTON_COLORS[
                  i % BUTTON_COLORS.length
                ]}
                  hover:brightness-110
                  {($playerSession.currentQuestion?.alternatives?.length ?? 0) === 2
                  ? 'flex-1 justify-center text-center py-10'
                  : ''}"
              >
                {#if alt.imageUrl}
                  <img src={alt.imageUrl} alt="" class="w-full max-h-40 rounded-lg object-cover" />
                {/if}
                <span
                  class="flex items-center gap-4 {($playerSession.currentQuestion?.alternatives
                    ?.length ?? 0) === 2
                    ? 'flex-col'
                    : ''}"
                >
                  <span
                    class="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 border-2 border-white/40 text-lg font-bold shrink-0"
                  >
                    {getLetter(i)}
                  </span>
                  <span class="flex-1">{alt.text}</span>
                </span>
              </button>
            {/each}
          </div>
        {:else}
          <!-- Fallback: no question data yet, show timer only -->
          <div class="text-center mb-4">
            <span
              class="inline-flex items-center justify-center w-24 h-24 rounded-full border-[3px] border-ink shadow-lift text-4xl font-bold font-mono tabular-nums
              {$playerSession.countdown <= 5
                ? 'border-tomato-500 text-tomato-600 bg-tomato-50 animate-pulse-soft'
                : 'bg-surface-raised text-ink'}"
            >
              {$playerSession.countdown}
            </span>
          </div>
        {/if}
      </div>

      <!-- ── Phase: Feedback ── -->
    {:else if phase === "feedback"}
      <div class="flex-1 flex flex-col items-center justify-center text-center">
        {#if $playerSession.lastResult}
          {#if $playerSession.timedOut}
            <div
              class="w-28 h-28 rounded-full border-[3px] border-ink shadow-lift flex items-center justify-center text-6xl mb-5 bg-mango-100 text-mango-600 animate-pop"
            >
              ⏰
            </div>
            <h2 class="font-display text-4xl font-extrabold mb-3 text-mango-700">
              Tempo esgotado!
            </h2>
            <div class="text-center mb-6">
              <p class="font-display text-2xl font-bold text-ink-faint">0 pts</p>
              <p class="text-base text-ink-faint mt-1">
                Total: {$playerSession.totalScore} pts
              </p>
            </div>
          {:else}
            <div
              class="w-28 h-28 rounded-full border-[3px] border-ink shadow-lift flex items-center justify-center text-6xl mb-5 animate-pop
              {$playerSession.lastResult.isCorrect
                ? 'bg-leaf-100 text-leaf-600'
                : 'bg-tomato-100 text-tomato-600'}"
            >
              {$playerSession.lastResult.isCorrect ? "✓" : "✗"}
            </div>

            <h2
              class="font-display text-4xl font-extrabold mb-3 {$playerSession.lastResult.isCorrect
                ? 'text-leaf-700'
                : 'text-tomato-600'}"
            >
              {$playerSession.lastResult.isCorrect ? "Correto!" : "Errado!"}
            </h2>

            <div class="text-center mb-6">
              <p
                class="font-display text-4xl font-extrabold {$playerSession.lastResult.isCorrect
                  ? 'text-leaf-600'
                  : 'text-ink-faint'}"
              >
                {#if $playerSession.lastResult.isCorrect}+{$playerSession.lastResult
                    .pointsEarned}{:else}0{/if}
                pts
              </p>
              <p class="text-base text-ink-faint mt-1">
                Total: {$playerSession.totalScore} pts
              </p>
            </div>
          {/if}
        {/if}

        {#if $playerSession.correctAnswer}
          <div
            class="bg-surface-raised rounded-2xl border-2 border-ink shadow-lift px-6 py-4 max-w-sm w-full"
          >
            <p class="text-sm text-ink-faint mb-1">Resposta correta</p>
            <p class="text-lg font-bold text-leaf-700">
              {$playerSession.correctAnswer}
            </p>
          </div>
        {:else}
          <p class="text-lg text-ink-faint">Aguardando o resultado...</p>
        {/if}
      </div>

      <!-- ── Phase: Drumroll ── -->
    {:else if phase === "drumroll"}
      <div class="flex-1 flex flex-col items-center justify-center text-center">
        <div
          class="w-28 h-28 rounded-full border-[3px] border-ink shadow-lift flex items-center justify-center text-6xl mb-5 bg-mango-100 text-mango-600 animate-pulse-soft"
        >
          🥁
        </div>
        <h2 class="font-display text-4xl font-extrabold mb-2 text-mango-700">Rufem os tambores!</h2>
        <p class="text-lg text-ink-faint">O placar final está chegando...</p>
      </div>

      <!-- ── Phase: Leaderboard ── -->
    {:else if phase === "leaderboard"}
      <div class="flex-1 flex flex-col">
        <h2 class="font-display text-3xl font-extrabold text-center mb-4">Placar</h2>

        {#if $leaderboardMyRank}
          <div
            class="bg-mango-400 border-2 border-ink shadow-lift rounded-xl px-4 py-4 mb-4 flex items-center gap-3 -rotate-[0.5deg]"
          >
            <span class="font-display text-2xl font-extrabold text-mango-950"
              >#{$leaderboardMyRank}</span
            >
            <span class="text-base font-bold text-mango-950">Sua posição</span>
            <span class="ml-auto font-display text-xl font-extrabold text-mango-950 tabular-nums"
              >{$leaderboardMyScore} pts</span
            >
          </div>
        {/if}

        <div class="space-y-2.5">
          {#each $playerSession.leaderboard as entry, i (entry.rank)}
            <div
              class="flex items-center gap-3 px-4 py-4 rounded-xl border-2 shadow-soft text-base
              {entry.nickname.toLowerCase() === ($playerSession.nickname ?? '').toLowerCase()
                ? 'bg-ocean-500 border-ink text-white'
                : 'bg-surface-raised border-ink text-ink'}"
            >
              <span
                class="w-10 text-center font-bold shrink-0
                {entry.nickname.toLowerCase() === ($playerSession.nickname ?? '').toLowerCase()
                  ? 'text-white'
                  : 'text-ink-faint'}"
              >
                {#if i === 0}🥇
                {:else if i === 1}🥈
                {:else if i === 2}🥉
                {:else}#{entry.rank}
                {/if}
              </span>
              <span
                class="font-semibold truncate flex-1
                {entry.nickname.toLowerCase() === ($playerSession.nickname ?? '').toLowerCase()
                  ? 'text-white'
                  : 'text-ink-soft'}">{entry.nickname}</span
              >
              <span class="font-display font-bold tabular-nums">{entry.score}</span>
              <span
                class="text-sm tabular-nums w-10 text-right
                {entry.nickname.toLowerCase() === ($playerSession.nickname ?? '').toLowerCase()
                  ? 'text-white/80'
                  : 'text-ink-faint'}">{entry.correctCount} ✓</span
              >
            </div>
          {/each}
        </div>
      </div>

      <!-- ── Phase: Ended ── -->
    {:else if phase === "ended"}
      <div class="flex-1 flex flex-col">
        <div class="text-center mb-6">
          <div
            class="w-20 h-20 mx-auto mb-3 rounded-full border-2 border-ink shadow-lift bg-leaf-100 flex items-center justify-center animate-pop"
          >
            <CheckCircle class="w-10 h-10 text-leaf-600" />
          </div>
          <h2 class="font-display text-3xl font-extrabold">Partida encerrada!</h2>
        </div>

        <!-- Podium top 3 -->
        {#if $playerSession.leaderboard.length > 0}
          <Podium entries={$playerSession.leaderboard} compact />
        {/if}

        <!-- Full rankings -->
        <div class="space-y-2 mb-6">
          {#each $playerSession.leaderboard as entry (entry.rank)}
            <div
              class="flex items-center gap-3 px-4 py-3 rounded-lg border-2 shadow-soft text-base
              {entry.nickname.toLowerCase() === ($playerSession.nickname ?? '').toLowerCase()
                ? 'bg-ocean-500 border-ink text-white font-bold'
                : 'bg-surface-raised border-ink text-ink'}"
            >
              <span
                class="w-6 text-center text-sm tabular-nums
                {entry.nickname.toLowerCase() === ($playerSession.nickname ?? '').toLowerCase()
                  ? 'text-white/80'
                  : 'text-ink-faint'}">#{entry.rank}</span
              >
              <span
                class="flex-1 truncate
                {entry.nickname.toLowerCase() === ($playerSession.nickname ?? '').toLowerCase()
                  ? 'text-white'
                  : 'text-ink-soft'}">{entry.nickname}</span
              >
              <span class="font-display font-bold tabular-nums">{entry.score} pts</span>
            </div>
          {/each}
        </div>

        {#if $leaderboardMyRank}
          <div
            class="bg-mango-400 border-2 border-ink shadow-lift rounded-xl px-4 py-4 text-center text-base font-bold text-mango-950 mb-4 rotate-[0.5deg]"
          >
            Você terminou em <span class="font-display text-2xl">#{$leaderboardMyRank}</span>
            de {$playerSession.totalPlayers} jogadores com
            <span class="font-display text-2xl">{$playerSession.totalScore} pts</span>
          </div>
        {/if}

        <button
          onclick={handleLeave}
          class="w-full py-4 rounded-xl border-2 border-ink bg-primary text-white text-xl font-bold
            shadow-lift hover:bg-primary-hover active:translate-y-[3px] active:shadow-none transition-all"
        >
          Voltar ao início
        </button>
      </div>
    {/if}
  </div>
</div>
