<script lang="ts">
  import { ArrowLeft, BarChart3 } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { page } from "$app/stores";
  import { resolve } from "$app/paths";
  import { report } from "$lib/stores/report.store";
  import { formatMs, statusLabel, formatDate, accuracyColor } from "$lib/api/reports/reports.utils";
  import type { QuizReportItem, SessionSummary } from "$lib/api/reports/reports.types";

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
    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  });
</script>

<div class="px-8 py-8 max-w-5xl">
  <!-- Back + title -->
  <a
    href={resolve(`/quiz/${quizId}/edit`)}
    class="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors mb-6"
  >
    <ArrowLeft class="w-4 h-4" />
    Voltar ao Editor
  </a>

  <h1 class="text-2xl font-bold text-slate-900 mb-2">Relatório do Quiz</h1>
  <p class="text-sm text-slate-500 mb-8">Métricas de desempenho e histórico de sessões</p>

  <!-- Loading -->
  {#if loading}
    <div class="flex items-center justify-center py-20">
      <div
        class="w-8 h-8 border-2 border-slate-200 border-t-cyan-500 rounded-full animate-spin"
      ></div>
      <span class="ml-3 text-sm text-slate-400">Carregando relatório...</span>
    </div>

    <!-- Error -->
  {:else if storeError}
    <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {storeError}
    </div>

    <!-- Empty -->
  {:else if reportItems.length === 0 && sessions.length === 0}
    <div class="text-center py-16">
      <div
        class="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center"
      >
        <BarChart3
          class="w-8 h-8 text-slate-300"
        />
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
                  <th
                    class="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide"
                    >Pergunta</th
                  >
                  <th
                    class="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-16"
                    >Acertos</th
                  >
                  <th
                    class="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-16"
                    >Total</th
                  >
                  <th
                    class="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-24"
                    >Taxa de Acerto</th
                  >
                  <th
                    class="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-24"
                    >Tempo Médio</th
                  >
                </tr>
              </thead>
              <tbody>
                {#each reportItems as item (item.questionId)}
                  <tr
                    class="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors"
                  >
                    <td class="px-5 py-3">
                      <span class="text-sm font-medium text-slate-700 line-clamp-2"
                        >{item.text}</span
                      >
                    </td>
                    <td class="px-5 py-3 text-right">
                      <span class="text-sm font-semibold text-emerald-600 tabular-nums"
                        >{item.correctCount}</span
                      >
                    </td>
                    <td class="px-5 py-3 text-right">
                      <span class="text-sm text-slate-500 tabular-nums">{item.totalAnswers}</span>
                    </td>
                    <td class="px-5 py-3 text-right">
                      <span
                        class="inline-flex items-center gap-1 text-sm font-semibold tabular-nums {accuracyColor(
                          item.accuracyRate,
                        )}"
                      >
                        {item.accuracyRate}%
                      </span>
                    </td>
                    <td class="px-5 py-3 text-right">
                      <span class="text-sm text-slate-500 tabular-nums"
                        >{formatMs(item.avgResponseMs)}</span
                      >
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
                  <th
                    class="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide"
                    >PIN</th
                  >
                  <th
                    class="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide"
                    >Status</th
                  >
                  <th
                    class="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-20"
                    >Jogadores</th
                  >
                  <th
                    class="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide"
                    >Vencedor</th
                  >
                  <th
                    class="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-20"
                    >Pontos</th
                  >
                  <th
                    class="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide"
                    >Início</th
                  >
                  <th
                    class="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide"
                    >Término</th
                  >
                </tr>
              </thead>
              <tbody>
                {#each sessions as s (s.id)}
                  <tr
                    class="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors"
                  >
                    <td class="px-5 py-3">
                      <span class="text-sm font-mono font-semibold text-slate-600 tracking-wide"
                        >{s.pin}</span
                      >
                    </td>
                    <td class="px-5 py-3">
                      <span
                        class="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold
                        {s.status === 'finished' ? 'bg-emerald-50 text-emerald-600' : ''}
                        {s.status === 'playing' ? 'bg-blue-50 text-blue-600' : ''}
                        {s.status === 'lobby' ? 'bg-amber-50 text-amber-600' : ''}"
                      >
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
                      <span class="text-sm text-slate-600 tabular-nums">{s.winnerScore ?? "—"}</span
                      >
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
