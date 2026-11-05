import React, { useEffect, useState } from 'react';
import { Shield, Skull, Heart, Flame, Zap, Droplets, Target } from 'lucide-react';

export interface TargetCombatantInfo {
  id: string;
  name: string;
  avatar?: string;
  team: 'gold' | 'crimson';
  currentHp: number;
  maxHp: number;
  tempHp?: number;
  ac: number;
  classOrCr?: string;
  conditions?: string[];
}

interface ArenaTargetHealthBarProps {
  target: TargetCombatantInfo | null;
  onDeselect?: () => void;
}

export const ArenaTargetHealthBar: React.FC<ArenaTargetHealthBarProps> = ({ target, onDeselect }) => {
  // Ghost bar (trailing damage bar) to give satisfying fighting-game / RPG hit feel
  const [ghostHp, setGhostHp] = useState<number>(target?.currentHp ?? 0);

  useEffect(() => {
    if (!target) return;
    const current = target.currentHp;

    // If healing, update ghost HP immediately
    if (current >= ghostHp) {
      setGhostHp(current);
      return;
    }

    // On damage, hold for 350ms before smoothly decaying the trailing ghost bar
    const timer = setTimeout(() => {
      setGhostHp(current);
    }, 350);

    return () => clearTimeout(timer);
  }, [target?.currentHp]);

  if (!target) return null;

  const currentHp = Math.max(0, target.currentHp);
  const maxHp = Math.max(1, target.maxHp);
  const hpPct = Math.min(100, Math.max(0, (currentHp / maxHp) * 100));
  const ghostPct = Math.min(100, Math.max(0, (ghostHp / maxHp) * 100));

  const isEnemy = target.team === 'crimson';
  const isDead = currentHp <= 0;

  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 w-[92%] max-w-xl pointer-events-none transition-all duration-300">
      <div className="relative bg-zinc-950/90 border border-zinc-800/80 rounded-2xl p-3 shadow-2xl backdrop-blur-md flex items-center gap-3.5 border-t-2 border-t-amber-500/40">
        {/* Unit Avatar */}
        <div className="relative shrink-0">
          <div
            className={`w-12 h-12 rounded-xl overflow-hidden border-2 ${
              isEnemy ? 'border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]' : 'border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
            }`}
          >
            {target.avatar ? (
              <img src={target.avatar} alt={target.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-zinc-800 flex items-center justify-center font-bold text-white text-base">
                {target.name.charAt(0)}
              </div>
            )}
          </div>
          <div
            className={`absolute -bottom-1.5 -right-1.5 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-black border ${
              isEnemy ? 'bg-red-950 text-red-200 border-red-500/80' : 'bg-amber-950 text-amber-200 border-amber-400'
            }`}
          >
            {target.team === 'crimson' ? 'FOE' : 'ALLY'}
          </div>
        </div>

        {/* Vital Info & Dual Health Bar */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 truncate">
              <span className="font-extrabold text-sm text-zinc-100 font-mono tracking-wide truncate">
                {target.name}
              </span>
              {target.classOrCr && (
                <span className="text-[10px] text-zinc-400 font-mono bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 shrink-0">
                  {target.classOrCr}
                </span>
              )}
            </div>

            {/* Armor Class & Current Status */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-blue-300 bg-blue-950/60 border border-blue-800/60 px-2 py-0.5 rounded-lg">
                <Shield className="w-3 h-3 text-blue-400" />
                <span>AC {target.ac}</span>
              </div>
              <div className="text-[11px] font-mono font-extrabold text-zinc-200">
                <span className={currentHp <= maxHp * 0.25 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}>
                  {currentHp}
                </span>
                <span className="text-zinc-500"> / {maxHp}</span>
              </div>
            </div>
          </div>

          {/* Health Bar Track with Ghost Decaying Fill */}
          <div className="relative w-full h-3.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-700/60 shadow-inner">
            {/* Ghost Bar (orange/yellow damage trail) */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-amber-500/80 transition-all duration-500 ease-out"
              style={{ width: `${ghostPct}%` }}
            />
            {/* Active HP Fill */}
            <div
              className={`absolute top-0 bottom-0 left-0 transition-all duration-150 ease-out ${
                isDead
                  ? 'bg-zinc-600'
                  : currentHp <= maxHp * 0.25
                  ? 'bg-gradient-to-r from-red-700 to-red-500'
                  : currentHp <= maxHp * 0.5
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-400'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-400'
              }`}
              style={{ width: `${hpPct}%` }}
            />

            {/* Segmented Grid Ticks (Video Game Style Chunks) */}
            <div className="absolute inset-0 flex justify-between pointer-events-none opacity-25">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="w-[1px] h-full bg-black/60" />
              ))}
            </div>
          </div>

          {/* Conditions Active Chips */}
          {target.conditions && target.conditions.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {target.conditions.map((cond) => (
                <span
                  key={cond}
                  className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-purple-950/70 border border-purple-600/50 text-purple-200"
                >
                  {cond}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
