import React, { useMemo, useState } from 'react';
import { Check, Folder, Search, Shield, Swords, X } from 'lucide-react';
import { Character } from '../types/character';
import { getCharacterTokenUrl } from '../data/defaultCharacters';

interface CampaignGroup {
  campaignId: string;
  campaignTitle: string;
  characters: Character[];
}

interface ArenaHeroPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  accent?: 'gold' | 'crimson' | 'sky';
  heroPool: Character[];
  selectedHeroIds: string[];
  maxSelect: number;
  campaignGroups: CampaignGroup[];
  campaignFilter: string;
  onChangeCampaignFilter: (val: string) => void;
  onToggleHero: (hero: Character) => void;
}

export const ArenaHeroPickerModal: React.FC<ArenaHeroPickerModalProps> = ({
  isOpen,
  onClose,
  title = 'Choose Fighter',
  subtitle,
  accent = 'gold',
  heroPool,
  selectedHeroIds,
  maxSelect,
  campaignGroups,
  campaignFilter,
  onChangeCampaignFilter,
  onToggleHero
}) => {
  const [search, setSearch] = useState('');

  const filteredHeroes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return heroPool.filter((h) => {
      const matchesCamp =
        campaignFilter === 'ALL' ||
        h.ddbCampaignId === campaignFilter ||
        selectedHeroIds.includes(h.id);
      if (!matchesCamp) return false;
      if (!q) return true;
      return (
        h.name.toLowerCase().includes(q) ||
        (h.classLevel || '').toLowerCase().includes(q) ||
        (h.race || '').toLowerCase().includes(q)
      );
    });
  }, [heroPool, campaignFilter, search, selectedHeroIds]);

  if (!isOpen) return null;

  const isSingle = maxSelect === 1;
  const accentBorder =
    accent === 'crimson'
      ? 'border-rose-500/40'
      : accent === 'sky'
      ? 'border-sky-500/40'
      : 'border-amber-500/40';
  const accentSelected =
    accent === 'crimson'
      ? 'bg-rose-500/20 border-rose-400 text-white shadow-md'
      : accent === 'sky'
      ? 'bg-sky-500/20 border-sky-400 text-white shadow-md'
      : 'bg-amber-500/20 border-amber-400 text-white shadow-md';
  const accentCheck =
    accent === 'crimson'
      ? 'text-rose-400'
      : accent === 'sky'
      ? 'text-sky-400'
      : 'text-amber-400';

  return (
    <div
      className="fixed inset-0 z-[260] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-3xl max-h-[85vh] bg-zinc-950 border ${accentBorder} rounded-3xl shadow-2xl flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between gap-3 bg-zinc-900/80">
          <div className="flex items-center gap-2.5 min-w-0">
            {accent === 'crimson' ? (
              <Swords className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <Shield className={`w-5 h-5 shrink-0 ${accent === 'sky' ? 'text-sky-400' : 'text-amber-400'}`} />
            )}
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-mono font-black text-white truncate">
                {title}{' '}
                {!isSingle && (
                  <span className="text-xs font-semibold text-zinc-400">
                    ({selectedHeroIds.length}/{maxSelect})
                  </span>
                )}
              </h3>
              {subtitle && <p className="text-[11px] text-zinc-400 truncate">{subtitle}</p>}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
            aria-label="Close hero picker"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Campaign Filter */}
        <div className="px-5 py-3 border-b border-zinc-800/80 flex flex-wrap items-center gap-2.5 bg-zinc-900/40">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, class, or race..."
              autoFocus
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500/50 rounded-xl pl-8 pr-3 py-2 text-xs font-mono text-white focus:outline-none"
            />
          </div>

          {campaignGroups.length > 1 && (
            <div className="relative flex items-center">
              <Folder className="w-3.5 h-3.5 text-amber-400/80 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={campaignFilter}
                onChange={(e) => onChangeCampaignFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none cursor-pointer max-w-[210px]"
              >
                <option value="ALL">All Campaigns ({heroPool.length})</option>
                {campaignGroups.map((g) => (
                  <option key={g.campaignId} value={g.campaignId}>
                    {g.campaignTitle} ({g.characters.length})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Hero Grid */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {filteredHeroes.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-zinc-500">
              No heroes match &ldquo;{search}&rdquo;.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {filteredHeroes.map((hero) => {
                const isSelected = selectedHeroIds.includes(hero.id);
                const avatar = hero.avatarUrl || getCharacterTokenUrl(hero.name);
                return (
                  <button
                    key={hero.id}
                    type="button"
                    onClick={() => {
                      onToggleHero(hero);
                      if (isSingle) onClose();
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? accentSelected
                        : 'bg-zinc-900/70 hover:bg-zinc-900 border-zinc-800 text-zinc-300'
                    }`}
                  >
                    <img
                      src={avatar}
                      alt={hero.name}
                      className="w-11 h-11 rounded-xl object-cover border border-white/15 shrink-0 bg-zinc-900"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-mono font-bold truncate">{hero.name}</span>
                        {isSelected && <Check className={`w-4 h-4 shrink-0 ${accentCheck}`} />}
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate">
                        {hero.race} • {hero.classLevel}
                      </div>
                      <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                        HP {hero.maxHp || hero.hp} • AC {hero.ac}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/80 flex items-center justify-between">
          <span className="text-[11px] font-mono text-zinc-400">
            {isSingle ? 'Click a hero to select' : `Selected ${selectedHeroIds.length} of up to ${maxSelect} heroes`}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-mono font-black text-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
