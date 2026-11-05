import React, { useEffect, useState } from 'react';
import { Swords, Crown, Skull } from 'lucide-react';

interface ArenaTurnBannerProps {
  actorName: string;
  round: number;
  team: 'gold' | 'crimson';
  avatar?: string;
  turnKey: string; // changes on every turn to re-trigger animation
}

export const ArenaTurnBanner: React.FC<ArenaTurnBannerProps> = ({
  actorName,
  round,
  team,
  avatar,
  turnKey,
}) => {
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    if (!turnKey) return;
    setVisible(true);

    const timer = setTimeout(() => {
      setVisible(false);
    }, 1800);

    return () => clearTimeout(timer);
  }, [turnKey]);

  if (!visible) return null;

  const isGold = team === 'gold';

  return (
    <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 pointer-events-none select-none w-full max-w-md px-4 flex justify-center animate-turn-banner-swoop">
      <div
        className={`relative flex items-center gap-3.5 px-6 py-2.5 rounded-full border-2 shadow-2xl backdrop-blur-md ${
          isGold
            ? 'bg-zinc-950/90 border-amber-400 text-amber-100 shadow-[0_0_25px_rgba(251,191,36,0.5)]'
            : 'bg-zinc-950/90 border-red-500 text-red-100 shadow-[0_0_25px_rgba(239,68,68,0.5)]'
        }`}
      >
        {avatar ? (
          <img
            src={avatar}
            alt={actorName}
            className={`w-9 h-9 rounded-full object-cover border-2 shrink-0 ${
              isGold ? 'border-amber-400' : 'border-red-500'
            }`}
          />
        ) : (
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 font-bold font-mono text-sm ${
              isGold
                ? 'bg-amber-950 border-amber-400 text-amber-200'
                : 'bg-red-950 border-red-500 text-red-200'
            }`}
          >
            {isGold ? <Crown className="w-5 h-5" /> : <Skull className="w-5 h-5" />}
          </div>
        )}

        <div className="flex flex-col text-left">
          <span
            className={`text-[10px] font-mono font-bold tracking-widest uppercase ${
              isGold ? 'text-amber-400' : 'text-red-400'
            }`}
          >
            Round {round} • {isGold ? 'Player Turn' : 'Enemy Turn'}
          </span>
          <span className="text-base font-black font-mono tracking-wide text-white drop-shadow-md">
            {actorName.toUpperCase()}
          </span>
        </div>

        <div className="ml-auto pl-2">
          <Swords
            className={`w-5 h-5 animate-pulse ${isGold ? 'text-amber-400' : 'text-red-400'}`}
          />
        </div>
      </div>
    </div>
  );
};
