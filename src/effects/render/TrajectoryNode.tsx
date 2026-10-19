// src/effects/render/TrajectoryNode.tsx
// Native Sequencer-Grade Projectile & Beam Travel Engine (.stretchTo paradigm)
// Stretches authentic JB2A animated projectile beams from Caster to Target with auto-burst impact

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
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [progress, setProgress] = useState(0); // Fallback travel progress (0.0 to 1.0)
  const imageRef = useRef<any>(null);
  const hasTriggeredArrival = useRef(false);

  const startX = effect.originX ?? effect.x;
  const startY = effect.originY ?? effect.y;
  const targetX = effect.targetX ?? effect.x;
  const targetY = effect.targetY ?? effect.y;

  const dx = targetX - startX;
  const dy = targetY - startY;
  const distance = Math.max(10, Math.sqrt(dx * dx + dy * dy));
  const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);

  // Proportional beam dimensions matching JB2A 4:1 projectile aspect ratio
  const beamWidth = distance;
  const beamHeight = Math.max(gridSize * 0.8, Math.min(gridSize * 2, distance * 0.25));

  // Velocity: ~1400 px/sec (e.g. 350px takes 250ms, 1400px takes 1000ms)
  const durationMs = Math.max(350, Math.min(1200, (distance / 1400) * 1000));

  const triggerArrival = () => {
    if (hasTriggeredArrival.current) return;
    hasTriggeredArrival.current = true;
    if (effect.soundKey) {
      soundCatalog.play(effect.soundKey);
    }
    if (onArrival) {
      onArrival();
    }
  };

  useEffect(() => {
    let active = true;
    let acquired: HTMLVideoElement | null = null;

    async function loadBoltVideo() {
      if (effect.videoUrl) {
        try {
          acquired = await videoPool.acquire(effect.videoUrl, false);
          if (active) setVideoElement(acquired);
        } catch (e) {
          console.warn('Failed to acquire trajectory video:', effect.videoUrl, e);
        }
      }
    }

    loadBoltVideo();

    return () => {
      active = false;
      if (acquired) videoPool.release(acquired);
    };
  }, [effect.videoUrl]);

  // Video playback & RAF synchronization
  useEffect(() => {
    if (!videoElement) return;

    let animId: number;
    let isMounted = true;

    const render = () => {
      if (!isMounted) return;
      const layer = imageRef.current?.getLayer();
      if (layer && !videoElement.paused && !videoElement.ended) {
        layer.batchDraw();
      }
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    const onPlayEvent = () => {
      imageRef.current?.getLayer()?.batchDraw();
    };

    const onEndedEvent = () => {
      triggerArrival();
    };

    videoElement.addEventListener('playing', onPlayEvent);
    videoElement.addEventListener('loadeddata', onPlayEvent);
    videoElement.addEventListener('timeupdate', onPlayEvent);
    videoElement.addEventListener('ended', onEndedEvent);

    return () => {
      isMounted = false;
      cancelAnimationFrame(animId);
      videoElement.removeEventListener('playing', onPlayEvent);
      videoElement.removeEventListener('loadeddata', onPlayEvent);
      videoElement.removeEventListener('timeupdate', onPlayEvent);
      videoElement.removeEventListener('ended', onEndedEvent);
    };
  }, [videoElement]);

  // Fallback timer & motion progress loop (guarantees detonation if video stalls or ends)
  useEffect(() => {
    const startTime = performance.now();
    let animId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      setProgress(t);

      if (t < 1) {
        animId = requestAnimationFrame(tick);
      } else {
        triggerArrival();
      }
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [durationMs]);

  if (hasTriggeredArrival.current) return null;

  const currentX = startX + dx * progress;
  const currentY = startY + dy * progress;

  return (
    <Group>
      {/* 1. Stretched JB2A Projectile Beam (The authentic Sequencer .stretchTo implementation) */}
      {videoElement ? (
        <Group x={startX} y={startY} rotation={angleDeg}>
          <KonvaImage
            ref={imageRef}
            image={videoElement}
            x={0}
            y={0}
            width={beamWidth}
            height={beamHeight}
            offsetX={0} // Stretched from Caster at (0, 0)
            offsetY={beamHeight / 2} // Centered along flight path
            globalCompositeOperation={effect.blendMode === 'screen' ? 'screen' : 'lighter'}
            listening={false}
          />
        </Group>
      ) : (
        /* 2. Fallback Traveling Glowing Energy Missile */
        <Group>
          <Line
            points={[startX, startY, currentX, currentY]}
            stroke={effect.color || '#a855f7'}
            strokeWidth={3 / stageScale}
            dash={[6, 4]}
            opacity={0.6 * (1 - progress * 0.5)}
            listening={false}
          />
          <Circle
            x={currentX}
            y={currentY}
            radius={gridSize * 0.35}
            fill={effect.color || '#c084fc'}
            shadowColor={effect.color || '#a855f7'}
            shadowBlur={12}
            opacity={0.9}
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
});
