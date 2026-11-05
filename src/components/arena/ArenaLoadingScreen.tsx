import React, { useEffect, useState } from 'react';
import { Swords, Sparkles, Shield, Flame } from 'lucide-react';

interface ArenaLoadingScreenProps {
  isLoading: boolean;
  arenaTitle?: string;
  onFinish?: () => void;
}

export const ArenaLoadingScreen: React.FC<ArenaLoadingScreenProps> = ({
  isLoading,
  arenaTitle = 'Battle Arena Colosseum',
  onFinish,
}) => {
  const [progress, setProgress] = useState(15);
  const [flavorText, setFlavorText] = useState('Sharpening blades and tuning tactical grids...');

  useEffect(() => {
    if (!isLoading) {
      setProgress(100);
      return;
    }

    setProgress(20);
    const t1 = setTimeout(() => {
      setProgress(55);
      setFlavorText('Summoning champions & configuring colosseum hazards...');
    }, 400);

    const t2 = setTimeout(() => {
      setProgress(85);
      setFlavorText('Calibrating line-of-sight & tactical initiative...');
    }, 900);

    const t3 = setTimeout(() => {
      setProgress(100);
      setFlavorText('Arena Ready. Enter the Colosseum!');
      if (onFinish) onFinish();
    }, 1400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isLoading, onFinish]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[280] flex items-center justify-center bg-black/95 backdrop-blur-xl select-none animate-in fade-in duration-200">
      {/* Background Arcade Amber/Crimson Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-950/40 via-zinc-950 to-black pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full px-6 space-y-6">
        {/* Animated Battle Icon */}
        <div className="relative flex items-center justify-center w-24 h-24 rounded-3xl bg-zinc-950 border-2 border-amber-500/70 shadow-[0_0_35px_rgba(245,158,11,0.4)]">
          <Swords className="w-12 h-12 text-amber-400 animate-pulse" />
          <div className="absolute -inset-2 border border-dashed border-amber-500/30 rounded-3xl animate-spin [animation-duration:12s]" />
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-center gap-1.5 text-xs font-mono font-bold tracking-widest uppercase text-amber-400 bg-amber-950/60 border border-amber-500/30 px-3 py-1 rounded-full mx-auto w-fit">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>Colosseum Arena Mode</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black font-mono tracking-wider text-white drop-shadow">
            {arenaTitle.toUpperCase()}
          </h2>
          <p className="text-xs font-mono text-zinc-400 h-5">
            {flavorText}
          </p>
        </div>

        {/* Arcade Segmented Progress Bar */}
        <div className="w-full space-y-2">
          <div className="w-full h-3 bg-zinc-900/90 rounded-full overflow-hidden border border-zinc-800 p-0.5 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 rounded-full transition-all duration-300 ease-out shadow-[0_0_12px_rgba(245,158,11,0.6)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono font-semibold text-zinc-500">
            <span>TACTICAL ENGAGEMENT</span>
            <span className="text-amber-400">{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
