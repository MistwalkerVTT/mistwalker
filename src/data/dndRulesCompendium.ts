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
  isAttack?: boolean;
  isSelfAction?: boolean;
  description: string;
  higherLevels?: string;
  atHigherLevels?: string;
  baseLevel?: number;
  radiusFeet?: number;
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
    damageFormula: '3d10',
    damageType: 'thunder',
    saveAbility: 'CON',
    radiusFeet: 10,
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
    damageFormula: '8d6',
    damageType: 'fire',
    saveAbility: 'DEX',
    radiusFeet: 20,
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
    damageFormula: '7d10',
    damageType: 'fire',
    saveAbility: 'DEX',
    radiusFeet: 20,
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
    damageFormula: '2d8',
    damageType: 'thunder',
    saveAbility: 'CON',
    radiusFeet: 15,
    description: 'A wave of thunderous force sweeps out from you. Each creature in a 15-foot cube originating from you must make a Constitution saving throw. On a failed save, a creature takes 2d8 thunder damage and is pushed 10 feet away from you. On a successful save, the creature takes half as much damage and isn\'t pushed.\n\nIn addition, unsecured objects that are completely within the area of effect are automatically pushed 10 feet away from you by the spell\'s effect, and the spell emits a thunderous boom audible out to 300 feet.',
    higherLevels: 'When you cast this spell using a spell slot of 2nd level or higher, the damage increases by 1d8 for each slot level above 1st.'
  },
  'shield': {
    name: 'Shield',
    category: 'spell',
    subtitle: '1st-Level Abjuration',
    level: 1,
    school: 'Abjuration',
    castingTime: '1 Reaction',
    range: 'Self',
    components: 'V, S',
    duration: '1 round',
    isSelfAction: true,
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
    damageFormula: '1d8',
    damageType: 'healing',
    isHeal: true,
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
    damageFormula: '1d4',
    damageType: 'healing',
    isHeal: true,
    description: 'A creature of your choice that you can see within range regains hit points equal to 1d4 + your spellcasting ability modifier. This spell has no effect on undead or constructs.',
    higherLevels: 'When you cast this spell using a spell slot of 2nd level or higher, the healing increases by 1d4 for each slot level above 1st.'
  },
  'mass healing word': {
    name: 'Mass Healing Word',
    category: 'spell',
    subtitle: '3rd-Level Evocation',
    level: 3,
    school: 'Evocation',
    castingTime: '1 Bonus Action',
    range: '60 feet',
    components: 'V',
    duration: 'Instantaneous',
    damageFormula: '1d4',
    damageType: 'healing',
    isHeal: true,
    description: 'As you call out words of restoration, up to six creatures of your choice that you can see within range regain hit points equal to 1d4 + your spellcasting ability modifier. This spell has no effect on undead or constructs.',
    higherLevels: 'When you cast this spell using a spell slot of 4th level or higher, the healing increases by 1d4 for each slot level above 3rd.'
  },
  'mass cure wounds': {
    name: 'Mass Cure Wounds',
    category: 'spell',
    subtitle: '5th-Level Evocation',
    level: 5,
    school: 'Evocation',
    castingTime: '1 Action',
    range: '60 feet (30-ft radius sphere)',
    components: 'V, S',
    duration: 'Instantaneous',
    damageFormula: '3d8',
    damageType: 'healing',
    isHeal: true,
    radiusFeet: 30,
    description: 'A wave of healing energy washes out from a point of your choice within range. Choose up to six creatures in a 30-foot-radius sphere centered on that point. Each target regains hit points equal to 3d8 + your spellcasting ability modifier. This spell has no effect on undead or constructs.',
    higherLevels: 'When you cast this spell using a spell slot of 6th level or higher, the healing increases by 1d8 for each slot level above 5th.'
  },
  'heal': {
    name: 'Heal',
    category: 'spell',
    subtitle: '6th-Level Evocation',
    level: 6,
    school: 'Evocation',
    castingTime: '1 Action',
    range: '60 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    damageFormula: '70',
    damageType: 'healing',
    isHeal: true,
    description: 'Choose a creature that you can see within range. A surge of positive energy washes through the creature, causing it to regain 70 hit points. This spell also ends blindness, deafness, and any diseases affecting the target. This spell has no effect on constructs or undead.',
    higherLevels: 'When you cast this spell using a spell slot of 7th level or higher, the amount of healing increases by 10 for each slot level above 6th.'
  },
  'revivify': {
    name: 'Revivify',
    category: 'spell',
    subtitle: '3rd-Level Necromancy',
    level: 3,
    school: 'Necromancy',
    castingTime: '1 Action',
    range: 'Touch',
    components: 'V, S, M (diamonds worth 300 gp, which the spell consumes)',
    duration: 'Instantaneous',
    damageFormula: '1',
    damageType: 'healing',
    isHeal: true,
    description: 'You touch a creature that has died within the last minute. That creature returns to life with 1 hit point. This spell can\'t return to life a creature that has died of old age, nor can it restore any missing body parts.'
  },
  'lesser restoration': {
    name: 'Lesser Restoration',
    category: 'spell',
    subtitle: '2nd-Level Abjuration',
    level: 2,
    school: 'Abjuration',
    castingTime: '1 Action',
    range: 'Touch',
    components: 'V, S',
    duration: 'Instantaneous',
    isHeal: true,
    description: 'You touch a creature and can end either one disease or one condition afflicting it. The condition can be blinded, deafened, paralyzed, or poisoned.'
  },
  'greater restoration': {
    name: 'Greater Restoration',
    category: 'spell',
    subtitle: '5th-Level Abjuration',
    level: 5,
    school: 'Abjuration',
    castingTime: '1 Action',
    range: 'Touch',
    components: 'V, S, M (diamond dust worth at least 100 gp, which the spell consumes)',
    duration: 'Instantaneous',
    isHeal: true,
    description: 'You imbue a creature you touch with positive energy to undo a debilitating effect. You can reduce the target\'s exhaustion level by one, or end one of the following effects on the target:\n• One effect that charmed or petrified the target\n• One curse, including the target\'s attunement to a cursed magic item\n• Any reduction to one of the target\'s ability scores\n• One effect reducing the target\'s hit point maximum'
  },
  'aid': {
    name: 'Aid',
    category: 'spell',
    subtitle: '2nd-Level Abjuration',
    level: 2,
    school: 'Abjuration',
    castingTime: '1 Action',
    range: '30 feet',
    components: 'V, S, M (a tiny strip of white cloth)',
    duration: '8 hours',
    damageFormula: '5',
    damageType: 'healing',
    isHeal: true,
    description: 'Your spell bolsters your allies with toughness and resolve. Choose up to three creatures within range. Each target\'s hit point maximum and current hit points increase by 5 for the duration.',
    higherLevels: 'When you cast this spell using a spell slot of 3rd level or higher, a target\'s hit points increase by an additional 5 for each slot level above 2nd.'
  },
  "heroes' feast": {
    name: "Heroes' Feast",
    category: 'spell',
    subtitle: '6th-Level Conjuration',
    level: 6,
    school: 'Conjuration',
    castingTime: '10 Minutes',
    range: '30 feet',
    components: 'V, S, M (a gem-encrusted bowl worth at least 1,000 gp, which the spell consumes)',
    duration: 'Instantaneous',
    damageFormula: '2d10',
    damageType: 'healing',
    isHeal: true,
    description: 'You bring forth a great feast, including magnificent food and drink. The feast takes 1 hour to consume and disappears at the end of that time, and the beneficial effects don\'t set in until this hour is over. Up to twelve creatures can partake of the feast.\n\nA creature that partakes of the feast gains several benefits. The creature is cured of all diseases and poison, becomes immune to poison and being frightened, and makes all Wisdom saving throws with advantage. Its hit point maximum also increases by 2d10, and it gains the same number of hit points. These benefits last for 24 hours.'
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
    saveAbility: 'WIS',
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
  'absorb elements': {
    name: 'Absorb Elements',
    category: 'spell',
    subtitle: '1st-Level Abjuration',
    level: 1,
    school: 'Abjuration',
    castingTime: '1 Reaction',
    range: 'Self',
    components: 'S',
    duration: '1 round',
    damageFormula: '1d6',
    damageType: 'elemental',
    isSelfAction: true,
    description: 'The spell captures some of the incoming energy, lessening its effect on you and storing it for your next melee attack. You have resistance to the triggering damage type until the start of your next turn. Also, the first time you hit with a melee attack on your next turn, the target takes an extra 1d6 damage of the triggering type, and the spell ends.',
    higherLevels: 'When you cast this spell using a spell slot of 2nd level or higher, the extra damage increases by 1d6 for each slot level above 1st.'
  },
  'blade ward': {
    name: 'Blade Ward',
    category: 'spell',
    subtitle: 'Abjuration Cantrip',
    level: 0,
    school: 'Abjuration',
    castingTime: '1 Action',
    range: 'Self',
    components: 'V, S',
    duration: '1 round',
    isSelfAction: true,
    description: 'You extend your hand and trace a sigil of warding in the air. Until the end of your next turn, you have resistance against bludgeoning, piercing, and slashing damage dealt by weapon attacks.'
  },
  'warding bond': {
    name: 'Warding Bond',
    category: 'spell',
    subtitle: '2nd-Level Abjuration',
    level: 2,
    school: 'Abjuration',
    castingTime: '1 Action',
    range: 'Touch',
    components: 'V, S, M (a pair of platinum rings worth at least 50 gp each)',
    duration: '1 hour',
    description: 'This spell wards a willing creature you touch and creates a mystic connection between you and the target until the spell ends. While the target is within 60 feet of you, it gains a +1 bonus to AC and saving throws, and it has resistance to all damage. Also, each time it takes damage, you take the same amount of damage.'
  },
  'death ward': {
    name: 'Death Ward',
    category: 'spell',
    subtitle: '4th-Level Abjuration',
    level: 4,
    school: 'Abjuration',
    castingTime: '1 Action',
    range: 'Touch',
    components: 'V, S',
    duration: '8 hours',
    description: 'You touch a creature and grant it a measure of protection from death. The first time the target would drop to 0 hit points as a result of taking damage, the target instead drops to 1 hit point, and the spell ends. If the spell is still in effect when the target is subjected to an effect that would kill it instantaneously without dealing damage, that effect is instead negated against the target, and the spell ends.'
  },
  'beacon of hope': {
    name: 'Beacon of Hope',
    category: 'spell',
    subtitle: '3rd-Level Abjuration',
    level: 3,
    school: 'Abjuration',
    castingTime: '1 Action',
    range: '30 feet',
    components: 'V, S',
    duration: 'Concentration, up to 1 minute',
    radiusFeet: 30,
    description: 'This spell bestows hope and vitality. Choose any number of creatures within range. For the duration, each target has advantage on Wisdom saving throws and death saving throws, and regains the maximum number of hit points possible from any healing.'
  },
  'holy aura': {
    name: 'Holy Aura',
    category: 'spell',
    subtitle: '8th-Level Abjuration',
    level: 8,
    school: 'Abjuration',
    castingTime: '1 Action',
    range: 'Self (30-foot radius)',
    components: 'V, S, M (a tiny reliquary worth at least 1,000 gp)',
    duration: 'Concentration, up to 1 minute',
    saveAbility: 'CON',
    radiusFeet: 30,
    isSelfAction: true,
    description: 'Divine light washes out from you and coalesces in a soft radiance in a 30-foot radius around you. Creatures of your choice in that radius when you cast this spell shed dim light in a 5-foot radius and have advantage on all saving throws, and other creatures have disadvantage on attack rolls against them until the spell ends. In addition, when a fiend or an undead hits an affected creature with a melee attack, the aura flashes with brilliant light. The attacker must succeed on a Constitution saving throw or be blinded until the spell ends.'
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
    radiusFeet: 15,
    isSelfAction: true,
    description: 'Protective spirits flit around you in a 15-foot Emanation for the duration. If you are good or neutral, their spectral form appears angelic or fey (your choice). If you are evil, they appear fiendish. When you cast this spell, you can designate creatures to be unaffected by it. Any other creature\'s Speed is halved in the Emanation, and whenever the Emanation enters a creature\'s space and whenever a creature enters the Emanation or ends its turn there, the creature must make a Wisdom saving throw. On a failed save, the creature takes 3d8 Radiant damage (if you are good or neutral) or 3d8 Necrotic damage (if you are evil). On a successful save, the creature takes half as much damage. A creature makes this save only once per turn.',
    higherLevels: 'When you cast this spell using a spell slot of 4th level or higher, the damage increases by 1d8 for each slot level above 3rd.'
  },
  'spiritual weapon': {
    name: 'Spiritual Weapon',
    category: 'spell',
    subtitle: '2nd-Level Evocation',
    level: 2,
    school: 'Evocation',
    castingTime: '1 Bonus Action',
    range: '60 feet',
    components: 'V, S',
    duration: '1 minute',
    damageFormula: '1d8',
    damageType: 'force',
    isAttack: true,
    description: 'You create a floating, spectral weapon within range that lasts for the duration or until you cast this spell again. When you cast the spell, you can make a melee spell attack against a creature within 5 feet of the weapon. On a hit, the target takes force damage equal to 1d8 + your spellcasting ability modifier.\n\nAs a bonus action on your turn, you can move the weapon up to 20 feet and repeat the attack against a creature within 5 feet of it.',
    higherLevels: 'When you cast this spell using a spell slot of 3rd level or higher, the damage increases by 1d8 for every two slot levels above 2nd.'
  },
  'holy weapon': {
    name: 'Holy Weapon',
    category: 'spell',
    subtitle: '5th-Level Evocation',
    level: 5,
    school: 'Evocation',
    castingTime: '1 Bonus Action',
    range: 'Touch',
    components: 'V, S',
    duration: 'Concentration, up to 1 hour',
    damageFormula: '2d8',
    damageType: 'radiant',
    saveAbility: 'CON',
    description: 'You imbue a weapon you touch with holy power. Until the spell ends, the weapon emits bright light in a 30-foot radius and dim light for an additional 30 feet. In addition, weapon attacks made with it deal an extra 2d8 radiant damage on a hit.\n\nAs a bonus action on your turn, you can dismiss this spell and cause the weapon to emit a burst of radiance. Each creature of your choice that you can see within 30 feet of the weapon must make a Constitution saving throw. On a failed save, a creature takes 4d8 radiant damage, and it is blinded for 1 minute.'
  },
  'guardian of faith': {
    name: 'Guardian of Faith',
    category: 'spell',
    subtitle: '4th-Level Conjuration',
    level: 4,
    school: 'Conjuration',
    castingTime: '1 Action',
    range: '30 feet',
    components: 'V',
    duration: '8 hours',
    damageFormula: '20',
    damageType: 'radiant',
    saveAbility: 'DEX',
    radiusFeet: 10,
    description: 'A Large spectral guardian appears and hovers for the duration in an unoccupied space of your choice that you can see within range. The guardian occupies that space and is indistinct except for a gleaming sword and shield emblazoned with the symbol of your deity.\n\nAny creature hostile to you that moves to a space within 10 feet of the guardian for the first time on a turn must succeed on a Dexterity saving throw. The creature takes 20 radiant damage on a failed save, or half as much damage on a successful one. The guardian vanishes when it has dealt a total of 60 damage.'
  },
  'blade barrier': {
    name: 'Blade Barrier',
    category: 'spell',
    subtitle: '6th-Level Evocation',
    level: 6,
    school: 'Evocation',
    castingTime: '1 Action',
    range: '90 feet',
    components: 'V, S',
    duration: 'Concentration, up to 10 minutes',
    damageFormula: '6d10',
    damageType: 'slashing',
    saveAbility: 'DEX',
    radiusFeet: 20,
    description: 'You create a vertical wall of whirling, razor-sharp blades made of magical energy. The wall appears within range and lasts for the duration. You can make a straight wall up to 100 feet long, 20 feet high, and 5 feet thick, or a ringed wall up to 60 feet in diameter, 20 feet high, and 5 feet thick. The wall provides three-quarters cover to creatures behind it, and its space is difficult terrain.\n\nWhen a creature enters the wall\'s area for the first time on a turn or starts its turn there, the creature must make a Dexterity saving throw. On a failed save, the creature takes 6d10 slashing damage. On a successful save, the creature takes half as much damage.'
  },
  'flame strike': {
    name: 'Flame Strike',
    category: 'spell',
    subtitle: '5th-Level Evocation',
    level: 5,
    school: 'Evocation',
    castingTime: '1 Action',
    range: '60 feet (10-ft radius, 40-ft high cylinder)',
    components: 'V, S, M (pinch of sulfur)',
    duration: 'Instantaneous',
    damageFormula: '8d6',
    damageType: 'radiant',
    saveAbility: 'DEX',
    radiusFeet: 10,
    description: 'A vertical column of divine fire roars down from the heavens in a location you specify. Each creature in a 10-foot-radius, 40-foot-high cylinder centered on a point within range must make a Dexterity saving throw. A creature takes 4d6 fire damage and 4d6 radiant damage on a failed save, or half as much damage on a successful one.',
    higherLevels: 'When you cast this spell using a spell slot of 6th level or higher, the fire damage or the radiant damage (your choice) increases by 1d6 for each slot level above 5th.'
  },
  'sunbeam': {
    name: 'Sunbeam',
    category: 'spell',
    subtitle: '6th-Level Evocation',
    level: 6,
    school: 'Evocation',
    castingTime: '1 Action',
    range: 'Self (60-foot line)',
    components: 'V, S, M (a magnifying glass)',
    duration: 'Concentration, up to 1 minute',
    damageFormula: '6d8',
    damageType: 'radiant',
    saveAbility: 'CON',
    description: 'A beam of brilliant light flashes out from your hand in a 5-foot-wide, 60-foot-long line. Each creature in the line must make a Constitution saving throw. On a failed save, a creature takes 6d8 radiant damage and is blinded until your next turn. On a successful save, it takes half as much damage and isn\'t blinded by this spell. Undead and oozes have disadvantage on this saving throw.\n\nYou can create a new line of radiance as your action on any turn until the spell ends.'
  },
  'sunburst': {
    name: 'Sunburst',
    category: 'spell',
    subtitle: '8th-Level Evocation',
    level: 8,
    school: 'Evocation',
    castingTime: '1 Action',
    range: '150 feet (60-ft radius sphere)',
    components: 'V, S, M (fire and a piece of sunstone)',
    duration: 'Instantaneous',
    damageFormula: '12d6',
    damageType: 'radiant',
    saveAbility: 'CON',
    radiusFeet: 60,
    description: 'Brilliant sunlight flashes in a 60-foot radius centered on a point you choose within range. Each creature in that light must make a Constitution saving throw. On a failed save, a creature takes 12d6 radiant damage and is blinded for 1 minute. On a successful save, it takes half as much damage and isn\'t blinded by this spell. Undead and oozes have disadvantage on this saving throw.'
  },
  'divine word': {
    name: 'Divine Word',
    category: 'spell',
    subtitle: '7th-Level Evocation',
    level: 7,
    school: 'Evocation',
    castingTime: '1 Bonus Action',
    range: '30 feet',
    components: 'V',
    duration: 'Instantaneous',
    saveAbility: 'CHA',
    description: 'You utter a divine word, imbued with the power that shaped the world at the dawn of creation. Choose any number of creatures you can see within range. Each creature that can hear you must make a Charisma saving throw. On a failed save, a creature suffers an effect based on its current hit points:\n• 50 hit points or fewer: deafened for 1 minute\n• 40 hit points or fewer: deafened and blinded for 10 minutes\n• 30 hit points or fewer: blinded, deafened, and stunned for 1 hour\n• 20 hit points or fewer: killed instantly\n\nRegardless of its current hit points, a celestial, an elemental, a fey, or a fiend that fails its save is forced back to its plane of origin (if it isn\'t there already) and can\'t return to your current plane for 24 hours.'
  },
  'command': {
    name: 'Command',
    category: 'spell',
    subtitle: '1st-Level Enchantment',
    level: 1,
    school: 'Enchantment',
    castingTime: '1 Action',
    range: '60 feet',
    components: 'V',
    duration: '1 round',
    saveAbility: 'WIS',
    description: 'You speak a one-word command to a creature you can see within range. The target must succeed on a Wisdom saving throw or follow the command on its next turn. Typical commands include Approach, Drop, Flee, Grovel, and Halt.',
    higherLevels: 'When you cast this spell using a spell slot of 2nd level or higher, you can affect one additional creature for each slot level above 1st.'
  },
  'hold person': {
    name: 'Hold Person',
    category: 'spell',
    subtitle: '2nd-Level Enchantment',
    level: 2,
    school: 'Enchantment',
    castingTime: '1 Action',
    range: '60 feet',
    components: 'V, S, M (a small, straight piece of iron)',
    duration: 'Concentration, up to 1 minute',
    saveAbility: 'WIS',
    description: 'Choose a humanoid that you can see within range. The target must succeed on a Wisdom saving throw or be paralyzed for the duration. At the end of each of its turns, the target can make another Wisdom saving throw. On a success, the spell ends on the target.',
    higherLevels: 'When you cast this spell using a spell slot of 3rd level or higher, you can target one additional humanoid for each slot level above 2nd.'
  },
  'hold monster': {
    name: 'Hold Monster',
    category: 'spell',
    subtitle: '5th-Level Enchantment',
    level: 5,
    school: 'Enchantment',
    castingTime: '1 Action',
    range: '90 feet',
    components: 'V, S, M (a small, straight piece of iron)',
    duration: 'Concentration, up to 1 minute',
    saveAbility: 'WIS',
    description: 'Choose a creature that you can see within range. The target must succeed on a Wisdom saving throw or be paralyzed for the duration. This spell has no effect on undead. At the end of each of its turns, the target can make another Wisdom saving throw. On a success, the spell ends on the target.',
    higherLevels: 'When you cast this spell using a spell slot of 6th level or higher, you can target one additional creature for each slot level above 5th.'
  },
  'silence': {
    name: 'Silence',
    category: 'spell',
    subtitle: '2nd-Level Illusion',
    level: 2,
    school: 'Illusion',
    castingTime: '1 Action',
    range: '120 feet (20-ft radius sphere)',
    components: 'V, S',
    duration: 'Concentration, up to 10 minutes',
    radiusFeet: 20,
    description: 'For the duration, no sound can be created within or pass through a 20-foot-radius sphere centered on a point you choose within range. Any creature or object entirely inside the sphere is immune to thunder damage, and creatures are deafened while entirely inside it. Casting a spell that includes a verbal component is impossible there.'
  },
  'stone shape': {
    name: 'Stone Shape',
    category: 'spell',
    subtitle: '4th-Level Transmutation',
    level: 4,
    school: 'Transmutation',
    castingTime: '1 Action',
    range: 'Touch',
    components: 'V, S, M (soft clay)',
    duration: 'Instantaneous',
    description: 'You touch a stone object of Medium size or smaller or a section of stone no more than 5 feet in any dimension and form it into any shape that suits your purpose.'
  },
  'banishment': {
    name: 'Banishment',
    category: 'spell',
    subtitle: '4th-Level Abjuration',
    level: 4,
    school: 'Abjuration',
    castingTime: '1 Action',
    range: '60 feet',
    components: 'V, S, M (an item distasteful to the target)',
    duration: 'Concentration, up to 1 minute',
    saveAbility: 'CHA',
    description: 'You attempt to send one creature that you can see within range to another plane of existence. The target must succeed on a Charisma saving throw or be banished into a harmless demiplane (or its home plane if native to a different plane) for the duration.',
    higherLevels: 'When you cast this spell using a spell slot of 5th level or higher, you can target one additional creature for each slot level above 4th.'
  },
  'sacred flame': {
    name: 'Sacred Flame',
    category: 'spell',
    subtitle: 'Evocation Cantrip',
    level: 0,
    school: 'Evocation',
    castingTime: '1 Action',
    range: '60 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    damageFormula: '1d8',
    damageType: 'radiant',
    saveAbility: 'DEX',
    description: 'Flame-like radiance descends on a creature that you can see within range. The target must succeed on a Dexterity saving throw or take 1d8 radiant damage. The target gains no benefit from cover for this saving throw.\n\nThe spell\'s damage increases by 1d8 when you reach 5th level (2d8), 11th level (3d8), and 17th level (4d8).'
  },
  'toll the dead': {
    name: 'Toll the Dead',
    category: 'spell',
    subtitle: 'Necromancy Cantrip',
    level: 0,
    school: 'Necromancy',
    castingTime: '1 Action',
    range: '60 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    damageFormula: '1d12',
    damageType: 'necrotic',
    saveAbility: 'WIS',
    description: 'You point at one creature you can see within range, and the sound of a dolorous bell fills the air around it for a moment. The target must succeed on a Wisdom saving throw or take 1d8 necrotic damage. If the target is missing any of its hit points, it instead takes 1d12 necrotic damage.\n\nThe spell\'s damage increases by one die when you reach 5th level (2d8 or 2d12), 11th level (3d8 or 3d12), and 17th level (4d8 or 4d12).'
  },
  'guidance': {
    name: 'Guidance',
    category: 'spell',
    subtitle: 'Divination Cantrip',
    level: 0,
    school: 'Divination',
    castingTime: '1 Action',
    range: 'Touch',
    components: 'V, S',
    duration: 'Concentration, up to 1 minute',
    description: 'You touch one willing creature. Once before the spell ends, the target can roll a d4 and add the number rolled to one ability check of its choice. It can roll the die before or after making the ability check. The spell then ends.'
  },
  'light': {
    name: 'Light',
    category: 'spell',
    subtitle: 'Evocation Cantrip',
    level: 0,
    school: 'Evocation',
    castingTime: '1 Action',
    range: 'Touch',
    components: 'V, M (a firefly or phosphorescent moss)',
    duration: '1 hour',
    description: 'You touch one object that is no larger than 10 feet in any dimension. Until the spell ends, the object sheds bright light in a 20-foot radius and dim light for an additional 20 feet.'
  },
  'daylight': {
    name: 'Daylight',
    category: 'spell',
    subtitle: '3rd-Level Evocation',
    level: 3,
    school: 'Evocation',
    castingTime: '1 Action',
    range: '60 feet (60-ft radius sphere)',
    components: 'V, S',
    duration: '1 hour',
    radiusFeet: 60,
    description: 'A 60-foot-radius sphere of light spreads out from a point you choose within range. The sphere is bright light and sheds dim light for an additional 60 feet. If any of this spell\'s area overlaps with an area of darkness created by a spell of 3rd level or lower, the spell that created the darkness is dispelled.'
  },
  'thaumaturgy': {
    name: 'Thaumaturgy',
    category: 'spell',
    subtitle: 'Transmutation Cantrip',
    level: 0,
    school: 'Transmutation',
    castingTime: '1 Action',
    range: '30 feet',
    components: 'V',
    duration: 'Up to 1 minute',
    description: 'You manifest a minor wonder, a sign of supernatural power, within range, such as booming your voice three times as loud as normal, causing flames to flicker, causing harmless tremors in the ground, or slamming unlocked doors and windows.'
  },
  'spare the dying': {
    name: 'Spare the Dying',
    category: 'spell',
    subtitle: 'Necromancy Cantrip',
    level: 0,
    school: 'Necromancy',
    castingTime: '1 Action',
    range: 'Touch',
    components: 'V, S',
    duration: 'Instantaneous',
    isHeal: true,
    description: 'You touch a living creature that has 0 hit points. The creature becomes stable. This spell has no effect on undead or constructs.'
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
    damageFormula: '1d10',
    damageType: 'force',
    isAttack: true,
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
    damageFormula: '1d10',
    damageType: 'fire',
    isAttack: true,
    description: 'You hurl a mote of fire at a creature or object within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 fire damage. A flammable object hit by this spell ignites if it isn\'t being worn or carried.\n\nThis spell\'s damage increases by 1d10 when you reach 5th level (2d10), 11th level (3d10), and 17th level (4d10).'
  },
  'ray of frost': {
    name: 'Ray of Frost',
    category: 'spell',
    subtitle: 'Evocation Cantrip',
    level: 0,
    school: 'Evocation',
    castingTime: '1 Action',
    range: '60 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    damageFormula: '1d8',
    damageType: 'cold',
    isAttack: true,
    description: 'A frigid beam of blue-white light streaks toward a creature within range. Make a ranged spell attack against the target. On a hit, it takes 1d8 cold damage, and its speed is reduced by 10 feet until the start of your next turn.\n\nThe spell\'s damage increases by 1d8 when you reach 5th level (2d8), 11th level (3d8), and 17th level (4d8).'
  },
  'booming blade': {
    name: 'Booming Blade',
    category: 'spell',
    subtitle: 'Evocation Cantrip',
    level: 0,
    school: 'Evocation',
    castingTime: '1 Action',
    range: 'Self (5-foot radius)',
    components: 'S, M (a melee weapon worth at least 1 sp)',
    duration: '1 round',
    damageFormula: '1d8',
    damageType: 'thunder',
    isAttack: true,
    description: 'You brandish the weapon used in the spell\'s casting and make a melee attack with it against one creature within 5 feet of you. On a hit, the target suffers the weapon attack\'s normal effects and then becomes sheathed in booming energy until the start of your next turn. If the target willingly moves 5 feet or more before then, the target takes 1d8 thunder damage, and the spell ends.\n\nAt 5th level, the melee attack deals an extra 1d8 thunder damage to the target on a hit, and the damage the target takes for moving increases to 2d8.'
  },
  'chromatic orb': {
    name: 'Chromatic Orb',
    category: 'spell',
    subtitle: '1st-Level Evocation',
    level: 1,
    school: 'Evocation',
    castingTime: '1 Action',
    range: '90 feet',
    components: 'V, S, M (a diamond worth at least 50 gp)',
    duration: 'Instantaneous',
    damageFormula: '3d8',
    damageType: 'elemental',
    isAttack: true,
    description: 'You hurl a 4-inch-diameter sphere of energy at a creature that you can see within range. You choose acid, cold, fire, lightning, poison, or thunder for the type of orb you create, and then make a ranged spell attack against the target. On a hit, the creature takes 3d8 damage of the type you chose.',
    higherLevels: 'When you cast this spell using a spell slot of 2nd level or higher, the damage increases by 1d8 for each slot level above 1st.'
  },
  'magic missile': {
    name: 'Magic Missile',
    category: 'spell',
    subtitle: '1st-Level Evocation',
    level: 1,
    school: 'Evocation',
    castingTime: '1 Action',
    range: '120 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    damageFormula: '3d4 + 3',
    damageType: 'force',
    description: 'You create three glowing darts of magical force. Each dart hits a creature of your choice that you can see within range. A dart deals 1d4 + 1 force damage to its target. The darts all strike simultaneously, and you can direct them to hit one creature or several.',
    higherLevels: 'When you cast this spell using a spell slot of 2nd level or higher, the spell creates one more dart for each slot level above 1st.'
  },
  'scorching ray': {
    name: 'Scorching Ray',
    category: 'spell',
    subtitle: '2nd-Level Evocation',
    level: 2,
    school: 'Evocation',
    castingTime: '1 Action',
    range: '120 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    damageFormula: '2d6',
    damageType: 'fire',
    isAttack: true,
    description: 'You create three rays of fire and hurl them at targets within range. You can hurl them at one target or several. Make a ranged spell attack for each ray. On a hit, the target takes 2d6 fire damage.',
    higherLevels: 'When you cast this spell using a spell slot of 3rd level or higher, you create one additional ray for each slot level above 2nd.'
  },
  'lightning bolt': {
    name: 'Lightning Bolt',
    category: 'spell',
    subtitle: '3rd-Level Evocation',
    level: 3,
    school: 'Evocation',
    castingTime: '1 Action',
    range: 'Self (100-foot line)',
    components: 'V, S, M (a bit of fur and a rod of amber, crystal, or glass)',
    duration: 'Instantaneous',
    damageFormula: '8d6',
    damageType: 'lightning',
    saveAbility: 'DEX',
    description: 'A stroke of lightning forming a line 100 feet long and 5 feet wide blasts out from you in a direction you choose. Each creature in the line must make a Dexterity saving throw. A creature takes 8d6 lightning damage on a failed save, or half as much damage on a successful one.',
    higherLevels: 'When you cast this spell using a spell slot of 4th level or higher, the damage increases by 1d6 for each slot level above 3rd.'
  },
  'cone of cold': {
    name: 'Cone of Cold',
    category: 'spell',
    subtitle: '5th-Level Evocation',
    level: 5,
    school: 'Evocation',
    castingTime: '1 Action',
    range: 'Self (60-foot cone)',
    components: 'V, S, M (a small crystal or glass cone)',
    duration: 'Instantaneous',
    damageFormula: '8d8',
    damageType: 'cold',
    saveAbility: 'CON',
    description: 'A blast of cold air erupts from your hands. Each creature in a 60-foot cone must make a Constitution saving throw. A creature takes 8d8 cold damage on a failed save, or half as much damage on a successful one.',
    higherLevels: 'When you cast this spell using a spell slot of 6th level or higher, the damage increases by 1d8 for each slot level above 5th.'
  },
  'chain lightning': {
    name: 'Chain Lightning',
    category: 'spell',
    subtitle: '6th-Level Evocation',
    level: 6,
    school: 'Evocation',
    castingTime: '1 Action',
    range: '150 feet',
    components: 'V, S, M (a bit of fur; amber, glass, or crystal rod; three silver pins)',
    duration: 'Instantaneous',
    damageFormula: '10d8',
    damageType: 'lightning',
    saveAbility: 'DEX',
    description: 'You create a bolt of lightning that arcs toward a target of your choice that you can see within range. Three bolts then leap from that target to as many as three other targets, each of which must be within 30 feet of the first target. A target must make a Dexterity saving throw, taking 10d8 lightning damage on a failed save, or half as much damage on a successful one.',
    higherLevels: 'When you cast this spell using a spell slot of 7th level or higher, one additional bolt leaps from the first target for each slot level above 6th.'
  },
  'disintegrate': {
    name: 'Disintegrate',
    category: 'spell',
    subtitle: '6th-Level Transmutation',
    level: 6,
    school: 'Transmutation',
    castingTime: '1 Action',
    range: '60 feet',
    components: 'V, S, M (a lodestone and a pinch of dust)',
    duration: 'Instantaneous',
    damageFormula: '10d6 + 40',
    damageType: 'force',
    saveAbility: 'DEX',
    description: 'A thin green ray springs from your pointing finger to a target that you can see within range. The target must make a Dexterity saving throw. On a failed save, the target takes 10d6 + 40 force damage. The target is disintegrated if this damage leaves it with 0 hit points.',
    higherLevels: 'When you cast this spell using a spell slot of 7th level or higher, the damage increases by 3d6 for each slot level above 6th.'
  },
  'wall of fire': {
    name: 'Wall of Fire',
    category: 'spell',
    subtitle: '4th-Level Evocation',
    level: 4,
    school: 'Evocation',
    castingTime: '1 Action',
    range: '120 feet',
    components: 'V, S, M (a small piece of phosphorus)',
    duration: 'Concentration, up to 1 minute',
    damageFormula: '5d8',
    damageType: 'fire',
    saveAbility: 'DEX',
    radiusFeet: 20,
    description: 'You create a wall of fire on a solid surface within range. You can make the wall up to 60 feet long, 20 feet high, and 1 foot thick, or a ringed wall up to 20 feet in diameter, 20 feet high, and 1 foot thick. When the wall appears, each creature within its area must make a Dexterity saving throw, taking 5d8 fire damage on a failed save, or half as much damage on a successful one.',
    higherLevels: 'When you cast this spell using a spell slot of 5th level or higher, the damage increases by 1d8 for each slot level above 4th.'
  },
  'wall of force': {
    name: 'Wall of Force',
    category: 'spell',
    subtitle: '5th-Level Evocation',
    level: 5,
    school: 'Evocation',
    castingTime: '1 Action',
    range: '120 feet',
    components: 'V, S, M (a pinch of powder made by crushing a clear gemstone)',
    duration: 'Concentration, up to 10 minutes',
    radiusFeet: 10,
    description: 'An invisible wall of force springs into existence at a point you choose within range. Nothing can physically pass through the wall. It is immune to all damage and can\'t be dispelled by dispel magic. A disintegrate spell destroys the wall instantly, however.'
  },
  'ice storm': {
    name: 'Ice Storm',
    category: 'spell',
    subtitle: '4th-Level Evocation',
    level: 4,
    school: 'Evocation',
    castingTime: '1 Action',
    range: '300 feet (20-ft radius, 40-ft high cylinder)',
    components: 'V, S, M (a pinch of dust and a few drops of water)',
    duration: 'Instantaneous',
    damageFormula: '2d8 + 4d6',
    damageType: 'cold',
    saveAbility: 'DEX',
    radiusFeet: 20,
    description: 'A hail of rock-hard ice pounds to the ground in a 20-foot-radius, 40-foot-high cylinder centered on a point within range. Each creature in the cylinder must make a Dexterity saving throw. A creature takes 2d8 bludgeoning damage and 4d6 cold damage on a failed save, or half as much damage on a successful one.',
    higherLevels: 'When you cast this spell using a spell slot of 5th level or higher, the bludgeoning damage increases by 1d8 for each slot level above 4th.'
  },
  'mirror image': {
    name: 'Mirror Image',
    category: 'spell',
    subtitle: '2nd-Level Illusion',
    level: 2,
    school: 'Illusion',
    castingTime: '1 Action',
    range: 'Self',
    components: 'V, S',
    duration: '1 minute',
    isSelfAction: true,
    description: 'Three illusory duplicates of yourself appear in your space. Until the spell ends, the duplicates move with you and mimic your actions, shifting position so it\'s impossible to track which image is real. Each time a creature targets you with an attack during the spell\'s duration, roll a d20 to determine whether the attack instead targets one of your duplicates.'
  },
  'haste': {
    name: 'Haste',
    category: 'spell',
    subtitle: '3rd-Level Transmutation',
    level: 3,
    school: 'Transmutation',
    castingTime: '1 Action',
    range: '30 feet',
    components: 'V, S, M (a shaving of licorice root)',
    duration: 'Concentration, up to 1 minute',
    description: 'Choose a willing creature that you can see within range. Until the spell ends, the target\'s speed is doubled, it gains a +2 bonus to AC, it has advantage on Dexterity saving throws, and it gains an additional action on each of its turns (Attack [one weapon attack only], Dash, Disengage, Hide, or Use an Object).'
  },
  'fly': {
    name: 'Fly',
    category: 'spell',
    subtitle: '3rd-Level Transmutation',
    level: 3,
    school: 'Transmutation',
    castingTime: '1 Action',
    range: 'Touch',
    components: 'V, S, M (a wing feather from any bird)',
    duration: 'Concentration, up to 10 minutes',
    description: 'You touch a willing creature. The target gains a flying speed of 60 feet for the duration. When the spell ends, the target falls if it is still aloft, unless it can stop the fall.',
    higherLevels: 'When you cast this spell using a spell slot of 4th level or higher, you can target one additional creature for each slot level above 3rd.'
  },
  'sending': {
    name: 'Sending',
    category: 'spell',
    subtitle: '3rd-Level Evocation',
    level: 3,
    school: 'Evocation',
    castingTime: '1 Action',
    range: 'Unlimited',
    components: 'V, S, M (a short piece of fine copper wire)',
    duration: '1 round',
    description: 'You send a short message of twenty-five words or less to a creature with which you are familiar. The creature hears the message in its mind, recognizes you as the sender if it knows you, and can answer in a like manner immediately.'
  },
  'message': {
    name: 'Message',
    category: 'spell',
    subtitle: 'Transmutation Cantrip',
    level: 0,
    school: 'Transmutation',
    castingTime: '1 Action',
    range: '120 feet',
    components: 'V, S, M (a short piece of copper wire)',
    duration: '1 round',
    description: 'You point your finger toward a creature within range and whisper a message. The target (and only the target) hears the message and can reply in a whisper that only you can hear.'
  },
  'mage hand': {
    name: 'Mage Hand',
    category: 'spell',
    subtitle: 'Conjuration Cantrip',
    level: 0,
    school: 'Conjuration',
    castingTime: '1 Action',
    range: '30 feet',
    components: 'V, S',
    duration: '1 minute',
    description: 'A spectral, floating hand appears at a point you choose within range. You can use the hand to manipulate an object, open an unlocked door or container, stow or retrieve an item from an open container, or pour the contents out of a vial.'
  },
  'prestidigitation': {
    name: 'Prestidigitation',
    category: 'spell',
    subtitle: 'Transmutation Cantrip',
    level: 0,
    school: 'Transmutation',
    castingTime: '1 Action',
    range: '10 feet',
    components: 'V, S',
    duration: 'Up to 1 hour',
    description: 'This spell is a minor magical trick that novice spellcasters use for practice. You create an instantaneous harmless sensory effect, light or snuff a small flame, clean or soil an object, chill/warm/flavor nonliving material, or make a small mark or trinket.'
  },
  'minor illusion': {
    name: 'Minor Illusion',
    category: 'spell',
    subtitle: 'Illusion Cantrip',
    level: 0,
    school: 'Illusion',
    castingTime: '1 Action',
    range: '30 feet',
    components: 'S, M (a bit of fleece)',
    duration: '1 minute',
    description: 'You create a sound or an image of an object within range that lasts for the duration. If a creature uses its action to examine the sound or image, the creature can determine that it is an illusion with a successful Intelligence (Investigation) check against your spell save DC.'
  },
  'dancing lights': {
    name: 'Dancing Lights',
    category: 'spell',
    subtitle: 'Evocation Cantrip',
    level: 0,
    school: 'Evocation',
    castingTime: '1 Action',
    range: '120 feet',
    components: 'V, S, M (a bit of phosphorus or wychwood, or a glowworm)',
    duration: 'Concentration, up to 1 minute',
    description: 'You create up to four torch-sized lights within range, making them appear as torches, lanterns, or glowing orbs that hover in the air for the duration.'
  },
  'counterspell': {
    name: 'Counterspell',
    category: 'spell',
    subtitle: '3rd-Level Abjuration',
    level: 3,
    school: 'Abjuration',
    castingTime: '1 Reaction',
    range: '60 feet',
    components: 'S',
    duration: 'Instantaneous',
    description: 'You attempt to interrupt a creature in the process of casting a spell. If the creature is casting a spell of 3rd level or lower, its spell fails and has no effect. If it is casting a spell of 4th level or higher, make an ability check using your spellcasting ability. The DC equals 10 + the spell\'s level. On a success, the creature\'s spell fails and has no effect.',
    higherLevels: 'When you cast this spell using a spell slot of 4th level or higher, the interrupted spell has no effect if its level is less than or equal to the level of the spell slot you used.'
  },
  'dispel magic': {
    name: 'Dispel Magic',
    category: 'spell',
    subtitle: '3rd-Level Abjuration',
    level: 3,
    school: 'Abjuration',
    castingTime: '1 Action',
    range: '120 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'Choose one creature, object, or magical effect within range. Any spell of 3rd level or lower on the target ends. For each spell of 4th level or higher on the target, make an ability check using your spellcasting ability (DC 10 + the spell\'s level). On a successful check, the spell ends.',
    higherLevels: 'When you cast this spell using a spell slot of 4th level or higher, you automatically end the effects of a spell on the target if the spell\'s level is equal to or less than the level of the spell slot you used.'
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
    description: 'This spell instantly transports you and up to eight willing creatures of your choice that you can see within range, or a single object that you can see within range, to a destination you select.'
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
    damageFormula: '2d10',
    damageType: 'radiant',
    saveAbility: 'CON',
    radiusFeet: 5,
    description: 'A silvery beam of pale light shines down in a 5-foot-radius, 40-foot-high cylinder centered on a point within range. When a creature enters the spell\'s area for the first time on a turn or starts its turn there, it is engulfed in ghostly flames that cause searing pain, and it must make a Constitution saving throw. It takes 2d10 radiant damage on a failed save, or half as much damage on a successful one.',
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
    damageFormula: '3d10',
    damageType: 'lightning',
    saveAbility: 'DEX',
    radiusFeet: 5,
    description: 'A storm cloud appears in the shape of a cylinder that is 10 feet tall with a 60-foot radius, centered on a point you can see 100 feet directly above you. When you cast the spell, choose a point you can see under the cloud. A bolt of lightning flashes down from the cloud to that point. Each creature within 5 feet of that point must make a Dexterity saving throw. A creature takes 3d10 lightning damage on a failed save, or half as much damage on a successful one.',
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
    saveAbility: 'WIS',
    description: 'This spell transforms a creature that you can see within range into a new form. An unwilling creature must make a Wisdom saving throw to avoid the effect. A shapechanger automatically succeeds on this saving throw.'
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
    saveAbility: 'WIS',
    radiusFeet: 15,
    description: 'You create a twisting pattern of colors that weaves through the air inside a 30-foot cube within range. Each creature in the area who sees the pattern must make a Wisdom saving throw. On a failed save, the creature becomes charmed for the duration. While charmed by this spell, the creature is incapacitated and has a speed of 0.'
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
    damageFormula: '3d8',
    damageType: 'thunder',
    saveAbility: 'CON',
    radiusFeet: 10,
    description: 'A sudden loud ringing noise, painfully intense, erupts from a point of your choice within range. Each creature in a 10-foot-radius sphere centered on that point must make a Constitution saving throw. A creature takes 3d8 thunder damage on a failed save, or half as much damage on a successful one.',
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
    saveAbility: 'CON',
    description: 'You magically twist space around another creature you can see within range. The target must succeed on a Constitution saving throw (the target can choose to fail) or be teleported to an unoccupied space of your choice that you can see within range.',
    higherLevels: 'When you cast this spell using a spell slot of 3rd level or higher, the range increases by 30 feet for each slot level above 2nd.'
  },
  "hunter's mark": {
    name: "Hunter's Mark",
    category: 'spell',
    subtitle: '1st-Level Divination',
    level: 1,
    school: 'Divination',
    castingTime: '1 Bonus Action',
    range: '90 feet',
    components: 'V',
    duration: 'Concentration, up to 1 hour',
    damageFormula: '1d6',
    damageType: 'piercing',
    description: 'You choose a creature you can see within range and mystically mark it as your quarry. Until the spell ends, you deal an extra 1d6 damage to the target whenever you hit it with a weapon attack, and you have advantage on any Wisdom (Perception) or Wisdom (Survival) check you make to find it.',
    higherLevels: 'When you cast this spell using a spell slot of 3rd or 4th level, you can maintain your concentration on the spell for up to 8 hours. With a 5th-level slot or higher, up to 24 hours.'
  },
  'hex': {
    name: 'Hex',
    category: 'spell',
    subtitle: '1st-Level Enchantment',
    level: 1,
    school: 'Enchantment',
    castingTime: '1 Bonus Action',
    range: '90 feet',
    components: 'V, S, M (the petrified eye of a newt)',
    duration: 'Concentration, up to 1 hour',
    damageFormula: '1d6',
    damageType: 'necrotic',
    description: 'You place a curse on a creature that you can see within range. Until the spell ends, you deal an extra 1d6 necrotic damage to the target whenever you hit it with an attack. Also, choose one ability when you cast the spell. The target has disadvantage on ability checks made with the chosen ability.'
  },
  'pass without trace': {
    name: 'Pass without Trace',
    category: 'spell',
    subtitle: '2nd-Level Abjuration',
    level: 2,
    school: 'Abjuration',
    castingTime: '1 Action',
    range: 'Self (30-foot radius)',
    components: 'V, S, M (ashes from a burned leaf of mistletoe and a sprig of spruce)',
    duration: 'Concentration, up to 1 hour',
    radiusFeet: 30,
    isSelfAction: true,
    description: 'A veil of shadows and silence radiates from you, masking you and your companions from detection. For the duration, each creature you choose within 30 feet of you (including you) has a +10 bonus to Dexterity (Stealth) checks and can\'t be tracked except by magical means.'
  },
  'ensnaring strike': {
    name: 'Ensnaring Strike',
    category: 'spell',
    subtitle: '1st-Level Conjuration',
    level: 1,
    school: 'Conjuration',
    castingTime: '1 Bonus Action',
    range: 'Self',
    components: 'V',
    duration: 'Concentration, up to 1 minute',
    damageFormula: '1d6',
    damageType: 'piercing',
    saveAbility: 'STR',
    isSelfAction: true,
    description: 'The next time you hit a creature with a weapon attack before this spell ends, a writhing mass of thorny vines appears at the point of impact, and the target must succeed on a Strength saving throw or be restrained by the magical vines until the spell ends. While restrained by the vines, the target takes 1d6 piercing damage at the start of each of its turns.',
    higherLevels: 'If you cast this spell using a spell slot of 2nd level or higher, the damage increases by 1d6 for each slot level above 1st.'
  },
  'zephyr strike': {
    name: 'Zephyr Strike',
    category: 'spell',
    subtitle: '1st-Level Transmutation',
    level: 1,
    school: 'Transmutation',
    castingTime: '1 Bonus Action',
    range: 'Self',
    components: 'V',
    duration: 'Concentration, up to 1 minute',
    damageFormula: '1d8',
    damageType: 'force',
    isSelfAction: true,
    description: 'You move like the wind. Until the spell ends, your movement doesn\'t provoke opportunity attacks. Once before the spell ends, you can give yourself advantage on one weapon attack roll on your turn. That attack deals an extra 1d8 force damage on a hit, and yourwalking speed increases by 30 feet until the end of that turn.'
  },
  'goodberry': {
    name: 'Goodberry',
    category: 'spell',
    subtitle: '1st-Level Transmutation',
    level: 1,
    school: 'Transmutation',
    castingTime: '1 Action',
    range: 'Touch',
    components: 'V, S, M (a sprig of mistletoe)',
    duration: 'Instantaneous',
    damageFormula: '10',
    damageType: 'healing',
    isHeal: true,
    description: 'Up to ten berries appear in your hand and are infused with magic for the duration. A creature can use its action to eat one berry. Eating a berry restores 1 hit point, and the berry provides enough nourishment to sustain a creature for one day.'
  },
  'fog cloud': {
    name: 'Fog Cloud',
    category: 'spell',
    subtitle: '1st-Level Conjuration',
    level: 1,
    school: 'Conjuration',
    castingTime: '1 Action',
    range: '120 feet (20-ft radius sphere)',
    components: 'V, S',
    duration: 'Concentration, up to 1 hour',
    radiusFeet: 20,
    description: 'You create a 20-foot-radius sphere of fog centered on a point within range. The sphere spreads around corners, and its area is heavily obscured.',
    higherLevels: 'When you cast this spell using a spell slot of 2nd level or higher, the radius of the fog increases by 20 feet for each slot level above 1st.'
  },
  'darkness': {
    name: 'Darkness',
    category: 'spell',
    subtitle: '2nd-Level Evocation',
    level: 2,
    school: 'Evocation',
    castingTime: '1 Action',
    range: '60 feet (15-ft radius sphere)',
    components: 'V, M (bat fur and a drop of pitch or piece of coal)',
    duration: 'Concentration, up to 10 minutes',
    radiusFeet: 15,
    description: 'Magical darkness spreads from a point you choose within range to fill a 15-foot-radius sphere for the duration. The darkness spreads around corners. A creature with darkvision can\'t see through this darkness, and nonmagical light can\'t illuminate it.'
  },
  'faerie fire': {
    name: 'Faerie Fire',
    category: 'spell',
    subtitle: '1st-Level Evocation',
    level: 1,
    school: 'Evocation',
    castingTime: '1 Action',
    range: '60 feet (20-ft cube)',
    components: 'V',
    duration: 'Concentration, up to 1 minute',
    saveAbility: 'DEX',
    radiusFeet: 10,
    description: 'Each object in a 20-foot cube within range is outlined in blue, green, or violet light. Any creature in the area when the spell is cast is also outlined in light if it fails a Dexterity saving throw. Any attack roll against an affected creature or object has advantage if the attacker can see it, and the affected creature or object can\'t benefit from being invisible.'
  },
  'entangle': {
    name: 'Entangle',
    category: 'spell',
    subtitle: '1st-Level Conjuration',
    level: 1,
    school: 'Conjuration',
    castingTime: '1 Action',
    range: '90 feet (20-ft square)',
    components: 'V, S',
    duration: 'Concentration, up to 1 minute',
    saveAbility: 'STR',
    radiusFeet: 10,
    description: 'Grasping weeds and vines sprout from the ground in a 20-foot square starting from a point within range. For the duration, these plants turn the ground in the area into difficult terrain. A creature in the area when you cast the spell must succeed on a Strength saving throw or be restrained by the entangling plants until the spell ends.'
  },
  'web': {
    name: 'Web',
    category: 'spell',
    subtitle: '2nd-Level Conjuration',
    level: 2,
    school: 'Conjuration',
    castingTime: '1 Action',
    range: '60 feet (20-ft cube)',
    components: 'V, S, M (a bit of spiderweb)',
    duration: 'Concentration, up to 1 hour',
    saveAbility: 'DEX',
    radiusFeet: 10,
    description: 'You conjure a mass of thick, sticky webbing at a point of your choice within range. Each creature that starts its turn in the webs or that enters them during its turn must make a Dexterity saving throw. On a failed save, the creature is restrained as long as it remains in the webs or until it breaks free.'
  },
  'heat metal': {
    name: 'Heat Metal',
    category: 'spell',
    subtitle: '2nd-Level Transmutation',
    level: 2,
    school: 'Transmutation',
    castingTime: '1 Action',
    range: '60 feet',
    components: 'V, S, M (a piece of iron and a flame)',
    duration: 'Concentration, up to 1 minute',
    damageFormula: '2d8',
    damageType: 'fire',
    saveAbility: 'CON',
    description: 'Choose a manufactured metal object, such as a metal weapon or a suit of heavy or medium metal armor, that you can see within range. You cause the object to glow red-hot. Any creature in physical contact with the object takes 2d8 fire damage when you cast the spell. Until the spell ends, you can use a bonus action on each of your subsequent turns to cause this damage again.',
    higherLevels: 'When you cast this spell using a spell slot of 3rd level or higher, the damage increases by 1d8 for each slot level above 2nd.'
  },
  'enlarge/reduce': {
    name: 'Enlarge/Reduce',
    category: 'spell',
    subtitle: '2nd-Level Transmutation',
    level: 2,
    school: 'Transmutation',
    castingTime: '1 Action',
    range: '30 feet',
    components: 'V, S, M (a pinch of powdered iron)',
    duration: 'Concentration, up to 1 minute',
    damageFormula: '1d4',
    damageType: 'bludgeoning',
    saveAbility: 'CON',
    description: 'You cause a creature or an object you can see within range to grow larger or smaller for the duration. Enlarge: The target\'s size doubles in all dimensions, it has advantage on Strength checks and Strength saving throws, and its weapons deal 1d4 extra damage. Reduce: The target\'s size is halved, it has disadvantage on Strength checks and saving throws, and its weapons deal 1d4 less damage.'
  },
  'invisibility': {
    name: 'Invisibility',
    category: 'spell',
    subtitle: '2nd-Level Illusion',
    level: 2,
    school: 'Illusion',
    castingTime: '1 Action',
    range: 'Touch',
    components: 'V, S, M (an eyelash encased in gum arabic)',
    duration: 'Concentration, up to 1 hour',
    description: 'A creature you touch becomes invisible until the spell ends. Anything the target is wearing or carrying is invisible as long as it is on the target\'s person. The spell ends for a target that attacks or casts a spell.',
    higherLevels: 'When you cast this spell using a spell slot of 3rd level or higher, you can target one additional creature for each slot level above 2nd.'
  },
  'greater invisibility': {
    name: 'Greater Invisibility',
    category: 'spell',
    subtitle: '4th-Level Illusion',
    level: 4,
    school: 'Illusion',
    castingTime: '1 Action',
    range: 'Touch',
    components: 'V, S',
    duration: 'Concentration, up to 1 minute',
    description: 'You or a creature you touch becomes invisible until the spell ends. Anything the target is wearing or carrying is invisible as long as it is on the target\'s person.'
  },
  'vicious mockery': {
    name: 'Vicious Mockery',
    category: 'spell',
    subtitle: 'Enchantment Cantrip',
    level: 0,
    school: 'Enchantment',
    castingTime: '1 Action',
    range: '60 feet',
    components: 'V',
    duration: 'Instantaneous',
    damageFormula: '1d4',
    damageType: 'psychic',
    saveAbility: 'WIS',
    description: 'You unleash a string of insults laced with subtle enchantments at a creature you can see within range. If the target can hear you, it must succeed on a Wisdom saving throw or take 1d4 psychic damage and have disadvantage on the next attack roll it makes before the end of its next turn.\n\nThis spell\'s damage increases by 1d4 when you reach 5th level (2d4), 11th level (3d4), and 17th level (4d4).'
  },
  'dissonant whispers': {
    name: 'Dissonant Whispers',
    category: 'spell',
    subtitle: '1st-Level Enchantment',
    level: 1,
    school: 'Enchantment',
    castingTime: '1 Action',
    range: '60 feet',
    components: 'V',
    duration: 'Instantaneous',
    damageFormula: '3d6',
    damageType: 'psychic',
    saveAbility: 'WIS',
    description: 'You whisper a discordant melody that only one creature of your choice within range can hear, wracking it with terrible pain. The target must make a Wisdom saving throw. On a failed save, it takes 3d6 psychic damage and must immediately use its reaction, if available, to move as far as its speed allows away from you. On a successful save, the target takes half as much damage and doesn\'t have to move away.',
    higherLevels: 'When you cast this spell using a spell slot of 2nd level or higher, the damage increases by 1d6 for each slot level above 1st.'
  },
  'silvery barbs': {
    name: 'Silvery Barbs',
    category: 'spell',
    subtitle: '1st-Level Enchantment',
    level: 1,
    school: 'Enchantment',
    castingTime: '1 Reaction',
    range: '60 feet',
    components: 'V',
    duration: 'Instantaneous',
    description: 'You magically distract the triggering creature and turn its momentary uncertainty into encouragement for another creature. The triggering creature must reroll the d20 and use the lower roll. You can then choose a different creature you can see within range (you can choose yourself). The chosen creature has advantage on the next attack roll, ability check, or saving throw it makes within 1 minute.'
  },
  'druidcraft': {
    name: 'Druidcraft',
    category: 'spell',
    subtitle: 'Transmutation Cantrip',
    level: 0,
    school: 'Transmutation',
    castingTime: '1 Action',
    range: '30 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'Whispering to the spirits of nature, you create one of the following effects within range: create a tiny harmless sensory effect that predicts the weather, instantly make a flower blossom or seed pod open, create an instantaneous harmless sensory effect of nature, or instantly light or snuff out a small flame.'
  },
  'frostbite': {
    name: 'Frostbite',
    category: 'spell',
    subtitle: 'Evocation Cantrip',
    level: 0,
    school: 'Evocation',
    castingTime: '1 Action',
    range: '60 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    damageFormula: '1d6',
    damageType: 'cold',
    saveAbility: 'CON',
    description: 'You cause numbing frost to form on one creature that you can see within range. The target must make a Constitution saving throw. On a failed save, the target takes 1d6 cold damage, and it has disadvantage on the next weapon attack roll it makes before the end of its next turn.\n\nThe spell\'s damage increases by 1d6 when you reach 5th level (2d6), 11th level (3d6), and 17th level (4d6).'
  },
  'starry wisp': {
    name: 'Starry Wisp',
    category: 'spell',
    subtitle: 'Evocation Cantrip',
    level: 0,
    school: 'Evocation',
    castingTime: '1 Action',
    range: '60 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    damageFormula: '1d8',
    damageType: 'radiant',
    isAttack: true,
    description: 'You launch a mote of light at one creature or object within range. Make a ranged spell attack against the target. On a hit, the target takes 1d8 Radiant damage, and until the end of your next turn, it emits Dim Light in a 10-foot radius and can\'t benefit from the Invisible condition.\n\nThe damage increases by 1d8 when you reach levels 5 (2d8), 11 (3d8), and 17 (4d8).'
  },
  'elementalism': {
    name: 'Elementalism',
    category: 'spell',
    subtitle: 'Transmutation Cantrip',
    level: 0,
    school: 'Transmutation',
    castingTime: '1 Action',
    range: '30 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'You exert control over the elements within range, creating one of the following effects: Beckon Air (breeze), Beckon Earth (dust/sand), Beckon Fire (embers/sparks), Beckon Water (mist/dampen), or Sculpt Element (shape a 1-foot cube of earth, fire, water, or mist).'
  },
  'summon beast': {
    name: 'Summon Beast',
    category: 'spell',
    subtitle: '2nd-Level Conjuration',
    level: 2,
    school: 'Conjuration',
    castingTime: '1 Action',
    range: '90 feet',
    components: 'V, S, M (a feather, tuft of fur, and fish tail inside a gilded acorn worth at least 200 gp)',
    duration: 'Concentration, up to 1 hour',
    damageFormula: '1d8 + 4',
    damageType: 'piercing',
    isAttack: true,
    description: 'You call forth a bestial spirit. It manifests in an unoccupied space that you can see within range. This corporeal form uses the Bestial Spirit stat block (Air, Land, or Water) and acts as an ally to you and your companions.',
    higherLevels: 'When you cast this spell using a spell slot of 3rd level or higher, use the higher level wherever the spell\'s level appears in the stat block.'
  },
  'healing spirit': {
    name: 'Healing Spirit',
    category: 'spell',
    subtitle: '2nd-Level Conjuration',
    level: 2,
    school: 'Conjuration',
    castingTime: '1 Bonus Action',
    range: '60 feet (5-ft cube)',
    components: 'V, S',
    duration: 'Concentration, up to 1 minute',
    damageFormula: '1d6',
    damageType: 'healing',
    isHeal: true,
    description: 'You call forth a nature spirit to soothe the wounded. The intangible spirit appears in a space that is a 5-foot cube you can see within range. Whenever you or a creature you can see moves into the spirit\'s space for the first time on a turn or starts its turn there, you can cause the spirit to restore 1d6 hit points to that creature.',
    higherLevels: 'When you cast this spell using a spell slot of 3rd level or higher, the healing increases by 1d6 for each slot level above 2nd.'
  },
  'conjure animals': {
    name: 'Conjure Animals',
    category: 'spell',
    subtitle: '3rd-Level Conjuration',
    level: 3,
    school: 'Conjuration',
    castingTime: '1 Action',
    range: '60 feet',
    components: 'V, S',
    duration: 'Concentration, up to 1 hour',
    damageFormula: '3d10',
    damageType: 'slashing',
    saveAbility: 'DEX',
    radiusFeet: 10,
    description: 'You summon fey spirits that take the form of beasts and appear in unoccupied spaces that you can see within range. The pack of spectral beasts harries hostile creatures near them, dealing slashing damage and bolstering your allies.'
  },
  'hellish rebuke': {
    name: 'Hellish Rebuke',
    category: 'spell',
    subtitle: '1st-Level Evocation',
    level: 1,
    school: 'Evocation',
    castingTime: '1 Reaction',
    range: '60 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    damageFormula: '2d10',
    damageType: 'fire',
    saveAbility: 'DEX',
    description: 'You point your finger, and the creature that damaged you is momentarily surrounded by hellish flames. The creature must make a Dexterity saving throw. It takes 2d10 fire damage on a failed save, or half as much damage on a successful one.',
    higherLevels: 'When you cast this spell using a spell slot of 2nd level or higher, the damage increases by 1d10 for each slot level above 1st.'
  },
  'armor of agathys': {
    name: 'Armor of Agathys',
    category: 'spell',
    subtitle: '1st-Level Abjuration',
    level: 1,
    school: 'Abjuration',
    castingTime: '1 Action',
    range: 'Self',
    components: 'V, S, M (a cup of water)',
    duration: '1 hour',
    damageFormula: '5',
    damageType: 'cold',
    isSelfAction: true,
    description: 'A protective magical frost surrounds you, manifesting as spectral frost that covers you and your gear. You gain 5 temporary hit points for the duration. If a creature hits you with a melee attack while you have these hit points, the creature takes 5 cold damage.',
    higherLevels: 'When you cast this spell using a spell slot of 2nd level or higher, both the temporary hit points and the cold damage increase by 5 for each slot level above 1st.'
  },
  'arms of hadar': {
    name: 'Arms of Hadar',
    category: 'spell',
    subtitle: '1st-Level Conjuration',
    level: 1,
    school: 'Conjuration',
    castingTime: '1 Action',
    range: 'Self (10-foot radius)',
    components: 'V, S',
    duration: 'Instantaneous',
    damageFormula: '2d6',
    damageType: 'necrotic',
    saveAbility: 'STR',
    radiusFeet: 10,
    description: 'You invoke the power of Hadar, the Dark Hunger. Tendrils of dark energy erupt from you and batter all creatures within 10 feet of you. Each creature in that area must make a Strength saving throw. On a failed save, a target takes 2d6 necrotic damage and can\'t take reactions until its next turn. On a successful save, the creature takes half damage.',
    higherLevels: 'When you cast this spell using a spell slot of 2nd level or higher, the damage increases by 1d6 for each slot level above 1st.'
  },
  'hunger of hadar': {
    name: 'Hunger of Hadar',
    category: 'spell',
    subtitle: '3rd-Level Conjuration',
    level: 3,
    school: 'Conjuration',
    castingTime: '1 Action',
    range: '150 feet (20-ft radius sphere)',
    components: 'V, S, M (a pickled octopus tentacle)',
    duration: 'Concentration, up to 1 minute',
    damageFormula: '2d6',
    damageType: 'cold',
    saveAbility: 'DEX',
    radiusFeet: 20,
    description: 'You open a gateway to the dark between the stars, a region infested with unknown horrors. A 20-foot-radius sphere of blackness and bitter cold appears, centered on a point within range. Any creature that starts its turn in the area takes 2d6 cold damage. Any creature that ends its turn in the area must succeed on a Dexterity saving throw or take 2d6 acid damage as milky, otherworldly tentacles rub against it.'
  },
  'blight': {
    name: 'Blight',
    category: 'spell',
    subtitle: '4th-Level Necromancy',
    level: 4,
    school: 'Necromancy',
    castingTime: '1 Action',
    range: '30 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    damageFormula: '8d8',
    damageType: 'necrotic',
    saveAbility: 'CON',
    description: 'Necromantic energy washes over a creature of your choice that you can see within range, draining moisture and vitality from it. The target must make a Constitution saving throw. The target takes 8d8 necrotic damage on a failed save, or half as much damage on a successful one.',
    higherLevels: 'When you cast this spell using a spell slot of 5th level or higher, the damage increases by 1d8 for each slot level above 4th.'
  },
  'circle of death': {
    name: 'Circle of Death',
    category: 'spell',
    subtitle: '6th-Level Necromancy',
    level: 6,
    school: 'Necromancy',
    castingTime: '1 Action',
    range: '150 feet (60-ft radius sphere)',
    components: 'V, S, M (the powder of a crushed black pearl worth at least 500 gp)',
    duration: 'Instantaneous',
    damageFormula: '8d6',
    damageType: 'necrotic',
    saveAbility: 'CON',
    radiusFeet: 60,
    description: 'A sphere of negative energy ripples out in a 60-foot-radius sphere from a point within range. Each creature in that area must make a Constitution saving throw. A target takes 8d6 necrotic damage on a failed save, or half as much damage on a successful one.',
    higherLevels: 'When you cast this spell using a spell slot of 7th level or higher, the damage increases by 2d6 for each slot level above 6th.'
  },
  'finger of death': {
    name: 'Finger of Death',
    category: 'spell',
    subtitle: '7th-Level Necromancy',
    level: 7,
    school: 'Necromancy',
    castingTime: '1 Action',
    range: '60 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    damageFormula: '7d8 + 30',
    damageType: 'necrotic',
    saveAbility: 'CON',
    description: 'You send negative energy coursing through a creature that you can see within range, causing it searing pain. The target must make a Constitution saving throw. It takes 7d8 + 30 necrotic damage on a failed save, or half as much damage on a successful one. A humanoid killed by this spell rises at the start of your next turn as a zombie under your command.'
  },
  'crown of stars': {
    name: 'Crown of Stars',
    category: 'spell',
    subtitle: '7th-Level Evocation',
    level: 7,
    school: 'Evocation',
    castingTime: '1 Action',
    range: 'Self (120 feet)',
    components: 'V, S',
    duration: '1 hour',
    damageFormula: '4d12',
    damageType: 'radiant',
    isAttack: true,
    description: 'Seven star-like motes of light appear and orbit your head until the spell ends. You can use a bonus action to send one of the motes streaking toward one creature or object within 120 feet of you. When you do so, make a ranged spell attack. On a hit, the target takes 4d12 radiant damage.'
  },
  'divine smite': {
    name: 'Divine Smite',
    category: 'spell',
    subtitle: '1st-Level Evocation (Paladin)',
    level: 1,
    school: 'Evocation',
    castingTime: '1 Bonus Action',
    range: 'Touch (5 feet)',
    components: 'V',
    duration: 'Instantaneous',
    damageFormula: '2d8',
    damageType: 'radiant',
    description: 'When you hit a creature with a melee weapon attack, you can expend one spell slot to deal radiant damage to the target, in addition to the weapon\'s damage. The extra damage is 2d8 for a 1st-level spell slot, plus 1d8 for each spell level higher than 1st, to a maximum of 5d8. The damage increases by 1d8 if the target is an undead or a fiend.',
    higherLevels: 'When you expend a spell slot of 2nd level or higher, the radiant damage increases by 1d8 for each slot level above 1st (up to 5d8).'
  },
  'wrathful smite': {
    name: 'Wrathful Smite',
    category: 'spell',
    subtitle: '1st-Level Evocation',
    level: 1,
    school: 'Evocation',
    castingTime: '1 Bonus Action',
    range: 'Self',
    components: 'V',
    duration: 'Concentration, up to 1 minute',
    damageFormula: '1d6',
    damageType: 'psychic',
    saveAbility: 'WIS',
    isSelfAction: true,
    description: 'The next time you hit with a melee weapon attack during this spell\'s duration, your attack deals an extra 1d6 psychic damage. Additionally, if the target is a creature, it must make a Wisdom saving throw or be frightened of you until the spell ends.'
  },
  'thunderous smite': {
    name: 'Thunderous Smite',
    category: 'spell',
    subtitle: '1st-Level Evocation',
    level: 1,
    school: 'Evocation',
    castingTime: '1 Bonus Action',
    range: 'Self',
    components: 'V',
    duration: 'Concentration, up to 1 minute',
    damageFormula: '2d6',
    damageType: 'thunder',
    saveAbility: 'STR',
    isSelfAction: true,
    description: 'The first time you hit with a melee weapon attack during this spell\'s duration, your weapon rings with thunder that is audible within 300 feet of you, and the attack deals an extra 2d6 thunder damage to the target. Additionally, if the target is a creature, it must succeed on a Strength saving throw or be pushed 10 feet away from you and knocked prone.'
  },
  'branding smite': {
    name: 'Branding Smite',
    category: 'spell',
    subtitle: '2nd-Level Evocation',
    level: 2,
    school: 'Evocation',
    castingTime: '1 Bonus Action',
    range: 'Self',
    components: 'V',
    duration: 'Concentration, up to 1 minute',
    damageFormula: '2d6',
    damageType: 'radiant',
    isSelfAction: true,
    description: 'The next time you hit a creature with a weapon attack before this spell ends, the weapon gleams with astral radiance as you strike. The attack deals an extra 2d6 radiant damage to the target, which becomes visible if it\'s invisible, and the target sheds dim light in a 5-foot radius and can\'t become invisible until the spell ends.',
    higherLevels: 'When you cast this spell using a spell slot of 3rd level or higher, the extra damage increases by 1d6 for each slot level above 2nd.'
  }
};

/**
 * Searches the unified compendium for full text details on a spell, condition, or aura.
 */
export function lookupDndRuleDetails(rawName: string, categoryHint?: 'spell' | 'condition' | 'aura', radiusFeet?: number, castAtLevel?: number): DndRuleEntry | null {
  if (!rawName || typeof rawName !== 'string') return null;
  const clean = rawName.replace(/\s*\(.*?\)\s*/g, '').trim();
  const lower = clean.toLowerCase();

  // If categoryHint is 'spell', check exact DND_COMMON_SPELLS first before anything else
  if (categoryHint === 'spell') {
    if (DND_COMMON_SPELLS[lower]) {
      return DND_COMMON_SPELLS[lower];
    }
    const sortedSpellKeys = Object.keys(DND_COMMON_SPELLS).sort((a, b) => b.length - a.length);
    for (const key of sortedSpellKeys) {
      if (lower.includes(key) || key.includes(lower)) {
        return DND_COMMON_SPELLS[key];
      }
    }
  }

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
        radiusFeet: direct.radiusFt,
        range: `${direct.radiusFt} ft radius`,
        description: direct.description,
        higherLevels: direct.higherLevels
      };
    }
    const sortedAuraKeys = Object.keys(DND_AURA_DESCRIPTIONS).sort((a, b) => b.length - a.length);
    for (const key of sortedAuraKeys) {
      const val = DND_AURA_DESCRIPTIONS[key];
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
          radiusFeet: val.radiusFt,
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
  const sortedSpellKeys = Object.keys(DND_COMMON_SPELLS).sort((a, b) => b.length - a.length);
  for (const key of sortedSpellKeys) {
    if (lower.includes(key) || key.includes(lower)) {
      return DND_COMMON_SPELLS[key];
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
        radiusFeet: val.radiusFt,
        range: `${val.radiusFt} ft radius`,
        description: val.description,
        higherLevels: val.higherLevels
      };
    }
  }

  return null;
}
