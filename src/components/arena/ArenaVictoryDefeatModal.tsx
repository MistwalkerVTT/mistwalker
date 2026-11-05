import React from 'react';
import { Trophy, Skull, Swords, RotateCcw, ArrowLeft, Award, Flame, Shield } from 'lucide-react';

export interface CombatantStatSummary {
  id: string;
  name: string;
  avatarUrl?: string;
  team: 'gold' | 'crimson';
  damageDealt: number;
  damageTaken: number;
  healingDealt: number;
  kills: number;
  survived: boolean;
}

interface ArenaVictoryDefeatModalProps {
  isOpen: boolean;
  winnerTeam: 'gold' | 'crimson' | null;
  rounds: number;
  stats: CombatantStatSummary[];
  onRematch: () => void;
  onLobby: () => void;
}

export const ArenaVictoryDefeatModal: React.FC<ArenaVictoryDefeatModalProps> = ({
  isOpen,
  winnerTeam,
  rounds,
  stats,
  onRematch,
  onLobby,
}) => {
  if (!isOpen || !winnerTeam) return null;

  const isGoldWin = winnerTeam === 'gold';

  // Find MVP (highest total score: damageDealt + healingDealt + kills * 20)
  const sortedCombatants = [...stats].sort((a, b) => {
    const scoreA = a.damageDealt + a.healingDealt + a.kills * 25;
    const scoreB = b.damageDealt + b.healingDealt + b.kills * 25;
    return scoreB - scoreA;
  });
  const mvp = sortedCombatants[0] || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative bg-zinc-950 border border-zinc-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 text-center border-t-4 border-t-amber-500 overflow-hidden">
        {/* Glow ambient background */}
        <div
          className={`absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-30 ${
            isGoldWin ? 'bg-amber-500' : 'bg-red-600'
          }`}
        />

        {/* Header Emblem */}
        <div className="relative z-10 flex flex-col items-center">
          <div
            className={`w-18 h-18 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center border-2 mb-3 ${
              isGoldWin
                ? 'bg-amber-950/70 border-amber-400 text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.5)]'
                : 'bg-red-950/70 border-red-500 text-red-500 shadow-[0_0_25px_rgba(239,68,68,0.5)]'
            }`}
          >
            {isGoldWin ? <Trophy className="w-10 h-10" /> : <Skull className="w-10 h-10" />}
          </div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-400">
            Arena Match Resolved • {rounds} {rounds === 1 ? 'Round' : 'Rounds'}
          </span>
          <h2
            className={`text-2xl sm:text-3xl font-black font-mono tracking-wider mt-1 ${
              isGoldWin ? 'text-amber-300' : 'text-red-400'
            }`}
          >
            {isGoldWin ? 'VICTORY ACHIEVED' : 'DEFEAT'}
          </h2>
        </div>

        {/* MVP Showcase Card */}
        {mvp && (
          <div className="relative z-10 bg-zinc-900/90 border border-amber-500/40 rounded-2xl p-4 flex items-center justify-between text-left shadow-lg">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-amber-400 bg-zinc-950">
                  {mvp.avatarUrl ? (
                    <img src={mvp.avatarUrl} alt={mvp.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-amber-300">
                      {mvp.name[0]}
                    </div>
                  )}
                </div>
                <div className="absolute -top-2 -left-2 p-1 rounded-full bg-amber-500 text-zinc-950">
                  <Award className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1">
                  <Flame className="w-3 h-3" /> MATCH MVP
                </span>
                <div className="text-sm font-extrabold text-white font-mono">{mvp.name}</div>
              </div>
            </div>
            <div className="text-right font-mono">
              <div className="text-xs font-bold text-amber-300">
                {mvp.damageDealt} DMG {mvp.healingDealt > 0 && `• +${mvp.healingDealt} HEAL`}
              </div>
              <div className="text-[10px] text-zinc-400">
                {mvp.kills} {mvp.kills === 1 ? 'Kill' : 'Kills'}
              </div>
            </div>
          </div>
        )}

        {/* Combat Performance Table */}
        <div className="relative z-10 max-h-48 overflow-y-auto space-y-1.5 pr-1 text-left">
          {sortedCombatants.map((fighter) => (
            <div
              key={fighter.id}
              className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs font-mono"
            >
              <div className="flex items-center gap-2 truncate">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    fighter.team === 'gold' ? 'bg-amber-400' : 'bg-red-500'
                  }`}
                />
                <span className="font-bold text-zinc-200 truncate">{fighter.name}</span>
                {!fighter.survived && (
                  <span className="text-[9px] text-zinc-500 uppercase font-semibold">Fallen</span>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0 text-zinc-400">
                <span>
                  <strong className="text-zinc-200">{fighter.damageDealt}</strong> dmg
                </span>
                {fighter.healingDealt > 0 && (
                  <span className="text-emerald-400">
                    +<strong>{fighter.healingDealt}</strong>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="relative z-10 flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={onRematch}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-mono font-bold text-xs cursor-pointer shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Instant Rematch</span>
          </button>
          <button
            type="button"
            onClick={onLobby}
            className="flex-1 py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 font-mono font-bold text-xs cursor-pointer flex items-center justify-center gap-2 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Arena Lobby</span>
          </button>
        </div>
      </div>
    </div>
  );
};
