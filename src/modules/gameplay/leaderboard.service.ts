import { redis } from "../../redis/client";
import { keys } from "../../redis/keys";

export interface LeaderboardEntry {
  nickname: string;
  score: number;
  rank: number;
  correctCount: number;
}

export const leaderboardService = {
  async getTop(pin: string, topN = 10): Promise<LeaderboardEntry[]> {
    // ZREVRANGE retorna do maior para o menor score
    const results = await redis.zrevrange(
      keys.sessionScores(pin), 0, topN - 1, "WITHSCORES",
    );

    const entries: LeaderboardEntry[] = [];
    for (let i = 0; i < results.length; i += 2) {
      const socketId = results[i];
      const score = parseInt(results[i + 1], 10);
      const player = await redis.hgetall(keys.sessionPlayer(pin, socketId));
      entries.push({
        nickname: player?.nickname ?? "?",
        score,
        rank: entries.length + 1,
        correctCount: parseInt(player?.correct_count ?? "0", 10),
      });
    }
    return entries;
  },

  async getPlayerRank(pin: string, socketId: string): Promise<number | null> {
    // ZREVRANK: 0-indexed rank do maior para o menor
    const rank = await redis.zrevrank(keys.sessionScores(pin), socketId);
    return rank !== null ? rank + 1 : null;
  },

  async getFullRankings(pin: string): Promise<LeaderboardEntry[]> {
    const results = await redis.zrevrange(
      keys.sessionScores(pin), 0, -1, "WITHSCORES",
    );

    const entries: LeaderboardEntry[] = [];
    for (let i = 0; i < results.length; i += 2) {
      const socketId = results[i];
      const score = parseInt(results[i + 1], 10);
      const player = await redis.hgetall(keys.sessionPlayer(pin, socketId));
      entries.push({
        nickname: player?.nickname ?? "?",
        score,
        rank: entries.length + 1,
        correctCount: parseInt(player?.correct_count ?? "0", 10),
      });
    }
    return entries;
  },
};
