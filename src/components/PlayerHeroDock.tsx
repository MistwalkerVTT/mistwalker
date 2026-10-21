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
  ChevronDown,
  RotateCcw,
  Crosshair,
  X,
  Tv,
  RefreshCw,
  Flame,
  Wand2,
  Search,
  Eye,
  Footprints,
  Lock,
  Users
} from 'lucide-react';
import { HudCharacterData, HudActionItem, HudActionCategory } from '../types/hud';
import { findJb2aAsset } from '../effects/db/jb2aRegistry';
import { toast } from 'sonner';

interface PlayerHeroDockProps {
  characterData: HudCharacterData | null;
  claimedToken?: any | null;
  onSelectAction: (action: HudActionItem) => void;
  onRollToHit?: (action: HudActionItem) => void;
  activeTargetingAction?: HudActionItem | null;
  selectedAction?: HudActionItem | null;
  activeEquippedAsset?: any | null;
  onCancelTargeting?: () => void;
  onEndTurn?: () => void;
  isMyTurn?: boolean;
  onSwitchStationMode?: () => void;
  onSwitchCharacter?: () => void;
  onOpenPrivacyModal?: () => void;
  isCharacterPrivate?: boolean;
  onOpenRestModal?: () => void;
  onRefreshDdb?: () => void;
  isSyncingDdb?: boolean;
  isMobile?: boolean;
  onTargetSelf?: () => void;
  activeEffects?: any[];
  onDispelEffect?: (effectId: string) => void;
}

export const PlayerHeroDock: React.FC<PlayerHeroDockProps> = ({
  characterData,
  claimedToken,
  onSelectAction,
  onRollToHit,
  activeTargetingAction,
  selectedAction,
  activeEquippedAsset,
  onCancelTargeting,
  onEndTurn,
  isMyTurn = false,
  onSwitchStationMode,
  onSwitchCharacter,
  onOpenPrivacyModal,
  isCharacterPrivate = false,
  onOpenRestModal,
  onRefreshDdb,
  isSyncingDdb = false,
  onTargetSelf,
  activeEffects = [],
  onDispelEffect
}) => {
  const currentTargetingAction = activeTargetingAction ?? selectedAction ?? (
    activeEquippedAsset ? {
      id: activeEquippedAsset.id,
      name: activeEquippedAsset.name,
      description: activeEquippedAsset.label,
      category: 'spells',
      rangeFt: activeEquippedAsset.defaultSizeFt
    } as HudActionItem : null
  );

  const [activeCategory, setActiveCategory] = useState<HudActionCategory>('attacks');
  const [selectedSpellLevel, setSelectedSpellLevel] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hoveredAction, setHoveredAction] = useState<HudActionItem | null>(null);
  const [isTrayCollapsed, setIsTrayCollapsed] = useState<boolean>(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [isDockMinimizedWhileAiming, setIsDockMinimizedWhileAiming] = useState<boolean>(false);

  // Auto-minimize the HUD whenever an action/effect is selected to be placed/aimed
  // Keep the HUD minimized after placing so the player can watch the animation unobstructed
  const isTargetingActive = Boolean(currentTargetingAction || activeEquippedAsset);
  useEffect(() => {
    if (isTargetingActive) {
      setIsTrayCollapsed(true);
      setIsMobileDrawerOpen(false);
      setIsDockMinimizedWhileAiming(true);
    } else {
      setIsDockMinimizedWhileAiming(false);
      // Keep minimized after placing so the animation is clearly visible
      setIsTrayCollapsed(true);
      setIsMobileDrawerOpen(false);
    }
  }, [isTargetingActive]);

  // Reset filters when switching characters
  useEffect(() => {
    setSelectedSpellLevel('all');
    setSearchQuery('');
  }, [characterData?.id, claimedToken?.id]);

  // Close hover/cast description card on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && hoveredAction) {
        setHoveredAction(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hoveredAction]);

  // Dedicated To-Hit Roll Handler
  const handleRollToHit = (action: HudActionItem) => {
    if (onRollToHit) {
      onRollToHit(action);
      return;
    }

    if (action.hitBonus === undefined) return;
    const rawHit = typeof action.hitBonus === 'number'
      ? action.hitBonus
      : (parseInt(String(action.hitBonus).replace('+', ''), 10) || 0);
    const modStr = rawHit >= 0 ? `+${rawHit}` : `${rawHit}`;
    const d20 = Math.floor(Math.random() * 20) + 1;
    const total = d20 + rawHit;
    const isCrit = d20 === 20;
    const isFumble = d20 === 1;

    const charName = characterData?.name || claimedToken?.name || 'Hero';
    const diceEvent: any = {
      id: `roll-${Date.now()}`,
      characterId: String(characterData?.id || claimedToken?.id || ''),
      characterName: charName,
      avatarUrl: characterData?.avatarUrl || claimedToken?.avatarUrl || claimedToken?.url,
      action: `${action.name} (To Hit)`,
      rollType: 'attack',
      formula: `1d20 ${modStr}`,
      diceNotation: '1d20',
      dice: [{ sides: 20, result: d20, type: 'd20' }],
      modifier: rawHit,
      total,
      isCritical: isCrit,
      isFumble: isFumble,
      theme: 'default',
      themeColor: isCrit ? '#10b981' : isFumble ? '#ef4444' : '#10b981',
      timestamp: Date.now(),
      source: 'player'
    };

    if (typeof window !== 'undefined' && (window as any).__mistwalkerRoll3d) {
      (window as any).__mistwalkerRoll3d(diceEvent);
    }

    toast.success(`${charName}: ${action.name} To Hit!`, {
      description: isCrit
        ? `CRITICAL HIT! Nat 20 ${modStr} = ${total}`
        : isFumble
        ? `NATURAL 1 FUMBLE! Nat 1 ${modStr} = ${total}`
        : `Rolled ${d20} ${modStr} = ${total} to Hit!`
    });
  };

  // Character vitals & metadata
  const name = characterData?.name || claimedToken?.name || 'Adventurer';
  const classLevel = characterData?.classLevel || '';
  const race = characterData?.race || '';
  const avatarUrl = characterData?.avatarUrl || claimedToken?.avatarUrl || claimedToken?.url || '';
  const rawCurrentHp = Number(characterData?.currentHp ?? claimedToken?.currentHp ?? claimedToken?.hp ?? 25);
  const rawMaxHp = Number(characterData?.maxHp ?? claimedToken?.maxHp ?? claimedToken?.hp ?? 25);
  const currentHp = Number.isFinite(rawCurrentHp) ? Math.max(0, rawCurrentHp) : 25;
  const maxHp = Number.isFinite(rawMaxHp) && rawMaxHp > 0 ? rawMaxHp : Math.max(1, currentHp);
  const tempHp = Number.isFinite(Number(characterData?.tempHp ?? claimedToken?.tempHp))
    ? Number(characterData?.tempHp ?? claimedToken?.tempHp)
    : 0;
  const rawAc = Number(characterData?.ac ?? claimedToken?.ac ?? 14);
  const ac = Number.isFinite(rawAc) ? rawAc : 14;
  const speed = characterData?.speed || '30 ft.';
  const passivePerception = Number.isFinite(Number(characterData?.passivePerception))
    ? Number(characterData?.passivePerception)
    : 12;
  const spellSaveDc = characterData?.spellSaveDc;
  const spellAttackBonus = characterData?.spellAttackBonus;
  const isLiveSynced = Boolean(characterData?.isLiveSynced || characterData?.ddbCharacterId);

  const hpPercent = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));

  // Categorized lists from D&D Beyond character data
  const actionsList = useMemo<HudActionItem[]>(() => {
    if (Array.isArray(characterData?.actions) && characterData.actions.length > 0) {
      return characterData.actions;
    }
    return [
      {
        id: 'default-attack',
        name: 'Unarmed Strike',
        category: 'actions',
        type: 'action',
        subCategory: 'unarmed',
        isAttack: true,
        hitBonus: '+5',
        damageFormula: '1d4 + 3',
        damageType: 'bludgeoning',
        description: 'Standard melee unarmed strike.',
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
        description: 'Gain extra movement for the current turn equal to your speed.',
        rangeFt: 0
      }
    ];
  }, [characterData?.actions]);

  const attacksList = useMemo<HudActionItem[]>(() => {
    if (Array.isArray(characterData?.attacks) && characterData.attacks.length > 0) {
      return characterData.attacks;
    }
    const derived = actionsList.filter(
      a => a.isAttack || a.hitBonus !== undefined || a.damageFormula !== undefined
    );
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
    let base: HudActionItem[];
    switch (activeCategory) {
      case 'attacks':
        base = attacksList;
        break;
      case 'actions':
        base = actionsList;
        break;
      case 'bonus_actions':
        base = bonusActionsList;
        break;
      case 'spells':
        base = filteredSpellsList;
        break;
      case 'reactions':
        base = reactionsList;
        break;
      case 'items':
        base = itemsList;
        break;
      default:
        base = actionsList;
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      item =>
        item.name.toLowerCase().includes(q) ||
        (item.damageType && item.damageType.toLowerCase().includes(q)) ||
        (item.sourceLabel && item.sourceLabel.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q))
    );
  }, [
    activeCategory,
    attacksList,
    actionsList,
    bonusActionsList,
    filteredSpellsList,
    reactionsList,
    itemsList,
    searchQuery
  ]);

  const formatSpellLevelLabel = (lvl: number) => {
    if (lvl === 0) return 'Cantrip';
    if (lvl === 1) return '1st';
    if (lvl === 2) return '2nd';
    if (lvl === 3) return '3rd';
    return `${lvl}th`;
  };

  const renderActionGlyph = (action: HudActionItem, sizeClass = 'w-4 h-4') => {
    const isSpell = action.category === 'spells' || action.subCategory === 'spell';

    // Copy and display authentic JB2A spell thumbnail where available
    const asset = findJb2aAsset(action.jb2aAssetId || action.name);
    const thumbUrl = action.iconUrl || asset?.thumb;

    if (thumbUrl && !thumbUrl.endsWith('.webm')) {
      return (
        <div className="w-full h-full relative flex items-center justify-center overflow-hidden rounded-lg">
          <img
            src={thumbUrl}
            alt={action.name}
            className="w-full h-full object-cover rounded-lg"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
            {isSpell ? (
              (action.level ?? 0) === 0 ? (
                <Wand2 className={`${sizeClass} text-cyan-400`} />
              ) : (
                <Sparkles className={`${sizeClass} text-blue-400`} />
              )
            ) : action.isHeal ? (
              <Heart className={`${sizeClass} text-emerald-400`} />
            ) : (
              <Swords className={`${sizeClass} text-rose-400`} />
            )}
          </div>
        </div>
      );
    }

    if (action.isHeal) {
      return <Heart className={`${sizeClass} text-emerald-400`} />;
    }
    if (isSpell) {
      return (action.level ?? 0) === 0 ? (
        <Wand2 className={`${sizeClass} text-cyan-400`} />
      ) : (
        <Sparkles className={`${sizeClass} text-blue-400`} />
      );
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
    accentText: string;
    activeClass: string;
  }> = [
    {
      id: 'attacks',
      label: 'Attacks',
      shortLabel: 'Attacks',
      count: attacksList.length,
      accentText: 'text-rose-400',
      activeClass: 'bg-rose-500/15 border-rose-500/70 text-rose-200'
    },
    {
      id: 'actions',
      label: 'Actions',
      shortLabel: 'Actions',
      count: actionsList.length,
      accentText: 'text-emerald-400',
      activeClass: 'bg-emerald-500/15 border-emerald-500/70 text-emerald-200'
    },
    {
      id: 'bonus_actions',
      label: 'Bonus Actions',
      shortLabel: 'Bonus',
      count: bonusActionsList.length,
      accentText: 'text-amber-400',
      activeClass: 'bg-amber-500/15 border-amber-500/70 text-amber-200'
    },
    {
      id: 'spells',
      label: 'Spells',
      shortLabel: 'Spells',
      count: spellsList.length,
      accentText: 'text-blue-400',
      activeClass: 'bg-blue-500/15 border-blue-500/70 text-blue-200'
    },
    {
      id: 'reactions',
      label: 'Reactions',
      shortLabel: 'React',
      count: reactionsList.length,
      accentText: 'text-violet-400',
      activeClass: 'bg-violet-500/15 border-violet-500/70 text-violet-200'
    },
    {
      id: 'items',
      label: 'Inventory',
      shortLabel: 'Items',
      count: itemsList.length,
      accentText: 'text-purple-400',
      activeClass: 'bg-purple-500/15 border-purple-500/70 text-purple-200'
    }
  ];

  const handleCancelActiveTargeting = () => {
    if (onCancelTargeting) {
      onCancelTargeting();
    } else if (currentTargetingAction) {
      onSelectAction(currentTargetingAction);
    }
  };

  return (
    <div
      id="player-hero-bottom-dock"
      className="fixed bottom-0 inset-x-0 z-[60] flex flex-col items-center pointer-events-none select-none pb-2 sm:pb-3 px-2 sm:px-4"
    >
      {/* ========================================================================= */}
      {/* ACTIVE TARGETING BANNER                                                   */}
      {/* ========================================================================= */}
      {currentTargetingAction && (
        <div className="pointer-events-auto mb-2 fixed top-3 inset-x-3 sm:static sm:inset-x-auto sm:top-auto z-[140] flex items-center justify-between sm:justify-center gap-3 px-4 py-2 rounded-xl bg-zinc-950/95 border border-amber-500/80 shadow-[0_8px_30px_rgba(0,0,0,0.85)] text-amber-200 font-mono text-xs animate-in fade-in duration-150 max-w-xl mx-auto">
          <div className="flex items-center gap-2 truncate">
            <Crosshair className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
            <span className="truncate">
              Aiming <strong className="text-white">{currentTargetingAction.name}</strong>
              <span className="hidden sm:inline text-zinc-400"> — Click target on battlemap</span>
            </span>
            {currentTargetingAction.hitBonus !== undefined && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRollToHit(currentTargetingAction);
                }}
                className="px-2 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 hover:text-white text-[10px] border border-emerald-500/40 hover:border-emerald-400 shrink-0 font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
                title={`Click to Roll to Hit: 1d20 ${String(currentTargetingAction.hitBonus).startsWith('+') || String(currentTargetingAction.hitBonus).startsWith('-') ? currentTargetingAction.hitBonus : `+${currentTargetingAction.hitBonus}`}`}
              >
                Hit {String(currentTargetingAction.hitBonus).startsWith('+') || String(currentTargetingAction.hitBonus).startsWith('-')
                  ? currentTargetingAction.hitBonus
                  : `+${currentTargetingAction.hitBonus}`}
              </button>
            )}
            {currentTargetingAction.damageFormula && (
              <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 text-[10px] border border-rose-500/40 shrink-0 font-bold">
                {currentTargetingAction.damageFormula}
              </span>
            )}
            {currentTargetingAction.rangeFt !== undefined && currentTargetingAction.rangeFt > 0 && (
              <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 text-[10px] border border-zinc-700 shrink-0">
                {currentTargetingAction.rangeFt} ft.
              </span>
            )}
            {claimedToken && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onTargetSelf) onTargetSelf();
                }}
                className="px-2 py-0.5 rounded bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 hover:text-white text-[10px] border border-emerald-500/50 hover:border-emerald-400 shrink-0 font-bold transition-all cursor-pointer active:scale-95 shadow-sm flex items-center gap-1"
                title={`Cast on self (${claimedToken.name || 'Hero'})`}
              >
                <span>Target Self</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsDockMinimizedWhileAiming(prev => !prev)}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer text-[11px] font-bold flex items-center gap-1 shrink-0"
              title={isDockMinimizedWhileAiming ? "Expand Character Dock" : "Minimize Character Dock"}
            >
              {isDockMinimizedWhileAiming ? <ChevronUp className="w-3.5 h-3.5 text-amber-400" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>{isDockMinimizedWhileAiming ? "Show HUD" : "Minimize"}</span>
            </button>
            <button
              type="button"
              onClick={handleCancelActiveTargeting}
              className="px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-500/40 hover:bg-rose-900/80 text-rose-200 hover:text-white transition-colors cursor-pointer text-[11px] font-bold flex items-center gap-1 shrink-0"
              title="Cancel Targeting (Esc)"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DESKTOP HOVER DETAIL POPOVER                                              */}
      {/* ========================================================================= */}
      {hoveredAction && !currentTargetingAction && (
        <div className="hidden md:block pointer-events-auto relative mb-2 px-4 py-3 rounded-xl bg-zinc-950/98 border border-zinc-700/90 shadow-2xl text-left w-full max-w-2xl animate-in fade-in duration-100">
          <div className="flex items-center justify-between gap-3 flex-wrap pr-8">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner">
                {renderActionGlyph(hoveredAction, 'w-3.5 h-3.5')}
              </div>
              <span className="font-bold text-white font-mono text-xs">{hoveredAction.name}</span>
              {hoveredAction.sourceLabel && (
                <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-mono text-zinc-300">
                  {hoveredAction.sourceLabel}
                </span>
              )}
              {hoveredAction.level !== undefined && (
                <span className="px-1.5 py-0.5 rounded bg-blue-950 border border-blue-500/40 text-[10px] font-mono text-blue-300 font-bold">
                  {hoveredAction.level === 0 ? 'Cantrip' : `${formatSpellLevelLabel(hoveredAction.level)} Level`}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-300">
              {hoveredAction.castingTime && (
                <span className="text-amber-300 font-semibold">{hoveredAction.castingTime}</span>
              )}
              {hoveredAction.rangeFt !== undefined && (
                <span>• {hoveredAction.rangeFt > 0 ? `${hoveredAction.rangeFt} ft.` : 'Self'}</span>
              )}
              {hoveredAction.hitBonus !== undefined && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRollToHit(hoveredAction);
                  }}
                  className="px-2 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/50 hover:border-emerald-400 text-emerald-300 hover:text-white font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
                  title={`Click to Roll to Hit: 1d20 ${String(hoveredAction.hitBonus).startsWith('+') || String(hoveredAction.hitBonus).startsWith('-') ? hoveredAction.hitBonus : `+${hoveredAction.hitBonus}`}`}
                >
                  To Hit: {String(hoveredAction.hitBonus).startsWith('+') || String(hoveredAction.hitBonus).startsWith('-') ? hoveredAction.hitBonus : `+${hoveredAction.hitBonus}`}
                </button>
              )}
              {hoveredAction.saveDc && (
                <span className="px-1.5 py-0.5 rounded bg-amber-950 border border-amber-500/50 text-amber-300 font-bold">
                  Save: DC {hoveredAction.saveDc} {hoveredAction.saveAbility || ''}
                </span>
              )}
              {hoveredAction.damageFormula && (
                <span
                  className={`px-1.5 py-0.5 rounded font-bold border ${
                    hoveredAction.isHeal
                      ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300'
                      : 'bg-rose-950 border-rose-500/50 text-rose-300'
                  }`}
                >
                  {hoveredAction.damageFormula} {hoveredAction.damageType || ''}
                </span>
              )}
              {hoveredAction.uses && (
                <span className="px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-500/50 text-indigo-300 font-bold">
                  {hoveredAction.uses.available}/{hoveredAction.uses.total} Uses
                </span>
              )}
            </div>
          </div>

          {/* Top-right X Close Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setHoveredAction(null);
            }}
            className="absolute top-2.5 right-2.5 p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Close Description (Escape)"
            aria-label="Close Description"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {hoveredAction.notes && (
            <div className="text-[10px] font-mono text-amber-400/90 mt-1">
              Properties & Mastery: {hoveredAction.notes}
            </div>
          )}
          <p className="text-[11px] text-zinc-300 mt-1.5 line-clamp-3 font-sans leading-relaxed">
            {hoveredAction.description}
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MOBILE COMPACT BAR (< 768px)                                              */}
      {/* ========================================================================= */}
      {!isDockMinimizedWhileAiming && (
        <div className="flex md:hidden pointer-events-auto items-center justify-between gap-2.5 w-full max-w-md mx-auto p-2.5 rounded-xl bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 shadow-[0_10px_30px_rgba(0,0,0,0.9)]">
          {/* Square Character Portrait */}
          <div className="relative w-11 h-11 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900 shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-400 font-mono">
                {name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="absolute bottom-0 right-0 px-1 bg-zinc-950/90 border-t border-l border-zinc-700 text-amber-300 font-mono font-bold text-[9px] flex items-center">
              <Shield className="w-2.5 h-2.5 text-amber-400 mr-0.5" />
              {ac}
            </div>
          </div>

          {/* Character Summary & Open Sheet Trigger */}
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(prev => !prev)}
            className="flex-1 flex flex-col items-start px-2 py-1 rounded-lg hover:bg-zinc-900/80 transition-colors text-left min-w-0 cursor-pointer"
          >
            <div className="flex items-center gap-1.5 w-full">
              <span className="text-xs font-bold text-white font-mono truncate">{name}</span>
              <span className="text-[10px] font-mono font-bold text-emerald-400 shrink-0">
                HP {currentHp}/{maxHp}
              </span>
              {isLiveSynced && (
                <span className="px-1 py-0.2 rounded bg-red-500/20 border border-red-500/40 text-red-300 text-[8px] font-mono font-bold shrink-0">
                  DDB
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-300 mt-0.5">
              <Swords className="w-3 h-3 text-rose-400" />
              <span className="font-semibold">
                {attacksList.length} Atk • {bonusActionsList.length} Bonus • {spellsList.length} Spells
              </span>
              <ChevronUp className={`w-3.5 h-3.5 text-amber-400 transition-transform ${isMobileDrawerOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {/* Sync & Turn Controls */}
          <div className="flex items-center gap-1 shrink-0">
            {onRefreshDdb && (
              <button
                type="button"
                onClick={onRefreshDdb}
                className="p-2 rounded-lg bg-zinc-900 text-emerald-400 hover:text-emerald-300 border border-zinc-800 cursor-pointer"
                title="Sync Live from D&D Beyond"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDdb ? 'animate-spin' : ''}`} />
              </button>
            )}

            {onEndTurn && (
              <button
                type="button"
                onClick={onEndTurn}
                className={`px-3 py-2 rounded-lg font-mono text-[11px] font-bold cursor-pointer ${
                  isMyTurn
                    ? 'bg-amber-500 text-zinc-950 shadow-md'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                }`}
              >
                {isMyTurn ? 'End Turn' : 'Pass'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MOBILE SLIDE-UP D&D BEYOND ACTION SHEET                                   */}
      {/* ========================================================================= */}
      {isMobileDrawerOpen && !isDockMinimizedWhileAiming && (
        <div className="fixed inset-x-0 bottom-0 z-[120] max-h-[86dvh] flex flex-col bg-zinc-950/98 backdrop-blur-2xl border-t border-zinc-800 rounded-t-2xl shadow-[0_-20px_50px_rgba(0,0,0,0.95)] p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pointer-events-auto animate-in slide-in-from-bottom duration-200 md:hidden">
          <div className="w-12 h-1.5 bg-zinc-700/80 rounded-full mx-auto mb-2 shrink-0" />
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900 shrink-0">
                {avatarUrl ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" /> : null}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white font-mono truncate">{name}</span>
                  {isLiveSynced && (
                    <span className="px-1.5 py-0.2 rounded bg-red-500/20 border border-red-500/40 text-red-300 text-[9px] font-mono font-bold shrink-0">
                      D&D BEYOND LIVE
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
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900 text-emerald-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-mono font-bold"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDdb ? 'animate-spin' : ''}`} />
                  <span>Sync</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="grid grid-cols-6 gap-1 py-2 shrink-0">
            {categoryTabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                className={`py-1.5 px-1 rounded-lg text-[10px] font-mono font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer border ${
                  activeCategory === tab.id
                    ? tab.activeClass
                    : 'border-zinc-800 text-zinc-400 bg-zinc-900/60'
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
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400'
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
                        : 'bg-zinc-900/80 border-zinc-800 text-zinc-400'
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

          {/* Action Rows */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[140px] max-h-[46dvh] sidebar-scrollbar">
            {currentCategoryList.map((action, idx) => {
              const isTargetingThis = currentTargetingAction?.id === action.id;
              return (
                <div
                  key={action.id || idx}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    onSelectAction(action);
                    setIsMobileDrawerOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectAction(action);
                      setIsMobileDrawerOpen(false);
                    }
                  }}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2.5 cursor-pointer select-none ${
                    isTargetingThis
                      ? 'border-amber-400 bg-amber-500/20 ring-1 ring-amber-400'
                      : 'border-zinc-800 bg-zinc-900/70 hover:bg-zinc-850'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner">
                      {renderActionGlyph(action, 'w-4 h-4')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white font-mono truncate">{action.name}</span>
                        {action.level !== undefined && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-950 border border-blue-500/40 text-blue-300 font-bold shrink-0">
                            {action.level === 0 ? 'Cantrip' : formatSpellLevelLabel(action.level)}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-400 truncate">
                        {action.sourceLabel || action.castingTime || 'Action'}
                        {action.rangeFt !== undefined ? ` • ${action.rangeFt > 0 ? `${action.rangeFt} ft.` : 'Self'}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
                    {action.hitBonus !== undefined && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRollToHit(action);
                        }}
                        className="px-2 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/50 hover:border-emerald-400 text-emerald-300 hover:text-white font-bold transition-all cursor-pointer active:scale-95 shadow-sm shrink-0"
                        title={`Click to Roll to Hit: 1d20 ${String(action.hitBonus).startsWith('+') || String(action.hitBonus).startsWith('-') ? action.hitBonus : `+${action.hitBonus}`}`}
                      >
                        {String(action.hitBonus).startsWith('+') || String(action.hitBonus).startsWith('-') ? action.hitBonus : `+${action.hitBonus}`}
                      </button>
                    )}
                    {action.saveDc && (
                      <span className="px-2 py-1 rounded-lg bg-amber-950 border border-amber-500/50 text-amber-300 font-bold">
                        DC {action.saveDc}
                      </span>
                    )}
                    {action.damageFormula && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAction(action);
                          setIsMobileDrawerOpen(false);
                        }}
                        className={`px-2 py-1 rounded-lg font-bold border transition-all cursor-pointer active:scale-95 ${
                          action.isHeal
                            ? 'bg-emerald-950/90 hover:bg-emerald-900 border-emerald-500/50 text-emerald-300'
                            : 'bg-rose-950/90 hover:bg-rose-900 border-rose-500/50 text-rose-300'
                        }`}
                        title={`Cast & Fire: ${action.name} (${action.damageFormula})`}
                      >
                        {action.damageFormula}
                      </button>
                    )}
                    {action.uses && (
                      <span className="px-1.5 py-1 rounded-lg bg-indigo-950 border border-indigo-500/40 text-indigo-300 font-bold">
                        {action.uses.available}/{action.uses.total}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isMobileDrawerOpen && !isDockMinimizedWhileAiming && (
        <div
          className="fixed inset-0 z-[115] bg-black/60 backdrop-blur-xs pointer-events-auto md:hidden"
          onClick={() => setIsMobileDrawerOpen(false)}
        />
      )}

      {/* ========================================================================= */}
      {/* DESKTOP D&D BEYOND TACTICAL CHARACTER SHEET HUD (>= 768px)                */}
      {/* ========================================================================= */}
      {!isDockMinimizedWhileAiming && (
        <div className="hidden md:flex pointer-events-auto flex-col w-full max-w-5xl rounded-2xl bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 shadow-[0_12px_40px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Top Crimson/Amber D&D Beyond Accent Trim */}
        <div className="h-0.5 w-full bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />

        {/* 1. HEADER BAR: CHARACTER IDENTITY, DDB STAT BLOCKS, SEARCH & CONTROLS */}
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-zinc-900/70 border-b border-zinc-800/90 flex-wrap">
          {/* Left: Portrait + Name + Class/Level */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-900 shrink-0 shadow-md">
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-zinc-400 font-mono text-xs">
                  {name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white font-mono truncate" title={name}>
                  {name}
                </h3>
                {isLiveSynced && (
                  <span
                    className="px-1.5 py-0.2 rounded bg-red-500/20 border border-red-500/40 text-red-300 text-[9px] font-mono font-bold tracking-wide shrink-0"
                    title="Live Synced with D&D Beyond Character Sheet"
                  >
                    DDB LIVE
                  </span>
                )}
                {isCharacterPrivate && (
                  <button
                    type="button"
                    onClick={onOpenPrivacyModal}
                    className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 text-amber-300 hover:bg-amber-500/30 text-[9px] font-mono font-bold tracking-wide shrink-0 flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                    title="Character sheet is Private on D&D Beyond. Click to view quicklink to make it Public."
                  >
                    <Lock className="w-2.5 h-2.5 text-amber-400" />
                    <span>SHEET PRIVATE</span>
                  </button>
                )}
              </div>
              <div className="text-[11px] font-mono text-zinc-400 truncate">
                {[race, classLevel].filter(Boolean).join(' • ') || 'Player Character'}
              </div>
            </div>
          </div>

          {/* Center: D&D Beyond Vitals Stat Boxes (HP Bar, AC, Speed, PP, Spell Save DC) */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Hit Points Stat Box */}
            <div className="flex flex-col justify-center px-3 py-1 rounded-xl bg-zinc-950 border border-zinc-800 min-w-[135px]">
              <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                <span className="text-zinc-400 uppercase font-bold flex items-center gap-1">
                  <Heart className="w-3 h-3 text-emerald-400" />
                  HP
                </span>
                <div>
                  <span className={`font-bold text-xs ${hpPercent <= 25 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {currentHp}
                  </span>
                  <span className="text-zinc-500"> / </span>
                  <span className="text-zinc-200 font-bold text-xs">{maxHp}</span>
                  {tempHp > 0 && (
                    <span className="ml-1 text-cyan-300 font-bold text-[10px]">(+{tempHp})</span>
                  )}
                </div>
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    hpPercent > 50 ? 'bg-emerald-500' : hpPercent > 25 ? 'bg-amber-500' : 'bg-rose-600'
                  }`}
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
            </div>

            {/* Armor Class Stat Box */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 font-mono"
              title={`Armor Class: ${ac}`}
            >
              <Shield className="w-4 h-4 text-amber-400" />
              <div className="flex flex-col leading-none">
                <span className="text-[8px] text-zinc-500 uppercase font-bold">AC</span>
                <span className="text-xs font-bold text-white">{ac}</span>
              </div>
            </div>

            {/* Walking Speed Stat Box */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 font-mono"
              title={`Walking Speed: ${speed}`}
            >
              <Footprints className="w-3.5 h-3.5 text-sky-400" />
              <div className="flex flex-col leading-none">
                <span className="text-[8px] text-zinc-500 uppercase font-bold">Speed</span>
                <span className="text-xs font-bold text-zinc-200">{speed}</span>
              </div>
            </div>

            {/* Passive Perception Stat Box */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 font-mono"
              title={`Passive Perception: ${passivePerception}`}
            >
              <Eye className="w-3.5 h-3.5 text-violet-400" />
              <div className="flex flex-col leading-none">
                <span className="text-[8px] text-zinc-500 uppercase font-bold">Passive</span>
                <span className="text-xs font-bold text-zinc-200">{passivePerception}</span>
              </div>
            </div>

            {/* Spell Save DC / Spell Attack Box */}
            {spellSaveDc && spellsList.length > 0 && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-blue-500/30 font-mono"
                title={`Spell Save DC: ${spellSaveDc}${spellAttackBonus ? ` | Spell Attack: +${spellAttackBonus}` : ''}`}
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <div className="flex flex-col leading-none">
                  <span className="text-[8px] text-blue-400 uppercase font-bold">Spell DC</span>
                  <span className="text-xs font-bold text-white">
                    {spellSaveDc}
                    {spellAttackBonus !== undefined ? ` (+${spellAttackBonus})` : ''}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Search Filter + Sync DDB + Sheet Link + Turn & Collapse Controls */}
          <div className="flex items-center gap-1.5">
            {!isTrayCollapsed && (
              <div className="relative w-40 lg:w-48">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter actions/spells..."
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500/60 rounded-xl pl-8 pr-6 py-1.5 text-[11px] font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {onRefreshDdb && (
              <button
                type="button"
                onClick={onRefreshDdb}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-emerald-400 hover:text-emerald-300 border border-zinc-800 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-mono font-bold"
                title="Pull latest Attacks, Actions, Bonus Actions & Spells from D&D Beyond"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDdb ? 'animate-spin' : ''}`} />
                <span className="hidden lg:inline">Sync DDB</span>
              </button>
            )}

            {characterData?.readonlyUrl && (
              <a
                href={characterData.readonlyUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                title="Open D&D Beyond Character Sheet"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            {onSwitchCharacter && (
              <button
                type="button"
                onClick={onSwitchCharacter}
                className="p-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 border border-zinc-800 transition-colors cursor-pointer"
                title="Switch Character / Hero"
              >
                <Users className="w-4 h-4" />
              </button>
            )}

            {onSwitchStationMode && (
              <button
                type="button"
                onClick={onSwitchStationMode}
                className="p-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 border border-zinc-800 transition-colors cursor-pointer"
                title="Switch Station Mode (TV Table / Remote Player)"
              >
                <Tv className="w-4 h-4" />
              </button>
            )}

            {onOpenRestModal && (
              <button
                type="button"
                onClick={onOpenRestModal}
                className="p-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 border border-zinc-800 transition-colors cursor-pointer"
                title="Short / Long Rest"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            {onEndTurn && (
              <button
                type="button"
                onClick={onEndTurn}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                  isMyTurn
                    ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20'
                    : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                }`}
              >
                {isMyTurn ? 'End Turn' : 'Pass Turn'}
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsTrayCollapsed(prev => !prev)}
              className={`p-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                isTrayCollapsed
                  ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/50 px-2.5 shadow-sm shadow-amber-500/10'
                  : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
              title={isTrayCollapsed ? 'Expand Character Action Sheet' : 'Minimize Character Action Sheet'}
            >
              {isTrayCollapsed ? (
                <>
                  <ChevronUp className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span className="text-xs font-mono font-bold text-amber-300">Actions</span>
                </>
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* 2. COLLAPSIBLE BODY: CATEGORY TABS, SPELL LEVEL FILTER & D&D BEYOND ACTION CARDS */}
        {!isTrayCollapsed && (
          <div className="p-3 space-y-2.5">
            {/* Category Tabs & Spell Slot Trackers */}
            <div className="flex items-center justify-between gap-2 flex-wrap border-b border-zinc-800/80 pb-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {categoryTabs.map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveCategory(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                      activeCategory === tab.id
                        ? tab.activeClass
                        : 'border-zinc-800/80 bg-zinc-900/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    <span className={tab.accentText}>●</span>
                    <span>{tab.label}</span>
                    <span className="text-[10px] opacity-70">({tab.count})</span>
                  </button>
                ))}
              </div>

              {/* D&D Beyond Spell Slot Tracker Boxes */}
              {characterData?.spellSlots && Object.keys(characterData.spellSlots).length > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold">Spell Slots:</span>
                  {Object.values(characterData.spellSlots).map((slot: any) => (
                    <button
                      key={slot.level}
                      type="button"
                      onClick={() => {
                        setActiveCategory('spells');
                        setSelectedSpellLevel(prev => (prev === slot.level ? 'all' : slot.level));
                      }}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] cursor-pointer transition-all ${
                        activeCategory === 'spells' && selectedSpellLevel === slot.level
                          ? 'bg-blue-500/25 border-blue-400 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-blue-500/50'
                      }`}
                      title={`Level ${slot.level} Spell Slots: ${slot.available}/${slot.total} available (Click to filter Level ${slot.level} spells)`}
                    >
                      <span className="text-blue-400 font-bold">{formatSpellLevelLabel(slot.level)}:</span>
                      <span className="font-bold">
                        {slot.available}/{slot.total}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Spell Level Filter Bar (Visible when Spells tab is selected) */}
            {activeCategory === 'spells' && availableSpellLevels.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sidebar-scrollbar">
                <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold mr-1 shrink-0">
                  Filter Level:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedSpellLevel('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-all cursor-pointer shrink-0 ${
                    selectedSpellLevel === 'all'
                      ? 'bg-blue-500/25 border-blue-400 text-blue-200'
                      : 'bg-zinc-900/70 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  All Spells ({spellsList.length})
                </button>
                {availableSpellLevels.map(lvl => {
                  const countForLvl = spellsList.filter(s => (s.level ?? 0) === lvl).length;
                  const slotInfo = lvl > 0 ? characterData?.spellSlots?.[lvl] : undefined;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSelectedSpellLevel(lvl)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                        selectedSpellLevel === lvl
                          ? 'bg-blue-500/25 border-blue-400 text-blue-200'
                          : 'bg-zinc-900/70 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                      }`}
                    >
                      <span>{formatSpellLevelLabel(lvl)}</span>
                      <span className="text-[10px] opacity-70">({countForLvl})</span>
                      {slotInfo && (
                        <span className="ml-0.5 px-1 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-500/40 text-[9px]">
                          {slotInfo.available}/{slotInfo.total}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* D&D Beyond Tactical Action Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 max-h-[185px] overflow-y-auto pr-1 sidebar-scrollbar">
              {currentCategoryList.map((action, idx) => {
                const isTargetingThis = currentTargetingAction?.id === action.id;
                const formattedHit =
                  action.hitBonus !== undefined
                    ? String(action.hitBonus).startsWith('+') || String(action.hitBonus).startsWith('-')
                      ? String(action.hitBonus)
                      : `+${action.hitBonus}`
                    : null;

                return (
                  <div
                    key={action.id || idx}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectAction(action)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectAction(action);
                      }
                    }}
                    onMouseEnter={() => setHoveredAction(action)}
                    onMouseLeave={() => setHoveredAction(null)}
                    className={`group p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2.5 cursor-pointer select-none ${
                      isTargetingThis
                        ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.35)] ring-1 ring-amber-400'
                        : 'border-zinc-800/90 hover:border-amber-500/50 bg-zinc-900/75 hover:bg-zinc-900'
                    }`}
                  >
                    {/* Left: Action Icon + Name + Range/Source Subtitle */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-lg bg-zinc-950 border border-zinc-800 group-hover:border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner">
                        {renderActionGlyph(action, 'w-4 h-4')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-zinc-100 group-hover:text-amber-200 font-mono truncate">
                            {action.name}
                          </span>
                          {action.level !== undefined && (
                            <span className="px-1.5 py-0.2 rounded bg-blue-950/90 border border-blue-500/40 text-blue-300 font-mono text-[9px] font-bold shrink-0">
                              {action.level === 0 ? 'Cantrip' : formatSpellLevelLabel(action.level)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 truncate mt-0.5">
                          <span>{action.sourceLabel || action.castingTime || '1 Action'}</span>
                          {action.rangeFt !== undefined && (
                            <>
                              <span>•</span>
                              <span>{action.rangeFt > 0 ? `${action.rangeFt} ft.` : 'Self'}</span>
                            </>
                          )}
                          {action.notes && (
                            <>
                              <span>•</span>
                              <span className="text-amber-400/80 truncate">{action.notes}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: D&D Beyond Hit / Save / Damage / Uses Badges */}
                    <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
                      {formattedHit && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRollToHit(action);
                          }}
                          className="flex flex-col items-center px-2 py-1 rounded-lg bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 hover:text-white transition-all cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(16,185,129,0.5)] active:scale-95 group/hit shrink-0"
                          title={`Click to Roll to Hit: 1d20 ${formattedHit}`}
                          aria-label={`Roll to Hit: 1d20 ${formattedHit}`}
                        >
                          <span className="text-[8px] uppercase text-emerald-400/80 group-hover/hit:text-emerald-200 leading-none">Hit</span>
                          <span className="font-bold text-xs leading-tight">{formattedHit}</span>
                        </button>
                      )}

                      {action.saveDc && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAction(action);
                          }}
                          className="flex flex-col items-center px-2 py-1 rounded-lg bg-amber-950/90 hover:bg-amber-900 border border-amber-500/40 hover:border-amber-400 text-amber-300 hover:text-white transition-all cursor-pointer active:scale-95 shrink-0"
                          title={`Cast ${action.name} (DC ${action.saveDc} ${action.saveAbility || ''})`}
                        >
                          <span className="text-[8px] uppercase text-amber-400/80 leading-none">
                            {action.saveAbility || 'Save'}
                          </span>
                          <span className="font-bold text-xs leading-tight">DC {action.saveDc}</span>
                        </button>
                      )}

                      {action.damageFormula && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAction(action);
                          }}
                          className={`flex flex-col items-center px-2 py-1 rounded-lg border transition-all cursor-pointer active:scale-95 shrink-0 ${
                            action.isHeal
                              ? 'bg-emerald-950/90 hover:bg-emerald-900 border-emerald-500/40 hover:border-emerald-400 text-emerald-300 hover:text-white shadow-sm hover:shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                              : 'bg-rose-950/90 hover:bg-rose-900 border-rose-500/40 hover:border-rose-400 text-rose-300 hover:text-white shadow-sm hover:shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                          }`}
                          title={`Cast & Fire: ${action.name} (${action.damageFormula})`}
                          aria-label={`Fire ${action.name}: ${action.damageFormula}`}
                        >
                          <span className="text-[8px] uppercase opacity-75 leading-none truncate max-w-[56px]">
                            {action.damageType || (action.isHeal ? 'Heal' : 'Dmg')}
                          </span>
                          <span className="font-bold text-xs leading-tight">
                            {action.damageFormula.replace(/\s+/g, '')}
                          </span>
                        </button>
                      )}

                      {action.uses && (
                        <div className="flex flex-col items-center px-2 py-1 rounded-lg bg-indigo-950/90 border border-indigo-500/40 text-indigo-300">
                          <span className="text-[8px] uppercase text-indigo-400/80 leading-none">Uses</span>
                          <span className="font-bold text-xs leading-tight">
                            {action.uses.available}/{action.uses.total}
                          </span>
                        </div>
                      )}

                      {!action.uses && action.quantity !== undefined && (
                        <span className="px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-700 text-amber-300 font-bold">
                          x{action.quantity}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {currentCategoryList.length === 0 && (
                <div className="col-span-full py-6 text-center text-xs font-mono text-zinc-500">
                  No {activeCategory.replace('_', ' ')} match the current filter.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
};
