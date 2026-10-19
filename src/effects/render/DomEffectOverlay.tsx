// src/effects/render/DomEffectOverlay.tsx
// Hardware-Accelerated GPU DOM Video Effects Overlay for MistWalker 4.0
// Features 60 FPS zero-overhead GPU compositing, native VP9 alpha transparency,
// and live animated targeting preview under the cursor while aiming spells.

import React, { useEffect, useCallback } from 'react';
import { VttEffectInstance, Jb2aAssetDefinition } from '../types/effect';
import { soundCatalog } from '../db/soundCatalog';

interface DomEffectOverlayProps {
  effects: VttEffectInstance[];
  setEffects?: React.Dispatch<React.SetStateAction<VttEffectInstance[]>>;
  stagePos: { x: number; y: number };
  stageScale: number;
  gridSize: number;
  activeEquippedAsset?: Jb2aAssetDefinition | null;
  aimOrigin?: { x: number; y: number } | null;
  aimCurrent?: { x: number; y: number } | null;
  onEffectComplete?: (effectId: string) => void;
}

export const DomEffectOverlay: React.FC<DomEffectOverlayProps> = React.memo(({
  effects,
  setEffects,
  stagePos,
  stageScale,
  gridSize,
  activeEquippedAsset,
  aimOrigin,
  aimCurrent,
  onEffectComplete
}) => {
  // Lifetime expiration timer for non-persistent single-shot blasts (e.g. 5s fallback)
  useEffect(() => {
    if (!setEffects || effects.length === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const expired = effects.filter(e => !e.isPersistent && !e.loop && e.durationMs && (now - e.castTime > e.durationMs));
      if (expired.length > 0) {
        setEffects(prev => prev.filter(e => !expired.some(x => x.id === e.id)));
        expired.forEach(e => onEffectComplete?.(e.id));
      }
    }, 500);

    return () => clearInterval(interval);
  }, [effects, setEffects, onEffectComplete]);

  const handleEnded = useCallback((effect: VttEffectInstance) => {
    if (effect.isPersistent || effect.loop) return;

    // Check if projectile has an impact explosion burst
    if (effect.paradigm === 'projectile' || effect.paradigm === 'ray') {
      if (effect.trajectory?.burstOnImpact && effect.trajectory.burstVideoUrl && setEffects) {
        const burstEffect: VttEffectInstance = {
          id: `eff_burst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: `${effect.name} Impact`,
          label: `${effect.name} Impact`,
          assetKey: effect.assetKey,
          videoUrl: effect.trajectory.burstVideoUrl,
          thumbUrl: effect.thumbUrl,
          paradigm: 'point',
          x: effect.targetX ?? effect.x,
          y: effect.targetY ?? effect.y,
          sizeFt: effect.sizeFt,
          rotation: 0,
          opacity: 1.0,
          blendMode: effect.blendMode,
          isPersistent: false,
          loop: false,
          castTime: Date.now(),
          durationMs: 3500,
          soundKey: effect.trajectory.burstSoundKey || effect.soundKey,
          color: effect.color
        };
        setEffects(prev => [...prev.filter(e => e.id !== effect.id), burstEffect]);
        if (burstEffect.soundKey) {
          soundCatalog.play(burstEffect.soundKey);
        }
        return;
      }
    }

    // Cleanly remove completed effect
    if (setEffects) {
      setEffects(prev => prev.filter(e => e.id !== effect.id));
    }
    onEffectComplete?.(effect.id);
  }, [setEffects, onEffectComplete]);

  const hasEffects = Boolean(effects && effects.length > 0);
  const hasAimPreview = Boolean(activeEquippedAsset && aimCurrent);

  if (!hasEffects && !hasAimPreview) return null;

  return (
    <div
      id="mistwalker-dom-effects-overlay-viewport"
      className="absolute inset-0 pointer-events-none overflow-hidden select-none z-20"
      style={{ isolation: 'isolate' }}
    >
      <div
        id="mistwalker-dom-effects-overlay-world"
        className="absolute top-0 left-0 w-0 h-0 pointer-events-none"
        style={{
          transform: `translate3d(${stagePos.x}px, ${stagePos.y}px, 0) scale(${stageScale})`,
          transformOrigin: '0 0',
          willChange: 'transform'
        }}
      >
        {/* 1. Active In-World Visual Effects (Hardware-accelerated native transparent WebMs) */}
        {effects.map((effect) => {
          const sizeFt = effect.sizeFt || 20;

          // A. Ranged Projectile / Trajectory Beam (.stretchTo paradigm)
          if (effect.paradigm === 'projectile' || effect.paradigm === 'ray') {
            const startX = effect.originX ?? effect.x;
            const startY = effect.originY ?? effect.y;
            const targetX = effect.targetX ?? effect.x;
            const targetY = effect.targetY ?? effect.y;
            const dx = targetX - startX;
            const dy = targetY - startY;
            const distance = Math.max(10, Math.hypot(dx, dy));
            const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
            const beamWidth = distance;
            const beamHeight = Math.max(gridSize * 0.8, Math.min(gridSize * 2, distance * 0.25));

            return (
              <video
                key={effect.id}
                src={effect.videoUrl}
                autoPlay
                muted
                playsInline
                preload="auto"
                onLoadedData={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                onError={(e) => console.warn('Effect video load failed:', effect.videoUrl, e)}
                onEnded={() => handleEnded(effect)}
                style={{
                  position: 'absolute',
                  left: `${startX}px`,
                  top: `${startY}px`,
                  width: `${beamWidth}px`,
                  height: `${beamHeight}px`,
                  transform: `translate(0px, -50%) rotate(${angleDeg}deg) translateZ(0)`,
                  transformOrigin: '0 50%',
                  objectFit: 'fill',
                  opacity: effect.opacity ?? 1.0,
                  filter: 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.25))',
                  pointerEvents: 'none'
                }}
              />
            );
          }

          // B. Cone Spells (Burning Hands, Cone of Cold)
          if (effect.paradigm === 'cone') {
            const coneLength = (sizeFt / 5) * gridSize;
            const coneSpread = coneLength;
            return (
              <video
                key={effect.id}
                src={effect.videoUrl}
                autoPlay
                muted
                playsInline
                preload="auto"
                loop={Boolean(effect.loop || effect.isPersistent)}
                onLoadedData={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                onError={(e) => console.warn('Effect video load failed:', effect.videoUrl, e)}
                onEnded={() => handleEnded(effect)}
                style={{
                  position: 'absolute',
                  left: `${effect.x}px`,
                  top: `${effect.y}px`,
                  width: `${coneLength}px`,
                  height: `${coneSpread}px`,
                  transform: `translate(0px, -50%) rotate(${effect.rotation || 0}deg) translateZ(0)`,
                  transformOrigin: '0 50%',
                  objectFit: 'fill',
                  opacity: effect.opacity ?? 1.0,
                  filter: 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.25))',
                  pointerEvents: 'none'
                }}
              />
            );
          }

          // C. Line Spells (Lightning Bolt, Sunbeam)
          if (effect.paradigm === 'line') {
            const lineLength = (sizeFt / 5) * gridSize;
            const beamHeight = Math.max(gridSize, lineLength / 10);
            return (
              <video
                key={effect.id}
                src={effect.videoUrl}
                autoPlay
                muted
                playsInline
                preload="auto"
                loop={Boolean(effect.loop || effect.isPersistent)}
                onLoadedData={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                onError={(e) => console.warn('Effect video load failed:', effect.videoUrl, e)}
                onEnded={() => handleEnded(effect)}
                style={{
                  position: 'absolute',
                  left: `${effect.x}px`,
                  top: `${effect.y}px`,
                  width: `${lineLength}px`,
                  height: `${beamHeight}px`,
                  transform: `translate(0px, -50%) rotate(${effect.rotation || 0}deg) translateZ(0)`,
                  transformOrigin: '0 50%',
                  objectFit: 'fill',
                  opacity: effect.opacity ?? 1.0,
                  filter: 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.25))',
                  pointerEvents: 'none'
                }}
              />
            );
          }

          // D. Point / Sphere / Circle / Aura (Fireball, Darkness, Fog Cloud, Web)
          const diameterFt = sizeFt * 2;
          const pixelDiameter = (diameterFt / 5) * gridSize;
          return (
            <video
              key={effect.id}
              src={effect.videoUrl}
              autoPlay
              muted
              playsInline
              preload="auto"
              loop={Boolean(effect.loop || effect.isPersistent)}
              onLoadedData={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
              onError={(e) => console.warn('Effect video load failed:', effect.videoUrl, e)}
              onEnded={() => handleEnded(effect)}
              style={{
                position: 'absolute',
                left: `${effect.x}px`,
                top: `${effect.y}px`,
                width: `${pixelDiameter}px`,
                height: `${pixelDiameter}px`,
                transform: `translate(-50%, -50%) rotate(${effect.rotation || 0}deg) translateZ(0)`,
                transformOrigin: '50% 50%',
                objectFit: 'fill',
                opacity: effect.opacity ?? 1.0,
                filter: 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.25))',
                pointerEvents: 'none'
              }}
            />
          );
        })}

        {/* 2. Live Animated Targeting Preview (Follows mouse cursor while aiming spells) */}
        {hasAimPreview && activeEquippedAsset && aimCurrent && (() => {
          const previewSize = activeEquippedAsset.defaultSizeFt || 20;

          // A. Point / Sphere preview under cursor (Fireball, Fog Cloud, Web, Darkness, etc.)
          if (activeEquippedAsset.paradigm === 'point' || activeEquippedAsset.shape === 'circle' || activeEquippedAsset.paradigm === 'aura') {
            const previewDiameter = ((previewSize * 2) / 5) * gridSize;
            const previewVideo = activeEquippedAsset.loopWebm || activeEquippedAsset.webm;
            return (
              <video
                key="aim-preview-point"
                src={previewVideo}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                style={{
                  position: 'absolute',
                  left: `${aimCurrent.x}px`,
                  top: `${aimCurrent.y}px`,
                  width: `${previewDiameter}px`,
                  height: `${previewDiameter}px`,
                  transform: 'translate(-50%, -50%) translateZ(0)',
                  transformOrigin: '50% 50%',
                  objectFit: 'fill',
                  opacity: 0.8,
                  filter: 'drop-shadow(0 0 16px rgba(255, 255, 255, 0.4))',
                  pointerEvents: 'none'
                }}
              />
            );
          }

          // B. Cone / Line preview from origin to cursor
          if (aimOrigin && (activeEquippedAsset.paradigm === 'cone' || activeEquippedAsset.paradigm === 'line')) {
            const dx = aimCurrent.x - aimOrigin.x;
            const dy = aimCurrent.y - aimOrigin.y;
            const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
            const isCone = activeEquippedAsset.paradigm === 'cone';
            const length = (previewSize / 5) * gridSize;
            const spreadOrHeight = isCone ? length : Math.max(gridSize, length / 10);

            return (
              <video
                key="aim-preview-directional"
                src={activeEquippedAsset.webm}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                style={{
                  position: 'absolute',
                  left: `${aimOrigin.x}px`,
                  top: `${aimOrigin.y}px`,
                  width: `${length}px`,
                  height: `${spreadOrHeight}px`,
                  transform: `translate(0px, -50%) rotate(${angleDeg}deg) translateZ(0)`,
                  transformOrigin: '0 50%',
                  objectFit: 'fill',
                  opacity: 0.8,
                  filter: 'drop-shadow(0 0 16px rgba(255, 255, 255, 0.4))',
                  pointerEvents: 'none'
                }}
              />
            );
          }

          // C. Projectile beam preview stretching from origin to cursor
          if (aimOrigin && (activeEquippedAsset.paradigm === 'projectile' || activeEquippedAsset.paradigm === 'ray')) {
            const dx = aimCurrent.x - aimOrigin.x;
            const dy = aimCurrent.y - aimOrigin.y;
            const distance = Math.max(20, Math.hypot(dx, dy));
            const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
            const beamHeight = Math.max(gridSize * 0.8, Math.min(gridSize * 2, distance * 0.25));
            const videoUrl = activeEquippedAsset.projectileWebm || activeEquippedAsset.webm;

            return (
              <video
                key="aim-preview-projectile"
                src={videoUrl}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                style={{
                  position: 'absolute',
                  left: `${aimOrigin.x}px`,
                  top: `${aimOrigin.y}px`,
                  width: `${distance}px`,
                  height: `${beamHeight}px`,
                  transform: `translate(0px, -50%) rotate(${angleDeg}deg) translateZ(0)`,
                  transformOrigin: '0 50%',
                  objectFit: 'fill',
                  opacity: 0.8,
                  filter: 'drop-shadow(0 0 16px rgba(255, 255, 255, 0.4))',
                  pointerEvents: 'none'
                }}
              />
            );
          }

          return null;
        })()}
      </div>
    </div>
  );
});
