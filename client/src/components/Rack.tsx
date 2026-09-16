import React, { useState } from 'react';
import { Tile as TileType, validateMeld } from '@rummikub/shared';
import { Tile } from './Tile.js';
import { Layers, ArrowDownUp, Check, X } from 'lucide-react';

interface RackProps {
  tiles: TileType[];
  selectedTileIds: Set<string>;
  onTileClick: (tile: TileType) => void;
  onTileDoubleClick: (tile: TileType) => void;
  onTileDragStart: (tile: TileType, index: number) => void;
  onDropTileIntoRack: (tile: TileType, insertIndex: number) => void;
  onSortByGroup: () => void;
  onSortByRun: () => void;
  onPlaySelectedTiles: (selectedTiles: TileType[]) => void;
  onClearSelection: () => void;
  isMyTurn: boolean;
}

export const Rack: React.FC<RackProps> = ({
  tiles,
  selectedTileIds,
  onTileClick,
  onTileDoubleClick,
  onTileDragStart,
  onDropTileIntoRack,
  onSortByGroup,
  onSortByRun,
  onPlaySelectedTiles,
  onClearSelection,
  isMyTurn,
}) => {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const selectedTiles = tiles.filter(t => selectedTileIds.has(t.id));
  const selectionValidation = selectedTiles.length >= 3 ? validateMeld(selectedTiles) : null;

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);
    try {
      const tileData = e.dataTransfer.getData('text/plain');
      if (tileData) {
        const tile: TileType = JSON.parse(tileData);
        onDropTileIntoRack(tile, index);
      }
    } catch (err) {
      console.error('Failed to parse tile drop in rack', err);
    }
  };

  // Split tiles into two natural rows if rack contains more than 14 tiles
  const midpoint = Math.max(12, Math.ceil(tiles.length / 2));
  const row1 = tiles.slice(0, midpoint);
  const row2 = tiles.slice(midpoint);

  const renderTileRow = (rowTiles: TileType[], startIndex: number) => (
    <div className="flex items-center gap-1.5 min-h-[58px] relative px-2">
      {/* Insertion slot at index 0 */}
      <div
        onDragOver={e => handleDragOver(e, startIndex)}
        onDragLeave={handleDragLeave}
        onDrop={e => handleDrop(e, startIndex)}
        className={`w-2 h-14 -mr-1 rounded z-10 transition-all ${
          dragOverIndex === startIndex ? 'bg-amber-400/80 w-6' : 'opacity-0'
        }`}
      />

      {rowTiles.map((tile, idx) => {
        const globalIdx = startIndex + idx;
        const isSelected = selectedTileIds.has(tile.id);
        return (
          <React.Fragment key={tile.id}>
            <Tile
              tile={tile}
              isSelected={isSelected}
              onClick={() => onTileClick(tile)}
              onDoubleClick={() => onTileDoubleClick(tile)}
              onDragStart={() => onTileDragStart(tile, globalIdx)}
              size="md"
            />

            {/* Insertion slot between tiles */}
            <div
              onDragOver={e => handleDragOver(e, globalIdx + 1)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, globalIdx + 1)}
              className={`w-2 h-14 -mx-1 rounded z-10 transition-all ${
                dragOverIndex === globalIdx + 1 ? 'bg-amber-400/80 w-6' : 'opacity-0'
              }`}
            />
          </React.Fragment>
        );
      })}
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center select-none pt-2">
      {/* Floating Action Bar for Selected Tiles or Quick Sorting */}
      <div className="w-full max-w-4xl flex items-center justify-between gap-2 px-3 pb-2 text-xs">
        <div className="flex items-center gap-2">
          {/* Sort 777 (By Number/Groups) */}
          <button
            onClick={onSortByGroup}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-200 border border-stone-600/50 shadow transition-all font-semibold active:scale-95"
            title="Sort tiles by number to see matching groups (Sets)"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Sort 777 (Groups)</span>
          </button>

          {/* Sort 789 (By Color/Runs) */}
          <button
            onClick={onSortByRun}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-200 border border-stone-600/50 shadow transition-all font-semibold active:scale-95"
            title="Sort tiles by color and consecutive numbers (Runs)"
          >
            <ArrowDownUp className="w-3.5 h-3.5 text-sky-400" />
            <span>Sort 789 (Runs)</span>
          </button>
        </div>

        {/* Selected Tiles helper & instant play */}
        {selectedTiles.length > 0 && (
          <div className="flex items-center gap-2 animate-fade-in bg-stone-800/90 px-3 py-1 rounded-lg border border-stone-600">
            <span className="text-stone-300 font-medium text-[11px]">
              {selectedTiles.length} selected
            </span>

            {selectionValidation && (
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                  selectionValidation.valid ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {selectionValidation.valid ? `Valid ${selectionValidation.type} (${selectionValidation.points} pts)` : 'Invalid'}
              </span>
            )}

            {selectionValidation?.valid && isMyTurn && (
              <button
                onClick={() => onPlaySelectedTiles(selectedTiles)}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow active:scale-95 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                Play Meld
              </button>
            )}

            <button
              onClick={onClearSelection}
              className="p-1 text-stone-400 hover:text-stone-200"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Physical Wooden Rack Body */}
      <div className="w-full max-w-5xl wood-gradient rounded-t-2xl border-t-4 border-x-4 border-wood-border shadow-rack px-3 sm:px-6 py-3 relative overflow-hidden">
        {/* Wood grain highlight */}
        <div className="absolute inset-x-0 top-0 h-1 bg-white/20 pointer-events-none" />

        <div className="flex flex-col gap-2.5 overflow-x-auto pb-1 items-center">
          {/* Top Rack Ledge */}
          <div className="w-full flex justify-center">
            <div className="wood-ledge rounded-lg p-1 min-w-[280px] max-w-full overflow-x-auto flex justify-center">
              {renderTileRow(row1, 0)}
            </div>
          </div>

          {/* Bottom Rack Ledge (if needed) */}
          {row2.length > 0 && (
            <div className="w-full flex justify-center">
              <div className="wood-ledge rounded-lg p-1 min-w-[280px] max-w-full overflow-x-auto flex justify-center">
                {renderTileRow(row2, midpoint)}
              </div>
            </div>
          )}
        </div>

        {/* Rack bottom lip */}
        <div className="h-2 w-full bg-black/40 rounded-full mt-1.5 shadow-inner" />
      </div>
    </div>
  );
};
