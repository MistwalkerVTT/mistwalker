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

// Global DOM container for offscreen video playback to ensure browser priority & buffering
const getOrCreateVideoContainer = (): HTMLElement => {
  let container = document.getElementById('jb2a-video-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'jb2a-video-container';
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '1px';
    container.style.height = '1px';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '-1';
    document.body.appendChild(container);
  }
  return container;
};

/**
 * Jb2aSpellEffect - Renders authentic Jules & Ben's Animated Assets (JB2A)
 * Plays hardware-accelerated transparent WebM video animations directly on the Konva battlemap.
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
    if ((effect as any).jb2aId) {
      const match = findJb2aAsset((effect as any).jb2aId);
      if (match) return match;
    }
    const cleanLabel = (effect.label || '').trim();
    if (cleanLabel) {
      const match = findJb2aAsset(cleanLabel);
      if (match) return match;
    }
    const cleanName = ((effect as any).name || '').trim();
    if (cleanName) {
      const match = findJb2aAsset(cleanName);
      if (match) return match;
    }
    const spellId = ((effect as any).spellId || '').trim();
    if (spellId) {
      const match = findJb2aAsset(spellId);
      if (match) return match;
    }
    return findJb2aAsset(effect.id);
  }, [effect.id, effect.label, (effect as any).name, (effect as any).spellId, (effect as any).jb2aId]);

  // Determine video URL (prefer loopWebm for persistent effects)
  const targetVideoUrl = useMemo(() => {
    if ((effect as any).videoUrl) return (effect as any).videoUrl;
    if (!jb2aAsset) return null;
    if (effect.isPersistent && jb2aAsset.loopWebm) {
      return jb2aAsset.loopWebm;
    }
    return jb2aAsset.webm;
  }, [effect.isPersistent, (effect as any).videoUrl, jb2aAsset]);

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

    const container = getOrCreateVideoContainer();
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.preload = 'auto';
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('muted', '');
    video.loop = !!effect.isPersistent;

    container.appendChild(video);

    let isMounted = true;

    const startPlayback = () => {
      if (!isMounted) return;
      setIsVideoReady(true);
      video.play().catch(() => {
        // Silent catch for browser gesture handling
      });
    };

    const handleLoadedData = () => {
      startPlayback();
    };

    const handleCanPlay = () => {
      startPlayback();
    };

    const handleError = () => {
      if (!isMounted) return;
      if (video.src !== fallbackRawUrl && fallbackRawUrl) {
        video.src = fallbackRawUrl;
        video.load();
        video.play().catch(() => {});
      } else {
        setHasError(true);
      }
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    video.src = targetVideoUrl;
    video.load();
    video.play().catch(() => {});
    setVideoElement(video);

    return () => {
      isMounted = false;
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      video.pause();
      try {
        if (video.parentNode) {
          video.parentNode.removeChild(video);
        }
      } catch (_) {}
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
      // Throttle canvas draw to ~30fps to balance smooth playback and performance
      if (currentTime - lastDraw >= 32) {
        lastDraw = currentTime;
        // Even when video has ended, hold the final frame on canvas
        if (videoElement.readyState >= 2) {
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

  // If no JB2A asset matched or video errored completely, render procedural effect
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
      {/* Brief procedural glow while video buffers initial frames */}
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
