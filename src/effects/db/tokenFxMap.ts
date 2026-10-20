// src/effects/db/tokenFxMap.ts
// Direct animated visual effects mapping for D&D 5e Conditions and Token Auras
// Features authentic Jules and Ben's Animated Assets (JB2A) transparent WebM loops

export interface TokenConditionFx {
  condition: string;
  videoUrl: string;
  sizeMultiplier: number; // multiplier against token width
  yOffset: number; // normalized Y offset from token center (-0.2 for floating above head)
  opacity?: number;
}

export const CONDITION_FX_MAP: Record<string, TokenConditionFx> = {
  stunned: {
    condition: 'stunned',
    videoUrl: '/jb2a/Library/Generic/Conditions/Dizzy_Stars/DizzyStars_01_BlueOrange_400x400.webm',
    sizeMultiplier: 1.1,
    yOffset: -0.3,
    opacity: 0.95
  },
  incapacitated: {
    condition: 'incapacitated',
    videoUrl: '/jb2a/Library/Generic/Conditions/Dizzy_Stars/DizzyStars_01_BlueOrange_400x400.webm',
    sizeMultiplier: 1.1,
    yOffset: -0.3,
    opacity: 0.95
  },
  poisoned: {
    condition: 'poisoned',
    videoUrl: '/jb2a/Library/Generic/Template/Circle/TemplatePoisonCircle_01_Dark_Green_800x800.webm',
    sizeMultiplier: 1.35,
    yOffset: 0,
    opacity: 0.85
  },
  charmed: {
    condition: 'charmed',
    videoUrl: '/jb2a/Library/Generic/Template/Circle/TemplateHeartCircle_01_Regular_Pink_800x800.webm',
    sizeMultiplier: 1.25,
    yOffset: -0.15,
    opacity: 0.9
  },
  frightened: {
    condition: 'frightened',
    videoUrl: '/jb2a/Library/Generic/Template/Circle/TemplateFearCircle_01_Dark_Purple_800x800.webm',
    sizeMultiplier: 1.4,
    yOffset: 0,
    opacity: 0.85
  },
  paralyzed: {
    condition: 'paralyzed',
    videoUrl: '/jb2a/Library/Generic/Template/Circle/TemplateSnowflakeCircle_01_Regular_Blue_800x800.webm',
    sizeMultiplier: 1.35,
    yOffset: 0,
    opacity: 0.85
  },
  restrained: {
    condition: 'restrained',
    videoUrl: '/jb2a/Library/Generic/Template/Circle/TemplateSnowflakeCircle_01_Regular_Blue_800x800.webm',
    sizeMultiplier: 1.35,
    yOffset: 0,
    opacity: 0.85
  },
  petrified: {
    condition: 'petrified',
    videoUrl: '/jb2a/Library/Generic/Template/Circle/TemplateSnowflakeCircle_01_Regular_Blue_800x800.webm',
    sizeMultiplier: 1.35,
    yOffset: 0,
    opacity: 0.85
  },
  burning: {
    condition: 'burning',
    videoUrl: '/jb2a/Library/Generic/Fire/ShieldFireAbove01_01_Regular_Orange_400x400.webm',
    sizeMultiplier: 1.3,
    yOffset: 0,
    opacity: 0.9
  },
  fire: {
    condition: 'fire',
    videoUrl: '/jb2a/Library/Generic/Fire/ShieldFireAbove01_01_Regular_Orange_400x400.webm',
    sizeMultiplier: 1.3,
    yOffset: 0,
    opacity: 0.9
  },
  unconscious: {
    condition: 'unconscious',
    videoUrl: '/jb2a/Library/Generic/Template/Circle/TemplateSkullCircle_01_Regular_Purple_800x800.webm',
    sizeMultiplier: 1.3,
    yOffset: 0,
    opacity: 0.85
  },
  dead: {
    condition: 'dead',
    videoUrl: '/jb2a/Library/Generic/Template/Circle/TemplateSkullCircle_01_Regular_Purple_800x800.webm',
    sizeMultiplier: 1.3,
    yOffset: 0,
    opacity: 0.85
  },
  faerie_fire: {
    condition: 'faerie_fire',
    videoUrl: '/jb2a/Library/Generic/Butterflies/ButterfliesComplete01_01_Regular_BluePurple_600x600.webm',
    sizeMultiplier: 1.35,
    yOffset: 0,
    opacity: 0.9
  },
  faeriefire: {
    condition: 'faeriefire',
    videoUrl: '/jb2a/Library/Generic/Butterflies/ButterfliesComplete01_01_Regular_BluePurple_600x600.webm',
    sizeMultiplier: 1.35,
    yOffset: 0,
    opacity: 0.9
  },
  barkskin: {
    condition: 'barkskin',
    videoUrl: '/jb2a/Library/Generic/Nature/SwirlingLeavesComplete01_01_Regular_Green_400x400.webm',
    sizeMultiplier: 1.3,
    yOffset: 0,
    opacity: 0.9
  },
  light: {
    condition: 'light',
    videoUrl: '/jb2a/Library/Generic/Cast/GenericCast01_01_Regular_Yellow_400x400.webm',
    sizeMultiplier: 1.4,
    yOffset: 0,
    opacity: 0.95
  }
};

export function getConditionFx(conditionName: string): TokenConditionFx | null {
  if (!conditionName) return null;
  const key = conditionName.toLowerCase().trim();
  return CONDITION_FX_MAP[key] || null;
}

export function getAuraVideoUrl(name?: string, color?: string): string | null {
  if (!name && !color) return null;
  const n = (name || '').toLowerCase();

  if (n.includes('spirit') || n.includes('guardian')) {
    return '/jb2a/Library/3rd_Level/Spirit_Guardians/SpiritGuardians_01_Regular_Blue_600x600.webm';
  }
  if (n.includes('fire') || n.includes('flame')) {
    return '/jb2a/Library/Generic/Fire/ShieldFireAbove01_01_Regular_Orange_400x400.webm';
  }
  if (n.includes('frost') || n.includes('cold') || n.includes('rime')) {
    return '/jb2a/Library/Generic/Template/Circle/Aura/AuraThemedOrbitLoopCold01_01_Regular_Blue_700x700.webm';
  }
  if (n.includes('life') || n.includes('heal') || n.includes('nature')) {
    return '/jb2a/Library/Generic/Template/Circle/Aura/AuraThemedOrbitLoopNature01_01_Regular_Green_700x700.webm';
  }
  if (n.includes('darkness') || n.includes('void') || n.includes('shadow') || n.includes('dread')) {
    return '/jb2a/Library/2nd_Level/Darkness/Darkness_01_Regular_Black_600x600.webm';
  }
  if (n.includes('fey') || n.includes('faerie') || n.includes('twilight')) {
    return '/jb2a/Library/Generic/Creature/FairiesLoop01_01_Regular_BluePurple_600x600.webm';
  }
  if (n.includes('poison') || n.includes('flies')) {
    return '/jb2a/Library/Generic/Template/Circle/TemplatePoisonCircle_01_Dark_Green_800x800.webm';
  }

  // Fallback to Holy / Protection Runes
  return '/jb2a/Library/Generic/Template/Circle/TemplateRunesCircle_01_Regular_Orange_800x800.webm';
}
