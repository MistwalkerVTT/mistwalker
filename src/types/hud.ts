// src/types/hud.ts
// Strict TypeScript types for the MistWalker D&D Beyond Tactical Character HUD

export type HudActionCategory = 'attacks' | 'actions' | 'bonus_actions' | 'spells' | 'reactions' | 'items' | 'special';

export type HudActionType = 'action' | 'bonus_action' | 'reaction' | 'item' | 'passive' | 'special';

export type HudActionSubCategory =
  | 'weapon'
  | 'unarmed'
  | 'mastery'
  | 'class'
  | 'species'
  | 'feat'
  | 'spell'
  | 'item'
  | 'special'
  | 'standard';

export interface HudActionUses {
  available: number;
  total: number;
  resetType?: string; // e.g. 'Short Rest', 'Long Rest'
}

export interface HudUpcastOption {
  slotLevel: number;
  damageFormula?: string;     // Scaled formula at this slot level (e.g. "9d6")
  bonusEffect?: string;       // e.g. "+1 Dart", "+2 Targets", "Duration: 8 hours"
  summaryLabel: string;       // e.g. "9d6 fire (+1d6)" or "+1 Target"
}

export interface HudActionItem {
  id: string;
  name: string;
  category: HudActionCategory;
  type: HudActionType;
  subCategory?: HudActionSubCategory;
  level?: number;             // 0 = cantrip, 1-9
  castAtLevel?: number;       // Selected upcast slot level (defaults to level)
  school?: string;            // evocation, abjuration, etc.
  rangeFt?: number;
  castingTime?: string;       // "1 Action", "1 Bonus Action", "1 Reaction"
  hitBonus?: string | number; // e.g. "+9"
  saveDc?: number | string;            // e.g. 15
  saveAbility?: string;       // e.g. "WIS", "DEX", "CON"
  damageFormula?: string;     // e.g. "1d12 + 8"
  baseDamageFormula?: string; // Unmodified base damage formula before upcasting
  damageType?: string;        // e.g. "slashing", "fire", "radiant"
  description: string;
  notes?: string;             // Weapon properties / mastery notes
  baseNotes?: string;         // Unmodified base notes before upcasting
  sourceLabel?: string;       // e.g. "Barbarian", "Goliath", "Equipped Weapon"
  jb2aAssetId?: string;       // Auto-matched asset ID (e.g. "fire_bolt", "cure_wounds")
  iconUrl?: string;
  quantity?: number;          // For consumable items / potions / thrown weapons
  uses?: HudActionUses;       // Limited use counter from D&D Beyond
  isPrepared?: boolean;
  isEquipped?: boolean;
  isAttack?: boolean;
  isSelfAction?: boolean;     // True if action targets self or activates immediately (e.g. Rage, Dodge, Dash)
  isHaloToggle?: boolean;     // True if action toggles token illumination/halo glow on the battlemap
  spellSlotRequired?: number; // Slot level needed if casting with slot
  isHeal?: boolean;           // True if spell/action restores HP
  duration?: string;          // e.g. "Instantaneous", "Concentration, up to 1 minute"
  components?: string;        // e.g. "V, S, M (a pinch of sulfur)"
  atHigherLevels?: string;    // Higher level casting scaling description
  canUpcast?: boolean;        // True if spell scales when cast with a higher-level slot
  upcastOptions?: HudUpcastOption[]; // Pre-computed scaling per slot level (level..9)
}

/**
 * Computes scaled spell damage/healing formula and bonus effect for any leveled spell
 * when cast at `slotLevel` >= `baseLevel`.
 */
export function computeUpcastFormula(
  baseFormula: string | undefined,
  baseLevel: number,
  slotLevel: number,
  spellName: string,
  perSlotDice?: { count: number; sides: number; fixed?: number } | null
): { damageFormula?: string; bonusEffect?: string; summaryLabel: string } {
  const levelsAbove = Math.max(0, slotLevel - baseLevel);
  if (levelsAbove === 0) {
    return {
      damageFormula: baseFormula,
      summaryLabel: baseFormula || `Level ${baseLevel}`
    };
  }

  const lower = (spellName || '').toLowerCase();

  // Special case: Magic Missile (base 3 darts of 1d4+1, +1 dart per slot level)
  if (lower.includes('magic missile')) {
    const darts = 3 + levelsAbove;
    const scaled = `${darts}d4 + ${darts}`;
    return {
      damageFormula: scaled,
      bonusEffect: `${darts} Darts`,
      summaryLabel: `${scaled} (${darts} Darts)`
    };
  }

  // Special case: Scorching Ray (base 3 rays of 2d6, +1 ray per slot level)
  if (lower.includes('scorching ray')) {
    const rays = 3 + levelsAbove;
    const scaled = `${rays * 2}d6`;
    return {
      damageFormula: scaled,
      bonusEffect: `${rays} Rays`,
      summaryLabel: `${scaled} (${rays} Rays)`
    };
  }

  // Determine per-level scaling dice
  let addCount = perSlotDice?.count ?? 0;
  let addSides = perSlotDice?.sides ?? 0;
  let addFixed = perSlotDice?.fixed ?? 0;

  if (!addCount && !addFixed) {
    if (lower.includes('disintegrate')) {
      addCount = 3;
      addSides = 6;
    } else if (lower.includes('false life') || lower.includes('armor of agathys') || lower.includes('aid')) {
      addFixed = 5;
    } else if (lower === 'heal' || lower.startsWith('heal (')) {
      addFixed = 10;
    } else if (lower.includes('cure wounds')) {
      // 2024 PHB Cure Wounds starts at 2d8 and scales by +2d8 per slot level; 2014 starts at 1d8 (+1d8/lvl)
      addCount = baseFormula && /^2d8\b/i.test(baseFormula.trim()) ? 2 : 1;
      addSides = 8;
    } else if (lower.includes('prayer of healing') || lower.includes('inflict wounds') || lower.includes('chromatic orb') || lower.includes('guiding bolt') || lower.includes('shatter') || lower.includes('thunderwave') || lower.includes('blight') || lower.includes('cone of cold') || lower.includes('spirit guardians') || lower.includes('moonbeam') || lower.includes('witch bolt')) {
      addCount = 1;
      addSides = 8;
    } else if (lower.includes('spiritual weapon')) {
      addCount = Math.floor(levelsAbove / 2);
      addSides = 8;
      // Spiritual Weapon scales every 2 slot levels
      if (baseFormula) {
        const match = baseFormula.match(/^(\d+)d(\d+)(.*)$/i);
        if (match) {
          const newTotalDice = parseInt(match[1], 10) + addCount;
          const scaled = `${newTotalDice}d${match[2]}${match[3] || ''}`;
          return {
            damageFormula: scaled,
            summaryLabel: addCount > 0 ? `${scaled} (+${addCount}d${match[2]})` : scaled
          };
        }
      }
    } else if (lower.includes('healing word') || lower.includes('mass healing word') || lower.includes('bane') || lower.includes('bless')) {
      if (lower.includes('healing word')) {
        // 2024 PHB Healing Word starts at 2d4 and scales by +2d4 per slot level; 2014 starts at 1d4 (+1d4/lvl)
        addCount = !lower.includes('mass') && baseFormula && /^2d4\b/i.test(baseFormula.trim()) ? 2 : 1;
        addSides = 4;
      } else {
        const extraTargets = levelsAbove;
        return {
          damageFormula: baseFormula,
          bonusEffect: `+${extraTargets} Target${extraTargets > 1 ? 's' : ''}`,
          summaryLabel: `+${extraTargets} Target${extraTargets > 1 ? 's' : ''}`
        };
      }
    } else if (lower.includes('hold person') || lower.includes('hold monster') || lower.includes('invisibility') || lower.includes('fly') || lower.includes('banishment') || lower.includes('charm person') || lower.includes('command') || lower.includes('blindness')) {
      const extraTargets = levelsAbove;
      return {
        damageFormula: baseFormula,
        bonusEffect: `+${extraTargets} Target${extraTargets > 1 ? 's' : ''}`,
        summaryLabel: `+${extraTargets} Target${extraTargets > 1 ? 's' : ''}`
      };
    } else if (baseFormula) {
      // Default for damaging/healing spells: +1 die of the spell's primary die size per slot level above base
      const m = baseFormula.match(/(\d+)d(\d+)/i);
      if (m) {
        addCount = 1;
        addSides = parseInt(m[2], 10) || 6;
      }
    }
  }

  if (baseFormula) {
    // Pure flat numeric formula (e.g. "70" for Heal, "5" for Aid)
    if (/^\d+$/.test(baseFormula.trim()) && addFixed > 0) {
      const baseVal = parseInt(baseFormula.trim(), 10) || 0;
      const totalAddedFixed = addFixed * levelsAbove;
      const scaled = `${baseVal + totalAddedFixed}`;
      return {
        damageFormula: scaled,
        summaryLabel: `${scaled} (+${totalAddedFixed})`
      };
    }

    // Match primary dice group, optional flat modifier (NOT followed by 'd' so "+ 4d6" stays in suffix), and remaining suffix
    const match = baseFormula.match(/^(\d+)d(\d+)(\s*[+-]\s*\d+(?!\s*d))?(.*)$/i);
    if (match) {
      const baseDiceCount = parseInt(match[1], 10) || 1;
      const baseDiceSides = parseInt(match[2], 10) || 6;
      const rawModPart = match[3] ? match[3].replace(/\s+/g, '') : '';
      const baseMod = rawModPart ? parseInt(rawModPart, 10) || 0 : 0;
      const suffix = match[4] || '';

      const totalAddedDice = addCount * levelsAbove;
      const totalAddedFixed = addFixed * levelsAbove;
      const finalMod = baseMod + totalAddedFixed;
      const modStr = finalMod > 0 ? ` + ${finalMod}` : finalMod < 0 ? ` - ${Math.abs(finalMod)}` : '';

      if (totalAddedDice > 0 && (addSides === baseDiceSides || !addSides)) {
        const newDiceCount = baseDiceCount + totalAddedDice;
        const scaled = `${newDiceCount}d${baseDiceSides}${modStr}${suffix}`;
        return {
          damageFormula: scaled,
          summaryLabel: `${scaled} (+${totalAddedDice}d${baseDiceSides})`
        };
      } else if (totalAddedDice > 0 && addSides > 0) {
        const scaled = `${baseDiceCount}d${baseDiceSides}${modStr}${suffix} + ${totalAddedDice}d${addSides}`;
        return {
          damageFormula: scaled,
          summaryLabel: `${scaled} (+${totalAddedDice}d${addSides})`
        };
      } else if (totalAddedFixed > 0) {
        const scaled = `${baseDiceCount}d${baseDiceSides}${modStr}${suffix}`;
        return {
          damageFormula: scaled,
          summaryLabel: `${scaled} (+${totalAddedFixed})`
        };
      }
    }
  }

  return {
    damageFormula: baseFormula,
    bonusEffect: `Slot Level ${slotLevel}`,
    summaryLabel: baseFormula ? `${baseFormula} (L${slotLevel})` : `Slot Level ${slotLevel}`
  };
}

export interface EvaluatedDiceRoll {
  total: number;
  dice: Array<{ sides: number; result: number; type: string }>;
  rolls: number[];
  sides: number;
  bonus: number;
  diceSum: number;
  breakdown: string;
}

/**
 * Evaluates any D&D 5e dice formula (e.g. "8d6", "9d8", "3d4 + 3", "2d8 + 4d6", "1d8 + 5", "70")
 * by rolling every individual die, summing all dice + flat modifiers, and returning the full
 * array of 3D physics dice results so the exact number of dice tumble and add up accurately.
 */
export function evaluateDiceFormula(
  formula: string | undefined,
  isCrit = false
): EvaluatedDiceRoll {
  if (!formula || !String(formula).trim()) {
    const r = Math.floor(Math.random() * 8) + 1;
    return {
      total: r,
      dice: [{ sides: 8, result: r, type: 'd8' }],
      rolls: [r],
      sides: 8,
      bonus: 0,
      diceSum: r,
      breakdown: `[${r}] = ${r}`
    };
  }

  const rawInput = String(formula).trim();
  // Strip any previously appended roll breakdown (e.g. "→ [3 + 4] + 7 = 14") or parenthetical labels (e.g. "(6)", "(4 Darts)")
  const raw = rawInput
    .split(/→|=/)[0]
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b\d+(?:st|nd|rd|th)\b/gi, ' ')
    .trim();

  // Check if formula is a pure flat integer (e.g. "70" for Heal, "75" for Preserve Life, "5" for Aid)
  const flatOnlyMatch = raw.match(/^\+?(\d+)(?:\s+[a-zA-Z\s]+)?$/);
  if (flatOnlyMatch && !/(?<![a-zA-Z])\d*d\d+/i.test(raw)) {
    const val = parseInt(flatOnlyMatch[1], 10) || 1;
    return {
      total: val,
      dice: [],
      rolls: [val],
      sides: 8,
      bonus: val,
      diceSum: 0,
      breakdown: `${val} (Flat)`
    };
  }

  // Parse all signed dice terms (e.g. "4d4", "+ 2d6", "d8") and signed/leading flat integer terms (e.g. "+ 7", "1 + 1d4", "- 1")
  const termRegex = /([+-])?\s*(?:(?<![a-zA-Z])(\d*)d(\d+)|(\d+)(?!\s*d\d))/gi;
  let match: RegExpExecArray | null;
  const dice: Array<{ sides: number; result: number; type: string }> = [];
  const rolls: number[] = [];
  let primarySides = 6;
  let diceSum = 0;
  let bonus = 0;

  while ((match = termRegex.exec(raw)) !== null) {
    const sign = match[1] === '-' ? -1 : 1;
    if (match[3] !== undefined) {
      // Dice term: (count)d(sides)
      const rawCount = match[2] ? Math.max(1, parseInt(match[2], 10) || 1) : 1;
      const count = isCrit ? rawCount * 2 : rawCount;
      const sides = Math.max(2, parseInt(match[3], 10) || 6);
      primarySides = sides;
      for (let i = 0; i < count; i++) {
        const r = Math.floor(Math.random() * sides) + 1;
        dice.push({ sides, result: r, type: `d${sides}` });
        rolls.push(r * sign);
        diceSum += r * sign;
      }
    } else if (match[4] !== undefined) {
      // Flat modifier term: e.g. "+ 7", "- 2", or leading "1" in "1 + 1d4"
      const flatVal = parseInt(match[4], 10) || 0;
      bonus += sign * flatVal;
    }
  }

  if (dice.length === 0) {
    const fallbackVal = parseInt(raw.replace(/[^\d-]/g, ''), 10) || 1;
    return {
      total: Math.max(1, fallbackVal),
      dice: [],
      rolls: [Math.max(1, fallbackVal)],
      sides: 8,
      bonus: Math.max(1, fallbackVal),
      diceSum: 0,
      breakdown: `${Math.max(1, fallbackVal)}`
    };
  }

  const total = Math.max(1, diceSum + bonus);
  const signStr = bonus > 0 ? ` + ${bonus}` : bonus < 0 ? ` - ${Math.abs(bonus)}` : '';
  const breakdown = `[${rolls.join(' + ')}]${signStr} = ${total}${isCrit ? ' (CRIT 2x DICE!)' : ''}`;

  return {
    total,
    dice,
    rolls,
    sides: primarySides,
    bonus,
    diceSum,
    breakdown
  };
}

const AUTO_ROLL_STORAGE_KEY = 'mistwalker_player_auto_roll_by_hero';

/**
 * Normalizes a character/player name or ID into a stable per-player preference key
 * (strips Wild Shape suffixes like "(Brown Bear)" so the setting stays consistent for that player).
 */
export function normalizePlayerAutoRollKey(
  characterName?: string | null,
  ddbCharacterId?: string | number | null,
  fallbackId?: string | null
): string {
  const cleanName = String(characterName || '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim()
    .toLowerCase();
  if (cleanName) return `name:${cleanName}`;
  if (ddbCharacterId) return `ddb:${String(ddbCharacterId).replace(/^char_ddb_/, '').trim()}`;
  if (fallbackId) return `id:${String(fallbackId).trim().toLowerCase()}`;
  return 'default';
}

export function loadPlayerAutoRollMap(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(AUTO_ROLL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {}
  return {};
}

export function savePlayerAutoRollPreference(playerKey: string, enabled: boolean): Record<string, boolean> {
  const current = loadPlayerAutoRollMap();
  const next = { ...current, [playerKey]: enabled };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(AUTO_ROLL_STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }
  return next;
}

export interface HudSpellSlot {
  level: number;
  total: number;
  used: number;
  available: number;
}

export interface HudCharacterData {
  id: string;
  ddbCharacterId?: string;
  isLiveSynced?: boolean;
  isPrivate?: boolean;
  builderPreferencesUrl?: string;
  name: string;
  avatarUrl: string;
  race: string;
  classLevel: string;
  totalLevel: number;
  ac: number;
  currentHp: number;
  maxHp: number;
  tempHp: number;
  speed: string;
  walkSpeedFt: number;
  passivePerception: number;
  passiveInsight: number;
  passiveInvestigation: number;
  spellSaveDc?: number;
  spellAttackBonus?: number;
  hasBookOfExaltedDeeds?: boolean;
  canWildShape?: boolean;
  wildShapeState?: any;
  deathSaves: {
    successes: number;
    failures: number;
  };
  attacks?: HudActionItem[];
  actions: HudActionItem[];
  bonusActions: HudActionItem[];
  spells: HudActionItem[];
  reactions?: HudActionItem[];
  items: HudActionItem[];
  special?: HudActionItem[];
  spellSlots: Record<number, HudSpellSlot>;
  resources: Array<{
    name: string;
    total: number;
    available: number;
    resetType?: string;
  }>;
  readonlyUrl: string;
  lastUpdated: number;
}
