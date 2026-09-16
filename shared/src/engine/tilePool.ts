import { Tile, Color } from '../types.js';

export const COLORS: Color[] = ['red', 'blue', 'yellow', 'black'];

/**
 * Generates the official 106 Rummikub tiles:
 * - 2 identical sets of numbers 1-13 in 4 colors (104 tiles)
 * - 2 Jokers
 */
export function generateTilePool(): Tile[] {
  const pool: Tile[] = [];

  for (let set = 1; set <= 2; set++) {
    for (const color of COLORS) {
      for (let number = 1; number <= 13; number++) {
        pool.push({
          id: `${color}-${number}-${set}`,
          number,
          color,
          isJoker: false,
        });
      }
    }
  }

  // 2 Jokers
  pool.push({
    id: 'joker-1',
    number: 0,
    color: 'wild',
    isJoker: true,
  });
  pool.push({
    id: 'joker-2',
    number: 0,
    color: 'wild',
    isJoker: true,
  });

  return pool;
}

/**
 * Performs an in-place/immutable Fisher-Yates shuffle of the tile pool.
 */
export function shufflePool(tiles: Tile[]): Tile[] {
  const copy = [...tiles];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Draws `count` tiles from the pool, returning drawn tiles and remaining pool.
 */
export function drawTiles(pool: Tile[], count: number): { drawn: Tile[]; remaining: Tile[] } {
  const safeCount = Math.min(count, pool.length);
  const drawn = pool.slice(0, safeCount);
  const remaining = pool.slice(safeCount);
  return { drawn, remaining };
}

/**
 * Sorts tiles by value (Groups / "777"):
 * 1. Jokers placed at the end.
 * 2. Ascending numbers (1, 2, 3 ... 13).
 * 3. Color grouping (red, blue, yellow, black).
 */
export function sortTilesByGroup(tiles: Tile[]): Tile[] {
  const colorOrder: Record<string, number> = { red: 0, blue: 1, yellow: 2, black: 3, wild: 4 };
  return [...tiles].sort((a, b) => {
    if (a.isJoker && !b.isJoker) return 1;
    if (!a.isJoker && b.isJoker) return -1;
    if (a.isJoker && b.isJoker) return a.id.localeCompare(b.id);
    if (a.number !== b.number) return a.number - b.number;
    return (colorOrder[a.color] ?? 99) - (colorOrder[b.color] ?? 99);
  });
}

/**
 * Sorts tiles by run/color ("789"):
 * 1. Jokers placed at the end.
 * 2. Color grouping (red, blue, yellow, black).
 * 3. Ascending numbers (1, 2, 3 ... 13).
 */
export function sortTilesByRun(tiles: Tile[]): Tile[] {
  const colorOrder: Record<string, number> = { red: 0, blue: 1, yellow: 2, black: 3, wild: 4 };
  return [...tiles].sort((a, b) => {
    if (a.isJoker && !b.isJoker) return 1;
    if (!a.isJoker && b.isJoker) return -1;
    if (a.isJoker && b.isJoker) return a.id.localeCompare(b.id);
    const colorComp = (colorOrder[a.color] ?? 99) - (colorOrder[b.color] ?? 99);
    if (colorComp !== 0) return colorComp;
    return a.number - b.number;
  });
}
