import { WallSegment, AnimatedFeature } from '../types';

export interface UVTTResolution {
  map_origin?: { x: number; y: number };
  map_size: { x: number; y: number }; // In grid squares (columns, rows)
  pixels_per_grid: number;
}

export interface UVTTPoint {
  x: number;
  y: number;
}

export interface UVTTPortal {
  position?: UVTTPoint;
  bounds?: UVTTPoint[]; // 2 points defining the door threshold
  rotation?: number;
  closed?: boolean;
  freestanding?: boolean;
}

export interface UVTTLight {
  position: UVTTPoint;
  range: number; // in grid units
  intensity?: number;
  color?: string; // hex string e.g. "ffa64d" or "ffffa64d" (ARGB or RGB)
}

export interface UniversalVTTData {
  format?: number;
  resolution: UVTTResolution;
  line_of_sight?: UVTTPoint[][]; // array of polylines
  portals?: UVTTPortal[];
  lights?: UVTTLight[];
  environment?: {
    baked_lighting?: boolean;
    ambient_light?: string;
  };
  image: string; // base64 string
}

export interface ParsedUniversalVtt {
  imageFile: File;
  gridSize: number;
  gridCols: number;
  gridRows: number;
  pixelWidth: number;
  pixelHeight: number;
  walls: WallSegment[];
  animatedFeatures: AnimatedFeature[];
  metadata: {
    format?: number;
    wallCount: number;
    doorCount: number;
    lightCount: number;
    originalFileName: string;
  };
}

/**
 * Checks whether a given file is a Universal VTT file (.dd2vtt or .uvtt).
 */
export function isUniversalVttFile(file: File): boolean {
  if (!file) return false;
  const name = file.name.toLowerCase();
  return name.endsWith('.dd2vtt') || name.endsWith('.uvtt');
}

/**
 * Parses an ARGB or RGB hex string from Universal VTT into a standard CSS #rrggbb hex color.
 */
export function parseUvttColor(rawColor?: string): string {
  if (!rawColor) return '#f59e0b';
  let c = rawColor.trim().replace(/^#/, '');
  if (c.length === 8) {
    // ARGB format: first 2 characters are Alpha (e.g. "ffffa64d"), remainder is RGB
    c = c.slice(2);
  }
  if (c.length === 6) {
    return `#${c}`;
  }
  return '#f59e0b';
}

/**
 * Converts a base64 encoded image string (with or without data URI header) into a browser File object.
 */
export function base64ToImageFile(base64Str: string, baseFilename: string): File {
  let cleanBase64 = base64Str.trim();
  let mimeType = 'image/png';
  let ext = 'png';

  if (cleanBase64.startsWith('data:')) {
    const commaIdx = cleanBase64.indexOf(',');
    if (commaIdx !== -1) {
      const header = cleanBase64.slice(0, commaIdx);
      cleanBase64 = cleanBase64.slice(commaIdx + 1);
      const match = header.match(/data:(image\/[a-zA-Z0-9-+.]+);base64/);
      if (match) {
        mimeType = match[1];
      }
    }
  }

  // Sniff magic bytes if mimeType is still default
  if (mimeType === 'image/png') {
    if (cleanBase64.startsWith('/9j/')) {
      mimeType = 'image/jpeg';
      ext = 'jpg';
    } else if (cleanBase64.startsWith('UklGR')) {
      mimeType = 'image/webp';
      ext = 'webp';
    } else if (cleanBase64.startsWith('iVBORw')) {
      mimeType = 'image/png';
      ext = 'png';
    }
  } else {
    ext = mimeType.split('/')[1] || 'png';
  }

  // Decode base64 to binary
  const binaryString = atob(cleanBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const cleanName = baseFilename.replace(/\.(dd2vtt|uvtt|json)$/i, '') || 'battlemap';
  const fileName = `${cleanName}.${ext}`;
  const blob = new Blob([bytes], { type: mimeType });
  return new File([blob], fileName, { type: mimeType });
}

/**
 * Parses a Universal VTT (.dd2vtt / .uvtt) file and extracts the map image,
 * grid dimensions, walls, doors, and light sources.
 */
export async function parseUniversalVtt(file: File): Promise<ParsedUniversalVtt> {
  const text = await file.text();
  let data: UniversalVTTData;
  try {
    data = JSON.parse(text);
  } catch (err: any) {
    throw new Error(`Failed to parse Universal VTT JSON: ${err.message || 'Invalid JSON format'}`);
  }

  if (!data.resolution || !data.resolution.map_size || !data.resolution.pixels_per_grid) {
    throw new Error('Invalid Universal VTT file: missing resolution grid metadata');
  }

  if (!data.image) {
    throw new Error('Invalid Universal VTT file: missing map image data');
  }

  const gridCols = data.resolution.map_size.x;
  const gridRows = data.resolution.map_size.y;
  const pixelsPerGrid = Math.round(data.resolution.pixels_per_grid) || 140;

  const pixelWidth = Math.round(gridCols * pixelsPerGrid);
  const pixelHeight = Math.round(gridRows * pixelsPerGrid);

  // Convert embedded base64 image to File
  const imageFile = base64ToImageFile(data.image, file.name);

  const walls: WallSegment[] = [];

  // 1. Parse Line of Sight Walls
  if (Array.isArray(data.line_of_sight)) {
    for (const polyline of data.line_of_sight) {
      if (!Array.isArray(polyline) || polyline.length < 2) continue;

      for (let i = 0; i < polyline.length - 1; i++) {
        const ptA = polyline[i];
        const ptB = polyline[i + 1];

        const x1 = Math.round(ptA.x * pixelsPerGrid);
        const y1 = Math.round(ptA.y * pixelsPerGrid);
        const x2 = Math.round(ptB.x * pixelsPerGrid);
        const y2 = Math.round(ptB.y * pixelsPerGrid);

        // Filter out zero-length or sub-pixel segments
        if (Math.hypot(x2 - x1, y2 - y1) < 2) continue;

        walls.push({
          id: `wall_uvtt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          p1: { x: x1, y: y1 },
          p2: { x: x2, y: y2 },
          wallType: 'normal'
        });
      }
    }
  }

  // 2. Parse Portals (Doors)
  if (Array.isArray(data.portals)) {
    for (const portal of data.portals) {
      let x1 = 0, y1 = 0, x2 = 0, y2 = 0;

      if (Array.isArray(portal.bounds) && portal.bounds.length >= 2) {
        x1 = Math.round(portal.bounds[0].x * pixelsPerGrid);
        y1 = Math.round(portal.bounds[0].y * pixelsPerGrid);
        x2 = Math.round(portal.bounds[1].x * pixelsPerGrid);
        y2 = Math.round(portal.bounds[1].y * pixelsPerGrid);
      } else if (portal.position) {
        const angle = portal.rotation || 0;
        const halfGrid = 0.5 * pixelsPerGrid;
        const cx = portal.position.x * pixelsPerGrid;
        const cy = portal.position.y * pixelsPerGrid;
        const dx = Math.cos(angle) * halfGrid;
        const dy = Math.sin(angle) * halfGrid;
        x1 = Math.round(cx - dx);
        y1 = Math.round(cy - dy);
        x2 = Math.round(cx + dx);
        y2 = Math.round(cy + dy);
      } else {
        continue;
      }

      if (Math.hypot(x2 - x1, y2 - y1) < 2) continue;

      const isClosed = portal.closed !== false;
      walls.push({
        id: `door_uvtt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        p1: { x: x1, y: y1 },
        p2: { x: x2, y: y2 },
        wallType: 'door',
        doorState: isClosed ? 'closed' : 'open'
      });
    }
  }

  // 3. Parse Lights into AnimatedFeatures (Torches)
  const animatedFeatures: AnimatedFeature[] = [];
  if (Array.isArray(data.lights)) {
    data.lights.forEach((light, idx) => {
      if (!light.position) return;

      const pctX = (light.position.x / gridCols) * 100;
      const pctY = (light.position.y / gridRows) * 100;
      const lightRange = typeof light.range === 'number' && light.range > 0 ? light.range : 5;
      const pctRadius = (lightRange / gridCols) * 100;
      const color = parseUvttColor(light.color);

      animatedFeatures.push({
        id: `feat_uvtt_light_${Date.now()}_${idx}`,
        type: 'torch',
        x: Math.max(0, Math.min(100, Number(pctX.toFixed(2)))),
        y: Math.max(0, Math.min(100, Number(pctY.toFixed(2)))),
        radius: Math.max(2, Math.min(50, Number(pctRadius.toFixed(2)))),
        intensity: Math.max(0.5, Math.min(2.0, light.intensity ?? 1.0)),
        speed: 1.0,
        color: color,
        label: `UVTT Light #${idx + 1}`
      });
    });
  }

  const doorCount = walls.filter(w => w.wallType === 'door').length;
  const normalWallCount = walls.length - doorCount;

  return {
    imageFile,
    gridSize: pixelsPerGrid,
    gridCols,
    gridRows,
    pixelWidth,
    pixelHeight,
    walls,
    animatedFeatures,
    metadata: {
      format: data.format,
      wallCount: normalWallCount,
      doorCount,
      lightCount: animatedFeatures.length,
      originalFileName: file.name
    }
  };
}

export interface ExportUniversalVttParams {
  imageSrc: string;
  mapWidth: number;
  mapHeight: number;
  gridSize: number;
  walls: WallSegment[];
  animatedFeatures?: AnimatedFeature[];
  mapName?: string;
}

/**
 * Exports current MistWalker battlemap, walls, doors, and lights into a Universal VTT (.dd2vtt) file.
 */
export async function exportUniversalVtt(params: ExportUniversalVttParams): Promise<Blob> {
  const { imageSrc, mapWidth, mapHeight, gridSize, walls, animatedFeatures = [] } = params;

  const gridCols = Math.max(1, Math.round(mapWidth / gridSize));
  const gridRows = Math.max(1, Math.round(mapHeight / gridSize));

  // 1. Convert image to base64 string
  let base64Image = '';
  if (imageSrc.startsWith('data:image/')) {
    const comma = imageSrc.indexOf(',');
    base64Image = comma !== -1 ? imageSrc.slice(comma + 1) : imageSrc;
  } else {
    // Draw onto canvas to extract base64
    base64Image = await new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = mapWidth;
          canvas.height = mapHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas 2D context not available'));
            return;
          }
          ctx.drawImage(img, 0, 0, mapWidth, mapHeight);
          const dataUrl = canvas.toDataURL('image/png');
          const comma = dataUrl.indexOf(',');
          resolve(comma !== -1 ? dataUrl.slice(comma + 1) : dataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = (e) => reject(new Error('Failed to load map image for UVTT export'));
      img.src = imageSrc;
    });
  }

  // 2. Format Line of Sight
  const lineOfSight: UVTTPoint[][] = [];
  const portals: UVTTPortal[] = [];

  for (const wall of walls) {
    if (wall.wallType === 'door' || wall.wallType === 'secret_door') {
      portals.push({
        bounds: [
          { x: Number((wall.p1.x / gridSize).toFixed(3)), y: Number((wall.p1.y / gridSize).toFixed(3)) },
          { x: Number((wall.p2.x / gridSize).toFixed(3)), y: Number((wall.p2.y / gridSize).toFixed(3)) }
        ],
        closed: wall.doorState !== 'open'
      });
    } else {
      lineOfSight.push([
        { x: Number((wall.p1.x / gridSize).toFixed(3)), y: Number((wall.p1.y / gridSize).toFixed(3)) },
        { x: Number((wall.p2.x / gridSize).toFixed(3)), y: Number((wall.p2.y / gridSize).toFixed(3)) }
      ]);
    }
  }

  // 3. Format Lights
  const lights: UVTTLight[] = [];
  for (const feat of animatedFeatures) {
    if (feat.type === 'torch') {
      const posX = ((feat.x / 100) * mapWidth) / gridSize;
      const posY = ((feat.y / 100) * mapHeight) / gridSize;
      const range = ((feat.radius / 100) * mapWidth) / gridSize;
      const hexColor = (feat.color || '#f59e0b').replace(/^#/, '');

      lights.push({
        position: { x: Number(posX.toFixed(3)), y: Number(posY.toFixed(3)) },
        range: Number(range.toFixed(2)),
        intensity: feat.intensity ?? 1.0,
        color: `ff${hexColor}`
      });
    }
  }

  // 4. Assemble standard UVTT JSON
  const uvttJson: UniversalVTTData = {
    format: 0.2,
    resolution: {
      map_origin: { x: 0, y: 0 },
      map_size: { x: gridCols, y: gridRows },
      pixels_per_grid: gridSize
    },
    line_of_sight: lineOfSight,
    portals: portals,
    lights: lights,
    environment: {
      baked_lighting: true,
      ambient_light: 'ffffffff'
    },
    image: base64Image
  };

  const jsonString = JSON.stringify(uvttJson, null, 2);
  return new Blob([jsonString], { type: 'application/json' });
}

/**
 * Triggers a browser download of a Universal VTT file (.dd2vtt).
 */
export function downloadUniversalVttFile(blob: Blob, filename = 'battlemap.dd2vtt'): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.dd2vtt') ? filename : `${filename}.dd2vtt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
