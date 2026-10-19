// src/effects/ui/AimReticle.tsx
// Interactive battlemap targeting reticle for spells, cones, lines, and projectiles

import React from 'react';
import { Group, Circle, Line, Wedge, Rect, Text } from 'react-konva';
import { Jb2aAssetDefinition } from '../types/effect';

interface AimReticleProps {
  asset: Jb2aAssetDefinition;
  origin: { x: number; y: number } | null;
  current: { x: number; y: number } | null;
  gridSize: number;
  stageScale: number;
}

export const AimReticle: React.FC<AimReticleProps> = React.memo(({
  asset,
  origin,
  current,
  gridSize,
  stageScale
}) => {
  if (!origin || !current) return null;

  const dx = current.x - origin.x;
  const dy = current.y - origin.y;
  const distancePx = Math.sqrt(dx * dx + dy * dy);
  const distanceFt = Math.round((distancePx / gridSize) * 5);
  const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
  const color = asset.color || '#a855f7';

  // 1. Point-Targeted Circle
  if (asset.paradigm === 'point' || asset.shape === 'circle') {
    const radiusPx = ((asset.defaultSizeFt || 20) / 5) * (gridSize / 2);
    return (
      <Group x={current.x} y={current.y} listening={false}>
        <Circle
          radius={radiusPx}
          stroke={color}
          strokeWidth={2 / stageScale}
          dash={[6, 4]}
          fill={color}
          opacity={0.25}
        />
        <Circle
          radius={4 / stageScale}
          fill={color}
        />
        <Text
          text={`${asset.name} (${asset.defaultSizeFt}ft)`}
          x={-radiusPx}
          y={-radiusPx - (18 / stageScale)}
          fill="#ffffff"
          fontSize={12 / stageScale}
          fontFamily="monospace"
        />
      </Group>
    );
  }

  // 2. Cone
  if (asset.paradigm === 'cone' || asset.shape === 'cone') {
    const coneRadius = Math.max(distancePx, (asset.defaultSizeFt / 5) * gridSize);
    return (
      <Group x={origin.x} y={origin.y} listening={false}>
        <Wedge
          radius={coneRadius}
          angle={60}
          rotation={angleDeg - 30}
          stroke={color}
          strokeWidth={2 / stageScale}
          dash={[6, 4]}
          fill={color}
          opacity={0.25}
        />
        <Text
          text={`${asset.name} (${Math.round((coneRadius / gridSize) * 5)}ft cone)`}
          x={current.x - origin.x + 10}
          y={current.y - origin.y + 10}
          fill="#ffffff"
          fontSize={12 / stageScale}
          fontFamily="monospace"
        />
      </Group>
    );
  }

  // 3. Projectile / Ray
  return (
    <Group listening={false}>
      {/* Travel Vector Line */}
      <Line
        points={[origin.x, origin.y, current.x, current.y]}
        stroke={color}
        strokeWidth={2.5 / stageScale}
        dash={[8, 5]}
        opacity={0.8}
      />
      {/* Target Marker Ring */}
      <Circle
        x={current.x}
        y={current.y}
        radius={(gridSize / 2)}
        stroke={color}
        strokeWidth={1.5 / stageScale}
        fill={color}
        opacity={0.3}
      />
      {/* Range readout */}
      <Text
        text={`${asset.name}: ${distanceFt} ft`}
        x={current.x + (15 / stageScale)}
        y={current.y - (10 / stageScale)}
        fill="#ffffff"
        fontSize={12 / stageScale}
        fontFamily="monospace"
      />
    </Group>
  );
});
