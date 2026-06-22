<script lang="ts">
  import { quizEditor } from "$lib/stores/quiz-editor.store";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";

  let title = $state("");
  let error = $state<string | null>(null);

  function handleCreate(e: Event) {
    e.preventDefault();
    if (!title.trim()) {
      error = "O título é obrigatório";
      return;
    }
    error = null;
    quizEditor.initNew(title.trim());
    goto(resolve("/quiz/new/edit"));
  }
</script>

<div class="px-8 py-8 max-w-2xl">
  <!-- Back -->
  <a
    href={resolve("/dashboard")}
    class="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors mb-6"
  >
    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
      />
    </svg>
    Dashboard
  </a>

  <h1 class="text-2xl font-bold text-slate-900 mb-2">Novo Questionário</h1>
  <p class="text-sm text-slate-500 mb-8">Dê um nome ao seu quiz para começar a editá-lo</p>

  <form onsubmit={handleCreate} class="bg-white rounded-xl border border-slate-200 p-6">
    <label for="title" class="block text-sm font-semibold text-slate-700 mb-2"> Título </label>
    <input
      id="title"
      type="text"
      bind:value={title}
      placeholder="Ex: Revisão de História — Brasil Colonial"
      autofocus
      class="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900
        placeholder:text-slate-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100
        transition-colors outline-none"
    />

    {#if error}
      <p class="mt-3 text-sm text-red-500 font-medium">{error}</p>
    {/if}

    <div class="mt-6 flex items-center gap-3">
      <button
        type="submit"
        disabled={!title.trim()}
        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-600 text-white text-sm font-semibold
          hover:bg-cyan-700 active:bg-cyan-800 disabled:opacity-40 disabled:cursor-not-allowed
          transition-colors shadow-sm"
      >
        Criar e editar
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
          />
        </svg>
      </button>
      <a
        href={resolve("/dashboard")}
        class="text-sm text-slate-400 hover:text-slate-600 transition-colors">Cancelar</a
      >
    </div>
  </form>
</div>
