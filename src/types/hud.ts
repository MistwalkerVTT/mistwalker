// src/types/hud.ts
// Strict TypeScript types for the Baldur's Gate 3-Inspired Hero Bottom HUD

export type HudActionCategory = 'actions' | 'bonus_actions' | 'spells' | 'items';

export type HudActionType = 'action' | 'bonus_action' | 'reaction' | 'item' | 'passive';

export interface HudActionItem {
  id: string;
  name: string;
  category: HudActionCategory;
  type: HudActionType;
  level?: number;             // 0 = cantrip, 1-9
  school?: string;            // evocation, abjuration, etc.
  rangeFt?: number;
  castingTime?: string;       // "1 Action", "1 Bonus Action", "1 Reaction"
  hitBonus?: string | number; // e.g. "+7"
  damageFormula?: string;     // e.g. "1d8 + 4"
  damageType?: string;        // e.g. "slashing", "fire", "radiant"
  description: string;
  jb2aAssetId?: string;       // Auto-matched asset ID (e.g. "fire_bolt", "cure_wounds")
  iconUrl?: string;
  quantity?: number;          // For consumable items / potions
  isPrepared?: boolean;
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
  actions: HudActionItem[];
  bonusActions: HudActionItem[];
  spells: HudActionItem[];
  items: HudActionItem[];
  spellSlots: Record<number, HudSpellSlot>;
  resources: Array<{
    name: string;
    total: number;
    available: number;
  }>;
  readonlyUrl: string;
  lastUpdated: number;
}
