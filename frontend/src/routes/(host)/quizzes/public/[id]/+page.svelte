<script lang="ts">
  import { CheckCircle, Copy, Play, User } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { hostSession } from "$lib/stores/host-session.store";
  import { auth } from "$lib/stores/auth.store";
  import { toast } from "$lib/stores/toast.store";
  import { usePublicQuiz } from "$lib/api/quizzes/quizzes.queries";
  import { useSaveQuiz } from "$lib/api/quizzes/quizzes.mutations";
  import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
  import PageSpinner from "$lib/components/ui/PageSpinner.svelte";

  let quizId = $page.params.id;
  const quizQuery = usePublicQuiz(quizId ?? "");

  let quiz = $derived(quizQuery.data);
  let isLoading = $derived(quizQuery.isLoading);
  let quizError = $derived<string | null>(
    quizQuery.error ? "Quiz não encontrado ou não está mais público" : null,
  );
  // Seu próprio quiz não precisa de cópia — o botão Copiar só aparece para os outros
  let isMine = $derived(Boolean(quiz && $auth && quiz.authorId === $auth.id));

  const LETTERS = ["A", "B", "C", "D", "E", "F"];

  let isCreating = $state(get(hostSession.creatingSession));

  onMount(() => {
    const unsubs = [
      hostSession.error.subscribe((v) => {
        if (v) toast.error(v);
      }),
      hostSession.creatingSession.subscribe((v) => (isCreating = v)),
    ];
    return () => unsubs.forEach((fn) => fn());
  });

  // Aplicar = iniciar sessão com o quiz público (não vira seu quiz)
  function handleApply() {
    if (!quiz || isCreating) return;
    hostSession.clearError();
    hostSession.connect();
    hostSession.createSession(quiz.id);
  }

  // Copiar = criar clone próprio (ids zerados → upsert cria tudo novo)
  const saveQuiz = useSaveQuiz();
  let isCopying = $state(false);

  async function handleCopyToMine() {
    if (!quiz || isCopying) return;
    isCopying = true;
    try {
      const saved = await saveQuiz.mutateAsync({
        id: "",
        title: `${quiz.title} (cópia)`,
        description: quiz.description,
        isPublished: false,
        isPublic: false,
        createdAt: quiz.createdAt,
        questions: quiz.questions.map((q) => ({
          ...q,
          id: "",
          alternatives: q.alternatives.map((a) => ({ ...a, id: "" })),
        })),
      });
      toast.success("Quiz copiado para seus quizzes");
      goto(resolve(`/quiz/${saved.id}/edit`));
    } catch {
      toast.error("Não foi possível copiar o quiz. Tente novamente");
      isCopying = false;
    }
  }

  $effect(() => {
    const id = $hostSession.sessionId;
    const p = $hostSession.phase;
    if (id && p !== "ended" && p !== "idle") goto(resolve(`/session/${id}/host`));
  });
</script>

<div class="px-4 sm:px-8 py-8 sm:py-10 max-w-3xl">
  <!-- Trilha: Quizzes Públicos > Quiz -->
  <Breadcrumb
    items={[
      { label: "Quizzes Públicos", href: "/quizzes/public" },
      { label: quiz?.title ?? "Quiz" },
    ]}
  />

  {#if isLoading}
    <PageSpinner />
  {:else if quizError || !quiz}
    <div
      class="rounded-lg border border-tomato-200 bg-tomato-50 px-4 py-3 text-sm text-tomato-700 flex items-center justify-between"
    >
      <span>{quizError}</span>
      <button
        onclick={() => quizQuery.refetch()}
        class="ml-3 shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-tomato-300 font-semibold
          text-tomato-700 hover:bg-tomato-100 transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  {:else}
    <!-- Header -->
    <div class="bg-surface-raised rounded-organic border-2 border-ink shadow-lift p-6 mb-6">
      <h1 class="font-display text-3xl font-extrabold text-ink tracking-tight mb-2">
        {quiz.title}
      </h1>
      {#if quiz.description}
        <p class="text-base text-ink-soft mb-4">{quiz.description}</p>
      {/if}
      <div class="flex items-center gap-3 text-sm text-ink-faint flex-wrap">
        <span class="inline-flex items-center gap-1">
          <User class="w-4 h-4" />
          {quiz.authorName ?? ""}
        </span>
        <span>·</span>
        <span>
          {quiz.questions.length} pergunta{quiz.questions.length !== 1 ? "s" : ""}
        </span>
      </div>

      <button
        onclick={handleApply}
        disabled={isCreating}
        class="mt-5 w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-ink
          bg-primary text-white text-lg font-bold shadow-lift hover:bg-primary-hover active:bg-coral-800
          active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {#if isCreating}
          <div
            class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"
          ></div>
          Criando sessão...
        {:else}
          <Play class="w-5 h-5" />
          Aplicar este quiz
        {/if}
      </button>

      {#if !isMine}
        <button
          onclick={handleCopyToMine}
          disabled={isCopying}
          class="mt-3 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-ink
            bg-surface-raised text-ocean-800 text-base font-bold shadow-soft hover:bg-ocean-50
            active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          title="Cria uma cópia sua para editar e adaptar"
        >
          {#if isCopying}
            <div
              class="w-4 h-4 border-2 border-ocean-300 border-t-ocean-600 rounded-full animate-spin"
            ></div>
            Copiando...
          {:else}
            <Copy class="w-4 h-4" />
            Copiar para meus quizzes
          {/if}
        </button>
      {/if}
    </div>

    <!-- Questions -->
    <div class="space-y-4">
      {#each quiz.questions as question, qi (question.id)}
        <div class="bg-surface-raised rounded-2xl border-2 border-ink shadow-soft p-5">
          <p class="font-display text-lg font-bold text-ink mb-4">
            <span class="text-ink-faint">{qi + 1}.</span>
            {question.text}
          </p>

          <div class="space-y-2">
            {#each question.alternatives as alt, ai (alt.id)}
              <div
                class="flex items-center gap-3 px-4 py-3 rounded-xl border-2 shadow-soft
                {alt.isCorrect ? 'bg-leaf-50 border-leaf-500' : 'bg-surface border-sand-200'}"
              >
                <span
                  class="w-7 h-7 shrink-0 rounded-lg border-2 border-ink flex items-center justify-center
                  text-sm font-bold {alt.isCorrect
                    ? 'bg-leaf-600 text-white'
                    : 'bg-surface-raised text-ink-faint'}"
                >
                  {LETTERS[ai] ?? ai + 1}
                </span>
                <span
                  class="flex-1 text-base font-medium {alt.isCorrect
                    ? 'text-leaf-800'
                    : 'text-ink-soft'}"
                >
                  {alt.text}
                </span>
                {#if alt.isCorrect}
                  <span
                    class="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full border-2 border-ink
                    bg-leaf-600 text-white text-xs font-bold shadow-soft rotate-1"
                  >
                    <CheckCircle class="w-3.5 h-3.5" />
                    Correta
                  </span>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
