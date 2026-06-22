<script lang="ts">
  import { quizEditor } from "$lib/stores/quiz-editor.store";
  import type { Alternative } from "$lib/types/quiz";

  let {
    alt,
    questionId,
    letter,
  }: {
    alt: Alternative;
    questionId: string;
    letter: string;
  } = $props();

  function handleTextInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    quizEditor.updateAlternativeText(questionId, alt.id, value);
  }

  function handleCorrect() {
    quizEditor.markCorrect(questionId, alt.id);
  }
</script>

<div
  class="flex items-center gap-3 p-3 rounded-lg border transition-colors
  {alt.isCorrect
    ? 'border-emerald-300 bg-emerald-50'
    : 'border-slate-200 bg-white hover:border-slate-300'}"
>
  <!-- Letter badge -->
  <span
    class="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0
    {alt.isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}"
  >
    {letter}
  </span>

  <!-- Text input -->
  <input
    type="text"
    value={alt.text}
    placeholder="Texto da alternativa"
    oninput={handleTextInput}
    class="flex-1 px-3 py-1.5 rounded-md border-0 bg-transparent text-sm
      placeholder:text-slate-300 focus:outline-none"
  />

  <!-- Correct toggle -->
  <label class="flex items-center gap-1.5 cursor-pointer shrink-0" title="Marcar como correta">
    <input
      type="radio"
      name={`correct_${questionId}`}
      checked={alt.isCorrect}
      onchange={handleCorrect}
      class="w-3.5 h-3.5 accent-emerald-500 cursor-pointer"
    />
    <span
      class="text-xs font-medium select-none
      {alt.isCorrect ? 'text-emerald-600' : 'text-slate-400'}"
    >
      Correta
    </span>
  </label>
</div>
