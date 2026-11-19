import React from 'react';
import { Check, Map as MapIcon, X } from 'lucide-react';
import { PresetBattlemap } from '../data/presetBattlemaps';

interface ArenaMapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableMaps: PresetBattlemap[];
  selectedMap: PresetBattlemap;
  onSelectMap: (map: PresetBattlemap) => void;
  disabledNote?: string;
}

export const ArenaMapPickerModal: React.FC<ArenaMapPickerModalProps> = ({
  isOpen,
  onClose,
  availableMaps,
  selectedMap,
  onSelectMap,
  disabledNote
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[260] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[82vh] bg-zinc-950 border border-amber-500/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between gap-3 bg-zinc-900/80">
          <div className="flex items-center gap-2.5">
            <MapIcon className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm sm:text-base font-mono font-black text-white">
                Choose Battlemap ({availableMaps.length})
              </h3>
              {disabledNote && (
                <p className="text-[11px] text-amber-300">{disabledNote}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
            aria-label="Close battlemap picker"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {availableMaps.map((map) => {
              const isSel = selectedMap.id === map.id;
              return (
                <button
                  key={map.id}
                  type="button"
                  disabled={Boolean(disabledNote)}
                  onClick={() => {
                    onSelectMap(map);
                    onClose();
                  }}
                  className={`group relative rounded-2xl overflow-hidden border h-28 sm:h-32 text-left transition-all ${
                    disabledNote ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                  } ${
                    isSel
                      ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-lg'
                      : 'border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <img
                    src={map.thumbnailUrl || map.url}
                    alt={map.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent flex items-end justify-between p-2.5 gap-1">
                    <span className="text-xs font-mono font-bold text-white truncate">
                      {map.name}
                    </span>
                    {isSel && (
                      <span className="w-5 h-5 rounded-full bg-amber-400 text-zinc-950 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
