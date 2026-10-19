import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Image as KonvaImage, Group } from 'react-konva';
import { Effect } from '../types';
import { findJb2aAsset, Jb2aAsset } from '../data/jb2aDatabase';
import { ProceduralSpellEffect } from './ProceduralSpellEffect';

interface Jb2aSpellEffectProps {
  effect: Effect;
  gridSize?: number;
  stageScale?: number;
}

/**
 * Jb2aSpellEffect - Renders authentic Jules & Ben's Animated Assets (JB2A)
 * Plays hardware-accelerated transparent WebM video animations directly on the Konva battlemap,
 * with automatic fallback to procedural canvas rendering during load or offline.
 */
export const Jb2aSpellEffect: React.FC<Jb2aSpellEffectProps> = ({
  effect,
  gridSize = 50,
  stageScale = 1
}) => {
  const imageRef = useRef<any>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Match the effect to the JB2A database
  const jb2aAsset: Jb2aAsset | undefined = useMemo(() => {
    // 1. Direct match on videoUrl if provided
    if ((effect as any).jb2aId) {
      const match = findJb2aAsset((effect as any).jb2aId);
      if (match) return match;
    }
    // 2. Match on effect name / label / id
    const query = `${effect.label || ''} ${effect.name || ''} ${(effect as any).spellId || ''} ${effect.id || ''}`;
    return findJb2aAsset(query);
  }, [effect.id, effect.label, effect.name, (effect as any).spellId, (effect as any).jb2aId]);

  // Determine video URL (prefer loopWebm for persistent effects)
  const targetVideoUrl = useMemo(() => {
    if ((effect as any).videoUrl) return (effect as any).videoUrl;
    if (!jb2aAsset) return null;
    if (effect.isPersistent && jb2aAsset.loopWebm) {
      return jb2aAsset.loopWebm;
    }
    return jb2aAsset.webm;
  }, [effect, jb2aAsset]);

  // Fallback raw GitHub URL if CDN has network issue
  const fallbackRawUrl = useMemo(() => {
    if (!jb2aAsset) return null;
    if (effect.isPersistent && jb2aAsset.rawLoopWebm) {
      return jb2aAsset.rawLoopWebm;
    }
    return jb2aAsset.rawWebm;
  }, [effect.isPersistent, jb2aAsset]);

  useEffect(() => {
    if (!targetVideoUrl) {
      setVideoElement(null);
      setIsVideoReady(false);
      return;
    }

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.loop = !!effect.isPersistent;

    let isMounted = true;

    const handleCanPlay = () => {
      if (!isMounted) return;
      setIsVideoReady(true);
      video.play().catch(() => {
        // Autoplay policy or user gesture required
      });
    };

    const handleError = () => {
      if (!isMounted) return;
      // Try raw GitHub fallback if CDN fails
      if (video.src !== fallbackRawUrl && fallbackRawUrl) {
        video.src = fallbackRawUrl;
        video.load();
      } else {
        setHasError(true);
      }
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    video.src = targetVideoUrl;
    video.load();
    setVideoElement(video);

    return () => {
      isMounted = false;
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      video.pause();
      video.src = '';
      video.load();
    };
  }, [targetVideoUrl, fallbackRawUrl, effect.isPersistent]);

  // Continuous animation loop for Konva batchDraw
  useEffect(() => {
    if (!videoElement || !isVideoReady) return;

    let animId: number;
    let lastDraw = 0;

    const update = (currentTime: number) => {
      // Throttle canvas draw to ~30fps to conserve GPU
      if (currentTime - lastDraw >= 32) {
        lastDraw = currentTime;
        if (!videoElement.paused && !videoElement.ended) {
          imageRef.current?.getLayer()?.batchDraw();
        }
      }
      animId = requestAnimationFrame(update);
    };

    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [videoElement, isVideoReady]);

  // Geometry calculations for Shape (Circle, Cone, Line)
  const isCone = effect.type === 'cone';
  const isLine = effect.type === 'line';
  const size = Math.max(16, effect.size);

  let imgW: number;
  let imgH: number;
  let imgX: number;
  let imgY: number;
  let imgOffsetX: number;
  let imgOffsetY: number;

  if (isCone) {
    imgW = size;
    imgH = size * 1.15;
    imgX = 0;
    imgY = 0;
    imgOffsetX = 0;
    imgOffsetY = imgH / 2;
  } else if (isLine) {
    imgW = size;
    imgH = Math.max(gridSize * 1.2, Math.min(gridSize * 3, size * 0.15));
    imgX = 0;
    imgY = 0;
    imgOffsetX = 0;
    imgOffsetY = imgH / 2;
  } else {
    // Circle
    imgW = size * 2;
    imgH = size * 2;
    imgX = 0;
    imgY = 0;
    imgOffsetX = size;
    imgOffsetY = size;
  }

  // If no JB2A asset matched or video errored, render procedural effect
  if (!jb2aAsset || hasError || !targetVideoUrl) {
    return (
      <ProceduralSpellEffect
        effect={effect}
        gridSize={gridSize}
        stageScale={stageScale}
      />
    );
  }

  return (
    <Group>
      {/* Fallback procedural glow while video is loading */}
      {!isVideoReady && (
        <ProceduralSpellEffect
          effect={effect}
          gridSize={gridSize}
          stageScale={stageScale}
        />
      )}

      {/* Hardware-Accelerated JB2A Transparent WebM Animation */}
      {isVideoReady && videoElement && (
        <KonvaImage
          ref={imageRef}
          name="effect"
          image={videoElement}
          x={imgX}
          y={imgY}
          width={imgW}
          height={imgH}
          offsetX={imgOffsetX}
          offsetY={imgOffsetY}
          rotation={isCone || isLine ? (effect.rotation || 0) : 0}
          opacity={effect.opacity !== undefined ? effect.opacity : 1.0}
          globalCompositeOperation={jb2aAsset.blendMode || effect.blendMode || 'screen'}
        />
      )}
    </Group>
  );
};
