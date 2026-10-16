import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Stage, Layer, Image as KonvaImage, Text, Group, Circle, Rect, Arc, Line } from 'react-konva';
import useImage from 'use-image';
import 'gifler';
import { io, Socket } from 'socket.io-client';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Tv,
  Shield,
  Users,
  User,
  Radio,
  Loader2,
  Volume2,
  VolumeX,
  Swords,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Move,
  Sparkles,
  Trash2,
  BookOpen,
  Eye,
  EyeOff,
  Flame,
  Snowflake,
  Zap,
  Wind,
  Heart,
  Sun,
  Moon,
  Cloud,
  Droplets,
  Disc,
  Pin,
  GripHorizontal,
  Sliders,
  Plus,
  Search,
  Layers,
  Copy,
  Wand2,
  Target,
  Info
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { DynamicLightingLayer } from './DynamicLightingLayer';
import { GridLayer } from './GridLayer';
import { AnimatedFeaturesKonvaImage, AnimatedFeature, WeatherEffectType } from './AnimatedMapOverlay';
import { ProceduralSpellEffect } from './ProceduralSpellEffect';
import { WallSegment, VisionConfig, RoomAnnotation, Combatant, isMonsterToken } from '../types';
import homeBackgroundImage from '../assets/images/home_background.jpg';
import sceneBackdropImage from '../assets/images/scene_backdrop.jpg';
import { base64AudioToBlob, getNarrationVoice } from '../services/audioNarrationService';
import {
  DEFAULT_CHARACTERS,
  resolveTokenCharacterStats,
  getCharacterTokenUrl,
  CHARACTER_TOKEN_IMAGES,
  isDdbMatch
} from '../data/defaultCharacters';
import { Character } from '../types/character';
import {
  computeVisibilityPolygon,
  isPointInPolygon,
  distanceBetween,
  segmentsIntersect,
  isWallOccluding,
  VisionSource,
  VisibilityPolygon
} from '../lib/visionEngine';

interface Token {
  id: string;
  name: string;
  url: string;
  avatarUrl?: string;
  x: number;
  y: number;
  size: number;
  hp?: number;
  maxHp?: number;
  currentHp?: number;
  tempHp?: number;
  ac?: number;
  ddbCharacterId?: number | string;
  characterId?: string;
  isPlayer?: boolean;
  isMonster?: boolean;
  visionRadius?: number;
  visionAngle?: number;
  visionDirection?: number;
  visionEnabled?: boolean;
  visionColor?: string;
  hidden?: boolean;
  conditions?: string[];
  category?: 'character' | 'monster' | 'ally' | 'custom';
}

/**
 * Normalizes a token ensuring both url and avatarUrl are authoritative image strings.
 */
function normalizeToken(t: any): Token {
  const direct = t.url || t.avatarUrl;
  const resolved = (direct && typeof direct === 'string' && direct.trim() !== '')
    ? direct
    : getCharacterTokenUrl(t.name || '', direct);
  return {
    ...t,
    url: resolved,
    avatarUrl: resolved
  };
}

interface SpellEffect {
  id: string;
  type: 'circle' | 'cone' | 'line';
  x: number;
  y: number;
  size: number;
  rotation: number;
  color: string;
  label: string;
  createdAt?: number;
  isPersistent?: boolean;
  imageUrl?: string;
  blendMode?: string;
  opacity?: number;
  placedById?: string;
  placedByName?: string;
}

export interface PlayerSpellDefinition {
  id: string;
  name: string;
  label: string;
  category: 'instant' | 'persistent' | 'tactical';
  type: 'circle' | 'cone' | 'line';
  defaultSizeFt: number; // in feet (5, 10, 15, 20, 30, 60, 100)
  color: string;
  isPersistent: boolean;
  defaultOpacity?: number;
  description: string;
  iconName: 'flame' | 'zap' | 'sun' | 'snowflake' | 'moon' | 'cloud' | 'droplets' | 'wind' | 'shield' | 'sparkles';
  badgeColor: string;
}

export const PLAYER_EFFECTS_CATALOG: PlayerSpellDefinition[] = [
  // --- Instant Evocation & Attack Spells ---
  {
    id: 'fireball',
    name: 'Fireball',
    label: 'Fireball',
    category: 'instant',
    type: 'circle',
    defaultSizeFt: 20,
    color: 'rgba(239, 68, 68, 0.45)',
    isPersistent: false,
    description: '20ft radius explosive bloom of roaring flame.',
    iconName: 'flame',
    badgeColor: 'text-red-400 bg-red-950/60 border-red-800/60'
  },
  {
    id: 'eldritch_blast',
    name: 'Eldritch Blast',
    label: 'Eldritch Blast',
    category: 'instant',
    type: 'circle',
    defaultSizeFt: 5,
    color: 'rgba(147, 51, 234, 0.5)',
    isPersistent: false,
    description: 'Crackling beam of eldritch force and cosmic void.',
    iconName: 'zap',
    badgeColor: 'text-purple-400 bg-purple-950/60 border-purple-800/60'
  },
  {
    id: 'divine_smite',
    name: 'Divine Smite',
    label: 'Divine Smite',
    category: 'instant',
    type: 'circle',
    defaultSizeFt: 10,
    color: 'rgba(251, 191, 36, 0.5)',
    isPersistent: false,
    description: 'Radiant holy power bursting with solar brilliance.',
    iconName: 'sun',
    badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-800/60'
  },
  {
    id: 'cone_of_cold',
    name: 'Cone of Cold',
    label: 'Cone of Cold',
    category: 'instant',
    type: 'cone',
    defaultSizeFt: 60,
    color: 'rgba(59, 130, 246, 0.45)',
    isPersistent: false,
    description: '60ft cone of freezing arctic blast and crystalline rime.',
    iconName: 'snowflake',
    badgeColor: 'text-sky-400 bg-sky-950/60 border-sky-800/60'
  },
  {
    id: 'lightning_bolt',
    name: 'Lightning Bolt',
    label: 'Lightning Bolt',
    category: 'instant',
    type: 'line',
    defaultSizeFt: 100,
    color: 'rgba(234, 179, 8, 0.5)',
    isPersistent: false,
    description: '100ft stroke of lightning blasting in a straight line.',
    iconName: 'zap',
    badgeColor: 'text-yellow-400 bg-yellow-950/60 border-yellow-800/60'
  },
  {
    id: 'fire_bolt',
    name: 'Fire Bolt',
    label: 'Fire Bolt',
    category: 'instant',
    type: 'circle',
    defaultSizeFt: 5,
    color: 'rgba(239, 68, 68, 0.5)',
    isPersistent: false,
    description: 'Single fiery projectile hurled at a target.',
    iconName: 'flame',
    badgeColor: 'text-red-400 bg-red-950/60 border-red-800/60'
  },
  {
    id: 'burning_hands',
    name: 'Burning Hands / Breath',
    label: 'Burning Hands',
    category: 'instant',
    type: 'cone',
    defaultSizeFt: 15,
    color: 'rgba(249, 115, 22, 0.45)',
    isPersistent: false,
    description: '15ft sheet of roaring flames from your fingertips.',
    iconName: 'flame',
    badgeColor: 'text-orange-400 bg-orange-950/60 border-orange-800/60'
  },
  {
    id: 'shocking_grasp',
    name: 'Shocking Grasp',
    label: 'Shocking Grasp',
    category: 'instant',
    type: 'circle',
    defaultSizeFt: 10,
    color: 'rgba(59, 130, 246, 0.5)',
    isPersistent: false,
    description: 'Lightning sparks jumping across the target creature.',
    iconName: 'zap',
    badgeColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-800/60'
  },
  {
    id: 'destructive_wave',
    name: 'Destructive Wave',
    label: 'Destructive Wave',
    category: 'instant',
    type: 'circle',
    defaultSizeFt: 30,
    color: 'rgba(239, 68, 68, 0.45)',
    isPersistent: false,
    description: '30ft concussive shockwave of divine thunder and force.',
    iconName: 'wind',
    badgeColor: 'text-rose-400 bg-rose-950/60 border-rose-800/60'
  },
  {
    id: 'shadow_grasp',
    name: 'Shadow Grasp',
    label: 'Shadow Grasp',
    category: 'instant',
    type: 'circle',
    defaultSizeFt: 10,
    color: 'rgba(99, 102, 241, 0.5)',
    isPersistent: false,
    description: 'Tentacles of dark Netherese energy grasping nearby foes.',
    iconName: 'moon',
    badgeColor: 'text-indigo-400 bg-indigo-950/60 border-indigo-800/60'
  },

  // --- Persistent AoE & Hazards ---
  {
    id: 'spirit_guardians',
    name: 'Spirit Guardians',
    label: 'Spirit Guardians',
    category: 'persistent',
    type: 'circle',
    defaultSizeFt: 15,
    color: 'rgba(255, 215, 0, 0.4)',
    isPersistent: true,
    defaultOpacity: 0.85,
    description: '15ft celestial sanctuary with orbiting seraphs and glyphs.',
    iconName: 'sun',
    badgeColor: 'text-amber-300 bg-amber-950/60 border-amber-700/60'
  },
  {
    id: 'darkness',
    name: 'Darkness',
    label: 'Darkness',
    category: 'persistent',
    type: 'circle',
    defaultSizeFt: 15,
    color: 'rgba(0, 0, 0, 0.75)',
    isPersistent: true,
    defaultOpacity: 0.9,
    description: '15ft sphere of impenetrable magical darkness.',
    iconName: 'moon',
    badgeColor: 'text-zinc-300 bg-zinc-900 border-zinc-700'
  },
  {
    id: 'fog_cloud',
    name: 'Fog Cloud',
    label: 'Fog Cloud',
    category: 'persistent',
    type: 'circle',
    defaultSizeFt: 20,
    color: 'rgba(200, 200, 200, 0.45)',
    isPersistent: true,
    defaultOpacity: 0.8,
    description: '20ft radius swirling fog bank obscuring all vision.',
    iconName: 'cloud',
    badgeColor: 'text-slate-300 bg-slate-900/70 border-slate-700'
  },
  {
    id: 'poison_cloud',
    name: 'Poison Cloud / Cloudkill',
    label: 'Poison Cloud',
    category: 'persistent',
    type: 'circle',
    defaultSizeFt: 20,
    color: 'rgba(34, 197, 94, 0.45)',
    isPersistent: true,
    defaultOpacity: 0.8,
    description: '20ft billowing toxic noxious vapors.',
    iconName: 'droplets',
    badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60'
  },
  {
    id: 'acid_pool',
    name: 'Acid Pool',
    label: 'Acid Pool',
    category: 'persistent',
    type: 'circle',
    defaultSizeFt: 15,
    color: 'rgba(132, 204, 22, 0.45)',
    isPersistent: true,
    defaultOpacity: 0.85,
    description: 'Caustic bubbling pool of glowing acid vitriol.',
    iconName: 'droplets',
    badgeColor: 'text-lime-400 bg-lime-950/60 border-lime-800/60'
  },
  {
    id: 'hypnotic_pattern',
    name: 'Hypnotic Pattern',
    label: 'Hypnotic Pattern',
    category: 'persistent',
    type: 'circle',
    defaultSizeFt: 30,
    color: 'rgba(255, 0, 255, 0.4)',
    isPersistent: true,
    defaultOpacity: 0.8,
    description: '30ft swirling vortex of iridescent colors that incapacitates.',
    iconName: 'sparkles',
    badgeColor: 'text-fuchsia-400 bg-fuchsia-950/60 border-fuchsia-800/60'
  },
  {
    id: 'beacon_of_hope',
    name: 'Beacon of Hope',
    label: 'Beacon of Hope',
    category: 'persistent',
    type: 'circle',
    defaultSizeFt: 30,
    color: 'rgba(255, 255, 255, 0.4)',
    isPersistent: true,
    defaultOpacity: 0.85,
    description: '30ft radiant holy bastion inspiring hope and vitality.',
    iconName: 'sun',
    badgeColor: 'text-yellow-200 bg-yellow-950/60 border-yellow-700/60'
  },
  {
    id: 'sunbeam',
    name: 'Sunbeam',
    label: 'Sunbeam',
    category: 'persistent',
    type: 'line',
    defaultSizeFt: 60,
    color: 'rgba(255, 255, 100, 0.4)',
    isPersistent: true,
    defaultOpacity: 0.85,
    description: '60ft searing beam of brilliant solar radiance.',
    iconName: 'sun',
    badgeColor: 'text-amber-200 bg-amber-950/60 border-amber-700/60'
  },

  // --- Tactical & Light FX ---
  {
    id: 'torch_light',
    name: 'Torch Light',
    label: 'Torch Light',
    category: 'tactical',
    type: 'circle',
    defaultSizeFt: 20,
    color: 'rgba(251, 146, 60, 0.35)',
    isPersistent: true,
    defaultOpacity: 0.75,
    description: '20ft bright warm flickering torchlight.',
    iconName: 'flame',
    badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-800/60'
  },
  {
    id: 'daylight',
    name: 'Daylight',
    label: 'Daylight',
    category: 'tactical',
    type: 'circle',
    defaultSizeFt: 60,
    color: 'rgba(254, 240, 138, 0.35)',
    isPersistent: true,
    defaultOpacity: 0.75,
    description: '60ft dazzling sphere of radiant daylight.',
    iconName: 'sun',
    badgeColor: 'text-yellow-300 bg-yellow-950/60 border-yellow-800/60'
  },
  {
    id: 'faerie_fire',
    name: 'Faerie Fire',
    label: 'Faerie Fire',
    category: 'tactical',
    type: 'circle',
    defaultSizeFt: 20,
    color: 'rgba(168, 85, 247, 0.4)',
    isPersistent: true,
    defaultOpacity: 0.8,
    description: '20ft violet shimmer outlining targets in mystical light.',
    iconName: 'sparkles',
    badgeColor: 'text-purple-400 bg-purple-950/60 border-purple-800/60'
  },
  {
    id: 'paladin_aura',
    name: 'Paladin Aura',
    label: 'Paladin Aura',
    category: 'tactical',
    type: 'circle',
    defaultSizeFt: 10,
    color: 'rgba(253, 224, 71, 0.35)',
    isPersistent: true,
    defaultOpacity: 0.75,
    description: '10ft protective aura of divine courage and warding.',
    iconName: 'shield',
    badgeColor: 'text-yellow-400 bg-yellow-950/60 border-yellow-800/60'
  }
];

export const renderSpellIcon = (iconName: string, className: string = "w-4 h-4") => {
  switch (iconName) {
    case 'flame': return <Flame className={className} />;
    case 'zap': return <Zap className={className} />;
    case 'sun': return <Sun className={className} />;
    case 'snowflake': return <Snowflake className={className} />;
    case 'moon': return <Moon className={className} />;
    case 'cloud': return <Cloud className={className} />;
    case 'droplets': return <Droplets className={className} />;
    case 'wind': return <Wind className={className} />;
    case 'shield': return <Shield className={className} />;
    case 'sparkles':
    default:
      return <Sparkles className={className} />;
  }
};

interface SyncState {
  reveals?: { x: number; y: number; radius: number }[];
  polygonReveals?: number[][];
  isFogVisible?: boolean;
  gridVisible?: boolean;
  gridOpacity?: number;
  gridSize?: number;
  gridOffsetX?: number;
  gridOffsetY?: number;
  tokens?: Token[];
  walls?: WallSegment[];
  visionConfig?: VisionConfig;
  roomAnnotations?: RoomAnnotation[];
  mapRotation?: number;
  imageFile?: string | null;
  effects?: SpellEffect[];
  boardAnimatedFeatures?: AnimatedFeature[];
  boardAnimatedEnabled?: boolean;
  boardWeatherEffect?: WeatherEffectType;
  characters?: Character[];
  combatants?: Combatant[];
  combatRound?: number;
  combatTurnIndex?: number;
  showCombatTracker?: boolean;
  activeSceneInfo?: {
    campaignId?: string;
    chapterId?: string;
    sceneId?: string;
    sceneTitle?: string;
    mapWidth?: number;
    mapHeight?: number;
    mapUrl?: string;
  } | null;
}

interface CombatState {
  combatants: Combatant[];
  round: number;
  turnIndex: number;
  showCombatTracker: boolean;
}

interface BroadcastRoomText {
  title?: string;
  boxedText?: string;
  text?: string;
  description?: string;
  timestamp?: number;
  audioBase64?: string;
  voiceName?: string;
  voiceId?: string;
}

const getImageTransform = (width: number, height: number, rotation: number) => {
  switch (rotation % 360) {
    case 90: return { x: height, y: 0, rotation: 90 };
    case 180: return { x: width, y: height, rotation: 180 };
    case 270: return { x: 0, y: width, rotation: 270 };
    default: return { x: 0, y: 0, rotation: 0 };
  }
};

const DND_CONDITIONS = [
  'Blinded',
  'Charmed',
  'Deafened',
  'Exhaustion',
  'Frightened',
  'Grappled',
  'Incapacitated',
  'Invisible',
  'Paralyzed',
  'Petrified',
  'Poisoned',
  'Prone',
  'Restrained',
  'Stunned',
  'Unconscious',
  'Bloodied'
];

/**
 * Animated GIF Image Component for Konva Canvas
 */
const GifImage = ({ src, ...props }: any) => {
  const imageRef = useRef<any>(null);
  const [image, setImage] = useState<HTMLImageElement | HTMLCanvasElement | null>(null);
  const canvas = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(props.width || 64));
    c.height = Math.max(1, Math.round(props.height || 64));
    return c;
  }, []);
  const animatorRef = useRef<any>(null);

  useEffect(() => {
    if (!src) return;

    const giflerFn = (window as any).gifler;
    let objectUrl: string | null = null;
    let isMounted = true;

    const fallbackToStatic = () => {
      if (!isMounted) return;
      const img = new Image();
      img.onload = () => {
        if (isMounted && img.naturalWidth > 0 && img.naturalHeight > 0) {
          setImage(img);
        }
      };
      img.onerror = () => {
        if (isMounted) console.warn(`Failed to load GIF image fallback: ${src}`);
      };
      img.src = src;
    };

    if (giflerFn) {
      fetch(src, { mode: 'cors' })
        .then(response => {
          if (!response.ok) throw new Error('Network response was not ok');
          return response.arrayBuffer();
        })
        .then(buffer => {
          if (!isMounted) return;
          const header = new Uint8Array(buffer.slice(0, 6));
          const headerStr = String.fromCharCode(...header);

          if (headerStr === 'GIF87a' || headerStr === 'GIF89a') {
            const blob = new Blob([buffer], { type: 'image/gif' });
            objectUrl = URL.createObjectURL(blob);
            giflerFn(objectUrl).get((animator: any) => {
              if (!isMounted) return;
              animatorRef.current = animator;

              const targetW = Math.max(1, animator.width || props.width || 64);
              const targetH = Math.max(1, animator.height || props.height || 64);
              canvas.width = targetW;
              canvas.height = targetH;

              animator.onDrawFrame = (ctx: CanvasRenderingContext2D, frame: any) => {
                if (
                  frame &&
                  frame.buffer &&
                  frame.buffer.width > 0 &&
                  frame.buffer.height > 0 &&
                  ctx.canvas &&
                  ctx.canvas.width > 0 &&
                  ctx.canvas.height > 0
                ) {
                  try {
                    ctx.drawImage(frame.buffer, frame.x || 0, frame.y || 0);
                  } catch (e) {
                    // Ignore 0-dimension frame draw attempt
                  }
                }
              };

              animator.animateInCanvas(canvas, false);
              animator.onDraw = () => {
                if (imageRef.current && isMounted) {
                  const layer = imageRef.current.getLayer();
                  if (layer) layer.batchDraw();
                }
              };

              if (canvas.width > 0 && canvas.height > 0) {
                setImage(canvas);
              }
            });
          } else {
            fallbackToStatic();
          }
        })
        .catch(() => {
          fallbackToStatic();
        });
    } else {
      fallbackToStatic();
    }

    return () => {
      isMounted = false;
      if (animatorRef.current) {
        try {
          animatorRef.current.stop();
        } catch (e) {}
        animatorRef.current = null;
      }
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src, canvas, props.width, props.height]);

  if (!image) return null;
  const imgW = (image as any).width || (image as any).naturalWidth;
  const imgH = (image as any).height || (image as any).naturalHeight;
  if (!imgW || !imgH || imgW <= 0 || imgH <= 0) return null;
  if (props.width !== undefined && props.width <= 0) return null;
  if (props.height !== undefined && props.height <= 0) return null;

  return <KonvaImage ref={imageRef} image={image} {...props} />;
};

/**
 * Player Token Component
 * Circular Avatar Image with real-time mirroring to DM View!
 */
const PlayerToken = React.memo(({
  token,
  gridSize,
  isClaimed,
  characters,
  onMoveToken,
  onDragMoveToken,
  onDragStartToken,
  onClaimToken,
  onContextMenu
}: {
  token: Token;
  gridSize: number;
  isClaimed: boolean;
  characters?: Character[];
  onMoveToken: (id: string, x: number, y: number) => void;
  onDragMoveToken?: (id: string, x: number, y: number) => void;
  onDragStartToken?: (id: string) => void;
  onClaimToken?: (id: string) => void;
  onContextMenu?: (id: string, clientX: number, clientY: number) => void;
}) => {
  // Directly tie AC and HP to character sheet
  const stats = useMemo(() => {
    return resolveTokenCharacterStats(token, characters || DEFAULT_CHARACTERS);
  }, [token, characters]);

  // Robust URL resolution: checks token.url, token.avatarUrl, compendium character match, and getCharacterTokenUrl fallback
  const resolvedUrl = useMemo(() => {
    const direct = token.url || token.avatarUrl;
    if (direct && typeof direct === 'string' && direct.trim() !== '') {
      return direct;
    }
    const allChars = characters && characters.length > 0 ? characters : DEFAULT_CHARACTERS;
    const matchingChar = allChars.find(c =>
      c.id === token.id ||
      (c.name && token.name && c.name.toLowerCase().trim() === token.name.toLowerCase().trim()) ||
      (c.name && token.name && (c.name.toLowerCase().includes(token.name.toLowerCase().trim()) || token.name.toLowerCase().includes(c.name.toLowerCase().trim())))
    );
    if (matchingChar?.avatarUrl && typeof matchingChar.avatarUrl === 'string' && matchingChar.avatarUrl.trim() !== '') {
      return matchingChar.avatarUrl;
    }
    return getCharacterTokenUrl(token.name || '', direct);
  }, [token.url, token.avatarUrl, token.name, token.id, characters]);

  const isGif = Boolean(resolvedUrl && resolvedUrl.toLowerCase().endsWith('.gif'));
  // Dual-strategy image loading: try anonymous CORS first; if server rejects CORS, fallback without CORS
  const [imgWithCors, corsStatus] = useImage(!isGif && resolvedUrl ? resolvedUrl : '', 'anonymous');
  const [imgNoCors] = useImage(!isGif && corsStatus === 'failed' && resolvedUrl ? resolvedUrl : '');
  const img = imgWithCors || imgNoCors;

  const tokenPx = gridSize * (token.size || 1);
  const radius = tokenPx / 2;
  const lastEmitTimeRef = useRef<number>(0);

  const handleDragStart = () => {
    if (onDragStartToken) {
      onDragStartToken(token.id);
    }
  };

  const handleDragMove = (e: any) => {
    const now = Date.now();
    if (now - lastEmitTimeRef.current > 30) {
      lastEmitTimeRef.current = now;
      const rawX = e.target.x();
      const rawY = e.target.y();
      if (onDragMoveToken) {
        onDragMoveToken(token.id, rawX, rawY);
      }
    }
  };

  const handleDragEnd = (e: any) => {
    const rawX = e.target.x();
    const rawY = e.target.y();
    // Snap to grid
    const snappedX = Math.round(rawX / gridSize) * gridSize;
    const snappedY = Math.round(rawY / gridSize) * gridSize;
    e.target.position({ x: snappedX, y: snappedY });
    onMoveToken(token.id, snappedX, snappedY);
  };

  const hpRatio = Math.max(0, Math.min(1, stats.currentHp / stats.maxHp));
  const hpColor = hpRatio > 0.5 ? '#10b981' : hpRatio > 0.25 ? '#f59e0b' : '#ef4444';
  const pillWidth = Math.max(68, Math.min(108, tokenPx * 0.94));
  const pillHeight = 22;
  const pillX = (tokenPx - pillWidth) / 2;
  const pillY = tokenPx - 9;

  return (
    <Group
      x={token.x}
      y={token.y}
      draggable={true}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onClick={() => {
        if (onClaimToken) {
          onClaimToken(token.id);
        }
      }}
      onTap={() => {
        if (onClaimToken) {
          onClaimToken(token.id);
        }
      }}
      onContextMenu={(e: any) => {
        e.evt.preventDefault();
        e.cancelBubble = true;
        if (onContextMenu) {
          onContextMenu(token.id, e.evt.clientX, e.evt.clientY);
        }
      }}
    >
      {/* Halo highlight for claimed token */}
      {isClaimed && (
        <>
          <Circle
            x={radius}
            y={radius}
            radius={radius + 6}
            stroke="#10b981"
            strokeWidth={3}
            dash={[6, 4]}
            shadowColor="#10b981"
            shadowBlur={12}
            listening={false}
          />
          <Rect
            x={radius - 20}
            y={-18}
            width={40}
            height={16}
            fill="#065f46"
            cornerRadius={4}
            stroke="#10b981"
            strokeWidth={1}
            listening={false}
          />
          <Text
            x={radius - 20}
            y={-16}
            width={40}
            align="center"
            text="YOU"
            fill="#6ee7b7"
            fontSize={10}
            fontStyle="bold"
            listening={false}
          />
        </>
      )}

      {/* 1. Circular Avatar Clip */}
      <Group
        clipFunc={(ctx) => {
          ctx.arc(radius, radius, radius, 0, Math.PI * 2, false);
        }}
      >
        {isGif && resolvedUrl ? (
          <GifImage
            src={resolvedUrl}
            width={tokenPx}
            height={tokenPx}
          />
        ) : img && img.width > 0 && img.height > 0 ? (
          <KonvaImage
            image={img}
            width={tokenPx}
            height={tokenPx}
          />
        ) : (
          <>
            <Rect
              width={tokenPx}
              height={tokenPx}
              fill={token.isPlayer ? '#1e3a8a' : '#7f1d1d'}
            />
            <Circle
              x={radius}
              y={radius}
              radius={radius * 0.72}
              fill={token.isPlayer ? '#1d4ed8' : '#991b1b'}
            />
            <Text
              x={0}
              y={radius - Math.round(tokenPx * 0.22)}
              width={tokenPx}
              align="center"
              text={(token.name || 'P').charAt(0).toUpperCase()}
              fontSize={Math.round(tokenPx * 0.44)}
              fontStyle="bold"
              fontFamily="sans-serif"
              fill="white"
              shadowColor="black"
              shadowBlur={4}
            />
          </>
        )}
      </Group>

      {/* 2. Outer Circular Border Ring */}
      <Circle
        x={radius}
        y={radius}
        radius={radius}
        stroke={isClaimed ? '#10b981' : token.isPlayer ? '#38bdf8' : '#ef4444'}
        strokeWidth={isClaimed ? 3.5 : 2.5}
        shadowColor="black"
        shadowBlur={isClaimed ? 10 : 6}
        listening={false}
      />

      {/* 3. AC Shield Badge on Top-Left: REMOVED per user request */}

      {/* 4. Large, High-Contrast HP Pill Badge directly tied to D&D Beyond & Character Sheet */}
      <Group x={pillX} y={pillY} listening={false}>
        {/* Dark slate container badge with glow */}
        <Rect
          width={pillWidth}
          height={pillHeight}
          fill="rgba(15, 23, 42, 0.96)"
          stroke={hpRatio <= 0.25 ? "#ef4444" : "#475569"}
          strokeWidth={hpRatio <= 0.25 ? 1.5 : 1}
          cornerRadius={5}
          shadowColor="black"
          shadowBlur={6}
          shadowOpacity={0.8}
        />
        {/* Background HP Track */}
        <Rect
          x={3.5}
          y={14}
          width={pillWidth - 7}
          height={4.5}
          fill="rgba(30, 41, 59, 0.9)"
          cornerRadius={2.5}
        />
        {/* Filled HP progress bar */}
        {hpRatio > 0 && (
          <Rect
            x={3.5}
            y={14}
            width={Math.max(2, (pillWidth - 7) * hpRatio)}
            height={4.5}
            fill={hpColor}
            cornerRadius={2.5}
            shadowColor={hpColor}
            shadowBlur={hpRatio <= 0.25 ? 6 : 3}
          />
        )}
        {/* Crisp Monospace HP text */}
        <Text
          y={2.5}
          width={pillWidth}
          align="center"
          text={`${stats.currentHp}/${stats.maxHp}${stats.tempHp && stats.tempHp > 0 ? ` (+${stats.tempHp})` : ''}`}
          fontSize={10}
          fontStyle="bold"
          fontFamily="monospace"
          fill="#ffffff"
          shadowColor="black"
          shadowBlur={3}
        />
      </Group>

      {/* 5. Token Name Label & Conditions (Cleanly spaced below the larger HP badge) */}
      <Group y={tokenPx + 16} listening={false}>
        <Text
          text={token.name}
          width={tokenPx + 60}
          x={-30}
          align="center"
          fill="white"
          fontSize={11.5}
          fontStyle="bold"
          shadowColor="black"
          shadowBlur={4}
        />
        {token.conditions && token.conditions.length > 0 && (
          <Text
            text={token.conditions.join(', ')}
            fontSize={9.5}
            fontStyle="bold"
            fontFamily="monospace"
            fill="#f43f5e"
            align="center"
            width={tokenPx + 60}
            x={-30}
            y={16}
            shadowBlur={3}
            shadowColor="black"
          />
        )}
      </Group>
    </Group>
  );
});

export default function PlayerView() {
  const socketRef = useRef<Socket | null>(null);
  const bgLayerRef = useRef<any>(null);

  // Fullscreen viewport dimensions
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  });

  // Map Background State
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [image, imageStatus] = useImage(imageFile || '');
  const [mapRotation, setMapRotation] = useState(0);

  // Canvas Layers & Vision State
  const [tokens, setTokens] = useState<Token[]>([]);
  const [walls, setWalls] = useState<WallSegment[]>([]);
  const [reveals, setReveals] = useState<Array<{ x: number; y: number; radius: number }>>([]);
  const [polygonReveals, setPolygonReveals] = useState<number[][]>([]);
  const [isFogVisible, setIsFogVisible] = useState(true);
  const [effects, setEffects] = useState<SpellEffect[]>([]);
  const [boardAnimatedFeatures, setBoardAnimatedFeatures] = useState<AnimatedFeature[]>([]);
  const [boardAnimatedEnabled, setBoardAnimatedEnabled] = useState<boolean>(true);
  const [boardWeatherEffect, setBoardWeatherEffect] = useState<WeatherEffectType>('none');

  // Grid Settings
  const [gridVisible, setGridVisible] = useState(true);
  const [gridOpacity, setGridOpacity] = useState(0.3);
  const [gridSize, setGridSize] = useState(50);
  const [gridOffsetX, setGridOffsetX] = useState(0);
  const [gridOffsetY, setGridOffsetY] = useState(0);

  // Vision Config (doors, darkness, memory)
  const [visionConfig, setVisionConfig] = useState<VisionConfig>({
    enabled: true,
    explorationMemory: true,
    darknessOpacity: 1.0,
    dimVisionOpacity: 0.5,
    ambientLight: false,
    dmPreviewMode: false,
    showDoorBadges: false,
  });

  // Stage Pan & Zoom
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  // Connection & Active Scene
  const [isConnected, setIsConnected] = useState(false);
  const [activeSceneInfo, setActiveSceneInfo] = useState<{
    campaignId?: string;
    chapterId?: string;
    sceneId?: string;
    sceneTitle?: string;
    mapWidth?: number;
    mapHeight?: number;
    mapUrl?: string;
  } | null>(null);

  // Character Seizing / Claiming
  const [claimedTokenId, setClaimedTokenId] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('mistwalker_player_claimed_token') : null;
  });
  const [showClaimMenu, setShowClaimMenu] = useState(false);

  // Compendium Characters synced from DM
  const [compendiumCharacters, setCompendiumCharacters] = useState<Character[]>(DEFAULT_CHARACTERS);

  // Active drag state and claimedTokenId ref to prevent rubber-banding during local drag
  const activeDraggingTokenIdRef = useRef<string | null>(null);
  const claimedTokenIdRef = useRef<string | null>(claimedTokenId);
  useEffect(() => {
    claimedTokenIdRef.current = claimedTokenId;
  }, [claimedTokenId]);

  // Synchronous tokens reference to avoid stale state during socket emits
  const tokensRef = useRef<Token[]>(tokens);
  useEffect(() => {
    tokensRef.current = tokens;
  }, [tokens]);

  // Token Context Menu State (Right-Click Menu mirrored from DM View)
  const [activeTokenMenu, setActiveTokenMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [tokenMenuTab, setTokenMenuTab] = useState<'stats' | 'conditions'>('stats');

  // Combat State
  const [combatState, setCombatState] = useState<CombatState>({
    combatants: [],
    round: 1,
    turnIndex: 0,
    showCombatTracker: false
  });

  // Broadcast Room Description / Text
  const [roomBroadcast, setRoomBroadcast] = useState<BroadcastRoomText | null>(null);

  // Audio Player State
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const activeNarrationAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isAudioMuted && activeNarrationAudioRef.current) {
      activeNarrationAudioRef.current.pause();
      activeNarrationAudioRef.current = null;
    }
  }, [isAudioMuted]);

  // Minimize All Display Menus State (Cinematic / Fullscreen Map View)
  const [isUiMinimized, setIsUiMinimized] = useState(false);

  // Effects Tab and Interactive Placement State
  const [showEffectsPanel, setShowEffectsPanel] = useState(false);
  const [effectsTab, setEffectsTab] = useState<'instant' | 'persistent' | 'tactical' | 'active'>('instant');
  const [activePlayerTool, setActivePlayerTool] = useState<string | null>(null);
  const [equippedSpell, setEquippedSpell] = useState<PlayerSpellDefinition | null>(null);
  const [effectsSearchQuery, setEffectsSearchQuery] = useState('');
  const [pinnedEffectsPanel, setPinnedEffectsPanel] = useState(false);
  const [panelPos, setPanelPos] = useState({ x: 20, y: 72 });
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const panelDragStartRef = useRef({ mouseX: 0, mouseY: 0, posX: 20, posY: 72 });

  // Click-to-aim interactive placement state
  const [isAiming, setIsAiming] = useState(false);
  const [aimOrigin, setAimOrigin] = useState<{ x: number; y: number } | null>(null);
  const [aimCurrent, setAimCurrent] = useState<{ x: number; y: number } | null>(null);

  const stageRef = useRef<any>(null);
  const effectsRef = useRef<SpellEffect[]>(effects);
  useEffect(() => {
    effectsRef.current = effects;
  }, [effects]);

  // Window mousemove / mouseup listener for dragging effects panel smoothly
  useEffect(() => {
    if (!isDraggingPanel) return;
    const onMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - panelDragStartRef.current.mouseX;
      const dy = e.clientY - panelDragStartRef.current.mouseY;
      const newX = Math.max(10, Math.min(window.innerWidth - 340, panelDragStartRef.current.posX + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - 200, panelDragStartRef.current.posY + dy));
      setPanelPos({ x: newX, y: newY });
    };
    const onMouseUp = () => {
      setIsDraggingPanel(false);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDraggingPanel]);

  // Automatic 5-second lifetime expiration for non-persistent spells
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setEffects(prev => {
        const filtered = prev.filter(eff => {
          if (eff.createdAt && !eff.isPersistent) {
            return now - eff.createdAt < 5000;
          }
          return true;
        });
        return filtered.length === prev.length ? prev : filtered;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Determine if active map is a video
  const isVideo = useMemo(() => {
    if (!imageFile) return false;
    return /\.(mp4|webm|m4v|mov|ogv)$/i.test(imageFile);
  }, [imageFile]);

  // Video Element for Animated Video Battlemaps
  const videoElement = useMemo(() => {
    if (!isVideo || !imageFile) return null;
    const video = document.createElement('video');
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.src = imageFile;
    video.load();
    video.play().catch(e => console.warn('[PlayerView Video] Play notice:', e));
    return video;
  }, [imageFile, isVideo]);

  // Redraw video frames on Konva Stage
  useEffect(() => {
    if (!videoElement) return;
    let animId: number;
    const render = () => {
      if (bgLayerRef.current && !videoElement.paused && !videoElement.ended) {
        bgLayerRef.current.batchDraw();
      }
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [videoElement]);

  // ==========================================
  // Socket.io Pure Consumer Setup
  // ==========================================
  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[PlayerView] Connected to socket. Requesting initial state...');
      setIsConnected(true);
      socket.emit('REQUEST_INITIAL_STATE');
    });

    socket.on('disconnect', () => {
      console.log('[PlayerView] Disconnected from socket.');
      setIsConnected(false);
    });

    // 1. SYNC_IMAGE
    socket.on('SYNC_IMAGE', (url: string) => {
      if (url) {
        console.log('[PlayerView] SYNC_IMAGE received:', url.slice(0, 80));
        setImageFile(url);
      }
    });

    // 2. SYNC_STATE
    socket.on('SYNC_STATE', (state: SyncState) => {
      if (!state) return;
      console.log('[PlayerView] SYNC_STATE received:', state);

      if (state.imageFile) {
        setImageFile(state.imageFile);
      } else if (state.activeSceneInfo?.mapUrl) {
        setImageFile(state.activeSceneInfo.mapUrl);
      }

      if (state.characters && Array.isArray(state.characters)) {
        setCompendiumCharacters(state.characters);
      }

      if (state.tokens && Array.isArray(state.tokens)) {
        const normalizedTokens = state.tokens.map(normalizeToken);
        if (activeDraggingTokenIdRef.current) {
          const draggingId = activeDraggingTokenIdRef.current;
          setTokens(prev => {
            const currentDragging = prev.find(t => t.id === draggingId);
            const next = normalizedTokens.map(t =>
              (t.id === draggingId && currentDragging)
                ? { ...t, x: currentDragging.x, y: currentDragging.y }
                : t
            );
            tokensRef.current = next;
            return next;
          });
        } else {
          tokensRef.current = normalizedTokens;
          setTokens(normalizedTokens);
        }
      }
      if (state.walls && Array.isArray(state.walls)) setWalls(state.walls);
      if (state.reveals) setReveals(state.reveals);
      if (state.polygonReveals) setPolygonReveals(state.polygonReveals);
      if (state.effects && Array.isArray(state.effects)) setEffects(state.effects);
      if (state.boardAnimatedFeatures && Array.isArray(state.boardAnimatedFeatures)) {
        setBoardAnimatedFeatures(state.boardAnimatedFeatures);
      }
      if (state.boardAnimatedEnabled !== undefined) setBoardAnimatedEnabled(state.boardAnimatedEnabled);
      if (state.boardWeatherEffect) setBoardWeatherEffect(state.boardWeatherEffect);
      if (state.gridSize) setGridSize(state.gridSize);
      if (state.gridVisible !== undefined) setGridVisible(state.gridVisible);
      if (state.gridOpacity !== undefined) setGridOpacity(state.gridOpacity);
      if (state.gridOffsetX !== undefined) setGridOffsetX(state.gridOffsetX);
      if (state.gridOffsetY !== undefined) setGridOffsetY(state.gridOffsetY);
      if (state.isFogVisible !== undefined) setIsFogVisible(state.isFogVisible);
      if (state.visionConfig) setVisionConfig(state.visionConfig);
      if (state.mapRotation !== undefined) setMapRotation(state.mapRotation);
      if (state.activeSceneInfo) setActiveSceneInfo(state.activeSceneInfo);

      // Combat state fallback in SYNC_STATE
      if (state.combatants) {
        setCombatState({
          combatants: state.combatants,
          round: state.combatRound || 1,
          turnIndex: state.combatTurnIndex || 0,
          showCombatTracker: state.showCombatTracker || false
        });
      }
    });

    // 3. SYNC_COMBAT_STATE
    socket.on('SYNC_COMBAT_STATE', (data: any) => {
      if (!data) return;
      console.log('[PlayerView] SYNC_COMBAT_STATE received:', data);
      setCombatState({
        combatants: data.combatants || [],
        round: data.round || 1,
        turnIndex: data.turnIndex || 0,
        showCombatTracker: data.showCombatTracker !== false
      });
    });

    // 4. SYNC_AUDIO
    socket.on('SYNC_AUDIO', (data: any) => {
      if (isAudioMuted || !data) return;
      const soundUrl = data.soundUrl || data.url;
      if (soundUrl) {
        try {
          const audio = new Audio(soundUrl);
          audio.volume = data.volume !== undefined ? data.volume : 0.7;
          audio.play().catch(e => console.warn('[PlayerView] Audio playback note:', e));
        } catch (e) {
          console.warn('[PlayerView] Audio error:', e);
        }
      }
    });

    // 5. BROADCAST_ROOM_TEXT
    socket.on('BROADCAST_ROOM_TEXT', (data: any) => {
      console.log('[PlayerView] BROADCAST_ROOM_TEXT received:', data);
      if (data) {
        setRoomBroadcast({
          title: data.title || data.roomTitle || 'Room Announcement',
          boxedText: data.boxedText || data.text || data.description || data.message || '',
          timestamp: Date.now(),
          voiceName: data.voiceName || data.voiceId,
          voiceId: data.voiceId
        });

        // Play the room narration audio exclusively through the player view
        if (!isAudioMuted && data.audioBase64) {
          try {
            if (activeNarrationAudioRef.current) {
              activeNarrationAudioRef.current.pause();
              activeNarrationAudioRef.current = null;
            }
            const blob = base64AudioToBlob(data.audioBase64, 24000);
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            activeNarrationAudioRef.current = audio;
            audio.volume = 1.0;
            const voice = getNarrationVoice(data.voiceId);
            if (blob.type === 'audio/mpeg') {
              audio.playbackRate = 1.0;
            } else {
              audio.playbackRate = voice.playbackRate || 1.0;
            }
            audio.play().catch(e => {
              console.warn('[PlayerView] Narration playback note (autoplay policy or codec):', e);
            });
            audio.onended = () => {
              if (activeNarrationAudioRef.current === audio) {
                activeNarrationAudioRef.current = null;
              }
            };
          } catch (e) {
            console.warn('[PlayerView] Failed to decode or play broadcast narration audio:', e);
          }
        }
      }
    });

    // Real-time token move relay from other clients
    socket.on('MOVE_TOKEN', (data: { id: string; x: number; y: number }) => {
      if (data?.id) {
        if (activeDraggingTokenIdRef.current === data.id) return;
        setTokens(prev => {
          const next = prev.map(t => t.id === data.id ? { ...t, x: data.x, y: data.y } : t);
          tokensRef.current = next;
          return next;
        });
      }
    });

    socket.on('SYNC_TOKENS', (syncedTokens: Token[]) => {
      if (Array.isArray(syncedTokens)) {
        const normalizedTokens = syncedTokens.map(normalizeToken);
        if (activeDraggingTokenIdRef.current) {
          const draggingId = activeDraggingTokenIdRef.current;
          setTokens(prev => {
            const currentDragging = prev.find(t => t.id === draggingId);
            const next = normalizedTokens.map(t =>
              (t.id === draggingId && currentDragging)
                ? { ...t, x: currentDragging.x, y: currentDragging.y }
                : t
            );
            tokensRef.current = next;
            return next;
          });
        } else {
          tokensRef.current = normalizedTokens;
          setTokens(normalizedTokens);
        }
      }
    });

    socket.on('ADD_TOKEN', (newToken: any) => {
      if (!newToken?.id) return;
      const normalized = normalizeToken(newToken);
      setTokens(prev => {
        if (prev.some(t => t.id === normalized.id)) return prev;
        const next = [...prev, normalized];
        tokensRef.current = next;
        return next;
      });
    });

    // Full party initial D&D Beyond synchronization on socket connection or campaign switch
    socket.on('DDB_CAMPAIGN_SYNC_INIT', (data: {
      campaignId: string;
      characters: Array<{
        id: string;
        name: string;
        currentHp: number;
        maxHp: number;
        tempHp: number;
        ac: number;
        race?: string;
        classLevel?: string;
        playerName?: string;
        avatarUrl?: string;
        readonlyUrl?: string;
        stats?: any;
        speed?: string;
      }>;
    }) => {
      if (!data.characters || data.characters.length === 0) return;
      console.log(`[PlayerView Socket] ⚡ D&D Beyond Initial Sync for ${data.characters.length} characters`);

      // 1. Update compendium characters
      setCompendiumCharacters(prev => {
        const next = [...prev];
        data.characters.forEach((d: any) => {
          const dId = String(d.id);
          const dName = (d.name || '').trim();
          const existingIdx = next.findIndex(c =>
            isDdbMatch(c.name, c.id, (c as any).ddbCharacterId, dId, dName)
          );

          if (existingIdx >= 0) {
            const existing = next[existingIdx];
            next[existingIdx] = {
              ...existing,
              ddbCharacterId: dId,
              hp: d.currentHp,
              maxHp: d.maxHp,
              tempHp: d.tempHp || 0,
              ac: d.ac || existing.ac || 10,
              avatarUrl: existing.avatarUrl || d.avatarUrl || getCharacterTokenUrl(dName),
              updatedAt: Date.now()
            };
          } else {
            const newChar: Character = {
              id: `char_ddb_${dId}`,
              ddbCharacterId: dId,
              name: d.name,
              race: d.race || 'Humanoid',
              classLevel: d.classLevel || 'Level 1',
              alignment: 'Neutral',
              avatarUrl: d.avatarUrl || getCharacterTokenUrl(dName),
              ac: d.ac || 10,
              hp: d.currentHp,
              maxHp: d.maxHp,
              tempHp: d.tempHp || 0,
              speed: d.speed || '30 ft.',
              stats: d.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
              features: [],
              spells: [],
              notes: `Imported from D&D Beyond Campaign (Player: ${d.playerName || 'Player'}). Direct URL: ${d.readonlyUrl || ''}`,
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            next.push(newChar);
          }
        });
        return next;
      });

      // 2. Update matching tokens in Player View
      setTokens(prev => {
        let changed = false;
        const next = prev.map(t => {
          const match = data.characters.find((d: any) =>
            isDdbMatch(t.name, (t as any).characterId || t.id, (t as any).ddbCharacterId, String(d.id), (d.name || '').trim())
          );

          if (match) {
            changed = true;
            return {
              ...t,
              ddbCharacterId: String(match.id),
              hp: match.currentHp,
              currentHp: match.currentHp,
              maxHp: match.maxHp,
              tempHp: match.tempHp || 0,
              ac: match.ac || t.ac
            };
          }
          return t;
        });

        if (changed) {
          tokensRef.current = next;
        }
        return next;
      });
    });

    // Real-time D&D Beyond HP synchronization directly to Player View
    socket.on('DDB_CHARACTER_HP_CHANGED', (data: {
      characterId: string | number;
      name: string;
      currentHp: number;
      maxHp: number;
      tempHp: number;
      previousHp: number;
      timestamp: number;
    }) => {
      console.log(`[PlayerView] ⚡ D&D Beyond HP Update: ${data.name} -> ${data.currentHp}/${data.maxHp} (temp: ${data.tempHp})`);
      const charIdStr = String(data.characterId);
      const ddbName = (data.name || '').trim();

      // 1. Update character in compendiumCharacters state
      setCompendiumCharacters(prev => {
        let matched = false;
        const next = prev.map(c => {
          const isMatch = isDdbMatch(c.name, c.id, (c as any).ddbCharacterId, charIdStr, ddbName);
          if (isMatch) {
            matched = true;
            return {
              ...c,
              ddbCharacterId: charIdStr,
              hp: data.currentHp,
              maxHp: data.maxHp,
              tempHp: data.tempHp || 0,
              updatedAt: Date.now()
            };
          }
          return c;
        });

        if (!matched) {
          const newChar: Character = {
            id: `char_ddb_${charIdStr}`,
            ddbCharacterId: charIdStr,
            name: data.name,
            race: 'Humanoid',
            classLevel: 'Level 1',
            alignment: 'Neutral',
            avatarUrl: getCharacterTokenUrl(data.name),
            ac: 10,
            hp: data.currentHp,
            maxHp: data.maxHp,
            tempHp: data.tempHp || 0,
            speed: '30 ft.',
            stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
            features: [],
            spells: [],
            notes: `Auto-created from D&D Beyond sync`,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          next.push(newChar);
        }

        return next;
      });

      // 2. Update matching tokens in Player View
      setTokens(prev => {
        let changed = false;
        const next = prev.map(t => {
          const isMatch = isDdbMatch(t.name, (t as any).characterId || t.id, (t as any).ddbCharacterId, charIdStr, ddbName);
          if (isMatch) {
            changed = true;
            return {
              ...t,
              ddbCharacterId: charIdStr,
              hp: data.currentHp,
              currentHp: data.currentHp,
              maxHp: data.maxHp,
              tempHp: data.tempHp || 0
            };
          }
          return t;
        });

        if (changed) {
          tokensRef.current = next;
        }
        return next;
      });
    });

    // Real-time spell effects synchronization from server and DM
    socket.on('ADD_EFFECT', (newEffect: any) => {
      if (newEffect?.id) {
        setEffects(prev => {
          if (prev.some(e => e.id === newEffect.id)) return prev;
          return [...prev, newEffect];
        });
      }
    });

    socket.on('REMOVE_EFFECT', (effectId: string) => {
      if (effectId) {
        setEffects(prev => prev.filter(e => e.id !== effectId));
      }
    });

    socket.on('CLEAR_EFFECTS', () => {
      setEffects([]);
    });

    // Auto-sync D&D Beyond party health on initial load
    fetch('/api/ddb/campaigns/sync-status')
      .then(res => res.json())
      .then(data => {
        const chars = data?.status?.cachedCharacters;
        if (Array.isArray(chars) && chars.length > 0) {
          console.log(`[PlayerView] Syncing ${chars.length} D&D Beyond characters on load.`);
          setCompendiumCharacters(prev => {
            const next = [...prev];
            chars.forEach((d: any) => {
              const dId = String(d.id);
              const dName = (d.name || '').trim();
              const existingIdx = next.findIndex(c =>
                isDdbMatch(c.name, c.id, (c as any).ddbCharacterId, dId, dName)
              );

              if (existingIdx >= 0) {
                const existing = next[existingIdx];
                next[existingIdx] = {
                  ...existing,
                  ddbCharacterId: dId,
                  hp: d.currentHp,
                  maxHp: d.maxHp,
                  tempHp: d.tempHp || 0,
                  ac: d.ac || existing.ac || 10,
                  avatarUrl: existing.avatarUrl || d.avatarUrl || getCharacterTokenUrl(dName),
                  updatedAt: Date.now()
                };
              } else {
                const newChar: Character = {
                  id: `char_ddb_${dId}`,
                  ddbCharacterId: dId,
                  name: d.name,
                  race: d.race || 'Humanoid',
                  classLevel: d.classLevel || 'Level 1',
                  alignment: 'Neutral',
                  avatarUrl: d.avatarUrl || getCharacterTokenUrl(dName),
                  ac: d.ac || 10,
                  hp: d.currentHp,
                  maxHp: d.maxHp,
                  tempHp: d.tempHp || 0,
                  speed: d.speed || '30 ft.',
                  stats: d.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
                  features: [],
                  spells: [],
                  notes: `Imported from D&D Beyond Campaign (Player: ${d.playerName || 'Player'}). Direct URL: ${d.readonlyUrl || ''}`,
                  createdAt: Date.now(),
                  updatedAt: Date.now()
                };
                next.push(newChar);
              }
            });
            return next;
          });

          setTokens(prev => {
            let changed = false;
            const next = prev.map(t => {
              const match = chars.find((d: any) =>
                isDdbMatch(t.name, (t as any).characterId || t.id, (t as any).ddbCharacterId, String(d.id), (d.name || '').trim())
              );
              if (match) {
                changed = true;
                return {
                  ...t,
                  ddbCharacterId: String(match.id),
                  hp: match.currentHp,
                  currentHp: match.currentHp,
                  maxHp: match.maxHp,
                  tempHp: match.tempHp || 0,
                  ac: match.ac || t.ac
                };
              }
              return t;
            });

            if (changed) {
              tokensRef.current = next;
            }
            return next;
          });
        }
      })
      .catch(() => {});

    return () => {
      if (activeNarrationAudioRef.current) {
        activeNarrationAudioRef.current.pause();
        activeNarrationAudioRef.current = null;
      }
      socket.disconnect();
    };
  }, [isAudioMuted]);

  // Seize / Claim Character Action
  const handleClaimToken = useCallback((tokenId: string) => {
    setClaimedTokenId(tokenId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mistwalker_player_claimed_token', tokenId);
    }
    setShowClaimMenu(false);
  }, []);

  const handleReleaseToken = useCallback(() => {
    setClaimedTokenId(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mistwalker_player_claimed_token');
    }
  }, []);

  const handleDragStartToken = useCallback((id: string) => {
    activeDraggingTokenIdRef.current = id;
    setClaimedTokenId(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mistwalker_player_claimed_token', id);
    }
  }, []);

  // Real-time dragged token movement handler (throttled emit during active drag)
  const handleDragMoveToken = useCallback((id: string, rawX: number, rawY: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('MOVE_TOKEN', { id, x: rawX, y: rawY });
    }
  }, []);

  // Snapped or keyboard token movement handler (emits MOVE_TOKEN and SYNC_TOKENS)
  const handleMoveToken = useCallback((id: string, newX: number, newY: number) => {
    const currentTokens = tokensRef.current;
    const nextTokens = currentTokens.map(t => t.id === id ? { ...t, x: newX, y: newY } : t);
    tokensRef.current = nextTokens;
    setTokens(nextTokens);
    if (socketRef.current?.connected) {
      socketRef.current.emit('MOVE_TOKEN', { id, x: newX, y: newY });
      socketRef.current.emit('SYNC_TOKENS', nextTokens);
    }
    setTimeout(() => {
      if (activeDraggingTokenIdRef.current === id) {
        activeDraggingTokenIdRef.current = null;
      }
    }, 150);
  }, []);

  // Open right-click context menu for tokens
  const handleOpenTokenContextMenu = useCallback((id: string, clientX: number, clientY: number) => {
    setActiveTokenMenu({ id, x: clientX, y: clientY });
  }, []);

  // Update token stats/conditions from right-click context menu
  const handleUpdateToken = useCallback((id: string, updates: Partial<Token>) => {
    const currentTokens = tokensRef.current;
    const nextTokens = currentTokens.map(t => t.id === id ? { ...t, ...updates } : t);
    tokensRef.current = nextTokens;
    setTokens(nextTokens);
    if (socketRef.current?.connected) {
      socketRef.current.emit('SYNC_TOKENS', nextTokens);
    }
  }, []);

  // Delete token from board from right-click context menu
  const handleDeleteToken = useCallback((id: string) => {
    const currentTokens = tokensRef.current;
    const nextTokens = currentTokens.filter(t => t.id !== id);
    tokensRef.current = nextTokens;
    setTokens(nextTokens);
    if (claimedTokenIdRef.current === id) {
      setClaimedTokenId(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('mistwalker_player_claimed_token');
      }
    }
    setActiveTokenMenu(null);
    if (socketRef.current?.connected) {
      socketRef.current.emit('SYNC_TOKENS', nextTokens);
    }
  }, []);

  // Effect placement & management handlers
  const createAndPlaceEffect = useCallback(({
    spellDef,
    x,
    y,
    size,
    rotation = 0
  }: {
    spellDef: PlayerSpellDefinition;
    x: number;
    y: number;
    size: number;
    rotation?: number;
  }) => {
    const id = Math.random().toString(36).substring(2, 11);
    const claimedChar = claimedTokenId ? tokens.find(t => t.id === claimedTokenId) : null;
    const newEffect: SpellEffect = {
      id,
      type: spellDef.type,
      x,
      y,
      size,
      rotation,
      color: spellDef.color,
      label: spellDef.label,
      createdAt: Date.now(),
      isPersistent: spellDef.isPersistent,
      opacity: spellDef.defaultOpacity !== undefined ? spellDef.defaultOpacity : 1.0,
      placedById: claimedTokenId || 'player',
      placedByName: claimedChar?.name || 'Player'
    };

    setEffects(prev => [...prev, newEffect]);
    effectsRef.current = [...effectsRef.current, newEffect];

    if (socketRef.current?.connected) {
      socketRef.current.emit('ADD_EFFECT', newEffect);
    }

    toast.success(`Cast ${newEffect.label}!`, {
      description: spellDef.isPersistent ? 'Persistent AoE placed on scene' : 'Instant spell triggered'
    });
  }, [claimedTokenId, tokens]);

  const handleRemoveEffect = useCallback((effectId: string) => {
    setEffects(prev => prev.filter(e => e.id !== effectId));
    effectsRef.current = effectsRef.current.filter(e => e.id !== effectId);
    if (socketRef.current?.connected) {
      socketRef.current.emit('REMOVE_EFFECT', effectId);
    }
    toast.info('Effect dismissed');
  }, []);

  const handleClearAllEffects = useCallback(() => {
    setEffects([]);
    effectsRef.current = [];
    if (socketRef.current?.connected) {
      socketRef.current.emit('CLEAR_EFFECTS');
    }
    toast.info('All effects cleared');
  }, []);

  const handleEquipSpell = useCallback((spell: PlayerSpellDefinition) => {
    setActivePlayerTool(spell.id);
    setEquippedSpell(spell);
    toast.info(`Aiming ${spell.name}`, {
      description: 'Click and drag on the map to place and orient. Press ESC to cancel.'
    });
  }, []);

  const handlePanelDragStart = useCallback((e: React.MouseEvent) => {
    if (pinnedEffectsPanel) return;
    setIsDraggingPanel(true);
    panelDragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: panelPos.x,
      posY: panelPos.y
    };
  }, [pinnedEffectsPanel, panelPos]);

  const handleStageDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleStageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const spellId = e.dataTransfer.getData('application/dnd-effect') || e.dataTransfer.getData('text/plain');
    if (!spellId) return;
    const spellDef = PLAYER_EFFECTS_CATALOG.find(s => s.id === spellId);
    if (!spellDef) return;

    const stage = stageRef.current;
    if (!stage) return;
    const containerRect = stage.container().getBoundingClientRect();
    const screenX = e.clientX - containerRect.left;
    const screenY = e.clientY - containerRect.top;
    const mapX = (screenX - stagePos.x) / stageScale;
    const mapY = (screenY - stagePos.y) / stageScale;

    createAndPlaceEffect({
      spellDef,
      x: mapX,
      y: mapY,
      size: (spellDef.defaultSizeFt / 5) * gridSize,
      rotation: 0
    });
  }, [stagePos, stageScale, gridSize, createAndPlaceEffect]);

  const handleStageMouseDown = useCallback((e: any) => {
    if (activePlayerTool && equippedSpell) {
      const stage = e.target.getStage();
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const mapX = (pointer.x - stagePos.x) / stageScale;
      const mapY = (pointer.y - stagePos.y) / stageScale;
      setIsAiming(true);
      setAimOrigin({ x: mapX, y: mapY });
      setAimCurrent({ x: mapX, y: mapY });
    }
  }, [activePlayerTool, equippedSpell, stagePos, stageScale]);

  const handleStageMouseMove = useCallback((e: any) => {
    if (isAiming && aimOrigin) {
      const stage = e.target.getStage();
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const mapX = (pointer.x - stagePos.x) / stageScale;
      const mapY = (pointer.y - stagePos.y) / stageScale;
      setAimCurrent({ x: mapX, y: mapY });
    }
  }, [isAiming, aimOrigin, stagePos, stageScale]);

  const handleStageMouseUp = useCallback((e: any) => {
    if (isAiming && aimOrigin && equippedSpell) {
      const stage = e.target.getStage();
      const pointer = stage ? stage.getPointerPosition() : null;
      const mapX = pointer ? (pointer.x - stagePos.x) / stageScale : (aimCurrent?.x ?? aimOrigin.x);
      const mapY = pointer ? (pointer.y - stagePos.y) / stageScale : (aimCurrent?.y ?? aimOrigin.y);

      const dx = mapX - aimOrigin.x;
      const dy = mapY - aimOrigin.y;
      const dragDist = Math.hypot(dx, dy);
      const rotation = (Math.atan2(dy, dx) * 180) / Math.PI;

      const size = dragDist >= 15 ? dragDist : (equippedSpell.defaultSizeFt / 5) * gridSize;

      createAndPlaceEffect({
        spellDef: equippedSpell,
        x: aimOrigin.x,
        y: aimOrigin.y,
        size,
        rotation: (equippedSpell.type === 'cone' || equippedSpell.type === 'line') ? rotation : 0
      });

      setIsAiming(false);
      setAimOrigin(null);
      setAimCurrent(null);
      setActivePlayerTool(null);
      setEquippedSpell(null);
    }
  }, [isAiming, aimOrigin, aimCurrent, equippedSpell, stagePos, stageScale, gridSize, createAndPlaceEffect]);

  // Arrow-Key & WASD Movement for Seized Token + Escape key handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Escape key to cancel aiming or close modals/menus
      if (e.key === 'Escape') {
        if (activePlayerTool) {
          setActivePlayerTool(null);
          setEquippedSpell(null);
          setIsAiming(false);
          setAimOrigin(null);
          setAimCurrent(null);
          return;
        }
        setShowEffectsPanel(false);
        setActiveTokenMenu(null);
        setShowClaimMenu(false);
        if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      // Don't trigger movement or shortcuts if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      // Toggle UI minimize with 'h' or 'H'
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setIsUiMinimized(prev => !prev);
        return;
      }

      if (!claimedTokenId) return;

      const claimedToken = tokens.find(t => t.id === claimedTokenId);
      if (!claimedToken) return;

      let dx = 0;
      let dy = 0;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          dy = -gridSize;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          dy = gridSize;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          dx = -gridSize;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          dx = gridSize;
          break;
        default:
          return;
      }

      e.preventDefault();
      const newX = claimedToken.x + dx;
      const newY = claimedToken.y + dy;
      handleMoveToken(claimedToken.id, newX, newY);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [claimedTokenId, tokens, gridSize, handleMoveToken, activePlayerTool]);

  // Door interaction in dynamic lighting layer
  const handleToggleDoor = useCallback((doorId: string) => {
    setWalls(prev => {
      const next = prev.map(w => {
        if (w.id === doorId && w.wallType === 'door') {
          return {
            ...w,
            doorState: (w.doorState === 'open' ? 'closed' : 'open') as any
          };
        }
        return w;
      });
      if (socketRef.current?.connected) {
        socketRef.current.emit('SYNC_STATE', { walls: next });
      }
      return next;
    });
  }, []);

  // Natural Map Dimensions - Prioritize natural loaded image dimensions
  const naturalW = image?.width || (image as any)?.naturalWidth || 0;
  const naturalH = image?.height || (image as any)?.naturalHeight || 0;
  const mapWidth = naturalW > 0 ? naturalW : (activeSceneInfo?.mapWidth || dimensions.width);
  const mapHeight = naturalH > 0 ? naturalH : (activeSceneInfo?.mapHeight || dimensions.height);

  const isRotated = mapRotation % 180 !== 0;
  const targetMapW = isRotated ? mapHeight : mapWidth;
  const targetMapH = isRotated ? mapWidth : mapHeight;

  // Calibrate 1"x1" physical grid scale for a 32-inch 16:9 TV
  const applyTvScale = useCallback((targetGridSize?: number, targetTokens?: any[]) => {
    // 32-inch 16:9 TV PPI calculation
    const screenW = window.screen?.width || window.innerWidth || 1920;
    const screenH = window.screen?.height || window.innerHeight || 1080;
    const diagPx = Math.hypot(screenW, screenH);
    const ppi32 = diagPx / 32; // ~68.84 PPI on standard 1080p, ~137.68 PPI on 4K

    const effectiveGrid = (targetGridSize !== undefined && targetGridSize > 0)
      ? targetGridSize
      : (gridSize > 0 ? gridSize : 50);

    // Exact scale factor where 1 grid square = 1 physical inch on a 32" TV
    const tvScale = Math.max(0.1, Math.min(ppi32 / effectiveGrid, 5));

    // Center on claimed token or active party player token
    const tokenList = targetTokens || tokens;
    const primaryToken = tokenList.find(t => t.id === claimedTokenId) ||
                         tokenList.find(t => t.isPlayer) ||
                         tokenList[0];

    const currentW = targetMapW || 1920;
    const currentH = targetMapH || 1080;

    let startX = 0;
    let startY = 0;
    if (primaryToken && typeof primaryToken.x === 'number' && typeof primaryToken.y === 'number') {
      startX = (window.innerWidth / 2) - primaryToken.x * tvScale;
      startY = (window.innerHeight / 2) - primaryToken.y * tvScale;
    } else if (currentW > 0 && currentH > 0) {
      startX = (window.innerWidth - currentW * tvScale) / 2;
      startY = (window.innerHeight - currentH * tvScale) / 2;
    }

    setStageScale(tvScale);
    setStagePos({ x: startX, y: startY });
  }, [gridSize, tokens, claimedTokenId, targetMapW, targetMapH]);

  // Zoom handlers
  const handleZoom = useCallback((factor: number) => {
    setStageScale(prev => Math.max(0.1, Math.min(prev * factor, 5)));
  }, []);

  const handleResetZoom = useCallback(() => {
    applyTvScale();
    toast.info('Reset to 1" grid scale for 32" TV');
  }, [applyTvScale]);

  // Auto-calibrate 1"x1" scale for 32" TV when a scene or map loads
  const lastCalibratedSceneRef = useRef<string | null>(null);
  useEffect(() => {
    const sceneKey = activeSceneInfo?.sceneId || imageFile;
    if (sceneKey && sceneKey !== lastCalibratedSceneRef.current && (image || naturalW > 0)) {
      lastCalibratedSceneRef.current = sceneKey;
      applyTvScale(gridSize, tokens);
    }
  }, [activeSceneInfo?.sceneId, imageFile, image, naturalW, gridSize, applyTvScale, tokens]);

  // Claimed Token Data & Character Stats
  const claimedToken = useMemo(() => {
    return tokens.find(t => t.id === claimedTokenId);
  }, [tokens, claimedTokenId]);

  const claimedStats = useMemo(() => {
    if (!claimedToken) return null;
    return resolveTokenCharacterStats(claimedToken, compendiumCharacters);
  }, [claimedToken, compendiumCharacters]);

  // Vision Sources for Player Characters (active vision providers)
  const playerVisionSources = useMemo<VisionSource[]>(() => {
    if (!visionConfig.enabled) return [];

    const activeVisionTokens = tokens.filter((t) => {
      if ((t as any).hidden) return false;
      if (isMonsterToken(t) || t.isMonster === true || t.category === 'monster' || t.isPlayer === false) return false;
      if (t.visionEnabled === false) return false;
      if (typeof t.visionRadius === 'number' && t.visionRadius <= 0) return false;
      if (t.visionEnabled !== undefined) return t.visionEnabled;
      return t.isPlayer === true || t.category === 'character' || (claimedTokenId && t.id === claimedTokenId);
    });

    const sources: VisionSource[] = [];
    for (const t of activeVisionTokens) {
      const visionFeet = typeof t.visionRadius === 'number' ? t.visionRadius : 60;
      if (visionFeet <= 0) continue;
      const radiusPx = (visionFeet / 5) * gridSize;
      const angle = t.visionAngle !== undefined ? t.visionAngle : 360;
      const direction = t.visionDirection !== undefined ? t.visionDirection : 0;
      const tokenCenterOffset = ((t.size || 1) * gridSize) / 2;

      sources.push({
        id: t.id,
        x: t.x + tokenCenterOffset,
        y: t.y + tokenCenterOffset,
        radiusPx,
        angleDegrees: angle,
        directionDegrees: direction,
        color: t.visionColor || '#ffd166'
      });
    }

    if (boardAnimatedFeatures) {
      for (const feat of boardAnimatedFeatures) {
        if (feat.type === 'torch') {
          const tx = (feat.x / 100) * targetMapW;
          const ty = (feat.y / 100) * targetMapH;

          // In Player View, a torch only provides vision if at least one active player token has line of sight to it,
          // or if it is inside an already revealed area. Torches in unvisited rooms behind walls never pierce fog!
          const isTorchSeenByPlayer = activeVisionTokens.some(t => {
            const tCenterX = t.x + ((t.size || 1) * gridSize) / 2;
            const tCenterY = t.y + ((t.size || 1) * gridSize) / 2;
            const d = distanceBetween(tCenterX, tCenterY, tx, ty);
            const visionFeet = typeof t.visionRadius === 'number' ? t.visionRadius : 60;
            const maxSight = ((visionFeet / 5) * gridSize) + 60;
            if (d > maxSight) return false;
            return !walls.some(w => isWallOccluding(w) && segmentsIntersect({ x: tCenterX, y: tCenterY }, { x: tx, y: ty }, w.p1, w.p2));
          });

          if (!isTorchSeenByPlayer) {
            const inReveal = reveals.some(r => distanceBetween(tx, ty, r.x, r.y) <= r.radius) ||
                             polygonReveals.some(p => p.length >= 6 && isPointInPolygon(tx, ty, p));
            if (!inReveal) continue;
          }

          const tr = (feat.radius / 100) * Math.min(targetMapW, targetMapH) * 1.15;
          sources.push({
            id: `torch-${feat.id}`,
            x: tx,
            y: ty,
            radiusPx: tr,
            color: '#f59e0b'
          });
        }
      }
    }

    return sources;
  }, [tokens, gridSize, visionConfig.enabled, claimedTokenId, boardAnimatedFeatures, targetMapW, targetMapH, walls, reveals, polygonReveals]);

  // Compute active FOV polygons for player vision
  const activeFovPolygons = useMemo<VisibilityPolygon[]>(() => {
    if (!visionConfig.enabled || playerVisionSources.length === 0) return [];
    const mapBounds = { width: targetMapW, height: targetMapH };
    return playerVisionSources.map((source) =>
      computeVisibilityPolygon(source, walls, mapBounds)
    );
  }, [playerVisionSources, walls, targetMapW, targetMapH, visionConfig.enabled]);

  // Determine if a token is revealed to players through the fog of war
  const isTokenVisibleToPlayer = useCallback((t: Token): boolean => {
    // Hidden tokens are strictly never shown to players
    if ((t as any).hidden) return false;

    // If fog is completely disabled, all non-hidden tokens are visible
    if (!isFogVisible) return true;

    // The player's own claimed token is always visible to them
    if (t.id === claimedTokenId) return true;

    const isMonster = isMonsterToken(t) || t.isMonster === true || t.category === 'monster' || t.isPlayer === false;

    // All active player characters and party members are visible to players on the board
    if (!isMonster && (t.isPlayer === true || t.category === 'character' || t.id === claimedTokenId)) {
      return true;
    }

    // For any monster, enemy, or non-claimed token, check if it's within revealed areas
    const tokenPx = gridSize * (t.size || 1);
    const radius = tokenPx / 2;
    const cx = t.x + radius;
    const cy = t.y + radius;

    // WALL OCCLUSION CHECK: In player view, a token behind an occluding wall from all player vision sources is NEVER visible!
    const activeVisionCenters = activeFovPolygons.map(fov => fov.center);
    if (activeVisionCenters.length > 0) {
      const canAnyPlayerSeeTarget = activeVisionCenters.some(src => {
        return !walls.some(w => isWallOccluding(w) && segmentsIntersect(src, { x: cx, y: cy }, w.p1, w.p2));
      });

      // If all lines of sight from active players are occluded by walls, target is strictly NOT visible
      if (!canAnyPlayerSeeTarget) {
        return false;
      }
    }

    // 1. Check circle brush reveals
    for (const rev of reveals) {
      if (distanceBetween(cx, cy, rev.x, rev.y) <= rev.radius + radius * 0.75) {
        return true;
      }
    }

    // 2. Check polygon reveals
    for (const poly of polygonReveals) {
      if (poly.length >= 6 && isPointInPolygon(cx, cy, poly)) {
        return true;
      }
    }

    // 3. Check active dynamic FOV line-of-sight
    if (visionConfig.enabled && activeFovPolygons.length > 0) {
      for (const fov of activeFovPolygons) {
        if (fov.points.length >= 6 && isPointInPolygon(cx, cy, fov.points)) {
          return true;
        }
      }
    }

    // If not in active vision or manual reveal, the token is in the fog -> NEVER visible
    return false;
  }, [isFogVisible, claimedTokenId, gridSize, reveals, polygonReveals, visionConfig.enabled, activeFovPolygons, walls]);

  // Determine if a spell / AoE effect is revealed to players through the fog of war
  const isEffectVisibleToPlayer = useCallback((eff: SpellEffect): boolean => {
    // If the effect was cast by the active claimed character, they can always see their own spell
    if (claimedTokenId && eff.placedById === claimedTokenId) return true;

    // If fog is completely disabled, all effects are visible
    if (!isFogVisible) return true;

    const r = eff.size || 50;
    const cx = eff.x;
    const cy = eff.y;

    // Test points: center, cardinal edges, and diagonals
    const testPoints = [
      { x: cx, y: cy },
      { x: cx - r * 0.7, y: cy },
      { x: cx + r * 0.7, y: cy },
      { x: cx, y: cy - r * 0.7 },
      { x: cx, y: cy + r * 0.7 },
    ];

    if (eff.type === 'cone' || eff.type === 'line') {
      const rotRad = ((eff.rotation || 0) * Math.PI) / 180;
      testPoints.push(
        { x: cx + Math.cos(rotRad) * r * 0.5, y: cy + Math.sin(rotRad) * r * 0.5 },
        { x: cx + Math.cos(rotRad) * r * 0.9, y: cy + Math.sin(rotRad) * r * 0.9 }
      );
    }

    // 1. Check circle brush reveals
    for (const rev of reveals) {
      for (const pt of testPoints) {
        if (distanceBetween(pt.x, pt.y, rev.x, rev.y) <= rev.radius) {
          return true;
        }
      }
    }

    // 2. Check polygon room reveals
    for (const poly of polygonReveals) {
      if (poly.length >= 6) {
        for (const pt of testPoints) {
          if (isPointInPolygon(pt.x, pt.y, poly)) {
            return true;
          }
        }
      }
    }

    // 3. Check active dynamic FOV line-of-sight (tokens & torches)
    if (visionConfig.enabled && activeFovPolygons.length > 0) {
      for (const fov of activeFovPolygons) {
        if (fov.points.length >= 6) {
          for (const pt of testPoints) {
            if (isPointInPolygon(pt.x, pt.y, fov.points)) {
              return true;
            }
          }
        }
      }
    }

    // If no part of the effect is in revealed areas or active vision -> NOT visible
    return false;
  }, [claimedTokenId, isFogVisible, reveals, polygonReveals, visionConfig.enabled, activeFovPolygons]);

  // Candidate Tokens for Claiming (Only non-monster player characters)
  const candidateTokens = useMemo(() => {
    return tokens.filter(t =>
      !(t as any).hidden &&
      !isMonsterToken(t) &&
      !t.isMonster &&
      t.category !== 'monster' &&
      (t.isPlayer || t.category === 'character' || t.id === claimedTokenId)
    );
  }, [tokens, claimedTokenId]);

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-zinc-950 select-none"
      onDragOver={handleStageDragOver}
      onDrop={handleStageDrop}
    >
      {/* Background Wallpaper / Scene Backdrop */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
        <img
          src={(imageFile || image) ? sceneBackdropImage : homeBackgroundImage}
          alt={(imageFile || image) ? "MistWalker Scene Backdrop" : "MistWalker Campaign Wallpaper"}
          className={`w-full h-full object-cover object-center transition-all duration-700 ${
            (imageFile || image)
              ? 'filter brightness-[0.75] contrast-[1.1] opacity-85'
              : 'filter brightness-[0.88] contrast-[1.05]'
          }`}
        />
        {(imageFile || image) ? (
          <>
            <div className="absolute inset-0 bg-black/35" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(9,9,11,0.65)_100%)]" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-zinc-950/58" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-zinc-950/25 to-zinc-950/65" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(9,9,11,0.62)_100%)]" />
          </>
        )}
      </div>

      {/* ========================================================= */}
      {/* Top Floating Player HUD & Control Bar                     */}
      {/* ========================================================= */}
      {!isUiMinimized && (
        <div className="absolute top-4 left-4 z-50 flex items-center gap-3 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-2xl px-4 py-2.5 shadow-2xl pointer-events-auto">
          {/* Live Session Status Indicator */}
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-xs font-mono font-bold text-zinc-200">
              {isConnected ? 'LIVE SESSION' : 'CONNECTING...'}
            </span>
          </div>

          {/* Scene Title */}
          {activeSceneInfo?.sceneTitle && (
            <div className="border-l border-zinc-700 pl-3">
              <span className="text-xs font-bold text-emerald-400 font-mono">
                {activeSceneInfo.sceneTitle}
              </span>
            </div>
          )}

          {/* Character Claim Button / Seized Character Info */}
          <div className="border-l border-zinc-700 pl-3 flex items-center gap-2">
            {claimedToken && claimedStats ? (
              <div className="flex items-center gap-2.5 bg-zinc-950/90 border border-emerald-500/50 rounded-xl px-3 py-1.5 shadow-lg shadow-black/50">
                <div className="w-7 h-7 rounded-full overflow-hidden bg-zinc-800 border-2 border-emerald-500 flex items-center justify-center shrink-0">
                  {(() => {
                    const avatarSrc = claimedToken.url || claimedToken.avatarUrl || getCharacterTokenUrl(claimedToken.name);
                    return avatarSrc ? (
                      <img src={avatarSrc} alt={claimedToken.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-emerald-400" />
                    );
                  })()}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white leading-tight">
                    {claimedToken.name}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {/* HP Badge */}
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-700/60">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        claimedStats.currentHp / claimedStats.maxHp > 0.5
                          ? 'bg-emerald-400'
                          : claimedStats.currentHp / claimedStats.maxHp > 0.25
                          ? 'bg-amber-400'
                          : 'bg-red-500'
                      }`} />
                      HP {claimedStats.currentHp}/{claimedStats.maxHp}
                    </span>
                    {/* AC Badge */}
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-sky-300 bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-700/60">
                      <Shield className="w-2.5 h-2.5 text-sky-400" />
                      AC {claimedStats.ac}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowClaimMenu(true)}
                  className="ml-1 text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded transition-colors"
                  title="Switch Character"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowClaimMenu(true)}
                className="flex items-center gap-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-medium px-3 py-1.5 rounded-xl shadow-sm transition-colors border border-indigo-500/40"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Claim Character</span>
              </button>
            )}
          </div>

          {/* Audio Mute/Unmute Toggle */}
          <button
            onClick={() => setIsAudioMuted(prev => !prev)}
            className={`p-1.5 rounded-lg border transition-colors ${
              isAudioMuted
                ? 'text-zinc-500 border-zinc-800 hover:text-zinc-300'
                : 'text-emerald-400 border-emerald-800/40 bg-emerald-950/30 hover:text-emerald-300'
            }`}
            title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Effects Tab Toggle Button */}
          <div className="border-l border-zinc-700 pl-2">
            <button
              onClick={() => setShowEffectsPanel(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all shadow-sm cursor-pointer ${
                showEffectsPanel || activePlayerTool
                  ? 'bg-purple-600/90 hover:bg-purple-600 text-white border-purple-500/60 shadow-purple-900/30 ring-1 ring-purple-400/40'
                  : 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-700/60'
              }`}
              title="Toggle Spell & AoE Effects Panel"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Effects</span>
              {effects.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-purple-950/80 text-purple-300 border border-purple-700/50">
                  {effects.length}
                </span>
              )}
            </button>
          </div>

          {/* Minimize All Menus Toggle */}
          <div className="border-l border-zinc-700 pl-2">
            <button
              onClick={() => setIsUiMinimized(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-zinc-700/60 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-xs font-mono cursor-pointer"
              title="Minimize all menus (Press H)"
            >
              <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Minimize</span>
              <span className="text-[9px] text-zinc-500 font-mono bg-zinc-800 px-1 py-0.2 rounded border border-zinc-700 ml-0.5">H</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Restore UI Pill when Minimized */}
      {isUiMinimized && (
        <div className="absolute top-4 right-4 z-50 pointer-events-auto animate-in fade-in duration-200">
          <button
            onClick={() => setIsUiMinimized(false)}
            className="flex items-center gap-2 bg-zinc-900/85 hover:bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-700/70 hover:border-emerald-500/50 px-3.5 py-2 rounded-2xl shadow-2xl backdrop-blur-md transition-all group font-mono text-xs cursor-pointer"
            title="Restore all menus (Press H)"
          >
            <Eye className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="font-semibold">Show Menus</span>
            <span className="text-[10px] text-zinc-400 font-mono bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">H</span>
          </button>
        </div>
      )}

      {/* Movement hint if token is claimed */}
      {!isUiMinimized && claimedToken && (
        <div className="absolute top-20 left-4 z-40 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/60 rounded-xl px-3 py-1.5 text-[11px] font-mono text-zinc-400 flex items-center gap-2 pointer-events-none">
          <Move className="w-3.5 h-3.5 text-emerald-400" />
          <span>Use <b>Arrow Keys</b> or <b>Drag</b> on map to move {claimedToken.name}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* Floating Combat Tracker Banner (If combat is active)      */}
      {/* ========================================================= */}
      {!isUiMinimized && combatState.showCombatTracker && combatState.combatants.length > 0 && (
        <div className="absolute top-4 right-4 z-50 bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-2xl p-2.5 shadow-2xl pointer-events-auto max-w-md">
          <div className="flex items-center justify-between gap-3 mb-2 px-1 border-b border-zinc-800 pb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 font-mono">
              <Swords className="w-3.5 h-3.5" />
              <span>ROUND {combatState.round}</span>
            </div>
            <span className="text-[11px] text-zinc-500 font-mono">
              Turn {combatState.turnIndex + 1} of {combatState.combatants.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {combatState.combatants.map((c, idx) => {
              const isCurrentTurn = idx === combatState.turnIndex;
              const isPlayer = c.type === 'player';
              return (
                <div
                  key={c.id || idx}
                  className={`flex flex-col items-center p-1.5 rounded-xl min-w-[64px] border transition-all ${
                    isCurrentTurn
                      ? 'bg-amber-950/60 border-amber-500 scale-105 shadow-md shadow-amber-500/20'
                      : isPlayer
                      ? 'bg-zinc-800/60 border-zinc-700/60'
                      : 'bg-red-950/30 border-red-900/40'
                  }`}
                >
                  <span className={`text-[10px] font-bold truncate max-w-[60px] ${
                    isCurrentTurn ? 'text-amber-300' : isPlayer ? 'text-zinc-200' : 'text-red-300'
                  }`}>
                    {c.name}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-400">
                    Init: {c.initiative}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DM Broadcast Room Description Card                         */}
      {/* ========================================================= */}
      {!isUiMinimized && roomBroadcast && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 pointer-events-auto animate-in fade-in slide-in-from-bottom duration-300">
          <div className="bg-zinc-900/95 backdrop-blur-md border border-emerald-600/40 rounded-2xl p-4 shadow-2xl shadow-black/80">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-emerald-400">
                <MessageSquare className="w-4 h-4" />
                <span className="text-xs font-bold tracking-wider font-mono uppercase">
                  {roomBroadcast.title}
                </span>
                {roomBroadcast.voiceName && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 font-mono flex items-center gap-1">
                    <Volume2 className="w-3 h-3 animate-pulse" />
                    <span>{roomBroadcast.voiceName}</span>
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  if (activeNarrationAudioRef.current) {
                    activeNarrationAudioRef.current.pause();
                    activeNarrationAudioRef.current = null;
                  }
                  setRoomBroadcast(null);
                }}
                className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded-lg transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-zinc-200 font-serif leading-relaxed italic whitespace-pre-wrap">
              "{roomBroadcast.boxedText}"
            </p>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Character Claim Menu Modal                                */}
      {/* ========================================================= */}
      {showClaimMenu && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 pointer-events-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 max-w-md w-full shadow-2xl shadow-black/80">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-zinc-100 font-mono">Claim Your Character</h3>
              </div>
              <button
                onClick={() => setShowClaimMenu(false)}
                className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400 mb-3">
              Select which token you control. Once claimed, you can move your token on the grid using your arrow keys or mouse drag.
            </p>

            <div className="max-h-64 overflow-y-auto space-y-2 mb-4 pr-1">
              {candidateTokens.length === 0 ? (
                <div className="text-center py-6 text-zinc-500 text-xs font-mono">
                  No tokens currently on this battlemap.
                </div>
              ) : (
                candidateTokens.map((t) => {
                  const isSelected = claimedTokenId === t.id;
                  const tStats = resolveTokenCharacterStats(t, compendiumCharacters);
                  return (
                    <div
                      key={t.id}
                      onClick={() => handleClaimToken(t.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200 shadow-sm'
                          : 'bg-zinc-800/40 border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:bg-zinc-800/70'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                          {(() => {
                            const avatarSrc = t.url || t.avatarUrl || getCharacterTokenUrl(t.name);
                            return avatarSrc ? (
                              <img src={avatarSrc} alt={t.name} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-zinc-500" />
                            );
                          })()}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-zinc-100">{t.name}</div>
                          <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-2 mt-0.5">
                            <span className="text-emerald-400 font-semibold">HP {tStats.currentHp}/{tStats.maxHp}</span>
                            <span>•</span>
                            <span className="text-sky-400 font-semibold">AC {tStats.ac}</span>
                          </div>
                        </div>
                      </div>
                      {isSelected ? (
                        <div className="flex items-center gap-1 text-xs text-emerald-400 font-bold font-mono">
                          <Check className="w-4 h-4" />
                          <span>Seized</span>
                        </div>
                      ) : (
                        <button className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1 rounded-lg transition-colors border border-zinc-700">
                          Seize
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {claimedTokenId && (
              <div className="border-t border-zinc-800 pt-3 flex justify-end">
                <button
                  onClick={handleReleaseToken}
                  className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Release Current Character
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Floating Zoom Controls                                    */}
      {/* ========================================================= */}
      {!isUiMinimized && (
        <div className="absolute bottom-6 right-6 z-50 flex items-center gap-1.5 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-xl p-1.5 shadow-xl pointer-events-auto">
          <button
            onClick={() => handleZoom(1.2)}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom(0.8)}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Reset to 1x1 32-inch TV Scale"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              applyTvScale();
              toast.info('Calibrated to 1" grid for 32" TV');
            }}
            className="px-2 py-1.5 rounded-lg text-amber-400 hover:text-amber-200 hover:bg-zinc-800 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Calibrate 1x1 Grid for 32-inch TV Tabletop"
          >
            <Tv className="w-4 h-4" />
            <span className="text-[10px] hidden sm:inline">1" TV</span>
          </button>
          <div className="w-[1px] h-4 bg-zinc-700/60 mx-0.5" />
          <button
            onClick={() => setIsUiMinimized(true)}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Minimize all menus (Press H)"
          >
            <EyeOff className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {(!image || imageStatus === 'loading') && imageFile && !isVideo && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm pointer-events-none">
          <div className="flex flex-col items-center gap-3 text-zinc-400">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            <span className="text-sm font-mono tracking-wider text-zinc-300">
              Mounting Full-Resolution Battlemap...
            </span>
          </div>
        </div>
      )}

      {/* Empty State when no map is active */}
      {!imageFile && !image && (
        <div className="absolute inset-0 z-30 flex items-center justify-center text-zinc-500 pointer-events-none select-none">
          <div className="relative z-10 flex flex-col items-center gap-3 text-center max-w-md bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/90 rounded-3xl p-8 shadow-[0_25px_60px_rgba(0,0,0,0.9)] ring-1 ring-white/10 animate-in fade-in">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900/90 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Radio className="w-8 h-8 text-emerald-400 animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold">Player View Online</span>
            </div>
            <h3 className="text-xl font-bold text-white font-mono tracking-tight">Waiting for Dungeon Master...</h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              When the DM loads a battlemap scene, it will immediately project here in real-time.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Fullscreen Konva Stage Canvas                              */}
      {/* ========================================================= */}
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
        draggable={!activePlayerTool}
        className={activePlayerTool ? 'cursor-crosshair' : 'cursor-default'}
        onContextMenu={(e) => e.evt.preventDefault()}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onDragMove={(e) => {
          if (e.target === e.target.getStage()) {
            setStagePos({ x: e.target.x(), y: e.target.y() });
          }
        }}
        onDragEnd={(e) => {
          if (e.target === e.target.getStage()) {
            setStagePos({ x: e.target.x(), y: e.target.y() });
          }
        }}
        onWheel={(e) => {
          e.evt.preventDefault();
          const scaleBy = 1.08;
          const stage = e.target.getStage();
          if (!stage) return;
          const oldScale = stage.scaleX();
          const pointer = stage.getPointerPosition();
          if (!pointer) return;

          const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
          };

          const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
          const clampedScale = Math.max(0.1, Math.min(newScale, 5));

          setStageScale(clampedScale);
          setStagePos({
            x: pointer.x - mousePointTo.x * clampedScale,
            y: pointer.y - mousePointTo.y * clampedScale,
          });
        }}
      >
        {/* Layer 1: Background Map Image or Video */}
        <Layer ref={bgLayerRef}>
          {isVideo && videoElement ? (
            <KonvaImage
              image={videoElement}
              width={targetMapW}
              height={targetMapH}
              {...getImageTransform(targetMapW, targetMapH, mapRotation)}
            />
          ) : image ? (
            <KonvaImage
              image={image}
              width={targetMapW}
              height={targetMapH}
              {...getImageTransform(targetMapW, targetMapH, mapRotation)}
            />
          ) : null}
        </Layer>

        {/* Layer 2: Grid Layer */}
        {gridVisible && (
          <GridLayer
            mapWidth={targetMapW}
            mapHeight={targetMapH}
            gridSize={gridSize}
            gridOffsetX={gridOffsetX}
            gridOffsetY={gridOffsetY}
            gridOpacity={gridOpacity}
            stageScale={stageScale}
          />
        )}

        {/* Layer 2.5: Board Animated Features & Environmental FX (Rendered UNDERNEATH Fog of War so unrevealed areas stay completely dark) */}
        {boardAnimatedEnabled && targetMapW > 0 && targetMapH > 0 && (
          <Layer listening={false}>
            <Group {...getImageTransform(targetMapW, targetMapH, mapRotation)}>
              <AnimatedFeaturesKonvaImage
                enabled={boardAnimatedEnabled}
                features={boardAnimatedFeatures}
                weatherEffect={boardWeatherEffect}
                walls={walls}
                mapDimensions={{ width: targetMapW, height: targetMapH }}
              />
            </Group>
          </Layer>
        )}

        {/* Layer 2.7: Spell Effects Layer (Synchronized AOE Templates & Procedural Spells - Rendered UNDERNEATH Fog of War so unrevealed effects stay hidden) */}
        <Layer listening={false}>
          {effects
            .filter(isEffectVisibleToPlayer)
            .map((effect) => {
              const isCircle = effect.type === 'circle';
              const isCone = effect.type === 'cone';
              const isLine = effect.type === 'line';
              const effectColor = effect.color || '#3b82f6';

              const age = effect.createdAt ? (Date.now() - effect.createdAt) : 0;
              const computedOpacity = ((effect.createdAt && !effect.isPersistent && age > 4000)
                ? Math.max(0, 1 - (age - 4000) / 1000)
                : 1) * (effect.opacity !== undefined ? effect.opacity : 1.0);

              return (
                <Group key={effect.id} x={effect.x} y={effect.y} listening={false} opacity={computedOpacity}>
                  {isCircle && (
                    effect.imageUrl ? (
                      <Group>
                        <Circle
                          radius={effect.size}
                          fill={effectColor}
                          opacity={0.15}
                          stroke={effectColor}
                          strokeWidth={2 / stageScale}
                          dash={[6, 4]}
                          shadowColor={effectColor}
                          shadowBlur={8}
                        />
                        <GifImage
                          src={effect.imageUrl}
                          x={0}
                          y={0}
                          width={effect.size * 2}
                          height={effect.size * 2}
                          offsetX={effect.size}
                          offsetY={effect.size}
                          opacity={0.85}
                          rotation={effect.rotation || 0}
                          globalCompositeOperation={effect.blendMode || "screen"}
                        />
                      </Group>
                    ) : (
                      <ProceduralSpellEffect
                        effect={effect as any}
                        gridSize={gridSize}
                        stageScale={stageScale}
                      />
                    )
                  )}
                  {isCone && (
                    <>
                      <Arc
                        angle={60}
                        innerRadius={0}
                        outerRadius={effect.size}
                        rotation={(effect.rotation || 0) - 30}
                        fill={effectColor}
                        opacity={effect.imageUrl ? 0.15 : 0.35}
                        stroke={effectColor}
                        strokeWidth={2 / stageScale}
                        shadowColor={effectColor}
                        shadowBlur={8}
                      />
                      {effect.imageUrl && (
                        <GifImage
                          src={effect.imageUrl}
                          x={0}
                          y={0}
                          width={effect.size * 2}
                          height={effect.size * 2}
                          offsetX={0}
                          offsetY={effect.size}
                          rotation={effect.rotation || 0}
                          opacity={0.85}
                          globalCompositeOperation={effect.blendMode || "lighter"}
                        />
                      )}
                    </>
                  )}
                  {isLine && (
                    <>
                      <Rect
                        width={effect.size}
                        height={gridSize}
                        rotation={effect.rotation || 0}
                        fill={effectColor}
                        opacity={effect.imageUrl ? 0.15 : 0.35}
                        stroke={effectColor}
                        strokeWidth={2 / stageScale}
                        shadowColor={effectColor}
                        shadowBlur={8}
                      />
                      {effect.imageUrl && (
                        <GifImage
                          src={effect.imageUrl}
                          x={0}
                          y={0}
                          width={effect.size}
                          height={gridSize * 2}
                          offsetY={gridSize}
                          rotation={effect.rotation || 0}
                          opacity={0.85}
                          globalCompositeOperation={effect.blendMode || "lighter"}
                        />
                      )}
                    </>
                  )}
                  {effect.label && (
                    <Text
                      text={effect.label}
                      fill="white"
                      fontSize={12}
                      fontStyle="bold"
                      align="center"
                      shadowColor="black"
                      shadowBlur={4}
                      y={-14}
                    />
                  )}
                </Group>
              );
            })}

          {/* Interactive Player Aiming Preview */}
          {isAiming && aimOrigin && equippedSpell && (
            <Group listening={false}>
              {(() => {
                const currentX = aimCurrent ? aimCurrent.x : aimOrigin.x;
                const currentY = aimCurrent ? aimCurrent.y : aimOrigin.y;
                const dx = currentX - aimOrigin.x;
                const dy = currentY - aimOrigin.y;
                const dragDist = Math.hypot(dx, dy);
                const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
                const previewSize = dragDist >= 15 ? dragDist : (equippedSpell.defaultSizeFt / 5) * gridSize;
                const previewColor = equippedSpell.color || '#a855f7';

                if (equippedSpell.type === 'cone') {
                  return (
                    <Group x={aimOrigin.x} y={aimOrigin.y}>
                      <Arc
                        angle={60}
                        innerRadius={0}
                        outerRadius={previewSize}
                        rotation={angle - 30}
                        fill={previewColor}
                        opacity={0.35}
                        stroke="#ffffff"
                        strokeWidth={2 / stageScale}
                        dash={[6, 4]}
                        shadowColor="#ffffff"
                        shadowBlur={10}
                      />
                      <Line
                        points={[0, 0, Math.cos((angle * Math.PI) / 180) * previewSize, Math.sin((angle * Math.PI) / 180) * previewSize]}
                        stroke="#ffffff"
                        strokeWidth={1.5 / stageScale}
                        dash={[4, 4]}
                      />
                      <Text
                        text={`${equippedSpell.name} (${Math.round((previewSize / gridSize) * 5)}ft cone)`}
                        fill="white"
                        fontSize={13 / stageScale}
                        fontStyle="bold"
                        shadowColor="black"
                        shadowBlur={4}
                        x={previewSize * 0.5 * Math.cos((angle * Math.PI) / 180)}
                        y={previewSize * 0.5 * Math.sin((angle * Math.PI) / 180) - 20 / stageScale}
                      />
                    </Group>
                  );
                } else if (equippedSpell.type === 'line') {
                  return (
                    <Group x={aimOrigin.x} y={aimOrigin.y} rotation={angle}>
                      <Rect
                        width={previewSize}
                        height={gridSize}
                        offsetY={gridSize / 2}
                        fill={previewColor}
                        opacity={0.35}
                        stroke="#ffffff"
                        strokeWidth={2 / stageScale}
                        dash={[6, 4]}
                        shadowColor="#ffffff"
                        shadowBlur={10}
                      />
                      <Text
                        text={`${equippedSpell.name} (${Math.round((previewSize / gridSize) * 5)}ft line)`}
                        fill="white"
                        fontSize={13 / stageScale}
                        fontStyle="bold"
                        shadowColor="black"
                        shadowBlur={4}
                        x={previewSize / 2 - 40 / stageScale}
                        y={-18 / stageScale}
                      />
                    </Group>
                  );
                } else {
                  return (
                    <Group x={aimOrigin.x} y={aimOrigin.y}>
                      <Circle
                        radius={previewSize}
                        fill={previewColor}
                        opacity={0.3}
                        stroke="#ffffff"
                        strokeWidth={2 / stageScale}
                        dash={[6, 4]}
                        shadowColor="#ffffff"
                        shadowBlur={10}
                      />
                      {dragDist >= 15 && (
                        <Line
                          points={[0, 0, dx, dy]}
                          stroke="#ffffff"
                          strokeWidth={1.5 / stageScale}
                          dash={[4, 4]}
                        />
                      )}
                      <Text
                        text={`${equippedSpell.name} (${Math.round((previewSize / gridSize) * 5)}ft radius)`}
                        fill="white"
                        fontSize={13 / stageScale}
                        fontStyle="bold"
                        shadowColor="black"
                        shadowBlur={4}
                        align="center"
                        x={-60 / stageScale}
                        y={-previewSize - 18 / stageScale}
                      />
                    </Group>
                  );
                }
              })()}
            </Group>
          )}
        </Layer>

        {/* Layer 3: Dynamic Lighting & Fog of War (Raycasting with Doors, Walls & Torches) */}
        <DynamicLightingLayer
          walls={walls}
          tokens={tokens}
          gridSize={gridSize}
          mapDimensions={{ width: targetMapW, height: targetMapH }}
          isPlayerView={true}
          claimedTokenId={claimedTokenId}
          campaignMode="run"
          visionConfig={visionConfig}
          stageScale={stageScale}
          tool="select"
          selectedWallId={null}
          onSelectWall={() => {}}
          onToggleDoor={handleToggleDoor}
          isFogVisible={isFogVisible}
          reveals={reveals}
          polygonReveals={polygonReveals}
          wallDrawStart={null}
          mousePos={{ x: 0, y: 0 }}
          animatedFeatures={boardAnimatedFeatures}
        />

        {/* Layer 5: Tokens Layer (Rendered on top of fog so token opacity is 100% solid, while monsters in fog are filtered out) */}
        <Layer>
          {tokens
            .filter(isTokenVisibleToPlayer)
            .map((token) => (
              <PlayerToken
                key={token.id}
                token={token}
                gridSize={gridSize}
                characters={compendiumCharacters}
                isClaimed={claimedTokenId === token.id}
                onMoveToken={handleMoveToken}
                onDragMoveToken={handleDragMoveToken}
                onDragStartToken={handleDragStartToken}
                onClaimToken={handleClaimToken}
                onContextMenu={handleOpenTokenContextMenu}
              />
          ))}
        </Layer>
      </Stage>

      {/* ========================================================= */}
      {/* Token Right-Click Context Menu Popup (Mirrored from DM)   */}
      {/* ========================================================= */}
      {activeTokenMenu && (() => {
        const currentToken = tokens.find(t => t.id === activeTokenMenu.id);
        if (!currentToken || !isTokenVisibleToPlayer(currentToken)) return null;

        const matchingChar = compendiumCharacters?.find(c => 
          c.id === currentToken.id || c.name.toLowerCase() === currentToken.name.toLowerCase()
        );
        const isCharacter = currentToken.isPlayer || currentToken.category === 'character' || !!matchingChar;
        const displayAc = currentToken.ac ?? matchingChar?.ac ?? 10;
        const displayHp = currentToken.currentHp ?? currentToken.hp ?? matchingChar?.hp ?? matchingChar?.maxHp ?? 10;
        const displayMaxHp = currentToken.maxHp ?? matchingChar?.maxHp ?? matchingChar?.hp ?? 10;

        const menuX = Math.max(16, Math.min(activeTokenMenu.x, window.innerWidth - 275));
        const menuY = Math.max(16, Math.min(activeTokenMenu.y, window.innerHeight - 340));
        const isCurrentClaimed = claimedTokenId === currentToken.id;

        return (
          <div 
            id="player-token-context-menu"
            className="fixed z-[300] bg-zinc-950/95 backdrop-blur-xl border border-zinc-700/80 rounded-xl shadow-2xl p-3.5 w-64 animate-in fade-in zoom-in-95 select-none"
            style={{ left: menuX, top: menuY }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            {/* Context Menu Header */}
            <div className="flex justify-between items-center mb-2.5 pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2 overflow-hidden">
                {(() => {
                  const avatarSrc = currentToken.url || currentToken.avatarUrl || getCharacterTokenUrl(currentToken.name);
                  return avatarSrc ? (
                    <div className="w-5 h-5 rounded-full overflow-hidden border border-zinc-700 shrink-0 bg-zinc-800">
                      <img src={avatarSrc} alt={currentToken.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <span className={`w-2 h-2 rounded-full ${isCharacter ? 'bg-emerald-400' : 'bg-amber-400'} shrink-0`} />
                  );
                })()}
                <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest truncate font-mono">
                  {currentToken.name || 'Token Settings'}
                </span>
              </div>
              <button 
                type="button"
                onClick={() => setActiveTokenMenu(null)} 
                className="text-zinc-500 hover:text-white text-base leading-none p-0.5 cursor-pointer"
                title="Close (Escape)"
              >
                ×
              </button>
            </div>
            
            {/* Tab Navigation: Stats & Info vs Conditions */}
            <div className="flex items-center gap-1 mb-2.5 bg-zinc-900/90 p-1 rounded-lg border border-zinc-800">
              <button
                type="button"
                onClick={() => setTokenMenuTab('stats')}
                className={`flex-1 py-1 rounded-md text-[10px] font-bold font-mono transition-all cursor-pointer ${
                  tokenMenuTab === 'stats'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Stats & Info
              </button>
              <button
                type="button"
                onClick={() => setTokenMenuTab('conditions')}
                className={`flex-1 py-1 rounded-md text-[10px] font-bold font-mono transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  tokenMenuTab === 'conditions'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Conditions
                {(currentToken.conditions?.length || 0) > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                )}
              </button>
            </div>
            
            {tokenMenuTab === 'stats' ? (
              <div className="space-y-2.5">
                {/* Claim / Seize Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (isCurrentClaimed) {
                      handleReleaseToken();
                    } else {
                      handleClaimToken(currentToken.id);
                    }
                  }}
                  className={`w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                    isCurrentClaimed
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30'
                      : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isCurrentClaimed ? 'Claimed by You (Unclaim)' : 'Claim This Character'}</span>
                </button>

                {/* Token Name Input */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-zinc-400 uppercase font-bold tracking-tighter">Token Name</label>
                  <input
                    type="text"
                    className="bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200 px-2 py-1.5 focus:outline-none focus:border-amber-500 font-mono"
                    value={currentToken.name || ''}
                    onChange={(e) => {
                      handleUpdateToken(currentToken.id, { name: e.target.value });
                    }}
                  />
                </div>

                {/* AC, HP, Max HP inputs */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-blue-400 uppercase font-bold tracking-tighter">AC</label>
                    <input
                      type="number"
                      className="bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-blue-400 px-2 py-1.5 focus:outline-none focus:border-blue-500 font-mono"
                      value={displayAc}
                      placeholder="AC"
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        const num = isNaN(val) ? 10 : val;
                        handleUpdateToken(currentToken.id, { ac: num });
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-emerald-400 uppercase font-bold tracking-tighter">HP</label>
                    <input
                      type="number"
                      className="bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-emerald-400 px-2 py-1.5 focus:outline-none focus:border-emerald-500 font-mono"
                      value={displayHp}
                      placeholder="HP"
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        const num = isNaN(val) ? undefined : val;
                        handleUpdateToken(currentToken.id, { currentHp: num, hp: num });
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-zinc-400 uppercase font-bold tracking-tighter">Max</label>
                    <input
                      type="number"
                      className="bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200 px-2 py-1.5 focus:outline-none focus:border-amber-500 font-mono"
                      value={displayMaxHp}
                      placeholder="Max"
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        const num = isNaN(val) ? undefined : val;
                        handleUpdateToken(currentToken.id, { maxHp: num });
                      }}
                    />
                  </div>
                </div>

                {/* Delete Token from board */}
                <button 
                  type="button"
                  onClick={() => handleDeleteToken(currentToken.id)}
                  className="w-full flex items-center justify-center gap-2 py-1.5 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer mt-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Token</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[9px] font-mono text-zinc-400 uppercase font-bold tracking-tighter">D&D Status Conditions</span>
                  <span className="text-[9px] font-mono text-rose-400 font-bold">{(currentToken.conditions || []).length} Active</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto sidebar-scrollbar pr-1">
                  {DND_CONDITIONS.map(cond => {
                    const activeConditions = currentToken.conditions || [];
                    const isActive = activeConditions.includes(cond);
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => {
                          const nextConditions = isActive
                            ? activeConditions.filter(c => c !== cond)
                            : [...activeConditions, cond];
                          handleUpdateToken(currentToken.id, { conditions: nextConditions });
                        }}
                        className={`px-2 py-1.5 rounded-lg text-left text-[11px] font-mono font-bold transition-all flex items-center justify-between border cursor-pointer ${
                          isActive 
                            ? 'bg-rose-500/20 border-rose-500/60 text-rose-200 shadow-sm' 
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                        }`}
                      >
                        <span className="truncate">{cond}</span>
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Backdrop to close right-click menu when clicking away */}
      {activeTokenMenu && (
        <div 
          className="fixed inset-0 z-[299]" 
          onClick={() => setActiveTokenMenu(null)}
          onContextMenu={(e) => { e.preventDefault(); setActiveTokenMenu(null); }}
        />
      )}

      {/* Interactive Aiming Banner */}
      {activePlayerTool && equippedSpell && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-purple-950/95 border border-purple-500/70 text-white px-5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-3 pointer-events-auto">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-400 animate-ping" />
            <Sparkles className="w-4 h-4 text-purple-300" />
            <span className="font-bold text-sm tracking-wide text-purple-100">
              Aiming: {equippedSpell.name}
            </span>
          </div>
          <span className="text-xs text-purple-300/80 hidden md:inline">
            Click & drag on the map to size & aim. Release to cast.
          </span>
          <button
            onClick={() => {
              setActivePlayerTool(null);
              setEquippedSpell(null);
              setIsAiming(false);
              setAimOrigin(null);
              setAimCurrent(null);
            }}
            className="ml-2 flex items-center gap-1 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white px-2.5 py-1 rounded-xl text-xs font-mono border border-zinc-700 transition-colors cursor-pointer"
            title="Cancel casting (Escape)"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel (ESC)</span>
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* Player Spell & AoE Effects Floating Panel                 */}
      {/* ========================================================= */}
      {showEffectsPanel && !isUiMinimized && (
        <div
          style={{
            left: pinnedEffectsPanel ? 16 : panelPos.x,
            top: pinnedEffectsPanel ? 72 : panelPos.y
          }}
          className="fixed z-50 w-88 sm:w-96 max-h-[calc(100vh-90px)] flex flex-col bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/90 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] ring-1 ring-white/10 animate-in fade-in zoom-in-95 pointer-events-auto select-none"
        >
          {/* Header & Move Handle */}
          <div
            onMouseDown={handlePanelDragStart}
            className={`flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 ${
              pinnedEffectsPanel ? '' : 'cursor-move'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs tracking-wide text-zinc-100 font-mono">
                    SPELL & AOE EFFECTS
                  </span>
                  {effects.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800/50">
                      {effects.length} Active
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-zinc-400">
                  {pinnedEffectsPanel ? 'Pinned to top-left' : 'Drag header to move panel'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPinnedEffectsPanel(prev => !prev)}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  pinnedEffectsPanel
                    ? 'bg-purple-950/60 border-purple-700/60 text-purple-300'
                    : 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
                title={pinnedEffectsPanel ? 'Unpin Panel' : 'Pin Panel to Side'}
              >
                <Pin className={`w-3.5 h-3.5 ${pinnedEffectsPanel ? 'fill-purple-400' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setShowEffectsPanel(false)}
                className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Close Panel (Escape)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Search */}
          <div className="px-3 pt-2.5 pb-1">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={effectsSearchQuery}
                onChange={(e) => setEffectsSearchQuery(e.target.value)}
                placeholder="Search spells or hazards..."
                className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500/70"
              />
              {effectsSearchQuery && (
                <button
                  type="button"
                  onClick={() => setEffectsSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-zinc-800/60 overflow-x-auto">
            <button
              type="button"
              onClick={() => setEffectsTab('instant')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-all cursor-pointer ${
                effectsTab === 'instant'
                  ? 'bg-purple-600/80 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              Instant
            </button>
            <button
              type="button"
              onClick={() => setEffectsTab('persistent')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-all cursor-pointer ${
                effectsTab === 'persistent'
                  ? 'bg-purple-600/80 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              Persistent
            </button>
            <button
              type="button"
              onClick={() => setEffectsTab('tactical')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-all cursor-pointer ${
                effectsTab === 'tactical'
                  ? 'bg-purple-600/80 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              Tactical
            </button>
            <button
              type="button"
              onClick={() => setEffectsTab('active')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-all flex items-center gap-1 cursor-pointer ${
                effectsTab === 'active'
                  ? 'bg-purple-600/80 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <span>On Board</span>
              {effects.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-purple-900 text-purple-200 text-[9px] flex items-center justify-center font-bold">
                  {effects.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab Body */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[50vh] min-h-[160px]">
            {effectsTab === 'active' ? (
              // Active Effects on Scene
              effects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-zinc-500">
                  <Sparkles className="w-8 h-8 mb-2 opacity-40 text-purple-400" />
                  <p className="text-xs font-medium text-zinc-400">No active effects on board</p>
                  <p className="text-[11px] text-zinc-600 mt-1">
                    Drag or cast an effect from the Instant, Persistent, or Tactical tabs.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-1 px-1">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">
                      {effects.length} Active {effects.length === 1 ? 'Effect' : 'Effects'}
                    </span>
                    <button
                      type="button"
                      onClick={handleClearAllEffects}
                      className="text-[10px] text-rose-400 hover:text-rose-300 font-mono hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear All</span>
                    </button>
                  </div>

                  {effects.map((eff) => {
                    const isMine = claimedTokenId && eff.placedById === claimedTokenId;
                    return (
                      <div
                        key={eff.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800/90 hover:border-zinc-700 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: eff.color || '#a855f7' }}
                          />
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-zinc-200 truncate">
                                {eff.label || 'Spell Effect'}
                              </span>
                              {eff.isPersistent ? (
                                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800/50">
                                  Persistent
                                </span>
                              ) : (
                                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-zinc-800 text-zinc-400">
                                  5s
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {eff.type.toUpperCase()} • {Math.round((eff.size / gridSize) * 5)}ft • {isMine ? 'Cast by you' : (eff.placedByName || 'Scene')}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveEffect(eff.id)}
                          className="p-1.5 rounded-lg border border-zinc-800 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 hover:border-rose-800/60 transition-colors shrink-0 cursor-pointer"
                          title="Dismiss Effect"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              // Spell Catalog List (Instant, Persistent, Tactical)
              (() => {
                const filteredSpells = PLAYER_EFFECTS_CATALOG
                  .filter(s => s.category === effectsTab)
                  .filter(s => {
                    if (!effectsSearchQuery) return true;
                    const q = effectsSearchQuery.toLowerCase();
                    return (
                      s.name.toLowerCase().includes(q) ||
                      s.label.toLowerCase().includes(q) ||
                      s.description.toLowerCase().includes(q) ||
                      s.type.toLowerCase().includes(q)
                    );
                  });

                if (filteredSpells.length === 0) {
                  return (
                    <div className="py-8 text-center text-zinc-500 text-xs">
                      No matching spells found.
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {filteredSpells.map((spell) => {
                      const isEquipped = activePlayerTool === spell.id;
                      return (
                        <div
                          key={spell.id}
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/dnd-effect', spell.id);
                            e.dataTransfer.setData('text/plain', spell.id);
                            e.dataTransfer.effectAllowed = 'copy';
                          }}
                          className={`group relative p-2.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
                            isEquipped
                              ? 'bg-purple-950/50 border-purple-500 shadow-md ring-1 ring-purple-500/40'
                              : 'bg-zinc-900/70 border-zinc-800/90 hover:bg-zinc-900 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-zinc-800/90 border border-zinc-700/60 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                                {renderSpellIcon(spell.iconName, "w-4 h-4 text-purple-400")}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold text-zinc-100 group-hover:text-purple-300 transition-colors">
                                    {spell.name}
                                  </span>
                                  <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded border ${spell.badgeColor}`}>
                                    {spell.defaultSizeFt}ft {spell.type}
                                  </span>
                                  {spell.isPersistent && (
                                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-950/70 text-amber-300 border border-amber-800/50">
                                      AoE
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-zinc-400 leading-snug mt-1 font-sans">
                                  {spell.description}
                                </p>
                              </div>
                            </div>

                            {/* Cast / Aim Action Button */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isEquipped) {
                                    setActivePlayerTool(null);
                                    setEquippedSpell(null);
                                    setIsAiming(false);
                                  } else {
                                    handleEquipSpell(spell);
                                  }
                                }}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1 transition-all shadow-sm cursor-pointer ${
                                  isEquipped
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                    : 'bg-purple-600 hover:bg-purple-500 text-white hover:shadow-purple-900/30'
                                }`}
                                title={isEquipped ? 'Cancel Aiming' : 'Click & drag on map to aim'}
                              >
                                {isEquipped ? (
                                  <>
                                    <X className="w-3 h-3" />
                                    <span>Cancel</span>
                                  </>
                                ) : (
                                  <>
                                    <Target className="w-3 h-3" />
                                    <span>Cast</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Drag Hint Pill */}
                          <div className="mt-2 pt-1.5 border-t border-zinc-800/40 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                            <span className="flex items-center gap-1">
                              <GripHorizontal className="w-3 h-3 text-zinc-600" />
                              <span>Drag card directly onto map</span>
                            </span>
                            <span className="text-zinc-600">or click Cast</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </div>

          {/* Panel Footer */}
          <div className="px-3 py-2 border-t border-zinc-800/80 bg-zinc-900/50 rounded-b-2xl flex items-center justify-between text-[10px] text-zinc-500 font-mono">
            <span>Synchronized across DM & Players</span>
            <span className="text-purple-400">MistWalker FX</span>
          </div>
        </div>
      )}

      {/* Toast Notification Container for Player View */}
      <Toaster position="bottom-right" theme="dark" richColors />
    </div>
  );
}
