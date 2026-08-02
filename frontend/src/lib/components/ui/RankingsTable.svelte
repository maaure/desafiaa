<script lang="ts">
  import type { LeaderboardEntry } from "$lib/api/sessions/sessions.types";

  let { entries }: { entries: LeaderboardEntry[] } = $props();
</script>

<div class="bg-surface-raised rounded-2xl border-2 border-ink shadow-lift overflow-hidden">
  <table class="w-full">
    <thead>
      <tr class="border-b-2 border-ink bg-sand-50/50">
        <th
          class="text-left px-5 py-4 text-sm font-semibold uppercase tracking-wide w-14 text-ink-faint"
          >#</th
        >
        <th class="text-left px-5 py-4 text-sm font-semibold uppercase tracking-wide text-ink-faint"
          >Jogador</th
        >
        <th
          class="text-right px-5 py-4 text-sm font-semibold uppercase tracking-wide text-ink-faint"
          >Pontos</th
        >
        <th
          class="text-right px-5 py-4 text-sm font-semibold uppercase tracking-wide w-20 text-ink-faint"
          >Certas</th
        >
      </tr>
    </thead>
    <tbody>
      {#each entries as entry (entry.rank)}
        <tr class="border-b border-sand-100 last:border-0 {entry.rank === 1 ? 'bg-mango-50' : ''}">
          <td class="px-5 py-4">
            {#if entry.rank === 1}
              <span
                class="inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-ink bg-mango-400 text-mango-950 text-base font-bold rotate-1"
                >1</span
              >
            {:else}
              <span class="text-base font-bold text-ink-faint">{entry.rank}</span>
            {/if}
          </td>
          <td class="px-5 py-4">
            <span class="text-base font-medium text-ink-soft">{entry.nickname}</span>
          </td>
          <td class="px-5 py-4 text-right">
            <span class="text-base font-bold text-ink tabular-nums">{entry.score}</span>
          </td>
          <td class="px-5 py-4 text-right">
            <span class="text-base text-ink-faint tabular-nums">{entry.correctCount}</span>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
