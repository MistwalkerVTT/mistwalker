// src/components/CombatDicePromptModal.tsx
// Interactive step-by-step modal prompting the player when Auto Roll is OFF:
// Step 1: Prompt to roll d20 to-hit (Input manual tabletop d20 roll OR roll 3D in-game dice)
// Step 2: If hit (or spell/heal requiring no attack roll), prompt to roll damage/healing
//         (Input manual tabletop damage total OR roll exact dice formula in-game in 3D)

import React, { useState, useEffect, useRef } from 'react';
import {
  Dices,
  Sparkles,
  Shield,
  ShieldAlert,
  ShieldCheck,
  X,
  Check,
  Swords,
  Heart,
  Zap,
  Target
} from 'lucide-react';
import { HudActionItem, evaluateDiceFormula } from '../types/hud';
import { DdbDiceRollEvent } from '../types/dice';
import { soundCatalog } from '../effects';

export type CombatRollPromptPhase = 'to_hit' | 'damage';
export type RollAdvantageMode = 'normal' | 'advantage' | 'disadvantage';

export interface PendingCombatRoll {
  actor: {
    id: string;
    name: string;
    avatarUrl?: string;
    team?: string;
  };
  target: {
    id: string;
    name: string;
    avatarUrl?: string;
    ac?: number;
    team?: string;
    currentHp?: number;
    maxHp?: number;
  };
  action: HudActionItem;
  phase: CombatRollPromptPhase;
  // To-Hit info
  hitBonus: number;
  d20Roll?: number;
  toHitTotal?: number;
  isCrit?: boolean;
  isFumble?: boolean;
  isThreatened?: boolean; // Close combat disadvantage
  advantageMode?: RollAdvantageMode;
  // Damage info
  damageFormula: string;
  damageTotal?: number;
  isHeal?: boolean;
  isSave?: boolean;
  saveDc?: number;
  saveAbility?: string;
  // Context & Metadata
  targetPointPx?: { x: number; y: number };
  expendedActionSlot?: number;
  context?: 'arena' | 'player_view';
}

interface CombatDicePromptModalProps {
  pendingRoll: PendingCombatRoll | null;
  onClose: () => void;
  onResolveHit: (result: {
    d20: number;
    total: number;
    isCrit: boolean;
    isFumble: boolean;
    hits: boolean;
    advantageMode: RollAdvantageMode;
  }) => void;
  onResolveDamage: (result: {
    damageTotal: number;
    breakdown: string;
    isCrit: boolean;
    diceEvent?: DdbDiceRollEvent;
  }) => void;
  onEnableAutoRollAndContinue: () => void;
  onTrigger3dDice?: (diceEvent: DdbDiceRollEvent) => void;
}

export const CombatDicePromptModal: React.FC<CombatDicePromptModalProps> = ({
  pendingRoll,
  onClose,
  onResolveHit,
  onResolveDamage,
  onEnableAutoRollAndContinue,
  onTrigger3dDice
}) => {
  const [manualInput, setManualInput] = useState<string>('');
  const [advantageMode, setAdvantageMode] = useState<RollAdvantageMode>('normal');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (pendingRoll) {
      setManualInput('');
      if (pendingRoll.isThreatened) {
        setAdvantageMode('disadvantage');
      } else if (pendingRoll.advantageMode) {
        setAdvantageMode(pendingRoll.advantageMode);
      } else {
        setAdvantageMode('normal');
      }

      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 90);
      return () => clearTimeout(timer);
    }
  }, [pendingRoll?.phase, pendingRoll?.action?.id, pendingRoll?.target?.id]);

  if (!pendingRoll) return null;

  const { actor, target, action, phase, hitBonus, isCrit, damageFormula, isHeal, saveDc, saveAbility } =
    pendingRoll;

  // Determine effective formula (crit doubles dice)
  let effectiveDamageFormula = damageFormula || (isHeal ? '1d8 + 3' : '1d8');
  if (isCrit && !effectiveDamageFormula.startsWith('2*')) {
    // If crit, double dice count in formula (e.g. 1d8 -> 2d8, 2d6 -> 4d6)
    effectiveDamageFormula = effectiveDamageFormula.replace(
      /^(\d+)d(\d+)/i,
      (_, count, sides) => `${Number(count) * 2}d${sides}`
    );
  }

  const rawInputValue = parseInt(manualInput.trim(), 10);
  const isValidNumber = !isNaN(rawInputValue) && rawInputValue >= 0;

  // Target AC handling
  const targetAc = typeof target.ac === 'number' && target.ac > 0 ? target.ac : 13;
  const hasKnownAc = typeof target.ac === 'number' && target.ac > 0;

  // Real-time calculation preview for To-Hit
  let previewD20 = 0;
  let previewTotal = 0;
  let previewHits = false;
  let previewCrit = false;
  let previewFumble = false;

  if (phase === 'to_hit' && isValidNumber) {
    if (rawInputValue >= 1 && rawInputValue <= 20) {
      previewD20 = rawInputValue;
      previewTotal = previewD20 + hitBonus;
    } else {
      // User entered total directly
      previewTotal = rawInputValue;
      previewD20 = Math.max(1, Math.min(20, previewTotal - hitBonus));
    }
    previewCrit = previewD20 === 20;
    previewFumble = previewD20 === 1;
    previewHits = previewCrit || (!previewFumble && previewTotal >= targetAc);
  }

  // Handle Manual Submit
  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isValidNumber) return;

    if (phase === 'to_hit') {
      let d20 = 10;
      let total = 10 + hitBonus;
      if (rawInputValue >= 1 && rawInputValue <= 20) {
        d20 = rawInputValue;
        total = d20 + hitBonus;
      } else {
        total = rawInputValue;
        d20 = Math.max(1, Math.min(20, total - hitBonus));
      }

      const crit = d20 === 20;
      const fumble = d20 === 1;
      const hits = crit || (!fumble && total >= targetAc);

      if (crit) {
        soundCatalog.play('thunder_boom', 0.9);
      } else if (!hits) {
        soundCatalog.play('shield_clash', 0.7);
      } else {
        soundCatalog.play('metal_clang', 0.8);
      }

      onResolveHit({
        d20,
        total,
        isCrit: crit,
        isFumble: fumble,
        hits,
        advantageMode
      });
    } else {
      // Damage phase manual submit
      const damageTotal = Math.max(0, rawInputValue);
      const diceEvent: DdbDiceRollEvent = {
        id: `manual-dmg-${Date.now()}`,
        characterName: actor.name,
        action: `${action.name} (Manual ${isHeal ? 'Healing' : 'Damage'})`,
        rollType: isHeal ? 'heal' : 'damage',
        formula: `${effectiveDamageFormula} = ${damageTotal}`,
        diceNotation: effectiveDamageFormula,
        dice: [{ sides: 8, result: damageTotal, type: 'manual' }],
        modifier: 0,
        total: damageTotal,
        isCritical: Boolean(isCrit),
        isFumble: false,
        theme: 'default',
        themeColor: isHeal ? '#10b981' : isCrit ? '#f59e0b' : '#38bdf8',
        timestamp: Date.now(),
        source: 'player'
      };

      if (onTrigger3dDice) {
        onTrigger3dDice(diceEvent);
      }
      if (typeof window !== 'undefined' && (window as any).__mistwalkerRoll3d) {
        (window as any).__mistwalkerRoll3d(diceEvent);
      }

      onResolveDamage({
        damageTotal,
        breakdown: `Manual Roll: ${damageTotal}`,
        isCrit: Boolean(isCrit),
        diceEvent
      });
    }
  };

  // Handle Roll In-Game (3D Physics Dice)
  const handleRollInGame = () => {
    if (phase === 'to_hit') {
      const roll1 = Math.floor(Math.random() * 20) + 1;
      const roll2 = Math.floor(Math.random() * 20) + 1;
      let d20 = roll1;
      let diceList = [{ sides: 20, result: roll1, type: 'd20' }];
      let formulaStr = `1d20 (${roll1}) + ${hitBonus}`;

      if (advantageMode === 'advantage') {
        d20 = Math.max(roll1, roll2);
        diceList = [
          { sides: 20, result: roll1, type: 'd20' },
          { sides: 20, result: roll2, type: 'd20' }
        ];
        formulaStr = `2d20kh1 [${roll1}, ${roll2}] (${d20}) + ${hitBonus}`;
      } else if (advantageMode === 'disadvantage') {
        d20 = Math.min(roll1, roll2);
        diceList = [
          { sides: 20, result: roll1, type: 'd20' },
          { sides: 20, result: roll2, type: 'd20' }
        ];
        formulaStr = `2d20kl1 [${roll1}, ${roll2}] (${d20}) + ${hitBonus}`;
      }

      const total = d20 + hitBonus;
      const crit = d20 === 20;
      const fumble = d20 === 1;
      const hits = crit || (!fumble && total >= targetAc);

      const diceEvent: DdbDiceRollEvent = {
        id: `ingame-atk-${Date.now()}`,
        characterName: actor.name,
        action: `${action.name} (Attack Roll vs AC ${targetAc})`,
        rollType: 'attack',
        formula: `${formulaStr} = ${total}`,
        diceNotation: advantageMode === 'normal' ? '1d20' : advantageMode === 'advantage' ? '2d20kh1' : '2d20kl1',
        dice: diceList,
        modifier: hitBonus,
        total,
        isCritical: crit,
        isFumble: fumble,
        theme: 'default',
        themeColor: crit ? '#10b981' : fumble ? '#ef4444' : '#38bdf8',
        timestamp: Date.now(),
        source: 'player'
      };

      if (onTrigger3dDice) {
        onTrigger3dDice(diceEvent);
      }
      if (typeof window !== 'undefined' && (window as any).__mistwalkerRoll3d) {
        (window as any).__mistwalkerRoll3d(diceEvent);
      }

      if (crit) {
        soundCatalog.play('thunder_boom', 0.9);
      } else if (!hits) {
        soundCatalog.play('shield_clash', 0.7);
      } else {
        soundCatalog.play('metal_clang', 0.8);
      }

      onResolveHit({
        d20,
        total,
        isCrit: crit,
        isFumble: fumble,
        hits,
        advantageMode
      });
    } else {
      // In-game 3D roll for damage or heal
      const evaluated = evaluateDiceFormula(effectiveDamageFormula, Boolean(isCrit));
      const damageTotal = Math.max(0, evaluated.total);

      const diceEvent: DdbDiceRollEvent = {
        id: `ingame-dmg-${Date.now()}`,
        characterName: actor.name,
        action: `${action.name}${isCrit ? ' (CRITICAL HIT)' : ''} (${isHeal ? 'Healing' : 'Damage'})`,
        rollType: isHeal ? 'heal' : 'damage',
        formula: `${effectiveDamageFormula} → ${evaluated.breakdown}`,
        diceNotation: effectiveDamageFormula,
        dice: evaluated.dice.length > 0 ? evaluated.dice : [{ sides: 8, result: damageTotal, type: 'd8' }],
        modifier: evaluated.bonus,
        total: damageTotal,
        isCritical: Boolean(isCrit),
        isFumble: false,
        theme: 'default',
        themeColor: isHeal ? '#10b981' : isCrit ? '#f59e0b' : '#ef4444',
        timestamp: Date.now(),
        source: 'player'
      };

      if (onTrigger3dDice) {
        onTrigger3dDice(diceEvent);
      }
      if (typeof window !== 'undefined' && (window as any).__mistwalkerRoll3d) {
        (window as any).__mistwalkerRoll3d(diceEvent);
      }

      if (isHeal) {
        soundCatalog.play('radiant_heal', 0.85);
      } else {
        soundCatalog.play('metal_clang', 0.85);
      }

      onResolveDamage({
        damageTotal,
        breakdown: evaluated.breakdown,
        isCrit: Boolean(isCrit),
        diceEvent
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-zinc-950 border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.25)] text-white space-y-4 sm:space-y-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="combat-dice-prompt-title"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
          aria-label="Cancel attack"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pr-8">
          <div
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-inner ${
              isCrit
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : isHeal
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : phase === 'to_hit'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                : 'bg-rose-500/20 border-rose-400 text-rose-300'
            }`}
          >
            {isCrit ? (
              <Sparkles className="w-6 h-6 animate-spin text-amber-300" />
            ) : isHeal ? (
              <Heart className="w-6 h-6 animate-pulse text-emerald-400" />
            ) : phase === 'to_hit' ? (
              <Target className="w-6 h-6 animate-pulse text-cyan-400" />
            ) : (
              <Swords className="w-6 h-6 text-rose-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
                Auto Roll: OFF
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                {phase === 'to_hit' ? 'Step 1 of 2: To-Hit' : 'Step 2: Damage'}
              </span>
            </div>
            <h3 id="combat-dice-prompt-title" className="text-lg font-bold text-zinc-100 truncate mt-0.5">
              {action.name}
            </h3>
            <p className="text-xs text-zinc-400 truncate">
              <span className="text-amber-300 font-semibold">{actor.name}</span>
              {target.id !== actor.id && (
                <>
                  {' '}
                  targeting <span className="text-zinc-200 font-semibold">{target.name}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Tactical Info Badge */}
        <div className="p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-xs space-y-1.5 font-mono">
          {phase === 'to_hit' ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Target Armor Class:</span>
                <span className="text-amber-300 font-bold flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  {hasKnownAc ? `AC ${targetAc}` : `AC ~${targetAc} (Advisory)`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Attack Modifier:</span>
                <span className="text-cyan-300 font-bold">
                  {hitBonus >= 0 ? `+${hitBonus}` : hitBonus} to hit
                </span>
              </div>
              {pendingRoll.isThreatened && (
                <div className="flex items-center justify-between text-rose-300 text-[11px] pt-0.5">
                  <span className="flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-rose-400" /> Hostile within 5ft melee:
                  </span>
                  <span className="font-bold uppercase">Disadvantage</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">
                  {isHeal ? 'Healing Formula:' : isCrit ? 'Critical Damage (Doubled Dice):' : 'Damage Formula:'}
                </span>
                <span className={`font-bold ${isCrit ? 'text-amber-300' : isHeal ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {effectiveDamageFormula} {action.damageType ? `(${action.damageType})` : ''}
                </span>
              </div>
              {action.castAtLevel && action.level !== undefined && action.castAtLevel > action.level && (
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Upcast Level:</span>
                  <span className="text-purple-300 font-bold">Level {action.castAtLevel} Slot</span>
                </div>
              )}
              {saveDc && (
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Saving Throw:</span>
                  <span className="text-amber-300 font-bold">{saveAbility || 'DEX'} DC {saveDc}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Advantage / Disadvantage Pills (To-Hit phase only) */}
        {phase === 'to_hit' && (
          <div className="flex items-center justify-between bg-zinc-900/60 p-1.5 rounded-xl border border-zinc-800 text-xs font-mono">
            <span className="text-zinc-400 text-[11px] px-2 font-medium">Roll Mode:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setAdvantageMode('disadvantage')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  advantageMode === 'disadvantage'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Disadvantage
              </button>
              <button
                type="button"
                onClick={() => setAdvantageMode('normal')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  advantageMode === 'normal'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => setAdvantageMode('advantage')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  advantageMode === 'advantage'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Advantage
              </button>
            </div>
          </div>
        )}

        {/* Option 1: Manual Input (Tabletop Physical Dice) */}
        <form onSubmit={handleManualSubmit} className="space-y-2 p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
          <label htmlFor="manual-dice-input" className="block text-xs font-medium text-zinc-300">
            🎲 Option 1: Enter physical dice roll (from table at home)
          </label>
          <div className="flex items-center gap-2">
            <input
              id="manual-dice-input"
              ref={inputRef}
              type="number"
              min="0"
              max="999"
              placeholder={
                phase === 'to_hit'
                  ? 'e.g. 15 (d20 roll) or 22 (total)'
                  : isHeal
                  ? 'e.g. 9 (total healing)'
                  : 'e.g. 14 (total damage)'
              }
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-amber-300 font-mono font-bold text-base focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 placeholder:text-zinc-600 placeholder:text-xs"
            />
            <button
              type="submit"
              disabled={!isValidNumber}
              className={`px-4 py-2.5 rounded-xl font-bold font-mono text-xs flex items-center gap-1.5 transition-all shadow-md shrink-0 ${
                isValidNumber
                  ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 cursor-pointer active:scale-95 shadow-amber-500/20'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{phase === 'to_hit' ? 'Submit Attack' : isHeal ? 'Apply Heal' : 'Apply Damage'}</span>
            </button>
          </div>

          {/* Live Preview / Guidance */}
          {phase === 'to_hit' ? (
            isValidNumber ? (
              <div
                className={`text-xs font-mono font-semibold p-2 rounded-xl flex items-center justify-between ${
                  previewCrit
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : previewFumble
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : previewHits
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                }`}
              >
                <span>
                  d20: {previewD20} + {hitBonus} = <strong className="text-white">{previewTotal}</strong>
                </span>
                <span>
                  {previewCrit
                    ? '💥 NATURAL 20 CRITICAL HIT!'
                    : previewFumble
                    ? '💨 NATURAL 1 FUMBLE MISS'
                    : previewHits
                    ? `🎯 HITS vs AC ${targetAc}!`
                    : `💨 MISSES vs AC ${targetAc}`}
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-zinc-500">
                Type your d20 roll (1–20) or total. Hit bonus (+{hitBonus}) is automatically included.
              </p>
            )
          ) : (
            <p className="text-[11px] text-zinc-500">
              Type the sum of your physical dice (e.g. rolled {effectiveDamageFormula}).
            </p>
          )}
        </form>

        <div className="relative flex py-0.5 items-center">
          <div className="flex-grow border-t border-zinc-800" />
          <span className="flex-shrink mx-3 text-[10px] uppercase tracking-widest text-zinc-500 font-mono font-semibold">
            Or Use In-Game 3D Dice
          </span>
          <div className="flex-grow border-t border-zinc-800" />
        </div>

        {/* Options 2 & 3: Roll in-game or Turn On Auto Roll */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleRollInGame}
            className="w-full p-3 rounded-2xl bg-zinc-900 hover:bg-zinc-850 border border-cyan-500/40 hover:border-cyan-400 text-left transition-all group cursor-pointer active:scale-98 shadow-sm"
          >
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs mb-1">
              <Dices className="w-4 h-4 text-cyan-400 group-hover:rotate-12 transition-transform" />
              <span>
                {phase === 'to_hit'
                  ? advantageMode === 'normal'
                    ? 'Roll 1d20 In Game'
                    : advantageMode === 'advantage'
                    ? 'Roll 2d20 Advantage In Game'
                    : 'Roll 2d20 Disadvantage In Game'
                  : `Roll ${effectiveDamageFormula} In Game`}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-snug">
              Tumbles physics dice on screen. Auto Roll stays OFF.
            </p>
          </button>

          <button
            type="button"
            onClick={onEnableAutoRollAndContinue}
            className="w-full p-3 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-zinc-900 hover:bg-emerald-900/40 border border-emerald-500/40 hover:border-emerald-400 text-left transition-all group cursor-pointer active:scale-98 shadow-sm"
          >
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs mb-1">
              <Sparkles className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>Turn On Auto Roll</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-snug">
              Turn ON Auto Roll for {actor.name} and resolve automatically.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
