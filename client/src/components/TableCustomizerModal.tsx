import React from 'react';
import { X, Check } from 'lucide-react';

export type TableColor = 'felt' | 'navy' | 'burgundy' | 'slate' | 'wood';
export type TableShape = 'rounded' | 'oval' | 'octagon' | 'square';

interface TableCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableColor: TableColor;
  onChangeColor: (color: TableColor) => void;
  tableShape: TableShape;
  onChangeShape: (shape: TableShape) => void;
}

interface ColorOption {
  id: TableColor;
  name: string;
  swatch: string;
  bgClass: string;
  borderClass: string;
}

interface ShapeOption {
  id: TableShape;
  name: string;
  description: string;
}

const COLOR_OPTIONS: ColorOption[] = [
  {
    id: 'felt',
    name: 'Emerald Felt',
    swatch: '#1B4D3E',
    bgClass: 'felt-surface',
    borderClass: 'border-[#123328]',
  },
  {
    id: 'navy',
    name: 'Royal Navy',
    swatch: '#1E3A8A',
    bgClass: 'navy-surface',
    borderClass: 'border-[#091321]',
  },
  {
    id: 'burgundy',
    name: 'Crimson Velvet',
    swatch: '#881337',
    bgClass: 'burgundy-surface',
    borderClass: 'border-[#260a10]',
  },
  {
    id: 'slate',
    name: 'Midnight Slate',
    swatch: '#334155',
    bgClass: 'slate-surface',
    borderClass: 'border-[#101216]',
  },
  {
    id: 'wood',
    name: 'Warm Walnut',
    swatch: '#78350F',
    bgClass: 'walnut-surface',
    borderClass: 'border-[#24140b]',
  },
];

const SHAPE_OPTIONS: ShapeOption[] = [
  {
    id: 'rounded',
    name: 'Rounded Rectangle',
    description: 'Smooth corners with padded leather rail',
  },
  {
    id: 'oval',
    name: 'Stadium Oval',
    description: 'Continuous curved racetrack borders',
  },
  {
    id: 'octagon',
    name: 'Casino Octagon',
    description: 'Classic 8-sided tournament poker table',
  },
  {
    id: 'square',
    name: 'Framed Square',
    description: 'Clean modern angular framing',
  },
];

export const TableCustomizerModal: React.FC<TableCustomizerModalProps> = ({
  isOpen,
  onClose,
  tableColor,
  onChangeColor,
  tableShape,
  onChangeShape,
}) => {
  if (!isOpen) return null;

  const activeColor = COLOR_OPTIONS.find(c => c.id === tableColor) ?? COLOR_OPTIONS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl p-5 sm:p-6 text-stone-100 flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b border-stone-800 pb-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Customization</span>
            <h3 className="text-xl font-black text-white">Table Color & Shape</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Mini Preview */}
        <div className="mb-5 flex flex-col items-center">
          <span className="text-[11px] font-bold text-stone-400 mb-2 uppercase tracking-wider">Live Preview</span>
          <div className="w-full h-32 flex items-center justify-center p-3 bg-stone-950 rounded-xl border border-stone-800">
            <div
              style={
                tableShape === 'octagon'
                  ? { clipPath: 'polygon(8% 0%, 92% 0%, 100% 8%, 100% 92%, 92% 100%, 8% 100%, 0% 92%, 0% 8%)' }
                  : undefined
              }
              className={`
                w-full max-w-xs h-24 ${activeColor.bgClass} border-4 ${activeColor.borderClass} shadow-inner
                flex items-center justify-center gap-1.5 transition-all duration-300
                ${
                  tableShape === 'rounded'
                    ? 'rounded-2xl'
                    : tableShape === 'oval'
                    ? 'rounded-[40px]'
                    : tableShape === 'square'
                    ? 'rounded-md'
                    : ''
                }
              `}
            >
              {/* Mini sample tiles */}
              <div className="w-7 h-10 bg-[#FFFDF9] rounded border border-[#E5DAC6] shadow flex flex-col items-center justify-center font-black text-xs text-[#D92626]">
                7
              </div>
              <div className="w-7 h-10 bg-[#FFFDF9] rounded border border-[#E5DAC6] shadow flex flex-col items-center justify-center font-black text-xs text-[#1E64D4]">
                8
              </div>
              <div className="w-7 h-10 bg-[#FFFDF9] rounded border border-[#E5DAC6] shadow flex flex-col items-center justify-center font-black text-xs text-[#DE8800]">
                9
              </div>
            </div>
          </div>
        </div>

        {/* 1. Color Selector */}
        <div className="mb-5">
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
            Table Felt Color
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {COLOR_OPTIONS.map(opt => {
              const isSelected = tableColor === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => onChangeColor(opt.id)}
                  className={`
                    flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all
                    ${
                      isSelected
                        ? 'bg-stone-800 border-amber-400 ring-1 ring-amber-400 shadow-md'
                        : 'bg-stone-950 border-stone-800 hover:border-stone-700'
                    }
                  `}
                >
                  <div
                    className="w-6 h-6 rounded-full border border-white/20 shadow-inner flex items-center justify-center shrink-0"
                    style={{ backgroundColor: opt.swatch }}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span className="text-xs font-bold text-stone-200">{opt.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Shape Selector */}
        <div className="mb-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
            Table Border & Shape
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SHAPE_OPTIONS.map(opt => {
              const isSelected = tableShape === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => onChangeShape(opt.id)}
                  className={`
                    p-3 rounded-xl border text-left transition-all flex flex-col
                    ${
                      isSelected
                        ? 'bg-stone-800 border-amber-400 ring-1 ring-amber-400 shadow-md'
                        : 'bg-stone-950 border-stone-800 hover:border-stone-700'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-stone-100">{opt.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                  </div>
                  <span className="text-[10px] text-stone-400 mt-1 leading-snug">
                    {opt.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Done Button */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg transition active:scale-95"
        >
          Save Table Settings
        </button>
      </div>
    </div>
  );
};
