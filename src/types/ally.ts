export interface AllyTrait {
  name: string;
  description: string;
}

export interface AllyAction {
  name: string;
  type?: 'attack' | 'spell' | 'multiattack' | 'special';
  description: string;
  attackBonus?: number;
  damage?: string;
  reachRange?: string;
}

export interface Ally {
  allyId: string;
  name: string;
  size: 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan';
  type: string; // e.g. "Beast", "Fey", "Elemental", "Construct", "Celestial", "Fiend", "Undead"
  summonSource: string; // e.g. "Druid (Conjure Animals)", "Druid (Summon Beast)", "Find Familiar", "Cleric (Spiritual Weapon)", etc.
  alignment: string;
  ac: number;
  acNotes?: string;
  hp: number;
  hpFormula?: string;
  speed: string;
  initiativeBonus: number;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  savingThrows?: string;
  skills?: string;
  damageResistances?: string;
  damageVulnerabilities?: string;
  damageImmunities?: string;
  conditionImmunities?: string;
  senses?: string;
  languages?: string;
  challenge: string;
  proficiencyBonus: number;
  avatarUrl: string;
  statblockImageUrl?: string;
  traits?: AllyTrait[];
  actions?: AllyAction[];
  bonusActions?: AllyAction[];
  reactions?: AllyAction[];
  description?: string;
  source?: string;
  category: 'ally';
  isPlayer?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export const getSizeMultiplier = (size?: string): number => {
  switch (size?.toLowerCase()) {
    case 'tiny': return 0.5;
    case 'small': return 0.8;
    case 'medium': return 1;
    case 'large': return 2;
    case 'huge': return 3;
    case 'gargantuan': return 4;
    default: return 1;
  }
};
