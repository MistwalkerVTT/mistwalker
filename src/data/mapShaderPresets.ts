export type MapShaderFeatureType = 'pulse_glow' | 'shimmer' | 'water' | 'fog' | 'glint';

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
  features: MapShaderFeature[];
}

export const THREE_MOONS_DUNGEON_SHADER_PRESET: MapShaderPreset = {
  id: 'three-moons-dungeon',
  name: 'Three Moons Dungeon (Subtle WebGL2)',
  spores: true,
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
      color: '#cbd5e1',
      intensity: 0.9,
      speed: 0.55,
      opacity: 0.55,
    },
  ],
};

export interface SceneShaderMatchInfo {
  sceneTitle?: string | null;
  mapUrl?: string | null;
  chapterTitle?: string | null;
}

/**
 * Resolves a WebGL2 subtle map animation preset for the currently loaded battlemap.
 * Strictly scoped to Three Moons Dungeon so no other battlemaps are affected.
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

  for (const url of urlCandidates) {
    if (url.includes('file-1792161850867-913230359.jpg')) {
      return THREE_MOONS_DUNGEON_SHADER_PRESET;
    }
  }

  const title = activeSceneInfo?.sceneTitle || '';
  if (/three\s*moons/i.test(title)) {
    return THREE_MOONS_DUNGEON_SHADER_PRESET;
  }

  return null;
}
