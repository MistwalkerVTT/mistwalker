// src/effects/bubbles/bubbleCatalog.ts
// Catalog of lasting debuff spells and preset monster status badges

import { TokenStatusBubble, TokenStatusBadge, BubbleStyle } from '../types/bubble';

export type SpellBadgeBehavior = 'replace_after_cast' | 'keep_effect_and_badge';
export type SpellBadgeTargetType = 'target' | 'self' | 'aoe_enemies' | 'aoe_allies' | 'aoe_all';

export interface DebuffSpellConfig {
  spellKey: string;
  name: string;
  aliases: string[];
  subLabel: string;
  icon: string;
  color: string;
  videoUrl?: string;
  description: string;
  style: BubbleStyle;
  /** 'replace_after_cast' removes the cast animation after 2.8s; 'keep_effect_and_badge' keeps normal/persistent VFX and adds the badge. */
  behavior?: SpellBadgeBehavior;
  /** Hints how AoE / self-buff spells should pick target tokens when cast. */
  targetType?: SpellBadgeTargetType;
}

export const LASTING_DEBUFF_SPELLS: DebuffSpellConfig[] = [
  // === EXISTING LASTING DEBUFFS ===
  {
    spellKey: 'hunters_mark',
    name: "Hunter's Mark",
    aliases: ["hunter's mark", "hunters mark", "hunters_mark", "favored foe", "quarry lock"],
    subLabel: '+1d6',
    icon: '🎯',
    color: '#22c55e',
    description: 'Target is marked as quarry: caster deals an extra 1d6 damage on hit and has advantage to track it.',
    style: 'orb',
    behavior: 'replace_after_cast',
    targetType: 'target'
  },
  {
    spellKey: 'hex',
    name: 'Hex',
    aliases: ['hex', 'curse', 'warlock curse'],
    subLabel: 'HEX',
    icon: '💀',
    color: '#a855f7',
    description: 'Cursed target takes an extra 1d6 necrotic damage on hit and has disadvantage on chosen ability checks.',
    style: 'orb',
    behavior: 'replace_after_cast',
    targetType: 'target'
  },
  {
    spellKey: 'faerie_fire',
    name: 'Faerie Fire',
    aliases: ['faerie fire', 'faerie_fire'],
    subLabel: 'ADV',
    icon: '✨',
    color: '#c084fc',
    description: 'Target is outlined in glowing light: attackers have advantage, and target cannot benefit from invisibility.',
    style: 'glow',
    behavior: 'replace_after_cast',
    targetType: 'aoe_enemies'
  },
  {
    spellKey: 'hold_person',
    name: 'Hold Person',
    aliases: ['hold person', 'hold_person', 'hold monster', 'hold_monster'],
    subLabel: 'HOLD',
    icon: '⛓️',
    color: '#fbbf24',
    description: 'Target is paralyzed: incapacitated, auto-fails STR/DEX saves, attacks within 5ft are automatic critical hits.',
    style: 'shield',
    behavior: 'replace_after_cast',
    targetType: 'target'
  },
  {
    spellKey: 'bane',
    name: 'Bane',
    aliases: ['bane'],
    subLabel: '-1d4',
    icon: '🔻',
    color: '#f43f5e',
    description: 'Target subtracts 1d4 from all attack rolls and saving throws.',
    style: 'danger',
    behavior: 'replace_after_cast',
    targetType: 'aoe_enemies'
  },
  {
    spellKey: 'slow',
    name: 'Slow',
    aliases: ['slow'],
    subLabel: '-2AC',
    icon: '⏳',
    color: '#38bdf8',
    description: 'Speed is halved, -2 penalty to AC and DEX saves, no reactions, limited to an action or bonus action.',
    style: 'classic',
    behavior: 'replace_after_cast',
    targetType: 'aoe_enemies'
  },
  {
    spellKey: 'bestow_curse',
    name: 'Bestow Curse',
    aliases: ['bestow curse', 'bestow_curse', 'curse of enfeeblement'],
    subLabel: 'CURS',
    icon: '🔮',
    color: '#9333ea',
    description: 'Target afflicted with a magical curse imposing disadvantage, wasted turns, or bonus damage.',
    style: 'orb',
    behavior: 'replace_after_cast',
    targetType: 'target'
  },
  {
    spellKey: 'blindness',
    name: 'Blindness',
    aliases: ['blindness', 'blindness/deafness', 'blindness_deafness', 'blinded'],
    subLabel: 'BLND',
    icon: '👁️',
    color: '#ef4444',
    description: 'Target is blinded: fails sight checks, attack rolls have disadvantage, attackers have advantage.',
    style: 'danger',
    behavior: 'replace_after_cast',
    targetType: 'target'
  },
  {
    spellKey: 'crown_of_madness',
    name: 'Crown of Madness',
    aliases: ['crown of madness', 'crown_of_madness'],
    subLabel: 'CRWN',
    icon: '👑',
    color: '#dc2626',
    description: 'Charmed humanoid must use its action before moving to make a melee attack against another creature.',
    style: 'classic',
    behavior: 'replace_after_cast',
    targetType: 'target'
  },
  {
    spellKey: 'ray_of_enfeeblement',
    name: 'Ray of Enfeeblement',
    aliases: ['ray of enfeeblement', 'ray_of_enfeeblement', 'enfeebled'],
    subLabel: 'WEAK',
    icon: '📉',
    color: '#84cc16',
    description: 'Target deals half damage with weapon attacks that use Strength.',
    style: 'classic',
    behavior: 'replace_after_cast',
    targetType: 'target'
  },
  {
    spellKey: 'fear',
    name: 'Frightened',
    aliases: ['fear', 'phantasmal killer', 'phantasmal_killer', 'frightened'],
    subLabel: 'FEAR',
    icon: '😱',
    color: '#6366f1',
    description: 'Disadvantage on ability checks and attack rolls while the source of fear is within line of sight.',
    style: 'danger',
    behavior: 'replace_after_cast',
    targetType: 'aoe_enemies'
  },
  {
    spellKey: 'hideous_laughter',
    name: "Tasha's Hideous Laughter",
    aliases: ["tasha's hideous laughter", 'tashas hideous laughter', 'hideous laughter', 'hideous_laughter'],
    subLabel: 'LAUG',
    icon: '😂',
    color: '#f59e0b',
    description: 'Target is incapacitated and falls prone in fits of uncontrollable laughter.',
    style: 'classic',
    behavior: 'replace_after_cast',
    targetType: 'target'
  },

  // === EXPANDED OFFENSIVE DEBUFFS, CONTROL & CONDITIONS ===
  {
    spellKey: 'entangle',
    name: 'Entangled',
    aliases: ['entangle', 'entangled', 'black tentacles', 'black_tentacles', "evard's black tentacles"],
    subLabel: 'REST',
    icon: '🌿',
    color: '#22c55e',
    description: 'Restrained by grasping vines/tentacles: speed is 0, attacks have disadvantage, attackers have advantage.',
    style: 'classic',
    behavior: 'replace_after_cast',
    targetType: 'aoe_enemies'
  },
  {
    spellKey: 'web',
    name: 'Webbed',
    aliases: ['web', 'webbed'],
    subLabel: 'WEB',
    icon: '🕸️',
    color: '#94a3b8',
    description: 'Restrained in sticky webs: speed is 0, attacks and DEX saves have disadvantage, attackers have advantage.',
    style: 'classic',
    behavior: 'keep_effect_and_badge',
    targetType: 'aoe_enemies'
  },
  {
    spellKey: 'ensnaring_strike',
    name: 'Ensnared',
    aliases: ['ensnaring strike', 'ensnaring_strike', 'ensnared'],
    subLabel: 'SNAR',
    icon: '🌿',
    color: '#16a34a',
    description: 'Restrained by thorny vines; takes 1d6 piercing damage at the start of each of its turns.',
    style: 'danger',
    behavior: 'replace_after_cast',
    targetType: 'target'
  },
  {
    spellKey: 'sleep',
    name: 'Asleep',
    aliases: ['sleep', 'asleep'],
    subLabel: 'ZZZ',
    icon: '💤',
    color: '#818cf8',
    description: 'Unconscious under a magical sleep spell: incapacitated, drops held items, falls prone.',
    style: 'classic',
    behavior: 'replace_after_cast',
    targetType: 'aoe_enemies'
  },
  {
    spellKey: 'hypnotic_pattern',
    name: 'Hypnotized',
    aliases: ['hypnotic pattern', 'hypnotic_pattern', 'hypnotized'],
    subLabel: 'HYPN',
    icon: '🌀',
    color: '#c084fc',
    description: 'Charmed and incapacitated with speed 0 until damaged or shaken awake.',
    style: 'glow',
    behavior: 'replace_after_cast',
    targetType: 'aoe_enemies'
  },
  {
    spellKey: 'color_spray',
    name: 'Blinded (Color Spray)',
    aliases: ['color spray', 'color_spray'],
    subLabel: 'BLND',
    icon: '🌈',
    color: '#f472b6',
    description: 'Blinded until the end of the caster’s next turn: attacks have disadvantage, attackers have advantage.',
    style: 'glow',
    behavior: 'keep_effect_and_badge',
    targetType: 'aoe_enemies'
  },
  {
    spellKey: 'command',
    name: 'Commanded',
    aliases: ['command', 'commanded'],
    subLabel: 'CMD',
    icon: '🗣️',
    color: '#f59e0b',
    description: 'Compelled to obey a one-word command on its next turn.',
    style: 'classic',
    behavior: 'replace_after_cast',
    targetType: 'target'
  },
  {
    spellKey: 'heat_metal',
    name: 'Heat Metal',
    aliases: ['heat metal', 'heat_metal'],
    subLabel: 'HEAT',
    icon: '🔥',
    color: '#ef4444',
    description: 'Wearing/holding red-hot metal: takes 2d8 fire damage and has disadvantage on attack rolls and ability checks.',
    style: 'danger',
    behavior: 'replace_after_cast',
    targetType: 'target'
  },
  {
    spellKey: 'frostbite',
    name: 'Frostbitten',
    aliases: ['frostbite', 'frostbitten'],
    subLabel: 'CHIL',
    icon: '❄️',
    color: '#38bdf8',
    description: 'Numbed by frost: disadvantage on the next weapon attack roll before the end of its next turn.',
    style: 'classic',
    behavior: 'keep_effect_and_badge',
    targetType: 'target'
  },
  {
    spellKey: 'ray_of_frost',
    name: 'Chilled (-10 ft)',
    aliases: ['ray of frost', 'ray_of_frost'],
    subLabel: '-10FT',
    icon: '❄️',
    color: '#38bdf8',
    description: 'Speed is reduced by 10 feet until the start of the caster’s next turn.',
    style: 'classic',
    behavior: 'keep_effect_and_badge',
    targetType: 'target'
  },
  {
    spellKey: 'guiding_bolt',
    name: 'Guiding Bolt',
    aliases: ['guiding bolt', 'guiding_bolt'],
    subLabel: 'ADV',
    icon: '✨',
    color: '#fde047',
    description: 'Glittering dim light: the next attack roll made against this target before end of caster’s next turn has advantage.',
    style: 'glow',
    behavior: 'keep_effect_and_badge',
    targetType: 'target'
  },
  {
    spellKey: 'vicious_mockery',
    name: 'Mocked (Disadv)',
    aliases: ['vicious mockery', 'vicious_mockery'],
    subLabel: 'DIS',
    icon: '🎭',
    color: '#a855f7',
    description: 'Rattled by insults: disadvantage on the next attack roll before the end of its next turn.',
    style: 'orb',
    behavior: 'keep_effect_and_badge',
    targetType: 'target'
  },
  {
    spellKey: 'dissonant_whispers',
    name: 'Dissonant Whispers',
    aliases: ['dissonant whispers', 'dissonant_whispers'],
    subLabel: 'FLEE',
    icon: '😱',
    color: '#6366f1',
    description: 'Must immediately use its reaction to move as far away from the caster as its speed allows.',
    style: 'danger',
    behavior: 'keep_effect_and_badge',
    targetType: 'target'
  },
  {
    spellKey: 'silvery_barbs',
    name: 'Silvery Barbs',
    aliases: ['silvery barbs', 'silvery_barbs'],
    subLabel: 'BARB',
    icon: '✨',
    color: '#a855f7',
    description: 'Distracted by fey magic: forced to reroll d20 and use the lower roll; an ally gains advantage.',
    style: 'orb',
    behavior: 'keep_effect_and_badge',
    targetType: 'target'
  },
  {
    spellKey: 'polymorph',
    name: 'Polymorphed',
    aliases: ['polymorph', 'polymorphed'],
    subLabel: 'POLY',
    icon: '🐸',
    color: '#22c55e',
    description: 'Transformed into a new beast form with its game statistics replaced.',
    style: 'orb',
    behavior: 'replace_after_cast',
    targetType: 'target'
  },
  {
    spellKey: 'enlarge_reduce',
    name: 'Enlarge / Reduce',
    aliases: ['enlarge/reduce', 'enlarge_reduce', 'enlarge reduce'],
    subLabel: 'SIZE',
    icon: '↕️',
    color: '#38bdf8',
    description: 'Size doubled (+1d4 weapon damage, ADV STR) or halved (-1d4 weapon damage, DIS STR).',
    style: 'classic',
    behavior: 'replace_after_cast',
    targetType: 'target'
  },
  {
    spellKey: 'banishment',
    name: 'Banished',
    aliases: ['banishment', 'banished'],
    subLabel: 'BAN',
    icon: '🌀',
    color: '#6366f1',
    description: 'Banished to a harmless demiplane (or home plane) and incapacitated for the duration.',
    style: 'orb',
    behavior: 'replace_after_cast',
    targetType: 'target'
  },
  {
    spellKey: 'sunbeam',
    name: 'Blinded (Sunlight)',
    aliases: ['sunbeam', 'sunburst'],
    subLabel: 'BLND',
    icon: '☀️',
    color: '#facc15',
    description: 'Blinded by brilliant radiance: fails sight checks, attacks have disadvantage, attackers have advantage.',
    style: 'glow',
    behavior: 'keep_effect_and_badge',
    targetType: 'aoe_enemies'
  },
  {
    spellKey: 'stunning_strike',
    name: 'Stunned',
    aliases: ['stunning strike', 'stunning_strike', 'stunned'],
    subLabel: 'STUN',
    icon: '💥',
    color: '#f97316',
    description: 'Stunned: incapacitated, cannot move, auto-fails STR/DEX saves, attackers have advantage.',
    style: 'danger',
    behavior: 'keep_effect_and_badge',
    targetType: 'target'
  },
  {
    spellKey: 'cutting_words',
    name: 'Cutting Words',
    aliases: ['cutting words', 'cutting_words'],
    subLabel: '-DIE',
    icon: '🎭',
    color: '#ec4899',
    description: 'Bardic Inspiration die subtracted from target’s attack roll, ability check, or damage roll.',
    style: 'danger',
    behavior: 'keep_effect_and_badge',
    targetType: 'target'
  },
  {
    spellKey: 'witch_bolt',
    name: 'Witch Bolt',
    aliases: ['witch bolt', 'witch_bolt'],
    subLabel: 'BOLT',
    icon: '⚡',
    color: '#38bdf8',
    description: 'Arcane lightning tether: caster can deal 1d12 lightning damage on subsequent turns.',
    style: 'glow',
    behavior: 'replace_after_cast',
    targetType: 'target'
  },
  {
    spellKey: 'caustic_brew',
    name: 'Acidic (Caustic Brew)',
    aliases: ["tasha's caustic brew", 'caustic brew', 'caustic_brew'],
    subLabel: 'ACID',
    icon: '🧪',
    color: '#84cc16',
    description: 'Covered in acid: takes 2d4 acid damage at the start of each turn until scraped off.',
    style: 'danger',
    behavior: 'replace_after_cast',
    targetType: 'aoe_enemies'
  },
  {
    spellKey: 'booming_blade',
    name: 'Booming Energy',
    aliases: ['booming blade', 'booming_blade'],
    subLabel: 'BOOM',
    icon: '⚡',
    color: '#38bdf8',
    description: 'Sheathed in booming energy: takes thunder damage if it willingly moves 5 ft or more before caster’s next turn.',
    style: 'glow',
    behavior: 'keep_effect_and_badge',
    targetType: 'target'
  },
  {
    spellKey: 'starry_wisp',
    name: 'Starry Wisp',
    aliases: ['starry wisp', 'starry_wisp'],
    subLabel: 'LIT',
    icon: '🌟',
    color: '#fde047',
    description: 'Emits dim light in 10 ft radius and cannot benefit from the Invisible condition until end of caster’s next turn.',
    style: 'glow',
    behavior: 'keep_effect_and_badge',
    targetType: 'target'
  },

  // === DEFENSIVE BUFFS, PROTECTIONS & ENHANCEMENTS ===
  {
    spellKey: 'bless',
    name: 'Blessed',
    aliases: ['bless', 'blessed'],
    subLabel: '+1d4',
    icon: '✨',
    color: '#facc15',
    description: 'Blessed: adds 1d4 to all attack rolls and saving throws for the duration.',
    style: 'glow',
    behavior: 'keep_effect_and_badge',
    targetType: 'aoe_allies'
  },
  {
    spellKey: 'shield',
    name: 'Shield (+5 AC)',
    aliases: ['shield'],
    subLabel: '+5AC',
    icon: '🛡️',
    color: '#38bdf8',
    description: '+5 bonus to AC (including against the triggering attack) until the start of your next turn.',
    style: 'shield',
    behavior: 'keep_effect_and_badge',
    targetType: 'self'
  },
  {
    spellKey: 'shield_of_faith',
    name: 'Shield of Faith',
    aliases: ['shield of faith', 'shield_of_faith'],
    subLabel: '+2AC',
    icon: '🛡️',
    color: '#facc15',
    description: 'Shimmering field grants +2 bonus to Armor Class.',
    style: 'shield',
    behavior: 'keep_effect_and_badge',
    targetType: 'target'
  },
  {
    spellKey: 'mage_armor',
    name: 'Mage Armor',
    aliases: ['mage armor', 'mage_armor'],
    subLabel: 'AC13',
    icon: '🔮',
    color: '#38bdf8',
    description: 'Protective magical force: base AC becomes 13 + DEX modifier.',
    style: 'shield',
    behavior: 'keep_effect_and_badge',
    targetType: 'target'
  },
  {
    spellKey: 'barkskin',
    name: 'Barkskin',
    aliases: ['barkskin'],
    subLabel: 'AC16',
    icon: '🌳',
    color: '#84cc16',
    description: 'Skin has a rough, bark-like appearance: AC cannot be less than 16 (17 in 2024 rules).',
    style: 'shield',
    behavior: 'keep_effect_and_badge',
    targetType: 'target'
  },
  {
    spellKey: 'haste',
    name: 'Hasted',
    aliases: ['haste', 'hasted'],
    subLabel: 'HAST',
    icon: '⚡',
    color: '#38bdf8',
    description: 'Speed doubled, +2 AC, advantage on DEX saves, and an additional action each turn.',
    style: 'glow',
    behavior: 'keep_effect_and_badge',
    targetType: 'target'
  },
  {
    spellKey: 'invisibility',
    name: 'Invisible',
    aliases: ['invisibility', 'greater invisibility', 'greater_invisibility', 'invisible'],
    subLabel: 'INVS',
    icon: '👻',
    color: '#94a3b8',
    description: 'Invisible: attacks against you have disadvantage, and your attacks have advantage.',
    style: 'classic',
    behavior: 'keep_effect_and_badge',
    targetType: 'target'
  },
  {
    spellKey: 'fly',
    name: 'Flying',
    aliases: ['fly', 'flying'],
    subLabel: 'FLY',
    icon: '🪽',
    color: '#38bdf8',
    description: 'Gains a flying speed of 60 feet for the duration.',
    style: 'glow',
    behavior: 'keep_effect_and_badge',
    targetType: 'target'
  },
  {
    spellKey: 'mirror_image',
    name: 'Mirror Image',
    aliases: ['mirror image', 'mirror_image'],
    subLabel: 'MIRR',
    icon: '🪞',
    color: '#c084fc',
    description: 'Three illusory duplicates surround you, potentially redirecting incoming attacks.',
    style: 'orb',
    behavior: 'keep_effect_and_badge',
    targetType: 'self'
  },
  {
    spellKey: 'sanctuary',
    name: 'Sanctuary',
    aliases: ['sanctuary'],
    subLabel: 'SANC',
    icon: '🕊️',
    color: '#fde047',
    description: 'Warded against attacks: enemies must pass a WIS save to target you with an attack or harmful spell.',
    style: 'shield',
    behavior: 'keep_effect_and_badge',
    targetType: 'target'
  },
  {
    spellKey: 'aid',
    name: 'Aid (+Max HP)',
    aliases: ['aid'],
    subLabel: '+5HP',
    icon: '❤️',
    color: '#22c55e',
    description: 'Bolstered toughness: hit point maximum and current hit points increased by 5 (or more if upcast).',
    style: 'classic',
    behavior: 'keep_effect_and_badge',
    targetType: 'aoe_allies'
  },
  {
    spellKey: 'armor_of_agathys',
    name: 'Armor of Agathys',
    aliases: ['armor of agathys', 'armor_of_agathys'],
    subLabel: 'THRN',
    icon: '❄️',
    color: '#38bdf8',
    description: 'Protective spectral frost grants Temp HP and deals cold damage to melee attackers.',
    style: 'shield',
    behavior: 'keep_effect_and_badge',
    targetType: 'self'
  },
  {
    spellKey: 'death_ward',
    name: 'Death Ward',
    aliases: ['death ward', 'death_ward'],
    subLabel: 'WARD',
    icon: '💀',
    color: '#facc15',
    description: 'The first time you would drop to 0 HP, you drop to 1 HP instead (and negates instant-death effects).',
    style: 'shield',
    behavior: 'keep_effect_and_badge',
    targetType: 'target'
  },
  {
    spellKey: 'warding_bond',
    name: 'Warding Bond',
    aliases: ['warding bond', 'warding_bond'],
    subLabel: 'BOND',
    icon: '🔗',
    color: '#f472b6',
    description: '+1 bonus to AC and saving throws, and resistance to all damage (caster takes matching damage).',
    style: 'shield',
    behavior: 'keep_effect_and_badge',
    targetType: 'target'
  },
  {
    spellKey: 'pass_without_trace',
    name: 'Pass without Trace',
    aliases: ['pass without trace', 'pass_without_trace'],
    subLabel: '+10S',
    icon: '🥷',
    color: '#22c55e',
    description: 'Veil of shadows grants +10 bonus to Dexterity (Stealth) checks and leaves no tracks.',
    style: 'classic',
    behavior: 'keep_effect_and_badge',
    targetType: 'aoe_allies'
  },
  {
    spellKey: 'beacon_of_hope',
    name: 'Beacon of Hope',
    aliases: ['beacon of hope', 'beacon_of_hope'],
    subLabel: 'HOPE',
    icon: '🌟',
    color: '#fde047',
    description: 'Advantage on Wisdom saving throws and death saving throws; regains maximum HP from healing.',
    style: 'glow',
    behavior: 'keep_effect_and_badge',
    targetType: 'aoe_allies'
  },
  {
    spellKey: 'holy_aura',
    name: 'Holy Aura',
    aliases: ['holy aura', 'holy_aura'],
    subLabel: 'HOLY',
    icon: '😇',
    color: '#fde047',
    description: 'Advantage on all saving throws, and other creatures have disadvantage on attack rolls against you.',
    style: 'glow',
    behavior: 'keep_effect_and_badge',
    targetType: 'aoe_allies'
  },
  {
    spellKey: 'absorb_elements',
    name: 'Absorb Elements',
    aliases: ['absorb elements', 'absorb_elements'],
    subLabel: 'ABSB',
    icon: '🛡️',
    color: '#f97316',
    description: 'Resistance to triggering elemental damage until next turn + extra 1d6 elemental damage on next melee hit.',
    style: 'shield',
    behavior: 'keep_effect_and_badge',
    targetType: 'self'
  },
  {
    spellKey: 'blade_ward',
    name: 'Blade Ward',
    aliases: ['blade ward', 'blade_ward'],
    subLabel: 'BLWD',
    icon: '🛡️',
    color: '#94a3b8',
    description: 'Protective ward against weapon attacks (resistance to B/P/S or -1d4 to attackers in 2024 rules).',
    style: 'shield',
    behavior: 'keep_effect_and_badge',
    targetType: 'self'
  },
  {
    spellKey: 'fire_shield',
    name: 'Fire Shield',
    aliases: ['fire shield', 'fire_shield'],
    subLabel: 'FSHD',
    icon: '🔥',
    color: '#f97316',
    description: 'Resistance to Cold or Fire damage, and melee attackers within 5 ft take 2d8 fire/cold damage.',
    style: 'shield',
    behavior: 'keep_effect_and_badge',
    targetType: 'self'
  },
  {
    spellKey: 'bardic_inspiration',
    name: 'Inspired',
    aliases: ['bardic inspiration', 'bardic_inspiration', 'inspired'],
    subLabel: 'INSP',
    icon: '🎵',
    color: '#ec4899',
    description: 'Has a Bardic Inspiration die to add to one ability check, attack roll, or saving throw.',
    style: 'glow',
    behavior: 'keep_effect_and_badge',
    targetType: 'target'
  },
  {
    spellKey: 'guidance',
    name: 'Guidance',
    aliases: ['guidance'],
    subLabel: '+1d4',
    icon: '🙏',
    color: '#fde047',
    description: 'Add 1d4 to one ability check of the target’s choice.',
    style: 'glow',
    behavior: 'keep_effect_and_badge',
    targetType: 'target'
  },
  {
    spellKey: 'rage_frenzy',
    name: 'Raging',
    aliases: ['rage', 'frenzy', 'rage_frenzy', 'raging'],
    subLabel: 'RAGE',
    icon: '💢',
    color: '#ef4444',
    description: 'Resistance to bludgeoning, piercing, and slashing damage, bonus Rage damage, and ADV on STR checks/saves.',
    style: 'danger',
    behavior: 'keep_effect_and_badge',
    targetType: 'self'
  },
  {
    spellKey: 'zephyr_strike',
    name: 'Zephyr Strike',
    aliases: ['zephyr strike', 'zephyr_strike'],
    subLabel: 'ZEPH',
    icon: '💨',
    color: '#22c55e',
    description: 'Movement does not provoke opportunity attacks; once before spell ends, gain ADV + 1d8 force damage + 30 ft speed.',
    style: 'glow',
    behavior: 'keep_effect_and_badge',
    targetType: 'self'
  },
  {
    spellKey: 'fount_of_moonlight',
    name: 'Fount of Moonlight',
    aliases: ['fount of moonlight', 'fount_of_moonlight'],
    subLabel: 'MOON',
    icon: '🌙',
    color: '#c084fc',
    description: 'Resistance to radiant damage, emits bright light, and melee attacks deal an extra 2d6 radiant damage.',
    style: 'glow',
    behavior: 'keep_effect_and_badge',
    targetType: 'self'
  },
  {
    spellKey: 'regenerate',
    name: 'Regenerating',
    aliases: ['regenerate', 'regenerating'],
    subLabel: 'REGN',
    icon: '💚',
    color: '#22c55e',
    description: 'Regains 1 hit point at the start of each of its turns (10 HP/minute).',
    style: 'orb',
    behavior: 'keep_effect_and_badge',
    targetType: 'target'
  }
];

/**
 * Checks if a spell or asset key represents a lasting debuff spell that transitions to a bubble.
 * Prioritizes exact matches, then alias equality, then inclusion to prevent cross-matching.
 */
export function findLastingDebuffConfig(assetIdOrName: string | undefined): DebuffSpellConfig | null {
  if (!assetIdOrName) return null;
  const lower = assetIdOrName.trim().toLowerCase();
  
  // 1. Exact match on spellKey or name
  for (const cfg of LASTING_DEBUFF_SPELLS) {
    if (cfg.spellKey === lower || cfg.name.toLowerCase() === lower) return cfg;
  }

  // 2. Exact match on any alias
  for (const cfg of LASTING_DEBUFF_SPELLS) {
    if (cfg.aliases.some(a => a === lower)) return cfg;
  }

  // 3. Word-boundary or longer substring match to prevent short aliases (e.g. "aid", "hex") from false-matching
  for (const cfg of LASTING_DEBUFF_SPELLS) {
    if (cfg.aliases.some(a => {
      if (a.length >= 5 && (lower.includes(a) || a.includes(lower))) return true;
      const escaped = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b`, 'i').test(lower);
    })) {
      return cfg;
    }
  }
  return null;
}

export const findSpellBadgeConfig = findLastingDebuffConfig;

/**
 * Creates a TokenStatusBadge from a debuff spell config
 */
export function createDebuffBubbleFromConfig(cfg: DebuffSpellConfig, casterName?: string): TokenStatusBubble {
  return {
    id: `badge_${cfg.spellKey}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    label: cfg.name,
    subLabel: cfg.subLabel,
    icon: cfg.icon,
    color: cfg.color,
    bgColor: '#090d16',
    borderColor: cfg.color,
    pulse: true,
    style: cfg.style,
    sourceSpellId: cfg.spellKey,
    sourceCasterId: casterName,
    createdTime: Date.now(),
    description: cfg.description
  };
}

export const createDebuffBadgeFromConfig = createDebuffBubbleFromConfig;

/**
 * Preset status badges available for the DM right-click menu
 */
export const PRESET_DM_BUBBLES: Omit<TokenStatusBubble, 'id'>[] = [
  {
    label: "Hunter's Mark",
    subLabel: '+1d6',
    icon: '🎯',
    color: '#22c55e',
    style: 'orb',
    description: "Marked quarry: +1d6 damage on hit."
  },
  {
    label: 'Hex',
    subLabel: 'HEX',
    icon: '💀',
    color: '#a855f7',
    style: 'orb',
    description: 'Hexed: +1d6 necrotic damage on hit and disadvantage on ability checks.'
  },
  {
    label: 'Faerie Fire',
    subLabel: 'ADV',
    icon: '✨',
    color: '#c084fc',
    style: 'glow',
    description: 'Outlined in light: attackers have advantage.'
  },
  {
    label: 'Hold Person',
    subLabel: 'HOLD',
    icon: '⛓️',
    color: '#fbbf24',
    style: 'shield',
    description: 'Paralyzed: incapacitated, attacks within 5ft auto-crit.'
  },
  {
    label: 'Bane',
    subLabel: '-1d4',
    icon: '🔻',
    color: '#f43f5e',
    style: 'danger',
    description: 'Subtract 1d4 from attack rolls and saving throws.'
  },
  {
    label: 'Slow',
    subLabel: '-2AC',
    icon: '⏳',
    color: '#38bdf8',
    style: 'classic',
    description: 'Half speed, -2 AC/DEX saves, no reactions.'
  },
  {
    label: 'Shield Buff',
    subLabel: '+2AC',
    icon: '🛡️',
    color: '#38bdf8',
    style: 'shield',
    description: 'Magical shield bonus to Armor Class.'
  },
  {
    label: 'Priority Target',
    subLabel: 'PRIO',
    icon: '🎯',
    color: '#ef4444',
    pulse: true,
    style: 'danger',
    description: 'Primary focus fire target for the party.'
  },
  {
    label: 'Boss Monster',
    subLabel: 'BOSS',
    icon: '👑',
    color: '#eab308',
    pulse: true,
    style: 'badge',
    description: 'Legendary or elite encounter boss.'
  },
  {
    label: 'Bloodied',
    subLabel: '<50%',
    icon: '🩸',
    color: '#b91c1c',
    style: 'danger',
    description: 'Creature reduced below half maximum HP.'
  },
  {
    label: 'Concentrating',
    subLabel: 'CONC',
    icon: '🧠',
    color: '#06b6d4',
    style: 'classic',
    description: 'Maintaining concentration on a spell.'
  },
  {
    label: 'Vulnerable',
    subLabel: '2x',
    icon: '⚡',
    color: '#f59e0b',
    style: 'danger',
    description: 'Takes double damage from specific damage type.'
  },
  {
    label: 'Resistant',
    subLabel: '1/2',
    icon: '🚫',
    color: '#64748b',
    style: 'shield',
    description: 'Takes half damage from specific damage type.'
  },
  {
    label: 'Observed',
    subLabel: 'SEEN',
    icon: '👁️',
    color: '#0ea5e9',
    style: 'orb',
    description: 'Spotted by Truesight, See Invisibility, or Hunter.'
  },
  {
    label: 'Stunned',
    subLabel: 'STUN',
    icon: '💥',
    color: '#f97316',
    style: 'danger',
    description: 'Incapacitated, auto-fails STR/DEX saves, attackers have advantage.'
  },
  {
    label: 'Asleep',
    subLabel: 'ZZZ',
    icon: '💤',
    color: '#818cf8',
    style: 'classic',
    description: 'Unconscious under a magical sleep spell.'
  },
  {
    label: 'Restrained',
    subLabel: 'REST',
    icon: '🌿',
    color: '#22c55e',
    style: 'classic',
    description: 'Speed is 0, attack rolls have disadvantage, attackers have advantage.'
  },
  {
    label: 'Blinded',
    subLabel: 'BLND',
    icon: '👁️',
    color: '#ef4444',
    style: 'danger',
    description: 'Fails sight checks, attack rolls have disadvantage, attackers have advantage.'
  },
  {
    label: 'Invisible',
    subLabel: 'INVS',
    icon: '👻',
    color: '#94a3b8',
    style: 'classic',
    description: 'Impossible to see without special sense; attacks have advantage, incoming attacks have disadvantage.'
  },
  {
    label: 'Blessed',
    subLabel: '+1d4',
    icon: '✨',
    color: '#facc15',
    style: 'glow',
    description: 'Add 1d4 to all attack rolls and saving throws.'
  },
  {
    label: 'Hasted',
    subLabel: 'HAST',
    icon: '⚡',
    color: '#38bdf8',
    style: 'glow',
    description: 'Speed doubled, +2 AC, advantage on DEX saves, and an extra action.'
  },
  {
    label: 'Prone',
    subLabel: 'PRNE',
    icon: '⬇️',
    color: '#f59e0b',
    style: 'classic',
    description: 'Disadvantage on attack rolls; melee attacks within 5 ft have advantage.'
  }
];

export const PRESET_DM_BADGES = PRESET_DM_BUBBLES;
