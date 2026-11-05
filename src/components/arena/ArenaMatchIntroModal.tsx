import React, { useEffect, useState } from 'react';
import { Swords, Zap } from 'lucide-react';

export interface CombatantIntroItem {
  id: string;
  name: string;
  avatarUrl?: string;
  team: 'gold' | 'crimson';
  classOrCr?: string;
}

interface ArenaMatchIntroModalProps {
  isOpen: boolean;
  onFinish: () => void;
  goldTeam: CombatantIntroItem[];
  crimsonTeam: CombatantIntroItem[];
  matchModeLabel?: string;
}

export const ArenaMatchIntroModal: React.FC<ArenaMatchIntroModalProps> = ({
  isOpen,
  onFinish,
  goldTeam,
  crimsonTeam,
  matchModeLabel = 'ARENA SHOWDOWN',
}) => {
  const [animStage, setAnimStage] = useState<'intro' | 'vs' | 'fight'>('intro');

  useEffect(() => {
    if (!isOpen) {
      setAnimStage('intro');
      return;
    }

    const t1 = setTimeout(() => setAnimStage('vs'), 400);
    const t2 = setTimeout(() => setAnimStage('fight'), 1600);
    const t3 = setTimeout(() => {
      onFinish();
    }, 2500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isOpen, onFinish]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onFinish}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md cursor-pointer select-none overflow-hidden"
    >
      {/* Background Light Beam Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/30 via-zinc-950 to-black pointer-events-none" />

      {/* Top Match Mode Banner */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
        <span className="text-[11px] font-mono uppercase tracking-[0.3em] font-extrabold text-amber-400 bg-amber-950/80 border border-amber-500/50 px-4 py-1.5 rounded-full shadow-lg">
          {matchModeLabel}
        </span>
      </div>

      {/* Split Teams Screen */}
      <div className="relative z-10 w-full max-w-5xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left Side: Team Gold */}
        <div
          className={`flex-1 flex flex-col items-center md:items-end transition-all duration-700 ease-out ${
            animStage !== 'intro'
              ? 'opacity-100 translate-x-0'
              : 'opacity-0 -translate-x-20'
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl sm:text-2xl font-black font-mono text-amber-400 tracking-wider">
              TEAM GOLD
            </span>
          </div>
          <div className="flex flex-wrap justify-center md:justify-end gap-3 max-w-sm">
            {goldTeam.slice(0, 4).map((fighter) => (
              <div
                key={fighter.id}
                className="group relative flex flex-col items-center bg-zinc-900/90 border-2 border-amber-500/70 p-2 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.25)] hover:border-amber-400 transition-all"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-zinc-950">
                  {fighter.avatarUrl ? (
                    <img
                      src={fighter.avatarUrl}
                      alt={fighter.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-amber-300">
                      {fighter.name[0]}
                    </div>
                  )}
                </div>
                <span className="text-xs font-mono font-bold text-white mt-1.5 max-w-[80px] truncate text-center">
                  {fighter.name.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Center: "VS" Emblem or "FIGHT!" */}
        <div className="shrink-0 flex flex-col items-center justify-center py-4">
          {animStage === 'fight' ? (
            <div className="animate-bounce scale-125 text-5xl sm:text-7xl font-black font-mono tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-red-600 drop-shadow-[0_0_35px_rgba(239,68,68,0.8)]">
              FIGHT!
            </div>
          ) : (
            <div className="relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-zinc-950 border-4 border-amber-400/80 shadow-[0_0_30px_rgba(245,158,11,0.5)] animate-pulse">
              <span className="text-3xl sm:text-4xl font-black font-mono tracking-tighter text-amber-300">
                VS
              </span>
              <div className="absolute -inset-2 border border-dashed border-amber-500/40 rounded-full animate-spin [animation-duration:8s]" />
            </div>
          )}
        </div>

        {/* Right Side: Team Crimson */}
        <div
          className={`flex-1 flex flex-col items-center md:items-start transition-all duration-700 ease-out ${
            animStage !== 'intro'
              ? 'opacity-100 translate-x-0'
              : 'opacity-0 translate-x-20'
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl sm:text-2xl font-black font-mono text-red-500 tracking-wider">
              TEAM CRIMSON
            </span>
          </div>
          <div className="flex flex-wrap justify-center md:justify-start gap-3 max-w-sm">
            {crimsonTeam.slice(0, 4).map((fighter) => (
              <div
                key={fighter.id}
                className="group relative flex flex-col items-center bg-zinc-900/90 border-2 border-red-500/70 p-2 rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.25)] hover:border-red-400 transition-all"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-zinc-950">
                  {fighter.avatarUrl ? (
                    <img
                      src={fighter.avatarUrl}
                      alt={fighter.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-red-300">
                      {fighter.name[0]}
                    </div>
                  )}
                </div>
                <span className="text-xs font-mono font-bold text-white mt-1.5 max-w-[80px] truncate text-center">
                  {fighter.name.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Skip indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-zinc-500 text-[10px] font-mono tracking-widest uppercase">
        Click anywhere to skip
      </div>
    </div>
  );
};
