export type SpellSchool =
  | 'Abjuration'
  | 'Conjuration'
  | 'Divination'
  | 'Enchantment'
  | 'Evocation'
  | 'Illusion'
  | 'Necromancy'
  | 'Transmutation';

export type DndClass =
  | 'Bard'
  | 'Cleric'
  | 'Druid'
  | 'Paladin'
  | 'Ranger'
  | 'Sorcerer'
  | 'Warlock'
  | 'Wizard';

export interface Spell {
  id: string;
  name: string;
  level: number; // 0 = Cantrip, 1-9
  school: SpellSchool;
  castingTime: string; // e.g. "1 action", "1 bonus action", "1 reaction"
  range: string; // e.g. "Self", "Touch", "60 feet", "120 feet"
  area?: string; // e.g. "20-foot radius sphere", "15-foot cone"
  components: {
    verbal?: boolean;
    somatic?: boolean;
    material?: boolean;
    materialsDescription?: string;
  };
  duration: string; // e.g. "Instantaneous", "1 hour", "Concentration, up to 1 minute"
  concentration: boolean;
  ritual: boolean;
  classes: DndClass[];
  description: string;
  higherLevels?: string;
  damageDice?: string; // e.g. "8d6", "1d10", "3d8"
  damageType?: string; // e.g. "fire", "force", "radiant", "necrotic", "lightning", "cold", "healing"
  saveType?: 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';
  attackType?: 'melee' | 'ranged';
  source?: string; // e.g. "SRD 5.1"
  effectId?: string; // links to ProceduralSpellEffect (e.g. "fireball", "eldritch_blast")
}
