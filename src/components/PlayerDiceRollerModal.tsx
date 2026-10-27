import React, { useState, useMemo } from 'react';
import { X, Settings, ExternalLink, User, Users, Sparkles, Wand2, Shield, Swords, RotateCcw } from 'lucide-react';
import { DiceColorPreset } from '../graphics/dice/diceTextures';
import { DdbDiceRollEvent, DieResult } from '../types/dice';
import { rollAdvancedDice, isValidDiceNotation } from '../services/diceRollerService';

export type SupportedDieType = 'd20' | 'd12' | 'd100' | 'd10' | 'd8' | 'd6' | 'd4';

interface DieDef {
  type: SupportedDieType;
  sides: number;
  label: string;
  icon: React.FC<{ className?: string }>;
}

/* Custom crisp SVG wireframes matching polyhedral tabletop line-art */
const D20Icon: React.FC<{ className?: string }> = ({ className = "w-9 h-9" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="12,2 21.5,7.5 21.5,16.5 12,22 2.5,16.5 2.5,7.5" />
    <polygon points="12,7 18.5,16.5 5.5,16.5" />
    <line x1="12" y1="2" x2="12" y2="7" />
    <line x1="2.5" y1="7.5" x2="12" y2="7" />
    <line x1="21.5" y1="7.5" x2="12" y2="7" />
    <line x1="2.5" y1="7.5" x2="5.5" y2="16.5" />
    <line x1="2.5" y1="16.5" x2="5.5" y2="16.5" />
    <line x1="12" y1="22" x2="5.5" y2="16.5" />
    <line x1="12" y1="22" x2="18.5" y2="16.5" />
    <line x1="21.5" y1="16.5" x2="18.5" y2="16.5" />
    <line x1="21.5" y1="7.5" x2="18.5" y2="16.5" />
  </svg>
);

const D12Icon: React.FC<{ className?: string }> = ({ className = "w-9 h-9" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="12,2 18,4 21.5,9.5 21.5,15.5 17,21 12,22 7,21 2.5,15.5 2.5,9.5 6,4" />
    <polygon points="12,7.5 16.5,10.8 14.8,16 9.2,16 7.5,10.8" />
    <line x1="12" y1="7.5" x2="12" y2="2" />
    <line x1="16.5" y1="10.8" x2="21.5" y2="9.5" />
    <line x1="14.8" y1="16" x2="17" y2="21" />
    <line x1="9.2" y1="16" x2="7" y2="21" />
    <line x1="7.5" y1="10.8" x2="2.5" y2="9.5" />
  </svg>
);

const D100Icon: React.FC<{ className?: string }> = ({ className = "w-9 h-9" }) => (
  <svg viewBox="0 0 26 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Left Die */}
    <g transform="translate(-1, 0)">
      <polygon points="8,3 15,9 12,21 4,16 3,9" />
      <line x1="8" y1="3" x2="9" y2="15" />
      <line x1="9" y1="15" x2="12" y2="21" />
      <line x1="9" y1="15" x2="15" y2="9" />
      <line x1="9" y1="15" x2="3" y2="9" />
      <line x1="9" y1="15" x2="4" y2="16" />
    </g>
    {/* Right Die */}
    <g transform="translate(8, 2)">
      <polygon points="8,2 15,8 12,20 4,15 3,8" />
      <line x1="8" y1="2" x2="9" y2="14" />
      <line x1="9" y1="14" x2="12" y2="20" />
      <line x1="9" y1="14" x2="15" y2="8" />
      <line x1="9" y1="14" x2="3" y2="8" />
      <line x1="9" y1="14" x2="4" y2="15" />
    </g>
  </svg>
);

const D10Icon: React.FC<{ className?: string }> = ({ className = "w-9 h-9" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="12,2 20.5,9.5 16,21 8,21 3.5,9.5" />
    <line x1="12" y1="2" x2="12" y2="14.5" />
    <line x1="12" y1="14.5" x2="16" y2="21" />
    <line x1="12" y1="14.5" x2="8" y2="21" />
    <line x1="12" y1="14.5" x2="20.5" y2="9.5" />
    <line x1="12" y1="14.5" x2="3.5" y2="9.5" />
  </svg>
);

const D8Icon: React.FC<{ className?: string }> = ({ className = "w-9 h-9" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="12,2 21,12 12,22 3,12" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="12" y1="2" x2="12" y2="22" />
    <line x1="12" y1="2" x2="7" y2="12" />
    <line x1="7" y1="12" x2="12" y2="22" />
    <line x1="12" y1="2" x2="17" y2="12" />
    <line x1="17" y1="12" x2="12" y2="22" />
  </svg>
);

const D6Icon: React.FC<{ className?: string }> = ({ className = "w-9 h-9" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="12,2 21,7.2 21,16.8 12,22 3,16.8 3,7.2" />
    <line x1="12" y1="12" x2="12" y2="22" />
    <line x1="12" y1="12" x2="21" y2="7.2" />
    <line x1="12" y1="12" x2="3" y2="7.2" />
  </svg>
);

const D4Icon: React.FC<{ className?: string }> = ({ className = "w-9 h-9" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="12,3 21.5,19.5 2.5,19.5" />
    <line x1="12" y1="3" x2="12" y2="13.5" />
    <line x1="2.5" y1="19.5" x2="12" y2="13.5" />
    <line x1="21.5" y1="19.5" x2="12" y2="13.5" />
  </svg>
);

const DICE_ROW_TOP: DieDef[] = [
  { type: 'd20', sides: 20, label: 'd20', icon: D20Icon },
  { type: 'd12', sides: 12, label: 'd12', icon: D12Icon },
  { type: 'd100', sides: 100, label: 'd100', icon: D100Icon },
  { type: 'd10', sides: 10, label: 'd10', icon: D10Icon },
];

const DICE_ROW_BOTTOM: DieDef[] = [
  { type: 'd8', sides: 8, label: 'd8', icon: D8Icon },
  { type: 'd6', sides: 6, label: 'd6', icon: D6Icon },
  { type: 'd4', sides: 4, label: 'd4', icon: D4Icon },
];

export interface PlayerDiceRollerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDicePreset: DiceColorPreset;
  onOpenDicePalette: () => void;
  characterName?: string;
  onRoll: (rollEvent: DdbDiceRollEvent, isPublic: boolean) => void;
  onClearDice?: () => void;
}

export const PlayerDiceRollerModal: React.FC<PlayerDiceRollerModalProps> = ({
  isOpen,
  onClose,
  selectedDicePreset,
  onOpenDicePalette,
  characterName = 'Hero',
  onRoll,
  onClearDice
}) => {
  const [counts, setCounts] = useState<Record<SupportedDieType, number>>({
    d20: 0,
    d12: 0,
    d100: 0,
    d10: 0,
    d8: 0,
    d6: 0,
    d4: 0,
  });

  const [customFormula, setCustomFormula] = useState<string>('');
  const [modifier, setModifier] = useState<number>(0);
  const [mode, setMode] = useState<'pool' | 'advanced'>('pool');
  const [isPublic, setIsPublic] = useState<boolean>(true);

  const totalDiceCount = useMemo(() => {
    return Object.values(counts).reduce((sum, count) => sum + count, 0);
  }, [counts]);

  const poolFormula = useMemo(() => {
    const parts: string[] = [];
    const order: SupportedDieType[] = ['d20', 'd12', 'd100', 'd10', 'd8', 'd6', 'd4'];
    order.forEach(type => {
      const cnt = counts[type];
      if (cnt > 0) {
        parts.push(`${cnt}${type}`);
      }
    });
    const base = parts.join(' + ');
    if (!base) return '';
    if (modifier > 0) return `${base} + ${modifier}`;
    if (modifier < 0) return `${base} - ${Math.abs(modifier)}`;
    return base;
  }, [counts, modifier]);

  if (!isOpen) return null;

  const handleDieClick = (type: SupportedDieType) => {
    setCounts(prev => ({
      ...prev,
      [type]: (prev[type] || 0) + 1
    }));
  };

  const handleDieRightClick = (e: React.MouseEvent, type: SupportedDieType) => {
    e.preventDefault();
    setCounts(prev => ({
      ...prev,
      [type]: Math.max(0, (prev[type] || 0) - 1)
    }));
  };

  const handleReset = () => {
    setCounts({
      d20: 0,
      d12: 0,
      d100: 0,
      d10: 0,
      d8: 0,
      d6: 0,
      d4: 0,
    });
    setModifier(0);
    setCustomFormula('');
  };

  const handleApplyPreset = (formula: string) => {
    setMode('advanced');
    setCustomFormula(formula);
  };

  const handleExecuteRoll = () => {
    let finalFormula = mode === 'advanced' ? customFormula.trim() : poolFormula;
    if (!finalFormula) {
      if (totalDiceCount > 0) finalFormula = poolFormula;
      else return;
    }

    try {
      const advRoll = rollAdvancedDice(finalFormula);

      const rollEvent: DdbDiceRollEvent = {
        id: `roll-${Date.now()}`,
        characterName,
        action: 'Dice Roll',
        rollType: 'roll',
        formula: `${advRoll.output}`,
        diceNotation: advRoll.notation,
        dice: advRoll.dice,
        modifier,
        total: advRoll.total,
        isCritical: advRoll.isCritical,
        isFumble: advRoll.isFumble,
        theme: selectedDicePreset.id,
        themeColor: selectedDicePreset.theme.primaryColor,
        timestamp: Date.now(),
        source: 'local'
      };

      onRoll(rollEvent, isPublic);
      onClose();
    } catch (err) {
      console.error('Failed to execute advanced roll:', err);
    }
  };

  const renderDieButton = (die: DieDef) => {
    const count = counts[die.type];
    const IconComponent = die.icon;
    const isSelected = count > 0;

    return (
      <button
        key={die.type}
        type="button"
        onClick={() => handleDieClick(die.type)}
        onContextMenu={(e) => handleDieRightClick(e, die.type)}
        className={`group relative flex flex-col items-center justify-center p-2 rounded-2xl transition-all cursor-pointer select-none active:scale-95 ${
          isSelected
            ? 'bg-zinc-800/90 text-white shadow-lg ring-1 ring-amber-400/50'
            : 'text-zinc-300 hover:text-white hover:bg-zinc-800/50'
        }`}
        title={`Click to add ${die.label} (Right-click to remove)`}
      >
        {/* Quantity Badge */}
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-black font-mono flex items-center justify-center shadow-md animate-in zoom-in-50">
            {count}
          </span>
        )}

        <div className={`transition-transform duration-200 group-hover:scale-110 ${isSelected ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.35)]' : 'text-zinc-300'}`}>
          <IconComponent className="w-8 h-8" />
        </div>
        <span className={`text-xs font-bold font-mono mt-1 ${isSelected ? 'text-amber-300 font-extrabold' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
          {die.label}
        </span>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-[330px] rounded-2xl bg-[#1c1d21] border border-zinc-750 shadow-2xl overflow-hidden text-zinc-200 flex flex-col gap-3.5 p-4.5 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-1">
          <span className="text-sm font-bold tracking-tight text-zinc-100">
            Roll Dice
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dice Skin Customization Card */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800">
          <div className="flex items-center gap-3 min-w-0">
            {/* Visual D20 Die Preview Icon */}
            <div
              className="relative w-10 h-10 rounded-xl flex items-center justify-center shadow-inner shrink-0 border border-white/10"
              style={{
                backgroundColor: selectedDicePreset.theme.primaryColor || '#18181b',
              }}
            >
              <D20Icon className="w-7 h-7 text-white/90 drop-shadow-sm" />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white pointer-events-none drop-shadow">
                20
              </span>
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-zinc-200 truncate">
                {selectedDicePreset.name}
              </span>
              <button
                type="button"
                onClick={onOpenDicePalette}
                className="text-[11px] font-medium text-zinc-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer text-left"
              >
                <span>Change Dice</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenDicePalette}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Dice Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher: Pool Builder vs Advanced Notation */}
        <div className="grid grid-cols-2 p-1 bg-zinc-950/80 rounded-xl border border-zinc-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('pool')}
            className={`py-1.5 rounded-lg transition-all text-center cursor-pointer ${
              mode === 'pool'
                ? 'bg-zinc-850 text-amber-300 shadow-sm border border-zinc-700/60 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Dice Pool
          </button>
          <button
            type="button"
            onClick={() => setMode('advanced')}
            className={`py-1.5 rounded-lg transition-all text-center cursor-pointer ${
              mode === 'advanced'
                ? 'bg-zinc-850 text-amber-300 shadow-sm border border-zinc-700/60 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Advanced / 5e Math
          </button>
        </div>

        {mode === 'pool' ? (
          <>
            {/* Active Selection Formula Pill (When dice are staged) */}
            <div className="min-h-[20px] flex items-center justify-between px-1">
              <span className="text-[11px] font-mono text-zinc-400">
                {poolFormula ? (
                  <span className="text-amber-300 font-bold">Staged: {poolFormula}</span>
                ) : (
                  <span className="text-zinc-500">Tap dice to add to roll pool</span>
                )}
              </span>
              {totalDiceCount > 0 && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {totalDiceCount} {totalDiceCount === 1 ? 'die' : 'dice'}
                </span>
              )}
            </div>

            {/* Polyhedral Dice Grid */}
            <div className="flex flex-col gap-2 bg-zinc-950/60 p-2.5 rounded-2xl border border-zinc-850">
              {/* Row 1: d20, d12, d100, d10 */}
              <div className="grid grid-cols-4 gap-1.5">
                {DICE_ROW_TOP.map(renderDieButton)}
              </div>

              {/* Row 2: d8, d6, d4 */}
              <div className="grid grid-cols-3 gap-1.5 px-4">
                {DICE_ROW_BOTTOM.map(renderDieButton)}
              </div>
            </div>

            {/* Flat Modifier Stepper */}
            <div className="flex items-center justify-between px-2 py-1.5 bg-zinc-900/60 rounded-xl border border-zinc-800 text-xs">
              <span className="text-zinc-400 font-medium">Modifier:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setModifier(m => m - 1)}
                  className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center font-bold font-mono"
                >
                  -
                </button>
                <span className="font-mono font-bold w-9 text-center text-amber-300">
                  {modifier >= 0 ? `+${modifier}` : modifier}
                </span>
                <button
                  type="button"
                  onClick={() => setModifier(m => m + 1)}
                  className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center font-bold font-mono"
                >
                  +
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Advanced Notation Mode */
          <div className="flex flex-col gap-2.5 bg-zinc-950/60 p-3 rounded-2xl border border-zinc-850">
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                Custom Expression (D&D 5e / RPG Math):
              </label>
              <input
                type="text"
                value={customFormula}
                onChange={e => setCustomFormula(e.target.value)}
                placeholder="e.g. 4d6kh3, 2d20kh1+5, 1d10!, 2d8+1d6+3"
                className="w-full bg-zinc-900 text-amber-200 font-mono text-sm px-3 py-2 rounded-xl border border-zinc-700 focus:border-amber-500 outline-none placeholder:text-zinc-600"
              />
            </div>

            {/* Quick 5e Presets */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                Quick 5e Presets:
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('2d20kh1 + 5')}
                  className="px-2 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-emerald-300 border border-emerald-500/30 text-left truncate cursor-pointer transition-colors"
                >
                  ⚔️ Adv (2d20kh1+5)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('2d20kl1 + 5')}
                  className="px-2 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-rose-300 border border-rose-500/30 text-left truncate cursor-pointer transition-colors"
                >
                  🛡️ Dis (2d20kl1+5)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('4d6kh3')}
                  className="px-2 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-500/30 text-left truncate cursor-pointer transition-colors"
                >
                  🎲 Ability (4d6kh3)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('1d10!')}
                  className="px-2 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-purple-300 border border-purple-500/30 text-left truncate cursor-pointer transition-colors"
                >
                  💥 Explode (1d10!)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('1d20ro<2 + 5')}
                  className="px-2 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-sky-300 border border-sky-500/30 text-left truncate cursor-pointer transition-colors"
                >
                  ✨ GWF (1d20ro&lt;2)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('2d6ro<2 + 3')}
                  className="px-2 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-blue-300 border border-blue-500/30 text-left truncate cursor-pointer transition-colors"
                >
                  🗡️ Greatsword (2d6ro)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons: RESET & ROLL */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleReset}
            disabled={mode === 'pool' ? totalDiceCount === 0 : !customFormula.trim()}
            className="w-full py-2.5 rounded-xl font-bold font-mono text-xs uppercase tracking-wider transition-all cursor-pointer bg-[#2d3037] hover:bg-zinc-700 text-zinc-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed border border-zinc-700/40 active:scale-98"
          >
            RESET
          </button>

          <button
            type="button"
            onClick={handleExecuteRoll}
            disabled={mode === 'pool' ? totalDiceCount === 0 : !customFormula.trim()}
            className="w-full py-2.5 rounded-xl font-bold font-mono text-xs uppercase tracking-wider transition-all cursor-pointer bg-[#8b1e28] hover:bg-[#a12330] text-white disabled:opacity-40 disabled:cursor-not-allowed border border-rose-600/40 shadow-lg shadow-rose-950/40 active:scale-98 flex items-center justify-center gap-1.5"
          >
            <span>ROLL</span>
            {mode === 'pool' && totalDiceCount > 0 && <span>({totalDiceCount})</span>}
          </button>
        </div>

        {/* Footer: Target Selector (Self vs Everyone) & CLEAR DICE */}
        <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
          {/* Target Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex items-center p-0.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  !isPublic ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Roll to self (Private)"
              >
                <User className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isPublic ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Roll to everyone (Public)"
              >
                <Users className="w-3.5 h-3.5" />
              </button>
            </div>

            <span className="text-[11px] italic text-zinc-400">
              {isPublic ? 'Rolling to everyone' : 'Rolling to self'}
            </span>
          </div>

          {/* Clear Dice Button */}
          {onClearDice && (
            <button
              type="button"
              onClick={onClearDice}
              className="text-xs font-bold font-mono tracking-wider text-amber-400 hover:text-amber-300 transition-colors uppercase cursor-pointer"
              title="Clear resting 3D dice from the table"
            >
              CLEAR DICE
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
