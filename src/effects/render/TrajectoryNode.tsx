// src/effects/render/TrajectoryNode.tsx
// Vector Trajectory & Projectile Travel Engine (Source -> Target Interpolation)

import React, { useEffect, useState, useRef } from 'react';
import { Group, Circle, Line, Image as KonvaImage } from 'react-konva';
import { VttEffectInstance } from '../types/effect';
import { videoPool } from '../engine/VideoPool';
import { soundCatalog } from '../db/soundCatalog';

interface TrajectoryNodeProps {
  effect: VttEffectInstance;
  gridSize: number;
  stageScale: number;
  onArrival?: () => void;
}

export const TrajectoryNode: React.FC<TrajectoryNodeProps> = React.memo(({
  effect,
  gridSize,
  stageScale,
  onArrival
}) => {
  const [progress, setProgress] = useState(0); // 0.0 to 1.0
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const imageRef = useRef<any>(null);
  const hasTriggeredArrival = useRef(false);

  const startX = effect.x;
  const startY = effect.y;
  const targetX = effect.targetX ?? effect.x;
  const targetY = effect.targetY ?? effect.y;

  const dx = targetX - startX;
  const dy = targetY - startY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);

  // Velocity: ~1200 px/sec (e.g. 300px takes 250ms, 1200px takes 1000ms)
  const durationMs = Math.max(200, Math.min(1000, (distance / 1200) * 1000));

  useEffect(() => {
    let active = true;
    let acquired: HTMLVideoElement | null = null;

    async function loadBoltVideo() {
      if (effect.videoUrl) {
        try {
          acquired = await videoPool.acquire(effect.videoUrl, true);
          if (active) setVideoElement(acquired);
        } catch (e) {}
      }
    }

    loadBoltVideo();

    return () => {
      active = false;
      if (acquired) videoPool.release(acquired);
    };
  }, [effect.videoUrl]);

  // Interpolation Animation Loop
  useEffect(() => {
    const startTime = performance.now();
    let animId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      setProgress(t);

      if (imageRef.current) {
        imageRef.current.getLayer()?.batchDraw();
      }

      if (t < 1) {
        animId = requestAnimationFrame(tick);
      } else if (!hasTriggeredArrival.current) {
        hasTriggeredArrival.current = true;
        if (effect.soundKey) {
          soundCatalog.play(effect.soundKey);
        }
        if (onArrival) {
          onArrival();
        }
      }
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [durationMs, onArrival, effect.soundKey]);

  // Current interpolated position
  const currentX = startX + dx * progress;
  const currentY = startY + dy * progress;
  const sizePx = Math.max(20, (gridSize / 2));

  if (progress >= 1) return null;

  return (
    <Group>
      {/* Dynamic Laser / Energy Trace */}
      <Line
        points={[startX, startY, currentX, currentY]}
        stroke={effect.color || '#a855f7'}
        strokeWidth={3 / stageScale}
        opacity={0.6 * (1 - progress * 0.5)}
        listening={false}
      />

      {/* Travelling Head Node */}
      <Group x={currentX} y={currentY} rotation={angleDeg}>
        {videoElement ? (
          <KonvaImage
            ref={imageRef}
            image={videoElement}
            x={0}
            y={0}
            width={sizePx * 2}
            height={sizePx * 2}
            offsetX={sizePx}
            offsetY={sizePx}
            globalCompositeOperation={effect.blendMode === 'screen' ? 'screen' : 'lighter'}
            listening={false}
          />
        ) : (
          <Circle
            radius={sizePx * 0.4}
            fill={effect.color || '#c084fc'}
            shadowColor={effect.color || '#a855f7'}
            shadowBlur={10}
            opacity={0.9}
            listening={false}
          />
        )}
      </Group>
    </Group>
  );
});
