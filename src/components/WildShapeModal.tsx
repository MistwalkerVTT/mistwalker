import React, { useState } from 'react';
import {
  PawPrint,
  X,
  Shield,
  Heart,
  Footprints,
  Sparkles,
  Zap,
  Swords,
  ChevronRight,
  Info
} from 'lucide-react';
import { WildShapeBeastForm, GAIAH_WILD_SHAPE_FORMS, ActiveWildShapeState } from '../types/wildShape';

interface WildShapeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectForm: (form: WildShapeBeastForm) => void;
  onRevertForm?: () => void;
  activeWildShape?: ActiveWildShapeState | null;
  druidLevel?: number;
  wisModifier?: number;
}

export const WildShapeModal: React.FC<WildShapeModalProps> = ({
  isOpen,
  onClose,
  onSelectForm,
  onRevertForm,
  activeWildShape,
  druidLevel = 6,
  wisModifier = 4
}) => {
  const [selectedFormId, setSelectedFormId] = useState<string>(
    activeWildShape?.beastFormId || GAIAH_WILD_SHAPE_FORMS[0].id
  );
  const [radiantEnabled, setRadiantEnabled] = useState<boolean>(true);

  if (!isOpen) return null;

  const currentForm =
    GAIAH_WILD_SHAPE_FORMS.find(f => f.id === selectedFormId) || GAIAH_WILD_SHAPE_FORMS[0];
  const calculatedTempHp = druidLevel * 3; // 2024 Circle of the Moon: 3 x Druid Level = 18 Temp HP
  const calculatedAc = Math.max(currentForm.baseAc, 13 + wisModifier); // 13 + WIS (17) or beast native AC

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-zinc-950 border border-emerald-500/50 rounded-2xl shadow-[0_20px_60px_rgba(16,185,129,0.25)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Trim: Emerald Druidic Glow */}
        <div className="h-1 w-full bg-gradient-to-r from-emerald-600 via-lime-400 to-teal-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-inner">
              <PawPrint className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white font-mono flex items-center gap-2">
                  <span>Wild Shape • Circle of the Moon</span>
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[10px] font-mono font-bold">
                  2024 PHB Rules
                </span>
              </div>
              <p className="text-xs font-mono text-zinc-400">
                Bonus Action • Duration: 3 Hours • Max CR: 2 (Swim allowed, No Fly until Lv 8)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Wild Shape Warning / Revert Bar */}
        {activeWildShape && (
          <div className="px-5 py-3 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs font-mono text-amber-300">
              <Info className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                Currently transformed as <strong className="text-amber-200">{activeWildShape.beastName}</strong> (+{activeWildShape.tempHpGranted} Temp HP granted).
              </span>
            </div>
            {onRevertForm && (
              <button
                type="button"
                onClick={() => {
                  onRevertForm();
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-mono text-xs font-bold transition-all cursor-pointer shadow-md shadow-amber-500/30 flex items-center gap-1.5"
              >
                <span>Revert to Wood Elf (Bonus Action)</span>
              </button>
            )}
          </div>
        )}

        {/* Modal Body: Left Forms Grid & Right Form Details */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 min-h-0">
          {/* Left Column: Form Selector (5 cols) */}
          <div className="md:col-span-5 p-4 border-b md:border-b-0 md:border-r border-zinc-800 space-y-2 overflow-y-auto max-h-[55vh] md:max-h-[62vh] sidebar-scrollbar">
            <div className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Known Beast Forms ({GAIAH_WILD_SHAPE_FORMS.length})</span>
              <span className="text-emerald-400 font-bold">Max CR 2</span>
            </div>

            {GAIAH_WILD_SHAPE_FORMS.map(form => {
              const isSelected = form.id === currentForm.id;
              const isCurrentActive = activeWildShape?.beastFormId === form.id;
              return (
                <button
                  key={form.id}
                  type="button"
                  onClick={() => setSelectedFormId(form.id)}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-400/80 shadow-[0_0_15px_rgba(16,185,129,0.25)] ring-1 ring-emerald-400'
                      : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={form.avatarUrl}
                      alt={form.name}
                      className="w-10 h-10 rounded-lg object-cover border border-zinc-700 bg-zinc-950 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white font-mono truncate">{form.name}</span>
                        {isCurrentActive && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-mono font-bold shrink-0">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-400">
                        CR {form.cr} • {form.size} ({form.sizeMultiplier}x{form.sizeMultiplier}) • {form.speed}
                      </div>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 transition-transform ${isSelected ? 'text-emerald-400 translate-x-0.5' : 'text-zinc-600'}`}
                  />
                </button>
              );
            })}
          </div>

          {/* Right Column: Selected Form Stat Block (7 cols) */}
          <div className="md:col-span-7 p-5 flex flex-col justify-between overflow-y-auto max-h-[55vh] md:max-h-[62vh] sidebar-scrollbar space-y-4">
            <div>
              {/* Header: Avatar + Title + Size/CR */}
              <div className="flex items-start gap-4 pb-3 border-b border-zinc-800">
                <img
                  src={currentForm.avatarUrl}
                  alt={currentForm.name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500/60 bg-zinc-950 shadow-md shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-white font-mono">{currentForm.name}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-mono font-bold">
                      CR {currentForm.cr} Beast
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold">
                      Grid Size: {formGridFootprint(currentForm.sizeMultiplier)}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono mt-1 leading-relaxed">
                    {currentForm.description}
                  </p>
                </div>
              </div>

              {/* 2024 Circle of the Moon Upgrades Bar */}
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-center text-center">
                  <div className="text-[10px] font-mono text-zinc-400 uppercase font-bold flex items-center gap-1">
                    <Heart className="w-3 h-3 text-emerald-400" />
                    Temp HP
                  </div>
                  <div className="text-sm font-bold font-mono text-emerald-300 mt-0.5">
                    +{calculatedTempHp} HP
                  </div>
                  <div className="text-[9px] text-zinc-500 font-mono">3x Druid Level</div>
                </div>

                <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-center text-center">
                  <div className="text-[10px] font-mono text-zinc-400 uppercase font-bold flex items-center gap-1">
                    <Shield className="w-3 h-3 text-blue-400" />
                    Moon AC
                  </div>
                  <div className="text-sm font-bold font-mono text-blue-300 mt-0.5">
                    {calculatedAc} AC
                  </div>
                  <div className="text-[9px] text-zinc-500 font-mono">13 + WIS mod</div>
                </div>

                <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-center text-center">
                  <div className="text-[10px] font-mono text-zinc-400 uppercase font-bold flex items-center gap-1">
                    <Footprints className="w-3 h-3 text-amber-400" />
                    Speed
                  </div>
                  <div className="text-sm font-bold font-mono text-amber-300 mt-0.5 truncate max-w-full">
                    {currentForm.speed}
                  </div>
                  <div className="text-[9px] text-zinc-500 font-mono">Beast Mobility</div>
                </div>
              </div>

              {/* Ability Scores Pill Matrix */}
              <div className="grid grid-cols-6 gap-1 mt-2.5 text-center font-mono">
                {Object.entries(currentForm.stats).map(([k, v]) => {
                  const isRetained = ['int', 'wis', 'cha'].includes(k);
                  const mod = Math.floor((v - 10) / 2);
                  const formattedMod = mod >= 0 ? `+${mod}` : `${mod}`;
                  return (
                    <div
                      key={k}
                      className={`p-1.5 rounded-lg border text-xs ${
                        isRetained
                          ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                          : 'bg-zinc-900/80 border-zinc-800 text-zinc-200'
                      }`}
                      title={isRetained ? "Retained from G'aiah's mental scores" : "Inherited from Beast Form"}
                    >
                      <div className="text-[9px] uppercase text-zinc-400 font-bold">{k}</div>
                      <div className="font-bold text-xs">{v}</div>
                      <div className="text-[9px] opacity-75">{formattedMod}</div>
                    </div>
                  );
                })}
              </div>

              {/* Special Traits */}
              {currentForm.traits.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <div className="text-[10px] font-mono uppercase font-bold text-zinc-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Beast Traits & Special Features</span>
                  </div>
                  <div className="space-y-1">
                    {currentForm.traits.map(t => (
                      <div key={t.name} className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs font-mono">
                        <strong className="text-amber-300">{t.name}: </strong>
                        <span className="text-zinc-300">{t.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attacks Available */}
              <div className="mt-3 space-y-1.5">
                <div className="text-[10px] font-mono uppercase font-bold text-zinc-400 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Swords className="w-3 h-3 text-red-400" />
                    <span>Wild Shape Attacks</span>
                  </span>
                  <label className="flex items-center gap-1 text-[10px] font-mono text-amber-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={radiantEnabled}
                      onChange={e => setRadiantEnabled(e.target.checked)}
                      className="accent-amber-400 rounded"
                    />
                    <span>Radiant Strikes (2024 Moon)</span>
                  </label>
                </div>
                <div className="space-y-1.5">
                  {currentForm.attacks.map(atk => (
                    <div
                      key={atk.id}
                      className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white font-mono">{atk.name}</span>
                          <span className="px-1.5 py-0.2 rounded bg-red-950 border border-red-500/40 text-red-300 font-mono text-[9px] font-bold">
                            {atk.hitBonus} to hit
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-amber-950 border border-amber-500/40 text-amber-300 font-mono text-[9px] font-bold">
                            {atk.damageFormula} {radiantEnabled ? 'Radiant' : atk.damageType}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400 mt-0.5 truncate">
                          {atk.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-4 border-t border-zinc-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 font-mono text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectForm(currentForm);
                  onClose();
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono text-xs font-bold transition-all cursor-pointer shadow-lg shadow-emerald-500/30 flex items-center gap-2 active:scale-95"
              >
                <Zap className="w-4 h-4 fill-zinc-950" />
                <span>Transform into {currentForm.name}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function formGridFootprint(multiplier: number): string {
  if (multiplier === 1) return 'Medium (1x1 square)';
  if (multiplier === 2) return 'Large (2x2 squares)';
  if (multiplier === 3) return 'Huge (3x3 squares)';
  return 'Standard';
}
