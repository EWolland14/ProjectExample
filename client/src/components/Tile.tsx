import React from 'react';
import { Tile as TileType } from '@rummikub/shared';

interface TileProps {
  tile: TileType;
  isSelected?: boolean;
  isDragging?: boolean;
  isNewOnBoard?: boolean;
  isInvalid?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Tile: React.FC<TileProps> = ({
  tile,
  isSelected = false,
  isDragging = false,
  isNewOnBoard = false,
  isInvalid = false,
  onClick,
  onDoubleClick,
  onDragStart,
  onDragEnd,
  className = '',
  size = 'md',
}) => {
  // Size classes
  const sizeClasses = {
    sm: 'w-7 h-10 text-xs rounded-md shadow-sm',
    md: 'w-10 h-14 sm:w-11 sm:h-15 text-lg font-black rounded-lg shadow-tile',
    lg: 'w-12 h-16 sm:w-14 sm:h-20 text-2xl font-black rounded-xl shadow-tile',
  }[size];

  // Number / color styles
  const getColorStyles = () => {
    if (tile.isJoker) return 'text-amber-500';
    switch (tile.color) {
      case 'red':
        return 'text-[#D92626]';
      case 'blue':
        return 'text-[#1E64D4]';
      case 'yellow':
        return 'text-[#DE8800]';
      case 'black':
        return 'text-[#1F2421]';
      default:
        return 'text-stone-800';
    }
  };

  return (
    <div
      draggable
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onDragStart={e => {
        e.dataTransfer.setData('text/plain', JSON.stringify(tile));
        e.dataTransfer.effectAllowed = 'move';
        onDragStart?.(e);
      }}
      onDragEnd={onDragEnd}
      className={`
        relative select-none cursor-grab active:cursor-grabbing flex flex-col items-center justify-center
        transition-all duration-150 transform hover:-translate-y-1 active:translate-y-0
        bg-gradient-to-b from-[#FFFDF9] via-[#FAF6ED] to-[#EFE7D8]
        border border-[#E5DAC6]
        ${sizeClasses}
        ${isSelected ? 'ring-4 ring-amber-400 -translate-y-2 shadow-tile-drag' : ''}
        ${isDragging ? 'opacity-40 scale-95' : 'opacity-100'}
        ${isNewOnBoard ? 'ring-2 ring-emerald-400' : ''}
        ${isInvalid ? 'ring-2 ring-rose-500 animate-pulse' : ''}
        ${className}
      `}
      title={tile.isJoker ? 'Joker (Wildcard)' : `${tile.color.toUpperCase()} ${tile.number}`}
    >
      {/* Sunken bevel inner border */}
      <div className="absolute inset-0.5 rounded-[inherit] pointer-events-none border border-white/60" />

      {tile.isJoker ? (
        // Joker face graphic
        <div className="flex flex-col items-center justify-center">
          <span className="text-xl sm:text-2xl leading-none">🎭</span>
          <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-amber-700 mt-0.5">
            Joker
          </span>
        </div>
      ) : (
        // Regular numbered tile
        <div className="flex flex-col items-center justify-center leading-none">
          <span className={`font-black tracking-tight ${getColorStyles()} drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]`}>
            {tile.number}
          </span>
          {/* Subtle color dot indicator below number */}
          <div
            className={`w-1.5 h-1.5 rounded-full mt-1 ${
              tile.color === 'red'
                ? 'bg-red-500'
                : tile.color === 'blue'
                ? 'bg-blue-600'
                : tile.color === 'yellow'
                ? 'bg-amber-500'
                : 'bg-stone-800'
            }`}
          />
        </div>
      )}
    </div>
  );
};
