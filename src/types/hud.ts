// src/types/hud.ts
// Strict TypeScript types for the MistWalker D&D Beyond Tactical Character HUD

export type HudActionCategory = 'attacks' | 'actions' | 'bonus_actions' | 'spells' | 'reactions' | 'items';

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
  damageType?: string;        // e.g. "slashing", "fire", "radiant"
  description: string;
  notes?: string;             // Weapon properties / mastery notes
  sourceLabel?: string;       // e.g. "Barbarian", "Goliath", "Equipped Weapon"
  jb2aAssetId?: string;       // Auto-matched asset ID (e.g. "fire_bolt", "cure_wounds")
  iconUrl?: string;
  quantity?: number;          // For consumable items / potions / thrown weapons
  uses?: HudActionUses;       // Limited use counter from D&D Beyond
  isPrepared?: boolean;
  isEquipped?: boolean;
  isAttack?: boolean;
  isSelfAction?: boolean;     // True if action targets self or activates immediately (e.g. Rage, Dodge, Dash)
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
    } else if (lower.includes('cure wounds') || lower.includes('inflict wounds') || lower.includes('chromatic orb') || lower.includes('guiding bolt') || lower.includes('shatter') || lower.includes('thunderwave') || lower.includes('blight') || lower.includes('cone of cold') || lower.includes('spirit guardians') || lower.includes('moonbeam') || lower.includes('witch bolt')) {
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
        addCount = 1;
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
    const match = baseFormula.match(/^(\d+)d(\d+)(\s*[+-]\s*\d+)?(.*)$/i);
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
