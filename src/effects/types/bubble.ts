// src/effects/types/bubble.ts
// Type definitions for Token Status Bubbles (e.g. Hunter's Mark, Hex, custom DM indicators)

export type BubbleStyle = 'classic' | 'ac-badge' | 'orb' | 'shield' | 'danger' | 'glow';

export interface TokenStatusBubble {
  id: string;
  label: string;          // e.g. "Hunter's Mark", "Hex", "Bane", "Hold Person", "Threat", etc.
  subLabel?: string;      // 1-4 uppercase chars or value, e.g. "AC", "1d6", "DIS", "PAR", "-1d4"
  icon?: string;          // emoji or icon symbol, e.g. "🎯", "💀", "⛓️", "✨", "⏳", "🔻", "🛡️", "👑", "👁️"
  color: string;          // primary color theme, e.g. "#22c55e", "#a855f7", "#ef4444", "#38bdf8", etc.
  bgColor?: string;       // background fill, default dark slate "#090d16"
  borderColor?: string;   // border stroke color
  videoUrl?: string;      // Looping WebM animation for the bubble
  pulse?: boolean;        // subtle rhythmic glow pulse
  style?: BubbleStyle;
  sourceCasterId?: string;// id/name of caster who placed it
  sourceSpellId?: string; // id of spell (e.g. 'hunters_mark', 'hex', etc.)
  createdTime?: number;
  durationMs?: number;    // optional duration
  description?: string;   // helpful tooltip / description
}
