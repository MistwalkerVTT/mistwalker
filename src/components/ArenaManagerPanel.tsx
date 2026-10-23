import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Swords,
  Shield,
  Skull,
  Sliders,
  Plus,
  Trash2,
  Check,
  Upload,
  Sparkles,
  RotateCcw,
  Layers,
  DoorOpen,
  Eye,
  Search,
  Shuffle,
  Crown,
  Flame,
  Heart,
  Image as ImageIcon,
  FolderOpen,
  Undo2,
  Lock,
  Unlock,
  Play
} from 'lucide-react';
import { toast } from 'sonner';
import { Campaign, uploadAndRegisterAsset, subscribeToMonsters } from '../lib/firebase';
import { UploadedAsset, WallSegment, WallType } from '../types';
import { Monster } from '../types/monster';
import { DEFAULT_MONSTERS } from '../data/defaultMonsters';
import { PRESET_BATTLEMAPS, PresetBattlemap } from '../data/presetBattlemaps';
import { isUniversalVttFile, parseUniversalVtt } from '../services/universalVttService';
import {
  ArenaConfig,
  loadArenaConfig,
  saveArenaConfig,
  subscribeToArenaConfig,
  generateColosseumPillarWalls,
  generateChokepointDivideWalls,
  generateTacticalBarricadeWalls
} from '../services/arenaConfigService';
import { generateScaledRandomEncounter } from './PlayerArenaMode';

const ARENA_GRID_SIZE = 60;
const ARENA_COLS = 22;
const ARENA_ROWS = 14;
const ARENA_WIDTH = ARENA_COLS * ARENA_GRID_SIZE; // 1320
const ARENA_HEIGHT = ARENA_ROWS * ARENA_GRID_SIZE; // 840

interface ArenaManagerPanelProps {
  campaigns: Campaign[];
  savedMaps: UploadedAsset[];
  onMapUploaded?: (asset: UploadedAsset) => void;
  onLaunchArenaPreview?: () => void;
}

export const ArenaManagerPanel: React.FC<ArenaManagerPanelProps> = ({
  campaigns,
  savedMaps,
  onMapUploaded,
  onLaunchArenaPreview
}) => {
  const [config, setConfig] = useState<ArenaConfig>(() => loadArenaConfig());
  const [activeSubTab, setActiveSubTab] = useState<'maps_walls' | 'monsters' | 'settings'>('maps_walls');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Maps & Wall Editor State
  const allMaps = useMemo<PresetBattlemap[]>(() => {
    const merged: PresetBattlemap[] = [];
    const seen = new Set<string>();
    for (const m of [...PRESET_BATTLEMAPS, ...(config.customMaps || [])]) {
      if (!m || !m.id || seen.has(m.id)) continue;
      seen.add(m.id);
      merged.push(m);
    }
    return merged;
  }, [config.customMaps]);

  const [selectedMapId, setSelectedMapId] = useState<string>(() => config.defaultMapId || PRESET_BATTLEMAPS[0].id);
  const selectedMap = useMemo(
    () => allMaps.find((m) => m.id === selectedMapId) || allMaps[0] || PRESET_BATTLEMAPS[0],
    [allMaps, selectedMapId]
  );

  const [wallTool, setWallTool] = useState<'solid' | 'door' | 'window' | 'erase'>('solid');
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [dragStartPt, setDragStartPt] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrentPt, setDragCurrentPt] = useState<{ x: number; y: number } | null>(null);
  const [isUploadingArenaMap, setIsUploadingArenaMap] = useState<boolean>(false);
  const [showAddUrlForm, setShowAddUrlForm] = useState<boolean>(false);
  const [customMapNameInput, setCustomMapNameInput] = useState<string>('');
  const [customMapUrlInput, setCustomMapUrlInput] = useState<string>('');
  const [customMapTypeInput, setCustomMapTypeInput] = useState<string>('Custom Arena');
  const [showSavedLibraryPicker, setShowSavedLibraryPicker] = useState<boolean>(false);
  const [showSceneImportPicker, setShowSceneImportPicker] = useState<boolean>(false);

  const svgCanvasRef = useRef<SVGSVGElement | null>(null);
  const fileUploadRef = useRef<HTMLInputElement | null>(null);

  // Monster Compendium & Custom Monster State
  const [firestoreMonsters, setFirestoreMonsters] = useState<Monster[]>([]);
  const [monsterSearch, setMonsterSearch] = useState<string>('');
  const [showCustomMonsterModal, setShowCustomMonsterModal] = useState<boolean>(false);
  const [newMonName, setNewMonName] = useState<string>('');
  const [newMonCr, setNewMonCr] = useState<string>('3');
  const [newMonHp, setNewMonHp] = useState<number>(68);
  const [newMonAc, setNewMonAc] = useState<number>(16);
  const [newMonSize, setNewMonSize] = useState<'Medium' | 'Large' | 'Huge'>('Large');
  const [newMonAtkName, setNewMonAtkName] = useState<string>('Colosseum Cleave');
  const [newMonHitBonus, setNewMonHitBonus] = useState<string>('+7');
  const [newMonDamage, setNewMonDamage] = useState<string>('2d10 + 4 slashing');
  const [newMonAvatar, setNewMonAvatar] = useState<string>('');

  useEffect(() => {
    const unsubConfig = subscribeToArenaConfig((incoming) => {
      setConfig(incoming);
    });
    const unsubMonsters = subscribeToMonsters((list) => {
      setFirestoreMonsters(list || []);
    });
    return () => {
      unsubConfig();
      unsubMonsters();
    };
  }, []);

  const allMonstersPool = useMemo<Monster[]>(() => {
    const merged: Monster[] = [];
    const seen = new Set<string>();
    for (const m of [...(config.customArenaMonsters || []), ...firestoreMonsters, ...DEFAULT_MONSTERS]) {
      if (!m || !m.name) continue;
      const key = m.monsterId || m.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(m);
    }
    return merged;
  }, [config.customArenaMonsters, firestoreMonsters]);

  const filteredMonsters = useMemo(() => {
    const q = monsterSearch.trim().toLowerCase();
    if (!q) return allMonstersPool;
    return allMonstersPool.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.type || '').toLowerCase().includes(q) ||
        (m.challenge || '').toLowerCase().includes(q)
    );
  }, [allMonstersPool, monsterSearch]);

  const commitConfigUpdate = async (updater: (prev: ArenaConfig) => ArenaConfig, toastMsg?: string) => {
    setIsSaving(true);
    try {
      const next = updater(config);
      setConfig(next);
      await saveArenaConfig(next);
      if (toastMsg) {
        toast.success(toastMsg);
      }
    } catch (err) {
      console.error('[ArenaManagerPanel] Failed to save config:', err);
      toast.error('Failed to sync Arena settings');
    } finally {
      setIsSaving(false);
    }
  };

  const currentMapWalls: WallSegment[] = useMemo(
    () => config.mapWalls?.[selectedMap.id] || [],
    [config.mapWalls, selectedMap.id]
  );

  const setWallsForSelectedMap = (nextWalls: WallSegment[], toastMsg?: string) => {
    commitConfigUpdate(
      (prev) => ({
        ...prev,
        mapWalls: {
          ...(prev.mapWalls || {}),
          [selectedMap.id]: nextWalls
        }
      }),
      toastMsg
    );
  };

  // Convert pointer event on SVG to Arena 1320x840 world coordinates
  const getArenaCoordsFromPointer = (e: React.PointerEvent<SVGSVGElement>): { x: number; y: number } => {
    const svg = svgCanvasRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / Math.max(1, rect.width)) * ARENA_WIDTH;
    const rawY = ((e.clientY - rect.top) / Math.max(1, rect.height)) * ARENA_HEIGHT;
    const clampedX = Math.max(0, Math.min(ARENA_WIDTH, rawX));
    const clampedY = Math.max(0, Math.min(ARENA_HEIGHT, rawY));
    if (snapToGrid) {
      const snapStep = ARENA_GRID_SIZE / 2; // 30px half-grid & intersection snapping
      return {
        x: Math.round(clampedX / snapStep) * snapStep,
        y: Math.round(clampedY / snapStep) * snapStep
      };
    }
    return {
      x: Math.round(clampedX),
      y: Math.round(clampedY)
    };
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (wallTool === 'erase') return;
    const pt = getArenaCoordsFromPointer(e);
    setDragStartPt(pt);
    setDragCurrentPt(pt);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragStartPt) return;
    setDragCurrentPt(getArenaCoordsFromPointer(e));
  };

  const handleCanvasPointerUp = () => {
    if (!dragStartPt || !dragCurrentPt) {
      setDragStartPt(null);
      setDragCurrentPt(null);
      return;
    }
    const dist = Math.hypot(dragCurrentPt.x - dragStartPt.x, dragCurrentPt.y - dragStartPt.y);
    if (dist >= 15) {
      const wallType: WallType = wallTool === 'door' ? 'door' : wallTool === 'window' ? 'window' : 'solid';
      const newSegment: WallSegment = {
        id: `arena_wall_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        x1: dragStartPt.x,
        y1: dragStartPt.y,
        x2: dragCurrentPt.x,
        y2: dragCurrentPt.y,
        type: wallType,
        doorState: wallType === 'door' ? 'closed' : undefined,
        blocksLight: wallType !== 'window',
        blocksMovement: true
      };
      setWallsForSelectedMap([...currentMapWalls, newSegment]);
    }
    setDragStartPt(null);
    setDragCurrentPt(null);
  };

  // Upload a new Map Image, Video, or Universal VTT (.dd2vtt) directly into the Battle Arena
  const handleUploadArenaMapFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsUploadingArenaMap(true);
    try {
      let uploadFile = file;
      let extractedWalls: WallSegment[] = [];

      if (isUniversalVttFile(file)) {
        try {
          const parsed = await parseUniversalVtt(file);
          uploadFile = parsed.imageFile;
          if (Array.isArray(parsed.walls) && parsed.walls.length > 0) {
            const scaleX = ARENA_WIDTH / Math.max(1, parsed.pixelWidth || ARENA_WIDTH);
            const scaleY = ARENA_HEIGHT / Math.max(1, parsed.pixelHeight || ARENA_HEIGHT);
            extractedWalls = parsed.walls.map((w, idx) => ({
              ...w,
              id: `uvtt_arena_${idx}_${Date.now()}`,
              x1: Math.round(w.x1 * scaleX),
              y1: Math.round(w.y1 * scaleY),
              x2: Math.round(w.x2 * scaleX),
              y2: Math.round(w.y2 * scaleY)
            }));
          }
        } catch (uvttErr) {
          console.warn('[ArenaManager] UVTT parse notice:', uvttErr);
        }
      }

      const asset = await uploadAndRegisterAsset(uploadFile, 'map');
      if (onMapUploaded) onMapUploaded(asset);

      const newArenaMap: PresetBattlemap = {
        id: `arena_map_${Date.now()}`,
        name: asset.name.replace(/\.[^/.]+$/, '') || 'Custom Arena Map',
        url: asset.url,
        thumbnailUrl: asset.thumbnailUrl || asset.url,
        type: 'Custom Uploaded Arena',
        desc: 'Uploaded by DM in Battle Arena Manager',
        isCustomUploaded: true
      };

      await commitConfigUpdate((prev) => ({
        ...prev,
        defaultMapId: newArenaMap.id,
        customMaps: [...(prev.customMaps || []), newArenaMap],
        mapWalls: extractedWalls.length > 0
          ? { ...(prev.mapWalls || {}), [newArenaMap.id]: extractedWalls }
          : prev.mapWalls
      }));

      setSelectedMapId(newArenaMap.id);
      toast.success(
        extractedWalls.length > 0
          ? `Added "${newArenaMap.name}" to Battle Arena with ${extractedWalls.length} UVTT walls!`
          : `Added "${newArenaMap.name}" to Battle Arena maps!`
      );
    } catch (err: any) {
      toast.error('Failed to upload Arena map: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsUploadingArenaMap(false);
    }
  };

  // Add a map from URL
  const handleAddMapByUrl = () => {
    const cleanName = customMapNameInput.trim();
    const cleanUrl = customMapUrlInput.trim();
    if (!cleanName || !cleanUrl) {
      toast.warning('Please enter both a map name and a valid image URL.');
      return;
    }
    const newMap: PresetBattlemap = {
      id: `arena_url_${Date.now()}`,
      name: cleanName,
      url: cleanUrl,
      thumbnailUrl: cleanUrl,
      type: customMapTypeInput.trim() || 'Custom Arena',
      desc: 'Added by DM via Battle Arena Manager',
      isCustomUploaded: true
    };
    commitConfigUpdate(
      (prev) => ({
        ...prev,
        defaultMapId: newMap.id,
        customMaps: [...(prev.customMaps || []), newMap]
      }),
      `Added "${newMap.name}" to Arena Maps!`
    );
    setSelectedMapId(newMap.id);
    setCustomMapNameInput('');
    setCustomMapUrlInput('');
    setShowAddUrlForm(false);
  };

  // Import a Scene (Map + Scaled Walls + Monsters) from any Campaign Chapter
  const handleImportSceneIntoArena = (sceneTitle: string, mapUrl: string, walls?: WallSegment[], mapW?: number, mapH?: number) => {
    if (!mapUrl) {
      toast.warning('Selected scene does not have a map image URL.');
      return;
    }
    const newId = `arena_scene_${Date.now()}`;
    const newMap: PresetBattlemap = {
      id: newId,
      name: sceneTitle || 'Campaign Arena Scene',
      url: mapUrl,
      thumbnailUrl: mapUrl,
      type: 'Campaign Scene',
      desc: `Imported from Campaign Scene "${sceneTitle}"`,
      isCustomUploaded: true
    };

    let scaledWalls: WallSegment[] = [];
    if (Array.isArray(walls) && walls.length > 0) {
      const srcW = mapW || 1920;
      const srcH = mapH || 1080;
      const scaleX = ARENA_WIDTH / Math.max(1, srcW);
      const scaleY = ARENA_HEIGHT / Math.max(1, srcH);
      scaledWalls = walls.map((w, idx) => ({
        ...w,
        id: `scene_wall_${idx}_${Date.now()}`,
        x1: Math.round(w.x1 * scaleX),
        y1: Math.round(w.y1 * scaleY),
        x2: Math.round(w.x2 * scaleX),
        y2: Math.round(w.y2 * scaleY)
      }));
    }

    commitConfigUpdate(
      (prev) => ({
        ...prev,
        defaultMapId: newId,
        customMaps: [...(prev.customMaps || []), newMap],
        mapWalls: scaledWalls.length > 0
          ? { ...(prev.mapWalls || {}), [newId]: scaledWalls }
          : prev.mapWalls
      }),
      `Imported "${sceneTitle}" into Arena (${scaledWalls.length} walls)!`
    );
    setSelectedMapId(newId);
    setShowSceneImportPicker(false);
  };

  // Create Custom Arena Monster
  const handleCreateCustomMonster = () => {
    if (!newMonName.trim()) {
      toast.warning('Enter a name for the custom monster.');
      return;
    }
    const created: Monster = {
      monsterId: `arena_custom_mon_${Date.now()}`,
      name: newMonName.trim(),
      size: newMonSize,
      type: 'Arena Challenger',
      alignment: 'Chaotic Neutral',
      ac: Number(newMonAc) || 15,
      hp: Number(newMonHp) || 60,
      speed: '30 ft.',
      initiativeBonus: 2,
      proficiencyBonus: 2,
      str: 18,
      dex: 14,
      con: 16,
      int: 10,
      wis: 12,
      cha: 12,
      challenge: `${newMonCr || '3'} (Arena Boss)`,
      avatarUrl:
        newMonAvatar.trim() ||
        'https://www.dndbeyond.com/avatars/thumbnails/30783/955/1000/1000/638062024584880857.png',
      actions: [
        {
          name: newMonAtkName.trim() || 'Colosseum Strike',
          description: `Melee Weapon Attack: ${newMonHitBonus || '+7'} to hit, reach 5 ft., one target. Hit: (${newMonDamage || '2d10 + 4'}) damage.`,
          desc: `Melee Weapon Attack: ${newMonHitBonus || '+7'} to hit, reach 5 ft., one target. Hit: (${newMonDamage || '2d10 + 4'}) damage.`
        }
      ],
      createdAt: Date.now()
    };

    commitConfigUpdate(
      (prev) => ({
        ...prev,
        customArenaMonsters: [created, ...(prev.customArenaMonsters || [])],
        pinnedEncounterMonsters: [...(prev.pinnedEncounterMonsters || []), created]
      }),
      `Created "${created.name}" and added to Arena Encounter Squad!`
    );

    setNewMonName('');
    setNewMonAvatar('');
    setShowCustomMonsterModal(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950 text-zinc-200">
      {/* Sub-Navigation Header Bar */}
      <div className="px-6 py-3 bg-zinc-900/80 border-b border-zinc-800/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('maps_walls')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer border ${
              activeSubTab === 'maps_walls'
                ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg shadow-amber-500/20'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>1. Arena Maps & Wall Builder</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">
              {allMaps.length} Maps
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('monsters')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer border ${
              activeSubTab === 'monsters'
                ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/20'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
            }`}
          >
            <Skull className="w-4 h-4" />
            <span>2. Monsters & Encounters</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/25 font-mono">
              {config.pinnedEncounterMonsters?.length || 0} Squad
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('settings')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer border ${
              activeSubTab === 'settings'
                ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>3. Arena Rules & Balance</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          {isSaving && (
            <span className="text-[11px] font-mono text-amber-400 animate-pulse">
              Syncing to Cloud...
            </span>
          )}
          {onLaunchArenaPreview && (
            <button
              type="button"
              onClick={onLaunchArenaPreview}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-mono font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-zinc-950" />
              <span>Test Battle Arena</span>
            </button>
          )}
        </div>
      </div>

      {/* =====================================================================
          SUB-TAB 1: ARENA MAPS & INTERACTIVE WALL EDITOR
         ===================================================================== */}
      {activeSubTab === 'maps_walls' && (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Panel: Map List & Load Additional Maps */}
          <div className="w-full lg:w-88 border-r border-zinc-800/80 bg-zinc-950/80 p-4 flex flex-col gap-4 overflow-y-auto sidebar-scrollbar shrink-0">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Arena Map Pool ({allMaps.length})</span>
                </h3>
                <span className="text-[10px] font-mono text-zinc-500">Click to edit walls</span>
              </div>

              <div className="space-y-2">
                {allMaps.map((m) => {
                  const isSel = selectedMap.id === m.id;
                  const isDefault = config.defaultMapId === m.id;
                  const isDisabled = (config.disabledMapIds || []).includes(m.id);
                  const wallCount = (config.mapWalls?.[m.id] || []).length;

                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMapId(m.id)}
                      className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                        isSel
                          ? 'bg-amber-500/15 border-amber-400 shadow-lg'
                          : 'bg-zinc-900/70 hover:bg-zinc-900 border-zinc-800'
                      } ${isDisabled ? 'opacity-50' : ''}`}
                    >
                      <img
                        src={m.thumbnailUrl || m.url}
                        alt={m.name}
                        className="w-14 h-12 rounded-xl object-cover border border-zinc-700 shrink-0 bg-zinc-950"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-bold text-white truncate">
                            {m.name}
                          </span>
                          {isDefault && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/25 border border-amber-400/50 text-amber-300 text-[9px] font-mono font-bold shrink-0">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-2 mt-0.5">
                          <span>{wallCount} walls</span>
                          <span>•</span>
                          <span>{isDisabled ? 'Hidden' : 'Active'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5" onClick={(e) => e.stopPropagation()}>
                          {!isDefault && (
                            <button
                              type="button"
                              onClick={() =>
                                commitConfigUpdate(
                                  (prev) => ({
                                    ...prev,
                                    defaultMapId: m.id,
                                    disabledMapIds: (prev.disabledMapIds || []).filter((id) => id !== m.id)
                                  }),
                                  `Set "${m.name}" as the Default Arena Map!`
                                )
                              }
                              className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-300 text-[9px] font-mono font-bold transition-colors cursor-pointer"
                            >
                              Set Default
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              commitConfigUpdate((prev) => {
                                const list = prev.disabledMapIds || [];
                                const nextList = list.includes(m.id)
                                  ? list.filter((id) => id !== m.id)
                                  : [...list, m.id];
                                return { ...prev, disabledMapIds: nextList };
                              })
                            }
                            className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[9px] font-mono cursor-pointer"
                          >
                            {isDisabled ? 'Enable' : 'Hide'}
                          </button>
                          {m.isCustomUploaded && (
                            <button
                              type="button"
                              onClick={() => {
                                commitConfigUpdate(
                                  (prev) => ({
                                    ...prev,
                                    customMaps: (prev.customMaps || []).filter((cm) => cm.id !== m.id)
                                  }),
                                  `Removed "${m.name}" from Arena Maps`
                                );
                                if (selectedMap.id === m.id) {
                                  setSelectedMapId(PRESET_BATTLEMAPS[0].id);
                                }
                              }}
                              className="p-1 rounded bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 cursor-pointer ml-auto"
                              title="Delete custom Arena map"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Load Additional Maps Section */}
            <div className="pt-3 border-t border-zinc-800 space-y-2">
              <span className="block text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                + Load Additional Arena Maps
              </span>

              <input
                ref={fileUploadRef}
                type="file"
                accept="image/*,video/*,.dd2vtt,.uvtt"
                className="hidden"
                onChange={handleUploadArenaMapFile}
              />

              <button
                type="button"
                disabled={isUploadingArenaMap}
                onClick={() => fileUploadRef.current?.click()}
                className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-mono font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{isUploadingArenaMap ? 'Uploading Map...' : 'Upload Map / UVTT File'}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSavedLibraryPicker((v) => !v);
                    setShowSceneImportPicker(false);
                    setShowAddUrlForm(false);
                  }}
                  className="py-2 px-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-mono text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
                  <span>Saved Library</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowSceneImportPicker((v) => !v);
                    setShowSavedLibraryPicker(false);
                    setShowAddUrlForm(false);
                  }}
                  className="py-2 px-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-mono text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>From Scene</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAddUrlForm((v) => !v);
                  setShowSavedLibraryPicker(false);
                  setShowSceneImportPicker(false);
                }}
                className="w-full py-1.5 px-3 rounded-xl bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 font-mono text-[11px] cursor-pointer"
              >
                + Add Map by Image URL
              </button>

              {/* Saved Library Drawer */}
              {showSavedLibraryPicker && (
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-700 space-y-2 max-h-48 overflow-y-auto">
                  <div className="text-[10px] font-mono font-bold text-blue-300 uppercase">
                    Select from Uploaded Maps ({savedMaps.length})
                  </div>
                  {savedMaps.length === 0 ? (
                    <p className="text-[11px] text-zinc-500">No saved maps in cloud library yet.</p>
                  ) : (
                    savedMaps.map((sm) => (
                      <button
                        key={sm.assetId}
                        type="button"
                        onClick={() => {
                          const newMap: PresetBattlemap = {
                            id: `arena_lib_${sm.assetId}`,
                            name: sm.name.replace(/\.[^/.]+$/, ''),
                            url: sm.url,
                            thumbnailUrl: sm.thumbnailUrl || sm.url,
                            type: 'Cloud Library Map',
                            desc: 'Loaded from Cloud Asset Library',
                            isCustomUploaded: true
                          };
                          commitConfigUpdate(
                            (prev) => ({
                              ...prev,
                              defaultMapId: newMap.id,
                              customMaps: [
                                ...(prev.customMaps || []).filter((m) => m.id !== newMap.id),
                                newMap
                              ]
                            }),
                            `Added "${newMap.name}" to Battle Arena!`
                          );
                          setSelectedMapId(newMap.id);
                          setShowSavedLibraryPicker(false);
                        }}
                        className="w-full p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 flex items-center gap-2 text-left cursor-pointer"
                      >
                        <img
                          src={sm.thumbnailUrl || sm.url}
                          alt={sm.name}
                          className="w-9 h-7 rounded object-cover shrink-0 bg-zinc-900"
                        />
                        <span className="text-[11px] font-mono text-zinc-200 truncate">{sm.name}</span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Import from Campaign Scene Drawer */}
              {showSceneImportPicker && (
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-700 space-y-1.5 max-h-52 overflow-y-auto">
                  <div className="text-[10px] font-mono font-bold text-emerald-300 uppercase">
                    Import Campaign Scene & Walls
                  </div>
                  {campaigns.flatMap((c) =>
                    c.chapters.flatMap((ch) =>
                      ch.scenes.map((sc) => ({
                        campTitle: c.campaignTitle,
                        scene: sc
                      }))
                    )
                  ).map(({ campTitle, scene }) => (
                    <button
                      key={scene.sceneId}
                      type="button"
                      onClick={() =>
                        handleImportSceneIntoArena(
                          scene.sceneTitle,
                          scene.mapUrl,
                          scene.walls,
                          scene.mapWidth,
                          scene.mapHeight
                        )
                      }
                      className="w-full p-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-left cursor-pointer"
                    >
                      <div className="text-[11px] font-mono font-bold text-white truncate">
                        {scene.sceneTitle}
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate">
                        {campTitle} • {scene.walls?.length || 0} walls
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Add Map by URL Form */}
              {showAddUrlForm && (
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-700 space-y-2">
                  <input
                    type="text"
                    placeholder="Map Title (e.g. Obsidian Bridge)"
                    value={customMapNameInput}
                    onChange={(e) => setCustomMapNameInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="Image URL (https://...)"
                    value={customMapUrlInput}
                    onChange={(e) => setCustomMapUrlInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddMapByUrl}
                    className="w-full py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono font-bold text-xs cursor-pointer"
                  >
                    Add Map to Arena
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Interactive Arena Wall & Obstacle Canvas */}
          <div className="flex-1 flex flex-col p-4 overflow-y-auto bg-zinc-950">
            {/* Wall Editor Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-zinc-800">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-mono font-bold text-amber-300 mr-1">
                  Editing: {selectedMap.name}
                </span>

                {(
                  [
                    { id: 'solid', label: 'Solid Wall', color: 'amber' },
                    { id: 'door', label: 'Doorway', color: 'cyan' },
                    { id: 'window', label: 'Cover / Window', color: 'blue' },
                    { id: 'erase', label: 'Click Wall to Delete', color: 'rose' }
                  ] as const
                ).map((toolItem) => (
                  <button
                    key={toolItem.id}
                    type="button"
                    onClick={() => setWallTool(toolItem.id)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                      wallTool === toolItem.id
                        ? 'bg-amber-500 text-zinc-950 border-amber-300 shadow'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                    }`}
                  >
                    {toolItem.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setSnapToGrid((v) => !v)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono border cursor-pointer ${
                    snapToGrid
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  Snap: {snapToGrid ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Quick Tactical Wall Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setWallsForSelectedMap(
                      [...currentMapWalls, ...generateColosseumPillarWalls(ARENA_GRID_SIZE)],
                      `Added 4 Colosseum Pillars to ${selectedMap.name}!`
                    )
                  }
                  className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[11px] font-mono text-amber-300 cursor-pointer"
                  title="Generate 4 stone pillars that block movement and Line of Sight"
                >
                  + 4 Pillars
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setWallsForSelectedMap(
                      [...currentMapWalls, ...generateChokepointDivideWalls(ARENA_GRID_SIZE)],
                      `Added Central Chokepoint & Doors to ${selectedMap.name}!`
                    )
                  }
                  className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[11px] font-mono text-cyan-300 cursor-pointer"
                  title="Generate central divide wall with 2 interactive doors"
                >
                  + Chokepoint Doors
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setWallsForSelectedMap(
                      [...currentMapWalls, ...generateTacticalBarricadeWalls(ARENA_GRID_SIZE)],
                      `Added Tactical Cover Barricades to ${selectedMap.name}!`
                    )
                  }
                  className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[11px] font-mono text-blue-300 cursor-pointer"
                >
                  + Cover Barricades
                </button>
                <button
                  type="button"
                  disabled={currentMapWalls.length === 0}
                  onClick={() => setWallsForSelectedMap(currentMapWalls.slice(0, -1))}
                  className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 disabled:opacity-40 cursor-pointer"
                  title="Undo last wall segment"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={currentMapWalls.length === 0}
                  onClick={() => setWallsForSelectedMap([], `Cleared all walls on ${selectedMap.name}`)}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 text-[11px] font-mono disabled:opacity-40 cursor-pointer"
                >
                  Clear ({currentMapWalls.length})
                </button>
              </div>
            </div>

            {/* Interactive SVG Arena Map & Wall Canvas */}
            <div className="flex-1 flex flex-col items-center justify-center min-h-[380px]">
              <div className="relative w-full max-w-[920px] aspect-[22/14] rounded-2xl overflow-hidden border-2 border-amber-500/50 shadow-2xl bg-zinc-900 select-none">
                <img
                  src={selectedMap.url}
                  alt={selectedMap.name}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />

                <svg
                  ref={svgCanvasRef}
                  viewBox={`0 0 ${ARENA_WIDTH} ${ARENA_HEIGHT}`}
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={handleCanvasPointerUp}
                  className={`absolute inset-0 w-full h-full ${
                    wallTool === 'erase' ? 'cursor-pointer' : 'cursor-crosshair'
                  }`}
                >
                  {/* 22x14 Tactical Grid Lines */}
                  {Array.from({ length: ARENA_COLS + 1 }).map((_, c) => (
                    <line
                      key={`v_${c}`}
                      x1={c * ARENA_GRID_SIZE}
                      y1={0}
                      x2={c * ARENA_GRID_SIZE}
                      y2={ARENA_HEIGHT}
                      stroke="rgba(255,255,255,0.18)"
                      strokeWidth={1}
                    />
                  ))}
                  {Array.from({ length: ARENA_ROWS + 1 }).map((_, r) => (
                    <line
                      key={`h_${r}`}
                      x1={0}
                      y1={r * ARENA_GRID_SIZE}
                      x2={ARENA_WIDTH}
                      y2={r * ARENA_GRID_SIZE}
                      stroke="rgba(255,255,255,0.18)"
                      strokeWidth={1}
                    />
                  ))}

                  {/* Team Gold & Team Crimson Spawn Zone Indicators */}
                  <rect
                    x={2.5 * ARENA_GRID_SIZE}
                    y={2 * ARENA_GRID_SIZE}
                    width={2 * ARENA_GRID_SIZE}
                    height={10 * ARENA_GRID_SIZE}
                    rx={12}
                    fill="rgba(245, 158, 11, 0.10)"
                    stroke="rgba(245, 158, 11, 0.45)"
                    strokeDasharray="8 6"
                    strokeWidth={2}
                  />
                  <text
                    x={3.5 * ARENA_GRID_SIZE}
                    y={1.6 * ARENA_GRID_SIZE}
                    textAnchor="middle"
                    fill="#fbbf24"
                    fontSize={16}
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    GOLD SPAWN
                  </text>

                  <rect
                    x={(ARENA_COLS - 5.5) * ARENA_GRID_SIZE}
                    y={2 * ARENA_GRID_SIZE}
                    width={2.5 * ARENA_GRID_SIZE}
                    height={10 * ARENA_GRID_SIZE}
                    rx={12}
                    fill="rgba(239, 68, 68, 0.10)"
                    stroke="rgba(239, 68, 68, 0.45)"
                    strokeDasharray="8 6"
                    strokeWidth={2}
                  />
                  <text
                    x={(ARENA_COLS - 4.25) * ARENA_GRID_SIZE}
                    y={1.6 * ARENA_GRID_SIZE}
                    textAnchor="middle"
                    fill="#f87171"
                    fontSize={16}
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    CRIMSON SPAWN
                  </text>

                  {/* Existing Wall Segments */}
                  {currentMapWalls.map((w) => {
                    const isDoor = w.type === 'door';
                    const isWindow = w.type === 'window';
                    const isOpenDoor = isDoor && w.doorState === 'open';
                    const strokeColor = isDoor
                      ? isOpenDoor
                        ? '#34d399'
                        : '#22d3ee'
                      : isWindow
                      ? '#60a5fa'
                      : '#f59e0b';

                    return (
                      <g
                        key={w.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (wallTool === 'erase') {
                            setWallsForSelectedMap(currentMapWalls.filter((item) => item.id !== w.id));
                          } else if (isDoor) {
                            setWallsForSelectedMap(
                              currentMapWalls.map((item) =>
                                item.id === w.id
                                  ? { ...item, doorState: item.doorState === 'open' ? 'closed' : 'open' }
                                  : item
                              )
                            );
                          }
                        }}
                        className="cursor-pointer"
                      >
                        {/* Hit target line */}
                        <line
                          x1={w.x1}
                          y1={w.y1}
                          x2={w.x2}
                          y2={w.y2}
                          stroke="transparent"
                          strokeWidth={22}
                        />
                        {/* Outer glow */}
                        <line
                          x1={w.x1}
                          y1={w.y1}
                          x2={w.x2}
                          y2={w.y2}
                          stroke="#000000"
                          strokeWidth={11}
                          strokeLinecap="round"
                          opacity={0.65}
                        />
                        {/* Main Wall Line */}
                        <line
                          x1={w.x1}
                          y1={w.y1}
                          x2={w.x2}
                          y2={w.y2}
                          stroke={strokeColor}
                          strokeWidth={7}
                          strokeLinecap="round"
                          strokeDasharray={isOpenDoor ? '8 8' : isWindow ? '12 6' : undefined}
                        />
                        <circle cx={w.x1} cy={w.y1} r={5} fill="#ffffff" stroke={strokeColor} strokeWidth={2} />
                        <circle cx={w.x2} cy={w.y2} r={5} fill="#ffffff" stroke={strokeColor} strokeWidth={2} />
                      </g>
                    );
                  })}

                  {/* Active Drag Preview Line */}
                  {dragStartPt && dragCurrentPt && (
                    <line
                      x1={dragStartPt.x}
                      y1={dragStartPt.y}
                      x2={dragCurrentPt.x}
                      y2={dragCurrentPt.y}
                      stroke={wallTool === 'door' ? '#22d3ee' : wallTool === 'window' ? '#60a5fa' : '#fbbf24'}
                      strokeWidth={7}
                      strokeDasharray="10 6"
                      strokeLinecap="round"
                    />
                  )}
                </svg>
              </div>

              <p className="text-[11px] font-mono text-zinc-400 mt-2 text-center">
                Click and drag on the battlemap to draw walls, cover, or doors. Click a Doorway to toggle Open/Closed, or select &ldquo;Click Wall to Delete&rdquo; to remove segments.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 2: ARENA MONSTER ROSTER & CUSTOM ENCOUNTER BUILDER
         ===================================================================== */}
      {activeSubTab === 'monsters' && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Side: Active DM Encounter Squad & Mode */}
          <div className="lg:col-span-6 border-r border-zinc-800/80 p-5 overflow-y-auto space-y-4">
            {/* Encounter Lock Mode Card */}
            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  {config.lockDmEncounter ? (
                    <Lock className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Unlock className="w-4 h-4 text-emerald-400" />
                  )}
                  <span className="text-xs font-mono font-bold text-white">
                    {config.lockDmEncounter
                      ? 'DM Locked Encounter (Fixed Boss / Squad)'
                      : 'Default Encounter Roster (Player Adjustable)'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  {config.lockDmEncounter
                    ? 'Players entering the Arena will face this exact DM-curated Monster Squad.'
                    : 'Seeds the Arena with this monster squad by default while allowing players to re-roll or customize.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  commitConfigUpdate(
                    (prev) => ({ ...prev, lockDmEncounter: !prev.lockDmEncounter }),
                    !config.lockDmEncounter
                      ? 'Locked Arena to DM Encounter Squad!'
                      : 'Unlocked Arena Encounter Roster for players'
                  )
                }
                className={`px-3 py-2 rounded-xl text-xs font-mono font-bold border shrink-0 cursor-pointer ${
                  config.lockDmEncounter
                    ? 'bg-rose-500 text-white border-rose-400'
                    : 'bg-zinc-950 text-zinc-300 border-zinc-700 hover:text-white'
                }`}
              >
                {config.lockDmEncounter ? 'Locked by DM' : 'Lock Roster'}
              </button>
            </div>

            {/* Active Monster Squad Header */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400">
                  Active Arena Monster Squad ({config.pinnedEncounterMonsters?.length || 0})
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Tweak individual monster HP & AC for the Arena below
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const activePool = allMonstersPool.filter(
                      (m) => !(config.disabledMonsterIds || []).includes(m.monsterId)
                    );
                    const rolled = generateScaledRandomEncounter(
                      2,
                      config.defaultDifficulty,
                      activePool
                    );
                    commitConfigUpdate(
                      (prev) => ({ ...prev, pinnedEncounterMonsters: rolled }),
                      'Rolled new balanced Arena Monster Squad!'
                    );
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Roll Squad</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomMonsterModal((v) => !v)}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Custom Boss</span>
                </button>
              </div>
            </div>

            {/* Custom Monster Creator Form */}
            {showCustomMonsterModal && (
              <div className="p-4 rounded-2xl bg-zinc-900 border border-rose-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-rose-300">
                    Create Custom Arena Monster / Boss
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCustomMonsterModal(false)}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    placeholder="Monster Name"
                    value={newMonName}
                    onChange={(e) => setNewMonName(e.target.value)}
                    className="col-span-2 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="CR (e.g. 5)"
                    value={newMonCr}
                    onChange={(e) => setNewMonCr(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                  />
                  <select
                    value={newMonSize}
                    onChange={(e) => setNewMonSize(e.target.value as any)}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                  >
                    <option value="Medium">Medium (1x1)</option>
                    <option value="Large">Large (2x2)</option>
                    <option value="Huge">Huge (3x3)</option>
                  </select>
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 mb-0.5">HP</label>
                    <input
                      type="number"
                      value={newMonHp}
                      onChange={(e) => setNewMonHp(parseInt(e.target.value, 10) || 10)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 mb-0.5">AC</label>
                    <input
                      type="number"
                      value={newMonAc}
                      onChange={(e) => setNewMonAc(parseInt(e.target.value, 10) || 10)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 mb-0.5">Attack Name</label>
                    <input
                      type="text"
                      value={newMonAtkName}
                      onChange={(e) => setNewMonAtkName(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 mb-0.5">Damage</label>
                    <input
                      type="text"
                      value={newMonDamage}
                      onChange={(e) => setNewMonDamage(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCreateCustomMonster}
                  className="w-full py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-mono font-bold text-xs cursor-pointer"
                >
                  Save & Add Custom Monster to Arena
                </button>
              </div>
            )}

            {/* Squad List */}
            <div className="space-y-2.5">
              {(config.pinnedEncounterMonsters || []).map((mon, idx) => (
                <div
                  key={`${mon.monsterId}_${idx}`}
                  className="p-3 rounded-2xl bg-zinc-900/90 border border-rose-500/30 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={
                        mon.avatarUrl ||
                        'https://www.dndbeyond.com/avatars/thumbnails/30783/955/1000/1000/638062024584880857.png'
                      }
                      alt={mon.name}
                      className="w-11 h-11 rounded-xl object-cover border border-rose-500/40 bg-zinc-950 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-mono font-bold text-white truncate">
                        {mon.name}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-400">
                        {mon.size} {mon.type} • CR {mon.challenge?.split(' ')[0] || '1'}
                      </div>
                    </div>
                  </div>

                  {/* Direct HP & AC Tweakers */}
                  <div className="flex items-center gap-2 ml-auto">
                    <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-1">
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">HP</span>
                      <button
                        type="button"
                        onClick={() =>
                          commitConfigUpdate((prev) => ({
                            ...prev,
                            pinnedEncounterMonsters: prev.pinnedEncounterMonsters.map((m, i) =>
                              i === idx ? { ...m, hp: Math.max(5, (m.hp || 30) - 10) } : m
                            )
                          }))
                        }
                        className="px-1.5 text-xs font-mono text-zinc-400 hover:text-white cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-xs font-mono font-bold text-white w-8 text-center">
                        {mon.hp}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          commitConfigUpdate((prev) => ({
                            ...prev,
                            pinnedEncounterMonsters: prev.pinnedEncounterMonsters.map((m, i) =>
                              i === idx ? { ...m, hp: (m.hp || 30) + 10 } : m
                            )
                          }))
                        }
                        className="px-1.5 text-xs font-mono text-zinc-400 hover:text-white cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-1">
                      <span className="text-[10px] font-mono text-amber-400 font-bold">AC</span>
                      <button
                        type="button"
                        onClick={() =>
                          commitConfigUpdate((prev) => ({
                            ...prev,
                            pinnedEncounterMonsters: prev.pinnedEncounterMonsters.map((m, i) =>
                              i === idx ? { ...m, ac: Math.max(8, (m.ac || 14) - 1) } : m
                            )
                          }))
                        }
                        className="px-1 text-xs font-mono text-zinc-400 hover:text-white cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-xs font-mono font-bold text-white w-6 text-center">
                        {mon.ac}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          commitConfigUpdate((prev) => ({
                            ...prev,
                            pinnedEncounterMonsters: prev.pinnedEncounterMonsters.map((m, i) =>
                              i === idx ? { ...m, ac: Math.min(28, (m.ac || 14) + 1) } : m
                            )
                          }))
                        }
                        className="px-1 text-xs font-mono text-zinc-400 hover:text-white cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        commitConfigUpdate((prev) => ({
                          ...prev,
                          pinnedEncounterMonsters: prev.pinnedEncounterMonsters.filter((_, i) => i !== idx)
                        }))
                      }
                      className="p-1.5 rounded-xl bg-zinc-950 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 border border-zinc-800 cursor-pointer"
                      title="Remove from squad"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side: Full Bestiary Browser & Pool Toggles */}
          <div className="lg:col-span-6 p-5 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                  Bestiary & Random Encounter Pool ({allMonstersPool.length})
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Add monsters to the Arena Squad or toggle whether they appear in Random Encounters
                </p>
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search monsters by name, type, or CR..."
                value={monsterSearch}
                onChange={(e) => setMonsterSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white"
              />
            </div>

            <div className="space-y-2">
              {filteredMonsters.map((mon) => {
                const isExcluded = (config.disabledMonsterIds || []).includes(mon.monsterId);
                return (
                  <div
                    key={mon.monsterId}
                    className={`p-2.5 rounded-2xl border flex items-center justify-between gap-3 ${
                      isExcluded
                        ? 'bg-zinc-950/60 border-zinc-900 opacity-55'
                        : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={
                          mon.avatarUrl ||
                          'https://www.dndbeyond.com/avatars/thumbnails/30783/955/1000/1000/638062024584880857.png'
                        }
                        alt={mon.name}
                        className="w-10 h-10 rounded-xl object-cover border border-zinc-700 bg-zinc-950 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-mono font-bold text-white truncate">
                          {mon.name}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400 truncate">
                          CR {mon.challenge?.split(' ')[0] || '1'} • HP {mon.hp} • AC {mon.ac} • {mon.size} {mon.type}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          commitConfigUpdate((prev) => {
                            const disabled = prev.disabledMonsterIds || [];
                            const nextDisabled = disabled.includes(mon.monsterId)
                              ? disabled.filter((id) => id !== mon.monsterId)
                              : [...disabled, mon.monsterId];
                            return { ...prev, disabledMonsterIds: nextDisabled };
                          })
                        }
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono border cursor-pointer ${
                          isExcluded
                            ? 'bg-zinc-950 border-zinc-800 text-zinc-500'
                            : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        }`}
                        title="Toggle whether this monster can be rolled in Random Encounters"
                      >
                        {isExcluded ? 'Excluded' : 'In Pool'}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          commitConfigUpdate(
                            (prev) => ({
                              ...prev,
                              pinnedEncounterMonsters: [...(prev.pinnedEncounterMonsters || []), mon]
                            }),
                            `Added ${mon.name} to Arena Squad!`
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 text-[11px] font-mono font-bold cursor-pointer transition-colors"
                      >
                        + Squad
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 3: ARENA RULES, DIFFICULTY & TACTICAL SETTINGS
         ===================================================================== */}
      {activeSubTab === 'settings' && (
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card 1: Default Match Mode & Difficulty */}
            <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Crown className="w-4 h-4" />
                <span>Default Arena Mode & Difficulty</span>
              </h3>

              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1.5">
                  Default Combat Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: 'random_encounter', label: 'Random Encounter' },
                      { id: 'vs_npcs', label: 'Party vs NPCs' },
                      { id: '1v1', label: '1v1 Duel' },
                      { id: '2v2', label: '2v2 Skirmish' }
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() =>
                        commitConfigUpdate((prev) => ({ ...prev, defaultMatchMode: m.id }))
                      }
                      className={`py-2 px-3 rounded-xl text-xs font-mono font-bold border cursor-pointer text-left ${
                        config.defaultMatchMode === m.id
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1.5">
                  Default Encounter Difficulty
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['standard', 'hard', 'deadly'] as const).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() =>
                        commitConfigUpdate((prev) => ({ ...prev, defaultDifficulty: diff }))
                      }
                      className={`py-2 px-3 rounded-xl text-xs font-mono font-bold uppercase border cursor-pointer ${
                        config.defaultDifficulty === diff
                          ? 'bg-rose-500 text-white border-rose-400'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 2: Monster Stat Scaling */}
            <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                <Skull className="w-4 h-4" />
                <span>Monster Stat Multipliers</span>
              </h3>

              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                  <span className="text-zinc-300">Monster HP Multiplier</span>
                  <span className="text-emerald-400 font-bold">
                    {Math.round(config.monsterHpMultiplier * 100)}%
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[0.5, 0.75, 1.0, 1.25, 1.5].map((mult) => (
                    <button
                      key={mult}
                      type="button"
                      onClick={() =>
                        commitConfigUpdate((prev) => ({ ...prev, monsterHpMultiplier: mult }))
                      }
                      className={`py-1.5 rounded-xl text-xs font-mono font-bold border cursor-pointer ${
                        config.monsterHpMultiplier === mult
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      {mult}x
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                  <span className="text-zinc-300">Monster Damage Multiplier</span>
                  <span className="text-rose-400 font-bold">
                    {Math.round(config.monsterDamageMultiplier * 100)}%
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[0.5, 0.75, 1.0, 1.25, 1.5].map((mult) => (
                    <button
                      key={mult}
                      type="button"
                      onClick={() =>
                        commitConfigUpdate((prev) => ({ ...prev, monsterDamageMultiplier: mult }))
                      }
                      className={`py-1.5 rounded-xl text-xs font-mono font-bold border cursor-pointer ${
                        config.monsterDamageMultiplier === mult
                          ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      {mult}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 3: Action Economy, Walls & Healing Rules */}
            <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-3.5">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Tactical Rules & Action Economy</span>
              </h3>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950 border border-zinc-800 cursor-pointer">
                <div>
                  <div className="text-xs font-mono font-bold text-white">
                    Enforce Arena Walls & Line of Sight
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Blocks movement and ranged attacks/spells through solid Arena walls
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.enforceWalls}
                  onChange={(e) =>
                    commitConfigUpdate((prev) => ({ ...prev, enforceWalls: e.target.checked }))
                  }
                  className="w-4 h-4 accent-amber-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950 border border-zinc-800 cursor-pointer">
                <div>
                  <div className="text-xs font-mono font-bold text-white">
                    Allow Arena Surge (2d8 + 4 Self-Heal Action)
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Grants all fighters a once-per-turn Second Wind style rally action
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.allowArenaSurge}
                  onChange={(e) =>
                    commitConfigUpdate((prev) => ({ ...prev, allowArenaSurge: e.target.checked }))
                  }
                  className="w-4 h-4 accent-amber-500"
                />
              </label>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
                <div>
                  <div className="text-xs font-mono font-bold text-white">
                    Starting Potions of Greater Healing
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Number of healing potions granted to each fighter (4d4 + 4 HP)
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3, 5].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() =>
                        commitConfigUpdate((prev) => ({ ...prev, startingPotionsCount: cnt }))
                      }
                      className={`w-7 h-7 rounded-lg text-xs font-mono font-bold border cursor-pointer ${
                        config.startingPotionsCount === cnt
                          ? 'bg-amber-500 text-zinc-950 border-amber-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 4: Environmental Hazards & Grid Opacity */}
            <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                <Flame className="w-4 h-4" />
                <span>Colosseum Hazards & Grid Display</span>
              </h3>

              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1.5">
                  Arena Environmental Effect (Each Round)
                </label>
                <div className="space-y-1.5">
                  {(
                    [
                      { id: 'none', label: 'None — Standard Colosseum Rules' },
                      { id: 'lava_eruption', label: '🌋 Lava Geysers (1d6 Fire dmg to grounded fighters)' },
                      { id: 'healing_sanctuary', label: '✨ Sanctuary Font (+1d4 HP restored each round)' },
                      { id: 'arcane_storm', label: '⚡ Arcane Tempest (+1d6 Bonus Crit Damage)' }
                    ] as const
                  ).map((hz) => (
                    <button
                      key={hz.id}
                      type="button"
                      onClick={() =>
                        commitConfigUpdate((prev) => ({ ...prev, environmentalHazard: hz.id }))
                      }
                      className={`w-full py-2 px-3 rounded-xl text-xs font-mono text-left border cursor-pointer ${
                        config.environmentalHazard === hz.id
                          ? 'bg-purple-500/20 border-purple-400 text-purple-200 font-bold'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {hz.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span className="text-zinc-300">Arena Grid Opacity</span>
                  <span className="text-amber-400">{Math.round(config.gridOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={config.gridOpacity}
                  onChange={(e) =>
                    commitConfigUpdate((prev) => ({
                      ...prev,
                      gridOpacity: parseFloat(e.target.value)
                    }))
                  }
                  className="w-full accent-amber-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
