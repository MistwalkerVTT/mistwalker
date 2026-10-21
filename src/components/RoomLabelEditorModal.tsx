import React, { useState, useEffect, useRef } from 'react';
import {
  Tag,
  X,
  Check,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  ArrowUp,
  ArrowDown,
  DoorOpen,
  Key,
  AlertTriangle,
  Compass
} from 'lucide-react';
import { RoomAnnotation } from '../types';

export interface RoomLabelEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAnnotation?: RoomAnnotation | null;
  position?: { x: number; y: number } | null; // percentage on map
  clickPosition?: { x: number; y: number } | null; // percentage on map
  onSave: (annotation: RoomAnnotation) => void;
  onDelete?: (id: string) => void;
}

const PRESET_CHIPS = [
  { label: 'Stairs up to...', icon: 'stairs-up', color: '#f59e0b' },
  { label: 'Stairs down to...', icon: 'stairs-down', color: '#f59e0b' },
  { label: 'Ladder down to...', icon: 'ladder', color: '#10b981' },
  { label: 'Ladder up to...', icon: 'ladder', color: '#10b981' },
  { label: 'Trapdoor to...', icon: 'trapdoor', color: '#f97316' },
  { label: 'Portal to...', icon: 'portal', color: '#8b5cf6' },
  { label: 'Secret passage to...', icon: 'secret', color: '#ec4899' },
  { label: 'To Upper Level', icon: 'arrow-up', color: '#0ea5e9' },
  { label: 'To Lower Level', icon: 'arrow-down', color: '#0ea5e9' },
  { label: 'Exit to...', icon: 'door', color: '#14b8a6' }
];

const ICONS_LIST = [
  { id: 'stairs-up', label: 'Stairs Up', glyph: '⤊' },
  { id: 'stairs-down', label: 'Stairs Down', glyph: '⤋' },
  { id: 'ladder', label: 'Ladder', glyph: '🪜' },
  { id: 'trapdoor', label: 'Trapdoor', glyph: '🚪' },
  { id: 'portal', label: 'Portal', glyph: '🌀' },
  { id: 'secret', label: 'Secret Door', glyph: '🗝️' },
  { id: 'arrow-up', label: 'Up Arrow', glyph: '⬆' },
  { id: 'arrow-down', label: 'Down Arrow', glyph: '⬇' },
  { id: 'door', label: 'Door / Exit', glyph: '🚪' },
  { id: 'tag', label: 'Sign / Tag', glyph: '🏷️' },
  { id: 'warning', label: 'Hazard', glyph: '⚠️' }
];

const COLOR_PALETTE = [
  { hex: '#f59e0b', name: 'Amber' },
  { hex: '#10b981', name: 'Emerald' },
  { hex: '#0ea5e9', name: 'Sky Blue' },
  { hex: '#8b5cf6', name: 'Arcane Purple' },
  { hex: '#ec4899', name: 'Pink' },
  { hex: '#f43f5e', name: 'Rose Hazard' },
  { hex: '#14b8a6', name: 'Teal' },
  { hex: '#e2e8f0', name: 'White' }
];

export const RoomLabelEditorModal: React.FC<RoomLabelEditorModalProps> = ({
  isOpen,
  onClose,
  initialAnnotation,
  position,
  clickPosition,
  onSave,
  onDelete
}) => {
  const [labelText, setLabelText] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('stairs-up');
  const [selectedColor, setSelectedColor] = useState('#f59e0b');
  const [visibleToPlayers, setVisibleToPlayers] = useState(true);
  const [dmNotes, setDmNotes] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialAnnotation) {
        setLabelText(initialAnnotation.label || '');
        setSelectedIcon(initialAnnotation.icon || 'stairs-up');
        setSelectedColor(initialAnnotation.color || '#f59e0b');
        setVisibleToPlayers(initialAnnotation.visibleToPlayers !== false);
        setDmNotes(initialAnnotation.dmNotes || '');
      } else {
        setLabelText('Stairs up to ');
        setSelectedIcon('stairs-up');
        setSelectedColor('#f59e0b');
        setVisibleToPlayers(true);
        setDmNotes('');
      }
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen, initialAnnotation]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!labelText.trim()) return;
    const now = Date.now();
    const targetPos = clickPosition || position;
    const pctX = typeof initialAnnotation?.bounds?.x === 'number' && !isNaN(initialAnnotation.bounds.x)
      ? initialAnnotation.bounds.x
      : (typeof targetPos?.x === 'number' && !isNaN(targetPos.x) ? targetPos.x : 50);
    const pctY = typeof initialAnnotation?.bounds?.y === 'number' && !isNaN(initialAnnotation.bounds.y)
      ? initialAnnotation.bounds.y
      : (typeof targetPos?.y === 'number' && !isNaN(targetPos.y) ? targetPos.y : 50);

    const completeAnnotation: RoomAnnotation = {
      ...(initialAnnotation || {}),
      id: initialAnnotation?.id || `label_${now}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'label',
      label: labelText.trim(),
      roomName: labelText.trim(),
      icon: selectedIcon,
      color: selectedColor,
      visibleToPlayers,
      bounds: {
        x: pctX,
        y: pctY,
        width: initialAnnotation?.bounds?.width || 8,
        height: initialAnnotation?.bounds?.height || 4
      },
      boxedText: initialAnnotation?.boxedText || '',
      dmNotes: dmNotes.trim(),
      createdAt: initialAnnotation?.createdAt || now,
      updatedAt: now
    };
    onSave(completeAnnotation);
    onClose();
  };

  const handleApplyPreset = (preset: typeof PRESET_CHIPS[0]) => {
    setLabelText(preset.label);
    setSelectedIcon(preset.icon);
    setSelectedColor(preset.color);
    if (inputRef.current) {
      inputRef.current.focus();
      // Move cursor to end of text
      const len = preset.label.length;
      inputRef.current.setSelectionRange(len, len);
    }
  };

  const activeGlyph = ICONS_LIST.find(i => i.id === selectedIcon)?.glyph || '🏷️';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 pointer-events-auto">
      <div
        className="w-full max-w-md bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl shadow-black/90 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center border font-bold text-sm shadow-sm"
              style={{
                backgroundColor: `${selectedColor}25`,
                borderColor: selectedColor,
                color: selectedColor
              }}
            >
              {activeGlyph}
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100 font-mono tracking-wide">
                {initialAnnotation ? 'Edit Map Label' : 'Place Map Label'}
              </h2>
              <p className="text-[10px] text-zinc-400">
                Tactical room transition &amp; point of interest marker
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {/* Quick Presets */}
          <div>
            <label className="block text-[10px] uppercase font-bold font-mono text-zinc-400 mb-1.5">
              Quick Suggestions
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(chip)}
                  className="px-2 py-1 rounded-md text-[11px] font-medium bg-zinc-800/90 hover:bg-zinc-750 text-zinc-300 hover:text-white border border-zinc-700/60 hover:border-amber-500/50 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                >
                  <span className="text-[10px]">{ICONS_LIST.find(i => i.id === chip.icon)?.glyph || '•'}</span>
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Label Text Input */}
          <div>
            <label className="block text-[10px] uppercase font-bold font-mono text-zinc-300 mb-1">
              Label Text <span className="text-rose-400">*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={labelText}
              onChange={(e) => setLabelText(e.target.value)}
              placeholder="e.g. Stairs up to Level 2, Ladder down to Crypt"
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-sm font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
              required
            />
          </div>

          {/* Live Preview Pill */}
          <div>
            <label className="block text-[10px] uppercase font-bold font-mono text-zinc-400 mb-1.5">
              Canvas Preview
            </label>
            <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 flex items-center justify-center">
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border text-xs font-bold shadow-md transition-all"
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.94)',
                  borderColor: selectedColor,
                  boxShadow: `0 0 10px ${selectedColor}40`
                }}
              >
                <span className="text-sm">{activeGlyph}</span>
                <span className="text-white font-sans">{labelText || 'Label Text'}</span>
                {visibleToPlayers && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" title="Visible to players" />
                )}
              </div>
            </div>
          </div>

          {/* Icon Selector */}
          <div>
            <label className="block text-[10px] uppercase font-bold font-mono text-zinc-400 mb-1.5">
              Icon Symbol
            </label>
            <div className="grid grid-cols-6 gap-1.5">
              {ICONS_LIST.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedIcon(item.id)}
                  className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-0.5 text-xs transition-all cursor-pointer ${
                    selectedIcon === item.id
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-sm'
                      : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                  title={item.label}
                >
                  <span className="text-base">{item.glyph}</span>
                  <span className="text-[9px] truncate max-w-full font-mono">{item.id.replace('-', ' ')}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color Accent */}
          <div>
            <label className="block text-[10px] uppercase font-bold font-mono text-zinc-400 mb-1.5">
              Color Accent
            </label>
            <div className="flex items-center gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setSelectedColor(c.hex)}
                  className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                    selectedColor === c.hex ? 'scale-125 border-white shadow-md' : 'border-transparent hover:scale-110 opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Player Visibility Switch */}
          <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {visibleToPlayers ? (
                <Eye className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <EyeOff className="w-4 h-4 text-zinc-500 shrink-0" />
              )}
              <div>
                <span className="text-xs font-bold text-zinc-200 block">
                  {visibleToPlayers ? 'Visible to Players' : 'DM Only (Hidden from Players)'}
                </span>
                <span className="text-[10px] text-zinc-400">
                  {visibleToPlayers
                    ? 'Connected player screens will display this label over the map.'
                    : 'Only you (the DM) can see this label.'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setVisibleToPlayers(!visibleToPlayers)}
              className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                visibleToPlayers ? 'bg-emerald-600' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  visibleToPlayers ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Optional DM Notes */}
          <div>
            <label className="block text-[10px] uppercase font-bold font-mono text-zinc-400 mb-1">
              DM Notes (Secret to DM)
            </label>
            <textarea
              value={dmNotes}
              onChange={(e) => setDmNotes(e.target.value)}
              placeholder="e.g. Destination room, Athletics DC to climb, secret trap triggers..."
              rows={2}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-2">
            {initialAnnotation && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(initialAnnotation.id);
                  onClose();
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-750 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-950 bg-amber-400 hover:bg-amber-300 shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{initialAnnotation ? 'Save Changes' : 'Place Label'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoomLabelEditorModal;
