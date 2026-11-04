import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Download, 
  Layers, 
  Sparkles, 
  ShieldAlert, 
  Flame, 
  Compass, 
  ExternalLink,
  Check,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { VTT_COMMUNITY_MAPS, VttRepositoryMap } from '../data/vttMapRepository';
import { fetchAndParseRemoteUniversalVtt, ParsedUniversalVtt } from '../services/universalVttService';

interface VttMapRepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadParsedMap: (parsed: ParsedUniversalVtt, mapMeta: VttRepositoryMap) => Promise<void> | void;
}

export const VttMapRepositoryModal: React.FC<VttMapRepositoryModalProps> = ({
  isOpen,
  onClose,
  onLoadParsedMap
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loadingMapId, setLoadingMapId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [loadedMapIds, setLoadedMapIds] = useState<Set<string>>(new Set());

  // Distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    VTT_COMMUNITY_MAPS.forEach(m => set.add(m.category));
    return ['All', ...Array.from(set).sort()];
  }, []);

  // Filtered maps
  const filteredMaps = useMemo(() => {
    return VTT_COMMUNITY_MAPS.filter(map => {
      const matchesSearch = 
        map.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        map.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        map.path.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCat = selectedCategory === 'All' || map.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [searchQuery, selectedCategory]);

  if (!isOpen) return null;

  const handleSelectMap = async (map: VttRepositoryMap) => {
    if (loadingMapId) return; // Prevent concurrent downloads
    setLoadingMapId(map.id);
    setDownloadProgress(0);

    try {
      const parsed = await fetchAndParseRemoteUniversalVtt(
        map.downloadUrl,
        map.name + '.dd2vtt',
        (pct) => setDownloadProgress(pct)
      );

      setLoadedMapIds(prev => new Set(prev).add(map.id));
      await onLoadParsedMap(parsed, map);
      onClose();
    } catch (err: any) {
      console.error('[VTT Map Repository Error]:', err);
      alert(`Failed to load ${map.name}: ${err?.message || 'Network error'}`);
    } finally {
      setLoadingMapId(null);
      setDownloadProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-[88vh] max-h-[850px] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-100">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-mono tracking-wide">
                  Pre-built VTT Maps Repository
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold border border-purple-500/30">
                  {VTT_COMMUNITY_MAPS.length} Maps
                </span>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-mono border border-zinc-700">
                  Universal VTT (.dd2vtt)
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Ready-to-play battlemaps with calibrated grids, dynamic wall vectors, doors & lighting. CC-BY-SA 4.0 via mbround18/vtt-maps.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://github.com/mbround18/vtt-maps"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs transition-colors"
              title="View source repository on GitHub"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>GitHub Source</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="px-5 py-3 border-b border-zinc-800/80 bg-zinc-900/40 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search maps by name, theme, or tags..."
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-purple-500 placeholder:text-zinc-600 transition-all font-mono"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 sidebar-scrollbar text-xs font-mono">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap transition-all border ${
                    isSelected
                      ? 'bg-purple-600 text-white font-bold border-purple-500 shadow-sm'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Map Grid Container */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sidebar-scrollbar">
          {filteredMaps.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
              <Compass className="w-12 h-12 text-zinc-600 stroke-1 mb-3 animate-pulse" />
              <p className="text-sm font-semibold text-zinc-300">No battlemaps found</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                Try searching for a different keyword or select "All" categories to view all {VTT_COMMUNITY_MAPS.length} pre-built maps.
              </p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                className="mt-4 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-xl font-mono border border-zinc-700"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filteredMaps.map((map) => {
              const isLoadingThis = loadingMapId === map.id;
              const hasLoaded = loadedMapIds.has(map.id);

              return (
                <div
                  key={map.id}
                  className="group relative bg-zinc-900/90 border border-zinc-800 hover:border-purple-500/60 rounded-xl overflow-hidden flex flex-col transition-all hover:shadow-xl hover:shadow-purple-950/20"
                >
                  {/* Map Header Graphic / Badge */}
                  <div className="p-3.5 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border-b border-zinc-800 flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
                      {map.category}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {map.sizeFormatted}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-sm font-bold text-zinc-100 group-hover:text-purple-300 transition-colors line-clamp-2 leading-snug">
                          {map.name}
                        </h4>
                      </div>

                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-950/50 border border-purple-500/30 text-[9px] font-mono text-purple-300">
                          <Layers className="w-2.5 h-2.5" /> Walls Included
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/50 border border-amber-500/30 text-[9px] font-mono text-amber-300">
                          <Flame className="w-2.5 h-2.5" /> Dynamic Lights
                        </span>
                      </div>

                      <p className="text-[10px] font-mono text-zinc-500 mt-2 truncate">
                        Path: {map.path}
                      </p>
                    </div>

                    {/* Action Button */}
                    <div className="mt-4 pt-3 border-t border-zinc-850">
                      <button
                        type="button"
                        disabled={isLoadingThis || Boolean(loadingMapId)}
                        onClick={() => handleSelectMap(map)}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                          isLoadingThis
                            ? 'bg-purple-600 text-white cursor-wait'
                            : hasLoaded
                            ? 'bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-200'
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-950/40'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isLoadingThis ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                            <span>Downloading ({downloadProgress}%)...</span>
                          </>
                        ) : hasLoaded ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-purple-400" />
                            <span>Reload Map & Walls</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5 text-purple-200" />
                            <span>Load Map & Walls</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Info */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between text-xs text-zinc-400 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="font-mono text-[11px]">
              Loading a map automatically extracts its walls, doors, dynamic light torches, and exact grid dimensions.
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">
            Attribution: CC BY-SA 4.0 mbround18/vtt-maps
          </span>
        </div>

      </div>
    </div>
  );
};
