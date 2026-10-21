// src/effects/render/DomEffectOverlay.tsx
// Hardware-Accelerated GPU DOM Video Effects Overlay for MistWalker 4.0
// Features 60 FPS zero-overhead GPU compositing, native VP9 alpha transparency,
// and live animated targeting preview under the cursor while aiming spells.

import React, { useEffect, useCallback } from 'react';
import { VttEffectInstance, Jb2aAssetDefinition } from '../types/effect';
import { soundCatalog } from '../db/soundCatalog';
import { getConditionFx, getAuraVideoUrl } from '../db/tokenFxMap';

interface DomEffectOverlayProps {
  effects: VttEffectInstance[];
  setEffects?: React.Dispatch<React.SetStateAction<VttEffectInstance[]>>;
  stagePos: { x: number; y: number };
  stageScale: number;
  gridSize: number;
  tokens?: any[];
  combatants?: any[];
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
  tokens,
  combatants,
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
      if (effect.trajectory?.burstOnImpact && effect.trajectory.burstVideoUrl && effect.trajectory.burstVideoUrl !== effect.videoUrl && setEffects) {
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
  const hasTokens = Boolean(tokens && tokens.length > 0);

  if (!hasEffects && !hasAimPreview && !hasTokens) return null;

  return (
    <div
      id="mistwalker-dom-effects-overlay-viewport"
      className="absolute inset-0 pointer-events-none overflow-hidden select-none z-[35]"
      style={{ isolation: 'isolate' }}
    >
      <div
        id="mistwalker-dom-effects-overlay-world"
        className="absolute top-0 left-0 pointer-events-none"
        style={{
          transform: `translate3d(${stagePos.x}px, ${stagePos.y}px, 0) scale(${stageScale})`,
          transformOrigin: '0 0',
          willChange: 'transform'
        }}
      >
        {/* 1. Animated Token Auras (Looping JB2A runes, spirit guardians, cold auras, nature swirls) */}
        {tokens?.map((token) => {
          const tokenSize = token.size || 1;
          const tokenWidth = gridSize * tokenSize;
          const tokenRadius = tokenWidth / 2;
          const centerX = (token.x ?? 0) + tokenRadius;
          const centerY = (token.y ?? 0) + tokenRadius;

          const auras: any[] = [];
          if (Array.isArray(token.auras) && token.auras.length > 0) {
            auras.push(...token.auras);
          } else if (token.auraRadius && token.auraRadius > 0) {
            auras.push({
              radius: token.auraRadius,
              color: token.auraColor,
              opacity: token.auraOpacity,
              name: token.auraName,
              videoUrl: token.videoUrl || (token as any).auraVideoUrl
            });
          }

          if (auras.length === 0) return null;

          return auras.map((aura, idx) => {
            const auraFt = aura.radius || 10;
            const auraVideo = aura.videoUrl || getAuraVideoUrl(aura.name, aura.color);
            if (!auraVideo) return null;

            const auraPixelRadius = tokenRadius + (auraFt / 5) * gridSize;
            const auraDiameter = auraPixelRadius * 2;
            const auraOpacity = aura.opacity ?? 0.35;

            return (
              <video
                key={`aura-${token.id}-${idx}`}
                src={auraVideo}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                onLoadedData={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                onError={(e) => console.warn('Aura video load failed:', auraVideo, e)}
                style={{
                  position: 'absolute',
                  left: `${centerX}px`,
                  top: `${centerY}px`,
                  width: `${auraDiameter}px`,
                  height: `${auraDiameter}px`,
                  maxWidth: 'none',
                  maxHeight: 'none',
                  minWidth: `${auraDiameter}px`,
                  minHeight: `${auraDiameter}px`,
                  transform: 'translate(-50%, -50%) translateZ(0)',
                  transformOrigin: '50% 50%',
                  objectFit: 'contain',
                  opacity: auraOpacity,
                  pointerEvents: 'none',
                  filter: 'drop-shadow(0 0 16px rgba(255, 255, 255, 0.2))'
                }}
              />
            );
          });
        })}

        {/* 2. Active In-World Visual Effects (Hardware-accelerated native transparent WebMs) */}
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
                  maxWidth: 'none',
                  maxHeight: 'none',
                  minWidth: `${beamWidth}px`,
                  minHeight: `${beamHeight}px`,
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
                  maxWidth: 'none',
                  maxHeight: 'none',
                  minWidth: `${coneLength}px`,
                  minHeight: `${coneSpread}px`,
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
                  maxWidth: 'none',
                  maxHeight: 'none',
                  minWidth: `${lineLength}px`,
                  minHeight: `${beamHeight}px`,
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
                maxWidth: 'none',
                maxHeight: 'none',
                minWidth: `${pixelDiameter}px`,
                minHeight: `${pixelDiameter}px`,
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

        {/* 3. Animated Token Condition Overlays (Dizzy stars, poison clouds, charm hearts, fear, ice, fire, skulls) */}
        {tokens?.map((token) => {
          const tokenSize = token.size || 1;
          const tokenWidth = gridSize * tokenSize;
          const tokenRadius = tokenWidth / 2;
          const centerX = (token.x ?? 0) + tokenRadius;
          const centerY = (token.y ?? 0) + tokenRadius;

          const conditionsSet = new Set<string>();
          if (Array.isArray(token.conditions)) {
            token.conditions.forEach((c: string) => { if (c) conditionsSet.add(c); });
          }
          if (combatants && combatants.length > 0) {
            const matched = combatants.find((c: any) =>
              c.id === token.id ||
              c.tokenId === token.id ||
              (c.name && token.name && c.name.toLowerCase().trim() === token.name.toLowerCase().trim())
            );
            if (Array.isArray(matched?.conditions)) {
              matched.conditions.forEach((c: string) => { if (c) conditionsSet.add(c); });
            }
          }

          const conditions = Array.from(conditionsSet);
          if (conditions.length === 0) return null;

          return conditions.map((conditionName) => {
            const fx = getConditionFx(conditionName);
            if (!fx) return null;

            const condDiameter = tokenWidth * (fx.sizeMultiplier || 1.25);
            const offsetY = tokenWidth * (fx.yOffset || 0);

            return (
              <video
                key={`cond-${token.id}-${fx.condition}`}
                src={fx.videoUrl}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                onLoadedData={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                onError={(e) => console.warn('Condition video load failed:', fx.videoUrl, e)}
                style={{
                  position: 'absolute',
                  left: `${centerX}px`,
                  top: `${centerY + offsetY}px`,
                  width: `${condDiameter}px`,
                  height: `${condDiameter}px`,
                  maxWidth: 'none',
                  maxHeight: 'none',
                  minWidth: `${condDiameter}px`,
                  minHeight: `${condDiameter}px`,
                  transform: 'translate(-50%, -50%) translateZ(0)',
                  transformOrigin: '50% 50%',
                  objectFit: 'contain',
                  opacity: fx.opacity ?? 0.9,
                  pointerEvents: 'none',
                  filter: 'drop-shadow(0 0 10px rgba(0, 0, 0, 0.5))'
                }}
              />
            );
          });
        })}

        {/* 4. Live Animated Targeting Preview (Follows mouse cursor while aiming spells) */}
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
                  maxWidth: 'none',
                  maxHeight: 'none',
                  minWidth: `${previewDiameter}px`,
                  minHeight: `${previewDiameter}px`,
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
                  maxWidth: 'none',
                  maxHeight: 'none',
                  minWidth: `${length}px`,
                  minHeight: `${spreadOrHeight}px`,
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
                  maxWidth: 'none',
                  maxHeight: 'none',
                  minWidth: `${distance}px`,
                  minHeight: `${beamHeight}px`,
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
