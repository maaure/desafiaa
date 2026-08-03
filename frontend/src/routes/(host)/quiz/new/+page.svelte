<script lang="ts">
  import { ArrowRight } from "@lucide/svelte";
  import { quizEditor } from "$lib/stores/quiz-editor.store";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";

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
  <!-- Trilha: Meus Quizzes > Novo Questionário -->
  <Breadcrumb
    items={[{ label: "Meus Quizzes", href: "/dashboard" }, { label: "Novo Questionário" }]}
  />

  <h1 class="font-display text-2xl font-extrabold text-ink tracking-tight mb-2">
    Novo Questionário
  </h1>
  <p class="text-sm text-ink-soft mb-8">Dê um nome ao seu quiz para começar a editá-lo</p>

  <form
    onsubmit={handleCreate}
    class="bg-surface-raised rounded-organic border-2 border-ink p-6 shadow-lift"
  >
    <label for="title" class="block text-sm font-semibold text-ink-soft mb-2"> Título </label>
    <input
      id="title"
      type="text"
      bind:value={title}
      placeholder="Ex: Revisão de História — Brasil Colonial"
      autofocus
      class="w-full px-4 py-2.5 rounded-lg border-2 border-ink bg-surface-raised shadow-soft text-sm text-ink
        placeholder:text-ink-faint focus:border-ocean-500
        transition-colors outline-none"
    />

    {#if error}
      <p class="mt-3 text-sm text-danger font-medium">{error}</p>
    {/if}

    <div class="mt-6 flex items-center gap-3">
      <button
        type="submit"
        disabled={!title.trim()}
        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border-2 border-ink bg-primary text-white text-sm font-semibold
          shadow-soft hover:bg-primary-hover active:bg-coral-800 active:translate-y-[2px] active:shadow-none
          disabled:opacity-40 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:shadow-soft
          transition-all"
      >
        Criar e editar
        <ArrowRight class="w-4 h-4" />
      </button>
      <a
        href={resolve("/dashboard")}
        class="text-sm text-ink-faint hover:text-ink-soft transition-colors">Cancelar</a
      >
    </div>
  </form>
</div>
