import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { DdbDiceRollEvent } from '../types/dice';
import { RollSummaryToast } from './RollSummaryToast';
import { ThreeDiceEngine, DieRollRequest } from '../graphics/dice/diceEngine';
import { DiceThemeOptions } from '../graphics/dice/diceTextures';

interface Props {
  socket?: Socket | null;
  onCriticalHit?: () => void;
  enabled?: boolean;
  theme?: DiceThemeOptions;
}

export const DiceTableOverlay: React.FC<Props> = ({
  socket,
  onCriticalHit,
  enabled = true,
  theme
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ThreeDiceEngine | null>(null);
  const [activeRollToast, setActiveRollToast] = useState<DdbDiceRollEvent | null>(null);

  // Initialize Three.js + Cannon-es 3D physics dice engine
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const engine = new ThreeDiceEngine(containerRef.current, theme);
    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [enabled]);

  // Dynamically update materials when theme options change
  useEffect(() => {
    if (engineRef.current && theme) {
      engineRef.current.setTheme(theme);
    }
  }, [theme]);

  // Execute 3D physical dice roll animation with predetermined results
  const roll3d = useCallback(async (rollData: DdbDiceRollEvent) => {
    setActiveRollToast(rollData);

    // If Nat 20, trigger critical hit screen shake
    const isCrit = rollData.isCritical || rollData.dice?.some(d => d.sides === 20 && d.result === 20);
    if (isCrit && onCriticalHit) {
      onCriticalHit();
    }

    if (!enabled || !engineRef.current) return;

    try {
      // Accurately resolve die types for incoming roll
      const resolveType = (type?: string, sides?: number): string => {
        if (type) {
          const lower = type.toLowerCase();
          if (lower.includes('100') || lower.includes('%')) return 'd100';
          if (lower.includes('20')) return 'd20';
          if (lower.includes('12')) return 'd12';
          if (lower.includes('10')) return 'd10';
          if (lower.includes('8')) return 'd8';
          if (lower.includes('6')) return 'd6';
          if (lower.includes('4')) return 'd4';
        }
        if (sides === 100) return 'd100';
        if (sides === 20) return 'd20';
        if (sides === 12) return 'd12';
        if (sides === 10) return 'd10';
        if (sides === 8) return 'd8';
        if (sides === 6) return 'd6';
        if (sides === 4) return 'd4';
        return 'd20';
      };

      const requests: DieRollRequest[] = [];

      if (rollData.dice && rollData.dice.length > 0) {
        for (const d of rollData.dice) {
          const dieType = resolveType(d.type, d.sides);
          requests.push({
            type: dieType,
            result: d.result,
            isCritical: (dieType === 'd20' || d.sides === 20) && d.result === 20,
            isFumble: (dieType === 'd20' || d.sides === 20) && d.result === 1
          });
        }
      } else {
        // Fallback for roll without explicit dice array
        const notation = rollData.diceNotation || rollData.formula || '1d20';
        const match = notation.match(/([0-9]*)d([0-9]+)/i);
        const count = match && match[1] ? Math.max(1, Math.min(10, parseInt(match[1], 10))) : 1;
        const sides = match ? parseInt(match[2], 10) : 20;
        const dieType = resolveType(undefined, sides);
        const total = rollData.total ?? sides;

        let remTotal = total;
        for (let i = 0; i < count; i++) {
          const avg = Math.round(remTotal / (count - i));
          const val = Math.max(1, Math.min(sides, avg || 1));
          remTotal -= val;
          requests.push({
            type: dieType,
            result: val,
            isCritical: sides === 20 && val === 20,
            isFumble: sides === 20 && val === 1
          });
        }
      }

      console.log('[DiceTableOverlay] 🎲 Rolling predetermined 3D dice:', requests);
      engineRef.current.roll(requests);
    } catch (err) {
      console.warn('[DiceTableOverlay] Error playing 3D predetermined roll:', err);
    }
  }, [enabled, onCriticalHit]);

  // Listen for socket events with triple-layer resilience
  useEffect(() => {
    let activeSocket = socket || (typeof window !== 'undefined' ? (window as any).__mistwalkerSocket : null);
    let createdLocal = false;

    if (!activeSocket) {
      try {
        activeSocket = io();
        createdLocal = true;
      } catch (err) {
        console.warn('[DiceTableOverlay] Fallback socket connection failed:', err);
      }
    }

    if (!activeSocket) return;

    const handleDdbRoll = (data: DdbDiceRollEvent) => {
      if (!data) return;
      console.log('[DiceTableOverlay] 🎲 DDB_DICE_ROLLED received via socket:', data);
      roll3d(data);
    };

    const handleLocalRoll = (data: DdbDiceRollEvent) => {
      if (!data) return;
      console.log('[DiceTableOverlay] 🎲 SYNC_LOCAL_DICE_ROLL received via socket:', data);
      roll3d(data);
    };

    activeSocket.on('DDB_DICE_ROLLED', handleDdbRoll);
    activeSocket.on('SYNC_LOCAL_DICE_ROLL', handleLocalRoll);

    return () => {
      activeSocket?.off('DDB_DICE_ROLLED', handleDdbRoll);
      activeSocket?.off('SYNC_LOCAL_DICE_ROLL', handleLocalRoll);
      if (createdLocal) {
        activeSocket?.disconnect();
      }
    };
  }, [socket, roll3d]);

  // Expose roll and clear functions to window for immediate local triggering
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__mistwalkerRoll3d = roll3d;
      (window as any).__mistwalkerClearDice3d = () => {
        try {
          engineRef.current?.clearDice();
        } catch (e) {
          console.warn('[DiceTableOverlay] Failed to clear dice:', e);
        }
      };
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__mistwalkerRoll3d;
        delete (window as any).__mistwalkerClearDice3d;
      }
    };
  }, [roll3d]);

  return (
    <>
      {/* 3D Transparent Full-Viewport Overlay directly above Konva stage */}
      <div
        id="mistwalker-3d-dice-overlay"
        ref={containerRef}
        className="fixed inset-0 pointer-events-none z-40 overflow-hidden"
        style={{ width: '100vw', height: '100vh' }}
      />

      {/* Floating Roll Summary Toast */}
      <RollSummaryToast
        roll={activeRollToast}
        onDismiss={() => setActiveRollToast(null)}
      />
    </>
  );
};
