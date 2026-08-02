<script lang="ts">
  import { ArrowLeft, CheckCircle, CircleHelp, Tag } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { quizEditor } from "$lib/stores/quiz-editor.store";
  import QuestionEditor from "$lib/components/quiz/QuestionEditor.svelte";
  import type { Quiz } from "$lib/api/quizzes/quizzes.types";

  let quizId = $page.params.id;
  let quiz = $state<Quiz | null>(get(quizEditor));
  let errors = $state<Record<string, string>>({});
  let isSaving = $state(false);
  let isLoading = $state(true);
  let saveSuccess = $state(false);

  onMount(() => {
    const unsub1 = quizEditor.subscribe((v) => (quiz = v));
    const unsub2 = quizEditor.errors.subscribe((v) => (errors = v));
    const unsub3 = quizEditor.isSaving.subscribe((v) => (isSaving = v));

    if (quizId === "new") {
      if (!get(quizEditor)) {
        goto(resolve("/quiz/new"));
        return;
      }
      isLoading = false;
    } else {
      quizEditor.load(quizId!).then(() => {
        isLoading = false;
      });
    }

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  });

  async function handleSave() {
    saveSuccess = false;
    const ok = await quizEditor.save();
    if (ok) {
      saveSuccess = true;
      if (quizId === "new") {
        const saved = get(quizEditor);
        if (saved && saved.id) {
          goto(resolve(`/quiz/${saved.id}/edit`));
        }
      }
    }
  }

  function handleAddQuestion(type: "multiple_choice" | "true_false") {
    quizEditor.addQuestion(type);
  }
</script>

<div class="px-4 sm:px-8 py-8 sm:py-10 max-w-4xl">
  <!-- Back -->
  <a
    href={resolve("/dashboard")}
    class="inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink-soft transition-colors mb-6"
  >
    <ArrowLeft class="w-4 h-4" />
    Dashboard
  </a>

  <!-- Loading -->
  {#if isLoading}
    <div class="flex items-center justify-center py-20">
      <div
        class="w-8 h-8 border-2 border-sand-200 border-t-ocean-500 rounded-full animate-spin"
      ></div>
      <span class="ml-3 text-sm text-ink-faint">Carregando...</span>
    </div>

    <!-- Not found -->
  {:else if !quiz}
    <div class="rounded-lg border border-tomato-200 bg-tomato-50 px-4 py-3 text-sm text-tomato-700">
      Questionário não encontrado
    </div>

    <!-- Editor -->
  {:else}
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="font-display text-2xl font-extrabold text-ink tracking-tight">
          Editar Questionário
        </h1>
        <p class="text-sm text-ink-soft mt-1">
          {quiz.questions.length} pergunta{quiz.questions.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>

    <!-- Metadata card -->
    <div class="bg-surface-raised rounded-2xl border-2 border-ink shadow-lift p-6 mb-6">
      <div class="grid gap-5">
        <div>
          <label for="title" class="block text-sm font-semibold text-ink-soft mb-1.5">Título</label>
          <input
            id="title"
            type="text"
            value={quiz.title}
            oninput={(e) => quizEditor.updateTitle((e.target as HTMLInputElement).value)}
            placeholder="Título do quiz"
            class="w-full px-3.5 py-2.5 rounded-lg border-2 border-ink bg-surface-raised shadow-soft text-sm
              placeholder:text-ink-faint focus:border-ocean-500
              transition-colors outline-none"
          />
        </div>

        <div>
          <label for="desc" class="block text-sm font-semibold text-ink-soft mb-1.5">
            Descrição
            <span class="text-ink-faint font-normal">— opcional</span>
          </label>
          <textarea
            id="desc"
            value={quiz.description ?? ""}
            oninput={(e) => {
              const v = (e.target as HTMLTextAreaElement).value;
              quizEditor.updateDescription(v || null);
            }}
            placeholder="Descreva o objetivo ou tema do questionário"
            rows="2"
            class="w-full px-3.5 py-2.5 rounded-lg border-2 border-ink bg-surface-raised shadow-soft text-sm resize-y
              placeholder:text-ink-faint focus:border-ocean-500
              transition-colors outline-none"></textarea>
        </div>

        <!-- Publish toggle -->
        <div class="pt-3 border-t-2 border-ink">
          <button
            onclick={() => quizEditor.togglePublished()}
            class="inline-flex items-center gap-3 group"
            type="button"
          >
            <span class="relative inline-flex items-center cursor-pointer">
              <span
                class="block w-10 h-5.5 rounded-full border-2 border-ink transition-colors duration-200"
                class:bg-leaf-500={quiz.isPublished}
                class:bg-sand-300={!quiz.isPublished}
              >
                <span
                  class="absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white border border-ink shadow-soft transition-transform duration-200"
                  class:translate-x-[18px]={quiz.isPublished}
                  class:translate-x-0={!quiz.isPublished}
                ></span>
              </span>
            </span>
            <div class="text-left">
              <p class="text-sm font-semibold text-ink-soft">
                {quiz.isPublished ? "Publicado" : "Não publicado"}
              </p>
              <p class="text-xs text-ink-faint">
                {quiz.isPublished
                  ? "Jogadores podem participar de sessões deste quiz"
                  : "Apenas você pode ver. Ninguém consegue iniciar uma sessão."}
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Validation errors -->
    {#if Object.keys(errors).length > 0}
      <div class="rounded-lg border border-tomato-200 bg-tomato-50 px-4 py-3 mb-6">
        <p class="text-sm font-semibold text-tomato-700 mb-1">Corrija os seguintes erros:</p>
        <ul class="list-disc list-inside">
          {#each Object.entries(errors) as [key, msg] (key)}
            <li class="text-sm text-tomato-600">{msg}</li>
          {/each}
        </ul>
      </div>
    {/if}

    <!-- Save success -->
    {#if saveSuccess}
      <div
        class="rounded-lg border border-leaf-200 bg-leaf-50 px-4 py-3 mb-6 flex items-center gap-2 animate-fade-in"
      >
        <CheckCircle class="w-4 h-4 text-leaf-600 shrink-0" />
        <span class="text-sm font-medium text-leaf-700">Questionário salvo com sucesso</span>
      </div>
    {/if}

    <!-- Questions header -->
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-ink">
        Perguntas
        <span class="text-sm font-normal text-ink-faint ml-2">{quiz.questions.length}</span>
      </h2>
    </div>

    <!-- Empty questions -->
    {#if quiz.questions.length === 0}
      <div
        class="text-center py-12 bg-surface-raised rounded-2xl border-2 border-dashed border-ink/30 mb-6"
      >
        <div
          class="w-12 h-12 mx-auto mb-3 rounded-full bg-sand-100 flex items-center justify-center"
        >
          <CircleHelp class="w-6 h-6 text-ink-faint" />
        </div>
        <p class="text-sm font-medium text-ink-soft mb-1">Nenhuma pergunta ainda</p>
        <p class="text-xs text-ink-faint">Adicione perguntas usando os botões abaixo</p>
      </div>
    {:else}
      <!-- Questions list -->
      <div class="space-y-4 mb-6">
        {#each quiz.questions as question, i (question.id)}
          <QuestionEditor {question} index={i} />
        {/each}
      </div>
    {/if}

    <!-- Add question -->
    <div class="bg-surface-raised rounded-2xl border-2 border-ink shadow-lift p-5 mb-6">
      <p class="text-sm font-semibold text-ink-soft mb-3">Adicionar pergunta</p>
      <div class="flex items-center gap-2">
        <button
          onclick={() => handleAddQuestion("multiple_choice")}
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-ink
            text-sm font-medium text-ink-soft bg-surface-raised shadow-soft hover:bg-sand-50
            active:translate-y-[2px] active:shadow-none transition-all"
        >
          <Tag class="w-4 h-4 text-ink-faint" />
          Múltipla escolha
        </button>
        <button
          onclick={() => handleAddQuestion("true_false")}
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-ink
            text-sm font-medium text-ink-soft bg-surface-raised shadow-soft hover:bg-sand-50
            active:translate-y-[2px] active:shadow-none transition-all"
        >
          <CheckCircle class="w-4 h-4 text-ink-faint" />
          Verdadeiro ou Falso
        </button>
      </div>
    </div>

    <!-- Save -->
    <div class="flex items-center gap-3 pt-4 border-t-2 border-ink">
      <button
        onclick={handleSave}
        disabled={isSaving}
        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border-2 border-ink bg-success text-white text-sm font-semibold
          shadow-soft hover:bg-leaf-700 active:bg-leaf-800 active:translate-y-[2px] active:shadow-none
          disabled:opacity-40 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:shadow-soft
          transition-all"
      >
        {#if isSaving}
          <div
            class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
          ></div>
          Salvando...
        {:else}
          <CheckCircle class="w-4 h-4" />
          Salvar questionário
        {/if}
      </button>

      <a
        href={resolve("/dashboard")}
        class="text-sm text-ink-faint hover:text-ink-soft transition-colors"
      >
        Voltar ao Dashboard
      </a>
    </div>
  {/if}
</div>
