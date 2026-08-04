<script lang="ts">
  import { ArrowDown, ArrowUp, Image, Trash2, X } from "@lucide/svelte";
  import { quizEditor } from "$lib/stores/quiz-editor.store";
  import { useUploadImage } from "$lib/api/quizzes/quizzes.mutations";
  import type { Alternative } from "$lib/api/quizzes/quizzes.types";

  let {
    alt,
    questionId,
    letter,
    manageable,
    canMoveUp,
    canMoveDown,
  }: {
    alt: Alternative;
    questionId: string;
    letter: string;
    manageable: boolean;
    canMoveUp: boolean;
    canMoveDown: boolean;
  } = $props();

  const uploadImage = useUploadImage();

  function handleTextInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    quizEditor.updateAlternativeText(questionId, alt.id, value);
  }

  function handleCorrect() {
    quizEditor.markCorrect(questionId, alt.id);
  }

  function handleMoveUp() {
    quizEditor.moveAlternative(questionId, alt.id, -1);
  }

  function handleMoveDown() {
    quizEditor.moveAlternative(questionId, alt.id, 1);
  }

  function handleRemove() {
    quizEditor.removeAlternative(questionId, alt.id);
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
  class="flex items-center gap-3 p-3 rounded-lg border-2 shadow-soft transition-colors
  {alt.isCorrect ? 'border-ink bg-leaf-50' : 'border-ink bg-surface-raised hover:bg-sand-50'}"
>
  <!-- Letter badge -->
  <span
    class="flex items-center justify-center w-7 h-7 rounded-full border-2 border-ink text-xs font-bold shrink-0
    {alt.isCorrect ? 'bg-leaf-500 text-white' : 'bg-sand-100 text-ink-faint'}"
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
        placeholder:text-ink-faint focus:outline-none"
    />

    <!-- Imagem da alternativa -->
    {#if alt.imageUrl}
      <div class="relative inline-block">
        <img
          src={alt.imageUrl}
          alt="Imagem da alternativa"
          class="max-h-24 rounded border border-line object-contain"
        />
        <button
          onclick={handleRemoveImage}
          class="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center rounded-full
            bg-danger text-white hover:bg-tomato-700 transition-colors"
          title="Remover imagem"
        >
          <X class="w-2.5 h-2.5" />
        </button>
      </div>
    {:else}
      <div class="inline-flex flex-col gap-0.5">
        <label
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium
            text-ink-faint hover:text-ocean-600 hover:bg-ocean-50 cursor-pointer transition-colors
            {uploadImage.isPending ? 'opacity-50 pointer-events-none' : ''}"
        >
          {#if uploadImage.isPending}
            <span
              class="w-3 h-3 border-2 border-sand-300 border-t-ocean-500 rounded-full animate-spin"
            ></span>
          {:else}
            <Image class="w-3 h-3" />
            Imagem
          {/if}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onchange={handleImageUpload}
            class="hidden"
          />
        </label>
        {#if uploadImage.error}
          <span class="text-xs text-danger">{uploadImage.error.message}</span>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Reorder / remove (apenas múltipla escolha) -->
  {#if manageable}
    <div class="flex flex-col items-center shrink-0">
      <button
        onclick={handleMoveUp}
        disabled={!canMoveUp}
        title="Mover para cima"
        class="p-0.5 rounded text-ink-faint hover:text-ocean-600 hover:bg-ocean-50
          disabled:opacity-25 disabled:pointer-events-none transition-colors"
      >
        <ArrowUp class="w-3.5 h-3.5" />
      </button>
      <button
        onclick={handleMoveDown}
        disabled={!canMoveDown}
        title="Mover para baixo"
        class="p-0.5 rounded text-ink-faint hover:text-ocean-600 hover:bg-ocean-50
          disabled:opacity-25 disabled:pointer-events-none transition-colors"
      >
        <ArrowDown class="w-3.5 h-3.5" />
      </button>
    </div>
    <button
      onclick={handleRemove}
      title="Remover alternativa"
      class="p-1.5 rounded text-ink-faint hover:text-danger hover:bg-tomato-50 transition-colors shrink-0"
    >
      <Trash2 class="w-3.5 h-3.5" />
    </button>
  {/if}

  <!-- Correct toggle -->
  <label class="flex items-center gap-1.5 cursor-pointer shrink-0" title="Marcar como correta">
    <input
      type="radio"
      name={`correct_${questionId}`}
      checked={alt.isCorrect}
      onchange={handleCorrect}
      class="w-3.5 h-3.5 accent-leaf-500 cursor-pointer"
    />
    <span
      class="text-xs font-medium select-none
      {alt.isCorrect ? 'text-leaf-700' : 'text-ink-faint'}"
    >
      Correta
    </span>
  </label>
</div>
