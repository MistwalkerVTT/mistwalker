import { WallSegment, WallType, DoorState } from '../types';

export interface VisionSource {
  id: string;
  x: number;
  y: number;
  radiusPx: number; // in canvas pixels
  angleDegrees?: number; // e.g. 360 for circle, 90 for cone
  directionDegrees?: number; // e.g. 0 to 360 facing angle
  color?: string;
  dimRadiusPx?: number;
}

export interface RayHit {
  x: number;
  y: number;
  angle: number;
  distance: number;
}

export interface VisibilityPolygon {
  sourceId: string;
  points: number[]; // [x0, y0, x1, y1, ...]
  center: { x: number; y: number };
  radius: number;
}

/**
 * Checks if a wall segment occludes line of sight.
 * Normal walls, terrain walls, and closed/locked doors block vision.
 * Open doors do NOT block vision.
 */
export function isWallOccluding(wall: WallSegment): boolean {
  if (wall.wallType === 'door' || wall.wallType === 'secret_door') {
    return wall.doorState !== 'open';
  }
  return true;
}

/**
 * Fast Euclidean distance between two points.
 */
export function distanceBetween(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Fast ray-casting algorithm to test whether a 2D point (px, py) lies inside a polygon [x0, y0, x1, y1, ...]
 */
export function isPointInPolygon(px: number, py: number, poly: number[]): boolean {
  let inside = false;
  const len = poly.length;
  if (len < 6) return false;
  for (let i = 0, j = len - 2; i < len; j = i, i += 2) {
    const xi = poly[i], yi = poly[i + 1];
    const xj = poly[j], yj = poly[j + 1];
    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Distance from point (px, py) to line segment (p1, p2).
 */
export function distanceToSegment(
  px: number,
  py: number,
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const l2 = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
  if (l2 === 0) return distanceBetween(px, py, p1.x, p1.y);
  let t = ((px - p1.x) * (p2.x - p1.x) + (py - p1.y) * (p2.y - p1.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return distanceBetween(px, py, p1.x + t * (p2.x - p1.x), p1.y + t * (p2.y - p1.y));
}

/**
 * Raycast intersection against a 2D line segment.
 * Ray starts at (cx, cy) in direction (dx, dy).
 * Returns distance t along the ray (if hit between 0 and maxRadius), or null.
 */
/**
 * Raycast intersection against a 2D line segment.
 * Ray starts at (cx, cy) in direction (dx, dy).
 * Returns distance t along the ray (if hit between 0 and maxRadius), or null.
 */
function getRaySegmentIntersection(
  cx: number,
  cy: number,
  dx: number,
  dy: number,
  maxDistance: number,
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): { x: number; y: number; t: number } | null {
  const v1x = cx - p1.x;
  const v1y = cy - p1.y;
  const v2x = p2.x - p1.x;
  const v2y = p2.y - p1.y;
  const v3x = -dy;
  const v3y = dx;

  const dot = v2x * v3x + v2y * v3y;
  if (Math.abs(dot) < 0.000001) return null;

  const t1 = (v2x * v1y - v2y * v1x) / dot;
  const t2 = (v1x * v3x + v1y * v3y) / dot;

  // Endpoint tolerance ensures rays passing near connected wall corners never slip through microscopic cracks
  const t2Tol = 0.008;
  if (t1 >= 0 && t1 <= maxDistance && t2 >= -t2Tol && t2 <= 1 + t2Tol) {
    return {
      x: cx + t1 * dx,
      y: cy + t1 * dy,
      t: t1
    };
  }
  return null;
}

/**
 * Normalizes angle to range [-PI, PI].
 */
function normalizeAngle(angle: number): number {
  while (angle <= -Math.PI) angle += Math.PI * 2;
  while (angle > Math.PI) angle -= Math.PI * 2;
  return angle;
}


/**
 * Computes a 2D visibility polygon for a vision source against a set of wall segments.
 * Sweeps rays at wall endpoints, along wall faces, and samples circle / cone arcs.
 * Guaranteed never to leak past walls or through connected room corners.
 */
export function computeVisibilityPolygon(
  source: VisionSource,
  walls: WallSegment[],
  mapBounds?: { width: number; height: number }
): VisibilityPolygon {
  const { x: cx, y: cy, radiusPx: maxRadius } = source;
  const coneAngleDeg = source.angleDegrees !== undefined ? source.angleDegrees : 360;
  const dirAngleDeg = source.directionDegrees !== undefined ? source.directionDegrees : 0;
  const isOmnidirectional = coneAngleDeg >= 360;

  const dirAngleRad = (dirAngleDeg * Math.PI) / 180;
  const halfConeRad = ((coneAngleDeg / 2) * Math.PI) / 180;

  // 1. Filter walls that occlude and are within maxRadius + small margin
  const occludingWalls = walls.filter((wall) => {
    if (!isWallOccluding(wall)) return false;
    return distanceToSegment(cx, cy, wall.p1, wall.p2) <= maxRadius + 12;
  });

  // 2. Gather unique angles for raycasting
  const angleSet = new Set<number>();

  // Add boundary samples around the circle / cone (48 steps for smooth curvature)
  const circleSteps = isOmnidirectional ? 48 : Math.max(16, Math.round((coneAngleDeg / 360) * 48));
  const minAngle = isOmnidirectional ? -Math.PI : dirAngleRad - halfConeRad;
  const maxAngle = isOmnidirectional ? Math.PI : dirAngleRad + halfConeRad;
  const angleStep = (maxAngle - minAngle) / circleSteps;

  for (let i = 0; i <= circleSteps; i++) {
    const a = minAngle + i * angleStep;
    angleSet.add(normalizeAngle(a));
  }

  // Add ray angles towards wall endpoints and interior wall points
  const eps = 0.0001;
  for (const wall of occludingWalls) {
    // Also sample wall midpoints to guarantee long walls form flat, straight lines
    const midX = (wall.p1.x + wall.p2.x) / 2;
    const midY = (wall.p1.y + wall.p2.y) / 2;
    if (distanceBetween(cx, cy, midX, midY) <= maxRadius) {
      angleSet.add(normalizeAngle(Math.atan2(midY - cy, midX - cx)));
    }

    for (const pt of [wall.p1, wall.p2]) {
      const d = distanceBetween(cx, cy, pt.x, pt.y);
      if (d <= maxRadius + 2) {
        const rawAngle = Math.atan2(pt.y - cy, pt.x - cx);
        const diff = normalizeAngle(rawAngle - dirAngleRad);

        if (isOmnidirectional || Math.abs(diff) <= halfConeRad + 0.01) {
          angleSet.add(normalizeAngle(rawAngle));
          angleSet.add(normalizeAngle(rawAngle - eps));
          angleSet.add(normalizeAngle(rawAngle + eps));
        }
      }
    }
  }

  // Sort angles
  const angles = Array.from(angleSet).sort((a, b) => {
    if (!isOmnidirectional) {
      const diffA = normalizeAngle(a - minAngle);
      const diffB = normalizeAngle(b - minAngle);
      return diffA - diffB;
    }
    return a - b;
  });

  // 3. Cast rays for each angle
  const hits: RayHit[] = [];

  for (const angle of angles) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    let closestT = maxRadius;
    let hitX = cx + dx * maxRadius;
    let hitY = cy + dy * maxRadius;
    let hitOccludingWall = false;

    // Also clip against optional map bounds
    if (mapBounds) {
      if (dx > 0) {
        const t = (mapBounds.width - cx) / dx;
        if (t > 0 && t < closestT) { closestT = t; hitX = mapBounds.width; hitY = cy + dy * t; }
      } else if (dx < 0) {
        const t = (0 - cx) / dx;
        if (t > 0 && t < closestT) { closestT = t; hitX = 0; hitY = cy + dy * t; }
      }
      if (dy > 0) {
        const t = (mapBounds.height - cy) / dy;
        if (t > 0 && t < closestT) { closestT = t; hitX = cx + dx * t; hitY = mapBounds.height; }
      } else if (dy < 0) {
        const t = (0 - cy) / dy;
        if (t > 0 && t < closestT) { closestT = t; hitX = cx + dx * t; hitY = 0; }
      }
    }

    for (const wall of occludingWalls) {
      const hit = getRaySegmentIntersection(cx, cy, dx, dy, closestT, wall.p1, wall.p2);
      if (hit && hit.t < closestT) {
        closestT = hit.t;
        hitX = hit.x;
        hitY = hit.y;
        hitOccludingWall = true;
      }
    }

    // Sub-pixel pullback: If the ray was terminated by an occluding wall,
    // place the vertex slightly (0.5px) in front of the wall towards the vision origin.
    // This strictly prevents float rounding or antialiasing from bleeding onto the other side of the wall.
    if (hitOccludingWall && closestT > 1) {
      const buffer = Math.min(0.5, closestT * 0.005);
      hitX = cx + dx * (closestT - buffer);
      hitY = cy + dy * (closestT - buffer);
    }

    hits.push({
      x: hitX,
      y: hitY,
      angle,
      distance: closestT
    });
  }

  // 4. Construct polygon vertices
  const points: number[] = [];
  if (!isOmnidirectional) {
    points.push(cx, cy);
  }

  for (const hit of hits) {
    points.push(hit.x, hit.y);
  }

  return {
    sourceId: source.id,
    points,
    center: { x: cx, y: cy },
    radius: maxRadius
  };
}

/**
 * Grid snap utility: snaps a coordinate to the nearest grid line or intersection.
 */
export function snapToGrid(
  val: number,
  gridSize: number,
  gridOffset: number = 0,
  snapHalf: boolean = false
): number {
  const step = snapHalf ? gridSize / 2 : gridSize;
  const relative = val - gridOffset;
  const snapped = Math.round(relative / step) * step;
  return snapped + gridOffset;
}

/**
 * Snaps a 2D point (x, y) to the grid.
 */
export function snapPointToGrid(
  x: number,
  y: number,
  gridSize: number,
  offsetX: number = 0,
  offsetY: number = 0,
  snapHalf: boolean = false
): { x: number; y: number } {
  return {
    x: snapToGrid(x, gridSize, offsetX, snapHalf),
    y: snapToGrid(y, gridSize, offsetY, snapHalf)
  };
}

/**
 * Finds the nearest wall segment to a given click position within maxDistance.
 */
export function findNearestWall(
  x: number,
  y: number,
  walls: WallSegment[],
  maxDistance: number = 15
): { wall: WallSegment; distance: number } | null {
  let bestWall: WallSegment | null = null;
  let bestDistance = maxDistance;

  for (const wall of walls) {
    let d = distanceToSegment(x, y, wall.p1, wall.p2);
    // If door is open, also check distance to swung-open door leaf
    if ((wall.wallType === 'door' || wall.wallType === 'secret_door') && wall.doorState === 'open') {
      const L = distanceBetween(wall.p1.x, wall.p1.y, wall.p2.x, wall.p2.y);
      const theta = Math.atan2(wall.p2.y - wall.p1.y, wall.p2.x - wall.p1.x);
      const swingAngle = -Math.PI * 0.48; // ~86 degrees open
      const leafX = wall.p1.x + L * Math.cos(theta + swingAngle);
      const leafY = wall.p1.y + L * Math.sin(theta + swingAngle);
      const dLeaf = distanceToSegment(x, y, wall.p1, { x: leafX, y: leafY });
      if (dLeaf < d) {
        d = dLeaf;
      }
    }
    if (d < bestDistance) {
      bestDistance = d;
      bestWall = wall;
    }
  }

  return bestWall ? { wall: bestWall, distance: bestDistance } : null;
}

/**
 * Checks if two line segments (p1-p2 and p3-p4) intersect in 2D space.
 */
export function segmentsIntersect(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number }
): boolean {
  const ccw = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    c: { x: number; y: number }
  ) => (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);

  return (
    ccw(p1, p3, p4) !== ccw(p2, p3, p4) &&
    ccw(p1, p2, p3) !== ccw(p1, p2, p4)
  );
}
