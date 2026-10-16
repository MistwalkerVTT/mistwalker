import React, { useEffect, useRef, useState, useCallback } from 'react';
import DiceBox from '@3d-dice/dice-box';
import { io, Socket } from 'socket.io-client';
import { DdbDiceRollEvent } from '../types/dice';
import { RollSummaryToast } from './RollSummaryToast';

interface Props {
  socket?: Socket | null;
  onCriticalHit?: () => void;
  enabled?: boolean;
}

export const DiceTableOverlay: React.FC<Props> = ({
  socket,
  onCriticalHit,
  enabled = true
}) => {
  const diceBoxRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeRollToast, setActiveRollToast] = useState<DdbDiceRollEvent | null>(null);
  const clearTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize DiceBox instance once container is mounted
  useEffect(() => {
    if (!enabled) return;

    let isCancelled = false;
    const box = new DiceBox('#mistwalker-3d-dice-box', {
      assetPath: '/assets/dice-box/',
      scale: 6,
      gravity: 2,
      theme: 'default',
      themeColor: '#d97706',
      shadows: true,
      sounds: true,
      offscreen: false // Using onscreen canvas for reliable rendering across all browsers
    });

    box.init()
      .then(() => {
        if (!isCancelled) {
          diceBoxRef.current = box;
          setIsInitialized(true);
        }
      })
      .catch((err: any) => {
        console.warn('[DiceTableOverlay] DiceBox init note (running in standard mode):', err);
      });

    return () => {
      isCancelled = true;
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      try {
        diceBoxRef.current?.clear();
      } catch {
        // Safe disposal
      }
    };
  }, [enabled]);

  // Execute 3D physical dice roll animation
  const roll3d = useCallback(async (rollData: DdbDiceRollEvent) => {
    setActiveRollToast(rollData);

    // If Nat 20, trigger critical hit screen shake
    const isCrit = rollData.isCritical || rollData.dice.some(d => d.sides === 20 && d.result === 20);
    if (isCrit && onCriticalHit) {
      onCriticalHit();
    }

    if (!enabled) return;

    // If dice box is still initializing, wait briefly up to 2.5 seconds
    let box = diceBoxRef.current;
    if (!box) {
      for (let i = 0; i < 25; i++) {
        await new Promise(r => setTimeout(r, 100));
        if (diceBoxRef.current) {
          box = diceBoxRef.current;
          break;
        }
      }
    }

    if (!box) {
      console.warn('[DiceTableOverlay] DiceBox canvas not available for 3D physics roll');
      return;
    }

    try {
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
      }

      // Format roll notation from event
      let notation = rollData.diceNotation || rollData.formula || '1d20';
      // Clean formula to basic dice notation (e.g. "1d20+5" -> "1d20")
      const cleanNotationMatch = notation.match(/([0-9]*d[0-9]+)/gi);
      const cleanNotation = cleanNotationMatch ? cleanNotationMatch.join('+') : '1d20';

      // Always roll with standard basic D&D polyhedral dice (robust default theme)
      const rollOptions = {
        theme: 'default',
        themeColor: '#d97706'
      };

      console.log('[DiceTableOverlay] 🎲 Rolling basic 3D D&D dice:', cleanNotation);
      await box.roll(cleanNotation, rollOptions);

      // Auto-clear dice after 4.5 seconds so table remains clean
      clearTimerRef.current = setTimeout(() => {
        try {
          box?.clear();
        } catch {
          // Ignore
        }
      }, 4500);
    } catch (err) {
      console.warn('[DiceTableOverlay] Error playing 3D roll:', err);
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

  // Expose roll function to window for immediate local triggering
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__mistwalkerRoll3d = roll3d;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__mistwalkerRoll3d;
      }
    };
  }, [roll3d]);

  return (
    <>
      {/* 3D Dice Box Canvas Container */}
      <div
        id="mistwalker-3d-dice-box"
        ref={containerRef}
        className="fixed inset-0 pointer-events-none z-[82] overflow-hidden"
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
