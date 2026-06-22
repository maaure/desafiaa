<script lang="ts">
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { hostSession, type HostPhase } from "$lib/stores/host-session.store";
  import type { LeaderboardEntry } from "$lib/types/session";

  const quizId = $page.params.id ?? "";

  // --- Reactive state from the store ---
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
    timeLimit: number;
    alternatives: { id: string; text: string; sortOrder: number }[];
  } | null>(get(hostSession.currentQuestionData));
  let timeLimitSeconds = $state(get(hostSession.timeLimitSeconds));
  let progress = $state<{ answered: number; total: number }>(get(hostSession.progress));
  let leaderboard = $state<LeaderboardEntry[]>(get(hostSession.leaderboard));
  let error = $state<string | null>(get(hostSession.error));

  // --- Local UI state ---
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

  function handleOpenRoom() {
    hostSession.startSession(selectedTimeLimit);
    sessionStarted = true;
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
    goto("/dashboard");
  }

  function handleDismissError() {
    hostSession.clearError();
  }
</script>

<div class="host-page">
  <header class="top-bar">
    <h1>Controle da Sessao</h1>
    <span class="conn-status" class:connected={isConnected}>
      {isConnected ? "Conectado" : "Desconectado"}
    </span>
  </header>

  {#if error}
    <div class="alert error" role="alert">
      <span>{error}</span>
      <button class="dismiss" onclick={handleDismissError}>x</button>
    </div>
  {/if}

  {#if phase === "idle"}
    <div class="centered">
      <p class="status-msg">Criando sessao...</p>
      <div class="spinner"></div>
    </div>

  {:else if phase === "lobby"}
    <div class="lobby">
      {#if pin}
        <div class="pin-section">
          <p class="pin-label">PIN da Sessao</p>
          <p class="pin-value">{pin}</p>
          <p class="pin-hint">Compartilhe este PIN com os participantes</p>
        </div>
      {/if}

      {#if !sessionStarted}
        <div class="timer-config">
          <p class="section-title">Tempo por pergunta</p>
          <div class="presets">
            {#each TIME_PRESETS as preset}
              <button
                class="preset-btn"
                class:active={selectedTimeLimit === preset.value}
                onclick={() => (selectedTimeLimit = preset.value)}
              >
                {preset.label}
              </button>
            {/each}
          </div>
          <button class="btn primary" onclick={handleOpenRoom}>
            Abrir Sala
          </button>
        </div>
      {:else}
        <div class="lobby-status">
          <p class="section-title">Sala aberta — aguardando jogadores</p>
          <p class="player-count">{playerCount} jogador(es)</p>

          {#if nicknames.length > 0}
            <ul class="nicknames">
              {#each nicknames as nick}
                <li>{nick}</li>
              {/each}
            </ul>
          {:else}
            <p class="status-msg">Nenhum jogador ainda...</p>
          {/if}

          {#if playerCount > 0}
            <button class="btn primary" onclick={handleNextQuestion}>
              Primeira Pergunta
            </button>
          {/if}
        </div>
      {/if}
    </div>

  {:else if phase === "playing"}
    <div class="playing">
      <div class="question-header">
        <p class="question-counter">
          Pergunta {currentQuestion?.index ?? "?"} de {currentQuestion?.total ?? "?"}
        </p>
        <p class="timer-display">{timeLimitSeconds}s</p>
      </div>

      {#if currentQuestionData}
        <div class="question-card">
          <p class="question-text">{currentQuestionData.text}</p>
          <div class="alternatives">
            {#each currentQuestionData.alternatives as alt, i}
              <div class="alternative">
                <span class="alt-letter">{String.fromCharCode(65 + i)}</span>
                <span class="alt-text">{alt.text}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <div class="progress-section">
        <p class="progress-text">
          {progress.answered} de {progress.total} responderam
        </p>
        <div class="progress-bar">
          <div
            class="progress-fill"
            style="width: {progress.total > 0
              ? (progress.answered / progress.total) * 100
              : 0}%"
          ></div>
        </div>
      </div>

      <div class="actions">
        <button class="btn primary" onclick={handleNextQuestion}>
          Proxima Pergunta
        </button>
        <button class="btn secondary" onclick={handleShowLeaderboard}>
          Mostrar Leaderboard
        </button>
      </div>
    </div>

  {:else if phase === "leaderboard"}
    <div class="leaderboard">
      <p class="section-title">Leaderboard</p>

      {#if leaderboard.length > 0}
        <table class="ranking-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Jogador</th>
              <th>Pontos</th>
              <th>Corretas</th>
            </tr>
          </thead>
          <tbody>
            {#each leaderboard as entry (entry.rank)}
              <tr class:highlight={entry.rank === 1}>
                <td class="rank">{entry.rank}</td>
                <td>{entry.nickname}</td>
                <td class="score">{entry.score}</td>
                <td>{entry.correctCount}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <p class="status-msg">Nenhum dado disponivel</p>
      {/if}

      <div class="actions">
        <button class="btn danger" onclick={handleEndSession}>
          Encerrar Sessao
        </button>
      </div>
    </div>

  {:else if phase === "ended"}
    <div class="ended">
      <p class="section-title">Sessao Encerrada</p>
      <p class="player-count">{playerCount} jogadores participantes</p>

      {#if leaderboard.length > 0}
        <table class="ranking-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Jogador</th>
              <th>Pontos</th>
              <th>Corretas</th>
            </tr>
          </thead>
          <tbody>
            {#each leaderboard as entry (entry.rank)}
              <tr class:highlight={entry.rank === 1}>
                <td class="rank">{entry.rank}</td>
                <td>{entry.nickname}</td>
                <td class="score">{entry.score}</td>
                <td>{entry.correctCount}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}

      <div class="actions">
        <button class="btn primary" onclick={handleBackToDashboard}>
          Voltar ao Dashboard
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .host-page {
    max-width: 640px;
    margin: 0 auto;
    padding: 1rem;
  }

  .top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
  }

  .top-bar h1 {
    margin: 0;
    font-size: 1.25rem;
  }

  .conn-status {
    font-size: 0.8rem;
    color: #e74c3c;
    padding: 0.2rem 0.5rem;
    border: 1px solid #e74c3c;
    border-radius: 4px;
  }

  .conn-status.connected {
    color: #27ae60;
    border-color: #27ae60;
  }

  /* ── Alerts ── */

  .alert {
    padding: 0.6rem 0.8rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.9rem;
  }

  .alert.error {
    background: #fdedec;
    border: 1px solid #e74c3c;
    color: #e74c3c;
  }

  .dismiss {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    padding: 0 0.25rem;
    color: inherit;
  }

  /* ── Centered (idle) ── */

  .centered {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #ddd;
    border-top-color: #3498db;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-top: 1rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* ── Lobby ── */

  .lobby {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .pin-section {
    text-align: center;
    padding: 1.5rem;
    background: #f0f8ff;
    border: 2px dashed #3498db;
    border-radius: 12px;
  }

  .pin-label {
    font-size: 0.85rem;
    color: #555;
    margin: 0 0 0.5rem;
  }

  .pin-value {
    font-size: 3rem;
    font-weight: 700;
    letter-spacing: 0.5rem;
    margin: 0;
    color: #2c3e50;
  }

  .pin-hint {
    font-size: 0.8rem;
    color: #888;
    margin: 0.5rem 0 0;
  }

  .section-title {
    font-weight: 600;
    margin: 0 0 0.75rem;
    font-size: 0.95rem;
  }

  .timer-config {
    text-align: center;
  }

  .presets {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    margin-bottom: 1rem;
  }

  .preset-btn {
    padding: 0.5rem 1rem;
    border: 1px solid #ccc;
    border-radius: 6px;
    background: #fff;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .preset-btn.active {
    border-color: #3498db;
    background: #ebf5fb;
    color: #3498db;
    font-weight: 600;
  }

  .lobby-status {
    text-align: center;
  }

  .player-count {
    font-size: 1.1rem;
    margin: 0.5rem 0;
    color: #555;
  }

  .nicknames {
    list-style: none;
    padding: 0;
    margin: 0.5rem 0 1.5rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
  }

  .nicknames li {
    background: #eaf2f8;
    padding: 0.3rem 0.7rem;
    border-radius: 20px;
    font-size: 0.85rem;
  }

  /* ── Playing ── */

  .playing {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .question-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .question-counter {
    font-size: 0.9rem;
    color: #555;
    margin: 0;
  }

  .timer-display {
    font-size: 1.5rem;
    font-weight: 700;
    color: #e67e22;
    margin: 0;
  }

  .question-card {
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 10px;
    padding: 1.25rem;
  }

  .question-text {
    font-size: 1.1rem;
    margin: 0 0 1rem;
    line-height: 1.5;
  }

  .alternatives {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .alternative {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.8rem;
    border: 1px solid #eee;
    border-radius: 6px;
    background: #fafafa;
  }

  .alt-letter {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #3498db;
    color: #fff;
    border-radius: 50%;
    font-weight: 700;
    font-size: 0.85rem;
    flex-shrink: 0;
  }

  .alt-text {
    font-size: 0.95rem;
  }

  .progress-section {
    text-align: center;
  }

  .progress-text {
    font-size: 0.85rem;
    color: #555;
    margin: 0 0 0.4rem;
  }

  .progress-bar {
    height: 8px;
    background: #eee;
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: #27ae60;
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  /* ── Leaderboard / Ended ── */

  .leaderboard,
  .ended {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .ranking-table {
    width: 100%;
    border-collapse: collapse;
  }

  .ranking-table th {
    text-align: left;
    padding: 0.5rem 0.75rem;
    border-bottom: 2px solid #ddd;
    font-size: 0.85rem;
    color: #555;
  }

  .ranking-table td {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid #eee;
    font-size: 0.9rem;
  }

  .ranking-table tr.highlight {
    background: #fef9e7;
  }

  .rank {
    font-weight: 700;
    color: #888;
  }

  .score {
    font-weight: 600;
    color: #2c3e50;
  }

  /* ── Shared ── */

  .status-msg {
    color: #888;
    font-size: 0.9rem;
    text-align: center;
  }

  .actions {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    flex-wrap: wrap;
    margin-top: 1rem;
  }

  .btn {
    padding: 0.6rem 1.2rem;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 0.95rem;
    cursor: pointer;
    background: #fff;
  }

  .btn.primary {
    background: #3498db;
    color: #fff;
    border-color: #3498db;
  }

  .btn.secondary {
    background: #fff;
    color: #3498db;
    border-color: #3498db;
  }

  .btn.danger {
    background: #e74c3c;
    color: #fff;
    border-color: #e74c3c;
  }
</style>
