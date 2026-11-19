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

export interface HudSpecialAbilityTrigger {
  id: string;
  label: string;              // Compact pill label on the card, e.g. "🌿 Incense (1d4 AoE)"
  name: string;               // Full ability name for logs, dice & animations, e.g. "Devotee's Censer: Healing Incense"
  description: string;        // Tooltip / rule description
  type?: HudActionType;
  castingTime?: string;       // e.g. "1 Bonus Action", "On Hit"
  rangeFt?: number;           // e.g. 10 for Healing Incense
  damageFormula?: string;     // e.g. "1d4", "1d8", "2d6", "2d8", "8d6"
  damageType?: string;        // e.g. "healing", "radiant", "piercing", "force"
  saveDc?: number | string;
  saveAbility?: string;
  isHeal?: boolean;
  isSelfAction?: boolean;     // True if clicking immediately triggers an AoE/Aura on self (like Healing Incense)
  isHaloToggle?: boolean;     // True if clicking toggles token halo/illumination
  isBonusRoll?: boolean;      // True if clicking directly rolls bonus on-hit dice & plays burst effect
  jb2aAssetId?: string;       // e.g. "healing_incense", "divine_smite", "sneak_attack", "stunning_strike"
  accentColor?: 'emerald' | 'amber' | 'cyan' | 'violet' | 'rose' | 'blue';
  uses?: HudActionUses;
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
  extraDamageFormula?: string; // Automatically added rider damage rolled alongside base damage (e.g. "2d8" Divine Strike, "3d8" Devotee's Censer + Divine Strike)
  extraDamageType?: string;    // e.g. "radiant"
  extraDamageLabel?: string;   // e.g. "Divine Strike", "Radiant + Divine Strike"
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
  specialAbilities?: HudSpecialAbilityTrigger[]; // Inline special ability / trigger buttons on attack/spell/action cards
  isChannelDivinityHub?: boolean; // True if this card is the unified Channel Divinity selector hub
  subOptions?: HudActionItem[];   // Sub-actions selectable from the Channel Divinity choice menu
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
  dice: Array<{ sides: number; result: number; type?: string }>;
  rolls: number[];
  sides: number;
  bonus: number;
  diceSum: number;
  breakdown: string;
}

import { evaluateWithDiceRoller } from '../services/diceRollerService';

/**
 * Evaluates any D&D 5e dice formula (e.g. "8d6", "9d8", "3d4 + 3", "2d8 + 4d6", "1d8 + 5", "70", "4d6kh3", "1d10!", "2d20kh1 + 5")
 * using the advanced @dice-roller/rpg-dice-roller engine with individual die tracking for 3D physics dice tumbling.
 */
export function evaluateDiceFormula(
  formula: string | undefined,
  isCrit = false
): EvaluatedDiceRoll {
  try {
    return evaluateWithDiceRoller(formula, isCrit);
  } catch (err) {
    console.warn('[evaluateDiceFormula] Fallback on error:', err);
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
}

const AUTO_ROLL_STORAGE_KEY = 'mistwalker_player_auto_roll_by_hero_v2';
const AUTO_ROLL_PROMPTED_STORAGE_KEY = 'mistwalker_player_auto_roll_prompted_v2';

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

export function loadPlayerAutoRollPromptedMap(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(AUTO_ROLL_PROMPTED_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {}
  return {};
}

export function markPlayerAutoRollPrompted(playerKey: string): Record<string, boolean> {
  const current = loadPlayerAutoRollPromptedMap();
  const next = { ...current, [playerKey]: true };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(AUTO_ROLL_PROMPTED_STORAGE_KEY, JSON.stringify(next));
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
  traits?: HudActionItem[];
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

export interface EnrichSpecialAbilitiesContext {
  characterName?: string;
  classLevel?: string;
  totalLevel?: number;
  spellSaveDc?: number;
  spellMod?: number;
  hasDivineStrike?: boolean;
  hasBlessedStrikes?: boolean;
  hasFrenzy?: boolean;
  hasMartialAdept?: boolean;
  hasRadiantStrikes?: boolean;
  rogueLevel?: number;
  monkLevel?: number;
  paladinLevel?: number;
  clericLevel?: number;
  barbarianLevel?: number;
  bloodHunterLevel?: number;
}

/**
 * Resolves and attaches inline Special Ability & On-Hit Trigger buttons (`specialAbilities`)
 * for weapons, attacks, spells, and combat actions across D&D Beyond Live Sync, Local Compendium, and Battle Arena.
 */
export function resolveActionSpecialAbilities(
  action: HudActionItem,
  ctx: EnrichSpecialAbilitiesContext = {}
): HudSpecialAbilityTrigger[] {
  const existing = Array.isArray(action.specialAbilities) ? [...action.specialAbilities] : [];
  const addTrigger = (trigger: HudSpecialAbilityTrigger) => {
    if (!existing.some((e) => e.id === trigger.id || e.label.toLowerCase() === trigger.label.toLowerCase())) {
      existing.push(trigger);
    }
  };

  const lowerName = (action.name || '').toLowerCase().replace(/[\u2018\u2019`]/g, "'");
  const lowerNotes = (action.notes || '').toLowerCase();
  const lowerDesc = (action.description || '').toLowerCase();
  const lowerChar = (ctx.characterName || '').toLowerCase();
  const lowerClass = (ctx.classLevel || '').toLowerCase();
  const totalLvl = ctx.totalLevel || 5;
  const saveDc = ctx.spellSaveDc || 15;
  const spellMod = ctx.spellMod !== undefined ? ctx.spellMod : 4;

  const isCleric = Boolean(ctx.clericLevel || lowerClass.includes('cleric') || lowerChar.includes('stavros'));
  const isPaladin = Boolean(ctx.paladinLevel || lowerClass.includes('paladin') || lowerChar.includes('brannoc'));
  const isRogue = Boolean(ctx.rogueLevel || lowerClass.includes('rogue') || lowerChar.includes('arameng') || lowerChar.includes('noctua'));
  const isBarbarian = Boolean(ctx.barbarianLevel || lowerClass.includes('barbarian') || lowerChar.includes('varrak'));
  const isMonk = Boolean(ctx.monkLevel || lowerClass.includes('monk') || lowerChar.includes('burmi'));
  const isBloodHunter = Boolean(ctx.bloodHunterLevel || lowerClass.includes('blood hunter') || lowerChar.includes('sylas'));
  const isEldritchKnight = Boolean(ctx.hasMartialAdept || lowerChar.includes('aziza'));
  const isMoonDruid = Boolean(ctx.hasRadiantStrikes || lowerChar.includes("g'aiah") || lowerChar.includes('gaiah') || lowerClass.includes('druid'));

  const isWeaponOrUnarmed =
    action.subCategory === 'weapon' ||
    action.subCategory === 'unarmed' ||
    (action.category === 'attacks' && action.subCategory !== 'spell');

  // =========================================================================
  // 1. SIGNATURE MAGIC WEAPONS
  // =========================================================================

  // A. Devotee's Censer (Rare Flail — TCoE)
  // Standard attack is 1d8 + Mod Bludgeoning (+1d8 Radiant + Divine Strike automatically rolled with attack);
  // Special Ability triggers the 10-ft AoE Healing Incense (1d4 healing)
  if (lowerName.includes('censer') && !lowerName.includes('healing incense')) {
    addTrigger({
      id: 'special-devotees-censer',
      label: '🌿 Incense (1d4 AoE)',
      name: "Devotee's Censer: Healing Incense",
      type: 'bonus_action',
      castingTime: '1 Bonus Action',
      rangeFt: 10,
      damageFormula: '1d4',
      damageType: 'healing',
      isHeal: true,
      isSelfAction: true,
      jb2aAssetId: 'healing_incense',
      accentColor: 'emerald',
      uses: { available: 1, total: 1, resetType: 'Dawn' },
      description:
        'Speak the command word as a bonus action to cause the flail to emanate a thin cloud of incense out to 10 feet for 1 minute. At the start of each of your turns, you and any other creatures in the incense each regain 1d4 hit points.'
    });
  }

  // B. Mace of Disruption (Rare Mace — DMG)
  if (lowerName.includes('mace of disruption')) {
    addTrigger({
      id: 'trigger-mace-disruption',
      label: '☀️ +2d6 vs Undead/Fiend',
      name: 'Mace of Disruption: Fiend/Undead Smite',
      type: 'special',
      castingTime: 'On Hit (DC 15 WIS if ≤25 HP)',
      rangeFt: 5,
      damageFormula: '2d6',
      damageType: 'radiant',
      saveDc: 15,
      saveAbility: 'WIS',
      isBonusRoll: true,
      jb2aAssetId: 'divine_smite',
      accentColor: 'amber',
      description:
        'When you hit a Fiend or an Undead with this magic weapon, that creature takes an extra 2d6 radiant damage. If the target has 25 hit points or fewer after taking this damage, it must succeed on a DC 15 Wisdom saving throw or be destroyed. On a successful save, the creature becomes Frightened of you until the end of your next turn.'
    });
  }

  // C. Staff of Power (Very Rare Staff — DMG)
  if (lowerName.includes('staff of power')) {
    addTrigger({
      id: 'trigger-staff-power-strike',
      label: '⚡ Power Strike (+1d6)',
      name: 'Staff of Power: Power Strike',
      type: 'special',
      castingTime: 'On Hit (1 Charge)',
      rangeFt: 5,
      damageFormula: '1d6',
      damageType: 'force',
      isBonusRoll: true,
      jb2aAssetId: 'eldritch_blast',
      accentColor: 'violet',
      description: 'When you hit with a melee attack using the Staff of Power, you can expend 1 charge to deal an extra 1d6 force damage to the target.'
    });
  }

  // D.Thunder Gauntlets (Armorer Artificer — TCoE)
  if (lowerName.includes('thunder gauntlet')) {
    addTrigger({
      id: 'trigger-thunder-pulse',
      label: '🛡️ Taunt Pulse',
      name: 'Thunder Gauntlets: Distracting Pulse',
      type: 'special',
      castingTime: 'On Hit',
      rangeFt: 5,
      isBonusRoll: true,
      jb2aAssetId: 'thunderwave',
      accentColor: 'cyan',
      description: 'A creature hit by the gauntlet has disadvantage on attack rolls against targets other than you until the start of your next turn.'
    });
  }

  // =========================================================================
  // 2. CLASS & WEAPON MASTERY TRIGGERS ON WEAPON ATTACKS
  // =========================================================================
  if (isWeaponOrUnarmed) {
    // Note: Cleric Divine Strike (+2d8 / +1d8 Radiant) & Devotee's Censer (+1d8 Radiant)
    // are automatically added to the weapon's damage roll and displayed beside the primary damage badge,
    // rather than cluttering the card body with separate pill buttons.

    // Paladin: Divine Smite (+2d8 Radiant) on melee weapon attacks
    if (isPaladin && (action.rangeFt || 5) <= 10) {
      addTrigger({
        id: `trigger-paladin-smite-${action.id}`,
        label: '⚡ Divine Smite (2d8)',
        name: 'Divine Smite',
        type: 'bonus_action',
        castingTime: 'On Hit (1st+ Slot)',
        rangeFt: 5,
        damageFormula: '2d8',
        damageType: 'radiant',
        isBonusRoll: true,
        jb2aAssetId: 'divine_smite',
        accentColor: 'amber',
        description: 'When you hit a creature with a melee weapon attack, you can expend one spell slot to deal 2d8 radiant damage to the target (+1d8 for each spellLevel above 1st, plus an extra 1d8 against Undead or Fiends).'
      });
    }

    // Rogue: Sneak Attack (+Xd6) on finesse or ranged weapons
    const isRangedOrFinesse =
      (action.rangeFt && action.rangeFt >= 20) ||
      lowerNotes.includes('finesse') ||
      lowerDesc.includes('finesse') ||
      lowerName.includes('rapier') ||
      lowerName.includes('shortsword') ||
      lowerName.includes('dagger') ||
      lowerName.includes('bow') ||
      lowerName.includes('crossbow');
    if (isRogue && isRangedOrFinesse && action.subCategory === 'weapon') {
      const rLvl = ctx.rogueLevel || (lowerChar.includes('noctua') ? 2 : totalLvl);
      const saDice = `${Math.max(1, Math.ceil(rLvl / 2))}d6`;
      addTrigger({
        id: `trigger-rogue-sneak-${action.id}`,
        label: `🗡️ Sneak Attack (+${saDice})`,
        name: `Sneak Attack (${saDice})`,
        type: 'special',
        castingTime: 'On Hit (1/Turn)',
        rangeFt: action.rangeFt || 5,
        damageFormula: saDice,
        damageType: action.damageType || 'piercing',
        isBonusRoll: true,
        jb2aAssetId: 'sneak_attack',
        accentColor: 'rose',
        description: `Once per turn, deal an extra ${saDice} damage to one creature you hit with an attack if you have advantage on the attack roll or an ally is within 5 feet of the target.`
      });
    }

    // Barbarian: Frenzy (+2d6) & Weapon Mastery (Cleave / Topple)
    if (isBarbarian && action.subCategory === 'weapon') {
      if (ctx.hasFrenzy || lowerChar.includes('varrak')) {
        addTrigger({
          id: `trigger-barb-frenzy-${action.id}`,
          label: '🔥 Frenzy (+2d6)',
          name: 'Frenzy (Path of the Berserker)',
          type: 'special',
          castingTime: 'On Hit (Rage + Reckless)',
          rangeFt: action.rangeFt || 5,
          damageFormula: '2d6',
          damageType: action.damageType || 'slashing',
          isBonusRoll: true,
          jb2aAssetId: 'attack_greataxe',
          accentColor: 'rose',
          description: 'If you use Reckless Attack while your Rage is active, you deal an extra 2d6 damage to the first target you hit on your turn with a Strength-based attack.'
        });
      }
      if (lowerNotes.includes('cleave') || lowerDesc.includes('cleave') || lowerName.includes('greataxe') || lowerName.includes('halberd')) {
        addTrigger({
          id: `trigger-mastery-cleave-${action.id}`,
          label: '🪓 Cleave (1d12)',
          name: 'Weapon Mastery: Cleave',
          type: 'special',
          castingTime: 'On Hit (2nd Target within 5ft)',
          rangeFt: 5,
          damageFormula: '1d12',
          damageType: 'slashing',
          isBonusRoll: true,
          jb2aAssetId: 'attack_greataxe',
          accentColor: 'amber',
          description: 'If you hit a creature with a melee attack roll using this weapon, you can make a melee attack roll with the weapon against a second creature within 5 feet of the first that is also within your reach.'
        });
      }
      if (lowerNotes.includes('topple') || lowerDesc.includes('topple') || lowerName.includes('trident') || lowerName.includes('maul') || lowerName.includes('lance')) {
        addTrigger({
          id: `trigger-mastery-topple-${action.id}`,
          label: '🌊 Topple (Prone)',
          name: 'Weapon Mastery: Topple',
          type: 'special',
          castingTime: 'On Hit (CON Save)',
          rangeFt: 5,
          saveDc: 16,
          saveAbility: 'CON',
          isBonusRoll: true,
          jb2aAssetId: 'attack_hammer',
          accentColor: 'cyan',
          description: 'If you hit a creature with this weapon, you can force the creature to make a Constitution saving throw (DC 8 + Prof + STR) or be knocked Prone.'
        });
      }
    }

    // Monk: Stunning Strike & Flurry of Blows
    if (isMonk && (totalLvl >= 5 || (ctx.monkLevel || 0) >= 5)) {
      const mDie = totalLvl >= 17 ? '1d12' : totalLvl >= 11 ? '1d10' : totalLvl >= 5 ? '1d8' : '1d6';
      addTrigger({
        id: `trigger-monk-stun-${action.id}`,
        label: `💫 Stun (DC ${saveDc} CON)`,
        name: 'Stunning Strike',
        type: 'special',
        castingTime: 'On Hit (1 Ki)',
        rangeFt: 5,
        saveDc,
        saveAbility: 'CON',
        isBonusRoll: true,
        jb2aAssetId: 'stunning_strike',
        accentColor: 'amber',
        description: `When you hit another creature with a melee weapon attack, you can spend 1 ki point to attempt a stunning strike. The target must succeed on a DC ${saveDc} Constitution saving throw or be Stunned until the end of your next turn.`
      });
      if (action.subCategory === 'unarmed' || lowerName.includes('unarmed')) {
        addTrigger({
          id: `trigger-monk-flurry-${action.id}`,
          label: `👊 Flurry (${mDie})`,
          name: 'Flurry of Blows',
          type: 'bonus_action',
          castingTime: '1 Bonus Action (1 Ki)',
          rangeFt: 5,
          damageFormula: action.damageFormula || `${mDie} + 5`,
          damageType: 'bludgeoning',
          isBonusRoll: true,
          jb2aAssetId: 'flurry_of_blows',
          accentColor: 'cyan',
          description: 'Immediately after you take the Attack action on your turn, you can spend 1 ki point to make two unarmed strikes as a bonus action.'
        });
      }
    }

    // Blood Hunter: Crimson Rite (+1d4 / +1d6 / +1d8)
    if (isBloodHunter && action.subCategory === 'weapon') {
      const riteDie = totalLvl >= 11 ? '1d8' : totalLvl >= 5 ? '1d6' : '1d4';
      addTrigger({
        id: `trigger-crimson-rite-${action.id}`,
        label: `⚡ Rite (+${riteDie})`,
        name: `Crimson Rite (+${riteDie})`,
        type: 'special',
        castingTime: 'On Hit',
        rangeFt: action.rangeFt || 5,
        damageFormula: riteDie,
        damageType: 'radiant',
        isBonusRoll: true,
        jb2aAssetId: 'divine_smite',
        accentColor: 'rose',
        description: `Deal an extra ${riteDie} Crimson Rite elemental/radiant damage on hit (plus an extra ${riteDie} radiant against Undead with Rite of the Dawn).`
      });
    }

    // Eldritch Knight / Fighter with Martial Adept: Precision / Disarming Attack (+1d6)
    if (isEldritchKnight && action.subCategory === 'weapon') {
      addTrigger({
        id: `trigger-disarming-atk-${action.id}`,
        label: '⚔️ Disarm (+1d6)',
        name: 'Martial Adept: Disarming Attack',
        type: 'special',
        castingTime: 'On Hit (1 Superiority Die)',
        rangeFt: action.rangeFt || 5,
        damageFormula: '1d6',
        damageType: action.damageType || 'slashing',
        isBonusRoll: true,
        jb2aAssetId: 'attack_slash',
        accentColor: 'amber',
        description: 'When you hit a creature with a weapon attack, expend one superiority die to add 1d6 to the attack’s damage roll and force the target to make a Strength save or drop one item it is holding.'
      });
    }

    // Circle of the Moon Druid (Wild Shape Beast Attacks): Radiant Strikes (+1d8 Radiant)
    if (isMoonDruid && (action.sourceLabel?.toLowerCase().includes('wild shape') || lowerNotes.includes('radiant strikes'))) {
      addTrigger({
        id: `trigger-moon-radiant-${action.id}`,
        label: '🌙 Radiant (+1d8)',
        name: 'Lunar Form: Radiant Strikes',
        type: 'special',
        castingTime: 'On Hit (1/Turn)',
        rangeFt: 5,
        damageFormula: '1d8',
        damageType: 'radiant',
        isBonusRoll: true,
        jb2aAssetId: 'divine_smite',
        accentColor: 'amber',
        description: 'Once on each of your turns when you hit a target with an attack roll of your Wild Shape form, you can deal an extra 1d8 Radiant damage.'
      });
    }
  }

  // =========================================================================
  // 3. SPELLS WITH SECONDARY / TURN-BY-TURN SPECIAL TRIGGERS
  // =========================================================================
  if (action.category === 'spells' || action.subCategory === 'spell') {
    // Cleric Blessed Strikes on damaging Cantrips
    if (isCleric && (action.level ?? 0) === 0 && action.damageFormula && !action.isHeal && (totalLvl >= 8 || ctx.hasBlessedStrikes)) {
      addTrigger({
        id: `trigger-cantrip-blessed-${action.id}`,
        label: '✨ +1d8 Radiant',
        name: 'Blessed Strikes (Cantrip Boost)',
        type: 'special',
        castingTime: 'On Damage (1/Turn)',
        rangeFt: action.rangeFt || 60,
        damageFormula: '1d8',
        damageType: 'radiant',
        isBonusRoll: true,
        jb2aAssetId: 'divine_smite',
        accentColor: 'amber',
        description: 'When a creature takes damage from one of your cantrips or weapon attacks, you can also deal 1d8 radiant damage to that creature (1/turn).'
      });
    }

    // Spiritual Weapon: Bonus Action Strike trigger
    if (lowerName.includes('spiritual weapon')) {
      const swFormula = action.damageFormula || `1d8 + ${Math.max(1, spellMod)}`;
      addTrigger({
        id: `trigger-sw-strike-${action.id}`,
        label: `🔨 Strike (${swFormula.replace(/\s+/g, '')})`,
        name: 'Spiritual Weapon: Bonus Action Strike',
        type: 'bonus_action',
        castingTime: '1 Bonus Action',
        rangeFt: 20,
        damageFormula: swFormula,
        damageType: 'force',
        isBonusRoll: true,
        jb2aAssetId: 'spiritual_weapon',
        accentColor: 'amber',
        description: 'As a bonus action on your turn, move the weapon up to 20 feet and repeat the attack against a creature within 5 feet of it.'
      });
    }

    // Aura of Vitality: Bonus Action 2d6 Heal trigger
    if (lowerName.includes('aura of vitality')) {
      addTrigger({
        id: `trigger-vitality-pulse-${action.id}`,
        label: '💚 Heal Pulse (2d6)',
        name: 'Aura of Vitality: Healing Pulse',
        type: 'bonus_action',
        castingTime: '1 Bonus Action',
        rangeFt: 30,
        damageFormula: '2d6',
        damageType: 'healing',
        isHeal: true,
        isBonusRoll: true,
        jb2aAssetId: 'cure_wounds',
        accentColor: 'emerald',
        description: 'As a bonus action, you can cause one creature in the 30-foot aura (including yourself) to regain 2d6 hit points.'
      });
    }

    // Call Lightning: Call Bolt (3d10 Lightning)
    if (lowerName.includes('call lightning')) {
      const boltDmg = action.damageFormula || '3d10';
      addTrigger({
        id: `trigger-call-bolt-${action.id}`,
        label: `⚡ Call Bolt (${boltDmg})`,
        name: 'Call Lightning: Strike Bolt',
        type: 'action',
        castingTime: '1 Action',
        rangeFt: 60,
        damageFormula: boltDmg,
        damageType: 'lightning',
        saveDc,
        saveAbility: 'DEX',
        isBonusRoll: true,
        jb2aAssetId: 'call_lightning',
        accentColor: 'cyan',
        description: 'On each of your turns until the spell ends, you can use your action to call down lightning on a point within range (DEX save or 3d10 lightning damage).'
      });
    }

    // Sunbeam: Fire New Beam (6d8 Radiant)
    if (lowerName === 'sunbeam') {
      addTrigger({
        id: `trigger-sunbeam-ray-${action.id}`,
        label: '☀️ Fire Beam (6d8)',
        name: 'Sunbeam: Solar Line',
        type: 'action',
        castingTime: '1 Action',
        rangeFt: 60,
        damageFormula: '6d8',
        damageType: 'radiant',
        saveDc,
        saveAbility: 'CON',
        isBonusRoll: true,
        jb2aAssetId: 'sunbeam',
        accentColor: 'amber',
        description: 'For the duration, you can use an action on each of your turns to create a new 5-foot-wide, 60-foot-long line of radiance (6d8 radiant + Blinded on failed CON save).'
      });
    }

    // Holy Weapon: Dismiss Burst (4d8 Radiant)
    if (lowerName.includes('holy weapon')) {
      addTrigger({
        id: `trigger-holy-weapon-burst-${action.id}`,
        label: '💥 Burst (4d8 AoE)',
        name: 'Holy Weapon: Radiant Burst',
        type: 'bonus_action',
        castingTime: '1 Bonus Action (30ft AoE)',
        rangeFt: 30,
        damageFormula: '4d8',
        damageType: 'radiant',
        saveDc,
        saveAbility: 'CON',
        isBonusRoll: true,
        jb2aAssetId: 'holy_aura',
        accentColor: 'amber',
        description: 'As a bonus action, dismiss Holy Weapon to cause it to emits a burst of radiance. Each creature of your choice within 30 feet must make a CON save or take 4d8 radiant damage and be Blinded for 1 minute.'
      });
    }
  }

  // Filtering: remove any previously cached Halo Light or Divine Strike / Censer Radiant triggers from existing items
  const cleaned = existing.filter(
    (t) =>
      t.id !== 'special-halo-glow' &&
      t.id !== 'trigger-censer-radiant' &&
      !t.id.startsWith('trigger-cleric-strike-') &&
      !t.label.toLowerCase().includes('divine strike') &&
      !t.label.toLowerCase().includes('halo light')
  );
  return cleaned;
}

/**
 * Computes any automatic rider damage (such as Cleric Divine Strike / Blessed Strikes +2d8/+1d8 Radiant,
 * or Devotee's Censer +1d8 Radiant) so that it is automatically rolled with the weapon attack
 * and displayed as a compact badge right beside the primary damage badge on the right side of the card.
 */
export function resolveActionAutomaticExtraDamage(
  action: HudActionItem,
  ctx: EnrichSpecialAbilitiesContext = {}
): { extraDamageFormula?: string; extraDamageType?: string; extraDamageLabel?: string } {
  const lowerName = (action.name || '').toLowerCase().replace(/[\u2018\u2019`]/g, "'");
  const lowerChar = (ctx.characterName || '').toLowerCase();
  const lowerClass = (ctx.classLevel || '').toLowerCase();
  const totalLvl = ctx.totalLevel || 5;
  const isCleric = Boolean(ctx.clericLevel || lowerClass.includes('cleric') || lowerChar.includes('stavros'));

  const isWeaponAttack =
    action.subCategory === 'weapon' ||
    (action.category === 'attacks' && action.subCategory !== 'spell' && action.subCategory !== 'unarmed' && !lowerName.includes('unarmed'));

  const isDamagingCantrip =
    (action.subCategory === 'spell' || action.category === 'spells') &&
    (action.level ?? 0) === 0 &&
    Boolean(action.damageFormula) &&
    !action.isHeal;

  if (!isWeaponAttack && !isDamagingCantrip) return {};

  let radiantD8Count = 0;
  const labels: string[] = [];

  // 1. Devotee's Censer inherent +1d8 Radiant damage on hit (weapons only)
  if (isWeaponAttack && lowerName.includes('censer') && !lowerName.includes('healing incense')) {
    radiantD8Count += 1;
    labels.push('Radiant');
  }

  // 2. Cleric Divine Strike (+2d8 at Lvl 14+, +1d8 at Lvl 8+ on weapons) or Blessed Strikes (+1d8 on weapons OR cantrips)
  const useBlessedStrikes = Boolean(ctx.hasBlessedStrikes && !ctx.hasDivineStrike && !lowerChar.includes('stavros'));
  if (isWeaponAttack && isCleric && (totalLvl >= 8 || ctx.hasDivineStrike || ctx.hasBlessedStrikes)) {
    const clericDice = useBlessedStrikes ? 1 : totalLvl >= 14 ? 2 : 1;
    radiantD8Count += clericDice;
    labels.push(useBlessedStrikes ? 'Blessed Strikes' : 'Divine Strike');
  } else if (isDamagingCantrip && isCleric && useBlessedStrikes) {
    radiantD8Count += 1;
    labels.push('Blessed Strikes');
  }

  if (radiantD8Count > 0) {
    return {
      extraDamageFormula: `+${radiantD8Count}d8`,
      extraDamageType: 'radiant',
      extraDamageLabel: labels.length > 1 ? 'Radiant' : labels[0] || 'Divine Strike'
    };
  }

  return {};
}

export interface ConsolidateChannelDivinityContext {
  characterName?: string;
  classLevel?: string;
  totalLevel?: number;
  spellSaveDc?: number;
  profBonus?: number;
}

/**
 * Returns true if a HudActionItem is a passive character trait, racial trait, feat, or passive class feature
 * (which belongs in the Character Traits drawer rather than the active `Special` combat actions tab).
 */
export function isPassiveTraitOrFeature(item: HudActionItem | null | undefined): boolean {
  if (!item) return false;
  if (item.isChannelDivinityHub || item.isHaloToggle) return false;
  const n = (item.name || '').toLowerCase().replace(/[\u2018\u2019`]/g, "'").trim();
  const ct = (item.castingTime || '').toLowerCase().trim();
  const src = (item.sourceLabel || '').toLowerCase().trim();

  // Active usable special actions always stay in Special
  if (
    n.includes('channel divinity') ||
    n.includes('divine intervention') ||
    n.includes('healing incense') ||
    n.includes('illuminate self') ||
    n.includes('rite of the dawn') ||
    n.includes('gem of brightness') ||
    n.includes('lantern of revealing') ||
    n.includes('wild shape') ||
    n.includes('action surge') ||
    n.includes('second wind') ||
    n.includes('lay on hands') ||
    n.includes('bardic inspiration') ||
    n.includes('patient defense') ||
    n.includes('step of the wind') ||
    n.includes('flurry of blows') ||
    n.includes('crimson rite') ||
    n.includes('cunning action') ||
    n.includes('steady aim') ||
    n.includes('arcane recovery') ||
    n.includes('harness divine power')
  ) {
    return false;
  }

  if (
    item.type === 'passive' ||
    ct === 'special / trait' ||
    ct === 'special / feat' ||
    ct === '(no action)' ||
    ct === 'passive / special' ||
    ct === 'passive'
  ) {
    return true;
  }

  if (
    src === 'feature & trait' ||
    src === 'feat' ||
    src.endsWith(' trait') ||
    src === 'species option' ||
    src === 'feat option' ||
    src === 'class option / invocation'
  ) {
    return true;
  }

  // Known passive features / racial traits / feats that may appear in fallback or arena data
  return (
    n.includes('dwarven resilience') ||
    n.includes('dwarven combat training') ||
    n.includes('dwarven toughness') ||
    n.includes('stonecunning') ||
    n.includes('tool proficiency') ||
    n.includes('disciple of life') ||
    n.includes('blessed healer') ||
    n.includes('blessed strikes') ||
    n.includes('divine strike') ||
    n.includes('supreme healing') ||
    n.includes('destroy undead') ||
    n.includes('enlightened magic') ||
    n.includes('book of exalted deeds') ||
    n.includes('fey touched') ||
    n.includes('war caster') ||
    n.includes('fey ancestry') ||
    n.includes('keen senses') ||
    n.includes('darkvision') ||
    n.includes('trance') ||
    n.includes('unarmored defense') ||
    n.includes('extra attack') ||
    n.includes('danger sense') ||
    n.includes('aura of protection') ||
    n.includes('aura of courage') ||
    n.includes('divine health') ||
    n.includes('potent spellcasting') ||
    n.includes('jack of all trades') ||
    n.includes('expertise') ||
    n.includes('evasion') ||
    n.includes('timeless body') ||
    n.includes('purity of body') ||
    n.includes('diamond soul')
  );
}

/**
 * Checks whether an action or feature belongs to the Channel Divinity family
 * (so redundant standalone entries can be consolidated into one unified Channel Divinity hub card).
 */
export function isChannelDivinityRelatedAction(name: string | undefined): boolean {
  if (!name) return false;
  const n = name.toLowerCase().replace(/[\u2018\u2019`]/g, "'").trim();
  return (
    n === 'channel divinity' ||
    n.startsWith('channel divinity') ||
    n.includes('turn undead') ||
    n.includes('destroy undead') ||
    n.includes('preserve life') ||
    n.includes('harness divine power') ||
    n.includes('turn the unholy') ||
    n.includes('sacred weapon') ||
    n.includes('abjure enemy') ||
    n.includes('vow of enmity') ||
    n.includes('radiance of the dawn') ||
    n.includes('twilight sanctuary') ||
    n.includes('guided strike') ||
    n.includes("war god's blessing") ||
    n.includes('invoke duplicity') ||
    n.includes("artisan's blessing") ||
    n.includes('charm animals and plants') ||
    n.includes('destructive wrath') ||
    n.includes('knowledge of the ages') ||
    n.includes('read thoughts') ||
    n.includes('balm of peace')
  );
}

/**
 * Consolidates all Channel Divinity options (Turn Undead + Destroy Undead, Preserve Life,
 * Harness Divine Power, and any Paladin/Cleric subclass Channel Divinity features) into a
 * single unified `Channel Divinity` hub card with `isChannelDivinityHub: true` and `subOptions`,
 * while removing all redundant duplicate Channel Divinity cards from `actions`, `bonusActions`, and `special`.
 */
export function consolidateChannelDivinityLists(
  lists: {
    actions: HudActionItem[];
    bonusActions: HudActionItem[];
    special: HudActionItem[];
  },
  ctx: ConsolidateChannelDivinityContext = {}
): void {
  const lowerChar = (ctx.characterName || '').toLowerCase();
  const lowerClass = (ctx.classLevel || '').toLowerCase();
  const totalLvl = ctx.totalLevel || 5;
  const saveDc = ctx.spellSaveDc || 15;
  const profBonus = ctx.profBonus || (Math.ceil(totalLvl / 4) + 1);

  const isCleric = lowerClass.includes('cleric') || lowerChar.includes('stavros');
  const isPaladin = lowerClass.includes('paladin') || lowerChar.includes('brannoc');

  const allPool = [...lists.actions, ...lists.bonusActions, ...lists.special];
  const hasAnyCdInLists = allPool.some((a) => isChannelDivinityRelatedAction(a.name));

  if (!isCleric && !isPaladin && !hasAnyCdInLists) {
    return;
  }

  // Determine Channel Divinity uses (Clerics get 1 at Lv2, 2 at Lv6, 3 at Lv18; Paladins get 1 at Lv3, 2 at Lv11 in 2024)
  const existingHubWithUses = allPool.find(
    (a) => a.name.toLowerCase().trim() === 'channel divinity' && a.uses && a.uses.total > 0
  );
  const defaultTotalUses = isCleric ? (totalLvl >= 18 ? 3 : totalLvl >= 6 ? 2 : 1) : 1;
  const cdUses: HudActionUses = existingHubWithUses?.uses || {
    available: defaultTotalUses,
    total: defaultTotalUses,
    resetType: 'Short Rest'
  };

  const destroyUndeadCr =
    totalLvl >= 17 ? '4' : totalLvl >= 14 ? '3' : totalLvl >= 11 ? '2' : totalLvl >= 8 ? '1' : totalLvl >= 5 ? '1/2' : undefined;
  const maxHarnessSlotLvl = Math.min(3, Math.ceil(profBonus / 2));

  const subOptionsMap = new Map<string, HudActionItem>();

  // 1. Collect any specific Channel Divinity sub-options already extracted from D&D Beyond
  for (const item of allPool) {
    const rawName = (item.name || '').trim();
    const lower = rawName.toLowerCase();
    if (!isChannelDivinityRelatedAction(rawName)) continue;
    // Skip generic parent "Channel Divinity" or passive "Destroy Undead" (merged into Turn Undead)
    if (lower === 'channel divinity' || /^channel divinity\s*\(/i.test(rawName)) continue;
    if (lower.startsWith('destroy undead')) continue;

    if (lower.includes('turn undead')) {
      subOptionsMap.set('turn_undead', {
        ...item,
        id: 'cd-opt-turn-undead',
        name: destroyUndeadCr
          ? `Channel Divinity: Turn Undead (Destroy CR ${destroyUndeadCr} or Lower)`
          : 'Channel Divinity: Turn Undead',
        category: 'actions',
        type: 'action',
        subCategory: 'class',
        sourceLabel: destroyUndeadCr ? `Cleric • Destroy Undead (CR ≤ ${destroyUndeadCr})` : 'Cleric • Channel Divinity',
        castingTime: '1 Action',
        rangeFt: 30,
        saveDc: item.saveDc || saveDc,
        saveAbility: 'WIS',
        isSelfAction: false,
        jb2aAssetId: 'holy_aura',
        notes: destroyUndeadCr ? `30 ft. Radius AoE • Undead CR ≤ ${destroyUndeadCr} Instantly Destroyed` : '30 ft. Radius AoE',
        description: destroyUndeadCr
          ? `As an action, you present your holy symbol and speak a prayer censuring the undead. Each undead that can see or hear you within 30 feet of you must make a DC ${item.saveDc || saveDc} WIS saving throw. On a failed save, an undead of CR ${destroyUndeadCr} or lower is instantly destroyed (Destroy Undead); otherwise it is turned for 1 minute or until it takes damage.`
          : item.description
      });
    } else if (lower.includes('preserve life')) {
      const preservePool = totalLvl * 5;
      subOptionsMap.set('preserve_life', {
        ...item,
        id: 'cd-opt-preserve-life',
        name: `Channel Divinity: Preserve Life (${preservePool} HP Pool)`,
        category: 'actions',
        type: 'action',
        subCategory: 'class',
        sourceLabel: 'Life Domain • Channel Divinity',
        castingTime: '1 Action',
        rangeFt: 30,
        damageFormula: `${preservePool}`,
        damageType: 'healing',
        isHeal: true,
        isSelfAction: false,
        jb2aAssetId: 'cure_wounds',
        notes: `Restore up to ${preservePool} HP within 30 ft. (up to half max HP)`,
        description: `As an action, you present your holy symbol and evoke healing energy that can restore ${preservePool} hit points (5 × Cleric level). Choose any creatures within 30 feet of you, and divide those hit points among them. This feature can restore a creature to no more than half of its hit point maximum.`
      });
    } else if (lower.includes('harness divine power')) {
      subOptionsMap.set('harness_divine_power', {
        ...item,
        id: 'cd-opt-harness-divine-power',
        name: `Channel Divinity: Harness Divine Power (Restore ≤ Lv ${maxHarnessSlotLvl} Slot)`,
        category: 'bonus_actions',
        type: 'bonus_action',
        subCategory: 'class',
        sourceLabel: 'TCoE • Channel Divinity',
        castingTime: '1 Bonus Action',
        rangeFt: 0,
        isSelfAction: true,
        jb2aAssetId: 'bless',
        notes: `Regain 1 Expended Spell Slot up to Level ${maxHarnessSlotLvl}`,
        description: `You can expend a use of your Channel Divinity to fuel your spells. As a bonus action, you touch your holy symbol, utter a prayer, and regain one expended spell slot, the level of which can be no higher than ${maxHarnessSlotLvl} (half your proficiency bonus, rounded up).`
      });
    } else {
      const cleanKey = lower.replace(/^channel divinity:\s*/i, '').trim();
      if (!subOptionsMap.has(cleanKey)) {
        subOptionsMap.set(cleanKey, {
          ...item,
          id: `cd-opt-${cleanKey.replace(/[^a-z0-9]+/g, '-')}`,
          name: rawName.toLowerCase().startsWith('channel divinity') ? rawName : `Channel Divinity: ${rawName}`,
          jb2aAssetId: item.jb2aAssetId || 'holy_aura'
        });
      }
    }
  }

  // 2. Ensure core Cleric / Stavros Channel Divinity options exist even on fallback sheets
  if (isCleric) {
    if (!subOptionsMap.has('turn_undead')) {
      subOptionsMap.set('turn_undead', {
        id: 'cd-opt-turn-undead',
        name: destroyUndeadCr
          ? `Channel Divinity: Turn Undead (Destroy CR ${destroyUndeadCr} or Lower)`
          : 'Channel Divinity: Turn Undead',
        category: 'actions',
        type: 'action',
        subCategory: 'class',
        sourceLabel: destroyUndeadCr ? `Cleric • Destroy Undead (CR ≤ ${destroyUndeadCr})` : 'Cleric • Channel Divinity',
        castingTime: '1 Action',
        rangeFt: 30,
        saveDc,
        saveAbility: 'WIS',
        isSelfAction: false,
        jb2aAssetId: 'holy_aura',
        notes: destroyUndeadCr ? `30 ft. Radius AoE • Undead CR ≤ ${destroyUndeadCr} Instantly Destroyed` : '30 ft. Radius AoE',
        description: `As an action, you present your holy symbol and speak a prayer censuring the undead. Each undead that can see or hear you within 30 feet of you must make a DC ${saveDc} WIS saving throw. On a failed save, an undead of CR ${destroyUndeadCr || '1/2'} or lower is instantly destroyed; otherwise it is turned for 1 minute or until it takes damage.`
      });
    }
    if (
      !subOptionsMap.has('preserve_life') &&
      (lowerChar.includes('stavros') || lowerClass.includes('life') || allPool.some((a) => a.name.toLowerCase().includes('blessed healer')))
    ) {
      const preservePool = totalLvl * 5;
      subOptionsMap.set('preserve_life', {
        id: 'cd-opt-preserve-life',
        name: `Channel Divinity: Preserve Life (${preservePool} HP Pool)`,
        category: 'actions',
        type: 'action',
        subCategory: 'class',
        sourceLabel: 'Life Domain • Channel Divinity',
        castingTime: '1 Action',
        rangeFt: 30,
        damageFormula: `${preservePool}`,
        damageType: 'healing',
        isHeal: true,
        isSelfAction: false,
        jb2aAssetId: 'cure_wounds',
        notes: `Restore up to ${preservePool} HP within 30 ft. (up to half max HP)`,
        description: `As an action, you present your holy symbol and evoke healing energy that can restore ${preservePool} hit points (5 × Cleric level). Choose any creatures within 30 feet of you, and divide those hit points among them. This feature can restore a creature to no more than half of its hit point maximum.`
      });
    }
    if (!subOptionsMap.has('harness_divine_power')) {
      subOptionsMap.set('harness_divine_power', {
        id: 'cd-opt-harness-divine-power',
        name: `Channel Divinity: Harness Divine Power (Restore ≤ Lv ${maxHarnessSlotLvl} Slot)`,
        category: 'bonus_actions',
        type: 'bonus_action',
        subCategory: 'class',
        sourceLabel: 'TCoE • Channel Divinity',
        castingTime: '1 Bonus Action',
        rangeFt: 0,
        isSelfAction: true,
        jb2aAssetId: 'bless',
        notes: `Regain 1 Expended Spell Slot up to Level ${maxHarnessSlotLvl}`,
        description: `You can expend a use of your Channel Divinity to fuel your spells. As a bonus action, you touch your holy symbol, utter a prayer, and regain one expended spell slot of up to level ${maxHarnessSlotLvl}.`
      });
    }
  } else if (isPaladin && subOptionsMap.size === 0) {
    subOptionsMap.set('sacred_weapon', {
      id: 'cd-opt-sacred-weapon',
      name: 'Channel Divinity: Sacred Weapon',
      category: 'actions',
      type: 'action',
      subCategory: 'class',
      sourceLabel: 'Paladin • Channel Divinity',
      castingTime: '1 Action',
      rangeFt: 0,
      isSelfAction: true,
      jb2aAssetId: 'divine_smite',
      notes: '+CHA to Attack Rolls • 20 ft. Bright Light (1 Minute)',
      description: 'Imbue one weapon that you are holding with positive energy. For 1 minute, you add your Charisma modifier to attack rolls made with that weapon (minimum bonus of +1), the weapon emits bright light in a 20-foot radius, and it becomes magical.'
    });
    subOptionsMap.set('turn_the_unholy', {
      id: 'cd-opt-turn-unholy',
      name: 'Channel Divinity: Turn the Unholy',
      category: 'actions',
      type: 'action',
      subCategory: 'class',
      sourceLabel: 'Paladin • Channel Divinity',
      castingTime: '1 Action',
      rangeFt: 30,
      saveDc,
      saveAbility: 'WIS',
      isSelfAction: false,
      jb2aAssetId: 'holy_aura',
      notes: '30 ft. Radius AoE • Turns Fiends & Undead',
      description: `As an action, you present your holy symbol and speak a prayer censuring fiends and undead. Each fiend or undead that can see or hear you within 30 feet of you must make a DC ${saveDc} Wisdom saving throw or be turned for 1 minute.`
    });
    subOptionsMap.set('harness_divine_power', {
      id: 'cd-opt-harness-divine-power',
      name: `Channel Divinity: Harness Divine Power (Restore ≤ Lv ${maxHarnessSlotLvl} Slot)`,
      category: 'bonus_actions',
      type: 'bonus_action',
      subCategory: 'class',
      sourceLabel: 'TCoE • Channel Divinity',
      castingTime: '1 Bonus Action',
      rangeFt: 0,
      isSelfAction: true,
      jb2aAssetId: 'bless',
      notes: `Regain 1 Expended Spell Slot up to Level ${maxHarnessSlotLvl}`,
      description: `Expend a use of your Channel Divinity as a bonus action to regain one expended spell slot of up to level ${maxHarnessSlotLvl}.`
    });
  }

  const subOptions = Array.from(subOptionsMap.values());
  if (subOptions.length === 0) return;

  // 3. Remove all individual/duplicate Channel Divinity entries from actions, bonusActions, and special
  const stripCdDuplicates = (arr: HudActionItem[]) => {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (isChannelDivinityRelatedAction(arr[i].name)) {
        arr.splice(i, 1);
      }
    }
  };
  stripCdDuplicates(lists.actions);
  stripCdDuplicates(lists.bonusActions);
  stripCdDuplicates(lists.special);

  const optionLabels = subOptions
    .map((o) => o.name.replace(/^Channel Divinity:\s*/i, '').replace(/\s*\([^)]*\)/g, '').trim())
    .join(' • ');

  const unifiedCdHub: HudActionItem = {
    id: 'hub-channel-divinity',
    name: 'Channel Divinity',
    category: 'actions',
    type: 'action',
    subCategory: 'class',
    sourceLabel: `Channel Divinity (${subOptions.length} Options)`,
    castingTime: 'Choose Effect',
    rangeFt: 30,
    uses: cdUses,
    isChannelDivinityHub: true,
    subOptions,
    notes: optionLabels,
    description: `Channel divine energy from your deity to fuel magical effects (${cdUses.available}/${cdUses.total} uses per Short or Long Rest). Click to choose: ${optionLabels}.`,
    jb2aAssetId: 'holy_aura'
  };

  // Insert unified Channel Divinity card at the top of Actions (right after weapon attacks) and in Special
  const firstNonWeaponIdx = lists.actions.findIndex((a) => a.subCategory !== 'weapon' && a.subCategory !== 'unarmed');
  if (firstNonWeaponIdx >= 0) {
    lists.actions.splice(firstNonWeaponIdx, 0, unifiedCdHub);
  } else {
    lists.actions.push(unifiedCdHub);
  }

  lists.special.unshift({
    ...unifiedCdHub,
    id: 'special-hub-channel-divinity',
    category: 'special'
  });
}
