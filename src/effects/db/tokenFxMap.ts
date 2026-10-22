// src/effects/db/tokenFxMap.ts
// Maps D&D 5e Status Conditions and Token Auras directly to high-fidelity JB2A WebM animations.

export interface ConditionFxMapping {
  videoUrl: string;
  thumbUrl?: string;
  defaultSizeFt: number;
  soundKey?: string;
  blendMode?: 'normal' | 'screen' | 'lighten' | 'multiply';
  color?: string;
  sizeMultiplier?: number;
  yOffset?: number;
  condition?: string;
  opacity?: number;
}

export const CONDITION_FX_MAP: Record<string, ConditionFxMapping> = {
  blinded: {
    videoUrl: '/jb2a/Library/Generic/Template/Circle/TemplateFearCircle_01_Dark_Purple_800x800.webm',
    defaultSizeFt: 5,
    soundKey: 'curse',
    color: '#a855f7'
  },
  charmed: {
    videoUrl: '/jb2a/Library/Generic/Template/Circle/TemplateHeartCircle_01_Regular_Pink_800x800.webm',
    defaultSizeFt: 5,
    soundKey: 'magic_chime',
    color: '#ec4899'
  },
  frightened: {
    videoUrl: '/jb2a/Library/Generic/Template/Circle/TemplateFearCircle_01_Dark_Purple_800x800.webm',
    defaultSizeFt: 5,
    soundKey: 'curse',
    color: '#7c3aed'
  },
  poisoned: {
    videoUrl: '/jb2a/Library/Generic/Template/Circle/TemplatePoisonCircle_01_Dark_Green_800x800.webm',
    defaultSizeFt: 5,
    soundKey: 'acid_burn',
    color: '#22c55e'
  },
  paralyzed: {
    videoUrl: '/jb2a/Library/Generic/Template/Circle/TemplateStunCircle_01_Regular_Purple_800x800.webm',
    defaultSizeFt: 5,
    soundKey: 'magic_shatter',
    color: '#c084fc'
  },
  petrified: {
    videoUrl: '/jb2a/Library/Generic/Template/Circle/TemplateSkullCircle_01_Regular_Purple_800x800.webm',
    defaultSizeFt: 5,
    soundKey: 'magic_shatter',
    color: '#78716c'
  },
  stunned: {
    videoUrl: '/jb2a/Library/Generic/Template/Circle/TemplateStunCircle_01_Regular_Purple_800x800.webm',
    defaultSizeFt: 5,
    soundKey: 'magic_chime',
    color: '#facc15'
  },
  unconscious: {
    videoUrl: '/jb2a/Library/Generic/Template/Circle/TemplateSkullCircle_01_Regular_Purple_800x800.webm',
    defaultSizeFt: 5,
    soundKey: 'curse',
    color: '#ef4444'
  },
  invisible: {
    videoUrl: '/jb2a/Library/Generic/Template/Circle/TemplateSnowflakeCircle_01_Regular_Blue_800x800.webm',
    defaultSizeFt: 5,
    color: '#38bdf8'
  },
  restrained: {
    videoUrl: '/jb2a/Library/Generic/Template/Circle/Web/002/Template_Circle_WebLoop_002_001_White_5x5_1000.webm',
    defaultSizeFt: 5,
    color: '#e2e8f0'
  },
  grappled: {
    videoUrl: '/jb2a/Library/Generic/Template/Circle/Web/002/Template_Circle_WebLoop_002_001_White_5x5_1000.webm',
    defaultSizeFt: 5,
    color: '#f97316'
  },
  prone: {
    videoUrl: '/jb2a/Library/Generic/Template/Circle/TemplateSkullCircle_01_Regular_Purple_800x800.webm',
    defaultSizeFt: 5,
    color: '#71717a'
  },
  bloodied: {
    videoUrl: '/jb2a/Library/Generic/Template/Circle/TemplateSkullCircle_01_Regular_Purple_800x800.webm',
    defaultSizeFt: 5,
    color: '#ef4444'
  }
};

export function getConditionFx(conditionName: string): ConditionFxMapping | null {
  if (!conditionName) return null;
  const key = conditionName.toLowerCase().trim();
  const found = CONDITION_FX_MAP[key];
  if (!found) return null;
  return { condition: key, ...found };
}

/**
 * Resolves high-fidelity JB2A transparent video loops for any token aura name or theme.
 * Gives first-class priority to official JB2A animated assets over static canvas rings.
 */
export function getAuraVideoUrl(name?: string, color?: string): string | null {
  if (!name && !color) return null;
  const n = (name || '').toLowerCase().trim();

  // 1. Spirit Guardians
  if (n.includes('spirit') || n.includes('guardian')) {
    return '/jb2a/Library/3rd_Level/Spirit_Guardians/SpiritGuardians_01_Light_BlueYellow_600x600.webm';
  }

  // 2. Aura of Life / Vitality
  if (n.includes('life')) {
    return '/jb2a/Community/JAA/auraOfLife.webm';
  }
  if (n.includes('vitality') || n.includes('healing')) {
    return '/jb2a/Community/JAA/AuraofVitality.webm';
  }

  // 3. Antilife Shell
  if (n.includes('antilife') || n.includes('anti-life') || n.includes('shell')) {
    return '/jb2a/Library/5th_Level/Antilife_Shell/AntilifeShell_01_Blue_Circle_400x400.webm';
  }

  // 4. Paladin Auras (Protection, Courage, Devotion)
  if (n.includes('protection') || n.includes('lathander') || n.includes('holy')) {
    return '/jb2a/Community/JackKerouac/lathander_symbol_CIRCLE_01.webm';
  }
  if (n.includes('courage') || n.includes('devotion') || n.includes('magic circle')) {
    return '/jb2a/Community/JackKerouac/magic_circle_CIRCLE_01.webm';
  }
  if (n.includes('crusader') || n.includes('mantle')) {
    return '/jb2a/Library/Generic/Template/Circle/TemplateRunesCircle_01_Regular_Orange_800x800.webm';
  }

  // 5. Frost & Cold
  if (n.includes('ice shield') || n.includes('rotating') || n.includes('glacier')) {
    return '/jb2a/Community/JackKerouac/ice_shield_rotating_SQUARE_01.webm';
  }
  if (n.includes('frost') || n.includes('cold') || n.includes('rime') || n.includes('blizzard') || n.includes('snow')) {
    return '/jb2a/Library/Generic/Template/Circle/Aura/AuraThemedOrbitLoopCold01_01_Regular_Blue_700x700.webm';
  }

  // 6. Nature, Plants & Entanglement
  if (n.includes('entangle') || n.includes('overgrowth') || n.includes('briar') || n.includes('vine') || n.includes('root')) {
    return '/jb2a/Library/1st_Level/Entangle/EntangleLoop02_02_Regular_Green_500x500.webm';
  }
  if (n.includes('nature') || n.includes('bloom') || n.includes('druid') || n.includes('flora')) {
    return '/jb2a/Library/Generic/Template/Circle/Aura/AuraThemedOrbitLoopNature01_01_Regular_Green_700x700.webm';
  }

  // 7. Fire & Flames
  if (n.includes('fire') || n.includes('flame') || n.includes('blaze') || n.includes('burn')) {
    return '/jb2a/Library/Generic/Fire/ShieldFireAbove01_01_Regular_Orange_400x400.webm';
  }

  // 8. Darkness, Void & Necrotic
  if (n.includes('darkness') || n.includes('void') || n.includes('shadow') || n.includes('dread') || n.includes('hate')) {
    return '/jb2a/Library/2nd_Level/Darkness/Darkness_01_Black_600x600.webm';
  }
  if (n.includes('death') || n.includes('necrotic') || n.includes('skull')) {
    return '/jb2a/Community/JAA/circleOfDeath.webm';
  }

  // 9. Fey, Twilight & Illumination
  if (n.includes('fey') || n.includes('faerie') || n.includes('twilight') || n.includes('pixie')) {
    return '/jb2a/Library/Generic/Creature/FairiesLoop01_01_Regular_BluePurple_600x600.webm';
  }

  // 10. Fog, Mist & Clouds
  if (n.includes('fog') || n.includes('mist') || n.includes('cloud')) {
    return '/jb2a/Library/1st_Level/Fog_Cloud/FogCloud_01_White_800x800.webm';
  }
  if (n.includes('cloudkill') || n.includes('poison cloud')) {
    return '/jb2a/Community/JAA/cloudKill.webm';
  }

  // 11. Poison & Flies
  if (n.includes('flies') || n.includes('swarm') || n.includes('insect')) {
    return '/jb2a/Community/JAA/InsectPlague.0.webm';
  }
  if (n.includes('poison') || n.includes('toxic') || n.includes('venom')) {
    return '/jb2a/Library/Generic/Template/Circle/TemplatePoisonCircle_01_Dark_Green_800x800.webm';
  }

  // 12. Protective Wards, Hut, Bless, Mark, Daggers, Tentacles, Whirlwind & Glyphs
  if (n.includes('bless')) {
    return '/jb2a/Library/1st_Level/Bless/Bless_01_Regular_Yellow_Loop_200x200.webm';
  }
  if (n.includes('hunter') || n.includes('mark')) {
    return '/jb2a/Library/1st_Level/Hunters_Mark/HuntersMark_01_Regular_Green_Loop_200x200.webm';
  }
  if (n.includes('globe') || n.includes('invulnerability') || n.includes('wall of force') || n.includes('force sphere')) {
    return '/jb2a/Library/5th_Level/Wall_Of_Force/WallOfForce_01_Grey_Sphere_400x400.webm';
  }
  if (n.includes('wall of fire')) {
    return '/jb2a/Library/4th_Level/Wall_Of_Fire/WallOfFire_01_Blue_Ring_400x400.webm';
  }
  if (n.includes('cloud of daggers') || n.includes('daggers')) {
    return '/jb2a/Library/2nd_Level/Cloud_Of_Daggers/CloudOfDaggers_01_Light_Blue_400x400.webm';
  }
  if (n.includes('hadar') || n.includes('tentacle')) {
    return '/jb2a/Library/4th_Level/Black_Tentacles/BlackTentacles_01_Dark_Purple_600x600.webm';
  }
  if (n.includes('whirlwind') || n.includes('cyclone')) {
    return '/jb2a/Library/7th_Level/Whirlwind/Whirlwind_01_BlueGrey_01_400x400.webm';
  }
  if (n.includes('tiny hut') || n.includes('leomund') || n.includes('hut') || n.includes('dome')) {
    return '/jb2a/Community/JAA/LeomundsTinyHut.0.webm';
  }
  if (n.includes('glyph') || n.includes('warding')) {
    return '/jb2a/Community/JAA/glyphOfWarding.webm';
  }
  if (n.includes('blade barrier') || n.includes('spinning blades')) {
    return '/jb2a/Community/JAA/bladeBarrier.webm';
  }
  if (n.includes('sanctuary') || n.includes('rune')) {
    return '/jb2a/Community/JackKerouac/runes_CIRCLE_02.webm';
  }
  if (n.includes('agathys') || n.includes('ice barrier')) {
    return '/jb2a/Community/JackKerouac/ice_shield_rotating_SQUARE_01.webm';
  }
  if (n.includes('shield of faith') || n.includes('shield')) {
    return '/jb2a/Library/1st_Level/Shield/Shield_01_Regular_Blue_Complete_400x400.webm';
  }
  if (n.includes('detect magic')) {
    return '/jb2a/Library/1st_Level/Detect_Magic/DetectMagicCircle_01_Regular_Blue_1200x1200.webm';
  }

  // 13. Custom Aura Color Swatch Mapping -> Themed JB2A Animations
  const c = (color || '').toLowerCase();
  if (c.includes('34, 197, 94') || c.includes('16, 185, 129')) {
    return '/jb2a/Library/Generic/Template/Circle/Aura/AuraThemedOrbitLoopNature01_01_Regular_Green_700x700.webm';
  }
  if (c.includes('59, 130, 246') || c.includes('96, 165, 250')) {
    return '/jb2a/Library/3rd_Level/Spirit_Guardians/SpiritGuardians_01_Light_BlueYellow_600x600.webm';
  }
  if (c.includes('168, 85, 247') || c.includes('147, 51, 234')) {
    return '/jb2a/Community/JackKerouac/runes_CIRCLE_02.webm';
  }
  if (c.includes('239, 68, 68')) {
    return '/jb2a/Community/JAA/circleOfDeath.webm';
  }
  if (c.includes('6, 182, 212') || c.includes('56, 189, 248')) {
    return '/jb2a/Library/Generic/Template/Circle/Aura/AuraThemedOrbitLoopCold01_01_Regular_Blue_700x700.webm';
  }
  if (c.includes('249, 115, 22')) {
    return '/jb2a/Library/Generic/Fire/ShieldFireAbove01_01_Regular_Orange_400x400.webm';
  }
  if (c.includes('236, 72, 153')) {
    return '/jb2a/Library/Generic/Creature/FairiesLoop01_01_Regular_BluePurple_600x600.webm';
  }
  if (c.includes('241, 245, 249')) {
    return '/jb2a/Library/5th_Level/Wall_Of_Force/WallOfForce_01_Grey_Sphere_400x400.webm';
  }
  if (c.includes('100, 116, 139') || c.includes('30, 41, 59')) {
    return '/jb2a/Library/2nd_Level/Darkness/Darkness_01_Black_600x600.webm';
  }

  // Universal Default: Golden Divine Runes Circle
  return '/jb2a/Library/Generic/Template/Circle/TemplateRunesCircle_01_Regular_Orange_800x800.webm';
}

/**
 * Characters with a signature toggleable glowing halo special effect.
 */
const HALO_CHARACTER_KEYS = ['stavros'];

export function canTokenHaveHalo(tokenName?: string): boolean {
  if (!tokenName) return false;
  const n = tokenName.toLowerCase();
  return HALO_CHARACTER_KEYS.some(k => n.includes(k));
}
