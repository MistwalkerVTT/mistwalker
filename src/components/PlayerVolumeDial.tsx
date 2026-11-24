import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Volume1, Volume2, VolumeX } from 'lucide-react';

interface PlayerVolumeDialProps {
  volume: number; // 0.0 - 1.0
  isMuted: boolean;
  onChangeVolume: (nextVolume: number) => void;
  onToggleMute: () => void;
  compact?: boolean;
}

const DEFAULT_VOLUME = 0.85;
const MIN_ANGLE = -135;
const MAX_ANGLE = 135;
const SWEEP_ANGLE = MAX_ANGLE - MIN_ANGLE; // 270 deg

function clamp01(val: number): number {
  return Math.max(0, Math.min(1, val));
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  // 0 deg = 12 o'clock (top)
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

const TICK_ANGLES = Array.from({ length: 9 }, (_, i) => MIN_ANGLE + (i / 8) * SWEEP_ANGLE);

const RotaryKnob: React.FC<{
  volume: number;
  isMuted: boolean;
  onChangeVolume: (next: number) => void;
  onToggleMute: () => void;
  size?: number;
}> = ({ volume, isMuted, onChangeVolume, onToggleMute, size = 48 }) => {
  const knobRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{ startY: number; startX: number; startVol: number } | null>(null);

  const effectiveVol = isMuted ? 0 : clamp01(volume);
  const currentAngle = MIN_ANGLE + effectiveVol * SWEEP_ANGLE;
  const pct = Math.round(effectiveVol * 100);

  // Non-passive wheel listener so scrolling over the dial never zooms the battlemap
  useEffect(() => {
    const el = knobRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY < 0 ? 0.05 : -0.05;
      const base = isMuted ? 0 : volume;
      onChangeVolume(clamp01(Math.round((base + delta) * 100) / 100));
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [volume, isMuted, onChangeVolume]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      startY: e.clientY,
      startX: e.clientX,
      startVol: isMuted ? 0 : clamp01(volume),
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const dy = dragStateRef.current.startY - e.clientY;
    const dx = e.clientX - dragStateRef.current.startX;
    // Vertical drag is primary; slight horizontal drag also works naturally
    const delta = (dy + dx * 0.35) / 110;
    const next = clamp01(Math.round((dragStateRef.current.startVol + delta) * 100) / 100);
    onChangeVolume(next);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current) return;
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore if already released
    }
    dragStateRef.current = null;
    setIsDragging(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const base = isMuted ? 0 : volume;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      onChangeVolume(clamp01(Math.round((base + 0.05) * 100) / 100));
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      onChangeVolume(clamp01(Math.round((base - 0.05) * 100) / 100));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChangeVolume(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChangeVolume(1);
    } else if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      onToggleMute();
    }
  };

  const trackPath = describeArc(32, 32, 24, MIN_ANGLE, MAX_ANGLE);
  const valuePath =
    effectiveVol > 0.005 ? describeArc(32, 32, 24, MIN_ANGLE, currentAngle) : '';

  return (
    <div
      ref={knobRef}
      role="slider"
      tabIndex={0}
      aria-label="Player master volume"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-valuetext={isMuted ? 'Muted' : `${pct}%`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onChangeVolume(DEFAULT_VOLUME);
      }}
      onKeyDown={handleKeyDown}
      style={{ width: size, height: size }}
      className={`relative select-none touch-none shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${
        isDragging ? 'cursor-grabbing' : 'cursor-ns-resize'
      }`}
      title="Drag up/down or scroll to adjust volume • Double-click to reset (85%)"
    >
      <svg viewBox="0 0 64 64" className="w-full h-full overflow-visible">
        <defs>
          <radialGradient id="mw-dial-knob-grad" cx="38%" cy="32%" r="68%">
            <stop offset="0%" stopColor="#3f3f46" />
            <stop offset="65%" stopColor="#27272a" />
            <stop offset="100%" stopColor="#18181b" />
          </radialGradient>
        </defs>

        {/* Outer tick marks */}
        {TICK_ANGLES.map((angle, idx) => {
          const p1 = polarToCartesian(32, 32, 28.5, angle);
          const p2 = polarToCartesian(32, 32, 30.8, angle);
          const isLit = !isMuted && angle <= currentAngle + 0.5 && effectiveVol > 0.005;
          return (
            <line
              key={idx}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={isLit ? '#34d399' : '#3f3f46'}
              strokeWidth={idx === 0 || idx === 4 || idx === 8 ? 1.5 : 1}
              strokeLinecap="round"
            />
          );
        })}

        {/* Background arc track */}
        <path
          d={trackPath}
          fill="none"
          stroke="#27272a"
          strokeWidth={4}
          strokeLinecap="round"
        />

        {/* Active emerald arc */}
        {valuePath && (
          <path
            d={valuePath}
            fill="none"
            stroke={isDragging ? '#34d399' : '#10b981'}
            strokeWidth={4}
            strokeLinecap="round"
            style={{
              filter: isDragging
                ? 'drop-shadow(0 0 4px rgba(52, 211, 153, 0.75))'
                : 'drop-shadow(0 0 2px rgba(16, 185, 129, 0.45))',
            }}
          />
        )}

        {/* Knob body */}
        <circle
          cx={32}
          cy={32}
          r={18}
          fill="url(#mw-dial-knob-grad)"
          stroke={isDragging ? '#34d399' : isMuted ? '#3f3f46' : '#52525b'}
          strokeWidth={1.4}
        />

        {/* Subtle inner bevel */}
        <circle
          cx={32}
          cy={32}
          r={14.5}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1}
        />

        {/* Rotating indicator needle */}
        <g transform={`rotate(${currentAngle} 32 32)`}>
          <line
            x1={32}
            y1={23}
            x2={32}
            y2={17.5}
            stroke={isMuted || effectiveVol <= 0.005 ? '#71717a' : '#34d399'}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
};

export const PlayerVolumeDial: React.FC<PlayerVolumeDialProps> = ({
  volume,
  isMuted,
  onChangeVolume,
  onToggleMute,
  compact = false,
}) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [popoverCoords, setPopoverCoords] = useState<{ left: number; top: number } | null>(null);
  const compactContainerRef = useRef<HTMLDivElement | null>(null);
  const compactBtnRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const effectiveVol = isMuted ? 0 : clamp01(volume);
  const pct = Math.round(effectiveVol * 100);
  const VolumeIcon = isMuted || effectiveVol <= 0.005 ? VolumeX : effectiveVol < 0.5 ? Volume1 : Volume2;

  // Close popover on outside click
  useEffect(() => {
    if (!popoverOpen) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        compactContainerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setPopoverOpen(false);
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [popoverOpen]);

  // Allow mouse wheel right on the compact icon button too
  useEffect(() => {
    if (!compact) return;
    const el = compactBtnRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY < 0 ? 0.05 : -0.05;
      const base = isMuted ? 0 : volume;
      onChangeVolume(clamp01(Math.round((base + delta) * 100) / 100));
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [compact, volume, isMuted, onChangeVolume]);

  if (compact) {
    const miniArc =
      effectiveVol > 0.005
        ? describeArc(18, 18, 15, MIN_ANGLE, MIN_ANGLE + effectiveVol * SWEEP_ANGLE)
        : '';

    return (
      <div ref={compactContainerRef} className="relative w-full">
        <button
          ref={compactBtnRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!popoverOpen && compactBtnRef.current) {
              const rect = compactBtnRef.current.getBoundingClientRect();
              const popoverHeight = 160;
              const clampedTop = Math.max(
                12,
                Math.min(window.innerHeight - popoverHeight - 12, rect.bottom - popoverHeight)
              );
              setPopoverCoords({ left: rect.right + 10, top: clampedTop });
            }
            setPopoverOpen((prev) => !prev);
          }}
          className={`relative w-full p-2 flex items-center justify-center rounded-xl transition-all cursor-pointer border ${
            isMuted || effectiveVol <= 0.005
              ? 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              : 'bg-emerald-950/30 border-emerald-800/40 text-emerald-400 hover:text-emerald-300'
          }`}
          title={isMuted ? 'Volume: Muted (Click for dial, scroll to adjust)' : `Volume: ${pct}% (Click for dial, scroll to adjust)`}
        >
          <svg viewBox="0 0 36 36" className="w-7 h-7">
            <path
              d={describeArc(18, 18, 15, MIN_ANGLE, MAX_ANGLE)}
              fill="none"
              stroke="#27272a"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            {miniArc && (
              <path
                d={miniArc}
                fill="none"
                stroke="#10b981"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            )}
          </svg>
          <VolumeIcon className="w-3.5 h-3.5 absolute" />
        </button>

        {popoverOpen && popoverCoords && typeof document !== 'undefined' && createPortal(
          <div
            ref={popoverRef}
            onClick={(e) => e.stopPropagation()}
            style={{ left: popoverCoords.left, top: popoverCoords.top }}
            className="fixed z-[120] bg-zinc-950/95 backdrop-blur-xl border border-zinc-700/80 rounded-2xl p-3 shadow-2xl flex flex-col items-center gap-2 min-w-[126px] animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between w-full gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                Volume
              </span>
              <span
                className={`text-[11px] font-mono font-bold tabular-nums ${
                  isMuted || effectiveVol <= 0.005 ? 'text-zinc-500' : 'text-emerald-400'
                }`}
              >
                {isMuted ? 'MUTED' : `${pct}%`}
              </span>
            </div>

            <RotaryKnob
              volume={volume}
              isMuted={isMuted}
              onChangeVolume={onChangeVolume}
              onToggleMute={onToggleMute}
              size={60}
            />

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleMute();
              }}
              className={`w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                isMuted
                  ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white'
                  : 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300 hover:bg-emerald-950/70'
              }`}
            >
              <VolumeIcon className="w-3.5 h-3.5" />
              <span>{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>
          </div>,
          document.body
        )}
      </div>
    );
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`w-full rounded-xl border p-2 transition-colors ${
        isMuted || effectiveVol <= 0.005
          ? 'bg-zinc-900/60 border-zinc-800'
          : 'bg-emerald-950/25 border-emerald-800/40'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <RotaryKnob
          volume={volume}
          isMuted={isMuted}
          onChangeVolume={onChangeVolume}
          onToggleMute={onToggleMute}
          size={48}
        />

        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-semibold text-zinc-200 truncate">Volume</span>
            <span
              className={`text-[11px] font-mono font-bold tabular-nums ${
                isMuted || effectiveVol <= 0.005 ? 'text-zinc-500' : 'text-emerald-400'
              }`}
            >
              {isMuted ? 'MUTED' : `${pct}%`}
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            className={`w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-[10px] font-medium border transition-colors cursor-pointer ${
              isMuted
                ? 'bg-zinc-900 border-zinc-700/80 text-zinc-400 hover:text-white'
                : 'bg-emerald-950/50 border-emerald-800/50 text-emerald-300 hover:text-emerald-200 hover:bg-emerald-950/80'
            }`}
            title={isMuted ? 'Unmute all player audio' : 'Mute all player audio'}
          >
            <VolumeIcon className="w-3 h-3 shrink-0" />
            <span>{isMuted ? 'Unmute Audio' : 'Mute Audio'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
