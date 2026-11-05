import React, { useEffect, useState } from 'react';

export interface FloatingCombatTextItem {
  id: string;
  combatantId: string;
  worldX: number;
  worldY: number;
  text: string;
  type: 'damage' | 'crit' | 'heal' | 'miss' | 'condition';
  createdAt: number;
  jitterX: number;
  verticalStagger: number;
}

interface ArenaFloatingCombatTextProps {
  items: FloatingCombatTextItem[];
  stagePos: { x: number; y: number };
  stageScale: number;
  arenaGridSize: number;
  onItemExpired: (id: string) => void;
}

export const ArenaFloatingCombatText: React.FC<ArenaFloatingCombatTextProps> = ({
  items,
  stagePos,
  stageScale,
  arenaGridSize,
  onItemExpired,
}) => {
  useEffect(() => {
    if (items.length === 0) return;
    const now = Date.now();
    const timers = items.map((item) => {
      const remaining = Math.max(50, 1250 - (now - item.createdAt));
      return setTimeout(() => {
        onItemExpired(item.id);
      }, remaining);
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [items, onItemExpired]);

  if (items.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden z-30"
      style={{ perspective: 1000 }}
    >
      {items.map((item) => {
        // Project world coordinates (token center or target point) to client screen coordinates
        const screenX = item.worldX * stageScale + stagePos.x + item.jitterX * stageScale;
        const screenY = item.worldY * stageScale + stagePos.y + item.verticalStagger * stageScale;

        // Visual styles tuned for arcade/tactical video game feel
        const isCrit = item.type === 'crit';
        const isHeal = item.type === 'heal';
        const isMiss = item.type === 'miss';
        const isCondition = item.type === 'condition';

        return (
          <div
            key={item.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 will-change-transform select-none font-black font-mono tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] animate-arena-fct"
            style={{
              left: `${screenX}px`,
              top: `${screenY}px`,
              fontSize: isCrit ? '26px' : isCondition ? '16px' : '20px',
              textShadow: isCrit
                ? '0 0 10px rgba(245, 158, 11, 0.8), 0 2px 4px #000'
                : isHeal
                ? '0 0 8px rgba(16, 185, 129, 0.8), 0 2px 4px #000'
                : isMiss
                ? '0 2px 4px #000'
                : '0 0 6px rgba(239, 68, 68, 0.8), 0 2px 4px #000',
              color: isCrit
                ? '#fef08a'
                : isHeal
                ? '#34d399'
                : isMiss
                ? '#94a3b8'
                : isCondition
                ? '#c084fc'
                : '#f87171',
            }}
          >
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
                isCrit
                  ? 'bg-amber-950/80 border border-amber-400 text-amber-200 scale-110 shadow-[0_0_15px_rgba(251,191,36,0.5)]'
                  : isHeal
                  ? 'bg-emerald-950/70 border border-emerald-500/70 text-emerald-300'
                  : isMiss
                  ? 'bg-zinc-900/80 border border-zinc-700 text-zinc-400 text-sm'
                  : isCondition
                  ? 'bg-purple-950/80 border border-purple-500/70 text-purple-200 text-xs uppercase'
                  : 'bg-red-950/80 border border-red-500/70 text-red-200'
              }`}
            >
              <span>{item.text}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
