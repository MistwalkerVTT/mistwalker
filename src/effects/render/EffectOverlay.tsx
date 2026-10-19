// src/effects/render/EffectOverlay.tsx
// Master Konva layer rendering all active battlemap visual effects

import React, { useEffect } from 'react';
import { Group } from 'react-konva';
import { VttEffectInstance } from '../types/effect';
import { Jb2aCanvasNode } from './Jb2aCanvasNode';
import { TrajectoryNode } from './TrajectoryNode';

interface EffectOverlayProps {
  effects: VttEffectInstance[];
  setEffects?: React.Dispatch<React.SetStateAction<VttEffectInstance[]>>;
  gridSize: number;
  stageScale: number;
  onEffectComplete?: (effectId: string) => void;
}

export const EffectOverlay: React.FC<EffectOverlayProps> = React.memo(({
  effects,
  setEffects,
  gridSize,
  stageScale,
  onEffectComplete
}) => {
  // Automatic expiration timer for non-persistent single-shot blasts (e.g. 5s)
  useEffect(() => {
    if (!setEffects || effects.length === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setEffects(prev =>
        prev.filter(eff => {
          if (eff.isPersistent) return true;
          const lifetime = eff.durationMs || 5000;
          const isAlive = now - eff.castTime < lifetime;
          if (!isAlive && onEffectComplete) {
            onEffectComplete(eff.id);
          }
          return isAlive;
        })
      );
    }, 500);

    return () => clearInterval(interval);
  }, [effects.length, setEffects, onEffectComplete]);

  if (!effects || effects.length === 0) return null;

  return (
    <Group name="mistwalker-effects-layer">
      {effects.map((effect) => {
        if (effect.paradigm === 'projectile' || effect.paradigm === 'ray') {
          return (
            <TrajectoryNode
              key={effect.id}
              effect={effect}
              gridSize={gridSize}
              stageScale={stageScale}
              onArrival={() => {
                if (onEffectComplete) {
                  onEffectComplete(effect.id);
                }
              }}
            />
          );
        }

        return (
          <Jb2aCanvasNode
            key={effect.id}
            effect={effect}
            gridSize={gridSize}
            stageScale={stageScale}
          />
        );
      })}
    </Group>
  );
});
