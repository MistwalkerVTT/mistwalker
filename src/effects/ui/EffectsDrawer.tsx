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
  Eye
} from 'lucide-react';
import { JB2A_REGISTRY, getJb2aAssetById } from '../db/jb2aRegistry';
import { Jb2aAssetDefinition, SpellSchool } from '../types/effect';
import { soundCatalog } from '../db/soundCatalog';
import { Attribution } from './Attribution';

interface EffectsDrawerProps {
  onEquipEffect?: (asset: Jb2aAssetDefinition) => void;
  onQuickPlaceEffect?: (asset: Jb2aAssetDefinition) => void;
  onClearEffects?: () => void;
  onOpenCompendium?: () => void;
  activeEquippedId?: string | null;
  gridSize?: number;
}

const SCHOOLS: { id: string; label: string }[] = [
  { id: 'all', label: 'All Schools' },
  { id: 'evocation', label: 'Evocation' },
  { id: 'conjuration', label: 'Conjuration' },
  { id: 'abjuration', label: 'Abjuration' },
  { id: 'necromancy', label: 'Necromancy' },
  { id: 'enchantment', label: 'Enchantment' },
  { id: 'illusion', label: 'Illusion' },
  { id: 'environmental', label: 'Hazards' }
];

export const EffectsDrawer: React.FC<EffectsDrawerProps> = ({
  onEquipEffect,
  onQuickPlaceEffect,
  onClearEffects,
  onOpenCompendium,
  activeEquippedId,
  gridSize = 50
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'instant' | 'persistent' | 'projectile'>('all');
  const [previewingSound, setPreviewingSound] = useState<string | null>(null);

  const filteredAssets = JB2A_REGISTRY.filter(asset => {
    // School filter
    if (selectedSchool !== 'all' && asset.school !== selectedSchool) return false;

    // Category tab filter
    if (categoryFilter === 'instant' && (asset.isPersistent || asset.paradigm === 'projectile')) return false;
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
        {(['all', 'instant', 'persistent', 'projectile'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setCategoryFilter(tab)}
            className={`flex-1 py-1.5 px-1.5 rounded-lg text-[11px] font-mono font-bold capitalize transition-all cursor-pointer ${
              categoryFilter === tab
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
            }`}
          >
            {tab === 'all' ? 'All FX' : tab === 'instant' ? 'Blasts' : tab === 'persistent' ? 'AoE' : 'Rays'}
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
            const isEquipped = activeEquippedId === asset.id;
            const isPlaying = previewingSound === asset.id;

            return (
              <div
                key={asset.id}
                className={`p-2.5 rounded-xl border transition-all ${
                  isEquipped
                    ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500/30'
                    : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-zinc-950 border border-zinc-700/80 flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner">
                      <img
                        src={asset.thumb}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold font-sans text-zinc-100 truncate">
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

                {/* Actions: Quick Place & Aim on Map */}
                <div className="flex gap-1.5 mt-2 pt-2 border-t border-zinc-800/60">
                  {onQuickPlaceEffect && (
                    <button
                      type="button"
                      onClick={() => onQuickPlaceEffect(asset)}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-[11px] font-mono font-semibold border border-zinc-700/80 transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-emerald-400" />
                      <span>Quick Place</span>
                    </button>
                  )}

                  {onEquipEffect && (
                    <button
                      type="button"
                      onClick={() => onEquipEffect(asset)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-mono font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        isEquipped
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : 'bg-purple-600 hover:bg-purple-500 text-white shadow-sm'
                      }`}
                    >
                      <Crosshair className="w-3 h-3" />
                      <span>{isEquipped ? 'Aiming...' : 'Aim on Map'}</span>
                    </button>
                  )}
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
