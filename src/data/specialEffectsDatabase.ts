import { SpellSoundType } from '../utils/spellSoundEngine';
import { findJb2aAsset, JB2A_DATABASE } from './jb2aDatabase';

export type SpellSchool =
  | 'evocation'
  | 'conjuration'
  | 'abjuration'
  | 'necromancy'
  | 'enchantment'
  | 'transmutation'
  | 'illusion'
  | 'divination'
  | 'environmental';

export type SpellShape = 'circle' | 'cone' | 'line';
export type SpellCategory = 'instant' | 'persistent' | 'hazard' | 'buff' | 'utility';

export interface SpecialEffectDefinition {
  id: string;
  name: string;
  label: string;
  level: number; // 0 = Cantrip, 1-9
  school: SpellSchool;
  category: SpellCategory;
  shape: SpellShape;
  defaultSizeFt: number; // In feet on the battlemap (5, 10, 15, 20, 30, 60, 100)
  color: string; // Primary RGBA aura / blast color
  secondaryColor?: string; // Accent color for runes / particles
  blendMode: 'screen' | 'lighter' | 'normal';
  isPersistent: boolean;
  defaultOpacity: number;
  description: string;
  iconName: 'flame' | 'zap' | 'sun' | 'snowflake' | 'moon' | 'cloud' | 'droplets' | 'wind' | 'shield' | 'sparkles' | 'eye' | 'skull';
  badgeColor: string;
  soundEffect: SpellSoundType;
  hasShockwave: boolean;
  proceduralStyle: string; // Identifier for real-time procedural / shader rendering
  tags: string[];
  videoUrl?: string;
  loopVideoUrl?: string;
  thumbUrl?: string;
  jb2aId?: string;
}

const RAW_SPECIAL_EFFECTS: SpecialEffectDefinition[] = [
  // =========================================================================
  // 1. EVOCATION & BLAST ATTACKS (Instant Destruction & Energy)
  // =========================================================================
  {
    id: 'fireball',
    name: 'Fireball',
    label: 'Fireball',
    level: 3,
    school: 'evocation',
    category: 'instant',
    shape: 'circle',
    defaultSizeFt: 20,
    color: 'rgba(239, 68, 68, 0.55)',
    secondaryColor: 'rgba(245, 158, 11, 0.9)',
    blendMode: 'lighter',
    isPersistent: false,
    defaultOpacity: 0.95,
    description: '20ft radius explosive bloom of roaring flame with an expanding concussive shockwave.',
    iconName: 'flame',
    badgeColor: 'text-red-400 bg-red-950/70 border-red-800/70',
    soundEffect: 'explosion',
    hasShockwave: true,
    proceduralStyle: 'fire_vortex',
    tags: ['fire', 'blast', 'aoe', 'evocation', 'damage']
  },
  {
    id: 'eldritch_blast',
    name: 'Eldritch Blast',
    label: 'Eldritch Blast',
    level: 0,
    school: 'evocation',
    category: 'instant',
    shape: 'circle',
    defaultSizeFt: 5,
    color: 'rgba(168, 85, 247, 0.6)',
    secondaryColor: 'rgba(99, 102, 241, 0.95)',
    blendMode: 'screen',
    isPersistent: false,
    defaultOpacity: 0.95,
    description: 'Crackling beam of cosmic eldritch force and shimmering violet starlight.',
    iconName: 'zap',
    badgeColor: 'text-purple-400 bg-purple-950/70 border-purple-800/70',
    soundEffect: 'whoosh',
    hasShockwave: false,
    proceduralStyle: 'arcane_vortex',
    tags: ['force', 'warlock', 'cantrip', 'beam', 'eldritch']
  },
  {
    id: 'lightning_bolt',
    name: 'Lightning Bolt',
    label: 'Lightning Bolt',
    level: 3,
    school: 'evocation',
    category: 'instant',
    shape: 'line',
    defaultSizeFt: 100,
    color: 'rgba(234, 179, 8, 0.65)',
    secondaryColor: 'rgba(56, 189, 248, 0.95)',
    blendMode: 'lighter',
    isPersistent: false,
    defaultOpacity: 0.95,
    description: '100ft stroke of surging lightning surging in a continuous line with electric arcs.',
    iconName: 'zap',
    badgeColor: 'text-yellow-400 bg-yellow-950/70 border-yellow-800/70',
    soundEffect: 'lightning',
    hasShockwave: true,
    proceduralStyle: 'lightning_arc',
    tags: ['lightning', 'electric', 'line', 'evocation', 'piercing']
  },
  {
    id: 'cone_of_cold',
    name: 'Cone of Cold',
    label: 'Cone of Cold',
    level: 5,
    school: 'evocation',
    category: 'instant',
    shape: 'cone',
    defaultSizeFt: 60,
    color: 'rgba(56, 189, 248, 0.55)',
    secondaryColor: 'rgba(255, 255, 255, 0.9)',
    blendMode: 'screen',
    isPersistent: false,
    defaultOpacity: 0.9,
    description: '60ft cone of howling sub-zero arctic gale and crystalline frost needles.',
    iconName: 'snowflake',
    badgeColor: 'text-sky-400 bg-sky-950/70 border-sky-800/70',
    soundEffect: 'ice_shatter',
    hasShockwave: false,
    proceduralStyle: 'ice_cone',
    tags: ['cold', 'frost', 'cone', 'ice', 'evocation']
  },
  {
    id: 'burning_hands',
    name: 'Burning Hands / Dragon Breath',
    label: 'Burning Hands',
    level: 1,
    school: 'evocation',
    category: 'instant',
    shape: 'cone',
    defaultSizeFt: 15,
    color: 'rgba(249, 115, 22, 0.55)',
    secondaryColor: 'rgba(239, 68, 68, 0.9)',
    blendMode: 'lighter',
    isPersistent: false,
    defaultOpacity: 0.9,
    description: '15ft sheet of roaring flames billowing outward from outstretched fingertips.',
    iconName: 'flame',
    badgeColor: 'text-orange-400 bg-orange-950/70 border-orange-800/70',
    soundEffect: 'fire_whoosh',
    hasShockwave: false,
    proceduralStyle: 'flame_cone',
    tags: ['fire', 'cone', 'breath', 'evocation']
  },
  {
    id: 'thunderwave',
    name: 'Thunderwave',
    label: 'Thunderwave',
    level: 1,
    school: 'evocation',
    category: 'instant',
    shape: 'circle',
    defaultSizeFt: 15,
    color: 'rgba(56, 189, 248, 0.5)',
    secondaryColor: 'rgba(255, 255, 255, 0.95)',
    blendMode: 'lighter',
    isPersistent: false,
    defaultOpacity: 0.9,
    description: '15ft concussive wave of booming thunderous force knocking foes backward.',
    iconName: 'wind',
    badgeColor: 'text-cyan-400 bg-cyan-950/70 border-cyan-800/70',
    soundEffect: 'thunder',
    hasShockwave: true,
    proceduralStyle: 'shockwave_ring',
    tags: ['thunder', 'knockback', 'wave', 'evocation']
  },
  {
    id: 'fire_bolt',
    name: 'Fire Bolt',
    label: 'Fire Bolt',
    level: 0,
    school: 'evocation',
    category: 'instant',
    shape: 'circle',
    defaultSizeFt: 5,
    color: 'rgba(239, 68, 68, 0.6)',
    secondaryColor: 'rgba(251, 146, 60, 0.9)',
    blendMode: 'lighter',
    isPersistent: false,
    defaultOpacity: 0.95,
    description: 'Concentrated streak of ignited flame hurled at a creature or flammable object.',
    iconName: 'flame',
    badgeColor: 'text-red-400 bg-red-950/70 border-red-800/70',
    soundEffect: 'fire_whoosh',
    hasShockwave: false,
    proceduralStyle: 'fire_bolt',
    tags: ['fire', 'cantrip', 'projectile', 'evocation']
  },
  {
    id: 'shocking_grasp',
    name: 'Shocking Grasp',
    label: 'Shocking Grasp',
    level: 0,
    school: 'evocation',
    category: 'instant',
    shape: 'circle',
    defaultSizeFt: 5,
    color: 'rgba(59, 130, 246, 0.6)',
    secondaryColor: 'rgba(147, 197, 253, 0.95)',
    blendMode: 'lighter',
    isPersistent: false,
    defaultOpacity: 0.95,
    description: 'Electric discharge crackling across the target, preventing reactions.',
    iconName: 'zap',
    badgeColor: 'text-blue-400 bg-blue-950/70 border-blue-800/70',
    soundEffect: 'lightning',
    hasShockwave: false,
    proceduralStyle: 'electric_burst',
    tags: ['lightning', 'cantrip', 'touch', 'evocation']
  },
  {
    id: 'destructive_wave',
    name: 'Destructive Wave',
    label: 'Destructive Wave',
    level: 5,
    school: 'evocation',
    category: 'instant',
    shape: 'circle',
    defaultSizeFt: 30,
    color: 'rgba(244, 63, 94, 0.55)',
    secondaryColor: 'rgba(254, 240, 138, 0.95)',
    blendMode: 'lighter',
    isPersistent: false,
    defaultOpacity: 0.95,
    description: '30ft concussive shockwave of divine thunder and radiant or necrotic devastation.',
    iconName: 'wind',
    badgeColor: 'text-rose-400 bg-rose-950/70 border-rose-800/70',
    soundEffect: 'thunder',
    hasShockwave: true,
    proceduralStyle: 'shockwave_ring',
    tags: ['paladin', 'thunder', 'radiant', 'wave', 'evocation']
  },
  {
    id: 'guiding_bolt',
    name: 'Guiding Bolt',
    label: 'Guiding Bolt',
    level: 1,
    school: 'evocation',
    category: 'instant',
    shape: 'circle',
    defaultSizeFt: 5,
    color: 'rgba(250, 204, 21, 0.65)',
    secondaryColor: 'rgba(255, 255, 255, 0.95)',
    blendMode: 'lighter',
    isPersistent: false,
    defaultOpacity: 0.95,
    description: 'Flash of divine starlight granting advantage on the next attack roll.',
    iconName: 'sun',
    badgeColor: 'text-amber-400 bg-amber-950/70 border-amber-800/70',
    soundEffect: 'radiant_ray',
    hasShockwave: false,
    proceduralStyle: 'radiant_burst',
    tags: ['cleric', 'radiant', 'light', 'advantage']
  },
  {
    id: 'moonbeam',
    name: 'Moonbeam',
    label: 'Moonbeam',
    level: 2,
    school: 'evocation',
    category: 'persistent',
    shape: 'circle',
    defaultSizeFt: 5,
    color: 'rgba(186, 230, 253, 0.5)',
    secondaryColor: 'rgba(255, 255, 255, 0.9)',
    blendMode: 'screen',
    isPersistent: true,
    defaultOpacity: 0.85,
    description: '5ft radius cylinder of silvery, ghostly radiant moonlight descending from above.',
    iconName: 'moon',
    badgeColor: 'text-sky-300 bg-sky-950/70 border-sky-800/70',
    soundEffect: 'radiant_ray',
    hasShockwave: false,
    proceduralStyle: 'moonbeam_cylinder',
    tags: ['druid', 'radiant', 'shapechanger', 'moon']
  },

  // =========================================================================
  // 2. CONJURATION & PERSISTENT AoE (Spirits, Clouds, Portals)
  // =========================================================================
  {
    id: 'spirit_guardians',
    name: 'Spirit Guardians',
    label: 'Spirit Guardians',
    level: 3,
    school: 'conjuration',
    category: 'persistent',
    shape: 'circle',
    defaultSizeFt: 15,
    color: 'rgba(250, 204, 21, 0.45)',
    secondaryColor: 'rgba(56, 189, 248, 0.85)',
    blendMode: 'screen',
    isPersistent: true,
    defaultOpacity: 0.85,
    description: '15ft celestial sanctuary with orbiting radiant seraphs and sacred protective runes.',
    iconName: 'sun',
    badgeColor: 'text-amber-300 bg-amber-950/70 border-amber-700/70',
    soundEffect: 'divine_chime',
    hasShockwave: false,
    proceduralStyle: 'spirit_guardians',
    tags: ['cleric', 'radiant', 'aura', 'ward', 'spirits']
  },
  {
    id: 'fog_cloud',
    name: 'Fog Cloud',
    label: 'Fog Cloud',
    level: 1,
    school: 'conjuration',
    category: 'persistent',
    shape: 'circle',
    defaultSizeFt: 20,
    color: 'rgba(203, 213, 225, 0.45)',
    secondaryColor: 'rgba(241, 245, 249, 0.7)',
    blendMode: 'screen',
    isPersistent: true,
    defaultOpacity: 0.85,
    description: '20ft radius sphere of dense swirling white mist heavily obscuring the area.',
    iconName: 'cloud',
    badgeColor: 'text-slate-300 bg-slate-900/80 border-slate-700',
    soundEffect: 'whoosh',
    hasShockwave: false,
    proceduralStyle: 'fog_cloud',
    tags: ['fog', 'mist', 'obscurement', 'vision']
  },
  {
    id: 'poison_cloud',
    name: 'Poison Cloud / Cloudkill',
    label: 'Poison Cloud',
    level: 5,
    school: 'conjuration',
    category: 'persistent',
    shape: 'circle',
    defaultSizeFt: 20,
    color: 'rgba(34, 197, 94, 0.45)',
    secondaryColor: 'rgba(163, 230, 53, 0.8)',
    blendMode: 'screen',
    isPersistent: true,
    defaultOpacity: 0.85,
    description: '20ft radius billowing sphere of virulent green toxic vapors rolling along the ground.',
    iconName: 'droplets',
    badgeColor: 'text-emerald-400 bg-emerald-950/70 border-emerald-800/70',
    soundEffect: 'acid_sizzle',
    hasShockwave: false,
    proceduralStyle: 'poison_cloud',
    tags: ['poison', 'toxic', 'gas', 'cloudkill']
  },
  {
    id: 'arcane_gate',
    name: 'Arcane Portal / Gate',
    label: 'Arcane Portal',
    level: 6,
    school: 'conjuration',
    category: 'persistent',
    shape: 'circle',
    defaultSizeFt: 10,
    color: 'rgba(168, 85, 247, 0.5)',
    secondaryColor: 'rgba(236, 72, 153, 0.85)',
    blendMode: 'screen',
    isPersistent: true,
    defaultOpacity: 0.9,
    description: 'Swirling astral gateway connecting two distant points with shimmering dimensional energy.',
    iconName: 'eye',
    badgeColor: 'text-fuchsia-400 bg-fuchsia-950/70 border-fuchsia-800/70',
    soundEffect: 'teleport',
    hasShockwave: false,
    proceduralStyle: 'astral_portal',
    tags: ['portal', 'teleport', 'conjuration', 'astral']
  },
  {
    id: 'stinking_cloud',
    name: 'Stinking Cloud',
    label: 'Stinking Cloud',
    level: 3,
    school: 'conjuration',
    category: 'persistent',
    shape: 'circle',
    defaultSizeFt: 20,
    color: 'rgba(234, 179, 8, 0.45)',
    secondaryColor: 'rgba(163, 230, 53, 0.75)',
    blendMode: 'screen',
    isPersistent: true,
    defaultOpacity: 0.85,
    description: '20ft radius sphere of retching yellowish vapors inducing acute nausea.',
    iconName: 'cloud',
    badgeColor: 'text-yellow-400 bg-yellow-950/70 border-yellow-800/70',
    soundEffect: 'whoosh',
    hasShockwave: false,
    proceduralStyle: 'poison_cloud',
    tags: ['poison', 'nausea', 'gas', 'debuff']
  },
  {
    id: 'web',
    name: 'Web',
    label: 'Web',
    level: 2,
    school: 'conjuration',
    category: 'persistent',
    shape: 'circle',
    defaultSizeFt: 20,
    color: 'rgba(226, 232, 240, 0.45)',
    secondaryColor: 'rgba(148, 163, 184, 0.8)',
    blendMode: 'normal',
    isPersistent: true,
    defaultOpacity: 0.85,
    description: '20ft mass of thick, sticky webbing restraining creatures that step within.',
    iconName: 'sparkles',
    badgeColor: 'text-zinc-300 bg-zinc-900 border-zinc-700',
    soundEffect: 'whoosh',
    hasShockwave: false,
    proceduralStyle: 'web_cluster',
    tags: ['restrain', 'sticky', 'control', 'terrain']
  },

  // =========================================================================
  // 3. ABJURATION & DIVINE WARDS (Shields, Healing, Protection)
  // =========================================================================
  {
    id: 'shield',
    name: 'Shield',
    label: 'Shield',
    level: 1,
    school: 'abjuration',
    category: 'instant',
    shape: 'circle',
    defaultSizeFt: 5,
    color: 'rgba(56, 189, 248, 0.6)',
    secondaryColor: 'rgba(255, 255, 255, 0.95)',
    blendMode: 'screen',
    isPersistent: false,
    defaultOpacity: 0.9,
    description: 'Invisible or luminous barrier of magical force intercepting incoming attacks (+5 AC).',
    iconName: 'shield',
    badgeColor: 'text-sky-400 bg-sky-950/70 border-sky-800/70',
    soundEffect: 'shield_clash',
    hasShockwave: false,
    proceduralStyle: 'hex_shield',
    tags: ['ac', 'abjuration', 'defense', 'reaction']
  },
  {
    id: 'cure_wounds',
    name: 'Cure Wounds / Healing Word',
    label: 'Cure Wounds',
    level: 1,
    school: 'abjuration',
    category: 'instant',
    shape: 'circle',
    defaultSizeFt: 5,
    color: 'rgba(52, 211, 153, 0.65)',
    secondaryColor: 'rgba(254, 240, 138, 0.95)',
    blendMode: 'lighter',
    isPersistent: false,
    defaultOpacity: 0.95,
    description: 'Pillar of comforting verdant healing light revitalizing the wounded creature.',
    iconName: 'sparkles',
    badgeColor: 'text-emerald-400 bg-emerald-950/70 border-emerald-800/70',
    soundEffect: 'divine_chime',
    hasShockwave: false,
    proceduralStyle: 'healing_bloom',
    tags: ['healing', 'cleric', 'druid', 'restoration']
  },
  {
    id: 'beacon_of_hope',
    name: 'Beacon of Hope',
    label: 'Beacon of Hope',
    level: 3,
    school: 'abjuration',
    category: 'persistent',
    shape: 'circle',
    defaultSizeFt: 30,
    color: 'rgba(250, 204, 21, 0.45)',
    secondaryColor: 'rgba(255, 255, 255, 0.9)',
    blendMode: 'screen',
    isPersistent: true,
    defaultOpacity: 0.8,
    description: '30ft radiant aura bestowing advantage on WIS saves, death saves, and maximum healing.',
    iconName: 'sun',
    badgeColor: 'text-amber-400 bg-amber-950/70 border-amber-800/70',
    soundEffect: 'divine_chime',
    hasShockwave: false,
    proceduralStyle: 'beacon_aura',
    tags: ['cleric', 'buff', 'hope', 'healing']
  },
  {
    id: 'sanctuary',
    name: 'Sanctuary',
    label: 'Sanctuary',
    level: 1,
    school: 'abjuration',
    category: 'persistent',
    shape: 'circle',
    defaultSizeFt: 5,
    color: 'rgba(244, 244, 245, 0.55)',
    secondaryColor: 'rgba(250, 204, 21, 0.85)',
    blendMode: 'screen',
    isPersistent: true,
    defaultOpacity: 0.85,
    description: 'Protective ward forcing would-be attackers to make a Wisdom save before striking.',
    iconName: 'shield',
    badgeColor: 'text-zinc-200 bg-zinc-900 border-zinc-700',
    soundEffect: 'shield_clash',
    hasShockwave: false,
    proceduralStyle: 'hex_shield',
    tags: ['ward', 'cleric', 'protection', 'abjuration']
  },

  // =========================================================================
  // 4. NECROMANCY & SHADOW MAGIC (Darkness, Void, Decay)
  // =========================================================================
  {
    id: 'darkness',
    name: 'Darkness',
    label: 'Darkness',
    level: 2,
    school: 'necromancy',
    category: 'persistent',
    shape: 'circle',
    defaultSizeFt: 15,
    color: 'rgba(9, 9, 11, 0.88)',
    secondaryColor: 'rgba(88, 28, 135, 0.6)',
    blendMode: 'normal',
    isPersistent: true,
    defaultOpacity: 0.94,
    description: '15ft sphere of impenetrable magical darkness smothering all normal and darkvision.',
    iconName: 'moon',
    badgeColor: 'text-zinc-400 bg-zinc-950 border-zinc-800',
    soundEffect: 'dark_void',
    hasShockwave: false,
    proceduralStyle: 'darkness_sphere',
    tags: ['darkness', 'shadow', 'void', 'blindness']
  },
  {
    id: 'shadow_grasp',
    name: 'Shadow Grasp / Arms of Hadar',
    label: 'Shadow Grasp',
    level: 1,
    school: 'necromancy',
    category: 'instant',
    shape: 'circle',
    defaultSizeFt: 10,
    color: 'rgba(79, 70, 229, 0.55)',
    secondaryColor: 'rgba(15, 23, 42, 0.95)',
    blendMode: 'screen',
    isPersistent: false,
    defaultOpacity: 0.9,
    description: 'Writhing Netherese shadow tendrils bursting from the floor to snare surrounding targets.',
    iconName: 'skull',
    badgeColor: 'text-indigo-400 bg-indigo-950/70 border-indigo-800/70',
    soundEffect: 'dark_void',
    hasShockwave: false,
    proceduralStyle: 'shadow_tentacles',
    tags: ['necrotic', 'warlock', 'tendrils', 'snare']
  },

  // =========================================================================
  // 5. ENCHANTMENT & ILLUSION (Mental Magic, Mesmerism, Faerie Lights)
  // =========================================================================
  {
    id: 'hypnotic_pattern',
    name: 'Hypnotic Pattern',
    label: 'Hypnotic Pattern',
    level: 3,
    school: 'illusion',
    category: 'instant',
    shape: 'circle',
    defaultSizeFt: 15,
    color: 'rgba(236, 72, 153, 0.55)',
    secondaryColor: 'rgba(56, 189, 248, 0.85)',
    blendMode: 'screen',
    isPersistent: false,
    defaultOpacity: 0.95,
    description: 'Twisting kaleidoscopic tapestry of mesmerizing colors incapacitating creatures that see it.',
    iconName: 'sparkles',
    badgeColor: 'text-pink-400 bg-pink-950/70 border-pink-800/70',
    soundEffect: 'divine_chime',
    hasShockwave: true,
    proceduralStyle: 'kaleidoscope_burst',
    tags: ['charm', 'incapacitate', 'illusion', 'bard']
  },
  {
    id: 'faerie_fire',
    name: 'Faerie Fire',
    label: 'Faerie Fire',
    level: 1,
    school: 'evocation',
    category: 'persistent',
    shape: 'circle',
    defaultSizeFt: 10,
    color: 'rgba(244, 114, 182, 0.5)',
    secondaryColor: 'rgba(192, 132, 252, 0.85)',
    blendMode: 'screen',
    isPersistent: true,
    defaultOpacity: 0.85,
    description: '10ft shower of neon glimmering light outlining creatures to grant attack advantage.',
    iconName: 'sparkles',
    badgeColor: 'text-fuchsia-400 bg-fuchsia-950/70 border-fuchsia-800/70',
    soundEffect: 'radiant_ray',
    hasShockwave: false,
    proceduralStyle: 'glimmer_aura',
    tags: ['advantage', 'outline', 'invisibility', 'druid']
  },

  // =========================================================================
  // 6. ENVIRONMENTAL HAZARDS (Lava, Acid, Blizzards)
  // =========================================================================
  {
    id: 'acid_pool',
    name: 'Acid Pool',
    label: 'Acid Pool',
    level: 0,
    school: 'environmental',
    category: 'hazard',
    shape: 'circle',
    defaultSizeFt: 15,
    color: 'rgba(132, 204, 22, 0.5)',
    secondaryColor: 'rgba(234, 179, 8, 0.85)',
    blendMode: 'screen',
    isPersistent: true,
    defaultOpacity: 0.85,
    description: 'Caustic bubbling pool of glowing acid vitriol dissolving flesh and equipment.',
    iconName: 'droplets',
    badgeColor: 'text-lime-400 bg-lime-950/70 border-lime-800/70',
    soundEffect: 'acid_sizzle',
    hasShockwave: false,
    proceduralStyle: 'acid_pool',
    tags: ['acid', 'hazard', 'pool', 'environmental']
  },
  {
    id: 'lava_pool',
    name: 'Molten Lava Pit',
    label: 'Molten Lava',
    level: 0,
    school: 'environmental',
    category: 'hazard',
    shape: 'circle',
    defaultSizeFt: 15,
    color: 'rgba(239, 68, 68, 0.65)',
    secondaryColor: 'rgba(251, 146, 60, 0.95)',
    blendMode: 'lighter',
    isPersistent: true,
    defaultOpacity: 0.9,
    description: 'Searing lake of incandescent molten rock erupting with sparks and smoke.',
    iconName: 'flame',
    badgeColor: 'text-orange-400 bg-orange-950/70 border-orange-800/70',
    soundEffect: 'explosion',
    hasShockwave: false,
    proceduralStyle: 'lava_pit',
    tags: ['lava', 'fire', 'hazard', 'magma']
  }
];

// Enrich with Jules & Ben's Animated Assets (JB2A) wherever available
const ENRICHED_SPECIAL_EFFECTS: SpecialEffectDefinition[] = RAW_SPECIAL_EFFECTS.map(s => {
  const jb = findJb2aAsset(s.id) || findJb2aAsset(s.name) || findJb2aAsset(s.label);
  if (jb) {
    return {
      ...s,
      videoUrl: jb.webm,
      loopVideoUrl: jb.loopWebm,
      thumbUrl: jb.thumb,
      jb2aId: jb.id,
      shape: jb.shape || s.shape,
      defaultSizeFt: jb.defaultSizeFt || s.defaultSizeFt
    };
  }
  return s;
});

// Append any additional JB2A animated assets to special effects database
for (const jb of JB2A_DATABASE) {
  const exists = ENRICHED_SPECIAL_EFFECTS.some(
    e => e.id === jb.id || e.name.toLowerCase() === jb.name.toLowerCase()
  );
  if (!exists) {
    ENRICHED_SPECIAL_EFFECTS.push({
      id: jb.id,
      name: jb.name,
      label: jb.label,
      level: jb.level,
      school: (jb.school as any) || 'evocation',
      category: jb.isPersistent ? 'persistent' : 'instant',
      shape: jb.shape,
      defaultSizeFt: jb.defaultSizeFt,
      color: jb.color,
      blendMode: jb.blendMode || 'screen',
      isPersistent: jb.isPersistent,
      defaultOpacity: 0.95,
      description: jb.description,
      iconName: (jb.tags.includes('fire') ? 'flame' : jb.tags.includes('frost') ? 'snowflake' : jb.tags.includes('lightning') ? 'zap' : 'sparkles') as any,
      badgeColor: 'text-purple-400 bg-purple-950/70 border-purple-800/70',
      soundEffect: (jb.soundEffect as any) || 'whoosh',
      hasShockwave: !jb.isPersistent,
      proceduralStyle: jb.id,
      tags: jb.tags,
      videoUrl: jb.webm,
      loopVideoUrl: jb.loopWebm,
      thumbUrl: jb.thumb,
      jb2aId: jb.id
    });
  }
}

export const SPECIAL_EFFECTS_DATABASE: SpecialEffectDefinition[] = ENRICHED_SPECIAL_EFFECTS;

/** Helper to find a spell definition by ID or fallback search */
export function getSpecialEffectDefinition(idOrName: string): SpecialEffectDefinition | undefined {
  if (!idOrName) return undefined;
  const lower = idOrName.toLowerCase().trim();
  return (
    SPECIAL_EFFECTS_DATABASE.find(s => s.id === lower) ||
    SPECIAL_EFFECTS_DATABASE.find(s => s.name.toLowerCase() === lower) ||
    SPECIAL_EFFECTS_DATABASE.find(s => s.label.toLowerCase() === lower) ||
    SPECIAL_EFFECTS_DATABASE.find(s => lower.includes(s.id) || s.id.includes(lower))
  );
}
