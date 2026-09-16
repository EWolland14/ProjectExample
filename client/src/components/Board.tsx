import React, { useState } from 'react';
import { Meld, Tile as TileType } from '@rummikub/shared';
import { MeldGroup } from './MeldGroup.js';
import { PlusCircle, Sparkles } from 'lucide-react';

interface BoardProps {
  board: Meld[];
  newTileIds: Set<string>;
  onTileClick?: (tile: TileType, meldId: string) => void;
  onTileDragStart?: (tile: TileType, fromMeldId: string, indexInMeld: number) => void;
  onDropTileIntoMeld: (tile: TileType, targetMeldId: string, insertIndex: number) => void;
  onCreateNewMeld: (tile: TileType) => void;
}

export const Board: React.FC<BoardProps> = ({
  board,
  newTileIds,
  onTileClick,
  onTileDragStart,
  onDropTileIntoMeld,
  onCreateNewMeld,
}) => {
  const [isDropTargetActive, setIsDropTargetActive] = useState(false);

  const handleDragOverNewZone = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setIsDropTargetActive(true);
  };

  const handleDragLeaveNewZone = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropTargetActive(false);
  };

  const handleDropNewZone = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropTargetActive(false);
    try {
      const tileData = e.dataTransfer.getData('text/plain');
      if (tileData) {
        const tile: TileType = JSON.parse(tileData);
        onCreateNewMeld(tile);
      }
    } catch (err) {
      console.error('Failed to create new meld from drop', err);
    }
  };

  return (
    <div className="flex-1 w-full felt-surface rounded-2xl border-4 border-[#123328] shadow-inner p-3 sm:p-4 overflow-y-auto min-h-[360px] flex flex-col relative">
      {board.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-emerald-600/30 rounded-xl my-4">
          <Sparkles className="w-10 h-10 text-emerald-400/60 mb-2 animate-bounce" />
          <h3 className="text-lg font-bold text-emerald-200">The Board is Open</h3>
          <p className="text-xs text-emerald-300/70 max-w-sm mt-1">
            Drag tiles from your rack here to create a new meld, or double-click tiles in your rack to deploy them.
          </p>
          <div
            onDragOver={handleDragOverNewZone}
            onDragLeave={handleDragLeaveNewZone}
            onDrop={handleDropNewZone}
            className={`mt-4 px-6 py-4 rounded-xl border-2 border-dashed transition-all flex items-center gap-2 text-sm font-semibold cursor-pointer ${
              isDropTargetActive
                ? 'bg-amber-500/20 border-amber-400 text-amber-200 scale-105'
                : 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/30'
            }`}
          >
            <PlusCircle className="w-5 h-5" />
            Drop here to place your first meld
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap content-start items-start gap-3 sm:gap-4 pb-16">
          {board.map((meld, idx) => (
            <MeldGroup
              key={meld.id}
              meld={meld}
              index={idx}
              newTileIds={newTileIds}
              onTileClick={onTileClick}
              onTileDragStart={onTileDragStart}
              onDropTileIntoMeld={onDropTileIntoMeld}
            />
          ))}

          {/* Dedicated New Meld Drop Target Platter */}
          <div
            onDragOver={handleDragOverNewZone}
            onDragLeave={handleDragLeaveNewZone}
            onDrop={handleDropNewZone}
            className={`
              h-24 min-w-[120px] px-4 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center
              ${
                isDropTargetActive
                  ? 'bg-amber-500/25 border-amber-400 text-amber-200 scale-105 shadow-lg'
                  : 'border-emerald-700/50 hover:border-emerald-500/70 text-emerald-300/80 bg-emerald-950/20'
              }
            `}
          >
            <PlusCircle className="w-5 h-5 mb-1 opacity-75" />
            <span className="text-[11px] font-bold uppercase tracking-wider">New Meld</span>
            <span className="text-[9px] opacity-70">Drop tile here</span>
          </div>
        </div>
      )}
    </div>
  );
};
