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
  Minimize
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { DynamicLightingLayer } from './DynamicLightingLayer';
import { GridLayer } from './GridLayer';
import { AnimatedFeaturesKonvaImage, AnimatedFeature, WeatherEffectType } from './AnimatedMapOverlay';
import { DiceTableOverlay } from './DiceTableOverlay';
import { DdbDiceRollEvent } from '../types/dice';
import { DICE_COLOR_PRESETS, DiceColorPreset } from '../graphics/dice/diceTextures';
import { WallSegment, VisionConfig, RoomAnnotation, Combatant, isMonsterToken, AURA_PRESETS, AURA_COLOR_PALETTE, TokenAura, AuraPreset } from '../types';
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
  findJb2aAsset
} from '../effects';
import { PlayerStationModal, PlayerStationMode } from './PlayerStationModal';
import { PlayerHeroDock } from './PlayerHeroDock';
import { HudCharacterData, HudActionItem } from '../types/hud';
import { TokenDragRuler, TokenDragState, parseSpeedFt } from './TokenDragRuler';

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
  onContextMenu
}: {
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
  const pointerDownTimeRef = useRef<number>(0);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const holdTimerRef = useRef<any>(null);
  const isHoldMetRef = useRef<boolean>(false);
  const isCurrentlyDraggingRef = useRef<boolean>(false);

  // Clear hold timer on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
    };
  }, []);

  const handleDragStart = (e: any) => {
    e.cancelBubble = true;
    if (!canDrag || isMonster || isCondition) {
      e.target.stopDrag();
      return;
    }

    const now = Date.now();
    const elapsed = pointerDownTimeRef.current > 0 ? (now - pointerDownTimeRef.current) : 999;
    const clientX = e.evt?.clientX ?? (e.evt?.touches && e.evt.touches[0]?.clientX) ?? 0;
    const clientY = e.evt?.clientY ?? (e.evt?.touches && e.evt.touches[0]?.clientY) ?? 0;
    const dx = pointerDownPosRef.current ? clientX - pointerDownPosRef.current.x : 0;
    const dy = pointerDownPosRef.current ? clientY - pointerDownPosRef.current.y : 0;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // If targeting is active, abort dragging and execute action against clicked target token
    if (isTargetingActive) {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
      e.target.stopDrag();
      if (onTargetToken) {
        onTargetToken(token);
      }
      return;
    }

    // If hold requirement not met (user clicked quickly without holding down or dragging far), abort drag and select token
    if (!isHoldMetRef.current && elapsed < 160 && dist < 24) {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
      e.target.stopDrag();
      if (!isMonster && !isCondition && onClaimToken) {
        onClaimToken(token.id);
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
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
    }
    const wasDragging = isCurrentlyDraggingRef.current;
    isCurrentlyDraggingRef.current = false;
    isHoldMetRef.current = false;
    pointerDownTimeRef.current = 0;

    const container = e.target.getStage()?.container();
    if (container) {
      container.style.cursor = canDrag ? 'grab' : 'default';
    }

    if (!wasDragging) {
      // Aborted drag from quick click - restore position to original token position
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
        opacity: token.auraOpacity ?? 0.35,
        pulse: token.auraPulse,
        name: token.auraName || 'Magical Aura'
      });
    }
    return list;
  }, [token.auras, token.auraRadius, token.auraColor, token.auraOpacity, token.auraPulse, token.auraName]);

  return (
    <Group
      ref={groupRef}
      x={token.x}
      y={token.y}
      name="token"
      draggable={!isCondition && canDrag}
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
          pointerDownTimeRef.current = Date.now();
          pointerDownPosRef.current = {
            x: e.evt?.clientX ?? 0,
            y: e.evt?.clientY ?? 0
          };
          isHoldMetRef.current = false;
          if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
          }
          holdTimerRef.current = setTimeout(() => {
            isHoldMetRef.current = true;
          }, 160);
        }
      }}
      onTouchStart={(e: any) => {
        if (!isCondition) {
          // If 2 or more touches on screen, do not swallow - let Stage handle multi-touch pinch-to-zoom!
          if (e.evt?.touches && e.evt.touches.length >= 2) {
            if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
            if (groupRef.current?.isDragging()) groupRef.current.stopDrag();
            return;
          }
          e.cancelBubble = true;
          pointerDownTimeRef.current = Date.now();
          const t0 = e.evt?.touches?.[0];
          pointerDownPosRef.current = {
            x: t0?.clientX ?? 0,
            y: t0?.clientY ?? 0
          };
          isHoldMetRef.current = false;
          if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
          }
          holdTimerRef.current = setTimeout(() => {
            isHoldMetRef.current = true;
          }, 160);
        }
      }}
      onMouseUp={() => {
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current);
        }
        if (groupRef.current?.isDragging()) {
          groupRef.current.stopDrag();
        }
      }}
      onTouchEnd={() => {
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current);
        }
        if (groupRef.current?.isDragging()) {
          groupRef.current.stopDrag();
        }
      }}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onClick={(e: any) => {
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current);
        }
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
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current);
        }
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
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current);
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

      {/* 0. Token Magical Auras (Rendered beneath avatar so token stays solid and sharp) */}
      {activeAuras.map((aura, idx) => {
        const auraFt = aura.radius || 10;
        const auraPixelRadius = radius + (auraFt / 5) * gridSize;
        const col = aura.color || 'rgba(234, 179, 8, 0.4)';
        const op = aura.opacity ?? 0.35;

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
        stroke={isCondition ? '#ef4444' : isClaimed ? '#10b981' : isAlly ? '#eab308' : token.isPlayer ? '#38bdf8' : '#ef4444'}
        strokeWidth={isClaimed ? 3.5 : isAlly ? 3 : 2.5}
        shadowColor={isClaimed ? '#10b981' : isAlly ? '#eab308' : undefined}
        shadowBlur={isClaimed ? 8 : isAlly ? 6 : 0}
        shadowForStrokeEnabled={false}
        perfectDrawEnabled={false}
        listening={false}
      />

      {/* 3. AC Shield Badge on Top-Left: REMOVED per user request */}

      {/* 4. Large, High-Contrast HP Pill Badge directly tied to D&D Beyond & Character Sheet (PLAYERS & ALLIES ONLY - Monsters & Condition tokens NEVER show HP in player view) */}
      {!isCondition && (!isMonster || isAlly) && (
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
          text={token.name}
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
    prevProps.isTargetingActive === nextProps.isTargetingActive
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

  if (matchedChar && Array.isArray(matchedChar.spells) && matchedChar.spells.length > 0) {
    matchedChar.spells.forEach((spName, idx) => {
      const lower = spName.toLowerCase();
      const isHeal = lower.includes('cure') || lower.includes('heal');
      const isCantrip = lower.includes('blast') || lower.includes('bolt') || lower.includes('mockery') || lower.includes('flame');
      spells.push({
        id: `char-spell-${idx}`,
        name: spName,
        category: 'spells',
        type: 'action',
        subCategory: 'spell',
        level: isCantrip ? 0 : 1,
        school: 'evocation',
        castingTime: lower.includes('healing word') || lower.includes('mark') || lower.includes('hex') || lower.includes('misty step') ? '1 Bonus Action' : '1 Action',
        damageFormula: isHeal ? '1d8 + 3' : isCantrip ? '1d10' : undefined,
        isHeal,
        description: `Cast ${spName}.`,
        rangeFt: isHeal ? 30 : 60,
        jb2aAssetId: isHeal ? 'cure_wounds' : lower.includes('eldritch') ? 'eldritch_blast' : 'fire_bolt'
      });
    });
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

  return {
    id: token.id,
    ddbCharacterId: ddbId ? String(ddbId) : undefined,
    isLiveSynced: false,
    name,
    avatarUrl,
    race: matchedChar?.race || 'Adventurer',
    classLevel: matchedChar?.classLevel || 'Level 5 Hero',
    totalLevel: 5,
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
    spellSlots: spells.length > 0 ? {
      1: { level: 1, total: 4, used: 0, available: 4 },
      2: { level: 2, total: 3, used: 0, available: 3 }
    } : {},
    resources: [],
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

  // Dynamic JB2A Animated Spell & Visual Effects State
  const [effects, setEffects] = useState<VttEffectInstance[]>([]);
  const [activeEquippedAsset, setActiveEquippedAsset] = useState<Jb2aAssetDefinition | null>(null);
  const [aimOrigin, setAimOrigin] = useState<{ x: number; y: number } | null>(null);
  const [aimCurrent, setAimCurrent] = useState<{ x: number; y: number } | null>(null);
  const [showEffectsDrawer, setShowEffectsDrawer] = useState<boolean>(false);

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
        return (t.name || '').trim().toLowerCase() === savedName;
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

  const claimedStats = useMemo(() => {
    if (!claimedToken) return null;
    return resolveTokenCharacterStats(claimedToken, compendiumCharacters);
  }, [claimedToken, compendiumCharacters]);

  // Resolve D&D Beyond Character ID for the currently claimed/selected token
  const resolvedClaimedDdbId = useMemo<string | null>(() => {
    if (!claimedToken) return null;
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

  const syncHudFromDdb = useCallback(async (forceRefresh = false) => {
    if (!claimedToken) {
      setHudCharacterData(null);
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
            setHudCharacterData({
              ...data,
              avatarUrl: claimedToken.url || claimedToken.avatarUrl || data.avatarUrl || getCharacterTokenUrl(data.name)
            });
            if (forceRefresh) {
              toast.success(`Synced ${data.name} from D&D Beyond!`, {
                description: `${(data.attacks || []).length} Attacks • ${(data.bonusActions || []).length} Bonus • ${(data.spells || []).length} Spells`
              });
            }
            return;
          }
        }
      }

      setHudCharacterData(buildFallbackHudData(claimedToken, claimedStats, compendiumCharacters));
    } catch (err) {
      console.warn('[PlayerView] Failed fetching DDB HUD data:', err);
      setHudCharacterData(buildFallbackHudData(claimedToken, claimedStats, compendiumCharacters));
    } finally {
      setIsSyncingHudDdb(false);
    }
  }, [claimedToken, resolvedClaimedDdbId, claimedStats, compendiumCharacters]);

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
      return buildFallbackHudData(claimedToken, claimedStats, compendiumCharacters);
    });
    syncHudFromDdb(false);
  }, [claimedToken?.id, claimedToken?.name, resolvedClaimedDdbId]);

  // 3D Dice Customization State (persisted in localStorage)
  const [dicePresetId, setDicePresetId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'amber_gold';
    return localStorage.getItem('mistwalker_player_dice_preset') || 'amber_gold';
  });
  const [showDicePaletteModal, setShowDicePaletteModal] = useState<boolean>(false);

  const selectedDicePreset = useMemo<DiceColorPreset>(() => {
    return DICE_COLOR_PRESETS.find(p => p.id === dicePresetId) || DICE_COLOR_PRESETS[0];
  }, [dicePresetId]);

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

  // Player view turn order list visibility (with persistent user preference)
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

  // Web Audio procedural sub-bass impact thump on critical hit
  const playCriticalHitSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(25, ctx.currentTime + 0.45);
      gain.gain.setValueAtTime(0.7, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // AudioContext policy fallback
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

    // 3b. SYNC_SHAKE (Critical Hit Camera Rumble)
    socket.on('SYNC_SHAKE', () => {
      setIsShaking(true);
      playCriticalHitSound();
      setTimeout(() => setIsShaking(false), 600);
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

      // 3. Update active Hero Dock if claimed character matches
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
          tokensRef.current = normalized;
          return normalized;
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
    setActiveTokenMenu(null);
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
    setActiveTokenMenu(null);
    if (claimedTokenIdRef.current !== token.id) {
      claimedTokenIdRef.current = token.id;
      setClaimedTokenId(token.id);
    }
    if (typeof window !== 'undefined') {
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
    }, 150);
  }, []);

  // Global pointerup/touchend capture listener to ensure dragging ALWAYS releases cleanly
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

      if (activeDraggingTokenIdRef.current || isDraggingToken) {
        setIsDraggingToken(false);
        setTokenDragState(null);
        activeDraggingTokenIdRef.current = null;
      }
    };

    window.addEventListener('mouseup', handleGlobalPointerUp, { capture: true });
    window.addEventListener('touchend', handleGlobalPointerUp, { capture: true });
    window.addEventListener('touchcancel', handleGlobalPointerUp, { capture: true });

    return () => {
      window.removeEventListener('mouseup', handleGlobalPointerUp, { capture: true });
      window.removeEventListener('touchend', handleGlobalPointerUp, { capture: true });
      window.removeEventListener('touchcancel', handleGlobalPointerUp, { capture: true });
    };
  }, [isDraggingToken]);

  // Open right-click context menu for tokens (PLAYERS ONLY - Monsters & Condition tokens NEVER show context menu or HP in player view)
  const handleOpenTokenContextMenu = useCallback((id: string, clientX: number, clientY: number) => {
    const target = tokensRef.current.find(t => t.id === id);
    if (!target || target.isCondition) return;
    const isAlly = target.category === 'ally' || !!(target as any).allyId;
    const isMonster = !isAlly && (isMonsterToken(target) || target.isMonster === true || target.category === 'monster' || target.isPlayer === false);
    if (isMonster) return;
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
    setActiveTokenMenu(null);
    if (socketRef.current?.connected) {
      socketRef.current.emit('DELETE_TOKEN', { id });
    }
  }, []);



  // Arrow-Key & WASD Movement for Seized Token + Escape key handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Escape key to close modals/menus
      if (e.key === 'Escape') {
        setActiveTokenMenu(null);
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
  const castSpellAt = useCallback((origin: { x: number; y: number }, target: { x: number; y: number }) => {
    if (!activeEquippedAsset) return;

    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const dist = Math.hypot(dx, dy);
    const rotation = Math.atan2(dy, dx) * (180 / Math.PI);
    const isTrajectory = (activeEquippedAsset.paradigm === 'projectile' || activeEquippedAsset.paradigm === 'ray') ||
                         (Boolean(activeEquippedAsset.projectileWebm) && dist > 25);
    const isPointAoe = activeEquippedAsset.paradigm === 'point' || activeEquippedAsset.paradigm === 'aura';

    const newEffect: VttEffectInstance = {
      id: `eff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: activeEquippedAsset.name,
      label: activeEquippedAsset.label,
      assetKey: activeEquippedAsset.id,
      videoUrl: (isTrajectory && activeEquippedAsset.projectileWebm)
        ? activeEquippedAsset.projectileWebm
        : activeEquippedAsset.webm,
      loopVideoUrl: activeEquippedAsset.loopWebm,
      thumbUrl: activeEquippedAsset.thumb,
      paradigm: isTrajectory ? 'projectile' : activeEquippedAsset.paradigm,
      x: isTrajectory ? origin.x : (isPointAoe ? target.x : origin.x),
      y: isTrajectory ? origin.y : (isPointAoe ? target.y : origin.y),
      originX: origin.x,
      originY: origin.y,
      targetX: target.x,
      targetY: target.y,
      sizeFt: activeEquippedAsset.defaultSizeFt,
      rotation: (activeEquippedAsset.paradigm === 'cone' || activeEquippedAsset.paradigm === 'line') ? rotation : 0,
      opacity: 1.0,
      blendMode: activeEquippedAsset.blendMode,
      isPersistent: activeEquippedAsset.isPersistent,
      loop: activeEquippedAsset.isPersistent,
      castTime: Date.now(),
      durationMs: isTrajectory ? 2500 : 5000,
      soundKey: activeEquippedAsset.soundKey,
      color: activeEquippedAsset.color,
      trajectory: isTrajectory ? {
        startX: origin.x,
        startY: origin.y,
        endX: target.x,
        endY: target.y,
        speedPxSec: 1400,
        burstOnImpact: true,
        burstVideoUrl: activeEquippedAsset.burstWebm || activeEquippedAsset.webm,
        burstSoundKey: activeEquippedAsset.soundKey
      } : undefined
    };

    setEffects(prev => [...prev, newEffect]);
    if (activeEquippedAsset.soundKey) soundCatalog.play(activeEquippedAsset.soundKey);
    if (socketRef.current?.connected) {
      socketRef.current.emit('EFFECT_SPAWN', newEffect);
    }
    toast.success(`Cast ${activeEquippedAsset.name}!`);

    setAimOrigin(null);
    setAimCurrent(null);
    setActiveEquippedAsset(null);
    setActiveTargetingAction(null);
  }, [activeEquippedAsset]);

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
      posX = claimedToken.x + (gridSize / 2);
      posY = claimedToken.y + (gridSize / 2);
    }

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
      castTime: Date.now(),
      durationMs: 5000,
      soundKey: asset.soundKey,
      color: asset.color
    };

    setEffects(prev => [...prev, newEffect]);
    if (asset.soundKey) soundCatalog.play(asset.soundKey);
    if (socketRef.current?.connected) {
      socketRef.current.emit('EFFECT_SPAWN', newEffect);
    }
    toast.success(`Cast ${asset.name}!`, {
      description: `${asset.defaultSizeFt}ft ${asset.shape} placed at character position.`
    });
  }, [claimedToken, targetMapW, targetMapH, gridSize]);

  const handleClearEffects = useCallback(() => {
    setEffects([]);
    if (socketRef.current?.connected) {
      socketRef.current.emit('EFFECT_CLEAR_ALL');
    }
  }, []);

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
    toast.success(
      mode === 'tv_table'
        ? 'Digital TV Table Mode active: Clean battlemap presentation.'
        : 'Remote Player Mode active: D&D Beyond Tactical HUD ready.'
    );
  }, []);

  const handleSelectHudAction = useCallback((action: HudActionItem) => {
    if (activeTargetingAction?.id === action.id) {
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

    // Immediate execution for Self-Targeted Actions / Bonus Actions (e.g., Rage, Large Form, Second Wind, Dash, Dodge, Disengage)
    if (action.isSelfAction && claimedToken) {
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
          castTime: Date.now(),
          durationMs: 4000,
          soundKey: matchedAsset.soundKey,
          color: matchedAsset.color
        };
        setEffects(prev => [...prev, newEffect]);
        if (matchedAsset.soundKey) soundCatalog.play(matchedAsset.soundKey);
        if (socketRef.current?.connected) {
          socketRef.current.emit('EFFECT_SPAWN', newEffect);
        }
      }

      if (action.damageFormula) {
        const rollParts = action.damageFormula.match(/(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?/i);
        let rolledTotal = 0;
        const diceResults: Array<{ sides: number; result: number; type: string }> = [];
        if (rollParts) {
          const numDice = parseInt(rollParts[1], 10) || 1;
          const sides = parseInt(rollParts[2], 10) || 6;
          const sign = rollParts[3] === '-' ? -1 : 1;
          const mod = parseInt(rollParts[4], 10) || 0;
          let diceSum = 0;
          for (let i = 0; i < numDice; i++) {
            const r = Math.floor(Math.random() * sides) + 1;
            diceSum += r;
            diceResults.push({ sides, result: r, type: `d${sides}` });
          }
          rolledTotal = Math.max(1, diceSum + sign * mod);
        } else {
          rolledTotal = parseInt(action.damageFormula, 10) || 0;
        }

        if (typeof window !== 'undefined' && (window as any).__mistwalkerRoll3d && diceResults.length > 0) {
          (window as any).__mistwalkerRoll3d({
            id: `roll-${Date.now()}`,
            characterName: claimedToken.name || 'Hero',
            action: `${action.name}${action.isHeal ? ' (Self Heal)' : ''}`,
            rollType: action.isHeal ? 'heal' : 'roll',
            formula: action.damageFormula,
            diceNotation: action.damageFormula,
            dice: diceResults,
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

        toast.success(`${claimedToken.name}: ${action.name}!`, {
          description: action.isHeal ? `Restored +${rolledTotal} HP (${action.damageFormula})` : `Rolled ${rolledTotal} (${action.damageFormula})`
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
  }, [activeTargetingAction, claimedToken, gridSize, selectedDicePreset]);

  const handleTargetToken = useCallback((targetToken: Token) => {
    if (!activeTargetingAction) return;
    const action = activeTargetingAction;
    const caster = claimedToken;
    if (!caster) {
      toast.warning('Claim a character first before executing actions.');
      return;
    }

    // 1. Calculate distance on battlemap grid
    const cRadius = ((caster.size || 1) * gridSize) / 2;
    const tRadius = ((targetToken.size || 1) * gridSize) / 2;
    const casterCenter = { x: caster.x + cRadius, y: caster.y + cRadius };
    const targetCenter = { x: targetToken.x + tRadius, y: targetToken.y + tRadius };
    const distPx = Math.hypot(targetCenter.x - casterCenter.x, targetCenter.y - casterCenter.y);
    const distFt = Math.round((distPx / gridSize) * 5);

    if (action.rangeFt && action.rangeFt > 0 && distFt > action.rangeFt + 2) {
      toast.error(`Out of range! Target is ${distFt} ft away (Max range: ${action.rangeFt} ft).`);
      return;
    }

    // 2. Play JB2A Spell Animation & Sound
    if (activeEquippedAsset) {
      castSpellAt(casterCenter, targetCenter);
    } else if (action.jb2aAssetId) {
      const asset = JB2A_REGISTRY.find(a => a.id === action.jb2aAssetId);
      if (asset) {
        const isTrajectory = (asset.paradigm === 'projectile' || asset.paradigm === 'ray') || Boolean(asset.projectileWebm);
        const newEffect: VttEffectInstance = {
          id: `eff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: asset.name,
          label: asset.label,
          assetKey: asset.id,
          videoUrl: (isTrajectory && asset.projectileWebm) ? asset.projectileWebm : asset.webm,
          thumbUrl: asset.thumb,
          paradigm: isTrajectory ? 'projectile' : asset.paradigm,
          x: isTrajectory ? casterCenter.x : targetCenter.x,
          y: isTrajectory ? casterCenter.y : targetCenter.y,
          originX: casterCenter.x,
          originY: casterCenter.y,
          targetX: targetCenter.x,
          targetY: targetCenter.y,
          sizeFt: asset.defaultSizeFt,
          rotation: Math.atan2(targetCenter.y - casterCenter.y, targetCenter.x - casterCenter.x) * (180 / Math.PI),
          opacity: 1.0,
          blendMode: asset.blendMode,
          isPersistent: asset.isPersistent,
          loop: asset.isPersistent,
          castTime: Date.now(),
          durationMs: isTrajectory ? 2500 : 5000,
          soundKey: asset.soundKey,
          color: asset.color
        };
        setEffects(prev => [...prev, newEffect]);
        if (asset.soundKey) soundCatalog.play(asset.soundKey);
        if (socketRef.current?.connected) {
          socketRef.current.emit('EFFECT_SPAWN', newEffect);
        }
      }
    }

    // 3. Roll 3D Physics Dice if action has damageFormula or hitBonus
    let calculatedDeltaHp = 0;
    if (action.damageFormula) {
      const rollParts = action.damageFormula.match(/(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?/i);
      let rolledTotal = 0;
      const diceResults: Array<{ sides: number; result: number; type: string }> = [];
      if (rollParts) {
        const numDice = parseInt(rollParts[1], 10) || 1;
        const sides = parseInt(rollParts[2], 10) || 6;
        const sign = rollParts[3] === '-' ? -1 : 1;
        const mod = parseInt(rollParts[4], 10) || 0;
        let diceSum = 0;
        for (let i = 0; i < numDice; i++) {
          const r = Math.floor(Math.random() * sides) + 1;
          diceSum += r;
          diceResults.push({ sides, result: r, type: `d${sides}` });
        }
        rolledTotal = Math.max(1, diceSum + (sign * mod));
      } else {
        rolledTotal = Math.floor(Math.random() * 8) + 3;
      }

      calculatedDeltaHp = action.isHeal ? rolledTotal : -rolledTotal;

      // Trigger 3D dice physics
      if (typeof window !== 'undefined' && (window as any).__mistwalkerRoll3d) {
        (window as any).__mistwalkerRoll3d({
          id: `roll-${Date.now()}`,
          characterName: caster.name || 'Hero',
          action: `${action.name} (${action.isHeal ? 'Healing' : 'Damage'})`,
          rollType: action.isHeal ? 'heal' : 'damage',
          formula: action.damageFormula,
          diceNotation: action.damageFormula,
          dice: diceResults.length > 0 ? diceResults : [{ sides: 20, result: 15, type: 'd20' }],
          total: Math.abs(calculatedDeltaHp),
          isCritical: false,
          isFumble: false,
          theme: selectedDicePreset.id,
          themeColor: selectedDicePreset.theme.primaryColor,
          timestamp: Date.now(),
          source: 'player'
        });
      }
    }

    // 4. Emit REQUEST_TOKEN_MUTATION
    const isTargetOtherPlayer = targetToken.isPlayer && targetToken.id !== caster.id;
    const payload = {
      sourceTokenId: caster.id,
      sourceName: caster.name || 'Hero',
      targetTokenId: targetToken.id,
      targetName: targetToken.name || 'Target',
      actionName: action.name,
      deltaHp: calculatedDeltaHp,
      requiresApproval: isTargetOtherPlayer,
      requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    };

    if (socketRef.current?.connected) {
      socketRef.current.emit('REQUEST_TOKEN_MUTATION', payload);
    }

    toast.success(`${action.name} executed on ${targetToken.name}!`, {
      description: calculatedDeltaHp !== 0
        ? `${calculatedDeltaHp > 0 ? '+' : ''}${calculatedDeltaHp} HP`
        : 'Action delivered.'
    });

    // Reset targeting state
    setActiveTargetingAction(null);
    setActiveEquippedAsset(null);
    setAimOrigin(null);
    setAimCurrent(null);
  }, [activeTargetingAction, claimedToken, gridSize, activeEquippedAsset, selectedDicePreset, castSpellAt]);

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
    if (!activeEquippedAsset) return;
    if (e.evt?.button === 2) {
      setActiveEquippedAsset(null);
      setActiveTargetingAction(null);
      setAimOrigin(null);
      setAimCurrent(null);
      return;
    }
    const stage = e.target.getStage();
    if (!stage) return;
    const point = getStageRelativePointerPosition(stage);
    if (!point) return;

    // Point AoE spells (Fireball, Fog Cloud, Web, Darkness, etc.) drop immediately on click!
    if (activeEquippedAsset.paradigm === 'point' || activeEquippedAsset.shape === 'circle' || activeEquippedAsset.paradigm === 'aura') {
      castSpellAt(point, point);
      return;
    }

    // If we already have an aimOrigin set (e.g. from claimedToken or previous click), clicking casts towards this target!
    if (aimOrigin) {
      const dx = point.x - aimOrigin.x;
      const dy = point.y - aimOrigin.y;
      if (Math.hypot(dx, dy) > 20) {
        castSpellAt(aimOrigin, point);
        return;
      }
    }

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

    if (activeEquippedAsset && touches && touches.length === 1) {
      handleStageMouseDown(e);
    }
  }, [activeEquippedAsset]);

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
                              setShowClaimMenu(true);
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
                          setShowClaimMenu(true);
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

                    {/* Quick 3D Physics Dice Roller */}
                    <button
                      onClick={handleQuickRollDice}
                      className={`w-full flex items-center rounded-xl transition-all cursor-pointer border bg-zinc-900/80 hover:bg-zinc-900 hover:border-amber-500/50 text-zinc-300 hover:text-amber-300 border-zinc-800 group ${
                        isFull ? 'px-2.5 py-2 gap-2 text-xs font-medium' : 'p-2.5 justify-center'
                      }`}
                      title="Roll 3D Physics d20"
                    >
                      <Dices className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform shrink-0" />
                      {isFull && <span>Roll 3D Dice</span>}
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

        {/* Layer 5: Tokens Layer (Rendered on top of fog so token opacity is 100% solid, while monsters in fog are filtered out) */}
        <Layer>
          {tokens
            .filter(isTokenVisibleToPlayer)
            .map((token) => (
              <PlayerToken
                key={token.id}
                token={token}
                gridSize={gridSize}
                stageScale={stageScale}
                characters={compendiumCharacters}
                combatants={combatState.combatants}
                isClaimed={claimedTokenId === token.id}
                canDrag={stationMode === 'tv_table' ? true : claimedTokenId === token.id}
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

        {/* Dynamic JB2A Reticle Layer (Targeting Preview while Aiming) */}
        {activeEquippedAsset && aimOrigin && aimCurrent && (
          <Layer listening={false}>
            <AimReticle
              asset={activeEquippedAsset}
              origin={aimOrigin}
              current={aimCurrent}
              gridSize={gridSize}
              stageScale={stageScale}
            />
          </Layer>
        )}
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

        const menuX = Math.max(16, Math.min(activeTokenMenu.x, window.innerWidth - 300));
        const menuY = Math.max(16, Math.min(activeTokenMenu.y, window.innerHeight - 440));
        const isCurrentClaimed = claimedTokenId === currentToken.id;

        return (
          <div 
            id="player-token-context-menu"
            className="fixed z-[300] bg-zinc-950/95 backdrop-blur-xl border border-zinc-700/80 rounded-xl shadow-2xl p-3.5 w-72 animate-in fade-in zoom-in-95 select-none"
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
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div
                        className="w-4 h-4 rounded-full border border-white/50 shrink-0 shadow-sm"
                        style={{ backgroundColor: currentToken.auraColor || 'rgba(234, 179, 8, 0.5)' }}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-bold text-indigo-200 truncate">
                          {currentToken.auraName || 'Magical Aura'}
                        </span>
                        <span className="text-[9px] font-mono text-indigo-400">
                          Radius: {currentToken.auraRadius || 10} ft
                        </span>
                      </div>
                    </div>
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
                          onClick={() => {
                            handleUpdateToken(currentToken.id, {
                              auraRadius: preset.radius,
                              auraColor: preset.color,
                              auraName: preset.name,
                              auraOpacity: preset.opacity || 0.35
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
                              auraName: currentToken.auraName || 'Custom Aura',
                              auraOpacity: currentToken.auraOpacity ?? customAuraOpacityInput
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
      {activeTokenMenu && (
        <div 
          className="fixed inset-0 z-[299]" 
          onClick={() => setActiveTokenMenu(null)}
          onContextMenu={(e) => { e.preventDefault(); setActiveTokenMenu(null); }}
        />
      )}



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

      {/* ========================================================= */}
      {/* D&D Beyond Tactical Character HUD (Synced to DDB)         */}
      {/* ========================================================= */}
      {(stationMode === 'remote_player' || Boolean(claimedToken)) && !isUiMinimized && (
        <PlayerHeroDock
          characterData={hudCharacterData}
          claimedToken={claimedToken}
          onSelectAction={handleSelectHudAction}
          activeTargetingAction={activeTargetingAction}
          activeEquippedAsset={activeEquippedAsset}
          onCancelTargeting={() => {
            setActiveTargetingAction(null);
            setActiveEquippedAsset(null);
            setAimOrigin(null);
            setAimCurrent(null);
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
          onRefreshDdb={() => syncHudFromDdb(true)}
          isSyncingDdb={isSyncingHudDdb}
        />
      )}

      {/* ========================================================= */}
      {/* Player Station Mode Modal (Digital TV Table / Remote)     */}
      {/* ========================================================= */}
      <PlayerStationModal
        isOpen={showStationModal}
        onSelectStation={handleSelectStationMode}
        characterName={claimedToken?.name}
      />

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

      {/* Toast Notification Container for Player View */}
      <Toaster position="bottom-right" theme="dark" richColors />
    </div>
  );
}
