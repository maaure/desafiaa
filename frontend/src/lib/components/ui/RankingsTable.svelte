<script lang="ts">
  import type { LeaderboardEntry } from "$lib/api/sessions/sessions.types";

  let { entries }: { entries: LeaderboardEntry[] } = $props();
</script>

<div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
  <table class="w-full">
    <thead>
      <tr class="border-b border-slate-100">
        <th
          class="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-12"
          >#</th
        >
        <th class="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide"
          >Jogador</th
        >
        <th
          class="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide"
          >Pontos</th
        >
        <th
          class="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-16"
          >Certas</th
        >
      </tr>
    </thead>
    <tbody>
      {#each entries as entry (entry.rank)}
        <tr class="border-b border-slate-50 last:border-0 {entry.rank === 1 ? 'bg-amber-50' : ''}">
          <td class="px-5 py-3">
            <span class="text-sm font-bold text-slate-400">{entry.rank}</span>
          </td>
          <td class="px-5 py-3">
            <span class="text-sm font-medium text-slate-800">{entry.nickname}</span>
          </td>
          <td class="px-5 py-3 text-right">
            <span class="text-sm font-bold text-slate-900 tabular-nums">{entry.score}</span>
          </td>
          <td class="px-5 py-3 text-right">
            <span class="text-sm text-slate-500 tabular-nums">{entry.correctCount}</span>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
