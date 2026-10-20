import React from 'react';
import { Tv, Monitor, Shield, Sparkles, Check, ArrowRight } from 'lucide-react';

export type PlayerStationMode = 'tv_table' | 'remote_player';

interface PlayerStationModalProps {
  isOpen: boolean;
  onSelectStation: (mode: PlayerStationMode) => void;
  characterName?: string;
}

export const PlayerStationModal: React.FC<PlayerStationModalProps> = ({
  isOpen,
  onSelectStation,
  characterName
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90dvh] overflow-y-auto bg-zinc-950/95 border border-zinc-800 rounded-3xl p-5 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col items-center text-center ring-1 ring-white/10">
        {/* Subtle top amber glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500/70 to-transparent" />

        <div className="w-14 h-14 rounded-2xl bg-zinc-900/90 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/10">
          <Shield className="w-7 h-7" />
        </div>

        <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 font-mono tracking-tight mb-1">
          Select Player Station Mode
        </h2>
        <p className="text-xs text-zinc-400 max-w-md font-sans mb-6">
          Choose how this display is being used in your campaign session.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {/* Station 1: In-Person TV Table */}
          <button
            type="button"
            onClick={() => onSelectStation('tv_table')}
            className="group p-5 rounded-2xl bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 hover:border-emerald-500/60 transition-all text-left flex flex-col justify-between cursor-pointer relative overflow-hidden transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-950/20"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Tv className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-mono group-hover:text-emerald-300">
                  Digital TV Table
                </h3>
                <p className="text-[11px] text-zinc-400 font-sans mt-1 leading-relaxed">
                  For shared in-person table displays. Fullscreen battlemap, shared party vision, HUD hidden.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs font-mono text-emerald-400 font-bold">
              <span>Enter TV Table</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Station 2: Remote Player View with D&D Beyond Tactical HUD */}
          <button
            type="button"
            onClick={() => onSelectStation('remote_player')}
            className="group p-5 rounded-2xl bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 hover:border-amber-500/60 transition-all text-left flex flex-col justify-between cursor-pointer relative overflow-hidden transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-950/20"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-mono group-hover:text-amber-300 flex items-center gap-1.5">
                  <span>Remote Player</span>
                  <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[9px]">
                    DDB HUD
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-400 font-sans mt-1 leading-relaxed">
                  For online players on laptops/PCs. Interactive bottom action bar, spell slots, targeting & token vision.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs font-mono text-amber-400 font-bold">
              <span>{characterName ? `Play as ${characterName}` : 'Enter Player Station'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>

        <div className="mt-5 text-[11px] font-mono text-zinc-500">
          Tip: You can switch station modes at any time from the bottom utility bar.
        </div>
      </div>
    </div>
  );
};
