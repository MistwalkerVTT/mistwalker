// src/effects/render/Jb2aCanvasNode.tsx
// High-performance Konva node rendering hardware-accelerated transparent WebMs
// Full Sequencer & JB2A paradigm support (Cones vertex-anchored, Lines stretched, Spheres true 5e diameter)

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Image as KonvaImage, Group } from 'react-konva';
import { VttEffectInstance } from '../types/effect';
import { videoPool } from '../engine/VideoPool';

interface Jb2aCanvasNodeProps {
  effect: VttEffectInstance;
  gridSize: number;
  stageScale: number;
  onComplete?: (effectId: string) => void;
}

export const Jb2aCanvasNode: React.FC<Jb2aCanvasNodeProps> = React.memo(({
  effect,
  gridSize,
  stageScale,
  onComplete
}) => {
  const imageRef = useRef<any>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const isCompletedRef = useRef(false);

  // Compute paradigm-accurate physical dimensions and anchor offsets
  const { width, height, offsetX, offsetY } = useMemo(() => {
    const sizeFt = effect.sizeFt || 20;

    if (effect.paradigm === 'cone') {
      // 5e Cone: length = sizeFt. In JB2A, cone vertex is at the left-center edge (x: 0, y: 0.5)
      // Base width of a 5e cone equals its length
      const coneLength = (sizeFt / 5) * gridSize;
      const coneSpread = coneLength;
      return {
        width: coneLength,
        height: coneSpread,
        offsetX: 0, // Vertex anchored at caster token center
        offsetY: coneSpread / 2
      };
    }

    if (effect.paradigm === 'line') {
      // 5e Line: length = sizeFt. In JB2A, beam begins at left-center edge (x: 0, y: 0.5)
      const lineLength = (sizeFt / 5) * gridSize;
      const beamHeight = Math.max(gridSize, (lineLength / 10)); // Maintain high aspect ratio beam
      return {
        width: lineLength,
        height: beamHeight,
        offsetX: 0, // Origin anchored at caster
        offsetY: beamHeight / 2
      };
    }

    // Default: Point / Sphere / Circle / Aura AoE
    // In 5e, sizeFt is the RADIUS (e.g. 20ft Fireball = 40ft diameter = 8 grid squares)
    const diameterFt = sizeFt * 2;
    const pixelDiameter = (diameterFt / 5) * gridSize;
    return {
      width: pixelDiameter,
      height: pixelDiameter,
      offsetX: pixelDiameter / 2, // Centered on target point
      offsetY: pixelDiameter / 2
    };
  }, [effect.paradigm, effect.sizeFt, gridSize]);

  useEffect(() => {
    let active = true;
    let acquiredVideo: HTMLVideoElement | null = null;
    isCompletedRef.current = false;

    async function setupVideo() {
      if (!effect.videoUrl) return;
      try {
        acquiredVideo = await videoPool.acquire(effect.videoUrl, effect.loop || effect.isPersistent);
        if (active) {
          setVideoElement(acquiredVideo);
        }
      } catch (err) {
        console.warn('Failed to acquire video for effect:', effect.name, err);
      }
    }

    setupVideo();

    return () => {
      active = false;
      if (acquiredVideo) {
        videoPool.release(acquiredVideo);
      }
    };
  }, [effect.videoUrl, effect.loop, effect.isPersistent]);

  // Reliable RAF rendering loop & completion detection
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
      if (!effect.loop && !effect.isPersistent && !isCompletedRef.current) {
        isCompletedRef.current = true;
        if (onComplete) {
          onComplete(effect.id);
        }
      }
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
  }, [videoElement, effect.loop, effect.isPersistent, effect.id, onComplete]);

  if (!videoElement) {
    return null;
  }

  // Map blend mode to Konva globalCompositeOperation
  const compositeOp =
    effect.blendMode === 'screen'
      ? 'screen'
      : effect.blendMode === 'lighter'
      ? 'lighter'
      : effect.blendMode === 'multiply'
      ? 'multiply'
      : 'source-over';

  return (
    <Group
      x={effect.x}
      y={effect.y}
      rotation={effect.rotation || 0}
      opacity={effect.opacity !== undefined ? effect.opacity : 1.0}
    >
      <KonvaImage
        ref={imageRef}
        image={videoElement}
        x={0}
        y={0}
        width={width}
        height={height}
        offsetX={offsetX}
        offsetY={offsetY}
        globalCompositeOperation={compositeOp}
        listening={false}
      />
    </Group>
  );
});
