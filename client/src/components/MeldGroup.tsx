import React, { useState } from 'react';
import { Meld, Tile as TileType, validateMeld } from '@rummikub/shared';
import { Tile } from './Tile.js';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface MeldGroupProps {
  meld: Meld;
  index: number;
  newTileIds: Set<string>;
  onTileClick?: (tile: TileType, meldId: string) => void;
  onTileDragStart?: (tile: TileType, fromMeldId: string, indexInMeld: number) => void;
  onDropTileIntoMeld: (tile: TileType, targetMeldId: string, insertIndex: number) => void;
  onSplitMeld?: (meldId: string, splitIndex: number) => void;
}

export const MeldGroup: React.FC<MeldGroupProps> = ({
  meld,
  index: _index,
  newTileIds,
  onTileClick,
  onTileDragStart,
  onDropTileIntoMeld,
}) => {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const validation = validateMeld(meld.tiles);

  const handleDragOver = (e: React.DragEvent, insertIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(insertIdx);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, insertIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);
    try {
      const tileData = e.dataTransfer.getData('text/plain');
      if (tileData) {
        const tile: TileType = JSON.parse(tileData);
        onDropTileIntoMeld(tile, meld.id, insertIdx);
      }
    } catch (err) {
      console.error('Failed to parse dropped tile', err);
    }
  };

  return (
    <div
      className={`
        relative group p-2 sm:p-2.5 rounded-xl transition-all duration-200
        bg-emerald-950/40 backdrop-blur-sm border
        ${
          validation.valid
            ? 'border-emerald-700/40 hover:border-emerald-500/60 shadow-md'
            : 'border-rose-500/80 bg-rose-950/20 ring-1 ring-rose-500/50 shadow-rose-950/40 shadow-lg'
        }
      `}
    >
      {/* Header with Meld status badge and points */}
      <div className="flex items-center justify-between gap-2 mb-1.5 px-1">
        <div className="flex items-center gap-1.5 text-xs">
          {validation.valid ? (
            <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {validation.type === 'group' ? 'Group' : 'Run'}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-rose-400 font-semibold text-[11px]" title={validation.error}>
              <AlertCircle className="w-3.5 h-3.5" />
              Invalid ({meld.tiles.length} tiles)
            </span>
          )}
        </div>
        <div className="text-[10px] font-mono text-stone-300 bg-black/40 px-1.5 py-0.5 rounded">
          {validation.valid ? `${validation.points} pts` : '0 pts'}
        </div>
      </div>

      {/* Tiles container with insertion drop zones */}
      <div className="flex items-center flex-wrap gap-1 relative">
        {/* Prepend Dropzone (index 0) */}
        <div
          onDragOver={e => handleDragOver(e, 0)}
          onDragLeave={handleDragLeave}
          onDrop={e => handleDrop(e, 0)}
          className={`
            w-3 sm:w-4 h-14 sm:h-15 -mr-1 rounded transition-all duration-150 z-10 flex items-center justify-center
            ${dragOverIndex === 0 ? 'bg-amber-400/80 w-8 border-2 border-amber-300 scale-105' : 'opacity-0 hover:opacity-20 bg-white/20'}
          `}
        />

        {meld.tiles.map((tile, tIdx) => {
          const isNew = newTileIds.has(tile.id);
          return (
            <React.Fragment key={tile.id}>
              <Tile
                tile={tile}
                isNewOnBoard={isNew}
                isInvalid={!validation.valid}
                onClick={() => onTileClick?.(tile, meld.id)}
                onDragStart={() => onTileDragStart?.(tile, meld.id, tIdx)}
                size="md"
              />

              {/* In-between / Append drop zone */}
              <div
                onDragOver={e => handleDragOver(e, tIdx + 1)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, tIdx + 1)}
                className={`
                  w-3 sm:w-4 h-14 sm:h-15 -mx-1 rounded transition-all duration-150 z-10 flex items-center justify-center
                  ${dragOverIndex === tIdx + 1 ? 'bg-amber-400/80 w-8 border-2 border-amber-300 scale-105' : 'opacity-0 hover:opacity-20 bg-white/20'}
                `}
              />
            </React.Fragment>
          );
        })}
      </div>

      {/* Error message tooltip on hover if invalid */}
      {!validation.valid && validation.error && (
        <div className="mt-1.5 text-[10px] text-rose-300/90 leading-tight bg-rose-950/60 p-1 rounded border border-rose-800/50">
          {validation.error}
        </div>
      )}
    </div>
  );
};
