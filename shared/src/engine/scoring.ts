import { Player, ScoreSummary, Tile } from '../types.js';

/**
 * Calculates rack points according to official Rummikub rules:
 * - Number tiles count as their face value (1-13).
 * - Jokers count as 30 penalty points.
 */
export function calculateRackPoints(rack: Tile[]): number {
  return rack.reduce((sum, tile) => {
    return sum + (tile.isJoker ? 30 : tile.number);
  }, 0);
}

/**
 * Calculates end game scoring summaries for all players:
 * - Winner receives the positive sum of all losers' rack points.
 * - Losers receive negative of their own remaining rack points.
 */
export function calculateFinalScores(players: Player[], winnerId: string): ScoreSummary[] {
  let totalLoserPoints = 0;
  const summaries: ScoreSummary[] = [];

  // First calculate losers' penalties
  for (const p of players) {
    const rackPoints = calculateRackPoints(p.rack);
    if (p.id !== winnerId) {
      totalLoserPoints += rackPoints;
      summaries.push({
        playerId: p.id,
        playerName: p.name,
        remainingTileCount: p.rack.length,
        rackPoints,
        netScore: -rackPoints,
      });
    }
  }

  // Calculate winner score
  const winner = players.find(p => p.id === winnerId);
  if (winner) {
    summaries.push({
      playerId: winner.id,
      playerName: winner.name,
      remainingTileCount: winner.rack.length,
      rackPoints: 0,
      netScore: totalLoserPoints,
    });
  }

  return summaries;
}
