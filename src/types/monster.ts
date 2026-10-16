import { WallSegment, VisionConfig, RoomAnnotation } from '../types';

export interface MonsterTrait {
  name: string;
  description: string;
}

export interface MonsterAction {
  name: string;
  type?: 'attack' | 'spell' | 'multiattack' | 'special';
  description: string;
  attackBonus?: number;
  damage?: string;
  reachRange?: string;
}

export interface MonsterSpellcasting {
  ability?: string;
  dc?: number;
  attackBonus?: number;
  spells: Array<{
    frequency: string; // e.g. "At will", "2/day each", "1st level (4 slots)"
    list: string[];
  }>;
}

export interface Monster {
  monsterId: string;
  name: string;
  size: 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan';
  type: string; // e.g. "Fey", "Undead", "Monstrosity", "Humanoid"
  alignment: string; // e.g. "Typically Chaotic Evil", "Neutral Evil"
  ac: number;
  acNotes?: string; // e.g. "(natural armor)"
  hp: number;
  hpFormula?: string; // e.g. "(22d8 + 88)"
  speed: string; // e.g. "30 ft., fly 60 ft."
  initiativeBonus: number;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  savingThrows?: string; // e.g. "CON +9, CHA +9"
  skills?: string; // e.g. "Perception +8, Stealth +8"
  damageResistances?: string;
  damageVulnerabilities?: string;
  damageImmunities?: string;
  conditionImmunities?: string;
  senses?: string; // e.g. "Darkvision 60 ft., Passive Perception 18"
  languages?: string; // e.g. "Elvish, Sylvan"
  challenge: string; // e.g. "13 (10,000 XP)"
  proficiencyBonus: number;
  avatarUrl?: string; // Portrait/token image
  statblockImageUrl?: string; // Raw screenshot uploaded
  traits?: MonsterTrait[];
  actions?: MonsterAction[];
  bonusActions?: MonsterAction[];
  reactions?: MonsterAction[];
  legendaryActions?: MonsterAction[];
  legendaryDescription?: string;
  source?: string;
  createdAt?: number;
  updatedAt?: number;
}

export const getSizeMultiplier = (sizeStr?: string): number => {
  if (!sizeStr) return 1;
  const s = sizeStr.toLowerCase();
  if (s.includes('tiny') || s.includes('small') || s.includes('medium')) return 1;
  if (s.includes('large')) return 2;
  if (s.includes('huge')) return 3;
  if (s.includes('gargantuan')) return 4;
  return 1;
};
