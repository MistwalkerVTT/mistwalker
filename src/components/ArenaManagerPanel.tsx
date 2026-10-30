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
  Play,
  ArrowRight,
  CheckCircle2,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { Campaign, Scene, uploadAndRegisterAsset, subscribeToMonsters } from '../lib/firebase';
import { UploadedAsset, WallSegment } from '../types';
import { Monster } from '../types/monster';
import { DEFAULT_MONSTERS } from '../data/defaultMonsters';
import { PRESET_BATTLEMAPS, PresetBattlemap } from '../data/presetBattlemaps';
import { isUniversalVttFile, parseUniversalVtt } from '../services/universalVttService';
import {
  ArenaConfig,
  loadArenaConfig,
  saveArenaConfig,
  subscribeToArenaConfig,
  normalizeArenaWallSegment,
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
  onLoadScene?: (scene: Scene, campaignId: string, chapterId: string, targetView?: 'DM1' | 'DM2' | 'DM3') => void;
  onClose?: () => void;
  activeSceneInfo?: { campaignId: string; chapterId: string; sceneId: string } | null;
  currentWalls?: WallSegment[];
}

export const ArenaManagerPanel: React.FC<ArenaManagerPanelProps> = ({
  campaigns,
  savedMaps,
  onMapUploaded,
  onLaunchArenaPreview,
  onLoadScene,
  onClose,
  activeSceneInfo,
  currentWalls = []
}) => {
  const [config, setConfig] = useState<ArenaConfig>(() => loadArenaConfig());
  const [activeSubTab, setActiveSubTab] = useState<'maps_walls' | 'monsters' | 'settings'>('maps_walls');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Maps & Wall Editor State
  const allMaps = useMemo<PresetBattlemap[]>(() => {
    const merged: PresetBattlemap[] = [];
    const seen = new Set<string>();
    const deletedSet = new Set(config.deletedPresetMapIds || []);
    const presets = PRESET_BATTLEMAPS.filter((m) => !deletedSet.has(m.id));
    for (const m of [...presets, ...(config.customMaps || [])]) {
      if (!m || !m.id || seen.has(m.id)) continue;
      seen.add(m.id);
      merged.push(m);
    }
    return merged;
  }, [config.customMaps, config.deletedPresetMapIds]);

  const [selectedMapId, setSelectedMapId] = useState<string>(() => config.defaultMapId || PRESET_BATTLEMAPS[0].id);
  const selectedMap = useMemo(
    () => allMaps.find((m) => m.id === selectedMapId) || allMaps[0] || PRESET_BATTLEMAPS[0],
    [allMaps, selectedMapId]
  );

  const [isUploadingArenaMap, setIsUploadingArenaMap] = useState<boolean>(false);
  const [showAddUrlForm, setShowAddUrlForm] = useState<boolean>(false);
  const [customMapNameInput, setCustomMapNameInput] = useState<string>('');
  const [customMapUrlInput, setCustomMapUrlInput] = useState<string>('');
  const [customMapTypeInput, setCustomMapTypeInput] = useState<string>('Custom Arena');
  const [showSavedLibraryPicker, setShowSavedLibraryPicker] = useState<boolean>(false);
  const [showSceneImportPicker, setShowSceneImportPicker] = useState<boolean>(false);
  const [showCreateArenaModal, setShowCreateArenaModal] = useState<boolean>(false);
  const [createArenaName, setCreateArenaName] = useState<string>('');
  const [createArenaType, setCreateArenaType] = useState<string>('Colosseum / Arena');
  const [createArenaDesc, setCreateArenaDesc] = useState<string>('');
  const [createArenaWallPreset, setCreateArenaWallPreset] = useState<'none' | 'pillars' | 'divide' | 'barricades'>('pillars');
  const [createArenaAssetId, setCreateArenaAssetId] = useState<string>('');

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
    const normalized = nextWalls.map((w) => normalizeArenaWallSegment(w));
    commitConfigUpdate(
      (prev) => ({
        ...prev,
        mapWalls: {
          ...(prev.mapWalls || {}),
          [selectedMap.id]: normalized
        }
      }),
      toastMsg
    );
  };

  // Load the selected Arena Map directly onto the live VTT canvas for editing (just like Campaign Mode)
  const handleLaunchArenaMapLive = (mapItem: PresetBattlemap, targetView?: 'DM1' | 'DM2' | 'DM3') => {
    if (!onLoadScene) {
      toast.warning('Live VTT loader is not available in this context.');
      return;
    }
    const existingWalls = (config.mapWalls?.[mapItem.id] || []).map((w) => normalizeArenaWallSegment(w));
    const arenaScene: Scene = {
      sceneId: mapItem.id,
      sceneTitle: `Arena: ${mapItem.name}`,
      mapUrl: mapItem.url,
      mapThumbnailUrl: mapItem.thumbnailUrl || mapItem.url,
      mapWidth: ARENA_WIDTH,
      mapHeight: ARENA_HEIGHT,
      gridSize: ARENA_GRID_SIZE,
      gridOpacity: config.gridOpacity ?? 0.35,
      gridVisible: true,
      isFogVisible: false,
      walls: existingWalls,
      tokens: [],
      dmNotes: mapItem.desc || `Battle Arena Map: ${mapItem.name}`
    };

    onLoadScene(arenaScene, '__arena__', '__arena__', targetView);
    if (onClose) {
      onClose();
    }
  };

  // Pull walls currently placed on the live VTT canvas into the selected Arena Map
  const handlePullWallsFromCanvas = () => {
    const normalized = (currentWalls || []).map((w) => normalizeArenaWallSegment(w));
    setWallsForSelectedMap(
      normalized,
      `Pulled ${normalized.length} wall/door segments from the live VTT canvas into "${selectedMap.name}"!`
    );
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

  // Handle creating a brand new battle arena (with custom walls, presets, and background)
  const handleCreateCustomArena = (asset?: UploadedAsset) => {
    const finalName = createArenaName.trim() || asset?.name.replace(/\.[^/.]+$/, '') || 'Custom Battle Arena';
    const finalUrl = asset?.url || selectedMap?.url || PRESET_BATTLEMAPS[0]?.url || '';
    const finalThumb = asset?.thumbnailUrl || asset?.url || selectedMap?.thumbnailUrl || selectedMap?.url || '';
    const newId = `arena_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    let initialWalls: WallSegment[] = [];
    if (createArenaWallPreset === 'pillars') {
      initialWalls = generateColosseumPillarWalls();
    } else if (createArenaWallPreset === 'divide') {
      initialWalls = generateChokepointDivideWalls();
    } else if (createArenaWallPreset === 'barricades') {
      initialWalls = generateTacticalBarricadeWalls();
    }

    const newMap: PresetBattlemap = {
      id: newId,
      name: finalName,
      url: finalUrl,
      thumbnailUrl: finalThumb,
      type: createArenaType.trim() || 'Custom Arena',
      desc: createArenaDesc.trim() || 'Created by Dungeon Master in Battle Arena Manager',
      isCustomUploaded: true
    };

    commitConfigUpdate(
      (prev) => ({
        ...prev,
        defaultMapId: newId,
        customMaps: [...(prev.customMaps || []), newMap],
        mapWalls: initialWalls.length > 0
          ? { ...(prev.mapWalls || {}), [newId]: initialWalls }
          : prev.mapWalls
      }),
      `Created "${newMap.name}" Battle Arena!`
    );

    setSelectedMapId(newId);
    setCreateArenaName('');
    setCreateArenaDesc('');
    setCreateArenaAssetId('');
    setShowCreateArenaModal(false);
  };

  // Delete any Arena Map (custom maps removed from customMaps, preset maps added to deletedPresetMapIds)
  const handleDeleteArenaMap = (mapToDelete: PresetBattlemap) => {
    const isPreset = PRESET_BATTLEMAPS.some((pm) => pm.id === mapToDelete.id);
    const isCustom = (config.customMaps || []).some((cm) => cm.id === mapToDelete.id);

    commitConfigUpdate(
      (prev) => {
        const nextCustom = (prev.customMaps || []).filter((cm) => cm.id !== mapToDelete.id);
        const nextDeletedPresets = isPreset
          ? Array.from(new Set([...(prev.deletedPresetMapIds || []), mapToDelete.id]))
          : (prev.deletedPresetMapIds || []);
        
        // Find next viable fallback map
        const remainingMaps = allMaps.filter((m) => m.id !== mapToDelete.id);
        const nextDefault = prev.defaultMapId === mapToDelete.id
          ? (remainingMaps[0]?.id || PRESET_BATTLEMAPS.find((p) => !nextDeletedPresets.includes(p.id))?.id || '')
          : prev.defaultMapId;

        const nextMapWalls = { ...(prev.mapWalls || {}) };
        delete nextMapWalls[mapToDelete.id];

        return {
          ...prev,
          defaultMapId: nextDefault,
          customMaps: nextCustom,
          deletedPresetMapIds: nextDeletedPresets,
          mapWalls: nextMapWalls
        };
      },
      `Deleted arena "${mapToDelete.name}" from Battle Arena!`
    );

    const remainingMaps = allMaps.filter((m) => m.id !== mapToDelete.id);
    if (selectedMap.id === mapToDelete.id && remainingMaps.length > 0) {
      setSelectedMapId(remainingMaps[0].id);
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
            <span>1. Arena Maps</span>
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
                <button
                  type="button"
                  onClick={() => setShowCreateArenaModal(true)}
                  className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-[10px] font-mono font-bold flex items-center gap-1 shadow cursor-pointer transition-all active:scale-95"
                >
                  <Plus className="w-3 h-3" />
                  <span>Create Arena</span>
                </button>
              </div>

              <div className="space-y-2">
                {allMaps.map((m) => {
                  const isSel = selectedMap.id === m.id;
                  const isDefault = config.defaultMapId === m.id;
                  const isDisabled = (config.disabledMapIds || []).includes(m.id);
                  const wallCount = (config.mapWalls?.[m.id] || []).length;
                  const isLiveOnVtt = activeSceneInfo?.campaignId === '__arena__' && activeSceneInfo?.sceneId === m.id;

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
                          {isLiveOnVtt && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 text-[9px] font-mono font-bold shrink-0">
                              LIVE
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-2 mt-0.5">
                          <span>{wallCount} walls</span>
                          <span>•</span>
                          <span>{isDisabled ? 'Hidden' : 'Active'}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5" onClick={(e) => e.stopPropagation()}>
                          {onLoadScene && (
                            <button
                              type="button"
                              onClick={() => handleLaunchArenaMapLive(m)}
                              className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              title={`Load "${m.name}" onto the live VTT canvas to edit walls, doors, and lighting`}
                            >
                              <Play className="w-2.5 h-2.5 fill-white" />
                              <span>Load Live</span>
                            </button>
                          )}
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
                          <button
                            type="button"
                            onClick={() => handleDeleteArenaMap(m)}
                            className="p-1 rounded bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 cursor-pointer ml-auto transition-colors"
                            title={`Delete "${m.name}" from Battle Arena`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
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

          {/* Right Panel: Arena Map Inspector & Live VTT Loader (Campaign Mode Style) */}
          <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-zinc-950">
            {/* Arena Map Header & Primary Live Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-zinc-800">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 mb-1">
                  <span>Battle Arena Pool</span>
                  <span>/</span>
                  <span>{selectedMap.type || 'Arena Map'}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold font-mono text-white tracking-tight">
                    {selectedMap.name}
                  </h2>
                  {activeSceneInfo?.campaignId === '__arena__' && activeSceneInfo?.sceneId === selectedMap.id && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      LIVE ON VTT
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-zinc-400 mt-1">
                  <span className="text-emerald-400 font-medium">{currentMapWalls.length} walls/doors</span>
                  <span>•</span>
                  <span>22×14 Tactical Grid (1320×840)</span>
                </div>
              </div>

              {/* Campaign-Mode Live Editing Controls */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDeleteArenaMap(selectedMap)}
                  className="px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title={`Delete "${selectedMap.name}" from Battle Arena`}
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Delete Arena</span>
                </button>
                {onLoadScene && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleLaunchArenaMapLive(selectedMap)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-950/50 active:scale-95 cursor-pointer"
                      title="Load this Arena map onto the live VTT canvas to edit walls, doors, windows, and lighting just like in Campaign Mode"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Load Live to Edit</span>
                    </button>
                    {(['DM1', 'DM2', 'DM3'] as const).map((dmSlot) => (
                      <button
                        key={dmSlot}
                        type="button"
                        onClick={() => handleLaunchArenaMapLive(selectedMap, dmSlot)}
                        className="px-2.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 font-bold font-mono text-xs transition-all cursor-pointer"
                        title={`Load Arena Map into ${dmSlot} View`}
                      >
                        {dmSlot}
                      </button>
                    ))}
                  </div>
                )}

                {currentWalls && currentWalls.length > 0 && (
                  <button
                    type="button"
                    onClick={handlePullWallsFromCanvas}
                    disabled={isSaving}
                    className="px-3 py-2 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 disabled:opacity-50 text-blue-200 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Import walls and doors currently drawn on the live VTT canvas into this Arena map"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>Pull from Canvas ({currentWalls.length})</span>
                  </button>
                )}

                {currentMapWalls.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setWallsForSelectedMap([], `Cleared all walls on ${selectedMap.name}`)}
                    className="px-3 py-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 text-xs font-mono transition-all cursor-pointer"
                  >
                    Clear Walls ({currentMapWalls.length})
                  </button>
                )}
              </div>
            </div>

            {/* Arena Map Preview & Spawn Zones */}
            <div className="flex-1 flex flex-col items-center justify-center min-h-[380px]">
              <div
                onClick={() => onLoadScene && handleLaunchArenaMapLive(selectedMap)}
                className={`relative w-full max-w-[920px] aspect-[22/14] rounded-2xl overflow-hidden border-2 border-amber-500/50 shadow-2xl bg-zinc-900 select-none group ${
                  onLoadScene ? 'cursor-pointer' : ''
                }`}
                title="Click to load this Arena map onto the live VTT canvas for editing"
              >
                <img
                  src={selectedMap.url}
                  alt={selectedMap.name}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />

                <svg
                  viewBox={`0 0 ${ARENA_WIDTH} ${ARENA_HEIGHT}`}
                  className="absolute inset-0 w-full h-full pointer-events-none"
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

                  {/* Existing Wall Segments Preview */}
                  {currentMapWalls.map((w) => {
                    const wx1 = w.x1 ?? w.p1?.x ?? 0;
                    const wy1 = w.y1 ?? w.p1?.y ?? 0;
                    const wx2 = w.x2 ?? w.p2?.x ?? 0;
                    const wy2 = w.y2 ?? w.p2?.y ?? 0;
                    const wType = w.type || w.wallType || 'solid';
                    const isDoor = wType === 'door' || wType === 'secret_door';
                    const isWindow = wType === 'window' || wType === 'terrain';
                    const isOpenDoor = isDoor && (w.doorState === 'open' || w.isOpen);
                    const strokeColor = isDoor
                      ? isOpenDoor
                        ? '#34d399'
                        : '#22d3ee'
                      : isWindow
                      ? '#60a5fa'
                      : '#f59e0b';

                    return (
                      <g key={w.id}>
                        <line
                          x1={wx1}
                          y1={wy1}
                          x2={wx2}
                          y2={wy2}
                          stroke="#000000"
                          strokeWidth={11}
                          strokeLinecap="round"
                          opacity={0.65}
                        />
                        <line
                          x1={wx1}
                          y1={wy1}
                          x2={wx2}
                          y2={wy2}
                          stroke={strokeColor}
                          strokeWidth={7}
                          strokeLinecap="round"
                          strokeDasharray={isOpenDoor ? '8 8' : isWindow ? '12 6' : undefined}
                        />
                        <circle cx={wx1} cy={wy1} r={5} fill="#ffffff" stroke={strokeColor} strokeWidth={2} />
                        <circle cx={wx2} cy={wy2} r={5} fill="#ffffff" stroke={strokeColor} strokeWidth={2} />
                      </g>
                    );
                  })}
                </svg>

                {onLoadScene && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <div className="px-4 py-2.5 rounded-2xl bg-emerald-600/95 text-white font-mono font-bold text-xs flex items-center gap-2 shadow-2xl border border-emerald-400/50">
                      <Play className="w-4 h-4 fill-white" />
                      <span>Click to Load &ldquo;{selectedMap.name}&rdquo; Live on VTT to Edit</span>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-[11px] font-mono text-zinc-400 mt-2.5 text-center">
                Click <strong className="text-emerald-400">Load Live to Edit</strong> (or click the map preview) to open this Arena map on the live VTT canvas and edit walls, doors, windows, and obstacles using the full DM tools — changes automatically sync back to this Arena map.
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

      {/* Create New Battle Arena Modal */}
      {showCreateArenaModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-amber-500/30 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-mono text-white">Create New Battle Arena</h3>
                  <p className="text-xs text-zinc-400 font-sans">Configure name, background battlemap, and tactical wall layout</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateArenaModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-zinc-400 mb-1 font-bold">Arena Name</label>
                <input
                  type="text"
                  placeholder="e.g. Pit of the Blood Moon"
                  value={createArenaName}
                  onChange={(e) => setCreateArenaName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-bold">Arena Type / Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. Colosseum / Boss"
                    value={createArenaType}
                    onChange={(e) => setCreateArenaType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 font-bold">Wall Architecture Preset</label>
                  <select
                    value={createArenaWallPreset}
                    onChange={(e) => setCreateArenaWallPreset(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="pillars">4 Tactical Pillars</option>
                    <option value="divide">Central Chokepoint Divide</option>
                    <option value="barricades">Tactical Cover Barricades</option>
                    <option value="none">Open Arena (No Walls)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-bold">Arena Description / Lore</label>
                <textarea
                  rows={2}
                  placeholder="Brief description or hazard cues for players..."
                  value={createArenaDesc}
                  onChange={(e) => setCreateArenaDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white font-sans focus:outline-none focus:border-amber-400 resize-none text-xs"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-bold">Background Battlemap</label>
                <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1.5 rounded-xl bg-zinc-950 border border-zinc-800">
                  {savedMaps.map((sm) => {
                    const isSelected = createArenaAssetId === sm.assetId;
                    return (
                      <div
                        key={sm.assetId}
                        onClick={() => {
                          setCreateArenaAssetId(sm.assetId);
                          if (!createArenaName) setCreateArenaName(sm.name.replace(/\.[^/.]+$/, ''));
                        }}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          isSelected ? 'bg-amber-500/20 border-amber-400' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <img
                          src={sm.thumbnailUrl || sm.url}
                          alt={sm.name}
                          className="w-full h-12 rounded object-cover"
                        />
                        <span className="text-[10px] text-zinc-300 truncate w-full text-center">{sm.name}</span>
                      </div>
                    );
                  })}
                  {savedMaps.length === 0 && (
                    <div className="col-span-3 text-center py-3 text-[11px] text-zinc-500">
                      No uploaded maps found. Will use standard tactical backdrop.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowCreateArenaModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const asset = savedMaps.find((m) => m.assetId === createArenaAssetId);
                  handleCreateCustomArena(asset);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-mono font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create & Open Arena</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
                      { id: 'random_encounter', label: 'Random Encounter (1–6P)' },
                      { id: 'vs_npcs', label: 'Party vs NPCs (1–6P)' },
                      { id: '1v1', label: '1v1 Duel' },
                      { id: '2v2', label: '2v2 Skirmish' },
                      { id: '3v3', label: '3v3 Clash' },
                      { id: '4v4', label: '4v4 Squad Brawl' },
                      { id: '6v6', label: '6v6 Grand Melee' }
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
