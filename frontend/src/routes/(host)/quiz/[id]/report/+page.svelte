<script lang="ts">
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { page } from "$app/stores";
  import { report } from "$lib/stores/report.store";
  import type { QuizReportItem, SessionSummary } from "$lib/types/report";

  let quizId = $page.params.id;

  let reportItems = $state<QuizReportItem[]>(get(report.quizReport));
  let sessions = $state<SessionSummary[]>(get(report.sessions));
  let loading = $state(get(report.loading));
  let storeError = $state<string | null>(get(report.error));

  onMount(() => {
    if (quizId) {
      report.loadQuizReport(quizId);
    }
    const unsub1 = report.quizReport.subscribe((v) => reportItems = v);
    const unsub2 = report.sessions.subscribe((v) => sessions = v);
    const unsub3 = report.loading.subscribe((v) => loading = v);
    const unsub4 = report.error.subscribe((v) => storeError = v);
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  });

  function formatMs(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  function statusLabel(status: string): string {
    switch (status) {
      case "lobby": return "Aguardando";
      case "playing": return "Em andamento";
      case "finished": return "Finalizada";
      default: return status;
    }
  }

  function statusClass(status: string): string {
    switch (status) {
      case "lobby": return "badge-lobby";
      case "playing": return "badge-playing";
      case "finished": return "badge-finished";
      default: return "";
    }
  }

  function formatDate(iso: string | null): string {
    if (!iso) return "-";
    return new Date(iso).toLocaleString("pt-BR");
  }
</script>

<div class="page">
  <a href="/quiz/{quizId}" class="back-link">&larr; Voltar ao Quiz</a>

  <h1>Relatório do Quiz</h1>

  {#if loading}
    <p class="status">Carregando relatório...</p>
  {:else if storeError}
    <p class="status error">{storeError}</p>
  {:else if reportItems.length === 0 && sessions.length === 0}
    <p class="status">Nenhum dado disponível. Realize uma sessão para gerar relatórios.</p>
  {:else}
    {#if reportItems.length > 0}
      <section>
        <h2>Métricas por Pergunta</h2>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Pergunta</th>
                <th class="num">Acertos</th>
                <th class="num">Total</th>
                <th class="num">Taxa de Acerto</th>
                <th class="num">Tempo Médio</th>
              </tr>
            </thead>
            <tbody>
              {#each reportItems as item (item.questionId)}
                <tr>
                  <td>{item.text}</td>
                  <td class="num">{item.correctCount}</td>
                  <td class="num">{item.totalAnswers}</td>
                  <td class="num">{item.accuracyRate}%</td>
                  <td class="num">{formatMs(item.avgResponseMs)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    {/if}

    {#if sessions.length > 0}
      <section>
        <h2>Histórico de Sessões</h2>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>PIN</th>
                <th>Status</th>
                <th class="num">Jogadores</th>
                <th>Vencedor</th>
                <th class="num">Pontuação</th>
                <th>Início</th>
                <th>Término</th>
              </tr>
            </thead>
            <tbody>
              {#each sessions as s (s.id)}
                <tr>
                  <td class="pin">{s.pin}</td>
                  <td><span class="badge {statusClass(s.status)}">{statusLabel(s.status)}</span></td>
                  <td class="num">{s.playerCount}</td>
                  <td>{s.winner ?? "-"}</td>
                  <td class="num">{s.winnerScore ?? "-"}</td>
                  <td>{formatDate(s.startedAt)}</td>
                  <td>{formatDate(s.finishedAt)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    {/if}
  {/if}
</div>

<style>
  .page {
    max-width: 960px;
    margin: 0 auto;
    padding: 1.5rem;
  }

  .back-link {
    display: inline-block;
    margin-bottom: 1rem;
    color: #555;
    text-decoration: none;
  }

  .back-link:hover {
    text-decoration: underline;
  }

  h1 {
    margin: 0 0 0.25rem;
    font-size: 1.5rem;
  }

  h2 {
    margin: 1.5rem 0 0.75rem;
    font-size: 1.15rem;
  }

  .table-wrapper {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  th, td {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid #eee;
    text-align: left;
  }

  th {
    background: #fafafa;
    font-weight: 600;
    color: #444;
    white-space: nowrap;
  }

  th.num, td.num {
    text-align: right;
    white-space: nowrap;
  }

  .pin {
    font-family: monospace;
    font-size: 1rem;
  }

  .badge {
    display: inline-block;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .badge-lobby {
    background: #fff3cd;
    color: #856404;
  }

  .badge-playing {
    background: #cce5ff;
    color: #004085;
  }

  .badge-finished {
    background: #d4edda;
    color: #155724;
  }

  .status {
    color: #666;
    padding: 2rem 0;
  }

  .status.error {
    color: #e74c3c;
  }
</style>
