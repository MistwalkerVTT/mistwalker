export type EquipmentCategory =
  | 'Weapon'
  | 'Armor'
  | 'Shield'
  | 'Potion'
  | 'Ring'
  | 'Rod'
  | 'Scroll'
  | 'Staff'
  | 'Wand'
  | 'Wondrous Item'
  | 'Adventuring Gear'
  | 'Tool';

export type ItemRarity =
  | 'Mundane'
  | 'Common'
  | 'Uncommon'
  | 'Rare'
  | 'Very Rare'
  | 'Legendary'
  | 'Artifact'
  | 'Varies';

export interface EquipmentItem {
  id: string;
  name: string;
  category: EquipmentCategory;
  rarity?: ItemRarity;
  cost?: string; // e.g. "15 gp", "500 gp"
  weight?: string; // e.g. "3 lb.", "65 lb."
  damage?: string; // e.g. "1d8 slashing", "1d6 piercing"
  damageType?: string; // e.g. "slashing", "piercing", "bludgeoning"
  twoHandedDamage?: string; // e.g. "1d10 slashing"
  ac?: number; // e.g. 18 for full plate, 2 for shield
  acType?: string; // e.g. "Base AC 18", "+2 AC"
  stealthDisadvantage?: boolean;
  strengthRequirement?: number; // e.g. 15 for Plate
  range?: string; // e.g. "30/120 ft."
  properties?: string[]; // e.g. ["Finesse", "Light", "Thrown (20/60)"]
  requiresAttunement?: boolean;
  attunementDescription?: string;
  description: string;
  source?: string; // e.g. "SRD 5.1"
}
