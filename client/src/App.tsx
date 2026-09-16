import React from 'react';
import { useSoundEffects } from './hooks/useSoundEffects.js';
import { useRummikubEngine } from './hooks/useRummikubEngine.js';
import { Board } from './components/Board.js';
import { Rack } from './components/Rack.js';
import { TurnHUD } from './components/TurnHUD.js';
import {
  ModeSelectModal,
  RoomLobbyModal,
  PassAndPlayCurtain,
  GameOverModal,
  RulesModal,
} from './components/Modals.js';
import { Dices } from 'lucide-react';

export const App: React.FC = () => {
  const soundEffects = useSoundEffects();
  const engine = useRummikubEngine({ soundEffects });

  const {
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
    clearSelection,
    sortRackByGroup,
    sortRackByRun,
    revertTurn,
    drawAndPass,
    endTurn,
    revealCurtain,
  } = engine;

  // Current active player and local player rack
  const activePlayer = gameState ? gameState.players[gameState.activePlayerIndex] : null;
  const myPlayer = gameState
    ? gameState.players.find(p => p.id === myPlayerId) || activePlayer
    : null;

  const currentRack = myPlayer ? myPlayer.rack : [];
  const winner = gameState?.winnerId
    ? gameState.players.find(p => p.id === gameState.winnerId)
    : null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-stone-950 text-stone-100">
      {/* Top Navigation Header */}
      <header className="h-12 bg-stone-900 border-b border-stone-800 px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-700 border border-emerald-500 flex items-center justify-center font-black text-sm text-white shadow-sm">
            7
          </div>
          <h1 className="text-base font-black tracking-wider text-white">
            RUMMIKUB <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest ml-1">Live</span>
          </h1>
          {gameState && (
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-stone-800 text-stone-300 border border-stone-700">
              {gameState.mode === 'ai'
                ? 'Solo vs AI'
                : gameState.mode === 'pass_and_play'
                ? 'Pass & Play'
                : `Room: ${roomCode}`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRulesOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold border border-stone-700 transition"
          >
            How to Play
          </button>
          <button
            onClick={() => setIsModeSelectOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow transition"
          >
            <Dices className="w-3.5 h-3.5" />
            <span>New Game</span>
          </button>
        </div>
      </header>

      {/* Main Playing Area */}
      <main className="flex-1 flex flex-col p-2 sm:p-3 overflow-hidden gap-2">
        {gameState && gameState.phase === 'playing' ? (
          <>
            {/* Turn & Status HUD */}
            <TurnHUD
              players={gameState.players}
              activePlayerIndex={gameState.activePlayerIndex}
              myPlayerId={myPlayerId}
              poolCount={gameState.pool.length}
              turnTimer={gameState.turnTimer}
              turnDuration={gameState.turnDuration}
              boardValidation={boardValidation}
              tilesPlayedThisTurn={tilesPlayedThisTurn}
              canEndTurn={canEndTurn}
              canRevert={canRevert}
              isMyTurn={isMyTurn}
              onEndTurn={endTurn}
              onRevertTurn={revertTurn}
              onDrawAndPass={drawAndPass}
              onOpenRules={() => setIsRulesOpen(true)}
              muted={soundEffects.muted}
              onToggleMute={soundEffects.toggleMute}
              lastActionMessage={gameState.lastActionMessage}
            />

            {/* Felt Board */}
            <Board
              board={gameState.board}
              newTileIds={newTileIds}
              onDropTileIntoMeld={dropTileIntoMeld}
              onCreateNewMeld={createNewMeld}
            />

            {/* Bottom Rack */}
            <Rack
              tiles={currentRack}
              selectedTileIds={selectedTileIds}
              onTileClick={handleTileClick}
              onTileDoubleClick={handleTileDoubleClick}
              onTileDragStart={() => {}}
              onDropTileIntoRack={dropTileIntoRack}
              onSortByGroup={sortRackByGroup}
              onSortByRun={sortRackByRun}
              onPlaySelectedTiles={playSelectedTiles}
              onClearSelection={clearSelection}
              isMyTurn={isMyTurn}
            />
          </>
        ) : (
          /* Welcome Banner when in lobby or before game start */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 felt-surface rounded-2xl border-4 border-[#123328]">
            <div className="p-4 rounded-3xl bg-stone-900/80 border border-stone-700 shadow-2xl max-w-md flex flex-col items-center">
              <span className="text-4xl mb-3">🀄</span>
              <h2 className="text-2xl font-black text-white">Welcome to Rummikub</h2>
              <p className="text-xs text-stone-300 mt-2 mb-5 leading-relaxed">
                Play the official numbers game online with friends, challenge smart AI bots, or enjoy local Pass & Play on a single screen.
              </p>
              <button
                onClick={() => setIsModeSelectOpen(true)}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <Dices className="w-4 h-4" />
                <span>Select Game Mode & Play</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <ModeSelectModal
        isOpen={isModeSelectOpen}
        onStartSoloAI={startSoloAI}
        onStartPassAndPlay={startPassAndPlay}
        onCreateOnlineRoom={createOnlineRoom}
        onJoinOnlineRoom={joinOnlineRoom}
      />

      <RoomLobbyModal
        isOpen={isLobbyOpen}
        roomCode={roomCode}
        players={gameState?.players || []}
        isHost={isHost}
        onAddBot={addOnlineBot}
        onStartGame={startOnlineGame}
        onLeaveRoom={leaveOnlineRoom}
      />

      <PassAndPlayCurtain
        isOpen={isCurtainOpen}
        nextPlayerName={curtainNextPlayer}
        onReveal={revealCurtain}
      />

      <GameOverModal
        isOpen={isGameOverOpen}
        winnerName={winner?.name || 'Player'}
        summaries={gameState?.scoreSummaries || []}
        onPlayAgain={() => {
          setIsGameOverOpen(false);
          setIsModeSelectOpen(true);
        }}
        onReturnMenu={() => {
          setIsGameOverOpen(false);
          setIsModeSelectOpen(true);
        }}
      />

      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
    </div>
  );
};
