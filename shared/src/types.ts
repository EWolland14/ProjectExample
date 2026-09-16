export type Color = 'red' | 'blue' | 'yellow' | 'black';

export interface Tile {
  id: string;
  number: number; // 1-13 for numbers, 0 for Joker
  color: Color | 'wild';
  isJoker: boolean;
}

export interface Meld {
  id: string;
  tiles: Tile[];
}

export interface MeldValidationResult {
  valid: boolean;
  type?: 'group' | 'run';
  points: number;
  error?: string;
  // If jokers are present, the resolved values for display/scoring
  resolvedValues?: { id: string; number: number; color: Color }[];
}

export interface BoardValidationResult {
  valid: boolean;
  invalidMeldIndices: number[];
  totalPoints: number;
  errors: string[];
}

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  botDifficulty?: 'easy' | 'hard';
  rack: Tile[];
  hasInitialMeld: boolean;
  score: number;
  isConnected?: boolean;
}

export type GameMode = 'ai' | 'pass_and_play' | 'online';

export interface TurnSnapshot {
  board: Meld[];
  playerRack: Tile[];
  activePlayerId: string;
}

export interface ScoreSummary {
  playerId: string;
  playerName: string;
  remainingTileCount: number;
  rackPoints: number; // sum of numbers, jokers = 30
  netScore: number;   // winner gets sum of losers' points; losers get negative rackPoints
}

export interface GameState {
  id: string;
  mode: GameMode;
  phase: 'lobby' | 'playing' | 'ended';
  board: Meld[];
  pool: Tile[];
  players: Player[];
  activePlayerIndex: number;
  turnTimer: number; // in seconds
  turnDuration: number; // default 60
  turnStartTime: number;
  snapshot: TurnSnapshot | null;
  winnerId: string | null;
  scoreSummaries?: ScoreSummary[];
  lastActionMessage?: string;
}

// Client to Server WebSocket events
export interface ClientToServerEvents {
  create_room: (data: { playerName: string; mode: GameMode }, callback: (res: { success: boolean; roomCode?: string; error?: string }) => void) => void;
  join_room: (data: { roomCode: string; playerName: string }, callback: (res: { success: boolean; error?: string }) => void) => void;
  leave_room: () => void;
  add_bot: (data: { difficulty: 'easy' | 'hard' }) => void;
  remove_player: (data: { playerId: string }) => void;
  start_game: () => void;
  update_board_and_rack: (data: { board: Meld[]; rack: Tile[] }) => void;
  end_turn: (callback: (res: { success: boolean; error?: string }) => void) => void;
  revert_turn: () => void;
  draw_and_pass: () => void;
}

// Server to Client WebSocket events
export interface ServerToClientEvents {
  game_state_sync: (state: GameState) => void;
  room_code: (code: string) => void;
  player_error: (message: string) => void;
  turn_timeout_alert: (data: { playerId: string; penaltyTileCount: number }) => void;
  game_over: (summary: ScoreSummary[]) => void;
}
