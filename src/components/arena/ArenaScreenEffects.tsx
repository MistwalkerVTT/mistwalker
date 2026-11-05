import React from 'react';

export interface ScreenShakeTrigger {
  intensity: 'light' | 'medium' | 'heavy';
  durationMs: number;
}

interface ArenaScreenEffectsProps {
  children: React.ReactNode;
  shakeTrigger: ScreenShakeTrigger | null;
  flashVignette: 'crit' | 'danger' | null;
  onShakeComplete?: () => void;
  onVignetteComplete?: () => void;
}

export const ArenaScreenEffects: React.FC<ArenaScreenEffectsProps> = ({
  children,
  shakeTrigger,
  flashVignette,
}) => {
  const getShakeClass = () => {
    if (!shakeTrigger) return '';
    if (shakeTrigger.intensity === 'heavy') return 'animate-shake-heavy';
    if (shakeTrigger.intensity === 'medium') return 'animate-shake-medium';
    return 'animate-shake-light';
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Outer container shakes decoupled from inner Konva math */}
      <div className={`w-full h-full ${getShakeClass()}`}>
        {children}
      </div>

      {/* Screen Vignette Flash on Nat 20 / Massive Hit / Lethal Danger */}
      {flashVignette === 'crit' && (
        <div className="pointer-events-none absolute inset-0 z-40 bg-radial from-amber-500/10 via-amber-500/25 to-amber-600/40 animate-vignette-pulse mix-blend-screen" />
      )}
      {flashVignette === 'danger' && (
        <div className="pointer-events-none absolute inset-0 z-40 bg-radial from-red-600/10 via-red-600/30 to-red-950/60 animate-vignette-pulse" />
      )}
    </div>
  );
};
