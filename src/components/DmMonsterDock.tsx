// src/components/DmMonsterDock.tsx
// MistWalker DM Monster Tactical HUD Dock

import React, { useState, useMemo } from 'react';
import {
  Shield,
  Heart,
  Swords,
  Zap,
  Sparkles,
  RotateCcw,
  Crosshair,
  X,
  ChevronUp,
  ChevronDown,
  Crown,
  Eye,
  Footprints,
  Dices,
  BookOpen,
  Activity,
  Plus,
  Minus,
  AlertCircle
} from 'lucide-react';
import { DmMonsterHudData, MonsterActionItem, DmMonsterActionCategory } from '../types/monsterHud';

interface DmMonsterDockProps {
  hudData: DmMonsterHudData;
  onSelectAction: (action: MonsterActionItem) => void;
  onQuickRollAction: (action: MonsterActionItem) => void;
  onRollToHit?: (action: MonsterActionItem) => void;
  activeTargetingAction?: MonsterActionItem | null;
  onCancelTargeting?: () => void;
  onDeselectToken: () => void;
  onModifyHp: (delta: number) => void;
  onModifyTempHp: (delta: number) => void;
  onToggleRecharge: (actionName: string) => void;
  onRollRecharge: (action: MonsterActionItem) => void;
  onConsumeSpellSlot: (level: number) => void;
  onRestoreSpellSlot: (level: number) => void;
  onUseLegendaryAction: (cost?: number) => void;
  onResetLegendaryActions: () => void;
  onRenameToken?: (newName: string) => void;
  onDuplicateToken?: () => void;
  onDeleteToken?: () => void;
}

export const DmMonsterDock: React.FC<DmMonsterDockProps> = ({
  hudData,
  onSelectAction,
  onQuickRollAction,
  onRollToHit,
  activeTargetingAction,
  onCancelTargeting,
  onDeselectToken,
  onModifyHp,
  onModifyTempHp,
  onToggleRecharge,
  onRollRecharge,
  onConsumeSpellSlot,
  onRestoreSpellSlot,
  onUseLegendaryAction,
  onResetLegendaryActions
}) => {
  const [activeCategory, setActiveCategory] = useState<DmMonsterActionCategory>('attacks');
  const [selectedSpellLevel, setSelectedSpellLevel] = useState<number | 'all'>('all');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [hoveredAction, setHoveredAction] = useState<MonsterActionItem | null>(null);

  // Compute available categories with item counts
  const categoryCounts = useMemo(() => ({
    attacks: hudData.attacks.length,
    actions: hudData.actions.length,
    bonus_actions: hudData.bonusActions.length,
    spells: hudData.spells.length,
    reactions: hudData.reactions.length,
    legendary: hudData.legendaryActions.length,
    traits: hudData.traits.length
  }), [hudData]);

  // Current list based on active tab
  const currentCategoryList = useMemo(() => {
    switch (activeCategory) {
      case 'attacks':
        return hudData.attacks;
      case 'actions':
        return hudData.actions;
      case 'bonus_actions':
        return hudData.bonusActions;
      case 'spells':
        if (selectedSpellLevel === 'all') return hudData.spells;
        return hudData.spells.filter(s => s.level === selectedSpellLevel);
      case 'reactions':
        return hudData.reactions;
      case 'legendary':
        return hudData.legendaryActions;
      case 'traits':
        return hudData.traits;
      default:
        return [];
    }
  }, [activeCategory, selectedSpellLevel, hudData]);

  // Distinct spell levels for filtering
  const availableSpellLevels = useMemo(() => {
    const levels = Array.from(new Set(hudData.spells.map(s => s.level ?? 1))).sort((a, b) => a - b);
    return levels;
  }, [hudData.spells]);

  // Ability modifier calculation
  const getModStr = (score: number) => {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  // HP Percentage
  const hpPercent = Math.max(0, Math.min(100, Math.round((hudData.currentHp / Math.max(1, hudData.maxHp)) * 100)));

  return (
    <div
      id="dm-monster-tactical-dock"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95vw] max-w-5xl bg-zinc-950/95 backdrop-blur-xl border border-red-500/40 rounded-2xl shadow-[0_12px_45px_rgba(0,0,0,0.85)] font-mono text-zinc-200 overflow-hidden transition-all duration-300"
    >
      {/* Top Vital Bar & Creature Identity */}
      <div className="px-4 py-2.5 bg-gradient-to-r from-red-950/40 via-zinc-900/60 to-zinc-950/80 border-b border-red-500/20 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Token Portrait + Name + Subtitle */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-11 h-11 rounded-xl overflow-hidden border-2 border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.3)] bg-zinc-900 shrink-0">
            {hudData.avatarUrl ? (
              <img src={hudData.avatarUrl} alt={hudData.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-red-400">
                {hudData.name.charAt(0)}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-zinc-100 truncate" title={hudData.name}>
                {hudData.name}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-red-950/80 border border-red-500/40 text-red-400 text-[10px] font-bold shrink-0">
                CR {hudData.cr}
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 truncate">
              {hudData.size} {hudData.type} • {hudData.alignment}
            </div>
          </div>
        </div>

        {/* Center: HP Bar & Quick Modifiers */}
        <div className="flex items-center gap-2.5 bg-zinc-900/80 px-3 py-1.5 rounded-xl border border-zinc-800">
          <Heart className="w-4 h-4 text-red-400 shrink-0" />
          <div className="flex flex-col min-w-[120px]">
            <div className="flex justify-between items-center text-[10px] text-zinc-400 font-bold mb-0.5">
              <span>HP</span>
              <span className="text-zinc-200">
                {hudData.currentHp} / {hudData.maxHp}
                {hudData.tempHp > 0 && <span className="text-blue-400"> (+{hudData.tempHp})</span>}
              </span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  hpPercent > 50 ? 'bg-red-500' : hpPercent > 20 ? 'bg-amber-500' : 'bg-rose-700'
                }`}
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>

          {/* Instant HP delta buttons */}
          <div className="flex items-center gap-1 pl-1 border-l border-zinc-800">
            <button
              onClick={() => onModifyHp(-5)}
              className="px-1.5 py-0.5 rounded bg-red-950 hover:bg-red-900 text-red-300 text-[10px] font-bold border border-red-800/60"
              title="Deal 5 Damage"
            >
              -5
            </button>
            <button
              onClick={() => onModifyHp(-1)}
              className="px-1.5 py-0.5 rounded bg-red-950 hover:bg-red-900 text-red-300 text-[10px] font-bold border border-red-800/60"
              title="Deal 1 Damage"
            >
              -1
            </button>
            <button
              onClick={() => onModifyHp(1)}
              className="px-1.5 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 text-[10px] font-bold border border-emerald-800/60"
              title="Heal 1 HP"
            >
              +1
            </button>
            <button
              onClick={() => onModifyHp(5)}
              className="px-1.5 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 text-[10px] font-bold border border-emerald-800/60"
              title="Heal 5 HP"
            >
              +5
            </button>
          </div>
        </div>

        {/* Vital Statistics Badges */}
        <div className="flex items-center gap-2">
          {/* AC Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs font-bold text-amber-300">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>{hudData.ac}</span>
            {hudData.acNotes && <span className="text-[9px] text-zinc-500">AC</span>}
          </div>

          {/* Speed Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300">
            <Footprints className="w-3.5 h-3.5 text-blue-400" />
            <span>{hudData.speed.split(',')[0]}</span>
          </div>

          {/* Passive Perception */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300">
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            <span>PP {hudData.passivePerception}</span>
          </div>

          {/* Initiative Bonus */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300 font-bold">
            <span className="text-[10px] text-zinc-500 uppercase">Init</span>
            <span className="text-amber-400">
              {hudData.initiativeBonus >= 0 ? `+${hudData.initiativeBonus}` : hudData.initiativeBonus}
            </span>
          </div>
        </div>

        {/* Right: Collapse & Close */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsCollapsed(prev => !prev)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title={isCollapsed ? 'Expand Dock' : 'Collapse Dock'}
          >
            {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={onDeselectToken}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
            title="Deselect Creature (Escape)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expandable Action & Ability Tray */}
      {!isCollapsed && (
        <div className="p-3 space-y-3">
          {/* Ability Scores & Legendary Actions Sub-Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-zinc-900/60 rounded-xl border border-zinc-800/80 text-[11px]">
            {/* Ability Scores Strip */}
            <div className="flex items-center gap-2.5 overflow-x-auto sidebar-scrollbar py-0.5">
              {[
                { label: 'STR', val: hudData.str },
                { label: 'DEX', val: hudData.dex },
                { label: 'CON', val: hudData.con },
                { label: 'INT', val: hudData.int },
                { label: 'WIS', val: hudData.wis },
                { label: 'CHA', val: hudData.cha }
              ].map(ab => (
                <div key={ab.label} className="flex items-baseline gap-1 px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800/60 shrink-0">
                  <span className="font-bold text-zinc-400 text-[10px]">{ab.label}</span>
                  <span className="font-bold text-zinc-100">{ab.val}</span>
                  <span className="text-[10px] text-amber-400">({getModStr(ab.val)})</span>
                </div>
              ))}
            </div>

            {/* Legendary Actions Points Tracker if monster has them */}
            {hudData.legendaryActions.length > 0 && (
              <div className="flex items-center gap-2 shrink-0 bg-zinc-950 px-2.5 py-1 rounded-lg border border-amber-500/30">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-bold uppercase text-amber-300">Legendary:</span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: hudData.state.legendaryActionsMax }).map((_, i) => {
                    const isUsed = i < hudData.state.legendaryActionsUsed;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => onUseLegendaryAction(1)}
                        className={`w-3.5 h-3.5 rounded-full border transition-all ${
                          isUsed
                            ? 'bg-zinc-800 border-zinc-700'
                            : 'bg-amber-500 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                        }`}
                        title={isUsed ? 'Action Point Spent' : 'Action Point Ready (Click to spend)'}
                      />
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={onResetLegendaryActions}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-amber-300 transition-colors ml-1"
                  title="Reset Legendary Action Points"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-zinc-800 sidebar-scrollbar">
            {[
              { id: 'attacks', label: 'Attacks', icon: Swords, count: categoryCounts.attacks },
              { id: 'actions', label: 'Actions', icon: Activity, count: categoryCounts.actions },
              { id: 'bonus_actions', label: 'Bonus Actions', icon: Zap, count: categoryCounts.bonus_actions },
              { id: 'spells', label: 'Spells', icon: Sparkles, count: categoryCounts.spells },
              { id: 'reactions', label: 'Reactions', icon: Shield, count: categoryCounts.reactions },
              { id: 'legendary', label: 'Legendary', icon: Crown, count: categoryCounts.legendary },
              { id: 'traits', label: 'Traits & Defenses', icon: BookOpen, count: categoryCounts.traits }
            ].map(tab => {
              if (tab.count === 0 && tab.id !== 'attacks' && tab.id !== 'traits') return null;
              const Icon = tab.icon;
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id as DmMonsterActionCategory)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-red-500/20 text-red-300 border border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.25)]'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-900 border border-zinc-700 text-zinc-300">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Spell Filter & Slot Management Bar (Spells Tab Only) */}
          {activeCategory === 'spells' && (
            <div className="space-y-2 pb-1">
              {/* Spell Slots tracker */}
              {Object.keys(hudData.spellSlots).length > 0 && (
                <div className="flex items-center gap-3 bg-zinc-900/60 px-3 py-1.5 rounded-xl border border-zinc-800 text-[11px] overflow-x-auto sidebar-scrollbar">
                  <span className="text-[10px] font-bold uppercase text-zinc-500 shrink-0">Spell Slots:</span>
                  {Object.values(hudData.spellSlots).map(slot => (
                    <div key={slot.level} className="flex items-center gap-1.5 shrink-0 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                      <span className="font-bold text-zinc-300">Lvl {slot.level}:</span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: slot.total }).map((_, i) => {
                          const isUsed = i < slot.used;
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => isUsed ? onRestoreSpellSlot(slot.level) : onConsumeSpellSlot(slot.level)}
                              className={`w-3 h-3 rounded-sm border transition-all ${
                                isUsed
                                  ? 'bg-zinc-800 border-zinc-700'
                                  : 'bg-blue-500 border-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.5)]'
                              }`}
                              title={isUsed ? 'Slot Used (Click to restore)' : 'Slot Available (Click to use)'}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Spell Level Filter Pills */}
              {availableSpellLevels.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto sidebar-scrollbar">
                  <button
                    onClick={() => setSelectedSpellLevel('all')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                      selectedSpellLevel === 'all'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                        : 'text-zinc-400 hover:bg-zinc-900'
                    }`}
                  >
                    All Levels
                  </button>
                  {availableSpellLevels.map(lvl => (
                    <button
                      key={lvl}
                      onClick={() => setSelectedSpellLevel(lvl)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                        selectedSpellLevel === lvl
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                          : 'text-zinc-400 hover:bg-zinc-900'
                      }`}
                    >
                      {lvl === 0 ? 'Cantrip' : `Lvl ${lvl}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Traits & Defenses Special Overview Tab */}
          {activeCategory === 'traits' ? (
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 sidebar-scrollbar text-xs">
              {/* Senses, Immunities, Resistances Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {hudData.senses && (
                  <div className="p-2 rounded-xl bg-zinc-900/70 border border-zinc-800">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-0.5">Senses</span>
                    <span className="text-zinc-300">{hudData.senses}</span>
                  </div>
                )}
                {hudData.damageResistances && (
                  <div className="p-2 rounded-xl bg-zinc-900/70 border border-zinc-800">
                    <span className="text-[10px] uppercase font-bold text-amber-500 block mb-0.5">Damage Resistances</span>
                    <span className="text-zinc-300">{hudData.damageResistances}</span>
                  </div>
                )}
                {hudData.damageImmunities && (
                  <div className="p-2 rounded-xl bg-zinc-900/70 border border-zinc-800">
                    <span className="text-[10px] uppercase font-bold text-emerald-500 block mb-0.5">Damage Immunities</span>
                    <span className="text-zinc-300">{hudData.damageImmunities}</span>
                  </div>
                )}
                {hudData.conditionImmunities && (
                  <div className="p-2 rounded-xl bg-zinc-900/70 border border-zinc-800">
                    <span className="text-[10px] uppercase font-bold text-emerald-500 block mb-0.5">Condition Immunities</span>
                    <span className="text-zinc-300">{hudData.conditionImmunities}</span>
                  </div>
                )}
                {hudData.damageVulnerabilities && (
                  <div className="p-2 rounded-xl bg-zinc-900/70 border border-zinc-800">
                    <span className="text-[10px] uppercase font-bold text-rose-500 block mb-0.5">Vulnerabilities</span>
                    <span className="text-zinc-300">{hudData.damageVulnerabilities}</span>
                  </div>
                )}
                {hudData.savingThrows && (
                  <div className="p-2 rounded-xl bg-zinc-900/70 border border-zinc-800">
                    <span className="text-[10px] uppercase font-bold text-blue-400 block mb-0.5">Saving Throws</span>
                    <span className="text-zinc-300">{hudData.savingThrows}</span>
                  </div>
                )}
              </div>

              {/* Traits List */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">Creature Traits</span>
                {hudData.traits.map((tr, idx) => (
                  <div key={tr.id || idx} className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
                    <span className="font-bold text-red-300 font-mono block mb-1">{tr.name}</span>
                    <p className="text-zinc-400 text-xs leading-relaxed">{tr.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Action Cards Grid for Attacks, Actions, Bonus Actions, Spells, Reactions, Legendary */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-1 sidebar-scrollbar">
              {currentCategoryList.map((action, idx) => {
                const isTargetingThis = activeTargetingAction?.id === action.id;
                const formattedHit = action.hitBonus !== undefined
                  ? String(action.hitBonus).startsWith('+') || String(action.hitBonus).startsWith('-')
                    ? String(action.hitBonus)
                    : `+${action.hitBonus}`
                  : null;

                return (
                  <div
                    key={action.id || idx}
                    onMouseEnter={() => setHoveredAction(action)}
                    onMouseLeave={() => setHoveredAction(null)}
                    className={`group p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                      isTargetingThis
                        ? 'border-red-400 bg-red-950/30 shadow-[0_0_15px_rgba(239,68,68,0.4)] ring-1 ring-red-400'
                        : 'border-zinc-800/90 hover:border-red-500/50 bg-zinc-900/80 hover:bg-zinc-900'
                    }`}
                  >
                    {/* Top Row: Name + Range/Level Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-zinc-100 group-hover:text-red-200 truncate">
                            {action.name}
                          </span>
                          {action.level !== undefined && (
                            <span className="px-1.5 py-0.2 rounded bg-blue-950 border border-blue-500/40 text-blue-300 text-[9px] font-bold shrink-0">
                              {action.level === 0 ? 'Cantrip' : `Lvl ${action.level}`}
                            </span>
                          )}
                          {action.legendaryCost && action.legendaryCost > 1 && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-950 border border-amber-500/40 text-amber-300 text-[9px] font-bold shrink-0">
                              {action.legendaryCost} Actions
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mt-0.5 truncate">
                          <span>{action.reachRange || (action.rangeFt ? `${action.rangeFt} ft.` : 'Self')}</span>
                          {action.damageType && (
                            <>
                              <span>•</span>
                              <span className="capitalize">{action.damageType}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Recharge Status Pill */}
                      {action.recharge && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!action.isRecharged) {
                              onRollRecharge(action);
                            } else {
                              onToggleRecharge(action.name);
                            }
                          }}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${
                            action.isRecharged
                              ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-300'
                              : 'bg-amber-950 border border-amber-500/50 text-amber-300 hover:bg-amber-900'
                          }`}
                          title={action.isRecharged ? 'Ready to use' : 'Recharge spent! Click to roll 1d6'}
                        >
                          {action.isRecharged ? `Ready (${action.recharge})` : `Roll Recharge (${action.recharge})`}
                        </button>
                      )}
                    </div>

                    {/* Middle: Hit, Save, Damage Badges */}
                    <div className="flex items-center gap-1.5 font-mono text-[10px]">
                      {formattedHit && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onRollToHit) {
                              onRollToHit(action);
                            } else {
                              onQuickRollAction(action);
                            }
                          }}
                          className="flex flex-col items-center px-2 py-0.5 rounded bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 hover:text-white transition-all cursor-pointer active:scale-95 shadow-sm group/hit shrink-0"
                          title={`Click to Roll to Hit: 1d20 ${formattedHit}`}
                          aria-label={`Roll to Hit: 1d20 ${formattedHit}`}
                        >
                          <span className="text-[7px] uppercase text-emerald-400/80 group-hover/hit:text-emerald-200 leading-none">Hit</span>
                          <span className="font-bold text-xs">{formattedHit}</span>
                        </button>
                      )}

                      {action.saveDc && (
                        <div className="flex flex-col items-center px-2 py-0.5 rounded bg-amber-950/90 border border-amber-500/40 text-amber-300">
                          <span className="text-[7px] uppercase text-amber-400/80 leading-none">
                            {action.saveAbility || 'Save'}
                          </span>
                          <span className="font-bold text-xs">DC {action.saveDc}</span>
                        </div>
                      )}

                      {action.damageFormula && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAction(action);
                          }}
                          className="flex flex-col items-center px-2 py-0.5 rounded bg-red-950/90 hover:bg-red-900 border border-red-500/40 hover:border-red-400 text-red-300 hover:text-white transition-all cursor-pointer active:scale-95 shadow-sm group/dmg shrink-0"
                          title={`Aim & Cast: ${action.name} (${action.damageFormula})`}
                          aria-label={`Aim ${action.name}: ${action.damageFormula}`}
                        >
                          <span className="text-[7px] uppercase text-red-400/80 group-hover/dmg:text-red-200 leading-none">Dmg</span>
                          <span className="font-bold text-xs">{action.damageFormula}</span>
                        </button>
                      )}
                    </div>

                    {/* Bottom Actions Row: Aim & Quick Roll */}
                    <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-800/80">
                      {/* Aim / Place on Map */}
                      <button
                        type="button"
                        onClick={() => onSelectAction(action)}
                        className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                          isTargetingThis
                            ? 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white'
                        }`}
                        title="Aim & Place on Battlemap"
                      >
                        <Crosshair className="w-3 h-3 text-red-400" />
                        <span>{isTargetingThis ? 'Aiming...' : 'Aim'}</span>
                      </button>

                      {/* Quick Roll in 3D Dice */}
                      {(action.hitBonus !== undefined || action.damageFormula !== undefined) && (
                        <button
                          type="button"
                          onClick={() => onQuickRollAction(action)}
                          className="py-1 px-2.5 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-700/60 text-[10px] font-bold flex items-center gap-1 transition-all"
                          title="Quick Roll Attack & Damage with 3D Physics Dice"
                        >
                          <Dices className="w-3 h-3 text-red-400" />
                          <span>Roll</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Description Preview Tooltip Footer */}
          {hoveredAction && (
            <div className="relative px-3 py-1.5 pr-8 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 leading-snug animate-in fade-in duration-150">
              <span className="font-bold text-red-300 mr-1.5">{hoveredAction.name}:</span>
              <span>{hoveredAction.description}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setHoveredAction(null);
                }}
                className="absolute top-1.5 right-1.5 p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Close description"
                aria-label="Close description"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
