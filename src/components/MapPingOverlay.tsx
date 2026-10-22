import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Layer, Group, Circle, Line, Ring, Text, Rect } from 'react-konva';
import Konva from 'konva';

export interface MapPingItem {
  id: string;
  x: number;
  y: number;
  senderName: string;
  senderRole: 'dm' | 'player';
  color: string;
  pullCamera?: boolean;
  createdAt: number;
}

export interface PingChargeState {
  x: number;
  y: number;
  startTime: number;
  color: string;
}

/**
 * Plays a clean synthesized crystalline radar/sonar ping using Web Audio API
 */
export function playMapPingSound(role: 'dm' | 'player' = 'player', pullCamera = false) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Primary ping tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    const baseFreq = pullCamera ? 880 : role === 'dm' ? 740 : 660;
    osc1.frequency.setValueAtTime(baseFreq, now);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.25, now + 0.08);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.98, now + 0.55);

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.linearRampToValueAtTime(0.18, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.0008, now + 0.65);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.66);

    // Secondary harmonic echo
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(baseFreq * 1.5, now + 0.09);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq * 2.0, now + 0.45);

    gain2.gain.setValueAtTime(0.001, now + 0.09);
    gain2.gain.linearRampToValueAtTime(0.09, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0008, now + 0.55);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.09);
    osc2.stop(now + 0.56);

    setTimeout(() => {
      try {
        ctx.close();
      } catch {}
    }, 800);
  } catch {
    // Ignore audio context autoplay restrictions
  }
}

const SingleMapPingNode: React.FC<{
  ping: MapPingItem;
  stageScale: number;
  gridSize: number;
}> = ({ ping, stageScale, gridSize }) => {
  const groupRef = useRef<any>(null);
  const ring1Ref = useRef<any>(null);
  const ring2Ref = useRef<any>(null);
  const ring3Ref = useRef<any>(null);
  const crosshairRef = useRef<any>(null);
  const coreRef = useRef<any>(null);
  const arrowRef = useRef<any>(null);

  const invScale = 1 / Math.max(0.25, Math.min(2.5, stageScale));
  const maxRadius = Math.max(gridSize * 1.45, 72 * invScale);

  useEffect(() => {
    const groupNode = groupRef.current;
    const layer = groupNode?.getLayer();
    if (!groupNode || !layer) return;

    const durationMs = 3400;
    const startPerf = performance.now();

    const anim = new Konva.Animation(() => {
      const elapsed = performance.now() - startPerf;
      const overallProgress = Math.min(1, elapsed / durationMs);

      // Fade out in final 25% of lifetime
      const masterFade = overallProgress > 0.75 ? Math.max(0, 1 - (overallProgress - 0.75) / 0.25) : 1;
      groupNode.opacity(masterFade);

      // 3 staggered radar ripple rings
      const updateRipple = (node: any, offsetMs: number) => {
        if (!node) return;
        const cycleMs = 1150;
        const localElapsed = (elapsed + offsetMs) % cycleMs;
        const p = localElapsed / cycleMs;
        const easeOut = 1 - Math.pow(1 - p, 2.4);
        node.radius(8 * invScale + easeOut * maxRadius);
        node.opacity(Math.max(0, (1 - p) * 0.85));
        node.strokeWidth(Math.max(1.2, (3.2 * (1 - p * 0.6)) * invScale));
      };

      updateRipple(ring1Ref.current, 0);
      updateRipple(ring2Ref.current, 380);
      updateRipple(ring3Ref.current, 760);

      // Rotating tactical reticle
      if (crosshairRef.current) {
        crosshairRef.current.rotation((elapsed * 0.065) % 360);
        const pulse = 1 + Math.sin(elapsed * 0.008) * 0.08;
        crosshairRef.current.scaleX(pulse);
        crosshairRef.current.scaleY(pulse);
      }

      // Pulsing core beacon
      if (coreRef.current) {
        const corePulse = 1 + Math.sin(elapsed * 0.014) * 0.22;
        coreRef.current.scaleX(corePulse);
        coreRef.current.scaleY(corePulse);
      }

      // Bouncing pointer chevron above ping
      if (arrowRef.current) {
        const bounce = Math.sin(elapsed * 0.01) * (6 * invScale);
        arrowRef.current.y(-26 * invScale + bounce);
      }
    }, layer);

    anim.start();
    return () => {
      anim.stop();
    };
  }, [invScale, maxRadius]);

  const reticleRadius = Math.max(22 * invScale, gridSize * 0.42);
  const labelText = ping.senderRole === 'dm' ? `👑 ${ping.senderName}` : `🎯 ${ping.senderName}`;
  const labelWidth = Math.max(84, labelText.length * 6.8 + 18) * invScale;
  const labelHeight = 20 * invScale;

  return (
    <Group ref={groupRef} x={ping.x} y={ping.y} listening={false}>
      {/* Soft ambient ground glow */}
      <Circle
        radius={reticleRadius * 1.4}
        fill={ping.color}
        opacity={0.14}
        listening={false}
      />

      {/* 3 Expanding Radar Shockwave Rings */}
      <Circle
        ref={ring1Ref}
        radius={10 * invScale}
        stroke={ping.color}
        strokeWidth={2.5 * invScale}
        listening={false}
      />
      <Circle
        ref={ring2Ref}
        radius={10 * invScale}
        stroke={ping.color}
        strokeWidth={2 * invScale}
        listening={false}
      />
      <Circle
        ref={ring3Ref}
        radius={10 * invScale}
        stroke="#ffffff"
        strokeWidth={1.5 * invScale}
        listening={false}
      />

      {/* Rotating Crosshair Reticle */}
      <Group ref={crosshairRef} listening={false}>
        <Circle
          radius={reticleRadius}
          stroke={ping.color}
          strokeWidth={2 * invScale}
          dash={[8 * invScale, 6 * invScale]}
        />
        <Line
          points={[-reticleRadius * 1.25, 0, -reticleRadius * 0.55, 0]}
          stroke={ping.color}
          strokeWidth={2.2 * invScale}
          lineCap="round"
        />
        <Line
          points={[reticleRadius * 0.55, 0, reticleRadius * 1.25, 0]}
          stroke={ping.color}
          strokeWidth={2.2 * invScale}
          lineCap="round"
        />
        <Line
          points={[0, -reticleRadius * 1.25, 0, -reticleRadius * 0.55]}
          stroke={ping.color}
          strokeWidth={2.2 * invScale}
          lineCap="round"
        />
        <Line
          points={[0, reticleRadius * 0.55, 0, reticleRadius * 1.25]}
          stroke={ping.color}
          strokeWidth={2.2 * invScale}
          lineCap="round"
        />
      </Group>

      {/* Center Beacon Dot */}
      <Group ref={coreRef} listening={false}>
        <Circle
          radius={6 * invScale}
          fill={ping.color}
          shadowColor={ping.color}
          shadowBlur={12}
          shadowOpacity={0.95}
        />
        <Circle
          radius={2.8 * invScale}
          fill="#ffffff"
        />
      </Group>

      {/* Bouncing Downward Pointer Arrow */}
      <Group ref={arrowRef} y={-26 * invScale} listening={false}>
        <Line
          points={[
            -8 * invScale, -12 * invScale,
            0, -2 * invScale,
            8 * invScale, -12 * invScale
          ]}
          stroke="#ffffff"
          strokeWidth={2.8 * invScale}
          lineCap="round"
          lineJoin="round"
          shadowColor={ping.color}
          shadowBlur={8}
        />
      </Group>

      {/* Sender Name Pill Tag */}
      <Group x={-labelWidth / 2} y={reticleRadius + 8 * invScale} listening={false}>
        <Rect
          width={labelWidth}
          height={labelHeight}
          fill="rgba(9, 9, 11, 0.9)"
          stroke={ping.color}
          strokeWidth={1.4 * invScale}
          cornerRadius={6 * invScale}
          shadowColor="#000000"
          shadowBlur={6}
          shadowOpacity={0.7}
        />
        <Text
          width={labelWidth}
          height={labelHeight}
          text={labelText}
          fontSize={10.5 * invScale}
          fontFamily="monospace"
          fontStyle="bold"
          fill="#ffffff"
          align="center"
          verticalAlign="middle"
        />
      </Group>
    </Group>
  );
};

const PingChargingNode: React.FC<{
  charge: PingChargeState;
  stageScale: number;
}> = ({ charge, stageScale }) => {
  const ringRef = useRef<any>(null);
  const invScale = 1 / Math.max(0.25, Math.min(2.5, stageScale));

  useEffect(() => {
    const node = ringRef.current;
    const layer = node?.getLayer();
    if (!node || !layer) return;

    const anim = new Konva.Animation(() => {
      const elapsed = Date.now() - charge.startTime;
      // Visible after 110ms of holding left-click, completes at 380ms
      if (elapsed < 110) {
        node.opacity(0);
        return;
      }
      const p = Math.min(1, (elapsed - 110) / 270);
      node.opacity(0.85);
      node.outerRadius((30 - p * 18) * invScale);
      node.innerRadius(Math.max(2 * invScale, (26 - p * 18) * invScale));
    }, layer);

    anim.start();
    return () => {
      anim.stop();
    };
  }, [charge.startTime, invScale]);

  return (
    <Group x={charge.x} y={charge.y} listening={false}>
      <Ring
        ref={ringRef}
        innerRadius={24 * invScale}
        outerRadius={28 * invScale}
        fill={charge.color}
        opacity={0}
        listening={false}
      />
    </Group>
  );
};

export const MapPingLayer: React.FC<{
  pings: MapPingItem[];
  chargeState?: PingChargeState | null;
  stageScale: number;
  gridSize: number;
}> = ({ pings, chargeState, stageScale, gridSize }) => {
  if (pings.length === 0 && !chargeState) return null;

  return (
    <Layer listening={false}>
      {chargeState && (
        <PingChargingNode charge={chargeState} stageScale={stageScale} />
      )}
      {pings.map((ping) => (
        <SingleMapPingNode
          key={ping.id}
          ping={ping}
          stageScale={stageScale}
          gridSize={gridSize}
        />
      ))}
    </Layer>
  );
};

export function useLeftClickHoldPing(options: {
  senderName: string;
  senderRole: 'dm' | 'player';
  color: string;
  socketRef: React.MutableRefObject<any>;
  onPullCamera?: (x: number, y: number) => void;
}) {
  const { senderName, senderRole, color, socketRef, onPullCamera } = options;
  const [pings, setPings] = useState<MapPingItem[]>([]);
  const [chargeState, setChargeState] = useState<PingChargeState | null>(null);

  const holdTimerRef = useRef<any>(null);
  const cleanupListenersRef = useRef<(() => void) | null>(null);
  const latestOptionsRef = useRef({ senderName, senderRole, color, onPullCamera });
  useEffect(() => {
    latestOptionsRef.current = { senderName, senderRole, color, onPullCamera };
  }, [senderName, senderRole, color, onPullCamera]);

  const spawnLocalOrRemotePing = useCallback((ping: MapPingItem, isRemote = false) => {
    setPings((prev) => [...prev.filter((p) => p.id !== ping.id).slice(-7), ping]);
    playMapPingSound(ping.senderRole, Boolean(ping.pullCamera));
    if (isRemote && ping.pullCamera && latestOptionsRef.current.onPullCamera) {
      latestOptionsRef.current.onPullCamera(ping.x, ping.y);
    }
    setTimeout(() => {
      setPings((prev) => prev.filter((p) => p.id !== ping.id));
    }, 3450);
  }, []);

  const cancelHoldPing = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (cleanupListenersRef.current) {
      cleanupListenersRef.current();
      cleanupListenersRef.current = null;
    }
    setChargeState(null);
  }, []);

  const startHoldPing = useCallback(
    (worldX: number, worldY: number, clientX: number, clientY: number, pullCamera = false) => {
      cancelHoldPing();

      const activeColor = pullCamera ? '#ef4444' : latestOptionsRef.current.color;
      setChargeState({
        x: worldX,
        y: worldY,
        startTime: Date.now(),
        color: activeColor,
      });

      const handleWinMove = (ev: MouseEvent) => {
        if (Math.hypot(ev.clientX - clientX, ev.clientY - clientY) > 8) {
          cancelHoldPing();
        }
      };

      const handleWinTouchMove = (ev: TouchEvent) => {
        if (ev.touches && ev.touches.length > 0) {
          const t = ev.touches[0];
          if (Math.hypot(t.clientX - clientX, t.clientY - clientY) > 10 || ev.touches.length > 1) {
            cancelHoldPing();
          }
        }
      };

      const handleWinCancel = () => {
        cancelHoldPing();
      };

      window.addEventListener('mousemove', handleWinMove, { passive: true });
      window.addEventListener('mouseup', handleWinCancel, { passive: true });
      window.addEventListener('touchmove', handleWinTouchMove, { passive: true });
      window.addEventListener('touchend', handleWinCancel, { passive: true });
      window.addEventListener('touchcancel', handleWinCancel, { passive: true });
      window.addEventListener('wheel', handleWinCancel, { passive: true });
      window.addEventListener('contextmenu', handleWinCancel, { passive: true });
      window.addEventListener('dragstart', handleWinCancel, { passive: true });

      cleanupListenersRef.current = () => {
        window.removeEventListener('mousemove', handleWinMove);
        window.removeEventListener('mouseup', handleWinCancel);
        window.removeEventListener('touchmove', handleWinTouchMove);
        window.removeEventListener('touchend', handleWinCancel);
        window.removeEventListener('touchcancel', handleWinCancel);
        window.removeEventListener('wheel', handleWinCancel);
        window.removeEventListener('contextmenu', handleWinCancel);
        window.removeEventListener('dragstart', handleWinCancel);
      };

      holdTimerRef.current = setTimeout(() => {
        holdTimerRef.current = null;
        if (cleanupListenersRef.current) {
          cleanupListenersRef.current();
          cleanupListenersRef.current = null;
        }
        setChargeState(null);

        const newPing: MapPingItem = {
          id: `ping_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          x: Math.round(worldX),
          y: Math.round(worldY),
          senderName: latestOptionsRef.current.senderName || (latestOptionsRef.current.senderRole === 'dm' ? 'Dungeon Master' : 'Player'),
          senderRole: latestOptionsRef.current.senderRole,
          color: activeColor,
          pullCamera,
          createdAt: Date.now(),
        };

        spawnLocalOrRemotePing(newPing, false);
        if (socketRef.current?.connected) {
          socketRef.current.emit('MAP_PING', newPing);
        }
      }, 380);
    },
    [cancelHoldPing, socketRef, spawnLocalOrRemotePing]
  );

  useEffect(() => {
    return () => {
      cancelHoldPing();
    };
  }, [cancelHoldPing]);

  return {
    pings,
    chargeState,
    startHoldPing,
    cancelHoldPing,
    receiveRemotePing: useCallback((ping: MapPingItem) => spawnLocalOrRemotePing(ping, true), [spawnLocalOrRemotePing]),
  };
}

