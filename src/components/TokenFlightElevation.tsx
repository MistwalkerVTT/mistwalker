import React, { useEffect, useRef } from 'react';
import Konva from 'konva';
import { Group, Circle, Ellipse, Line, Rect, Text, Path } from 'react-konva';

export interface TokenFlightElevationEffectsProps {
  tokenId: string;
  elevation: number; // in feet (e.g., 0, 10, 30, 60, -15)
  isFlying: boolean;
  radius: number; // half of tokenWidth in pixels
  tokenWidth: number;
  isMonster?: boolean;
  isAlly?: boolean;
  stageScale?: number;
}

export interface FlightLiftMetrics {
  isElevated: boolean;
  isSubmergedOrPit: boolean;
  liftOffsetPx: number;
  perspectiveScale: number;
  tierColor: string;
  tierGlow: string;
  tierBg: string;
  badgeText: string;
}

export function computeFlightLiftMetrics(
  elevation: number = 0,
  isFlying: boolean = false,
  radius: number = 32
): FlightLiftMetrics {
  const elev = Number(elevation) || 0;
  const effectiveFlying = Boolean(isFlying || elev > 0);
  const isElevated = elev !== 0 || Boolean(isFlying);
  const isSubmergedOrPit = elev < 0;

  if (!isElevated) {
    return {
      isElevated: false,
      isSubmergedOrPit: false,
      liftOffsetPx: 0,
      perspectiveScale: 1,
      tierColor: '#38bdf8',
      tierGlow: '#7dd3fc',
      tierBg: 'rgba(15, 23, 42, 0.92)',
      badgeText: ''
    };
  }

  // Calculate visual vertical lift (upward negative Y in canvas space)
  const absFt = Math.abs(elev);
  const rawLift = isSubmergedOrPit
    ? -Math.min(18, Math.max(4, (absFt / 5) * 2.5))
    : Math.min(48, Math.max(isFlying ? 14 : 6, (absFt / 5) * 4.5 + (isFlying ? 8 : 0)));

  // Perspective camera scale: higher altitude tokens appear slightly closer to the top-down camera
  const perspectiveScale = isSubmergedOrPit
    ? Math.max(0.88, 1 - (absFt / 100) * 0.10)
    : Math.min(1.22, 1 + (absFt / 60) * 0.14 + (isFlying ? 0.03 : 0));

  // Color tiers by height
  let tierColor = '#38bdf8'; // Sky cyan (mid flight 20-45ft)
  let tierGlow = '#7dd3fc';
  let tierBg = 'rgba(12, 74, 110, 0.92)';

  if (isSubmergedOrPit) {
    tierColor = '#f97316'; // Abyssal / Pit amber-orange
    tierGlow = '#fdba74';
    tierBg = 'rgba(67, 20, 7, 0.92)';
  } else if (absFt >= 50) {
    tierColor = '#a855f7'; // High altitude Stratosphere Violet-Gold
    tierGlow = '#e9d5ff';
    tierBg = 'rgba(59, 7, 100, 0.94)';
  } else if (absFt <= 15 && !isFlying) {
    tierColor = '#10b981'; // Low ledge / platform Emerald
    tierGlow = '#6ee7b7';
    tierBg = 'rgba(6, 78, 59, 0.92)';
  } else if (effectiveFlying) {
    tierColor = '#38bdf8';
    tierGlow = '#bae6fd';
    tierBg = 'rgba(12, 74, 110, 0.94)';
  }

  const sign = elev > 0 ? `+${elev}ft` : elev < 0 ? `${elev}ft` : 'FLY';
  const badgeText = isFlying ? `🪽 ${sign}` : elev > 0 ? `⬆️ ${sign}` : `⬇️ ${sign}`;

  return {
    isElevated: true,
    isSubmergedOrPit,
    liftOffsetPx: rawLift,
    perspectiveScale,
    tierColor,
    tierGlow,
    tierBg,
    badgeText
  };
}

/**
 * Renders the Ground Footprint Shadow, Vertical Tether Line, and Touchdown/Takeoff Shockwave
 * on the true 1" grid square beneath an elevated or flying token.
 */
export const TokenGroundFootprint: React.FC<{
  elevation: number;
  isFlying: boolean;
  radius: number;
  tierColor: string;
  liftOffsetPx: number;
  shadowRef?: React.RefObject<Konva.Ellipse | null>;
  shockwaveRef?: React.RefObject<Konva.Circle | null>;
}> = ({ elevation, isFlying, radius, tierColor, liftOffsetPx, shadowRef, shockwaveRef }) => {
  const isElevated = elevation !== 0 || isFlying;
  if (!isElevated) return null;

  const absFt = Math.abs(elevation || 0);
  const shadowScale = Math.max(0.55, 1 - (absFt / 120) * 0.4);

  return (
    <Group listening={false}>
      {/* Ground Grid Anchor Ring (shows exact 5ft square occupancy on the floor) */}
      <Circle
        x={radius}
        y={radius}
        radius={radius * 0.88}
        stroke={tierColor}
        strokeWidth={1.5}
        dash={[5, 4]}
        opacity={0.55}
        perfectDrawEnabled={false}
      />

      {/* Breathing Elliptical Ground Shadow */}
      <Ellipse
        ref={shadowRef as any}
        x={radius}
        y={radius + radius * 0.18}
        radiusX={radius * 0.82 * shadowScale}
        radiusY={radius * 0.46 * shadowScale}
        fill="rgba(0, 0, 0, 0.58)"
        shadowColor="#000000"
        shadowBlur={10}
        shadowOpacity={0.8}
        perfectDrawEnabled={false}
      />

      {/* Expanding Wind Gust / Touchdown Burst Shockwave Ring */}
      <Circle
        ref={shockwaveRef as any}
        x={radius}
        y={radius}
        radius={radius * 0.5}
        stroke={tierColor}
        strokeWidth={3}
        opacity={0}
        perfectDrawEnabled={false}
      />

      {/* Dashed 3D Vertical Altitude Tether Line from Ground Center to Lifted Token */}
      {Math.abs(liftOffsetPx) > 4 && (
        <>
          <Line
            points={[radius, radius, radius, radius - liftOffsetPx]}
            stroke={tierColor}
            strokeWidth={2}
            dash={[4, 4]}
            opacity={0.75}
            perfectDrawEnabled={false}
          />
          {/* Ground Anchor Pin Dot */}
          <Circle
            x={radius}
            y={radius}
            radius={3.5}
            fill={tierColor}
            stroke="#0f172a"
            strokeWidth={1}
            perfectDrawEnabled={false}
          />
        </>
      )}
    </Group>
  );
};

/**
 * Renders the Animated Flapping Spectral Wings, Swirling Wind Vortex Rings,
 * High-Altitude Cloud Wisps, and Top-Right Altitude Pill Badge on the lifted token body.
 */
export const TokenAerialOverlay: React.FC<{
  elevation: number;
  isFlying: boolean;
  radius: number;
  tokenWidth: number;
  isMonster?: boolean;
  tierColor: string;
  tierGlow: string;
  tierBg: string;
  badgeText: string;
  leftWingRef?: React.RefObject<Konva.Group | null>;
  rightWingRef?: React.RefObject<Konva.Group | null>;
  vortexRingRef?: React.RefObject<Konva.Circle | null>;
  cloudGroupRef?: React.RefObject<Konva.Group | null>;
}> = ({
  elevation,
  isFlying,
  radius,
  tokenWidth,
  isMonster,
  tierColor,
  tierGlow,
  tierBg,
  badgeText,
  leftWingRef,
  rightWingRef,
  vortexRingRef,
  cloudGroupRef
}) => {
  const isElevated = elevation !== 0 || isFlying;
  if (!isElevated) return null;

  const wingColor = isMonster ? '#f43f5e' : tierColor;
  const wingGlow = isMonster ? '#fda4af' : tierGlow;
  const wingSpan = Math.max(22, radius * 0.72);

  // Badge dimensions on Top-Right of token
  const badgeW = Math.max(54, Math.min(82, Math.round(tokenWidth * 0.68)));
  const badgeH = 19;
  const badgeX = tokenWidth - badgeW + 10;
  const badgeY = -6;

  return (
    <Group listening={false}>
      {/* Swirling Updraft Wind Vortex Ring around token perimeter */}
      {isFlying && (
        <Circle
          ref={vortexRingRef as any}
          x={radius}
          y={radius}
          radius={radius + 6}
          stroke={tierGlow}
          strokeWidth={2}
          dash={[12, 8, 4, 8]}
          opacity={0.8}
          shadowColor={tierColor}
          shadowBlur={8}
          perfectDrawEnabled={false}
        />
      )}

      {/* Articulated Spectral Flapping Wings (Left & Right) when Flying */}
      {isFlying && (
        <>
          {/* Left Spectral Wing */}
          <Group
            ref={leftWingRef as any}
            x={4}
            y={radius}
          >
            <Path
              data={`M 0 0 Q ${-wingSpan * 0.7} ${-wingSpan * 0.85} ${-wingSpan * 1.15} ${-wingSpan * 0.35} Q ${-wingSpan * 0.8} ${-wingSpan * 0.1} ${-wingSpan * 0.95} ${wingSpan * 0.2} Q ${-wingSpan * 0.55} ${wingSpan * 0.15} ${-wingSpan * 0.65} ${wingSpan * 0.48} Q ${-wingSpan * 0.3} ${wingSpan * 0.35} 0 ${wingSpan * 0.25} Z`}
              fill={wingColor}
              stroke={wingGlow}
              strokeWidth={1.5}
              opacity={0.85}
              shadowColor={wingColor}
              shadowBlur={8}
              perfectDrawEnabled={false}
            />
          </Group>

          {/* Right Spectral Wing */}
          <Group
            ref={rightWingRef as any}
            x={tokenWidth - 4}
            y={radius}
          >
            <Path
              data={`M 0 0 Q ${wingSpan * 0.7} ${-wingSpan * 0.85} ${wingSpan * 1.15} ${-wingSpan * 0.35} Q ${wingSpan * 0.8} ${-wingSpan * 0.1} ${wingSpan * 0.95} ${wingSpan * 0.2} Q ${wingSpan * 0.55} ${wingSpan * 0.15} ${wingSpan * 0.65} ${wingSpan * 0.48} Q ${wingSpan * 0.3} ${wingSpan * 0.35} 0 ${wingSpan * 0.25} Z`}
              fill={wingColor}
              stroke={wingGlow}
              strokeWidth={1.5}
              opacity={0.85}
              shadowColor={wingColor}
              shadowBlur={8}
              perfectDrawEnabled={false}
            />
          </Group>
        </>
      )}

      {/* Drifting High-Altitude Cloud Wisps (for >= 30ft elevation) */}
      {elevation >= 30 && (
        <Group ref={cloudGroupRef as any} x={radius} y={radius + radius * 0.65}>
          <Ellipse
            x={-radius * 0.35}
            y={0}
            radiusX={radius * 0.5}
            radiusY={radius * 0.18}
            fill="rgba(255, 255, 255, 0.38)"
            perfectDrawEnabled={false}
          />
          <Ellipse
            x={radius * 0.3}
            y={4}
            radiusX={radius * 0.42}
            radiusY={radius * 0.15}
            fill="rgba(224, 242, 254, 0.42)"
            perfectDrawEnabled={false}
          />
        </Group>
      )}

      {/* High-Contrast Top-Right Altitude Pill Badge */}
      <Group x={badgeX} y={badgeY}>
        <Rect
          width={badgeW}
          height={badgeH}
          fill={tierBg}
          stroke={tierGlow}
          strokeWidth={1.5}
          cornerRadius={9}
          shadowColor="#000000"
          shadowBlur={5}
          shadowOpacity={0.85}
          perfectDrawEnabled={false}
        />
        <Text
          width={badgeW}
          height={badgeH}
          y={3.5}
          align="center"
          text={badgeText}
          fontSize={10.5}
          fontStyle="bold"
          fontFamily="monospace"
          fill="#ffffff"
          perfectDrawEnabled={false}
        />
      </Group>
    </Group>
  );
};

/**
 * Custom hook that drives the 60fps Konva.Animation for hovering, wing-flapping,
 * rotating updraft vortex rings, breathing ground shadows, and elevation burst shockwaves.
 */
export function useTokenFlightAnimation({
  elevation = 0,
  isFlying = false,
  liftOffsetPx = 0,
  perspectiveScale = 1,
  radius = 32,
  floatingGroupRef,
  shadowRef,
  leftWingRef,
  rightWingRef,
  vortexRingRef,
  cloudGroupRef,
  shockwaveRef
}: {
  elevation?: number;
  isFlying?: boolean;
  liftOffsetPx: number;
  perspectiveScale: number;
  radius: number;
  floatingGroupRef: React.RefObject<Konva.Group | null>;
  shadowRef: React.RefObject<Konva.Ellipse | null>;
  leftWingRef: React.RefObject<Konva.Group | null>;
  rightWingRef: React.RefObject<Konva.Group | null>;
  vortexRingRef: React.RefObject<Konva.Circle | null>;
  cloudGroupRef: React.RefObject<Konva.Group | null>;
  shockwaveRef: React.RefObject<Konva.Circle | null>;
}) {
  const prevElevationRef = useRef<{ elevation: number; isFlying: boolean }>({
    elevation: elevation || 0,
    isFlying: Boolean(isFlying)
  });

  // Trigger burst shockwave on takeoff, landing, or height change
  useEffect(() => {
    const prev = prevElevationRef.current;
    const changed = prev.elevation !== (elevation || 0) || prev.isFlying !== Boolean(isFlying);
    prevElevationRef.current = { elevation: elevation || 0, isFlying: Boolean(isFlying) };

    if (changed && shockwaveRef.current) {
      const node = shockwaveRef.current;
      node.radius(radius * 0.35);
      node.opacity(0.95);
      const tween = new Konva.Tween({
        node,
        duration: 0.55,
        radius: radius * 1.65,
        opacity: 0,
        easing: Konva.Easings.EaseOut
      });
      tween.play();
      return () => {
        tween.destroy();
      };
    }
  }, [elevation, isFlying, radius, shockwaveRef]);

  // Continuous 60fps hover bob, wing flap, and vortex spin when flying or elevated
  useEffect(() => {
    const groupNode = floatingGroupRef.current;
    if (!groupNode) return;

    const isElevated = (elevation || 0) !== 0 || Boolean(isFlying);
    if (!isElevated) {
      groupNode.y(0);
      groupNode.scale({ x: 1, y: 1 });
      groupNode.offsetX(0);
      groupNode.offsetY(0);
      groupNode.x(0);
      groupNode.getLayer()?.batchDraw();
      return;
    }

    const layer = groupNode.getLayer();
    if (!layer) return;

    const absFt = Math.abs(elevation || 0);
    const baseShadowScale = Math.max(0.55, 1 - (absFt / 120) * 0.4);

    // If stationary elevated (e.g. standing on a ledge without flying), apply static lift & scale
    if (!isFlying) {
      const scaleOffset = radius * (perspectiveScale - 1);
      groupNode.x(-scaleOffset);
      groupNode.y(-liftOffsetPx - scaleOffset);
      groupNode.scale({ x: perspectiveScale, y: perspectiveScale });
      layer.batchDraw();
      return;
    }

    const anim = new Konva.Animation((frame) => {
      if (!frame) return;
      const t = frame.time / 1000;

      // Smooth 2.2Hz sine-wave hover bob (+/- 4.5px)
      const bobPx = Math.sin(t * 3.2) * 4.5;
      const scaleOffset = radius * (perspectiveScale - 1);

      groupNode.x(-scaleOffset);
      groupNode.y(-liftOffsetPx + bobPx - scaleOffset);
      groupNode.scale({ x: perspectiveScale, y: perspectiveScale });

      // Inverse breathing shadow on the ground
      if (shadowRef.current) {
        const breathe = 1 + (bobPx / 28);
        shadowRef.current.radiusX(radius * 0.82 * baseShadowScale * breathe);
        shadowRef.current.radiusY(radius * 0.46 * baseShadowScale * breathe);
        shadowRef.current.opacity(Math.max(0.28, Math.min(0.68, 0.52 + (bobPx / 30))));
      }

      // Wing flapping articulation
      const flapAngle = Math.sin(t * 6.4) * 16;
      const flapScaleX = 0.88 + Math.cos(t * 6.4) * 0.14;
      if (leftWingRef.current) {
        leftWingRef.current.rotation(flapAngle);
        leftWingRef.current.scaleX(flapScaleX);
      }
      if (rightWingRef.current) {
        rightWingRef.current.rotation(-flapAngle);
        rightWingRef.current.scaleX(flapScaleX);
      }

      // Rotating updraft wind vortex ring
      if (vortexRingRef.current) {
        vortexRingRef.current.rotation((t * 48) % 360);
      }

      // Gentle cloud drift at high altitude
      if (cloudGroupRef.current) {
        cloudGroupRef.current.x(radius + Math.sin(t * 1.6) * 6);
      }
    }, layer);

    anim.start();
    return () => {
      anim.stop();
    };
  }, [elevation, isFlying, liftOffsetPx, perspectiveScale, radius, floatingGroupRef, shadowRef, leftWingRef, rightWingRef, vortexRingRef, cloudGroupRef]);
}
