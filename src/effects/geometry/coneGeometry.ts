// src/effects/geometry/coneGeometry.ts
// Calculates directional origins for cone spell attacks in MistWalker VTT.
// When casting a cone, the origin is projected to the perimeter/edge of the caster's token
// in the direction of the aim target.

export interface TokenPositionLike {
  id?: string;
  x?: number;
  y?: number;
  size?: number;
  [key: string]: any;
}

/**
 * Calculates the exact point along the outer perimeter (circle / square boundary) of a token
 * pointing towards the aim target.
 *
 * @param origin - The center or base origin coordinate (x, y)
 * @param target - The target coordinate towards which the cone points (x, y)
 * @param tokens - Available tokens on the map
 * @param gridSize - Battlemap grid size in pixels
 * @param preferredToken - Optional preferred caster token (e.g. claimedToken or selectedToken)
 * @returns The adjusted origin point on the token's edge facing the target
 */
export function getDirectionalConeOrigin(
  origin: { x: number; y: number },
  target: { x: number; y: number },
  tokens: TokenPositionLike[] | undefined,
  gridSize: number,
  preferredToken?: TokenPositionLike | null
): { x: number; y: number; edgeOffsetDist: number; tokenCenter: { x: number; y: number } } {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const dist = Math.hypot(dx, dy);

  // If distance is near zero, fallback to origin
  if (dist < 1e-4) {
    return {
      x: origin.x,
      y: origin.y,
      edgeOffsetDist: 0,
      tokenCenter: { x: origin.x, y: origin.y }
    };
  }

  // 1. Check if preferred token exists and matches the origin vicinity
  let casterToken: TokenPositionLike | null = null;
  if (preferredToken && typeof preferredToken.x === 'number' && typeof preferredToken.y === 'number') {
    const pRadius = ((preferredToken.size || 1) * gridSize) / 2;
    const pcX = preferredToken.x + pRadius;
    const pcY = preferredToken.y + pRadius;
    if (Math.hypot(origin.x - pcX, origin.y - pcY) <= pRadius * 1.5 + 24) {
      casterToken = preferredToken;
    }
  }

  // 2. If no preferred token matched, find nearest token enclosing or adjacent to origin
  if (!casterToken && tokens && tokens.length > 0) {
    let bestDist = Infinity;
    for (const t of tokens) {
      if (typeof t.x !== 'number' || typeof t.y !== 'number') continue;
      const tRad = ((t.size || 1) * gridSize) / 2;
      const tcX = t.x + tRad;
      const tcY = t.y + tRad;
      const d = Math.hypot(origin.x - tcX, origin.y - tcY);
      if (d <= tRad * 1.5 + 24 && d < bestDist) {
        bestDist = d;
        casterToken = t;
      }
    }
  }

  if (casterToken && typeof casterToken.x === 'number' && typeof casterToken.y === 'number') {
    const tRadius = ((casterToken.size || 1) * gridSize) / 2;
    const tcX = casterToken.x + tRadius;
    const tcY = casterToken.y + tRadius;

    // Direction from token center to target
    const cdx = target.x - tcX;
    const cdy = target.y - tcY;
    const cdist = Math.hypot(cdx, cdy);
    if (cdist > 1e-4) {
      const cDirX = cdx / cdist;
      const cDirY = cdy / cdist;
      // Edge of the circular token closest to the target
      return {
        x: tcX + cDirX * tRadius,
        y: tcY + cDirY * tRadius,
        edgeOffsetDist: tRadius,
        tokenCenter: { x: tcX, y: tcY }
      };
    }
  }

  // If no token found at origin, return origin unchanged
  return {
    x: origin.x,
    y: origin.y,
    edgeOffsetDist: 0,
    tokenCenter: { x: origin.x, y: origin.y }
  };
}
