import React, { useEffect, useState } from 'react';
import { DdbDiceRollEvent } from '../types/dice';
import { Dices, Sparkles, Skull, X } from 'lucide-react';

interface Props {
  roll: DdbDiceRollEvent | null;
  onDismiss: () => void;
}

export const RollSummaryToast: React.FC<Props> = ({ roll, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (roll) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300);
      }, 4200);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [roll, onDismiss]);

  if (!roll || !isVisible) return null;

  const isCrit = roll.isCritical || (roll.dice?.some(d => d.sides === 20 && d.result === 20) ?? false);
  const isFumble = roll.isFumble || (roll.dice?.some(d => d.sides === 20 && d.result === 1) ?? false);

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[290] pointer-events-auto select-none animate-in fade-in slide-in-from-top-4 duration-300">
      <div className={`relative px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all max-w-lg w-full flex items-center gap-3.5 ${
        isCrit
          ? 'bg-amber-950/90 border-amber-500/80 shadow-amber-950/70 ring-1 ring-amber-400/50'
          : isFumble
          ? 'bg-red-950/90 border-red-600/80 shadow-red-950/70 ring-1 ring-red-500/40'
          : 'bg-zinc-950/90 border-zinc-800/90 shadow-black/80'
      }`}>
        {/* Glow accent bar */}
        <div className={`absolute top-0 inset-x-0 h-1 rounded-t-2xl ${
          isCrit
            ? 'bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 animate-pulse'
            : isFumble
            ? 'bg-gradient-to-r from-red-600 via-rose-500 to-red-600'
            : 'bg-gradient-to-r from-emerald-500 via-amber-500 to-indigo-500'
        }`} />

        {/* Character Avatar or Dice Icon */}
        <div className={`w-11 h-11 rounded-xl overflow-hidden shrink-0 flex items-center justify-center border ${
          isCrit
            ? 'bg-amber-500/20 border-amber-400/60'
            : isFumble
            ? 'bg-red-500/20 border-red-500/60'
            : 'bg-zinc-800/80 border-zinc-700/60'
        }`}>
          {roll.avatarUrl ? (
            <img src={roll.avatarUrl} alt={roll.characterName} className="w-full h-full object-cover" />
          ) : (
            <Dices className={`w-6 h-6 ${isCrit ? 'text-amber-400' : isFumble ? 'text-red-400' : 'text-zinc-300'}`} />
          )}
        </div>

        {/* Info Column */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white truncate max-w-[150px]">
              {roll.characterName}
            </span>
            {roll.source === 'dndbeyond' && (
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-red-950/80 text-red-300 border border-red-700/50">
                D&D Beyond
              </span>
            )}
            {isCrit && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-300 border border-amber-400/60 flex items-center gap-1 animate-pulse">
                <Sparkles className="w-2.5 h-2.5" />
                CRITICAL!
              </span>
            )}
            {isFumble && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-red-600/30 text-red-300 border border-red-500/60 flex items-center gap-1">
                <Skull className="w-2.5 h-2.5" />
                FUMBLE
              </span>
            )}
          </div>

          <div className="text-[11px] text-zinc-300 font-medium truncate mt-0.5">
            {roll.action || 'Dice Roll'}
          </div>

          <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span>{roll.formula}</span>
            {roll.dice && roll.dice.length > 0 && !String(roll.formula || '').includes('[') && (
              <span className="text-zinc-300 font-semibold">
                [{roll.dice.map(d => d.result).join(' + ')}]
                {typeof roll.modifier === 'number' && roll.modifier !== 0
                  ? roll.modifier > 0
                    ? ` + ${roll.modifier}`
                    : ` - ${Math.abs(roll.modifier)}`
                  : ''}
                {` = ${roll.total}`}
              </span>
            )}
          </div>
        </div>

        {/* Big Total Badge */}
        <div className={`px-3 py-1.5 rounded-xl border shrink-0 text-center min-w-[50px] ${
          isCrit
            ? 'bg-amber-500/20 border-amber-400/80 text-amber-200 shadow-lg shadow-amber-500/20'
            : isFumble
            ? 'bg-red-500/20 border-red-500/80 text-red-200'
            : 'bg-zinc-900 border-zinc-700/80 text-white'
        }`}>
          <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-400">Total</div>
          <div className="text-xl font-mono font-extrabold leading-none mt-0.5">
            {roll.total}
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onDismiss, 200);
          }}
          className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-800/80 rounded-lg transition-colors cursor-pointer"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
