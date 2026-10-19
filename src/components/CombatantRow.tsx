import React, { useState } from 'react';
import { Combatant, CONDITIONS_LIST } from '../types';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Plus, Minus, X } from 'lucide-react';

interface Props {
  combatant: Combatant;
  isCurrentTurn: boolean;
  onUpdate: (id: string, updates: Partial<Combatant>) => void;
  onRemove: (id: string) => void;
  onOpenConditionReference?: (condition: string) => void;
}

export function CombatantRow({ combatant, isCurrentTurn, onUpdate, onRemove, onOpenConditionReference }: Props) {
  const [hpInput, setHpInput] = useState('');
  const [showConditions, setShowConditions] = useState(false);

  const isDead = combatant.currentHp <= 0;
  const isBloodied = !isDead && combatant.currentHp <= combatant.maxHp / 2;

  const handleHpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hpInput.trim()) return;

    let newHp = combatant.currentHp;
    const value = parseInt(hpInput.replace(/[^0-9+-]/g, ''), 10);

    if (isNaN(value)) {
      setHpInput('');
      return;
    }

    if (hpInput.startsWith('+') || hpInput.startsWith('-')) {
      newHp += value;
    } else {
      newHp = value;
    }

    newHp = Math.max(0, Math.min(newHp, combatant.maxHp));
    
    if (newHp < combatant.currentHp && combatant.conditions.includes('Concentrating')) {
       toast.warning(`${combatant.name} took damage! Roll for Concentration!`);
    }

    onUpdate(combatant.id, { currentHp: newHp });
    setHpInput('');
  };

  const toggleCondition = (condition: string) => {
    const newConditions = combatant.conditions.includes(condition)
      ? combatant.conditions.filter(c => c !== condition)
      : [...combatant.conditions, condition];
    onUpdate(combatant.id, { conditions: newConditions });
  };

  return (
    <div className={cn(
      "relative p-4 rounded-xl border transition-all duration-300",
      isCurrentTurn ? "bg-zinc-900 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]" : "bg-zinc-950 border-zinc-800",
      isDead && "opacity-50 grayscale"
    )}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Roll</span>
            <span className={cn("text-lg font-bold font-mono", isCurrentTurn ? "text-amber-500" : "text-zinc-300")}>
              {combatant.initiative}
            </span>
          </div>

          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn(
                "font-bold text-lg truncate",
                isDead && "line-through text-zinc-500",
                !isDead && "text-zinc-100"
              )}>
                {combatant.name}
              </span>
              <span className={cn(
                "px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase",
                combatant.type === 'player' && "bg-blue-500/10 text-blue-400 border border-blue-500/20",
                combatant.type === 'enemy' && "bg-red-500/10 text-red-400 border border-red-500/20",
                combatant.type === 'npc' && "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              )}>
                {combatant.type}
              </span>
              {isBloodied && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-red-950/50 text-red-500 border border-red-900/50 animate-pulse">
                  Bloodied
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono mt-1">
              <span>AC: <span className="text-zinc-300">{combatant.ac}</span></span>
              <span>PP: <span className="text-zinc-300">{combatant.passivePerception}</span></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="flex flex-col items-end gap-1">
             <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-zinc-500">HP</span>
                <span className={cn(
                  "font-mono font-bold text-lg",
                  isDead ? "text-red-500" : isBloodied ? "text-red-400" : "text-emerald-400"
                )}>
                  {combatant.currentHp} <span className="text-zinc-600 text-sm">/ {combatant.maxHp}</span>
                </span>
             </div>
             <form onSubmit={handleHpSubmit} className="flex relative">
                <input 
                  type="text"
                  placeholder="+5 or -12"
                  value={hpInput}
                  onChange={e => setHpInput(e.target.value)}
                  className="w-24 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-amber-500 font-mono placeholder:text-zinc-700 text-right"
                />
             </form>
          </div>

           <div className="flex flex-col gap-2 relative">
             <button
               onClick={() => setShowConditions(!showConditions)}
               className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 px-2 py-1 rounded transition-colors"
             >
               Conditions ({combatant.conditions.length})
             </button>
             {showConditions && (
               <div className="absolute top-full right-0 mt-1 w-48 bg-zinc-950 border border-zinc-800 rounded-lg p-2 shadow-2xl z-50 max-h-64 overflow-y-auto custom-scrollbar-orange">
                 {CONDITIONS_LIST.map(cond => {
                   const isActive = combatant.conditions.includes(cond);
                   return (
                     <button
                       key={cond}
                       onClick={() => toggleCondition(cond)}
                       className={cn(
                         "w-full text-left px-2 py-1 text-xs rounded transition-colors",
                         isActive ? "bg-amber-500/20 text-amber-500 font-bold" : "text-zinc-400 hover:bg-zinc-900"
                       )}
                     >
                       {cond}
                     </button>
                   )
                 })}
               </div>
             )}
             
            <button 
              onClick={() => onRemove(combatant.id)}
              className="text-zinc-600 hover:text-red-500 transition-colors self-end mt-1"
              title="Remove Combatant"
            >
              <X className="w-4 h-4" />
            </button>
           </div>
        </div>
      </div>
      
      {combatant.conditions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
           {combatant.conditions.map(c => (
             <span key={c} className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-[10px] uppercase tracking-wider text-amber-500/70 font-bold flex items-center gap-1.5">
               <button
                 type="button"
                 onClick={() => onOpenConditionReference?.(c)}
                 className="hover:text-amber-400 hover:underline cursor-pointer"
                 title={`View 5e SRD rule for ${c}`}
               >
                 {c}
               </button>
               <button onClick={() => toggleCondition(c)} className="hover:text-red-400 text-zinc-500">
                 <X className="w-3 h-3" />
               </button>
             </span>
           ))}
        </div>
      )}
    </div>
  );
}
