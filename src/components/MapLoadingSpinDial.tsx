import React, { useEffect, useState } from 'react';
import { Compass, Sparkles, MapPin, X } from 'lucide-react';

export interface MapLoadingState {
  isLoading: boolean;
  sceneTitle?: string;
  campaignTitle?: string;
  phase?: 'resolving' | 'streaming' | 'decoding' | 'ready';
  slotName?: string;
}

export interface MapLoadingSpinDialProps {
  loadingState: MapLoadingState;
  variant?: 'dm' | 'player';
  onCancel?: () => void;
}

const PHASE_LABELS: Record<string, string> = {
  resolving: 'Resolving Sector Coordinates...',
  streaming: 'Streaming High-Resolution Textures...',
  decoding: 'Mounting GPU Canvas & Calibrating...',
  ready: 'Battlemap Ready'
};

export const MapLoadingSpinDial: React.FC<MapLoadingSpinDialProps> = ({
  loadingState,
  variant = 'dm',
  onCancel
}) => {
  const { isLoading, sceneTitle, campaignTitle, phase = 'resolving', slotName } = loadingState;
  const [showCancel, setShowCancel] = useState(false);

  // Safety fallback: Reveal cancel option after 4.5 seconds if network is lagging
  useEffect(() => {
    if (!isLoading) {
      setShowCancel(false);
      return;
    }
    const timer = setTimeout(() => {
      setShowCancel(true);
    }, 4500);
    return () => clearTimeout(timer);
  }, [isLoading]);

  if (!isLoading) return null;

  const isDm = variant === 'dm';
  const themeAccent = isDm ? 'amber' : 'emerald';
  const ringPrimaryStroke = isDm ? '#f59e0b' : '#10b981';
  const ringSecondaryStroke = isDm ? '#d97706' : '#059669';
  const ringGlowColor = isDm ? 'rgba(245, 158, 11, 0.45)' : 'rgba(16, 185, 129, 0.45)';

  const activePhaseText = PHASE_LABELS[phase] || 'Loading Battlemap...';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-zinc-950/85 backdrop-blur-md animate-in fade-in duration-300 pointer-events-auto select-none overflow-hidden"
    >
      {/* Background Ambient Radial Glow */}
      <div
        className={`absolute w-[480px] h-[480px] rounded-full blur-[110px] pointer-events-none transition-all duration-700 ${
          isDm ? 'bg-amber-600/15' : 'bg-emerald-600/15'
        }`}
      />

      {/* Main Dial HUD Card */}
      <div className="relative flex flex-col items-center max-w-sm sm:max-w-md w-full px-6 py-8 text-center">
        
        {/* Arcane Spin Dial SVG */}
        <div className="relative w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center mb-6">
          
          {/* Pulsing Core Glow Behind Dial */}
          <div
            className="absolute inset-4 rounded-full blur-xl animate-pulse"
            style={{ backgroundColor: ringGlowColor }}
          />

          <svg
            className="w-full h-full filter drop-shadow-[0_0_12px_rgba(0,0,0,0.8)]"
            viewBox="0 0 160 160"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer Static Track Ring */}
            <circle
              cx="80"
              cy="80"
              r="72"
              stroke="#27272a"
              strokeWidth="2"
              opacity="0.6"
            />

            {/* Outer Rotating Astrolabe Ring (Clockwise) */}
            <g className="animate-[spin_10s_linear_infinite]" style={{ transformOrigin: '80px 80px' }}>
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke={ringPrimaryStroke}
                strokeWidth="1.5"
                strokeDasharray="4 6"
                opacity="0.8"
              />
              {/* Cardinal Markers */}
              <circle cx="80" cy="10" r="2.5" fill={ringPrimaryStroke} />
              <circle cx="150" cy="80" r="2.5" fill={ringPrimaryStroke} />
              <circle cx="80" cy="150" r="2.5" fill={ringPrimaryStroke} />
              <circle cx="10" cy="80" r="2.5" fill={ringPrimaryStroke} />
              
              {/* Secondary Compass Diamonds */}
              <path d="M 80 6 L 82 10 L 80 14 L 78 10 Z" fill={ringPrimaryStroke} />
              <path d="M 80 146 L 82 150 L 80 154 L 78 150 Z" fill={ringPrimaryStroke} />
              <path d="M 6 80 L 10 82 L 14 80 L 10 78 Z" fill={ringPrimaryStroke} />
              <path d="M 146 80 L 150 82 L 154 80 L 150 78 Z" fill={ringPrimaryStroke} />
            </g>

            {/* Middle Counter-Rotating Dial Ring (Counter-Clockwise) */}
            <g className="animate-[spin_4s_linear_infinite_reverse]" style={{ transformOrigin: '80px 80px' }}>
              <circle
                cx="80"
                cy="80"
                r="56"
                stroke={ringSecondaryStroke}
                strokeWidth="2.5"
                strokeDasharray="22 14"
                strokeLinecap="round"
                opacity="0.9"
              />
              <circle
                cx="80"
                cy="80"
                r="50"
                stroke="#3f3f46"
                strokeWidth="1"
                strokeDasharray="2 4"
                opacity="0.5"
              />
            </g>

            {/* Inner High-Speed Reticle Arc (Clockwise) */}
            <g className="animate-[spin_2s_linear_infinite]" style={{ transformOrigin: '80px 80px' }}>
              <circle
                cx="80"
                cy="80"
                r="38"
                stroke={ringPrimaryStroke}
                strokeWidth="2"
                strokeDasharray="18 40"
                strokeLinecap="round"
              />
            </g>

            {/* Inner Target Crosshairs */}
            <line x1="80" y1="48" x2="80" y2="60" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="80" y1="100" x2="80" y2="112" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="48" y1="80" x2="60" y2="80" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="100" y1="80" x2="112" y2="80" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" />

            {/* Center Core Pulsing Beacon */}
            <circle cx="80" cy="80" r="6" fill={ringPrimaryStroke} className="animate-pulse" />
            <circle cx="80" cy="80" r="14" stroke={ringPrimaryStroke} strokeWidth="1" opacity="0.3" className="animate-ping" />
          </svg>

          {/* Central Compass Needle Emblem */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Compass
              className={`w-7 h-7 sm:w-8 sm:h-8 animate-pulse ${
                isDm ? 'text-amber-400' : 'text-emerald-400'
              }`}
            />
          </div>
        </div>

        {/* Scene & Sector Context */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center justify-center gap-1.5">
            <MapPin className={`w-3.5 h-3.5 ${isDm ? 'text-amber-400' : 'text-emerald-400'}`} />
            <span className={`text-[11px] font-mono uppercase tracking-widest font-bold ${
              isDm ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {slotName ? `Tactical Sector • ${slotName}` : 'Tactical Sector'}
            </span>
          </div>

          <h2 className="text-lg sm:text-2xl font-extrabold text-zinc-100 font-mono tracking-tight drop-shadow truncate max-w-xs sm:max-w-sm">
            {sceneTitle || 'Battlemap'}
          </h2>

          {campaignTitle && (
            <p className="text-xs text-zinc-400 font-sans truncate max-w-xs">
              {campaignTitle}
            </p>
          )}
        </div>

        {/* Phase Progress Badge */}
        <div className="flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 shadow-inner">
          <Sparkles className={`w-3.5 h-3.5 animate-spin ${
            isDm ? 'text-amber-400' : 'text-emerald-400'
          }`} />
          <span className="text-xs font-mono font-medium text-zinc-300 tracking-wide">
            {activePhaseText}
          </span>
        </div>

        {/* Pulsing Linear Progress Bar */}
        <div className="w-48 h-1 bg-zinc-900 rounded-full mt-4 overflow-hidden border border-zinc-800/80">
          <div
            className={`h-full rounded-full animate-pulse transition-all duration-300 ${
              isDm ? 'bg-gradient-to-r from-amber-600 via-amber-400 to-amber-500' : 'bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-500'
            }`}
            style={{
              width: phase === 'ready' ? '100%' : phase === 'decoding' ? '80%' : phase === 'streaming' ? '50%' : '25%'
            }}
          />
        </div>

        {/* Manual Cancel Fallback if Lagging */}
        {showCancel && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-6 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900/70 hover:bg-zinc-800 border border-zinc-700/60 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 text-[11px] font-mono transition-all cursor-pointer shadow-sm animate-in fade-in duration-200"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel / Force Canvas</span>
          </button>
        )}

      </div>
    </div>
  );
};
