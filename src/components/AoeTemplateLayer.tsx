import React, { useMemo } from 'react';
import { Group, Line, Circle, Text, Rect } from 'react-konva';
import { AoeTemplateConfig, generateAoePolygonPoints, findTokensInsideAoe } from '../utils/aoeGeometry';
import { Token } from '../types';

interface AoeTemplateLayerProps {
  config: AoeTemplateConfig | null;
  tokens: Token[];
  gridSize: number;
  stageScale: number;
  isInteractive?: boolean;
  onUpdateConfig?: (newConfig: AoeTemplateConfig) => void;
  onDismiss?: () => void;
}

export const AoeTemplateLayer: React.FC<AoeTemplateLayerProps> = ({
  config,
  tokens,
  gridSize,
  stageScale = 1,
  isInteractive = true,
  onUpdateConfig,
  onDismiss
}) => {
  if (!config) return null;

  const polyPoints = useMemo(() => {
    return generateAoePolygonPoints(config, gridSize);
  }, [config, gridSize]);

  const targetsHit = useMemo(() => {
    return findTokensInsideAoe(tokens, config, gridSize);
  }, [tokens, config, gridSize]);

  const color = config.color || '#f59e0b';
  const strokeColor = color;
  const fillColor = `${color}33`; // 20% opacity hex
  const hitCount = targetsHit.length;

  return (
    <Group id="aoe-template-layer" listening={isInteractive}>
      {/* 1. Main AOE Filled Polygon & Boundary */}
      {polyPoints.length >= 6 && (
        <Line
          points={polyPoints}
          closed={true}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={2.5 / stageScale}
          dash={[8 / stageScale, 4 / stageScale]}
          shadowColor={strokeColor}
          shadowBlur={10 / stageScale}
          shadowOpacity={0.7}
          listening={false}
        />
      )}

      {/* 2. Target Rings on Every Caught Creature */}
      {targetsHit.map(({ token }) => {
        const tokenSize = token.size || 1;
        const radius = (tokenSize * gridSize) / 2;
        const cx = token.x + radius;
        const cy = token.y + radius;

        return (
          <Group key={`aoe-hit-${token.id}`} listening={false}>
            {/* Outer Target Ping Ring */}
            <Circle
              x={cx}
              y={cy}
              radius={radius + 6 / stageScale}
              stroke="#ef4444"
              strokeWidth={3 / stageScale}
              dash={[5 / stageScale, 3 / stageScale]}
              shadowColor="#ef4444"
              shadowBlur={8 / stageScale}
              shadowOpacity={0.9}
            />
            {/* Target Reticle Crosshairs */}
            <Line
              points={[cx - radius - 10 / stageScale, cy, cx + radius + 10 / stageScale, cy]}
              stroke="#ef4444"
              strokeWidth={1.5 / stageScale}
              opacity={0.7}
            />
            <Line
              points={[cx, cy - radius - 10 / stageScale, cx, cy + radius + 10 / stageScale]}
              stroke="#ef4444"
              strokeWidth={1.5 / stageScale}
              opacity={0.7}
            />
          </Group>
        );
      })}

      {/* 3. Center Anchor & Origin Point Handle */}
      <Circle
        x={config.origin.x}
        y={config.origin.y}
        radius={8 / stageScale}
        fill={strokeColor}
        stroke="#ffffff"
        strokeWidth={2 / stageScale}
        draggable={isInteractive}
        onDragMove={(e) => {
          if (!onUpdateConfig) return;
          const newPos = { x: e.target.x(), y: e.target.y() };
          const dx = newPos.x - config.origin.x;
          const dy = newPos.y - config.origin.y;
          onUpdateConfig({
            ...config,
            origin: newPos,
            target: config.target ? { x: config.target.x + dx, y: config.target.y + dy } : undefined
          });
        }}
        shadowColor="#000000"
        shadowBlur={6 / stageScale}
      />

      {/* 4. Directional Handle (for cone, line, cube) */}
      {config.target && (
        <Group>
          <Line
            points={[config.origin.x, config.origin.y, config.target.x, config.target.y]}
            stroke="#ffffff"
            strokeWidth={1.5 / stageScale}
            dash={[4 / stageScale, 4 / stageScale]}
            opacity={0.6}
            listening={false}
          />
          <Circle
            x={config.target.x}
            y={config.target.y}
            radius={7 / stageScale}
            fill="#3b82f6"
            stroke="#ffffff"
            strokeWidth={2 / stageScale}
            draggable={isInteractive}
            onDragMove={(e) => {
              if (!onUpdateConfig) return;
              onUpdateConfig({
                ...config,
                target: { x: e.target.x(), y: e.target.y() }
              });
            }}
          />
        </Group>
      )}

      {/* 5. Floating Info Badge */}
      <Group x={config.origin.x} y={config.origin.y - 30 / stageScale} listening={false}>
        <Rect
          x={-90 / stageScale}
          y={-12 / stageScale}
          width={180 / stageScale}
          height={24 / stageScale}
          fill="rgba(15, 23, 42, 0.9)"
          stroke={strokeColor}
          strokeWidth={1 / stageScale}
          cornerRadius={6 / stageScale}
        />
        <Text
          x={-90 / stageScale}
          y={-6 / stageScale}
          width={180 / stageScale}
          align="center"
          text={`${config.label || `${config.sizeFt}ft ${config.shape}`} • ${hitCount} target${hitCount === 1 ? '' : 's'}`}
          fontSize={10 / stageScale}
          fontFamily="monospace"
          fontStyle="bold"
          fill="#ffffff"
        />
      </Group>
    </Group>
  );
};
