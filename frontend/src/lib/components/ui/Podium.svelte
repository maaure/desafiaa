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
      "bg-amber-50 border-amber-200",
      "bg-slate-50 border-slate-200",
      "bg-orange-50 border-orange-100",
    ][i];
  }
</script>

<div class="flex items-end justify-center gap-3 {compact ? 'mb-6' : 'mb-4'}">
  {#each entries.slice(0, 3) as entry, i (entry.rank)}
    <div class="flex flex-col items-center gap-2">
      <span
        class="{compact ? 'text-xs' : 'text-sm'} font-semibold text-slate-800 text-center {compact
          ? 'max-w-[72px]'
          : 'max-w-[80px]'} truncate">{entry.nickname}</span
      >
      <div
        class="{compact ? 'w-18' : 'w-20'} {h(i)} rounded-t-lg {bg(
          i,
        )} border border-b-0 flex flex-col items-center justify-center"
      >
        <span class={compact ? "text-xl" : "text-2xl"}>{medals[i]}</span>
        <span class="{compact ? 'text-xs' : 'text-sm'} font-bold text-slate-700 tabular-nums"
          >{entry.score}</span
        >
      </div>
    </div>
  {/each}
</div>
