import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Image as KonvaImage } from 'react-konva';
import { Flame, Waves, Sparkles, Wind, CloudRain, Snowflake, Droplets, Trash2, X, Play, Pause, Plus, Eye, EyeOff, Sliders } from 'lucide-react';
import { WallSegment, AnimatedFeature, AnimatedFeatureType, WeatherEffectType } from '../types';
import { computeVisibilityPolygon, isPointInPolygon, VisibilityPolygon } from '../lib/visionEngine';

export type { AnimatedFeatureType, WeatherEffectType, AnimatedFeature };

/** Helper to calculate polygon area for degenerate polygon detection */
function calculatePolygonArea(pts: number[]): number {
  let area = 0;
  const len = pts.length;
  if (len < 6) return 0;
  for (let i = 0; i < len; i += 2) {
    const next = (i + 2) % len;
    area += pts[i] * pts[next + 1] - pts[next] * pts[i + 1];
  }
  return Math.abs(area) * 0.5;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  maxLife: number;
  life: number;
  color: string;
  type: 'ember' | 'spark' | 'smoke' | 'rain' | 'snow' | 'spore' | 'water_ripple' | 'magic';
}

interface AnimatedMapOverlayProps {
  enabled: boolean;
  features: AnimatedFeature[];
  weatherEffect?: WeatherEffectType;
  placingType: AnimatedFeatureType | null;
  onAddFeature?: (feature: AnimatedFeature) => void;
  onRemoveFeature?: (id: string) => void;
  onUpdateFeature?: (feature: AnimatedFeature) => void;
  onFeatureContextMenu?: (feature: AnimatedFeature, screenX: number, screenY: number) => void;
  showPlacementControls?: boolean;
  walls?: WallSegment[];
  mapDimensions?: { width: number; height: number };
  renderCanvas?: boolean;
  placingTemplate?: Partial<AnimatedFeature> | null;
  onDrawingStateChange?: (state: {
    isDrawing: boolean;
    count: number;
    canFinish: boolean;
    finish: () => void;
    undo: () => void;
    clear: () => void;
  }) => void;
  isDrawing?: boolean;
  isShiftPressed?: boolean;
  onPanMap?: (dx: number, dy: number) => void;
  onWheel?: (e: React.WheelEvent<HTMLDivElement>) => void;
}

// ---------------------------------------------------------------------------
// POLYGON SHAPE PRESETS & HELPERS (RIVER / WATER & MOLTEN LAVA)
// Coordinates are normalized relative to radius r (center at 0, 0)
// ---------------------------------------------------------------------------
export const WATER_POLYGON_PRESETS: Record<string, { label: string; points: number[] }> = {
  winding_river: {
    label: 'Winding River',
    points: [
      -1.4, -0.35,  -0.9, -0.22,  -0.4, -0.45,   0.1, -0.25,   0.6, -0.42,   1.1, -0.22,   1.4, -0.3,
       1.4,  0.28,   1.1,  0.38,   0.6,  0.18,   0.1,  0.35,  -0.4,  0.15,  -0.9,  0.38,  -1.4,  0.25
    ]
  },
  river_bend: {
    label: 'River Bend',
    points: [
      -1.3, -0.3,  -0.4, -0.3,   0.1, -0.1,   0.3,  0.4,   0.3,  1.3,
      -0.3,  1.3,  -0.3,  0.4,  -0.5,  0.2,  -1.3,  0.3
    ]
  },
  wide_lake: {
    label: 'Wide Lake',
    points: [
      -1.1, -0.4,  -0.7, -0.85,  -0.1, -0.95,   0.6, -0.7,   1.15, -0.35,
       1.2,  0.3,   0.8,  0.8,    0.1,  0.95,  -0.6,  0.8,  -1.15,  0.35
    ]
  },
  straight_canal: {
    label: 'Straight Canal',
    points: [
      -1.4, -0.35,   1.4, -0.35,   1.4,  0.35,  -1.4,  0.35
    ]
  }
};

export const LAVA_POLYGON_PRESETS: Record<string, { label: string; points: number[] }> = {
  volcanic_chasm: {
    label: 'Volcanic Chasm',
    points: [
      -1.3, -0.25,  -1.0, -0.45,  -0.65, -0.2,  -0.3, -0.5,   0.1, -0.18,   0.5, -0.48,   0.9, -0.22,   1.3, -0.35,
       1.3,  0.32,   0.95, 0.18,   0.6,  0.5,   0.2,  0.22,  -0.2, 0.48,  -0.6,  0.18,  -0.95, 0.42,  -1.3,  0.3
    ]
  },
  magma_fissure: {
    label: 'Magma Fissure',
    points: [
      -1.2, -0.15,  -0.7, -0.35,  -0.3, -0.15,  -0.1, -0.6,   0.15, -0.55,   0.0, -0.12,   0.6, -0.38,   1.2, -0.2,
       1.2,  0.22,   0.7,  0.4,    0.2,  0.15,   0.3,  0.65,   0.05, 0.6,   -0.1,  0.18,  -0.6,  0.35,  -1.2,  0.2
    ]
  },
  caldera: {
    label: 'Caldera',
    points: [
      -1.05, -0.35,  -0.65, -0.85,  -0.15, -0.95,   0.45, -0.8,   0.95, -0.45,  1.15, -0.05,
       1.05,  0.45,   0.65,  0.85,   0.1,   0.95,  -0.5,   0.8,  -0.95,  0.45, -1.15,  0.05
    ]
  },
  lava_river: {
    label: 'Lava River',
    points: [
      -1.35, -0.32,  -0.85, -0.18,  -0.35, -0.42,   0.15, -0.2,   0.65, -0.38,   1.15, -0.18,   1.35, -0.28,
       1.35,  0.3,    1.15,  0.4,    0.65,  0.2,    0.15,  0.38,  -0.35,  0.18,  -0.85,  0.4,   -1.35,  0.26
    ]
  }
};

/** Get screen-space polygon points for a feature, rotated and translated into canvas coordinates */
export function getFeaturePolygonPoints(
  feat: AnimatedFeature,
  cx: number,
  cy: number,
  r: number
): { x: number; y: number }[] {
  let relativePts: number[] | undefined = feat.polygonPoints;

  if (!relativePts || relativePts.length < 6) {
    if (feat.type === 'water') {
      const presetKey = feat.shapePreset || 'winding_river';
      relativePts = WATER_POLYGON_PRESETS[presetKey]?.points || WATER_POLYGON_PRESETS.winding_river.points;
    } else if (feat.type === 'lava') {
      const presetKey = feat.shapePreset || 'volcanic_chasm';
      relativePts = LAVA_POLYGON_PRESETS[presetKey]?.points || LAVA_POLYGON_PRESETS.volcanic_chasm.points;
    }
  }

  if (!relativePts || relativePts.length < 6) {
    return [];
  }

  const rotRad = ((feat.rotation || 0) * Math.PI) / 180;
  const cosR = Math.cos(rotRad);
  const sinR = Math.sin(rotRad);

  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < relativePts.length; i += 2) {
    const rx = relativePts[i] * r;
    const ry = relativePts[i + 1] * r;
    const wx = cx + (rx * cosR - ry * sinR);
    const wy = cy + (rx * sinR + ry * cosR);
    pts.push({ x: wx, y: wy });
  }
  return pts;
}

/** Helper to draw a closed polygon path */
function createPolygonPath(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]) {
  ctx.beginPath();
  if (pts.length === 0) return;
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.closePath();
}

// ---------------------------------------------------------------------------
// 1. RIVER / WATER RENDERER (Polygon Shaped with Flowing Currents & Caustics)
// ---------------------------------------------------------------------------
function drawWaterEffect(
  ctx: CanvasRenderingContext2D,
  feat: AnimatedFeature,
  cx: number,
  cy: number,
  r: number,
  intensity: number,
  spd: number,
  t: number
) {
  const rotRad = ((feat.rotation || 0) * Math.PI) / 180;
  const cosR = Math.cos(rotRad);
  const sinR = Math.sin(rotRad);

  ctx.save();

  // 1. Get polygon points for riverbed / water corridor
  const poly = getFeaturePolygonPoints(feat, cx, cy, r);

  if (poly.length >= 3) {
    createPolygonPath(ctx, poly);
    // Outer wet sand / riverbank rim
    ctx.strokeStyle = `rgba(15, 23, 42, ${0.75 * intensity})`;
    ctx.lineWidth = 10;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Sinuous shoreline foam line
    ctx.strokeStyle = `rgba(186, 230, 253, ${0.45 * intensity})`;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Clip all fluid surface animations to the river polygon
    ctx.save();
    ctx.clip();
  }

  // 2. Base Water Depths (Deep sapphire trench -> tropical cyan -> shallow aqua)
  const grad = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * 1.5);
  grad.addColorStop(0, `rgba(8, 47, 73, ${0.9 * intensity})`);
  grad.addColorStop(0.35, `rgba(14, 116, 144, ${0.8 * intensity})`);
  grad.addColorStop(0.7, `rgba(6, 182, 212, ${0.6 * intensity})`);
  grad.addColorStop(1, `rgba(56, 189, 248, ${0.35 * intensity})`);
  ctx.fillStyle = grad;

  if (poly.length >= 3) {
    createPolygonPath(ctx, poly);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Sinuous Caustic Net (Sunlight reflecting through undulating water)
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const causticRibbons = 6;
  for (let c = 0; c < causticRibbons; c++) {
    const latOffset = (c - causticRibbons / 2) * (r * 0.32);
    ctx.beginPath();
    ctx.strokeStyle = `rgba(186, 230, 253, ${(0.26 + Math.sin(t * 2.5 * spd + c) * 0.12) * intensity})`;
    ctx.lineWidth = 1.8;

    const steps = 22;
    for (let s = -steps; s <= steps; s++) {
      const uDist = (s / steps) * (r * 1.5);
      const vDist = latOffset + Math.sin((uDist / r) * 5 + t * 2.2 * spd + c) * (r * 0.08)
                              + Math.cos((uDist / r) * 9 - t * 1.6 * spd) * (r * 0.04);
      const wx = cx + (uDist * cosR - vDist * sinR);
      const wy = cy + (uDist * sinR + vDist * cosR);
      if (s === -steps) ctx.moveTo(wx, wy);
      else ctx.lineTo(wx, wy);
    }
    ctx.stroke();
  }

  // Cross-caustic diamond node highlights
  const crossPoints = 7;
  for (let cp = 0; cp < crossPoints; cp++) {
    const uPos = (((cp / crossPoints + t * 0.35 * spd) % 1.0) - 0.5) * (r * 2.2);
    const vPos = Math.sin(cp * 2.3 + t * 1.5 * spd) * (r * 0.45);
    const wx = cx + (uPos * cosR - vPos * sinR);
    const wy = cy + (uPos * sinR + vPos * cosR);
    const sparkleR = (2.5 + Math.sin(t * 4 * spd + cp * 1.7) * 1.5) * intensity;
    const causticGrad = ctx.createRadialGradient(wx, wy, 0, wx, wy, sparkleR * 2.5);
    causticGrad.addColorStop(0, `rgba(255, 255, 255, ${0.75 * intensity})`);
    causticGrad.addColorStop(0.5, `rgba(186, 230, 253, ${0.4 * intensity})`);
    causticGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');
    ctx.fillStyle = causticGrad;
    ctx.beginPath();
    ctx.arc(wx, wy, sparkleR * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 4. Directional Current Streamlines & Foam Strands
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const streamCount = 8;
  for (let s = 0; s < streamCount; s++) {
    const latOffset = ((s - streamCount / 2 + 0.5) / streamCount) * (r * 1.2);
    const progress = ((t * 0.75 * spd + s * 0.23) % 1.0);
    const uDist = (progress - 0.5) * (r * 2.6);
    const streamLen = r * 0.45;
    const vDist = latOffset + Math.sin((uDist / r) * 4 + t * 1.8 * spd) * (r * 0.08);

    const headX = cx + (uDist * cosR - vDist * sinR);
    const headY = cy + (uDist * sinR + vDist * cosR);
    const tailX = cx + ((uDist - streamLen) * cosR - vDist * sinR);
    const tailY = cy + ((uDist - streamLen) * sinR + vDist * cosR);

    const alpha = Math.sin(progress * Math.PI) * 0.6 * intensity;
    const streamGrad = ctx.createLinearGradient(tailX, tailY, headX, headY);
    streamGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    streamGrad.addColorStop(0.7, `rgba(224, 242, 254, ${alpha})`);
    streamGrad.addColorStop(1, `rgba(255, 255, 255, ${alpha * 1.2})`);

    ctx.strokeStyle = streamGrad;
    ctx.lineWidth = (1.4 + (s % 2) * 0.8) * intensity;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    const midU = uDist - streamLen * 0.5;
    const midV = vDist + Math.sin(t * 3 * spd + s) * 3;
    const midX = cx + (midU * cosR - midV * sinR);
    const midY = cy + (midU * sinR + midV * cosR);
    ctx.quadraticCurveTo(midX, midY, headX, headY);
    ctx.stroke();
  }
  ctx.restore();

  if (poly.length >= 3) {
    ctx.restore(); // Exit river clipping
  }

  // 5. Shoreline capillary expanding ripples
  ctx.save();
  const rippleRings = 2;
  for (let ri = 0; ri < rippleRings; ri++) {
    const phase = ((t * 0.45 * spd + ri / rippleRings) % 1.0);
    const alpha = (1 - phase) * 0.25 * intensity;
    ctx.strokeStyle = `rgba(186, 230, 253, ${alpha})`;
    ctx.lineWidth = 1.2;
    if (poly.length >= 3) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1 + phase * 0.12, 1 + phase * 0.12);
      ctx.translate(-cx, -cy);
      createPolygonPath(ctx, poly);
      ctx.stroke();
      ctx.restore();
    } else {
      const currentR = r * (0.8 + phase * 0.35);
      ctx.beginPath();
      ctx.ellipse(cx, cy, currentR * 1.2, currentR * 0.8, rotRad, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 2. MOLTEN LAVA RENDERER (Polygon Shaped Chasm with Basalt Plates & Fissures)
// ---------------------------------------------------------------------------
function drawLavaEffect(
  ctx: CanvasRenderingContext2D,
  feat: AnimatedFeature,
  cx: number,
  cy: number,
  r: number,
  intensity: number,
  spd: number,
  t: number
) {
  ctx.save();

  // 1. Get polygon points for volcanic chasm
  const poly = getFeaturePolygonPoints(feat, cx, cy, r);

  if (poly.length >= 3) {
    // Ambient Thermal Radiance radiating from chasm
    ctx.save();
    createPolygonPath(ctx, poly);
    ctx.shadowColor = 'rgba(239, 68, 68, 0.7)';
    ctx.shadowBlur = 30 * intensity;
    ctx.strokeStyle = `rgba(249, 115, 22, ${0.65 * intensity})`;
    ctx.lineWidth = 14;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();

    // Dark fractured cooled basalt rim around the chasm edge
    createPolygonPath(ctx, poly);
    ctx.strokeStyle = '#1a0b06';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Clip molten core to the chasm polygon
    ctx.save();
    ctx.clip();
  } else {
    const ambientGrad = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 1.35);
    ambientGrad.addColorStop(0, `rgba(249, 115, 22, ${0.45 * intensity})`);
    ambientGrad.addColorStop(0.5, `rgba(220, 38, 38, ${0.25 * intensity})`);
    ambientGrad.addColorStop(0.85, `rgba(127, 29, 29, ${0.1 * intensity})`);
    ambientGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = ambientGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.35, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Molten Magma Reservoir (Incandescent white-yellow to searing orange-red)
  const convection = 1 + Math.sin(t * 1.4 * spd + feat.x) * 0.05;
  const moltenR = r * 1.4 * convection;
  const lavaGrad = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, moltenR);
  lavaGrad.addColorStop(0, `rgba(255, 252, 210, ${0.98 * intensity})`);
  lavaGrad.addColorStop(0.2, `rgba(254, 215, 60, ${0.92 * intensity})`);
  lavaGrad.addColorStop(0.55, `rgba(249, 115, 22, ${0.85 * intensity})`);
  lavaGrad.addColorStop(0.85, `rgba(185, 28, 28, ${0.75 * intensity})`);
  lavaGrad.addColorStop(1, `rgba(69, 26, 3, ${0.6 * intensity})`);
  ctx.fillStyle = lavaGrad;

  if (poly.length >= 3) {
    createPolygonPath(ctx, poly);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy, r * convection, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Floating Basalt Crust Plates (Drifting obsidian slabs)
  const plateCount = 7;
  for (let p = 0; p < plateCount; p++) {
    const angle = (p / plateCount) * Math.PI * 2 + 0.3;
    const dist = r * (0.45 + (p % 3) * 0.15);
    const dx = Math.cos(t * 0.45 * spd + p * 1.2) * (r * 0.08);
    const dy = Math.sin(t * 0.4 * spd + p * 1.7) * (r * 0.08);
    const px = cx + Math.cos(angle) * dist + dx;
    const py = cy + Math.sin(angle) * dist + dy;
    const plateR = r * 0.28;
    const plateRot = Math.sin(t * 0.35 * spd + p) * 0.15;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(plateRot);

    ctx.beginPath();
    const vertices = 7;
    for (let v = 0; v < vertices; v++) {
      const vAngle = (v / vertices) * Math.PI * 2;
      const vNoise = 1 + Math.sin(v * 3 + p * 5) * 0.25;
      const vx = Math.cos(vAngle) * (plateR * vNoise);
      const vy = Math.sin(vAngle) * (plateR * vNoise);
      if (v === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();

    const crustGrad = ctx.createRadialGradient(0, 0, plateR * 0.2, 0, 0, plateR);
    crustGrad.addColorStop(0, '#1c0c08');
    crustGrad.addColorStop(0.7, '#2a110a');
    crustGrad.addColorStop(1, '#451a03');
    ctx.fillStyle = crustGrad;
    ctx.fill();

    ctx.strokeStyle = `rgba(234, 88, 12, ${0.45 * intensity})`;
    ctx.lineWidth = 1.0;
    ctx.stroke();

    ctx.restore();
  }

  // 4. Glowing Magma Fissures / Veins between plates
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let f = 0; f < plateCount; f++) {
    const fAngle = (f / plateCount) * Math.PI * 2 + t * 0.08 * spd;
    const startX = cx + Math.cos(fAngle) * (r * 0.15);
    const startY = cy + Math.sin(fAngle) * (r * 0.15);
    const midX = cx + Math.cos(fAngle + 0.25) * (r * 0.55);
    const midY = cy + Math.sin(fAngle + 0.25) * (r * 0.55);
    const endX = cx + Math.cos(fAngle) * (r * 0.95);
    const endY = cy + Math.sin(fAngle) * (r * 0.95);

    const fPulse = 0.5 + Math.sin(t * 3 * spd + f * 1.5) * 0.35;
    ctx.strokeStyle = `rgba(255, 240, 150, ${fPulse * intensity})`;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.stroke();

    ctx.strokeStyle = `rgba(249, 115, 22, ${fPulse * 0.6 * intensity})`;
    ctx.lineWidth = 5.0;
    ctx.stroke();
  }
  ctx.restore();

  // 5. Dynamic Erupting Magma Bubbles
  const bubbleCount = 5;
  for (let b = 0; b < bubbleCount; b++) {
    const bAngle = (b / bubbleCount) * Math.PI * 2 + b * 1.8;
    const bDist = r * (0.2 + (b % 3) * 0.25);
    const bx = cx + Math.cos(bAngle) * bDist;
    const by = cy + Math.sin(bAngle) * bDist;

    const bPhase = ((t * 0.65 * spd + b * 0.27) % 1.0);
    const maxBSize = (4 + (b % 3) * 2.5) * intensity;

    if (bPhase < 0.65) {
      const swell = Math.sin((bPhase / 0.65) * (Math.PI / 2));
      const bRadius = Math.max(1, maxBSize * swell);

      const bGrad = ctx.createRadialGradient(bx - bRadius * 0.3, by - bRadius * 0.3, 0, bx, by, bRadius);
      bGrad.addColorStop(0, `rgba(255, 255, 255, ${0.95 * intensity})`);
      bGrad.addColorStop(0.35, `rgba(254, 240, 138, ${0.9 * intensity})`);
      bGrad.addColorStop(0.7, `rgba(249, 115, 22, ${0.85 * intensity})`);
      bGrad.addColorStop(1, 'rgba(185, 28, 28, 0.7)');

      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.arc(bx, by, bRadius, 0, Math.PI * 2);
      ctx.fill();
    } else if (bPhase < 0.85) {
      const burstProgress = (bPhase - 0.65) / 0.2;
      const ringRadius = maxBSize + burstProgress * 7;
      const alpha = (1 - burstProgress) * 0.8 * intensity;

      ctx.strokeStyle = `rgba(255, 237, 74, ${alpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(bx, by, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  if (poly.length >= 3) {
    ctx.restore(); // Exit chasm clip
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 3. TORCH LIGHT RENDERER
// ---------------------------------------------------------------------------
function drawTorchEffect(
  ctx: CanvasRenderingContext2D,
  feat: AnimatedFeature,
  cx: number,
  cy: number,
  r: number,
  intensity: number,
  spd: number,
  t: number,
  visibilityPolygon?: VisibilityPolygon | null
) {
  // Harmonic multi-frequency flame flicker (natural organic non-periodic fire)
  const flicker = 0.93
    + Math.sin(t * 7.1 * spd) * 0.025
    + Math.sin(t * 13.7 * spd + feat.x) * 0.02
    + Math.sin(t * 23.3 * spd) * 0.015
    + Math.cos(t * 3.2 * spd) * 0.01;

  const swayX = Math.sin(t * 9 * spd) * 2.0 + Math.cos(t * 19 * spd + feat.y) * 1.2;

  // 1. Dynamic Tabletop Ambient Illumination (Atmospheric Candlelight/Torchlight Falloff)
  const ambientR = r * flicker * 1.35;
  // Refined inner core: significantly smaller than original 0.65 giant disc, but rich, warm, and radiant
  const brightR = Math.max(10, r * 0.42 * flicker);

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  // Respect Wall Field of Vision: Clip light to the raycasted visibility polygon against walls
  if (visibilityPolygon && visibilityPolygon.points && visibilityPolygon.points.length >= 6) {
    const pts = visibilityPolygon.points;
    const polyArea = calculatePolygonArea(pts);
    // Only clip if polygon is valid and non-degenerate; if torch is embedded on a wall, don't collapse into darkness
    if (polyArea > 50 && (isPointInPolygon(cx, cy, pts) || polyArea > (Math.PI * r * r * 0.15))) {
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) {
        ctx.lineTo(pts[i], pts[i + 1]);
      }
      ctx.closePath();
      ctx.clip();
    }
  }

  // A) Warm Ambient Glow (gentle feathered penumbra)
  const ambientGrad = ctx.createRadialGradient(cx, cy, brightR * 0.4, cx, cy, ambientR);
  ambientGrad.addColorStop(0, `rgba(245, 158, 11, ${0.40 * intensity})`);
  ambientGrad.addColorStop(0.35, `rgba(217, 119, 6, ${0.20 * intensity})`);
  ambientGrad.addColorStop(0.7, `rgba(180, 83, 9, ${0.07 * intensity})`);
  ambientGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = ambientGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, ambientR, 0, Math.PI * 2);
  ctx.fill();

  // B) Vibrant Inner Core Glow (rich warm golden corona around flame, not an oversized white disc)
  const brightGrad = ctx.createRadialGradient(cx, cy, 1, cx, cy, brightR);
  brightGrad.addColorStop(0, `rgba(255, 245, 180, ${0.75 * intensity})`);
  brightGrad.addColorStop(0.4, `rgba(255, 195, 60, ${0.42 * intensity})`);
  brightGrad.addColorStop(0.8, `rgba(245, 158, 11, ${0.14 * intensity})`);
  brightGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = brightGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, brightR, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore(); // screen & clip restore

  // 2. Physical Sconce Bracket / Torch Base Mount
  ctx.save();
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(cx, cy + 3, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Glowing charcoal/ember base at mount
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(cx, cy + 1, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // 3. Organic Dancing Flame Tongue (Teardrop Bezier Curves)
  const flameH = (13 + Math.sin(t * 14 * spd) * 2.8) * intensity;
  const flameW = (6 + Math.sin(t * 11 * spd) * 1.4) * intensity;
  const tipX = cx + swayX;
  const tipY = cy - flameH;

  // A) Outer Flame Envelope (Fiery Red-Orange)
  ctx.beginPath();
  ctx.moveTo(cx - flameW, cy);
  ctx.bezierCurveTo(
    cx - flameW * 1.2, cy - flameH * 0.45,
    tipX - flameW * 0.4, tipY + flameH * 0.25,
    tipX, tipY
  );
  ctx.bezierCurveTo(
    tipX + flameW * 0.4, tipY + flameH * 0.25,
    cx + flameW * 1.2, cy - flameH * 0.45,
    cx + flameW, cy
  );
  ctx.closePath();

  const outerFlameGrad = ctx.createLinearGradient(cx, cy, tipX, tipY);
  outerFlameGrad.addColorStop(0, '#f97316');
  outerFlameGrad.addColorStop(0.6, '#ea580c');
  outerFlameGrad.addColorStop(1, '#c2410c');
  ctx.fillStyle = outerFlameGrad;
  ctx.fill();

  // B) Mid Flame Body (Vibrant Amber-Gold)
  const midH = flameH * 0.7;
  const midW = flameW * 0.65;
  const midTipX = cx + swayX * 0.7;
  const midTipY = cy - midH;

  ctx.beginPath();
  ctx.moveTo(cx - midW, cy);
  ctx.bezierCurveTo(
    cx - midW * 1.1, cy - midH * 0.45,
    midTipX - midW * 0.3, midTipY + midH * 0.25,
    midTipX, midTipY
  );
  ctx.bezierCurveTo(
    midTipX + midW * 0.3, midTipY + midH * 0.25,
    cx + midW * 1.1, cy - midH * 0.45,
    cx + midW, cy
  );
  ctx.closePath();

  const midFlameGrad = ctx.createLinearGradient(cx, cy, midTipX, midTipY);
  midFlameGrad.addColorStop(0, '#fef08a');
  midFlameGrad.addColorStop(0.5, '#fbbf24');
  midFlameGrad.addColorStop(1, '#f59e0b');
  ctx.fillStyle = midFlameGrad;
  ctx.fill();

  // C) Incandescent White-Hot Nucleus
  const coreH = flameH * 0.38;
  const coreW = flameW * 0.38;
  ctx.beginPath();
  ctx.ellipse(cx + swayX * 0.2, cy - coreH * 0.5, coreW, coreH * 0.6, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // D) Detached Dancing Flame Lick
  if (Math.sin(t * 16 * spd) > 0.3) {
    const lickY = tipY - 4 - Math.sin(t * 18 * spd) * 3;
    const lickX = tipX + (Math.cos(t * 15 * spd) * 2);
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(lickX, lickY, 1.4 * intensity, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 4. ARCANE RUNE RENDERER
// ---------------------------------------------------------------------------
function drawArcaneEffect(
  ctx: CanvasRenderingContext2D,
  feat: AnimatedFeature,
  cx: number,
  cy: number,
  r: number,
  intensity: number,
  spd: number,
  t: number
) {
  ctx.save();

  // 1. Mystical Ground Energy Field (Ultraviolet -> Magenta -> Celestial Blue)
  const auraR = r * (0.95 + Math.sin(t * 2.2 * spd) * 0.05);
  const auraGrad = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, auraR);
  auraGrad.addColorStop(0, `rgba(232, 121, 249, ${0.5 * intensity})`);
  auraGrad.addColorStop(0.35, `rgba(168, 85, 247, ${0.35 * intensity})`);
  auraGrad.addColorStop(0.7, `rgba(59, 130, 246, ${0.2 * intensity})`);
  auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, auraR, 0, Math.PI * 2);
  ctx.fill();

  // 2. Concentric Outer Celestial Binding Ring with Ancient Glyphs
  const spinOuter = t * 0.2 * spd;
  const outerR = r * 0.85;

  ctx.strokeStyle = `rgba(233, 213, 255, ${0.85 * intensity})`;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(192, 132, 252, ${0.55 * intensity})`;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR * 0.94, 0, Math.PI * 2);
  ctx.stroke();

  // Celestial azimuth ticks along outer rim
  const tickCount = 24;
  for (let tk = 0; tk < tickCount; tk++) {
    const tkAng = (tk / tickCount) * Math.PI * 2 + spinOuter;
    const isMajor = tk % 3 === 0;
    const tkInR = outerR * (isMajor ? 0.88 : 0.92);
    ctx.strokeStyle = isMajor ? `rgba(255, 255, 255, ${0.8 * intensity})` : `rgba(216, 180, 254, ${0.5 * intensity})`;
    ctx.lineWidth = isMajor ? 1.4 : 0.8;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(tkAng) * tkInR, cy + Math.sin(tkAng) * tkInR);
    ctx.lineTo(cx + Math.cos(tkAng) * outerR, cy + Math.sin(tkAng) * outerR);
    ctx.stroke();
  }

  // 8 Rotating Ancient Runic Glyphs
  const runeCount = 8;
  for (let rn = 0; rn < runeCount; rn++) {
    const rnAng = (rn / runeCount) * Math.PI * 2 + spinOuter;
    const rx = cx + Math.cos(rnAng) * (outerR * 0.78);
    const ry = cy + Math.sin(rnAng) * (outerR * 0.78);

    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(rnAng + Math.PI / 2);

    const runeSize = (4 + (rn % 2)) * intensity;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 * intensity})`;
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    if (rn % 4 === 0) {
      // Dagaz / Hourglass rune
      ctx.moveTo(-runeSize, -runeSize);
      ctx.lineTo(runeSize, runeSize);
      ctx.lineTo(-runeSize, runeSize);
      ctx.lineTo(runeSize, -runeSize);
      ctx.closePath();
    } else if (rn % 4 === 1) {
      // Algiz / Horned rune
      ctx.moveTo(0, runeSize);
      ctx.lineTo(0, -runeSize);
      ctx.moveTo(-runeSize, -runeSize * 0.7);
      ctx.lineTo(0, -runeSize * 0.2);
      ctx.lineTo(runeSize, -runeSize * 0.7);
    } else if (rn % 4 === 2) {
      // Sowilo / Lightning chevron rune
      ctx.moveTo(-runeSize * 0.7, -runeSize);
      ctx.lineTo(runeSize * 0.7, -runeSize * 0.2);
      ctx.lineTo(-runeSize * 0.7, runeSize * 0.2);
      ctx.lineTo(runeSize * 0.7, runeSize);
    } else {
      // Ingwaz / Diamond rune
      ctx.moveTo(0, -runeSize);
      ctx.lineTo(runeSize * 0.8, 0);
      ctx.lineTo(0, runeSize);
      ctx.lineTo(-runeSize * 0.8, 0);
      ctx.closePath();
    }
    ctx.stroke();
    ctx.restore();
  }

  // 3. Counter-Rotating 8-Pointed Arcane Star Sigil (Octagram)
  const spinMid = -t * 0.35 * spd;
  const starR = r * 0.58;

  ctx.strokeStyle = `rgba(168, 85, 247, ${0.8 * intensity})`;
  ctx.lineWidth = 1.4;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(spinMid);
  ctx.strokeRect(-starR * 0.707, -starR * 0.707, starR * 1.414, starR * 1.414);

  ctx.rotate(Math.PI / 4);
  ctx.strokeStyle = `rgba(56, 189, 248, ${0.75 * intensity})`;
  ctx.strokeRect(-starR * 0.707, -starR * 0.707, starR * 1.414, starR * 1.414);

  // 8 Luminous Star Vertex Nodes
  for (let n = 0; n < 8; n++) {
    const nAng = (n / 8) * Math.PI * 2;
    const nx = Math.cos(nAng) * starR;
    const ny = Math.sin(nAng) * starR;
    const nodePulse = 1.5 + Math.sin(t * 5 * spd + n) * 0.8;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(nx, ny, 2 * intensity, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(232, 121, 249, ${0.6 * intensity})`;
    ctx.beginPath();
    ctx.arc(nx, ny, (3.5 + nodePulse) * intensity, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 4. Central Inner Focus Circle & Rotating Diamond Core
  const corePulse = 0.88 + Math.sin(t * 3 * spd) * 0.12;
  const innerR = r * 0.28 * corePulse;

  ctx.strokeStyle = `rgba(244, 114, 182, ${0.85 * intensity})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.stroke();

  const spinCore = t * 0.8 * spd;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(spinCore);

  const dSize = innerR * 0.65;
  ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * intensity})`;
  ctx.beginPath();
  ctx.moveTo(0, -dSize * 1.2);
  ctx.lineTo(dSize * 0.35, -dSize * 0.35);
  ctx.lineTo(dSize * 1.2, 0);
  ctx.lineTo(dSize * 0.35, dSize * 0.35);
  ctx.lineTo(0, dSize * 1.2);
  ctx.lineTo(-dSize * 0.35, dSize * 0.35);
  ctx.lineTo(-dSize * 1.2, 0);
  ctx.lineTo(-dSize * 0.35, -dSize * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 5. Concentric Expanding Mana Pulse Wave
  const surgePhase = ((t * 0.5 * spd) % 1.0);
  const surgeR = r * surgePhase;
  const surgeAlpha = Math.sin(surgePhase * Math.PI) * 0.65 * intensity;

  ctx.strokeStyle = `rgba(192, 132, 252, ${surgeAlpha})`;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(cx, cy, surgeR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore(); // screen restore
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 5. FOG BANK RENDERER (Volumetric Multi-Puff Cloud)
// ---------------------------------------------------------------------------
function drawFogEffect(
  ctx: CanvasRenderingContext2D,
  feat: AnimatedFeature,
  cx: number,
  cy: number,
  r: number,
  intensity: number,
  spd: number,
  t: number
) {
  ctx.save();

  const driftRad = ((feat.rotation || 0) * Math.PI) / 180;
  const windX = Math.cos(driftRad);
  const windY = Math.sin(driftRad);

  // 14 Volumetric Vapor Puffs (4 Core, 6 Mid, 4 Outer)
  const puffDefs = [
    { dist: 0.12, ang: 0.2, baseR: 0.55, speedMul: 0.8 },
    { dist: 0.18, ang: 1.8, baseR: 0.52, speedMul: 0.9 },
    { dist: 0.15, ang: 3.4, baseR: 0.58, speedMul: 0.75 },
    { dist: 0.20, ang: 5.0, baseR: 0.50, speedMul: 0.85 },
    { dist: 0.45, ang: 0.6, baseR: 0.46, speedMul: 1.0 },
    { dist: 0.50, ang: 1.7, baseR: 0.48, speedMul: 1.1 },
    { dist: 0.42, ang: 2.8, baseR: 0.44, speedMul: 0.95 },
    { dist: 0.52, ang: 3.9, baseR: 0.47, speedMul: 1.05 },
    { dist: 0.48, ang: 4.9, baseR: 0.45, speedMul: 1.0 },
    { dist: 0.55, ang: 5.8, baseR: 0.43, speedMul: 0.9 },
    { dist: 0.78, ang: 0.9, baseR: 0.38, speedMul: 1.2 },
    { dist: 0.82, ang: 2.4, baseR: 0.36, speedMul: 1.15 },
    { dist: 0.75, ang: 4.1, baseR: 0.40, speedMul: 1.25 },
    { dist: 0.80, ang: 5.4, baseR: 0.37, speedMul: 1.1 }
  ];

  for (let i = 0; i < puffDefs.length; i++) {
    const def = puffDefs[i];
    const timeFactor = t * 0.35 * spd * def.speedMul;
    const turbX = Math.sin(timeFactor + i * 1.5) * (r * 0.14) + windX * Math.sin(t * 0.2 * spd) * (r * 0.08);
    const turbY = Math.cos(timeFactor * 0.8 + i * 1.8) * (r * 0.12) + windY * Math.cos(t * 0.2 * spd) * (r * 0.08);

    const px = cx + Math.cos(def.ang) * (r * def.dist) + turbX;
    const py = cy + Math.sin(def.ang) * (r * def.dist) + turbY;

    const puffRadius = r * def.baseR * (0.9 + Math.sin(timeFactor * 1.3 + i * 2.1) * 0.12);

    const isCore = i < 4;
    const peakAlpha = (isCore ? 0.28 : 0.18) * intensity;
    const midAlpha = (isCore ? 0.14 : 0.08) * intensity;

    const puffGrad = ctx.createRadialGradient(px, py, 0, px, py, puffRadius);
    puffGrad.addColorStop(0, `rgba(240, 246, 255, ${peakAlpha})`);
    puffGrad.addColorStop(0.45, `rgba(220, 232, 248, ${midAlpha})`);
    puffGrad.addColorStop(0.8, `rgba(200, 215, 235, ${midAlpha * 0.4})`);
    puffGrad.addColorStop(1, 'rgba(180, 200, 225, 0)');

    ctx.fillStyle = puffGrad;
    ctx.beginPath();
    ctx.arc(px, py, puffRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Creeping Mist Tendrils along perimeter
  const tendrilCount = 4;
  for (let td = 0; td < tendrilCount; td++) {
    const baseAng = (td / tendrilCount) * Math.PI * 2 + t * 0.1 * spd;
    const startX = cx + Math.cos(baseAng) * (r * 0.6);
    const startY = cy + Math.sin(baseAng) * (r * 0.6);

    const cpAng = baseAng + 0.4 + Math.sin(t * 0.5 * spd + td) * 0.2;
    const cpX = cx + Math.cos(cpAng) * (r * 0.95);
    const cpY = cy + Math.sin(cpAng) * (r * 0.95);

    const endAng = baseAng + 0.9;
    const endX = cx + Math.cos(endAng) * (r * 0.75);
    const endY = cy + Math.sin(endAng) * (r * 0.75);

    const tPulse = (0.16 + Math.sin(t * 0.8 * spd + td) * 0.06) * intensity;
    ctx.strokeStyle = `rgba(245, 250, 255, ${tPulse})`;
    ctx.lineWidth = 4.0;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(cpX, cpY, endX, endY);
    ctx.stroke();
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 6. TOXIC / ACID SLIME POOL RENDERER
// ---------------------------------------------------------------------------
function drawToxicEffect(
  ctx: CanvasRenderingContext2D,
  feat: AnimatedFeature,
  cx: number,
  cy: number,
  r: number,
  intensity: number,
  spd: number,
  t: number
) {
  ctx.save();

  // 1. Corrosive Etched Rock Boundary (Acid burned terrain border)
  const segments = 24;
  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const ang = (i / segments) * Math.PI * 2;
    const noise = 1 + Math.sin(ang * 4 + t * 0.6 * spd) * 0.05 + Math.cos(ang * 7 - t * 0.4 * spd) * 0.03;
    const px = cx + Math.cos(ang) * (r * 0.94 * noise);
    const py = cy + Math.sin(ang) * (r * 0.94 * noise);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();

  // Sizzling acid etched rim
  ctx.strokeStyle = `rgba(20, 83, 45, ${0.85 * intensity})`; // Dark forest vitriol rim
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.strokeStyle = `rgba(163, 230, 53, ${0.5 * intensity})`; // Chartreuse caustic edge
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Clip to acid pool basin so contents bubble within
  ctx.save();
  ctx.clip();

  // 2. Base Caustic Vitriol Fluid (Deep viridian depths -> glowing chartreuse -> neon toxic highlights)
  const pulse = 1 + Math.sin(t * 1.8 * spd) * 0.03;
  const acidGrad = ctx.createRadialGradient(cx, cy, r * 0.08, cx, cy, r * 0.92 * pulse);
  acidGrad.addColorStop(0, `rgba(217, 249, 157, ${0.95 * intensity})`);   // Pale radiant lime center
  acidGrad.addColorStop(0.3, `rgba(132, 204, 22, ${0.88 * intensity})`);   // Vibrant toxic chartreuse
  acidGrad.addColorStop(0.65, `rgba(22, 101, 52, ${0.85 * intensity})`);   // Deep emerald vitriol
  acidGrad.addColorStop(1, `rgba(15, 23, 42, ${0.92 * intensity})`);      // Corroded dark bed
  ctx.fillStyle = acidGrad;
  ctx.fill();

  // 3. Swirling Toxic Sludge Currents
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const sludgeCount = 6;
  for (let s = 0; s < sludgeCount; s++) {
    const sAng = (s / sludgeCount) * Math.PI * 2 + t * 0.3 * spd;
    const sDist = r * (0.3 + (s % 3) * 0.2);
    const sx = cx + Math.cos(sAng) * sDist;
    const sy = cy + Math.sin(sAng) * sDist;

    ctx.strokeStyle = `rgba(190, 242, 100, ${(0.35 + Math.sin(t * 2.5 * spd + s) * 0.15) * intensity})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(sx, sy, r * 0.22, sAng, sAng + Math.PI * 1.2);
    ctx.stroke();
  }
  ctx.restore();

  // 4. Dynamic Popping Acid Blisters / Bubbles
  const bubbleCount = 6;
  for (let b = 0; b < bubbleCount; b++) {
    const bAng = (b / bubbleCount) * Math.PI * 2 + b * 2.3;
    const bDist = r * (0.15 + (b % 4) * 0.18);
    const bx = cx + Math.cos(bAng) * bDist;
    const by = cy + Math.sin(bAng) * bDist;

    const bPhase = ((t * 0.8 * spd + b * 0.17) % 1.0);
    const maxBSize = (5 + (b % 3) * 3) * intensity;

    if (bPhase < 0.7) {
      // Swelling blister with 3D specular highlight
      const swell = Math.sin((bPhase / 0.7) * (Math.PI / 2));
      const bR = Math.max(1, maxBSize * swell);

      const bGrad = ctx.createRadialGradient(bx - bR * 0.35, by - bR * 0.35, 0, bx, by, bR);
      bGrad.addColorStop(0, `rgba(255, 255, 255, ${0.95 * intensity})`);
      bGrad.addColorStop(0.3, `rgba(217, 249, 157, ${0.85 * intensity})`);
      bGrad.addColorStop(0.8, `rgba(101, 163, 13, ${0.8 * intensity})`);
      bGrad.addColorStop(1, 'rgba(20, 83, 45, 0.7)');

      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.arc(bx, by, bR, 0, Math.PI * 2);
      ctx.fill();

      // Specular glare dot
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(bx - bR * 0.3, by - bR * 0.3, Math.max(0.5, bR * 0.25), 0, Math.PI * 2);
      ctx.fill();
    } else if (bPhase < 0.9) {
      // Bursting droplet ring
      const burstProg = (bPhase - 0.7) / 0.2;
      const ringR = maxBSize + burstProg * 8;
      const alpha = (1 - burstProg) * 0.85 * intensity;

      ctx.strokeStyle = `rgba(217, 249, 157, ${alpha})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(bx, by, ringR, 0, Math.PI * 2);
      ctx.stroke();

      // Ejected micro splash droplets
      const splashCount = 4;
      for (let sp = 0; sp < splashCount; sp++) {
        const spAng = (sp / splashCount) * Math.PI * 2 + b;
        const spDist = ringR + burstProg * 4;
        ctx.fillStyle = `rgba(190, 242, 100, ${alpha})`;
        ctx.beginPath();
        ctx.arc(bx + Math.cos(spAng) * spDist, by + Math.sin(spAng) * spDist, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 5. Pulsing Subterranean Toxic Veins
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let v = 0; v < 4; v++) {
    const vAng = (v / 4) * Math.PI * 2 + t * 0.1 * spd;
    const vPulse = 0.4 + Math.sin(t * 3.5 * spd + v * 2) * 0.3;
    ctx.strokeStyle = `rgba(234, 179, 8, ${vPulse * 0.6 * intensity})`;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    const midX = cx + Math.cos(vAng + 0.3) * (r * 0.4);
    const midY = cy + Math.sin(vAng + 0.3) * (r * 0.4);
    const endX = cx + Math.cos(vAng) * (r * 0.8);
    const endY = cy + Math.sin(vAng) * (r * 0.8);
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore(); // Exit clip
  ctx.restore();
}

// ---------------------------------------------------------------------------
// CORE ANIMATED FEATURES & WEATHER RENDER PIPELINE
// ---------------------------------------------------------------------------
export function renderAnimatedFeaturesToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  features: AnimatedFeature[],
  weatherEffect: WeatherEffectType,
  walls: WallSegment[],
  mapDimensions: { width: number; height: number } | undefined,
  particles: Particle[],
  dt: number,
  t: number
): Particle[] {
  // Pre-scale walls into overlay canvas coordinates for field of vision raycasting
  const scaleX = mapDimensions && mapDimensions.width > 0 ? width / mapDimensions.width : 1;
  const scaleY = mapDimensions && mapDimensions.height > 0 ? height / mapDimensions.height : 1;
  const hasWalls = Boolean(walls && walls.length > 0 && mapDimensions && mapDimensions.width > 0);
  const scaledWalls: WallSegment[] = hasWalls
    ? walls.map(w => ({
        ...w,
        p1: { x: w.p1.x * scaleX, y: w.p1.y * scaleY },
        p2: { x: w.p2.x * scaleX, y: w.p2.y * scaleY }
      }))
    : [];

  const currentParticles = [...particles];

  // 1. Render Animated Placed Features
  for (const feat of features) {
    const cx = (feat.x / 100) * width;
    const cy = (feat.y / 100) * height;
    const r = (feat.radius / 100) * Math.min(width, height);
    const intensity = feat.intensity || 1.0;
    const spd = feat.speed || 1.0;
    const featOpacity = feat.opacity !== undefined ? feat.opacity : 1.0;

    ctx.save();
    ctx.globalAlpha = featOpacity;

    if (feat.type === 'lava') {
      drawLavaEffect(ctx, feat, cx, cy, r, intensity, spd, t);

      // Spawn rising embers from lava pool
      if (Math.random() < 0.35 * intensity) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * r * 0.75;
        currentParticles.push({
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * dist,
          vx: (Math.random() - 0.5) * 25,
          vy: -25 - Math.random() * 45,
          size: 1.5 + Math.random() * 2.5,
          alpha: 1,
          maxLife: 1.5 + Math.random() * 1.2,
          life: 0,
          color: Math.random() > 0.4 ? '#ff6a00' : '#ffd000',
          type: 'ember'
        });
      }
    } else if (feat.type === 'water') {
      drawWaterEffect(ctx, feat, cx, cy, r, intensity, spd, t);

      // Spawn drifting foam / water bubbles
      if (Math.random() < 0.25 * intensity) {
        const rotRad = ((feat.rotation || 0) * Math.PI) / 180;
        const uDist = -r * 0.7 + Math.random() * (r * 0.4);
        const vDist = (Math.random() - 0.5) * (r * 0.6);
        currentParticles.push({
          x: cx + (uDist * Math.cos(rotRad) - vDist * Math.sin(rotRad)),
          y: cy + (uDist * Math.sin(rotRad) + vDist * Math.cos(rotRad)),
          vx: Math.cos(rotRad) * (20 * spd) + (Math.random() - 0.5) * 6,
          vy: Math.sin(rotRad) * (20 * spd) + (Math.random() - 0.5) * 6,
          size: 2.0 + Math.random() * 2.5,
          alpha: 0.7,
          maxLife: 1.4 + Math.random() * 0.8,
          life: 0,
          color: '#e0f2fe',
          type: 'water_ripple'
        });
      }
    } else if (feat.type === 'torch') {
      let torchVisibilityPoly: VisibilityPolygon | null = null;
      if (hasWalls) {
        const ambientR = r * 1.35;
        torchVisibilityPoly = computeVisibilityPolygon(
          {
            id: feat.id,
            x: cx,
            y: cy,
            radiusPx: ambientR
          },
          scaledWalls,
          { width, height }
        );
      }

      drawTorchEffect(ctx, feat, cx, cy, r, intensity, spd, t, torchVisibilityPoly);

      // Spurt fine sparks and smoke
      if (Math.random() < 0.25 * intensity) {
        currentParticles.push({
          x: cx + (Math.random() - 0.5) * 4,
          y: cy - 6,
          vx: (Math.random() - 0.5) * 16,
          vy: -20 - Math.random() * 30,
          size: 1.2 + Math.random() * 1.8,
          alpha: 0.95,
          maxLife: 0.7 + Math.random() * 0.6,
          life: 0,
          color: Math.random() > 0.3 ? '#ffb703' : '#fb8500',
          type: 'spark'
        });
      }
      if (Math.random() < 0.1 * intensity) {
        currentParticles.push({
          x: cx + (Math.random() - 0.5) * 3,
          y: cy - 10,
          vx: (Math.random() - 0.5) * 8,
          vy: -12 - Math.random() * 15,
          size: 3 + Math.random() * 3,
          alpha: 0.35,
          maxLife: 1.2 + Math.random() * 0.8,
          life: 0,
          color: '#94a3b8',
          type: 'smoke'
        });
      }
    } else if (feat.type === 'arcane') {
      drawArcaneEffect(ctx, feat, cx, cy, r, intensity, spd, t);

      // Arcane mana motes floating upward
      if (Math.random() < 0.25 * intensity) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * (r * 0.6);
        currentParticles.push({
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * dist,
          vx: (Math.random() - 0.5) * 16,
          vy: -15 - Math.random() * 22,
          size: 1.8 + Math.random() * 2.2,
          alpha: 0.9,
          maxLife: 1.8,
          life: 0,
          color: Math.random() > 0.5 ? '#c084fc' : '#60a5fa',
          type: 'magic'
        });
      }
    } else if (feat.type === 'fog') {
      drawFogEffect(ctx, feat, cx, cy, r, intensity, spd, t);

      // Subtle drifting condensation specks
      if (Math.random() < 0.15 * intensity) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * (r * 0.7);
        const driftRad = ((feat.rotation || 0) * Math.PI) / 180;
        currentParticles.push({
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * dist,
          vx: Math.cos(driftRad) * 12 + (Math.random() - 0.5) * 6,
          vy: Math.sin(driftRad) * 12 + (Math.random() - 0.5) * 6,
          size: 2.5 + Math.random() * 2.5,
          alpha: 0.25,
          maxLife: 2.5,
          life: 0,
          color: '#e2e8f0',
          type: 'smoke'
        });
      }
    } else if (feat.type === 'toxic') {
      drawToxicEffect(ctx, feat, cx, cy, r, intensity, spd, t);

      // Rising toxic vapor motes
      if (Math.random() < 0.25 * intensity) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * (r * 0.65);
        currentParticles.push({
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * dist,
          vx: (Math.random() - 0.5) * 15,
          vy: -15 - Math.random() * 20,
          size: 2 + Math.random() * 2.5,
          alpha: 0.75,
          maxLife: 1.6,
          life: 0,
          color: '#a3e635',
          type: 'spore'
        });
      }
    }
    ctx.restore();
  }

  // 2. Global Environmental Weather Particles
  if (weatherEffect === 'rain') {
    const rainDropsToSpawn = Math.floor(width / 65);
    for (let i = 0; i < rainDropsToSpawn; i++) {
      currentParticles.push({
        x: Math.random() * width,
        y: -10,
        vx: -35 + (Math.random() - 0.5) * 10,
        vy: 450 + Math.random() * 120,
        size: 14 + Math.random() * 10,
        alpha: 0.55 + Math.random() * 0.25,
        maxLife: 1.0,
        life: 0,
        color: '#a5f3fc',
        type: 'rain'
      });
    }
  } else if (weatherEffect === 'snow') {
    if (Math.random() < 0.8) {
      currentParticles.push({
        x: Math.random() * width,
        y: -10,
        vx: (Math.random() - 0.5) * 35,
        vy: 35 + Math.random() * 45,
        size: 2 + Math.random() * 3,
        alpha: 0.75 + Math.random() * 0.25,
        maxLife: 10,
        life: 0,
        color: '#ffffff',
        type: 'snow'
      });
    }
  } else if (weatherEffect === 'embers') {
    if (Math.random() < 0.45) {
      currentParticles.push({
        x: Math.random() * width,
        y: height + 5,
        vx: (Math.random() - 0.5) * 40,
        vy: -40 - Math.random() * 50,
        size: 2 + Math.random() * 2.5,
        alpha: 0.9,
        maxLife: 3 + Math.random() * 2,
        life: 0,
        color: Math.random() > 0.5 ? '#ff5400' : '#ffbd00',
        type: 'ember'
      });
    }
  } else if (weatherEffect === 'spores') {
    if (Math.random() < 0.35) {
      currentParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 15,
        vy: -10 - Math.random() * 15,
        size: 2 + Math.random() * 2,
        alpha: 0.8,
        maxLife: 4 + Math.random() * 2,
        life: 0,
        color: Math.random() > 0.5 ? '#6ee7b7' : '#a7f3d0',
        type: 'spore'
      });
    }
  } else if (weatherEffect === 'fog') {
    ctx.save();
    const mistGrad = ctx.createLinearGradient(0, 0, width, height);
    const mistPulse = Math.sin(t * 0.5) * 0.05;
    mistGrad.addColorStop(0, `rgba(200, 220, 240, ${0.12 + mistPulse})`);
    mistGrad.addColorStop(0.5, `rgba(230, 240, 255, ${0.18 + mistPulse})`);
    mistGrad.addColorStop(1, `rgba(190, 210, 230, ${0.1 + mistPulse})`);
    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // 3. Update & Draw Particles (Capped at 300 to ensure constant 60 FPS)
  const particleCap = currentParticles.length > 300 ? currentParticles.slice(-300) : currentParticles;
  const activeParticles: Particle[] = [];
  ctx.save();
  for (const p of particleCap) {
    p.life += dt;
    if (p.life >= p.maxLife) continue;

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    const progress = p.life / p.maxLife;
    const currentAlpha = p.alpha * (1 - progress);

    if (p.type === 'rain') {
      ctx.strokeStyle = `rgba(165, 243, 252, ${currentAlpha})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + (p.vx / 25), p.y + p.size);
      ctx.stroke();
      if (p.y < height) activeParticles.push(p);
    } else if (p.type === 'snow') {
      p.x += Math.sin(t * 2 + p.y * 0.05) * 0.4;
      ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      if (p.y < height) activeParticles.push(p);
    } else if (p.type === 'ember') {
      p.x += Math.sin(t * 4 + p.y * 0.1) * 0.6;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = p.color;
      ctx.globalAlpha = currentAlpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - progress * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      activeParticles.push(p);
    } else if (p.type === 'spark') {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = p.color;
      ctx.globalAlpha = currentAlpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - progress * 0.4), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      activeParticles.push(p);
    } else if (p.type === 'smoke') {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = currentAlpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 + progress * 1.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      activeParticles.push(p);
    } else if (p.type === 'water_ripple') {
      ctx.save();
      ctx.strokeStyle = `rgba(224, 242, 254, ${currentAlpha * 0.7})`;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 + progress * 2.0), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      activeParticles.push(p);
    } else if (p.type === 'magic' || p.type === 'spore') {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = p.color;
      ctx.globalAlpha = currentAlpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      activeParticles.push(p);
    }
  }
  ctx.restore();
  return activeParticles;
}

// ---------------------------------------------------------------------------
// MAIN ANIMATED MAP OVERLAY COMPONENT
// ---------------------------------------------------------------------------
export const AnimatedMapOverlay: React.FC<AnimatedMapOverlayProps> = ({
  enabled,
  features,
  weatherEffect = 'none',
  placingType,
  onAddFeature,
  onRemoveFeature,
  onUpdateFeature,
  onFeatureContextMenu,
  showPlacementControls = false,
  walls = [],
  mapDimensions,
  renderCanvas = true,
  placingTemplate = null,
  isShiftPressed: propIsShiftPressed,
  onDrawingStateChange,
  onPanMap,
  onWheel
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastTimeRef = useRef<number>(performance.now());
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);

  // Polygon drawing state when placing water or lava
  const isDrawing = (placingType === 'water' || placingType === 'lava') && !placingTemplate;
  const [drawingVertices, setDrawingVertices] = useState<{ xPct: number; yPct: number }[]>([]);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Map panning with Shift key while drawing
  const [localShiftPressed, setLocalShiftPressed] = useState(false);
  const isShiftPressed = Boolean(propIsShiftPressed || localShiftPressed);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const wasPanningRef = useRef(false);

  // Stable mutable refs to prevent render loop cancellation on mouse moves or parent re-renders
  const featuresRef = useRef(features);
  featuresRef.current = features;

  const weatherEffectRef = useRef(weatherEffect);
  weatherEffectRef.current = weatherEffect;

  const wallsRef = useRef(walls);
  wallsRef.current = walls;

  const mapDimensionsRef = useRef(mapDimensions);
  mapDimensionsRef.current = mapDimensions;

  // Canvas resize with ResizeObserver and DPR handling
  useEffect(() => {
    if (!renderCanvas) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    const observer = new ResizeObserver(() => {
      resize();
    });
    observer.observe(container);
    resize();

    return () => {
      observer.disconnect();
    };
  }, [renderCanvas]);

  // Complete polygon drawing and create custom water or lava feature
  const completePolygon = useCallback(() => {
    if (drawingVertices.length < 3) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const ptsPx = drawingVertices.map(v => ({
      x: (v.xPct / 100) * rect.width,
      y: (v.yPct / 100) * rect.height
    }));

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of ptsPx) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const cxPx = (minX + maxX) / 2;
    const cyPx = (minY + maxY) / 2;

    let maxDistPx = 0;
    for (const p of ptsPx) {
      const d = Math.hypot(p.x - cxPx, p.y - cyPx);
      if (d > maxDistPx) maxDistPx = d;
    }
    const radiusPx = Math.max(25, maxDistPx * 1.05);

    const featXPct = Math.round(((cxPx / rect.width) * 100) * 10) / 10;
    const featYPct = Math.round(((cyPx / rect.height) * 100) * 10) / 10;
    const featRadiusPct = Math.round(((radiusPx / Math.min(rect.width, rect.height)) * 100) * 10) / 10;

    const relativePts: number[] = [];
    for (const p of ptsPx) {
      const dx = (p.x - cxPx) / radiusPx;
      const dy = (p.y - cyPx) / radiusPx;
      relativePts.push(Math.round(dx * 1000) / 1000, Math.round(dy * 1000) / 1000);
    }

    const newFeature: AnimatedFeature = {
      id: `anim-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: placingType as AnimatedFeatureType,
      x: featXPct,
      y: featYPct,
      radius: featRadiusPct,
      intensity: 1.0,
      speed: 1.0,
      rotation: 0,
      shapePreset: 'custom',
      polygonPoints: relativePts,
      opacity: 1.0
    };

    setDrawingVertices([]);
    setMousePos(null);
    onAddFeature?.(newFeature);
  }, [drawingVertices, placingType, onAddFeature]);

  const undoLastVertex = useCallback(() => {
    setDrawingVertices(prev => prev.slice(0, -1));
  }, []);

  const clearVertices = useCallback(() => {
    setDrawingVertices([]);
    setMousePos(null);
  }, []);

  // Broadcast drawing state to parent banner controls
  useEffect(() => {
    if (!onDrawingStateChange) return;
    onDrawingStateChange({
      isDrawing,
      count: drawingVertices.length,
      canFinish: drawingVertices.length >= 3,
      finish: completePolygon,
      undo: undoLastVertex,
      clear: clearVertices
    });
  }, [onDrawingStateChange, isDrawing, drawingVertices.length, completePolygon, undoLastVertex, clearVertices]);

  // Reset drawing if placing mode is exited
  useEffect(() => {
    if (!placingType) {
      setDrawingVertices([]);
      setMousePos(null);
    }
  }, [placingType]);

  // Global hotkeys while drawing polygon (Enter to complete, Backspace to undo, Esc to clear)
  useEffect(() => {
    if (!isDrawing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' ||
          document.activeElement.tagName === 'TEXTAREA')
      ) {
        return;
      }

      if (e.key === 'Enter') {
        if (drawingVertices.length >= 3) {
          e.preventDefault();
          completePolygon();
        }
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        if (drawingVertices.length > 0) {
          e.preventDefault();
          undoLastVertex();
        }
      } else if (e.key === 'Escape') {
        if (drawingVertices.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          clearVertices();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawing, drawingVertices.length, completePolygon, undoLastVertex, clearVertices]);

  // Track Shift key for panning while drawing without placing waypoints
  useEffect(() => {
    if (!isDrawing) {
      setLocalShiftPressed(false);
      setIsPanning(false);
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setLocalShiftPressed(true);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setLocalShiftPressed(false);
      }
    };

    const onBlur = () => {
      setLocalShiftPressed(false);
      setIsPanning(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [isDrawing]);

  // Window pointermove tracking so mousePos stays live & responsive even when overlay has pointer-events-none during Shift-drag
  useEffect(() => {
    if (!isDrawing) return;

    const handleWindowPointerMove = (e: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    return () => window.removeEventListener('pointermove', handleWindowPointerMove);
  }, [isDrawing]);

  // Animation render loop
  useEffect(() => {
    if (!enabled || !renderCanvas) {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    let isMounted = true;

    const render = (currentTime: number) => {
      if (!isMounted) return;

      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) {
        animFrameIdRef.current = requestAnimationFrame(render);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animFrameIdRef.current = requestAnimationFrame(render);
        return;
      }

      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const dpr = window.devicePixelRatio || 1;

      const dt = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = currentTime;
      const t = currentTime / 1000;

      // Set transform to handle high-DPI crystal-clear rendering
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // Render Animated Features, Environmental FX, and Particles
      particlesRef.current = renderAnimatedFeaturesToCanvas(
        ctx,
        width,
        height,
        featuresRef.current,
        weatherEffectRef.current,
        wallsRef.current,
        mapDimensionsRef.current,
        particlesRef.current,
        dt,
        t
      );

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    lastTimeRef.current = performance.now();
    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      isMounted = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [enabled, renderCanvas]);

  // Handle pointer down for Shift-pan or middle-click pan
  const handleContainerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // If drawing polygon and Shift is pressed (or middle click button === 1), pan the map
    const shouldPan = isDrawing && (e.shiftKey || isShiftPressed || e.button === 1);
    if (shouldPan) {
      e.preventDefault();
      e.stopPropagation();

      setIsPanning(true);
      wasPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY };

      const onWindowPointerMove = (moveEvt: PointerEvent) => {
        if (!panStartRef.current) return;
        const dx = moveEvt.clientX - panStartRef.current.x;
        const dy = moveEvt.clientY - panStartRef.current.y;
        panStartRef.current = { x: moveEvt.clientX, y: moveEvt.clientY };

        if (onPanMap && (dx !== 0 || dy !== 0)) {
          onPanMap(dx, dy);
        }
      };

      const onWindowPointerUp = () => {
        setIsPanning(false);
        panStartRef.current = null;
        window.removeEventListener('pointermove', onWindowPointerMove);
        window.removeEventListener('pointerup', onWindowPointerUp);
        // Retain wasPanningRef briefly so any trailing click is dropped
        setTimeout(() => {
          wasPanningRef.current = false;
        }, 120);
      };

      window.addEventListener('pointermove', onWindowPointerMove);
      window.addEventListener('pointerup', onWindowPointerUp);
    }
  };

  // Handle map click to place animated feature or add polygon vertex
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // If user is panning, holding Shift, or just released a pan drag, DO NOT add a waypoint!
    if (e.shiftKey || isShiftPressed || isPanning || wasPanningRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (!placingType || !onAddFeature) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const pctX = (clickX / rect.width) * 100;
    const pctY = (clickY / rect.height) * 100;

    // Custom polygon drawing for water or lava
    if (isDrawing) {
      // Check if user clicked near first vertex to close loop
      if (drawingVertices.length >= 3) {
        const v0 = drawingVertices[0];
        const v0PxX = (v0.xPct / 100) * rect.width;
        const v0PxY = (v0.yPct / 100) * rect.height;
        if (Math.hypot(clickX - v0PxX, clickY - v0PxY) <= 24) {
          completePolygon();
          return;
        }
      }

      // Avoid adding duplicate vertices on jitter
      if (drawingVertices.length > 0) {
        const lastV = drawingVertices[drawingVertices.length - 1];
        const lastPxX = (lastV.xPct / 100) * rect.width;
        const lastPxY = (lastV.yPct / 100) * rect.height;
        if (Math.hypot(clickX - lastPxX, clickY - lastPxY) < 8) {
          return;
        }
      }

      setDrawingVertices(prev => [...prev, { xPct: pctX, yPct: pctY }]);
      return;
    }

    // Default radius based on feature type
    let defaultRadius = 12;
    if (placingType === 'torch') defaultRadius = 8;
    if (placingType === 'lava') defaultRadius = 15;
    if (placingType === 'water') defaultRadius = 16;
    if (placingType === 'arcane') defaultRadius = 11;
    if (placingType === 'fog') defaultRadius = 22;
    if (placingType === 'toxic') defaultRadius = 14;

    const newFeature: AnimatedFeature = {
      id: `anim-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: placingType,
      x: Math.round(pctX * 10) / 10,
      y: Math.round(pctY * 10) / 10,
      radius: placingTemplate?.radius ?? defaultRadius,
      intensity: placingTemplate?.intensity ?? 1.0,
      speed: placingTemplate?.speed ?? 1.0,
      rotation: placingTemplate?.rotation ?? (placingType === 'water' ? 45 : 0),
      shapePreset: placingTemplate?.shapePreset,
      polygonPoints: placingTemplate?.polygonPoints ? [...placingTemplate.polygonPoints] : undefined,
      opacity: placingTemplate?.opacity ?? 1.0
    };

    onAddFeature(newFeature);
  };

  const handleContainerContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onFeatureContextMenu) return;
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const pctX = (clickX / rect.width) * 100;
    const pctY = (clickY / rect.height) * 100;

    const clicked = [...features].reverse().find(f => {
      const dist = Math.hypot(f.x - pctX, f.y - pctY);
      return dist <= f.radius;
    });

    if (clicked) {
      e.preventDefault();
      e.stopPropagation();
      onFeatureContextMenu(clicked, e.clientX, e.clientY);
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      onPointerDown={handleContainerPointerDown}
      onDoubleClick={(e) => {
        if (e.shiftKey || isShiftPressed || isPanning || wasPanningRef.current) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (isDrawing && drawingVertices.length >= 3) {
          e.preventDefault();
          e.stopPropagation();
          completePolygon();
        }
      }}
      onPointerMove={(e) => {
        if (!isDrawing) return;
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        setMousePos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }}
      onPointerLeave={() => {
        if (isDrawing) setMousePos(null);
      }}
      onWheel={(e) => {
        if (onWheel) onWheel(e);
      }}
      onContextMenu={handleContainerContextMenu}
      className={`absolute inset-0 rounded-xl overflow-hidden ${
        placingType ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
      style={{
        cursor: isPanning
          ? 'grabbing'
          : isDrawing && isShiftPressed
          ? 'grab'
          : placingType
          ? 'crosshair'
          : 'default'
      }}
    >
      {renderCanvas && (
        <canvas
          ref={canvasRef}
          className="w-full h-full pointer-events-none rounded-xl"
        />
      )}

      {/* Interactive Polygon Drawing Guide & Vertex Handles */}
      {isDrawing && drawingVertices.length > 0 && containerRef.current && (() => {
        const rect = containerRef.current.getBoundingClientRect();
        const ptsPx = drawingVertices.map(v => ({
          x: (v.xPct / 100) * rect.width,
          y: (v.yPct / 100) * rect.height
        }));

        const isNearFirst = ptsPx.length >= 3 && Boolean(mousePos && Math.hypot(mousePos.x - ptsPx[0].x, mousePos.y - ptsPx[0].y) <= 24);
        const strokeColor = placingType === 'water' ? '#38bdf8' : '#f97316';
        const fillColor = placingType === 'water' ? 'rgba(6, 182, 212, 0.25)' : 'rgba(249, 115, 22, 0.28)';

        const previewPoints = mousePos
          ? `${ptsPx.map(p => `${p.x},${p.y}`).join(' ')} ${mousePos.x},${mousePos.y}`
          : ptsPx.map(p => `${p.x},${p.y}`).join(' ');

        return (
          <div className="absolute inset-0 pointer-events-none z-30 overflow-visible">
            <svg className="w-full h-full pointer-events-none overflow-visible">
              {/* Shaded preview polygon fill */}
              {ptsPx.length >= 2 && (
                <polygon
                  points={previewPoints}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  opacity={0.8}
                />
              )}

              {/* Drawn boundary lines between confirmed vertices */}
              <polyline
                points={ptsPx.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={strokeColor}
                strokeWidth={3}
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {/* Dynamic rubber-band line from last vertex to current mouse position */}
              {mousePos && (
                <line
                  x1={ptsPx[ptsPx.length - 1].x}
                  y1={ptsPx[ptsPx.length - 1].y}
                  x2={mousePos.x}
                  y2={mousePos.y}
                  stroke={strokeColor}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  opacity={0.9}
                />
              )}

              {/* Closing guide line back to vertex 1 */}
              {mousePos && ptsPx.length >= 2 && (
                <line
                  x1={mousePos.x}
                  y1={mousePos.y}
                  x2={ptsPx[0].x}
                  y2={ptsPx[0].y}
                  stroke={isNearFirst ? '#10b981' : strokeColor}
                  strokeWidth={isNearFirst ? 3 : 1.5}
                  strokeDasharray={isNearFirst ? undefined : '3 3'}
                  opacity={isNearFirst ? 1 : 0.4}
                />
              )}
            </svg>

            {/* Vertex Badges */}
            {ptsPx.map((pt, idx) => {
              const isFirst = idx === 0;
              if (isFirst && isNearFirst && !isShiftPressed && !isPanning) {
                return (
                  <div
                    key={`draw-v-${idx}`}
                    style={{
                      left: `${pt.x}px`,
                      top: `${pt.y}px`,
                      transform: 'translate(-50%, -50%)'
                    }}
                    onClick={(e) => {
                      if (e.shiftKey || isShiftPressed || isPanning || wasPanningRef.current) return;
                      e.stopPropagation();
                      completePolygon();
                    }}
                    className="absolute pointer-events-auto cursor-pointer z-40"
                    title="Click to close polygon!"
                  >
                    <div className="w-7 h-7 rounded-full bg-emerald-500 border-2 border-white text-white font-extrabold flex items-center justify-center text-xs shadow-[0_0_15px_rgba(16,185,129,0.9)] animate-pulse ring-4 ring-emerald-300/60">
                      ✓
                    </div>
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-emerald-700 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap">
                      Close
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={`draw-v-${idx}`}
                  style={{
                    left: `${pt.x}px`,
                    top: `${pt.y}px`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  className="absolute pointer-events-none z-30"
                >
                  <div
                    className={`rounded-full border shadow flex items-center justify-center font-bold text-[9px] ${
                      isFirst
                        ? placingType === 'water'
                          ? 'w-5 h-5 bg-cyan-500 border-white text-white shadow-cyan-500/50'
                          : 'w-5 h-5 bg-orange-500 border-white text-white shadow-orange-500/50'
                        : placingType === 'water'
                        ? 'w-4 h-4 bg-sky-900 border-sky-400 text-sky-200'
                        : 'w-4 h-4 bg-orange-950 border-orange-400 text-amber-200'
                    }`}
                  >
                    {idx + 1}
                  </div>
                </div>
              );
            })}

            {/* Floating Mouse Instruction Tooltip */}
            {mousePos && (
              <div
                style={{
                  left: `${mousePos.x + 16}px`,
                  top: `${mousePos.y + 16}px`
                }}
                className="absolute pointer-events-none z-40 bg-zinc-950/90 text-zinc-100 border border-zinc-700/80 px-2 py-1 rounded text-[11px] font-mono shadow-xl backdrop-blur-sm whitespace-nowrap"
              >
                {isPanning ? (
                  <span className="text-amber-300 font-bold flex items-center gap-1">✋ Moving map...</span>
                ) : isShiftPressed ? (
                  <span className="text-amber-300 font-bold flex items-center gap-1">✋ Shift held • Drag map without placing points</span>
                ) : isNearFirst ? (
                  <span className="text-emerald-400 font-bold">✓ Click to close polygon</span>
                ) : ptsPx.length < 3 ? (
                  <span>Point #{ptsPx.length + 1} ({3 - ptsPx.length} more needed) • Hold Shift to move map</span>
                ) : (
                  <span>Point #{ptsPx.length + 1} • Click 1st point, dbl-click, or ↵ Enter • Hold Shift to move</span>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Helper before first vertex is placed */}
      {isDrawing && drawingVertices.length === 0 && mousePos && (
        <div
          style={{
            left: `${mousePos.x + 16}px`,
            top: `${mousePos.y + 16}px`
          }}
          className="absolute pointer-events-none z-40 bg-zinc-950/90 text-zinc-100 border border-zinc-700/80 px-2.5 py-1 rounded-md text-[11px] font-mono shadow-xl backdrop-blur-sm whitespace-nowrap"
        >
          {isPanning ? (
            <span className="text-amber-300 font-bold flex items-center gap-1">✋ Moving map...</span>
          ) : isShiftPressed ? (
            <span className="text-amber-300 font-bold flex items-center gap-1">✋ Shift held • Drag map without placing points</span>
          ) : (
            <span>Click to start drawing {placingType === 'water' ? 'water' : 'lava'} corridor • Hold Shift to move</span>
          )}
        </div>
      )}

      {/* Feature visual indicator badges when placing controls are active */}
      {showPlacementControls && features.map((feat) => {
        const isSelected = selectedFeatureId === feat.id;
        const iconColor =
          feat.type === 'lava'
            ? 'bg-orange-600 border-amber-400 text-yellow-200'
            : feat.type === 'water'
            ? 'bg-cyan-600 border-sky-300 text-cyan-100'
            : feat.type === 'torch'
            ? 'bg-amber-600 border-orange-300 text-white'
            : feat.type === 'arcane'
            ? 'bg-purple-600 border-fuchsia-300 text-purple-100'
            : feat.type === 'toxic'
            ? 'bg-lime-600 border-lime-300 text-lime-100'
            : 'bg-zinc-700 border-zinc-500 text-zinc-200';

        return (
          <React.Fragment key={feat.id}>
            {/* If selected and polygon feature (water or lava), show polygon boundary outline & draggable vertex handles */}
            {isSelected && (feat.type === 'water' || feat.type === 'lava') && containerRef.current && (() => {
              const rect = containerRef.current.getBoundingClientRect();
              const cx = (feat.x / 100) * rect.width;
              const cy = (feat.y / 100) * rect.height;
              const r = (feat.radius / 100) * Math.min(rect.width, rect.height);
              const polyPts = getFeaturePolygonPoints(feat, cx, cy, r);
              if (polyPts.length < 3) return null;

              return (
                <div className="absolute inset-0 pointer-events-none z-10 overflow-visible">
                  <svg className="w-full h-full pointer-events-none overflow-visible">
                    <polygon
                      points={polyPts.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke={feat.type === 'water' ? '#38bdf8' : '#f97316'}
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      opacity={0.85}
                    />
                  </svg>
                  {polyPts.map((pt, vIdx) => {
                    return (
                      <div
                        key={`v-${feat.id}-${vIdx}`}
                        style={{
                          left: `${pt.x}px`,
                          top: `${pt.y}px`,
                          transform: 'translate(-50%, -50%)'
                        }}
                        onPointerDown={(e) => {
                          if (e.button !== 0) return;
                          e.stopPropagation();
                          const container = containerRef.current;
                          if (!container) return;
                          const startRect = container.getBoundingClientRect();
                          const startCx = (feat.x / 100) * startRect.width;
                          const startCy = (feat.y / 100) * startRect.height;
                          const startR = (feat.radius / 100) * Math.min(startRect.width, startRect.height);
                          const rotRad = ((feat.rotation || 0) * Math.PI) / 180;
                          const cosNeg = Math.cos(-rotRad);
                          const sinNeg = Math.sin(-rotRad);

                          let currentPts = feat.polygonPoints;
                          if (!currentPts || currentPts.length < 6) {
                            if (feat.type === 'water') {
                              currentPts = [...(WATER_POLYGON_PRESETS[feat.shapePreset || 'winding_river']?.points || WATER_POLYGON_PRESETS.winding_river.points)];
                            } else {
                              currentPts = [...(LAVA_POLYGON_PRESETS[feat.shapePreset || 'volcanic_chasm']?.points || LAVA_POLYGON_PRESETS.volcanic_chasm.points)];
                            }
                          }

                          const onVertexMove = (moveEvt: PointerEvent) => {
                            const mx = moveEvt.clientX - startRect.left;
                            const my = moveEvt.clientY - startRect.top;
                            const relX = mx - startCx;
                            const relY = my - startCy;
                            const localX = (relX * cosNeg - relY * sinNeg) / startR;
                            const localY = (relX * sinNeg + relY * cosNeg) / startR;

                            const nextPts = [...currentPts];
                            nextPts[vIdx * 2] = Math.round(localX * 100) / 100;
                            nextPts[vIdx * 2 + 1] = Math.round(localY * 100) / 100;
                            if (onUpdateFeature) {
                              onUpdateFeature({ ...feat, polygonPoints: nextPts });
                            }
                          };

                          const onVertexUp = () => {
                            window.removeEventListener('pointermove', onVertexMove);
                            window.removeEventListener('pointerup', onVertexUp);
                          };

                          window.addEventListener('pointermove', onVertexMove);
                          window.addEventListener('pointerup', onVertexUp);
                        }}
                        className={`absolute w-3 h-3 rounded-full border-2 shadow cursor-move pointer-events-auto hover:scale-150 transition-transform ${
                          feat.type === 'water' ? 'bg-cyan-200 border-cyan-500' : 'bg-amber-200 border-orange-500'
                        }`}
                        title={`Drag vertex #${vIdx + 1} to reshape corridor`}
                      />
                    );
                  })}
                </div>
              );
            })()}

            <div
              style={{
                left: `${feat.x}%`,
                top: `${feat.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.stopPropagation();
                const container = containerRef.current;
                if (!container) return;
                const startRect = container.getBoundingClientRect();
                const startX = feat.x;
                const startY = feat.y;
                const mouseStartX = e.clientX;
                const mouseStartY = e.clientY;

                const onMove = (moveEvent: PointerEvent) => {
                  const dxPx = moveEvent.clientX - mouseStartX;
                  const dyPx = moveEvent.clientY - mouseStartY;
                  const dxPct = (dxPx / startRect.width) * 100;
                  const dyPct = (dyPx / startRect.height) * 100;
                  const newX = Math.min(100, Math.max(0, Math.round((startX + dxPct) * 10) / 10));
                  const newY = Math.min(100, Math.max(0, Math.round((startY + dyPct) * 10) / 10));
                  if (onUpdateFeature) {
                    onUpdateFeature({ ...feat, x: newX, y: newY });
                  }
                };

                const onUp = () => {
                  window.removeEventListener('pointermove', onMove);
                  window.removeEventListener('pointerup', onUp);
                };

                window.addEventListener('pointermove', onMove);
                window.addEventListener('pointerup', onUp);
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFeatureId(isSelected ? null : feat.id);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onFeatureContextMenu) {
                  onFeatureContextMenu(feat, e.clientX, e.clientY);
                }
              }}
              className="absolute group z-20 cursor-grab active:cursor-grabbing pointer-events-auto"
              title="Click or right-click to customize; drag to reposition"
            >
              <div
                className={`w-6 h-6 rounded-full border shadow-lg flex items-center justify-center transition-all ${iconColor} ${
                  isSelected ? 'ring-2 ring-white scale-125' : 'hover:scale-110'
                }`}
              >
                {feat.type === 'lava' && <Flame className="w-3.5 h-3.5" />}
                {feat.type === 'water' && <Waves className="w-3.5 h-3.5" />}
                {feat.type === 'torch' && <Flame className="w-3 h-3 text-amber-200" />}
                {feat.type === 'arcane' && <Sparkles className="w-3.5 h-3.5" />}
                {feat.type === 'fog' && <Wind className="w-3.5 h-3.5" />}
                {feat.type === 'toxic' && <Droplets className="w-3.5 h-3.5" />}
              </div>

              {/* Quick delete button */}
              {onRemoveFeature && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFeature(feat.id);
                  }}
                  className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 shadow"
                  title="Remove animated feature"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};


// ---------------------------------------------------------------------------
// KONVA LAYER COMPONENT FOR TACTICAL ANIMATED FEATURES & WEATHER
// Renders the animated canvas directly into a Konva <Layer> beneath Fog of War
// ---------------------------------------------------------------------------
export interface AnimatedFeaturesKonvaImageProps {
  enabled: boolean;
  features: AnimatedFeature[];
  weatherEffect?: WeatherEffectType;
  walls?: WallSegment[];
  mapDimensions: { width: number; height: number };
}

export const AnimatedFeaturesKonvaImage: React.FC<AnimatedFeaturesKonvaImageProps> = ({
  enabled,
  features,
  weatherEffect = 'none',
  walls = [],
  mapDimensions
}) => {
  const imageRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastTimeRef = useRef<number>(performance.now());

  // Stable mutable refs to prevent loop restarts on parent re-renders
  const featuresRef = useRef(features);
  featuresRef.current = features;

  const weatherEffectRef = useRef(weatherEffect);
  weatherEffectRef.current = weatherEffect;

  const wallsRef = useRef(walls);
  wallsRef.current = walls;

  const mapDimensionsRef = useRef(mapDimensions);
  mapDimensionsRef.current = mapDimensions;

  if (!canvasRef.current && typeof document !== 'undefined') {
    canvasRef.current = document.createElement('canvas');
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!enabled) {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      imageRef.current?.getLayer()?.batchDraw();
      return;
    }

    let isMounted = true;

    const render = (currentTime: number) => {
      if (!isMounted) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const currentFeatures = featuresRef.current;
      const currentWeather = weatherEffectRef.current;
      const currentDims = mapDimensionsRef.current;
      const width = Math.round(currentDims?.width || 0);
      const height = Math.round(currentDims?.height || 0);

      if (width <= 0 || height <= 0) {
        animFrameIdRef.current = requestAnimationFrame(render);
        return;
      }

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      if (currentFeatures.length === 0 && currentWeather === 'none') {
        ctx.clearRect(0, 0, width, height);
        imageRef.current?.getLayer()?.batchDraw();
        animFrameIdRef.current = requestAnimationFrame(render);
        return;
      }

      const dt = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = currentTime;
      const t = currentTime / 1000;

      ctx.clearRect(0, 0, width, height);

      particlesRef.current = renderAnimatedFeaturesToCanvas(
        ctx,
        width,
        height,
        currentFeatures,
        currentWeather,
        wallsRef.current,
        currentDims,
        particlesRef.current,
        dt,
        t
      );

      imageRef.current?.getLayer()?.batchDraw();
      animFrameIdRef.current = requestAnimationFrame(render);
    };

    lastTimeRef.current = performance.now();
    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      isMounted = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [enabled]);

  if (!canvasRef.current || !enabled || mapDimensions.width <= 0 || mapDimensions.height <= 0) return null;

  return (
    <KonvaImage
      ref={imageRef}
      name="animated-features-overlay"
      image={canvasRef.current}
      x={0}
      y={0}
      width={mapDimensions.width}
      height={mapDimensions.height}
      listening={false}
    />
  );
};
