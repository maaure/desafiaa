<script lang="ts">
  import type { LeaderboardEntry } from "$lib/api/sessions/sessions.types";

  let {
    entries,
    compact = false,
    heights,
    bgColors,
  }: {
    entries: LeaderboardEntry[];
    compact?: boolean;
    heights?: string[];
    bgColors?: string[];
  } = $props();

  const medals = ["🥇", "🥈", "🥉"];

  function h(i: number): string {
    if (heights) return heights[i];
    return compact ? ["h-24", "h-16", "h-14"][i] : ["h-28", "h-20", "h-16"][i];
  }

  function bg(i: number): string {
    if (bgColors) return bgColors[i];
    return [
      "bg-mango-400 border-ink text-mango-950",
      "bg-sand-300 border-ink text-sand-900",
      "bg-coral-700 border-ink text-white",
    ][i];
  }
</script>

<div class="flex items-end justify-center gap-3 {compact ? 'mb-6' : 'mb-4'}">
  {#each entries.slice(0, 3) as entry, i (entry.rank)}
    <div class="flex flex-col items-center gap-2">
      <span
        class="{compact ? 'text-sm' : 'text-base'} font-semibold text-ink-soft text-center {compact
          ? 'max-w-[80px]'
          : 'max-w-[96px]'} truncate">{entry.nickname}</span
      >
      <div
        class="{compact ? 'w-18' : 'w-20'} {h(i)} rounded-t-lg {bg(
          i,
        )} border-2 border-b-0 shadow-soft flex flex-col items-center justify-center"
      >
        <span class={compact ? "text-2xl" : "text-3xl"}>{medals[i]}</span>
        <span class="{compact ? 'text-base' : 'text-lg'} font-bold tabular-nums">{entry.score}</span
        >
      </div>
    </div>
  {/each}
</div>
