<script lang="ts">
  import { Plus, Trash2, Image, X } from "@lucide/svelte";
  import { quizEditor } from "$lib/stores/quiz-editor.store";
  import { useUploadImage } from "$lib/api/quizzes/quizzes.mutations";
  import AlternativeInput from "./AlternativeInput.svelte";
  import type { Question } from "$lib/api/quizzes/quizzes.types";

  let {
    question,
    index,
  }: {
    question: Question;
    index: number;
  } = $props();

  const uploadImage = useUploadImage();

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

    try {
      const { url } = await uploadImage.mutateAsync(file);
      quizEditor.updateQuestionImageUrl(question.id, url);
    } finally {
      input.value = "";
    }
  }

  function handleRemoveImage() {
    quizEditor.removeQuestionImage(question.id);
  }
</script>

<div class="bg-surface-raised rounded-2xl border-2 border-ink shadow-lift transition-colors">
  <!-- Header -->
  <div class="flex items-center gap-3 px-5 py-3 border-b-2 border-ink">
    <span
      class="flex items-center justify-center w-7 h-7 rounded-full border-2 border-ink bg-ocean-100 text-xs font-bold text-ocean-700"
    >
      {index + 1}
    </span>
    <span class="text-xs font-semibold text-ink-soft">
      {question.questionType === "true_false" ? "Verdadeiro ou Falso" : "Múltipla escolha"}
    </span>
    <span class="text-xs text-ink-faint ml-auto tabular-nums">{question.basePoints} pts</span>
  </div>

  <!-- Body -->
  <div class="p-5 space-y-4">
    <textarea
      value={question.text}
      oninput={handleTextInput}
      placeholder="Digite a pergunta..."
      rows="2"
      class="w-full px-3.5 py-2.5 rounded-lg border-2 border-ink bg-surface-raised shadow-soft text-sm resize-y
        placeholder:text-ink-faint focus:border-ocean-500
        transition-colors outline-none"></textarea>

    <!-- Imagem da pergunta -->
    {#if question.imageUrl}
      <div class="relative inline-block">
        <img
          src={question.imageUrl}
          alt="Imagem da pergunta"
          class="max-h-48 rounded-lg border border-line object-contain"
        />
        <button
          onclick={handleRemoveImage}
          class="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center rounded-full
            bg-danger text-white hover:bg-tomato-700 transition-colors"
          title="Remover imagem"
        >
          <X class="w-3 h-3" />
        </button>
      </div>
    {:else}
      <div class="inline-flex flex-col gap-1">
        <label
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
            text-ink-faint hover:text-ocean-600 hover:bg-ocean-50 border border-dashed border-line
            hover:border-ocean-300 cursor-pointer transition-colors
            {uploadImage.isPending ? 'opacity-50 pointer-events-none' : ''}"
        >
          {#if uploadImage.isPending}
            <span
              class="w-3.5 h-3.5 border-2 border-sand-300 border-t-ocean-500 rounded-full animate-spin"
            ></span>
            Enviando...
          {:else}
            <Image class="w-3.5 h-3.5" />
            Adicionar imagem
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

    <!-- Alternatives -->
    <div>
      <p class="text-xs font-semibold text-ink-faint uppercase tracking-wide mb-2">Alternativas</p>
      <div class="space-y-2">
        {#each question.alternatives as alt, i (alt.id)}
          <AlternativeInput
            {alt}
            questionId={question.id}
            letter={String.fromCharCode(65 + i)}
            manageable={question.questionType === "multiple_choice"}
            canMoveUp={i > 0}
            canMoveDown={i < question.alternatives.length - 1}
          />
        {/each}
      </div>

      {#if question.alternatives.length < 4 && question.questionType === "multiple_choice"}
        <button
          onclick={handleAddAlternative}
          class="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-ocean-600 hover:text-ocean-700 transition-colors"
        >
          <Plus class="w-3.5 h-3.5" />
          Adicionar alternativa
        </button>
      {/if}
    </div>
  </div>

  <!-- Footer -->
  <div class="px-5 py-3 border-t-2 border-ink flex justify-end">
    <button
      onclick={handleRemoveQuestion}
      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
        text-ink-faint hover:text-danger hover:bg-tomato-50 transition-colors"
    >
      <Trash2 class="w-3.5 h-3.5" />
      Remover pergunta
    </button>
  </div>
</div>
