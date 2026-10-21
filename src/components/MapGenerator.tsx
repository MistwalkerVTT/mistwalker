import { useState, useRef, MouseEvent, useEffect } from 'react';
import {
  Download,
  Sparkles,
  Map as MapIcon,
  Grid as GridIcon,
  Tent,
  Flame,
  CloudRain,
  Sun,
  SunMoon,
  Trash2,
  Trees,
  Mountain,
  Castle,
  Droplets,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Dices,
  BookOpen,
  ShieldAlert,
  Compass,
  X,
  Play,
  Pause,
  Loader2,
  Waves,
  Wind,
  Snowflake,
  Maximize2,
  Sliders,
  Plus,
  Key
} from 'lucide-react';
import { generateTTS, getStoredGeminiKey, checkApiKeyStatus } from '../services/aiService';
import { audioNarration } from '../services/audioNarrationService';
import {
  AnimatedMapOverlay,
  AnimatedFeature,
  AnimatedFeatureType,
  WeatherEffectType
} from './AnimatedMapOverlay';
import { WallSegment } from '../types';

// -- Types & Options --
type Biome = 'forest' | 'desert' | 'snow' | 'swamp' | 'dungeon' | 'cave' | 'volcanic' | 'urban';
type TimeOfDay = 'dawn' | 'noon' | 'dusk' | 'midnight';
type Weather = 'clear' | 'overcast' | 'rain' | 'fog' | 'snow' | 'storm';
type LightType = 'torch' | 'magical' | 'daylight';
type LightSource = { x: number; y: number; type: LightType; radius: number };
type GeneratorEngine = 'architectural' | 'flux' | 'nano-banana-pro' | 'nano-banana-2' | 'procedural';
type ImageResolution = '1K' | '2K' | '4K';
type MapAspectRatio = '16:9' | '4:3' | '1:1';
type ArtStyle = 'photorealistic' | 'dark-fantasy' | 'ethereal' | 'classic';

export type MapSizePresetKey = 'small' | 'medium' | 'large' | 'colossal' | 'custom';

export interface GeneratedCanvasSize {
  width: number;
  height: number;
  gridW: number;
  gridH: number;
  cellPx: number;
}

export const MAP_SIZE_PRESETS: Record<
  Exclude<MapSizePresetKey, 'custom'>,
  { label: string; width: number; height: number; description: string }
> = {
  small: { label: 'Small Skirmish', width: 20, height: 15, description: '100×75 ft (Tavern, Ambush, Crypt)' },
  medium: { label: 'Medium Encounter', width: 30, height: 20, description: '150×100 ft (Dungeon Wing, Glade, Camp)' },
  large: { label: 'Large Stronghold', width: 45, height: 30, description: '225×150 ft (Caverns, Castle, Pass)' },
  colossal: { label: 'Colossal Battlefield', width: 60, height: 40, description: '300×200 ft (Siege, Open Realm, Volcano)' }
};

export interface CinematicBriefing {
  title: string;
  readAloud: string;
  atmosphere: {
    sounds: string;
    smells: string;
    temperature: string;
    lighting: string;
  };
  tacticalHazards: {
    name: string;
    description: string;
    check: string;
  }[];
}

const BIOMES: { value: Biome; label: string; icon: any }[] = [
  { value: 'forest', label: 'Forest', icon: Trees },
  { value: 'desert', label: 'Desert', icon: Sun },
  { value: 'snow', label: 'Tundra', icon: CloudRain },
  { value: 'swamp', label: 'Swamp', icon: Droplets },
  { value: 'dungeon', label: 'Dungeon', icon: Castle },
  { value: 'cave', label: 'Cave', icon: Mountain },
  { value: 'volcanic', label: 'Volcanic', icon: Flame },
  { value: 'urban', label: 'City Streets', icon: Tent },
];

const TIMES_OF_DAY: { value: TimeOfDay; label: string }[] = [
  { value: 'dawn', label: 'Dawn' },
  { value: 'noon', label: 'High Noon' },
  { value: 'dusk', label: 'Dusk' },
  { value: 'midnight', label: 'Midnight' },
];

const WEATHERS: { value: Weather; label: string }[] = [
  { value: 'clear', label: 'Clear Skies' },
  { value: 'overcast', label: 'Overcast' },
  { value: 'rain', label: 'Pouring Rain' },
  { value: 'fog', label: 'Thick Fog' },
  { value: 'snow', label: 'Blizzard' },
  { value: 'storm', label: 'Thunderstorm' },
];

interface MapGeneratorProps {
  onClose: () => void;
  onOpenApiKeyModal?: () => void;
  onApply?: (
    imageUrl: string,
    briefing?: CinematicBriefing,
    features?: AnimatedFeature[],
    weather?: WeatherEffectType,
    sizePreset?: MapSizePresetKey,
    walls?: WallSegment[],
    canvasSize?: GeneratedCanvasSize
  ) => void;
}

export default function MapGenerator({ onClose, onOpenApiKeyModal, onApply }: MapGeneratorProps) {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [biome, setBiome] = useState<Biome>('dungeon');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('midnight');
  const [weather, setWeather] = useState<Weather>('clear');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 1000000));
  const [engine, setEngine] = useState<GeneratorEngine>('architectural');
  const [imageSize, setImageSize] = useState<ImageResolution>('2K');
  const [aspectRatio, setAspectRatio] = useState<MapAspectRatio>('16:9');
  const [artStyle, setArtStyle] = useState<ArtStyle>('photorealistic');

  // Tactical Map Size State
  const [mapSizeId, setMapSizeId] = useState<MapSizePresetKey>('medium');
  const [customWidth, setCustomWidth] = useState<number>(30);
  const [customHeight, setCustomHeight] = useState<number>(20);

  const currentGridWidth = mapSizeId === 'custom' ? customWidth : MAP_SIZE_PRESETS[mapSizeId].width;
  const currentGridHeight = mapSizeId === 'custom' ? customHeight : MAP_SIZE_PRESETS[mapSizeId].height;

  // Animated Features & Weather Overlay State
  const [animatedFeatures, setAnimatedFeatures] = useState<AnimatedFeature[]>([]);
  const [animatedEnabled, setAnimatedEnabled] = useState(true);
  const [weatherEffect, setWeatherEffect] = useState<WeatherEffectType>('none');
  const [placingAnimatedType, setPlacingAnimatedType] = useState<AnimatedFeatureType | null>(null);
  const [showAnimatedPanel, setShowAnimatedPanel] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [mapSource, setMapSource] = useState<string>('architectural');
  const [detectedWalls, setDetectedWalls] = useState<WallSegment[]>([]);
  const [showDetectedWalls, setShowDetectedWalls] = useState(true);
  const [canvasSize, setCanvasSize] = useState<GeneratedCanvasSize>({
    width: 1920,
    height: 1280,
    gridW: 30,
    gridH: 20,
    cellPx: 64
  });
  const [briefing, setBriefing] = useState<CinematicBriefing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requiresPaidKey, setRequiresPaidKey] = useState(false);

  // Active view tab: 'map' | 'dossier'
  const [activeTab, setActiveTab] = useState<'map' | 'dossier'>('map');

  // Audio Narration State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [copiedReadAloud, setCopiedReadAloud] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Interactive Lighting Features
  const [showGrid, setShowGrid] = useState(true);
  const [showLighting, setShowLighting] = useState(false);
  const [lights, setLights] = useState<LightSource[]>([]);
  const [placingLightType, setPlacingLightType] = useState<LightType | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Check Gemini API key status on load
  useEffect(() => {
    checkApiKeyStatus().then(status => {
      setHasApiKey(status.hasKey);
    });
  }, []);

  const randomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 1000000));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setRequiresPaidKey(false);
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    }

    const localKey = getStoredGeminiKey();
    try {
      const res = await fetch('/api/ai/generate-map', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localKey ? { 'x-gemini-api-key': localKey } : {})
        },
        body: JSON.stringify({
          prompt: customPrompt,
          biome,
          weather,
          timeOfDay,
          seed,
          engine,
          imageSize,
          aspectRatio,
          style: artStyle,
          mapSize: {
            width: currentGridWidth,
            height: currentGridHeight,
            label: mapSizeId === 'custom' ? `Custom ${currentGridWidth}x${currentGridHeight}` : MAP_SIZE_PRESETS[mapSizeId].label
          }
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || `Map engine returned status ${res.status}`);
      }

      const data = await res.json();
      if (data.imageUrl) {
        setImageUrl(data.imageUrl);
        setMapSource(data.source || engine);
        setLights([]);
        if (data.canvasSize && data.canvasSize.width > 0 && data.canvasSize.height > 0) {
          setCanvasSize(data.canvasSize);
        } else {
          setCanvasSize({
            width: currentGridWidth * 64,
            height: currentGridHeight * 64,
            gridW: currentGridWidth,
            gridH: currentGridHeight,
            cellPx: 64
          });
        }
        if (data.walls && Array.isArray(data.walls)) {
          setDetectedWalls(data.walls);
        } else {
          setDetectedWalls([]);
        }
        if (data.briefing) {
          setBriefing(data.briefing);
        }
        if (data.seed !== undefined) {
          setSeed(data.seed);
        }
        if (data.requiresPaidKey) {
          setRequiresPaidKey(true);
        }
        if (data.error) {
          setError(data.error);
        }

        // Auto-seed thematic animated features based on biome, weather, and prompt
        const initialAnimated: AnimatedFeature[] = [];
        let autoWeather: WeatherEffectType = 'none';

        if (weather === 'rain' || weather === 'storm') {
          autoWeather = 'rain';
        } else if (weather === 'snow') {
          autoWeather = 'snow';
        } else if (weather === 'fog') {
          autoWeather = 'fog';
        }

        const lowerPrompt = customPrompt.toLowerCase();
        if (biome === 'volcanic' || lowerPrompt.includes('lava') || lowerPrompt.includes('magma')) {
          initialAnimated.push(
            { id: `lava-${Date.now()}-1`, type: 'lava', x: 50, y: 50, radius: 18, intensity: 1.1 },
            { id: `lava-${Date.now()}-2`, type: 'lava', x: 30, y: 68, radius: 14, intensity: 0.95 }
          );
          if (autoWeather === 'none') autoWeather = 'embers';
        } else if (biome === 'dungeon' || biome === 'cave') {
          initialAnimated.push(
            { id: `torch-${Date.now()}-1`, type: 'torch', x: 25, y: 35, radius: 9, intensity: 1.0 },
            { id: `torch-${Date.now()}-2`, type: 'torch', x: 75, y: 35, radius: 9, intensity: 1.0 },
            { id: `torch-${Date.now()}-3`, type: 'torch', x: 50, y: 78, radius: 10, intensity: 1.0 }
          );
        } else if (biome === 'swamp' || lowerPrompt.includes('river') || lowerPrompt.includes('water') || lowerPrompt.includes('stream')) {
          initialAnimated.push(
            { id: `water-${Date.now()}-1`, type: 'water', x: 50, y: 48, radius: 24, intensity: 1.0, rotation: 35 }
          );
          if (biome === 'swamp' && autoWeather === 'none') autoWeather = 'spores';
        } else if (lowerPrompt.includes('altar') || lowerPrompt.includes('portal') || lowerPrompt.includes('rune') || lowerPrompt.includes('crystal')) {
          initialAnimated.push(
            { id: `arcane-${Date.now()}-1`, type: 'arcane', x: 50, y: 50, radius: 14, intensity: 1.2 }
          );
        }

        setAnimatedFeatures(initialAnimated);
        setWeatherEffect(autoWeather);
      } else {
        throw new Error(data.error || 'Failed to render tactical map.');
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to generate map.';
      setError(msg);
      if (msg.includes('GEMINI_API_KEY') || msg.includes('API key') || msg.includes('401') || msg.includes('403') || msg.includes('quota')) {
        setRequiresPaidKey(true);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const playNarration = async () => {
    if (!briefing?.readAloud) return;

    if (isPlayingAudio) {
      audioNarration.stop();
      setIsPlayingAudio(false);
      return;
    }

    setIsLoadingAudio(true);
    try {
      await audioNarration.play({
        text: briefing.readAloud,
        voiceId: 'wizard',
        onStart: () => {
          setIsPlayingAudio(true);
          setIsLoadingAudio(false);
        },
        onEnded: () => {
          setIsPlayingAudio(false);
        },
        onError: () => {
          setIsPlayingAudio(false);
          setIsLoadingAudio(false);
        }
      });
      setIsPlayingAudio(true);
    } catch (err) {
      console.warn('TTS playback error:', err);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const copyReadAloud = () => {
    if (!briefing?.readAloud) return;
    navigator.clipboard.writeText(briefing.readAloud);
    setCopiedReadAloud(true);
    setTimeout(() => setCopiedReadAloud(false), 2000);
  };

  const downloadImage = () => {
    if (!imageUrl) return;
    const isPng = imageUrl.startsWith('data:image/png') || imageUrl.startsWith('data:image/jpeg');
    const ext = isPng ? 'png' : 'svg';
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `mistwalker-battlemap-${biome}-${mapSource}-${seed}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleMapClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!showLighting || !placingLightType || !mapContainerRef.current) return;

    const rect = mapContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const radius = placingLightType === 'torch' ? 15 : placingLightType === 'magical' ? 25 : 40;

    setLights(prev => [...prev, { x, y, type: placingLightType, radius }]);
    setPlacingLightType(null);
  };

  const clearLights = () => setLights([]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col md:flex-row overflow-hidden bg-zinc-950/98 backdrop-blur-xl text-zinc-300 font-sans select-none animate-in fade-in zoom-in-95 duration-200">
      {/* Left Sidebar: Controls & Customization */}
      <aside className="w-full md:w-80 lg:w-76 h-screen overflow-y-auto bg-zinc-950 border-r border-zinc-800 p-4 flex flex-col gap-5 shrink-0 z-30 relative scrollbar-thin scrollbar-thumb-zinc-800">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-zinc-800"
          title="Close Generator"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="flex items-center gap-3 mt-1">
          <div className="w-9 h-9 bg-amber-500/20 border border-amber-500/50 rounded-xl flex items-center justify-center shrink-0">
            <div className="w-4 h-4 bg-amber-500 rotate-45 shadow-[0_0_12px_rgba(245,158,11,0.9)]"></div>
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white uppercase leading-tight">
              CARTOGRAPHER <span className="text-amber-500">CINEMATIC</span>
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase">Generative Tactical Engine</p>
          </div>
        </div>

        <div className="space-y-5 flex-1 flex flex-col">
          {/* AI Generator Model Engine */}
          <section>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Map & Wall Engine</label>
              <span className="text-[9px] font-mono font-bold text-amber-400 uppercase">
                {engine === 'architectural' ? '1" Grid Overhead + Exact Walls' : engine === 'flux' ? 'FLUX.1 + Vision Walls' : engine === 'nano-banana-pro' ? 'gemini-3-pro-image' : 'Vector SVG'}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={() => setEngine('architectural')}
                className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                  engine === 'architectural'
                    ? 'border-amber-500 bg-amber-500/15 text-white ring-1 ring-amber-500/30'
                    : 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400'
                }`}
              >
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5 text-amber-400">
                    <GridIcon className="w-3.5 h-3.5" />
                    <span>OVERHEAD 1" GRID ARCHITECT</span>
                  </div>
                  <div className="text-[10px] text-zinc-400">True 90° Top-Down D&D Floorplan + 100% Exact Walls & Doors</div>
                </div>
                <span className="text-[9px] font-mono uppercase bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/40">
                  BEST
                </span>
              </button>

              <button
                type="button"
                onClick={() => setEngine('flux')}
                className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                  engine === 'flux'
                    ? 'border-amber-500 bg-amber-500/15 text-white ring-1 ring-amber-500/30'
                    : 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400'
                }`}
              >
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5 text-zinc-200">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>FLUX.1 TOP-DOWN + VISION WALLS</span>
                  </div>
                  <div className="text-[10px] text-zinc-400">AI Painted Overhead Artwork + Vision Auto-Wall Tracing</div>
                </div>
                <span className="text-[9px] font-mono uppercase bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/40">
                  FREE
                </span>
              </button>

              <button
                type="button"
                onClick={() => setEngine('nano-banana-pro')}
                className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                  engine === 'nano-banana-pro'
                    ? 'border-amber-500 bg-amber-500/15 text-white ring-1 ring-amber-500/30'
                    : 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400'
                }`}
              >
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5 text-zinc-200">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>NANO BANANA PRO</span>
                  </div>
                  <div className="text-[10px] text-zinc-400">Gemini 3 Pro Overhead Map (Requires Gemini API Key)</div>
                </div>
                <span className="text-[9px] font-mono uppercase bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/40">
                  PRO
                </span>
              </button>
            </div>
          </section>

          {/* Resolution, Aspect Ratio & Realism Style (for AI models) */}
          {engine !== 'procedural' && (
            <section className="space-y-3 p-3 bg-zinc-900/40 rounded-xl border border-zinc-800/80">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Resolution Quality</label>
                  <span className="text-[9px] font-mono text-amber-400 font-bold">{imageSize}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['1K', '2K', '4K'] as ImageResolution[]).map(res => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => setImageSize(res)}
                      className={`h-8 rounded-lg border text-[11px] font-mono font-bold transition-all ${
                        imageSize === res
                          ? 'border-amber-500 bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Battlefield Aspect Ratio</label>
                  <span className="text-[9px] font-mono text-amber-400 font-bold">{aspectRatio}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: '16:9', label: '16:9', sub: 'Wide' },
                    { id: '4:3', label: '4:3', sub: 'Classic' },
                    { id: '1:1', label: '1:1', sub: 'Square' }
                  ].map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setAspectRatio(r.id as MapAspectRatio)}
                      className={`h-8 rounded-lg border text-[10px] font-mono font-bold transition-all flex items-center justify-center gap-1 ${
                        aspectRatio === r.id
                          ? 'border-amber-500 bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span>{r.label}</span>
                      <span className="text-[8px] opacity-70 font-sans uppercase">({r.sub})</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Art & Realism Style</label>
                <select
                  value={artStyle}
                  onChange={e => setArtStyle(e.target.value as ArtStyle)}
                  className="w-full h-8 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="photorealistic">Photorealistic & Gritty (Natural Textures, 8K)</option>
                  <option value="dark-fantasy">Dark Gothic Fantasy (Torches, Fog, Ominous)</option>
                  <option value="ethereal">Ethereal Arcane (Luminescent, Crystal Waters)</option>
                  <option value="classic">Classic Tabletop RPG (Painted, High Contrast)</option>
                </select>
              </div>
            </section>
          )}

          {/* Map Size & Tactical Dimensions */}
          <section className="space-y-2.5 p-3 bg-zinc-900/40 rounded-xl border border-zinc-800/80">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                Map Size & Scale
              </label>
              <span className="text-[9px] font-mono text-amber-400 font-bold">
                {currentGridWidth}×{currentGridHeight} ({currentGridWidth * 5}×{currentGridHeight * 5} FT)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {(['small', 'medium', 'large', 'colossal'] as const).map(key => {
                const p = MAP_SIZE_PRESETS[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMapSizeId(key)}
                    className={`p-2 rounded-lg border text-left transition-all flex flex-col ${
                      mapSizeId === key
                        ? 'border-amber-500 bg-amber-500/20 text-white ring-1 ring-amber-500/40'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold">{p.label}</span>
                      <span className="text-[8px] font-mono text-amber-400/80">{p.width}×{p.height}</span>
                    </div>
                    <span className="text-[8px] text-zinc-500 mt-0.5 leading-tight">{p.description}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Grid Dimensions Toggle */}
            <button
              type="button"
              onClick={() => setMapSizeId(mapSizeId === 'custom' ? 'medium' : 'custom')}
              className={`w-full py-1.5 px-2.5 rounded-lg border text-[10px] font-semibold flex items-center justify-between transition-all ${
                mapSizeId === 'custom'
                  ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
              }`}
            >
              <span>Custom Dimensions</span>
              <span className="font-mono text-[9px] uppercase">{mapSizeId === 'custom' ? 'Active' : 'Custom'}</span>
            </button>

            {mapSizeId === 'custom' && (
              <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1.5 animate-in fade-in duration-150">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[8px] font-mono text-zinc-400 block mb-0.5">WIDTH (SQUARES)</label>
                    <input
                      type="number"
                      min={10}
                      max={100}
                      value={customWidth}
                      onChange={e => setCustomWidth(Math.max(10, Math.min(100, Number(e.target.value) || 10)))}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-mono text-zinc-400 block mb-0.5">HEIGHT (SQUARES)</label>
                    <input
                      type="number"
                      min={10}
                      max={100}
                      value={customHeight}
                      onChange={e => setCustomHeight(Math.max(10, Math.min(100, Number(e.target.value) || 10)))}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white font-mono"
                    />
                  </div>
                </div>
                <div className="text-[8px] font-mono text-amber-400 text-center">
                  Total Playable Area: {customWidth * 5} ft × {customHeight * 5} ft ({customWidth * customHeight} tiles)
                </div>
              </div>
            )}
          </section>

          {/* Biome Selection */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Biome & Terrain</label>
              <span className="text-[9px] font-mono text-amber-500 uppercase">{biome}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {BIOMES.map(b => (
                <button
                  key={b.value}
                  onClick={() => setBiome(b.value)}
                  className={`flex flex-col items-center justify-center gap-1 h-14 rounded-xl border text-[10px] transition-all duration-150 uppercase tracking-wide
                    ${biome === b.value
                      ? 'border-amber-500 bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30 font-bold'
                      : 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                  <b.icon className={`w-4 h-4 ${biome !== b.value ? 'opacity-60' : ''}`} />
                  {b.label}
                </button>
              ))}
            </div>
          </section>

          {/* Environmental Conditions */}
          <section className="space-y-3">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Environment Conditions</label>

            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Time of Day</label>
              <select
                value={timeOfDay}
                onChange={e => setTimeOfDay(e.target.value as TimeOfDay)}
                className="w-full h-9 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg px-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 transition-all font-medium uppercase tracking-wide cursor-pointer"
              >
                {TIMES_OF_DAY.map(t => (
                  <option key={t.value} value={t.value} className="bg-zinc-900 text-zinc-200">{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Weather Atmosphere</label>
              <select
                value={weather}
                onChange={e => setWeather(e.target.value as Weather)}
                className="w-full h-9 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg px-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 transition-all font-medium uppercase tracking-wide cursor-pointer"
              >
                {WEATHERS.map(w => (
                  <option key={w.value} value={w.value} className="bg-zinc-900 text-zinc-200">{w.label}</option>
                ))}
              </select>
            </div>
          </section>

          {/* Seed Randomization */}
          <section>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Generation Seed</label>
              <button
                type="button"
                onClick={randomizeSeed}
                className="text-[10px] text-amber-500 hover:text-amber-400 flex items-center gap-1 font-mono transition-colors"
                title="Reroll Seed for unique layout"
              >
                <Dices className="w-3.5 h-3.5" /> Reroll
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={seed}
                onChange={e => setSeed(parseInt(e.target.value) || 0)}
                className="flex-1 h-9 bg-zinc-900 border border-zinc-800 rounded-lg px-3 text-xs font-mono text-zinc-300 focus:outline-none focus:border-amber-500"
              />
            </div>
          </section>

          {/* Custom Scene Prompt */}
          <section>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                Cinematic Landmark & Features
              </label>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {[
                'Arcane altar with glowing runes',
                'Ancient crumbling bridges over chasm',
                'Flooded crypt with sunken pillars',
                'Dragon skull throne & gold hoard'
              ].map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCustomPrompt(preset)}
                  className="text-[9px] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-amber-300 border border-zinc-800 px-2 py-0.5 rounded-md transition-colors text-left truncate max-w-full"
                >
                  + {preset}
                </button>
              ))}
            </div>
            <textarea
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              placeholder="e.g. Ruined watchtower, arcane altar, deep chasm..."
              className="w-full h-20 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-all resize-none font-medium"
            />
          </section>

          {/* Action Buttons */}
          <div className="mt-auto pt-2 flex flex-col gap-2.5">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[11px] text-red-400 break-words">
                <span className="font-bold uppercase tracking-wider block mb-0.5">Render Notice</span>
                {error}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:from-zinc-800 disabled:to-zinc-800 disabled:border disabled:border-zinc-700 disabled:text-zinc-500 text-white text-xs font-bold py-3.5 px-4 rounded-xl transition-all uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.35)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] disabled:shadow-none flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Synthesizing Map & Lore...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>Generate Cinematic Map</span>
                </>
              )}
            </button>

            {imageUrl && onApply && (
              <button
                onClick={() => onApply(imageUrl, briefing || undefined, animatedFeatures, weatherEffect, mapSizeId, detectedWalls, canvasSize)}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3 px-4 rounded-xl transition-all uppercase tracking-wider shadow-[0_0_15px_rgba(79,70,229,0.35)] flex items-center justify-center gap-2"
              >
                <Compass className="w-4 h-4" />
                <span>
                  Send to Campaign Board{' '}
                  {detectedWalls.length > 0
                    ? `(${detectedWalls.filter(w => w.wallType !== 'door').length} Walls, ${detectedWalls.filter(w => w.wallType === 'door').length} Doors)`
                    : ''}
                </span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Display Area */}
      <main className="flex-1 h-screen overflow-hidden flex flex-col bg-zinc-950 relative">
        {/* Top View Mode & Tools Header */}
        <header className="h-16 border-b border-zinc-800/80 bg-zinc-950/70 flex items-center justify-between px-6 backdrop-blur-md z-20 shrink-0">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'map'
                  ? 'bg-amber-500/20 border border-amber-500/60 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                  : 'bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-400'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" /> Tactical Map
            </button>

            <button
              onClick={() => setActiveTab('dossier')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all relative ${
                activeTab === 'dossier'
                  ? 'bg-indigo-500/20 border border-indigo-500/60 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.25)]'
                  : 'bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-400'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Cinematic Dossier
              {briefing && (
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              )}
            </button>
          </div>

          {/* Tactical Controls & Download */}
          <div className="flex items-center gap-3">
            {activeTab === 'map' && (
              <>
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                    showGrid
                      ? 'bg-zinc-800 border border-zinc-700 text-zinc-200'
                      : 'bg-zinc-900/60 border border-zinc-800 text-zinc-500'
                  }`}
                >
                  <GridIcon className="w-3.5 h-3.5" /> Grid 5ft
                </button>

                {detectedWalls.length > 0 && (
                  <button
                    onClick={() => setShowDetectedWalls(!showDetectedWalls)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                      showDetectedWalls
                        ? 'bg-amber-500/20 border border-amber-500/60 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                        : 'bg-zinc-900/60 border border-zinc-800 text-zinc-500'
                    }`}
                    title="Toggle AI-detected Wall & Door Preview Lines"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    <span>Walls ({detectedWalls.length})</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowLighting(!showLighting);
                    if (showLighting) setPlacingLightType(null);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                    showLighting
                      ? 'bg-amber-500/20 border border-amber-500/50 text-amber-400'
                      : 'bg-zinc-900/60 border border-zinc-800 text-zinc-500'
                  }`}
                >
                  <SunMoon className="w-3.5 h-3.5" /> Lighting FX
                </button>

                <button
                  onClick={() => {
                    setShowAnimatedPanel(!showAnimatedPanel);
                    if (placingLightType) setPlacingLightType(null);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                    showAnimatedPanel || (animatedEnabled && animatedFeatures.length > 0)
                      ? 'bg-cyan-500/20 border border-cyan-500/60 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                      : 'bg-zinc-900/60 border border-zinc-800 text-zinc-500'
                  }`}
                >
                  <Waves className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Animated FX</span>
                  {animatedFeatures.length > 0 && (
                    <span className="bg-cyan-500 text-black px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold">
                      {animatedFeatures.length}
                    </span>
                  )}
                </button>

                {showLighting && (
                  <div className="flex items-center gap-1.5 ml-1 animate-in fade-in slide-in-from-left-2 duration-150">
                    <button
                      onClick={() => setPlacingLightType(placingLightType === 'torch' ? null : 'torch')}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        placingLightType === 'torch'
                          ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                          : 'bg-zinc-900 border border-zinc-800 text-amber-400'
                      }`}
                      title="Place Torch Light"
                    >
                      <Flame className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setPlacingLightType(placingLightType === 'magical' ? null : 'magical')}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        placingLightType === 'magical'
                          ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                          : 'bg-zinc-900 border border-zinc-800 text-indigo-400'
                      }`}
                      title="Place Arcane Light"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                    {lights.length > 0 && (
                      <button
                        onClick={clearLights}
                        className="w-7 h-7 bg-zinc-900 border border-zinc-800 hover:text-red-400 text-zinc-500 rounded-lg flex items-center justify-center transition-colors"
                        title="Clear Dynamic Lights"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="h-4 w-px bg-zinc-800 mx-1"></div>

            {/* Gemini API Key status / loader button */}
            <button
              type="button"
              onClick={onOpenApiKeyModal}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                hasApiKey
                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40 animate-pulse'
              }`}
              title={hasApiKey ? 'Gemini API Key Loaded (Click to Manage)' : 'Click to Load Gemini API Key'}
            >
              <Key className="w-3.5 h-3.5" />
              <span>{hasApiKey ? 'API Key Active' : 'Load Gemini Key'}</span>
            </button>

            <button
              onClick={downloadImage}
              disabled={!imageUrl}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 disabled:opacity-40 text-zinc-200 text-[10px] font-bold rounded-lg transition-all uppercase tracking-wider"
            >
              <Download className="w-3.5 h-3.5" />
              {imageUrl && (imageUrl.startsWith('data:image/png') || imageUrl.startsWith('data:image/jpeg'))
                ? 'Export PNG'
                : 'Export SVG'}
            </button>
          </div>
        </header>

        {/* Animated Features Sub-Toolbar */}
        {showAnimatedPanel && activeTab === 'map' && (
          <div className="border-b border-zinc-800 bg-zinc-900/95 backdrop-blur-md px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 z-20 text-xs shadow-md">
            {/* Left: Master Play/Pause & Feature Add Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Master Animation Toggle */}
              <button
                type="button"
                onClick={() => setAnimatedEnabled(!animatedEnabled)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider border transition-all ${
                  animatedEnabled
                    ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                }`}
              >
                {animatedEnabled ? <Play className="w-3 h-3 text-emerald-400 fill-emerald-400" /> : <Pause className="w-3 h-3" />}
                <span>{animatedEnabled ? 'Animating' : 'Paused'}</span>
              </button>

              <div className="h-4 w-px bg-zinc-800 mx-0.5" />

              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Add Feature:</span>

              {/* Water / River Flow */}
              <button
                type="button"
                onClick={() => setPlacingAnimatedType(placingAnimatedType === 'water' ? null : 'water')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                  placingAnimatedType === 'water'
                    ? 'bg-cyan-600 text-white border-cyan-400 ring-2 ring-cyan-400/50'
                    : 'bg-zinc-900 border-zinc-800 text-cyan-300 hover:bg-zinc-850'
                }`}
                title="Click to place Flowing River / Water Current"
              >
                <Waves className="w-3 h-3" />
                <span>River / Water</span>
              </button>

              {/* Molten Lava */}
              <button
                type="button"
                onClick={() => setPlacingAnimatedType(placingAnimatedType === 'lava' ? null : 'lava')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                  placingAnimatedType === 'lava'
                    ? 'bg-orange-600 text-white border-amber-400 ring-2 ring-orange-500/50'
                    : 'bg-zinc-900 border-zinc-800 text-orange-400 hover:bg-zinc-850'
                }`}
                title="Click to place Molten Lava Pool & Embers"
              >
                <Flame className="w-3 h-3" />
                <span>Lava Pool</span>
              </button>

              {/* Flickering Torch */}
              <button
                type="button"
                onClick={() => setPlacingAnimatedType(placingAnimatedType === 'torch' ? null : 'torch')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                  placingAnimatedType === 'torch'
                    ? 'bg-amber-600 text-white border-amber-300 ring-2 ring-amber-400/50'
                    : 'bg-zinc-900 border-zinc-800 text-amber-300 hover:bg-zinc-850'
                }`}
                title="Click to place Organic Flickering Torch"
              >
                <Flame className="w-3 h-3 text-amber-200" />
                <span>Torch Light</span>
              </button>

              {/* Arcane Rune */}
              <button
                type="button"
                onClick={() => setPlacingAnimatedType(placingAnimatedType === 'arcane' ? null : 'arcane')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                  placingAnimatedType === 'arcane'
                    ? 'bg-purple-600 text-white border-fuchsia-300 ring-2 ring-purple-400/50'
                    : 'bg-zinc-900 border-zinc-800 text-purple-300 hover:bg-zinc-850'
                }`}
                title="Click to place Arcane Leyline Well / Portal"
              >
                <Sparkles className="w-3 h-3" />
                <span>Arcane Rune</span>
              </button>

              {/* Fog Pocket */}
              <button
                type="button"
                onClick={() => setPlacingAnimatedType(placingAnimatedType === 'fog' ? null : 'fog')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                  placingAnimatedType === 'fog'
                    ? 'bg-slate-600 text-white border-slate-300 ring-2 ring-slate-400/50'
                    : 'bg-zinc-900 border-zinc-800 text-slate-300 hover:bg-zinc-850'
                }`}
                title="Click to place Drifting Fog Patch"
              >
                <Wind className="w-3 h-3" />
                <span>Fog Bank</span>
              </button>

              {/* Acid / Poison Slime Pool */}
              <button
                type="button"
                onClick={() => setPlacingAnimatedType(placingAnimatedType === 'toxic' ? null : 'toxic')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                  placingAnimatedType === 'toxic'
                    ? 'bg-lime-600 text-white border-lime-300 ring-2 ring-lime-400/50'
                    : 'bg-zinc-900 border-zinc-800 text-lime-400 hover:bg-zinc-850'
                }`}
                title="Click to place Bubbling Acid / Slime Pool"
              >
                <Droplets className="w-3 h-3" />
                <span>Acid Pool</span>
              </button>
            </div>

            {/* Right: Weather Particle System & Clear */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Weather FX:</span>
                <select
                  value={weatherEffect}
                  onChange={(e) => setWeatherEffect(e.target.value as WeatherEffectType)}
                  className="bg-zinc-950 border border-zinc-700 text-zinc-200 text-[10px] rounded px-2 py-1 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="none">None</option>
                  <option value="rain">Rain & Storm</option>
                  <option value="snow">Blizzard Snow</option>
                  <option value="fog">Dense Drifting Fog</option>
                  <option value="embers">Volcanic Embers</option>
                  <option value="spores">Arcane Spores / Fireflies</option>
                </select>
              </div>

              {animatedFeatures.length > 0 && (
                <button
                  type="button"
                  onClick={() => setAnimatedFeatures([])}
                  className="px-2 py-1 rounded bg-zinc-950 hover:bg-red-950/60 border border-zinc-800 hover:border-red-600 text-zinc-400 hover:text-red-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                  title="Clear All Animated Features"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear ({animatedFeatures.length})</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content View Area */}
        <div className="flex-1 relative overflow-y-auto p-4 sm:p-8 flex flex-col items-center justify-center">
          {requiresPaidKey && (
            <div className="mb-4 w-full max-w-2xl bg-amber-500/10 border border-amber-500/40 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-amber-200 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {error || (
                    <>
                      Nano Banana Pro (<strong>gemini-3-pro-image</strong>) requires a Gemini API key for AI photorealistic rendering.
                    </>
                  )}
                </span>
              </div>
              {onOpenApiKeyModal && (
                <button
                  type="button"
                  onClick={onOpenApiKeyModal}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-[11px] shrink-0 transition-colors flex items-center gap-1.5 shadow"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Load Gemini Key</span>
                </button>
              )}
            </div>
          )}

          {activeTab === 'map' ? (
            /* Tactical Map View */
            <div className="w-full h-full flex items-center justify-center">
              {imageUrl ? (
                <div
                  ref={mapContainerRef}
                  onClick={handleMapClick}
                  style={{
                    aspectRatio: `${canvasSize.width || 1920} / ${canvasSize.height || 1280}`
                  }}
                  className={`relative bg-zinc-950 border border-zinc-800 rounded-xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] max-w-full max-h-full transition-all duration-300 ${placingLightType || placingAnimatedType ? 'cursor-crosshair' : ''}`}
                >
                  <img
                    src={imageUrl}
                    alt="Generated Tactical Battlemap"
                    className="w-full h-full object-fill rounded-xl"
                    referrerPolicy="no-referrer"
                  />

                  {/* Animated Features & Real-Time Weather Overlay */}
                  <AnimatedMapOverlay
                    enabled={animatedEnabled}
                    features={animatedFeatures}
                    weatherEffect={weatherEffect}
                    placingType={placingAnimatedType}
                    showPlacementControls={showAnimatedPanel}
                    onAddFeature={(feat) => {
                      setAnimatedFeatures(prev => [...prev, feat]);
                      setPlacingAnimatedType(null);
                    }}
                    onRemoveFeature={(id) => {
                      setAnimatedFeatures(prev => prev.filter(f => f.id !== id));
                    }}
                    onUpdateFeature={(updated) => {
                      setAnimatedFeatures(prev => prev.map(f => f.id === updated.id ? updated : f));
                    }}
                  />

                  {/* Model Engine & Scale Badge */}
                  <div className="absolute bottom-3 right-3 bg-zinc-950/90 border border-zinc-800 text-[9px] font-mono px-2.5 py-1 rounded-md text-zinc-300 backdrop-blur-md pointer-events-none flex items-center gap-2 shadow-lg z-20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="uppercase tracking-wider font-semibold">
                      {mapSource === 'architectural'
                        ? 'OVERHEAD 1" GRID ARCHITECT'
                        : mapSource === 'flux'
                        ? 'FLUX.1 TOP-DOWN • HIGH-RES'
                        : mapSource === 'nano-banana-pro'
                        ? `NANO BANANA PRO • ${imageSize}`
                        : mapSource === 'nano-banana-2'
                        ? 'NANO BANANA 2 • HD'
                        : 'TACTICAL VECTOR'}
                    </span>
                    {detectedWalls.length > 0 && (
                      <>
                        <span className="text-zinc-500">•</span>
                        <span className="text-amber-300 font-bold">
                          {detectedWalls.filter(w => w.wallType !== 'door').length} WALLS & {detectedWalls.filter(w => w.wallType === 'door').length} DOORS
                        </span>
                      </>
                    )}
                    <span className="text-zinc-500">•</span>
                    <span className="text-amber-400 font-bold">{currentGridWidth}×{currentGridHeight} 1" SQUARES ({currentGridWidth * 5}×{currentGridHeight * 5} FT)</span>
                  </div>

                  {/* 5ft (1") Grid Overlay scaled precisely to chosen map dimensions */}
                  {showGrid && (
                    <div
                      className="absolute inset-0 pointer-events-none rounded-xl z-10"
                      style={{
                        backgroundSize: `${100 / (canvasSize.gridW || currentGridWidth)}% ${100 / (canvasSize.gridH || currentGridHeight)}%`,
                        backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.22) 1px, transparent 1px)`
                      }}
                    />
                  )}

                  {/* AI Auto-Detected Walls & Doors Overlay */}
                  {showDetectedWalls && detectedWalls.length > 0 && (
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none rounded-xl z-15"
                      viewBox={`0 0 ${canvasSize.width || 1920} ${canvasSize.height || 1280}`}
                      preserveAspectRatio="none"
                    >
                      {detectedWalls.map((wall) => {
                        const isDoor = wall.wallType === 'door';
                        const midX = (wall.p1.x + wall.p2.x) / 2;
                        const midY = (wall.p1.y + wall.p2.y) / 2;
                        return (
                          <g key={wall.id}>
                            <line
                              x1={wall.p1.x}
                              y1={wall.p1.y}
                              x2={wall.p2.x}
                              y2={wall.p2.y}
                              stroke={isDoor ? '#38bdf8' : '#f59e0b'}
                              strokeWidth={isDoor ? 8 : 5}
                              strokeDasharray={isDoor ? '10 6' : undefined}
                              strokeLinecap="round"
                              opacity={0.95}
                            />
                            {/* Endpoint vertex nodes */}
                            <circle cx={wall.p1.x} cy={wall.p1.y} r={isDoor ? 5 : 4} fill={isDoor ? '#38bdf8' : '#f59e0b'} />
                            <circle cx={wall.p2.x} cy={wall.p2.y} r={isDoor ? 5 : 4} fill={isDoor ? '#38bdf8' : '#f59e0b'} />
                            {/* Distinct Door Badge on Doorways */}
                            {isDoor && (
                              <g transform={`translate(${midX}, ${midY})`}>
                                <rect x="-12" y="-8" width="24" height="16" rx="4" fill="#0284c7" stroke="#bae6fd" strokeWidth="2" />
                                <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="monospace">
                                  DOOR
                                </text>
                              </g>
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  )}

                  {/* Dynamic Lighting FX Overlay */}
                  {showLighting && (
                    <>
                      <div className="absolute inset-0 pointer-events-none mix-blend-multiply bg-black/75 rounded-xl"></div>
                      <div className="absolute inset-0 pointer-events-none rounded-xl z-10">
                        {lights.map((l, i) => {
                          const color =
                            l.type === 'magical'
                              ? 'rgba(99, 220, 255, 0.9)'
                              : 'rgba(255, 180, 70, 0.9)';
                          const gradient = `radial-gradient(circle at ${l.x}% ${l.y}%, ${color} 0%, rgba(0,0,0,0) ${l.radius}%)`;
                          return (
                            <div
                              key={i}
                              className={`absolute inset-0 mix-blend-color-dodge rounded-xl transition-all duration-300 ${
                                l.type === 'torch' ? 'animate-pulse' : ''
                              }`}
                              style={{ backgroundImage: gradient }}
                            />
                          );
                        })}
                      </div>
                    </>
                  )}

                  {showLighting && placingLightType && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-zinc-950/90 border border-zinc-700 text-[10px] text-amber-400 px-4 py-1.5 rounded-full shadow-2xl backdrop-blur-md pointer-events-none uppercase tracking-wider font-bold z-30">
                      Click anywhere on map to position {placingLightType} light
                    </div>
                  )}

                  {placingAnimatedType && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-zinc-950/95 border border-cyan-500/80 text-xs text-cyan-300 px-4 py-1.5 rounded-full shadow-2xl backdrop-blur-md uppercase tracking-wider font-bold z-30 flex items-center gap-2">
                      <span>Click map to place animated {placingAnimatedType}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlacingAnimatedType(null);
                        }}
                        className="w-4 h-4 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center ml-1"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-zinc-500 gap-4 max-w-md text-center bg-zinc-900/70 border border-zinc-800 rounded-2xl p-8 backdrop-blur-md shadow-2xl">
                  <div className="w-16 h-16 rounded-2xl border border-zinc-800 flex items-center justify-center bg-zinc-950 shadow-inner">
                    <MapIcon className="w-8 h-8 text-amber-500/60" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-widest mb-1.5">
                      Ready to Render
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Select your biome, atmosphere parameters, and click <strong>Generate Cinematic Map</strong> to synthesize unique high-detail battlemaps with full DM briefings.
                    </p>
                    {!hasApiKey && onOpenApiKeyModal && (
                      <button
                        type="button"
                        onClick={onOpenApiKeyModal}
                        className="mt-3.5 mx-auto px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-950 flex items-center gap-2"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>Load Gemini API Key</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* In-Depth Cinematic Component / Dossier View */
            <div className="w-full max-w-4xl h-full overflow-y-auto space-y-6 py-2 pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
              {briefing ? (
                <>
                  {/* Title & Metadata Card */}
                  <div className="p-6 bg-zinc-900/80 border border-zinc-800 rounded-2xl backdrop-blur-md relative overflow-hidden shadow-xl">
                    <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                        {biome}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-[10px] font-mono text-zinc-400 uppercase">
                        {timeOfDay}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-[10px] font-mono text-zinc-400 uppercase">
                        {weather}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-[10px] font-mono text-zinc-500 uppercase ml-auto">
                        SEED: #{seed}
                      </span>
                    </div>

                    <h2 className="text-2xl font-extrabold text-white tracking-tight leading-snug">
                      {briefing.title}
                    </h2>
                  </div>

                  {/* Read-Aloud Narration with Audio Player */}
                  <div className="p-6 bg-zinc-900/90 border border-amber-500/30 rounded-2xl backdrop-blur-md relative shadow-2xl">
                    <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
                      <div className="flex items-center gap-2.5">
                        <BookOpen className="w-4 h-4 text-amber-400" />
                        <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                          Dungeon Master Read-Aloud
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={copyReadAloud}
                          className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold rounded-lg transition-colors uppercase tracking-wider"
                        >
                          {copiedReadAloud ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Text</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={playNarration}
                          disabled={isLoadingAudio}
                          className="flex items-center gap-1.5 px-3.5 py-1 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-800 text-white text-[10px] font-bold rounded-lg transition-all uppercase tracking-wider shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                        >
                          {isLoadingAudio ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Synthesizing Voice...</span>
                            </>
                          ) : isPlayingAudio ? (
                            <>
                              <Pause className="w-3.5 h-3.5" />
                              <span>Pause Narration</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5" />
                              <span>Play Cinematic Audio</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="text-sm sm:text-base text-zinc-200 leading-relaxed font-serif italic selection:bg-amber-500/30">
                      "{briefing.readAloud}"
                    </p>
                  </div>

                  {/* Sensory Atmosphere Matrix */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-xl">
                      <div className="flex items-center gap-2 mb-1.5 text-zinc-400">
                        <Volume2 className="w-4 h-4 text-sky-400" />
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">Ambient Sounds</h4>
                      </div>
                      <p className="text-xs text-zinc-400 leading-normal">{briefing.atmosphere.sounds}</p>
                    </div>

                    <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-xl">
                      <div className="flex items-center gap-2 mb-1.5 text-zinc-400">
                        <Droplets className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">Scents & Odors</h4>
                      </div>
                      <p className="text-xs text-zinc-400 leading-normal">{briefing.atmosphere.smells}</p>
                    </div>

                    <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-xl">
                      <div className="flex items-center gap-2 mb-1.5 text-zinc-400">
                        <Sun className="w-4 h-4 text-amber-400" />
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">Temperature</h4>
                      </div>
                      <p className="text-xs text-zinc-400 leading-normal">{briefing.atmosphere.temperature}</p>
                    </div>

                    <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-xl">
                      <div className="flex items-center gap-2 mb-1.5 text-zinc-400">
                        <SunMoon className="w-4 h-4 text-indigo-400" />
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">Lighting & Shadows</h4>
                      </div>
                      <p className="text-xs text-zinc-400 leading-normal">{briefing.atmosphere.lighting}</p>
                    </div>
                  </div>

                  {/* Tactical Points of Interest & Environmental Hazards */}
                  {briefing.tacticalHazards && briefing.tacticalHazards.length > 0 && (
                    <div className="p-6 bg-zinc-900/70 border border-zinc-800 rounded-2xl">
                      <div className="flex items-center gap-2 mb-4">
                        <ShieldAlert className="w-4 h-4 text-amber-400" />
                        <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                          Tactical Features & Hazards
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {briefing.tacticalHazards.map((hz, i) => (
                          <div key={i} className="p-3.5 bg-zinc-950/60 border border-zinc-800 rounded-xl flex flex-col justify-between">
                            <div>
                              <h5 className="text-xs font-bold text-amber-400 mb-1">{hz.name}</h5>
                              <p className="text-[11px] text-zinc-400 leading-relaxed mb-2">{hz.description}</p>
                            </div>
                            <span className="inline-block px-2 py-1 bg-zinc-900 border border-zinc-700/60 rounded text-[10px] font-mono text-zinc-300 self-start">
                              {hz.check}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-zinc-500 gap-4 max-w-md mx-auto my-24 text-center bg-zinc-900/70 border border-zinc-800 rounded-2xl p-8 backdrop-blur-md shadow-2xl">
                  <BookOpen className="w-8 h-8 text-indigo-400/60" />
                  <div>
                    <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-widest mb-1.5">
                      No Dossier Generated
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Generate a map to produce full cinematic read-aloud text, sensory profiles, and tactical environmental mechanics.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Status Bar */}
        <footer className="h-8 border-t border-zinc-800/80 bg-zinc-950/95 px-4 flex flex-shrink-0 items-center justify-between text-[9px] font-mono text-zinc-500 z-30">
          <div className="flex items-center gap-4">
            <span>RES: {imageUrl ? '1600x900 (TACTICAL)' : 'IDLE'}</span>
            <span className="text-zinc-800">|</span>
            <span>GRID: {showGrid ? '5FT ACTIVE' : 'DISABLED'}</span>
            <span className="text-zinc-800">|</span>
            <span>LIGHTS: {lights.length} EMITTERS</span>
            <span className="text-zinc-800">|</span>
            <span>BIOME: {biome.toUpperCase()}</span>
            <span className="text-zinc-800">|</span>
            <span>SEED: #{seed}</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                isGenerating
                  ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.9)] animate-pulse'
                  : 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]'
              }`}
            ></div>
            <span className="text-white uppercase font-bold tracking-wider">
              {isGenerating ? 'Rendering Engine Busy' : 'Engine Ready'}
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}
