import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Konva from 'konva';
import { Stage, Layer, Image as KonvaImage, Text, Group, Circle, Rect, Arc, Line } from 'react-konva';

if (typeof window !== 'undefined' && (Konva as any)?.dragDistance !== undefined) {
  (Konva as any).dragDistance = 10;
}
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
  ChevronLeft,
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
  Info,
  Dices,
  Palette,
  Menu,
  Maximize,
  Minimize,
  Scroll
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { DynamicLightingLayer } from './DynamicLightingLayer';
import { GridLayer } from './GridLayer';
import { AnimatedFeaturesKonvaImage, AnimatedFeature, WeatherEffectType } from './AnimatedMapOverlay';
import { DiceTableOverlay } from './DiceTableOverlay';
import { PlayerDiceRollerModal } from './PlayerDiceRollerModal';
import { DdbDiceRollEvent } from '../types/dice';
import { DICE_COLOR_PRESETS, DiceColorPreset } from '../graphics/dice/diceTextures';
import { WallSegment, VisionConfig, RoomAnnotation, normalizeRoomAnnotations, Combatant, isMonsterToken, AURA_PRESETS, AURA_COLOR_PALETTE, TokenAura, AuraPreset } from '../types';
import { getAuraVideoUrl } from '../effects/db/tokenFxMap';
import homeBackgroundImage from '../assets/images/home_background.jpg';
import sceneBackdropImage from '../assets/images/scene_backdrop.jpg';
import { base64AudioToBlob, getNarrationVoice } from '../services/audioNarrationService';
import {
  DEFAULT_CHARACTERS,
  resolveTokenCharacterStats,
  getCharacterTokenUrl,
  CHARACTER_TOKEN_IMAGES, getCharacterTokenDisplayName, resolveTokenDdbCharacterId,
  isDdbMatch
} from '../data/defaultCharacters';
import { repairMonsterToken } from '../data/srdMonstersCatalog';
import { Character } from '../types/character';
import {
  computeVisibilityPolygon,
  isPointInPolygon,
  distanceBetween,
  segmentsIntersect,
  isLineOfSightBlocked,
  isWallOccluding,
  VisionSource,
  VisibilityPolygon
} from '../lib/visionEngine';
import { subscribeToActiveSession } from '../lib/firebase';
import {
  VttEffectInstance,
  Jb2aAssetDefinition,
  DomEffectOverlay,
  AimReticle,
  EffectsDrawer,
  videoCacheManager,
  soundCatalog,
  JB2A_REGISTRY,
  findJb2aAsset,
  getDirectionalConeOrigin,
  TokenStatusBubble,
  findLastingDebuffConfig,
  createDebuffBubbleFromConfig,
  TokenBubblesKonvaOverlay
} from '../effects';
import { PlayerStationModal, PlayerStationMode } from './PlayerStationModal';
import { PlayerCharacterSelectModal, PlayerCharacterChoiceItem } from './PlayerCharacterSelectModal';
import { PlayerDdbPrivacyModal } from './PlayerDdbPrivacyModal';
import { PlayerHeroDock } from './PlayerHeroDock';
import { WildShapeModal } from './WildShapeModal';
import { CombatDicePromptModal, PendingCombatRoll, RollAdvantageMode } from './CombatDicePromptModal';
import { WildShapeBeastForm, ActiveWildShapeState, GAIAH_WILD_SHAPE_FORMS } from '../types/wildShape';
import { DndRuleInspectionModal } from './DndRuleInspectionModal';
import { canTokenHaveHalo } from '../effects/db/tokenFxMap';
import { DndRuleEntry, lookupDndRuleDetails } from '../data/dndRulesCompendium';
import {
  HudCharacterData,
  HudActionItem,
  computeUpcastFormula,
  evaluateDiceFormula,
  normalizePlayerAutoRollKey,
  loadPlayerAutoRollMap,
  savePlayerAutoRollPreference
} from '../types/hud';
import { TokenDragRuler, TokenDragState, parseSpeedFt } from './TokenDragRuler';
import { RoomHotspotLayer } from './RoomHotspotLayer';
import {
  computeFlightLiftMetrics,
  TokenGroundFootprint,
  TokenAerialOverlay,
  useTokenFlightAnimation
} from './TokenFlightElevation';
import { MapPingLayer, useLeftClickHoldPing, MapPingItem } from './MapPingOverlay';
import {
  useHandoutsJournalSystem,
  HandoutsJournalModal,
  HandoutSpotlightModal
} from './HandoutsJournalSystem';
import {
  useAudioMixerJukebox,
  MapAudioSourcesLayer
} from './AudioMixerJukebox';
import { PlayerArenaMode } from './PlayerArenaMode';

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
  isCondition?: boolean;
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
  auraRadius?: number;
  auraColor?: string;
  auraOpacity?: number;
  auraName?: string;
  auraPulse?: boolean;
  auras?: TokenAura[];
  speed?: number;
  elevation?: number;
  isFlying?: boolean;
  haloActive?: boolean;
  videoUrl?: string;
  bubbles?: TokenStatusBubble[];
}

/**
 * Normalizes a token ensuring both url and avatarUrl are authoritative image strings,
 * and repairs any monster tokens with missing or generic fallback icons/sizes.
 */
function normalizeToken(t: any): Token {
  const repaired = repairMonsterToken(t);
  const direct = repaired.url || repaired.avatarUrl;
  const isMon = Boolean(repaired.isMonster || repaired.category === 'monster' || (!repaired.isCondition && repaired.isPlayer === false && repaired.category !== 'ally' && !repaired.allyId));
  const resolved = (direct && typeof direct === 'string' && direct.trim() !== '')
    ? direct
    : (isMon ? '/uploads/file-1792077381663-439615846.png' : getCharacterTokenUrl(repaired.name || '', direct));
  return {
    ...repaired,
    url: resolved,
    avatarUrl: resolved
  };
}

/** Finds the active Spiritual Weapon token owned by the given caster token id. */
function findSpiritualWeapon(list: Token[], ownerId?: string | null): Token | undefined {
  if (!ownerId) return undefined;
  return list.find(t => (t as any).spiritualWeapon && (t as any).spiritualWeapon.ownerId === ownerId);
}

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
  fogResetKey?: number;
  roomAnnotations?: RoomAnnotation[];
  mapRotation?: number;
  imageFile?: string | null;
  boardAnimatedFeatures?: AnimatedFeature[];
  boardAnimatedEnabled?: boolean;
  boardWeatherEffect?: WeatherEffectType;
  characters?: Character[];
  combatants?: Combatant[];
  effects?: VttEffectInstance[];
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
  gridOffsetX = 0,
  gridOffsetY = 0,
  isClaimed,
  characters,
  combatants,
  stageScale = 1,
  canDrag = true,
  isTargetingActive = false,
  onTargetToken,
  onMoveToken,
  onDragMoveToken,
  onDragStartToken,
  onClaimToken,
  onContextMenu,
  showHp = true
}: {
  showHp?: boolean;
  token: Token;
  gridSize: number;
  gridOffsetX?: number;
  gridOffsetY?: number;
  isClaimed: boolean;
  characters?: Character[];
  combatants?: Combatant[];
  stageScale?: number;
  canDrag?: boolean;
  isTargetingActive?: boolean;
  onTargetToken?: (token: Token) => void;
  onMoveToken: (id: string, x: number, y: number, distanceMovedFt?: number) => void;
  onDragMoveToken?: (id: string, x: number, y: number) => void;
  onDragStartToken?: (token: Token, originX: number, originY: number, baseSpeed: number) => void;
  onClaimToken?: (id: string) => void;
  onContextMenu?: (id: string, clientX: number, clientY: number) => void;
}) => {
  // Directly tie AC and HP to character sheet
  const stats = useMemo(() => {
    return resolveTokenCharacterStats(token, characters || DEFAULT_CHARACTERS);
  }, [token, characters]);

  const matchedCombatant = useMemo(() => {
    if (!combatants || combatants.length === 0) return null;
    return combatants.find((c: any) =>
      c.id === token.id ||
      c.tokenId === token.id ||
      (c.name && token.name && c.name.toLowerCase().trim() === token.name.toLowerCase().trim())
    );
  }, [combatants, token.id, token.name]);

  const mergedConditions = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(token.conditions)) {
      token.conditions.forEach((c: string) => { if (c) set.add(c); });
    }
    if (Array.isArray(matchedCombatant?.conditions)) {
      matchedCombatant.conditions.forEach((c: string) => { if (c) set.add(c); });
    }
    return Array.from(set);
  }, [token.conditions, matchedCombatant]);

  const isCondition = Boolean(token.isCondition);
  const isAlly = !isCondition && (token.category === 'ally' || !!(token as any).allyId);
  const isMonster = !isCondition && !isAlly && (isMonsterToken(token) || token.isMonster === true || token.category === 'monster' || token.isPlayer === false);

  // Robust URL resolution: checks token.url, token.avatarUrl, compendium character match, and getCharacterTokenUrl fallback
  const resolvedUrl = useMemo(() => {
    const direct = token.url || token.avatarUrl;
    if (direct && typeof direct === 'string' && direct.trim() !== '') {
      return direct;
    }
    if (isMonster || isCondition) {
      return direct || '/uploads/file-1792077381663-439615846.png';
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
  }, [token.url, token.avatarUrl, token.name, token.id, characters, isMonster, isCondition]);

  const isGif = Boolean(resolvedUrl && resolvedUrl.toLowerCase().endsWith('.gif'));
  // Load without CORS constraint (matching DM View TokenImage) so external avatars (D&D Beyond, wiki, etc.) never fail CORS
  const [img] = useImage(!isGif && resolvedUrl ? resolvedUrl : '');

  const tokenPx = gridSize * (token.size || 1);
  const radius = tokenPx / 2;
  const groupRef = useRef<any>(null);
  const lastEmitTimeRef = useRef<number>(0);
  const isCurrentlyDraggingRef = useRef<boolean>(false);

  const handleDragStart = (e: any) => {
    e.cancelBubble = true;
    if (!canDrag || isMonster || isCondition) {
      e.target.stopDrag();
      return;
    }

    // If targeting is active, abort dragging and execute action against clicked target token
    if (isTargetingActive) {
      e.target.stopDrag();
      if (onTargetToken) {
        onTargetToken(token);
      }
      return;
    }

    isCurrentlyDraggingRef.current = true;
    const container = e.target.getStage()?.container();
    if (container) {
      container.style.cursor = 'grabbing';
    }

    const baseSpeed = token.speed || parseSpeedFt(stats.speed || (matchedCombatant as any)?.speed, 30);
    if (!isMonster && !isCondition && onDragStartToken) {
      onDragStartToken(token, token.x, token.y, baseSpeed);
    }
  };

  const handleDragMove = (e: any) => {
    e.cancelBubble = true;
    if (!isCurrentlyDraggingRef.current) return;
    const rawX = e.target.x();
    const rawY = e.target.y();
    if (onDragMoveToken) {
      onDragMoveToken(token.id, rawX, rawY);
    }
  };

  const handleDragEnd = (e: any) => {
    e.cancelBubble = true;
    const wasDragging = isCurrentlyDraggingRef.current;
    isCurrentlyDraggingRef.current = false;

    const container = e.target.getStage()?.container();
    if (container) {
      container.style.cursor = canDrag ? 'grab' : 'default';
    }

    if (!wasDragging) {
      // Aborted drag - restore position to original token position
      e.target.position({ x: token.x, y: token.y });
      return;
    }

    const rawX = e.target.x();
    const rawY = e.target.y();
    // Snap to grid with gridOffsetX and gridOffsetY
    const snappedX = Math.round((rawX - gridOffsetX) / gridSize) * gridSize + gridOffsetX;
    const snappedY = Math.round((rawY - gridOffsetY) / gridSize) * gridSize + gridOffsetY;

    // Calculate distance moved in feet
    const dx = snappedX - token.x;
    const dy = snappedY - token.y;
    const distanceFt = Math.round(Math.hypot(dx, dy) / gridSize) * 5;

    e.target.position({ x: snappedX, y: snappedY });
    onMoveToken(token.id, snappedX, snappedY, distanceFt);
  };

  const displayCurrentHp = token.currentHp !== undefined
    ? token.currentHp
    : (token.hp !== undefined ? token.hp : (matchedCombatant?.currentHp !== undefined ? matchedCombatant.currentHp : stats.currentHp));

  const displayMaxHp = token.maxHp !== undefined
    ? token.maxHp
    : (matchedCombatant?.maxHp !== undefined ? matchedCombatant.maxHp : stats.maxHp);

  const displayTempHp = token.tempHp !== undefined
    ? token.tempHp
    : (stats.tempHp || 0);

  const hpRatio = Math.max(0, Math.min(1, displayCurrentHp / Math.max(1, displayMaxHp)));
  const hpColor = hpRatio > 0.5 ? '#10b981' : hpRatio > 0.25 ? '#f59e0b' : '#ef4444';

  // Responsive zoom-compensated sizing so HP text is bold and readable across the room at any zoom
  const effectiveScale = Math.max(0.25, Math.min(2.5, stageScale || 1));
  const minScreenFontSize = 13.5;
  const zoomCompensatedFont = minScreenFontSize / Math.min(1, effectiveScale);
  const baseFontSize = Math.max(13, Math.round(tokenPx * 0.20));
  const hpFontSize = Math.max(13, Math.min(26, Math.max(baseFontSize, Math.round(zoomCompensatedFont))));

  const minPillWidth = Math.max(76, Math.round(hpFontSize * 5.4));
  const pillWidth = Math.max(minPillWidth, Math.min(Math.round(tokenPx * 1.1), Math.max(minPillWidth, 200)));
  const pillHeight = Math.round(hpFontSize * 1.6 + 6);
  const pillX = (tokenPx - pillWidth) / 2;
  const pillY = tokenPx - Math.round(pillHeight * 0.35);

  const barHeight = Math.max(4, Math.round(pillHeight * 0.18));
  const barY = Math.round(pillHeight - barHeight - 4.5);
  const barPadding = 4;
  const barWidth = pillWidth - (barPadding * 2);

  const nameY = (isMonster || isCondition)
    ? tokenPx + 4
    : pillY + pillHeight + 3;
  const nameFontSize = Math.max(12, Math.min(20, Math.round(hpFontSize * 0.85)));

  const activeAuras: TokenAura[] = useMemo(() => {
    const list: TokenAura[] = [];
    if (Array.isArray(token.auras) && token.auras.length > 0) {
      list.push(...token.auras);
    } else if (token.auraRadius && token.auraRadius > 0) {
      list.push({
        radius: token.auraRadius,
        color: token.auraColor || 'rgba(234, 179, 8, 0.4)',
        opacity: token.auraOpacity ?? 0.9,
        pulse: token.auraPulse,
        name: token.auraName || 'Magical Aura',
        videoUrl: token.videoUrl || (token as any).auraVideoUrl
      });
    }
    return list;
  }, [token.auras, token.auraRadius, token.auraColor, token.auraOpacity, token.auraPulse, token.auraName, token.videoUrl]);

  // Flight & Elevation 3D lift + 60fps animation refs
  const elevationFt = Number(token.elevation) || 0;
  const isFlying = Boolean(token.isFlying);
  const flightMetrics = useMemo(
    () => computeFlightLiftMetrics(elevationFt, isFlying, radius),
    [elevationFt, isFlying, radius]
  );

  const floatingGroupRef = useRef<any>(null);
  const shadowRef = useRef<any>(null);
  const leftWingRef = useRef<any>(null);
  const rightWingRef = useRef<any>(null);
  const vortexRingRef = useRef<any>(null);
  const cloudGroupRef = useRef<any>(null);
  const shockwaveRef = useRef<any>(null);

  useTokenFlightAnimation({
    elevation: elevationFt,
    isFlying,
    liftOffsetPx: flightMetrics.liftOffsetPx,
    perspectiveScale: flightMetrics.perspectiveScale,
    radius,
    floatingGroupRef,
    shadowRef,
    leftWingRef,
    rightWingRef,
    vortexRingRef,
    cloudGroupRef,
    shockwaveRef
  });

  return (
    <Group
      ref={groupRef}
      x={token.x}
      y={token.y}
      name="token"
      draggable={!isTargetingActive && !isCondition && canDrag}
      dragDistance={10}
      onMouseEnter={(e: any) => {
        if (canDrag && !isCurrentlyDraggingRef.current) {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = 'grab';
        }
      }}
      onMouseLeave={(e: any) => {
        if (!isCurrentlyDraggingRef.current) {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = 'default';
        }
      }}
      onMouseDown={(e: any) => {
        if (!isCondition && e.evt?.button !== 2) {
          e.cancelBubble = true;
        }
      }}
      onMouseUp={(e: any) => {
        if (!isCondition && e.evt?.button !== 2) {
          e.cancelBubble = true;
        }
      }}
      onTouchStart={(e: any) => {
        if (!isCondition) {
          // If 2 or more touches on screen, do not swallow - let Stage handle multi-touch pinch-to-zoom!
          if (e.evt?.touches && e.evt.touches.length >= 2) {
            if (groupRef.current?.isDragging()) groupRef.current.stopDrag();
            return;
          }
          e.cancelBubble = true;
        }
      }}
      onTouchEnd={(e: any) => {
        if (!isCondition) {
          e.cancelBubble = true;
        }
      }}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onClick={(e: any) => {
        if (!isCurrentlyDraggingRef.current) {
          e.cancelBubble = true;
          if (isTargetingActive) {
            if (onTargetToken) {
              onTargetToken(token);
            }
            return;
          }
          if (!isMonster && !isCondition && onClaimToken) {
            onClaimToken(token.id);
          }
        }
      }}
      onTap={(e: any) => {
        if (!isCurrentlyDraggingRef.current) {
          e.cancelBubble = true;
          if (isTargetingActive) {
            if (onTargetToken) {
              onTargetToken(token);
            }
            return;
          }
          if (!isMonster && !isCondition && onClaimToken) {
            onClaimToken(token.id);
          }
        }
      }}
      onContextMenu={(e: any) => {
        e.evt.preventDefault();
        e.cancelBubble = true;
        if (false) {
          // no-op
        }
        if (!isMonster && !isCondition && onContextMenu) {
          onContextMenu(token.id, e.evt.clientX, e.evt.clientY);
        }
      }}
    >
      {/* Solid hit target across entire token circle (enforces min 48px touch target for mobile fingers) */}
      <Circle
        x={radius}
        y={radius}
        radius={Math.max(radius + 4, 24)}
        fill="rgba(0,0,0,0.001)"
        perfectDrawEnabled={false}
      />

      {/* 0. Token Magical Auras (Replaced by JB2A WebM animation in DomEffectOverlay when video is available) */}
      {activeAuras.map((aura, idx) => {
        const hasAnimatedVideo = Boolean(aura.videoUrl || getAuraVideoUrl(aura.name, aura.color));
        if (hasAnimatedVideo) return null;

        const auraFt = aura.radius || 10;
        const auraPixelRadius = radius + (auraFt / 5) * gridSize;
        const col = aura.color || 'rgba(234, 179, 8, 0.4)';
        const op = Math.min(0.2, (aura.opacity ?? 0.35) * 0.4);

        return (
          <Group key={`token-aura-${idx}`} listening={false}>
            {/* Soft luminous aura body */}
            <Circle
              x={radius}
              y={radius}
              radius={auraPixelRadius}
              fill={col}
              opacity={op}
              perfectDrawEnabled={false}
            />
            {/* Outer perimeter dashed boundary ring */}
            <Circle
              x={radius}
              y={radius}
              radius={auraPixelRadius}
              stroke={col}
              strokeWidth={2}
              dash={[6, 4]}
              opacity={Math.min(1, op + 0.35)}
              perfectDrawEnabled={false}
            />
            {/* Inner radiant accent ring */}
            <Circle
              x={radius}
              y={radius}
              radius={Math.max(radius + 2, auraPixelRadius - 2)}
              stroke={col}
              strokeWidth={1}
              opacity={Math.min(1, op + 0.2)}
              perfectDrawEnabled={false}
            />
            {/* Distance label pill on aura perimeter */}
            {auraFt > 0 && (
              <Group x={radius} y={radius + auraPixelRadius - 7}>
                <Rect
                  x={-14}
                  y={-6}
                  width={28}
                  height={12}
                  fill="rgba(15, 23, 42, 0.85)"
                  cornerRadius={3}
                  stroke={col}
                  strokeWidth={0.8}
                  perfectDrawEnabled={false}
                />
                <Text
                  x={-14}
                  y={-5}
                  width={28}
                  align="center"
                  text={`${auraFt}ft`}
                  fontSize={8}
                  fontStyle="bold"
                  fontFamily="monospace"
                  fill="#ffffff"
                  perfectDrawEnabled={false}
                />
              </Group>
            )}
          </Group>
        );
      })}

      {/* 0.5 Ground Shadow, Grid Anchor Ring & 3D Tether Line when Flying / Elevated */}
      <TokenGroundFootprint
        elevation={elevationFt}
        isFlying={isFlying}
        radius={radius}
        tierColor={flightMetrics.tierColor}
        liftOffsetPx={flightMetrics.liftOffsetPx}
        shadowRef={shadowRef}
        shockwaveRef={shockwaveRef}
      />

      {/* Lifted & Animated Token Body Group */}
      <Group ref={floatingGroupRef}>
        {/* Halo highlight for claimed token */}
        <Group visible={isClaimed} listening={false}>
          <Circle
            x={radius}
            y={radius}
            radius={radius + 6}
            stroke="#10b981"
            strokeWidth={3}
            dash={[6, 4]}
            shadowColor="#10b981"
            shadowBlur={10}
            shadowForStrokeEnabled={false}
            perfectDrawEnabled={false}
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
            perfectDrawEnabled={false}
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
            perfectDrawEnabled={false}
            listening={false}
          />
        </Group>

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
                fill={token.isPlayer ? '#1e3a8a' : isAlly ? '#713f12' : '#7f1d1d'}
                perfectDrawEnabled={false}
              />
              <Circle
                x={radius}
                y={radius}
                radius={radius * 0.72}
                fill={token.isPlayer ? '#1d4ed8' : isAlly ? '#eab308' : '#991b1b'}
                perfectDrawEnabled={false}
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
                perfectDrawEnabled={false}
              />
            </>
          )}
        </Group>

        {/* 2. Outer Circular Border Ring (Allies are bright yellow, Players blue, Monsters & Condition markers red) */}
        <Circle
          x={radius}
          y={radius}
          radius={radius}
          stroke={isCondition ? '#ef4444' : isClaimed ? '#10b981' : flightMetrics.isElevated ? flightMetrics.tierColor : isAlly ? '#eab308' : token.isPlayer ? '#38bdf8' : '#ef4444'}
          strokeWidth={isClaimed ? 3.5 : flightMetrics.isElevated ? 3.2 : isAlly ? 3 : 2.5}
          shadowColor={isClaimed ? '#10b981' : flightMetrics.isElevated ? flightMetrics.tierColor : isAlly ? '#eab308' : undefined}
          shadowBlur={isClaimed ? 8 : flightMetrics.isElevated ? 10 : isAlly ? 6 : 0}
          shadowForStrokeEnabled={false}
          perfectDrawEnabled={false}
          listening={false}
        />

        {/* 2.5 Animated Spectral Wings, Updraft Wind Vortex, Clouds & Altitude Badge */}
        <TokenAerialOverlay
          elevation={elevationFt}
          isFlying={isFlying}
          radius={radius}
          tokenWidth={tokenPx}
          isMonster={isMonster}
          tierColor={flightMetrics.tierColor}
          tierGlow={flightMetrics.tierGlow}
          tierBg={flightMetrics.tierBg}
          badgeText={flightMetrics.badgeText}
          leftWingRef={leftWingRef}
          rightWingRef={rightWingRef}
          vortexRingRef={vortexRingRef}
          cloudGroupRef={cloudGroupRef}
        />

        {/* 3. Token Status & Lasting Debuff Bubbles (Hunter's Mark, Hex, AC-like indicator badges) */}
        <TokenBubblesKonvaOverlay bubbles={token.bubbles} tokenWidth={tokenPx} />

        {/* 4. Large, High-Contrast HP Pill Badge directly tied to D&D Beyond & Character Sheet (PLAYERS & ALLIES ONLY - Monsters & Condition tokens NEVER show HP in player view) */}
        {showHp && !isCondition && (!isMonster || isAlly) && (
          <Group x={pillX} y={pillY}>
            {/* Dark slate container badge */}
            <Rect
              width={pillWidth}
              height={pillHeight}
              fill="rgba(15, 23, 42, 0.96)"
              stroke={isAlly ? "#eab308" : (hpRatio <= 0.25 ? "#ef4444" : "#475569")}
              strokeWidth={isAlly ? 1.5 : (hpRatio <= 0.25 ? 1.5 : 1)}
              cornerRadius={Math.max(4, Math.round(pillHeight * 0.2))}
              shadowColor="#000000"
              shadowBlur={4}
              shadowOpacity={0.7}
              shadowOffsetY={2}
              perfectDrawEnabled={false}
            />
            {/* Background HP Track */}
            <Rect
              x={barPadding}
              y={barY}
              width={barWidth}
              height={barHeight}
              fill="rgba(30, 41, 59, 0.9)"
              cornerRadius={Math.round(barHeight / 2)}
              perfectDrawEnabled={false}
            />
            {/* Filled HP progress bar */}
            {hpRatio > 0 && (
              <Rect
                x={barPadding}
                y={barY}
                width={Math.max(2, barWidth * hpRatio)}
                height={barHeight}
                fill={hpColor}
                cornerRadius={Math.round(barHeight / 2)}
                perfectDrawEnabled={false}
              />
            )}
            {/* Crisp Monospace HP text */}
            <Text
              y={Math.max(2, Math.round((barY - hpFontSize) / 2))}
              width={pillWidth}
              align="center"
              text={`${displayCurrentHp}/${displayMaxHp}${displayTempHp > 0 ? ` (+${displayTempHp})` : ''}`}
              fontSize={hpFontSize}
              fontStyle="bold"
              fontFamily="monospace"
              fill="#ffffff"
              shadowColor="#000000"
              shadowBlur={2}
              perfectDrawEnabled={false}
            />
          </Group>
        )}

        {/* 5. Token Name Label & Conditions (Cleanly spaced below the larger HP badge or token) */}
        <Group y={nameY} listening={false}>
          <Text
            text={getCharacterTokenDisplayName(token.name, !isMonster && !isAlly && !isCondition)}
            width={tokenPx + 60}
            x={-30}
            align="center"
            fill="white"
            fontSize={nameFontSize}
            fontStyle="bold"
            shadowColor="#000000"
            shadowBlur={3}
            perfectDrawEnabled={false}
          />
          {mergedConditions.length > 0 && (
            <Group y={nameFontSize + 4}>
              <Rect
                x={-30}
                y={-1}
                width={tokenPx + 60}
                height={Math.max(14, nameFontSize + 2)}
                fill="rgba(15, 23, 42, 0.88)"
                stroke="rgba(244, 63, 94, 0.55)"
                strokeWidth={1}
                cornerRadius={4}
                perfectDrawEnabled={false}
              />
              <Text
                text={mergedConditions.join(', ')}
                fontSize={Math.max(9.5, nameFontSize - 2)}
                fontStyle="bold"
                fontFamily="monospace"
                fill="#fb7185"
                align="center"
                width={tokenPx + 60}
                x={-30}
                y={1}
                perfectDrawEnabled={false}
              />
            </Group>
          )}
        </Group>
      </Group>
    </Group>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.token === nextProps.token &&
    prevProps.gridSize === nextProps.gridSize &&
    prevProps.gridOffsetX === nextProps.gridOffsetX &&
    prevProps.gridOffsetY === nextProps.gridOffsetY &&
    prevProps.isClaimed === nextProps.isClaimed &&
    prevProps.characters === nextProps.characters &&
    prevProps.combatants === nextProps.combatants &&
    prevProps.stageScale === nextProps.stageScale &&
    prevProps.canDrag === nextProps.canDrag &&
    prevProps.isTargetingActive === nextProps.isTargetingActive &&
    prevProps.showHp === nextProps.showHp
  );
});

const loadPlayerBackupState = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('mistwalker_player_state_backup_v1');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const buildFallbackHudData = (token: Token, stats: any, customChars?: Character[]): HudCharacterData => {
  const charPool = customChars && customChars.length > 0 ? [...customChars, ...DEFAULT_CHARACTERS] : DEFAULT_CHARACTERS;
  const matchedChar = charPool.find(c =>
    isDdbMatch(token.name, (token as any).characterId || token.id, (token as any).ddbCharacterId, (c as any).ddbCharacterId || c.id, c.name)
  );

  const hp = stats?.currentHp ?? token.currentHp ?? token.hp ?? matchedChar?.hp ?? 25;
  const maxHp = stats?.maxHp ?? token.maxHp ?? token.hp ?? matchedChar?.maxHp ?? 25;
  const ac = stats?.ac ?? token.ac ?? matchedChar?.ac ?? 14;
  const name = matchedChar?.name || token.name || 'Hero';
  const avatarUrl = token.url || token.avatarUrl || matchedChar?.avatarUrl || getCharacterTokenUrl(name);
  const ddbId = (token as any).ddbCharacterId || (matchedChar as any)?.ddbCharacterId;

  const attacks: HudActionItem[] = [];
  const actions: HudActionItem[] = [];
  const bonusActions: HudActionItem[] = [];
  const spells: HudActionItem[] = [];
  const reactions: HudActionItem[] = [];
  const items: HudActionItem[] = [];
  const special: HudActionItem[] = [];

  if (matchedChar && Array.isArray(matchedChar.actions) && matchedChar.actions.length > 0) {
    matchedChar.actions.forEach((act, idx) => {
      const dmgParts = (act.damage || '').split(' ');
      const formula = dmgParts[0] || '1d8 + 3';
      const dmgType = (dmgParts.slice(1).join(' ') || 'slashing').toLowerCase();
      const item: HudActionItem = {
        id: `char-atk-${idx}`,
        name: act.name,
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        isEquipped: true,
        sourceLabel: 'Equipped Weapon',
        hitBonus: act.hitBonus || '+6',
        damageFormula: formula,
        damageType: dmgType,
        notes: act.notes,
        description: act.description || `Attack with ${act.name}.`,
        rangeFt: act.type?.includes('ranged') ? 60 : 5,
        jb2aAssetId: act.name.toLowerCase().includes('greataxe') || act.name.toLowerCase().includes('greatsword')
          ? 'attack_greatsword'
          : act.name.toLowerCase().includes('hammer') || act.name.toLowerCase().includes('mace')
            ? 'attack_hammer'
            : act.name.toLowerCase().includes('bow')
              ? 'attack_bow'
              : act.name.toLowerCase().includes('unarmed')
                ? 'attack_unarmed'
                : 'attack_slash'
      };
      attacks.push(item);
      actions.push({ ...item, category: 'actions' });
    });
  } else {
    const defaultAtk: HudActionItem = {
      id: 'fallback-attack',
      name: 'Main Weapon Attack',
      category: 'attacks',
      type: 'action',
      subCategory: 'weapon',
      isAttack: true,
      hitBonus: '+6',
      damageFormula: '1d8 + 3',
      damageType: 'slashing',
      description: 'Standard melee attack with equipped weapon.',
      rangeFt: 5,
      jb2aAssetId: 'attack_slash'
    };
    attacks.push(defaultAtk);
    actions.push({ ...defaultAtk, category: 'actions' });
  }

  actions.push(
    {
      id: 'fallback-dash',
      name: 'Dash',
      category: 'actions',
      type: 'action',
      subCategory: 'standard',
      isSelfAction: true,
      description: 'Gain extra movement speed for the current turn.',
      rangeFt: 0
    },
    {
      id: 'fallback-disengage',
      name: 'Disengage',
      category: 'actions',
      type: 'action',
      subCategory: 'standard',
      isSelfAction: true,
      description: 'Your movement does not provoke opportunity attacks for the rest of the turn.',
      rangeFt: 0
    },
    {
      id: 'fallback-dodge',
      name: 'Dodge',
      category: 'actions',
      type: 'action',
      subCategory: 'standard',
      isSelfAction: true,
      description: 'Focus entirely on evading attacks until start of your next turn.',
      rangeFt: 0
    }
  );

  if (matchedChar && Array.isArray(matchedChar.bonusActions) && matchedChar.bonusActions.length > 0) {
    matchedChar.bonusActions.forEach((ba, idx) => {
      bonusActions.push({
        id: `char-ba-${idx}`,
        name: ba.name,
        category: 'bonus_actions',
        type: 'bonus_action',
        subCategory: 'class',
        sourceLabel: ba.source || 'Bonus Action',
        castingTime: '1 Bonus Action',
        isSelfAction: !ba.name.toLowerCase().includes('jaunt'),
        rangeFt: ba.name.toLowerCase().includes('jaunt') ? 30 : 0,
        description: ba.description,
        jb2aAssetId: ba.name.toLowerCase().includes('jaunt') ? 'misty_step' : undefined
      });
    });
  }

  const totalLevel = (matchedChar?.classLevel || '')
    .match(/\d+/g)
    ?.reduce((acc, n) => acc + parseInt(n, 10), 0) || 5;
  const profBonus = matchedChar?.proficiencyBonus || (Math.ceil(totalLevel / 4) + 1);
  const charStats = matchedChar?.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  const classLower = (matchedChar?.classLevel || '').toLowerCase();
  const spellAbilityScore =
    classLower.includes('cleric') || classLower.includes('druid') || classLower.includes('ranger')
      ? charStats.wis
      : classLower.includes('wizard') || classLower.includes('artificer') || classLower.includes('fighter') || classLower.includes('rogue')
        ? charStats.int
        : classLower.includes('bard') || classLower.includes('warlock') || classLower.includes('paladin') || classLower.includes('sorcerer')
          ? charStats.cha
          : Math.max(charStats.int, charStats.wis, charStats.cha);
  const spellMod = Math.floor(((spellAbilityScore || 10) - 10) / 2);
  const spellAttackBonus = profBonus + spellMod;
  const spellSaveDc = 8 + profBonus + spellMod;

  if (matchedChar && Array.isArray(matchedChar.spells) && matchedChar.spells.length > 0) {
    matchedChar.spells.forEach((spName, idx) => {
      const lower = spName.toLowerCase();
      const rule = lookupDndRuleDetails(spName, 'spell');
      const matchedAsset = findJb2aAsset(spName);
      const baseLvl = rule?.level !== undefined
        ? rule.level
        : (lower.includes('blast') || lower.includes('bolt') || lower.includes('mockery') || lower.includes('flame') || lower.includes('guidance') || lower.includes('light') || lower.includes('prestidigitation') || lower.includes('mage hand') || lower.includes('minor illusion') || lower.includes('thaumaturgy') || lower.includes('druidcraft') || lower.includes('frostbite') || lower.includes('starry wisp') || lower.includes('elementalism') || lower.includes('message') || lower.includes('spare the dying') || lower.includes('blade ward') || lower.includes('booming blade') || lower.includes('toll the dead') ? 0 : 1);
      const isHeal = Boolean(rule?.isHeal || lower.includes('cure') || lower.includes('heal') || lower.includes('revivify') || lower.includes('restoration') || lower.includes('aid') || lower.includes('goodberry') || lower.includes("heroes' feast"));
      let baseFormula = rule?.damageFormula;
      if (baseFormula && baseLvl === 0) {
        const cantripMult = totalLevel >= 17 ? 4 : totalLevel >= 11 ? 3 : totalLevel >= 5 ? 2 : 1;
        baseFormula = baseFormula.replace(/^1(d\d+)/i, `${cantripMult}$1`);
      } else if (
        baseFormula &&
        isHeal &&
        (lower.includes('cure wounds') || lower.includes('healing word') || lower.includes('prayer of healing'))
      ) {
        baseFormula = `${baseFormula} + ${Math.max(1, spellMod)}`;
      } else if (baseFormula && lower.includes('spiritual weapon')) {
        baseFormula = `${baseFormula} + ${Math.max(1, spellMod)}`;
      }
      const castingTime = rule?.castingTime || (lower.includes('healing word') || lower.includes('mark') || lower.includes('hex') || lower.includes('misty step') || lower.includes('shield of faith') || lower.includes('sanctuary') || lower.includes('spiritual weapon') || lower.includes('holy weapon') || lower.includes('divine word') || lower.includes('smite') ? '1 Bonus Action' : lower.includes('counterspell') || lower === 'shield' || lower.includes('absorb elements') || lower.includes('hellish rebuke') || lower.includes('silvery barbs') ? '1 Reaction' : '1 Action');
      const isBonus = castingTime.toLowerCase().includes('bonus');
      const isRx = castingTime.toLowerCase().includes('reaction');
      const isAtk = Boolean(rule?.isAttack || lower.includes('blast') || lower.includes('bolt') || lower.includes('ray') || lower.includes('orb') || lower.includes('spiritual weapon') || lower.includes('starry wisp') || lower.includes('crown of stars') || lower.includes('booming blade'));
      const saveAbil = rule?.saveAbility;
      const canUpcast = baseLvl >= 1 && baseLvl <= 8 && Boolean(rule?.higherLevels || baseFormula);
      const upcastOptions = canUpcast
        ? Array.from({ length: 9 - baseLvl + 1 }, (_, i) => {
            const slotLvl = baseLvl + i;
            return {
              slotLevel: slotLvl,
              ...computeUpcastFormula(baseFormula, baseLvl, slotLvl, spName)
            };
          })
        : undefined;
      const rangeNum = rule?.range
        ? (rule.range.toLowerCase().includes('self') ? (rule.radiusFeet || 0) : rule.range.toLowerCase().includes('touch') ? 5 : (parseInt(rule.range.match(/\d+/)?.[0] || '60', 10) || 60))
        : (matchedAsset?.defaultSizeFt || (isHeal ? 30 : 60));

      const hudSpell: HudActionItem = {
        id: `char-spell-${idx}`,
        name: rule?.name || spName,
        category: 'spells',
        type: isBonus ? 'bonus_action' : isRx ? 'reaction' : 'action',
        subCategory: 'spell',
        sourceLabel: baseLvl === 0 ? 'Cantrip' : `Level ${baseLvl} ${rule?.school || 'Evocation'}`,
        level: baseLvl,
        canUpcast,
        upcastOptions,
        school: ((rule?.school || matchedAsset?.school || 'evocation').toLowerCase()) as any,
        castingTime,
        duration: rule?.duration,
        components: rule?.components,
        atHigherLevels: rule?.higherLevels,
        hitBonus: isAtk ? `+${spellAttackBonus}` : undefined,
        saveDc: saveAbil ? spellSaveDc : undefined,
        saveAbility: saveAbil,
        damageFormula: baseFormula,
        damageType: rule?.damageType || (isHeal ? 'healing' : undefined),
        isHeal,
        isAttack: isAtk,
        isSelfAction: Boolean(rule?.isSelfAction || (rangeNum === 0 && !isAtk && !saveAbil)),
        spellSlotRequired: baseLvl > 0 ? baseLvl : undefined,
        description: rule?.description || `Cast ${spName}.`,
        rangeFt: rangeNum,
        jb2aAssetId: matchedAsset?.id || (isHeal ? 'cure_wounds' : lower.includes('eldritch') ? 'eldritch_blast' : 'fire_bolt'),
        iconUrl: matchedAsset?.thumb && !matchedAsset.thumb.endsWith('.webm') ? matchedAsset.thumb : undefined,
        isPrepared: true
      };
      spells.push(hudSpell);
      if (isBonus && !bonusActions.some(b => b.name.toLowerCase() === hudSpell.name.toLowerCase())) {
        bonusActions.push({ ...hudSpell, id: `char-ba-spell-${idx}`, category: 'bonus_actions' });
      }
      if (isRx && !reactions.some(r => r.name.toLowerCase() === hudSpell.name.toLowerCase())) {
        reactions.push({ ...hudSpell, id: `char-rx-spell-${idx}`, category: 'reactions' });
      }
      if (isAtk && !attacks.some(a => a.name.toLowerCase() === hudSpell.name.toLowerCase())) {
        attacks.push({ ...hudSpell, id: `char-atk-spell-${idx}`, category: 'attacks' });
      }
    });
    spells.sort((a, b) => ((a.level ?? 0) - (b.level ?? 0)) || a.name.localeCompare(b.name));
  }

  reactions.push({
    id: 'fallback-opp-attack',
    name: 'Opportunity Attack',
    category: 'reactions',
    type: 'reaction',
    subCategory: 'standard',
    castingTime: '1 Reaction',
    isAttack: true,
    hitBonus: attacks[0]?.hitBonus || '+6',
    damageFormula: attacks[0]?.damageFormula || '1d8 + 3',
    damageType: attacks[0]?.damageType || 'slashing',
    description: 'Make one melee weapon attack when a hostile creature leaves your reach.',
    rangeFt: 5,
    jb2aAssetId: attacks[0]?.jb2aAssetId || 'attack_slash'
  });

  items.push({
    id: 'fallback-potion-heal',
    name: 'Potion of Healing',
    category: 'items',
    type: 'item',
    subCategory: 'item',
    quantity: 2,
    isHeal: true,
    damageFormula: '2d4 + 2',
    description: 'Drink or administer to restore 2d4 + 2 hit points.',
    rangeFt: 5,
    jb2aAssetId: 'cure_wounds'
  });

  const lowerCharName = name.toLowerCase();
  if (lowerCharName.includes('stavros')) {
    special.push(
      {
        id: 'special-halo-glow',
        name: 'Illuminate Self: Divine Halo & Holy Glow',
        category: 'special',
        type: 'special',
        subCategory: 'class',
        sourceLabel: 'Divine Illumination • Book of Exalted Deeds',
        castingTime: 'Special (Toggle Glow)',
        rangeFt: 20,
        isSelfAction: true,
        isHaloToggle: true,
        notes: '20 ft. Bright Light + 20 ft. Dim Light',
        description: 'Illuminate yourself with a radiant golden halo and holy light (Book of Exalted Deeds & Mace of Disruption), shedding Bright Light in a 20-foot radius and Dim Light for an additional 20 feet. Click to toggle your token halo & glow on the battlemap.',
        jb2aAssetId: 'bless'
      },
      {
        id: 'special-harness-divine-power',
        name: 'Harness Divine Power',
        category: 'special',
        type: 'bonus_action',
        subCategory: 'class',
        sourceLabel: 'TCoE, pg. 30',
        castingTime: '1 Bonus Action',
        uses: { available: 2, total: 2, resetType: 'Long Rest' },
        isSelfAction: true,
        description: 'You can expend a use of your Channel Divinity to fuel your spells. As a bonus action, you regain one expended spell slot of up to level 3. You can use this feature 2 times. You regain all expended uses when you finish a long rest.'
      },
      {
        id: 'special-channel-divinity',
        name: 'Channel Divinity',
        category: 'special',
        type: 'special',
        subCategory: 'class',
        sourceLabel: 'PHB, pg. 58',
        castingTime: 'Special',
        uses: { available: 2, total: 2, resetType: 'Short Rest' },
        isSelfAction: true,
        description: 'You can channel divine energy to fuel magical effects a number of times per short rest.'
      },
      {
        id: 'special-turn-undead',
        name: 'Channel Divinity: Turn Undead',
        category: 'special',
        type: 'action',
        subCategory: 'class',
        sourceLabel: 'PHB, pg. 59',
        castingTime: '1 Action',
        rangeFt: 30,
        saveDc: 19,
        saveAbility: 'WIS',
        description: 'As an action, you present your holy symbol and speak a prayer censuring the undead. Each undead that can see or hear you within 30 feet of you must make a WIS saving throw (DC 19). On a failed save, it is turned for 1 minute or until it takes damage.',
        jb2aAssetId: 'spirit_guardians'
      },
      {
        id: 'special-preserve-life',
        name: 'Channel Divinity: Preserve Life',
        category: 'special',
        type: 'action',
        subCategory: 'class',
        sourceLabel: 'PHB, pg. 60',
        castingTime: '1 Action',
        rangeFt: 30,
        damageFormula: '75',
        damageType: 'healing',
        isHeal: true,
        description: 'As an action, you can restore 75 HP. Choose any creatures within 30 ft. of you, and divide those hit points among them. This feature can restore a creature to no more than half of its hit point maximum. You can’t use this feature on an undead or a construct.',
        jb2aAssetId: 'cure_wounds'
      },
      {
        id: 'special-destroy-undead',
        name: 'Destroy Undead (CR 3 or Lower)',
        category: 'special',
        type: 'special',
        subCategory: 'class',
        sourceLabel: 'PHB, pg. 59',
        castingTime: 'Special',
        isSelfAction: true,
        description: 'When an undead fails its saving throw against your Turn Undead feature, it is instantly destroyed if its CR is 3 or lower.'
      },
      {
        id: 'special-blessed-healer',
        name: 'Blessed Healer',
        category: 'special',
        type: 'passive',
        subCategory: 'class',
        sourceLabel: 'PHB, pg. 60',
        castingTime: '(No Action)',
        isSelfAction: true,
        description: 'When you cast a spell of 1st level or higher that restores HP to a creature other than you, you regain HP equal to 2 + the spell’s level.'
      },
      {
        id: 'special-devotees-censer',
        name: "Devotee's Censer: Healing Incense",
        category: 'special',
        type: 'bonus_action',
        subCategory: 'item',
        sourceLabel: "Rare Flail • Devotee's Censer",
        castingTime: '1 Bonus Action',
        rangeFt: 10,
        duration: '1 minute',
        damageFormula: '1d4',
        damageType: 'healing',
        isHeal: true,
        isSelfAction: true,
        uses: { available: 1, total: 1, resetType: 'Dawn' },
        description: 'Speak the command word as a bonus action to cause the flail to emanate a thin cloud of incense out to 10 feet for 1 minute. At the start of each of your turns, you and any other creatures in the incense each regain 1d4 hit points.',
        jb2aAssetId: 'healing_incense'
      },
      {
        id: 'special-blessed-strikes',
        name: 'Blessed Strikes',
        category: 'special',
        type: 'special',
        subCategory: 'class',
        sourceLabel: 'TCoE, pg. 31',
        castingTime: 'Special',
        damageFormula: '1d8',
        damageType: 'radiant',
        isSelfAction: true,
        description: 'When a creature takes damage from one of your cantrips or weapon attacks, you can also deal 1d8 radiant damage to that creature. Once you deal this damage, you can’t use this feature again until the start of your next turn.'
      },
      {
        id: 'special-divine-intervention',
        name: 'Divine Intervention',
        category: 'special',
        type: 'action',
        subCategory: 'class',
        sourceLabel: 'PHB, pg. 59',
        castingTime: '1 Action',
        damageFormula: '1d100',
        uses: { available: 1, total: 1, resetType: 'Long Rest' },
        isSelfAction: true,
        description: "As an action, you can request your deity's aid and roll percentile dice. If your roll is equal to or less than 15, your deity intervenes (your DM chooses the nature of the intervention). If successful, you can't use this feature again for 7 days, otherwise, you can use it again after a long rest."
      }
    );
  } else if (lowerCharName.includes('sylas')) {
    special.push({
      id: 'special-halo-glow',
      name: 'Rite of the Dawn: Radiant Illumination (Glow)',
      category: 'special',
      type: 'bonus_action',
      subCategory: 'class',
      sourceLabel: 'Order of the Ghostslayer',
      castingTime: '1 Bonus Action (Toggle Glow)',
      rangeFt: 20,
      damageFormula: '1d6',
      damageType: 'radiant',
      isSelfAction: true,
      isHaloToggle: true,
      description: 'Your weapon sheds Bright Light out to a radius of 20 feet, you gain resistance to Necrotic damage, and your Crimson Rite deals Radiant damage (plus an extra 1d6 radiant against Undead). Click to toggle your radiant glow on the battlemap.'
    });
  } else if (canTokenHaveHalo(name)) {
    special.push({
      id: 'special-halo-glow',
      name: 'Illuminate Self (Radiant Glow)',
      category: 'special',
      type: 'special',
      subCategory: 'item',
      sourceLabel: 'Special Illumination',
      castingTime: 'Special (Toggle Glow)',
      rangeFt: 30,
      isSelfAction: true,
      isHaloToggle: true,
      description: 'Shed Bright Light in a 30-foot radius around your token. Click to toggle your illumination on the battlemap.'
    });
  }

  // If character is G'aiah or a Druid, add Wild Shape to Bonus Actions and Special Features
  if (
    lowerCharName.includes("g'aiah") ||
    lowerCharName.includes("gaiah") ||
    (matchedChar?.classLevel && matchedChar.classLevel.toLowerCase().includes("druid"))
  ) {
    const wildShapeAction: HudActionItem = {
      id: 'druid-wild-shape',
      name: 'Wild Shape (Circle of the Moon)',
      category: 'bonus_actions',
      type: 'bonus_action',
      subCategory: 'class',
      sourceLabel: 'Druid 6 (PHB 2024)',
      castingTime: '1 Bonus Action',
      rangeFt: 0,
      isSelfAction: true,
      uses: { available: 3, total: 3, resetType: 'Long Rest' },
      description: 'Transform into a known Beast Form (CR <= 2, 3 hours duration). In 2024 Circle of the Moon: gain 18 Temp HP, AC becomes 17 (13 + WIS), attacks can deal Radiant damage, and you add +4 WIS to CON saves. Click Wild Shape in the toolbar to choose your form.'
    };
    if (!bonusActions.some(b => b.name.toLowerCase().includes('wild shape'))) {
      bonusActions.push(wildShapeAction);
    }
    if (!special.some(s => s.name.toLowerCase().includes('wild shape'))) {
      special.push({ ...wildShapeAction, category: 'special' });
    }
  }

  bonusActions.forEach((ba, idx) => {
    if (!special.some(s => s.name.toLowerCase() === ba.name.toLowerCase())) {
      special.push({ ...ba, id: `fallback-spec-ba-${idx}`, category: 'special' });
    }
  });
  if (matchedChar && Array.isArray((matchedChar as any).specialFeatures)) {
    (matchedChar as any).specialFeatures.forEach((sf: any, idx: number) => {
      if (sf?.name && !special.some(s => s.name.toLowerCase() === String(sf.name).toLowerCase())) {
        special.push({
          id: `fallback-spec-sf-${idx}`,
          name: sf.name,
          category: 'special',
          type: 'special',
          subCategory: 'class',
          sourceLabel: sf.category || 'Special Feature',
          castingTime: 'Special',
          isSelfAction: true,
          description: sf.description || sf.name
        });
      }
    });
  }
  if (matchedChar && Array.isArray((matchedChar as any).features)) {
    (matchedChar as any).features.forEach((f: any, idx: number) => {
      const fName = typeof f === 'string' ? f : f?.name;
      if (fName && !special.some(s => s.name.toLowerCase() === String(fName).toLowerCase())) {
        special.push({
          id: `fallback-spec-feat-${idx}`,
          name: String(fName),
          category: 'special',
          type: 'special',
          subCategory: 'class',
          sourceLabel: typeof f === 'object' && f?.source ? f.source : 'Feature & Trait',
          castingTime: 'Special',
          isSelfAction: true,
          description: typeof f === 'object' && f?.description ? f.description : String(fName)
        });
      }
    });
  }
  if (matchedChar && Array.isArray((matchedChar as any).feats)) {
    (matchedChar as any).feats.forEach((f: any, idx: number) => {
      const fName = typeof f === 'string' ? f : f?.name;
      if (fName && !special.some(s => s.name.toLowerCase() === String(fName).toLowerCase())) {
        special.push({
          id: `fallback-spec-ft-${idx}`,
          name: String(fName),
          category: 'special',
          type: 'special',
          subCategory: 'feat',
          sourceLabel: 'Feat',
          castingTime: 'Special / Feat',
          isSelfAction: true,
          description: typeof f === 'object' && f?.description ? f.description : `Feat: ${fName}`
        });
      }
    });
  }

  return {
    id: token.id,
    ddbCharacterId: ddbId ? String(ddbId) : undefined,
    isLiveSynced: false,
    name,
    avatarUrl,
    race: matchedChar?.race || 'Adventurer',
    classLevel: matchedChar?.classLevel || 'Level 5 Hero',
    totalLevel,
    ac,
    currentHp: hp,
    maxHp,
    tempHp: stats?.tempHp || 0,
    speed: matchedChar?.speed || '30 ft.',
    walkSpeedFt: 30,
    passivePerception: matchedChar?.passivePerception || 12,
    passiveInsight: matchedChar?.passiveInsight || 12,
    passiveInvestigation: matchedChar?.passiveInvestigation || 11,
    deathSaves: { successes: 0, failures: 0 },
    attacks,
    actions,
    bonusActions,
    spells,
    reactions,
    items,
    special: special.filter(sp => !spells.some(s => s.name.trim().toLowerCase() === sp.name.trim().toLowerCase())),
    spellSlots: (() => {
      if (spells.length === 0) return {};
      const maxSpellLvl = Math.max(2, ...spells.map(s => s.level || 0), totalLevel >= 15 ? 8 : totalLevel >= 13 ? 7 : totalLevel >= 11 ? 6 : totalLevel >= 9 ? 5 : totalLevel >= 7 ? 4 : totalLevel >= 5 ? 3 : 2);
      const slots: Record<number, { level: number; total: number; used: number; available: number }> = {};
      const countsByLvl: Record<number, number> = { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 };
      for (let l = 1; l <= maxSpellLvl; l++) {
        const tot = countsByLvl[l] || 1;
        slots[l] = { level: l, total: tot, used: 0, available: tot };
      }
      return slots;
    })(),
    resources: [],
    canWildShape: Boolean(
      (token.name && (token.name.toLowerCase().includes("g'aiah") || token.name.toLowerCase().includes("gaiah"))) ||
      (matchedChar?.name && (matchedChar.name.toLowerCase().includes("g'aiah") || matchedChar.name.toLowerCase().includes("gaiah"))) ||
      (matchedChar?.classLevel && matchedChar.classLevel.toLowerCase().includes("druid"))
    ),
    hasBookOfExaltedDeeds: Boolean(
      (token.name && token.name.toLowerCase().includes('stavros')) ||
      (matchedChar?.name && matchedChar.name.toLowerCase().includes('stavros'))
    ),
    readonlyUrl: ddbId ? `https://www.dndbeyond.com/characters/${ddbId}` : '',
    lastUpdated: Date.now()
  };
};

export default function PlayerView() {
  const initialBackupRef = useRef(loadPlayerBackupState());
  const initialBackup = initialBackupRef.current;

  const socketRef = useRef<Socket | null>(null);
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);
  const bgLayerRef = useRef<any>(null);

  // Fullscreen viewport dimensions
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  });

  // Map Background State & Dual-strategy battlemap image loading (anonymous CORS with fallback)
  const [imageFile, setImageFile] = useState<string | null>(() => initialBackup?.imageFile || null);
  const [imgWithCors, statusWithCors] = useImage(imageFile || '', 'anonymous');
  const [imgNoCors, statusNoCors] = useImage(statusWithCors === 'failed' ? (imageFile || '') : '');
  const image = statusWithCors === 'loaded' ? imgWithCors : (statusNoCors === 'loaded' ? imgNoCors : (imgWithCors || imgNoCors));
  const imageStatus = statusWithCors === 'loaded' ? 'loaded' : (statusNoCors === 'loaded' ? 'loaded' : (statusWithCors === 'failed' && statusNoCors === 'failed' ? 'failed' : 'loading'));
  const [mapRotation, setMapRotation] = useState<number>(() => initialBackup?.mapRotation || 0);

  // Canvas Layers & Vision State
  const [tokens, setTokens] = useState<Token[]>(() => Array.isArray(initialBackup?.tokens) ? initialBackup.tokens : []);
  const [walls, setWalls] = useState<WallSegment[]>(() => Array.isArray(initialBackup?.walls) ? initialBackup.walls : []);
  const [reveals, setReveals] = useState<Array<{ x: number; y: number; radius: number }>>(() => Array.isArray(initialBackup?.reveals) ? initialBackup.reveals : []);
  const [polygonReveals, setPolygonReveals] = useState<number[][]>(() => Array.isArray(initialBackup?.polygonReveals) ? initialBackup.polygonReveals : []);
  const [isFogVisible, setIsFogVisible] = useState<boolean>(() => initialBackup?.isFogVisible !== undefined ? initialBackup.isFogVisible : true);
  const [fogResetKey, setFogResetKey] = useState<number>(() => initialBackup?.fogResetKey || 0);
  const [boardAnimatedFeatures, setBoardAnimatedFeatures] = useState<AnimatedFeature[]>(() => Array.isArray(initialBackup?.boardAnimatedFeatures) ? initialBackup.boardAnimatedFeatures : []);
  const [boardAnimatedEnabled, setBoardAnimatedEnabled] = useState<boolean>(() => initialBackup?.boardAnimatedEnabled !== undefined ? initialBackup.boardAnimatedEnabled : true);
  const [boardWeatherEffect, setBoardWeatherEffect] = useState<WeatherEffectType>(() => initialBackup?.boardWeatherEffect || 'none');
  const [roomAnnotations, setRoomAnnotations] = useState<RoomAnnotation[]>(() => Array.isArray(initialBackup?.roomAnnotations) ? normalizeRoomAnnotations(initialBackup.roomAnnotations) : []);

  // Dynamic JB2A Animated Spell & Visual Effects State
  const [effects, setEffects] = useState<VttEffectInstance[]>([]);
  const [activeEquippedAsset, setActiveEquippedAsset] = useState<Jb2aAssetDefinition | null>(null);
  const [aimOrigin, setAimOrigin] = useState<{ x: number; y: number } | null>(null);
  const [aimCurrent, setAimCurrent] = useState<{ x: number; y: number } | null>(null);
  const [showEffectsDrawer, setShowEffectsDrawer] = useState<boolean>(false);
  const [showActiveSpellsMenu, setShowActiveSpellsMenu] = useState<boolean>(false);

  // Grid Settings
  const [gridVisible, setGridVisible] = useState<boolean>(() => initialBackup?.gridVisible !== undefined ? initialBackup.gridVisible : true);
  const [gridOpacity, setGridOpacity] = useState<number>(() => initialBackup?.gridOpacity !== undefined ? initialBackup.gridOpacity : 0.3);
  const [gridSize, setGridSize] = useState<number>(() => initialBackup?.gridSize || 50);
  const [gridOffsetX, setGridOffsetX] = useState<number>(() => initialBackup?.gridOffsetX || 0);
  const [gridOffsetY, setGridOffsetY] = useState<number>(() => initialBackup?.gridOffsetY || 0);

  // Vision Config (doors, darkness, memory)
  const [visionConfig, setVisionConfig] = useState<VisionConfig>(() => initialBackup?.visionConfig || {
    enabled: true,
    explorationMemory: true,
    darknessOpacity: 1.0,
    dimVisionOpacity: 0.5,
    ambientLight: false,
    dmPreviewMode: false,
    showDoorBadges: false,
  });

  // Stage Pan & Zoom
  const [stageScale, setStageScale] = useState<number>(() => initialBackup?.stageScale || 1);
  const [stagePos, setStagePos] = useState<{ x: number; y: number }>(() => initialBackup?.stagePos || { x: 0, y: 0 });

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
  } | null>(() => initialBackup?.activeSceneInfo || null);

  // Character Seizing / Claiming
  const [claimedTokenId, setClaimedTokenId] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('mistwalker_player_claimed_token') : null;
  });
  const [showClaimMenu, setShowClaimMenu] = useState(false);

  // Player Station Mode: 'tv_table' (Digital TV Table) or 'remote_player' (Laptop/PC Remote Player)
  const [stationMode, setStationMode] = useState<PlayerStationMode | null>(() => {
    if (typeof window === 'undefined') return null;
    return (sessionStorage.getItem('mistwalker_player_station_mode') as PlayerStationMode) || null;
  });
  const [showStationModal, setShowStationModal] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return !sessionStorage.getItem('mistwalker_player_station_mode');
  });

  // D&D Beyond Tactical Character HUD State
  const [hudCharacterData, setHudCharacterData] = useState<HudCharacterData | null>(null);
  const [activeTargetingAction, setActiveTargetingAction] = useState<HudActionItem | null>(null);
  const [isSyncingHudDdb, setIsSyncingHudDdb] = useState<boolean>(false);
  const [isDdbSyncEnabled, setIsDdbSyncEnabled] = useState<boolean>(true);
  const isDdbSyncEnabledRef = useRef<boolean>(true);
  useEffect(() => {
    isDdbSyncEnabledRef.current = isDdbSyncEnabled;
  }, [isDdbSyncEnabled]);
  const [autoRollByPlayerMap, setAutoRollByPlayerMap] = useState<Record<string, boolean>>(() =>
    loadPlayerAutoRollMap()
  );
  const isAutoRollDiceEnabledRef = useRef<boolean>(true);
  const [pendingCombatRoll, setPendingCombatRoll] = useState<PendingCombatRoll | null>(null);
  const [showCharacterSelectModal, setShowCharacterSelectModal] = useState<boolean>(false);
  const [isCurrentCharacterPrivate, setIsCurrentCharacterPrivate] = useState<boolean>(false);
  const [showWildShapeModal, setShowWildShapeModal] = useState<boolean>(false);
  const [activeWildShape, setActiveWildShape] = useState<ActiveWildShapeState | null>(null);
  const activeWildShapeRef = useRef<ActiveWildShapeState | null>(null);
  useEffect(() => {
    activeWildShapeRef.current = activeWildShape;
  }, [activeWildShape]);
  const [hudCollapseTick, setHudCollapseTick] = useState<number>(0);
  const [privacyModalState, setPrivacyModalState] = useState<{
    isOpen: boolean;
    characterId: string;
    characterName: string;
    avatarUrl?: string;
    pendingChoice?: PlayerCharacterChoiceItem | null;
  } | null>(null);

  // Incoming Token Mutation Prompt (Targeted Healing or Damage from another player)
  const [incomingMutationPrompt, setIncomingMutationPrompt] = useState<{
    requestId: string;
    sourceTokenId: string;
    sourceName: string;
    targetTokenId: string;
    targetName: string;
    actionName: string;
    deltaHp: number;
  } | null>(null);

  // Compendium Characters synced from DM
  const [compendiumCharacters, setCompendiumCharacters] = useState<Character[]>(DEFAULT_CHARACTERS);

  // Pre-warm top JB2A spell animations into browser CacheStorage for instant zero-latency playback
  useEffect(() => {
    videoCacheManager.prewarmTopSpells();
  }, []);

  // If remote player mode is active and no character is claimed yet, prompt character selection
  useEffect(() => {
    if (stationMode === 'remote_player' && !claimedTokenId && !showStationModal) {
      setShowCharacterSelectModal(true);
    }
  }, [stationMode, claimedTokenId, showStationModal]);

  // Automatically reconcile claimedTokenId when tokens change (e.g. across scene transitions where token IDs differ)
  useEffect(() => {
    if (tokens.length === 0 || !claimedTokenId) return;
    const exactMatch = tokens.find(t => t.id === claimedTokenId);
    if (exactMatch) {
      if (typeof window !== 'undefined' && exactMatch.name) {
        localStorage.setItem('mistwalker_player_claimed_name', exactMatch.name);
      }
      return;
    }

    // Token ID not on current scene — try matching by character name
    const savedName = typeof window !== 'undefined'
      ? (localStorage.getItem('mistwalker_player_claimed_name') || '').trim().toLowerCase()
      : '';
    if (savedName) {
      const nameMatch = tokens.find(t => {
        const isAlly = t.category === 'ally' || !!(t as any).allyId;
        const isMonster = !isAlly && (isMonsterToken(t) || t.isMonster === true || t.category === 'monster' || t.isPlayer === false);
        if (isMonster) return false;
        return (
          (t.name || '').trim().toLowerCase() === savedName ||
          isDdbMatch(t.name, (t as any).characterId || t.id, (t as any).ddbCharacterId, undefined, savedName)
        );
      });
      if (nameMatch) {
        setClaimedTokenId(nameMatch.id);
        if (typeof window !== 'undefined') {
          localStorage.setItem('mistwalker_player_claimed_token', nameMatch.id);
        }
        return;
      }
    }

    // Clear stale claimedTokenId from another scene so it never points to a non-existent token
    setClaimedTokenId(null);
  }, [tokens, claimedTokenId]);

  // Claimed Token Data & Character Stats
  const claimedToken = useMemo(() => {
    const found = tokens.find(t => t.id === claimedTokenId);
    if (!found) return null;
    const isAlly = found.category === 'ally' || !!(found as any).allyId;
    const isMonster = !isAlly && (isMonsterToken(found) || found.isMonster === true || found.category === 'monster' || found.isPlayer === false);
    if (isMonster) return null;
    return found;
  }, [tokens, claimedTokenId]);

  // Clear Wild Shape state and ensure D&D Beyond sync always starts ON when switching characters
  useEffect(() => {
    activeWildShapeRef.current = null;
    setActiveWildShape(null);
    isDdbSyncEnabledRef.current = true;
    setIsDdbSyncEnabled(true);
  }, [claimedTokenId]);

  const claimedStats = useMemo(() => {
    if (!claimedToken) return null;
    return resolveTokenCharacterStats(claimedToken, compendiumCharacters);
  }, [claimedToken, compendiumCharacters]);

  // Resolve D&D Beyond Character ID for the currently claimed/selected token
  const resolvedClaimedDdbId = useMemo<string | null>(() => {
    if (!claimedToken) return null;
    const directResolved = resolveTokenDdbCharacterId(claimedToken, compendiumCharacters);
    if (directResolved) return directResolved;
    if ((claimedToken as any).ddbCharacterId) {
      return String((claimedToken as any).ddbCharacterId).replace(/^char_ddb_/, '').trim();
    }
    const allChars = [...compendiumCharacters, ...DEFAULT_CHARACTERS];
    const match = allChars.find(c =>
      isDdbMatch(
        claimedToken.name,
        (claimedToken as any).characterId || claimedToken.id,
        (claimedToken as any).ddbCharacterId,
        (c as any).ddbCharacterId || c.id,
        c.name
      ) && Boolean((c as any).ddbCharacterId || String(c.id).startsWith('char_ddb_'))
    );
    if (match) {
      const rawId = (match as any).ddbCharacterId || String(match.id).replace(/^char_ddb_/, '');
      if (rawId && !isNaN(Number(rawId))) {
        return String(rawId);
      }
    }
    return null;
  }, [claimedToken, compendiumCharacters]);

  // Player-specific Automatic Dice Rolling state (keyed per character/player)
  const activePlayerAutoRollKey = useMemo(
    () =>
      normalizePlayerAutoRollKey(
        activeWildShape?.originalName || claimedToken?.name || hudCharacterData?.name,
        resolvedClaimedDdbId || hudCharacterData?.ddbCharacterId,
        claimedToken?.id || hudCharacterData?.id
      ),
    [
      activeWildShape?.originalName,
      claimedToken?.name,
      claimedToken?.id,
      hudCharacterData?.name,
      hudCharacterData?.ddbCharacterId,
      hudCharacterData?.id,
      resolvedClaimedDdbId
    ]
  );

  const isAutoRollDiceEnabled = useMemo(
    () => autoRollByPlayerMap[activePlayerAutoRollKey] !== false,
    [autoRollByPlayerMap, activePlayerAutoRollKey]
  );

  useEffect(() => {
    isAutoRollDiceEnabledRef.current = isAutoRollDiceEnabled;
  }, [isAutoRollDiceEnabled]);

  const handleToggleAutoRollDice = useCallback(
    (nextEnabled: boolean) => {
      isAutoRollDiceEnabledRef.current = nextEnabled;
      const updated = savePlayerAutoRollPreference(activePlayerAutoRollKey, nextEnabled);
      setAutoRollByPlayerMap(updated);
      const heroLabel =
        activeWildShape?.originalName ||
        claimedToken?.name ||
        hudCharacterData?.name ||
        'This character';
      if (nextEnabled) {
        toast.success(`🎲 Auto Roll turned ON for ${heroLabel}`, {
          description: `${heroLabel}'s HUD spells and actions will automatically roll 3D dice.`
        });
      } else {
        toast.info(`✨ Auto Roll turned OFF for ${heroLabel}`, {
          description: `${heroLabel}'s HUD spells and actions will prompt for manual input or in-game rolls.`
        });
      }
    },
    [activePlayerAutoRollKey, activeWildShape?.originalName, claimedToken?.name, hudCharacterData?.name]
  );

  const handleResolveCombatHit = useCallback(
    (result: {
      d20: number;
      total: number;
      isCrit: boolean;
      isFumble: boolean;
      hits: boolean;
      advantageMode: RollAdvantageMode;
    }) => {
      if (!pendingCombatRoll) return;
      const { actor, target, action } = pendingCombatRoll;

      if (!result.hits) {
        toast.error(
          result.isFumble
            ? `${actor.name}'s ${action.name} MISSED ${target.name} (Natural 1 Fumble)!`
            : `${actor.name}'s ${action.name} missed ${target.name} (Rolled ${result.total} vs AC ${target.ac || 13}).`
        );
        setPendingCombatRoll(null);
        return;
      }

      toast.success(
        result.isCrit
          ? `💥 ${actor.name} CRITICAL HIT on ${target.name}! (Nat 20) — Roll damage!`
          : `🎯 ${actor.name} hits ${target.name}! (Rolled ${result.total} vs AC ${target.ac || 13}) — Roll damage!`
      );

      setPendingCombatRoll((prev) =>
        prev
          ? {
              ...prev,
              phase: 'damage',
              d20Roll: result.d20,
              toHitTotal: result.total,
              isCrit: result.isCrit,
              isFumble: result.isFumble
            }
          : null
      );
    },
    [pendingCombatRoll]
  );

  const handleResolveCombatDamage = useCallback(
    (result: {
      damageTotal: number;
      breakdown: string;
      isCrit: boolean;
      diceEvent?: DdbDiceRollEvent;
    }) => {
      if (!pendingCombatRoll) return;
      const { actor, target, action, isHeal, expendedActionSlot } = pendingCombatRoll;
      const targetToken = tokens.find((t) => t.id === target.id);
      const calculatedDeltaHp = isHeal ? result.damageTotal : -result.damageTotal;

      if (targetToken) {
        const isTargetAlly = targetToken.category === 'ally' || Boolean((targetToken as any).allyId);
        const isTargetMonster =
          !isTargetAlly &&
          (isMonsterToken(targetToken) ||
            targetToken.isMonster === true ||
            targetToken.category === 'monster' ||
            targetToken.isPlayer === false);
        const isTargetOtherPlayer = targetToken.isPlayer && targetToken.id !== actor.id && !isHeal;
        const requiresApproval = isTargetOtherPlayer || (isTargetMonster && !autoApplyMonsterDamage);

        const upcastActionLabel =
          action.castAtLevel && action.castAtLevel > (action.level ?? 0)
            ? (expendedActionSlot ?? 0) >= 1 && action.castAtLevel > (expendedActionSlot ?? 0)
              ? `${action.name} (Level ${action.castAtLevel} • Uses Lvl ${expendedActionSlot} Slot)`
              : `${action.name} (Level ${action.castAtLevel} Slot)`
            : action.name;

        const payload = {
          sourceTokenId: actor.id,
          sourceName: actor.name || 'Hero',
          targetTokenId: targetToken.id,
          targetName: targetToken.name || 'Target',
          actionName: upcastActionLabel,
          deltaHp: calculatedDeltaHp,
          requiresApproval,
          isMonster: isTargetMonster,
          requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        };

        if (socketRef.current?.connected) {
          socketRef.current.emit('REQUEST_TOKEN_MUTATION', payload);
        }

        // Blessed Healer Automatic Trigger (Life Domain Cleric / Stavros)
        const casterHasBlessedHealer = Boolean(
          (actor.name || '').toLowerCase().includes('stavros') ||
          (hudCharacterData?.name || '').toLowerCase().includes('stavros') ||
          hudCharacterData?.special?.some((s) => (s.name || '').toLowerCase().includes('blessed healer'))
        );
        const effectiveCastSpellLevel = action.castAtLevel ?? action.level ?? 0;
        const isLeveledHealingSpell = Boolean(
          effectiveCastSpellLevel >= 1 &&
          (action.category === 'spells' || action.subCategory === 'spell' || (action.level ?? 0) >= 1) &&
          (action.isHeal || isHeal)
        );
        if (casterHasBlessedHealer && isLeveledHealingSpell && target.id !== actor.id) {
          const blessedHealAmount = 2 + effectiveCastSpellLevel;
          const bhPayload = {
            sourceTokenId: actor.id,
            sourceName: actor.name || 'Stavros',
            targetTokenId: actor.id,
            targetName: actor.name || 'Stavros',
            actionName: `Blessed Healer (Lvl ${effectiveCastSpellLevel} Spell)`,
            deltaHp: blessedHealAmount,
            requiresApproval: false,
            isMonster: false,
            requestId: `req_bh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
          };
          if (socketRef.current?.connected) {
            socketRef.current.emit('REQUEST_TOKEN_MUTATION', bhPayload);
          } else {
            setHudCharacterData((prev) => {
              if (!prev) return null;
              return { ...prev, currentHp: Math.min(prev.maxHp, prev.currentHp + blessedHealAmount) };
            });
          }
        }

        toast.success(
          isHeal
            ? `💚 Restored +${result.damageTotal} HP to ${targetToken.name}!`
            : `⚔️ Dealt ${result.damageTotal} damage to ${targetToken.name} with ${action.name}!`
        );
      }

      setPendingCombatRoll(null);
    },
    [pendingCombatRoll, tokens, autoApplyMonsterDamage, hudCharacterData]
  );

  const handleEnableAutoRollAndContinueFromPrompt = useCallback(() => {
    if (!pendingCombatRoll) return;
    const { action, target } = pendingCombatRoll;
    handleToggleAutoRollDice(true);
    setPendingCombatRoll(null);
    const targetToken = tokens.find((t) => t.id === target.id);
    if (targetToken) {
      setActiveTargetingAction(action);
      setTimeout(() => {
        handleTargetToken(targetToken);
      }, 60);
    }
  }, [pendingCombatRoll, handleToggleAutoRollDice, tokens]);

  const promptedPrivateCharIdRef = useRef<string | null>(null);
  const manualSpellSlotsRef = useRef<Record<string, Record<number, { available: number; total: number }>>>({});
  const manualHpOverrideRef = useRef<Record<string, { hp: number; ddbBaselineHp: number }>>({});

  const applyManualHudOverrides = useCallback((baseHud: HudCharacterData, charKey: string): HudCharacterData => {
    let nextHud = { ...baseHud };
    const savedSlots = manualSpellSlotsRef.current[charKey];
    if (savedSlots && nextHud.spellSlots) {
      const mergedSlots = { ...nextHud.spellSlots };
      Object.entries(savedSlots).forEach(([lvlStr, slotOverride]) => {
        const lvl = Number(lvlStr);
        if (mergedSlots[lvl]) {
          const avail = Math.max(0, Math.min(mergedSlots[lvl].total, slotOverride.available));
          mergedSlots[lvl] = {
            ...mergedSlots[lvl],
            available: avail,
            used: Math.max(0, mergedSlots[lvl].total - avail)
          };
        }
      });
      nextHud.spellSlots = mergedSlots;
    }
    const savedHp = manualHpOverrideRef.current[charKey];
    if (savedHp) {
      // Keep manual HP unless D&D Beyond's own HP changed from the baseline when the override was set
      if (baseHud.currentHp === savedHp.ddbBaselineHp) {
        nextHud.currentHp = Math.max(0, Math.min(nextHud.maxHp, savedHp.hp));
      } else {
        delete manualHpOverrideRef.current[charKey];
      }
    }
    return nextHud;
  }, []);

  const applyActiveWildShapeOverlay = useCallback((baseHud: HudCharacterData): HudCharacterData => {
    const ws = activeWildShapeRef.current;
    if (!ws) return baseHud;
    const form = GAIAH_WILD_SHAPE_FORMS.find(f => f.id === ws.beastFormId);
    if (!form) return baseHud;
    const filteredAttacks = (baseHud.attacks || []).filter(a => !a.sourceLabel?.includes('Wild Shape'));
    return {
      ...baseHud,
      name: `${ws.originalName} (${form.name})`,
      avatarUrl: form.avatarUrl,
      ac: Math.max(form.baseAc, 17),
      tempHp: Math.max(baseHud.tempHp || 0, ws.tempHpGranted),
      speed: form.speed,
      walkSpeedFt: form.walkSpeedFt,
      canWildShape: true,
      wildShapeState: ws,
      attacks: [...form.attacks, ...filteredAttacks]
    };
  }, []);

  const syncHudFromDdb = useCallback(async (forceRefresh = false, overrideEnabled?: boolean) => {
    if (!claimedToken) {
      setHudCharacterData(null);
      return;
    }

    const syncAllowed = overrideEnabled !== undefined ? overrideEnabled : isDdbSyncEnabledRef.current;
    if (!syncAllowed) {
      setIsCurrentCharacterPrivate(false);
      setHudCharacterData(prev => {
        if (prev) {
          return applyActiveWildShapeOverlay({ ...prev, isLiveSynced: false });
        }
        return applyActiveWildShapeOverlay(buildFallbackHudData(claimedToken, claimedStats, compendiumCharacters));
      });
      return;
    }

    setIsSyncingHudDdb(true);
    try {
      let targetDdbId = resolvedClaimedDdbId;

      // If not found in local character list yet, check live campaign sync cache on server
      if (!targetDdbId) {
        try {
          const syncRes = await fetch('/api/ddb/campaigns/sync-status');
          if (syncRes.ok) {
            const syncJson = await syncRes.json();
            const cachedList = syncJson?.status?.cachedCharacters;
            if (Array.isArray(cachedList)) {
              const found = cachedList.find((d: any) =>
                isDdbMatch(claimedToken.name, (claimedToken as any).characterId || claimedToken.id, (claimedToken as any).ddbCharacterId, String(d.id), d.name)
              );
              if (found && found.id) {
                targetDdbId = String(found.id);
              }
            }
          }
        } catch {
          // Ignore sync-status lookup error
        }
      }

      if (targetDdbId) {
        const url = `/api/ddb/characters/${targetDdbId}/hud-data${forceRefresh ? '?refresh=true' : ''}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && data.name) {
            const isPriv = Boolean(data.isPrivate);
            setIsCurrentCharacterPrivate(isPriv);
            if (isPriv && promptedPrivateCharIdRef.current !== String(targetDdbId)) {
              promptedPrivateCharIdRef.current = String(targetDdbId);
              setPrivacyModalState({
                isOpen: true,
                characterId: String(targetDdbId),
                characterName: data.name || claimedToken.name || 'Your Character',
                avatarUrl: claimedToken.url || claimedToken.avatarUrl || data.avatarUrl || getCharacterTokenUrl(data.name || claimedToken.name)
              });
            } else if (!isPriv && privacyModalState?.isOpen && privacyModalState?.characterId === String(targetDdbId)) {
              setPrivacyModalState(prev => ({ ...prev, isOpen: false }));
            }
            const charKey = String(targetDdbId || claimedToken.id || data.name);
            if (forceRefresh) {
              delete manualSpellSlotsRef.current[charKey];
              delete manualHpOverrideRef.current[charKey];
            }
            setHudCharacterData(applyActiveWildShapeOverlay(applyManualHudOverrides({
              ...data,
              avatarUrl: claimedToken.url || claimedToken.avatarUrl || data.avatarUrl || getCharacterTokenUrl(data.name)
            }, charKey)));
            if (forceRefresh) {
              toast.success(`Synced ${data.name} from D&D Beyond!`, {
                description: `${(data.attacks || []).length} Attacks • ${(data.bonusActions || []).length} Bonus • ${(data.spells || []).length} Spells • ${(data.special || []).length} Special`
              });
            }
            return;
          }
        } else if (res.status === 403) {
          setIsCurrentCharacterPrivate(true);
          if (promptedPrivateCharIdRef.current !== String(targetDdbId) || forceRefresh) {
            promptedPrivateCharIdRef.current = String(targetDdbId);
            setPrivacyModalState({
              isOpen: true,
              characterId: String(targetDdbId),
              characterName: claimedToken.name || 'Your Character',
              avatarUrl: claimedToken.url || claimedToken.avatarUrl || getCharacterTokenUrl(claimedToken.name)
            });
          }
        }
      }

      setHudCharacterData(applyActiveWildShapeOverlay(buildFallbackHudData(claimedToken, claimedStats, compendiumCharacters)));
    } catch (err) {
      console.warn('[PlayerView] Failed fetching DDB HUD data:', err);
      setHudCharacterData(applyActiveWildShapeOverlay(buildFallbackHudData(claimedToken, claimedStats, compendiumCharacters)));
    } finally {
      setIsSyncingHudDdb(false);
    }
  }, [claimedToken, resolvedClaimedDdbId, claimedStats, compendiumCharacters, applyActiveWildShapeOverlay]);

  const handleToggleDdbSync = useCallback((nextEnabled: boolean) => {
    isDdbSyncEnabledRef.current = nextEnabled;
    setIsDdbSyncEnabled(nextEnabled);
    if (nextEnabled) {
      toast.success('D&D Beyond Character Sheet Sync turned ON', {
        description: 'Syncing live HP, AC, spells, and actions from D&D Beyond...'
      });
      syncHudFromDdb(true, true);
    } else {
      setIsCurrentCharacterPrivate(false);
      setPrivacyModalState(null);
      setHudCharacterData(prev => {
        if (!prev) {
          return claimedToken
            ? applyActiveWildShapeOverlay(buildFallbackHudData(claimedToken, claimedStats, compendiumCharacters))
            : null;
        }
        return { ...prev, isLiveSynced: false };
      });
      toast.info('D&D Beyond Character Sheet Sync turned OFF', {
        description: 'Using local VTT character stats & manual HP adjustments.'
      });
    }
  }, [claimedToken, claimedStats, compendiumCharacters, applyActiveWildShapeOverlay, syncHudFromDdb]);

  // Fetch or synthesize D&D Beyond HUD Character Data when claimedToken changes
  useEffect(() => {
    if (!claimedToken) {
      setHudCharacterData(null);
      return;
    }
    // Set immediate fallback first so there is zero blank flash, then overwrite with live DDB sheet
    setHudCharacterData(prev => {
      if (prev && resolvedClaimedDdbId && String(prev.ddbCharacterId) === String(resolvedClaimedDdbId)) {
        return prev;
      }
      return applyActiveWildShapeOverlay(buildFallbackHudData(claimedToken, claimedStats, compendiumCharacters));
    });
    syncHudFromDdb(false);
  }, [claimedToken?.id, resolvedClaimedDdbId]);

  // 3D Dice Customization State (persisted in localStorage)
  const [dicePresetId, setDicePresetId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'amber_gold';
    return localStorage.getItem('mistwalker_player_dice_preset') || 'amber_gold';
  });
  const [showDicePaletteModal, setShowDicePaletteModal] = useState<boolean>(false);
  const [showDiceRollerModal, setShowDiceRollerModal] = useState<boolean>(false);

  const selectedDicePreset = useMemo<DiceColorPreset>(() => {
    return DICE_COLOR_PRESETS.find(p => p.id === dicePresetId) || DICE_COLOR_PRESETS[0];
  }, [dicePresetId]);

  // Active drag state, recent local move immunity, and claimedTokenId ref to prevent rubber-banding
  const activeDraggingTokenIdRef = useRef<string | null>(null);
  const locallyMovedTokensRef = useRef<Map<string, { x: number; y: number; timestamp: number }>>(new Map());
  const claimedTokenIdRef = useRef<string | null>(claimedTokenId);
  const lastEmitTimeRef = useRef<number>(0);
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
  const [inspectedRuleEntry, setInspectedRuleEntry] = useState<DndRuleEntry | null>(null);
  const [inspectedAuraRequest, setInspectedAuraRequest] = useState<{ action: HudActionItem; tick: number } | null>(null);
  // Movable / pinnable token menu: pinned menus stay open and keep a user-chosen screen position
  const [tokenMenuPinned, setTokenMenuPinned] = useState<boolean>(false);
  const [tokenMenuPos, setTokenMenuPos] = useState<{ x: number; y: number } | null>(null);
  const tokenMenuPinnedRef = useRef<boolean>(false);
  useEffect(() => {
    tokenMenuPinnedRef.current = tokenMenuPinned;
  }, [tokenMenuPinned]);
  // Closes the menu unless pinned (used for click-away, Escape, claiming, token drags)
  const softCloseTokenMenu = useCallback(() => {
    if (tokenMenuPinnedRef.current) return;
    setActiveTokenMenu(null);
    setTokenMenuPos(null);
  }, []);
  // Always closes the menu and unpins it
  const forceCloseTokenMenu = useCallback(() => {
    tokenMenuPinnedRef.current = false;
    setTokenMenuPinned(false);
    setActiveTokenMenu(null);
    setTokenMenuPos(null);
  }, []);
  const startTokenMenuDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input, select, textarea, a, [data-no-drag]')) return;
    const menuEl = document.getElementById('player-token-context-menu');
    if (!menuEl) return;
    const rect = menuEl.getBoundingClientRect();
    const offX = e.clientX - rect.left;
    const offY = e.clientY - rect.top;
    const handleEl = e.currentTarget;
    try { handleEl.setPointerCapture(e.pointerId); } catch {}
    const onMove = (ev: PointerEvent) => {
      const maxX = Math.max(0, window.innerWidth - rect.width);
      const maxY = Math.max(0, window.innerHeight - 48);
      setTokenMenuPos({
        x: Math.max(0, Math.min(ev.clientX - offX, maxX)),
        y: Math.max(0, Math.min(ev.clientY - offY, maxY))
      });
    };
    const onUp = () => {
      handleEl.removeEventListener('pointermove', onMove);
      handleEl.removeEventListener('pointerup', onUp);
      handleEl.removeEventListener('pointercancel', onUp);
    };
    handleEl.addEventListener('pointermove', onMove);
    handleEl.addEventListener('pointerup', onUp);
    handleEl.addEventListener('pointercancel', onUp);
    e.preventDefault();
  }, []);
  const [tokenMenuTab, setTokenMenuTab] = useState<'stats' | 'conditions' | 'auras'>('stats');
  const [customAuraRadiusInput, setCustomAuraRadiusInput] = useState<number>(10);
  const [customAuraColorInput, setCustomAuraColorInput] = useState<string>('rgba(234, 179, 8, 0.4)');
  const [customAuraOpacityInput, setCustomAuraOpacityInput] = useState<number>(0.35);

  // Combat State
  const [combatState, setCombatState] = useState<CombatState>(() => initialBackup?.combatState || {
    combatants: [],
    round: 1,
    turnIndex: 0,
    showCombatTracker: false
  });

  // Screen Shake & Critical Hit Feedback
  const [isShaking, setIsShaking] = useState(false);

  // Initiative Prompt Modal for Player Tokens
  const [initiativePromptData, setInitiativePromptData] = useState<{
    token: { id: string; name: string; avatarUrl?: string; initiativeBonus?: number };
    manualValue: string;
    isRolling: boolean;
  } | null>(null);

  // Player view turn order list visibility (with persistent user preference)
  const [autoApplyMonsterDamage, setAutoApplyMonsterDamage] = useState<boolean>(true);
  const [showPlayerCombatTracker, setShowPlayerCombatTracker] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('mistwalker_player_turn_order_visible');
    return saved !== null ? saved === 'true' : true;
  });

  const togglePlayerCombatTracker = useCallback(() => {
    setShowPlayerCombatTracker(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('mistwalker_player_turn_order_visible', String(next));
      }
      return next;
    });
  }, []);

  // Studio sound impact on critical hit
  const playCriticalHitSound = useCallback(() => {
    try {
      soundCatalog.play('thunder_boom', 1.2);
      soundCatalog.play('metal_clang', 0.8);
    } catch {
      // Audio fallback
    }
  }, []);

  // Broadcast Room Description / Text
  const [roomBroadcast, setRoomBroadcast] = useState<BroadcastRoomText | null>(null);

  // Audio Player State
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const isAudioMutedRef = useRef(isAudioMuted);
  const activeNarrationAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    isAudioMutedRef.current = isAudioMuted;
    if (isAudioMuted && activeNarrationAudioRef.current) {
      activeNarrationAudioRef.current.pause();
      activeNarrationAudioRef.current = null;
    }
  }, [isAudioMuted]);

  // Minimize All Display Menus State (Cinematic / Fullscreen Map View)
  const [isUiMinimized, setIsUiMinimized] = useState(false);

  // Player View Side Menu States & Mobile Viewport Detection
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showHpDisplay, setShowHpDisplay] = useState<boolean>(() => {
    try { return localStorage.getItem('mistwalker_player_show_hp') !== 'false'; } catch { return true; }
  });
  useEffect(() => {
    try { localStorage.setItem('mistwalker_player_show_hp', String(showHpDisplay)); } catch {}
  }, [showHpDisplay]);
  const [showCharacterFlyout, setShowCharacterFlyout] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const stageRef = useRef<any>(null);

  // Handle window resizing with visualViewport for mobile browser chrome handling
  useEffect(() => {
    const handleResize = () => {
      const w = (typeof window !== 'undefined' && window.visualViewport) ? window.visualViewport.width : (typeof window !== 'undefined' ? window.innerWidth : 1920);
      const h = (typeof window !== 'undefined' && window.visualViewport) ? window.visualViewport.height : (typeof window !== 'undefined' ? window.innerHeight : 1080);
      setDimensions({ width: w, height: h });
      const mobile = w < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarExpanded(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    if (typeof window !== 'undefined' && window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }
    return () => {
      window.removeEventListener('resize', handleResize);
      if (typeof window !== 'undefined' && window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
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

  // Left-Click Hold Map Ping System
  const activeClaimedName = useMemo(() => {
    const found = tokens.find(t => t.id === claimedTokenId);
    return found?.name || 'Player';
  }, [tokens, claimedTokenId]);

  const {
    pings: mapPings,
    chargeState: pingChargeState,
    startHoldPing,
    cancelHoldPing,
    receiveRemotePing
  } = useLeftClickHoldPing({
    senderName: activeClaimedName,
    senderRole: 'player',
    color: '#38bdf8',
    socketRef,
    onPullCamera: (worldX, worldY) => {
      const nextPos = {
        x: dimensions.width / 2 - worldX * stageScale,
        y: dimensions.height / 2 - worldY * stageScale
      };
      setStagePos(nextPos);
    }
  });

  // Stand-Alone Player Handouts, Visual Props & Shared Journal System
  const [showHandoutsJournalModal, setShowHandoutsJournalModal] = useState(false);
  const [showArenaMode, setShowArenaMode] = useState(false);
  const {
    handouts: partyHandouts,
    quests: partyQuests,
    journalEntries: partyJournalEntries,
    activePresentation: activeHandoutPresentation,
    hasUnreadUpdate: hasUnreadHandouts,
    clearUnreadUpdate: clearUnreadHandouts,
    addOrUpdateHandout,
    deleteHandout,
    presentHandoutToTable,
    dismissPresentation: dismissHandoutPresentation,
    submitRiddleGuess,
    addOrUpdateQuest,
    deleteQuest,
    addOrUpdateJournalEntry,
    deleteJournalEntry,
    handleRemoteSync: handleRemoteHandoutsSync,
    handleRemotePresent: handleRemoteHandoutPresent,
    handleRemoteRiddleGuess: handleRemoteHandoutRiddleGuess
  } = useHandoutsJournalSystem({
    role: 'player',
    currentCharacterName: activeClaimedName,
    socketRef
  });

  // Stand-Alone Soundboard, Layered Ambience & Spatial 2D Audio Listener
  const playerListenerPoints = useMemo(() => {
    if (claimedTokenId) {
      const myToken = tokens.find((t) => t.id === claimedTokenId);
      if (myToken) return [{ x: myToken.x, y: myToken.y }];
    }
    const partyTokens = tokens.filter(
      (t) => !t.isCondition && (t.isPlayer === true || t.category === 'character' || (!t.isMonster && t.category !== 'monster'))
    );
    return partyTokens.map((t) => ({ x: t.x, y: t.y }));
  }, [tokens, claimedTokenId]);

  const {
    jukeboxState: playerJukeboxState,
    handleRemoteJukeboxSync,
    handleRemoteSoundboardTrigger
  } = useAudioMixerJukebox({
    role: 'player',
    socketRef,
    listenerPointsWorldPx: playerListenerPoints,
    gridSize,
    walls,
    localMuted: isAudioMuted,
    localVolume: 0.9
  });

  // ==========================================
  // Socket.io Pure Consumer Setup
  // ==========================================
  useEffect(() => {
    const socket = io();
    socketRef.current = socket;
    (window as any).__mistwalkerSocket = socket;
    setSocketInstance(socket);

    socket.on('connect', () => {
      console.log('[PlayerView] Connected to socket. Requesting initial state...');
      setIsConnected(true);
      socket.emit('REQUEST_INITIAL_STATE');
    });

    socket.on('disconnect', () => {
      console.log('[PlayerView] Disconnected from socket.');
      setIsConnected(false);
    });

    // Automatically refresh player browser when DM mode refreshes
    socket.on('FORCE_PLAYER_RELOAD', () => {
      console.log('[PlayerView] Dungeon Master refreshed the browser. Reloading player table...');
      toast.info('Dungeon Master refreshed the browser. Reloading table...', {
        duration: 3000
      });
      setTimeout(() => {
        window.location.reload();
      }, 500);
    });

    // 1. SYNC_IMAGE
    socket.on('SYNC_IMAGE', (url: string) => {
      if (url && !url.startsWith('blob:')) {
        console.log('[PlayerView] SYNC_IMAGE received:', url.slice(0, 80));
        setImageFile(url);
      }
    });

    // 2. SYNC_STATE
    socket.on('SYNC_STATE', (state: SyncState) => {
      if (!state) return;
      console.log('[PlayerView] SYNC_STATE received:', state);

      const candidateUrl = (state.imageFile && !state.imageFile.startsWith('blob:'))
        ? state.imageFile
        : ((state.activeSceneInfo?.mapUrl && !state.activeSceneInfo.mapUrl.startsWith('blob:'))
            ? state.activeSceneInfo.mapUrl
            : ((state.activeSceneInfo as any)?.mapThumbnailUrl || (!state.imageFile?.startsWith('blob:') ? state.imageFile : null)));

      if (candidateUrl) {
        setImageFile(candidateUrl);
      }

      if (state.characters && Array.isArray(state.characters)) {
        setCompendiumCharacters(state.characters);
      }

      if (state.tokens && Array.isArray(state.tokens)) {
        const normalizedTokens = state.tokens.map(normalizeToken);
        const draggingId = activeDraggingTokenIdRef.current;
        const now = Date.now();
        setTokens(prev => {
          const currentDragging = draggingId ? prev.find(t => t.id === draggingId) : null;
          const next = normalizedTokens.map(t => {
            if (draggingId && t.id === draggingId && currentDragging) {
              return { ...t, x: currentDragging.x, y: currentDragging.y };
            }
            const localMove = locallyMovedTokensRef.current.get(t.id);
            if (localMove && (now - localMove.timestamp < 1500)) {
              return { ...t, x: localMove.x, y: localMove.y };
            }
            return t;
          });
          tokensRef.current = next;
          return next;
        });
      }
      if (state.walls && Array.isArray(state.walls)) setWalls(state.walls);
      if (state.reveals) setReveals(state.reveals);
      if (state.polygonReveals) setPolygonReveals(state.polygonReveals);
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
      if (state.fogResetKey !== undefined) setFogResetKey(state.fogResetKey);
      if (state.mapRotation !== undefined) setMapRotation(state.mapRotation);
      if (state.roomAnnotations && Array.isArray(state.roomAnnotations)) setRoomAnnotations(normalizeRoomAnnotations(state.roomAnnotations));
      if (state.effects && Array.isArray(state.effects)) setEffects(state.effects);
      if (state.activeSceneInfo) {
        setActiveSceneInfo(prev => {
          if (prev?.sceneId && state.activeSceneInfo?.sceneId && prev.sceneId !== state.activeSceneInfo.sceneId) {
            setFogResetKey(k => k + 1);
          }
          return state.activeSceneInfo!;
        });
      }

      // Combat state fallback in SYNC_STATE
      if (typeof (state as any).autoApplyMonsterDamage === 'boolean') {
        setAutoApplyMonsterDamage((state as any).autoApplyMonsterDamage);
      }
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

    // 3a. PROMPT_ROLL_INITIATIVE: DM initiated combat initiative roll
    socket.on('PROMPT_ROLL_INITIATIVE', (data: { tokens?: Array<{ id: string; name: string; avatarUrl?: string; initiativeBonus?: number }> }) => {
      console.log('[PlayerView] PROMPT_ROLL_INITIATIVE received:', data);
      if (!data?.tokens || !Array.isArray(data.tokens)) return;

      const currentClaimedId = claimedTokenIdRef.current;
      // Find if our claimed token is included, or if we have no claimed token, any player token
      const matchingToken = currentClaimedId
        ? data.tokens.find(t => t.id === currentClaimedId)
        : (data.tokens.length === 1 ? data.tokens[0] : null);

      if (matchingToken) {
        setInitiativePromptData({
          token: matchingToken,
          manualValue: '',
          isRolling: false
        });
        toast.info(`⚔️ Roll Initiative for ${matchingToken.name}!`, {
          duration: 6000
        });
      }
    });

    // 3b. SYNC_SHAKE (Critical Hit Camera Rumble)
    socket.on('SYNC_SHAKE', () => {
      setIsShaking(true);
      playCriticalHitSound();
      setTimeout(() => setIsShaking(false), 600);
    });

    // 3c. MAP_PING (Left-Click Hold Tactical Ping from DM or other Players)
    socket.on('MAP_PING', (ping: MapPingItem) => {
      if (ping && typeof ping.x === 'number' && typeof ping.y === 'number') {
        receiveRemotePing(ping);
      }
    });

    // 3d. Stand-Alone Handouts, Visual Props & Shared Journal Sync
    socket.on('HANDOUTS_SYNC', (payload) => {
      if (payload) handleRemoteHandoutsSync(payload);
    });

    socket.on('HANDOUT_PRESENT', (presentation) => {
      handleRemoteHandoutPresent(presentation || null);
    });

    socket.on('HANDOUT_RIDDLE_GUESS', (payload) => {
      if (payload?.handoutId && payload?.guess) {
        handleRemoteHandoutRiddleGuess(payload);
      }
    });

    // 3e. Stand-Alone Soundboard, Layered Ambience & Spatial Audio Sync
    socket.on('AUDIO_MIXER_SYNC', (mixerState) => {
      if (mixerState) handleRemoteJukeboxSync(mixerState);
    });

    socket.on('SOUNDBOARD_TRIGGER', (padPayload) => {
      if (padPayload?.padId) handleRemoteSoundboardTrigger(padPayload);
    });

    // 4. SYNC_AUDIO
    socket.on('SYNC_AUDIO', (data: any) => {
      if (isAudioMutedRef.current || !data) return;
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
        if (!isAudioMutedRef.current && data.audioBase64) {
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
        const localMove = locallyMovedTokensRef.current.get(data.id);
        if (localMove && (Date.now() - localMove.timestamp < 1500)) return;
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
        const draggingId = activeDraggingTokenIdRef.current;
        const now = Date.now();
        setTokens(prev => {
          const currentDragging = draggingId ? prev.find(t => t.id === draggingId) : null;
          const next = normalizedTokens.map(t => {
            if (draggingId && t.id === draggingId && currentDragging) {
              return { ...t, x: currentDragging.x, y: currentDragging.y };
            }
            const localMove = locallyMovedTokensRef.current.get(t.id);
            if (localMove && (now - localMove.timestamp < 1500)) {
              return { ...t, x: localMove.x, y: localMove.y };
            }
            return t;
          });
          tokensRef.current = next;
          return next;
        });
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

    socket.on('UPDATE_TOKEN', (data: { id: string; updates: Partial<Token> }) => {
      if (!data?.id || !data.updates) return;
      setTokens(prev => {
        const next = prev.map(t => t.id === data.id ? normalizeToken({ ...t, ...data.updates }) : t);
        tokensRef.current = next;
        return next;
      });
    });

    socket.on('DELETE_TOKEN', (data: { id: string }) => {
      if (!data?.id) return;
      setTokens(prev => {
        const next = prev.filter(t => t.id !== data.id);
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
              ddbCampaignId: d.campaignId || existing.ddbCampaignId,
              ddbCampaignTitle: d.campaignTitle || existing.ddbCampaignTitle,
              playerName: d.playerName || existing.playerName,
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
              ddbCampaignId: d.campaignId,
              ddbCampaignTitle: d.campaignTitle,
              playerName: d.playerName || 'Player',
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
            if (!isDdbSyncEnabledRef.current && t.id === claimedTokenIdRef.current) {
              return t;
            }
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
            if (!isDdbSyncEnabledRef.current && t.id === claimedTokenIdRef.current) {
              return t;
            }
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

      // 3. Update active Hero Dock if claimed character matches and DDB Sync is ON
      if (isDdbSyncEnabledRef.current) {
        setHudCharacterData(prev => {
          if (!prev) return null;
          if (String(prev.id) === charIdStr || prev.name.toLowerCase().trim() === ddbName.toLowerCase()) {
            return {
              ...prev,
              currentHp: data.currentHp,
              maxHp: data.maxHp,
              tempHp: data.tempHp || 0
            };
          }
          return prev;
        });
      }
    });

    socket.on('SYNC_AUTO_APPLY_MONSTER_DAMAGE', (enabled: boolean) => {
      setAutoApplyMonsterDamage(enabled);
    });

    // Targeted Healing & Damage Mutation Pipeline
    socket.on('TOKEN_MUTATION_PROMPT', (data: any) => {
      if (claimedTokenIdRef.current && data.targetTokenId === claimedTokenIdRef.current) {
        setIncomingMutationPrompt(data);
        toast.info(`${data.sourceName} targeted you with ${data.actionName}!`, {
          description: `${data.deltaHp > 0 ? '+' : ''}${data.deltaHp} HP. Check prompt to confirm.`
        });
      }
    });

    socket.on('APPLY_TOKEN_MUTATION', (data: { targetTokenId: string; deltaHp: number; actionName?: string; targetName?: string }) => {
      setTokens(prev => {
        const next = prev.map(t => {
          if (t.id === data.targetTokenId) {
            const current = typeof t.currentHp === 'number' ? t.currentHp : (t.hp || 10);
            const max = typeof t.maxHp === 'number' ? t.maxHp : (t.hp || 10);
            const nextHp = Math.max(0, Math.min(max, current + data.deltaHp));
            return { ...t, currentHp: nextHp, hp: nextHp };
          }
          return t;
        });
        tokensRef.current = next;
        return next;
      });

      setHudCharacterData(prev => {
        if (!prev) return null;
        if (claimedTokenIdRef.current === data.targetTokenId) {
          const nextHp = Math.max(0, Math.min(prev.maxHp, prev.currentHp + data.deltaHp));
          return { ...prev, currentHp: nextHp };
        }
        return prev;
      });
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
                  ddbCampaignId: d.campaignId || existing.ddbCampaignId,
                  ddbCampaignTitle: d.campaignTitle || existing.ddbCampaignTitle,
                  playerName: d.playerName || existing.playerName,
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
                  ddbCampaignId: d.campaignId,
                  ddbCampaignTitle: d.campaignTitle,
                  playerName: d.playerName || 'Player',
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

    // 6. JB2A Animated Effects Synchronizers
    socket.on('EFFECT_SPAWN', (instance: VttEffectInstance) => {
      setEffects(prev => [...prev.filter(e => e.id !== instance.id), instance]);
      if (instance.soundKey) {
        soundCatalog.play(instance.soundKey, 0.4);
      }
    });

    socket.on('EFFECT_UPDATE', (updated: VttEffectInstance) => {
      setEffects(prev => prev.map(e => e.id === updated.id ? updated : e));
    });

    socket.on('EFFECT_REMOVE', (data: { id: string } | string) => {
      const targetId = typeof data === 'string' ? data : data?.id;
      if (targetId) {
        setEffects(prev => prev.filter(e => e.id !== targetId));
      }
    });

    socket.on('EFFECT_CLEAR_ALL', () => {
      setEffects([]);
    });

    return () => {
      socket.off('SYNC_SHAKE');
      socket.off('EFFECT_SPAWN');
      socket.off('EFFECT_UPDATE');
      socket.off('EFFECT_REMOVE');
      socket.off('EFFECT_CLEAR_ALL');
      if (activeNarrationAudioRef.current) {
        activeNarrationAudioRef.current.pause();
        activeNarrationAudioRef.current = null;
      }
      socket.disconnect();
    };
  }, []);

  // Real-time automatic D&D Beyond HP registration for Player View active tokens and characters
  useEffect(() => {
    const ddbIdSet = new Set<string>();
    tokens.forEach((t: any) => {
      if (t.ddbCharacterId) ddbIdSet.add(String(t.ddbCharacterId).trim());
    });
    compendiumCharacters.forEach((c: any) => {
      if (c.ddbCharacterId) ddbIdSet.add(String(c.ddbCharacterId).trim());
    });

    const ddbIds = Array.from(ddbIdSet).filter(id => id && !isNaN(Number(id)));
    if (ddbIds.length > 0) {
      fetch('/api/ddb/monitor-characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterIds: ddbIds })
      }).catch(() => {});
    }
  }, [tokens, compendiumCharacters]);

  // Periodic heartbeat poll to trigger D&D Beyond HP refresh cycle every 4 seconds in Player View
  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/api/ddb/campaigns/poll-now', { method: 'POST' }).catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Real-time Firestore activeSession/current subscription so remote Player Views always receive state across server restarts or different networks
  const lastFirestoreSceneRef = useRef<string | null>(null);
  const lastFirestoreUpdateTimeRef = useRef<number>(0);
  useEffect(() => {
    const unsub = subscribeToActiveSession((sess) => {
      if (!sess) return;
      const validUrl = (sess.mapUrl && !sess.mapUrl.startsWith('blob:'))
        ? sess.mapUrl
        : (sess.mapThumbnailUrl || '');
      const sceneChanged = Boolean(sess.sceneId && sess.sceneId !== lastFirestoreSceneRef.current);
      const isNewerForceSync = Boolean(sess.updatedAt && sess.updatedAt > lastFirestoreUpdateTimeRef.current);
      if (sess.sceneId) {
        lastFirestoreSceneRef.current = sess.sceneId;
      }
      if (sess.updatedAt) {
        lastFirestoreUpdateTimeRef.current = sess.updatedAt;
      }
      if (validUrl) {
        setImageFile(prev => (sceneChanged || isNewerForceSync || !prev || prev.startsWith('blob:')) ? validUrl : prev);
      }
      if (sess.tokens && Array.isArray(sess.tokens)) {
        setTokens(prev => {
          if (!sceneChanged && !isNewerForceSync && prev.length > 0) return prev;
          const normalized = sess.tokens.map(normalizeToken);
          const now = Date.now();
          const next = normalized.map(t => {
            const localMove = locallyMovedTokensRef.current.get(t.id);
            if (localMove && (now - localMove.timestamp < 1500)) {
              return { ...t, x: localMove.x, y: localMove.y };
            }
            return t;
          });
          tokensRef.current = next;
          return next;
        });
      }
      if (sess.walls && Array.isArray(sess.walls)) {
        setWalls(prev => (!sceneChanged && !isNewerForceSync && prev.length > 0) ? prev : sess.walls);
      }
      if (sess.gridSize) setGridSize(prev => (sceneChanged || isNewerForceSync || !prev) ? sess.gridSize! : prev);
      if (sess.gridOpacity !== undefined) setGridOpacity(sess.gridOpacity);
      if (sess.gridVisible !== undefined) setGridVisible(sess.gridVisible);
      if (sess.gridOffsetX !== undefined) setGridOffsetX(sess.gridOffsetX);
      if (sess.gridOffsetY !== undefined) setGridOffsetY(sess.gridOffsetY);
      if (sess.isFogVisible !== undefined) setIsFogVisible(sess.isFogVisible);
      if (sess.reveals && Array.isArray(sess.reveals)) {
        setReveals(sess.reveals);
      }
      if (sess.polygonReveals && Array.isArray(sess.polygonReveals)) {
        setPolygonReveals(sess.polygonReveals);
      }
      if (sess.fogResetKey) setFogResetKey(sess.fogResetKey);
      if (sess.mapRotation !== undefined) setMapRotation(sess.mapRotation);
      if (sess.roomAnnotations && Array.isArray(sess.roomAnnotations)) setRoomAnnotations(normalizeRoomAnnotations(sess.roomAnnotations));
      if (sess.boardAnimatedFeatures && Array.isArray(sess.boardAnimatedFeatures)) {
        setBoardAnimatedFeatures(sess.boardAnimatedFeatures);
      }
      if (sess.boardAnimatedEnabled !== undefined) setBoardAnimatedEnabled(sess.boardAnimatedEnabled);
      if (sess.boardWeatherEffect) setBoardWeatherEffect(sess.boardWeatherEffect);
      if (sess.visionConfig) setVisionConfig(sess.visionConfig);
      if (sess.sceneId || sess.sceneTitle || validUrl) {
        setActiveSceneInfo(prev => (sceneChanged || isNewerForceSync || !prev) ? {
          campaignId: sess.campaignId,
          chapterId: sess.chapterId,
          sceneId: sess.sceneId,
          sceneTitle: sess.sceneTitle,
          mapUrl: validUrl,
          mapThumbnailUrl: sess.mapThumbnailUrl,
          mapWidth: sess.mapWidth,
          mapHeight: sess.mapHeight,
        } as any : prev);
      }
    });
    return () => unsub();
  }, []);

  // Automatic fallback to embedded scene thumbnail if primary map URL fails to load on a remote device
  useEffect(() => {
    if (imageStatus === 'failed' && imageFile) {
      const fallbackThumb = (activeSceneInfo as any)?.mapThumbnailUrl;
      if (fallbackThumb && imageFile !== fallbackThumb) {
        console.log('[PlayerView] Primary map URL failed; falling back to embedded scene thumbnail.');
        setImageFile(fallbackThumb);
      }
    }
  }, [imageStatus, imageFile, activeSceneInfo]);

  const [isDraggingToken, setIsDraggingToken] = useState(false);

  // Seize / Claim Character Action (Pure state selection with zero camera reaction)
  const handleClaimToken = useCallback((tokenId: string) => {
    const target = tokensRef.current.find(t => t.id === tokenId);
    if (target) {
      if (target.isCondition) return;
      if ((target as any).spiritualWeapon) {
        toast.info('Spiritual Weapon: drag it to move, or select the spell again to strike.');
        return;
      }
      const isAlly = target.category === 'ally' || !!(target as any).allyId;
      const isMonster = !isAlly && (isMonsterToken(target) || target.isMonster === true || target.category === 'monster' || target.isPlayer === false);
      if (isMonster) return;
      if (typeof window !== 'undefined' && target.name) {
        localStorage.setItem('mistwalker_player_claimed_name', target.name);
      }
    }
    if (claimedTokenIdRef.current !== tokenId) {
      claimedTokenIdRef.current = tokenId;
      setClaimedTokenId(tokenId);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('mistwalker_player_claimed_token', tokenId);
    }
    if (!tokenMenuPinnedRef.current) setActiveTokenMenu(null);
    setShowClaimMenu(false);
  }, []);

  const handleReleaseToken = useCallback(() => {
    claimedTokenIdRef.current = null;
    setClaimedTokenId(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mistwalker_player_claimed_token');
      localStorage.removeItem('mistwalker_player_claimed_name');
    }
  }, []);

  // Active dragging state including origin, speed budget, and real-time distance
  const [tokenDragState, setTokenDragState] = useState<TokenDragState | null>(null);

  const handleDragStartToken = useCallback((token: Token, originX: number, originY: number, baseSpeed: number) => {
    activeDraggingTokenIdRef.current = token.id;
    setIsDraggingToken(true);
    if (!tokenMenuPinnedRef.current) setActiveTokenMenu(null);
    const isOwnedSummon = Boolean((token as any).spiritualWeapon && (token as any).spiritualWeapon.ownerId === claimedTokenIdRef.current);
    if (!isOwnedSummon && claimedTokenIdRef.current !== token.id) {
      claimedTokenIdRef.current = token.id;
      setClaimedTokenId(token.id);
    }
    if (!isOwnedSummon && typeof window !== 'undefined') {
      localStorage.setItem('mistwalker_player_claimed_token', token.id);
      if (token.name) {
        localStorage.setItem('mistwalker_player_claimed_name', token.name);
      }
    }

    setTokenDragState({
      tokenId: token.id,
      tokenName: token.name,
      tokenAvatarUrl: token.avatarUrl || token.url,
      tokenSize: token.size || 1,
      originX,
      originY,
      currentX: originX,
      currentY: originY,
      baseSpeed,
      distancePx: 0,
      distanceFt: 0,
      remainingFt: baseSpeed
    });
  }, []);

  // Real-time dragged token movement handler (updates ruler distance & throttles socket emit)
  const handleDragMoveToken = useCallback((id: string, rawX: number, rawY: number) => {
    setTokenDragState(prev => {
      if (!prev || prev.tokenId !== id) return prev;
      const dx = rawX - prev.originX;
      const dy = rawY - prev.originY;
      const distancePx = Math.hypot(dx, dy);
      const distanceFt = Math.round(distancePx / gridSize) * 5;
      const remainingFt = prev.baseSpeed - distanceFt;
      return {
        ...prev,
        currentX: rawX,
        currentY: rawY,
        distancePx,
        distanceFt,
        remainingFt
      };
    });

    const now = Date.now();
    // Keep local tokens array updated in real-time so attached auras track dragging smoothly
    setTokens(prev => prev.map(t => t.id === id ? { ...t, x: rawX, y: rawY } : t));

    if (now - lastEmitTimeRef.current > 30) {
      lastEmitTimeRef.current = now;
      if (socketRef.current?.connected) {
        socketRef.current.emit('MOVE_TOKEN', { id, x: rawX, y: rawY });
      }
    }
  }, [gridSize]);

  // Snapped or keyboard token movement handler (emits PLAYER_MOVE_TOKEN and MOVE_TOKEN)
  const handleMoveToken = useCallback((id: string, newX: number, newY: number, distanceMovedFt?: number) => {
    setIsDraggingToken(false);
    setTokenDragState(null);
    locallyMovedTokensRef.current.set(id, { x: newX, y: newY, timestamp: Date.now() });

    const currentTokens = tokensRef.current;
    const nextTokens = currentTokens.map(t => t.id === id ? { ...t, x: newX, y: newY } : t);
    tokensRef.current = nextTokens;
    setTokens(nextTokens);

    if (socketRef.current?.connected) {
      socketRef.current.emit('PLAYER_MOVE_TOKEN', {
        tokenId: id,
        x: newX,
        y: newY,
        distanceMovedFt: distanceMovedFt ?? 0
      });
      socketRef.current.emit('MOVE_TOKEN', { id, x: newX, y: newY });
    }
    setTimeout(() => {
      if (activeDraggingTokenIdRef.current === id) {
        activeDraggingTokenIdRef.current = null;
      }
    }, 1500);
  }, []);

  // Global pointerup/touchend listener to ensure dragging ALWAYS releases cleanly
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      try {
        if (typeof Konva !== 'undefined' && (Konva as any).DD) {
          const dd = (Konva as any).DD;
          if (dd._dragElements && dd._dragElements.size > 0) {
            dd._dragElements.forEach((elem: any) => {
              if (elem?.node && typeof elem.node.stopDrag === 'function') {
                elem.node.stopDrag();
              }
            });
          }
        }
      } catch (err) {
        console.warn('Error releasing Konva drag elements:', err);
      }

      if (isDraggingToken) {
        setIsDraggingToken(false);
        setTokenDragState(null);
      }
    };

    window.addEventListener('mouseup', handleGlobalPointerUp);
    window.addEventListener('touchend', handleGlobalPointerUp);
    window.addEventListener('touchcancel', handleGlobalPointerUp);

    return () => {
      window.removeEventListener('mouseup', handleGlobalPointerUp);
      window.removeEventListener('touchend', handleGlobalPointerUp);
      window.removeEventListener('touchcancel', handleGlobalPointerUp);
    };
  }, [isDraggingToken]);

  // Open right-click context menu for tokens (PLAYERS ONLY - Monsters & Condition tokens NEVER show context menu or HP in player view)
  const handleOpenTokenContextMenu = useCallback((id: string, clientX: number, clientY: number) => {
    const target = tokensRef.current.find(t => t.id === id);
    if (!target || target.isCondition) return;
    const isAlly = target.category === 'ally' || !!(target as any).allyId;
    const isMonster = !isAlly && (isMonsterToken(target) || target.isMonster === true || target.category === 'monster' || target.isPlayer === false);
    if (isMonster) return;
    // Pinned menus keep their position when inspecting another token
    if (!tokenMenuPinnedRef.current) setTokenMenuPos(null);
    setActiveTokenMenu({ id, x: clientX, y: clientY });
  }, []);

  // Update token stats/conditions from right-click context menu
  const handleUpdateToken = useCallback((id: string, updates: Partial<Token>) => {
    const currentTokens = tokensRef.current;
    const nextTokens = currentTokens.map(t => t.id === id ? { ...t, ...updates } : t);
    tokensRef.current = nextTokens;
    setTokens(nextTokens);
    if (socketRef.current?.connected) {
      socketRef.current.emit('UPDATE_TOKEN', { id, updates });
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
    forceCloseTokenMenu();
    if (socketRef.current?.connected) {
      socketRef.current.emit('DELETE_TOKEN', { id });
    }
  }, []);



  // Arrow-Key & WASD Movement for Seized Token + Escape key handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Escape key to close modals/menus
      if (e.key === 'Escape') {
        if (!tokenMenuPinnedRef.current) setActiveTokenMenu(null);
        setShowClaimMenu(false);
        setShowEffectsDrawer(false);
        setActiveEquippedAsset(null);
        setAimOrigin(null);
        setAimCurrent(null);
        setActiveTargetingAction(null);
        setShowStationModal(false);
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
  }, [claimedTokenId, tokens, gridSize, handleMoveToken]);

  // Quick 3D Physics Dice Roll (d20)
  const handleQuickRollDice = useCallback(() => {
    if (typeof window !== 'undefined' && (window as any).__mistwalkerRoll3d) {
      const rollVal = Math.floor(Math.random() * 20) + 1;
      (window as any).__mistwalkerRoll3d({
        id: `local-${Date.now()}`,
        characterName: claimedToken?.name || 'Local Player',
        action: 'd20 Check',
        rollType: 'roll',
        formula: `1d20 (${rollVal})`,
        diceNotation: '1d20',
        dice: [{ sides: 20, result: rollVal, type: 'd20' }],
        total: rollVal,
        isCritical: rollVal === 20,
        isFumble: rollVal === 1,
        theme: selectedDicePreset.id,
        themeColor: selectedDicePreset.theme.primaryColor,
        timestamp: Date.now(),
        source: 'player'
      });
    }
  }, [claimedToken?.name, selectedDicePreset]);

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

  // Natural Map Dimensions - Use true natural dimensions of full-res maps, or scene dimensions while loading / for <1000px thumbnails
  const naturalW = image?.width || (image as any)?.naturalWidth || 0;
  const naturalH = image?.height || (image as any)?.naturalHeight || 0;
  const sceneW = activeSceneInfo?.mapWidth || 0;
  const sceneH = activeSceneInfo?.mapHeight || 0;
  let baseMapW = naturalW > 0
    ? ((naturalW < 1000 && sceneW > naturalW) ? sceneW : naturalW)
    : (sceneW || dimensions.width);
  let baseMapH = naturalH > 0
    ? ((naturalH < 1000 && sceneH > naturalH) ? sceneH : naturalH)
    : (sceneH || dimensions.height);

  // If no explicit scene dimensions exist and walls extend beyond a thumbnail, scale proportionally
  if (sceneW <= 0 && sceneH <= 0 && walls.length > 0 && baseMapW > 0 && baseMapH > 0) {
    let maxWallX = 0;
    let maxWallY = 0;
    for (const w of walls) {
      if (w.p1.x > maxWallX) maxWallX = w.p1.x;
      if (w.p2.x > maxWallX) maxWallX = w.p2.x;
      if (w.p1.y > maxWallY) maxWallY = w.p1.y;
      if (w.p2.y > maxWallY) maxWallY = w.p2.y;
    }
    if (maxWallX > baseMapW * 1.15 || maxWallY > baseMapH * 1.15) {
      const aspect = baseMapW / baseMapH;
      const neededW = maxWallX + 328;
      const neededH = maxWallY + 121;
      if (neededW / neededH > aspect) {
        baseMapW = Math.round(neededW);
        baseMapH = Math.round(neededW / aspect);
      } else {
        baseMapH = Math.round(neededH);
        baseMapW = Math.round(neededH * aspect);
      }
    }
  }

  const isRotated = mapRotation % 180 !== 0;
  const targetMapW = isRotated ? baseMapH : baseMapW;
  const targetMapH = isRotated ? baseMapW : baseMapH;

  // Calibrate 1"x1" physical grid scale for a 32-inch 16:9 TV
  const applyTvScale = useCallback((targetGridSize?: number, targetTokens?: any[]) => {
    if (activeDraggingTokenIdRef.current) return;

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

    const currentW = targetMapW || 1920;
    const currentH = targetMapH || 1080;

    // Filter to tokens that are actually inside the active map bounds so off-map ghost tokens never pull the camera into empty void
    const tokenList = targetTokens || tokensRef.current;
    const isTokenOnMap = (t: any) =>
      t &&
      typeof t.x === 'number' &&
      typeof t.y === 'number' &&
      t.x >= -effectiveGrid * 2 &&
      t.x <= currentW + effectiveGrid * 2 &&
      t.y >= -effectiveGrid * 2 &&
      t.y <= currentH + effectiveGrid * 2;

    const inBoundsParty = tokenList.filter((t: any) => {
      if (!isTokenOnMap(t)) return false;
      const isAlly = t.category === 'ally' || !!t.allyId;
      const isMon = !isAlly && (isMonsterToken(t) || t.isMonster === true || t.category === 'monster' || t.isPlayer === false);
      return !isMon || isAlly || t.isPlayer === true || t.category === 'character';
    });

    const currentClaimedId = claimedTokenIdRef.current;
    const claimedInBounds = currentClaimedId
      ? tokenList.find((t: any) => t.id === currentClaimedId && isTokenOnMap(t))
      : null;

    const vpW = window.innerWidth || 1920;
    const vpH = window.innerHeight || 1080;

    let startX = (vpW - currentW * tvScale) / 2;
    let startY = (vpH - currentH * tvScale) / 2;

    if (claimedInBounds) {
      const tokenCenterOffset = ((claimedInBounds.size || 1) * effectiveGrid) / 2;
      startX = (vpW / 2) - (claimedInBounds.x + tokenCenterOffset) * tvScale;
      startY = (vpH / 2) - (claimedInBounds.y + tokenCenterOffset) * tvScale;
    } else if (inBoundsParty.length > 0) {
      // Center on the party centroid
      const avgX = inBoundsParty.reduce((sum: number, t: any) => sum + t.x + (((t.size || 1) * effectiveGrid) / 2), 0) / inBoundsParty.length;
      const avgY = inBoundsParty.reduce((sum: number, t: any) => sum + t.y + (((t.size || 1) * effectiveGrid) / 2), 0) / inBoundsParty.length;
      startX = (vpW / 2) - avgX * tvScale;
      startY = (vpH / 2) - avgY * tvScale;
    }

    // Clamp stage position so the battlemap always fills the screen and never pans into empty off-map void
    const mapScreenW = currentW * tvScale;
    const mapScreenH = currentH * tvScale;
    if (mapScreenW <= vpW) {
      startX = (vpW - mapScreenW) / 2;
    } else {
      startX = Math.min(0, Math.max(vpW - mapScreenW, startX));
    }
    if (mapScreenH <= vpH) {
      startY = (vpH - mapScreenH) / 2;
    } else {
      startY = Math.min(0, Math.max(vpH - mapScreenH, startY));
    }

    setStageScale(tvScale);
    setStagePos({ x: startX, y: startY });
  }, [gridSize, targetMapW, targetMapH]);

  // Zoom handlers
  const handleZoom = useCallback((factor: number) => {
    setStageScale(prev => Math.max(0.1, Math.min(prev * factor, 5)));
  }, []);

  const handleResetZoom = useCallback(() => {
    applyTvScale();
    toast.info('Reset to 1" grid scale for 32" TV');
  }, [applyTvScale]);

  // JB2A Visual Effects & Spell Engine Handlers
  const lastCastTimeRef = useRef<number>(0);
  const lastTargetTimeRef = useRef<number>(0);
  const hasCastOnMouseDownRef = useRef<boolean>(false);
  const isStageDragAimingRef = useRef<boolean>(false);

  const castSpellAt = useCallback((origin: { x: number; y: number }, target: { x: number; y: number }) => {
    if (!activeEquippedAsset) return;
    const now = Date.now();
    if (now - lastCastTimeRef.current < 450 || now - lastTargetTimeRef.current < 450) return;
    lastCastTimeRef.current = now;
    lastTargetTimeRef.current = now;

    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const dist = Math.hypot(dx, dy);
    const rotation = Math.atan2(dy, dx) * (180 / Math.PI);
    const isTrajectory = (activeEquippedAsset.paradigm === 'projectile' || activeEquippedAsset.paradigm === 'ray') ||
                         (Boolean(activeEquippedAsset.projectileWebm) && dist > 25);
    const isPointAoe = activeEquippedAsset.paradigm === 'point' || activeEquippedAsset.paradigm === 'aura';

    // Spiritual Weapon: the first cast manifests a movable spectral weapon token where it is placed
    const isSpiritualWeaponCast = activeEquippedAsset.id === 'spiritual_weapon' ||
      activeEquippedAsset.name.toLowerCase().includes('spiritual weapon');

    if (isSpiritualWeaponCast && claimedToken) {
      const previousWeapon = findSpiritualWeapon(tokensRef.current, claimedToken.id);
      const wSnapX = Math.floor((target.x - gridOffsetX) / gridSize) * gridSize + gridOffsetX;
      const wSnapY = Math.floor((target.y - gridOffsetY) / gridSize) * gridSize + gridOffsetY;
      const wCenterX = wSnapX + gridSize / 2;
      const wCenterY = wSnapY + gridSize / 2;
      const swAction = activeTargetingAction;
      const swHitBonus = swAction?.hitBonus ?? (hudCharacterData?.spellAttackBonus !== undefined ? `+${hudCharacterData.spellAttackBonus}` : '+5');
      const swFormula = swAction?.damageFormula || '1d8 + 3';
      const swSlot = swAction?.spellSlotRequired ?? swAction?.level ?? activeEquippedAsset.level ?? 2;
      const swThumb = activeEquippedAsset.thumb || '/jb2a/Library/2nd_Level/Spiritual_Weapon/SpiritualWeapon_Club01_02_Spectral_Green_Thumb.webp';
      const ownerFirstName = (claimedToken.name || 'Caster').split(/[\s"(]+/)[0];
      const weaponId = `spiritual_weapon_${claimedToken.id}_${Date.now()}`;

      const weaponToken: any = {
        id: weaponId,
        name: `Spiritual Weapon (${ownerFirstName})`,
        url: swThumb,
        avatarUrl: swThumb,
        x: wSnapX,
        y: wSnapY,
        size: 1,
        hp: 20,
        maxHp: 20,
        currentHp: 20,
        ac: 15,
        speed: 20,
        category: 'ally',
        allyId: 'ally_spiritual_weapon',
        isPlayer: false,
        spiritualWeapon: {
          ownerId: claimedToken.id,
          hitBonus: swHitBonus,
          damageFormula: swFormula,
          castLevel: swAction?.castAtLevel ?? swAction?.level ?? 2
        }
      };

      const swNextTokens = [...tokensRef.current.filter(t => t.id !== previousWeapon?.id), weaponToken as Token];
      tokensRef.current = swNextTokens;
      setTokens(swNextTokens);
      if (socketRef.current?.connected) {
        if (previousWeapon) socketRef.current.emit('DELETE_TOKEN', { id: previousWeapon.id });
        socketRef.current.emit('ADD_TOKEN', weaponToken);
      }

      const weaponEffect: VttEffectInstance = {
        id: `eff_spiritual_weapon_${Date.now()}`,
        name: 'Spiritual Weapon',
        label: activeEquippedAsset.label || 'Spiritual Weapon',
        assetKey: 'spiritual_weapon',
        videoUrl: activeEquippedAsset.webm,
        thumbUrl: activeEquippedAsset.thumb,
        paradigm: 'point',
        x: wCenterX,
        y: wCenterY,
        sizeFt: 4,
        rotation: 0,
        opacity: 1.0,
        blendMode: activeEquippedAsset.blendMode,
        isPersistent: true,
        loop: true,
        attachedTokenId: weaponId,
        castTime: Date.now(),
        durationMs: 60000,
        soundKey: activeEquippedAsset.soundKey,
        color: activeEquippedAsset.color,
        ownerId: claimedToken.id,
        casterName: claimedToken.name || 'Hero'
      } as VttEffectInstance;
      setEffects(prev => [...prev.filter(e => !(e.assetKey === 'spiritual_weapon' && e.ownerId === claimedToken.id)), weaponEffect]);
      if (activeEquippedAsset.soundKey) soundCatalog.play(activeEquippedAsset.soundKey);
      if (socketRef.current?.connected) {
        socketRef.current.emit('EFFECT_SPAWN', weaponEffect);
      }

      // Casting expends a spell slot (later strikes are free bonus-action commands)
      if (swSlot >= 1) {
        setHudCharacterData(prev => {
          if (!prev?.spellSlots?.[swSlot]) return prev;
          const cur = prev.spellSlots[swSlot];
          const nextAvail = Math.max(0, cur.available - 1);
          const charKey = String(prev.ddbCharacterId || prev.id || claimedToken.id || prev.name);
          manualSpellSlotsRef.current[charKey] = {
            ...(manualSpellSlotsRef.current[charKey] || {}),
            [swSlot]: { available: nextAvail, total: cur.total }
          };
          return {
            ...prev,
            spellSlots: {
              ...prev.spellSlots,
              [swSlot]: { ...cur, available: nextAvail }
            }
          };
        });
      }

      toast.success(`${claimedToken.name || 'Caster'} conjured a Spiritual Weapon!`, {
        description: `Drag it to move (20 ft). Select Spiritual Weapon again as a bonus action to strike (${swHitBonus} to hit, ${swFormula} force).`
      });

      setAimOrigin(null);
      setAimCurrent(null);
      setActiveEquippedAsset(null);
      setActiveTargetingAction(null);
      return;
    }

    // Teleportation Spells (Misty Step, Dimension Door, Arcane Gate, Thunder Step, etc.)
    const isTeleportSpell = activeEquippedAsset.targetType === 'teleport' ||
      activeEquippedAsset.id === 'misty_step' ||
      activeEquippedAsset.id === 'dimension_door' ||
      activeEquippedAsset.name.toLowerCase().includes('misty step') ||
      activeEquippedAsset.name.toLowerCase().includes('dimension door');

    if (isTeleportSpell && claimedToken) {
      const maxRangeFt = activeEquippedAsset.rangeFt || (activeEquippedAsset.name.toLowerCase().includes('misty step') ? 30 : 500);

      // Snapped destination to grid tile top-left for token placement
      const snappedTargetX = Math.round(target.x / gridSize) * gridSize;
      const snappedTargetY = Math.round(target.y / gridSize) * gridSize;

      // Always guarantee departure center is strictly the claimedToken's center
      const tokenRadius = ((claimedToken.size || 1) * gridSize) / 2;
      const tokenCenterX = claimedToken.x + tokenRadius;
      const tokenCenterY = claimedToken.y + tokenRadius;
      const departCenter = { x: tokenCenterX, y: tokenCenterY };
      const arriveCenter = { x: snappedTargetX + tokenRadius, y: snappedTargetY + tokenRadius };

      // Calculate distance from token center to destination
      const trueTeleportDist = Math.hypot(arriveCenter.x - departCenter.x, arriveCenter.y - departCenter.y);
      const distFt = Math.round((trueTeleportDist / gridSize) * 5);

      if (maxRangeFt > 0 && distFt > maxRangeFt + 2) {
        toast.error(`Out of range! Teleport destination is ${distFt} ft away (Max range: ${maxRangeFt} ft).`);
        return;
      }

      // Departure Poof at Point A (where character vanishes from)
      const departEffect: VttEffectInstance = {
        id: `eff_depart_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: `${activeEquippedAsset.name} Departure`,
        label: `${activeEquippedAsset.label || activeEquippedAsset.name} Departure`,
        assetKey: activeEquippedAsset.id,
        videoUrl: activeEquippedAsset.webm,
        thumbUrl: activeEquippedAsset.thumb,
        paradigm: 'point',
        x: departCenter.x,
        y: departCenter.y,
        sizeFt: activeEquippedAsset.defaultSizeFt || 5,
        rotation: 0,
        opacity: 1.0,
        blendMode: activeEquippedAsset.blendMode,
        isPersistent: false,
        loop: false,
        castTime: Date.now(),
        durationMs: 3500,
        fadeInMs: 400,
        fadeOutMs: 600,
        soundKey: activeEquippedAsset.soundKey || 'teleport_whoosh',
        color: activeEquippedAsset.color,
        ownerId: claimedToken.id,
        casterName: claimedToken.name
      };

      // Arrival Poof at Point B (where character appears)
      const arriveEffect: VttEffectInstance = {
        id: `eff_arrive_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: `${activeEquippedAsset.name} Arrival`,
        label: `${activeEquippedAsset.label || activeEquippedAsset.name} Arrival`,
        assetKey: activeEquippedAsset.id,
        videoUrl: activeEquippedAsset.webm,
        thumbUrl: activeEquippedAsset.thumb,
        paradigm: 'point',
        x: arriveCenter.x,
        y: arriveCenter.y,
        sizeFt: activeEquippedAsset.defaultSizeFt || 5,
        rotation: 0,
        opacity: 1.0,
        blendMode: activeEquippedAsset.blendMode,
        isPersistent: false,
        loop: false,
        castTime: Date.now() + 80,
        durationMs: 3500,
        fadeInMs: 400,
        fadeOutMs: 600,
        soundKey: activeEquippedAsset.soundKey || 'teleport_whoosh',
        color: activeEquippedAsset.color,
        ownerId: claimedToken.id,
        casterName: claimedToken.name
      };

      const isSequentialPortal = activeEquippedAsset.id === 'dimension_door' ||
        activeEquippedAsset.id === 'arcane_gate' ||
        activeEquippedAsset.name.toLowerCase().includes('dimension door');

      if (isSequentialPortal) {
        // Step 1: Open departure portal on player token FIRST
        setEffects(prev => [...prev, departEffect]);
        if (activeEquippedAsset.soundKey) soundCatalog.play(activeEquippedAsset.soundKey);
        if (socketRef.current?.connected) {
          socketRef.current.emit('EFFECT_SPAWN', departEffect);
        }

        toast.info(`${claimedToken.name} opened ${activeEquippedAsset.name}...`, {
          description: `Dimensional gateway opening at departure...`
        });

        // Step 2: Open arrival portal at destination spot
        setTimeout(() => {
          setEffects(prev => [...prev, arriveEffect]);
          soundCatalog.play('portal_open');
          if (socketRef.current?.connected) {
            socketRef.current.emit('EFFECT_SPAWN', arriveEffect);
          }
        }, 750);

        // Step 3: Step through the portal - relocate character token to the destination
        setTimeout(() => {
          handleMoveToken(claimedToken.id, snappedTargetX, snappedTargetY, distFt);
          soundCatalog.play('teleport_whoosh');
          toast.success(`${claimedToken.name} stepped through ${activeEquippedAsset.name}!`, {
            description: `Teleported ${distFt} ft across the battlefield.`
          });
        }, 1300);
      } else {
        // Standard rapid teleportation (Misty Step, Fey Step, Shadow Step)
        setEffects(prev => [...prev, departEffect, arriveEffect]);
        if (activeEquippedAsset.soundKey) soundCatalog.play(activeEquippedAsset.soundKey);
        if (socketRef.current?.connected) {
          socketRef.current.emit('EFFECT_SPAWN', departEffect);
          socketRef.current.emit('EFFECT_SPAWN', arriveEffect);
        }

        // Relocate claimed character token to destination tile
        handleMoveToken(claimedToken.id, snappedTargetX, snappedTargetY, distFt);

        toast.success(`${claimedToken.name} cast ${activeEquippedAsset.name}!`, {
          description: `Teleported ${distFt} ft across the battlefield.`
        });
      }

      setAimOrigin(null);
      setAimCurrent(null);
      setActiveEquippedAsset(null);
      setActiveTargetingAction(null);
      return;
    }

    const lowerAssetName = activeEquippedAsset.name.toLowerCase();
    const isCasterSelfAura = Boolean(
      activeEquippedAsset.targetType === 'aura' ||
      activeEquippedAsset.targetType === 'self' ||
      activeTargetingAction?.rangeFt === 0 ||
      ['spirit_guardians', 'aura_of_vitality', 'aura_of_life', 'aura_of_purity', 'crusaders_mantle', 'holy_aura', 'circle_of_power', 'detect_magic', 'shield', 'armor_of_agathys', 'fire_shield', 'shadow_of_moil', 'ashardalons_stride', 'twilight_sanctuary', 'healing_incense'].includes(activeEquippedAsset.id) ||
      ['spirit guardians', 'aura of vitality', 'aura of life', 'aura of purity', 'crusader\'s mantle', 'holy aura', 'circle of power', 'detect magic', 'armor of agathys', 'fire shield', 'shadow of moil', 'ashardalon\'s stride', 'twilight sanctuary', 'healing incense', 'devotee\'s censer', 'devotees censer'].some(k => lowerAssetName.includes(k))
    );

    const isAuraOrBuff = Boolean(
      isCasterSelfAura ||
      activeEquippedAsset.paradigm === 'aura' ||
      activeEquippedAsset.shape === 'aura' ||
      activeEquippedAsset.id === 'shield_of_faith' ||
      activeEquippedAsset.id === 'sanctuary' ||
      activeEquippedAsset.id === 'shield' ||
      activeEquippedAsset.id === 'bless' ||
      activeEquippedAsset.id === 'mage_armor' ||
      ['shield of faith', 'sanctuary', 'bless', 'mage armor', 'barkskin', 'warding bond', 'hunter\'s mark'].some(k => lowerAssetName.includes(k))
    );

    // Find which token the aura/buff locks onto (caster for self-auras, or clicked/nearest token for targeted buffs)
    const hitToken = isAuraOrBuff ? (
      isCasterSelfAura && claimedToken
        ? claimedToken
        : (
            tokens.find(t => {
              const tRad = ((t.size || 1) * gridSize) / 2;
              const tcX = (t.x ?? 0) + tRad;
              const tcY = (t.y ?? 0) + tRad;
              return Math.hypot(target.x - tcX, target.y - tcY) <= tRad + 15;
            }) || claimedToken || tokens[0] || null
          )
    ) : null;

    const hitTokenRadius = hitToken ? (((hitToken.size || 1) * gridSize) / 2) : 0;
    const lockedPos = hitToken
      ? { x: (hitToken.x ?? 0) + hitTokenRadius, y: (hitToken.y ?? 0) + hitTokenRadius }
      : (isPointAoe ? target : origin);

    const isCone = activeEquippedAsset.paradigm === 'cone' || activeEquippedAsset.targetType === 'cone' || activeEquippedAsset.shape === 'cone';
    let castOrigin = origin;
    let castRotation = rotation;
    if (isCone) {
      const coneInfo = getDirectionalConeOrigin(origin, target, tokens, gridSize, claimedToken);
      castOrigin = { x: coneInfo.x, y: coneInfo.y };
      castRotation = Math.atan2(target.y - coneInfo.tokenCenter.y, target.x - coneInfo.tokenCenter.x) * (180 / Math.PI);
    }

    const lastingDebuff = findLastingDebuffConfig(activeEquippedAsset.id || activeEquippedAsset.name || aimedAction?.name);
    const targetCreatureToken = tokens.find(t => {
      const tRad = ((t.size || 1) * gridSize) / 2;
      const tcX = (t.x ?? 0) + tRad;
      const tcY = (t.y ?? 0) + tRad;
      return Math.hypot(target.x - tcX, target.y - tcY) <= tRad + 15;
    }) || hitToken;

    const isDebuffOnTarget = Boolean(lastingDebuff && targetCreatureToken);

    const aimedAction = activeTargetingAction;
    const newEffect: VttEffectInstance = {
      id: `eff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: hitToken && hitToken.id !== claimedToken?.id ? `${activeEquippedAsset.name} (${hitToken.name})` : activeEquippedAsset.name,
      label: hitToken && hitToken.id !== claimedToken?.id ? `${activeEquippedAsset.label} on ${hitToken.name}` : activeEquippedAsset.label,
      assetKey: activeEquippedAsset.id,
      videoUrl: (isTrajectory && activeEquippedAsset.projectileWebm)
        ? activeEquippedAsset.projectileWebm
        : activeEquippedAsset.webm,
      loopVideoUrl: activeEquippedAsset.loopWebm,
      thumbUrl: activeEquippedAsset.thumb,
      paradigm: isTrajectory ? 'projectile' : (isAuraOrBuff ? 'aura' : activeEquippedAsset.paradigm),
      x: isCone ? castOrigin.x : (isTrajectory ? origin.x : lockedPos.x),
      y: isCone ? castOrigin.y : (isTrajectory ? origin.y : lockedPos.y),
      originX: castOrigin.x,
      originY: castOrigin.y,
      targetX: hitToken ? lockedPos.x : target.x,
      targetY: hitToken ? lockedPos.y : target.y,
      sizeFt: activeEquippedAsset.defaultSizeFt,
      rotation: (activeEquippedAsset.paradigm === 'cone' || activeEquippedAsset.paradigm === 'line') ? (isCone ? castRotation : rotation) : 0,
      opacity: 1.0,
      blendMode: activeEquippedAsset.blendMode,
      isPersistent: isDebuffOnTarget ? false : (isAuraOrBuff || Boolean(activeEquippedAsset.isPersistent)),
      loop: isDebuffOnTarget ? false : (isAuraOrBuff || Boolean(activeEquippedAsset.isPersistent)),
      attachedTokenId: hitToken ? hitToken.id : undefined,
      castTime: Date.now(),
      durationMs: isDebuffOnTarget ? 2800 : (isTrajectory ? 2500 : 5000),
      soundKey: activeEquippedAsset.soundKey,
      color: activeEquippedAsset.color,
      trajectory: isTrajectory ? {
        startX: origin.x,
        startY: origin.y,
        endX: target.x,
        endY: target.y,
        speedPxSec: 1400,
        burstOnImpact: Boolean(activeEquippedAsset.burstWebm && activeEquippedAsset.burstWebm !== (activeEquippedAsset.projectileWebm || activeEquippedAsset.webm)),
        burstVideoUrl: (activeEquippedAsset.burstWebm && activeEquippedAsset.burstWebm !== (activeEquippedAsset.projectileWebm || activeEquippedAsset.webm)) ? activeEquippedAsset.burstWebm : undefined,
        burstSoundKey: activeEquippedAsset.soundKey
      } : undefined,
      ownerId: claimedToken?.id || claimedToken?.name || 'player',
      casterName: claimedToken?.name || 'Hero',
      spellId: aimedAction?.id,
      castAtLevel: aimedAction?.castAtLevel ?? aimedAction?.level ?? activeEquippedAsset.level,
      baseLevel: aimedAction?.level ?? activeEquippedAsset.level,
      damageFormula: aimedAction?.damageFormula,
      damageType: aimedAction?.damageType,
      saveDc: aimedAction?.saveDc ?? hudCharacterData?.spellSaveDc,
      saveAbility: aimedAction?.saveAbility,
      description: aimedAction?.description,
      atHigherLevels: aimedAction?.atHigherLevels,
      actionSnapshot: aimedAction ? { ...aimedAction } : undefined
    };

    setEffects(prev => [...prev, newEffect]);
    if (activeEquippedAsset.soundKey) soundCatalog.play(activeEquippedAsset.soundKey);
    if (socketRef.current?.connected) {
      socketRef.current.emit('EFFECT_SPAWN', newEffect);
    }

    if (lastingDebuff && targetCreatureToken) {
      const targetTokenId = targetCreatureToken.id;
      const targetTokenName = targetCreatureToken.name;
      const effectToRemoveId = newEffect.id;
      setTimeout(() => {
        // Remove the main full-size blast animation now that it transitioned into the bubble
        setEffects(prev => prev.filter(e => e.id !== effectToRemoveId));
        if (socketRef.current?.connected) {
          socketRef.current.emit('EFFECT_REMOVE', { id: effectToRemoveId });
        }

        const bubble = createDebuffBubbleFromConfig(lastingDebuff, claimedToken?.name || 'Hero');
        setTokens(prev => {
          const next = prev.map(t => {
            if (t.id !== targetTokenId) return t;
            const existing = t.bubbles || [];
            const filtered = existing.filter(b => b.sourceSpellId !== lastingDebuff.spellKey && b.label !== lastingDebuff.name);
            return { ...t, bubbles: [...filtered, bubble] };
          });
          tokensRef.current = next;
          if (socketRef.current?.connected) {
            socketRef.current.emit('SYNC_TOKENS', next);
          }
          return next;
        });
        toast.success(`✨ ${lastingDebuff.name} moved into bubble above ${targetTokenName}!`, {
          description: lastingDebuff.description
        });
      }, 2800);
    }

    // Roll 3D physics damage/healing dice if the cast spell has a damageFormula (including upcasted formulas!)
    const expendedAimedSlot = aimedAction?.spellSlotRequired ?? aimedAction?.level ?? 0;
    if (expendedAimedSlot >= 1) {
      setHudCharacterData(prev => {
        if (!prev?.spellSlots?.[expendedAimedSlot]) return prev;
        const cur = prev.spellSlots[expendedAimedSlot];
        return {
          ...prev,
          spellSlots: {
            ...prev.spellSlots,
            [expendedAimedSlot]: { ...cur, available: Math.max(0, cur.available - 1) }
          }
        };
      });
    }
    const rawFormula = aimedAction?.damageFormula;
    const upcastLabel =
      aimedAction?.castAtLevel && aimedAction.castAtLevel > (aimedAction.level ?? 0)
        ? expendedAimedSlot >= 1 && aimedAction.castAtLevel > expendedAimedSlot
          ? ` (Level ${aimedAction.castAtLevel} • Uses Lvl ${expendedAimedSlot} Slot)`
          : ` (Level ${aimedAction.castAtLevel} Slot)`
        : '';

    if (rawFormula && isAutoRollDiceEnabledRef.current) {
      const evaluated = evaluateDiceFormula(rawFormula, false);
      const rolledTotal = evaluated.total;
      const diceResults = evaluated.dice;

      if (rolledTotal > 0) {
        const diceEvent: DdbDiceRollEvent = {
          id: `roll-${Date.now()}`,
          characterId: String(hudCharacterData?.id || claimedToken?.id || ''),
          characterName: claimedToken?.name || hudCharacterData?.name || 'Hero',
          avatarUrl: hudCharacterData?.avatarUrl || claimedToken?.avatarUrl || claimedToken?.url,
          action: `${aimedAction?.name || activeEquippedAsset.name}${upcastLabel} (${aimedAction?.isHeal ? 'Healing' : 'Damage'})`,
          rollType: aimedAction?.isHeal ? 'heal' : 'damage',
          formula: `${rawFormula} → ${evaluated.breakdown}`,
          diceNotation: rawFormula,
          dice: diceResults.length > 0 ? diceResults : [{ sides: 6, result: rolledTotal, type: 'd6' }],
          modifier: evaluated.bonus,
          total: rolledTotal,
          isCritical: false,
          isFumble: false,
          theme: selectedDicePreset.id,
          themeColor: aimedAction?.isHeal ? '#10b981' : selectedDicePreset.theme.primaryColor,
          timestamp: Date.now(),
          source: 'player'
        };

        if (socketRef.current?.connected) {
          socketRef.current.emit('SYNC_LOCAL_DICE_ROLL', diceEvent);
        }
        if (typeof window !== 'undefined' && (window as any).__mistwalkerRoll3d) {
          (window as any).__mistwalkerRoll3d(diceEvent);
        }

        toast.success(`Cast ${aimedAction?.name || activeEquippedAsset.name}${upcastLabel}!`, {
          description: `Rolled ${rolledTotal} ${aimedAction?.damageType || (aimedAction?.isHeal ? 'HP' : 'damage')} (${evaluated.breakdown})`
        });
      } else {
        toast.success(`Cast ${aimedAction?.name || activeEquippedAsset.name}${upcastLabel}!`);
      }
    } else {
      toast.success(`Cast ${aimedAction?.name || activeEquippedAsset.name}${upcastLabel}!`);
    }

    setAimOrigin(null);
    setAimCurrent(null);
    setActiveEquippedAsset(null);
    setActiveTargetingAction(null);
  }, [activeEquippedAsset, activeTargetingAction, tokens, claimedToken, gridSize, gridOffsetX, gridOffsetY, hudCharacterData, selectedDicePreset]);

  const handleEquipAsset = useCallback((asset: Jb2aAssetDefinition) => {
    setActiveEquippedAsset(asset);
    setActiveTargetingAction({
      id: asset.id,
      name: asset.name,
      description: asset.label,
      category: 'spells',
      type: 'action',
      rangeFt: asset.defaultSizeFt,
      jb2aAssetId: asset.id
    });
    setShowEffectsDrawer(false);

    if (claimedToken) {
      const tokenRadius = ((claimedToken.size || 1) * gridSize) / 2;
      setAimOrigin({ x: claimedToken.x + tokenRadius, y: claimedToken.y + tokenRadius });
    } else {
      setAimOrigin(null);
    }

    const isPoint = asset.paradigm === 'point' || asset.shape === 'circle' || asset.paradigm === 'aura';
    toast.info(`Aiming ${asset.name}`, {
      description: isPoint
        ? 'Click anywhere on the map to detonate.'
        : 'Click caster then target, or click and drag towards target.'
    });
  }, [claimedToken, gridSize]);

  const handleQuickPlaceAsset = useCallback((asset: Jb2aAssetDefinition) => {
    let posX = targetMapW / 2;
    let posY = targetMapH / 2;

    if (claimedToken) {
      const tokenRadius = ((claimedToken.size || 1) * gridSize) / 2;
      posX = claimedToken.x + tokenRadius;
      posY = claimedToken.y + tokenRadius;
    }

    const isAuraOrBuff = Boolean(
      asset.paradigm === 'aura' ||
      asset.shape === 'aura' ||
      asset.targetType === 'aura' ||
      asset.targetType === 'self'
    );

    const newEffect: VttEffectInstance = {
      id: `eff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: asset.name,
      label: asset.label,
      assetKey: asset.id,
      videoUrl: asset.webm,
      loopVideoUrl: asset.loopWebm,
      thumbUrl: asset.thumb,
      paradigm: asset.paradigm,
      x: posX,
      y: posY,
      sizeFt: asset.defaultSizeFt,
      rotation: 0,
      opacity: 1.0,
      blendMode: asset.blendMode,
      isPersistent: asset.isPersistent,
      loop: asset.isPersistent,
      attachedTokenId: (isAuraOrBuff && claimedToken) ? claimedToken.id : undefined,
      castTime: Date.now(),
      durationMs: 5000,
      soundKey: asset.soundKey,
      color: asset.color,
      ownerId: claimedToken?.id || claimedToken?.name || 'player',
      casterName: claimedToken?.name || 'Hero'
    };

    setEffects(prev => [...prev, newEffect]);
      if (asset.soundKey) soundCatalog.play(asset.soundKey);
      if (socketRef.current?.connected) {
        socketRef.current.emit('EFFECT_SPAWN', newEffect);
      }

      const lastingDebuff = findLastingDebuffConfig(asset.id || action.name);
      if (lastingDebuff && targetToken) {
        const targetTokenId = targetToken.id;
        const targetTokenName = targetToken.name;
        setTimeout(() => {
          const bubble = createDebuffBubbleFromConfig(lastingDebuff, caster.name || 'Hero');
          setTokens(prev => {
            const next = prev.map(t => {
              if (t.id !== targetTokenId) return t;
              const existing = t.bubbles || [];
              const filtered = existing.filter(b => b.sourceSpellId !== lastingDebuff.spellKey && b.label !== lastingDebuff.name);
              return { ...t, bubbles: [...filtered, bubble] };
            });
            tokensRef.current = next;
            if (socketRef.current?.connected) {
              socketRef.current.emit('SYNC_TOKENS', next);
            }
            return next;
          });
          toast.success(`✨ ${lastingDebuff.name} moved into bubble above ${targetTokenName}!`, {
            description: lastingDebuff.description
          });
        }, 2800);
      }
    toast.success(`Cast ${asset.name}!`, {
      description: `${asset.defaultSizeFt}ft ${asset.shape} placed at character position.`
    });
  }, [claimedToken, targetMapW, targetMapH, gridSize]);

  // Remove Spiritual Weapon animations whose weapon token was dismissed / deleted
  useEffect(() => {
    if (tokens.length === 0) return;
    const orphans = effects.filter(e =>
      e.assetKey === 'spiritual_weapon' &&
      e.attachedTokenId &&
      !tokens.some(t => t.id === e.attachedTokenId)
    );
    if (orphans.length === 0) return;
    setEffects(prev => prev.filter(e => !orphans.some(o => o.id === e.id)));
    if (socketRef.current?.connected) {
      orphans.forEach(o => socketRef.current?.emit('EFFECT_REMOVE', { id: o.id }));
    }
  }, [tokens, effects]);

  const handleClearEffects = useCallback(() => {
    setEffects([]);
    if (socketRef.current?.connected) {
      socketRef.current.emit('EFFECT_CLEAR_ALL');
    }
  }, []);

  const handleDispelEffect = useCallback((effectId: string) => {
    const target = effects.find(e => e.id === effectId);
    setEffects(prev => prev.filter(e => e.id !== effectId));
    if (socketRef.current?.connected) {
      socketRef.current.emit('EFFECT_REMOVE', { id: effectId });
    }
    soundCatalog.play('magic_shatter');
    if (target?.assetKey === 'spiritual_weapon' && target.attachedTokenId) {
      handleDeleteToken(target.attachedTokenId);
    }
    toast.success(`Dispelled ${target?.name || 'spell animation'}!`, {
      description: 'The visual effect has been removed without clearing other spells.'
    });
  }, [effects, handleDeleteToken]);

  const handleEffectComplete = useCallback((effectId: string) => {
    setEffects(prev => prev.filter(e => e.id !== effectId));
    if (socketRef.current?.connected) {
      socketRef.current.emit('EFFECT_REMOVE', { id: effectId });
    }
  }, []);

  const handleSelectStationMode = useCallback((mode: PlayerStationMode) => {
    setStationMode(mode);
    setShowStationModal(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('mistwalker_player_station_mode', mode);
    }
    if (mode === 'remote_player') {
      setShowCharacterSelectModal(true);
    } else {
      toast.success('Digital TV Table Mode active: Clean battlemap presentation.');
    }
  }, []);

  const handleSelectCharacterChoice = useCallback((choice: PlayerCharacterChoiceItem) => {
    if (typeof window !== 'undefined' && choice.name) {
      localStorage.setItem('mistwalker_player_claimed_name', choice.name);
    }

    if (choice.tokenId) {
      if (claimedTokenIdRef.current !== choice.tokenId) {
        claimedTokenIdRef.current = choice.tokenId;
        setClaimedTokenId(choice.tokenId);
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('mistwalker_player_claimed_token', choice.tokenId);
      }
    } else {
      const match = tokens.find(t =>
        (t.name || '').trim().toLowerCase() === choice.name.trim().toLowerCase() ||
        isDdbMatch(t.name, (t as any).characterId || t.id, (t as any).ddbCharacterId, choice.ddbCharacterId, choice.name)
      );
      if (match) {
        claimedTokenIdRef.current = match.id;
        setClaimedTokenId(match.id);
        if (typeof window !== 'undefined') {
          localStorage.setItem('mistwalker_player_claimed_token', match.id);
        }
      } else {
        claimedTokenIdRef.current = null;
        setClaimedTokenId(null);
      }
    }

    toast.success(`Playing as ${choice.name}!`, {
      description: `${choice.race} • ${choice.classLevel}`
    });
    setShowCharacterSelectModal(false);
  }, [tokens]);

  const handleSelectHudAction = useCallback((action: HudActionItem) => {
    if (activeTargetingAction?.id === action.id) {
      const prevSlot = activeTargetingAction.castAtLevel ?? activeTargetingAction.level ?? 0;
      const nextSlot = action.castAtLevel ?? action.level ?? 0;
      if (prevSlot !== nextSlot) {
        setActiveTargetingAction(action);
        toast.info(
          nextSlot > (action.level ?? 0)
            ? `Upcasting ${action.name} at Level ${nextSlot} Slot${action.damageFormula ? ` (${action.damageFormula})` : ''}`
            : `Targeting ${action.name} (Base Level ${nextSlot})`
        );
        return;
      }
      setActiveTargetingAction(null);
      setActiveEquippedAsset(null);
      setAimOrigin(null);
      setAimCurrent(null);
      return;
    }

    // Find matching JB2A visual asset definition
    let matchedAsset: Jb2aAssetDefinition | undefined;
    if (action.jb2aAssetId) {
      matchedAsset = JB2A_REGISTRY.find(a => a.id === action.jb2aAssetId);
    }
    if (!matchedAsset) {
      matchedAsset = findJb2aAsset(action.name);
    }

    // Immediate execution for pure physical combat maneuvers (e.g., Rage, Dash, Dodge, Disengage)
    // Spells (like Shield, Cure Wounds, Healing Word, Bless, etc.) enter active targeting so the player can aim/select onto tokens or self!
    const lowerName = action.name.toLowerCase();

    // Spiritual Weapon already manifested: selecting the spell again commands it to move & strike
    if (lowerName.includes('spiritual weapon') && claimedToken) {
      const existingWeapon = findSpiritualWeapon(tokensRef.current, claimedToken.id);
      if (existingWeapon) {
        setActiveEquippedAsset(null);
        setAimOrigin(null);
        setAimCurrent(null);
        setActiveTargetingAction({ ...action, isSpiritualStrike: true } as HudActionItem);
        toast.info('⚔️ Spiritual Weapon: click a creature to move up to 20 ft and strike', {
          description: 'Drag the weapon token to reposition it without attacking. Press Esc to cancel.'
        });
        return;
      }
    }

    // Handle Halo / Self-Illumination Glow Toggle from the Special tab
    if ((action.isHaloToggle || action.id === 'special-halo-glow') && claimedToken) {
      const nextHalo = !Boolean(claimedToken.haloActive);
      const radiusFt = action.rangeFt && action.rangeFt > 0 ? action.rangeFt : 20;
      handleUpdateToken(claimedToken.id, {
        haloActive: nextHalo,
        lightRadius: nextHalo ? radiusFt : 0
      } as any);
      soundCatalog.play('magic_chime');
      toast.success(
        nextHalo
          ? `😇 ${claimedToken.name} is now glowing (${radiusFt} ft. Bright Light)!`
          : `${claimedToken.name}'s illumination deactivated.`,
        { description: action.name }
      );
      return;
    }

    // Intercept Devotee's Censer: Healing Incense (10 ft Green Smoke Aura + 1d4 Healing)
    if ((lowerName.includes('healing incense') || action.id === 'special-devotees-censer') && claimedToken) {
      const tokenRadius = ((claimedToken.size || 1) * gridSize) / 2;
      const casterCenter = { x: claimedToken.x + tokenRadius, y: claimedToken.y + tokenRadius };
      const incenseAsset = JB2A_REGISTRY.find(a => a.id === 'healing_incense') || matchedAsset;
      const incenseEffect: VttEffectInstance = {
        id: `eff_incense_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: "Devotee's Censer: Healing Incense",
        label: "Healing Incense (10ft Green Smoke Healing Aura)",
        assetKey: 'healing_incense',
        videoUrl: incenseAsset?.webm || '/jb2a/Community/JAA/cloudKill.webm',
        loopVideoUrl: incenseAsset?.loopWebm || '/jb2a/Community/JAA/cloudKill.webm',
        thumbUrl: incenseAsset?.thumb || '/jb2a/Community/JAA/cloudKill.webp',
        paradigm: 'aura',
        x: casterCenter.x,
        y: casterCenter.y,
        sizeFt: action.rangeFt || 10,
        rotation: 0,
        opacity: 0.9,
        blendMode: 'screen',
        isPersistent: true,
        loop: true,
        attachedTokenId: claimedToken.id,
        castTime: Date.now(),
        durationMs: 60000,
        soundKey: 'radiant_heal',
        color: '#22c55e',
        ownerId: claimedToken.id,
        casterName: claimedToken.name || 'Hero',
        spellId: action.id,
        damageFormula: action.damageFormula || '1d4',
        damageType: 'healing',
        description: action.description,
        actionSnapshot: { ...action }
      };
      setEffects(prev => [...prev.filter(e => e.assetKey !== 'healing_incense' || e.attachedTokenId !== claimedToken.id), incenseEffect]);
      soundCatalog.play('radiant_heal');
      if (socketRef.current?.connected) {
        socketRef.current.emit('EFFECT_SPAWN', incenseEffect);
      }

      if (isAutoRollDiceEnabledRef.current) {
        const formula = action.damageFormula || '1d4';
        const evaluated = evaluateDiceFormula(formula, false);
        const rolledTotal = evaluated.total;
        const diceResults = evaluated.dice;

        const diceEvent: DdbDiceRollEvent = {
          id: `roll-${Date.now()}`,
          characterId: String(hudCharacterData?.id || claimedToken.id || ''),
          characterName: claimedToken.name || 'Hero',
          avatarUrl: hudCharacterData?.avatarUrl || claimedToken.avatarUrl || claimedToken.url,
          action: `${action.name} (10ft Aura Healing)`,
          rollType: 'heal',
          formula: `${formula} → ${evaluated.breakdown}`,
          diceNotation: formula,
          dice: diceResults.length > 0 ? diceResults : [{ sides: 4, result: rolledTotal, type: 'd4' }],
          modifier: evaluated.bonus,
          total: rolledTotal,
          isCritical: false,
          isFumble: false,
          theme: selectedDicePreset.id,
          themeColor: '#10b981',
          timestamp: Date.now(),
          source: 'player'
        };
        if (socketRef.current?.connected) {
          socketRef.current.emit('SYNC_LOCAL_DICE_ROLL', diceEvent);
        }
        if (typeof window !== 'undefined' && (window as any).__mistwalkerRoll3d) {
          (window as any).__mistwalkerRoll3d(diceEvent);
        }
        if (rolledTotal > 0 && socketRef.current?.connected) {
          socketRef.current.emit('REQUEST_TOKEN_MUTATION', {
            sourceTokenId: claimedToken.id,
            sourceName: claimedToken.name || 'Hero',
            targetTokenId: claimedToken.id,
            targetName: claimedToken.name || 'Hero',
            actionName: action.name,
            deltaHp: rolledTotal,
            requiresApproval: false,
            requestId: `req_incense_${Date.now()}`
          });
        }
        toast.success(`🌿 ${claimedToken.name}: Devotee's Censer Healing Incense Active!`, {
          description: `10 ft green smoke aura emanated for 1 minute • Restored +${rolledTotal} HP (${evaluated.breakdown}).`
        });
      } else {
        toast.success(`🌿 ${claimedToken.name}: Devotee's Censer Healing Incense Active!`, {
          description: `10 ft green smoke aura emanated for 1 minute.`
        });
      }
      setActiveTargetingAction(null);
      setActiveEquippedAsset(null);
      setAimOrigin(null);
      setAimCurrent(null);
      return;
    }

    // Intercept Wild Shape activation
    if (lowerName.includes('wild shape') || action.id === 'druid-wild-shape') {
      if (activeWildShape && claimedToken) {
        soundCatalog.play('nature_rustle', 0.8);
        const tokenRadius = ((claimedToken.size || 1) * gridSize) / 2;
        const revertEffect: VttEffectInstance = {
          id: `eff_revert_${Date.now()}`,
          name: 'Revert Wild Shape',
          label: 'Druid Shape Reversion',
          assetKey: 'druidcraft',
          videoUrl: '/jb2a/Library/Generic/Nature/PlantGrowthRing02_01_Regular_GreenRed_500x500.webm',
          thumbUrl: '/jb2a/Library/Generic/Nature/PlantGrowthRing02_01_Regular_GreenRed_Thumb.webp',
          paradigm: 'aura',
          x: claimedToken.x + tokenRadius,
          y: claimedToken.y + tokenRadius,
          sizeFt: 10,
          rotation: 0,
          opacity: 0.9,
          blendMode: 'screen',
          isPersistent: false,
      loop: false,
      durationMs: 3000,
          soundKey: 'nature_rustle',
                    castTime: Date.now()
        };
        setEffects(prev => [...prev, revertEffect]);
        if (socketRef.current?.connected) {
          socketRef.current.emit('EFFECT_SPAWN', revertEffect);
        }
        handleUpdateToken(claimedToken.id, {
          name: activeWildShape.originalName,
          url: activeWildShape.originalAvatarUrl,
          avatarUrl: activeWildShape.originalAvatarUrl,
          size: activeWildShape.originalSize,
          ac: activeWildShape.originalAc
        } as any);
        setHudCharacterData(prev => {
          if (!prev) return prev;
          const cleanAttacks = (prev.attacks || []).filter(a => !a.sourceLabel?.includes('Wild Shape'));
          return {
            ...prev,
            name: activeWildShape.originalName,
            avatarUrl: activeWildShape.originalAvatarUrl,
            ac: activeWildShape.originalAc,
            speed: activeWildShape.originalSpeed,
            walkSpeedFt: activeWildShape.originalWalkSpeedFt,
            wildShapeState: null,
            attacks: cleanAttacks
          };
        });
        const revertedBeastName = activeWildShape.beastName;
        activeWildShapeRef.current = null;
        setActiveWildShape(null);
        toast.success(`Reverted from ${revertedBeastName} back to Wood Elf!`, {
          description: `Normal stats, token size, and humanoid form restored.`
        });
      } else {
        setShowWildShapeModal(true);
      }
      return;
    }

    const isManeuver = [
      'dash', 'dodge', 'disengage', 'hide', 'rage', 'action surge', 'second wind',
      'harness divine power', 'channel divinity', 'divine intervention', 'blessed strikes',
      'blessed healer', 'destroy undead', 'enlightened magic', 'relentless endurance',
      'ki points', 'patient defense', 'step of the wind', 'wholeness of body',
      'quickened healing', 'indomitable', 'arcane recovery', 'portent', 'lucky',
      'wild shape', 'wild resurgence', 'crimson rite', 'magical cunning', 'cunning action', 'steady aim'
    ].some(k => lowerName.includes(k)) || (action.category === 'special' && action.isSelfAction);
    const isSpellOrTargeted = action.category === 'spells' || action.subCategory === 'spell' || action.isHeal || lowerName.includes('shield');
    if (action.isSelfAction && isManeuver && !isSpellOrTargeted && claimedToken) {
      const tokenRadius = ((claimedToken.size || 1) * gridSize) / 2;
      const casterCenter = { x: claimedToken.x + tokenRadius, y: claimedToken.y + tokenRadius };

      if (matchedAsset) {
        const newEffect: VttEffectInstance = {
          id: `eff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: matchedAsset.name,
          label: matchedAsset.label,
          assetKey: matchedAsset.id,
          videoUrl: matchedAsset.webm,
          loopVideoUrl: matchedAsset.loopWebm,
          thumbUrl: matchedAsset.thumb,
          paradigm: matchedAsset.paradigm,
          x: casterCenter.x,
          y: casterCenter.y,
          sizeFt: matchedAsset.defaultSizeFt,
          rotation: 0,
          opacity: 1.0,
          blendMode: matchedAsset.blendMode,
          isPersistent: matchedAsset.isPersistent,
          loop: matchedAsset.isPersistent,
          attachedTokenId: claimedToken.id,
          castTime: Date.now(),
          durationMs: 4000,
          soundKey: matchedAsset.soundKey,
          color: matchedAsset.color,
          ownerId: claimedToken.id,
          casterName: claimedToken.name || 'Hero'
        };
        setEffects(prev => [...prev, newEffect]);
        if (matchedAsset.soundKey) soundCatalog.play(matchedAsset.soundKey);
        if (socketRef.current?.connected) {
          socketRef.current.emit('EFFECT_SPAWN', newEffect);
        }
      }

      if (action.damageFormula && isAutoRollDiceEnabledRef.current) {
        const evaluated = evaluateDiceFormula(action.damageFormula, false);
        const rolledTotal = evaluated.total;
        const diceResults = evaluated.dice;

        if (typeof window !== 'undefined' && (window as any).__mistwalkerRoll3d && diceResults.length > 0) {
          (window as any).__mistwalkerRoll3d({
            id: `roll-${Date.now()}`,
            characterName: claimedToken.name || 'Hero',
            action: `${action.name}${action.isHeal ? ' (Self Heal)' : ''}`,
            rollType: action.isHeal ? 'heal' : 'roll',
            formula: `${action.damageFormula} → ${evaluated.breakdown}`,
            diceNotation: action.damageFormula,
            dice: diceResults,
            modifier: evaluated.bonus,
            total: rolledTotal,
            isCritical: false,
            isFumble: false,
            theme: selectedDicePreset.id,
            themeColor: selectedDicePreset.theme.primaryColor,
            timestamp: Date.now(),
            source: 'player'
          });
        }

        if (action.isHeal && rolledTotal > 0 && socketRef.current?.connected) {
          socketRef.current.emit('REQUEST_TOKEN_MUTATION', {
            sourceTokenId: claimedToken.id,
            sourceName: claimedToken.name || 'Hero',
            targetTokenId: claimedToken.id,
            targetName: claimedToken.name || 'Hero',
            actionName: action.name,
            deltaHp: rolledTotal,
            requiresApproval: false,
            requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
          });
        }

        if (socketRef.current?.connected && diceResults.length > 0) {
          socketRef.current.emit('SYNC_LOCAL_DICE_ROLL', {
            id: `roll-${Date.now()}`,
            characterId: String(hudCharacterData?.id || claimedToken.id || ''),
            characterName: claimedToken.name || 'Hero',
            avatarUrl: hudCharacterData?.avatarUrl || claimedToken.avatarUrl || claimedToken.url,
            action: `${action.name}${action.isHeal ? ' (Self Heal)' : ''}`,
            rollType: action.isHeal ? 'heal' : 'roll',
            formula: action.damageFormula,
            diceNotation: action.damageFormula,
            dice: diceResults,
            total: rolledTotal,
            isCritical: lowerName.includes('divine intervention') && rolledTotal <= (hudCharacterData?.totalLevel || 15),
            isFumble: false,
            theme: selectedDicePreset.id,
            themeColor: selectedDicePreset.theme.primaryColor,
            timestamp: Date.now(),
            source: 'player'
          });
        }

        const isDivInt = lowerName.includes('divine intervention');
        const divThreshold = hudCharacterData?.totalLevel || 15;
        toast.success(`${claimedToken.name}: ${action.name}!`, {
          description: isDivInt
            ? rolledTotal <= divThreshold
              ? `✨ DEITY INTERVENES! Rolled ${rolledTotal} on d100 (Target: ≤ ${divThreshold})`
              : `Rolled ${rolledTotal} on d100 (Target: ≤ ${divThreshold} — Try again after a Long Rest)`
            : action.isHeal
              ? `Restored +${rolledTotal} HP (${action.damageFormula})`
              : `Rolled ${rolledTotal}${action.damageType ? ` ${action.damageType}` : ''} (${action.damageFormula})`
        });
      } else {
        toast.success(`${claimedToken.name} used ${action.name}!`, {
          description: action.description
        });
      }

      setActiveTargetingAction(null);
      setActiveEquippedAsset(null);
      setAimOrigin(null);
      setAimCurrent(null);
      return;
    }

    // Intercept Beast Form Attacks (Wild Shape) to allow Radiant strikes or standard damage
    if (activeWildShape && action.sourceLabel?.includes('Wild Shape')) {
      setActiveTargetingAction(action);
      if (matchedAsset) setActiveEquippedAsset(matchedAsset);
      if (claimedToken) {
        const tokenRadius = ((claimedToken.size || 1) * gridSize) / 2;
        setAimOrigin({ x: claimedToken.x + tokenRadius, y: claimedToken.y + tokenRadius });
      }
      return;
    }

    setActiveTargetingAction(action);

    if (matchedAsset) {
      setActiveEquippedAsset(matchedAsset);
    }

    if (claimedToken) {
      const tokenRadius = ((claimedToken.size || 1) * gridSize) / 2;
      setAimOrigin({ x: claimedToken.x + tokenRadius, y: claimedToken.y + tokenRadius });
    }

    toast.info(`Targeting: ${action.name}`, {
      description: 'Click target token to execute action, or press Esc to cancel.'
    });
  }, [activeTargetingAction, claimedToken, gridSize, selectedDicePreset, activeWildShape, handleUpdateToken]);

  const handleRollToHit = useCallback((action: HudActionItem) => {
    if (action.hitBonus === undefined) return;

    const rawHit = typeof action.hitBonus === 'number'
      ? action.hitBonus
      : (parseInt(String(action.hitBonus).replace('+', ''), 10) || 0);
    const modStr = rawHit >= 0 ? `+${rawHit}` : `${rawHit}`;
    const d20 = Math.floor(Math.random() * 20) + 1;
    const total = d20 + rawHit;
    const isCrit = d20 === 20;
    const isFumble = d20 === 1;

    const charName = hudCharacterData?.name || claimedToken?.name || 'Hero';
    const diceEvent: DdbDiceRollEvent = {
      id: `roll-${Date.now()}`,
      characterId: String(hudCharacterData?.id || claimedToken?.id || ''),
      characterName: charName,
      avatarUrl: hudCharacterData?.avatarUrl || claimedToken?.avatarUrl || claimedToken?.url,
      action: `${action.name} (To Hit)`,
      rollType: 'attack',
      formula: `1d20 ${modStr}`,
      diceNotation: '1d20',
      dice: [{ sides: 20, result: d20, type: 'd20' }],
      modifier: rawHit,
      total,
      isCritical: isCrit,
      isFumble: isFumble,
      theme: selectedDicePreset.id,
      themeColor: isCrit ? '#10b981' : isFumble ? '#ef4444' : selectedDicePreset.theme.primaryColor,
      timestamp: Date.now(),
      source: 'player'
    };

    if (socketRef.current?.connected) {
      socketRef.current.emit('SYNC_LOCAL_DICE_ROLL', diceEvent);
    }
    if (typeof window !== 'undefined' && (window as any).__mistwalkerRoll3d) {
      (window as any).__mistwalkerRoll3d(diceEvent);
    }

    toast.success(`${charName}: ${action.name} To Hit!`, {
      description: isCrit
        ? `CRITICAL HIT! Nat 20 ${modStr} = ${total}`
        : isFumble
        ? `NATURAL 1 FUMBLE! Nat 1 ${modStr} = ${total}`
        : `Rolled ${d20} ${modStr} = ${total} to Hit!`
    });
  }, [hudCharacterData, claimedToken, selectedDicePreset]);

  const handleRollDamage = useCallback((action: HudActionItem) => {
    const rawFormula = action.damageFormula;
    if (!rawFormula) return;

    const evaluated = evaluateDiceFormula(rawFormula, false);
    const rolledTotal = evaluated.total;
    const diceResults = evaluated.dice;

    const charName = hudCharacterData?.name || claimedToken?.name || 'Hero';
    const upcastSuffix =
      action.castAtLevel && action.castAtLevel > (action.level ?? 0)
        ? ` [Lvl ${action.castAtLevel} Slot]`
        : '';

    const diceEvent: DdbDiceRollEvent = {
      id: `roll-${Date.now()}`,
      characterId: String(hudCharacterData?.id || claimedToken?.id || ''),
      characterName: charName,
      avatarUrl: hudCharacterData?.avatarUrl || claimedToken?.avatarUrl || claimedToken?.url,
      action: `${action.name}${upcastSuffix} (${action.isHeal ? 'Healing' : 'Damage'})`,
      rollType: action.isHeal ? 'heal' : 'damage',
      formula: `${rawFormula} → ${evaluated.breakdown}`,
      diceNotation: rawFormula,
      dice: diceResults.length > 0 ? diceResults : [{ sides: 8, result: rolledTotal, type: 'd8' }],
      modifier: evaluated.bonus,
      total: rolledTotal,
      isCritical: false,
      isFumble: false,
      theme: selectedDicePreset.id,
      themeColor: action.isHeal ? '#10b981' : selectedDicePreset.theme.primaryColor,
      timestamp: Date.now(),
      source: 'player'
    };

    if (socketRef.current?.connected) {
      socketRef.current.emit('SYNC_LOCAL_DICE_ROLL', diceEvent);
    }
    if (typeof window !== 'undefined' && (window as any).__mistwalkerRoll3d) {
      (window as any).__mistwalkerRoll3d(diceEvent);
    }

    toast.success(`${charName}: ${action.name}${upcastSuffix}!`, {
      description: `Rolled ${rolledTotal} ${action.damageType || (action.isHeal ? 'HP' : 'damage')} (${evaluated.breakdown})`
    });
  }, [hudCharacterData, claimedToken, selectedDicePreset]);

  // Wild Shape Transform & Revert Handlers for Druids (e.g. G'aiah)
  const handleTransformWildShape = useCallback((form: WildShapeBeastForm, effectiveDruidLevel?: number) => {
    if (!claimedToken) {
      toast.error('No character token claimed on board.');
      return;
    }

    const druidLevel = effectiveDruidLevel || hudCharacterData?.totalLevel || 6;
    const wisModifier = 4;
    const tempHpGranted = druidLevel >= 3 ? druidLevel * 3 : 2; // 2024 Circle of the Moon: 3 x Druid Level (18 THP at Lv 6)
    const calculatedAc = Math.max(form.baseAc, 13 + wisModifier); // 17 AC

    // Save previous state for revert
    const prevState: ActiveWildShapeState = activeWildShape
      ? {
          ...activeWildShape,
          beastFormId: form.id,
          beastName: form.name,
          tempHpGranted,
          startedAt: Date.now()
        }
      : {
          originalName: (claimedToken.name || "G'aiah").replace(/\s*\([^)]*\)\s*$/, '').trim(),
          originalAvatarUrl: claimedToken.url || claimedToken.avatarUrl || getCharacterTokenUrl(claimedToken.name),
          originalSize: claimedToken.size || 1,
          originalAc: claimedToken.ac || 12,
          originalSpeed: hudCharacterData?.speed || '35 ft.',
          originalWalkSpeedFt: hudCharacterData?.walkSpeedFt || 35,
          beastFormId: form.id,
          beastName: form.name,
          tempHpGranted,
          startedAt: Date.now(),
          durationHours: 3,
          canRadiantStrikes: true
        };
    activeWildShapeRef.current = prevState;
    setActiveWildShape(prevState);

    // Minimize modal & collapse HUD tray so G'aiah can watch her transformation on the board
    setShowWildShapeModal(false);
    setHudCollapseTick(t => t + 1);

    // 1. Play Druid Bloom / Nature Swirl SFX
    soundCatalog.play('druid_bloom', 1.0);

    // 2. Spawn Nature Transformation Effect on Token position
    const tokenRadius = ((claimedToken.size || 1) * gridSize) / 2;
    const burstEffect: VttEffectInstance = {
      id: `eff_ws_${Date.now()}`,
      name: 'Wild Shape Transformation',
      label: 'Druid Wild Shape Bloom',
      assetKey: 'druidcraft',
      videoUrl: '/jb2a/Library/Generic/Nature/PlantGrowthRing02_01_Regular_GreenRed_500x500.webm',
      thumbUrl: '/jb2a/Library/Generic/Nature/PlantGrowthRing02_01_Regular_GreenRed_Thumb.webp',
      paradigm: 'aura',
      x: claimedToken.x + tokenRadius,
      y: claimedToken.y + tokenRadius,
      sizeFt: form.sizeMultiplier * 10,
      rotation: 0,
      opacity: 1.0,
      blendMode: 'screen',
      isPersistent: false,
      loop: false,
      durationMs: 3500,
      soundKey: 'druid_bloom',
            castTime: Date.now()
    };
    setEffects(prev => [...prev, burstEffect]);
    if (socketRef.current?.connected) {
      socketRef.current.emit('EFFECT_SPAWN', burstEffect);
    }

    // 3. Update Token on Map (Footprint Size, Avatar, Temp HP, AC)
    const nextTempHp = Math.max(claimedToken.tempHp || 0, tempHpGranted);
    handleUpdateToken(claimedToken.id, {
      name: `${prevState.originalName} (${form.name})`,
      url: form.avatarUrl,
      avatarUrl: form.avatarUrl,
      size: form.sizeMultiplier,
      tempHp: nextTempHp,
      ac: calculatedAc
    } as any);

    // 4. Ingest Beast Attacks & Traits into HUD
    setHudCharacterData(prev => {
      if (!prev) return prev;
      const filteredAttacks = (prev.attacks || []).filter(a => !a.sourceLabel?.includes('Wild Shape'));
      return {
        ...prev,
        name: `${prevState.originalName} (${form.name})`,
        avatarUrl: form.avatarUrl,
        ac: calculatedAc,
        tempHp: nextTempHp,
        speed: form.speed,
        walkSpeedFt: form.walkSpeedFt,
        wildShapeState: prevState,
        attacks: [...form.attacks, ...filteredAttacks]
      };
    });

    toast.success(`🌿 Wild Shape: Transformed into ${form.name}!`, {
      description: `Gained +${tempHpGranted} Temp HP • AC ${calculatedAc} • Size: ${form.size} (${form.sizeMultiplier}x${form.sizeMultiplier}) • Speed: ${form.speed}`
    });
  }, [claimedToken, activeWildShape, hudCharacterData, gridSize, handleUpdateToken]);

  const handleRevertWildShape = useCallback(() => {
    if (!claimedToken || !activeWildShape) {
      toast.info('No active Wild Shape form to revert.');
      return;
    }

    soundCatalog.play('nature_rustle', 0.8);

    // Spawn reverting swirl
    const tokenRadius = ((claimedToken.size || 1) * gridSize) / 2;
    const revertEffect: VttEffectInstance = {
      id: `eff_revert_${Date.now()}`,
      name: 'Revert Wild Shape',
      label: 'Druid Shape Reversion',
      assetKey: 'druidcraft',
      videoUrl: '/jb2a/Library/Generic/Nature/PlantGrowthRing02_01_Regular_GreenRed_500x500.webm',
      thumbUrl: '/jb2a/Library/Generic/Nature/PlantGrowthRing02_01_Regular_GreenRed_Thumb.webp',
      paradigm: 'aura',
      x: claimedToken.x + tokenRadius,
      y: claimedToken.y + tokenRadius,
      sizeFt: 10,
      rotation: 0,
      opacity: 0.9,
      blendMode: 'screen',
      isPersistent: false,
      loop: false,
      durationMs: 3000,
      soundKey: 'nature_rustle',
            castTime: Date.now()
    };
    setEffects(prev => [...prev, revertEffect]);
    if (socketRef.current?.connected) {
      socketRef.current.emit('EFFECT_SPAWN', revertEffect);
    }

    // Revert token properties
    handleUpdateToken(claimedToken.id, {
      name: activeWildShape.originalName,
      url: activeWildShape.originalAvatarUrl,
      avatarUrl: activeWildShape.originalAvatarUrl,
      size: activeWildShape.originalSize,
      ac: activeWildShape.originalAc
    } as any);

    // Revert HUD data
    setHudCharacterData(prev => {
      if (!prev) return prev;
      const cleanAttacks = (prev.attacks || []).filter(a => !a.sourceLabel?.includes('Wild Shape'));
      return {
        ...prev,
        name: activeWildShape.originalName,
        avatarUrl: activeWildShape.originalAvatarUrl,
        ac: activeWildShape.originalAc,
        speed: activeWildShape.originalSpeed,
        walkSpeedFt: activeWildShape.originalWalkSpeedFt,
        wildShapeState: null,
        attacks: cleanAttacks
      };
    });

    const revertedBeastName = activeWildShape.beastName;
    activeWildShapeRef.current = null;
    setActiveWildShape(null);

    toast.success(`Reverted from ${revertedBeastName} back to Wood Elf!`, {
      description: `Normal stats, token size, and humanoid form restored.`
    });
  }, [claimedToken, activeWildShape, gridSize, handleUpdateToken]);

  const handleInspectEffect = useCallback((effect: VttEffectInstance) => {
    const cleanName = (effect.name || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
    const lowerClean = cleanName.toLowerCase();

    // 1. Check if the effect has a saved actionSnapshot or matches a spell/action in the character's HUD
    const allHudActions: HudActionItem[] = [
      ...(hudCharacterData?.spells || []),
      ...(hudCharacterData?.actions || []),
      ...(hudCharacterData?.bonusActions || []),
      ...(hudCharacterData?.reactions || [])
    ];
    const matchedHudAction = allHudActions.find(
      a => a.id === effect.spellId || a.name.trim().toLowerCase() === lowerClean
    );

    const rule = lookupDndRuleDetails(cleanName, 'aura') || lookupDndRuleDetails(cleanName, 'spell');

    const baseAction: HudActionItem = effect.actionSnapshot || matchedHudAction || {
      id: effect.spellId || effect.assetKey || effect.id,
      name: cleanName || effect.name,
      category: 'spells',
      type: 'action',
      subCategory: 'spell',
      level: effect.baseLevel ?? rule?.level ?? 3,
      school: rule?.school,
      sourceLabel: rule?.subtitle || 'Active Magical Aura',
      castingTime: rule?.castingTime || '1 Action',
      rangeFt: effect.sizeFt || 15,
      components: rule?.components || 'V, S',
      duration: rule?.duration || 'Concentration, up to 10 minutes',
      saveDc: effect.saveDc ?? hudCharacterData?.spellSaveDc,
      saveAbility: effect.saveAbility ?? rule?.saveAbility,
      damageFormula: effect.damageFormula ?? rule?.damageFormula,
      damageType: effect.damageType ?? rule?.damageType,
      isHeal: rule?.isHeal,
      description: effect.description || rule?.description || `${cleanName} active aura (${effect.sizeFt || 15} ft radius).`,
      atHigherLevels: effect.atHigherLevels || rule?.higherLevels
    };

    const resolvedAction: HudActionItem = {
      ...baseAction,
      castAtLevel: effect.castAtLevel ?? baseAction.castAtLevel ?? baseAction.level,
      damageFormula: effect.damageFormula ?? baseAction.damageFormula,
      damageType: effect.damageType ?? baseAction.damageType,
      saveDc: effect.saveDc ?? baseAction.saveDc ?? hudCharacterData?.spellSaveDc,
      saveAbility: effect.saveAbility ?? baseAction.saveAbility
    };

    const isDockVisible = (stationMode === 'remote_player' || Boolean(claimedToken)) && !isUiMinimized;
    if (isDockVisible) {
      setInspectedAuraRequest({ action: resolvedAction, tick: Date.now() });
    } else {
      setInspectedRuleEntry({
        name: resolvedAction.name,
        category: 'aura',
        subtitle: resolvedAction.sourceLabel || 'Active Magical Aura',
        level: resolvedAction.level,
        castAtLevel: resolvedAction.castAtLevel,
        school: resolvedAction.school,
        castingTime: resolvedAction.castingTime,
        range: `${effect.sizeFt || resolvedAction.rangeFt || 15} ft radius`,
        components: resolvedAction.components,
        duration: resolvedAction.duration,
        damageFormula: resolvedAction.damageFormula,
        damageType: resolvedAction.damageType,
        saveDc: resolvedAction.saveDc,
        saveAbility: resolvedAction.saveAbility,
        isHeal: resolvedAction.isHeal,
        description: resolvedAction.description,
        higherLevels: resolvedAction.atHigherLevels
      });
    }
  }, [hudCharacterData, stationMode, claimedToken, isUiMinimized]);

  const handleClearTokenAura = useCallback((tokenId: string, auraName?: string) => {
    const targetTok = tokensRef.current.find(t => t.id === tokenId);
    handleUpdateToken(tokenId, {
      auraRadius: undefined,
      auraColor: undefined,
      auraName: undefined,
      auraOpacity: undefined,
      auras: []
    });
    toast.info(`Removed ${auraName || 'aura'} from ${targetTok?.name || 'token'}`);
  }, [handleUpdateToken]);

  // Spiritual Weapon bonus-action strike: move up to 20 ft, then make a melee spell attack + damage roll
  const handleSpiritualWeaponStrike = useCallback((targetToken: Token, action: HudActionItem) => {
    if (!claimedToken) return;
    const weapon = findSpiritualWeapon(tokensRef.current, claimedToken.id);
    if (!weapon) {
      toast.warning('No active Spiritual Weapon. Cast the spell first to manifest it.');
      setActiveTargetingAction(null);
      return;
    }
    if (targetToken.id === weapon.id || targetToken.id === claimedToken.id) {
      toast.info('Choose a creature to strike with your Spiritual Weapon.');
      return;
    }

    const sw = (weapon as any).spiritualWeapon as { ownerId: string; hitBonus: string | number; damageFormula: string; castLevel?: number };
    const wRadius = ((weapon.size || 1) * gridSize) / 2;
    const tRadius = ((targetToken.size || 1) * gridSize) / 2;
    const wCenter = { x: weapon.x + wRadius, y: weapon.y + wRadius };
    const tCenter = { x: targetToken.x + tRadius, y: targetToken.y + tRadius };
    const centerDistPx = Math.hypot(tCenter.x - wCenter.x, tCenter.y - wCenter.y);
    const edgeFt = Math.max(0, ((centerDistPx - wRadius - tRadius) / gridSize) * 5);
    const MOVE_FT = 20;
    const REACH_FT = 5;
    if (edgeFt > MOVE_FT + REACH_FT + 2) {
      toast.error(`Out of reach! Target is ${Math.round(edgeFt)} ft from the weapon (it moves 20 ft, then strikes within 5 ft). Drag the weapon closer first.`);
      return;
    }

    // Step 1: weapon flies adjacent to the target
    let movedFt = 0;
    if (edgeFt > REACH_FT + 1 && centerDistPx > 0) {
      const ux = (wCenter.x - tCenter.x) / centerDistPx;
      const uy = (wCenter.y - tCenter.y) / centerDistPx;
      const destCenterX = tCenter.x + ux * (tRadius + wRadius);
      const destCenterY = tCenter.y + uy * (tRadius + wRadius);
      const destX = Math.round((destCenterX - wRadius - gridOffsetX) / gridSize) * gridSize + gridOffsetX;
      const destY = Math.round((destCenterY - wRadius - gridOffsetY) / gridSize) * gridSize + gridOffsetY;
      movedFt = Math.round((Math.hypot(destX - weapon.x, destY - weapon.y) / gridSize) * 5);
      handleMoveToken(weapon.id, destX, destY, movedFt);
    }

    // Step 2: attack roll (d20 + spell attack bonus)
    const rawHit = typeof sw.hitBonus === 'number'
      ? sw.hitBonus
      : (parseInt(String(sw.hitBonus).replace('+', ''), 10) || 0);
    const modStr = rawHit >= 0 ? `+${rawHit}` : `${rawHit}`;
    const d20 = Math.floor(Math.random() * 20) + 1;
    const attackTotal = d20 + rawHit;
    const isCrit = d20 === 20;
    const isFumble = d20 === 1;
    const targetAc = typeof targetToken.ac === 'number' ? targetToken.ac : undefined;
    const isHit = isCrit || (!isFumble && (targetAc === undefined || attackTotal >= targetAc));
    const charName = hudCharacterData?.name || claimedToken.name || 'Hero';
    const strikeDelay = movedFt > 0 ? 700 : 150;

    const emitDice = (evt: DdbDiceRollEvent) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('SYNC_LOCAL_DICE_ROLL', evt);
      }
      if (typeof window !== 'undefined' && (window as any).__mistwalkerRoll3d) {
        (window as any).__mistwalkerRoll3d(evt);
      }
    };

    window.setTimeout(() => {
      // Strike animation on the target
      const swAsset = JB2A_REGISTRY.find(a => a.id === 'spiritual_weapon');
      if (swAsset) {
        const strikeEffect: VttEffectInstance = {
          id: `eff_sw_strike_${Date.now()}`,
          name: 'Spiritual Weapon Strike',
          label: 'Spiritual Weapon Strike',
          assetKey: 'spiritual_weapon_strike',
          videoUrl: swAsset.webm,
          thumbUrl: swAsset.thumb,
          paradigm: 'point',
          x: tCenter.x,
          y: tCenter.y,
          sizeFt: 4,
          rotation: 0,
          opacity: 1.0,
          blendMode: swAsset.blendMode,
          isPersistent: false,
          loop: false,
          castTime: Date.now(),
          durationMs: 2500,
          soundKey: swAsset.soundKey,
          color: swAsset.color,
          ownerId: claimedToken.id,
          casterName: claimedToken.name || 'Hero'
        } as VttEffectInstance;
        setEffects(prev => [...prev, strikeEffect]);
        if (swAsset.soundKey) soundCatalog.play(swAsset.soundKey);
        if (socketRef.current?.connected) {
          socketRef.current.emit('EFFECT_SPAWN', strikeEffect);
        }
      }

      if (!isAutoRollDiceEnabledRef.current) {
        setPendingCombatRoll({
          actor: {
            id: claimedToken.id,
            name: charName,
            avatarUrl: hudCharacterData?.avatarUrl || claimedToken.avatarUrl || claimedToken.url
          },
          target: {
            id: targetToken.id,
            name: targetToken.name,
            avatarUrl: targetToken.avatarUrl || targetToken.url,
            ac: targetAc
          },
          action: {
            id: 'spiritual_weapon_strike',
            name: 'Spiritual Weapon Strike',
            category: 'bonus_actions',
            type: 'bonus_action',
            hitBonus: rawHit,
            damageFormula: sw.damageFormula,
            damageType: 'force',
            description: 'Spiritual Weapon melee spell attack'
          },
          phase: 'to_hit',
          hitBonus: rawHit,
          damageFormula: sw.damageFormula,
          isHeal: false,
          context: 'player_view'
        });
        return;
      }

      emitDice({
        id: `roll-sw-atk-${Date.now()}`,
        characterId: String(hudCharacterData?.id || claimedToken.id || ''),
        characterName: charName,
        avatarUrl: hudCharacterData?.avatarUrl || claimedToken.avatarUrl || claimedToken.url,
        action: 'Spiritual Weapon (To Hit)',
        rollType: 'attack',
        formula: `1d20 ${modStr}`,
        diceNotation: '1d20',
        dice: [{ sides: 20, result: d20, type: 'd20' }],
        modifier: rawHit,
        total: attackTotal,
        isCritical: isCrit,
        isFumble: isFumble,
        theme: selectedDicePreset.id,
        themeColor: isCrit ? '#10b981' : isFumble ? '#ef4444' : selectedDicePreset.theme.primaryColor,
        timestamp: Date.now(),
        source: 'player'
      } as DdbDiceRollEvent);

      toast[isHit ? 'success' : 'error'](
        isCrit
          ? `Spiritual Weapon CRITICAL HIT on ${targetToken.name}! (Nat 20 ${modStr} = ${attackTotal})`
          : isFumble
          ? `Spiritual Weapon missed ${targetToken.name} (Natural 1)`
          : isHit
          ? `Spiritual Weapon hits ${targetToken.name}! (${d20} ${modStr} = ${attackTotal}${targetAc !== undefined ? ` vs AC ${targetAc}` : ''})`
          : `Spiritual Weapon misses ${targetToken.name} (${d20} ${modStr} = ${attackTotal} vs AC ${targetAc})`,
        targetAc === undefined && isHit && !isCrit
          ? { description: 'Target AC is hidden - the DM confirms the hit.' }
          : undefined
      );
    }, strikeDelay);

    // Step 3: damage roll on a hit (1d8 + spellcasting modifier force, doubled dice on a crit)
    if (isHit && isAutoRollDiceEnabledRef.current) {
      window.setTimeout(() => {
        const evaluated = evaluateDiceFormula(sw.damageFormula, isCrit);
        const dmg = evaluated.total;
        emitDice({
          id: `roll-sw-dmg-${Date.now()}`,
          characterId: String(hudCharacterData?.id || claimedToken.id || ''),
          characterName: charName,
          avatarUrl: hudCharacterData?.avatarUrl || claimedToken.avatarUrl || claimedToken.url,
          action: `Spiritual Weapon (Force Damage${isCrit ? ' - Critical' : ''})`,
          rollType: 'damage',
          formula: `${sw.damageFormula} → ${evaluated.breakdown}`,
          diceNotation: sw.damageFormula,
          dice: evaluated.dice.length > 0 ? evaluated.dice : [{ sides: 8, result: dmg, type: 'd8' }],
          modifier: evaluated.bonus,
          total: dmg,
          isCritical: isCrit,
          isFumble: false,
          theme: selectedDicePreset.id,
          themeColor: selectedDicePreset.theme.primaryColor,
          timestamp: Date.now(),
          source: 'player'
        } as DdbDiceRollEvent);

        const isTargetAlly = targetToken.category === 'ally' || Boolean((targetToken as any).allyId);
        const isTargetMonster = !isTargetAlly && (isMonsterToken(targetToken) || targetToken.isMonster === true || targetToken.category === 'monster' || targetToken.isPlayer === false);
        const isTargetOtherPlayer = Boolean(targetToken.isPlayer);
        const requiresApproval = isTargetOtherPlayer || (isTargetMonster && !autoApplyMonsterDamage) || targetAc === undefined;
        if (socketRef.current?.connected) {
          socketRef.current.emit('REQUEST_TOKEN_MUTATION', {
            sourceTokenId: claimedToken.id,
            sourceName: claimedToken.name || 'Hero',
            targetTokenId: targetToken.id,
            targetName: targetToken.name || 'Target',
            actionName: `Spiritual Weapon${isCrit ? ' (Critical)' : ''}`,
            deltaHp: -dmg,
            requiresApproval,
            isMonster: isTargetMonster,
            requestId: `req_sw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
          });
        }
      }, strikeDelay + 1800);
    }

    setActiveTargetingAction(null);
    setActiveEquippedAsset(null);
    setAimOrigin(null);
    setAimCurrent(null);
  }, [claimedToken, gridSize, gridOffsetX, gridOffsetY, handleMoveToken, hudCharacterData, selectedDicePreset, autoApplyMonsterDamage]);

  const handleTargetToken = useCallback((targetToken: Token) => {
    if (!activeTargetingAction) return;
    const now = Date.now();
    if (now - lastTargetTimeRef.current < 450 || now - lastCastTimeRef.current < 450) return;
    lastTargetTimeRef.current = now;
    lastCastTimeRef.current = now;
    const action = activeTargetingAction;
    const caster = claimedToken;
    if (!caster) {
      toast.warning('Claim a character first before executing actions.');
      return;
    }

    if ((action as any).isSpiritualStrike) {
      handleSpiritualWeaponStrike(targetToken, action);
      return;
    }

    // 1. Calculate distance on battlemap grid
    const cRadius = ((caster.size || 1) * gridSize) / 2;
    const tRadius = ((targetToken.size || 1) * gridSize) / 2;
    const casterCenter = { x: caster.x + cRadius, y: caster.y + cRadius };
    const targetCenter = { x: targetToken.x + tRadius, y: targetToken.y + tRadius };
    const distPx = Math.hypot(targetCenter.x - casterCenter.x, targetCenter.y - casterCenter.y);
    const distFt = Math.round((distPx / gridSize) * 5);

    // Range advisory (notify player with distance, but never block damage/attack execution)
    const isSelfTarget = targetToken.id === caster.id;
    if (action.rangeFt === 0 && !isSelfTarget && action.isSelfAction) {
      toast.warning(`${action.name} only targets yourself!`);
      return;
    }

    if (action.rangeFt && action.rangeFt > 0 && distFt > action.rangeFt + 2) {
      toast.info(`Target is ${distFt} ft away (${action.name} base range: ${action.rangeFt} ft). Executing attack.`);
    }

    // 2. Play JB2A Spell Animation & Sound
    const asset = activeEquippedAsset || (action.jb2aAssetId ? JB2A_REGISTRY.find(a => a.id === action.jb2aAssetId) : undefined) || findJb2aAsset(action.name);
    if (asset) {
      const lowerActName = action.name.toLowerCase();
      const isCasterSelfAura = Boolean(
        asset.targetType === 'aura' ||
        asset.targetType === 'self' ||
        action.rangeFt === 0 ||
        ['spirit_guardians', 'aura_of_vitality', 'aura_of_life', 'aura_of_purity', 'crusaders_mantle', 'holy_aura', 'circle_of_power', 'detect_magic', 'shield', 'armor_of_agathys', 'fire_shield', 'shadow_of_moil', 'ashardalons_stride', 'twilight_sanctuary', 'healing_incense'].includes(asset.id) ||
        ['spirit guardians', 'aura of vitality', 'aura of life', 'aura of purity', 'crusader\'s mantle', 'holy aura', 'circle of power', 'detect magic', 'armor of agathys', 'fire shield', 'shadow of moil', 'ashardalon\'s stride', 'twilight sanctuary', 'healing incense', 'devotee\'s censer', 'devotees censer'].some(k => lowerActName.includes(k))
      );

      const isAuraOrBuff = Boolean(
        isCasterSelfAura ||
        asset.paradigm === 'aura' ||
        asset.shape === 'aura' ||
        asset.id === 'shield_of_faith' ||
        asset.id === 'sanctuary' ||
        asset.id === 'shield' ||
        asset.id === 'bless' ||
        asset.id === 'mage_armor' ||
        lowerActName.includes('shield of faith') ||
        lowerActName.includes('sanctuary') ||
        lowerActName.includes('shield') ||
        lowerActName.includes('bless') ||
        lowerActName.includes('ward')
      );

      const auraLockedToken = isCasterSelfAura ? caster : targetToken;
      const auraLockedCenter = isCasterSelfAura ? casterCenter : targetCenter;
      const isAuraSelf = auraLockedToken.id === caster.id;

      const isDirectional = !isAuraOrBuff && (asset.paradigm === 'cone' || asset.paradigm === 'line');
      const isTrajectory = !isAuraOrBuff && !isDirectional && ((asset.paradigm === 'projectile' || asset.paradigm === 'ray') || Boolean(asset.projectileWebm)) && distPx > 15;
      const aimAngleDeg = Math.atan2(targetCenter.y - casterCenter.y, targetCenter.x - casterCenter.x) * (180 / Math.PI);

      const isCone = !isAuraOrBuff && (asset.paradigm === 'cone' || asset.targetType === 'cone' || asset.shape === 'cone');
      let dirOrigin = casterCenter;
      let dirAngleDeg = aimAngleDeg;
      if (isCone) {
        const coneInfo = getDirectionalConeOrigin(casterCenter, targetCenter, tokens, gridSize, caster);
        dirOrigin = { x: coneInfo.x, y: coneInfo.y };
        dirAngleDeg = Math.atan2(targetCenter.y - coneInfo.tokenCenter.y, targetCenter.x - coneInfo.tokenCenter.x) * (180 / Math.PI);
      }
      const newEffect: VttEffectInstance = {
        id: `eff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: (isAuraOrBuff ? isAuraSelf : isSelfTarget) ? asset.name : `${asset.name} (${auraLockedToken.name})`,
        label: (isAuraOrBuff ? isAuraSelf : isSelfTarget) ? asset.label : `${asset.label} on ${auraLockedToken.name}`,
        assetKey: asset.id,
        videoUrl: (isTrajectory && asset.projectileWebm) ? asset.projectileWebm : asset.webm,
        loopVideoUrl: asset.loopWebm,
        thumbUrl: asset.thumb,
        paradigm: isTrajectory ? 'projectile' : (isAuraOrBuff ? 'aura' : asset.paradigm),
        x: isCone ? dirOrigin.x : ((isTrajectory || isDirectional) ? casterCenter.x : (isAuraOrBuff ? auraLockedCenter.x : targetCenter.x)),
        y: isCone ? dirOrigin.y : ((isTrajectory || isDirectional) ? casterCenter.y : (isAuraOrBuff ? auraLockedCenter.y : targetCenter.y)),
        originX: isCone ? dirOrigin.x : casterCenter.x,
        originY: isCone ? dirOrigin.y : casterCenter.y,
        targetX: isAuraOrBuff ? auraLockedCenter.x : targetCenter.x,
        targetY: isAuraOrBuff ? auraLockedCenter.y : targetCenter.y,
        sizeFt: asset.defaultSizeFt,
        rotation: isCone ? dirAngleDeg : ((isTrajectory || isDirectional) ? aimAngleDeg : 0),
        opacity: 1.0,
        blendMode: asset.blendMode,
        isPersistent: isAuraOrBuff || Boolean(asset.isPersistent),
        loop: isAuraOrBuff || Boolean(asset.isPersistent),
        attachedTokenId: isAuraOrBuff ? auraLockedToken.id : undefined,
        castTime: Date.now(),
        durationMs: isTrajectory ? 2500 : 5000,
        soundKey: asset.soundKey,
        color: asset.color,
        trajectory: isTrajectory ? {
          startX: casterCenter.x,
          startY: casterCenter.y,
          endX: targetCenter.x,
          endY: targetCenter.y,
          speedPxSec: 1400,
          burstOnImpact: Boolean(asset.burstWebm && asset.burstWebm !== (asset.projectileWebm || asset.webm)),
          burstVideoUrl: (asset.burstWebm && asset.burstWebm !== (asset.projectileWebm || asset.webm)) ? asset.burstWebm : undefined,
          burstSoundKey: asset.soundKey
        } : undefined,
        ownerId: caster.id,
        casterName: caster.name || 'Hero',
        spellId: action.id,
        castAtLevel: action.castAtLevel ?? action.level ?? asset.level,
        baseLevel: action.level ?? asset.level,
        damageFormula: action.damageFormula,
        damageType: action.damageType,
        saveDc: action.saveDc ?? hudCharacterData?.spellSaveDc,
        saveAbility: action.saveAbility,
        description: action.description,
        atHigherLevels: action.atHigherLevels,
        actionSnapshot: { ...action }
      };
      setEffects(prev => [...prev, newEffect]);
      if (asset.soundKey) soundCatalog.play(asset.soundKey);
      if (socketRef.current?.connected) {
        socketRef.current.emit('EFFECT_SPAWN', newEffect);
      }
    }

    // 3. Roll 3D Physics Dice if action has damageFormula or hitBonus or isHeal
    const expendedActionSlot = action.spellSlotRequired ?? action.level ?? 0;
    if (expendedActionSlot >= 1) {
      setHudCharacterData(prev => {
        if (!prev?.spellSlots?.[expendedActionSlot]) return prev;
        const cur = prev.spellSlots[expendedActionSlot];
        const nextAvail = Math.max(0, cur.available - 1);
        const charKey = String(prev.ddbCharacterId || prev.id || claimedToken?.id || prev.name);
        manualSpellSlotsRef.current[charKey] = {
          ...(manualSpellSlotsRef.current[charKey] || {}),
          [expendedActionSlot]: { available: nextAvail, total: cur.total }
        };
        return {
          ...prev,
          spellSlots: {
            ...prev.spellSlots,
            [expendedActionSlot]: { ...cur, available: nextAvail }
          }
        };
      });
    }
    let formula = action.damageFormula || (action as any).damage;
    const lowerActionName = action.name.toLowerCase();

    // Auto-resolve Sneak Attack damage formula dynamically if missing
    if (!formula && lowerActionName.includes('sneak attack')) {
      const rogueLvl = hudCharacterData?.totalLevel || 1;
      formula = `${Math.max(1, Math.ceil(rogueLvl / 2))}d6`;
    }

    // Auto-resolve Rogue Psychic Blades damage formula if missing
    if (!formula && (lowerActionName.includes('psychic blades') || lowerActionName.includes('psychic blade'))) {
      formula = '1d6';
    }

    if (!formula && action.isHeal) {
      if (lowerActionName.includes('healing word')) formula = '1d4 + 3';
      else if (lowerActionName.includes('cure wounds')) formula = '1d8 + 3';
      else formula = '1d8 + 2';
    }

    let calculatedDeltaHp = 0;
    if (formula && isAutoRollDiceEnabledRef.current) {
      const evaluated = evaluateDiceFormula(formula, false);
      const rolledTotal = evaluated.total;
      const diceResults = evaluated.dice;

      calculatedDeltaHp = action.isHeal ? rolledTotal : -rolledTotal;

      const upcastSuffix =
        action.castAtLevel && action.castAtLevel > (action.level ?? 0)
          ? expendedActionSlot >= 1 && action.castAtLevel > expendedActionSlot
            ? ` [Lvl ${action.castAtLevel} • Uses Lvl ${expendedActionSlot} Slot]`
            : ` [Lvl ${action.castAtLevel} Slot]`
          : '';

      const diceEvent: DdbDiceRollEvent = {
        id: `roll-${Date.now()}`,
        characterId: String(hudCharacterData?.id || caster.id || ''),
        characterName: caster.name || 'Hero',
        avatarUrl: hudCharacterData?.avatarUrl || caster.avatarUrl || caster.url,
        action: `${action.name}${upcastSuffix} (${action.isHeal ? 'Healing' : 'Damage'})`,
        rollType: action.isHeal ? 'heal' : 'damage',
        formula: `${formula} → ${evaluated.breakdown}`,
        diceNotation: formula,
        dice: diceResults.length > 0 ? diceResults : [{ sides: action.isHeal ? 8 : 20, result: Math.abs(calculatedDeltaHp), type: action.isHeal ? 'd8' : 'd20' }],
        modifier: evaluated.bonus,
        total: Math.abs(calculatedDeltaHp),
        isCritical: false,
        isFumble: false,
        theme: selectedDicePreset.id,
        themeColor: action.isHeal ? '#10b981' : selectedDicePreset.theme.primaryColor,
        timestamp: Date.now(),
        source: 'player'
      };

      if (socketRef.current?.connected) {
        socketRef.current.emit('SYNC_LOCAL_DICE_ROLL', diceEvent);
      }
      if (typeof window !== 'undefined' && (window as any).__mistwalkerRoll3d) {
        (window as any).__mistwalkerRoll3d(diceEvent);
      }
    }

    // 4. Emit REQUEST_TOKEN_MUTATION
    const isTargetAlly = targetToken.category === 'ally' || Boolean((targetToken as any).allyId);
    const isTargetMonster = !isTargetAlly && (isMonsterToken(targetToken) || targetToken.isMonster === true || targetToken.category === 'monster' || targetToken.isPlayer === false);
    const isTargetOtherPlayer = targetToken.isPlayer && !isSelfTarget && !action.isHeal;
    const requiresApproval = isTargetOtherPlayer || (isTargetMonster && !autoApplyMonsterDamage);

    const upcastActionLabel =
      action.castAtLevel && action.castAtLevel > (action.level ?? 0)
        ? expendedActionSlot >= 1 && action.castAtLevel > expendedActionSlot
          ? `${action.name} (Level ${action.castAtLevel} • Uses Lvl ${expendedActionSlot} Slot)`
          : `${action.name} (Level ${action.castAtLevel} Slot)`
        : action.name;

    if (!isAutoRollDiceEnabledRef.current) {
      const isAttackAction = Boolean(
        action.isAttack ||
        action.hitBonus !== undefined ||
        action.category === 'attacks' ||
        action.subCategory === 'weapon' ||
        action.subCategory === 'unarmed'
      );

      const rawHit = typeof action.hitBonus === 'number'
        ? action.hitBonus
        : parseInt(String(action.hitBonus || '+6').replace('+', ''), 10) || 6;

      const targetAc = (targetToken as any).ac || (targetToken as any).armorClass || (targetToken as any).stats?.armorClass || 13;
      const atkFormula = formula || action.damageFormula || (action as any).damage || (action.isHeal ? '1d8 + 3' : '1d8');

      setPendingCombatRoll({
        actor: {
          id: caster.id,
          name: caster.name || 'Hero',
          avatarUrl: hudCharacterData?.avatarUrl || caster.avatarUrl || caster.url
        },
        target: {
          id: targetToken.id,
          name: targetToken.name || 'Target',
          avatarUrl: targetToken.avatarUrl || targetToken.url,
          ac: targetAc
        },
        action,
        phase: isAttackAction ? 'to_hit' : 'damage',
        hitBonus: rawHit,
        damageFormula: atkFormula,
        isHeal: Boolean(action.isHeal),
        saveDc: action.saveDc ? Number(action.saveDc) : undefined,
        saveAbility: action.saveAbility,
        expendedActionSlot,
        context: 'player_view'
      });

      setActiveTargetingAction(null);
      setActiveEquippedAsset(null);
      setAimOrigin(null);
      setAimCurrent(null);
      return;
    }

    const payload = {
      sourceTokenId: caster.id,
      sourceName: caster.name || 'Hero',
      targetTokenId: targetToken.id,
      targetName: targetToken.name || 'Target',
      actionName: upcastActionLabel,
      deltaHp: calculatedDeltaHp,
      requiresApproval,
      isMonster: isTargetMonster,
      requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    };

    if (socketRef.current?.connected) {
      socketRef.current.emit('REQUEST_TOKEN_MUTATION', payload);
    }

    // 4b. Blessed Healer Automatic Trigger (Life Domain Cleric / Stavros)
    // "When you cast a spell of 1st level or higher that restores HP to a creature other than you, you regain HP equal to 2 + the spell's level."
    const casterHasBlessedHealer = Boolean(
      (caster.name || '').toLowerCase().includes('stavros') ||
      (hudCharacterData?.name || '').toLowerCase().includes('stavros') ||
      hudCharacterData?.special?.some(s => (s.name || '').toLowerCase().includes('blessed healer'))
    );
    const effectiveCastSpellLevel = action.castAtLevel ?? action.level ?? 0;
    const isLeveledHealingSpell = Boolean(
      effectiveCastSpellLevel >= 1 &&
      (action.category === 'spells' || action.subCategory === 'spell' || (action.level ?? 0) >= 1) &&
      (action.isHeal || calculatedDeltaHp > 0)
    );
    if (casterHasBlessedHealer && isLeveledHealingSpell && !isSelfTarget) {
      const blessedHealAmount = 2 + effectiveCastSpellLevel;
      const bhPayload = {
        sourceTokenId: caster.id,
        sourceName: caster.name || 'Stavros',
        targetTokenId: caster.id,
        targetName: caster.name || 'Stavros',
        actionName: `Blessed Healer (Lvl ${effectiveCastSpellLevel} Spell)`,
        deltaHp: blessedHealAmount,
        requiresApproval: false,
        isMonster: false,
        requestId: `req_bh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      };
      if (socketRef.current?.connected) {
        socketRef.current.emit('REQUEST_TOKEN_MUTATION', bhPayload);
      } else {
        setHudCharacterData(prev => {
          if (!prev) return null;
          return { ...prev, currentHp: Math.min(prev.maxHp, prev.currentHp + blessedHealAmount) };
        });
      }

      // Subtle green healing shimmer on Stavros for Blessed Healer
      const bhEffect: VttEffectInstance = {
        id: `eff_bh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: `Blessed Healer (+${blessedHealAmount} HP)`,
        label: 'Blessed Healer Self-Restoration',
        assetKey: 'cure_wounds',
        videoUrl: '/jb2a/Library/1st_Level/Cure_Wounds/CureWounds_01_Green_400x400.webm',
        thumbUrl: '/jb2a/Library/1st_Level/Cure_Wounds/CureWounds_01_Green_Thumb.webp',
        paradigm: 'point',
        x: casterCenter.x,
        y: casterCenter.y,
        sizeFt: 5,
        rotation: 0,
        opacity: 0.95,
        blendMode: 'screen',
        isPersistent: false,
        loop: false,
        castTime: Date.now(),
        durationMs: 2800,
        soundKey: 'radiant_heal',
        color: '#4ade80',
        ownerId: caster.id,
        casterName: caster.name || 'Stavros'
      };
      setEffects(prev => [...prev, bhEffect]);
      if (socketRef.current?.connected) {
        socketRef.current.emit('EFFECT_SPAWN', bhEffect);
      }

      toast.success(`✨ Blessed Healer: ${caster.name} regained +${blessedHealAmount} HP!`, {
        description: `Cast a Level ${effectiveCastSpellLevel} healing spell on ${targetToken.name} (2 + ${effectiveCastSpellLevel} = +${blessedHealAmount} HP to self).`
      });
    }

    if (calculatedDeltaHp < 0 && isTargetMonster) {
      if (autoApplyMonsterDamage) {
        toast.success(`${upcastActionLabel} hit ${targetToken.name}!`, {
          description: `Dealt ${Math.abs(calculatedDeltaHp)} damage (${formula || 'damage roll'}). Monster took damage.`
        });
      } else {
        toast.info(`${upcastActionLabel} hit ${targetToken.name}!`, {
          description: `Rolled ${Math.abs(calculatedDeltaHp)} damage (${formula || 'damage roll'}). Broadcast to DM to apply.`
        });
      }
    } else {
      toast.success(`${upcastActionLabel} executed on ${targetToken.name}!`, {
        description: calculatedDeltaHp !== 0
          ? `${calculatedDeltaHp > 0 ? `Restored +${calculatedDeltaHp} HP (${formula})` : `${calculatedDeltaHp} HP`}`
          : (action.name.toLowerCase().includes('shield') ? 'Shield barrier active (+5 AC)' : 'Action delivered.')
      });
    }

    // Reset targeting state
    setActiveTargetingAction(null);
    setActiveEquippedAsset(null);
    setAimOrigin(null);
    setAimCurrent(null);
  }, [activeTargetingAction, claimedToken, gridSize, activeEquippedAsset, selectedDicePreset, hudCharacterData, handleSpiritualWeaponStrike]);

  const handleApproveMutation = useCallback(() => {
    if (!incomingMutationPrompt) return;
    if (socketRef.current?.connected) {
      socketRef.current.emit('APPROVE_TOKEN_MUTATION', {
        requestId: incomingMutationPrompt.requestId,
        targetTokenId: incomingMutationPrompt.targetTokenId,
        deltaHp: incomingMutationPrompt.deltaHp
      });
    }
    toast.success(`Accepted ${incomingMutationPrompt.actionName} (${incomingMutationPrompt.deltaHp > 0 ? '+' : ''}${incomingMutationPrompt.deltaHp} HP)`);
    setIncomingMutationPrompt(null);
  }, [incomingMutationPrompt]);

  const handleAdjustHp = useCallback((delta: number) => {
    if (!delta) return;
    setHudCharacterData(prev => {
      if (!prev) return prev;
      const nextHp = Math.max(0, Math.min(prev.maxHp, prev.currentHp + delta));
      const charKey = String(prev.ddbCharacterId || prev.id || claimedToken?.id || prev.name);
      const currentOverride = manualHpOverrideRef.current[charKey];
      manualHpOverrideRef.current[charKey] = {
        hp: nextHp,
        ddbBaselineHp: currentOverride ? currentOverride.ddbBaselineHp : prev.currentHp
      };
      if (claimedToken) {
        handleUpdateToken(claimedToken.id, { hp: nextHp, currentHp: nextHp });
      }
      return {
        ...prev,
        currentHp: nextHp
      };
    });
  }, [claimedToken, handleUpdateToken]);

  const handleAdjustSpellSlot = useCallback((level: number, delta: number) => {
    if (!delta) return;
    setHudCharacterData(prev => {
      if (!prev?.spellSlots?.[level]) return prev;
      const cur = prev.spellSlots[level];
      const nextAvail = Math.max(0, Math.min(cur.total, cur.available + delta));
      const charKey = String(prev.ddbCharacterId || prev.id || claimedToken?.id || prev.name);
      manualSpellSlotsRef.current[charKey] = {
        ...(manualSpellSlotsRef.current[charKey] || {}),
        [level]: { available: nextAvail, total: cur.total }
      };
      return {
        ...prev,
        spellSlots: {
          ...prev.spellSlots,
          [level]: {
            ...cur,
            available: nextAvail
          }
        }
      };
    });
  }, [claimedToken]);

  const handleDeclineMutation = useCallback(() => {
    if (!incomingMutationPrompt) return;
    toast.info(`Declined ${incomingMutationPrompt.actionName}`);
    setIncomingMutationPrompt(null);
  }, [incomingMutationPrompt]);

  const getStageRelativePointerPosition = (stage: any) => {
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    return {
      x: (pointer.x - stage.x()) / stage.scaleX(),
      y: (pointer.y - stage.y()) / stage.scaleY(),
    };
  };

  const handleStageMouseDown = (e: any) => {
    const stage = e.target.getStage();
    const point = stage ? getStageRelativePointerPosition(stage) : null;

    // Left-click hold map ping (Hold left-click for ~0.38s without dragging to ping the map)
    if (e.evt?.button === 0 && point && !activeEquippedAsset) {
      const pointer = stage.getPointerPosition();
      startHoldPing(
        point.x,
        point.y,
        e.evt.clientX ?? pointer?.x ?? 0,
        e.evt.clientY ?? pointer?.y ?? 0,
        false
      );
    }

    if (!activeEquippedAsset) return;
    if (e.evt?.button === 2) {
      setActiveEquippedAsset(null);
      setActiveTargetingAction(null);
      setAimOrigin(null);
      setAimCurrent(null);
      return;
    }

    // If clicking on a token element, let the token's onClick / onTap handle targeting!
    const targetName = typeof e.target?.name === 'function' ? e.target.name() : e.target?.name;
    const isTokenElement = targetName === 'token' || Boolean(e.target?.findAncestor?.('.token')) || Boolean(e.target?.findAncestor?.('Group')?.name?.() === 'token');
    if (isTokenElement) {
      return;
    }

    if (!stage || !point) return;

    // If aiming a creature-targeted spell / action (heal, attack, or self-only), do not drop on empty ground!
    if (activeTargetingAction) {
      const isCreatureTargeted = Boolean(
        activeTargetingAction.isHeal ||
        activeTargetingAction.hitBonus !== undefined ||
        activeTargetingAction.rangeFt === 0 ||
        activeEquippedAsset?.targetType === 'single' ||
        activeEquippedAsset?.targetType === 'self' ||
        activeTargetingAction.name.toLowerCase().includes('cure wounds') ||
        activeTargetingAction.name.toLowerCase().includes('healing word') ||
        activeTargetingAction.name.toLowerCase().includes('shield')
      );
      if (isCreatureTargeted) {
        toast.info(`Click on a token to target ${activeTargetingAction.name}${claimedToken ? ' (or click Target Self in the dock)' : ''}.`);
        return;
      }
    }

    // Teleportation Spells (Dimension Door, Misty Step, etc.) must NEVER drop point-blank on click!
    const isTeleportAim = activeEquippedAsset.targetType === 'teleport' ||
      activeEquippedAsset.id === 'misty_step' ||
      activeEquippedAsset.id === 'dimension_door' ||
      activeEquippedAsset.name.toLowerCase().includes('misty step') ||
      activeEquippedAsset.name.toLowerCase().includes('dimension door');

    if (isTeleportAim) {
      hasCastOnMouseDownRef.current = true;
      const casterCenter = claimedToken ? {
        x: claimedToken.x + (((claimedToken.size || 1) * gridSize) / 2),
        y: claimedToken.y + (((claimedToken.size || 1) * gridSize) / 2)
      } : (aimOrigin || point);
      castSpellAt(casterCenter, point);
      return;
    }

    // Point AoE spells (Fireball, Fog Cloud, Web, Darkness, etc.) drop immediately on click!
    if (activeEquippedAsset.paradigm === 'point' || activeEquippedAsset.shape === 'circle' || activeEquippedAsset.paradigm === 'aura') {
      hasCastOnMouseDownRef.current = true;
      castSpellAt(point, point);
      return;
    }

    // If we already have an aimOrigin set (e.g. from claimedToken or previous click), clicking casts towards this target!
    if (aimOrigin) {
      const dx = point.x - aimOrigin.x;
      const dy = point.y - aimOrigin.y;
      if (Math.hypot(dx, dy) > 20) {
        hasCastOnMouseDownRef.current = true;
        castSpellAt(aimOrigin, point);
        return;
      }
    }

    isStageDragAimingRef.current = true;
    setAimOrigin(point);
    setAimCurrent(point);
  };

  const handleStageMouseMove = (e: any) => {
    if (!activeEquippedAsset) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const point = getStageRelativePointerPosition(stage);
    if (!point) return;
    setAimCurrent(point);
  };

  const handleStageMouseUp = () => {
    const wasStageDragAiming = isStageDragAimingRef.current;
    isStageDragAimingRef.current = false;
    if (hasCastOnMouseDownRef.current) {
      hasCastOnMouseDownRef.current = false;
      return;
    }
    if (!wasStageDragAiming) {
      return;
    }
    if (activeEquippedAsset && aimOrigin && aimCurrent) {
      const dx = aimCurrent.x - aimOrigin.x;
      const dy = aimCurrent.y - aimOrigin.y;
      const dist = Math.hypot(dx, dy);

      // Only trigger drag-cast if the user dragged significantly (> 25px)
      if (dist > 25) {
        castSpellAt(aimOrigin, aimCurrent);
        return;
      }
    }
  };

  // Multi-touch pinch-to-zoom and two-finger pan for mobile touchscreens
  const touchStateRef = useRef<{
    lastDist: number;
    lastCenter: { x: number; y: number };
    initialScale: number;
  } | null>(null);

  const handleStageTouchStart = useCallback((e: any) => {
    const touches = e.evt?.touches;
    if (touches && touches.length === 2) {
      const stage = e.target.getStage();
      if (!stage) return;
      if (stage.isDragging()) {
        stage.stopDrag();
      }
      const t1 = touches[0];
      const t2 = touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const center = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2
      };
      touchStateRef.current = {
        lastDist: dist,
        lastCenter: center,
        initialScale: stage.scaleX()
      };
      return;
    }

    if (touches && touches.length === 1) {
      if (activeEquippedAsset) {
        handleStageMouseDown(e);
      } else {
        const stage = e.target.getStage();
        const point = stage ? getStageRelativePointerPosition(stage) : null;
        if (point) {
          startHoldPing(
            point.x,
            point.y,
            touches[0].clientX,
            touches[0].clientY,
            false
          );
        }
      }
    }
  }, [activeEquippedAsset, startHoldPing]);

  const handleStageTouchMove = useCallback((e: any) => {
    const touches = e.evt?.touches;
    if (touches && touches.length === 2 && touchStateRef.current) {
      e.evt.preventDefault();
      const stage = e.target.getStage();
      if (!stage) return;
      if (stage.isDragging()) {
        stage.stopDrag();
      }

      const t1 = touches[0];
      const t2 = touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const center = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2
      };
      const { lastDist, lastCenter } = touchStateRef.current;

      if (lastDist > 5 && dist > 5) {
        const scaleFactor = dist / lastDist;
        const oldScale = stage.scaleX();
        if (Number.isFinite(oldScale) && oldScale > 0) {
          const newScale = Math.max(0.12, Math.min(oldScale * scaleFactor, 4.5));

          const stageCurrentPos = { x: stage.x(), y: stage.y() };
          const pointTo = {
            x: (center.x - stageCurrentPos.x) / oldScale,
            y: (center.y - stageCurrentPos.y) / oldScale
          };

          const dx = center.x - lastCenter.x;
          const dy = center.y - lastCenter.y;

          const newPos = {
            x: center.x - pointTo.x * newScale + dx,
            y: center.y - pointTo.y * newScale + dy
          };

          if (Number.isFinite(newScale) && Number.isFinite(newPos.x) && Number.isFinite(newPos.y)) {
            setStageScale(newScale);
            setStagePos(newPos);
          }

          touchStateRef.current.lastDist = dist;
          touchStateRef.current.lastCenter = center;
        }
      }
      return;
    }

    if (activeEquippedAsset && touches && touches.length === 1) {
      handleStageMouseMove(e);
    }
  }, [activeEquippedAsset]);

  const handleStageTouchEnd = useCallback((e: any) => {
    if (!e.evt?.touches || e.evt.touches.length < 2) {
      touchStateRef.current = null;
    }
    if (activeEquippedAsset && (!e.evt?.touches || e.evt.touches.length === 0)) {
      handleStageMouseUp();
    }
  }, [activeEquippedAsset]);

  const recenterOnMyToken = useCallback(() => {
    const target = claimedToken || tokens.find(t => t.id === claimedTokenId);
    if (!target) {
      toast.info('No character claimed. Select a token in the menu to center.');
      return;
    }
    const tokenRadius = ((target.size || 1) * gridSize) / 2;
    const vpW = dimensions.width;
    const vpH = dimensions.height;
    const targetX = (vpW / 2) - (target.x + tokenRadius) * stageScale;
    const targetY = (vpH / 2) - (target.y + tokenRadius) * stageScale;
    setStagePos({ x: targetX, y: targetY });
    toast.success(`Centered on ${target.name || 'Hero'}`);
  }, [claimedToken, claimedTokenId, tokens, gridSize, dimensions, stageScale]);

  // Auto-calibrate 1"x1" scale for 32" TV and center on party when scene changes
  const lastCalibratedSceneRef = useRef<string | null>(initialBackup?.activeSceneInfo?.sceneId || initialBackup?.imageFile || null);
  const hasCenteredOnPartyRef = useRef<boolean>(Boolean(initialBackup?.stageScale && initialBackup?.stagePos));

  useEffect(() => {
    if (activeDraggingTokenIdRef.current) return;
    const sceneKey = activeSceneInfo?.sceneId || imageFile;
    if (sceneKey && sceneKey !== lastCalibratedSceneRef.current) {
      lastCalibratedSceneRef.current = sceneKey;
      hasCenteredOnPartyRef.current = false;
      applyTvScale(gridSize, tokensRef.current);
    }
  }, [activeSceneInfo?.sceneId, imageFile, gridSize, applyTvScale]);

  // When tokens or map dimensions arrive after scene setup, auto-center on party once
  useEffect(() => {
    if (activeDraggingTokenIdRef.current) return;
    if (tokens.length > 0 && (image || naturalW > 0 || targetMapW > 0)) {
      if (!hasCenteredOnPartyRef.current) {
        hasCenteredOnPartyRef.current = true;
        applyTvScale(gridSize, tokensRef.current);
      }
    }
  }, [tokens.length, image, naturalW, targetMapW, targetMapH, gridSize, applyTvScale]);

  // Re-calibrate when authoritative map dimensions finish loading
  const lastCalibratedDimsRef = useRef<string>(initialBackup?.targetMapW && initialBackup?.targetMapH ? `${initialBackup.targetMapW}x${initialBackup.targetMapH}` : '');
  useEffect(() => {
    if (activeDraggingTokenIdRef.current) return;
    const dimsKey = `${targetMapW}x${targetMapH}`;
    if (targetMapW > 0 && targetMapH > 0 && dimsKey !== lastCalibratedDimsRef.current) {
      lastCalibratedDimsRef.current = dimsKey;
      applyTvScale(gridSize, tokensRef.current);
    }
  }, [targetMapW, targetMapH, gridSize, applyTvScale]);

  // Continuous debounced state snapshot saving to localStorage for instant crash recovery
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window === 'undefined') return;
      try {
        const stateToSave = {
          imageFile,
          mapRotation,
          tokens,
          walls,
          reveals,
          polygonReveals,
          isFogVisible,
          fogResetKey,
          boardAnimatedFeatures,
          boardAnimatedEnabled,
          boardWeatherEffect,
          gridVisible,
          gridOpacity,
          gridSize,
          gridOffsetX,
          gridOffsetY,
          visionConfig,
          stageScale,
          stagePos,
          activeSceneInfo,
          combatState,
          claimedTokenId,
          targetMapW,
          targetMapH,
          timestamp: Date.now()
        };
        localStorage.setItem('mistwalker_player_state_backup_v1', JSON.stringify(stateToSave));
      } catch (err) {
        // Safe against storage quota
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [
    imageFile, mapRotation, tokens, walls, reveals, polygonReveals, isFogVisible, fogResetKey,
    boardAnimatedFeatures, boardAnimatedEnabled, boardWeatherEffect, gridVisible,
    gridOpacity, gridSize, gridOffsetX, gridOffsetY, visionConfig, stageScale, stagePos,
    activeSceneInfo, combatState, claimedTokenId, targetMapW, targetMapH
  ]);

  // Synchronous beforeunload snapshot
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        const stateToSave = {
          imageFile,
          mapRotation,
          tokens,
          walls,
          reveals,
          polygonReveals,
          isFogVisible,
          fogResetKey,
          boardAnimatedFeatures,
          boardAnimatedEnabled,
          boardWeatherEffect,
          gridVisible,
          gridOpacity,
          gridSize,
          gridOffsetX,
          gridOffsetY,
          visionConfig,
          stageScale,
          stagePos,
          activeSceneInfo,
          combatState,
          claimedTokenId,
          targetMapW,
          targetMapH,
          timestamp: Date.now()
        };
        localStorage.setItem('mistwalker_player_state_backup_v1', JSON.stringify(stateToSave));
      } catch {}
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [
    imageFile, mapRotation, tokens, walls, reveals, polygonReveals, isFogVisible, fogResetKey,
    boardAnimatedFeatures, boardAnimatedEnabled, boardWeatherEffect, gridVisible,
    gridOpacity, gridSize, gridOffsetX, gridOffsetY, visionConfig, stageScale, stagePos,
    activeSceneInfo, combatState, claimedTokenId, targetMapW, targetMapH
  ]);


  const handleSelectDicePreset = useCallback((preset: DiceColorPreset) => {
    setDicePresetId(preset.id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mistwalker_player_dice_preset', preset.id);
    }
    toast.success(`Equipped ${preset.name} 3D dice!`, {
      description: preset.description,
      duration: 2500
    });

    // Trigger an immediate satisfying test roll so the player sees their new dice in action
    if (typeof window !== 'undefined' && (window as any).__mistwalkerRoll3d) {
      setTimeout(() => {
        (window as any).__mistwalkerRoll3d({
          id: `preview-${Date.now()}`,
          characterName: claimedToken?.name || 'Local Player',
          action: 'Dice Preview',
          rollType: 'roll',
          formula: '1d20 (20)',
          diceNotation: '1d20',
          dice: [{ sides: 20, result: 20, type: 'd20' }],
          total: 20,
          isCritical: true,
          isFumble: false,
          theme: preset.id,
          themeColor: preset.theme.primaryColor,
          timestamp: Date.now(),
          source: 'player'
        });
      }, 100);
    }
  }, [claimedToken?.name]);

  // Vision Sources for Player Characters (shared party vision providers)
  const playerVisionSources = useMemo<VisionSource[]>(() => {
    if (!visionConfig.enabled) return [];

    const activeVisionTokens = tokens.filter((t) => {
      if ((t as any).hidden) return false;
      if (t.isCondition) return false;
      const isAlly = t.category === 'ally' || !!(t as any).allyId;
      const isMonster = !isAlly && (isMonsterToken(t) || t.isMonster === true || t.category === 'monster' || t.isPlayer === false);
      if (isMonster) return false;
      if (t.visionEnabled === false) return false;
      if (typeof t.visionRadius === 'number' && t.visionRadius <= 0) return false;

      if (t.visionEnabled !== undefined) return t.visionEnabled;
      return !isMonster || isAlly || t.isPlayer === true || t.category === 'character';
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

      // Glow Light: token radiates 20ft bright + 20ft dim light that reveals the area around it
      if ((t as any).glowLight) {
        sources.push({
          id: `glow-${t.id}`,
          x: t.x + tokenCenterOffset,
          y: t.y + tokenCenterOffset,
          radiusPx: (40 / 5) * gridSize,
          angleDegrees: 360,
          directionDegrees: 0,
          color: '#fde68a'
        });
      }
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
            return !isLineOfSightBlocked({ x: tCenterX, y: tCenterY }, { x: tx, y: ty }, walls);
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
    let boundW = targetMapW;
    let boundH = targetMapH;
    for (const src of playerVisionSources) {
      if (src.x + src.radiusPx > boundW) boundW = src.x + src.radiusPx + 100;
      if (src.y + src.radiusPx > boundH) boundH = src.y + src.radiusPx + 100;
    }
    const mapBounds = { width: boundW, height: boundH };
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
    if (claimedTokenId && t.id === claimedTokenId) return true;

    // Friendly party characters, summons, and companions are always visible to players
    const isAlly = !t.isCondition && (t.category === 'ally' || !!(t as any).allyId);
    const isMonster = !t.isCondition && !isAlly && (isMonsterToken(t) || t.isMonster === true || t.category === 'monster' || t.isPlayer === false);
    if (!isMonster && !t.isCondition || isAlly) return true;

    const tokenPx = gridSize * (t.size || 1);
    const radius = tokenPx / 2;
    const cx = t.x + radius;
    const cy = t.y + radius;

    // 9-point sampling across token footprint (center + 4 cardinal + 4 diagonal offsets)
    // so Large (size 2) and Huge (size 3) monsters are visible whenever any part of their base is in FOV
    const sampleOffset = radius * 0.8;
    const diagOffset = sampleOffset * 0.707;
    const samplePoints = [
      { x: cx, y: cy },
      { x: cx - sampleOffset, y: cy },
      { x: cx + sampleOffset, y: cy },
      { x: cx, y: cy - sampleOffset },
      { x: cx, y: cy + sampleOffset },
      { x: cx - diagOffset, y: cy - diagOffset },
      { x: cx + diagOffset, y: cy - diagOffset },
      { x: cx - diagOffset, y: cy + diagOffset },
      { x: cx + diagOffset, y: cy + diagOffset },
    ];

    // 1. Check circle brush reveals
    for (const rev of reveals) {
      if (distanceBetween(cx, cy, rev.x, rev.y) <= rev.radius + radius * 0.85) {
        return true;
      }
    }

    // 2. Check polygon room reveals
    for (const poly of polygonReveals) {
      if (poly.length >= 6) {
        for (const pt of samplePoints) {
          if (isPointInPolygon(pt.x, pt.y, poly)) {
            return true;
          }
        }
      }
    }

    // 3. Check active dynamic FOV line-of-sight against player vision sources
    if (visionConfig.enabled && activeFovPolygons.length > 0) {
      for (const fov of activeFovPolygons) {
        if (!fov.points || fov.points.length < 6) continue;

        const d = distanceBetween(fov.center.x, fov.center.y, cx, cy);
        if (d > fov.radius + radius) continue;

        // fov.points is already wall-clipped by computeVisibilityPolygon, so if any sample point of the token
        // is inside fov.points OR has clear line of sight within fov.radius, the token is visible!
        const isInsideFov = samplePoints.some(pt => isPointInPolygon(pt.x, pt.y, fov.points));
        if (isInsideFov) {
          return true;
        }

        const hasClearLos = samplePoints.some(
          pt => distanceBetween(fov.center.x, fov.center.y, pt.x, pt.y) <= fov.radius && !isLineOfSightBlocked(fov.center, pt, walls)
        );
        if (hasClearLos) {
          return true;
        }
      }
    }

    // If not in active vision or manual reveal, the token is behind a wall or in the fog -> NEVER visible
    return false;
  }, [isFogVisible, claimedTokenId, gridSize, reveals, polygonReveals, visionConfig.enabled, activeFovPolygons, walls]);



  // Candidate Tokens for Claiming (Only non-monster player characters and friendly summons)
  const candidateTokens = useMemo(() => {
    return tokens.filter(t =>
      !(t as any).hidden &&
      !t.isCondition &&
      !isMonsterToken(t) &&
      !t.isMonster &&
      t.category !== 'monster' &&
      (t.isPlayer || t.category === 'character' || t.category === 'ally' || !!(t as any).allyId || t.id === claimedTokenId)
    );
  }, [tokens, claimedTokenId]);

  // Filter combatants for player view: track ONLY tokens presently visible to players
  const visibleCombatants = useMemo(() => {
    if (!combatState.combatants || combatState.combatants.length === 0) return [];

    const activeIndex = combatState.combatants.length > 0 
      ? Math.max(0, Math.min(combatState.turnIndex, combatState.combatants.length - 1))
      : 0;

    const result: Array<{
      combatant: Combatant;
      token?: Token;
      originalIndex: number;
      isCurrentTurn: boolean;
      isHiddenActiveTurn: boolean;
      isClaimed: boolean;
    }> = [];

    combatState.combatants.forEach((c, idx) => {
      const isCurrentTurn = idx === activeIndex;
      // Match combatant with on-board token
      const matchingToken = tokens.find(t =>
        (c.tokenId && t.id === c.tokenId) ||
        t.id === c.id ||
        (t.name && c.name && t.name.toLowerCase() === c.name.toLowerCase())
      );

      const isVisible = matchingToken
        ? isTokenVisibleToPlayer(matchingToken)
        : (c.type === 'player');

      const isClaimed = matchingToken?.id === claimedTokenId || c.tokenId === claimedTokenId;

      if (isVisible) {
        result.push({
          combatant: c,
          token: matchingToken,
          originalIndex: idx,
          isCurrentTurn,
          isHiddenActiveTurn: false,
          isClaimed
        });
      } else if (isCurrentTurn) {
        // If an enemy is in the fog / behind an occluding wall and it's their turn,
        // show a mystery turn marker so the turn progression is clear without spoiling identity or stats
        result.push({
          combatant: {
            ...c,
            name: 'Hidden Creature',
            currentHp: 0,
            maxHp: 0,
            ac: 0,
            conditions: []
          },
          token: undefined,
          originalIndex: idx,
          isCurrentTurn: true,
          isHiddenActiveTurn: true,
          isClaimed: false
        });
      }
    });

    return result;
  }, [combatState.combatants, combatState.turnIndex, tokens, isTokenVisibleToPlayer, claimedTokenId]);

  const isFull = isSidebarExpanded || isMobile;

  return (
    <div
      className={`relative w-screen h-[100dvh] overflow-hidden bg-zinc-950 select-none touch-none overscroll-none ${isShaking ? 'animate-shake' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
      }}
    >
      {/* Critical Hit Impact Flash Overlay */}
      {isShaking && (
        <div className="absolute inset-0 pointer-events-none z-[999] animate-crit-flash bg-red-600/30" />
      )}
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
      {/* Mobile Menu Floating Trigger Button                         */}
      {/* ========================================================= */}
      {!isUiMinimized && !isMobileSidebarOpen && (
        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen(true)}
          className="fixed top-3 left-3 z-40 w-11 h-11 rounded-2xl bg-zinc-950/90 border border-zinc-800 shadow-xl backdrop-blur-xl flex items-center justify-center text-zinc-300 hover:text-white pointer-events-auto md:hidden active:scale-95 transition-all ring-1 ring-white/10"
          title="Open Menu"
        >
          <div className="relative">
            <Menu className="w-5 h-5 text-amber-400" />
            <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          </div>
        </button>
      )}

      {/* Mobile Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden pointer-events-auto"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* ========================================================= */}
      {/* Left Side Menu (Unified Player View Tools & HUD)          */}
      {/* ========================================================= */}
      {!isUiMinimized && (
        <aside
          className={`z-40 flex flex-col bg-zinc-950/95 backdrop-blur-2xl border border-zinc-800/90 shadow-2xl transition-all duration-300 pointer-events-auto select-none ${
            isMobile
              ? (isMobileSidebarOpen ? 'fixed top-0 bottom-0 left-0 w-72 rounded-r-3xl z-50 animate-in slide-in-from-left duration-200' : 'hidden')
              : (isSidebarExpanded ? 'fixed top-3 left-3 bottom-3 w-60 rounded-2xl' : 'fixed top-3 left-3 bottom-3 w-16 rounded-2xl')
          }`}
        >
          {/* 1. Header: Session Status & Expand/Collapse Toggle */}
          <div className="p-3 border-b border-zinc-800/80 flex items-center justify-between gap-2 shrink-0">
            {(isSidebarExpanded || isMobile) ? (
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-mono font-bold tracking-wider text-zinc-200 uppercase truncate">
                    {isConnected ? 'LIVE SESSION' : 'CONNECTING...'}
                  </span>
                  {activeSceneInfo?.sceneTitle && (
                    <span className="text-[10px] font-mono text-emerald-400 font-bold truncate" title={activeSceneInfo.sceneTitle}>
                      {activeSceneInfo.sceneTitle}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowStationModal(true);
                      if (isMobile) setIsMobileSidebarOpen(false);
                    }}
                    className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700/80 hover:border-amber-500/50 text-[9px] font-mono text-zinc-300 hover:text-amber-300 transition-colors cursor-pointer w-fit"
                    title="Switch Station Mode (Digital TV Table / Remote Player)"
                  >
                    <Tv className="w-2.5 h-2.5 text-amber-400" />
                    <span>{stationMode === 'tv_table' ? 'TV Table' : 'Remote Player'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 mx-auto" title={isConnected ? `Live Session: ${activeSceneInfo?.sceneTitle || 'Online'}` : 'Connecting...'}>
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse ring-2 ring-emerald-500/20' : 'bg-amber-500'}`} />
                <button
                  type="button"
                  onClick={() => setShowStationModal(true)}
                  className="mt-1 p-1 rounded bg-zinc-900 border border-zinc-700/80 hover:border-amber-500/50 text-zinc-400 hover:text-amber-400 transition-colors cursor-pointer"
                  title={`Station Mode: ${stationMode === 'tv_table' ? 'Digital TV Table' : 'Remote Player'}`}
                >
                  <Tv className="w-3 h-3 text-amber-400" />
                </button>
              </div>
            )}

            {isMobile ? (
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800/80 rounded-xl transition-colors cursor-pointer"
                title="Close Menu"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setIsSidebarExpanded(prev => !prev)}
                className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-colors cursor-pointer shrink-0"
                title={isSidebarExpanded ? 'Collapse Menu' : 'Expand Menu'}
              >
                {isSidebarExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            )}
          </div>

          {/* Scrollable Center Body */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 space-y-3.5 sidebar-scrollbar">
            {/* 2. Character Section */}
            <div className="space-y-1.5">
              {isFull && (
                <div className="px-1 text-[9px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                  Character
                </div>
              )}
                    {claimedToken && claimedStats ? (
                      <div className={`bg-zinc-900/90 border border-emerald-500/40 rounded-xl p-2 shadow-inner ${isFull ? '' : 'flex flex-col items-center gap-1.5'}`}>
                        <div className={`flex items-center gap-2 ${isFull ? 'justify-between' : 'flex-col'}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 border-2 border-emerald-500 shrink-0 flex items-center justify-center">
                              {(() => {
                                const avatarSrc = claimedToken.url || claimedToken.avatarUrl || getCharacterTokenUrl(claimedToken.name);
                                return avatarSrc ? (
                                  <img src={avatarSrc} alt={claimedToken.name} className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-4 h-4 text-emerald-400" />
                                );
                              })()}
                            </div>
                            {isFull && (
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-white truncate" title={claimedToken.name}>
                                  {claimedToken.name}
                                </div>
                                <div className="text-[10px] text-zinc-400 font-mono">Claimed</div>
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              setShowCharacterSelectModal(true);
                              if (isMobile) setIsMobileSidebarOpen(false);
                            }}
                            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                            title="Switch / Manage Character"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Badges: HP & AC */}
                        {isFull ? (
                          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-zinc-800/80">
                            <span className="flex-1 inline-flex items-center justify-center gap-1 text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/70 py-0.5 rounded border border-emerald-700/50">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                claimedStats.currentHp / claimedStats.maxHp > 0.5
                                  ? 'bg-emerald-400'
                                  : claimedStats.currentHp / claimedStats.maxHp > 0.25
                                  ? 'bg-amber-400'
                                  : 'bg-red-500'
                              }`} />
                              HP {claimedStats.currentHp}/{claimedStats.maxHp}
                            </span>
                            <span className="inline-flex items-center justify-center gap-1 text-[10px] font-mono font-bold text-sky-300 bg-sky-950/70 px-2 py-0.5 rounded border border-sky-700/50">
                              <Shield className="w-2.5 h-2.5 text-sky-400" />
                              AC {claimedStats.ac}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-1 py-0.5 rounded border border-emerald-700/50 text-center w-full">
                            {claimedStats.currentHp}HP
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setShowCharacterSelectModal(true);
                          if (isMobile) setIsMobileSidebarOpen(false);
                        }}
                        className={`w-full flex items-center justify-center gap-2 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-xl py-2 px-2.5 shadow-sm transition-all border border-indigo-500/50 group cursor-pointer ${
                          isFull ? 'text-xs font-semibold' : 'p-2'
                        }`}
                        title="Claim Character"
                      >
                        <Shield className="w-4 h-4 text-indigo-200 group-hover:scale-110 transition-transform" />
                        {isFull && <span>Claim Character</span>}
                      </button>
                    )}
                  </div>

                  {/* 3. Actions & Features */}
                  <div className="space-y-1.5">
                    {isFull && (
                      <div className="px-1 text-[9px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                        Player Tools
                      </div>
                    )}

                    {/* Combat Turn Order */}
                    {combatState.showCombatTracker && combatState.combatants.length > 0 && (
                      <button
                        onClick={togglePlayerCombatTracker}
                        className={`w-full flex items-center rounded-xl transition-all cursor-pointer border ${
                          showPlayerCombatTracker
                            ? 'bg-amber-500/20 border-amber-500/60 text-amber-200 shadow-sm'
                            : 'bg-zinc-900/80 hover:bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
                        } ${isFull ? 'px-2.5 py-2 justify-between text-xs font-medium' : 'p-2.5 justify-center'}`}
                        title={`Combat Turn Order (Round ${combatState.round})`}
                      >
                        <div className="flex items-center gap-2">
                          <Swords className={`w-4 h-4 ${showPlayerCombatTracker ? 'text-amber-400' : 'text-zinc-400'}`} />
                          {isFull && <span>Turn Order</span>}
                        </div>
                        {isFull ? (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-amber-950 text-amber-300 border border-amber-700/60">
                            R{combatState.round}
                          </span>
                        ) : (
                          <span className="sr-only">R{combatState.round}</span>
                        )}
                      </button>
                    )}

                    {/* 3D Physics Polyhedral Dice Roller Menu */}
                    <button
                      onClick={() => {
                        setShowDiceRollerModal(true);
                        if (isMobile) setIsMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center rounded-xl transition-all cursor-pointer border bg-zinc-900/80 hover:bg-zinc-900 hover:border-amber-500/50 text-zinc-300 hover:text-amber-300 border-zinc-800 group ${
                        isFull ? 'px-2.5 py-2 gap-2 text-xs font-medium' : 'p-2.5 justify-center'
                      }`}
                      title="Roll Dice (d20, d12, d100, d10, d8, d6, d4)"
                    >
                      <Dices className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform shrink-0" />
                      {isFull && <span>Roll Dice</span>}
                    </button>

                    {/* Switch to DM Mode */}
                    <button
                      id="btn-switch-to-dm-mode"
                      onClick={() => {
                        const url = new URL(window.location.href);
                        url.search = '';
                        url.searchParams.set('view', 'dm');
                        window.location.assign(url.toString());
                      }}
                      className={`w-full flex items-center rounded-xl transition-all cursor-pointer border bg-zinc-900/80 hover:bg-amber-500/15 hover:border-amber-500/50 text-zinc-300 hover:text-amber-200 border-zinc-800 ${
                        isFull ? 'px-2.5 py-2 gap-2 text-xs font-medium' : 'p-2.5 justify-center'
                      }`}
                      title="Switch to DM Mode"
                    >
                      <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                      {isFull && <span className="flex-1 text-left">Switch to DM Mode</span>}
                    </button>

                    {/* Glow Light toggle (Stavros) */}
                    {claimedToken && (/stavros/i.test(claimedToken.name || '') || (claimedToken as any).canGlowLight) && (
                      <button
                        id="btn-toggle-glow-light"
                        onClick={() => {
                          const on = !(claimedToken as any).glowLight;
                          const hasOtherAura = (claimedToken.auraRadius || 0) > 0 && claimedToken.auraName !== 'Glow Light';
                          const updates: Partial<Token> = { glowLight: on } as any;
                          if (!hasOtherAura) {
                            if (on) {
                              Object.assign(updates, {
                                auraRadius: 20,
                                auraColor: 'rgba(253, 230, 138, 0.45)',
                                auraName: 'Glow Light',
                                auraOpacity: 0.4
                              });
                            } else {
                              Object.assign(updates, {
                                auraRadius: undefined,
                                auraColor: undefined,
                                auraName: undefined,
                                auraOpacity: undefined
                              });
                            }
                          }
                          handleUpdateToken(claimedToken.id, updates);
                          toast.info(on ? `${claimedToken.name} begins to glow` : `${claimedToken.name}'s glow fades`);
                        }}
                        className={`w-full flex items-center rounded-xl transition-all cursor-pointer border ${
                          (claimedToken as any).glowLight
                            ? 'bg-yellow-400/20 border-yellow-400/70 text-yellow-100 shadow-[0_0_14px_rgba(250,204,21,0.35)]'
                            : 'bg-zinc-900/80 hover:bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                        } ${isFull ? 'px-2.5 py-2 gap-2 text-xs font-medium' : 'p-2.5 justify-center'}`}
                        title={(claimedToken as any).glowLight ? 'Turn Glow Light off' : 'Turn Glow Light on (20ft bright, 20ft dim)'}
                      >
                        <Sun className={`w-4 h-4 shrink-0 ${(claimedToken as any).glowLight ? 'text-yellow-300' : 'text-zinc-500'}`} />
                        {isFull && <span className="flex-1 text-left">Glow Light: {(claimedToken as any).glowLight ? 'On' : 'Off'}</span>}
                      </button>
                    )}

                    {/* Toggle HP Display on tokens */}
                    <button
                      id="btn-toggle-hp-display"
                      onClick={() => setShowHpDisplay(prev => !prev)}
                      className={`w-full flex items-center rounded-xl transition-all cursor-pointer border ${
                        showHpDisplay
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
                          : 'bg-zinc-900/80 hover:bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      } ${isFull ? 'px-2.5 py-2 gap-2 text-xs font-medium' : 'p-2.5 justify-center'}`}
                      title={showHpDisplay ? 'Hide HP bars on tokens' : 'Show HP bars on tokens'}
                    >
                      <Heart className={`w-4 h-4 shrink-0 ${showHpDisplay ? 'text-emerald-400' : 'text-zinc-500'}`} />
                      {isFull && <span className="flex-1 text-left">HP Display: {showHpDisplay ? 'On' : 'Off'}</span>}
                    </button>

                    {/* 3D Dice Style & Material Palette */}
                    <button
                      onClick={() => setShowDicePaletteModal(prev => !prev)}
                      className={`w-full flex items-center rounded-xl transition-all cursor-pointer border ${
                        showDicePaletteModal
                          ? 'bg-zinc-800 border-zinc-500 text-white ring-1 ring-zinc-400/30'
                          : 'bg-zinc-900/80 hover:bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
                      } ${isFull ? 'px-2.5 py-2 gap-2 text-xs font-medium' : 'p-2.5 justify-center'}`}
                      title="Change 3D Dice Style & Materials"
                    >
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm shrink-0"
                        style={{ backgroundColor: selectedDicePreset.theme.primaryColor }}
                      />
                      {isFull && (
                        <div className="flex items-center justify-between flex-1 min-w-0">
                          <span className="truncate">{selectedDicePreset.name}</span>
                          <Palette className="w-3 h-3 text-zinc-400 ml-1 shrink-0" />
                        </div>
                      )}
                    </button>

                    {/* Animated Spells & Visual FX (JB2A) */}
                    <button
                      onClick={() => {
                        setShowEffectsDrawer(prev => !prev);
                        if (isMobile) setIsMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center rounded-xl transition-all cursor-pointer border ${
                        showEffectsDrawer
                          ? 'bg-amber-500/20 border-amber-500/60 text-amber-200'
                          : 'bg-zinc-900/80 hover:bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
                      } ${isFull ? 'px-2.5 py-2 gap-2 text-xs font-medium' : 'p-2.5 justify-center'}`}
                      title="Animated Spells & Visual Effects"
                    >
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      {isFull && <span>Spell Effects</span>}
                    </button>

                    {/* Player Handouts, Visual Props & Shared Party Journal */}
                    <button
                      onClick={() => {
                        setShowHandoutsJournalModal(true);
                        clearUnreadHandouts();
                        if (isMobile) setIsMobileSidebarOpen(false);
                      }}
                      className={`relative w-full flex items-center rounded-xl transition-all cursor-pointer border ${
                        showHandoutsJournalModal || hasUnreadHandouts
                          ? 'bg-amber-500/20 border-amber-500/60 text-amber-200'
                          : 'bg-zinc-900/80 hover:bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-amber-200'
                      } ${isFull ? 'px-2.5 py-2 gap-2 text-xs font-medium' : 'p-2.5 justify-center'}`}
                      title="Handouts, Props, Quests & Shared Party Journal"
                    >
                      <Scroll className="w-4 h-4 text-amber-400 shrink-0" />
                      {isFull && <span>Handouts & Journal</span>}
                      {hasUnreadHandouts && (
                        <span className="ml-auto w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      )}
                    </button>

                    {/* Stand-Alone Battle Arena & Skirmish Lobby (1v1 / 2v2 / Random Encounters) */}
                    <button
                      onClick={() => {
                        setShowArenaMode(true);
                        if (isMobile) setIsMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center rounded-xl transition-all cursor-pointer border ${
                        showArenaMode
                          ? 'bg-rose-500/20 border-rose-500/60 text-rose-200'
                          : 'bg-zinc-900/80 hover:bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-amber-300 hover:border-amber-500/50'
                      } ${isFull ? 'px-2.5 py-2 gap-2 text-xs font-medium' : 'p-2.5 justify-center'}`}
                      title="Battle Arena & Player Combat Lobby (1v1, 2v2, Scaled Random Encounters & vs NPCs)"
                    >
                      <Swords className="w-4 h-4 text-rose-400 shrink-0" />
                      {isFull && <span>Battle Arena</span>}
                    </button>

                    {/* Audio Mute/Unmute */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsAudioMuted(prev => !prev);
                      }}
                      className={`w-full flex items-center rounded-xl transition-all cursor-pointer border ${
                        isAudioMuted
                          ? 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-300'
                          : 'bg-emerald-950/30 border-emerald-800/40 text-emerald-400 hover:text-emerald-300'
                      } ${isFull ? 'px-2.5 py-2 gap-2 text-xs font-medium' : 'p-2.5 justify-center'}`}
                      title={isAudioMuted ? 'Unmute Audio Narration' : 'Mute Audio Narration'}
                    >
                      {isAudioMuted ? <VolumeX className="w-4 h-4 shrink-0" /> : <Volume2 className="w-4 h-4 shrink-0" />}
                      {isFull && <span>{isAudioMuted ? 'Audio Muted' : 'Audio Active'}</span>}
                    </button>
                  </div>

                  {/* 4. Map & Viewport Controls */}
                  <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
                    {isFull && (
                      <div className="px-1 text-[9px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                        Map View
                      </div>
                    )}

                    {isFull ? (
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          onClick={() => handleZoom(1.2)}
                          className="flex flex-col items-center justify-center py-2 px-1 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-300 hover:text-white transition-colors cursor-pointer"
                          title="Zoom In"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-mono mt-0.5">In</span>
                        </button>
                        <button
                          onClick={() => handleZoom(0.8)}
                          className="flex flex-col items-center justify-center py-2 px-1 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-300 hover:text-white transition-colors cursor-pointer"
                          title="Zoom Out"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-mono mt-0.5">Out</span>
                        </button>
                        <button
                          onClick={handleResetZoom}
                          className="flex flex-col items-center justify-center py-2 px-1 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-300 hover:text-white transition-colors cursor-pointer"
                          title="Reset to 1x1 Scale"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-mono mt-0.5">Reset</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <button
                          onClick={() => handleZoom(1.2)}
                          className="w-full p-2 flex items-center justify-center bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-300 hover:text-white transition-colors cursor-pointer"
                          title="Zoom In"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleZoom(0.8)}
                          className="w-full p-2 flex items-center justify-center bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-300 hover:text-white transition-colors cursor-pointer"
                          title="Zoom Out"
                        >
                          <ZoomOut className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleResetZoom}
                          className="w-full p-2 flex items-center justify-center bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-300 hover:text-white transition-colors cursor-pointer"
                          title="Reset to 1x1 Scale"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* 1" TV Grid Scale */}
                    <button
                      onClick={() => {
                        applyTvScale();
                        toast.info('Calibrated to 1" grid for 32" TV');
                      }}
                      className={`w-full flex items-center rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-amber-400 hover:text-amber-200 transition-colors cursor-pointer ${
                        isFull ? 'px-2.5 py-2 gap-2 text-xs font-semibold' : 'p-2.5 justify-center'
                      }`}
                      title="Calibrate 1x1 Grid for 32-inch TV Tabletop"
                    >
                      <Tv className="w-4 h-4 shrink-0" />
                      {isFull && <span>1" TV Grid Scale</span>}
                    </button>
                  </div>
                </div>

                {/* 5. Footer: Minimize All Menus Toggle */}
                <div className="p-2 border-t border-zinc-800/80 shrink-0">
                  <button
                    onClick={() => setIsUiMinimized(true)}
                    className={`w-full flex items-center rounded-xl border border-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer ${
                      isFull ? 'px-2.5 py-1.5 justify-between text-xs font-mono' : 'p-2 justify-center'
                    }`}
                    title="Minimize all menus (Press H)"
                  >
                    <div className="flex items-center gap-2">
                      <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
                      {isFull && <span>Hide Menu</span>}
                    </div>
                    {isFull && (
                      <span className="text-[9px] text-zinc-400 font-mono bg-zinc-800 px-1 py-0.2 rounded border border-zinc-700">
                        H
                      </span>
                    )}
                  </button>
                </div>
        </aside>
      )}

      {/* Floating Restore UI Pill when Minimized */}
      {isUiMinimized && (
        <div className="fixed top-3 left-3 z-50 pointer-events-auto animate-in fade-in duration-200">
          <button
            onClick={() => setIsUiMinimized(false)}
            className="flex items-center gap-2 bg-zinc-900/90 hover:bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-700/80 hover:border-emerald-500/60 px-3.5 py-2 rounded-2xl shadow-2xl backdrop-blur-md transition-all group font-mono text-xs cursor-pointer"
            title="Restore Player Menu (Press H)"
          >
            <Eye className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="font-semibold">Show Menu</span>
            <span className="text-[10px] text-zinc-400 font-mono bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">H</span>
          </button>
        </div>
      )}

      {/* Movement hint if token is claimed */}
      {!isUiMinimized && claimedToken && (
        <div 
          style={{ left: isSidebarExpanded ? 256 : 80 }}
          className="fixed bottom-3 z-40 bg-zinc-900/85 backdrop-blur-sm border border-zinc-800/80 rounded-xl px-3 py-1.5 text-[11px] font-mono text-zinc-400 hidden md:flex items-center gap-2 pointer-events-none transition-all duration-300 shadow-lg"
        >
          <Move className="w-3.5 h-3.5 text-emerald-400" />
          <span>Use <b>Arrow Keys</b> or <b>Drag</b> to move {claimedToken.name}</span>
        </div>
      )}

      {/* JB2A Effects Drawer Slide-Out Modal / Panel */}
      {showEffectsDrawer && (
        <div 
          className="fixed top-3 left-20 sm:left-64 bottom-3 z-50 w-96 max-w-[calc(100vw-90px)] bg-zinc-950/95 backdrop-blur-2xl border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-left duration-200"
        >
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white tracking-wide uppercase font-mono">
                Spell Compendium & FX
              </span>
            </div>
            <button
              onClick={() => setShowEffectsDrawer(false)}
              className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden p-3">
            <EffectsDrawer
              activeEquippedAsset={activeEquippedAsset}
              onEquipAsset={handleEquipAsset}
              onQuickPlaceAsset={handleQuickPlaceAsset}
              onClearEffects={handleClearEffects}
              onDispelEffect={handleDispelEffect}
              activeEffects={effects}
            />
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Floating Compact Combat Tracker (Turn Order for Visible Tokens) */}
      {/* ========================================================= */}
      {!isUiMinimized && combatState.showCombatTracker && combatState.combatants.length > 0 && (
        <div className="absolute top-4 right-4 z-50 pointer-events-auto">
          {showPlayerCombatTracker ? (
            <div className="w-56 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/90 rounded-2xl p-2.5 shadow-2xl text-zinc-200 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Header */}
              <div className="flex items-center justify-between gap-2 pb-2 mb-1.5 border-b border-zinc-800/80">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                    <Swords className="w-3 h-3 text-amber-400" />
                  </div>
                  <span className="text-[11px] font-bold font-mono tracking-wider text-amber-300 uppercase">
                    Round {combatState.round}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-zinc-400">
                    {visibleCombatants.length} in sight
                  </span>
                  <button
                    onClick={togglePlayerCombatTracker}
                    className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 rounded-lg transition-colors cursor-pointer"
                    title="Hide Turn Order"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Turn Order List */}
              <div className="max-h-60 overflow-y-auto space-y-1 pr-0.5 select-none">
                {visibleCombatants.length === 0 ? (
                  <div className="py-3 text-center text-[10px] font-mono text-zinc-400 italic">
                    No enemies or allies in sight
                  </div>
                ) : (
                  visibleCombatants.map((item) => {
                    const { combatant: c, token, isCurrentTurn, isHiddenActiveTurn, isClaimed } = item;
                    const avatarSrc = c.avatarUrl || token?.url || (token as any)?.avatarUrl || getCharacterTokenUrl(c.name);

                    return (
                      <div
                        key={c.id || item.originalIndex}
                        className={`flex items-center justify-between gap-1.5 px-2 py-1 rounded-xl text-xs transition-all ${
                          isCurrentTurn
                            ? isHiddenActiveTurn
                              ? 'bg-purple-950/60 border border-purple-500/70 shadow-md shadow-purple-950/50 text-purple-200 animate-pulse'
                              : 'bg-amber-950/60 border border-amber-500/80 shadow-md shadow-amber-950/50 text-amber-200'
                            : isClaimed
                            ? 'bg-emerald-950/30 border border-emerald-500/30 text-emerald-200'
                            : c.type === 'player'
                            ? 'bg-zinc-900/80 border border-zinc-800/80 text-zinc-300'
                            : 'bg-red-950/25 border border-red-900/30 text-red-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {/* Active Turn Dot Indicator */}
                          <div className="shrink-0 flex items-center justify-center">
                            {isCurrentTurn ? (
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 inline-block" />
                            )}
                          </div>

                          {/* Mini Avatar */}
                          <div className="w-5 h-5 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700/80 shrink-0 flex items-center justify-center text-[9px] font-bold">
                            {isHiddenActiveTurn ? (
                              <EyeOff className="w-3 h-3 text-purple-400" />
                            ) : avatarSrc ? (
                              <img src={avatarSrc} alt={c.name} className="w-full h-full object-cover" />
                            ) : (
                              <span>{c.name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>

                          {/* Name and Tag */}
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="text-[11px] font-medium truncate max-w-[90px]" title={c.name}>
                              {isHiddenActiveTurn ? 'Hidden Enemy' : c.name}
                            </span>
                            {isClaimed && (
                              <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                                You
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Initiative & Status Badge */}
                        <div className="shrink-0 flex items-center gap-1">
                          {isCurrentTurn && (
                            <span className="text-[9px] font-mono uppercase font-bold text-amber-400">
                              TURN
                            </span>
                          )}
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400">
                            {c.initiative ?? '-'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* Minimized toggle button to restore Combat Turn Order */
            <button
              onClick={togglePlayerCombatTracker}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 hover:border-amber-500/50 text-zinc-300 hover:text-amber-300 font-mono text-xs rounded-xl shadow-2xl backdrop-blur-md transition-all cursor-pointer group"
              title="Click to show Combat Turn Order"
            >
              <Swords className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
              <span className="font-bold text-[11px]">Turn Order</span>
              <span className="px-1.5 py-0.2 text-[9px] bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-300 font-sans">
                R{combatState.round}
              </span>
              <Eye className="w-3.5 h-3.5 text-zinc-400 group-hover:text-amber-300 ml-0.5" />
            </button>
          )}
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
                  const isAlly = t.category === 'ally' || !!(t as any).allyId;
                  const isMon = !isAlly && (isMonsterToken(t) || t.isMonster === true || t.category === 'monster' || t.isPlayer === false);
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
                            {!isMon && (
                              <>
                                <span className="text-emerald-400 font-semibold">HP {tStats.currentHp}/{tStats.maxHp}</span>
                                <span>•</span>
                              </>
                            )}
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


      {/* Loading Overlay */}
      {imageStatus === 'loading' && !image && imageFile && !isVideo && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm pointer-events-none">
          <div className="flex flex-col items-center gap-3 text-zinc-400">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            <span className="text-sm font-mono tracking-wider text-zinc-300">
              Mounting Full-Resolution Battlemap...
            </span>
          </div>
        </div>
      )}

      {/* Failed Image Load State */}
      {imageStatus === 'failed' && !image && imageFile && !isVideo && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-zinc-950/90 backdrop-blur-md">
          <div className="flex flex-col items-center gap-3 text-center max-w-sm p-6 bg-zinc-900 border border-red-500/30 rounded-2xl shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <Radio className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">Battlemap Download Failed</h4>
            <p className="text-xs text-zinc-400">The battlemap could not be loaded across the network connection.</p>
            <button
              onClick={() => {
                const url = imageFile;
                setImageFile(null);
                setTimeout(() => setImageFile(url), 100);
              }}
              className="mt-2 px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow transition-colors cursor-pointer"
            >
              Retry Download
            </button>
          </div>
        </div>
      )}

      {/* Interactive Player Waiting Menu when no DM map is active */}
      {!imageFile && !image && (
        <div className="absolute inset-0 z-30 flex items-center justify-center text-zinc-500 pointer-events-auto select-none p-3 sm:p-4">
          <div className="relative z-10 flex flex-col items-center gap-3 sm:gap-4 text-center max-w-xl w-full max-h-[88dvh] overflow-y-auto bg-zinc-950/90 backdrop-blur-xl border border-zinc-800/90 rounded-3xl p-5 sm:p-9 shadow-[0_25px_60px_rgba(0,0,0,0.95)] ring-1 ring-white/10 animate-in fade-in">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-zinc-900/90 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10 shrink-0">
              <Radio className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400 animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold">
                Player Waiting Lobby Online
              </span>
            </div>
            <h3 className="text-lg sm:text-2xl font-extrabold text-white font-mono tracking-tight">
              Waiting for Dungeon Master...
            </h3>
            <p className="text-[11px] sm:text-xs text-zinc-400 leading-relaxed font-sans max-w-md">
              When the DM loads a campaign scene, it will immediately project here in real-time. While you wait, link your active character or jump into the stand-alone Battle Arena!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 w-full pt-1 sm:pt-2">
              <button
                type="button"
                onClick={() => setShowCharacterSelectModal(true)}
                className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-amber-500/40 hover:border-amber-400 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-amber-300">
                    Link to DM & Choose Hero
                  </span>
                  <User className="w-4 h-4 text-amber-400 shrink-0" />
                </div>
                <p className="text-[11px] text-zinc-400">
                  {claimedToken ? `Active Hero: ${claimedToken.name}` : 'Select your D&D Beyond or campaign hero'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setShowArenaMode(true)}
                className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-rose-950/60 to-amber-950/60 hover:from-rose-900/60 hover:to-amber-900/60 border border-rose-500/50 hover:border-amber-400 text-left transition-all cursor-pointer group shadow-lg shadow-rose-950/30"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-white group-hover:text-amber-200">
                    Enter Battle Arena
                  </span>
                  <Swords className="w-4 h-4 text-rose-400 group-hover:rotate-12 transition-transform shrink-0" />
                </div>
                <p className="text-[11px] text-zinc-300">
                  1v1 • 2v2 • Scaled Random Encounters • vs NPCs
                </p>
              </button>
            </div>
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
        draggable={!isDraggingToken && !activeEquippedAsset}
        className={activeEquippedAsset ? "cursor-crosshair" : "cursor-default"}
        onContextMenu={(e) => e.evt.preventDefault()}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onTouchStart={handleStageTouchStart}
        onTouchMove={handleStageTouchMove}
        onTouchEnd={handleStageTouchEnd}
        onDragMove={(e) => {
          if (e.target === e.target.getStage() && !activeDraggingTokenIdRef.current) {
            setStagePos({ x: e.target.x(), y: e.target.y() });
          }
        }}
        onDragEnd={(e) => {
          if (e.target === e.target.getStage() && !activeDraggingTokenIdRef.current) {
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
        <Layer ref={bgLayerRef} listening={false}>
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
          fogResetKey={fogResetKey}
          animatedFeatures={boardAnimatedFeatures}
        />

        {/* Tactical Map Labels (Player Visible Navigation Points: Stairs, Ladders, Portals) */}
        {targetMapW > 0 && targetMapH > 0 && roomAnnotations && roomAnnotations.length > 0 && (
          <Layer>
            <RoomHotspotLayer
              annotations={roomAnnotations}
              mapDimensions={{ width: targetMapW, height: targetMapH }}
              stageScale={stageScale}
              campaignMode="run"
              isPlayerView={true}
              selectedAnnotationId={null}
              onSelectAnnotation={() => {}}
              onOpenBriefing={() => {}}
            />
          </Layer>
        )}

        {/* Layer 5: Tokens Layer (Rendered on top of fog so token opacity is 100% solid, while monsters in fog are filtered out) */}
        <Layer>
          {tokens
            .filter(isTokenVisibleToPlayer)
            .map((token) => (
              <PlayerToken
                showHp={showHpDisplay}
                key={token.id}
                token={token}
                gridSize={gridSize}
                gridOffsetX={gridOffsetX}
                gridOffsetY={gridOffsetY}
                stageScale={stageScale}
                characters={compendiumCharacters}
                combatants={combatState.combatants}
                isClaimed={claimedTokenId === token.id}
                canDrag={stationMode === 'tv_table' ? true : (claimedTokenId === token.id || (Boolean(claimedTokenId) && (token as any).spiritualWeapon?.ownerId === claimedTokenId))}
                isTargetingActive={Boolean(activeTargetingAction)}
                onTargetToken={handleTargetToken}
                onMoveToken={handleMoveToken}
                onDragMoveToken={handleDragMoveToken}
                onDragStartToken={handleDragStartToken}
                onClaimToken={handleClaimToken}
                onContextMenu={handleOpenTokenContextMenu}
              />
          ))}
        </Layer>

        {/* Real-time Token Drag Ruler & Ghost Token HUD Layer */}
        {tokenDragState && (
          <Layer listening={false}>
            <TokenDragRuler
              dragState={tokenDragState}
              gridSize={gridSize}
              stageScale={stageScale}
            />
          </Layer>
        )}

        {/* Dynamic JB2A Reticle Layer (Targeting Preview while Aiming) */}
        {activeEquippedAsset && aimOrigin && aimCurrent && (
          <Layer listening={false}>
            <AimReticle
              asset={activeEquippedAsset}
              origin={aimOrigin}
              current={aimCurrent}
              gridSize={gridSize}
              stageScale={stageScale}
              tokens={tokens}
              preferredToken={claimedToken}
            />
          </Layer>
        )}

        {/* Positional / Map Audio Sources Layer (only renders if visibleToPlayers is enabled) */}
        {playerJukeboxState.mapAudioSources.length > 0 && (
          <Layer listening={false}>
            <MapAudioSourcesLayer
              sources={playerJukeboxState.mapAudioSources}
              gridSize={gridSize}
              isDM={false}
            />
          </Layer>
        )}

        {/* Left-Click Hold Map Ping Radar Layer */}
        <MapPingLayer
          pings={mapPings}
          chargeState={pingChargeState}
          stageScale={stageScale}
          gridSize={gridSize}
        />
      </Stage>

      {/* Native GPU-Accelerated JB2A DOM Video Overlay Layer */}
      <DomEffectOverlay
        effects={effects}
        setEffects={setEffects}
        stagePos={stagePos}
        stageScale={stageScale}
        gridSize={gridSize}
        tokens={tokens.filter(isTokenVisibleToPlayer)}
        combatants={combatState?.combatants}
        activeEquippedAsset={activeEquippedAsset}
        aimOrigin={aimOrigin}
        aimCurrent={aimCurrent}
        onEffectComplete={handleEffectComplete}
        onDispelEffect={handleDispelEffect}
        onInspectEffect={handleInspectEffect}
        onClearTokenAura={handleClearTokenAura}
          onRemoveTokenBubble={(tokenId, bubbleId) => {
            setTokens(prev => {
              const next = prev.map(t => t.id === tokenId ? { ...t, bubbles: (t.bubbles || []).filter(b => b.id !== bubbleId) } : t);
              tokensRef.current = next;
              if (socketRef.current?.connected) socketRef.current.emit('SYNC_TOKENS', next);
              return next;
            });
          }}
        />

      {/* ========================================================= */}
      {/* Token Right-Click Context Menu Popup (Mirrored from DM)   */}
      {/* ========================================================= */}
      {activeTokenMenu && (() => {
        const currentToken = tokens.find(t => t.id === activeTokenMenu.id);
        if (!currentToken || !isTokenVisibleToPlayer(currentToken)) return null;
        const isAlly = currentToken.category === 'ally' || !!(currentToken as any).allyId;
        const isMonster = !isAlly && (isMonsterToken(currentToken) || currentToken.isMonster === true || currentToken.category === 'monster' || currentToken.isPlayer === false);
        if (isMonster) return null;

        const matchingChar = compendiumCharacters?.find(c => 
          c.id === currentToken.id || c.name.toLowerCase() === currentToken.name.toLowerCase()
        );
        const isCharacter = currentToken.isPlayer || currentToken.category === 'character' || !!matchingChar;
        const displayAc = currentToken.ac ?? matchingChar?.ac ?? 10;
        const displayHp = currentToken.currentHp ?? currentToken.hp ?? matchingChar?.hp ?? matchingChar?.maxHp ?? 10;
        const displayMaxHp = currentToken.maxHp ?? matchingChar?.maxHp ?? matchingChar?.hp ?? 10;

        // Calculate token screen bounds to position menu off to the side so player token and effects remain visible
        const tokenPixelSize = (currentToken.size || 1) * gridSize * stageScale;
        const tokenScreenX = (currentToken.x * stageScale) + stagePos.x;
        const tokenScreenY = (currentToken.y * stageScale) + stagePos.y;
        const menuWidth = 288; // w-72 = 18rem = 288px
        const menuEstimatedHeight = 440;
        const gap = 16;

        // Prefer placing to the right of the token if room, otherwise to the left
        let calculatedMenuX: number;
        if (tokenScreenX + tokenPixelSize + gap + menuWidth <= window.innerWidth - 16) {
          calculatedMenuX = tokenScreenX + tokenPixelSize + gap;
        } else if (tokenScreenX - gap - menuWidth >= 16) {
          calculatedMenuX = tokenScreenX - gap - menuWidth;
        } else {
          // If neither side fits fully, place where there is more space
          calculatedMenuX = tokenScreenX > window.innerWidth / 2 ? 16 : window.innerWidth - menuWidth - 16;
        }

        // Align vertically with token top, bounded within viewport
        let calculatedMenuY = Math.max(16, Math.min(tokenScreenY, window.innerHeight - menuEstimatedHeight - 16));

        const autoMenuX = Math.max(16, Math.min(calculatedMenuX, window.innerWidth - menuWidth - 16));
        const autoMenuY = calculatedMenuY;
        const menuX = tokenMenuPos ? tokenMenuPos.x : autoMenuX;
        const menuY = tokenMenuPos ? tokenMenuPos.y : autoMenuY;
        const isCurrentClaimed = claimedTokenId === currentToken.id;

        return (
          <div 
            id="player-token-context-menu"
            onPointerDown={startTokenMenuDrag}
            className={`fixed z-[300] bg-zinc-950/95 backdrop-blur-xl border rounded-xl shadow-2xl p-3.5 w-72 animate-in fade-in zoom-in-95 select-none cursor-move ${tokenMenuPinned ? 'border-amber-500/70' : 'border-zinc-700/80'}`}
            style={{ left: menuX, top: menuY }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            {/* Context Menu Header (drag handle) */}
            <div
              className="flex justify-between items-center mb-2.5 pb-2 border-b border-zinc-800 cursor-move touch-none"
              title="Click and drag to move menu"
            >
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
                <GripHorizontal className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (!tokenMenuPinned && !tokenMenuPos) {
                      // Freeze at current on-screen spot so the pinned menu stops following the token
                      setTokenMenuPos({ x: menuX, y: menuY });
                    }
                    setTokenMenuPinned(p => !p);
                  }}
                  className={`text-xs leading-none p-0.5 cursor-pointer ${tokenMenuPinned ? 'text-amber-400' : 'text-zinc-500 hover:text-white'}`}
                  title={tokenMenuPinned ? 'Unpin (menu closes on click-away)' : 'Pin (keep menu open)'}
                >
                  {tokenMenuPinned ? '📌' : '📍'}
                </button>
                <button 
                  type="button"
                  onClick={forceCloseTokenMenu} 
                  className="text-zinc-500 hover:text-white text-base leading-none p-0.5 cursor-pointer"
                  title="Close (Escape)"
                >
                  ×
                </button>
              </div>
            </div>
            
            {/* Tab Navigation: Stats & Info vs Conditions vs Auras */}
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
                Stats
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
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse shrink-0" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setTokenMenuTab('auras')}
                className={`flex-1 py-1 rounded-md text-[10px] font-bold font-mono transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  tokenMenuTab === 'auras'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                <span>Auras</span>
                {((currentToken.auraRadius && currentToken.auraRadius > 0) || (currentToken.auras && currentToken.auras.length > 0)) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
                )}
              </button>
            </div>
            
            {tokenMenuTab === 'stats' && (
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

                {/* Special Effects: Glowing Halo (character-specific) */}
{canTokenHaveHalo(currentToken.name) && (
                  <div className="bg-zinc-900/90 border border-amber-400/30 rounded-xl p-2.5 flex items-center justify-between">
                    <span className="text-[9px] text-amber-300 uppercase font-bold tracking-wider font-mono flex items-center gap-1">
                      <span>✨</span> Special Effects
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateToken(currentToken.id, { haloActive: !currentToken.haloActive })}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1 border ${
                        currentToken.haloActive
                          ? 'bg-amber-400/25 text-amber-100 border-amber-300/80 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                      }`}
                    >
                      <span>{currentToken.haloActive ? '😇 Halo Active' : 'Activate Halo'}</span>
                    </button>
                  </div>
                )}

                {/* Flight & Multi-Height Elevation Controls */}
                <div className="bg-zinc-900/90 border border-sky-500/30 rounded-xl p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-sky-400 uppercase font-bold tracking-wider font-mono flex items-center gap-1">
                      <span>🪽</span> Flight & Height
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const curFly = Boolean(currentToken.isFlying);
                        const curElev = Number(currentToken.elevation) || 0;
                        const nextFly = !curFly;
                        const nextElev = nextFly && curElev === 0 ? 15 : (!nextFly ? 0 : curElev);
                        handleUpdateToken(currentToken.id, { isFlying: nextFly, elevation: nextElev });
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1 border ${
                        currentToken.isFlying
                          ? 'bg-sky-500/25 text-sky-200 border-sky-400/70 shadow-[0_0_12px_rgba(56,189,248,0.35)]'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                      }`}
                    >
                      <span>{currentToken.isFlying ? '🪽 Flying Active' : 'Grounded (Click to Fly)'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const nextElev = (Number(currentToken.elevation) || 0) - 5;
                        handleUpdateToken(currentToken.id, {
                          elevation: nextElev,
                          isFlying: nextElev === 0 ? false : currentToken.isFlying
                        });
                      }}
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-bold font-mono border border-zinc-700 cursor-pointer"
                      title="Lower 5 ft"
                    >
                      -5ft
                    </button>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step={5}
                        value={currentToken.elevation ?? 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          const nextElev = isNaN(val) ? 0 : val;
                          handleUpdateToken(currentToken.id, {
                            elevation: nextElev,
                            isFlying: nextElev > 0 ? true : (nextElev === 0 ? false : currentToken.isFlying)
                          });
                        }}
                        className="w-full bg-zinc-950 border border-sky-500/40 rounded-lg text-xs text-sky-300 font-bold text-center px-2 py-1 focus:outline-none focus:border-sky-400 font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextElev = (Number(currentToken.elevation) || 0) + 5;
                        handleUpdateToken(currentToken.id, {
                          elevation: nextElev,
                          isFlying: nextElev > 0 ? true : currentToken.isFlying
                        });
                      }}
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-sky-300 rounded-lg text-xs font-bold font-mono border border-zinc-700 cursor-pointer"
                      title="Raise 5 ft"
                    >
                      +5ft
                    </button>
                  </div>

                  <div className="grid grid-cols-6 gap-1">
                    {[-10, 0, 10, 15, 30, 60].map(preset => {
                      const isCurrent = (currentToken.elevation || 0) === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            handleUpdateToken(currentToken.id, {
                              elevation: preset,
                              isFlying: preset > 0
                            });
                          }}
                          className={`py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer border ${
                            isCurrent
                              ? 'bg-sky-500/30 text-sky-200 border-sky-400/70'
                              : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800'
                          }`}
                        >
                          {preset > 0 ? `+${preset}` : `${preset}`}
                        </button>
                      );
                    })}
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
            )}

            {tokenMenuTab === 'conditions' && (
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
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const rule = lookupDndRuleDetails(cond, "condition");
                          if (rule) setInspectedRuleEntry(rule);
                        }}
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

            {tokenMenuTab === 'auras' && (
              <div className="space-y-3">
                {/* Active Aura Status Banner */}
                {((currentToken.auraRadius && currentToken.auraRadius > 0) || (currentToken.auras && currentToken.auras.length > 0)) ? (
                  <div className="bg-indigo-950/40 border border-indigo-500/40 rounded-xl p-2.5 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        const auraName = currentToken.auraName || 'Magical Aura';
                        handleInspectEffect({
                          id: `token_aura_${currentToken.id}`,
                          name: auraName,
                          label: auraName,
                          assetKey: auraName.toLowerCase().replace(/\s+/g, '_'),
                          videoUrl: currentToken.videoUrl || '',
                          paradigm: 'aura',
                          x: currentToken.x,
                          y: currentToken.y,
                          attachedTokenId: currentToken.id,
                          sizeFt: currentToken.auraRadius || 10,
                          rotation: 0,
                          opacity: currentToken.auraOpacity ?? 0.4,
                          blendMode: 'screen',
                          isPersistent: true,
                          loop: true,
                          castTime: Date.now(),
                          casterName: currentToken.name
                        });
                      }}
                      className="flex items-center gap-2 overflow-hidden text-left group/auratitle cursor-pointer"
                      title="Click to open aura description & roll dice"
                    >
                      <div
                        className="w-4 h-4 rounded-full border border-white/50 shrink-0 shadow-sm"
                        style={{ backgroundColor: currentToken.auraColor || 'rgba(234, 179, 8, 0.5)' }}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-bold text-indigo-200 group-hover/auratitle:text-amber-300 group-hover/auratitle:underline truncate transition-colors">
                          {currentToken.auraName || 'Magical Aura'}
                        </span>
                        <span className="text-[9px] font-mono text-indigo-400">
                          Radius: {currentToken.auraRadius || 10} ft
                        </span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleUpdateToken(currentToken.id, {
                          auraRadius: undefined,
                          auraColor: undefined,
                          auraName: undefined,
                          auraOpacity: undefined,
                          auras: []
                        });
                        toast.info(`Removed aura from ${currentToken.name}`);
                      }}
                      className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                      title="Remove Aura"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-2 text-center text-[10px] text-zinc-400 font-mono">
                    No active aura. Pick a preset or build a custom aura below.
                  </div>
                )}

                {/* Section: Preset Auras */}
                <div>
                  <div className="flex justify-between items-center px-1 mb-1.5">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase font-bold tracking-tighter flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                      Preset Magical Auras
                    </span>
                    <span className="text-[9px] font-mono text-indigo-400 font-bold">1-Click</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 max-h-44 overflow-y-auto sidebar-scrollbar pr-1">
                    {AURA_PRESETS.map((preset) => {
                      const isActive = currentToken.auraName === preset.name || 
                        (currentToken.auraRadius === preset.radius && currentToken.auraColor === preset.color);
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const rule = lookupDndRuleDetails(preset.name, "aura");
                            if (rule) setInspectedRuleEntry(rule);
                          }}
                          onClick={() => {
                            handleUpdateToken(currentToken.id, {
                              auraRadius: preset.radius,
                              auraColor: preset.color,
                              auraName: preset.name,
                              auraOpacity: preset.opacity || 0.35,
                              videoUrl: preset.videoUrl
                            });
                            toast.success(`Equipped ${preset.name} (${preset.radius}ft)`);
                          }}
                          className={`w-full p-1.5 rounded-lg text-left transition-all flex items-center justify-between border cursor-pointer ${
                            isActive
                              ? 'bg-indigo-600/30 border-indigo-400/80 text-white shadow-sm'
                              : 'bg-zinc-900/80 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-3.5 h-3.5 rounded-full border border-white/40 shrink-0"
                              style={{ backgroundColor: preset.color }}
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="text-[11px] font-semibold truncate leading-tight">{preset.name}</span>
                              {preset.description && (
                                <span className="text-[9px] text-zinc-500 truncate leading-tight">{preset.description}</span>
                              )}
                            </div>
                          </div>
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 shrink-0 ml-1">
                            {preset.radius}ft
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section: Custom Aura Controls */}
                <div className="border-t border-zinc-800/80 pt-2.5 space-y-2">
                  <span className="text-[9px] font-mono text-zinc-400 uppercase font-bold tracking-tighter block px-1">
                    Custom Aura Settings
                  </span>

                  {/* Radius quick buttons & input */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-zinc-400 font-mono w-11 shrink-0">Radius:</span>
                    <div className="flex items-center gap-1 flex-1 overflow-x-auto">
                      {[5, 10, 15, 20, 30, 60].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            setCustomAuraRadiusInput(r);
                            handleUpdateToken(currentToken.id, {
                              auraRadius: r,
                              auraColor: currentToken.auraColor || customAuraColorInput,
                              auraName: currentToken.auraName || 'Custom Aura',
                              auraOpacity: currentToken.auraOpacity ?? customAuraOpacityInput
                            });
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all border cursor-pointer ${
                            (currentToken.auraRadius || customAuraRadiusInput) === r
                              ? 'bg-amber-500/30 text-amber-300 border-amber-500/60'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {r}ft
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Swatches */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-zinc-400 font-mono w-11 shrink-0">Color:</span>
                    <div className="flex items-center gap-1.5 flex-wrap flex-1">
                      {AURA_COLOR_PALETTE.map((pal) => (
                        <button
                          key={pal.name}
                          type="button"
                          onClick={() => {
                            setCustomAuraColorInput(pal.color);
                            handleUpdateToken(currentToken.id, {
                              auraColor: pal.color,
                              auraRadius: currentToken.auraRadius || customAuraRadiusInput || 10,
                              auraName: currentToken.auraName || `${pal.name} Aura`,
                              auraOpacity: currentToken.auraOpacity ?? 0.9,
                              videoUrl: (pal as any).videoUrl
                            });
                          }}
                          className={`w-4 h-4 rounded-full border transition-all cursor-pointer ${
                            (currentToken.auraColor || customAuraColorInput) === pal.color
                              ? 'ring-2 ring-white scale-110 border-white'
                              : 'border-white/30 hover:scale-105'
                          }`}
                          style={{ backgroundColor: pal.color }}
                          title={pal.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Custom Opacity */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-zinc-400 font-mono w-11 shrink-0">Opacity:</span>
                    <input
                      type="range"
                      min={0.15}
                      max={0.7}
                      step={0.05}
                      value={currentToken.auraOpacity ?? customAuraOpacityInput}
                      onChange={(e) => {
                        const op = parseFloat(e.target.value);
                        setCustomAuraOpacityInput(op);
                        if (currentToken.auraRadius && currentToken.auraRadius > 0) {
                          handleUpdateToken(currentToken.id, { auraOpacity: op });
                        }
                      }}
                      className="flex-1 accent-indigo-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                    <span className="text-[9px] font-mono text-zinc-400 w-8 text-right">
                      {Math.round((currentToken.auraOpacity ?? customAuraOpacityInput) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Backdrop to close right-click menu when clicking away */}
      {activeTokenMenu && !tokenMenuPinned && (
        <div 
          className="fixed inset-0 z-[299]" 
          onClick={softCloseTokenMenu}
          onContextMenu={(e) => { e.preventDefault(); softCloseTokenMenu(); }}
        />
      )}



      {/* Interactive Polyhedral Dice Roller Modal */}
      <PlayerDiceRollerModal
        isOpen={showDiceRollerModal}
        onClose={() => setShowDiceRollerModal(false)}
        selectedDicePreset={selectedDicePreset}
        onOpenDicePalette={() => {
          setShowDiceRollerModal(false);
          setShowDicePaletteModal(true);
        }}
        characterName={claimedToken?.name || 'Local Player'}
        onRoll={(rollEvent, isPublic) => {
          // 1. Trigger local 3D physics dice simulation
          if (typeof window !== 'undefined' && (window as any).__mistwalkerRoll3d) {
            (window as any).__mistwalkerRoll3d(rollEvent);
          }

          // 2. If public, broadcast to table via socket
          if (isPublic && socketRef.current?.connected) {
            socketRef.current.emit('SYNC_LOCAL_DICE_ROLL', rollEvent);
          }

          // 3. Screen shake on natural 20
          if (rollEvent.isCritical) {
            setIsShaking(true);
            playCriticalHitSound();
            setTimeout(() => setIsShaking(false), 600);
            if (socketRef.current?.connected) {
              socketRef.current.emit('SYNC_SHAKE', {});
            }
          }

          toast.success(`${rollEvent.characterName} rolled ${rollEvent.formula}`, {
            description: `Total: ${rollEvent.total} (${isPublic ? 'Public to everyone' : 'Private to self'})`
          });
        }}
        onClearDice={() => {
          if (typeof window !== 'undefined' && (window as any).__mistwalkerClearDice3d) {
            (window as any).__mistwalkerClearDice3d();
            toast.info('Dice cleared from table');
          }
        }}
      />

      {/* 3D Dice Color Customization Modal */}
      {showDicePaletteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowDicePaletteModal(false)}
        >
          <div
            className="relative w-full max-w-xl bg-zinc-950/95 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden p-6 text-zinc-100 flex flex-col gap-5 ring-1 ring-zinc-700/50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-md transition-colors"
                  style={{
                    backgroundColor: selectedDicePreset.theme.secondaryColor,
                    borderColor: selectedDicePreset.theme.borderColor
                  }}
                >
                  <Dices className="w-5 h-5" style={{ color: selectedDicePreset.theme.borderColor }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                    3D Dice Collection
                    <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-zinc-800 border border-zinc-700 text-zinc-300">
                      8 Styles
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Select your preferred dice material. Applies immediately to all 3D physics rolls.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowDicePaletteModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto pr-1">
              {DICE_COLOR_PRESETS.map((preset) => {
                const isSelected = preset.id === selectedDicePreset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectDicePreset(preset)}
                    className={`relative text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 group cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-900 shadow-lg ring-1'
                        : 'bg-zinc-900/60 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700'
                    }`}
                    style={
                      isSelected
                        ? {
                            borderColor: preset.theme.borderColor,
                            boxShadow: `0 0 16px ${preset.theme.primaryColor}35`
                          }
                        : undefined
                    }
                  >
                    {/* Visual 3D Die Swatch / Badge */}
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md border-2 shrink-0 transition-transform group-hover:scale-105 bg-gradient-to-br ${preset.previewGradient}`}
                      style={{
                        borderColor: preset.theme.borderColor,
                        boxShadow: `0 4px 12px ${preset.theme.primaryColor}40`
                      }}
                    >
                      <span
                        className="font-serif font-black text-lg select-none drop-shadow"
                        style={{ color: preset.theme.numberColor }}
                      >
                        20
                      </span>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <span
                          className={`text-sm font-semibold truncate ${isSelected ? 'font-bold' : 'text-zinc-200 group-hover:text-white'}`}
                          style={isSelected ? { color: preset.theme.borderColor } : undefined}
                        >
                          {preset.name}
                        </span>
                        {isSelected && (
                          <span
                            className="flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border"
                            style={{
                              color: preset.theme.borderColor,
                              backgroundColor: `${preset.theme.secondaryColor}bb`,
                              borderColor: `${preset.theme.borderColor}66`
                            }}
                          >
                            <Check className="w-3 h-3" />
                            Equipped
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-snug">
                        {preset.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer with Test Roll & Done */}
            <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-mono">
                Active: <span className="text-zinc-300 font-medium">{selectedDicePreset.name}</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined' && (window as any).__mistwalkerRoll3d) {
                      const rollVal = Math.floor(Math.random() * 20) + 1;
                      (window as any).__mistwalkerRoll3d({
                        id: `test-${Date.now()}`,
                        characterName: claimedToken?.name || 'Local Player',
                        action: 'Test Roll',
                        rollType: 'roll',
                        formula: `1d20 (${rollVal})`,
                        diceNotation: '1d20',
                        dice: [{ sides: 20, result: rollVal, type: 'd20' }],
                        total: rollVal,
                        isCritical: rollVal === 20,
                        isFumble: rollVal === 1,
                        theme: selectedDicePreset.id,
                        themeColor: selectedDicePreset.theme.primaryColor,
                        timestamp: Date.now(),
                        source: 'player'
                      });
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Dices className="w-3.5 h-3.5 text-zinc-300" />
                  <span>Test Roll</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDicePaletteModal(false)}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* ========================================================= */}
      {/* Initiative Prompt Modal                                    */}
      {/* ========================================================= */}
      {initiativePromptData && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-amber-500/50 rounded-2xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center space-y-4">
            {/* Header / Avatar */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-2 border-amber-400 overflow-hidden shadow-lg shadow-amber-500/20 bg-zinc-900 flex items-center justify-center">
                {initiativePromptData.token.avatarUrl ? (
                  <img
                    src={initiativePromptData.token.avatarUrl}
                    alt={initiativePromptData.token.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Swords className="w-8 h-8 text-amber-400" />
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center font-mono font-bold text-xs shadow-md">
                {typeof initiativePromptData.token.initiativeBonus === 'number' && initiativePromptData.token.initiativeBonus >= 0
                  ? `+${initiativePromptData.token.initiativeBonus}`
                  : (initiativePromptData.token.initiativeBonus ?? '+0')}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                Combat Commenced
              </span>
              <h2 className="text-xl font-bold text-white font-mono">
                Roll for Initiative!
              </h2>
              <p className="text-xs text-zinc-400">
                {initiativePromptData.token.name} (Modifier: {typeof initiativePromptData.token.initiativeBonus === 'number' && initiativePromptData.token.initiativeBonus >= 0 ? `+${initiativePromptData.token.initiativeBonus}` : initiativePromptData.token.initiativeBonus ?? '+0'})
              </p>
            </div>

            {/* Option A: Roll 3D Dice */}
            <div className="w-full space-y-2 pt-2">
              <button
                type="button"
                disabled={initiativePromptData.isRolling}
                onClick={() => {
                  setInitiativePromptData(prev => prev ? { ...prev, isRolling: true } : null);
                  const d20 = Math.floor(Math.random() * 20) + 1;
                  const bonus = Number(initiativePromptData.token.initiativeBonus) || 0;
                  const total = Math.max(1, d20 + bonus);

                  const diceEvent = {
                    id: `init-${Date.now()}`,
                    characterName: initiativePromptData.token.name,
                    action: 'Initiative Roll',
                    rollType: 'roll',
                    formula: `1d20 (${d20}) ${bonus >= 0 ? `+ ${bonus}` : `- ${Math.abs(bonus)}`} = ${total}`,
                    diceNotation: '1d20',
                    dice: [{ sides: 20, result: d20, type: 'd20' }],
                    total: total,
                    isCritical: d20 === 20,
                    isFumble: d20 === 1,
                    theme: selectedDicePreset.id,
                    themeColor: selectedDicePreset.theme.primaryColor,
                    timestamp: Date.now(),
                    source: 'player'
                  };

                  if (typeof window !== 'undefined' && (window as any).__mistwalkerRoll3d) {
                    (window as any).__mistwalkerRoll3d(diceEvent);
                  }
                  if (socketRef.current?.connected) {
                    socketRef.current.emit('SYNC_LOCAL_DICE_ROLL', diceEvent);
                    socketRef.current.emit('SUBMIT_INITIATIVE', {
                      tokenId: initiativePromptData.token.id,
                      characterName: initiativePromptData.token.name,
                      initiative: total
                    });
                  }

                  toast.success(`🎲 Initiative ${total} submitted!`);
                  setTimeout(() => {
                    setInitiativePromptData(null);
                  }, 800);
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-mono font-bold text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
              >
                <Dices className="w-4 h-4" />
                <span>Roll 1d20 {Number(initiativePromptData.token.initiativeBonus) >= 0 ? `(+${initiativePromptData.token.initiativeBonus || 0})` : initiativePromptData.token.initiativeBonus}</span>
              </button>

              <div className="flex items-center my-2 text-zinc-600 text-xs font-mono">
                <div className="flex-1 border-t border-zinc-800" />
                <span className="px-2">OR ENTER MANUALLY</span>
                <div className="flex-1 border-t border-zinc-800" />
              </div>

              {/* Option B: Manual Input */}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="45"
                  value={initiativePromptData.manualValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    setInitiativePromptData(prev => prev ? { ...prev, manualValue: val } : null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const num = parseInt(initiativePromptData.manualValue, 10);
                      if (!isNaN(num) && num > 0) {
                        if (socketRef.current?.connected) {
                          socketRef.current.emit('SUBMIT_INITIATIVE', {
                            tokenId: initiativePromptData.token.id,
                            characterName: initiativePromptData.token.name,
                            initiative: num
                          });
                        }
                        toast.success(`Initiative ${num} submitted!`);
                        setInitiativePromptData(null);
                      }
                    }
                  }}
                  placeholder="Physical roll total"
                  className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-xl px-3 py-2 text-sm font-mono text-center text-white placeholder:text-zinc-600 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={!initiativePromptData.manualValue || isNaN(parseInt(initiativePromptData.manualValue, 10))}
                  onClick={() => {
                    const num = parseInt(initiativePromptData.manualValue, 10);
                    if (!isNaN(num) && num > 0) {
                      if (socketRef.current?.connected) {
                        socketRef.current.emit('SUBMIT_INITIATIVE', {
                          tokenId: initiativePromptData.token.id,
                          characterName: initiativePromptData.token.name,
                          initiative: num
                        });
                      }
                      toast.success(`Initiative ${num} submitted!`);
                      setInitiativePromptData(null);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-200 hover:text-white font-mono text-xs font-bold border border-zinc-700 cursor-pointer transition-all"
                >
                  Submit
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setInitiativePromptData(null)}
              className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300 pt-1 cursor-pointer transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Mobile & Desktop Floating Canvas Quick Controls            */}
      {/* ========================================================= */}
      {!isUiMinimized && (
        <div className="fixed bottom-20 right-3 sm:bottom-28 sm:right-4 z-40 flex flex-col gap-2 pointer-events-auto select-none pb-[env(safe-area-inset-bottom)]">
          {/* Recenter on Claimed Hero */}
          <button
            type="button"
            onClick={recenterOnMyToken}
            className="w-10 h-10 rounded-2xl bg-zinc-950/90 hover:bg-zinc-900 border border-zinc-800 hover:border-amber-500/60 shadow-xl backdrop-blur-xl flex items-center justify-center text-zinc-300 hover:text-amber-400 active:scale-95 transition-all cursor-pointer ring-1 ring-white/10"
            title="Recenter Battlemap on My Character"
          >
            <Target className="w-4 h-4 text-amber-400" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="w-10 h-10 rounded-2xl bg-zinc-950/90 hover:bg-zinc-900 border border-zinc-800 hover:border-amber-500/60 shadow-xl backdrop-blur-xl flex items-center justify-center text-zinc-300 hover:text-white active:scale-95 transition-all cursor-pointer ring-1 ring-white/10"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* 3D Physics Dice Table Overlay */}
      <DiceTableOverlay
        socket={socketInstance || socketRef.current}
        theme={selectedDicePreset.theme}
        onCriticalHit={() => {
          setIsShaking(true);
          playCriticalHitSound();
          setTimeout(() => setIsShaking(false), 600);
        }}
      />

      {/* Full-Text D&D Rule / Spell / Aura Inspection Modal */}
      {inspectedRuleEntry && (
        <DndRuleInspectionModal
          entry={inspectedRuleEntry}
          onClose={() => setInspectedRuleEntry(null)}
        />
      )}

      {/* Interactive Combat Dice Prompt Modal when Auto Roll is OFF */}
      <CombatDicePromptModal
        pendingRoll={pendingCombatRoll}
        onClose={() => setPendingCombatRoll(null)}
        onResolveHit={handleResolveCombatHit}
        onResolveDamage={handleResolveCombatDamage}
        onEnableAutoRollAndContinue={handleEnableAutoRollAndContinueFromPrompt}
        onTrigger3dDice={(evt) => {
          if (typeof window !== 'undefined' && (window as any).__mistwalkerRoll3d) {
            (window as any).__mistwalkerRoll3d(evt);
          }
          if (socketRef.current?.connected) {
            socketRef.current.emit('SYNC_LOCAL_DICE_ROLL', evt);
          }
        }}
      />

      {/* ========================================================= */}
      {/* D&D Beyond Tactical Character HUD (Synced to DDB)         */}
      {/* ========================================================= */}
      {(stationMode === 'remote_player' || Boolean(claimedToken)) && !isUiMinimized && (
        <PlayerHeroDock
          characterData={hudCharacterData}
          claimedToken={claimedToken}
          onSelectAction={handleSelectHudAction}
          onRollToHit={handleRollToHit}
          onRollDamage={handleRollDamage}
          activeTargetingAction={activeTargetingAction}
          activeEquippedAsset={activeEquippedAsset}
          onCancelTargeting={() => {
            setActiveTargetingAction(null);
            setActiveEquippedAsset(null);
            setAimOrigin(null);
            setAimCurrent(null);
          }}
          onTargetSelf={() => {
            if (claimedToken) {
              handleTargetToken(claimedToken);
            }
          }}
          isMyTurn={Boolean(visibleCombatants.find(c => c.isClaimed)?.isCurrentTurn)}
          onEndTurn={() => {
            if (socketRef.current?.connected) {
              socketRef.current.emit('PLAYER_END_TURN', {
                tokenId: claimedToken?.id,
                name: claimedToken?.name
              });
            }
            toast.info('Turn passed.');
          }}
          onSwitchStationMode={() => setShowStationModal(true)}
          onSwitchCharacter={() => setShowCharacterSelectModal(true)}
          onOpenPrivacyModal={() => {
            const charId = resolvedClaimedDdbId || (claimedToken as any)?.ddbCharacterId;
            if (charId) {
              setPrivacyModalState({
                isOpen: true,
                characterId: String(charId),
                characterName: claimedToken?.name || 'Character',
                avatarUrl: claimedToken?.url || claimedToken?.avatarUrl
              });
            }
          }}
          isCharacterPrivate={isCurrentCharacterPrivate}
          onRefreshDdb={() => syncHudFromDdb(true)}
          isSyncingDdb={isSyncingHudDdb}
          isDdbSyncEnabled={isDdbSyncEnabled}
          onToggleDdbSync={handleToggleDdbSync}
          isAutoRollDiceEnabled={isAutoRollDiceEnabled}
          onToggleAutoRollDice={handleToggleAutoRollDice}
          activeEffects={effects}
          onDispelEffect={handleDispelEffect}
          inspectedAuraRequest={inspectedAuraRequest}
          onClearInspectedAura={() => setInspectedAuraRequest(null)}
          onOpenWildShape={() => setShowWildShapeModal(true)}
          onRevertWildShape={handleRevertWildShape}
          activeWildShape={activeWildShape}
          collapseRequestTick={hudCollapseTick}
          onAdjustHp={handleAdjustHp}
          onAdjustSpellSlot={handleAdjustSpellSlot}
        />
      )}

      {/* ========================================================= */}
      {/* Druid Wild Shape Modal (Circle of the Moon)               */}
      {/* ========================================================= */}
      <WildShapeModal
        isOpen={showWildShapeModal}
        onClose={() => setShowWildShapeModal(false)}
        onSelectForm={handleTransformWildShape}
        onRevertForm={handleRevertWildShape}
        activeWildShape={activeWildShape}
        druidLevel={hudCharacterData?.totalLevel || 6}
        wisModifier={4}
      />

      {/* ========================================================= */}
      {/* Player Station Mode Modal (Digital TV Table / Remote)     */}
      {/* ========================================================= */}
      <PlayerStationModal
        isOpen={showStationModal}
        onSelectStation={handleSelectStationMode}
        onEnterArena={() => {
          setShowStationModal(false);
          setShowArenaMode(true);
        }}
        characterName={claimedToken?.name}
      />

      {/* ========================================================= */}
      {/* Player Character Select Modal (Choose Hero in Player View) */}
      {/* ========================================================= */}
      <PlayerCharacterSelectModal
        isOpen={showCharacterSelectModal}
        onClose={() => setShowCharacterSelectModal(false)}
        tokens={tokens}
        compendiumCharacters={compendiumCharacters}
        claimedTokenId={claimedTokenId}
        onSelectCharacter={handleSelectCharacterChoice}
        onReleaseCharacter={handleReleaseToken}
        onPromptPrivacy={(details) => {
          setPrivacyModalState({
            isOpen: true,
            characterId: details.characterId,
            characterName: details.characterName,
            avatarUrl: details.avatarUrl,
            pendingChoice: details.choice
          });
        }}
      />

      {/* ========================================================= */}
      {/* D&D Beyond Character Sheet Privacy Notice Modal           */}
      {/* ========================================================= */}
      {privacyModalState && (
        <PlayerDdbPrivacyModal
          isOpen={privacyModalState.isOpen}
          onClose={() => setPrivacyModalState(null)}
          characterName={privacyModalState.characterName}
          characterId={privacyModalState.characterId}
          avatarUrl={privacyModalState.avatarUrl}
          onPrivacyResolved={() => {
            if (privacyModalState.pendingChoice) {
              handleSelectCharacterChoice(privacyModalState.pendingChoice);
            }
            setIsCurrentCharacterPrivate(false);
            syncHudFromDdb(true);
            toast.success(`${privacyModalState.characterName}'s sheet is now Public and fully synced!`);
          }}
          onContinueLimited={() => {
            promptedPrivateCharIdRef.current = String(privacyModalState.characterId);
            if (privacyModalState.pendingChoice) {
              handleSelectCharacterChoice(privacyModalState.pendingChoice);
            }
            toast.info(`Continuing with local character sheet for ${privacyModalState.characterName}.`);
          }}
        />
      )}

      {/* ========================================================= */}
      {/* 1-Tap Mutation Approval Prompt (Incoming Healing/Damage)  */}
      {/* ========================================================= */}
      {incomingMutationPrompt && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 pointer-events-auto animate-in fade-in duration-150">
          <div className="bg-zinc-950/95 border border-zinc-700/80 rounded-2xl p-5 max-w-sm w-full shadow-2xl flex flex-col gap-3 ring-1 ring-white/10 text-center">
            <div className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center border shadow-md ${
              incomingMutationPrompt.deltaHp >= 0
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : 'bg-rose-500/20 border-rose-500/40 text-rose-400'
            }`}>
              {incomingMutationPrompt.deltaHp >= 0 ? <Heart className="w-6 h-6" /> : <Swords className="w-6 h-6" />}
            </div>
            <div>
              <h4 className="text-sm font-bold text-white font-mono">
                {incomingMutationPrompt.deltaHp >= 0 ? 'Incoming Healing' : 'Incoming Damage'}
              </h4>
              <p className="text-xs text-zinc-300 mt-1">
                <strong className="text-amber-300">{incomingMutationPrompt.sourceName}</strong> targeted you with{' '}
                <strong className="text-white">{incomingMutationPrompt.actionName}</strong>.
              </p>
              <div className={`mt-2 py-1 px-3 rounded-lg font-mono font-bold text-sm inline-block ${
                incomingMutationPrompt.deltaHp >= 0
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
              }`}>
                {incomingMutationPrompt.deltaHp >= 0 ? `+${incomingMutationPrompt.deltaHp} HP` : `${incomingMutationPrompt.deltaHp} HP`}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={handleDeclineMutation}
                className="flex-1 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-mono text-xs font-semibold border border-zinc-700 transition-colors cursor-pointer"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={handleApproveMutation}
                className={`flex-1 py-2 rounded-xl text-zinc-950 font-mono text-xs font-bold transition-all shadow-md cursor-pointer ${
                  incomingMutationPrompt.deltaHp >= 0
                    ? 'bg-emerald-400 hover:bg-emerald-300'
                    : 'bg-rose-400 hover:bg-rose-300 text-white'
                }`}
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stand-Alone Player Handouts, Visual Props & Shared Journal System */}
      <HandoutsJournalModal
        isOpen={showHandoutsJournalModal}
        onClose={() => setShowHandoutsJournalModal(false)}
        role="player"
        currentCharacterName={activeClaimedName}
        partyCharacters={compendiumCharacters}
        handouts={partyHandouts}
        quests={partyQuests}
        journalEntries={partyJournalEntries}
        activePresentation={activeHandoutPresentation}
        onSaveHandout={addOrUpdateHandout}
        onDeleteHandout={deleteHandout}
        onPresentHandout={presentHandoutToTable}
        onSaveQuest={addOrUpdateQuest}
        onDeleteQuest={deleteQuest}
        onSaveJournalEntry={addOrUpdateJournalEntry}
        onDeleteJournalEntry={deleteJournalEntry}
        onSubmitRiddleGuess={submitRiddleGuess}
      />

      <HandoutSpotlightModal
        presentation={activeHandoutPresentation}
        handouts={partyHandouts}
        role="player"
        currentCharacterName={activeClaimedName}
        onDismiss={dismissHandoutPresentation}
        onUpdatePresentation={() => {}}
        onSubmitRiddleGuess={submitRiddleGuess}
      />

      {/* Stand-Alone Player Battle Arena & Turn-Based Colosseum */}
      <PlayerArenaMode
        isOpen={showArenaMode}
        onExitArena={() => setShowArenaMode(false)}
        compendiumCharacters={compendiumCharacters}
        claimedCharacterName={claimedToken?.name}
        socketRef={socketRef}
        hasLiveDmMap={Boolean(imageFile || image)}
        onTrigger3dDice={(rollEvent) => {
          if (typeof window !== 'undefined' && (window as any).__mistwalkerRoll3d) {
            (window as any).__mistwalkerRoll3d({
              ...rollEvent,
              theme: selectedDicePreset.id,
              themeColor: selectedDicePreset.theme.primaryColor
            });
          }
        }}
      />

      {/* Toast Notification Container for Player View */}
      <Toaster position="bottom-right" theme="dark" richColors />
    </div>
  );
}
