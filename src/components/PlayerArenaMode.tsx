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
  ScrollText,
  PawPrint,
  User,
  GripHorizontal,
  Lock,
  Folder
} from 'lucide-react';
import { WildShapeModal } from './WildShapeModal';
import { ArenaDicePromptModal, PendingCombatRoll } from './ArenaDicePromptModal';
import { WildShapeBeastForm, ActiveWildShapeState, GAIAH_WILD_SHAPE_FORMS } from '../types/wildShape';
import { resolveCharacterCampaign, groupCharactersByCampaign } from '../data/ddbCampaignRegistry';
import { toast } from 'sonner';
import { Character } from '../types/character';
import { Monster } from '../types/monster';
import { DEFAULT_CHARACTERS, getCharacterTokenUrl, isDdbMatch, resolveTokenDdbCharacterId } from '../data/defaultCharacters';
import { DEFAULT_MONSTERS } from '../data/defaultMonsters';
import { PRESET_BATTLEMAPS, PresetBattlemap } from '../data/presetBattlemaps';
import {
  HudCharacterData,
  HudActionItem,
  computeUpcastFormula,
  evaluateDiceFormula,
  normalizePlayerAutoRollKey,
  loadPlayerAutoRollMap,
  savePlayerAutoRollPreference
} from '../types/hud';
import { WallSegment, DoorState, AURA_PRESETS, AuraPreset } from '../types';
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
  soundCatalog,
  AimReticle
} from '../effects';
import { Jb2aAssetDefinition } from '../effects/types/effect';
import { TokenDragRuler, TokenDragState, parseSpeedFt } from './TokenDragRuler';
import {
  computeFlightLiftMetrics,
  TokenGroundFootprint,
  TokenAerialOverlay,
  useTokenFlightAnimation
} from './TokenFlightElevation';
import {
  ArenaConfig,
  loadArenaConfig,
  subscribeToArenaConfig,
  saveArenaConfig,
  getAvailableArenaMaps,
  doesArenaWallBlockMovement,
  doesArenaWallBlockSight,
  generateLavapitDefaultHazards,
  getArenaHazardAt
} from '../services/arenaConfigService';
import { canCreatureBypassHazard } from '../lib/hazardGeometry';
import { HazardZone } from '../types/hazard';
import { subscribeToMonsters } from '../lib/firebase';

export type ArenaMatchMode =
  | '1v1'
  | '2v2'
  | '3v3'
  | '4v4'
  | '5v5'
  | '6v6'
  | 'vs_npcs'
  | 'random_encounter';
export type ArenaDifficulty = 'standard' | 'hard' | 'deadly';

export function isPvpOrRivalMatchMode(mode: ArenaMatchMode): boolean {
  return (
    mode === '1v1' ||
    mode === '2v2' ||
    mode === '3v3' ||
    mode === '4v4' ||
    mode === '5v5' ||
    mode === '6v6'
  );
}

export function getMatchModeTeamCap(mode: ArenaMatchMode): number {
  switch (mode) {
    case '1v1':
      return 1;
    case '2v2':
      return 2;
    case '3v3':
      return 3;
    case '4v4':
      return 4;
    case '5v5':
      return 5;
    case '6v6':
      return 6;
    default:
      return 6; // random_encounter & vs_npcs support up to 6 Players
  }
}

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
  haloActive?: boolean;
  auraRadius?: number;
  auraColor?: string;
  auraName?: string;
  auraOpacity?: number;
  videoUrl?: string;
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
  dice: Array<{ sides: number; result: number; type?: string }>;
  sides: number;
  bonus: number;
  breakdown: string;
} {
  const evaluated = evaluateDiceFormula(formula, isCrit);
  return {
    total: evaluated.total,
    rolls: evaluated.rolls,
    dice: evaluated.dice,
    sides: evaluated.sides,
    bonus: evaluated.bonus,
    breakdown: evaluated.breakdown
  };
}

/**
 * Detects whether an action represents a healing spell, potion, or restorative ability
 */
export function isActionHealing(action: HudActionItem | undefined | null): boolean {
  if (!action) return false;
  if (action.isHeal === true) return true;
  if (action.damageType?.toLowerCase() === 'healing') return true;
  const name = (action.name || '').toLowerCase();
  const desc = (action.description || '').toLowerCase();
  if (
    name.includes('heal') ||
    name.includes('cure') ||
    name.includes('potion') ||
    name.includes('draught') ||
    name.includes('lay on hands') ||
    name.includes('second wind') ||
    name.includes('surge') ||
    name.includes('aid') ||
    name.includes('goodberry') ||
    name.includes('revivify') ||
    name.includes('restoration') ||
    name.includes('prayer') ||
    name.includes('regeneration') ||
    name.includes('vitality')
  ) {
    return true;
  }
  if (desc.includes('regains') && (desc.includes('hit point') || desc.includes('hp'))) {
    return true;
  }
  return false;
}

/**
 * Detects whether an action represents a Teleportation spell or feature (e.g. Misty Step, Dimension Door)
 */
export function isActionTeleport(action: HudActionItem | undefined | null): boolean {
  if (!action) return false;
  const name = (action.name || '').toLowerCase();
  const desc = (action.description || '').toLowerCase();
  return (
    name.includes('misty step') ||
    name.includes('dimension door') ||
    name === 'teleport' ||
    name.includes('thunder step') ||
    name.includes('jaunt') ||
    name.includes('arcane charge') ||
    desc.includes('teleport up to') ||
    desc.includes('teleport yourself')
  );
}

/**
 * Builds the exact HudCharacterData used by <PlayerHeroDock /> for any Arena Combatant
 */
function buildArenaCombatantHudData(
  combatant: ArenaCombatant,
  liveDdbHud?: HudCharacterData | null,
  activeWildShape?: ActiveWildShapeState | null,
  arenaConfig?: ArenaConfig
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

  // Ingest Wild Shape Beast Attacks if combatant is currently transformed
  if (activeWildShape) {
    const beastForm = GAIAH_WILD_SHAPE_FORMS.find((f) => f.id === activeWildShape.beastFormId);
    if (beastForm && Array.isArray(beastForm.attacks)) {
      attacks.push(...beastForm.attacks);
    }
  }

  const totalLevel =
    liveDdbHud?.totalLevel ||
    (char?.classLevel || combatant.classOrCr || '')
      .match(/\d+/g)
      ?.reduce((acc, n) => acc + parseInt(n, 10), 0) ||
    5;
  const profBonus = (liveDdbHud as any)?.proficiencyBonus || char?.proficiencyBonus || Math.ceil(totalLevel / 4) + 1;
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
  const spellAttackBonus = liveDdbHud?.spellAttackBonus !== undefined ? liveDdbHud.spellAttackBonus : profBonus + spellMod;
  const spellSaveDc = liveDdbHud?.spellSaveDc !== undefined ? liveDdbHud.spellSaveDc : 8 + profBonus + spellMod;

  if (char) {
    // 1. Seed from live D&D Beyond HUD if available
    if (liveDdbHud) {
      liveDdbHud.attacks.forEach((a) => attacks.push({ ...a, isHeal: isActionHealing(a) ? true : a.isHeal }));
      liveDdbHud.actions.forEach((a) => actions.push({ ...a, isHeal: isActionHealing(a) ? true : a.isHeal }));
      liveDdbHud.bonusActions.forEach((a) => bonusActions.push({ ...a, isHeal: isActionHealing(a) ? true : a.isHeal }));
      liveDdbHud.spells.forEach((a) => spells.push({ ...a, isHeal: isActionHealing(a) ? true : a.isHeal }));
      liveDdbHud.reactions.forEach((a) => reactions.push({ ...a, isHeal: isActionHealing(a) ? true : a.isHeal }));
      liveDdbHud.items.forEach((a) => items.push({ ...a, isHeal: isActionHealing(a) ? true : a.isHeal }));
      (liveDdbHud.special || []).forEach((a) => special.push({ ...a, isHeal: isActionHealing(a) ? true : a.isHeal }));
    }

    // 2. Ensure local compendium weapons/actions are present ONLY if live DDB did not supply attacks
    if ((!liveDdbHud || liveDdbHud.attacks.length === 0) && Array.isArray(char.actions) && char.actions.length > 0) {
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

    // 3. Ensure local compendium bonus actions are present ONLY if not already present
    if ((!liveDdbHud || liveDdbHud.bonusActions.length === 0) && Array.isArray(char.bonusActions) && char.bonusActions.length > 0) {
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

    // 4. Ensure local compendium reactions are present ONLY if not already present
    if ((!liveDdbHud || liveDdbHud.reactions.length === 0) && Array.isArray(char.reactions) && char.reactions.length > 0) {
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

    // 5. Ensure local compendium spells are present ONLY if live DDB did not supply spells
    if ((!liveDdbHud || liveDdbHud.spells.length === 0) && Array.isArray(char.spells) && char.spells.length > 0) {
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
          (lower.includes('cure wounds') || lower.includes('healing word') || lower.includes('prayer of healing'))
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

        const isTeleportSpell =
          lower.includes('misty step') ||
          lower.includes('dimension door') ||
          lower === 'teleport' ||
          lower.includes('thunder step') ||
          lower.includes('jaunt');
        const effectiveRangeFt = isTeleportSpell
          ? lower.includes('misty step')
            ? 30
            : lower.includes('dimension door')
            ? 500
            : 30
          : rangeNum;

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
          isSelfAction: isTeleportSpell ? false : Boolean(rule?.isSelfAction || (rangeNum === 0 && !isAtk && !saveAbil)),
          spellSlotRequired: baseLvl > 0 ? baseLvl : undefined,
          description: rule?.description || `Cast ${spName}.`,
          rangeFt: effectiveRangeFt,
          jb2aAssetId:
            matchedAsset?.id ||
            (isTeleportSpell ? 'misty_step' : isHeal ? 'cure_wounds' : lower.includes('eldritch') ? 'eldritch_blast' : 'fire_bolt'),
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

    // Stavros / Cleric Life Domain Class Features & Signature Weapons
    const isStavrosOrCleric =
      combatant.name.toLowerCase().includes('stavros') ||
      char.name.toLowerCase().includes('stavros') ||
      (char.classLevel || '').toLowerCase().includes('cleric');

    if (isStavrosOrCleric) {
      if (!special.some((s) => s.id === 'special-blessed-healer' || s.name.toLowerCase().includes('blessed healer'))) {
        special.push({
          id: 'special-blessed-healer',
          name: 'Blessed Healer',
          category: 'special',
          type: 'passive',
          subCategory: 'class',
          sourceLabel: 'PHB, pg. 60',
          castingTime: '(No Action)',
          isSelfAction: true,
          description:
            'When you cast a spell of 1st level or higher that restores HP to a creature other than you, you regain HP equal to 2 + the spell’s level.'
        });
      }
      if (!special.some((s) => s.id === 'special-devotees-censer' || s.name.toLowerCase().includes('healing incense'))) {
        special.push({
          id: 'special-devotees-censer',
          name: "Devotee's Censer: Healing Incense",
          category: 'special',
          type: 'bonus_action',
          subCategory: 'item',
          sourceLabel: "Rare Flail • Devotee's Censer",
          castingTime: '1 Bonus Action',
          rangeFt: 10,
          duration: '1 minute',
          damageFormula: '1d4',
          damageType: 'healing',
          isHeal: true,
          isSelfAction: true,
          uses: { available: 1, total: 1, resetType: 'Dawn' },
          description:
            'Speak the command word as a bonus action to cause the flail to emanate a thin cloud of incense out to 10 feet for 1 minute. At the start of each of your turns, you and any other creatures in the incense each regain 1d4 hit points.',
          jb2aAssetId: 'healing_incense'
        });
      }
      if (!special.some((s) => s.id === 'special-halo-glow' || s.name.toLowerCase().includes('divine halo'))) {
        special.push({
          id: 'special-halo-glow',
          name: 'Illuminate Self: Divine Halo & Holy Glow',
          category: 'special',
          type: 'special',
          subCategory: 'class',
          sourceLabel: 'Divine Illumination • Book of Exalted Deeds',
          castingTime: 'Special (Toggle Glow)',
          rangeFt: 20,
          isSelfAction: true,
          description:
            'Illuminate yourself with a radiant golden halo and holy light, shedding Bright Light in a 20-foot radius. Click to toggle your token halo on the battlemap.',
          jb2aAssetId: 'bless'
        });
      }
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
          isAttack: Boolean((sp as any).isAttack || rule?.isAttack),
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
  if ((arenaConfig?.allowArenaSurge ?? true) && !actions.some((a) => a.id === 'arena-second-wind')) {
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

  const potionCount = arenaConfig?.startingPotionsCount ?? 2;
  if (potionCount > 0 && !items.some((i) => i.name.toLowerCase().includes('potion'))) {
    items.push({
      id: 'arena-potion-greater',
      name: 'Potion of Greater Healing',
      category: 'items',
      type: 'bonus_action',
      subCategory: 'item',
      castingTime: '1 Bonus Action',
      quantity: potionCount,
      isSelfAction: true,
      isHeal: true,
      damageFormula: '4d4 + 4',
      damageType: 'healing',
      description: 'Drink a crimson healing draught to restore 4d4 + 4 HP.',
      rangeFt: 0,
      jb2aAssetId: 'cure_wounds'
    });
  }

  // Build full 5e Spell Slots based on character level / live DDB slots
  const spellSlots: Record<number, { level: number; total: number; used: number; available: number }> = {};
  if (liveDdbHud?.spellSlots && Object.keys(liveDdbHud.spellSlots).length > 0) {
    Object.entries(liveDdbHud.spellSlots).forEach(([k, v]) => {
      spellSlots[Number(k)] = { ...v };
    });
  } else if (spells.length > 0) {
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
    passivePerception: liveDdbHud?.passivePerception || char?.passivePerception || 14,
    passiveInsight: liveDdbHud?.passiveInsight || char?.passiveInsight || 12,
    passiveInvestigation: liveDdbHud?.passiveInvestigation || char?.passiveInvestigation || 12,
    spellSaveDc,
    spellAttackBonus,
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
    wildShapeState: activeWildShape || null,
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
  onMove: (id: string, newX: number, newY: number, distanceMovedFt?: number) => void;
  onDragStartToken?: (combatant: ArenaCombatant, originX: number, originY: number, baseSpeed: number) => void;
  onDragMoveToken?: (id: string, rawX: number, rawY: number) => void;
  onClickToken: (combatant: ArenaCombatant) => void;
  onContextMenu?: (combatant: ArenaCombatant, clientX: number, clientY: number) => void;
}> = ({
  combatant,
  isCurrentTurn,
  isTargetable,
  canDrag,
  onMove,
  onDragStartToken,
  onDragMoveToken,
  onClickToken,
  onContextMenu
}) => {
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

  const isCurrentlyDraggingRef = useRef<boolean>(false);

  const handleDragStart = (e: any) => {
    e.cancelBubble = true;
    if (!canDrag || isDead) {
      e.target.stopDrag();
      return;
    }
    if (isTargetable) {
      e.target.stopDrag();
      onClickToken(combatant);
      return;
    }
    isCurrentlyDraggingRef.current = true;
    const baseSpeed = combatant.remainingMoveFt ?? combatant.speedFt ?? 30;
    if (onDragStartToken) {
      onDragStartToken(combatant, combatant.x, combatant.y, baseSpeed);
    }
  };

  const handleDragMove = (e: any) => {
    e.cancelBubble = true;
    if (!isCurrentlyDraggingRef.current) return;
    const rawX = e.target.x();
    const rawY = e.target.y();
    if (onDragMoveToken) {
      onDragMoveToken(combatant.id, rawX, rawY);
    }
  };

  const handleDragEnd = (e: any) => {
    e.cancelBubble = true;
    const wasDragging = isCurrentlyDraggingRef.current;
    isCurrentlyDraggingRef.current = false;
    if (!wasDragging) {
      e.target.position({ x: combatant.x, y: combatant.y });
      return;
    }
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
    const dx = snappedX - combatant.x;
    const dy = snappedY - combatant.y;
    const distanceFt = Math.round(Math.hypot(dx, dy) / ARENA_GRID_SIZE) * 5;

    // Check if movement exceeds available budget
    const budget = combatant.remainingMoveFt ?? combatant.speedFt ?? 30;
    if (distanceFt > budget) {
      e.target.position({ x: combatant.x, y: combatant.y });
      onMove(combatant.id, combatant.x, combatant.y, 0);
      toast.warning(
        `Only ${combatant.remainingMoveFt} ft of movement remaining this turn! (Use Dash for +${combatant.speedFt} ft)`
      );
      return;
    }

    e.target.position({ x: snappedX, y: snappedY });
    onMove(combatant.id, snappedX, snappedY, distanceFt);
  };

  return (
    <Group
      x={combatant.x}
      y={combatant.y}
      draggable={canDrag && !isDead}
      opacity={isDead ? 0.45 : 1}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onClick={(e) => {
        e.cancelBubble = true;
        onClickToken(combatant);
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onClickToken(combatant);
      }}
      onContextMenu={(e) => {
        e.evt.preventDefault();
        e.cancelBubble = true;
        if (onContextMenu) {
          onContextMenu(combatant, e.evt.clientX, e.evt.clientY);
        }
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
  // DM Battle Arena Configuration (Real-time synced via Firestore / Socket.IO / LocalStorage)
  const [arenaConfig, setArenaConfig] = useState<ArenaConfig>(() => loadArenaConfig());
  const [cloudMonsters, setCloudMonsters] = useState<Monster[]>([]);

  useEffect(() => {
    const unsubConfig = subscribeToArenaConfig((cfg) => {
      setArenaConfig(cfg);
    });
    const unsubMonsters = subscribeToMonsters((mons) => {
      setCloudMonsters(mons || []);
    });
    return () => {
      unsubConfig();
      unsubMonsters();
    };
  }, []);

  // Arena Phase: 'lobby' (Match Setup & Ready Room) vs 'battle' (Live Turn-Based Arena)
  const [phase, setPhase] = useState<'lobby' | 'battle'>('lobby');
  const [matchMode, setMatchMode] = useState<ArenaMatchMode>(() => arenaConfig.defaultMatchMode || 'random_encounter');
  const [difficulty, setDifficulty] = useState<ArenaDifficulty>(() => arenaConfig.defaultDifficulty || 'standard');

  const availableMaps = useMemo<PresetBattlemap[]>(() => getAvailableArenaMaps(arenaConfig), [arenaConfig]);

  const [selectedMap, setSelectedMap] = useState<PresetBattlemap>(() => {
    const maps = getAvailableArenaMaps(arenaConfig);
    return maps.find((m) => m.id === arenaConfig.defaultMapId) || maps[0] || PRESET_BATTLEMAPS[0];
  });

  // Sync default map / mode / difficulty when DM updates Arena Config while in Lobby
  useEffect(() => {
    if (phase !== 'lobby') return;
    const found = availableMaps.find((m) => m.id === arenaConfig.defaultMapId);
    if (found) {
      setSelectedMap(found);
    } else if (!availableMaps.some((m) => m.id === selectedMap.id) && availableMaps[0]) {
      setSelectedMap(availableMaps[0]);
    }
  }, [arenaConfig.defaultMapId, availableMaps, phase]);

  // Available Heroes & Monsters (including DM Custom Arena Monsters & Cloud Bestiary, excluding DM disabled monsters)
  const heroPool = useMemo<Character[]>(() => {
    const merged: Character[] = [];
    const seen = new Set<string>();
    [...(compendiumCharacters || []), ...DEFAULT_CHARACTERS].forEach((c) => {
      const key = c.name.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        const campaignInfo = resolveCharacterCampaign(c);
        merged.push({
          ...c,
          ddbCampaignId: c.ddbCampaignId || campaignInfo.campaignId,
          ddbCampaignTitle: c.ddbCampaignTitle || campaignInfo.campaignTitle,
          playerName: c.playerName || campaignInfo.playerName
        });
      }
    });
    return merged.sort((a, b) => {
      const isPrimaryA = a.ddbCampaignId === '6738033' || a.ddbCampaignId === '3290944';
      const isPrimaryB = b.ddbCampaignId === '6738033' || b.ddbCampaignId === '3290944';
      if (isPrimaryA && !isPrimaryB) return -1;
      if (!isPrimaryA && isPrimaryB) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [compendiumCharacters]);

  const arenaCampaignGroups = useMemo(() => {
    return groupCharactersByCampaign(heroPool);
  }, [heroPool]);

  const [goldCampaignFilter, setGoldCampaignFilter] = useState<string>('ALL');
  const [crimsonCampaignFilter, setCrimsonCampaignFilter] = useState<string>('ALL');

  const monsterPool = useMemo<Monster[]>(() => {
    const disabledSet = new Set(arenaConfig.disabledMonsterIds || []);
    const merged: Monster[] = [];
    const seen = new Set<string>();
    [...(arenaConfig.customArenaMonsters || []), ...cloudMonsters, ...DEFAULT_MONSTERS].forEach((m) => {
      const key = (m.monsterId || m.name || '').toLowerCase().trim();
      if (key && !seen.has(key) && !disabledSet.has(m.monsterId)) {
        seen.add(key);
        merged.push(m);
      }
    });
    return merged.length > 0 ? merged : DEFAULT_MONSTERS;
  }, [arenaConfig.customArenaMonsters, arenaConfig.disabledMonsterIds, cloudMonsters]);

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
    arenaConfig.pinnedEncounterMonsters && arenaConfig.pinnedEncounterMonsters.length > 0
      ? arenaConfig.pinnedEncounterMonsters
      : generateScaledRandomEncounter(2, arenaConfig.defaultDifficulty || 'standard', DEFAULT_MONSTERS)
  );

  // Sync DM Pinned Encounter Squad when DM updates it in Campaign Manager
  useEffect(() => {
    if (arenaConfig.pinnedEncounterMonsters && arenaConfig.pinnedEncounterMonsters.length > 0) {
      setDraftedMonsters(arenaConfig.pinnedEncounterMonsters);
    }
  }, [arenaConfig.pinnedEncounterMonsters]);

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
    if (arenaConfig.lockDmEncounter && arenaConfig.pinnedEncounterMonsters?.length > 0) {
      setDraftedMonsters(arenaConfig.pinnedEncounterMonsters);
      return;
    }
    if (matchMode === 'random_encounter' && (!arenaConfig.pinnedEncounterMonsters || arenaConfig.pinnedEncounterMonsters.length === 0)) {
      setDraftedMonsters(
        generateScaledRandomEncounter(Math.max(1, goldHeroIds.length), difficulty, monsterPool)
      );
    }
  }, [matchMode, goldHeroIds.length, difficulty, monsterPool, arenaConfig.lockDmEncounter, arenaConfig.pinnedEncounterMonsters]);

  // Adjust team slot counts automatically when switching between 1v1, 2v2, 3v3, 4v4, 5v5, and 6v6
  useEffect(() => {
    if (isPvpOrRivalMatchMode(matchMode)) {
      const cap = getMatchModeTeamCap(matchMode);
      setGoldHeroIds((prev) => {
        if (prev.length >= cap) return prev.slice(0, cap);
        const next = [...prev];
        for (const h of heroPool) {
          if (next.length >= cap) break;
          if (!next.includes(h.id)) next.push(h.id);
        }
        return next;
      });
      setCrimsonHeroIds((prev) => {
        if (prev.length >= cap) return prev.slice(0, cap);
        const next = [...prev];
        // Prefer picking rivals not already in the first `cap` heroes so teams are distinct
        const offsetPool = [...heroPool.slice(cap), ...heroPool.slice(0, cap)];
        for (const h of offsetPool) {
          if (next.length >= cap) break;
          if (!next.includes(h.id)) next.push(h.id);
        }
        return next;
      });
    } else {
      setGoldHeroIds((prev) => prev.slice(0, 6));
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

    // 1. Spawn Team Gold (Left side of Arena — up to 6 heroes in a staggered 2-column tactical formation)
    const maxGold = getMatchModeTeamCap(matchMode);
    const goldHeroes = goldHeroIds
      .slice(0, maxGold)
      .map((id) => heroPool.find((h) => h.id === id))
      .filter(Boolean) as Character[];

    if (goldHeroes.length === 0 && heroPool[0]) {
      goldHeroes.push(heroPool[0]);
    }

    const goldSpawnSlots = [
      { col: 3, row: 4 },
      { col: 3, row: 7 },
      { col: 2, row: 3 },
      { col: 2, row: 6 },
      { col: 3, row: 10 },
      { col: 2, row: 9 }
    ];

    goldHeroes.forEach((hero, idx) => {
      const d20 = Math.floor(Math.random() * 20) + 1;
      const initBonus = typeof hero.initiativeBonus === 'number' ? hero.initiativeBonus : 2;
      const slot = goldSpawnSlots[idx] || {
        col: 2 + (idx % 2),
        row: Math.min(ARENA_ROWS - 2, Math.max(2, 2 + idx * 2))
      };
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
        x: slot.col * ARENA_GRID_SIZE,
        y: slot.row * ARENA_GRID_SIZE,
        size: 1,
        conditions: [],
        actionUsed: false,
        bonusActionUsed: false,
        sourceCharacter: hero
      });
    });

    // 2. Spawn Team Crimson (Right side of Arena — up to 6 Rival Heroes or Scaled Monsters)
    if (isPvpOrRivalMatchMode(matchMode)) {
      const countNeeded = getMatchModeTeamCap(matchMode);
      const crimsonHeroes = crimsonHeroIds
        .slice(0, countNeeded)
        .map((id) => heroPool.find((h) => h.id === id))
        .filter(Boolean) as Character[];

      const crimsonSpawnSlots = [
        { col: ARENA_COLS - 4, row: 4 },
        { col: ARENA_COLS - 4, row: 7 },
        { col: ARENA_COLS - 3, row: 3 },
        { col: ARENA_COLS - 3, row: 6 },
        { col: ARENA_COLS - 4, row: 10 },
        { col: ARENA_COLS - 3, row: 9 }
      ];

      crimsonHeroes.forEach((hero, idx) => {
        const d20 = Math.floor(Math.random() * 20) + 1;
        const initBonus = typeof hero.initiativeBonus === 'number' ? hero.initiativeBonus : 2;
        const slot = crimsonSpawnSlots[idx] || {
          col: ARENA_COLS - 4 + (idx % 2),
          row: Math.min(ARENA_ROWS - 2, Math.max(2, 2 + idx * 2))
        };
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
          x: slot.col * ARENA_GRID_SIZE,
          y: slot.row * ARENA_GRID_SIZE,
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
        arenaConfig.lockDmEncounter && arenaConfig.pinnedEncounterMonsters?.length > 0
          ? arenaConfig.pinnedEncounterMonsters
          : draftedMonsters.length > 0
          ? draftedMonsters
          : generateScaledRandomEncounter(goldHeroes.length, difficulty, monsterPool);

      const hpMult = arenaConfig.monsterHpMultiplier || 1;
      const monsterSpawnRows = [3, 6, 9, 2, 5, 8, 11, 4, 7, 10];

      monstersToSpawn.forEach((mon, idx) => {
        const d20 = Math.floor(Math.random() * 20) + 1;
        const initBonus = mon.initiativeBonus ?? Math.floor(((mon.dex || 12) - 10) / 2);
        const startRow = monsterSpawnRows[idx % monsterSpawnRows.length] ?? Math.min(ARENA_ROWS - 3, Math.max(2, 2 + (idx % 5) * 2));
        const colOffset = Math.floor(idx / 3) * 2 + (idx % 2);
        const startCol = Math.max(ARENA_COLS - 8, ARENA_COLS - 4 - colOffset);
        const sizeSq = mon.size === 'Huge' || mon.size === 'Gargantuan' ? 3 : mon.size === 'Large' ? 2 : 1;
        const duplicateCount = monstersToSpawn.slice(0, idx).filter((m) => m.name === mon.name).length;
        const displayName = duplicateCount > 0 ? `${mon.name} #${duplicateCount + 1}` : mon.name;
        const scaledHp = Math.max(1, Math.round((mon.hp || 45) * hpMult));

        roster.push({
          id: `arena_crimson_mon_${idx}_${Date.now()}`,
          name: displayName,
          team: 'crimson',
          isAI: true,
          avatarUrl: mon.avatarUrl || 'https://www.dndbeyond.com/avatars/thumbnails/30783/955/1000/1000/638062024584880857.png',
          raceOrType: `${mon.size} ${mon.type}`,
          classOrCr: `CR ${mon.challenge?.split(' ')[0] || '1'}`,
          ac: mon.ac || 14,
          currentHp: scaledHp,
          maxHp: scaledHp,
          tempHp: 0,
          speedFt: 30,
          remainingMoveFt: 30,
          initiativeBonus: initBonus,
          initiativeRoll: d20 + initBonus,
          x: startCol * ARENA_GRID_SIZE,
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
    action: HudActionItem;
    tick: number;
  } | null>(null);
  const [inspectedRule, setInspectedRule] = useState<DndRuleEntry | null>(null);

  // Right-Click Context Menu State on Arena Combatants
  const [activeTokenMenu, setActiveTokenMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [tokenMenuTab, setTokenMenuTab] = useState<'stats' | 'conditions' | 'auras'>('stats');
  const [tokenMenuPinned, setTokenMenuPinned] = useState<boolean>(false);
  const [tokenMenuPos, setTokenMenuPos] = useState<{ x: number; y: number } | null>(null);

  // Manual HP & Spell Slot Overrides (synced with PlayerHeroDock +/- controls)
  const manualHpOverrideRef = useRef<Record<string, number>>({});
  const manualSpellSlotsRef = useRef<Record<string, Record<number, { available: number; total: number }>>>({});

  // Druid Circle of the Moon Wild Shape State
  const [showWildShapeModal, setShowWildShapeModal] = useState<boolean>(false);
  const [activeWildShape, setActiveWildShape] = useState<ActiveWildShapeState | null>(null);
  const [hudCollapseTick, setHudCollapseTick] = useState<number>(0);

  // Manual Dice Prompt State when Auto Roll is OFF and player casts a spell/action
  const [pendingManualDicePrompt, setPendingManualDicePrompt] = useState<PendingCombatRoll | null>(null);

  // Player-specific Automatic Dice Rolling Toggle State (persisted per character/player in localStorage)
  const [autoRollByPlayerMap, setAutoRollByPlayerMap] = useState<Record<string, boolean>>(() =>
    loadPlayerAutoRollMap()
  );
  const autoRollByPlayerMapRef = useRef<Record<string, boolean>>(autoRollByPlayerMap);
  useEffect(() => {
    autoRollByPlayerMapRef.current = autoRollByPlayerMap;
  }, [autoRollByPlayerMap]);

  const activePlayerAutoRollKey = useMemo(
    () =>
      normalizePlayerAutoRollKey(
        activeWildShape?.originalName ||
          activeCombatant?.sourceCharacter?.name ||
          activeCombatant?.name,
        activeCombatant?.sourceCharacter?.ddbCharacterId,
        activeCombatant?.id
      ),
    [
      activeWildShape?.originalName,
      activeCombatant?.sourceCharacter?.name,
      activeCombatant?.sourceCharacter?.ddbCharacterId,
      activeCombatant?.name,
      activeCombatant?.id
    ]
  );

  const isAutoRollDiceEnabled = useMemo(
    () => autoRollByPlayerMap[activePlayerAutoRollKey] !== false,
    [autoRollByPlayerMap, activePlayerAutoRollKey]
  );

  const isCombatantAutoRollEnabled = useCallback((combatant: ArenaCombatant) => {
    const key = normalizePlayerAutoRollKey(
      combatant.sourceCharacter?.name || combatant.name,
      combatant.sourceCharacter?.ddbCharacterId,
      combatant.id
    );
    return autoRollByPlayerMapRef.current[key] !== false;
  }, []);

  const handleToggleAutoRollDice = useCallback(
    (nextEnabled: boolean) => {
      const updated = savePlayerAutoRollPreference(activePlayerAutoRollKey, nextEnabled);
      autoRollByPlayerMapRef.current = updated;
      setAutoRollByPlayerMap(updated);
      const heroLabel =
        activeWildShape?.originalName ||
        activeCombatant?.sourceCharacter?.name ||
        activeCombatant?.name ||
        'This character';
      if (nextEnabled) {
        toast.success(`🎲 Auto Roll turned ON for ${heroLabel}`, {
          description: `${heroLabel}'s HUD spells and actions will automatically roll 3D dice.`
        });
      } else {
        toast.info(`✨ Auto Roll turned OFF for ${heroLabel}`, {
          description: `${heroLabel}'s HUD spells and actions will play spell animations only.`
        });
      }
    },
    [
      activePlayerAutoRollKey,
      activeWildShape?.originalName,
      activeCombatant?.sourceCharacter?.name,
      activeCombatant?.name
    ]
  );

  // Real-time Movement Drag Ruler State (Identical to standard Player View)
  const [tokenDragState, setTokenDragState] = useState<TokenDragState | null>(null);

  // Aiming Reticle State for Spells & Weapon Targeting (Identical to standard Player View)
  const [activeEquippedAsset, setActiveEquippedAsset] = useState<Jb2aAssetDefinition | null>(null);
  const [aimOrigin, setAimOrigin] = useState<{ x: number; y: number } | null>(null);
  const [aimCurrent, setAimCurrent] = useState<{ x: number; y: number } | null>(null);

  // Drag Ruler Handlers
  const handleDragStartToken = useCallback(
    (combatant: ArenaCombatant, originX: number, originY: number, baseSpeed: number) => {
      setTokenDragState({
        tokenId: combatant.id,
        tokenName: combatant.name,
        tokenAvatarUrl: combatant.avatarUrl,
        tokenSize: combatant.size || 1,
        originX,
        originY,
        currentX: originX,
        currentY: originY,
        baseSpeed,
        distancePx: 0,
        distanceFt: 0,
        remainingFt: baseSpeed
      });
    },
    []
  );

  const handleDragMoveToken = useCallback((id: string, rawX: number, rawY: number) => {
    setTokenDragState((prev) => {
      if (!prev || prev.tokenId !== id) return prev;
      const dx = rawX - prev.originX;
      const dy = rawY - prev.originY;
      const distancePx = Math.hypot(dx, dy);
      const distanceFt = Math.round(distancePx / ARENA_GRID_SIZE) * 5;
      const remainingFt = prev.baseSpeed - distanceFt;
      return {
        ...prev,
        currentX: rawX,
        currentY: rawY,
        distancePx,
        distanceFt,
        remainingFt
      };
    });
  }, []);

  // Global pointerup to ensure drag ruler cleanly releases
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (tokenDragState) {
        setTokenDragState(null);
      }
    };
    window.addEventListener('mouseup', handleGlobalPointerUp);
    window.addEventListener('touchend', handleGlobalPointerUp);
    window.addEventListener('touchcancel', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalPointerUp);
      window.removeEventListener('touchend', handleGlobalPointerUp);
      window.removeEventListener('touchcancel', handleGlobalPointerUp);
    };
  }, [tokenDragState]);

  // Handle Dragging Pinned Token Context Menu
  const startTokenMenuDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input, select, textarea, a, [data-no-drag]')) return;
    const menuEl = document.getElementById('arena-token-context-menu');
    if (!menuEl) return;
    const rect = menuEl.getBoundingClientRect();
    const offX = e.clientX - rect.left;
    const offY = e.clientY - rect.top;
    const handleEl = e.currentTarget;
    try { handleEl.setPointerCapture(e.pointerId); } catch {}
    const onMove = (ev: PointerEvent) => {
      const maxX = Math.max(0, window.innerWidth - rect.width);
      const maxY = Math.max(0, window.innerHeight - 48);
      setTokenMenuPos({
        x: Math.max(0, Math.min(ev.clientX - offX, maxX)),
        y: Math.max(0, Math.min(ev.clientY - offY, maxY))
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
  }, []);

  // Update Combatant Properties (HP, AC, Conditions, etc.)
  const handleUpdateCombatant = useCallback((id: string, updates: Partial<ArenaCombatant>) => {
    setCombatants((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }, []);

  // Wild Shape Transform & Revert Handlers for Druids
  const handleTransformWildShape = useCallback(
    (form: WildShapeBeastForm) => {
      const targetId = activeCombatant?.id || activeTokenMenu?.id;
      const targetCombatant = combatants.find((c) => c.id === targetId) || activeCombatant;
      if (!targetCombatant) return;

      const calculatedTempHp = 6 * 3; // 2024 Circle of the Moon: 3 x Druid Level (6) = 18 Temp HP
      const calculatedAc = Math.max(form.baseAc, 13 + 4); // 13 + WIS (+4) = 17 AC
      const prevState: ActiveWildShapeState = activeWildShape || {
        originalName: targetCombatant.name,
        originalAvatarUrl: targetCombatant.avatarUrl,
        originalAc: targetCombatant.ac,
        originalSpeed: form.speed,
        originalWalkSpeedFt: form.walkSpeedFt,
        originalSize: targetCombatant.size || 1,
        beastFormId: form.id,
        beastName: form.name,
        tempHpGranted: calculatedTempHp,
        startedAt: Date.now(),
        durationHours: 3,
        canRadiantStrikes: true
      };
      setActiveWildShape(prevState);
      setShowWildShapeModal(false);
      setHudCollapseTick((t) => t + 1);

      soundCatalog.play('druid_bloom', 1.0);

      // Spawn Nature Transformation Effect on Combatant
      const tokenRadius = ((targetCombatant.size || 1) * ARENA_GRID_SIZE) / 2;
      const burstEffect: VttEffectInstance = {
        id: `arena_eff_ws_${Date.now()}`,
        name: 'Wild Shape Transformation',
        label: 'Druid Wild Shape Bloom',
        assetKey: 'druidcraft',
        videoUrl: '/jb2a/Library/Generic/Nature/PlantGrowthRing02_01_Regular_GreenRed_500x500.webm',
        thumbUrl: '/jb2a/Library/Generic/Nature/PlantGrowthRing02_01_Regular_GreenRed_Thumb.webp',
        paradigm: 'aura',
        x: targetCombatant.x + tokenRadius,
        y: targetCombatant.y + tokenRadius,
        sizeFt: form.sizeMultiplier * 10,
        rotation: 0,
        opacity: 1.0,
        blendMode: 'screen',
        isPersistent: false,
      loop: false,
      durationMs: 3500,
        soundKey: 'druid_bloom',
                castTime: Date.now()
      };
      setArenaEffects((prev) => [...prev, burstEffect]);

      // Update Combatant on Battlemap
      setCombatants((prev) =>
        prev.map((c) => {
          if (c.id === targetCombatant.id) {
            return {
              ...c,
              name: `${prevState.originalName} (${form.name})`,
              avatarUrl: form.avatarUrl,
              size: form.sizeMultiplier,
              tempHp: Math.max(c.tempHp || 0, calculatedTempHp),
              ac: calculatedAc,
              speedFt: form.walkSpeedFt
            };
          }
          return c;
        })
      );

      addCombatLog(
        targetCombatant.name,
        targetCombatant.team,
        `🌿 Wild Shape: Transformed into ${form.name}!`,
        `AC: ${calculatedAc} • +${calculatedTempHp} Temp HP • Size: ${form.size} (${form.sizeMultiplier}x${form.sizeMultiplier}) • Speed: ${form.speed}`
      );
      toast.success(`🌿 Wild Shape: Transformed into ${form.name}!`, {
        description: `AC ${calculatedAc} • +${calculatedTempHp} Temp HP • Speed ${form.speed}`
      });
    },
    [activeCombatant, activeTokenMenu, combatants, activeWildShape, addCombatLog]
  );

  const handleRevertWildShape = useCallback(() => {
    if (!activeWildShape) {
      toast.info('No active Wild Shape form to revert.');
      return;
    }
    const targetId = activeCombatant?.id || activeTokenMenu?.id;
    const targetCombatant = combatants.find((c) => c.id === targetId) || activeCombatant;
    if (!targetCombatant) return;

    soundCatalog.play('nature_rustle', 0.8);

    const tokenRadius = ((targetCombatant.size || 1) * ARENA_GRID_SIZE) / 2;
    const revertEffect: VttEffectInstance = {
      id: `arena_eff_revert_${Date.now()}`,
      name: 'Revert Wild Shape',
      label: 'Druid Shape Reversion',
      assetKey: 'druidcraft',
      videoUrl: '/jb2a/Library/Generic/Nature/PlantGrowthRing02_01_Regular_GreenRed_500x500.webm',
      thumbUrl: '/jb2a/Library/Generic/Nature/PlantGrowthRing02_01_Regular_GreenRed_Thumb.webp',
      paradigm: 'aura',
      x: targetCombatant.x + tokenRadius,
      y: targetCombatant.y + tokenRadius,
      sizeFt: 10,
      rotation: 0,
      opacity: 0.9,
      blendMode: 'screen',
      isPersistent: false,
      loop: false,
      durationMs: 3000,
      soundKey: 'nature_rustle',
            castTime: Date.now()
    };
    setArenaEffects((prev) => [...prev, revertEffect]);

    setCombatants((prev) =>
      prev.map((c) => {
        if (c.id === targetCombatant.id) {
          return {
            ...c,
            name: activeWildShape.originalName,
            avatarUrl: activeWildShape.originalAvatarUrl,
            size: activeWildShape.originalSize,
            ac: activeWildShape.originalAc,
            speedFt: activeWildShape.originalWalkSpeedFt
          };
        }
        return c;
      })
    );

    const revertedBeastName = activeWildShape.beastName;
    setActiveWildShape(null);

    addCombatLog(
      targetCombatant.name,
      targetCombatant.team,
      `Reverted from ${revertedBeastName} back to Wood Elf humanoid form.`
    );
    toast.success(`Reverted from ${revertedBeastName} back to Wood Elf!`);
  }, [activeWildShape, activeCombatant, activeTokenMenu, combatants, addCombatLog]);

  // Helper to resolve D&D Beyond Character ID for any Arena Combatant or Hero
  const getCombatantDdbId = useCallback((c?: ArenaCombatant | Character | null): string | undefined => {
    if (!c) return undefined;
    const direct = (c as any).sourceCharacter?.ddbCharacterId || (c as any).ddbCharacterId;
    if (direct) return String(direct).replace(/^char_ddb_/, '').trim();
    return resolveTokenDdbCharacterId(
      {
        id: c.id,
        name: (c as any).sourceCharacter?.name || c.name,
        ddbCharacterId: (c as any).sourceCharacter?.ddbCharacterId || (c as any).ddbCharacterId
      },
      heroPool
    );
  }, [heroPool]);

  // Fetch live D&D Beyond HUD data for combatants with a resolvable DDB Character ID
  useEffect(() => {
    // Collect all candidates needing live DDB HUD data: active combatant, all human combatants, and roster heroes
    const candidateDdbIds = new Set<string>();

    const activeDdbId = getCombatantDdbId(activeCombatant);
    if (activeDdbId && !liveDdbHudMap[activeDdbId]) {
      candidateDdbIds.add(activeDdbId);
    }

    combatants.forEach((c) => {
      const id = getCombatantDdbId(c);
      if (id && !liveDdbHudMap[id]) {
        candidateDdbIds.add(id);
      }
    });

    goldHeroIds.forEach((heroId) => {
      const hero = heroPool.find((h) => h.id === heroId);
      const id = getCombatantDdbId(hero);
      if (id && !liveDdbHudMap[id]) {
        candidateDdbIds.add(id);
      }
    });

    if (candidateDdbIds.size === 0) return;

    let cancelled = false;
    candidateDdbIds.forEach((ddbId) => {
      fetch(`/api/ddb/characters/${ddbId}/hud-data`)
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (!cancelled && json) {
            const hudData: HudCharacterData | null = json.hudData || (json.name ? json : null);
            if (hudData && hudData.name) {
              setLiveDdbHudMap((prev) => ({ ...prev, [String(ddbId)]: hudData }));
            }
          }
        })
        .catch(() => {});
    });

    return () => {
      cancelled = true;
    };
  }, [activeCombatant, combatants, goldHeroIds, heroPool, liveDdbHudMap, getCombatantDdbId]);

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
        asset.isPersistent ||
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

      const attachToTokenId = isPersistentAura
        ? action.isSelfAction
          ? caster.id
          : !targetPointPx
          ? target.id
          : undefined
        : undefined;

      const dx = targetCenter.x - casterCenter.x;
      const dy = targetCenter.y - casterCenter.y;
      const angleDeg = dx === 0 && dy === 0 ? 0 : (Math.atan2(dy, dx) * 180) / Math.PI;
      const isDirectional =
        asset.paradigm === 'cone' ||
        asset.paradigm === 'line' ||
        (asset.paradigm as any) === 'beam' ||
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
        paradigm: isPersistentAura && attachToTokenId ? 'aura' : asset.paradigm,
        x: isProjectile ? casterCenter.x : targetCenter.x,
        y: isProjectile ? casterCenter.y : targetCenter.y,
        originX: casterCenter.x,
        originY: casterCenter.y,
        targetX: targetCenter.x,
        targetY: targetCenter.y,
        sizeFt,
                rotation: isDirectional ? angleDeg : 0,
        opacity: 1,
        blendMode: asset.blendMode || 'screen',
        isPersistent: isPersistentAura,
        durationMs: isPersistentAura ? 600000 : (asset as any).defaultDurationMs || 1800,
        loop: isPersistentAura,
        castTime: Date.now(),
        soundKey: asset.soundKey,
        casterName: caster.name,
        attachedTokenId: attachToTokenId,
        castAtLevel: action.castAtLevel ?? action.level,
        baseLevel: (action as any).baseSpellLevel ?? action.level,
        damageFormula: action.damageFormula,
        damageType: action.damageType,
        saveDc: action.saveDc,
        saveAbility: action.saveAbility,
                actionSnapshot: action,
        trajectory: isProjectile
          ? {
              startX: casterCenter.x,
              startY: casterCenter.y,
              endX: targetCenter.x,
              endY: targetCenter.y,
              speedPxSec: 950
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

  // Active map walls from DM Battle Arena Config
  const activeMapWalls = useMemo(
    () => arenaConfig.mapWalls?.[selectedMap.id] || [],
    [arenaConfig.mapWalls, selectedMap.id]
  );

  // Active environmental hazards (Lava pits, Chasms, Acid pools) for current battlemap
  const activeMapHazards = useMemo<HazardZone[]>(() => {
    if (arenaConfig.mapHazards && arenaConfig.mapHazards[selectedMap.id]) {
      return arenaConfig.mapHazards[selectedMap.id];
    }
    if (selectedMap.id === 'lavapit' || selectedMap.name.toLowerCase().includes('lava')) {
      return generateLavapitDefaultHazards(ARENA_GRID_SIZE, ARENA_COLS, ARENA_ROWS);
    }
    return [];
  }, [arenaConfig.mapHazards, selectedMap.id, selectedMap.name]);

  // Toggle a door wall open/closed during Arena Battle
  const handleToggleArenaDoor = useCallback(
    (wallId: string) => {
      const currentWalls = arenaConfig.mapWalls?.[selectedMap.id] || [];
      const updatedWalls: WallSegment[] = currentWalls.map((w) => {
        if (w.id !== wallId) return w;
        const nextOpen = !(w.doorState === 'open' || w.isOpen);
        return {
          ...w,
          isOpen: nextOpen,
          doorState: (nextOpen ? 'open' : 'closed') as DoorState
        };
      });
      const nextCfg: ArenaConfig = {
        ...arenaConfig,
        mapWalls: {
          ...(arenaConfig.mapWalls || {}),
          [selectedMap.id]: updatedWalls
        },
        updatedAt: Date.now()
      };
      setArenaConfig(nextCfg);
      saveArenaConfig(nextCfg, socketRef.current);
      const targetDoor = updatedWalls.find((w) => w.id === wallId);
      if (targetDoor) {
        toast.info(targetDoor.doorState === 'open' || targetDoor.isOpen ? '🚪 Arena Door Opened!' : '🔒 Arena Door Closed!');
      }
    },
    [arenaConfig, selectedMap.id, socketRef]
  );

  // Execute an Attack, Spell, Aura, Teleport, or Heal from `actor` onto `target` (or `targetPointPx`)
  const executeCombatAction = useCallback(
    (
      actor: ArenaCombatant,
      target: ArenaCombatant,
      action: HudActionItem,
      targetPointPx?: { x: number; y: number },
      rollOverrides?: {
        manualTotal?: number;
        forceInGameRoll?: boolean;
      }
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

      // Enforce DM Arena Walls Line-of-Sight if enabled
      if (
        arenaConfig.enforceWalls &&
        activeMapWalls.length > 0 &&
        !action.isSelfAction &&
        actor.id !== target.id &&
        !actor.isFlying &&
        !target.isFlying &&
        doesArenaWallBlockSight(activeMapWalls, actorCx, actorCy, targetCx, targetCy)
      ) {
        if (!actor.isAI) {
          toast.warning('🧱 Line of Sight blocked by an Arena wall or closed door!');
        }
        return false;
      }

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

      // Deduct spell slot if this was a leveled spell cast by a human combatant
      const spellSlotLevelToDeduct = action.castAtLevel ?? action.level ?? (action.spellSlotRequired ? Number(action.spellSlotRequired) : 0);
      if (!actor.isAI && spellSlotLevelToDeduct >= 1 && (action.category === 'spells' || action.subCategory === 'spell')) {
        const charKey = String(actor.sourceCharacter?.ddbCharacterId || actor.id || actor.name);
        const existingSlots = manualSpellSlotsRef.current[charKey] || {};
        const curSlot = activeHeroHudData?.spellSlots?.[spellSlotLevelToDeduct];
        if (curSlot) {
          const nextAvail = Math.max(0, curSlot.available - 1);
          manualSpellSlotsRef.current[charKey] = {
            ...existingSlots,
            [spellSlotLevelToDeduct]: { available: nextAvail, total: curSlot.total }
          };
          toast.info(`Spent 1 Level ${spellSlotLevelToDeduct} spell slot (${nextAvail}/${curSlot.total} remaining)`);
        }
      }

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

      // 1b. Halo / Self-Illumination Glow Toggle
      if (action.id === 'special-halo-glow' || lowerName.includes('divine halo') || lowerName.includes('halo & holy glow')) {
        const nextHalo = !Boolean(actor.haloActive);
        setCombatants((prev) =>
          prev.map((c) => (c.id === actor.id ? { ...c, haloActive: nextHalo } : c))
        );
        soundCatalog.play('magic_chime', 0.85);
        toast.success(
          nextHalo
            ? `✨ ${actor.name} is now illuminated with a radiant golden halo!`
            : `${actor.name}'s halo illumination deactivated.`
        );
        addCombatLog(actor.name, actor.team, nextHalo ? 'activated Divine Halo illumination' : 'deactivated halo');
        return true;
      }

      // 1c. Devotee's Censer: Healing Incense (10ft Green Smoke Aura + 1d4 Healing)
      if (action.id === 'special-devotees-censer' || lowerName.includes('healing incense')) {
        const incenseRoll = rollDiceFormula('1d4', false);
        soundCatalog.play('radiant_heal', 0.85);

        const incenseEffect: VttEffectInstance = {
          id: `eff_censer_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: "Devotee's Censer: Healing Incense",
          label: 'Healing Incense (10ft Green Smoke Aura)',
          assetKey: 'healing_incense',
          videoUrl: '/jb2a/Community/JAA/cloudKill.webm',
          loopVideoUrl: '/jb2a/Community/JAA/cloudKill.webm',
          paradigm: 'aura',
          x: actorCx,
          y: actorCy,
          sizeFt: 20,
          rotation: 0,
          opacity: 0.85,
          blendMode: 'screen',
          isPersistent: true,
          loop: true,
          castTime: Date.now(),
          durationMs: 600000,
          soundKey: 'radiant_heal',
          color: '#22c55e',
          attachedTokenId: actor.id,
          casterName: actor.name
        };

        setArenaEffects((prev) => [
          ...prev.filter((f) => f.name !== "Devotee's Censer: Healing Incense" || f.attachedTokenId !== actor.id),
          incenseEffect
        ]);

        if (!actor.isAI && !isCombatantAutoRollEnabled(actor)) {
          setCombatants((prev) => prev.map((c) => (c.id === actor.id ? markActorUsed(c) : c)));
          toast.success(`✨ Healing Incense emanates 10ft around ${actor.name}!`);
          addCombatLog(
            actor.name,
            actor.team,
            `activated Devotee's Censer: Healing Incense (10ft Green Smoke Aura)!`,
            action.description
          );
          return true;
        }

        const healedComps: string[] = [];
        setCombatants((prev) =>
          prev.map((c) => {
            const cx = c.x + ((c.size || 1) * ARENA_GRID_SIZE) / 2;
            const cy = c.y + ((c.size || 1) * ARENA_GRID_SIZE) / 2;
            const d = Math.round((Math.hypot(cx - actorCx, cy - actorCy) / ARENA_GRID_SIZE) * 5);
            if (d <= 10 && c.currentHp > 0) {
              const newHp = Math.min(c.maxHp, c.currentHp + incenseRoll.total);
              healedComps.push(c.name);
              return {
                ...c,
                currentHp: newHp,
                ...(c.id === actor.id ? markActorUsed(c) : {})
              };
            }
            if (c.id === actor.id) return markActorUsed(c);
            return c;
          })
        );

        toast.success(`✨ Healing Incense emanates 10ft! Restored +${incenseRoll.total} HP to ${healedComps.join(', ')}.`);
        addCombatLog(
          actor.name,
          actor.team,
          `activated Devotee's Censer: Healing Incense (+${incenseRoll.total} HP to all within 10ft)!`,
          incenseRoll.breakdown
        );
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

      // If Automatic Dice Rolling is toggled OFF for this player's HUD, intercept with manual dice prompt or proceed if rollOverrides provided
      const autoRollOn = isCombatantAutoRollEnabled(actor);
      if (!actor.isAI && !autoRollOn && !rollOverrides) {
        // Intercept and prompt player to insert manual dice roll, roll 3D dice in-game, or turn Auto Roll ON!
        const isSpellAction = action.category === 'spells' || action.subCategory === 'spell';
        const hasAttack = Boolean(action.isAttack || action.hitBonus);
        const hasDamage = Boolean(action.damageFormula && action.damageFormula !== '0');
        const hasSave = Boolean(action.saveDc && !action.isAttack);
        const isHealingAction = isActionHealing(action);

        if (isSpellAction || hasAttack || hasDamage || hasSave || isHealingAction) {
          const rawBonus = action.hitBonus !== undefined ? parseInt(String(action.hitBonus).replace('+', ''), 10) : 6;
          const isRanged = (action.rangeFt && action.rangeFt >= 20) || action.description?.toLowerCase().includes('ranged');
          let isThreatened = false;
          if (isRanged) {
            isThreatened = combatants.some((other) => {
              if (other.id === actor.id || other.team === actor.team || other.currentHp <= 0) return false;
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

          setPendingManualDicePrompt({
            actor,
            target,
            action,
            targetPointPx,
            phase: hasAttack ? 'to_hit' : 'damage',
            hitBonus: !isNaN(Number(rawBonus)) ? rawBonus : 6,
            isThreatened,
            damageFormula: action.damageFormula || (isHealingAction ? '1d8 + 3' : '1d10 + 4'),
            isHeal: isHealingAction,
            saveDc: action.saveDc ? Number(action.saveDc) : undefined,
            saveAbility: action.saveAbility,
            isAttack: hasAttack,
            context: 'arena'
          });
          return true;
        }

        // For non-damaging utility/buffs with no dice rolls:
        const upcastSuffix =
          action.castAtLevel && action.castAtLevel > (action.level ?? 0)
            ? ` (L${action.castAtLevel})`
            : '';
        setCombatants((prev) => prev.map((c) => (c.id === actor.id ? markActorUsed(c) : c)));
        toast.success(`✨ Cast ${action.name}${upcastSuffix}!`);
        addCombatLog(
          actor.name,
          actor.team,
          `cast ${action.name}${upcastSuffix}${target.id !== actor.id ? ` on ${target.name}` : ''}!`,
          'Spell animation played (Auto Roll OFF)'
        );
        return true;
      }

      // 3. Healing Action / Spell
      const isHeal = isActionHealing(action);
      if (isHeal) {
        let healFormula = action.damageFormula;
        if (!healFormula || healFormula === '0') {
          if (lowerName.includes('healing word')) {
            healFormula = '1d4 + 4';
          } else if (lowerName.includes('potion')) {
            healFormula = '4d4 + 4';
          } else if (lowerName.includes('second wind')) {
            healFormula = `1d10 + ${actor.classOrCr?.match(/\d+/)?.[0] || '5'}`;
          } else if (lowerName.includes('lay on hands')) {
            healFormula = '15';
          } else {
            healFormula = '2d8 + 4';
          }
        }
        const baseHealRoll = rollDiceFormula(healFormula, false);
        const healTotal = rollOverrides?.manualTotal !== undefined ? rollOverrides.manualTotal : baseHealRoll.total;
        const healRoll = {
          ...baseHealRoll,
          total: healTotal,
          breakdown: rollOverrides?.manualTotal !== undefined ? `[Manual Table Roll: ${healTotal}] = ${healTotal}` : baseHealRoll.breakdown
        };
        const upcastSuffix =
          action.castAtLevel && action.castAtLevel > (action.level ?? 0)
            ? ` (L${action.castAtLevel})`
            : '';

        if (onTrigger3dDice && healRoll.dice.length > 0) {
          onTrigger3dDice({
            id: `arena-heal-${Date.now()}`,
            characterName: actor.name,
            action: `${action.name}${upcastSuffix} (Healing)`,
            rollType: 'heal',
            formula: `${healFormula} → ${healRoll.breakdown}`,
            diceNotation: healFormula,
            dice: healRoll.dice,
            modifier: healRoll.bonus,
            total: healRoll.total,
            timestamp: Date.now(),
            source: 'player'
          });
        }

        const isMultiAllyHeal =
          lowerName.includes('mass ') ||
          lowerName.includes('prayer of healing') ||
          lowerName === 'aid' ||
          lowerName.includes('preserve life') ||
          lowerName.includes('aura of vitality');

        let totalHealedAmount = 0;
        const healedNames: string[] = [];

        setCombatants((prev) =>
          prev.map((c) => {
            const isTarget = c.id === target.id;
            const isActor = c.id === actor.id;
            const isMultiTarget = isMultiAllyHeal && c.team === actor.team && c.currentHp > 0;

            if (isMultiTarget || isTarget) {
              const oldHp = c.currentHp;
              const newHp = Math.min(c.maxHp, oldHp + healRoll.total);
              const gained = newHp - oldHp;
              totalHealedAmount += gained;
              healedNames.push(c.name);

              return {
                ...c,
                currentHp: newHp,
                ...(isActor ? markActorUsed(c) : {})
              };
            }
            if (isActor) {
              return markActorUsed(c);
            }
            return c;
          })
        );

        soundCatalog.play('radiant_heal', 0.85);

        if (target.currentHp >= target.maxHp && totalHealedAmount === 0 && !isMultiAllyHeal) {
          toast.info(`💚 ${target.name} is already at full health (${target.maxHp}/${target.maxHp} HP)!`);
        } else {
          toast.success(
            `💚 Restored +${healRoll.total} HP to ${healedNames.length > 1 ? healedNames.join(', ') : target.name}!`
          );
        }

        // Blessed Healer Automatic Trigger (Life Domain Cleric / Stavros)
        // "When you cast a spell of 1st level or higher that restores HP to a creature other than you, you regain HP equal to 2 + the spell's level."
        const effectiveCastSpellLevel = action.castAtLevel ?? action.level ?? 0;
        const isLeveledHealingSpell = Boolean(
          effectiveCastSpellLevel >= 1 &&
          (action.category === 'spells' || action.subCategory === 'spell' || (action.level ?? 0) >= 1) &&
          (action.isHeal || isHeal)
        );
        const casterHasBlessedHealer = Boolean(
          actor.name.toLowerCase().includes('stavros') ||
          actor.sourceCharacter?.name?.toLowerCase().includes('stavros') ||
          (actor.sourceCharacter?.classLevel || '').toLowerCase().includes('cleric')
        );

        if (casterHasBlessedHealer && isLeveledHealingSpell && target.id !== actor.id) {
          const blessedHealAmount = 2 + effectiveCastSpellLevel;
          setCombatants((prev) =>
            prev.map((c) =>
              c.id === actor.id
                ? { ...c, currentHp: Math.min(c.maxHp, c.currentHp + blessedHealAmount) }
                : c
            )
          );

          // Green healing shimmer on caster for Blessed Healer
          const bhEffect: VttEffectInstance = {
            id: `eff_bh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: `Blessed Healer (+${blessedHealAmount} HP)`,
            label: 'Blessed Healer Self-Restoration',
            assetKey: 'cure_wounds',
            videoUrl: '/jb2a/Library/1st_Level/Cure_Wounds/CureWounds_01_Green_400x400.webm',
            thumbUrl: '/jb2a/Library/1st_Level/Cure_Wounds/CureWounds_01_Green_Thumb.webp',
            paradigm: 'point',
            x: actorCx,
            y: actorCy,
            sizeFt: 5,
            rotation: 0,
            opacity: 0.95,
            blendMode: 'screen',
            isPersistent: false,
            loop: false,
            castTime: Date.now(),
            durationMs: 2800,
            soundKey: 'radiant_heal',
            color: '#4ade80',
            attachedTokenId: actor.id,
            casterName: actor.name
          };
          setArenaEffects((prev) => [...prev, bhEffect]);

          toast.success(`✨ Blessed Healer: ${actor.name} regained +${blessedHealAmount} HP!`, {
            description: `Cast a Level ${effectiveCastSpellLevel} healing spell on ${target.name} (2 + ${effectiveCastSpellLevel} = +${blessedHealAmount} HP to self).`
          });
          addCombatLog(
            actor.name,
            actor.team,
            `regained +${blessedHealAmount} HP from Blessed Healer!`,
            `2 + Level ${effectiveCastSpellLevel} spell`
          );
        }

        addCombatLog(
          actor.name,
          actor.team,
          `healed ${healedNames.length > 1 ? healedNames.join(', ') : target.name} with ${action.name}${upcastSuffix} for +${healRoll.total} HP!`,
          healRoll.breakdown
        );
        return true;
      }

      // 4. Auto-Hit Spells (Magic Missile)
      if (lowerName.includes('magic missile')) {
        const mmFormula = action.damageFormula || '3d4 + 3';
        const baseDmgRoll = rollDiceFormula(mmFormula, false);
        const mmTotal = rollOverrides?.manualTotal !== undefined ? rollOverrides.manualTotal : baseDmgRoll.total;
        const dmgRoll = {
          ...baseDmgRoll,
          total: mmTotal,
          breakdown: rollOverrides?.manualTotal !== undefined ? `[Manual Table Roll: ${mmTotal}] = ${mmTotal}` : baseDmgRoll.breakdown
        };
        if (onTrigger3dDice && dmgRoll.dice.length > 0) {
          onTrigger3dDice({
            id: `arena-mm-${Date.now()}`,
            characterName: actor.name,
            action: `${action.name}${action.castAtLevel ? ` (L${action.castAtLevel})` : ''} (Force Darts)`,
            rollType: 'damage',
            formula: `${mmFormula} → ${dmgRoll.breakdown}`,
            diceNotation: mmFormula,
            dice: dmgRoll.dice,
            modifier: dmgRoll.bonus,
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
        const sgFormula = action.damageFormula || '3d8';
        const baseDmgRoll = rollDiceFormula(sgFormula, false);
        const sgTotal = rollOverrides?.manualTotal !== undefined ? rollOverrides.manualTotal : baseDmgRoll.total;
        const dmgRoll = {
          ...baseDmgRoll,
          total: sgTotal,
          breakdown: rollOverrides?.manualTotal !== undefined ? `[Manual Table Roll: ${sgTotal}] = ${sgTotal}` : baseDmgRoll.breakdown
        };
        const dc = Number(action.saveDc) || 16;
        if (onTrigger3dDice && dmgRoll.dice.length > 0) {
          onTrigger3dDice({
            id: `arena-sg-${Date.now()}`,
            characterName: actor.name,
            action: `${action.name}${action.castAtLevel ? ` (L${action.castAtLevel})` : ''}`,
            rollType: 'damage',
            formula: `${sgFormula} → ${dmgRoll.breakdown}`,
            diceNotation: sgFormula,
            dice: dmgRoll.dice,
            modifier: dmgRoll.bonus,
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
          `activated ${action.name}${action.castAtLevel ? ` (Slot Level ${action.castAtLevel})` : ''} — 15ft Radiant Aura (${sgFormula})!`,
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

        let dmgRoll: any = null;
        if (action.damageFormula) {
          const baseDmgRoll = rollDiceFormula(action.damageFormula, false);
          const saveTotal = rollOverrides?.manualTotal !== undefined ? rollOverrides.manualTotal : baseDmgRoll.total;
          dmgRoll = {
            ...baseDmgRoll,
            total: saveTotal,
            breakdown: rollOverrides?.manualTotal !== undefined ? `[Manual Table Roll: ${saveTotal}] = ${saveTotal}` : baseDmgRoll.breakdown
          };
        }

        if (dmgRoll && dmgRoll.dice.length > 0 && onTrigger3dDice) {
          onTrigger3dDice({
            id: `arena-save-dmg-${Date.now()}`,
            characterName: actor.name,
            action: `${action.name}${action.castAtLevel ? ` (L${action.castAtLevel})` : ''} (${saveAbil} DC ${dc})`,
            rollType: 'damage',
            formula: `${action.damageFormula} → ${dmgRoll.breakdown}`,
            diceNotation: action.damageFormula || '3d8',
            dice: dmgRoll.dice,
            modifier: dmgRoll.bonus,
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

      const d20Roll1 = rollOverrides?.manualTotal !== undefined
        ? Math.max(1, Math.min(20, rollOverrides.manualTotal))
        : Math.floor(Math.random() * 20) + 1;
      const d20Roll2 = Math.floor(Math.random() * 20) + 1;
      const d20 = isThreatened && rollOverrides?.manualTotal === undefined ? Math.min(d20Roll1, d20Roll2) : d20Roll1;
      const isCrit = d20 === 20;
      const isFumble = d20 === 1;
      const attackTotal = d20 + rawHitBonus;

      const rollFormula = rollOverrides?.manualTotal !== undefined
        ? `[Manual Table d20: ${d20}] + ${rawHitBonus} = ${attackTotal}`
        : isThreatened
        ? `1d20 Disadvantage [${d20Roll1}, ${d20Roll2}] (${d20}) + ${rawHitBonus} = ${attackTotal}`
        : `1d20 (${d20}) + ${rawHitBonus} = ${attackTotal}`;

      const hitsTarget = isCrit || (!isFumble && attackTotal >= target.ac);

      // Trigger 3D Physics To-Hit D20 roll independently
      if (onTrigger3dDice) {
        onTrigger3dDice({
          id: `arena-atk-${Date.now()}`,
          characterName: actor.name,
          action: `${action.name}${isThreatened ? ' (Disadvantage)' : ''} — ${isCrit ? 'CRITICAL HIT!' : hitsTarget ? `HIT (vs AC ${target.ac})` : `MISS (vs AC ${target.ac})`}`,
          rollType: 'attack',
          formula: rollFormula,
          diceNotation: isThreatened ? '2d20kl1' : '1d20',
          dice: isThreatened
            ? [
                { sides: 20, result: d20Roll1, type: 'd20' },
                { sides: 20, result: d20Roll2, type: 'd20' }
              ]
            : [{ sides: 20, result: d20, type: 'd20' }],
          modifier: rawHitBonus,
          total: attackTotal,
          isCritical: isCrit,
          isFumble,
          timestamp: Date.now(),
          source: 'player'
        });
      }

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

      // Roll Damage (applying DM Monster Damage Multiplier for AI monsters)
      const atkDamageFormula = action.damageFormula || '1d10 + 4';
      const dmgRoll = rollDiceFormula(atkDamageFormula, isCrit);
      const dmgMult =
        actor.team === 'crimson' && actor.isAI ? arenaConfig.monsterDamageMultiplier || 1 : 1;
      const finalDamage = Math.max(1, Math.round(dmgRoll.total * dmgMult));

      // Trigger 3D physics roll with all the spell/weapon damage dice so the exact dice count and dice types tumble independently!
      const damageDelayMs = onTrigger3dDice ? 1350 : 0;
      window.setTimeout(() => {
        if (onTrigger3dDice && dmgRoll.dice.length > 0) {
          onTrigger3dDice({
            id: `arena-hit-dmg-${Date.now()}`,
            characterName: actor.name,
            action: `${action.name}${action.castAtLevel ? ` (L${action.castAtLevel})` : ''} (${action.damageType || 'Damage'}${isCrit ? ' • Critical' : ''})`,
            rollType: 'damage',
            formula: `${atkDamageFormula} → ${dmgRoll.breakdown}`,
            diceNotation: atkDamageFormula,
            dice: dmgRoll.dice,
            modifier: dmgRoll.bonus,
            total: finalDamage,
            isCritical: isCrit,
            isFumble: false,
            timestamp: Date.now(),
            source: 'player'
          });
        }
      }, damageDelayMs);

      setCombatants((prev) =>
        prev.map((c) => {
          if (c.id === target.id) {
            const nextHp = Math.max(0, c.currentHp - finalDamage);
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
        `${isCrit ? '💥 CRITICAL HIT!' : 'hit'} ${target.name} with ${action.name}${isThreatened ? ' (Disadvantage)' : ''} for ${finalDamage} ${action.damageType || ''} damage!`,
        `To Hit: ${attackTotal} (${rollFormula}) vs AC ${target.ac} • Damage: ${dmgRoll.breakdown}${dmgMult !== 1 ? ` (×${dmgMult} DM Scale)` : ''}`,
        isCrit
      );
      return true;
    },
    [combatants, addCombatLog, onTrigger3dDice, spawnArenaVisualEffect, arenaConfig.enforceWalls, arenaConfig.monsterDamageMultiplier, activeMapWalls]
  );

  // Synchronized refs for async AI turn execution
  const combatantsRef = useRef(combatants);
  combatantsRef.current = combatants;

  const executeCombatActionRef = useRef(executeCombatAction);
  executeCombatActionRef.current = executeCombatAction;

  const handleAdvanceTurnRef = useRef(handleAdvanceTurn);
  handleAdvanceTurnRef.current = handleAdvanceTurn;

  const addCombatLogRef = useRef(addCombatLog);
  addCombatLogRef.current = addCombatLog;

  const runningAiTurnKeyRef = useRef<string | null>(null);

  // ============================================================================
  // AUTONOMOUS TACTICAL NPC / AI TURN CONTROLLER
  // Powered by YUKA Goal-Oriented AI + XState 5e Action Economy + ROT.js
  // ============================================================================
  useEffect(() => {
    const currentActor = combatantsRef.current[turnIndex] || null;

    if (phase !== 'battle' || !currentActor || !currentActor.isAI || winnerTeam) {
      runningAiTurnKeyRef.current = null;
      setAiTacticalBanner(null);
      setAiPathPreviewPx([]);
      return;
    }

    const currentTurnKey = `turn-${round}-${turnIndex}-${currentActor.id}`;
    if (runningAiTurnKeyRef.current === currentTurnKey) {
      return; // Already executing this AI turn
    }
    runningAiTurnKeyRef.current = currentTurnKey;

    if (currentActor.currentHp <= 0) {
      runningAiTurnKeyRef.current = null;
      handleAdvanceTurnRef.current();
      return;
    }

    let cancelled = false;
    const timers: number[] = [];

    // Safety Watchdog: If anything stalls for more than 7.5 seconds, force end turn so the match never hangs
    const watchdogTimer = window.setTimeout(() => {
      if (cancelled) return;
      console.warn(`[AI Watchdog] Turn for ${currentActor.name} exceeded safety time limit. Force-advancing turn.`);
      setAiTacticalBanner(null);
      setAiPathPreviewPx([]);
      runningAiTurnKeyRef.current = null;
      handleAdvanceTurnRef.current();
    }, 7500);
    timers.push(watchdogTimer);

    const aiStartTimer = window.setTimeout(() => {
      if (cancelled) return;

      try {
        const rawLiveActor = combatantsRef.current.find((c) => c.id === currentActor.id) || currentActor;
        const liveActor = {
          ...rawLiveActor,
          damageImmunities: rawLiveActor.sourceMonster?.damageImmunities || (rawLiveActor.sourceMonster as any)?.damage_immunities || (rawLiveActor.sourceCharacter as any)?.damageImmunities || [],
          creatureType: rawLiveActor.raceOrType
        };
        const liveCombatants = combatantsRef.current;
        const aiHud = buildArenaCombatantHudData(liveActor);

        // 1. D&D 5e Monster Recharge Check (e.g., Breath Weapon Recharge 5-6)
        const currentRechargeMap: Record<string, boolean> = { ...(liveActor.rechargeStatus || {}) };
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
              addCombatLogRef.current(
                liveActor.name,
                liveActor.team,
                `🎲 Recharge Check (1d6 = ${roll}): ${ra.name} is RECHARGED!`
              );
              soundCatalog.play('spell_buff', 0.6);
            } else {
              addCombatLogRef.current(
                liveActor.name,
                liveActor.team,
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
            c.id === liveActor.id ? { ...c, rechargeStatus: currentRechargeMap } : c
          )
        );

        // 2. Plan Turn using YUKA Goal-Oriented AI Brain
        const yukaBrain = new YukaArenaMonsterBrain();
        const goal = yukaBrain.planTurn(
          liveActor,
          liveCombatants,
          aiHud,
          ARENA_COLS,
          ARENA_ROWS,
          ARENA_GRID_SIZE,
          rechargedAbilities,
          activeMapHazards
        );

        setAiTacticalBanner(goal.reason);

        // 3. Build A* trail preview points
        if (goal.pathWaypointsPx.length > 0) {
          setAiPathPreviewPx([
            { x: liveActor.x, y: liveActor.y },
            ...goal.pathWaypointsPx
          ]);
        } else {
          setAiPathPreviewPx([]);
        }

        if (goal.useDash) {
          addCombatLogRef.current(
            liveActor.name,
            liveActor.team,
            `used Dash (+${liveActor.speedFt} ft) along A* path!`,
            goal.reason
          );
          soundCatalog.play('wind_whoosh', 0.65);
        }

        if (goal.useDisengage) {
          addCombatLogRef.current(
            liveActor.name,
            liveActor.team,
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
                c.id === liveActor.id
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
          ...liveActor,
          x: goal.finalPositionPx.x,
          y: goal.finalPositionPx.y,
          remainingMoveFt: Math.max(0, liveActor.speedFt - goal.plannedMovementFt)
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

                const currentCombatants = combatantsRef.current;
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
                    addCombatLogRef.current(
                      latestActor.name,
                      latestActor.team,
                      `Target eliminated! Redirecting strike #${strikeIdx + 1} (${strikeAction.name}) to ${nextEnemy.name}!`
                    );
                  }
                }

                if (targetObj) {
                  executeCombatActionRef.current(latestActor, targetObj, strikeAction);
                }
              }, strikeIdx * 480);
              timers.push(strikeTimer);
            });
          } else if (goal.type === 'breath_weapon' && goal.actionItem) {
            currentRechargeMap[goal.actionItem.name] = false;
            setCombatants((prev) =>
              prev.map((c) =>
                c.id === updatedActor.id ? { ...c, rechargeStatus: currentRechargeMap } : c
              )
            );
            const targetObj = combatantsRef.current.find((c) => c.id === goal.targetId && c.currentHp > 0);
            if (targetObj) {
              executeCombatActionRef.current(updatedActor, targetObj, goal.actionItem);
            }
          } else if (goal.type === 'emergency_heal' && goal.actionItem) {
            executeCombatActionRef.current(updatedActor, updatedActor, goal.actionItem);
          } else if (goal.actionItem) {
            const targetObj = combatantsRef.current.find((c) => c.id === goal.targetId && c.currentHp > 0);
            if (targetObj) {
              executeCombatActionRef.current(updatedActor, targetObj, goal.actionItem);
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
                  : combatantsRef.current.find((c) => c.id === goal.targetId && c.currentHp > 0) || updatedActor;
              executeCombatActionRef.current(updatedActor, bTarget, goal.bonusActionItem!);
            }, strikesTotalMs + 200);
            timers.push(bonusTimer);
          }

          const bonusDelay = goal.bonusActionItem ? 750 : 0;
          const endTurnTimer = window.setTimeout(() => {
            if (cancelled) return;
            setAiTacticalBanner(null);
            runningAiTurnKeyRef.current = null;
            handleAdvanceTurnRef.current();
          }, strikesTotalMs + bonusDelay + 850);
          timers.push(endTurnTimer);
        }, totalMoveMs);

        timers.push(actionTimer);
      } catch (err) {
        console.error('[AI Turn Controller] Encountered an error during AI turn:', err);
        setAiTacticalBanner(null);
        setAiPathPreviewPx([]);
        runningAiTurnKeyRef.current = null;
        handleAdvanceTurnRef.current();
      }
    }, 650);

    timers.push(aiStartTimer);

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [phase, turnIndex, round, winnerTeam]);

  // Handle Player dragging or tapping their active token on the Arena grid
  const handleMoveArenaToken = useCallback(
    (tokenId: string, newX: number, newY: number, distanceMovedFt?: number) => {
      setTokenDragState(null);
      setCombatants((prev) =>
        prev.map((c) => {
          if (c.id !== tokenId) return c;
          const moveCostFt =
            distanceMovedFt !== undefined
              ? distanceMovedFt
              : Math.round(Math.hypot(newX - c.x, newY - c.y) / ARENA_GRID_SIZE) * 5;
          if (moveCostFt > c.remainingMoveFt) {
            toast.warning(
              `Only ${c.remainingMoveFt} ft of movement remaining this turn! (Use Dash for +${c.speedFt} ft)`
            );
            return c;
          }
          if (
            arenaConfig.enforceWalls &&
            activeMapWalls.length > 0 &&
            !c.isFlying &&
            doesArenaWallBlockMovement(
              activeMapWalls,
              c.x + ((c.size || 1) * ARENA_GRID_SIZE) / 2,
              c.y + ((c.size || 1) * ARENA_GRID_SIZE) / 2,
              newX + ((c.size || 1) * ARENA_GRID_SIZE) / 2,
              newY + ((c.size || 1) * ARENA_GRID_SIZE) / 2
            )
          ) {
            toast.warning(
              '🧱 Movement blocked by an Arena wall or closed door! (Click a door on the map to open it)'
            );
            return c;
          }
          // Check Unsafe Environmental Hazards (Lava, Chasms)
          if (arenaConfig.enforceHazards !== false && activeMapHazards.length > 0) {
            const hx = newX + ((c.size || 1) * ARENA_GRID_SIZE) / 2;
            const hy = newY + ((c.size || 1) * ARENA_GRID_SIZE) / 2;
            const hazard = getArenaHazardAt(activeMapHazards, hx, hy, ARENA_WIDTH, ARENA_HEIGHT);
            if (hazard) {
              const immunities = c.sourceMonster?.damageImmunities || (c.sourceMonster as any)?.damage_immunities || (c.sourceCharacter as any)?.damageImmunities || [];
              const bypass = canCreatureBypassHazard({
                isFlying: c.isFlying,
                elevation: c.elevation,
                damageImmunities: immunities,
                creatureType: c.raceOrType
              }, hazard);

              if (!bypass) {
                if (hazard.type === 'lava') {
                  const dmg = Math.floor(Math.random() * 35) + 35; // 35-70 avg 52
                  toast.error(`🔥 ${c.name} entered ${hazard.name} taking ${dmg} fire damage!`);
                  soundCatalog.play('spell_fireball', 0.85);
                  addCombatLog(c.name, c.team, `🔥 Stepped into ${hazard.name}! Took ${dmg} fire damage.`);
                  return {
                    ...c,
                    x: newX,
                    y: newY,
                    currentHp: Math.max(0, c.currentHp - dmg),
                    remainingMoveFt: Math.max(0, c.remainingMoveFt - moveCostFt)
                  };
                } else if (hazard.type === 'chasm_fall') {
                  const fallDmg = Math.floor(Math.random() * 16) + 8; // 8-24
                  toast.error(`🕳️ ${c.name} fell into ${hazard.name}! Took ${fallDmg} fall damage and knocked Prone!`);
                  soundCatalog.play('damage', 0.85);
                  addCombatLog(c.name, c.team, `🕳️ Plunged into ${hazard.name}! Took ${fallDmg} fall damage & fell Prone.`);
                  const nextConds = c.conditions.includes('Prone') ? c.conditions : [...c.conditions, 'Prone'];
                  return {
                    ...c,
                    x: newX,
                    y: newY,
                    currentHp: Math.max(0, c.currentHp - fallDmg),
                    conditions: nextConds,
                    remainingMoveFt: 0
                  };
                } else {
                  toast.warning(`⚠️ ${c.name} entered hazard: ${hazard.name}`);
                }
              }
            }
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
    [arenaConfig.enforceWalls, arenaConfig.enforceHazards, activeMapWalls, activeMapHazards, addCombatLog]
  );

  // Build `<PlayerHeroDock />` data for the currently active human-controlled fighter
  const activeHeroHudData = useMemo(() => {
    if (!activeCombatant) return null;
    const ddbId = getCombatantDdbId(activeCombatant);
    const liveHud = ddbId ? liveDdbHudMap[String(ddbId)] : null;
    const baseHud = buildArenaCombatantHudData(activeCombatant, liveHud, activeWildShape, arenaConfig);

    // Apply manual spell slot & HP overrides so dock steppers and spell expenditure reflect instantly
    const charKey = String(ddbId || activeCombatant.id || activeCombatant.name);
    let nextHud = { ...baseHud };
    const savedSlots = manualSpellSlotsRef.current[charKey];
    if (savedSlots && nextHud.spellSlots) {
      const mergedSlots: Record<number, { level: number; total: number; used: number; available: number }> = { ...nextHud.spellSlots };
      Object.entries(savedSlots).forEach(([lvlStr, slotOverride]) => {
        const lvl = Number(lvlStr);
        if (mergedSlots[lvl]) {
          mergedSlots[lvl] = {
            ...mergedSlots[lvl],
            available: Math.max(0, Math.min(mergedSlots[lvl].total, slotOverride.available)),
            used: mergedSlots[lvl].total - Math.max(0, Math.min(mergedSlots[lvl].total, slotOverride.available))
          };
        }
      });
      nextHud.spellSlots = mergedSlots;
    }
    return nextHud;
  }, [activeCombatant, getCombatantDdbId, liveDdbHudMap, activeWildShape, arenaConfig]);

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
          if (
            arenaConfig.enforceWalls &&
            activeMapWalls.length > 0 &&
            !activeCombatant.isFlying &&
            doesArenaWallBlockMovement(
              activeMapWalls,
              curCol * ARENA_GRID_SIZE + ARENA_GRID_SIZE / 2,
              curRow * ARENA_GRID_SIZE + ARENA_GRID_SIZE / 2,
              c * ARENA_GRID_SIZE + ARENA_GRID_SIZE / 2,
              r * ARENA_GRID_SIZE + ARENA_GRID_SIZE / 2
            )
          ) {
            continue;
          }
          cells.push({ col: c, row: r });
        }
      }
    }
    return cells;
  }, [phase, activeCombatant, winnerTeam, activeTargetingAction, combatants, arenaConfig.enforceWalls, activeMapWalls]);

  // Compute reachable grid squares for Teleportation spells (e.g. Misty Step 30ft, Dimension Door)
  const reachableTeleportSquares = useMemo<Array<{ col: number; row: number }>>(() => {
    if (
      phase !== 'battle' ||
      !activeCombatant ||
      activeCombatant.isAI ||
      winnerTeam ||
      !activeTargetingAction ||
      !isActionTeleport(activeTargetingAction)
    ) {
      return [];
    }

    const rangeFt = activeTargetingAction.rangeFt && activeTargetingAction.rangeFt > 0
      ? activeTargetingAction.rangeFt
      : activeTargetingAction.name.toLowerCase().includes('dimension door')
      ? 500
      : 30;
    const maxSteps = Math.floor(rangeFt / 5);
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
        const distSteps = Math.round(Math.hypot(c - curCol, r - curRow));
        if (distSteps >= 1 && distSteps <= maxSteps && !occupied.has(`${c},${r}`)) {
          // Misty Step requires a destination "that you can see" (LoS check)
          const targetX = c * ARENA_GRID_SIZE + ARENA_GRID_SIZE / 2;
          const targetY = r * ARENA_GRID_SIZE + ARENA_GRID_SIZE / 2;
          const originX = curCol * ARENA_GRID_SIZE + ARENA_GRID_SIZE / 2;
          const originY = curRow * ARENA_GRID_SIZE + ARENA_GRID_SIZE / 2;
          if (
            arenaConfig.enforceWalls &&
            activeMapWalls.length > 0 &&
            doesArenaWallBlockSight(activeMapWalls, originX, originY, targetX, targetY)
          ) {
            continue;
          }
          cells.push({ col: c, row: r });
        }
      }
    }
    return cells;
  }, [phase, activeCombatant, winnerTeam, activeTargetingAction, combatants, arenaConfig.enforceWalls, activeMapWalls]);

  // Handle manual HP adjustments (+/-) from PlayerHeroDock
  const handleAdjustHp = useCallback((delta: number) => {
    if (!delta || !activeCombatant) return;
    const nextHp = Math.max(0, Math.min(activeCombatant.maxHp, activeCombatant.currentHp + delta));
    setCombatants((prev) =>
      prev.map((c) => (c.id === activeCombatant.id ? { ...c, currentHp: nextHp } : c))
    );
    if (delta > 0) {
      toast.success(`Healed +${delta} HP (${nextHp}/${activeCombatant.maxHp})`);
    } else {
      toast.info(`Adjusted HP ${delta} (${nextHp}/${activeCombatant.maxHp})`);
    }
  }, [activeCombatant]);

  // Handle manual Spell Slot adjustments (+/-) from PlayerHeroDock
  const handleAdjustSpellSlot = useCallback((level: number, delta: number) => {
    if (!delta || !activeCombatant) return;
    const charKey = String(activeCombatant.sourceCharacter?.ddbCharacterId || activeCombatant.id || activeCombatant.name);
    const existingSlots = manualSpellSlotsRef.current[charKey] || {};
    const curSlot = activeHeroHudData?.spellSlots?.[level];
    if (curSlot) {
      const nextAvail = Math.max(0, Math.min(curSlot.total, curSlot.available + delta));
      manualSpellSlotsRef.current[charKey] = {
        ...existingSlots,
        [level]: { available: nextAvail, total: curSlot.total }
      };
      setCombatants((prev) => [...prev]); // trigger state update to re-render memo
      toast.info(`Level ${level} slots: ${nextAvail}/${curSlot.total}`);
    }
  }, [activeCombatant, activeHeroHudData]);

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
                1v1 up to 6v6 • Scaled Random Encounters (1–6P) • vs NPCs
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
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <h2 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                <Crown className="w-4 h-4" />
                <span>1. Select Arena Combat Mode (Up to 6v6)</span>
              </h2>
              {/* Quick Team Skirmish Size Pills */}
              <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-xl p-1">
                <span className="text-[10px] font-mono text-zinc-400 px-2">Hero Clash Size:</span>
                {(['1v1', '2v2', '3v3', '4v4', '5v5', '6v6'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setMatchMode(sz)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                      matchMode === sz
                        ? 'bg-amber-500 text-zinc-950 shadow'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
              {[
                {
                  id: 'random_encounter' as const,
                  title: 'Random Encounter',
                  badge: '1–6P vs Scaled AI',
                  desc: 'Balanced D&D 5e monster encounter scaled to 1–6 players.',
                  color: 'emerald'
                },
                {
                  id: '1v1' as const,
                  title: '1v1 / 2v2 Duel',
                  badge: matchMode === '2v2' ? '2v2 Active' : '1v1 or 2v2',
                  desc: 'Head-to-head single or tag-team combat with full D&D Beyond HUD.',
                  color: 'amber'
                },
                {
                  id: '6v6' as const,
                  title: '3v3 – 6v6 Party Clash',
                  badge: ['3v3', '4v4', '5v5', '6v6'].includes(matchMode) ? `${matchMode} Active` : 'Up to 6v6 Squads',
                  desc: 'Full party vs party colosseum warfare (3v3, 4v4, 5v5, or 6v6).',
                  color: 'blue'
                },
                {
                  id: 'vs_npcs' as const,
                  title: 'Party vs NPCs',
                  badge: '1–6P Custom Pick',
                  desc: 'Hand-pick specific monsters or bosses from the Bestiary.',
                  color: 'purple'
                }
              ].map((m) => {
                const active =
                  m.id === '1v1'
                    ? matchMode === '1v1' || matchMode === '2v2'
                    : m.id === '6v6'
                    ? matchMode === '3v3' || matchMode === '4v4' || matchMode === '5v5' || matchMode === '6v6'
                    : matchMode === m.id;
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
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
                  <div>
                    <h3 className="text-xs sm:text-sm font-mono font-bold text-amber-300">
                      Team Gold — Players ({goldHeroIds.length}/{getMatchModeTeamCap(matchMode)})
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-zinc-400">
                      Tap heroes to select ({isPvpOrRivalMatchMode(matchMode) ? `Max ${getMatchModeTeamCap(matchMode)}` : '1–6 Players'})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {arenaCampaignGroups.length > 1 && (
                    <div className="relative flex items-center">
                      <Folder className="w-3 h-3 text-amber-400/80 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <select
                        value={goldCampaignFilter}
                        onChange={(e) => setGoldCampaignFilter(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 hover:border-amber-500/40 rounded-xl pl-7 pr-2.5 py-1 text-[11px] font-mono text-zinc-200 focus:outline-none cursor-pointer max-w-[180px]"
                      >
                        <option value="ALL">All Campaigns ({heroPool.length})</option>
                        {arenaCampaignGroups.map((g) => (
                          <option key={g.campaignId} value={g.campaignId}>
                            {g.campaignTitle} ({g.characters.length})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {lobbyPlayers.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono shrink-0">
                      {lobbyPlayers.length} Online
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 sm:max-h-72 overflow-y-auto pr-1">
                {heroPool
                  .filter((h) => goldCampaignFilter === 'ALL' || h.ddbCampaignId === goldCampaignFilter || goldHeroIds.includes(h.id))
                  .map((hero) => {
                  const isSelected = goldHeroIds.includes(hero.id);
                  const maxAllowed = getMatchModeTeamCap(matchMode);
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
                        <div className="flex items-center justify-between gap-1 mt-0.5">
                          <span className="text-[10px] font-mono text-emerald-400">
                            HP {hero.maxHp || hero.hp} • AC {hero.ac}
                          </span>
                          {hero.ddbCampaignTitle && (
                            <span className="text-[9px] font-mono text-zinc-500 truncate max-w-[95px]" title={hero.ddbCampaignTitle}>
                              {hero.ddbCampaignTitle}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Side: Team Crimson (Opponents / Scaled Random Encounter) */}
            <div className="lg:col-span-6 bg-zinc-900/75 border border-rose-500/30 rounded-3xl p-4 sm:p-5 space-y-3.5">
              {isPvpOrRivalMatchMode(matchMode) ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Swords className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400 shrink-0" />
                      <div>
                        <h3 className="text-xs sm:text-sm font-mono font-bold text-rose-300">
                          Team Crimson — Rivals ({crimsonHeroIds.length}/{getMatchModeTeamCap(matchMode)})
                        </h3>
                        <p className="text-[10px] sm:text-[11px] text-zinc-400">
                          Pass-and-Play or Tactical AI Rivals (Max {getMatchModeTeamCap(matchMode)})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {arenaCampaignGroups.length > 1 && (
                        <div className="relative flex items-center">
                          <Folder className="w-3 h-3 text-rose-400/80 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <select
                            value={crimsonCampaignFilter}
                            onChange={(e) => setCrimsonCampaignFilter(e.target.value)}
                            className="bg-zinc-950 border border-zinc-800 hover:border-rose-500/40 rounded-xl pl-7 pr-2.5 py-1 text-[11px] font-mono text-zinc-200 focus:outline-none cursor-pointer max-w-[165px]"
                          >
                            <option value="ALL">All Campaigns ({heroPool.length})</option>
                            {arenaCampaignGroups.map((g) => (
                              <option key={g.campaignId} value={g.campaignId}>
                                {g.campaignTitle} ({g.characters.length})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

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
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 sm:max-h-72 overflow-y-auto pr-1">
                    {heroPool
                      .filter((h) => crimsonCampaignFilter === 'ALL' || h.ddbCampaignId === crimsonCampaignFilter || crimsonHeroIds.includes(h.id))
                      .map((hero) => {
                      const isSelected = crimsonHeroIds.includes(hero.id);
                      const maxAllowed = getMatchModeTeamCap(matchMode);
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
                            <div className="flex items-center justify-between gap-1 mt-0.5">
                              <span className="text-[10px] font-mono text-rose-300">
                                HP {hero.maxHp || hero.hp} • AC {hero.ac}
                              </span>
                              {hero.ddbCampaignTitle && (
                                <span className="text-[9px] font-mono text-zinc-500 truncate max-w-[95px]" title={hero.ddbCampaignTitle}>
                                  {hero.ddbCampaignTitle}
                                </span>
                              )}
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
                          {arenaConfig.lockDmEncounter
                            ? '🔒 DM Custom Arena Encounter'
                            : matchMode === 'random_encounter'
                            ? `Random Encounter (${goldHeroIds.length}P)`
                            : 'Custom Monster Roster'}
                        </span>
                      </h3>
                      <p className="text-[10px] sm:text-[11px] text-zinc-400">
                        {arenaConfig.lockDmEncounter
                          ? 'Encounter squad pinned by your Dungeon Master in Campaign Manager'
                          : 'Behavior Tree AI • A* Pathfinding • Spellcasting'}
                      </p>
                    </div>

                    {!arenaConfig.lockDmEncounter ? (
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
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-[10px] font-mono font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>DM Locked</span>
                      </span>
                    )}
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
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold">
                  3. Choose Colosseum Battlemap ({availableMaps.length} Available)
                </span>
                {activeMapWalls.length > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300">
                    🧱 {activeMapWalls.length} Tactical Wall(s) / Door(s) Active
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 max-h-48 overflow-y-auto pr-1">
                {availableMaps.map((map) => {
                  const isSel = selectedMap.id === map.id;
                  const mapWallCount = (arenaConfig.mapWalls?.[map.id] || []).length;
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
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex items-end justify-between p-2 gap-1">
                        <span className="text-[10px] sm:text-[11px] font-mono font-bold text-white truncate">
                          {map.name}
                        </span>
                        {mapWallCount > 0 && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/25 text-amber-300 border border-amber-500/40 shrink-0">
                            {mapWallCount}🧱
                          </span>
                        )}
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
          onMouseMove={(e) => {
            if (!activeTargetingAction) return;
            const stage = e.target.getStage();
            const ptr = stage?.getPointerPosition();
            if (!ptr) return;
            const worldX = (ptr.x - stagePos.x) / stageScale;
            const worldY = (ptr.y - stagePos.y) / stageScale;
            setAimCurrent({ x: worldX, y: worldY });
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
              const isTeleport = isActionTeleport(activeTargetingAction);
              const isHealing = isActionHealing(activeTargetingAction);
              const targetCandidate = isTeleport
                ? activeCombatant
                : isHealing
                ? combatants
                    .filter((c) => c.team === activeCombatant.team && c.currentHp > 0)
                    .sort(
                      (a, b) =>
                        Math.hypot(a.x - snapCenter.x, a.y - snapCenter.y) -
                        Math.hypot(b.x - snapCenter.x, b.y - snapCenter.y)
                    )[0] || activeCombatant
                : combatants
                    .filter((c) => c.team !== activeCombatant.team && c.currentHp > 0)
                    .sort(
                      (a, b) =>
                        Math.hypot(a.x - snapCenter.x, a.y - snapCenter.y) -
                        Math.hypot(b.x - snapCenter.x, b.y - snapCenter.y)
                    )[0] || activeCombatant;

              executeCombatAction(activeCombatant, targetCandidate, activeTargetingAction, snapCenter);
              setActiveTargetingAction(null);
              setActiveEquippedAsset(null);
              setAimOrigin(null);
              setAimCurrent(null);
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
              const isTeleport = isActionTeleport(activeTargetingAction);
              const isHealing = isActionHealing(activeTargetingAction);
              const targetCandidate = isTeleport
                ? activeCombatant
                : isHealing
                ? combatants
                    .filter((c) => c.team === activeCombatant.team && c.currentHp > 0)
                    .sort(
                      (a, b) =>
                        Math.hypot(a.x - snapCenter.x, a.y - snapCenter.y) -
                        Math.hypot(b.x - snapCenter.x, b.y - snapCenter.y)
                    )[0] || activeCombatant
                : combatants
                    .filter((c) => c.team !== activeCombatant.team && c.currentHp > 0)
                    .sort(
                      (a, b) =>
                        Math.hypot(a.x - snapCenter.x, a.y - snapCenter.y) -
                        Math.hypot(b.x - snapCenter.x, b.y - snapCenter.y)
                    )[0] || activeCombatant;

              executeCombatAction(activeCombatant, targetCandidate, activeTargetingAction, snapCenter);
              setActiveTargetingAction(null);
              setActiveEquippedAsset(null);
              setAimOrigin(null);
              setAimCurrent(null);
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
            gridOpacity={arenaConfig.gridOpacity ?? 0.38}
            stageScale={stageScale}
          />

                    {/* Unsafe Environmental Hazards (Lava, Chasms, Acid, Spikes) */}
          {activeMapHazards.length > 0 && (
            <Layer listening={false}>
              {activeMapHazards.map((hazard) => {
                const mapW = ARENA_COLS * ARENA_GRID_SIZE;
                const mapH = ARENA_ROWS * ARENA_GRID_SIZE;
                const isPoly = hazard.polygonPoints && hazard.polygonPoints.length >= 6;
                const points = isPoly
                  ? hazard.polygonPoints.map((val, idx) =>
                      idx % 2 === 0 ? (val / 100) * mapW : (val / 100) * mapH
                    )
                  : [];
                const bx = (hazard.bounds.x / 100) * mapW;
                const by = (hazard.bounds.y / 100) * mapH;
                const bw = (hazard.bounds.width / 100) * mapW;
                const bh = (hazard.bounds.height / 100) * mapH;
                const strokeColor = hazard.color || (hazard.type === 'lava' ? '#ef4444' : '#6366f1');
                const fillColor = strokeColor + '28';

                return (
                  <Group key={hazard.id}>
                    {isPoly ? (
                      <Line
                        points={points}
                        closed={true}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={2.5}
                        dash={[8, 6]}
                      />
                    ) : (
                      <Rect
                        x={bx}
                        y={by}
                        width={bw}
                        height={bh}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={2.5}
                        dash={[8, 6]}
                        cornerRadius={4}
                      />
                    )}
                    <Group x={isPoly ? points[0] + 8 : bx + 8} y={isPoly ? points[1] + 8 : by + 8}>
                      <Rect
                        x={0}
                        y={0}
                        width={Math.min(160, hazard.name.length * 8 + 32)}
                        height={22}
                        fill="#0f172aee"
                        stroke={strokeColor}
                        strokeWidth={1}
                        cornerRadius={4}
                      />
                      <Text
                        x={6}
                        y={4}
                        text={`${hazard.type === 'lava' ? '🔥' : hazard.type === 'chasm_fall' ? '🕳️' : '⚠️'} ${hazard.name}`}
                        fill="#f8fafc"
                        fontSize={11}
                        fontStyle="bold"
                      />
                    </Group>
                  </Group>
                );
              })}
            </Layer>
          )}

          {/* DM Tactical Arena Walls, Cover & Interactive Doorways Layer */}
          {activeMapWalls.length > 0 && (
            <Layer>
              {activeMapWalls.map((wall) => {
                const wx1 = wall.x1 ?? wall.p1?.x ?? wall.points?.[0];
                const wy1 = wall.y1 ?? wall.p1?.y ?? wall.points?.[1];
                const wx2 = wall.x2 ?? wall.p2?.x ?? wall.points?.[2];
                const wy2 = wall.y2 ?? wall.p2?.y ?? wall.points?.[3];
                if (wx1 === undefined || wy1 === undefined || wx2 === undefined || wy2 === undefined) return null;
                const pts = wall.points && wall.points.length >= 4 ? wall.points : [wx1, wy1, wx2, wy2];
                const wType = wall.type || wall.wallType || 'solid';
                const isDoor = wType === 'door' || wType === 'secret_door' || wType === 'secret';
                const isWindow = wType === 'window' || wType === 'terrain';
                const isOpen = Boolean(wall.isOpen || wall.doorState === 'open');
                const strokeColor = isDoor
                  ? isOpen
                    ? '#10b981'
                    : '#f59e0b'
                  : isWindow
                  ? '#38bdf8'
                  : '#f43f5e';
                const midX = (pts[0] + pts[pts.length - 2]) / 2;
                const midY = (pts[1] + pts[pts.length - 1]) / 2;

                return (
                  <Group
                    key={wall.id}
                    listening={isDoor}
                    onClick={(e) => {
                      if (isDoor) {
                        e.cancelBubble = true;
                        handleToggleArenaDoor(wall.id);
                      }
                    }}
                    onTap={(e) => {
                      if (isDoor) {
                        e.cancelBubble = true;
                        handleToggleArenaDoor(wall.id);
                      }
                    }}
                  >
                    <Line
                      points={pts}
                      stroke={strokeColor}
                      strokeWidth={isDoor ? 9 : isWindow ? 6 : 8}
                      dash={isDoor && isOpen ? [10, 10] : isWindow ? [8, 6] : undefined}
                      lineCap="round"
                      lineJoin="round"
                      shadowColor="#000000"
                      shadowBlur={8}
                      shadowOpacity={0.75}
                      opacity={isDoor && isOpen ? 0.55 : 0.92}
                    />
                    {isDoor && (
                      <Group x={midX} y={midY}>
                        <Circle
                          radius={13}
                          fill="#09090b"
                          stroke={strokeColor}
                          strokeWidth={2.5}
                        />
                        <Text
                          x={-9}
                          y={-6}
                          width={18}
                          align="center"
                          text={isOpen ? '🔓' : '🚪'}
                          fontSize={11}
                        />
                      </Group>
                    )}
                  </Group>
                );
              })}
            </Layer>
          )}

          {/* Arena Tokens & Tap-to-Move Layer */}
          <Layer>
            {/* Reachable Teleport Squares (e.g. Misty Step 30ft, Dimension Door) */}
            {activeCombatant &&
              !activeCombatant.isAI &&
              activeTargetingAction &&
              isActionTeleport(activeTargetingAction) &&
              reachableTeleportSquares.map((cell) => (
                <Rect
                  key={`teleport_${cell.col}_${cell.row}`}
                  x={cell.col * ARENA_GRID_SIZE + 2}
                  y={cell.row * ARENA_GRID_SIZE + 2}
                  width={ARENA_GRID_SIZE - 4}
                  height={ARENA_GRID_SIZE - 4}
                  cornerRadius={6}
                  fill="rgba(168, 85, 247, 0.22)"
                  stroke="rgba(192, 132, 252, 0.7)"
                  strokeWidth={2}
                  dash={[6, 4]}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    const snapCenter = {
                      x: cell.col * ARENA_GRID_SIZE + ARENA_GRID_SIZE / 2,
                      y: cell.row * ARENA_GRID_SIZE + ARENA_GRID_SIZE / 2
                    };
                    executeCombatAction(activeCombatant, activeCombatant, activeTargetingAction, snapCenter);
                    setActiveTargetingAction(null);
                    setActiveEquippedAsset(null);
                    setAimOrigin(null);
                    setAimCurrent(null);
                  }}
                  onTap={(e) => {
                    e.cancelBubble = true;
                    const snapCenter = {
                      x: cell.col * ARENA_GRID_SIZE + ARENA_GRID_SIZE / 2,
                      y: cell.row * ARENA_GRID_SIZE + ARENA_GRID_SIZE / 2
                    };
                    executeCombatAction(activeCombatant, activeCombatant, activeTargetingAction, snapCenter);
                    setActiveTargetingAction(null);
                    setActiveEquippedAsset(null);
                    setAimOrigin(null);
                    setAimCurrent(null);
                  }}
                />
              ))}
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
                  onDragStartToken={handleDragStartToken}
                  onDragMoveToken={handleDragMoveToken}
                  onContextMenu={(clicked, clientX, clientY) => {
                    setActiveTokenMenu({ id: clicked.id, x: clientX, y: clientY });
                  }}
                  onClickToken={(clicked) => {
                    if (!activeCombatant || activeCombatant.isAI) return;
                    if (activeTargetingAction) {
                      executeCombatAction(activeCombatant, clicked, activeTargetingAction);
                      setActiveTargetingAction(null);
                      setActiveEquippedAsset(null);
                      setAimOrigin(null);
                      setAimCurrent(null);
                    }
                  }}
                />
              );
            })}
          </Layer>

          {/* Real-time Token Drag Measurement Ruler Layer */}
          {tokenDragState && (
            <Layer listening={false}>
              <TokenDragRuler
                dragState={tokenDragState}
                gridSize={ARENA_GRID_SIZE}
                stageScale={stageScale}
              />
            </Layer>
          )}

          {/* Dynamic JB2A Aiming Reticle Layer (Targeting preview while aiming) */}
          {activeEquippedAsset && aimOrigin && aimCurrent && (
            <Layer listening={false}>
              <AimReticle
                asset={activeEquippedAsset}
                origin={aimOrigin}
                current={aimCurrent}
                gridSize={ARENA_GRID_SIZE}
                stageScale={stageScale}
              />
            </Layer>
          )}
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
          onInspectEffect={(eff) => setInspectedAuraRequest(eff.actionSnapshot ? { action: eff.actionSnapshot, tick: Date.now() } : null)}
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
            if (activeTargetingAction?.id === action.id) {
              const prevSlot = activeTargetingAction.castAtLevel ?? activeTargetingAction.level ?? 0;
              const nextSlot = action.castAtLevel ?? action.level ?? 0;
              if (prevSlot !== nextSlot) {
                setActiveTargetingAction(action);
                toast.info(
                  nextSlot > (action.level ?? 0)
                    ? `Upcasting ${action.name} at Level ${nextSlot} Slot${action.damageFormula ? ` (${action.damageFormula})` : ''}`
                    : `Targeting ${action.name} (Base Level ${nextSlot})`
                );
                return;
              }
              setActiveTargetingAction(null);
              setActiveEquippedAsset(null);
              setAimOrigin(null);
              setAimCurrent(null);
              return;
            }

            const lowerName = action.name.toLowerCase();
            const isTeleport = isActionTeleport(action);
            const isHeal = isActionHealing(action);
            const isSelfHeal =
              !isTeleport &&
              (action.isSelfAction ||
                lowerName.includes('potion') ||
                lowerName.includes('second wind') ||
                lowerName.includes('surge') ||
                lowerName.includes('wholeness of body'));

            if (isSelfHeal) {
              executeCombatAction(activeCombatant, activeCombatant, action);
              return;
            }

            if (lowerName.includes('wild shape') || action.id === 'druid-wild-shape') {
              if (activeWildShape) {
                handleRevertWildShape();
              } else {
                setShowWildShapeModal(true);
              }
              return;
            }

            const matchedAsset =
              findJb2aAsset(action.jb2aAssetId || '') ||
              findJb2aAsset(action.name) ||
              findJb2aAsset(isHeal ? 'cure_wounds' : (action.rangeFt || 5) > 10 ? 'fire_bolt' : 'attack_slash');

            setActiveTargetingAction({ ...action, isHeal });
            setActiveEquippedAsset(matchedAsset || null);

            const tokenRadius = ((activeCombatant.size || 1) * ARENA_GRID_SIZE) / 2;
            const originPt = {
              x: activeCombatant.x + tokenRadius,
              y: activeCombatant.y + tokenRadius
            };
            setAimOrigin(originPt);
            setAimCurrent(originPt);
            toast.info(
              isTeleport
                ? `🔮 Click any purple grid square or floor cell within ${action.rangeFt || 30}ft to teleport with ${action.name}!`
                : isHeal
                ? `💚 Aim & click a target token, ally, or grid cell for ${action.name} (or click "Self" on dock)`
                : `🎯 Aim & click a target token or grid cell for ${action.name}`
            );
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
            const isHeal = isActionHealing(action);
            let formula = action.damageFormula;
            if (!formula || formula === '0') {
              if (action.name.toLowerCase().includes('healing word')) formula = '1d4 + 4';
              else if (action.name.toLowerCase().includes('potion')) formula = '4d4 + 4';
              else if (action.name.toLowerCase().includes('second wind')) formula = `1d10 + ${activeCombatant.classOrCr?.match(/\d+/)?.[0] || '5'}`;
              else if (isHeal) formula = '2d8 + 4';
              else formula = '1d8 + 4';
            }
            const dmgRoll = rollDiceFormula(formula, false);
            if (onTrigger3dDice && dmgRoll.dice.length > 0) {
              onTrigger3dDice({
                id: `arena-dmg-${Date.now()}`,
                characterName: activeCombatant.name,
                action: `${action.name}${action.castAtLevel ? ` (L${action.castAtLevel})` : ''} (${isHeal ? 'Heal' : action.damageType || 'Damage'})`,
                rollType: isHeal ? 'heal' : 'damage',
                formula: `${formula} → ${dmgRoll.breakdown}`,
                diceNotation: formula,
                dice: dmgRoll.dice,
                modifier: dmgRoll.bonus,
                total: dmgRoll.total,
                timestamp: Date.now(),
                source: 'player'
              });
            }
            if (isHeal) {
              const oldHp = activeCombatant.currentHp;
              const newHp = Math.min(activeCombatant.maxHp, oldHp + dmgRoll.total);
              setCombatants((prev) =>
                prev.map((c) =>
                  c.id === activeCombatant.id
                    ? { ...c, currentHp: newHp }
                    : c
                )
              );
              soundCatalog.play('radiant_heal', 0.85);
              if (oldHp >= activeCombatant.maxHp) {
                toast.info(`💚 ${activeCombatant.name} is already at full health (${activeCombatant.maxHp}/${activeCombatant.maxHp} HP)!`);
              } else {
                toast.success(`💚 ${activeCombatant.name} healed for +${dmgRoll.total} HP! (${newHp}/${activeCombatant.maxHp} HP)`);
              }
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
          activeEquippedAsset={activeEquippedAsset}
          onCancelTargeting={() => {
            setActiveTargetingAction(null);
            setActiveEquippedAsset(null);
            setAimOrigin(null);
            setAimCurrent(null);
          }}
          onTargetSelf={() => {
            if (activeTargetingAction) {
              executeCombatAction(activeCombatant, activeCombatant, activeTargetingAction);
              setActiveTargetingAction(null);
              setActiveEquippedAsset(null);
              setAimOrigin(null);
              setAimCurrent(null);
            }
          }}
          isMyTurn={true}
          onEndTurn={handleAdvanceTurn}
          onSwitchStationMode={() => setPhase('lobby')}
          onSwitchCharacter={() => setPhase('lobby')}
          activeEffects={arenaEffects}
          inspectedAuraRequest={inspectedAuraRequest}
          onOpenWildShape={() => setShowWildShapeModal(true)}
          onRevertWildShape={handleRevertWildShape}
          activeWildShape={activeWildShape}
          onClearInspectedAura={() => setInspectedAuraRequest(null)}
          collapseRequestTick={hudCollapseTick}
          onAdjustHp={handleAdjustHp}
          onAdjustSpellSlot={handleAdjustSpellSlot}
          isAutoRollDiceEnabled={isAutoRollDiceEnabled}
          onToggleAutoRollDice={handleToggleAutoRollDice}
        />
      )}

      {/* Druid Wild Shape Transformation Modal */}
      <WildShapeModal
        isOpen={showWildShapeModal}
        onClose={() => setShowWildShapeModal(false)}
        onSelectForm={handleTransformWildShape}
        onRevertForm={handleRevertWildShape}
        activeWildShape={activeWildShape}
        druidLevel={6}
        wisModifier={4}
      />

      {/* Manual Table Dice Input & In-Game Roll Prompt Modal (when Auto Roll is OFF) */}
      <ArenaDicePromptModal
        pendingRoll={pendingManualDicePrompt}
        onClose={() => setPendingManualDicePrompt(null)}
        onResolveHit={(result) => {
          if (!pendingManualDicePrompt) return;
          const { actor, target, action } = pendingManualDicePrompt;
          const markActorUsed = (c: ArenaCombatant) =>
            action.type === 'bonus_action' ? { ...c, bonusActionUsed: true } : { ...c, actionUsed: true };

          if (!result.hits) {
            setCombatants((prev) => prev.map((c) => (c.id === actor.id ? markActorUsed(c) : c)));
            addCombatLog(
              actor.name,
              (actor.team as 'gold' | 'crimson') || 'gold',
              `attacked ${target.name} with ${action.name} — MISS!`,
              `Rolled ${result.total} (d20: ${result.d20} + ${pendingManualDicePrompt.hitBonus}) vs AC ${target.ac}`
            );
            toast.error(`${actor.name}'s ${action.name} missed ${target.name} (${result.total} vs AC ${target.ac})`);
            setPendingManualDicePrompt(null);
            return;
          }

          toast.success(
            result.isCrit
              ? `💥 CRITICAL HIT! (Natural 20) — Roll damage!`
              : `🎯 Attack hit ${target.name} (${result.total} vs AC ${target.ac}) — Roll damage!`
          );

          setPendingManualDicePrompt((prev) =>
            prev
              ? {
                  ...prev,
                  phase: 'damage',
                  d20Roll: result.d20,
                  toHitTotal: result.total,
                  isCrit: result.isCrit,
                  isFumble: result.isFumble
                }
              : null
          );
        }}
        onResolveDamage={(result) => {
          if (!pendingManualDicePrompt) return;
          const { actor, target, action, isHeal } = pendingManualDicePrompt;
          const markActorUsed = (c: ArenaCombatant) =>
            action.type === 'bonus_action' ? { ...c, bonusActionUsed: true } : { ...c, actionUsed: true };

          if (isHeal) {
            const healAmount = result.damageTotal;
            setCombatants((prev) =>
              prev.map((c) => {
                if (c.id === target.id) {
                  const newHp = Math.min(c.maxHp, c.currentHp + healAmount);
                  return { ...c, currentHp: newHp, ...(c.id === actor.id ? markActorUsed(c) : {}) };
                }
                if (c.id === actor.id) return markActorUsed(c);
                return c;
              })
            );
            addCombatLog(
              actor.name,
              (actor.team as 'gold' | 'crimson') || 'gold',
              `healed ${target.name} with ${action.name} for +${healAmount} HP!`,
              result.breakdown
            );
            toast.success(`💚 Restored +${healAmount} HP to ${target.name}!`);
          } else {
            const dmgAmount = result.damageTotal;
            setCombatants((prev) =>
              prev.map((c) => {
                if (c.id === target.id) {
                  const nextHp = Math.max(0, c.currentHp - dmgAmount);
                  return { ...c, currentHp: nextHp };
                }
                if (c.id === actor.id) return markActorUsed(c);
                return c;
              })
            );
            addCombatLog(
              actor.name,
              (actor.team as 'gold' | 'crimson') || 'gold',
              `${result.isCrit ? '💥 CRITICAL HIT!' : 'hit'} ${target.name} with ${action.name} for ${dmgAmount} damage!`,
              `Damage: ${result.breakdown}`,
              result.isCrit
            );
            toast.success(`⚔️ ${actor.name} dealt ${dmgAmount} damage to ${target.name}!`);
          }

          setPendingManualDicePrompt(null);
        }}
        onEnableAutoRollAndContinue={() => {
          if (!pendingManualDicePrompt) return;
          const { actor, target, action, targetPointPx } = pendingManualDicePrompt;
          setPendingManualDicePrompt(null);
          handleToggleAutoRollDice(true);
          toast.success(`Auto Roll enabled for ${actor.name}!`);
          const fullActor = combatants.find((c) => c.id === actor.id);
          const fullTarget = combatants.find((c) => c.id === target.id);
          if (fullActor && fullTarget) {
            executeCombatActionRef.current(fullActor, fullTarget, action, targetPointPx);
          }
        }}
        onTrigger3dDice={onTrigger3dDice}
      />

      {/* Right-Click Token Context Menu for Arena Combatants */}
      {activeTokenMenu && (() => {
        const currentToken = combatants.find((c) => c.id === activeTokenMenu.id);
        if (!currentToken) return null;

        const isDruid =
          (currentToken.sourceCharacter?.classLevel || currentToken.classOrCr || '').toLowerCase().includes('druid') ||
          currentToken.name.toLowerCase().includes("g'aiah") ||
          currentToken.name.toLowerCase().includes('gaiah');

        const menuX = tokenMenuPos ? tokenMenuPos.x : Math.max(16, Math.min(activeTokenMenu.x, window.innerWidth - 300));
        const menuY = tokenMenuPos ? tokenMenuPos.y : Math.max(16, Math.min(activeTokenMenu.y, window.innerHeight - 440));

        const DND_CONDITIONS = [
          'Blinded', 'Charmed', 'Deafened', 'Frightened', 'Grappled',
          'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned',
          'Prone', 'Restrained', 'Stunned', 'Unconscious', 'Exhaustion'
        ];

        return (
          <>
            {/* Backdrop to dismiss menu when clicking outside (unless pinned) */}
            {!tokenMenuPinned && (
              <div
                className="fixed inset-0 z-[299]"
                onClick={() => setActiveTokenMenu(null)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setActiveTokenMenu(null);
                }}
              />
            )}

            <div
              id="arena-token-context-menu"
              onPointerDown={startTokenMenuDrag}
              className={`fixed z-[300] bg-zinc-950/95 backdrop-blur-xl border rounded-xl shadow-2xl p-3.5 w-72 animate-in fade-in zoom-in-95 select-none cursor-move ${
                tokenMenuPinned ? 'border-amber-500/70 shadow-[0_0_25px_rgba(245,158,11,0.2)]' : 'border-zinc-700/80'
              }`}
              style={{ left: menuX, top: menuY }}
              onClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.preventDefault()}
            >
              {/* Header / Drag Handle */}
              <div
                className="flex justify-between items-center mb-2.5 pb-2 border-b border-zinc-800 cursor-move touch-none"
                title="Click and drag to move menu"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-5 h-5 rounded-full overflow-hidden border border-zinc-700 shrink-0 bg-zinc-800">
                    <img src={currentToken.avatarUrl} alt={currentToken.name} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest truncate font-mono">
                    {currentToken.name}
                  </span>
                  <GripHorizontal className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (!tokenMenuPinned && !tokenMenuPos) {
                        setTokenMenuPos({ x: menuX, y: menuY });
                      }
                      setTokenMenuPinned((p) => !p);
                    }}
                    className={`text-xs leading-none p-0.5 cursor-pointer ${
                      tokenMenuPinned ? 'text-amber-400' : 'text-zinc-500 hover:text-white'
                    }`}
                    title={tokenMenuPinned ? 'Unpin menu' : 'Pin menu open'}
                  >
                    {tokenMenuPinned ? '📌' : '📍'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTokenMenuPinned(false);
                      setActiveTokenMenu(null);
                      setTokenMenuPos(null);
                    }}
                    className="text-zinc-500 hover:text-white text-base leading-none p-0.5 cursor-pointer"
                    title="Close"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex items-center gap-1 mb-2.5 bg-zinc-900/90 p-1 rounded-lg border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setTokenMenuTab('stats')}
                  className={`flex-1 py-1 rounded-md text-[10px] font-bold font-mono transition-all cursor-pointer ${
                    tokenMenuTab === 'stats'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Stats
                </button>
                <button
                  type="button"
                  onClick={() => setTokenMenuTab('conditions')}
                  className={`flex-1 py-1 rounded-md text-[10px] font-bold font-mono transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    tokenMenuTab === 'conditions'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Conditions
                  {(currentToken.conditions?.length || 0) > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse shrink-0" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setTokenMenuTab('auras')}
                  className={`flex-1 py-1 rounded-md text-[10px] font-bold font-mono transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    tokenMenuTab === 'auras'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                  <span>Auras</span>
                </button>
              </div>

              {/* TAB 1: Stats & Info */}
              {tokenMenuTab === 'stats' && (
                <div className="space-y-2.5">
                  {/* Druid Wild Shape Button if Druid */}
                  {isDruid && (
                    <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-2.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider font-mono flex items-center gap-1.5">
                          <PawPrint className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Wild Shape (Moon Druid)</span>
                        </span>
                        {activeWildShape && (
                          <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-500/20 px-1.5 py-0.5 rounded">
                            {activeWildShape.beastName}
                          </span>
                        )}
                      </div>
                      {activeWildShape ? (
                        <button
                          type="button"
                          onClick={handleRevertWildShape}
                          className="w-full py-1.5 px-3 rounded-lg text-xs font-bold font-mono transition-all border border-emerald-500/60 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                        >
                          <PawPrint className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Revert to Wood Elf</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowWildShapeModal(true)}
                          className="w-full py-1.5 px-3 rounded-lg text-xs font-bold font-mono transition-all border border-emerald-500/70 bg-gradient-to-r from-emerald-600/40 to-teal-600/40 hover:from-emerald-600/60 hover:to-teal-600/60 text-white cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                        >
                          <PawPrint className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Wild Shape (Transform)</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* AC, HP, Max HP */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-blue-400 uppercase font-bold tracking-tighter">AC</label>
                      <input
                        type="number"
                        className="bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-blue-400 px-2 py-1.5 focus:outline-none focus:border-blue-500 font-mono"
                        value={currentToken.ac}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          handleUpdateCombatant(currentToken.id, { ac: isNaN(val) ? 10 : val });
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-emerald-400 uppercase font-bold tracking-tighter">HP</label>
                      <input
                        type="number"
                        className="bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-emerald-400 px-2 py-1.5 focus:outline-none focus:border-emerald-500 font-mono"
                        value={currentToken.currentHp}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          handleUpdateCombatant(currentToken.id, { currentHp: isNaN(val) ? 0 : val });
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-zinc-400 uppercase font-bold tracking-tighter">Max</label>
                      <input
                        type="number"
                        className="bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200 px-2 py-1.5 focus:outline-none focus:border-amber-500 font-mono"
                        value={currentToken.maxHp}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          handleUpdateCombatant(currentToken.id, { maxHp: isNaN(val) ? 10 : val });
                        }}
                      />
                    </div>
                  </div>

                  {/* Quick HP Adjustment Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateCombatant(currentToken.id, { currentHp: Math.max(0, currentToken.currentHp - 5) })}
                      className="flex-1 py-1 bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/60 rounded-md text-[10px] font-bold font-mono cursor-pointer"
                    >
                      -5 HP
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateCombatant(currentToken.id, { currentHp: Math.max(0, currentToken.currentHp - 1) })}
                      className="flex-1 py-1 bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-800/40 rounded-md text-[10px] font-bold font-mono cursor-pointer"
                    >
                      -1 HP
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateCombatant(currentToken.id, { currentHp: Math.min(currentToken.maxHp, currentToken.currentHp + 1) })}
                      className="flex-1 py-1 bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-800/40 rounded-md text-[10px] font-bold font-mono cursor-pointer"
                    >
                      +1 HP
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateCombatant(currentToken.id, { currentHp: Math.min(currentToken.maxHp, currentToken.currentHp + 5) })}
                      className="flex-1 py-1 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 rounded-md text-[10px] font-bold font-mono cursor-pointer"
                    >
                      +5 HP
                    </button>
                  </div>

                  {/* Temp HP adjustment */}
                  <div className="flex items-center justify-between bg-zinc-900/90 border border-amber-500/30 rounded-xl p-2">
                    <span className="text-[9px] text-amber-300 uppercase font-bold tracking-wider font-mono">
                      Temp HP: {currentToken.tempHp || 0}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateCombatant(currentToken.id, { tempHp: 0 })}
                        className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded text-[9px] font-mono cursor-pointer"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateCombatant(currentToken.id, { tempHp: (currentToken.tempHp || 0) + 5 })}
                        className="px-1.5 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-[9px] font-mono font-bold cursor-pointer"
                      >
                        +5
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateCombatant(currentToken.id, { tempHp: (currentToken.tempHp || 0) + 18 })}
                        className="px-1.5 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded text-[9px] font-mono font-bold cursor-pointer"
                        title="+18 Moon Druid Temp HP"
                      >
                        +18
                      </button>
                    </div>
                  </div>

                  {/* Special Effects: Glowing Halo (for Stavros or characters with Halo capability) */}
                  {canTokenHaveHalo(currentToken.name) && (
                    <div className="bg-zinc-900/90 border border-amber-400/30 rounded-xl p-2.5 flex items-center justify-between">
                      <span className="text-[9px] text-amber-300 uppercase font-bold tracking-wider font-mono flex items-center gap-1">
                        <span>✨</span> Special Effects
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const nextHalo = !currentToken.haloActive;
                          handleUpdateCombatant(currentToken.id, { haloActive: nextHalo });
                          toast.success(nextHalo ? `😇 Halo activated on ${currentToken.name}!` : `Halo deactivated.`);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1 border ${
                          currentToken.haloActive
                            ? 'bg-amber-400/25 text-amber-100 border-amber-300/80 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                        }`}
                      >
                        <span>{currentToken.haloActive ? '😇 Halo Active' : 'Activate Halo'}</span>
                      </button>
                    </div>
                  )}

                  {/* Flight & Elevation */}
                  <div className="bg-zinc-900/90 border border-sky-500/30 rounded-xl p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-sky-400 uppercase font-bold tracking-wider font-mono flex items-center gap-1">
                        <span>🪽</span> Flight & Height
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const curFly = Boolean(currentToken.isFlying);
                          const curElev = Number(currentToken.elevation) || 0;
                          const nextFly = !curFly;
                          const nextElev = nextFly && curElev === 0 ? 15 : !nextFly ? 0 : curElev;
                          handleUpdateCombatant(currentToken.id, { isFlying: nextFly, elevation: nextElev });
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[9px] font-bold font-mono transition-all cursor-pointer border ${
                          currentToken.isFlying
                            ? 'bg-sky-500/25 text-sky-200 border-sky-400/70 shadow-xs'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                        }`}
                      >
                        {currentToken.isFlying ? '🪽 Flying' : 'Grounded'}
                      </button>
                    </div>

                    <div className="grid grid-cols-5 gap-1">
                      {[0, 10, 15, 30, 60].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            handleUpdateCombatant(currentToken.id, {
                              elevation: preset,
                              isFlying: preset > 0
                            });
                          }}
                          className={`py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer border ${
                            (currentToken.elevation || 0) === preset
                              ? 'bg-sky-500/30 text-sky-200 border-sky-400/70'
                              : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-400 border-zinc-800'
                          }`}
                        >
                          {preset}ft
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Conditions */}
              {tokenMenuTab === 'conditions' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase font-bold tracking-tighter">
                      5e Status Conditions
                    </span>
                    <span className="text-[9px] font-mono text-rose-400 font-bold">
                      {(currentToken.conditions || []).length} Active
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 max-h-56 overflow-y-auto pr-1">
                    {DND_CONDITIONS.map((cond) => {
                      const isActive = (currentToken.conditions || []).includes(cond);
                      return (
                        <button
                          key={cond}
                          type="button"
                          onClick={() => {
                            const cur = currentToken.conditions || [];
                            const next = isActive ? cur.filter((c) => c !== cond) : [...cur, cond];
                            handleUpdateCombatant(currentToken.id, { conditions: next });
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const rule = lookupDndRuleDetails(cond, 'condition');
                            if (rule) setInspectedRule(rule);
                          }}
                          className={`text-[10px] py-1 px-1.5 rounded-md font-mono text-left truncate transition-all cursor-pointer border flex items-center justify-between ${
                            isActive
                              ? 'bg-rose-500/20 text-rose-200 border-rose-500/50 shadow-xs'
                              : 'bg-zinc-900/60 hover:bg-zinc-900 text-zinc-400 border-zinc-800/80 hover:text-zinc-200'
                          }`}
                          title="Click to toggle • Right-click to inspect rule"
                        >
                          <span className="truncate">{cond}</span>
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: Auras & Halos */}
              {tokenMenuTab === 'auras' && (
                <div className="space-y-2 py-1">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase font-bold tracking-tighter">
                      Equip Token Aura
                    </span>
                    {(currentToken.auraRadius || 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          handleUpdateCombatant(currentToken.id, {
                            auraRadius: 0,
                            auraColor: undefined,
                            auraName: undefined,
                            auraOpacity: undefined,
                            videoUrl: undefined
                          });
                          toast.info(`Cleared aura from ${currentToken.name}`);
                        }}
                        className="text-[9px] font-mono text-rose-400 hover:text-rose-300 cursor-pointer font-bold"
                      >
                        Clear Aura
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-1 max-h-56 overflow-y-auto pr-1">
                    {AURA_PRESETS.map((preset: AuraPreset) => {
                      const isActive =
                        currentToken.auraName === preset.name ||
                        (currentToken.auraRadius === preset.radius && currentToken.auraColor === preset.color);
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const rule = lookupDndRuleDetails(preset.name, 'aura');
                            if (rule) setInspectedRule(rule);
                          }}
                          onClick={() => {
                            handleUpdateCombatant(currentToken.id, {
                              auraRadius: preset.radius,
                              auraColor: preset.color,
                              auraName: preset.name,
                              auraOpacity: preset.opacity || 0.35,
                              videoUrl: preset.videoUrl
                            });
                            toast.success(`Equipped ${preset.name} (${preset.radius}ft) on ${currentToken.name}`);
                          }}
                          className={`w-full p-1.5 rounded-lg text-left transition-all flex items-center justify-between border cursor-pointer ${
                            isActive
                              ? 'bg-indigo-600/30 border-indigo-400/80 text-white shadow-sm'
                              : 'bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
                          }`}
                          title={`${preset.description || preset.name} • Right-click to inspect`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/40"
                              style={{ backgroundColor: preset.color }}
                            />
                            <span className="text-[10px] font-mono font-bold truncate">{preset.name}</span>
                          </div>
                          <span className="text-[9px] font-mono text-zinc-400 shrink-0 ml-1">{preset.radius}ft</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        );
      })()}

      {/* D&D 5e Rule / Aura Inspection Modal */}
      <DndRuleInspectionModal
        entry={inspectedRule}
        onClose={() => setInspectedRule(null)}
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
