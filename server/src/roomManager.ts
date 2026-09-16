import {
  GameState,
  Player,
  Meld,
  Tile,
  GameMode,
  TurnSnapshot,
  generateTilePool,
  shufflePool,
  drawTiles,
  validateInitialMeld,
  validateRegularTurn,
  executeBotTurn,
  calculateFinalScores,
} from '@rummikub/shared';
import { Server as SocketIOServer } from 'socket.io';

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

export interface Room {
  code: string;
  hostSocketId: string;
  state: GameState;
  playerSockets: Map<string, string>; // playerId -> socketId
  socketToPlayer: Map<string, string>; // socketId -> playerId
  timerInterval: NodeJS.Timeout | null;
  consecutivePassCount: number;
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  public createRoom(socketId: string, playerName: string, mode: GameMode): { roomCode: string; playerId: string } {
    let code = generateRoomCode();
    while (this.rooms.has(code)) {
      code = generateRoomCode();
    }

    const playerId = `player-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const hostPlayer: Player = {
      id: playerId,
      name: playerName || 'Host',
      isBot: false,
      rack: [],
      hasInitialMeld: false,
      score: 0,
      isConnected: true,
    };

    const state: GameState = {
      id: code,
      mode,
      phase: 'lobby',
      board: [],
      pool: [],
      players: [hostPlayer],
      activePlayerIndex: 0,
      turnTimer: 60,
      turnDuration: 60,
      turnStartTime: Date.now(),
      snapshot: null,
      winnerId: null,
      lastActionMessage: `Room created by ${hostPlayer.name}`,
    };

    const room: Room = {
      code,
      hostSocketId: socketId,
      state,
      playerSockets: new Map([[playerId, socketId]]),
      socketToPlayer: new Map([[socketId, playerId]]),
      timerInterval: null,
      consecutivePassCount: 0,
    };

    this.rooms.set(code, room);
    return { roomCode: code, playerId };
  }

  public joinRoom(socketId: string, roomCode: string, playerName: string): { success: boolean; playerId?: string; error?: string } {
    const code = roomCode.trim().toUpperCase();
    const room = this.rooms.get(code);

    if (!room) {
      return { success: false, error: 'Room not found. Check the code and try again.' };
    }

    if (room.state.phase !== 'lobby') {
      return { success: false, error: 'Game is already in progress in this room.' };
    }

    if (room.state.players.length >= 4) {
      return { success: false, error: 'Room is full (maximum 4 players).' };
    }

    const playerId = `player-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newPlayer: Player = {
      id: playerId,
      name: playerName || `Player ${room.state.players.length + 1}`,
      isBot: false,
      rack: [],
      hasInitialMeld: false,
      score: 0,
      isConnected: true,
    };

    room.state.players.push(newPlayer);
    room.playerSockets.set(playerId, socketId);
    room.socketToPlayer.set(socketId, playerId);
    room.state.lastActionMessage = `${newPlayer.name} joined the lobby.`;

    this.broadcastState(room);
    return { success: true, playerId };
  }

  public addBot(socketId: string, difficulty: 'easy' | 'hard'): boolean {
    const room = this.getRoomBySocket(socketId);
    if (!room || room.state.phase !== 'lobby' || room.state.players.length >= 4) {
      return false;
    }

    const botNumber = room.state.players.filter(p => p.isBot).length + 1;
    const botId = `bot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const bot: Player = {
      id: botId,
      name: `Bot ${botNumber} (${difficulty === 'hard' ? 'Pro' : 'Novice'})`,
      isBot: true,
      botDifficulty: difficulty,
      rack: [],
      hasInitialMeld: false,
      score: 0,
      isConnected: true,
    };

    room.state.players.push(bot);
    room.state.lastActionMessage = `${bot.name} was added to the room.`;
    this.broadcastState(room);
    return true;
  }

  public removePlayer(socketId: string, targetPlayerId: string): boolean {
    const room = this.getRoomBySocket(socketId);
    if (!room || room.state.phase !== 'lobby') return false;

    // Only host can kick or remove bots
    if (room.hostSocketId !== socketId) return false;

    const idx = room.state.players.findIndex(p => p.id === targetPlayerId);
    if (idx !== -1 && room.state.players[idx].id !== room.socketToPlayer.get(socketId)) {
      const removed = room.state.players.splice(idx, 1)[0];
      const sId = room.playerSockets.get(targetPlayerId);
      if (sId) {
        room.socketToPlayer.delete(sId);
        room.playerSockets.delete(targetPlayerId);
      }
      room.state.lastActionMessage = `${removed.name} left the room.`;
      this.broadcastState(room);
      return true;
    }
    return false;
  }

  public startGame(socketId: string): boolean {
    const room = this.getRoomBySocket(socketId);
    if (!room || room.state.phase !== 'lobby') return false;
    if (room.state.players.length < 2) return false;

    // Generate pool and shuffle
    let pool = shufflePool(generateTilePool());

    // Deal 14 tiles to each player
    const updatedPlayers = room.state.players.map(player => {
      const { drawn, remaining } = drawTiles(pool, 14);
      pool = remaining;
      return {
        ...player,
        rack: drawn,
        hasInitialMeld: false,
      };
    });

    room.state.phase = 'playing';
    room.state.pool = pool;
    room.state.players = updatedPlayers;
    room.state.board = [];
    room.state.activePlayerIndex = 0;
    room.state.turnDuration = 60;
    room.state.turnTimer = 60;
    room.state.turnStartTime = Date.now();
    room.state.winnerId = null;
    room.consecutivePassCount = 0;

    // Capture initial turn snapshot
    const activePlayer = room.state.players[0];
    room.state.snapshot = {
      board: [],
      playerRack: [...activePlayer.rack],
      activePlayerId: activePlayer.id,
    };

    room.state.lastActionMessage = `Game started! It is ${activePlayer.name}'s turn.`;

    this.startTurnTimer(room);
    this.broadcastState(room);

    // If first player is a bot, trigger it
    if (activePlayer.isBot) {
      this.scheduleBotTurn(room);
    }

    return true;
  }

  public updateBoardAndRack(socketId: string, board: Meld[], rack: Tile[]): boolean {
    const room = this.getRoomBySocket(socketId);
    if (!room || room.state.phase !== 'playing') return false;

    const playerId = room.socketToPlayer.get(socketId);
    const activePlayer = room.state.players[room.state.activePlayerIndex];
    if (playerId !== activePlayer.id) return false;

    // Optimistic update of board and current active player's rack
    room.state.board = board;
    activePlayer.rack = rack;

    this.broadcastState(room);
    return true;
  }

  public revertTurn(socketId: string): boolean {
    const room = this.getRoomBySocket(socketId);
    if (!room || room.state.phase !== 'playing' || !room.state.snapshot) return false;

    const playerId = room.socketToPlayer.get(socketId);
    const activePlayer = room.state.players[room.state.activePlayerIndex];
    if (playerId !== activePlayer.id) return false;

    // Restore board and active player rack from snapshot
    room.state.board = room.state.snapshot.board.map(m => ({ id: m.id, tiles: [...m.tiles] }));
    activePlayer.rack = [...room.state.snapshot.playerRack];
    room.state.lastActionMessage = `${activePlayer.name} reset their turn.`;

    this.broadcastState(room);
    return true;
  }

  public endTurn(socketId: string): { success: boolean; error?: string } {
    const room = this.getRoomBySocket(socketId);
    if (!room || room.state.phase !== 'playing' || !room.state.snapshot) {
      return { success: false, error: 'Cannot end turn right now' };
    }

    const playerId = room.socketToPlayer.get(socketId);
    const activePlayer = room.state.players[room.state.activePlayerIndex];
    if (playerId !== activePlayer.id) {
      return { success: false, error: 'It is not your turn' };
    }

    const snapshot = room.state.snapshot;

    // Validate turn using core engine
    if (!activePlayer.hasInitialMeld) {
      const res = validateInitialMeld(snapshot.board, room.state.board, snapshot.playerRack, activePlayer.rack);
      if (!res.valid) {
        return { success: false, error: res.error || 'Initial meld requirements not met' };
      }
      activePlayer.hasInitialMeld = true;
    } else {
      const res = validateRegularTurn(snapshot.board, room.state.board, snapshot.playerRack, activePlayer.rack);
      if (!res.valid) {
        return { success: false, error: res.error || 'Invalid move' };
      }
    }

    // Turn is valid! Reset consecutive passes
    room.consecutivePassCount = 0;

    // Check WIN condition (player emptied rack)
    if (activePlayer.rack.length === 0) {
      this.handleGameWon(room, activePlayer.id);
      return { success: true };
    }

    this.advanceTurn(room, `${activePlayer.name} completed their turn.`);
    return { success: true };
  }

  public drawAndPass(socketId: string): boolean {
    const room = this.getRoomBySocket(socketId);
    if (!room || room.state.phase !== 'playing' || !room.state.snapshot) return false;

    const playerId = room.socketToPlayer.get(socketId);
    const activePlayer = room.state.players[room.state.activePlayerIndex];
    if (playerId !== activePlayer.id) return false;

    // Revert board to start of turn
    room.state.board = room.state.snapshot.board.map(m => ({ id: m.id, tiles: [...m.tiles] }));
    activePlayer.rack = [...room.state.snapshot.playerRack];

    // Draw 1 tile from pool if available
    if (room.state.pool.length > 0) {
      const { drawn, remaining } = drawTiles(room.state.pool, 1);
      room.state.pool = remaining;
      activePlayer.rack.push(...drawn);
    }

    room.consecutivePassCount++;

    // If pool is empty and all players have passed in a row, game ends
    if (room.state.pool.length === 0 && room.consecutivePassCount >= room.state.players.length) {
      this.handlePoolExhaustedGameEnd(room);
      return true;
    }

    this.advanceTurn(room, `${activePlayer.name} drew a tile and passed.`);
    return true;
  }

  public handleDisconnect(socketId: string): void {
    const room = this.getRoomBySocket(socketId);
    if (!room) return;

    const playerId = room.socketToPlayer.get(socketId);
    if (playerId) {
      const player = room.state.players.find(p => p.id === playerId);
      if (player) {
        player.isConnected = false;
      }
    }

    // If everyone left or room empty in lobby, destroy room
    const connectedCount = room.state.players.filter(p => !p.isBot && p.isConnected).length;
    if (connectedCount === 0) {
      if (room.timerInterval) clearInterval(room.timerInterval);
      this.rooms.delete(room.code);
      return;
    }

    this.broadcastState(room);
  }

  private startTurnTimer(room: Room): void {
    if (room.timerInterval) {
      clearInterval(room.timerInterval);
    }

    room.state.turnTimer = room.state.turnDuration;
    room.state.turnStartTime = Date.now();

    room.timerInterval = setInterval(() => {
      if (room.state.phase !== 'playing') {
        if (room.timerInterval) clearInterval(room.timerInterval);
        return;
      }

      room.state.turnTimer -= 1;

      if (room.state.turnTimer <= 0) {
        // Time is up! Handle penalty and turn expiration
        this.handleTurnTimeout(room);
      } else {
        // Broadcast timer tick to room
        this.io.to(room.code).emit('game_state_sync', room.state);
      }
    }, 1000);
  }

  private handleTurnTimeout(room: Room): void {
    const activePlayer = room.state.players[room.state.activePlayerIndex];
    const snapshot = room.state.snapshot;

    // Automatically revert the board and rack to start-of-turn snapshot
    if (snapshot) {
      room.state.board = snapshot.board.map(m => ({ id: m.id, tiles: [...m.tiles] }));
      activePlayer.rack = [...snapshot.playerRack];
    }

    // Force a 3-tile penalty draw
    const penaltyCount = Math.min(3, room.state.pool.length);
    if (penaltyCount > 0) {
      const { drawn, remaining } = drawTiles(room.state.pool, penaltyCount);
      room.state.pool = remaining;
      activePlayer.rack.push(...drawn);
    }

    this.io.to(room.code).emit('turn_timeout_alert', {
      playerId: activePlayer.id,
      penaltyTileCount: penaltyCount,
    });

    this.advanceTurn(
      room,
      `Time expired for ${activePlayer.name}! Board reverted + drew a 3-tile penalty.`
    );
  }

  private advanceTurn(room: Room, actionMessage: string): void {
    // Clean up empty melds on board
    room.state.board = room.state.board.filter(m => m.tiles.length > 0);

    // Next player
    room.state.activePlayerIndex = (room.state.activePlayerIndex + 1) % room.state.players.length;
    const nextPlayer = room.state.players[room.state.activePlayerIndex];

    // New start-of-turn snapshot
    room.state.snapshot = {
      board: room.state.board.map(m => ({ id: m.id, tiles: [...m.tiles] })),
      playerRack: [...nextPlayer.rack],
      activePlayerId: nextPlayer.id,
    };

    room.state.lastActionMessage = actionMessage;
    this.startTurnTimer(room);
    this.broadcastState(room);

    if (nextPlayer.isBot) {
      this.scheduleBotTurn(room);
    }
  }

  private scheduleBotTurn(room: Room): void {
    const activePlayer = room.state.players[room.state.activePlayerIndex];
    if (!activePlayer.isBot) return;

    setTimeout(() => {
      if (room.state.phase !== 'playing') return;
      const currentActive = room.state.players[room.state.activePlayerIndex];
      if (currentActive.id !== activePlayer.id) return;

      const botResult = executeBotTurn(activePlayer, room.state.board);

      if (botResult.played) {
        room.state.board = botResult.newBoard;
        activePlayer.rack = botResult.newRack;
        if (!activePlayer.hasInitialMeld) {
          activePlayer.hasInitialMeld = true;
        }

        if (activePlayer.rack.length === 0) {
          this.handleGameWon(room, activePlayer.id);
          return;
        }

        this.advanceTurn(room, botResult.actionDescription);
      } else {
        // Bot draws 1 tile and passes
        if (room.state.pool.length > 0) {
          const { drawn, remaining } = drawTiles(room.state.pool, 1);
          room.state.pool = remaining;
          activePlayer.rack.push(...drawn);
        }
        this.advanceTurn(room, botResult.actionDescription);
      }
    }, 1500); // 1.5s thinking delay for smooth UX
  }

  private handleGameWon(room: Room, winnerId: string): void {
    if (room.timerInterval) clearInterval(room.timerInterval);
    room.state.phase = 'ended';
    room.state.winnerId = winnerId;

    const summaries = calculateFinalScores(room.state.players, winnerId);
    room.state.scoreSummaries = summaries;

    const winner = room.state.players.find(p => p.id === winnerId);
    room.state.lastActionMessage = `🎉 ${winner?.name || 'Player'} cleared their rack and WON the game!`;

    this.broadcastState(room);
    this.io.to(room.code).emit('game_over', summaries);
  }

  private handlePoolExhaustedGameEnd(room: Room): void {
    if (room.timerInterval) clearInterval(room.timerInterval);
    room.state.phase = 'ended';

    // Player with lowest rack points wins
    let lowestPoints = Infinity;
    let winnerId = room.state.players[0].id;

    for (const p of room.state.players) {
      const pts = p.rack.reduce((sum, t) => sum + (t.isJoker ? 30 : t.number), 0);
      if (pts < lowestPoints) {
        lowestPoints = pts;
        winnerId = p.id;
      }
    }

    room.state.winnerId = winnerId;
    const summaries = calculateFinalScores(room.state.players, winnerId);
    room.state.scoreSummaries = summaries;

    const winner = room.state.players.find(p => p.id === winnerId);
    room.state.lastActionMessage = `Pool empty! ${winner?.name} has the fewest remaining points and wins!`;

    this.broadcastState(room);
    this.io.to(room.code).emit('game_over', summaries);
  }

  public broadcastState(room: Room): void {
    this.io.to(room.code).emit('game_state_sync', room.state);
  }

  public getRoomBySocket(socketId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.socketToPlayer.has(socketId) || room.hostSocketId === socketId) {
        return room;
      }
    }
    return undefined;
  }
}
