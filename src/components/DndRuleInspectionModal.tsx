// src/components/DndRuleInspectionModal.tsx
// Rich modal showing full-text descriptions, rules, and stats when right-clicking
// spells, conditions, or magical auras anywhere in the player or DM interface.

import React from 'react';
import { X, Sparkles, BookOpen, AlertCircle, ShieldAlert } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { DndRuleEntry } from '../data/dndRulesCompendium';

interface DndRuleInspectionModalProps {
  entry: DndRuleEntry | null;
  onClose: () => void;
  onActionClick?: (entry: DndRuleEntry) => void;
  actionButtonText?: string;
}

export const DndRuleInspectionModal: React.FC<DndRuleInspectionModalProps> = ({
  entry,
  onClose,
  onActionClick,
  actionButtonText
}) => {
  if (!entry) return null;

  const isSpell = entry.category === 'spell';
  const isCondition = entry.category === 'condition';
  const isAura = entry.category === 'aura';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rule-modal-title"
      className="fixed inset-0 z-[600] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-150 select-none"
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div
        className="w-full max-w-lg bg-zinc-950/95 border border-zinc-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className={`p-4 border-b flex items-start justify-between gap-3 ${
          isCondition 
            ? 'border-rose-900/60 bg-rose-950/30' 
            : isAura 
            ? 'border-indigo-900/60 bg-indigo-950/30' 
            : 'border-amber-900/60 bg-amber-950/30'
        }`}>
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
              isCondition
                ? 'bg-rose-900/40 border-rose-500/50 text-rose-300'
                : isAura
                ? 'bg-indigo-900/40 border-indigo-500/50 text-indigo-300'
                : 'bg-amber-900/40 border-amber-500/50 text-amber-300'
            }`}>
              {isCondition ? (
                <ShieldAlert className="w-5 h-5" />
              ) : isAura ? (
                <Sparkles className="w-5 h-5" />
              ) : (
                <BookOpen className="w-5 h-5" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <h3 id="rule-modal-title" className="text-base sm:text-lg font-bold font-serif text-white tracking-wide truncate">
                {entry.name}
              </h3>
              <span className={`text-[11px] font-mono font-bold tracking-tight ${
                isCondition ? 'text-rose-400' : isAura ? 'text-indigo-400' : 'text-amber-400'
              }`}>
                {entry.subtitle || (isCondition ? 'D&D 5e Status Condition' : isAura ? 'Magical Aura' : 'Spell Description')}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Close (Escape)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Spell Specific Quick Stat Grid (Level, Casting Time, Range, Duration, etc.) */}
        {isSpell && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-zinc-900/50 border-b border-zinc-800/80 text-[11px] font-mono shrink-0">
            <div className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800">
              <span className="text-[9px] uppercase font-bold text-zinc-500 block">Casting Time</span>
              <span className="text-zinc-200 font-bold truncate block">{entry.castingTime || '1 Action'}</span>
            </div>
            <div className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800">
              <span className="text-[9px] uppercase font-bold text-zinc-500 block">Range / Area</span>
              <span className="text-zinc-200 font-bold truncate block">{entry.range || 'Self'}</span>
            </div>
            <div className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800">
              <span className="text-[9px] uppercase font-bold text-zinc-500 block">Components</span>
              <span className="text-zinc-200 font-bold truncate block" title={entry.components || 'V, S'}>
                {entry.components || 'V, S'}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800">
              <span className="text-[9px] uppercase font-bold text-zinc-500 block">Duration</span>
              <span className="text-zinc-200 font-bold truncate block" title={entry.duration || 'Instantaneous'}>
                {entry.duration || 'Instantaneous'}
              </span>
            </div>
          </div>
        )}

        {/* Aura Specific Stats */}
        {isAura && entry.range && (
          <div className="p-2.5 px-4 bg-indigo-950/20 border-b border-indigo-900/40 text-xs font-mono flex items-center justify-between shrink-0">
            <span className="text-indigo-400 font-bold uppercase text-[10px] tracking-wider">Aura Radius:</span>
            <span className="px-2 py-0.5 rounded bg-indigo-900/50 text-indigo-200 border border-indigo-500/40 font-bold">
              {entry.range}
            </span>
          </div>
        )}

        {/* Scrollable Description Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 sidebar-scrollbar space-y-3 text-sm leading-relaxed text-zinc-300 font-sans">
          <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-p:leading-relaxed prose-strong:text-amber-300 prose-ul:my-2 prose-li:my-1 text-zinc-300">
            <ReactMarkdown>
              {entry.description}
            </ReactMarkdown>
          </div>

          {entry.higherLevels && (
            <div className="mt-3 p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs">
              <div className="font-bold text-blue-300 font-mono uppercase mb-1">At Higher Levels</div>
              <p className="text-zinc-300 font-sans leading-relaxed">{entry.higherLevels}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] font-mono text-zinc-500 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Right-click anywhere to inspect rule details.</span>
          </span>
          <div className="flex items-center gap-2">
            {onActionClick && (
              <button
                type="button"
                onClick={() => {
                  onActionClick(entry);
                  onClose();
                }}
                className={`px-4 py-1.5 rounded-xl text-zinc-950 font-bold text-xs font-mono transition-all shadow-md active:scale-95 cursor-pointer ${
                  isCondition
                    ? 'bg-rose-400 hover:bg-rose-300'
                    : isAura
                    ? 'bg-indigo-400 hover:bg-indigo-300'
                    : 'bg-amber-400 hover:bg-amber-300'
                }`}
              >
                {actionButtonText || (isCondition ? 'Toggle Condition' : isAura ? 'Equip Aura' : 'Select Spell')}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs font-mono transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
