// src/effects/bubbles/bubbleCatalog.ts
// Catalog of lasting debuff spells and preset monster status bubbles

import { TokenStatusBubble, BubbleStyle } from '../types/bubble';

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
}

export const LASTING_DEBUFF_SPELLS: DebuffSpellConfig[] = [
  {
    spellKey: 'hunters_mark',
    name: "Hunter's Mark",
    aliases: ["hunter's mark", "hunters mark", "hunters_mark", "favored foe", "quarry lock"],
    subLabel: '+1d6',
    icon: '🎯',
    color: '#22c55e',
    videoUrl: '/jb2a/Library/1st_Level/Hunters_Mark/HuntersMark_01_Regular_Green_Loop_200x200.webm',
    description: 'Target is marked as quarry: caster deals an extra 1d6 damage on hit and has advantage to track it.',
    style: 'orb'
  },
  {
    spellKey: 'hex',
    name: 'Hex',
    aliases: ['hex', 'curse', 'warlock curse'],
    subLabel: 'HEX',
    icon: '💀',
    color: '#a855f7',
    videoUrl: '/jb2a/Library/Generic/Template/Circle/TemplateSkullCircle_01_Regular_Purple_800x800.webm',
    description: 'Cursed target takes an extra 1d6 necrotic damage on hit and has disadvantage on chosen ability checks.',
    style: 'orb'
  },
  {
    spellKey: 'faerie_fire',
    name: 'Faerie Fire',
    aliases: ['faerie fire', 'faerie_fire'],
    subLabel: 'ADV',
    icon: '✨',
    color: '#c084fc',
    videoUrl: '/jb2a/Library/Generic/Butterflies/ButterfliesComplete01_01_Regular_BluePurple_600x600.webm',
    description: 'Target is outlined in glowing light: attackers have advantage, and target cannot benefit from invisibility.',
    style: 'glow'
  },
  {
    spellKey: 'hold_person',
    name: 'Hold Person',
    aliases: ['hold person', 'hold_person', 'hold monster', 'hold_monster'],
    subLabel: 'HOLD',
    icon: '⛓️',
    color: '#fbbf24',
    videoUrl: '/jb2a/Community/JAA/chain1.webm',
    description: 'Target is paralyzed: incapacitated, auto-fails STR/DEX saves, attacks within 5ft are automatic critical hits.',
    style: 'shield'
  },
  {
    spellKey: 'bane',
    name: 'Bane',
    aliases: ['bane'],
    subLabel: '-1d4',
    icon: '🔻',
    color: '#f43f5e',
    description: 'Target subtracts 1d4 from all attack rolls and saving throws.',
    style: 'danger'
  },
  {
    spellKey: 'slow',
    name: 'Slow',
    aliases: ['slow'],
    subLabel: '-2AC',
    icon: '⏳',
    color: '#38bdf8',
    description: 'Speed is halved, -2 penalty to AC and DEX saves, no reactions, limited to an action or bonus action.',
    style: 'classic'
  },
  {
    spellKey: 'bestow_curse',
    name: 'Bestow Curse',
    aliases: ['bestow curse', 'bestow_curse', 'curse of enfeeblement'],
    subLabel: 'CURS',
    icon: '🔮',
    color: '#9333ea',
    description: 'Target afflicted with a magical curse imposing disadvantage, wasted turns, or bonus damage.',
    style: 'orb'
  },
  {
    spellKey: 'blindness',
    name: 'Blindness',
    aliases: ['blindness', 'blindness/deafness', 'blindness_deafness', 'blinded'],
    subLabel: 'BLND',
    icon: '👁️',
    color: '#ef4444',
    description: 'Target is blinded: fails sight checks, attack rolls have disadvantage, attackers have advantage.',
    style: 'danger'
  },
  {
    spellKey: 'crown_of_madness',
    name: 'Crown of Madness',
    aliases: ['crown of madness', 'crown_of_madness'],
    subLabel: 'CRWN',
    icon: '👑',
    color: '#dc2626',
    description: 'Charmed humanoid must use its action before moving to make a melee attack against another creature.',
    style: 'classic'
  },
  {
    spellKey: 'ray_of_enfeeblement',
    name: 'Ray of Enfeeblement',
    aliases: ['ray of enfeeblement', 'ray_of_enfeeblement', 'enfeebled'],
    subLabel: 'WEAK',
    icon: '📉',
    color: '#84cc16',
    description: 'Target deals half damage with weapon attacks that use Strength.',
    style: 'classic'
  },
  {
    spellKey: 'fear',
    name: 'Frightened',
    aliases: ['fear', 'phantasmal killer', 'phantasmal_killer', 'frightened'],
    subLabel: 'FEAR',
    icon: '😱',
    color: '#6366f1',
    videoUrl: '/jb2a/Library/Generic/Template/Circle/TemplateFearCircle_01_Dark_Purple_800x800.webm',
    description: 'Disadvantage on ability checks and attack rolls while the source of fear is within line of sight.',
    style: 'danger'
  },
  {
    spellKey: 'hideous_laughter',
    name: "Tasha's Hideous Laughter",
    aliases: ["tasha's hideous laughter", 'tashas hideous laughter', 'hideous laughter', 'hideous_laughter'],
    subLabel: 'LAUG',
    icon: '😂',
    color: '#f59e0b',
    description: 'Target is incapacitated and falls prone in fits of uncontrollable laughter.',
    style: 'classic'
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

  // 3. Substring match where token name or alias contains each other
  for (const cfg of LASTING_DEBUFF_SPELLS) {
    if (cfg.aliases.some(a => lower.includes(a) || (a.length >= 4 && a.includes(lower)))) return cfg;
  }
  return null;
}

/**
 * Creates a TokenStatusBubble from a debuff spell config
 */
export function createDebuffBubbleFromConfig(cfg: DebuffSpellConfig, casterName?: string): TokenStatusBubble {
  return {
    id: `bubble_${cfg.spellKey}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    label: cfg.name,
    subLabel: cfg.subLabel,
    icon: cfg.icon,
    color: cfg.color,
    bgColor: '#090d16',
    borderColor: cfg.color,
    videoUrl: cfg.videoUrl,
    pulse: true,
    style: cfg.style,
    sourceSpellId: cfg.spellKey,
    sourceCasterId: casterName,
    createdTime: Date.now(),
    description: cfg.description
  };
}

/**
 * Preset status bubbles available for the DM right-click menu
 */
export const PRESET_DM_BUBBLES: Omit<TokenStatusBubble, 'id'>[] = [
  {
    label: "Hunter's Mark",
    subLabel: '+1d6',
    icon: '🎯',
    color: '#22c55e',
    videoUrl: '/jb2a/Library/1st_Level/Hunters_Mark/HuntersMark_01_Regular_Green_Loop_200x200.webm',
    style: 'orb',
    description: "Marked quarry: +1d6 damage on hit."
  },
  {
    label: 'Hex',
    subLabel: 'HEX',
    icon: '💀',
    color: '#a855f7',
    videoUrl: '/jb2a/Library/Generic/Template/Circle/TemplateSkullCircle_01_Regular_Purple_800x800.webm',
    style: 'orb',
    description: 'Hexed: +1d6 necrotic damage on hit and disadvantage on ability checks.'
  },
  {
    label: 'Faerie Fire',
    subLabel: 'ADV',
    icon: '✨',
    color: '#c084fc',
    videoUrl: '/jb2a/Library/Generic/Butterflies/ButterfliesComplete01_01_Regular_BluePurple_600x600.webm',
    style: 'glow',
    description: 'Outlined in light: attackers have advantage.'
  },
  {
    label: 'Hold Person',
    subLabel: 'HOLD',
    icon: '⛓️',
    color: '#fbbf24',
    videoUrl: '/jb2a/Community/JAA/chain1.webm',
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
    style: 'ac-badge',
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
  }
];
