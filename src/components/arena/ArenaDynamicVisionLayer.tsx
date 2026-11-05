import React, { useEffect, useRef, useMemo } from 'react';
import { Layer, Image as KonvaImage } from 'react-konva';
import { WallSegment } from '../../types';
import { computeVisibilityPolygon, VisionSource, isWallOccluding } from '../../lib/visionEngine';

interface ArenaDynamicVisionLayerProps {
  arenaWidth: number;
  arenaHeight: number;
  walls: WallSegment[];
  selectedToken: {
    id: string;
    x: number;
    y: number;
    size?: number;
    visionRadius?: number;
  } | null;
  gridSize: number;
  enabled?: boolean;
}

export const ArenaDynamicVisionLayer: React.FC<ArenaDynamicVisionLayerProps> = ({
  arenaWidth,
  arenaHeight,
  walls,
  selectedToken,
  gridSize,
  enabled = true,
}) => {
  const fogCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize off-screen 2D canvas for fast GPU fog masking
  if (!fogCanvasRef.current && typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = arenaWidth;
    canvas.height = arenaHeight;
    fogCanvasRef.current = canvas;
  }

  // Update canvas dimensions when map size changes
  useEffect(() => {
    if (fogCanvasRef.current) {
      if (fogCanvasRef.current.width !== arenaWidth || fogCanvasRef.current.height !== arenaHeight) {
        fogCanvasRef.current.width = arenaWidth;
        fogCanvasRef.current.height = arenaHeight;
      }
    }
  }, [arenaWidth, arenaHeight]);

  // Compute visibility polygon for the currently selected combatant
  const fovPolygon = useMemo(() => {
    if (!enabled || !selectedToken) return null;

    const tokenSize = selectedToken.size || 1;
    const centerPx = (tokenSize * gridSize) / 2;
    const cx = selectedToken.x + centerPx;
    const cy = selectedToken.y + centerPx;

    // Default vision range: 60ft or token radius
    const visionFt = selectedToken.visionRadius && selectedToken.visionRadius > 0 ? selectedToken.visionRadius : 60;
    const radiusPx = (visionFt / 5) * gridSize;

    const source: VisionSource = {
      id: selectedToken.id,
      x: cx,
      y: cy,
      radiusPx,
      angleDegrees: 360,
      directionDegrees: 0,
    };

    // Filter walls that occlude sight (closed doors and solid walls)
    const occludingWalls = walls.filter((w) => {
      const type = w.wallType || w.type || 'solid';
      if (type === 'door' || type === 'secret_door') {
        return w.doorState !== 'open' && !w.isOpen;
      }
      return w.blocksSight !== false;
    });

    return computeVisibilityPolygon(source, occludingWalls, {
      width: arenaWidth,
      height: arenaHeight,
    });
  }, [enabled, selectedToken, walls, arenaWidth, arenaHeight, gridSize]);

  // Redraw the fog-of-war mask on the offscreen canvas
  useEffect(() => {
    const canvas = fogCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset canvas to full pitch-black fog of war
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!enabled || !selectedToken || !fovPolygon || !fovPolygon.points || fovPolygon.points.length < 6) {
      return;
    }

    const { points, center, radius } = fovPolygon;

    // 1. Fill entire canvas with dark arena shadow
    ctx.fillStyle = 'rgba(10, 10, 12, 0.92)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Cut out the visible FOV polygon using destination-out compositing
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) {
      ctx.lineTo(points[i], points[i + 1]);
    }
    ctx.closePath();
    ctx.fill();

    // 3. Add soft radial falloff near the edges of vision
    const grad = ctx.createRadialGradient(
      center.x,
      center.y,
      radius * 0.75,
      center.x,
      center.y,
      radius
    );
    grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.restore();
  }, [enabled, selectedToken, fovPolygon]);

  if (!enabled || !selectedToken) return null;

  return (
    <Layer listening={false}>
      {fogCanvasRef.current && (
        <KonvaImage
          image={fogCanvasRef.current}
          x={0}
          y={0}
          width={arenaWidth}
          height={arenaHeight}
        />
      )}
    </Layer>
  );
};
