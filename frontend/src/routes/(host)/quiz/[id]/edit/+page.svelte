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

<div class="px-8 py-8 max-w-3xl">
  <!-- Back -->
  <a
    href={resolve("/dashboard")}
    class="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors mb-6"
  >
    <ArrowLeft class="w-4 h-4" />
    Dashboard
  </a>

  <!-- Loading -->
  {#if isLoading}
    <div class="flex items-center justify-center py-20">
      <div
        class="w-8 h-8 border-2 border-slate-200 border-t-cyan-500 rounded-full animate-spin"
      ></div>
      <span class="ml-3 text-sm text-slate-400">Carregando...</span>
    </div>

    <!-- Not found -->
  {:else if !quiz}
    <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      Questionário não encontrado
    </div>

    <!-- Editor -->
  {:else}
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Editar Questionário</h1>
        <p class="text-sm text-slate-500 mt-1">
          {quiz.questions.length} pergunta{quiz.questions.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>

    <!-- Metadata card -->
    <div class="bg-white rounded-xl border border-slate-200 p-6 mb-6">
      <div class="grid gap-5">
        <div>
          <label for="title" class="block text-sm font-semibold text-slate-700 mb-1.5">Título</label
          >
          <input
            id="title"
            type="text"
            value={quiz.title}
            oninput={(e) => quizEditor.updateTitle((e.target as HTMLInputElement).value)}
            placeholder="Título do quiz"
            class="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm
              placeholder:text-slate-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100
              transition-colors outline-none"
          />
        </div>

        <div>
          <label for="desc" class="block text-sm font-semibold text-slate-700 mb-1.5">
            Descrição
            <span class="text-slate-300 font-normal">— opcional</span>
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
            class="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm resize-y
              placeholder:text-slate-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100
              transition-colors outline-none"></textarea>
        </div>

        <!-- Publish toggle -->
        <div class="pt-3 border-t border-slate-100">
          <button
            onclick={() => quizEditor.togglePublished()}
            class="inline-flex items-center gap-3 group"
            type="button"
          >
            <span class="relative inline-flex items-center cursor-pointer">
              <span
                class="block w-10 h-5.5 rounded-full transition-colors duration-200"
                class:bg-emerald-500={quiz.isPublished}
                class:bg-slate-300={!quiz.isPublished}
              >
                <span
                  class="absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform duration-200"
                  class:translate-x-[18px]={quiz.isPublished}
                  class:translate-x-0={!quiz.isPublished}
                ></span>
              </span>
            </span>
            <div class="text-left">
              <p class="text-sm font-semibold text-slate-700">
                {quiz.isPublished ? "Publicado" : "Não publicado"}
              </p>
              <p class="text-xs text-slate-400">
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
      <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 mb-6">
        <p class="text-sm font-semibold text-red-700 mb-1">Corrija os seguintes erros:</p>
        <ul class="list-disc list-inside">
          {#each Object.entries(errors) as [key, msg] (key)}
            <li class="text-sm text-red-600">{msg}</li>
          {/each}
        </ul>
      </div>
    {/if}

    <!-- Save success -->
    {#if saveSuccess}
      <div
        class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 mb-6 flex items-center gap-2 animate-fade-in"
      >
        <CheckCircle
          class="w-4 h-4 text-emerald-500 shrink-0"
        />
        <span class="text-sm font-medium text-emerald-700">Questionário salvo com sucesso</span>
      </div>
    {/if}

    <!-- Questions header -->
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-slate-800">
        Perguntas
        <span class="text-sm font-normal text-slate-400 ml-2">{quiz.questions.length}</span>
      </h2>
    </div>

    <!-- Empty questions -->
    {#if quiz.questions.length === 0}
      <div class="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200 mb-6">
        <div
          class="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center"
        >
          <CircleHelp
            class="w-6 h-6 text-slate-300"
          />
        </div>
        <p class="text-sm font-medium text-slate-500 mb-1">Nenhuma pergunta ainda</p>
        <p class="text-xs text-slate-400">Adicione perguntas usando os botões abaixo</p>
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
    <div class="bg-white rounded-xl border border-slate-200 p-5 mb-6">
      <p class="text-sm font-semibold text-slate-700 mb-3">Adicionar pergunta</p>
      <div class="flex items-center gap-2">
        <button
          onclick={() => handleAddQuestion("multiple_choice")}
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200
            text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 hover:border-cyan-300
            active:bg-slate-100 transition-colors"
        >
          <Tag
            class="w-4 h-4 text-slate-400"
          />
          Múltipla escolha
        </button>
        <button
          onclick={() => handleAddQuestion("true_false")}
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200
            text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 hover:border-cyan-300
            active:bg-slate-100 transition-colors"
        >
          <CheckCircle
            class="w-4 h-4 text-slate-400"
          />
          Verdadeiro ou Falso
        </button>
      </div>
    </div>

    <!-- Save -->
    <div class="flex items-center gap-3 pt-4 border-t border-slate-100">
      <button
        onclick={handleSave}
        disabled={isSaving}
        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold
          hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed
          transition-colors shadow-sm"
      >
        {#if isSaving}
          <div
            class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
          ></div>
          Salvando...
        {:else}
          <CheckCircle
            class="w-4 h-4"
          />
          Salvar questionário
        {/if}
      </button>

      <a
        href={resolve("/dashboard")}
        class="text-sm text-slate-400 hover:text-slate-600 transition-colors"
      >
        Voltar ao Dashboard
      </a>
    </div>
  {/if}
</div>
