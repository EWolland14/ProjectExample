import { describe, it, expect } from 'vitest';
import {
  generateTilePool,
  sortTilesByGroup,
  sortTilesByRun,
} from '../tilePool.js';
import {
  validateGroup,
  validateRun,
  validateMeld,
  validateBoard,
  validateInitialMeld,
  validateRegularTurn,
  sortRunTiles,
  sortMeldTiles,
} from '../meldValidator.js';
import { calculateRackPoints, calculateFinalScores } from '../scoring.js';
import { Tile, Meld, Player } from '../../types.js';

describe('Tile Pool Generation', () => {
  it('generates exactly 106 tiles with 2 jokers', () => {
    const pool = generateTilePool();
    expect(pool.length).toBe(106);

    const jokers = pool.filter(t => t.isJoker);
    expect(jokers.length).toBe(2);

    const nonJokers = pool.filter(t => !t.isJoker);
    expect(nonJokers.length).toBe(104);

    // Each color should have 2 sets of 1..13 = 26 tiles
    for (const color of ['red', 'blue', 'yellow', 'black'] as const) {
      const colorTiles = nonJokers.filter(t => t.color === color);
      expect(colorTiles.length).toBe(26);
    }
  });

  it('sorts tiles correctly by group (777) and by run (789)', () => {
    const tiles: Tile[] = [
      { id: '1', number: 7, color: 'blue', isJoker: false },
      { id: '2', number: 3, color: 'red', isJoker: false },
      { id: '3', number: 7, color: 'red', isJoker: false },
      { id: 'j', number: 0, color: 'wild', isJoker: true },
    ];

    const sortedByGroup = sortTilesByGroup(tiles);
    expect(sortedByGroup[0].number).toBe(3);
    expect(sortedByGroup[1].number).toBe(7);
    expect(sortedByGroup[2].number).toBe(7);
    expect(sortedByGroup[3].isJoker).toBe(true);

    const sortedByRun = sortTilesByRun(tiles);
    expect(sortedByRun[0].color).toBe('red');
    expect(sortedByRun[0].number).toBe(3);
    expect(sortedByRun[1].color).toBe('red');
    expect(sortedByRun[1].number).toBe(7);
    expect(sortedByRun[2].color).toBe('blue');
    expect(sortedByRun[3].isJoker).toBe(true);
  });
});

describe('Meld Validation - Groups (Sets)', () => {
  it('validates a valid 3-tile group of different colors', () => {
    const group: Tile[] = [
      { id: '1', number: 8, color: 'red', isJoker: false },
      { id: '2', number: 8, color: 'blue', isJoker: false },
      { id: '3', number: 8, color: 'black', isJoker: false },
    ];
    const res = validateGroup(group);
    expect(res.valid).toBe(true);
    expect(res.points).toBe(24);
  });

  it('validates a valid 4-tile group of all 4 distinct colors', () => {
    const group: Tile[] = [
      { id: '1', number: 11, color: 'red', isJoker: false },
      { id: '2', number: 11, color: 'blue', isJoker: false },
      { id: '3', number: 11, color: 'yellow', isJoker: false },
      { id: '4', number: 11, color: 'black', isJoker: false },
    ];
    const res = validateGroup(group);
    expect(res.valid).toBe(true);
    expect(res.points).toBe(44);
  });

  it('validates a group with a Joker', () => {
    const group: Tile[] = [
      { id: '1', number: 9, color: 'red', isJoker: false },
      { id: '2', number: 9, color: 'blue', isJoker: false },
      { id: 'j', number: 0, color: 'wild', isJoker: true },
    ];
    const res = validateGroup(group);
    expect(res.valid).toBe(true);
    expect(res.points).toBe(27);
  });

  it('rejects a group with duplicate colors', () => {
    const group: Tile[] = [
      { id: '1', number: 8, color: 'red', isJoker: false },
      { id: '2', number: 8, color: 'red', isJoker: false },
      { id: '3', number: 8, color: 'black', isJoker: false },
    ];
    const res = validateGroup(group);
    expect(res.valid).toBe(false);
  });

  it('rejects a group with fewer than 3 tiles or more than 4 tiles', () => {
    const small: Tile[] = [
      { id: '1', number: 8, color: 'red', isJoker: false },
      { id: '2', number: 8, color: 'blue', isJoker: false },
    ];
    expect(validateGroup(small).valid).toBe(false);
  });

  it('rejects a group with mismatched numbers', () => {
    const mismatched: Tile[] = [
      { id: '1', number: 8, color: 'red', isJoker: false },
      { id: '2', number: 9, color: 'blue', isJoker: false },
      { id: '3', number: 8, color: 'black', isJoker: false },
    ];
    expect(validateGroup(mismatched).valid).toBe(false);
  });
});

describe('Meld Validation - Runs', () => {
  it('validates a valid consecutive run of same color', () => {
    const run: Tile[] = [
      { id: '1', number: 5, color: 'blue', isJoker: false },
      { id: '2', number: 6, color: 'blue', isJoker: false },
      { id: '3', number: 7, color: 'blue', isJoker: false },
      { id: '4', number: 8, color: 'blue', isJoker: false },
    ];
    const res = validateRun(run);
    expect(res.valid).toBe(true);
    expect(res.points).toBe(26);
  });

  it('validates a run with a Joker in the middle', () => {
    const run: Tile[] = [
      { id: '1', number: 4, color: 'red', isJoker: false },
      { id: 'j', number: 0, color: 'wild', isJoker: true },
      { id: '2', number: 6, color: 'red', isJoker: false },
    ];
    const res = validateRun(run);
    expect(res.valid).toBe(true);
    expect(res.points).toBe(15);
  });

  it('rejects a run wrapping around (12-13-1 is invalid in official rules)', () => {
    const wrapping: Tile[] = [
      { id: '1', number: 12, color: 'yellow', isJoker: false },
      { id: '2', number: 13, color: 'yellow', isJoker: false },
      { id: '3', number: 1, color: 'yellow', isJoker: false },
    ];
    expect(validateRun(wrapping).valid).toBe(false);
  });

  it('rejects a run with mixed colors', () => {
    const mixed: Tile[] = [
      { id: '1', number: 4, color: 'red', isJoker: false },
      { id: '2', number: 5, color: 'blue', isJoker: false },
      { id: '3', number: 6, color: 'red', isJoker: false },
    ];
    expect(validateRun(mixed).valid).toBe(false);
  });

  it('rejects a run with gaps not covered by jokers', () => {
    const gaps: Tile[] = [
      { id: '1', number: 4, color: 'red', isJoker: false },
      { id: '2', number: 7, color: 'red', isJoker: false },
      { id: '3', number: 8, color: 'red', isJoker: false },
    ];
    expect(validateRun(gaps).valid).toBe(false);
  });
});

describe('Board Validation', () => {
  it('validates a board with multiple valid melds', () => {
    const board: Meld[] = [
      {
        id: 'm1',
        tiles: [
          { id: '1', number: 5, color: 'blue', isJoker: false },
          { id: '2', number: 6, color: 'blue', isJoker: false },
          { id: '3', number: 7, color: 'blue', isJoker: false },
        ],
      },
      {
        id: 'm2',
        tiles: [
          { id: '4', number: 10, color: 'red', isJoker: false },
          { id: '5', number: 10, color: 'blue', isJoker: false },
          { id: '6', number: 10, color: 'black', isJoker: false },
        ],
      },
    ];
    const res = validateBoard(board);
    expect(res.valid).toBe(true);
    expect(res.invalidMeldIndices.length).toBe(0);
    expect(res.totalPoints).toBe(18 + 30);
  });

  it('flags invalid melds and returns their indices', () => {
    const board: Meld[] = [
      {
        id: 'm1',
        tiles: [
          { id: '1', number: 5, color: 'blue', isJoker: false },
          { id: '2', number: 6, color: 'blue', isJoker: false },
          { id: '3', number: 7, color: 'blue', isJoker: false },
        ],
      },
      {
        id: 'm2',
        tiles: [
          { id: '4', number: 10, color: 'red', isJoker: false },
          { id: '5', number: 10, color: 'red', isJoker: false }, // Duplicate color!
          { id: '6', number: 10, color: 'black', isJoker: false },
        ],
      },
    ];
    const res = validateBoard(board);
    expect(res.valid).toBe(false);
    expect(res.invalidMeldIndices).toEqual([1]);
  });
});

describe('Initial Meld (30-Point Rule)', () => {
  it('approves an initial meld totaling >= 30 points from own rack', () => {
    const startBoard: Meld[] = [];
    const endBoard: Meld[] = [
      {
        id: 'm1',
        tiles: [
          { id: '1', number: 10, color: 'red', isJoker: false },
          { id: '2', number: 10, color: 'blue', isJoker: false },
          { id: '3', number: 10, color: 'black', isJoker: false },
        ],
      },
    ];
    const startRack: Tile[] = [
      { id: '1', number: 10, color: 'red', isJoker: false },
      { id: '2', number: 10, color: 'blue', isJoker: false },
      { id: '3', number: 10, color: 'black', isJoker: false },
      { id: '4', number: 2, color: 'yellow', isJoker: false },
    ];
    const endRack: Tile[] = [
      { id: '4', number: 2, color: 'yellow', isJoker: false },
    ];

    const res = validateInitialMeld(startBoard, endBoard, startRack, endRack);
    expect(res.valid).toBe(true);
    expect(res.points).toBe(30);
  });

  it('rejects an initial meld totaling < 30 points', () => {
    const startBoard: Meld[] = [];
    const endBoard: Meld[] = [
      {
        id: 'm1',
        tiles: [
          { id: '1', number: 7, color: 'red', isJoker: false },
          { id: '2', number: 7, color: 'blue', isJoker: false },
          { id: '3', number: 7, color: 'black', isJoker: false },
        ],
      },
    ];
    const startRack: Tile[] = [
      { id: '1', number: 7, color: 'red', isJoker: false },
      { id: '2', number: 7, color: 'blue', isJoker: false },
      { id: '3', number: 7, color: 'black', isJoker: false },
    ];
    const endRack: Tile[] = [];

    const res = validateInitialMeld(startBoard, endBoard, startRack, endRack);
    expect(res.valid).toBe(false);
    expect(res.points).toBe(21);
    expect(res.error).toContain('at least 30 points');
  });

  it('rejects manipulating existing table tiles during initial meld', () => {
    const existingMeld: Meld = {
      id: 'existing',
      tiles: [
        { id: 'e1', number: 9, color: 'red', isJoker: false },
        { id: 'e2', number: 9, color: 'blue', isJoker: false },
        { id: 'e3', number: 9, color: 'black', isJoker: false },
      ],
    };
    const startBoard: Meld[] = [existingMeld];

    // Player added a 4th tile to existing table meld
    const endBoard: Meld[] = [
      {
        id: 'existing',
        tiles: [
          ...existingMeld.tiles,
          { id: 'e4', number: 9, color: 'yellow', isJoker: false },
        ],
      },
    ];
    const startRack: Tile[] = [
      { id: 'e4', number: 9, color: 'yellow', isJoker: false },
    ];
    const endRack: Tile[] = [];

    const res = validateInitialMeld(startBoard, endBoard, startRack, endRack);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Cannot manipulate existing table tiles');
  });
});

describe('Regular Turn Validation', () => {
  it('approves playing tiles onto table when table remains valid', () => {
    const startBoard: Meld[] = [
      {
        id: 'm1',
        tiles: [
          { id: '1', number: 5, color: 'blue', isJoker: false },
          { id: '2', number: 6, color: 'blue', isJoker: false },
          { id: '3', number: 7, color: 'blue', isJoker: false },
        ],
      },
    ];
    const endBoard: Meld[] = [
      {
        id: 'm1',
        tiles: [
          { id: '1', number: 5, color: 'blue', isJoker: false },
          { id: '2', number: 6, color: 'blue', isJoker: false },
          { id: '3', number: 7, color: 'blue', isJoker: false },
          { id: '4', number: 8, color: 'blue', isJoker: false },
        ],
      },
    ];
    const startRack: Tile[] = [{ id: '4', number: 8, color: 'blue', isJoker: false }];
    const endRack: Tile[] = [];

    const res = validateRegularTurn(startBoard, endBoard, startRack, endRack);
    expect(res.valid).toBe(true);
    expect(res.tilesPlayed).toBe(1);
  });

  it('rejects turn if 0 tiles were played from rack', () => {
    const board: Meld[] = [
      {
        id: 'm1',
        tiles: [
          { id: '1', number: 5, color: 'blue', isJoker: false },
          { id: '2', number: 6, color: 'blue', isJoker: false },
          { id: '3', number: 7, color: 'blue', isJoker: false },
        ],
      },
    ];
    const rack: Tile[] = [{ id: '4', number: 8, color: 'blue', isJoker: false }];

    const res = validateRegularTurn(board, board, rack, rack);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('play at least one tile');
  });

  it('rejects turn if player removes tiles from table into rack', () => {
    const startBoard: Meld[] = [
      {
        id: 'm1',
        tiles: [
          { id: '1', number: 5, color: 'blue', isJoker: false },
          { id: '2', number: 6, color: 'blue', isJoker: false },
          { id: '3', number: 7, color: 'blue', isJoker: false },
          { id: '4', number: 8, color: 'blue', isJoker: false },
        ],
      },
    ];
    // Table is missing tile 4
    const endBoard: Meld[] = [
      {
        id: 'm1',
        tiles: [
          { id: '1', number: 5, color: 'blue', isJoker: false },
          { id: '2', number: 6, color: 'blue', isJoker: false },
          { id: '3', number: 7, color: 'blue', isJoker: false },
        ],
      },
    ];
    const startRack: Tile[] = [];
    const endRack: Tile[] = [{ id: '4', number: 8, color: 'blue', isJoker: false }];

    const res = validateRegularTurn(startBoard, endBoard, startRack, endRack);
    expect(res.valid).toBe(false);
  });
});

describe('Scoring', () => {
  it('calculates rack penalties (Jokers = 30 points)', () => {
    const rack: Tile[] = [
      { id: '1', number: 7, color: 'red', isJoker: false },
      { id: '2', number: 13, color: 'black', isJoker: false },
      { id: 'j', number: 0, color: 'wild', isJoker: true },
    ];
    expect(calculateRackPoints(rack)).toBe(7 + 13 + 30);
  });

  it('calculates game over score summaries correctly', () => {
    const players: Player[] = [
      {
        id: 'p1',
        name: 'Alice',
        isBot: false,
        rack: [], // Winner!
        hasInitialMeld: true,
        score: 0,
      },
      {
        id: 'p2',
        name: 'Bob',
        isBot: false,
        rack: [{ id: '1', number: 10, color: 'red', isJoker: false }], // 10 pts
        hasInitialMeld: true,
        score: 0,
      },
      {
        id: 'p3',
        name: 'Charlie',
        isBot: false,
        rack: [{ id: 'j', number: 0, color: 'wild', isJoker: true }], // 30 pts
        hasInitialMeld: true,
        score: 0,
      },
    ];

    const summaries = calculateFinalScores(players, 'p1');
    const winnerSummary = summaries.find(s => s.playerId === 'p1');
    const bobSummary = summaries.find(s => s.playerId === 'p2');
    const charlieSummary = summaries.find(s => s.playerId === 'p3');

    expect(winnerSummary?.netScore).toBe(40); // 10 + 30
    expect(bobSummary?.netScore).toBe(-10);
    expect(charlieSummary?.netScore).toBe(-30);
  });
});

describe('Meld Sequential Ordering', () => {
  it('strictly sorts unordered run tiles into consecutive sequence', () => {
    // Exactly the user's reported case: [8, 12, 9, 10, 11]
    const tiles: Tile[] = [
      { id: '1', number: 8, color: 'black', isJoker: false },
      { id: '2', number: 12, color: 'black', isJoker: false },
      { id: '3', number: 9, color: 'black', isJoker: false },
      { id: '4', number: 10, color: 'black', isJoker: false },
      { id: '5', number: 11, color: 'black', isJoker: false },
    ];

    const sorted = sortRunTiles(tiles);
    const numbers = sorted.map(t => t.number);
    expect(numbers).toEqual([8, 9, 10, 11, 12]);
  });

  it('correctly slots a Joker into its numeric position in a run', () => {
    const tiles: Tile[] = [
      { id: '1', number: 4, color: 'red', isJoker: false },
      { id: '2', number: 6, color: 'red', isJoker: false },
      { id: 'j', number: 0, color: 'wild', isJoker: true },
    ];

    const sorted = sortRunTiles(tiles);
    expect(sorted[0].number).toBe(4);
    expect(sorted[1].isJoker).toBe(true);
    expect(sorted[2].number).toBe(6);
  });

  it('sorts groups in standard color order with Jokers last', () => {
    const tiles: Tile[] = [
      { id: '1', number: 9, color: 'black', isJoker: false },
      { id: '2', number: 9, color: 'red', isJoker: false },
      { id: '3', number: 9, color: 'blue', isJoker: false },
    ];

    const sorted = sortMeldTiles(tiles);
    expect(sorted[0].color).toBe('red');
    expect(sorted[1].color).toBe('blue');
    expect(sorted[2].color).toBe('black');
  });
});

