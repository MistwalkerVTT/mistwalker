import React, { useState, useMemo, useRef } from 'react';
import useImage from 'use-image';
import { Group, Circle, Rect, Text, Image as KonvaImage } from 'react-konva';
import { GifImage } from './GifImage';
import { TokenBubblesKonvaOverlay } from '../../effects';
import { getAuraVideoUrl } from '../../effects/db/tokenFxMap';
import { DEFAULT_MONSTERS } from '../../data/defaultMonsters';
import { getCharacterTokenDisplayName, resolveTokenCharacterStats } from '../../data/defaultCharacters';
import { isMonsterToken } from '../../types';
import {
  computeFlightLiftMetrics,
  TokenGroundFootprint,
  TokenAerialOverlay,
  useTokenFlightAnimation
} from '../TokenFlightElevation';

export interface TokenImageProps {
  token: any;
  gridSize: number;
  isPlayerView?: boolean;
  isSelected?: boolean;
  tool?: string;
  isSpacePressed?: boolean;
  combatants?: any[];
  characters?: any[];
  stageScale?: number;
  onClick?: (e: any) => void;
  onDblClick?: (e: any) => void;
  onDragStart?: (e: any) => void;
  onDragMove?: (e: any) => void;
  onDragEnd?: (e: any) => void;
  onDelete?: (tokenId: string) => void;
  onContextMenu?: (e: any) => void;
  onMouseEnter?: (e: any) => void;
  onMouseLeave?: (e: any) => void;
  onTargetToken?: (token: any) => void;
  isAimingAction?: boolean;
}

export const TokenImage = React.memo(({
  token,
  gridSize,
  isPlayerView = false,
  isSelected,
  tool,
  isSpacePressed,
  combatants,
  characters,
  stageScale = 1,
  onClick,
  onDblClick,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDelete,
  onContextMenu,
  onMouseEnter,
  onMouseLeave,
  onTargetToken,
  isAimingAction
}: TokenImageProps) => {
  const rawTokenUrl = token.url || token.avatarUrl || token.imageUrl || token.customMonsterData?.avatarUrl || '';
  // Route external remote images through /api/token-proxy if CORS or canvas taints prevent direct loading
  const effectiveTokenUrl = rawTokenUrl && rawTokenUrl.startsWith('http') && !rawTokenUrl.includes('/api/token-proxy')
    ? `/api/token-proxy?url=${encodeURIComponent(rawTokenUrl)}`
    : rawTokenUrl;
  const isGif = Boolean(rawTokenUrl && rawTokenUrl.toLowerCase().endsWith('.gif'));
  const [image] = useImage(isGif ? null : (effectiveTokenUrl || null), 'anonymous');
  const [isHovered, setIsHovered] = useState(false);

  const matchedCombatant = useMemo(() => {
    if (!combatants || combatants.length === 0) return null;
    return combatants.find((c: any) =>
      c.id === token.id ||
      c.tokenId === token.id ||
      (c.name && token.name && c.name.toLowerCase().trim() === token.name.toLowerCase().trim())
    );
  }, [combatants, token.id, token.name]);

  const mergedConditions = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(token.conditions)) {
      token.conditions.forEach((c: string) => { if (c) set.add(c); });
    }
    if (Array.isArray(matchedCombatant?.conditions)) {
      matchedCombatant.conditions.forEach((c: string) => { if (c) set.add(c); });
    }
    return Array.from(set);
  }, [token.conditions, matchedCombatant]);

  const stats = useMemo(() => {
    const fromSheet = resolveTokenCharacterStats(token, characters);
    const defMonster = DEFAULT_MONSTERS.find(m => m.name.toLowerCase() === (token.name || '').toLowerCase());

    const isCharSheet = fromSheet.isFromCharacterSheet;
    const maxHp = isCharSheet && fromSheet.maxHp
      ? fromSheet.maxHp
      : (token.maxHp ?? matchedCombatant?.maxHp ?? defMonster?.hp ?? fromSheet.maxHp);
    const currentHp = isCharSheet && fromSheet.currentHp !== undefined
      ? fromSheet.currentHp
      : (token.currentHp ?? token.hp ?? (matchedCombatant?.currentHp ?? fromSheet.currentHp));
    const ac = isCharSheet && fromSheet.ac !== undefined
      ? fromSheet.ac
      : (token.ac ?? matchedCombatant?.ac ?? defMonster?.ac ?? fromSheet.ac);
    const tempHp = token.tempHp ?? fromSheet.tempHp ?? 0;
    const hpRatio = Math.max(0, Math.min(1, currentHp / Math.max(1, maxHp)));

    return {
      ac,
      currentHp,
      maxHp,
      tempHp,
      hpRatio,
      characterName: fromSheet.characterName
    };
  }, [token, characters, matchedCombatant]);

  const isAlly = token.category === 'ally' || !!(token as any).allyId;
  const isMonster = !isAlly && !token.isCondition && (isMonsterToken(token) || token.isMonster === true || token.category === 'monster' || token.isPlayer === false);
  const tokenWidth = gridSize * token.size;
  const radius = tokenWidth / 2;
  const hpColor = stats.hpRatio > 0.5 ? '#10b981' : stats.hpRatio > 0.25 ? '#f59e0b' : '#ef4444';

  // Responsive zoom-compensated sizing so HP text is bold and readable across the room at any zoom
  const effectiveScale = Math.max(0.25, Math.min(2.5, stageScale || 1));
  const minScreenFontSize = 13.5;
  const zoomCompensatedFont = minScreenFontSize / Math.min(1, effectiveScale);
  const baseFontSize = Math.max(13, Math.round(tokenWidth * 0.20));
  const hpFontSize = Math.max(13, Math.min(26, Math.max(baseFontSize, Math.round(zoomCompensatedFont))));

  const minPillWidth = Math.max(76, Math.round(hpFontSize * 5.4));
  const pillWidth = Math.max(minPillWidth, Math.min(Math.round(tokenWidth * 1.1), Math.max(minPillWidth, 200)));
  const pillHeight = Math.round(hpFontSize * 1.6 + 6);
  const pillX = (tokenWidth - pillWidth) / 2;
  const pillY = tokenWidth - Math.round(pillHeight * 0.35);

  const barHeight = Math.max(4, Math.round(pillHeight * 0.18));
  const barY = Math.round(pillHeight - barHeight - 4.5);
  const barPadding = 4;
  const barWidth = pillWidth - (barPadding * 2);

  const nameY = (token.isCondition || (isPlayerView && isMonster))
    ? tokenWidth + 4
    : pillY + pillHeight + 3;
  const nameFontSize = Math.max(12, Math.min(20, Math.round(hpFontSize * 0.85)));

  const activeAuras = useMemo(() => {
    const list: any[] = [];
    if (Array.isArray(token.auras) && token.auras.length > 0) {
      list.push(...token.auras);
    } else if (token.auraRadius && token.auraRadius > 0) {
      list.push({
        radius: token.auraRadius,
        color: token.auraColor || 'rgba(234, 179, 8, 0.4)',
        opacity: token.auraOpacity ?? 0.9,
        pulse: token.auraPulse,
        name: token.auraName || 'Magical Aura',
        videoUrl: token.videoUrl || (token as any).auraVideoUrl
      });
    }
    return list;
  }, [token.auras, token.auraRadius, token.auraColor, token.auraOpacity, token.auraPulse, token.auraName, token.videoUrl]);

  // Flight & Elevation 3D lift + 60fps animation refs
  const elevationFt = Number(token.elevation) || 0;
  const isFlying = Boolean(token.isFlying);
  const flightMetrics = useMemo(
    () => computeFlightLiftMetrics(elevationFt, isFlying, radius),
    [elevationFt, isFlying, radius]
  );

  const floatingGroupRef = useRef<any>(null);
  const shadowRef = useRef<any>(null);
  const leftWingRef = useRef<any>(null);
  const rightWingRef = useRef<any>(null);
  const vortexRingRef = useRef<any>(null);
  const cloudGroupRef = useRef<any>(null);
  const shockwaveRef = useRef<any>(null);
  const longPressTimerRef = useRef<any>(null);
  const longPressFiredRef = useRef<boolean>(false);
  const isTokenDraggingRef = useRef<boolean>(false);
  const lastTokenTapTimeRef = useRef<number>(0);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isAimingSpell = tool === 'spell_aim' || Boolean(isAimingAction);

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPosRef.current = null;
  };

  useTokenFlightAnimation({
    elevation: elevationFt,
    isFlying,
    liftOffsetPx: flightMetrics.liftOffsetPx,
    perspectiveScale: flightMetrics.perspectiveScale,
    radius,
    floatingGroupRef,
    shadowRef,
    leftWingRef,
    rightWingRef,
    vortexRingRef,
    cloudGroupRef,
    shockwaveRef
  });

  return (
    <Group
      id={token.id}
      x={token.x}
      y={token.y}
      name="token"
      draggable={!isSpacePressed && !isAimingSpell}
      dragDistance={8}
      onMouseDown={(e) => {
        if (isSpacePressed) return;
        if (isAimingSpell) {
          e.cancelBubble = true;
          if (e.evt?.button !== 2) {
            touchStartPosRef.current = {
              x: e.evt?.clientX ?? 0,
              y: e.evt?.clientY ?? 0
            };
          }
          return;
        }
        if (e.evt?.button !== 2) {
          e.cancelBubble = true;
        }
      }}
      onMouseUp={(e) => {
        if (isSpacePressed) return;
        if (e.evt?.button !== 2) {
          e.cancelBubble = true;
          if (isAimingSpell && onTargetToken) {
            const start = touchStartPosRef.current;
            const dist = start
              ? Math.hypot((e.evt?.clientX ?? start.x) - start.x, (e.evt?.clientY ?? start.y) - start.y)
              : 0;
            if (dist < 24) {
              const now = Date.now();
              if (now - lastTokenTapTimeRef.current > 200) {
                lastTokenTapTimeRef.current = now;
                onTargetToken(token);
              }
            }
            return;
          }
        }
      }}
      onTouchStart={(e) => {
        const touches = e.evt?.touches;
        if (touches && touches.length >= 2) {
          clearLongPress();
          return;
        }
        if (isAimingSpell) {
          clearLongPress();
          return;
        }
        if (!isSpacePressed) {
          e.cancelBubble = true;
        }
        longPressFiredRef.current = false;
        if (touches && touches.length === 1) {
          const tx = touches[0].clientX;
          const ty = touches[0].clientY;
          touchStartPosRef.current = { x: tx, y: ty };
          if (onContextMenu) {
            if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = setTimeout(() => {
              longPressTimerRef.current = null;
              longPressFiredRef.current = true;
              try {
                if (e.target && typeof e.target.stopDrag === 'function') {
                  e.target.stopDrag();
                }
              } catch {}
              onContextMenu({
                evt: {
                  preventDefault: () => {},
                  clientX: tx,
                  clientY: ty
                },
                cancelBubble: true
              });
            }, 480);
          }
        }
      }}
      onTouchMove={(e) => {
        if (isAimingSpell) return;
        const touches = e.evt?.touches;
        if (!touches || touches.length !== 1 || !touchStartPosRef.current) {
          clearLongPress();
          return;
        }
        const dx = touches[0].clientX - touchStartPosRef.current.x;
        const dy = touches[0].clientY - touchStartPosRef.current.y;
        if (Math.hypot(dx, dy) > 10) {
          clearLongPress();
        }
      }}
      onTouchEnd={(e) => {
        if (isAimingSpell) {
          clearLongPress();
          if (!isSpacePressed) e.cancelBubble = true;
          if (onTargetToken) {
            const now = Date.now();
            if (now - lastTokenTapTimeRef.current > 200) {
              lastTokenTapTimeRef.current = now;
              onTargetToken(token);
            }
          }
          return;
        }
        const startPos = touchStartPosRef.current;
        const wasLongPress = longPressFiredRef.current;
        clearLongPress();
        if (!isSpacePressed) {
          e.cancelBubble = true;
        }
        if (!wasLongPress && !isTokenDraggingRef.current && startPos && onClick) {
          const endTouch = e.evt?.changedTouches?.[0];
          const movedDist = endTouch ? Math.hypot(endTouch.clientX - startPos.x, endTouch.clientY - startPos.y) : 0;
          if (movedDist < 14) {
            const now = Date.now();
            if (now - lastTokenTapTimeRef.current > 250) {
              lastTokenTapTimeRef.current = now;
              onClick(e);
            }
          }
        }
      }}
      onClick={(e) => {
        if (isSpacePressed) return;
        e.cancelBubble = true;
        if (e.evt?.button && e.evt.button !== 0) return;
        if (isAimingSpell) {
          if (onTargetToken) {
            const now = Date.now();
            if (now - lastTokenTapTimeRef.current > 200) {
              lastTokenTapTimeRef.current = now;
              onTargetToken(token);
            }
          }
          return;
        }
        const now = Date.now();
        if (now - lastTokenTapTimeRef.current > 250) {
          lastTokenTapTimeRef.current = now;
          if (onClick) {
            onClick(e);
          }
        }
      }}
      onTap={(e) => {
        if (isSpacePressed) return;
        e.cancelBubble = true;
        if (isAimingSpell) {
          if (onTargetToken) {
            const now = Date.now();
            if (now - lastTokenTapTimeRef.current > 200) {
              lastTokenTapTimeRef.current = now;
              onTargetToken(token);
            }
          }
          return;
        }
        const now = Date.now();
        if (now - lastTokenTapTimeRef.current > 250) {
          lastTokenTapTimeRef.current = now;
          if (onClick) {
            onClick(e);
          }
        }
      }}
      onDblClick={(e) => {
        if (isSpacePressed) return;
        if (isAimingSpell) return;
        e.cancelBubble = true;
        if (onDblClick) {
          onDblClick(e);
        }
      }}
      onDblTap={(e) => {
        if (isSpacePressed) return;
        if (isAimingSpell) return;
        e.cancelBubble = true;
        if (onDblClick) {
          onDblClick(e);
        }
      }}
      onDragStart={(e) => {
        clearLongPress();
        isTokenDraggingRef.current = true;
        e.cancelBubble = true;
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = 'grabbing';
        if (onDragStart) {
          onDragStart(e);
        }
      }}
      onDragMove={(e) => {
        e.cancelBubble = true;
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = 'grabbing';
        if (onDragMove) {
          onDragMove(e);
        }
      }}
      onDragEnd={(e) => {
        isTokenDraggingRef.current = false;
        lastTokenTapTimeRef.current = Date.now();
        e.cancelBubble = true;
        const stage = e.target.getStage();
        if (stage) {
          stage.container().style.cursor = 'grab';
        }
        if (onDragEnd) {
          onDragEnd(e);
        }
      }}
      onMouseEnter={(e) => {
        setIsHovered(true);
        const stage = e.target.getStage();
        if (stage && !isTokenDraggingRef.current) stage.container().style.cursor = 'grab';
        if (onMouseEnter) {
          onMouseEnter(e);
        }
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        const stage = e.target.getStage();
        if (stage && !isTokenDraggingRef.current) {
          if (isSpacePressed) {
            stage.container().style.cursor = 'grab';
          } else {
            stage.container().style.cursor = tool === 'spell_aim' ? 'crosshair' : 'default';
          }
        }
        if (onMouseLeave) {
          onMouseLeave(e);
        }
      }}
      onContextMenu={(e) => {
        e.evt.preventDefault();
        e.cancelBubble = true;
        onContextMenu(e);
      }}
    >
      {/* Solid hit target across entire token circle so transparent avatar pixels or border clicks never fall through to Stage */}
      <Circle
        x={radius}
        y={radius}
        radius={Math.max(radius + 4, 24)}
        fill="rgba(0,0,0,0.001)"
        perfectDrawEnabled={false}
      />

      {/* 0. Token Magical Auras (Replaced by JB2A WebM animation in DomEffectOverlay when video is available) */}
      {activeAuras.map((aura: any, idx: number) => {
        const hasAnimatedVideo = Boolean(aura.videoUrl || getAuraVideoUrl(aura.name, aura.color));
        if (hasAnimatedVideo) return null;

        const auraFt = aura.radius || 10;
        const auraPixelRadius = radius + (auraFt / 5) * gridSize;
        const col = aura.color || 'rgba(234, 179, 8, 0.4)';
        const op = Math.min(0.2, (aura.opacity ?? 0.35) * 0.4);

        return (
          <Group key={`dm-token-aura-${idx}`} listening={false}>
            {/* Soft luminous aura body */}
            <Circle
              x={radius}
              y={radius}
              radius={auraPixelRadius}
              fill={col}
              opacity={op}
              perfectDrawEnabled={false}
            />
            {/* Outer perimeter dashed boundary ring */}
            <Circle
              x={radius}
              y={radius}
              radius={auraPixelRadius}
              stroke={col}
              strokeWidth={2}
              dash={[6, 4]}
              opacity={Math.min(1, op + 0.35)}
              perfectDrawEnabled={false}
            />
            {/* Inner radiant accent ring */}
            <Circle
              x={radius}
              y={radius}
              radius={Math.max(radius + 2, auraPixelRadius - 2)}
              stroke={col}
              strokeWidth={1}
              opacity={Math.min(1, op + 0.2)}
              perfectDrawEnabled={false}
            />
            {/* Distance label pill on aura perimeter */}
            {auraFt > 0 && (
              <Group x={radius} y={radius + auraPixelRadius - 7}>
                <Rect
                  x={-14}
                  y={-6}
                  width={28}
                  height={12}
                  fill="rgba(15, 23, 42, 0.85)"
                  cornerRadius={3}
                  stroke={col}
                  strokeWidth={0.8}
                  perfectDrawEnabled={false}
                />
                <Text
                  x={-14}
                  y={-5}
                  width={28}
                  align="center"
                  text={`${auraFt}ft`}
                  fontSize={8}
                  fontStyle="bold"
                  fontFamily="monospace"
                  fill="#ffffff"
                  perfectDrawEnabled={false}
                />
              </Group>
            )}
          </Group>
        );
      })}

      {/* 0.5 Ground Shadow, Grid Anchor Ring & 3D Tether Line when Flying / Elevated */}
      <TokenGroundFootprint
        elevation={elevationFt}
        isFlying={isFlying}
        radius={radius}
        tierColor={flightMetrics.tierColor}
        liftOffsetPx={flightMetrics.liftOffsetPx}
        shadowRef={shadowRef}
        shockwaveRef={shockwaveRef}
      />

      {/* Lifted & Animated Token Body Group */}
      <Group ref={floatingGroupRef}>
        {/* Selection Glow Indicator */}
        {isSelected && (
          <>
            <Circle
              x={radius}
              y={radius}
              radius={radius + 5}
              stroke="#f59e0b"
              strokeWidth={3}
              dash={[6, 3]}
              shadowColor="#f59e0b"
              shadowBlur={8}
              shadowOpacity={0.9}
              shadowForStrokeEnabled={false}
              perfectDrawEnabled={false}
              listening={false}
            />
            <Circle
              x={radius}
              y={radius}
              radius={radius + 8}
              stroke="#fbbf24"
              strokeWidth={1}
              opacity={0.6}
              perfectDrawEnabled={false}
              listening={false}
            />
          </>
        )}

        {/* 1. Circular Avatar Clip */}
        <Group
          clipFunc={(ctx) => {
            ctx.arc(radius, radius, radius, 0, Math.PI * 2, false);
          }}
        >
          {isGif ? (
            <GifImage
              src={effectiveTokenUrl}
              width={tokenWidth}
              height={tokenWidth}
            />
          ) : image && image.width > 0 && image.height > 0 ? (
            <KonvaImage
              image={image}
              width={tokenWidth}
              height={tokenWidth}
              perfectDrawEnabled={false}
            />
          ) : (
            <Rect
              width={tokenWidth}
              height={tokenWidth}
              fill={token.isPlayer ? '#1e3a8a' : (token.category === 'ally' || (token as any).allyId) ? '#713f12' : '#7f1d1d'}
              perfectDrawEnabled={false}
            />
          )}
        </Group>

        {/* 2. Outer Circular Border Ring */}
        <Circle
          x={radius}
          y={radius}
          radius={radius}
          stroke={
            isSelected
              ? "#f59e0b"
              : flightMetrics.isElevated
              ? flightMetrics.tierColor
              : token.isCondition
              ? "#ef4444"
              : (token.category === 'ally' || (token as any).allyId)
              ? "#eab308"
              : (isMonsterToken(token) || token.isMonster || token.category === 'monster' || token.isPlayer === false)
              ? "#f43f5e"
              : "#10b981"
          }
          strokeWidth={isSelected ? 3.5 : flightMetrics.isElevated ? 3.2 : (token.category === 'ally' || (token as any).allyId) ? 3 : 2.5}
          shadowColor={isSelected ? "#f59e0b" : flightMetrics.isElevated ? flightMetrics.tierColor : (token.category === 'ally' || (token as any).allyId) ? "#eab308" : undefined}
          shadowBlur={isSelected ? 8 : flightMetrics.isElevated ? 10 : (token.category === 'ally' || (token as any).allyId) ? 6 : 0}
          shadowForStrokeEnabled={false}
          perfectDrawEnabled={false}
          listening={false}
        />

        {/* 2.5 Animated Spectral Wings, Updraft Wind Vortex, Clouds & Altitude Badge */}
        <TokenAerialOverlay
          elevation={elevationFt}
          isFlying={isFlying}
          radius={radius}
          tokenWidth={tokenWidth}
          isMonster={isMonster}
          tierColor={flightMetrics.tierColor}
          tierGlow={flightMetrics.tierGlow}
          tierBg={flightMetrics.tierBg}
          badgeText={flightMetrics.badgeText}
          leftWingRef={leftWingRef}
          rightWingRef={rightWingRef}
          vortexRingRef={vortexRingRef}
          cloudGroupRef={cloudGroupRef}
        />

        {/* 2.8 Token Status & Lasting Debuff Bubbles (Hunter's Mark, Hex, AC-like indicator badges) */}
        <TokenBubblesKonvaOverlay bubbles={token.bubbles} tokenWidth={tokenWidth} />

        {/* 3. AC Shield Badge on Top-Left */}
        {!token.isCondition && (!isPlayerView || !isMonster) && (
          <Group x={12} y={12}>
            <Circle
              radius={11}
              fill="#0f172a"
              stroke="#38bdf8"
              strokeWidth={1.5}
              perfectDrawEnabled={false}
            />
            <Text
              x={-11}
              y={-9}
              width={22}
              align="center"
              text="AC"
              fontSize={6}
              fontStyle="bold"
              fill="#38bdf8"
              perfectDrawEnabled={false}
            />
            <Text
              x={-11}
              y={-2}
              width={22}
              align="center"
              text={`${stats.ac}`}
              fontSize={10}
              fontStyle="bold"
              fill="#ffffff"
              perfectDrawEnabled={false}
            />
          </Group>
        )}

        {/* 4. Large, High-Contrast HP Pill Badge directly tied to D&D Beyond & Character Sheet (Monsters NEVER show HP in player view) */}
        {!token.isCondition && (!isPlayerView || !isMonster) && (
          <Group x={pillX} y={pillY}>
            {/* Dark slate container badge */}
            <Rect
              width={pillWidth}
              height={pillHeight}
              fill="rgba(15, 23, 42, 0.96)"
              stroke={isAlly ? "#eab308" : (stats.hpRatio <= 0.25 ? "#ef4444" : "#475569")}
              strokeWidth={isAlly ? 1.5 : (stats.hpRatio <= 0.25 ? 1.5 : 1)}
              cornerRadius={Math.max(4, Math.round(pillHeight * 0.2))}
              shadowColor="#000000"
              shadowBlur={4}
              shadowOpacity={0.7}
              shadowOffsetY={2}
              perfectDrawEnabled={false}
            />
            {/* Background HP Track */}
            <Rect
              x={barPadding}
              y={barY}
              width={barWidth}
              height={barHeight}
              fill="rgba(30, 41, 59, 0.9)"
              cornerRadius={Math.round(barHeight / 2)}
              perfectDrawEnabled={false}
            />
            {/* Filled HP progress bar */}
            {stats.hpRatio > 0 && (
              <Rect
                x={barPadding}
                y={barY}
                width={Math.max(2, barWidth * stats.hpRatio)}
                height={barHeight}
                fill={hpColor}
                cornerRadius={Math.round(barHeight / 2)}
                perfectDrawEnabled={false}
              />
            )}
            {/* Crisp Monospace HP text */}
            <Text
              y={Math.max(2, Math.round((barY - hpFontSize) / 2))}
              width={pillWidth}
              align="center"
              text={`${stats.currentHp}/${stats.maxHp}${stats.tempHp && stats.tempHp > 0 ? ` (+${stats.tempHp})` : ''}`}
              fontSize={hpFontSize}
              fontStyle="bold"
              fontFamily="monospace"
              fill="#ffffff"
              shadowColor="#000000"
              shadowBlur={2}
              perfectDrawEnabled={false}
            />
          </Group>
        )}

        {/* 5. Token Name Label & Conditions (Cleanly spaced below the larger HP badge or token) */}
        <Group y={nameY} listening={false}>
          <Text
            text={getCharacterTokenDisplayName(token.name, !isMonster && !isAlly && !token.isCondition)}
            fontSize={nameFontSize}
            fontStyle={isSelected ? "bold" : "normal"}
            fill={isSelected ? "#fbbf24" : "white"}
            align="center"
            width={tokenWidth}
            shadowColor="#000000"
            shadowBlur={3}
            perfectDrawEnabled={false}
          />
          {mergedConditions.length > 0 && (
            <Text
              text={mergedConditions.join(', ')}
              fontSize={Math.max(9.5, nameFontSize - 2)}
              fontStyle="bold"
              fontFamily="monospace"
              fill="#f43f5e"
              align="center"
              width={tokenWidth}
              y={nameFontSize + 4}
              shadowColor="#000000"
              shadowBlur={3}
              perfectDrawEnabled={false}
            />
          )}
        </Group>
      </Group>
    </Group>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.token === nextProps.token &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.gridSize === nextProps.gridSize &&
    prevProps.tool === nextProps.tool &&
    prevProps.isSpacePressed === nextProps.isSpacePressed &&
    prevProps.combatants === nextProps.combatants &&
    prevProps.characters === nextProps.characters &&
    prevProps.stageScale === nextProps.stageScale &&
    prevProps.isAimingAction === nextProps.isAimingAction &&
    prevProps.onTargetToken === nextProps.onTargetToken
  );
});
