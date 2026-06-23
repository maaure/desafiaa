<script lang="ts">
  import { Plus, Trash2, Image, X } from "@lucide/svelte";
  import { quizEditor } from "$lib/stores/quiz-editor.store";
  import AlternativeInput from "./AlternativeInput.svelte";
  import type { Question } from "$lib/api/quizzes/quizzes.types";

  let {
    question,
    index,
  }: {
    question: Question;
    index: number;
  } = $props();

  let uploading = $state(false);

  function handleTextInput(e: Event) {
    const value = (e.target as HTMLTextAreaElement).value;
    quizEditor.updateQuestionText(question.id, value);
  }

  function handleAddAlternative() {
    quizEditor.addAlternative(question.id);
  }

  function handleRemoveQuestion() {
    quizEditor.removeQuestion(question.id);
  }

  async function handleImageUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    uploading = true;
    try {
      await quizEditor.updateQuestionImage(question.id, file);
    } finally {
      uploading = false;
      input.value = "";
    }
  }

  function handleRemoveImage() {
    quizEditor.removeQuestionImage(question.id);
  }
</script>

<div class="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
  <!-- Header -->
  <div class="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
    <span
      class="flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-xs font-bold text-slate-500"
    >
      {index + 1}
    </span>
    <span class="text-xs font-semibold text-slate-700">
      {question.questionType === "true_false" ? "Verdadeiro ou Falso" : "Múltipla escolha"}
    </span>
    <span class="text-xs text-slate-400 ml-auto tabular-nums">{question.basePoints} pts</span>
  </div>

  <!-- Body -->
  <div class="p-5 space-y-4">
    <textarea
      value={question.text}
      oninput={handleTextInput}
      placeholder="Digite a pergunta..."
      rows="2"
      class="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm resize-y
        placeholder:text-slate-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100
        transition-colors outline-none"></textarea>

    <!-- Imagem da pergunta -->
    {#if question.imageUrl}
      <div class="relative inline-block">
        <img
          src={question.imageUrl}
          alt="Imagem da pergunta"
          class="max-h-48 rounded-lg border border-slate-200 object-contain"
        />
        <button
          onclick={handleRemoveImage}
          class="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center rounded-full
            bg-red-500 text-white hover:bg-red-600 transition-colors"
          title="Remover imagem"
        >
          <X class="w-3 h-3" />
        </button>
      </div>
    {:else}
      <label
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
          text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 border border-dashed border-slate-200
          hover:border-cyan-300 cursor-pointer transition-colors
          {uploading ? 'opacity-50 pointer-events-none' : ''}"
      >
        {#if uploading}
          <span class="w-3.5 h-3.5 border-2 border-slate-300 border-t-cyan-500 rounded-full animate-spin"></span>
          Enviando...
        {:else}
          <Image class="w-3.5 h-3.5" />
          Adicionar imagem
        {/if}
        <input type="file" accept="image/jpeg,image/png,image/webp" onchange={handleImageUpload} class="hidden" />
      </label>
    {/if}

    <!-- Alternatives -->
    <div>
      <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Alternativas</p>
      <div class="space-y-2">
        {#each question.alternatives as alt, i (alt.id)}
          <AlternativeInput {alt} questionId={question.id} letter={String.fromCharCode(65 + i)} />
        {/each}
      </div>

      {#if question.alternatives.length < 4 && question.questionType === "multiple_choice"}
        <button
          onclick={handleAddAlternative}
          class="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-cyan-600 hover:text-cyan-700 transition-colors"
        >
          <Plus class="w-3.5 h-3.5" />
          Adicionar alternativa
        </button>
      {/if}
    </div>
  </div>

  <!-- Footer -->
  <div class="px-5 py-3 border-t border-slate-100 flex justify-end">
    <button
      onclick={handleRemoveQuestion}
      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
        text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
    >
      <Trash2 class="w-3.5 h-3.5" />
      Remover pergunta
    </button>
  </div>
</div>
