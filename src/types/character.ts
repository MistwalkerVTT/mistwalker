export interface CharacterAction {
  name: string;
  type?: string;
  hitBonus?: string | number;
  damage?: string;
  notes?: string;
  description?: string;
}

export interface CharacterBonusAction {
  name: string;
  source?: string;
  description: string;
}

export interface CharacterReaction {
  name: string;
  description: string;
}

export interface CharacterSpecialFeature {
  category?: string;
  name: string;
  description: string;
  source?: string;
}

export interface CharacterSkill {
  name: string;
  bonus: string | number;
  proficient?: boolean;
}

export interface CharacterEquipmentItem {
  name: string;
  quantity?: number;
  weight?: string;
  isAttuned?: boolean;
  notes?: string;
}

export interface CharacterSpellItem {
  level?: number;
  name: string;
  school?: string;
  castingTime?: string;
  range?: string;
  components?: string;
  duration?: string;
  damage?: string;
  notes?: string;
  prepared?: boolean;
}

export interface Character {
  id: string;
  ddbCharacterId?: string | number;
  ddbCampaignId?: string;
  ddbCampaignTitle?: string;
  playerName?: string;
  name: string;
  race: string;
  classLevel: string; // e.g. "Barbarian 6"
  background?: string;
  alignment: string;
  avatarUrl: string;
  pdfUrl?: string;
  pdfName?: string;
  ac: number;
  hp: number;
  maxHp: number;
  tempHp?: number;
  hitDice?: string;
  speed: string;
  initiativeBonus?: number;
  proficiencyBonus?: number;
  passivePerception?: number;
  passiveInsight?: number;
  passiveInvestigation?: number;
  stats: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  savingThrows?: Record<string, string | number>;
  savingThrowModifiers?: string;
  skillsList?: CharacterSkill[];
  defenses?: {
    resistances?: string[];
    immunities?: string[];
    vulnerabilities?: string[];
    conditionImmunities?: string[];
  };
  proficiencies?: {
    armor?: string[];
    weapons?: string[];
    tools?: string[];
    languages?: string[];
  };
  actions?: CharacterAction[];
  bonusActions?: CharacterBonusAction[];
  reactions?: CharacterReaction[];
  specialFeatures?: CharacterSpecialFeature[];
  equipment?: CharacterEquipmentItem[];
  currency?: {
    cp?: number;
    sp?: number;
    ep?: number;
    gp?: number;
    pp?: number;
  };
  roleplay?: {
    gender?: string;
    age?: string | number;
    size?: string;
    height?: string;
    weight?: string;
    faith?: string;
    skin?: string;
    eyes?: string;
    hair?: string;
    personalityTraits?: string;
    ideals?: string;
    bonds?: string;
    flaws?: string;
    appearance?: string;
    backstory?: string;
    allies?: string;
  };
  spellcasting?: {
    spellcastingClass?: string;
    spellcastingAbility?: string;
    spellSaveDc?: number;
    spellAttackBonus?: number;
    slots?: Record<number, { total: number; used?: number }>;
    spellsList?: CharacterSpellItem[];
  };
  features: string[];
  spells: string[];
  notes: string;
  createdAt?: number;
  updatedAt?: number;
}
