<script lang="ts">
  import {
    ClipboardList,
    Lock,
    MessageCircleMore,
    Pencil,
    Play,
    Plus,
    Trash2,
    X,
  } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { hostSession } from "$lib/stores/host-session.store";
  import { toast } from "$lib/stores/toast.store";
  import { useQuizList } from "$lib/api/quizzes/quizzes.queries";
  import { useDeleteQuiz } from "$lib/api/quizzes/quizzes.mutations";
  import ConfirmDialog from "$lib/components/ui/ConfirmDialog.svelte";
  import PageSpinner from "$lib/components/ui/PageSpinner.svelte";
  import type { QuizListItem } from "$lib/api/quizzes/quizzes.types";

  let sessionError = $state<string | null>(null);

  const quizQuery = useQuizList();
  const deleteQuiz = useDeleteQuiz();

  let quizzes = $derived<QuizListItem[]>(quizQuery.data?.data ?? []);
  let isLoading = $derived(quizQuery.isLoading);
  let listError = $derived<string | null>(
    quizQuery.error ? "Não foi possível carregar os quizzes" : null,
  );

  // Confirmação de exclusão via ConfirmDialog (nada de confirm() nativo)
  let confirmDelete = $state<{ id: string; title: string } | null>(null);

  $effect(() => {
    if (deleteQuiz.isSuccess) toast.success("Quiz excluído");
    if (deleteQuiz.isError) toast.error("Não foi possível excluir o quiz — tente novamente");
  });

  let isCreating = $state(get(hostSession.creatingSession));

  onMount(() => {
    const unsubs = [
      hostSession.error.subscribe((v) => (sessionError = v)),
      hostSession.creatingSession.subscribe((v) => (isCreating = v)),
    ];
    return () => unsubs.forEach((fn) => fn());
  });

  $effect(() => {
    const id = $hostSession.sessionId;
    const p = $hostSession.phase;
    if (id && p !== "ended" && p !== "idle") goto(resolve(`/session/${id}/host`));
  });

  function handleStartSession(id: string) {
    if (isCreating) return;
    hostSession.clearError();
    hostSession.connect();
    hostSession.createSession(id);
  }

  function handleDelete(id: string, title: string) {
    confirmDelete = { id, title };
  }
</script>

<div class="px-4 sm:px-8 py-8 sm:py-10 max-w-5xl">
  <!-- Page header -->
  <div class="flex items-center justify-between mb-10">
    <div>
      <h1 class="font-display text-3xl font-extrabold text-ink tracking-tight">Meus Quizzes</h1>
      <p class="text-base text-ink-soft mt-2">
        Gerencie seus questionários e inicie sessões ao vivo
      </p>
    </div>
    <a
      href={resolve("/quiz/new")}
      class="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-white text-base font-bold
        border-2 border-ink shadow-soft hover:bg-primary-hover active:bg-coral-800
        active:translate-y-[2px] active:shadow-none transition-all"
    >
      <Plus class="w-5 h-5" />
      Novo Quiz
    </a>
  </div>

  <!-- Loading -->
  {#if isLoading}
    <PageSpinner />

    <!-- Error -->
  {:else if listError}
    <div
      class="rounded-lg border border-tomato-200 bg-tomato-50 px-4 py-3 text-sm text-tomato-700 flex items-center justify-between"
    >
      <span>{listError}</span>
      <button
        onclick={() => quizQuery.refetch()}
        class="ml-3 shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-tomato-300 font-semibold
          text-tomato-700 hover:bg-tomato-100 transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  {:else if sessionError}
    <div
      class="rounded-lg border border-tomato-200 bg-tomato-50 px-4 py-3 text-sm text-tomato-700 flex items-center justify-between"
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

    <!-- Empty -->
  {:else if quizzes.length === 0}
    <div class="text-center py-16">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-sand-100 flex items-center justify-center">
        <ClipboardList class="w-8 h-8 text-ink-faint" />
      </div>
      <h3 class="text-base font-semibold text-ink mb-1">Nenhum quiz ainda</h3>
      <p class="text-sm text-ink-faint mb-6">Crie seu primeiro questionário para começar</p>
      <a
        href={resolve("/quiz/new")}
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold
          border-2 border-ink shadow-soft hover:bg-primary-hover active:translate-y-[2px] active:shadow-none transition-all"
      >
        <Plus class="w-4 h-4" />
        Criar Quiz
      </a>
    </div>

    <!-- Quiz Grid -->
  {:else}
    <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))">
      {#each quizzes as quiz (quiz.id)}
        <div
          class="group bg-surface-raised rounded-organic border-2 border-ink shadow-soft hover:shadow-lift hover:-translate-y-1
          transition-all duration-200 flex flex-col"
        >
          <!-- Card content — clicável, leva ao editor (Fitts: área grande de alvo) -->
          <a href={resolve(`/quiz/${quiz.id}/edit`)} class="p-5 flex-1 block group/title">
            <div class="flex items-start justify-between gap-3 mb-3">
              <h2
                class="font-display text-base font-bold text-ink leading-snug group-hover/title:underline decoration-2 underline-offset-4"
              >
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
          </a>

          <!-- Card actions -->
          <div class="px-5 py-3 border-t-2 border-ink flex items-center gap-2">
            <a
              href={resolve(`/quiz/${quiz.id}/edit`)}
              class="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-2 border-ink
                text-xs font-semibold text-ocean-800 bg-ocean-50 shadow-soft hover:bg-ocean-100
                active:translate-y-[2px] active:shadow-none transition-all"
            >
              <Pencil class="w-3.5 h-3.5" />
              Editar
            </a>
            {#if quiz.isPublished}
              <button
                onclick={() => handleStartSession(quiz.id)}
                disabled={isCreating}
                class="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-2 border-ink
                  text-xs font-semibold text-white bg-primary shadow-soft hover:bg-primary-hover active:bg-coral-800
                  active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {#if isCreating}
                  <div
                    class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"
                  ></div>
                  Criando...
                {:else}
                  <Play class="w-3.5 h-3.5" />
                  Iniciar
                {/if}
              </button>
            {:else}
              <span
                class="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-2 border-ink
                  text-xs font-medium text-ink-faint bg-sand-100 cursor-not-allowed select-none"
                title="Publique o quiz antes de iniciar uma sessão"
              >
                <Lock class="w-3.5 h-3.5" />
                Não publicado
              </span>
            {/if}
            <button
              onclick={() => handleDelete(quiz.id, quiz.title)}
              class="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg border-2 border-ink bg-surface-raised
                text-ink-faint shadow-soft hover:text-danger hover:bg-tomato-50 active:translate-y-[2px] active:shadow-none transition-all"
              title="Excluir quiz"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<ConfirmDialog
  open={confirmDelete !== null}
  title="Excluir quiz?"
  message={confirmDelete
    ? `"${confirmDelete.title}" será excluído permanentemente. Essa ação não pode ser desfeita.`
    : ""}
  confirmLabel="Excluir"
  cancelLabel="Cancelar"
  variant="danger"
  onconfirm={() => {
    if (confirmDelete) deleteQuiz.mutate(confirmDelete.id);
    confirmDelete = null;
  }}
  oncancel={() => (confirmDelete = null)}
/>
