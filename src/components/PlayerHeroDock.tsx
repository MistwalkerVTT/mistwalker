import React, { useState, useMemo, useEffect } from 'react';
import {
  Shield,
  Heart,
  Zap,
  Swords,
  Sparkles,
  Package,
  ExternalLink,
  ChevronUp,
  RotateCcw,
  Target,
  Crosshair,
  X,
  Tv,
  RefreshCw,
  Flame,
  Wand2
} from 'lucide-react';
import { HudCharacterData, HudActionItem, HudActionCategory } from '../types/hud';

interface PlayerHeroDockProps {
  characterData: HudCharacterData | null;
  claimedToken: any | null;
  onSelectAction: (action: HudActionItem) => void;
  activeTargetingAction: HudActionItem | null;
  onCancelTargeting: () => void;
  onEndTurn?: () => void;
  isMyTurn?: boolean;
  onSwitchStationMode?: () => void;
  onOpenRestModal?: () => void;
  onRefreshDdb?: () => void;
  isSyncingDdb?: boolean;
}

export const PlayerHeroDock: React.FC<PlayerHeroDockProps> = ({
  characterData,
  claimedToken,
  onSelectAction,
  activeTargetingAction,
  onCancelTargeting,
  onEndTurn,
  isMyTurn = false,
  onSwitchStationMode,
  onOpenRestModal,
  onRefreshDdb,
  isSyncingDdb = false
}) => {
  const [activeCategory, setActiveCategory] = useState<HudActionCategory>('attacks');
  const [selectedSpellLevel, setSelectedSpellLevel] = useState<number | 'all'>('all');
  const [hoveredAction, setHoveredAction] = useState<HudActionItem | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Reset spell level filter when switching characters
  useEffect(() => {
    setSelectedSpellLevel('all');
  }, [characterData?.id, claimedToken?.id]);

  // Fallback defaults if DDB character not yet loaded
  const name = characterData?.name || claimedToken?.name || 'Hero';
  const classLevel = characterData?.classLevel || '';
  const race = characterData?.race || '';
  const avatarUrl = characterData?.avatarUrl || claimedToken?.avatarUrl || claimedToken?.url || '';
  const rawCurrentHp = Number(characterData?.currentHp ?? claimedToken?.currentHp ?? claimedToken?.hp ?? 25);
  const rawMaxHp = Number(characterData?.maxHp ?? claimedToken?.maxHp ?? claimedToken?.hp ?? 25);
  const currentHp = Number.isFinite(rawCurrentHp) ? Math.max(0, rawCurrentHp) : 25;
  const maxHp = Number.isFinite(rawMaxHp) && rawMaxHp > 0 ? rawMaxHp : Math.max(1, currentHp);
  const tempHp = Number.isFinite(Number(characterData?.tempHp ?? claimedToken?.tempHp)) ? Number(characterData?.tempHp ?? claimedToken?.tempHp) : 0;
  const rawAc = Number(characterData?.ac ?? claimedToken?.ac ?? 14);
  const ac = Number.isFinite(rawAc) ? rawAc : 14;
  const speed = characterData?.speed || '30 ft.';
  const passivePerception = Number.isFinite(Number(characterData?.passivePerception)) ? Number(characterData?.passivePerception) : 12;
  const spellSaveDc = characterData?.spellSaveDc;
  const spellAttackBonus = characterData?.spellAttackBonus;
  const isLiveSynced = Boolean(characterData?.isLiveSynced || characterData?.ddbCharacterId);

  // Radial HP percentage calculation (guaranteed finite between 0 and 100)
  const hpPercent = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
  const strokeDashoffset = 283 - (283 * hpPercent) / 100;

  // Actions grouped by category with strict Array checks
  const actionsList = useMemo<HudActionItem[]>(() => {
    if (Array.isArray(characterData?.actions) && characterData.actions.length > 0) {
      return characterData.actions;
    }
    return [
      {
        id: 'default-attack',
        name: 'Main Attack',
        category: 'actions',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        hitBonus: '+5',
        damageFormula: '1d8 + 3',
        damageType: 'slashing',
        description: 'Standard melee attack with equipped weapon.',
        jb2aAssetId: 'attack_slash',
        rangeFt: 5
      },
      {
        id: 'default-dash',
        name: 'Dash',
        category: 'actions',
        type: 'action',
        subCategory: 'standard',
        isSelfAction: true,
        description: 'Double movement speed for the turn.',
        rangeFt: 0
      }
    ];
  }, [characterData?.actions]);

  const attacksList = useMemo<HudActionItem[]>(() => {
    if (Array.isArray(characterData?.attacks) && characterData.attacks.length > 0) {
      return characterData.attacks;
    }
    // Derive from actionsList if attacks array wasn't explicitly provided
    const derived = actionsList.filter(a => a.isAttack || a.hitBonus !== undefined || a.damageFormula !== undefined);
    return derived.length > 0 ? derived : actionsList;
  }, [characterData?.attacks, actionsList]);

  const bonusActionsList = useMemo<HudActionItem[]>(
    () => (Array.isArray(characterData?.bonusActions) ? characterData.bonusActions : []),
    [characterData?.bonusActions]
  );

  const spellsList = useMemo<HudActionItem[]>(
    () => (Array.isArray(characterData?.spells) ? characterData.spells : []),
    [characterData?.spells]
  );

  const reactionsList = useMemo<HudActionItem[]>(
    () => (Array.isArray(characterData?.reactions) ? characterData.reactions : []),
    [characterData?.reactions]
  );

  const itemsList = useMemo<HudActionItem[]>(
    () => (Array.isArray(characterData?.items) ? characterData.items : []),
    [characterData?.items]
  );

  // Available spell levels for the Spells filter bar
  const availableSpellLevels = useMemo<number[]>(() => {
    const lvlSet = new Set<number>();
    spellsList.forEach(sp => {
      lvlSet.add(typeof sp.level === 'number' ? sp.level : 0);
    });
    if (characterData?.spellSlots) {
      Object.keys(characterData.spellSlots).forEach(k => {
        const lvl = Number(k);
        if (Number.isFinite(lvl) && lvl > 0 && characterData.spellSlots[lvl]?.total > 0) {
          lvlSet.add(lvl);
        }
      });
    }
    return Array.from(lvlSet).sort((a, b) => a - b);
  }, [spellsList, characterData?.spellSlots]);

  // Filtered spells when spell level filter is active
  const filteredSpellsList = useMemo<HudActionItem[]>(() => {
    if (selectedSpellLevel === 'all') return spellsList;
    return spellsList.filter(sp => (sp.level ?? 0) === selectedSpellLevel);
  }, [spellsList, selectedSpellLevel]);

  const currentCategoryList = useMemo<HudActionItem[]>(() => {
    switch (activeCategory) {
      case 'attacks':
        return attacksList;
      case 'actions':
        return actionsList;
      case 'bonus_actions':
        return bonusActionsList;
      case 'spells':
        return filteredSpellsList;
      case 'reactions':
        return reactionsList;
      case 'items':
        return itemsList;
      default:
        return actionsList;
    }
  }, [activeCategory, attacksList, actionsList, bonusActionsList, filteredSpellsList, reactionsList, itemsList]);

  const formatSpellLevelLabel = (lvl: number) => {
    if (lvl === 0) return 'Cantrip';
    if (lvl === 1) return '1st';
    if (lvl === 2) return '2nd';
    if (lvl === 3) return '3rd';
    return `${lvl}th`;
  };

  const renderActionGlyph = (action: HudActionItem, sizeClass = 'w-5 h-5') => {
    if (action.isHeal) {
      return <Heart className={`${sizeClass} text-emerald-400`} />;
    }
    if (action.category === 'spells' || action.subCategory === 'spell') {
      return (action.level ?? 0) === 0
        ? <Wand2 className={`${sizeClass} text-cyan-400`} />
        : <Sparkles className={`${sizeClass} text-blue-400`} />;
    }
    if (action.category === 'bonus_actions' || action.type === 'bonus_action') {
      return <Flame className={`${sizeClass} text-amber-400`} />;
    }
    if (action.category === 'reactions' || action.type === 'reaction') {
      return <Zap className={`${sizeClass} text-violet-400`} />;
    }
    if (action.category === 'items' || action.type === 'item') {
      return <Package className={`${sizeClass} text-purple-400`} />;
    }
    return <Swords className={`${sizeClass} text-rose-400`} />;
  };

  const categoryTabs: Array<{
    id: HudActionCategory;
    label: string;
    shortLabel: string;
    count: number;
    color: string;
    activeBg: string;
  }> = [
    {
      id: 'attacks',
      label: 'Attacks',
      shortLabel: 'Attacks',
      count: attacksList.length,
      color: 'text-rose-400',
      activeBg: 'bg-rose-500/20 border-rose-500/60'
    },
    {
      id: 'actions',
      label: 'Actions',
      shortLabel: 'Actions',
      count: actionsList.length,
      color: 'text-emerald-400',
      activeBg: 'bg-emerald-500/20 border-emerald-500/60'
    },
    {
      id: 'bonus_actions',
      label: 'Bonus Actions',
      shortLabel: 'Bonus',
      count: bonusActionsList.length,
      color: 'text-amber-400',
      activeBg: 'bg-amber-500/20 border-amber-500/60'
    },
    {
      id: 'spells',
      label: 'Spells',
      shortLabel: 'Spells',
      count: spellsList.length,
      color: 'text-blue-400',
      activeBg: 'bg-blue-500/20 border-blue-500/60'
    },
    {
      id: 'reactions',
      label: 'Reactions',
      shortLabel: 'React',
      count: reactionsList.length,
      color: 'text-violet-400',
      activeBg: 'bg-violet-500/20 border-violet-500/60'
    },
    {
      id: 'items',
      label: 'Items',
      shortLabel: 'Items',
      count: itemsList.length,
      color: 'text-purple-400',
      activeBg: 'bg-purple-500/20 border-purple-500/60'
    }
  ];

  return (
    <div
      id="player-hero-bottom-dock"
      className="fixed bottom-0 inset-x-0 z-[60] flex flex-col items-center pointer-events-none select-none pb-2 sm:pb-3 px-2 sm:px-4"
    >
      {/* ========================================================================= */}
      {/* TARGETING STATUS BAR (Responsive: pinned top on mobile, above dock on desktop) */}
      {/* ========================================================================= */}
      {activeTargetingAction && (
        <div className="pointer-events-auto mb-2 fixed top-3 inset-x-3 sm:static sm:inset-x-auto sm:top-auto z-[140] flex items-center justify-between sm:justify-center gap-3 px-4 sm:px-5 py-2.5 rounded-2xl sm:rounded-full bg-zinc-950/98 border border-amber-500/80 shadow-[0_0_30px_rgba(245,158,11,0.5)] text-amber-300 font-mono text-xs animate-in slide-in-from-top-2 sm:slide-in-from-bottom-2 duration-150 ring-1 ring-amber-500/40 max-w-lg sm:max-w-none mx-auto">
          <div className="flex items-center gap-2 truncate">
            <Crosshair className="w-4 h-4 text-amber-400 animate-spin shrink-0" style={{ animationDuration: '6s' }} />
            <span className="truncate">
              Target: <strong className="text-white">{activeTargetingAction.name}</strong>{' '}
              <span className="hidden sm:inline">(Click target token on map)</span>
            </span>
            {activeTargetingAction.hitBonus && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] border border-emerald-500/40 shrink-0 font-bold">
                {activeTargetingAction.hitBonus}
              </span>
            )}
            {activeTargetingAction.damageFormula && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] border border-rose-500/40 shrink-0 font-bold">
                {activeTargetingAction.damageFormula}
              </span>
            )}
            {activeTargetingAction.rangeFt !== undefined && activeTargetingAction.rangeFt > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-[10px] border border-amber-500/40 shrink-0">
                {activeTargetingAction.rangeFt} ft
              </span>
            )}
          </div>
          <button
            onClick={onCancelTargeting}
            className="px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-750 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer text-[11px] font-bold flex items-center gap-1 shrink-0"
            title="Cancel Targeting (Esc)"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
        </div>
      )}

      {/* Action Hover Tooltip Preview (Desktop hover only) */}
      {hoveredAction && !activeTargetingAction && (
        <div className="hidden sm:block pointer-events-none mb-2 px-4 py-2.5 rounded-2xl bg-zinc-950/98 border border-zinc-700/90 shadow-2xl text-left max-w-lg animate-in fade-in duration-100 ring-1 ring-white/10">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-300 font-mono text-xs">
                {hoveredAction.name}
              </span>
              {hoveredAction.sourceLabel && (
                <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[9px] font-mono text-zinc-300">
                  {hoveredAction.sourceLabel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-300">
              {hoveredAction.castingTime && (
                <span className="text-amber-200/90">{hoveredAction.castingTime}</span>
              )}
              {hoveredAction.rangeFt !== undefined && (
                <span>{hoveredAction.rangeFt > 0 ? `${hoveredAction.rangeFt} ft.` : 'Self'}</span>
              )}
              {hoveredAction.hitBonus && (
                <span className="px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-500/50 text-emerald-300 font-bold">
                  To Hit {hoveredAction.hitBonus}
                </span>
              )}
              {hoveredAction.saveDc && (
                <span className="px-1.5 py-0.2 rounded bg-amber-950 border border-amber-500/50 text-amber-300 font-bold">
                  DC {hoveredAction.saveDc} {hoveredAction.saveAbility || ''}
                </span>
              )}
              {hoveredAction.damageFormula && (
                <span className={`px-1.5 py-0.2 rounded font-bold border ${
                  hoveredAction.isHeal
                    ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300'
                    : 'bg-rose-950 border-rose-500/50 text-rose-300'
                }`}>
                  {hoveredAction.damageFormula} {hoveredAction.damageType || ''}
                </span>
              )}
              {hoveredAction.uses && (
                <span className="px-1.5 py-0.2 rounded bg-indigo-950 border border-indigo-500/50 text-indigo-300 font-bold">
                  {hoveredAction.uses.available}/{hoveredAction.uses.total} Uses
                </span>
              )}
            </div>
          </div>
          {hoveredAction.notes && (
            <div className="text-[10px] font-mono text-amber-400/90 mt-1">
              Properties: {hoveredAction.notes}
            </div>
          )}
          <p className="text-[11px] text-zinc-300 mt-1 line-clamp-3 font-sans leading-relaxed">
            {hoveredAction.description}
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MOBILE COMPACT HERO PILL (Rendered on mobile screens < 768px)            */}
      {/* ========================================================================= */}
      <div className="flex md:hidden pointer-events-auto items-center justify-between gap-2.5 w-full max-w-md mx-auto p-2 rounded-2xl bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 shadow-[0_10px_30px_rgba(0,0,0,0.9)] ring-1 ring-white/10">
        {/* Mini Radial HP Orb */}
        <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" className="stroke-zinc-850" strokeWidth="9" fill="transparent" />
            <circle
              cx="50"
              cy="50"
              r="42"
              className={`transition-all duration-500 ${
                hpPercent > 50 ? 'stroke-emerald-500' : hpPercent > 25 ? 'stroke-amber-500' : 'stroke-rose-600'
              }`}
              strokeWidth="9"
              strokeDasharray="264"
              strokeDashoffset={264 - (264 * hpPercent) / 100}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="absolute inset-1.5 rounded-full overflow-hidden border border-zinc-700 bg-zinc-900 flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] font-bold text-zinc-400 font-mono">{name.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          {/* AC Badge */}
          <div className="absolute -bottom-1 -right-1 px-1 rounded bg-zinc-900 border border-zinc-700 text-amber-300 font-mono font-bold text-[9px] flex items-center">
            <Shield className="w-2.5 h-2.5 text-amber-400 mr-0.5" />
            {ac}
          </div>
        </div>

        {/* Vitals Summary & Actions Drawer Trigger */}
        <button
          type="button"
          onClick={() => setIsMobileDrawerOpen(prev => !prev)}
          className="flex-1 flex flex-col items-start px-2 py-1 rounded-xl hover:bg-zinc-900/80 active:bg-zinc-850 transition-colors text-left min-w-0 cursor-pointer"
        >
          <div className="flex items-center gap-1.5 w-full">
            <span className="text-xs font-bold text-white font-mono truncate">{name}</span>
            <span className="text-[10px] font-mono font-bold text-emerald-400 shrink-0">
              {currentHp}/{maxHp} HP
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono text-amber-400 mt-0.5">
            <Swords className="w-3 h-3 text-amber-400" />
            <span className="font-bold underline decoration-amber-500/40 underline-offset-2">
              Attacks ({attacksList.length}) • Bonus ({bonusActionsList.length}) • Spells ({spellsList.length})
            </span>
            <ChevronUp className={`w-3.5 h-3.5 transition-transform ${isMobileDrawerOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {/* Quick End Turn / Pass Turn or Station Mode on Mobile */}
        <div className="flex items-center gap-1 shrink-0">
          {onRefreshDdb && (
            <button
              type="button"
              onClick={onRefreshDdb}
              className="p-2 rounded-xl bg-zinc-900 text-emerald-400 hover:text-emerald-300 border border-zinc-800 cursor-pointer"
              title="Sync Live from D&D Beyond"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDdb ? 'animate-spin' : ''}`} />
            </button>
          )}

          {onEndTurn && isMyTurn ? (
            <button
              type="button"
              onClick={onEndTurn}
              className="px-3 py-2 rounded-xl font-mono text-[11px] font-bold bg-gradient-to-r from-amber-500 to-amber-400 text-zinc-950 shadow-md shadow-amber-500/30 animate-pulse cursor-pointer flex items-center gap-1"
            >
              <span>End Turn</span>
            </button>
          ) : onEndTurn ? (
            <button
              type="button"
              onClick={onEndTurn}
              className="px-2.5 py-2 rounded-xl font-mono text-[10px] font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 cursor-pointer"
            >
              Pass
            </button>
          ) : null}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE SLIDE-UP HERO ACTION SHEET (Bottom Sheet Modal)                    */}
      {/* ========================================================================= */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-x-0 bottom-0 z-[120] max-h-[86dvh] flex flex-col bg-zinc-950/98 backdrop-blur-2xl border-t border-amber-500/40 rounded-t-3xl shadow-[0_-20px_50px_rgba(0,0,0,0.95)] p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pointer-events-auto animate-in slide-in-from-bottom duration-200">
          {/* Drag Handle & Header */}
          <div className="w-12 h-1.5 bg-zinc-700/80 rounded-full mx-auto mb-2 shrink-0" />
          <div className="flex items-center justify-between pb-3 border-b border-zinc-850 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full overflow-hidden border border-zinc-700 bg-zinc-900 shrink-0">
                {avatarUrl ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" /> : null}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white font-mono truncate">{name}</span>
                  {isLiveSynced && (
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-mono font-bold shrink-0">
                      DDB LIVE
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                  {classLevel && <span className="text-amber-300">{classLevel}</span>}
                  <span className="text-emerald-400 font-bold">HP {currentHp}/{maxHp}</span>
                  <span>•</span>
                  <span className="text-sky-300">AC {ac}</span>
                  <span>•</span>
                  <span>{speed}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {onRefreshDdb && (
                <button
                  type="button"
                  onClick={onRefreshDdb}
                  className="px-2 py-1.5 rounded-xl bg-zinc-900 text-emerald-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-mono font-bold"
                  title="Sync Live from D&D Beyond"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDdb ? 'animate-spin' : ''}`} />
                  <span>Sync</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Spell Slots Matrix (Synced via D&D Beyond) */}
          {characterData?.spellSlots && Object.keys(characterData.spellSlots).length > 0 && (
            <div className="flex items-center gap-1.5 py-2 overflow-x-auto border-b border-zinc-850 sidebar-scrollbar shrink-0">
              <span className="text-[9px] font-mono uppercase text-zinc-500 font-bold mr-1">Spell Slots:</span>
              {Object.values(characterData.spellSlots).map((slot: any) => (
                <button
                  key={slot.level}
                  type="button"
                  onClick={() => {
                    setActiveCategory('spells');
                    setSelectedSpellLevel(prev => prev === slot.level ? 'all' : slot.level);
                  }}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-mono shrink-0 cursor-pointer transition-colors ${
                    activeCategory === 'spells' && selectedSpellLevel === slot.level
                      ? 'bg-blue-500/30 border-blue-400 text-white'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-200'
                  }`}
                >
                  <span className="text-blue-400 font-bold">{['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][slot.level - 1] || slot.level}</span>
                  <span className="font-bold">{slot.available}/{slot.total}</span>
                </button>
              ))}
            </div>
          )}

          {/* Category Tabs */}
          <div className="grid grid-cols-6 gap-1 py-2 shrink-0">
            {categoryTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`py-1.5 px-1 rounded-xl text-[10px] font-mono font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer border ${
                  activeCategory === tab.id
                    ? `${tab.activeBg} text-white shadow-md`
                    : 'border-zinc-850 text-zinc-400 bg-zinc-900/60'
                }`}
              >
                <span className="truncate">{tab.shortLabel}</span>
                <span className="text-[9px] opacity-75 font-normal">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* Spell Level Sub-Filter Pills (Mobile Spells Tab) */}
          {activeCategory === 'spells' && availableSpellLevels.length > 0 && (
            <div className="flex items-center gap-1.5 pb-2 overflow-x-auto sidebar-scrollbar shrink-0">
              <button
                type="button"
                onClick={() => setSelectedSpellLevel('all')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer shrink-0 ${
                  selectedSpellLevel === 'all'
                    ? 'bg-blue-500/25 border-blue-400 text-blue-200'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                All ({spellsList.length})
              </button>
              {availableSpellLevels.map(lvl => {
                const countForLvl = spellsList.filter(s => (s.level ?? 0) === lvl).length;
                const slotInfo = lvl > 0 ? characterData?.spellSlots?.[lvl] : undefined;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSelectedSpellLevel(lvl)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                      selectedSpellLevel === lvl
                        ? 'bg-blue-500/25 border-blue-400 text-blue-200'
                        : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span>{formatSpellLevelLabel(lvl)}</span>
                    <span className="opacity-70">({countForLvl})</span>
                    {slotInfo && (
                      <span className="ml-0.5 px-1 rounded bg-blue-950 text-blue-300 border border-blue-500/30 text-[9px]">
                        {slotInfo.available}/{slotInfo.total}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Action Cards Touch Grid */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[140px] max-h-[44dvh] sidebar-scrollbar">
            {currentCategoryList.map((action, idx) => {
              const isTargetingThis = activeTargetingAction?.id === action.id;
              return (
                <button
                  key={action.id || idx}
                  type="button"
                  onClick={() => {
                    onSelectAction(action);
                    setIsMobileDrawerOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                    isTargetingThis
                      ? 'border-amber-400 bg-amber-500/20 shadow-md ring-1 ring-amber-400'
                      : 'border-zinc-800 bg-zinc-900/70 hover:bg-zinc-850 active:scale-[0.99]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-zinc-850 border border-zinc-750 flex items-center justify-center shrink-0">
                    {renderActionGlyph(action, 'w-5 h-5')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-bold text-zinc-100 font-mono truncate">{action.name}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {action.level !== undefined && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-950/80 border border-blue-500/40 text-blue-300 font-bold">
                            {action.level === 0 ? 'Cantrip' : `Lvl ${action.level}`}
                          </span>
                        )}
                        {action.uses && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 font-bold">
                            {action.uses.available}/{action.uses.total}
                          </span>
                        )}
                        {action.quantity !== undefined && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300 font-bold">
                            x{action.quantity}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center flex-wrap gap-2 text-[10px] font-mono text-zinc-400 mt-0.5">
                      {action.hitBonus && <span className="text-emerald-400 font-bold">Hit: {action.hitBonus}</span>}
                      {action.saveDc && <span className="text-amber-300 font-bold">DC {action.saveDc} {action.saveAbility || ''}</span>}
                      {action.damageFormula && (
                        <span className={action.isHeal ? 'text-emerald-300 font-bold' : 'text-rose-400 font-bold'}>
                          {action.damageFormula} {action.damageType || ''}
                        </span>
                      )}
                      {action.rangeFt !== undefined && (
                        <span>{action.rangeFt > 0 ? `${action.rangeFt} ft` : 'Self'}</span>
                      )}
                      {action.sourceLabel && (
                        <span className="text-zinc-500">• {action.sourceLabel}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 line-clamp-2 mt-1 font-sans">{action.description}</p>
                  </div>
                </button>
              );
            })}

            {currentCategoryList.length === 0 && (
              <div className="text-center py-8 text-xs font-mono text-zinc-500">
                No {activeCategory.replace('_', ' ')} found for this filter.
              </div>
            )}
          </div>

          {/* Bottom Utility Row inside drawer */}
          <div className="pt-3 border-t border-zinc-850 flex items-center justify-between mt-2 shrink-0">
            {characterData?.readonlyUrl ? (
              <a
                href={characterData.readonlyUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 hover:text-white"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>D&D Beyond Sheet</span>
              </a>
            ) : <div />}

            {onEndTurn && (
              <button
                type="button"
                onClick={() => {
                  onEndTurn();
                  setIsMobileDrawerOpen(false);
                }}
                className={`px-4 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                  isMyTurn ? 'bg-amber-500 text-zinc-950 shadow-md animate-pulse' : 'bg-zinc-800 text-zinc-300'
                }`}
              >
                {isMyTurn ? 'End Turn' : 'Pass Turn'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Backdrop for mobile drawer */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 z-[115] bg-black/60 backdrop-blur-xs pointer-events-auto md:hidden"
          onClick={() => setIsMobileDrawerOpen(false)}
        />
      )}

      {/* ========================================================================= */}
      {/* DESKTOP 3-WING BG3 SLOTTED DOCK (Rendered on tablet landscape & desktop >= 768px) */}
      {/* ========================================================================= */}
      <div className="hidden md:flex pointer-events-auto items-end justify-center gap-3 w-full max-w-6xl">
        
        {/* LEFT WING: CHARACTER ORB & VITALS */}
        <div className="flex items-center gap-3 p-3 rounded-3xl bg-zinc-950/95 border border-zinc-800/90 shadow-[0_15px_40px_rgba(0,0,0,0.85)] ring-1 ring-white/10 shrink-0">
          {/* Radial HP Orb */}
          <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                className="stroke-zinc-800"
                strokeWidth="7"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                className={`transition-all duration-500 ${
                  hpPercent > 50
                    ? 'stroke-emerald-500'
                    : hpPercent > 25
                      ? 'stroke-amber-500'
                      : 'stroke-rose-600'
                }`}
                strokeWidth="7"
                strokeDasharray="283"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            {/* Token Avatar Image */}
            <div className="absolute inset-2.5 rounded-full overflow-hidden border border-zinc-700 bg-zinc-900 shadow-inner">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-zinc-500 font-mono text-xs">
                  {name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            {/* Armor Class Shield Badge */}
            <div
              className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-lg bg-zinc-900 border border-zinc-700 text-amber-300 font-mono font-bold text-[11px] shadow-md flex items-center gap-0.5"
              title={`Armor Class: ${ac}`}
            >
              <Shield className="w-3 h-3 text-amber-400" />
              <span>{ac}</span>
            </div>
          </div>

          {/* Vitals Text */}
          <div className="space-y-1 text-left min-w-[130px] max-w-[175px]">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-amber-200 truncate font-mono" title={name}>
                {name}
              </h3>
              {isLiveSynced && (
                <span
                  className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                  title="Live Synced with D&D Beyond"
                />
              )}
            </div>

            {(classLevel || race) && (
              <div className="text-[10px] font-mono text-zinc-400 truncate" title={`${race} ${classLevel}`.trim()}>
                {classLevel || race}
              </div>
            )}
            
            {/* HP Numbers */}
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className={`font-extrabold ${hpPercent <= 25 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                {currentHp}
              </span>
              <span className="text-zinc-500 text-[10px]">/</span>
              <span className="text-zinc-300 text-[11px]">{maxHp} HP</span>
              {tempHp > 0 && (
                <span className="px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-bold">
                  +{tempHp}
                </span>
              )}
            </div>

            {/* Tactical Badges: Speed, Passive Perception & Spell Save DC */}
            <div className="flex items-center gap-1.5 pt-0.5 text-[10px] font-mono text-zinc-400 flex-wrap">
              <span title="Movement Speed">{speed}</span>
              <span>•</span>
              <span title={`Passive Perception: ${passivePerception}`}>PP {passivePerception}</span>
              {spellSaveDc && spellsList.length > 0 && (
                <>
                  <span>•</span>
                  <span className="text-blue-300" title={`Spell Save DC: ${spellSaveDc}${spellAttackBonus ? ` | Spell Attack: +${spellAttackBonus}` : ''}`}>
                    DC {spellSaveDc}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* CENTER: BG3 HOTBAR GRID & CATEGORY TABS */}
        <div className="flex-1 bg-zinc-950/95 border border-zinc-800/90 rounded-3xl p-3 shadow-[0_15px_40px_rgba(0,0,0,0.85)] ring-1 ring-white/10 flex flex-col gap-2 min-w-0">
          
          {/* Top Filter Tabs & Spell Slot Pips */}
          <div className="flex items-center justify-between gap-2 border-b border-zinc-850 pb-2 flex-wrap">
            
            {/* Category Tabs */}
            <div className="flex items-center gap-1 flex-wrap">
              {categoryTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    activeCategory === tab.id
                      ? `${tab.activeBg} text-white shadow-md`
                      : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <span className={tab.color}>●</span>
                  <span>{tab.label}</span>
                  <span className="text-[10px] opacity-65">({tab.count})</span>
                </button>
              ))}
            </div>

            {/* Spell Slot Matrix (Synced via DDB - clickable to filter by spell level!) */}
            {characterData?.spellSlots && Object.keys(characterData.spellSlots).length > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-mono pr-1">
                <span className="text-[10px] text-zinc-500 uppercase font-bold">Slots:</span>
                {Object.values(characterData.spellSlots).map((slot: any) => (
                  <button
                    key={slot.level}
                    type="button"
                    onClick={() => {
                      setActiveCategory('spells');
                      setSelectedSpellLevel(prev => prev === slot.level ? 'all' : slot.level);
                    }}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] cursor-pointer transition-all ${
                      activeCategory === 'spells' && selectedSpellLevel === slot.level
                        ? 'bg-blue-500/30 border-blue-400 text-white shadow-sm'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-blue-500/50'
                    }`}
                    title={`Level ${slot.level} Spell Slots: ${slot.available}/${slot.total} available (Click to filter Level ${slot.level} spells)`}
                  >
                    <span className="text-blue-400 font-bold">{['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][slot.level - 1] || slot.level}</span>
                    <span className="font-bold">{slot.available}/{slot.total}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Spell Level Sub-Filter Bar (Rendered when Spells tab is active) */}
          {activeCategory === 'spells' && availableSpellLevels.length > 0 && (
            <div className="flex items-center gap-1.5 pb-1 overflow-x-auto sidebar-scrollbar">
              <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold mr-1 shrink-0">
                Spell Level:
              </span>
              <button
                type="button"
                onClick={() => setSelectedSpellLevel('all')}
                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-bold border transition-all cursor-pointer shrink-0 ${
                  selectedSpellLevel === 'all'
                    ? 'bg-blue-500/25 border-blue-400 text-blue-200 shadow-xs'
                    : 'bg-zinc-900/70 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                All ({spellsList.length})
              </button>
              {availableSpellLevels.map(lvl => {
                const countForLvl = spellsList.filter(s => (s.level ?? 0) === lvl).length;
                const slotInfo = lvl > 0 ? characterData?.spellSlots?.[lvl] : undefined;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSelectedSpellLevel(lvl)}
                    className={`px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-bold border transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                      selectedSpellLevel === lvl
                        ? 'bg-blue-500/25 border-blue-400 text-blue-200 shadow-xs'
                        : 'bg-zinc-900/70 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    <span>{formatSpellLevelLabel(lvl)}</span>
                    <span className="text-[10px] opacity-65">({countForLvl})</span>
                    {slotInfo && (
                      <span className="ml-0.5 px-1 py-0.2 rounded bg-blue-950/90 text-blue-300 border border-blue-500/40 text-[9px]">
                        {slotInfo.available}/{slotInfo.total}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Action Hotbar Slots (Rich Slotted Grid) */}
          <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-10 gap-2 min-h-[76px] max-h-[168px] overflow-y-auto py-1 pr-1 sidebar-scrollbar">
            {currentCategoryList.map((action, idx) => {
              const isTargetingThis = activeTargetingAction?.id === action.id;
              return (
                <button
                  key={action.id || idx}
                  onClick={() => onSelectAction(action)}
                  onMouseEnter={() => setHoveredAction(action)}
                  onMouseLeave={() => setHoveredAction(null)}
                  className={`relative h-[74px] rounded-2xl border transition-all flex flex-col items-center justify-between p-1.5 cursor-pointer transform hover:scale-[1.04] active:scale-95 shadow-md ${
                    isTargetingThis
                      ? 'border-amber-400 bg-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.5)] ring-2 ring-amber-400'
                      : 'border-zinc-800 hover:border-amber-500/60 bg-gradient-to-b from-zinc-900 to-zinc-950'
                  }`}
                  title={`${action.name}${action.hitBonus ? ` (${action.hitBonus})` : ''}${action.damageFormula ? ` [${action.damageFormula}]` : ''}`}
                >
                  {/* Top Badge Row: Hit Bonus / Save DC / Spell Level + Uses/Quantity */}
                  <div className="w-full flex items-center justify-between gap-0.5 text-[9px] font-mono leading-none">
                    {action.hitBonus ? (
                      <span className="px-1 py-0.5 rounded bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 font-bold">
                        {action.hitBonus}
                      </span>
                    ) : action.saveDc ? (
                      <span className="px-1 py-0.5 rounded bg-amber-950/90 border border-amber-500/40 text-amber-300 font-bold">
                        DC{action.saveDc}
                      </span>
                    ) : action.level !== undefined ? (
                      <span className="px-1 py-0.5 rounded bg-blue-950/90 border border-blue-500/40 text-blue-300 font-bold">
                        {action.level === 0 ? 'C' : `L${action.level}`}
                      </span>
                    ) : (
                      <span className="text-zinc-500 pl-0.5">{idx + 1}</span>
                    )}

                    {action.uses ? (
                      <span className="px-1 py-0.5 rounded bg-indigo-950/90 border border-indigo-500/40 text-indigo-300 font-bold">
                        {action.uses.available}/{action.uses.total}
                      </span>
                    ) : action.quantity !== undefined ? (
                      <span className="text-amber-300 font-bold pr-0.5">x{action.quantity}</span>
                    ) : null}
                  </div>

                  {/* Icon / Glyph + Optional Damage Pill */}
                  <div className="flex items-center justify-center gap-1 my-auto">
                    {renderActionGlyph(action, 'w-4 h-4')}
                    {action.damageFormula && (
                      <span className={`text-[9px] font-mono font-bold truncate max-w-[46px] ${
                        action.isHeal ? 'text-emerald-300' : 'text-rose-300'
                      }`}>
                        {action.damageFormula.replace(/\s+/g, '')}
                      </span>
                    )}
                  </div>

                  {/* Name Label */}
                  <span className="text-[9px] font-mono font-semibold text-zinc-200 truncate w-full text-center leading-tight">
                    {action.name}
                  </span>
                </button>
              );
            })}

            {currentCategoryList.length === 0 && (
              <div className="col-span-full py-4 text-center text-xs font-mono text-zinc-500">
                No {activeCategory.replace('_', ' ')} available for this filter.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT WING: TURN FLOW & DDB SYNC UTILITIES */}
        <div className="flex flex-col gap-2 p-3 rounded-3xl bg-zinc-950/95 border border-zinc-800/90 shadow-[0_15px_40px_rgba(0,0,0,0.85)] ring-1 ring-white/10 shrink-0">
          
          {/* End Turn / Active Turn Button */}
          {onEndTurn && (
            <button
              onClick={onEndTurn}
              className={`px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
                isMyTurn
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-zinc-950 shadow-amber-500/30 animate-pulse'
                  : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800'
              }`}
            >
              <span>{isMyTurn ? 'End Turn' : 'Pass Turn'}</span>
            </button>
          )}

          {/* Utility Buttons: Live DDB Sync, DDB Sheet & Station Mode Switch */}
          <div className="flex items-center justify-center gap-1.5">
            {onRefreshDdb && (
              <button
                onClick={onRefreshDdb}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-emerald-400 hover:text-emerald-300 border border-zinc-800 transition-colors cursor-pointer"
                title="Sync Live Attacks, Spells & HP from D&D Beyond"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingDdb ? 'animate-spin' : ''}`} />
              </button>
            )}

            {characterData?.readonlyUrl && (
              <a
                href={characterData.readonlyUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                title="Open D&D Beyond Character Sheet"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            {onSwitchStationMode && (
              <button
                onClick={onSwitchStationMode}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-amber-400 border border-zinc-800 transition-colors cursor-pointer"
                title="Switch Station Mode (TV Table / Remote Player)"
              >
                <Tv className="w-4 h-4" />
              </button>
            )}

            {onOpenRestModal && (
              <button
                onClick={onOpenRestModal}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-amber-400 border border-zinc-800 transition-colors cursor-pointer"
                title="Short / Long Rest"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
