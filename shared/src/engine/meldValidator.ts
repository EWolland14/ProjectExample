import { Tile, Meld, MeldValidationResult, BoardValidationResult, Color } from '../types.js';

/**
 * Validates whether an array of tiles forms a valid Rummikub Group (Set).
 * - Exactly 3 or 4 tiles.
 * - Same number value (1-13).
 * - Distinct colors (Red, Blue, Yellow, Black). No duplicate colors.
 * - Jokers take the missing color and the group's number.
 */
export function validateGroup(tiles: Tile[]): MeldValidationResult {
  if (tiles.length < 3 || tiles.length > 4) {
    return {
      valid: false,
      points: 0,
      error: `Groups must contain 3 or 4 tiles (current: ${tiles.length})`,
    };
  }

  const nonJokers = tiles.filter(t => !t.isJoker);
  const jokers = tiles.filter(t => t.isJoker);

  if (nonJokers.length === 0) {
    return {
      valid: false,
      points: 0,
      error: 'A group cannot consist entirely of Jokers',
    };
  }

  // All non-jokers must share the exact same number
  const targetNumber = nonJokers[0].number;
  if (targetNumber < 1 || targetNumber > 13) {
    return {
      valid: false,
      points: 0,
      error: `Invalid tile number ${targetNumber}`,
    };
  }

  for (const t of nonJokers) {
    if (t.number !== targetNumber) {
      return {
        valid: false,
        points: 0,
        error: `All tiles in a group must have the same number (found ${targetNumber} and ${t.number})`,
      };
    }
  }

  // Non-jokers must have distinct colors
  const seenColors = new Set<string>();
  for (const t of nonJokers) {
    if (seenColors.has(t.color)) {
      return {
        valid: false,
        points: 0,
        error: `Duplicate color '${t.color}' in group`,
      };
    }
    seenColors.add(t.color);
  }

  // Check if we have enough distinct colors available for the jokers
  const totalColorsUsed = seenColors.size + jokers.length;
  if (totalColorsUsed > 4) {
    return {
      valid: false,
      points: 0,
      error: 'Cannot have more than 4 distinct colors in a group',
    };
  }

  const points = targetNumber * tiles.length;

  const allColors: Color[] = ['red', 'blue', 'yellow', 'black'];
  const unusedColors = allColors.filter(c => !seenColors.has(c));
  const resolvedValues = tiles.map((t, idx) => {
    if (!t.isJoker) {
      return { id: t.id, number: t.number, color: t.color as Color };
    }
    const assignedColor = unusedColors.shift() ?? 'red';
    return { id: t.id, number: targetNumber, color: assignedColor };
  });

  return {
    valid: true,
    type: 'group',
    points,
    resolvedValues,
  };
}

/**
 * Validates whether an array of tiles forms a valid Rummikub Run.
 * - 3 to 13 tiles.
 * - Same color.
 * - Strictly consecutive numbers (1 is always low; no wrapping 12-13-1).
 * - Jokers fill missing gaps or extend the sequence within 1..13.
 */
export function validateRun(tiles: Tile[]): MeldValidationResult {
  if (tiles.length < 3 || tiles.length > 13) {
    return {
      valid: false,
      points: 0,
      error: `Runs must contain between 3 and 13 tiles (current: ${tiles.length})`,
    };
  }

  const nonJokers = tiles.filter(t => !t.isJoker);
  const jokerCount = tiles.length - nonJokers.length;

  if (nonJokers.length === 0) {
    return {
      valid: false,
      points: 0,
      error: 'A run cannot consist entirely of Jokers',
    };
  }

  // All non-jokers must have the same color
  const runColor = nonJokers[0].color as Color;
  for (const t of nonJokers) {
    if (t.color !== runColor) {
      return {
        valid: false,
        points: 0,
        error: `All tiles in a run must share the same color (found ${runColor} and ${t.color})`,
      };
    }
  }

  // Check order-preserving validation first (if tiles were placed in explicit sequential order)
  const orderedResult = testOrderedRun(tiles, runColor);
  if (orderedResult.valid) {
    return orderedResult;
  }

  // If explicit order didn't match, check if sorting by non-joker positions allows a valid run
  return testUnorderedRun(tiles, nonJokers, jokerCount, runColor);
}

function testOrderedRun(tiles: Tile[], runColor: Color): MeldValidationResult {
  const n = tiles.length;
  // Look for any anchor non-joker tile to infer the starting number
  let anchorIdx = -1;
  for (let i = 0; i < n; i++) {
    if (!tiles[i].isJoker) {
      anchorIdx = i;
      break;
    }
  }

  if (anchorIdx === -1) {
    return { valid: false, points: 0, error: 'No non-joker tile found' };
  }

  const startNumber = tiles[anchorIdx].number - anchorIdx;
  const endNumber = startNumber + n - 1;

  if (startNumber < 1 || endNumber > 13) {
    return { valid: false, points: 0, error: 'Run numbers must be strictly between 1 and 13' };
  }

  let totalPoints = 0;
  const resolvedValues: { id: string; number: number; color: Color }[] = [];

  for (let i = 0; i < n; i++) {
    const expectedNum = startNumber + i;
    if (tiles[i].isJoker) {
      totalPoints += expectedNum;
      resolvedValues.push({ id: tiles[i].id, number: expectedNum, color: runColor });
    } else {
      if (tiles[i].number !== expectedNum) {
        return { valid: false, points: 0, error: `Expected number ${expectedNum} at position ${i + 1}, got ${tiles[i].number}` };
      }
      totalPoints += tiles[i].number;
      resolvedValues.push({ id: tiles[i].id, number: tiles[i].number, color: runColor });
    }
  }

  return {
    valid: true,
    type: 'run',
    points: totalPoints,
    resolvedValues,
  };
}

function testUnorderedRun(
  tiles: Tile[],
  nonJokers: Tile[],
  jokerCount: number,
  runColor: Color
): MeldValidationResult {
  // Check for duplicate numbers among non-jokers
  const nonJokerNums = nonJokers.map(t => t.number).sort((a, b) => a - b);
  for (let i = 0; i < nonJokerNums.length - 1; i++) {
    if (nonJokerNums[i] === nonJokerNums[i + 1]) {
      return {
        valid: false,
        points: 0,
        error: `Duplicate number ${nonJokerNums[i]} in run`,
      };
    }
  }

  const minNum = nonJokerNums[0];
  const maxNum = nonJokerNums[nonJokerNums.length - 1];
  const totalLength = tiles.length;

  // The span of existing non-jokers
  const innerSpan = maxNum - minNum + 1;
  const innerGaps = innerSpan - nonJokerNums.length;

  if (innerGaps > jokerCount) {
    return {
      valid: false,
      points: 0,
      error: `Gaps between numbers (${innerGaps}) exceed available Jokers (${jokerCount})`,
    };
  }

  // Find candidate start numbers S such that:
  // 1 <= S <= minNum AND maxNum <= S + totalLength - 1 <= 13
  const minPossibleStart = Math.max(1, maxNum - totalLength + 1);
  const maxPossibleStart = Math.min(minNum, 13 - totalLength + 1);

  if (minPossibleStart > maxPossibleStart) {
    return {
      valid: false,
      points: 0,
      error: `Tiles cannot form a valid consecutive run between 1 and 13`,
    };
  }

  // Select maxPossibleStart to maximize points for the player
  const startNumber = maxPossibleStart;
  let totalPoints = 0;
  for (let num = startNumber; num < startNumber + totalLength; num++) {
    totalPoints += num;
  }

  return {
    valid: true,
    type: 'run',
    points: totalPoints,
  };
}

/**
 * Validates a single Meld (must be either a valid Group or a valid Run).
 */
export function validateMeld(meld: Meld | Tile[]): MeldValidationResult {
  const tiles = Array.isArray(meld) ? meld : meld.tiles;

  if (!tiles || tiles.length < 3) {
    return {
      valid: false,
      points: 0,
      error: 'A meld must contain at least 3 tiles',
    };
  }

  // Check group first
  const groupResult = validateGroup(tiles);
  if (groupResult.valid) {
    return groupResult;
  }

  // Check run
  const runResult = validateRun(tiles);
  if (runResult.valid) {
    return runResult;
  }

  // Return the more informative error
  return {
    valid: false,
    points: 0,
    error: tiles.length > 4 ? runResult.error : `${groupResult.error} / ${runResult.error}`,
  };
}

/**
 * Validates the entire table/board.
 * Every meld on the table must be valid.
 */
export function validateBoard(board: Meld[]): BoardValidationResult {
  const invalidMeldIndices: number[] = [];
  const errors: string[] = [];
  let totalPoints = 0;

  board.forEach((meld, index) => {
    // Empty melds are allowed and filtered out in cleanups, but if present with 0 tiles, ignore
    if (meld.tiles.length === 0) return;

    const res = validateMeld(meld);
    if (!res.valid) {
      invalidMeldIndices.push(index);
      errors.push(`Meld #${index + 1}: ${res.error}`);
    } else {
      totalPoints += res.points;
    }
  });

  return {
    valid: invalidMeldIndices.length === 0,
    invalidMeldIndices,
    totalPoints,
    errors,
  };
}

/**
 * Validates the 30-Point Initial Meld rule:
 * - A player who has not made their initial meld may NOT touch existing table melds.
 * - All melds they play must come entirely from their rack.
 * - The sum of points from their new melds must be >= 30.
 */
export function validateInitialMeld(
  startBoard: Meld[],
  endBoard: Meld[],
  startRack: Tile[],
  endRack: Tile[]
): { valid: boolean; points: number; error?: string } {
  // First, verify the whole endBoard is valid
  const boardValidation = validateBoard(endBoard);
  if (!boardValidation.valid) {
    return {
      valid: false,
      points: 0,
      error: `Board contains invalid melds: ${boardValidation.errors.join('; ')}`,
    };
  }

  // Ensure startBoard was not manipulated:
  // Every meld from startBoard must still exist identically in endBoard
  const startMeldMap = new Map<string, string>();
  for (const m of startBoard) {
    if (m.tiles.length > 0) {
      const tileIds = m.tiles.map(t => t.id).sort().join(',');
      startMeldMap.set(m.id, tileIds);
    }
  }

  // Identify new melds created during this turn
  const newMelds: Meld[] = [];
  for (const m of endBoard) {
    if (m.tiles.length === 0) continue;
    const existing = startMeldMap.get(m.id);
    const currentTileIds = m.tiles.map(t => t.id).sort().join(',');

    if (existing === undefined) {
      newMelds.push(m);
    } else if (existing !== currentTileIds) {
      return {
        valid: false,
        points: 0,
        error: 'Cannot manipulate existing table tiles during your initial 30-point meld',
      };
    }
  }

  if (newMelds.length === 0) {
    return {
      valid: false,
      points: 0,
      error: 'Must play at least one valid meld from your rack for initial meld',
    };
  }

  // Calculate points only from the new melds
  let initialMeldPoints = 0;
  for (const m of newMelds) {
    const res = validateMeld(m);
    if (!res.valid) {
      return { valid: false, points: 0, error: res.error };
    }
    initialMeldPoints += res.points;
  }

  if (initialMeldPoints < 30) {
    return {
      valid: false,
      points: initialMeldPoints,
      error: `Initial meld requires at least 30 points (currently: ${initialMeldPoints})`,
    };
  }

  return {
    valid: true,
    points: initialMeldPoints,
  };
}

/**
 * Validates a regular turn (for players who already have hasInitialMeld = true).
 * - Board must be completely valid.
 * - At least one tile from rack must have been played.
 * - No tiles from the table can have been added to the player's rack.
 */
export function validateRegularTurn(
  startBoard: Meld[],
  endBoard: Meld[],
  startRack: Tile[],
  endRack: Tile[]
): { valid: boolean; tilesPlayed: number; error?: string } {
  // Check board validity
  const boardValidation = validateBoard(endBoard);
  if (!boardValidation.valid) {
    return {
      valid: false,
      tilesPlayed: 0,
      error: `Board contains invalid melds: ${boardValidation.errors.join('; ')}`,
    };
  }

  const startBoardTileCount = startBoard.reduce((sum, m) => sum + m.tiles.length, 0);
  const endBoardTileCount = endBoard.reduce((sum, m) => sum + m.tiles.length, 0);
  const tilesPlayed = startRack.length - endRack.length;

  if (tilesPlayed <= 0) {
    return {
      valid: false,
      tilesPlayed: 0,
      error: 'You must play at least one tile from your rack, or draw and pass',
    };
  }

  if (endBoardTileCount !== startBoardTileCount + tilesPlayed) {
    return {
      valid: false,
      tilesPlayed,
      error: 'Tile count mismatch: tiles cannot be removed from the table',
    };
  }

  // Verify all tiles from startBoard are still on endBoard
  const endBoardTileIds = new Set<string>();
  for (const m of endBoard) {
    for (const t of m.tiles) {
      endBoardTileIds.add(t.id);
    }
  }

  for (const m of startBoard) {
    for (const t of m.tiles) {
      if (!endBoardTileIds.has(t.id)) {
        return {
          valid: false,
          tilesPlayed,
          error: `Table tile ${t.color} ${t.number || 'Joker'} was removed from the table`,
        };
      }
    }
  }

  return {
    valid: true,
    tilesPlayed,
  };
}

/**
 * Sorts tiles of a valid Run into strictly ascending consecutive sequence:
 * e.g. [8, 12, 9, 10, 11] -> [8, 9, 10, 11, 12]
 * e.g. [Red 4, Red 6, Joker] -> [Red 4, Joker, Red 6]
 */
export function sortRunTiles(tiles: Tile[]): Tile[] {
  if (tiles.length <= 1) return [...tiles];

  const nonJokers = tiles.filter(t => !t.isJoker).sort((a, b) => a.number - b.number);
  const jokers = tiles.filter(t => t.isJoker);

  if (nonJokers.length === 0) return [...tiles];

  const T = tiles.length;
  const minNum = nonJokers[0].number;
  const maxNum = nonJokers[nonJokers.length - 1].number;

  const minPossibleStart = Math.max(1, maxNum - T + 1);
  const maxPossibleStart = Math.min(minNum, 13 - T + 1);

  if (minPossibleStart > maxPossibleStart) {
    return [...nonJokers, ...jokers];
  }

  // Determine starting number:
  let startNum = maxPossibleStart;
  if (tiles[0] && !tiles[0].isJoker) {
    if (tiles[0].number >= minPossibleStart && tiles[0].number <= maxPossibleStart) {
      startNum = tiles[0].number;
    } else {
      startNum = Math.min(minNum, maxPossibleStart);
    }
  } else if (tiles[0] && tiles[0].isJoker) {
    startNum = minPossibleStart;
  }

  const result: Tile[] = [];
  const remainingNonJokers = [...nonJokers];
  const remainingJokers = [...jokers];

  for (let n = startNum; n < startNum + T; n++) {
    const idx = remainingNonJokers.findIndex(t => t.number === n);
    if (idx !== -1) {
      result.push(remainingNonJokers.splice(idx, 1)[0]);
    } else if (remainingJokers.length > 0) {
      result.push(remainingJokers.shift()!);
    }
  }

  return [...result, ...remainingNonJokers, ...remainingJokers];
}

/**
 * Sorts tiles in any meld:
 * - If it is a Run: sorts strictly in ascending consecutive sequence.
 * - If it is a Group: sorts by consistent color order (Red, Blue, Yellow, Black, Joker).
 * - Otherwise: sorts by number ascending.
 */
export function sortMeldTiles(tiles: Tile[]): Tile[] {
  if (tiles.length <= 1) return [...tiles];

  const runRes = validateRun(tiles);
  if (runRes.valid) {
    return sortRunTiles(tiles);
  }

  const groupRes = validateGroup(tiles);
  if (groupRes.valid) {
    const colorOrder: Record<string, number> = { red: 0, blue: 1, yellow: 2, black: 3, wild: 4 };
    return [...tiles].sort((a, b) => {
      if (a.isJoker && !b.isJoker) return 1;
      if (!a.isJoker && b.isJoker) return -1;
      return (colorOrder[a.color] ?? 99) - (colorOrder[b.color] ?? 99);
    });
  }

  return [...tiles].sort((a, b) => {
    if (a.isJoker && !b.isJoker) return 1;
    if (!a.isJoker && b.isJoker) return -1;
    return a.number - b.number;
  });
}

