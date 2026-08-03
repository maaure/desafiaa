<script lang="ts">
  import { BarChart3 } from "@lucide/svelte";
  import { page } from "$app/stores";
  import QuizTabs from "$lib/components/ui/QuizTabs.svelte";
  import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
  import PageSpinner from "$lib/components/ui/PageSpinner.svelte";
  import { useQuiz } from "$lib/api/quizzes/quizzes.queries";
  import { useQuizReport, useQuizSessions } from "$lib/api/reports/reports.queries";
  import { formatMs, statusLabel, formatDate, accuracyColor } from "$lib/api/reports/reports.utils";
  import type { QuizReportItem, SessionSummary } from "$lib/api/reports/reports.types";

  let quizId = $page.params.id;

  // Título do quiz para a trilha — cache do editor, sem fetch extra quando veio dele
  const quizQuery = useQuiz(quizId ?? "");
  const reportQuery = useQuizReport(quizId ?? "");
  const sessionsQuery = useQuizSessions(quizId ?? "");

  let reportItems = $derived<QuizReportItem[]>(reportQuery.data ?? []);
  let sessions = $derived<SessionSummary[]>(sessionsQuery.data ?? []);
  let loading = $derived(reportQuery.isLoading || sessionsQuery.isLoading);
  let storeError = $derived<string | null>(
    (reportQuery.error ?? sessionsQuery.error)?.message ?? null,
  );
</script>

<div class="px-4 sm:px-8 py-8 sm:py-10 max-w-5xl">
  <!-- Trilha: Meus Quizzes > Quiz > Relatório (título leva ao editor) -->
  <Breadcrumb
    items={[
      { label: "Meus Quizzes", href: "/dashboard" },
      { label: quizQuery.data?.title ?? "Quiz", href: `/quiz/${quizId}/edit` },
      { label: "Relatório" },
    ]}
  />

  <!-- Tabs irmãs: Editar ⇄ Relatório -->
  <QuizTabs />

  <h1 class="font-display text-2xl font-extrabold text-ink tracking-tight mb-2">
    Relatório do Quiz
  </h1>
  <p class="text-sm text-ink-soft mb-8">Métricas de desempenho e histórico de sessões</p>

  <!-- Loading -->
  {#if loading}
    <PageSpinner label="Carregando relatório..." />

    <!-- Error -->
  {:else if storeError}
    <div
      class="rounded-lg border border-tomato-200 bg-tomato-50 px-4 py-3 text-sm text-tomato-700 flex items-center justify-between"
    >
      <span>{storeError}</span>
      <button
        onclick={() => {
          reportQuery.refetch();
          sessionsQuery.refetch();
        }}
        class="ml-3 shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-tomato-300 font-semibold
          text-tomato-700 hover:bg-tomato-100 transition-colors"
      >
        Tentar novamente
      </button>
    </div>

    <!-- Empty -->
  {:else if reportItems.length === 0 && sessions.length === 0}
    <div class="text-center py-16">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-sand-100 flex items-center justify-center">
        <BarChart3 class="w-8 h-8 text-ink-faint" />
      </div>
      <h3 class="text-base font-semibold text-ink mb-1">Nenhum dado disponível</h3>
      <p class="text-sm text-ink-faint">Realize uma sessão para gerar relatórios</p>
    </div>
  {:else}
    <!-- Per-question metrics -->
    {#if reportItems.length > 0}
      <section class="mb-10">
        <h2 class="text-lg font-semibold text-ink mb-4">Métricas por Pergunta</h2>
        <div class="bg-surface-raised rounded-2xl border-2 border-ink shadow-lift overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b-2 border-ink bg-sand-50/50">
                  <th
                    class="text-left px-5 py-3 text-xs font-semibold text-ink-faint uppercase tracking-wide"
                    >Pergunta</th
                  >
                  <th
                    class="text-right px-5 py-3 text-xs font-semibold text-ink-faint uppercase tracking-wide w-16"
                    >Acertos</th
                  >
                  <th
                    class="text-right px-5 py-3 text-xs font-semibold text-ink-faint uppercase tracking-wide w-16"
                    >Total</th
                  >
                  <th
                    class="text-right px-5 py-3 text-xs font-semibold text-ink-faint uppercase tracking-wide w-24"
                    >Taxa de Acerto</th
                  >
                  <th
                    class="text-right px-5 py-3 text-xs font-semibold text-ink-faint uppercase tracking-wide w-24"
                    >Tempo Médio</th
                  >
                </tr>
              </thead>
              <tbody>
                {#each reportItems as item (item.questionId)}
                  <tr
                    class="border-b border-sand-50 last:border-0 hover:bg-sand-50/50 transition-colors"
                  >
                    <td class="px-5 py-3">
                      <span class="text-sm font-medium text-ink-soft line-clamp-2">{item.text}</span
                      >
                    </td>
                    <td class="px-5 py-3 text-right">
                      <span class="text-sm font-semibold text-leaf-600 tabular-nums"
                        >{item.correctCount}</span
                      >
                    </td>
                    <td class="px-5 py-3 text-right">
                      <span class="text-sm text-ink-faint tabular-nums">{item.totalAnswers}</span>
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
                      <span class="text-sm text-ink-faint tabular-nums"
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
        <h2 class="text-lg font-semibold text-ink mb-4">Histórico de Sessões</h2>
        <div class="bg-surface-raised rounded-2xl border-2 border-ink shadow-lift overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b-2 border-ink bg-sand-50/50">
                  <th
                    class="text-left px-5 py-3 text-xs font-semibold text-ink-faint uppercase tracking-wide"
                    >PIN</th
                  >
                  <th
                    class="text-left px-5 py-3 text-xs font-semibold text-ink-faint uppercase tracking-wide"
                    >Status</th
                  >
                  <th
                    class="text-right px-5 py-3 text-xs font-semibold text-ink-faint uppercase tracking-wide w-20"
                    >Jogadores</th
                  >
                  <th
                    class="text-left px-5 py-3 text-xs font-semibold text-ink-faint uppercase tracking-wide"
                    >Vencedor</th
                  >
                  <th
                    class="text-right px-5 py-3 text-xs font-semibold text-ink-faint uppercase tracking-wide w-20"
                    >Pontos</th
                  >
                  <th
                    class="text-left px-5 py-3 text-xs font-semibold text-ink-faint uppercase tracking-wide"
                    >Início</th
                  >
                  <th
                    class="text-left px-5 py-3 text-xs font-semibold text-ink-faint uppercase tracking-wide"
                    >Término</th
                  >
                </tr>
              </thead>
              <tbody>
                {#each sessions as s (s.id)}
                  <tr
                    class="border-b border-sand-50 last:border-0 hover:bg-sand-50/50 transition-colors"
                  >
                    <td class="px-5 py-3">
                      <span class="text-sm font-mono font-semibold text-ink-soft tracking-wide"
                        >{s.pin}</span
                      >
                    </td>
                    <td class="px-5 py-3">
                      <span
                        class="inline-flex px-2 py-0.5 rounded-full border-2 border-ink text-xs font-semibold shadow-soft
                        {s.status === 'finished' ? 'bg-leaf-50 text-leaf-700' : ''}
                        {s.status === 'playing' ? 'bg-ocean-50 text-ocean-700' : ''}
                        {s.status === 'lobby' ? 'bg-mango-50 text-mango-700' : ''}"
                      >
                        {statusLabel(s.status)}
                      </span>
                    </td>
                    <td class="px-5 py-3 text-right">
                      <span class="text-sm text-ink-soft tabular-nums">{s.playerCount}</span>
                    </td>
                    <td class="px-5 py-3">
                      <span class="text-sm font-medium text-ink">{s.winner ?? "—"}</span>
                    </td>
                    <td class="px-5 py-3 text-right">
                      <span class="text-sm text-ink-soft tabular-nums">{s.winnerScore ?? "—"}</span>
                    </td>
                    <td class="px-5 py-3">
                      <span class="text-xs text-ink-faint">{formatDate(s.startedAt)}</span>
                    </td>
                    <td class="px-5 py-3">
                      <span class="text-xs text-ink-faint">{formatDate(s.finishedAt)}</span>
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
