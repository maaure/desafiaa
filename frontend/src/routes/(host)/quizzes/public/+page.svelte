<script lang="ts">
  import { Globe, MessageCircleMore, Play, Search, User, X } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { hostSession } from "$lib/stores/host-session.store";
  import { toast } from "$lib/stores/toast.store";
  import { usePublicQuizzes } from "$lib/api/quizzes/quizzes.queries";
  import type { PublicQuizListItem } from "$lib/api/quizzes/quizzes.types";

  // Busca com debounce de 300ms — a query é por termo (cache do TanStack).
  // O termo é lido DENTRO da função de options do createQuery (reativo no runes mode).
  let searchInput = $state("");
  let search = $state("");

  $effect(() => {
    const value = searchInput;
    const timer = setTimeout(() => (search = value.trim()), 300);
    return () => clearTimeout(timer);
  });

  const publicQuery = usePublicQuizzes(() => search);

  let quizzes = $derived<PublicQuizListItem[]>(publicQuery.data?.data ?? []);
  let isLoading = $derived(publicQuery.isLoading);
  let isSearching = $derived(publicQuery.isFetching && !publicQuery.isLoading);
  let listError = $derived<string | null>(
    publicQuery.error ? "Não foi possível carregar os quizzes públicos" : null,
  );

  function timeAgo(iso: string): string {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `há ${mins} min`;
    return `há ${Math.floor(mins / 60)}h`;
  }

  onMount(() => {
    return hostSession.error.subscribe((v) => {
      if (v) toast.error(v);
    });
  });

  // Aplicar = iniciar sessão com o quiz público (não vira seu quiz)
  function handleApply(quizId: string) {
    hostSession.clearError();
    hostSession.connect();
    hostSession.createSession(quizId);
  }

  $effect(() => {
    const id = $hostSession.sessionId;
    const p = $hostSession.phase;
    if (id && p !== "ended" && p !== "idle") goto(resolve(`/session/${id}/host`));
  });
</script>

<div class="px-4 sm:px-8 py-8 sm:py-10 max-w-5xl">
  <!-- Page header -->
  <div class="mb-8">
    <h1 class="font-display text-3xl font-extrabold text-ink tracking-tight">Quizzes Públicos</h1>
    <p class="text-base text-ink-soft mt-2">
      Explore quizzes criados pela comunidade e use-os nas suas sessões
    </p>
  </div>

  <!-- Search bar -->
  <div class="relative max-w-xl mb-8">
    <Search
      class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-faint pointer-events-none"
    />
    <input
      type="search"
      bind:value={searchInput}
      placeholder="Buscar por título ou descrição..."
      class="w-full pl-12 pr-10 py-3.5 rounded-xl border-2 border-ink bg-surface-raised shadow-soft text-base
        placeholder:text-ink-faint focus:border-ocean-500 transition-colors outline-none"
    />
    {#if searchInput}
      <button
        onclick={() => (searchInput = "")}
        class="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-ink-faint hover:text-ink"
        aria-label="Limpar busca"
      >
        <X class="w-5 h-5" />
      </button>
    {/if}
  </div>

  {#if listError}
    <div class="rounded-lg border border-tomato-200 bg-tomato-50 px-4 py-3 text-sm text-tomato-700">
      {listError}
    </div>
  {:else if isLoading}
    <div class="flex items-center justify-center py-20">
      <div
        class="w-8 h-8 border-2 border-sand-200 border-t-ocean-500 rounded-full animate-spin"
      ></div>
      <span class="ml-3 text-sm text-ink-faint">Carregando...</span>
    </div>
  {:else if quizzes.length === 0}
    <div class="text-center py-16">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-sand-100 flex items-center justify-center">
        <Globe class="w-8 h-8 text-ink-faint" />
      </div>
      <h3 class="text-base font-semibold text-ink mb-1">
        {search ? "Nenhum quiz encontrado" : "Nenhum quiz público ainda"}
      </h3>
      <p class="text-sm text-ink-faint">
        {search
          ? "Tente outro termo na busca"
          : "Crie um quiz e torne-o público para aparecer aqui"}
      </p>
    </div>
  {:else}
    <!-- Buscando: aviso sutil no lugar do sumiço da lista -->
    {#if isSearching}
      <p class="text-xs text-ink-faint mb-4 italic">Buscando...</p>
    {/if}

    <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))">
      {#each quizzes as quiz (quiz.id)}
        <div
          class="bg-surface-raised rounded-organic border-2 border-ink shadow-soft hover:shadow-lift
            hover:-translate-y-1 transition-all duration-200 flex flex-col"
        >
          <div class="p-5 flex-1">
            <div class="flex items-start justify-between gap-3 mb-2">
              <h2 class="font-display text-base font-bold text-ink leading-snug">
                {quiz.title}
              </h2>
              <span
                class="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sand-100 border-2 border-ink
                  text-xs font-medium text-ink-soft rotate-1 shadow-soft"
              >
                <MessageCircleMore class="w-3 h-3" />
                {quiz.questionCount}
              </span>
            </div>

            {#if quiz.description}
              <p class="text-sm text-ink-soft leading-relaxed line-clamp-2">
                {quiz.description}
              </p>
            {:else}
              <p class="text-sm text-ink-faint italic">Sem descrição</p>
            {/if}
          </div>

          <div
            class="px-5 py-3 border-t-2 border-ink flex items-center gap-2 text-xs text-ink-faint"
          >
            <span class="inline-flex items-center gap-1">
              <User class="w-3.5 h-3.5" />
              {quiz.authorName}
            </span>
            <span class="ml-auto">{timeAgo(quiz.createdAt)}</span>
          </div>

          <div class="px-5 pb-4">
            <button
              onclick={() => handleApply(quiz.id)}
              class="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg border-2 border-ink
                text-sm font-bold text-white bg-primary shadow-soft hover:bg-primary-hover active:bg-coral-800
                active:translate-y-[2px] active:shadow-none transition-all"
              title="Iniciar uma sessão com este quiz"
            >
              <Play class="w-4 h-4" />
              Aplicar
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
