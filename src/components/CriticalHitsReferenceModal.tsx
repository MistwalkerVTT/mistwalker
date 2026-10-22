import React, { useState, useMemo } from 'react';
import {
  X,
  Swords,
  Dices,
  Skull,
  Brain,
  ShieldAlert,
  Flame,
  Zap,
  Droplets,
  Snowflake,
  Sparkles,
  Volume2,
  Biohazard,
  Crosshair,
  Search,
  BookOpen,
  Info,
  HeartCrack,
  RotateCcw
} from 'lucide-react';
import {
  CRITICAL_HIT_DAMAGE_CHARTS,
  MINOR_INJURY_CHART,
  MAJOR_INJURY_CHART,
  INSANITY_CHART,
  CRITICAL_HITS_RULES_SUMMARY,
  DamageTypeCategory
} from '../data/criticalHitsTables';

interface CriticalHitsReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDamageType?: DamageTypeCategory;
  onRoll3dDice?: (diceEvent: any) => void;
}

type ActiveTab = 'damage' | 'injuries' | 'insanities' | 'rules';

const DAMAGE_TYPE_ICONS: Record<DamageTypeCategory, React.ElementType> = {
  bludgeoning: ShieldAlert,
  piercing: Crosshair,
  slashing: Swords,
  acid: Droplets,
  cold: Snowflake,
  fire: Flame,
  force: Sparkles,
  lightning: Zap,
  necrotic: Skull,
  poison: Biohazard,
  psychic: Brain,
  radiant: Sparkles,
  thunder: Volume2
};

export const CriticalHitsReferenceModal: React.FC<CriticalHitsReferenceModalProps> = ({
  isOpen,
  onClose,
  initialDamageType = 'slashing',
  onRoll3dDice
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('damage');
  const [selectedDamageType, setSelectedDamageType] = useState<DamageTypeCategory>(initialDamageType);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Interactive Roller States
  const [rolledDamageResult, setRolledDamageResult] = useState<{
    roll: number;
    title: string;
    effect: string;
    damageType: string;
  } | null>(null);

  const [rolledInjuryResult, setRolledInjuryResult] = useState<{
    type: 'minor' | 'major';
    roll: number;
    title: string;
    effect: string;
  } | null>(null);

  const [rolledInsanityResult, setRolledInsanityResult] = useState<{
    roll: number;
    title: string;
    effect: string;
  } | null>(null);

  const activeChart = useMemo(() => {
    return CRITICAL_HIT_DAMAGE_CHARTS[selectedDamageType];
  }, [selectedDamageType]);

  // Handle direct d20 interactive roll for current damage chart
  const handleRollDamageCrit = () => {
    const d20 = Math.floor(Math.random() * 20) + 1;
    const match = activeChart.outcomes.find(o => d20 >= o.range[0] && d20 <= o.range[1]);

    if (match) {
      setRolledDamageResult({
        roll: d20,
        title: match.title,
        effect: match.effect,
        damageType: activeChart.name
      });
    }

    if (onRoll3dDice) {
      onRoll3dDice({
        id: `crit-dmg-${Date.now()}`,
        characterName: 'Critical Hits Table',
        action: `${activeChart.name} Critical Hit`,
        rollType: 'roll',
        formula: `1d20 (${d20})`,
        diceNotation: '1d20',
        dice: [{ sides: 20, result: d20, type: 'd20' }],
        total: d20,
        isCritical: d20 === 20,
        isFumble: d20 === 1,
        theme: 'crimson',
        themeColor: '#ef4444',
        timestamp: Date.now(),
        source: 'dm'
      });
    }
  };

  const handleRollInjury = (type: 'minor' | 'major') => {
    const d20 = Math.floor(Math.random() * 20) + 1;
    const chart = type === 'minor' ? MINOR_INJURY_CHART : MAJOR_INJURY_CHART;
    const match = chart.find(o => d20 >= o.range[0] && d20 <= o.range[1]);

    if (match) {
      setRolledInjuryResult({
        type,
        roll: d20,
        title: match.title,
        effect: match.effect
      });
    }

    if (onRoll3dDice) {
      onRoll3dDice({
        id: `crit-inj-${Date.now()}`,
        characterName: 'Injury Table',
        action: `${type === 'minor' ? 'Minor' : 'Major'} Injury`,
        rollType: 'roll',
        formula: `1d20 (${d20})`,
        diceNotation: '1d20',
        dice: [{ sides: 20, result: d20, type: 'd20' }],
        total: d20,
        isCritical: d20 === 20,
        isFumble: d20 === 1,
        theme: type === 'minor' ? 'amber_gold' : 'crimson',
        themeColor: type === 'minor' ? '#f59e0b' : '#ef4444',
        timestamp: Date.now(),
        source: 'dm'
      });
    }
  };

  const handleRollInsanity = () => {
    const d20 = Math.floor(Math.random() * 20) + 1;
    const match = INSANITY_CHART.find(o => o.d20 === d20);

    if (match) {
      setRolledInsanityResult({
        roll: d20,
        title: match.title,
        effect: match.effect
      });
    }

    if (onRoll3dDice) {
      onRoll3dDice({
        id: `crit-ins-${Date.now()}`,
        characterName: 'Insanity Table',
        action: 'Psychic Insanity',
        rollType: 'roll',
        formula: `1d20 (${d20})`,
        diceNotation: '1d20',
        dice: [{ sides: 20, result: d20, type: 'd20' }],
        total: d20,
        isCritical: d20 === 20,
        isFumble: d20 === 1,
        theme: 'amethyst',
        themeColor: '#ec4899',
        timestamp: Date.now(),
        source: 'dm'
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-amber-500/40 rounded-2xl w-full max-w-5xl h-[92vh] max-h-[950px] shadow-2xl flex flex-col overflow-hidden text-zinc-100 ring-1 ring-amber-500/20">
        
        {/* Top Header Bar */}
        <div className="px-5 py-4 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center shadow-md shadow-red-950/40 border border-amber-400/40 shrink-0">
              <Swords className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-mono tracking-tight text-white">
                  Critical Hits Revisited
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  DM Reference
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                5e Damage-Type Specific Outcomes, Lingering Injuries & Madness
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-700/60 transition-colors cursor-pointer"
              title="Close Reference (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs & Search */}
        <div className="px-5 py-2.5 bg-zinc-900/40 border-b border-zinc-800 flex items-center justify-between gap-4 flex-wrap shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('damage')}
              className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'damage'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20 font-extrabold'
                  : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Damage Types (13)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('injuries')}
              className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'injuries'
                  ? 'bg-rose-500 text-zinc-950 shadow-md shadow-rose-500/20 font-extrabold'
                  : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              <HeartCrack className="w-3.5 h-3.5 text-rose-400" />
              <span>Minor & Major Injuries</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('insanities')}
              className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'insanities'
                  ? 'bg-pink-500 text-zinc-950 shadow-md shadow-pink-500/20 font-extrabold'
                  : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              <Brain className="w-3.5 h-3.5 text-pink-400" />
              <span>Insanity Chart (Psychic)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rules')}
              className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'rules'
                  ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20 font-extrabold'
                  : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>Rules & Restorations</span>
            </button>
          </div>

          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search table text..."
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500/60 rounded-xl pl-8 pr-3 py-1 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-6">
          
          {/* ========================================================= */}
          {/* TAB 1: DAMAGE TYPES                                       */}
          {/* ========================================================= */}
          {activeTab === 'damage' && (
            <div className="space-y-5">
              
              {/* Damage Type Selector Pills */}
              <div className="flex items-center gap-1.5 flex-wrap pb-1">
                {(Object.keys(CRITICAL_HIT_DAMAGE_CHARTS) as DamageTypeCategory[]).map(typeKey => {
                  const chart = CRITICAL_HIT_DAMAGE_CHARTS[typeKey];
                  const Icon = DAMAGE_TYPE_ICONS[typeKey];
                  const isSelected = selectedDamageType === typeKey;

                  return (
                    <button
                      key={typeKey}
                      type="button"
                      onClick={() => {
                        setSelectedDamageType(typeKey);
                        setRolledDamageResult(null);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                        isSelected
                          ? `${chart.accentClass} ring-1 ring-current font-extrabold shadow-sm`
                          : 'bg-zinc-900 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: chart.color }} />
                      <span>{chart.name}</span>
                      {chart.category === 'weapon' && (
                        <span className="text-[9px] text-zinc-500 uppercase tracking-tighter">WPN</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Active Chart Banner + Quick D20 Roller */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold font-mono text-white flex items-center gap-2">
                      {React.createElement(DAMAGE_TYPE_ICONS[selectedDamageType], {
                        className: 'w-5 h-5',
                        style: { color: activeChart.color }
                      })}
                      {activeChart.name} Critical Hits Table
                    </span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                      {activeChart.category === 'weapon' ? 'Physical Weapon' : 'Magical Damage'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 max-w-2xl">
                    {activeChart.description}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleRollDamageCrit}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-zinc-950 font-mono font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                    title="Roll 1d20 on this damage chart"
                  >
                    <Dices className="w-4 h-4 text-zinc-950 animate-pulse" />
                    <span>Roll 1d20 ({activeChart.name})</span>
                  </button>
                </div>
              </div>

              {/* Interactive Roll Result Banner */}
              {rolledDamageResult && (
                <div className="p-4 rounded-xl bg-amber-500/15 border-2 border-amber-500/70 text-zinc-100 animate-in slide-in-from-top-2 duration-200 shadow-xl flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-zinc-950 font-mono font-extrabold text-xs">
                        d20: {rolledDamageResult.roll}
                      </span>
                      <span className="font-mono font-bold text-amber-300 text-sm">
                        {rolledDamageResult.title}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-200 leading-relaxed font-sans">
                      {rolledDamageResult.effect}
                    </p>
                  </div>

                  <button
                    onClick={() => setRolledDamageResult(null)}
                    className="text-zinc-400 hover:text-white p-1"
                    title="Dismiss roll"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Table of Outcomes */}
              <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-950/80 shadow-inner">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-900 border-b border-zinc-800 text-[11px] font-mono uppercase text-zinc-400 tracking-wider">
                      <th className="py-3 px-4 w-20 text-center font-bold">d20</th>
                      <th className="py-3 px-4 w-48 font-bold">Title</th>
                      <th className="py-3 px-4 font-bold">Critical Effect Details</th>
                      <th className="py-3 px-4 w-36 text-center font-bold">Secondary Roll</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 text-xs">
                    {activeChart.outcomes
                      .filter(o =>
                        !searchQuery ||
                        o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        o.effect.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((outcome, idx) => {
                        const isMatch = rolledDamageResult &&
                          rolledDamageResult.roll >= outcome.range[0] &&
                          rolledDamageResult.roll <= outcome.range[1];

                        const rangeLabel = outcome.range[0] === outcome.range[1]
                          ? `${outcome.range[0]}`
                          : `${outcome.range[0]}–${outcome.range[1]}`;

                        return (
                          <tr
                            key={idx}
                            className={`transition-colors hover:bg-zinc-900/60 ${
                              isMatch ? 'bg-amber-500/15 ring-1 ring-amber-500/50' : idx % 2 === 0 ? 'bg-transparent' : 'bg-zinc-900/20'
                            }`}
                          >
                            <td className="py-3 px-4 font-mono font-bold text-center text-amber-400/90 whitespace-nowrap">
                              {rangeLabel}
                            </td>
                            <td className="py-3 px-4 font-bold font-mono text-zinc-200">
                              {outcome.title}
                            </td>
                            <td className="py-3 px-4 text-zinc-300 leading-relaxed font-sans">
                              {outcome.effect}
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              {outcome.injuryChart === 'minor' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveTab('injuries');
                                    handleRollInjury('minor');
                                  }}
                                  className="px-2 py-0.5 rounded-lg bg-yellow-500/15 hover:bg-yellow-500/25 border border-yellow-500/40 text-yellow-300 text-[10px] font-mono font-bold cursor-pointer transition-all"
                                >
                                  Roll Minor Injury
                                </button>
                              )}
                              {outcome.injuryChart === 'major' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveTab('injuries');
                                    handleRollInjury('major');
                                  }}
                                  className="px-2 py-0.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-[10px] font-mono font-bold cursor-pointer transition-all"
                                >
                                  Roll Major Injury
                                </button>
                              )}
                              {outcome.injuryChart === 'both' && (
                                <div className="flex items-center gap-1 justify-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveTab('injuries');
                                      handleRollInjury('minor');
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-yellow-500/15 border border-yellow-500/40 text-yellow-300 text-[9px] font-mono font-bold cursor-pointer"
                                  >
                                    Minor
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveTab('injuries');
                                      handleRollInjury('major');
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/40 text-rose-300 text-[9px] font-mono font-bold cursor-pointer"
                                  >
                                    Major
                                  </button>
                                </div>
                              )}
                              {outcome.injuryChart === 'insanity' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveTab('insanities');
                                    handleRollInsanity();
                                  }}
                                  className="px-2 py-0.5 rounded-lg bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/40 text-pink-300 text-[10px] font-mono font-bold cursor-pointer transition-all"
                                >
                                  Roll Insanity
                                </button>
                              )}
                              {!outcome.injuryChart && (
                                <span className="text-zinc-600 font-mono text-[10px]">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: MINOR & MAJOR INJURIES                             */}
          {/* ========================================================= */}
          {activeTab === 'injuries' && (
            <div className="space-y-6">
              
              {/* Header & Quick Action Buttons */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <h3 className="text-base font-bold font-mono text-white flex items-center gap-2">
                    <HeartCrack className="w-5 h-5 text-rose-400" />
                    Minor & Major Injury Tables
                  </h3>
                  <p className="text-xs text-zinc-400 max-w-2xl">
                    Lingering physical trauma triggered by severe critical results. Minor injuries heal via <span className="text-amber-300 font-mono">Lesser Restoration</span> or downtime recuperation. Major injuries do not heal naturally and require <span className="text-rose-400 font-mono">Greater Restoration</span>.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRollInjury('minor')}
                    className="px-3.5 py-2 rounded-xl bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-yellow-300 font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  >
                    <Dices className="w-3.5 h-3.5" />
                    <span>Roll Minor (1d20)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRollInjury('major')}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  >
                    <Skull className="w-3.5 h-3.5" />
                    <span>Roll Major (1d20)</span>
                  </button>
                </div>
              </div>

              {/* Rolled Injury Display Banner */}
              {rolledInjuryResult && (
                <div className={`p-4 rounded-xl border-2 animate-in slide-in-from-top-2 duration-200 shadow-xl flex items-start justify-between gap-4 ${
                  rolledInjuryResult.type === 'minor'
                    ? 'bg-yellow-500/15 border-yellow-500/70 text-yellow-100'
                    : 'bg-rose-500/15 border-rose-500/70 text-rose-100'
                }`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-lg font-mono font-extrabold text-xs ${
                        rolledInjuryResult.type === 'minor' ? 'bg-yellow-500 text-zinc-950' : 'bg-rose-500 text-zinc-950'
                      }`}>
                        {rolledInjuryResult.type.toUpperCase()} INJURY: d20 = {rolledInjuryResult.roll}
                      </span>
                      <span className="font-mono font-bold text-white text-sm">
                        {rolledInjuryResult.title}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-200 leading-relaxed font-sans">
                      {rolledInjuryResult.effect}
                    </p>
                  </div>

                  <button
                    onClick={() => setRolledInjuryResult(null)}
                    className="text-zinc-400 hover:text-white p-1"
                    title="Dismiss roll"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Two Column Grid for Minor vs Major */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Minor Injuries Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-yellow-400" />
                      Minor Injuries (Lesser Restoration)
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">Heals naturally via downtime</span>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-950/80">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-900/90 border-b border-zinc-800 text-[10px] font-mono uppercase text-zinc-400">
                          <th className="py-2.5 px-3 w-16 text-center font-bold">d20</th>
                          <th className="py-2.5 px-3 w-36 font-bold">Injury</th>
                          <th className="py-2.5 px-3 font-bold">Effect</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900">
                        {MINOR_INJURY_CHART.map((item, idx) => {
                          const rangeLabel = item.range[0] === item.range[1] ? `${item.range[0]}` : `${item.range[0]}–${item.range[1]}`;
                          const isMatch = rolledInjuryResult && rolledInjuryResult.type === 'minor' &&
                            rolledInjuryResult.roll >= item.range[0] && rolledInjuryResult.roll <= item.range[1];

                          return (
                            <tr key={idx} className={`hover:bg-zinc-900/40 ${isMatch ? 'bg-yellow-500/15 ring-1 ring-yellow-500/40' : ''}`}>
                              <td className="py-2.5 px-3 font-mono font-bold text-center text-yellow-400/90 whitespace-nowrap">
                                {rangeLabel}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-zinc-200 whitespace-nowrap">
                                {item.title}
                              </td>
                              <td className="py-2.5 px-3 text-zinc-300 leading-snug">
                                {item.effect}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Major Injuries Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      Major Injuries (Greater Restoration)
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">Requires magic or resurrection</span>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-950/80">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-900/90 border-b border-zinc-800 text-[10px] font-mono uppercase text-zinc-400">
                          <th className="py-2.5 px-3 w-16 text-center font-bold">d20</th>
                          <th className="py-2.5 px-3 w-36 font-bold">Injury</th>
                          <th className="py-2.5 px-3 font-bold">Effect</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900">
                        {MAJOR_INJURY_CHART.map((item, idx) => {
                          const rangeLabel = item.range[0] === item.range[1] ? `${item.range[0]}` : `${item.range[0]}–${item.range[1]}`;
                          const isMatch = rolledInjuryResult && rolledInjuryResult.type === 'major' &&
                            rolledInjuryResult.roll >= item.range[0] && rolledInjuryResult.roll <= item.range[1];

                          return (
                            <tr key={idx} className={`hover:bg-zinc-900/40 ${isMatch ? 'bg-rose-500/15 ring-1 ring-rose-500/40' : ''}`}>
                              <td className="py-2.5 px-3 font-mono font-bold text-center text-rose-400/90 whitespace-nowrap">
                                {rangeLabel}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-zinc-200 whitespace-nowrap">
                                {item.title}
                              </td>
                              <td className="py-2.5 px-3 text-zinc-300 leading-snug">
                                {item.effect}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: INSANITY CHART (PSYCHIC DAMAGE)                     */}
          {/* ========================================================= */}
          {activeTab === 'insanities' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <h3 className="text-base font-bold font-mono text-white flex items-center gap-2">
                    <Brain className="w-5 h-5 text-pink-400" />
                    Psychic Damage Insanity Chart
                  </h3>
                  <p className="text-xs text-zinc-400 max-w-2xl">
                    Mental afflictions triggered by devastating psychic critical hits. Each affliction persists until healed with <span className="text-pink-300 font-mono">Greater Restoration</span>.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleRollInsanity}
                    className="px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-mono font-bold text-xs shadow-lg shadow-pink-600/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                    title="Roll 1d20 on Insanity Chart"
                  >
                    <Brain className="w-4 h-4 text-white animate-pulse" />
                    <span>Roll Insanity (1d20)</span>
                  </button>
                </div>
              </div>

              {/* Rolled Insanity Result Banner */}
              {rolledInsanityResult && (
                <div className="p-4 rounded-xl bg-pink-500/15 border-2 border-pink-500/70 text-pink-100 animate-in slide-in-from-top-2 duration-200 shadow-xl flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-pink-500 text-zinc-950 font-mono font-extrabold text-xs">
                        INSANITY: d20 = {rolledInsanityResult.roll}
                      </span>
                      <span className="font-mono font-bold text-white text-sm">
                        {rolledInsanityResult.title}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-200 leading-relaxed font-sans">
                      {rolledInsanityResult.effect}
                    </p>
                  </div>

                  <button
                    onClick={() => setRolledInsanityResult(null)}
                    className="text-zinc-400 hover:text-white p-1"
                    title="Dismiss roll"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Insanities List Table */}
              <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-950/80">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-900/90 border-b border-zinc-800 text-[10px] font-mono uppercase text-zinc-400">
                      <th className="py-3 px-4 w-16 text-center font-bold">d20</th>
                      <th className="py-3 px-4 w-44 font-bold">Insanity</th>
                      <th className="py-3 px-4 font-bold">Symptoms & Mechanical Effect</th>
                      <th className="py-3 px-4 w-28 text-center font-bold">Saving Throw</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {INSANITY_CHART.filter(item =>
                      !searchQuery ||
                      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      item.effect.toLowerCase().includes(searchQuery.toLowerCase())
                    ).map((item, idx) => {
                      const isMatch = rolledInsanityResult && rolledInsanityResult.roll === item.d20;

                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-zinc-900/40 transition-colors ${
                            isMatch ? 'bg-pink-500/15 ring-1 ring-pink-500/40' : idx % 2 === 0 ? 'bg-transparent' : 'bg-zinc-900/20'
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-center text-pink-400 whitespace-nowrap">
                            {item.d20}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-zinc-200 whitespace-nowrap">
                            {item.title}
                          </td>
                          <td className="py-3 px-4 text-zinc-300 leading-relaxed font-sans">
                            {item.effect}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap font-mono text-[11px]">
                            {item.dc ? (
                              <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-amber-300 font-bold">
                                DC {item.dc} {item.stat?.slice(0, 3).toUpperCase()}
                              </span>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: RULES, COMPILATION & RESTORATIONS                  */}
          {/* ========================================================= */}
          {activeTab === 'rules' && (
            <div className="space-y-6 max-w-3xl">
              
              <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                <div className="flex items-center gap-2 text-amber-400 font-mono font-bold text-base">
                  <BookOpen className="w-5 h-5" />
                  <span>{CRITICAL_HITS_RULES_SUMMARY.title}</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {CRITICAL_HITS_RULES_SUMMARY.overview}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold uppercase text-zinc-400 tracking-wider flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-400" />
                  Core Rules & Mechanics
                </h4>

                <div className="space-y-2">
                  {CRITICAL_HITS_RULES_SUMMARY.coreMechanics.map((rule, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-300 flex items-start gap-3"
                    >
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="leading-relaxed">{rule}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/40 space-y-2">
                <span className="text-xs font-mono font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-indigo-400" />
                  Selective Use of Critical Hits (DM Balance Option)
                </span>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {CRITICAL_HITS_RULES_SUMMARY.selectiveUseOption}
                </p>
              </div>

              <div className="pt-2 text-[11px] font-mono text-zinc-500 border-t border-zinc-800 flex items-center justify-between">
                <span>Designed by Benjamin Huffman (Sterling Vermin)</span>
                <span>Compiled & Formatted for MistWalker VTT</span>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-zinc-900/80 border-t border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Ready for Combat Encounters</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-mono text-xs font-bold transition-colors cursor-pointer border border-zinc-700"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
