import React, { useState } from 'react';
import { Combatant } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Shield, Heart, Eye, Dices, UserCircle } from 'lucide-react';

interface Props {
  onAdd: (combatant: Combatant) => void;
  onCancel: () => void;
}

export function AddCombatantForm({ onAdd, onCancel }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'player' | 'enemy' | 'npc'>('enemy');
  const [initiative, setInitiative] = useState('');
  const [maxHp, setMaxHp] = useState('');
  const [ac, setAc] = useState('');
  const [passivePerception, setPassivePerception] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !initiative || !maxHp || !ac || !passivePerception) return;

    onAdd({
      id: uuidv4(),
      name,
      type,
      initiative: parseInt(initiative, 10),
      currentHp: parseInt(maxHp, 10),
      maxHp: parseInt(maxHp, 10),
      ac: parseInt(ac, 10),
      passivePerception: parseInt(passivePerception, 10),
      conditions: []
    });
  };

  return (
    <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-6 shadow-[inset_0_2px_20px_rgba(0,0,0,0.5)] backdrop-blur-md relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
      
      <div className="relative z-10">
        <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-widest mb-6 flex items-center gap-2">
          <UserCircle className="w-5 h-5 text-amber-500" />
          Deploy Combatant
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">Name</label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="Goblin Boss"
                required
              />
            </div>
            <div className="w-1/3">
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-amber-500 transition-colors appearance-none"
                required
              >
                <option value="enemy">Enemy</option>
                <option value="player">Player</option>
                <option value="npc">NPC</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-1/4">
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-1 flex items-center gap-1">
                <Dices className="w-3 h-3" /> Init
              </label>
              <input
                type="number"
                value={initiative}
                onChange={e => setInitiative(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono text-zinc-300 focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="18"
                required
              />
            </div>
            <div className="w-1/4">
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-1 flex items-center gap-1">
                <Heart className="w-3 h-3" /> HP
              </label>
              <input
                type="number"
                value={maxHp}
                onChange={e => setMaxHp(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono text-zinc-300 focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="27"
                required
              />
            </div>
            <div className="w-1/4">
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-1 flex items-center gap-1">
                <Shield className="w-3 h-3" /> AC
              </label>
              <input
                type="number"
                value={ac}
                onChange={e => setAc(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono text-zinc-300 focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="15"
                required
              />
            </div>
            <div className="w-1/4">
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-1 flex items-center gap-1">
                <Eye className="w-3 h-3" /> P.Percep
              </label>
              <input
                type="number"
                value={passivePerception}
                onChange={e => setPassivePerception(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono text-zinc-300 focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="12"
                required
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all"
            >
              Inject to Initiative
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
