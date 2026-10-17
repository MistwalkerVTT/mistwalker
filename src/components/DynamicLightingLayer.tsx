import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { Layer, Group, Rect, Circle, Line, Text, Shape } from 'react-konva';
import { WallSegment, VisionConfig, DoorState, WallType, CampaignMode, isMonsterToken, AnimatedFeature } from '../types';
import {
  computeVisibilityPolygon,
  VisionSource,
  VisibilityPolygon,
  snapPointToGrid,
  isPointInPolygon,
  segmentsIntersect,
  isLineOfSightBlocked,
  isWallOccluding
} from '../lib/visionEngine';

interface DynamicLightingLayerProps {
  walls: WallSegment[];
  tokens: any[];
  gridSize: number;
  mapDimensions: { width: number; height: number };
  isPlayerView?: boolean;
  claimedTokenId?: string | null;
  campaignMode?: CampaignMode;
  visionConfig: VisionConfig;
  stageScale: number;
  tool: string;
  selectedWallId: string | null;
  onSelectWall: (id: string | null) => void;
  onToggleDoor: (id: string) => void;
  onUpdateWall?: (wall: WallSegment) => void;
  onDeleteWall?: (id: string) => void;
  onSplitWall?: (id: string, splitPoint?: { x: number; y: number }) => void;
  isFogVisible: boolean;
  reveals: Array<{ x: number; y: number; radius: number }>;
  polygonReveals: number[][];
  wallDrawStart: { x: number; y: number } | null;
  mousePos: { x: number; y: number };
  gridOffsetX?: number;
  gridOffsetY?: number;
  snapToGridEnabled?: boolean;
  fogResetKey?: number;
  animatedFeatures?: AnimatedFeature[];
}

export const DynamicLightingLayer: React.FC<DynamicLightingLayerProps> = React.memo(({
  walls,
  tokens,
  gridSize,
  mapDimensions,
  isPlayerView = false,
  claimedTokenId = null,
  campaignMode = 'run',
  visionConfig,
  stageScale,
  tool,
  selectedWallId,
  onSelectWall,
  onToggleDoor,
  onUpdateWall,
  onDeleteWall,
  onSplitWall,
  isFogVisible,
  reveals,
  polygonReveals,
  wallDrawStart,
  mousePos,
  gridOffsetX = 0,
  gridOffsetY = 0,
  snapToGridEnabled = false,
  fogResetKey = 0,
  animatedFeatures = []
}) => {
  // Track hovered wall for eraser and visual feedback
  const [hoveredWallId, setHoveredWallId] = useState<string | null>(null);

  // Persistent memory of explored polygons across token movements
  const [exploredPolygons, setExploredPolygons] = useState<number[][]>([]);
  const lastVisionPositionsRef = useRef<string>('');

  // Reusable local scratch canvas for tight bounding-box blur (60 FPS high-performance feathering)
  const localScratchCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Smooth continuous door swinging progress [0 = fully closed, 1 = fully swung open on hinge]
  const [doorOpenProgress, setDoorOpenProgress] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const w of walls) {
      if (w.wallType === 'door' || w.wallType === 'secret_door') {
        initial[w.id] = w.doorState === 'open' ? 1 : 0;
      }
    }
    return initial;
  });

  // Animate door leaf swinging on hinge smoothly when toggled
  useEffect(() => {
    let animFrameId: number;
    let isRunning = true;

    const animateSwing = () => {
      let hasActiveTransition = false;
      setDoorOpenProgress((prev) => {
        let changed = false;
        const next = { ...prev };

        for (const wall of walls) {
          if (wall.wallType === 'door' || wall.wallType === 'secret_door') {
            const target = wall.doorState === 'open' ? 1 : 0;
            const current = next[wall.id] ?? (wall.doorState === 'open' ? 1 : 0);
            const diff = target - current;

            if (Math.abs(diff) > 0.008) {
              hasActiveTransition = true;
              // Smooth physical door swing easing
              const speed = Math.max(0.04, Math.abs(diff) * 0.22);
              const delta = Math.sign(diff) * Math.min(Math.abs(diff), speed);
              next[wall.id] = Math.max(0, Math.min(1, current + delta));
              changed = true;
            } else if (current !== target) {
              next[wall.id] = target;
              changed = true;
            }
          }
        }

        return changed ? next : prev;
      });

      if (hasActiveTransition && isRunning) {
        animFrameId = requestAnimationFrame(animateSwing);
      }
    };

    animFrameId = requestAnimationFrame(animateSwing);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animFrameId);
    };
  }, [walls]);

  // Convert player/vision tokens into VisionSources
  const visionSources: VisionSource[] = useMemo(() => {
    if (!visionConfig.enabled) return [];

    // In player view, show vision for player tokens (or explicitly marked player vision tokens)
    // Monster tokens strictly do NOT get vision and never pierce or remove fog of war
    const activeVisionTokens = tokens.filter((t) => {
      if (t.hidden && isPlayerView) return false;
      const isAlly = t.category === 'ally' || !!(t as any).allyId;
      const isMonster = !isAlly && (isMonsterToken(t) || t.isMonster === true || t.category === 'monster' || t.isPlayer === false);
      if (isMonster) return false;
      if (t.visionEnabled === false) return false;
      if (typeof t.visionRadius === 'number' && t.visionRadius <= 0) return false;

      // In Player View with a claimed character, only the claimed character (and its summons/allies) provides vision
      if (isPlayerView && claimedTokenId) {
        if (t.id === claimedTokenId) return true;
        if (isAlly && (t as any).ownerId === claimedTokenId) return true;
        return false;
      }

      if (t.visionEnabled !== undefined) return t.visionEnabled;
      return !isMonster || isAlly || t.isPlayer === true || t.category === 'character';
    });

    const sources: VisionSource[] = [];
    for (const t of activeVisionTokens) {
      const visionFeet = typeof t.visionRadius === 'number' ? t.visionRadius : 60;
      if (visionFeet <= 0) continue;
      const radiusPx = (visionFeet / 5) * gridSize;
      const angle = t.visionAngle !== undefined ? t.visionAngle : 360;
      const direction = t.visionDirection !== undefined ? t.visionDirection : 0;
      const tokenCenterOffset = (t.size * gridSize) / 2;

      sources.push({
        id: t.id,
        x: t.x + tokenCenterOffset,
        y: t.y + tokenCenterOffset,
        radiusPx,
        angleDegrees: angle,
        directionDegrees: direction,
        color: t.visionColor || '#ffd166'
      });
    }

    if (animatedFeatures) {
      for (const feat of animatedFeatures) {
        if (feat.type === 'torch') {
          const tx = (feat.x / 100) * mapDimensions.width;
          const ty = (feat.y / 100) * mapDimensions.height;

          // In player view, torches in unvisited/sealed rooms behind walls must NOT provide vision
          if (isPlayerView) {
            const hasLosToPlayer = activeVisionTokens.some(t => {
              const tX = t.x + ((t.size || 1) * gridSize) / 2;
              const tY = t.y + ((t.size || 1) * gridSize) / 2;
              const dist = Math.hypot(tX - tx, tY - ty);
              const maxRange = (((t.visionRadius || 60) / 5) * gridSize) + 60;
              if (dist > maxRange) return false;
              return !isLineOfSightBlocked({ x: tX, y: tY }, { x: tx, y: ty }, walls);
            });
            if (!hasLosToPlayer) {
              const inLegacyReveal = reveals.some(r => Math.hypot(tx - r.x, ty - r.y) <= r.radius) ||
                                     polygonReveals.some(p => p.length >= 6 && isPointInPolygon(tx, ty, p));
              if (!inLegacyReveal) continue;
            }
          }

          const tr = (feat.radius / 100) * Math.min(mapDimensions.width, mapDimensions.height) * 1.15;
          sources.push({
            id: `torch-${feat.id}`,
            x: tx,
            y: ty,
            radiusPx: tr,
            color: '#f59e0b'
          });
        }
      }
    }

    return sources;
  }, [tokens, gridSize, visionConfig.enabled, isPlayerView, claimedTokenId, animatedFeatures, mapDimensions, walls, reveals, polygonReveals]);

  // Compute 2D visibility polygons via raycasting
  const activeFovPolygons: VisibilityPolygon[] = useMemo(() => {
    if (!visionConfig.enabled || visionSources.length === 0) return [];
    return visionSources.map((source) =>
      computeVisibilityPolygon(source, walls, mapDimensions)
    );
  }, [visionSources, walls, mapDimensions, visionConfig.enabled]);

  // Reset explored memory whenever fog is reset, hidden, or exploration memory disabled
  useEffect(() => {
    setExploredPolygons([]);
    lastVisionPositionsRef.current = '';
  }, [fogResetKey, isFogVisible, visionConfig.enabled, visionConfig.explorationMemory]);

  // Accumulate exploration memory only as tokens move across the board
  useEffect(() => {
    if (!visionConfig.enabled || !visionConfig.explorationMemory || !isFogVisible || activeFovPolygons.length === 0) {
      return;
    }

    const currentPosKey = visionSources.map(s => `${s.id}:${Math.round(s.x)},${Math.round(s.y)}`).join('|');
    if (!currentPosKey) return;

    if (lastVisionPositionsRef.current === '') {
      // First position set
      lastVisionPositionsRef.current = currentPosKey;
      return;
    }

    if (currentPosKey !== lastVisionPositionsRef.current) {
      lastVisionPositionsRef.current = currentPosKey;
      const newPolys = activeFovPolygons.map(fov => [...fov.points]);
      setExploredPolygons(prev => {
        const next = [...prev, ...newPolys];
        if (next.length > 300) return next.slice(-200);
        return next;
      });
    }
  }, [activeFovPolygons, visionSources, visionConfig.enabled, visionConfig.explorationMemory, isFogVisible]);

  // Base darkness opacity
  const baseDarkness = isPlayerView
    ? (visionConfig.darknessOpacity ?? 1.0)
    : (visionConfig.dmPreviewMode ? 0.95 : 0.6);

  // Snapped mouse coordinates for wall drawing preview
  const snappedMousePos = useMemo(() => {
    if (!snapToGridEnabled) return mousePos;
    return snapPointToGrid(mousePos.x, mousePos.y, gridSize, gridOffsetX, gridOffsetY, false);
  }, [mousePos, gridSize, gridOffsetX, gridOffsetY, snapToGridEnabled]);

  const shouldRenderFog = isFogVisible;

  // Check if a point is revealed by the active fog of war (brush reveals, polygon reveals, or vision FOV)
  const isPointRevealed = useCallback((px: number, py: number): boolean => {
    if (!isFogVisible) return true;

    // 1. Check legacy circle brush reveals
    for (const rev of reveals) {
      const dx = px - rev.x;
      const dy = py - rev.y;
      if (dx * dx + dy * dy <= rev.radius * rev.radius) {
        return true;
      }
    }

    // 2. Check legacy polygon reveals
    for (const poly of polygonReveals) {
      if (poly.length >= 6 && isPointInPolygon(px, py, poly)) {
        return true;
      }
    }

    // 3. Check active dynamic FOV polygons
    if (visionConfig.enabled) {
      for (const fov of activeFovPolygons) {
        if (fov.points.length >= 6 && isPointInPolygon(px, py, fov.points)) {
          return true;
        }
      }

      // 4. Check exploration memory
      if (visionConfig.explorationMemory) {
        for (const poly of exploredPolygons) {
          if (poly.length >= 6 && isPointInPolygon(px, py, poly)) {
            return true;
          }
        }
      }
    }

    return false;
  }, [isFogVisible, reveals, polygonReveals, visionConfig.enabled, visionConfig.explorationMemory, activeFovPolygons, exploredPolygons]);

  // Check if a door/wall is revealed to player view through fog of war
  const isDoorRevealed = useCallback((wall: WallSegment): boolean => {
    if (!isFogVisible) return true;

    const dx = wall.p2.x - wall.p1.x;
    const dy = wall.p2.y - wall.p1.y;
    const len = Math.hypot(dx, dy);
    const nx = len > 0 ? (-dy / len) * 8 : 0;
    const ny = len > 0 ? (dx / len) * 8 : 0;

    const midX = (wall.p1.x + wall.p2.x) / 2;
    const midY = (wall.p1.y + wall.p2.y) / 2;

    // Direct points
    if (isPointRevealed(midX, midY)) return true;
    if (isPointRevealed(wall.p1.x, wall.p1.y)) return true;
    if (isPointRevealed(wall.p2.x, wall.p2.y)) return true;

    // Intermediate points along door threshold
    const p1x = wall.p1.x * 0.75 + wall.p2.x * 0.25;
    const p1y = wall.p1.y * 0.75 + wall.p2.y * 0.25;
    if (isPointRevealed(p1x, p1y)) return true;

    const p2x = wall.p1.x * 0.25 + wall.p2.x * 0.75;
    const p2y = wall.p1.y * 0.25 + wall.p2.y * 0.75;
    if (isPointRevealed(p2x, p2y)) return true;

    // Normal offsets on either room side of the door
    if (isPointRevealed(midX + nx, midY + ny)) return true;
    if (isPointRevealed(midX - nx, midY - ny)) return true;
    if (isPointRevealed(wall.p1.x + nx, wall.p1.y + ny)) return true;
    if (isPointRevealed(wall.p1.x - nx, wall.p1.y - ny)) return true;
    if (isPointRevealed(wall.p2.x + nx, wall.p2.y + ny)) return true;
    if (isPointRevealed(wall.p2.x - nx, wall.p2.y - ny)) return true;

    return false;
  }, [isFogVisible, isPointRevealed]);

  const fogFovLayer = shouldRenderFog && (
    <Layer id="fog-fov-layer" listening={false}>
      {/* Base Unexplored Pitch-Black Canvas */}
      <Rect
        x={0}
        y={0}
        width={mapDimensions.width}
        height={mapDimensions.height}
        fill="#050508"
        opacity={baseDarkness}
      />

      {/* Softened Fog Carve-Out with Gradient Opacity Blending */}
      <Shape
        listening={false}
        sceneFunc={(context) => {
          const ctx = context._context;
          if (!ctx) return;

          ctx.save();
          // Use destination-out to carve revealed visibility out of the black fog layer
          ctx.globalCompositeOperation = 'destination-out';

          // 1. Persistent Explored Memory (Dim / Revealed Territory with soft opacity)
          if (visionConfig.enabled && visionConfig.explorationMemory && exploredPolygons.length > 0) {
            ctx.save();
            ctx.globalAlpha = 0.65;
            ctx.fillStyle = '#ffffff';
            for (const pts of exploredPolygons) {
              if (!pts || pts.length < 6) continue;
              ctx.beginPath();
              ctx.moveTo(pts[0], pts[1]);
              for (let i = 2; i < pts.length; i += 2) {
                ctx.lineTo(pts[i], pts[i + 1]);
              }
              ctx.closePath();
              ctx.fill();
            }
            ctx.restore();
          }

          // 2. Brush reveals (Ultra-smooth natural radial gradient falloff)
          for (const rev of reveals) {
            const r = Math.max(1, rev.radius);
            const revGrad = ctx.createRadialGradient(rev.x, rev.y, 0, rev.x, rev.y, r);
            revGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
            revGrad.addColorStop(0.40, 'rgba(255, 255, 255, 0.98)');
            revGrad.addColorStop(0.60, 'rgba(255, 255, 255, 0.78)');
            revGrad.addColorStop(0.76, 'rgba(255, 255, 255, 0.45)');
            revGrad.addColorStop(0.88, 'rgba(255, 255, 255, 0.20)');
            revGrad.addColorStop(0.96, 'rgba(255, 255, 255, 0.05)');
            revGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.fillStyle = revGrad;
            ctx.beginPath();
            ctx.arc(rev.x, rev.y, r, 0, Math.PI * 2);
            ctx.fill();
          }

          // 3. Polygon reveals (Room reveals)
          ctx.fillStyle = '#ffffff';
          for (const poly of polygonReveals) {
            if (!poly || poly.length < 6) continue;
            ctx.beginPath();
            ctx.moveTo(poly[0], poly[1]);
            for (let i = 2; i < poly.length; i += 2) {
              ctx.lineTo(poly[i], poly[i + 1]);
            }
            ctx.closePath();
            ctx.fill();
          }

          // 4. Active Dynamic FOV Vision Polygons (Strict Wall Containment with Smooth Radial Gradient Falloff)
          if (visionConfig.enabled && activeFovPolygons.length > 0) {
            const dimMultiplier = typeof visionConfig.dimVisionOpacity === 'number'
              ? Math.max(0.1, Math.min(0.9, visionConfig.dimVisionOpacity))
              : 0.55;

            // Reusable scratch canvas for tight bounding-box carving
            if (!localScratchCanvasRef.current) {
              localScratchCanvasRef.current = document.createElement('canvas');
            }
            const scratchCanvas = localScratchCanvasRef.current;
            const pad = 8;

            for (const fov of activeFovPolygons) {
              if (!fov.points || fov.points.length < 6) continue;

              const cx = fov.center.x;
              const cy = fov.center.y;
              const maxR = fov.radius;
              if (maxR <= 0) continue;

              // Compute tight local bounding box for this light source (+ minimal padding)
              const minX = Math.max(0, Math.floor(cx - maxR - pad));
              const minY = Math.max(0, Math.floor(cy - maxR - pad));
              const limitW = Math.max(mapDimensions.width, Math.ceil(cx + maxR + pad));
              const limitH = Math.max(mapDimensions.height, Math.ceil(cy + maxR + pad));
              const maxX = Math.max(minX + 1, Math.min(limitW, Math.ceil(cx + maxR + pad)));
              const maxY = Math.max(minY + 1, Math.min(limitH, Math.ceil(cy + maxR + pad)));
              const boxW = maxX - minX;
              const boxH = maxY - minY;
              if (boxW <= 0 || boxH <= 0) continue;

              // Expand scratch canvas only if current bounding box is larger (zero reallocations during normal play)
              if (scratchCanvas.width < boxW || scratchCanvas.height < boxH) {
                scratchCanvas.width = Math.max(scratchCanvas.width, boxW);
                scratchCanvas.height = Math.max(scratchCanvas.height, boxH);
              }

              const scratchCtx = scratchCanvas.getContext('2d');
              if (!scratchCtx) continue;

              // Clear only the tight local sub-rectangle (sub-millisecond operation)
              scratchCtx.clearRect(0, 0, boxW, boxH);

              scratchCtx.save();
              scratchCtx.translate(-minX, -minY);

              // 4a. STRICT WALL CONTAINMENT: Clip directly to the visibility polygon!
              // Guaranteed by 2D geometry: NOT A SINGLE PIXEL can ever be carved outside fov.points!
              scratchCtx.beginPath();
              scratchCtx.moveTo(fov.points[0], fov.points[1]);
              for (let i = 2; i < fov.points.length; i += 2) {
                scratchCtx.lineTo(fov.points[i], fov.points[i + 1]);
              }
              scratchCtx.closePath();
              scratchCtx.clip();

              // 4b. Draw smooth radial gradient falloff inside the clipped polygon
              const fovGrad = scratchCtx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
              fovGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
              fovGrad.addColorStop(0.35, 'rgba(255, 255, 255, 1)');
              fovGrad.addColorStop(0.52, `rgba(255, 255, 255, ${Math.min(1, dimMultiplier * 1.65)})`);
              fovGrad.addColorStop(0.68, `rgba(255, 255, 255, ${dimMultiplier})`);
              fovGrad.addColorStop(0.80, `rgba(255, 255, 255, ${dimMultiplier * 0.60})`);
              fovGrad.addColorStop(0.90, `rgba(255, 255, 255, ${dimMultiplier * 0.25})`);
              fovGrad.addColorStop(0.96, `rgba(255, 255, 255, ${dimMultiplier * 0.06})`);
              fovGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

              scratchCtx.fillStyle = fovGrad;
              scratchCtx.beginPath();
              scratchCtx.arc(cx, cy, maxR, 0, Math.PI * 2);
              scratchCtx.fill();

              scratchCtx.restore(); // restore translate & clip

              // 4c. Carve this local vision source directly into the main fog layer with destination-out
              ctx.drawImage(scratchCanvas, 0, 0, boxW, boxH, minX, minY, boxW, boxH);
            }
          }

          ctx.restore();
        }}
      />
    </Layer>
  );

  const ambientLightingLayer = visionConfig.enabled && activeFovPolygons.length > 0 && (
    <Layer id="dynamic-lighting-ambient" listening={false}>
      {activeFovPolygons.map((fov) => {
        const src = visionSources.find(s => s.id === fov.sourceId);
        if (!src || !fov.points || fov.points.length < 6) return null;
        return (
          <Shape
            key={`light-glow-${src.id}`}
            listening={false}
            sceneFunc={(context) => {
              const ctx = context._context;
              if (!ctx) return;
              ctx.save();
              ctx.beginPath();
              ctx.moveTo(fov.points[0], fov.points[1]);
              for (let i = 2; i < fov.points.length; i += 2) {
                ctx.lineTo(fov.points[i], fov.points[i + 1]);
              }
              ctx.closePath();
              ctx.clip();

              const grad = ctx.createRadialGradient(src.x, src.y, 0, src.x, src.y, src.radiusPx);
              grad.addColorStop(0, 'rgba(255, 220, 140, 0.18)');
              grad.addColorStop(0.5, 'rgba(255, 180, 80, 0.08)');
              grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

              ctx.fillStyle = grad;
              ctx.beginPath();
              ctx.arc(src.x, src.y, src.radiusPx, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }}
          />
        );
      })}
    </Layer>
  );

  const wallsInteractiveLayer = (
    <Layer id="walls-interactive-layer">
      {walls.map((wall) => {
        const isSelected = wall.id === selectedWallId && campaignMode === 'creator';
        const isDoor = wall.wallType === 'door';
        const isSecretDoor = wall.wallType === 'secret_door';
        const isWindow = wall.wallType === 'window';
        const isDoorOpen = wall.doorState === 'open';
        const isDoorLocked = wall.doorState === 'locked';

        // In Run Campaign Mode, non-door lines are hidden; in Creator Mode, wall lines are visible
        const isRunMode = campaignMode === 'run';
        const isPlayer = isPlayerView || visionConfig.dmPreviewMode;

        // PLAYER VIEW: Doors and walls must NEVER be seen through the fog of war
        if (isPlayer && isFogVisible && !isDoorRevealed(wall)) {
          return null;
        }

        // SECRET DOOR PLAYER PERSPECTIVE:
        // "make it so to the players it looks like a wall."
        // When closed/locked, to players it looks identical to a standard wall:
        if (isSecretDoor && isPlayer && !isDoorOpen) {
          if (isRunMode) {
            return null; // In run mode, solid walls are hidden on map overlay
          }
          // In creator mode preview, render as regular solid wall line:
          return (
            <Group key={wall.id}>
              <Line
                points={[wall.p1.x, wall.p1.y, wall.p2.x, wall.p2.y]}
                stroke="#3b82f6"
                strokeWidth={3.5 / stageScale}
                listening={false}
              />
            </Group>
          );
        }

          if (isRunMode && !isDoor && !(isSecretDoor && !isPlayer)) {
            return null;
          }

          if (isDoor || isSecretDoor) {
            // Calculate hinged swinging door geometry
            const dx = wall.p2.x - wall.p1.x;
            const dy = wall.p2.y - wall.p1.y;
            const doorLength = Math.hypot(dx, dy);
            const baseAngle = Math.atan2(dy, dx);
            // ~86 degree swing open arc rotating around hinge wall.p1
            const SWING_ANGLE = -Math.PI * 0.48;
            const progress = doorOpenProgress[wall.id] ?? (isDoorOpen ? 1 : 0);
            const currentAngle = baseAngle + SWING_ANGLE * progress;

            const leafTip = {
              x: wall.p1.x + doorLength * Math.cos(currentAngle),
              y: wall.p1.y + doorLength * Math.sin(currentAngle)
            };

            const knobPos = {
              x: wall.p1.x + 0.82 * doorLength * Math.cos(currentAngle),
              y: wall.p1.y + 0.82 * doorLength * Math.sin(currentAngle)
            };

            const midX = (wall.p1.x + wall.p2.x) / 2;
            const midY = (wall.p1.y + wall.p2.y) / 2;

            const swingArcPoints: number[] = [];
            if (progress > 0.03) {
              const steps = 14;
              for (let s = 0; s <= steps; s++) {
                const t = (s / steps) * progress;
                const a = baseAngle + SWING_ANGLE * t;
                swingArcPoints.push(
                  wall.p1.x + doorLength * Math.cos(a),
                  wall.p1.y + doorLength * Math.sin(a)
                );
              }
            }

            const doorStrokeColor = isDoorOpen
              ? '#10b981'
              : isDoorLocked
              ? '#ef4444'
              : isSecretDoor
              ? '#a855f7'
              : isRunMode
              ? '#d97706'
              : '#f59e0b';

            return (
              <Group key={wall.id}>
                {/* 1. Clickable Hit Area on Threshold */}
                <Line
                  points={[wall.p1.x, wall.p1.y, wall.p2.x, wall.p2.y]}
                  stroke="transparent"
                  strokeWidth={(isRunMode ? 28 : 22) / stageScale}
                  onMouseEnter={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'pointer';
                    if (tool === 'erase_wall') setHoveredWallId(wall.id);
                  }}
                  onMouseLeave={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'default';
                    if (hoveredWallId === wall.id) setHoveredWallId(null);
                  }}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    if (tool === 'erase_wall') {
                      onDeleteWall?.(wall.id);
                    } else if (!isRunMode && tool === 'select') {
                      onSelectWall(wall.id);
                    } else {
                      onToggleDoor(wall.id);
                    }
                  }}
                  onTap={(e) => {
                    e.cancelBubble = true;
                    if (tool === 'erase_wall') {
                      onDeleteWall?.(wall.id);
                    } else if (!isRunMode && tool === 'select') {
                      onSelectWall(wall.id);
                    } else {
                      onToggleDoor(wall.id);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.evt.preventDefault();
                    e.cancelBubble = true;
                  }}
                />

                {/* 2. Clickable Hit Area on Swung Door Leaf */}
                <Line
                  points={[wall.p1.x, wall.p1.y, leafTip.x, leafTip.y]}
                  stroke="transparent"
                  strokeWidth={(isRunMode ? 28 : 22) / stageScale}
                  onMouseEnter={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'pointer';
                    if (tool === 'erase_wall') setHoveredWallId(wall.id);
                  }}
                  onMouseLeave={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'default';
                    if (hoveredWallId === wall.id) setHoveredWallId(null);
                  }}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    if (tool === 'erase_wall') {
                      onDeleteWall?.(wall.id);
                    } else {
                      onToggleDoor(wall.id);
                    }
                  }}
                  onTap={(e) => {
                    e.cancelBubble = true;
                    if (tool === 'erase_wall') {
                      onDeleteWall?.(wall.id);
                    } else {
                      onToggleDoor(wall.id);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.evt.preventDefault();
                    e.cancelBubble = true;
                  }}
                />

                {/* 3. Doorway Sill Threshold & Architectural Swing Arc (visible when swinging or open) */}
                {progress > 0.03 && (
                  <>
                    <Line
                      points={[wall.p1.x, wall.p1.y, wall.p2.x, wall.p2.y]}
                      stroke="#52525b"
                      strokeWidth={1.8 / stageScale}
                      dash={[4 / stageScale, 4 / stageScale]}
                      opacity={0.65}
                      listening={false}
                    />
                    {swingArcPoints.length > 2 && (
                      <Line
                        points={swingArcPoints}
                        stroke={isDoorOpen ? '#10b981' : '#d97706'}
                        strokeWidth={1.5 / stageScale}
                        dash={[3 / stageScale, 3 / stageScale]}
                        opacity={0.65}
                        listening={false}
                      />
                    )}
                  </>
                )}

                {/* 4. Physical Door Leaf Swinging on Hinge wall.p1 */}
                {/* Drop shadow for physical depth */}
                <Line
                  points={[wall.p1.x, wall.p1.y, leafTip.x, leafTip.y]}
                  stroke="rgba(0, 0, 0, 0.45)"
                  strokeWidth={(isRunMode ? 6.5 : 5.5) / stageScale}
                  shadowBlur={6 / stageScale}
                  shadowColor="#000000"
                  listening={false}
                />
                {/* Main Door Panel */}
                <Line
                  points={[wall.p1.x, wall.p1.y, leafTip.x, leafTip.y]}
                  stroke={doorStrokeColor}
                  strokeWidth={(isRunMode ? 5.5 : 4.5) / stageScale}
                  lineCap="round"
                  lineJoin="round"
                  shadowColor={doorStrokeColor}
                  shadowBlur={isRunMode ? 6 / stageScale : 4 / stageScale}
                  shadowOpacity={0.8}
                  listening={false}
                />
                {/* Wood Grain / Panel Highlight Line */}
                <Line
                  points={[wall.p1.x, wall.p1.y, leafTip.x, leafTip.y]}
                  stroke={isDoorOpen ? '#a7f3d0' : '#fef08a'}
                  strokeWidth={1.5 / stageScale}
                  lineCap="round"
                  opacity={0.55}
                  listening={false}
                />
                {/* Brass Door Knob / Handle */}
                <Circle
                  x={knobPos.x}
                  y={knobPos.y}
                  radius={3.5 / stageScale}
                  fill="#fde047"
                  stroke="#78350f"
                  strokeWidth={1 / stageScale}
                  shadowColor="#fde047"
                  shadowBlur={4 / stageScale}
                  shadowOpacity={0.8}
                  listening={false}
                />

                {/* 5. Sturdy Hinge Mount & Pivot Bracket at wall.p1 */}
                <Circle
                  x={wall.p1.x}
                  y={wall.p1.y}
                  radius={6 / stageScale}
                  fill="#78350f"
                  stroke="#f59e0b"
                  strokeWidth={1.5 / stageScale}
                  shadowColor="#f59e0b"
                  shadowBlur={4 / stageScale}
                  listening={false}
                />
                <Circle
                  x={wall.p1.x}
                  y={wall.p1.y}
                  radius={2.2 / stageScale}
                  fill="#18181b"
                  stroke="#fde047"
                  strokeWidth={0.8 / stageScale}
                  listening={false}
                />

                {/* 6. Strike Latch Jamb Post at wall.p2 */}
                <Circle
                  x={wall.p2.x}
                  y={wall.p2.y}
                  radius={4 / stageScale}
                  fill="#3f3f46"
                  stroke="#a1a1aa"
                  strokeWidth={1.2 / stageScale}
                  listening={false}
                />

                {/* 7. Door Status Badge at Threshold Midpoint (Can be toggled off, defaults to off) */}
                {Boolean(visionConfig.showDoorBadges) && (
                <Group
                  x={midX}
                  y={midY}
                  onMouseEnter={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'pointer';
                  }}
                  onMouseLeave={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'default';
                  }}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    onToggleDoor(wall.id);
                  }}
                  onTap={(e) => {
                    e.cancelBubble = true;
                    onToggleDoor(wall.id);
                  }}
                >
                  <Circle
                    radius={(isRunMode ? 12 : 10) / stageScale}
                    fill={
                      isDoorOpen
                        ? '#065f46'
                        : isDoorLocked
                        ? '#7f1d1d'
                        : isSecretDoor
                        ? '#581c87'
                        : '#78350f'
                    }
                    stroke={doorStrokeColor}
                    strokeWidth={(isRunMode ? 2.5 : 2) / stageScale}
                    shadowColor={doorStrokeColor}
                    shadowBlur={8 / stageScale}
                    shadowOpacity={0.8}
                  />
                  <Text
                    text={
                      isRunMode
                        ? isDoorOpen
                          ? 'OPEN'
                          : isDoorLocked
                          ? 'LOCK'
                          : isSecretDoor
                          ? 'SECRET'
                          : 'DOOR'
                        : isDoorOpen
                        ? 'O'
                        : isDoorLocked
                        ? 'L'
                        : isSecretDoor
                        ? 'S'
                        : 'D'
                    }
                    fontSize={(isRunMode ? (isSecretDoor && !isDoorOpen && !isDoorLocked ? 6 : 7.5) : 10) / stageScale}
                    fontStyle="bold"
                    fontFamily="monospace"
                    fill="#ffffff"
                    align="center"
                    verticalAlign="middle"
                    offsetX={(isRunMode ? (isDoorLocked ? 10 : (isSecretDoor && !isDoorOpen ? 11 : 9)) : 3.5) / stageScale}
                    offsetY={(isRunMode ? 4 : 5) / stageScale}
                    listening={false}
                  />
                </Group>
                )}

                {/* Subtle DM-only indicator for Secret Door when badges are toggled off */}
                {!Boolean(visionConfig.showDoorBadges) && isSecretDoor && !isPlayer && !isDoorOpen && (
                  <Group
                    x={midX}
                    y={midY}
                    onClick={(e) => {
                      e.cancelBubble = true;
                      onToggleDoor(wall.id);
                    }}
                    onTap={(e) => {
                      e.cancelBubble = true;
                      onToggleDoor(wall.id);
                    }}
                  >
                    <Circle
                      radius={6 / stageScale}
                      fill="#581c87"
                      stroke="#c084fc"
                      strokeWidth={1.5 / stageScale}
                    />
                    <Text
                      text="S"
                      fontSize={7 / stageScale}
                      fontStyle="bold"
                      fontFamily="monospace"
                      fill="#f3e8ff"
                      offsetX={2.5 / stageScale}
                      offsetY={3.5 / stageScale}
                      listening={false}
                    />
                  </Group>
                )}

                {/* Endpoint handles for selected wall (Creator Mode Only) */}
                {!isRunMode && isSelected && (
                  <>
                    <Circle
                      x={wall.p1.x}
                      y={wall.p1.y}
                      radius={6 / stageScale}
                      fill="#ffffff"
                      stroke="#ec4899"
                      strokeWidth={2 / stageScale}
                      draggable={true}
                      onDragMove={(e) => {
                        if (onUpdateWall) {
                          const newPos = snapToGridEnabled
                            ? snapPointToGrid(e.target.x(), e.target.y(), gridSize, gridOffsetX, gridOffsetY)
                            : { x: e.target.x(), y: e.target.y() };
                          onUpdateWall({ ...wall, p1: newPos });
                        }
                      }}
                    />
                    <Circle
                      x={wall.p2.x}
                      y={wall.p2.y}
                      radius={6 / stageScale}
                      fill="#ffffff"
                      stroke="#ec4899"
                      strokeWidth={2 / stageScale}
                      draggable={true}
                      onDragMove={(e) => {
                        if (onUpdateWall) {
                          const newPos = snapToGridEnabled
                            ? snapPointToGrid(e.target.x(), e.target.y(), gridSize, gridOffsetX, gridOffsetY)
                            : { x: e.target.x(), y: e.target.y() };
                          onUpdateWall({ ...wall, p2: newPos });
                        }
                      }}
                    />
                    {/* Midpoint Delete Handle for Door */}
                    <Group
                      x={midX}
                      y={midY - (22 / stageScale)}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        onDeleteWall?.(wall.id);
                      }}
                      onTap={(e) => {
                        e.cancelBubble = true;
                        onDeleteWall?.(wall.id);
                      }}
                      onMouseEnter={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container) container.style.cursor = 'pointer';
                      }}
                      onMouseLeave={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container) container.style.cursor = 'default';
                      }}
                    >
                      <Circle
                        radius={9.5 / stageScale}
                        fill="#ef4444"
                        stroke="#ffffff"
                        strokeWidth={1.8 / stageScale}
                        shadowColor="#000000"
                        shadowBlur={6 / stageScale}
                        shadowOpacity={0.8}
                      />
                      <Text
                        text="✕"
                        fontSize={10 / stageScale}
                        fontStyle="bold"
                        fill="#ffffff"
                        align="center"
                        verticalAlign="middle"
                        offsetX={3.8 / stageScale}
                        offsetY={5 / stageScale}
                        listening={false}
                      />
                    </Group>
                  </>
                )}
              </Group>
            );
          }

          // Regular Solid Wall or Window (Creator Mode)
          let strokeColor = '#3b82f6';
          let strokeWidth = 3.5 / stageScale;
          let dashPattern: number[] | undefined = undefined;

          if (isWindow) {
            strokeColor = '#06b6d4';
            dashPattern = [6 / stageScale, 4 / stageScale];
            strokeWidth = 3 / stageScale;
          }

          if (tool === 'erase_wall' && hoveredWallId === wall.id) {
            strokeColor = '#ef4444';
            strokeWidth = 6.5 / stageScale;
          } else if (tool === 'split_wall' && hoveredWallId === wall.id) {
            strokeColor = '#f59e0b';
            strokeWidth = 6.5 / stageScale;
          } else if (isSelected) {
            strokeColor = '#ec4899';
            strokeWidth = 6 / stageScale;
          }

          const wallMidX = (wall.p1.x + wall.p2.x) / 2;
          const wallMidY = (wall.p1.y + wall.p2.y) / 2;

          return (
            <Group key={wall.id}>
              {/* Clickable Hit Area */}
              <Line
                points={[wall.p1.x, wall.p1.y, wall.p2.x, wall.p2.y]}
                stroke="transparent"
                strokeWidth={18 / stageScale}
                onMouseEnter={(e) => {
                  if (tool === 'select' || tool === 'erase_wall' || tool === 'split_wall') {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'pointer';
                  }
                  setHoveredWallId(wall.id);
                }}
                onMouseLeave={(e) => {
                  const container = e.target.getStage()?.container();
                  if (container) container.style.cursor = 'default';
                  if (hoveredWallId === wall.id) setHoveredWallId(null);
                }}
                onClick={(e) => {
                  e.cancelBubble = true;
                  if (tool === 'erase_wall') {
                    onDeleteWall?.(wall.id);
                  } else if (tool === 'split_wall') {
                    onSplitWall?.(wall.id);
                  } else {
                    onSelectWall(wall.id);
                  }
                }}
                onTap={(e) => {
                  e.cancelBubble = true;
                  if (tool === 'erase_wall') {
                    onDeleteWall?.(wall.id);
                  } else if (tool === 'split_wall') {
                    onSplitWall?.(wall.id);
                  } else {
                    onSelectWall(wall.id);
                  }
                }}
                onContextMenu={(e) => {
                  e.evt.preventDefault();
                  e.cancelBubble = true;
                }}
              />

              {/* Visible Wall Line */}
              <Line
                points={[wall.p1.x, wall.p1.y, wall.p2.x, wall.p2.y]}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                lineCap="round"
                lineJoin="round"
                dash={dashPattern}
                shadowColor={strokeColor}
                shadowBlur={isSelected ? 10 / stageScale : 4 / stageScale}
                shadowOpacity={0.75}
                listening={false}
              />

              {/* Endpoint handles and Midpoint Delete Handle for selected wall (Creator Mode Only) */}
              {isSelected && (
                <>
                  <Circle
                    x={wall.p1.x}
                    y={wall.p1.y}
                    radius={6 / stageScale}
                    fill="#ffffff"
                    stroke="#ec4899"
                    strokeWidth={2 / stageScale}
                    draggable={true}
                    onDragMove={(e) => {
                      if (onUpdateWall) {
                        const newPos = snapToGridEnabled
                          ? snapPointToGrid(e.target.x(), e.target.y(), gridSize, gridOffsetX, gridOffsetY)
                          : { x: e.target.x(), y: e.target.y() };
                        onUpdateWall({ ...wall, p1: newPos });
                      }
                    }}
                  />
                  <Circle
                    x={wall.p2.x}
                    y={wall.p2.y}
                    radius={6 / stageScale}
                    fill="#ffffff"
                    stroke="#ec4899"
                    strokeWidth={2 / stageScale}
                    draggable={true}
                    onDragMove={(e) => {
                      if (onUpdateWall) {
                        const newPos = snapToGridEnabled
                          ? snapPointToGrid(e.target.x(), e.target.y(), gridSize, gridOffsetX, gridOffsetY)
                          : { x: e.target.x(), y: e.target.y() };
                        onUpdateWall({ ...wall, p2: newPos });
                      }
                    }}
                  />
                  {/* Midpoint Action Handles for Selected Wall */}
                  <Group
                    x={onSplitWall ? wallMidX - 13 / stageScale : wallMidX}
                    y={wallMidY}
                    onClick={(e) => {
                      e.cancelBubble = true;
                      onDeleteWall?.(wall.id);
                    }}
                    onTap={(e) => {
                      e.cancelBubble = true;
                      onDeleteWall?.(wall.id);
                    }}
                    onMouseEnter={(e) => {
                      const container = e.target.getStage()?.container();
                      if (container) container.style.cursor = 'pointer';
                    }}
                    onMouseLeave={(e) => {
                      const container = e.target.getStage()?.container();
                      if (container) container.style.cursor = 'default';
                    }}
                  >
                    <Circle
                      radius={9.5 / stageScale}
                      fill="#ef4444"
                      stroke="#ffffff"
                      strokeWidth={1.8 / stageScale}
                      shadowColor="#000000"
                      shadowBlur={6 / stageScale}
                      shadowOpacity={0.8}
                    />
                    <Text
                      text="✕"
                      fontSize={10 / stageScale}
                      fontStyle="bold"
                      fill="#ffffff"
                      align="center"
                      verticalAlign="middle"
                      offsetX={3.8 / stageScale}
                      offsetY={5 / stageScale}
                      listening={false}
                    />
                  </Group>

                  {/* Midpoint Split Handle */}
                  {onSplitWall && (
                    <Group
                      x={wallMidX + 13 / stageScale}
                      y={wallMidY}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        onSplitWall(wall.id);
                      }}
                      onTap={(e) => {
                        e.cancelBubble = true;
                        onSplitWall(wall.id);
                      }}
                      onMouseEnter={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container) container.style.cursor = 'pointer';
                      }}
                      onMouseLeave={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container) container.style.cursor = 'default';
                      }}
                    >
                      <Circle
                        radius={9.5 / stageScale}
                        fill="#f59e0b"
                        stroke="#ffffff"
                        strokeWidth={1.8 / stageScale}
                        shadowColor="#000000"
                        shadowBlur={6 / stageScale}
                        shadowOpacity={0.8}
                      />
                      <Text
                        text="✂"
                        fontSize={10 / stageScale}
                        fontStyle="bold"
                        fill="#ffffff"
                        align="center"
                        verticalAlign="middle"
                        offsetX={4 / stageScale}
                        offsetY={5 / stageScale}
                        listening={false}
                      />
                    </Group>
                  )}
                </>
              )}
            </Group>
          );
        })}

        {/* Wall Drawing In-Progress Preview (Creator Mode Only) */}
        {campaignMode === 'creator' && tool === 'wall' && wallDrawStart && (
            <Group>
              <Line
                points={[wallDrawStart.x, wallDrawStart.y, snappedMousePos.x, snappedMousePos.y]}
                stroke="#ec4899"
                strokeWidth={3 / stageScale}
                dash={[6 / stageScale, 4 / stageScale]}
              />
              <Circle
                x={wallDrawStart.x}
                y={wallDrawStart.y}
                radius={5 / stageScale}
                fill="#ec4899"
              />
              <Circle
                x={snappedMousePos.x}
                y={snappedMousePos.y}
                radius={5 / stageScale}
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth={1.5 / stageScale}
              />
            </Group>
          )}

          {/* Snap Indicator Dot during Wall Tool */}
          {tool === 'wall' && !wallDrawStart && snapToGridEnabled && (
            <Circle
              x={snappedMousePos.x}
              y={snappedMousePos.y}
              radius={4 / stageScale}
              fill="#3b82f6"
              opacity={0.8}
            />
          )}
        </Layer>
  );

  // In Creator Mode, walls must be rendered on top of fog so the DM can select, draw, and edit walls.
  // In Run Mode and Player View, fog is rendered on top of walls so players never see unrevealed doors or walls through fog.
  if (campaignMode === 'creator') {
    return (
      <>
        {fogFovLayer}
        {ambientLightingLayer}
        {wallsInteractiveLayer}
      </>
    );
  }

  return (
    <>
      {wallsInteractiveLayer}
      {ambientLightingLayer}
      {fogFovLayer}
    </>
  );
});
