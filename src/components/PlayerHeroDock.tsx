import React, { useState } from 'react';
import {
  Shield,
  Heart,
  Zap,
  Swords,
  Sparkles,
  Package,
  Sliders,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Target,
  Crosshair,
  X,
  Volume2,
  Tv
} from 'lucide-react';
import { HudCharacterData, HudActionItem, HudActionCategory } from '../types/hud';

interface PlayerHeroDockProps {
  characterData: HudCharacterData | null;
  claimedToken: any | null;
  onSelectAction: (action: HudActionItem) => void;
  activeTargetingAction: HudActionItem | null;
  onCancelTargeting: () => void;
  onEndTurn?: () => void;
  isMyTurn?: boolean;
  onSwitchStationMode?: () => void;
  onOpenRestModal?: () => void;
}

export const PlayerHeroDock: React.FC<PlayerHeroDockProps> = ({
  characterData,
  claimedToken,
  onSelectAction,
  activeTargetingAction,
  onCancelTargeting,
  onEndTurn,
  isMyTurn = false,
  onSwitchStationMode,
  onOpenRestModal
}) => {
  const [activeCategory, setActiveCategory] = useState<HudActionCategory>('actions');
  const [hoveredAction, setHoveredAction] = useState<HudActionItem | null>(null);

  // Fallback defaults if DDB character not yet loaded
  const name = characterData?.name || claimedToken?.name || 'Hero';
  const avatarUrl = characterData?.avatarUrl || claimedToken?.avatarUrl || claimedToken?.url || '';
  const currentHp = characterData?.currentHp ?? claimedToken?.currentHp ?? claimedToken?.hp ?? 25;
  const maxHp = characterData?.maxHp ?? claimedToken?.maxHp ?? claimedToken?.hp ?? 25;
  const tempHp = characterData?.tempHp ?? claimedToken?.tempHp ?? 0;
  const ac = characterData?.ac ?? claimedToken?.ac ?? 14;
  const speed = characterData?.speed || '30 ft.';
  const passivePerception = characterData?.passivePerception ?? 12;
  const spellSaveDc = characterData?.spellSaveDc;

  // Radial HP percentage calculation
  const hpPercent = Math.max(0, Math.min(100, (currentHp / (maxHp || 1)) * 100));
  const strokeDashoffset = 283 - (283 * hpPercent) / 100;

  // Actions grouped by category
  const actionsList = characterData?.actions || [
    {
      id: 'default-attack',
      name: 'Main Attack',
      category: 'actions',
      type: 'action',
      hitBonus: '+5',
      damageFormula: '1d8 + 3',
      damageType: 'slashing',
      description: 'Standard melee attack with equipped weapon.',
      jb2aAssetId: 'attack_sword_slash',
      rangeFt: 5
    },
    {
      id: 'default-dash',
      name: 'Dash',
      category: 'actions',
      type: 'action',
      description: 'Double movement speed for the turn.',
      rangeFt: 0
    }
  ];

  const bonusActionsList = characterData?.bonusActions || [];
  const spellsList = characterData?.spells || [];
  const itemsList = characterData?.items || [];

  const currentCategoryList = activeCategory === 'actions'
    ? actionsList
    : activeCategory === 'bonus_actions'
      ? bonusActionsList
      : activeCategory === 'spells'
        ? spellsList
        : itemsList;

  return (
    <div
      id="player-hero-bottom-dock"
      className="fixed bottom-0 inset-x-0 z-[60] flex flex-col items-center pointer-events-none select-none pb-2 px-4"
    >
      {/* Targeting Status Bar (Rendered above dock when targeting) */}
      {activeTargetingAction && (
        <div className="pointer-events-auto mb-2 flex items-center gap-3 px-5 py-2.5 rounded-full bg-zinc-950/95 border border-amber-500/80 shadow-[0_0_25px_rgba(245,158,11,0.4)] text-amber-300 font-mono text-xs animate-in slide-in-from-bottom-2 duration-150 ring-1 ring-amber-500/30">
          <Crosshair className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span>
            Targeting Mode: <strong className="text-white">{activeTargetingAction.name}</strong> (Click target token on map)
          </span>
          {activeTargetingAction.rangeFt && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-[10px] border border-amber-500/40">
              Range: {activeTargetingAction.rangeFt} ft.
            </span>
          )}
          <button
            onClick={onCancelTargeting}
            className="p-1 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Cancel Targeting (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Action Hover Tooltip Preview */}
      {hoveredAction && !activeTargetingAction && (
        <div className="pointer-events-none mb-2 px-4 py-2 rounded-xl bg-zinc-950/95 border border-zinc-700/80 shadow-2xl text-left max-w-md animate-in fade-in duration-100 ring-1 ring-white/10">
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold text-amber-300 font-mono text-xs">
              {hoveredAction.name}
            </span>
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
              {hoveredAction.rangeFt !== undefined && <span>{hoveredAction.rangeFt} ft.</span>}
              {hoveredAction.hitBonus && <span className="text-emerald-400 font-bold">{hoveredAction.hitBonus}</span>}
              {hoveredAction.damageFormula && <span className="text-rose-400 font-bold">{hoveredAction.damageFormula}</span>}
            </div>
          </div>
          <p className="text-[11px] text-zinc-300 mt-1 line-clamp-2 font-sans">
            {hoveredAction.description}
          </p>
        </div>
      )}

      {/* Main 3-Wing BG3 Slotted Dock */}
      <div className="pointer-events-auto flex items-end justify-center gap-3 w-full max-w-5xl">
        
        {/* ========================================================================= */}
        {/* LEFT WING: CHARACTER ORB & VITALS */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-3 p-3 rounded-3xl bg-zinc-950/95 border border-zinc-800/90 shadow-[0_15px_40px_rgba(0,0,0,0.85)] ring-1 ring-white/10 shrink-0">
          {/* Radial HP Orb */}
          <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background Ring */}
              <circle
                cx="50"
                cy="50"
                r="45"
                className="stroke-zinc-800"
                strokeWidth="7"
                fill="transparent"
              />
              {/* Health Ring */}
              <circle
                cx="50"
                cy="50"
                r="45"
                className={`transition-all duration-500 ${
                  hpPercent > 50
                    ? 'stroke-emerald-500'
                    : hpPercent > 25
                      ? 'stroke-amber-500'
                      : 'stroke-rose-600'
                }`}
                strokeWidth="7"
                strokeDasharray="283"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            {/* Token Avatar Image */}
            <div className="absolute inset-2.5 rounded-full overflow-hidden border border-zinc-700 bg-zinc-900 shadow-inner">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-zinc-500 font-mono text-xs">
                  {name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            {/* Armor Class Shield Badge */}
            <div
              className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-lg bg-zinc-900 border border-zinc-700 text-amber-300 font-mono font-bold text-[11px] shadow-md flex items-center gap-0.5"
              title={`Armor Class: ${ac}`}
            >
              <Shield className="w-3 h-3 text-amber-400" />
              <span>{ac}</span>
            </div>
          </div>

          {/* Vitals Text */}
          <div className="space-y-1 text-left min-w-[110px]">
            <h3 className="text-xs font-bold text-amber-200 truncate font-mono" title={name}>
              {name}
            </h3>
            
            {/* HP Numbers */}
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className={`font-extrabold ${hpPercent <= 25 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                {currentHp}
              </span>
              <span className="text-zinc-500 text-[10px]">/</span>
              <span className="text-zinc-400 text-[11px]">{maxHp}</span>
              {tempHp > 0 && (
                <span className="px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-bold">
                  +{tempHp}
                </span>
              )}
            </div>

            {/* Tactical Badges: Speed & Passive Perception */}
            <div className="flex items-center gap-2 pt-0.5 text-[10px] font-mono text-zinc-400">
              <span title="Movement Speed">{speed}</span>
              <span>•</span>
              <span title={`Passive Perception: ${passivePerception}`}>PP {passivePerception}</span>
              {spellSaveDc && (
                <>
                  <span>•</span>
                  <span title={`Spell Save DC: ${spellSaveDc}`}>DC {spellSaveDc}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CENTER: BG3 HOTBAR GRID & CATEGORY TABS */}
        {/* ========================================================================= */}
        <div className="flex-1 bg-zinc-950/95 border border-zinc-800/90 rounded-3xl p-3 shadow-[0_15px_40px_rgba(0,0,0,0.85)] ring-1 ring-white/10 flex flex-col gap-2">
          
          {/* Top Filter Tabs & Spell Slot Pips */}
          <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
            
            {/* Category Tabs */}
            <div className="flex items-center gap-1">
              {[
                { id: 'actions', label: 'Actions', count: actionsList.length, color: 'text-emerald-400', activeBg: 'bg-emerald-500/20 border-emerald-500/50' },
                { id: 'bonus_actions', label: 'Bonus Actions', count: bonusActionsList.length, color: 'text-amber-400', activeBg: 'bg-amber-500/20 border-amber-500/50' },
                { id: 'spells', label: 'Spells', count: spellsList.length, color: 'text-blue-400', activeBg: 'bg-blue-500/20 border-blue-500/50' },
                { id: 'items', label: 'Items', count: itemsList.length, color: 'text-purple-400', activeBg: 'bg-purple-500/20 border-purple-500/50' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id as HudActionCategory)}
                  className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    activeCategory === tab.id
                      ? `${tab.activeBg} text-white shadow-md`
                      : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <span className={tab.color}>●</span>
                  <span>{tab.label}</span>
                  <span className="text-[10px] opacity-60">({tab.count})</span>
                </button>
              ))}
            </div>

            {/* Spell Slot Matrix (Synced via DDB) */}
            {characterData?.spellSlots && Object.keys(characterData.spellSlots).length > 0 && (
              <div className="flex items-center gap-2 text-xs font-mono pr-2">
                <span className="text-[10px] text-zinc-500 uppercase font-bold">Slots:</span>
                {Object.values(characterData.spellSlots).map((slot: any) => (
                  <div
                    key={slot.level}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px]"
                    title={`Level ${slot.level} Slots: ${slot.available}/${slot.total}`}
                  >
                    <span className="text-blue-400 font-bold">{['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][slot.level - 1] || slot.level}</span>
                    <span className="text-zinc-300 font-bold">{slot.available}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Hotbar Slots (Slotted Grid) */}
          <div className="grid grid-cols-8 sm:grid-cols-10 gap-2 min-h-[68px] overflow-x-auto py-1 sidebar-scrollbar">
            {currentCategoryList.map((action, idx) => {
              const isTargetingThis = activeTargetingAction?.id === action.id;
              return (
                <button
                  key={action.id || idx}
                  onClick={() => onSelectAction(action)}
                  onMouseEnter={() => setHoveredAction(action)}
                  onMouseLeave={() => setHoveredAction(null)}
                  className={`relative w-14 h-14 rounded-2xl border transition-all flex flex-col items-center justify-between p-1.5 cursor-pointer transform hover:scale-105 active:scale-95 shadow-md ${
                    isTargetingThis
                      ? 'border-amber-400 bg-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.5)] ring-2 ring-amber-400'
                      : 'border-zinc-800 hover:border-amber-500/60 bg-gradient-to-b from-zinc-900 to-zinc-950'
                  }`}
                  title={`${action.name} - Click to Cast/Attack`}
                >
                  {/* Top Level / Slot Badge */}
                  <div className="w-full flex items-center justify-between text-[9px] font-mono text-zinc-400">
                    {action.level !== undefined ? (
                      <span className="text-blue-300 font-bold">
                        {action.level === 0 ? 'Cantrip' : `L${action.level}`}
                      </span>
                    ) : (
                      <span className="text-zinc-500">{idx + 1}</span>
                    )}

                    {action.quantity !== undefined && (
                      <span className="text-amber-300 font-bold">x{action.quantity}</span>
                    )}
                  </div>

                  {/* Icon / Glyph */}
                  <div className="flex items-center justify-center my-auto">
                    {action.isHeal ? (
                      <Heart className="w-5 h-5 text-emerald-400" />
                    ) : action.category === 'spells' ? (
                      <Sparkles className="w-5 h-5 text-blue-400" />
                    ) : action.category === 'items' ? (
                      <Package className="w-5 h-5 text-purple-400" />
                    ) : (
                      <Swords className="w-5 h-5 text-amber-400" />
                    )}
                  </div>

                  {/* Name Label */}
                  <span className="text-[9px] font-mono font-medium text-zinc-200 truncate w-full text-center">
                    {action.name}
                  </span>
                </button>
              );
            })}

            {currentCategoryList.length === 0 && (
              <div className="col-span-full py-4 text-center text-xs font-mono text-zinc-500">
                No items in this category. Connect D&D Beyond sheet to populate.
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT WING: TURN FLOW & UTILITIES */}
        {/* ========================================================================= */}
        <div className="flex flex-col gap-2 p-3 rounded-3xl bg-zinc-950/95 border border-zinc-800/90 shadow-[0_15px_40px_rgba(0,0,0,0.85)] ring-1 ring-white/10 shrink-0">
          
          {/* End Turn / Active Turn Button */}
          {onEndTurn && (
            <button
              onClick={onEndTurn}
              className={`px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
                isMyTurn
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-zinc-950 shadow-amber-500/30 animate-pulse'
                  : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800'
              }`}
            >
              <span>{isMyTurn ? 'End Turn' : 'Pass Turn'}</span>
            </button>
          )}

          {/* Utility Buttons: DDB Sheet & Station Mode Switch */}
          <div className="flex items-center gap-2">
            {characterData?.readonlyUrl && (
              <a
                href={characterData.readonlyUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                title="Open D&D Beyond Character Sheet"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            {onSwitchStationMode && (
              <button
                onClick={onSwitchStationMode}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-emerald-400 border border-zinc-800 transition-colors cursor-pointer"
                title="Switch Station Mode (TV Table / Remote Player)"
              >
                <Tv className="w-4 h-4" />
              </button>
            )}

            {onOpenRestModal && (
              <button
                onClick={onOpenRestModal}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-amber-400 border border-zinc-800 transition-colors cursor-pointer"
                title="Short / Long Rest"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
