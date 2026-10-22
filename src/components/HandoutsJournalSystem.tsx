import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  BookOpen,
  Scroll,
  HelpCircle,
  Image as ImageIcon,
  Map as MapIcon,
  FileText,
  Eye,
  EyeOff,
  Send,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Lock,
  Unlock,
  Sparkles,
  Upload,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Users,
  UserCheck,
  Compass,
  Feather,
  Volume2,
  Award,
  KeyRound,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import {
  HandoutItem,
  HandoutCategory,
  HandoutThemeStyle,
  SharedQuestItem,
  SharedJournalEntry,
  ActiveHandoutPresentation,
  HandoutsJournalState,
  DEFAULT_STARTER_HANDOUTS,
  DEFAULT_STARTER_QUESTS,
  DEFAULT_STARTER_JOURNAL
} from '../types/handout';
import { uploadAndRegisterAsset } from '../lib/firebase';

const STORAGE_KEY = 'mistwalker_handouts_journal_v1';

/**
 * Synthesizes a subtle parchment / chime sound effect using Web Audio API
 */
export function playHandoutSound(type: 'reveal' | 'solve' | 'note' = 'reveal') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === 'solve') {
      // Triumphant arcane chord
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.001, now + idx * 0.06);
        gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.06 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + idx * 0.06 + 0.75);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.76);
      });
    } else {
      // Warm mystic chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const base = type === 'reveal' ? 587.33 : 440;
      osc.frequency.setValueAtTime(base, now);
      osc.frequency.exponentialRampToValueAtTime(base * 1.5, now + 0.18);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.56);
    }

    setTimeout(() => {
      try {
        ctx.close();
      } catch {}
    }, 950);
  } catch {
    // Ignore autoplay restrictions
  }
}

function loadInitialState(): HandoutsJournalState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        handouts: Array.isArray(parsed.handouts) ? parsed.handouts : DEFAULT_STARTER_HANDOUTS,
        quests: Array.isArray(parsed.quests) ? parsed.quests : DEFAULT_STARTER_QUESTS,
        journalEntries: Array.isArray(parsed.journalEntries) ? parsed.journalEntries : DEFAULT_STARTER_JOURNAL,
        activePresentation: null
      };
    }
  } catch {}
  return {
    handouts: DEFAULT_STARTER_HANDOUTS,
    quests: DEFAULT_STARTER_QUESTS,
    journalEntries: DEFAULT_STARTER_JOURNAL,
    activePresentation: null
  };
}

export function useHandoutsJournalSystem(options: {
  role: 'dm' | 'player';
  currentCharacterName?: string;
  socketRef: React.MutableRefObject<any>;
}) {
  const { role, currentCharacterName, socketRef } = options;
  const [state, setState] = useState<HandoutsJournalState>(loadInitialState);
  const [inspectedHandout, setInspectedHandout] = useState<HandoutItem | null>(null);
  const [hasUnreadUpdate, setHasUnreadUpdate] = useState(false);

  const latestCharNameRef = useRef(currentCharacterName);
  useEffect(() => {
    latestCharNameRef.current = currentCharacterName;
  }, [currentCharacterName]);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          handouts: state.handouts,
          quests: state.quests,
          journalEntries: state.journalEntries
        })
      );
    } catch {}
  }, [state.handouts, state.quests, state.journalEntries]);

  const emitSync = useCallback(
    (nextState: Partial<HandoutsJournalState>) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('HANDOUTS_SYNC', nextState);
      }
    },
    [socketRef]
  );

  // Listen for socket events when socket connects or updates
  const handleRemoteSync = useCallback((payload: Partial<HandoutsJournalState>) => {
    if (!payload) return;
    setState((prev) => ({
      handouts: Array.isArray(payload.handouts) ? payload.handouts : prev.handouts,
      quests: Array.isArray(payload.quests) ? payload.quests : prev.quests,
      journalEntries: Array.isArray(payload.journalEntries) ? payload.journalEntries : prev.journalEntries,
      activePresentation:
        payload.activePresentation !== undefined ? payload.activePresentation : prev.activePresentation
    }));
    setHasUnreadUpdate(true);
  }, []);

  const handleRemotePresent = useCallback(
    (presentation: ActiveHandoutPresentation | null) => {
      if (!presentation || !presentation.handout) {
        setState((prev) => ({ ...prev, activePresentation: null }));
        return;
      }

      // Check if targeted to specific players
      const targets = presentation.targetCharacterNames || [];
      if (role === 'player' && targets.length > 0) {
        const myName = (latestCharNameRef.current || '').trim().toLowerCase();
        const isTargeted = targets.some((t) => t.trim().toLowerCase() === myName);
        if (!isTargeted) {
          return; // Private handout for another character
        }
      }

      setState((prev) => {
        const exists = prev.handouts.some((h) => h.id === presentation.handout.id);
        const nextHandouts = exists
          ? prev.handouts.map((h) => (h.id === presentation.handout.id ? presentation.handout : h))
          : [presentation.handout, ...prev.handouts];
        return {
          ...prev,
          handouts: nextHandouts,
          activePresentation: presentation
        };
      });

      setInspectedHandout(presentation.handout);
      setHasUnreadUpdate(true);
      playHandoutSound('reveal');
      toast.info(`📜 Handout Revealed: "${presentation.handout.title}"`);
    },
    [role]
  );

  const handleRemoteRiddleGuess = useCallback(
    (data: { handoutId: string; playerName: string; guess: string; solved: boolean }) => {
      if (!data?.handoutId) return;
      if (data.solved) {
        playHandoutSound('solve');
        toast.success(`✨ ${data.playerName} solved the riddle with "${data.guess}"!`);
        setState((prev) => {
          const nextHandouts = prev.handouts.map((h) =>
            h.id === data.handoutId ? { ...h, isAnswerRevealed: true, updatedAt: Date.now() } : h
          );
          return { ...prev, handouts: nextHandouts };
        });
        setInspectedHandout((prev) =>
          prev && prev.id === data.handoutId ? { ...prev, isAnswerRevealed: true } : prev
        );
      } else if (role === 'dm') {
        toast.info(`🧩 ${data.playerName} guessed "${data.guess}" on the riddle.`);
      }
    },
    [role]
  );

  // Actions
  const saveHandout = useCallback(
    (item: HandoutItem) => {
      setState((prev) => {
        const exists = prev.handouts.some((h) => h.id === item.id);
        const nextHandouts = exists
          ? prev.handouts.map((h) => (h.id === item.id ? item : h))
          : [item, ...prev.handouts];
        const next = { ...prev, handouts: nextHandouts };
        emitSync({ handouts: nextHandouts });
        return next;
      });
      setInspectedHandout((prev) => (prev && prev.id === item.id ? item : prev));
    },
    [emitSync]
  );

  const deleteHandout = useCallback(
    (id: string) => {
      setState((prev) => {
        const nextHandouts = prev.handouts.filter((h) => h.id !== id);
        emitSync({ handouts: nextHandouts });
        return { ...prev, handouts: nextHandouts };
      });
      setInspectedHandout((prev) => (prev && prev.id === id ? null : prev));
    },
    [emitSync]
  );

  const presentHandoutToPlayers = useCallback(
    (handout: HandoutItem, targetCharacterNames?: string[]) => {
      const updatedHandout: HandoutItem = {
        ...handout,
        isSharedWithParty: true,
        visibleToCharacterNames: targetCharacterNames && targetCharacterNames.length > 0 ? targetCharacterNames : undefined,
        updatedAt: Date.now()
      };
      const presentation: ActiveHandoutPresentation = {
        handout: updatedHandout,
        targetCharacterNames,
        presentedAt: Date.now()
      };
      setState((prev) => {
        const exists = prev.handouts.some((h) => h.id === updatedHandout.id);
        const nextHandouts = exists
          ? prev.handouts.map((h) => (h.id === updatedHandout.id ? updatedHandout : h))
          : [updatedHandout, ...prev.handouts];
        emitSync({ handouts: nextHandouts, activePresentation: presentation });
        return {
          ...prev,
          handouts: nextHandouts,
          activePresentation: presentation
        };
      });
      if (socketRef.current?.connected) {
        socketRef.current.emit('HANDOUT_PRESENT', presentation);
      }
      playHandoutSound('reveal');
      const targetDesc =
        targetCharacterNames && targetCharacterNames.length > 0
          ? `Privately shown to: ${targetCharacterNames.join(', ')}`
          : 'Popped up on all Player Views & unlocked in Party Journal';
      toast.success(`Presented "${handout.title}"!`, { description: targetDesc });
    },
    [emitSync, socketRef]
  );

  const dismissActivePresentation = useCallback(() => {
    setState((prev) => ({ ...prev, activePresentation: null }));
    setInspectedHandout(null);
    if (role === 'dm' && socketRef.current?.connected) {
      socketRef.current.emit('HANDOUT_PRESENT', null);
    }
  }, [role, socketRef]);

  const submitRiddleGuess = useCallback(
    (handout: HandoutItem, guess: string) => {
      const cleanGuess = guess.trim().toLowerCase();
      const cleanAnswer = (handout.riddleAnswer || '').trim().toLowerCase();
      // Match if exact or if answer words are contained in guess
      const coreAnswer = cleanAnswer.replace(/^(an?|the)\s+/i, '').trim();
      const solved =
        Boolean(coreAnswer) &&
        (cleanGuess === cleanAnswer ||
          cleanGuess === coreAnswer ||
          (coreAnswer.length >= 3 && cleanGuess.includes(coreAnswer)));

      const payload = {
        handoutId: handout.id,
        playerName: currentCharacterName || (role === 'dm' ? 'Dungeon Master' : 'Player'),
        guess: guess.trim(),
        solved
      };

      if (socketRef.current?.connected) {
        socketRef.current.emit('HANDOUT_RIDDLE_GUESS', payload);
      }
      handleRemoteRiddleGuess(payload);
      if (!solved) {
        toast.error(`"${guess.trim()}" — The runes do not react...`);
      }
      return solved;
    },
    [currentCharacterName, role, socketRef, handleRemoteRiddleGuess]
  );

  const saveQuest = useCallback(
    (quest: SharedQuestItem) => {
      setState((prev) => {
        const exists = prev.quests.some((q) => q.id === quest.id);
        const nextQuests = exists
          ? prev.quests.map((q) => (q.id === quest.id ? quest : q))
          : [quest, ...prev.quests];
        emitSync({ quests: nextQuests });
        return { ...prev, quests: nextQuests };
      });
    },
    [emitSync]
  );

  const deleteQuest = useCallback(
    (id: string) => {
      setState((prev) => {
        const nextQuests = prev.quests.filter((q) => q.id !== id);
        emitSync({ quests: nextQuests });
        return { ...prev, quests: nextQuests };
      });
    },
    [emitSync]
  );

  const addOrUpdateJournalEntry = useCallback(
    (entry: SharedJournalEntry) => {
      setState((prev) => {
        const exists = prev.journalEntries.some((j) => j.id === entry.id);
        const nextEntries = exists
          ? prev.journalEntries.map((j) => (j.id === entry.id ? entry : j))
          : [entry, ...prev.journalEntries];
        emitSync({ journalEntries: nextEntries });
        return { ...prev, journalEntries: nextEntries };
      });
      playHandoutSound('note');
    },
    [emitSync]
  );

  const deleteJournalEntry = useCallback(
    (id: string) => {
      setState((prev) => {
        const nextEntries = prev.journalEntries.filter((j) => j.id !== id);
        emitSync({ journalEntries: nextEntries });
        return { ...prev, journalEntries: nextEntries };
      });
    },
    [emitSync]
  );

  // Filter handouts visible to current user
  const visibleHandouts = useMemo(() => {
    if (role === 'dm') return state.handouts;
    const myName = (currentCharacterName || '').trim().toLowerCase();
    return state.handouts.filter((h) => {
      if (!h.isSharedWithParty) return false;
      if (h.visibleToCharacterNames && h.visibleToCharacterNames.length > 0) {
        if (!myName) return false;
        return h.visibleToCharacterNames.some((n) => n.trim().toLowerCase() === myName);
      }
      return true;
    });
  }, [role, state.handouts, currentCharacterName]);

  return {
    handouts: visibleHandouts,
    allHandouts: state.handouts,
    quests: state.quests,
    journalEntries: state.journalEntries,
    activePresentation: state.activePresentation,
    inspectedHandout,
    setInspectedHandout,
    hasUnreadUpdate,
    clearUnreadUpdate: useCallback(() => setHasUnreadUpdate(false), []),
    saveHandout,
    deleteHandout,
    presentHandoutToPlayers,
    dismissActivePresentation,
    submitRiddleGuess,
    saveQuest,
    deleteQuest,
    addOrUpdateJournalEntry,
    deleteJournalEntry,
    handleRemoteSync,
    handleRemotePresent,
    handleRemoteRiddleGuess
  };
}

const CATEGORY_META: Record<
  HandoutCategory,
  { label: string; icon: React.FC<{ className?: string }>; badgeClass: string }
> = {
  letter: {
    label: 'Letter / Scroll',
    icon: Scroll,
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  },
  riddle: {
    label: 'Riddle / Puzzle',
    icon: KeyRound,
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40'
  },
  prop: {
    label: 'Visual Prop / Art',
    icon: ImageIcon,
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40'
  },
  map: {
    label: 'Regional / Lore Map',
    icon: MapIcon,
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  },
  lore: {
    label: 'Tome / Codex',
    icon: BookOpen,
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
  }
};

/**
 * Fullscreen Interactive Spotlight Viewer for Letters, Riddles, Props & Maps
 */
export const HandoutSpotlightModal: React.FC<{
  handout: HandoutItem | null;
  role: 'dm' | 'player';
  onClose: () => void;
  onPresentToPlayers?: (handout: HandoutItem) => void;
  onUpdateHandout?: (updated: HandoutItem) => void;
  onSubmitRiddleGuess?: (handout: HandoutItem, guess: string) => boolean;
  onNarrateText?: (text: string) => void;
}> = ({
  handout,
  role,
  onClose,
  onPresentToPlayers,
  onUpdateHandout,
  onSubmitRiddleGuess,
  onNarrateText
}) => {
  const [imageZoom, setImageZoom] = useState(1);
  const [guessInput, setGuessInput] = useState('');

  useEffect(() => {
    setImageZoom(1);
    setGuessInput('');
  }, [handout?.id]);

  if (!handout) return null;

  const isParchment = handout.themeStyle === 'parchment' || handout.themeStyle === 'royal_decree';
  const isStone = handout.themeStyle === 'stone_tablet';
  const isArcane = handout.themeStyle === 'arcane_tome';
  const hints = handout.riddleHints || [];
  const revealedHints = handout.revealedHintCount || 0;

  return (
    <div
      id="handout-spotlight-modal"
      className="fixed inset-0 z-[450] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.95)] border-2 transition-all ${
          isParchment
            ? 'bg-gradient-to-b from-[#f6ead4] via-[#eddab8] to-[#dec396] text-stone-900 border-amber-700/80'
            : isStone
            ? 'bg-gradient-to-b from-zinc-800 via-stone-900 to-zinc-950 text-stone-100 border-purple-500/50 shadow-[0_0_50px_rgba(168,85,247,0.25)]'
            : isArcane
            ? 'bg-gradient-to-b from-indigo-950 via-slate-950 to-zinc-950 text-indigo-100 border-indigo-400/50 shadow-[0_0_50px_rgba(99,102,241,0.3)]'
            : 'bg-zinc-950/95 text-zinc-100 border-amber-500/40'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Action Bar */}
        <div
          className={`px-5 py-3 flex items-center justify-between border-b shrink-0 ${
            isParchment
              ? 'bg-amber-950/10 border-amber-900/20 text-stone-800'
              : 'bg-zinc-900/80 border-zinc-800 text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                isParchment
                  ? 'bg-amber-900/15 text-amber-950 border-amber-800/40'
                  : CATEGORY_META[handout.category].badgeClass
              }`}
            >
              {CATEGORY_META[handout.category].label}
            </span>
            {handout.visibleToCharacterNames && handout.visibleToCharacterNames.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                Whisper: {handout.visibleToCharacterNames.join(', ')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onNarrateText && handout.content && (
              <button
                type="button"
                onClick={() => onNarrateText(`${handout.title}. ${handout.content}`)}
                className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  isParchment
                    ? 'bg-amber-900/20 hover:bg-amber-900/30 text-amber-950 border-amber-800/40'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-amber-300 border-zinc-700'
                }`}
                title="Read Aloud with AI Narration"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Read Aloud</span>
              </button>
            )}

            {role === 'dm' && onPresentToPlayers && (
              <button
                type="button"
                onClick={() => onPresentToPlayers(handout)}
                className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-mono font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                title="Pop up this handout live on all Player screens"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Show to Players</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                isParchment ? 'hover:bg-amber-900/20 text-stone-700' : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
              title="Close (Escape)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Handout Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 select-text">
          {/* Title & Subtitle Header */}
          <div className="text-center space-y-1.5 border-b pb-4 border-current/15">
            <h2
              className={`text-2xl sm:text-3xl font-bold tracking-tight ${
                isParchment ? 'font-serif text-stone-900' : isStone ? 'font-mono uppercase tracking-widest text-purple-200' : 'font-serif text-amber-200'
              }`}
            >
              {handout.title}
            </h2>
            {handout.subtitle && (
              <p
                className={`text-xs sm:text-sm italic ${
                  isParchment ? 'text-stone-700' : 'text-zinc-400'
                }`}
              >
                {handout.subtitle}
              </p>
            )}
          </div>

          {/* Interactive Zoomable Visual Prop / Map Image */}
          {handout.imageUrl && (
            <div className="space-y-2">
              <div className="relative rounded-2xl overflow-hidden border border-black/30 bg-black/40 max-h-[52vh] overflow-auto flex items-center justify-center p-2">
                <img
                  src={handout.imageUrl}
                  alt={handout.title}
                  style={{
                    transform: `scale(${imageZoom})`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.2s ease'
                  }}
                  className="max-w-full max-h-[48vh] object-contain rounded-lg shadow-xl"
                />
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setImageZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                  className="px-2.5 py-1 rounded-lg bg-black/25 hover:bg-black/40 text-xs font-mono flex items-center gap-1 cursor-pointer"
                >
                  <ZoomOut className="w-3.5 h-3.5" /> Zoom Out
                </button>
                <span className="text-xs font-mono opacity-75">{Math.round(imageZoom * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setImageZoom((z) => Math.min(3.5, +(z + 0.25).toFixed(2)))}
                  className="px-2.5 py-1 rounded-lg bg-black/25 hover:bg-black/40 text-xs font-mono flex items-center gap-1 cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5" /> Zoom In
                </button>
                {imageZoom !== 1 && (
                  <button
                    type="button"
                    onClick={() => setImageZoom(1)}
                    className="px-2 py-1 rounded-lg bg-black/25 hover:bg-black/40 text-xs font-mono flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Main Calligraphic / Runic Text Content */}
          {handout.content && (
            <div
              className={`whitespace-pre-wrap leading-relaxed ${
                isParchment
                  ? 'font-serif text-base sm:text-lg text-stone-900 px-2 sm:px-6'
                  : isStone
                  ? 'font-serif text-lg sm:text-xl text-center italic text-purple-100 bg-zinc-950/70 border border-purple-500/30 rounded-2xl p-6 shadow-inner'
                  : 'font-sans text-sm sm:text-base text-zinc-200 px-2'
              }`}
            >
              {handout.content}
            </div>
          )}

          {/* Signature & Wax Seal for Letters / Decrees */}
          {(handout.signature || handout.sealText) && (
            <div className="flex items-center justify-between pt-4 px-4">
              {handout.sealText ? (
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-700 via-red-800 to-rose-950 border-2 border-red-400/50 shadow-[0_4px_15px_rgba(185,28,28,0.6)] flex items-center justify-center text-amber-200 font-serif font-bold text-sm tracking-widest select-none">
                    {handout.sealText.slice(0, 3).toUpperCase()}
                  </div>
                  <span className="text-[11px] uppercase tracking-widest opacity-70 font-mono">
                     Official Wax Seal
                  </span>
                </div>
              ) : (
                <div />
              )}
              {handout.signature && (
                <div
                  className={`text-lg sm:text-xl italic font-serif font-bold ${
                    isParchment ? 'text-stone-800' : 'text-amber-300'
                  }`}
                >
                  {handout.signature}
                </div>
              )}
            </div>
          )}

          {/* Riddle Interactive Module (Hints, Player Guess Box, & Answer Unlock) */}
          {handout.category === 'riddle' && (
            <div className="space-y-4 pt-2 border-t border-purple-500/30">
              {/* Hints Section */}
              {hints.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-purple-300 font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      Clues & Hints ({Math.min(revealedHints, hints.length)} / {hints.length} Revealed)
                    </span>
                    {role === 'dm' && onUpdateHandout && revealedHints < hints.length && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = {
                            ...handout,
                            revealedHintCount: revealedHints + 1,
                            updatedAt: Date.now()
                          };
                          onUpdateHandout(updated);
                          toast.info(`Revealed Hint #${revealedHints + 1} to players`);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-400/50 text-xs font-mono font-bold cursor-pointer"
                      >
                        + Reveal Next Hint to Party
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {hints.map((hint, idx) => {
                      const isUnlocked = idx < revealedHints || role === 'dm';
                      if (!isUnlocked) {
                        return (
                          <div
                            key={idx}
                            className="px-3.5 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs font-mono text-zinc-500 flex items-center gap-2"
                          >
                            <Lock className="w-3.5 h-3.5 text-zinc-600" />
                            <span>Hint #{idx + 1} (Locked by Dungeon Master)</span>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={idx}
                          className={`px-3.5 py-2 rounded-xl border text-xs font-mono flex items-center justify-between ${
                            idx < revealedHints
                              ? 'bg-purple-950/40 border-purple-500/40 text-purple-200'
                              : 'bg-zinc-900/80 border-zinc-700 text-zinc-400'
                          }`}
                        >
                          <span>
                            <strong>Hint #{idx + 1}:</strong> {hint}
                          </span>
                          {role === 'dm' && idx >= revealedHints && (
                            <span className="text-[10px] text-zinc-500 uppercase ml-2">(DM Preview)</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Riddle Solution / Guess Box */}
              {handout.isAnswerRevealed ? (
                <div className="p-4 rounded-2xl bg-emerald-950/60 border-2 border-emerald-400/70 text-center space-y-1 shadow-[0_0_25px_rgba(16,185,129,0.25)]">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                    ✨ Ancient Mechanism Unlocked — Riddle Solved
                  </div>
                  <div className="text-xl font-bold font-serif text-emerald-200">
                    Answer: {handout.riddleAnswer || 'Solved'}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {onSubmitRiddleGuess && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!guessInput.trim()) return;
                        const ok = onSubmitRiddleGuess(handout, guessInput);
                        if (ok) setGuessInput('');
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={guessInput}
                        onChange={(e) => setGuessInput(e.target.value)}
                        placeholder="Speak your answer to the inscription..."
                        className="flex-1 bg-zinc-950/90 border border-purple-500/40 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400 font-mono"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold text-xs cursor-pointer shadow-lg shadow-purple-950/50"
                      >
                        Speak Answer
                      </button>
                    </form>
                  )}

                  {role === 'dm' && (
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-950/80 border border-amber-500/30 text-xs font-mono">
                      <span className="text-amber-300">
                        <strong>DM Solution:</strong> {handout.riddleAnswer || 'None set'}
                      </span>
                      {onUpdateHandout && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = { ...handout, isAnswerRevealed: true, updatedAt: Date.now() };
                            onUpdateHandout(updated);
                            playHandoutSound('solve');
                            toast.success('Riddle solution revealed to party!');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 font-bold cursor-pointer"
                        >
                          Unlock / Reveal Solution
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* DM-Only Secret Notes Box */}
          {role === 'dm' && handout.dmSecretNotes && (
            <div
              className={`p-3.5 rounded-2xl border text-xs font-mono space-y-1 ${
                isParchment
                  ? 'bg-amber-950/90 text-amber-100 border-amber-700'
                  : 'bg-zinc-900/95 text-amber-200 border-amber-500/40'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-amber-400 font-bold">
                <Lock className="w-3 h-3" />
                <span>DM Secret Notes (Hidden from Players)</span>
              </div>
              <p className="leading-relaxed whitespace-pre-wrap">{handout.dmSecretNotes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Main Stand-Alone Handouts, Visual Props & Shared Party Journal Modal
 */
export const HandoutsJournalModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  role: 'dm' | 'player';
  currentAuthorName: string;
  availableCharacterNames?: string[];
  handouts: HandoutItem[];
  quests: SharedQuestItem[];
  journalEntries: SharedJournalEntry[];
  onSaveHandout: (item: HandoutItem) => void;
  onDeleteHandout: (id: string) => void;
  onPresentHandout: (item: HandoutItem, targetCharacterNames?: string[]) => void;
  onInspectHandout: (item: HandoutItem) => void;
  onSaveQuest: (quest: SharedQuestItem) => void;
  onDeleteQuest: (id: string) => void;
  onSaveJournalEntry: (entry: SharedJournalEntry) => void;
  onDeleteJournalEntry: (id: string) => void;
}> = ({
  isOpen,
  onClose,
  role,
  currentAuthorName,
  availableCharacterNames = [],
  handouts,
  quests,
  journalEntries,
  onSaveHandout,
  onDeleteHandout,
  onPresentHandout,
  onInspectHandout,
  onSaveQuest,
  onDeleteQuest,
  onSaveJournalEntry,
  onDeleteJournalEntry
}) => {
  const [activeTab, setActiveTab] = useState<'handouts' | 'quests' | 'journal'>('handouts');
  const [categoryFilter, setCategoryFilter] = useState<HandoutCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Handout Editor State (DM)
  const [editingHandout, setEditingHandout] = useState<HandoutItem | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [whisperTargets, setWhisperTargets] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Quest Editor State
  const [newQuestTitle, setNewQuestTitle] = useState('');
  const [newQuestGiver, setNewQuestGiver] = useState('');
  const [newQuestDesc, setNewQuestDesc] = useState('');
  const [newQuestMain, setNewQuestMain] = useState(true);

  // Journal Entry Editor State
  const [newJournalTitle, setNewJournalTitle] = useState('');
  const [newJournalCategory, setNewJournalCategory] = useState<'clue' | 'npc' | 'location' | 'session_log'>('clue');
  const [newJournalContent, setNewJournalContent] = useState('');

  if (!isOpen) return null;

  const filteredHandouts = handouts.filter((h) => {
    if (categoryFilter !== 'all' && h.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        h.title.toLowerCase().includes(q) ||
        (h.subtitle || '').toLowerCase().includes(q) ||
        h.content.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleStartNewHandout = (presetCategory: HandoutCategory = 'letter') => {
    const defaultTheme: Record<HandoutCategory, HandoutThemeStyle> = {
      letter: 'parchment',
      riddle: 'stone_tablet',
      prop: 'dark_obsidian',
      map: 'parchment',
      lore: 'arcane_tome'
    };
    setWhisperTargets([]);
    setEditingHandout({
      id: `handout_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title:
        presetCategory === 'letter'
          ? 'Sealed Parchment Missive'
          : presetCategory === 'riddle'
          ? 'Ancient Stone Inscription'
          : presetCategory === 'prop'
          ? 'Mysterious Artifact'
          : presetCategory === 'map'
          ? 'Recovered Cartographer Sketch'
          : 'Tome of Forgotten Lore',
      subtitle: '',
      category: presetCategory,
      themeStyle: defaultTheme[presetCategory],
      content: '',
      imageUrl: '',
      signature: presetCategory === 'letter' ? '— Unknown Benefactor' : '',
      sealText: presetCategory === 'letter' ? '👑' : '',
      riddleHints: presetCategory === 'riddle' ? ['First clue...'] : [],
      revealedHintCount: 0,
      riddleAnswer: '',
      isAnswerRevealed: false,
      isSharedWithParty: false,
      dmSecretNotes: '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  };

  const handleUploadPropImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingHandout) return;
    setIsUploadingImage(true);
    try {
      const asset = await uploadAndRegisterAsset(file, 'map');
      setEditingHandout((prev) => (prev ? { ...prev, imageUrl: asset.url } : null));
      toast.success(`Uploaded image for "${editingHandout.title}"`);
    } catch (err) {
      console.error('Failed to upload handout image:', err);
      toast.error('Failed to upload handout image');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div
      id="handouts-journal-modal"
      className="fixed inset-0 z-[400] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl h-[86vh] bg-zinc-950/95 border border-amber-500/40 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-950 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <Scroll className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-mono tracking-tight flex items-center gap-2">
                <span>Handouts, Visual Props & Party Journal</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {role === 'dm' ? 'DM Control Studio' : 'Player Codex'}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Share parchment letters, stone riddles, portraits, regional maps, and collaborative party notes
              </p>
            </div>
          </div>

          {/* Primary Navigation Tabs */}
          <div className="flex items-center gap-1.5 bg-zinc-900/90 p-1 rounded-2xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab('handouts')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'handouts'
                  ? 'bg-amber-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Scroll className="w-3.5 h-3.5" />
              <span>Handouts & Props ({handouts.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('quests')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'quests'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Quests ({quests.filter((q) => q.status === 'active').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('journal')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'journal'
                  ? 'bg-sky-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Feather className="w-3.5 h-3.5" />
              <span>Shared Notes ({journalEntries.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Close Window"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: HANDOUTS, LETTERS, RIDDLES & VISUAL PROPS          */}
        {/* ========================================================= */}
        {activeTab === 'handouts' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left Column: Filter Bar & Handout Cards Grid */}
            <div className="flex-1 flex flex-col overflow-hidden border-r border-zinc-800/80">
              {/* Toolbar: Category Filter + Quick Create Buttons for DM */}
              <div className="p-3.5 bg-zinc-900/50 border-b border-zinc-800/80 space-y-2.5 shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1 flex-wrap">
                    {(['all', 'letter', 'riddle', 'prop', 'map', 'lore'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold transition-all cursor-pointer border ${
                          categoryFilter === cat
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                            : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border-zinc-800'
                        }`}
                      >
                        {cat === 'all' ? 'All Items' : CATEGORY_META[cat].label.split('/')[0].trim()}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-48">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter handouts..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-amber-500/50 font-mono"
                    />
                  </div>
                </div>

                {/* DM Quick-Create Preset Bar */}
                {role === 'dm' && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-zinc-800/70">
                    <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold mr-1">
                      + New Prop:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStartNewHandout('letter')}
                      className="px-2.5 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Scroll className="w-3 h-3" /> Letter / Scroll
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartNewHandout('riddle')}
                      className="px-2.5 py-1 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <KeyRound className="w-3 h-3" /> Interactive Riddle
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartNewHandout('prop')}
                      className="px-2.5 py-1 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <ImageIcon className="w-3 h-3" /> Image / Clue Prop
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartNewHandout('map')}
                      className="px-2.5 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <MapIcon className="w-3 h-3" /> Regional Map
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartNewHandout('lore')}
                      className="px-2.5 py-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <BookOpen className="w-3 h-3" /> Tome Page
                    </button>
                  </div>
                )}
              </div>

              {/* Handouts List */}
              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5 content-start">
                {filteredHandouts.length === 0 ? (
                  <div className="col-span-full py-16 text-center space-y-2 text-zinc-500 font-mono">
                    <Scroll className="w-8 h-8 mx-auto text-zinc-600" />
                    <div className="text-sm font-bold text-zinc-400">
                      {role === 'dm'
                        ? 'No handouts match this filter yet.'
                        : 'The Dungeon Master has not shared any handouts yet.'}
                    </div>
                  </div>
                ) : (
                  filteredHandouts.map((item) => {
                    const meta = CATEGORY_META[item.category];
                    const Icon = meta.icon;
                    return (
                      <div
                        key={item.id}
                        className="group bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 rounded-2xl p-3.5 flex flex-col justify-between gap-3 transition-all shadow-md"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border flex items-center gap-1 ${meta.badgeClass}`}
                            >
                              <Icon className="w-3 h-3" />
                              {meta.label}
                            </span>

                            {role === 'dm' && (
                              <button
                                type="button"
                                onClick={() =>
                                  onSaveHandout({
                                    ...item,
                                    isSharedWithParty: !item.isSharedWithParty,
                                    updatedAt: Date.now()
                                  })
                                }
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border flex items-center gap-1 cursor-pointer ${
                                  item.isSharedWithParty
                                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                }`}
                                title="Toggle whether players can see this handout in their Party Journal"
                              >
                                {item.isSharedWithParty ? (
                                  <>
                                    <Eye className="w-3 h-3" /> Shared
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="w-3 h-3" /> DM Private
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          {item.imageUrl && (
                            <div
                              onClick={() => onInspectHandout(item)}
                              className="w-full h-32 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 cursor-pointer"
                            >
                              <img
                                src={item.imageUrl}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          )}

                          <div>
                            <h3
                              onClick={() => onInspectHandout(item)}
                              className="text-sm font-bold text-zinc-100 group-hover:text-amber-300 transition-colors cursor-pointer line-clamp-1"
                            >
                              {item.title}
                            </h3>
                            {item.subtitle && (
                              <div className="text-[11px] text-zinc-400 italic line-clamp-1">{item.subtitle}</div>
                            )}
                            {item.content && (
                              <p className="text-xs text-zinc-400 line-clamp-3 mt-1 font-serif leading-relaxed">
                                {item.content}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Card Footer Actions */}
                        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-1.5">
                          <button
                            type="button"
                            onClick={() => onInspectHandout(item)}
                            className="px-2.5 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3 text-amber-400" />
                            <span>Inspect</span>
                          </button>

                          {role === 'dm' && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onPresentHandout(item)}
                                className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-500/40 text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                                title="Pop up immediately on all Player screens"
                              >
                                <Send className="w-3 h-3" />
                                <span>Show Players</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingHandout(item);
                                  setWhisperTargets(item.visibleToCharacterNames || []);
                                }}
                                className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white cursor-pointer"
                                title="Edit Handout"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteHandout(item.id)}
                                className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/25 text-red-400 cursor-pointer"
                                title="Delete Handout"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column (DM Only): Live Handout & Prop Creator / Editor */}
            {role === 'dm' && editingHandout && (
              <div className="w-full md:w-[410px] bg-zinc-900/90 p-4 overflow-y-auto space-y-3.5 shrink-0">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
                    Configure Handout / Prop
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingHandout(null)}
                    className="text-zinc-400 hover:text-white text-xs font-mono cursor-pointer"
                  >
                    Close Editor ×
                  </button>
                </div>

                {/* Category & Visual Theme */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold block mb-1">
                      Prop Type
                    </label>
                    <select
                      value={editingHandout.category}
                      onChange={(e) =>
                        setEditingHandout({
                          ...editingHandout,
                          category: e.target.value as HandoutCategory
                        })
                      }
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 font-mono"
                    >
                      <option value="letter">📜 Letter / Scroll</option>
                      <option value="riddle">🧩 Riddle / Puzzle</option>
                      <option value="prop">🖼️ Visual Prop / Art</option>
                      <option value="map">🗺️ Regional / Lore Map</option>
                      <option value="lore">📖 Tome / Codex</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold block mb-1">
                      Visual Frame Style
                    </label>
                    <select
                      value={editingHandout.themeStyle}
                      onChange={(e) =>
                        setEditingHandout({
                          ...editingHandout,
                          themeStyle: e.target.value as HandoutThemeStyle
                        })
                      }
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 font-mono"
                    >
                      <option value="parchment">Aged Parchment</option>
                      <option value="stone_tablet">Carved Stone Tablet</option>
                      <option value="arcane_tome">Arcane Grimoire</option>
                      <option value="royal_decree">Royal Decree</option>
                      <option value="dark_obsidian">Obsidian Frame</option>
                    </select>
                  </div>
                </div>

                {/* Title & Subtitle */}
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold block mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editingHandout.title}
                      onChange={(e) => setEditingHandout({ ...editingHandout, title: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                      placeholder="e.g., Letter from Lord Neverember"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold block mb-1">
                      Subtitle / Provenance (Optional)
                    </label>
                    <input
                      type="text"
                      value={editingHandout.subtitle || ''}
                      onChange={(e) => setEditingHandout({ ...editingHandout, subtitle: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-300 font-mono"
                      placeholder="e.g., Found in the Desk of the Cult Leader"
                    />
                  </div>
                </div>

                {/* Image Upload / URL */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">
                    Prop Image / Map / Illustration
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editingHandout.imageUrl || ''}
                      onChange={(e) => setEditingHandout({ ...editingHandout, imageUrl: e.target.value })}
                      placeholder="Paste image URL or upload file..."
                      className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 font-mono"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleUploadPropImage}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-zinc-700 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploadingImage ? '...' : 'Upload'}</span>
                    </button>
                  </div>
                </div>

                {/* Body Content */}
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold block mb-1">
                    {editingHandout.category === 'riddle' ? 'Riddle Verse / Inscription' : 'Letter / Lore Text'}
                  </label>
                  <textarea
                    rows={5}
                    value={editingHandout.content}
                    onChange={(e) => setEditingHandout({ ...editingHandout, content: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-2.5 text-xs text-zinc-100 font-serif leading-relaxed"
                    placeholder="Write the contents of the letter, riddle, or lore entry..."
                  />
                </div>

                {/* Letter-specific: Signature & Wax Seal */}
                {(editingHandout.category === 'letter' || editingHandout.themeStyle === 'parchment') && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold block mb-1">
                        Signature
                      </label>
                      <input
                        type="text"
                        value={editingHandout.signature || ''}
                        onChange={(e) => setEditingHandout({ ...editingHandout, signature: e.target.value })}
                        placeholder="— Strahd von Zarovich"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 font-serif italic"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold block mb-1">
                        Wax Seal Initials
                      </label>
                      <input
                        type="text"
                        maxLength={3}
                        value={editingHandout.sealText || ''}
                        onChange={(e) => setEditingHandout({ ...editingHandout, sealText: e.target.value })}
                        placeholder="SVZ"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-amber-300 font-mono uppercase"
                      />
                    </div>
                  </div>
                )}

                {/* Riddle-specific: Answer & Progressive Hints */}
                {editingHandout.category === 'riddle' && (
                  <div className="p-3 rounded-2xl bg-purple-950/25 border border-purple-500/30 space-y-2.5">
                    <div>
                      <label className="text-[10px] font-mono uppercase text-purple-300 font-bold block mb-1">
                        Secret Riddle Answer (Auto-unlocks if player types this)
                      </label>
                      <input
                        type="text"
                        value={editingHandout.riddleAnswer || ''}
                        onChange={(e) => setEditingHandout({ ...editingHandout, riddleAnswer: e.target.value })}
                        placeholder="e.g., Echo, Shadow, Time, Silence"
                        className="w-full bg-zinc-950 border border-purple-500/40 rounded-xl px-2.5 py-1.5 text-xs text-purple-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono uppercase text-purple-300 font-bold block mb-1">
                        Hints (One per line — Revealable 1 by 1)
                      </label>
                      <textarea
                        rows={3}
                        value={(editingHandout.riddleHints || []).join('\n')}
                        onChange={(e) =>
                          setEditingHandout({
                            ...editingHandout,
                            riddleHints: e.target.value.split('\n').filter((line) => line.trim() !== '')
                          })
                        }
                        placeholder="First clue...\nSecond clue..."
                        className="w-full bg-zinc-950 border border-purple-500/40 rounded-xl p-2 text-xs text-zinc-200 font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Target Specific Players (Whisper Handout) */}
                {availableCharacterNames.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">
                      Target Recipients (Leave empty for All Players)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {availableCharacterNames.map((name) => {
                        const isSelected = whisperTargets.includes(name);
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() =>
                              setWhisperTargets((prev) =>
                                isSelected ? prev.filter((n) => n !== name) : [...prev, name]
                              )
                            }
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-500/30 text-indigo-200 border-indigo-400'
                                : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                            }`}
                          >
                            {name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* DM Secret Notes */}
                <div>
                  <label className="text-[10px] font-mono uppercase text-amber-400 font-bold block mb-1">
                    🔒 DM Secret Notes (Never shown to players)
                  </label>
                  <textarea
                    rows={2}
                    value={editingHandout.dmSecretNotes || ''}
                    onChange={(e) => setEditingHandout({ ...editingHandout, dmSecretNotes: e.target.value })}
                    className="w-full bg-zinc-950 border border-amber-500/30 rounded-xl p-2 text-xs text-amber-200/90 font-mono"
                    placeholder="DC 15 Investigation notes, hidden cipher key, trap triggers..."
                  />
                </div>

                {/* Save & Broadcast Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const updated: HandoutItem = {
                        ...editingHandout,
                        visibleToCharacterNames: whisperTargets.length > 0 ? whisperTargets : undefined,
                        updatedAt: Date.now()
                      };
                      onSaveHandout(updated);
                      setEditingHandout(null);
                      toast.success(`Saved "${updated.title}"`);
                    }}
                    className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-mono font-bold text-xs border border-zinc-700 cursor-pointer"
                  >
                    Save Only
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updated: HandoutItem = {
                        ...editingHandout,
                        isSharedWithParty: true,
                        visibleToCharacterNames: whisperTargets.length > 0 ? whisperTargets : undefined,
                        updatedAt: Date.now()
                      };
                      onSaveHandout(updated);
                      onPresentHandout(updated, whisperTargets.length > 0 ? whisperTargets : undefined);
                      setEditingHandout(null);
                    }}
                    className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-mono font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Save & Show Players</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: SHARED QUEST LOG & PARTY OBJECTIVES                */}
        {/* ========================================================= */}
        {activeTab === 'quests' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {quests.length === 0 ? (
                <div className="text-center py-16 text-zinc-500 font-mono text-sm">
                  No active quests recorded yet.
                </div>
              ) : (
                quests.map((q) => (
                  <div
                    key={q.id}
                    className={`p-4 rounded-2xl border flex items-start justify-between gap-4 ${
                      q.status === 'completed'
                        ? 'bg-emerald-950/20 border-emerald-500/30 opacity-80'
                        : 'bg-zinc-900/80 border-zinc-800'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            q.isMainQuest
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {q.isMainQuest ? 'Main Quest' : 'Side Quest'}
                        </span>
                        {q.giverOrLocation && (
                          <span className="text-xs font-mono text-zinc-400">• {q.giverOrLocation}</span>
                        )}
                      </div>
                      <h3
                        className={`text-base font-bold ${
                          q.status === 'completed' ? 'line-through text-emerald-300' : 'text-white'
                        }`}
                      >
                        {q.title}
                      </h3>
                      <p className="text-xs text-zinc-300 leading-relaxed">{q.description}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          onSaveQuest({
                            ...q,
                            status: q.status === 'completed' ? 'active' : 'completed',
                            updatedAt: Date.now()
                          })
                        }
                        className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold border cursor-pointer flex items-center gap-1 ${
                          q.status === 'completed'
                            ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{q.status === 'completed' ? 'Completed' : 'Mark Done'}</span>
                      </button>
                      {role === 'dm' && (
                        <button
                          type="button"
                          onClick={() => onDeleteQuest(q.id)}
                          className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/25 text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Quest Form */}
            <div className="w-full md:w-80 bg-zinc-900/90 border-l border-zinc-800 p-4 space-y-3 shrink-0">
              <div className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold">
                + Add Quest / Objective
              </div>
              <input
                type="text"
                value={newQuestTitle}
                onChange={(e) => setNewQuestTitle(e.target.value)}
                placeholder="Quest Title..."
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
              />
              <input
                type="text"
                value={newQuestGiver}
                onChange={(e) => setNewQuestGiver(e.target.value)}
                placeholder="Patron / Location (Optional)"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-300 font-mono"
              />
              <textarea
                rows={4}
                value={newQuestDesc}
                onChange={(e) => setNewQuestDesc(e.target.value)}
                placeholder="Objective details, reward, or clues..."
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-2.5 text-xs text-zinc-200"
              />
              <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newQuestMain}
                  onChange={(e) => setNewQuestMain(e.target.checked)}
                />
                <span>Main Story Quest</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  if (!newQuestTitle.trim()) return;
                  onSaveQuest({
                    id: `quest_${Date.now()}`,
                    title: newQuestTitle.trim(),
                    giverOrLocation: newQuestGiver.trim() || undefined,
                    description: newQuestDesc.trim(),
                    status: 'active',
                    isMainQuest: newQuestMain,
                    updatedAt: Date.now()
                  });
                  setNewQuestTitle('');
                  setNewQuestGiver('');
                  setNewQuestDesc('');
                  toast.success('Added quest to Party Journal!');
                }}
                className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono font-bold text-xs cursor-pointer"
              >
                Add Quest to Log
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: COLLABORATIVE SHARED PARTY JOURNAL & CLUES         */}
        {/* ========================================================= */}
        {activeTab === 'journal' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {journalEntries.length === 0 ? (
                <div className="text-center py-16 text-zinc-500 font-mono text-sm">
                  No shared party notes yet. Players and the DM can record clues, NPCs, and locations here.
                </div>
              ) : (
                journalEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-mono font-bold uppercase">
                          {entry.category.replace('_', ' ')}
                        </span>
                        <span className="text-sm font-bold text-white">{entry.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-zinc-400">
                          by {entry.authorName}
                        </span>
                        <button
                          type="button"
                          onClick={() => onDeleteJournalEntry(entry.id)}
                          className="p-1 rounded-lg hover:bg-red-500/20 text-zinc-500 hover:text-red-400 cursor-pointer"
                          title="Delete Entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                      {entry.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Add Shared Note Form */}
            <div className="w-full md:w-80 bg-zinc-900/90 border-l border-zinc-800 p-4 space-y-3 shrink-0">
              <div className="text-xs font-mono uppercase tracking-wider text-sky-400 font-bold">
                + Record Party Clue / Note
              </div>
              <select
                value={newJournalCategory}
                onChange={(e) => setNewJournalCategory(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 font-mono"
              >
                <option value="clue">🔍 Discovered Clue / Riddle</option>
                <option value="npc">🧑 Notable NPC</option>
                <option value="location">🏰 Discovered Location</option>
                <option value="session_log">📖 Session Chronicle</option>
              </select>
              <input
                type="text"
                value={newJournalTitle}
                onChange={(e) => setNewJournalTitle(e.target.value)}
                placeholder="Note Title (e.g., Suspicious Apothecary)"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
              />
              <textarea
                rows={5}
                value={newJournalContent}
                onChange={(e) => setNewJournalContent(e.target.value)}
                placeholder="Write clue details, NPC motives, or passwords..."
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-2.5 text-xs text-zinc-200"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newJournalTitle.trim() || !newJournalContent.trim()) return;
                  onSaveJournalEntry({
                    id: `journal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    title: newJournalTitle.trim(),
                    category: newJournalCategory,
                    authorName: currentAuthorName,
                    content: newJournalContent.trim(),
                    updatedAt: Date.now()
                  });
                  setNewJournalTitle('');
                  setNewJournalContent('');
                  toast.success('Shared note with the party!');
                }}
                className="w-full py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-mono font-bold text-xs cursor-pointer"
              >
                Post to Shared Journal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
