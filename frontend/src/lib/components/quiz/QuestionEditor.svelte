<script lang="ts">
  import { quizEditor } from "$lib/stores/quiz-editor.store";
  import AlternativeInput from "./AlternativeInput.svelte";
  import type { Question } from "$lib/types/quiz";

  let {
    question,
    index,
  }: {
    question: Question;
    index: number;
  } = $props();

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
          <svg
            class="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
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
      <svg
        class="w-3.5 h-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="1.5"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
        />
      </svg>
      Remover pergunta
    </button>
  </div>
</div>
