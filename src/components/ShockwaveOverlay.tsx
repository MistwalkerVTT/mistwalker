import React, { useState, useEffect, useCallback } from 'react';
import { Group, Circle, Ring } from 'react-konva';

export interface ShockwaveItem {
  id: string;
  x: number;
  y: number;
  maxRadius: number;
  color: string;
  startTime: number;
  duration: number; // in ms, typically 400 - 700ms
}

interface ShockwaveOverlayProps {
  shockwaves: ShockwaveItem[];
  onRemoveShockwave: (id: string) => void;
  stageScale?: number;
}

export const ShockwaveOverlay: React.FC<ShockwaveOverlayProps> = ({
  shockwaves,
  onRemoveShockwave,
  stageScale = 1
}) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (shockwaves.length === 0) return;

    let animId: number;
    const update = () => {
      const now = performance.now();
      let hasActive = false;

      shockwaves.forEach((sw) => {
        const elapsed = now - sw.startTime;
        if (elapsed >= sw.duration) {
          onRemoveShockwave(sw.id);
        } else {
          hasActive = true;
        }
      });

      if (hasActive) {
        setTick((t) => t + 1);
        animId = requestAnimationFrame(update);
      }
    };

    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [shockwaves, onRemoveShockwave]);

  if (shockwaves.length === 0) return null;

  const now = performance.now();

  return (
    <Group listening={false}>
      {shockwaves.map((sw) => {
        const elapsed = now - sw.startTime;
        const progress = Math.min(1, Math.max(0, elapsed / sw.duration));
        // Ease out quad for physical concussive expansion
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentRadius = sw.maxRadius * eased;
        const alpha = Math.max(0, 1 - Math.pow(progress, 1.5));
        const strokeW = Math.max(1, (1 - progress) * 8 / stageScale);

        return (
          <Group key={sw.id} x={sw.x} y={sw.y} opacity={alpha}>
            {/* Primary Concussive Blast Ring */}
            <Ring
              innerRadius={Math.max(0, currentRadius - strokeW * 2)}
              outerRadius={currentRadius}
              fill={sw.color || '#ffffff'}
              opacity={0.8}
            />
            {/* Secondary High-Voltage / White Flash Ring */}
            <Circle
              radius={currentRadius * 0.75}
              stroke="#ffffff"
              strokeWidth={Math.max(1, strokeW * 0.6)}
              opacity={alpha * 0.9}
            />
            {/* Epicenter Flash (rapid decay) */}
            {progress < 0.35 && (
              <Circle
                radius={sw.maxRadius * 0.35 * (1 - progress / 0.35)}
                fill="#ffffff"
                opacity={(1 - progress / 0.35) * 0.85}
              />
            )}
          </Group>
        );
      })}
    </Group>
  );
};

// Global shockwave manager hook / event bus
type ShockwaveListener = (shockwave: ShockwaveItem) => void;
const shockwaveListeners: Set<ShockwaveListener> = new Set();

export function triggerShockwave(params: {
  x: number;
  y: number;
  maxRadius: number;
  color?: string;
  duration?: number;
}) {
  const item: ShockwaveItem = {
    id: `sw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    x: params.x,
    y: params.y,
    maxRadius: Math.max(20, params.maxRadius),
    color: params.color || 'rgba(255, 255, 255, 0.9)',
    startTime: performance.now(),
    duration: params.duration || 550
  };

  shockwaveListeners.forEach((fn) => fn(item));
}

export function useShockwaves() {
  const [shockwaves, setShockwaves] = useState<ShockwaveItem[]>([]);

  const handleRemoveShockwave = useCallback((id: string) => {
    setShockwaves((prev) => prev.filter((sw) => sw.id !== id));
  }, []);

  useEffect(() => {
    const listener: ShockwaveListener = (item) => {
      setShockwaves((prev) => [...prev, item]);
    };
    shockwaveListeners.add(listener);
    return () => {
      shockwaveListeners.delete(listener);
    };
  }, []);

  return { shockwaves, handleRemoveShockwave, triggerShockwave };
}
