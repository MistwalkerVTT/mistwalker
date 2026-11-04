// src/components/sidebar/DiceFlyoutPanel.tsx
// Dedicated flyout panel for the 3D / TUI dice roller pool and history

import React from 'react';
import { Dices, Pin, X } from 'lucide-react';

export interface DiceFlyoutPanelProps {
  pinnedGroup: string | null;
  setPinnedGroup: (group: any) => void;
  closeFlyout: () => void;
  handleDragStart: (e: React.MouseEvent) => void;
  dicePool: string[];
  addDiceToPool: (die: string) => void;
  clearDicePool: () => void;
  rollDicePool: () => void;
  diceHistory: Array<{ id: string; dice: string; total: number; [key: string]: any }>;
}

export const DiceFlyoutPanel: React.FC<DiceFlyoutPanelProps> = ({
  pinnedGroup,
  setPinnedGroup,
  closeFlyout,
  handleDragStart,
  dicePool,
  addDiceToPool,
  clearDicePool,
  rollDicePool,
  diceHistory
}) => {
  return (
    <div className="p-3.5 flex flex-col gap-3 min-w-[260px]">
      {/* Header */}
      <div
        onMouseDown={pinnedGroup ? handleDragStart : undefined}
        className={`flex items-center justify-between border-b border-zinc-800 pb-2.5 ${pinnedGroup ? 'cursor-grab active:cursor-grabbing select-none' : ''}`}
      >
        <div className="flex items-center gap-2">
          <Dices className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold font-mono text-zinc-200 uppercase tracking-wider">Dice Roller</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPinnedGroup(pinnedGroup === 'dice' ? null : 'dice')}
            className={`p-1 rounded-md transition-colors ${pinnedGroup === 'dice' ? 'text-purple-400 bg-purple-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
            title={pinnedGroup === 'dice' ? 'Unpin Menu' : 'Pin Menu Open (Allows moving)'}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={closeFlyout}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Dice Buttons */}
      <div className="grid grid-cols-4 gap-1.5">
        {['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'].map((d) => (
          <button
            key={d}
            onClick={() => addDiceToPool(d)}
            className="py-1.5 bg-zinc-800 hover:bg-purple-600/30 hover:border-purple-500 border border-zinc-700/60 rounded-xl text-xs font-bold font-mono transition-all text-zinc-200 active:scale-95"
          >
            {d}
          </button>
        ))}
      </div>

      {/* Current Pool & Roll Button */}
      <div className="flex flex-col gap-2 pt-1 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-400 font-mono">DICE POOL:</span>
          {dicePool.length > 0 && (
            <button onClick={clearDicePool} className="text-[10px] text-zinc-500 hover:text-zinc-300 font-mono">
              CLEAR
            </button>
          )}
        </div>
        <div className="p-2 bg-zinc-950/70 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-300 min-h-[36px] flex items-center">
          {dicePool.length > 0 ? dicePool.join(' + ') : 'Tap dice to assemble pool'}
        </div>
        <button
          id="btn-roll-dice-flyout"
          onClick={rollDicePool}
          disabled={dicePool.length === 0}
          className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-purple-950/50 active:scale-95"
        >
          ROLL NOW
        </button>
      </div>

      {/* Roll History */}
      {diceHistory.length > 0 && (
        <div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto pt-1 border-t border-zinc-800 text-xs font-mono sidebar-scrollbar">
          <span className="text-[9px] uppercase font-bold text-zinc-500">Recent Rolls</span>
          {diceHistory.slice(0, 4).map((hist) => (
            <div key={hist.id} className="flex items-center justify-between text-zinc-400 bg-zinc-950/60 px-2.5 py-1 rounded-lg">
              <span className="truncate max-w-[130px]">{hist.dice}</span>
              <span className="font-bold text-emerald-400 font-mono">{hist.total}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DiceFlyoutPanel;
