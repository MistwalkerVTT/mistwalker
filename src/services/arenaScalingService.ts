// src/services/arenaScalingService.ts
// Automated Adaptive Monster Scaling & Encounter Balance Engine for MistWalker Battle Arena.
// Accurately assesses the player's chosen heroes (APL, HP pool, AC, estimated DPR)
// and calibrates opposing enemies to deliver challenging, fair, and cinematic turn-based combat.

import { Character } from '../types/character';
import { Monster } from '../types/monster';

export type ArenaDifficulty = 'standard' | 'hard' | 'deadly';

export interface PartyCombatProfile {
  heroCount: number;
  averagePartyLevel: number; // APL (1 to 20)
  totalPartyHp: number;
  averageHeroHp: number;
  averageHeroAc: number;
  estimatedPartyDpr: number;
  tier: 1 | 2 | 3 | 4;
  partyLevels: number[];
}

export interface CalibratedMonsterStats {
  hp: number;
  maxHp: number;
  ac: number;
  attackBonus: number;
  damageMultiplier: number;
  saveDc: number;
  isBoss: boolean;
  bossTitle?: string;
  originalCr: number;
  scaledCr: number;
}

export interface ScaledMonsterEntry extends Monster {
  calibratedStats?: CalibratedMonsterStats;
}

export interface ScaledEncounterResult {
  monsters: ScaledMonsterEntry[];
  profile: PartyCombatProfile;
  threatLabel: string;
  threatBadgeColor: string;
  totalXp: number;
  targetXp: number;
}

// ---------------------------------------------------------------------------
// 5e XP Encounter Thresholds by Character Level
// ---------------------------------------------------------------------------
const XP_THRESHOLDS_BY_LEVEL: Record<number, { easy: number; medium: number; hard: number; deadly: number }> = {
  1:  { easy: 25,   medium: 50,   hard: 75,    deadly: 100 },
  2:  { easy: 50,   medium: 100,  hard: 150,   deadly: 200 },
  3:  { easy: 75,   medium: 150,  hard: 225,   deadly: 400 },
  4:  { easy: 125,  medium: 250,  hard: 375,   deadly: 500 },
  5:  { easy: 250,  medium: 500,  hard: 750,   deadly: 1100 },
  6:  { easy: 300,  medium: 600,  hard: 900,   deadly: 1400 },
  7:  { easy: 350,  medium: 750,  hard: 1100,  deadly: 1700 },
  8:  { easy: 450,  medium: 900,  hard: 1400,  deadly: 2100 },
  9:  { easy: 550,  medium: 1100, hard: 1600,  deadly: 2400 },
  10: { easy: 600,  medium: 1200, hard: 1900,  deadly: 2800 },
  11: { easy: 800,  medium: 1600, hard: 2400,  deadly: 3600 },
  12: { easy: 1000, medium: 2000, hard: 3000,  deadly: 4500 },
  13: { easy: 1100, medium: 2200, hard: 3400,  deadly: 5100 },
  14: { easy: 1250, medium: 2500, hard: 3800,  deadly: 5700 },
  15: { easy: 1400, medium: 2800, hard: 4300,  deadly: 6400 },
  16: { easy: 1600, medium: 3200, hard: 4800,  deadly: 7200 },
  17: { easy: 2000, medium: 3900, hard: 5900,  deadly: 8800 },
  18: { easy: 2100, medium: 4200, hard: 6300,  deadly: 9500 },
  19: { easy: 2400, medium: 4900, hard: 7300,  deadly: 10900 },
  20: { easy: 2800, medium: 5700, hard: 8500,  deadly: 12700 }
};

// ---------------------------------------------------------------------------
// 5e Challenge Rating to XP Table
// ---------------------------------------------------------------------------
const CR_TO_XP: Record<string, number> = {
  '0': 10,
  '1/8': 25,
  '1/4': 50,
  '1/2': 100,
  '1': 200,
  '2': 450,
  '3': 700,
  '4': 1100,
  '5': 1800,
  '6': 2300,
  '7': 2900,
  '8': 3900,
  '9': 5000,
  '10': 5900,
  '11': 7200,
  '12': 8400,
  '13': 10000,
  '14': 11500,
  '15': 13000,
  '16': 15000,
  '17': 18000,
  '18': 20000,
  '19': 22000,
  '20': 25000,
  '21': 33000,
  '22': 41000,
  '23': 50000,
  '24': 62000,
  '30': 155000
};

/**
 * Parses numeric CR from string
 */
export function parseMonsterNumericCr(crString?: string): number {
  if (!crString) return 1;
  const clean = crString.trim().split(' ')[0];
  if (clean === '1/8') return 0.125;
  if (clean === '1/4') return 0.25;
  if (clean === '1/2') return 0.5;
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 1 : parsed;
}

/**
 * Maps numeric CR to 5e XP
 */
export function getCrXpValue(cr: number): number {
  if (cr <= 0.05) return 10;
  if (cr <= 0.15) return 25;
  if (cr <= 0.3) return 50;
  if (cr <= 0.6) return 100;
  const roundCr = Math.min(24, Math.max(1, Math.round(cr)));
  return CR_TO_XP[String(roundCr)] || roundCr * 1200;
}

/**
 * Extracts numeric level from Character classLevel string
 * e.g. "Barbarian 5" -> 5, "Fighter 3 / Wizard 2" -> 5
 */
export function extractHeroLevel(character: Character): number {
  if (character.classLevel) {
    const matches = character.classLevel.match(/\b\d+\b/g);
    if (matches && matches.length > 0) {
      const sum = matches.reduce((acc, m) => acc + parseInt(m, 10), 0);
      if (sum > 0 && sum <= 20) return sum;
    }
  }

  // Fallback 1: Derive from HP (average ~7.5 HP per level + Con)
  const hp = character.maxHp || character.hp || 0;
  if (hp > 0) {
    const derived = Math.min(20, Math.max(1, Math.round(hp / 8.5)));
    return derived;
  }

  // Fallback 2: Default to level 3
  return 3;
}

/**
 * Evaluates the full combat profile of the chosen hero party
 */
export function evaluatePartyCombatProfile(heroes: Character[]): PartyCombatProfile {
  const safeHeroes = Array.isArray(heroes) && heroes.length > 0 ? heroes : [];
  const heroCount = Math.max(1, safeHeroes.length);

  const levels: number[] = [];
  let totalPartyHp = 0;
  let totalAc = 0;

  for (const h of safeHeroes) {
    const lvl = extractHeroLevel(h);
    levels.push(lvl);
    totalPartyHp += h.maxHp || h.hp || 28;
    totalAc += h.ac || 15;
  }

  const averagePartyLevel = levels.length > 0
    ? Math.max(1, Math.min(20, Math.round(levels.reduce((a, b) => a + b, 0) / levels.length)))
    : 3;

  const averageHeroHp = Math.max(10, Math.round(totalPartyHp / heroCount));
  const averageHeroAc = Math.max(11, Math.round(totalAc / heroCount));

  // Estimate party DPR (Damage Per Round) based on level tier and count
  // Tier 1 (1-4): ~9 dpr/hero | Tier 2 (5-10): ~24 dpr/hero | Tier 3 (11-16): ~42 dpr/hero | Tier 4: ~65 dpr/hero
  let dprPerHero = 9;
  let tier: 1 | 2 | 3 | 4 = 1;

  if (averagePartyLevel >= 17) {
    tier = 4;
    dprPerHero = 68;
  } else if (averagePartyLevel >= 11) {
    tier = 3;
    dprPerHero = 42;
  } else if (averagePartyLevel >= 5) {
    tier = 2;
    dprPerHero = 24;
  } else {
    tier = 1;
    dprPerHero = averagePartyLevel <= 2 ? 7 : 11;
  }

  const estimatedPartyDpr = Math.max(8, dprPerHero * heroCount);

  return {
    heroCount,
    averagePartyLevel,
    totalPartyHp,
    averageHeroHp,
    averageHeroAc,
    estimatedPartyDpr,
    tier,
    partyLevels: levels
  };
}

/**
 * Computes 5e encounter XP budget based on party profile and difficulty
 */
export function computeEncounterXpBudget(
  profile: PartyCombatProfile,
  difficulty: ArenaDifficulty
): number {
  let budget = 0;
  const diffKey = difficulty === 'deadly' ? 'deadly' : difficulty === 'hard' ? 'hard' : 'medium';

  for (const lvl of profile.partyLevels) {
    const safeLvl = Math.max(1, Math.min(20, lvl));
    const thresholds = XP_THRESHOLDS_BY_LEVEL[safeLvl] || XP_THRESHOLDS_BY_LEVEL[3];
    budget += thresholds[diffKey];
  }

  return Math.max(50, budget);
}

/**
 * Action economy multiplier based on enemy count vs hero count
 */
export function getActionEconomyMultiplier(enemyCount: number, heroCount: number): number {
  if (enemyCount <= 1) {
    return heroCount >= 3 ? 0.75 : 1.0;
  }
  if (enemyCount === 2) return 1.5;
  if (enemyCount >= 3 && enemyCount <= 6) return 2.0;
  return 2.5;
}

/**
 * Dynamically calibrates a monster's combat parameters for high-tension, fair video-game combat:
 * - Target 3-5 round combat duration
 * - Guardrail against 1-shotting players from full health
 * - ~55-65% player attack hit rate against monster AC
 * - Appropriate attack bonus and saving throw DC
 */
export function calibrateMonsterForArena(
  monster: Monster,
  profile: PartyCombatProfile,
  difficulty: ArenaDifficulty,
  role: 'boss' | 'minion' | 'squad' | 'solo',
  totalEnemiesInSquad: number
): CalibratedMonsterStats {
  const baseHp = monster.hp || 45;
  const baseAc = monster.ac || 14;
  const cr = parseMonsterNumericCr(monster.challenge);

  // 1. Calibrate Monster HP:
  // Target: total squad HP should absorb ~3.5 rounds of party DPR (Standard), ~4.2 (Hard), ~4.8 (Deadly)
  const roundTarget = difficulty === 'deadly' ? 4.8 : difficulty === 'hard' ? 4.2 : 3.5;
  const targetSquadHp = Math.round(profile.estimatedPartyDpr * roundTarget);

  let hpShare = 1 / Math.max(1, totalEnemiesInSquad);
  if (role === 'boss') {
    hpShare = totalEnemiesInSquad === 1 ? 1.0 : 0.65;
  } else if (role === 'minion') {
    hpShare = (1 - 0.65) / Math.max(1, totalEnemiesInSquad - 1);
  }

  const idealMonsterHp = Math.round(targetSquadHp * hpShare);
  // Blend 55% ideal calculated HP with 45% base monster stat to preserve creature uniqueness
  let scaledHp = Math.round(idealMonsterHp * 0.55 + baseHp * 0.45);
  // Difficulty modifier
  const diffHpMult = difficulty === 'deadly' ? 1.25 : difficulty === 'hard' ? 1.1 : 0.95;
  scaledHp = Math.max(12, Math.round(scaledHp * diffHpMult));

  // 2. Calibrate Monster AC:
  // Target: party hits ~55% - 65% of the time (rolls of 8 - 10+)
  const partyAvgHitBonus = Math.min(12, Math.max(3, Math.round(profile.averagePartyLevel * 0.4 + 4)));
  const targetAc = partyAvgHitBonus + (difficulty === 'deadly' ? 9 : difficulty === 'hard' ? 8 : 7);
  // Blend target AC with base AC, clamped within reasonable boundaries
  const scaledAc = Math.min(22, Math.max(11, Math.round(targetAc * 0.5 + baseAc * 0.5)));

  // 3. Calibrate Attack Bonus & Spell DC:
  // Target: monster hits party average AC ~50% (Standard), ~58% (Hard), ~65% (Deadly)
  const hitChanceMod = difficulty === 'deadly' ? 3 : difficulty === 'hard' ? 1 : 0;
  const targetAttackBonus = Math.max(2, Math.min(13, profile.averageHeroAc - 10 + hitChanceMod));

  // 4. One-Shot Protection Damage Scaling:
  // A single regular hit should deal ~20% - 32% of average hero HP, never >65% on a single hit
  const desiredDprPerEnemy = (profile.averageHeroHp * 0.28 * (difficulty === 'deadly' ? 1.3 : 1.0)) / Math.max(1, totalEnemiesInSquad * 0.5);
  // Calculate multiplier to apply to monster attack damage formulas
  const baseAvgMonsterDmg = Math.max(4, cr * 5 + 3);
  let damageMultiplier = desiredDprPerEnemy / baseAvgMonsterDmg;
  damageMultiplier = Math.max(0.65, Math.min(1.85, damageMultiplier));

  // Boss features
  const isBoss = role === 'boss' || role === 'solo';
  const bossTitle = isBoss
    ? role === 'solo'
      ? '⚔️ Arena Champion'
      : '👑 Squad Commander'
    : undefined;

  const saveDc = Math.min(19, Math.max(11, 8 + Math.round(targetAttackBonus * 0.65)));

  return {
    hp: scaledHp,
    maxHp: scaledHp,
    ac: scaledAc,
    attackBonus: targetAttackBonus,
    damageMultiplier: Number(damageMultiplier.toFixed(2)),
    saveDc,
    isBoss,
    bossTitle,
    originalCr: cr,
    scaledCr: Number((cr * (scaledHp / baseHp)).toFixed(1))
  };
}

/**
 * Generates an adaptive, balanced monster squad scaled to the chosen hero party
 */
export function generateAdaptiveEncounter(
  heroes: Character[],
  difficulty: ArenaDifficulty = 'standard',
  monsterPool: Monster[]
): ScaledEncounterResult {
  const profile = evaluatePartyCombatProfile(heroes);
  const totalBudgetXp = computeEncounterXpBudget(profile, difficulty);
  const pool = monsterPool.length > 0 ? monsterPool : [];

  if (pool.length === 0) {
    return {
      monsters: [],
      profile,
      threatLabel: 'EMPTY ROSTER',
      threatBadgeColor: 'zinc',
      totalXp: 0,
      targetXp: totalBudgetXp
    };
  }

  // Determine Max Squad Size based on hero count:
  // 1 Hero: 1-2 enemies MAX (Duels / Mini-boss + 1 minion)
  // 2 Heroes: 2-3 enemies
  // 3 Heroes: 2-4 enemies
  // 4+ Heroes: 3-5 enemies
  let maxEnemies = 4;
  if (profile.heroCount === 1) {
    maxEnemies = Math.random() < 0.65 ? 1 : 2; // 65% chance for an epic 1v1 duel
  } else if (profile.heroCount === 2) {
    maxEnemies = 2 + (Math.random() < 0.4 ? 1 : 0); // 2 or 3 enemies
  } else if (profile.heroCount === 3) {
    maxEnemies = 3 + (difficulty === 'deadly' ? 1 : 0);
  } else {
    maxEnemies = Math.min(5, profile.heroCount + (difficulty === 'deadly' ? 1 : 0));
  }

  // Archetype selection
  const pickedMonsters: { monster: Monster; role: 'boss' | 'minion' | 'squad' | 'solo' }[] = [];
  let accumulatedRawXp = 0;

  if (maxEnemies === 1) {
    // 1v1 Solo Duel: Pick a worthy adversary near the adjusted budget
    const targetSingleXp = totalBudgetXp;
    const sorted = [...pool].sort((a, b) => {
      const xpA = getCrXpValue(parseMonsterNumericCr(a.challenge));
      const xpB = getCrXpValue(parseMonsterNumericCr(b.challenge));
      return Math.abs(xpA - targetSingleXp) - Math.abs(xpB - targetSingleXp);
    });
    const soloBoss = sorted[0] || pool[0];
    pickedMonsters.push({ monster: soloBoss, role: 'solo' });
    accumulatedRawXp += getCrXpValue(parseMonsterNumericCr(soloBoss.challenge));
  } else if (maxEnemies <= 3 && Math.random() < 0.55) {
    // Boss + Minion(s) Archetype
    const bossXpShare = totalBudgetXp * 0.65;
    const sortedBosses = [...pool].sort((a, b) => {
      const xpA = getCrXpValue(parseMonsterNumericCr(a.challenge));
      const xpB = getCrXpValue(parseMonsterNumericCr(b.challenge));
      return Math.abs(xpA - bossXpShare) - Math.abs(xpB - bossXpShare);
    });
    const boss = sortedBosses[0] || pool[0];
    pickedMonsters.push({ monster: boss, role: 'boss' });
    accumulatedRawXp += getCrXpValue(parseMonsterNumericCr(boss.challenge));

    const remainingXp = Math.max(50, totalBudgetXp - bossXpShare);
    const minionCount = maxEnemies - 1;
    const xpPerMinion = remainingXp / minionCount;

    const sortedMinions = [...pool].sort((a, b) => {
      const xpA = getCrXpValue(parseMonsterNumericCr(a.challenge));
      const xpB = getCrXpValue(parseMonsterNumericCr(b.challenge));
      return Math.abs(xpA - xpPerMinion) - Math.abs(xpB - xpPerMinion);
    });

    for (let i = 0; i < minionCount; i++) {
      const minion = sortedMinions[i % sortedMinions.length] || pool[0];
      pickedMonsters.push({ monster: minion, role: 'minion' });
      accumulatedRawXp += getCrXpValue(parseMonsterNumericCr(minion.challenge));
    }
  } else {
    // Squad / Even Pack Archetype
    const xpPerEnemy = totalBudgetXp / maxEnemies;
    const sortedSquad = [...pool].sort((a, b) => {
      const xpA = getCrXpValue(parseMonsterNumericCr(a.challenge));
      const xpB = getCrXpValue(parseMonsterNumericCr(b.challenge));
      return Math.abs(xpA - xpPerEnemy) - Math.abs(xpB - xpPerEnemy);
    });

    for (let i = 0; i < maxEnemies; i++) {
      const pick = sortedSquad[i % Math.min(sortedSquad.length, 4)] || pool[0];
      pickedMonsters.push({ monster: pick, role: i === 0 ? 'boss' : 'squad' });
      accumulatedRawXp += getCrXpValue(parseMonsterNumericCr(pick.challenge));
    }
  }

  // Calibrate each selected monster's stats
  const totalCount = pickedMonsters.length;
  const scaledMonsters: ScaledMonsterEntry[] = pickedMonsters.map(({ monster, role }) => {
    const calibrated = calibrateMonsterForArena(monster, profile, difficulty, role, totalCount);
    return {
      ...monster,
      calibratedStats: calibrated
    };
  });

  // Calculate Threat Label
  const economyMult = getActionEconomyMultiplier(totalCount, profile.heroCount);
  const effectiveTotalXp = Math.round(accumulatedRawXp * economyMult);

  let threatLabel = 'FAIR MATCHUP';
  let threatBadgeColor = 'emerald';

  if (difficulty === 'deadly' || effectiveTotalXp >= totalBudgetXp * 1.15) {
    threatLabel = 'DEADLY APEX TRIAL';
    threatBadgeColor = 'rose';
  } else if (difficulty === 'hard' || effectiveTotalXp >= totalBudgetXp * 0.9) {
    threatLabel = 'CHALLENGING SQUAD';
    threatBadgeColor = 'amber';
  }

  return {
    monsters: scaledMonsters,
    profile,
    threatLabel,
    threatBadgeColor,
    totalXp: effectiveTotalXp,
    targetXp: totalBudgetXp
  };
}
