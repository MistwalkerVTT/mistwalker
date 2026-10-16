import React, { useState, useMemo } from 'react';
import { CombatantRow } from './CombatantRow';
import { AddCombatantForm } from './AddCombatantForm';
import { Combatant } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Swords, UserPlus, Play, FastForward, Skull, Minimize2, Maximize2, Trash2 } from 'lucide-react';

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
}

export function CombatTracker({ 
  onClose, 
  combatants, 
  setCombatants, 
  round, 
  setRound, 
  turnIndex, 
  setTurnIndex,
  isMinimized,
  setIsMinimized
}: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  const sortedCombatants = useMemo(() => {
    return [...combatants].sort((a, b) => {
      // Primary sort by initiative descending
      if (b.initiative !== a.initiative) {
        return b.initiative - a.initiative;
      }
      // Secondary sort to keep relative order stable if same initiative
      return 0;
    });
  }, [combatants]);

  const activeCombatant = sortedCombatants[turnIndex];

  const handleNextTurn = () => {
    if (combatants.length === 0) return;
    
    if (turnIndex >= sortedCombatants.length - 1) {
      setTurnIndex(0);
      setRound(r => r + 1);
    } else {
      setTurnIndex(turnIndex + 1);
    }
  };

  const handleClearTracker = () => {
    setCombatants([]);
    setRound(1);
    setTurnIndex(0);
    setIsConfirmingClear(false);
  };

  const handleAdd = (c: Combatant) => {
    setCombatants(prev => [...prev, c]);
    setShowAddForm(false);
  };

  const handleUpdate = (id: string, updates: Partial<Combatant>) => {
    setCombatants(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleRemove = (id: string) => {
    setCombatants(prev => prev.filter(c => c.id !== id));
    // Adjust turn index if we removed someone before or at current turn
    const removedIndex = sortedCombatants.findIndex(c => c.id === id);
    if (removedIndex !== -1 && removedIndex <= turnIndex) {
      if (turnIndex > 0) {
        setTurnIndex(turnIndex - 1);
      }
    }
  };

  const loadDemo = () => {
    setCombatants([
      { id: uuidv4(), name: 'Thief Rogue', type: 'player', initiative: 22, maxHp: 18, currentHp: 18, ac: 15, passivePerception: 14, conditions: [] },
      { id: uuidv4(), name: 'Goblin Boss', type: 'enemy', initiative: 18, maxHp: 27, currentHp: 27, ac: 17, passivePerception: 9, conditions: [] },
      { id: uuidv4(), name: 'Goblin Scrapper (A)', type: 'enemy', initiative: 14, maxHp: 7, currentHp: 7, ac: 15, passivePerception: 9, conditions: [] },
      { id: uuidv4(), name: 'Cleric', type: 'player', initiative: 12, maxHp: 22, currentHp: 22, ac: 18, passivePerception: 13, conditions: ['Concentrating'] },
      { id: uuidv4(), name: 'Goblin Bowman (B)', type: 'enemy', initiative: 10, maxHp: 7, currentHp: 7, ac: 13, passivePerception: 9, conditions: [] },
    ]);
    setRound(1);
    setTurnIndex(0);
  };

  const enemiesRemaining = combatants.filter(c => c.type === 'enemy' && c.currentHp > 0).length;

  const onDeck = useMemo(() => {
    if (sortedCombatants.length === 0) return [];
    let d = [];
    for (let i = 1; i <= 2; i++) {
       const idx = (turnIndex + i) % sortedCombatants.length;
       if (idx !== turnIndex) {
         d.push(sortedCombatants[idx]);
       }
    }
    return d.slice(0, 2);
  }, [sortedCombatants, turnIndex]);

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-8 fade-in duration-300">
        <div className="bg-zinc-950/90 border border-amber-500/50 shadow-[0_4px_20px_rgba(245,158,11,0.2)] rounded-2xl p-4 flex items-center gap-6 backdrop-blur-xl">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center relative shadow-inner">
                <Swords className="w-5 h-5 text-amber-500" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
             </div>
             <div className="flex flex-col">
               <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">Combat Active</span>
               <span className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                 R {round} <span className="text-zinc-700">|</span> {activeCombatant ? activeCombatant.name : 'No Entities'}
               </span>
             </div>
           </div>
           
           <div className="w-px h-8 bg-zinc-800"></div>

           <div className="flex items-center gap-2">
             <button
               onClick={() => setIsMinimized(false)}
               className="p-2 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-800 hover:text-emerald-400 text-zinc-400 rounded-lg transition-all"
               title="Maximize"
             >
               <Maximize2 className="w-4 h-4" />
             </button>
             {combatants.length > 0 && (
               <button
                 onClick={handleNextTurn}
                 className="flex items-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all"
               >
                 Next <FastForward className="w-3 h-3" />
               </button>
             )}
             <button
               onClick={onClose}
               className="p-2 ml-1 text-zinc-600 hover:text-red-500 hover:bg-zinc-900 rounded-lg transition-colors"
               title="Close Tracker"
             >
               <Skull className="w-4 h-4" />
             </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex bg-zinc-950/95 backdrop-blur-xl text-zinc-300 font-sans custom-scrollbar-orange overflow-hidden animate-in fade-in duration-300">
      <div className="flex-1 max-w-5xl mx-auto h-full flex flex-col pt-8 pb-4 px-4 w-full relative">
        <div className="absolute top-4 right-4 flex gap-4">
          <button onClick={() => setIsMinimized(true)} className="text-zinc-500 hover:text-amber-500 transition-colors p-2 flex items-center gap-2 text-sm font-bold">
            <Minimize2 className="w-4 h-4" /> Minimize
          </button>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-2 flex items-center gap-2 text-sm">
            Close (Esc)
          </button>
        </div>

        <header className="flex items-center justify-between mb-8 shrink-0">
           <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center p-2 shadow-inner">
               <img src="https://api.dicebear.com/7.x/bottts-neutral/svg?seed=DM" alt="DM Avatar" className="w-full h-full opacity-80" />
             </div>
             <div>
               <h1 className="text-2xl font-bold text-zinc-100 uppercase tracking-widest flex items-center gap-2">
                 <Swords className="w-6 h-6 text-amber-500" />
                 Combat Engine
               </h1>
               <div className="text-xs text-zinc-500 font-mono flex items-center gap-4 mt-1">
                 <span>ROUND: <span className="text-amber-500">{round}</span></span>
                 <span>|</span>
                 <span className="flex items-center gap-1"><Skull className="w-3 h-3 text-red-500" /> THREAT: {enemiesRemaining} ACTIVE</span>
               </div>
             </div>
           </div>
           
           <div className="flex items-center gap-3 mt-4 sm:mt-0">
             {combatants.length > 0 && (
               isConfirmingClear ? (
                 <div className="flex items-center gap-2 bg-red-950/40 border border-red-500/50 rounded-xl p-1 animate-in fade-in zoom-in-95 duration-200">
                   <button
                     onClick={handleClearTracker}
                     className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
                   >
                     Confirm Clear
                   </button>
                   <button
                     onClick={() => setIsConfirmingClear(false)}
                     className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
                   >
                     Cancel
                   </button>
                 </div>
               ) : (
                 <button
                   onClick={() => setIsConfirmingClear(true)}
                   className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-red-500/50 hover:bg-zinc-800 hover:text-red-400 text-zinc-500 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                   title="Clear Tracker"
                 >
                   <Trash2 className="w-4 h-4" /> 
                 </button>
               )
             )}
             <button
               onClick={() => setShowAddForm(!showAddForm)}
               className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-800 text-zinc-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
               >
               <UserPlus className="w-4 h-4" /> Add Entity
             </button>
             {combatants.length > 0 && (
               <button
                 onClick={handleNextTurn}
                 className="flex items-center gap-2 px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all"
               >
                 Take Turn <FastForward className="w-4 h-4" />
               </button>
             )}
           </div>
        </header>

        <div className="flex gap-8 flex-1 overflow-hidden pb-8">
           <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar-orange relative">
              {showAddForm && (
                <div className="mb-4">
                   <AddCombatantForm onAdd={handleAdd} onCancel={() => setShowAddForm(false)} />
                </div>
              )}

              {combatants.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 border border-dashed border-zinc-800 rounded-3xl text-center">
                   <Swords className="w-12 h-12 text-zinc-700 mb-4" />
                   <h3 className="text-lg font-bold text-zinc-400 uppercase tracking-widest mb-2">No Active Engagement</h3>
                   <p className="text-sm text-zinc-600 max-w-sm mb-6">Deploy entities to the battlefield manually or initialize a combat preset.</p>
                   <button onClick={loadDemo} className="flex items-center gap-2 px-4 py-2 bg-emerald-600/10 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-600/20 rounded-lg text-xs uppercase tracking-wider font-bold transition-colors">
                     <Play className="w-3 h-3" /> Load Goblin Ambush (Demo)
                   </button>
                </div>
              ) : (
                <div className="space-y-3 pb-8">
                   {sortedCombatants.map((c, i) => (
                     <CombatantRow
                       key={c.id}
                       combatant={c}
                       isCurrentTurn={i === turnIndex}
                       onUpdate={handleUpdate}
                       onRemove={handleRemove}
                     />
                   ))}
                </div>
              )}
           </div>

           {/* Tactical Sidebar */}
           {sortedCombatants.length > 0 && (
             <aside className="w-72 shrink-0 flex flex-col gap-6">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
                   <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Tactical Feed</h3>
                   {activeCombatant && (
                     <div className="mb-6">
                        <span className="text-[10px] text-emerald-500 font-mono tracking-widest block mb-1">ACTIVE ENTITY</span>
                        <div className="text-lg font-bold text-white truncate">{activeCombatant.name}</div>
                     </div>
                   )}
                   
                   <div>
                      <span className="text-[10px] text-zinc-500 font-mono tracking-widest block mb-3">ON DECK</span>
                      <div className="space-y-3">
                         {onDeck.map((c, i) => (
                           <div key={i} className="flex items-center gap-3 p-2 bg-zinc-950 border border-zinc-800/50 rounded-lg">
                             <div className="text-xs font-mono text-zinc-500">{c.initiative}</div>
                             <div className="text-sm font-bold text-zinc-300 truncate">{c.name}</div>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
             </aside>
           )}
        </div>
      </div>
    </div>
  );
}
