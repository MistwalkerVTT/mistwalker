import { Monster } from '../types/monster';

export const SRD_MONSTERS: Monster[] = [
  {
    monsterId: 'monster_wraith',
    name: 'Wraith',
    size: 'Medium',
    type: 'Undead',
    alignment: 'Neutral Evil',
    ac: 13,
    hp: 67,
    hpFormula: '(9d8 + 27)',
    speed: '0 ft., fly 60 ft. (hover)',
    initiativeBonus: 3,
    str: 6,
    dex: 16,
    con: 16,
    int: 12,
    wis: 14,
    cha: 15,
    damageResistances: 'Acid, Cold, Fire, Lightning, Thunder; Bludgeoning, Piercing, and Slashing from Nonmagical Attacks',
    damageImmunities: 'Necrotic, Poison',
    conditionImmunities: 'Charmed, Exhaustion, Grappled, Paralyzed, Petrified, Poisoned, Prone, Restrained',
    senses: 'Darkvision 60 ft., Passive Perception 12',
    languages: 'Common, understands the languages it knew in life',
    challenge: '5 (1,800 XP)',
    proficiencyBonus: 3,
    avatarUrl: '/uploads/file-1790798269852-44495161.jpg',
    traits: [
      { name: 'Incorporeal Movement', description: 'The wraith can move through other creatures and objects as if they were difficult terrain. It takes 5 (1d10) force damage if it ends its turn inside an object.' },
      { name: 'Sunlight Sensitivity', description: 'While in sunlight, the wraith has disadvantage on attack rolls, as well as on Wisdom (Perception) checks that rely on sight.' }
    ],
    actions: [
      { name: 'Life Drain', type: 'attack', attackBonus: 6, reachRange: 'reach 5 ft.', damage: '21 (4d8 + 3) necrotic', description: 'Melee Weapon Attack: +6 to hit, reach 5 ft., one creature. Hit: 21 (4d8 + 3) necrotic damage. The target must succeed on a DC 14 Constitution saving throw or its hit point maximum is reduced by an amount equal to the damage taken.' },
      { name: 'Create Specter', type: 'special', description: 'The wraith targets a humanoid within 10 feet that has been dead for no longer than 1 minute and died violently. The target\'s spirit rises as a specter under the wraith\'s control.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_vampire_spawn',
    name: 'Vampire Spawn',
    size: 'Medium',
    type: 'Undead',
    alignment: 'Neutral Evil',
    ac: 15,
    acNotes: '(natural armor)',
    hp: 82,
    hpFormula: '(11d8 + 33)',
    speed: '30 ft., climb 30 ft.',
    initiativeBonus: 3,
    str: 16,
    dex: 16,
    con: 16,
    int: 11,
    wis: 10,
    cha: 12,
    savingThrows: 'DEX +6, WIS +3',
    skills: 'Perception +3, Stealth +6',
    damageResistances: 'Necrotic; Bludgeoning, Piercing, and Slashing from Nonmagical Attacks',
    senses: 'Darkvision 60 ft., Passive Perception 13',
    languages: 'Common',
    challenge: '5 (1,800 XP)',
    proficiencyBonus: 3,
    avatarUrl: '/uploads/file-1791551560423-925814348.jfif',
    traits: [
      { name: 'Regeneration', description: 'The vampire spawn regains 10 hit points at the start of its turn if it has at least 1 hit point and isn\'t in sunlight or running water.' },
      { name: 'Spider Climb', description: 'The vampire spawn can climb difficult surfaces, including upside down on ceilings, without needing to make an ability check.' },
      { name: 'Vampire Weaknesses', description: 'Forbiddance, Harmed by Running Water, Stake to the Heart, Sunlight Hypersensitivity.' }
    ],
    actions: [
      { name: 'Multiattack', type: 'multiattack', description: 'The vampire spawn makes two attacks, only one of which can be a bite attack.' },
      { name: 'Claws', type: 'attack', attackBonus: 6, reachRange: 'reach 5 ft.', damage: '8 (2d4 + 3) slashing', description: 'Melee Weapon Attack: +6 to hit, reach 5 ft., one creature. Hit: 8 (2d4 + 3) slashing damage. Instead of dealing damage, the vampire spawn can grapple the target (escape DC 13).' },
      { name: 'Bite', type: 'attack', attackBonus: 6, reachRange: 'reach 5 ft.', damage: '6 (1d6 + 3) piercing plus 7 (2d6) necrotic', description: 'Melee Weapon Attack: +6 to hit, reach 5 ft., one willing creature, or a creature that is grappled by the vampire spawn, incapacitated, or restrained. Hit: 6 (1d6 + 3) piercing damage plus 7 (2d6) necrotic damage.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_strahd_zombie',
    name: 'Strahd Zombie',
    size: 'Medium',
    type: 'Undead',
    alignment: 'Unaligned',
    ac: 8,
    hp: 30,
    hpFormula: '(4d8 + 12)',
    speed: '20 ft.',
    initiativeBonus: -1,
    str: 13,
    dex: 6,
    con: 16,
    int: 3,
    wis: 6,
    cha: 5,
    damageImmunities: 'Poison',
    conditionImmunities: 'Poisoned',
    senses: 'Darkvision 60 ft., Passive Perception 8',
    languages: 'Understands Common but can\'t speak',
    challenge: '1 (200 XP)',
    proficiencyBonus: 2,
    avatarUrl: '/uploads/file-1792077384692-844631642.webp',
    traits: [
      { name: 'Undead Fortitude', description: 'If damage reduces the zombie to 0 hit points, it must make a Constitution saving throw with a DC of 5 + the damage taken, unless the damage is radiant or from a critical hit. On a success, the zombie drops to 1 hit point instead.' },
      { name: 'Severed Limbs', description: 'Whenever the zombie takes a critical hit or slashing damage, one of its limbs is severed and continues to attack independently.' }
    ],
    actions: [
      { name: 'Multiattack', type: 'multiattack', description: 'The zombie makes one bite attack and one claw attack.' },
      { name: 'Bite', type: 'attack', attackBonus: 3, reachRange: 'reach 5 ft.', damage: '3 (1d4 + 1) piercing', description: 'Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 3 (1d4 + 1) piercing damage.' },
      { name: 'Claws', type: 'attack', attackBonus: 3, reachRange: 'reach 5 ft.', damage: '4 (1d6 + 1) slashing', description: 'Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) slashing damage.' }
    ],
    source: 'Curse of Strahd'
  },
  {
    monsterId: 'monster_zombie',
    name: 'Zombie',
    size: 'Medium',
    type: 'Undead',
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
    avatarUrl: '/uploads/file-1791551329730-444564285.jpg',
    traits: [
      { name: 'Undead Fortitude', description: 'If damage reduces the zombie to 0 hit points, it must make a Constitution saving throw with a DC of 5 + the damage taken, unless the damage is radiant or from a critical hit. On a success, the zombie drops to 1 hit point instead.' }
    ],
    actions: [
      { name: 'Slam', type: 'attack', attackBonus: 3, reachRange: 'reach 5 ft.', damage: '4 (1d6 + 1) bludgeoning', description: 'Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) bludgeoning damage.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_skeleton',
    name: 'Skeleton',
    size: 'Medium',
    type: 'Undead',
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
    avatarUrl: '/uploads/file-1790798181480-359784765.jpg',
    actions: [
      { name: 'Shortsword', type: 'attack', attackBonus: 4, reachRange: 'reach 5 ft.', damage: '5 (1d6 + 2) piercing', description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.' },
      { name: 'Shortbow', type: 'attack', attackBonus: 4, reachRange: 'range 80/320 ft.', damage: '5 (1d6 + 2) piercing', description: 'Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 (1d6 + 2) piercing damage.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_ghoul',
    name: 'Ghoul',
    size: 'Medium',
    type: 'Undead',
    alignment: 'Chaotic Evil',
    ac: 12,
    hp: 22,
    hpFormula: '(5d8)',
    speed: '30 ft.',
    initiativeBonus: 2,
    str: 13,
    dex: 15,
    con: 10,
    int: 7,
    wis: 10,
    cha: 6,
    damageImmunities: 'Poison',
    conditionImmunities: 'Charmed, Exhaustion, Poisoned',
    senses: 'Darkvision 60 ft., Passive Perception 10',
    languages: 'Common',
    challenge: '1 (200 XP)',
    proficiencyBonus: 2,
    avatarUrl: '/uploads/file-1791551809241-792082890.jfif',
    actions: [
      { name: 'Bite', type: 'attack', attackBonus: 2, reachRange: 'reach 5 ft.', damage: '9 (2d6 + 2) piercing', description: 'Melee Weapon Attack: +2 to hit, reach 5 ft., one creature. Hit: 9 (2d6 + 2) piercing damage.' },
      { name: 'Claws', type: 'attack', attackBonus: 4, reachRange: 'reach 5 ft.', damage: '7 (2d4 + 2) slashing', description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (2d4 + 2) slashing damage. If the target is a creature other than an elf or undead, it must succeed on a DC 10 Constitution saving throw or be paralyzed for 1 minute.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_ghast',
    name: 'Ghast',
    size: 'Medium',
    type: 'Undead',
    alignment: 'Chaotic Evil',
    ac: 13,
    hp: 36,
    hpFormula: '(8d8)',
    speed: '30 ft.',
    initiativeBonus: 3,
    str: 16,
    dex: 17,
    con: 10,
    int: 11,
    wis: 10,
    cha: 8,
    damageResistances: 'Necrotic',
    damageImmunities: 'Poison',
    conditionImmunities: 'Charmed, Exhaustion, Poisoned',
    senses: 'Darkvision 60 ft., Passive Perception 10',
    languages: 'Common',
    challenge: '2 (450 XP)',
    proficiencyBonus: 2,
    avatarUrl: '/uploads/file-1792077377462-541507187.png',
    traits: [
      { name: 'Stench', description: 'Any creature that starts its turn within 5 feet of the ghast must succeed on a DC 10 Constitution saving throw or be poisoned until the start of its next turn.' },
      { name: 'Turning Defiance', description: 'The ghast and any ghouls within 30 feet of it have advantage on saving throws against effects that turn undead.' }
    ],
    actions: [
      { name: 'Bite', type: 'attack', attackBonus: 5, reachRange: 'reach 5 ft.', damage: '12 (2d8 + 3) piercing', description: 'Melee Weapon Attack: +5 to hit, reach 5 ft., one creature. Hit: 12 (2d8 + 3) piercing damage.' },
      { name: 'Claws', type: 'attack', attackBonus: 5, reachRange: 'reach 5 ft.', damage: '10 (2d6 + 3) slashing', description: 'Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) slashing damage. Target must succeed on DC 10 CON save or be paralyzed for 1 minute.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_shadow',
    name: 'Shadow',
    size: 'Medium',
    type: 'Undead',
    alignment: 'Chaotic Evil',
    ac: 12,
    hp: 16,
    hpFormula: '(3d8 + 3)',
    speed: '40 ft.',
    initiativeBonus: 2,
    str: 6,
    dex: 14,
    con: 13,
    int: 6,
    wis: 10,
    cha: 8,
    skills: 'Stealth +4 (+6 in dim light or darkness)',
    damageVulnerabilities: 'Radiant',
    damageResistances: 'Acid, Cold, Fire, Lightning, Thunder; Bludgeoning, Piercing, and Slashing from Nonmagical Attacks',
    damageImmunities: 'Necrotic, Poison',
    conditionImmunities: 'Exhaustion, Frightened, Grappled, Paralyzed, Petrified, Poisoned, Prone, Restrained',
    senses: 'Darkvision 60 ft., Passive Perception 10',
    languages: '—',
    challenge: '1/2 (100 XP)',
    proficiencyBonus: 2,
    avatarUrl: '/uploads/file-1792077378146-571110244.png',
    actions: [
      { name: 'Strength Drain', type: 'attack', attackBonus: 4, reachRange: 'reach 5 ft.', damage: '9 (2d6 + 2) necrotic', description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 9 (2d6 + 2) necrotic damage, and the target\'s Strength score is reduced by 1d4. The target dies if this reduces its Strength to 0.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_specter',
    name: 'Specter',
    size: 'Medium',
    type: 'Undead',
    alignment: 'Chaotic Evil',
    ac: 12,
    hp: 22,
    hpFormula: '(5d8)',
    speed: '0 ft., fly 50 ft. (hover)',
    initiativeBonus: 2,
    str: 1,
    dex: 14,
    con: 11,
    int: 10,
    wis: 10,
    cha: 11,
    damageResistances: 'Acid, Cold, Fire, Lightning, Thunder; Bludgeoning, Piercing, and Slashing from Nonmagical Attacks',
    damageImmunities: 'Necrotic, Poison',
    conditionImmunities: 'Charmed, Exhaustion, Grappled, Paralyzed, Petrified, Poisoned, Prone, Restrained, Unconscious',
    senses: 'Darkvision 60 ft., Passive Perception 10',
    languages: 'Understands all languages it knew in life but can\'t speak',
    challenge: '1 (200 XP)',
    proficiencyBonus: 2,
    avatarUrl: '/uploads/file-1792077378875-700680719.png',
    actions: [
      { name: 'Life Drain', type: 'attack', attackBonus: 4, reachRange: 'reach 5 ft.', damage: '10 (3d6) necrotic', description: 'Melee Spell Attack: +4 to hit, reach 5 ft., one creature. Hit: 10 (3d6) necrotic damage. Target must succeed on DC 10 CON save or hit point maximum is reduced.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_wight',
    name: 'Wight',
    size: 'Medium',
    type: 'Undead',
    alignment: 'Neutral Evil',
    ac: 14,
    acNotes: '(studded leather)',
    hp: 45,
    hpFormula: '(6d8 + 18)',
    speed: '30 ft.',
    initiativeBonus: 2,
    str: 15,
    dex: 14,
    con: 16,
    int: 10,
    wis: 13,
    cha: 15,
    skills: 'Perception +3, Stealth +4',
    damageResistances: 'Necrotic; Bludgeoning, Piercing, and Slashing from Nonmagical Attacks',
    damageImmunities: 'Poison',
    conditionImmunities: 'Exhaustion, Poisoned',
    senses: 'Darkvision 60 ft., Passive Perception 13',
    languages: 'Languages it knew in life',
    challenge: '3 (700 XP)',
    proficiencyBonus: 2,
    avatarUrl: '/uploads/file-1792077379610-967439779.png',
    actions: [
      { name: 'Multiattack', type: 'multiattack', description: 'The wight makes two longsword attacks or two longbow attacks. It can use its Life Drain in place of one longsword attack.' },
      { name: 'Life Drain', type: 'attack', attackBonus: 4, reachRange: 'reach 5 ft.', damage: '5 (1d6 + 2) necrotic', description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 5 (1d6 + 2) necrotic damage. The target must succeed on a DC 13 Constitution saving throw or its hit point maximum is reduced.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_minotaur',
    name: 'Minotaur',
    size: 'Large',
    type: 'Monstrosity',
    alignment: 'Chaotic Evil',
    ac: 14,
    acNotes: '(natural armor)',
    hp: 76,
    hpFormula: '(9d10 + 27)',
    speed: '40 ft.',
    initiativeBonus: 0,
    str: 18,
    dex: 11,
    con: 16,
    int: 6,
    wis: 16,
    cha: 9,
    skills: 'Perception +7',
    senses: 'Darkvision 60 ft., Passive Perception 17',
    languages: 'Abyssal',
    challenge: '3 (700 XP)',
    proficiencyBonus: 2,
    avatarUrl: '/uploads/file-1792077380328-283735390.png',
    traits: [
      { name: 'Charge', description: 'If the minotaur moves at least 10 feet straight toward a target and then hits it with a gore attack on the same turn, the target takes an extra 9 (2d8) piercing damage. If the target is a creature, it must succeed on a DC 14 Strength saving throw or be pushed up to 10 feet away and knocked prone.' },
      { name: 'Labyrinthine Recall', description: 'The minotaur can perfectly recall any path it has traveled.' },
      { name: 'Reckless', description: 'At the start of its turn, the minotaur can gain advantage on all melee weapon attack rolls it makes during that turn, but attack rolls against it have advantage until the start of its next turn.' }
    ],
    actions: [
      { name: 'Greataxe', type: 'attack', attackBonus: 6, reachRange: 'reach 5 ft.', damage: '17 (2d12 + 4) slashing', description: 'Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 17 (2d12 + 4) slashing damage.' },
      { name: 'Gore', type: 'attack', attackBonus: 6, reachRange: 'reach 5 ft.', damage: '13 (2d8 + 4) piercing', description: 'Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) piercing damage.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_orog',
    name: 'Orog',
    size: 'Medium',
    type: 'Humanoid (Orc)',
    alignment: 'Chaotic Evil',
    ac: 18,
    acNotes: '(plate)',
    hp: 42,
    hpFormula: '(5d8 + 20)',
    speed: '30 ft.',
    initiativeBonus: 1,
    str: 18,
    dex: 12,
    con: 18,
    int: 12,
    wis: 11,
    cha: 12,
    skills: 'Intimidation +3, Survival +2',
    senses: 'Darkvision 60 ft., Passive Perception 10',
    languages: 'Common, Orc',
    challenge: '2 (450 XP)',
    proficiencyBonus: 2,
    avatarUrl: '/uploads/file-1792077384999-417376430.webp',
    actions: [
      { name: 'Multiattack', type: 'multiattack', description: 'The orog makes two greataxe attacks.' },
      { name: 'Greataxe', type: 'attack', attackBonus: 6, reachRange: 'reach 5 ft.', damage: '10 (1d12 + 4) slashing', description: 'Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 10 (1d12 + 4) slashing damage.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_stunjelly',
    name: 'Stunjelly',
    size: 'Large',
    type: 'Ooze',
    alignment: 'Unaligned',
    ac: 9,
    hp: 45,
    hpFormula: '(6d10 + 12)',
    speed: '10 ft., climb 10 ft.',
    initiativeBonus: -1,
    str: 15,
    dex: 8,
    con: 15,
    int: 1,
    wis: 6,
    cha: 1,
    damageImmunities: 'Acid, Lightning, Slashing',
    conditionImmunities: 'Blinded, Charmed, Deafened, Exhaustion, Frightened, Prone',
    senses: 'Blindsight 60 ft. (blind beyond this radius), Passive Perception 8',
    languages: '—',
    challenge: '2 (450 XP)',
    proficiencyBonus: 2,
    avatarUrl: '/uploads/file-1792077385222-509551079.webp',
    traits: [
      { name: 'False Appearance', description: 'While the stunjelly remains motionless, it is indistinguishable from an ordinary stone wall or floor.' }
    ],
    actions: [
      { name: 'Pseudopod', type: 'attack', attackBonus: 4, reachRange: 'reach 5 ft.', damage: '9 (2d6 + 2) bludgeoning plus 7 (2d6) acid', description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 9 (2d6 + 2) bludgeoning damage plus 7 (2d6) acid damage, and target must succeed on DC 12 CON save or be paralyzed for 1 minute.' }
    ],
    source: 'Classic Module'
  },
  {
    monsterId: 'monster_giant_spider',
    name: 'Giant Spider',
    size: 'Large',
    type: 'Beast',
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
    avatarUrl: '/uploads/file-1790541943352-104759656.jfif',
    traits: [
      { name: 'Spider Climb', description: 'The spider can climb difficult surfaces, including upside down on ceilings, without needing to make an ability check.' },
      { name: 'Web Sense', description: 'While in contact with a web, the spider knows the exact location of any other creature in contact with the same web.' },
      { name: 'Web Walker', description: 'The spider ignores movement restrictions caused by webbing.' }
    ],
    actions: [
      { name: 'Bite', type: 'attack', attackBonus: 5, reachRange: 'reach 5 ft.', damage: '7 (1d8 + 3) piercing plus 9 (2d8) poison', description: 'Melee Weapon Attack: +5 to hit, reach 5 ft., one creature. Hit: 7 (1d8 + 3) piercing damage, and the target must make a DC 11 Constitution saving throw, taking 9 (2d8) poison damage on a failed save, or half as much damage on a successful one.' },
      { name: 'Web (Recharge 5-6)', type: 'attack', attackBonus: 5, reachRange: 'range 30/60 ft.', description: 'Ranged Weapon Attack: +5 to hit, range 30/60 ft., one creature. Hit: The target is restrained by webbing.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_thug',
    name: 'Thug',
    size: 'Medium',
    type: 'Humanoid (Any Race)',
    alignment: 'Any Non-Good Alignment',
    ac: 11,
    acNotes: '(leather armor)',
    hp: 32,
    hpFormula: '(5d8 + 10)',
    speed: '30 ft.',
    initiativeBonus: 0,
    str: 15,
    dex: 11,
    con: 14,
    int: 10,
    wis: 10,
    cha: 11,
    skills: 'Intimidation +2',
    senses: 'Passive Perception 10',
    languages: 'Any one language (usually Common)',
    challenge: '1/2 (100 XP)',
    proficiencyBonus: 2,
    avatarUrl: '/uploads/file-1792077380953-585139729.png',
    traits: [
      { name: 'Pack Tactics', description: 'The thug has advantage on an attack roll against a creature if at least one of the thug\'s allies is within 5 feet of the creature and the ally isn\'t incapacitated.' }
    ],
    actions: [
      { name: 'Multiattack', type: 'multiattack', description: 'The thug makes two melee attacks.' },
      { name: 'Mace', type: 'attack', attackBonus: 4, reachRange: 'reach 5 ft.', damage: '5 (1d6 + 2) bludgeoning', description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 5 (1d6 + 2) bludgeoning damage.' },
      { name: 'Heavy Crossbow', type: 'attack', attackBonus: 2, reachRange: 'range 100/400 ft.', damage: '5 (1d10) piercing', description: 'Ranged Weapon Attack: +2 to hit, range 100/400 ft., one target. Hit: 5 (1d10) piercing damage.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_guard',
    name: 'Guard',
    size: 'Medium',
    type: 'Humanoid (Any Race)',
    alignment: 'Any Alignment',
    ac: 16,
    acNotes: '(chain shirt, shield)',
    hp: 11,
    hpFormula: '(2d8 + 2)',
    speed: '30 ft.',
    initiativeBonus: 1,
    str: 13,
    dex: 12,
    con: 12,
    int: 10,
    wis: 11,
    cha: 10,
    skills: 'Perception +2',
    senses: 'Passive Perception 12',
    languages: 'Any one language (usually Common)',
    challenge: '1/8 (25 XP)',
    proficiencyBonus: 2,
    avatarUrl: '/uploads/file-1792077381663-439615846.png',
    actions: [
      { name: 'Spear', type: 'attack', attackBonus: 3, reachRange: 'reach 5 ft. or range 20/60 ft.', damage: '4 (1d6 + 1) piercing', description: 'Melee or Ranged Weapon Attack: +3 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 4 (1d6 + 1) piercing damage.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_cultist',
    name: 'Cultist',
    size: 'Medium',
    type: 'Humanoid (Any Race)',
    alignment: 'Any Non-Good Alignment',
    ac: 12,
    acNotes: '(leather armor)',
    hp: 9,
    hpFormula: '(2d8)',
    speed: '30 ft.',
    initiativeBonus: 1,
    str: 11,
    dex: 12,
    con: 10,
    int: 10,
    wis: 11,
    cha: 10,
    skills: 'Deception +2, Religion +2',
    senses: 'Passive Perception 10',
    languages: 'Any one language (usually Common)',
    challenge: '1/8 (25 XP)',
    proficiencyBonus: 2,
    avatarUrl: '/uploads/file-1792077382643-694942403.png',
    actions: [
      { name: 'Scimitar', type: 'attack', attackBonus: 3, reachRange: 'reach 5 ft.', damage: '4 (1d6 + 1) slashing', description: 'Melee Weapon Attack: +3 to hit, reach 5 ft., one creature. Hit: 4 (1d6 + 1) slashing damage.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_wolf',
    name: 'Wolf',
    size: 'Medium',
    type: 'Beast',
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
    avatarUrl: '/uploads/file-1792077383356-748374669.png',
    traits: [
      { name: 'Keen Hearing and Smell', description: 'The wolf has advantage on Wisdom (Perception) checks that rely on hearing or smell.' },
      { name: 'Pack Tactics', description: 'The wolf has advantage on an attack roll against a creature if at least one of the wolf\'s allies is within 5 feet of the creature and the ally isn\'t incapacitated.' }
    ],
    actions: [
      { name: 'Bite', type: 'attack', attackBonus: 4, reachRange: 'reach 5 ft.', damage: '7 (2d4 + 2) piercing', description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (2d4 + 2) piercing damage. If the target is a creature, it must succeed on a DC 11 Strength saving throw or be knocked prone.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_dire_wolf',
    name: 'Dire Wolf',
    size: 'Large',
    type: 'Beast',
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
    avatarUrl: '/uploads/file-1792077384022-922852625.png',
    traits: [
      { name: 'Keen Hearing and Smell', description: 'The dire wolf has advantage on Wisdom (Perception) checks that rely on hearing or smell.' },
      { name: 'Pack Tactics', description: 'The dire wolf has advantage on an attack roll against a creature if at least one of the dire wolf\'s allies is within 5 feet.' }
    ],
    actions: [
      { name: 'Bite', type: 'attack', attackBonus: 5, reachRange: 'reach 5 ft.', damage: '10 (2d6 + 3) piercing', description: 'Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) piercing damage. DC 13 STR save or knocked prone.' }
    ],
    source: 'SRD 5.1'
  }
];

/**
 * Normalizes monster names and titles for matching
 */
export function normalizeMonsterName(name: string): string {
  return (name || '')
    .toLowerCase()
    .trim()
    .replace(/\(.*?\)/g, '') // remove parentheticals like "(wraith)"
    .replace(/^(\d+x?|\w+)\s+/i, '') // remove leading "3x " or "3 "
    .replace(/[,\-.:]/g, '')
    .trim();
}

/**
 * Strict monster name matching.
 * Monster names must match exactly (case-insensitive).
 * Allows singular vs plural differences where an "s" or "es" is at the end (e.g.,
 * "moonlight guardian" matches "moonlight guardians", "zombie" matches "zombies",
 * "vampire spawn" matches "vampire spawns", "guard" matches "guards").
 * NEVER matches substrings or partial names (e.g. "moonlight guardian" will NEVER match "guard").
 */
export function isExactMonsterMatch(candidateName: string, monsterName: string): boolean {
  const normC = candidateName.trim().toLowerCase().replace(/['"`]/g, '').replace(/\s+/g, ' ');
  const normM = monsterName.trim().toLowerCase().replace(/['"`]/g, '').replace(/\s+/g, ' ');
  if (!normC || !normM) return false;

  // 1. Direct identical match
  if (normC === normM) return true;

  // 2. Singular / plural with trailing "s" ("If an S is at the end, thats okay.")
  if (normC + 's' === normM || normM + 's' === normC) return true;

  // 3. Trailing "es" (e.g. witch / witches)
  if (normC + 'es' === normM || normM + 'es' === normC) return true;

  // 4. Trailing "ies" vs "y" (e.g. harpy / harpies, mummy / mummies)
  if (normC.endsWith('ies') && normC.slice(0, -3) + 'y' === normM) return true;
  if (normM.endsWith('ies') && normM.slice(0, -3) + 'y' === normC) return true;

  // 5. Trailing "ves" vs "f" (e.g. wolf / wolves)
  if (normC.endsWith('ves') && normC.slice(0, -3) + 'f' === normM) return true;
  if (normM.endsWith('ves') && normM.slice(0, -3) + 'f' === normC) return true;

  // 6. Both stripped of trailing "s"
  const stripS = (s: string) => (s.endsWith('s') && !s.endsWith('ss') && !s.endsWith('us') && !s.endsWith('is') ? s.slice(0, -1) : s);
  if (stripS(normC) === stripS(normM)) return true;

  return false;
}

/**
 * Resolves a monster string or name against all available monsters (with SRD fallbacks).
 * Returns a complete Monster object and quantity count.
 */
export function resolveMonster(
  rawInput: string | any,
  compendium: Monster[]
): { monster: Monster; count: number } {
  if (typeof rawInput === 'object' && rawInput !== null && rawInput.name) {
    const count = typeof rawInput.count === 'number' && rawInput.count > 0 ? rawInput.count : 1;
    return { monster: rawInput as Monster, count };
  }

  const rawStr = String(rawInput || '').trim();
  if (!rawStr) {
    return {
      monster: {
        monsterId: `gen_${Date.now()}`,
        name: 'Monster',
        size: 'Medium',
        type: 'Monstrosity',
        alignment: 'Unaligned',
        ac: 12,
        hp: 25,
        speed: '30 ft.',
        initiativeBonus: 1,
        str: 12,
        dex: 12,
        con: 12,
        int: 10,
        wis: 10,
        cha: 10,
        challenge: '1',
        proficiencyBonus: 2
      },
      count: 1
    };
  }

  // 1. Extract count: e.g. "4x Vampire Spawn", "6 vampire spawns", "1 Wraith", "two ghouls"
  let count = 1;
  const countMatch = rawStr.match(/^(\d+)\s*x?\s+/i);
  if (countMatch) {
    count = parseInt(countMatch[1], 10) || 1;
  } else {
    const wordNumbers: Record<string, number> = {
      one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
      eleven: 11, twelve: 12, a: 1, an: 1
    };
    const firstWord = rawStr.split(/\s+/)[0]?.toLowerCase();
    if (firstWord && wordNumbers[firstWord]) {
      count = wordNumbers[firstWord];
    }
  }

  // Clean candidate name
  let candidate = rawStr
    .replace(/^\d+\s*x?\s+/i, '')
    .replace(/^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|a|an)\s+(?:x\s*)?/i, '')
    .trim();

  // If in format "Guerthel (Wraith)", extract parenthetical type if known
  const parenMatch = candidate.match(/\((.*?)\)/);
  const parenType = parenMatch ? parenMatch[1].trim() : null;

  const allAvailable = [...compendium, ...SRD_MONSTERS];

  // Match candidate or parenType strictly
  const matchCandidates = [
    candidate,
    parenType,
    candidate.replace(/\(.*?\)/g, '').trim()
  ].filter(Boolean) as string[];

  let found: Monster | undefined;
  // Strict exact match: names must match exactly (case-insensitive, allowing singular/plural 's' or 'es' endings).
  // Substring or partial matching is strictly forbidden (e.g. "moonlight guardian" must NEVER match "guard").
  for (const cName of matchCandidates) {
    found = allAvailable.find(m => isExactMonsterMatch(cName, m.name));
    if (found) break;
  }

  if (found) {
    // If original name had a unique alias (like "Guerthel (Wraith)"), preserve that specific display name
    const finalName = parenMatch ? candidate : found.name;
    return {
      monster: {
        ...found,
        name: finalName
      },
      count
    };
  }

  // 3. Fallback: synthesize dynamic monster with the EXACT requested name
  const rawTarget = (parenType || candidate).trim();
  // Strip plural trailing 's' if candidate was plural (e.g. "moonlight guardians" -> "Moonlight Guardian")
  const singularBase = rawTarget.endsWith('s') && !rawTarget.endsWith('ss') && !rawTarget.endsWith('us') && !rawTarget.endsWith('is') && rawTarget.length > 3
    ? rawTarget.slice(0, -1)
    : rawTarget;

  const toTitleCase = (str: string) =>
    str
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

  const displayName = toTitleCase(singularBase);
  const synthId = `monster_${displayName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  
  return {
    monster: {
      monsterId: synthId,
      name: displayName,
      size: 'Medium',
      type: 'Creature',
      alignment: 'Unaligned',
      ac: 13,
      hp: 35,
      hpFormula: '(5d8 + 10)',
      speed: '30 ft.',
      initiativeBonus: 1,
      str: 14,
      dex: 12,
      con: 14,
      int: 10,
      wis: 11,
      cha: 10,
      challenge: '1 (200 XP)',
      proficiencyBonus: 2,
      avatarUrl: '/uploads/file-1792077381663-439615846.png',
      actions: [
        {
          name: 'Strike',
          type: 'attack',
          attackBonus: 4,
          reachRange: 'reach 5 ft.',
          damage: '6 (1d8 + 2) bludgeoning',
          description: 'Melee Attack: +4 to hit, reach 5 ft., one target. Hit: 6 (1d8 + 2) damage.'
        }
      ],
      source: 'Encounter Notes'
    },
    count
  };
}
