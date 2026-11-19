// src/components/TokenBadgesMenuTab.tsx
// Shared Badges tab for Token Context Menu (used in both DM View and PlayerView).

import React, { useState } from 'react';
import { CircleDot, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { TokenStatusBubble, BubbleStyle } from '../effects/types/bubble';
import { PRESET_DM_BUBBLES } from '../effects/bubbles/bubbleCatalog';

interface TokenBadgesMenuTabProps {
  tokenName: string;
  bubbles?: TokenStatusBubble[];
  onUpdateBubbles: (nextBubbles: TokenStatusBubble[]) => void;
}

const BADGE_ICONS = [
  '🎯', '💀', '🛡️', '⚔️', '🔥', '❄️', '⚡', '🩸', '👑', '👁️',
  '⛓️', '⏳', '⚠️', '💣', '💎', '✨', '🧠', '🚫', '💤', '💥'
];

const BADGE_COLORS = [
  { label: 'Sky', val: '#38bdf8' },
  { label: 'Emerald', val: '#22c55e' },
  { label: 'Purple', val: '#a855f7' },
  { label: 'Amber', val: '#fbbf24' },
  { label: 'Red', val: '#ef4444' },
  { label: 'Pink', val: '#ec4899' },
  { label: 'Indigo', val: '#6366f1' },
  { label: 'Slate', val: '#94a3b8' }
];

export const TokenBadgesMenuTab: React.FC<TokenBadgesMenuTabProps> = ({
  tokenName,
  bubbles = [],
  onUpdateBubbles
}) => {
  const [customLabel, setCustomLabel] = useState('');
  const [customSubLabel, setCustomSubLabel] = useState('');
  const [customIcon, setCustomIcon] = useState('🎯');
  const [customColor, setCustomColor] = useState('#38bdf8');
  const [customStyle] = useState<BubbleStyle>('badge');

  return (
    <div className="space-y-3">
      {/* Active Badges Header / List */}
      <div className="flex justify-between items-center px-1">
        <span className="text-[9px] font-mono text-zinc-400 uppercase font-bold tracking-tighter flex items-center gap-1">
          <CircleDot className="w-2.5 h-2.5 text-emerald-400" />
          Active Status Badges
        </span>
        <span className="text-[9px] font-mono text-emerald-400 font-bold">
          {bubbles.length} Active
        </span>
      </div>

      {bubbles.length > 0 ? (
        <div className="space-y-1.5 max-h-36 overflow-y-auto sidebar-scrollbar pr-1">
          {bubbles.map((b) => (
            <div
              key={b.id}
              title={b.description ? `${b.label}: ${b.description}` : b.label}
              className="bg-zinc-900/90 border border-zinc-800 rounded-lg p-1.5 flex items-center justify-between group hover:border-zinc-700 transition-all"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <div
                  className="w-5 h-5 rounded-full flex flex-col items-center justify-center shrink-0 border shadow-xs"
                  style={{
                    backgroundColor: b.bgColor || '#090d16',
                    borderColor: b.color || '#38bdf8'
                  }}
                >
                  <span className="text-[8px] leading-none">{b.icon || '•'}</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-bold text-zinc-200 truncate flex items-center gap-1">
                    {b.label}
                    {b.subLabel && (
                      <span
                        className="text-[8px] px-1 py-0.2 rounded font-mono font-bold bg-zinc-800"
                        style={{ color: b.color }}
                      >
                        {b.subLabel}
                      </span>
                    )}
                  </span>
                  {b.description && (
                    <span className="text-[8px] font-mono text-zinc-400 truncate max-w-[150px]">
                      {b.description}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = bubbles.filter(item => item.id !== b.id);
                  onUpdateBubbles(next);
                  toast.info(`Removed ${b.label} badge`);
                }}
                className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer shrink-0"
                title="Remove badge"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              onUpdateBubbles([]);
              toast.info('Cleared all status badges');
            }}
            className="w-full text-center py-1 text-[9px] font-mono text-red-400 hover:text-red-300 cursor-pointer"
          >
            Clear All Badges
          </button>
        </div>
      ) : (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-2 text-center text-[10px] text-zinc-400 font-mono">
          No active badges. Choose a 1-click preset or build a custom badge below.
        </div>
      )}

      {/* Section: 1-Click Preset Badges */}
      <div>
        <div className="flex justify-between items-center px-1 mb-1.5">
          <span className="text-[9px] font-mono text-zinc-400 uppercase font-bold tracking-tighter">
            1-Click Preset Badges
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto sidebar-scrollbar pr-1">
          {PRESET_DM_BUBBLES.map((preset) => {
            const isActive = bubbles.some(b => b.label === preset.label);
            return (
              <button
                key={preset.label}
                type="button"
                title={preset.description ? `${preset.label}: ${preset.description}` : preset.label}
                onClick={() => {
                  if (isActive) {
                    onUpdateBubbles(bubbles.filter(b => b.label !== preset.label));
                  } else {
                    const newBubble: TokenStatusBubble = {
                      ...preset,
                      id: `badge_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
                    };
                    onUpdateBubbles([
                      ...bubbles.filter(b => b.label !== preset.label),
                      newBubble
                    ]);
                    toast.success(`Added ${preset.label} badge above ${tokenName || 'token'}!`);
                  }
                }}
                className={`text-left p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-emerald-500/20 border-emerald-400/70 text-emerald-100 shadow-sm'
                    : 'bg-zinc-900/90 hover:bg-zinc-850 border-zinc-800 text-zinc-300 hover:text-white'
                }`}
              >
                <div
                  className="w-5 h-5 rounded-full flex flex-col items-center justify-center shrink-0 border"
                  style={{
                    backgroundColor: '#090d16',
                    borderColor: preset.color
                  }}
                >
                  <span className="text-[8px] leading-none">{preset.icon}</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold truncate leading-tight">{preset.label}</span>
                  <span className="text-[8px] font-mono font-bold" style={{ color: preset.color }}>
                    {preset.subLabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section: Custom Badge Creator */}
      <div className="border-t border-zinc-800/80 pt-2.5 space-y-2">
        <div className="flex justify-between items-center px-1">
          <span className="text-[9px] font-mono text-zinc-400 uppercase font-bold tracking-tighter">
            Custom Badge Creator
          </span>
          <div className="flex items-center gap-1 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-700">
            <span className="text-[8px] font-mono text-zinc-400">Preview:</span>
            <div
              className="w-5 h-5 rounded-full flex flex-col items-center justify-center shrink-0 border shadow-xs"
              style={{
                backgroundColor: '#090d16',
                borderColor: customColor
              }}
            >
              {customSubLabel && (
                <span className="text-[5px] font-bold font-mono leading-none" style={{ color: customColor }}>
                  {customSubLabel.substring(0, 4)}
                </span>
              )}
              <span className="text-[8px] leading-none">{customIcon || '🎯'}</span>
            </div>
          </div>
        </div>

        {/* Label & SubLabel Inputs */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="col-span-2">
            <input
              type="text"
              placeholder="Badge Label (e.g. Phase 2)"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-[10px] text-zinc-200 font-mono focus:outline-none focus:border-emerald-400"
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Tag/Val"
              maxLength={4}
              value={customSubLabel}
              onChange={(e) => setCustomSubLabel(e.target.value.toUpperCase())}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-[10px] text-center text-zinc-200 font-mono uppercase font-bold focus:outline-none focus:border-emerald-400"
              title="Top small text (up to 4 chars)"
            />
          </div>
        </div>

        {/* Icon Picker */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sidebar-scrollbar">
          {BADGE_ICONS.map(ic => (
            <button
              key={ic}
              type="button"
              onClick={() => setCustomIcon(ic)}
              className={`w-6 h-6 rounded text-xs shrink-0 border transition-all cursor-pointer flex items-center justify-center ${
                customIcon === ic
                  ? 'bg-emerald-500/30 border-emerald-400 scale-110 shadow-xs'
                  : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300'
              }`}
            >
              {ic}
            </button>
          ))}
        </div>

        {/* Color Palette Swatches */}
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[9px] text-zinc-400 font-mono">Color:</span>
          <div className="flex items-center gap-1.5">
            {BADGE_COLORS.map(c => (
              <button
                key={c.label}
                type="button"
                onClick={() => setCustomColor(c.val)}
                className={`w-4 h-4 rounded-full border transition-all cursor-pointer ${
                  customColor === c.val
                    ? 'scale-125 border-white shadow-sm ring-1 ring-white/50'
                    : 'border-white/30 hover:border-white/70'
                }`}
                style={{ backgroundColor: c.val }}
                title={c.label}
              />
            ))}
          </div>
        </div>

        {/* Add Custom Badge Button */}
        <button
          type="button"
          onClick={() => {
            const lbl = customLabel.trim() || 'Status Marker';
            const newBubble: TokenStatusBubble = {
              id: `badge_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              label: lbl,
              subLabel: customSubLabel.trim() || undefined,
              icon: customIcon || '🎯',
              color: customColor,
              style: customStyle,
              createdTime: Date.now()
            };
            onUpdateBubbles([...bubbles, newBubble]);
            setCustomLabel('');
            setCustomSubLabel('');
            toast.success(`Added "${lbl}" badge above ${tokenName || 'token'}!`);
          }}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold font-mono shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Custom Badge</span>
        </button>
      </div>
    </div>
  );
};
