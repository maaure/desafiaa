import { writable, derived } from "svelte/store";
import type { LeaderboardEntry } from "$lib/types/session";

/** Writable rankings list. Updated externally when leaderboard/game:ended arrives. */
export const leaderboardRankings = writable<LeaderboardEntry[]>([]);

/** Nickname of the current player, used to compute myRank/myScore. */
export const leaderboardMyNickname = writable<string | null>(null);

/** Reactive rank of the current player (derived). */
export const leaderboardMyRank = derived(
  [leaderboardRankings, leaderboardMyNickname],
  ([$rankings, $nick]) => {
    if (!$nick) return null;
    const entry = $rankings.find((e) => e.nickname.toLowerCase() === $nick.toLowerCase());
    return entry?.rank ?? null;
  },
);

/** Reactive score of the current player (derived). */
export const leaderboardMyScore = derived(
  [leaderboardRankings, leaderboardMyNickname],
  ([$rankings, $nick]) => {
    if (!$nick) return 0;
    const entry = $rankings.find((e) => e.nickname.toLowerCase() === $nick.toLowerCase());
    return entry?.score ?? 0;
  },
);

export function setLeaderboard(data: LeaderboardEntry[], nickname: string) {
  leaderboardRankings.set(data);
  leaderboardMyNickname.set(nickname);
}

export function resetLeaderboard() {
  leaderboardRankings.set([]);
  leaderboardMyNickname.set(null);
}
