// src/types/combatModifiers.ts
// Standardized data models for temporary stat buffs, defensive wards, and combat bonuses.

export type StatModifierType =
  | 'ac_bonus'             // e.g. Shield (+5), Shield of Faith (+2), Haste (+2)
  | 'ac_minimum'           // e.g. Barkskin (16)
  | 'speed_bonus'          // e.g. Longstrider (+10)
  | 'speed_multiplier'     // e.g. Haste (2.0)
  | 'attack_roll_dice'     // e.g. Bless (+1d4), Bane (-1d4)
  | 'saving_throw_dice'    // e.g. Bless (+1d4), Resistance (+1d4)
  | 'saving_throw_bonus'   // e.g. Paladin Aura of Protection (+CHA)
  | 'damage_reduction';    // e.g. Heavy Armor Master (-3)

export type ModifierDurationType =
  | 'until_start_of_next_turn' // e.g. Shield
  | 'until_end_of_next_turn'   // e.g. Dodge action
  | 'rounds'                   // e.g. 10 rounds (1 minute)
  | 'concentration'            // e.g. Shield of Faith, Bless, Haste
  | 'permanent';

export interface CombatModifier {
  id: string;
  sourceSpellOrActionId: string;
  sourceName: string;            // e.g. "Shield", "Shield of Faith", "Haste"
  sourceCasterId: string;        // Combatant who cast/activated it
  targetCombatantId: string;     // Combatant receiving the buff/debuff
  type: StatModifierType;
  value: number;                 // Numeric bonus (+5, +2, 16)
  diceFormula?: string;          // e.g. "1d4"
  durationType: ModifierDurationType;
  remainingRounds?: number;
  appliedAtRound: number;
  appliedAtTurnIndex: number;
  badgeLabel?: string;           // Displayed in UI (e.g. "+5 AC", "+2 AC")
  badgeIcon?: string;            // e.g. "🛡️", "✨", "⚡"
  color?: string;                // e.g. "#38bdf8", "#22c55e", "#eab308"
}

export interface ComputedCombatStats {
  effectiveAc: number;
  baseAc: number;
  acBonus: number;
  effectiveSpeedFt: number;
  baseSpeedFt: number;
  attackDiceBonuses: string[];
  saveDiceBonuses: string[];
  activeModifiers: CombatModifier[];
}
