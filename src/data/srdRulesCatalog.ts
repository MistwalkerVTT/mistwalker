import { ConditionDetail, RuleTopic } from '../types/rules';

export const SRD_CONDITIONS: ConditionDetail[] = [
  {
    id: 'blinded',
    name: 'Blinded',
    badgeColor: 'bg-zinc-800 text-zinc-300 border-zinc-600',
    description: 'A blinded creature cannot see and automatically fails any ability check that requires sight.',
    bulletPoints: [
      'Attack rolls against the creature have advantage.',
      'The creature\'s attack rolls have disadvantage.',
      'Automatically fails any ability check that requires sight.'
    ],
    tacticalTip: 'Spells that require line of sight or "a target you can see" cannot be cast by a blinded creature.'
  },
  {
    id: 'charmed',
    name: 'Charmed',
    badgeColor: 'bg-pink-900/40 text-pink-300 border-pink-500/40',
    description: 'A charmed creature cannot attack the charmer or target the charmer with harmful abilities or magical effects.',
    bulletPoints: [
      'The charmer has advantage on any ability check to interact socially with the creature.',
      'A charmed creature can\'t attack the charmer or target the charmer with harmful abilities or magical effects.'
    ],
    tacticalTip: 'Charmed does not make a target an ally or take commands unless an explicit spell effect says so (e.g. Dominate Person).'
  },
  {
    id: 'deafened',
    name: 'Deafened',
    badgeColor: 'bg-stone-800 text-stone-300 border-stone-600',
    description: 'A deafened creature can\'t hear and automatically fails any ability check that requires hearing.',
    bulletPoints: [
      'Can\'t hear anything.',
      'Automatically fails any ability check that requires hearing.'
    ],
    tacticalTip: 'Verbal spell components can still be spoken, but sound-based effects (like Thunderwave or Dissonant Whispers) might interact differently.'
  },
  {
    id: 'frightened',
    name: 'Frightened',
    badgeColor: 'bg-purple-900/40 text-purple-300 border-purple-500/40',
    description: 'A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight.',
    bulletPoints: [
      'Disadvantage on ability checks and attack rolls while source of fear is within line of sight.',
      'The creature can\'t willingly move closer to the source of its fear.'
    ],
    tacticalTip: 'Positioning is key — breaking line of sight temporarily removes the disadvantage on attacks.'
  },
  {
    id: 'grappled',
    name: 'Grappled',
    badgeColor: 'bg-amber-900/40 text-amber-300 border-amber-500/40',
    description: 'A grappled creature\'s speed becomes 0, and it can\'t benefit from any bonus to its speed.',
    bulletPoints: [
      'Speed becomes 0, and cannot benefit from any bonus to speed.',
      'The condition ends if the grappler is incapacitated.',
      'The condition ends if an effect removes the creature from the grappler\'s reach (e.g. Thunderwave or Repelling Blast).'
    ],
    tacticalTip: 'Grappled does not grant advantage to attackers on its own — combine with Prone for brutal melee advantage!'
  },
  {
    id: 'incapacitated',
    name: 'Incapacitated',
    badgeColor: 'bg-red-950/60 text-red-300 border-red-500/50',
    description: 'An incapacitated creature can\'t take actions or reactions.',
    bulletPoints: [
      'Can\'t take actions or reactions.',
      'Concentration on spells is immediately broken when incapacitated.'
    ],
    tacticalTip: 'Incapacitated is a component of many deeper conditions like Paralyzed, Petrified, Stunned, and Unconscious.'
  },
  {
    id: 'invisible',
    name: 'Invisible',
    badgeColor: 'bg-cyan-900/40 text-cyan-300 border-cyan-500/40',
    description: 'An invisible creature is impossible to see without the aid of magic or a special sense.',
    bulletPoints: [
      'Heavily obscured for the purpose of hiding.',
      'The creature\'s location can still be detected by any noise it makes or tracks it leaves.',
      'Attack rolls against the creature have disadvantage.',
      'The creature\'s attack rolls have advantage.'
    ],
    tacticalTip: 'Invisibility does not make you silent — taking the Hide action is still required to conceal your location.'
  },
  {
    id: 'paralyzed',
    name: 'Paralyzed',
    badgeColor: 'bg-yellow-900/50 text-yellow-300 border-yellow-500/50',
    description: 'A paralyzed creature is incapacitated and can\'t move or speak.',
    bulletPoints: [
      'Incapacitated: can\'t take actions or reactions.',
      'Can\'t move or speak.',
      'Automatically fails Strength and Dexterity saving throws.',
      'Attack rolls against the creature have advantage.',
      'Any attack that hits the creature is a critical hit if the attacker is within 5 feet.'
    ],
    tacticalTip: 'Melee attacks within 5 feet automatically crit on a hit — lethal against bosses and high HP targets.'
  },
  {
    id: 'petrified',
    name: 'Petrified',
    badgeColor: 'bg-stone-700 text-stone-200 border-stone-500',
    description: 'A petrified creature is transformed along with any nonmagical object it is wearing or carrying into a solid inanimate substance (usually stone).',
    bulletPoints: [
      'Weight increases by a factor of ten, and creature ceases aging.',
      'Incapacitated: can\'t move or speak, and unaware of surroundings.',
      'Attack rolls against the creature have advantage.',
      'Automatically fails Strength and Dexterity saving throws.',
      'Resistance to all damage.',
      'Immune to poison and disease (poisons already in system are suspended).'
    ],
    tacticalTip: 'Greater Restoration or Wish is typically required to reverse petrification.'
  },
  {
    id: 'poisoned',
    name: 'Poisoned',
    badgeColor: 'bg-emerald-900/40 text-emerald-300 border-emerald-500/40',
    description: 'A poisoned creature has disadvantage on attack rolls and ability checks.',
    bulletPoints: [
      'Disadvantage on attack rolls.',
      'Disadvantage on ability checks.'
    ],
    tacticalTip: 'A simple Lesser Restoration spell or Paladin\'s Lay on Hands (5 HP) clears the poisoned condition immediately.'
  },
  {
    id: 'prone',
    name: 'Prone',
    badgeColor: 'bg-orange-900/40 text-orange-300 border-orange-500/40',
    description: 'A prone creature\'s only movement option is to crawl, unless it stands up.',
    bulletPoints: [
      'Standing up costs half the creature\'s total speed.',
      'Crawling costs 1 extra foot per foot moved (half speed).',
      'The creature has disadvantage on attack rolls.',
      'An attack roll against the creature has advantage if the attacker is within 5 feet.',
      'Otherwise, attack rolls against the creature have disadvantage (e.g. ranged attacks).'
    ],
    tacticalTip: 'Ranged attacks have disadvantage against prone targets! Drop prone behind low walls to survive archer volleys.'
  },
  {
    id: 'restrained',
    name: 'Restrained',
    badgeColor: 'bg-indigo-900/40 text-indigo-300 border-indigo-500/40',
    description: 'A restrained creature\'s speed becomes 0, and attack rolls against it have advantage.',
    bulletPoints: [
      'Speed becomes 0, and cannot benefit from any bonus to speed.',
      'Attack rolls against the creature have advantage.',
      'The creature\'s attack rolls have disadvantage.',
      'Disadvantage on Dexterity saving throws.'
    ],
    tacticalTip: 'Spells with Dexterity saving throws (like Fireball, Sacred Flame, Lightning Bolt) are devastating against restrained targets.'
  },
  {
    id: 'stunned',
    name: 'Stunned',
    badgeColor: 'bg-blue-900/50 text-blue-300 border-blue-500/50',
    description: 'A stunned creature is incapacitated, can\'t move, and can speak only falteringly.',
    bulletPoints: [
      'Incapacitated: can\'t take actions or reactions.',
      'Can\'t move, and can speak only falteringly.',
      'Automatically fails Strength and Dexterity saving throws.',
      'Attack rolls against the creature have advantage.'
    ],
    tacticalTip: 'Unlike Paralyzed, Stunned does not make hits automatic critical strikes, but fails Str/Dex saves and gives advantage.'
  },
  {
    id: 'unconscious',
    name: 'Unconscious',
    badgeColor: 'bg-red-900/60 text-red-200 border-red-500/60',
    description: 'An unconscious creature is incapacitated, can\'t move or speak, and is unaware of its surroundings.',
    bulletPoints: [
      'Incapacitated: can\'t move or speak, unaware of surroundings.',
      'Drops whatever it is holding and falls prone.',
      'Automatically fails Strength and Dexterity saving throws.',
      'Attack rolls against the creature have advantage.',
      'Any attack that hits the creature is a critical hit if the attacker is within 5 feet.',
      'Taking damage while at 0 HP causes 1 failed death saving throw (2 if critical hit).'
    ],
    tacticalTip: 'Healing of any amount (even 1 HP from Healing Word or Goodberry) immediately wakes an unconscious creature.'
  },
  {
    id: 'exhaustion',
    name: 'Exhaustion',
    badgeColor: 'bg-amber-950/70 text-amber-200 border-amber-600/50',
    description: 'Exhaustion is measured in six cumulative levels. Finishing a long rest reduces exhaustion by 1 level provided food and drink are ingested.',
    bulletPoints: [
      'Level 1: Disadvantage on ability checks.',
      'Level 2: Speed halved.',
      'Level 3: Disadvantage on attack rolls and saving throws.',
      'Level 4: Hit point maximum halved.',
      'Level 5: Speed reduced to 0.',
      'Level 6: Death.'
    ],
    tacticalTip: 'Greater Restoration can remove 1 level of exhaustion. Long rests remove 1 level per 24 hours.'
  },
  {
    id: 'concentrating',
    name: 'Concentrating',
    badgeColor: 'bg-teal-900/40 text-teal-300 border-teal-500/40',
    description: 'Some spells require you to maintain concentration to keep their magic active. You lose concentration if you cast another concentration spell, take damage, or are incapacitated.',
    bulletPoints: [
      'Casting another spell that requires concentration ends your previous concentration immediately.',
      'Taking damage requires a Constitution saving throw to maintain concentration (DC 10 or half the damage taken, whichever is higher).',
      'Being incapacitated or killed ends concentration immediately.'
    ],
    tacticalTip: 'War Caster feat gives advantage on Constitution saving throws to maintain concentration.'
  }
];

export const SRD_CORE_RULES: RuleTopic[] = [
  {
    id: 'combat_actions',
    category: 'Combat',
    title: 'Actions in Combat',
    summary: 'The standard action options available on your turn in tactical combat.',
    content: 'When you take your action on your turn, you can take one of the actions presented here, an action you gained from your class or a special feature, or an action that you improvise.',
    quickReference: [
      'Attack: Make one melee or ranged attack (or more with Extra Attack).',
      'Cast a Spell: Cast a cantrip or spell with a casting time of 1 action.',
      'Dash: Gain extra movement equal to your speed for the current turn.',
      'Disengage: Your movement doesn\'t provoke opportunity attacks for the rest of the turn.',
      'Dodge: Attacks against you have disadvantage if you can see the attacker; Dex saves have advantage.',
      'Help: Give an ally advantage on their next ability check or attack roll vs a target within 5 ft.',
      'Hide: Make a Dexterity (Stealth) check in an attempt to become unseen.',
      'Ready: Wait for a specific trigger to take your reaction before your next turn.',
      'Search: Devote your attention to finding something with a Wisdom (Perception) or Intelligence (Investigation) check.',
      'Use an Object: Interact with a second object, potion, or special device.'
    ]
  },
  {
    id: 'cover_rules',
    category: 'Combat',
    title: 'Cover & Obstacles',
    summary: 'Walls, trees, creatures, and other obstacles provide cover during combat.',
    content: 'Walls, trees, creatures, and other obstacles can provide cover during combat, making a target more difficult to harm. A target can benefit from cover only when an attack or other effect originates on the opposite side of the cover.',
    quickReference: [
      'Half Cover: +2 bonus to AC and Dexterity saving throws (low wall, large furniture, another creature).',
      'Three-Quarters Cover: +5 bonus to AC and Dexterity saving throws (portcullis, arrow slit, thick tree trunk).',
      'Total Cover: Cannot be targeted directly by an attack or spell, though some spells can reach with area of effect.'
    ]
  },
  {
    id: 'two_weapon_fighting',
    category: 'Combat',
    title: 'Two-Weapon Fighting',
    summary: 'Attacking with two light weapons in hand.',
    content: 'When you take the Attack action and attack with a light melee weapon that you\'re holding in one hand, you can use a bonus action to attack with a different light melee weapon that you\'re holding in the other hand. You don\'t add your ability modifier to the damage of the bonus attack, unless that modifier is negative.',
    quickReference: [
      'Both weapons must have the Light property.',
      'Bonus action attack does not add ability modifier to damage (unless Dual Wielder fighting style is chosen).',
      'If either weapon has the Thrown property, you can throw the weapon instead of making a melee attack with it.'
    ]
  },
  {
    id: 'grappling_shoving',
    category: 'Combat',
    title: 'Grappling & Shoving',
    summary: 'Contested Athletics maneuvers to seize or knock down opponents.',
    content: 'When you want to grab a creature or wrestle with it, you can use the Attack action to make a special melee attack: a grapple. If you\'re able to make multiple attacks with the Attack action, this attack replaces one of them.',
    quickReference: [
      'Grapple Check: Your Strength (Athletics) contested by target\'s Strength (Athletics) or Dexterity (Acrobatics).',
      'Target Size: Target can be no more than one size larger than you.',
      'Free Hand: You must have at least one hand free to grapple.',
      'Moving a Grappled Creature: You can drag or carry the creature with you, but your speed is halved unless the creature is two or more sizes smaller than you.',
      'Shove: Replace an attack with a contest to either knock the target prone or push it 5 feet away.'
    ]
  },
  {
    id: 'resting',
    category: 'Movement & Environment',
    title: 'Short & Long Rests',
    summary: 'Mechanics for catching your breath and full overnight recovery.',
    content: 'Adventurers can take rests during the course of an adventure. A rest allows characters to recover spent hit points, spell slots, and ability usages.',
    quickReference: [
      'Short Rest (1 hour): Spend one or more Hit Dice to regain HP (Roll die + Con modifier per die). Warlock spell slots and certain class abilities reset.',
      'Long Rest (8 hours): Regain all lost HP, regain up to half of total Hit Dice, all spell slots reset.',
      'Limit: A character can\'t benefit from more than one Long Rest in a 24-hour period, and must have at least 1 hit point to begin.'
    ]
  },
  {
    id: 'obscurement_vision',
    category: 'Movement & Environment',
    title: 'Vision & Obscurement',
    summary: 'Light levels, dim light, darkness, and special monster senses.',
    content: 'The presence or absence of light in an environment creates three categories of illumination: bright light, dim light, and darkness.',
    quickReference: [
      'Bright Light: Most creatures see normally.',
      'Dim Light (Lightly Obscured): Disadvantage on Wisdom (Perception) checks that rely on sight.',
      'Darkness (Heavily Obscured): Effectively suffers from the Blinded condition unless the creature has Darkvision or special senses.',
      'Darkvision: Sees in dim light as if bright, and in darkness as if dim light (cannot discern color, only shades of gray).',
      'Blindsight: Perceives surroundings without relying on sight within a specific radius.',
      'Truesight: Sees in normal and magical darkness, perceives invisible creatures/objects, detects visual illusions, automatically detects secret doors hidden by magic.'
    ]
  }
];
