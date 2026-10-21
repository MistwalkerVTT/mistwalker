// src/effects/ui/EffectsDrawer.tsx
// High-performance animated effects catalog drawer for DM and Player views

import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  Volume2,
  Crosshair,
  Plus,
  RotateCcw,
  BookOpen,
  Flame,
  Zap,
  Snowflake,
  Sun,
  Moon,
  Cloud,
  Droplets,
  Shield,
  Skull,
  Eye,
  X
} from 'lucide-react';
import { JB2A_REGISTRY, getJb2aAssetById } from '../db/jb2aRegistry';
import { Jb2aAssetDefinition, SpellSchool, VttEffectInstance } from '../types/effect';
import { soundCatalog } from '../db/soundCatalog';
import { Attribution } from './Attribution';

interface EffectsDrawerProps {
  onEquipEffect?: (asset: Jb2aAssetDefinition) => void;
  onEquipAsset?: (asset: Jb2aAssetDefinition) => void;
  onQuickPlaceEffect?: (asset: Jb2aAssetDefinition) => void;
  onQuickPlaceAsset?: (asset: Jb2aAssetDefinition) => void;
  onClearEffects?: () => void;
  onDispelEffect?: (effectId: string) => void;
  activeEffects?: VttEffectInstance[];
  onOpenCompendium?: () => void;
  activeEquippedId?: string | null;
  activeEquippedAsset?: Jb2aAssetDefinition | null;
  gridSize?: number;
  className?: string;
}

const SCHOOLS: { id: string; label: string }[] = [
  { id: 'all', label: 'All Schools' },
  { id: 'evocation', label: 'Evocation' },
  { id: 'conjuration', label: 'Conjuration' },
  { id: 'abjuration', label: 'Abjuration' },
  { id: 'necromancy', label: 'Necromancy' },
  { id: 'enchantment', label: 'Enchantment' },
  { id: 'illusion', label: 'Illusion' },
  { id: 'martial', label: 'Martial & Weapons' },
  { id: 'environmental', label: 'Hazards' }
];

export const EffectsDrawer: React.FC<EffectsDrawerProps> = ({
  onEquipEffect,
  onEquipAsset,
  onQuickPlaceEffect,
  onQuickPlaceAsset,
  onClearEffects,
  onDispelEffect,
  activeEffects,
  onOpenCompendium,
  activeEquippedId,
  activeEquippedAsset,
  gridSize = 50,
  className
}) => {
  const handleEquip = onEquipEffect || onEquipAsset;
  const handleQuickPlace = onQuickPlaceEffect || onQuickPlaceAsset;
  const currentEquippedId = activeEquippedId || activeEquippedAsset?.id;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'instant' | 'persistent' | 'projectile' | 'martial'>('all');
  const [previewingSound, setPreviewingSound] = useState<string | null>(null);

  const filteredAssets = JB2A_REGISTRY.filter(asset => {
    // School filter
    if (selectedSchool !== 'all' && asset.school !== selectedSchool) return false;

    // Category tab filter
    if (categoryFilter === 'martial' && asset.school !== 'martial') return false;
    if (categoryFilter === 'instant' && (asset.isPersistent || asset.paradigm === 'projectile' || asset.school === 'martial')) return false;
    if (categoryFilter === 'persistent' && !asset.isPersistent) return false;
    if (categoryFilter === 'projectile' && asset.paradigm !== 'projectile' && asset.paradigm !== 'ray') return false;

    // Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      asset.name.toLowerCase().includes(q) ||
      asset.label.toLowerCase().includes(q) ||
      asset.tags.some(t => t.includes(q))
    );
  });

  const handlePlaySound = (asset: Jb2aAssetDefinition, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!asset.soundKey) return;
    setPreviewingSound(asset.id);
    soundCatalog.play(asset.soundKey);
    setTimeout(() => setPreviewingSound(null), 600);
  };

  return (
    <div className="flex flex-col gap-3 text-zinc-200 select-none">
      {/* Category Filter Switcher */}
      <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 gap-1">
        {(['all', 'instant', 'persistent', 'projectile', 'martial'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setCategoryFilter(tab)}
            className={`flex-1 py-1.5 px-1.5 rounded-lg text-[11px] font-mono font-bold capitalize transition-all cursor-pointer ${
              categoryFilter === tab
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
            }`}
          >
            {tab === 'all' ? 'All FX' : tab === 'instant' ? 'Blasts' : tab === 'persistent' ? 'AoE' : tab === 'projectile' ? 'Rays' : 'Martial'}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search Fireball, Ray, Cone, Frost..."
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-purple-500 font-mono"
        />
      </div>

      {/* School Category Pills */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {SCHOOLS.map(school => (
          <button
            key={school.id}
            onClick={() => setSelectedSchool(school.id)}
            className={`py-1 px-2.5 rounded-lg text-[10px] font-mono font-bold whitespace-nowrap transition-colors cursor-pointer ${
              selectedSchool === school.id
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
            }`}
          >
            {school.label}
          </button>
        ))}
      </div>

      {/* Asset Cards List */}
      <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
        {filteredAssets.length === 0 ? (
          <div className="py-8 text-center text-zinc-500 text-xs">
            No animated effects found matching &quot;{searchQuery}&quot;.
          </div>
        ) : (
          filteredAssets.map(asset => {
            const isEquipped = currentEquippedId === asset.id;
            const isPlaying = previewingSound === asset.id;

            return (
              <div
                key={asset.id}
                onClick={() => handleEquip && handleEquip(asset)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer group select-none ${
                  isEquipped
                    ? 'bg-purple-950/50 border-purple-400 ring-2 ring-purple-400/50 shadow-[0_0_16px_rgba(168,85,247,0.4)]'
                    : 'bg-zinc-900/80 border-zinc-800 hover:border-purple-500/70 hover:bg-zinc-850 hover:shadow-md'
                }`}
                title={isEquipped ? "Aiming on map — click anywhere on battlemap to place/detonate (or click card to re-equip)" : `Click to place ${asset.name} on the map`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-700/80 flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner group-hover:border-purple-400/60 transition-colors">
                      <img
                        src={asset.thumb || asset.webm}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <Sparkles className="w-4 h-4 text-zinc-600 absolute pointer-events-none" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold font-sans text-zinc-100 group-hover:text-purple-200 transition-colors truncate">
                          {asset.name}
                        </span>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-600/50 shadow-sm">
                          JB2A
                        </span>
                        <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {asset.defaultSizeFt}ft {asset.shape}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5 font-sans capitalize">
                        {asset.school} • {asset.isPersistent ? 'Continuous AoE' : 'Instant Blast'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Active Aiming Status Indicator */}
                    {isEquipped && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-500 text-white font-mono text-[9px] font-bold shadow-sm animate-pulse flex items-center gap-1">
                        <Crosshair className="w-2.5 h-2.5" />
                        <span>Aiming</span>
                      </span>
                    )}

                    {/* Audio Preview Sound Button */}
                    {asset.soundKey && (
                      <button
                        type="button"
                        onClick={e => handlePlaySound(asset, e)}
                        title="Test Audio FX"
                        className={`p-1.5 rounded-lg border transition-all shrink-0 cursor-pointer ${
                          isPlaying
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 scale-105'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-amber-300 hover:border-zinc-700'
                        }`}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Compendium Link Button */}
      {onOpenCompendium && (
        <button
          type="button"
          onClick={onOpenCompendium}
          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600/20 to-orange-600/20 hover:from-amber-600/30 hover:to-orange-600/30 border border-amber-500/40 hover:border-amber-500/70 text-amber-300 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
        >
          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
          <span>Browse Compendium & Custom Overrides</span>
        </button>
      )}

      {/* Active Board Spells & Dispel Panel */}
      {activeEffects && activeEffects.length > 0 && (
        <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-purple-200">
            <span className="flex items-center gap-1.5 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              Active Board FX ({activeEffects.length})
            </span>
            <span className="text-[10px] text-purple-400 font-mono">Dispel Single Spell</span>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 sidebar-scrollbar">
            {activeEffects.map((eff) => (
              <div
                key={eff.id}
                className="flex items-center justify-between gap-2 p-2 rounded-lg bg-zinc-900/80 border border-zinc-800 hover:border-purple-500/40 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-xs font-bold text-zinc-100 truncate">{eff.name}</span>
                    {(eff.isPersistent || eff.loop) && (
                      <span className="px-1 py-0.2 rounded bg-purple-900/80 border border-purple-400/40 text-purple-200 text-[8px] font-mono shrink-0">
                        Looping
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-zinc-400 truncate">
                    {eff.sizeFt}ft {eff.paradigm}
                    {eff.casterName ? ` • ${eff.casterName}` : ''}
                  </div>
                </div>

                {onDispelEffect && (
                  <button
                    type="button"
                    onClick={() => onDispelEffect(eff.id)}
                    className="px-2 py-1 rounded-md bg-red-950/80 hover:bg-red-900 border border-red-500/40 hover:border-red-400 text-red-300 hover:text-white text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95 shrink-0 shadow-sm"
                    title={`Dispel ${eff.name} (Keep other active animations)`}
                  >
                    <X className="w-3 h-3" />
                    <span>Dispel</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clear Active Board Effects */}
      {onClearEffects && (
        <button
          type="button"
          onClick={onClearEffects}
          className="w-full py-2 px-3 rounded-xl bg-zinc-850 hover:bg-red-500/15 border border-zinc-700 hover:border-red-500/40 text-zinc-400 hover:text-red-400 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Clear All Active Board FX</span>
        </button>
      )}

      {/* Attribution Footer */}
      <Attribution className="pt-2 border-t border-zinc-800/70" />
    </div>
  );
};
