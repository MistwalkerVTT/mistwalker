export type MapShaderFeatureType = 'pulse_glow' | 'shimmer' | 'water' | 'fog' | 'glint' | 'cloud_sheen';

export interface MapShaderFeature {
  id: string;
  label: string;
  type: MapShaderFeatureType;
  enabled: boolean;
  /** Normalized X coordinate (0-100%) */
  x: number;
  /** Normalized Y coordinate (0-100%) */
  y: number;
  /** Normalized radius relative to min(width, height) (0-100%) */
  radius: number;
  /** Horizontal stretch multiplier (1.0 = circle, >1 = wider oval, <1 = taller oval) */
  aspect?: number;
  /** Hex color string */
  color: string;
  intensity: number;
  speed: number;
  opacity: number;
}

export interface MapShaderPreset {
  id: string;
  name: string;
  spores: boolean;
  /** Enable chroma-keyed global ocean/moat water ripples & Voronoi caustics */
  globalWater?: boolean;
  features: MapShaderFeature[];
}

export const THREE_MOONS_DUNGEON_SHADER_PRESET: MapShaderPreset = {
  id: 'three-moons-dungeon',
  name: 'Three Moons Dungeon (Subtle WebGL2)',
  spores: true,
  globalWater: false,
  features: [
    {
      id: 'red-room-pulse',
      label: 'Red Chamber Glow',
      type: 'pulse_glow',
      enabled: true,
      x: 28.1,
      y: 12.6,
      radius: 4.3,
      aspect: 1.55,
      color: '#ff2a5f',
      intensity: 1.15,
      speed: 0.8,
      opacity: 0.9,
    },
    {
      id: 'central-orb-shimmer',
      label: 'Central Orb Refraction',
      type: 'shimmer',
      enabled: true,
      x: 26.0,
      y: 45.8,
      radius: 5.5,
      aspect: 1.0,
      color: '#bae6fd',
      intensity: 1.0,
      speed: 0.85,
      opacity: 0.95,
    },
    {
      id: 'spring-water',
      label: 'Top-Left Spring Caustics',
      type: 'water',
      enabled: true,
      x: 11.0,
      y: 15.8,
      radius: 4.5,
      aspect: 1.0,
      color: '#38bdf8',
      intensity: 1.0,
      speed: 0.8,
      opacity: 0.85,
    },
    {
      id: 'gold-gate-seal',
      label: 'Golden Gate Seal',
      type: 'pulse_glow',
      enabled: true,
      x: 73.6,
      y: 35.5,
      radius: 2.3,
      aspect: 1.0,
      color: '#fbbf24',
      intensity: 1.0,
      speed: 0.65,
      opacity: 0.8,
    },
    {
      id: 'chest-glint',
      label: 'Treasure Chest Glint',
      type: 'glint',
      enabled: true,
      x: 25.0,
      y: 88.2,
      radius: 2.8,
      aspect: 1.0,
      color: '#fef08a',
      intensity: 1.0,
      speed: 0.85,
      opacity: 0.9,
    },
    {
      id: 'shrine-aura',
      label: 'Six-Pillar Shrine Aura',
      type: 'pulse_glow',
      enabled: true,
      x: 54.0,
      y: 73.5,
      radius: 6.5,
      aspect: 1.45,
      color: '#60a5fa',
      intensity: 0.75,
      speed: 0.45,
      opacity: 0.55,
    },
    {
      id: 'gorge-mist',
      label: 'Entrance Gorge Mist',
      type: 'fog',
      enabled: true,
      x: 74.0,
      y: 78.0,
      radius: 16.0,
      aspect: 0.65,
      color: '#94a3b8',
      intensity: 0.7,
      speed: 0.55,
      opacity: 0.22,
    },
  ],
};

export const COASTAL_KEEP_SHADER_PRESET: MapShaderPreset = {
  id: 'coastal-keep',
  name: 'Coastal Keep (Subtle WebGL2)',
  spores: true,
  globalWater: true,
  features: [
    {
      id: 'keep-star-sigil',
      label: 'Arcane Star Sigil (SE Tower)',
      type: 'pulse_glow',
      enabled: true,
      x: 68.5,
      y: 68.5,
      radius: 4.8,
      aspect: 1.0,
      color: '#38bdf8',
      intensity: 1.25,
      speed: 0.85,
      opacity: 0.9,
    },
    {
      id: 'keep-sigil-shimmer',
      label: 'Sigil Rune Shimmer',
      type: 'shimmer',
      enabled: true,
      x: 68.5,
      y: 68.5,
      radius: 3.4,
      aspect: 1.0,
      color: '#bae6fd',
      intensity: 0.85,
      speed: 0.75,
      opacity: 0.75,
    },
    {
      id: 'keep-orrery',
      label: 'Celestial Orrery (NE Tower)',
      type: 'shimmer',
      enabled: true,
      x: 67.5,
      y: 21.8,
      radius: 2.2,
      aspect: 1.0,
      color: '#7dd3fc',
      intensity: 1.15,
      speed: 0.9,
      opacity: 0.95,
    },
    {
      id: 'keep-orrery-glint',
      label: 'Orrery Crystal Glint',
      type: 'glint',
      enabled: true,
      x: 67.5,
      y: 21.8,
      radius: 2.0,
      aspect: 1.0,
      color: '#fef08a',
      intensity: 1.0,
      speed: 0.9,
      opacity: 0.85,
    },
    {
      id: 'keep-rotunda-sheen',
      label: 'Rotunda Skylight Drift',
      type: 'cloud_sheen',
      enabled: true,
      x: 52.3,
      y: 48.2,
      radius: 14.8,
      aspect: 1.0,
      color: '#e0f2fe',
      intensity: 0.85,
      speed: 0.45,
      opacity: 0.65,
    },
    {
      id: 'keep-void-pit',
      label: 'Abyssal Pit Aura (SE)',
      type: 'pulse_glow',
      enabled: true,
      x: 87.8,
      y: 88.2,
      radius: 3.4,
      aspect: 1.0,
      color: '#818cf8',
      intensity: 0.95,
      speed: 0.55,
      opacity: 0.75,
    },
    {
      id: 'keep-throne-dais',
      label: 'Red Throne Torchlight',
      type: 'pulse_glow',
      enabled: true,
      x: 35.8,
      y: 6.5,
      radius: 2.8,
      aspect: 1.0,
      color: '#f59e0b',
      intensity: 0.85,
      speed: 1.15,
      opacity: 0.6,
    },
  ],
};

export interface SceneShaderMatchInfo {
  sceneTitle?: string | null;
  mapUrl?: string | null;
  chapterTitle?: string | null;
}

export const ISLE_OF_SERPENTS_LAGOON_SHADER_PRESET: MapShaderPreset = {
  id: 'isle-of-serpents-lagoon',
  name: 'Isle of Serpents Lagoon (Coastal Water)',
  spores: false,
  globalWater: true,
  features: [
    {
      id: 'lagoon-deep-shimmer',
      label: 'Deep Lagoon Shimmer',
      type: 'water',
      enabled: true,
      x: 50,
      y: 72,
      radius: 36,
      aspect: 1.5,
      color: '#0ea5e9',
      intensity: 0.9,
      speed: 0.65,
      opacity: 0.75,
    },
    {
      id: 'sigil-portal-glow',
      label: 'Cliffside Sigil Portal',
      type: 'pulse_glow',
      enabled: true,
      x: 62,
      y: 18,
      radius: 4.5,
      aspect: 1.0,
      color: '#a855f7',
      intensity: 1.0,
      speed: 0.75,
      opacity: 0.7,
    }
  ]
};

export const TOMB_OF_WAYWARD_SOULS_SHADER_PRESET: MapShaderPreset = {
  id: 'tomb-of-wayward-souls',
  name: 'Tomb of Wayward Souls (Green Sconces)',
  spores: true,
  globalWater: false,
  features: [
    {
      id: 't4-blue-devil-aura',
      label: 'Great Blue Devil Mouth Portal',
      type: 'pulse_glow',
      enabled: true,
      x: 34.5,
      y: 80.5,
      radius: 3.5,
      aspect: 1.0,
      color: '#38bdf8',
      intensity: 1.1,
      speed: 0.85,
      opacity: 0.85,
    },
    {
      id: 't9-forest-mirage-wisps',
      label: 'Forest of Spirits Mirage',
      type: 'shimmer',
      enabled: true,
      x: 18.0,
      y: 45.0,
      radius: 6.5,
      aspect: 1.0,
      color: '#4ade80',
      intensity: 0.9,
      speed: 0.7,
      opacity: 0.75,
    },
    {
      id: 't16-acid-pit',
      label: 'Acid Pit Fumes',
      type: 'pulse_glow',
      enabled: true,
      x: 52.0,
      y: 86.0,
      radius: 5.0,
      aspect: 1.3,
      color: '#84cc16',
      intensity: 0.95,
      speed: 0.6,
      opacity: 0.75,
    },
    {
      id: 't22-vortex-bridge',
      label: 'Gravity Vortex Churn',
      type: 'shimmer',
      enabled: true,
      x: 84.0,
      y: 41.0,
      radius: 5.5,
      aspect: 0.7,
      color: '#a855f7',
      intensity: 1.05,
      speed: 0.9,
      opacity: 0.85,
    },
    {
      id: 't26-rerak-throne',
      label: 'Rerak Crypt Necrotic Glow',
      type: 'pulse_glow',
      enabled: true,
      x: 58.0,
      y: 16.0,
      radius: 6.0,
      aspect: 1.4,
      color: '#22c55e',
      intensity: 0.85,
      speed: 0.55,
      opacity: 0.7,
    }
  ]
};

export function isCoastalKeepSceneTitle(title?: string | null): boolean {
  if (!title) return false;
  return /coastal\s*keep|three\s*moons.*(vault|keep|upper|tower)/i.test(title);
}

/**
 * Resolves a WebGL2 subtle map animation preset for the currently loaded battlemap.
 * Checks exact map filenames first so maps in the same chapter never collide.
 */
export function getMapShaderPreset(
  imageFile?: string | null,
  activeSceneInfo?: SceneShaderMatchInfo | null
): MapShaderPreset | null {
  // Never run map shaders on fallback error placeholder SVGs
  if (typeof imageFile === 'string' && imageFile.startsWith('data:image/svg+xml')) {
    return null;
  }

  const urlCandidates = [imageFile, activeSceneInfo?.mapUrl]
    .filter((v): v is string => typeof v === 'string' && v.length > 0);

  // 1. Exact tracked filename matches (highest priority)
  for (const url of urlCandidates) {
    if (url.includes('file-1792161751494-463331435.jpg')) {
      return COASTAL_KEEP_SHADER_PRESET;
    }
    if (url.includes('file-1792161850867-913230359.jpg')) {
      return THREE_MOONS_DUNGEON_SHADER_PRESET;
    }
    if (url.includes('rd_ch7_lagoon.jpg')) {
      return ISLE_OF_SERPENTS_LAGOON_SHADER_PRESET;
    }
    if (url.includes('Tomb_Light_NoGrid_NoAssets_44x54_100ppi.webp') || url.includes('Tomb_Dark_NoGrid_NoAssets_44x54_100ppi.webp')) {
      return TOMB_OF_WAYWARD_SOULS_SHADER_PRESET;
    }
  }

  // 2. Scene title fallback (Coastal Keep / Upper Vault checked before generic Three Moons Dungeon)
  const title = activeSceneInfo?.sceneTitle || '';
  if (isCoastalKeepSceneTitle(title)) {
    return COASTAL_KEEP_SHADER_PRESET;
  }
  if (/three\s*moons/i.test(title)) {
    return THREE_MOONS_DUNGEON_SHADER_PRESET;
  }
  if (/isle\s*of\s*serpents\s*lagoon/i.test(title)) {
    return ISLE_OF_SERPENTS_LAGOON_SHADER_PRESET;
  }
  if (/tomb\s*of\s*wayward\s*souls/i.test(title)) {
    return TOMB_OF_WAYWARD_SOULS_SHADER_PRESET;
  }

  return null;
}
