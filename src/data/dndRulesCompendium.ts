// src/data/dndRulesCompendium.ts
// Comprehensive 5e Reference for Spells, Conditions, and Magical Auras
// Used for in-game inspection when right-clicking spells, conditions, or auras.

export interface DndRuleEntry {
  name: string;
  category: 'spell' | 'condition' | 'aura';
  subtitle?: string;
  level?: number;
  castAtLevel?: number;
  school?: string;
  castingTime?: string;
  range?: string;
  components?: string;
  duration?: string;
  damageFormula?: string;
  damageType?: string;
  saveDc?: number | string;
  saveAbility?: string;
  isHeal?: boolean;
  description: string;
  higherLevels?: string;
}

export const DND_CONDITION_DESCRIPTIONS: Record<string, { subtitle: string; description: string }> = {
  Blinded: {
    subtitle: 'Condition • Impaired Sight',
    description: '• A blinded creature can\'t see and automatically fails any ability check that requires sight.\n• Attack rolls against the creature have advantage, and the creature\'s attack rolls have disadvantage.'
  },
  Charmed: {
    subtitle: 'Condition • Enchantment',
    description: '• A charmed creature can\'t attack the charmer or target the charmer with harmful abilities or magical effects.\n• The charmer has advantage on any ability check to interact socially with the creature.'
  },
  Deafened: {
    subtitle: 'Condition • Impaired Hearing',
    description: '• A deafened creature can\'t hear and automatically fails any ability check that requires hearing.'
  },
  Exhaustion: {
    subtitle: 'Condition • Physical & Mental Fatigue',
    description: 'Exhaustion is measured in 6 levels:\n• Level 1: Disadvantage on ability checks\n• Level 2: Speed halved\n• Level 3: Disadvantage on attack rolls and saving throws\n• Level 4: Hit point maximum halved\n• Level 5: Speed reduced to 0\n• Level 6: Death\nFinishing a long rest reduces a creature\'s exhaustion level by 1, provided the creature also has eaten and drank.'
  },
  Frightened: {
    subtitle: 'Condition • Terror',
    description: '• A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight.\n• The creature can\'t willingly move closer to the source of its fear.'
  },
  Grappled: {
    subtitle: 'Condition • Physical Restraint',
    description: '• A grappled creature\'s speed becomes 0, and it can\'t benefit from any bonus to its speed.\n• The condition ends if the grappler is incapacitated.\n• The condition also ends if an effect removes the grappled creature from the reach of the grappler or grappling effect (such as Thunderwave).'
  },
  Incapacitated: {
    subtitle: 'Condition • Severe Impairment',
    description: '• An incapacitated creature can\'t take actions or reactions.'
  },
  Invisible: {
    subtitle: 'Condition • Unseen',
    description: '• An invisible creature is impossible to see without the aid of magic or a special sense. With respect to hiding, the creature is heavily obscured.\n• Attack rolls against the creature have disadvantage, and the creature\'s attack rolls have advantage.'
  },
  Paralyzed: {
    subtitle: 'Condition • Total Paralysis',
    description: '• A paralyzed creature is incapacitated and can\'t move or speak.\n• The creature automatically fails Strength and Dexterity saving throws.\n• Attack rolls against the creature have advantage.\n• Any attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature.'
  },
  Petrified: {
    subtitle: 'Condition • Turned to Stone',
    description: '• A petrified creature is transformed, along with any nonmagical object it is wearing or carrying, into a solid inanimate substance (usually stone). Its weight increases by a factor of ten, and it ceases aging.\n• The creature is incapacitated, can\'t move or speak, and is unaware of its surroundings.\n• Attack rolls against the creature have advantage.\n• The creature automatically fails Strength and Dexterity saving throws.\n• The creature has resistance to all damage and immunity to poison and disease.'
  },
  Poisoned: {
    subtitle: 'Condition • Toxic Affliction',
    description: '• A poisoned creature has disadvantage on attack rolls and ability checks.'
  },
  Prone: {
    subtitle: 'Condition • Knocked Down',
    description: '• A prone creature\'s only movement option is to crawl, unless it stands up and thereby ends the condition (costs half of its movement speed).\n• The creature has disadvantage on attack rolls.\n• An attack roll against the creature has advantage if the attacker is within 5 feet of the creature. Otherwise, the attack roll has disadvantage.'
  },
  Restrained: {
    subtitle: 'Condition • Bound',
    description: '• A restrained creature\'s speed becomes 0, and it can\'t benefit from any bonus to its speed.\n• Attack rolls against the creature have advantage, and the creature\'s attack rolls have disadvantage.\n• The creature has disadvantage on Dexterity saving throws.'
  },
  Stunned: {
    subtitle: 'Condition • Dazed & Helpless',
    description: '• A stunned creature is incapacitated, can\'t move, and can speak only falteringly.\n• The creature automatically fails Strength and Dexterity saving throws.\n• Attack rolls against the creature have advantage.'
  },
  Unconscious: {
    subtitle: 'Condition • Knocked Out',
    description: '• An unconscious creature is incapacitated, can\'t move or speak, and is unaware of its surroundings.\n• The creature drops whatever it\'s holding and falls prone.\n• The creature automatically fails Strength and Dexterity saving throws.\n• Attack rolls against the creature have advantage.\n• Any attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature.'
  },
  Bloodied: {
    subtitle: 'Status • Below 50% HP',
    description: '• The creature has dropped to or below half of its maximum hit points (50% HP or less).\n• Many monster abilities, rage triggers, or companion features activate while bloodied.'
  }
};

export const DND_AURA_DESCRIPTIONS: Record<
  string,
  {
    subtitle: string;
    radiusFt: number;
    level?: number;
    school?: string;
    castingTime?: string;
    components?: string;
    duration?: string;
    damageFormula?: string;
    damageType?: string;
    saveAbility?: string;
    isHeal?: boolean;
    description: string;
    higherLevels?: string;
  }
> = {
  'Spirit Guardians': {
    subtitle: '3rd-Level Conjuration Aura',
    radiusFt: 15,
    level: 3,
    school: 'Conjuration',
    castingTime: '1 Action',
    components: 'V, S, M (a holy symbol)',
    duration: 'Concentration, up to 10 minutes',
    damageFormula: '3d8',
    damageType: 'radiant',
    saveAbility: 'WIS',
    description: 'Protective spirits flit around you in a 15-foot Emanation for the duration. If you are good or neutral, their spectral form appears angelic or fey (your choice). If you are evil, they appear fiendish. When you cast this spell, you can designate creatures to be unaffected by it. Any other creature\'s Speed is halved in the Emanation, and whenever the Emanation enters a creature\'s space and whenever a creature enters the Emanation or ends its turn there, the creature must make a Wisdom saving throw. On a failed save, the creature takes 3d8 Radiant damage (if you are good or neutral) or 3d8 Necrotic damage (if you are evil). On a successful save, the creature takes half as much damage. A creature makes this save only once per turn.',
    higherLevels: 'When you cast this spell using a spell slot of 4th level or higher, the damage increases by 1d8 for each slot level above 3rd.'
  },
  'Aura of Vitality': {
    subtitle: '3rd-Level Evocation Aura',
    radiusFt: 30,
    level: 3,
    school: 'Evocation',
    castingTime: '1 Action',
    components: 'V',
    duration: 'Concentration, up to 1 minute',
    damageFormula: '2d6',
    damageType: 'healing',
    isHeal: true,
    description: 'Healing energy radiates from you in an aura with a 30-foot radius. Until the spell ends, the aura moves with you, centered on you. You can use a bonus action to cause one creature in the aura (including you) to regain 2d6 hit points.'
  },
  'Aura of Life': {
    subtitle: '4th-Level Abjuration Aura',
    radiusFt: 30,
    level: 4,
    school: 'Abjuration',
    castingTime: '1 Action',
    components: 'V',
    duration: 'Concentration, up to 10 minutes',
    description: 'Life-preserving energy radiates from you in an aura with a 30-foot radius. Until the spell ends, the aura moves with you, centered on you. Each nonhostile creature in the aura (including you) has resistance to necrotic damage, and its hit point maximum can\'t be reduced. In addition, a nonhostile, living creature regains 1 hit point when it starts its turn in the aura with 0 hit points.'
  },
  'Paladin Aura of Protection': {
    subtitle: 'Class Feature • 10-ft Aura',
    radiusFt: 10,
    description: 'Whenever you or a friendly creature within 10 feet of you must make a saving throw, the creature gains a bonus to the saving throw equal to your Charisma modifier (with a minimum bonus of +1). You must be conscious to grant this bonus.'
  },
  'Aura of Protection': {
    subtitle: 'Class Feature • 10-ft Aura',
    radiusFt: 10,
    description: 'Whenever you or a friendly creature within 10 feet of you must make a saving throw, the creature gains a bonus to the saving throw equal to your Charisma modifier (with a minimum bonus of +1). You must be conscious to grant this bonus.'
  },
  'Aura of Courage': {
    subtitle: 'Class Feature • 10-ft Aura',
    radiusFt: 10,
    description: 'You and friendly creatures within 10 feet of you can\'t be frightened while you are conscious.'
  },
  'Aura of Devotion': {
    subtitle: 'Sacred Oath Feature • 10-ft Aura',
    radiusFt: 10,
    description: 'You and friendly creatures within 10 feet of you can\'t be charmed while you are conscious.'
  },
  'Aura of Warding': {
    subtitle: 'Ancient Oath Feature • 10-ft Aura',
    radiusFt: 10,
    description: 'You and friendly creatures within 10 feet of you have resistance to damage from spells.'
  },
  'Aura of Conquest': {
    subtitle: 'Conquest Oath Feature • 10-ft Aura',
    radiusFt: 10,
    description: 'You constantly emanate a menacing aura. If a creature is frightened of you, its speed is reduced to 0 while in the aura, and that creature takes psychic damage equal to half your paladin level if it starts its turn there.'
  },
  'Aura of Hate': {
    subtitle: 'Oathbreaker Feature • 10-ft Aura',
    radiusFt: 10,
    description: 'You, as well as any fiends and undead within 10 feet of you, gain a bonus to melee weapon damage rolls equal to your Charisma modifier (minimum of +1).'
  },
  "Crusader's Mantle": {
    subtitle: '3rd-Level Evocation Aura',
    radiusFt: 30,
    level: 3,
    school: 'Evocation',
    castingTime: '1 Action',
    components: 'V',
    duration: 'Concentration, up to 1 minute',
    damageFormula: '1d4',
    damageType: 'radiant',
    description: 'Holy power radiates from you in an aura with a 30-foot radius, awakening boldness in friendly creatures. Until the spell ends, the aura moves with you, centered on you. While in the aura, each nonhostile creature in the aura (including you) deals an extra 1d4 radiant damage when it hits with a weapon attack.'
  },
  'Twilight Sanctuary': {
    subtitle: 'Channel Divinity • 30-ft Aura',
    radiusFt: 30,
    castingTime: '1 Action',
    duration: '1 minute',
    damageFormula: '1d6 + 5',
    damageType: 'temp HP',
    isHeal: true,
    description: 'A sphere of twilight emanates from you with a 30-foot radius and moves with you. Whenever a creature (including you) ends its turn in the sphere, you can grant that creature one of these benefits: grant it temporary hit points equal to 1d6 plus your cleric level, or end one effect on it causing it to be charmed or frightened.'
  },
  'Fire Shield': {
    subtitle: '4th-Level Evocation Ward',
    radiusFt: 5,
    level: 4,
    school: 'Evocation',
    castingTime: '1 Action',
    duration: '10 minutes',
    damageFormula: '2d8',
    damageType: 'fire/cold',
    description: 'Thin and wispy flames wreathe your body for the duration, shedding bright light in a 10-foot radius and dim light for an additional 10 feet. The flames provide you with a warm shield (cold resistance, deals 2d8 fire damage to melee attackers within 5 ft) or a chill shield (fire resistance, deals 2d8 cold damage to melee attackers within 5 ft).'
  },
  'Holy Aura': {
    subtitle: '8th-Level Abjuration Aura',
    radiusFt: 30,
    level: 8,
    school: 'Abjuration',
    saveAbility: 'CON',
    description: 'Divine light emanates from you in a 30-foot radius. Creatures of your choice in that radius shed dim light in a 5-foot radius and have advantage on all saving throws, and other creatures have disadvantage on attack rolls against them. When a fiend or an undead hits an affected creature with a melee attack, the attacker must succeed on a Constitution saving throw or be blinded until the spell ends.'
  },
  'Pass without Trace': {
    subtitle: '2nd-Level Abjuration Aura',
    radiusFt: 30,
    description: 'A veil of shadows and silence radiates from you, masking you and your companions from detection. For the duration, each creature you choose within 30 feet of you (including you) has a +10 bonus to Dexterity (Stealth) checks and can\'t be tracked except by magical means. A creature that receives this bonus leaves behind no tracks or other traces of its passage.'
  },
  'Beacon of Hope': {
    subtitle: '3rd-Level Abjuration Aura',
    radiusFt: 30,
    description: 'This spell bestows hope and vitality. Choose any number of creatures within range. For the duration, each target has advantage on Wisdom saving throws and death saving throws, and regains the maximum number of hit points possible from any healing.'
  },
  'Anti-Magic Field': {
    subtitle: '8th-Level Abjuration Sphere',
    radiusFt: 10,
    description: 'A 10-foot-radius invisible sphere of antimagic surrounds you. This area is divorced from the magical energy that suffuses the multiverse. Within the sphere, spells can\'t be cast, summoned creatures disappear, and even magic items become mundane.'
  },
  'Silence': {
    subtitle: '2nd-Level Illusion Sphere',
    radiusFt: 20,
    description: 'For the duration, no sound can be created within or pass through a 20-foot-radius sphere centered on a point you choose within range. Any creature or object entirely inside the sphere is immune to thunder damage, and creatures are deafened while entirely inside it. Casting a spell that includes a verbal component is impossible there.'
  },
  'Darkness': {
    subtitle: '2nd-Level Evocation Sphere',
    radiusFt: 15,
    description: 'Magical darkness spreads from a point you choose within range to fill a 15-foot-radius sphere for the duration. The darkness spreads around corners. A creature with darkvision can\'t see through this darkness, and nonmagical light can\'t illuminate it.'
  },
  'Fog Cloud': {
    subtitle: '1st-Level Conjuration Sphere',
    radiusFt: 20,
    description: 'You create a 20-foot-radius sphere of fog centered on a point within range. The sphere spreads around corners, and its area is heavily obscured. It lasts for the duration or until a wind of moderate or greater speed (at least 10 miles per hour) disperses it.'
  },
  'Faerie Fire': {
    subtitle: '1st-Level Evocation Area',
    radiusFt: 10,
    description: 'Each object in a 20-foot cube within range is outlined in blue, green, or violet light. Any creature in the area when the spell is cast is also outlined in light if it fails a Dexterity saving throw. For the duration, objects and affected creatures shed dim light in a 10-foot radius. Any attack roll against an affected creature or object has advantage if the attacker can see it, and the affected creature or object can\'t benefit from being invisible.'
  }
};

export const DND_COMMON_SPELLS: Record<string, DndRuleEntry> = {
  'dimension door': {
    name: 'Dimension Door',
    category: 'spell',
    subtitle: '4th-Level Conjuration',
    level: 4,
    school: 'Conjuration',
    castingTime: '1 Action',
    range: '500 feet',
    components: 'V',
    duration: 'Instantaneous',
    description: 'You teleport yourself from your current location to any other spot within range. You arrive at exactly the spot desired. It can be a place you can see, one you can visualize, or one you can state by direction and distance, such as "200 feet straight downward" or "upward to the northwest at a 45-degree angle, 300 feet".\n\nYou can bring along objects as long as their weight doesn\'t exceed what you can carry. You can also bring one willing creature of your size or smaller who is carrying gear up to its carrying capacity. The creature must be within 5 feet of you when you cast this spell.\n\nIf you would arrive in a place already occupied by an object or a creature, you and any creature traveling with you each take 4d6 force damage, and the spell fails to teleport you.'
  },
  'misty step': {
    name: 'Misty Step',
    category: 'spell',
    subtitle: '2nd-Level Conjuration',
    level: 2,
    school: 'Conjuration',
    castingTime: '1 Bonus Action',
    range: 'Self (30 feet)',
    components: 'V',
    duration: 'Instantaneous',
    description: 'Briefly surrounded by silvery mist, you teleport up to 30 feet to an unoccupied space that you can see.'
  },
  'thunder step': {
    name: 'Thunder Step',
    category: 'spell',
    subtitle: '3rd-Level Conjuration',
    level: 3,
    school: 'Conjuration',
    castingTime: '1 Action',
    range: '90 feet',
    components: 'V',
    duration: 'Instantaneous',
    description: 'You teleport yourself to an unoccupied space you can see within range. Immediately after you disappear, a thunderous boom sounds, and each creature within 10 feet of the space you left must make a Constitution saving throw, taking 3d10 thunder damage on a failed save, or half as much damage on a successful one. The thunder can be heard from up to 300 feet away.\n\nYou can also bring along one willing creature of your size or smaller who is carrying gear up to its carrying capacity, provided the creature is within 5 feet of you when you cast this spell.',
    higherLevels: 'When you cast this spell using a spell slot of 4th level or higher, the damage increases by 1d10 for each slot level above 3rd.'
  },
  'fireball': {
    name: 'Fireball',
    category: 'spell',
    subtitle: '3rd-Level Evocation',
    level: 3,
    school: 'Evocation',
    castingTime: '1 Action',
    range: '150 feet (20-ft radius sphere)',
    components: 'V, S, M (a tiny ball of bat guano and sulfur)',
    duration: 'Instantaneous',
    description: 'A bright streak flashes from your pointing finger to a point you choose within range and then blossoms with a low roar into an explosion of flame. Each creature in a 20-foot-radius sphere centered on that point must make a Dexterity saving throw. A target takes 8d6 fire damage on a failed save, or half as much damage on a successful one.\n\nThe fire spreads around corners. It ignites flammable objects in the area that aren\'t being worn or carried.',
    higherLevels: 'When you cast this spell using a spell slot of 4th level or higher, the damage increases by 1d6 for each slot level above 3rd.'
  },
  'fire storm': {
    name: 'Fire Storm',
    category: 'spell',
    subtitle: '7th-Level Evocation',
    level: 7,
    school: 'Evocation',
    castingTime: '1 Action',
    range: '150 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'A storm made of sheets of roaring flame appears in a location you choose within range. The area of the storm consists of up to ten 10-foot cubes, which you can arrange as you wish. Each cube must have at least one face adjacent to the face of another cube. Each creature in the area must make a Dexterity saving throw. It takes 7d10 fire damage on a failed save, or half as much damage on a successful one.\n\nThe fire damages objects in the area and ignites flammable objects that aren\'t being worn or carried. If you choose, plant life in the area is unaffected by this spell.'
  },
  'thunderwave': {
    name: 'Thunderwave',
    category: 'spell',
    subtitle: '1st-Level Evocation',
    level: 1,
    school: 'Evocation',
    castingTime: '1 Action',
    range: 'Self (15-foot cube)',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'A wave of thunderous force sweeps out from you. Each creature in a 15-foot cube originating from you must make a Constitution saving throw. On a failed save, a creature takes 2d8 thunder damage and is pushed 10 feet away from you. On a successful save, the creature takes half as much damage and isn\'t pushed.\n\nIn addition, unsecured objects that are completely within the area of effect are automatically pushed 10 feet away from you by the spell\'s effect, and the spell emits a thunderous boom audible out to 300 feet.',
    higherLevels: 'When you cast this spell using a spell slot of 2nd level or higher, the damage increases by 1d8 for each slot level above 1st.'
  },
  'shield': {
    name: 'Shield',
    category: 'spell',
    subtitle: '1st-Level Abjuration',
    level: 1,
    school: 'Abjuration',
    castingTime: '1 Reaction, which you take when you are hit by an attack or targeted by the magic missile spell',
    range: 'Self',
    components: 'V, S',
    duration: '1 round',
    description: 'An invisible barrier of magical force appears and protects you. Until the start of your next turn, you have a +5 bonus to AC, including against the triggering attack, and you take no damage from magic missile.'
  },
  'cure wounds': {
    name: 'Cure Wounds',
    category: 'spell',
    subtitle: '1st-Level Evocation',
    level: 1,
    school: 'Evocation',
    castingTime: '1 Action',
    range: 'Touch',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'A creature you touch regains a number of hit points equal to 1d8 + your spellcasting ability modifier. This spell has no effect on undead or constructs.',
    higherLevels: 'When you cast this spell using a spell slot of 2nd level or higher, the healing increases by 1d8 for each slot level above 1st.'
  },
  'healing word': {
    name: 'Healing Word',
    category: 'spell',
    subtitle: '1st-Level Evocation',
    level: 1,
    school: 'Evocation',
    castingTime: '1 Bonus Action',
    range: '60 feet',
    components: 'V',
    duration: 'Instantaneous',
    description: 'A creature of your choice that you can see within range regains hit points equal to 1d4 + your spellcasting ability modifier. This spell has no effect on undead or constructs.',
    higherLevels: 'When you cast this spell using a spell slot of 2nd level or higher, the healing increases by 1d4 for each slot level above 1st.'
  },
  'bless': {
    name: 'Bless',
    category: 'spell',
    subtitle: '1st-Level Enchantment',
    level: 1,
    school: 'Enchantment',
    castingTime: '1 Action',
    range: '30 feet',
    components: 'V, S, M (a sprinkling of holy water)',
    duration: 'Concentration, up to 1 minute',
    description: 'You bless up to three creatures of your choice within range. Whenever a target makes an attack roll or a saving throw before the spell ends, the target can roll a d4 and add the number rolled to the attack roll or saving throw.',
    higherLevels: 'When you cast this spell using a spell slot of 2nd level or higher, you can target one additional creature for each slot level above 1st.'
  },
  'shield of faith': {
    name: 'Shield of Faith',
    category: 'spell',
    subtitle: '1st-Level Abjuration',
    level: 1,
    school: 'Abjuration',
    castingTime: '1 Bonus Action',
    range: '60 feet',
    components: 'V, S, M (a small parchment with a bit of holy text written on it)',
    duration: 'Concentration, up to 10 minutes',
    description: 'A shimmering field appears and surrounds a creature of your choice within range, granting it a +2 bonus to AC for the duration.'
  },
  'sanctuary': {
    name: 'Sanctuary',
    category: 'spell',
    subtitle: '1st-Level Abjuration',
    level: 1,
    school: 'Abjuration',
    castingTime: '1 Bonus Action',
    range: '30 feet',
    components: 'V, S, M (a small silver mirror)',
    duration: '1 minute',
    description: 'You ward a creature within range against attack. Until the spell ends, any creature who targets the warded creature with an attack or a harmful spell must first make a Wisdom saving throw. On a failed save, the creature must choose a new target or lose the attack or spell. This spell doesn\'t protect the warded creature from area effects, such as the explosion of a fireball.\n\nIf the warded creature makes an attack, casts a spell that affects an enemy, or deals damage to another creature, this spell ends.'
  },
  'mage armor': {
    name: 'Mage Armor',
    category: 'spell',
    subtitle: '1st-Level Abjuration',
    level: 1,
    school: 'Abjuration',
    castingTime: '1 Action',
    range: 'Touch',
    components: 'V, S, M (a piece of cured leather)',
    duration: '8 hours',
    description: 'You touch a willing creature who isn\'t wearing armor, and a protective magical force surrounds it until the spell ends. The target\'s base AC becomes 13 + its Dexterity modifier. The spell ends if the target dons armor or if you dismiss the spell as an action.'
  },
  'eldritch blast': {
    name: 'Eldritch Blast',
    category: 'spell',
    subtitle: 'Evocation Cantrip',
    level: 0,
    school: 'Evocation',
    castingTime: '1 Action',
    range: '120 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'A beam of crackling energy streaks toward a creature within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 force damage.\n\nThe spell creates more than one beam when you reach higher levels: two beams at 5th level, three beams at 11th level, and four beams at 17th level. You can direct the beams at the same target or at different ones. Make a separate attack roll for each beam.'
  },
  'fire bolt': {
    name: 'Fire Bolt',
    category: 'spell',
    subtitle: 'Evocation Cantrip',
    level: 0,
    school: 'Evocation',
    castingTime: '1 Action',
    range: '120 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'You hurl a mote of fire at a creature or object within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 fire damage. A flammable object hit by this spell ignites if it isn\'t being worn or carried.\n\nThis spell\'s damage increases by 1d10 when you reach 5th level (2d10), 11th level (3d10), and 17th level (4d10).'
  },
  'counterspell': {
    name: 'Counterspell',
    category: 'spell',
    subtitle: '3rd-Level Abjuration',
    level: 3,
    school: 'Abjuration',
    castingTime: '1 Reaction, which you take when you see a creature within 60 feet of you casting a spell',
    range: '60 feet',
    components: 'S',
    duration: 'Instantaneous',
    description: 'You attempt to interrupt a creature in the process of casting a spell. If the creature is casting a spell of 3rd level or lower, its spell fails and has no effect. If it is casting a spell of 4th level or higher, make an ability check using your spellcasting ability. The DC equals 10 + the spell\'s level. On a success, the creature\'s spell fails and has no effect.',
    higherLevels: 'When you cast this spell using a spell slot of 4th level or higher, the interrupted spell has no effect if its level is less than or equal to the level of the spell slot you used.'
  },
  'teleport': {
    name: 'Teleport',
    category: 'spell',
    subtitle: '7th-Level Conjuration',
    level: 7,
    school: 'Conjuration',
    castingTime: '1 Action',
    range: '10 feet',
    components: 'V',
    duration: 'Instantaneous',
    description: 'This spell instantly transports you and up to eight willing creatures of your choice that you can see within range, or a single object that you can see within range, to a destination you select. If you target an object, it must be able to fit entirely inside a 10-foot cube, and it can\'t be held or carried by an unwilling creature.\n\nThe destination you choose must be known to you, and it must be on the same plane of existence as you.'
  },
  'moonbeam': {
    name: 'Moonbeam',
    category: 'spell',
    subtitle: '2nd-Level Evocation',
    level: 2,
    school: 'Evocation',
    castingTime: '1 Action',
    range: '120 feet (5-ft radius, 40-ft high cylinder)',
    components: 'V, S, M (several seeds of any moonseed plant and a piece of opalescent feldspar)',
    duration: 'Concentration, up to 1 minute',
    description: 'A silvery beam of pale light shines down in a 5-foot-radius, 40-foot-high cylinder centered on a point within range. When a creature enters the spell\'s area for the first time on a turn or starts its turn there, it is engulfed in ghostly flames that cause searing pain, and it must make a Constitution saving throw. It takes 2d10 radiant damage on a failed save, or half as much damage on a successful one.\n\nA shapechanger makes its saving throw with disadvantage. If it fails, it also instantly reverts to its original form and can\'t assume a different form until it leaves the spell\'s light.\n\nOn each of your turns after you cast this spell, you can use an action to move the beam up to 60 feet in any direction.',
    higherLevels: 'When you cast this spell using a spell slot of 3rd level or higher, the damage increases by 1d10 for each slot level above 2nd.'
  },
  'call lightning': {
    name: 'Call Lightning',
    category: 'spell',
    subtitle: '3rd-Level Conjuration',
    level: 3,
    school: 'Conjuration',
    castingTime: '1 Action',
    range: '120 feet (60-ft radius cloud)',
    components: 'V, S',
    duration: 'Concentration, up to 10 minutes',
    description: 'A storm cloud appears in the shape of a cylinder that is 10 feet tall with a 60-foot radius, centered on a point you can see 100 feet directly above you. When you cast the spell, choose a point you can see under the cloud. A bolt of lightning flashes down from the cloud to that point. Each creature within 5 feet of that point must make a Dexterity saving throw. A creature takes 3d10 lightning damage on a failed save, or half as much damage on a successful one. On each of your turns until the spell ends, you can use your action to call down lightning in this way again, targeting the same point or a different one.\n\nIf you are outdoors in stormy conditions when you cast this spell, the spell gives you control over the existing storm instead of creating a new one. Under such conditions, the spell\'s damage increases by 1d10.',
    higherLevels: 'When you cast this spell using a spell slot of 4th level or higher, the damage increases by 1d10 for each slot level above 3rd.'
  },
  'polymorph': {
    name: 'Polymorph',
    category: 'spell',
    subtitle: '4th-Level Transmutation',
    level: 4,
    school: 'Transmutation',
    castingTime: '1 Action',
    range: '60 feet',
    components: 'V, S, M (a caterpillar cocoon)',
    duration: 'Concentration, up to 1 hour',
    description: 'This spell transforms a creature that you can see within range into a new form. An unwilling creature must make a Wisdom saving throw to avoid the effect. A shapechanger automatically succeeds on this saving throw.\n\nThe transformation lasts for the duration, or until the target drops to 0 hit points or dies. The new form can be any beast whose challenge rating is equal to or less than the target\'s (or the target\'s level, if the target doesn\'t have a challenge rating). The target\'s game statistics, including mental ability scores, are replaced by the statistics of the chosen beast. It retains its alignment and personality.'
  },
  'hypnotic pattern': {
    name: 'Hypnotic Pattern',
    category: 'spell',
    subtitle: '3rd-Level Illusion',
    level: 3,
    school: 'Illusion',
    castingTime: '1 Action',
    range: '120 feet (30-ft cube)',
    components: 'S, M (a glowing stick of incense or a crystal vial filled with phosphorescent material)',
    duration: 'Concentration, up to 1 minute',
    description: 'You create a twisting pattern of colors that weaves through the air inside a 30-foot cube within range. The pattern appears for a moment and vanishes. Each creature in the area who sees the pattern must make a Wisdom saving throw. On a failed save, the creature becomes charmed for the duration. While charmed by this spell, the creature is incapacitated and has a speed of 0.\n\nThe spell ends for an affected creature if it takes any damage or if someone else uses an action to shake the creature out of its stupor.'
  },
  'shatter': {
    name: 'Shatter',
    category: 'spell',
    subtitle: '2nd-Level Evocation',
    level: 2,
    school: 'Evocation',
    castingTime: '1 Action',
    range: '60 feet (10-ft radius sphere)',
    components: 'V, S, M (a chip of mica)',
    duration: 'Instantaneous',
    description: 'A sudden loud ringing noise, painfully intense, erupts from a point of your choice within range. Each creature in a 10-foot-radius sphere centered on that point must make a Constitution saving throw. A creature takes 3d8 thunder damage on a failed save, or half as much damage on a successful one. A creature made of inorganic material such as stone, crystal, or metal has disadvantage on this saving throw.\n\nA nonmagical object that isn\'t being worn or carried also takes the damage if it\'s in the spell\'s area.',
    higherLevels: 'When you cast this spell using a spell slot of 3rd level or higher, the damage increases by 1d8 for each slot level above 2nd.'
  },
  'vortex warp': {
    name: 'Vortex Warp',
    category: 'spell',
    subtitle: '2nd-Level Conjuration',
    level: 2,
    school: 'Conjuration',
    castingTime: '1 Action',
    range: '90 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'You magically twist space around another creature you can see within range. The target must succeed on a Constitution saving throw (the target can choose to fail) or be teleported to an unoccupied space of your choice that you can see within range. The chosen space must be on a surface or in a liquid that can support the target without the target having to squeeze.',
    higherLevels: 'When you cast this spell using a spell slot of 3rd level or higher, the range increases by 30 feet for each slot level above 2nd.'
  },
  'spirit guardians': {
    name: 'Spirit Guardians',
    category: 'spell',
    subtitle: '3rd-Level Conjuration',
    level: 3,
    school: 'Conjuration',
    castingTime: '1 Action',
    range: 'Self (15-foot radius)',
    components: 'V, S, M (a holy symbol)',
    duration: 'Concentration, up to 10 minutes',
    damageFormula: '3d8',
    damageType: 'radiant',
    saveAbility: 'WIS',
    description: 'Protective spirits flit around you in a 15-foot Emanation for the duration. If you are good or neutral, their spectral form appears angelic or fey (your choice). If you are evil, they appear fiendish. When you cast this spell, you can designate creatures to be unaffected by it. Any other creature\'s Speed is halved in the Emanation, and whenever the Emanation enters a creature\'s space and whenever a creature enters the Emanation or ends its turn there, the creature must make a Wisdom saving throw. On a failed save, the creature takes 3d8 Radiant damage (if you are good or neutral) or 3d8 Necrotic damage (if you are evil). On a successful save, the creature takes half as much damage. A creature makes this save only once per turn.',
    higherLevels: 'When you cast this spell using a spell slot of 4th level or higher, the damage increases by 1d8 for each slot level above 3rd.'
  }
};

/**
 * Searches the unified compendium for full text details on a spell, condition, or aura.
 */
export function lookupDndRuleDetails(rawName: string, categoryHint?: 'spell' | 'condition' | 'aura'): DndRuleEntry | null {
  if (!rawName || typeof rawName !== 'string') return null;
  const clean = rawName.trim();
  const lower = clean.toLowerCase();

  // 1. Check Condition
  if (categoryHint === 'condition' || DND_CONDITION_DESCRIPTIONS[clean]) {
    const direct = DND_CONDITION_DESCRIPTIONS[clean];
    if (direct) {
      return {
        name: clean,
        category: 'condition',
        subtitle: direct.subtitle,
        description: direct.description
      };
    }
    // Case-insensitive lookup
    for (const [key, val] of Object.entries(DND_CONDITION_DESCRIPTIONS)) {
      if (key.toLowerCase() === lower || lower.includes(key.toLowerCase())) {
        return {
          name: key,
          category: 'condition',
          subtitle: val.subtitle,
          description: val.description
        };
      }
    }
  }

  // 2. Check Aura
  if (categoryHint === 'aura' || DND_AURA_DESCRIPTIONS[clean]) {
    const direct = DND_AURA_DESCRIPTIONS[clean];
    if (direct) {
      return {
        name: clean,
        category: 'aura',
        subtitle: direct.subtitle,
        level: direct.level,
        school: direct.school,
        castingTime: direct.castingTime,
        components: direct.components,
        duration: direct.duration,
        damageFormula: direct.damageFormula,
        damageType: direct.damageType,
        saveAbility: direct.saveAbility,
        isHeal: direct.isHeal,
        range: `${direct.radiusFt} ft radius`,
        description: direct.description,
        higherLevels: direct.higherLevels
      };
    }
    for (const [key, val] of Object.entries(DND_AURA_DESCRIPTIONS)) {
      if (key.toLowerCase() === lower || lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
        return {
          name: key,
          category: 'aura',
          subtitle: val.subtitle,
          level: val.level,
          school: val.school,
          castingTime: val.castingTime,
          components: val.components,
          duration: val.duration,
          damageFormula: val.damageFormula,
          damageType: val.damageType,
          saveAbility: val.saveAbility,
          isHeal: val.isHeal,
          range: `${val.radiusFt} ft radius`,
          description: val.description,
          higherLevels: val.higherLevels
        };
      }
    }
  }

  // 3. Check Common Spells
  if (DND_COMMON_SPELLS[lower]) {
    return DND_COMMON_SPELLS[lower];
  }
  for (const [key, val] of Object.entries(DND_COMMON_SPELLS)) {
    if (lower.includes(key) || key.includes(lower)) {
      return val;
    }
  }

  // 4. Fallback condition check if category was unspecified
  for (const [key, val] of Object.entries(DND_CONDITION_DESCRIPTIONS)) {
    if (lower === key.toLowerCase() || lower.includes(key.toLowerCase())) {
      return {
        name: key,
        category: 'condition',
        subtitle: val.subtitle,
        description: val.description
      };
    }
  }

  // 5. Fallback aura check if category was unspecified
  for (const [key, val] of Object.entries(DND_AURA_DESCRIPTIONS)) {
    if (lower === key.toLowerCase() || lower.includes(key.toLowerCase())) {
      return {
        name: key,
        category: 'aura',
        subtitle: val.subtitle,
        level: val.level,
        school: val.school,
        castingTime: val.castingTime,
        components: val.components,
        duration: val.duration,
        damageFormula: val.damageFormula,
        damageType: val.damageType,
        saveAbility: val.saveAbility,
        isHeal: val.isHeal,
        range: `${val.radiusFt} ft radius`,
        description: val.description,
        higherLevels: val.higherLevels
      };
    }
  }

  return null;
}
