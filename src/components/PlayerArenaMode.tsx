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
import { computeTacticalAiTurnPlan, classifyCombatantRole } from '../services/arenaTacticalAi';
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
function buildArenaCombatantHudData(combatant: ArenaCombatant): HudCharacterData {
  const char = combatant.sourceCharacter;
  const mon = combatant.sourceMonster;

  const attacks: HudActionItem[] = [];
  const actions: HudActionItem[] = [];
  const bonusActions: HudActionItem[] = [];
  const spells: HudActionItem[] = [];
  const reactions: HudActionItem[] = [];
  const items: HudActionItem[] = [];

  if (char) {
    if (Array.isArray(char.actions) && char.actions.length > 0) {
      char.actions.forEach((act, idx) => {
        const dmgParts = (act.damage || '').split(' ');
        const formula = dmgParts[0] || '1d8 + 4';
        const dmgType = (dmgParts.slice(1).join(' ') || 'slashing').toLowerCase();
        const isRanged =
          act.type?.toLowerCase().includes('ranged') ||
          act.name.toLowerCase().includes('bow') ||
          act.name.toLowerCase().includes('crossbow') ||
          act.name.toLowerCase().includes('blast');
        const item: HudActionItem = {
          id: `arena-char-atk-${idx}`,
          name: act.name,
          category: 'attacks',
          type: 'action',
          subCategory: 'weapon',
          isAttack: true,
          isEquipped: true,
          sourceLabel: 'Equipped Weapon',
          hitBonus: act.hitBonus || '+7',
          damageFormula: formula,
          damageType: dmgType,
          notes: act.notes,
          description: act.description || `Attack with ${act.name}.`,
          rangeFt: isRanged ? 80 : 5,
          jb2aAssetId:
            act.name.toLowerCase().includes('greataxe') || act.name.toLowerCase().includes('greatsword')
              ? 'attack_greatsword'
              : act.name.toLowerCase().includes('hammer') || act.name.toLowerCase().includes('mace')
              ? 'attack_hammer'
              : isRanged
              ? 'attack_bow'
              : 'attack_slash'
        };
        attacks.push(item);
        actions.push({ ...item, category: 'actions' });
      });
    }

    if (Array.isArray(char.bonusActions) && char.bonusActions.length > 0) {
      char.bonusActions.forEach((ba, idx) => {
        const lower = ba.name.toLowerCase();
        const isHeal = lower.includes('wind') || lower.includes('heal');
        bonusActions.push({
          id: `arena-char-ba-${idx}`,
          name: ba.name,
          category: 'bonus_actions',
          type: 'bonus_action',
          subCategory: 'class',
          sourceLabel: ba.source || 'Class Feature',
          castingTime: '1 Bonus Action',
          isSelfAction: true,
          isHeal,
          damageFormula: isHeal ? '1d10 + 5' : undefined,
          rangeFt: 0,
          description: ba.description
        });
      });
    }

    if (Array.isArray(char.spells) && char.spells.length > 0) {
      char.spells.forEach((spName, idx) => {
        const lower = spName.toLowerCase();
        const isHeal = lower.includes('cure') || lower.includes('heal') || lower.includes('aid');
        const isCantrip =
          lower.includes('blast') ||
          lower.includes('bolt') ||
          lower.includes('mockery') ||
          lower.includes('flame') ||
          lower.includes('frost') ||
          lower.includes('spray');
        const matchedAsset = findJb2aAsset(spName);
        const baseLvl = isCantrip ? 0 : lower.includes('fireball') || lower.includes('lightning bolt') || lower.includes('spirit guardians') ? 3 : 1;
        const baseFormula = isHeal
          ? '2d8 + 4'
          : lower.includes('fireball') || lower.includes('lightning bolt')
          ? '8d6'
          : lower.includes('guiding bolt')
          ? '4d6'
          : lower.includes('scorching ray')
          ? '6d6'
          : isCantrip
          ? '2d10'
          : '3d8';
        const upcastOptions =
          baseLvl >= 1
            ? Array.from({ length: 5 - baseLvl + 1 }, (_, i) => {
                const slotLvl = baseLvl + i;
                return {
                  slotLevel: slotLvl,
                  ...computeUpcastFormula(baseFormula, baseLvl, slotLvl, spName)
                };
              })
            : undefined;

        spells.push({
          id: `arena-char-spell-${idx}`,
          name: spName,
          category: 'spells',
          type: lower.includes('healing word') || lower.includes('misty step') ? 'bonus_action' : 'action',
          subCategory: 'spell',
          level: baseLvl,
          canUpcast: baseLvl >= 1,
          upcastOptions,
          school: (matchedAsset?.school as any) || 'evocation',
          castingTime: lower.includes('healing word') || lower.includes('misty step') ? '1 Bonus Action' : '1 Action',
          hitBonus: '+7',
          saveDc: 15,
          saveAbility: lower.includes('fireball') || lower.includes('lightning') ? 'DEX' : undefined,
          damageFormula: baseFormula,
          damageType: isHeal ? 'radiant' : lower.includes('fire') ? 'fire' : lower.includes('cold') || lower.includes('frost') ? 'cold' : 'force',
          isHeal,
          description: `Cast ${spName} in the Arena.`,
          rangeFt: isHeal ? 30 : 90,
          jb2aAssetId: matchedAsset?.id || (isHeal ? 'cure_wounds' : lower.includes('eldritch') ? 'eldritch_blast' : 'fire_bolt')
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
        spells.push({
          id: `arena-mon-sp-${idx}`,
          name: sp.name,
          category: 'spells',
          type: 'action',
          subCategory: 'spell',
          level: sp.level || 0,
          hitBonus: sp.hitBonus ?? '+7',
          saveDc: sp.saveDc ?? 15,
          saveAbility: sp.saveAbility,
          damageFormula: sp.damageFormula || '3d8',
          damageType: sp.damageType || 'force',
          rangeFt: sp.rangeFt || 60,
          description: sp.description,
          jb2aAssetId: sp.jb2aAssetId || 'eldritch_blast'
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
  actions.push(
    {
      id: 'arena-dash',
      name: 'Dash (+Speed)',
      category: 'actions',
      type: 'action',
      subCategory: 'standard',
      isSelfAction: true,
      description: 'Double your movement speed for this turn.',
      rangeFt: 0
    },
    {
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
    }
  );

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

  return {
    id: combatant.id,
    name: combatant.name,
    avatarUrl: combatant.avatarUrl,
    race: combatant.raceOrType,
    classLevel: combatant.classOrCr,
    totalLevel: 5,
    ac: combatant.ac,
    currentHp: combatant.currentHp,
    maxHp: combatant.maxHp,
    tempHp: combatant.tempHp,
    speed: `${combatant.speedFt} ft.`,
    walkSpeedFt: combatant.speedFt,
    passivePerception: 14,
    passiveInsight: 12,
    passiveInvestigation: 12,
    deathSaves: { successes: 0, failures: 0 },
    attacks,
    actions,
    bonusActions,
    spells,
    reactions,
    items,
    spellSlots: {
      1: { level: 1, total: 4, used: 0, available: 4 },
      2: { level: 2, total: 3, used: 0, available: 3 },
      3: { level: 3, total: 2, used: 0, available: 2 }
    },
    resources: [],
    readonlyUrl: '',
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

  // Spawn a JB2A Visual Effect between caster and target
  const spawnArenaVisualEffect = useCallback(
    (caster: ArenaCombatant, target: ArenaCombatant, action: HudActionItem) => {
      const asset =
        findJb2aAsset(action.jb2aAssetId || '') ||
        findJb2aAsset(action.name) ||
        findJb2aAsset(action.isHeal ? 'cure_wounds' : (action.rangeFt || 5) > 10 ? 'fire_bolt' : 'attack_slash');

      if (!asset) return;

      const casterCenter = {
        x: caster.x + ((caster.size || 1) * ARENA_GRID_SIZE) / 2,
        y: caster.y + ((caster.size || 1) * ARENA_GRID_SIZE) / 2
      };
      const targetCenter = {
        x: target.x + ((target.size || 1) * ARENA_GRID_SIZE) / 2,
        y: target.y + ((target.size || 1) * ARENA_GRID_SIZE) / 2
      };

      const newFx: VttEffectInstance = {
        id: `arena_fx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        assetKey: asset.id,
        name: action.name,
        videoUrl: asset.webm,
        loopVideoUrl: asset.loopWebm,
        paradigm: asset.paradigm,
        x: targetCenter.x,
        y: targetCenter.y,
        originX: casterCenter.x,
        originY: casterCenter.y,
        targetX: targetCenter.x,
        targetY: targetCenter.y,
        sizeFt: asset.defaultSizeFt || 10,
        rotation: 0,
        opacity: 1,
        blendMode: asset.blendMode || 'screen',
        isPersistent: false,
        durationMs: 1800,
        loop: false,
        castTime: Date.now(),
        soundKey: asset.soundKey,
        casterName: caster.name
      };

      setArenaEffects((prev) => [...prev, newFx]);
      if (asset.soundKey) {
        soundCatalog.play(asset.soundKey, 0.8);
      } else {
        soundCatalog.play(action.isHeal ? 'radiant_heal' : 'sword_slash', 0.75);
      }
    },
    []
  );

  // Execute an Attack, Spell, or Heal from `actor` onto `target`
  const executeCombatAction = useCallback(
    (actor: ArenaCombatant, target: ArenaCombatant, action: HudActionItem) => {
      // Check range in feet
      const actorCx = actor.x + ((actor.size || 1) * ARENA_GRID_SIZE) / 2;
      const actorCy = actor.y + ((actor.size || 1) * ARENA_GRID_SIZE) / 2;
      const targetCx = target.x + ((target.size || 1) * ARENA_GRID_SIZE) / 2;
      const targetCy = target.y + ((target.size || 1) * ARENA_GRID_SIZE) / 2;
      const distFt = Math.max(
        0,
        Math.round((Math.hypot(targetCx - actorCx, targetCy - actorCy) / ARENA_GRID_SIZE) * 5) -
          ((actor.size - 1 + (target.size - 1)) * 2.5)
      );

      const maxRangeFt = action.rangeFt && action.rangeFt > 0 ? action.rangeFt : 5;
      if (!action.isSelfAction && actor.id !== target.id && distFt > maxRangeFt + 5) {
        if (!actor.isAI) {
          toast.warning(
            `Target is ${distFt} ft away, but ${action.name} has a range of ${maxRangeFt} ft! Move closer first.`
          );
        }
        return false;
      }

      // Special Self Utility Actions: Dash
      if (action.id === 'arena-dash' || action.name.toLowerCase().startsWith('dash')) {
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

      // Play JB2A visual effect
      spawnArenaVisualEffect(actor, target, action);

      // Healing Action
      if (action.isHeal) {
        const healRoll = rollDiceFormula(action.damageFormula || '2d8 + 4', false);
        if (onTrigger3dDice) {
          onTrigger3dDice({
            id: `arena-heal-${Date.now()}`,
            characterName: actor.name,
            action: `${action.name} (Heal)`,
            rollType: 'heal',
            formula: `${action.damageFormula} = ${healRoll.total}`,
            diceNotation: action.damageFormula || '2d8',
            dice: healRoll.rolls.map((r) => ({ sides: healRoll.sides, result: r, type: `d${healRoll.sides}` })),
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
                ...(c.id === actor.id
                  ? action.type === 'bonus_action'
                    ? { bonusActionUsed: true }
                    : { actionUsed: true }
                  : {})
              };
            }
            if (c.id === actor.id) {
              return action.type === 'bonus_action'
                ? { ...c, bonusActionUsed: true }
                : { ...c, actionUsed: true };
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

      // Offensive Attack Roll or Saving Throw
      const rawHitBonus = parseInt(String(action.hitBonus || '+6').replace('+', ''), 10) || 6;
      const d20 = Math.floor(Math.random() * 20) + 1;
      const isCrit = d20 === 20;
      const isFumble = d20 === 1;
      const attackTotal = d20 + rawHitBonus;

      if (onTrigger3dDice) {
        onTrigger3dDice({
          id: `arena-atk-${Date.now()}`,
          characterName: actor.name,
          action: action.name,
          rollType: 'attack',
          formula: `1d20 (${d20}) + ${rawHitBonus} = ${attackTotal}`,
          diceNotation: '1d20',
          dice: [{ sides: 20, result: d20, type: 'd20' }],
          total: attackTotal,
          isCritical: isCrit,
          isFumble,
          timestamp: Date.now(),
          source: 'player'
        });
      }

      const hitsTarget = isCrit || (!isFumble && attackTotal >= target.ac);

      if (!hitsTarget) {
        setCombatants((prev) =>
          prev.map((c) =>
            c.id === actor.id
              ? action.type === 'bonus_action'
                ? { ...c, bonusActionUsed: true }
                : { ...c, actionUsed: true }
              : c
          )
        );
        addCombatLog(
          actor.name,
          actor.team,
          `attacked ${target.name} with ${action.name} — MISS!`,
          `Rolled ${attackTotal} (1d20[${d20}] + ${rawHitBonus}) vs AC ${target.ac}`
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
            return action.type === 'bonus_action'
              ? { ...c, bonusActionUsed: true }
              : { ...c, actionUsed: true };
          }
          return c;
        })
      );

      addCombatLog(
        actor.name,
        actor.team,
        `${isCrit ? '💥 CRITICAL HIT!' : 'hit'} ${target.name} with ${action.name} for ${dmgRoll.total} ${action.damageType || ''} damage!`,
        `To Hit: ${attackTotal} vs AC ${target.ac} • Damage: ${dmgRoll.breakdown}`,
        isCrit
      );
      return true;
    },
    [addCombatLog, onTrigger3dDice, spawnArenaVisualEffect]
  );

  // ============================================================================
  // AUTONOMOUS TACTICAL NPC / AI TURN CONTROLLER
  // Powered by Mistreevous Behavior Trees + Utility AI Scorer + Pathfinding.js A*
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
      const plan = computeTacticalAiTurnPlan(
        activeCombatant,
        combatants,
        aiHud,
        ARENA_COLS,
        ARENA_ROWS,
        ARENA_GRID_SIZE
      );

      setAiTacticalBanner(plan.tacticalThought);

      // Build A* trail preview points (including start cell)
      if (plan.pathWaypointsPx.length > 0) {
        setAiPathPreviewPx([
          { x: activeCombatant.x, y: activeCombatant.y },
          ...plan.pathWaypointsPx
        ]);
      } else {
        setAiPathPreviewPx([]);
      }

      if (plan.useDash) {
        addCombatLog(
          activeCombatant.name,
          activeCombatant.team,
          `used Dash (+${activeCombatant.speedFt} ft) along A* path!`,
          plan.tacticalThought
        );
        soundCatalog.play('wind_whoosh', 0.65);
      }

      // Step-by-step A* grid movement animation (150ms per square)
      const stepDelayMs = 155;
      plan.pathWaypointsPx.forEach((wp, idx) => {
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

      const totalMoveMs = plan.pathWaypointsPx.length * stepDelayMs + 320;
      const updatedActor: ArenaCombatant = {
        ...activeCombatant,
        x: plan.finalPositionPx.x,
        y: plan.finalPositionPx.y,
        remainingMoveFt: Math.max(0, activeCombatant.speedFt - plan.movementSpentFt)
      };

      // Execute Primary Action (Attack / Spell / Emergency Heal) after A* movement completes
      const actionTimer = window.setTimeout(() => {
        if (cancelled) return;
        setAiPathPreviewPx([]);

        if (plan.primaryAction) {
          const targetObj =
            plan.primaryAction.targetId === updatedActor.id
              ? updatedActor
              : combatants.find((c) => c.id === plan.primaryAction?.targetId);
          if (targetObj && targetObj.currentHp > 0) {
            executeCombatAction(updatedActor, targetObj, plan.primaryAction.action);
          }
        }

        // Execute Bonus Action (e.g. Potion of Greater Healing or Bonus Strike) if planned
        const bonusDelay = plan.bonusAction ? 750 : 0;
        if (plan.bonusAction) {
          const bonusTimer = window.setTimeout(() => {
            if (cancelled) return;
            const bTarget =
              plan.bonusAction?.targetId === updatedActor.id
                ? updatedActor
                : combatants.find((c) => c.id === plan.bonusAction?.targetId);
            if (bTarget) {
              executeCombatAction(updatedActor, bTarget, plan.bonusAction.action);
            }
          }, 600);
          timers.push(bonusTimer);
        }

        const endTurnTimer = window.setTimeout(() => {
          if (cancelled) return;
          setAiTacticalBanner(null);
          handleAdvanceTurn();
        }, 1150 + bonusDelay);
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
    return buildArenaCombatantHudData(activeCombatant);
  }, [activeCombatant]);

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
          <Layer listening={false}>
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
              toast.info(`🎯 Tap a target token on the grid for ${action.name}`);
            }
          }}
          onRollToHit={(action) => {
            setActiveTargetingAction(action);
            toast.info(`🎯 Tap a target token on the grid to roll ${action.name}!`);
          }}
          onRollDamage={(action) => {
            setActiveTargetingAction(action);
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
        />
      )}

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
