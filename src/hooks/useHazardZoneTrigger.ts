import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import type { SceneToken, RoomAnnotation } from '../types';

declare module '../lib/firebase' {
  interface SceneToken {
    isFlying?: boolean;
    elevation?: number;
    bubbles?: Array<{ id: string; label: string; color?: string; [key: string]: any }>;
  }
}

export type HazardSaveAbility = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';
export type HazardDamageType =
  | 'piercing'
  | 'slashing'
  | 'bludgeoning'
  | 'fire'
  | 'acid'
  | 'cold'
  | 'poison'
  | 'lightning'
  | 'necrotic'
  | 'radiant'
  | 'force'
  | 'psychic';

export interface HazardPresetProfile {
  id: string;
  name: string;
  damageFormula: string;
  damageType: HazardDamageType;
  saveAbility?: HazardSaveAbility;
  saveDc?: number;
  halfOnSave?: boolean;
  conditionApplied?: string;
  ignoresFlying?: boolean;
  jb2aEffectKey?: string;
}

/**
 * Built-in D&D 2024 Arena & Dungeon Hazard Presets
 * Automatically matched via RoomAnnotation label/dmNotes or explicit preset ID
 */
export const HAZARD_PRESETS: Record<string, HazardPresetProfile> = {
  spike_pit: {
    id: 'spike_pit',
    name: 'Spiked Trench / Pitfall',
    damageFormula: '2d10',
    damageType: 'piercing',
    saveAbility: 'DEX',
    saveDc: 13,
    halfOnSave: false,
    conditionApplied: 'Prone',
    ignoresFlying: true,
    jb2aEffectKey: 'piercing_spikes',
  },
  lava_river: {
    id: 'lava_river',
    name: 'Molten Lava Flow',
    damageFormula: '6d10',
    damageType: 'fire',
    saveAbility: 'DEX',
    saveDc: 15,
    halfOnSave: true,
    ignoresFlying: true,
    jb2aEffectKey: 'fire_eruption',
  },
  acid_pool: {
    id: 'acid_pool',
    name: 'Caustic Acid Pool',
    damageFormula: '4d6',
    damageType: 'acid',
    saveAbility: 'CON',
    saveDc: 14,
    halfOnSave: true,
    ignoresFlying: true,
    jb2aEffectKey: 'acid_splash',
  },
  freezing_chasm: {
    id: 'freezing_chasm',
    name: 'Subzero Ice Crevasse',
    damageFormula: '3d8',
    damageType: 'cold',
    saveAbility: 'DEX',
    saveDc: 14,
    halfOnSave: false,
    conditionApplied: 'Restrained',
    ignoresFlying: true,
    jb2aEffectKey: 'ice_spikes',
  },
  poison_spores: {
    id: 'poison_spores',
    name: 'Toxic Swamp Spores',
    damageFormula: '3d6',
    damageType: 'poison',
    saveAbility: 'CON',
    saveDc: 13,
    halfOnSave: true,
    conditionApplied: 'Poisoned',
    ignoresFlying: false,
    jb2aEffectKey: 'poison_cloud',
  },
};

export interface UseHazardZoneTriggerProps {
  annotations: RoomAnnotation[] | undefined;
  mapWidth?: number;
  mapHeight?: number;
  gridSize?: number;
  /** Commits HP/TempHP/Condition updates locally and broadcasts via Socket.IO */
  onUpdateToken: (tokenId: string, updates: any) => void;
  /** Optional callback to spawn a JB2A WebM effect at world coordinates */
  onSpawnHazardFx?: (effectKey: string, worldX: number, worldY: number) => void;
}

export interface HazardTriggerResult {
  triggered: boolean;
  hazardName?: string;
  totalDamage?: number;
  damageType?: HazardDamageType;
  saveSucceeded?: boolean;
  saveRollTotal?: number;
  conditionApplied?: string;
}

/**
 * Ray-casting point-in-polygon check for flat [x1, y1, x2, y2, ...] arrays
 */
function isPointInFlatPolygon(px: number, py: number, flatPoints: number[]): boolean {
  if (flatPoints.length < 6) return false;
  let inside = false;
  const numVertices = Math.floor(flatPoints.length / 2);

  for (let i = 0, j = numVertices - 1; i < numVertices; j = i++) {
    const xi = flatPoints[i * 2];
    const yi = flatPoints[i * 2 + 1];
    const xj = flatPoints[j * 2];
    const yj = flatPoints[j * 2 + 1];

    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-10) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Evaluates standard D&D dice notation (e.g., "2d10", "4d6+4")
 */
function rollDiceFormula(formula: string): { total: number; breakdown: string } {
  const match = formula.trim().match(/^(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?$/i);
  if (!match) {
    const staticVal = parseInt(formula, 10) || 0;
    return { total: staticVal, breakdown: `${staticVal}` };
  }

  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const sign = match[3] === '-' ? -1 : 1;
  const mod = match[4] ? parseInt(match[4], 10) * sign : 0;

  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
  }
  const sum = rolls.reduce((a, b) => a + b, 0) + mod;
  const modStr = mod !== 0 ? (mod > 0 ? ` + ${mod}` : ` - ${Math.abs(mod)}`) : '';
  return {
    total: Math.max(0, sum),
    breakdown: `[${rolls.join(', ')}]${modStr}`,
  };
}

/**
 * Resolves a HazardPresetProfile from a RoomAnnotation's label or dmNotes metadata
 */
function resolveHazardProfile(annotation: RoomAnnotation): HazardPresetProfile {
  const searchStr = `${annotation.label} ${annotation.roomName ?? ''} ${annotation.dmNotes ?? ''} ${annotation.boxedText ?? ''}`.toLowerCase();

  if (searchStr.includes('lava') || searchStr.includes('magma')) {
    return HAZARD_PRESETS.lava_river;
  }
  if (searchStr.includes('acid') || searchStr.includes('caustic')) {
    return HAZARD_PRESETS.acid_pool;
  }
  if (searchStr.includes('ice') || searchStr.includes('chasm') || searchStr.includes('crevasse')) {
    return HAZARD_PRESETS.freezing_chasm;
  }
  if (searchStr.includes('spore') || searchStr.includes('poison') || searchStr.includes('swamp')) {
    return HAZARD_PRESETS.poison_spores;
  }

  // Parse custom inline formula in dmNotes if present (e.g. "[damage: 3d8 fire] [dc: 15 DEX]")
  const dmgMatch = searchStr.match(/(\d+d\d+(?:\s*[+-]\s*\d+)?)\s*(piercing|slashing|bludgeoning|fire|acid|cold|poison|lightning|necrotic|radiant|force|psychic)/i);
  const dcMatch = searchStr.match(/dc\s*(\d+)\s*(str|dex|con|int|wis|cha)?/i);

  if (dmgMatch) {
    return {
      id: annotation.id,
      name: annotation.label || 'Environmental Hazard',
      damageFormula: dmgMatch[1],
      damageType: dmgMatch[2].toLowerCase() as HazardDamageType,
      saveDc: dcMatch ? parseInt(dcMatch[1], 10) : 13,
      saveAbility: (dcMatch?.[2]?.toUpperCase() as HazardSaveAbility) || 'DEX',
      halfOnSave: true,
      ignoresFlying: !searchStr.includes('air') && !searchStr.includes('cloud'),
    };
  }

  return {
    ...HAZARD_PRESETS.spike_pit,
    name: annotation.label || HAZARD_PRESETS.spike_pit.name,
  };
}

export function useHazardZoneTrigger({
  annotations,
  mapWidth = 1920,
  mapHeight = 1080,
  gridSize = 70,
  onUpdateToken,
  onSpawnHazardFx,
}: UseHazardZoneTriggerProps) {
  // Cooldown tracker (`${tokenId}_${hazardId}`) so dragging within the same hazard doesn't double-fire immediately
  const lastTriggeredRef = useRef<Record<string, number>>({});

  const evaluateTokenMove = useCallback(
    (token: SceneToken | { id: string; name?: string; size?: number; isFlying?: boolean; elevation?: number; tempHp?: number; currentHp?: number; hp?: number; bubbles?: any[]; [key: string]: any }, targetWorldX: number, targetWorldY: number): HazardTriggerResult => {
      if (!annotations || annotations.length === 0) {
        return { triggered: false };
      }

      const hazardZones = annotations.filter(
        (a) =>
          a.type === 'hazard' ||
          /hazard|spike|lava|acid|pit|trap/i.test(`${a.label} ${a.roomName ?? ''}`)
      );

      if (hazardZones.length === 0) {
        return { triggered: false };
      }

      // Compute token center and 4 inset perimeter points based on token sizeMultiplier
      const tokenRadiusPx = ((token.size ?? 1) * gridSize) / 2;
      const centerX = targetWorldX + tokenRadiusPx;
      const centerY = targetWorldY + tokenRadiusPx;
      const inset = tokenRadiusPx * 0.65;

      const samplePoints = [
        { x: centerX, y: centerY },
        { x: centerX - inset, y: centerY - inset },
        { x: centerX + inset, y: centerY - inset },
        { x: centerX - inset, y: centerY + inset },
        { x: centerX + inset, y: centerY + inset },
      ];

      for (const zone of hazardZones) {
        const profile = resolveHazardProfile(zone);

        // Flying or elevated tokens bypass ground-based hazards (spike pits, lava, acid pools)
        const isAirborne = Boolean(token.isFlying || (token.elevation && token.elevation > 0));
        if (profile.ignoresFlying && isAirborne) {
          continue;
        }

        let intersects = false;

        if (zone.polygonPoints && zone.polygonPoints.length >= 6) {
          intersects = samplePoints.some((pt) =>
            isPointInFlatPolygon(pt.x, pt.y, zone.polygonPoints!)
          );
        } else if (zone.bounds) {
          // Bounds are stored in percentage (0 - 100) relative to mapWidth / mapHeight
          const bx = (zone.bounds.x / 100) * mapWidth;
          const by = (zone.bounds.y / 100) * mapHeight;
          const bw = (zone.bounds.width / 100) * mapWidth;
          const bh = (zone.bounds.height / 100) * mapHeight;

          intersects = samplePoints.some(
            (pt) => pt.x >= bx && pt.x <= bx + bw && pt.y >= by && pt.y <= by + bh
          );
        }

        if (!intersects) continue;

        // Enforce 2.5-second debounce per token+zone pair during active drags
        const cooldownKey = `${token.id}_${zone.id}`;
        const now = Date.now();
        if (now - (lastTriggeredRef.current[cooldownKey] ?? 0) < 2500) {
          continue;
        }
        lastTriggeredRef.current[cooldownKey] = now;

        // 1. Roll Saving Throw if applicable
        let saveSucceeded = false;
        let saveRollTotal = 0;

        if (profile.saveDc) {
          const d20 = Math.floor(Math.random() * 20) + 1;
          saveRollTotal = d20; // Base d20 check; DM/Player sees exact roll in toast
          saveSucceeded = saveRollTotal >= profile.saveDc;
        }

        // 2. Roll Damage & Apply Save Reduction
        const { total: rawDamage, breakdown } = rollDiceFormula(profile.damageFormula);
        let finalDamage = rawDamage;

        if (saveSucceeded) {
          finalDamage = profile.halfOnSave ? Math.floor(rawDamage / 2) : 0;
        }

        // 3. Deduct from Temporary HP first (D&D 2024 Wild Shape / Temp HP rules), then Current HP
        const currentTempHp = token.tempHp ?? 0;
        const currentHp = token.currentHp ?? token.hp ?? 10;

        const absorbedByTemp = Math.min(currentTempHp, finalDamage);
        const newTempHp = currentTempHp - absorbedByTemp;
        const overflowDamage = finalDamage - absorbedByTemp;
        const newCurrentHp = Math.max(0, currentHp - overflowDamage);

        // 4. Append condition bubble if failed save
        const updatedBubbles = [...(token.bubbles ?? [])];
        if (!saveSucceeded && profile.conditionApplied) {
          const alreadyHas = updatedBubbles.some(
            (b) => b.label.toLowerCase() === profile.conditionApplied!.toLowerCase()
          );
          if (!alreadyHas) {
            updatedBubbles.push({
              id: `hazard_cond_${Date.now()}`,
              label: profile.conditionApplied,
              color: '#ef4444',
            });
          }
        }

        if (finalDamage > 0 || (!saveSucceeded && profile.conditionApplied)) {
          onUpdateToken(token.id, {
            tempHp: newTempHp,
            currentHp: newCurrentHp,
            hp: newCurrentHp,
            bubbles: updatedBubbles,
          });
        }

        if (onSpawnHazardFx && profile.jb2aEffectKey) {
          onSpawnHazardFx(profile.jb2aEffectKey, centerX, centerY);
        }

        const saveBadge = profile.saveDc
          ? ` | ${profile.saveAbility ?? 'DEX'} Save DC ${profile.saveDc}: Rolled ${saveRollTotal} (${
              saveSucceeded ? 'SUCCESS' : 'FAIL'
            })`
          : '';

        if (finalDamage > 0) {
          toast.error(
            `${token.name} entered ${profile.name}! Took ${finalDamage} ${profile.damageType} damage ${breakdown}${saveBadge}.`
          );
        } else {
          toast.info(
            `${token.name} evaded ${profile.name}!${saveBadge}`
          );
        }

        return {
          triggered: true,
          hazardName: profile.name,
          totalDamage: finalDamage,
          damageType: profile.damageType,
          saveSucceeded,
          saveRollTotal,
          conditionApplied: !saveSucceeded ? profile.conditionApplied : undefined,
        };
      }

      return { triggered: false };
    },
    [annotations, gridSize, mapHeight, mapWidth, onSpawnHazardFx, onUpdateToken]
  );

  return {
    evaluateTokenMove,
    hazardPresets: HAZARD_PRESETS,
  };
}
