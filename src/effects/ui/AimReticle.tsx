// src/effects/ui/AimReticle.tsx
// Interactive battlemap targeting reticle for spells, cones, lines, and projectiles
// Accurately calibrated to official 5e rules and JB2A asset dimensions

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

  // 1. Point-Targeted Circle / Sphere AoE (Fireball, Darkness, Fog Cloud)
  if (asset.paradigm === 'point' || asset.shape === 'circle') {
    // 5e rule: defaultSizeFt is the RADIUS (e.g. 20ft radius = 4 grid squares radius)
    const radiusPx = ((asset.defaultSizeFt || 20) / 5) * gridSize;
    return (
      <Group x={current.x} y={current.y} listening={false}>
        <Circle
          radius={radiusPx}
          stroke={color}
          strokeWidth={2.5 / stageScale}
          dash={[8, 4]}
          fill={color}
          opacity={0.22}
        />
        <Circle
          radius={5 / stageScale}
          fill={color}
        />
        <Text
          text={`${asset.name} (${asset.defaultSizeFt}ft Radius)`}
          x={-radiusPx}
          y={-radiusPx - (20 / stageScale)}
          fill="#ffffff"
          fontSize={12 / stageScale}
          fontFamily="monospace"
        />
      </Group>
    );
  }

  // 2. Cone (Burning Hands, Cone of Cold)
  if (asset.paradigm === 'cone' || asset.shape === 'cone') {
    // 5e rule: Cone length = sizeFt (15ft, 60ft, etc.)
    const coneRadius = (asset.defaultSizeFt / 5) * gridSize;
    return (
      <Group x={origin.x} y={origin.y} listening={false}>
        <Wedge
          radius={coneRadius}
          angle={53} // Standard 5e cone angle (~53 degrees)
          rotation={angleDeg - 26.5}
          stroke={color}
          strokeWidth={2.5 / stageScale}
          dash={[8, 4]}
          fill={color}
          opacity={0.25}
        />
        <Text
          text={`${asset.name} (${asset.defaultSizeFt}ft Cone)`}
          x={current.x - origin.x + (12 / stageScale)}
          y={current.y - origin.y + (12 / stageScale)}
          fill="#ffffff"
          fontSize={12 / stageScale}
          fontFamily="monospace"
        />
      </Group>
    );
  }

  // 3. Line (Lightning Bolt, Sunbeam)
  if (asset.paradigm === 'line') {
    const lineLength = (asset.defaultSizeFt / 5) * gridSize;
    const beamHeight = Math.max(gridSize, (lineLength / 10));
    return (
      <Group x={origin.x} y={origin.y} rotation={angleDeg} listening={false}>
        <Rect
          x={0}
          y={-beamHeight / 2}
          width={lineLength}
          height={beamHeight}
          stroke={color}
          strokeWidth={2 / stageScale}
          dash={[8, 4]}
          fill={color}
          opacity={0.25}
        />
        <Text
          text={`${asset.name} (${asset.defaultSizeFt}ft Line)`}
          x={10 / stageScale}
          y={(-beamHeight / 2) - (18 / stageScale)}
          fill="#ffffff"
          fontSize={12 / stageScale}
          fontFamily="monospace"
        />
      </Group>
    );
  }

  // 4. Projectile / Ray (Fire Bolt, Eldritch Blast, Ray of Frost)
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
        strokeWidth={2 / stageScale}
        fill={color}
        opacity={0.28}
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
