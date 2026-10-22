// src/effects/render/DomEffectOverlay.tsx
// Hardware-Accelerated GPU DOM Video Effects Overlay for MistWalker 4.0
// Features 60 FPS zero-overhead GPU compositing, native VP9 alpha transparency,
// and live animated targeting preview under the cursor while aiming spells.

import React, { useEffect, useCallback } from 'react';
import { X, Sparkles } from 'lucide-react';
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
  onDispelEffect?: (effectId: string) => void;
  onInspectEffect?: (effect: VttEffectInstance) => void;
  onClearTokenAura?: (tokenId: string, auraName?: string) => void;
}

const AURA_OR_TOKEN_BUFF_KEYWORDS = [
  'spirit guardians',
  'aura of vitality',
  'aura of life',
  'aura of purity',
  'crusader\'s mantle',
  'crusaders mantle',
  'holy aura',
  'circle of power',
  'detect magic',
  'shield of faith',
  'sanctuary',
  'shield',
  'bless',
  'mage armor',
  'armor of agathys',
  'fire shield',
  'shadow of moil',
  'ashardalon\'s stride',
  'ashardalons stride',
  'twilight sanctuary',
  'barkskin',
  'warding bond',
  'hunter\'s mark',
  'hunters mark',
  'globe of invulnerability',
  'antilife shell',
  'antimagic field'
];

function isAuraOrTokenLockedEffect(effect: VttEffectInstance): boolean {
  if (effect.attachedTokenId) return true;
  if (effect.paradigm === 'aura') return true;
  const lowerName = (effect.name || '').toLowerCase();
  const lowerKey = (effect.assetKey || '').toLowerCase().replace(/_/g, ' ');
  return AURA_OR_TOKEN_BUFF_KEYWORDS.some(k => lowerName.includes(k) || lowerKey.includes(k));
}

function resolveAttachedToken(
  effect: VttEffectInstance,
  tokens: any[] | undefined,
  gridSize: number
): any | null {
  if (!tokens || tokens.length === 0) return null;

  if (effect.attachedTokenId) {
    const byId = tokens.find((t: any) => t.id === effect.attachedTokenId);
    if (byId) return byId;
  }

  if (!isAuraOrTokenLockedEffect(effect)) {
    return null;
  }

  // Fallback 1: Match by ownerId (token id or token name)
  if (effect.ownerId) {
    const ownerLower = String(effect.ownerId).trim().toLowerCase();
    const byOwner = tokens.find(
      (t: any) => t.id === effect.ownerId || (t.name && t.name.trim().toLowerCase() === ownerLower)
    );
    if (byOwner) return byOwner;
  }

  // Fallback 2: Match by parenthesized target name in effect.name, e.g. "Shield of Faith (Stavros)"
  const parenMatch = (effect.name || '').match(/\(([^)]+)\)\s*$/);
  if (parenMatch && parenMatch[1]) {
    const targetLower = parenMatch[1].trim().toLowerCase();
    const byParen = tokens.find((t: any) => t.name && t.name.trim().toLowerCase() === targetLower);
    if (byParen) return byParen;
  }

  // Fallback 3: Match by casterName
  if (effect.casterName) {
    const casterLower = effect.casterName.trim().toLowerCase();
    const byCaster = tokens.find((t: any) => t.name && t.name.trim().toLowerCase() === casterLower);
    if (byCaster) return byCaster;
  }

  // Fallback 4: Nearest token on the board to the effect's coordinates
  let nearest: any = null;
  let bestDist = Infinity;
  for (const t of tokens) {
    const tRad = ((t.size || 1) * gridSize) / 2;
    const cx = (t.x ?? 0) + tRad;
    const cy = (t.y ?? 0) + tRad;
    const d = Math.hypot((effect.x ?? 0) - cx, (effect.y ?? 0) - cy);
    if (d < bestDist) {
      bestDist = d;
      nearest = t;
    }
  }
  return nearest;
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
  onEffectComplete,
  onDispelEffect,
  onInspectEffect,
  onClearTokenAura
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

          // D. Point / Sphere / Circle / Aura (Fireball, Darkness, Fog Cloud, Web, Spirit Guardians, Shield of Faith, Sanctuary)
          const attachedToken = resolveAttachedToken(effect, tokens, gridSize);
          const attachedTokenSize = attachedToken ? (attachedToken.size || 1) : 1;
          const attachedTokenRadius = (attachedTokenSize * gridSize) / 2;
          const posX = attachedToken ? (attachedToken.x ?? 0) + attachedTokenRadius : effect.x;
          const posY = attachedToken ? (attachedToken.y ?? 0) + attachedTokenRadius : effect.y;
          const rawSizeFt = effect.sizeFt || 5;
          const pixelDiameter = attachedToken
            ? (rawSizeFt >= 10
                ? (attachedTokenRadius + (rawSizeFt / 5) * gridSize) * 2
                : Math.max(attachedTokenSize * gridSize * 1.5, ((rawSizeFt * 2) / 5) * gridSize))
            : ((sizeFt * 2) / 5) * gridSize;

          return (
            <video
              key={effect.id}
              src={effect.videoUrl}
              autoPlay
              muted
              playsInline
              preload="auto"
              loop={Boolean(effect.loop || effect.isPersistent)}
              className={(effect.fadeInMs || effect.fadeOutMs || effect.assetKey === 'dimension_door' || effect.assetKey === 'arcane_gate' || effect.name?.toLowerCase().includes('dimension door')) ? 'animate-effect-fade-portal' : undefined}
              onLoadedData={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
              onError={(e) => console.warn('Effect video load failed:', effect.videoUrl, e)}
              onEnded={() => handleEnded(effect)}
              style={{
                position: 'absolute',
                left: `${posX}px`,
                top: `${posY}px`,
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

        {/* 2b. Direct On-Map Clickable Title & Dispel Pins for Persistent / Looping Spell Animations */}
        {effects.map((effect) => {
          if ((!onDispelEffect && !onInspectEffect) || (!effect.isPersistent && !effect.loop)) return null;

          const attachedToken = resolveAttachedToken(effect, tokens, gridSize);
          const attachedTokenSize = attachedToken ? (attachedToken.size || 1) : 1;
          const attachedTokenRadius = (attachedTokenSize * gridSize) / 2;

          const posX = attachedToken ? (attachedToken.x ?? 0) + attachedTokenRadius : effect.x;
          const posY = attachedToken ? (attachedToken.y ?? 0) + attachedTokenRadius : effect.y;

          const radiusPx = attachedToken
            ? attachedTokenRadius + 12
            : (effect.sizeFt / 5) * gridSize;

          // Vertically stack dispel badges when multiple auras/spells are attached to the same token or position
          const matchingEffects = effects.filter(e => {
            if (!e.isPersistent && !e.loop) return false;
            const otherAttached = resolveAttachedToken(e, tokens, gridSize);
            if (attachedToken && otherAttached) {
              return otherAttached.id === attachedToken.id;
            }
            return !attachedToken && !otherAttached && Math.hypot((e.x ?? 0) - (effect.x ?? 0), (e.y ?? 0) - (effect.y ?? 0)) < 15;
          });
          const stackIdx = matchingEffects.findIndex(e => e.id === effect.id);
          const stackOffset = stackIdx > 0 ? stackIdx * 28 : 0;

          const topY = posY - radiusPx - 6 - stackOffset;

          return (
            <div
              key={`dispel-${effect.id}`}
              className="absolute pointer-events-auto group/dispel z-[40]"
              style={{
                left: `${posX}px`,
                top: `${topY}px`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-950/90 hover:bg-zinc-900 border border-purple-500/50 hover:border-purple-400 shadow-lg backdrop-blur-md transition-all select-none">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onInspectEffect?.(effect);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onInspectEffect?.(effect);
                  }}
                  className="flex items-center gap-1.5 px-1 py-0.5 rounded-full text-purple-200 hover:text-amber-300 transition-colors cursor-pointer group/title"
                  title={`Click to open ${effect.name} description & roll dice`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 group-hover/title:bg-amber-400 animate-pulse shrink-0" />
                  <span className="text-[10px] font-mono font-bold truncate max-w-[140px] group-hover/title:underline underline-offset-2">
                    {effect.name}
                  </span>
                  {effect.castAtLevel && effect.castAtLevel > (effect.baseLevel ?? 0) && (
                    <span className="px-1 py-0.1 rounded bg-fuchsia-950/90 border border-fuchsia-400/60 text-[8px] font-mono font-bold text-fuchsia-200 shrink-0">
                      Lvl {effect.castAtLevel}
                    </span>
                  )}
                </button>
                {onDispelEffect && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDispelEffect(effect.id);
                    }}
                    className="p-0.5 rounded-full hover:bg-red-500/30 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer shrink-0"
                    title={`Dispel ${effect.name} (Keep other active animations)`}
                    aria-label={`Dispel ${effect.name}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* 2c. Direct On-Map Clickable Title Pins for Token-Equipped Auras (token.auraRadius / token.auras) */}
        {tokens?.map((token) => {
          if (!onInspectEffect && !onClearTokenAura) return null;

          const auras: any[] = [];
          if (Array.isArray(token.auras) && token.auras.length > 0) {
            auras.push(...token.auras);
          } else if (token.auraRadius && token.auraRadius > 0) {
            auras.push({
              radius: token.auraRadius,
              color: token.auraColor,
              opacity: token.auraOpacity,
              name: token.auraName || 'Magical Aura',
              videoUrl: token.videoUrl || (token as any).auraVideoUrl
            });
          }

          if (auras.length === 0) return null;

          const tokenSize = token.size || 1;
          const tokenRadius = (tokenSize * gridSize) / 2;
          const posX = (token.x ?? 0) + tokenRadius;
          const posY = (token.y ?? 0) + tokenRadius;
          const radiusPx = tokenRadius + 12;

          // Count how many persistent effects are already stacked above this token so we don't overlap
          const attachedEffectsOnToken = effects.filter(
            e => (e.isPersistent || e.loop) && resolveAttachedToken(e, tokens, gridSize)?.id === token.id
          );

          return auras.map((aura, idx) => {
            const auraName = aura.name || 'Magical Aura';
            // Skip if an attached effect with the same name is already displaying a pill for this token
            const alreadyShownByEffect = attachedEffectsOnToken.some(
              e => e.name.toLowerCase().includes(auraName.toLowerCase()) || auraName.toLowerCase().includes(e.name.toLowerCase())
            );
            if (alreadyShownByEffect) return null;

            const stackOffset = (attachedEffectsOnToken.length + idx) * 28;
            const topY = posY - radiusPx - 6 - stackOffset;
            const syntheticEffect: VttEffectInstance = {
              id: `token_aura_${token.id}_${idx}`,
              name: auraName,
              label: auraName,
              assetKey: auraName.toLowerCase().replace(/\s+/g, '_'),
              videoUrl: aura.videoUrl || '',
              paradigm: 'aura',
              x: posX,
              y: posY,
              attachedTokenId: token.id,
              sizeFt: aura.radius || 10,
              rotation: 0,
              opacity: aura.opacity ?? 0.4,
              blendMode: 'screen',
              isPersistent: true,
              loop: true,
              castTime: Date.now(),
              casterName: token.name
            };

            return (
              <div
                key={`token-aura-pill-${token.id}-${idx}`}
                className="absolute pointer-events-auto group/dispel z-[40]"
                style={{
                  left: `${posX}px`,
                  top: `${topY}px`,
                  transform: 'translate(-50%, -100%)',
                }}
              >
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-950/90 hover:bg-zinc-900 border border-indigo-500/50 hover:border-indigo-400 shadow-lg backdrop-blur-md transition-all select-none">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspectEffect?.(syntheticEffect);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onInspectEffect?.(syntheticEffect);
                    }}
                    className="flex items-center gap-1.5 px-1 py-0.5 rounded-full text-indigo-200 hover:text-amber-300 transition-colors cursor-pointer group/title"
                    title={`Click to open ${auraName} description & roll dice`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 group-hover/title:bg-amber-400 animate-pulse shrink-0" />
                    <span className="text-[10px] font-mono font-bold truncate max-w-[140px] group-hover/title:underline underline-offset-2">
                      {auraName}
                    </span>
                  </button>
                  {onClearTokenAura && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClearTokenAura(token.id, auraName);
                      }}
                      className="p-0.5 rounded-full hover:bg-red-500/30 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer shrink-0"
                      title={`Remove ${auraName}`}
                      aria-label={`Remove ${auraName}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          });
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

          // A. Point / Sphere / Aura preview
          if (activeEquippedAsset.paradigm === 'point' || activeEquippedAsset.shape === 'circle' || activeEquippedAsset.paradigm === 'aura') {
            const isAuraAsset = Boolean(
              activeEquippedAsset.paradigm === 'aura' ||
              activeEquippedAsset.shape === 'aura' ||
              activeEquippedAsset.targetType === 'aura' ||
              activeEquippedAsset.targetType === 'self' ||
              AURA_OR_TOKEN_BUFF_KEYWORDS.some(k => activeEquippedAsset.name.toLowerCase().includes(k))
            );
            const isSelfOrCasterAura = Boolean(
              activeEquippedAsset.targetType === 'aura' ||
              activeEquippedAsset.targetType === 'self' ||
              ['spirit_guardians', 'aura_of_vitality', 'aura_of_life', 'holy_aura', 'detect_magic', 'shield', 'armor_of_agathys'].includes(activeEquippedAsset.id)
            );

            // For auras, lock the preview to the caster token (or hovered token for targeted buffs) instead of floating on map squares
            let previewAnchor = isAuraAsset && aimOrigin ? aimOrigin : aimCurrent;
            let anchorTokenRadius = gridSize / 2;
            if (isAuraAsset && tokens && tokens.length > 0) {
              const refPoint = isSelfOrCasterAura && aimOrigin ? aimOrigin : aimCurrent;
              const matchedTok = tokens.find((t: any) => {
                const tRad = ((t.size || 1) * gridSize) / 2;
                const cx = (t.x ?? 0) + tRad;
                const cy = (t.y ?? 0) + tRad;
                return Math.hypot(refPoint.x - cx, refPoint.y - cy) <= tRad + 15;
              }) || (aimOrigin ? tokens.find((t: any) => {
                const tRad = ((t.size || 1) * gridSize) / 2;
                const cx = (t.x ?? 0) + tRad;
                const cy = (t.y ?? 0) + tRad;
                return Math.hypot(aimOrigin.x - cx, aimOrigin.y - cy) <= tRad + 15;
              }) : null);

              if (matchedTok) {
                anchorTokenRadius = ((matchedTok.size || 1) * gridSize) / 2;
                previewAnchor = {
                  x: (matchedTok.x ?? 0) + anchorTokenRadius,
                  y: (matchedTok.y ?? 0) + anchorTokenRadius
                };
              }
            }

            const previewDiameter = isAuraAsset
              ? (previewSize >= 10
                  ? (anchorTokenRadius + (previewSize / 5) * gridSize) * 2
                  : Math.max(anchorTokenRadius * 3, ((previewSize * 2) / 5) * gridSize))
              : ((previewSize * 2) / 5) * gridSize;
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
                  left: `${previewAnchor.x}px`,
                  top: `${previewAnchor.y}px`,
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
