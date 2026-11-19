export interface SpawnPoint {
  x: number;
  y: number;
}

export interface ExistingTokenRect {
  x: number;
  y: number;
  size?: number;
}

interface Pt {
  x: number;
  y: number;
}

/**
 * Ray-casting point-in-polygon check for pixel-space polygon vertices.
 */
function isPointInPolygon(px: number, py: number, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;

    const intersects =
      (yi > py) !== (yj > py) &&
      px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/**
 * Minimum distance from a point to any segment of a closed polygon.
 */
function minDistanceToPolygonEdges(px: number, py: number, poly: Pt[]): number {
  let minDistSq = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const ax = poly[j].x;
    const ay = poly[j].y;
    const bx = poly[i].x;
    const by = poly[i].y;

    const abx = bx - ax;
    const aby = by - ay;
    const lenSq = abx * abx + aby * aby;
    let t = 0;
    if (lenSq > 1e-9) {
      t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / lenSq));
    }
    const cx = ax + t * abx;
    const cy = ay + t * aby;
    const dx = px - cx;
    const dy = py - cy;
    const dSq = dx * dx + dy * dy;
    if (dSq < minDistSq) minDistSq = dSq;
  }
  return Math.sqrt(minDistSq);
}

/**
 * Area-weighted centroid via the shoelace formula (falls back to vertex average if degenerate).
 */
function computePolygonCentroid(poly: Pt[]): Pt {
  let twiceArea = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const x0 = poly[j].x;
    const y0 = poly[j].y;
    const x1 = poly[i].x;
    const y1 = poly[i].y;
    const cross = x0 * y1 - x1 * y0;
    twiceArea += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  if (Math.abs(twiceArea) > 1e-3) {
    return {
      x: cx / (3 * twiceArea),
      y: cy / (3 * twiceArea),
    };
  }
  let sumX = 0;
  let sumY = 0;
  for (const p of poly) {
    sumX += p.x;
    sumY += p.y;
  }
  return {
    x: sumX / poly.length,
    y: sumY / poly.length,
  };
}

/**
 * Finds the best top-left (x, y) spawn position for a token inside a room zone polygon.
 *
 * Strategy:
 * 1. Converts percentage polygonPoints into map pixel coordinates.
 * 2. Scans grid-aligned squares across the polygon's bounding box.
 * 3. Prefers spots where the token's circular footprint fits completely inside the polygon
 *    without overlapping any existing tokens, radiating outward from the polygon's interior center.
 * 4. Falls back to center-inside non-overlapping spots (for tight corridors / Large+ creatures),
 *    then half-grid fine sampling (for small/unaligned polygons), then least-crowded inside spots.
 */
export function findTokenSpawnPositionInPolygon(params: {
  polygonPoints: number[];
  mapW: number;
  mapH: number;
  tokenSize: number;
  gridSize: number;
  gridOffsetX?: number;
  gridOffsetY?: number;
  existingTokens: ExistingTokenRect[];
}): SpawnPoint | null {
  const {
    polygonPoints,
    mapW,
    mapH,
    tokenSize,
    gridSize,
    gridOffsetX = 0,
    gridOffsetY = 0,
    existingTokens,
  } = params;

  if (!polygonPoints || polygonPoints.length < 6 || mapW <= 0 || mapH <= 0) {
    return null;
  }

  const g = Math.max(20, gridSize || 50);
  const size = Math.max(0.5, tokenSize || 1);
  const tokW = size * g;
  const tokH = size * g;
  const halfW = tokW / 2;
  const halfH = tokH / 2;
  const footprintRadius = Math.min(halfW, halfH) * 0.82;

  const poly: Pt[] = [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < polygonPoints.length - 1; i += 2) {
    const px = (polygonPoints[i] / 100) * mapW;
    const py = (polygonPoints[i + 1] / 100) * mapH;
    poly.push({ x: px, y: py });
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  }

  if (poly.length < 3) return null;

  const isFootprintInside = (x: number, y: number): boolean => {
    const cx = x + halfW;
    const cy = y + halfH;
    if (!isPointInPolygon(cx, cy, poly)) return false;
    // Check 8 points on the token's circular perimeter so the token doesn't clip walls
    for (let k = 0; k < 8; k++) {
      const angle = (k * Math.PI) / 4;
      const sx = cx + Math.cos(angle) * footprintRadius;
      const sy = cy + Math.sin(angle) * footprintRadius;
      if (!isPointInPolygon(sx, sy, poly)) return false;
    }
    return true;
  };

  const countOverlaps = (x: number, y: number): number => {
    const pad = 2;
    const x1 = x + pad;
    const y1 = y + pad;
    const x2 = x + tokW - pad;
    const y2 = y + tokH - pad;
    let overlaps = 0;
    for (const t of existingTokens) {
      const tSize = Math.max(0.5, t.size || 1);
      const tx1 = t.x;
      const ty1 = t.y;
      const tx2 = t.x + tSize * g;
      const ty2 = t.y + tSize * g;
      if (x1 < tx2 && x2 > tx1 && y1 < ty2 && y2 > ty1) {
        overlaps++;
      }
    }
    return overlaps;
  };

  interface Candidate {
    x: number;
    y: number;
    cx: number;
    cy: number;
    fullInside: boolean;
    overlaps: number;
    edgeDist: number;
  }

  const collectCandidates = (stepSize: number): Candidate[] => {
    const results: Candidate[] = [];
    const startCol = Math.floor((minX - gridOffsetX) / stepSize) - 1;
    const endCol = Math.ceil((maxX - gridOffsetX) / stepSize);
    const startRow = Math.floor((minY - gridOffsetY) / stepSize) - 1;
    const endRow = Math.ceil((maxY - gridOffsetY) / stepSize);

    // Guard against extreme bounding boxes on huge maps
    const totalCols = endCol - startCol + 1;
    const totalRows = endRow - startRow + 1;
    const stride = totalCols * totalRows > 2500 ? Math.ceil(Math.sqrt((totalCols * totalRows) / 2500)) : 1;

    for (let row = startRow; row <= endRow; row += stride) {
      const y = gridOffsetY + row * stepSize;
      const cy = y + halfH;
      if (cy < minY || cy > maxY) continue;
      for (let col = startCol; col <= endCol; col += stride) {
        const x = gridOffsetX + col * stepSize;
        const cx = x + halfW;
        if (cx < minX || cx > maxX) continue;
        if (!isPointInPolygon(cx, cy, poly)) continue;

        const fullInside = isFootprintInside(x, y);
        const overlaps = countOverlaps(x, y);
        const edgeDist = minDistanceToPolygonEdges(cx, cy, poly);
        results.push({ x, y, cx, cy, fullInside, overlaps, edgeDist });
      }
    }
    return results;
  };

  let candidates = collectCandidates(g);
  const hasFreeCandidate = candidates.some(c => c.overlaps === 0);

  // If no grid-aligned open spot landed inside (e.g., small or oddly aligned room), try half-grid steps
  if (!hasFreeCandidate) {
    const fineCandidates = collectCandidates(Math.max(12, g / 2));
    if (fineCandidates.length > 0) {
      candidates = candidates.length > 0 ? [...candidates, ...fineCandidates] : fineCandidates;
    }
  }

  const centroid = computePolygonCentroid(poly);
  const centroidInside = isPointInPolygon(centroid.x, centroid.y, poly);

  if (candidates.length > 0) {
    // Choose interior anchor: use centroid if inside polygon, otherwise deepest interior point (handles L/U shapes)
    let anchor = centroid;
    if (!centroidInside) {
      let deepest = candidates[0];
      for (const c of candidates) {
        if (c.edgeDist > deepest.edgeDist) deepest = c;
      }
      anchor = { x: deepest.cx, y: deepest.cy };
    }

    const pickBest = (pool: Candidate[]): Candidate => {
      pool.sort((a, b) => {
        if (a.overlaps !== b.overlaps) return a.overlaps - b.overlaps;
        const da = (a.cx - anchor.x) ** 2 + (a.cy - anchor.y) ** 2;
        const db = (b.cx - anchor.x) ** 2 + (b.cy - anchor.y) ** 2;
        return da - db;
      });
      return pool[0];
    };

    const tier1 = candidates.filter(c => c.fullInside && c.overlaps === 0);
    if (tier1.length > 0) {
      const best = pickBest(tier1);
      return { x: Math.round(best.x), y: Math.round(best.y) };
    }

    const tier2 = candidates.filter(c => c.overlaps === 0);
    if (tier2.length > 0) {
      const best = pickBest(tier2);
      return { x: Math.round(best.x), y: Math.round(best.y) };
    }

    // Room is full: still prefer full-inside least-crowded spots over spilling outside the polygon
    const tier3 = candidates.filter(c => c.fullInside);
    const best = pickBest(tier3.length > 0 ? tier3 : candidates);
    return { x: Math.round(best.x), y: Math.round(best.y) };
  }

  // Fallback for ultra-tiny/degenerate polygons: center token on centroid
  return {
    x: Math.round(centroid.x - halfW),
    y: Math.round(centroid.y - halfH),
  };
}
