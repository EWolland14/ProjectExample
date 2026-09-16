import React from 'react';
import { Player, BoardValidationResult } from '@rummikub/shared';
import {
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Volume2,
  VolumeX,
  BookOpen,
  User,
  Bot,
  Sparkles,
} from 'lucide-react';

interface TurnHUDProps {
  players: Player[];
  activePlayerIndex: number;
  myPlayerId: string;
  poolCount: number;
  turnTimer: number;
  turnDuration: number;
  boardValidation: BoardValidationResult;
  tilesPlayedThisTurn: number;
  canEndTurn: boolean;
  canRevert: boolean;
  isMyTurn: boolean;
  onEndTurn: () => void;
  onRevertTurn: () => void;
  onDrawAndPass: () => void;
  onOpenRules: () => void;
  muted: boolean;
  onToggleMute: () => void;
  lastActionMessage?: string;
}

export const TurnHUD: React.FC<TurnHUDProps> = ({
  players,
  activePlayerIndex,
  myPlayerId,
  poolCount,
  turnTimer,
  turnDuration,
  boardValidation,
  tilesPlayedThisTurn,
  canEndTurn,
  canRevert,
  isMyTurn,
  onEndTurn,
  onRevertTurn,
  onDrawAndPass,
  onOpenRules,
  muted,
  onToggleMute,
  lastActionMessage,
}) => {
  const activePlayer = players[activePlayerIndex];
  const timerPercent = Math.max(0, Math.min(100, (turnTimer / turnDuration) * 100));

  // Timer urgency colors
  const timerColor =
    turnTimer <= 10
      ? 'text-rose-500 stroke-rose-500'
      : turnTimer <= 20
      ? 'text-amber-400 stroke-amber-400'
      : 'text-emerald-400 stroke-emerald-400';

  return (
    <div className="w-full flex flex-col gap-2 select-none z-20">
      {/* Top Bar: Opponents, Tile Pool Counter, Audio & Help */}
      <div className="w-full flex items-center justify-between gap-3 bg-stone-900/90 backdrop-blur-md px-3 sm:px-4 py-2 rounded-xl border border-stone-800 shadow-md">
        {/* Opponents preview */}
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          {players.map((p, idx) => {
            const isActive = idx === activePlayerIndex;
            const isMe = p.id === myPlayerId;
            return (
              <div
                key={p.id}
                className={`
                  flex items-center gap-2 px-2.5 py-1 rounded-lg border transition-all text-xs
                  ${
                    isActive
                      ? 'bg-amber-500/20 border-amber-400/80 shadow-md ring-1 ring-amber-400/50'
                      : 'bg-stone-800/60 border-stone-700/50 text-stone-300'
                  }
                `}
              >
                <div className="relative">
                  {p.isBot ? (
                    <Bot className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-stone-400'}`} />
                  ) : (
                    <User className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-stone-400'}`} />
                  )}
                  {isActive && (
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                  )}
                </div>

                <div className="flex flex-col">
                  <span className="font-bold truncate max-w-[90px]">
                    {p.name} {isMe && '(You)'}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] opacity-80">
                    <span className="font-mono bg-stone-950/60 px-1 py-0.2 rounded text-stone-200">
                      {p.rack.length} tiles
                    </span>
                    {!p.hasInitialMeld && (
                      <span className="text-amber-300/80 font-semibold" title="Needs 30+ pts initial meld">
                        (30pt)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right side: Tile Pool Stack & Utilities */}
        <div className="flex items-center gap-3">
          {/* Tile Pool Stack */}
          <div
            className="flex items-center gap-2 bg-stone-950/70 border border-stone-700/60 px-3 py-1.5 rounded-lg shadow"
            title={`${poolCount} tiles remaining in the pouch`}
          >
            <div className="relative w-5 h-6 flex items-center justify-center">
              <div className="absolute inset-0 bg-[#EFE7D8] rounded-sm border border-stone-400 shadow-sm translate-x-1 -translate-y-1 opacity-60" />
              <div className="absolute inset-0 bg-[#FAF6ED] rounded-sm border border-stone-400 shadow-sm" />
              <span className="relative text-[9px] font-black text-stone-700 font-mono">106</span>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Pool</span>
              <span className="text-xs font-black font-mono text-emerald-400 leading-tight">
                {poolCount} left
              </span>
            </div>
          </div>

          {/* Rules Modal Button */}
          <button
            onClick={onOpenRules}
            className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 transition-all"
            title="Official Rummikub Rules & How to Play"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          {/* Sound Toggle Button */}
          <button
            onClick={onToggleMute}
            className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 transition-all"
            title={muted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Main HUD Banner: Active Player, Timer, Table Status, Action Buttons */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 bg-stone-900/95 backdrop-blur-md px-4 py-2.5 rounded-xl border border-stone-800 shadow-lg">
        {/* Left: Active Player & Timer Ring */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-11 h-11">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-stone-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={`${timerColor} transition-all duration-1000 ease-linear`}
                strokeDasharray={`${timerPercent}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-xs font-black font-mono ${timerColor}`}>
                {turnTimer}
              </span>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-stone-100">
                {isMyTurn ? "It's your turn!" : `${activePlayer?.name}'s turn`}
              </span>
              {activePlayer && !activePlayer.hasInitialMeld && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-semibold border border-amber-500/40">
                  Initial 30pts Required
                </span>
              )}
            </div>

            {/* Board Status Pill */}
            <div className="flex items-center gap-2 mt-0.5 text-xs">
              {boardValidation.valid ? (
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Table Valid ({boardValidation.totalPoints} pts)
                </span>
              ) : (
                <span className="flex items-center gap-1 text-rose-400 font-bold animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {boardValidation.invalidMeldIndices.length} invalid meld(s) on table
                </span>
              )}
              {tilesPlayedThisTurn > 0 && (
                <span className="text-sky-300 font-semibold text-[11px]">
                  • {tilesPlayedThisTurn} tile(s) played
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center/Right: Action Message ticker */}
        {lastActionMessage && (
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-stone-400 italic max-w-sm truncate">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{lastActionMessage}</span>
          </div>
        )}

        {/* Right: Primary Turn Actions */}
        <div className="flex items-center gap-2">
          {/* Revert Turn button */}
          <button
            onClick={onRevertTurn}
            disabled={!canRevert || !isMyTurn}
            className={`
              flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow
              ${
                canRevert && isMyTurn
                  ? 'bg-amber-600/90 hover:bg-amber-500 text-white border border-amber-400/50 active:scale-95'
                  : 'bg-stone-800 text-stone-500 border border-stone-700/50 cursor-not-allowed opacity-60'
              }
            `}
            title="Undo all table movements and return tiles to your rack"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Revert</span>
          </button>

          {/* Draw & Pass */}
          <button
            onClick={onDrawAndPass}
            disabled={!isMyTurn}
            className={`
              flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow
              ${
                isMyTurn
                  ? 'bg-sky-600/90 hover:bg-sky-500 text-white border border-sky-400/50 active:scale-95'
                  : 'bg-stone-800 text-stone-500 border border-stone-700/50 cursor-not-allowed opacity-60'
              }
            `}
            title="Draw 1 tile from the pouch and end your turn"
          >
            <span>Draw & Pass</span>
          </button>

          {/* Confirm / End Turn */}
          <button
            onClick={onEndTurn}
            disabled={!canEndTurn || !isMyTurn}
            className={`
              flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all shadow-md
              ${
                canEndTurn && isMyTurn
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 ring-2 ring-emerald-400/30 active:scale-95'
                  : 'bg-stone-800 text-stone-500 border border-stone-700/50 cursor-not-allowed opacity-50'
              }
            `}
            title={
              !isMyTurn
                ? 'Wait for your turn'
                : !boardValidation.valid
                ? 'Fix broken sets on table before ending turn'
                : tilesPlayedThisTurn === 0
                ? 'Play at least 1 tile or Draw & Pass'
                : 'Submit your turn'
            }
          >
            <CheckCircle className="w-4 h-4" />
            <span>End Turn</span>
          </button>
        </div>
      </div>
    </div>
  );
};
