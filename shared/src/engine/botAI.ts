import { Tile, Meld, Player, Color } from '../types.js';
import { validateGroup, validateRun, validateBoard, sortMeldTiles } from './meldValidator.js';
import { COLORS } from './tilePool.js';

export interface BotMoveResult {
  played: boolean;
  newBoard: Meld[];
  newRack: Tile[];
  actionDescription: string;
}

/**
 * Searches a player's rack for all valid standalone melds (groups and runs).
 */
export function findStandaloneMeldsFromRack(rack: Tile[]): { meld: Tile[]; points: number; type: 'group' | 'run' }[] {
  const results: { meld: Tile[]; points: number; type: 'group' | 'run' }[] = [];
  const jokers = rack.filter(t => t.isJoker);
  const nonJokers = rack.filter(t => !t.isJoker);

  // 1. Groups: group non-jokers by number
  const byNumber = new Map<number, Tile[]>();
  for (const t of nonJokers) {
    const list = byNumber.get(t.number) ?? [];
    list.push(t);
    byNumber.set(t.number, list);
  }

  for (const [num, tilesForNum] of byNumber.entries()) {
    // Unique color tiles for this number
    const colorMap = new Map<Color, Tile>();
    for (const t of tilesForNum) {
      if (!colorMap.has(t.color as Color)) {
        colorMap.set(t.color as Color, t);
      }
    }
    const uniqueColorTiles = Array.from(colorMap.values());

    // Check size 4 group (4 unique colors)
    if (uniqueColorTiles.length === 4) {
      const gRes = validateGroup(uniqueColorTiles);
      if (gRes.valid) {
        results.push({ meld: uniqueColorTiles, points: gRes.points, type: 'group' });
      }
    }

    // Check size 3 groups (any combination of 3 unique colors)
    if (uniqueColorTiles.length >= 3) {
      for (let i = 0; i < uniqueColorTiles.length; i++) {
        for (let j = i + 1; j < uniqueColorTiles.length; j++) {
          for (let k = j + 1; k < uniqueColorTiles.length; k++) {
            const trio = [uniqueColorTiles[i], uniqueColorTiles[j], uniqueColorTiles[k]];
            const gRes = validateGroup(trio);
            if (gRes.valid) {
              results.push({ meld: trio, points: gRes.points, type: 'group' });
            }
          }
        }
      }
    }

    // Check size 3 groups using 1 Joker (2 unique colors + 1 Joker)
    if (uniqueColorTiles.length >= 2 && jokers.length >= 1) {
      for (let i = 0; i < uniqueColorTiles.length; i++) {
        for (let j = i + 1; j < uniqueColorTiles.length; j++) {
          const trio = [uniqueColorTiles[i], uniqueColorTiles[j], jokers[0]];
          const gRes = validateGroup(trio);
          if (gRes.valid) {
            results.push({ meld: trio, points: gRes.points, type: 'group' });
          }
        }
      }
    }
  }

  // 2. Runs: group non-jokers by color
  const byColor = new Map<Color, Tile[]>();
  for (const t of nonJokers) {
    const list = byColor.get(t.color as Color) ?? [];
    list.push(t);
    byColor.set(t.color as Color, list);
  }

  for (const [color, colorTiles] of byColor.entries()) {
    // Unique numbers for this color
    const uniqueTilesByNum = new Map<number, Tile>();
    for (const t of colorTiles) {
      if (!uniqueTilesByNum.has(t.number)) {
        uniqueTilesByNum.set(t.number, t);
      }
    }

    // Search for consecutive sequences of length >= 3
    for (let start = 1; start <= 11; start++) {
      const currentRun: Tile[] = [];
      let availableJokers = [...jokers];

      for (let len = 0; start + len <= 13; len++) {
        const targetNum = start + len;
        const tile = uniqueTilesByNum.get(targetNum);

        if (tile) {
          currentRun.push(tile);
        } else if (availableJokers.length > 0) {
          currentRun.push(availableJokers.shift()!);
        } else {
          break; // cannot continue run
        }

        if (currentRun.length >= 3) {
          const runRes = validateRun(currentRun);
          if (runRes.valid) {
            results.push({ meld: [...currentRun], points: runRes.points, type: 'run' });
          }
        }
      }
    }
  }

  return results;
}

/**
 * Finds non-overlapping sets of melds from a rack that satisfy the 30-point initial meld rule.
 */
export function findInitialMeldCombination(rack: Tile[]): Tile[][] | null {
  const allMelds = findStandaloneMeldsFromRack(rack);
  if (allMelds.length === 0) return null;

  // Try single meld >= 30 points
  for (const m of allMelds) {
    if (m.points >= 30) {
      return [m.meld];
    }
  }

  // Try two disjoint melds totaling >= 30 points
  for (let i = 0; i < allMelds.length; i++) {
    const m1 = allMelds[i];
    const m1Ids = new Set(m1.meld.map(t => t.id));

    for (let j = i + 1; j < allMelds.length; j++) {
      const m2 = allMelds[j];
      // Check disjoint
      const isDisjoint = m2.meld.every(t => !m1Ids.has(t.id));
      if (isDisjoint && m1.points + m2.points >= 30) {
        return [m1.meld, m2.meld];
      }
    }
  }

  // Try three disjoint melds totaling >= 30 points
  for (let i = 0; i < allMelds.length; i++) {
    const m1 = allMelds[i];
    const m1Ids = new Set(m1.meld.map(t => t.id));

    for (let j = i + 1; j < allMelds.length; j++) {
      const m2 = allMelds[j];
      if (m2.meld.some(t => m1Ids.has(t.id))) continue;
      const m12Ids = new Set([...m1Ids, ...m2.meld.map(t => t.id)]);

      for (let k = j + 1; k < allMelds.length; k++) {
        const m3 = allMelds[k];
        if (m3.meld.every(t => !m12Ids.has(t.id)) && m1.points + m2.points + m3.points >= 30) {
          return [m1.meld, m2.meld, m3.meld];
        }
      }
    }
  }

  return null;
}

/**
 * Computes an automated turn move for an AI Bot.
 */
export function executeBotTurn(player: Player, currentBoard: Meld[]): BotMoveResult {
  const isHard = player.botDifficulty === 'hard';
  let rack = [...player.rack];
  let board = currentBoard.map(m => ({ id: m.id, tiles: [...m.tiles] }));

  // CASE 1: Bot has not completed Initial Meld (30 points required)
  if (!player.hasInitialMeld) {
    const initialCombo = findInitialMeldCombination(rack);
    if (!initialCombo) {
      return {
        played: false,
        newBoard: currentBoard,
        newRack: player.rack,
        actionDescription: `${player.name} cannot meet the 30-point initial meld requirement and draws a tile.`,
      };
    }

    // Play initial melds onto board (strictly sorted)
    const playedTileIds = new Set<string>();
    for (const meldTiles of initialCombo) {
      meldTiles.forEach(t => playedTileIds.add(t.id));
      board.push({
        id: `meld-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        tiles: sortMeldTiles(meldTiles),
      });
    }

    rack = rack.filter(t => !playedTileIds.has(t.id));

    return {
      played: true,
      newBoard: board.map(m => ({ id: m.id, tiles: sortMeldTiles(m.tiles) })),
      newRack: rack,
      actionDescription: `${player.name} opens with an initial meld of ${initialCombo.length} sets totaling 30+ points!`,
    };
  }

  // CASE 2: Bot already completed Initial Meld (Regular turn)
  let tilesPlayedFromRack = 0;
  const movesMade: string[] = [];

  // Strategy A: Standalone melds from hand
  const standaloneMelds = findStandaloneMeldsFromRack(rack);
  if (standaloneMelds.length > 0) {
    const selectedMeld = standaloneMelds[0];
    const playedIds = new Set(selectedMeld.meld.map(t => t.id));
    board.push({
      id: `meld-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tiles: sortMeldTiles(selectedMeld.meld),
    });
    rack = rack.filter(t => !playedIds.has(t.id));
    tilesPlayedFromRack += selectedMeld.meld.length;
    movesMade.push(`played a new ${selectedMeld.type} of ${selectedMeld.meld.length} tiles`);
  }

  // Strategy B: Append hand tiles to existing board melds in sequential order
  const remainingRack = [...rack];
  for (const tile of remainingRack) {
    let placed = false;

    for (let mIdx = 0; mIdx < board.length; mIdx++) {
      const meld = board[mIdx];

      // Try adding tile to meld in sorted order
      const candidate = sortMeldTiles([...meld.tiles, tile]);
      if (validateRun(candidate).valid || validateGroup(candidate).valid) {
        board[mIdx] = { ...meld, tiles: candidate };
        rack = rack.filter(t => t.id !== tile.id);
        tilesPlayedFromRack++;
        placed = true;
        movesMade.push(`added ${tile.color} ${tile.isJoker ? 'Joker' : tile.number} to table`);
        break;
      }
    }

    if (!isHard && placed) {
      // Easy bot stops after playing 1 tile or meld
      break;
    }
  }

  // Strategy C (Hard Bot only): Manipulate existing melds / split runs >= 6
  if (isHard) {
    for (let mIdx = 0; mIdx < board.length; mIdx++) {
      const meld = board[mIdx];
      // If a run is 6 or more tiles, split it into two valid runs
      if (meld.tiles.length >= 6) {
        const part1 = sortMeldTiles(meld.tiles.slice(0, 3));
        const part2 = sortMeldTiles(meld.tiles.slice(3));
        if (validateRun(part1).valid && validateRun(part2).valid) {
          board[mIdx] = { id: meld.id, tiles: part1 };
          board.push({
            id: `meld-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            tiles: part2,
          });
          movesMade.push(`split a long run into two separate runs`);
          break;
        }
      }
    }
  }

  // Sort all melds on the board so every run is strictly in sequential order
  const sortedBoard = board.map(m => ({ id: m.id, tiles: sortMeldTiles(m.tiles) }));

  // Verify that the modified board is 100% valid
  const validation = validateBoard(sortedBoard);
  if (!validation.valid || tilesPlayedFromRack === 0) {
    return {
      played: false,
      newBoard: currentBoard,
      newRack: player.rack,
      actionDescription: `${player.name} cannot find a valid play and draws a tile.`,
    };
  }

  return {
    played: true,
    newBoard: sortedBoard,
    newRack: rack,
    actionDescription: `${player.name} ${movesMade.join(', ')}.`,
  };
}
