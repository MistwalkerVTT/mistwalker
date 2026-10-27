import * as turf from '@turf/turf';
import { Token } from '../types';

export type AoeShapeType = 'sphere' | 'cone' | 'cube' | 'line';

export interface AoeTemplateConfig {
  id: string;
  shape: AoeShapeType;
  origin: { x: number; y: number }; // In world map pixels
  target?: { x: number; y: number }; // Directional anchor for cone/line/cube
  sizeFt: number; // radius for sphere, length for cone/line, width/height for cube
  widthFt?: number; // width for line (default 5ft)
  color?: string; // e.g. '#f59e0b', '#ef4444', '#3b82f6', '#10b981'
  opacity?: number;
  label?: string; // e.g. "Fireball (20ft Radius)"
}

export interface AoeTargetCheckResult {
  token: Token;
  distanceFt: number;
  isHit: boolean;
}

/**
 * Converts distance in feet to pixels on the canvas based on gridSize (5ft = 1 gridSize).
 */
export function ftToPx(ft: number, gridSize: number): number {
  return (ft / 5) * gridSize;
}

/**
 * Converts distance in pixels to feet (gridSize = 5ft).
 */
export function pxToFt(px: number, gridSize: number): number {
  return Math.round((px / gridSize) * 5);
}

/**
 * Generates an array of 2D points [x0, y0, x1, y1, ...] forming the polygon boundary for an AOE template.
 */
export function generateAoePolygonPoints(config: AoeTemplateConfig, gridSize: number): number[] {
  const { shape, origin, target, sizeFt, widthFt = 5 } = config;
  const sizePx = ftToPx(sizeFt, gridSize);

  if (shape === 'sphere') {
    // Circle / Sphere: Generate smooth 36-segment polygon
    const segments = 36;
    const points: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * 2 * Math.PI;
      const x = origin.x + sizePx * Math.cos(theta);
      const y = origin.y + sizePx * Math.sin(theta);
      points.push(x, y);
    }
    return points;
  }

  if (shape === 'cone') {
    // 5e Cone: Apex at origin, length L, width at end = L (half-angle ~26.56°, total arc ~53.13°)
    const tgt = target || { x: origin.x + sizePx, y: origin.y };
    const dx = tgt.x - origin.x;
    const dy = tgt.y - origin.y;
    const mainAngle = Math.atan2(dy, dx);
    const halfSpread = (26.565 * Math.PI) / 180;

    const points: number[] = [origin.x, origin.y];
    const arcSegments = 16;
    for (let i = 0; i <= arcSegments; i++) {
      const curAngle = mainAngle - halfSpread + (i / arcSegments) * (2 * halfSpread);
      const x = origin.x + sizePx * Math.cos(curAngle);
      const y = origin.y + sizePx * Math.sin(curAngle);
      points.push(x, y);
    }
    points.push(origin.x, origin.y);
    return points;
  }

  if (shape === 'cube') {
    // 5e Cube: origin is one corner or center
    const tgt = target || { x: origin.x + sizePx, y: origin.y };
    const dx = tgt.x - origin.x;
    const dy = tgt.y - origin.y;
    const angle = Math.atan2(dy, dx);
    const half = sizePx / 2;

    // Build box aligned along target direction or axis
    const localCorners = [
      { x: -half, y: -half },
      { x: half, y: -half },
      { x: half, y: half },
      { x: -half, y: half }
    ];

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const points: number[] = [];
    localCorners.forEach(c => {
      const rx = c.x * cos - c.y * sin + origin.x;
      const ry = c.x * sin + c.y * cos + origin.y;
      points.push(rx, ry);
    });
    // Close polygon
    points.push(points[0], points[1]);
    return points;
  }

  if (shape === 'line') {
    // 5e Line: starts at origin, extends distance sizePx with width widthPx
    const widthPx = ftToPx(widthFt, gridSize);
    const halfWidth = widthPx / 2;
    const tgt = target || { x: origin.x + sizePx, y: origin.y };
    const dx = tgt.x - origin.x;
    const dy = tgt.y - origin.y;
    const len = Math.hypot(dx, dy) || 1;
    const ndx = (dx / len);
    const ndy = (dy / len);
    // Normal vector perpendicular to line
    const px = -ndy * halfWidth;
    const py = ndx * halfWidth;

    const endX = origin.x + ndx * sizePx;
    const endY = origin.y + ndy * sizePx;

    return [
      origin.x + px, origin.y + py,
      endX + px, endY + py,
      endX - px, endY - py,
      origin.x - px, origin.y - py,
      origin.x + px, origin.y + py
    ];
  }

  return [];
}

/**
 * Detects all tokens caught inside the AOE template using Turf.js geometric intersection
 */
export function findTokensInsideAoe(
  tokens: Token[],
  config: AoeTemplateConfig,
  gridSize: number
): AoeTargetCheckResult[] {
  const polyPoints = generateAoePolygonPoints(config, gridSize);
  if (polyPoints.length < 6) return [];

  // Convert flat [x0, y0, x1, y1, ...] to Turf.js polygon coordinates [[[x, y], ...]]
  const ring: number[][] = [];
  for (let i = 0; i < polyPoints.length; i += 2) {
    ring.push([polyPoints[i], polyPoints[i + 1]]);
  }
  // Ensure ring is closed
  if (ring.length > 0) {
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push([first[0], first[1]]);
    }
  }

  let turfPoly: any;
  try {
    turfPoly = turf.polygon([ring]);
  } catch (err) {
    console.warn('[aoeGeometry] Failed to create Turf polygon:', err);
    return [];
  }

  const results: AoeTargetCheckResult[] = [];

  for (const token of tokens) {
    const tokenSize = token.size || 1;
    const tokenPx = tokenSize * gridSize;
    const radius = tokenPx / 2;
    const centerX = token.x + radius;
    const centerY = token.y + radius;

    // Check 1: Token center inside polygon
    const pt = turf.point([centerX, centerY]);
    let inside = turf.booleanPointInPolygon(pt, turfPoly);

    // Check 2: If center not inside, check 4 corners of token footprint (for large/huge creatures)
    if (!inside && tokenSize > 1) {
      const corners = [
        [token.x + 2, token.y + 2],
        [token.x + tokenPx - 2, token.y + 2],
        [token.x + tokenPx - 2, token.y + tokenPx - 2],
        [token.x + 2, token.y + tokenPx - 2]
      ];
      inside = corners.some(c => turf.booleanPointInPolygon(turf.point(c), turfPoly));
    }

    if (inside) {
      const distPx = Math.hypot(centerX - config.origin.x, centerY - config.origin.y);
      results.push({
        token,
        distanceFt: pxToFt(distPx, gridSize),
        isHit: true
      });
    }
  }

  return results;
}
