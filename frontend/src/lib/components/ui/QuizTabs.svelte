<script lang="ts">
  import { BarChart3, Pencil } from "@lucide/svelte";
  import { page } from "$app/stores";

  // Tabs irmãs do quiz: Editar ⇄ Relatório — visíveis nas duas páginas
  let quizId = $page.params.id;
  let pathname = $page.url.pathname;

  const TABS = [
    { href: `/quiz/${quizId}/edit`, label: "Editar", icon: Pencil },
    { href: `/quiz/${quizId}/report`, label: "Relatório", icon: BarChart3 },
  ];
</script>

<div
  class="inline-flex gap-1 p-1 rounded-xl border-2 border-ink bg-sand-50 shadow-soft mb-6"
  role="tablist"
  aria-label="Seções do quiz"
>
  {#each TABS as tab (tab.href)}
    <a
      href={tab.href}
      role="tab"
      aria-selected={pathname === tab.href}
      class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors
        {pathname === tab.href
        ? 'bg-ocean-500 text-white shadow-soft'
        : 'text-ink-soft hover:bg-sand-100 hover:text-ink'}"
    >
      <tab.icon class="w-4 h-4" />
      {tab.label}
    </a>
  {/each}
</div>
