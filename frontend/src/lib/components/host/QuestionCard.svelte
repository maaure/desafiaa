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
</script>

{#if presentationMode}
  <!-- Presentation / projector view: big centered question -->
  <div class="bg-white rounded-2xl border-2 border-purple-200 shadow-lg p-10 text-center">
    {#if question.imageUrl}
      <img
        src={question.imageUrl}
        alt=""
        class="max-h-64 w-auto mx-auto rounded-xl mb-6 object-contain"
      />
    {/if}
    <p class="text-3xl font-bold text-slate-900 leading-relaxed max-w-2xl mx-auto">
      {question.text}
    </p>

    {#if question.alternatives.length > 0}
      <div
        class="grid gap-4 mt-8 {question.alternatives.length === 2
          ? 'grid-cols-2'
          : 'grid-cols-1 max-w-lg mx-auto'}"
      >
        {#each question.alternatives as alt, i (alt.id)}
          <div
            class="rounded-xl border-l-4 bg-slate-50 border border-slate-100 text-left overflow-hidden {altColors[
              i % altColors.length
            ]}"
          >
            {#if alt.imageUrl}
              <img src={alt.imageUrl} alt="" class="w-full max-h-48 object-cover" />
            {/if}
            <div class="flex items-center gap-4 p-5">
              <span
                class="flex items-center justify-center w-10 h-10 rounded-full bg-cyan-100 text-cyan-700 text-lg font-bold shrink-0"
              >
                {letters[i] ?? String(i + 1)}
              </span>
              <span class="text-lg font-medium text-slate-800 flex-1">{alt.text}</span>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{:else}
  <!-- Default compact view -->
  <div class="bg-white rounded-xl border border-slate-200 p-6">
    {#if question.imageUrl}
      <img src={question.imageUrl} alt="" class="max-h-48 w-auto rounded-xl mb-4 object-contain" />
    {/if}
    <p class="text-lg font-semibold text-slate-800 leading-relaxed mb-6">
      {question.text}
    </p>

    <div class="space-y-2.5">
      {#each question.alternatives as alt, i (alt.id)}
        <div class="rounded-lg border border-slate-100 bg-slate-50 overflow-hidden">
          {#if alt.imageUrl}
            <img src={alt.imageUrl} alt="" class="w-full max-h-36 object-cover" />
          {/if}
          <div class="flex items-center gap-3 p-4">
            <span
              class="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-100 text-cyan-700 text-sm font-bold shrink-0"
            >
              {letters[i] ?? String(i + 1)}
            </span>
            <span class="text-sm font-medium text-slate-700 flex-1">{alt.text}</span>
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}
