export interface TokenAura {
  id?: string;
  name?: string;
  radius: number; // in feet (e.g. 5, 10, 15, 20, 30, 60)
  color: string; // rgba or hex
  opacity?: number;
  pulse?: boolean;
  videoUrl?: string; // Transparent animated WebM for this aura
}

export interface AuraPreset {
  id: string;
  name: string;
  radius: number; // in feet
  color: string;
  opacity?: number;
  description?: string;
  videoUrl?: string; // Transparent animated WebM for this aura
}

export const AURA_PRESETS: AuraPreset[] = [
  {
    id: 'spirit_guardians',
    name: 'Spirit Guardians',
    radius: 15,
    color: 'rgba(59, 130, 246, 0.4)',
    opacity: 0.9,
    description: 'Halves speed, 3d8 radiant/necrotic (15 ft)',
    videoUrl: '/jb2a/Library/3rd_Level/Spirit_Guardians/SpiritGuardians_01_Light_BlueYellow_600x600.webm'
  },
  {
    id: 'aura_of_life',
    name: 'Aura of Life',
    radius: 30,
    color: 'rgba(34, 197, 94, 0.4)',
    opacity: 0.9,
    description: 'Necrotic resistance & regain 1 HP at 0 (30 ft)',
    videoUrl: '/jb2a/Community/JAA/auraOfLife.webm'
  },
  {
    id: 'aura_of_vitality',
    name: 'Aura of Vitality',
    radius: 30,
    color: 'rgba(16, 185, 129, 0.4)',
    opacity: 0.9,
    description: 'Heal 2d6 as bonus action each turn (30 ft)',
    videoUrl: '/jb2a/Community/JAA/AuraofVitality.webm'
  },
  {
    id: 'paladin_prot',
    name: 'Aura of Protection',
    radius: 10,
    color: 'rgba(234, 179, 8, 0.45)',
    opacity: 0.9,
    description: '+Cha to all saving throws (10 ft)',
    videoUrl: '/jb2a/Community/JackKerouac/lathander_symbol_CIRCLE_01.webm'
  },
  {
    id: 'aura_of_courage',
    name: 'Aura of Courage',
    radius: 10,
    color: 'rgba(251, 191, 36, 0.4)',
    opacity: 0.9,
    description: 'Immunity to frightened condition (10 ft)',
    videoUrl: '/jb2a/Community/JackKerouac/magic_circle_CIRCLE_01.webm'
  },
  {
    id: 'crusaders_mantle',
    name: "Crusader's Mantle",
    radius: 30,
    color: 'rgba(245, 158, 11, 0.4)',
    opacity: 0.9,
    description: '+1d4 radiant damage on weapon attacks (30 ft)',
    videoUrl: '/jb2a/Library/Generic/Template/Circle/TemplateRunesCircle_01_Regular_Orange_800x800.webm'
  },
  {
    id: 'bless_aura',
    name: 'Bless',
    radius: 5,
    color: 'rgba(250, 204, 21, 0.45)',
    opacity: 0.9,
    description: '+1d4 to attack rolls and saving throws (5 ft)',
    videoUrl: '/jb2a/Library/1st_Level/Bless/Bless_01_Regular_Yellow_Loop_200x200.webm'
  },
  {
    id: 'hunters_mark_aura',
    name: "Hunter's Mark",
    radius: 5,
    color: 'rgba(34, 197, 94, 0.45)',
    opacity: 0.9,
    description: '+1d6 quarry damage & tracking mark (5 ft)',
    videoUrl: '/jb2a/Library/1st_Level/Hunters_Mark/HuntersMark_01_Regular_Green_Loop_200x200.webm'
  },
  {
    id: 'antilife_shell',
    name: 'Antilife Shell',
    radius: 10,
    color: 'rgba(56, 189, 248, 0.45)',
    opacity: 0.9,
    description: 'Barrier hedges out living creatures (10 ft)',
    videoUrl: '/jb2a/Library/5th_Level/Antilife_Shell/AntilifeShell_01_Blue_Circle_400x400.webm'
  },
  {
    id: 'globe_of_invulnerability',
    name: 'Globe of Invulnerability / Force Sphere',
    radius: 10,
    color: 'rgba(226, 232, 240, 0.45)',
    opacity: 0.9,
    description: 'Shimmering force barrier blocking spells (10 ft)',
    videoUrl: '/jb2a/Library/5th_Level/Wall_Of_Force/WallOfForce_01_Grey_Sphere_400x400.webm'
  },
  {
    id: 'frost_rime',
    name: 'Frost & Rime Aura',
    radius: 15,
    color: 'rgba(6, 182, 212, 0.45)',
    opacity: 0.9,
    description: 'Swirling icy blizzard aura (15 ft)',
    videoUrl: '/jb2a/Library/Generic/Template/Circle/Aura/AuraThemedOrbitLoopCold01_01_Regular_Blue_700x700.webm'
  },
  {
    id: 'ice_shield',
    name: 'Armor of Agathys / Ice Barrier',
    radius: 5,
    color: 'rgba(147, 197, 253, 0.5)',
    opacity: 0.9,
    description: 'Rotating glacial ice shields warding caster (5 ft)',
    videoUrl: '/jb2a/Community/JackKerouac/ice_shield_rotating_SQUARE_01.webm'
  },
  {
    id: 'nature_bloom',
    name: 'Verdant Nature Orbit',
    radius: 15,
    color: 'rgba(34, 197, 94, 0.4)',
    opacity: 0.9,
    description: 'Orbiting nature flora & healing winds (15 ft)',
    videoUrl: '/jb2a/Library/Generic/Template/Circle/Aura/AuraThemedOrbitLoopNature01_01_Regular_Green_700x700.webm'
  },
  {
    id: 'plant_growth',
    name: 'Entangling Overgrowth',
    radius: 20,
    color: 'rgba(22, 101, 52, 0.45)',
    opacity: 0.9,
    description: 'Thick grasping vines and briars on the ground (20 ft)',
    videoUrl: '/jb2a/Library/1st_Level/Entangle/EntangleLoop02_02_Regular_Green_500x500.webm'
  },
  {
    id: 'twilight_sanctuary',
    name: 'Twilight Sanctuary / Faerie Glow',
    radius: 30,
    color: 'rgba(147, 51, 234, 0.4)',
    opacity: 0.9,
    description: 'Swirling luminescent twilight fey spirits (30 ft)',
    videoUrl: '/jb2a/Library/Generic/Creature/FairiesLoop01_01_Regular_BluePurple_600x600.webm'
  },
  {
    id: 'detect_magic_aura',
    name: 'Detect Magic Field',
    radius: 30,
    color: 'rgba(96, 165, 250, 0.4)',
    opacity: 0.9,
    description: 'Pulsing arcane detection sphere (30 ft)',
    videoUrl: '/jb2a/Library/1st_Level/Detect_Magic/DetectMagicCircle_01_Regular_Blue_1200x1200.webm'
  },
  {
    id: 'darkness_sphere',
    name: 'Darkness / Void Sphere',
    radius: 15,
    color: 'rgba(30, 41, 59, 0.6)',
    opacity: 0.9,
    description: 'Pitch-black magical darkness void (15 ft)',
    videoUrl: '/jb2a/Library/2nd_Level/Darkness/Darkness_01_Black_600x600.webm'
  },
  {
    id: 'fog_cloud_aura',
    name: 'Fog Cloud',
    radius: 20,
    color: 'rgba(226, 232, 240, 0.5)',
    opacity: 0.9,
    description: 'Heavily obscured dense mist sphere (20 ft)',
    videoUrl: '/jb2a/Library/1st_Level/Fog_Cloud/FogCloud_01_White_800x800.webm'
  },
  {
    id: 'fire_shield',
    name: 'Fire Shield / Flame Ward',
    radius: 5,
    color: 'rgba(249, 115, 22, 0.5)',
    opacity: 0.9,
    description: 'Wreathing flames damaging melee attackers (5 ft)',
    videoUrl: '/jb2a/Library/Generic/Fire/ShieldFireAbove01_01_Regular_Orange_400x400.webm'
  },
  {
    id: 'wall_of_fire_ring',
    name: 'Wall of Fire Ring',
    radius: 10,
    color: 'rgba(59, 130, 246, 0.5)',
    opacity: 0.9,
    description: 'Blazing ring of blue arcane fire (10 ft)',
    videoUrl: '/jb2a/Library/4th_Level/Wall_Of_Fire/WallOfFire_01_Blue_Ring_400x400.webm'
  },
  {
    id: 'shield_of_faith',
    name: 'Shield of Faith',
    radius: 5,
    color: 'rgba(250, 204, 21, 0.45)',
    opacity: 0.9,
    description: '+2 AC shimmering holy shield ward (5 ft)',
    videoUrl: '/jb2a/Library/1st_Level/Shield/Shield_01_Regular_Blue_Complete_400x400.webm'
  },
  {
    id: 'sanctuary',
    name: 'Sanctuary Runes',
    radius: 5,
    color: 'rgba(168, 85, 247, 0.45)',
    opacity: 0.9,
    description: 'Protective ward redirecting attacks (5 ft)',
    videoUrl: '/jb2a/Community/JackKerouac/runes_CIRCLE_02.webm'
  },
  {
    id: 'glyph_warding',
    name: 'Glyph of Warding Field',
    radius: 10,
    color: 'rgba(217, 70, 239, 0.45)',
    opacity: 0.9,
    description: 'Magical containment rune circle (10 ft)',
    videoUrl: '/jb2a/Community/JAA/glyphOfWarding.webm'
  },
  {
    id: 'tiny_hut',
    name: "Leomund's Tiny Hut",
    radius: 10,
    color: 'rgba(129, 140, 248, 0.45)',
    opacity: 0.9,
    description: 'Impenetrable protective dome (10 ft)',
    videoUrl: '/jb2a/Community/JAA/LeomundsTinyHut.0.webm'
  },
  {
    id: 'cloak_of_flies',
    name: 'Cloak of Flies / Swarm',
    radius: 5,
    color: 'rgba(132, 204, 22, 0.45)',
    opacity: 0.9,
    description: 'Buzzing insect swarm dealing poison (5 ft)',
    videoUrl: '/jb2a/Community/JAA/InsectPlague.0.webm'
  },
  {
    id: 'circle_of_death',
    name: 'Circle of Death Aura',
    radius: 30,
    color: 'rgba(147, 51, 234, 0.5)',
    opacity: 0.9,
    description: 'Swirling negative necrotic energy sphere (30 ft)',
    videoUrl: '/jb2a/Community/JAA/circleOfDeath.webm'
  },
  {
    id: 'cloudkill_aura',
    name: 'Cloudkill Poison Sphere',
    radius: 20,
    color: 'rgba(34, 197, 94, 0.5)',
    opacity: 0.9,
    description: 'Rolling poisonous yellow-green vapors (20 ft)',
    videoUrl: '/jb2a/Community/JAA/cloudKill.webm'
  },
  {
    id: 'blade_barrier_aura',
    name: 'Blade Barrier Vortex',
    radius: 15,
    color: 'rgba(148, 163, 184, 0.5)',
    opacity: 0.9,
    description: 'Whirling wall of razor-sharp spinning blades (15 ft)',
    videoUrl: '/jb2a/Community/JAA/bladeBarrier.webm'
  },
  {
    id: 'cloud_of_daggers_aura',
    name: 'Cloud of Daggers',
    radius: 5,
    color: 'rgba(56, 189, 248, 0.5)',
    opacity: 0.9,
    description: 'Spinning spectral daggers in a 5 ft cube (5 ft)',
    videoUrl: '/jb2a/Library/2nd_Level/Cloud_Of_Daggers/CloudOfDaggers_01_Light_Blue_400x400.webm'
  },
  {
    id: 'arms_of_hadar_aura',
    name: 'Arms of Hadar / Black Tentacles',
    radius: 10,
    color: 'rgba(126, 34, 206, 0.5)',
    opacity: 0.9,
    description: 'Writhing dark void tendrils erupting around caster (10 ft)',
    videoUrl: '/jb2a/Library/4th_Level/Black_Tentacles/BlackTentacles_01_Dark_Purple_600x600.webm'
  },
  {
    id: 'whirlwind_aura',
    name: 'Whirlwind / Elemental Cyclone',
    radius: 10,
    color: 'rgba(148, 163, 184, 0.5)',
    opacity: 0.9,
    description: 'Howling vortex of elemental wind (10 ft)',
    videoUrl: '/jb2a/Library/7th_Level/Whirlwind/Whirlwind_01_BlueGrey_01_400x400.webm'
  }
];

export const AURA_COLOR_PALETTE = [
  { name: 'Radiant Gold', color: 'rgba(234, 179, 8, 0.4)', videoUrl: '/jb2a/Library/Generic/Template/Circle/TemplateRunesCircle_01_Regular_Orange_800x800.webm' },
  { name: 'Emerald Vitality', color: 'rgba(34, 197, 94, 0.4)', videoUrl: '/jb2a/Library/Generic/Template/Circle/Aura/AuraThemedOrbitLoopNature01_01_Regular_Green_700x700.webm' },
  { name: 'Celestial Blue', color: 'rgba(59, 130, 246, 0.4)', videoUrl: '/jb2a/Library/3rd_Level/Spirit_Guardians/SpiritGuardians_01_Light_BlueYellow_600x600.webm' },
  { name: 'Arcane Purple', color: 'rgba(168, 85, 247, 0.4)', videoUrl: '/jb2a/Community/JackKerouac/runes_CIRCLE_02.webm' },
  { name: 'Crimson Fury', color: 'rgba(239, 68, 68, 0.4)', videoUrl: '/jb2a/Community/JAA/circleOfDeath.webm' },
  { name: 'Glacial Frost', color: 'rgba(6, 182, 212, 0.4)', videoUrl: '/jb2a/Library/Generic/Template/Circle/Aura/AuraThemedOrbitLoopCold01_01_Regular_Blue_700x700.webm' },
  { name: 'Solar Flame', color: 'rgba(249, 115, 22, 0.4)', videoUrl: '/jb2a/Library/Generic/Fire/ShieldFireAbove01_01_Regular_Orange_400x400.webm' },
  { name: 'Fey Magenta', color: 'rgba(236, 72, 153, 0.4)', videoUrl: '/jb2a/Library/Generic/Creature/FairiesLoop01_01_Regular_BluePurple_600x600.webm' },
  { name: 'Astral Silver', color: 'rgba(241, 245, 249, 0.45)', videoUrl: '/jb2a/Library/5th_Level/Wall_Of_Force/WallOfForce_01_Grey_Sphere_400x400.webm' },
  { name: 'Shadow Void', color: 'rgba(100, 116, 139, 0.5)', videoUrl: '/jb2a/Library/2nd_Level/Darkness/Darkness_01_Black_600x600.webm' }
];
