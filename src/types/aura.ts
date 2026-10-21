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
    id: 'shield_of_faith',
    name: 'Shield of Faith',
    radius: 5,
    color: 'rgba(250, 204, 21, 0.45)',
    opacity: 0.5,
    description: '+2 AC shimmering holy shield ward (5 ft)',
    videoUrl: '/jb2a/Library/1st_Level/Shield/Shield_01_Regular_Blue_Complete_400x400.webm'
  },
  {
    id: 'sanctuary',
    name: 'Sanctuary Ward',
    radius: 5,
    color: 'rgba(168, 85, 247, 0.45)',
    opacity: 0.5,
    description: 'Protective ward redirecting attacks (5 ft)',
    videoUrl: '/jb2a/Library/Generic/Template/Circle/TemplateRunesCircle_01_Regular_Orange_800x800.webm'
  },
  {
    id: 'paladin_prot',
    name: 'Aura of Protection',
    radius: 10,
    color: 'rgba(234, 179, 8, 0.4)',
    opacity: 0.35,
    description: '+Cha to all saving throws (10 ft)',
    videoUrl: '/jb2a/Library/Generic/Template/Circle/TemplateRunesCircle_01_Regular_Orange_800x800.webm'
  },
  {
    id: 'spirit_guardians',
    name: 'Spirit Guardians',
    radius: 15,
    color: 'rgba(59, 130, 246, 0.4)',
    opacity: 0.35,
    description: 'Halves speed, 3d8 radiant/necrotic (15 ft)',
    videoUrl: '/jb2a/Library/3rd_Level/Spirit_Guardians/SpiritGuardians_01_Regular_Blue_600x600.webm'
  },
  {
    id: 'twilight_sanctuary',
    name: 'Twilight Sanctuary',
    radius: 30,
    color: 'rgba(147, 51, 234, 0.35)',
    opacity: 0.35,
    description: '1d6+Level temp HP or end charm/fear (30 ft)',
    videoUrl: '/jb2a/Library/Generic/Creature/FairiesLoop01_01_Regular_BluePurple_600x600.webm'
  },
  {
    id: 'aura_of_life',
    name: 'Aura of Life / Healing',
    radius: 30,
    color: 'rgba(34, 197, 94, 0.4)',
    opacity: 0.35,
    description: 'Necrotic resistance & regain 1 HP at 0 (30 ft)',
    videoUrl: '/jb2a/Library/Generic/Template/Circle/Aura/AuraThemedOrbitLoopNature01_01_Regular_Green_700x700.webm'
  },
  {
    id: 'crusaders_mantle',
    name: "Crusader's Mantle",
    radius: 30,
    color: 'rgba(245, 158, 11, 0.4)',
    opacity: 0.35,
    description: '+1d4 radiant damage on weapon attacks (30 ft)',
    videoUrl: '/jb2a/Library/Generic/Template/Circle/TemplateRunesCircle_01_Regular_Orange_800x800.webm'
  },
  {
    id: 'aura_of_courage',
    name: 'Aura of Courage',
    radius: 10,
    color: 'rgba(251, 191, 36, 0.4)',
    opacity: 0.35,
    description: 'Immunity to frightened condition (10 ft)',
    videoUrl: '/jb2a/Library/Generic/Template/Circle/TemplateRunesCircle_01_Regular_Orange_800x800.webm'
  },
  {
    id: 'frost_rime',
    name: 'Frost & Rime Aura',
    radius: 15,
    color: 'rgba(6, 182, 212, 0.4)',
    opacity: 0.35,
    description: 'Freezing cold hazardous aura (15 ft)',
    videoUrl: '/jb2a/Library/Generic/Template/Circle/Aura/AuraThemedOrbitLoopCold01_01_Regular_Blue_700x700.webm'
  },
  {
    id: 'aura_of_dread',
    name: 'Aura of Hate & Dread',
    radius: 10,
    color: 'rgba(239, 68, 68, 0.4)',
    opacity: 0.35,
    description: '+Cha to fiend/undead damage (10 ft)',
    videoUrl: '/jb2a/Library/2nd_Level/Darkness/Darkness_01_Regular_Black_600x600.webm'
  },
  {
    id: 'faerie_glow',
    name: 'Faerie Fire / Fey Glow',
    radius: 10,
    color: 'rgba(236, 72, 153, 0.4)',
    opacity: 0.35,
    description: 'Luminescent fey outlining aura (10 ft)',
    videoUrl: '/jb2a/Library/Generic/Creature/FairiesLoop01_01_Regular_BluePurple_600x600.webm'
  },
  {
    id: 'darkness_sphere',
    name: 'Silence & Darkness Void',
    radius: 15,
    color: 'rgba(100, 116, 139, 0.5)',
    opacity: 0.45,
    description: 'Void field blocking sound or light (15 ft)',
    videoUrl: '/jb2a/Library/2nd_Level/Darkness/Darkness_01_Regular_Black_600x600.webm'
  },
  {
    id: 'cloak_of_flies',
    name: 'Cloak of Flies',
    radius: 5,
    color: 'rgba(132, 204, 22, 0.45)',
    opacity: 0.4,
    description: 'Poison damage & intimidation aura (5 ft)',
    videoUrl: '/jb2a/Library/Generic/Template/Circle/TemplatePoisonCircle_01_Dark_Green_800x800.webm'
  },
  {
    id: 'fire_shield',
    name: 'Fire Shield / Flame Body',
    radius: 5,
    color: 'rgba(249, 115, 22, 0.45)',
    opacity: 0.45,
    description: 'Wreathing flames damaging melee attackers (5 ft)',
    videoUrl: '/jb2a/Library/Generic/Fire/ShieldFireAbove01_01_Regular_Orange_400x400.webm'
  }
];

export const AURA_COLOR_PALETTE = [
  { name: 'Radiant Gold', color: 'rgba(234, 179, 8, 0.4)' },
  { name: 'Emerald Vitality', color: 'rgba(34, 197, 94, 0.4)' },
  { name: 'Celestial Blue', color: 'rgba(59, 130, 246, 0.4)' },
  { name: 'Arcane Purple', color: 'rgba(168, 85, 247, 0.4)' },
  { name: 'Crimson Fury', color: 'rgba(239, 68, 68, 0.4)' },
  { name: 'Glacial Frost', color: 'rgba(6, 182, 212, 0.4)' },
  { name: 'Solar Flame', color: 'rgba(249, 115, 22, 0.4)' },
  { name: 'Fey Magenta', color: 'rgba(236, 72, 153, 0.4)' },
  { name: 'Astral Silver', color: 'rgba(241, 245, 249, 0.45)' },
  { name: 'Shadow Void', color: 'rgba(100, 116, 139, 0.5)' }
];
