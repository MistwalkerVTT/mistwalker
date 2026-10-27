import polygonClipping, { Geom, MultiPolygon, Polygon, Ring } from 'polygon-clipping';

/**
 * Converts MistWalker flat point arrays [x0, y0, x1, y1, ...]
 * into a valid GeoJSON Ring [[x0, y0], [x1, y1], ...]
 */
export function flatToRing(flat: number[]): Ring {
  const ring: Ring = [];
  const len = flat.length;
  for (let i = 0; i < len; i += 2) {
    ring.push([flat[i], flat[i + 1]]);
  }
  // Ensure the ring is closed (first point === last point)
  if (ring.length > 0) {
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push([first[0], first[1]]);
    }
  }
  return ring;
}

/**
 * Converts a GeoJSON Ring [[x0, y0], [x1, y1], ...]
 * back into MistWalker flat point arrays [x0, y0, x1, y1, ...]
 */
export function ringToFlat(ring: Ring): number[] {
  const flat: number[] = [];
  for (const [x, y] of ring) {
    flat.push(x, y);
  }
  return flat;
}

/**
 * Merges multiple flat visibility polygons into a single clean MultiPolygon
 * using polygon-clipping union. This eliminates overlapping transparent meshes,
 * reduces draw calls, and removes visual seam artifacts between party members.
 */
export function unionFlatPolygons(flatPolys: number[][]): number[][] {
  if (!flatPolys || flatPolys.length === 0) return [];
  if (flatPolys.length === 1) return [flatPolys[0]];

  const validGeoms: Polygon[] = [];
  for (const flat of flatPolys) {
    if (flat.length >= 6) {
      const ring = flatToRing(flat);
      if (ring.length >= 4) {
        validGeoms.push([ring]);
      }
    }
  }

  if (validGeoms.length === 0) return [];
  if (validGeoms.length === 1) return [flatPolys[0]];

  try {
    const unioned: MultiPolygon = polygonClipping.union(validGeoms[0], ...validGeoms.slice(1));
    const resultFlats: number[][] = [];
    for (const poly of unioned) {
      for (const ring of poly) {
        if (ring.length >= 3) {
          resultFlats.push(ringToFlat(ring));
        }
      }
    }
    return resultFlats.length > 0 ? resultFlats : flatPolys;
  } catch (err) {
    console.warn('[polygonClippingService] union error, falling back:', err);
    return flatPolys;
  }
}

/**
 * Subtracts a clipping polygon (e.g. vision or reveal zone) from a subject polygon
 * (e.g. map bounding box or dark fog).
 */
export function differenceFlatPolygons(subjectFlat: number[], clipFlats: number[][]): number[][] {
  if (!subjectFlat || subjectFlat.length < 6) return [];
  if (!clipFlats || clipFlats.length === 0) return [subjectFlat];

  const subjectRing = flatToRing(subjectFlat);
  const subjectGeom: Polygon = [subjectRing];

  const clipGeoms: Polygon[] = [];
  for (const c of clipFlats) {
    if (c.length >= 6) {
      const r = flatToRing(c);
      if (r.length >= 4) clipGeoms.push([r]);
    }
  }

  if (clipGeoms.length === 0) return [subjectFlat];

  try {
    const diff: MultiPolygon = polygonClipping.difference(subjectGeom, ...clipGeoms);
    const resultFlats: number[][] = [];
    for (const poly of diff) {
      for (const ring of poly) {
        if (ring.length >= 3) {
          resultFlats.push(ringToFlat(ring));
        }
      }
    }
    return resultFlats;
  } catch (err) {
    console.warn('[polygonClippingService] difference error, falling back:', err);
    return [subjectFlat];
  }
}

/**
 * Efficiently accumulates newly explored vision into the persistent explored fog polygons.
 * Instead of keeping thousands of individual point records, this maintains a compact
 * vector representation of explored territory.
 */
export function accumulateExploredFog(
  existingExplored: number[][],
  newVisionPoly: number[]
): number[][] {
  if (!newVisionPoly || newVisionPoly.length < 6) return existingExplored;
  if (!existingExplored || existingExplored.length === 0) return [newVisionPoly];

  return unionFlatPolygons([...existingExplored, newVisionPoly]);
}
