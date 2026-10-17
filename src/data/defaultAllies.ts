import { Ally } from '../types/ally';

export const DEFAULT_ALLIES: Ally[] = [
  // ==========================================
  // DRUID SUMMONS (The Most Commonly Summoned)
  // ==========================================
  {
    allyId: 'ally_dire_wolf',
    name: 'Dire Wolf',
    size: 'Large',
    type: 'Beast',
    summonSource: 'Druid (Conjure Animals / Wild Shape)',
    alignment: 'Unaligned',
    ac: 14,
    acNotes: '(natural armor)',
    hp: 37,
    hpFormula: '(5d10 + 10)',
    speed: '50 ft.',
    initiativeBonus: 2,
    str: 17,
    dex: 15,
    con: 15,
    int: 3,
    wis: 12,
    cha: 7,
    skills: 'Perception +3, Stealth +4',
    senses: 'Passive Perception 13',
    languages: '—',
    challenge: '1 (200 XP)',
    proficiencyBonus: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/47158/804/638742831347754764.png',
    traits: [
      {
        name: 'Keen Hearing and Smell',
        description: 'The wolf has advantage on Wisdom (Perception) checks that rely on hearing or smell.'
      },
      {
        name: 'Pack Tactics',
        description: 'The wolf has advantage on an attack roll against a creature if at least one of the wolf\'s allies is within 5 feet of the creature and the ally isn\'t incapacitated.'
      }
    ],
    actions: [
      {
        name: 'Bite',
        type: 'attack',
        attackBonus: 5,
        reachRange: 'reach 5 ft.',
        damage: '10 (2d6 + 3) piercing',
        description: 'Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) piercing damage. If the target is a creature, it must succeed on a DC 13 Strength saving throw or be knocked prone.'
      }
    ],
    description: 'A terrifying, massive predator commonly summoned in packs by druids to trip and overwhelm foes.',
    source: 'SRD 5.1 / Druid Summons',
    category: 'ally'
  },
  {
    allyId: 'ally_brown_bear',
    name: 'Brown Bear',
    size: 'Large',
    type: 'Beast',
    summonSource: 'Druid (Conjure Animals / Wild Shape)',
    alignment: 'Unaligned',
    ac: 11,
    acNotes: '(natural armor)',
    hp: 34,
    hpFormula: '(4d10 + 12)',
    speed: '40 ft., climb 30 ft.',
    initiativeBonus: 0,
    str: 19,
    dex: 10,
    con: 16,
    int: 2,
    wis: 13,
    cha: 7,
    skills: 'Perception +3',
    senses: 'Passive Perception 13',
    languages: '—',
    challenge: '1 (200 XP)',
    proficiencyBonus: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/43939/60/638607413478213174.png',
    traits: [
      {
        name: 'Keen Smell',
        description: 'The bear has advantage on Wisdom (Perception) checks that rely on smell.'
      }
    ],
    actions: [
      {
        name: 'Multiattack',
        type: 'multiattack',
        description: 'The bear makes two attacks: one with its bite and one with its claws.'
      },
      {
        name: 'Bite',
        type: 'attack',
        attackBonus: 5,
        reachRange: 'reach 5 ft.',
        damage: '8 (1d8 + 4) piercing',
        description: 'Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 8 (1d8 + 4) piercing damage.'
      },
      {
        name: 'Claws',
        type: 'attack',
        attackBonus: 5,
        reachRange: 'reach 5 ft.',
        damage: '11 (2d6 + 4) slashing',
        description: 'Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) slashing damage.'
      }
    ],
    description: 'A hulking frontline brawler, delivering devastating multiattacks with claws and jaws.',
    source: 'SRD 5.1 / Druid Summons',
    category: 'ally'
  },
  {
    allyId: 'ally_giant_spider',
    name: 'Giant Spider',
    size: 'Large',
    type: 'Beast',
    summonSource: 'Druid (Conjure Animals / Wild Shape)',
    alignment: 'Unaligned',
    ac: 14,
    acNotes: '(natural armor)',
    hp: 26,
    hpFormula: '(4d10 + 4)',
    speed: '30 ft., climb 30 ft.',
    initiativeBonus: 3,
    str: 14,
    dex: 16,
    con: 12,
    int: 2,
    wis: 11,
    cha: 4,
    skills: 'Stealth +7',
    senses: 'Blindsight 10 ft., Darkvision 60 ft., Passive Perception 10',
    languages: '—',
    challenge: '1 (200 XP)',
    proficiencyBonus: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/30849/299/638064499038216933.png',
    traits: [
      {
        name: 'Spider Climb',
        description: 'The spider can climb difficult surfaces, including upside down on ceilings, without needing to make an ability check.'
      },
      {
        name: 'Web Sense',
        description: 'While in contact with a web, the spider knows the exact location of any other creature in contact with the same web.'
      },
      {
        name: 'Web Walker',
        description: 'The spider ignores movement restrictions caused by webbing.'
      }
    ],
    actions: [
      {
        name: 'Bite',
        type: 'attack',
        attackBonus: 5,
        reachRange: 'reach 5 ft.',
        damage: '7 (1d8 + 3) piercing plus 9 (2d8) poison',
        description: 'Melee Weapon Attack: +5 to hit, reach 5 ft., one creature. Hit: 7 (1d8 + 3) piercing damage, and the target must make a DC 11 Constitution saving throw, taking 9 (2d8) poison damage on a failed save, or half as much on a successful one.'
      },
      {
        name: 'Web (Recharge 5–6)',
        type: 'special',
        attackBonus: 5,
        reachRange: 'range 30/60 ft.',
        description: 'Ranged Weapon Attack: +5 to hit, range 30/60 ft., one creature. Hit: The target is restrained by webbing (escape DC 12).'
      }
    ],
    description: 'Expert battlefield control summon capable of shooting webs and climbing any surface.',
    source: 'SRD 5.1 / Druid Summons',
    category: 'ally'
  },
  {
    allyId: 'ally_giant_badger',
    name: 'Giant Badger',
    size: 'Medium',
    type: 'Beast',
    summonSource: 'Druid (Conjure Animals / Wild Shape)',
    alignment: 'Unaligned',
    ac: 10,
    hp: 13,
    hpFormula: '(2d8 + 4)',
    speed: '30 ft., burrow 10 ft.',
    initiativeBonus: 0,
    str: 13,
    dex: 10,
    con: 15,
    int: 2,
    wis: 12,
    cha: 5,
    senses: 'Darkvision 30 ft., Passive Perception 11',
    languages: '—',
    challenge: '1/4 (50 XP)',
    proficiencyBonus: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/16/530/636376327839601860.jpeg',
    traits: [
      {
        name: 'Keen Smell',
        description: 'The badger has advantage on Wisdom (Perception) checks that rely on smell.'
      }
    ],
    actions: [
      {
        name: 'Multiattack',
        type: 'multiattack',
        description: 'The badger makes two attacks: one with its bite and one with its claws.'
      },
      {
        name: 'Bite',
        type: 'attack',
        attackBonus: 3,
        reachRange: 'reach 5 ft.',
        damage: '4 (1d6 + 1) piercing',
        description: 'Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) piercing damage.'
      },
      {
        name: 'Claws',
        type: 'attack',
        attackBonus: 3,
        reachRange: 'reach 5 ft.',
        damage: '6 (2d4 + 1) slashing',
        description: 'Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 6 (2d4 + 1) slashing damage.'
      }
    ],
    description: 'A fierce burrowing summon that can tunnel beneath walls and defenses.',
    source: 'SRD 5.1 / Druid Summons',
    category: 'ally'
  },
  {
    allyId: 'ally_giant_owl',
    name: 'Giant Owl',
    size: 'Large',
    type: 'Beast',
    summonSource: 'Druid (Conjure Animals / Wild Shape)',
    alignment: 'Neutral',
    ac: 12,
    hp: 19,
    hpFormula: '(3d10 + 3)',
    speed: '10 ft., fly 60 ft.',
    initiativeBonus: 2,
    str: 13,
    dex: 15,
    con: 12,
    int: 8,
    wis: 13,
    cha: 10,
    skills: 'Perception +5, Stealth +4',
    senses: 'Darkvision 120 ft., Passive Perception 15',
    languages: 'Giant Owl, understands Common, Elvish, Sylvan',
    challenge: '1/4 (50 XP)',
    proficiencyBonus: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/16/535/636376331788287090.jpeg',
    traits: [
      {
        name: 'Flyby',
        description: 'The owl doesn\'t provoke opportunity attacks when it flies out of an enemy\'s reach.'
      },
      {
        name: 'Keen Hearing and Sight',
        description: 'The owl has advantage on Wisdom (Perception) checks that rely on hearing or sight.'
      }
    ],
    actions: [
      {
        name: 'Talons',
        type: 'attack',
        attackBonus: 3,
        reachRange: 'reach 5 ft.',
        damage: '8 (2d6 + 1) slashing',
        description: 'Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 8 (2d6 + 1) slashing damage.'
      }
    ],
    description: 'An intelligent winged mount and scout that strikes without provoking opportunity attacks.',
    source: 'SRD 5.1 / Druid Summons',
    category: 'ally'
  },
  {
    allyId: 'ally_giant_constrictor_snake',
    name: 'Giant Constrictor Snake',
    size: 'Huge',
    type: 'Beast',
    summonSource: 'Druid (Conjure Animals / Wild Shape)',
    alignment: 'Unaligned',
    ac: 12,
    hp: 60,
    hpFormula: '(8d12 + 8)',
    speed: '30 ft., swim 30 ft.',
    initiativeBonus: 2,
    str: 19,
    dex: 14,
    con: 12,
    int: 1,
    wis: 10,
    cha: 3,
    skills: 'Perception +2',
    senses: 'Blindsight 10 ft., Passive Perception 12',
    languages: '—',
    challenge: '2 (450 XP)',
    proficiencyBonus: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/47138/856/638741964104306226.png',
    actions: [
      {
        name: 'Bite',
        type: 'attack',
        attackBonus: 6,
        reachRange: 'reach 10 ft.',
        damage: '11 (2d6 + 4) piercing',
        description: 'Melee Weapon Attack: +6 to hit, reach 10 ft., one creature. Hit: 11 (2d6 + 4) piercing damage.'
      },
      {
        name: 'Constrict',
        type: 'attack',
        attackBonus: 6,
        reachRange: 'reach 5 ft.',
        damage: '13 (2d8 + 4) bludgeoning',
        description: 'Melee Weapon Attack: +6 to hit, reach 5 ft., one creature. Hit: 13 (2d8 + 4) bludgeoning damage, and the target is grappled (escape DC 14). Until this grapple ends, the creature is restrained, and the snake can\'t constrict another target.'
      }
    ],
    description: 'A massive 3x3 battlefield lockdown summon capable of crushing and restraining large threats.',
    source: 'SRD 5.1 / Druid Summons',
    category: 'ally'
  },
  {
    allyId: 'ally_giant_elk',
    name: 'Giant Elk',
    size: 'Huge',
    type: 'Beast',
    summonSource: 'Druid (Conjure Animals / Wild Shape)',
    alignment: 'Unaligned',
    ac: 14,
    acNotes: '(natural armor)',
    hp: 42,
    hpFormula: '(5d12 + 10)',
    speed: '60 ft.',
    initiativeBonus: 3,
    str: 19,
    dex: 16,
    con: 14,
    int: 7,
    wis: 14,
    cha: 10,
    skills: 'Perception +4',
    senses: 'Passive Perception 14',
    languages: 'Giant Elk, understands Common, Elvish, Sylvan',
    challenge: '2 (450 XP)',
    proficiencyBonus: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/58417/88/639226713770809470.jpeg',
    traits: [
      {
        name: 'Charge',
        description: 'If the elk moves at least 20 feet straight toward a target and then hits it with a ram attack on the same turn, the target takes an extra 7 (2d6) damage. If the target is a creature, it must succeed on a DC 14 Strength saving throw or be knocked prone.'
      }
    ],
    actions: [
      {
        name: 'Ram',
        type: 'attack',
        attackBonus: 6,
        reachRange: 'reach 10 ft.',
        damage: '11 (2d6 + 4) bludgeoning',
        description: 'Melee Weapon Attack: +6 to hit, reach 10 ft., one target. Hit: 11 (2d6 + 4) bludgeoning damage.'
      },
      {
        name: 'Hooves',
        type: 'attack',
        attackBonus: 6,
        reachRange: 'reach 5 ft.',
        damage: '22 (4d8 + 4) bludgeoning',
        description: 'Melee Weapon Attack: +6 to hit, reach 5 ft., one prone creature. Hit: 22 (4d8 + 4) bludgeoning damage.'
      }
    ],
    description: 'Majestic forest summon with explosive trampling power against prone targets.',
    source: 'SRD 5.1 / Druid Summons',
    category: 'ally'
  },
  {
    allyId: 'ally_wolf',
    name: 'Wolf',
    size: 'Medium',
    type: 'Beast',
    summonSource: 'Druid (Conjure Animals)',
    alignment: 'Unaligned',
    ac: 13,
    acNotes: '(natural armor)',
    hp: 11,
    hpFormula: '(2d8 + 2)',
    speed: '40 ft.',
    initiativeBonus: 2,
    str: 12,
    dex: 15,
    con: 12,
    int: 3,
    wis: 12,
    cha: 6,
    skills: 'Perception +3, Stealth +4',
    senses: 'Passive Perception 13',
    languages: '—',
    challenge: '1/4 (50 XP)',
    proficiencyBonus: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/43939/948/638607435568755201.png',
    traits: [
      {
        name: 'Keen Hearing and Smell',
        description: 'The wolf has advantage on Wisdom (Perception) checks that rely on hearing or smell.'
      },
      {
        name: 'Pack Tactics',
        description: 'The wolf has advantage on an attack roll against a creature if at least one of the wolf\'s allies is within 5 feet of the creature and the ally isn\'t incapacitated.'
      }
    ],
    actions: [
      {
        name: 'Bite',
        type: 'attack',
        attackBonus: 4,
        reachRange: 'reach 5 ft.',
        damage: '7 (2d4 + 2) piercing',
        description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (2d4 + 2) piercing damage. If the target is a creature, it must succeed on a DC 11 Strength saving throw or be knocked prone.'
      }
    ],
    description: 'Frequently conjured in eight-packs with Conjure Animals to swarm enemies with pack tactics.',
    source: 'SRD 5.1 / Druid Summons',
    category: 'ally'
  },
  {
    allyId: 'ally_beast_of_land',
    name: 'Beast of the Land',
    size: 'Medium',
    type: 'Beast',
    summonSource: 'Druid (Summon Beast / Primal Companion)',
    alignment: 'Unaligned',
    ac: 14,
    acNotes: '(13 + PB)',
    hp: 25,
    hpFormula: '(5 + 5 per spell level)',
    speed: '40 ft., climb 40 ft.',
    initiativeBonus: 2,
    str: 14,
    dex: 14,
    con: 15,
    int: 8,
    wis: 14,
    cha: 11,
    senses: 'Darkvision 60 ft., Passive Perception 12',
    languages: 'Understands the languages you speak',
    challenge: 'Summon Spirit',
    proficiencyBonus: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/43939/899/638607434272563738.png',
    traits: [
      {
        name: 'Primal Bond',
        description: 'You can add your proficiency bonus to any ability check or saving throw that the beast makes.'
      },
      {
        name: 'Charge',
        description: 'If the beast moves at least 20 feet straight toward a target and hits it with a maul attack on the same turn, the target takes an extra 1d6 slashing damage and must succeed on a Strength saving throw against your spell save DC or be knocked prone.'
      }
    ],
    actions: [
      {
        name: 'Maul',
        type: 'attack',
        attackBonus: 5,
        reachRange: 'reach 5 ft.',
        damage: '8 (1d8 + 4) slashing',
        description: 'Melee Weapon Attack: your spell attack modifier to hit, reach 5 ft., one target. Hit: 1d8 + 2 + spell level slashing damage.'
      }
    ],
    description: 'Modern 5e Tasha\'s summon beast spirit embodying predatory earth creatures.',
    source: 'Tasha\'s Cauldron of Everything',
    category: 'ally'
  },
  {
    allyId: 'ally_wildfire_spirit',
    name: 'Wildfire Spirit',
    size: 'Small',
    type: 'Elemental',
    summonSource: 'Druid (Circle of Wildfire)',
    alignment: 'Unaligned',
    ac: 13,
    acNotes: '(natural armor)',
    hp: 20,
    hpFormula: '(5 + 5 per druid level)',
    speed: '30 ft., fly 30 ft. (hover)',
    initiativeBonus: 2,
    str: 10,
    dex: 14,
    con: 14,
    int: 13,
    wis: 15,
    cha: 11,
    damageImmunities: 'Fire',
    conditionImmunities: 'Charmed, Frightened, Grappled, Prone, Restrained',
    senses: 'Darkvision 60 ft., Passive Perception 12',
    languages: 'Understands the languages you speak',
    challenge: 'Wildfire Feature',
    proficiencyBonus: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/30833/322/638063861332130639.png',
    actions: [
      {
        name: 'Flame Seed',
        type: 'attack',
        attackBonus: 5,
        reachRange: 'range 60 ft.',
        damage: '8 (1d6 + 5) fire',
        description: 'Ranged Weapon Attack: your spell attack modifier to hit, range 60 ft., one target. Hit: 1d6 + PB fire damage.'
      },
      {
        name: 'Fiery Teleportation',
        type: 'special',
        reachRange: '15 ft.',
        description: 'The spirit and each willing creature of your choice within 5 feet of it magically teleport up to 15 feet to unoccupied spaces you can see. Each creature within 5 feet of the space that the spirit left must succeed on a Dexterity saving throw against your spell save DC or take 1d6 + PB fire damage.'
      }
    ],
    description: 'A dancing elemental companion of ash and flame that teleports the party across the battlefield.',
    source: 'Tasha\'s Cauldron of Everything',
    category: 'ally'
  },
  {
    allyId: 'ally_pixie',
    name: 'Pixie',
    size: 'Tiny',
    type: 'Fey',
    summonSource: 'Druid (Conjure Woodland Beings)',
    alignment: 'Neutral Good',
    ac: 15,
    hp: 1,
    hpFormula: '(1d4 - 1)',
    speed: '10 ft., fly 30 ft.',
    initiativeBonus: 5,
    str: 2,
    dex: 20,
    con: 8,
    int: 10,
    wis: 14,
    cha: 15,
    skills: 'Perception +4, Stealth +7',
    senses: 'Passive Perception 14',
    languages: 'Sylvan',
    challenge: '1/4 (50 XP)',
    proficiencyBonus: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/30834/691/638063894967407910.png',
    traits: [
      {
        name: 'Magic Resistance',
        description: 'The pixie has advantage on saving throws against spells and other magical effects.'
      },
      {
        name: 'Innate Spellcasting',
        description: 'DC 12. At will: Druidcraft. 1/day each: Confusion, Dancing Lights, Detect Evil and Good, Detect Thoughts, Dispel Magic, Entangle, Fly, Phantasmal Force, Polymorph, Sleep.'
      }
    ],
    actions: [
      {
        name: 'Superior Invisibility',
        type: 'special',
        description: 'The pixie magically turns invisible until its concentration ends (as if concentrating on a spell). Any equipment the pixie wears or carries is invisible with it.'
      }
    ],
    description: 'The fabled spellcasting summon known for Polymorphing the entire party into T-Rexes or Giant Apes.',
    source: 'SRD 5.1 / Conjure Woodland Beings',
    category: 'ally'
  },
  {
    allyId: 'ally_dryad',
    name: 'Dryad',
    size: 'Medium',
    type: 'Fey',
    summonSource: 'Druid (Conjure Woodland Beings)',
    alignment: 'Neutral',
    ac: 11,
    acNotes: '(16 with Barkskin)',
    hp: 22,
    hpFormula: '(5d8)',
    speed: '30 ft.',
    initiativeBonus: 1,
    str: 10,
    dex: 12,
    con: 11,
    int: 14,
    wis: 15,
    cha: 18,
    skills: 'Perception +4, Stealth +5',
    senses: 'Darkvision 60 ft., Passive Perception 14',
    languages: 'Elvish, Sylvan',
    challenge: '1 (200 XP)',
    proficiencyBonus: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/30782/916/638061981460060607.png',
    traits: [
      {
        name: 'Tree Stride',
        description: 'Once on its turn, the dryad can use 10 feet of its movement to step magically into one living tree within its reach and emerge from a second living tree within 60 feet of the first tree.'
      },
      {
        name: 'Magic Resistance',
        description: 'The dryad has advantage on saving throws against spells and other magical effects.'
      },
      {
        name: 'Innate Spellcasting',
        description: 'DC 14. At will: Druidcraft. 3/day each: Entangle, Goodberry. 1/day each: Barkskin, Pass without Trace, Shillelagh.'
      }
    ],
    actions: [
      {
        name: 'Club (with Shillelagh)',
        type: 'attack',
        attackBonus: 6,
        reachRange: 'reach 5 ft.',
        damage: '8 (1d8 + 4) bludgeoning',
        description: 'Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 8 (1d8 + 4) bludgeoning damage.'
      },
      {
        name: 'Fey Charm',
        type: 'special',
        description: 'The dryad targets one humanoid or beast within 30 feet. DC 14 Wisdom save or magically charmed for 24 hours.'
      }
    ],
    description: 'A guardian nature spirit providing Pass without Trace, Goodberry, and tree teleportation.',
    source: 'SRD 5.1 / Conjure Woodland Beings',
    category: 'ally'
  },
  {
    allyId: 'ally_fire_elemental',
    name: 'Fire Elemental',
    size: 'Large',
    type: 'Elemental',
    summonSource: 'Druid / Wizard (Conjure Elemental)',
    alignment: 'Neutral',
    ac: 13,
    hp: 102,
    hpFormula: '(12d10 + 36)',
    speed: '50 ft.',
    initiativeBonus: 3,
    str: 10,
    dex: 17,
    con: 16,
    int: 6,
    wis: 10,
    cha: 7,
    damageResistances: 'Bludgeoning, Piercing, and Slashing from Nonmagical Attacks',
    damageImmunities: 'Fire, Poison',
    conditionImmunities: 'Exhaustion, Grappled, Paralyzed, Petrified, Poisoned, Prone, Restrained, Unconscious',
    senses: 'Darkvision 60 ft., Passive Perception 10',
    languages: 'Ignan',
    challenge: '5 (1,800 XP)',
    proficiencyBonus: 3,
    avatarUrl: 'https://www.dndbeyond.com/avatars/30783/695/638062015772259390.png',
    traits: [
      {
        name: 'Fire Form',
        description: 'The elemental can move through a space as narrow as 1 inch wide without squeezing. A creature that touches the elemental or hits it with a melee attack while within 5 feet of it takes 5 (1d10) fire damage. In addition, the elemental can enter a hostile creature\'s space and stop there. The first time it enters a creature\'s space on a turn, that creature takes 5 (1d10) fire damage and catches fire.'
      },
      {
        name: 'Illumination',
        description: 'The elemental sheds bright light in a 30-foot radius and dim light in an additional 30 feet.'
      },
      {
        name: 'Water Susceptibility',
        description: 'For every 5 feet the elemental moves in water, or for every gallon of water splashed on it, it takes 1 cold damage.'
      }
    ],
    actions: [
      {
        name: 'Multiattack',
        type: 'multiattack',
        description: 'The elemental makes two touch attacks.'
      },
      {
        name: 'Touch',
        type: 'attack',
        attackBonus: 6,
        reachRange: 'reach 5 ft.',
        damage: '10 (2d6 + 3) fire',
        description: 'Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) fire damage. If the target is a creature or a flammable object, it ignites.'
      }
    ],
    description: 'A raging vortex of living fire that sets fields and enemies ablaze.',
    source: 'SRD 5.1 / Conjure Elemental',
    category: 'ally'
  },
  {
    allyId: 'ally_water_elemental',
    name: 'Water Elemental',
    size: 'Large',
    type: 'Elemental',
    summonSource: 'Druid / Wizard (Conjure Elemental)',
    alignment: 'Neutral',
    ac: 14,
    acNotes: '(natural armor)',
    hp: 114,
    hpFormula: '(12d10 + 48)',
    speed: '30 ft., swim 90 ft.',
    initiativeBonus: 2,
    str: 18,
    dex: 14,
    con: 18,
    int: 5,
    wis: 10,
    cha: 8,
    damageResistances: 'Acid; Bludgeoning, Piercing, and Slashing from Nonmagical Attacks',
    damageImmunities: 'Poison',
    conditionImmunities: 'Exhaustion, Grappled, Paralyzed, Petrified, Poisoned, Prone, Restrained, Unconscious',
    senses: 'Darkvision 60 ft., Passive Perception 10',
    languages: 'Aquan',
    challenge: '5 (1,800 XP)',
    proficiencyBonus: 3,
    avatarUrl: 'https://www.dndbeyond.com/avatars/30783/698/638062015886859442.png',
    traits: [
      {
        name: 'Water Form',
        description: 'The elemental can enter a hostile creature\'s space and stop there. It can move through a space as narrow as 1 inch wide without squeezing.'
      },
      {
        name: 'Freeze',
        description: 'If the elemental takes cold damage, it partially freezes; its speed is reduced by 20 feet until the end of its next turn.'
      }
    ],
    actions: [
      {
        name: 'Multiattack',
        type: 'multiattack',
        description: 'The elemental makes two slam attacks.'
      },
      {
        name: 'Slam',
        type: 'attack',
        attackBonus: 7,
        reachRange: 'reach 5 ft.',
        damage: '13 (2d8 + 4) bludgeoning',
        description: 'Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) bludgeoning damage.'
      },
      {
        name: 'Whelm (Recharge 4–6)',
        type: 'special',
        description: 'Each creature in the elemental\'s space must make a DC 15 Strength saving throw. On a failure, a target takes 13 (2d8 + 4) bludgeoning damage and is grappled, restrained, and unable to breathe unless it can breathe water.'
      }
    ],
    description: 'A crushing wave of water that engulfs, drowns, and restrains hostile groups.',
    source: 'SRD 5.1 / Conjure Elemental',
    category: 'ally'
  },
  {
    allyId: 'ally_earth_elemental',
    name: 'Earth Elemental',
    size: 'Large',
    type: 'Elemental',
    summonSource: 'Druid / Wizard (Conjure Elemental)',
    alignment: 'Neutral',
    ac: 17,
    acNotes: '(natural armor)',
    hp: 126,
    hpFormula: '(12d10 + 60)',
    speed: '30 ft., burrow 30 ft.',
    initiativeBonus: -1,
    str: 20,
    dex: 8,
    con: 20,
    int: 5,
    wis: 10,
    cha: 5,
    damageResistances: 'Bludgeoning, Piercing, and Slashing from Nonmagical Attacks',
    damageImmunities: 'Poison',
    conditionImmunities: 'Exhaustion, Paralyzed, Petrified, Poisoned, Unconscious',
    senses: 'Darkvision 60 ft., Tremorsense 60 ft., Passive Perception 10',
    languages: 'Terran',
    challenge: '5 (1,800 XP)',
    proficiencyBonus: 3,
    avatarUrl: 'https://www.dndbeyond.com/avatars/30783/692/638062015664899420.png',
    traits: [
      {
        name: 'Earth Glide',
        description: 'The elemental can burrow through nonmagical, unworked earth and stone. While doing so, the elemental doesn\'t disturb the material it moves through.'
      },
      {
        name: 'Siege Monster',
        description: 'The elemental deals double damage to objects and structures.'
      }
    ],
    actions: [
      {
        name: 'Multiattack',
        type: 'multiattack',
        description: 'The elemental makes two slam attacks.'
      },
      {
        name: 'Slam',
        type: 'attack',
        attackBonus: 8,
        reachRange: 'reach 10 ft.',
        damage: '14 (2d8 + 5) bludgeoning',
        description: 'Melee Weapon Attack: +8 to hit, reach 10 ft., one target. Hit: 14 (2d8 + 5) bludgeoning damage.'
      }
    ],
    description: 'An impenetrable wall of living rock that glides through stone and demolishes fortress walls.',
    source: 'SRD 5.1 / Conjure Elemental',
    category: 'ally'
  },
  {
    allyId: 'ally_air_elemental',
    name: 'Air Elemental',
    size: 'Large',
    type: 'Elemental',
    summonSource: 'Druid / Wizard (Conjure Elemental)',
    alignment: 'Neutral',
    ac: 15,
    hp: 90,
    hpFormula: '(12d10 + 24)',
    speed: '10 ft., fly 90 ft. (hover)',
    initiativeBonus: 5,
    str: 14,
    dex: 20,
    con: 14,
    int: 6,
    wis: 10,
    cha: 6,
    damageResistances: 'Lightning, Thunder; Bludgeoning, Piercing, and Slashing from Nonmagical Attacks',
    damageImmunities: 'Poison',
    conditionImmunities: 'Exhaustion, Grappled, Paralyzed, Petrified, Poisoned, Prone, Restrained, Unconscious',
    senses: 'Darkvision 60 ft., Passive Perception 10',
    languages: 'Auran',
    challenge: '5 (1,800 XP)',
    proficiencyBonus: 3,
    avatarUrl: 'https://www.dndbeyond.com/avatars/30783/689/638062015555039371.png',
    traits: [
      {
        name: 'Air Form',
        description: 'The elemental can enter a hostile creature\'s space and stop there. It can move through a space as narrow as 1 inch wide without squeezing.'
      }
    ],
    actions: [
      {
        name: 'Multiattack',
        type: 'multiattack',
        description: 'The elemental makes two slam attacks.'
      },
      {
        name: 'Slam',
        type: 'attack',
        attackBonus: 8,
        reachRange: 'reach 5 ft.',
        damage: '14 (2d8 + 5) bludgeoning',
        description: 'Melee Weapon Attack: +8 to hit, reach 5 ft., one target. Hit: 14 (2d8 + 5) bludgeoning damage.'
      },
      {
        name: 'Whirlwind (Recharge 4–6)',
        type: 'special',
        description: 'Each creature in the elemental\'s space must make a DC 13 Strength saving throw or take 15 (3d8 + 2) bludgeoning damage and be flung up to 20 feet in a random direction and knocked prone.'
      }
    ],
    description: 'A raging cyclone that flings enemies across the room and bypasses all terrain.',
    source: 'SRD 5.1 / Conjure Elemental',
    category: 'ally'
  },

  // ==========================================
  // FAMILIARS & WARLOCK COMPANIONS
  // ==========================================
  {
    allyId: 'ally_owl_familiar',
    name: 'Owl Familiar',
    size: 'Tiny',
    type: 'Beast',
    summonSource: 'Find Familiar (Wizard / Druid)',
    alignment: 'Unaligned',
    ac: 11,
    hp: 1,
    hpFormula: '(1d4 - 1)',
    speed: '5 ft., fly 60 ft.',
    initiativeBonus: 1,
    str: 3,
    dex: 13,
    con: 8,
    int: 2,
    wis: 12,
    cha: 7,
    skills: 'Perception +3, Stealth +3',
    senses: 'Darkvision 120 ft., Passive Perception 13',
    languages: '—',
    challenge: '0 (10 XP)',
    proficiencyBonus: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/47158/951/638742837731128628.png',
    traits: [
      {
        name: 'Flyby',
        description: 'The owl doesn\'t provoke opportunity attacks when it flies out of an enemy\'s reach.'
      },
      {
        name: 'Keen Hearing and Sight',
        description: 'The owl has advantage on Wisdom (Perception) checks that rely on hearing or sight.'
      }
    ],
    actions: [
      {
        name: 'Help Action / Touch Spell',
        type: 'special',
        description: 'Use the Help action with Flyby advantage, or deliver your touch-range spell.'
      },
      {
        name: 'Talons',
        type: 'attack',
        attackBonus: 3,
        reachRange: 'reach 5 ft.',
        damage: '1 slashing',
        description: 'Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 1 slashing damage.'
      }
    ],
    description: 'The universal scout and Help-action engine for wizards and spellcasters with 120 ft Darkvision.',
    source: 'SRD 5.1 / Find Familiar',
    category: 'ally'
  },
  {
    allyId: 'ally_pseudodragon',
    name: 'Pseudodragon',
    size: 'Tiny',
    type: 'Dragon',
    summonSource: 'Pact of the Chain (Warlock Familiar)',
    alignment: 'Neutral Good',
    ac: 13,
    acNotes: '(natural armor)',
    hp: 7,
    hpFormula: '(2d4 + 2)',
    speed: '15 ft., fly 60 ft.',
    initiativeBonus: 2,
    str: 6,
    dex: 15,
    con: 13,
    int: 10,
    wis: 12,
    cha: 10,
    skills: 'Perception +3, Stealth +4',
    senses: 'Blindsight 10 ft., Darkvision 60 ft., Passive Perception 13',
    languages: 'Understands Common and Draconic but can\'t speak',
    challenge: '1/4 (50 XP)',
    proficiencyBonus: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/30834/696/638063895061837826.png',
    traits: [
      {
        name: 'Magic Resistance',
        description: 'The pseudodragon has advantage on saving throws against spells and other magical effects.'
      },
      {
        name: 'Limited Telepathy',
        description: 'The pseudodragon can magically communicate simple ideas, emotions, and images telepathically with any creature within 100 feet of it that can understand a language.'
      }
    ],
    actions: [
      {
        name: 'Bite',
        type: 'attack',
        attackBonus: 4,
        reachRange: 'reach 5 ft.',
        damage: '4 (1d4 + 2) piercing',
        description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 4 (1d4 + 2) piercing damage.'
      },
      {
        name: 'Sting',
        type: 'attack',
        attackBonus: 4,
        reachRange: 'reach 5 ft.',
        damage: '4 (1d4 + 2) piercing',
        description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 4 (1d4 + 2) piercing damage, and the target must succeed on a DC 11 Constitution saving throw or become poisoned for 1 hour. If the saving throw fails by 5 or more, the target falls unconscious for the same duration, or until it takes damage or another creature uses an action to shake it awake.'
      }
    ],
    description: 'An affectionate miniature dragon capable of rendering foes unconscious with its stinger.',
    source: 'SRD 5.1 / Pact of the Chain',
    category: 'ally'
  },
  {
    allyId: 'ally_imp',
    name: 'Imp',
    size: 'Tiny',
    type: 'Fiend (Devil)',
    summonSource: 'Pact of the Chain (Warlock Familiar)',
    alignment: 'Lawful Evil',
    ac: 13,
    hp: 10,
    hpFormula: '(3d4 + 3)',
    speed: '20 ft., fly 40 ft.',
    initiativeBonus: 3,
    str: 6,
    dex: 17,
    con: 13,
    int: 11,
    wis: 12,
    cha: 14,
    skills: 'Deception +4, Insight +3, Persuasion +4, Stealth +5',
    damageResistances: 'Cold; Bludgeoning, Piercing, and Slashing from Nonmagical Attacks That Aren\'t Silvered',
    damageImmunities: 'Fire, Poison',
    conditionImmunities: 'Poisoned',
    senses: 'Darkvision 120 ft., Devil\'s Sight, Passive Perception 11',
    languages: 'Infernal, Common',
    challenge: '1 (200 XP)',
    proficiencyBonus: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/30782/21/638061948417487055.png',
    traits: [
      {
        name: 'Shapechanger',
        description: 'The imp can use its action to polymorph into a beast form that resembles a rat, a raven, or a spider, or back into its true form.'
      },
      {
        name: 'Devil\'s Sight',
        description: 'Magical darkness doesn\'t impede the imp\'s darkvision.'
      },
      {
        name: 'Magic Resistance',
        description: 'The imp has advantage on saving throws against spells and other magical effects.'
      }
    ],
    actions: [
      {
        name: 'Sting',
        type: 'attack',
        attackBonus: 5,
        reachRange: 'reach 5 ft.',
        damage: '5 (1d4 + 3) piercing plus 10 (3d6) poison',
        description: 'Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 5 (1d4 + 3) piercing damage, and the target must make a DC 11 Constitution saving throw, taking 10 (3d6) poison damage on a failed save, or half as much damage on a successful one.'
      },
      {
        name: 'Invisibility',
        type: 'special',
        description: 'The imp magically turns invisible until it attacks or its concentration ends.'
      }
    ],
    description: 'A cunning invisible fiend scout possessing Devil\'s Sight and lethal venom.',
    source: 'SRD 5.1 / Pact of the Chain',
    category: 'ally'
  },
  {
    allyId: 'ally_quasit',
    name: 'Quasit',
    size: 'Tiny',
    type: 'Fiend (Demon)',
    summonSource: 'Pact of the Chain (Warlock Familiar)',
    alignment: 'Chaotic Evil',
    ac: 13,
    hp: 7,
    hpFormula: '(3d4)',
    speed: '40 ft.',
    initiativeBonus: 3,
    str: 5,
    dex: 17,
    con: 10,
    int: 7,
    wis: 10,
    cha: 10,
    skills: 'Stealth +5',
    damageResistances: 'Cold, Fire, Lightning; Bludgeoning, Piercing, and Slashing from Nonmagical Attacks',
    damageImmunities: 'Poison',
    conditionImmunities: 'Poisoned',
    senses: 'Darkvision 120 ft., Passive Perception 10',
    languages: 'Abyssal, Common',
    challenge: '1 (200 XP)',
    proficiencyBonus: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/30781/635/638061932141924320.png',
    traits: [
      {
        name: 'Shapechanger',
        description: 'The quasit can use its action to polymorph into a bat, a centipede, or a toad, or back into its true form.'
      },
      {
        name: 'Magic Resistance',
        description: 'The quasit has advantage on saving throws against spells and other magical effects.'
      }
    ],
    actions: [
      {
        name: 'Claws',
        type: 'attack',
        attackBonus: 4,
        reachRange: 'reach 5 ft.',
        damage: '5 (1d4 + 3) piercing plus 5 (2d4) poison',
        description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d4 + 3) piercing damage, and the target must succeed on a DC 10 Constitution saving throw or take 5 (2d4) poison damage and become poisoned for 1 minute.'
      },
      {
        name: 'Scare (1/Day)',
        type: 'special',
        description: 'One creature of the quasit\'s choice within 20 feet must succeed on a DC 10 Wisdom saving throw or be frightened for 1 minute.'
      },
      {
        name: 'Invisibility',
        type: 'special',
        description: 'The quasit magically turns invisible until it attacks or uses Scare.'
      }
    ],
    description: 'A mischievous demonic spy that can turn invisible and terrify enemies.',
    source: 'SRD 5.1 / Pact of the Chain',
    category: 'ally'
  },
  {
    allyId: 'ally_sprite',
    name: 'Sprite',
    size: 'Tiny',
    type: 'Fey',
    summonSource: 'Pact of the Chain (Warlock Familiar)',
    alignment: 'Neutral Good',
    ac: 15,
    acNotes: '(leather armor)',
    hp: 2,
    hpFormula: '(1d4)',
    speed: '10 ft., fly 40 ft.',
    initiativeBonus: 4,
    str: 3,
    dex: 18,
    con: 10,
    int: 14,
    wis: 13,
    cha: 11,
    skills: 'Perception +3, Stealth +8',
    senses: 'Passive Perception 13',
    languages: 'Common, Elvish, Sylvan',
    challenge: '1/4 (50 XP)',
    proficiencyBonus: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/30835/934/638063924408565694.png',
    traits: [
      {
        name: 'Heart Sight',
        description: 'The sprite touches a creature and magically knows the creature\'s current emotional state and alignment (DC 10 Cha save to avoid).'
      }
    ],
    actions: [
      {
        name: 'Shortbow',
        type: 'attack',
        attackBonus: 6,
        reachRange: 'range 40/160 ft.',
        damage: '1 piercing plus poison sleep',
        description: 'Ranged Weapon Attack: +6 to hit, range 40/160 ft., one target. Hit: 1 piercing damage, and the target must succeed on a DC 10 Constitution saving throw or be poisoned for 1 minute. If the save fails by 5 or more, the target falls unconscious.'
      },
      {
        name: 'Invisibility',
        type: 'special',
        description: 'The sprite magically turns invisible until it attacks or casts a spell.'
      }
    ],
    description: 'A miniature fey archer capable of divining alignments and putting foes to sleep.',
    source: 'SRD 5.1 / Pact of the Chain',
    category: 'ally'
  },
  {
    allyId: 'ally_raven_familiar',
    name: 'Raven Familiar',
    size: 'Tiny',
    type: 'Beast',
    summonSource: 'Find Familiar (Wizard / Druid)',
    alignment: 'Unaligned',
    ac: 12,
    hp: 2,
    hpFormula: '(1d4)',
    speed: '10 ft., fly 50 ft.',
    initiativeBonus: 2,
    str: 2,
    dex: 14,
    con: 8,
    int: 2,
    wis: 12,
    cha: 6,
    skills: 'Perception +3',
    senses: 'Passive Perception 13',
    languages: '—',
    challenge: '0 (10 XP)',
    proficiencyBonus: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/47158/985/638742838863997460.png',
    traits: [
      {
        name: 'Mimicry',
        description: 'The raven can mimic simple sounds it has heard, such as a person whispering or an animal crying (DC 10 Insight to tell apart).'
      }
    ],
    actions: [
      {
        name: 'Beak',
        type: 'attack',
        attackBonus: 4,
        reachRange: 'reach 5 ft.',
        damage: '1 piercing',
        description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 1 piercing damage.'
      }
    ],
    description: 'A sharp-eyed avian companion that can carry messages and mimic vocal sounds.',
    source: 'SRD 5.1 / Find Familiar',
    category: 'ally'
  },
  {
    allyId: 'ally_cat_familiar',
    name: 'Cat Familiar',
    size: 'Tiny',
    type: 'Beast',
    summonSource: 'Find Familiar (Wizard / Druid)',
    alignment: 'Unaligned',
    ac: 12,
    hp: 2,
    hpFormula: '(1d4)',
    speed: '40 ft., climb 30 ft.',
    initiativeBonus: 2,
    str: 3,
    dex: 15,
    con: 10,
    int: 3,
    wis: 12,
    cha: 7,
    skills: 'Perception +3, Stealth +4',
    senses: 'Passive Perception 13',
    languages: '—',
    challenge: '0 (10 XP)',
    proficiencyBonus: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/43939/81/638607414147450285.png',
    traits: [
      {
        name: 'Keen Smell',
        description: 'The cat has advantage on Wisdom (Perception) checks that rely on smell.'
      }
    ],
    actions: [
      {
        name: 'Claws',
        type: 'attack',
        attackBonus: 0,
        reachRange: 'reach 5 ft.',
        damage: '1 slashing',
        description: 'Melee Weapon Attack: +0 to hit, reach 5 ft., one target. Hit: 1 slashing damage.'
      }
    ],
    description: 'A stealthy house cat ideal for urban reconnaissance and quiet infiltration.',
    source: 'SRD 5.1 / Find Familiar',
    category: 'ally'
  },

  // ==========================================
  // SPELLS, CONSTRUCTS & CELESTIALS
  // ==========================================
  {
    allyId: 'ally_spiritual_weapon',
    name: 'Spiritual Weapon',
    size: 'Medium',
    type: 'Force Construct',
    summonSource: 'Cleric (Spiritual Weapon)',
    alignment: 'Unaligned',
    ac: 15,
    hp: 20,
    speed: 'fly 20 ft. (hover)',
    initiativeBonus: 0,
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 16,
    cha: 10,
    damageImmunities: 'Poison, Psychic',
    conditionImmunities: 'All Conditions',
    senses: 'Blindsight 30 ft.',
    languages: '—',
    challenge: 'Spell Feature',
    proficiencyBonus: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/30761/834/638061095632921781.png',
    bonusActions: [
      {
        name: 'Move & Strike',
        type: 'attack',
        attackBonus: 7,
        reachRange: 'reach 5 ft.',
        damage: '9 (1d8 + 4) force',
        description: 'Bonus Action: Move up to 20 feet and make a melee spell attack against one creature within 5 feet. Hit: 1d8 + your spellcasting ability modifier force damage (+1d8 per 2 slot levels above 2nd).'
      }
    ],
    description: 'A floating, spectral weapon of divine power that strikes as a bonus action every round.',
    source: 'SRD 5.1 / Cleric Spell',
    category: 'ally'
  },
  {
    allyId: 'ally_guardian_of_faith',
    name: 'Guardian of Faith',
    size: 'Large',
    type: 'Celestial Construct',
    summonSource: 'Cleric (Guardian of Faith)',
    alignment: 'Unaligned',
    ac: 20,
    hp: 60,
    speed: '0 ft.',
    initiativeBonus: 0,
    str: 18,
    dex: 10,
    con: 18,
    int: 10,
    wis: 16,
    cha: 10,
    damageImmunities: 'Poison, Psychic',
    conditionImmunities: 'All Conditions',
    senses: 'Darkvision 60 ft.',
    languages: '—',
    challenge: 'Spell Feature',
    proficiencyBonus: 3,
    avatarUrl: 'https://www.dndbeyond.com/avatars/30835/840/638063922477985887.png',
    traits: [
      {
        name: 'Vigilant Guardian',
        description: 'A large spectral warrior hovers in place. Any hostile creature that moves to a space within 10 feet of the guardian for the first time on a turn must succeed on a Dexterity saving throw or take 20 radiant damage (10 on success). The guardian vanishes once it deals 60 damage.'
      }
    ],
    description: 'An immovable glowing sentinel punishing any enemy daring to approach your perimeter.',
    source: 'SRD 5.1 / Cleric Spell',
    category: 'ally'
  },
  {
    allyId: 'ally_bigbys_hand',
    name: 'Bigby\'s Hand',
    size: 'Large',
    type: 'Force Construct',
    summonSource: 'Wizard (Bigby\'s Hand)',
    alignment: 'Unaligned',
    ac: 20,
    hp: 50,
    hpFormula: '(Equal to caster\'s maximum HP)',
    speed: 'fly 60 ft. (hover)',
    initiativeBonus: 0,
    str: 26,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    damageImmunities: 'Poison, Psychic',
    conditionImmunities: 'All Conditions',
    senses: 'Darkvision 60 ft.',
    languages: '—',
    challenge: 'Spell Feature',
    proficiencyBonus: 4,
    avatarUrl: 'https://www.dndbeyond.com/avatars/12734/921/637357081710269077.jpeg',
    actions: [
      {
        name: 'Clenched Fist',
        type: 'attack',
        attackBonus: 9,
        reachRange: 'reach 5 ft.',
        damage: '26 (4d8 + 8) force',
        description: 'Melee spell attack: 4d8 force damage. Can strike as a bonus action on subsequent turns.'
      },
      {
        name: 'Forceful Hand',
        type: 'special',
        description: 'Attempts to push a creature within 5 feet up to 5 + (10 x spellcasting modifier) feet away (Athletics check with STR 26).'
      },
      {
        name: 'Grasping Hand',
        type: 'special',
        description: 'Attempts to grapple a Huge or smaller creature (STR +8). Deals 2d6 + spell mod bludgeoning damage each turn.'
      },
      {
        name: 'Interposing Hand',
        type: 'special',
        description: 'Places itself between you and a creature, providing half cover and blocking passage.'
      }
    ],
    description: 'The iconic arcane hand of force with versatile tactical attack, defense, and grappling options.',
    source: 'SRD 5.1 / Wizard Spell',
    category: 'ally'
  },
  {
    allyId: 'ally_steel_defender',
    name: 'Steel Defender',
    size: 'Medium',
    type: 'Construct',
    summonSource: 'Artificer (Battle Smith)',
    alignment: 'Neutral',
    ac: 15,
    acNotes: '(natural armor)',
    hp: 30,
    hpFormula: '(2 + INT mod + 5 x Artificer level)',
    speed: '40 ft.',
    initiativeBonus: 1,
    str: 14,
    dex: 12,
    con: 14,
    int: 4,
    wis: 10,
    cha: 6,
    skills: 'Athletics +4, Perception +4',
    damageImmunities: 'Poison',
    conditionImmunities: 'Charmed, Exhaustion, Poisoned',
    senses: 'Darkvision 60 ft., Passive Perception 14',
    languages: 'Understands languages you speak',
    challenge: 'Artificer Feature',
    proficiencyBonus: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/7803/905/637098520679843438.jpeg',
    traits: [
      {
        name: 'Vigilant',
        description: 'The defender can\'t be surprised.'
      }
    ],
    actions: [
      {
        name: 'Force-Empowered Rend',
        type: 'attack',
        attackBonus: 5,
        reachRange: 'reach 5 ft.',
        damage: '7 (1d8 + 3) force',
        description: 'Melee Weapon Attack: your spell attack modifier to hit, reach 5 ft., one target. Hit: 1d8 + PB force damage.'
      },
      {
        name: 'Repair (3/Day)',
        type: 'special',
        description: 'The magical mechanisms restore 2d8 + PB hit points to itself or one construct/object within 5 feet.'
      }
    ],
    reactions: [
      {
        name: 'Deflect Attack',
        type: 'special',
        description: 'The defender imposes disadvantage on the attack roll of one creature it can see within 5 feet of it against a target other than the defender.'
      }
    ],
    description: 'A loyal clockwork hound or beast protecting the Artificer and imposing disadvantage on attacker rolls.',
    source: 'Tasha\'s Cauldron of Everything',
    category: 'ally'
  },
  {
    allyId: 'ally_warhorse',
    name: 'Warhorse',
    size: 'Large',
    type: 'Beast / Celestial',
    summonSource: 'Paladin (Find Steed)',
    alignment: 'Unaligned',
    ac: 11,
    hp: 19,
    hpFormula: '(3d10 + 3)',
    speed: '60 ft.',
    initiativeBonus: 1,
    str: 18,
    dex: 12,
    con: 13,
    int: 6,
    wis: 12,
    cha: 7,
    senses: 'Passive Perception 11',
    languages: 'Understands one language of its summoner',
    challenge: '1/2 (100 XP)',
    proficiencyBonus: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/43939/915/638607434779874338.png',
    traits: [
      {
        name: 'Trampling Charge',
        description: 'If the horse moves at least 20 feet straight toward a creature and then hits it with a hooves attack on the same turn, that target must succeed on a DC 14 Strength saving throw or be knocked prone. If the target is prone, the horse can make another hooves attack as a bonus action.'
      }
    ],
    actions: [
      {
        name: 'Hooves',
        type: 'attack',
        attackBonus: 6,
        reachRange: 'reach 5 ft.',
        damage: '11 (2d6 + 4) bludgeoning',
        description: 'Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) bludgeoning damage.'
      }
    ],
    description: 'The trusty steed of holy champions, capable of trampling charging enemies.',
    source: 'SRD 5.1 / Find Steed',
    category: 'ally'
  },
  {
    allyId: 'ally_pegasus',
    name: 'Pegasus',
    size: 'Large',
    type: 'Celestial',
    summonSource: 'Paladin (Find Greater Steed)',
    alignment: 'Chaotic Good',
    ac: 12,
    hp: 59,
    hpFormula: '(7d10 + 21)',
    speed: '60 ft., fly 90 ft.',
    initiativeBonus: 2,
    str: 18,
    dex: 15,
    con: 16,
    int: 10,
    wis: 15,
    cha: 13,
    savingThrows: 'DEX +4, CON +5, WIS +4, CHA +3',
    skills: 'Perception +6',
    senses: 'Passive Perception 16',
    languages: 'Understands Celestial, Common, Elvish, Sylvan',
    challenge: '2 (450 XP)',
    proficiencyBonus: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/30834/674/638063894663528037.png',
    actions: [
      {
        name: 'Hooves',
        type: 'attack',
        attackBonus: 6,
        reachRange: 'reach 5 ft.',
        damage: '11 (2d6 + 4) bludgeoning',
        description: 'Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) bludgeoning damage.'
      }
    ],
    description: 'A divine winged steed with 90 ft fly speed granting incredible mobility to paladins.',
    source: 'SRD 5.1 / Find Greater Steed',
    category: 'ally'
  },

  // ==========================================
  // UNDEAD SUMMONS
  // ==========================================
  {
    allyId: 'ally_skeleton_summoned',
    name: 'Skeleton (Summoned)',
    size: 'Medium',
    type: 'Undead',
    summonSource: 'Wizard / Cleric (Animate Dead)',
    alignment: 'Lawful Evil',
    ac: 13,
    acNotes: '(armor scraps)',
    hp: 13,
    hpFormula: '(2d8 + 4)',
    speed: '30 ft.',
    initiativeBonus: 2,
    str: 10,
    dex: 14,
    con: 15,
    int: 6,
    wis: 8,
    cha: 5,
    damageVulnerabilities: 'Bludgeoning',
    damageImmunities: 'Poison',
    conditionImmunities: 'Exhaustion, Poisoned',
    senses: 'Darkvision 60 ft., Passive Perception 9',
    languages: 'Understands languages it knew in life but can\'t speak',
    challenge: '1/4 (50 XP)',
    proficiencyBonus: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/30835/849/638063922565505819.png',
    actions: [
      {
        name: 'Shortsword',
        type: 'attack',
        attackBonus: 4,
        reachRange: 'reach 5 ft.',
        damage: '5 (1d6 + 2) piercing',
        description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.'
      },
      {
        name: 'Shortbow',
        type: 'attack',
        attackBonus: 4,
        reachRange: 'range 80/320 ft.',
        damage: '5 (1d6 + 2) piercing',
        description: 'Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 (1d6 + 2) piercing damage.'
      }
    ],
    description: 'An obedient animated skeletal soldier armed with bow and blade.',
    source: 'SRD 5.1 / Animate Dead',
    category: 'ally'
  },
  {
    allyId: 'ally_zombie_summoned',
    name: 'Zombie (Summoned)',
    size: 'Medium',
    type: 'Undead',
    summonSource: 'Wizard / Cleric (Animate Dead)',
    alignment: 'Neutral Evil',
    ac: 8,
    hp: 22,
    hpFormula: '(3d8 + 9)',
    speed: '20 ft.',
    initiativeBonus: -2,
    str: 13,
    dex: 6,
    con: 16,
    int: 3,
    wis: 6,
    cha: 5,
    savingThrows: 'WIS +0',
    damageImmunities: 'Poison',
    conditionImmunities: 'Poisoned',
    senses: 'Darkvision 60 ft., Passive Perception 8',
    languages: 'Understands the languages it knew in life but can\'t speak',
    challenge: '1/4 (50 XP)',
    proficiencyBonus: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/30836/823/638063945376881949.png',
    traits: [
      {
        name: 'Undead Fortitude',
        description: 'If damage reduces the zombie to 0 hit points, it must make a Constitution saving throw with a DC of 5 + the damage taken, unless the damage is radiant or from a critical hit. On a success, the zombie drops to 1 hit point instead.'
      }
    ],
    actions: [
      {
        name: 'Slam',
        type: 'attack',
        attackBonus: 3,
        reachRange: 'reach 5 ft.',
        damage: '4 (1d6 + 1) bludgeoning',
        description: 'Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) bludgeoning damage.'
      }
    ],
    description: 'A shambling meat-shield summoned to absorb incoming attacks with Undead Fortitude.',
    source: 'SRD 5.1 / Animate Dead',
    category: 'ally'
  }
];
