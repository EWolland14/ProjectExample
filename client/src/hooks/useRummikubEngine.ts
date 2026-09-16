import { useState, useEffect, useRef, useCallback } from 'react';
import {
  GameState,
  Player,
  Meld,
  Tile,
  TurnSnapshot,
  generateTilePool,
  shufflePool,
  drawTiles,
  sortTilesByGroup,
  sortTilesByRun,
  validateBoard,
  validateInitialMeld,
  validateRegularTurn,
  executeBotTurn,
  calculateFinalScores,
  ScoreSummary,
} from '@rummikub/shared';
import { io, Socket } from 'socket.io-client';
import confetti from 'canvas-confetti';

interface UseRummikubOptions {
  soundEffects: {
    playTileClick: () => void;
    playTilePlace: () => void;
    playDraw: () => void;
    playValidChime: () => void;
    playErrorBuzz: () => void;
    playWarningTick: () => void;
    playVictoryFanfare: () => void;
  };
}

export function useRummikubEngine({ soundEffects }: UseRummikubOptions) {
  // Game State
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string>('p1');
  const [roomCode, setRoomCode] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(false);

  // Modals & UI State
  const [isModeSelectOpen, setIsModeSelectOpen] = useState<boolean>(true);
  const [isLobbyOpen, setIsLobbyOpen] = useState<boolean>(false);
  const [isCurtainOpen, setIsCurtainOpen] = useState<boolean>(false);
  const [curtainNextPlayer, setCurtainNextPlayer] = useState<string>('');
  const [isGameOverOpen, setIsGameOverOpen] = useState<boolean>(false);
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);

  // Local selection & tracking
  const [selectedTileIds, setSelectedTileIds] = useState<Set<string>>(new Set());
  const [newTileIds, setNewTileIds] = useState<Set<string>>(new Set());

  // Socket reference for Online mode
  const socketRef = useRef<Socket | null>(null);

  // Turn timer interval ref
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // ----------------------------------------------------
  // ONLINE SOCKET LISTENERS
  // ----------------------------------------------------
  const connectSocket = useCallback(() => {
    if (socketRef.current) return socketRef.current;

    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });

    socket.on('game_state_sync', (syncedState: GameState) => {
      setGameState(syncedState);
      if (syncedState.phase === 'ended' && syncedState.scoreSummaries) {
        setIsGameOverOpen(true);
        soundEffects.playVictoryFanfare();
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    });

    socket.on('room_code', (code: string) => {
      setRoomCode(code);
      setIsLobbyOpen(true);
    });

    socket.on('turn_timeout_alert', () => {
      soundEffects.playErrorBuzz();
    });

    socket.on('game_over', (_summaries: ScoreSummary[]) => {
      setIsGameOverOpen(true);
      soundEffects.playVictoryFanfare();
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    });

    socketRef.current = socket;
    return socket;
  }, [soundEffects]);

  // ----------------------------------------------------
  // LOCAL TURN TIMER (Solo AI & Pass and Play)
  // ----------------------------------------------------
  useEffect(() => {
    if (!gameState || gameState.phase !== 'playing' || gameState.mode === 'online') {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setGameState(prev => {
        if (!prev || prev.phase !== 'playing') return prev;

        const newTimer = prev.turnTimer - 1;

        if (newTimer <= 10 && newTimer > 0) {
          soundEffects.playWarningTick();
        }

        if (newTimer <= 0) {
          // Time expired! Revert turn and penalize
          soundEffects.playErrorBuzz();
          return handleLocalTurnTimeout(prev);
        }

        return { ...prev, turnTimer: newTimer };
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [gameState?.phase, gameState?.mode, gameState?.activePlayerIndex, soundEffects]);

  // ----------------------------------------------------
  // START SOLO VS AI
  // ----------------------------------------------------
  const startSoloAI = (botCount: number, difficulty: 'easy' | 'hard', playerName: string) => {
    let pool = shufflePool(generateTilePool());

    const humanPlayer: Player = {
      id: 'human-1',
      name: playerName.trim() || 'Player 1',
      isBot: false,
      rack: [],
      hasInitialMeld: false,
      score: 0,
      isConnected: true,
    };

    const players: Player[] = [humanPlayer];
    for (let i = 1; i <= botCount; i++) {
      players.push({
        id: `bot-${i}`,
        name: `Bot ${i} (${difficulty === 'hard' ? 'Pro' : 'Novice'})`,
        isBot: true,
        botDifficulty: difficulty,
        rack: [],
        hasInitialMeld: false,
        score: 0,
        isConnected: true,
      });
    }

    // Deal 14 tiles each
    const dealtPlayers = players.map(p => {
      const { drawn, remaining } = drawTiles(pool, 14);
      pool = remaining;
      return { ...p, rack: drawn };
    });

    const initialState: GameState = {
      id: 'local-ai-match',
      mode: 'ai',
      phase: 'playing',
      board: [],
      pool,
      players: dealtPlayers,
      activePlayerIndex: 0,
      turnTimer: 60,
      turnDuration: 60,
      turnStartTime: Date.now(),
      snapshot: {
        board: [],
        playerRack: [...dealtPlayers[0].rack],
        activePlayerId: dealtPlayers[0].id,
      },
      winnerId: null,
      lastActionMessage: `Game started! Your turn, ${humanPlayer.name}.`,
    };

    setGameState(initialState);
    setMyPlayerId(humanPlayer.id);
    setSelectedTileIds(new Set());
    setNewTileIds(new Set());
    setIsModeSelectOpen(false);
    setIsGameOverOpen(false);
    soundEffects.playDraw();
  };

  // ----------------------------------------------------
  // START PASS & PLAY
  // ----------------------------------------------------
  const startPassAndPlay = (playerNames: string[]) => {
    let pool = shufflePool(generateTilePool());

    const players: Player[] = playerNames.map((name, idx) => {
      const { drawn, remaining } = drawTiles(pool, 14);
      pool = remaining;
      return {
        id: `local-p-${idx + 1}`,
        name: name.trim() || `Player ${idx + 1}`,
        isBot: false,
        rack: drawn,
        hasInitialMeld: false,
        score: 0,
        isConnected: true,
      };
    });

    const initialState: GameState = {
      id: 'pass-and-play-match',
      mode: 'pass_and_play',
      phase: 'playing',
      board: [],
      pool,
      players,
      activePlayerIndex: 0,
      turnTimer: 60,
      turnDuration: 60,
      turnStartTime: Date.now(),
      snapshot: {
        board: [],
        playerRack: [...players[0].rack],
        activePlayerId: players[0].id,
      },
      winnerId: null,
      lastActionMessage: `Game started! ${players[0].name}'s turn.`,
    };

    setGameState(initialState);
    setMyPlayerId(players[0].id);
    setSelectedTileIds(new Set());
    setNewTileIds(new Set());
    setIsModeSelectOpen(false);
    setIsGameOverOpen(false);
    soundEffects.playDraw();
  };

  // ----------------------------------------------------
  // ONLINE MULTIPLAYER ACTIONS
  // ----------------------------------------------------
  const createOnlineRoom = (playerName: string) => {
    const socket = connectSocket();
    socket.emit('create_room', { playerName, mode: 'online' }, (res: any) => {
      if (res.success) {
        setIsHost(true);
        setRoomCode(res.roomCode);
        setIsModeSelectOpen(false);
        setIsLobbyOpen(true);
      }
    });
  };

  const joinOnlineRoom = (code: string, playerName: string) => {
    const socket = connectSocket();
    socket.emit('join_room', { roomCode: code, playerName }, (res: any) => {
      if (res.success) {
        setIsHost(false);
        setRoomCode(code);
        setIsModeSelectOpen(false);
        setIsLobbyOpen(true);
      } else {
        soundEffects.playErrorBuzz();
        alert(res.error || 'Could not join room');
      }
    });
  };

  const addOnlineBot = (difficulty: 'easy' | 'hard') => {
    socketRef.current?.emit('add_bot', { difficulty });
  };

  const startOnlineGame = () => {
    socketRef.current?.emit('start_game');
    setIsLobbyOpen(false);
  };

  const leaveOnlineRoom = () => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setIsLobbyOpen(false);
    setIsModeSelectOpen(true);
  };

  // ----------------------------------------------------
  // TILE MANIPULATION: RACK & TABLE
  // ----------------------------------------------------

  // 1. Move tile from Rack to Board (new meld)
  const createNewMeld = (tile: Tile) => {
    if (!gameState) return;
    const activePlayer = gameState.players[gameState.activePlayerIndex];

    // Remove from rack
    const newRack = activePlayer.rack.filter(t => t.id !== tile.id);

    // Create new meld with this tile
    const newMeld: Meld = {
      id: `meld-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tiles: [tile],
    };

    const newBoard = [...gameState.board, newMeld];

    setNewTileIds(prev => new Set(prev).add(tile.id));
    soundEffects.playTilePlace();

    if (gameState.mode === 'online') {
      socketRef.current?.emit('update_board_and_rack', { board: newBoard, rack: newRack });
    } else {
      setGameState(prev => {
        if (!prev) return prev;
        const updatedPlayers = [...prev.players];
        updatedPlayers[prev.activePlayerIndex] = { ...activePlayer, rack: newRack };
        return { ...prev, board: newBoard, players: updatedPlayers };
      });
    }
  };

  // 2. Drop tile into existing Meld on Board (insert at index)
  const dropTileIntoMeld = (tile: Tile, targetMeldId: string, insertIndex: number) => {
    if (!gameState) return;
    const activePlayer = gameState.players[gameState.activePlayerIndex];

    // Remove tile from source: check if it came from rack or from another meld
    let newRack = [...activePlayer.rack];
    let newBoard = gameState.board.map(m => ({ id: m.id, tiles: [...m.tiles] }));

    const isInRack = activePlayer.rack.some(t => t.id === tile.id);

    if (isInRack) {
      newRack = newRack.filter(t => t.id !== tile.id);
      setNewTileIds(prev => new Set(prev).add(tile.id));
    } else {
      // Remove from existing meld on board
      newBoard = newBoard.map(m => ({
        id: m.id,
        tiles: m.tiles.filter(t => t.id !== tile.id),
      }));
    }

    // Insert into target meld
    const targetMeld = newBoard.find(m => m.id === targetMeldId);
    if (targetMeld) {
      const safeIdx = Math.max(0, Math.min(insertIndex, targetMeld.tiles.length));
      targetMeld.tiles.splice(safeIdx, 0, tile);
    }

    // Filter out any empty melds
    newBoard = newBoard.filter(m => m.tiles.length > 0);

    soundEffects.playTilePlace();

    if (gameState.mode === 'online') {
      socketRef.current?.emit('update_board_and_rack', { board: newBoard, rack: newRack });
    } else {
      setGameState(prev => {
        if (!prev) return prev;
        const updatedPlayers = [...prev.players];
        updatedPlayers[prev.activePlayerIndex] = { ...activePlayer, rack: newRack };
        return { ...prev, board: newBoard, players: updatedPlayers };
      });
    }
  };

  // 3. Drop tile into Rack (re-order rack or take back tile placed this turn)
  const dropTileIntoRack = (tile: Tile, insertIndex: number) => {
    if (!gameState) return;
    const activePlayer = gameState.players[gameState.activePlayerIndex];

    const isInRack = activePlayer.rack.some(t => t.id === tile.id);

    // If tile is on board, only allow pulling back to rack if it was placed THIS turn!
    if (!isInRack) {
      if (!newTileIds.has(tile.id)) {
        soundEffects.playErrorBuzz();
        return; // Cannot steal table tiles that originated before this turn!
      }
    }

    let newRack = activePlayer.rack.filter(t => t.id !== tile.id);
    let newBoard = gameState.board.map(m => ({
      id: m.id,
      tiles: m.tiles.filter(t => t.id !== tile.id),
    })).filter(m => m.tiles.length > 0);

    const safeIdx = Math.max(0, Math.min(insertIndex, newRack.length));
    newRack.splice(safeIdx, 0, tile);

    setNewTileIds(prev => {
      const next = new Set(prev);
      next.delete(tile.id);
      return next;
    });

    soundEffects.playTileClick();

    if (gameState.mode === 'online') {
      socketRef.current?.emit('update_board_and_rack', { board: newBoard, rack: newRack });
    } else {
      setGameState(prev => {
        if (!prev) return prev;
        const updatedPlayers = [...prev.players];
        updatedPlayers[prev.activePlayerIndex] = { ...activePlayer, rack: newRack };
        return { ...prev, board: newBoard, players: updatedPlayers };
      });
    }
  };

  // 4. Double click tile in rack to quickly auto-play it or selected trio
  const handleTileDoubleClick = (tile: Tile) => {
    if (!gameState) return;
    const activePlayer = gameState.players[gameState.activePlayerIndex];

    // If already 3+ tiles selected, auto-create meld
    if (selectedTileIds.size >= 3 && selectedTileIds.has(tile.id)) {
      const selectedTiles = activePlayer.rack.filter(t => selectedTileIds.has(t.id));
      playSelectedTiles(selectedTiles);
      return;
    }

    // Otherwise, create a new single-tile meld
    createNewMeld(tile);
  };

  // 5. Play selected tiles directly to board
  const playSelectedTiles = (selectedTiles: Tile[]) => {
    if (!gameState || selectedTiles.length === 0) return;
    const activePlayer = gameState.players[gameState.activePlayerIndex];

    const selectedIds = new Set(selectedTiles.map(t => t.id));
    const newRack = activePlayer.rack.filter(t => !selectedIds.has(t.id));

    const newMeld: Meld = {
      id: `meld-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tiles: selectedTiles,
    };

    const newBoard = [...gameState.board, newMeld];

    setNewTileIds(prev => {
      const next = new Set(prev);
      selectedTiles.forEach(t => next.add(t.id));
      return next;
    });

    setSelectedTileIds(new Set());
    soundEffects.playTilePlace();

    if (gameState.mode === 'online') {
      socketRef.current?.emit('update_board_and_rack', { board: newBoard, rack: newRack });
    } else {
      setGameState(prev => {
        if (!prev) return prev;
        const updatedPlayers = [...prev.players];
        updatedPlayers[prev.activePlayerIndex] = { ...activePlayer, rack: newRack };
        return { ...prev, board: newBoard, players: updatedPlayers };
      });
    }
  };

  // 6. Toggle tile selection
  const handleTileClick = (tile: Tile) => {
    soundEffects.playTileClick();
    setSelectedTileIds(prev => {
      const next = new Set(prev);
      if (next.has(tile.id)) {
        next.delete(tile.id);
      } else {
        next.add(tile.id);
      }
      return next;
    });
  };

  // 7. Sort Rack By Group / 777
  const sortRackByGroup = () => {
    if (!gameState) return;
    soundEffects.playTileClick();
    const activePlayer = gameState.players[gameState.activePlayerIndex];
    const sorted = sortTilesByGroup(activePlayer.rack);

    setGameState(prev => {
      if (!prev) return prev;
      const updatedPlayers = [...prev.players];
      updatedPlayers[prev.activePlayerIndex] = { ...activePlayer, rack: sorted };
      return { ...prev, players: updatedPlayers };
    });
  };

  // 8. Sort Rack By Run / 789
  const sortRackByRun = () => {
    if (!gameState) return;
    soundEffects.playTileClick();
    const activePlayer = gameState.players[gameState.activePlayerIndex];
    const sorted = sortTilesByRun(activePlayer.rack);

    setGameState(prev => {
      if (!prev) return prev;
      const updatedPlayers = [...prev.players];
      updatedPlayers[prev.activePlayerIndex] = { ...activePlayer, rack: sorted };
      return { ...prev, players: updatedPlayers };
    });
  };

  // ----------------------------------------------------
  // TURN ACTIONS: END TURN, REVERT, DRAW & PASS
  // ----------------------------------------------------

  // Revert Turn
  const revertTurn = () => {
    if (!gameState || !gameState.snapshot) return;
    soundEffects.playTileClick();

    if (gameState.mode === 'online') {
      socketRef.current?.emit('revert_turn');
      return;
    }

    // Local revert
    const activePlayer = gameState.players[gameState.activePlayerIndex];
    const restoredBoard = gameState.snapshot.board.map(m => ({ id: m.id, tiles: [...m.tiles] }));
    const restoredRack = [...gameState.snapshot.playerRack];

    setNewTileIds(new Set());
    setSelectedTileIds(new Set());

    setGameState(prev => {
      if (!prev) return prev;
      const updatedPlayers = [...prev.players];
      updatedPlayers[prev.activePlayerIndex] = { ...activePlayer, rack: restoredRack };
      return {
        ...prev,
        board: restoredBoard,
        players: updatedPlayers,
        lastActionMessage: `${activePlayer.name} reverted their turn.`,
      };
    });
  };

  // Draw & Pass
  const drawAndPass = () => {
    if (!gameState) return;
    soundEffects.playDraw();

    if (gameState.mode === 'online') {
      socketRef.current?.emit('draw_and_pass');
      return;
    }

    // Local Draw & Pass
    const activePlayer = gameState.players[gameState.activePlayerIndex];

    // Revert board to start of turn
    let board = gameState.snapshot ? gameState.snapshot.board.map(m => ({ id: m.id, tiles: [...m.tiles] })) : gameState.board;
    let rack = gameState.snapshot ? [...gameState.snapshot.playerRack] : [...activePlayer.rack];
    let pool = [...gameState.pool];

    if (pool.length > 0) {
      const { drawn, remaining } = drawTiles(pool, 1);
      pool = remaining;
      rack.push(...drawn);
    }

    setNewTileIds(new Set());
    setSelectedTileIds(new Set());

    advanceLocalTurn(board, rack, pool, `${activePlayer.name} drew a tile and passed.`);
  };

  // End Turn
  const endTurn = () => {
    if (!gameState || !gameState.snapshot) return;

    if (gameState.mode === 'online') {
      socketRef.current?.emit('end_turn', (res: any) => {
        if (!res.success) {
          soundEffects.playErrorBuzz();
          alert(res.error);
        } else {
          soundEffects.playValidChime();
        }
      });
      return;
    }

    // Local Validation
    const activePlayer = gameState.players[gameState.activePlayerIndex];
    const snapshot = gameState.snapshot;

    if (!activePlayer.hasInitialMeld) {
      const initialRes = validateInitialMeld(snapshot.board, gameState.board, snapshot.playerRack, activePlayer.rack);
      if (!initialRes.valid) {
        soundEffects.playErrorBuzz();
        alert(initialRes.error || 'Initial meld requires 30+ points from your rack!');
        return;
      }
      activePlayer.hasInitialMeld = true;
    } else {
      const regularRes = validateRegularTurn(snapshot.board, gameState.board, snapshot.playerRack, activePlayer.rack);
      if (!regularRes.valid) {
        soundEffects.playErrorBuzz();
        alert(regularRes.error || 'Invalid move!');
        return;
      }
    }

    soundEffects.playValidChime();
    setNewTileIds(new Set());
    setSelectedTileIds(new Set());

    // Check WIN condition
    if (activePlayer.rack.length === 0) {
      handleLocalGameWon(activePlayer.id);
      return;
    }

    advanceLocalTurn(gameState.board, activePlayer.rack, gameState.pool, `${activePlayer.name} finished their turn.`);
  };

  // Advance local turn to next player
  const advanceLocalTurn = (board: Meld[], activeRack: Tile[], pool: Tile[], message: string) => {
    setGameState(prev => {
      if (!prev) return prev;

      const cleanBoard = board.filter(m => m.tiles.length > 0);
      const updatedPlayers = [...prev.players];
      updatedPlayers[prev.activePlayerIndex] = {
        ...updatedPlayers[prev.activePlayerIndex],
        rack: activeRack,
      };

      const nextIndex = (prev.activePlayerIndex + 1) % prev.players.length;
      const nextPlayer = updatedPlayers[nextIndex];

      const newSnapshot: TurnSnapshot = {
        board: cleanBoard.map(m => ({ id: m.id, tiles: [...m.tiles] })),
        playerRack: [...nextPlayer.rack],
        activePlayerId: nextPlayer.id,
      };

      // Pass & Play curtain check
      if (prev.mode === 'pass_and_play') {
        setCurtainNextPlayer(nextPlayer.name);
        setIsCurtainOpen(true);
        setMyPlayerId(nextPlayer.id);
      }

      // Schedule Bot turn if next player is a Bot
      if (nextPlayer.isBot) {
        scheduleLocalBotTurn(nextIndex);
      }

      return {
        ...prev,
        board: cleanBoard,
        pool,
        players: updatedPlayers,
        activePlayerIndex: nextIndex,
        turnTimer: 60,
        turnStartTime: Date.now(),
        snapshot: newSnapshot,
        lastActionMessage: message,
      };
    });
  };

  // Local Bot Execution
  const scheduleLocalBotTurn = (botIndex: number) => {
    setTimeout(() => {
      setGameState(prev => {
        if (!prev || prev.phase !== 'playing' || prev.activePlayerIndex !== botIndex) return prev;

        const botPlayer = prev.players[botIndex];
        const botResult = executeBotTurn(botPlayer, prev.board);

        let board = botResult.newBoard;
        let rack = botResult.newRack;
        let pool = [...prev.pool];

        if (botResult.played) {
          soundEffects.playTilePlace();
          botPlayer.hasInitialMeld = true;

          // Check if bot won!
          if (rack.length === 0) {
            handleLocalGameWon(botPlayer.id);
            return prev;
          }
        } else {
          // Bot draws 1 tile
          if (pool.length > 0) {
            const { drawn, remaining } = drawTiles(pool, 1);
            pool = remaining;
            rack.push(...drawn);
          }
        }

        // Clean up and advance
        const cleanBoard = board.filter(m => m.tiles.length > 0);
        const updatedPlayers = [...prev.players];
        updatedPlayers[botIndex] = { ...botPlayer, rack };

        const nextIndex = (botIndex + 1) % prev.players.length;
        const nextPlayer = updatedPlayers[nextIndex];

        if (prev.mode === 'pass_and_play') {
          setCurtainNextPlayer(nextPlayer.name);
          setIsCurtainOpen(true);
          setMyPlayerId(nextPlayer.id);
        }

        if (nextPlayer.isBot) {
          scheduleLocalBotTurn(nextIndex);
        }

        return {
          ...prev,
          board: cleanBoard,
          pool,
          players: updatedPlayers,
          activePlayerIndex: nextIndex,
          turnTimer: 60,
          turnStartTime: Date.now(),
          snapshot: {
            board: cleanBoard.map(m => ({ id: m.id, tiles: [...m.tiles] })),
            playerRack: [...nextPlayer.rack],
            activePlayerId: nextPlayer.id,
          },
          lastActionMessage: botResult.actionDescription,
        };
      });
    }, 1200);
  };

  // Local turn timeout with 3-tile penalty
  const handleLocalTurnTimeout = (prev: GameState): GameState => {
    const activePlayer = prev.players[prev.activePlayerIndex];
    const snapshot = prev.snapshot;

    let board = snapshot ? snapshot.board.map(m => ({ id: m.id, tiles: [...m.tiles] })) : prev.board;
    let rack = snapshot ? [...snapshot.playerRack] : [...activePlayer.rack];
    let pool = [...prev.pool];

    const penaltyCount = Math.min(3, pool.length);
    if (penaltyCount > 0) {
      const { drawn, remaining } = drawTiles(pool, penaltyCount);
      pool = remaining;
      rack.push(...drawn);
    }

    const cleanBoard = board.filter(m => m.tiles.length > 0);
    const updatedPlayers = [...prev.players];
    updatedPlayers[prev.activePlayerIndex] = { ...activePlayer, rack };

    const nextIndex = (prev.activePlayerIndex + 1) % prev.players.length;
    const nextPlayer = updatedPlayers[nextIndex];

    if (nextPlayer.isBot) {
      scheduleLocalBotTurn(nextIndex);
    }

    return {
      ...prev,
      board: cleanBoard,
      pool,
      players: updatedPlayers,
      activePlayerIndex: nextIndex,
      turnTimer: 60,
      turnStartTime: Date.now(),
      snapshot: {
        board: cleanBoard.map(m => ({ id: m.id, tiles: [...m.tiles] })),
        playerRack: [...nextPlayer.rack],
        activePlayerId: nextPlayer.id,
      },
      lastActionMessage: `Time expired for ${activePlayer.name}! Drew 3 penalty tiles.`,
    };
  };

  // Local Game Won
  const handleLocalGameWon = (winnerId: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      const summaries = calculateFinalScores(prev.players, winnerId);
      const winner = prev.players.find(p => p.id === winnerId);

      setIsGameOverOpen(true);
      soundEffects.playVictoryFanfare();
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });

      return {
        ...prev,
        phase: 'ended',
        winnerId,
        scoreSummaries: summaries,
        lastActionMessage: `🎉 ${winner?.name || 'Player'} cleared their rack and won the game!`,
      };
    });
  };

  // Validation calculations
  const boardValidation = gameState ? validateBoard(gameState.board) : { valid: true, invalidMeldIndices: [], totalPoints: 0, errors: [] };
  const activePlayer = gameState ? gameState.players[gameState.activePlayerIndex] : null;
  const isMyTurn = gameState ? (gameState.mode === 'online' ? activePlayer?.id === myPlayerId : !activePlayer?.isBot) : false;
  const startRackCount = gameState?.snapshot ? gameState.snapshot.playerRack.length : 0;
  const currentRackCount = activePlayer ? activePlayer.rack.length : 0;
  const tilesPlayedThisTurn = Math.max(0, startRackCount - currentRackCount);

  const canEndTurn = isMyTurn && boardValidation.valid && tilesPlayedThisTurn > 0;
  const canRevert = isMyTurn && (tilesPlayedThisTurn > 0 || newTileIds.size > 0);

  return {
    gameState,
    myPlayerId,
    roomCode,
    isHost,
    isModeSelectOpen,
    isLobbyOpen,
    isCurtainOpen,
    curtainNextPlayer,
    isGameOverOpen,
    isRulesOpen,
    selectedTileIds,
    newTileIds,
    boardValidation,
    tilesPlayedThisTurn,
    canEndTurn,
    canRevert,
    isMyTurn,
    setIsRulesOpen,
    setIsModeSelectOpen,
    setIsGameOverOpen,
    startSoloAI,
    startPassAndPlay,
    createOnlineRoom,
    joinOnlineRoom,
    addOnlineBot,
    startOnlineGame,
    leaveOnlineRoom,
    createNewMeld,
    dropTileIntoMeld,
    dropTileIntoRack,
    handleTileClick,
    handleTileDoubleClick,
    playSelectedTiles,
    clearSelection: () => setSelectedTileIds(new Set()),
    sortRackByGroup,
    sortRackByRun,
    revertTurn,
    drawAndPass,
    endTurn,
    revealCurtain: () => setIsCurtainOpen(false),
  };
}
