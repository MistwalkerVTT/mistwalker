// src/lib/hazardGeometry.ts
// Mathematical utilities for detecting environmental hazard collision and creature bypass checks

import { HazardZone, HazardBypassRules } from '../types/hazard';

/**
 * Standard ray-casting algorithm to test if a 2D point lies within a polygon
 */
export function isPointInPolygon(px: number, py: number, polygon: number[]): boolean {
  if (!polygon || polygon.length < 6) return false;
  let inside = false;
  const n = polygon.length / 2;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i * 2];
    const yi = polygon[i * 2 + 1];
    const xj = polygon[j * 2];
    const yj = polygon[j * 2 + 1];

    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Checks if a world pixel point (or normalized percentage point) lies inside a hazard zone
 */
export function isPointInHazard(
  x: number,
  y: number,
  hazard: HazardZone,
  mapW: number,
  mapH: number
): boolean {
  if (!hazard || !mapW || !mapH) return false;

  // 1. Polygon test if defined
  if (hazard.polygonPoints && hazard.polygonPoints.length >= 6) {
    const pixelPolygon = hazard.polygonPoints.map((val, idx) =>
      idx % 2 === 0 ? (val / 100) * mapW : (val / 100) * mapH
    );
    return isPointInPolygon(x, y, pixelPolygon);
  }

  // 2. Bounding box fallback
  if (hazard.bounds) {
    const hx = (hazard.bounds.x / 100) * mapW;
    const hy = (hazard.bounds.y / 100) * mapH;
    const hw = (hazard.bounds.width / 100) * mapW;
    const hh = (hazard.bounds.height / 100) * mapH;
    return x >= hx && x <= hx + hw && y >= hy && y <= hy + hh;
  }

  return false;
}

/**
 * Checks whether a specific grid square `(col, row)` overlaps an unsafe hazard zone
 */
export function isGridCellInHazard(
  col: number,
  row: number,
  gridSize: number,
  hazard: HazardZone,
  mapW: number,
  mapH: number
): boolean {
  // Test cell center and 4 corners to accurately catch thin hazards
  const cx = col * gridSize + gridSize / 2;
  const cy = row * gridSize + gridSize / 2;
  if (isPointInHazard(cx, cy, hazard, mapW, mapH)) return true;

  const offsets = [
    [0.15, 0.15],
    [0.85, 0.15],
    [0.15, 0.85],
    [0.85, 0.85]
  ];

  for (const [ox, oy] of offsets) {
    if (isPointInHazard(col * gridSize + ox * gridSize, row * gridSize + oy * gridSize, hazard, mapW, mapH)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks whether an actor (token or combatant) can safely ignore/bypass a hazard zone
 * (e.g. flying over lava or chasm, or immune to fire damage)
 */
export function canCreatureBypassHazard(
  actor: {
    isFlying?: boolean;
    elevation?: number;
    damageImmunities?: string[];
    creatureType?: string;
    hasSpiderClimb?: boolean;
  },
  hazard: HazardZone
): boolean {
  if (!hazard) return true;
  const rules: HazardBypassRules = hazard.bypassRules || {};

  // 1. Flight / Elevation bypass: ground-based hazards (lava, pits, chasms, spikes, difficult terrain)
  const isAirborne = Boolean(actor.isFlying || (typeof actor.elevation === 'number' && actor.elevation > 0));
  if (rules.requiresFlight && isAirborne) {
    return true;
  }

  // 2. Damage Immunity bypass (e.g. Fire Elemental in lava, or Red Dragon in magma)
  if (rules.immuneDamageTypes && rules.immuneDamageTypes.length > 0 && Array.isArray(actor.damageImmunities)) {
    const actorImmunities = actor.damageImmunities.map((i) => i.toLowerCase().trim());
    const hasFullImmunity = rules.immuneDamageTypes.every((type) =>
      actorImmunities.includes(type.toLowerCase().trim())
    );
    if (hasFullImmunity) {
      return true;
    }
  }

  // 3. Creature Type Immunity (e.g. Undead in Poison Gas)
  if (rules.immuneCreatureTypes && rules.immuneCreatureTypes.length > 0 && actor.creatureType) {
    const cType = actor.creatureType.toLowerCase().trim();
    if (rules.immuneCreatureTypes.some((t) => t.toLowerCase().trim() === cType)) {
      return true;
    }
  }

  // 4. Spider Climb bypass
  if (rules.requiresSpiderClimb && actor.hasSpiderClimb) {
    return true;
  }

  return false;
}

/**
 * Calculates standard 5e fall damage: 1d6 bludgeoning per 10 feet fallen (max 20d6)
 */
export function calculateFallDamage(depthFt: number = 10): { diceCount: number; formula: string; landsProne: boolean } {
  const safeDepth = Math.max(10, depthFt);
  const diceCount = Math.min(20, Math.floor(safeDepth / 10));
  return {
    diceCount,
    formula: `${diceCount}d6 bludgeoning`,
    landsProne: true
  };
}
