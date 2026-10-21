// src/types/monsterHud.ts
// Strict TypeScript types for the MistWalker DM Monster Tactical HUD

export type DmMonsterActionCategory =
  | 'attacks'
  | 'actions'
  | 'bonus_actions'
  | 'spells'
  | 'reactions'
  | 'legendary'
  | 'traits';

export type MonsterActionType =
  | 'attack'
  | 'spell'
  | 'multiattack'
  | 'action'
  | 'special'
  | 'trait'
  | 'reaction'
  | 'legendary';

export interface MonsterActionItem {
  id: string;
  name: string;
  category: DmMonsterActionCategory;
  type: MonsterActionType;
  description: string;
  hitBonus?: string | number; // e.g. "+6"
  reachRange?: string;        // e.g. "reach 5 ft." or "range 60/240 ft."
  rangeFt?: number;           // numeric range in feet for map reticle
  damageFormula?: string;     // e.g. "2d8 + 4" or compound "2d6 + 3 + 1d6"
  damageType?: string;        // e.g. "slashing", "fire", "piercing"
  secondaryDamageFormula?: string;
  secondaryDamageType?: string;
  saveDc?: number;            // e.g. 14
  saveAbility?: string;       // e.g. "CON", "DEX", "WIS"
  recharge?: string;          // e.g. "5-6", "6"
  isRecharged?: boolean;      // current availability on this token instance
  legendaryCost?: number;     // action point cost (default 1)
  multiattackRoutine?: string[]; // individual parsed attack names
  level?: number;             // 0 = cantrip, 1-9 for spells
  school?: string;            // evocation, necromancy, etc.
  castingTime?: string;       // "1 Action", "1 Bonus Action", "1 Reaction"
  jb2aAssetId?: string;       // matched JB2A visual effect ID
  isSelfAction?: boolean;     // activates on monster itself without requiring map aim
  isHeal?: boolean;           // restores HP
}

export interface TokenMonsterState {
  rechargeAvailable: Record<string, boolean>; // key: action name or id -> boolean
  spellSlotsUsed: Record<number, number>;     // key: slot level -> count used
  legendaryActionsMax: number;
  legendaryActionsUsed: number;
  notes?: string;
}

export interface MonsterSpellSlotInfo {
  level: number;
  total: number;
  used: number;
  available: number;
}

export interface DmMonsterHudData {
  tokenId: string;
  monsterId?: string;
  name: string;
  originalMonsterName: string;
  avatarUrl: string;
  size: 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan' | string;
  type: string;               // e.g. "Undead", "Fiend", "Dragon"
  alignment: string;
  cr: string;                 // e.g. "5 (1,800 XP)"
  proficiencyBonus: number;
  initiativeBonus: number;

  // Vitals
  currentHp: number;
  maxHp: number;
  tempHp: number;
  ac: number;
  acNotes?: string;
  speed: string;
  passivePerception: number;

  // Ability Scores
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;

  // Defenses & Senses
  senses?: string;
  languages?: string;
  damageResistances?: string;
  damageVulnerabilities?: string;
  damageImmunities?: string;
  conditionImmunities?: string;
  savingThrows?: string;
  skills?: string;

  // Spellcasting Stats
  spellSaveDc?: number;
  spellAttackBonus?: number;
  spellcastingAbility?: string;

  // Action Categorized Lists
  attacks: MonsterActionItem[];
  actions: MonsterActionItem[];
  bonusActions: MonsterActionItem[];
  reactions: MonsterActionItem[];
  legendaryActions: MonsterActionItem[];
  traits: MonsterActionItem[];
  spells: MonsterActionItem[];

  // Resource Tracking
  spellSlots: Record<number, MonsterSpellSlotInfo>;
  state: TokenMonsterState;
  legendaryDescription?: string;
}
