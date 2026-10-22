import { Character } from '../types/character';

export const CHARACTER_TOKEN_IMAGES: Record<string, string> = {
  'varrak': 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Varrak.png/:/rs=w:1440,h:1440',
  'brannoc': 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Brannoc.png/:/rs=w:1440,h:1440',
  'aziza': 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Aziza.png/:/rs=w:1440,h:1440',
  'noctua': 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Noctua.png/:/rs=w:1440,h:1440',
  'noctua shadowclaw': 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Noctua.png/:/rs=w:1440,h:1440',
  'aggie': 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Aggie.png/:/rs=w:1440,h:1440',
  'aggapanthus': 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Aggie.png/:/rs=w:1440,h:1440',
  'burmi': 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Burmi.png/:/rs=w:1440,h:1440',
  'rowan': 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Rowan.png/:/rs=w:1440,h:1440',
  'rowan zett': 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Rowan.png/:/rs=w:1440,h:1440',
  'stavros': 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/DwarfStavros.jpg/:/rs=w:1440,h:1440',
  'stavros thurston': 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/DwarfStavros.jpg/:/rs=w:1440,h:1440',
  'sylas': 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Brannoc.png/:/rs=w:1440,h:1440',
  'sylas gleeblood': 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Brannoc.png/:/rs=w:1440,h:1440',
  'arameng': 'https://www.dndbeyond.com/avatars/17/368/636377878055945748.jpeg?width=150&height=150&fit=crop&quality=95&auto=webp',
  'arameng of rosslandia': 'https://www.dndbeyond.com/avatars/17/368/636377878055945748.jpeg?width=150&height=150&fit=crop&quality=95&auto=webp',
  'etho': 'https://www.dndbeyond.com/avatars/43901/181/1581111423-80588084.jpeg?width=150&height=150&fit=crop&quality=95&auto=webp',
  'etho corvellion': 'https://www.dndbeyond.com/avatars/43901/181/1581111423-80588084.jpeg?width=150&height=150&fit=crop&quality=95&auto=webp',
  'zal-tan': 'https://www.dndbeyond.com/avatars/10080/68/637233785467106744.jpeg?width=150&height=150&fit=crop&quality=95&auto=webp',
  'zaltan': 'https://www.dndbeyond.com/avatars/10080/68/637233785467106744.jpeg?width=150&height=150&fit=crop&quality=95&auto=webp',
  "g'aiah": 'https://www.dndbeyond.com/avatars/51499/925/1581111423-152250633.jpeg?width=150&height=150&fit=crop&quality=95&auto=webp',
  'gaiah': 'https://www.dndbeyond.com/avatars/51499/925/1581111423-152250633.jpeg?width=150&height=150&fit=crop&quality=95&auto=webp',
  'mayo': 'https://i.ibb.co/nNm5TBg2/Mayo.gif'
};

export function getCharacterTokenUrl(name: string, customAvatarUrl?: string): string {
  // If the character has a custom avatar URL (uploaded image, data URI, or server URL), PREFER IT!
  if (customAvatarUrl && typeof customAvatarUrl === 'string' && customAvatarUrl.trim() !== '') {
    // Ignore only old legacy placeholder URLs from previous dummy data
    const isLegacyPlaceholder = customAvatarUrl.includes('i.ibb.co/6R3k0jQ') ||
      customAvatarUrl.includes('i.ibb.co/3s87h0k') ||
      customAvatarUrl.includes('i.ibb.co/1n5b6k2') ||
      customAvatarUrl.includes('i.ibb.co/7v9k2m1') ||
      customAvatarUrl.includes('i.ibb.co/4p6v8h7');
    if (!isLegacyPlaceholder) {
      return customAvatarUrl;
    }
  }

  if (!name) return customAvatarUrl || CHARACTER_TOKEN_IMAGES['varrak'];
  const key = name.toLowerCase().trim();
  if (CHARACTER_TOKEN_IMAGES[key]) {
    return CHARACTER_TOKEN_IMAGES[key];
  }
  for (const [k, url] of Object.entries(CHARACTER_TOKEN_IMAGES)) {
    if (key.includes(k) || k.includes(key)) {
      return url;
    }
  }
  return customAvatarUrl || CHARACTER_TOKEN_IMAGES['varrak'];
}

/**
 * Formats a character token's display name so only the character's first name
 * is shown beneath their token (and always displays "Aggie" for Aggapanthus/Aggie).
 * Non-character tokens (monsters, allies, conditions) keep their full name.
 */
export function getCharacterTokenDisplayName(rawName?: string, isCharacter: boolean = true): string {
  if (!rawName || typeof rawName !== 'string') return 'Token';
  const trimmed = rawName.trim();
  if (!trimmed) return 'Token';

  const lower = trimmed.toLowerCase();
  if (lower.includes('aggie') || lower.includes('aggapanthus')) {
    return 'Aggie';
  }

  if (!isCharacter) {
    return trimmed;
  }

  const first = trimmed.split(/[\s"(]+/)[0];
  return first || trimmed;
}

export const DEFAULT_CHARACTERS: Character[] = [
  {
    id: 'char_varrak',
    ddbCharacterId: 146614740,
    name: 'Varrak "Onikuma" of Sky Veil Clan',
    race: 'Goliath',
    classLevel: 'Barbarian 6',
    background: 'Soldier',
    alignment: 'Neutral',
    avatarUrl: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Varrak.png/:/rs=w:1440,h:1440',
    ac: 17,
    hp: 59,
    maxHp: 59,
    tempHp: 0,
    hitDice: '6d12',
    speed: '45 ft. (Walking)',
    initiativeBonus: 2,
    proficiencyBonus: 3,
    passivePerception: 12,
    passiveInsight: 9,
    passiveInvestigation: 9,
    stats: { str: 20, dex: 14, con: 15, int: 8, wis: 8, cha: 10 },
    savingThrows: { str: '+8', dex: '+2', con: '+5', int: '-1', wis: '-1', cha: '+0' },
    savingThrowModifiers: 'Advantage on STR while Rage is active. Advantage on DEX unless you are Incapacitated.',
    skillsList: [
      { name: 'Acrobatics', bonus: '+2', proficient: false },
      { name: 'Animal Handling', bonus: '-1', proficient: false },
      { name: 'Arcana', bonus: '-1', proficient: false },
      { name: 'Athletics', bonus: '+8', proficient: true },
      { name: 'Deception', bonus: '+0', proficient: false },
      { name: 'History', bonus: '-1', proficient: false },
      { name: 'Insight', bonus: '-1', proficient: false },
      { name: 'Intimidation', bonus: '+3', proficient: true },
      { name: 'Investigation', bonus: '-1', proficient: false },
      { name: 'Medicine', bonus: '-1', proficient: false },
      { name: 'Nature', bonus: '-1', proficient: false },
      { name: 'Perception', bonus: '+2', proficient: true },
      { name: 'Performance', bonus: '+0', proficient: false },
      { name: 'Persuasion', bonus: '+0', proficient: false },
      { name: 'Religion', bonus: '-1', proficient: false },
      { name: 'Sleight of Hand', bonus: '+2', proficient: false },
      { name: 'Stealth', bonus: '+2', proficient: false },
      { name: 'Survival', bonus: '+2', proficient: true }
    ],
    defenses: {
      resistances: ['Bludgeoning (while raging)', 'Piercing (while raging)', 'Slashing (while raging)'],
      immunities: ['Charmed (Mindless Rage)', 'Frightened (Mindless Rage)', 'Critical Hits (Adamantine Armor)'],
      vulnerabilities: [],
      conditionImmunities: ['Charmed', 'Frightened']
    },
    proficiencies: {
      armor: ['Light Armor', 'Medium Armor', 'Shields'],
      weapons: ['Martial Weapons', 'Simple Weapons'],
      tools: ['Dice Set', "Smith's Tools"],
      languages: ['Common', 'Giant', 'Gnomish']
    },
    actions: [
      {
        name: 'Greataxe, +1',
        type: 'melee',
        hitBonus: '+9',
        damage: '1d12+8 Slashing',
        notes: 'Martial, Heavy, Two-Handed, Cleave',
        description: 'Melee weapon attack. Cleave: Once per turn if you hit, make another melee attack against second creature within 5 ft.'
      },
      {
        name: 'Handaxe',
        type: 'melee/thrown',
        hitBonus: '+8',
        damage: '1d6+7 Slashing',
        notes: 'Simple, Light, Thrown, Vex, Range 20/60',
        description: 'Can be thrown up to 20/60 ft.'
      },
      {
        name: 'Unarmed Strike',
        type: 'melee',
        hitBonus: '+8',
        damage: '8 Bludgeoning',
        notes: '',
        description: 'Standard unarmed combat attack.'
      }
    ],
    bonusActions: [
      {
        name: 'Activate Large Form',
        source: 'Goliath Species (1/Long Rest)',
        description: 'Change size to Large for 10 minutes. Advantage on Strength checks, Speed increases by 10 ft.'
      },
      {
        name: 'Cloud’s Jaunt',
        source: 'Cloud Giant Ancestry (3/Long Rest)',
        description: 'Magically teleport up to 30 ft. to an unoccupied space you can see.'
      },
      {
        name: 'Rage (Enter)',
        source: 'Barbarian (4/Long Rest)',
        description: 'Enter rage as a bonus action. Gain +2 damage, advantage on STR checks/saves, and resistance to bludgeoning, piercing, and slashing damage.'
      },
      {
        name: 'Extend Rage',
        source: 'Barbarian',
        description: 'Extend your rage until the end of your next turn.'
      }
    ],
    reactions: [
      {
        name: 'Opportunity Attack',
        description: 'Make 1 melee weapon attack when a hostile creature leaves your reach.'
      }
    ],
    specialFeatures: [
      {
        category: 'Barbarian Features',
        name: 'Reckless Attack',
        description: 'Advantage on melee weapon attack rolls using Strength during this turn; attacks against you have advantage until next turn.'
      },
      {
        category: 'Barbarian Features',
        name: 'Frenzy (Path of the Berserker)',
        description: 'If Reckless Attack while Rage is active, deal extra 2d6 damage to the first target hit.'
      },
      {
        category: 'Barbarian Features',
        name: 'Mindless Rage',
        description: 'Immunity to Charmed and Frightened conditions while Rage is active.'
      },
      {
        category: 'Species Traits',
        name: 'Powerful Build',
        description: 'Advantage on checks to end Grappled condition. Count as one size larger for carrying capacity.'
      },
      {
        category: 'Feats',
        name: 'Savage Attacker',
        description: 'Once per turn when hitting with a weapon, roll damage dice twice and use higher result.'
      }
    ],
    equipment: [
      { name: 'Stone of Good Luck (Luckstone)', quantity: 1, weight: '--', isAttuned: true },
      { name: 'Adamantine Half Plate', quantity: 1, weight: '40 lb.', isAttuned: false },
      { name: 'Greataxe, +1', quantity: 1, weight: '7 lb.', isAttuned: false },
      { name: 'Potion of Healing', quantity: 2, weight: '1 lb.', isAttuned: false },
      { name: 'Gem of Brightness', quantity: 1, weight: '--', isAttuned: true },
      { name: 'Periapt of Wound Closure', quantity: 1, weight: '--', isAttuned: true },
      { name: 'Handaxe', quantity: 3, weight: '6 lb.', isAttuned: false },
      { name: 'Trident', quantity: 1, weight: '4 lb.', isAttuned: false }
    ],
    currency: {
      cp: 0,
      sp: 0,
      ep: 0,
      gp: 4335,
      pp: 0
    },
    roleplay: {
      gender: 'Male',
      age: '27',
      size: 'Medium',
      height: "8'0\"",
      weight: '340 lb',
      faith: 'Tempus',
      skin: 'Grey skin with tribal tattoos',
      eyes: 'Bright Blue',
      hair: 'None',
      personalityTraits: 'Thinking is for other people. I prefer action. I can stare down a hell hound without flinching. I enjoy being strong and like breaking things.',
      ideals: "Sincerity. There's no good in pretending to be something I'm not. (Neutral)",
      bonds: "I'll never forget the crushing defeat my company suffered or the enemies who dealt it.",
      flaws: 'My hatred of my enemies is blind and unreasoning.',
      backstory: 'Veteran Goliath soldier of the Sky Veil Clan. Reared in the unforgiving peaks and hardened on the frontlines.'
    },
    features: [
      'Rage (4/Long Rest, +2 Dmg)',
      'Reckless Attack',
      'Path of the Berserker (Frenzy +2d6)',
      'Mindless Rage (Charmed/Frightened Immunity)',
      'Extra Attack',
      'Fast Movement (+10 ft)',
      'Danger Sense (Adv on DEX saves)',
      'Cloud’s Jaunt (30ft Teleport 3/LR)',
      'Large Form (1/LR)',
      'Powerful Build',
      'Savage Attacker',
      'Weapon Mastery (Greataxe Cleave, Trident Topple)'
    ],
    spells: [],
    notes: 'Stalwart frontline Goliath Barbarian. Deals massive Greataxe damage with Cleave and Frenzy, teleports with Cloud’s Jaunt, and resists physical damage while raging with Adamantine critical hit immunity.',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'char_brannoc',
    name: 'Brannoc',
    race: 'Dwarf',
    classLevel: 'Paladin 5',
    background: 'Noble',
    alignment: 'Lawful Good',
    avatarUrl: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Brannoc.png/:/rs=w:1440,h:1440',
    ac: 18,
    hp: 44,
    maxHp: 44,
    speed: '25 ft.',
    initiativeBonus: 0,
    proficiencyBonus: 3,
    passivePerception: 11,
    stats: { str: 16, dex: 10, con: 14, int: 10, wis: 12, cha: 16 },
    savingThrows: { str: '+3', dex: '+0', con: '+2', int: '+0', wis: '+4', cha: '+6' },
    defenses: {
      resistances: ['Poison (Dwarven Resilience)'],
      immunities: ['Disease (Divine Health)']
    },
    actions: [
      {
        name: 'Warhammer, +1',
        type: 'melee',
        hitBonus: '+7',
        damage: '1d8+4 Bludgeoning',
        notes: 'Versatile (1d10+4), Push',
        description: 'Holy warhammer imbued with radiant authority.'
      }
    ],
    features: ['Divine Smite', 'Lay on Hands (25 pts)', 'Divine Health', 'Channel Divinity', 'Aura of Protection', 'Extra Attack'],
    spells: ['Bless', 'Cure Wounds', 'Shield of Faith', 'Command'],
    notes: 'Devoted holy knight wielding Warhammer and Shield, protecting allies with divine aura.',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'char_aziza',
    ddbCharacterId: 27571081,
    name: 'Aziza',
    race: 'Human',
    classLevel: 'Fighter 15',
    background: 'Soldier',
    alignment: 'Neutral Good',
    avatarUrl: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Aziza.png/:/rs=w:1440,h:1440',
    ac: 18,
    hp: 95,
    maxHp: 109,
    speed: '30 ft.',
    initiativeBonus: 4,
    proficiencyBonus: 5,
    passivePerception: 10,
    stats: { str: 20, dex: 19, con: 12, int: 12, wis: 11, cha: 11 },
    features: ['Second Wind', 'Action Surge', 'Extra Attack (x3)', 'Indomitable'],
    spells: [],
    notes: 'Campaign: An Unspeakable Power (but this time with a vengeance). Player: NorahTheExplorah. Synced from D&D Beyond.',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'char_noctua',
    ddbCharacterId: 147334187,
    name: 'Noctua Shadowclaw',
    race: 'Owlin',
    classLevel: 'Ranger 5 / Rogue 2',
    background: 'Sage',
    alignment: 'Neutral',
    avatarUrl: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Noctua.png/:/rs=w:1440,h:1440',
    ac: 17,
    hp: 58,
    maxHp: 58,
    speed: '30 ft.',
    initiativeBonus: 5,
    proficiencyBonus: 3,
    passivePerception: 13,
    stats: { str: 8, dex: 20, con: 14, int: 10, wis: 16, cha: 8 },
    savingThrows: { str: '+2', dex: '+6', con: '+2', int: '+1', wis: '+2', cha: '+0' },
    features: ['Sneak Attack', 'Expertise', 'Archery Style', 'Cunning Action', 'Favored Foe'],
    spells: ["Hunter's Mark", 'Pass without Trace', 'Cure Wounds'],
    notes: 'Stealthy rogue-ranger and agile scout of the Golden Vault.',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'char_burmi',
    ddbCharacterId: 57022089,
    name: 'Burmi',
    race: 'Half-Orc',
    classLevel: 'Monk 15',
    background: 'Hermit',
    alignment: 'Lawful Good',
    avatarUrl: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Burmi.png/:/rs=w:1440,h:1440',
    ac: 19,
    hp: 109,
    maxHp: 123,
    speed: '30 ft.',
    initiativeBonus: 4,
    proficiencyBonus: 5,
    passivePerception: 11,
    stats: { str: 14, dex: 18, con: 16, int: 10, wis: 13, cha: 8 },
    features: ['Flurry of Blows', 'Patient Defense', 'Step of the Wind', 'Stunning Strike', 'Evasion', 'Diamond Soul', 'Relentless Endurance'],
    spells: [],
    notes: 'Campaign: An Unspeakable Power (but this time with a vengeance). Player: Perethorn. Synced from D&D Beyond.',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'char_aggie',
    ddbCharacterId: 158502126,
    name: 'Aggapanthus (Aggie)',
    race: 'Rock Gnome',
    classLevel: 'Artificer 7',
    background: 'Guild Artisan',
    alignment: 'Neutral Good',
    avatarUrl: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Aggie.png/:/rs=w:1440,h:1440',
    ac: 16,
    hp: 52,
    maxHp: 52,
    speed: '25 ft.',
    initiativeBonus: 2,
    proficiencyBonus: 3,
    passivePerception: 14,
    stats: { str: 10, dex: 14, con: 16, int: 18, wis: 12, cha: 10 },
    savingThrows: { str: '+0', dex: '+2', con: '+6', int: '+7', wis: '+1', cha: '+0' },
    features: ['Infuse Item', 'The Right Tool for the Job', 'Flash of Genius', 'Tool Expertise', 'Gnome Cunning'],
    spells: ['Guidance', 'Cure Wounds', 'Faerie Fire', 'Shield', 'Heat Metal'],
    notes: 'Campaign: Keys from the Golden Vault. Player: TotoMojo. Synced from D&D Beyond.',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'char_rowan',
    ddbCharacterId: 146533824,
    name: 'Rowan Zett',
    race: 'Human',
    classLevel: 'Bard 7',
    background: 'Entertainer',
    alignment: 'Neutral Good',
    avatarUrl: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Rowan.png/:/rs=w:1440,h:1440',
    ac: 15,
    hp: 45,
    maxHp: 45,
    speed: '30 ft.',
    initiativeBonus: 3,
    proficiencyBonus: 3,
    passivePerception: 15,
    stats: { str: 10, dex: 16, con: 14, int: 12, wis: 14, cha: 18 },
    savingThrows: { str: '+0', dex: '+6', con: '+2', int: '+1', wis: '+2', cha: '+7' },
    features: ['Bardic Inspiration (d8)', 'Jack of All Trades', 'Song of Rest (d6)', 'Font of Inspiration', 'Countercharm'],
    spells: ['Vicious Mockery', 'Dissonant Whispers', 'Healing Word', 'Invisibility', 'Hypnotic Pattern', 'Polymorph'],
    notes: 'Campaign: Keys from the Golden Vault. Player: Perethorn. Synced from D&D Beyond.',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'char_stavros',
    ddbCharacterId: 27463658,
    name: 'Stavros Thurston',
    race: 'Hill Dwarf',
    classLevel: 'Cleric 15',
    background: 'Acolyte',
    alignment: 'Lawful Neutral',
    avatarUrl: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/DwarfStavros.jpg/:/rs=w:1440,h:1440',
    ac: 26,
    hp: 110,
    maxHp: 138,
    speed: '25 ft.',
    initiativeBonus: -1,
    proficiencyBonus: 5,
    passivePerception: 17,
    stats: { str: 16, dex: 8, con: 16, int: 8, wis: 25, cha: 10 },
    defenses: {
      resistances: ['Poison (Dwarven Resilience)']
    },
    features: [
      'Channel Divinity',
      'Destroy Undead (CR 3)',
      'Divine Intervention',
      'Dwarven Toughness',
      'Book of Exalted Deeds (Enlightened Magic: Any spell slot expended counts as 1 level higher; Halo of Protection, +1 AC, Advantage on Good Persuasion)'
    ],
    spells: [
      'Healing Word',
      'Spirit Guardians',
      'Revivify',
      'Mass Cure Wounds',
      'Heal',
      'Mass Healing Word',
      'Holy Weapon',
      'Stone Shape',
      'Blade Barrier',
      'Sunbeam',
      'Fire Storm',
      'Holy Aura',
      'Sanctuary',
      'Shield of Faith',
      'Hold Person',
      'Command',
      'Warding Bond',
      "Heroes' Feast",
      'Divine Word',
      'Greater Restoration',
      'Silence'
    ],
    notes: 'Campaign: An Unspeakable Power (but this time with a vengeance). Player: SWITCH540. Attuned Artifact: Book of Exalted Deeds (Enlightened Magic grants +1 effective slot level to all cast spells). Synced from D&D Beyond.',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'char_mayo',
    name: 'Mayo',
    race: 'Tabaxi',
    classLevel: 'Bard 5',
    background: 'Entertainer',
    alignment: 'Chaotic Good',
    avatarUrl: 'https://i.ibb.co/nNm5TBg2/Mayo.gif',
    ac: 14,
    hp: 34,
    maxHp: 34,
    speed: '30 ft.',
    initiativeBonus: 3,
    proficiencyBonus: 3,
    passivePerception: 13,
    stats: { str: 8, dex: 16, con: 12, int: 12, wis: 10, cha: 18 },
    savingThrows: { str: '-1', dex: '+6', con: '+1', int: '+1', wis: '+0', cha: '+7' },
    features: ['Bardic Inspiration (d8)', 'Jack of All Trades', 'Song of Rest (d6)', 'College of Lore Cutting Words'],
    spells: ['Vicious Mockery', 'Dissonant Whispers', 'Healing Word', 'Hypnotic Pattern', 'Shatter'],
    notes: 'Agile feline minstrel who inspires party members with witty ballads and disorients foes with mockery.',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'char_sylas',
    ddbCharacterId: 158983142,
    name: 'Sylas Gleeblood',
    race: 'Fairy',
    classLevel: 'Blood Hunter 4 / Warlock 2',
    background: 'Charlatan',
    alignment: 'Chaotic Neutral',
    avatarUrl: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Brannoc.png/:/rs=w:1440,h:1440',
    ac: 15,
    hp: 65,
    maxHp: 65,
    speed: '30 ft.',
    initiativeBonus: 3,
    proficiencyBonus: 3,
    passivePerception: 14,
    stats: { str: 8, dex: 16, con: 14, int: 14, wis: 12, cha: 16 },
    savingThrows: { str: '-1', dex: '+6', con: '+2', int: '+5', wis: '+4', cha: '+6' },
    features: ['Crimson Rite', 'Blood Maledict', 'Hunter’s Bane', 'Eldritch Invocations', 'Flight'],
    spells: ['Eldritch Blast', 'Hex', 'Faerie Fire', 'Enlarge/Reduce'],
    notes: 'Campaign: Keys from the Golden Vault. Player: Arameng. Synced from D&D Beyond.',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'char_gaiah',
    ddbCharacterId: 152250633,
    name: "G'aiah",
    race: 'Wood Elf',
    classLevel: 'Druid 7',
    background: 'Outlander',
    alignment: 'Neutral Good',
    avatarUrl: 'https://www.dndbeyond.com/avatars/51499/925/1581111423-152250633.jpeg?width=150&height=150&fit=crop&quality=95&auto=webp',
    ac: 13,
    hp: 52,
    maxHp: 52,
    speed: '30 ft.',
    initiativeBonus: 2,
    proficiencyBonus: 3,
    passivePerception: 14,
    stats: { str: 10, dex: 14, con: 14, int: 13, wis: 19, cha: 10 },
    savingThrows: { str: '+0', dex: '+2', con: '+2', int: '+4', wis: '+7', cha: '+0' },
    features: ['Wild Shape', 'Druid Circle', 'Wild Companion', 'Fey Ancestry', 'Trance'],
    spells: ['Shillelagh', 'Produce Flame', 'Healing Word', 'Moonbeam', 'Call Lightning', 'Polymorph'],
    notes: 'Campaign: Keys from the Golden Vault. Player: NorahTheExplorah. Synced from D&D Beyond.',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'char_etho',
    ddbCharacterId: 80588084,
    name: 'Etho Corvellion',
    race: 'High Elf',
    classLevel: 'Wizard 15',
    background: 'Sage',
    alignment: 'Neutral Good',
    avatarUrl: 'https://www.dndbeyond.com/avatars/43901/181/1581111423-80588084.jpeg?width=150&height=150&fit=crop&quality=95&auto=webp',
    ac: 12,
    hp: 92,
    maxHp: 92,
    speed: '30 ft.',
    initiativeBonus: 2,
    proficiencyBonus: 5,
    passivePerception: 11,
    stats: { str: 8, dex: 15, con: 14, int: 20, wis: 12, cha: 10 },
    savingThrows: { str: '-1', dex: '+2', con: '+2', int: '+10', wis: '+6', cha: '+0' },
    features: ['Arcane Recovery', 'Spellcasting', 'Fey Ancestry', 'Arcane Tradition'],
    spells: ['Fire Bolt', 'Mage Armor', 'Shield', 'Counterspell', 'Fireball', 'Teleport'],
    notes: 'Campaign: An Unspeakable Power (but this time with a vengeance). Player: Cudder1. Synced from D&D Beyond.',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'char_arameng',
    ddbCharacterId: 27456605,
    name: 'Arameng of Rosslandia',
    race: 'Drow',
    classLevel: 'Rogue 15',
    background: 'Noble',
    alignment: 'Chaotic Good',
    avatarUrl: 'https://www.dndbeyond.com/avatars/17/368/636377878055945748.jpeg?width=150&height=150&fit=crop&quality=95&auto=webp',
    ac: 19,
    hp: 115,
    maxHp: 115,
    speed: '30 ft.',
    initiativeBonus: 4,
    proficiencyBonus: 5,
    passivePerception: 10,
    stats: { str: 13, dex: 19, con: 12, int: 11, wis: 11, cha: 13 },
    savingThrows: { str: '+1', dex: '+9', con: '+1', int: '+5', wis: '+5', cha: '+1' },
    features: ['Sneak Attack (8d6)', 'Cunning Action', 'Uncanny Dodge', 'Evasion', 'Reliable Talent', 'Blindsense'],
    spells: ['Dancing Lights', 'Faerie Fire', 'Darkness'],
    notes: 'Campaign: An Unspeakable Power (but this time with a vengeance). Player: Arameng. Synced from D&D Beyond.',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'char_zaltan',
    ddbCharacterId: 27455124,
    name: 'Zal-tan',
    race: 'Tiefling',
    classLevel: 'Warlock 15',
    background: 'Charlatan',
    alignment: 'Chaotic Neutral',
    avatarUrl: 'https://www.dndbeyond.com/avatars/10080/68/637233785467106744.jpeg?width=150&height=150&fit=crop&quality=95&auto=webp',
    ac: 16,
    hp: 78,
    maxHp: 78,
    speed: '30 ft.',
    initiativeBonus: 0,
    proficiencyBonus: 5,
    passivePerception: 12,
    stats: { str: 8, dex: 10, con: 11, int: 15, wis: 15, cha: 18 },
    savingThrows: { str: '-1', dex: '+0', con: '+0', int: '+2', wis: '+7', cha: '+9' },
    features: ['Pact Magic', 'Eldritch Invocations', 'Mystic Arcanum', 'Hellish Resistance'],
    spells: ['Eldritch Blast', 'Hellish Rebuke', 'Darkness', 'Hold Monster', 'Crown of Stars'],
    notes: 'Campaign: An Unspeakable Power (but this time with a vengeance). Player: TotoMojo. Synced from D&D Beyond.',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

export interface ResolvedTokenStats {
  ac: number;
  hp: number;
  maxHp: number;
  currentHp: number;
  tempHp?: number;
  characterName: string;
  isFromCharacterSheet: boolean;
  race?: string;
  classLevel?: string;
  speed?: string | number;
  initiativeBonus?: number;
}

export function isDdbMatch(
  targetName?: string,
  targetId?: string | number,
  targetDdbId?: string | number,
  ddbId?: string | number,
  ddbName?: string
): boolean {
  const dId = ddbId ? String(ddbId) : '';
  const tDdbId = targetDdbId ? String(targetDdbId) : '';
  const tId = targetId ? String(targetId) : '';

  if (dId && tDdbId && dId === tDdbId) return true;
  if (dId && tId && (tId === dId || tId === `char_ddb_${dId}` || `char_ddb_${tId}` === dId)) return true;

  const nA = (targetName || '').toLowerCase().trim();
  const nB = (ddbName || '').toLowerCase().trim();
  if (nA && nB) {
    if (nA === nB) return true;
    if (nA.includes(nB) || nB.includes(nA)) return true;

    // Normalize apostrophes, quotes, and punctuation (e.g. "G'aiah" vs "Gaiah" vs "G’aiah")
    const cleanA = nA.replace(/['’"`&#x27;]/g, '');
    const cleanB = nB.replace(/['’"`&#x27;]/g, '');
    if (cleanA && cleanB && (cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA))) return true;

    const firstA = nA.split(/[\s"'(]/)[0].replace(/['’]/g, '');
    const firstB = nB.split(/[\s"'(]/)[0].replace(/['’]/g, '');
    if (firstA && firstB && firstA.length >= 3 && firstA === firstB) return true;
  }
  return false;
}

export function resolveTokenCharacterStats(
  token: { name?: string; ac?: number; hp?: number; maxHp?: number; currentHp?: number; tempHp?: number; characterId?: string; ddbCharacterId?: number | string },
  customCharacters?: Character[]
): ResolvedTokenStats {
  const characters = customCharacters && customCharacters.length > 0 ? customCharacters : DEFAULT_CHARACTERS;
  const rawName = (token.name || '').trim();
  const tokenName = rawName.toLowerCase();
  const cleanTokenName = tokenName.replace(/['’"`&#x27;]/g, '');

  // 0. Match by character ID or ddbCharacterId if present
  let char = token.characterId
    ? characters.find(c =>
        c.id === token.characterId ||
        String((c as any).ddbCharacterId) === String(token.characterId) ||
        c.id === `char_ddb_${token.characterId}` ||
        `char_ddb_${c.id}` === token.characterId
      )
    : undefined;

  if (!char && token.ddbCharacterId) {
    const ddbId = String(token.ddbCharacterId);
    char = characters.find(c =>
      String((c as any).ddbCharacterId) === ddbId ||
      c.id === `char_ddb_${ddbId}` ||
      c.id === ddbId
    );
  }

  // 1. Exact match on character name
  if (!char && tokenName) {
    char = characters.find(c => {
      const cName = c.name.toLowerCase().trim();
      return cName === tokenName || cName.replace(/['’"`&#x27;]/g, '') === cleanTokenName;
    });
  }
  
  // 2. Partial match (e.g. token "Varrak" matches "Varrak \"Onikuma\" of Sky Veil Clan" or "Stavros" matches "Stavros Thurston")
  if (!char && tokenName) {
    char = characters.find(c => {
      const cName = c.name.toLowerCase().trim();
      const cClean = cName.replace(/['’"`&#x27;]/g, '');
      return cName.includes(tokenName) || tokenName.includes(cName) || cClean.includes(cleanTokenName) || cleanTokenName.includes(cClean);
    });
  }

  // 3. First-name token match (e.g. "Varrak 1" or "Varrak (Hero)")
  if (!char && tokenName) {
    const firstWord = tokenName.split(/[\s"'(]/)[0];
    if (firstWord && firstWord.length >= 3) {
      char = characters.find(c => {
        const cFirst = c.name.toLowerCase().split(/[\s"'(]/)[0];
        return cFirst === firstWord;
      });
    }
  }

  // 4. Fallback search in DEFAULT_CHARACTERS if custom list did not have it
  if (!char && characters !== DEFAULT_CHARACTERS) {
    char = DEFAULT_CHARACTERS.find(c => {
      const cName = c.name.toLowerCase().trim();
      return cName === tokenName || cName.includes(tokenName) || tokenName.includes(cName);
    });
  }

  if (char) {
    const isDdbLinked = !!(char as any).ddbCharacterId || char.id.startsWith('char_ddb_') || !!token.ddbCharacterId;
    const maxHp = char.maxHp || char.hp || 25;
    const currentHp = isDdbLinked && char.hp !== undefined
      ? char.hp
      : (token.currentHp !== undefined ? token.currentHp : (token.hp !== undefined ? token.hp : (char.hp || maxHp)));
    const ac = char.ac !== undefined ? char.ac : (token.ac !== undefined ? token.ac : 10);
    const tempHp = char.tempHp !== undefined ? char.tempHp : (token.tempHp !== undefined ? token.tempHp : 0);
    return {
      ac,
      hp: currentHp,
      maxHp,
      currentHp,
      tempHp,
      characterName: char.name,
      isFromCharacterSheet: true,
      race: char.race,
      classLevel: char.classLevel,
      speed: char.speed,
      initiativeBonus: char.initiativeBonus !== undefined ? char.initiativeBonus : (char.stats?.dex ? Math.floor((char.stats.dex - 10) / 2) : 0)
    };
  }

  // Fallback for monsters or tokens without a character sheet
  const maxHp = token.maxHp || token.hp || 20;
  const currentHp = token.currentHp !== undefined
    ? token.currentHp
    : (token.hp !== undefined ? token.hp : maxHp);
  const ac = token.ac !== undefined ? token.ac : 12;
  const tempHp = token.tempHp || 0;

  return {
    ac,
    hp: currentHp,
    maxHp,
    currentHp,
    tempHp,
    characterName: rawName || 'Token',
    isFromCharacterSheet: false,
    speed: (token as any).speed,
    initiativeBonus: (token as any).initiativeBonus !== undefined ? Number((token as any).initiativeBonus) : 0
  };
}
