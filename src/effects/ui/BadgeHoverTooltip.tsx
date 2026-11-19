// src/effects/ui/BadgeHoverTooltip.tsx
// Floating HTML tooltip rendered when hovering over a token status badge on the Konva canvas.

import React, { useEffect, useState } from 'react';
import { TokenStatusBubble } from '../types/bubble';

export interface BadgeHoverEventDetail {
  badge: TokenStatusBubble;
  x: number;
  y: number;
}

export const BADGE_HOVER_EVENT = 'mistwalker:badge-hover';

export function emitBadgeHover(detail: BadgeHoverEventDetail | null) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<BadgeHoverEventDetail | null>(BADGE_HOVER_EVENT, { detail }));
}

export const BadgeHoverTooltip: React.FC = () => {
  const [hover, setHover] = useState<BadgeHoverEventDetail | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<BadgeHoverEventDetail | null>;
      setHover(custom.detail || null);
    };
    window.addEventListener(BADGE_HOVER_EVENT, handler);
    return () => window.removeEventListener(BADGE_HOVER_EVENT, handler);
  }, []);

  if (!hover) return null;

  const { badge, x, y } = hover;
  const color = badge.color || '#38bdf8';
  const maxWidth = 260;
  const left = typeof window !== 'undefined'
    ? Math.min(x + 14, window.innerWidth - maxWidth - 12)
    : x + 14;
  const top = typeof window !== 'undefined'
    ? Math.max(12, Math.min(y - 12, window.innerHeight - 130))
    : y - 12;

  return (
    <div
      className="fixed z-[9999] pointer-events-none bg-zinc-950/95 backdrop-blur-md border rounded-xl px-3 py-2 shadow-2xl animate-in fade-in duration-100"
      style={{
        left,
        top,
        maxWidth,
        borderColor: `${color}66`,
        boxShadow: `0 10px 28px -6px rgba(0,0,0,0.85), 0 0 12px -4px ${color}44`
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center border shrink-0 text-[10px]"
          style={{ backgroundColor: badge.bgColor || '#090d16', borderColor: color }}
        >
          {badge.icon || '★'}
        </span>
        <span className="text-xs font-bold text-zinc-100 truncate">
          {badge.label}
        </span>
        {badge.subLabel && (
          <span
            className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 shrink-0"
            style={{ color }}
          >
            {badge.subLabel}
          </span>
        )}
      </div>
      <p className="text-[11px] leading-snug text-zinc-300">
        {badge.description || 'Active status effect on this token.'}
      </p>
      {badge.sourceCasterId && (
        <p className="text-[9px] font-mono text-zinc-500 mt-1">
          Source: {badge.sourceCasterId}
        </p>
      )}
    </div>
  );
};
