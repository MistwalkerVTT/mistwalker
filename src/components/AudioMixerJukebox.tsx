import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Group, Circle, Text, Rect } from 'react-konva';
import {
  Volume2,
  VolumeX,
  Music,
  Flame,
  Droplets,
  Wind,
  CloudRain,
  Zap,
  Sparkles,
  Skull,
  Swords,
  Compass,
  Users,
  Eye,
  EyeOff,
  Radio,
  Plus,
  Trash2,
  Sliders,
  X,
  MapPin,
  Upload,
  Play,
  Square,
  Headphones,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AmbienceTrackDefinition,
  BUILTIN_AMBIENCE_TRACKS,
  SCENE_MOOD_PRESETS,
  BUILTIN_SOUNDBOARD_PADS,
  SoundboardPadDefinition,
  MapAudioSource,
  JukeboxSyncState,
  DEFAULT_JUKEBOX_STATE,
  SoundboardTriggerPayload,
  SoundboardCategory
} from '../types/audioJukebox';
import { jukeboxAudioEngine } from '../services/jukeboxAudioEngine';
import { isLineOfSightBlocked } from '../lib/visionEngine';
import { WallSegment } from '../types';
import { uploadAndRegisterAsset } from '../lib/firebase';

const STORAGE_KEY = 'mistwalker_jukebox_state_v1';

function loadSavedJukeboxState(): JukeboxSyncState {
  if (typeof window === 'undefined') return DEFAULT_JUKEBOX_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_JUKEBOX_STATE;
    const parsed = JSON.parse(raw);
    return {
      masterVolume: typeof parsed.masterVolume === 'number' ? parsed.masterVolume : 0.75,
      isMasterMuted: Boolean(parsed.isMasterMuted),
      activeTrackVolumes: parsed.activeTrackVolumes || {},
      customTracks: Array.isArray(parsed.customTracks) ? parsed.customTracks : [],
      customPads: Array.isArray(parsed.customPads) ? parsed.customPads : [],
      mapAudioSources: Array.isArray(parsed.mapAudioSources) ? parsed.mapAudioSources : [],
      activeMoodId: parsed.activeMoodId || null,
      updatedAt: parsed.updatedAt || Date.now()
    };
  } catch {
    return DEFAULT_JUKEBOX_STATE;
  }
}

export function useAudioMixerJukebox(options: {
  role: 'dm' | 'player';
  socketRef: React.MutableRefObject<any>;
  listenerPointsWorldPx: Array<{ x: number; y: number }>;
  gridSize: number;
  walls?: WallSegment[];
  localMuted?: boolean;
  localVolume?: number;
}) {
  const {
    role,
    socketRef,
    listenerPointsWorldPx,
    gridSize,
    walls = [],
    localMuted = false,
    localVolume = 0.85
  } = options;

  const [jukeboxState, setJukeboxState] = useState<JukeboxSyncState>(() => loadSavedJukeboxState());
  const [broadcastPadsToTable, setBroadcastPadsToTable] = useState<boolean>(true);
  const [recentPadId, setRecentPadId] = useState<string | null>(null);

  // Persist locally
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(jukeboxState));
    } catch {}
  }, [jukeboxState]);

  // Keep engine master & local volumes synced
  useEffect(() => {
    jukeboxAudioEngine.setDmMasterState(jukeboxState.masterVolume, jukeboxState.isMasterMuted);
  }, [jukeboxState.masterVolume, jukeboxState.isMasterMuted]);

  useEffect(() => {
    jukeboxAudioEngine.setLocalClientState(localVolume, localMuted);
  }, [localVolume, localMuted]);

  // Sync global ambient loops whenever activeTrackVolumes changes
  useEffect(() => {
    jukeboxAudioEngine.syncGlobalTracks(
      jukeboxState.activeTrackVolumes,
      jukeboxState.customTracks
    );
  }, [jukeboxState.activeTrackVolumes, jukeboxState.customTracks]);

  // Sync spatial / positional map audio emitters whenever tokens move or sources change
  useEffect(() => {
    const checkOccluded = (sx: number, sy: number, lx: number, ly: number) => {
      if (!walls || walls.length === 0) return false;
      return isLineOfSightBlocked({ x: sx, y: sy }, { x: lx, y: ly }, walls);
    };

    jukeboxAudioEngine.syncSpatialSources(
      jukeboxState.mapAudioSources,
      listenerPointsWorldPx,
      gridSize,
      checkOccluded
    );
  }, [jukeboxState.mapAudioSources, listenerPointsWorldPx, gridSize, walls]);

  const broadcastState = useCallback(
    (nextState: JukeboxSyncState) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('AUDIO_MIXER_SYNC', nextState);
      }
    },
    [socketRef]
  );

  const updateJukeboxState = useCallback(
    (updater: (prev: JukeboxSyncState) => JukeboxSyncState) => {
      setJukeboxState((prev) => {
        const next = {
          ...updater(prev),
          updatedAt: Date.now()
        };
        if (role === 'dm') {
          broadcastState(next);
        }
        return next;
      });
    },
    [role, broadcastState]
  );

  const setTrackVolume = useCallback(
    (trackId: string, volume: number) => {
      updateJukeboxState((prev) => {
        const nextVolumes = { ...prev.activeTrackVolumes };
        if (volume <= 0.01) {
          delete nextVolumes[trackId];
        } else {
          nextVolumes[trackId] = Math.max(0, Math.min(1, volume));
        }
        return {
          ...prev,
          activeTrackVolumes: nextVolumes,
          activeMoodId: null
        };
      });
    },
    [updateJukeboxState]
  );

  const applyMoodPreset = useCallback(
    (moodId: string | null) => {
      if (!moodId) {
        updateJukeboxState((prev) => ({
          ...prev,
          activeTrackVolumes: {},
          activeMoodId: null
        }));
        toast.info('Fading out all ambient loops...');
        return;
      }
      const preset = SCENE_MOOD_PRESETS.find((m) => m.id === moodId);
      if (!preset) return;
      updateJukeboxState((prev) => ({
        ...prev,
        activeTrackVolumes: { ...preset.levels },
        activeMoodId: preset.id
      }));
      toast.success(`🎵 Scene Mood: ${preset.name}`);
    },
    [updateJukeboxState]
  );

  const setMasterVolume = useCallback(
    (vol: number) => {
      updateJukeboxState((prev) => ({
        ...prev,
        masterVolume: Math.max(0, Math.min(1, vol))
      }));
    },
    [updateJukeboxState]
  );

  const toggleMasterMute = useCallback(() => {
    updateJukeboxState((prev) => ({
      ...prev,
      isMasterMuted: !prev.isMasterMuted
    }));
  }, [updateJukeboxState]);

  const triggerSoundboardPad = useCallback(
    (pad: SoundboardPadDefinition, volume = 0.9) => {
      setRecentPadId(pad.id);
      setTimeout(() => setRecentPadId((curr) => (curr === pad.id ? null : curr)), 650);

      jukeboxAudioEngine.playSoundboardPad(pad.id, volume, pad.customUrl);

      if (role === 'dm' && broadcastPadsToTable && socketRef.current?.connected) {
        const payload: SoundboardTriggerPayload = {
          padId: pad.id,
          padName: pad.name,
          volume,
          customUrl: pad.customUrl,
          triggeredBy: 'Dungeon Master',
          timestamp: Date.now()
        };
        socketRef.current.emit('SOUNDBOARD_TRIGGER', payload);
      }
    },
    [role, broadcastPadsToTable, socketRef]
  );

  const addOrUpdateMapAudioSource = useCallback(
    (source: MapAudioSource) => {
      updateJukeboxState((prev) => {
        const exists = prev.mapAudioSources.some((s) => s.id === source.id);
        const nextList = exists
          ? prev.mapAudioSources.map((s) => (s.id === source.id ? source : s))
          : [...prev.mapAudioSources, source];
        return {
          ...prev,
          mapAudioSources: nextList
        };
      });
    },
    [updateJukeboxState]
  );

  const deleteMapAudioSource = useCallback(
    (sourceId: string) => {
      updateJukeboxState((prev) => ({
        ...prev,
        mapAudioSources: prev.mapAudioSources.filter((s) => s.id !== sourceId)
      }));
    },
    [updateJukeboxState]
  );

  const addCustomTrack = useCallback(
    (track: AmbienceTrackDefinition) => {
      updateJukeboxState((prev) => ({
        ...prev,
        customTracks: [...prev.customTracks, track],
        activeTrackVolumes: {
          ...prev.activeTrackVolumes,
          [track.id]: 0.65
        }
      }));
    },
    [updateJukeboxState]
  );

  const addCustomPad = useCallback(
    (pad: SoundboardPadDefinition) => {
      updateJukeboxState((prev) => ({
        ...prev,
        customPads: [...prev.customPads, pad]
      }));
    },
    [updateJukeboxState]
  );

  const handleRemoteJukeboxSync = useCallback((incoming: JukeboxSyncState) => {
    if (!incoming) return;
    setJukeboxState({
      masterVolume: typeof incoming.masterVolume === 'number' ? incoming.masterVolume : 0.75,
      isMasterMuted: Boolean(incoming.isMasterMuted),
      activeTrackVolumes: incoming.activeTrackVolumes || {},
      customTracks: Array.isArray(incoming.customTracks) ? incoming.customTracks : [],
      customPads: Array.isArray(incoming.customPads) ? incoming.customPads : [],
      mapAudioSources: Array.isArray(incoming.mapAudioSources) ? incoming.mapAudioSources : [],
      activeMoodId: incoming.activeMoodId || null,
      updatedAt: incoming.updatedAt || Date.now()
    });
  }, []);

  const handleRemoteSoundboardTrigger = useCallback((payload: SoundboardTriggerPayload) => {
    if (!payload?.padId) return;
    jukeboxAudioEngine.playSoundboardPad(payload.padId, payload.volume ?? 0.85, payload.customUrl);
  }, []);

  const activeLoopCount = useMemo(() => {
    const globalCount = Object.values(jukeboxState.activeTrackVolumes).filter((v) => v > 0.01).length;
    const spatialCount = jukeboxState.mapAudioSources.filter((s) => !s.muted && s.maxVolume > 0.01).length;
    return globalCount + spatialCount;
  }, [jukeboxState.activeTrackVolumes, jukeboxState.mapAudioSources]);

  return {
    jukeboxState,
    activeLoopCount,
    broadcastPadsToTable,
    setBroadcastPadsToTable,
    recentPadId,
    setTrackVolume,
    applyMoodPreset,
    setMasterVolume,
    toggleMasterMute,
    triggerSoundboardPad,
    addOrUpdateMapAudioSource,
    deleteMapAudioSource,
    addCustomTrack,
    addCustomPad,
    handleRemoteJukeboxSync,
    handleRemoteSoundboardTrigger
  };
}

// ============================================================================
// KONVA LAYER: POSITIONAL / MAP AUDIO SOURCES
// ============================================================================
export const MapAudioSourcesLayer: React.FC<{
  sources: MapAudioSource[];
  gridSize: number;
  isDM: boolean;
  onUpdateSource?: (updated: MapAudioSource) => void;
  onSelectSource?: (source: MapAudioSource) => void;
}> = React.memo(({ sources, gridSize, isDM, onUpdateSource, onSelectSource }) => {
  const safeGrid = Math.max(10, gridSize || 50);

  return (
    <Group>
      {sources.map((src) => {
        if (!isDM && !src.visibleToPlayers) return null;
        const radiusPx = (src.radiusFt / 5) * safeGrid;
        const isMuted = Boolean(src.muted);

        return (
          <Group
            key={src.id}
            x={src.x}
            y={src.y}
            draggable={isDM}
            onDragEnd={(e) => {
              if (!isDM || !onUpdateSource) return;
              onUpdateSource({
                ...src,
                x: Math.round(e.target.x()),
                y: Math.round(e.target.y())
              });
            }}
            onClick={(e) => {
              if (!isDM || !onSelectSource) return;
              e.cancelBubble = true;
              onSelectSource(src);
            }}
          >
            {/* Outer Audible Radius Ring */}
            <Circle
              radius={radiusPx}
              stroke={isMuted ? '#71717a' : '#f59e0b'}
              strokeWidth={isDM ? 1.5 : 1}
              dash={[8, 6]}
              fill={isMuted ? 'rgba(113, 113, 122, 0.03)' : 'rgba(245, 158, 11, 0.06)'}
              listening={false}
            />

            {/* Inner Acoustic Ripple Ring */}
            {!isMuted && (
              <Circle
                radius={Math.min(radiusPx * 0.45, safeGrid * 1.4)}
                stroke="rgba(251, 191, 36, 0.35)"
                strokeWidth={1}
                listening={false}
              />
            )}

            {/* Center Emitter Pin */}
            <Circle
              radius={16}
              fill={isMuted ? '#27272a' : '#78350f'}
              stroke={isMuted ? '#71717a' : '#fbbf24'}
              strokeWidth={2}
              shadowColor="#000000"
              shadowBlur={8}
              shadowOpacity={0.65}
            />

            <Text
              text={isMuted ? '🔇' : '🔊'}
              fontSize={14}
              x={-8}
              y={-7}
              listening={false}
            />

            {/* Label Pill (DM Only) */}
            {isDM && (
              <Group y={20} listening={false}>
                <Rect
                  x={-68}
                  y={0}
                  width={136}
                  height={20}
                  cornerRadius={6}
                  fill="rgba(9, 9, 11, 0.88)"
                  stroke="rgba(245, 158, 11, 0.45)"
                  strokeWidth={1}
                />
                <Text
                  x={-64}
                  y={4}
                  width={128}
                  align="center"
                  text={`${src.label} (${src.radiusFt}ft)`}
                  fontSize={10}
                  fontStyle="bold"
                  fontFamily="monospace"
                  fill="#fde68a"
                />
              </Group>
            )}
          </Group>
        );
      })}
    </Group>
  );
});

// ============================================================================
// JUKEBOX & SOUNDBOARD STUDIO MODAL (DM CONTROLLER)
// ============================================================================
export const AudioMixerJukeboxModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  jukeboxState: JukeboxSyncState;
  broadcastPadsToTable: boolean;
  setBroadcastPadsToTable: (val: boolean) => void;
  recentPadId: string | null;
  onSetTrackVolume: (trackId: string, volume: number) => void;
  onApplyMoodPreset: (moodId: string | null) => void;
  onSetMasterVolume: (vol: number) => void;
  onToggleMasterMute: () => void;
  onTriggerPad: (pad: SoundboardPadDefinition, volume?: number) => void;
  onSaveMapAudioSource: (source: MapAudioSource) => void;
  onDeleteMapAudioSource: (sourceId: string) => void;
  onAddCustomTrack: (track: AmbienceTrackDefinition) => void;
  onAddCustomPad: (pad: SoundboardPadDefinition) => void;
  getViewportCenterWorldPx: () => { x: number; y: number };
}> = ({
  isOpen,
  onClose,
  jukeboxState,
  broadcastPadsToTable,
  setBroadcastPadsToTable,
  recentPadId,
  onSetTrackVolume,
  onApplyMoodPreset,
  onSetMasterVolume,
  onToggleMasterMute,
  onTriggerPad,
  onSaveMapAudioSource,
  onDeleteMapAudioSource,
  onAddCustomTrack,
  onAddCustomPad,
  getViewportCenterWorldPx
}) => {
  const [activeTab, setActiveTab] = useState<'ambience' | 'soundboard' | 'spatial'>('ambience');
  const [padCategoryFilter, setPadCategoryFilter] = useState<'all' | SoundboardCategory>('all');
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);

  // Spatial Audio Form State
  const [newPinLabel, setNewPinLabel] = useState('Roaring Hearth');
  const [newPinTrackId, setNewPinTrackId] = useState('crackling_campfire');
  const [newPinRadiusFt, setNewPinRadiusFt] = useState(30);
  const [newPinMaxVol, setNewPinMaxVol] = useState(0.85);
  const [newPinMuffled, setNewPinMuffled] = useState(true);
  const [newPinVisibleToPlayers, setNewPinVisibleToPlayers] = useState(false);

  const allTracks = useMemo(
    () => [...BUILTIN_AMBIENCE_TRACKS, ...(jukeboxState.customTracks || [])],
    [jukeboxState.customTracks]
  );

  const allPads = useMemo(
    () => [...BUILTIN_SOUNDBOARD_PADS, ...(jukeboxState.customPads || [])],
    [jukeboxState.customPads]
  );

  const filteredPads = useMemo(() => {
    if (padCategoryFilter === 'all') return allPads;
    return allPads.filter((p) => p.category === padCategoryFilter);
  }, [allPads, padCategoryFilter]);

  if (!isOpen) return null;

  const handleUploadCustomAudio = async (
    e: React.ChangeEvent<HTMLInputElement>,
    mode: 'track' | 'pad'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAudio(true);
    try {
      const uploaded = await uploadAndRegisterAsset(file, 'map');
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      if (mode === 'track') {
        onAddCustomTrack({
          id: `custom_track_${Date.now()}`,
          name: cleanName,
          category: 'music',
          description: 'Custom uploaded ambient loop',
          color: '#f59e0b',
          iconName: 'Music',
          customUrl: uploaded.url
        });
        toast.success(`Uploaded custom loop "${cleanName}"!`);
      } else {
        onAddCustomPad({
          id: `custom_pad_${Date.now()}`,
          name: cleanName,
          category: 'world',
          subtitle: 'Custom uploaded SFX pad',
          color: '#10b981',
          customUrl: uploaded.url
        });
        toast.success(`Uploaded custom sound pad "${cleanName}"!`);
      }
    } catch (err) {
      console.error('[Jukebox] Custom audio upload error:', err);
      toast.error('Could not upload audio file.');
    } finally {
      setIsUploadingAudio(false);
      e.target.value = '';
    }
  };

  const handleDropNewSpatialPin = () => {
    const center = getViewportCenterWorldPx();
    const newSource: MapAudioSource = {
      id: `spatial_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label: newPinLabel.trim() || 'Room Sound Emitter',
      trackId: newPinTrackId,
      x: Math.round(center.x),
      y: Math.round(center.y),
      radiusFt: Math.max(10, Math.min(150, newPinRadiusFt)),
      maxVolume: newPinMaxVol,
      muffledByWalls: newPinMuffled,
      visibleToPlayers: newPinVisibleToPlayers,
      muted: false
    };
    onSaveMapAudioSource(newSource);
    toast.success(`🔊 Placed "${newSource.label}" on map (${newSource.radiusFt}ft radius)! Drag the 🔊 pin to position it.`);
  };

  const renderTrackIcon = (iconName: string, color: string) => {
    const style = { color };
    switch (iconName) {
      case 'Flame':
        return <Flame className="w-4 h-4" style={style} />;
      case 'Droplets':
        return <Droplets className="w-4 h-4" style={style} />;
      case 'Wind':
        return <Wind className="w-4 h-4" style={style} />;
      case 'CloudRain':
        return <CloudRain className="w-4 h-4" style={style} />;
      case 'Zap':
        return <Zap className="w-4 h-4" style={style} />;
      case 'Sparkles':
        return <Sparkles className="w-4 h-4" style={style} />;
      case 'Skull':
        return <Skull className="w-4 h-4" style={style} />;
      case 'Swords':
        return <Swords className="w-4 h-4" style={style} />;
      case 'Compass':
        return <Compass className="w-4 h-4" style={style} />;
      case 'Users':
        return <Users className="w-4 h-4" style={style} />;
      case 'Eye':
        return <Eye className="w-4 h-4" style={style} />;
      default:
        return <Music className="w-4 h-4" style={style} />;
    }
  };

  const activeLoopsCount = Object.values(jukeboxState.activeTrackVolumes).filter((v) => v > 0.01).length;

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 pointer-events-auto">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-5xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-amber-500/20">
        {/* Top Studio Header & Master Bus Controls */}
        <div className="px-6 py-4 bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight font-mono">
                  DM Soundboard & Ambient Audio Mixer
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse" />
                  Live Table Sync
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Layer multi-track ambience, trigger instant soundboard pads, or drop spatial 2D audio emitters on the map
              </p>
            </div>
          </div>

          {/* Master Bus Fader & Mute */}
          <div className="flex items-center gap-3 bg-zinc-900/90 border border-zinc-800 px-3.5 py-2 rounded-2xl">
            <button
              type="button"
              onClick={onToggleMasterMute}
              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                jukeboxState.isMasterMuted
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                  : 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
              }`}
              title={jukeboxState.isMasterMuted ? 'Unmute Master Bus' : 'Mute Master Bus'}
            >
              {jukeboxState.isMasterMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <div className="flex flex-col w-28">
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                <span>MASTER</span>
                <span className="text-amber-300 font-bold">
                  {jukeboxState.isMasterMuted ? 'MUTED' : `${Math.round(jukeboxState.masterVolume * 100)}%`}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={jukeboxState.masterVolume}
                onChange={(e) => onSetMasterVolume(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer h-1.5 mt-1"
              />
            </div>

            {activeLoopsCount > 0 && (
              <button
                type="button"
                onClick={() => onApplyMoodPreset(null)}
                className="px-2.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 border border-rose-500/40 text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Smoothly fade out all active ambient loops"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Fade Out ({activeLoopsCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Close Jukebox (Audio continues playing)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('ambience')}
              className={`px-4 py-2.5 rounded-t-2xl text-xs font-mono font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'ambience'
                  ? 'border-amber-400 text-amber-300 bg-zinc-900'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>1. Layered Ambience Loops</span>
              {activeLoopsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-black">
                  {activeLoopsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('soundboard')}
              className={`px-4 py-2.5 rounded-t-2xl text-xs font-mono font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'soundboard'
                  ? 'border-amber-400 text-amber-300 bg-zinc-900'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>2. One-Click Soundboard Pads</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('spatial')}
              className={`px-4 py-2.5 rounded-t-2xl text-xs font-mono font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'spatial'
                  ? 'border-amber-400 text-amber-300 bg-zinc-900'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>3. Positional Map Audio</span>
              {jukeboxState.mapAudioSources.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-zinc-950 text-[10px] font-black">
                  {jukeboxState.mapAudioSources.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Main Studio Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ========================================================= */}
          {/* TAB 1: LAYERED AMBIENCE LOOPS & SCENE MOODS               */}
          {/* ========================================================= */}
          {activeTab === 'ambience' && (
            <div className="space-y-6">
              {/* 1-Click Scene Mood Snapshots */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-mono uppercase tracking-wider font-bold text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    1-Click Scene Mood Mixes (Auto-Crossfades Multiple Layers)
                  </span>
                  <label className="px-3 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-[11px] font-mono flex items-center gap-1.5 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isUploadingAudio ? 'Uploading...' : 'Upload Custom Loop (MP3/OGG)'}</span>
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      disabled={isUploadingAudio}
                      onChange={(e) => handleUploadCustomAudio(e, 'track')}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {SCENE_MOOD_PRESETS.map((mood) => {
                    const isActive = jukeboxState.activeMoodId === mood.id;
                    return (
                      <button
                        key={mood.id}
                        type="button"
                        onClick={() => onApplyMoodPreset(isActive ? null : mood.id)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isActive
                            ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg shadow-amber-500/15'
                            : 'bg-zinc-900/80 hover:bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono font-bold truncate" style={{ color: mood.color }}>
                            {mood.name}
                          </span>
                          {isActive && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />}
                        </div>
                        <span className="text-[10px] text-zinc-400 leading-tight line-clamp-2">
                          {mood.subtitle}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Multi-Track Fader Strips by Category */}
              {(['music', 'environment', 'weather'] as const).map((cat) => {
                const tracksInCat = allTracks.filter((t) => t.category === cat);
                const catTitle =
                  cat === 'music'
                    ? 'Background Music & Harmonic Drones'
                    : cat === 'environment'
                    ? 'Environmental & Room Loops'
                    : 'Weather & Atmospheric Loops';

                return (
                  <div key={cat} className="space-y-2.5">
                    <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-zinc-400 border-b border-zinc-800/80 pb-1.5">
                      {catTitle}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {tracksInCat.map((track) => {
                        const vol = jukeboxState.activeTrackVolumes[track.id] || 0;
                        const isPlaying = vol > 0.01;
                        return (
                          <div
                            key={track.id}
                            className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3.5 ${
                              isPlaying
                                ? 'bg-zinc-900/95 border-amber-500/50 shadow-md shadow-amber-950/20'
                                : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => onSetTrackVolume(track.id, isPlaying ? 0 : 0.6)}
                              className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 transition-all cursor-pointer ${
                                isPlaying
                                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                              }`}
                              title={isPlaying ? 'Stop Loop' : 'Start Loop at 60%'}
                            >
                              {renderTrackIcon(track.iconName, isPlaying ? '#fbbf24' : track.color)}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-mono font-bold text-zinc-100 truncate">
                                  {track.name}
                                </span>
                                <span
                                  className={`text-[11px] font-mono font-bold ${
                                    isPlaying ? 'text-amber-300' : 'text-zinc-500'
                                  }`}
                                >
                                  {isPlaying ? `${Math.round(vol * 100)}%` : 'OFF'}
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-400 truncate mb-1.5">{track.description}</p>
                              <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.01}
                                value={vol}
                                onChange={(e) => onSetTrackVolume(track.id, parseFloat(e.target.value))}
                                className="w-full accent-amber-400 cursor-pointer h-1.5"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: ONE-CLICK SOUNDBOARD PADS                          */}
          {/* ========================================================= */}
          {activeTab === 'soundboard' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/70 border border-zinc-800 p-3.5 rounded-2xl">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['all', 'dungeon', 'traps', 'combat', 'world'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setPadCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                        padCategoryFilter === cat
                          ? 'bg-amber-500 text-zinc-950'
                          : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                      }`}
                    >
                      {cat === 'all' ? 'All Pads' : cat}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {/* Broadcast vs Local Preview Toggle */}
                  <button
                    type="button"
                    onClick={() => setBroadcastPadsToTable(!broadcastPadsToTable)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      broadcastPadsToTable
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                    }`}
                    title="Toggle whether clicking a Soundboard Pad plays for all players or only in your DM headphones"
                  >
                    {broadcastPadsToTable ? (
                      <>
                        <Radio className="w-3.5 h-3.5 animate-pulse" />
                        <span>Broadcast to All Players</span>
                      </>
                    ) : (
                      <>
                        <Headphones className="w-3.5 h-3.5" />
                        <span>DM Preview Only</span>
                      </>
                    )}
                  </button>

                  <label className="px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-mono flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>Add Custom SFX</span>
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      disabled={isUploadingAudio}
                      onChange={(e) => handleUploadCustomAudio(e, 'pad')}
                    />
                  </label>
                </div>
              </div>

              {/* 16 Tactile Soundboard Pads Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredPads.map((pad) => {
                  const isTriggered = recentPadId === pad.id;
                  return (
                    <button
                      key={pad.id}
                      type="button"
                      onClick={() => onTriggerPad(pad, 0.9)}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-28 relative overflow-hidden active:scale-95 group ${
                        isTriggered
                          ? 'bg-amber-500/25 border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.45)]'
                          : 'bg-zinc-900/85 hover:bg-zinc-900 border-zinc-800 hover:border-amber-500/50'
                      }`}
                    >
                      <div
                        className="absolute top-0 inset-x-0 h-1 opacity-80"
                        style={{ backgroundColor: pad.color }}
                      />
                      <div className="flex items-center justify-between">
                        <span
                          className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-zinc-950/80 border border-zinc-800"
                          style={{ color: pad.color }}
                        >
                          {pad.category}
                        </span>
                        <Play className="w-4 h-4 text-zinc-400 group-hover:text-amber-300 transition-colors" />
                      </div>
                      <div>
                        <div className="text-sm font-mono font-bold text-white group-hover:text-amber-200">
                          {pad.name}
                        </div>
                        <div className="text-[11px] text-zinc-400 line-clamp-1">{pad.subtitle}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: POSITIONAL / MAP AUDIO SOURCES (SPATIAL 2D)        */}
          {/* ========================================================= */}
          {activeTab === 'spatial' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Place New Map Audio Emitter */}
              <div className="lg:col-span-5 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-2.5">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
                    Place Positional Sound on Map
                  </h3>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  Drop a spatial sound emitter onto the battlemap. As players move their tokens closer within its radius, the sound automatically swells in volume—and muffles behind closed doors or walls!
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                      Emitter Label (DM Reference)
                    </label>
                    <input
                      type="text"
                      value={newPinLabel}
                      onChange={(e) => setNewPinLabel(e.target.value)}
                      placeholder="e.g., Tavern Fireplace, Ritual Altar, Ticking Trap"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                      Looping Sound Source
                    </label>
                    <select
                      value={newPinTrackId}
                      onChange={(e) => setNewPinTrackId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white font-mono"
                    >
                      {allTracks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                        Audible Radius: <strong className="text-amber-300">{newPinRadiusFt} ft</strong>
                      </label>
                      <input
                        type="range"
                        min={10}
                        max={120}
                        step={5}
                        value={newPinRadiusFt}
                        onChange={(e) => setNewPinRadiusFt(parseInt(e.target.value, 10))}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                        Peak Volume: <strong className="text-amber-300">{Math.round(newPinMaxVol * 100)}%</strong>
                      </label>
                      <input
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.05}
                        value={newPinMaxVol}
                        onChange={(e) => setNewPinMaxVol(parseFloat(e.target.value))}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newPinMuffled}
                        onChange={(e) => setNewPinMuffled(e.target.checked)}
                        className="rounded accent-amber-400"
                      />
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      <span>Muffle sound through walls & closed doors</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newPinVisibleToPlayers}
                        onChange={(e) => setNewPinVisibleToPlayers(e.target.checked)}
                        className="rounded accent-amber-400"
                      />
                      {newPinVisibleToPlayers ? (
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-zinc-500" />
                      )}
                      <span>Show sound ripple ring on Player map (keep off for secret traps)</span>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleDropNewSpatialPin}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Drop Spatial Audio Pin on Map Center</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Active Map Audio Emitters List */}
              <div className="lg:col-span-7 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex flex-col">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 mb-3">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300">
                    Active Map Audio Emitters ({jukeboxState.mapAudioSources.length})
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500">
                    Tip: Drag 🔊 pins directly on the battlemap canvas
                  </span>
                </div>

                {jukeboxState.mapAudioSources.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-zinc-500">
                    <MapPin className="w-8 h-8 text-zinc-700 mb-2" />
                    <p className="text-xs font-mono">No positional audio sources placed on this map yet.</p>
                    <p className="text-[11px] text-zinc-600 mt-1">
                      Use the form on the left to drop a roaring hearth, whispering altar, or trap sound onto the map.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 overflow-y-auto max-h-80 pr-1">
                    {jukeboxState.mapAudioSources.map((src) => {
                      const trackDef = allTracks.find((t) => t.id === src.trackId);
                      return (
                        <div
                          key={src.id}
                          className="p-3 rounded-xl bg-zinc-950/90 border border-zinc-800 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-amber-300 truncate">
                                {src.label}
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
                                {src.radiusFt} ft radius
                              </span>
                              {src.muffledByWalls && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/50 text-blue-300 border border-blue-500/30">
                                  Wall Muffle
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400 mt-0.5">
                              Sound: <strong className="text-zinc-200">{trackDef?.name || src.trackId}</strong> • Pos: ({Math.round(src.x)}, {Math.round(src.y)})
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                onSaveMapAudioSource({
                                  ...src,
                                  muted: !src.muted
                                })
                              }
                              className={`p-2 rounded-lg border text-xs font-mono cursor-pointer ${
                                src.muted
                                  ? 'bg-zinc-900 border-zinc-700 text-zinc-500'
                                  : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                              }`}
                              title={src.muted ? 'Unmute Emitter' : 'Mute Emitter'}
                            >
                              {src.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => onDeleteMapAudioSource(src.id)}
                              className="p-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 cursor-pointer"
                              title="Remove Emitter from Map"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
