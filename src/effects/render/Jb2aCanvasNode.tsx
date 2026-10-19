// src/effects/render/Jb2aCanvasNode.tsx
// High-performance Konva node rendering hardware-accelerated transparent WebMs

import React, { useEffect, useRef, useState } from 'react';
import { Image as KonvaImage, Group } from 'react-konva';
import { VttEffectInstance } from '../types/effect';
import { videoPool } from '../engine/VideoPool';

interface Jb2aCanvasNodeProps {
  effect: VttEffectInstance;
  gridSize: number;
  stageScale: number;
}

export const Jb2aCanvasNode: React.FC<Jb2aCanvasNodeProps> = React.memo(({
  effect,
  gridSize,
  stageScale
}) => {
  const imageRef = useRef<any>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

  // Compute physical pixel dimensions from 5e grid feet: 5ft = 1 grid square
  const pixelRadius = ((effect.sizeFt || 20) / 5) * (gridSize / 2);
  const pixelWidth = pixelRadius * 2;
  const pixelHeight = pixelRadius * 2;

  useEffect(() => {
    let active = true;
    let acquiredVideo: HTMLVideoElement | null = null;

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

  // Reliable RAF loop to synchronize Konva layer drawing with video playback
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

    videoElement.addEventListener('playing', onPlayEvent);
    videoElement.addEventListener('loadeddata', onPlayEvent);
    videoElement.addEventListener('timeupdate', onPlayEvent);

    return () => {
      isMounted = false;
      cancelAnimationFrame(animId);
      videoElement.removeEventListener('playing', onPlayEvent);
      videoElement.removeEventListener('loadeddata', onPlayEvent);
      videoElement.removeEventListener('timeupdate', onPlayEvent);
    };
  }, [videoElement]);

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
        width={pixelWidth}
        height={pixelHeight}
        offsetX={pixelWidth / 2}
        offsetY={pixelHeight / 2}
        globalCompositeOperation={compositeOp}
        listening={false}
      />
    </Group>
  );
});
