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

export interface HudActionItem {
  id: string;
  name: string;
  category: HudActionCategory;
  type: HudActionType;
  subCategory?: HudActionSubCategory;
  level?: number;             // 0 = cantrip, 1-9
  school?: string;            // evocation, abjuration, etc.
  rangeFt?: number;
  castingTime?: string;       // "1 Action", "1 Bonus Action", "1 Reaction"
  hitBonus?: string | number; // e.g. "+9"
  saveDc?: number;            // e.g. 15
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
