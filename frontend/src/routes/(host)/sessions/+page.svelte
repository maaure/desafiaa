<script lang="ts">
  import { Power, Radio, RefreshCw, X } from "@lucide/svelte";
  import { useQueryClient } from "@tanstack/svelte-query";
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { hostSession } from "$lib/stores/host-session.store";
  import { useActiveSessions, sessionKeys } from "$lib/api/sessions/sessions.queries";
  import type { ActiveSession } from "$lib/api/sessions/sessions.types";

  let sessionError = $state<string | null>(get(hostSession.error));

  const activeQuery = useActiveSessions();
  const queryClient = useQueryClient();

  let activeSessions = $derived<ActiveSession[]>(activeQuery.data ?? []);
  // isLoading só no primeiro carregamento — refetches atualizam a lista no lugar
  let activeLoading = $derived(activeQuery.isLoading);
  let activeRefreshing = $derived(activeQuery.isFetching);
  let activeError = $derived<string | null>(
    activeQuery.error ? "Não foi possível carregar as sessões ativas" : null,
  );

  onMount(() => {
    const unsub = hostSession.error.subscribe((v) => {
      sessionError = v;
      // Erro (ex.: abort falhou) → refetch devolve a verdade da listagem
      if (v) queryClient.invalidateQueries({ queryKey: sessionKeys.active });
    });
    return () => unsub();
  });

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: sessionKeys.active });
  }

  function handleReconnect(id: string) {
    hostSession.clearError();
    hostSession.rejoinSession(id);
  }

  // Dupla confirmação do encerramento (mesmo estilo da tela de jogo)
  let confirmAbortId = $state<string | null>(null);
  let abortTimer: ReturnType<typeof setTimeout> | null = null;

  function handleAbort(id: string) {
    if (confirmAbortId !== id) {
      confirmAbortId = id;
      if (abortTimer) clearTimeout(abortTimer);
      abortTimer = setTimeout(() => (confirmAbortId = null), 5000);
      return;
    }
    if (abortTimer) clearTimeout(abortTimer);
    confirmAbortId = null;
    // Otimista: tira da listagem na hora; o ack do servidor invalida o cache
    queryClient.setQueryData<ActiveSession[]>(
      sessionKeys.active,
      (old) => old?.filter((s) => s.id !== id) ?? [],
    );
    hostSession.abortSession(id);
  }

  function timeAgo(iso: string): string {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `há ${mins} min`;
    return `há ${Math.floor(mins / 60)}h`;
  }

  $effect(() => {
    const id = $hostSession.sessionId;
    const p = $hostSession.phase;
    if (id && p !== "ended" && p !== "idle") goto(resolve(`/session/${id}/host`));
  });
</script>

<div class="px-4 sm:px-8 py-8 sm:py-10 max-w-5xl">
  <!-- Page header -->
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="font-display text-3xl font-extrabold text-ink tracking-tight">Sessões ativas</h1>
      <p class="text-base text-ink-soft mt-2">
        Retome sessões que você abriu e ainda estão em andamento
      </p>
    </div>
    <button
      onclick={handleRefresh}
      disabled={activeRefreshing}
      class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-ink bg-surface-raised text-base font-semibold text-ink-soft shadow-soft
        hover:bg-sand-50 active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-40"
      title="Atualizar lista"
    >
      <RefreshCw class="w-4 h-4 {activeRefreshing ? 'animate-spin' : ''}" />
      Atualizar
    </button>
  </div>

  <!-- Rejoin errors -->
  {#if sessionError}
    <div
      class="rounded-lg border border-tomato-200 bg-tomato-50 px-4 py-3 text-sm text-tomato-700 flex items-center justify-between mb-6"
    >
      <span>{sessionError}</span>
      <button
        onclick={() => hostSession.clearError()}
        class="text-tomato-400 hover:text-tomato-600 ml-3"
        title="Fechar"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  {/if}

  {#if activeError}
    <div class="rounded-lg border border-tomato-200 bg-tomato-50 px-4 py-3 text-sm text-tomato-700">
      {activeError}
    </div>
  {:else if !activeLoading && activeSessions.length === 0}
    <div class="text-center py-16">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-sand-100 flex items-center justify-center">
        <Radio class="w-8 h-8 text-ink-faint" />
      </div>
      <h3 class="text-base font-semibold text-ink mb-1">Nenhuma sessão ativa</h3>
      <p class="text-sm text-ink-faint">Abra um quiz e inicie uma sessão para vê-la aqui</p>
    </div>
  {:else if !activeLoading}
    <div class="grid gap-3" style="grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))">
      {#each activeSessions as s (s.id)}
        <div
          class="bg-surface-raised rounded-2xl border-2 border-ink shadow-soft p-4 flex items-center gap-4"
        >
          <div class="flex-1 min-w-0">
            <p class="font-display text-base font-bold text-ink truncate">{s.quizTitle}</p>
            <div class="flex items-center gap-2 mt-1 flex-wrap">
              <span class="font-mono font-bold tracking-[0.2em] text-primary">{s.pin}</span>
              <span
                class="text-xs font-semibold px-2 py-0.5 rounded-full border-2 border-ink
                {s.status === 'playing'
                  ? 'bg-leaf-100 text-leaf-700'
                  : 'bg-mango-100 text-mango-700'}"
              >
                {s.status === "playing" ? "Em andamento" : "No lobby"}
              </span>
              {#if s.playerCount > 0}
                <span class="text-xs font-semibold text-ink-soft"
                  >{s.playerCount} jogador{s.playerCount !== 1 ? "es" : ""}</span
                >
              {/if}
              <span class="text-xs text-ink-faint">{timeAgo(s.createdAt)}</span>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button
              onclick={() => handleReconnect(s.id)}
              class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border-2 border-ink
                text-sm font-bold text-white bg-primary shadow-soft hover:bg-primary-hover active:bg-coral-800
                active:translate-y-[2px] active:shadow-none transition-all"
            >
              <RefreshCw class="w-4 h-4" />
              Reconectar
            </button>
            <button
              onclick={() => handleAbort(s.id)}
              class="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border-2 border-ink
                text-sm font-bold shadow-soft transition-all active:translate-y-[2px] active:shadow-none
                {confirmAbortId === s.id
                ? 'bg-tomato-600 text-white animate-pulse-soft'
                : 'text-danger bg-surface-raised hover:bg-tomato-50'}"
              title={confirmAbortId === s.id
                ? "Clique novamente para confirmar o encerramento"
                : "Encerrar sessão"}
            >
              <Power class="w-4 h-4" />
              {confirmAbortId === s.id ? "Confirmar encerrar?" : "Encerrar"}
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
