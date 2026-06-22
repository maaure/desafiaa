<script lang="ts">
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { goto } from "$app/navigation";
  import { hostSession } from "$lib/stores/host-session.store";
  import { quizEditor } from "$lib/stores/quiz-editor.store";
  import type { QuizListItem } from "$lib/types/quiz";

  let quizzes = $state<QuizListItem[]>(get(quizEditor.quizList));
  let isLoading = $state(get(quizEditor.isLoadingList));
  let listError = $state<string | null>(get(quizEditor.listError));
  let sessionError = $state<string | null>(null);

  onMount(() => {
    quizEditor.loadList();
    const unsub1 = quizEditor.quizList.subscribe((v) => quizzes = v);
    const unsub2 = quizEditor.isLoadingList.subscribe((v) => isLoading = v);
    const unsub3 = quizEditor.listError.subscribe((v) => listError = v);
    const unsub4 = hostSession.error.subscribe((v) => sessionError = v);
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  });

  $effect(() => {
    const id = $hostSession.sessionId;
    if (id) goto(`/session/${id}/host`);
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
      <p class="text-sm text-slate-500 mt-1">Gerencie seus questionários e inicie sessões ao vivo</p>
    </div>
    <a
      href="/quiz/new"
      class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-600 text-white text-sm font-semibold
        hover:bg-cyan-700 active:bg-cyan-800 transition-colors shadow-sm"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
      Novo Quiz
    </a>
  </div>

  <!-- Loading -->
  {#if isLoading}
    <div class="flex items-center justify-center py-20">
      <div class="w-8 h-8 border-2 border-slate-200 border-t-cyan-500 rounded-full animate-spin"></div>
      <span class="ml-3 text-sm text-slate-400">Carregando...</span>
    </div>

  <!-- Error -->
  {:else if listError}
    <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {listError}
    </div>

  {:else if sessionError}
    <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
      <span>{sessionError}</span>
      <button onclick={() => hostSession.clearError()} class="text-red-400 hover:text-red-600 ml-3" title="Fechar">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

  <!-- Empty -->
  {:else if quizzes.length === 0}
    <div class="text-center py-16">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
        <svg class="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
        </svg>
      </div>
      <h3 class="text-base font-semibold text-slate-700 mb-1">Nenhum quiz ainda</h3>
      <p class="text-sm text-slate-400 mb-6">Crie seu primeiro questionário para começar</p>
      <a
        href="/quiz/new"
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-600 text-white text-sm font-semibold
          hover:bg-cyan-700 transition-colors shadow-sm"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Criar Quiz
      </a>
    </div>

  <!-- Quiz Grid -->
  {:else}
    <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))">
      {#each quizzes as quiz (quiz.id)}
        <div class="group bg-white rounded-xl border border-slate-200 hover:border-cyan-200 hover:shadow-md
          transition-all duration-200 flex flex-col">
          <!-- Card content -->
          <div class="p-5 flex-1">
            <div class="flex items-start justify-between gap-3 mb-3">
              <h2 class="text-base font-semibold text-slate-900 leading-snug">{quiz.title}</h2>
              <span class="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100
                text-xs font-medium text-slate-500">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {quiz.questionCount}
              </span>
            </div>

            {#if quiz.description}
              <p class="text-sm text-slate-500 leading-relaxed line-clamp-2">{quiz.description}</p>
            {:else}
              <p class="text-sm text-slate-300 italic">Sem descrição</p>
            {/if}
          </div>

          <!-- Card actions -->
          <div class="px-5 py-3 border-t border-slate-100 flex items-center gap-2">
            <a
              href="/quiz/{quiz.id}/edit"
              class="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              Editar
            </a>
            {#if quiz.isPublished}
              <button
                onclick={() => handleStartSession(quiz.id)}
                class="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                  text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 transition-colors shadow-sm"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
                Iniciar
              </button>
            {:else}
              <span
                class="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                  text-xs font-medium text-slate-400 bg-slate-50 cursor-not-allowed select-none"
                title="Publique o quiz antes de iniciar uma sessão"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Não publicado
              </span>
            {/if}
            <button
              onclick={() => handleDelete(quiz.id)}
              class="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg
                text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Excluir quiz"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
