<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { playerSession } from "$lib/stores/player-session.store";
  import {
    leaderboardMyRank,
    leaderboardMyScore,
  } from "$lib/stores/leaderboard.store";

  const LABELS = ["A", "B", "C", "D", "E", "F"];
  const BUTTON_COLORS = [
    "#e74c3c",
    "#3498db",
    "#2ecc71",
    "#9b59b6",
    "#f39c12",
    "#1abc9c",
  ];

  let pin = $derived($page.params.pin ?? "");
  let nickInput = $state("");
  let countdown = $state(0);
  let countdownInterval: ReturnType<typeof setInterval> | null = null;

  // Attempt reconnection on mount if store is empty
  onMount(() => {
    if ($playerSession.phase === "join" && !$playerSession.isConnected) {
      // Check for saved session
      const saved = loadSessionRaw();
      if (saved && saved.pin === pin) {
        playerSession.reconnect();
      }
    }
  });

  function loadSessionRaw(): { pin: string; nickname: string } | null {
    try {
      const raw = localStorage.getItem("player_session");
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  // Countdown timer for question phase
  $effect(() => {
    const q = $playerSession.currentQuestion;
    if ($playerSession.phase === "question" && q && q.timeLimit > 0) {
      countdown = q.timeLimit;
      if (countdownInterval) clearInterval(countdownInterval);
      countdownInterval = setInterval(() => {
        countdown = Math.max(0, countdown - 1);
        if (countdown <= 0 && countdownInterval) {
          clearInterval(countdownInterval);
          countdownInterval = null;
        }
      }, 1000);
    } else {
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
    }

    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
    };
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

  // Derived values for convenience
  let phase = $derived($playerSession.phase);

  // ── Helpers ──

  function getLetter(index: number): string {
    return LABELS[index] ?? String(index + 1);
  }

  function getButtonColor(index: number): string {
    return BUTTON_COLORS[index % BUTTON_COLORS.length];
  }
</script>

<div class="game-container">
  <!-- Header bar -->
  <header class="game-header">
    {#if $playerSession.nickname}
      <span class="header-nick">{$playerSession.nickname}</span>
    {/if}
    {#if $playerSession.totalScore > 0}
      <span class="header-score">{$playerSession.totalScore} pts</span>
    {/if}
    <button class="leave-btn" onclick={handleLeave}>Sair</button>
  </header>

  <!-- Error banner -->
  {#if $playerSession.error}
    <div class="error-banner">
      <span>{$playerSession.error}</span>
      <button onclick={() => playerSession.clearError()}>x</button>
    </div>
  {/if}

  <!-- ── Phase: Join (nickname entry on game page) ── -->
  {#if phase === "join"}
    <div class="phase-join">
      <h2>Entrar na partida</h2>
      <p class="pin-display">PIN: {pin}</p>
      <form onsubmit={handleJoin} class="join-form">
        <input
          type="text"
          bind:value={nickInput}
          maxlength={20}
          placeholder="Seu apelido"
          required
        />
        <button type="submit" disabled={nickInput.trim().length < 2}>
          Entrar
        </button>
      </form>
    </div>

  <!-- ── Phase: Lobby ── -->
  {:else if phase === "lobby"}
    <div class="phase-lobby">
      <h2>Aguardando o host iniciar...</h2>
      <div class="lobby-info">
        <span class="player-count">{$playerSession.totalPlayers} jogador(es) conectado(s)</span>
      </div>
      <div class="lobby-players">
        {#each $playerSession.nicknames as nick}
          <span class="lobby-nick">{nick}</span>
        {/each}
      </div>
    </div>

  <!-- ── Phase: Question ── -->
  {:else if phase === "question"}
    <div class="phase-question">
      {#if $playerSession.currentQuestion}
        <div class="question-timer" class:warning={countdown <= 5}>
          {countdown}s
        </div>

        <p class="question-text">
          {$playerSession.currentQuestion.text}
        </p>

        <div class="alternatives-grid" class:vf={$playerSession.currentQuestion.alternatives.length === 2}>
          {#each $playerSession.currentQuestion.alternatives as alt, i}
            <button
              class="alt-btn"
              style="background-color: {getButtonColor(i)}"
              onclick={() => handleAnswer(i, alt.text)}
              disabled={$playerSession.hasAnswered}
            >
              <span class="alt-label">{getLetter(i)}</span>
              <span class="alt-text">{alt.text}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>

  <!-- ── Phase: Feedback ── -->
  {:else if phase === "feedback"}
    <div class="phase-feedback">
      {#if $playerSession.lastResult}
        <div class="feedback-icon" class:correct={$playerSession.lastResult.isCorrect} class:incorrect={!$playerSession.lastResult.isCorrect}>
          {$playerSession.lastResult.isCorrect ? "✓" : "✗"}
        </div>

        <p class="feedback-text">
          {$playerSession.lastResult.isCorrect ? "Correto!" : "Errado!"}
        </p>

        <div class="feedback-points">
          <span class="points-earned">
            {#if $playerSession.lastResult.isCorrect}
              +{$playerSession.lastResult.pointsEarned} pts
            {:else}
              0 pts
            {/if}
          </span>
          <span class="total-score">
            Total: {$playerSession.totalScore} pts
          </span>
        </div>
      {/if}

      {#if $playerSession.correctAnswer}
        <div class="correct-answer">
          <span class="correct-label">Resposta correta:</span>
          <span class="correct-text">{$playerSession.correctAnswer}</span>
        </div>
      {:else}
        <p class="waiting-msg">Aguardando o resultado da pergunta...</p>
      {/if}
    </div>

  <!-- ── Phase: Leaderboard ── -->
  {:else if phase === "leaderboard"}
    <div class="phase-leaderboard">
      <h2>Placar</h2>

      {#if $leaderboardMyRank}
        <div class="my-position">
          <span class="rank-badge">#{$leaderboardMyRank}</span>
          <span>{$leaderboardMyScore} pts</span>
        </div>
      {/if}

      <div class="leaderboard-table">
        {#each $playerSession.leaderboard as entry, i}
          <div
            class="leaderboard-row"
            class:is-me={entry.nickname.toLowerCase() === ($playerSession.nickname ?? "").toLowerCase()}
          >
            <span class="row-rank">
              {#if i === 0}
                🥇
              {:else if i === 1}
                🥈
              {:else if i === 2}
                🥉
              {:else}
                #{entry.rank}
              {/if}
            </span>
            <span class="row-nick">{entry.nickname}</span>
            <span class="row-score">{entry.score}</span>
            <span class="row-correct">{entry.correctCount} acertos</span>
          </div>
        {/each}
      </div>
    </div>

  <!-- ── Phase: Ended (Podium) ── -->
  {:else if phase === "ended"}
    <div class="phase-ended">
      <h2>Partida encerrada!</h2>

      <div class="podium">
        {#if $playerSession.leaderboard.length > 0}
          <!-- Pódio: top 3 destacado -->
          <div class="podium-top3">
            {#each $playerSession.leaderboard.slice(0, 3) as entry, i}
              <div class="podium-card" class:gold={i === 0} class:silver={i === 1} class:bronze={i === 2}>
                <div class="podium-medal">
                  {#if i === 0}
                    🥇
                  {:else if i === 1}
                    🥈
                  {:else}
                    🥉
                  {/if}
                </div>
                <div class="podium-nick">{entry.nickname}</div>
                <div class="podium-score">{entry.score} pts</div>
                <div class="podium-correct">{entry.correctCount} acertos</div>
              </div>
            {/each}
          </div>
        {/if}

        <!-- Classificação completa -->
        <div class="final-rankings">
          <h3>Classificação final</h3>
          <div class="leaderboard-table">
            {#each $playerSession.leaderboard as entry}
              <div
                class="leaderboard-row"
                class:is-me={entry.nickname.toLowerCase() === ($playerSession.nickname ?? "").toLowerCase()}
              >
                <span class="row-rank">#{entry.rank}</span>
                <span class="row-nick">{entry.nickname}</span>
                <span class="row-score">{entry.score} pts</span>
                <span class="row-correct">{entry.correctCount} acertos</span>
              </div>
            {/each}
          </div>
        </div>

        {#if $leaderboardMyRank}
          <div class="final-my-rank">
            Você terminou em #{ $leaderboardMyRank } de { $playerSession.totalPlayers } jogadores
            com { $playerSession.totalScore } pontos.
          </div>
        {/if}

        <button class="leave-btn final-leave" onclick={handleLeave}>
          Voltar ao início
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .game-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 1rem;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* ── Header ── */

  .game-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid #eee;
    margin-bottom: 1.5rem;
  }

  .header-nick {
    font-weight: 600;
    flex: 1;
  }

  .header-score {
    font-weight: 700;
    color: #2ecc71;
  }

  .leave-btn {
    padding: 0.375rem 0.75rem;
    background: transparent;
    color: #666;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 0.8125rem;
    cursor: pointer;
  }

  .leave-btn:hover {
    background: #f5f5f5;
    color: #e74c3c;
    border-color: #e74c3c;
  }

  /* ── Error banner ── */

  .error-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: #fef2f2;
    color: #dc2626;
    border-radius: 8px;
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }

  .error-banner button {
    background: none;
    border: none;
    color: #dc2626;
    font-weight: 700;
    cursor: pointer;
    padding: 0 0.25rem;
  }

  /* ── Phase: Join ── */

  .phase-join {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    text-align: center;
  }

  .phase-join h2 {
    margin-bottom: 0.5rem;
  }

  .pin-display {
    font-family: monospace;
    font-size: 1.5rem;
    letter-spacing: 0.3em;
    color: #4a90d9;
    font-weight: 700;
    margin-bottom: 1.5rem;
  }

  .join-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
    max-width: 280px;
  }

  .join-form input {
    padding: 0.75rem;
    border: 1px solid #ccc;
    border-radius: 8px;
    font-size: 1.125rem;
    text-align: center;
  }

  .join-form input:focus {
    outline: none;
    border-color: #4a90d9;
    box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.2);
  }

  .join-form button {
    padding: 0.875rem;
    background: #4a90d9;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
  }

  .join-form button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* ── Phase: Lobby ── */

  .phase-lobby {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    text-align: center;
  }

  .phase-lobby h2 {
    margin-bottom: 1rem;
    color: #444;
  }

  .lobby-info {
    margin-bottom: 1.5rem;
  }

  .player-count {
    font-size: 1.125rem;
    font-weight: 600;
    color: #4a90d9;
  }

  .lobby-players {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
  }

  .lobby-nick {
    padding: 0.5rem 1rem;
    background: #f0f4ff;
    border-radius: 20px;
    font-size: 0.875rem;
    color: #333;
  }

  /* ── Phase: Question ── */

  .phase-question {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .question-timer {
    text-align: center;
    font-size: 2rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: #333;
    margin-bottom: 1rem;
  }

  .question-timer.warning {
    color: #e74c3c;
    animation: pulse 1s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .question-text {
    font-size: 1.25rem;
    line-height: 1.6;
    margin-bottom: 1.5rem;
    text-align: center;
    padding: 1rem;
    background: #f9f9f9;
    border-radius: 12px;
  }

  .alternatives-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: auto;
  }

  .alternatives-grid.vf {
    flex-direction: row;
  }

  .alternatives-grid.vf .alt-btn {
    flex: 1;
  }

  .alt-btn {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    border: none;
    border-radius: 12px;
    color: white;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.1s, opacity 0.2s;
    text-align: left;
  }

  .alt-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .alt-btn:active:not(:disabled) {
    transform: translateY(0);
  }

  .alt-btn:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .alt-label {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    font-weight: 700;
    flex-shrink: 0;
  }

  .alt-text {
    flex: 1;
  }

  /* ── Phase: Feedback ── */

  .phase-feedback {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    text-align: center;
  }

  .feedback-icon {
    font-size: 4rem;
    width: 6rem;
    height: 6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    margin-bottom: 1rem;
  }

  .feedback-icon.correct {
    background: #d4edda;
    color: #155724;
  }

  .feedback-icon.incorrect {
    background: #f8d7da;
    color: #721c24;
  }

  .feedback-text {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.75rem;
  }

  .feedback-points {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 1.5rem;
  }

  .points-earned {
    font-size: 1.25rem;
    font-weight: 700;
    color: #2ecc71;
  }

  .total-score {
    font-size: 0.9375rem;
    color: #666;
  }

  .correct-answer {
    padding: 0.75rem 1.5rem;
    background: #f0f4ff;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .correct-label {
    font-size: 0.8125rem;
    color: #666;
  }

  .correct-text {
    font-size: 1.125rem;
    font-weight: 600;
    color: #2ecc71;
  }

  .waiting-msg {
    color: #999;
    font-size: 0.9375rem;
  }

  /* ── Phase: Leaderboard ── */

  .phase-leaderboard {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .phase-leaderboard h2 {
    text-align: center;
    margin-bottom: 0.75rem;
  }

  .my-position {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: #fff3cd;
    border-radius: 8px;
  }

  .rank-badge {
    font-size: 1.25rem;
    font-weight: 700;
    color: #856404;
  }

  .leaderboard-table {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .leaderboard-row {
    display: grid;
    grid-template-columns: 3rem 1fr 5rem 6rem;
    align-items: center;
    padding: 0.75rem;
    background: #f9f9f9;
    border-radius: 8px;
    font-size: 0.9375rem;
    gap: 0.5rem;
  }

  .leaderboard-row.is-me {
    background: #e8f4fd;
    font-weight: 600;
    box-shadow: 0 0 0 2px #4a90d9;
  }

  .row-rank {
    font-weight: 700;
    text-align: center;
  }

  .row-nick {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .row-score {
    font-weight: 600;
    text-align: right;
    color: #2ecc71;
  }

  .row-correct {
    font-size: 0.8125rem;
    color: #666;
    text-align: right;
  }

  /* ── Phase: Ended (Podium) ── */

  .phase-ended {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .phase-ended h2 {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .podium-top3 {
    display: flex;
    justify-content: center;
    gap: 0.75rem;
    margin-bottom: 2rem;
  }

  .podium-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1rem;
    border-radius: 12px;
    background: #f5f5f5;
    min-width: 100px;
  }

  .podium-card.gold {
    background: #fff7e0;
    box-shadow: 0 0 0 2px #f1c40f;
    transform: scale(1.05);
  }

  .podium-card.silver {
    background: #f0f4ff;
    box-shadow: 0 0 0 2px #bdc3c7;
  }

  .podium-card.bronze {
    background: #fef0e7;
    box-shadow: 0 0 0 2px #e67e22;
  }

  .podium-medal {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }

  .podium-nick {
    font-weight: 600;
    font-size: 1rem;
    margin-bottom: 0.25rem;
  }

  .podium-score {
    font-weight: 700;
    color: #2ecc71;
    font-size: 1.125rem;
  }

  .podium-correct {
    font-size: 0.8125rem;
    color: #666;
  }

  .final-rankings h3 {
    text-align: center;
    margin-bottom: 0.75rem;
    font-size: 1rem;
    color: #444;
  }

  .final-my-rank {
    text-align: center;
    margin: 1.5rem 0;
    padding: 1rem;
    background: #e8f4fd;
    border-radius: 8px;
    font-weight: 600;
  }

  .final-leave {
    margin-top: auto;
    width: 100%;
    padding: 0.875rem;
    background: #4a90d9;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
  }

  .final-leave:hover {
    background: #357abd;
  }
</style>
