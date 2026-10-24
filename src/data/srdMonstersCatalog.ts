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
  },
  {
    monsterId: 'monster_doppelganger',
    name: 'Doppelganger',
    size: 'Medium',
    type: 'Monstrosity (Shapechanger)',
    alignment: 'Neutral',
    ac: 14,
    hp: 52,
    hpFormula: '(8d8 + 16)',
    speed: '30 ft.',
    initiativeBonus: 4,
    str: 11,
    dex: 18,
    con: 14,
    int: 11,
    wis: 12,
    cha: 14,
    skills: 'Deception +6, Insight +3',
    conditionImmunities: 'Charmed',
    senses: 'Darkvision 60 ft., Passive Perception 11',
    languages: 'Common',
    challenge: '3 (700 XP)',
    proficiencyBonus: 2,
    avatarUrl: '/uploads/file-1792077381663-439615846.png',
    traits: [
      { name: 'Shapechanger', description: 'The doppelganger can use its action to polymorph into a Small or Medium humanoid it has seen, or back into its true form. Its statistics, other than its size, are the same in each form. Any equipment it is wearing or carrying isn\'t transformed. It reverts to its true form if it dies.' },
      { name: 'Ambusher', description: 'In the first round of a combat, the doppelganger has advantage on attack rolls against any creature it surprised.' },
      { name: 'Surprise Attack', description: 'If the doppelganger surprises a creature and hits it with an attack during the first round of combat, the target takes an extra 10 (3d6) damage from the attack.' }
    ],
    actions: [
      { name: 'Multiattack', type: 'multiattack', description: 'The doppelganger makes two melee attacks.' },
      { name: 'Slam', type: 'attack', attackBonus: 6, reachRange: 'reach 5 ft.', damage: '7 (1d6 + 4) bludgeoning', description: 'Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 7 (1d6 + 4) bludgeoning damage.' },
      { name: 'Read Thoughts', type: 'special', description: 'The doppelganger magically reads the surface thoughts of one creature within 60 feet of it. The effect can penetrate barriers, but 3 feet of wood or dirt, 2 feet of stone, 2 inches of metal, or a thin sheet of lead blocks it. While reading the target\'s mind, the doppelganger has advantage on Wisdom (Insight) and Charisma (Deception, Intimidation, and Persuasion) checks against the target.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_gladiator',
    name: 'Gladiator',
    size: 'Medium',
    type: 'Humanoid (Any Race)',
    alignment: 'Any Alignment',
    ac: 16,
    acNotes: '(studded leather, shield)',
    hp: 112,
    hpFormula: '(15d8 + 45)',
    speed: '30 ft.',
    initiativeBonus: 2,
    str: 18,
    dex: 15,
    con: 16,
    int: 10,
    wis: 12,
    cha: 15,
    savingThrows: 'STR +7, DEX +5, CON +6',
    skills: 'Athletics +10, Intimidation +5',
    senses: 'Passive Perception 11',
    languages: 'Any one language (usually Common)',
    challenge: '5 (1,800 XP)',
    proficiencyBonus: 3,
    avatarUrl: '/uploads/file-1792077381663-439615846.png',
    traits: [
      { name: 'Brave', description: 'The gladiator has advantage on saving throws against being frightened.' },
      { name: 'Brute', description: 'A melee weapon deals one extra die of its damage when the gladiator hits with it (included in the attack).' }
    ],
    actions: [
      { name: 'Multiattack', type: 'multiattack', description: 'The gladiator makes three melee attacks or two ranged attacks.' },
      { name: 'Spear', type: 'attack', attackBonus: 7, reachRange: 'reach 5 ft. or range 20/60 ft.', damage: '11 (2d6 + 4) piercing', description: 'Melee or Ranged Weapon Attack: +7 to hit, reach 5 ft. and range 20/60 ft., one target. Hit: 11 (2d6 + 4) piercing damage, or 13 (2d8 + 4) piercing damage if used with two hands to make a melee attack.' },
      { name: 'Shield Bash', type: 'attack', attackBonus: 7, reachRange: 'reach 5 ft.', damage: '9 (2d4 + 4) bludgeoning', description: 'Melee Weapon Attack: +7 to hit, reach 5 ft., one creature. Hit: 9 (2d4 + 4) bludgeoning damage. If the target is a Medium or smaller creature, it must succeed on a DC 15 Strength saving throw or be knocked prone.' }
    ],
    reactions: [
      { name: 'Parry', type: 'special', description: 'The gladiator adds 3 to its AC against one melee attack that would hit it. To do so, the gladiator must see the attacker and be wielding a melee weapon.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_bandit',
    name: 'Bandit',
    size: 'Medium',
    type: 'Humanoid (Any Race)',
    alignment: 'Any Non-Lawful Alignment',
    ac: 12,
    acNotes: '(leather armor)',
    hp: 11,
    hpFormula: '(2d8 + 2)',
    speed: '30 ft.',
    initiativeBonus: 1,
    str: 11,
    dex: 12,
    con: 12,
    int: 10,
    wis: 10,
    cha: 10,
    senses: 'Passive Perception 10',
    languages: 'Any one language (usually Common)',
    challenge: '1/8 (25 XP)',
    proficiencyBonus: 2,
    avatarUrl: '/uploads/file-1792077380953-585139729.png',
    actions: [
      { name: 'Scimitar', type: 'attack', attackBonus: 3, reachRange: 'reach 5 ft.', damage: '4 (1d6 + 1) slashing', description: 'Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) slashing damage.' },
      { name: 'Light Crossbow', type: 'attack', attackBonus: 3, reachRange: 'range 80/320 ft.', damage: '5 (1d8 + 1) piercing', description: 'Ranged Weapon Attack: +3 to hit, range 80/320 ft., one target. Hit: 5 (1d8 + 1) piercing damage.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_bandit_captain',
    name: 'Bandit Captain',
    size: 'Medium',
    type: 'Humanoid (Any Race)',
    alignment: 'Any Non-Lawful Alignment',
    ac: 15,
    acNotes: '(studded leather)',
    hp: 65,
    hpFormula: '(10d8 + 20)',
    speed: '30 ft.',
    initiativeBonus: 3,
    str: 15,
    dex: 16,
    con: 14,
    int: 14,
    wis: 11,
    cha: 14,
    savingThrows: 'STR +4, DEX +5, WIS +2',
    skills: 'Athletics +4, Deception +4',
    senses: 'Passive Perception 10',
    languages: 'Any two languages',
    challenge: '2 (450 XP)',
    proficiencyBonus: 2,
    avatarUrl: '/uploads/file-1792077380953-585139729.png',
    actions: [
      { name: 'Multiattack', type: 'multiattack', description: 'The captain makes three melee attacks: two with its scimitar and one with its dagger. Or the captain makes two ranged attacks with its daggers.' },
      { name: 'Scimitar', type: 'attack', attackBonus: 5, reachRange: 'reach 5 ft.', damage: '6 (1d6 + 3) slashing', description: 'Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) slashing damage.' },
      { name: 'Dagger', type: 'attack', attackBonus: 5, reachRange: 'reach 5 ft. or range 20/60 ft.', damage: '5 (1d4 + 3) piercing', description: 'Melee or Ranged Weapon Attack: +5 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 5 (1d4 + 3) piercing damage.' }
    ],
    reactions: [
      { name: 'Parry', type: 'special', description: 'The captain adds 2 to its AC against one melee attack that would hit it. To do so, the captain must see the attacker and be wielding a melee weapon.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_assassin',
    name: 'Assassin',
    size: 'Medium',
    type: 'Humanoid (Any Race)',
    alignment: 'Any Non-Good Alignment',
    ac: 15,
    acNotes: '(studded leather)',
    hp: 78,
    hpFormula: '(12d8 + 24)',
    speed: '30 ft.',
    initiativeBonus: 3,
    str: 11,
    dex: 16,
    con: 14,
    int: 13,
    wis: 11,
    cha: 10,
    savingThrows: 'DEX +6, INT +4',
    skills: 'Acrobatics +6, Deception +3, Perception +3, Stealth +9',
    damageResistances: 'Poison',
    senses: 'Passive Perception 13',
    languages: 'Thieves\' cant plus any two languages',
    challenge: '8 (3,900 XP)',
    proficiencyBonus: 3,
    avatarUrl: '/uploads/file-1792077380953-585139729.png',
    traits: [
      { name: 'Assassinate', description: 'During its first turn, the assassin has advantage on attack rolls against any creature that hasn\'t taken a turn. Any hit the assassin scores against a surprised creature is a critical hit.' },
      { name: 'Evasion', description: 'If the assassin is subjected to an effect that allows it to make a Dexterity saving throw to take only half damage, the assassin instead takes no damage if it succeeds on the saving throw, and only half damage if it fails.' },
      { name: 'Sneak Attack (1/Turn)', description: 'The assassin deals an extra 14 (4d6) damage when it hits a target with a weapon attack and has advantage on the attack roll, or when the target is within 5 feet of an ally that isn\'t incapacitated.' }
    ],
    actions: [
      { name: 'Multiattack', type: 'multiattack', description: 'The assassin makes two shortsword attacks.' },
      { name: 'Shortsword', type: 'attack', attackBonus: 6, reachRange: 'reach 5 ft.', damage: '6 (1d6 + 3) piercing', description: 'Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) piercing damage, and the target must make a DC 15 Constitution saving throw, taking 24 (7d6) poison damage on a failed save, or half as much on a success.' },
      { name: 'Light Crossbow', type: 'attack', attackBonus: 6, reachRange: 'range 80/320 ft.', damage: '7 (1d8 + 3) piercing', description: 'Ranged Weapon Attack: +6 to hit, range 80/320 ft., one target. Hit: 7 (1d8 + 3) piercing damage, and the target must make a DC 15 Constitution saving throw, taking 24 (7d6) poison damage on a failed save, or half as much on a success.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_noble',
    name: 'Noble',
    size: 'Medium',
    type: 'Humanoid (Any Race)',
    alignment: 'Any Alignment',
    ac: 15,
    acNotes: '(breastplate)',
    hp: 9,
    hpFormula: '(2d8)',
    speed: '30 ft.',
    initiativeBonus: 1,
    str: 11,
    dex: 12,
    con: 11,
    int: 12,
    wis: 14,
    cha: 16,
    skills: 'Deception +5, Insight +4, Persuasion +5',
    senses: 'Passive Perception 12',
    languages: 'Any two languages',
    challenge: '1/8 (25 XP)',
    proficiencyBonus: 2,
    avatarUrl: '/uploads/file-1792077381663-439615846.png',
    actions: [
      { name: 'Rapier', type: 'attack', attackBonus: 3, reachRange: 'reach 5 ft.', damage: '5 (1d8 + 1) piercing', description: 'Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 5 (1d8 + 1) piercing damage.' }
    ],
    reactions: [
      { name: 'Parry', type: 'special', description: 'The noble adds 2 to its AC against one melee attack that would hit it. To do so, the noble must see the attacker and be wielding a melee weapon.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_oni',
    name: 'Oni',
    size: 'Large',
    type: 'Giant',
    alignment: 'Lawful Evil',
    ac: 16,
    acNotes: '(chain mail)',
    hp: 110,
    hpFormula: '(13d10 + 39)',
    speed: '30 ft., fly 30 ft.',
    initiativeBonus: 0,
    str: 19,
    dex: 11,
    con: 16,
    int: 14,
    wis: 12,
    cha: 15,
    savingThrows: 'DEX +3, CON +6, WIS +4, CHA +5',
    skills: 'Arcana +5, Deception +8, Perception +4',
    senses: 'Darkvision 60 ft., Passive Perception 14',
    languages: 'Common, Giant',
    challenge: '7 (2,900 XP)',
    proficiencyBonus: 3,
    avatarUrl: '/uploads/file-1792077381663-439615846.png',
    traits: [
      { name: 'Innate Spellcasting', description: 'The oni\'s innate spellcasting ability is Charisma (spell save DC 13). Innate spells: At will: darkness, invisibility; 1/day each: charm person, cone of cold, gaseous form, sleep.' },
      { name: 'Magic Weapons', description: 'The oni\'s weapon attacks are magical.' },
      { name: 'Regeneration', description: 'The oni regains 10 hit points at the start of its turn if it has at least 1 hit point.' }
    ],
    actions: [
      { name: 'Multiattack', type: 'multiattack', description: 'The oni makes two attacks, either with its claws or its glaive.' },
      { name: 'Claw (Oni Form Only)', type: 'attack', attackBonus: 7, reachRange: 'reach 5 ft.', damage: '8 (1d8 + 4) slashing', description: 'Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 8 (1d8 + 4) slashing damage.' },
      { name: 'Glaive', type: 'attack', attackBonus: 7, reachRange: 'reach 10 ft.', damage: '15 (2d10 + 4) slashing', description: 'Melee Weapon Attack: +7 to hit, reach 10 ft., one target. Hit: 15 (2d10 + 4) slashing damage, or 9 (1d10 + 4) slashing damage in Small or Medium form.' },
      { name: 'Change Shape', type: 'special', description: 'The oni magically polymorphs into a Small or Medium humanoid, into a Large giant, or back into its true form.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_mimic',
    name: 'Mimic',
    size: 'Medium',
    type: 'Monstrosity (Shapechanger)',
    alignment: 'Neutral',
    ac: 12,
    acNotes: '(natural armor)',
    hp: 58,
    hpFormula: '(9d8 + 18)',
    speed: '15 ft.',
    initiativeBonus: 1,
    str: 17,
    dex: 12,
    con: 15,
    int: 5,
    wis: 13,
    cha: 8,
    skills: 'Stealth +5',
    damageImmunities: 'Acid',
    conditionImmunities: 'Prone',
    senses: 'Darkvision 60 ft., Passive Perception 11',
    languages: 'Common',
    challenge: '2 (450 XP)',
    proficiencyBonus: 2,
    avatarUrl: '/uploads/file-1792077381663-439615846.png',
    traits: [
      { name: 'Shapechanger', description: 'The mimic can use its action to polymorph into an object or back into its true, amorphous form. Its statistics are the same in each form.' },
      { name: 'Adhesive (Object Form Only)', description: 'The mimic adheres to anything that touches it. A Huge or smaller creature adhered to the mimic is also grappled by it (escape DC 13). Ability checks made to escape this grapple have disadvantage.' },
      { name: 'False Appearance (Object Form Only)', description: 'While the mimic remains motionless, it is indistinguishable from an ordinary object.' },
      { name: 'Grappler', description: 'The mimic has advantage on attack rolls against any creature grappled by it.' }
    ],
    actions: [
      { name: 'Pseudopod', type: 'attack', attackBonus: 5, reachRange: 'reach 5 ft.', damage: '7 (1d8 + 3) bludgeoning', description: 'Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) bludgeoning damage. If the mimic is in object form, the target is subjected to its Adhesive trait.' },
      { name: 'Bite', type: 'attack', attackBonus: 5, reachRange: 'reach 5 ft.', damage: '7 (1d8 + 3) piercing plus 4 (1d8) acid', description: 'Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) piercing damage plus 4 (1d8) acid damage.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_riding_horse',
    name: 'Riding Horse',
    size: 'Large',
    type: 'Beast',
    alignment: 'Unaligned',
    ac: 10,
    hp: 13,
    hpFormula: '(2d10 + 2)',
    speed: '60 ft.',
    initiativeBonus: 0,
    str: 16,
    dex: 10,
    con: 12,
    int: 2,
    wis: 11,
    cha: 7,
    senses: 'Passive Perception 10',
    languages: '—',
    challenge: '1/4 (50 XP)',
    proficiencyBonus: 2,
    avatarUrl: '/uploads/file-1792077383356-748374669.png',
    actions: [
      { name: 'Hooves', type: 'attack', attackBonus: 5, reachRange: 'reach 5 ft.', damage: '8 (2d4 + 3) bludgeoning', description: 'Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 8 (2d4 + 3) bludgeoning damage.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_commoner',
    name: 'Commoner',
    size: 'Medium',
    type: 'Humanoid (Any Race)',
    alignment: 'Any Alignment',
    ac: 10,
    hp: 4,
    hpFormula: '(1d8)',
    speed: '30 ft.',
    initiativeBonus: 0,
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    senses: 'Passive Perception 10',
    languages: 'Any one language (usually Common)',
    challenge: '0 (10 XP)',
    proficiencyBonus: 2,
    avatarUrl: '/uploads/file-1792077381663-439615846.png',
    actions: [
      { name: 'Club', type: 'attack', attackBonus: 2, reachRange: 'reach 5 ft.', damage: '2 (1d4) bludgeoning', description: 'Melee Weapon Attack: +2 to hit, reach 5 ft., one target. Hit: 2 (1d4) bludgeoning damage.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_spy',
    name: 'Spy',
    size: 'Medium',
    type: 'Humanoid (Any Race)',
    alignment: 'Any Alignment',
    ac: 12,
    hp: 27,
    hpFormula: '(6d8)',
    speed: '30 ft.',
    initiativeBonus: 2,
    str: 10,
    dex: 15,
    con: 10,
    int: 12,
    wis: 14,
    cha: 16,
    skills: 'Deception +5, Insight +4, Investigation +5, Perception +6, Persuasion +5, Sleight of Hand +4, Stealth +4',
    senses: 'Passive Perception 16',
    languages: 'Any two languages',
    challenge: '1 (200 XP)',
    proficiencyBonus: 2,
    avatarUrl: '/uploads/file-1792077380953-585139729.png',
    traits: [
      { name: 'Cunning Action', description: 'On each of its turns, the spy can use a bonus action to take the Dash, Disengage, or Hide action.' },
      { name: 'Sneak Attack (1/Turn)', description: 'The spy deals an extra 7 (2d6) damage when it hits a target with a weapon attack and has advantage on the attack roll, or when the target is within 5 feet of an ally that isn\'t incapacitated.' }
    ],
    actions: [
      { name: 'Multiattack', type: 'multiattack', description: 'The spy makes two melee attacks.' },
      { name: 'Shortsword', type: 'attack', attackBonus: 4, reachRange: 'reach 5 ft.', damage: '5 (1d6 + 2) piercing', description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.' },
      { name: 'Hand Crossbow', type: 'attack', attackBonus: 4, reachRange: 'range 30/120 ft.', damage: '5 (1d6 + 2) piercing', description: 'Ranged Weapon Attack: +4 to hit, range 30/120 ft., one target. Hit: 5 (1d6 + 2) piercing damage.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_swarm_of_quippers',
    name: 'Swarm of Quippers',
    size: 'Medium',
    type: 'Swarm of Tiny Beasts',
    alignment: 'Unaligned',
    ac: 13,
    hp: 28,
    hpFormula: '(8d8 - 8)',
    speed: '0 ft., swim 40 ft.',
    initiativeBonus: 3,
    str: 13,
    dex: 16,
    con: 9,
    int: 1,
    wis: 7,
    cha: 2,
    damageResistances: 'Bludgeoning, Piercing, Slashing',
    conditionImmunities: 'Charmed, Frightened, Grappled, Paralyzed, Petrified, Prone, Restrained, Stunned',
    senses: 'Darkvision 60 ft., Passive Perception 8',
    languages: '—',
    challenge: '1 (200 XP)',
    proficiencyBonus: 2,
    avatarUrl: '/uploads/file-1792077381663-439615846.png',
    traits: [
      { name: 'Blood Frenzy', description: 'The swarm has advantage on melee attack rolls against any creature that doesn\'t have all its hit points.' },
      { name: 'Swarm', description: 'The swarm can occupy another creature\'s space and vice versa, and the swarm can move through any opening large enough for a Tiny quipper. The swarm can\'t regain hit points or gain temporary hit points.' },
      { name: 'Water Breathing', description: 'The swarm can breathe only underwater.' }
    ],
    actions: [
      { name: 'Bites', type: 'attack', attackBonus: 5, reachRange: 'reach 0 ft.', damage: '14 (4d6) piercing', description: 'Melee Weapon Attack: +5 to hit, reach 0 ft., one creature in the swarm\'s space. Hit: 14 (4d6) piercing damage, or 7 (2d6) piercing damage if the swarm has half its hit points or fewer.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_guardian_portrait',
    name: 'Guardian Portrait',
    size: 'Medium',
    type: 'Construct',
    alignment: 'Unaligned',
    ac: 5,
    hp: 22,
    hpFormula: '(5d8)',
    speed: '0 ft.',
    initiativeBonus: -5,
    str: 1,
    dex: 1,
    con: 10,
    int: 14,
    wis: 10,
    cha: 14,
    damageImmunities: 'Poison; Bludgeoning, Piercing, and Slashing from Nonmagical Attacks',
    conditionImmunities: 'Charmed, Exhaustion, Frightened, Grappled, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious',
    senses: 'Darkvision 60 ft., Passive Perception 10',
    languages: 'Common plus up to two other languages',
    challenge: '1 (200 XP)',
    proficiencyBonus: 2,
    avatarUrl: '/uploads/file-1792077381663-439615846.png',
    traits: [
      { name: 'Antimagic Susceptibility', description: 'The portrait is incapacitated while in the area of an antimagic field. If targeted by dispel magic, the portrait must succeed on a Constitution saving throw against the caster\'s spell save DC or become unconscious for 1 minute.' },
      { name: 'Innate Spellcasting', description: 'The portrait\'s innate spellcasting ability is Intelligence (spell save DC 12). The portrait can innately cast the following spells, requiring no components: 3/day each: counterspell, crown of madness, hypnotic pattern, telekinesis.' },
      { name: 'False Appearance', description: 'While the portrait remains motionless, including in its frame, it is indistinguishable from a normal painting.' }
    ],
    source: 'Curse of Strahd / Keys from the Golden Vault'
  },
  {
    monsterId: 'monster_spider',
    name: 'Spider',
    size: 'Tiny',
    type: 'Beast',
    alignment: 'Unaligned',
    ac: 12,
    hp: 1,
    hpFormula: '(1d4 - 1)',
    speed: '20 ft., climb 20 ft.',
    initiativeBonus: 2,
    str: 2,
    dex: 14,
    con: 8,
    int: 1,
    wis: 10,
    cha: 2,
    skills: 'Stealth +4',
    senses: 'Darkvision 30 ft., Passive Perception 10',
    languages: '—',
    challenge: '0 (10 XP)',
    proficiencyBonus: 2,
    avatarUrl: '/uploads/file-1792077381663-439615846.png',
    traits: [
      { name: 'Spider Climb', description: 'The spider can climb difficult surfaces, including upside down on ceilings, without needing to make an ability check.' },
      { name: 'Web Sense', description: 'While in contact with a web, the spider knows the exact location of any other creature in contact with the same web.' },
      { name: 'Web Walker', description: 'The spider ignores movement restrictions caused by webbing.' }
    ],
    actions: [
      { name: 'Bite', type: 'attack', attackBonus: 4, reachRange: 'reach 5 ft.', damage: '1 piercing', description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 1 piercing damage, and the target must succeed on a DC 9 Constitution saving throw or take 2 (1d4) poison damage.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_raven',
    name: 'Raven',
    size: 'Tiny',
    type: 'Beast',
    alignment: 'Unaligned',
    ac: 12,
    hp: 1,
    hpFormula: '(1d4 - 1)',
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
    avatarUrl: '/uploads/file-1792077381663-439615846.png',
    traits: [
      { name: 'Mimicry', description: 'The raven can mimic simple sounds it has heard. A creature that hears the sounds can tell they are imitations with a successful DC 10 Wisdom (Insight) check.' }
    ],
    actions: [
      { name: 'Beak', type: 'attack', attackBonus: 4, reachRange: 'reach 5 ft.', damage: '1 piercing', description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 1 piercing damage.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_phase_spider',
    name: 'Phase Spider',
    size: 'Large',
    type: 'Monstrosity',
    alignment: 'Unaligned',
    ac: 13,
    acNotes: '(natural armor)',
    hp: 32,
    hpFormula: '(5d10 + 5)',
    speed: '30 ft., climb 30 ft.',
    initiativeBonus: 1,
    str: 15,
    dex: 12,
    con: 12,
    int: 6,
    wis: 10,
    cha: 6,
    skills: 'Stealth +6',
    senses: 'Darkvision 60 ft., Passive Perception 10',
    languages: '—',
    challenge: '3 (700 XP)',
    proficiencyBonus: 2,
    avatarUrl: '/uploads/file-1790541943352-104759656.jfif',
    traits: [
      { name: 'Ethereal Jaunt', description: 'As a bonus action, the spider can magically shift from the Material Plane to the Ethereal Plane, or vice versa.' },
      { name: 'Spider Climb', description: 'The spider can climb difficult surfaces, including upside down on ceilings, without needing to make an ability check.' },
      { name: 'Web Walker', description: 'The spider ignores movement restrictions caused by webbing.' }
    ],
    actions: [
      { name: 'Bite', type: 'attack', attackBonus: 4, reachRange: 'reach 5 ft.', damage: '7 (1d10 + 2) piercing plus 18 (4d8) poison', description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 7 (1d10 + 2) piercing damage, and the target must make a DC 11 Constitution saving throw, taking 18 (4d8) poison damage on a failed save, or half as much damage on a successful one.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_treant',
    name: 'Treant',
    size: 'Huge',
    type: 'Plant',
    alignment: 'Chaotic Good',
    ac: 16,
    acNotes: '(natural armor)',
    hp: 138,
    hpFormula: '(12d12 + 60)',
    speed: '30 ft.',
    initiativeBonus: -1,
    str: 23,
    dex: 8,
    con: 21,
    int: 12,
    wis: 16,
    cha: 12,
    damageResistances: 'Bludgeoning, Piercing',
    damageVulnerabilities: 'Fire',
    senses: 'Passive Perception 13',
    languages: 'Common, Druidic, Elvish, Sylvan',
    challenge: '9 (5,000 XP)',
    proficiencyBonus: 4,
    avatarUrl: '/uploads/file-1790707157004-503180183.jfif',
    traits: [
      { name: 'False Appearance', description: 'While the treant remains motionless, it is indistinguishable from a normal tree.' },
      { name: 'Siege Monster', description: 'The treant deals double damage to objects and structures.' }
    ],
    actions: [
      { name: 'Multiattack', type: 'multiattack', description: 'The treant makes two slam attacks.' },
      { name: 'Slam', type: 'attack', attackBonus: 10, reachRange: 'reach 5 ft.', damage: '16 (3d6 + 6) bludgeoning', description: 'Melee Weapon Attack: +10 to hit, reach 5 ft., one target. Hit: 16 (3d6 + 6) bludgeoning damage.' },
      { name: 'Rock', type: 'attack', attackBonus: 10, reachRange: 'range 60/180 ft.', damage: '28 (4d10 + 6) bludgeoning', description: 'Ranged Weapon Attack: +10 to hit, range 60/180 ft., one target. Hit: 28 (4d10 + 6) bludgeoning damage.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_werewolf',
    name: 'Werewolf',
    size: 'Medium',
    type: 'Humanoid (Human, Shapechanger)',
    alignment: 'Chaotic Evil',
    ac: 12,
    acNotes: '(in humanoid form, 12 in wolf or hybrid form)',
    hp: 58,
    hpFormula: '(9d8 + 18)',
    speed: '30 ft. (40 ft. in wolf form)',
    initiativeBonus: 1,
    str: 15,
    dex: 13,
    con: 14,
    int: 10,
    wis: 11,
    cha: 10,
    skills: 'Perception +4, Stealth +3',
    damageImmunities: 'Bludgeoning, Piercing, and Slashing from Nonmagical Attacks Not Made with Silvered Weapons',
    senses: 'Passive Perception 14',
    languages: 'Common (can\'t speak in wolf form)',
    challenge: '3 (700 XP)',
    proficiencyBonus: 2,
    avatarUrl: '/uploads/file-1790542362393-148650395.jfif',
    traits: [
      { name: 'Shapechanger', description: 'The werewolf can use its action to polymorph into a wolf-humanoid hybrid or into a wolf, or back into its true form, which is humanoid.' },
      { name: 'Keen Hearing and Smell', description: 'The werewolf has advantage on Wisdom (Perception) checks that rely on hearing or smell.' }
    ],
    actions: [
      { name: 'Multiattack (Humanoid or Hybrid Form Only)', type: 'multiattack', description: 'The werewolf makes two attacks: two with its spear (humanoid form) or one with its bite and one with its claws (hybrid form).' },
      { name: 'Bite (Wolf or Hybrid Form Only)', type: 'attack', attackBonus: 4, reachRange: 'reach 5 ft.', damage: '6 (1d8 + 2) piercing', description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 6 (1d8 + 2) piercing damage. If the target is a humanoid, it must succeed on a DC 12 Constitution saving throw or be cursed with werewolf lycanthropy.' },
      { name: 'Claws (Hybrid Form Only)', type: 'attack', attackBonus: 4, reachRange: 'reach 5 ft.', damage: '7 (2d4 + 2) slashing', description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 7 (2d4 + 2) slashing damage.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_deadbark_dryad',
    name: 'Deadbark Dryad',
    size: 'Medium',
    type: 'Fey',
    alignment: 'Neutral Evil',
    ac: 16,
    acNotes: '(barkskin)',
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
    avatarUrl: '/uploads/file-1790541905194-354381266.png',
    traits: [
      { name: 'Magic Resistance', description: 'The dryad has advantage on saving throws against spells and other magical effects.' },
      { name: 'Tree Stride', description: 'Once on her turn, the dryad can use 10 feet of her movement to step magically into one living or dead tree within her reach and emerge from a second tree within 60 feet.' }
    ],
    actions: [
      { name: 'Club', type: 'attack', attackBonus: 6, reachRange: 'reach 5 ft.', damage: '8 (1d8 + 4) bludgeoning', description: 'Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 8 (1d8 + 4) bludgeoning damage.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_goblin',
    name: 'Goblin',
    size: 'Small',
    type: 'Humanoid (Goblinoid)',
    alignment: 'Neutral Evil',
    ac: 15,
    acNotes: '(leather armor, shield)',
    hp: 7,
    hpFormula: '(2d6)',
    speed: '30 ft.',
    initiativeBonus: 2,
    str: 8,
    dex: 14,
    con: 10,
    int: 10,
    wis: 8,
    cha: 8,
    skills: 'Stealth +6',
    senses: 'Darkvision 60 ft., Passive Perception 9',
    languages: 'Common, Goblin',
    challenge: '1/4 (50 XP)',
    proficiencyBonus: 2,
    avatarUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=300&q=80',
    traits: [
      { name: 'Nimble Escape', description: 'The goblin can take the Disengage or Hide action as a bonus action on each of its turns.' }
    ],
    actions: [
      { name: 'Scimitar', type: 'attack', attackBonus: 4, reachRange: 'reach 5 ft.', damage: '5 (1d6 + 2) slashing', description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.' },
      { name: 'Shortbow', type: 'attack', attackBonus: 4, reachRange: 'range 80/320 ft.', damage: '5 (1d6 + 2) piercing', description: 'Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 (1d6 + 2) piercing damage.' }
    ],
    source: 'SRD 5.1'
  },
  {
    monsterId: 'monster_orc',
    name: 'Orc',
    size: 'Medium',
    type: 'Humanoid (Orc)',
    alignment: 'Chaotic Evil',
    ac: 13,
    acNotes: '(hide armor)',
    hp: 15,
    hpFormula: '(2d8 + 6)',
    speed: '30 ft.',
    initiativeBonus: 1,
    str: 16,
    dex: 12,
    con: 16,
    int: 7,
    wis: 11,
    cha: 10,
    skills: 'Intimidation +2',
    senses: 'Darkvision 60 ft., Passive Perception 10',
    languages: 'Common, Orc',
    challenge: '1/2 (100 XP)',
    proficiencyBonus: 2,
    avatarUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=300&q=80',
    traits: [
      { name: 'Aggressive', description: 'As a bonus action, the orc can move up to its speed toward a hostile creature that it can see.' }
    ],
    actions: [
      { name: 'Greataxe', type: 'attack', attackBonus: 5, reachRange: 'reach 5 ft.', damage: '9 (1d12 + 3) slashing', description: 'Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 9 (1d12 + 3) slashing damage.' },
      { name: 'Javelin', type: 'attack', attackBonus: 5, reachRange: 'range 30/120 ft.', damage: '6 (1d6 + 3) piercing', description: 'Melee or Ranged Weapon Attack: +5 to hit, reach 5 ft. or range 30/120 ft., one target. Hit: 6 (1d6 + 3) piercing damage.' }
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

const GENERIC_FALLBACK_AVATAR = '/uploads/file-1792077381663-439615846.png';

function isTrulyGuardType(name: string): boolean {
  const n = (name || '').toLowerCase().trim();
  return /^(guard|noble|commoner|gladiator|veteran|knight)(\s+\d+)?$/i.test(n);
}

const NON_CREATURE_STAT_OR_ITEM_WORDS = new Set([
  // Ability scores, checks, saves, DCs, skills, and game mechanics
  'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma',
  'str', 'dex', 'con', 'int', 'wis', 'cha',
  'check', 'checks', 'save', 'saves', 'saving', 'throw', 'throws', 'dc', 'difficulty',
  'skill', 'skills', 'passive', 'perception', 'investigation', 'acrobatics',
  'athletics', 'arcana', 'deception', 'history', 'insight', 'intimidation',
  'medicine', 'nature', 'performance', 'persuasion', 'religion', 'stealth',
  'survival', 'sleight', 'initiative', 'proficiency', 'bonus', 'modifier',
  'attack', 'attacks', 'damage', 'healing', 'hit', 'critical', 'roll', 'rolls',
  // Weapons, armor, shields, and equipment
  'longsword', 'longswords', 'shortsword', 'shortswords', 'greatsword', 'greatswords',
  'broadsword', 'scimitar', 'scimitars', 'rapier', 'rapiers', 'dagger', 'daggers',
  'handaxe', 'handaxes', 'battleaxe', 'battleaxes', 'greataxe', 'greataxes',
  'mace', 'maces', 'morningstar', 'flail', 'flails', 'warhammer', 'warhammers',
  'maul', 'mauls', 'club', 'clubs', 'greatclub', 'quarterstaff', 'spear', 'spears',
  'javelin', 'javelins', 'trident', 'tridents', 'pike', 'pikes', 'halberd', 'halberds',
  'glaive', 'glaives', 'lance', 'lances', 'whip', 'whips', 'shortbow', 'shortbows',
  'longbow', 'longbows', 'bow', 'bows', 'crossbow', 'crossbows', 'sling', 'slings',
  'dart', 'darts', 'arrow', 'arrows', 'bolt', 'bolts', 'weapon', 'weapons',
  'blade', 'blades', 'sword', 'swords', 'axe', 'axes', 'hammer', 'hammers',
  'shield', 'shields', 'armor', 'armour', 'mail', 'chainmail', 'plate', 'breastplate',
  'leather', 'hide', 'splint', 'studded', 'buckler', 'helm', 'helmet', 'gauntlet',
  'gauntlets', 'boots', 'cloak', 'robe', 'robes', 'ring', 'rings', 'amulet', 'necklace',
  'pendant', 'brooch', 'wand', 'wands', 'rod', 'rods', 'staff', 'staves', 'scroll',
  'scrolls', 'potion', 'potions', 'philter', 'elixir', 'vial', 'vials', 'flask', 'flasks',
  'bottle', 'bottles', 'jug', 'pitcher', 'cup', 'goblet', 'chalice',
  // Currency, gems, treasure, and room furnishings/architecture
  'gem', 'gems', 'gemstone', 'gemstones', 'diamond', 'diamonds', 'ruby', 'rubies',
  'emerald', 'emeralds', 'sapphire', 'sapphires', 'pearl', 'pearls', 'opal', 'jade',
  'amber', 'topaz', 'amethyst', 'crystal', 'crystals', 'orb', 'orbs',
  'coin', 'coins', 'gold', 'silver', 'electrum', 'copper', 'platinum',
  'gp', 'sp', 'ep', 'cp', 'pp', 'treasure', 'loot', 'piece', 'pieces',
  'chest', 'chests', 'box', 'boxes', 'coffin', 'coffins', 'sarcophagus',
  'crate', 'crates', 'barrel', 'barrels', 'cask', 'keg', 'sack', 'sacks',
  'bag', 'bags', 'pouch', 'pouches', 'backpack', 'book', 'books', 'tome', 'tomes',
  'journal', 'paper', 'parchment', 'letter', 'letters', 'note', 'notes', 'map', 'maps',
  'key', 'keys', 'lock', 'locks', 'padlock', 'manacles', 'chain', 'chains', 'rope', 'ropes',
  'torch', 'torches', 'lantern', 'lanterns', 'candle', 'candles', 'chandelier', 'brazier',
  'fireplace', 'hearth', 'mirror', 'mirrors', 'painting', 'paintings', 'portrait', 'portraits',
  'tapestry', 'tapestries', 'rug', 'rugs', 'carpet', 'curtain', 'curtains', 'drape', 'drapes',
  'bed', 'beds', 'cot', 'cots', 'mattress', 'table', 'tables', 'desk', 'desks',
  'chair', 'chairs', 'stool', 'stools', 'bench', 'benches', 'throne', 'cabinet', 'wardrobe',
  'shelf', 'shelves', 'bookshelf', 'rack', 'altar', 'shrine', 'pedestal', 'plinth',
  'pillar', 'pillars', 'column', 'columns', 'statue', 'statues', 'bust', 'idol',
  'fountain', 'well', 'basin', 'pool', 'tub', 'cauldron', 'kettle', 'pot', 'pots', 'pan',
  'door', 'doors', 'gate', 'gates', 'portcullis', 'window', 'windows', 'shutter', 'shutters',
  'wall', 'walls', 'floor', 'floors', 'ceiling', 'roof', 'stairs', 'staircase', 'steps',
  'ladder', 'ladders', 'rung', 'rungs', 'ledge', 'balcony', 'gallery', 'hall', 'hallway',
  'corridor', 'passage', 'tunnel', 'room', 'rooms', 'chamber', 'chambers', 'cell', 'cells',
  'vault', 'crypt', 'tomb', 'grave', 'graves', 'alcove', 'niche', 'arch', 'archway',
  'bridge', 'chasm', 'cliff', 'slope', 'shaft', 'chimney', 'vent', 'pipe', 'drain', 'sewer',
  'trap', 'traps', 'pit', 'pits', 'lever', 'switch', 'button', 'tripwire',
  // Units, time, measurements, and damage types
  'foot', 'feet', 'ft', 'inch', 'inches', 'yard', 'yards', 'mile', 'miles',
  'square', 'squares', 'hex', 'hexes', 'pound', 'pounds', 'lb', 'lbs', 'ounce', 'ounces',
  'gallon', 'gallons', 'pint', 'pints', 'quart', 'quarts',
  'second', 'seconds', 'round', 'rounds', 'turn', 'turns', 'minute', 'minutes',
  'hour', 'hours', 'day', 'days', 'night', 'nights', 'week', 'weeks', 'month', 'months',
  'year', 'years', 'century', 'centuries',
  'level', 'levels', 'tier', 'tiers', 'point', 'points', 'hp', 'ac', 'cr', 'xp',
  'slot', 'slots', 'charge', 'charges', 'use', 'uses', 'time', 'times', 'pair', 'pairs',
  'set', 'sets', 'dozen', 'hundred', 'thousand', 'percent', 'degree', 'degrees',
  'action', 'actions', 'reaction', 'reactions',
  'bludgeoning', 'piercing', 'slashing', 'fire', 'cold', 'lightning', 'thunder',
  'acid', 'poison', 'necrotic', 'radiant', 'force', 'psychic'
]);

/**
 * Returns true if a candidate monster name or raw entry is actually a weapon, item,
 * ability score check (e.g. "DC 20 Intelligence check"), modifier (e.g. "+1 longsword"),
 * currency, measurement, or other non-creature game statistic.
 */
export function isNonCreatureStatOrItem(rawInput: string | any): boolean {
  const rawStr = typeof rawInput === 'string'
    ? rawInput.trim()
    : String(rawInput?.name || '').trim();
  if (!rawStr) return true;

  // Allow genuine animated object creatures from SRD
  const lowerFull = rawStr.toLowerCase().replace(/^\d+\s*x?\s+/i, '').trim();
  if (
    lowerFull === 'animated armor' ||
    lowerFull === 'flying sword' ||
    lowerFull === 'rug of smothering' ||
    lowerFull === 'broom of animated attack' ||
    lowerFull === 'crawling claw' ||
    lowerFull === 'dancing sword'
  ) {
    return false;
  }

  // Reject "+1 longsword", "-2 penalty", "DC 20 ...", "AC 15 ...", "CR 2 ...", "HP 30 ..."
  if (/^[+\-]\s*\d+/i.test(rawStr)) return true;
  if (/^(?:dc|ac|cr|hp|pp|gp|sp|ep|cp|lvl|level|page|pg)\s*\d+/i.test(rawStr)) return true;

  // Strip leading count ("1 ", "20x ", "two ", "+1 ")
  const cleaned = rawStr
    .replace(/^[+\-]?\s*\d+\s*x?\s+/i, '')
    .replace(/^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|a|an)\s+(?:x\s*)?/i, '')
    .replace(/\(.*?\)/g, '')
    .trim()
    .toLowerCase();

  if (!cleaned || /^\d+$/.test(cleaned)) return true;

  // Check if the cleaned phrase or all/primary words are non-creature stats/items
  if (NON_CREATURE_STAT_OR_ITEM_WORDS.has(cleaned)) return true;

  const words = cleaned.split(/[\s\-_/]+/).filter(Boolean);
  if (words.length === 0) return true;

  // If the first word or last word is an ability score, check/save, weapon, or currency
  if (words.every(w => NON_CREATURE_STAT_OR_ITEM_WORDS.has(w))) return true;
  if (
    words.some(w =>
      /^(strength|dexterity|constitution|intelligence|wisdom|charisma|check|checks|saving|throw|throws|longsword|shortsword|greatsword|dagger|mace|handaxe|battleaxe|greataxe|warhammer|quarterstaff|crossbow|shortbow|longbow|scimitar|rapier|halberd|glaive|spear|javelin|trident|flail|morningstar|club|maul|whip|sling|potion|scroll|gp|sp|cp|ep|pp|feet|ft|hours?|minutes?|rounds?|turns?|days?|points?|damage)$/i.test(w)
    )
  ) {
    return true;
  }

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
  let overrideCount: number | undefined;

  if (typeof rawInput === 'object' && rawInput !== null && rawInput.name) {
    const count = typeof rawInput.count === 'number' && rawInput.count > 0 ? rawInput.count : 1;
    const isStaleFallback =
      rawInput.source === 'Encounter Notes' ||
      (rawInput.avatarUrl === GENERIC_FALLBACK_AVATAR && !isTrulyGuardType(rawInput.name));
    if (!isStaleFallback) {
      return { monster: rawInput as Monster, count };
    }
    overrideCount = count;
    rawInput = rawInput.name;
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
  let count = overrideCount ?? 1;
  const countMatch = rawStr.match(/^(\d+)\s*x?\s+/i);
  if (countMatch) {
    count = overrideCount ?? (parseInt(countMatch[1], 10) || 1);
  } else if (overrideCount === undefined) {
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

  // If in format "Guerthel (Wraith)" or "Riffel (kender werewolf)", extract parenthetical type if known
  const parenMatch = candidate.match(/\((.*?)\)/);
  const parenType = parenMatch ? parenMatch[1].trim() : null;
  const parenWords = parenType ? parenType.split(/\s+/).filter(Boolean) : [];
  const parenLastWord = parenWords.length > 1 && parenWords[parenWords.length - 1].length >= 4
    ? parenWords[parenWords.length - 1]
    : null;
  const cleanCandidate = candidate.replace(/\(.*?\)/g, '').trim();
  const candidateWords = cleanCandidate.split(/\s+/).filter(Boolean);
  const candidateLastWord = candidateWords.length > 1 && candidateWords[candidateWords.length - 1].length >= 4
    ? candidateWords[candidateWords.length - 1]
    : null;

  // Prefer entries with local /uploads/ avatars over external compendium URLs when duplicates exist
  const allAvailable = [...compendium, ...SRD_MONSTERS].sort((a, b) => {
    const aLocal = a.avatarUrl?.startsWith('/uploads/') && a.avatarUrl !== GENERIC_FALLBACK_AVATAR ? 1 : 0;
    const bLocal = b.avatarUrl?.startsWith('/uploads/') && b.avatarUrl !== GENERIC_FALLBACK_AVATAR ? 1 : 0;
    return bLocal - aLocal;
  });

  // Match candidate or parenType strictly
  const matchCandidates = [
    candidate,
    parenType,
    cleanCandidate,
    parenLastWord,
    candidateLastWord
  ].filter(Boolean) as string[];

  let found: Monster | undefined;
  // Strict exact match: names must match exactly (case-insensitive, allowing singular/plural 's' or 'es' endings).
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
  const rawTarget = candidate.trim();
  // Strip plural trailing 's' if candidate was plural (e.g. "moonlight guardians" -> "Moonlight Guardian")
  const singularBase = !parenMatch && rawTarget.endsWith('s') && !rawTarget.endsWith('ss') && !rawTarget.endsWith('us') && !rawTarget.endsWith('is') && rawTarget.length > 3
    ? rawTarget.slice(0, -1)
    : rawTarget;

  const toTitleCase = (str: string) =>
    str
      .split(' ')
      .map(w => w.startsWith('(') ? w : (w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
      .join(' ');

  const displayName = parenMatch ? candidate : toTitleCase(singularBase);
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
      avatarUrl: GENERIC_FALLBACK_AVATAR,
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

/**
 * Repairs a monster token's avatarUrl and size if it was previously spawned with a generic fallback
 * or missing URL, matching against compendium and SRD_MONSTERS.
 */
export function repairMonsterToken<T extends Record<string, any>>(
  token: T,
  compendium: Monster[] = []
): T {
  if (!token || token.isCondition || token.isPlayer === true || token.category === 'character' || token.category === 'ally' || token.allyId) {
    return token;
  }
  const isMon = token.isMonster === true || token.category === 'monster' || token.isPlayer === false;
  if (!isMon) return token;

  const rawName = String(token.name || '').replace(/\s+\d+$/, '').trim();
  if (!rawName) return token;

  const currentUrl = token.url || token.avatarUrl || '';
  const needsRepair =
    !currentUrl ||
    (currentUrl === GENERIC_FALLBACK_AVATAR && !isTrulyGuardType(rawName)) ||
    currentUrl.includes('media.dndbeyond.com/compendium-images/veor/');

  const res = resolveMonster(rawName, compendium);
  const resolved = res?.monster;
  if (!resolved || resolved.source === 'Encounter Notes') {
    return token;
  }

  const sizeMap: Record<string, number> = {
    tiny: 1,
    small: 1,
    medium: 1,
    large: 2,
    huge: 3,
    gargantuan: 4
  };
  const expectedSize = sizeMap[String(resolved.size || 'medium').toLowerCase()] || 1;
  const bestAvatar = (needsRepair && resolved.avatarUrl) ? resolved.avatarUrl : currentUrl;
  const bestSize = (needsRepair || ((token.size === undefined || token.size === 1) && expectedSize > 1))
    ? expectedSize
    : (token.size || expectedSize);

  if (bestAvatar === token.url && bestAvatar === token.avatarUrl && bestSize === token.size) {
    return token;
  }

  return {
    ...token,
    url: bestAvatar,
    avatarUrl: bestAvatar,
    size: bestSize
  };
}

