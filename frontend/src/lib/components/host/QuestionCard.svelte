<script lang="ts">
  let {
    question,
    presentationMode = false,
    letters,
    altColors,
  }: {
    question: {
      text: string;
      imageUrl: string | null;
      alternatives: {
        id: string;
        text: string;
        imageUrl: string | null;
        sortOrder: number;
      }[];
    };
    presentationMode?: boolean;
    letters: string[];
    altColors: string[];
  } = $props();

  // Badges de letra (A/B/C/D) nas cores do jogo — DRY: única fonte é o token
  const answerBadges = [
    "bg-answer-a text-white",
    "bg-answer-b text-white",
    "bg-answer-c text-white",
    "bg-answer-d text-white",
  ];
</script>

{#if presentationMode}
  <!-- Presentation / projector view: cartolina gigante, tela de game show clara -->
  <div
    class="bg-surface-raised rounded-organic border-[3px] border-ink shadow-lift p-10 sm:p-16 text-center animate-rise"
  >
    {#if question.imageUrl}
      <img
        src={question.imageUrl}
        alt=""
        class="max-h-64 w-auto mx-auto rounded-xl mb-6 object-contain"
      />
    {/if}
    <p
      class="font-display text-hero font-extrabold text-ink tracking-tight leading-tight max-w-3xl mx-auto"
    >
      {question.text}
    </p>

    {#if question.alternatives.length > 0}
      <div
        class="grid gap-5 mt-12 {question.alternatives.length >= 2
          ? 'grid-cols-1 sm:grid-cols-2'
          : 'grid-cols-1 max-w-xl mx-auto'}"
      >
        {#each question.alternatives as alt, i (alt.id)}
          <div
            class="rounded-xl border-2 border-ink bg-white shadow-lift text-left overflow-hidden {altColors[
              i % altColors.length
            ]}"
          >
            {#if alt.imageUrl}
              <img src={alt.imageUrl} alt="" class="w-full max-h-48 object-cover" />
            {/if}
            <div class="flex items-center gap-5 p-6">
              <span
                class="flex items-center justify-center w-14 h-14 rounded-full border-2 border-ink text-2xl font-bold shrink-0 {answerBadges[
                  i % answerBadges.length
                ]}"
              >
                {letters[i] ?? String(i + 1)}
              </span>
              <span class="font-display text-3xl font-bold text-ink flex-1">{alt.text}</span>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{:else}
  <!-- Default compact view -->
  <div class="bg-surface-raised rounded-2xl border-2 border-ink shadow-lift p-6">
    {#if question.imageUrl}
      <img src={question.imageUrl} alt="" class="max-h-48 w-auto rounded-xl mb-4 object-contain" />
    {/if}
    <p class="text-lg font-semibold text-ink leading-relaxed mb-6">
      {question.text}
    </p>

    <div class="space-y-2.5">
      {#each question.alternatives as alt, i (alt.id)}
        <div class="rounded-lg border-2 border-ink bg-sand-50 shadow-soft overflow-hidden">
          {#if alt.imageUrl}
            <img src={alt.imageUrl} alt="" class="w-full max-h-36 object-cover" />
          {/if}
          <div class="flex items-center gap-3 p-4">
            <span
              class="flex items-center justify-center w-8 h-8 rounded-full border-2 border-ink text-sm font-bold shrink-0 {answerBadges[
                i % answerBadges.length
              ]}"
            >
              {letters[i] ?? String(i + 1)}
            </span>
            <span class="text-sm font-medium text-ink-soft flex-1">{alt.text}</span>
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}
