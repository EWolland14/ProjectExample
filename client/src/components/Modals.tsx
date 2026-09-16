import React, { useState } from 'react';
import { GameMode, ScoreSummary, Player } from '@rummikub/shared';
import {
  Trophy,
  Bot,
  User,
  Users,
  Globe,
  Play,
  RotateCcw,
  X,
  HelpCircle,
  Eye,
  Copy,
  Check,
  Plus,
  Trash2,
} from 'lucide-react';

// ==========================================
// 1. GAME MODE SELECTION & LOBBY MODAL
// ==========================================
interface ModeSelectModalProps {
  isOpen: boolean;
  onStartSoloAI: (botCount: number, difficulty: 'easy' | 'hard', playerName: string) => void;
  onStartPassAndPlay: (playerNames: string[]) => void;
  onCreateOnlineRoom: (playerName: string) => void;
  onJoinOnlineRoom: (roomCode: string, playerName: string) => void;
}

export const ModeSelectModal: React.FC<ModeSelectModalProps> = ({
  isOpen,
  onStartSoloAI,
  onStartPassAndPlay,
  onCreateOnlineRoom,
  onJoinOnlineRoom,
}) => {
  const [tab, setTab] = useState<GameMode>('ai');
  const [playerName, setPlayerName] = useState('Player 1');

  // Solo AI options
  const [botCount, setBotCount] = useState<number>(2);
  const [botDifficulty, setBotDifficulty] = useState<'easy' | 'hard'>('hard');

  // Pass & Play options
  const [localPlayers, setLocalPlayers] = useState<string[]>(['Player 1', 'Player 2']);

  // Online options
  const [joinCode, setJoinCode] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl p-6 text-stone-100 flex flex-col">
        {/* Title Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-emerald-950/80 border border-emerald-700/50 mb-3 shadow-inner">
            <span className="text-3xl">🎲</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">RUMMIKUB LIVE</h2>
          <p className="text-xs text-stone-400 mt-1">
            Choose your game mode and start matching groups & runs
          </p>
        </div>

        {/* Player Name Input */}
        <div className="mb-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">
            Your Name
          </label>
          <input
            type="text"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            maxLength={15}
            className="w-full px-3.5 py-2 rounded-xl bg-stone-950 border border-stone-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-semibold outline-none transition"
            placeholder="Enter your name"
          />
        </div>

        {/* Mode Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-950 rounded-xl border border-stone-800 mb-5 text-xs font-bold">
          <button
            onClick={() => setTab('ai')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
              tab === 'ai' ? 'bg-emerald-600 text-white shadow' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Solo vs AI</span>
          </button>
          <button
            onClick={() => setTab('pass_and_play')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
              tab === 'pass_and_play' ? 'bg-emerald-600 text-white shadow' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Pass & Play</span>
          </button>
          <button
            onClick={() => setTab('online')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
              tab === 'online' ? 'bg-emerald-600 text-white shadow' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Online Room</span>
          </button>
        </div>

        {/* Tab 1: Solo vs AI */}
        {tab === 'ai' && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-400 mb-1.5">
                Number of AI Opponents
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(count => (
                  <button
                    key={count}
                    onClick={() => setBotCount(count)}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      botCount === count
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {count} Bot{count > 1 ? 's' : ''} ({count + 1} players)
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-400 mb-1.5">
                AI Difficulty Level
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setBotDifficulty('easy')}
                  className={`p-2.5 rounded-xl text-left border transition ${
                    botDifficulty === 'easy'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-stone-950 border-stone-800 text-stone-400'
                  }`}
                >
                  <div className="font-bold text-xs">Novice (Easy)</div>
                  <div className="text-[10px] opacity-75 mt-0.5">Plays obvious 3-tile hand sets</div>
                </button>
                <button
                  onClick={() => setBotDifficulty('hard')}
                  className={`p-2.5 rounded-xl text-left border transition ${
                    botDifficulty === 'hard'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-stone-950 border-stone-800 text-stone-400'
                  }`}
                >
                  <div className="font-bold text-xs">Pro (Hard)</div>
                  <div className="text-[10px] opacity-75 mt-0.5">Splits runs & manipulates board</div>
                </button>
              </div>
            </div>

            <button
              onClick={() => onStartSoloAI(botCount, botDifficulty, playerName)}
              className="mt-2 w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-950 transition flex items-center justify-center gap-2 active:scale-95"
            >
              <Play className="w-4 h-4" />
              <span>Start Solo Match</span>
            </button>
          </div>
        )}

        {/* Tab 2: Pass & Play */}
        {tab === 'pass_and_play' && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-stone-400">
                  Players ({localPlayers.length} / 4)
                </label>
                {localPlayers.length < 4 && (
                  <button
                    onClick={() => setLocalPlayers([...localPlayers, `Player ${localPlayers.length + 1}`])}
                    className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300"
                  >
                    <Plus className="w-3 h-3" /> Add Player
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {localPlayers.map((name, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={name}
                      onChange={e => {
                        const updated = [...localPlayers];
                        updated[idx] = e.target.value;
                        setLocalPlayers(updated);
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-xs font-semibold"
                    />
                    {localPlayers.length > 2 && (
                      <button
                        onClick={() => setLocalPlayers(localPlayers.filter((_, i) => i !== idx))}
                        className="p-1.5 text-stone-500 hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-stone-400 bg-stone-950 p-2.5 rounded-lg border border-stone-800">
              Pass & Play shields the rack between turns so opponents cannot peek at your tiles.
            </p>

            <button
              onClick={() => onStartPassAndPlay(localPlayers)}
              className="mt-2 w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-950 transition flex items-center justify-center gap-2 active:scale-95"
            >
              <Play className="w-4 h-4" />
              <span>Start Pass & Play Match</span>
            </button>
          </div>
        )}

        {/* Tab 3: Online Room */}
        {tab === 'online' && (
          <div className="flex flex-col gap-4">
            <button
              onClick={() => onCreateOnlineRoom(playerName)}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-950 transition flex items-center justify-center gap-2 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Room</span>
            </button>

            <div className="flex items-center gap-2 my-1">
              <div className="h-px bg-stone-800 flex-1" />
              <span className="text-[11px] font-bold text-stone-500 uppercase">Or Join with Code</span>
              <div className="h-px bg-stone-800 flex-1" />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="4-LETTER CODE (e.g. ABCD)"
                maxLength={4}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-center font-mono font-black text-sm uppercase tracking-widest focus:border-emerald-500 outline-none"
              />
              <button
                onClick={() => onJoinOnlineRoom(joinCode, playerName)}
                disabled={joinCode.trim().length !== 4}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:bg-stone-800 disabled:text-stone-500 text-white font-bold text-xs transition"
              >
                Join
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 2. ONLINE ROOM LOBBY WAITING ROOM MODAL
// ==========================================
interface RoomLobbyModalProps {
  isOpen: boolean;
  roomCode: string;
  players: Player[];
  isHost: boolean;
  onAddBot: (difficulty: 'easy' | 'hard') => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

export const RoomLobbyModal: React.FC<RoomLobbyModalProps> = ({
  isOpen,
  roomCode,
  players,
  isHost,
  onAddBot,
  onStartGame,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl p-6 text-stone-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Online Room</span>
            <h3 className="text-xl font-black text-white">Lobby Waiting Room</h3>
          </div>
          <button onClick={onLeaveRoom} className="p-2 text-stone-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Room Code Banner */}
        <div className="bg-stone-950 border border-stone-800 p-3.5 rounded-xl flex items-center justify-between mb-5">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-stone-400 uppercase">Room Code</span>
            <span className="text-2xl font-mono font-black text-amber-400 tracking-widest">{roomCode}</span>
          </div>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Code'}</span>
          </button>
        </div>

        {/* Players in Lobby */}
        <div className="mb-5">
          <div className="flex items-center justify-between text-xs font-bold text-stone-400 mb-2">
            <span>Players in Room ({players.length}/4)</span>
            {isHost && players.length < 4 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onAddBot('easy')}
                  className="text-[10px] text-amber-400 hover:underline font-semibold"
                >
                  + Add Easy Bot
                </button>
                <span>•</span>
                <button
                  onClick={() => onAddBot('hard')}
                  className="text-[10px] text-amber-400 hover:underline font-semibold"
                >
                  + Add Hard Bot
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {players.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-stone-950 border border-stone-800"
              >
                <div className="flex items-center gap-2.5">
                  {p.isBot ? <Bot className="w-4 h-4 text-amber-400" /> : <User className="w-4 h-4 text-emerald-400" />}
                  <span className="text-xs font-bold text-stone-200">{p.name}</span>
                  {idx === 0 && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">
                      Host
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-emerald-400 font-semibold">Ready</span>
              </div>
            ))}
          </div>
        </div>

        {/* Start Game Action */}
        {isHost ? (
          <button
            onClick={onStartGame}
            disabled={players.length < 2}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-800 disabled:text-stone-500 text-white font-extrabold text-sm shadow-lg transition flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            <span>Start Game {players.length < 2 && '(Need at least 2 players)'}</span>
          </button>
        ) : (
          <div className="text-center p-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-400">
            Waiting for host to start the game...
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 3. PASS & PLAY CURTAIN PRIVACY SCREEN MODAL
// ==========================================
interface PassAndPlayCurtainProps {
  isOpen: boolean;
  nextPlayerName: string;
  onReveal: () => void;
}

export const PassAndPlayCurtain: React.FC<PassAndPlayCurtainProps> = ({
  isOpen,
  nextPlayerName,
  onReveal,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-sm text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mb-4 text-3xl">
          🔒
        </div>
        <span className="text-xs uppercase font-bold tracking-widest text-stone-400">Pass & Play</span>
        <h2 className="text-2xl font-black text-white mt-1 mb-2">
          Pass the device to <span className="text-amber-400">{nextPlayerName}</span>
        </h2>
        <p className="text-xs text-stone-400 max-w-xs mb-6">
          Make sure other players cannot see the screen before revealing your tiles.
        </p>

        <button
          onClick={onReveal}
          className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-sm shadow-xl flex items-center justify-center gap-2 active:scale-95 transition"
        >
          <Eye className="w-4 h-4" />
          <span>I'm Ready - Reveal My Tiles</span>
        </button>
      </div>
    </div>
  );
};

// ==========================================
// 4. GAME OVER SCORE SUMMARY MODAL
// ==========================================
interface GameOverModalProps {
  isOpen: boolean;
  winnerName: string;
  summaries: ScoreSummary[];
  onPlayAgain: () => void;
  onReturnMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  winnerName,
  summaries,
  onPlayAgain,
  onReturnMenu,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl p-6 text-stone-100 flex flex-col">
        {/* Victory Banner */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-amber-500/20 border border-amber-400/50 mb-3 shadow-inner">
            <Trophy className="w-10 h-10 text-amber-400 animate-bounce" />
          </div>
          <h2 className="text-2xl font-black text-white">{winnerName} Wins!</h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Cleared all tiles from the rack. Here is the official score tally:
          </p>
        </div>

        {/* Scores Table */}
        <div className="bg-stone-950 border border-stone-800 rounded-xl overflow-hidden mb-6">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-900/80 text-stone-400 font-bold border-b border-stone-800">
              <tr>
                <th className="p-3">Player</th>
                <th className="p-3 text-center">Remaining Tiles</th>
                <th className="p-3 text-center">Penalty Points</th>
                <th className="p-3 text-right">Net Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 font-semibold">
              {summaries.map(s => {
                const isWinner = s.netScore > 0;
                return (
                  <tr key={s.playerId} className={isWinner ? 'bg-amber-500/10' : ''}>
                    <td className="p-3 flex items-center gap-1.5 font-bold">
                      {isWinner && <span>👑</span>}
                      <span className={isWinner ? 'text-amber-300' : 'text-stone-200'}>
                        {s.playerName}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono">{s.remainingTileCount}</td>
                    <td className="p-3 text-center font-mono text-rose-400">
                      {s.rackPoints > 0 ? `-${s.rackPoints}` : '0'}
                    </td>
                    <td
                      className={`p-3 text-right font-black font-mono ${
                        s.netScore > 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {s.netScore > 0 ? `+${s.netScore}` : s.netScore}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onReturnMenu}
            className="flex-1 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs transition"
          >
            Back to Menu
          </button>
          <button
            onClick={onPlayAgain}
            className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg transition flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 5. OFFICIAL RULES & HOW TO PLAY MODAL
// ==========================================
export const RulesModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl p-6 text-stone-100 flex flex-col max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-black text-white">Official Rummikub Rules</h3>
          </div>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-stone-300">
          {/* Section 1 */}
          <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800">
            <h4 className="font-extrabold text-amber-400 text-sm mb-1">1. The Tile Pool (106 Tiles)</h4>
            <p>
              Two sets of numbers 1–13 in four distinct colors: <strong className="text-red-400">Red</strong>,{' '}
              <strong className="text-blue-400">Blue</strong>,{' '}
              <strong className="text-amber-400">Yellow/Orange</strong>, and{' '}
              <strong className="text-stone-300">Black</strong>, plus <strong>2 Jokers</strong> (wildcards).
            </p>
          </div>

          {/* Section 2 */}
          <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800">
            <h4 className="font-extrabold text-amber-400 text-sm mb-1">2. Valid Melds</h4>
            <div className="grid sm:grid-cols-2 gap-3 mt-2">
              <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                <span className="font-bold text-emerald-400 block mb-1">Groups (Sets)</span>
                3 or 4 tiles of the <strong>exact same number</strong>, with <strong>all different colors</strong> (e.g. Red 8, Blue 8, Black 8). No duplicate colors.
              </div>
              <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                <span className="font-bold text-emerald-400 block mb-1">Runs</span>
                3 or more consecutive numbers of the <strong>same color</strong> (e.g. Blue 4, 5, 6, 7). Number 1 is always low; wrapping (12-13-1) is strictly invalid.
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800">
            <h4 className="font-extrabold text-amber-400 text-sm mb-1">3. The 30-Point Initial Meld</h4>
            <p>
              Before you may manipulate tiles on the table, you must play one or more valid melds from your <strong>own rack</strong> totaling <strong>at least 30 points</strong> in a single turn. Jokers assume the point value of the tile they substitute.
            </p>
          </div>

          {/* Section 4 */}
          <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800">
            <h4 className="font-extrabold text-amber-400 text-sm mb-1">4. Table Manipulation & Reverts</h4>
            <p>
              Once your initial meld is complete, you can add tiles to existing sets, split runs of 4+ into new sets, and substitute tiles for Jokers. At the end of your turn, all table sets must be valid. If not, use the <strong>Revert</strong> button to undo your turn!
            </p>
          </div>

          {/* Section 5 */}
          <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800">
            <h4 className="font-extrabold text-amber-400 text-sm mb-1">5. Scoring & Jokers</h4>
            <p>
              The first player to clear their rack wins! Losers receive negative points equal to the face value sum of remaining rack tiles. Unplayed Jokers in hand penalize you by <strong>30 points</strong> each. The winner earns the positive sum of all opponents' penalties.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs transition"
        >
          Close Rules
        </button>
      </div>
    </div>
  );
};
