import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Character } from '../types/character';
import { DEFAULT_CHARACTERS, getCharacterTokenUrl } from '../data/defaultCharacters';
import {
  Map as MapIcon,
  Upload,
  Monitor,
  ExternalLink,
  Swords,
  Zap,
  Eye,
  EyeOff,
  Trash2,
  Grid3X3,
  Move,
  Eraser,
  Scissors,
  Ruler,
  Sparkles,
  Infinity as InfinityIcon,
  HelpCircle,
  Users,
  Disc,
  AlertCircle,
  Dices,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle as CircleIcon,
  Square as SquareIcon,
  Wind,
  Flame,
  Snowflake,
  Heart,
  HeartCrack,
  Sun,
  Moon,
  Shield,
  Cloud,
  Wand2,
  Scan,
  Book,
  BookOpen,
  Volume2,
  VolumeX,
  X,
  Pin,
  Sliders,
  Layers,
  Save,
  FolderOpen,
  MousePointer,
  CloudUpload,
  RefreshCw,
  Video,
  Waves,
  CloudRain,
  Bug,
  FileText,
  Droplets,
  Play,
  Pause,
  Radio,
  Plus,
  Maximize2,
  Check,
  Compass,
  DoorClosed,
  DoorOpen,
  Magnet,
  MapPin,
  Pentagon,
  Search,
  User,
  Skull,
  Filter,
  GripHorizontal,
  Share2,
  Key,
  Copy,
  Download,
  FileCode2,
  Tv,
  Settings,
  Tag,
  Scroll,
  Music
} from 'lucide-react';
import { LABEL_GLYPHS } from './RoomHotspotLayer';
import { isUniversalVttFile } from '../services/universalVttService';
import {
  UploadedAsset,
  AnimatedFeature,
  AnimatedFeatureType,
  WeatherEffectType,
  MapSizePresetKey,
  MAP_SIZE_PRESETS,
  WallSegment,
  WallType,
  DoorState,
  VisionConfig,
  CampaignMode,
  RoomAnnotation,
  isMonsterToken,
  NarrationVoice,
  NARRATION_VOICES
} from '../types';
import { Monster, getSizeMultiplier } from '../types/monster';
import { DEFAULT_MONSTERS } from '../data/defaultMonsters';
import { Ally } from '../types/ally';
import { DEFAULT_ALLIES } from '../data/defaultAllies';

import { PRESET_BATTLEMAPS, PresetBattlemap } from '../data/presetBattlemaps';
import { toast } from 'sonner';
import { HelpDrawer } from './HelpDrawer';
import { EffectsDrawer, Jb2aAssetDefinition } from '../effects';

interface LeftSidebarProps {
  isPlayerView?: boolean;
  activeMapId: 'DM1' | 'DM2' | 'DM3';
  liveMapId?: 'DM1' | 'DM2' | 'DM3';
  onForceSync?: () => void;
  handleMapSwitch: (id: 'DM1' | 'DM2' | 'DM3') => void;
  onClearMapSlot?: (id?: 'DM1' | 'DM2' | 'DM3') => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRelinkMap?: () => void;
  showCombatTracker: boolean;
  setShowCombatTracker: (show: boolean) => void;
  autoApplyMonsterDamage?: boolean;
  onToggleAutoApplyMonsterDamage?: (enabled: boolean) => void;
  triggerShake: () => void;
  isFogVisible: boolean;
  setIsFogVisible: (visible: boolean) => void;
  resetFog: () => void;
  gridVisible: boolean;
  setGridVisible: (visible: boolean) => void;
  gridOpacity: number;
  setGridOpacity: (opacity: number) => void;
  gridSize: number;
  setGridSize: (size: number) => void;
  gridOffsetX: number;
  setGridOffsetX: React.Dispatch<React.SetStateAction<number>>;
  gridOffsetY: number;
  setGridOffsetY: React.Dispatch<React.SetStateAction<number>>;
  sidebarMode: 'user' | 'ai';
  setSidebarMode: (mode: 'user' | 'ai') => void;
  tool: string;
  setTool: (tool: any) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  setCurrentPolygonPoints: (pts: number[]) => void;
  measureType: 'line' | 'square' | 'cone' | 'rectangle' | 'circle';
  setMeasureType: (type: any) => void;
  activeMenu: string | null;
  setActiveMenu: (menu: any) => void;
  menuAnchor: { top: number; bottom: number };
  handleToolMenuToggle: (tool: string, e: React.MouseEvent) => void;
  handleMenuClick: (menu: any, e: React.MouseEvent) => void;
  tokens: any[];
  setTokens: React.Dispatch<React.SetStateAction<any[]>>;
  customTokens: { id?: string; name: string; url: string; size: number }[];
  setCustomTokens: React.Dispatch<React.SetStateAction<{ id?: string; name: string; url: string; size: number }[]>>;
  handleTokenUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedUploadSize: number;
  setSelectedUploadSize: (size: number) => void;
  tokenFileInputRef: React.RefObject<HTMLInputElement>;
  stagePos: { x: number; y: number };
  stageScale: number;
  auraColor: string;
  setAuraColor: (col: string) => void;
  dicePool: string[];
  addDiceToPool: (die: string) => void;
  clearDicePool: () => void;
  rollDicePool: () => void;
  diceHistory: any[];
  setShowCinematicMapGenerator: (show: boolean) => void;
  setShowLoreLedger?: (show: boolean) => void;
  setShowAutoDM?: (show: boolean) => void;
  onOpenApiKeyModal?: () => void;
  hasApiKey?: boolean;
  showDndChatbot?: boolean;
  setShowDndChatbot?: (show: boolean) => void;
  selectedAIVoice: string;
  setSelectedAIVoice: (voice: string) => void;
  aiVoicePrompt: string;
  setAIVoicePrompt: (prompt: string) => void;
  aiVoiceScript: string;
  setAIVoiceScript: (script: string) => void;
  handleGenerateAIScript: () => void;
  handleSpeakAIVoice: () => void;
  isGeneratingScript: boolean;
  isPlayingAudio: boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  availableTokens: { name: string; url: string; size?: number; category?: 'character' | 'monster' | 'ally' | 'custom' }[];
  conditions: { name: string; url: string }[];
  voices?: NarrationVoice[] | any[];
  onOpenCampaignBuilder?: () => void;
  onOpenSaveCampaign?: () => void;
  onOpenLoadCampaign?: () => void;
  onOpenMonsterCompendium?: (initialSearch?: string) => void;
  onOpenCharacterCompendium?: (initialSearch?: string) => void;
  onOpenAlliesCompendium?: (initialSearch?: string) => void;
  onOpenDdbSync?: () => void;
  compendiumMonsters?: Monster[];
  compendiumCharacters?: Character[];
  compendiumAllies?: Ally[];
  selectedTokenIds?: string[];
  activeSceneInfo?: { campaignId: string; chapterId: string; sceneId: string; sceneTitle: string; mapUrl?: string; mapWidth?: number; mapHeight?: number } | null;
  onQuickSave?: () => void;
  isQuickSaving?: boolean;
  uploadedMaps?: UploadedAsset[];
  onSelectUploadedMap?: (mapAsset: UploadedAsset) => void;
  onSelectPresetMap?: (preset: PresetBattlemap) => void;
  onDeleteUploadedAsset?: (assetId: string) => void;
  onDeleteCustomToken?: (assetId: string) => void;
  isReadingFile?: boolean;
  isUploadingToken?: boolean;
  // Animated Environmental FX, Weather & Tactical Map Scale Props
  boardAnimatedFeatures?: AnimatedFeature[];
  setBoardAnimatedFeatures?: React.Dispatch<React.SetStateAction<AnimatedFeature[]>>;
  boardAnimatedEnabled?: boolean;
  setBoardAnimatedEnabled?: React.Dispatch<React.SetStateAction<boolean>>;
  boardWeatherEffect?: WeatherEffectType;
  setBoardWeatherEffect?: React.Dispatch<React.SetStateAction<WeatherEffectType>>;
  boardPlacingAnimatedType?: AnimatedFeatureType | null;
  setBoardPlacingAnimatedType?: (type: AnimatedFeatureType | null) => void;
  showBoardAnimatedControls?: boolean;
  setShowBoardAnimatedControls?: React.Dispatch<React.SetStateAction<boolean>>;
  getMapDimensions?: () => { width: number; height: number };
  onDuplicateFeature?: (feature: AnimatedFeature) => void;
  onStartStampingFeature?: (feature: AnimatedFeature) => void;
  // Wall & FOV Props
  walls?: WallSegment[];
  setWalls?: React.Dispatch<React.SetStateAction<WallSegment[]>>;
  selectedWallId?: string | null;
  setSelectedWallId?: (id: string | null) => void;
  activeWallType?: WallType;
  setActiveWallType?: (type: WallType) => void;
  activeDoorState?: DoorState;
  setActiveDoorState?: (state: DoorState) => void;
  snapToGridWalls?: boolean;
  setSnapToGridWalls?: (snap: boolean) => void;
  visionConfig?: VisionConfig;
  setVisionConfig?: React.Dispatch<React.SetStateAction<VisionConfig>>;
  onGeneratePresetRoom?: () => void;
  onClearWalls?: () => void;
  onDeleteWall?: (id: string) => void;
  onSplitWall?: (id: string, splitPoint?: { x: number; y: number }) => void;
  onUpdateTokenVision?: (tokenId: string, updates: { visionRadius?: number; visionAngle?: number }) => void;
  campaignMode?: CampaignMode;
  setCampaignMode?: (mode: CampaignMode) => void;
  roomAnnotations?: RoomAnnotation[];
  onAddHotspot?: () => void;
  onOpenZoneDetails?: (zone: RoomAnnotation) => void;
  onDeleteZoneAnnotation?: (zoneId: string) => void;
  onHoverZone?: (zoneId: string | null) => void;
  currentMapImage?: string;
  onExportUniversalVtt?: () => void;
  onImportUniversalVtt?: (file: File) => void;
  onOpenBugReport?: () => void;
  onOpenBugManager?: () => void;
  onOpenSettings?: (tab?: 'cobalt' | 'ai' | 'danger') => void;
  activeEquippedAsset?: Jb2aAssetDefinition | null;
  onEquipAsset?: (asset: Jb2aAssetDefinition) => void;
  onQuickPlaceAsset?: (asset: Jb2aAssetDefinition) => void;
  onClearEffects?: () => void;
  onDispelEffect?: (effectId: string) => void;
  activeEffects?: any[];
  onReturnHome?: () => void;
  isAtHome?: boolean;
  onPromptRollInitiative?: () => void;
  onOpenCriticalHitsModal?: () => void;
  onOpenHandoutsJournal?: () => void;
  hasUnreadHandouts?: boolean;
  onOpenAudioMixer?: () => void;
  activeAudioLoopCount?: number;
}

type GroupMenuId = 'maps' | 'zones' | 'fog-grid' | 'lighting' | 'combat' | 'fx' | 'spells' | 'tokens' | 'dice' | 'ai' | 'help';

export const LeftSidebar: React.FC<LeftSidebarProps> = React.memo(({
  isPlayerView,
  onReturnHome,
  isAtHome,
  onPromptRollInitiative,
  onOpenCriticalHitsModal,
  onOpenHandoutsJournal,
  hasUnreadHandouts,
  onOpenAudioMixer,
  activeAudioLoopCount = 0,
  activeMapId,
  liveMapId,
  onForceSync,
  activeEquippedAsset,
  onEquipAsset,
  onQuickPlaceAsset,
  onClearEffects,
  onDispelEffect,
  activeEffects,
  handleMapSwitch,
  onClearMapSlot,
  handleFileUpload,
  onRelinkMap,
  showCombatTracker,
  setShowCombatTracker,
  autoApplyMonsterDamage = true,
  onToggleAutoApplyMonsterDamage,
  triggerShake,
  isFogVisible,
  setIsFogVisible,
  resetFog,
  gridVisible,
  setGridVisible,
  gridOpacity,
  setGridOpacity,
  gridSize,
  setGridSize,
  gridOffsetX,
  setGridOffsetX,
  gridOffsetY,
  setGridOffsetY,
  tool,
  setTool,
  brushSize,
  setBrushSize,
  setCurrentPolygonPoints,
  measureType,
  setMeasureType,
  tokens,
  setTokens,
  customTokens,
  handleTokenUpload,
  selectedUploadSize,
  setSelectedUploadSize,
  tokenFileInputRef,
  stagePos,
  stageScale,
  auraColor,
  setAuraColor,
  dicePool,
  addDiceToPool,
  clearDicePool,
  rollDicePool,
  diceHistory,
  setShowCinematicMapGenerator,
  setShowLoreLedger,
  setShowAutoDM,
  onOpenApiKeyModal,
  hasApiKey,
  showDndChatbot,
  setShowDndChatbot,
  selectedAIVoice,
  setSelectedAIVoice,
  aiVoicePrompt,
  setAIVoicePrompt,
  aiVoiceScript,
  setAIVoiceScript,
  handleGenerateAIScript,
  handleSpeakAIVoice,
  isGeneratingScript,
  isPlayingAudio,
  zoomIn,
  zoomOut,
  availableTokens,
  conditions,
  voices,
  onOpenCampaignBuilder,
  onOpenSaveCampaign,
  onOpenLoadCampaign,
  onOpenMonsterCompendium,
  onOpenCharacterCompendium,
  onOpenAlliesCompendium,
  onOpenDdbSync,
  compendiumMonsters = [],
  compendiumCharacters = [],
  compendiumAllies = [],
  selectedTokenIds = [],
  activeSceneInfo,
  onQuickSave,
  isQuickSaving = false,
  uploadedMaps = [],
  onSelectUploadedMap,
  onSelectPresetMap,
  onDeleteUploadedAsset,
  onDeleteCustomToken,
  isReadingFile = false,
  isUploadingToken = false,
  boardAnimatedFeatures = [],
  setBoardAnimatedFeatures,
  boardAnimatedEnabled = true,
  setBoardAnimatedEnabled,
  boardWeatherEffect = 'none',
  setBoardWeatherEffect,
  boardPlacingAnimatedType = null,
  setBoardPlacingAnimatedType,
  showBoardAnimatedControls = false,
  setShowBoardAnimatedControls,
  getMapDimensions,
  onDuplicateFeature,
  onStartStampingFeature,
  walls = [],
  setWalls,
  selectedWallId = null,
  setSelectedWallId,
  activeWallType = 'normal',
  setActiveWallType,
  activeDoorState = 'closed',
  setActiveDoorState,
  snapToGridWalls = false,
  setSnapToGridWalls,
  visionConfig = {
    enabled: true,
    explorationMemory: true,
    darknessOpacity: 1.0,
    dimVisionOpacity: 0.5,
    ambientLight: false,
    dmPreviewMode: false
  },
  setVisionConfig,
  onGeneratePresetRoom,
  onClearWalls,
  onDeleteWall,
  onSplitWall,
  onUpdateTokenVision,
  campaignMode = 'run',
  setCampaignMode,
  roomAnnotations = [],
  onAddHotspot,
  onOpenZoneDetails,
  onDeleteZoneAnnotation,
  onHoverZone,
  currentMapImage,
  onExportUniversalVtt,
  onImportUniversalVtt,
  onOpenBugReport,
  onOpenBugManager,
  onOpenSettings
}) => {
  const mapFileInputRef = useRef<HTMLInputElement>(null);
  const uvttFileInputRef = useRef<HTMLInputElement>(null);
  const [hoveredGroup, setHoveredGroup] = useState<GroupMenuId | null>(null);
  const [pinnedGroup, setPinnedGroup] = useState<GroupMenuId | null>(null);
  const [pinnedPosition, setPinnedPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingFlyout, setIsDraggingFlyout] = useState(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [menuTop, setMenuTop] = useState<number>(100);
  const [confirmClearWalls, setConfirmClearWalls] = useState(false);
  const [showWallSectionsList, setShowWallSectionsList] = useState(false);
  const [tokenCategoryFilter, setTokenCategoryFilter] = useState<'all' | 'characters' | 'monsters' | 'allies' | 'custom'>('all');
  const [tokenSearchQuery, setTokenSearchQuery] = useState<string>('');
  const [ddbPartyCharacters, setDdbPartyCharacters] = useState<any[]>([]);
  const [isLoadingDdbParty, setIsLoadingDdbParty] = useState(false);

  const fetchDdbSyncStatus = useCallback(async () => {
    try {
      setIsLoadingDdbParty(true);
      const res = await fetch('/api/ddb/campaigns/sync-status');
      const data = await res.json();
      const cached = data?.status?.cachedCharacters;
      if (Array.isArray(cached)) {
        // Filter out obsolete static placeholder mock IDs so ONLY real DDB campaign heroes show
        const filtered = cached.filter((c: any) => !['146614740', '147334187', '158502126', '146533824'].includes(String(c.id)));
        setDdbPartyCharacters(filtered);
      }
    } catch (err) {
      console.warn('[LeftSidebar] Could not fetch DDB party status:', err);
    } finally {
      setIsLoadingDdbParty(false);
    }
  }, []);
  const [lightingSubTab, setLightingSubTab] = useState<'lighting' | 'fog' | 'grid' | 'zones'>('lighting');
  const [fxCategory, setFxCategory] = useState<'spells' | 'tactical'>('spells');
  const [fxSubTab, setFxSubTab] = useState<'features' | 'weather' | 'scale'>('features');
  const [selectedScalePreset, setSelectedScalePreset] = useState<MapSizePresetKey>('medium');
  const [customCols, setCustomCols] = useState<number>(30);
  const [customRows, setCustomRows] = useState<number>(20);
  const [scaleFeedback, setScaleFeedback] = useState<string | null>(null);
  const [editingFeatureId, setEditingFeatureId] = useState<string | null>(null);
  const [showPresetMapsGallery, setShowPresetMapsGallery] = useState<boolean>(false);
  const [confirmDeleteMapId, setConfirmDeleteMapId] = useState<string | null>(null);
  const [mapsTab, setMapsTab] = useState<'session' | 'library'>('session');
  const [openMapsSections, setOpenMapsSections] = useState<Record<string, boolean>>({
    campaign: false,
    slots: false,
    presets: false,
    firebase: true,
    actions: false,
  });

  const toggleMapsSection = (sectionKey: string) => {
    setOpenMapsSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };
  const [confirmDeleteTokenId, setConfirmDeleteTokenId] = useState<string | null>(null);
  const [isEditingGridSize, setIsEditingGridSize] = useState(false);
  const [customGridSizeInput, setCustomGridSizeInput] = useState(String(gridSize));
  const [collapseCustomTokens, setCollapseCustomTokens] = useState(true);
  const [collapseCharacters, setCollapseCharacters] = useState(false);
  const [collapseMonsters, setCollapseMonsters] = useState(true);
  const [collapseAllies, setCollapseAllies] = useState(true);
  const closeTimeoutRef = useRef<any>(null);

  // Dragging event listener for pinned flyout window
  useEffect(() => {
    if (!isDraggingFlyout) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragOffsetRef.current.x;
      const newY = e.clientY - dragOffsetRef.current.y;
      const maxX = Math.max(10, window.innerWidth - 280);
      const maxY = Math.max(10, window.innerHeight - 100);
      const clampedX = Math.max(8, Math.min(maxX, newX));
      const clampedY = Math.max(8, Math.min(maxY, newY));
      setPinnedPosition({ x: clampedX, y: clampedY });
    };

    const handleMouseUp = () => {
      setIsDraggingFlyout(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingFlyout]);

  useEffect(() => {
    if (tool === 'zone' || tool === 'polygon_zone' || tool === 'hotspot') {
      setLightingSubTab('zones');
    } else if (tool === 'reveal' || tool === 'polygon_reveal') {
      setLightingSubTab('fog');
    } else if (tool === 'wall') {
      setLightingSubTab('lighting');
    }
  }, [tool]);

  const handleDragStart = (e: React.MouseEvent) => {
    if (!pinnedGroup) return;
    if ((e.target as HTMLElement).closest('button, input, select, textarea, a, label, [role="button"]')) {
      return;
    }
    e.preventDefault();
    setIsDraggingFlyout(true);
    const currentX = pinnedPosition?.x ?? 72;
    const currentY = pinnedPosition?.y ?? Math.max(12, Math.min(menuTop - 24, window.innerHeight - 560));
    dragOffsetRef.current = {
      x: e.clientX - currentX,
      y: e.clientY - currentY
    };
  };

  const handleCalibrateGrid = (presetKey: MapSizePresetKey) => {
    if (!getMapDimensions) return;
    const { width: mapWidth, height: mapHeight } = getMapDimensions();
    if (!mapWidth || mapWidth <= 0) {
      setScaleFeedback('Please load or upload a map first to calibrate scale.');
      setTimeout(() => setScaleFeedback(null), 3500);
      return;
    }
    let targetCols = 30;
    let targetRows = 20;
    let label = 'Medium Encounter';
    if (presetKey === 'custom') {
      targetCols = Math.max(5, customCols);
      targetRows = Math.max(5, customRows);
      label = `Custom (${targetCols}×${targetRows})`;
    } else {
      const preset = MAP_SIZE_PRESETS[presetKey];
      targetCols = preset.width;
      targetRows = preset.height;
      label = preset.label;
    }
    const newGridSize = Math.max(10, Math.round(mapWidth / targetCols));
    setGridSize(newGridSize);
    setGridVisible(true);
    const totalFtW = targetCols * 5;
    const totalFtH = targetRows * 5;
    setScaleFeedback(`Grid calibrated to ${label}: ${targetCols}×${targetRows} squares (${totalFtW}×${totalFtH} ft) at ${newGridSize}px/square!`);
    setTimeout(() => setScaleFeedback(null), 4500);
  };

  const activeGroup = pinnedGroup || hoveredGroup;

  // Sync D&D Beyond party characters when tokens tray is opened
  useEffect(() => {
    if (activeGroup === 'tokens') {
      fetchDdbSyncStatus();
    }
  }, [activeGroup, fetchDdbSyncStatus]);

  const handleMouseEnter = (groupId: GroupMenuId, e: React.MouseEvent) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuTop(rect.top);
    setHoveredGroup(groupId);
  };

  const handleMouseLeave = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredGroup(null);
    }, 320);
  };

  const handleFlyoutMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleFlyoutMouseLeave = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredGroup(null);
    }, 200);
  };

  const togglePinGroup = (groupId: GroupMenuId, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (pinnedGroup === groupId) {
      setPinnedGroup(null);
      setPinnedPosition(null);
    } else {
      setPinnedGroup(groupId);
      setHoveredGroup(groupId);
      if (!pinnedPosition) {
        setPinnedPosition({
          x: 72,
          y: Math.max(12, Math.min(menuTop - 24, window.innerHeight - 560))
        });
      }
    }
  };

  const handleGroupClick = (groupId: GroupMenuId, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const topPos = rect.top;
    setMenuTop(topPos);
    if (pinnedGroup === groupId) {
      setPinnedGroup(null);
      setHoveredGroup(null);
      setPinnedPosition(null);
    } else {
      setPinnedGroup(groupId);
      setHoveredGroup(groupId);
      if (!pinnedPosition) {
        setPinnedPosition({
          x: 72,
          y: Math.max(12, Math.min(topPos - 24, window.innerHeight - 560))
        });
      }
    }
  };

  const closeFlyout = () => {
    setPinnedGroup(null);
    setHoveredGroup(null);
    setPinnedPosition(null);
  };

  if (isPlayerView) return null;

  // Active state indicators
  const isFogActive = isFogVisible;
  const isGridActive = gridVisible;
  const isCombatActive = showCombatTracker;
  const isTokensActive = tool === 'aura';
  const isAIActive = tool === 'ai-describe';

  return (
    <div
      id="left-sidebar-container"
      className="w-16 bg-zinc-950/98 backdrop-blur-xl border-r border-zinc-800/90 flex flex-col z-50 shadow-2xl h-full select-none shrink-0 relative text-zinc-300"
    >
      {/* Brand Icon */}
      <div className="flex flex-col items-center py-1.5 border-b border-zinc-800/80 shrink-0">
        <div
          id="mistwalker-brand-icon"
          onClick={() => {
            setPinnedGroup(null);
            setHoveredGroup(null);
            setPinnedPosition(null);
            onReturnHome?.();
          }}
          className={`w-11 h-11 rounded-xl overflow-hidden border ${isAtHome ? 'border-amber-500 bg-amber-950/30 shadow-[0_0_12px_rgba(245,158,11,0.35)]' : 'border-zinc-700/70 bg-zinc-900 hover:border-amber-500/60 hover:shadow-[0_0_12px_rgba(245,158,11,0.25)]'} flex items-center justify-center cursor-pointer transition-all shadow-md active:scale-95 group`}
          title={isAtHome ? 'MistWalker Home Hub (Active)' : 'Return to MistWalker Home Screen'}
        >
          <img
            src="https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/blob-c3567a0.png/:/rs=w:1440,h:1440"
            alt="MistWalker"
            className="w-8 h-8 object-contain transition-transform group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* Direct Tool 1: Select Tool (1-Click Toggle) */}
      <div className="flex flex-col items-center gap-0.5 py-1.5 border-b border-zinc-800/80 shrink-0 w-full px-1.5">
        <button
          id="tool-select-direct"
          onClick={() => setTool(tool === 'select' ? 'pan' : 'select')}
          className={`w-11 h-10 rounded-xl flex items-center justify-center transition-all relative ${
            tool === 'select'
              ? 'bg-amber-500/25 text-amber-300 border border-amber-500/60 shadow-[0_0_14px_rgba(245,158,11,0.4)]'
              : 'text-zinc-400 hover:text-amber-300 hover:bg-zinc-850 hover:border hover:border-zinc-700/60'
          }`}
          title={tool === 'select' ? "Select Tool Active (Click to switch to Pan)" : "Select & Move Objects (Click and drag tokens & items placed on board)"}
        >
          <MousePointer className="w-5.5 h-5.5" />
          {selectedTokenIds && selectedTokenIds.length > 0 && (
            <span className="absolute -top-1 -right-1 px-1 min-w-[15px] h-[15px] rounded-full bg-amber-500 text-zinc-950 text-[9px] font-bold font-mono flex items-center justify-center shadow">
              {selectedTokenIds.length}
            </span>
          )}
        </button>

        {/* Direct Tool 2: Pan Tool (1-Click Toggle) */}
        <button
          id="tool-pan-direct"
          onClick={() => setTool(tool === 'pan' ? 'select' : 'pan')}
          className={`w-11 h-10 rounded-xl flex items-center justify-center transition-all ${
            tool === 'pan'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-600 shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-850 hover:border hover:border-zinc-700/60'
          }`}
          title={tool === 'pan' ? "Pan Tool Active (Click to switch to Select)" : "Pan / Move Map (Click to activate)"}
        >
          <Move className="w-5.5 h-5.5" />
        </button>
      </div>

      {/* Main Condensed Tool Categories (Scrollable for any screen height) */}
      <div
        id="sidebar-tools-scroll"
        className="flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col items-center py-1.5 gap-0.5 px-1.5 sidebar-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* 1. Campaign & Maps Group */}
        <div className="relative group shrink-0">
          <button
            id="group-btn-maps"
            onMouseEnter={(e) => handleMouseEnter('maps', e)}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => handleGroupClick('maps', e)}
            className={`w-11 h-10 rounded-xl flex items-center justify-center transition-all relative ${
              activeGroup === 'maps'
                ? 'bg-emerald-500/25 text-emerald-400 border border-emerald-500/60 shadow-[0_0_14px_rgba(16,185,129,0.35)]'
                : 'text-zinc-400 hover:text-emerald-300 hover:bg-zinc-850 hover:border hover:border-zinc-700/60'
            }`}
            title="Campaign & Maps"
          >
            <MapIcon className="w-5.5 h-5.5" />
            {/* Live slot indicator badge */}
            <span className="absolute -top-0.5 -right-0.5 px-1 py-0.2 rounded-full bg-emerald-500 text-[8px] font-bold font-mono text-zinc-950 shadow-sm leading-tight">
              {activeMapId}
            </span>
          </button>
        </div>

        {/* 2. Tokens & Bestiary Group */}
        <div className="relative group shrink-0">
          <button
            id="group-btn-tokens"
            onMouseEnter={(e) => handleMouseEnter('tokens', e)}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => handleGroupClick('tokens', e)}
            className={`w-11 h-10 rounded-xl flex items-center justify-center transition-all relative ${
              activeGroup === 'tokens' || isTokensActive
                ? 'bg-blue-500/25 text-blue-400 border border-blue-500/60 shadow-[0_0_14px_rgba(59,130,246,0.35)]'
                : 'text-zinc-400 hover:text-blue-300 hover:bg-zinc-850 hover:border hover:border-zinc-700/60'
            }`}
            title="Tokens, D&D Beyond Heroes & Monsters"
          >
            <Users className="w-5.5 h-5.5" />
            {tokens.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 px-1 rounded-full bg-blue-500 text-[8px] font-bold font-mono text-white">
                {tokens.length}
              </span>
            )}
          </button>
        </div>

        {/* 3. Dice Roller Group */}
        <div className="relative group shrink-0">
          <button
            id="group-btn-dice"
            onMouseEnter={(e) => handleMouseEnter('dice', e)}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => handleGroupClick('dice', e)}
            className={`w-11 h-10 rounded-xl flex items-center justify-center transition-all relative ${
              activeGroup === 'dice' || dicePool.length > 0
                ? 'bg-purple-500/25 text-purple-400 border border-purple-500/60 shadow-[0_0_14px_rgba(168,85,247,0.35)]'
                : 'text-zinc-400 hover:text-purple-300 hover:bg-zinc-850 hover:border hover:border-zinc-700/60'
            }`}
            title="Dice Roller (d4 to d100 & Pool Rolls)"
          >
            <Dices className="w-5.5 h-5.5" />
            {dicePool.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 px-1 rounded-full bg-purple-500 text-[8px] font-bold font-mono text-white">
                {dicePool.length}
              </span>
            )}
          </button>
        </div>

        {/* 4. Combat & Encounters Group */}
        <div className="relative group shrink-0">
          <button
            id="group-btn-combat"
            onMouseEnter={(e) => handleMouseEnter('combat', e)}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => handleGroupClick('combat', e)}
            className={`w-11 h-10 rounded-xl flex items-center justify-center transition-all relative ${
              activeGroup === 'combat' || isCombatActive || tool === 'measure'
                ? 'bg-amber-500/25 text-amber-400 border border-amber-500/60 shadow-[0_0_14px_rgba(245,158,11,0.35)]'
                : 'text-zinc-400 hover:text-amber-300 hover:bg-zinc-850 hover:border hover:border-zinc-700/60'
            }`}
            title="Combat Tracker, Critical Shake & AoE Measurement"
          >
            <Swords className="w-5.5 h-5.5" />
            {isCombatActive && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] animate-pulse" />
            )}
          </button>
        </div>

        {/* 5. Tactical Layers Group (Fog of War, FOV, Room Zones) */}
        <div className="relative group shrink-0">
          <button
            id="group-btn-lighting"
            onMouseEnter={(e) => handleMouseEnter('lighting', e)}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => handleGroupClick('lighting', e)}
            className={`w-11 h-10 rounded-xl flex flex-col items-center justify-center transition-all relative ${
              activeGroup === 'lighting' || activeGroup === 'fog-grid' || tool === 'wall' || tool === 'zone' || tool === 'hotspot' || tool === 'polygon_zone' || tool === 'reveal' || tool === 'polygon_reveal'
                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/60 shadow-[0_0_14px_rgba(245,158,11,0.35)]'
                : 'text-zinc-400 hover:text-amber-300 hover:bg-zinc-850 hover:border hover:border-zinc-700/60'
            }`}
            title="Tactical Layers (Fog of War, FOV Lighting & Room Zones)"
          >
            <Layers className="w-5 h-5" />
            <span className="text-[6px] font-black font-mono tracking-wider text-amber-400 -mt-0.5 leading-none">
              LAYERS
            </span>
            {isFogActive && (
              <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_6px_rgba(45,212,191,0.9)]" />
            )}
          </button>
        </div>

        {/* 6. Tactical & Weather FX Group */}
        <div className="relative group shrink-0">
          <button
            id="group-btn-fx"
            onMouseEnter={(e) => handleMouseEnter('fx', e)}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => handleGroupClick('fx', e)}
            className={`w-11 h-10 rounded-xl flex flex-col items-center justify-center transition-all relative ${
              activeGroup === 'fx' || (boardAnimatedEnabled && (boardAnimatedFeatures.length > 0 || boardWeatherEffect !== 'none'))
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/60 shadow-[0_0_14px_rgba(6,182,212,0.4)]'
                : 'text-zinc-400 hover:text-cyan-300 hover:bg-zinc-850 hover:border hover:border-zinc-700/60'
            }`}
            title="Tactical & Weather FX (Animated Features, Weather & Grid Sizing)"
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-[6.5px] font-black font-mono tracking-wider text-cyan-400 -mt-0.5 leading-none">
              FX
            </span>
            {(boardAnimatedFeatures.length > 0 || boardWeatherEffect !== 'none') && (
              <span className="absolute -top-1 -right-1 px-1 min-w-[14px] h-[14px] rounded-full bg-cyan-500 text-[8px] font-bold font-mono text-zinc-950 flex items-center justify-center shadow">
                {boardAnimatedFeatures.length > 0 ? boardAnimatedFeatures.length : '●'}
              </span>
            )}
          </button>
        </div>

        {/* 7. AI Dungeon Master Suite */}
        <div className="relative group shrink-0">
          <button
            id="group-btn-ai"
            onMouseEnter={(e) => handleMouseEnter('ai', e)}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => handleGroupClick('ai', e)}
            className={`w-11 h-10 rounded-xl flex items-center justify-center transition-all relative ${
              activeGroup === 'ai' || isAIActive || showDndChatbot
                ? 'bg-fuchsia-500/25 text-fuchsia-400 border border-fuchsia-500/60 shadow-[0_0_14px_rgba(217,70,239,0.35)]'
                : 'text-zinc-400 hover:text-fuchsia-300 hover:bg-zinc-850 hover:border hover:border-zinc-700/60'
            }`}
            title="AI Dungeon Master Suite (Maps, Vision, Voice & D&D Chatbot)"
          >
            <Wand2 className="w-5.5 h-5.5" />
            {showDndChatbot && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] animate-pulse" />
            )}
          </button>
        </div>

        {/* 8. Handouts, Visual Props & Shared Party Journal (1-Click Studio) */}
        {onOpenHandoutsJournal && (
          <div className="relative group shrink-0">
            <button
              id="group-btn-handouts-journal"
              onClick={onOpenHandoutsJournal}
              className={`w-11 h-10 rounded-xl flex flex-col items-center justify-center transition-all relative cursor-pointer ${
                hasUnreadHandouts
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'text-amber-300/90 hover:text-amber-200 hover:bg-zinc-850'
              }`}
              title="Handouts, Visual Props, Riddles, Quests & Shared Party Journal"
            >
              <Scroll className="w-5 h-5" />
              <span className="text-[6px] font-black font-mono tracking-wider text-amber-400 -mt-0.5 leading-none">
                PROPS
              </span>
              {hasUnreadHandouts && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] animate-ping" />
              )}
            </button>
          </div>
        )}

        {/* 9. Soundboard & Ambient Audio Mixer (Jukebox & Spatial Audio) */}
        {onOpenAudioMixer && (
          <div className="relative group shrink-0">
            <button
              id="group-btn-audio-jukebox"
              onClick={onOpenAudioMixer}
              className={`w-11 h-10 rounded-xl flex flex-col items-center justify-center transition-all relative cursor-pointer ${
                activeAudioLoopCount > 0
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'text-emerald-300/90 hover:text-emerald-200 hover:bg-zinc-850'
              }`}
              title="Soundboard & Ambient Audio Mixer (Layered Loops, One-Click SFX & Spatial Map Audio)"
            >
              <Music className="w-5 h-5" />
              <span className="text-[6px] font-black font-mono tracking-wider text-emerald-400 -mt-0.5 leading-none">
                AUDIO
              </span>
              {activeAudioLoopCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1 min-w-[14px] h-[14px] rounded-full bg-emerald-500 text-[8px] font-bold font-mono text-zinc-950 flex items-center justify-center shadow animate-pulse">
                  {activeAudioLoopCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Bottom Anchored Tools: Help, Bug Report, Bug Log / Notes, Settings */}
      <div className="flex flex-col items-center py-1.5 border-t border-zinc-800/80 gap-0.5 shrink-0 w-full px-1.5 mt-auto bg-zinc-950/95">
        {/* Switch to Player Mode (opens in a new tab so the DM session stays intact) */}
        <div className="relative group shrink-0">
          <button
            id="btn-switch-to-player-mode"
            onClick={() => {
              const url = new URL(window.location.href);
              url.search = '';
              url.searchParams.set('view', 'player');
              window.open(url.toString(), '_blank');
            }}
            className="w-11 h-10 rounded-xl flex flex-col items-center justify-center transition-all text-sky-300 hover:text-sky-200 hover:bg-zinc-850 cursor-pointer active:scale-95"
            title="Switch to Player Mode (opens the player view in a new tab; your DM session stays open)"
          >
            <Monitor className="w-5 h-5" />
            <span className="text-[6.5px] font-black font-mono tracking-wider -mt-0.5 leading-none">PLAYER</span>
          </button>
        </div>

        {/* Help & Support Group */}
        <div className="relative group shrink-0">
          <button
            id="group-btn-help"
            onMouseEnter={(e) => handleMouseEnter('help', e)}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => handleGroupClick('help', e)}
            className={`w-11 h-10 rounded-xl flex flex-col items-center justify-center transition-all relative ${
              activeGroup === 'help'
                ? 'bg-sky-500/25 text-sky-400 border border-sky-500/60 shadow-[0_0_14px_rgba(56,189,248,0.35)]'
                : 'text-zinc-400 hover:text-sky-300 hover:bg-zinc-850 hover:border hover:border-zinc-700/60'
            }`}
            title="Help, Feature FAQ & AI Assistant"
          >
            <HelpCircle className="w-5 h-5" />
            <span className="text-[6.5px] font-black font-mono tracking-wider text-sky-400 -mt-0.5 leading-none">
              HELP
            </span>
          </button>
        </div>

        {/* Report Bug Trigger Button */}
        {onOpenBugReport && (
          <div className="relative group shrink-0">
            <button
              id="btn-report-bug-sidebar"
              onClick={onOpenBugReport}
              className="w-11 h-10 rounded-xl flex items-center justify-center transition-all text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-400/50 shadow-sm cursor-pointer active:scale-95"
              title="Report a Bug & Issue Notes"
            >
              <Bug className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Bug Log & DM Notes Manager Trigger Button */}
        {onOpenBugManager && (
          <div className="relative group shrink-0">
            <button
              id="btn-sidebar-bug-manager"
              onClick={onOpenBugManager}
              className="w-11 h-10 rounded-xl flex items-center justify-center transition-all text-zinc-400 hover:text-amber-300 hover:bg-zinc-850 cursor-pointer active:scale-95"
              title="Bug Log & DM Developer Notes"
            >
              <FileText className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Settings & Secrets Vault Trigger Button */}
        {onOpenSettings && (
          <div className="relative group shrink-0">
            <button
              id="btn-sidebar-settings"
              onClick={() => onOpenSettings()}
              className="w-11 h-10 rounded-xl flex items-center justify-center transition-all text-zinc-400 hover:text-amber-400 bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-800 hover:border-amber-500/40 shadow-sm cursor-pointer active:scale-95"
              title="Settings & Secrets Vault (D&D Beyond Cobalt, AI Keys & Credentials)"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* FLYOUT SIDE MENUS (Slide in on hover or click / Draggable when pinned) */}
      {activeGroup && (
        <div
          id={`flyout-menu-${activeGroup}`}
          onMouseEnter={handleFlyoutMouseEnter}
          onMouseLeave={handleFlyoutMouseLeave}
          className={`fixed bg-zinc-900/98 backdrop-blur-2xl border ${
            pinnedGroup
              ? 'border-amber-500/50 shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/20'
              : 'border-zinc-700/80 shadow-2xl'
          } rounded-2xl z-[70] flex flex-col ${activeGroup === 'maps' ? 'min-w-[340px] max-w-[380px]' : 'min-w-[280px] max-w-[350px]'} max-h-[calc(100vh-24px)] overflow-y-auto sidebar-scrollbar animate-in fade-in slide-in-from-left-2 duration-150`}
          style={{
            left: pinnedGroup && pinnedPosition ? `${pinnedPosition.x}px` : '68px',
            top: pinnedGroup && pinnedPosition
              ? `${pinnedPosition.y}px`
              : `${Math.max(12, Math.min(menuTop - 24, window.innerHeight - 700))}px`,
            scrollbarWidth: 'thin',
            scrollbarColor: '#3f3f46 transparent'
          }}
        >
          {/* Transparent hover bridge touching sidebar (only when docked beside sidebar) */}
          {(!pinnedGroup || !pinnedPosition || pinnedPosition.x <= 74) && (
            <div className="absolute -left-6 top-0 w-6 h-full pointer-events-auto" />
          )}

          {/* Draggable Header Strip when Pinned */}
          {pinnedGroup && (
            <div
              onMouseDown={handleDragStart}
              className="sticky top-0 z-30 flex items-center justify-between px-3 py-2 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border-b border-amber-500/30 text-amber-300 select-none cursor-grab active:cursor-grabbing shadow-sm"
              title="Click and drag anywhere on this bar to move the menu around your screen"
            >
              <div className="flex items-center gap-2 min-w-0">
                <GripHorizontal className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="flex items-center gap-1.5 min-w-0">
                  {activeGroup === 'maps' && <MapIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  {activeGroup === 'lighting' && <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  {activeGroup === 'tokens' && <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                  {activeGroup === 'combat' && <Swords className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                  {activeGroup === 'fx' && <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                  {activeGroup === 'dice' && <Dices className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200 truncate">
                    {activeGroup === 'maps' ? 'Campaign & Maps' : activeGroup === 'tokens' ? 'Creatures & Tokens' : activeGroup.toUpperCase()}
                  </span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                    PINNED
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPinnedPosition({ x: 72, y: Math.max(12, Math.min(menuTop - 24, window.innerHeight - 560)) });
                  }}
                  className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                  title="Reset to default sidebar position"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => togglePinGroup(activeGroup, e)}
                  className="p-1 text-amber-400 hover:text-white hover:bg-amber-500/20 rounded transition-colors cursor-pointer"
                  title="Unpin menu"
                >
                  <Pin className="w-3.5 h-3.5 fill-amber-400" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeFlyout();
                  }}
                  className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                  title="Close menu"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* FLYOUT CONTENT BY CATEGORY */}
          {activeGroup === 'maps' && (
            <div className="p-3.5 flex flex-col gap-3 w-full">
              {/* Header (Only shown when NOT pinned, avoiding duplicate headers) */}
              {!pinnedGroup && (
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <MapIcon className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold font-mono text-zinc-200 uppercase tracking-wider">Campaign & Maps</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => togglePinGroup('maps', e)}
                      className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                      title="Pin Menu Open (Allows moving)"
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={closeFlyout}
                      className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                      title="Close"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Subtabs Switcher: Live Session vs Map Library */}
              <div className="grid grid-cols-2 bg-zinc-950/80 p-1 rounded-xl border border-zinc-850 gap-1 shrink-0">
                <button
                  type="button"
                  id="tab-maps-session"
                  onClick={() => setMapsTab('session')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mapsTab === 'session'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Live Session</span>
                  {activeSceneInfo && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                </button>
                <button
                  type="button"
                  id="tab-maps-library"
                  onClick={() => setMapsTab('library')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mapsTab === 'library'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Map Library</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                    {uploadedMaps.length + PRESET_BATTLEMAPS.length}
                  </span>
                </button>
              </div>

              {/* TAB 1: LIVE SESSION (Scene control & screen broadcast) */}
              {mapsTab === 'session' && (
                <div className="flex flex-col gap-3 w-full animate-in fade-in duration-150">
                  {/* 1. Consolidated Active Campaign Scene Card */}
                  <div className="border border-zinc-800 rounded-xl bg-zinc-950/70 overflow-hidden shadow-sm">
                    {/* Top: Scene Title & Live Status */}
                    <div className="p-3 bg-zinc-900/80 border-b border-zinc-800/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-mono uppercase font-bold text-amber-400 tracking-wider">
                              Active Scene
                            </span>
                            {activeSceneInfo && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            )}
                          </div>
                          <span className="text-xs font-bold text-white truncate" title={activeSceneInfo?.sceneTitle || 'Sandbox Scene'}>
                            {activeSceneInfo?.sceneTitle || 'Sandbox Scene'}
                          </span>
                        </div>
                      </div>

                      {/* Quick Save Action */}
                      {activeSceneInfo && onQuickSave && (
                        <button
                          id="btn-quick-save-campaign-flyout"
                          onClick={() => onQuickSave()}
                          disabled={isQuickSaving}
                          className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg text-xs font-bold font-mono shrink-0 transition-all flex items-center gap-1 shadow-sm disabled:opacity-50 active:scale-95 cursor-pointer"
                          title="Quick Save changes to current scene"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{isQuickSaving ? 'Saving...' : 'Save'}</span>
                        </button>
                      )}
                    </div>

                    {/* Middle: Clean 3-Button Action Grid */}
                    <div className="p-2.5 space-y-2 bg-zinc-950/80">
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          id="btn-load-campaign-flyout"
                          onClick={() => {
                            closeFlyout();
                            onOpenLoadCampaign?.();
                          }}
                          className="py-2 px-1.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 text-blue-200 border border-blue-500/30 hover:border-blue-400 font-semibold text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group"
                          title="Load another scene from campaign"
                        >
                          <FolderOpen className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
                          <span className="text-[10px] font-mono">Load</span>
                        </button>

                        <button
                          id="btn-open-campaign-manager-flyout"
                          onClick={() => {
                            closeFlyout();
                            onOpenCampaignBuilder?.();
                          }}
                          className="py-2 px-1.5 rounded-xl bg-amber-600/15 hover:bg-amber-600/25 text-amber-200 border border-amber-500/30 hover:border-amber-400 font-semibold text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group"
                          title="Open full Campaign & Scene Manager"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                          <span className="text-[10px] font-mono">Manager</span>
                        </button>

                        <button
                          id="btn-save-canvas-flyout"
                          onClick={() => {
                            closeFlyout();
                            onOpenSaveCampaign?.();
                          }}
                          className="py-2 px-1.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-200 border border-emerald-500/30 hover:border-emerald-400 font-semibold text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group"
                          title="Save as a new scene"
                        >
                          <Save className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                          <span className="text-[10px] font-mono">Save As</span>
                        </button>
                      </div>

                      {/* Bottom: Share Player View Link */}
                      <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-1.5">
                        <button
                          id="btn-share-player-view-flyout"
                          onClick={() => {
                            const playerUrl = `${window.location.origin}${window.location.pathname}?view=player`;
                            navigator.clipboard.writeText(playerUrl);
                            window.open(playerUrl, '_blank');
                            toast.success('Player View link copied to clipboard and opened in new window!', {
                              description: playerUrl
                            });
                          }}
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 hover:border-emerald-400 font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer"
                          title="Copy Player View link to clipboard and open in a new window"
                        >
                          <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Share Player View</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const playerUrl = `${window.location.origin}${window.location.pathname}?view=player`;
                            window.open(playerUrl, '_blank');
                          }}
                          className="py-2 px-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-700/80 text-xs flex items-center justify-center transition-all cursor-pointer"
                          title="Open Player View in a new tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 2. Screen Broadcast Slots Section */}
                  <div className="border border-zinc-800 rounded-xl bg-zinc-950/70 overflow-hidden shadow-sm">
                    <div className="py-2.5 px-3 bg-zinc-900/80 flex items-center justify-between border-b border-zinc-800/80">
                      <div className="flex items-center gap-2">
                        <Tv className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold font-mono text-zinc-200 uppercase tracking-wider">
                          Broadcast Slots
                        </span>
                      </div>
                      {activeMapId === liveMapId ? (
                        <span className="text-[9px] font-mono text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          LIVE ON PLAYERS
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono text-amber-400 font-bold px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30">
                          PREVIEWING {activeMapId}
                        </span>
                      )}
                    </div>

                    <div className="p-2.5 space-y-2.5 bg-zinc-950/80">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold font-mono text-zinc-400">Select Slot</span>
                        {onClearMapSlot && (
                          <button
                            type="button"
                            id="btn-clear-current-slot"
                            onClick={() => onClearMapSlot(activeMapId)}
                            className="text-[9px] font-mono text-zinc-500 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
                            title={`Clear all walls, rooms, tokens, and image from ${activeMapId} to make it blank`}
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            Clear {activeMapId}
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        {(['DM1', 'DM2', 'DM3'] as const).map((id) => {
                          const isActive = activeMapId === id;
                          const isLive = (liveMapId || 'DM1') === id;
                          return (
                            <button
                              key={id}
                              id={`btn-map-slot-${id}`}
                              onClick={() => handleMapSwitch(id)}
                              className={`py-2 px-2 rounded-xl text-xs font-bold font-mono transition-all relative flex flex-col items-center gap-0.5 border cursor-pointer ${
                                isActive
                                  ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-sm'
                                  : 'bg-zinc-850/60 border-zinc-700/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                              }`}
                              title={`Map Slot ${id}: ${isActive ? 'Editing' : 'Standby'}, ${isLive ? 'Live on Player View' : 'Private'}`}
                            >
                              <div className="flex items-center gap-1">
                                <span>{id}</span>
                                {isLive && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.8)] animate-pulse" />
                                )}
                              </div>
                              <span className={`text-[8px] font-sans ${isLive ? 'text-blue-400 font-semibold' : 'text-zinc-500'}`}>
                                {isLive ? 'Live on Players' : (isActive ? 'Editing' : 'Standby')}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Broadcast Action / Live Confirmation */}
                      {activeMapId !== liveMapId && onForceSync ? (
                        <button
                          type="button"
                          id="btn-sidebar-force-sync"
                          onClick={onForceSync}
                          className="w-full mt-1 py-2 px-3 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 border shadow-lg bg-blue-600 hover:bg-blue-500 text-white border-blue-400 ring-2 ring-blue-500/50 animate-pulse cursor-pointer"
                          title={`Broadcast slot ${activeMapId} to Player View.`}
                        >
                          <Radio className="w-4 h-4 text-white animate-spin" style={{ animationDuration: '3s' }} />
                          <span>Broadcast Slot {activeMapId} → Players</span>
                        </button>
                      ) : (
                        <div className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400">
                          <span className="flex items-center gap-1.5 text-emerald-400">
                            <Check className="w-3.5 h-3.5" />
                            <span>{activeMapId} is broadcasting Live</span>
                          </span>
                          {onForceSync && (
                            <button
                              type="button"
                              onClick={onForceSync}
                              className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                              title="Force Re-sync"
                            >
                              Re-sync
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: MAP LIBRARY (Imports, uploads, cloud and preset collections) */}
              {mapsTab === 'library' && (
                <div className="flex flex-col gap-3 w-full animate-in fade-in duration-150">
                  {/* Quick Upload & Import Toolbar */}
                  <div className="border border-zinc-800 rounded-xl bg-zinc-950/70 p-2.5 space-y-2">
                    <span className="text-[10px] uppercase font-bold font-mono text-zinc-400 tracking-wider">
                      Import New Battlemap
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        id="btn-upload-map-flyout"
                        onClick={() => mapFileInputRef.current?.click()}
                        disabled={isReadingFile}
                        className="py-2.5 px-3 rounded-xl bg-zinc-850 hover:bg-emerald-500/20 border border-zinc-700 hover:border-emerald-500/40 text-zinc-200 hover:text-emerald-300 font-medium text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group"
                      >
                        {isReadingFile ? (
                          <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
                        ) : (
                          <CloudUpload className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                        )}
                        <span className="font-bold text-[11px]">Upload Map</span>
                        <span className="text-[9px] text-zinc-500 font-mono">IMG / VIDEO</span>
                      </button>

                      <button
                        id="btn-import-uvtt-sidebar"
                        onClick={() => uvttFileInputRef.current?.click()}
                        disabled={isReadingFile}
                        className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-950/60 to-indigo-950/60 hover:from-purple-900/80 hover:to-indigo-900/80 border border-purple-500/40 hover:border-purple-400 text-purple-200 font-medium text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shadow-sm group"
                        title="Import Dungeondraft / Dungeon Alchemist (.dd2vtt / .uvtt)"
                      >
                        <FileCode2 className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                        <span className="font-bold text-[11px]">Import UVTT</span>
                        <span className="text-[9px] text-purple-400/80 font-mono">.DD2VTT</span>
                      </button>
                    </div>

                    {/* Secondary Export & Relink Bar */}
                    {(onExportUniversalVtt || onRelinkMap) && (
                      <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-zinc-850">
                        {onExportUniversalVtt && currentMapImage && (
                          <button
                            id="btn-export-uvtt-sidebar"
                            onClick={onExportUniversalVtt}
                            className="py-1.5 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-purple-300 text-[10px] font-mono flex items-center justify-center gap-1 transition-colors cursor-pointer border border-zinc-800"
                          >
                            <Download className="w-3 h-3 text-purple-400" />
                            <span>Export .dd2vtt</span>
                          </button>
                        )}
                        {onRelinkMap && (
                          <button
                            id="btn-relink-map-sidebar"
                            onClick={onRelinkMap}
                            className="py-1.5 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-300 text-[10px] font-mono flex items-center justify-center gap-1 transition-colors cursor-pointer border border-zinc-800"
                          >
                            <Sparkles className="w-3 h-3 text-emerald-400" />
                            <span>Re-link File</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Hidden File Inputs */}
                  <input
                    ref={mapFileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,video/*,.m4v,.dd2vtt,.uvtt,application/json"
                    onChange={handleFileUpload}
                  />
                  <input
                    ref={uvttFileInputRef}
                    type="file"
                    className="hidden"
                    accept=".dd2vtt,.uvtt,application/json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (onImportUniversalVtt) onImportUniversalVtt(file);
                        else handleFileUpload(e);
                      }
                      e.target.value = '';
                    }}
                  />

                  {/* Firebase Cloud Maps Section Dropdown (Collapsible) */}
                  <div className="border border-zinc-800 rounded-xl bg-zinc-950/60 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleMapsSection('firebase')}
                      className="w-full py-2 px-3 bg-zinc-900/90 hover:bg-zinc-850 text-left flex items-center justify-between transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <Cloud className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold font-mono text-zinc-200 uppercase tracking-wider group-hover:text-emerald-300">
                          Firebase Cloud Maps
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-500/10">
                          {uploadedMaps.length}
                        </span>
                        {openMapsSections.firebase ? (
                          <ChevronUp className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                        )}
                      </div>
                    </button>

                    {openMapsSections.firebase && (
                      <div className="p-2.5 space-y-2 border-t border-zinc-800/80 bg-zinc-950/80 animate-in fade-in duration-150">
                        {uploadedMaps.length === 0 ? (
                          <div className="p-2.5 bg-zinc-950/40 rounded-xl border border-dashed border-zinc-800 text-center">
                            <p className="text-[11px] text-zinc-400">No maps saved in Firebase</p>
                            <p className="text-[9px] text-zinc-500 mt-0.5">Upload a map above to access it anytime</p>
                          </div>
                        ) : (
                          <div className="max-h-[180px] overflow-y-auto space-y-1 pr-1 sidebar-scrollbar">
                            {uploadedMaps.map((mapItem) => (
                              <div
                                key={mapItem.assetId}
                                className="group flex items-center justify-between p-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 hover:border-emerald-500/40 transition-all"
                              >
                                <button
                                  type="button"
                                  onClick={() => onSelectUploadedMap?.(mapItem)}
                                  className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer"
                                  title={`Load "${mapItem.name}" onto canvas`}
                                >
                                  <div className="w-7 h-7 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-700/60 flex items-center justify-center shrink-0">
                                    {mapItem.fileType === 'video' ? (
                                      mapItem.thumbnailUrl ? (
                                        <div className="relative w-full h-full">
                                          <img
                                            src={mapItem.thumbnailUrl}
                                            alt={mapItem.name}
                                            className="w-full h-full object-cover"
                                            referrerPolicy="no-referrer"
                                          />
                                          <span className="absolute bottom-0 right-0 px-0.5 bg-black/85 text-emerald-400 font-mono text-[6px] font-bold rounded">
                                            VID
                                          </span>
                                        </div>
                                      ) : (
                                        <Video className="w-3.5 h-3.5 text-emerald-400" />
                                      )
                                    ) : (
                                      <img
                                        src={mapItem.thumbnailUrl || mapItem.url}
                                        alt={mapItem.name}
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                      />
                                    )}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[11px] font-semibold text-zinc-200 truncate group-hover:text-emerald-300">
                                      {mapItem.name}
                                    </span>
                                    <span className="text-[9px] text-zinc-500 font-mono">
                                      {mapItem.fileType.toUpperCase()}
                                      {mapItem.fileSizeBytes ? ` • ${(mapItem.fileSizeBytes / (1024 * 1024)).toFixed(1)}MB` : ''}
                                    </span>
                                  </div>
                                </button>
                                <div className="flex items-center gap-1 shrink-0 ml-1">
                                  {confirmDeleteMapId === mapItem.assetId ? (
                                    <div
                                      className="flex items-center gap-1 bg-red-950/95 border border-red-500/60 rounded-lg px-1.5 py-0.5 shadow-md animate-in fade-in"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <span className="text-[9px] font-mono text-red-300 font-bold">Delete?</span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setConfirmDeleteMapId(null);
                                          onDeleteUploadedAsset?.(mapItem.assetId);
                                        }}
                                        className="px-1.5 py-0.5 bg-red-600 hover:bg-red-500 text-white text-[9px] font-bold rounded shadow transition-all cursor-pointer"
                                        title="Confirm permanent delete"
                                      >
                                        Yes
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setConfirmDeleteMapId(null);
                                        }}
                                        className="p-0.5 text-zinc-400 hover:text-zinc-200 rounded cursor-pointer"
                                        title="Cancel"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => onSelectUploadedMap?.(mapItem)}
                                        className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 text-[9px] font-bold font-mono rounded border border-emerald-500/40 transition-all cursor-pointer"
                                      >
                                        Load
                                      </button>
                                      {onDeleteUploadedAsset && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmDeleteMapId(mapItem.assetId);
                                            setTimeout(() => {
                                              setConfirmDeleteMapId(curr => (curr === mapItem.assetId ? null : curr));
                                            }, 4000);
                                          }}
                                          className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                                          title="Delete from Firebase"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Preset Battlemaps Section Dropdown (Collapsible) */}
                  <div className="border border-zinc-800 rounded-xl bg-zinc-950/60 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleMapsSection('presets')}
                      className="w-full py-2 px-3 bg-zinc-900/90 hover:bg-zinc-850 text-left flex items-center justify-between transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold font-mono text-zinc-200 uppercase tracking-wider group-hover:text-amber-300">
                          Preset Battlemaps
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono text-zinc-400 font-bold px-1.5 py-0.5 rounded bg-zinc-800">
                          {PRESET_BATTLEMAPS.length}
                        </span>
                        {openMapsSections.presets ? (
                          <ChevronUp className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                        )}
                      </div>
                    </button>

                    {openMapsSections.presets && (
                      <div className="p-2.5 space-y-2 border-t border-zinc-800/80 bg-zinc-950/80 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold font-mono text-zinc-400">Featured Maps</span>
                          <button
                            type="button"
                            onClick={() => setShowPresetMapsGallery(true)}
                            className="text-[10px] font-mono text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-0.5 cursor-pointer"
                          >
                            View All ({PRESET_BATTLEMAPS.length})
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          {PRESET_BATTLEMAPS.slice(0, 4).map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => onSelectPresetMap?.(preset)}
                              className="group relative flex flex-col p-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 hover:border-amber-500/50 transition-all text-left overflow-hidden cursor-pointer"
                              title={`Load "${preset.name}" (${preset.type})`}
                            >
                              <div className="aspect-video w-full rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 relative">
                                <img
                                  src={preset.thumbnailUrl || preset.url}
                                  alt={preset.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  referrerPolicy="no-referrer"
                                />
                                <span className="absolute bottom-1 right-1 px-1 py-0.2 bg-black/80 rounded text-[8px] font-mono text-amber-300 font-bold border border-amber-500/30">
                                  LOAD
                                </span>
                              </div>
                              <div className="pt-1 px-0.5 flex flex-col min-w-0">
                                <span className="text-[10px] font-semibold text-zinc-200 truncate group-hover:text-amber-300">
                                  {preset.name}
                                </span>
                                <span className="text-[8px] text-zinc-500 truncate font-mono">
                                  {preset.type}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeGroup === 'lighting' && (
            <div className="p-3.5 flex flex-col gap-3 min-w-[320px] max-w-[360px]">
              {/* Header */}
              <div
                onMouseDown={pinnedGroup ? handleDragStart : undefined}
                className={`flex items-center justify-between border-b border-zinc-800 pb-2.5 ${pinnedGroup ? 'cursor-grab active:cursor-grabbing select-none' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold font-mono text-zinc-200 uppercase tracking-wider">Tactical Layers</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPinnedGroup(pinnedGroup === 'lighting' ? null : 'lighting')}
                    className={`p-1 rounded-md transition-colors ${pinnedGroup === 'lighting' ? 'text-amber-400 bg-amber-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                    title={pinnedGroup === 'lighting' ? 'Unpin Menu' : 'Pin Menu Open (Allows moving)'}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={closeFlyout}
                    className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Subtabs Switcher: 4 Streamlined Tactical Layer Tabs */}
              <div className="grid grid-cols-4 bg-zinc-950/80 p-1 rounded-xl border border-zinc-800 gap-1 shrink-0">
                <button
                  id="subtab-lighting-fov"
                  onClick={() => setLightingSubTab('lighting')}
                  className={`py-1.5 px-1 rounded-lg text-[10px] font-bold font-mono transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    lightingSubTab === 'lighting'
                      ? 'bg-amber-500 text-zinc-950 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                  }`}
                  title="Dynamic Lighting, Walls & Token Vision"
                >
                  <Shield className="w-3 h-3 shrink-0" />
                  <span className="truncate">WALLS</span>
                </button>
                <button
                  id="subtab-fog-grid"
                  onClick={() => setLightingSubTab('fog')}
                  className={`py-1.5 px-1 rounded-lg text-[10px] font-bold font-mono transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    lightingSubTab === 'fog'
                      ? 'bg-teal-500 text-zinc-950 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                  }`}
                  title="Fog of War & Brush/Polygon Reveal"
                >
                  <Eye className="w-3 h-3 shrink-0" />
                  <span className="truncate">FOG</span>
                  {isFogActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                  )}
                </button>
                <button
                  id="subtab-grid-layer"
                  onClick={() => setLightingSubTab('grid')}
                  className={`py-1.5 px-1 rounded-lg text-[10px] font-bold font-mono transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    lightingSubTab === 'grid'
                      ? 'bg-cyan-500 text-zinc-950 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                  }`}
                  title="Battle Grid Visibility, Scale & Alignment"
                >
                  <Grid3X3 className="w-3 h-3 shrink-0" />
                  <span className="truncate">GRID</span>
                  {gridVisible && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                  )}
                </button>
                <button
                  id="subtab-room-zones"
                  onClick={() => {
                    setLightingSubTab('zones');
                    if (setCampaignMode && campaignMode !== 'creator') {
                      setCampaignMode('creator');
                    }
                  }}
                  className={`py-1.5 px-1 rounded-lg text-[10px] font-bold font-mono transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    lightingSubTab === 'zones'
                      ? 'bg-amber-500 text-zinc-950 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                  }`}
                  title="Room Polygon Zones, Badges & DM Briefings"
                >
                  <Pentagon className="w-3 h-3 shrink-0" />
                  <span className="truncate">ROOMS</span>
                  {roomAnnotations.length > 0 && (
                    <span className={`text-[8px] px-1 rounded-full font-bold ${
                      lightingSubTab === 'zones' ? 'bg-zinc-950 text-amber-300' : 'bg-zinc-800 text-zinc-300'
                    }`}>
                      {roomAnnotations.length}
                    </span>
                  )}
                </button>
              </div>

              {/* ========================================================================= */}
              {/* TAB 1: WALLS & DYNAMIC FOV LIGHTING                                       */}
              {/* ========================================================================= */}
              {lightingSubTab === 'lighting' && (
                <div className="flex flex-col gap-3">
                  {/* Master Vision & Ambient Mode */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] uppercase font-bold font-mono text-zinc-400">Master Lighting Engine</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {setVisionConfig && (
                        <button
                          id="btn-sidebar-toggle-vision"
                          onClick={() =>
                            setVisionConfig((prev) => ({ ...prev, enabled: !prev.enabled }))
                          }
                          className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                            visionConfig.enabled
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                              : 'bg-zinc-850 border-zinc-750 text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5" />
                          {visionConfig.enabled ? 'FOV Active' : 'FOV Disabled'}
                        </button>
                      )}

                      {setVisionConfig && (
                        <button
                          id="btn-sidebar-toggle-ambient"
                          onClick={() =>
                            setVisionConfig((prev) => ({ ...prev, ambientLight: !prev.ambientLight }))
                          }
                          className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                            visionConfig.ambientLight
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                              : 'bg-indigo-950/40 border-indigo-700/50 text-indigo-300'
                          }`}
                          title={visionConfig.ambientLight ? 'Daylight: Map fully visible' : 'Darkness: Only token light illuminates'}
                        >
                          {visionConfig.ambientLight ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
                          {visionConfig.ambientLight ? 'Daylight' : 'Darkness'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Mode & Wall Tools */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold font-mono text-zinc-400">Wall & Obstacle Tools</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            if (setCampaignMode) setCampaignMode(campaignMode === 'creator' ? 'run' : 'creator');
                          }}
                          className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded transition-all cursor-pointer ${
                            campaignMode === 'creator'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}
                          title="Click to toggle between Creator Mode (draw/edit) and Run Mode (play session)"
                        >
                          {campaignMode === 'creator' ? 'CREATOR' : 'RUN MODE'}
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        id="btn-sidebar-wall-tool"
                        onClick={() => {
                          if (setCampaignMode && campaignMode !== 'creator') setCampaignMode('creator');
                          setTool(tool === 'wall' ? 'select' : 'wall');
                        }}
                        className={`py-2 px-1.5 rounded-xl text-[11px] font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                          tool === 'wall'
                            ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30 font-extrabold'
                            : 'bg-zinc-800 hover:bg-zinc-750 border-zinc-700 text-zinc-300 hover:text-white'
                        }`}
                        title="Draw solid lines, doors, or windows that block FOV light and movement"
                      >
                        <Layers className="w-3.5 h-3.5 shrink-0" />
                        <span>Draw</span>
                      </button>

                      <button
                        id="btn-sidebar-erase-wall-tool"
                        onClick={() => {
                          if (setCampaignMode && campaignMode !== 'creator') setCampaignMode('creator');
                          setTool(tool === 'erase_wall' ? 'select' : 'erase_wall');
                        }}
                        className={`py-2 px-1.5 rounded-xl text-[11px] font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                          tool === 'erase_wall'
                            ? 'bg-red-600 text-white border-red-400 shadow-md shadow-red-600/30 font-extrabold animate-pulse'
                            : 'bg-zinc-800 hover:bg-red-950/40 border-zinc-700 text-zinc-300 hover:text-red-300'
                        }`}
                        title="Erase individual wall sections: Click any wall or drag across walls to delete"
                      >
                        <Eraser className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span>Erase</span>
                      </button>

                      <button
                        id="btn-sidebar-split-wall-tool"
                        onClick={() => {
                          if (setCampaignMode && campaignMode !== 'creator') setCampaignMode('creator');
                          setTool(tool === 'split_wall' ? 'select' : 'split_wall');
                        }}
                        className={`py-2 px-1.5 rounded-xl text-[11px] font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                          tool === 'split_wall'
                            ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-600/30 font-extrabold'
                            : 'bg-zinc-800 hover:bg-amber-950/40 border-zinc-700 text-zinc-300 hover:text-amber-300'
                        }`}
                        title="Split wall segments: Click along a wall to cut it into two sections"
                      >
                        <Scissors className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Split</span>
                      </button>
                    </div>

                    {/* Wall Type Selection */}
                    <div className="flex flex-col gap-1.5 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                        <span>WALL TYPE:</span>
                        <span className="text-amber-400 font-bold uppercase">{activeWallType === 'secret_door' ? 'Secret Door' : activeWallType}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        <button
                          onClick={() => setActiveWallType && setActiveWallType('normal')}
                          className={`py-1.5 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                            activeWallType === 'normal'
                              ? 'bg-blue-500/30 border-blue-400 text-blue-300 shadow-sm'
                              : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          Solid
                        </button>
                        <button
                          onClick={() => setActiveWallType && setActiveWallType('door')}
                          className={`py-1.5 rounded-lg text-[10px] font-mono font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            activeWallType === 'door'
                              ? 'bg-amber-500/30 border-amber-400 text-amber-300 shadow-sm'
                              : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <DoorClosed className="w-3 h-3" /> Door
                        </button>
                        <button
                          onClick={() => setActiveWallType && setActiveWallType('secret_door')}
                          className={`py-1.5 rounded-lg text-[10px] font-mono font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            activeWallType === 'secret_door'
                              ? 'bg-purple-500/30 border-purple-400 text-purple-300 shadow-sm'
                              : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                          }`}
                          title="Secret Door: Appears as a solid wall to players until opened"
                        >
                          <EyeOff className="w-3 h-3 text-purple-400" /> Secret
                        </button>
                        <button
                          onClick={() => setActiveWallType && setActiveWallType('window')}
                          className={`py-1.5 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                            activeWallType === 'window'
                              ? 'bg-cyan-500/30 border-cyan-400 text-cyan-300 shadow-sm'
                              : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          Window
                        </button>
                      </div>

                      {(activeWallType === 'door' || activeWallType === 'secret_door') && (
                        <div className="flex flex-col gap-1.5 mt-1 pt-1.5 border-t border-zinc-800/80">
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-mono text-zinc-400 uppercase mr-0.5">STATE:</span>
                            {(['closed', 'open', 'locked'] as DoorState[]).map((state) => (
                              <button
                                key={state}
                                onClick={() => setActiveDoorState && setActiveDoorState(state)}
                                className={`flex-1 py-1 rounded-md text-[9px] font-mono border capitalize transition-all cursor-pointer ${
                                  activeDoorState === state
                                    ? state === 'open'
                                      ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300 font-bold'
                                      : state === 'locked'
                                      ? 'bg-red-500/30 border-red-400 text-red-300 font-bold'
                                      : activeWallType === 'secret_door'
                                      ? 'bg-purple-500/30 border-purple-400 text-purple-300 font-bold'
                                      : 'bg-amber-500/30 border-amber-400 text-amber-300 font-bold'
                                    : 'bg-zinc-800 border-zinc-700/60 text-zinc-400'
                                }`}
                              >
                                {state}
                              </button>
                            ))}
                          </div>

                          {setVisionConfig && (
                            <div className="flex items-center justify-between px-2 py-1 bg-zinc-900 rounded-lg border border-zinc-800/90 text-[10px] font-mono">
                              <span className="text-zinc-400 flex items-center gap-1">
                                <DoorClosed className="w-3 h-3 text-amber-400 shrink-0" />
                                <span>Door Status Badges</span>
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setVisionConfig((prev) => ({
                                    ...prev,
                                    showDoorBadges: !prev.showDoorBadges
                                  }))
                                }
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all cursor-pointer ${
                                  visionConfig.showDoorBadges
                                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                                    : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300'
                                }`}
                              >
                                {visionConfig.showDoorBadges ? 'SHOW' : 'HIDE'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {setSnapToGridWalls && (
                      <div className="flex items-center justify-between px-2.5 py-1.5 bg-zinc-900/60 rounded-xl border border-zinc-800 text-[10px] font-mono">
                        <span className="text-zinc-400 flex items-center gap-1.5">
                          <Magnet className="w-3 h-3 text-emerald-400" />
                          <span>Wall Grid Snapping</span>
                        </span>
                        <button
                          id="btn-sidebar-wall-snap"
                          onClick={() => setSnapToGridWalls(!snapToGridWalls)}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-all cursor-pointer ${
                            snapToGridWalls
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                          }`}
                        >
                          {snapToGridWalls ? 'ON' : 'OFF'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Exploration & Lighting Density Controls */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
                    <span className="text-[10px] uppercase font-bold font-mono text-zinc-400">Exploration & Light Density</span>
                    {setVisionConfig && (
                      <>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            id="btn-sidebar-exploration-memory"
                            onClick={() =>
                              setVisionConfig((prev) => ({
                                ...prev,
                                explorationMemory: !prev.explorationMemory
                              }))
                            }
                            className={`p-2 rounded-xl text-[10px] font-mono border text-left transition-all flex flex-col gap-0.5 cursor-pointer ${
                              visionConfig.explorationMemory
                                ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 font-bold'
                                : 'bg-zinc-850 border-zinc-750 text-zinc-400'
                            }`}
                            title="Exploration memory reveals explored areas in dim silhouette"
                          >
                            <span className="text-zinc-500 text-[9px]">EXPLORATION:</span>
                            <span>Memory: {visionConfig.explorationMemory ? 'ON' : 'OFF'}</span>
                          </button>

                          <button
                            id="btn-sidebar-dm-los"
                            onClick={() =>
                              setVisionConfig((prev) => ({
                                ...prev,
                                dmPreviewMode: !prev.dmPreviewMode
                              }))
                            }
                            className={`p-2 rounded-xl text-[10px] font-mono border text-left transition-all flex flex-col gap-0.5 cursor-pointer ${
                              visionConfig.dmPreviewMode
                                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                                : 'bg-zinc-850 border-zinc-750 text-zinc-400'
                            }`}
                            title="Preview field of view exactly as players experience it"
                          >
                            <span className="text-zinc-500 text-[9px]">LOS MODE:</span>
                            <span>{visionConfig.dmPreviewMode ? 'Player LOS' : 'DM Oversight'}</span>
                          </button>
                        </div>

                        {/* Density Sliders */}
                        <div className="flex flex-col gap-2 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="text-zinc-400">DARKNESS DENSITY</span>
                              <span className="text-amber-400 font-bold">
                                {Math.round((visionConfig.darknessOpacity ?? 1.0) * 100)}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0.3"
                              max="1.0"
                              step="0.05"
                              value={visionConfig.darknessOpacity ?? 1.0}
                              onChange={(e) =>
                                setVisionConfig((prev) => ({
                                  ...prev,
                                  darknessOpacity: parseFloat(e.target.value)
                                }))
                              }
                              className="w-full accent-amber-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="text-zinc-400">EXPLORED MEMORY FADE</span>
                              <span className="text-blue-400 font-bold">
                                {Math.round((visionConfig.dimVisionOpacity ?? 0.5) * 100)}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0.1"
                              max="0.9"
                              step="0.05"
                              value={visionConfig.dimVisionOpacity ?? 0.5}
                              onChange={(e) =>
                                setVisionConfig((prev) => ({
                                  ...prev,
                                  dimVisionOpacity: parseFloat(e.target.value)
                                }))
                              }
                              className="w-full accent-blue-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Selected Token Vision Quick Settings */}
                  {(() => {
                    const selToken = tokens.find((t) => selectedTokenIds.includes(t.id));
                    if (
                      !selToken ||
                      !onUpdateTokenVision ||
                      isMonsterToken(selToken) ||
                      selToken.isMonster === true ||
                      selToken.category === 'monster' ||
                      selToken.isPlayer === false
                    ) return null;
                    return (
                      <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold font-mono text-zinc-400">Token Vision: {selToken.name}</span>
                          <span className="text-[10px] font-mono text-amber-400 font-bold">{selToken.visionRadius || 60}ft</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          {[30, 60, 90, 120].map((ft) => (
                            <button
                              key={ft}
                              onClick={() => onUpdateTokenVision(selToken.id, { visionRadius: ft })}
                              className={`py-1 rounded text-[9px] font-mono border cursor-pointer ${
                                (selToken.visionRadius || 60) === ft
                                  ? 'bg-amber-500/30 border-amber-400 text-amber-300 font-bold'
                                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              {ft}ft
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Wall Management & Clear */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                      <span className="font-bold text-zinc-300">{walls.length} Wall Segments</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => uvttFileInputRef.current?.click()}
                          className="text-purple-400 hover:text-purple-300 flex items-center gap-1 hover:underline transition-all cursor-pointer"
                          title="Import walls, doors & lights from a Universal VTT (.dd2vtt) file"
                        >
                          <FileCode2 className="w-3 h-3" /> Import .dd2vtt
                        </button>
                        {walls.length > 0 && (
                          <button
                            onClick={() => setShowWallSectionsList(!showWallSectionsList)}
                            className="text-blue-400 hover:text-blue-300 underline cursor-pointer"
                          >
                            {showWallSectionsList ? 'Hide List' : 'Review'}
                          </button>
                        )}
                        {onGeneratePresetRoom && (
                          <button
                            id="btn-sidebar-preset-room"
                            onClick={onGeneratePresetRoom}
                            className="text-amber-400 hover:text-amber-300 flex items-center gap-1 hover:underline transition-all cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Preset
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Wall Sections List */}
                    {showWallSectionsList && walls.length > 0 && (
                      <div className="flex flex-col gap-1 p-2 bg-zinc-900/90 rounded-xl border border-zinc-800 max-h-40 overflow-y-auto sidebar-scrollbar">
                        <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                          <span>Click to select • Trash to delete</span>
                          <span>{walls.length} sections</span>
                        </div>
                        {walls.map((w, idx) => {
                          const isSel = selectedWallId === w.id;
                          const len = Math.round(Math.hypot(w.p2.x - w.p1.x, w.p2.y - w.p1.y) / 5);
                          return (
                            <div
                              key={w.id}
                              onClick={() => setSelectedWallId?.(isSel ? null : w.id)}
                              className={`flex items-center justify-between p-1.5 rounded-lg border text-[10px] font-mono transition-all cursor-pointer ${
                                isSel
                                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                                  : 'bg-zinc-800/60 border-zinc-700/50 text-zinc-300 hover:bg-zinc-800'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="text-zinc-500">#{idx + 1}</span>
                                <span className="capitalize font-bold">{w.wallType === 'secret_door' ? 'Secret Door' : (w.wallType || 'Solid')}</span>
                                <span className="text-[9px] text-zinc-500">({len}ft)</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onDeleteWall) onDeleteWall(w.id);
                                  else if (setWalls) setWalls(prev => prev.filter(x => x.id !== w.id));
                                  if (selectedWallId === w.id) setSelectedWallId?.(null);
                                }}
                                className="p-1 hover:text-red-400 text-zinc-500 transition-colors cursor-pointer"
                                title="Delete Section"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Clear Walls Button */}
                    {confirmClearWalls ? (
                      <div className="flex flex-col gap-1.5 p-2 bg-red-950/70 border border-red-500/50 rounded-xl shadow-lg">
                        <div className="flex items-center justify-between text-[11px] font-mono text-red-200">
                          <span>Clear all {walls.length} walls & doors?</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            id="btn-sidebar-confirm-clear-walls"
                            onClick={() => {
                              if (onClearWalls) {
                                onClearWalls();
                              } else if (setWalls) {
                                setWalls([]);
                                setSelectedWallId?.(null);
                              }
                              setConfirmClearWalls(false);
                            }}
                            className="flex-1 py-1 px-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono text-[10px] font-bold transition-all shadow cursor-pointer"
                          >
                            Yes, Clear All
                          </button>
                          <button
                            id="btn-sidebar-cancel-clear-walls"
                            onClick={() => setConfirmClearWalls(false)}
                            className="py-1 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[10px] transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        id="btn-sidebar-clear-walls"
                        onClick={() => setConfirmClearWalls(true)}
                        disabled={walls.length === 0}
                        className="w-full py-1.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed text-red-400 hover:text-red-300 border border-red-500/30 text-xs font-mono flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear All Walls ({walls.length})
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 2: FOG OF WAR                                                         */}
              {/* ========================================================================= */}
              {lightingSubTab === 'fog' && (
                <div className="flex flex-col gap-3">
                  {/* Fog Master Controls */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] uppercase font-bold font-mono text-zinc-400">Fog of War Layer</span>
                    <div className="flex gap-2">
                      <button
                        id="btn-toggle-fog-flyout"
                        onClick={() => setIsFogVisible(!isFogVisible)}
                        className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                          isFogVisible
                            ? 'bg-teal-500/20 border-teal-500/50 text-teal-300'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {isFogVisible ? <Eye className="w-4 h-4 text-teal-400" /> : <EyeOff className="w-4 h-4 text-zinc-500" />}
                        {isFogVisible ? 'FOG ACTIVE' : 'FOG HIDDEN'}
                      </button>
                      <button
                        id="btn-reset-fog-flyout"
                        onClick={resetFog}
                        className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-red-500/20 border border-zinc-700 hover:border-red-500/40 text-zinc-400 hover:text-red-400 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Cover All Map in Fog"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* Reveal Tools */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
                    <span className="text-[10px] uppercase font-bold font-mono text-zinc-400">Reveal Tools</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        id="btn-reveal-brush"
                        onClick={() => setTool('reveal')}
                        className={`py-2 px-2 rounded-xl text-xs font-medium transition-all border whitespace-nowrap text-center cursor-pointer ${
                          tool === 'reveal'
                            ? 'bg-teal-500 text-zinc-950 font-bold border-teal-400 shadow-sm'
                            : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                        }`}
                        title="Brush Reveal: Click or drag to reveal fog with circle eraser"
                      >
                        Brush Reveal
                      </button>
                      <button
                        id="btn-reveal-polygon"
                        onClick={() => { setTool('polygon_reveal'); setCurrentPolygonPoints([]); }}
                        className={`py-2 px-2 rounded-xl text-xs font-medium transition-all border whitespace-nowrap text-center cursor-pointer ${
                          tool === 'polygon_reveal'
                            ? 'bg-teal-500 text-zinc-950 font-bold border-teal-400 shadow-sm'
                            : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                        }`}
                        title="Polygon Reveal: Click corners to reveal custom polygon boundaries"
                      >
                        Polygon Reveal
                      </button>
                    </div>

                    {tool === 'reveal' && (
                      <div className="flex flex-col gap-1.5 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-zinc-400">BRUSH RADIUS</span>
                          <span className="text-teal-400 font-bold">{brushSize}px</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="200"
                          value={brushSize}
                          onChange={(e) => setBrushSize(parseInt(e.target.value))}
                          className="w-full accent-teal-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    )}

                    {tool === 'polygon_reveal' && (
                      <div className="p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-800 text-[10px] text-zinc-400 font-mono leading-relaxed">
                        <p>• Click on the map to place polygon vertices.</p>
                        <p>• Click the first vertex (or double click) to reveal area.</p>
                        <p className="mt-1 text-teal-400 italic">• Right-click or press Escape to cancel.</p>
                      </div>
                    )}

                    {/* Player Token Vision Reveal Dedicated Control Card */}
                    <div className={`p-2.5 rounded-xl border transition-all flex flex-col gap-1.5 ${
                      visionConfig?.enabled
                        ? 'bg-teal-950/25 border-teal-500/35 text-teal-300 shadow-[0_0_12px_rgba(20,184,166,0.1)]'
                        : 'bg-zinc-950/40 border-zinc-800 text-zinc-400'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${visionConfig?.enabled ? 'bg-teal-400 shadow-[0_0_6px_rgba(45,212,191,0.9)]' : 'bg-zinc-600'}`} />
                          <span className="text-xs font-semibold text-zinc-200">Play Token Reveal</span>
                        </div>
                        {setVisionConfig && (
                          <button
                            id="btn-toggle-player-token-reveal-switch"
                            onClick={() =>
                              setVisionConfig((prev) => ({ ...prev, enabled: !prev.enabled }))
                            }
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold transition-all border flex items-center gap-1 cursor-pointer ${
                              visionConfig?.enabled
                                ? 'bg-teal-500 text-zinc-950 border-teal-400 shadow-sm'
                                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                            }`}
                            title="Toggle player token dynamic fog of war vision reveal on or off"
                          >
                            {visionConfig?.enabled ? 'REVEAL ON' : 'REVEAL OFF'}
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-zinc-400 leading-tight">
                        {visionConfig?.enabled
                          ? 'Player tokens automatically pierce and reveal fog of war as they move based on line-of-sight.'
                          : 'Player token fog vision is OFF. Only manual brush & polygon reveals uncover the map.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 3: BATTLE GRID LAYER                                                  */}
              {/* ========================================================================= */}
              {lightingSubTab === 'grid' && (
                <div className="flex flex-col gap-3">
                  {/* Grid Visibility Toggle */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold font-mono text-zinc-400">Battle Grid Layer</span>
                      <button
                        onClick={() => setGridVisible(!gridVisible)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold transition-all border cursor-pointer ${
                          gridVisible
                            ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                        }`}
                      >
                        {gridVisible ? 'GRID ON' : 'GRID OFF'}
                      </button>
                    </div>

                    {/* Opacity slider */}
                    <div className="flex flex-col gap-1 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-zinc-400">GRID OPACITY</span>
                        <span className="text-cyan-400 font-bold">{Math.round(gridOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={gridOpacity}
                        onChange={(e) => setGridOpacity(parseFloat(e.target.value))}
                        className="w-full accent-cyan-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Grid Size Slider */}
                    <div className="flex flex-col gap-1 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-zinc-400">SQUARE SIZE</span>
                        {isEditingGridSize ? (
                          <input
                            type="number"
                            min="10"
                            max="500"
                            step="0.5"
                            autoFocus
                            value={customGridSizeInput}
                            onChange={(e) => setCustomGridSizeInput(e.target.value)}
                            onBlur={() => {
                              const val = parseFloat(customGridSizeInput);
                              if (!isNaN(val) && val >= 10 && val <= 500) {
                                setGridSize(val);
                              }
                              setIsEditingGridSize(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = parseFloat(customGridSizeInput);
                                if (!isNaN(val) && val >= 10 && val <= 500) {
                                  setGridSize(val);
                                }
                                setIsEditingGridSize(false);
                              } else if (e.key === 'Escape') {
                                setIsEditingGridSize(false);
                              }
                            }}
                            className="w-16 px-1 py-0.5 bg-zinc-900 border border-cyan-500/60 rounded text-cyan-300 font-bold text-xs text-right outline-none"
                          />
                        ) : (
                          <span
                            onClick={() => {
                              setCustomGridSizeInput(String(gridSize));
                              setIsEditingGridSize(true);
                            }}
                            className="text-cyan-400 font-bold cursor-pointer hover:underline hover:text-cyan-300 transition-colors"
                            title="Click to enter custom square size in pixels"
                          >
                            {gridSize}px
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setGridSize(Math.max(10, Math.round((gridSize - 0.5) * 10) / 10))}
                          className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center shrink-0 text-xs font-bold cursor-pointer"
                          title="Decrease Grid Size (0.5px)"
                        >
                          -
                        </button>
                        <input
                          type="range"
                          min="10"
                          max="200"
                          step="0.5"
                          value={gridSize}
                          onChange={(e) => setGridSize(parseFloat(e.target.value))}
                          className="w-full accent-cyan-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                        />
                        <button
                          onClick={() => setGridSize(Math.min(500, Math.round((gridSize + 0.5) * 10) / 10))}
                          className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center shrink-0 text-xs font-bold cursor-pointer"
                          title="Increase Grid Size (0.5px)"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Grid Alignment Nudge */}
                    <div className="flex flex-col gap-2 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-zinc-400">ALIGNMENT NUDGE</span>
                        <button
                          onClick={() => { setGridOffsetX(0); setGridOffsetY(0); }}
                          className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 font-mono cursor-pointer"
                        >
                          <RotateCcw className="w-2.5 h-2.5" /> Reset
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-1 w-28 mx-auto py-1">
                        <div />
                        <button
                          onClick={() => setGridOffsetY(prev => prev - 1)}
                          className="h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center cursor-pointer"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <div />
                        <button
                          onClick={() => setGridOffsetX(prev => prev - 1)}
                          className="h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] font-mono text-cyan-400">
                          {gridOffsetX},{gridOffsetY}
                        </div>
                        <button
                          onClick={() => setGridOffsetX(prev => prev + 1)}
                          className="h-7 rounded-lg bg-zinc-850 hover:bg-zinc-750 text-zinc-300 flex items-center justify-center cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <div />
                        <button
                          onClick={() => setGridOffsetY(prev => prev + 1)}
                          className="h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center cursor-pointer"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <div />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 4: ROOM POLYGONS & BRIEFINGS                                          */}
              {/* ========================================================================= */}
              {lightingSubTab === 'zones' && (
                <div className="flex flex-col gap-3">
                  {/* Room Zone Tools */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] uppercase font-bold font-mono text-zinc-400">Room Tools</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        id="btn-sidebar-zone-polygon"
                        onClick={() => {
                          if (setCampaignMode && campaignMode !== 'creator') {
                            setCampaignMode('creator');
                          }
                          const nextTool = tool === 'zone' || tool === 'polygon_zone' ? 'select' : 'zone';
                          setTool(nextTool);
                          setCurrentPolygonPoints([]);
                        }}
                        className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                          tool === 'zone' || tool === 'polygon_zone'
                            ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/30'
                            : 'bg-zinc-800 hover:bg-zinc-750 border-zinc-700 text-zinc-300 hover:text-white'
                        }`}
                        title="Draw polygon room outline on canvas"
                      >
                        <Pentagon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{tool === 'zone' || tool === 'polygon_zone' ? 'Drawing' : 'Polygon'}</span>
                      </button>

                      <button
                        id="btn-sidebar-hotspot-tool"
                        onClick={() => {
                          if (setCampaignMode && campaignMode !== 'creator') {
                            setCampaignMode('creator');
                          }
                          const nextTool = tool === 'hotspot' ? 'select' : 'hotspot';
                          setTool(nextTool);
                        }}
                        className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                          tool === 'hotspot'
                            ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/30'
                            : 'bg-zinc-800 hover:bg-zinc-750 border-zinc-700 text-zinc-300 hover:text-white'
                        }`}
                        title="Place numbered room badge on canvas"
                      >
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{tool === 'hotspot' ? 'Placing' : 'Badge'}</span>
                      </button>

                      <button
                        id="btn-sidebar-label-tool"
                        onClick={() => {
                          if (setCampaignMode && campaignMode !== 'creator') {
                            setCampaignMode('creator');
                          }
                          const nextTool = tool === 'label' ? 'select' : 'label';
                          setTool(nextTool);
                        }}
                        className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                          tool === 'label'
                            ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/30'
                            : 'bg-zinc-800 hover:bg-zinc-750 border-zinc-700 text-zinc-300 hover:text-white'
                        }`}
                        title="Place label on canvas (e.g. 'Stairs up to...', 'Ladder down to...')"
                      >
                        <Tag className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{tool === 'label' ? 'Placing' : 'Label'}</span>
                      </button>
                    </div>

                    {/* Active Drawing Tool Guide */}
                    {(tool === 'zone' || tool === 'polygon_zone') && (
                      <div className="p-2.5 bg-amber-950/30 border border-amber-500/40 rounded-xl text-[10px] font-mono text-amber-200/90 space-y-1">
                        <div className="font-bold text-amber-300 flex items-center gap-1">
                          <Pentagon className="w-3 h-3 text-amber-400" />
                          <span>Drawing Room Polygon:</span>
                        </div>
                        <div>• Click map to place corner vertices</div>
                        <div>• Click first point (or double-click) to complete</div>
                        <div>• Right-click or Esc to cancel</div>
                      </div>
                    )}

                    {tool === 'hotspot' && (
                      <div className="p-2.5 bg-amber-950/30 border border-amber-500/40 rounded-xl text-[10px] font-mono text-amber-200/90 space-y-1">
                        <div className="font-bold text-amber-300 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-amber-400" />
                          <span>Placing Room Badge:</span>
                        </div>
                        <div>• Click anywhere on the map to drop a numbered room marker</div>
                      </div>
                    )}

                    {tool === 'label' && (
                      <div className="p-2.5 bg-amber-950/30 border border-amber-500/40 rounded-xl text-[10px] font-mono text-amber-200/90 space-y-1">
                        <div className="font-bold text-amber-300 flex items-center gap-1">
                          <Tag className="w-3 h-3 text-amber-400" />
                          <span>Placing Map Label:</span>
                        </div>
                        <div>• Click anywhere on the map to place a label</div>
                        <div>• Quick presets for stairs, ladders, portals, and trapdoors</div>
                        <div>• Can toggle visibility to players</div>
                        <div>• Right-click or Esc to cancel</div>
                      </div>
                    )}
                  </div>

                  {/* Saved Room Annotations & Labels List */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                      <span className="font-bold text-zinc-300 uppercase">
                        Rooms &amp; Labels ({roomAnnotations.length})
                      </span>
                    </div>

                    {roomAnnotations.length === 0 ? (
                      <div className="p-3 bg-zinc-950/40 border border-zinc-800/80 rounded-xl text-center flex flex-col items-center justify-center gap-1.5 py-4">
                        <Pentagon className="w-5 h-5 text-zinc-600" />
                        <span className="text-[11px] font-mono text-zinc-400">No rooms or labels yet</span>
                        <span className="text-[9.5px] text-zinc-500 leading-tight">
                          Select &quot;Draw Polygon&quot; to map rooms, or &quot;Place Label&quot; to add stairs, ladders, or points of interest.
                        </span>
                      </div>
                    ) : (
                      <div className="max-h-[240px] overflow-y-auto flex flex-col gap-1.5 pr-1 sidebar-scrollbar">
                        {roomAnnotations.map((anno, idx) => {
                          const isLabel = anno.type === 'label';
                          const glyph = isLabel ? (LABEL_GLYPHS[anno.icon || 'stairs-up'] || '🏷️') : null;

                          return (
                            <div
                              key={anno.id || idx}
                              onClick={() => onOpenZoneDetails?.(anno)}
                              className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800 hover:border-amber-500/40 transition-all flex items-center justify-between gap-2 cursor-pointer group"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {isLabel ? (
                                  <span
                                    className="w-5 h-5 rounded-lg border text-[11px] font-bold flex items-center justify-center shrink-0 shadow-sm"
                                    style={{
                                      backgroundColor: `${anno.color || '#f59e0b'}25`,
                                      borderColor: anno.color || '#f59e0b',
                                      color: anno.color || '#f59e0b'
                                    }}
                                  >
                                    {glyph}
                                  </span>
                                  ) : (
                                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold font-mono flex items-center justify-center shrink-0">
                                      {anno.roomNumber || idx + 1}
                                    </span>
                                  )}
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-bold text-zinc-200 group-hover:text-amber-200 truncate block">
                                        {anno.label || anno.roomName || `Room ${anno.roomNumber || idx + 1}`}
                                      </span>
                                      {isLabel && (
                                        <span
                                          className={`text-[8px] px-1 py-0.5 rounded font-mono font-bold shrink-0 ${
                                            anno.visibleToPlayers
                                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                                              : 'bg-zinc-850 text-zinc-400 border border-zinc-700/50'
                                          }`}
                                        >
                                          {anno.visibleToPlayers ? 'Player Visible' : 'DM Only'}
                                        </span>
                                      )}
                                    </div>
                                    {(anno.boxedText || anno.dmNotes) && (
                                      <p className="text-[9.5px] text-zinc-500 truncate">
                                        {anno.boxedText || anno.dmNotes}
                                      </p>
                                    )}
                                  </div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteZoneAnnotation?.(anno.id);
                                }}
                                className="text-zinc-500 hover:text-red-400 p-1 rounded transition-colors cursor-pointer"
                                title="Delete Annotation"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          {activeGroup === 'combat' && (
            <div className="p-3.5 flex flex-col gap-3 min-w-[260px]">
              {/* Header */}
              <div
                onMouseDown={pinnedGroup ? handleDragStart : undefined}
                className={`flex items-center justify-between border-b border-zinc-800 pb-2.5 ${pinnedGroup ? 'cursor-grab active:cursor-grabbing select-none' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <Swords className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold font-mono text-zinc-200 uppercase tracking-wider">Combat & Measure</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPinnedGroup(pinnedGroup === 'combat' ? null : 'combat')}
                    className={`p-1 rounded-md transition-colors ${pinnedGroup === 'combat' ? 'text-amber-400 bg-amber-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                    title={pinnedGroup === 'combat' ? 'Unpin Menu' : 'Pin Menu Open (Allows moving)'}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={closeFlyout}
                    className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Initiative & Combat Tracking */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] uppercase font-bold font-mono text-zinc-400">Initiative & Tracking</span>
                
                {/* Roll for Initiative Button */}
                <button
                  id="btn-roll-initiative-flyout"
                  type="button"
                  onClick={() => {
                    if (onPromptRollInitiative) {
                      onPromptRollInitiative();
                    }
                  }}
                  className="w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-between border transition-all bg-gradient-to-r from-amber-600/30 to-amber-500/20 hover:from-amber-500/40 hover:to-amber-500/30 border-amber-500/50 text-amber-200 hover:text-white shadow-md shadow-amber-950/30 cursor-pointer active:scale-[0.98]"
                  title="Prompt all tokens on map to roll initiative"
                >
                  <span className="flex items-center gap-2">
                    <Dices className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span>Roll for Initiative</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-amber-500 text-black">
                    PROMPT
                  </span>
                </button>

                {/* Combat Tracker Toggle */}
                <button
                  id="btn-toggle-combat-tracker-flyout"
                  onClick={() => setShowCombatTracker(!showCombatTracker)}
                  className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-between border transition-all ${
                    showCombatTracker
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-md shadow-amber-950/40'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Swords className="w-4 h-4 text-amber-400" />
                    Combat Tracker
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${showCombatTracker ? 'bg-amber-500 text-black' : 'bg-zinc-900 text-zinc-400'}`}>
                    {showCombatTracker ? 'ACTIVE' : 'OFF'}
                  </span>
                </button>
              </div>

              {/* Auto-Apply Monster Damage Toggle */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-zinc-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold font-mono text-zinc-400">Target Damage Rule</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${autoApplyMonsterDamage ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>
                    {autoApplyMonsterDamage ? 'AUTO DAMAGE' : 'MANUAL HP'}
                  </span>
                </div>
                <button
                  id="btn-toggle-auto-monster-damage"
                  type="button"
                  onClick={() => onToggleAutoApplyMonsterDamage?.(!autoApplyMonsterDamage)}
                  className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-between border transition-all cursor-pointer ${
                    autoApplyMonsterDamage
                      ? 'bg-rose-500/15 border-rose-500/50 text-rose-200 shadow-sm'
                      : 'bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                  }`}
                  title={autoApplyMonsterDamage ? "Monsters automatically take damage when targeted by players" : "DM manually manages monster HP"}
                >
                  <span className="flex items-center gap-2">
                    <HeartCrack className={`w-4 h-4 ${autoApplyMonsterDamage ? 'text-rose-400' : 'text-zinc-500'}`} />
                    <span>Auto Monster Damage</span>
                  </span>
                  <div className={`w-8 h-4 rounded-full transition-colors relative flex items-center px-0.5 ${autoApplyMonsterDamage ? 'bg-rose-500' : 'bg-zinc-700'}`}>
                    <div className={`w-3 h-3 rounded-full bg-white transition-transform ${autoApplyMonsterDamage ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </button>
                <p className="text-[10px] text-zinc-400/90 leading-tight">
                  {autoApplyMonsterDamage
                    ? "Player spells & attacks automatically subtract damage from monster HP."
                    : "Monsters will NOT take auto damage. Rolls are broadcast for the DM to apply manually."}
                </p>
              </div>

              {/* Critical Hits & Screen Shake FX */}
              <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
                <span className="text-[10px] uppercase font-bold font-mono text-zinc-400">Critical Hits & FX</span>
                
                {/* Critical Hits Table Reference Modal Trigger */}
                <button
                  id="btn-open-critical-hits-table"
                  type="button"
                  onClick={() => {
                    if (onOpenCriticalHitsModal) {
                      onOpenCriticalHitsModal();
                    }
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-red-600/25 via-rose-600/20 to-amber-600/20 hover:from-red-600/35 hover:to-amber-600/30 border border-red-500/50 hover:border-red-400 text-red-200 hover:text-white text-xs font-bold transition-all flex items-center justify-between shadow-md shadow-red-950/30 cursor-pointer active:scale-[0.98]"
                  title="Open Critical Hits Revisited Reference Tables (Damage Types, Injuries, Insanity)"
                >
                  <span className="flex items-center gap-2">
                    <Skull className="w-4 h-4 text-red-400 animate-pulse" />
                    <span>Critical Hits Table</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-red-500/30 text-red-300 border border-red-500/40">
                    d20 CRIT
                  </span>
                </button>

                {/* Critical Screen Shake */}
                <button
                  id="btn-trigger-shake-flyout"
                  onClick={triggerShake}
                  className="w-full py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-bold transition-all flex items-center justify-between cursor-pointer"
                  title="Trigger screen rumble effect across all screens"
                >
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-red-400" />
                    Critical Hit Screen Shake
                  </span>
                  <span className="text-[10px] text-red-400/80 font-mono">SLAM</span>
                </button>
              </div>

              {/* AoE Measurement Shapes */}
              <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
                <span className="text-[10px] uppercase font-bold font-mono text-zinc-400">Measure Distance & AoE</span>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    { type: 'line', label: 'Distance Ruler', icon: Ruler },
                    { type: 'circle', label: 'Radius AoE (Circle)', icon: CircleIcon },
                    { type: 'cone', label: 'Spell Cone (15/60ft)', icon: Wind },
                    { type: 'square', label: 'Cube AoE (Square)', icon: SquareIcon },
                    { type: 'rectangle', label: 'Wall AoE (Rectangle)', icon: SquareIcon }
                  ].map((m) => {
                    const Icon = m.icon;
                    const isCurrent = tool === 'measure' && measureType === m.type;
                    return (
                      <button
                        key={m.type}
                        onClick={() => {
                          setTool('measure');
                          setMeasureType(m.type as any);
                        }}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                          isCurrent
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold shadow-sm'
                            : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4 text-amber-400" />
                          {m.label}
                        </span>
                        {isCurrent && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeGroup === 'fx' && (
            <div className={`p-3.5 flex flex-col gap-3 ${fxCategory === 'spells' ? 'min-w-[340px] max-w-[390px]' : 'min-w-[320px] max-w-[360px]'}`}>
              {/* Header */}
              <div
                onMouseDown={pinnedGroup ? handleDragStart : undefined}
                className={`flex items-center justify-between border-b border-zinc-800 pb-2.5 ${pinnedGroup ? 'cursor-grab active:cursor-grabbing select-none' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold font-mono text-zinc-200 uppercase tracking-wider">Tactical & Spell FX</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPinnedGroup(pinnedGroup === 'fx' ? null : 'fx')}
                    className={`p-1 rounded-md transition-colors ${pinnedGroup === 'fx' ? 'text-cyan-400 bg-cyan-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                    title={pinnedGroup === 'fx' ? 'Unpin Menu' : 'Pin Menu Open (Allows moving)'}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={closeFlyout}
                    className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Category Switcher: Animated Spells (JB2A) vs Tactical & Weather FX */}
              <div className="flex bg-zinc-950/80 p-1 rounded-xl border border-zinc-800 gap-1 shrink-0">
                <button
                  onClick={() => setFxCategory('spells')}
                  className={`flex-1 py-1.5 px-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    fxCategory === 'spells'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0 text-purple-300" />
                  <span className="truncate">Animated Spells</span>
                  {activeEquippedAsset && (
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                  )}
                </button>
                <button
                  onClick={() => setFxCategory('tactical')}
                  className={`flex-1 py-1.5 px-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    fxCategory === 'tactical'
                      ? 'bg-cyan-500 text-zinc-950 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                  }`}
                >
                  <Waves className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Tactical FX</span>
                  {(boardAnimatedFeatures.length > 0 || boardWeatherEffect !== 'none') && (
                    <span className={`text-[9px] px-1 rounded-full font-bold ${
                      fxCategory === 'tactical' ? 'bg-zinc-950 text-cyan-300' : 'bg-zinc-800 text-zinc-300'
                    }`}>
                      {boardAnimatedFeatures.length > 0 ? boardAnimatedFeatures.length : '●'}
                    </span>
                  )}
                </button>
              </div>

              {/* TAB 1: ANIMATED SPELLS (JB2A) */}
              {fxCategory === 'spells' && (
                <EffectsDrawer
                  onEquipEffect={onEquipAsset}
                  onQuickPlaceEffect={onQuickPlaceAsset}
                  onClearEffects={onClearEffects}
                  onDispelEffect={onDispelEffect}
                  activeEffects={activeEffects}
                  activeEquippedId={activeEquippedAsset?.id}
                  gridSize={gridSize}
                />
              )}

              {/* TAB 2: TACTICAL & WEATHER */}
              {fxCategory === 'tactical' && (
                <>
              {/* Sub-Tabs: Features vs Weather vs Map Sizing */}
              <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                <button
                  onClick={() => setFxSubTab('features')}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    fxSubTab === 'features' ? 'bg-cyan-500 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Waves className="w-3 h-3" />
                  <span>Features</span>
                </button>
                <button
                  onClick={() => setFxSubTab('weather')}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    fxSubTab === 'weather' ? 'bg-cyan-500 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <CloudRain className="w-3 h-3" />
                  <span>Weather</span>
                </button>
                <button
                  onClick={() => setFxSubTab('scale')}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    fxSubTab === 'scale' ? 'bg-cyan-500 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Scale</span>
                </button>
              </div>

              {/* TAB 1: ANIMATED FEATURES */}
              {fxSubTab === 'features' && (
                <div className="flex flex-col gap-3 max-h-[360px] overflow-y-auto pr-1 sidebar-scrollbar">
                  {/* Master Play/Pause Switch */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                    <div className="flex items-center gap-2">
                      {boardAnimatedEnabled ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.9)] animate-pulse" />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
                      )}
                      <div>
                        <div className="text-xs font-bold text-zinc-200">Animation Engine</div>
                        <div className="text-[10px] font-mono text-zinc-500">
                          {boardAnimatedEnabled ? 'Active (Live particle loop)' : 'Paused'}
                        </div>
                      </div>
                    </div>
                    {setBoardAnimatedEnabled && (
                      <button
                        onClick={() => setBoardAnimatedEnabled(!boardAnimatedEnabled)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 ${
                          boardAnimatedEnabled
                            ? 'bg-cyan-500 text-zinc-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                        }`}
                      >
                        {boardAnimatedEnabled ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        <span>{boardAnimatedEnabled ? 'Running' : 'Paused'}</span>
                      </button>
                    )}
                  </div>

                  {/* Add Feature Buttons */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Place FX on Map</span>
                      {boardPlacingAnimatedType && (
                        <span className="text-[10px] font-mono text-cyan-400 animate-pulse font-bold">
                          Click Map to Place
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { type: 'water' as AnimatedFeatureType, label: 'River / Water', icon: Waves, color: 'text-cyan-400', border: 'hover:border-cyan-500/50' },
                        { type: 'lava' as AnimatedFeatureType, label: 'Molten Lava', icon: Flame, color: 'text-orange-400', border: 'hover:border-orange-500/50' },
                        { type: 'torch' as AnimatedFeatureType, label: 'Torch Light', icon: Flame, color: 'text-amber-300', border: 'hover:border-amber-500/50' },
                        { type: 'arcane' as AnimatedFeatureType, label: 'Arcane Rune', icon: Sparkles, color: 'text-fuchsia-400', border: 'hover:border-fuchsia-500/50' },
                        { type: 'fog' as AnimatedFeatureType, label: 'Fog Bank', icon: Wind, color: 'text-zinc-300', border: 'hover:border-zinc-500/50' },
                        { type: 'toxic' as AnimatedFeatureType, label: 'Acid Pool', icon: Droplets, color: 'text-lime-400', border: 'hover:border-lime-500/50' }
                      ].map((item) => {
                        const isPlacing = boardPlacingAnimatedType === item.type;
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.type}
                            onClick={() => {
                              if (setBoardPlacingAnimatedType) {
                                setBoardPlacingAnimatedType(isPlacing ? null : item.type);
                              }
                            }}
                            className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all text-xs font-medium ${
                              isPlacing
                                ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 ring-2 ring-cyan-400/40 font-bold shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                                : `bg-zinc-800/60 border-zinc-700/60 text-zinc-300 ${item.border} hover:bg-zinc-800`
                            }`}
                            title={
                              item.type === 'water' || item.type === 'lava'
                                ? `Draw custom polygon outline for ${item.label} on map`
                                : `Place ${item.label} on map`
                            }
                          >
                            <Icon className={`w-3.5 h-3.5 ${item.color} shrink-0`} />
                            <span className="truncate">{item.label}</span>
                            {(item.type === 'water' || item.type === 'lava') && (
                              <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-zinc-900/90 text-cyan-300 border border-zinc-700/60 font-mono shrink-0">
                                Draw
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Placed Features List & Sizing/Intensity Controls */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Placed Features</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-zinc-800 text-cyan-400 text-[9px] font-mono font-bold">
                          {boardAnimatedFeatures.length}
                        </span>
                      </div>
                      {setShowBoardAnimatedControls && (
                        <button
                          onClick={() => setShowBoardAnimatedControls(!showBoardAnimatedControls)}
                          className={`text-[10px] font-mono flex items-center gap-1 transition-colors ${
                            showBoardAnimatedControls ? 'text-cyan-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                          title="Show or hide position markers on the map"
                        >
                          {showBoardAnimatedControls ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          <span>{showBoardAnimatedControls ? 'Markers On' : 'Markers Off'}</span>
                        </button>
                      )}
                    </div>

                    {boardAnimatedFeatures.length === 0 ? (
                      <div className="p-3 rounded-xl bg-zinc-950/60 border border-dashed border-zinc-800 text-center">
                        <p className="text-[11px] text-zinc-500 font-sans">
                          No features placed on this map. Click a tool above and click anywhere on the uploaded map to place animated rivers, lava, or torches!
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {boardAnimatedFeatures.map((feat) => {
                          const isEditing = editingFeatureId === feat.id;
                          return (
                            <div
                              key={feat.id}
                              className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col gap-2"
                            >
                              <div className="flex items-center justify-between">
                                <button
                                  onClick={() => setEditingFeatureId(isEditing ? null : feat.id)}
                                  className="flex items-center gap-2 text-left text-xs font-semibold text-zinc-200 hover:text-cyan-300 transition-colors"
                                >
                                  {feat.type === 'water' && <Waves className="w-3.5 h-3.5 text-cyan-400" />}
                                  {feat.type === 'lava' && <Flame className="w-3.5 h-3.5 text-orange-400" />}
                                  {feat.type === 'torch' && <Flame className="w-3.5 h-3.5 text-amber-300" />}
                                  {feat.type === 'arcane' && <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />}
                                  {feat.type === 'fog' && <Wind className="w-3.5 h-3.5 text-zinc-300" />}
                                  {feat.type === 'toxic' && <Droplets className="w-3.5 h-3.5 text-lime-400" />}
                                  <span className="capitalize">{feat.type === 'toxic' ? 'Acid Pool' : feat.type}</span>
                                  <span className="text-[10px] font-mono text-zinc-500 font-normal">
                                    ({feat.x}%, {feat.y}%)
                                  </span>
                                </button>
                                <div className="flex items-center gap-1">
                                  {onDuplicateFeature && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDuplicateFeature(feat);
                                      }}
                                      className="p-1 rounded text-zinc-500 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                                      title={`Duplicate modified ${feat.type}`}
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setEditingFeatureId(isEditing ? null : feat.id)}
                                    className={`p-1 rounded text-[10px] font-mono transition-colors ${
                                      isEditing ? 'bg-cyan-500/20 text-cyan-300' : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                                  >
                                    <Sliders className="w-3 h-3" />
                                  </button>
                                  {setBoardAnimatedFeatures && (
                                    <button
                                      onClick={() => setBoardAnimatedFeatures(prev => prev.filter(f => f.id !== feat.id))}
                                      className="p-1 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors"
                                      title="Remove feature"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {isEditing && (
                                <div className="pt-2 border-t border-zinc-900 flex flex-col gap-2">
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                                      <span>Radius / Area</span>
                                      <span>{feat.radius}%</span>
                                    </div>
                                    <input
                                      type="range"
                                      min={4}
                                      max={40}
                                      step={1}
                                      value={feat.radius}
                                      onChange={(e) => {
                                        if (setBoardAnimatedFeatures) {
                                          const val = parseFloat(e.target.value);
                                          setBoardAnimatedFeatures(prev => prev.map(f => f.id === feat.id ? { ...f, radius: val } : f));
                                        }
                                      }}
                                      className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
                                    />
                                  </div>

                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                                      <span>Intensity</span>
                                      <span>{Math.round((feat.intensity || 1) * 100)}%</span>
                                    </div>
                                    <input
                                      type="range"
                                      min={0.3}
                                      max={2.0}
                                      step={0.1}
                                      value={feat.intensity || 1}
                                      onChange={(e) => {
                                        if (setBoardAnimatedFeatures) {
                                          const val = parseFloat(e.target.value);
                                          setBoardAnimatedFeatures(prev => prev.map(f => f.id === feat.id ? { ...f, intensity: val } : f));
                                        }
                                      }}
                                      className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
                                    />
                                  </div>

                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                                      <span>Animation Speed</span>
                                      <span>{((feat.speed ?? 1.0) * 100).toFixed(0)}%</span>
                                    </div>
                                    <input
                                      type="range"
                                      min={0.2}
                                      max={2.5}
                                      step={0.1}
                                      value={feat.speed ?? 1.0}
                                      onChange={(e) => {
                                        if (setBoardAnimatedFeatures) {
                                          const val = parseFloat(e.target.value);
                                          setBoardAnimatedFeatures(prev => prev.map(f => f.id === feat.id ? { ...f, speed: val } : f));
                                        }
                                      }}
                                      className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
                                    />
                                  </div>

                                  {(feat.type === 'water' || feat.type === 'fog' || feat.type === 'lava' || feat.type === 'toxic') && (
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                                        <span>{feat.type === 'fog' ? 'Wind Drift' : 'Flow Direction'}</span>
                                        <span>{feat.rotation || 0}°</span>
                                      </div>
                                      <input
                                        type="range"
                                        min={0}
                                        max={360}
                                        step={15}
                                        value={feat.rotation || 0}
                                        onChange={(e) => {
                                          if (setBoardAnimatedFeatures) {
                                            const val = parseInt(e.target.value, 10);
                                            setBoardAnimatedFeatures(prev => prev.map(f => f.id === feat.id ? { ...f, rotation: val } : f));
                                          }
                                        }}
                                        className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
                                      />
                                    </div>
                                  )}

                                  {/* Action Buttons: Duplicate & Stamp Copies */}
                                  <div className="pt-2 border-t border-zinc-900 grid grid-cols-2 gap-1.5">
                                    {onDuplicateFeature && (
                                      <button
                                        type="button"
                                        onClick={() => onDuplicateFeature(feat)}
                                        className="py-1 px-2 rounded-lg bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-800/60 hover:border-cyan-400 text-cyan-300 hover:text-white text-[10px] font-bold font-mono transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                                        title={`Duplicate this modified ${feat.type} with identical settings`}
                                      >
                                        <Copy className="w-3 h-3 text-cyan-400" />
                                        <span>Duplicate</span>
                                      </button>
                                    )}
                                    {onStartStampingFeature && (
                                      <button
                                        type="button"
                                        onClick={() => onStartStampingFeature(feat)}
                                        className="py-1 px-2 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-800/60 hover:border-amber-400 text-amber-300 hover:text-white text-[10px] font-bold font-mono transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                                        title={`Stamp multiple copies of this modified ${feat.type} across the map`}
                                      >
                                        <Layers className="w-3 h-3 text-amber-400" />
                                        <span>Stamp Copies</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {setBoardAnimatedFeatures && (
                          <button
                            onClick={() => {
                              setBoardAnimatedFeatures([]);
                              setEditingFeatureId(null);
                            }}
                            className="w-full mt-1 py-1.5 rounded-lg border border-red-900/50 hover:border-red-600 bg-red-950/30 hover:bg-red-900/40 text-red-400 hover:text-red-200 text-[11px] font-bold font-mono transition-all flex items-center justify-center gap-1.5"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Clear All Placed FX</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: REAL-TIME WEATHER OVERLAY */}
              {fxSubTab === 'weather' && (
                <div className="flex flex-col gap-3 max-h-[360px] overflow-y-auto pr-1 sidebar-scrollbar">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Atmospheric Particles</span>
                    <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">
                      Active: {boardWeatherEffect}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'none' as WeatherEffectType, label: 'Clear Skies', desc: 'No weather particles', icon: Sun, color: 'text-amber-400' },
                      { id: 'rain' as WeatherEffectType, label: 'Rain & Storm', desc: 'Falling rain & lightning', icon: CloudRain, color: 'text-sky-400' },
                      { id: 'snow' as WeatherEffectType, label: 'Blizzard Snow', desc: 'Drifting snowflakes', icon: Snowflake, color: 'text-cyan-200' },
                      { id: 'fog' as WeatherEffectType, label: 'Drifting Fog', desc: 'Dense rolling mist', icon: Wind, color: 'text-zinc-300' },
                      { id: 'embers' as WeatherEffectType, label: 'Volcanic Embers', desc: 'Rising hot cinders', icon: Flame, color: 'text-orange-400' },
                      { id: 'spores' as WeatherEffectType, label: 'Arcane Spores', desc: 'Luminescent spores', icon: Sparkles, color: 'text-fuchsia-400' }
                    ].map((w) => {
                      const isSelected = boardWeatherEffect === w.id;
                      const Icon = w.icon;
                      return (
                        <button
                          key={w.id}
                          onClick={() => {
                            if (setBoardWeatherEffect) setBoardWeatherEffect(w.id);
                          }}
                          className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                            isSelected
                              ? 'bg-cyan-500/20 border-cyan-400 ring-1 ring-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                              : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <Icon className={`w-3.5 h-3.5 ${w.color}`} />
                            <span className="text-xs font-bold text-zinc-200">{w.label}</span>
                          </div>
                          <span className="text-[9.5px] text-zinc-500 leading-tight">{w.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: TACTICAL MAP SIZING & SCALE */}
              {fxSubTab === 'scale' && (
                <div className="flex flex-col gap-3 max-h-[360px] overflow-y-auto pr-1 sidebar-scrollbar">
                  {/* Current Dimensions Card */}
                  {(() => {
                    const dims = getMapDimensions ? getMapDimensions() : { width: 0, height: 0 };
                    const cols = dims.width > 0 ? (dims.width / gridSize).toFixed(1) : '0';
                    const rows = dims.height > 0 ? (dims.height / gridSize).toFixed(1) : '0';
                    const ftW = dims.width > 0 ? Math.round((dims.width / gridSize) * 5) : 0;
                    const ftH = dims.height > 0 ? Math.round((dims.height / gridSize) * 5) : 0;

                    return (
                      <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-1.5">
                        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Current Map Sizing</span>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800/80">
                            <span className="text-[9px] font-mono text-zinc-500 block">Map Pixels</span>
                            <span className="font-mono text-zinc-200 font-bold">{dims.width} × {dims.height}</span>
                          </div>
                          <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800/80">
                            <span className="text-[9px] font-mono text-zinc-500 block">Tactical Grid</span>
                            <span className="font-mono text-amber-400 font-bold">{gridSize} px / 5ft</span>
                          </div>
                        </div>
                        <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 rounded-lg px-2 py-1 text-center font-bold">
                          {cols} × {rows} Squares ({ftW} × {ftH} FT)
                        </div>
                      </div>
                    );
                  })()}

                  {/* Preset Options */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Choose Tactical Scale</span>
                    <div className="flex flex-col gap-1.5">
                      {(Object.keys(MAP_SIZE_PRESETS) as Array<Exclude<MapSizePresetKey, 'custom'>>).map((key) => {
                        const p = MAP_SIZE_PRESETS[key];
                        const isSelected = selectedScalePreset === key;
                        return (
                          <button
                            key={key}
                            onClick={() => setSelectedScalePreset(key)}
                            className={`p-2 rounded-xl border text-left transition-all flex items-center justify-between ${
                              isSelected
                                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100 ring-1 ring-cyan-400/50'
                                : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                            }`}
                          >
                            <div>
                              <div className="text-xs font-bold text-zinc-200">{p.label}</div>
                              <div className="text-[10px] font-mono text-zinc-500">{p.width}×{p.height} Squares ({p.description})</div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                          </button>
                        );
                      })}

                      {/* Custom Option */}
                      <button
                        onClick={() => setSelectedScalePreset('custom')}
                        className={`p-2 rounded-xl border text-left transition-all flex items-center justify-between ${
                          selectedScalePreset === 'custom'
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100 ring-1 ring-cyan-400/50'
                            : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-zinc-200">Custom Dimensions</div>
                          <div className="text-[10px] font-mono text-zinc-500">Specify custom square columns & rows</div>
                        </div>
                        {selectedScalePreset === 'custom' && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                      </button>

                      {selectedScalePreset === 'custom' && (
                        <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-zinc-950 border border-zinc-800">
                          <div>
                            <span className="text-[9px] font-mono text-zinc-400 block mb-1">Columns (Width)</span>
                            <input
                              type="number"
                              min={5}
                              max={120}
                              value={customCols}
                              onChange={(e) => setCustomCols(Math.max(5, parseInt(e.target.value, 10) || 5))}
                              className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-200"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] font-mono text-zinc-400 block mb-1">Rows (Height)</span>
                            <input
                              type="number"
                              min={5}
                              max={120}
                              value={customRows}
                              onChange={(e) => setCustomRows(Math.max(5, parseInt(e.target.value, 10) || 5))}
                              className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-200"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Calibrate Grid Button */}
                  <button
                    onClick={() => handleCalibrateGrid(selectedScalePreset)}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-zinc-950 text-xs font-bold py-2.5 px-3 rounded-xl transition-all uppercase tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.35)] flex items-center justify-center gap-2"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>Calibrate Grid to Selected Scale</span>
                  </button>

                  {scaleFeedback && (
                    <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 text-[10px] font-mono animate-in fade-in">
                      {scaleFeedback}
                    </div>
                  )}
                </div>
              )}
                </>
              )}
            </div>
          )}

          {activeGroup === 'tokens' && (
            <div className="p-3.5 flex flex-col gap-3 min-w-[280px]">
              {/* Header (Only shown when NOT pinned, avoiding duplicate headers) */}
              {!pinnedGroup && (
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold font-mono text-zinc-200 uppercase tracking-wider">Creatures & Tokens</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPinnedGroup(pinnedGroup === 'tokens' ? null : 'tokens')}
                      className={`p-1 rounded-md transition-colors ${pinnedGroup === 'tokens' ? 'text-blue-400 bg-blue-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                      title={pinnedGroup === 'tokens' ? 'Unpin Menu' : 'Pin Menu Open (Allows moving)'}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={closeFlyout}
                      className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {(() => {
                const searchLower = tokenSearchQuery.trim().toLowerCase();

                // Extract ONLY genuine D&D Beyond synced characters (No default mock fallbacks)
                const heroMap = new Map<string, any>();

                // 1. Incorporate live DDB daemon cached characters (from active campaign)
                ddbPartyCharacters.forEach((c: any) => {
                  const ddbId = String(c.id);
                  heroMap.set(ddbId, {
                    id: `char_ddb_${ddbId}`,
                    ddbCharacterId: ddbId,
                    name: c.name,
                    url: c.avatarUrl || getCharacterTokenUrl(c.name),
                    size: 1,
                    hp: c.currentHp !== undefined ? c.currentHp : (c.maxHp || 10),
                    maxHp: c.maxHp || 10,
                    tempHp: c.tempHp || 0,
                    ac: c.ac || 10,
                    race: c.race || 'Hero',
                    classLevel: c.classLevel || 'D&D Beyond',
                    readonlyUrl: c.readonlyUrl,
                    category: 'character' as const
                  });
                });

                // 2. Incorporate compendium characters that are linked to D&D Beyond
                (compendiumCharacters || []).forEach((c: any) => {
                  const isMock = ['char_varrak', 'char_brannoc', 'char_noctua', 'char_aggie', 'char_rowan', 'char_sylas'].includes(c.id);
                  const hasDdbLink = !isMock && (
                    (c.id && c.id.startsWith('char_ddb_')) ||
                    (c.ddbCharacterId && !['146614740', '147334187', '158502126', '146533824'].includes(String(c.ddbCharacterId))) ||
                    (typeof c.notes === 'string' && c.notes.includes('D&D Beyond'))
                  );

                  if (hasDdbLink) {
                    const ddbId = String(c.ddbCharacterId || c.id.replace('char_ddb_', '') || c.name);
                    const existing = heroMap.get(ddbId);
                    heroMap.set(ddbId, {
                      id: c.id,
                      ddbCharacterId: c.ddbCharacterId || existing?.ddbCharacterId || ddbId,
                      name: c.name,
                      url: c.avatarUrl || existing?.url || getCharacterTokenUrl(c.name),
                      size: (c as any).size || existing?.size || 1,
                      hp: c.hp !== undefined ? c.hp : (existing?.hp ?? c.maxHp ?? 10),
                      maxHp: c.maxHp || existing?.maxHp || 10,
                      tempHp: c.tempHp || existing?.tempHp || 0,
                      ac: c.ac || existing?.ac || 10,
                      race: c.race || existing?.race || 'Hero',
                      classLevel: c.classLevel || existing?.classLevel || 'D&D Beyond',
                      readonlyUrl: existing?.readonlyUrl || (c.notes?.match(/https:\/\/dndbeyond\.com\/characters\/\d+/)?.[0]),
                      category: 'character' as const
                    });
                  }
                });

                const heroTokens = Array.from(heroMap.values()).filter(t => 
                  !searchLower ||
                  t.name.toLowerCase().includes(searchLower) ||
                  t.classLevel.toLowerCase().includes(searchLower) ||
                  t.race.toLowerCase().includes(searchLower)
                );

                const monsterList: Monster[] = (compendiumMonsters && compendiumMonsters.length > 0)
                  ? compendiumMonsters
                  : DEFAULT_MONSTERS;

                const filteredMonsters = monsterList.filter(m => 
                  !searchLower ||
                  m.name.toLowerCase().includes(searchLower) ||
                  (m.type && m.type.toLowerCase().includes(searchLower)) ||
                  (m.challenge && m.challenge.toLowerCase().includes(searchLower))
                );

                const allyList: Ally[] = (compendiumAllies && compendiumAllies.length > 0)
                  ? compendiumAllies
                  : DEFAULT_ALLIES;

                const allyTokens = allyList.filter(a => 
                  !searchLower ||
                  a.name.toLowerCase().includes(searchLower) ||
                  (a.summonSource && a.summonSource.toLowerCase().includes(searchLower)) ||
                  (a.type && a.type.toLowerCase().includes(searchLower))
                );

                const filteredCustomTokens = customTokens.filter(t => 
                  !searchLower || t.name.toLowerCase().includes(searchLower)
                );

                const totalMatching = 
                  (tokenCategoryFilter === 'all' ? (heroTokens.length + filteredMonsters.length + allyTokens.length + filteredCustomTokens.length) :
                   tokenCategoryFilter === 'characters' ? heroTokens.length :
                   tokenCategoryFilter === 'monsters' ? filteredMonsters.length :
                   tokenCategoryFilter === 'allies' ? allyTokens.length :
                   filteredCustomTokens.length);

                const spawnToken = (
                  name: string,
                  url: string,
                  size: number = 1,
                  category?: string,
                  hp?: number,
                  ac?: number,
                  sourceId?: string
                ) => {
                  const isMonster = category === 'monster' || isMonsterToken({ name, category });
                  const isAlly = category === 'ally';
                  const isPlayer = !isMonster && !isAlly;
                  const newToken = {
                    id: `token_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    name,
                    url,
                    x: -stagePos.x / stageScale + 120,
                    y: -stagePos.y / stageScale + 120,
                    size: size || 1,
                    hp: hp,
                    maxHp: hp,
                    currentHp: hp,
                    ac: ac,
                    isPlayer: isPlayer,
                    isMonster: isMonster,
                    category: isMonster ? 'monster' : (isAlly ? 'ally' : (category || 'character')),
                    visionEnabled: !isMonster,
                    visionRadius: isMonster ? 0 : 60,
                    ...(isMonster ? { monsterId: sourceId } : {}),
                    ...(isAlly ? { allyId: sourceId } : {}),
                    ...(category === 'character' && sourceId ? { ddbCharacterId: sourceId } : {})
                  };
                  setTokens(prev => [...prev, newToken]);
                  toast.success(`Spawned ${name} (${size}x${size})`);
                };

                return (
                  <div className="flex flex-col gap-2.5">
                    {/* Search & Category Filter Header */}
                    <div className="flex flex-col gap-1.5 bg-zinc-950/60 p-2 rounded-xl border border-zinc-800">
                      {/* Search Bar */}
                      <div className="relative flex items-center">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 text-zinc-500 pointer-events-none" />
                        <input
                          type="text"
                          value={tokenSearchQuery}
                          onChange={(e) => setTokenSearchQuery(e.target.value)}
                          placeholder="Search tokens & compendium monsters..."
                          className="w-full bg-zinc-900/90 border border-zinc-700/80 rounded-lg pl-8 pr-7 py-1 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 font-mono"
                        />
                        {tokenSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setTokenSearchQuery('')}
                            className="absolute right-2 text-zinc-500 hover:text-zinc-300 p-0.5"
                            title="Clear search"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Category Filter Chips */}
                      <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sidebar-scrollbar">
                        <button
                          type="button"
                          onClick={() => setTokenCategoryFilter('all')}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono transition-all flex items-center gap-1 shrink-0 ${
                            tokenCategoryFilter === 'all'
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                          }`}
                        >
                          All ({heroTokens.length + filteredMonsters.length + allyTokens.length + filteredCustomTokens.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setTokenCategoryFilter('characters')}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono transition-all flex items-center gap-1 shrink-0 ${
                            tokenCategoryFilter === 'characters'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-zinc-900 text-zinc-400 hover:text-emerald-300 hover:bg-zinc-800'
                          }`}
                        >
                          <User className="w-3 h-3 text-emerald-400" />
                          Heroes ({heroTokens.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setTokenCategoryFilter('monsters')}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono transition-all flex items-center gap-1 shrink-0 ${
                            tokenCategoryFilter === 'monsters'
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'bg-zinc-900 text-zinc-400 hover:text-rose-300 hover:bg-zinc-800'
                          }`}
                        >
                          <Skull className="w-3 h-3 text-rose-400" />
                          Monsters ({filteredMonsters.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setTokenCategoryFilter('allies')}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono transition-all flex items-center gap-1 shrink-0 ${
                            tokenCategoryFilter === 'allies'
                              ? 'bg-amber-600 text-white shadow-sm'
                              : 'bg-zinc-900 text-zinc-400 hover:text-amber-300 hover:bg-zinc-800'
                          }`}
                        >
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          Allies ({allyTokens.length})
                        </button>
                        {customTokens.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setTokenCategoryFilter('custom')}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono transition-all flex items-center gap-1 shrink-0 ${
                              tokenCategoryFilter === 'custom'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-zinc-900 text-zinc-400 hover:text-indigo-300 hover:bg-zinc-800'
                            }`}
                          >
                            <Cloud className="w-3 h-3 text-indigo-400" />
                            Custom ({customTokens.length})
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Upload button & size picker */}
                    <div className="flex items-center justify-between bg-zinc-950/60 p-2 rounded-xl border border-zinc-800">
                      <button
                        id="btn-upload-token-flyout"
                        onClick={() => tokenFileInputRef.current?.click()}
                        disabled={isUploadingToken}
                        className="px-2.5 py-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        {isUploadingToken ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                        ) : (
                          <CloudUpload className="w-3.5 h-3.5 text-blue-400" />
                        )}
                        {isUploadingToken ? 'Saving...' : 'Upload Token'}
                      </button>
                      <input
                        ref={tokenFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleTokenUpload}
                      />

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-zinc-400 font-mono">SIZE:</span>
                        {[1, 2, 3, 4].map((size) => (
                          <button
                            key={size}
                            onClick={() => setSelectedUploadSize(size)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-all cursor-pointer ${
                              selectedUploadSize === size ? 'bg-blue-500 text-white' : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            {size}x
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Structured Token Display Container */}
                    <div className="flex flex-col gap-3 max-h-[340px] overflow-y-auto p-1 sidebar-scrollbar pr-1.5">
                      {totalMatching === 0 ? (
                        <div className="py-6 px-4 text-center flex flex-col items-center gap-2 bg-zinc-900/30 rounded-xl border border-zinc-800/60">
                          <Filter className="w-6 h-6 text-zinc-600" />
                          <p className="text-xs text-zinc-400 font-medium">
                            {tokenSearchQuery ? `No tokens found matching "${tokenSearchQuery}"` : 'No tokens in this category'}
                          </p>
                          {(tokenSearchQuery || tokenCategoryFilter !== 'all') && (
                            <button
                              type="button"
                              onClick={() => {
                                setTokenSearchQuery('');
                                setTokenCategoryFilter('all');
                              }}
                              className="text-[11px] text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer mt-1"
                            >
                              Reset filters
                            </button>
                          )}
                        </div>
                      ) : (
                        <>
                          {/* Section: Custom / Uploaded Tokens */}
                          {(tokenCategoryFilter === 'all' || tokenCategoryFilter === 'custom') && filteredCustomTokens.length > 0 && (
                            <div className="flex flex-col gap-1.5 bg-blue-950/20 p-2 rounded-xl border border-blue-900/30">
                              <div
                                onClick={() => setCollapseCustomTokens(!collapseCustomTokens)}
                                className="flex items-center justify-between px-0.5 cursor-pointer select-none"
                              >
                                <span className="text-[10px] uppercase font-bold font-mono text-blue-400 flex items-center gap-1.5">
                                  <Cloud className="w-3 h-3 text-blue-400" />
                                  Saved Custom Tokens ({filteredCustomTokens.length})
                                </span>
                                {collapseCustomTokens ? <ChevronRight className="w-3.5 h-3.5 text-blue-400" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-400" />}
                              </div>
                              <div className={`grid grid-cols-4 gap-2 ${collapseCustomTokens ? 'hidden' : ''}`}>
                                 {filteredCustomTokens.map((tok, idx) => {
                                   const cleanName = tok.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, l => l.toUpperCase());
                                   const matchedMonster = filteredMonsters.find(m => m.name.toLowerCase() === cleanName.toLowerCase() || m.name.toLowerCase() === tok.name.replace(/\.[^/.]+$/, "").toLowerCase()) ||
                                                          DEFAULT_MONSTERS.find(m => m.name.toLowerCase() === cleanName.toLowerCase() || m.name.toLowerCase() === tok.name.replace(/\.[^/.]+$/, "").toLowerCase());

                                   const monsterName = matchedMonster ? matchedMonster.name : cleanName;
                                   const monsterSize = matchedMonster ? getSizeMultiplier(matchedMonster.size) : (tok.size || 1);
                                   const monsterHp = matchedMonster ? matchedMonster.hp : undefined;
                                   const monsterAc = matchedMonster ? matchedMonster.ac : undefined;
                                   const monsterId = matchedMonster ? matchedMonster.monsterId : undefined;
                                   const isMonsterToken = !!matchedMonster || tok.name.toLowerCase().includes("dragon") || tok.name.toLowerCase().includes("goblin") || tok.name.toLowerCase().includes("skeleton") || tok.name.toLowerCase().includes("zombie") || tok.name.toLowerCase().includes("beast") || tok.name.toLowerCase().includes("monster") || tok.name.toLowerCase().includes("orc") || tok.name.toLowerCase().includes("demon");

                                   return (
                                     <div
                                       key={tok.id || idx}
                                       draggable={true}
                                       onDragStart={(e) => {
                                         const tokenData = {
                                           name: monsterName,
                                           url: tok.url,
                                           size: monsterSize,
                                           hp: monsterHp,
                                           maxHp: monsterHp,
                                           currentHp: monsterHp,
                                           ac: monsterAc,
                                           isMonster: isMonsterToken,
                                           category: isMonsterToken ? "monster" : "custom",
                                           monsterId: monsterId
                                         };
                                         e.dataTransfer.setData("application/json", JSON.stringify(tokenData));
                                         e.dataTransfer.setData("text/plain", monsterName);
                                         e.dataTransfer.effectAllowed = "copy";
                                       }}
                                       className="group relative flex flex-col items-center gap-1 p-1 bg-zinc-850 hover:bg-blue-500/20 border border-zinc-750 hover:border-blue-500/40 rounded-xl transition-all cursor-grab active:cursor-grabbing select-none"
                                       title={`Drag onto map or click to spawn ${monsterName} (${monsterSize}x)`}
                                     >
                                       <button
                                         type="button"
                                         onClick={() => spawnToken(monsterName, tok.url, monsterSize, isMonsterToken ? "monster" : "custom", monsterHp, monsterAc, monsterId)}
                                         className="w-full flex flex-col items-center gap-1 cursor-pointer"
                                       >
                                         <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-blue-400/50 group-hover:border-blue-400 shadow-sm relative transition-all group-hover:scale-105 pointer-events-none">
                                           <img src={tok.url} alt={monsterName} className="w-full h-full object-cover" />
                                           {monsterSize > 1 && (
                                             <span className="absolute bottom-0 right-0 bg-blue-600 text-white text-[7px] font-bold px-1 rounded-tl">
                                               {monsterSize}x
                                             </span>
                                           )}
                                           <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-blue-400 ring-1 ring-zinc-900" />
                                         </div>
                                         <span className="text-[9px] font-mono text-zinc-300 truncate max-w-[50px] text-center">{monsterName}</span>
                                       </button>
                                       {tok.id && onDeleteCustomToken && (
                                         confirmDeleteTokenId === tok.id ? (
                                           <div
                                             className="absolute -top-2 -right-2 z-10 flex items-center gap-0.5 bg-red-950/95 border border-red-500/60 rounded px-1 py-0.5 shadow-lg animate-in fade-in"
                                             onClick={(e) => e.stopPropagation()}
                                           >
                                             <button
                                               type="button"
                                               onClick={(e) => {
                                                 e.stopPropagation();
                                                 setConfirmDeleteTokenId(null);
                                                 onDeleteCustomToken(tok.id!);
                                               }}
                                               className="text-[8px] bg-red-600 hover:bg-red-500 text-white font-bold px-1 rounded transition-colors cursor-pointer"
                                               title="Confirm Delete"
                                             >
                                               Del
                                             </button>
                                             <button
                                               type="button"
                                               onClick={(e) => {
                                                 e.stopPropagation();
                                                 setConfirmDeleteTokenId(null);
                                               }}
                                               className="text-zinc-400 hover:text-zinc-200 p-0.5 cursor-pointer"
                                               title="Cancel"
                                             >
                                               <X className="w-2.5 h-2.5" />
                                             </button>
                                           </div>
                                         ) : (
                                           <button
                                             type="button"
                                             onClick={(e) => {
                                               e.stopPropagation();
                                               setConfirmDeleteTokenId(tok.id!);
                                               setTimeout(() => {
                                                 setConfirmDeleteTokenId(curr => (curr === tok.id ? null : curr));
                                               }, 4000);
                                             }}
                                             className="absolute -top-1 -right-1 p-0.5 bg-zinc-900 text-zinc-400 hover:text-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity border border-zinc-750 shadow cursor-pointer"
                                             title="Delete from Firebase"
                                           >
                                             <Trash2 className="w-2.5 h-2.5" />
                                           </button>
                                         )
                                       )}
                                     </div>
                                   );
                                 })}
                              </div>
                            </div>
                          )}

                          {/* Section: Characters & Heroes (D&D Beyond Sync Only) */}
                          {(tokenCategoryFilter === 'all' || tokenCategoryFilter === 'characters') && (
                            <div className="flex flex-col gap-1.5 bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-900/40 shadow-sm">
                              <div
                                onClick={() => setCollapseCharacters(!collapseCharacters)}
                                className="flex items-center justify-between px-0.5 cursor-pointer select-none"
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                  </span>
                                  <span className="text-[10px] uppercase font-bold font-mono text-emerald-400 flex items-center gap-1">
                                    D&D Beyond Heroes ({heroTokens.length})
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {onOpenDdbSync && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenDdbSync();
                                      }}
                                      className="text-[9px] text-emerald-400 hover:text-emerald-200 font-mono font-semibold flex items-center gap-1 hover:underline cursor-pointer bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30"
                                      title="Open D&D Beyond Sync & Campaign Manager"
                                    >
                                      <Sparkles className="w-2.5 h-2.5" />
                                      DDB Sync
                                    </button>
                                  )}
                                  {collapseCharacters ? <ChevronRight className="w-3.5 h-3.5 text-emerald-400" /> : <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />}
                                </div>
                              </div>

                              {!collapseCharacters && (
                                <>
                                  {heroTokens.length === 0 ? (
                                    <div className="p-3 text-center flex flex-col items-center gap-2 bg-zinc-900/50 rounded-lg border border-emerald-900/20 my-1">
                                      <Users className="w-6 h-6 text-emerald-500/60" />
                                      <div className="flex flex-col">
                                        <span className="text-[11px] font-bold text-zinc-300">
                                          {tokenSearchQuery ? `No D&D Beyond heroes match "${tokenSearchQuery}"` : 'No D&D Beyond Heroes Linked'}
                                        </span>
                                        <span className="text-[9.5px] text-zinc-400 mt-0.5">
                                          Connect your D&D Beyond campaign to import your party with live HP & AC.
                                        </span>
                                      </div>
                                      {onOpenDdbSync && !tokenSearchQuery && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onOpenDdbSync();
                                            closeFlyout();
                                          }}
                                          className="mt-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                                        >
                                          <Sparkles className="w-3 h-3" />
                                          Connect D&D Beyond Party
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-2 gap-2 mt-1">
                                      {heroTokens.map((tok) => {
                                        const hpPercent = tok.maxHp > 0 ? Math.round((tok.hp / tok.maxHp) * 100) : 100;
                                        const hpColor = hpPercent > 50 ? 'text-emerald-400' : hpPercent > 25 ? 'text-amber-400' : 'text-rose-400';

                                        return (
                                          <div
                                            key={tok.id || tok.ddbCharacterId}
                                            draggable={true}
                                            onDragStart={(e) => {
                                              const tokenData = {
                                                name: tok.name,
                                                url: tok.url,
                                                size: tok.size || 1,
                                                hp: tok.hp,
                                                maxHp: tok.maxHp,
                                                currentHp: tok.hp,
                                                tempHp: tok.tempHp,
                                                ac: tok.ac,
                                                isPlayer: true,
                                                isMonster: false,
                                                category: 'character',
                                                ddbCharacterId: tok.ddbCharacterId,
                                                characterId: tok.id
                                              };
                                              e.dataTransfer.setData('application/json', JSON.stringify(tokenData));
                                              e.dataTransfer.setData('text/plain', tok.name);
                                              e.dataTransfer.effectAllowed = 'copy';
                                            }}
                                            onClick={() => spawnToken(tok.name, tok.url, tok.size || 1, 'character', tok.hp, tok.ac, tok.ddbCharacterId)}
                                            className="group relative flex items-center gap-2 p-1.5 bg-zinc-900/90 hover:bg-emerald-950/50 border border-emerald-900/30 hover:border-emerald-500/60 rounded-xl transition-all cursor-grab active:cursor-grabbing select-none"
                                            title={`Drag onto map or click to spawn ${tok.name} (${tok.classLevel || 'Hero'})`}
                                          >
                                            {/* Token Avatar with Live Dot */}
                                            <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-emerald-500/50 group-hover:border-emerald-400 shrink-0 shadow-sm pointer-events-none">
                                              <img src={tok.url} alt={tok.name} className="w-full h-full object-cover" />
                                              <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-zinc-900" />
                                            </div>

                                            {/* Character Meta */}
                                            <div className="flex flex-col min-w-0 flex-1 pointer-events-none">
                                              <span className="text-[11px] font-bold text-zinc-200 group-hover:text-emerald-300 truncate leading-tight">
                                                {tok.name}
                                              </span>
                                              <span className="text-[9px] text-zinc-400 truncate leading-tight mt-0.5">
                                                {tok.classLevel || tok.race}
                                              </span>
                                              
                                              {/* Live Stats Row */}
                                              <div className="flex items-center gap-2 mt-1 text-[9px] font-mono">
                                                <span className={`font-bold ${hpColor} flex items-center gap-0.5`}>
                                                  <Heart className="w-2.5 h-2.5 fill-current" />
                                                  {tok.hp}/{tok.maxHp}
                                                </span>
                                                <span className="text-zinc-400 flex items-center gap-0.5">
                                                  <Shield className="w-2.5 h-2.5 text-blue-400" />
                                                  {tok.ac}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}

                          {/* Section: Monsters & Foes (Connected Directly to Monster Compendium) */}
                          {(tokenCategoryFilter === 'all' || tokenCategoryFilter === 'monsters') && filteredMonsters.length > 0 && (
                            <div className="flex flex-col gap-1.5 bg-rose-950/15 p-2 rounded-xl border border-rose-900/30">
                              <div
                                onClick={() => setCollapseMonsters(!collapseMonsters)}
                                className="flex items-center justify-between px-0.5 cursor-pointer select-none"
                              >
                                <span className="text-[10px] uppercase font-bold font-mono text-rose-400 flex items-center gap-1.5">
                                  <Skull className="w-3 h-3 text-rose-400" />
                                  Monster Compendium ({filteredMonsters.length})
                                </span>
                                <div className="flex items-center gap-2">
                                  {onOpenMonsterCompendium && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenMonsterCompendium();
                                        closeFlyout();
                                      }}
                                      className="text-[9px] text-rose-400 hover:text-rose-200 font-mono font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                                      title="Open Monster Compendium"
                                    >
                                      <BookOpen className="w-2.5 h-2.5" />
                                      Compendium
                                    </button>
                                  )}
                                  {collapseMonsters ? <ChevronRight className="w-3.5 h-3.5 text-rose-400" /> : <ChevronDown className="w-3.5 h-3.5 text-rose-400" />}
                                </div>
                              </div>
                              <div className={`text-[8.5px] text-rose-300/70 font-mono px-0.5 pb-0.5 flex items-center gap-1 ${collapseMonsters ? 'hidden' : ''}`}>
                                <Move className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                                <span>Drag monster onto map or click to spawn</span>
                              </div>
                              <div className={`grid grid-cols-4 gap-2 ${collapseMonsters ? 'hidden' : ''}`}>
                                {filteredMonsters.map((monster) => {
                                  const monsterMultiplier = getSizeMultiplier(monster.size);
                                  const avatarUrl = monster.avatarUrl || 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=300&q=80';
                                  return (
                                    <div
                                      key={monster.monsterId}
                                      draggable={true}
                                      onDragStart={(e) => {
                                        const tokenData = {
                                          name: monster.name,
                                          url: avatarUrl,
                                          size: monsterMultiplier,
                                          hp: monster.hp,
                                          maxHp: monster.hp,
                                          currentHp: monster.hp,
                                          ac: monster.ac,
                                          isMonster: true,
                                          category: 'monster',
                                          monsterId: monster.monsterId
                                        };
                                        e.dataTransfer.setData('application/json', JSON.stringify(tokenData));
                                        e.dataTransfer.setData('text/plain', monster.name);
                                        e.dataTransfer.effectAllowed = 'copy';
                                      }}
                                      className="group relative flex flex-col items-center gap-1 p-1.5 bg-zinc-850/70 hover:bg-rose-500/15 border border-zinc-750 hover:border-rose-500/50 rounded-xl transition-all active:scale-95 cursor-grab active:cursor-grabbing select-none"
                                      title={`${monster.name} (${monster.size || 'Medium'} • ${monsterMultiplier}x${monsterMultiplier}) | HP: ${monster.hp} | AC: ${monster.ac} | CR: ${monster.challenge}\nDrag onto map or click to spawn`}
                                    >
                                      {/* Quick Open in Compendium Button */}
                                      {onOpenMonsterCompendium && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenMonsterCompendium(monster.name);
                                            closeFlyout();
                                          }}
                                          className="absolute top-0.5 left-0.5 p-0.5 bg-zinc-900/90 text-rose-400 hover:text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity border border-rose-900/50 z-10 cursor-pointer shadow"
                                          title={`View ${monster.name} in Compendium`}
                                        >
                                          <BookOpen className="w-2.5 h-2.5" />
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => spawnToken(monster.name, avatarUrl, monsterMultiplier, 'monster', monster.hp, monster.ac, monster.monsterId)}
                                        className="w-full flex flex-col items-center gap-1 cursor-pointer"
                                      >
                                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-rose-500/40 group-hover:border-rose-400 transition-all shadow-sm relative group-hover:scale-105 pointer-events-none">
                                          <img src={avatarUrl} alt={monster.name} className="w-full h-full object-cover" />
                                          {monsterMultiplier > 1 && (
                                            <span className="absolute bottom-0 right-0 bg-rose-700 text-white text-[7px] font-bold px-1 rounded-tl">
                                              {monsterMultiplier}x
                                            </span>
                                          )}
                                          <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-rose-400 ring-1 ring-zinc-900" />
                                        </div>
                                        <span className="text-[9px] font-mono text-zinc-300 group-hover:text-rose-200 truncate max-w-[50px] text-center font-medium leading-tight">
                                          {monster.name}
                                        </span>
                                        <span className="text-[7.5px] font-mono text-rose-400/80 -mt-0.5 truncate max-w-[52px]">
                                          {monster.size || 'Med'}
                                        </span>
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                              {tokenCategoryFilter === 'monsters' && onOpenMonsterCompendium && !collapseMonsters && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onOpenMonsterCompendium();
                                    closeFlyout();
                                  }}
                                  className="mt-1 py-1.5 px-2 bg-rose-900/30 hover:bg-rose-900/50 border border-rose-500/30 rounded-lg text-[10px] font-bold text-rose-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <BookOpen className="w-3 h-3 text-rose-400" />
                                  Browse More in Monster Compendium
                                </button>
                              )}
                            </div>
                          )}

                          {/* Section: Summons & Allies */}
                          {(tokenCategoryFilter === 'all' || tokenCategoryFilter === 'allies') && allyTokens.length > 0 && (
                            <div className="flex flex-col gap-1.5 bg-amber-950/15 p-2 rounded-xl border border-amber-900/30">
                              <div
                                onClick={() => setCollapseAllies(!collapseAllies)}
                                className="flex items-center justify-between px-0.5 cursor-pointer select-none"
                              >
                                <span className="text-[10px] uppercase font-bold font-mono text-amber-400 flex items-center gap-1.5">
                                  <Sparkles className="w-3 h-3 text-amber-400" />
                                  Summons & Allies ({allyTokens.length})
                                </span>
                                <div className="flex items-center gap-2">
                                  {onOpenAlliesCompendium && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenAlliesCompendium();
                                        closeFlyout();
                                      }}
                                      className="text-[9px] text-amber-400 hover:text-amber-200 font-mono font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                                      title="Open Allies Compendium"
                                    >
                                      <BookOpen className="w-2.5 h-2.5" />
                                      Compendium
                                    </button>
                                  )}
                                  {collapseAllies ? <ChevronRight className="w-3.5 h-3.5 text-amber-400" /> : <ChevronDown className="w-3.5 h-3.5 text-amber-400" />}
                                </div>
                              </div>
                              <div className={`text-[8.5px] text-amber-300/70 font-mono px-0.5 pb-0.5 flex items-center gap-1 ${collapseAllies ? 'hidden' : ''}`}>
                                <Move className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                                <span>Drag ally onto map or click to spawn</span>
                              </div>
                              <div className={`grid grid-cols-4 gap-2 ${collapseAllies ? 'hidden' : ''}`}>
                                {allyTokens.map((tok) => {
                                  const allyMultiplier = getSizeMultiplier(tok.size);
                                  const avatarUrl = tok.avatarUrl || 'https://www.dndbeyond.com/avatars/43939/948/638607435568755201.png';
                                  return (
                                    <div
                                      key={tok.allyId}
                                      draggable={true}
                                      onDragStart={(e) => {
                                        const tokenData = {
                                          name: tok.name,
                                          url: avatarUrl,
                                          size: allyMultiplier,
                                          hp: tok.hp,
                                          maxHp: tok.hp,
                                          currentHp: tok.hp,
                                          ac: tok.ac,
                                          isMonster: false,
                                          isPlayer: false,
                                          category: 'ally',
                                          allyId: tok.allyId
                                        };
                                        e.dataTransfer.setData('application/json', JSON.stringify(tokenData));
                                        e.dataTransfer.setData('text/plain', tok.name);
                                        e.dataTransfer.effectAllowed = 'copy';
                                      }}
                                      className="group relative flex flex-col items-center gap-1 p-1.5 bg-zinc-850/60 hover:bg-amber-500/15 border border-zinc-750 hover:border-amber-500/40 rounded-xl transition-all active:scale-95 cursor-grab active:cursor-grabbing select-none"
                                      title={`${tok.name} (${tok.size || 'Medium'} • ${allyMultiplier}x${allyMultiplier}) | HP: ${tok.hp} | AC: ${tok.ac}\n${tok.summonSource}\nDrag onto map or click to spawn`}
                                    >
                                      {/* Quick Open in Compendium Button */}
                                      {onOpenAlliesCompendium && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenAlliesCompendium(tok.name);
                                            closeFlyout();
                                          }}
                                          className="absolute top-0.5 left-0.5 p-0.5 bg-zinc-900/90 text-amber-400 hover:text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity border border-amber-900/50 z-10 cursor-pointer shadow"
                                          title={`View ${tok.name} in Compendium`}
                                        >
                                          <BookOpen className="w-2.5 h-2.5" />
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => spawnToken(tok.name, avatarUrl, allyMultiplier, 'ally', tok.hp, tok.ac, tok.allyId)}
                                        className="w-full flex flex-col items-center gap-1 cursor-pointer"
                                      >
                                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-amber-500/40 group-hover:border-amber-400 transition-all shadow-sm relative group-hover:scale-105 pointer-events-none">
                                          <img src={avatarUrl} alt={tok.name} className="w-full h-full object-cover" />
                                          {allyMultiplier > 1 && (
                                            <span className="absolute bottom-0 right-0 bg-amber-700 text-white text-[7px] font-bold px-1 rounded-tl">
                                              {allyMultiplier}x
                                            </span>
                                          )}
                                          <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-amber-400 ring-1 ring-zinc-900" />
                                        </div>
                                        <span className="text-[9px] font-mono text-zinc-300 group-hover:text-amber-200 truncate max-w-[50px] text-center font-medium leading-tight">{tok.name}</span>
                                        <span className="text-[7.5px] font-mono text-amber-400/80 -mt-0.5 truncate max-w-[52px]">
                                          {tok.size || 'Med'}
                                        </span>
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                              {tokenCategoryFilter === 'allies' && onOpenAlliesCompendium && !collapseAllies && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onOpenAlliesCompendium();
                                    closeFlyout();
                                  }}
                                  className="mt-1 py-1.5 px-2 bg-amber-900/30 hover:bg-amber-900/50 border border-amber-500/30 rounded-lg text-[10px] font-bold text-amber-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <BookOpen className="w-3 h-3 text-amber-400" />
                                  Browse More in Allies Compendium
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {activeGroup === 'dice' && (
            <div className="p-3.5 flex flex-col gap-3 min-w-[260px]">
              {/* Header */}
              <div
                onMouseDown={pinnedGroup ? handleDragStart : undefined}
                className={`flex items-center justify-between border-b border-zinc-800 pb-2.5 ${pinnedGroup ? 'cursor-grab active:cursor-grabbing select-none' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <Dices className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold font-mono text-zinc-200 uppercase tracking-wider">Dice Roller</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPinnedGroup(pinnedGroup === 'dice' ? null : 'dice')}
                    className={`p-1 rounded-md transition-colors ${pinnedGroup === 'dice' ? 'text-purple-400 bg-purple-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                    title={pinnedGroup === 'dice' ? 'Unpin Menu' : 'Pin Menu Open (Allows moving)'}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={closeFlyout}
                    className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Dice Buttons */}
              <div className="grid grid-cols-4 gap-1.5">
                {['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'].map((d) => (
                  <button
                    key={d}
                    onClick={() => addDiceToPool(d)}
                    className="py-1.5 bg-zinc-800 hover:bg-purple-600/30 hover:border-purple-500 border border-zinc-700/60 rounded-xl text-xs font-bold font-mono transition-all text-zinc-200 active:scale-95"
                  >
                    {d}
                  </button>
                ))}
              </div>

              {/* Current Pool & Roll Button */}
              <div className="flex flex-col gap-2 pt-1 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400 font-mono">DICE POOL:</span>
                  {dicePool.length > 0 && (
                    <button onClick={clearDicePool} className="text-[10px] text-zinc-500 hover:text-zinc-300 font-mono">
                      CLEAR
                    </button>
                  )}
                </div>
                <div className="p-2 bg-zinc-950/70 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-300 min-h-[36px] flex items-center">
                  {dicePool.length > 0 ? dicePool.join(' + ') : 'Tap dice to assemble pool'}
                </div>
                <button
                  id="btn-roll-dice-flyout"
                  onClick={rollDicePool}
                  disabled={dicePool.length === 0}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-purple-950/50 active:scale-95"
                >
                  ROLL NOW
                </button>
              </div>

              {/* Roll History */}
              {diceHistory.length > 0 && (
                <div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto pt-1 border-t border-zinc-800 text-xs font-mono sidebar-scrollbar">
                  <span className="text-[9px] uppercase font-bold text-zinc-500">Recent Rolls</span>
                  {diceHistory.slice(0, 4).map((hist) => (
                    <div key={hist.id} className="flex items-center justify-between text-zinc-400 bg-zinc-950/60 px-2.5 py-1 rounded-lg">
                      <span className="truncate max-w-[130px]">{hist.dice}</span>
                      <span className="font-bold text-emerald-400 font-mono">{hist.total}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeGroup === 'ai' && (
            <div className="p-3.5 flex flex-col gap-3 min-w-[280px]">
              {/* Header */}
              <div
                onMouseDown={pinnedGroup ? handleDragStart : undefined}
                className={`flex items-center justify-between border-b border-zinc-800 pb-2.5 ${pinnedGroup ? 'cursor-grab active:cursor-grabbing select-none' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-fuchsia-400" />
                  <span className="text-xs font-bold font-mono text-zinc-200 uppercase tracking-wider">AI Dungeon Master</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPinnedGroup(pinnedGroup === 'ai' ? null : 'ai')}
                    className={`p-1 rounded-md transition-colors ${pinnedGroup === 'ai' ? 'text-fuchsia-400 bg-fuchsia-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                    title={pinnedGroup === 'ai' ? 'Unpin Menu' : 'Pin Menu Open (Allows moving)'}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={closeFlyout}
                    className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Gemini API Key - Load / Configure for Cinematic Map Generator */}
              <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-bold text-zinc-200">
                    <Key className={`w-3.5 h-3.5 ${hasApiKey ? 'text-emerald-400' : 'text-amber-400'}`} />
                    <span>Gemini API Key</span>
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                    hasApiKey 
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' 
                      : 'bg-amber-500/15 border border-amber-500/30 text-amber-300 animate-pulse'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${hasApiKey ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    {hasApiKey ? 'Active' : 'Key Needed'}
                  </span>
                </div>
                
                <p className="text-[10px] text-zinc-400 leading-tight">
                  Powers the Cinematic Map Generator & D&D AI tools.
                </p>

                <button
                  id="btn-ai-api-flyout"
                  onClick={async () => {
                    if ((window as any).aistudio?.openSelectKey) {
                      await (window as any).aistudio.openSelectKey();
                    }
                    if (onOpenApiKeyModal) {
                      onOpenApiKeyModal();
                    }
                  }}
                  className={`w-full py-2 px-3 mt-0.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${
                    hasApiKey
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                      : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-amber-950/50'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{hasApiKey ? 'Manage / Change Gemini Key' : 'Load Gemini API Key'}</span>
                </button>
              </div>

              {/* AI DM Tools */}
              <div className="flex flex-col gap-2 pt-1 border-t border-zinc-800">
                {/* Premier D&D AI Chatbot Button */}
                <button
                  id="btn-dnd-chatbot-flyout"
                  onClick={() => {
                    if (setShowDndChatbot) setShowDndChatbot(true);
                    setPinnedGroup(null);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-600/30 via-orange-600/20 to-red-600/30 hover:from-amber-600/40 hover:to-red-600/40 border border-amber-500/50 text-white text-xs font-bold flex items-center justify-between shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
                      <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="leading-tight text-white font-bold">D&D AI Chatbot</span>
                      <span className="text-[10px] text-amber-300/80 font-normal">Golden Vault & Vecna Expert</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[10px] text-amber-300 font-mono uppercase tracking-wider font-semibold">
                    Open
                  </span>
                </button>

                <button
                  id="btn-cinematic-map-flyout"
                  onClick={() => setShowCinematicMapGenerator(true)}
                  className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-2.5 transition-all"
                >
                  <Wand2 className="w-4 h-4 text-amber-400" />
                  AI Battlemap & Auto-Wall Generator
                </button>

                <button
                  id="btn-ai-describe-flyout"
                  onClick={() => setTool('ai-describe')}
                  className={`w-full py-2 px-3 rounded-xl border text-xs font-medium flex items-center gap-2.5 transition-all ${
                    tool === 'ai-describe'
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 font-bold'
                      : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                  }`}
                >
                  <Scan className="w-4 h-4 text-indigo-400" />
                  DM Vision (Drag Area on Map)
                </button>
              </div>

              {/* AI Voice & Narrator */}
              <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold font-mono text-zinc-400">AI Voice & Script Narrator</span>
                  {onOpenApiKeyModal && (
                    <button
                      onClick={onOpenApiKeyModal}
                      className="text-[9px] font-mono text-fuchsia-400 hover:text-fuchsia-300 flex items-center gap-1 hover:underline cursor-pointer"
                      title="Configure ElevenLabs & Gemini API Keys"
                    >
                      <span>Voice Engine Setup</span>
                      <Key className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-[190px] overflow-y-auto pr-0.5 custom-scrollbar">
                  {((voices && voices.length > 0) ? voices : NARRATION_VOICES).map((voice: any) => {
                    const voiceId = voice.id || voice.name;
                    const isSelected = selectedAIVoice === voiceId || selectedAIVoice === voice.name || selectedAIVoice === voice.geminiVoice;
                    return (
                      <button
                        key={voiceId}
                        onClick={() => setSelectedAIVoice(voice.id || voice.name)}
                        className={`p-2 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-300 ring-1 ring-fuchsia-500/40'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                        }`}
                        title={voice.description || voice.label}
                      >
                        <div className="text-[11px] font-bold leading-tight truncate">{voice.name}</div>
                        <div className="text-[9px] opacity-70 leading-tight truncate mt-0.5">
                          {voice.description || voice.label || voice.geminiVoice}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <textarea
                  value={aiVoicePrompt}
                  onChange={(e) => setAIVoicePrompt(e.target.value)}
                  placeholder="Enter narration prompt or type dialogue..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-fuchsia-500/50 min-h-[60px]"
                />

                <div className="flex gap-2">
                  <button
                    id="btn-gen-script-flyout"
                    onClick={handleGenerateAIScript}
                    disabled={isGeneratingScript || !aiVoicePrompt.trim()}
                    className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    {isGeneratingScript ? (
                      <div className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Wand2 className="w-3 h-3 text-fuchsia-400" />
                    )}
                    Generate Script
                  </button>

                  <button
                    id="btn-speak-voice-flyout"
                    onClick={handleSpeakAIVoice}
                    disabled={!isPlayingAudio && (!aiVoicePrompt.trim() && !aiVoiceScript.trim())}
                    className={`flex-1 py-1.5 text-white rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-md ${
                      isPlayingAudio
                        ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950 animate-pulse'
                        : 'bg-fuchsia-600 hover:bg-fuchsia-500 shadow-fuchsia-950 disabled:opacity-40'
                    }`}
                  >
                    {isPlayingAudio ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5" />
                        Stop Narration
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        Speak Now
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Help & Support Flyout */}
          {activeGroup === 'help' && (
            <HelpDrawer
              pinnedGroup={pinnedGroup}
              handleDragStart={handleDragStart}
              onClose={closeFlyout}
              onOpenBugReport={onOpenBugReport}
            />
          )}
        </div>
      )}

      {/* Preset Battlemaps Gallery Modal */}
      {showPresetMapsGallery && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-4xl max-h-[85vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white font-mono tracking-wide">
                  Preset Battlemap Gallery
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-mono font-bold border border-amber-500/30">
                  {PRESET_BATTLEMAPS.length} Maps
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPresetMapsGallery(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 sidebar-scrollbar">
              {PRESET_BATTLEMAPS.map((preset) => (
                <div
                  key={preset.id}
                  className="group relative bg-zinc-900 border border-zinc-800 hover:border-amber-400/80 rounded-xl overflow-hidden flex flex-col transition-all hover:scale-[1.02] shadow-lg"
                >
                  <div className="aspect-video w-full overflow-hidden bg-zinc-950 relative">
                    <img
                      src={preset.thumbnailUrl || preset.url}
                      alt={preset.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 left-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/70 text-zinc-200 border border-zinc-700/60">
                        {preset.type}
                      </span>
                    </div>
                  </div>
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-100 group-hover:text-amber-300 transition-colors line-clamp-1">
                        {preset.name}
                      </h4>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                        {preset.desc}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectPresetMap?.(preset);
                        setShowPresetMapsGallery(false);
                      }}
                      className="mt-3 w-full py-2 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-zinc-950 border border-amber-500/40 rounded-xl text-xs font-bold font-mono transition-all text-center flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Load Onto Board
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
