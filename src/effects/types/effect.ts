// src/effects/types/effect.ts
// Strict TypeScript types for the MistWalker 4.0 Effects Engine

export type EffectParadigm =
  | 'point'       // Stationary circle/sphere/burst (Fireball, Darkness, Fog Cloud)
  | 'cone'        // Directional cone originating from caster/source (Cone of Cold, Burning Hands)
  | 'line'        // Directional linear beam/wall (Lightning Bolt, Sunbeam, Wall of Fire)
  | 'ray'         // Continuous stretched beam from Caster to Target (Witch Bolt, Disintegrate)
  | 'projectile'  // Animated travelling projectile from Caster to Target (Fire Bolt, Eldritch Blast)
  | 'aura';       // Token-attached persistent effect moving with the token (Spirit Guardians, Shield)

export type BlendMode = 'screen' | 'lighter' | 'normal' | 'multiply';

export type SpellSchool =
  | 'evocation'
  | 'conjuration'
  | 'abjuration'
  | 'necromancy'
  | 'enchantment'
  | 'transmutation'
  | 'illusion'
  | 'divination'
  | 'environmental'
  | 'martial';

/**
 * Universal runtime instance of an active effect on the battlemap.
 * Unified across DM View, Player View, Socket.IO network sync, and Firestore persistence.
 */
export interface VttEffectInstance {
  id: string;
  name: string;
  label?: string;
  assetKey: string;
  videoUrl: string;
  loopVideoUrl?: string;
  thumbUrl?: string;
  paradigm: EffectParadigm;
  x: number;
  y: number;
  originX?: number;
  originY?: number;
  trajectory?: EffectTrajectoryConfig;
  targetX?: number;
  targetY?: number;
  attachedTokenId?: string;
  sizeFt: number;
  rotation: number;          // Degrees (0 to 360)
  opacity: number;           // 0.0 to 1.0
  blendMode: BlendMode;
  isPersistent: boolean;
  loop: boolean;
  castTime: number;          // Epoch timestamp when cast
  durationMs?: number;       // For auto-expiring single-shots (e.g. 5000ms)
  soundKey?: string;
  color?: string;            // Secondary tint or outline indicator
  ownerId?: string;          // Player or DM userId who cast it
  spellId?: string;          // Associated 5e spell ID if cast from Compendium
}

export interface EffectTrajectoryConfig {
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  speedPxSec?: number;
  burstOnImpact?: boolean;
  burstVideoUrl?: string;
  burstSoundKey?: string;
  burstEffect?: VttEffectInstance;
}

/**
 * Static metadata definition for an indexed JB2A asset in the catalog.
 */
export interface Jb2aAssetDefinition {
  id: string;
  name: string;
  label: string;
  level: number;             // 0 = Cantrip, 1-9
  school: SpellSchool;
  paradigm: EffectParadigm;
  shape: 'circle' | 'cone' | 'line' | 'ray' | 'aura';
  defaultSizeFt: number;     // Standard 5e dimensions (5, 10, 15, 20, 30, 60, etc.)
  color: string;
  webm: string;              // Primary WebM URL (transparent alpha VP8/VP9)
  loopWebm?: string;         // Dedicated seamless looping segment if available
  thumb: string;             // WebP thumbnail for UI cards
  isPersistent: boolean;
  blendMode: BlendMode;
  tags: string[];
  soundKey?: string;
  projectileWebm?: string;   // Optional travel bolt WebM for spells with both travel + impact
  burstWebm?: string;        // Optional impact detonation burst WebM
}

/**
 * Custom override attached to a 5e Compendium spell by a DM/Player.
 * Persisted in Firestore under `campaigns/{campaignId}/spellOverrides/{spellId}`.
 */
export interface CustomSpellOverride {
  spellId: string;
  campaignId: string;
  name: string;
  videoUrl?: string;
  imageUrl?: string;
  paradigm: EffectParadigm;
  defaultSizeFt: number;
  color?: string;
  blendMode: BlendMode;
  isPersistent: boolean;
  soundKey?: string;
  updatedAt: number;
  source: 'upload' | 'url' | 'preset';
}

/**
 * Calculated projectile vector for travel interpolation.
 */
export interface TrajectoryVector {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  distance: number;
  angleDeg: number;
  durationMs: number;
}
