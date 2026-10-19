import { SpellSoundType } from '../utils/spellSoundEngine';
import { JB2A_DATABASE, Jb2aAsset, findJb2aAsset, getJb2aAsset } from './jb2aDatabase';

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
  proceduralStyle: string;
  tags: string[];
  videoUrl: string;
  loopVideoUrl?: string;
  thumbUrl: string;
  jb2aId: string;
}

const getIconNameForAsset = (jb: Jb2aAsset): SpecialEffectDefinition['iconName'] => {
  const t = jb.tags;
  if (t.some(x => x.includes('fire') || x.includes('flame') || x.includes('magma') || x.includes('lava'))) return 'flame';
  if (t.some(x => x.includes('lightning') || x.includes('shock') || x.includes('zap') || x.includes('spark'))) return 'zap';
  if (t.some(x => x.includes('frost') || x.includes('cold') || x.includes('ice') || x.includes('sleet') || x.includes('snow'))) return 'snowflake';
  if (t.some(x => x.includes('sun') || x.includes('radiant') || x.includes('dawn'))) return 'sun';
  if (t.some(x => x.includes('moon') || x.includes('darkness') || x.includes('shadow') || x.includes('night'))) return 'moon';
  if (t.some(x => x.includes('wind') || x.includes('cloud') || x.includes('fog') || x.includes('smoke') || x.includes('air'))) return 'cloud';
  if (t.some(x => x.includes('heal') || x.includes('cure') || x.includes('water') || x.includes('droplet') || x.includes('liquid') || x.includes('acid'))) return 'droplets';
  if (t.some(x => x.includes('shield') || x.includes('ward') || x.includes('wall') || x.includes('protect') || x.includes('abjuration'))) return 'shield';
  if (t.some(x => x.includes('necro') || x.includes('skull') || x.includes('death') || x.includes('toll'))) return 'skull';
  if (t.some(x => x.includes('eye') || x.includes('detect') || x.includes('divination') || x.includes('fear'))) return 'eye';
  return 'sparkles';
};

const getBadgeColorForAsset = (jb: Jb2aAsset): string => {
  if (jb.tier === 'Cantrip') return 'text-emerald-400 bg-emerald-950/70 border-emerald-800/70';
  if (jb.level === 1) return 'text-sky-400 bg-sky-950/70 border-sky-800/70';
  if (jb.level === 2) return 'text-indigo-400 bg-indigo-950/70 border-indigo-800/70';
  if (jb.level === 3) return 'text-purple-400 bg-purple-950/70 border-purple-800/70';
  if (jb.level === 4) return 'text-fuchsia-400 bg-fuchsia-950/70 border-fuchsia-800/70';
  if (jb.level >= 5) return 'text-amber-400 bg-amber-950/70 border-amber-800/70';
  return 'text-zinc-400 bg-zinc-900/70 border-zinc-700/70';
};

/**
 * Pure JB2A Animated Effects Database
 * Every entry is directly backed by an authentic Jules & Ben's Animated Asset (JB2A)
 * streamed via high-speed CDN with zero legacy non-animated or duplicate entries.
 */
export const SPECIAL_EFFECTS_DATABASE: SpecialEffectDefinition[] = JB2A_DATABASE.map(jb => ({
  id: jb.id,
  name: jb.name,
  label: jb.label,
  level: jb.level,
  school: (jb.school as SpellSchool) || 'evocation',
  category: (
    jb.isPersistent 
      ? 'persistent' 
      : jb.tags.some(t => t.includes('buff') || t.includes('heal') || t.includes('shield'))
        ? 'buff'
        : 'instant'
  ) as SpellCategory,
  shape: jb.shape,
  defaultSizeFt: jb.defaultSizeFt,
  color: jb.color,
  secondaryColor: undefined,
  blendMode: jb.blendMode || 'screen',
  isPersistent: jb.isPersistent,
  defaultOpacity: 0.95,
  description: jb.description,
  iconName: getIconNameForAsset(jb),
  badgeColor: getBadgeColorForAsset(jb),
  soundEffect: (jb.soundEffect as SpellSoundType) || 'whoosh',
  hasShockwave: !jb.isPersistent,
  proceduralStyle: jb.id,
  tags: jb.tags,
  videoUrl: jb.webm,
  loopVideoUrl: jb.loopWebm,
  thumbUrl: jb.thumb,
  jb2aId: jb.id
}));

/** Helper to find an authentic JB2A spell definition by ID or fallback search */
export function getSpecialEffectDefinition(idOrName: string): SpecialEffectDefinition | undefined {
  if (!idOrName) return undefined;
  const lower = idOrName.toLowerCase().trim().replace(/[\s-]+/g, '_');
  const rawLower = idOrName.toLowerCase().trim();

  // 1. Exact ID match
  const directId = SPECIAL_EFFECTS_DATABASE.find(s => s.id === lower || s.id === rawLower);
  if (directId) return directId;

  // 2. Exact Name or Label match
  const nameMatch = SPECIAL_EFFECTS_DATABASE.find(s => s.name.toLowerCase() === rawLower || s.label.toLowerCase() === rawLower);
  if (nameMatch) return nameMatch;

  // 3. Fallback via JB2A asset resolution
  const jbAsset = findJb2aAsset(idOrName);
  if (jbAsset) {
    const found = SPECIAL_EFFECTS_DATABASE.find(s => s.id === jbAsset.id);
    if (found) return found;
  }

  // 4. Substring and tag matching
  return (
    SPECIAL_EFFECTS_DATABASE.find(s => s.tags.some(t => t.toLowerCase() === rawLower)) ||
    SPECIAL_EFFECTS_DATABASE.find(s => rawLower.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(rawLower)) ||
    SPECIAL_EFFECTS_DATABASE.find(s => s.tags.some(t => rawLower.includes(t) || t.includes(rawLower)))
  );
}
