import React, { useState, useMemo, useEffect } from 'react';
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
  Info,
  ArrowLeftRight,
  Check,
  Plus,
  RotateCcw,
  Lock,
  Search,
  BookOpen,
  Table2,
  Eye
} from 'lucide-react';
import {
  WildShapeBeastForm,
  GAIAH_WILD_SHAPE_FORMS,
  ActiveWildShapeState,
  DEFAULT_GAIAH_KNOWN_FORM_IDS,
  loadKnownWildShapeFormIds,
  saveKnownWildShapeFormIds,
  computeMoonDruidProgression,
  isBeastFormEligibleForLevel,
  MOON_DRUID_PROGRESSION_MATRIX
} from '../types/wildShape';

interface WildShapeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectForm: (form: WildShapeBeastForm, effectiveDruidLevel?: number) => void;
  onRevertForm?: () => void;
  activeWildShape?: ActiveWildShapeState | null;
  druidLevel?: number;
  wisModifier?: number;
}

type ModalTab = 'known' | 'catalog' | 'matrix';

export const WildShapeModal: React.FC<WildShapeModalProps> = ({
  isOpen,
  onClose,
  onSelectForm,
  onRevertForm,
  activeWildShape,
  druidLevel = 6,
  wisModifier = 4
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('known');
  const [knownFormIds, setKnownFormIds] = useState<string[]>(() => loadKnownWildShapeFormIds());
  const [effectiveLevel, setEffectiveLevel] = useState<number>(druidLevel || 6);
  const [selectedFormId, setSelectedFormId] = useState<string>(
    activeWildShape?.beastFormId || DEFAULT_GAIAH_KNOWN_FORM_IDS[0]
  );
  const [radiantEnabled, setRadiantEnabled] = useState<boolean>(true);
  const [crFilter, setCrFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showLockedForms, setShowLockedForms] = useState<boolean>(true);
  const [pendingSwapInFormId, setPendingSwapInFormId] = useState<string | null>(null);

  useEffect(() => {
    if (druidLevel && druidLevel >= 2) {
      setEffectiveLevel(druidLevel);
    }
  }, [druidLevel]);

  const progression = useMemo(
    () => computeMoonDruidProgression(effectiveLevel, wisModifier),
    [effectiveLevel, wisModifier]
  );

  const knownForms = useMemo(() => {
    const resolved = knownFormIds
      .map(id => GAIAH_WILD_SHAPE_FORMS.find(f => f.id === id))
      .filter((f): f is WildShapeBeastForm => Boolean(f));
    return resolved.length > 0 ? resolved : GAIAH_WILD_SHAPE_FORMS.slice(0, 6);
  }, [knownFormIds]);

  const currentForm = useMemo(() => {
    return (
      GAIAH_WILD_SHAPE_FORMS.find(f => f.id === selectedFormId) ||
      knownForms[0] ||
      GAIAH_WILD_SHAPE_FORMS[0]
    );
  }, [selectedFormId, knownForms]);

  const filteredCatalogForms = useMemo(() => {
    return GAIAH_WILD_SHAPE_FORMS.filter(form => {
      if (crFilter !== 'all') {
        if (crFilter === '3+' && form.crNum < 3) return false;
        if (crFilter !== '3+' && form.cr !== crFilter) return false;
      }
      if (!showLockedForms) {
        const { eligible } = isBeastFormEligibleForLevel(form, effectiveLevel);
        if (!eligible) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = form.name.toLowerCase().includes(q);
        const matchRole = (form.tacticalRole || '').toLowerCase().includes(q);
        const matchDesc = form.description.toLowerCase().includes(q);
        const matchSpeed = form.speed.toLowerCase().includes(q);
        if (!matchName && !matchRole && !matchDesc && !matchSpeed) return false;
      }
      return true;
    }).sort((a, b) => a.crNum - b.crNum || a.name.localeCompare(b.name));
  }, [crFilter, showLockedForms, effectiveLevel, searchQuery]);

  if (!isOpen) return null;

  const calculatedTempHp = progression.tempHP;
  const calculatedAc = Math.max(currentForm.baseAc, progression.minAC);
  const isCurrentFormKnown = knownFormIds.includes(currentForm.id);
  const currentFormEligibility = isBeastFormEligibleForLevel(currentForm, effectiveLevel);
  const isAtKnownLimit = knownFormIds.length >= progression.knownFormsLimit;

  const updateKnownForms = (nextIds: string[]) => {
    setKnownFormIds(nextIds);
    saveKnownWildShapeFormIds(nextIds);
  };

  const handleToggleKnownForm = (form: WildShapeBeastForm) => {
    if (knownFormIds.includes(form.id)) {
      if (knownFormIds.length <= 1) return; // Always keep at least 1 known form
      const next = knownFormIds.filter(id => id !== form.id);
      updateKnownForms(next);
      setPendingSwapInFormId(null);
    } else {
      if (knownFormIds.length < progression.knownFormsLimit) {
        updateKnownForms([...knownFormIds, form.id]);
        setPendingSwapInFormId(null);
      } else {
        // Prompt which existing known form to swap out
        setPendingSwapInFormId(form.id);
        setSelectedFormId(form.id);
      }
    }
  };

  const handleReplaceKnownForm = (oldFormId: string, newFormId: string) => {
    const next = knownFormIds.map(id => (id === oldFormId ? newFormId : id));
    updateKnownForms(next);
    setPendingSwapInFormId(null);
    setSelectedFormId(newFormId);
  };

  const handleResetDefaultKnownForms = () => {
    updateKnownForms([...DEFAULT_GAIAH_KNOWN_FORM_IDS]);
    setPendingSwapInFormId(null);
    setSelectedFormId(DEFAULT_GAIAH_KNOWN_FORM_IDS[0]);
  };

  const pendingSwapForm = pendingSwapInFormId
    ? GAIAH_WILD_SHAPE_FORMS.find(f => f.id === pendingSwapInFormId)
    : null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[94vh] flex flex-col bg-zinc-950 border border-emerald-500/50 rounded-2xl shadow-[0_20px_60px_rgba(16,185,129,0.25)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Trim: Emerald Druidic Glow */}
        <div className="h-1 w-full bg-gradient-to-r from-emerald-600 via-lime-400 to-teal-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/90 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-inner shrink-0">
              <PawPrint className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white font-mono flex items-center gap-2">
                  <span>G&apos;aiah • Wild Shape (Circle of the Moon)</span>
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[10px] font-mono font-bold">
                  2024 PHB Rules
                </span>
              </div>
              <p className="text-[11px] font-mono text-zinc-400">
                Druid Lv {effectiveLevel} • Max CR {progression.maxCRLabel} • Known Forms: {knownFormIds.length}/{progression.knownFormsLimit} • {progression.usesPerRest}/Rest (+{calculatedTempHp} Temp HP, Min AC {progression.minAC})
              </p>
            </div>
          </div>

          {/* Right Header Controls: Druid Level Selector + Close */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono">
              <span className="text-zinc-400 text-[10px] uppercase font-bold">Druid Lvl:</span>
              <select
                value={effectiveLevel}
                onChange={e => setEffectiveLevel(Number(e.target.value))}
                className="bg-zinc-950 text-emerald-300 font-bold px-1.5 py-0.5 rounded border border-zinc-700 focus:outline-none focus:border-emerald-500 text-xs cursor-pointer"
                title="Adjust G'aiah's Druid Level to preview or unlock higher CR & Flying forms"
              >
                {MOON_DRUID_PROGRESSION_MATRIX.map(row => (
                  <option key={row.level} value={row.level}>
                    Lv {row.level} (Max CR {row.maxCRLabel}{row.flyAllowed ? ', Fly' : ''})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Sub-Bar: Known Forms | Swap Beast Catalog | 2024 Progression Matrix */}
        <div className="px-4 sm:px-5 py-2 bg-zinc-900/50 border-b border-zinc-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setActiveTab('known');
                setPendingSwapInFormId(null);
              }}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                activeTab === 'known'
                  ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                  : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <PawPrint className="w-3.5 h-3.5" />
              <span>Known Animals ({knownFormIds.length}/{progression.knownFormsLimit})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('catalog')}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                activeTab === 'catalog'
                  ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-zinc-900 text-amber-300 border-amber-500/30 hover:bg-amber-950/40'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Swap Animals • Beast Catalog ({GAIAH_WILD_SHAPE_FORMS.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                activeTab === 'matrix'
                  ? 'bg-teal-500 text-zinc-950 border-teal-400 shadow-md shadow-teal-500/20'
                  : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              <span>Moon Progression Matrix</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'catalog' && (
              <button
                type="button"
                onClick={handleResetDefaultKnownForms}
                className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 font-mono text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                title="Reset Known Forms to G'aiah's 6 signature custom-art animals"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Default 6</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Wild Shape Warning / Revert Bar */}
        {activeWildShape && (
          <div className="px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between flex-wrap gap-2">
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
                <span>Transform Back to Wood Elf</span>
              </button>
            )}
          </div>
        )}

        {/* Inline Swap Replacement Prompt Bar when Known Forms are full (e.g. 6/6) */}
        {pendingSwapForm && (
          <div className="px-4 sm:px-5 py-3 bg-emerald-950/60 border-b border-emerald-500/50 flex flex-col gap-2 animate-fade-in">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-mono text-emerald-200 flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Swap <strong className="text-white">{pendingSwapForm.name} (CR {pendingSwapForm.cr})</strong> into your Known Animals — click which current animal to replace:
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPendingSwapInFormId(null)}
                className="text-[11px] font-mono text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 cursor-pointer"
              >
                Cancel Swap
              </button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {knownForms.map(kf => (
                <button
                  key={kf.id}
                  type="button"
                  onClick={() => handleReplaceKnownForm(kf.id, pendingSwapForm.id)}
                  className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-amber-500 hover:text-zinc-950 text-zinc-200 border border-zinc-700 hover:border-amber-400 font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer group"
                >
                  <img
                    src={kf.avatarUrl}
                    alt={kf.name}
                    className="w-5 h-5 rounded object-cover border border-zinc-600"
                  />
                  <span>Replace {kf.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: MOON DRUID PROGRESSION MATRIX VIEW */}
        {activeTab === 'matrix' ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 sidebar-scrollbar">
            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <h3 className="text-sm font-bold font-mono text-emerald-300 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>2024 Circle of the Moon Wild Shape Rules Engine</span>
                </h3>
                <p className="text-xs font-mono text-zinc-300">
                  Max Beast CR = <code className="text-emerald-300">⌊Druid Level / 3⌋</code> • Temp HP = <code className="text-emerald-300">3 × Druid Level</code> • Moon AC = <code className="text-emerald-300">max(Beast AC, 13 + WIS)</code> (17 AC) • Retains full speech &amp; spell concentration.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('known')}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono text-xs font-bold cursor-pointer"
              >
                Back to Wild Shape
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="bg-zinc-900 border-b border-zinc-800 text-[10px] uppercase text-zinc-400">
                    <th className="py-2.5 px-3">Druid Lvl</th>
                    <th className="py-2.5 px-3">Max CR</th>
                    <th className="py-2.5 px-3">Known Forms</th>
                    <th className="py-2.5 px-3">Uses / Rest</th>
                    <th className="py-2.5 px-3">Temp HP</th>
                    <th className="py-2.5 px-3">Min AC</th>
                    <th className="py-2.5 px-3">Movement Unlocked</th>
                    <th className="py-2.5 px-3">Unlocked Features &amp; Moon Scaling</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {MOON_DRUID_PROGRESSION_MATRIX.map(row => {
                    const isCurrent = row.level === effectiveLevel;
                    return (
                      <tr
                        key={row.level}
                        onClick={() => setEffectiveLevel(row.level)}
                        className={`transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-emerald-950/50 text-emerald-200 font-bold'
                            : 'bg-zinc-950/60 hover:bg-zinc-900/70 text-zinc-300'
                        }`}
                      >
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <span>Lv {row.level}</span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500 text-zinc-950 text-[9px] font-bold">
                                CURRENT
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-amber-300 font-bold">CR {row.maxCRLabel}</td>
                        <td className="py-2 px-3">{row.knownForms} Forms</td>
                        <td className="py-2 px-3">{row.uses} / rest</td>
                        <td className="py-2 px-3 text-emerald-400">+{row.tempHP} THP</td>
                        <td className="py-2 px-3 text-blue-300">{row.minAC} AC</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              row.flyAllowed
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                : 'bg-zinc-800 text-zinc-300'
                            }`}
                          >
                            {row.movement}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-[11px] text-zinc-300">{row.features}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* TAB 1 & TAB 2: KNOWN ANIMALS / MASTER BEAST CATALOG + STAT BLOCK */
          <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 min-h-0">
            {/* Left Column: Form Selector (5 cols) */}
            <div className="md:col-span-5 p-4 border-b md:border-b-0 md:border-r border-zinc-800 flex flex-col max-h-[54vh] md:max-h-[64vh]">
              {activeTab === 'known' ? (
                <>
                  <div className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center justify-between gap-2">
                    <span>
                      Known Beast Forms ({knownForms.length}/{progression.knownFormsLimit})
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('catalog')}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                      <span>Swap Animals</span>
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 sidebar-scrollbar">
                    {knownForms.map(form => {
                      const isSelected = form.id === currentForm.id;
                      const isCurrentActive = activeWildShape?.beastFormId === form.id;
                      const eligibility = isBeastFormEligibleForLevel(form, effectiveLevel);

                      return (
                        <div
                          key={form.id}
                          onClick={() => setSelectedFormId(form.id)}
                          className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
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
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-white font-mono truncate">
                                  {form.name}
                                </span>
                                {isCurrentActive && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-mono font-bold shrink-0">
                                    ACTIVE
                                  </span>
                                )}
                                {!eligibility.eligible && (
                                  <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[9px] font-mono font-bold shrink-0">
                                    {eligibility.reason}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] font-mono text-zinc-400 truncate">
                                CR {form.cr} • {form.size} ({form.sizeMultiplier}x{form.sizeMultiplier}) • {form.speed}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                setActiveTab('catalog');
                              }}
                              title="Swap this animal with another from the Master Beast Catalog"
                              className="px-2 py-1 rounded-lg bg-zinc-800/80 hover:bg-amber-500/20 text-zinc-400 hover:text-amber-300 border border-zinc-700/80 hover:border-amber-500/40 text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <ArrowLeftRight className="w-3 h-3" />
                              <span className="hidden sm:inline">Swap</span>
                            </button>
                            <ChevronRight
                              className={`w-4 h-4 transition-transform ${
                                isSelected ? 'text-emerald-400 translate-x-0.5' : 'text-zinc-600'
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                /* CATALOG / SWAP ANIMALS MODE */
                <>
                  {/* Search & Filter Controls */}
                  <div className="space-y-2 mb-2.5">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search 36 beasts by name, speed, or trait..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-xs font-mono text-white placeholder:text-zinc-500 focus:outline-none"
                      />
                    </div>

                    {/* CR Filter Pills */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {['all', '0', '1/4', '1/2', '1', '2', '3+'].map(cr => (
                        <button
                          key={cr}
                          type="button"
                          onClick={() => setCrFilter(cr)}
                          className={`px-2 py-0.5 rounded-lg font-mono text-[10px] font-bold cursor-pointer border transition-all ${
                            crFilter === cr
                              ? 'bg-amber-500 text-zinc-950 border-amber-400'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                          }`}
                        >
                          {cr === 'all' ? 'All CR' : `CR ${cr}`}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => setShowLockedForms(v => !v)}
                        className={`ml-auto px-2 py-0.5 rounded-lg font-mono text-[10px] cursor-pointer border flex items-center gap-1 ${
                          showLockedForms
                            ? 'bg-zinc-900 text-zinc-300 border-zinc-700'
                            : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                        }`}
                        title="Toggle showing higher-level / flying beasts"
                      >
                        <Eye className="w-3 h-3" />
                        <span>{showLockedForms ? 'All Levels' : `Lv ${effectiveLevel} Eligible`}</span>
                      </button>
                    </div>
                  </div>

                  {/* Catalog Beast List */}
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 sidebar-scrollbar">
                    {filteredCatalogForms.map(form => {
                      const isSelected = form.id === currentForm.id;
                      const isKnown = knownFormIds.includes(form.id);
                      const eligibility = isBeastFormEligibleForLevel(form, effectiveLevel);

                      return (
                        <div
                          key={form.id}
                          onClick={() => setSelectedFormId(form.id)}
                          className={`w-full p-2 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-950/40 border-emerald-400/80 ring-1 ring-emerald-400'
                              : isKnown
                              ? 'bg-emerald-950/15 border-emerald-500/40 hover:bg-emerald-950/25'
                              : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={form.avatarUrl}
                              alt={form.name}
                              className="w-9 h-9 rounded-lg object-cover border border-zinc-700 bg-zinc-950 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-white font-mono truncate">
                                  {form.name}
                                </span>
                                <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 text-[9px] font-mono font-bold">
                                  CR {form.cr}
                                </span>
                                {isKnown && (
                                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-mono font-bold">
                                    KNOWN
                                  </span>
                                )}
                                {!eligibility.eligible && (
                                  <span className="px-1.5 py-0.2 rounded bg-zinc-800/90 text-amber-300/90 text-[9px] font-mono flex items-center gap-0.5">
                                    <Lock className="w-2.5 h-2.5" />
                                    <span>Lv {form.minLevel}</span>
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] font-mono text-zinc-400 truncate">
                                {form.size} ({form.sizeMultiplier}x{form.sizeMultiplier}) • {form.speed}
                              </div>
                            </div>
                          </div>

                          {/* Swap / Add / Remove Button */}
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleToggleKnownForm(form);
                            }}
                            className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold shrink-0 flex items-center gap-1 cursor-pointer transition-all border ${
                              isKnown
                                ? 'bg-emerald-500/20 hover:bg-rose-500/20 text-emerald-300 hover:text-rose-300 border-emerald-500/40 hover:border-rose-500/40'
                                : isAtKnownLimit
                                ? 'bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-zinc-950 border-amber-500/50'
                                : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 border-emerald-400'
                            }`}
                            title={
                              isKnown
                                ? 'Click to remove from Known Animals'
                                : isAtKnownLimit
                                ? 'Click to swap this animal with one of your current Known Animals'
                                : 'Add to Known Animals'
                            }
                          >
                            {isKnown ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Known</span>
                              </>
                            ) : isAtKnownLimit ? (
                              <>
                                <ArrowLeftRight className="w-3 h-3" />
                                <span>Swap In</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                <span>Add</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Right Column: Selected Form Stat Block (7 cols) */}
            <div className="md:col-span-7 p-5 flex flex-col justify-between overflow-y-auto max-h-[54vh] md:max-h-[64vh] sidebar-scrollbar space-y-4">
              <div>
                {/* Header: Avatar + Title + Size/CR + Known Toggle */}
                <div className="flex items-start justify-between gap-4 pb-3 border-b border-zinc-800 flex-wrap">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
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
                          {formGridFootprint(currentForm.size, currentForm.sizeMultiplier)}
                        </span>
                        {!currentFormEligibility.eligible && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-950 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            <span>{currentFormEligibility.reason}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 font-mono mt-1 leading-relaxed">
                        {currentForm.description}
                      </p>
                      {currentForm.tacticalRole && (
                        <div className="text-[11px] font-mono text-emerald-300/90 mt-1">
                          <strong>Tactical Role:</strong> {currentForm.tacticalRole}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Add / Swap / Remove Known Button in Stat Header */}
                  <button
                    type="button"
                    onClick={() => handleToggleKnownForm(currentForm)}
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border shrink-0 ${
                      isCurrentFormKnown
                        ? 'bg-emerald-950/60 hover:bg-rose-950/60 text-emerald-300 hover:text-rose-300 border-emerald-500/50 hover:border-rose-500/50'
                        : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/20'
                    }`}
                  >
                    {isCurrentFormKnown ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>In Known Animals (Remove)</span>
                      </>
                    ) : isAtKnownLimit ? (
                      <>
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        <span>Swap Into Known Animals</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add to Known Animals</span>
                      </>
                    )}
                  </button>
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
                    <div className="text-[9px] text-zinc-500 font-mono">
                      3× Druid Lv ({effectiveLevel})
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-center text-center">
                    <div className="text-[10px] font-mono text-zinc-400 uppercase font-bold flex items-center gap-1">
                      <Shield className="w-3 h-3 text-blue-400" />
                      Moon AC
                    </div>
                    <div className="text-sm font-bold font-mono text-blue-300 mt-0.5">
                      {calculatedAc} AC
                    </div>
                    <div className="text-[9px] text-zinc-500 font-mono">
                      max(Beast {currentForm.baseAc}, 13+WIS)
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-center text-center">
                    <div className="text-[10px] font-mono text-zinc-400 uppercase font-bold flex items-center gap-1">
                      <Footprints className="w-3 h-3 text-amber-400" />
                      Speed &amp; Senses
                    </div>
                    <div className="text-xs font-bold font-mono text-amber-300 mt-0.5 truncate max-w-full">
                      {currentForm.speed}
                    </div>
                    <div className="text-[9px] text-zinc-500 font-mono truncate max-w-full">
                      {currentForm.senses || 'Standard Senses'}
                    </div>
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
                        title={
                          isRetained
                            ? "Retained from G'aiah's mental scores"
                            : 'Inherited from Beast Form'
                        }
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
                      <span>Beast Traits &amp; Special Features</span>
                    </div>
                    <div className="space-y-1">
                      {currentForm.traits.map(t => (
                        <div
                          key={t.name}
                          className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs font-mono"
                        >
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
                      <span>Radiant Strikes (Lv 6+ Moon)</span>
                    </label>
                  </div>
                  <div className="space-y-1.5">
                    {currentForm.attacks.map(atk => (
                      <div
                        key={atk.id}
                        className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-white font-mono">
                              {atk.name}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-red-950 border border-red-500/40 text-red-300 font-mono text-[9px] font-bold">
                              {atk.hitBonus} to hit
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-amber-950 border border-amber-500/40 text-amber-300 font-mono text-[9px] font-bold">
                              {atk.damageFormula} {radiantEnabled ? 'Radiant' : atk.damageType}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                            {atk.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Actions Bar */}
              <div className="pt-4 border-t border-zinc-800 flex items-center justify-between gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 font-mono text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  {!isCurrentFormKnown && (
                    <button
                      type="button"
                      onClick={() => handleToggleKnownForm(currentForm)}
                      className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                      <span>{isAtKnownLimit ? 'Swap Into Known' : 'Add to Known'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onSelectForm(currentForm, effectiveLevel);
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
        )}
      </div>
    </div>
  );
};

function formGridFootprint(sizeLabel: string, multiplier: number): string {
  return `${sizeLabel} (${multiplier}x${multiplier})`;
}
