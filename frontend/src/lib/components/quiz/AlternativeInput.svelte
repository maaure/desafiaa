<script lang="ts">
  import { Image, X } from "@lucide/svelte";
  import { quizEditor } from "$lib/stores/quiz-editor.store";
  import { useUploadImage } from "$lib/api/quizzes/quizzes.mutations";
  import type { Alternative } from "$lib/api/quizzes/quizzes.types";

  let {
    alt,
    questionId,
    letter,
  }: {
    alt: Alternative;
    questionId: string;
    letter: string;
  } = $props();

  const uploadImage = useUploadImage();

  function handleTextInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    quizEditor.updateAlternativeText(questionId, alt.id, value);
  }

  function handleCorrect() {
    quizEditor.markCorrect(questionId, alt.id);
  }

  async function handleImageUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const { url } = await uploadImage.mutateAsync(file);
      quizEditor.updateAlternativeImageUrl(questionId, alt.id, url);
    } finally {
      input.value = "";
    }
  }

  function handleRemoveImage() {
    quizEditor.removeAlternativeImage(questionId, alt.id);
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

  <div class="flex-1 space-y-1.5">
    <!-- Text input -->
    <input
      type="text"
      value={alt.text}
      placeholder="Texto da alternativa"
      oninput={handleTextInput}
      class="w-full px-3 py-1.5 rounded-md border-0 bg-transparent text-sm
        placeholder:text-slate-300 focus:outline-none"
    />

    <!-- Imagem da alternativa -->
    {#if alt.imageUrl}
      <div class="relative inline-block">
        <img
          src={alt.imageUrl}
          alt="Imagem da alternativa"
          class="max-h-24 rounded border border-slate-200 object-contain"
        />
        <button
          onclick={handleRemoveImage}
          class="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center rounded-full
            bg-red-500 text-white hover:bg-red-600 transition-colors"
          title="Remover imagem"
        >
          <X class="w-2.5 h-2.5" />
        </button>
      </div>
    {:else}
      <div class="inline-flex flex-col gap-0.5">
        <label
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium
            text-slate-300 hover:text-violet-500 hover:bg-violet-50 cursor-pointer transition-colors
            {uploadImage.isPending ? 'opacity-50 pointer-events-none' : ''}"
        >
          {#if uploadImage.isPending}
            <span class="w-3 h-3 border-2 border-slate-300 border-t-violet-500 rounded-full animate-spin"></span>
          {:else}
            <Image class="w-3 h-3" />
            Imagem
          {/if}
          <input type="file" accept="image/jpeg,image/png,image/webp" onchange={handleImageUpload} class="hidden" />
        </label>
        {#if uploadImage.error}
          <span class="text-xs text-red-500">{uploadImage.error.message}</span>
        {/if}
      </div>
    {/if}
  </div>

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
