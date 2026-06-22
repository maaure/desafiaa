<script lang="ts">
  import { ClipboardList, Lock, MessageCircleMore, Pencil, Play, Plus, Trash2, X } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { hostSession } from "$lib/stores/host-session.store";
  import { quizEditor } from "$lib/stores/quiz-editor.store";
  import type { QuizListItem } from "$lib/types/quiz";

  let quizzes = $state<QuizListItem[]>(get(quizEditor.quizList));
  let isLoading = $state(get(quizEditor.isLoadingList));
  let listError = $state<string | null>(get(quizEditor.listError));
  let sessionError = $state<string | null>(null);

  onMount(() => {
    quizEditor.loadList();
    const unsub1 = quizEditor.quizList.subscribe((v) => (quizzes = v));
    const unsub2 = quizEditor.isLoadingList.subscribe((v) => (isLoading = v));
    const unsub3 = quizEditor.listError.subscribe((v) => (listError = v));
    const unsub4 = hostSession.error.subscribe((v) => (sessionError = v));
    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  });

  $effect(() => {
    const id = $hostSession.sessionId;
    const p = $hostSession.phase;
    if (id && p !== "ended" && p !== "idle") goto(resolve(`/session/${id}/host`));
  });

  function handleStartSession(id: string) {
    hostSession.clearError();
    hostSession.connect();
    hostSession.createSession(id);
  }

  function handleDelete(id: string) {
    if (confirm("Excluir este quiz permanentemente?")) {
      quizEditor.deleteQuiz(id);
    }
  }
</script>

<div class="px-8 py-8 max-w-5xl">
  <!-- Page header -->
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="text-2xl font-bold text-slate-900">Meus Quizzes</h1>
      <p class="text-sm text-slate-500 mt-1">
        Gerencie seus questionários e inicie sessões ao vivo
      </p>
    </div>
    <a
      href={resolve("/quiz/new")}
      class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-600 text-white text-sm font-semibold
        hover:bg-cyan-700 active:bg-cyan-800 transition-colors shadow-sm"
    >
      <Plus class="w-4 h-4" />
      Novo Quiz
    </a>
  </div>

  <!-- Loading -->
  {#if isLoading}
    <div class="flex items-center justify-center py-20">
      <div
        class="w-8 h-8 border-2 border-slate-200 border-t-cyan-500 rounded-full animate-spin"
      ></div>
      <span class="ml-3 text-sm text-slate-400">Carregando...</span>
    </div>

    <!-- Error -->
  {:else if listError}
    <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {listError}
    </div>
  {:else if sessionError}
    <div
      class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between"
    >
      <span>{sessionError}</span>
      <button
        onclick={() => hostSession.clearError()}
        class="text-red-400 hover:text-red-600 ml-3"
        title="Fechar"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Empty -->
  {:else if quizzes.length === 0}
    <div class="text-center py-16">
      <div
        class="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center"
      >
        <ClipboardList
          class="w-8 h-8 text-slate-300"
        />
      </div>
      <h3 class="text-base font-semibold text-slate-700 mb-1">Nenhum quiz ainda</h3>
      <p class="text-sm text-slate-400 mb-6">Crie seu primeiro questionário para começar</p>
      <a
        href={resolve("/quiz/new")}
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-600 text-white text-sm font-semibold
          hover:bg-cyan-700 transition-colors shadow-sm"
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
          class="group bg-white rounded-xl border border-slate-200 hover:border-cyan-200 hover:shadow-md
          transition-all duration-200 flex flex-col"
        >
          <!-- Card content -->
          <div class="p-5 flex-1">
            <div class="flex items-start justify-between gap-3 mb-3">
              <h2 class="text-base font-semibold text-slate-900 leading-snug">
                {quiz.title}
              </h2>
              <span
                class="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100
                text-xs font-medium text-slate-500"
              >
                <MessageCircleMore
                  class="w-3 h-3"
                />
                {quiz.questionCount}
              </span>
            </div>

            {#if quiz.description}
              <p class="text-sm text-slate-500 leading-relaxed line-clamp-2">
                {quiz.description}
              </p>
            {:else}
              <p class="text-sm text-slate-300 italic">Sem descrição</p>
            {/if}
          </div>

          <!-- Card actions -->
          <div class="px-5 py-3 border-t border-slate-100 flex items-center gap-2">
            <a
              href={resolve(`/quiz/${quiz.id}/edit`)}
              class="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <Pencil
                class="w-3.5 h-3.5"
              />
              Editar
            </a>
            {#if quiz.isPublished}
              <button
                onclick={() => handleStartSession(quiz.id)}
                class="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                  text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 transition-colors shadow-sm"
              >
                <Play
                  class="w-3.5 h-3.5"
                />
                Iniciar
              </button>
            {:else}
              <span
                class="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                  text-xs font-medium text-slate-400 bg-slate-50 cursor-not-allowed select-none"
                title="Publique o quiz antes de iniciar uma sessão"
              >
                <Lock
                  class="w-3.5 h-3.5"
                />
                Não publicado
              </span>
            {/if}
            <button
              onclick={() => handleDelete(quiz.id)}
              class="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg
                text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Excluir quiz"
            >
              <Trash2
                class="w-4 h-4"
              />
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
