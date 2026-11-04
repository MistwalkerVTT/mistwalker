// src/components/sidebar/CombatFlyoutPanel.tsx
// Dedicated flyout panel for Initiative, Combat Tracker, Target Auto-Damage, Screen Shake & AoE Rulers

import React from 'react';
import {
  Swords,
  Pin,
  X,
  Dices,
  HeartCrack,
  Skull,
  Zap,
  Ruler,
  Circle as CircleIcon,
  Wind,
  Square as SquareIcon
} from 'lucide-react';

export interface CombatFlyoutPanelProps {
  pinnedGroup: string | null;
  setPinnedGroup: (group: any) => void;
  closeFlyout: () => void;
  handleDragStart: (e: React.MouseEvent) => void;
  onPromptRollInitiative?: () => void;
  showCombatTracker: boolean;
  setShowCombatTracker: (show: boolean) => void;
  autoApplyMonsterDamage: boolean;
  onToggleAutoApplyMonsterDamage?: (val: boolean) => void;
  onOpenCriticalHitsModal?: () => void;
  triggerShake: () => void;
  tool: string;
  setTool: (tool: any) => void;
  measureType: string;
  setMeasureType: (type: any) => void;
}

export const CombatFlyoutPanel: React.FC<CombatFlyoutPanelProps> = ({
  pinnedGroup,
  setPinnedGroup,
  closeFlyout,
  handleDragStart,
  onPromptRollInitiative,
  showCombatTracker,
  setShowCombatTracker,
  autoApplyMonsterDamage,
  onToggleAutoApplyMonsterDamage,
  onOpenCriticalHitsModal,
  triggerShake,
  tool,
  setTool,
  measureType,
  setMeasureType
}) => {
  return (
    <div className="p-3.5 flex flex-col gap-3 min-w-[260px]">
      {/* Header */}
      <div
        onMouseDown={pinnedGroup ? handleDragStart : undefined}
        className={`flex items-center justify-between border-b border-zinc-800 pb-2.5 ${pinnedGroup ? 'cursor-grab active:cursor-grabbing select-none' : ''}`}
      >
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold font-mono text-zinc-200 uppercase tracking-wider">Combat & Measure</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPinnedGroup(pinnedGroup === 'combat' ? null : 'combat')}
            className={`p-1 rounded-md transition-colors ${pinnedGroup === 'combat' ? 'text-amber-400 bg-amber-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
            title={pinnedGroup === 'combat' ? 'Unpin Menu' : 'Pin Menu Open (Allows moving)'}
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

      {/* Initiative & Combat Tracking */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] uppercase font-bold font-mono text-zinc-400">Initiative & Tracking</span>
        
        {/* Roll for Initiative Button */}
        <button
          id="btn-roll-initiative-flyout"
          type="button"
          onClick={() => {
            if (onPromptRollInitiative) {
              onPromptRollInitiative();
            }
          }}
          className="w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-between border transition-all bg-gradient-to-r from-amber-600/30 to-amber-500/20 hover:from-amber-500/40 hover:to-amber-500/30 border-amber-500/50 text-amber-200 hover:text-white shadow-md shadow-amber-950/30 cursor-pointer active:scale-[0.98]"
          title="Prompt all tokens on map to roll initiative"
        >
          <span className="flex items-center gap-2">
            <Dices className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Roll for Initiative</span>
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-amber-500 text-black">
            PROMPT
          </span>
        </button>

        {/* Combat Tracker Toggle */}
        <button
          id="btn-toggle-combat-tracker-flyout"
          onClick={() => setShowCombatTracker(!showCombatTracker)}
          className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-between border transition-all ${
            showCombatTracker
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-md shadow-amber-950/40'
              : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-amber-400" />
            Combat Tracker
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${showCombatTracker ? 'bg-amber-500 text-black' : 'bg-zinc-900 text-zinc-400'}`}>
            {showCombatTracker ? 'ACTIVE' : 'OFF'}
          </span>
        </button>
      </div>

      {/* Auto-Apply Monster Damage Toggle */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-zinc-800/80">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold font-mono text-zinc-400">Target Damage Rule</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${autoApplyMonsterDamage ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>
            {autoApplyMonsterDamage ? 'AUTO DAMAGE' : 'MANUAL HP'}
          </span>
        </div>
        <button
          id="btn-toggle-auto-monster-damage"
          type="button"
          onClick={() => onToggleAutoApplyMonsterDamage?.(!autoApplyMonsterDamage)}
          className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-between border transition-all cursor-pointer ${
            autoApplyMonsterDamage
              ? 'bg-rose-500/15 border-rose-500/50 text-rose-200 shadow-sm'
              : 'bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:bg-zinc-800'
          }`}
          title={autoApplyMonsterDamage ? "Monsters automatically take damage when targeted by players" : "DM manually manages monster HP"}
        >
          <span className="flex items-center gap-2">
            <HeartCrack className={`w-4 h-4 ${autoApplyMonsterDamage ? 'text-rose-400' : 'text-zinc-500'}`} />
            <span>Auto Monster Damage</span>
          </span>
          <div className={`w-8 h-4 rounded-full transition-colors relative flex items-center px-0.5 ${autoApplyMonsterDamage ? 'bg-rose-500' : 'bg-zinc-700'}`}>
            <div className={`w-3 h-3 rounded-full bg-white transition-transform ${autoApplyMonsterDamage ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </button>
        <p className="text-[10px] text-zinc-400/90 leading-tight">
          {autoApplyMonsterDamage
            ? "Player spells & attacks automatically subtract damage from monster HP."
            : "Monsters will NOT take auto damage. Rolls are broadcast for the DM to apply manually."}
        </p>
      </div>

      {/* Critical Hits & Screen Shake FX */}
      <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
        <span className="text-[10px] uppercase font-bold font-mono text-zinc-400">Critical Hits & FX</span>
        
        {/* Critical Hits Table Reference Modal Trigger */}
        <button
          id="btn-open-critical-hits-table"
          type="button"
          onClick={() => {
            if (onOpenCriticalHitsModal) {
              onOpenCriticalHitsModal();
            }
          }}
          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-red-600/25 via-rose-600/20 to-amber-600/20 hover:from-red-600/35 hover:to-amber-600/30 border border-red-500/50 hover:border-red-400 text-red-200 hover:text-white text-xs font-bold transition-all flex items-center justify-between shadow-md shadow-red-950/30 cursor-pointer active:scale-[0.98]"
          title="Open Critical Hits Revisited Reference Tables (Damage Types, Injuries, Insanity)"
        >
          <span className="flex items-center gap-2">
            <Skull className="w-4 h-4 text-red-400 animate-pulse" />
            <span>Critical Hits Table</span>
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-red-500/30 text-red-300 border border-red-500/40">
            d20 CRIT
          </span>
        </button>

        {/* Critical Screen Shake */}
        <button
          id="btn-trigger-shake-flyout"
          onClick={triggerShake}
          className="w-full py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-bold transition-all flex items-center justify-between cursor-pointer"
          title="Trigger screen rumble effect across all screens"
        >
          <span className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-red-400" />
            Critical Hit Screen Shake
          </span>
          <span className="text-[10px] text-red-400/80 font-mono">SLAM</span>
        </button>
      </div>

      {/* AoE Measurement Shapes */}
      <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
        <span className="text-[10px] uppercase font-bold font-mono text-zinc-400">Measure Distance & AoE</span>
        <div className="grid grid-cols-1 gap-1.5">
          {[
            { type: 'line', label: 'Distance Ruler', icon: Ruler },
            { type: 'circle', label: 'Radius AoE (Circle)', icon: CircleIcon },
            { type: 'cone', label: 'Spell Cone (15/60ft)', icon: Wind },
            { type: 'square', label: 'Cube AoE (Square)', icon: SquareIcon },
            { type: 'rectangle', label: 'Wall AoE (Rectangle)', icon: SquareIcon }
          ].map((m) => {
            const Icon = m.icon;
            const isCurrent = tool === 'measure' && measureType === m.type;
            return (
              <button
                key={m.type}
                onClick={() => {
                  setTool('measure');
                  setMeasureType(m.type as any);
                }}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                  isCurrent
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold shadow-sm'
                    : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-amber-400" />
                  {m.label}
                </span>
                {isCurrent && <span className="w-2 h-2 rounded-full bg-amber-400" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CombatFlyoutPanel;
