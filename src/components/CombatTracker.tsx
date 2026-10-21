import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { CombatantRow } from './CombatantRow';
import { AddCombatantForm } from './AddCombatantForm';
import { Combatant } from '../types';
import { v4 as uuidv4 } from 'uuid';
import {
  Swords,
  UserPlus,
  FastForward,
  RotateCcw,
  Skull,
  Minimize2,
  Maximize2,
  Trash2,
  X,
  Dices,
  RefreshCw,
  Shield,
  Heart,
  HeartCrack,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onClose: () => void;
  combatants: Combatant[];
  setCombatants: React.Dispatch<React.SetStateAction<Combatant[]>>;
  round: number;
  setRound: React.Dispatch<React.SetStateAction<number>>;
  turnIndex: number;
  setTurnIndex: React.Dispatch<React.SetStateAction<number>>;
  isMinimized: boolean;
  setIsMinimized: (val: boolean) => void;
  tokens?: any[];
  onUpdateToken?: (id: string, updates: any) => void;
  onPanToToken?: (id: string) => void;
  onOpenConditionReference?: (condition: string) => void;
  autoApplyMonsterDamage?: boolean;
  onToggleAutoApplyMonsterDamage?: (enabled: boolean) => void;
  onPromptRollInitiative?: () => void;
}

export const CombatTracker = React.memo(function CombatTracker({
  onClose,
  combatants,
  setCombatants,
  round,
  setRound,
  turnIndex,
  setTurnIndex,
  isMinimized,
  setIsMinimized,
  tokens = [],
  onUpdateToken,
  onPanToToken,
  onOpenConditionReference,
  autoApplyMonsterDamage = true,
  onToggleAutoApplyMonsterDamage,
  onPromptRollInitiative
}: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sorted combatants by initiative descending
  const sortedCombatants = useMemo(() => {
    return [...combatants].sort((a, b) => {
      if (b.initiative !== a.initiative) {
        return b.initiative - a.initiative;
      }
      return a.name.localeCompare(b.name);
    });
  }, [combatants]);

  const activeCombatant = sortedCombatants[turnIndex] || null;

  // Auto-import tokens from the map if tracker is opened empty and tokens exist
  const handleSyncMapTokens = useCallback(() => {
    if (!tokens || tokens.length === 0) {
      toast.info('No tokens on the active battlemap to sync.');
      return;
    }

    setCombatants(prev => {
      const existingTokenIds = new Set(prev.map(c => c.tokenId || c.id));
      const newCombatants: Combatant[] = [];

      for (const t of tokens) {
        if (existingTokenIds.has(t.id)) continue;

        const isMonster = t.isMonster || t.category === 'monster';
        const isNpc = t.category === 'npc';
        const type: 'player' | 'enemy' | 'npc' = isMonster ? 'enemy' : isNpc ? 'npc' : 'player';

        newCombatants.push({
          id: t.id || uuidv4(),
          tokenId: t.id,
          name: t.name || (isMonster ? 'Monster' : 'Character'),
          type,
          initiative: (t as any).initiative || 0,
          maxHp: t.maxHp || t.hp || 10,
          currentHp: t.currentHp ?? t.hp ?? 10,
          ac: t.ac || 10,
          passivePerception: (t as any).passivePerception || 10,
          conditions: t.conditions || [],
          avatarUrl: t.url || t.avatarUrl,
          initiativeBonus: (t as any).initiativeBonus !== undefined ? Number((t as any).initiativeBonus) : 0
        });
      }

      if (newCombatants.length === 0) {
        toast.info('All map tokens are already in the combat tracker.');
        return prev;
      }

      toast.success(`Imported ${newCombatants.length} token(s) from the map!`);
      return [...prev, ...newCombatants];
    });
  }, [tokens, setCombatants]);

  // If combatants is empty on initial load, auto-sync from map tokens
  useEffect(() => {
    if (combatants.length === 0 && tokens && tokens.length > 0) {
      handleSyncMapTokens();
    }
  }, []); // Run once on mount

  // Roll initiative for all combatants
  const handleRollAllInitiatives = () => {
    setCombatants(prev => {
      return prev.map(c => {
        const bonus = typeof c.initiativeBonus === 'number' ? c.initiativeBonus : 0;
        const roll = Math.floor(Math.random() * 20) + 1;
        return {
          ...c,
          initiative: Math.max(1, roll + bonus)
        };
      });
    });
    setTurnIndex(0);
    toast.success('Rolled initiative for all combatants (with bonuses)!');
  };

  // Roll initiative for monsters only
  const handleRollMonsterInitiatives = () => {
    setCombatants(prev => {
      return prev.map(c => {
        if (c.type === 'enemy') {
          const bonus = typeof c.initiativeBonus === 'number' ? c.initiativeBonus : 0;
          const roll = Math.floor(Math.random() * 20) + 1;
          return { ...c, initiative: Math.max(1, roll + bonus) };
        }
        return c;
      });
    });
    toast.success('Rolled initiative for enemies (with bonuses)!');
  };

  const handleNextTurn = () => {
    if (sortedCombatants.length === 0) return;
    if (turnIndex >= sortedCombatants.length - 1) {
      setTurnIndex(0);
      setRound(r => r + 1);
      toast.info(`Advancing to Round ${round + 1}!`);
    } else {
      setTurnIndex(turnIndex + 1);
    }
  };

  const handlePrevTurn = () => {
    if (sortedCombatants.length === 0) return;
    if (turnIndex > 0) {
      setTurnIndex(turnIndex - 1);
    } else if (round > 1) {
      setRound(r => r - 1);
      setTurnIndex(sortedCombatants.length - 1);
    }
  };

  const handleClearTracker = () => {
    setCombatants([]);
    setRound(1);
    setTurnIndex(0);
    setIsConfirmingClear(false);
    toast.info('Combat Tracker reset.');
  };

  const handleAdd = (c: Combatant) => {
    setCombatants(prev => [...prev, c]);
    setShowAddForm(false);
    toast.success(`Added ${c.name} to combat.`);
  };

  const handleUpdate = (id: string, updates: Partial<Combatant>) => {
    setCombatants(prev => prev.map(c => {
      if (c.id === id || c.tokenId === id) {
        const updated = { ...c, ...updates };
        // Sync HP and conditions back to map token if handler exists
        if (onUpdateToken && (c.tokenId || c.id)) {
          const mapTokenId = c.tokenId || c.id;
          const tokenUpdates: any = {};
          if (updates.currentHp !== undefined) tokenUpdates.currentHp = updates.currentHp;
          if (updates.maxHp !== undefined) tokenUpdates.maxHp = updates.maxHp;
          if (updates.ac !== undefined) tokenUpdates.ac = updates.ac;
          if (updates.conditions !== undefined) tokenUpdates.conditions = updates.conditions;
          onUpdateToken(mapTokenId, tokenUpdates);
        }
        return updated;
      }
      return c;
    }));
  };

  const handleRemove = (id: string) => {
    setCombatants(prev => prev.filter(c => c.id !== id && c.tokenId !== id));
    const removedIndex = sortedCombatants.findIndex(c => c.id === id || c.tokenId === id);
    if (removedIndex !== -1 && removedIndex <= turnIndex && turnIndex > 0) {
      setTurnIndex(turnIndex - 1);
    }
  };

  // Keyboard shortcut listener: Spacebar for next turn
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === ' ' || e.code === 'Space') {
        if (!isMinimized && sortedCombatants.length > 0) {
          e.preventDefault();
          handleNextTurn();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sortedCombatants, turnIndex, round, isMinimized]);

  // On Deck combatants preview
  const onDeck = useMemo(() => {
    if (sortedCombatants.length <= 1) return [];
    const nextIdx = (turnIndex + 1) % sortedCombatants.length;
    return [sortedCombatants[nextIdx]];
  }, [sortedCombatants, turnIndex]);

  const enemiesRemaining = useMemo(() => {
    return combatants.filter(c => c.type === 'enemy' && c.currentHp > 0).length;
  }, [combatants]);

  // Minimized Floating Widget
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-6 fade-in duration-300 pointer-events-auto select-none">
        <div className="bg-zinc-950/95 border border-amber-500/50 shadow-[0_8px_30px_rgba(245,158,11,0.25)] rounded-2xl p-3 flex items-center gap-4 backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-zinc-900 border border-amber-500/40 rounded-xl flex items-center justify-center relative shadow-inner">
              <Swords className="w-4 h-4 text-amber-400" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-amber-400">
                ROUND {round} • TURN {turnIndex + 1}/{sortedCombatants.length || 1}
              </span>
              <span className="text-xs font-bold text-zinc-100 truncate max-w-[130px]">
                {activeCombatant ? activeCombatant.name : 'No Entities'}
              </span>
            </div>
          </div>

          <div className="w-px h-7 bg-zinc-800" />

          <div className="flex items-center gap-1.5">
            {sortedCombatants.length > 0 && (
              <button
                onClick={handleNextTurn}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all cursor-pointer"
                title="Next Turn (Spacebar)"
              >
                <span>Next</span>
                <FastForward className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1.5 bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all cursor-pointer"
              title="Expand Tracker"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 rounded-xl transition-colors cursor-pointer"
              title="Close Tracker"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Full Floating Tactical Window
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 pointer-events-auto select-none animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[85vh] flex flex-col bg-zinc-950/95 border border-zinc-800/90 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9)] ring-1 ring-white/10 overflow-hidden">
        
        {/* Header Bar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <Swords className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono">
                  Tactical Combat Tracker
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-700/50">
                  ROUND {round}
                </span>
                {enemiesRemaining > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-950 text-red-300 border border-red-800/50 flex items-center gap-1">
                    <Skull className="w-3 h-3" /> {enemiesRemaining} Enemies
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                Automatically tracks initiative, HP, and conditions for map tokens. Synchronized with Player View.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onToggleAutoApplyMonsterDamage && (
              <button
                type="button"
                onClick={() => onToggleAutoApplyMonsterDamage(!autoApplyMonsterDamage)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all border cursor-pointer ${
                  autoApplyMonsterDamage
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-sm'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
                title={autoApplyMonsterDamage ? "Auto Monster Damage: ON (Players hit monster HP directly)" : "Auto Monster Damage: OFF (Manual DM HP control)"}
              >
                <HeartCrack className={`w-3.5 h-3.5 ${autoApplyMonsterDamage ? 'text-rose-400' : 'text-zinc-500'}`} />
                <span>Auto Damage: {autoApplyMonsterDamage ? 'ON' : 'OFF'}</span>
              </button>
            )}
            {onPromptRollInitiative && (
              <button
                type="button"
                onClick={onPromptRollInitiative}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-600/30 to-amber-500/20 border border-amber-500/50 hover:bg-amber-500/30 text-amber-300 hover:text-white rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shadow-sm"
                title="Prompt all connected players to roll initiative"
              >
                <Dices className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>Prompt Players</span>
              </button>
            )}
            <button
              onClick={handleSyncMapTokens}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-mono transition-all cursor-pointer"
              title="Import or update combatants from battlemap tokens"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sync Map Tokens</span>
            </button>
            <button
              onClick={handleRollAllInitiatives}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-mono transition-all cursor-pointer"
              title="Roll d20 initiative for all combatants"
            >
              <Dices className="w-3.5 h-3.5 text-amber-400" />
              <span>Roll All</span>
            </button>
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
              title="Minimize to Corner"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
              title="Close (Escape)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Active Combatant Spotlight Banner */}
        {activeCombatant && (
          <div className="px-6 py-3.5 bg-amber-950/25 border-b border-amber-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-zinc-900 border-2 border-amber-500 flex items-center justify-center shrink-0 shadow-lg shadow-amber-950/40">
                {activeCombatant.avatarUrl ? (
                  <img src={activeCombatant.avatarUrl} alt={activeCombatant.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-lg text-amber-300 font-mono">
                    {activeCombatant.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-700/50">
                    ACTIVE TURN
                  </span>
                  <span className="text-sm font-bold text-white truncate font-mono">
                    {activeCombatant.name}
                  </span>
                  <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded border ${
                    activeCombatant.type === 'player'
                      ? 'text-emerald-300 bg-emerald-950/60 border-emerald-700/60'
                      : activeCombatant.type === 'enemy'
                      ? 'text-rose-300 bg-rose-950/60 border-rose-700/60'
                      : 'text-indigo-300 bg-indigo-950/60 border-indigo-700/60'
                  }`}>
                    {activeCombatant.type.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs font-mono text-zinc-400">
                  <span className="flex items-center gap-1 text-emerald-300">
                    <Heart className="w-3 h-3 text-emerald-400" />
                    HP {activeCombatant.currentHp}/{activeCombatant.maxHp}
                  </span>
                  <span className="flex items-center gap-1 text-sky-300">
                    <Shield className="w-3 h-3 text-sky-400" />
                    AC {activeCombatant.ac}
                  </span>
                  <span className="text-amber-300">
                    Init: {activeCombatant.initiative}
                  </span>
                  {onDeck.length > 0 && (
                    <span className="text-zinc-500 hidden sm:inline">
                      • On Deck: <b className="text-zinc-300">{onDeck[0].name}</b>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Turn Navigation Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handlePrevTurn}
                disabled={turnIndex === 0 && round === 1}
                className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Previous Turn"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextTurn}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider shadow-lg shadow-amber-950/40 transition-all cursor-pointer"
                title="Next Turn (Press Spacebar)"
              >
                <span>Next Turn</span>
                <FastForward className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main Combatant List Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar-orange">
          {showAddForm && (
            <div className="mb-4">
              <AddCombatantForm onAdd={handleAdd} onCancel={() => setShowAddForm(false)} />
            </div>
          )}

          {sortedCombatants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-zinc-800 rounded-3xl text-center bg-zinc-900/20">
              <Swords className="w-12 h-12 text-zinc-600 mb-3" />
              <h3 className="text-base font-bold text-zinc-300 uppercase tracking-widest font-mono">
                No Active Engagement
              </h3>
              <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-6">
                Click below to auto-import all tokens from your battlemap scene, or manually deploy combatants.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSyncMapTokens}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer shadow-lg shadow-emerald-950/50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Import Tokens from Map</span>
                </button>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Entity Manually</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1 px-1 text-xs font-mono text-zinc-500">
                <span>{sortedCombatants.length} COMBATANTS IN INITIATIVE ORDER</span>
                <span className="text-[11px] text-zinc-600">Press Spacebar to advance turn</span>
              </div>

              {sortedCombatants.map((c, i) => (
                <CombatantRow
                  key={c.id}
                  combatant={c}
                  isCurrentTurn={i === turnIndex}
                  onUpdate={handleUpdate}
                  onRemove={handleRemove}
                  onOpenConditionReference={onOpenConditionReference}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <footer className="flex items-center justify-between px-6 py-3 border-t border-zinc-800/80 bg-zinc-900/30 text-xs font-mono">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddForm(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-xl transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Custom Entity</span>
            </button>
            <button
              onClick={handleRollMonsterInitiatives}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-xl transition-all cursor-pointer"
              title="Re-roll only enemies"
            >
              <Dices className="w-3.5 h-3.5 text-rose-400" />
              <span>Roll Enemies</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isConfirmingClear ? (
              <div className="flex items-center gap-2">
                <span className="text-rose-400 text-xs font-bold">Reset combat?</span>
                <button
                  onClick={handleClearTracker}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-xs cursor-pointer"
                >
                  Yes, Clear
                </button>
                <button
                  onClick={() => setIsConfirmingClear(false)}
                  className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsConfirmingClear(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 rounded-xl transition-colors cursor-pointer"
                title="Reset combat tracker"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
});
