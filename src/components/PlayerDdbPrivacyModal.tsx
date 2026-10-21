import React, { useState } from 'react';
import {
  Lock,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  X,
  Sparkles
} from 'lucide-react';

export interface PlayerDdbPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterName: string;
  characterId: string; // clean DDB character ID
  avatarUrl?: string;
  onPrivacyResolved?: () => void; // Called when verified public
  onContinueLimited?: () => void; // Called when player bypasses with limited sync
}

export const PlayerDdbPrivacyModal: React.FC<PlayerDdbPrivacyModalProps> = ({
  isOpen,
  onClose,
  characterName,
  characterId,
  avatarUrl,
  onPrivacyResolved,
  onContinueLimited
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  if (!isOpen) return null;

  const cleanId = String(characterId).replace(/^char_ddb_/, '').trim();
  const builderPreferencesUrl = `https://www.dndbeyond.com/characters/${cleanId}/builder#/home/basic`;
  const characterSheetUrl = `https://www.dndbeyond.com/characters/${cleanId}`;

  const handleCheckAgain = async () => {
    setIsChecking(true);
    setCheckError(null);
    try {
      const res = await fetch(`/api/ddb/characters/${cleanId}/privacy?refresh=true`);
      if (res.ok) {
        const data = await res.json();
        if (!data.isPrivate) {
          // Success! Now public!
          onPrivacyResolved?.();
          onClose();
          return;
        } else {
          setCheckError('Character sheet is still set to Private. Make sure you set Character Privacy to Public in the D&D Beyond builder and try again.');
        }
      } else {
        setCheckError('Could not verify status. Please ensure D&D Beyond is reachable and try again.');
      }
    } catch (err: any) {
      setCheckError(err.message || 'Error checking D&D Beyond privacy status.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleContinueAnyway = () => {
    if (onContinueLimited) {
      onContinueLimited();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col ring-1 ring-amber-500/20 text-left">
        {/* Top ambient highlight */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent rounded-t-3xl" />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with avatar & warning shield */}
        <div className="flex items-center gap-4 mb-5">
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-zinc-900 border-2 border-amber-500/50 flex items-center justify-center shadow-lg shadow-amber-950/40">
              {avatarUrl ? (
                <img src={avatarUrl} alt={characterName} className="w-full h-full object-cover" />
              ) : (
                <ShieldAlert className="w-7 h-7 text-amber-400" />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-zinc-950 border border-amber-500/70 flex items-center justify-center text-amber-400 shadow-md">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold uppercase tracking-wider mb-1">
              <Lock className="w-3 h-3" />
              Private Character Sheet
            </div>
            <h2 className="text-xl font-extrabold text-white font-mono tracking-tight">
              {characterName || 'Character'}
            </h2>
          </div>
        </div>

        {/* Explanation text */}
        <p className="text-xs text-zinc-300 leading-relaxed font-sans mb-4">
          This character sheet is currently set to <span className="text-amber-400 font-semibold">Private</span> on D&D Beyond. 
          To unlock real-time tactical actions, spell slots, and automatic HP sync in Mistwalker, 
          please switch the sheet to <span className="text-emerald-400 font-semibold">Public</span>.
        </p>

        {/* 3 Step Instruction Box */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 mb-4 space-y-2.5 text-xs text-zinc-300">
          <div className="font-mono text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            How to make your sheet public (30 seconds):
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-[11px] font-mono font-bold shrink-0 mt-0.5">
              1
            </div>
            <div>
              Click the <strong className="text-white">Open Privacy Settings</strong> quicklink below to open D&D Beyond Character Builder.
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-[11px] font-mono font-bold shrink-0 mt-0.5">
              2
            </div>
            <div>
              Under the <strong className="text-white">Home / Character Privacy</strong> section, toggle the option to <span className="text-emerald-400 font-bold">Public</span>.
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-[11px] font-mono font-bold shrink-0 mt-0.5">
              3
            </div>
            <div>
              Return to this tab and click <strong className="text-white">Check Again & Sync</strong> below.
            </div>
          </div>
        </div>

        {/* Error notification if check failed */}
        {checkError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{checkError}</span>
          </div>
        )}

        {/* Quicklink Button */}
        <a
          href={builderPreferencesUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer mb-3"
        >
          <span>Open D&D Beyond Privacy Settings</span>
          <ExternalLink className="w-4 h-4" />
        </a>

        {/* Secondary link to sheet */}
        <div className="text-center mb-5">
          <a
            href={characterSheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-zinc-400 hover:text-amber-300 underline font-mono transition-colors"
          >
            Or view full sheet at dndbeyond.com/characters/{cleanId}
          </a>
        </div>

        {/* Actions: Check Again & Sync vs Continue with Limited Access */}
        <div className="flex items-center gap-3 pt-3 border-t border-zinc-800">
          <button
            type="button"
            onClick={handleContinueAnyway}
            className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-xs font-mono font-semibold transition-colors cursor-pointer text-center"
          >
            Continue with Limited Sync
          </button>

          <button
            type="button"
            onClick={handleCheckAgain}
            disabled={isChecking}
            className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 hover:text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Verifying...' : 'Check Again & Sync'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
