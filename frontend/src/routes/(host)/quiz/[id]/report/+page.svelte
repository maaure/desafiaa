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
    const unsub1 = report.quizReport.subscribe((v) => (reportItems = v));
    const unsub2 = report.sessions.subscribe((v) => (sessions = v));
    const unsub3 = report.loading.subscribe((v) => (loading = v));
    const unsub4 = report.error.subscribe((v) => (storeError = v));
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

  function formatDate(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("pt-BR");
  }

  function accuracyColor(rate: number): string {
    if (rate >= 80) return "text-emerald-600";
    if (rate >= 50) return "text-amber-600";
    return "text-red-500";
  }
</script>

<div class="px-8 py-8 max-w-5xl">
  <!-- Back + title -->
  <a href="/quiz/{quizId}/edit" class="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors mb-6">
    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
    Voltar ao Editor
  </a>

  <h1 class="text-2xl font-bold text-slate-900 mb-2">Relatório do Quiz</h1>
  <p class="text-sm text-slate-500 mb-8">Métricas de desempenho e histórico de sessões</p>

  <!-- Loading -->
  {#if loading}
    <div class="flex items-center justify-center py-20">
      <div class="w-8 h-8 border-2 border-slate-200 border-t-cyan-500 rounded-full animate-spin"></div>
      <span class="ml-3 text-sm text-slate-400">Carregando relatório...</span>
    </div>

  <!-- Error -->
  {:else if storeError}
    <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{storeError}</div>

  <!-- Empty -->
  {:else if reportItems.length === 0 && sessions.length === 0}
    <div class="text-center py-16">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
        <svg class="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      </div>
      <h3 class="text-base font-semibold text-slate-700 mb-1">Nenhum dado disponível</h3>
      <p class="text-sm text-slate-400">Realize uma sessão para gerar relatórios</p>
    </div>

  {:else}
    <!-- Per-question metrics -->
    {#if reportItems.length > 0}
      <section class="mb-10">
        <h2 class="text-lg font-semibold text-slate-800 mb-4">Métricas por Pergunta</h2>
        <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-slate-100 bg-slate-50/50">
                  <th class="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Pergunta</th>
                  <th class="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-16">Acertos</th>
                  <th class="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-16">Total</th>
                  <th class="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-24">Taxa de Acerto</th>
                  <th class="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-24">Tempo Médio</th>
                </tr>
              </thead>
              <tbody>
                {#each reportItems as item (item.questionId)}
                  <tr class="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td class="px-5 py-3">
                      <span class="text-sm font-medium text-slate-700 line-clamp-2">{item.text}</span>
                    </td>
                    <td class="px-5 py-3 text-right">
                      <span class="text-sm font-semibold text-emerald-600 tabular-nums">{item.correctCount}</span>
                    </td>
                    <td class="px-5 py-3 text-right">
                      <span class="text-sm text-slate-500 tabular-nums">{item.totalAnswers}</span>
                    </td>
                    <td class="px-5 py-3 text-right">
                      <span class="inline-flex items-center gap-1 text-sm font-semibold tabular-nums {accuracyColor(item.accuracyRate)}">
                        {item.accuracyRate}%
                      </span>
                    </td>
                    <td class="px-5 py-3 text-right">
                      <span class="text-sm text-slate-500 tabular-nums">{formatMs(item.avgResponseMs)}</span>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    {/if}

    <!-- Session history -->
    {#if sessions.length > 0}
      <section>
        <h2 class="text-lg font-semibold text-slate-800 mb-4">Histórico de Sessões</h2>
        <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-slate-100 bg-slate-50/50">
                  <th class="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">PIN</th>
                  <th class="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                  <th class="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-20">Jogadores</th>
                  <th class="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Vencedor</th>
                  <th class="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-20">Pontos</th>
                  <th class="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Início</th>
                  <th class="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Término</th>
                </tr>
              </thead>
              <tbody>
                {#each sessions as s (s.id)}
                  <tr class="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td class="px-5 py-3">
                      <span class="text-sm font-mono font-semibold text-slate-600 tracking-wide">{s.pin}</span>
                    </td>
                    <td class="px-5 py-3">
                      <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold
                        {s.status === 'finished' ? 'bg-emerald-50 text-emerald-600' : ''}
                        {s.status === 'playing' ? 'bg-blue-50 text-blue-600' : ''}
                        {s.status === 'lobby' ? 'bg-amber-50 text-amber-600' : ''}">
                        {statusLabel(s.status)}
                      </span>
                    </td>
                    <td class="px-5 py-3 text-right">
                      <span class="text-sm text-slate-600 tabular-nums">{s.playerCount}</span>
                    </td>
                    <td class="px-5 py-3">
                      <span class="text-sm font-medium text-slate-700">{s.winner ?? "—"}</span>
                    </td>
                    <td class="px-5 py-3 text-right">
                      <span class="text-sm text-slate-600 tabular-nums">{s.winnerScore ?? "—"}</span>
                    </td>
                    <td class="px-5 py-3">
                      <span class="text-xs text-slate-500">{formatDate(s.startedAt)}</span>
                    </td>
                    <td class="px-5 py-3">
                      <span class="text-xs text-slate-500">{formatDate(s.finishedAt)}</span>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    {/if}
  {/if}
</div>
