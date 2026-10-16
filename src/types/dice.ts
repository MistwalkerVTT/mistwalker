export interface DieResult {
  sides: number;
  result: number;
  type?: string; // 'd20', 'd6', etc.
}

export interface DdbDiceRollEvent {
  id?: string;
  characterId?: string;
  characterName: string;
  playerName?: string;
  avatarUrl?: string;
  action: string;
  rollType?: 'attack' | 'damage' | 'check' | 'save' | 'custom' | string;
  formula: string; // e.g. "1d20 + 7"
  diceNotation?: string; // e.g. "1d20"
  dice: DieResult[];
  modifier?: number;
  total: number;
  isCritical?: boolean;
  isFumble?: boolean;
  theme?: string; // e.g. 'gemstone', 'rock', 'wooden', 'rust', 'blueGreenMetal', 'default'
  themeColor?: string; // Hex color for default theme
  timestamp: number;
  source?: 'dndbeyond' | 'local' | 'simulation';
}

export interface DiceSkinConfig {
  id: string;
  name: string;
  theme: string;
  themeColor?: string;
  previewColor: string;
  description: string;
}

export const AVAILABLE_DICE_SKINS: DiceSkinConfig[] = [
  {
    id: 'amber_gold',
    name: 'Gilded Amber',
    theme: 'default',
    themeColor: '#d97706',
    previewColor: '#f59e0b',
    description: 'Polished gold-inlaid resin with warm amber highlights.'
  },
  {
    id: 'ruby_fire',
    name: 'Hellfire Magma',
    theme: 'rust',
    themeColor: '#dc2626',
    previewColor: '#ef4444',
    description: 'Weathered volcanic stone with glowing crimson edges.'
  },
  {
    id: 'gemstone_amethyst',
    name: 'Arcane Amethyst',
    theme: 'gemstone',
    themeColor: '#9333ea',
    previewColor: '#a855f7',
    description: 'Crystalline violet gemstone with refracted interior light.'
  },
  {
    id: 'emerald_jade',
    name: 'Ancient Jade',
    theme: 'default',
    themeColor: '#059669',
    previewColor: '#10b981',
    description: 'Deep mystical green polished jade with golden numerals.'
  },
  {
    id: 'sapphire_frost',
    name: 'Frostmaiden Ice',
    theme: 'gemstoneMarble',
    themeColor: '#0284c7',
    previewColor: '#38bdf8',
    description: 'Glacial blue crystal with frosty specular gleam.'
  },
  {
    id: 'obsidian_night',
    name: 'Shadow Obsidian',
    theme: 'default',
    themeColor: '#18181b',
    previewColor: '#27272a',
    description: 'Dark obsidian glass with silver-inlaid numerals.'
  },
  {
    id: 'carved_oak',
    name: 'Carved Hardwood',
    theme: 'wooden',
    themeColor: '#78350f',
    previewColor: '#92400e',
    description: 'Rustic carved walnut wood with engraved blackened runes.'
  },
  {
    id: 'dwarven_metal',
    name: 'Dwarven Bronze',
    theme: 'blueGreenMetal',
    themeColor: '#0d9488',
    previewColor: '#14b8a6',
    description: 'Heavy forged metal with weathered teal patina.'
  }
];
