<script lang="ts">
  import { ArrowLeft, CheckCircle, Play, User } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { hostSession } from "$lib/stores/host-session.store";
  import { toast } from "$lib/stores/toast.store";
  import { usePublicQuiz } from "$lib/api/quizzes/quizzes.queries";

  let quizId = $page.params.id;
  const quizQuery = usePublicQuiz(quizId ?? "");

  let quiz = $derived(quizQuery.data);
  let isLoading = $derived(quizQuery.isLoading);
  let quizError = $derived<string | null>(
    quizQuery.error ? "Quiz não encontrado ou não está mais público" : null,
  );

  const LETTERS = ["A", "B", "C", "D", "E", "F"];

  onMount(() => {
    return hostSession.error.subscribe((v) => {
      if (v) toast.error(v);
    });
  });

  // Aplicar = iniciar sessão com o quiz público (não vira seu quiz)
  function handleApply() {
    if (!quiz) return;
    hostSession.clearError();
    hostSession.connect();
    hostSession.createSession(quiz.id);
  }

  $effect(() => {
    const id = $hostSession.sessionId;
    const p = $hostSession.phase;
    if (id && p !== "ended" && p !== "idle") goto(resolve(`/session/${id}/host`));
  });
</script>

<div class="px-4 sm:px-8 py-8 sm:py-10 max-w-3xl">
  <!-- Back -->
  <a
    href={resolve("/quizzes/public")}
    class="inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink-soft transition-colors mb-6"
  >
    <ArrowLeft class="w-4 h-4" />
    Quizzes Públicos
  </a>

  {#if isLoading}
    <div class="flex items-center justify-center py-20">
      <div
        class="w-8 h-8 border-2 border-sand-200 border-t-ocean-500 rounded-full animate-spin"
      ></div>
      <span class="ml-3 text-sm text-ink-faint">Carregando...</span>
    </div>
  {:else if quizError || !quiz}
    <div class="rounded-lg border border-tomato-200 bg-tomato-50 px-4 py-3 text-sm text-tomato-700">
      {quizError}
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
        class="mt-5 w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-ink
          bg-primary text-white text-lg font-bold shadow-lift hover:bg-primary-hover active:bg-coral-800
          active:translate-y-[2px] active:shadow-none transition-all"
      >
        <Play class="w-5 h-5" />
        Aplicar este quiz
      </button>
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
