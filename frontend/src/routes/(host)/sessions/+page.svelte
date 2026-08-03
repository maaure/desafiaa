<script lang="ts">
  import { ArrowLeft, Power, Radio, RefreshCw, X } from "@lucide/svelte";
  import { useQueryClient } from "@tanstack/svelte-query";
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { hostSession } from "$lib/stores/host-session.store";
  import { toast } from "$lib/stores/toast.store";
  import { useActiveSessions, sessionKeys } from "$lib/api/sessions/sessions.queries";
  import ConfirmDialog from "$lib/components/ui/ConfirmDialog.svelte";
  import type { ActiveSession } from "$lib/api/sessions/sessions.types";

  let sessionError = $state<string | null>(get(hostSession.error));
  // Evita goto duplicado (o $effect + auto-subscription dispara 2× e remonta a página,
  // fazendo o cleanup do host page resetar o store no meio da navegação)
  let navigatingToSession = false;

  const activeQuery = useActiveSessions();
  const queryClient = useQueryClient();

  let activeSessions = $derived<ActiveSession[]>(activeQuery.data ?? []);
  // isLoading só no primeiro carregamento — refetches atualizam a lista no lugar
  let activeLoading = $derived(activeQuery.isLoading);
  let activeRefreshing = $derived(activeQuery.isFetching);
  let activeError = $derived<string | null>(
    activeQuery.error ? "Não foi possível carregar as sessões ativas" : null,
  );

  // Confirmação de encerramento via ConfirmDialog (substitui o duplo-clique)
  let confirmAbort = $state<ActiveSession | null>(null);

  onMount(() => {
    // Navegação única para a tela do host quando o rejoin restaura a sessão
    const unsubNav = hostSession.subscribe((s) => {
      if (navigatingToSession) return;
      if (!s.sessionId || s.phase === "ended" || s.phase === "idle") return;
      navigatingToSession = true;
      goto(resolve(`/session/${s.sessionId}/host`)).catch(() => (navigatingToSession = false));
    });
    const unsubErr = hostSession.error.subscribe((v) => {
      sessionError = v;
      // Erro (ex.: abort falhou) → refetch devolve a verdade da listagem
      if (v) queryClient.invalidateQueries({ queryKey: sessionKeys.active });
    });
    return () => {
      unsubNav();
      unsubErr();
    };
  });

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: sessionKeys.active });
  }

  function handleReconnect(id: string) {
    hostSession.clearError();
    hostSession.rejoinSession(id);
  }

  // Encerramento pede confirmação explícita (ConfirmDialog)
  function handleConfirmAbort() {
    const s = confirmAbort;
    if (!s) return;
    confirmAbort = null;
    // Otimista: tira da listagem na hora; o ack do servidor invalida o cache
    queryClient.setQueryData<ActiveSession[]>(
      sessionKeys.active,
      (old) => old?.filter((x) => x.id !== s.id) ?? [],
    );
    hostSession.abortSession(s.id);
    toast.success("Sessão encerrada");
  }

  function timeAgo(iso: string): string {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `há ${mins} min`;
    return `há ${Math.floor(mins / 60)}h`;
  }
</script>

<div class="px-4 sm:px-8 py-8 sm:py-10 max-w-5xl">
  <!-- Back -->
  <a
    href={resolve("/dashboard")}
    class="inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink-soft transition-colors mb-6"
  >
    <ArrowLeft class="w-4 h-4" />
    Meus Quizzes
  </a>

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
    <div
      class="rounded-lg border border-tomato-200 bg-tomato-50 px-4 py-3 text-sm text-tomato-700 flex items-center justify-between"
    >
      <span>{activeError}</span>
      <button
        onclick={() => queryClient.invalidateQueries({ queryKey: sessionKeys.active })}
        class="ml-3 shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-tomato-300 font-semibold
          text-tomato-700 hover:bg-tomato-100 transition-colors"
      >
        Tentar novamente
      </button>
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
              onclick={() => (confirmAbort = s)}
              class="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border-2 border-ink
                text-sm font-bold shadow-soft transition-all active:translate-y-[2px] active:shadow-none
                text-danger bg-surface-raised hover:bg-tomato-50"
              title="Encerrar sessão"
            >
              <Power class="w-4 h-4" />
              Encerrar
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<ConfirmDialog
  open={confirmAbort !== null}
  title="Encerrar sessão?"
  message={confirmAbort
    ? `A sessão "${confirmAbort.quizTitle}" (PIN ${confirmAbort.pin}) será encerrada e os jogadores desconectados. Essa ação não pode ser desfeita.`
    : ""}
  confirmLabel="Encerrar sessão"
  cancelLabel="Cancelar"
  variant="danger"
  onconfirm={handleConfirmAbort}
  oncancel={() => (confirmAbort = null)}
/>
