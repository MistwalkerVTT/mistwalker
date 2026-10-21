// src/effects/ui/AimReticle.tsx
// Interactive battlemap targeting reticle for spells, cones, lines, projectiles, and creature targeting
// Accurately calibrated to official D&D 5e rules and JB2A asset dimensions

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

const SINGLE_TARGET_IDS = new Set([
  'healing_word', 'cure_wounds', 'sacred_flame', 'toll_the_dead', 'guiding_bolt',
  'fire_bolt', 'eldritch_blast', 'ray_of_frost', 'magic_missile', 'scorching_ray',
  'chromatic_orb', 'witch_bolt', 'thorn_whip', 'disintegrate', 'chain_lightning',
  'blight', 'hold_person', 'sanctuary', 'hunters_mark', 'counterspell', 'hellish_rebuke',
  'divine_smite', 'sneak_attack', 'stunning_strike', 'flurry_of_blows',
  'bardic_inspiration', 'cutting_words', 'attack_dagger', 'attack_bow', 'attack_crossbow',
  'attack_spear', 'attack_greatsword', 'attack_slash', 'attack_hammer', 'attack_greataxe',
  'attack_battleaxe', 'attack_quarterstaff', 'attack_glaive', 'attack_claw', 'attack_bite',
  'attack_unarmed', 'mage_armor', 'barkskin', 'fly', 'warding_bond', 'aid'
]);

const CASTER_AURA_IDS = new Set([
  'spirit_guardians', 'aura_of_vitality', 'aura_of_life', 'holy_aura', 'detect_magic', 'light'
]);

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

  // 1. Cone (Burning Hands, Cone of Cold, Color Spray, Thunderwave)
  if (asset.targetType === 'cone' || asset.paradigm === 'cone' || asset.shape === 'cone') {
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

  // 2. Line (Lightning Bolt, Sunbeam, Wall of Fire, Gust of Wind)
  if (asset.targetType === 'line' || asset.paradigm === 'line') {
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

  // 3. Self Personal Protective Spells (Shield, Armor of Agathys)
  if (asset.targetType === 'self' || asset.id === 'shield' || asset.id === 'armor_of_agathys') {
    const ringRadius = (gridSize / 2) + (6 / stageScale);
    return (
      <Group x={origin.x} y={origin.y} listening={false}>
        <Circle
          radius={ringRadius}
          stroke={color}
          strokeWidth={3 / stageScale}
          dash={[6, 3]}
          fill={color}
          opacity={0.22}
        />
        <Text
          text={`${asset.name} (Self)`}
          x={-ringRadius}
          y={-ringRadius - (20 / stageScale)}
          fill="#ffffff"
          fontSize={12 / stageScale}
          fontFamily="monospace"
        />
      </Group>
    );
  }

  // 4. Caster-Centered Auras (Spirit Guardians, Aura of Vitality, Aura of Life, Holy Aura, Detect Magic)
  if (asset.targetType === 'aura' || CASTER_AURA_IDS.has(asset.id)) {
    const auraRadiusPx = ((asset.defaultSizeFt || 15) / 5) * gridSize;
    return (
      <Group x={origin.x} y={origin.y} listening={false}>
        <Circle
          radius={auraRadiusPx}
          stroke={color}
          strokeWidth={2.5 / stageScale}
          dash={[8, 4]}
          fill={color}
          opacity={0.20}
        />
        <Circle
          radius={5 / stageScale}
          fill={color}
        />
        <Text
          text={`${asset.name} (${asset.defaultSizeFt}ft Aura around Caster)`}
          x={-auraRadiusPx}
          y={-auraRadiusPx - (20 / stageScale)}
          fill="#ffffff"
          fontSize={12 / stageScale}
          fontFamily="monospace"
        />
      </Group>
    );
  }

  // 5. Single-Target Creature Spells & Attacks (Healing Word, Cure Wounds, Sacred Flame, Toll the Dead, Fire Bolt, etc.)
  const isSingle = asset.targetType === 'single' ||
    SINGLE_TARGET_IDS.has(asset.id) ||
    asset.paradigm === 'projectile' ||
    asset.paradigm === 'ray';

  if (isSingle) {
    const maxRangeFt = asset.rangeFt !== undefined
      ? asset.rangeFt
      : (asset.id === 'cure_wounds' ? 5 : (asset.id === 'healing_word' ? 60 : 60));
    const isOutOfRange = maxRangeFt > 0 && distanceFt > maxRangeFt;
    const reticleColor = isOutOfRange ? '#ef4444' : color;
    const targetRingRadius = gridSize / 2; // Exact 1 creature tile radius (5ft)

    return (
      <Group listening={false}>
        {/* Travel Vector Line (only if distance > 10px so self-targeting doesn't draw a tiny stub) */}
        {distancePx > 10 && (
          <Line
            points={[origin.x, origin.y, current.x, current.y]}
            stroke={reticleColor}
            strokeWidth={2 / stageScale}
            dash={[6, 4]}
            opacity={0.85}
          />
        )}
        {/* Target Creature Ring (5ft / 1 tile) */}
        <Circle
          x={current.x}
          y={current.y}
          radius={targetRingRadius}
          stroke={reticleColor}
          strokeWidth={2 / stageScale}
          fill={reticleColor}
          opacity={0.25}
        />
        {/* Center Target Crosshair Dot */}
        <Circle
          x={current.x}
          y={current.y}
          radius={4 / stageScale}
          fill={reticleColor}
        />
        {/* Range & Target Readout */}
        <Text
          text={
            isOutOfRange
              ? `${asset.name}: ${distanceFt} ft (Out of range! Max ${maxRangeFt} ft)`
              : `${asset.name}: ${distanceFt} ft${maxRangeFt === 5 ? ' (Touch)' : ` (Max ${maxRangeFt} ft)`}`
          }
          x={current.x + (15 / stageScale)}
          y={current.y - (14 / stageScale)}
          fill={isOutOfRange ? '#fca5a5' : '#ffffff'}
          fontSize={12 / stageScale}
          fontFamily="monospace"
        />
      </Group>
    );
  }

  // 6. Point-Targeted Circle / Sphere AoE (Fireball, Fog Cloud, Darkness, Web, Shatter, etc.)
  // 5e rule: defaultSizeFt is the blast RADIUS (e.g. 20ft radius = 4 grid squares radius)
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
});
