import { Monster } from '../types/monster';
import { SRD_MONSTERS } from './srdMonstersCatalog';

export const DEFAULT_MONSTERS: Monster[] = [
  {
    monsterId: 'monster_deadbark_dryad',
    name: 'Deadbark Dryad',
    size: 'Medium',
    type: 'Fey',
    alignment: 'Typically Chaotic Evil',
    ac: 16,
    acNotes: '(natural armor)',
    hp: 187,
    hpFormula: '(22d8 + 88)',
    speed: '30 ft.',
    initiativeBonus: 3,
    str: 17,
    dex: 16,
    con: 18,
    int: 11,
    wis: 16,
    cha: 18,
    savingThrows: 'CON +9, CHA +9',
    skills: 'Perception +8, Stealth +8',
    damageResistances: 'Bludgeoning, Piercing, and Slashing from Nonmagical Attacks',
    damageImmunities: 'Poison',
    conditionImmunities: 'Poisoned',
    senses: 'Darkvision 60 ft., Passive Perception 18',
    languages: 'Elvish, Sylvan',
    challenge: '13 (10,000 XP)',
    proficiencyBonus: 5,
    avatarUrl: '/uploads/file-1790541905194-354381266.png',
    traits: [
      {
        name: 'Bramble Walk',
        description: 'Difficult terrain composed of vegetation, such as foliage or thorns, doesn\'t cost the dryad extra movement.'
      },
      {
        name: 'Magic Resistance',
        description: 'The dryad has advantage on saving throws against spells and other magical effects.'
      },
      {
        name: 'Speak with Beasts and Plants',
        description: 'The dryad can communicate with Beasts and Plants as if they shared a language.'
      }
    ],
    actions: [
      {
        name: 'Multiattack',
        type: 'multiattack',
        description: 'The dryad makes two Poisonous Thorn attacks and one Sapping Vine attack.'
      },
      {
        name: 'Poisonous Thorn',
        type: 'attack',
        attackBonus: 8,
        reachRange: 'reach 5 ft. or range 120 ft.',
        damage: '13 (4d4 + 3) piercing damage plus 10 (3d6) poison damage',
        description: 'Melee or Ranged Weapon Attack: +8 to hit, reach 5 ft. or range 120 ft., one target. Hit: 13 (4d4 + 3) piercing damage plus 10 (3d6) poison damage. If the target is a creature, it must succeed on a DC 17 Constitution saving throw or have the poisoned condition until the start of the dryad\'s next turn.'
      },
      {
        name: 'Sapping Vine',
        type: 'attack',
        attackBonus: 8,
        reachRange: 'reach 30 ft.',
        damage: '13 (3d8) necrotic damage',
        description: 'Melee Weapon Attack: +8 to hit, reach 30 ft., one target. Hit: The target has the grappled condition (escape DC 16). Until the grapple ends, the target has the restrained condition, and the dryad can\'t use the same vine on another target. A creature restrained in this way takes 13 (3d8) necrotic damage at the start of its turn.'
      },
      {
        name: 'Spellcasting',
        type: 'spell',
        description: 'The dryad casts one of the following spells, requiring no material components and using Charisma as the spellcasting ability (spell save DC 17):\nAt will: Druidcraft\n2/day each: Pass without Trace, Spike Growth\n1/day: Dispel Magic'
      }
    ],
    source: 'SRD / Beyond 20',
    createdAt: Date.now()
  },
  {
    monsterId: 'monster_archmage',
    name: 'Archmage',
    size: 'Medium',
    type: 'Humanoid (Any Race)',
    alignment: 'Any Alignment',
    ac: 12,
    acNotes: '(15 with mage armor)',
    hp: 99,
    hpFormula: '(18d8 + 18)',
    speed: '30 ft.',
    initiativeBonus: 2,
    str: 10,
    dex: 14,
    con: 12,
    int: 20,
    wis: 15,
    cha: 16,
    savingThrows: 'INT +9, WIS +6',
    skills: 'Arcana +13, History +13',
    damageResistances: 'Damage from Spells; Nonmagical Bludgeoning, Piercing, and Slashing (from Stoneskin)',
    senses: 'Passive Perception 12',
    languages: 'Any six languages',
    challenge: '12 (8,400 XP)',
    proficiencyBonus: 4,
    avatarUrl: '/uploads/file-1791551658246-239043471.jfif',
    traits: [
      {
        name: 'Magic Resistance',
        description: 'The archmage has advantage on saving throws against spells and other magical effects.'
      },
      {
        name: 'Spellcasting',
        description: 'The archmage is an 18th-level spellcaster. Its spellcasting ability is Intelligence (spell save DC 17, +9 to hit with spell attacks). The archmage can cast disguise self and invisibility at will and has wizard spells prepared:\n\nCantrips: fire bolt, light, mage hand, prestidigitation, shocking grasp\n1st level (4 slots): detect magic, identify, mage armor*, magic missile\n2nd level (3 slots): detect thoughts, mirror image, misty step\n3rd level (3 slots): counterspell, fly, lightning bolt\n4th level (3 slots): banishment, fire shield, stoneskin*\n5th level (3 slots): cone of cold, scrying, wall of force\n6th level (1 slot): globe of invulnerability\n7th level (1 slot): teleport\n8th level (1 slot): mind blank*\n9th level (1 slot): time stop\n*Casts these spells before combat.'
      }
    ],
    actions: [
      {
        name: 'Dagger',
        type: 'attack',
        attackBonus: 6,
        reachRange: 'reach 5 ft. or range 20/60 ft.',
        damage: '4 (1d4 + 2) piercing damage',
        description: 'Melee or Ranged Weapon Attack: +6 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 4 (1d4 + 2) piercing damage.'
      }
    ],
    source: 'SRD 5.1',
    createdAt: Date.now() - 1000
  },
  {
    monsterId: 'monster_young_red_dragon',
    name: 'Young Red Dragon',
    size: 'Large',
    type: 'Dragon',
    alignment: 'Chaotic Evil',
    ac: 18,
    acNotes: '(natural armor)',
    hp: 178,
    hpFormula: '(17d10 + 85)',
    speed: '40 ft., climb 40 ft., fly 80 ft.',
    initiativeBonus: 0,
    str: 23,
    dex: 10,
    con: 21,
    int: 14,
    wis: 11,
    cha: 19,
    savingThrows: 'DEX +4, CON +9, WIS +4, CHA +8',
    skills: 'Perception +8, Stealth +4',
    damageImmunities: 'Fire',
    senses: 'Blindsight 30 ft., Darkvision 120 ft., Passive Perception 18',
    languages: 'Common, Draconic',
    challenge: '10 (5,900 XP)',
    proficiencyBonus: 4,
    avatarUrl: '/uploads/file-1792077376704-355788772.png',
    traits: [],
    actions: [
      {
        name: 'Multiattack',
        type: 'multiattack',
        description: 'The dragon makes three attacks: one with its bite and two with its claws.'
      },
      {
        name: 'Bite',
        type: 'attack',
        attackBonus: 10,
        reachRange: 'reach 10 ft.',
        damage: '17 (2d10 + 6) piercing plus 3 (1d6) fire damage',
        description: 'Melee Weapon Attack: +10 to hit, reach 10 ft., one target. Hit: 17 (2d10 + 6) piercing damage plus 3 (1d6) fire damage.'
      },
      {
        name: 'Fire Breath (Recharge 5-6)',
        type: 'special',
        damage: '56 (16d6) fire damage',
        description: 'The dragon exhales fire in a 30-foot cone. Each creature in that area must make a DC 17 Dexterity saving throw, taking 56 (16d6) fire damage on a failed save, or half as much damage on a successful one.'
      }
    ],
    source: 'SRD 5.1',
    createdAt: Date.now() - 2000
  },
  {
    monsterId: 'monster_rosintar',
    name: 'Rosintar',
    size: 'Large',
    type: 'Monstrosity',
    alignment: 'Typically Neutral Evil',
    ac: 16,
    acNotes: '(natural armor)',
    hp: 142,
    hpFormula: '(15d10 + 60)',
    speed: '40 ft., climb 30 ft.',
    initiativeBonus: 2,
    str: 20,
    dex: 14,
    con: 18,
    int: 12,
    wis: 14,
    cha: 11,
    savingThrows: 'STR +8, CON +7',
    skills: 'Athletics +8, Perception +5, Survival +5',
    damageResistances: 'Acid; Bludgeoning, Piercing, and Slashing from Nonmagical Attacks',
    conditionImmunities: 'Charmed, Restrained',
    senses: 'Darkvision 60 ft., Passive Perception 15',
    languages: 'Undercommon, Sylvan, understands Common',
    challenge: '8 (3,900 XP)',
    proficiencyBonus: 3,
    avatarUrl: '/uploads/file-1790707157004-503180183.jfif',
    traits: [
      {
        name: 'Adhesive Rosin Hide',
        description: 'Any creature that touches Rosintar or hits it with a melee attack while within 5 feet of it must succeed on a DC 15 Dexterity saving throw or become adhered to its resinous coat, becoming grappled (escape DC 15).'
      },
      {
        name: 'Relentless Tracker',
        description: 'Rosintar has advantage on Wisdom (Survival) checks to track creatures and cannot be surprised while conscious.'
      },
      {
        name: 'Trampling Charge',
        description: 'If Rosintar moves at least 20 feet straight toward a target and then hits it with a Gore or Slam attack on the same turn, the target must succeed on a DC 16 Strength saving throw or be knocked prone.'
      }
    ],
    actions: [
      {
        name: 'Multiattack',
        type: 'multiattack',
        description: 'Rosintar makes two attacks: one with its Gore and one with its Rosin Slam.'
      },
      {
        name: 'Gore',
        type: 'attack',
        attackBonus: 8,
        reachRange: 'reach 5 ft.',
        damage: '18 (2d12 + 5) piercing damage',
        description: 'Melee Weapon Attack: +8 to hit, reach 5 ft., one target. Hit: 18 (2d12 + 5) piercing damage.'
      },
      {
        name: 'Rosin Slam',
        type: 'attack',
        attackBonus: 8,
        reachRange: 'reach 10 ft.',
        damage: '16 (2d10 + 5) bludgeoning damage plus 7 (2d6) acid damage',
        description: 'Melee Weapon Attack: +8 to hit, reach 10 ft., one target. Hit: 16 (2d10 + 5) bludgeoning damage plus 7 (2d6) acid damage, and the target\'s movement speed is reduced by 10 feet until the start of Rosintar\'s next turn.'
      },
      {
        name: 'Tar Spit (Recharge 5-6)',
        type: 'special',
        damage: '21 (6d6) acid or fire damage',
        description: 'Rosintar spits a glob of sticky, boiling black resin at a point up to 60 feet away, bursting in a 15-foot radius. Each creature in that area must make a DC 15 Dexterity saving throw. On a failed save, a creature takes 21 (6d6) acid or fire damage and is restrained by adhesive tar for 1 minute. On a successful save, it takes half damage and is not restrained.'
      }
    ],
    source: 'Monster Manual / Compendium',
    createdAt: Date.now()
  },
  {
    monsterId: 'monster_will_o_wisp',
    name: "Will-o'-Wisp",
    size: 'Tiny',
    type: 'Undead',
    alignment: 'Chaotic Evil',
    ac: 19,
    hp: 22,
    hpFormula: '(9d4)',
    speed: '0 ft., fly 50 ft. (hover)',
    initiativeBonus: 9,
    str: 1,
    dex: 28,
    con: 10,
    int: 13,
    wis: 14,
    cha: 11,
    damageResistances: 'Acid, Cold, Fire, Necrotic, Thunder; Bludgeoning, Piercing, and Slashing from Nonmagical Attacks',
    damageImmunities: 'Lightning, Poison',
    conditionImmunities: 'Exhaustion, Grappled, Paralyzed, Poisoned, Prone, Restrained, Unconscious',
    senses: 'Darkvision 120 ft., Passive Perception 12',
    languages: 'The languages it knew in life (Common, Sylvan in T9)',
    challenge: '2 (450 XP)',
    proficiencyBonus: 2,
    avatarUrl: '/assets/tokens/vecna/will_o_wisp.jpg',
    traits: [
      {
        name: 'Consume Life',
        description: 'As a bonus action, the will-o\'-wisp can target one creature it can see within 5 feet of it that has 0 hit points and is still alive. The target must succeed on a DC 10 Constitution saving throw against this magic or die. If the target dies, the will-o\'-wisp regains 10 (3d6) hit points.'
      },
      {
        name: 'Ephemeral',
        description: 'The will-o\'-wisp can\'t wear or carry anything.'
      },
      {
        name: 'Incorporeal Movement',
        description: 'The will-o\'-wisp can move through other creatures and objects as if they were difficult terrain. It takes 5 (1d10) force damage if it ends its turn inside an object.'
      },
      {
        name: 'Variable Illumination',
        description: 'The will-o\'-wisp sheds bright light in a 5- to 20-foot radius and dim light for an additional number of feet equal to the chosen radius. The will-o\'-wisp can alter the radius as a bonus action.'
      }
    ],
    actions: [
      {
        name: 'Shock',
        type: 'attack',
        attackBonus: 4,
        reachRange: 'reach 5 ft.',
        damage: '9 (2d8) lightning damage',
        description: 'Melee Spell Attack: +4 to hit, reach 5 ft., one creature. Hit: 9 (2d8) lightning damage.'
      },
      {
        name: 'Invisibility',
        type: 'special',
        description: 'The will-o\'-wisp and its light magically become invisible until it attacks or uses its Consume Life, or until its concentration ends (as if concentrating on a spell).'
      }
    ],
    source: 'SRD / Vecna: Eve of Ruin Ch. 7',
    createdAt: Date.now()
  },
  ...SRD_MONSTERS
];

let defaultMonstersByNameCache: Map<string, Monster> | null = null;
let extendedMonstersPromise: Promise<Monster[]> | null = null;
let extendedMonstersLoaded = false;
const extendedMonstersListeners = new Set<() => void>();

/**
 * O(1) case-insensitive lookup against DEFAULT_MONSTERS (including SRD & DDB catalogs).
 */
export function findDefaultMonsterByName(name?: string | null): Monster | undefined {
  const key = (name || '').trim().toLowerCase();
  if (!key) return undefined;
  if (!defaultMonstersByNameCache) {
    defaultMonstersByNameCache = new Map<string, Monster>();
    for (const m of DEFAULT_MONSTERS) {
      const mKey = (m.name || '').trim().toLowerCase();
      if (mKey && !defaultMonstersByNameCache.has(mKey)) {
        defaultMonstersByNameCache.set(mKey, m);
      }
    }
  }
  return defaultMonstersByNameCache.get(key);
}

export function areExtendedMonstersLoaded(): boolean {
  return extendedMonstersLoaded;
}

export function subscribeExtendedMonstersLoaded(listener: () => void): () => void {
  extendedMonstersListeners.add(listener);
  return () => {
    extendedMonstersListeners.delete(listener);
  };
}

/**
 * Lazily fetches the D&D Beyond monster catalog from /data/dndbeyond-monsters.json,
 * merges it into DEFAULT_MONSTERS + the O(1) lookup cache, and notifies subscribers.
 */
export function loadExtendedMonsters(): Promise<Monster[]> {
  if (extendedMonstersLoaded) {
    return Promise.resolve(DEFAULT_MONSTERS);
  }
  if (extendedMonstersPromise) {
    return extendedMonstersPromise;
  }
  if (typeof window === 'undefined' || typeof fetch !== 'function') {
    return Promise.resolve(DEFAULT_MONSTERS);
  }

  extendedMonstersPromise = fetch('/data/dndbeyond-monsters.json')
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ddbMonsters: Monster[] = await res.json();
      if (Array.isArray(ddbMonsters) && ddbMonsters.length > 0) {
        const existingIds = new Set(DEFAULT_MONSTERS.map(m => m.monsterId).filter(Boolean));
        const existingNames = new Set(DEFAULT_MONSTERS.map(m => (m.name || '').trim().toLowerCase()).filter(Boolean));
        for (const m of ddbMonsters) {
          const nameKey = (m.name || '').trim().toLowerCase();
          if (m.monsterId && existingIds.has(m.monsterId)) continue;
          if (nameKey && existingNames.has(nameKey)) continue;
          if (m.monsterId) existingIds.add(m.monsterId);
          if (nameKey) existingNames.add(nameKey);
          DEFAULT_MONSTERS.push(m);
          if (defaultMonstersByNameCache && nameKey && !defaultMonstersByNameCache.has(nameKey)) {
            defaultMonstersByNameCache.set(nameKey, m);
          }
        }
      }
      extendedMonstersLoaded = true;
      extendedMonstersListeners.forEach(fn => {
        try { fn(); } catch {}
      });
      return DEFAULT_MONSTERS;
    })
    .catch((err) => {
      console.warn('[DefaultMonsters] Failed to lazy-load extended DDB catalog:', err);
      extendedMonstersPromise = null;
      return DEFAULT_MONSTERS;
    });

  return extendedMonstersPromise;
}
