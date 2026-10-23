import React, { useState, useMemo, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
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
  Users,
  GripHorizontal,
  PawPrint
} from 'lucide-react';
import { HudCharacterData, HudActionItem, HudActionCategory, computeUpcastFormula, evaluateDiceFormula } from '../types/hud';
import { findJb2aAsset } from '../effects/db/jb2aRegistry';
import { toast } from 'sonner';

interface PlayerHeroDockProps {
  characterData: HudCharacterData | null;
  claimedToken?: any | null;
  onSelectAction: (action: HudActionItem) => void;
  onRollToHit?: (action: HudActionItem) => void;
  onRollDamage?: (action: HudActionItem) => void;
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
  isDdbSyncEnabled?: boolean;
  onToggleDdbSync?: (enabled: boolean) => void;
  isMobile?: boolean;
  onTargetSelf?: () => void;
  activeEffects?: any[];
  onDispelEffect?: (effectId: string) => void;
  inspectedAuraRequest?: { action: HudActionItem; tick: number } | null;
  onClearInspectedAura?: () => void;
  onOpenWildShape?: () => void;
  onRevertWildShape?: () => void;
  activeWildShape?: any | null;
  collapseRequestTick?: number;
}

export const PlayerHeroDock: React.FC<PlayerHeroDockProps> = ({
  characterData,
  claimedToken,
  onSelectAction,
  onRollToHit,
  onRollDamage,
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
  isDdbSyncEnabled = true,
  onToggleDdbSync,
  onTargetSelf,
  activeEffects = [],
  onDispelEffect,
  inspectedAuraRequest,
  onClearInspectedAura,
  onOpenWildShape,
  onRevertWildShape,
  activeWildShape,
  collapseRequestTick
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
  const [includeUpcastInFilter, setIncludeUpcastInFilter] = useState<boolean>(false);
  const [upcastLevels, setUpcastLevels] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hoveredAction, setHoveredAction] = useState<HudActionItem | null>(null);
  const [pinnedAction, setPinnedAction] = useState<HudActionItem | null>(null);
  const [inspectedAction, setInspectedAction] = useState<HudActionItem | null>(null);
  const [popoverDragOffset, setPopoverDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [modalDragOffset, setModalDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isTrayCollapsed, setIsTrayCollapsed] = useState<boolean>(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [isDockMinimizedWhileAiming, setIsDockMinimizedWhileAiming] = useState<boolean>(false);
  const [isHoveringWildShapeBtn, setIsHoveringWildShapeBtn] = useState<boolean>(false);

  // Minimize HUD tray and any open action popups when requested (e.g. upon Wild Shape transformation)
  useEffect(() => {
    if (!collapseRequestTick) return;
    setIsTrayCollapsed(true);
    setIsMobileDrawerOpen(false);
    setHoveredAction(null);
    setPinnedAction(null);
    setInspectedAction(null);
  }, [collapseRequestTick]);

  const handleStartPopoverDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input, a, [data-no-drag]')) return;
    const startX = e.clientX - popoverDragOffset.x;
    const startY = e.clientY - popoverDragOffset.y;
    const handleEl = e.currentTarget;
    try { handleEl.setPointerCapture(e.pointerId); } catch {}
    const onMove = (ev: PointerEvent) => {
      setPopoverDragOffset({
        x: ev.clientX - startX,
        y: ev.clientY - startY
      });
    };
    const onUp = () => {
      handleEl.removeEventListener('pointermove', onMove);
      handleEl.removeEventListener('pointerup', onUp);
      handleEl.removeEventListener('pointercancel', onUp);
    };
    handleEl.addEventListener('pointermove', onMove);
    handleEl.addEventListener('pointerup', onUp);
    handleEl.addEventListener('pointercancel', onUp);
    e.preventDefault();
  }, [popoverDragOffset]);

  const handleStartModalDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input, a, [data-no-drag]')) return;
    const startX = e.clientX - modalDragOffset.x;
    const startY = e.clientY - modalDragOffset.y;
    const handleEl = e.currentTarget;
    try { handleEl.setPointerCapture(e.pointerId); } catch {}
    const onMove = (ev: PointerEvent) => {
      setModalDragOffset({
        x: ev.clientX - startX,
        y: ev.clientY - startY
      });
    };
    const onUp = () => {
      handleEl.removeEventListener('pointermove', onMove);
      handleEl.removeEventListener('pointerup', onUp);
      handleEl.removeEventListener('pointercancel', onUp);
    };
    handleEl.addEventListener('pointermove', onMove);
    handleEl.addEventListener('pointerup', onUp);
    handleEl.addEventListener('pointercancel', onUp);
    e.preventDefault();
  }, [modalDragOffset]);

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

  // Close hover/cast description card or inspected modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (inspectedAction) {
          setInspectedAction(null);
        } else if (hoveredAction || pinnedAction) {
          setHoveredAction(null);
          setPinnedAction(null);
          onClearInspectedAura?.();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hoveredAction, pinnedAction, inspectedAction, onClearInspectedAura]);

  // Dedicated Damage / Healing Dice Roll Handler (e.g. clicking "9d8 radiant")
  const handleRollDamage = (action: HudActionItem) => {
    if (onRollDamage) {
      onRollDamage(action);
      return;
    }

    const rawFormula = action.damageFormula;
    if (!rawFormula) return;

    const evaluated = evaluateDiceFormula(rawFormula, false);
    const rolledTotal = evaluated.total;
    const diceResults = evaluated.dice;

    const charName = characterData?.name || claimedToken?.name || 'Hero';
    const upcastSuffix =
      action.castAtLevel && action.castAtLevel > (action.level ?? 0)
        ? ` [Lvl ${action.castAtLevel} Slot]`
        : '';

    const diceEvent: any = {
      id: `roll-${Date.now()}`,
      characterId: String(characterData?.id || claimedToken?.id || ''),
      characterName: charName,
      avatarUrl: characterData?.avatarUrl || claimedToken?.avatarUrl || claimedToken?.url,
      action: `${action.name}${upcastSuffix} (${action.isHeal ? 'Healing' : 'Damage'})`,
      rollType: action.isHeal ? 'heal' : 'damage',
      formula: `${rawFormula} → ${evaluated.breakdown}`,
      diceNotation: rawFormula,
      dice: diceResults.length > 0 ? diceResults : [{ sides: 8, result: rolledTotal, type: 'd8' }],
      modifier: evaluated.bonus,
      total: rolledTotal,
      isCritical: false,
      isFumble: false,
      theme: 'default',
      themeColor: action.isHeal ? '#10b981' : '#f59e0b',
      timestamp: Date.now(),
      source: 'player'
    };

    if (typeof window !== 'undefined' && (window as any).__mistwalkerRoll3d) {
      (window as any).__mistwalkerRoll3d(diceEvent);
    }
    if (typeof window !== 'undefined' && (window as any).__mistwalkerSocket?.connected) {
      (window as any).__mistwalkerSocket.emit('SYNC_LOCAL_DICE_ROLL', diceEvent);
    }

    toast.success(`${charName}: ${action.name}${upcastSuffix}!`, {
      description: `Rolled ${rolledTotal} ${action.damageType || (action.isHeal ? 'HP' : 'damage')} (${evaluated.breakdown})`
    });
  };

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

  const specialList = useMemo<HudActionItem[]>(
    () => (Array.isArray(characterData?.special) ? characterData.special : []),
    [characterData?.special]
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

  const formatSpellLevelLabel = (lvl: number) => {
    if (lvl === 0) return 'Cantrip';
    if (lvl === 1) return '1st';
    if (lvl === 2) return '2nd';
    if (lvl === 3) return '3rd';
    return `${lvl}th`;
  };

  // Build an upcasted (or base-level) copy of a spell action at a chosen slot level
  const buildActionAtSlotLevel = (action: HudActionItem, targetSlotLevel: number): HudActionItem => {
    const baseLevel = action.level ?? 0;
    if (baseLevel < 1) return action;

    // Book of Exalted Deeds (Enlightened Magic):
    // "any spell slot you expend to cast a cleric or paladin spell counts as a spell slot of one level higher."
    const hasBookOfExaltedDeeds = Boolean(
      characterData?.hasBookOfExaltedDeeds ||
      characterData?.name?.toLowerCase().includes('stavros')
    );

    const clampedExpendedSlot = Math.max(baseLevel, Math.min(9, targetSlotLevel));
    const effectiveCastLevel = hasBookOfExaltedDeeds
      ? Math.min(9, clampedExpendedSlot + 1)
      : clampedExpendedSlot;

    if (effectiveCastLevel <= baseLevel) {
      return {
        ...action,
        castAtLevel: baseLevel,
        spellSlotRequired: clampedExpendedSlot
      };
    }

    const precomputed = action.upcastOptions?.find(o => o.slotLevel === effectiveCastLevel);
    const computed = precomputed || {
      slotLevel: effectiveCastLevel,
      ...computeUpcastFormula(action.damageFormula, baseLevel, effectiveCastLevel, action.name)
    };

    const enlightenedNotice = hasBookOfExaltedDeeds
      ? `✦ Enlightened Magic (Book of Exalted Deeds: Expends Lv ${clampedExpendedSlot} slot → Casts as Lv ${effectiveCastLevel})`
      : null;

    const upcastTag = computed.bonusEffect
      ? `Upcast (${formatSpellLevelLabel(effectiveCastLevel)}: ${computed.bonusEffect})`
      : `Upcast (${formatSpellLevelLabel(effectiveCastLevel)})`;

    return {
      ...action,
      castAtLevel: effectiveCastLevel,
      spellSlotRequired: clampedExpendedSlot,
      damageFormula: computed.damageFormula ?? action.damageFormula,
      notes: [action.notes, enlightenedNotice, upcastTag].filter(Boolean).join(' • ')
    };
  };

  // Resolve the effective action (with any active upcast slot level applied)
  const getEffectiveAction = (action: HudActionItem): HudActionItem => {
    const baseLevel = action.level ?? 0;
    if (baseLevel < 1) return action;
    const normName = action.name.trim().toLowerCase();
    const filterSlot =
      typeof selectedSpellLevel === 'number' &&
      selectedSpellLevel > baseLevel &&
      includeUpcastInFilter
        ? selectedSpellLevel
        : undefined;
    const chosenSlot =
      upcastLevels[action.id] ??
      upcastLevels[`name:${normName}`] ??
      filterSlot ??
      action.spellSlotRequired ??
      baseLevel;
    return buildActionAtSlotLevel(action, chosenSlot);
  };

  const setActionUpcastLevel = (action: HudActionItem, nextSlotLevel: number) => {
    const baseLevel = action.level ?? 0;
    if (baseLevel < 1) return;
    const clamped = Math.max(baseLevel, Math.min(9, nextSlotLevel));
    const normName = action.name.trim().toLowerCase();
    setUpcastLevels(prev => ({
      ...prev,
      [action.id]: clamped,
      [`name:${normName}`]: clamped
    }));
    const updated = buildActionAtSlotLevel(action, clamped);
    if (inspectedAction && (inspectedAction.id === action.id || inspectedAction.name.trim().toLowerCase() === normName)) {
      setInspectedAction(buildActionAtSlotLevel(inspectedAction, clamped));
    }
    if (hoveredAction && (hoveredAction.id === action.id || hoveredAction.name.trim().toLowerCase() === normName)) {
      setHoveredAction(buildActionAtSlotLevel(hoveredAction, clamped));
    }
    if (pinnedAction && (pinnedAction.id === action.id || pinnedAction.name.trim().toLowerCase() === normName)) {
      setPinnedAction(buildActionAtSlotLevel(pinnedAction, clamped));
    }
    if (currentTargetingAction && (currentTargetingAction.id === action.id || currentTargetingAction.name.trim().toLowerCase() === normName)) {
      onSelectAction(buildActionAtSlotLevel(currentTargetingAction, clamped));
    }
  };

  // When a player left-clicks an active aura title above their character token on the map,
  // re-open the description card populated with the aura's cast slot level & damage button
  useEffect(() => {
    if (!inspectedAuraRequest?.action) return;
    const req = inspectedAuraRequest.action;
    const cleanReqName = req.name.replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase();
    const matchedBase =
      spellsList.find(
        s => s.id === req.id || s.name.trim().toLowerCase() === cleanReqName
      ) || req;

    const baseLvl = matchedBase.level ?? req.level ?? 0;
    const chosenSlot =
      req.spellSlotRequired && req.spellSlotRequired >= baseLvl
        ? req.spellSlotRequired
        : req.castAtLevel && req.castAtLevel >= baseLvl
        ? req.castAtLevel
        : upcastLevels[matchedBase.id] ?? matchedBase.spellSlotRequired ?? baseLvl;

    const effective =
      baseLvl >= 1 ? buildActionAtSlotLevel(matchedBase, chosenSlot) : matchedBase;

    setPinnedAction(effective);
    setHoveredAction(effective);
  }, [inspectedAuraRequest?.tick]);

  // Filtered spells when spell level filter is active
  const filteredSpellsList = useMemo<HudActionItem[]>(() => {
    if (selectedSpellLevel === 'all') return spellsList;
    return spellsList.filter(sp => {
      const lvl = sp.level ?? 0;
      if (lvl === selectedSpellLevel) return true;
      if (
        includeUpcastInFilter &&
        typeof selectedSpellLevel === 'number' &&
        selectedSpellLevel >= 2 &&
        lvl >= 1 &&
        lvl < selectedSpellLevel &&
        (sp.canUpcast || Boolean(sp.damageFormula) || Boolean(sp.atHigherLevels))
      ) {
        return true;
      }
      return false;
    });
  }, [spellsList, selectedSpellLevel, includeUpcastInFilter]);

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
      case 'special':
        base = specialList;
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
    specialList,
    searchQuery
  ]);

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

    if (action.isHaloToggle) {
      return <Sparkles className={`${sizeClass} text-amber-300`} />;
    }
    if (action.category === 'special' || action.type === 'special') {
      return <Sparkles className={`${sizeClass} text-cyan-400`} />;
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
    },
    {
      id: 'special',
      label: 'Special',
      shortLabel: 'Special',
      count: specialList.length,
      accentText: 'text-cyan-400',
      activeClass: 'bg-cyan-500/15 border-cyan-500/70 text-cyan-200'
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
        <div className="pointer-events-auto mb-2 fixed top-3 inset-x-3 sm:static sm:inset-x-auto sm:top-auto z-[140] flex flex-col gap-1.5 px-4 py-2 rounded-xl bg-zinc-950/95 border border-amber-500/80 shadow-[0_8px_30px_rgba(0,0,0,0.85)] text-amber-200 font-mono text-xs animate-in fade-in duration-150 max-w-2xl mx-auto">
          <div className="flex items-center justify-between sm:justify-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 truncate">
              <Crosshair className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
              <span className="truncate">
                Aiming <strong className="text-white">{currentTargetingAction.name}</strong>
                {currentTargetingAction.castAtLevel && currentTargetingAction.castAtLevel > (currentTargetingAction.level ?? 0) && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-500/60 text-[10px] font-bold">
                    ▲ {formatSpellLevelLabel(currentTargetingAction.castAtLevel)} Slot
                  </span>
                )}
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
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRollDamage(currentTargetingAction);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] border shrink-0 font-bold transition-all cursor-pointer active:scale-95 ${
                    currentTargetingAction.castAtLevel && currentTargetingAction.castAtLevel > (currentTargetingAction.level ?? 0)
                      ? 'bg-fuchsia-950 hover:bg-fuchsia-900 text-fuchsia-200 hover:text-white border-fuchsia-400/70 shadow-[0_0_8px_rgba(217,70,239,0.4)]'
                      : currentTargetingAction.isHeal
                      ? 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 hover:text-white border-emerald-500/40'
                      : 'bg-rose-950 hover:bg-rose-900 text-rose-300 hover:text-white border-rose-500/40'
                  }`}
                  title={`Click to Roll ${currentTargetingAction.damageFormula} ${currentTargetingAction.damageType || ''}`}
                >
                  {currentTargetingAction.damageFormula}
                </button>
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
              {onEndTurn && (
                <button
                  type="button"
                  onClick={onEndTurn}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1 shrink-0 ${
                    isMyTurn
                      ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/30 animate-pulse'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700'
                  }`}
                  title={isMyTurn ? "Your Turn: Click to Pass Turn" : "Pass Turn"}
                >
                  Pass Turn
                </button>
              )}
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

          {/* Inline Upcast Slot Selector while Aiming Leveled Spells */}
          {(currentTargetingAction.level ?? 0) >= 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-1 border-t border-zinc-800/80 flex-wrap text-[10px]">
              <span className="text-zinc-400 font-bold uppercase tracking-wider mr-1">
                Cast Slot Level:
              </span>
              {Array.from(
                { length: 9 - (currentTargetingAction.level ?? 1) + 1 },
                (_, i) => (currentTargetingAction.level ?? 1) + i
              ).map(slotLvl => {
                const baseSpell =
                  spellsList.find(
                    s => s.id === currentTargetingAction.id || s.name.trim().toLowerCase() === currentTargetingAction.name.trim().toLowerCase()
                  ) || currentTargetingAction;
                const activeSlot = currentTargetingAction.spellSlotRequired ?? currentTargetingAction.castAtLevel ?? currentTargetingAction.level ?? 1;
                const isSelected = activeSlot === slotLvl;
                const slotInfo = characterData?.spellSlots?.[slotLvl];
                const previewAction = buildActionAtSlotLevel(baseSpell, slotLvl);
                const effectiveCastLvl = previewAction.castAtLevel ?? slotLvl;
                const isUpcast = effectiveCastLvl > (baseSpell.level ?? 1);
                return (
                  <button
                    key={slotLvl}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActionUpcastLevel(baseSpell, slotLvl);
                    }}
                    className={`px-2 py-0.5 rounded-md font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? isUpcast
                          ? 'bg-fuchsia-500/25 border-fuchsia-400 text-fuchsia-200 shadow-[0_0_8px_rgba(217,70,239,0.35)]'
                          : 'bg-blue-500/25 border-blue-400 text-blue-200'
                        : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'
                    }`}
                    title={`Cast ${baseSpell.name} at ${formatSpellLevelLabel(effectiveCastLvl)} Level (Uses ${formatSpellLevelLabel(slotLvl)} Level Slot)${previewAction.damageFormula ? ` (${previewAction.damageFormula})` : ''}${slotInfo ? ` — ${slotInfo.available}/${slotInfo.total} slots` : ''}`}
                  >
                    <span>
                      {effectiveCastLvl > slotLvl
                        ? `Lv ${effectiveCastLvl} (${formatSpellLevelLabel(slotLvl)} Slot)`
                        : formatSpellLevelLabel(slotLvl)}
                    </span>
                    {isSelected && previewAction.damageFormula && (
                      <span className="text-[9px] opacity-90">({previewAction.damageFormula.replace(/\s+/g, '')})</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* DESKTOP HOVER & CLICKED AURA DETAIL POPOVER                               */}
      {/* ========================================================================= */}
      {(() => {
        const detailAction = hoveredAction || pinnedAction;
        if (!detailAction || currentTargetingAction) return null;
        const baseSpell =
          spellsList.find(
            s => s.id === detailAction.id || s.name.trim().toLowerCase() === detailAction.name.trim().toLowerCase()
          ) || detailAction;
        const baseLvl = baseSpell.level ?? detailAction.level ?? 0;
        const expendedSlot = detailAction.spellSlotRequired ?? baseLvl;
        const currentSlot = detailAction.castAtLevel ?? baseLvl;
        const isUpcasted = baseLvl >= 1 && currentSlot > baseLvl;
        const canDecrementSlot = baseLvl >= 1 && expendedSlot > baseLvl;
        const canIncrementSlot = baseLvl >= 1 && expendedSlot < 9 && currentSlot < 9;

        return (
          <div
            onPointerDown={handleStartPopoverDrag}
            style={{ transform: `translate3d(${popoverDragOffset.x}px, ${popoverDragOffset.y}px, 0)` }}
            title="Click and drag to move menu"
            className={`${pinnedAction ? 'block' : 'hidden md:block'} pointer-events-auto relative mb-2 px-4 py-3 rounded-xl bg-zinc-950/98 border border-zinc-700/90 shadow-2xl text-left w-full max-w-2xl animate-in fade-in duration-100 cursor-move touch-none select-none`}
          >
            <div className="flex items-center justify-between gap-3 flex-wrap pr-8">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-6 h-6 rounded-md bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner">
                  {renderActionGlyph(detailAction, 'w-3.5 h-3.5')}
                </div>
                <span className="font-bold text-white font-mono text-xs">{detailAction.name}</span>
                <GripHorizontal className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                {detailAction.sourceLabel && (
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-mono text-zinc-300">
                    {detailAction.sourceLabel}
                  </span>
                )}
                {detailAction.level !== undefined && (
                  <span className="px-1.5 py-0.5 rounded bg-blue-950 border border-blue-500/40 text-[10px] font-mono text-blue-300 font-bold">
                    {detailAction.level === 0 ? 'Cantrip' : `${formatSpellLevelLabel(detailAction.level)} Level`}
                  </span>
                )}
                {baseLvl >= 1 && (
                  <div className="inline-flex items-center rounded border border-fuchsia-500/50 bg-fuchsia-950 overflow-hidden text-[10px] font-mono font-bold">
                    {canDecrementSlot && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActionUpcastLevel(baseSpell, expendedSlot - 1);
                        }}
                        className="px-1.5 py-0.5 bg-zinc-950/70 hover:bg-zinc-800 text-fuchsia-200 hover:text-white cursor-pointer transition-colors"
                        title={`Decrease Slot Level (Currently casts at ${formatSpellLevelLabel(currentSlot)} Level, uses ${formatSpellLevelLabel(expendedSlot)} Slot)`}
                      >
                        −
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActionUpcastLevel(baseSpell, !canIncrementSlot ? baseLvl : expendedSlot + 1);
                      }}
                      className="px-1.5 py-0.5 text-fuchsia-300 hover:text-white cursor-pointer transition-colors"
                      title="Click to cycle Spell Slot Level"
                    >
                      {isUpcasted
                        ? currentSlot > expendedSlot
                          ? `▲ Casts ${formatSpellLevelLabel(currentSlot)} (${formatSpellLevelLabel(expendedSlot)} Slot)`
                          : `▲ Upcast: ${formatSpellLevelLabel(currentSlot)} Slot`
                        : `▲ Upcast Slot`}
                    </button>
                    {canIncrementSlot && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActionUpcastLevel(baseSpell, expendedSlot + 1);
                        }}
                        className="px-1.5 py-0.5 bg-zinc-950/70 hover:bg-fuchsia-800/80 text-fuchsia-200 hover:text-white border-l border-fuchsia-500/30 cursor-pointer transition-colors"
                        title={`Upcast to ${formatSpellLevelLabel(Math.min(9, currentSlot + 1))} Level (Uses ${formatSpellLevelLabel(expendedSlot + 1)} Level Slot)`}
                      >
                        +
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-300 flex-wrap">
                {detailAction.castingTime && (
                  <span className="text-amber-300 font-semibold">{detailAction.castingTime}</span>
                )}
                {detailAction.rangeFt !== undefined && (
                  <span>• {detailAction.rangeFt > 0 ? `${detailAction.rangeFt} ft.` : 'Self'}</span>
                )}
                {detailAction.hitBonus !== undefined && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRollToHit(detailAction);
                    }}
                    className="px-2 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/50 hover:border-emerald-400 text-emerald-300 hover:text-white font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
                    title={`Click to Roll to Hit: 1d20 ${String(detailAction.hitBonus).startsWith('+') || String(detailAction.hitBonus).startsWith('-') ? detailAction.hitBonus : `+${detailAction.hitBonus}`}`}
                  >
                    To Hit: {String(detailAction.hitBonus).startsWith('+') || String(detailAction.hitBonus).startsWith('-') ? detailAction.hitBonus : `+${detailAction.hitBonus}`}
                  </button>
                )}
                {detailAction.saveDc && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-950 border border-amber-500/50 text-amber-300 font-bold">
                    Save: DC {detailAction.saveDc} {detailAction.saveAbility || ''}
                  </span>
                )}
                {detailAction.damageFormula && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRollDamage(detailAction);
                    }}
                    className={`px-2 py-0.5 rounded font-bold border transition-all cursor-pointer active:scale-95 shadow-sm ${
                      isUpcasted
                        ? 'bg-fuchsia-950 hover:bg-fuchsia-900 border-fuchsia-400/70 hover:border-fuchsia-300 text-fuchsia-200 hover:text-white shadow-[0_0_10px_rgba(217,70,239,0.35)]'
                        : detailAction.isHeal
                        ? 'bg-emerald-950 hover:bg-emerald-900 border-emerald-500/50 hover:border-emerald-400 text-emerald-300 hover:text-white'
                        : 'bg-rose-950 hover:bg-rose-900 border-rose-500/50 hover:border-rose-400 text-rose-300 hover:text-white'
                    }`}
                    title={`Click to Roll Dice: ${detailAction.damageFormula} ${detailAction.damageType || ''}`}
                  >
                    {detailAction.damageFormula} {detailAction.damageType || ''}
                  </button>
                )}
                {detailAction.uses && (
                  <span className="px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-500/50 text-indigo-300 font-bold">
                    Uses: {detailAction.uses.available}/{detailAction.uses.total}{detailAction.uses.resetType ? ` • ${detailAction.uses.resetType}` : ''}
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
                setPinnedAction(null);
                onClearInspectedAura?.();
              }}
              className="absolute top-2.5 right-2.5 p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Close Description (Escape)"
              aria-label="Close Description"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {detailAction.notes && (
              <div className="text-[10px] font-mono text-amber-400/90 mt-1">
                Properties & Mastery: {detailAction.notes}
              </div>
            )}
            <div className={`text-[11px] text-zinc-300 mt-1.5 font-sans leading-relaxed ${pinnedAction ? 'max-h-36 overflow-y-auto pr-1 sidebar-scrollbar' : 'line-clamp-3'}`}>
              {detailAction.description}
            </div>
            {detailAction.atHigherLevels && (
              <div className="text-[10px] font-sans text-fuchsia-300/90 mt-1 line-clamp-2">
                <strong className="font-mono uppercase text-fuchsia-400">At Higher Levels: </strong>
                {detailAction.atHigherLevels}
              </div>
            )}
          </div>
        );
      })()}

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
              <span
                className={`px-1 py-0.2 rounded text-[8px] font-mono font-bold shrink-0 border ${
                  isDdbSyncEnabled
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                }`}
              >
                {isDdbSyncEnabled ? 'DDB ON' : 'DDB OFF'}
              </span>
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
            {(Boolean(activeWildShape) ||
              characterData?.canWildShape ||
              characterData?.name?.toLowerCase().includes("g'aiah") ||
              characterData?.name?.toLowerCase().includes("gaiah") ||
              characterData?.name?.toLowerCase().includes("g’aiah") ||
              claimedToken?.name?.toLowerCase().includes("g'aiah") ||
              claimedToken?.name?.toLowerCase().includes("gaiah") ||
              claimedToken?.name?.toLowerCase().includes("g’aiah") ||
              characterData?.classLevel?.toLowerCase().includes("druid")) && onOpenWildShape && (
              <button
                type="button"
                onClick={() => {
                  setIsHoveringWildShapeBtn(false);
                  if (activeWildShape && onRevertWildShape) {
                    onRevertWildShape();
                  } else {
                    onOpenWildShape();
                  }
                }}
                onMouseEnter={() => setIsHoveringWildShapeBtn(true)}
                onMouseLeave={() => setIsHoveringWildShapeBtn(false)}
                className={`px-2.5 py-2 rounded-lg font-mono text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                  activeWildShape
                    ? isHoveringWildShapeBtn
                      ? 'bg-rose-500/25 border-rose-400 text-rose-200'
                      : 'bg-amber-500/20 border-amber-400 text-amber-200 animate-pulse'
                    : 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                }`}
                title={activeWildShape ? 'Transform back' : 'Wild Shape'}
              >
                <PawPrint className="w-3.5 h-3.5" />
                <span>
                  {activeWildShape
                    ? isHoveringWildShapeBtn
                      ? 'Transform back'
                      : activeWildShape.beastName
                    : 'Wild Shape'}
                </span>
              </button>
            )}

            {onToggleDdbSync && (
              <button
                type="button"
                onClick={() => onToggleDdbSync(!isDdbSyncEnabled)}
                className={`px-2 py-1.5 rounded-lg font-mono text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  isDdbSyncEnabled
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                }`}
                title={isDdbSyncEnabled ? 'D&D Beyond Sync is ON (Click to turn OFF)' : 'D&D Beyond Sync is OFF (Click to turn ON)'}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isDdbSyncEnabled ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-zinc-600'
                  }`}
                />
                <span>DDB</span>
              </button>
            )}

            {isDdbSyncEnabled && onRefreshDdb && (
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
                className={`px-3 py-2 rounded-lg font-mono text-[11px] font-bold cursor-pointer transition-all active:scale-95 ${
                  isMyTurn
                    ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 animate-pulse'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                }`}
                title={isMyTurn ? "Your Turn: Click to Pass Turn" : "Pass Turn"}
              >
                Pass Turn
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
              {onToggleDdbSync && (
                <button
                  type="button"
                  onClick={() => onToggleDdbSync(!isDdbSyncEnabled)}
                  className={`px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 text-[10px] font-mono font-bold ${
                    isDdbSyncEnabled
                      ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                  }`}
                  title={isDdbSyncEnabled ? 'D&D Beyond Sync is ON (Tap to turn OFF)' : 'D&D Beyond Sync is OFF (Tap to turn ON)'}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isDdbSyncEnabled ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-zinc-600'
                    }`}
                  />
                  <span>DDB Sync: {isDdbSyncEnabled ? 'ON' : 'OFF'}</span>
                </button>
              )}
              {isDdbSyncEnabled && onRefreshDdb && (
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
          <div className="grid grid-cols-7 gap-1 py-2 shrink-0">
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
            {currentCategoryList.map((rawAction, idx) => {
              const action = getEffectiveAction(rawAction);
              const baseLevel = rawAction.level ?? 0;
              const expendedSlot = action.spellSlotRequired ?? baseLevel;
              const currentSlot = action.castAtLevel ?? baseLevel;
              const isUpcasted = baseLevel >= 1 && currentSlot > baseLevel;
              const canDecrementSlot = baseLevel >= 1 && expendedSlot > baseLevel;
              const canIncrementSlot = baseLevel >= 1 && expendedSlot < 9 && currentSlot < 9;
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
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setInspectedAction(action);
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
                      : isUpcasted
                      ? 'border-fuchsia-500/50 bg-fuchsia-950/20 hover:bg-zinc-850'
                      : 'border-zinc-800 bg-zinc-900/70 hover:bg-zinc-850'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner">
                      {renderActionGlyph(action, 'w-4 h-4')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-white font-mono truncate">{action.name}</span>
                        {rawAction.level !== undefined && (
                          rawAction.level === 0 ? (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-950 border border-blue-500/40 text-blue-300 font-bold shrink-0">
                              Cantrip
                            </span>
                          ) : (
                            <div
                              className="inline-flex items-center rounded bg-zinc-950 border border-blue-500/40 overflow-hidden shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {canDecrementSlot && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionUpcastLevel(rawAction, expendedSlot - 1);
                                  }}
                                  className="px-1 py-0.2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-[9px] font-mono font-bold cursor-pointer"
                                  title="Decrease Spell Slot Level"
                                >
                                  −
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionUpcastLevel(rawAction, !canIncrementSlot ? baseLevel : expendedSlot + 1);
                                }}
                                className={`px-1.5 py-0.2 text-[9px] font-mono font-bold cursor-pointer ${
                                  isUpcasted
                                    ? 'bg-fuchsia-950 text-fuchsia-200'
                                    : 'bg-blue-950 text-blue-300 hover:text-white'
                                }`}
                                title="Tap to Upcast at a Higher Spell Slot Level"
                              >
                                {isUpcasted
                                  ? currentSlot > expendedSlot
                                    ? `▲ ${formatSpellLevelLabel(currentSlot)} (${formatSpellLevelLabel(expendedSlot)} Slot)`
                                    : `▲ ${formatSpellLevelLabel(currentSlot)} Slot`
                                  : `${formatSpellLevelLabel(baseLevel)} ▲`}
                              </button>
                            </div>
                          )
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
                          isUpcasted
                            ? 'bg-fuchsia-950/90 hover:bg-fuchsia-900 border-fuchsia-400/60 text-fuchsia-200'
                            : action.isHeal
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
        <div className="relative hidden md:flex pointer-events-auto flex-col w-full max-w-5xl rounded-2xl bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 shadow-[0_12px_40px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Top Crimson/Amber D&D Beyond Accent Trim */}
        <div className="h-0.5 w-full bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />

        {/* Top-Right Corner Minimize / Expand Button */}
        <button
          type="button"
          onClick={() => setIsTrayCollapsed(prev => !prev)}
          className={`absolute top-2.5 right-3 z-20 p-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
            isTrayCollapsed
              ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/50 px-2.5 shadow-sm shadow-amber-500/10'
              : 'bg-zinc-950/90 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700'
          }`}
          title={isTrayCollapsed ? 'Expand Character Action Sheet' : 'Minimize Character Action Sheet'}
          aria-label={isTrayCollapsed ? 'Expand Character Action Sheet' : 'Minimize Character Action Sheet'}
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

        {/* 1. HEADER BAR: CHARACTER IDENTITY, DDB STAT BLOCKS, SEARCH & CONTROLS */}
        <div className={`flex items-center justify-between gap-3 px-4 py-2.5 ${isTrayCollapsed ? 'pr-28' : 'pr-14'} bg-zinc-900/70 border-b border-zinc-800/90 flex-wrap`}>
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
                <button
                  type="button"
                  onClick={() => onToggleDdbSync && onToggleDdbSync(!isDdbSyncEnabled)}
                  className={`px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold tracking-wide shrink-0 flex items-center gap-1 transition-all cursor-pointer ${
                    isDdbSyncEnabled
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30'
                      : 'bg-zinc-800/90 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                  title={
                    isDdbSyncEnabled
                      ? 'D&D Beyond Character Sheet Sync is ON (Click to toggle OFF)'
                      : 'D&D Beyond Character Sheet Sync is OFF — using local VTT sheet (Click to toggle ON)'
                  }
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isDdbSyncEnabled ? 'bg-emerald-400 shadow-[0_0_5px_#34d399]' : 'bg-zinc-500'
                    }`}
                  />
                  <span>{isDdbSyncEnabled ? 'DDB SYNC: ON' : 'DDB SYNC: OFF'}</span>
                </button>
                {isDdbSyncEnabled && isCharacterPrivate && (
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

            {onToggleDdbSync && (
              <button
                type="button"
                onClick={() => onToggleDdbSync(!isDdbSyncEnabled)}
                role="switch"
                aria-checked={isDdbSyncEnabled}
                className={`px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2 text-[11px] font-mono font-bold ${
                  isDdbSyncEnabled
                    ? 'bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border-emerald-500/50 shadow-sm'
                    : 'bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 border-zinc-800'
                }`}
                title={
                  isDdbSyncEnabled
                    ? 'D&D Beyond Character Sheet Sync is ON (Click to turn OFF)'
                    : 'D&D Beyond Character Sheet Sync is OFF (Click to turn ON)'
                }
              >
                <div
                  className={`w-6 h-3.5 rounded-full p-0.5 transition-colors flex items-center ${
                    isDdbSyncEnabled ? 'bg-emerald-500 justify-end' : 'bg-zinc-700 justify-start'
                  }`}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-white shadow-xs" />
                </div>
                <span className="hidden lg:inline">
                  DDB Sync: {isDdbSyncEnabled ? 'ON' : 'OFF'}
                </span>
              </button>
            )}

            {isDdbSyncEnabled && onRefreshDdb && (
              <button
                type="button"
                onClick={onRefreshDdb}
                className="p-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-emerald-400 hover:text-emerald-300 border border-zinc-800 transition-colors cursor-pointer flex items-center justify-center"
                title="Pull latest Attacks, Actions, Bonus Actions & Spells from D&D Beyond now"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDdb ? 'animate-spin' : ''}`} />
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

            {/* Wild Shape Button (Visible for Druids like G'aiah) */}
            {(Boolean(activeWildShape) ||
              characterData?.canWildShape ||
              characterData?.name?.toLowerCase().includes("g'aiah") ||
              characterData?.name?.toLowerCase().includes("gaiah") ||
              characterData?.name?.toLowerCase().includes("g’aiah") ||
              claimedToken?.name?.toLowerCase().includes("g'aiah") ||
              claimedToken?.name?.toLowerCase().includes("gaiah") ||
              claimedToken?.name?.toLowerCase().includes("g’aiah") ||
              characterData?.classLevel?.toLowerCase().includes("druid")) && onOpenWildShape && (
              <button
                type="button"
                onClick={() => {
                  setIsHoveringWildShapeBtn(false);
                  if (activeWildShape && onRevertWildShape) {
                    onRevertWildShape();
                  } else {
                    onOpenWildShape();
                  }
                }}
                onMouseEnter={() => setIsHoveringWildShapeBtn(true)}
                onMouseLeave={() => setIsHoveringWildShapeBtn(false)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  activeWildShape
                    ? isHoveringWildShapeBtn
                      ? 'bg-rose-500/25 border-rose-400 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.35)]'
                      : 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse'
                    : 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/60 text-emerald-300 hover:text-white shadow-sm'
                }`}
                title={
                  activeWildShape
                    ? 'Transform back'
                    : 'Wild Shape (Bonus Action): Transform into a CR <= 2 Beast Form (Circle of the Moon)'
                }
              >
                <PawPrint className="w-3.5 h-3.5" />
                <span>
                  {activeWildShape
                    ? isHoveringWildShapeBtn
                      ? 'Transform back'
                      : activeWildShape.beastName
                    : 'Wild Shape'}
                </span>
              </button>
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
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                  isMyTurn
                    ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/30 animate-pulse'
                    : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                }`}
                title={isMyTurn ? "Your Turn: Click to Pass Turn" : "Pass Turn"}
              >
                Pass Turn
              </button>
            )}


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
                {/* Book of Exalted Deeds badge if character possesses Enlightened Magic */}
                {(characterData?.hasBookOfExaltedDeeds || characterData?.name?.toLowerCase().includes('stavros')) && (
                  <div
                    className="ml-auto px-2 py-0.5 rounded-md border border-amber-500/50 bg-amber-500/10 text-amber-300 font-mono text-[10px] font-bold flex items-center gap-1 shrink-0"
                    title="Book of Exalted Deeds (Enlightened Magic): Any spell slot expended counts as 1 level higher."
                  >
                    <span>✦ Enlightened Magic (+1 Spell Level)</span>
                  </div>
                )}
                {typeof selectedSpellLevel === 'number' && selectedSpellLevel >= 2 && (
                  <button
                    type="button"
                    onClick={() => setIncludeUpcastInFilter(prev => !prev)}
                    className={`ml-auto px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                      includeUpcastInFilter
                        ? 'bg-fuchsia-500/25 border-fuchsia-400 text-fuchsia-200 shadow-[0_0_8px_rgba(217,70,239,0.3)]'
                        : 'bg-zinc-900/70 border-zinc-800 text-zinc-400 hover:text-fuchsia-300 hover:border-fuchsia-500/50'
                    }`}
                    title={`Include lower-level spells upcasted to ${formatSpellLevelLabel(selectedSpellLevel)} Level Slot`}
                  >
                    <span>▲ Show Upcastable at {formatSpellLevelLabel(selectedSpellLevel)}</span>
                  </button>
                )}
              </div>
            )}

            {/* D&D Beyond Tactical Action Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 max-h-[185px] overflow-y-auto pr-1 sidebar-scrollbar">
              {currentCategoryList.map((rawAction, idx) => {
                const action = getEffectiveAction(rawAction);
                const baseLevel = rawAction.level ?? 0;
                const expendedSlot = action.spellSlotRequired ?? baseLevel;
                const currentSlot = action.castAtLevel ?? baseLevel;
                const isUpcasted = baseLevel >= 1 && currentSlot > baseLevel;
                const canDecrementSlot = baseLevel >= 1 && expendedSlot > baseLevel;
                const canIncrementSlot = baseLevel >= 1 && expendedSlot < 9 && currentSlot < 9;
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
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setInspectedAction(action);
                    }}
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
                        : isUpcasted
                        ? 'border-fuchsia-500/60 bg-fuchsia-950/20 hover:bg-zinc-900 shadow-[0_0_10px_rgba(217,70,239,0.18)]'
                        : 'border-zinc-800/90 hover:border-amber-500/50 bg-zinc-900/75 hover:bg-zinc-900'
                    }`}
                  >
                    {/* Left: Action Icon + Name + Upcast Stepper + Range/Source Subtitle */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-lg bg-zinc-950 border border-zinc-800 group-hover:border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner">
                        {renderActionGlyph(action, 'w-4 h-4')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-zinc-100 group-hover:text-amber-200 font-mono truncate">
                            {action.name}
                          </span>
                          {rawAction.level !== undefined && (
                            rawAction.level === 0 ? (
                              <span className="px-1.5 py-0.2 rounded bg-blue-950/90 border border-blue-500/40 text-blue-300 font-mono text-[9px] font-bold shrink-0">
                                Cantrip
                              </span>
                            ) : (
                              <div
                                className={`inline-flex items-center rounded border overflow-hidden shrink-0 transition-all ${
                                  isUpcasted
                                    ? 'border-fuchsia-400/70 bg-fuchsia-950/90 shadow-[0_0_8px_rgba(217,70,239,0.35)]'
                                    : 'border-blue-500/40 bg-blue-950/90'
                                }`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {canDecrementSlot && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActionUpcastLevel(rawAction, expendedSlot - 1);
                                    }}
                                    className="px-1 py-0.2 bg-zinc-950/80 hover:bg-zinc-800 text-fuchsia-200 hover:text-white font-mono text-[9px] font-bold cursor-pointer transition-colors"
                                    title={`Decrease Spell Slot Level (Currently casts at ${formatSpellLevelLabel(currentSlot)} Level, uses ${formatSpellLevelLabel(expendedSlot)} Slot)`}
                                  >
                                    −
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionUpcastLevel(rawAction, !canIncrementSlot ? baseLevel : expendedSlot + 1);
                                  }}
                                  className={`px-1.5 py-0.2 font-mono text-[9px] font-bold cursor-pointer transition-colors ${
                                    isUpcasted
                                      ? 'text-fuchsia-200 hover:text-white'
                                      : 'text-blue-300 hover:text-white'
                                  }`}
                                  title={`Click to Upcast ${rawAction.name} at a higher Spell Slot Level (Base: ${formatSpellLevelLabel(baseLevel)} Level, currently casts as ${formatSpellLevelLabel(currentSlot)} using ${formatSpellLevelLabel(expendedSlot)} Slot)`}
                                >
                                  {isUpcasted
                                    ? currentSlot > expendedSlot
                                      ? `▲ ${formatSpellLevelLabel(currentSlot)} (${formatSpellLevelLabel(expendedSlot)} Slot)`
                                      : `▲ ${formatSpellLevelLabel(currentSlot)} Slot`
                                    : `${formatSpellLevelLabel(baseLevel)} ▲`}
                                </button>
                                {canIncrementSlot && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActionUpcastLevel(rawAction, expendedSlot + 1);
                                    }}
                                    className="px-1 py-0.2 bg-zinc-950/60 hover:bg-fuchsia-800/80 text-blue-200 hover:text-white font-mono text-[9px] font-bold cursor-pointer transition-colors border-l border-white/10"
                                    title={`Upcast to ${formatSpellLevelLabel(Math.min(9, currentSlot + 1))} Level (Uses ${formatSpellLevelLabel(expendedSlot + 1)} Level Slot)`}
                                  >
                                    +
                                  </button>
                                )}
                              </div>
                            )
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 truncate mt-0.5">
                          <span>{action.sourceLabel || action.castingTime || '1 Action'}</span>
                          {action.sourceLabel && action.castingTime && action.sourceLabel !== action.castingTime && (
                            <>
                              <span>•</span>
                              <span className="text-amber-300/90">{action.castingTime}</span>
                            </>
                          )}
                          {action.rangeFt !== undefined && (
                            <>
                              <span>•</span>
                              <span>{action.rangeFt > 0 ? `${action.rangeFt} ft.` : 'Self'}</span>
                            </>
                          )}
                          {action.notes && (
                            <>
                              <span>•</span>
                              <span className={`${isUpcasted ? 'text-fuchsia-300 font-semibold' : 'text-amber-400/80'} truncate`}>
                                {action.notes}
                              </span>
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
                            isUpcasted
                              ? 'bg-fuchsia-950/90 hover:bg-fuchsia-900 border-fuchsia-400/70 hover:border-fuchsia-300 text-fuchsia-200 hover:text-white shadow-sm hover:shadow-[0_0_12px_rgba(217,70,239,0.5)]'
                              : action.isHeal
                              ? 'bg-emerald-950/90 hover:bg-emerald-900 border-emerald-500/40 hover:border-emerald-400 text-emerald-300 hover:text-white shadow-sm hover:shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                              : 'bg-rose-950/90 hover:bg-rose-900 border-rose-500/40 hover:border-rose-400 text-rose-300 hover:text-white shadow-sm hover:shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                          }`}
                          title={`Cast & Fire: ${action.name}${isUpcasted ? ` at ${formatSpellLevelLabel(currentSlot)} Level` : ''} (${action.damageFormula})`}
                          aria-label={`Fire ${action.name}: ${action.damageFormula}`}
                        >
                          <span className="text-[8px] uppercase opacity-75 leading-none truncate max-w-[56px]">
                            {isUpcasted
                              ? `▲ ${formatSpellLevelLabel(currentSlot)}`
                              : action.damageType || (action.isHeal ? 'Heal' : 'Dmg')}
                          </span>
                          <span className="font-bold text-xs leading-tight">
                            {action.damageFormula.replace(/\s+/g, '')}
                          </span>
                        </button>
                      )}

                      {action.isHaloToggle && (
                        <div
                          className={`flex flex-col items-center px-2 py-1 rounded-lg border font-bold transition-all shrink-0 ${
                            claimedToken?.haloActive
                              ? 'bg-amber-400/25 border-amber-300 text-amber-100 shadow-[0_0_12px_rgba(251,191,36,0.55)]'
                              : 'bg-zinc-950 border-amber-500/40 text-amber-300 group-hover:border-amber-400'
                          }`}
                        >
                          <span className="text-[8px] uppercase leading-none opacity-80">Glow</span>
                          <span className="text-xs leading-tight">{claimedToken?.haloActive ? '😇 ON' : '✨ OFF'}</span>
                        </div>
                      )}

                      {action.uses && (
                        <div
                          className="flex flex-col items-center px-2 py-1 rounded-lg bg-indigo-950/90 border border-indigo-500/40 text-indigo-300"
                          title={action.uses.resetType ? `Uses: ${action.uses.available}/${action.uses.total} (${action.uses.resetType})` : `Uses: ${action.uses.available}/${action.uses.total}`}
                        >
                          <span className="text-[8px] uppercase text-indigo-400/80 leading-none">
                            {action.uses.resetType ? action.uses.resetType.replace(' Rest', '') : 'Uses'}
                          </span>
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

      {/* ========================================================================= */}
      {/* FULL D&D BEYOND INSPECTION MODAL (Right-Click Spell / Attack / Action)    */}
      {/* ========================================================================= */}
      {inspectedAction && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150 pointer-events-auto"
          onClick={() => setInspectedAction(null)}
        >
          <div
            style={{ transform: `translate3d(${modalDragOffset.x}px, ${modalDragOffset.y}px, 0)` }}
            className="relative w-full max-w-xl max-h-[85vh] bg-zinc-950/98 border border-zinc-700/80 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden text-left ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header (Click and drag to move) */}
            <div
              onPointerDown={handleStartModalDrag}
              title="Click and drag to move"
              className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-900/60 flex items-start justify-between gap-3 shrink-0 cursor-move touch-none select-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-zinc-950 border border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                  {renderActionGlyph(inspectedAction, 'w-6 h-6')}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-bold text-white font-mono truncate">
                      {inspectedAction.name}
                    </h3>
                    <GripHorizontal className="w-4 h-4 text-zinc-500 shrink-0" />
                    {inspectedAction.level !== undefined && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-950 border border-blue-500/50 text-blue-300 font-mono text-[10px] font-bold">
                        {inspectedAction.level === 0 ? 'Cantrip' : `${formatSpellLevelLabel(inspectedAction.level)} Level`}
                      </span>
                    )}
                    {inspectedAction.castAtLevel && inspectedAction.castAtLevel > (inspectedAction.level ?? 0) && (
                      <span className="px-2 py-0.5 rounded-full bg-fuchsia-950 border border-fuchsia-500/60 text-fuchsia-300 font-mono text-[10px] font-bold">
                        ▲ Upcast: {formatSpellLevelLabel(inspectedAction.castAtLevel)} Slot
                      </span>
                    )}
                    {inspectedAction.school && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-950 border border-purple-500/50 text-purple-300 font-mono text-[10px] uppercase font-bold">
                        {inspectedAction.school}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-mono text-zinc-400 mt-0.5">
                    {inspectedAction.sourceLabel || (inspectedAction.category === 'spells' ? 'D&D Beyond Spell' : 'Action')}
                  </div>
                </div>
              </div>

              {/* Close Button X */}
              <button
                type="button"
                onClick={() => setInspectedAction(null)}
                className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700/80 transition-colors cursor-pointer shrink-0"
                title="Close (Escape)"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 sm:p-4 bg-zinc-900/30 border-b border-zinc-800/80 text-[11px] font-mono shrink-0">
              <div className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800">
                <div className="text-zinc-500 text-[10px] uppercase font-bold">Casting Time</div>
                <div className="text-amber-300 font-bold mt-0.5">{inspectedAction.castingTime || '1 Action'}</div>
              </div>
              <div className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800">
                <div className="text-zinc-500 text-[10px] uppercase font-bold">Range / Area</div>
                <div className="text-zinc-200 font-bold mt-0.5">
                  {inspectedAction.rangeFt !== undefined ? (inspectedAction.rangeFt > 0 ? `${inspectedAction.rangeFt} ft.` : 'Self') : 'Self / Touch'}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800">
                <div className="text-zinc-500 text-[10px] uppercase font-bold">Components</div>
                <div className="text-zinc-200 font-bold mt-0.5 truncate" title={inspectedAction.components || 'V, S'}>
                  {inspectedAction.components || 'V, S'}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800">
                <div className="text-zinc-500 text-[10px] uppercase font-bold">Duration</div>
                <div className="text-zinc-200 font-bold mt-0.5 truncate" title={inspectedAction.duration || 'Instantaneous'}>
                  {inspectedAction.duration || 'Instantaneous'}
                </div>
              </div>
            </div>

            {/* Attack / Damage / Save Badges Bar */}
            {(inspectedAction.hitBonus !== undefined || inspectedAction.saveDc || inspectedAction.damageFormula || inspectedAction.uses) && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900/20 border-b border-zinc-800/60 flex-wrap text-xs font-mono shrink-0">
                {inspectedAction.hitBonus !== undefined && (
                  <button
                    type="button"
                    onClick={() => {
                      handleRollToHit(inspectedAction);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 hover:text-white font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
                    title="Roll To Hit"
                  >
                    Attack: {String(inspectedAction.hitBonus).startsWith('+') || String(inspectedAction.hitBonus).startsWith('-') ? inspectedAction.hitBonus : `+${inspectedAction.hitBonus}`} to Hit
                  </button>
                )}
                {inspectedAction.saveDc && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-950 border border-amber-500/50 text-amber-300 font-bold">
                    Save DC {inspectedAction.saveDc} {inspectedAction.saveAbility || ''}
                  </span>
                )}
                {inspectedAction.damageFormula && (
                  <button
                    type="button"
                    onClick={() => {
                      handleRollDamage(inspectedAction);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer active:scale-95 shadow-sm ${
                      inspectedAction.castAtLevel && inspectedAction.castAtLevel > (inspectedAction.level ?? 0)
                        ? 'bg-fuchsia-950 hover:bg-fuchsia-900 border-fuchsia-400/60 hover:border-fuchsia-300 text-fuchsia-200 hover:text-white shadow-[0_0_10px_rgba(217,70,239,0.3)]'
                        : inspectedAction.isHeal
                        ? 'bg-emerald-950 hover:bg-emerald-900 border-emerald-500/50 hover:border-emerald-400 text-emerald-300 hover:text-white'
                        : 'bg-rose-950 hover:bg-rose-900 border-rose-500/50 hover:border-rose-400 text-rose-300 hover:text-white'
                    }`}
                    title={`Click to Roll Dice: ${inspectedAction.damageFormula} ${inspectedAction.damageType || ''}`}
                  >
                    {inspectedAction.isHeal ? 'Heal' : 'Damage'}: {inspectedAction.damageFormula} {inspectedAction.damageType || ''}
                  </button>
                )}
                {inspectedAction.uses && (
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-950 border border-indigo-500/50 text-indigo-300 font-bold">
                    Uses: {inspectedAction.uses.available}/{inspectedAction.uses.total} ({inspectedAction.uses.resetType || 'Rest'})
                  </span>
                )}
              </div>
            )}

            {/* Interactive Upcast Slot Level Selector (for Leveled Spells) */}
            {(inspectedAction.level ?? 0) >= 1 && (
              <div className="px-4 py-3 bg-fuchsia-950/15 border-b border-zinc-800/80 shrink-0">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-fuchsia-300">
                    ▲ Cast at Higher Spell Slot Level (Upcast)
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    Base: {formatSpellLevelLabel(inspectedAction.level!)} Level
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {Array.from({ length: 9 - (inspectedAction.level ?? 1) + 1 }, (_, i) => (inspectedAction.level ?? 1) + i).map(slotLvl => {
                    const baseSpell =
                      spellsList.find(
                        s => s.id === inspectedAction.id || s.name.trim().toLowerCase() === inspectedAction.name.trim().toLowerCase()
                      ) || inspectedAction;
                    const activeSlot = inspectedAction.spellSlotRequired ?? inspectedAction.castAtLevel ?? inspectedAction.level ?? 1;
                    const isSelected = activeSlot === slotLvl;
                    const preview = buildActionAtSlotLevel(baseSpell, slotLvl);
                    const effectiveCastLvl = preview.castAtLevel ?? slotLvl;
                    const isUpcast = effectiveCastLvl > (baseSpell.level ?? 1);
                    const upcastOpt = baseSpell.upcastOptions?.find(o => o.slotLevel === effectiveCastLvl);
                    const slotInfo = characterData?.spellSlots?.[slotLvl];
                    return (
                      <button
                        key={slotLvl}
                        type="button"
                        onClick={() => setActionUpcastLevel(baseSpell, slotLvl)}
                        className={`p-1.5 rounded-lg border text-left font-mono transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? isUpcast
                              ? 'bg-fuchsia-500/25 border-fuchsia-400 text-fuchsia-100 shadow-[0_0_10px_rgba(217,70,239,0.3)]'
                              : 'bg-blue-500/25 border-blue-400 text-blue-100'
                            : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 text-[10px] font-bold">
                          <span>
                            {effectiveCastLvl > slotLvl
                              ? `Lv ${effectiveCastLvl} (${formatSpellLevelLabel(slotLvl)} Slot)`
                              : `${formatSpellLevelLabel(slotLvl)} Slot`}
                          </span>
                          {slotInfo && (
                            <span className="text-[9px] text-blue-300 opacity-80">
                              {slotInfo.available}/{slotInfo.total}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-bold mt-0.5 truncate text-amber-300">
                          {preview.damageFormula || upcastOpt?.bonusEffect || (isUpcast ? `+${effectiveCastLvl - (baseSpell.level ?? 1)} Level` : 'Base Effect')}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Scrollable Description Body (Markdown / D&D Beyond formatting) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 sidebar-scrollbar text-sm leading-relaxed text-zinc-300 font-sans">
              {inspectedAction.notes && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs">
                  <span className="font-bold uppercase tracking-wider">Properties & Notes: </span>
                  {inspectedAction.notes}
                </div>
              )}

              <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-p:leading-relaxed prose-strong:text-amber-300 prose-ul:my-2 prose-li:my-0.5">
                <ReactMarkdown>
                  {inspectedAction.description || 'No description available for this spell or attack.'}
                </ReactMarkdown>
              </div>

              {inspectedAction.atHigherLevels && (
                <div className="mt-3 p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs">
                  <div className="font-bold text-blue-300 font-mono uppercase mb-1">At Higher Levels</div>
                  <p className="text-zinc-300 font-sans leading-relaxed">{inspectedAction.atHigherLevels}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between gap-2 shrink-0">
              <span className="text-[11px] font-mono text-zinc-500">
                Right-click any HUD action anytime to inspect.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onSelectAction(inspectedAction);
                    setInspectedAction(null);
                  }}
                  className={`px-4 py-1.5 rounded-xl font-bold text-xs font-mono transition-all shadow-md active:scale-95 cursor-pointer ${
                    inspectedAction.castAtLevel && inspectedAction.castAtLevel > (inspectedAction.level ?? 0)
                      ? 'bg-fuchsia-500 hover:bg-fuchsia-400 text-zinc-950 shadow-fuchsia-500/30'
                      : 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                  }`}
                >
                  {inspectedAction.castAtLevel && inspectedAction.castAtLevel > (inspectedAction.level ?? 0)
                    ? `Cast at ${formatSpellLevelLabel(inspectedAction.castAtLevel)} Level${inspectedAction.damageFormula ? ` (${inspectedAction.damageFormula})` : ''}`
                    : 'Cast / Target'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
