import React, { useMemo } from 'react';
import { Group, Circle, Line, Rect, Text, Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';

export interface TokenDragState {
  tokenId: string;
  tokenName: string;
  tokenAvatarUrl?: string;
  tokenSize: number; // grid units, default 1
  originX: number;
  originY: number;
  currentX: number;
  currentY: number;
  baseSpeed: number; // in feet, e.g. 30
  distancePx: number;
  distanceFt: number;
  remainingFt: number;
}

/**
 * Extracts numeric speed in feet from a character speed string (e.g. "30 ft", "40", "25 ft, swim 20 ft")
 */
export function parseSpeedFt(speed: string | number | undefined | null, fallback = 30): number {
  if (typeof speed === 'number' && !isNaN(speed) && speed > 0) return speed;
  if (typeof speed === 'string') {
    const match = speed.match(/(\d+)/);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  }
  return fallback;
}

interface TokenDragRulerProps {
  dragState: TokenDragState;
  gridSize: number;
  stageScale?: number;
}

/**
 * Real-Time Token Drag Measurement Overlay
 * - Visual Anchor: Semi-transparent ghost token at starting coordinates (x0, y0) with dashed border.
 * - Measurement Line: High-contrast dashed line connecting start center to current dragged center.
 * - Movement Budget HUD: Floating pill badge displaying real-time distance and remaining speed budget.
 */
export const TokenDragRuler: React.FC<TokenDragRulerProps> = ({
  dragState,
  gridSize,
  stageScale = 1
}) => {
  const {
    tokenAvatarUrl,
    tokenSize = 1,
    originX,
    originY,
    currentX,
    currentY,
    baseSpeed = 30,
    distanceFt,
    remainingFt
  } = dragState;

  // Load avatar for ghost token anchor
  const [ghostImage] = useImage(tokenAvatarUrl || '', 'anonymous');

  const tokenPx = Math.max(20, (tokenSize || 1) * gridSize);
  const radius = tokenPx / 2;

  // Origin and Current Center points
  const originCenter = useMemo(() => ({
    x: originX + radius,
    y: originY + radius
  }), [originX, originY, radius]);

  const currentCenter = useMemo(() => ({
    x: currentX + radius,
    y: currentY + radius
  }), [currentX, currentY, radius]);

  // Distance line points
  const linePoints = useMemo(() => [
    originCenter.x,
    originCenter.y,
    currentCenter.x,
    currentCenter.y
  ], [originCenter, currentCenter]);

  // Line length check to avoid rendering line when clicking in-place
  const lineLength = useMemo(() => {
    return Math.hypot(currentCenter.x - originCenter.x, currentCenter.y - originCenter.y);
  }, [originCenter, currentCenter]);

  // Movement budget calculations
  const isOverSpeed = distanceFt > baseSpeed;
  const overFt = Math.abs(remainingFt);

  // Badge Text
  const badgeText = useMemo(() => {
    if (!isOverSpeed) {
      return `${distanceFt} ft / ${baseSpeed} ft (${remainingFt} ft left)`;
    }
    return `${distanceFt} ft / ${baseSpeed} ft (+${overFt} ft over)`;
  }, [distanceFt, baseSpeed, remainingFt, isOverSpeed, overFt]);

  // Zoom-compensated scale for HUD badge so it remains readable at any zoom level
  const effectiveScale = Math.max(0.3, Math.min(3.0, stageScale || 1));
  const zoomFactor = Math.max(0.65, Math.min(1.5, 1 / effectiveScale));

  // Badge Dimensions
  const pillHeight = 24 * zoomFactor;
  const pillPaddingX = 14 * zoomFactor;
  const charWidth = 7.2 * zoomFactor;
  const pillWidth = Math.max(110 * zoomFactor, badgeText.length * charWidth + pillPaddingX * 2);
  const fontSize = Math.max(10, Math.round(11.5 * zoomFactor));

  // Badge position: floating above the target dragged token
  const badgeX = currentCenter.x;
  const badgeY = currentY - (16 * zoomFactor);

  // Colors
  const activeColor = isOverSpeed ? '#f43f5e' : '#10b981'; // Rose-500 vs Emerald-500
  const badgeBg = isOverSpeed ? 'rgba(136, 19, 55, 0.94)' : 'rgba(6, 78, 59, 0.94)'; // Rose-900 vs Emerald-900
  const badgeBorder = isOverSpeed ? '#fb7185' : '#34d399'; // Rose-400 vs Emerald-400

  return (
    <Group listening={false}>
      {/* 1. VISUAL ANCHOR: Starting Position Ghost Token */}
      <Group x={originX} y={originY} opacity={0.38} listening={false}>
        {/* Ghost background disk */}
        <Circle
          x={radius}
          y={radius}
          radius={radius}
          fill="#18181b"
          stroke="#38bdf8"
          strokeWidth={2}
          dash={[4, 4]}
        />

        {/* Ghost token avatar image clipped to circle */}
        {ghostImage && (
          <Group
            clipFunc={(ctx) => {
              ctx.arc(radius, radius, radius - 1, 0, Math.PI * 2, false);
            }}
          >
            <KonvaImage
              image={ghostImage}
              x={0}
              y={0}
              width={tokenPx}
              height={tokenPx}
            />
          </Group>
        )}

        {/* Ghost inner dashed accent ring */}
        <Circle
          x={radius}
          y={radius}
          radius={Math.max(4, radius - 3)}
          stroke="rgba(255, 255, 255, 0.35)"
          strokeWidth={1}
          dash={[3, 3]}
        />
      </Group>

      {/* 2. REAL-TIME RULER: Dashed Measurement Line & Target Dots */}
      {lineLength > 8 && (
        <Group listening={false}>
          {/* High-contrast dark shadow underlay for readability across dark & light battlemaps */}
          <Line
            points={linePoints}
            stroke="rgba(0, 0, 0, 0.75)"
            strokeWidth={5}
            lineCap="round"
          />

          {/* Dynamic colored dashed measurement line */}
          <Line
            points={linePoints}
            stroke={activeColor}
            strokeWidth={2.5}
            dash={[8, 5]}
            lineCap="round"
          />

          {/* Origin anchor dot */}
          <Circle
            x={originCenter.x}
            y={originCenter.y}
            radius={4}
            fill="#ffffff"
            stroke={activeColor}
            strokeWidth={2}
          />

          {/* Active target destination dot */}
          <Circle
            x={currentCenter.x}
            y={currentCenter.y}
            radius={5.5}
            fill={activeColor}
            stroke="#ffffff"
            strokeWidth={1.5}
          />
        </Group>
      )}

      {/* 3. MOVEMENT BUDGET HUD: Floating badge above actively dragged token */}
      {lineLength > 4 && (
        <Group x={badgeX} y={badgeY} listening={false}>
          {/* Badge Background Pill */}
          <Rect
            x={-pillWidth / 2}
            y={-pillHeight / 2}
            width={pillWidth}
            height={pillHeight}
            cornerRadius={pillHeight / 2}
            fill={badgeBg}
            stroke={badgeBorder}
            strokeWidth={1.5}
            shadowColor="black"
            shadowBlur={8}
            shadowOpacity={0.7}
            shadowOffsetY={2}
          />

          {/* Badge Label Text */}
          <Text
            x={-pillWidth / 2}
            y={-fontSize / 2 - (1 * zoomFactor)}
            width={pillWidth}
            align="center"
            text={badgeText}
            fill="#ffffff"
            fontSize={fontSize}
            fontStyle="bold"
            fontFamily="system-ui, -apple-system, sans-serif"
          />
        </Group>
      )}
    </Group>
  );
};
