import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Stage, Layer, Image as KonvaImage, Group, Circle, Rect, Text, Line } from 'react-konva';
import useImage from 'use-image';
import {
  Swords,
  Shield,
  Users,
  Bot,
  Dices,
  Sparkles,
  Play,
  RotateCcw,
  LogOut,
  Trophy,
  Skull,
  Heart,
  Zap,
  Plus,
  Trash2,
  Check,
  ChevronRight,
  Shuffle,
  Footprints,
  Radio,
  Flame,
  Crown,
  Target,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ScrollText
} from 'lucide-react';
import { toast } from 'sonner';
import { Character } from '../types/character';
import { Monster } from '../types/monster';
import { DEFAULT_CHARACTERS, getCharacterTokenUrl, isDdbMatch } from '../data/defaultCharacters';
import { DEFAULT_MONSTERS } from '../data/defaultMonsters';
import { PRESET_BATTLEMAPS, PresetBattlemap } from '../data/presetBattlemaps';
import { HudCharacterData, HudActionItem, computeUpcastFormula } from '../types/hud';
import { PlayerHeroDock } from './PlayerHeroDock';
import { GridLayer } from './GridLayer';
import { buildDmMonsterHudData } from '../services/monsterHudService';
import { lookupDndRuleDetails, DndRuleEntry } from '../data/dndRulesCompendium';
import { DndRuleInspectionModal } from './DndRuleInspectionModal';
import { canTokenHaveHalo } from '../effects/db/tokenFxMap';
import { computeTacticalAiTurnPlan, classifyCombatantRole } from '../services/arenaTacticalAi';
import {
  YukaArenaMonsterBrain,
  roll5eRechargeCheck,
  checkThreatenedInMelee,
  ArenaLineOfSightEngine
} from '../services/ai';
import {
  VttEffectInstance,
  DomEffectOverlay,
  findJb2aAsset,
  soundCatalog
} from '../effects';
import {
  computeFlightLiftMetrics,
  TokenGroundFootprint,
  TokenAerialOverlay,
  useTokenFlightAnimation
} from './TokenFlightElevation';

export type ArenaMatchMode = '1v1' | '2v2' | 'vs_npcs' | 'random_encounter';
export type ArenaDifficulty = 'standard' | 'hard' | 'deadly';

export interface ArenaCombatant {
  id: string;
  name: string;
  team: 'gold' | 'crimson'; // 'gold' = Team 1 / Players, 'crimson' = Team 2 / Opponents or NPCs
  isAI: boolean;
  avatarUrl: string;
  raceOrType: string;
  classOrCr: string;
  ac: number;
  currentHp: number;
  maxHp: number;
  tempHp: number;
  speedFt: number;
  remainingMoveFt: number;
  initiativeBonus: number;
  initiativeRoll: number;
  x: number; // world px
  y: number; // world px
  size: number; // grid squares (1 = Medium, 2 = Large, 3 = Huge)
  isFlying?: boolean;
  elevation?: number;
  conditions: string[];
  actionUsed: boolean;
  bonusActionUsed: boolean;
  sourceCharacter?: Character;
  sourceMonster?: Monster;
  ownerPlayerName?: string;
  rechargeStatus?: Record<string, boolean>;
}

export interface ArenaLogEntry {
  id: string;
  round: number;
  actorName: string;
  team: 'gold' | 'crimson';
  message: string;
  detail?: string;
  isCrit?: boolean;
  timestamp: number;
}

export interface ArenaLobbyPlayer {
  clientId: string;
  playerName: string;
  characterId: string;
  characterName: string;
  avatarUrl: string;
  team: 'gold' | 'crimson';
  ready: boolean;
  updatedAt: number;
}

interface PlayerArenaModeProps {
  isOpen: boolean;
  onExitArena: () => void;
  compendiumCharacters: Character[];
  claimedCharacterName?: string;
  socketRef: React.MutableRefObject<any>;
  hasLiveDmMap?: boolean;
  onTrigger3dDice?: (rollEvent: any) => void;
}

const ARENA_GRID_SIZE = 60;
const ARENA_COLS = 22;
const ARENA_ROWS = 14;
const ARENA_WIDTH = ARENA_COLS * ARENA_GRID_SIZE; // 1320
const ARENA_HEIGHT = ARENA_ROWS * ARENA_GRID_SIZE; // 840

/**
 * Parses a dice formula like "2d6 + 4" or "8d6" and rolls it
 */
function rollDiceFormula(formula: string | undefined, isCrit = false): {
  total: number;
  rolls: number[];
  sides: number;
  bonus: number;
  breakdown: string;
} {
  if (!formula) {
    const r = Math.floor(Math.random() * 8) + 1;
    return { total: r + 3, rolls: [r], sides: 8, bonus: 3, breakdown: `[${r}] + 3` };
  }
  const clean = String(formula).trim();
  // Pure flat number (e.g. "70" for Heal)
  if (/^\d+$/.test(clean)) {
    const val = parseInt(clean, 10);
    return { total: val, rolls: [val], sides: 6, bonus: 0, breakdown: `${val}` };
  }

  const regex = /(\d+)d(\d+)/gi;
  let match: RegExpExecArray | null;
  const rolls: number[] = [];
  let primarySides = 6;
  let diceSum = 0;

  while ((match = regex.exec(clean)) !== null) {
    const rawCount = parseInt(match[1], 10) || 1;
    const count = isCrit ? rawCount * 2 : rawCount;
    const sides = parseInt(match[2], 10) || 6;
    primarySides = sides;
    for (let i = 0; i < count; i++) {
      const r = Math.floor(Math.random() * sides) + 1;
      rolls.push(r);
      diceSum += r;
    }
  }

  // Extract flat modifier (e.g., "+ 4" or "- 2")
  const withoutDice = clean.replace(/\d+d\d+/gi, '');
  const modMatch = withoutDice.match(/([+-]\s*\d+)/);
  const bonus = modMatch ? parseInt(modMatch[1].replace(/\s+/g, ''), 10) : 0;

  if (rolls.length === 0) {
    const r = Math.floor(Math.random() * 8) + 1;
    return { total: Math.max(1, r + bonus), rolls: [r], sides: 8, bonus, breakdown: `[${r}]` };
  }

  const total = Math.max(1, diceSum + bonus);
  const signStr = bonus > 0 ? ` + ${bonus}` : bonus < 0 ? ` - ${Math.abs(bonus)}` : '';
  return {
    total,
    rolls,
    sides: primarySides,
    bonus,
    breakdown: `[${rolls.join(', ')}]${signStr}${isCrit ? ' (CRIT 2x DICE!)' : ''}`
  };
}

/**
 * Builds the exact HudCharacterData used by <PlayerHeroDock /> for any Arena Combatant
 */
function buildArenaCombatantHudData(
  combatant: ArenaCombatant,
  liveDdbHud?: HudCharacterData | null
): HudCharacterData {
  const char = combatant.sourceCharacter;
  const mon = combatant.sourceMonster;

  const attacks: HudActionItem[] = [];
  const actions: HudActionItem[] = [];
  const bonusActions: HudActionItem[] = [];
  const spells: HudActionItem[] = [];
  const reactions: HudActionItem[] = [];
  const items: HudActionItem[] = [];
  const special: HudActionItem[] = [];

  const totalLevel =
    liveDdbHud?.totalLevel ||
    (char?.classLevel || combatant.classOrCr || '')
      .match(/\d+/g)
      ?.reduce((acc, n) => acc + parseInt(n, 10), 0) ||
    5;
  const profBonus = char?.proficiencyBonus || Math.ceil(totalLevel / 4) + 1;
  const charStats = char?.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  const classLower = (char?.classLevel || combatant.classOrCr || '').toLowerCase();
  const spellAbilityScore =
    classLower.includes('cleric') || classLower.includes('druid') || classLower.includes('ranger')
      ? charStats.wis
      : classLower.includes('wizard') ||
        classLower.includes('artificer') ||
        classLower.includes('fighter') ||
        classLower.includes('rogue')
      ? charStats.int
      : classLower.includes('bard') ||
        classLower.includes('warlock') ||
        classLower.includes('paladin') ||
        classLower.includes('sorcerer')
      ? charStats.cha
      : Math.max(charStats.int, charStats.wis, charStats.cha);
  const spellMod = Math.floor(((spellAbilityScore || 10) - 10) / 2);
  const spellAttackBonus = profBonus + spellMod;
  const spellSaveDc = 8 + profBonus + spellMod;

  if (char) {
    // 1. Seed from live D&D Beyond HUD if available
    if (liveDdbHud) {
      liveDdbHud.attacks.forEach((a) => attacks.push({ ...a }));
      liveDdbHud.actions.forEach((a) => actions.push({ ...a }));
      liveDdbHud.bonusActions.forEach((a) => bonusActions.push({ ...a }));
      liveDdbHud.spells.forEach((a) => spells.push({ ...a }));
      liveDdbHud.reactions.forEach((a) => reactions.push({ ...a }));
      liveDdbHud.items.forEach((a) => items.push({ ...a }));
      (liveDdbHud.special || []).forEach((a) => special.push({ ...a }));
    }

    // 2. Ensure all local compendium weapons/actions are present
    if (Array.isArray(char.actions) && char.actions.length > 0) {
      char.actions.forEach((act, idx) => {
        if (attacks.some((a) => a.name.toLowerCase() === act.name.toLowerCase())) return;
        const dmgParts = (act.damage || '').split(' ');
        const formula = dmgParts[0] || '1d8 + 4';
        const dmgType = (dmgParts.slice(1).join(' ') || 'slashing').toLowerCase();
        const isRanged =
          act.type?.toLowerCase().includes('ranged') ||
          act.name.toLowerCase().includes('bow') ||
          act.name.toLowerCase().includes('crossbow') ||
          act.name.toLowerCase().includes('launcher') ||
          act.name.toLowerCase().includes('blast');
        const matchedWpnAsset = findJb2aAsset(act.name);
        const item: HudActionItem = {
          id: `arena-char-atk-${idx}`,
          name: act.name,
          category: 'attacks',
          type: 'action',
          subCategory: 'weapon',
          isAttack: true,
          isEquipped: true,
          sourceLabel: 'Equipped Weapon',
          castingTime: '1 Action',
          hitBonus: act.hitBonus || '+7',
          damageFormula: formula,
          damageType: dmgType,
          notes: act.notes,
          description: act.description || `Attack with ${act.name}.`,
          rangeFt: isRanged ? 80 : 5,
          jb2aAssetId:
            matchedWpnAsset?.id ||
            (act.name.toLowerCase().includes('greataxe') || act.name.toLowerCase().includes('greatsword')
              ? 'attack_greatsword'
              : act.name.toLowerCase().includes('hammer') || act.name.toLowerCase().includes('mace')
              ? 'attack_hammer'
              : isRanged
              ? 'attack_bow'
              : 'attack_slash')
        };
        attacks.push(item);
        actions.push({ ...item, category: 'actions' });
      });
    }

    // 3. Ensure all local compendium bonus actions are present
    if (Array.isArray(char.bonusActions) && char.bonusActions.length > 0) {
      char.bonusActions.forEach((ba, idx) => {
        if (bonusActions.some((b) => b.name.toLowerCase() === ba.name.toLowerCase())) return;
        const lower = ba.name.toLowerCase();
        const isHeal = lower.includes('wind') || lower.includes('heal') || lower.includes('lay on hands');
        const isTeleport = lower.includes('jaunt') || lower.includes('step');
        const matchedBaAsset = findJb2aAsset(ba.name);
        bonusActions.push({
          id: `arena-char-ba-${idx}`,
          name: ba.name,
          category: 'bonus_actions',
          type: 'bonus_action',
          subCategory: 'class',
          sourceLabel: ba.source || 'Class Feature',
          castingTime: '1 Bonus Action',
          isSelfAction: !isTeleport && !lower.includes('smite') && !lower.includes('curse'),
          isHeal,
          damageFormula: lower.includes('second wind')
            ? `1d10 + ${totalLevel}`
            : lower.includes('lay on hands')
            ? '25'
            : lower.includes('smite')
            ? '2d8'
            : undefined,
          damageType: isHeal ? 'healing' : lower.includes('smite') ? 'radiant' : undefined,
          rangeFt: isTeleport ? 30 : lower.includes('smite') || lower.includes('lay on hands') ? 5 : 0,
          description: ba.description,
          jb2aAssetId: matchedBaAsset?.id || (isTeleport ? 'misty_step' : isHeal ? 'cure_wounds' : undefined)
        });
      });
    }

    // 4. Ensure all local compendium reactions are present
    if (Array.isArray(char.reactions) && char.reactions.length > 0) {
      char.reactions.forEach((rx, idx) => {
        if (reactions.some((r) => r.name.toLowerCase() === rx.name.toLowerCase())) return;
        const matchedRxAsset = findJb2aAsset(rx.name);
        reactions.push({
          id: `arena-char-rx-${idx}`,
          name: rx.name,
          category: 'reactions',
          type: 'reaction',
          subCategory: 'class',
          sourceLabel: 'Reaction',
          castingTime: '1 Reaction',
          isSelfAction: !rx.name.toLowerCase().includes('opportunity'),
          rangeFt: rx.name.toLowerCase().includes('opportunity') ? 5 : 30,
          description: rx.description,
          jb2aAssetId: matchedRxAsset?.id
        });
      });
    }

    // 5. Ensure all local compendium spells are present with full D&D 5e rules, animations, and upcasting
    if (Array.isArray(char.spells) && char.spells.length > 0) {
      char.spells.forEach((spName, idx) => {
        const lower = spName.toLowerCase();
        const rule = lookupDndRuleDetails(spName, 'spell');
        const canonicalName = (rule?.name || spName).toLowerCase();
        if (spells.some((s) => s.name.toLowerCase() === canonicalName || s.name.toLowerCase() === lower)) {
          return;
        }
        const matchedAsset = findJb2aAsset(spName);
        const baseLvl =
          rule?.level !== undefined
            ? rule.level
            : lower.includes('blast') ||
              lower.includes('bolt') ||
              lower.includes('mockery') ||
              lower.includes('flame') ||
              lower.includes('guidance') ||
              lower.includes('light') ||
              lower.includes('prestidigitation') ||
              lower.includes('mage hand') ||
              lower.includes('minor illusion') ||
              lower.includes('thaumaturgy') ||
              lower.includes('druidcraft') ||
              lower.includes('frostbite') ||
              lower.includes('starry wisp') ||
              lower.includes('elementalism') ||
              lower.includes('message') ||
              lower.includes('spare the dying') ||
              lower.includes('blade ward') ||
              lower.includes('booming blade') ||
              lower.includes('toll the dead')
            ? 0
            : 1;
        const isHeal = Boolean(
          rule?.isHeal ||
            lower.includes('cure') ||
            lower.includes('heal') ||
            lower.includes('revivify') ||
            lower.includes('restoration') ||
            lower.includes('aid') ||
            lower.includes('goodberry') ||
            lower.includes("heroes' feast")
        );

        let baseFormula = rule?.damageFormula;
        if (baseFormula && baseLvl === 0) {
          const cantripMult = totalLevel >= 17 ? 4 : totalLevel >= 11 ? 3 : totalLevel >= 5 ? 2 : 1;
          baseFormula = baseFormula.replace(/^1(d\d+)/i, `${cantripMult}$1`);
        } else if (
          baseFormula &&
          isHeal &&
          (lower.includes('cure wounds') || lower.includes('healing word'))
        ) {
          baseFormula = `${baseFormula} + ${Math.max(1, spellMod)}`;
        } else if (baseFormula && lower.includes('spiritual weapon')) {
          baseFormula = `${baseFormula} + ${Math.max(1, spellMod)}`;
        }

        const castingTime =
          rule?.castingTime ||
          (lower.includes('healing word') ||
          lower.includes('mark') ||
          lower.includes('hex') ||
          lower.includes('misty step') ||
          lower.includes('shield of faith') ||
          lower.includes('sanctuary') ||
          lower.includes('spiritual weapon') ||
          lower.includes('holy weapon') ||
          lower.includes('divine word') ||
          lower.includes('smite')
            ? '1 Bonus Action'
            : lower.includes('counterspell') ||
              lower === 'shield' ||
              lower.includes('absorb elements') ||
              lower.includes('hellish rebuke') ||
              lower.includes('silvery barbs')
            ? '1 Reaction'
            : '1 Action');
        const isBonus = castingTime.toLowerCase().includes('bonus');
        const isRx = castingTime.toLowerCase().includes('reaction');
        const isAtk = Boolean(
          rule?.isAttack ||
            lower.includes('blast') ||
            lower.includes('bolt') ||
            lower.includes('ray') ||
            lower.includes('orb') ||
            lower.includes('spiritual weapon') ||
            lower.includes('starry wisp') ||
            lower.includes('crown of stars') ||
            lower.includes('booming blade')
        );
        const saveAbil = rule?.saveAbility;
        const canUpcast = baseLvl >= 1 && baseLvl <= 8 && Boolean(rule?.higherLevels || baseFormula);
        const upcastOptions = canUpcast
          ? Array.from({ length: 9 - baseLvl + 1 }, (_, i) => {
              const slotLvl = baseLvl + i;
              return {
                slotLevel: slotLvl,
                ...computeUpcastFormula(baseFormula, baseLvl, slotLvl, spName)
              };
            })
          : undefined;
        const rangeNum = rule?.range
          ? rule.range.toLowerCase().includes('self')
            ? rule.radiusFeet || 0
            : rule.range.toLowerCase().includes('touch')
            ? 5
            : parseInt(rule.range.match(/\d+/)?.[0] || '60', 10) || 60
          : matchedAsset?.defaultSizeFt || (isHeal ? 30 : 60);

        const hudSpell: HudActionItem = {
          id: `arena-char-spell-${idx}`,
          name: rule?.name || spName,
          category: 'spells',
          type: isBonus ? 'bonus_action' : isRx ? 'reaction' : 'action',
          subCategory: 'spell',
          sourceLabel: baseLvl === 0 ? 'Cantrip' : `Level ${baseLvl} ${rule?.school || 'Evocation'}`,
          level: baseLvl,
          canUpcast,
          upcastOptions,
          school: ((rule?.school || matchedAsset?.school || 'evocation').toLowerCase()) as any,
          castingTime,
          duration: rule?.duration,
          components: rule?.components,
          atHigherLevels: rule?.higherLevels,
          hitBonus: isAtk ? `+${spellAttackBonus}` : undefined,
          saveDc: saveAbil ? spellSaveDc : undefined,
          saveAbility: saveAbil,
          damageFormula: baseFormula,
          damageType: rule?.damageType || (isHeal ? 'healing' : undefined),
          isHeal,
          isAttack: isAtk,
          isSelfAction: Boolean(rule?.isSelfAction || (rangeNum === 0 && !isAtk && !saveAbil)),
          spellSlotRequired: baseLvl > 0 ? baseLvl : undefined,
          description: rule?.description || `Cast ${spName}.`,
          rangeFt: rangeNum,
          jb2aAssetId:
            matchedAsset?.id ||
            (isHeal ? 'cure_wounds' : lower.includes('eldritch') ? 'eldritch_blast' : 'fire_bolt'),
          iconUrl:
            matchedAsset?.thumb && !matchedAsset.thumb.endsWith('.webm')
              ? matchedAsset.thumb
              : undefined,
          isPrepared: true
        };

        spells.push(hudSpell);

        if (isBonus && !bonusActions.some((b) => b.name.toLowerCase() === hudSpell.name.toLowerCase())) {
          bonusActions.push({ ...hudSpell, id: `arena-ba-spell-${idx}`, category: 'bonus_actions' });
        }
        if (isRx && !reactions.some((r) => r.name.toLowerCase() === hudSpell.name.toLowerCase())) {
          reactions.push({ ...hudSpell, id: `arena-rx-spell-${idx}`, category: 'reactions' });
        }
        if (isAtk && !attacks.some((a) => a.name.toLowerCase() === hudSpell.name.toLowerCase())) {
          attacks.push({ ...hudSpell, id: `arena-atk-spell-${idx}`, category: 'attacks' });
        }
      });
    }

    spells.sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.name.localeCompare(b.name));

    // 6. Populate Special Features & Traits
    if (Array.isArray(char.specialFeatures)) {
      char.specialFeatures.forEach((sf, idx) => {
        if (special.some((s) => s.name.toLowerCase() === sf.name.toLowerCase())) return;
        const matchedSf = findJb2aAsset(sf.name);
        special.push({
          id: `arena-spec-sf-${idx}`,
          name: sf.name,
          category: 'special',
          type: 'special',
          subCategory: 'class',
          sourceLabel: sf.category || 'Special Feature',
          castingTime: 'Special',
          isSelfAction: true,
          description: sf.description,
          jb2aAssetId: matchedSf?.id
        });
      });
    }
    if (Array.isArray(char.features)) {
      char.features.forEach((f, idx) => {
        const fName = String(f);
        if (special.some((s) => s.name.toLowerCase() === fName.toLowerCase())) return;
        const matchedFeat = findJb2aAsset(fName);
        special.push({
          id: `arena-spec-feat-${idx}`,
          name: fName,
          category: 'special',
          type: 'special',
          subCategory: 'class',
          sourceLabel: 'Feature & Trait',
          castingTime: 'Special',
          isSelfAction: true,
          description: fName,
          jb2aAssetId: matchedFeat?.id
        });
      });
    }
  } else if (mon) {
    const monHud = buildDmMonsterHudData(
      {
        id: combatant.id,
        name: combatant.name,
        hp: combatant.currentHp,
        maxHp: combatant.maxHp,
        ac: combatant.ac
      },
      [mon]
    );
    if (monHud) {
      monHud.attacks.forEach((atk, idx) => {
        const item: HudActionItem = {
          id: `arena-mon-atk-${idx}`,
          name: atk.name,
          category: 'attacks',
          type: 'action',
          subCategory: 'weapon',
          isAttack: true,
          isEquipped: true,
          hitBonus: atk.hitBonus ?? '+6',
          damageFormula: atk.damageFormula || '2d6 + 4',
          damageType: atk.damageType || 'slashing',
          rangeFt: atk.rangeFt || 5,
          description: atk.description,
          jb2aAssetId: atk.jb2aAssetId || 'attack_slash'
        };
        attacks.push(item);
        actions.push({ ...item, category: 'actions' });
      });
      monHud.spells.forEach((sp, idx) => {
        const rule = lookupDndRuleDetails(sp.name, 'spell');
        const matchedAsset = findJb2aAsset(sp.name);
        spells.push({
          id: `arena-mon-sp-${idx}`,
          name: rule?.name || sp.name,
          category: 'spells',
          type: 'action',
          subCategory: 'spell',
          level: sp.level ?? rule?.level ?? 0,
          school: ((rule?.school || matchedAsset?.school || 'evocation').toLowerCase()) as any,
          castingTime: rule?.castingTime || '1 Action',
          duration: rule?.duration,
          components: rule?.components,
          atHigherLevels: rule?.higherLevels,
          hitBonus: sp.hitBonus ?? (rule?.isAttack ? '+7' : undefined),
          saveDc: sp.saveDc ?? (rule?.saveAbility ? 15 : undefined),
          saveAbility: sp.saveAbility || rule?.saveAbility,
          damageFormula: sp.damageFormula || rule?.damageFormula,
          damageType: sp.damageType || rule?.damageType || 'force',
          isHeal: Boolean(sp.isHeal || rule?.isHeal),
          isAttack: Boolean(sp.isAttack || rule?.isAttack),
          isSelfAction: Boolean(sp.isSelfAction || rule?.isSelfAction),
          rangeFt: sp.rangeFt || 60,
          description: rule?.description || sp.description,
          jb2aAssetId: sp.jb2aAssetId || matchedAsset?.id || 'eldritch_blast'
        });
      });
    }
  }

  if (attacks.length === 0) {
    const fallbackAtk: HudActionItem = {
      id: 'arena-default-strike',
      name: 'Gladiator Strike',
      category: 'attacks',
      type: 'action',
      subCategory: 'weapon',
      isAttack: true,
      isEquipped: true,
      hitBonus: '+6',
      damageFormula: '1d10 + 4',
      damageType: 'slashing',
      rangeFt: 5,
      description: 'Deliver a powerful melee weapon strike.',
      jb2aAssetId: 'attack_slash'
    };
    attacks.push(fallbackAtk);
    actions.push({ ...fallbackAtk, category: 'actions' });
  }

  // Standard tactical actions available to all Arena fighters
  if (!actions.some((a) => a.name.toLowerCase().startsWith('dash'))) {
    actions.push({
      id: 'arena-dash',
      name: 'Dash (+Speed)',
      category: 'actions',
      type: 'action',
      subCategory: 'standard',
      isSelfAction: true,
      description: 'Double your movement speed for this turn.',
      rangeFt: 0
    });
  }
  if (!actions.some((a) => a.id === 'arena-second-wind')) {
    actions.push({
      id: 'arena-second-wind',
      name: 'Arena Surge (Heal)',
      category: 'actions',
      type: 'action',
      subCategory: 'standard',
      isSelfAction: true,
      isHeal: true,
      damageFormula: '2d8 + 4',
      description: 'Catch your breath and rally for 2d8 + 4 HP.',
      rangeFt: 0,
      jb2aAssetId: 'cure_wounds'
    });
  }

  if (!reactions.some((r) => r.name.toLowerCase().includes('opportunity'))) {
    reactions.unshift({
      id: 'arena-opp-attack',
      name: 'Opportunity Attack',
      category: 'reactions',
      type: 'reaction',
      subCategory: 'standard',
      castingTime: '1 Reaction',
      isAttack: true,
      hitBonus: attacks[0]?.hitBonus || '+6',
      damageFormula: attacks[0]?.damageFormula || '1d8 + 3',
      damageType: attacks[0]?.damageType || 'slashing',
      description: 'Make one melee weapon attack when a hostile creature leaves your reach.',
      rangeFt: 5,
      jb2aAssetId: attacks[0]?.jb2aAssetId || 'attack_slash'
    });
  }

  if (!items.some((i) => i.name.toLowerCase().includes('potion'))) {
    items.push({
      id: 'arena-potion-greater',
      name: 'Potion of Greater Healing',
      category: 'items',
      type: 'bonus_action',
      subCategory: 'item',
      castingTime: '1 Bonus Action',
      quantity: 2,
      isSelfAction: true,
      isHeal: true,
      damageFormula: '4d4 + 4',
      description: 'Drink a crimson healing draught to restore 4d4 + 4 HP.',
      rangeFt: 5,
      jb2aAssetId: 'cure_wounds'
    });
  }

  // Build full 5e Spell Slots based on character level / live DDB slots
  const spellSlots: Record<number, { level: number; total: number; used: number; available: number }> = {};
  if (liveDdbHud?.spellSlots && Object.keys(liveDdbHud.spellSlots).length > 0) {
    Object.entries(liveDdbHud.spellSlots).forEach(([k, v]) => {
      spellSlots[Number(k)] = { ...v };
    });
  }
  if (spells.length > 0) {
    const maxSpellLvl = Math.max(
      3,
      ...spells.map((s) => s.level || 0),
      totalLevel >= 17 ? 9 : totalLevel >= 15 ? 8 : totalLevel >= 13 ? 7 : totalLevel >= 11 ? 6 : totalLevel >= 9 ? 5 : totalLevel >= 7 ? 4 : 3
    );
    const countsByLvl: Record<number, number> = { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 };
    for (let l = 1; l <= maxSpellLvl; l++) {
      if (!spellSlots[l]) {
        const tot = countsByLvl[l] || 1;
        spellSlots[l] = { level: l, total: tot, used: 0, available: tot };
      }
    }
  }

  const hasBookOfExaltedDeeds = Boolean(
    liveDdbHud?.hasBookOfExaltedDeeds ||
      combatant.name.toLowerCase().includes('stavros') ||
      char?.name?.toLowerCase().includes('stavros')
  );

  return {
    id: combatant.id,
    ddbCharacterId: char?.ddbCharacterId ? String(char.ddbCharacterId) : liveDdbHud?.ddbCharacterId,
    isLiveSynced: Boolean(liveDdbHud?.isLiveSynced),
    name: combatant.name,
    avatarUrl: combatant.avatarUrl,
    race: combatant.raceOrType,
    classLevel: combatant.classOrCr,
    totalLevel,
    ac: combatant.ac,
    currentHp: combatant.currentHp,
    maxHp: combatant.maxHp,
    tempHp: combatant.tempHp,
    speed: `${combatant.speedFt} ft.`,
    walkSpeedFt: combatant.speedFt,
    passivePerception: char?.passivePerception || liveDdbHud?.passivePerception || 14,
    passiveInsight: char?.passiveInsight || liveDdbHud?.passiveInsight || 12,
    passiveInvestigation: char?.passiveInvestigation || liveDdbHud?.passiveInvestigation || 12,
    deathSaves: { successes: 0, failures: 0 },
    attacks,
    actions,
    bonusActions,
    spells,
    reactions,
    items,
    special,
    spellSlots,
    resources: liveDdbHud?.resources || [],
    canWildShape: Boolean(
      liveDdbHud?.canWildShape ||
        combatant.name.toLowerCase().includes("g'aiah") ||
        combatant.name.toLowerCase().includes('gaiah') ||
        classLower.includes('druid')
    ),
    hasBookOfExaltedDeeds,
    readonlyUrl: char?.ddbCharacterId ? `https://www.dndbeyond.com/characters/${char.ddbCharacterId}` : '',
    lastUpdated: Date.now()
  };
}

/**
 * Parse numeric Challenge Rating from string like "1/2 (100 XP)" or "5 (1,800 XP)"
 */
function parseMonsterCr(crString?: string): number {
  if (!crString) return 1;
  const clean = crString.trim().split(' ')[0];
  if (clean === '1/8') return 0.125;
  if (clean === '1/4') return 0.25;
  if (clean === '1/2') return 0.5;
  const num = parseFloat(clean);
  return isNaN(num) ? 1 : num;
}

/**
 * Generates a balanced random monster encounter scaled to the number of Player Heroes and Difficulty Tier
 */
export function generateScaledRandomEncounter(
  playerCount: number,
  difficulty: ArenaDifficulty,
  monsterPool: Monster[]
): Monster[] {
  const safeCount = Math.max(1, Math.min(6, playerCount));
  const multiplier = difficulty === 'deadly' ? 1.65 : difficulty === 'hard' ? 1.25 : 0.9;
  const targetTotalCr = Math.max(0.5, safeCount * 2.2 * multiplier);

  const pool = monsterPool.length > 0 ? monsterPool : DEFAULT_MONSTERS;
  const picked: Monster[] = [];
  let accumulatedCr = 0;

  // Decide between a Boss + Minions or a Squad encounter
  const rollType = Math.random();
  const maxEnemies = Math.min(5, safeCount + (difficulty === 'deadly' ? 2 : 1));

  if (rollType < 0.45) {
    // Boss / Leader + 1-2 Minions
    const bossTargetCr = targetTotalCr * 0.7;
    const bossCandidates = pool.filter((m) => {
      const cr = parseMonsterCr(m.challenge);
      return cr >= bossTargetCr * 0.5 && cr <= bossTargetCr * 1.45;
    });
    const boss =
      bossCandidates.length > 0
        ? bossCandidates[Math.floor(Math.random() * bossCandidates.length)]
        : pool[Math.floor(Math.random() * pool.length)];
    if (boss) {
      picked.push(boss);
      accumulatedCr += parseMonsterCr(boss.challenge);
    }
  }

  let attempts = 0;
  while (accumulatedCr < targetTotalCr * 0.85 && picked.length < maxEnemies && attempts < 25) {
    attempts++;
    const remainingCr = Math.max(0.25, targetTotalCr - accumulatedCr);
    const candidates = pool.filter((m) => {
      const cr = parseMonsterCr(m.challenge);
      return cr <= remainingCr * 1.35 && cr >= Math.min(0.25, remainingCr * 0.2);
    });
    const chosen =
      candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : pool[Math.floor(Math.random() * pool.length)];
    if (chosen) {
      picked.push(chosen);
      accumulatedCr += Math.max(0.25, parseMonsterCr(chosen.challenge));
    }
  }

  return picked.length > 0 ? picked : [pool[0]];
}

// ============================================================================
// KONVA TOKEN NODE FOR ARENA COMBATANTS
// ============================================================================
const ArenaTokenNode: React.FC<{
  combatant: ArenaCombatant;
  isCurrentTurn: boolean;
  isTargetable: boolean;
  canDrag: boolean;
  onMove: (id: string, newX: number, newY: number) => void;
  onClickToken: (combatant: ArenaCombatant) => void;
}> = ({ combatant, isCurrentTurn, isTargetable, canDrag, onMove, onClickToken }) => {
  const [img] = useImage(combatant.avatarUrl || '');
  const pixelSize = (combatant.size || 1) * ARENA_GRID_SIZE;
  const radius = pixelSize / 2;
  const isDead = combatant.currentHp <= 0;

  const floatingGroupRef = useRef<any>(null);
  const shadowRef = useRef<any>(null);
  const leftWingRef = useRef<any>(null);
  const rightWingRef = useRef<any>(null);
  const vortexRingRef = useRef<any>(null);
  const cloudGroupRef = useRef<any>(null);
  const shockwaveRef = useRef<any>(null);

  const flightMetrics = computeFlightLiftMetrics(
    combatant.elevation || 0,
    Boolean(combatant.isFlying),
    radius
  );

  useTokenFlightAnimation({
    elevation: combatant.elevation || 0,
    isFlying: Boolean(combatant.isFlying),
    liftOffsetPx: flightMetrics.liftOffsetPx,
    perspectiveScale: flightMetrics.perspectiveScale,
    radius,
    floatingGroupRef,
    shadowRef,
    leftWingRef,
    rightWingRef,
    vortexRingRef,
    cloudGroupRef,
    shockwaveRef
  });

  const teamColor = combatant.team === 'gold' ? '#f59e0b' : '#ef4444';
  const hpPct = Math.max(0, Math.min(1, combatant.currentHp / Math.max(1, combatant.maxHp)));

  return (
    <Group
      x={combatant.x}
      y={combatant.y}
      draggable={canDrag && !isDead}
      opacity={isDead ? 0.45 : 1}
      onDragEnd={(e) => {
        const rawX = e.target.x();
        const rawY = e.target.y();
        // Snap to 1-inch Arena Grid
        const snappedX = Math.max(
          0,
          Math.min(ARENA_WIDTH - pixelSize, Math.round(rawX / ARENA_GRID_SIZE) * ARENA_GRID_SIZE)
        );
        const snappedY = Math.max(
          0,
          Math.min(ARENA_HEIGHT - pixelSize, Math.round(rawY / ARENA_GRID_SIZE) * ARENA_GRID_SIZE)
        );
        e.target.position({ x: snappedX, y: snappedY });
        onMove(combatant.id, snappedX, snappedY);
      }}
      onClick={(e) => {
        e.cancelBubble = true;
        onClickToken(combatant);
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onClickToken(combatant);
      }}
    >
      {/* Ground Footprint when Flying */}
      {flightMetrics.isElevated && (
        <TokenGroundFootprint
          elevation={combatant.elevation || 0}
          isFlying={Boolean(combatant.isFlying)}
          radius={radius}
          tierColor={flightMetrics.tierColor}
          liftOffsetPx={flightMetrics.liftOffsetPx}
          shadowRef={shadowRef}
          shockwaveRef={shockwaveRef}
        />
      )}

      <Group ref={floatingGroupRef} y={-flightMetrics.liftOffsetPx}>
        {/* Active Turn Pulsing Ring */}
        {isCurrentTurn && !isDead && (
          <Circle
            x={radius}
            y={radius}
            radius={radius + 7}
            stroke="#fbbf24"
            strokeWidth={3}
            dash={[8, 4]}
            shadowColor="#fbbf24"
            shadowBlur={14}
          />
        )}

        {/* Targetable Crosshair Ring */}
        {isTargetable && !isDead && (
          <Circle
            x={radius}
            y={radius}
            radius={radius + 10}
            stroke="#ef4444"
            strokeWidth={2.5}
            dash={[6, 4]}
          />
        )}

        {/* Token Base Circle */}
        <Circle
          x={radius}
          y={radius}
          radius={radius - 2}
          fill="#18181b"
          stroke={teamColor}
          strokeWidth={3.5}
          shadowColor="#000"
          shadowBlur={10}
          shadowOpacity={0.7}
        />

        {/* Circular Clipped Avatar or Initials Fallback */}
        {img ? (
          <Group
            clipFunc={(ctx) => {
              ctx.arc(radius, radius, radius - 4, 0, Math.PI * 2, false);
            }}
          >
            <KonvaImage
              image={img}
              x={2}
              y={2}
              width={pixelSize - 4}
              height={pixelSize - 4}
            />
          </Group>
        ) : (
          <Text
            width={pixelSize}
            y={radius - 8}
            align="center"
            text={combatant.name.slice(0, 2).toUpperCase()}
            fontSize={16}
            fontStyle="bold"
            fontFamily="monospace"
            fill={teamColor}
          />
        )}

        {/* Aerial Wings & Badge */}
        {flightMetrics.isElevated && (
          <TokenAerialOverlay
            elevation={combatant.elevation || 0}
            isFlying={Boolean(combatant.isFlying)}
            radius={radius}
            tokenWidth={pixelSize}
            isMonster={combatant.team === 'crimson'}
            tierColor={flightMetrics.tierColor}
            tierGlow={flightMetrics.tierGlow}
            tierBg={flightMetrics.tierBg}
            badgeText={flightMetrics.badgeText}
            leftWingRef={leftWingRef}
            rightWingRef={rightWingRef}
            vortexRingRef={vortexRingRef}
            cloudGroupRef={cloudGroupRef}
          />
        )}

        {/* HP Bar Above Token */}
        <Group x={4} y={-12}>
          <Rect
            width={pixelSize - 8}
            height={7}
            cornerRadius={3}
            fill="rgba(9, 9, 11, 0.9)"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={1}
          />
          <Rect
            width={Math.max(0, (pixelSize - 8) * hpPct)}
            height={7}
            cornerRadius={3}
            fill={hpPct > 0.5 ? '#10b981' : hpPct > 0.25 ? '#f59e0b' : '#ef4444'}
          />
        </Group>

        {/* Name & HP Pill Below Token */}
        <Group x={-16} y={pixelSize + 2}>
          <Rect
            width={pixelSize + 32}
            height={18}
            cornerRadius={5}
            fill="rgba(9, 9, 11, 0.88)"
            stroke={teamColor}
            strokeWidth={1}
          />
          <Text
            width={pixelSize + 32}
            y={3}
            align="center"
            text={`${combatant.name.split(' ')[0]} (${combatant.currentHp}/${combatant.maxHp})`}
            fontSize={10}
            fontStyle="bold"
            fontFamily="monospace"
            fill="#f4f4f5"
          />
        </Group>
      </Group>
    </Group>
  );
};

// ============================================================================
// MAIN STAND-ALONE COMPONENT: PLAYER ARENA LOBBY & TURN-BASED COLOSSEUM
// ============================================================================
export const PlayerArenaMode: React.FC<PlayerArenaModeProps> = ({
  isOpen,
  onExitArena,
  compendiumCharacters,
  claimedCharacterName,
  socketRef,
  hasLiveDmMap,
  onTrigger3dDice
}) => {
  // Arena Phase: 'lobby' (Match Setup & Ready Room) vs 'battle' (Live Turn-Based Arena)
  const [phase, setPhase] = useState<'lobby' | 'battle'>('lobby');
  const [matchMode, setMatchMode] = useState<ArenaMatchMode>('random_encounter');
  const [difficulty, setDifficulty] = useState<ArenaDifficulty>('standard');
  const [selectedMap, setSelectedMap] = useState<PresetBattlemap>(() => PRESET_BATTLEMAPS[3] || PRESET_BATTLEMAPS[0]);

  // Available Heroes & Monsters
  const heroPool = useMemo<Character[]>(() => {
    const merged: Character[] = [];
    const seen = new Set<string>();
    [...(compendiumCharacters || []), ...DEFAULT_CHARACTERS].forEach((c) => {
      const key = c.name.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(c);
      }
    });
    return merged;
  }, [compendiumCharacters]);

  const monsterPool = useMemo<Monster[]>(() => DEFAULT_MONSTERS, []);

  // Drafted Team Gold (Players) and Team Crimson (Opponents / NPCs)
  const [goldHeroIds, setGoldHeroIds] = useState<string[]>(() => {
    if (claimedCharacterName) {
      const matched = heroPool.find((h) => h.name.toLowerCase() === claimedCharacterName.toLowerCase());
      if (matched) return [matched.id];
    }
    return heroPool.slice(0, 2).map((h) => h.id);
  });

  const [crimsonHeroIds, setCrimsonHeroIds] = useState<string[]>(() =>
    heroPool.slice(2, 4).map((h) => h.id)
  );
  const [crimsonIsAI, setCrimsonIsAI] = useState<boolean>(true);
  const [draftedMonsters, setDraftedMonsters] = useState<Monster[]>(() =>
    generateScaledRandomEncounter(2, 'standard', DEFAULT_MONSTERS)
  );

  // Connected Players in Arena Lobby (Synced via Socket.IO ARENA_LOBBY_SYNC)
  const [lobbyPlayers, setLobbyPlayers] = useState<ArenaLobbyPlayer[]>([]);
  const clientIdRef = useRef<string>(`arena_client_${Math.random().toString(36).slice(2, 8)}`);

  // Live Battle State
  const [combatants, setCombatants] = useState<ArenaCombatant[]>([]);
  const [turnIndex, setTurnIndex] = useState<number>(0);
  const [round, setRound] = useState<number>(1);
  const [combatLogs, setCombatLogs] = useState<ArenaLogEntry[]>([]);
  const [winnerTeam, setWinnerTeam] = useState<'gold' | 'crimson' | null>(null);
  const [activeTargetingAction, setActiveTargetingAction] = useState<HudActionItem | null>(null);
  const [arenaEffects, setArenaEffects] = useState<VttEffectInstance[]>([]);
  const [aiTacticalBanner, setAiTacticalBanner] = useState<string | null>(null);
  const [aiPathPreviewPx, setAiPathPreviewPx] = useState<Array<{ x: number; y: number }>>([]);

  // Viewport Pan & Zoom + Mobile Detection
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? (window.visualViewport?.width || window.innerWidth) : 1600,
    height: typeof window !== 'undefined' ? (window.visualViewport?.height || window.innerHeight) : 900
  });
  const isMobile = dimensions.width < 768;
  const [showCombatFeed, setShowCombatFeed] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  const [stageScale, setStageScale] = useState<number>(0.85);
  const [stagePos, setStagePos] = useState<{ x: number; y: number }>({ x: 120, y: 60 });
  const pinchDistRef = useRef<number | null>(null);

  const [bgImage] = useImage(selectedMap.url);

  useEffect(() => {
    const onResize = () => {
      const w = window.visualViewport?.width || window.innerWidth;
      const h = window.visualViewport?.height || window.innerHeight;
      setDimensions({ width: w, height: h });
    };
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, []);

  const fitArenaCamera = useCallback(
    (w = dimensions.width, h = dimensions.height) => {
      const mobile = w < 768;
      const padX = mobile ? 16 : 80;
      const padY = mobile ? 170 : 230;
      const fitScale = Math.max(
        mobile ? 0.24 : 0.45,
        Math.min(0.95, (w - padX) / ARENA_WIDTH, (h - padY) / ARENA_HEIGHT)
      );
      setStageScale(fitScale);
      setStagePos({
        x: Math.round((w - ARENA_WIDTH * fitScale) / 2),
        y: mobile ? 48 : 56
      });
    },
    [dimensions.width, dimensions.height]
  );

  // Re-generate scaled random encounter when player count or difficulty changes in 'random_encounter' mode
  useEffect(() => {
    if (matchMode === 'random_encounter') {
      setDraftedMonsters(
        generateScaledRandomEncounter(Math.max(1, goldHeroIds.length), difficulty, monsterPool)
      );
    }
  }, [matchMode, goldHeroIds.length, difficulty, monsterPool]);

  // Adjust team slot counts automatically when switching between 1v1 and 2v2
  useEffect(() => {
    if (matchMode === '1v1') {
      setGoldHeroIds((prev) => prev.slice(0, 1));
      setCrimsonHeroIds((prev) => (prev.length > 0 ? prev.slice(0, 1) : [heroPool[1]?.id || heroPool[0]?.id]));
    } else if (matchMode === '2v2') {
      setGoldHeroIds((prev) => (prev.length >= 2 ? prev.slice(0, 2) : heroPool.slice(0, 2).map((h) => h.id)));
      setCrimsonHeroIds((prev) => (prev.length >= 2 ? prev.slice(0, 2) : heroPool.slice(2, 4).map((h) => h.id)));
    }
  }, [matchMode, heroPool]);

  // Socket.IO Arena Lobby Presence Sync (Non-Destructive)
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !isOpen) return;

    const myHero = heroPool.find((h) => h.id === goldHeroIds[0]) || heroPool[0];
    const myEntry: ArenaLobbyPlayer = {
      clientId: clientIdRef.current,
      playerName: claimedCharacterName || myHero?.name || 'Challenger',
      characterId: myHero?.id || 'hero_1',
      characterName: myHero?.name || 'Hero',
      avatarUrl: myHero?.avatarUrl || getCharacterTokenUrl(myHero?.name || ''),
      team: 'gold',
      ready: true,
      updatedAt: Date.now()
    };

    socket.emit('ARENA_LOBBY_ANNOUNCE', myEntry);

    const onLobbyAnnounce = (incoming: ArenaLobbyPlayer) => {
      if (!incoming?.clientId) return;
      setLobbyPlayers((prev) => {
        const exists = prev.some((p) => p.clientId === incoming.clientId);
        return exists
          ? prev.map((p) => (p.clientId === incoming.clientId ? incoming : p))
          : [...prev, incoming];
      });
    };

    socket.on('ARENA_LOBBY_ANNOUNCE', onLobbyAnnounce);
    return () => {
      socket.off('ARENA_LOBBY_ANNOUNCE', onLobbyAnnounce);
    };
  }, [isOpen, socketRef, goldHeroIds, heroPool, claimedCharacterName]);

  const addCombatLog = useCallback(
    (actorName: string, team: 'gold' | 'crimson', message: string, detail?: string, isCrit?: boolean) => {
      setCombatLogs((prev) => [
        {
          id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          round,
          actorName,
          team,
          message,
          detail,
          isCrit,
          timestamp: Date.now()
        },
        ...prev.slice(0, 39)
      ]);
    },
    [round]
  );

  // Start the Turn-Based Arena Match & Roll Initiative for all combatants
  const handleStartArenaMatch = () => {
    const roster: ArenaCombatant[] = [];

    // 1. Spawn Team Gold (Left side of Arena)
    const goldHeroes = goldHeroIds
      .map((id) => heroPool.find((h) => h.id === id))
      .filter(Boolean) as Character[];

    if (goldHeroes.length === 0 && heroPool[0]) {
      goldHeroes.push(heroPool[0]);
    }

    goldHeroes.forEach((hero, idx) => {
      const d20 = Math.floor(Math.random() * 20) + 1;
      const initBonus = typeof hero.initiativeBonus === 'number' ? hero.initiativeBonus : 2;
      const startRow = Math.min(ARENA_ROWS - 2, Math.max(2, 4 + idx * 2));
      roster.push({
        id: `arena_gold_${idx}_${Date.now()}`,
        name: hero.name,
        team: 'gold',
        isAI: false,
        avatarUrl: hero.avatarUrl || getCharacterTokenUrl(hero.name),
        raceOrType: hero.race || 'Hero',
        classOrCr: hero.classLevel || 'Level 5',
        ac: hero.ac || 16,
        currentHp: hero.maxHp || hero.hp || 45,
        maxHp: hero.maxHp || hero.hp || 45,
        tempHp: 0,
        speedFt: 30,
        remainingMoveFt: 30,
        initiativeBonus: initBonus,
        initiativeRoll: d20 + initBonus,
        x: 3 * ARENA_GRID_SIZE,
        y: startRow * ARENA_GRID_SIZE,
        size: 1,
        conditions: [],
        actionUsed: false,
        bonusActionUsed: false,
        sourceCharacter: hero
      });
    });

    // 2. Spawn Team Crimson (Right side of Arena)
    if (matchMode === '1v1' || matchMode === '2v2') {
      const countNeeded = matchMode === '1v1' ? 1 : 2;
      const crimsonHeroes = crimsonHeroIds
        .slice(0, countNeeded)
        .map((id) => heroPool.find((h) => h.id === id))
        .filter(Boolean) as Character[];

      crimsonHeroes.forEach((hero, idx) => {
        const d20 = Math.floor(Math.random() * 20) + 1;
        const initBonus = typeof hero.initiativeBonus === 'number' ? hero.initiativeBonus : 2;
        const startRow = Math.min(ARENA_ROWS - 2, Math.max(2, 4 + idx * 3));
        roster.push({
          id: `arena_crimson_hero_${idx}_${Date.now()}`,
          name: crimsonIsAI ? `${hero.name} (AI Rival)` : hero.name,
          team: 'crimson',
          isAI: crimsonIsAI,
          avatarUrl: hero.avatarUrl || getCharacterTokenUrl(hero.name),
          raceOrType: hero.race || 'Rival Hero',
          classOrCr: hero.classLevel || 'Level 5',
          ac: hero.ac || 16,
          currentHp: hero.maxHp || hero.hp || 45,
          maxHp: hero.maxHp || hero.hp || 45,
          tempHp: 0,
          speedFt: 30,
          remainingMoveFt: 30,
          initiativeBonus: initBonus,
          initiativeRoll: d20 + initBonus,
          x: (ARENA_COLS - 4) * ARENA_GRID_SIZE,
          y: startRow * ARENA_GRID_SIZE,
          size: 1,
          conditions: [],
          actionUsed: false,
          bonusActionUsed: false,
          sourceCharacter: hero
        });
      });
    } else {
      // vs_npcs or random_encounter
      const monstersToSpawn =
        draftedMonsters.length > 0
          ? draftedMonsters
          : generateScaledRandomEncounter(goldHeroes.length, difficulty, monsterPool);

      monstersToSpawn.forEach((mon, idx) => {
        const d20 = Math.floor(Math.random() * 20) + 1;
        const initBonus = mon.initiativeBonus ?? Math.floor(((mon.dex || 12) - 10) / 2);
        const startRow = Math.min(ARENA_ROWS - 3, Math.max(2, 3 + idx * 2));
        const sizeSq = mon.size === 'Huge' || mon.size === 'Gargantuan' ? 3 : mon.size === 'Large' ? 2 : 1;
        const duplicateCount = monstersToSpawn.slice(0, idx).filter((m) => m.name === mon.name).length;
        const displayName = duplicateCount > 0 ? `${mon.name} #${duplicateCount + 1}` : mon.name;

        roster.push({
          id: `arena_crimson_mon_${idx}_${Date.now()}`,
          name: displayName,
          team: 'crimson',
          isAI: true,
          avatarUrl: mon.avatarUrl || 'https://www.dndbeyond.com/avatars/thumbnails/30783/955/1000/1000/638062024584880857.png',
          raceOrType: `${mon.size} ${mon.type}`,
          classOrCr: `CR ${mon.challenge?.split(' ')[0] || '1'}`,
          ac: mon.ac || 14,
          currentHp: mon.hp || 45,
          maxHp: mon.hp || 45,
          tempHp: 0,
          speedFt: 30,
          remainingMoveFt: 30,
          initiativeBonus: initBonus,
          initiativeRoll: d20 + initBonus,
          x: (ARENA_COLS - 5 - (idx % 2)) * ARENA_GRID_SIZE,
          y: startRow * ARENA_GRID_SIZE,
          size: sizeSq,
          isFlying: mon.speed?.toLowerCase().includes('fly'),
          elevation: mon.speed?.toLowerCase().includes('fly') ? 15 : 0,
          conditions: [],
          actionUsed: false,
          bonusActionUsed: false,
          sourceMonster: mon
        });
      });
    }

    // Sort by Initiative Roll descending
    roster.sort((a, b) => b.initiativeRoll - a.initiativeRoll);

    setCombatants(roster);
    setTurnIndex(0);
    setRound(1);
    setWinnerTeam(null);
    setActiveTargetingAction(null);
    setCombatLogs([
      {
        id: `init_log_${Date.now()}`,
        round: 1,
        actorName: 'Arena Announcer',
        team: 'gold',
        message: `⚔️ Battle Commenced! Initiative rolled for ${roster.length} combatants.`,
        detail: roster.map((r) => `${r.name}: ${r.initiativeRoll}`).join(' • '),
        timestamp: Date.now()
      }
    ]);

    // Center Arena Stage nicely for both Mobile & Desktop
    fitArenaCamera(dimensions.width, dimensions.height);
    if (dimensions.width < 768) {
      setShowCombatFeed(false);
    }

    setPhase('battle');
    soundCatalog.play('thunder_boom', 0.85);
    toast.success(`⚔️ Arena Match Started! ${roster[0]?.name} leads Initiative (${roster[0]?.initiativeRoll})!`);
  };

  const activeCombatant = combatants[turnIndex] || null;

  // Check for Victory / Defeat whenever combatants HP changes
  useEffect(() => {
    if (phase !== 'battle' || combatants.length === 0 || winnerTeam) return;
    const goldAlive = combatants.some((c) => c.team === 'gold' && c.currentHp > 0);
    const crimsonAlive = combatants.some((c) => c.team === 'crimson' && c.currentHp > 0);

    if (!crimsonAlive && goldAlive) {
      setWinnerTeam('gold');
      soundCatalog.play('radiant_burst', 0.95);
      toast.success('🏆 Victory! Team Gold triumphs in the Arena!');
    } else if (!goldAlive && crimsonAlive) {
      setWinnerTeam('crimson');
      soundCatalog.play('thunder_boom', 0.9);
      toast.error('💀 Team Crimson claims victory in the Arena!');
    }
  }, [combatants, phase, winnerTeam]);

  // Advance to the next living combatant's turn
  const handleAdvanceTurn = useCallback(() => {
    setActiveTargetingAction(null);
    setCombatants((prev) => {
      if (prev.length === 0) return prev;
      let nextIdx = (turnIndex + 1) % prev.length;
      let wrappedRound = nextIdx === 0;
      let safety = 0;
      while (prev[nextIdx].currentHp <= 0 && safety < prev.length) {
        nextIdx = (nextIdx + 1) % prev.length;
        if (nextIdx === 0) wrappedRound = true;
        safety++;
      }

      if (wrappedRound) {
        setRound((r) => r + 1);
      }
      setTurnIndex(nextIdx);

      return prev.map((c, idx) =>
        idx === nextIdx
          ? {
              ...c,
              remainingMoveFt: c.speedFt,
              actionUsed: false,
              bonusActionUsed: false
            }
          : c
      );
    });
  }, [turnIndex]);

  const [liveDdbHudMap, setLiveDdbHudMap] = useState<Record<string, HudCharacterData>>({});
  const [inspectedAuraRequest, setInspectedAuraRequest] = useState<{
    effect: VttEffectInstance;
    nonce: number;
  } | null>(null);
  const [inspectedRule, setInspectedRule] = useState<DndRuleEntry | null>(null);

  // Fetch live D&D Beyond HUD data for the active combatant if they have a ddbCharacterId
  useEffect(() => {
    const ddbId = activeCombatant?.sourceCharacter?.ddbCharacterId;
    if (!ddbId || liveDdbHudMap[String(ddbId)]) return;
    let cancelled = false;
    fetch(`/api/ddb/characters/${ddbId}/hud-data`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled && json?.hudData) {
          setLiveDdbHudMap((prev) => ({ ...prev, [String(ddbId)]: json.hudData }));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeCombatant, liveDdbHudMap]);

  // Spawn a JB2A Visual Effect between caster and target (or targetPointPx)
  const spawnArenaVisualEffect = useCallback(
    (
      caster: ArenaCombatant,
      target: ArenaCombatant,
      action: HudActionItem,
      targetPointPx?: { x: number; y: number }
    ) => {
      const asset =
        findJb2aAsset(action.jb2aAssetId || '') ||
        findJb2aAsset(action.name) ||
        findJb2aAsset(
          action.isHeal ? 'cure_wounds' : (action.rangeFt || 5) > 10 ? 'fire_bolt' : 'attack_slash'
        );

      if (!asset) return;

      const casterCenter = {
        x: caster.x + ((caster.size || 1) * ARENA_GRID_SIZE) / 2,
        y: caster.y + ((caster.size || 1) * ARENA_GRID_SIZE) / 2
      };
      const targetCenter = targetPointPx || {
        x: target.x + ((target.size || 1) * ARENA_GRID_SIZE) / 2,
        y: target.y + ((target.size || 1) * ARENA_GRID_SIZE) / 2
      };

      const lowerName = action.name.toLowerCase();
      const auraRule = lookupDndRuleDetails(action.name, 'aura');
      const isPersistentAura = Boolean(
        asset.defaultPersistent ||
          lowerName.includes('spirit guardians') ||
          lowerName.includes('aura of') ||
          lowerName.includes('holy aura') ||
          lowerName.includes('pass without trace') ||
          lowerName.includes('beacon of hope') ||
          lowerName.includes('shield of faith') ||
          lowerName.includes('sanctuary') ||
          lowerName.includes('haste') ||
          lowerName.includes('mirror image') ||
          lowerName.includes('armor of agathys') ||
          lowerName.includes('fire shield') ||
          lowerName.includes('darkness') ||
          lowerName.includes('silence') ||
          lowerName.includes('fog cloud')
      );

      const attachToTokenId =
        isPersistentAura && !targetPointPx
          ? action.isSelfAction
            ? caster.id
            : target.id
          : undefined;

      const dx = targetCenter.x - casterCenter.x;
      const dy = targetCenter.y - casterCenter.y;
      const angleDeg = dx === 0 && dy === 0 ? 0 : (Math.atan2(dy, dx) * 180) / Math.PI;
      const isDirectional =
        asset.paradigm === 'cone' ||
        asset.paradigm === 'line' ||
        asset.paradigm === 'beam' ||
        asset.paradigm === 'projectile';

      const sizeFt =
        auraRule?.radiusFeet && isPersistentAura
          ? auraRule.radiusFeet * 2
          : asset.defaultSizeFt || 10;

      const isProjectile = asset.paradigm === 'projectile' && caster.id !== target.id;

      const newFx: VttEffectInstance = {
        id: `arena_fx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        assetKey: asset.id,
        name: action.name,
        videoUrl: asset.webm,
        loopVideoUrl: asset.loopWebm || (isPersistentAura ? asset.webm : undefined),
        paradigm: isPersistentAura && attachToTokenId ? 'token_aura' : asset.paradigm,
        x: isProjectile ? casterCenter.x : targetCenter.x,
        y: isProjectile ? casterCenter.y : targetCenter.y,
        originX: casterCenter.x,
        originY: casterCenter.y,
        targetX: targetCenter.x,
        targetY: targetCenter.y,
        sizeFt,
        widthFt: asset.defaultWidthFt,
        rotation: isDirectional ? angleDeg : 0,
        opacity: 1,
        blendMode: asset.blendMode || 'screen',
        isPersistent: isPersistentAura,
        durationMs: isPersistentAura ? 600000 : asset.defaultDurationMs || 1800,
        loop: isPersistentAura,
        castTime: Date.now(),
        soundKey: asset.soundKey,
        casterName: caster.name,
        attachedTokenId: attachToTokenId,
        castAtLevel: action.castAtLevel ?? action.level,
        baseSpellLevel: action.baseSpellLevel ?? action.level,
        damageFormula: action.damageFormula,
        damageType: action.damageType,
        saveDc: action.saveDc,
        saveAbility: action.saveAbility,
        isHeal: action.isHeal,
        actionSnapshot: action,
        trajectory: isProjectile
          ? {
              currentX: casterCenter.x,
              currentY: casterCenter.y,
              targetX: targetCenter.x,
              targetY: targetCenter.y,
              speedPxPerSec: 950
            }
          : undefined
      };

      setArenaEffects((prev) => {
        // If replacing an existing persistent aura of the same name on the same token, replace it cleanly
        const filtered = isPersistentAura
          ? prev.filter(
              (f) =>
                !(
                  f.isPersistent &&
                  f.attachedTokenId === attachToTokenId &&
                  f.name.toLowerCase() === action.name.toLowerCase()
                )
            )
          : prev;
        return [...filtered, newFx];
      });
      if (asset.soundKey) {
        soundCatalog.play(asset.soundKey, 0.8);
      } else {
        soundCatalog.play(action.isHeal ? 'radiant_heal' : 'sword_slash', 0.75);
      }
    },
    []
  );

  // Execute an Attack, Spell, Aura, Teleport, or Heal from `actor` onto `target` (or `targetPointPx`)
  const executeCombatAction = useCallback(
    (
      actor: ArenaCombatant,
      target: ArenaCombatant,
      action: HudActionItem,
      targetPointPx?: { x: number; y: number }
    ) => {
      const actorCx = actor.x + ((actor.size || 1) * ARENA_GRID_SIZE) / 2;
      const actorCy = actor.y + ((actor.size || 1) * ARENA_GRID_SIZE) / 2;
      const targetCx = targetPointPx
        ? targetPointPx.x
        : target.x + ((target.size || 1) * ARENA_GRID_SIZE) / 2;
      const targetCy = targetPointPx
        ? targetPointPx.y
        : target.y + ((target.size || 1) * ARENA_GRID_SIZE) / 2;
      const distFt = Math.max(
        0,
        Math.round((Math.hypot(targetCx - actorCx, targetCy - actorCy) / ARENA_GRID_SIZE) * 5) -
          (actor.size - 1 + (target.size - 1)) * 2.5
      );

      const maxRangeFt = action.rangeFt && action.rangeFt > 0 ? action.rangeFt : 5;
      if (!action.isSelfAction && actor.id !== target.id && distFt > maxRangeFt + 5) {
        if (actor.isAI) {
          return false;
        }
        // Never prevent human players from attacking/casting due to distance — show advisory note only!
        toast.info(
          `📏 Note: ${target.name} is ${distFt} ft away (normal range ${maxRangeFt} ft) — resolving ${action.name}!`
        );
      }

      const lowerName = action.name.toLowerCase();
      const markActorUsed = (c: ArenaCombatant) =>
        action.type === 'bonus_action'
          ? { ...c, bonusActionUsed: true }
          : { ...c, actionUsed: true };

      // 1. Special Self Utility Actions: Dash / Disengage / Dodge
      if (action.id === 'arena-dash' || lowerName.startsWith('dash')) {
        setCombatants((prev) =>
          prev.map((c) =>
            c.id === actor.id
              ? { ...c, remainingMoveFt: c.remainingMoveFt + c.speedFt, actionUsed: true }
              : c
          )
        );
        addCombatLog(actor.name, actor.team, `used Dash (+${actor.speedFt} ft movement)!`);
        soundCatalog.play('wind_whoosh', 0.7);
        return true;
      }
      if (lowerName === 'disengage' || lowerName === 'dodge' || lowerName === 'hide') {
        setCombatants((prev) => prev.map((c) => (c.id === actor.id ? markActorUsed(c) : c)));
        addCombatLog(actor.name, actor.team, `used ${action.name}!`, action.description);
        soundCatalog.play('wind_whoosh', 0.65);
        return true;
      }

      // 2. Teleport Spells & Abilities (Misty Step, Dimension Door, Teleport, Thunder Step, Cloud's Jaunt, Arcane Charge)
      const isSelfTeleport =
        lowerName.includes('misty step') ||
        lowerName.includes('dimension door') ||
        lowerName === 'teleport' ||
        lowerName.includes('thunder step') ||
        lowerName.includes('jaunt') ||
        lowerName.includes('arcane charge');

      if (isSelfTeleport) {
        const destX = targetPointPx
          ? Math.floor(targetPointPx.x / ARENA_GRID_SIZE) * ARENA_GRID_SIZE
          : target.x;
        const destY = targetPointPx
          ? Math.floor(targetPointPx.y / ARENA_GRID_SIZE) * ARENA_GRID_SIZE
          : target.y;
        spawnArenaVisualEffect(actor, actor, action);
        setCombatants((prev) =>
          prev.map((c) =>
            c.id === actor.id ? { ...markActorUsed(c), x: destX, y: destY } : c
          )
        );
        spawnArenaVisualEffect(
          { ...actor, x: destX, y: destY },
          { ...actor, x: destX, y: destY },
          action
        );
        addCombatLog(
          actor.name,
          actor.team,
          `cast ${action.name} and teleported across the Arena!`,
          action.description
        );
        return true;
      }

      // Play JB2A visual effect (including persistent token-locked auras!)
      spawnArenaVisualEffect(actor, target, action, targetPointPx);

      // 3. Healing Action / Spell
      if (action.isHeal) {
        const healRoll = rollDiceFormula(action.damageFormula || '2d8 + 4', false);
        if (onTrigger3dDice && action.damageFormula) {
          onTrigger3dDice({
            id: `arena-heal-${Date.now()}`,
            characterName: actor.name,
            action: `${action.name} (Heal)`,
            rollType: 'heal',
            formula: `${action.damageFormula} = ${healRoll.total}`,
            diceNotation: action.damageFormula || '2d8',
            dice: healRoll.rolls.map((r) => ({
              sides: healRoll.sides,
              result: r,
              type: `d${healRoll.sides}`
            })),
            total: healRoll.total,
            timestamp: Date.now(),
            source: 'player'
          });
        }

        setCombatants((prev) =>
          prev.map((c) => {
            if (c.id === target.id) {
              return {
                ...c,
                currentHp: Math.min(c.maxHp, c.currentHp + healRoll.total),
                ...(c.id === actor.id ? markActorUsed(c) : {})
              };
            }
            if (c.id === actor.id) {
              return markActorUsed(c);
            }
            return c;
          })
        );

        addCombatLog(
          actor.name,
          actor.team,
          `healed ${target.name} with ${action.name} for +${healRoll.total} HP!`,
          healRoll.breakdown
        );
        return true;
      }

      // 4. Auto-Hit Spells (Magic Missile)
      if (lowerName.includes('magic missile')) {
        const dmgRoll = rollDiceFormula(action.damageFormula || '3d4 + 3', false);
        if (onTrigger3dDice) {
          onTrigger3dDice({
            id: `arena-mm-${Date.now()}`,
            characterName: actor.name,
            action: `${action.name} (Force Darts)`,
            rollType: 'damage',
            formula: `${action.damageFormula || '3d4 + 3'} = ${dmgRoll.total}`,
            diceNotation: action.damageFormula || '3d4+3',
            dice: dmgRoll.rolls.map((r) => ({
              sides: dmgRoll.sides,
              result: r,
              type: `d${dmgRoll.sides}`
            })),
            total: dmgRoll.total,
            timestamp: Date.now(),
            source: 'player'
          });
        }
        setCombatants((prev) =>
          prev.map((c) => {
            if (c.id === target.id) {
              return { ...c, currentHp: Math.max(0, c.currentHp - dmgRoll.total) };
            }
            if (c.id === actor.id) return markActorUsed(c);
            return c;
          })
        );
        addCombatLog(
          actor.name,
          actor.team,
          `struck ${target.name} with unerring ${action.name} darts for ${dmgRoll.total} force damage!`,
          `Auto-Hit • Damage: ${dmgRoll.breakdown}`
        );
        return true;
      }

      // 5. Persistent Damaging Auras cast on Self (e.g., Spirit Guardians)
      if (lowerName.includes('spirit guardians')) {
        const dmgRoll = rollDiceFormula(action.damageFormula || '3d8', false);
        const dc = Number(action.saveDc) || 16;
        if (onTrigger3dDice) {
          onTrigger3dDice({
            id: `arena-sg-${Date.now()}`,
            characterName: actor.name,
            action: `${action.name}${action.castAtLevel ? ` (L${action.castAtLevel})` : ''}`,
            rollType: 'damage',
            formula: `${action.damageFormula || '3d8'} = ${dmgRoll.total}`,
            diceNotation: action.damageFormula || '3d8',
            dice: dmgRoll.rolls.map((r) => ({
              sides: dmgRoll.sides,
              result: r,
              type: `d${dmgRoll.sides}`
            })),
            total: dmgRoll.total,
            timestamp: Date.now(),
            source: 'player'
          });
        }

        const hitSummaries: string[] = [];
        setCombatants((prev) =>
          prev.map((c) => {
            if (c.id === actor.id) return markActorUsed(c);
            if (c.team !== actor.team && c.currentHp > 0) {
              const ecx = c.x + ((c.size || 1) * ARENA_GRID_SIZE) / 2;
              const ecy = c.y + ((c.size || 1) * ARENA_GRID_SIZE) / 2;
              const d = Math.round((Math.hypot(ecx - actorCx, ecy - actorCy) / ARENA_GRID_SIZE) * 5);
              if (d <= 15) {
                const saveRoll = Math.floor(Math.random() * 20) + 1 + 2;
                const saved = saveRoll >= dc;
                const applied = saved ? Math.floor(dmgRoll.total / 2) : dmgRoll.total;
                hitSummaries.push(
                  `${c.name} WIS Save ${saveRoll} vs DC ${dc} (${saved ? 'Half' : 'Full'}: ${applied} dmg)`
                );
                return { ...c, currentHp: Math.max(0, c.currentHp - applied) };
              }
            }
            return c;
          })
        );

        addCombatLog(
          actor.name,
          actor.team,
          `activated ${action.name}${action.castAtLevel ? ` (Slot Level ${action.castAtLevel})` : ''} — 15ft Radiant Aura (${action.damageFormula || '3d8'})!`,
          hitSummaries.length > 0
            ? `${hitSummaries.join(' • ')} • Roll: ${dmgRoll.breakdown}`
            : `Rolled ${dmgRoll.total} (${dmgRoll.breakdown}) radiant aura damage • Click aura title on token to inspect!`
        );
        return true;
      }

      // 6. Saving Throw Spells (Fireball, Sacred Flame, Toll the Dead, Thunderwave, Shatter, Lightning Bolt, Sunbeam, Hold Person, etc.)
      if (action.saveDc && !action.isAttack) {
        const dc = Number(action.saveDc) || 15;
        const saveAbil = action.saveAbility || 'DEX';
        const isCantrip = (action.level ?? 0) === 0;
        const rule = lookupDndRuleDetails(action.name, 'spell');
        const aoeRadiusFt = rule?.radiusFeet || (lowerName.includes('fireball') ? 20 : lowerName.includes('shatter') || lowerName.includes('flame strike') ? 10 : 0);

        const dmgRoll = action.damageFormula
          ? rollDiceFormula(action.damageFormula, false)
          : null;

        if (dmgRoll && onTrigger3dDice) {
          onTrigger3dDice({
            id: `arena-save-dmg-${Date.now()}`,
            characterName: actor.name,
            action: `${action.name} (${saveAbil} DC ${dc})`,
            rollType: 'damage',
            formula: `${action.damageFormula} = ${dmgRoll.total}`,
            diceNotation: action.damageFormula || '3d8',
            dice: dmgRoll.rolls.map((r) => ({
              sides: dmgRoll.sides,
              result: r,
              type: `d${dmgRoll.sides}`
            })),
            total: dmgRoll.total,
            timestamp: Date.now(),
            source: 'player'
          });
        }

        const affectedTargets =
          aoeRadiusFt >= 10
            ? combatants.filter((c) => {
                if (c.team === actor.team || c.currentHp <= 0) return false;
                const cx = c.x + ((c.size || 1) * ARENA_GRID_SIZE) / 2;
                const cy = c.y + ((c.size || 1) * ARENA_GRID_SIZE) / 2;
                const distFromCenterFt = Math.round(
                  (Math.hypot(cx - targetCx, cy - targetCy) / ARENA_GRID_SIZE) * 5
                );
                return distFromCenterFt <= aoeRadiusFt;
              })
            : [target];

        const targetsToProcess = affectedTargets.length > 0 ? affectedTargets : [target];
        const saveSummaries: string[] = [];
        const damageMap = new Map<string, number>();
        const conditionMap = new Map<string, string>();

        targetsToProcess.forEach((t) => {
          const saveD20 = Math.floor(Math.random() * 20) + 1;
          const saveBonus = 2;
          const saveTotal = saveD20 + saveBonus;
          const saved = saveTotal >= dc;

          if (dmgRoll) {
            const dmgTaken = saved
              ? isCantrip || lowerName.includes('disintegrate')
                ? 0
                : Math.floor(dmgRoll.total / 2)
              : dmgRoll.total;
            damageMap.set(t.id, dmgTaken);
            saveSummaries.push(
              `${t.name}: ${saveAbil} Save ${saveTotal} (${saved ? 'SAVED' : 'FAILED'}) → ${dmgTaken} ${action.damageType || ''} dmg`
            );
          } else {
            if (!saved) {
              const cond =
                lowerName.includes('hold')
                  ? 'Paralyzed'
                  : lowerName.includes('hypnotic')
                  ? 'Incapacitated'
                  : lowerName.includes('entangle') || lowerName.includes('web')
                  ? 'Restrained'
                  : lowerName.includes('faerie fire')
                  ? 'Outlined (Adv)'
                  : lowerName.includes('banishment')
                  ? 'Banished'
                  : 'Affected';
              conditionMap.set(t.id, cond);
            }
            saveSummaries.push(
              `${t.name}: ${saveAbil} Save ${saveTotal} vs DC ${dc} (${saved ? 'SAVED' : 'FAILED!'})`
            );
          }
        });

        setCombatants((prev) =>
          prev.map((c) => {
            let updated = c;
            if (damageMap.has(c.id)) {
              updated = {
                ...updated,
                currentHp: Math.max(0, updated.currentHp - (damageMap.get(c.id) || 0))
              };
            }
            if (conditionMap.has(c.id)) {
              const cond = conditionMap.get(c.id)!;
              if (!updated.conditions.includes(cond)) {
                updated = { ...updated, conditions: [...updated.conditions, cond] };
              }
            }
            if (c.id === actor.id) {
              updated = markActorUsed(updated);
            }
            return updated;
          })
        );

        addCombatLog(
          actor.name,
          actor.team,
          `cast ${action.name}${action.castAtLevel ? ` (L${action.castAtLevel})` : ''} (${saveAbil} Save DC ${dc})!`,
          `${saveSummaries.join(' • ')}${dmgRoll ? ` • Roll: ${dmgRoll.breakdown}` : ''}`
        );
        return true;
      }

      // 7. Buff / Utility / Ward / Feature Actions without Attack Roll or Saving Throw (Shield, Bless, Haste, Mirror Image, Rage, etc.)
      if (!action.isAttack && !action.hitBonus) {
        const tempHpGain = lowerName.includes('armor of agathys')
          ? (action.castAtLevel || 1) * 5
          : lowerName.includes('wild shape')
          ? 18
          : 0;
        const acBonus =
          lowerName === 'shield'
            ? 5
            : lowerName.includes('shield of faith') || lowerName === 'haste'
            ? 2
            : 0;

        setCombatants((prev) =>
          prev.map((c) => {
            let updated = c;
            if (c.id === target.id && (tempHpGain > 0 || acBonus > 0)) {
              updated = {
                ...updated,
                tempHp: Math.max(updated.tempHp, tempHpGain),
                ac: updated.ac + acBonus
              };
            }
            if (c.id === actor.id) {
              updated = markActorUsed(updated);
            }
            return updated;
          })
        );

        addCombatLog(
          actor.name,
          actor.team,
          `activated ${action.name}${target.id !== actor.id ? ` on ${target.name}` : ''}!`,
          action.description
        );
        return true;
      }

      // 8. Offensive Weapon or Spell Attack Roll
      const rawHitBonus = parseInt(String(action.hitBonus || '+6').replace('+', ''), 10) || 6;

      // D&D 5e Close Combat Disadvantage: Ranged attacks have Disadvantage when a hostile enemy is within 5ft melee reach
      const isRanged =
        (action.rangeFt && action.rangeFt >= 20) ||
        action.description?.toLowerCase().includes('ranged');
      let isThreatened = false;
      if (isRanged) {
        isThreatened = combatants.some((other) => {
          if (other.id === actor.id || other.team === actor.team || other.currentHp <= 0)
            return false;
          const ocx = other.x + ((other.size || 1) * ARENA_GRID_SIZE) / 2;
          const ocy = other.y + ((other.size || 1) * ARENA_GRID_SIZE) / 2;
          const distFromOther = Math.max(
            0,
            Math.round((Math.hypot(ocx - actorCx, ocy - actorCy) / ARENA_GRID_SIZE) * 5) -
              (actor.size - 1 + (other.size - 1)) * 2.5
          );
          return distFromOther <= 5;
        });
      }

      const d20Roll1 = Math.floor(Math.random() * 20) + 1;
      const d20Roll2 = Math.floor(Math.random() * 20) + 1;
      const d20 = isThreatened ? Math.min(d20Roll1, d20Roll2) : d20Roll1;
      const isCrit = d20 === 20;
      const isFumble = d20 === 1;
      const attackTotal = d20 + rawHitBonus;

      const rollFormula = isThreatened
        ? `1d20 Disadvantage [${d20Roll1}, ${d20Roll2}] (${d20}) + ${rawHitBonus} = ${attackTotal}`
        : `1d20 (${d20}) + ${rawHitBonus} = ${attackTotal}`;

      if (onTrigger3dDice) {
        onTrigger3dDice({
          id: `arena-atk-${Date.now()}`,
          characterName: actor.name,
          action: isThreatened ? `${action.name} (Disadvantage)` : action.name,
          rollType: 'attack',
          formula: rollFormula,
          diceNotation: isThreatened ? '2d20kl1' : '1d20',
          dice: isThreatened
            ? [
                { sides: 20, result: d20Roll1, type: 'd20' },
                { sides: 20, result: d20Roll2, type: 'd20' }
              ]
            : [{ sides: 20, result: d20, type: 'd20' }],
          total: attackTotal,
          isCritical: isCrit,
          isFumble,
          timestamp: Date.now(),
          source: 'player'
        });
      }

      const hitsTarget = isCrit || (!isFumble && attackTotal >= target.ac);

      if (!hitsTarget) {
        setCombatants((prev) => prev.map((c) => (c.id === actor.id ? markActorUsed(c) : c)));
        addCombatLog(
          actor.name,
          actor.team,
          `attacked ${target.name} with ${action.name}${isThreatened ? ' (Disadvantage: enemy in 5ft melee)' : ''} — MISS!`,
          `Rolled ${attackTotal} (${rollFormula}) vs AC ${target.ac}`
        );
        soundCatalog.play('shield_clash', 0.65);
        return true;
      }

      // Roll Damage
      const dmgRoll = rollDiceFormula(action.damageFormula || '1d10 + 4', isCrit);
      setCombatants((prev) =>
        prev.map((c) => {
          if (c.id === target.id) {
            const nextHp = Math.max(0, c.currentHp - dmgRoll.total);
            return { ...c, currentHp: nextHp };
          }
          if (c.id === actor.id) {
            return markActorUsed(c);
          }
          return c;
        })
      );

      addCombatLog(
        actor.name,
        actor.team,
        `${isCrit ? '💥 CRITICAL HIT!' : 'hit'} ${target.name} with ${action.name}${isThreatened ? ' (Disadvantage)' : ''} for ${dmgRoll.total} ${action.damageType || ''} damage!`,
        `To Hit: ${attackTotal} (${rollFormula}) vs AC ${target.ac} • Damage: ${dmgRoll.breakdown}`,
        isCrit
      );
      return true;
    },
    [combatants, addCombatLog, onTrigger3dDice, spawnArenaVisualEffect]
  );

  // ============================================================================
  // AUTONOMOUS TACTICAL NPC / AI TURN CONTROLLER
  // Powered by YUKA Goal-Oriented AI + XState 5e Action Economy + ROT.js
  // ============================================================================
  useEffect(() => {
    if (phase !== 'battle' || !activeCombatant || !activeCombatant.isAI || winnerTeam) {
      setAiTacticalBanner(null);
      setAiPathPreviewPx([]);
      return;
    }
    if (activeCombatant.currentHp <= 0) {
      handleAdvanceTurn();
      return;
    }

    let cancelled = false;
    const timers: number[] = [];

    const aiStartTimer = window.setTimeout(() => {
      if (cancelled) return;

      const aiHud = buildArenaCombatantHudData(activeCombatant);

      // 1. D&D 5e Monster Recharge Check (e.g., Breath Weapon Recharge 5-6)
      const currentRechargeMap: Record<string, boolean> = { ...(activeCombatant.rechargeStatus || {}) };
      const rechargeEligibleActions = aiHud.actions.filter(
        (a) =>
          a.description.toLowerCase().includes('recharge') ||
          a.name.toLowerCase().includes('breath')
      );
      const rechargedAbilities: string[] = [];

      for (const ra of rechargeEligibleActions) {
        if (currentRechargeMap[ra.name] === false) {
          const notation =
            ra.description.toLowerCase().includes('recharge 6') &&
            !ra.description.toLowerCase().includes('5-6')
              ? '6'
              : '5-6';
          const { recharged, roll } = roll5eRechargeCheck(notation);
          if (recharged) {
            currentRechargeMap[ra.name] = true;
            rechargedAbilities.push(ra.name);
            addCombatLog(
              activeCombatant.name,
              activeCombatant.team,
              `🎲 Recharge Check (1d6 = ${roll}): ${ra.name} is RECHARGED!`
            );
            soundCatalog.play('spell_buff', 0.6);
          } else {
            addCombatLog(
              activeCombatant.name,
              activeCombatant.team,
              `🎲 Recharge Check (1d6 = ${roll}): ${ra.name} failed to recharge this round.`
            );
          }
        } else {
          rechargedAbilities.push(ra.name);
        }
      }

      // Update monster's recharge state if changed
      setCombatants((prev) =>
        prev.map((c) =>
          c.id === activeCombatant.id ? { ...c, rechargeStatus: currentRechargeMap } : c
        )
      );

      // 2. Plan Turn using YUKA Goal-Oriented AI Brain
      const yukaBrain = new YukaArenaMonsterBrain();
      const goal = yukaBrain.planTurn(
        activeCombatant,
        combatants,
        aiHud,
        ARENA_COLS,
        ARENA_ROWS,
        ARENA_GRID_SIZE,
        rechargedAbilities
      );

      setAiTacticalBanner(goal.reason);

      // 3. Build A* trail preview points
      if (goal.pathWaypointsPx.length > 0) {
        setAiPathPreviewPx([
          { x: activeCombatant.x, y: activeCombatant.y },
          ...goal.pathWaypointsPx
        ]);
      } else {
        setAiPathPreviewPx([]);
      }

      if (goal.useDash) {
        addCombatLog(
          activeCombatant.name,
          activeCombatant.team,
          `used Dash (+${activeCombatant.speedFt} ft) along A* path!`,
          goal.reason
        );
        soundCatalog.play('wind_whoosh', 0.65);
      }

      if (goal.useDisengage) {
        addCombatLog(
          activeCombatant.name,
          activeCombatant.team,
          `used Disengage to avoid opportunity attacks while repositioning!`,
          goal.reason
        );
      }

      // 4. Step-by-step grid movement animation (155ms per square)
      const stepDelayMs = 155;
      goal.pathWaypointsPx.forEach((wp, idx) => {
        const t = window.setTimeout(() => {
          if (cancelled) return;
          setCombatants((prev) =>
            prev.map((c) =>
              c.id === activeCombatant.id
                ? {
                    ...c,
                    x: wp.x,
                    y: wp.y,
                    remainingMoveFt: Math.max(0, c.speedFt - (idx + 1) * 5)
                  }
                : c
            )
          );
        }, (idx + 1) * stepDelayMs);
        timers.push(t);
      });

      const totalMoveMs = goal.pathWaypointsPx.length * stepDelayMs + 320;
      const updatedActor: ArenaCombatant = {
        ...activeCombatant,
        x: goal.finalPositionPx.x,
        y: goal.finalPositionPx.y,
        remainingMoveFt: Math.max(0, activeCombatant.speedFt - goal.plannedMovementFt)
      };

      // 5. Execute Action Sequence after movement completes
      const actionTimer = window.setTimeout(() => {
        if (cancelled) return;
        setAiPathPreviewPx([]);

        // CASE A: Multiattack sequence with dynamic target splitting
        if (goal.type === 'multiattack' && goal.attacksQueue.length > 0) {
          let currentTargetId = goal.targetId;

          goal.attacksQueue.forEach((strikeAction, strikeIdx) => {
            const strikeTimer = window.setTimeout(() => {
              if (cancelled) return;

              setCombatants((currentCombatants) => {
                const latestActor = currentCombatants.find((c) => c.id === updatedActor.id) || updatedActor;
                let targetObj = currentCombatants.find(
                  (c) => c.id === currentTargetId && c.currentHp > 0
                );

                // D&D 5e Dynamic Retargeting: If primary target is eliminated, split remaining attacks to next closest enemy
                if (!targetObj) {
                  const nextEnemy = currentCombatants
                    .filter((c) => c.team !== latestActor.team && c.currentHp > 0)
                    .sort((a, b) => {
                      const distA = Math.hypot(a.x - latestActor.x, a.y - latestActor.y);
                      const distB = Math.hypot(b.x - latestActor.x, b.y - latestActor.y);
                      return distA - distB;
                    })[0] || null;

                  if (nextEnemy) {
                    currentTargetId = nextEnemy.id;
                    targetObj = nextEnemy;
                    addCombatLog(
                      latestActor.name,
                      latestActor.team,
                      `Target eliminated! Redirecting strike #${strikeIdx + 1} (${strikeAction.name}) to ${nextEnemy.name}!`
                    );
                  }
                }

                if (targetObj) {
                  executeCombatAction(latestActor, targetObj, strikeAction);
                }
                return currentCombatants;
              });
            }, strikeIdx * 480);
            timers.push(strikeTimer);
          });
        } else if (goal.type === 'breath_weapon' && goal.actionItem) {
          // Signature recharge breath weapon used -> mark uncharged
          currentRechargeMap[goal.actionItem.name] = false;
          setCombatants((prev) =>
            prev.map((c) =>
              c.id === updatedActor.id ? { ...c, rechargeStatus: currentRechargeMap } : c
            )
          );
          const targetObj = combatants.find((c) => c.id === goal.targetId && c.currentHp > 0);
          if (targetObj) {
            executeCombatAction(updatedActor, targetObj, goal.actionItem);
          }
        } else if (goal.type === 'emergency_heal' && goal.actionItem) {
          executeCombatAction(updatedActor, updatedActor, goal.actionItem);
        } else if (goal.actionItem) {
          const targetObj = combatants.find((c) => c.id === goal.targetId && c.currentHp > 0);
          if (targetObj) {
            executeCombatAction(updatedActor, targetObj, goal.actionItem);
          }
        }

        // 6. Execute Bonus Action if planned
        const strikeCount = goal.type === 'multiattack' ? Math.max(1, goal.attacksQueue.length) : 1;
        const strikesTotalMs = strikeCount * 480;

        if (goal.bonusActionItem) {
          const bonusTimer = window.setTimeout(() => {
            if (cancelled) return;
            const bTarget =
              goal.bonusActionItem?.isSelfAction || goal.bonusActionItem?.isHeal
                ? updatedActor
                : combatants.find((c) => c.id === goal.targetId && c.currentHp > 0) || updatedActor;
            executeCombatAction(updatedActor, bTarget, goal.bonusActionItem!);
          }, strikesTotalMs + 200);
          timers.push(bonusTimer);
        }

        const bonusDelay = goal.bonusActionItem ? 750 : 0;
        const endTurnTimer = window.setTimeout(() => {
          if (cancelled) return;
          setAiTacticalBanner(null);
          handleAdvanceTurn();
        }, strikesTotalMs + bonusDelay + 850);
        timers.push(endTurnTimer);
      }, totalMoveMs);

      timers.push(actionTimer);
    }, 650);

    timers.push(aiStartTimer);

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [phase, activeCombatant, turnIndex, winnerTeam, combatants, executeCombatAction, handleAdvanceTurn, addCombatLog]);

  // Handle Player dragging their active token on the Arena grid
  const handleMoveArenaToken = useCallback(
    (tokenId: string, newX: number, newY: number) => {
      setCombatants((prev) =>
        prev.map((c) => {
          if (c.id !== tokenId) return c;
          const distSquares = Math.round(
            Math.hypot(newX - c.x, newY - c.y) / ARENA_GRID_SIZE
          );
          const moveCostFt = distSquares * 5;
          if (moveCostFt > c.remainingMoveFt) {
            toast.warning(
              `Only ${c.remainingMoveFt} ft of movement remaining this turn! (Use Dash for +${c.speedFt} ft)`
            );
            return c;
          }
          return {
            ...c,
            x: newX,
            y: newY,
            remainingMoveFt: Math.max(0, c.remainingMoveFt - moveCostFt)
          };
        })
      );
    },
    []
  );

  // Build `<PlayerHeroDock />` data for the currently active human-controlled fighter
  const activeHeroHudData = useMemo(() => {
    if (!activeCombatant) return null;
    const ddbId = activeCombatant.sourceCharacter?.ddbCharacterId;
    const liveHud = ddbId ? liveDdbHudMap[String(ddbId)] : null;
    return buildArenaCombatantHudData(activeCombatant, liveHud);
  }, [activeCombatant, liveDdbHudMap]);

  // Compute reachable 5ft grid cells for Tap-to-Move on Mobile & Desktop when it's a human player's turn
  const reachableMoveSquares = useMemo<Array<{ col: number; row: number }>>(() => {
    if (
      phase !== 'battle' ||
      !activeCombatant ||
      activeCombatant.isAI ||
      winnerTeam ||
      activeTargetingAction ||
      activeCombatant.remainingMoveFt < 5
    ) {
      return [];
    }
    const maxSteps = Math.floor(activeCombatant.remainingMoveFt / 5);
    const curCol = Math.round(activeCombatant.x / ARENA_GRID_SIZE);
    const curRow = Math.round(activeCombatant.y / ARENA_GRID_SIZE);
    const occupied = new Set<string>();
    combatants.forEach((c) => {
      if (c.id === activeCombatant.id || c.currentHp <= 0) return;
      const cCol = Math.round(c.x / ARENA_GRID_SIZE);
      const cRow = Math.round(c.y / ARENA_GRID_SIZE);
      const sz = Math.max(1, c.size || 1);
      for (let r = cRow; r < cRow + sz; r++) {
        for (let col = cCol; col < cCol + sz; col++) {
          occupied.add(`${col},${r}`);
        }
      }
    });

    const cells: Array<{ col: number; row: number }> = [];
    for (
      let r = Math.max(0, curRow - maxSteps);
      r <= Math.min(ARENA_ROWS - 1, curRow + maxSteps);
      r++
    ) {
      for (
        let c = Math.max(0, curCol - maxSteps);
        c <= Math.min(ARENA_COLS - 1, curCol + maxSteps);
        c++
      ) {
        if (c === curCol && r === curRow) continue;
        const distSq = Math.round(Math.hypot(c - curCol, r - curRow));
        if (distSq >= 1 && distSq <= maxSteps && !occupied.has(`${c},${r}`)) {
          cells.push({ col: c, row: r });
        }
      }
    }
    return cells;
  }, [phase, activeCombatant, winnerTeam, activeTargetingAction, combatants]);

  if (!isOpen) return null;

  // ==========================================================================
  // VIEW 1: PLAYER ARENA LOBBY & MATCH SETUP (MOBILE & DESKTOP RESPONSIVE)
  // ==========================================================================
  if (phase === 'lobby') {
    return (
      <div className="fixed inset-0 z-[220] bg-zinc-950/95 backdrop-blur-xl flex flex-col overflow-y-auto text-zinc-100 animate-in fade-in duration-200">
        {/* Top Lobby Bar */}
        <div className="px-3 py-2.5 sm:px-6 sm:py-4 bg-zinc-900/95 border-b border-zinc-800 flex items-center justify-between gap-2 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10 shrink-0">
              <Swords className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-lg font-extrabold font-mono tracking-tight text-white truncate">
                  MistWalker Battle Arena
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                  Stand-Alone Mode
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-400 truncate">
                1v1 • 2v2 • Scaled Random Encounters • vs NPCs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasLiveDmMap && (
              <button
                type="button"
                onClick={onExitArena}
                className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 text-[11px] sm:text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer animate-pulse"
              >
                <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden md:inline">DM Scene Active —</span>
                <span>Join DM</span>
              </button>
            )}
            <button
              type="button"
              onClick={onExitArena}
              className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-[11px] sm:text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Return to Campaign</span>
              <span className="sm:hidden">Exit</span>
            </button>
          </div>
        </div>

        {/* Lobby Main Content Grid */}
        <div className="max-w-6xl w-full mx-auto p-3.5 sm:p-6 pb-28 md:pb-8 space-y-5 flex-1">
          {/* Step 1: Select Arena Mode */}
          <div>
            <h2 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold mb-2.5 flex items-center gap-1.5">
              <Crown className="w-4 h-4" />
              <span>1. Select Arena Combat Mode</span>
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
              {[
                {
                  id: 'random_encounter' as const,
                  title: 'Random Encounter',
                  badge: 'Scaled vs AI',
                  desc: 'Balanced D&D 5e monster encounter scaled to the number of players.',
                  color: 'emerald'
                },
                {
                  id: '1v1' as const,
                  title: '1v1 Duel',
                  badge: 'PvP or vs AI',
                  desc: 'Head-to-head single combat with full D&D Beyond HUD & 3D dice.',
                  color: 'amber'
                },
                {
                  id: '2v2' as const,
                  title: '2v2 Skirmish',
                  badge: '2v2 Tag Team',
                  desc: 'Tactical tag-team battle with initiative, flanking & healing.',
                  color: 'blue'
                },
                {
                  id: 'vs_npcs' as const,
                  title: 'Party vs NPCs',
                  badge: 'Custom Pick',
                  desc: 'Hand-pick specific monsters or bosses from the Bestiary.',
                  color: 'purple'
                }
              ].map((m) => {
                const active = matchMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMatchMode(m.id)}
                    className={`p-3 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      active
                        ? 'bg-amber-500/15 border-amber-400 ring-1 ring-amber-400/50 shadow-xl'
                        : 'bg-zinc-900/80 hover:bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <span className="text-xs sm:text-sm font-mono font-bold text-white leading-tight">
                          {m.title}
                        </span>
                        {active && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />}
                      </div>
                      <span className="inline-block text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-950 text-amber-300 border border-zinc-800 mb-1.5">
                        {m.badge}
                      </span>
                      <p className="text-[11px] sm:text-xs text-zinc-400 leading-snug line-clamp-2 sm:line-clamp-none">
                        {m.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Fighter Roster & Random Encounter Scaler */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            {/* Left Side: Team Gold (Player Challengers) */}
            <div className="lg:col-span-6 bg-zinc-900/75 border border-amber-500/30 rounded-3xl p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
                  <div>
                    <h3 className="text-xs sm:text-sm font-mono font-bold text-amber-300">
                      Team Gold — Players ({goldHeroIds.length})
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-zinc-400">
                      Tap heroes to select ({matchMode === '1v1' ? 'Max 1' : matchMode === '2v2' ? 'Max 2' : '1–4 Players'})
                    </p>
                  </div>
                </div>
                {lobbyPlayers.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono shrink-0">
                    {lobbyPlayers.length} Online
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 sm:max-h-72 overflow-y-auto pr-1">
                {heroPool.map((hero) => {
                  const isSelected = goldHeroIds.includes(hero.id);
                  const maxAllowed = matchMode === '1v1' ? 1 : matchMode === '2v2' ? 2 : 4;
                  const avatar = hero.avatarUrl || getCharacterTokenUrl(hero.name);
                  return (
                    <button
                      key={hero.id}
                      type="button"
                      onClick={() => {
                        setGoldHeroIds((prev) => {
                          if (prev.includes(hero.id)) {
                            return prev.length > 1 ? prev.filter((id) => id !== hero.id) : prev;
                          }
                          if (maxAllowed === 1) return [hero.id];
                          if (prev.length >= maxAllowed) return [...prev.slice(1), hero.id];
                          return [...prev, hero.id];
                        });
                      }}
                      className={`p-2.5 sm:p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400 text-white shadow-md'
                          : 'bg-zinc-950/80 hover:bg-zinc-950 border-zinc-800 text-zinc-300'
                      }`}
                    >
                      <img
                        src={avatar}
                        alt={hero.name}
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover border border-amber-500/50 shrink-0 bg-zinc-900"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold truncate">{hero.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </div>
                        <div className="text-[10px] text-zinc-400 truncate">
                          {hero.race} • {hero.classLevel}
                        </div>
                        <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                          HP {hero.maxHp || hero.hp} • AC {hero.ac}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Side: Team Crimson (Opponents / Scaled Random Encounter) */}
            <div className="lg:col-span-6 bg-zinc-900/75 border border-rose-500/30 rounded-3xl p-4 sm:p-5 space-y-3.5">
              {matchMode === '1v1' || matchMode === '2v2' ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Swords className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400 shrink-0" />
                      <div>
                        <h3 className="text-xs sm:text-sm font-mono font-bold text-rose-300">
                          Team Crimson — Rivals ({matchMode === '1v1' ? '1' : '2'})
                        </h3>
                        <p className="text-[10px] sm:text-[11px] text-zinc-400">
                          Pass-and-Play or Tactical AI Rivals
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCrimsonIsAI((v) => !v)}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono font-bold border flex items-center gap-1.5 cursor-pointer ${
                        crimsonIsAI
                          ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                          : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      }`}
                    >
                      {crimsonIsAI ? <Bot className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                      <span>{crimsonIsAI ? 'AI Controlled' : 'Player 2'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 sm:max-h-72 overflow-y-auto pr-1">
                    {heroPool.map((hero) => {
                      const isSelected = crimsonHeroIds.includes(hero.id);
                      const maxAllowed = matchMode === '1v1' ? 1 : 2;
                      const avatar = hero.avatarUrl || getCharacterTokenUrl(hero.name);
                      return (
                        <button
                          key={hero.id}
                          type="button"
                          onClick={() => {
                            setCrimsonHeroIds((prev) => {
                              if (prev.includes(hero.id)) {
                                return prev.length > 1 ? prev.filter((id) => id !== hero.id) : prev;
                              }
                              if (maxAllowed === 1) return [hero.id];
                              if (prev.length >= maxAllowed) return [...prev.slice(1), hero.id];
                              return [...prev, hero.id];
                            });
                          }}
                          className={`p-2.5 sm:p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-rose-500/20 border-rose-400 text-white shadow-md'
                              : 'bg-zinc-950/80 hover:bg-zinc-950 border-zinc-800 text-zinc-300'
                          }`}
                        >
                          <img
                            src={avatar}
                            alt={hero.name}
                            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover border border-rose-500/50 shrink-0 bg-zinc-900"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono font-bold truncate">{hero.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                            </div>
                            <div className="text-[10px] text-zinc-400 truncate">
                              {hero.race} • {hero.classLevel}
                            </div>
                            <div className="text-[10px] font-mono text-rose-300 mt-0.5">
                              HP {hero.maxHp || hero.hp} • AC {hero.ac}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
                    <div>
                      <h3 className="text-xs sm:text-sm font-mono font-bold text-rose-300 flex items-center gap-1.5">
                        <Skull className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>
                          {matchMode === 'random_encounter'
                            ? `Random Encounter (${goldHeroIds.length}P)`
                            : 'Custom Monster Roster'}
                        </span>
                      </h3>
                      <p className="text-[10px] sm:text-[11px] text-zinc-400">
                        Behavior Tree AI • A* Pathfinding • Spellcasting
                      </p>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap">
                      {(['standard', 'hard', 'deadly'] as const).map((diff) => (
                        <button
                          key={diff}
                          type="button"
                          onClick={() => setDifficulty(diff)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold uppercase cursor-pointer border ${
                            difficulty === diff
                              ? 'bg-rose-500 text-white border-rose-400'
                              : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                          }`}
                        >
                          {diff}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setDraftedMonsters(
                            generateScaledRandomEncounter(
                              Math.max(1, goldHeroIds.length),
                              difficulty,
                              monsterPool
                            )
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                        title="Roll a fresh Random Encounter scaled to your party size"
                      >
                        <Shuffle className="w-3 h-3" />
                        <span>Re-Roll</span>
                      </button>
                    </div>
                  </div>

                  {/* Active Drafted Monsters List */}
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {draftedMonsters.map((mon, idx) => (
                      <div
                        key={`${mon.monsterId}_${idx}`}
                        className="p-2.5 rounded-xl bg-zinc-950/90 border border-rose-500/30 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-300 font-mono font-bold text-[10px] shrink-0">
                            CR
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-mono font-bold text-white truncate">
                              {mon.name}
                            </div>
                            <div className="text-[10px] font-mono text-zinc-400 truncate">
                              HP {mon.hp} • AC {mon.ac} • CR {mon.challenge?.split(' ')[0]}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setDraftedMonsters((prev) =>
                              prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev
                            )
                          }
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 cursor-pointer shrink-0"
                          title="Remove from encounter"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Quick Add Monster Dropdown */}
                  <div className="pt-2 border-t border-zinc-800 flex items-center gap-2">
                    <select
                      onChange={(e) => {
                        const found = monsterPool.find((m) => m.monsterId === e.target.value);
                        if (found) {
                          setDraftedMonsters((prev) => [...prev, found]);
                        }
                        e.target.value = '';
                      }}
                      defaultValue=""
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 min-w-0"
                    >
                      <option value="" disabled>
                        + Add Monster / Boss...
                      </option>
                      {monsterPool.map((m) => (
                        <option key={m.monsterId} value={m.monsterId}>
                          {m.name} (CR {m.challenge?.split(' ')[0]} • HP {m.hp} • AC {m.ac})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Step 3: Select Arena Battlemap & Launch Match */}
          <div className="bg-zinc-900/75 border border-zinc-800 rounded-3xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="flex-1 w-full">
              <span className="block text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold mb-2.5">
                3. Choose Colosseum Battlemap (1-Inch Tactical Grid)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                {PRESET_BATTLEMAPS.map((map) => {
                  const isSel = selectedMap.id === map.id;
                  return (
                    <button
                      key={map.id}
                      type="button"
                      onClick={() => setSelectedMap(map)}
                      className={`group relative rounded-2xl overflow-hidden border h-16 sm:h-20 text-left transition-all cursor-pointer ${
                        isSel
                          ? 'border-amber-400 ring-2 ring-amber-400/40'
                          : 'border-zinc-800 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={map.thumbnailUrl || map.url}
                        alt={map.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex items-end p-2">
                        <span className="text-[10px] sm:text-[11px] font-mono font-bold text-white truncate">
                          {map.name}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartArenaMatch}
              className="hidden md:flex px-8 py-5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-mono font-black text-base shadow-[0_0_30px_rgba(245,158,11,0.4)] items-center justify-center gap-3 cursor-pointer active:scale-95 transition-all shrink-0"
            >
              <Swords className="w-6 h-6" />
              <span>ROLL INITIATIVE & START ARENA</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sticky Mobile Bottom Launch Bar */}
        <div className="fixed bottom-0 inset-x-0 z-30 p-3 bg-zinc-950/95 border-t border-amber-500/30 backdrop-blur-xl md:hidden">
          <button
            type="button"
            onClick={handleStartArenaMatch}
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 text-zinc-950 font-mono font-black text-sm shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2.5 active:scale-95 transition-all cursor-pointer"
          >
            <Swords className="w-5 h-5" />
            <span>ROLL INITIATIVE & START ARENA</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // VIEW 2: LIVE TURN-BASED ARENA BATTLEFIELD + COPIED TACTICAL HUD
  // ==========================================================================
  const topBarHeight = isMobile ? 52 : 64;

  return (
    <div className="fixed inset-0 z-[220] bg-zinc-950 overflow-hidden select-none touch-none flex flex-col">
      {/* Top Initiative & Turn Order Bar */}
      <div className="h-[52px] sm:h-16 bg-zinc-950/95 border-b border-zinc-800 px-2 sm:px-4 flex items-center justify-between gap-1.5 sm:gap-4 z-30">
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setPhase('lobby')}
            className="px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px] sm:text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
            title="Return to Arena Lobby"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden sm:inline">Arena Lobby</span>
          </button>
          <div className="px-2 py-1 sm:px-3 sm:py-1 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] sm:text-xs font-mono font-bold">
            <span className="sm:hidden">R{round}</span>
            <span className="hidden sm:inline">Round {round}</span>
          </div>
        </div>

        {/* Turn Order Ribbon */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1 px-1 flex-1 justify-start sm:justify-center">
          {combatants.map((c, idx) => {
            const isCurr = idx === turnIndex;
            const isDead = c.currentHp <= 0;
            return (
              <div
                key={c.id}
                className={`px-2 py-1 rounded-xl border flex items-center gap-1.5 sm:gap-2 shrink-0 transition-all ${
                  isDead
                    ? 'opacity-40 bg-zinc-950 border-zinc-800'
                    : isCurr
                    ? 'bg-amber-500/25 border-amber-400 ring-1 ring-amber-400/50'
                    : c.team === 'gold'
                    ? 'bg-zinc-900/90 border-amber-500/30'
                    : 'bg-zinc-900/90 border-rose-500/30'
                }`}
              >
                <img
                  src={c.avatarUrl}
                  alt={c.name}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg object-cover border border-white/20 shrink-0"
                />
                <div className="text-left">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] sm:text-[11px] font-mono font-bold text-white truncate max-w-[64px] sm:max-w-[95px]">
                      {c.name.split(' ')[0]}
                    </span>
                    <span className="text-[9px] font-mono px-1 rounded bg-zinc-950 text-amber-300">
                      {c.initiativeRoll}
                    </span>
                  </div>
                  <div className="text-[9px] sm:text-[10px] font-mono text-emerald-400">
                    {c.currentHp}/{c.maxHp}
                    <span className="hidden sm:inline"> HP • AC {c.ac}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Controls: End Turn & Return to Campaign */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {activeCombatant && !activeCombatant.isAI && !winnerTeam && (
            <button
              type="button"
              onClick={handleAdvanceTurn}
              className="px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-mono font-black text-[11px] sm:text-xs flex items-center gap-1 shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <span>End Turn</span>
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onExitArena}
            className="p-1.5 sm:px-3 sm:py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
            title="Exit Arena and return to DM Campaign Table"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exit Arena</span>
          </button>
        </div>
      </div>

      {/* Active Turn & Targeting Banner */}
      {activeCombatant && !winnerTeam && (
        <div className="absolute top-[58px] sm:top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto w-[94vw] sm:w-auto max-w-xl flex items-center justify-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-2xl bg-zinc-950/90 border border-amber-500/40 backdrop-blur-md shadow-2xl text-center">
          <span className="text-[11px] sm:text-xs font-mono text-zinc-200 leading-snug">
            {activeCombatant.isAI ? (
              <span className="text-rose-300 font-bold flex items-center justify-center gap-1.5">
                <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-amber-400 shrink-0" />
                <span className="line-clamp-2">{aiTacticalBanner || `${activeCombatant.name} (AI) is evaluating Behavior Tree & A* paths...`}</span>
              </span>
            ) : activeTargetingAction ? (
              <span className="text-amber-300 font-bold flex flex-wrap items-center justify-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-rose-400 animate-ping shrink-0" />
                <span>
                  Tap target for <strong>{activeTargetingAction.name}</strong> ({activeTargetingAction.rangeFt || 5}ft)
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTargetingAction(null)}
                  className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 text-[10px] border border-zinc-700"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <span>
                <strong className="text-amber-300">{activeCombatant.name.split(' ')[0]}&apos;s Turn</strong> • Move:{' '}
                <strong className="text-emerald-400">{activeCombatant.remainingMoveFt} ft</strong> •{' '}
                <span className="text-zinc-300">Tap green square or drag token to move!</span>
              </span>
            )}
          </span>
        </div>
      )}

      {/* Floating Camera Zoom / Fit + Combat Feed Toggle Pill (Mobile & Desktop) */}
      <div className="fixed top-28 sm:top-20 right-2.5 sm:right-4 z-30 flex flex-col gap-1.5 pointer-events-auto">
        <button
          type="button"
          onClick={() => setShowCombatFeed((v) => !v)}
          className={`px-2.5 py-2 rounded-xl border text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 shadow-xl backdrop-blur-md cursor-pointer transition-all ${
            showCombatFeed
              ? 'bg-amber-500/20 border-amber-400 text-amber-300'
              : 'bg-zinc-950/90 border-zinc-800 text-zinc-300 hover:text-white'
          }`}
          title="Toggle Arena Combat Feed"
        >
          <ScrollText className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">Combat Log</span>
          <span className="px-1.5 py-0.2 rounded-full bg-zinc-900 text-amber-300 text-[10px]">
            {combatLogs.length}
          </span>
        </button>

        <div className="flex flex-col bg-zinc-950/90 border border-zinc-800 rounded-xl overflow-hidden shadow-xl backdrop-blur-md self-end">
          <button
            type="button"
            onClick={() => setStageScale((s) => Math.min(2.2, s * 1.18))}
            className="p-2 text-zinc-300 hover:text-white hover:bg-zinc-800 border-b border-zinc-800/80 cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setStageScale((s) => Math.max(0.22, s / 1.18))}
            className="p-2 text-zinc-300 hover:text-white hover:bg-zinc-800 border-b border-zinc-800/80 cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => fitArenaCamera()}
            className="p-2 text-amber-400 hover:text-amber-300 hover:bg-zinc-800 cursor-pointer"
            title="Fit Arena Map to Screen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Collapsible Live Combat Feed Drawer */}
      {showCombatFeed && (
        <div className="fixed top-28 sm:top-32 right-14 sm:right-4 z-30 w-68 sm:w-72 max-h-60 sm:max-h-72 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-2xl p-3 flex flex-col pointer-events-auto shadow-2xl animate-in fade-in duration-150">
          <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold border-b border-zinc-800 pb-1.5 mb-2 flex items-center justify-between">
            <span>Arena Combat Feed ({combatLogs.length})</span>
            <button
              type="button"
              onClick={() => setShowCombatFeed(false)}
              className="p-0.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2 overflow-y-auto pr-1 text-xs">
            {combatLogs.map((log) => (
              <div
                key={log.id}
                className={`p-2 rounded-xl border text-[11px] leading-snug ${
                  log.isCrit
                    ? 'bg-amber-500/15 border-amber-400/60 text-amber-100'
                    : log.team === 'gold'
                    ? 'bg-zinc-900/90 border-amber-500/20 text-zinc-200'
                    : 'bg-zinc-900/90 border-rose-500/20 text-zinc-200'
                }`}
              >
                <div className="font-mono font-bold text-amber-300">
                  [R{log.round}] {log.actorName}{' '}
                  <span className="font-sans font-normal text-zinc-200">{log.message}</span>
                </div>
                {log.detail && <div className="text-[10px] font-mono text-zinc-400 mt-0.5">{log.detail}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Konva 1-Inch Gridded Arena Stage */}
      <div className="flex-1 relative">
        <Stage
          width={dimensions.width}
          height={dimensions.height - topBarHeight}
          scaleX={stageScale}
          scaleY={stageScale}
          x={stagePos.x}
          y={stagePos.y}
          draggable={!activeTargetingAction}
          onDragEnd={(e) => {
            if (e.target === e.target.getStage()) {
              setStagePos({ x: e.target.x(), y: e.target.y() });
            }
          }}
          onTouchMove={(e) => {
            const touches = e.evt.touches;
            if (touches && touches.length === 2) {
              e.evt.preventDefault();
              const dx = touches[0].clientX - touches[1].clientX;
              const dy = touches[0].clientY - touches[1].clientY;
              const dist = Math.hypot(dx, dy);
              if (pinchDistRef.current !== null && pinchDistRef.current > 0) {
                const ratio = dist / pinchDistRef.current;
                setStageScale((prev) => Math.max(0.22, Math.min(2.2, prev * ratio)));
              }
              pinchDistRef.current = dist;
            }
          }}
          onTouchEnd={() => {
            pinchDistRef.current = null;
          }}
          onWheel={(e) => {
            e.evt.preventDefault();
            const scaleBy = 1.08;
            const oldScale = stageScale;
            const nextScale = Math.max(
              0.22,
              Math.min(2.2, e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy)
            );
            setStageScale(nextScale);
          }}
        >
          {/* Arena Map Floor */}
          <Layer
            listening={Boolean(activeTargetingAction)}
            onClick={(e) => {
              if (!activeCombatant || activeCombatant.isAI || !activeTargetingAction) return;
              const stage = e.target.getStage();
              const ptr = stage?.getPointerPosition();
              if (!ptr) return;
              const worldX = (ptr.x - stagePos.x) / stageScale;
              const worldY = (ptr.y - stagePos.y) / stageScale;
              if (worldX < 0 || worldX > ARENA_WIDTH || worldY < 0 || worldY > ARENA_HEIGHT) return;
              const snapCenter = {
                x: Math.floor(worldX / ARENA_GRID_SIZE) * ARENA_GRID_SIZE + ARENA_GRID_SIZE / 2,
                y: Math.floor(worldY / ARENA_GRID_SIZE) * ARENA_GRID_SIZE + ARENA_GRID_SIZE / 2
              };
              const nearestEnemy =
                combatants
                  .filter((c) => c.team !== activeCombatant.team && c.currentHp > 0)
                  .sort(
                    (a, b) =>
                      Math.hypot(a.x - snapCenter.x, a.y - snapCenter.y) -
                      Math.hypot(b.x - snapCenter.x, b.y - snapCenter.y)
                  )[0] || activeCombatant;
              executeCombatAction(activeCombatant, nearestEnemy, activeTargetingAction, snapCenter);
              setActiveTargetingAction(null);
            }}
            onTap={(e) => {
              if (!activeCombatant || activeCombatant.isAI || !activeTargetingAction) return;
              const stage = e.target.getStage();
              const ptr = stage?.getPointerPosition();
              if (!ptr) return;
              const worldX = (ptr.x - stagePos.x) / stageScale;
              const worldY = (ptr.y - stagePos.y) / stageScale;
              if (worldX < 0 || worldX > ARENA_WIDTH || worldY < 0 || worldY > ARENA_HEIGHT) return;
              const snapCenter = {
                x: Math.floor(worldX / ARENA_GRID_SIZE) * ARENA_GRID_SIZE + ARENA_GRID_SIZE / 2,
                y: Math.floor(worldY / ARENA_GRID_SIZE) * ARENA_GRID_SIZE + ARENA_GRID_SIZE / 2
              };
              const nearestEnemy =
                combatants
                  .filter((c) => c.team !== activeCombatant.team && c.currentHp > 0)
                  .sort(
                    (a, b) =>
                      Math.hypot(a.x - snapCenter.x, a.y - snapCenter.y) -
                      Math.hypot(b.x - snapCenter.x, b.y - snapCenter.y)
                  )[0] || activeCombatant;
              executeCombatAction(activeCombatant, nearestEnemy, activeTargetingAction, snapCenter);
              setActiveTargetingAction(null);
            }}
          >
            <Rect
              width={ARENA_WIDTH}
              height={ARENA_HEIGHT}
              fill="#1c1917"
              stroke="#f59e0b"
              strokeWidth={4}
              cornerRadius={12}
            />
            {bgImage && (
              <KonvaImage
                image={bgImage}
                width={ARENA_WIDTH}
                height={ARENA_HEIGHT}
              />
            )}
          </Layer>

          {/* 1-Inch Tactical Grid Layer (Direct child of Stage) */}
          <GridLayer
            mapWidth={ARENA_WIDTH}
            mapHeight={ARENA_HEIGHT}
            gridSize={ARENA_GRID_SIZE}
            gridOffsetX={0}
            gridOffsetY={0}
            gridOpacity={0.38}
            stageScale={stageScale}
          />

          {/* Arena Tokens & Tap-to-Move Layer */}
          <Layer>
            {/* Tap-to-Move Reachable Grid Squares for Active Human Fighter */}
            {activeCombatant &&
              !activeCombatant.isAI &&
              !activeTargetingAction &&
              reachableMoveSquares.map((cell) => (
                <Rect
                  key={`move_${cell.col}_${cell.row}`}
                  x={cell.col * ARENA_GRID_SIZE + 2}
                  y={cell.row * ARENA_GRID_SIZE + 2}
                  width={ARENA_GRID_SIZE - 4}
                  height={ARENA_GRID_SIZE - 4}
                  cornerRadius={6}
                  fill="rgba(16, 185, 129, 0.14)"
                  stroke="rgba(52, 211, 153, 0.45)"
                  strokeWidth={1.5}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    handleMoveArenaToken(
                      activeCombatant.id,
                      cell.col * ARENA_GRID_SIZE,
                      cell.row * ARENA_GRID_SIZE
                    );
                  }}
                  onTap={(e) => {
                    e.cancelBubble = true;
                    handleMoveArenaToken(
                      activeCombatant.id,
                      cell.col * ARENA_GRID_SIZE,
                      cell.row * ARENA_GRID_SIZE
                    );
                  }}
                />
              ))}

            {/* AI Live A* Pathfinding Trail Visualization */}
            {aiPathPreviewPx.length >= 2 && (
              <Line
                points={aiPathPreviewPx.flatMap((pt) => [
                  pt.x + ARENA_GRID_SIZE / 2,
                  pt.y + ARENA_GRID_SIZE / 2
                ])}
                stroke="#f43f5e"
                strokeWidth={4}
                dash={[10, 6]}
                lineCap="round"
                lineJoin="round"
                opacity={0.85}
                listening={false}
              />
            )}
            {combatants.map((c, idx) => {
              const isCurr = idx === turnIndex;
              const canDrag = isCurr && !c.isAI && !winnerTeam;
              const isTargetable = Boolean(activeTargetingAction) && c.currentHp > 0;
              return (
                <ArenaTokenNode
                  key={c.id}
                  combatant={c}
                  isCurrentTurn={isCurr}
                  isTargetable={isTargetable}
                  canDrag={canDrag}
                  onMove={handleMoveArenaToken}
                  onClickToken={(clicked) => {
                    if (!activeCombatant || activeCombatant.isAI) return;
                    if (activeTargetingAction) {
                      executeCombatAction(activeCombatant, clicked, activeTargetingAction);
                      setActiveTargetingAction(null);
                    }
                  }}
                />
              );
            })}
          </Layer>
        </Stage>

        {/* JB2A Animated Spells & Weapon FX Overlay */}
        <DomEffectOverlay
          effects={arenaEffects}
          setEffects={setArenaEffects}
          stagePos={stagePos}
          stageScale={stageScale}
          gridSize={ARENA_GRID_SIZE}
          tokens={combatants as any}
          combatants={[]}
          activeEquippedAsset={null}
          aimOrigin={null}
          aimCurrent={null}
          onEffectComplete={(id) => setArenaEffects((prev) => prev.filter((f) => f.id !== id))}
          onDispelEffect={(id) => setArenaEffects((prev) => prev.filter((f) => f.id !== id))}
          onInspectEffect={(eff) => setInspectedAuraRequest({ effect: eff, nonce: Date.now() })}
        />
      </div>

      {/* Copied D&D Beyond Tactical Character HUD (<PlayerHeroDock />) for Active Fighter */}
      {activeCombatant && !activeCombatant.isAI && activeHeroHudData && !winnerTeam && (
        <PlayerHeroDock
          characterData={activeHeroHudData}
          isMobile={isMobile}
          claimedToken={
            {
              id: activeCombatant.id,
              name: activeCombatant.name,
              url: activeCombatant.avatarUrl,
              hp: activeCombatant.currentHp,
              currentHp: activeCombatant.currentHp,
              maxHp: activeCombatant.maxHp,
              ac: activeCombatant.ac,
              isFlying: activeCombatant.isFlying,
              elevation: activeCombatant.elevation
            } as any
          }
          onSelectAction={(action) => {
            if (action.isSelfAction) {
              executeCombatAction(activeCombatant, activeCombatant, action);
            } else {
              setActiveTargetingAction(action);
              toast.info(`🎯 Tap a target token or grid square for ${action.name}`);
            }
          }}
          onRollToHit={(action) => {
            const nearestEnemy =
              combatants
                .filter((c) => c.team !== activeCombatant.team && c.currentHp > 0)
                .sort(
                  (a, b) =>
                    Math.hypot(a.x - activeCombatant.x, a.y - activeCombatant.y) -
                    Math.hypot(b.x - activeCombatant.x, b.y - activeCombatant.y)
                )[0] || activeCombatant;
            executeCombatAction(activeCombatant, nearestEnemy, action);
          }}
          onRollDamage={(action) => {
            const formula = action.damageFormula || '2d8';
            const dmgRoll = rollDiceFormula(formula, false);
            if (onTrigger3dDice) {
              onTrigger3dDice({
                id: `arena-dmg-${Date.now()}`,
                characterName: activeCombatant.name,
                action: `${action.name}${action.castAtLevel ? ` (L${action.castAtLevel})` : ''} (${action.isHeal ? 'Heal' : action.damageType || 'Damage'})`,
                rollType: action.isHeal ? 'heal' : 'damage',
                formula: `${formula} = ${dmgRoll.total}`,
                diceNotation: formula,
                dice: dmgRoll.rolls.map((r) => ({
                  sides: dmgRoll.sides,
                  result: r,
                  type: `d${dmgRoll.sides}`
                })),
                total: dmgRoll.total,
                timestamp: Date.now(),
                source: 'player'
              });
            }
            if (action.isHeal) {
              setCombatants((prev) =>
                prev.map((c) =>
                  c.id === activeCombatant.id
                    ? { ...c, currentHp: Math.min(c.maxHp, c.currentHp + dmgRoll.total) }
                    : c
                )
              );
              addCombatLog(
                activeCombatant.name,
                activeCombatant.team,
                `rolled ${action.name} healing: +${dmgRoll.total} HP!`,
                dmgRoll.breakdown
              );
            } else {
              const nearestEnemy = combatants
                .filter((c) => c.team !== activeCombatant.team && c.currentHp > 0)
                .sort(
                  (a, b) =>
                    Math.hypot(a.x - activeCombatant.x, a.y - activeCombatant.y) -
                    Math.hypot(b.x - activeCombatant.x, b.y - activeCombatant.y)
                )[0];
              if (nearestEnemy) {
                setCombatants((prev) =>
                  prev.map((c) =>
                    c.id === nearestEnemy.id
                      ? { ...c, currentHp: Math.max(0, c.currentHp - dmgRoll.total) }
                      : c
                  )
                );
                addCombatLog(
                  activeCombatant.name,
                  activeCombatant.team,
                  `rolled ${action.name}${action.castAtLevel ? ` (L${action.castAtLevel})` : ''} damage against ${nearestEnemy.name}: ${dmgRoll.total} ${action.damageType || ''} damage!`,
                  dmgRoll.breakdown
                );
              } else {
                addCombatLog(
                  activeCombatant.name,
                  activeCombatant.team,
                  `rolled ${action.name}: ${dmgRoll.total} ${action.damageType || ''} damage!`,
                  dmgRoll.breakdown
                );
              }
            }
          }}
          activeTargetingAction={activeTargetingAction}
          activeEquippedAsset={null}
          onCancelTargeting={() => setActiveTargetingAction(null)}
          onTargetSelf={() => {
            if (activeTargetingAction) {
              executeCombatAction(activeCombatant, activeCombatant, activeTargetingAction);
              setActiveTargetingAction(null);
            }
          }}
          isMyTurn={true}
          onEndTurn={handleAdvanceTurn}
          onSwitchStationMode={() => setPhase('lobby')}
          onSwitchCharacter={() => setPhase('lobby')}
          activeEffects={arenaEffects}
          inspectedAuraRequest={inspectedAuraRequest}
        />
      )}

      {/* D&D 5e Rule / Aura Inspection Modal */}
      <DndRuleInspectionModal
        rule={inspectedRule}
        onClose={() => setInspectedRule(null)}
        onRollFormula={(formula, label, isHeal) => {
          if (!activeCombatant) return;
          const r = rollDiceFormula(formula, false);
          if (onTrigger3dDice) {
            onTrigger3dDice({
              id: `arena-inspect-${Date.now()}`,
              characterName: activeCombatant.name,
              action: label,
              rollType: isHeal ? 'heal' : 'damage',
              formula: `${formula} = ${r.total}`,
              diceNotation: formula,
              dice: r.rolls.map((v) => ({ sides: r.sides, result: v, type: `d${r.sides}` })),
              total: r.total,
              timestamp: Date.now(),
              source: 'player'
            });
          }
          addCombatLog(
            activeCombatant.name,
            activeCombatant.team,
            `rolled ${label}: ${r.total}!`,
            r.breakdown
          );
        }}
      />

      {/* Victory / Defeat Modal */}
      {winnerTeam && (
        <div className="fixed inset-0 z-[260] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-zinc-950 border border-amber-500/50 rounded-3xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center mx-auto text-amber-400">
              <Trophy className="w-9 h-9" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
                Arena Match Complete ({round} Rounds)
              </span>
              <h2 className="text-2xl font-extrabold text-white font-mono mt-1">
                {winnerTeam === 'gold' ? '🏆 Team Gold Wins!' : '💀 Team Crimson Wins!'}
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                All opposing combatants have been defeated in the Arena.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleStartArenaMatch}
                className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-mono font-bold text-xs cursor-pointer"
              >
                Instant Rematch
              </button>
              <button
                type="button"
                onClick={() => setPhase('lobby')}
                className="flex-1 py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-mono font-bold text-xs cursor-pointer"
              >
                Arena Lobby
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
