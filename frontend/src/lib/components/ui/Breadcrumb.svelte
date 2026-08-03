<script lang="ts">
  import { ChevronRight } from "@lucide/svelte";

  // Trilha de navegação — substitui os back links soltos. Último item = posição atual.
  let { items }: { items: { label: string; href?: string }[] } = $props();
</script>

<nav aria-label="Breadcrumb" class="mb-6 flex items-center flex-wrap gap-1.5 text-sm">
  {#each items as item, i (i)}
    {#if i === items.length - 1}
      <span class="font-semibold text-ink-soft" aria-current="page">{item.label}</span>
    {:else if item.href}
      <a
        href={item.href}
        class="inline-flex items-center gap-1 text-ink-faint hover:text-ink-soft transition-colors"
      >
        {item.label}
      </a>
    {:else}
      <span class="text-ink-faint">{item.label}</span>
    {/if}
    {#if i < items.length - 1}
      <ChevronRight class="w-4 h-4 text-ink-faint shrink-0" />
    {/if}
  {/each}
</nav>
