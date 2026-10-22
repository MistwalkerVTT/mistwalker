import React from 'react';
import { Tv, Monitor, Shield, Swords, ArrowRight } from 'lucide-react';

export type PlayerStationMode = 'tv_table' | 'remote_player';

interface PlayerStationModalProps {
  isOpen: boolean;
  onSelectStation: (mode: PlayerStationMode) => void;
  onEnterArena?: () => void;
  characterName?: string;
}

export const PlayerStationModal: React.FC<PlayerStationModalProps> = ({
  isOpen,
  onSelectStation,
  onEnterArena,
  characterName
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90dvh] overflow-y-auto bg-zinc-950/95 border border-zinc-800 rounded-3xl p-5 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col items-center text-center ring-1 ring-white/10">
        {/* Subtle top amber glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500/70 to-transparent" />

        <div className="w-14 h-14 rounded-2xl bg-zinc-900/90 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/10">
          <Shield className="w-7 h-7" />
        </div>

        <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 font-mono tracking-tight mb-1">
          Player Waiting Menu & Mode Select
        </h2>
        <p className="text-xs text-zinc-400 max-w-md font-sans mb-6">
          Link to the Dungeon Master&apos;s live campaign and choose your active character, or enter the stand-alone Battle Arena while you wait.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {/* Option 1: Remote Player View with D&D Beyond Tactical HUD (Link to DM) */}
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
                  <span>Link to DM (Choose Hero)</span>
                  <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[9px]">
                    DDB HUD
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-400 font-sans mt-1 leading-relaxed">
                  Join the Dungeon Master&apos;s live battlemap. Choose your active character, access your D&D Beyond HUD, spells, targeting & vision.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs font-mono text-amber-400 font-bold">
              <span>{characterName ? `Play as ${characterName} (or Switch)` : 'Choose Active Character'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Option 2: In-Person TV Table (Link to DM Shared Display) */}
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
                  Link to DM (Digital TV Table)
                </h3>
                <p className="text-[11px] text-zinc-400 font-sans mt-1 leading-relaxed">
                  For shared in-person table displays. Fullscreen DM battlemap, shared party vision, personal HUD hidden.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs font-mono text-emerald-400 font-bold">
              <span>Enter TV Table</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>

        {/* Option 3: Stand-Alone Battle Arena & Skirmish Lobby */}
        {onEnterArena && (
          <button
            type="button"
            onClick={onEnterArena}
            className="w-full mt-4 p-5 rounded-2xl bg-gradient-to-r from-rose-950/50 via-zinc-900/95 to-amber-950/50 hover:from-rose-900/50 hover:to-amber-900/50 border border-amber-500/50 hover:border-amber-400 transition-all text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer group shadow-xl shadow-amber-950/30"
          >
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-400/40 shrink-0 group-hover:scale-105 transition-transform">
                <Swords className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-extrabold text-white font-mono group-hover:text-amber-300">
                    Enter Battle Arena & Player Lobby
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    1v1 • 2v2 • Scaled Random Encounters • vs NPCs
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 font-sans mt-1 leading-relaxed">
                  Turn-based Colosseum mode with Initiative, autonomous NPC AI, full D&D Beyond HUD, and 3D dice—completely separate from the DM&apos;s campaign.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300 shrink-0 self-end sm:self-center">
              <span>Open Arena Lobby</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        )}

        <div className="mt-5 text-[11px] font-mono text-zinc-500">
          Tip: You can switch between the DM Campaign and Battle Arena at any time from the left sidebar.
        </div>
      </div>
    </div>
  );
};
