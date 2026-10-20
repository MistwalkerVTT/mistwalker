import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Upload,
  BookOpen,
  Sliders,
  HelpCircle,
  AlertCircle,
  Trash2,
  Hand,
  Waves,
  X,
  MousePointer,
  Check,
  Edit2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Book,
  SquareIcon,
  Volume2,
  Sparkles,
  Scan,
  Users,
  Flame,
  Undo2
} from 'lucide-react';
import { Stage, Layer, Image as KonvaImage, Rect, Circle, Line, Text, Group, Wedge } from 'react-konva';
import useImage from 'use-image';
import 'gifler';
import { generateDescription, chatWithLore, generateTTS, chatWithAutoDM, checkActionRules, generateVoiceScript, checkApiKeyStatus } from './services/aiService';
import { audioNarration, NARRATION_VOICES, getNarrationVoice } from './services/audioNarrationService';
import MapGenerator from './components/MapGenerator';
import { ApiKeyModal } from './components/ApiKeyModal';
import { SettingsModal } from './components/SettingsModal';
import { CombatTracker } from './components/CombatTracker';
import { LeftSidebar } from './components/LeftSidebar';
import { AnimatedMapOverlay, AnimatedFeaturesKonvaImage } from './components/AnimatedMapOverlay';
import { DiceTableOverlay } from './components/DiceTableOverlay';
import { DdbDiceRollEvent } from './types/dice';
import { EffectContextMenu, ContextMenuData } from './components/EffectContextMenu';
import {
  VttEffectInstance,
  Jb2aAssetDefinition,
  DomEffectOverlay,
  AimReticle,
  videoCacheManager,
  soundCatalog
} from './effects';
import { CampaignBuilderModal } from './components/CampaignBuilderModal';
import { SaveToCampaignModal } from './components/SaveToCampaignModal';
import { LoadCampaignModal } from './components/LoadCampaignModal';
import { MainCampaignBar } from './components/MainCampaignBar';
import { DndChatbotModal } from './components/DndChatbotModal';
import { MonsterCompendiumModal } from './components/MonsterCompendiumModal';
import { CharacterCompendiumModal } from './components/CharacterCompendiumModal';
import { AlliesCompendiumModal } from './components/AlliesCompendiumModal';
import { DashboardHomeHub } from './components/DashboardHomeHub';
import { DdbSyncModal } from './components/DdbSyncModal';
import {
  isUniversalVttFile,
  parseUniversalVtt,
  exportUniversalVtt,
  downloadUniversalVttFile
} from './services/universalVttService';
import { DEFAULT_MONSTERS } from './data/defaultMonsters';
import { repairMonsterToken } from './data/srdMonstersCatalog';
import { DEFAULT_CHARACTERS, getCharacterTokenUrl, resolveTokenCharacterStats, isDdbMatch } from './data/defaultCharacters';
import { DEFAULT_ALLIES } from './data/defaultAllies';
import { Monster, getSizeMultiplier } from './types/monster';
import { Character } from './types/character';
import { Ally } from './types/ally';
import {
  Campaign,
  Scene,
  SceneToken,
  ActiveSessionData,
  publishActiveSession,
  subscribeToActiveSession,
  subscribeToCampaigns,
  saveCampaignDoc,
  saveSceneToCampaign,
  UploadedAsset,
  subscribeToUploadedAssets,
  uploadAndRegisterAsset,
  deleteUploadedAsset,
  resolveMapSource,
  testImageAccessible,
  testMediaAccessible,
  subscribeToConnectionState,
  getIsFirebaseConnected,
  subscribeToQuotaState,
  saveMapZone,
  fetchMapZones,
  fetchZoneDetails,
  deleteMapZone,
  cleanupZonesExceptScene,
  subscribeToMonsters,
  subscribeToCharacters,
  subscribeToAllies,
  saveCharacter
} from './lib/firebase';
import { getImageNaturalDimensions, getVideoNaturalDimensions, isVideoAsset, getLocalAsset } from './lib/storageCache';
import { io } from 'socket.io-client';
import {
  Combatant,
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
  AURA_PRESETS,
  AURA_COLOR_PALETTE
} from './types';
import { PresetBattlemap } from './data/presetBattlemaps';
import { DynamicLightingLayer } from './components/DynamicLightingLayer';
import { WallEditorToolbar } from './components/WallEditorToolbar';
import { RoomHotspotLayer } from './components/RoomHotspotLayer';
import { RoomHotspotEditorModal } from './components/RoomHotspotEditorModal';
import { AssignPolygonRoomModal } from './components/AssignPolygonRoomModal';
import { ZoneDetailsSidePanel } from './components/ZoneDetailsSidePanel';
import { RoomBriefingDrawer } from './components/RoomBriefingDrawer';
import { GridLayer } from './components/GridLayer';
import { BugReportModal } from './components/BugReportModal';
import { BugReportManagerModal } from './components/BugReportManagerModal';
import { DEMO_GV_CAMPAIGN, DEMO_GV_SCENE, DEMO_GV_CHAPTER, DEMO_GV_ROOM_ZONES, DEMO_GV_TOKENS } from './data/demoCampaignGv';
import ReactMarkdown from 'react-markdown';
import { snapPointToGrid, findNearestWall, segmentsIntersect } from './lib/visionEngine';
import { Toaster, toast } from 'sonner';
import homeBackgroundImage from './assets/images/home_background.jpg';
import sceneBackdropImage from './assets/images/scene_backdrop.jpg';

const ZERO_POS = { x: 0, y: 0 };

interface RevealPoint {
  x: number;
  y: number;
  radius: number;
}

interface Token {
  id: string;
  name: string;
  url: string;
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
  allyId?: string;
  isCondition?: boolean;
  voice?: string;
  isPlayer?: boolean;
  isMonster?: boolean;
  category?: 'character' | 'monster' | 'ally' | 'custom';
  visionRadius?: number; // in feet (e.g. 30, 60, 120)
  visionAngle?: number; // cone angle in degrees (e.g. 360, 90, 60)
  visionDirection?: number; // facing angle in degrees
  visionEnabled?: boolean;
  visionColor?: string;
  hidden?: boolean;
  conditions?: string[];
  auraRadius?: number;
  auraColor?: string;
  auraOpacity?: number;
  auraName?: string;
  auraPulse?: boolean;
  auras?: any[];
}

interface RollResult {
  id: string;
  dice: string;
  results: number[];
  total: number;
  timestamp: number;
}

interface SyncState {
  reveals: RevealPoint[];
  polygonReveals: number[][];
  isFogVisible: boolean;
  stageScale: number;
  stagePos: { x: number; y: number };
  gridVisible: boolean;
  gridOpacity: number;
  gridSize: number;
  gridOffsetX: number;
  gridOffsetY: number;
  measureStart: { x: number; y: number } | null;
  measureEnd: { x: number; y: number } | null;
  measureType?: 'line' | 'square' | 'cone' | 'rectangle' | 'circle';
  tokens: Token[];
  walls?: WallSegment[];
  visionConfig?: VisionConfig;
  roomAnnotations?: RoomAnnotation[];
  force?: boolean;
  mapRotation?: number;
  combatants?: Combatant[];
  combatRound?: number;
  combatTurnIndex?: number;
  showCombatTracker?: boolean;
  animatedFeatures?: AnimatedFeature[];
  weatherEffect?: WeatherEffectType;
  animatedEnabled?: boolean;
}

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
      // Remove crossOrigin to allow loading even if CORS is not supported (will be tainted but Konva can still render it)
      img.onload = () => {
        if (isMounted && img.naturalWidth > 0 && img.naturalHeight > 0) {
          setImage(img);
        }
      };
      img.onerror = () => {
        if (isMounted) console.warn(`Failed to load image: ${src}`);
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

              // Ensure canvas dimensions are strictly non-zero before starting
              const targetW = Math.max(1, animator.width || props.width || 64);
              const targetH = Math.max(1, animator.height || props.height || 64);
              canvas.width = targetW;
              canvas.height = targetH;

              // Guard frame rendering against 0-dimension buffers
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
        } catch (e) {
          // ignore
        }
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

const TokenImage = React.memo(({
  token,
  gridSize,
  isPlayerView = false,
  isSelected,
  tool,
  isSpacePressed,
  combatants,
  characters,
  stageScale = 1,
  onClick,
  onDblClick,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDelete,
  onContextMenu,
  onMouseEnter,
  onMouseLeave
}: any) => {
  const isGif = token.url.toLowerCase().endsWith('.gif');
  const [image] = useImage(isGif ? null : token.url);
  const [isHovered, setIsHovered] = useState(false);

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

  const stats = useMemo(() => {
    const fromSheet = resolveTokenCharacterStats(token, characters);
    const defMonster = DEFAULT_MONSTERS.find(m => m.name.toLowerCase() === (token.name || '').toLowerCase());

    const isCharSheet = fromSheet.isFromCharacterSheet;
    const maxHp = isCharSheet && fromSheet.maxHp
      ? fromSheet.maxHp
      : (token.maxHp ?? matchedCombatant?.maxHp ?? defMonster?.hp ?? fromSheet.maxHp);
    const currentHp = isCharSheet && fromSheet.currentHp !== undefined
      ? fromSheet.currentHp
      : (token.currentHp ?? token.hp ?? (matchedCombatant?.currentHp ?? fromSheet.currentHp));
    const ac = isCharSheet && fromSheet.ac !== undefined
      ? fromSheet.ac
      : (token.ac ?? matchedCombatant?.ac ?? defMonster?.ac ?? fromSheet.ac);
    const tempHp = token.tempHp ?? fromSheet.tempHp ?? 0;
    const hpRatio = Math.max(0, Math.min(1, currentHp / Math.max(1, maxHp)));

    return {
      ac,
      currentHp,
      maxHp,
      tempHp,
      hpRatio,
      characterName: fromSheet.characterName
    };
  }, [token, characters, matchedCombatant]);

  const isAlly = token.category === 'ally' || !!(token as any).allyId;
  const isMonster = !isAlly && !token.isCondition && (isMonsterToken(token) || token.isMonster === true || token.category === 'monster' || token.isPlayer === false);
  const tokenWidth = gridSize * token.size;
  const radius = tokenWidth / 2;
  const hpColor = stats.hpRatio > 0.5 ? '#10b981' : stats.hpRatio > 0.25 ? '#f59e0b' : '#ef4444';

  // Responsive zoom-compensated sizing so HP text is bold and readable across the room at any zoom
  const effectiveScale = Math.max(0.25, Math.min(2.5, stageScale || 1));
  const minScreenFontSize = 13.5;
  const zoomCompensatedFont = minScreenFontSize / Math.min(1, effectiveScale);
  const baseFontSize = Math.max(13, Math.round(tokenWidth * 0.20));
  const hpFontSize = Math.max(13, Math.min(26, Math.max(baseFontSize, Math.round(zoomCompensatedFont))));

  const minPillWidth = Math.max(76, Math.round(hpFontSize * 5.4));
  const pillWidth = Math.max(minPillWidth, Math.min(Math.round(tokenWidth * 1.1), Math.max(minPillWidth, 200)));
  const pillHeight = Math.round(hpFontSize * 1.6 + 6);
  const pillX = (tokenWidth - pillWidth) / 2;
  const pillY = tokenWidth - Math.round(pillHeight * 0.35);

  const barHeight = Math.max(4, Math.round(pillHeight * 0.18));
  const barY = Math.round(pillHeight - barHeight - 4.5);
  const barPadding = 4;
  const barWidth = pillWidth - (barPadding * 2);

  const nameY = (token.isCondition || (isPlayerView && isMonster))
    ? tokenWidth + 4
    : pillY + pillHeight + 3;
  const nameFontSize = Math.max(12, Math.min(20, Math.round(hpFontSize * 0.85)));

  const activeAuras = useMemo(() => {
    const list: any[] = [];
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
      x={token.x}
      y={token.y}
      name="token"
      draggable={!isSpacePressed}
      onMouseDown={(e) => {
        if (!isSpacePressed && e.evt?.button !== 2) {
          e.cancelBubble = true;
        }
      }}
      onTouchStart={(e) => {
        if (!isSpacePressed) {
          e.cancelBubble = true;
        }
      }}
      onClick={(e) => {
        if (isSpacePressed) return;
        e.cancelBubble = true;
        if (onClick) {
          onClick(e);
        }
      }}
      onTap={(e) => {
        if (isSpacePressed) return;
        e.cancelBubble = true;
        if (onClick) {
          onClick(e);
        }
      }}
      onDblClick={(e) => {
        e.cancelBubble = true;
        if (onDblClick) {
          onDblClick(e);
        }
      }}
      onDblTap={(e) => {
        e.cancelBubble = true;
        if (onDblClick) {
          onDblClick(e);
        }
      }}
      onDragStart={(e) => {
        e.cancelBubble = true;
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = 'move';
        if (onDragStart) {
          onDragStart(e);
        }
      }}
      onDragMove={(e) => {
        e.cancelBubble = true;
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = 'move';
        if (onDragMove) {
          onDragMove(e);
        }
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        const stage = e.target.getStage();
        if (stage) {
          stage.container().style.cursor = (isSpacePressed || tool === 'pan') ? 'grab' : tool === 'select' ? 'default' : 'crosshair';
        }
        if (onDragEnd) {
          onDragEnd(e);
        }
      }}
      onMouseEnter={(e) => {
        setIsHovered(true);
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = 'move';
        if (onMouseEnter) {
          onMouseEnter(e);
        }
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        const stage = e.target.getStage();
        if (stage) {
          stage.container().style.cursor = (isSpacePressed || tool === 'pan') ? 'grab' : tool === 'select' ? 'default' : 'crosshair';
        }
        if (onMouseLeave) {
          onMouseLeave(e);
        }
      }}
      onContextMenu={(e) => {
        e.evt.preventDefault();
        e.cancelBubble = true;
        onContextMenu(e);
      }}
    >
      {/* Solid hit target across entire token circle so transparent avatar pixels or border clicks never fall through to Stage */}
      <Circle
        x={radius}
        y={radius}
        radius={radius + 3}
        fill="rgba(0,0,0,0.001)"
        perfectDrawEnabled={false}
      />

      {/* 0. Token Magical Auras (Rendered beneath avatar clip so token stays solid and sharp) */}
      {activeAuras.map((aura: any, idx: number) => {
        const auraFt = aura.radius || 10;
        const auraPixelRadius = radius + (auraFt / 5) * gridSize;
        const col = aura.color || 'rgba(234, 179, 8, 0.4)';
        const op = aura.opacity ?? 0.35;

        return (
          <Group key={`dm-token-aura-${idx}`} listening={false}>
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

      {/* Selection Glow Indicator */}
      {isSelected && (
        <>
          <Circle
            x={radius}
            y={radius}
            radius={radius + 5}
            stroke="#f59e0b"
            strokeWidth={3}
            dash={[6, 3]}
            shadowColor="#f59e0b"
            shadowBlur={8}
            shadowOpacity={0.9}
            shadowForStrokeEnabled={false}
            perfectDrawEnabled={false}
            listening={false}
          />
          <Circle
            x={radius}
            y={radius}
            radius={radius + 8}
            stroke="#fbbf24"
            strokeWidth={1}
            opacity={0.6}
            perfectDrawEnabled={false}
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
        {isGif ? (
          <GifImage
            src={token.url}
            width={tokenWidth}
            height={tokenWidth}
          />
        ) : image && image.width > 0 && image.height > 0 ? (
          <KonvaImage
            image={image}
            width={tokenWidth}
            height={tokenWidth}
          />
        ) : (
          <Rect
            width={tokenWidth}
            height={tokenWidth}
            fill={token.isPlayer ? '#1e3a8a' : (token.category === 'ally' || (token as any).allyId) ? '#713f12' : '#7f1d1d'}
            perfectDrawEnabled={false}
          />
        )}
      </Group>

      {/* 2. Outer Circular Border Ring */}
      <Circle
        x={radius}
        y={radius}
        radius={radius}
        stroke={
          isSelected
            ? "#f59e0b"
            : token.isCondition
            ? "#ef4444"
            : (token.category === 'ally' || (token as any).allyId)
            ? "#eab308"
            : (isMonsterToken(token) || token.isMonster || token.category === 'monster' || token.isPlayer === false)
            ? "#f43f5e"
            : "#10b981"
        }
        strokeWidth={isSelected ? 3.5 : (token.category === 'ally' || (token as any).allyId) ? 3 : 2.5}
        shadowColor={isSelected ? "#f59e0b" : (token.category === 'ally' || (token as any).allyId) ? "#eab308" : undefined}
        shadowBlur={isSelected ? 8 : (token.category === 'ally' || (token as any).allyId) ? 6 : 0}
        shadowForStrokeEnabled={false}
        perfectDrawEnabled={false}
        listening={false}
      />

      {/* 3. AC Shield Badge on Top-Left */}
      {!token.isCondition && (!isPlayerView || !isMonster) && (
        <Group x={12} y={12}>
          <Circle
            radius={11}
            fill="#0f172a"
            stroke="#38bdf8"
            strokeWidth={1.5}
            perfectDrawEnabled={false}
          />
          <Text
            x={-11}
            y={-9}
            width={22}
            align="center"
            text="AC"
            fontSize={6}
            fontStyle="bold"
            fill="#38bdf8"
            perfectDrawEnabled={false}
          />
          <Text
            x={-11}
            y={-2}
            width={22}
            align="center"
            text={`${stats.ac}`}
            fontSize={10}
            fontStyle="bold"
            fill="#ffffff"
            perfectDrawEnabled={false}
          />
        </Group>
      )}

      {/* 4. Large, High-Contrast HP Pill Badge directly tied to D&D Beyond & Character Sheet (Monsters NEVER show HP in player view) */}
      {!token.isCondition && (!isPlayerView || !isMonster) && (
        <Group x={pillX} y={pillY}>
          {/* Dark slate container badge */}
          <Rect
            width={pillWidth}
            height={pillHeight}
            fill="rgba(15, 23, 42, 0.96)"
            stroke={isAlly ? "#eab308" : (stats.hpRatio <= 0.25 ? "#ef4444" : "#475569")}
            strokeWidth={isAlly ? 1.5 : (stats.hpRatio <= 0.25 ? 1.5 : 1)}
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
          {stats.hpRatio > 0 && (
            <Rect
              x={barPadding}
              y={barY}
              width={Math.max(2, barWidth * stats.hpRatio)}
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
            text={`${stats.currentHp}/${stats.maxHp}${stats.tempHp && stats.tempHp > 0 ? ` (+${stats.tempHp})` : ''}`}
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
          fontSize={nameFontSize}
          fontStyle={isSelected ? "bold" : "normal"}
          fill={isSelected ? "#fbbf24" : "white"}
          align="center"
          width={tokenWidth}
          shadowColor="#000000"
          shadowBlur={3}
          perfectDrawEnabled={false}
        />
        {mergedConditions.length > 0 && (
          <Text
            text={mergedConditions.join(', ')}
            fontSize={Math.max(9.5, nameFontSize - 2)}
            fontStyle="bold"
            fontFamily="monospace"
            fill="#f43f5e"
            align="center"
            width={tokenWidth}
            y={nameFontSize + 4}
            shadowColor="#000000"
            shadowBlur={3}
            perfectDrawEnabled={false}
          />
        )}
      </Group>
    </Group>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.token === nextProps.token &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.gridSize === nextProps.gridSize &&
    prevProps.tool === nextProps.tool &&
    prevProps.isSpacePressed === nextProps.isSpacePressed &&
    prevProps.combatants === nextProps.combatants &&
    prevProps.characters === nextProps.characters &&
    prevProps.stageScale === nextProps.stageScale
  );
});

const VOICES = NARRATION_VOICES;

export interface AvailableTokenItem {
  name: string;
  url: string;
  category: 'character' | 'monster' | 'ally';
  size?: number;
}

const AVAILABLE_TOKENS: AvailableTokenItem[] = [
  // Characters & Heroes
  { name: 'Varrak', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Varrak.png/:/rs=w:1440,h:1440', category: 'character', size: 1 },
  { name: 'Brannoc', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Brannoc.png/:/rs=w:1440,h:1440', category: 'character', size: 1 },
  { name: 'Aziza', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Aziza.png/:/rs=w:1440,h:1440', category: 'character', size: 1 },
  { name: 'Noctua', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Noctua.png/:/rs=w:1440,h:1440', category: 'character', size: 1 },
  { name: 'Aggie', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Aggie.png/:/rs=w:1440,h:1440', category: 'character', size: 1 },
  { name: 'Burmi', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Burmi.png/:/rs=w:1440,h:1440', category: 'character', size: 1 },
  { name: 'Rowan', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Rowan.png/:/rs=w:1440,h:1440', category: 'character', size: 1 },
  { name: 'Stavros', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/DwarfStavros.jpg/:/rs=w:1440,h:1440', category: 'character', size: 1 },
  { name: 'Mayo', url: 'https://i.ibb.co/nNm5TBg2/Mayo.gif', category: 'character', size: 1 },

  // Monsters & Foes
  { name: 'Goblin', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=300&q=80', category: 'monster', size: 1 },
  { name: 'Skeleton', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=300&q=80', category: 'monster', size: 1 },
  { name: 'Orc Warrior', url: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=300&q=80', category: 'monster', size: 1 },
  { name: 'Young Red Dragon', url: 'https://images.unsplash.com/photo-1577493340887-b7bdef030977?auto=format&fit=crop&w=300&q=80', category: 'monster', size: 2 },
  { name: 'Beholder', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&q=80', category: 'monster', size: 2 },
  { name: 'Mimic', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=300&q=80', category: 'monster', size: 1 },
  { name: 'Dire Wolf', url: 'https://images.unsplash.com/photo-1564865878688-9a244444042a?auto=format&fit=crop&w=300&q=80', category: 'monster', size: 2 },
  { name: 'Zombie', url: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=300&q=80', category: 'monster', size: 1 },
  { name: 'Mushu', url: 'https://i.ibb.co/tPQBm3DZ/Mushu.gif', category: 'monster', size: 1 },
  { name: 'Spiritual Weapon', url: 'https://i.ibb.co/b5hZS9HG/Spirit-Weapon.gif', category: 'ally', size: 1 },
];

const CONDITIONS = [
  { name: 'Poisoned', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/poisoned.png/:/rs=w:1440,h:1440' },
  { name: 'Prone', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/prone.png/:/rs=w:1440,h:1440' },
  { name: 'Unconscious', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/unconcious.png/:/rs=w:1440,h:1440' },
  { name: 'Grappled', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/grappled.png/:/rs=w:1440,h:1440' },
  { name: 'Paralyzed', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Paralyzed.png/:/rs=w:1440,h:1440' },
  { name: 'Frightened', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Frightened.png/:/rs=w:1440,h:1440' },
  { name: 'Petrified', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/petrified.png/:/rs=w:1440,h:1440' },
  { name: 'Deafened', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Deafened.png/:/rs=w:1440,h:1440' },
  { name: 'Charmed', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Charmed.png/:/rs=w:1440,h:1440' },
  { name: 'Bloodied', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Bloodied.png/:/rs=w:1440,h:1440' },
];

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



const getImageTransform = (width: number, height: number, rotation: number) => {
  switch (rotation % 360) {
    case 90: return { x: height, y: 0, rotation: 90 };
    case 180: return { x: width, y: height, rotation: 180 };
    case 270: return { x: 0, y: width, rotation: 270 };
    default: return { x: 0, y: 0, rotation: 0 };
  }
};

const loadDmBackupState = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('mistwalker_dm_state_backup_v1');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export default function App() {
  const initialDmBackupRef = useRef(loadDmBackupState());
  const initialDmBackup = initialDmBackupRef.current;

  // Detect whether a previous unsaved scene or crash recovery session exists
  const [unsavedSceneBackup, setUnsavedSceneBackup] = useState<any>(() => {
    if (typeof window === 'undefined') return null;
    const backup = loadDmBackupState();
    if (!backup) return null;
    const hasContent = Boolean(backup.imageFile || backup.activeSceneInfo?.mapUrl || (backup.tokens && backup.tokens.length > 0));
    if (!hasContent) return null;
    const crashDetected = localStorage.getItem('mistwalker_crash_detected') === 'true';
    const isUnsaved = backup.isSaved === false || backup.isSaved === undefined || crashDetected;
    return isUnsaved ? backup : null;
  });

  const [unsavedSceneBackupWasCrash, setUnsavedSceneBackupWasCrash] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('mistwalker_crash_detected') === 'true';
  });

  const isSceneSavedRef = useRef<boolean>(true);

  const socketRef = useRef<any>(null);
  const [socketInstance, setSocketInstance] = useState<any>(null);

  const [isReadingFile, setIsReadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeMapId, setActiveMapId] = useState<'DM1'|'DM2'|'DM3'>('DM1');
  const [liveMapId, setLiveMapId] = useState<'DM1'|'DM2'|'DM3'>('DM1');
  const activeMapIdRef = useRef<'DM1'|'DM2'|'DM3'>('DM1');
  const liveMapIdRef = useRef<'DM1'|'DM2'|'DM3'>('DM1');
  const isSwitchingMapSlotRef = useRef<boolean>(false);
  const lastSlotSwitchTimeRef = useRef<number>(0);
  const mapsDataRef = useRef<Record<string, any>>({
    DM1: null,
    DM2: null,
    DM3: null
  });
  const hasRestoredInitialSessionRef = useRef<boolean>(true);

  // MistWalker always loads directly onto the Home Screen Hub on app launch/refresh (imageFile = null)
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [mapType, setMapType] = useState<'image' | 'video'>('image');
  const [image, imageStatus] = useImage(mapType === 'image' ? (imageFile || '') : '');
  const broadcastState = useCallback((_force?: boolean) => {
    if (socketRef.current?.connected && imageFile && (activeMapIdRef.current === liveMapIdRef.current)) {
      socketRef.current.emit('SYNC_IMAGE', imageFile);
    }
  }, [imageFile]);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(getIsFirebaseConnected());

  useEffect(() => {
    const unsub = subscribeToConnectionState((connected) => {
      setIsFirebaseConnected(connected);
    });
    return () => unsub();
  }, []);
  const [fireballImg] = useImage('https://cdn.pixabay.com/animation/2024/06/15/20/34/20-34-39-5_512.gif', 'anonymous');
  const [spiritImg] = useImage('https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/spiritgaurdians.png/:/rs=w:1440,h:1440', 'anonymous');
  const [fireboltImg] = useImage('https://i.ibb.co/R44ks2yJ/firebolt-ezgif-com-optimize.gif', 'anonymous');
  const [beaconImg] = useImage('https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/beaconofhope.png/:/rs=w:1440,h:1440', 'anonymous');
  const [poisonImg] = useImage('https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/poison%20cloud.png/:/rs=w:1440,h:1440', 'anonymous');
  const [darknessImg] = useImage('https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/darkness.png/:/rs=w:1440,h:1440', 'anonymous');
  const [fogImg] = useImage('https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/fog%20cloud.png/:/rs=w:1440,h:1440', 'anonymous');
  const [coneOfColdImg] = useImage('https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/blob-5d541df.png/:/rs=w:1440,h:1440', 'anonymous');
  const [eldritchBlastImg] = useImage('https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/eldrichblast.png/:/rs=w:1440,h:1440', 'anonymous');
  
  const videoElement = useMemo(() => {
    if (mapType !== 'video' || !imageFile) return null;
    console.log('[Video] Initializing video element with source:', imageFile);
    const video = document.createElement('video');
    // Only set crossOrigin on remote external HTTP/HTTPS origins to avoid CORS failures on blob: or local URLs
    if (typeof imageFile === 'string' && imageFile.startsWith('http') && !imageFile.startsWith(window.location.origin)) {
      video.crossOrigin = 'anonymous';
    }
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', 'true');
    video.src = imageFile;
    video.load();
    video.onerror = (err) => {
      console.warn('[Video] Video element failed to load source:', err);
      if (video.crossOrigin) {
        // Retry without crossOrigin
        video.removeAttribute('crossorigin');
        video.src = imageFile;
        video.load();
      }
    };
    return video;
  }, [imageFile, mapType]);

  useEffect(() => {
    if (!videoElement) return;

    const playVideo = async () => {
      try {
        await videoElement.play();
        console.log('[Video] Playing successfully');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn("[Video] Play failed:", err);
        }
      }
    };

    playVideo();

    const handleCanPlay = () => {
      playVideo();
    };
    videoElement.addEventListener('canplay', handleCanPlay);
    videoElement.addEventListener('loadeddata', handleCanPlay);

    return () => {
      videoElement.removeEventListener('canplay', handleCanPlay);
      videoElement.removeEventListener('loadeddata', handleCanPlay);
      try {
        videoElement.pause();
        videoElement.src = '';
      } catch {
        // ignore
      }
    };
  }, [videoElement]);

  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (videoElement) {
      const handleLoadedMetadata = () => {
        const width = videoElement.videoWidth || 0;
        const height = videoElement.videoHeight || 0;
        if (width > 0 && height > 0) {
          console.log('[Video] Metadata loaded:', width, 'x', height);
          setVideoSize({ width, height });
        }
      };

      if (videoElement.readyState >= 1) {
        handleLoadedMetadata();
      } else {
        videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.addEventListener('canplay', handleLoadedMetadata);
      }
      
      return () => {
        videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.removeEventListener('canplay', handleLoadedMetadata);
      };
    }
  }, [videoElement]);

  // Animation frame for video updates
  const dmVideoLayerRef = useRef<any>(null);
  const playerVideoLayerRef = useRef<any>(null);

  useEffect(() => {
    if (videoElement) {
      let animId: number;
      const update = () => {
        if (dmVideoLayerRef.current) {
          dmVideoLayerRef.current.batchDraw();
        }
        if (playerVideoLayerRef.current) {
          playerVideoLayerRef.current.batchDraw();
        }
        animId = requestAnimationFrame(update);
      };
      animId = requestAnimationFrame(update);
      return () => cancelAnimationFrame(animId);
    }
  }, [videoElement]);

  const [reveals, setReveals] = useState<RevealPoint[]>([]);
  const [polygonReveals, setPolygonReveals] = useState<number[][]>([]);
  const [currentPolygonPoints, setCurrentPolygonPoints] = useState<number[]>([]);
  const [fogResetKey, setFogResetKey] = useState<number>(0);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [brushSize, setBrushSize] = useState(50);
  const [isFogVisible, setIsFogVisible] = useState<boolean>(true);
  const [tool, setToolState] = useState<string>('pan');

  // MistWalker 4.0 Effects Engine State
  const [effects, setEffects] = useState<VttEffectInstance[]>([]);
  const [activeEquippedAsset, setActiveEquippedAsset] = useState<Jb2aAssetDefinition | null>(null);
  const [aimOrigin, setAimOrigin] = useState<{ x: number; y: number } | null>(null);
  const [aimCurrent, setAimCurrent] = useState<{ x: number; y: number } | null>(null);

  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  const spacePanActiveRef = useRef<boolean>(false);
  const [isShiftPressed, setIsShiftPressed] = useState<boolean>(false);
  const shiftPanActiveRef = useRef<boolean>(false);
  const isAutoSwitchedFromPanRef = useRef<boolean>(false);
  const isHoveringTokenRef = useRef<boolean>(false);
  const isDraggingTokenRef = useRef<boolean>(false);
  const [isDraggingToken, setIsDraggingToken] = useState<boolean>(false);
  const hoverLeaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTokenMoveEmitTimeRef = useRef<number>(0);

  const setTool = useCallback((newToolOrFn: any) => {
    isAutoSwitchedFromPanRef.current = false;
    setToolState(newToolOrFn);
  }, []);

  const handleTokenHoverEnter = useCallback(() => {
    if (isSpacePressed) return;
    if (hoverLeaveTimeoutRef.current) {
      clearTimeout(hoverLeaveTimeoutRef.current);
      hoverLeaveTimeoutRef.current = null;
    }
    isHoveringTokenRef.current = true;
  }, [isSpacePressed]);

  const handleTokenHoverLeave = useCallback(() => {
    isHoveringTokenRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      if (hoverLeaveTimeoutRef.current) {
        clearTimeout(hoverLeaveTimeoutRef.current);
      }
    };
  }, []);

  // Dynamic Lighting & Walls State
  const [campaignMode, setCampaignMode] = useState<CampaignMode>('run');
  const [walls, setWalls] = useState<WallSegment[]>([]);
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const [wallDrawStart, setWallDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [wallEraseDragStart, setWallEraseDragStart] = useState<{ x: number; y: number } | null>(null);
  const [wallEraseDragCurrent, setWallEraseDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [activeWallType, setActiveWallType] = useState<WallType>('normal');
  const [activeDoorState, setActiveDoorState] = useState<DoorState>('closed');
  const [snapToGridWalls, setSnapToGridWalls] = useState<boolean>(false);
  const [visionConfig, setVisionConfig] = useState<VisionConfig>({
    enabled: true,
    explorationMemory: true,
    darknessOpacity: 1.0,
    dimVisionOpacity: 0.5,
    ambientLight: false,
    dmPreviewMode: false,
    showDoorBadges: false
  });
  const [selectedTokenIds, setSelectedTokenIds] = useState<string[]>([]);
  const [editingTokenNameId, setEditingTokenNameId] = useState<string | null>(null);
  const [editingTokenNameText, setEditingTokenNameText] = useState<string>('');

  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    active: boolean;
  } | null>(null);
  const dragStartPositionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const [activeMenu, setActiveMenu] = useState<'instant' | 'persistent' | 'aura' | 'tokens' | 'conditions' | 'combat' | 'dice' | 'music' | 'grid' | null>(null);
  
  // AI States
  const [aiDescribeRect, setAiDescribeRect] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  const [isAiDescribing, setIsAiDescribing] = useState(false);
  const [aiDescribeResult, setAiDescribeResult] = useState<string | null>(null);
  const [aiDescribeError, setAiDescribeError] = useState<string | null>(null);
  const [isAiDescribingLoading, setIsAiDescribingLoading] = useState(false);

  const [auraColor, setAuraColor] = useState<string>('rgba(59, 130, 246, 0.4)');
  const [measureStart, setMeasureStart] = useState<{ x: number, y: number } | null>(null);
  const [measureEnd, setMeasureEnd] = useState<{ x: number, y: number } | null>(null);
  const [measureType, setMeasureType] = useState<'line' | 'square' | 'cone' | 'rectangle' | 'circle'>('line');
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [effectContextMenu, setEffectContextMenu] = useState<{
    data: ContextMenuData;
    position: { x: number; y: number };
  } | null>(null);
  const [stageScale, setStageScale] = useState<number>(1);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const [stagePos, setStagePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [gridVisible, setGridVisible] = useState<boolean>(true);
  const [gridOpacity, setGridOpacity] = useState<number>(0.3);
  const [gridSize, setGridSize] = useState<number>(50);
  const [gridOffsetX, setGridOffsetX] = useState<number>(0);
  const [gridOffsetY, setGridOffsetY] = useState<number>(0);
  const [mapRotation, setMapRotation] = useState<number>(0);


  const [sidebarMode, setSidebarMode] = useState<'user' | 'ai'>('user');
  const [menuAnchor, setMenuAnchor] = useState({ top: 0, bottom: 0 });
  const [customTokens, setCustomTokens] = useState<{ id?: string; name: string; url: string; size: number }[]>([]);
  const [uploadedMaps, setUploadedMaps] = useState<UploadedAsset[]>([]);
  const [isUploadingToken, setIsUploadingToken] = useState(false);
  const [selectedUploadSize, setSelectedUploadSize] = useState(1);
  const tokenFileInputRef = useRef<HTMLInputElement>(null);
  const mapFileInputRef = useRef<HTMLInputElement>(null);
  const relinkMapFileInputRef = useRef<HTMLInputElement>(null);
  const [showCinematicMapGenerator, setShowCinematicMapGenerator] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'cobalt' | 'ai' | 'danger'>('cobalt');
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    checkApiKeyStatus().then(status => {
      setHasApiKey(status.hasKey);
    });
  }, []);
  const [showDndChatbot, setShowDndChatbot] = useState(false);
  const [showCampaignBuilder, setShowCampaignBuilder] = useState(false);
  const [showSaveToCampaignModal, setShowSaveToCampaignModal] = useState(false);
  const [showLoadCampaignModal, setShowLoadCampaignModal] = useState(false);
  const [showMonsterCompendium, setShowMonsterCompendium] = useState(false);
  const [compendiumInitialSearch, setCompendiumInitialSearch] = useState<string>('');
  const [compendiumMonsters, setCompendiumMonsters] = useState<Monster[]>(DEFAULT_MONSTERS);

  const [showCharacterCompendium, setShowCharacterCompendium] = useState(false);
  const [showDdbModal, setShowDdbModal] = useState(false);
  const [characterCompendiumInitialSearch, setCharacterCompendiumInitialSearch] = useState<string>('');
  const [compendiumCharacters, setCompendiumCharacters] = useState<Character[]>(DEFAULT_CHARACTERS);

  const [showAlliesCompendium, setShowAlliesCompendium] = useState(false);
  const [alliesCompendiumInitialSearch, setAlliesCompendiumInitialSearch] = useState<string>('');
  const [compendiumAllies, setCompendiumAllies] = useState<Ally[]>(DEFAULT_ALLIES);



  const [isBugReportModalOpen, setIsBugReportModalOpen] = useState<boolean>(false);
  const [isBugManagerModalOpen, setIsBugManagerModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const unsub = subscribeToCharacters((remoteChars) => {
      const remoteList = Array.isArray(remoteChars) ? remoteChars : [];
      const updatedList = remoteList.map(c => ({
        ...c,
        avatarUrl: getCharacterTokenUrl(c.name, c.avatarUrl)
      }));
      const combined = [...updatedList];
      for (const def of DEFAULT_CHARACTERS) {
        if (!combined.some(c => c.id === def.id || c.name.toLowerCase() === def.name.toLowerCase())) {
          combined.push(def);
        }
      }
      setCompendiumCharacters(combined);
    });
    return () => unsub();
  }, []);

  // Auto-sync D&D Beyond party health on initial load and persist to Firestore
  useEffect(() => {
    fetch('/api/ddb/campaigns/sync-status')
      .then(res => res.json())
      .then(data => {
        const chars = data?.status?.cachedCharacters;
        if (Array.isArray(chars) && chars.length > 0) {
          console.log(`[D&D Beyond] Syncing ${chars.length} campaign characters on initial load.`);
          setCompendiumCharacters(prev => {
            const next = [...prev];
            const toSave: Character[] = [];

            chars.forEach((d: any) => {
              const dId = String(d.id);
              const dName = (d.name || '').trim();
              const existingIdx = next.findIndex(c =>
                isDdbMatch(c.name, c.id, (c as any).ddbCharacterId, dId, dName)
              );

              if (existingIdx >= 0) {
                const existing = next[existingIdx];
                const updated: Character = {
                  ...existing,
                  ddbCharacterId: dId,
                  hp: d.currentHp,
                  maxHp: d.maxHp,
                  tempHp: d.tempHp || 0,
                  ac: d.ac || existing.ac || 10,
                  avatarUrl: existing.avatarUrl || d.avatarUrl || getCharacterTokenUrl(dName),
                  updatedAt: Date.now()
                };
                next[existingIdx] = updated;
                toSave.push(updated);
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
                toSave.push(newChar);
              }
            });

            toSave.forEach(char => {
              saveCharacter(char).catch(err =>
                console.warn('[D&D Beyond Auto-Sync] Failed to persist character:', char.name, err)
              );
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
              const currentMap = activeMapIdRef.current;
              if (mapsDataRef.current[currentMap]) {
                mapsDataRef.current[currentMap].tokens = next;
              }
              if (socketRef.current?.connected && (currentMap === liveMapIdRef.current)) {
                socketRef.current.emit('SYNC_TOKENS', next);
              }
            }
            return next;
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleOpenCharacterCompendium = useCallback((initialSearch?: string) => {
    if (initialSearch) {
      setCharacterCompendiumInitialSearch(initialSearch);
    } else {
      setCharacterCompendiumInitialSearch('');
    }
    setShowCharacterCompendium(true);
  }, []);

  const handleSpawnCharacterToken = useCallback((tokenData: {
    name: string;
    avatarUrl: string;
    hp: number;
    ac: number;
    size: number;
  }) => {
    const newToken: Token = {
      id: `token_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: tokenData.name,
      url: getCharacterTokenUrl(tokenData.name, tokenData.avatarUrl),
      x: 300 + Math.floor(Math.random() * 80),
      y: 300 + Math.floor(Math.random() * 80),
      size: tokenData.size || 1,
      hp: tokenData.hp,
      maxHp: tokenData.hp,
      ac: tokenData.ac,
      isPlayer: true
    };
    setTokens(prev => [...prev, newToken]);
  }, [setTokens]);

  // Real-time synchronization with Monster Compendium
  useEffect(() => {
    const unsub = subscribeToMonsters((remoteMonsters) => {
      let deletedSet = new Set<string>();
      try {
        const stored = localStorage.getItem('vtt_deleted_monster_ids');
        if (stored) {
          const parsed: string[] = JSON.parse(stored);
          deletedSet = new Set(parsed.filter(id => id !== 'monster_rosintar' && !id.toLowerCase().includes('rosintar')));
        }
      } catch (e) {}

      const remoteList = Array.isArray(remoteMonsters) ? remoteMonsters : [];
      const combined = [...remoteList];

      for (const def of DEFAULT_MONSTERS) {
        if (!combined.some(m => m.monsterId === def.monsterId || m.name.toLowerCase() === def.name.toLowerCase())) {
          combined.push(def);
        }
      }

      const finalFiltered = combined.filter(m => {
        if (m.name.toLowerCase() === 'rosintar' || m.monsterId === 'monster_rosintar') {
          return true;
        }
        return !deletedSet.has(m.monsterId);
      });

      setCompendiumMonsters(finalFiltered);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = subscribeToAllies((remoteAllies) => {
      const remoteList = Array.isArray(remoteAllies) ? remoteAllies : [];
      const remoteIds = new Set(remoteList.map(a => a.allyId));
      const combined = [
        ...remoteList,
        ...DEFAULT_ALLIES.filter(a => !remoteIds.has(a.allyId))
      ];
      setCompendiumAllies(combined);
    });
    return () => unsub();
  }, []);

  const handleOpenMonsterCompendium = useCallback((initialSearch?: string) => {
    if (initialSearch) {
      setCompendiumInitialSearch(initialSearch);
    } else {
      setCompendiumInitialSearch('');
    }
    setShowMonsterCompendium(true);
  }, []);

  const handleOpenAlliesCompendium = useCallback((initialSearch?: string) => {
    if (initialSearch) {
      setAlliesCompendiumInitialSearch(initialSearch);
    } else {
      setAlliesCompendiumInitialSearch('');
    }
    setShowAlliesCompendium(true);
  }, []);



  // Universal VTT (.dd2vtt / .uvtt) Importer: extracts map image, grid, walls, doors & lights
  const handleUniversalVttImport = useCallback(async (file: File) => {
    setIsReadingFile(true);
    setUploadError(null);
    toast.info(`Parsing Universal VTT map: ${file.name}...`);
    try {
      const parsed = await parseUniversalVtt(file);
      console.log(`[UVTT] Successfully parsed ${file.name}:`, parsed.metadata);

      // Instant local preview for immediate visual feedback
      const localPreviewUrl = URL.createObjectURL(parsed.imageFile);
      setUnsavedSceneBackup(null);
      setUnsavedSceneBackupWasCrash(false);
      isSceneSavedRef.current = false;
      setMapType('image');
      setImageFile(localPreviewUrl);
      setReveals([]);
      setStageScale(1);
      setStagePos({ x: 0, y: 0 });
      setActiveSceneInfo(null);

      // Apply Grid Size
      setGridSize(parsed.gridSize);
      setGridVisible(true);

      // Apply Walls and Doors
      setWalls(parsed.walls);
      setSelectedWallId(null);
      setWallDrawStart(null);

      // Apply Lights / Torches
      if (parsed.animatedFeatures.length > 0) {
        setBoardAnimatedFeatures(parsed.animatedFeatures);
        setBoardAnimatedEnabled(true);
      }

      // Automatically enable dynamic lighting so player line of sight and wall shadows work immediately
      setVisionConfig(prev => ({
        ...prev,
        enabled: true,
        ambientLight: false
      }));

      // Upload extracted map image file to Firebase for cloud persistence and player view sync
      try {
        const asset = await uploadAndRegisterAsset(parsed.imageFile, 'map', {
          customName: parsed.imageFile.name
        });
        if (asset.url && !asset.url.startsWith('local:')) {
          setImageFile(asset.url);
        }
        lastSlotSwitchTimeRef.current = Date.now();
        if (mapsDataRef.current[activeMapId]) {
          mapsDataRef.current[activeMapId].imageFile = asset.url || localPreviewUrl;
          mapsDataRef.current[activeMapId].gridSize = parsed.gridSize;
        }
      } catch (uploadErr) {
        console.warn('[UVTT] Notice during Firebase cloud registration:', uploadErr);
      }

      toast.success(
        `Universal VTT Map Loaded! ${parsed.gridCols}×${parsed.gridRows} grid (${parsed.gridSize}px), ${parsed.metadata.wallCount} walls, ${parsed.metadata.doorCount} doors, and ${parsed.metadata.lightCount} lights applied!`,
        { duration: 6000 }
      );
    } catch (err: any) {
      console.error('[UVTT] Error importing Universal VTT map:', err);
      setUploadError(err.message || 'Failed to import Universal VTT file');
      toast.error(err.message || 'Failed to import Universal VTT file');
    } finally {
      setIsReadingFile(false);
      if (mapFileInputRef.current) mapFileInputRef.current.value = '';
    }
  }, [activeMapId]);

  // HTML5 Drag and Drop handler for tokens and battlemap files dropped onto the board
  const handleDropOnStage = useCallback((e: React.DragEvent) => {
    e.preventDefault();

    // Check for dropped Universal VTT map files (.dd2vtt / .uvtt)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (isUniversalVttFile(droppedFile)) {
        handleUniversalVttImport(droppedFile);
        return;
      }
    }

    const rawData = e.dataTransfer.getData('application/json');
    if (!rawData) return;
    try {
      const data = JSON.parse(rawData);
      if (!data.name || !data.url) return;

      const stage = stageRef.current;
      if (!stage) return;

      const container = stage.container();
      const containerRect = container ? container.getBoundingClientRect() : { left: 64, top: 0 };
      const mouseX = e.clientX - containerRect.left;
      const mouseY = e.clientY - containerRect.top;

      // Convert screen coordinates to Konva world map coordinates
      const worldX = (mouseX - stagePos.x) / stageScale;
      const worldY = (mouseY - stagePos.y) / stageScale;

      const tokenSizeMultiplier = Number(data.size) || 1;
      const tokenPxSize = tokenSizeMultiplier * gridSize;

      // Center the dropped token directly under the mouse cursor
      const dropX = Math.round(worldX - (tokenPxSize / 2));
      const dropY = Math.round(worldY - (tokenPxSize / 2));

      const isMonster = data.isMonster || data.category === 'monster' || isMonsterToken({ name: data.name, category: data.category });
      const isAlly = data.category === 'ally';

      // Automatically tie AC and HP directly to character sheet!
      const charStats = resolveTokenCharacterStats({ name: data.name }, compendiumCharacters);
      const defMonster = DEFAULT_MONSTERS.find(m => m.name.toLowerCase() === (data.name || '').toLowerCase());

      const finalAc = data.ac ?? (charStats.isFromCharacterSheet ? charStats.ac : (defMonster?.ac ?? charStats.ac));
      const finalMaxHp = data.maxHp ?? data.hp ?? (charStats.isFromCharacterSheet ? charStats.maxHp : (defMonster?.hp ?? charStats.maxHp));
      const finalCurrentHp = data.currentHp ?? data.hp ?? (charStats.isFromCharacterSheet ? charStats.currentHp : (defMonster?.hp ?? charStats.currentHp));

      const newToken: Token = {
        id: `token_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: data.name,
        url: data.url,
        x: dropX,
        y: dropY,
        size: tokenSizeMultiplier,
        hp: finalCurrentHp,
        maxHp: finalMaxHp,
        currentHp: finalCurrentHp,
        ac: finalAc,
        isPlayer: !isMonster && !isAlly,
        isMonster: isMonster,
        category: isMonster ? 'monster' : (isAlly ? 'ally' : (data.category || 'character')),
        visionEnabled: !isMonster,
        visionRadius: isMonster ? 0 : 60,
        ...(data.allyId ? { allyId: data.allyId } : {})
      };

      setTokens(prev => {
        const next = [...prev, newToken];
        if (mapsDataRef.current[activeMapId]) {
          mapsDataRef.current[activeMapId].tokens = next;
        }
        if (socketRef.current && (activeMapIdRef.current === liveMapIdRef.current)) {
          socketRef.current.emit('ADD_TOKEN', newToken);
          socketRef.current.emit('SYNC_TOKENS', next);
        }
        return next;
      });
      toast.success(`Dropped ${data.name} (${tokenSizeMultiplier}x${tokenSizeMultiplier}) onto map`);
    } catch (err) {
      console.error('Error handling dropped token:', err);
    }
  }, [stagePos, stageScale, gridSize, compendiumCharacters]);

  const [campaignsList, setCampaignsList] = useState<Campaign[]>([]);
  const [lastActiveSession, setLastActiveSession] = useState<ActiveSessionData | null>(null);
  const [activeDmNotes, setActiveDmNotes] = useState<string>('');
  const [isQuickSaving, setIsQuickSaving] = useState<boolean>(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [activeSceneInfo, setActiveSceneInfo] = useState<{
    campaignId: string;
    chapterId: string;
    sceneId: string;
    sceneTitle: string;
    mapUrl?: string;
    mapThumbnailUrl?: string;
    mapWidth?: number;
    mapHeight?: number;
  } | null>(null);

  // Connection and Quota state listeners
  useEffect(() => {
    return subscribeToQuotaState((exceeded) => {
      setIsQuotaExceeded(exceeded);
    });
  }, []);
  const [showCombatTracker, setShowCombatTracker] = useState<boolean>(false);
  const [isCombatTrackerMinimized, setIsCombatTrackerMinimized] = useState(false);
  const [tokenMenuTab, setTokenMenuTab] = useState<'stats' | 'conditions' | 'auras'>('stats');
  const [customAuraRadiusInput, setCustomAuraRadiusInput] = useState<number>(10);
  const [customAuraColorInput, setCustomAuraColorInput] = useState<string>('rgba(234, 179, 8, 0.4)');
  const [customAuraOpacityInput, setCustomAuraOpacityInput] = useState<number>(0.35);

  // Environmental Animated FX & Weather State on Main Board (Uploaded & Generated Maps)
  const [boardAnimatedFeatures, setBoardAnimatedFeatures] = useState<AnimatedFeature[]>([]);
  const [boardAnimatedEnabled, setBoardAnimatedEnabled] = useState<boolean>(true);
  const [boardWeatherEffect, setBoardWeatherEffect] = useState<WeatherEffectType>('none');
  const [boardPlacingAnimatedType, setBoardPlacingAnimatedType] = useState<AnimatedFeatureType | null>(null);
  const [boardPlacingTemplate, setBoardPlacingTemplate] = useState<Partial<AnimatedFeature> | null>(null);
  const [showBoardAnimatedControls, setShowBoardAnimatedControls] = useState(false);
  const [boardPolygonDrawingState, setBoardPolygonDrawingState] = useState<{
    isDrawing: boolean;
    count: number;
    canFinish: boolean;
    finish: () => void;
    undo: () => void;
    clear: () => void;
  } | null>(null);

  // Active pan helper when Shift is held during drawing or placing animated FX
  const isShiftPanActive = isShiftPressed && Boolean(boardPlacingAnimatedType || boardPolygonDrawingState?.isDrawing);

  // Campaign Map Zones & Interactive Hotspots State
  const [roomAnnotations, setRoomAnnotations] = useState<RoomAnnotation[]>([]);
  const [currentZonePolygonPoints, setCurrentZonePolygonPoints] = useState<number[]>([]);
  const [isZoneEditorOpen, setIsZoneEditorOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<RoomAnnotation | null>(null);
  const [isZoneSidePanelOpen, setIsZoneSidePanelOpen] = useState(false);
  const [selectedZoneForSidePanel, setSelectedZoneForSidePanel] = useState<RoomAnnotation | null>(null);
  const [selectedRoomAnnotation, setSelectedRoomAnnotation] = useState<RoomAnnotation | null>(null);
  const [isRoomDrawerOpen, setIsRoomDrawerOpen] = useState(false);
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const [isAssignRoomModalOpen, setIsAssignRoomModalOpen] = useState(false);
  const [pendingZonePolygonData, setPendingZonePolygonData] = useState<{
    pctPolyPoints: number[];
    bounds: { x: number; y: number; width: number; height: number };
  } | null>(null);

  // Cancel feature placement or polygon drawing on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (boardPolygonDrawingState && boardPolygonDrawingState.count > 0) {
          boardPolygonDrawingState.clear();
          return;
        }
        if (boardPlacingAnimatedType) {
          setBoardPlacingAnimatedType(null);
          setBoardPlacingTemplate(null);
          setBoardPolygonDrawingState(null);
        }
        if (isAssignRoomModalOpen) {
          setIsAssignRoomModalOpen(false);
          setPendingZonePolygonData(null);
        }
        if (currentZonePolygonPoints.length > 0) {
          setCurrentZonePolygonPoints([]);
          toast.info('Zone polygon drawing cancelled');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [boardPlacingAnimatedType, boardPolygonDrawingState, currentZonePolygonPoints.length, isAssignRoomModalOpen]);

  // Duplication and stamping handlers for modified animated effects (torches, rivers, lava, runes)
  const handleDuplicateFeature = useCallback((feature: AnimatedFeature) => {
    const newX = Math.min(98, Math.max(2, Math.round((feature.x + 2.5) * 10) / 10));
    const newY = Math.min(98, Math.max(2, Math.round((feature.y + 2.5) * 10) / 10));
    const duplicated: AnimatedFeature = {
      ...feature,
      id: `anim-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      x: newX,
      y: newY,
      polygonPoints: feature.polygonPoints ? [...feature.polygonPoints] : undefined
    };
    setBoardAnimatedFeatures(prev => [...prev, duplicated]);
    setBoardAnimatedEnabled(true);
    toast.success(`Duplicated modified ${feature.type} (${feature.radius}% size, ${Math.round((feature.intensity || 1) * 100)}% intensity)`);
    if (effectContextMenu?.position) {
      setEffectContextMenu({
        data: { type: 'feature', feature: duplicated },
        position: {
          x: Math.min(window.innerWidth - 300, effectContextMenu.position.x + 25),
          y: Math.min(window.innerHeight - 360, effectContextMenu.position.y + 25)
        }
      });
    }
  }, [effectContextMenu]);

  const handleStartStampingFeature = useCallback((feature: AnimatedFeature) => {
    setBoardPlacingAnimatedType(feature.type);
    setBoardPlacingTemplate({
      radius: feature.radius,
      intensity: feature.intensity,
      speed: feature.speed,
      rotation: feature.rotation,
      shapePreset: feature.shapePreset,
      polygonPoints: feature.polygonPoints ? [...feature.polygonPoints] : undefined,
      opacity: feature.opacity
    });
    setEffectContextMenu(null);
    toast.info(`Click anywhere on map to stamp copies of modified ${feature.type} (Esc to finish)`);
  }, []);

  // Lifted Combat Tracker State
  const [combatTrackerCombatants, setCombatTrackerCombatants] = useState<Combatant[]>([]);
  const [combatTrackerRound, setCombatTrackerRound] = useState<number>(1);
  const [combatTrackerTurnIndex, setCombatTrackerTurnIndex] = useState<number>(0);

  const sortedCombatTrackerCombatants = useMemo(() => {
    return [...combatTrackerCombatants].sort((a, b) => {
      if (b.initiative !== a.initiative) {
        return b.initiative - a.initiative;
      }
      return 0;
    });
  }, [combatTrackerCombatants]);

  // Sync combat state with Player View in real-time
  useEffect(() => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('SYNC_COMBAT_STATE', {
      combatants: sortedCombatTrackerCombatants,
      round: combatTrackerRound,
      turnIndex: combatTrackerTurnIndex,
      showCombatTracker: showCombatTracker
    });
  }, [sortedCombatTrackerCombatants, combatTrackerRound, combatTrackerTurnIndex, showCombatTracker]);

  // Lore Ledger States
  const [showLoreLedger, setShowLoreLedger] = useState(false);
  const [loreSources, setLoreSources] = useState<{ id: string, name: string, type: 'text' | 'pdf', content: string }[]>([]);
  const [loreHistory, setLoreHistory] = useState<{ role: 'user' | 'model', parts: {text?: string, inlineData?: {mimeType: string, data: string}}[] }[]>([]);
  const [loreChatInput, setLoreChatInput] = useState('');
  const [isLoreChatting, setIsLoreChatting] = useState(false);
  const [loreTab, setLoreTab] = useState<'sources' | 'chat'>('sources');
  const [newLoreText, setNewLoreText] = useState('');
  const [newLoreTitle, setNewLoreTitle] = useState('');
  const [loreError, setLoreError] = useState<string | null>(null);

  // Battlemap load failure handler (never fallback to blurry thumbnail)
  useEffect(() => {
    if (imageStatus === 'failed' && imageFile && mapType === 'image') {
      console.warn('[VTT] Active battlemap failed to load:', imageFile);
      // Auto-recovery for known Guildhouse maps
      if (activeSceneInfo?.sceneId === 'scene-muimqdr3' || activeSceneInfo?.sceneTitle?.toLowerCase().includes('2nd floor')) {
        const fallbackUrl = '/uploads/file-1792161971576-460009101.jpg';
        if (imageFile !== fallbackUrl) {
          console.log('[VTT] Auto-recovering Guildhouse 2nd Floor map with static file:', fallbackUrl);
          setImageFile(fallbackUrl);
          return;
        }
      }
      if (activeSceneInfo?.sceneId === DEMO_GV_SCENE.sceneId || activeSceneInfo?.sceneTitle?.toLowerCase().includes('main level')) {
        const fallbackUrl = '/uploads/file-1792161909096-684999544.jpg';
        if (imageFile !== fallbackUrl) {
          console.log('[VTT] Auto-recovering Guildhouse Main Level map with static file:', fallbackUrl);
          setImageFile(fallbackUrl);
          return;
        }
      }
      toast.error('Failed to load map image asset. Please re-link or upload the file.', {
        id: 'map-load-error'
      });
    }
  }, [imageStatus, imageFile, mapType, activeSceneInfo]);

  // Dynamic Narrator States
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [lastAudioUrl, setLastAudioUrl] = useState<string | null>(null);

  // Subscribe to unified audioNarration service so playback states sync everywhere
  useEffect(() => {
    return audioNarration.subscribe((state) => {
      setIsPlayingAudio(state.isPlaying);
      setIsAudioPaused(state.isPaused);
      if (state.activeUrl) {
        setLastAudioUrl(state.activeUrl);
      }
    });
  }, []);

  // AI Voice & Narrator States
  const [aiVoicePrompt, setAIVoicePrompt] = useState('');
  const [aiVoiceScript, setAIVoiceScript] = useState('');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [selectedAIVoice, setSelectedAIVoice] = useState('wizard');
  const [isShaking, setIsShaking] = useState(false);

  const playCriticalHitSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, ctx.currentTime);
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
  };

  const triggerShake = (sync = true) => {
    setIsShaking(true);
    playCriticalHitSound();
    setTimeout(() => setIsShaking(false), 600);
    if (sync) {
      socketRef.current?.emit('SYNC_SHAKE', 1);
    }
  };

  const handleGenerateAIScript = async () => {
    if (!aiVoicePrompt.trim()) return;
    setIsGeneratingScript(true);
    try {
      const script = await generateVoiceScript(aiVoicePrompt);
      setAIVoiceScript(script);
    } catch (error) {
      console.error("Failed to generate script", error);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleSpeakAIVoice = async () => {
    if (isPlayingAudio) {
      audioNarration.stop();
      return;
    }
    const textToSpeak = aiVoiceScript || aiVoicePrompt;
    if (!textToSpeak.trim()) return;
    
    try {
      const audioUrl = await audioNarration.play({
        text: textToSpeak,
        voiceId: selectedAIVoice,
      });
      if (audioUrl) {
        setLastAudioUrl(audioUrl);
        // Sync with players
        socketRef.current?.emit('SYNC_AUDIO', {
          url: audioUrl,
          label: 'AI Narrator'
        });
      }
    } catch (error) {
      console.error("TTS Error", error);
      toast.error("Failed to generate narration audio.");
    }
  };

  const toggleAudioPlayback = () => {
    audioNarration.toggle();
  };

  // Autonomous AI DM States
  const [showAutoDM, setShowAutoDM] = useState(false);
  const [autoDMChatInput, setAutoDMChatInput] = useState('');
  const [isAutoDMThinking, setIsAutoDMThinking] = useState(false);
  const [autoDMHistory, setAutoDMHistory] = useState<{ role: 'user' | 'model', text: string }[]>([]);

  // Atmosphere Controller States
  const [atmosphere, setAtmosphere] = useState({
    lighting: '#000000',
    brightness: 1,
    ambientSound: '',
    isRaining: false,
    isFoggy: false
  });
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);

  // The "Ref" (Rules Engine) States
  const [useRulesEngine, setUseRulesEngine] = useState(true);
  const [rulesViolations, setRulesViolations] = useState<string[]>([]);
  const [turnState, setTurnState] = useState({
    leveledSpellCast: false,
    bonusActionUsed: false,
    actionUsed: false,
    movementUsed: 0,
    movementRemaining: 30
  });

  const [activeTokenMenu, setActiveTokenMenu] = useState<{ id: string, x: number, y: number } | null>(null);

  // Dice Roller States
  const [diceHistory, setDiceHistory] = useState<RollResult[]>([]);
  const [dicePool, setDicePool] = useState<string[]>([]);

  // Dice Roller Logic
  const addDiceToPool = (type: string) => {
    setDicePool(prev => [...prev, type]);
  };

  const clearDicePool = () => {
    setDicePool([]);
  };

  const rollDicePool = () => {
    if (dicePool.length === 0) return;
    
    const results: number[] = [];
    let total = 0;
    
    dicePool.forEach(type => {
      const sides = type === 'd100' ? 100 : parseInt(type.substring(1));
      const res = Math.floor(Math.random() * sides) + 1;
      results.push(res);
      total += res;
    });

    const diceSummary = dicePool.length > 5 
      ? `${dicePool.length} dice` 
      : dicePool.join(' + ');

    const newRoll: RollResult = {
      id: Math.random().toString(36).substring(7),
      dice: diceSummary,
      results,
      total,
      timestamp: Date.now()
    };
    
    setDiceHistory(prev => [newRoll, ...prev].slice(0, 30));

    // Construct 3D dice event
    const diceEvent: DdbDiceRollEvent = {
      id: newRoll.id,
      characterName: 'Dungeon Master',
      action: 'Dice Tray Roll',
      formula: diceSummary,
      diceNotation: dicePool.join('+'),
      dice: dicePool.map((type, idx) => ({
        sides: type === 'd100' ? 100 : parseInt(type.substring(1)),
        result: results[idx],
        type
      })),
      total,
      isCritical: dicePool.includes('d20') && results[dicePool.indexOf('d20')] === 20,
      isFumble: dicePool.includes('d20') && results[dicePool.indexOf('d20')] === 1,
      theme: 'default',
      themeColor: '#d97706',
      timestamp: Date.now(),
      source: 'local'
    };

    // Broadcast roll to connected players
    if (socketRef.current?.connected) {
      socketRef.current.emit('SYNC_LOCAL_DICE_ROLL', diceEvent);
    }

    // Trigger local 3D roll
    if (typeof window !== 'undefined' && (window as any).__mistwalkerRoll3d) {
      (window as any).__mistwalkerRoll3d(diceEvent);
    }

    setDicePool([]);
    return total;
  };

  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const getMapDimensions = useCallback(() => {
    let baseWidth = mapType === 'image' ? (image ? image.width : dimensions.width) : (videoSize.width || dimensions.width);
    let baseHeight = mapType === 'image' ? (image ? image.height : dimensions.height) : (videoSize.height || dimensions.height);

    // If a loaded image is present with valid natural dimensions, use its true pixel size
    // (or scale up to scene dimensions if the loaded image is a <1000px recovered thumbnail)
    if (mapType === 'image' && image && image.width > 0 && image.height > 0) {
      if (image.width < 1000 && activeSceneInfo?.mapWidth && activeSceneInfo.mapWidth > image.width) {
        baseWidth = activeSceneInfo.mapWidth;
        baseHeight = activeSceneInfo.mapHeight || image.height;
      } else {
        baseWidth = image.width;
        baseHeight = image.height;
      }
    } else if (activeSceneInfo?.mapWidth && activeSceneInfo?.mapHeight && activeSceneInfo.mapWidth > 0 && activeSceneInfo.mapHeight > 0) {
      baseWidth = activeSceneInfo.mapWidth;
      baseHeight = activeSceneInfo.mapHeight;
    } else if (walls.length > 0) {
      // Check if walls span beyond the image dimensions (indicative of thumbnail or downscaled image)
      let maxWallX = 0;
      let maxWallY = 0;
      for (const w of walls) {
        if (w.p1.x > maxWallX) maxWallX = w.p1.x;
        if (w.p2.x > maxWallX) maxWallX = w.p2.x;
        if (w.p1.y > maxWallY) maxWallY = w.p1.y;
        if (w.p2.y > maxWallY) maxWallY = w.p2.y;
      }
      if (maxWallX > baseWidth * 1.15 || maxWallY > baseHeight * 1.15) {
        if (baseWidth > 0 && baseHeight > 0) {
          const aspect = baseWidth / baseHeight;
          const neededW = maxWallX + 328;
          const neededH = maxWallY + 121;
          if (neededW / neededH > aspect) {
            baseWidth = Math.round(neededW);
            baseHeight = Math.round(neededW / aspect);
          } else {
            baseHeight = Math.round(neededH);
            baseWidth = Math.round(neededH * aspect);
          }
        }
      }
    }

    const isRotated = mapRotation % 180 !== 0;
    return {
      width: isRotated ? baseHeight : baseWidth,
      height: isRotated ? baseWidth : baseHeight
    };
  }, [mapType, image, dimensions, videoSize, mapRotation, activeSceneInfo, walls]);

  // Zoom out / fit entire map cleanly into DM Viewport
  const fitWholeMapToScreen = useCallback((overrideW?: number, overrideH?: number) => {
    const vpWidth = Math.max(200, (dimensions.width || containerRef.current?.offsetWidth || window.innerWidth) - 64);
    const vpHeight = Math.max(200, dimensions.height || containerRef.current?.offsetHeight || window.innerHeight);

    const dims = getMapDimensions();
    const isRotated = mapRotation % 180 !== 0;
    const rawW = overrideW || (isRotated ? dims.height : dims.width);
    const rawH = overrideH || (isRotated ? dims.width : dims.height);
    if (!rawW || !rawH || rawW <= 0 || rawH <= 0) return;

    // 48px padding so map is comfortably contained within the viewport
    const padding = 48;
    const availW = Math.max(100, vpWidth - padding * 2);
    const availH = Math.max(100, vpHeight - padding * 2);

    const fitScale = Math.min(availW / rawW, availH / rawH, 1.0);
    const posX = (vpWidth - rawW * fitScale) / 2;
    const posY = (vpHeight - rawH * fitScale) / 2;

    setStageScale(fitScale);
    setStagePos({ x: posX, y: posY });
  }, [dimensions, getMapDimensions, mapRotation]);

  // Auto-fit whenever a new map or scene loads in DM view
  const lastFittedAssetRef = useRef<string | null>(null);
  useEffect(() => {
    const currentAssetKey = activeSceneInfo?.sceneId || imageFile || (image ? `${image.src}_${image.width}x${image.height}` : null);
    if (currentAssetKey && currentAssetKey !== lastFittedAssetRef.current && (image || videoSize.width > 0)) {
      lastFittedAssetRef.current = currentAssetKey;
      fitWholeMapToScreen(image?.width || videoSize.width, image?.height || videoSize.height);
    }
  }, [image, imageFile, activeSceneInfo?.sceneId, videoSize, fitWholeMapToScreen]);

  // Track user modifications to flag scenes as unsaved
  const isSceneChangeMountedRef = useRef(true);
  useEffect(() => {
    if (isSceneChangeMountedRef.current) {
      isSceneChangeMountedRef.current = false;
      return;
    }
    if (imageFile) {
      isSceneSavedRef.current = false;
    }
  }, [tokens, walls, reveals, polygonReveals, roomAnnotations, activeDmNotes, visionConfig, gridSize]);

  // Continuous debounced state snapshot saving to localStorage for instant DM crash recovery
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window === 'undefined') return;
      // Do not overwrite previous session backups when idling on the home screen without an active scene
      if (!imageFile) return;
      try {
        const stateToSave = {
          activeMapId: activeMapIdRef.current,
          liveMapId: liveMapIdRef.current,
          mapsData: mapsDataRef.current,
          imageFile: (!imageFile.startsWith('blob:')) ? imageFile : null,
          mapType,
          videoSize,
          mapRotation,
          stageScale,
          stagePos,
          tokens,
          walls,
          reveals,
          polygonReveals,
          isFogVisible,
          fogResetKey,
          visionConfig,
          gridVisible,
          gridOpacity,
          gridSize,
          gridOffsetX,
          gridOffsetY,
          roomAnnotations,
          activeSceneInfo,
          activeDmNotes,
          boardAnimatedFeatures,
          boardAnimatedEnabled,
          boardWeatherEffect,
          combatTrackerCombatants,
          combatTrackerRound,
          combatTrackerTurnIndex,
          showCombatTracker,
          isSaved: isSceneSavedRef.current,
          timestamp: Date.now()
        };
        localStorage.setItem('mistwalker_dm_state_backup_v1', JSON.stringify(stateToSave));
      } catch (err) {
        // Safe against storage quota
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [
    imageFile, mapType, videoSize, mapRotation, stageScale, stagePos, tokens, walls,
    reveals, polygonReveals, isFogVisible, fogResetKey, visionConfig, gridVisible,
    gridOpacity, gridSize, gridOffsetX, gridOffsetY, roomAnnotations, activeSceneInfo,
    activeDmNotes, boardAnimatedFeatures, boardAnimatedEnabled, boardWeatherEffect,
    combatTrackerCombatants, combatTrackerRound, combatTrackerTurnIndex, showCombatTracker
  ]);

  // Synchronous beforeunload snapshot
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!imageFile) return;
      try {
        const stateToSave = {
          activeMapId: activeMapIdRef.current,
          liveMapId: liveMapIdRef.current,
          mapsData: mapsDataRef.current,
          imageFile: (!imageFile.startsWith('blob:')) ? imageFile : null,
          mapType,
          videoSize,
          mapRotation,
          stageScale,
          stagePos,
          tokens,
          walls,
          reveals,
          polygonReveals,
          isFogVisible,
          fogResetKey,
          visionConfig,
          gridVisible,
          gridOpacity,
          gridSize,
          gridOffsetX,
          gridOffsetY,
          roomAnnotations,
          activeSceneInfo,
          activeDmNotes,
          boardAnimatedFeatures,
          boardAnimatedEnabled,
          boardWeatherEffect,
          combatTrackerCombatants,
          combatTrackerRound,
          combatTrackerTurnIndex,
          showCombatTracker,
          isSaved: isSceneSavedRef.current,
          timestamp: Date.now()
        };
        localStorage.setItem('mistwalker_dm_state_backup_v1', JSON.stringify(stateToSave));
      } catch {}
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [
    imageFile, mapType, videoSize, mapRotation, stageScale, stagePos, tokens, walls,
    reveals, polygonReveals, isFogVisible, fogResetKey, visionConfig, gridVisible,
    gridOpacity, gridSize, gridOffsetX, gridOffsetY, roomAnnotations, activeSceneInfo,
    activeDmNotes, boardAnimatedFeatures, boardAnimatedEnabled, boardWeatherEffect,
    combatTrackerCombatants, combatTrackerRound, combatTrackerTurnIndex, showCombatTracker
  ]);

  // Automatically convert any local blob: map URL into a persistent server /uploads/ URL so remote Player Views can load it
  useEffect(() => {
    if (!imageFile || !imageFile.startsWith('blob:')) return;
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(imageFile);
        if (!resp.ok || cancelled) return;
        const blob = await resp.blob();
        const ext = blob.type.includes('png') ? '.png' : blob.type.includes('webp') ? '.webp' : blob.type.includes('mp4') ? '.mp4' : '.jpg';
        const formData = new FormData();
        formData.append('file', blob, `battlemap_${Date.now()}${ext}`);
        const upRes = await fetch('/api/upload', { method: 'POST', body: formData });
        if (upRes.ok && !cancelled) {
          const data = await upRes.json();
          if (data?.url && !data.url.startsWith('blob:')) {
            console.log('[App] Converted local blob map to server URL:', data.url);
            setImageFile(data.url);
            setActiveSceneInfo(prev => prev ? { ...prev, mapUrl: data.url } : prev);
          }
        }
      } catch (err) {
        console.warn('[App] Could not auto-upload blob map:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [imageFile]);

  const prepareTokensForSync = useCallback((rawTokens: Token[], monstersList: Monster[], combatantsList: Combatant[]) => {
    if (!Array.isArray(rawTokens)) return [];
    return rawTokens.map(t => {
      const repaired = repairMonsterToken(t, monstersList) as Token;
      const matchedCombatant = Array.isArray(combatantsList)
        ? combatantsList.find((c: any) =>
            c.id === repaired.id ||
            c.tokenId === repaired.id ||
            (c.name && repaired.name && c.name.toLowerCase().trim() === repaired.name.toLowerCase().trim())
          )
        : null;
      if (matchedCombatant && Array.isArray(matchedCombatant.conditions) && matchedCombatant.conditions.length > 0) {
        const merged = Array.from(new Set([...(repaired.conditions || []), ...matchedCombatant.conditions]));
        return { ...repaired, conditions: merged };
      }
      return repaired;
    });
  }, []);

  // Automatically repair any monster tokens on the board that have fallback Guard icons or wrong sizes
  useEffect(() => {
    setTokens(prev => {
      if (!Array.isArray(prev) || prev.length === 0) return prev;
      let changed = false;
      const next = prev.map(t => {
        const repaired = repairMonsterToken(t, compendiumMonsters) as Token;
        if (repaired.url !== t.url || repaired.size !== t.size || repaired.ac !== t.ac || repaired.maxHp !== t.maxHp) {
          changed = true;
          return repaired;
        }
        return t;
      });
      return changed ? next : prev;
    });
  }, [compendiumMonsters]);

  // Full-state synchronization helper for emitting authoritative map, tokens, and lighting to Player View
  const broadcastFullState = useCallback((customMapUrl?: string) => {
    if (!socketRef.current?.connected) return;
    const dims = getMapDimensions();
    const rawUrl = customMapUrl || imageFile || activeSceneInfo?.mapUrl || '';
    const nonBlobSceneUrl = (activeSceneInfo?.mapUrl && !activeSceneInfo.mapUrl.startsWith('blob:'))
      ? activeSceneInfo.mapUrl
      : (activeSceneInfo?.mapThumbnailUrl || '');
    const authoritativeUrl = rawUrl.startsWith('blob:') ? (nonBlobSceneUrl || rawUrl) : rawUrl;
    if (!authoritativeUrl && tokens.length === 0) return;

    const syncedTokens = prepareTokensForSync(tokens, compendiumMonsters, combatTrackerCombatants);

    if (authoritativeUrl && !authoritativeUrl.startsWith('blob:')) {
      socketRef.current.emit('SYNC_IMAGE', authoritativeUrl);
    }
    socketRef.current.emit('SYNC_STATE', {
      imageFile: authoritativeUrl,
      tokens: syncedTokens,
      walls: walls,
      gridSize: gridSize,
      gridOpacity: gridOpacity,
      gridVisible: gridVisible,
      gridOffsetX: gridOffsetX,
      gridOffsetY: gridOffsetY,
      isFogVisible: isFogVisible,
      fogResetKey: fogResetKey,
      reveals: reveals,
      polygonReveals: polygonReveals,
      visionConfig: visionConfig,
      roomAnnotations: roomAnnotations,
      mapRotation: mapRotation,
      boardAnimatedFeatures: boardAnimatedFeatures,
      boardAnimatedEnabled: boardAnimatedEnabled,
      boardWeatherEffect: boardWeatherEffect,
      characters: compendiumCharacters,
      combatants: sortedCombatTrackerCombatants,
      combatRound: combatTrackerRound,
      combatTurnIndex: combatTrackerTurnIndex,
      showCombatTracker: showCombatTracker,
      activeSceneInfo: activeSceneInfo ? {
        ...activeSceneInfo,
        mapUrl: authoritativeUrl,
        mapWidth: dims.width || activeSceneInfo.mapWidth,
        mapHeight: dims.height || activeSceneInfo.mapHeight,
      } : {
        mapUrl: authoritativeUrl,
        mapWidth: dims.width,
        mapHeight: dims.height,
      }
    });
  }, [getMapDimensions, imageFile, activeSceneInfo, tokens, compendiumMonsters, combatTrackerCombatants, prepareTokensForSync, walls, gridSize, gridOpacity, gridVisible, gridOffsetX, gridOffsetY, isFogVisible, fogResetKey, reveals, polygonReveals, visionConfig, roomAnnotations, mapRotation, boardAnimatedFeatures, boardAnimatedEnabled, boardWeatherEffect, compendiumCharacters, sortedCombatTrackerCombatants, combatTrackerRound, combatTrackerTurnIndex, showCombatTracker]);

  const broadcastFullStateRef = useRef<() => void>(() => {});
  useEffect(() => {
    broadcastFullStateRef.current = broadcastFullState;
  }, [broadcastFullState]);

  // Flag to prevent echoing back token updates initiated remotely by players
  const isRemoteTokenUpdateRef = useRef<boolean>(false);
  const isInitialTokenMountRef = useRef<boolean>(true);

  // Real-time synchronization of DM token updates (conditions, monster spawns, edits, deletions) to Player View
  useEffect(() => {
    const currentSlot = activeMapIdRef.current;
    if (mapsDataRef.current[currentSlot]) {
      mapsDataRef.current[currentSlot].tokens = tokens;
    }
    if (isInitialTokenMountRef.current) {
      isInitialTokenMountRef.current = false;
      return;
    }
    if (isRemoteTokenUpdateRef.current) {
      isRemoteTokenUpdateRef.current = false;
      return;
    }
    if (isSwitchingMapSlotRef.current || (Date.now() - lastSlotSwitchTimeRef.current < 1500)) return;
    if (currentSlot !== liveMapIdRef.current) return;
    if (socketRef.current?.connected) {
      const syncedTokens = prepareTokensForSync(tokens, compendiumMonsters, combatTrackerCombatants);
      socketRef.current.emit('SYNC_TOKENS', syncedTokens);
    }
  }, [tokens, compendiumMonsters, combatTrackerCombatants, prepareTokensForSync]);

  // Real-time synchronization of board animated features & weather to Player View
  useEffect(() => {
    if (isSwitchingMapSlotRef.current || (Date.now() - lastSlotSwitchTimeRef.current < 1500)) return;
    if (activeMapIdRef.current !== liveMapIdRef.current) return;
    if (socketRef.current?.connected) {
      socketRef.current.emit('SYNC_STATE', {
        boardAnimatedFeatures,
        boardAnimatedEnabled,
        boardWeatherEffect
      });
    }
  }, [boardAnimatedFeatures, boardAnimatedEnabled, boardWeatherEffect]);

  useEffect(() => {
    activeMapIdRef.current = activeMapId;
  }, [activeMapId]);

  useEffect(() => {
    liveMapIdRef.current = liveMapId;
  }, [liveMapId]);

  // Flag to prevent echoing back updates initiated remotely
  const isRemoteUpdateRef = useRef<boolean>(false);

  // Dedicated permanent socket connection & event handlers for DM view
  useEffect(() => {
    const socket = io();
    socketRef.current = socket;
    (window as any).__mistwalkerSocket = socket;
    setSocketInstance(socket);

    socket.on('connect', () => {
      console.log('[DM Socket] Connected to server as ID:', socket.id);
      if (activeMapIdRef.current === liveMapIdRef.current) {
        broadcastFullStateRef.current?.();
      }
    });

    socket.on('REQUEST_INITIAL_STATE', () => {
      console.log('[DM Socket] Player requested initial state. Pushing live slot state...');
      const currentSlot = activeMapIdRef.current;
      const liveSlot = liveMapIdRef.current;
      if (currentSlot === liveSlot) {
        broadcastFullStateRef.current?.();
      } else {
        const liveData = mapsDataRef.current[liveSlot];
        if (liveData && socketRef.current?.connected) {
          const authUrl = liveData.imageFile || liveData.activeSceneInfo?.mapUrl || '';
          if (authUrl) {
            socketRef.current.emit('SYNC_IMAGE', authUrl);
          }
          socketRef.current.emit('SYNC_STATE', {
            imageFile: authUrl,
            tokens: (liveData.tokens || []).map((t: any) => repairMonsterToken(t)),
            walls: liveData.walls || [],
            gridSize: liveData.gridSize || 50,
            gridOpacity: liveData.gridOpacity ?? 0.3,
            gridVisible: liveData.gridVisible ?? true,
            gridOffsetX: liveData.gridOffsetX || 0,
            gridOffsetY: liveData.gridOffsetY || 0,
            isFogVisible: liveData.isFogVisible ?? true,
            reveals: liveData.reveals || [],
            polygonReveals: liveData.polygonReveals || [],
            visionConfig: liveData.visionConfig,
            roomAnnotations: liveData.roomAnnotations || [],
            mapRotation: liveData.mapRotation || 0,
            boardAnimatedFeatures: liveData.boardAnimatedFeatures || [],
            boardAnimatedEnabled: liveData.boardAnimatedEnabled ?? true,
            boardWeatherEffect: liveData.boardWeatherEffect || 'none',
            characters: compendiumCharacters,
            activeSceneInfo: liveData.activeSceneInfo ? {
              ...liveData.activeSceneInfo,
              mapUrl: authUrl
            } : {
              mapUrl: authUrl
            }
          });
        }
      }
    });

    socket.on('MOVE_TOKEN', (data: { id: string; x: number; y: number }) => {
      if (data?.id) {
        console.log('[DM Socket] Live MOVE_TOKEN from player:', data.id, data.x, data.y);
        const liveSlot = liveMapIdRef.current;
        if (mapsDataRef.current[liveSlot]?.tokens) {
          mapsDataRef.current[liveSlot].tokens = mapsDataRef.current[liveSlot].tokens.map((t: any) =>
            t.id === data.id ? { ...t, x: data.x, y: data.y } : t
          );
        }
        if (activeMapIdRef.current === liveSlot) {
          isRemoteTokenUpdateRef.current = true;
          setTokens(prev => prev.map(t => t.id === data.id ? { ...t, x: data.x, y: data.y } : t));
        }
      }
    });

    socket.on('UPDATE_TOKEN', (data: { id: string; updates: Partial<Token> }) => {
      if (data?.id && data.updates) {
        const liveSlot = liveMapIdRef.current;
        if (mapsDataRef.current[liveSlot]?.tokens) {
          mapsDataRef.current[liveSlot].tokens = mapsDataRef.current[liveSlot].tokens.map((t: any) =>
            t.id === data.id ? repairMonsterToken({ ...t, ...data.updates }) : t
          );
        }
        if (activeMapIdRef.current === liveSlot) {
          isRemoteTokenUpdateRef.current = true;
          setTokens(prev => prev.map(t => t.id === data.id ? (repairMonsterToken({ ...t, ...data.updates }) as Token) : t));
        }
      }
    });

    socket.on('DELETE_TOKEN', (data: { id: string }) => {
      if (data?.id) {
        const liveSlot = liveMapIdRef.current;
        if (mapsDataRef.current[liveSlot]?.tokens) {
          mapsDataRef.current[liveSlot].tokens = mapsDataRef.current[liveSlot].tokens.filter((t: any) => t.id !== data.id);
        }
        if (activeMapIdRef.current === liveSlot) {
          isRemoteTokenUpdateRef.current = true;
          setTokens(prev => prev.filter(t => t.id !== data.id));
        }
      }
    });

    socket.on('SYNC_TOKENS', (syncedTokens: Token[]) => {
      if (Array.isArray(syncedTokens)) {
        console.log('[DM Socket] Live SYNC_TOKENS received:', syncedTokens.length, 'tokens');
        const repaired = syncedTokens.map(t => repairMonsterToken(t) as Token);
        const liveSlot = liveMapIdRef.current;
        if (mapsDataRef.current[liveSlot]) {
          mapsDataRef.current[liveSlot].tokens = repaired;
        }
        if (activeMapIdRef.current === liveSlot) {
          isRemoteTokenUpdateRef.current = true;
          setTokens(repaired);
        }
      }
    });

    socket.on('SYNC_STATE', (state: any) => {
      if (!hasRestoredInitialSessionRef.current && state && (state.imageFile || state.activeSceneInfo?.mapUrl)) {
        hasRestoredInitialSessionRef.current = true;
        const authUrl = state.imageFile || state.activeSceneInfo?.mapUrl;
        if (authUrl && !authUrl.startsWith('blob:')) {
          setImageFile(authUrl);
        }
        if (state.tokens && Array.isArray(state.tokens)) setTokens(state.tokens);
        if (state.walls && Array.isArray(state.walls)) setWalls(state.walls);
        if (state.gridSize) setGridSize(state.gridSize);
        if (state.gridOpacity !== undefined) setGridOpacity(state.gridOpacity);
        if (state.gridVisible !== undefined) setGridVisible(state.gridVisible);
        if (state.isFogVisible !== undefined) setIsFogVisible(state.isFogVisible);
        if (state.reveals) setReveals(state.reveals);
        if (state.polygonReveals) setPolygonReveals(state.polygonReveals);
        if (state.visionConfig) setVisionConfig(state.visionConfig);
        if (state.activeSceneInfo) setActiveSceneInfo(state.activeSceneInfo);
        return;
      }
      if (state?.walls && Array.isArray(state.walls)) {
        const liveSlot = liveMapIdRef.current;
        if (mapsDataRef.current[liveSlot]) {
          mapsDataRef.current[liveSlot].walls = state.walls;
        }
        if (activeMapIdRef.current === liveSlot) {
          isRemoteUpdateRef.current = true;
          setWalls(state.walls);
        }
      }
    });



    socket.on('SYNC_SHAKE', () => {
      triggerShake(false);
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
      console.log(`[DM Socket] ⚡ D&D Beyond Initial Sync for ${data.characters.length} characters`);

      // 1. Update compendium characters and persist to Firestore
      setCompendiumCharacters(prev => {
        const next = [...prev];
        const toSave: Character[] = [];

        data.characters.forEach((d: any) => {
          const dId = String(d.id);
          const dName = (d.name || '').trim();
          const existingIdx = next.findIndex(c =>
            isDdbMatch(c.name, c.id, (c as any).ddbCharacterId, dId, dName)
          );

          if (existingIdx >= 0) {
            const existing = next[existingIdx];
            const updated: Character = {
              ...existing,
              ddbCharacterId: dId,
              hp: d.currentHp,
              maxHp: d.maxHp,
              tempHp: d.tempHp || 0,
              ac: d.ac || existing.ac || 10,
              avatarUrl: existing.avatarUrl || d.avatarUrl || getCharacterTokenUrl(dName),
              updatedAt: Date.now()
            };
            next[existingIdx] = updated;
            toSave.push(updated);
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
            toSave.push(newChar);
          }
        });

        toSave.forEach(char => {
          saveCharacter(char).catch(err =>
            console.warn('[D&D Beyond Socket Init] Failed to persist character:', char.name, err)
          );
        });

        return next;
      });

      // 2. Update tokens on the board
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
          const currentMap = activeMapIdRef.current;
          if (mapsDataRef.current[currentMap]) {
            mapsDataRef.current[currentMap].tokens = next;
          }
          if (socketRef.current?.connected && (currentMap === liveMapIdRef.current)) {
            socketRef.current.emit('SYNC_TOKENS', next);
          }
        }
        return next;
      });
    });

    // Real-time D&D Beyond HP synchronization
    socket.on('DDB_CHARACTER_HP_CHANGED', (data: {
      characterId: string | number;
      name: string;
      currentHp: number;
      maxHp: number;
      tempHp: number;
      previousHp: number;
      timestamp: number;
    }) => {
      console.log(`[DM Socket] ⚡ D&D Beyond HP Update: ${data.name} -> ${data.currentHp}/${data.maxHp} (temp: ${data.tempHp})`);
      const charIdStr = String(data.characterId);
      const ddbName = (data.name || '').trim();

      // 1. Update character in compendiumCharacters state and persist to Firestore
      let updatedCharToSave: Character | null = null;
      setCompendiumCharacters(prev => {
        let matched = false;
        const next = prev.map(c => {
          const isMatch = isDdbMatch(c.name, c.id, (c as any).ddbCharacterId, charIdStr, ddbName);
          if (isMatch) {
            matched = true;
            const updated: Character = {
              ...c,
              ddbCharacterId: charIdStr,
              hp: data.currentHp,
              maxHp: data.maxHp,
              tempHp: data.tempHp || 0,
              updatedAt: Date.now()
            };
            updatedCharToSave = updated;
            return updated;
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
          updatedCharToSave = newChar;
          next.push(newChar);
        }

        if (updatedCharToSave) {
          saveCharacter(updatedCharToSave).catch(err =>
            console.warn('[D&D Beyond Socket HP] Failed to persist character:', (updatedCharToSave as Character).name, err)
          );
        }

        return next;
      });

      // 2. Update matching tokens on canvas
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
          const currentMap = activeMapIdRef.current;
          if (mapsDataRef.current[currentMap]) {
            mapsDataRef.current[currentMap].tokens = next;
          }
          // Broadcast updated tokens to connected players only if currentMap is liveMapId
          if (socketRef.current?.connected && (currentMap === liveMapIdRef.current)) {
            socketRef.current.emit('SYNC_TOKENS', next);
          }
        }
        return next;
      });

      toast.info(`🎲 D&D Beyond: ${data.name}'s HP changed to ${data.currentHp}/${data.maxHp}`, {
        duration: 3500
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Real-time automatic D&D Beyond HP registration for all active characters and tokens
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
      }).catch(err => console.warn('[App] D&D Beyond monitor registration note:', err));
    }
  }, [tokens, compendiumCharacters]);

  // Periodic heartbeat poll to trigger D&D Beyond HP refresh cycle every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/api/ddb/campaigns/poll-now', { method: 'POST' }).catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Automated debounced live-streaming of fog reveals, dynamic lighting, walls, and scene state
  const isInitialMountRef = useRef<boolean>(true);
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }
    // CRITICAL: Do NOT broadcast to players if DM is switching slots or editing a slot that is not the live slot!
    if (isSwitchingMapSlotRef.current || (Date.now() - lastSlotSwitchTimeRef.current < 1500)) return;
    if (activeMapIdRef.current !== liveMapIdRef.current) return;

    if (!socketRef.current?.connected) return;
    if (!imageFile && !activeSceneInfo?.mapUrl) return;

    const timer = setTimeout(() => {
      // Re-check slot switch guard inside timer callback
      if (isSwitchingMapSlotRef.current || (Date.now() - lastSlotSwitchTimeRef.current < 1500)) return;
      if (activeMapIdRef.current !== liveMapIdRef.current) return;
      broadcastFullStateRef.current?.();
    }, 150);

  }, [reveals, polygonReveals, isFogVisible, fogResetKey, visionConfig, walls, gridSize, gridOpacity, gridVisible, mapRotation]);

  // Manual "Force Sync to Players" action
  const handleForceSyncToPlayers = useCallback(() => {
    const currentSlot = activeMapIdRef.current as 'DM1' | 'DM2' | 'DM3';
    setLiveMapId(currentSlot);
    liveMapIdRef.current = currentSlot;

    // Reset switching flags so force sync broadcast goes through cleanly
    isSwitchingMapSlotRef.current = false;
    lastSlotSwitchTimeRef.current = 0;

    const syncedTokens = prepareTokensForSync(tokens, compendiumMonsters, combatTrackerCombatants);
    setTokens(syncedTokens);

    // Save to mapsDataRef so it is always current
    mapsDataRef.current[currentSlot] = {
      imageFile,
      mapType,
      videoSize,
      mapRotation,
      stageScale,
      stagePos,
      reveals,
      polygonReveals,
      isFogVisible,
      tokens: syncedTokens,
      gridVisible,
      gridOpacity,
      gridSize,
      gridOffsetX,
      gridOffsetY,
      boardAnimatedFeatures,
      boardAnimatedEnabled,
      boardWeatherEffect,
      walls,
      visionConfig,
      roomAnnotations,
      activeSceneInfo,
      activeDmNotes
    };

    broadcastFullState();
    if (socketRef.current?.connected) {
      socketRef.current.emit('SYNC_TOKENS', syncedTokens);
      socketRef.current.emit('SYNC_COMBAT_STATE', {
        combatants: sortedCombatTrackerCombatants,
        round: combatTrackerRound,
        turnIndex: combatTrackerTurnIndex,
        showCombatTracker: showCombatTracker
      });
    }

    const dims = getMapDimensions();
    const authoritativeUrl = imageFile || activeSceneInfo?.mapUrl || '';
    if (activeSceneInfo) {
      publishActiveSession({
        sessionId: 'current',
        campaignId: activeSceneInfo.campaignId,
        chapterId: activeSceneInfo.chapterId,
        sceneId: activeSceneInfo.sceneId,
        sceneTitle: activeSceneInfo.sceneTitle,
        mapUrl: authoritativeUrl,
        mapThumbnailUrl: activeSceneInfo.mapThumbnailUrl,
        mapWidth: activeSceneInfo.mapWidth || dims.width,
        mapHeight: activeSceneInfo.mapHeight || dims.height,
        dmNotes: activeDmNotes,
        tokens: syncedTokens as any,
        gridSize: gridSize,
        gridOpacity: gridOpacity,
        isFogVisible: isFogVisible,
        walls: walls,
        visionConfig: visionConfig,
        roomAnnotations: roomAnnotations,
        updatedAt: Date.now()
      }).catch(console.warn);
    }
    toast.success(`Force-synced ${currentSlot} to Player View!`);
  }, [broadcastFullState, getMapDimensions, imageFile, activeSceneInfo, activeDmNotes, tokens, compendiumMonsters, combatTrackerCombatants, prepareTokensForSync, sortedCombatTrackerCombatants, combatTrackerRound, combatTrackerTurnIndex, showCombatTracker, gridSize, gridOpacity, isFogVisible, walls, visionConfig, roomAnnotations, mapType, videoSize, mapRotation, stageScale, stagePos, reveals, polygonReveals, gridVisible, gridOffsetX, gridOffsetY, boardAnimatedFeatures, boardAnimatedEnabled, boardWeatherEffect]);

  const handleSpawnMonsterToken = useCallback((tokenData: {
    name: string;
    avatarUrl: string;
    hp: number;
    ac: number;
    size: number;
    polygonPoints?: number[];
  }) => {
    // Start with default position
    let baseSpawnX = 350;
    let baseSpawnY = 350;

    if (tokenData.polygonPoints && tokenData.polygonPoints.length >= 6) {
      const { width: mapW, height: mapH } = getMapDimensions();
      if (mapW > 0 && mapH > 0) {
        let sumX = 0;
        let sumY = 0;
        const count = tokenData.polygonPoints.length / 2;
        for (let i = 0; i < tokenData.polygonPoints.length; i += 2) {
          sumX += tokenData.polygonPoints[i];
          sumY += tokenData.polygonPoints[i + 1];
        }
        baseSpawnX = Math.round((sumX / count / 100) * mapW);
        baseSpawnY = Math.round((sumY / count / 100) * mapH);
      }
    } else {
      baseSpawnX = 350 + Math.floor(Math.random() * 80);
      baseSpawnY = 350 + Math.floor(Math.random() * 80);
    }

    setTokens(prev => {
      const step = Math.max(45, gridSize || 50);
      const nearbyCount = prev.filter(t => Math.abs(t.x - baseSpawnX) < step * 2.5 && Math.abs(t.y - baseSpawnY) < step * 2.5).length;
      const col = nearbyCount % 3;
      const row = Math.floor(nearbyCount / 3);
      const offsetX = col * step;
      const offsetY = row * step;

      const rawToken: Token = {
        id: `token_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: tokenData.name,
        url: tokenData.avatarUrl,
        x: baseSpawnX + offsetX,
        y: baseSpawnY + offsetY,
        size: tokenData.size || 1,
        hp: tokenData.hp,
        maxHp: tokenData.hp,
        currentHp: tokenData.hp,
        ac: tokenData.ac,
        isPlayer: false,
        isMonster: true,
        category: 'monster',
        visionEnabled: false,
        visionRadius: 0
      };
      const repaired = repairMonsterToken(rawToken, compendiumMonsters) as Token;
      return [...prev, repaired];
    });
  }, [getMapDimensions, gridSize, compendiumMonsters]);

  const handleSpawnAllyToken = useCallback((tokenData: {
    name: string;
    avatarUrl: string;
    hp: number;
    ac: number;
    size: number;
    category?: 'ally';
    allyId?: string;
  }) => {
    const baseSpawnX = 350 + Math.floor(Math.random() * 80);
    const baseSpawnY = 350 + Math.floor(Math.random() * 80);

    setTokens(prev => {
      const step = Math.max(45, gridSize || 50);
      const nearbyCount = prev.filter(t => Math.abs(t.x - baseSpawnX) < step * 2.5 && Math.abs(t.y - baseSpawnY) < step * 2.5).length;
      const offsetX = (nearbyCount % 3) * step;
      const offsetY = Math.floor(nearbyCount / 3) * step;

      const newToken: Token = {
        id: `token_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: tokenData.name,
        url: tokenData.avatarUrl,
        x: baseSpawnX + offsetX,
        y: baseSpawnY + offsetY,
        size: tokenData.size || 1,
        hp: tokenData.hp,
        maxHp: tokenData.hp,
        currentHp: tokenData.hp,
        ac: tokenData.ac,
        isPlayer: false,
        isMonster: false,
        category: 'ally',
        visionEnabled: true,
        visionRadius: 60,
        ...(tokenData.allyId ? { allyId: tokenData.allyId } : {})
      };
      return [...prev, newToken];
    });
  }, [gridSize]);
  



  // Subscribe to Campaigns list in real-time
  useEffect(() => {
    const unsub = subscribeToCampaigns((list) => {
      setCampaignsList(list);
    });
    return () => unsub();
  }, []);

  // Subscribe to persistent Active Session from Firestore
  useEffect(() => {
    const unsub = subscribeToActiveSession((session) => {
      setLastActiveSession(session);
    });
    return () => unsub();
  }, []);



  // Subscribe to persistent Uploaded Assets (maps, tokens, etc.) from Firebase
  useEffect(() => {
    const unsub = subscribeToUploadedAssets('all', (assets) => {
      const maps = assets.filter(a => a.type === 'map');
      const tokens = assets.filter(a => a.type === 'token');
      setUploadedMaps(maps);
      setCustomTokens(tokens.map(t => ({
        id: t.assetId,
        name: t.name,
        url: t.url,
        size: t.size || 1
      })));
    });
    return () => unsub();
  }, []);

  // Load Scene from Campaign Builder or Main Loader
  const handleLoadSceneFromCampaign = async (scene: Scene, campaignId: string, chapterId: string, targetView?: 'DM1' | 'DM2' | 'DM3') => {
    if (targetView && activeMapId !== targetView) {
      handleMapSwitch(targetView);
    }
    setUnsavedSceneBackup(null);
    setUnsavedSceneBackupWasCrash(false);
    isSceneSavedRef.current = true;
    
    // Clear existing annotations to start fresh
    setRoomAnnotations([]);
    setCurrentZonePolygonPoints([]);
    setPolygonReveals([]);

    // 1. Update Map with robust resolver (full-resolution ONLY)
    let fullResUrl = '';
    if (scene.mapUrl) {
      try {
        const resolvedMapUrl = await resolveMapSource(scene, uploadedMaps);
        // Ensure we ONLY use full-resolution asset, never a low-resolution thumbnail fallback
        fullResUrl = (resolvedMapUrl && resolvedMapUrl !== scene.mapThumbnailUrl)
          ? resolvedMapUrl
          : scene.mapUrl;

        // Extra safeguard: if fullResUrl is thumbnail or local reference, search uploadedMaps for full resolution asset
        if (!fullResUrl || fullResUrl === scene.mapThumbnailUrl || fullResUrl.startsWith('local:')) {
          const matched = uploadedMaps.find(a => 
            (a.assetId && (a.assetId === scene.sceneId || (scene.mapUrl && scene.mapUrl.includes(a.assetId)))) ||
            (a.url && scene.mapUrl && a.url === scene.mapUrl) ||
            (a.name && scene.sceneTitle && a.name.toLowerCase().trim() === scene.sceneTitle.toLowerCase().trim())
          );
          if (matched && matched.url && matched.url !== scene.mapThumbnailUrl && !matched.url.startsWith('local:')) {
            fullResUrl = matched.url;
          }
        }

        if (fullResUrl) {
          const isVideo = isVideoAsset(fullResUrl) || isVideoAsset(scene.mapUrl);
          setMapType(isVideo ? 'video' : 'image');
          setImageFile(fullResUrl);
          if (isVideo) {
            if (scene.mapWidth && scene.mapHeight) {
              setVideoSize({ width: scene.mapWidth, height: scene.mapHeight });
            } else {
              getVideoNaturalDimensions(fullResUrl).then(vDims => {
                if (vDims.width > 0 && vDims.height > 0) {
                  setVideoSize({ width: vDims.width, height: vDims.height });
                }
              });
            }
          }
        }
      } catch (err) {
        console.warn('[CampaignBuilder] Error resolving scene map URL:', err);
        if (scene.mapUrl) {
          fullResUrl = scene.mapUrl;
          const isVideo = isVideoAsset(scene.mapUrl);
          setMapType(isVideo ? 'video' : 'image');
          setImageFile(scene.mapUrl);
        } else {
          toast.error('Failed to load scene map image.');
        }
      }
    } else {
      console.warn('[CampaignBuilder] Scene is missing mapUrl, skipping image load');
      toast.error('Scene does not have a full-resolution map image asset.');
    }

    // 2. Load Tokens
    let tokenSource = scene.tokens;
    if (scene.sceneId === DEMO_GV_SCENE.sceneId && (!tokenSource || !tokenSource.some((t: any) => t.isMonster))) {
      tokenSource = DEMO_GV_TOKENS;
    }
    let loadedTokens: any[] = [];
    if (tokenSource && Array.isArray(tokenSource)) {
      loadedTokens = tokenSource.map((t: any) => {
        const isCond = Boolean(t.isCondition);
        const isAlly = t.category === 'ally' || Boolean(t.allyId);
        const isMonster = !isCond && !isAlly && (t.isMonster === true || t.category === 'monster' || t.isPlayer === false || isMonsterToken(t));
        const rawTok = {
          ...t,
          id: t.id,
          name: t.name,
          url: t.avatarUrl || t.url || 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Varrak.png/:/rs=w:1440,h:1440',
          x: t.x || 300,
          y: t.y || 300,
          size: t.size || (isCond ? 0.5 : 1),
          hp: t.hp,
          maxHp: t.maxHp ?? t.hp,
          currentHp: t.currentHp ?? t.hp,
          tempHp: t.tempHp,
          ac: t.ac,
          conditions: Array.isArray(t.conditions) ? t.conditions : undefined,
          hidden: t.hidden,
          isCondition: isCond,
          isPlayer: !isMonster && !isAlly && !isCond,
          isMonster: isMonster,
          category: isCond ? 'custom' : isMonster ? 'monster' : isAlly ? 'ally' : (t.category || 'character'),
          visionEnabled: isCond || isMonster ? false : (t.visionEnabled ?? true),
          visionRadius: isCond || isMonster ? 0 : (t.visionRadius ?? 60),
          visionAngle: t.visionAngle
        };
        return repairMonsterToken(rawTok, compendiumMonsters);
      });
      setTokens(loadedTokens);
    }

    // 3. Grid & Fog configuration
    if (scene.gridSize) setGridSize(scene.gridSize);
    if (scene.gridOpacity !== undefined) setGridOpacity(scene.gridOpacity);
    if (scene.isFogVisible !== undefined) setIsFogVisible(scene.isFogVisible);

    // 4. Walls, Doors, Windows & Vision
    if (scene.walls && Array.isArray(scene.walls)) {
      setWalls(scene.walls);
      setSelectedWallId(null);
      setWallDrawStart(null);
    } else {
      setWalls([]);
      setSelectedWallId(null);
      setWallDrawStart(null);
    }
    if (scene.visionConfig) {
      setVisionConfig(scene.visionConfig);
    }

    // 5. Load Room Annotations & Polygon Zones (directly tied to the scene, just like walls and doors)
    let annotationSource = scene.roomAnnotations;
    if (scene.sceneId === DEMO_GV_SCENE.sceneId && (!annotationSource || annotationSource.length < DEMO_GV_ROOM_ZONES.length)) {
      annotationSource = DEMO_GV_ROOM_ZONES;
    }
    if (annotationSource && Array.isArray(annotationSource) && annotationSource.length > 0) {
      const mapped = annotationSource.map(ra => ({
        ...ra,
        sceneId: scene.sceneId,
        campaignId: campaignId
      }));
      setRoomAnnotations(mapped);
      if (mapsDataRef.current[activeMapId]) {
        mapsDataRef.current[activeMapId].roomAnnotations = mapped;
      }
    } else {
      // Fallback if scene.roomAnnotations is empty or missing (e.g. legacy scenes stored in mapZones)
      fetchMapZones(campaignId, scene.sceneId)
        .then(zones => {
          if (zones && zones.length > 0) {
            const mapped = zones.map(ra => ({
              ...ra,
              sceneId: scene.sceneId,
              campaignId: campaignId
            }));
            setRoomAnnotations(mapped);
            if (mapsDataRef.current[activeMapId]) {
              mapsDataRef.current[activeMapId].roomAnnotations = mapped;
            }
            // Auto-persist back onto the scene document so future loads find them directly on the scene
            saveSceneToCampaign(campaignId, chapterId, { ...scene, roomAnnotations: mapped }).catch(console.warn);
          } else {
            setRoomAnnotations([]);
            if (mapsDataRef.current[activeMapId]) {
              mapsDataRef.current[activeMapId].roomAnnotations = [];
            }
          }
        })
        .catch(() => {
          setRoomAnnotations([]);
        });
    }
    setSelectedRoomAnnotation(null);
    setSelectedZoneForSidePanel(null);
    setIsRoomDrawerOpen(false);
    setIsZoneSidePanelOpen(false);
    setCurrentZonePolygonPoints([]);

    const authoritativeMapUrl = fullResUrl || scene.mapUrl || '';

    // 5.5 Tactical & Environmental FX: animated features, weather
    const loadedFeatures = scene.boardAnimatedFeatures && Array.isArray(scene.boardAnimatedFeatures) ? scene.boardAnimatedFeatures : [];
    const loadedFeaturesEnabled = scene.boardAnimatedEnabled !== undefined ? scene.boardAnimatedEnabled : true;
    const loadedWeather = scene.boardWeatherEffect || 'none';

    setBoardAnimatedFeatures(loadedFeatures);
    setBoardAnimatedEnabled(loadedFeaturesEnabled);
    setBoardWeatherEffect(loadedWeather);

    if (mapsDataRef.current[activeMapId]) {
      mapsDataRef.current[activeMapId].boardAnimatedFeatures = loadedFeatures;
      mapsDataRef.current[activeMapId].boardAnimatedEnabled = loadedFeaturesEnabled;
      mapsDataRef.current[activeMapId].boardWeatherEffect = loadedWeather;
    }

    // 6. Update tracking & notes with authoritative full-res URL
    setActiveSceneInfo({
      campaignId,
      chapterId,
      sceneId: scene.sceneId,
      sceneTitle: scene.sceneTitle,
      mapUrl: authoritativeMapUrl,
      mapThumbnailUrl: scene.mapThumbnailUrl,
      mapWidth: scene.mapWidth,
      mapHeight: scene.mapHeight
    });
    setActiveDmNotes(scene.dmNotes || '');

    // Automatically fit the entire map inside the DM view
    fitWholeMapToScreen(scene.mapWidth, scene.mapHeight);

    // Cache complete scene state in mapsDataRef for this slot
    const targetSlot = (targetView || activeMapIdRef.current) as 'DM1' | 'DM2' | 'DM3';
    mapsDataRef.current[targetSlot] = {
      imageFile: authoritativeMapUrl,
      mapType: (isVideoAsset(authoritativeMapUrl) || isVideoAsset(scene.mapUrl)) ? 'video' : 'image',
      videoSize: { width: scene.mapWidth || 0, height: scene.mapHeight || 0 },
      mapRotation: 0,
      stageScale: 1,
      stagePos: { x: 0, y: 0 },
      reveals: [],
      polygonReveals: [],
      isFogVisible: scene.isFogVisible ?? true,
      tokens: loadedTokens,
      gridVisible: true,
      gridOpacity: scene.gridOpacity ?? 0.3,
      gridSize: scene.gridSize || 50,
      gridOffsetX: 0,
      gridOffsetY: 0,
      boardAnimatedFeatures: loadedFeatures,
      boardAnimatedEnabled: loadedFeaturesEnabled,
      boardWeatherEffect: loadedWeather,
      walls: scene.walls || [],
      visionConfig: scene.visionConfig || visionConfig,
      roomAnnotations: roomAnnotations,
      activeSceneInfo: {
        campaignId,
        chapterId,
        sceneId: scene.sceneId,
        sceneTitle: scene.sceneTitle,
        mapUrl: authoritativeMapUrl,
        mapThumbnailUrl: scene.mapThumbnailUrl,
        mapWidth: scene.mapWidth,
        mapHeight: scene.mapHeight
      },
      activeDmNotes: scene.dmNotes || ''
    };

    // Suppress automatic background debounced broadcast right after scene load
    lastSlotSwitchTimeRef.current = Date.now();

    // Persist as last active scene in local storage for instant offline resume
    try {
      localStorage.setItem('mistwalker_last_active_scene', JSON.stringify({
        campaignId,
        chapterId,
        sceneId: scene.sceneId,
        sceneTitle: scene.sceneTitle,
        mapUrl: authoritativeMapUrl,
        mapThumbnailUrl: scene.mapThumbnailUrl,
        mapWidth: scene.mapWidth,
        mapHeight: scene.mapHeight,
        tokensCount: loadedTokens.length,
        wallsCount: (scene.walls || []).length,
        timestamp: Date.now()
      }));
    } catch {}

    const wallCount = scene.walls?.length || 0;
    const roomCount = scene.roomAnnotations?.length || 0;
    toast.success(`Loaded scene "${scene.sceneTitle}" into ${targetSlot} (Press "Force Sync" to broadcast to players)`, {
      duration: 4000
    });
  };

  // Quick Save current canvas state to active scene
  const handleQuickSaveScene = async () => {
    if (!activeSceneInfo) {
      setShowSaveToCampaignModal(true);
      return;
    }

    setIsQuickSaving(true);
    try {
      const sceneTokensToSave: SceneToken[] = tokens.map(t => {
        const tok: SceneToken = {
          id: t.id,
          name: t.name || 'Token',
          avatarUrl: t.url || '',
          x: Math.round(t.x || 0),
          y: Math.round(t.y || 0),
          size: t.size ?? 1
        };
        if (typeof t.hp === 'number' && !isNaN(t.hp)) tok.hp = t.hp;
        if (typeof t.maxHp === 'number' && !isNaN(t.maxHp)) (tok as any).maxHp = t.maxHp;
        if (typeof t.currentHp === 'number' && !isNaN(t.currentHp)) (tok as any).currentHp = t.currentHp;
        if (typeof t.tempHp === 'number' && !isNaN(t.tempHp)) (tok as any).tempHp = t.tempHp;
        if (typeof t.ac === 'number' && !isNaN(t.ac)) tok.ac = t.ac;
        if (Array.isArray(t.conditions) && t.conditions.length > 0) (tok as any).conditions = t.conditions;
        if (typeof t.hidden === 'boolean') (tok as any).hidden = t.hidden;
        if (typeof t.isCondition === 'boolean') tok.isCondition = t.isCondition;
        if (typeof (t as any).visionRadius === 'number') tok.visionRadius = (t as any).visionRadius;
        if (typeof (t as any).visionAngle === 'number') tok.visionAngle = (t as any).visionAngle;
        if (typeof (t as any).isPlayer === 'boolean') tok.isPlayer = (t as any).isPlayer;
        if (typeof (t as any).isMonster === 'boolean') (tok as any).isMonster = (t as any).isMonster;
        if ((t as any).category) (tok as any).category = (t as any).category;
        if (typeof (t as any).visionEnabled === 'boolean') (tok as any).visionEnabled = (t as any).visionEnabled;
        if (typeof (t as any).auraRadius === 'number') tok.auraRadius = (t as any).auraRadius;
        if ((t as any).auraColor) tok.auraColor = (t as any).auraColor;
        if (typeof (t as any).auraOpacity === 'number') tok.auraOpacity = (t as any).auraOpacity;
        if ((t as any).auraName) tok.auraName = (t as any).auraName;
        if (Array.isArray((t as any).auras)) tok.auras = (t as any).auras;
        return tok;
      });

      const currentDims = getMapDimensions();
      const targetMapUrl = (imageFile && !imageFile.startsWith('blob:') && !imageFile.startsWith('local:'))
        ? imageFile
        : ((activeSceneInfo.mapUrl && !activeSceneInfo.mapUrl.startsWith('blob:') && !activeSceneInfo.mapUrl.startsWith('local:'))
            ? activeSceneInfo.mapUrl
            : (imageFile || activeSceneInfo.mapUrl || ''));

      const updatedScene: Scene = {
        sceneId: activeSceneInfo.sceneId,
        sceneTitle: activeSceneInfo.sceneTitle,
        mapUrl: targetMapUrl,
        mapThumbnailUrl: activeSceneInfo.mapThumbnailUrl,
        mapWidth: activeSceneInfo.mapWidth || currentDims.width,
        mapHeight: activeSceneInfo.mapHeight || currentDims.height,
        dmNotes: activeDmNotes,
        tokens: sceneTokensToSave,
        gridSize: gridSize ?? 50,
        gridOpacity: gridOpacity ?? 0.25,
        isFogVisible: isFogVisible ?? true,
        walls: walls,
        visionConfig: visionConfig,
        roomAnnotations: roomAnnotations,
        boardAnimatedFeatures: boardAnimatedFeatures,
        boardAnimatedEnabled: boardAnimatedEnabled,
        boardWeatherEffect: boardWeatherEffect
      };

      await saveSceneToCampaign(
        activeSceneInfo.campaignId,
        activeSceneInfo.chapterId,
        updatedScene
      );

      setActiveSceneInfo(prev => prev ? ({ ...prev, mapUrl: targetMapUrl }) : null);

      if (activeMapIdRef.current === liveMapIdRef.current) {
        await publishActiveSession({
          sessionId: 'current',
          campaignId: activeSceneInfo.campaignId,
          chapterId: activeSceneInfo.chapterId,
          sceneId: updatedScene.sceneId,
          sceneTitle: updatedScene.sceneTitle,
          mapUrl: updatedScene.mapUrl,
          mapThumbnailUrl: updatedScene.mapThumbnailUrl,
          mapWidth: updatedScene.mapWidth,
          mapHeight: updatedScene.mapHeight,
          dmNotes: updatedScene.dmNotes,
          tokens: updatedScene.tokens,
          gridSize: updatedScene.gridSize,
          gridOpacity: updatedScene.gridOpacity,
          isFogVisible: updatedScene.isFogVisible,
          walls: updatedScene.walls,
          visionConfig: updatedScene.visionConfig,
          roomAnnotations: updatedScene.roomAnnotations,
          boardAnimatedFeatures: updatedScene.boardAnimatedFeatures,
          boardAnimatedEnabled: updatedScene.boardAnimatedEnabled,
          boardWeatherEffect: updatedScene.boardWeatherEffect,
          updatedAt: Date.now()
        });
      }

      if (socketRef.current?.connected && targetMapUrl && (activeMapIdRef.current === liveMapIdRef.current)) {
        socketRef.current.emit('SYNC_IMAGE', targetMapUrl);
        socketRef.current.emit('SYNC_STATE', {
          imageFile: targetMapUrl,
          tokens: sceneTokensToSave,
          walls: walls,
          gridSize: gridSize,
          gridOpacity: gridOpacity,
          isFogVisible: isFogVisible,
          reveals: reveals,
          polygonReveals: polygonReveals,
          visionConfig: visionConfig,
          roomAnnotations: roomAnnotations,
          boardAnimatedFeatures: boardAnimatedFeatures,
          boardAnimatedEnabled: boardAnimatedEnabled,
          boardWeatherEffect: boardWeatherEffect,
          activeSceneInfo: {
            ...activeSceneInfo,
            mapUrl: targetMapUrl,
            mapWidth: updatedScene.mapWidth,
            mapHeight: updatedScene.mapHeight
          }
        });
      }

      const wallCount = walls.length;
      const roomCount = roomAnnotations.length;
      isSceneSavedRef.current = true;
      try {
        const raw = localStorage.getItem('mistwalker_dm_state_backup_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.isSaved = true;
          localStorage.setItem('mistwalker_dm_state_backup_v1', JSON.stringify(parsed));
        }
        localStorage.removeItem('mistwalker_crash_detected');
      } catch {}
      toast.success(`Saved "${updatedScene.sceneTitle}" with ${sceneTokensToSave.length} tokens${wallCount > 0 ? `, ${wallCount} walls/doors` : ''}${roomCount > 0 ? `, and ${roomCount} polygon rooms` : ''} to Campaign!`);
      try {
        localStorage.setItem('mistwalker_last_active_scene', JSON.stringify({
          campaignId: activeSceneInfo.campaignId,
          chapterId: activeSceneInfo.chapterId,
          sceneId: updatedScene.sceneId,
          sceneTitle: updatedScene.sceneTitle,
          mapUrl: updatedScene.mapUrl,
          mapThumbnailUrl: updatedScene.mapThumbnailUrl,
          mapWidth: updatedScene.mapWidth,
          mapHeight: updatedScene.mapHeight,
          tokensCount: sceneTokensToSave.length,
          wallsCount: (walls || []).length,
          timestamp: Date.now()
        }));
      } catch {}
    } catch (err: any) {
      console.error('Quick save scene error:', err);
      toast.error('Failed to save scene: ' + (err.message || 'Firestore error'));
    } finally {
      setIsQuickSaving(false);
    }
  };

  const handleSceneSaved = (scene: Scene, campaignId: string, chapterId: string) => {
    isSceneSavedRef.current = true;
    try {
      const raw = localStorage.getItem('mistwalker_dm_state_backup_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.isSaved = true;
        localStorage.setItem('mistwalker_dm_state_backup_v1', JSON.stringify(parsed));
      }
      localStorage.removeItem('mistwalker_crash_detected');
    } catch {}
    setActiveSceneInfo({
      campaignId,
      chapterId,
      sceneId: scene.sceneId,
      sceneTitle: scene.sceneTitle,
      mapWidth: scene.mapWidth,
      mapHeight: scene.mapHeight
    });
    setActiveDmNotes(scene.dmNotes || '');
    try {
      localStorage.setItem('mistwalker_last_active_scene', JSON.stringify({
        campaignId,
        chapterId,
        sceneId: scene.sceneId,
        sceneTitle: scene.sceneTitle,
        mapUrl: scene.mapUrl,
        mapThumbnailUrl: scene.mapThumbnailUrl,
        mapWidth: scene.mapWidth,
        mapHeight: scene.mapHeight,
        tokensCount: scene.tokens?.length || 0,
        wallsCount: scene.walls?.length || 0,
        timestamp: Date.now()
      }));
    } catch {}
    toast.success(`Saved scene "${scene.sceneTitle}" into Campaign!`);
  };

  // ==========================================
  // MistWalker 4.0 Effects Engine Handlers
  // ==========================================
  useEffect(() => {
    // Pre-warm top 15 combat spells in background CacheStorage
    videoCacheManager.prewarmUrls([
      'https://cdn.jsdelivr.net/gh/Jules-Bens-Aa/JB2A_DnD5e@latest/Spells/3rd_Level/Fireball/Fireball_01_Orange_800x800.webm',
      'https://cdn.jsdelivr.net/gh/Jules-Bens-Aa/JB2A_DnD5e@latest/Spells/Cantrip/Eldritch_Blast/EldritchBlast_01_Regular_Purple_Impact_800x800.webm',
      'https://cdn.jsdelivr.net/gh/Jules-Bens-Aa/JB2A_DnD5e@latest/Spells/Cantrip/Fire_Bolt/FireBolt_01_Regular_Orange_Impact_800x800.webm',
      'https://cdn.jsdelivr.net/gh/Jules-Bens-Aa/JB2A_DnD5e@latest/Spells/1st_Level/Shield/Shield_01_Regular_Blue_400x400.webm',
      'https://cdn.jsdelivr.net/gh/Jules-Bens-Aa/JB2A_DnD5e@latest/Spells/3rd_Level/Spirit_Guardians/SpiritGuardians_01_Light_Blue_600x600.webm'
    ]);
  }, []);

  useEffect(() => {
    if (!socketRef.current) return;
    const socket = socketRef.current;
    const onSpawn = (eff: VttEffectInstance) => {
      setEffects(prev => [...prev.filter(e => e.id !== eff.id), eff]);
    };
    const onUpdate = (data: { id: string; updates: any }) => {
      setEffects(prev => prev.map(e => e.id === data.id ? { ...e, ...data.updates } : e));
    };
    const onRemove = (data: { id: string }) => {
      setEffects(prev => prev.filter(e => e.id !== data.id));
    };
    const onClearAll = () => {
      setEffects([]);
    };
    socket.on('EFFECT_SPAWN', onSpawn);
    socket.on('EFFECT_UPDATE', onUpdate);
    socket.on('EFFECT_REMOVE', onRemove);
    socket.on('EFFECT_CLEAR_ALL', onClearAll);
    return () => {
      socket.off('EFFECT_SPAWN', onSpawn);
      socket.off('EFFECT_UPDATE', onUpdate);
      socket.off('EFFECT_REMOVE', onRemove);
      socket.off('EFFECT_CLEAR_ALL', onClearAll);
    };
  }, [socketRef.current]);

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
    setTool('pan');
  }, [activeEquippedAsset]);

  const handleEquipAsset = useCallback((asset: Jb2aAssetDefinition) => {
    setActiveEquippedAsset(asset);
    setTool('spell_aim');

    if (selectedTokenIds.length > 0) {
      const selectedToken = tokens.find(t => t.id === selectedTokenIds[0]);
      if (selectedToken) {
        const tokenRadius = ((selectedToken.size || 1) * gridSize) / 2;
        setAimOrigin({ x: selectedToken.x + tokenRadius, y: selectedToken.y + tokenRadius });
      } else {
        setAimOrigin(null);
      }
    } else {
      setAimOrigin(null);
    }

    const isPoint = asset.paradigm === 'point' || asset.shape === 'circle' || asset.paradigm === 'aura';
    toast.info(`Equipped ${asset.name}`, {
      description: isPoint
        ? 'Click anywhere on the battlemap to detonate.'
        : 'Click caster then target, or click and drag towards target.'
    });
  }, [setTool, selectedTokenIds, tokens, gridSize]);

  const handleQuickPlaceAsset = useCallback((asset: Jb2aAssetDefinition) => {
    const dims = getMapDimensions();
    const centerX = dims.width / 2;
    const centerY = dims.height / 2;

    const newEffect: VttEffectInstance = {
      id: `eff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: asset.name,
      label: asset.label,
      assetKey: asset.id,
      videoUrl: asset.webm,
      loopVideoUrl: asset.loopWebm,
      thumbUrl: asset.thumb,
      paradigm: asset.paradigm,
      x: centerX,
      y: centerY,
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
      description: `${asset.defaultSizeFt}ft ${asset.shape} placed at map center.`
    });
  }, [getMapDimensions]);

  const handleClearEffects = useCallback(() => {
    setEffects([]);
    if (socketRef.current?.connected) {
      socketRef.current.emit('EFFECT_CLEAR_ALL');
    }
    toast.info('Cleared all visual effects from battlemap.');
  }, []);

  const handleRestoreUnsavedScene = useCallback(() => {
    if (!unsavedSceneBackup) return;
    const backup = unsavedSceneBackup;

    if (backup.activeMapId) {
      setActiveMapId(backup.activeMapId);
      activeMapIdRef.current = backup.activeMapId;
    }
    if (backup.liveMapId) {
      setLiveMapId(backup.liveMapId);
      liveMapIdRef.current = backup.liveMapId;
    }
    if (backup.mapsData) {
      mapsDataRef.current = backup.mapsData;
    }

    if (backup.mapType) setMapType(backup.mapType);
    if (backup.videoSize) setVideoSize(backup.videoSize);
    if (backup.mapRotation !== undefined) setMapRotation(backup.mapRotation);
    if (backup.stageScale !== undefined) setStageScale(backup.stageScale);
    if (backup.stagePos) setStagePos(backup.stagePos);

    if (Array.isArray(backup.tokens)) setTokens(backup.tokens);
    if (Array.isArray(backup.walls)) setWalls(backup.walls);
    if (Array.isArray(backup.reveals)) setReveals(backup.reveals);
    if (Array.isArray(backup.polygonReveals)) setPolygonReveals(backup.polygonReveals);
    if (backup.isFogVisible !== undefined) setIsFogVisible(backup.isFogVisible);
    if (backup.fogResetKey !== undefined) setFogResetKey(backup.fogResetKey);
    if (backup.visionConfig) setVisionConfig(backup.visionConfig);

    if (backup.gridVisible !== undefined) setGridVisible(backup.gridVisible);
    if (backup.gridOpacity !== undefined) setGridOpacity(backup.gridOpacity);
    if (backup.gridSize !== undefined) setGridSize(backup.gridSize);
    if (backup.gridOffsetX !== undefined) setGridOffsetX(backup.gridOffsetX);
    if (backup.gridOffsetY !== undefined) setGridOffsetY(backup.gridOffsetY);

    if (Array.isArray(backup.roomAnnotations)) setRoomAnnotations(backup.roomAnnotations);
    if (backup.activeSceneInfo) setActiveSceneInfo(backup.activeSceneInfo);
    if (backup.activeDmNotes !== undefined) setActiveDmNotes(backup.activeDmNotes);


    if (Array.isArray(backup.boardAnimatedFeatures)) setBoardAnimatedFeatures(backup.boardAnimatedFeatures);
    if (backup.boardAnimatedEnabled !== undefined) setBoardAnimatedEnabled(backup.boardAnimatedEnabled);
    if (backup.boardWeatherEffect) setBoardWeatherEffect(backup.boardWeatherEffect);

    if (Array.isArray(backup.combatTrackerCombatants)) setCombatTrackerCombatants(backup.combatTrackerCombatants);
    if (backup.combatTrackerRound !== undefined) setCombatTrackerRound(backup.combatTrackerRound);
    if (backup.combatTrackerTurnIndex !== undefined) setCombatTrackerTurnIndex(backup.combatTrackerTurnIndex);
    if (backup.showCombatTracker !== undefined) setShowCombatTracker(backup.showCombatTracker);

    const targetUrl = backup.imageFile || backup.activeSceneInfo?.mapUrl;
    if (targetUrl) {
      setImageFile(targetUrl);
    }

    try {
      localStorage.removeItem('mistwalker_crash_detected');
    } catch {}

    setUnsavedSceneBackup(null);
    setUnsavedSceneBackupWasCrash(false);
    isSceneSavedRef.current = false;
    toast.success('Successfully restored previous unsaved scene!');
  }, [unsavedSceneBackup]);

  const handleDiscardUnsavedScene = useCallback(() => {
    try {
      localStorage.removeItem('mistwalker_dm_state_backup_v1');
      localStorage.removeItem('mistwalker_crash_detected');
    } catch {}
    setUnsavedSceneBackup(null);
    setUnsavedSceneBackupWasCrash(false);
    toast.info('Discarded previous unsaved scene.');
  }, []);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Universal VTT (.dd2vtt) Exporter: exports current map image, grid, walls, doors & lights
  const handleExportUniversalVtt = useCallback(async () => {
    if (!imageFile) {
      toast.error('No map loaded to export');
      return;
    }
    const dims = getMapDimensions();
    if (dims.width <= 0 || dims.height <= 0) {
      toast.error('Map dimensions not ready for export');
      return;
    }

    const toastId = toast.loading('Generating Universal VTT (.dd2vtt) package...');
    try {
      const mapName = activeSceneInfo?.sceneTitle || 'mistwalker_map';
      const blob = await exportUniversalVtt({
        imageSrc: imageFile,
        mapWidth: dims.width,
        mapHeight: dims.height,
        gridSize: gridSize || 50,
        walls: walls,
        animatedFeatures: boardAnimatedFeatures,
        mapName: mapName
      });
      downloadUniversalVttFile(blob, `${mapName.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.dd2vtt`);
      toast.success('Universal VTT file exported successfully!', { id: toastId });
    } catch (err: any) {
      console.error('[UVTT Export Error]:', err);
      toast.error(`Export failed: ${err.message || 'Unknown error'}`, { id: toastId });
    }
  }, [imageFile, getMapDimensions, gridSize, walls, boardAnimatedFeatures, activeSceneInfo]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Automatic detection and handling of Universal VTT maps (.dd2vtt / .uvtt)
      if (isUniversalVttFile(file)) {
        await handleUniversalVttImport(file);
        return;
      }

      setIsReadingFile(true);
      console.log(`[Upload] Starting persistent upload for: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      
      const isVideo = isVideoAsset(file);
      
      // Instant local preview so map displays immediately on canvas
      const localPreviewUrl = URL.createObjectURL(file);
      setUnsavedSceneBackup(null);
      setUnsavedSceneBackupWasCrash(false);
      isSceneSavedRef.current = false;
      setMapType(isVideo ? 'video' : 'image');
      setImageFile(localPreviewUrl);
      setReveals([]); 
      setStageScale(1);
      setStagePos({ x: 0, y: 0 });
      setActiveSceneInfo(null);

      if (isVideo) {
        getVideoNaturalDimensions(file).then(vDims => {
          if (vDims.width > 0 && vDims.height > 0) {
            setVideoSize({ width: vDims.width, height: vDims.height });
          }
        });
      }

      try {
        setUploadError(null);
        // Upload file and persist its metadata to Firebase Firestore
        const asset = await uploadAndRegisterAsset(file, 'map');
        
        if (asset.url && !asset.url.startsWith('local:')) {
          setImageFile(asset.url);
        }
        lastSlotSwitchTimeRef.current = Date.now();
        if (mapsDataRef.current[activeMapId]) {
          mapsDataRef.current[activeMapId].imageFile = asset.url || localPreviewUrl;
        }
        toast.success(`Map "${asset.name}" saved to Firebase (Press "Force Sync" to broadcast to players)`);
      } catch (err: any) {
        console.error("[Upload] Error uploading map to Firebase:", err);
        setUploadError(err.message || 'Failed to upload map.');
        toast.error('Failed to upload map to Firebase');
      } finally {
        setIsReadingFile(false);
        if (mapFileInputRef.current) mapFileInputRef.current.value = '';
      }
    }
  };

  // Re-link or replace battlemap image while strictly preserving all walls, doors, tokens, vision, and fog
  const handleRelinkMapImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsReadingFile(true);
    console.log(`[RelinkMap] Replacing battlemap with: ${file.name}`);
    try {
      const isVideo = isVideoAsset(file);

      const localPreviewUrl = URL.createObjectURL(file);
      setMapType(isVideo ? 'video' : 'image');
      setImageFile(localPreviewUrl);

      // Measure natural dimensions
      const dims = isVideo ? await getVideoNaturalDimensions(file) : await getImageNaturalDimensions(file);
      if (isVideo && dims.width > 0 && dims.height > 0) {
        setVideoSize({ width: dims.width, height: dims.height });
      }

      // Upload file to server/cloud storage
      const asset = await uploadAndRegisterAsset(file, 'map');
      const targetMapUrl = (asset.url && !asset.url.startsWith('blob:') && !asset.url.startsWith('local:'))
        ? asset.url
        : (asset.url || localPreviewUrl);

      setImageFile(targetMapUrl);

      // If in an active scene, automatically update scene's mapUrl and dimensions
      if (activeSceneInfo) {
        setActiveSceneInfo(prev => prev ? ({
          ...prev,
          mapUrl: targetMapUrl,
          mapThumbnailUrl: asset.thumbnailUrl || prev.mapThumbnailUrl,
          mapWidth: dims.width > 0 ? dims.width : prev.mapWidth,
          mapHeight: dims.height > 0 ? dims.height : prev.mapHeight
        }) : null);

        const camp = campaignsList.find(c => c.campaignId === activeSceneInfo.campaignId);
        const chap = camp?.chapters?.find(ch => ch.chapterId === activeSceneInfo.chapterId);
        const existingScene = chap?.scenes?.find(s => s.sceneId === activeSceneInfo.sceneId);

        const updatedScene: Scene = {
          ...(existingScene || {}),
          sceneId: activeSceneInfo.sceneId,
          sceneTitle: activeSceneInfo.sceneTitle,
          mapUrl: targetMapUrl,
          mapThumbnailUrl: asset.thumbnailUrl || existingScene?.mapThumbnailUrl || activeSceneInfo.mapThumbnailUrl,
          mapWidth: dims.width > 0 ? dims.width : (existingScene?.mapWidth || activeSceneInfo.mapWidth || dims.width),
          mapHeight: dims.height > 0 ? dims.height : (existingScene?.mapHeight || activeSceneInfo.mapHeight || dims.height),
          dmNotes: existingScene?.dmNotes || activeDmNotes,
          walls: walls,
          visionConfig: visionConfig,
          roomAnnotations: roomAnnotations,
          tokens: tokens.map((t: any) => ({
            id: t.id,
            name: t.name || 'Token',
            avatarUrl: t.url || t.avatarUrl || '',
            x: Math.round(t.x || 0),
            y: Math.round(t.y || 0),
            size: typeof t.size === 'number' ? t.size : 1,
            hp: t.hp,
            ac: t.ac,
            isCondition: t.isCondition,
            visionRadius: t.visionRadius,
            visionAngle: t.visionAngle,
            visionEnabled: t.visionEnabled,
            isPlayer: t.isPlayer,
            isMonster: t.isMonster,
            category: t.category
          }))
        };

        await saveSceneToCampaign(activeSceneInfo.campaignId, activeSceneInfo.chapterId, updatedScene);
        if (activeMapIdRef.current === liveMapIdRef.current) {
          await publishActiveSession({
            sessionId: 'current',
            campaignId: activeSceneInfo.campaignId,
            chapterId: activeSceneInfo.chapterId,
            sceneId: updatedScene.sceneId,
            sceneTitle: updatedScene.sceneTitle,
            mapUrl: updatedScene.mapUrl,
            mapThumbnailUrl: updatedScene.mapThumbnailUrl,
            mapWidth: updatedScene.mapWidth,
            mapHeight: updatedScene.mapHeight,
            dmNotes: updatedScene.dmNotes,
            tokens: updatedScene.tokens,
            gridSize: updatedScene.gridSize || gridSize,
            gridOpacity: updatedScene.gridOpacity ?? gridOpacity,
            isFogVisible: updatedScene.isFogVisible ?? isFogVisible,
            walls: updatedScene.walls,
            visionConfig: updatedScene.visionConfig,
            roomAnnotations: updatedScene.roomAnnotations,
            updatedAt: Date.now()
          });
        }
      }

      if (mapsDataRef.current[activeMapId]) {
        mapsDataRef.current[activeMapId].imageFile = targetMapUrl;
      }
      if (socketRef.current?.connected && (activeMapIdRef.current === liveMapIdRef.current)) {
        socketRef.current.emit('SYNC_IMAGE', targetMapUrl);
        socketRef.current.emit('SYNC_STATE', {
          imageFile: targetMapUrl,
          tokens: tokens,
          walls: walls,
          gridSize: gridSize,
          gridOpacity: gridOpacity,
          isFogVisible: isFogVisible,
          visionConfig: visionConfig,
          roomAnnotations: roomAnnotations,
          activeSceneInfo: activeSceneInfo ? {
            ...activeSceneInfo,
            mapUrl: targetMapUrl,
            mapWidth: dims.width > 0 ? dims.width : activeSceneInfo.mapWidth,
            mapHeight: dims.height > 0 ? dims.height : activeSceneInfo.mapHeight,
          } : null
        });
      }

      toast.success(`Map replaced with "${asset.name}"! All walls, tokens, and fog preserved.`);
    } catch (err: any) {
      console.error('[RelinkMap] Error replacing battlemap:', err);
      toast.error('Failed to replace battlemap file');
    } finally {
      setIsReadingFile(false);
      if (relinkMapFileInputRef.current) relinkMapFileInputRef.current.value = '';
    }
  };

  const handleTokenUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingToken(true);
      try {
        // Upload token and persist its metadata to Firebase Firestore
        const asset = await uploadAndRegisterAsset(file, 'token', { tokenSize: selectedUploadSize });
        const newToken = {
          id: asset.assetId,
          name: asset.name,
          url: asset.url,
          size: asset.size || selectedUploadSize
        };
        setCustomTokens(prev => {
          if (prev.some(t => t.id === asset.assetId)) return prev;
          return [...prev, newToken];
        });
        toast.success(`Token "${asset.name}" saved to Firebase`);
      } catch (err: any) {
        console.error("[Token Upload] Error uploading token to Firebase:", err);
        toast.error('Failed to upload token to Firebase');
      } finally {
        setIsUploadingToken(false);
        if (tokenFileInputRef.current) tokenFileInputRef.current.value = '';
      }
    }
  };

  const handleSelectUploadedMap = async (mapAsset: UploadedAsset) => {
    setUnsavedSceneBackup(null);
    setUnsavedSceneBackupWasCrash(false);
    isSceneSavedRef.current = false;
    const isVideo = mapAsset.fileType === 'video' || isVideoAsset(mapAsset.url);
    setMapType(isVideo ? 'video' : 'image');
    let targetUrl = mapAsset.url;

    // 1. Prioritize client IndexedDB for full-resolution original file
    try {
      const filename = mapAsset.url?.split('/').pop()?.split('?')[0];
      const cached = (mapAsset.assetId ? await getLocalAsset(mapAsset.assetId) : null) ||
                     (mapAsset.url ? await getLocalAsset(mapAsset.url) : null) ||
                     (filename ? await getLocalAsset(filename) : null) ||
                     (mapAsset.name ? await getLocalAsset(mapAsset.name) : null);
      if (cached) {
        console.log(`[handleSelectUploadedMap] Restored full-resolution original from IndexedDB for "${mapAsset.name}"`);
        targetUrl = cached;
      } else if (!isVideo) {
        const isAccessible = await testImageAccessible(mapAsset.url);
        if (!isAccessible && mapAsset.thumbnailUrl) {
          targetUrl = mapAsset.thumbnailUrl;
        }
      } else {
        const isAccessible = await testMediaAccessible(mapAsset.url);
        if (!isAccessible && mapAsset.thumbnailUrl) {
          targetUrl = mapAsset.thumbnailUrl;
          setMapType('image');
        }
      }
    } catch (e) {
      console.warn('[handleSelectUploadedMap] IndexedDB check notice:', e);
    }

    setImageFile(targetUrl);
    if (mapAsset.width && mapAsset.height) {
      setActiveSceneInfo(prev => prev ? ({
        ...prev,
        mapWidth: mapAsset.width,
        mapHeight: mapAsset.height
      }) : null);
      if (isVideo) {
        setVideoSize({ width: mapAsset.width, height: mapAsset.height });
      }
    } else if (isVideo) {
      getVideoNaturalDimensions(targetUrl).then(vDims => {
        if (vDims.width > 0 && vDims.height > 0) {
          setVideoSize({ width: vDims.width, height: vDims.height });
        }
      });
    }
    setReveals([]);
    setStageScale(1);
    setStagePos({ x: 0, y: 0 });
    lastSlotSwitchTimeRef.current = Date.now();
    if (mapsDataRef.current[activeMapId]) {
      mapsDataRef.current[activeMapId].imageFile = targetUrl;
    }
    toast.success(`Loaded "${mapAsset.name}" (Press "Force Sync" to broadcast to players)`);
  };

  const handleSelectPresetMap = (preset: PresetBattlemap) => {
    setUnsavedSceneBackup(null);
    setUnsavedSceneBackupWasCrash(false);
    isSceneSavedRef.current = false;
    setMapType('image');
    setImageFile(preset.url);
    setActiveSceneInfo(null);
    setWalls([]);
    setRoomAnnotations([]);
    setCurrentZonePolygonPoints([]);
    setSelectedRoomAnnotation(null);
    setSelectedZoneForSidePanel(null);
    setReveals([]);
    setStageScale(1);
    setStagePos({ x: 0, y: 0 });
    lastSlotSwitchTimeRef.current = Date.now();
    if (mapsDataRef.current[activeMapId]) {
      mapsDataRef.current[activeMapId].imageFile = preset.url;
      mapsDataRef.current[activeMapId].walls = [];
      mapsDataRef.current[activeMapId].roomAnnotations = [];
    }
    toast.success(`Loaded "${preset.name}" battle map (Press "Force Sync" to broadcast to players)`);
  };

  const handleDeleteUploadedAsset = async (assetId: string) => {
    const mapToDelete = uploadedMaps.find(m => m.assetId === assetId);
    // Optimistic removal so UI updates immediately
    setUploadedMaps(prev => prev.filter(m => m.assetId !== assetId));
    try {
      await deleteUploadedAsset(assetId, mapToDelete?.url);
      toast.success(`Deleted "${mapToDelete?.name || 'Map'}" from Firebase`);
    } catch (err) {
      console.error('Failed to delete asset from Firebase:', err);
      // Revert optimistic update
      if (mapToDelete) {
        setUploadedMaps(prev => [mapToDelete, ...prev.filter(m => m.assetId !== assetId)]);
      }
      toast.error('Failed to delete asset from Firebase');
    }
  };

  const handleDeleteCustomToken = async (assetId: string) => {
    const tokenToDelete = customTokens.find(t => t.id === assetId);
    setCustomTokens(prev => prev.filter(t => t.id !== assetId));
    try {
      await deleteUploadedAsset(assetId, tokenToDelete?.url);
      toast.success(`Deleted token "${tokenToDelete?.name || 'Token'}" from Firebase`);
    } catch (err) {
      console.error('Failed to delete token from Firebase:', err);
      if (tokenToDelete) {
        setCustomTokens(prev => [tokenToDelete, ...prev.filter(t => t.id !== assetId)]);
      }
      toast.error('Failed to delete token from Firebase');
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (activeMenu && !(e.target as HTMLElement).closest('.relative.group')) {
        setActiveMenu(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenu]);

  // Map Zone & Interactive Hotspot Handlers
  const handleCompleteZonePolygon = (rawPixelPoints: number[]) => {
    if (rawPixelPoints.length < 6) {
      toast.warning('A zone polygon requires at least 3 points.');
      return;
    }

    const { width: mapW, height: mapH } = getMapDimensions();
    if (mapW <= 0 || mapH <= 0) {
      toast.error('Battlemap dimensions not yet available.');
      return;
    }

    // Convert pixel coordinates to percentage coordinates (0 to 100)
    const pctPolyPoints: number[] = [];
    let minX = 100, maxX = 0, minY = 100, maxY = 0;

    for (let i = 0; i < rawPixelPoints.length; i += 2) {
      const px = rawPixelPoints[i];
      const py = rawPixelPoints[i + 1];
      const pctX = Math.max(0, Math.min(100, (px / mapW) * 100));
      const pctY = Math.max(0, Math.min(100, (py / mapH) * 100));
      pctPolyPoints.push(pctX, pctY);

      if (pctX < minX) minX = pctX;
      if (pctX > maxX) maxX = pctX;
      if (pctY < minY) minY = pctY;
      if (pctY > maxY) maxY = pctY;
    }

    const bounds = {
      x: minX,
      y: minY,
      width: Math.max(2, maxX - minX),
      height: Math.max(2, maxY - minY)
    };

    // Stage pending polygon and open the room number assignment modal immediately
    setPendingZonePolygonData({ pctPolyPoints, bounds });
    setCurrentZonePolygonPoints([]);
    setIsAssignRoomModalOpen(true);
  };

  const handleConfirmAssignPolygonRoom = (roomData: {
    roomNumber: string;
    roomName: string;
    boxedText: string;
    dmNotes: string;
    monsters: string[];
    pdfSection?: string;
  }) => {
    if (!pendingZonePolygonData) {
      setIsAssignRoomModalOpen(false);
      return;
    }

    const newZone: RoomAnnotation = {
      id: `zone_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      label: roomData.roomNumber ? `${roomData.roomNumber}: ${roomData.roomName}` : roomData.roomName,
      roomNumber: roomData.roomNumber,
      roomName: roomData.roomName,
      bounds: pendingZonePolygonData.bounds,
      polygonPoints: pendingZonePolygonData.pctPolyPoints,
      boxedText: roomData.boxedText,
      dmNotes: roomData.dmNotes,
      color: '#f59e0b',
      pdfSection: roomData.pdfSection || (activeSceneInfo?.sceneTitle ? `${activeSceneInfo.sceneTitle} - Room ${roomData.roomNumber}` : ''),
      pdfPage: undefined,
      monsters: roomData.monsters,
      campaignId: activeSceneInfo?.campaignId,
      sceneId: activeSceneInfo?.sceneId
    };

    setIsAssignRoomModalOpen(false);
    setPendingZonePolygonData(null);

    // Save zone to scene
    handleSaveZone(newZone);
    setSelectedZoneForSidePanel(newZone);
    setSelectedRoomAnnotation(newZone);
    setIsZoneSidePanelOpen(true);

    toast.success(`Room ${roomData.roomNumber} (${roomData.roomName}) saved! Tool is ready for next room.`);
  };

  const handleCancelAssignPolygonRoom = useCallback(() => {
    setIsAssignRoomModalOpen(false);
    setPendingZonePolygonData(null);
    setCurrentZonePolygonPoints([]);
    toast.info('Room polygon assignment cancelled.');
  }, []);

  const handleSaveZone = async (updatedZone: RoomAnnotation) => {
    // Resolve target scene (activeSceneInfo or match from campaignsList)
    let currentActiveScene = activeSceneInfo;
    if (!currentActiveScene && campaignsList.length > 0) {
      if (imageFile) {
        for (const camp of campaignsList) {
          for (const chap of camp.chapters) {
            const sc = chap.scenes.find(s => s.mapUrl === imageFile || s.mapThumbnailUrl === imageFile);
            if (sc) {
              currentActiveScene = {
                campaignId: camp.campaignId,
                chapterId: chap.chapterId,
                sceneId: sc.sceneId,
                sceneTitle: sc.sceneTitle,
                mapUrl: sc.mapUrl,
                mapThumbnailUrl: sc.mapThumbnailUrl,
                mapWidth: sc.mapWidth,
                mapHeight: sc.mapHeight
              };
              setActiveSceneInfo(currentActiveScene);
              break;
            }
          }
          if (currentActiveScene) break;
        }
      }
      if (!currentActiveScene && campaignsList[0]?.chapters[0]?.scenes[0]) {
        const firstCamp = campaignsList[0];
        const firstChap = firstCamp.chapters[0];
        const firstScn = firstChap.scenes[0];
        currentActiveScene = {
          campaignId: firstCamp.campaignId,
          chapterId: firstChap.chapterId,
          sceneId: firstScn.sceneId,
          sceneTitle: firstScn.sceneTitle,
          mapUrl: firstScn.mapUrl,
          mapThumbnailUrl: firstScn.mapThumbnailUrl,
          mapWidth: firstScn.mapWidth,
          mapHeight: firstScn.mapHeight
        };
        setActiveSceneInfo(currentActiveScene);
      }
    }

    const campId = currentActiveScene?.campaignId || 'default';
    const scnId = currentActiveScene?.sceneId || 'default';

    const zoneWithScene: RoomAnnotation = {
      ...updatedZone,
      campaignId: campId,
      sceneId: scnId
    };

    try {
      // 1. Update local state immediately
      const nextAnnotations = roomAnnotations.some(z => z.id === zoneWithScene.id)
        ? roomAnnotations.map(z => z.id === zoneWithScene.id ? zoneWithScene : z)
        : [...roomAnnotations, zoneWithScene];
      setRoomAnnotations(nextAnnotations);

      if (mapsDataRef.current[activeMapId]) {
        mapsDataRef.current[activeMapId].roomAnnotations = nextAnnotations;
      }

      if (selectedZoneForSidePanel?.id === zoneWithScene.id) {
        setSelectedZoneForSidePanel(zoneWithScene);
      }
      if (selectedRoomAnnotation?.id === zoneWithScene.id) {
        setSelectedRoomAnnotation(zoneWithScene);
      }

      // 2. Directly tie to active scene in Firestore (just like walls and doors)
      if (currentActiveScene) {
        try {
          const currentDims = getMapDimensions();
          const targetMapUrl = (imageFile && !imageFile.startsWith('blob:'))
            ? imageFile
            : (currentActiveScene.mapUrl || imageFile || '');

          const camp = campaignsList.find(c => c.campaignId === currentActiveScene.campaignId);
          const chap = camp?.chapters?.find(ch => ch.chapterId === currentActiveScene.chapterId);
          const existingScene = chap?.scenes?.find(s => s.sceneId === currentActiveScene.sceneId);

          const updatedScene: Scene = {
            ...(existingScene || {}),
            sceneId: currentActiveScene.sceneId,
            sceneTitle: currentActiveScene.sceneTitle,
            mapUrl: targetMapUrl,
            mapThumbnailUrl: currentActiveScene.mapThumbnailUrl || existingScene?.mapThumbnailUrl,
            mapWidth: currentActiveScene.mapWidth || currentDims.width,
            mapHeight: currentActiveScene.mapHeight || currentDims.height,
            dmNotes: activeDmNotes,
            tokens: tokens.map(t => {
              const tok: SceneToken = {
                id: t.id,
                name: t.name || 'Token',
                avatarUrl: t.url || (t as any).avatarUrl || '',
                x: Math.round(t.x || 0),
                y: Math.round(t.y || 0),
                size: typeof t.size === 'number' ? t.size : 1
              };
              if (typeof t.hp === 'number' && !isNaN(t.hp)) tok.hp = t.hp;
              if (typeof t.ac === 'number' && !isNaN(t.ac)) tok.ac = t.ac;
              if (typeof t.isCondition === 'boolean') tok.isCondition = t.isCondition;
              if (typeof (t as any).isPlayer === 'boolean') tok.isPlayer = (t as any).isPlayer;
              if (typeof (t as any).isMonster === 'boolean') (tok as any).isMonster = (t as any).isMonster;
              if ((t as any).category) (tok as any).category = (t as any).category;
              if (typeof (t as any).visionRadius === 'number') tok.visionRadius = (t as any).visionRadius;
              if (typeof (t as any).visionAngle === 'number') tok.visionAngle = (t as any).visionAngle;
              if (typeof (t as any).visionEnabled === 'boolean') (tok as any).visionEnabled = (t as any).visionEnabled;
              return tok;
            }),
            gridSize: gridSize ?? 50,
            gridOpacity: gridOpacity ?? 0.25,
            isFogVisible: isFogVisible ?? true,
            walls,
            visionConfig,
            roomAnnotations: nextAnnotations,
            boardAnimatedFeatures: boardAnimatedFeatures,
            boardAnimatedEnabled: boardAnimatedEnabled,
            boardWeatherEffect: boardWeatherEffect,
            pdfUrl: existingScene?.pdfUrl,
            pdfFilename: existingScene?.pdfFilename,
            pdfSection: existingScene?.pdfSection,
            pdfPage: existingScene?.pdfPage,
            updatedAt: Date.now()
          };

          // Optimistically update in-memory campaigns list
          setCampaignsList(prev => prev.map(c => {
            if (c.campaignId === currentActiveScene!.campaignId) {
              return {
                ...c,
                chapters: c.chapters.map(ch => {
                  if (ch.chapterId === currentActiveScene!.chapterId) {
                    return {
                      ...ch,
                      scenes: ch.scenes.map(sc => sc.sceneId === currentActiveScene!.sceneId ? updatedScene : sc)
                    };
                  }
                  return ch;
                })
              };
            }
            return c;
          }));

          await saveSceneToCampaign(currentActiveScene.campaignId, currentActiveScene.chapterId, updatedScene);
          if (activeMapIdRef.current === liveMapIdRef.current) {
            await publishActiveSession({
              sessionId: 'current',
              campaignId: currentActiveScene.campaignId,
              chapterId: currentActiveScene.chapterId,
              sceneId: updatedScene.sceneId,
              sceneTitle: updatedScene.sceneTitle,
              mapUrl: updatedScene.mapUrl,
              mapThumbnailUrl: updatedScene.mapThumbnailUrl,
              mapWidth: updatedScene.mapWidth,
              mapHeight: updatedScene.mapHeight,
              dmNotes: updatedScene.dmNotes,
              tokens: updatedScene.tokens,
              gridSize: updatedScene.gridSize,
              gridOpacity: updatedScene.gridOpacity,
              isFogVisible: updatedScene.isFogVisible,
              walls: updatedScene.walls,
              visionConfig: updatedScene.visionConfig,
              roomAnnotations: nextAnnotations,
              boardAnimatedFeatures: updatedScene.boardAnimatedFeatures,
              boardAnimatedEnabled: updatedScene.boardAnimatedEnabled,
              boardWeatherEffect: updatedScene.boardWeatherEffect,
              updatedAt: Date.now()
            });
          }
        } catch (campErr) {
          console.warn('[handleSaveZone] Campaign scene sync note:', campErr);
        }
      }

      // Also persist to mapZones document
      saveMapZone(campId, scnId, zoneWithScene).catch(console.warn);

      toast.success(`Room "${zoneWithScene.roomNumber || ''} ${zoneWithScene.roomName || ''}" tied to scene!`, {
        icon: '📍'
      });
      setIsZoneEditorOpen(false);
      setEditingZone(null);
    } catch (error: any) {
      console.error('Failed to save room zone:', error);
      toast.error(`Error saving room: ${error?.message || 'Write failed'}`);
    }
  };

  const handleDeleteZone = async (zoneId: string) => {
    const campId = activeSceneInfo?.campaignId || 'default';
    const nextAnnotations = roomAnnotations.filter(z => z.id !== zoneId);
    setRoomAnnotations(nextAnnotations);

    if (mapsDataRef.current[activeMapId]) {
      mapsDataRef.current[activeMapId].roomAnnotations = nextAnnotations;
    }

    if (selectedZoneForSidePanel?.id === zoneId) {
      setIsZoneSidePanelOpen(false);
      setSelectedZoneForSidePanel(null);
    }
    if (selectedRoomAnnotation?.id === zoneId) {
      setSelectedRoomAnnotation(null);
      setIsRoomDrawerOpen(false);
    }
    setIsZoneEditorOpen(false);
    setEditingZone(null);

    // Directly update active scene in Firestore (removing the zone from the scene doc)
    if (activeSceneInfo) {
      try {
        const currentDims = getMapDimensions();
        const targetMapUrl = (imageFile && !imageFile.startsWith('blob:'))
          ? imageFile
          : (activeSceneInfo.mapUrl || imageFile || '');

        const camp = campaignsList.find(c => c.campaignId === activeSceneInfo.campaignId);
        const chap = camp?.chapters?.find(ch => ch.chapterId === activeSceneInfo.chapterId);
        const existingScene = chap?.scenes?.find(s => s.sceneId === activeSceneInfo.sceneId);

        const updatedScene: Scene = {
          ...(existingScene || {}),
          sceneId: activeSceneInfo.sceneId,
          sceneTitle: activeSceneInfo.sceneTitle,
          mapUrl: targetMapUrl,
          mapThumbnailUrl: activeSceneInfo.mapThumbnailUrl || existingScene?.mapThumbnailUrl,
          mapWidth: activeSceneInfo.mapWidth || currentDims.width,
          mapHeight: activeSceneInfo.mapHeight || currentDims.height,
          dmNotes: activeDmNotes,
          tokens: tokens.map(t => {
            const tok: SceneToken = {
              id: t.id,
              name: t.name || 'Token',
              avatarUrl: t.url || (t as any).avatarUrl || '',
              x: Math.round(t.x || 0),
              y: Math.round(t.y || 0),
              size: typeof t.size === 'number' ? t.size : 1
            };
            if (typeof t.hp === 'number' && !isNaN(t.hp)) tok.hp = t.hp;
            if (typeof t.ac === 'number' && !isNaN(t.ac)) tok.ac = t.ac;
            if (typeof t.isCondition === 'boolean') tok.isCondition = t.isCondition;
            if (typeof (t as any).isPlayer === 'boolean') tok.isPlayer = (t as any).isPlayer;
            if (typeof (t as any).isMonster === 'boolean') (tok as any).isMonster = (t as any).isMonster;
            if ((t as any).category) (tok as any).category = (t as any).category;
            if (typeof (t as any).visionRadius === 'number') tok.visionRadius = (t as any).visionRadius;
            if (typeof (t as any).visionAngle === 'number') tok.visionAngle = (t as any).visionAngle;
            if (typeof (t as any).visionEnabled === 'boolean') (tok as any).visionEnabled = (t as any).visionEnabled;
            return tok;
          }),
          gridSize: gridSize ?? 50,
          gridOpacity: gridOpacity ?? 0.25,
          isFogVisible: isFogVisible ?? true,
          walls,
          visionConfig,
          roomAnnotations: nextAnnotations,
          boardAnimatedFeatures: boardAnimatedFeatures,
          boardAnimatedEnabled: boardAnimatedEnabled,
          boardWeatherEffect: boardWeatherEffect,
          pdfUrl: existingScene?.pdfUrl,
          pdfFilename: existingScene?.pdfFilename,
          pdfSection: existingScene?.pdfSection,
          pdfPage: existingScene?.pdfPage,
          updatedAt: Date.now()
        };

        // Optimistically update in-memory campaigns list
        setCampaignsList(prev => prev.map(c => {
          if (c.campaignId === activeSceneInfo.campaignId) {
            return {
              ...c,
              chapters: c.chapters.map(ch => {
                if (ch.chapterId === activeSceneInfo.chapterId) {
                  return {
                    ...ch,
                    scenes: ch.scenes.map(sc => sc.sceneId === activeSceneInfo.sceneId ? updatedScene : sc)
                  };
                }
                return ch;
              })
            };
          }
          return c;
        }));

        await saveSceneToCampaign(activeSceneInfo.campaignId, activeSceneInfo.chapterId, updatedScene);
        if (activeMapIdRef.current === liveMapIdRef.current) {
          await publishActiveSession({
            sessionId: 'current',
            campaignId: activeSceneInfo.campaignId,
            chapterId: activeSceneInfo.chapterId,
            sceneId: updatedScene.sceneId,
            sceneTitle: updatedScene.sceneTitle,
            mapUrl: updatedScene.mapUrl,
            mapThumbnailUrl: updatedScene.mapThumbnailUrl,
            mapWidth: updatedScene.mapWidth,
            mapHeight: updatedScene.mapHeight,
            dmNotes: updatedScene.dmNotes,
            tokens: updatedScene.tokens,
            gridSize: updatedScene.gridSize,
            gridOpacity: updatedScene.gridOpacity,
            isFogVisible: updatedScene.isFogVisible,
            walls: updatedScene.walls,
            visionConfig: updatedScene.visionConfig,
            roomAnnotations: nextAnnotations,
            boardAnimatedFeatures: updatedScene.boardAnimatedFeatures,
            boardAnimatedEnabled: updatedScene.boardAnimatedEnabled,
            boardWeatherEffect: updatedScene.boardWeatherEffect,
            updatedAt: Date.now()
          });
        }
      } catch (err) {
        console.warn('[handleDeleteZone] Scene update notice:', err);
      }
    }

    try {
      await deleteMapZone(zoneId, campId);
    } catch (e) {
      console.warn('[handleDeleteZone] Standalone zone delete notice:', e);
    }
    toast.success('Room zone removed from scene');
  };

  const handleSendBriefingToChat = (text: string, title: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('SYNC_CHAT', {
        sender: 'Dungeon Master',
        title,
        message: text,
        timestamp: Date.now()
      });
    }
    toast.success(`Broadcasted "${title}" read-aloud text to players`);
  };

  const handleBroadcastRoomReadAloud = async (text: string, title: string, voiceId?: string) => {
    if (!text || !text.trim()) return;

    const voice = getNarrationVoice(voiceId || selectedAIVoice);
    const cleanText = text
      .replace(/[*#_`>~]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .trim();

    let audioBase64: string | undefined;
    try {
      audioBase64 = await generateTTS(cleanText, voice.geminiVoice, voice.elevenLabsVoiceId);
    } catch (ttsErr: any) {
      console.warn('[App] TTS generation failed for broadcast, falling back to text only:', ttsErr);
    }

    if (socketRef.current?.connected) {
      socketRef.current.emit('BROADCAST_ROOM_TEXT', {
        title,
        message: text,
        boxedText: text,
        audioBase64,
        voiceId: voice.id,
        voiceName: voice.name,
        timestamp: Date.now()
      });
      socketRef.current.emit('SYNC_CHAT', {
        sender: 'Dungeon Master',
        title,
        message: text,
        timestamp: Date.now()
      });
    }

    if (audioBase64) {
      toast.success(`Broadcasted "${title}" read-aloud with ${voice.name} voice to Player View!`);
    } else {
      toast.success(`Broadcasted "${title}" read-aloud to players`);
    }
  };

  const handleUpdateRoomAnnotation = (updatedRoom: RoomAnnotation) => {
    const nextAnnotations = roomAnnotations.map((a) => (a.id === updatedRoom.id ? updatedRoom : a));
    setRoomAnnotations(nextAnnotations);
    setSelectedRoomAnnotation(updatedRoom);
    setSelectedZoneForSidePanel(updatedRoom);

    // Also update mapsDataRef for the active slot so switching slots keeps the updated annotation
    if (mapsDataRef.current[activeMapId]) {
      mapsDataRef.current[activeMapId].roomAnnotations = nextAnnotations;
    }

    // Persist directly to the scene doc in Firestore (just like walls)
    if (activeSceneInfo) {
      const currentDims = getMapDimensions();
      const targetMapUrl = (imageFile && !imageFile.startsWith('blob:'))
        ? imageFile
        : (activeSceneInfo.mapUrl || imageFile || '');

      const sceneTokensToSave: SceneToken[] = tokens.map(t => {
        const tok: SceneToken = {
          id: t.id,
          name: t.name || 'Token',
          avatarUrl: t.url || '',
          x: Math.round(t.x || 0),
          y: Math.round(t.y || 0),
          size: t.size ?? 1
        };
        if (typeof t.hp === 'number' && !isNaN(t.hp)) tok.hp = t.hp;
        if (typeof t.ac === 'number' && !isNaN(t.ac)) tok.ac = t.ac;
        if (typeof t.isCondition === 'boolean') tok.isCondition = t.isCondition;
        if (typeof (t as any).isPlayer === 'boolean') tok.isPlayer = (t as any).isPlayer;
        if (typeof (t as any).isMonster === 'boolean') (tok as any).isMonster = (t as any).isMonster;
        if ((t as any).category) (tok as any).category = (t as any).category;
        if (typeof (t as any).visionRadius === 'number') tok.visionRadius = (t as any).visionRadius;
        if (typeof (t as any).visionAngle === 'number') tok.visionAngle = (t as any).visionAngle;
        if (typeof (t as any).visionEnabled === 'boolean') (tok as any).visionEnabled = (t as any).visionEnabled;
        if (typeof (t as any).auraRadius === 'number') tok.auraRadius = (t as any).auraRadius;
        if ((t as any).auraColor) tok.auraColor = (t as any).auraColor;
        if (typeof (t as any).auraOpacity === 'number') tok.auraOpacity = (t as any).auraOpacity;
        if ((t as any).auraName) tok.auraName = (t as any).auraName;
        if (Array.isArray((t as any).auras)) tok.auras = (t as any).auras;
        return tok;
      });

      const camp = campaignsList.find(c => c.campaignId === activeSceneInfo.campaignId);
      const chap = camp?.chapters?.find(ch => ch.chapterId === activeSceneInfo.chapterId);
      const existingScene = chap?.scenes?.find(s => s.sceneId === activeSceneInfo.sceneId);

      const updatedScene: Scene = {
        ...(existingScene || {}),
        sceneId: activeSceneInfo.sceneId,
        sceneTitle: activeSceneInfo.sceneTitle,
        mapUrl: targetMapUrl,
        mapThumbnailUrl: activeSceneInfo.mapThumbnailUrl || existingScene?.mapThumbnailUrl,
        mapWidth: activeSceneInfo.mapWidth || currentDims.width,
        mapHeight: activeSceneInfo.mapHeight || currentDims.height,
        dmNotes: activeDmNotes,
        tokens: sceneTokensToSave,
        gridSize: gridSize ?? 50,
        gridOpacity: gridOpacity ?? 0.25,
        isFogVisible: isFogVisible ?? true,
        walls,
        visionConfig,
        roomAnnotations: nextAnnotations,
        boardAnimatedFeatures,
        boardAnimatedEnabled,
        boardWeatherEffect,
        pdfUrl: existingScene?.pdfUrl,
        pdfFilename: existingScene?.pdfFilename,
        pdfSection: existingScene?.pdfSection,
        pdfPage: existingScene?.pdfPage,
        updatedAt: Date.now()
      };

      // Optimistically update in-memory campaigns list
      setCampaignsList(prev => prev.map(c => {
        if (c.campaignId === activeSceneInfo.campaignId) {
          return {
            ...c,
            chapters: c.chapters.map(ch => {
              if (ch.chapterId === activeSceneInfo.chapterId) {
                return {
                  ...ch,
                  scenes: ch.scenes.map(sc => sc.sceneId === activeSceneInfo.sceneId ? updatedScene : sc)
                };
              }
              return ch;
            })
          };
        }
        return c;
      }));

      saveSceneToCampaign(activeSceneInfo.campaignId, activeSceneInfo.chapterId, updatedScene).catch(console.warn);
      if (activeMapIdRef.current === liveMapIdRef.current) {
        publishActiveSession({
          sessionId: 'current',
          campaignId: activeSceneInfo.campaignId,
          chapterId: activeSceneInfo.chapterId,
          sceneId: updatedScene.sceneId,
          sceneTitle: updatedScene.sceneTitle,
          mapUrl: updatedScene.mapUrl,
          mapThumbnailUrl: updatedScene.mapThumbnailUrl,
          mapWidth: updatedScene.mapWidth,
          mapHeight: updatedScene.mapHeight,
          dmNotes: updatedScene.dmNotes,
          tokens: updatedScene.tokens,
          gridSize: updatedScene.gridSize,
          gridOpacity: updatedScene.gridOpacity,
          isFogVisible: updatedScene.isFogVisible,
          walls: updatedScene.walls,
          visionConfig: updatedScene.visionConfig,
          roomAnnotations: nextAnnotations,
          boardAnimatedFeatures: updatedScene.boardAnimatedFeatures,
          boardAnimatedEnabled: updatedScene.boardAnimatedEnabled,
          boardWeatherEffect: updatedScene.boardWeatherEffect,
          updatedAt: Date.now()
        }).catch(console.warn);
      }
    }
  };

  const handleStageDblClick = (e: any) => {
    if ((tool === 'hotspot' || tool === 'zone' || tool === 'polygon_zone') && currentZonePolygonPoints.length >= 6) {
      handleCompleteZonePolygon(currentZonePolygonPoints);
    }
  };

  const handleStageMouseDown = (e: any) => {
    setActiveMenu(null);
    if (isSpacePressed || isShiftPanActive) {
      if (stageRef.current) {
        stageRef.current.container().style.cursor = 'grabbing';
      }
      return;
    }
    if ((!image && !videoElement) && tool !== 'draw' && tool !== 'erase') return;

    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const scale = stage.scaleX();
    const point = {
      x: (pointer.x - stage.x()) / scale,
      y: (pointer.y - stage.y()) / scale
    };

    // Right click handling
    if (e.evt.button === 2) {
      if (tool === 'spell_aim') {
        setActiveEquippedAsset(null);
        setAimOrigin(null);
        setAimCurrent(null);
        setTool('pan');
        toast.info('Spell aiming cancelled');
        return;
      }
      if (wallEraseDragStart) {
        setWallEraseDragStart(null);
        setWallEraseDragCurrent(null);
        toast.info('Wall erase cancelled');
        return;
      }
      if (tool === 'hotspot' || tool === 'zone' || tool === 'polygon_zone') {
        if (currentZonePolygonPoints.length > 0) {
          setCurrentZonePolygonPoints([]);
          toast.info('Zone polygon drawing cancelled');
        }
        return;
      }
      if (tool === 'polygon_reveal') {
        setCurrentPolygonPoints([]);
        return;
      }
      if (tool === 'wall' || wallDrawStart) {
        setWallDrawStart(null);
        toast.info('Wall drawing segment cancelled');
        return;
      }
      if (selectedWallId) {
        setSelectedWallId(null);
        return;
      }
    }

    // MistWalker 4.0 Spell & Projectile Aiming (Check before isInteractive so clicking tokens to aim works)
    if (tool === 'spell_aim' && activeEquippedAsset) {
      let originPoint = point;
      let targetNode = e.target;
      while (targetNode && targetNode !== stage) {
        if (targetNode.name() === 'token') {
          const tokenId = targetNode.id?.() || (targetNode as any).attrs?.id;
          const foundToken = tokens.find(t => t.id === tokenId);
          if (foundToken) {
            const tokenRadius = ((foundToken.size || 1) * gridSize) / 2;
            originPoint = { x: foundToken.x + tokenRadius, y: foundToken.y + tokenRadius };
          }
          break;
        }
        targetNode = targetNode.getParent();
      }

      // Point AoE spells (Fireball, Fog Cloud, Web, Darkness, etc.) drop immediately on click!
      if (activeEquippedAsset.paradigm === 'point' || activeEquippedAsset.shape === 'circle' || activeEquippedAsset.paradigm === 'aura') {
        castSpellAt(originPoint, originPoint);
        return;
      }

      // If we already have an aimOrigin set, clicking casts towards this target!
      if (aimOrigin) {
        const dx = originPoint.x - aimOrigin.x;
        const dy = originPoint.y - aimOrigin.y;
        if (Math.hypot(dx, dy) > 20) {
          castSpellAt(aimOrigin, originPoint);
          return;
        }
      }

      // Otherwise, set this click as the spell's starting origin (caster)
      setAimOrigin(originPoint);
      setAimCurrent(originPoint);
      return;
    }

    // Check if we clicked on an existing token or its children
    let target = e.target;
    let isInteractive = false;
    while (target && target !== stage) {
      if (target.name() === 'token') {
        isInteractive = true;
        break;
      }
      target = target.getParent();
    }

    if (isInteractive) {
      return;
    }

    // Wall eraser tool (remove individual sections or start drag cut)
    if (tool === 'erase_wall') {
      const hit = findNearestWall(point.x, point.y, walls, 24 / stageScale);
      if (hit) {
        handleDeleteWall(hit.wall.id);
        return;
      }
      setWallEraseDragStart(point);
      setWallEraseDragCurrent(point);
      return;
    }

    // Wall split tool (split section into two at click point)
    if (tool === 'split_wall') {
      const hit = findNearestWall(point.x, point.y, walls, 25 / stageScale);
      if (hit) {
        const p1 = hit.wall.p1;
        const p2 = hit.wall.p2;
        const l2 = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
        let t = 0.5;
        if (l2 > 0) {
          t = ((point.x - p1.x) * (p2.x - p1.x) + (point.y - p1.y) * (p2.y - p1.y)) / l2;
          t = Math.max(0.1, Math.min(0.9, t));
        }
        const splitPt = snapToGridWalls
          ? snapPointToGrid(p1.x + t * (p2.x - p1.x), p1.y + t * (p2.y - p1.y), gridSize, gridOffsetX, gridOffsetY)
          : { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
        handleSplitWall(hit.wall.id, splitPt);
        return;
      }
      toast.info('Click directly on a wall line to split it');
      return;
    }

    // Wall drawing tool
    if (tool === 'wall') {
      const snappedPt = snapToGridWalls
        ? snapPointToGrid(point.x, point.y, gridSize, gridOffsetX, gridOffsetY)
        : { x: point.x, y: point.y };

      if (!wallDrawStart) {
        setWallDrawStart(snappedPt);
      } else {
        const dx = snappedPt.x - wallDrawStart.x;
        const dy = snappedPt.y - wallDrawStart.y;
        if (Math.hypot(dx, dy) >= 10) {
          const newWall: WallSegment = {
            id: 'wall_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            p1: { ...wallDrawStart },
            p2: snappedPt,
            wallType: activeWallType,
            doorState: (activeWallType === 'door' || activeWallType === 'secret_door') ? activeDoorState : undefined
          };
          setWalls(prev => [...prev, newWall]);
          if (e.evt.ctrlKey || e.evt.metaKey) {
            setWallDrawStart(null);
          } else {
            setWallDrawStart(snappedPt); // Continuous chaining
          }
          toast.success(
            activeWallType === 'door'
              ? 'Door placed'
              : activeWallType === 'secret_door'
              ? 'Secret Door placed (hidden from players)'
              : activeWallType === 'window'
              ? 'Window placed'
              : 'Wall segment placed'
          );
        }
      }
      return;
    }

    // Interactive Polygon Drawing for Rooms & Zones
    if (tool === 'hotspot' || tool === 'zone' || tool === 'polygon_zone') {
      // 1. Check if connecting back to starting vertex to complete polygon (>= 3 vertices / 6 points)
      if (currentZonePolygonPoints.length >= 6) {
        const startX = currentZonePolygonPoints[0];
        const startY = currentZonePolygonPoints[1];
        const dist = Math.hypot(point.x - startX, point.y - startY);
        if (dist < 24 / stageScale) {
          handleCompleteZonePolygon(currentZonePolygonPoints);
          return;
        }
      }

      // 2. Prevent duplicate clicks on the exact same vertex
      if (currentZonePolygonPoints.length >= 2) {
        const lastX = currentZonePolygonPoints[currentZonePolygonPoints.length - 2];
        const lastY = currentZonePolygonPoints[currentZonePolygonPoints.length - 1];
        if (Math.hypot(point.x - lastX, point.y - lastY) < 6 / stageScale) {
          return;
        }
      }

      // 3. Drop vertex into current zone polygon
      setCurrentZonePolygonPoints(prev => [...prev, point.x, point.y]);
      return;
    }

    // In Run Campaign Mode, clicking directly on or near any door toggles it open/closed!
    if (campaignMode === 'run') {
      const nearestDoor = findNearestWall(point.x, point.y, walls.filter(w => w.wallType === 'door' || w.wallType === 'secret_door'), 24 / stageScale);
      if (nearestDoor) {
        handleToggleDoor(nearestDoor.wall.id);
        return;
      }
    }

    if (tool === 'select') {
      // In Creator Mode, check if clicking directly on a wall or door to select or toggle
      if (campaignMode === 'creator') {
        const nearest = findNearestWall(point.x, point.y, walls, 16 / stageScale);
        if (nearest) {
          setSelectedWallId(nearest.wall.id);
          if (nearest.wall.wallType === 'door' || nearest.wall.wallType === 'secret_door') {
            handleToggleDoor(nearest.wall.id);
          } else {
            toast.info(`Selected ${nearest.wall.wallType} wall`);
          }
          return;
        }
        setSelectedWallId(null);
      }

      if (!e.evt.shiftKey) {
        setSelectedTokenIds([]);
      }
      setSelectionBox({
        startX: point.x,
        startY: point.y,
        currentX: point.x,
        currentY: point.y,
        active: true,
      });
      return;
    }

    if (tool === 'reveal') {
      setReveals([...reveals, { x: point.x, y: point.y, radius: brushSize }]);
    } else if (tool === 'polygon_reveal') {
      if (currentPolygonPoints.length >= 6) {
        // Check if clicked near the first point to close
        const startX = currentPolygonPoints[0];
        const startY = currentPolygonPoints[1];
        const dist = Math.sqrt((point.x - startX) ** 2 + (point.y - startY) ** 2);
        if (dist < 20 / stageScale) {
          setPolygonReveals([...polygonReveals, currentPolygonPoints]);
          setCurrentPolygonPoints([]);
          return;
        }
      }
      setCurrentPolygonPoints([...currentPolygonPoints, point.x, point.y]);
    } else if (tool === 'ai-describe') {
      setIsAiDescribing(true);
      setAiDescribeRect({ x: point.x, y: point.y, w: 0, h: 0 });
    } else if (tool === 'measure') {
      setIsMeasuring(true);
      setMeasureStart(point);
      setMeasureEnd(point);
    } else if (tool === 'token' && selectedToken) {
      const snappedX = Math.floor((point.x - gridOffsetX) / gridSize) * gridSize + gridOffsetX;
      const snappedY = Math.floor((point.y - gridOffsetY) / gridSize) * gridSize + gridOffsetY;
      
      const isMonster = selectedToken.category === 'monster' || selectedToken.isMonster === true || isMonsterToken(selectedToken);
      const newToken: Token = {
        id: Math.random().toString(36).substr(2, 9),
        name: selectedToken.name,
        url: selectedToken.url,
        x: snappedX,
        y: snappedY,
        size: selectedToken.size || 1,
        isCondition: CONDITIONS.some(c => c.name === selectedToken.name),
        isPlayer: !isMonster,
        isMonster: isMonster,
        category: isMonster ? 'monster' : (selectedToken.category || 'character'),
        visionEnabled: !isMonster,
        visionRadius: isMonster ? 0 : 60
      };
      setTokens(prev => [...prev, newToken]);
    }
  };

  const handleMouseMove = (e: any) => {
    if (isSpacePressed || isShiftPanActive) return;
    if ((!image && !videoElement) && tool !== 'draw' && tool !== 'erase') return;
    
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const scale = stage.scaleX();
    const point = {
      x: (pointer.x - stage.x()) / scale,
      y: (pointer.y - stage.y()) / scale
    };

    if (tool === 'spell_aim' && activeEquippedAsset) {
      setAimCurrent(point);
      return;
    }



    // Only update React mousePos state if an active drawing tool actually requires cursor tracking
    const isDrawingTool = (
      (tool === 'wall' && wallDrawStart !== null) ||
      (tool === 'polygon_reveal' && currentPolygonPoints.length > 0) ||
      ((tool === 'hotspot' || tool === 'zone' || tool === 'polygon_zone') && currentZonePolygonPoints.length > 0)
    );

    if (isDrawingTool) {
      setMousePos(point);
    }

    if (tool === 'select' && selectionBox?.active) {
      setSelectionBox(prev => prev ? { ...prev, currentX: point.x, currentY: point.y } : null);
      return;
    }

    if (tool === 'erase_wall' && wallEraseDragStart) {
      setWallEraseDragCurrent(point);
      return;
    }

    if (tool === 'reveal' && e.evt.buttons === 1) {
      // Distance-throttle reveal points to prevent creating thousands of redundant Konva circles
      setReveals(prev => {
        if (prev.length > 0) {
          const last = prev[prev.length - 1];
          const dist = Math.hypot(point.x - last.x, point.y - last.y);
          if (dist < Math.max(8, brushSize * 0.25)) {
            return prev;
          }
        }
        return [...prev, { x: point.x, y: point.y, radius: brushSize }];
      });
    } else if (tool === 'polygon_reveal' && currentPolygonPoints.length > 0) {
      setMousePos(point);
    } else if (tool === 'ai-describe' && isAiDescribing && aiDescribeRect) {
      setAiDescribeRect({
        ...aiDescribeRect,
        w: point.x - aiDescribeRect.x,
        h: point.y - aiDescribeRect.y
      });
    } else if (tool === 'measure' && isMeasuring) {
      setMeasureEnd(point);
    }
  };

  const triggerAiDescribe = async (rect: {x: number, y: number, w: number, h: number}) => {
    if (!stageRef.current) return;
    
    // Normalize rect width/height to positive values based on drag direction
    const normX = rect.w < 0 ? rect.x + rect.w : rect.x;
    const normY = rect.h < 0 ? rect.y + rect.h : rect.y;
    const normW = Math.abs(rect.w);
    const normH = Math.abs(rect.h);

    if (normW < 10 || normH < 10) {
      setIsAiDescribing(false);
      setAiDescribeRect(null); // Too small
      return; 
    }

    try {
      setIsAiDescribingLoading(true);
      setAiDescribeError(null);
      setAiDescribeResult(null);

      const hasKey = await (window as any).aistudio?.hasSelectedApiKey?.();
      if (!hasKey && (window as any).aistudio?.openSelectKey) {
        await (window as any).aistudio.openSelectKey();
      }

      // Convert stage coords to pixel coords depending on scale
      // The stage might be zoomed or scaled, so toDataURL uses the pixel bounding box of the viewer.
      // Wait, Konva's toDataURL with x/y/width/height expects absolute stage container positions when capturing stage,
      // but if we want to capture the logical area *within* the stage, we must compute it.
      // Easiest is to capture the layer, but we want the effects too? We just capture the stage.
      const pixelX = normX * stageScale + stagePos.x;
      const pixelY = normY * stageScale + stagePos.y;
      const pixelW = normW * stageScale;
      const pixelH = normH * stageScale;

      const base64Image = stageRef.current.toDataURL({
        x: pixelX,
        y: pixelY,
        width: pixelW,
        height: pixelH,
        pixelRatio: 1.5 // boost res slightly
      });

      const description = await generateDescription(base64Image);
      setAiDescribeResult(description);
      
      // Keep original rect state so the box stays on screen until dismissed,
      // but let's clear the interaction state so user doesn't keep dragging unintentionally
      setIsAiDescribing(false);
    } catch (err: any) {
      console.error(err);
      if (err?.message?.includes("Requested entity was not found") || err?.message?.includes("API key not valid") || err?.status === 401 || err?.status === 403) {
         setAiDescribeError("Gemini API Key missing or invalid. Please connect your key using the 'API' button.");
         await (window as any).aistudio?.openSelectKey?.();
      } else {
         setAiDescribeError(err.message || 'Failed to describe area.');
      }
      setIsAiDescribing(false);
    } finally {
      setIsAiDescribingLoading(false);
    }
  };

  const handleMouseUp = (e?: any) => {
    if (isSpacePressed || isShiftPanActive) {
      if (stageRef.current) {
        stageRef.current.container().style.cursor = 'grab';
      }
      return;
    }

    if (tool === 'spell_aim' && activeEquippedAsset && aimOrigin && aimCurrent) {
      const dx = aimCurrent.x - aimOrigin.x;
      const dy = aimCurrent.y - aimOrigin.y;
      const dist = Math.hypot(dx, dy);

      // Only trigger drag-cast if the user dragged significantly (> 25px)
      if (dist > 25) {
        castSpellAt(aimOrigin, aimCurrent);
        return;
      }
    }

    if (tool === 'erase_wall' && wallEraseDragStart) {
      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition();
      let currentPt = wallEraseDragCurrent;
      if (!currentPt && stage && pointer) {
        const scale = stage.scaleX();
        currentPt = {
          x: (pointer.x - stage.x()) / scale,
          y: (pointer.y - stage.y()) / scale
        };
      }
      if (currentPt) {
        const dist = Math.hypot(currentPt.x - wallEraseDragStart.x, currentPt.y - wallEraseDragStart.y);
        if (dist >= 10 / stageScale) {
          const toErase = walls.filter(w =>
            segmentsIntersect(wallEraseDragStart, currentPt!, w.p1, w.p2)
          );
          if (toErase.length > 0) {
            const ids = toErase.map(w => w.id);
            setWalls(prev => prev.filter(w => !ids.includes(w.id)));
            if (selectedWallId && ids.includes(selectedWallId)) setSelectedWallId(null);
            toast.success(`Removed ${ids.length} wall section${ids.length > 1 ? 's' : ''}`);
          }
        }
      }
      setWallEraseDragStart(null);
      setWallEraseDragCurrent(null);
      return;
    }
    if (tool === 'select' && selectionBox?.active) {
      const minX = Math.min(selectionBox.startX, selectionBox.currentX);
      const maxX = Math.max(selectionBox.startX, selectionBox.currentX);
      const minY = Math.min(selectionBox.startY, selectionBox.currentY);
      const maxY = Math.max(selectionBox.startY, selectionBox.currentY);
      const width = maxX - minX;
      const height = maxY - minY;

      if (width > 6 || height > 6) {
        const hitTokenIds = tokens.filter(t => {
          const tWidth = gridSize * t.size;
          const tHeight = gridSize * t.size;
          const tCenterX = t.x + tWidth / 2;
          const tCenterY = t.y + tHeight / 2;
          return tCenterX >= minX && tCenterX <= maxX && tCenterY >= minY && tCenterY <= maxY;
        }).map(t => t.id);

        if (hitTokenIds.length > 0) {
          setSelectedTokenIds(prev => e?.evt?.shiftKey ? Array.from(new Set([...prev, ...hitTokenIds])) : hitTokenIds);
          toast.info(`Selected ${hitTokenIds.length} item(s)`);
        }
      }
      setSelectionBox(null);
    }
    if (tool === 'ai-describe' && isAiDescribing && aiDescribeRect) {
      triggerAiDescribe(aiDescribeRect);
      return; // Handled async
    }
    if (tool === 'measure') {
      setIsMeasuring(false);
    }
  };

  const handleNudgeSelected = (dx: number, dy: number) => {
    setTokens(prev => {
      const next = prev.map(t => {
        if (selectedTokenIds.includes(t.id)) {
          const newX = t.x + dx * gridSize;
          const newY = t.y + dy * gridSize;
          if (socketRef.current?.connected && (activeMapIdRef.current === liveMapIdRef.current)) {
            socketRef.current.emit('MOVE_TOKEN', { id: t.id, x: newX, y: newY });
          }
          return {
            ...t,
            x: newX,
            y: newY
          };
        }
        return t;
      });
      if (mapsDataRef.current[activeMapId]) {
        mapsDataRef.current[activeMapId].tokens = next;
      }
      if (socketRef.current?.connected && (activeMapIdRef.current === liveMapIdRef.current)) {
        socketRef.current.emit('SYNC_TOKENS', next);
      }
      return next;
    });
  };

  const handleDeleteSelected = () => {
    const count = selectedTokenIds.length;
    if (count > 0) {
      setTokens(prev => {
        const next = prev.filter(t => !selectedTokenIds.includes(t.id));
        if (mapsDataRef.current[activeMapId]) {
          mapsDataRef.current[activeMapId].tokens = next;
        }
        if (socketRef.current?.connected && (activeMapIdRef.current === liveMapIdRef.current)) {
          socketRef.current.emit('SYNC_TOKENS', next);
        }
        return next;
      });
      setSelectedTokenIds([]);
      toast.success(`Removed ${count} token(s)`);
    }
  };

  const handleToggleDoor = useCallback((wallId: string) => {
    setWalls(prev => {
      let doorChanged = false;
      let isSecret = false;
      let nextState: DoorState = 'open';
      const updated = prev.map(w => {
        if (w.id === wallId && (w.wallType === 'door' || w.wallType === 'secret_door')) {
          doorChanged = true;
          isSecret = w.wallType === 'secret_door';
          nextState = w.doorState === 'open' ? 'closed' : 'open';
          return { ...w, doorState: nextState };
        }
        return w;
      });
      if (doorChanged) {
        toast.info(`${isSecret ? 'Secret Door' : 'Door'} ${nextState.toUpperCase()}`, {
          icon: isSecret ? '🗝️' : '🚪'
        });
        if (socketRef.current?.connected && (activeMapIdRef.current === liveMapIdRef.current)) {
          socketRef.current.emit('SYNC_STATE', { walls: updated });
        }
      }
      if (mapsDataRef.current[activeMapId]) {
        mapsDataRef.current[activeMapId].walls = updated;
      }
      return updated;
    });
  }, [activeMapId]);

  const handleModeChange = useCallback((newMode: CampaignMode) => {
    setCampaignMode(newMode);
    if (newMode === 'creator') {
      setTool('wall');
      toast.info('Switched to Creator Mode: Draw wall lines and doors', {
        icon: '🔨'
      });
    } else {
      if (tool === 'wall') {
        setTool('select');
      }
      setSelectedWallId(null);
      setWallDrawStart(null);
      toast.info('Switched to Run Campaign Mode: Lines hidden, click doors to open', {
        icon: '⚔️'
      });
    }
  }, [tool]);

  const handleDeleteWall = useCallback((wallId: string) => {
    setWalls(prev => prev.filter(w => w.id !== wallId));
    setSelectedWallId(curr => curr === wallId ? null : curr);
    toast.info('Wall section deleted');
  }, []);

  const handleSplitWall = useCallback((wallId: string, splitPoint?: { x: number; y: number }) => {
    setWalls(prev => {
      const wall = prev.find(w => w.id === wallId);
      if (!wall) return prev;
      const pt = splitPoint || {
        x: Math.round((wall.p1.x + wall.p2.x) / 2),
        y: Math.round((wall.p1.y + wall.p2.y) / 2)
      };
      const seg1: WallSegment = {
        ...wall,
        id: 'wall_' + Date.now() + '_a',
        p2: pt
      };
      const seg2: WallSegment = {
        ...wall,
        id: 'wall_' + (Date.now() + 1) + '_b',
        p1: pt
      };
      return [...prev.filter(w => w.id !== wallId), seg1, seg2];
    });
    setSelectedWallId(null);
    toast.success('Wall split into 2 sections');
  }, []);

  const handleUpdateWall = useCallback((updatedWall: WallSegment) => {
    setWalls(prev => prev.map(w => w.id === updatedWall.id ? updatedWall : w));
  }, []);

  const handleClearWalls = useCallback(() => {
    setWalls([]);
    setSelectedWallId(null);
    setWallDrawStart(null);
    toast.success('All walls and doors cleared');
  }, []);

  const handleGeneratePresetRoom = useCallback(() => {
    const dims = getMapDimensions();
    const cx = Math.round(dims.width / 2 / gridSize) * gridSize;
    const cy = Math.round(dims.height / 2 / gridSize) * gridSize;
    const rw = 8 * gridSize;
    const rh = 6 * gridSize;
    const hw = rw / 2;
    const hh = rh / 2;

    const x1 = cx - hw;
    const y1 = cy - hh;
    const x2 = cx + hw;
    const y2 = cy + hh;

    const newWalls: WallSegment[] = [
      { id: 'wall_' + Date.now() + '_1', p1: { x: x1, y: y1 }, p2: { x: x2, y: y1 }, wallType: 'normal' },
      { id: 'wall_' + Date.now() + '_2', p1: { x: x2, y: y1 }, p2: { x: x2, y: y2 }, wallType: 'normal' },
      { id: 'wall_' + Date.now() + '_3a', p1: { x: x1, y: y2 }, p2: { x: cx - gridSize, y: y2 }, wallType: 'normal' },
      { id: 'wall_' + Date.now() + '_door', p1: { x: cx - gridSize, y: y2 }, p2: { x: cx + gridSize, y: y2 }, wallType: 'door', doorState: 'closed' },
      { id: 'wall_' + Date.now() + '_3b', p1: { x: cx + gridSize, y: y2 }, p2: { x: x2, y: y2 }, wallType: 'normal' },
      { id: 'wall_' + Date.now() + '_4', p1: { x: x1, y: y2 }, p2: { x: x1, y: y1 }, wallType: 'normal' }
    ];

    setWalls(prev => [...prev, ...newWalls]);
    toast.success('Generated dungeon chamber with reinforced door');
  }, [gridSize]);

  const handleUpdateTokenVision = useCallback((tokenId: string, updates: { visionRadius?: number; visionAngle?: number }) => {
    setTokens(prev => prev.map(t => {
      if (t.id === tokenId) {
        const isAlly = t.category === 'ally' || !!(t as any).allyId;
        const isMonster = !isAlly && (isMonsterToken(t) || t.isMonster === true || t.category === 'monster' || t.isPlayer === false);
        if (isMonster) {
          return {
            ...t,
            isMonster: true,
            isPlayer: false,
            category: 'monster',
            visionEnabled: false,
            visionRadius: 0
          };
        }
        return {
          ...t,
          ...updates
        };
      }
      return t;
    }));
    toast.success('Updated token vision & lighting');
  }, []);

  const handleDuplicateSelected = () => {
    const toDuplicate = tokens.filter(t => selectedTokenIds.includes(t.id));
    if (toDuplicate.length === 0) return;
    const newTokens: Token[] = toDuplicate.map(t => {
      const isAlly = t.category === 'ally' || !!(t as any).allyId;
      const isMonster = !isAlly && (isMonsterToken(t) || t.isMonster === true || t.category === 'monster' || t.isPlayer === false);
      return {
        ...t,
        id: Math.random().toString(36).substr(2, 9),
        name: `${t.name} (Copy)`,
        x: t.x + gridSize,
        y: t.y + gridSize,
        isPlayer: !isMonster && !isAlly,
        isMonster: isMonster,
        category: isMonster ? 'monster' : (isAlly ? 'ally' : (t.category || 'character')),
        visionEnabled: !isMonster,
        visionRadius: isMonster ? 0 : (t.visionRadius ?? 60),
        ...(t.allyId ? { allyId: t.allyId } : {})
      };
    });
    setTokens(prev => [...prev, ...newTokens]);
    setSelectedTokenIds(newTokens.map(t => t.id));
    toast.success(`Duplicated ${newTokens.length} token(s)`);
  };

  const handleStartRenameToken = (tokenId: string, currentName: string) => {
    setEditingTokenNameId(tokenId);
    setEditingTokenNameText(currentName);
  };

  const handleSaveTokenName = (tokenId?: string) => {
    const targetId = tokenId || editingTokenNameId;
    if (!targetId || targetId === 'batch') return;

    const trimmed = editingTokenNameText.trim();
    if (!trimmed) {
      setEditingTokenNameId(null);
      return;
    }

    const oldToken = tokens.find(t => t.id === targetId);
    if (!oldToken) {
      setEditingTokenNameId(null);
      return;
    }

    setTokens(prev => prev.map(t => (t.id === targetId ? { ...t, name: trimmed } : t)));

    // Synchronize combat tracker if this token or name was active
    setCombatTrackerCombatants(prev =>
      prev.map(c => (c.id === targetId || c.name === oldToken.name ? { ...c, name: trimmed } : c))
    );

    setEditingTokenNameId(null);
    toast.success(`Renamed token to "${trimmed}"`);
  };

  const handleSaveBatchTokenNames = () => {
    const trimmed = editingTokenNameText.trim();
    if (!trimmed || selectedTokenIds.length === 0) {
      setEditingTokenNameId(null);
      return;
    }

    setTokens(prev => {
      let index = 1;
      return prev.map(t => {
        if (selectedTokenIds.includes(t.id)) {
          const newName = selectedTokenIds.length > 1 ? `${trimmed} ${index++}` : trimmed;
          return { ...t, name: newName };
        }
        return t;
      });
    });

    setEditingTokenNameId(null);
    toast.success(`Renamed ${selectedTokenIds.length} token(s)`);
  };

  // Reset rename mode if the token is deselected
  useEffect(() => {
    if (editingTokenNameId && editingTokenNameId !== 'batch' && !selectedTokenIds.includes(editingTokenNameId)) {
      setEditingTokenNameId(null);
    } else if (editingTokenNameId === 'batch' && selectedTokenIds.length === 0) {
      setEditingTokenNameId(null);
    }
  }, [selectedTokenIds, editingTokenNameId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedWallId) {
          e.preventDefault();
          handleDeleteWall(selectedWallId);
        } else if (selectedTokenIds.length > 0) {
          e.preventDefault();
          handleDeleteSelected();
        }
      } else if (e.key === 'Escape') {
        if (wallDrawStart) {
          setWallDrawStart(null);
        }
        if (selectedWallId) {
          setSelectedWallId(null);
        }
        setSelectedTokenIds([]);
        setSelectionBox(null);
      } else if (selectedTokenIds.length > 0 && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowUp') dy = -1;
        if (e.key === 'ArrowDown') dy = 1;
        if (e.key === 'ArrowLeft') dx = -1;
        if (e.key === 'ArrowRight') dx = 1;
        handleNudgeSelected(dx, dy);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTokenIds, gridSize, tokens, selectedWallId, wallDrawStart, handleDeleteWall, handleDeleteSelected]);

  // Spacebar hold-to-pan handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable ||
          target.closest('input, textarea, select, [contenteditable="true"]'))
      ) {
        return;
      }

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (!spacePanActiveRef.current) {
          spacePanActiveRef.current = true;
          setIsSpacePressed(true);
          if (stageRef.current) {
            stageRef.current.container().style.cursor = 'grab';
          }
        }
      } else if (e.key === 'Shift') {
        if (!shiftPanActiveRef.current) {
          shiftPanActiveRef.current = true;
          setIsShiftPressed(true);
          if (stageRef.current) {
            stageRef.current.container().style.cursor = 'grab';
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        if (spacePanActiveRef.current) {
          spacePanActiveRef.current = false;
          setIsSpacePressed(false);
          if (stageRef.current) {
            stageRef.current.container().style.cursor =
              tool === 'pan' ? 'grab' : tool === 'select' ? 'default' : 'crosshair';
          }
        }
      } else if (e.key === 'Shift') {
        if (shiftPanActiveRef.current) {
          shiftPanActiveRef.current = false;
          setIsShiftPressed(false);
          if (stageRef.current) {
            stageRef.current.container().style.cursor =
              tool === 'pan' ? 'grab' : tool === 'select' ? 'default' : 'crosshair';
          }
        }
      }
    };

    const handleBlur = () => {
      if (spacePanActiveRef.current) {
        spacePanActiveRef.current = false;
        setIsSpacePressed(false);
      }
      if (shiftPanActiveRef.current) {
        shiftPanActiveRef.current = false;
        setIsShiftPressed(false);
      }
      if (stageRef.current) {
        stageRef.current.container().style.cursor =
          tool === 'pan' ? 'grab' : tool === 'select' ? 'default' : 'crosshair';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [tool]);

  // Keep stage container cursor in sync with tool and spacebar or shift hold
  useEffect(() => {
    if (stageRef.current) {
      const container = stageRef.current.container();
      if (container) {
        if (isSpacePressed || isShiftPanActive || tool === 'pan') {
          container.style.cursor = 'grab';
        } else if (tool === 'select') {
          container.style.cursor = 'default';
        } else {
          container.style.cursor = 'crosshair';
        }
      }
    }
  }, [isSpacePressed, isShiftPanActive, tool]);

  const resetFog = () => {
    setReveals([]);
    setPolygonReveals([]);
    setCurrentPolygonPoints([]);
    setIsFogVisible(true);
    setFogResetKey(prev => prev + 1);

    if (mapsDataRef.current[activeMapId]) {
      mapsDataRef.current[activeMapId].reveals = [];
      mapsDataRef.current[activeMapId].polygonReveals = [];
      mapsDataRef.current[activeMapId].isFogVisible = true;
    }

    if (socketRef.current?.connected && (activeMapIdRef.current === liveMapIdRef.current)) {
      socketRef.current.emit('SYNC_STATE', {
        reveals: [],
        polygonReveals: [],
        isFogVisible: true
      });
    }

    toast.success('Fog of War reset to default (all reveals erased)');
  };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    
    const scaleBy = 1.1;
    const stage = stageRef.current;
    const oldScale = stage.scaleX();

    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    const fx = document.getElementById('main-animated-fx-overlay');
    if (fx) {
      const { width: mapW, height: mapH } = getMapDimensions();
      fx.style.left = `${newPos.x}px`;
      fx.style.top = `${newPos.y}px`;
      fx.style.width = `${mapW * newScale}px`;
      fx.style.height = `${mapH * newScale}px`;
    }

    setStageScale(newScale);
    setStagePos(newPos);
  };



  const handleMapSwitch = (newMapId: 'DM1' | 'DM2' | 'DM3') => {
    if (activeMapId === newMapId) return;

    // Prevent any initial auto-restoration from interfering with switching to empty slots
    hasRestoredInitialSessionRef.current = true;
    isSwitchingMapSlotRef.current = true;
    lastSlotSwitchTimeRef.current = Date.now();

    // Save current active map layer
    mapsDataRef.current[activeMapId] = {
      imageFile,
      mapType,
      videoSize,
      mapRotation,
      stageScale,
      stagePos,
      reveals,
      polygonReveals,
      isFogVisible,
      tokens,
      gridVisible,
      gridOpacity,
      gridSize,
      gridOffsetX,
      gridOffsetY,
      boardAnimatedFeatures,
      boardAnimatedEnabled,
      boardWeatherEffect,
      walls,
      visionConfig,
      roomAnnotations,
      activeSceneInfo,
      activeDmNotes
    };

    // Reset in-progress drawing & transient selection states so they do not bleed into the other slot
    setCurrentZonePolygonPoints([]);
    setWallDrawStart(null);
    setSelectedWallId(null);
    setSelectedZoneForSidePanel(null);
    setIsZoneEditorOpen(false);
    setIsZoneSidePanelOpen(false);
    setMeasureStart(null);
    setMeasureEnd(null);
    setSelectedTokenIds([]);

    // Load new map layer
    const next = mapsDataRef.current[newMapId];
    if (next) {
      setImageFile(next.imageFile);
      setMapType(next.mapType || 'image');
      setVideoSize(next.videoSize || { width: 0, height: 0 });
      setMapRotation(next.mapRotation || 0);
      setStageScale(next.stageScale || 1);
      setStagePos(next.stagePos || { x: 0, y: 0 });
      setReveals(next.reveals || []);
      setPolygonReveals(next.polygonReveals || []);
      setIsFogVisible(next.isFogVisible !== undefined ? next.isFogVisible : true);
      setTokens(next.tokens || []);
      setGridVisible(next.gridVisible !== undefined ? next.gridVisible : true);
      setGridOpacity(next.gridOpacity !== undefined ? next.gridOpacity : 0.3);
      setGridSize(next.gridSize || 50);
      setGridOffsetX(next.gridOffsetX || 0);
      setGridOffsetY(next.gridOffsetY || 0);
      setBoardAnimatedFeatures(next.boardAnimatedFeatures || []);
      setBoardAnimatedEnabled(next.boardAnimatedEnabled !== undefined ? next.boardAnimatedEnabled : true);
      setBoardWeatherEffect(next.boardWeatherEffect || 'none');
      setWalls(next.walls || []);
      setRoomAnnotations(next.roomAnnotations || []);
      if (next.visionConfig) setVisionConfig(next.visionConfig);
      setActiveSceneInfo(next.activeSceneInfo || null);
      setActiveDmNotes(next.activeDmNotes || '');
    } else {
      // Empty map - completely blank layer, guarantee no walls, no polygon rooms, no tokens
      setImageFile(null);
      setMapType('image');
      setVideoSize({ width: 0, height: 0 });
      setMapRotation(0);
      setStageScale(1);
      setStagePos({ x: 0, y: 0 });
      setReveals([]);
      setPolygonReveals([]);
      setIsFogVisible(true);
      setTokens([]);
      setBoardAnimatedFeatures([]);
      setBoardAnimatedEnabled(true);
      setBoardWeatherEffect('none');
      setWalls([]);
      setRoomAnnotations([]);
      setActiveSceneInfo(null);
      setActiveDmNotes('');
      setVisionConfig({
        enabled: true,
        explorationMemory: true,
        darknessOpacity: 1.0,
        dimVisionOpacity: 0.5,
        ambientLight: false,
        dmPreviewMode: false
      });
    }

    setActiveMapId(newMapId);
    activeMapIdRef.current = newMapId;
    setActiveMenu(null);

    setTimeout(() => {
      isSwitchingMapSlotRef.current = false;
    }, 800);

    const isLive = newMapId === liveMapIdRef.current;
    toast.info(`Switched to slot ${newMapId}${next ? '' : ' (Blank layer)'}${isLive ? ' [Live on Players]' : ' [Private DM Prep]'}`);
  };

  const handleClearMapSlot = (slotId?: 'DM1' | 'DM2' | 'DM3') => {
    const targetSlot = slotId || activeMapId;
    mapsDataRef.current[targetSlot] = null;
    if (targetSlot === activeMapId) {
      setImageFile(null);
      setMapType('image');
      setVideoSize({ width: 0, height: 0 });
      setMapRotation(0);
      setStageScale(1);
      setStagePos({ x: 0, y: 0 });
      setReveals([]);
      setPolygonReveals([]);
      setIsFogVisible(true);
      setTokens([]);
      setBoardAnimatedFeatures([]);
      setBoardAnimatedEnabled(true);
      setBoardWeatherEffect('none');
      setWalls([]);
      setRoomAnnotations([]);
      setCurrentZonePolygonPoints([]);
      setWallDrawStart(null);
      setSelectedWallId(null);
      setSelectedZoneForSidePanel(null);
      setIsZoneEditorOpen(false);
      setIsZoneSidePanelOpen(false);
      setActiveSceneInfo(null);
      setActiveDmNotes('');
      setMeasureStart(null);
      setMeasureEnd(null);
      setSelectedTokenIds([]);
      setUnsavedSceneBackup(null);
      setUnsavedSceneBackupWasCrash(false);
      try {
        localStorage.removeItem('mistwalker_dm_state_backup_v1');
        localStorage.removeItem('mistwalker_crash_detected');
      } catch {}
    }
    toast.info(`Slot ${targetSlot} reset to blank`);
  };

  const handleLoreChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loreChatInput.trim() || isLoreChatting) return;

    const userMessage = loreChatInput;
    setLoreChatInput('');
    setLoreError(null);
    setIsLoreChatting(true);

    const newHistory: typeof loreHistory = [
      ...loreHistory,
      { role: 'user', parts: [{ text: userMessage }] }
    ];
    setLoreHistory(newHistory);

    try {
      const hasKey = await (window as any).aistudio?.hasSelectedApiKey?.();
      if (!hasKey && (window as any).aistudio?.openSelectKey) {
        await (window as any).aistudio.openSelectKey();
      }

      // Convert format for RAG
      const historyForApi = loreHistory.map(h => ({
        role: h.role,
        parts: h.parts
      }));

      const modelResponse = await chatWithLore(historyForApi, userMessage, loreSources);
      
      setLoreHistory([
        ...newHistory,
        { role: 'model', parts: [{ text: modelResponse }] }
      ]);
    } catch (err: any) {
      console.error(err);
      if (err?.message?.includes("Requested entity was not found") || err?.message?.includes("API key not valid") || err?.status === 401 || err?.status === 403) {
         setLoreError("Gemini API Key missing or invalid. Please connect your key using the 'API' button in the toolbar.");
         await (window as any).aistudio?.openSelectKey?.();
      } else {
         setLoreError(err.message || 'Failed to process lore query.');
      }
    } finally {
      setIsLoreChatting(false);
    }
  };

  const handleAddTextLore = () => {
    if (!newLoreTitle.trim() || !newLoreText.trim()) return;
    setLoreSources([
      ...loreSources,
      {
        id: Math.random().toString(36).substring(7),
        name: newLoreTitle,
        type: 'text',
        content: newLoreText
      }
    ]);
    setNewLoreTitle('');
    setNewLoreText('');
  };

  const handleAddPdfLore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
       toast.error("Only PDF files are supported.");
       return;
    }
    
    // File size check (e.g., max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("PDF file is too large. Max 10MB allowed.");
      return;
    }

    try {
      const asset = await uploadAndRegisterAsset(file, 'pdf');
      setLoreSources(prev => [
        ...prev,
        {
          id: asset.assetId,
          name: asset.name,
          type: 'pdf',
          content: asset.url
        }
      ]);
      toast.success(`Lore PDF "${asset.name}" saved to Firebase`);
    } catch (err) {
      console.warn("Upload to Firebase storage failed, using local reader:", err);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result && typeof event.target.result === 'string') {
          setLoreSources(prev => [
            ...prev,
            {
              id: Math.random().toString(36).substring(7),
              name: file.name,
              type: 'pdf',
              content: event.target?.result as string
            }
          ]);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleAutoDMSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!autoDMChatInput.trim() || isAutoDMThinking) return;

    const userMsg = autoDMChatInput;
    setAutoDMChatInput('');
    setIsAutoDMThinking(true);

    const newHistory: typeof autoDMHistory = [
      ...autoDMHistory,
      { role: 'user', text: userMsg }
    ];
    setAutoDMHistory(newHistory);

    try {
      const hasKey = await (window as any).aistudio?.hasSelectedApiKey?.();
      if (!hasKey && (window as any).aistudio?.openSelectKey) {
        await (window as any).aistudio.openSelectKey();
      }

      const mapStateText = `Tokens:\n${tokens.map(t => `- ${t.name} (ID: ${t.id}) at X:${Math.round(t.x)}, Y:${Math.round(t.y)}`).join('\n')}\nGrid Size: ${gridSize}px`;

      const historyForApi = newHistory.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      }));

      const { text, functionCalls } = await chatWithAutoDM(historyForApi, mapStateText);

      // Rules Check Layer ("The Ref")
      if (useRulesEngine && functionCalls.length > 0) {
        const actionDesc = functionCalls.map(c => `${c.name}(${JSON.stringify(c.args)})`).join(', ');
        const ruleCheck = await checkActionRules(actionDesc, turnState);
        if (!ruleCheck.allowed) {
          setRulesViolations(prev => [...prev, ruleCheck.reason]);
          setIsAutoDMThinking(false);
          setAutoDMHistory([
            ...newHistory,
            { role: 'model', text: `⚠️ RULES VIOLATION: ${ruleCheck.reason}\n\nI must adjust my actions...` }
          ]);
          return;
        }
      }

      // Execute Functions
      for (const call of functionCalls) {
        if (call.name === 'move_token') {
          setTokens(prev => prev.map(t => t.id === call.args.id ? { ...t, x: call.args.x, y: call.args.y } : t));
        } else if (call.name === 'update_hp') {
           console.log(`HP Update: ${call.args.id} changed by ${call.args.hpDelta}`);
        } else if (call.name === 'set_atmosphere') {
          setAtmosphere(prev => ({
            ...prev,
            lighting: call.args.lighting || prev.lighting,
            brightness: call.args.brightness || prev.brightness,
            ambientSound: call.args.ambientSound || prev.ambientSound,
            isRaining: call.args.isRaining ?? prev.isRaining,
            isFoggy: call.args.isFoggy ?? prev.isFoggy
          }));
        } else if (call.name === 'speak_as') {
          const speaker = tokens.find(t => t.id === call.args.id);
          const voiceName = speaker?.voice || 'Kore';
          playTTS(call.args.text, voiceName);
        }
      }

      setAutoDMHistory([
        ...newHistory,
        { role: 'model', text: text || `Auto-DM performed ${functionCalls.length} actions.` }
      ]);
      
      if (text) {
         // Default narration voice
         playTTS(text, 'Kore');
      }

    } catch(err: any) {
      console.error("Auto DM Error", err);
      setAutoDMHistory([
        ...newHistory,
        { role: 'model', text: `[Error: ${err.message}]` }
      ]);
    } finally {
      setIsAutoDMThinking(false);
    }
  };

  const playTTS = async (text: string, voiceName?: string) => {
    if (isPlayingAudio) {
      audioNarration.stop();
      return;
    }
    try {
      const audioUrl = await audioNarration.play({
        text,
        voiceId: voiceName || selectedAIVoice,
      });
      if (audioUrl) {
        setLastAudioUrl(audioUrl);
        socketRef.current?.emit('SYNC_AUDIO', {
          url: audioUrl,
          label: 'AI Narrator'
        });
      }
    } catch (err) {
      console.error("TTS Error:", err);
      toast.error("Failed to generate narration audio.");
    }
  };

  const zoomIn = () => {
    setStageScale(s => s * 1.2);
  };

  const zoomOut = () => {
    setStageScale(s => s / 1.2);
  };

  const handleToolMenuToggle = (newTool: string, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuAnchor({ top: rect.top, bottom: window.innerHeight - rect.bottom });
    if (tool === 'reveal' && newTool === 'reveal') {
      setTool('polygon_reveal'); 
    } else if (tool === 'polygon_reveal' && newTool === 'reveal') {
      setTool('reveal');
    } else {
      setTool(newTool as any);
    }
  };

  const handleMenuClick = (menu: 'instant' | 'persistent' | 'aura' | 'tokens' | 'conditions' | 'combat' | 'dice' | 'music' | 'grid', e: React.MouseEvent) => {
    if (activeMenu === menu) {
      setActiveMenu(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setMenuAnchor({ top: rect.top, bottom: window.innerHeight - rect.bottom });
      setActiveMenu(menu);
    }
  };

  return (
    <>
    <Toaster theme="dark" position="bottom-right" richColors />
    <div className="flex flex-col h-screen bg-[#0d0d0e] text-zinc-100 font-sans overflow-hidden relative">
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, rgba(255,100,0,0.1) 0%, transparent 70%)' }}></div>

      {/* Main Content */}
      <main className={`flex-1 flex relative overflow-hidden bg-[#09090b] ${isShaking ? 'animate-shake' : ''}`} ref={containerRef}>
        {/* Critical Hit Impact Flash Overlay */}
        {isShaking && (
          <div className="absolute inset-0 pointer-events-none z-[999] animate-crit-flash bg-red-600/30" />
        )}
        {/* Main Screen Fantasy Wallpaper / Scene Backdrop Background */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
          <img
            src={imageFile ? sceneBackdropImage : homeBackgroundImage}
            alt={imageFile ? "MistWalker Scene Backdrop" : "MistWalker Campaign Wallpaper"}
            className={`w-full h-full object-cover object-center transition-all duration-700 ${
              imageFile
                ? 'filter brightness-[0.75] contrast-[1.1] opacity-85'
                : 'filter brightness-[0.88] contrast-[1.05]'
            }`}
          />
          {imageFile ? (
            <>
              {/* Subtle ambient mist vignette for scene backdrop so map and tokens stand out */}
              <div className="absolute inset-0 bg-black/35" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(9,9,11,0.65)_100%)]" />
            </>
          ) : (
            <>
              {/* Dark Overlay with Transparency - balanced midpoint */}
              <div className="absolute inset-0 bg-zinc-950/58" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-zinc-950/25 to-zinc-950/65" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(9,9,11,0.62)_100%)]" />
            </>
          )}
        </div>
        {/* Consolidated Left-Hand Menu */}
        <LeftSidebar
          isPlayerView={false}
          activeMapId={activeMapId}
          liveMapId={liveMapId}
          onForceSync={handleForceSyncToPlayers}
          activeEquippedAsset={activeEquippedAsset}
          onEquipAsset={handleEquipAsset}
          onQuickPlaceAsset={handleQuickPlaceAsset}
          onClearEffects={handleClearEffects}
          handleMapSwitch={handleMapSwitch}
          onClearMapSlot={handleClearMapSlot}
          handleFileUpload={handleFileUpload}
          onRelinkMap={() => relinkMapFileInputRef.current?.click()}
          showCombatTracker={showCombatTracker}
          setShowCombatTracker={setShowCombatTracker}
          triggerShake={triggerShake}
          isFogVisible={isFogVisible}
          setIsFogVisible={setIsFogVisible}
          resetFog={resetFog}
          gridVisible={gridVisible}
          setGridVisible={setGridVisible}
          gridOpacity={gridOpacity}
          setGridOpacity={setGridOpacity}
          gridSize={gridSize}
          setGridSize={setGridSize}
          gridOffsetX={gridOffsetX}
          setGridOffsetX={setGridOffsetX}
          gridOffsetY={gridOffsetY}
          setGridOffsetY={setGridOffsetY}
          sidebarMode={sidebarMode}
          setSidebarMode={setSidebarMode}
          tool={tool}
          setTool={setTool}
          brushSize={brushSize}
          setBrushSize={setBrushSize}
          setCurrentPolygonPoints={setCurrentPolygonPoints}
          measureType={measureType}
          setMeasureType={setMeasureType}
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          menuAnchor={menuAnchor}
          handleToolMenuToggle={handleToolMenuToggle}
          handleMenuClick={handleMenuClick}
          tokens={tokens}
          setTokens={setTokens}
          customTokens={customTokens}
          setCustomTokens={setCustomTokens}
          handleTokenUpload={handleTokenUpload}
          selectedUploadSize={selectedUploadSize}
          setSelectedUploadSize={setSelectedUploadSize}
          tokenFileInputRef={tokenFileInputRef}
          stagePos={stagePos}
          stageScale={stageScale}
          auraColor={auraColor}
          setAuraColor={setAuraColor}
          dicePool={dicePool}
          addDiceToPool={addDiceToPool}
          clearDicePool={clearDicePool}
          rollDicePool={rollDicePool}
          diceHistory={diceHistory}
          setShowCinematicMapGenerator={setShowCinematicMapGenerator}
          onOpenApiKeyModal={() => {
            setSettingsInitialTab('ai');
            setShowSettingsModal(true);
          }}
          onOpenSettings={(tab) => {
            if (tab) setSettingsInitialTab(tab);
            setShowSettingsModal(true);
          }}
          hasApiKey={hasApiKey}
          showDndChatbot={showDndChatbot}
          setShowDndChatbot={setShowDndChatbot}
          selectedAIVoice={selectedAIVoice}
          setSelectedAIVoice={setSelectedAIVoice}
          aiVoicePrompt={aiVoicePrompt}
          setAIVoicePrompt={setAIVoicePrompt}
          aiVoiceScript={aiVoiceScript}
          setAIVoiceScript={setAIVoiceScript}
          handleGenerateAIScript={handleGenerateAIScript}
          handleSpeakAIVoice={handleSpeakAIVoice}
          isGeneratingScript={isGeneratingScript}
          isPlayingAudio={isPlayingAudio}
          zoomIn={zoomIn}
          zoomOut={zoomOut}
          availableTokens={AVAILABLE_TOKENS}
          conditions={CONDITIONS}
          voices={VOICES}
          onOpenCampaignBuilder={() => setShowCampaignBuilder(true)}
          onOpenSaveCampaign={() => setShowSaveToCampaignModal(true)}
          onOpenLoadCampaign={() => setShowLoadCampaignModal(true)}
          onOpenMonsterCompendium={handleOpenMonsterCompendium}
          onOpenCharacterCompendium={handleOpenCharacterCompendium}
          onOpenAlliesCompendium={handleOpenAlliesCompendium}
          onOpenDdbSync={() => setShowDdbModal(true)}
          compendiumMonsters={compendiumMonsters}
          compendiumCharacters={compendiumCharacters}
          compendiumAllies={compendiumAllies}
          selectedTokenIds={selectedTokenIds}
          activeSceneInfo={activeSceneInfo}
          onQuickSave={handleQuickSaveScene}
          isQuickSaving={isQuickSaving}
          uploadedMaps={uploadedMaps}
          onSelectUploadedMap={handleSelectUploadedMap}
          onSelectPresetMap={handleSelectPresetMap}
          onDeleteUploadedAsset={handleDeleteUploadedAsset}
          onDeleteCustomToken={handleDeleteCustomToken}
          isReadingFile={isReadingFile}
          isUploadingToken={isUploadingToken}
          boardAnimatedFeatures={boardAnimatedFeatures}
          setBoardAnimatedFeatures={setBoardAnimatedFeatures}
          boardAnimatedEnabled={boardAnimatedEnabled}
          setBoardAnimatedEnabled={setBoardAnimatedEnabled}
          boardWeatherEffect={boardWeatherEffect}
          setBoardWeatherEffect={setBoardWeatherEffect}
          boardPlacingAnimatedType={boardPlacingAnimatedType}
          setBoardPlacingAnimatedType={setBoardPlacingAnimatedType}
          showBoardAnimatedControls={showBoardAnimatedControls}
          setShowBoardAnimatedControls={setShowBoardAnimatedControls}
          getMapDimensions={getMapDimensions}
          onDuplicateFeature={handleDuplicateFeature}
          onStartStampingFeature={handleStartStampingFeature}
          walls={walls}
          setWalls={setWalls}
          selectedWallId={selectedWallId}
          setSelectedWallId={setSelectedWallId}
          activeWallType={activeWallType}
          setActiveWallType={setActiveWallType}
          activeDoorState={activeDoorState}
          setActiveDoorState={setActiveDoorState}
          snapToGridWalls={snapToGridWalls}
          setSnapToGridWalls={setSnapToGridWalls}
          visionConfig={visionConfig}
          setVisionConfig={setVisionConfig}
          onGeneratePresetRoom={handleGeneratePresetRoom}
          onClearWalls={handleClearWalls}
          onDeleteWall={handleDeleteWall}
          onSplitWall={handleSplitWall}
          onUpdateTokenVision={handleUpdateTokenVision}
          campaignMode={campaignMode}
          setCampaignMode={handleModeChange}
          roomAnnotations={roomAnnotations}
          onOpenZoneDetails={(anno) => {
            setSelectedZoneForSidePanel(anno);
            setIsZoneSidePanelOpen(true);
          }}
          onHoverZone={setHoveredZoneId}
          currentMapImage={imageFile}
          onExportUniversalVtt={handleExportUniversalVtt}
          onImportUniversalVtt={handleUniversalVttImport}
          onOpenBugReport={() => setIsBugReportModalOpen(true)}
          onOpenBugManager={() => setIsBugManagerModalOpen(true)}
        />

        {/* Floating Wall & Creator Toolbar (shown when in creator mode or wall/zone tool active) */}
        {false && (tool === 'wall' || tool === 'zone' || tool === 'hotspot' || campaignMode === 'creator') && (
          <div className="absolute top-16 right-4 z-40 max-w-sm">
            <WallEditorToolbar
              tool={tool}
              setTool={setTool}
              walls={walls}
              selectedWallId={selectedWallId}
              onSelectWall={(id) => setSelectedWallId(id)}
              onDeleteWall={(id) => handleDeleteWall(id)}
              onClearWalls={handleClearWalls}
              activeWallType={activeWallType}
              setActiveWallType={setActiveWallType}
              activeDoorState={activeDoorState}
              setActiveDoorState={setActiveDoorState}
              snapToGrid={snapToGridWalls}
              setSnapToGrid={setSnapToGridWalls}
              visionConfig={visionConfig}
              setVisionConfig={setVisionConfig}
              onGenerateRoomWalls={handleGeneratePresetRoom}
              selectedToken={tokens.find(t => selectedTokenIds.includes(t.id)) || null}
              onUpdateTokenVision={handleUpdateTokenVision}
              campaignMode={campaignMode}
              onModeChange={handleModeChange}
              currentZonePolygonPoints={currentZonePolygonPoints}
              onCompleteZonePolygon={() => handleCompleteZonePolygon(currentZonePolygonPoints)}
              onCancelZonePolygon={() => {
                setCurrentZonePolygonPoints([]);
                toast.info('Room polygon drawing cancelled');
              }}
              roomAnnotations={roomAnnotations}
              onOpenZoneDetails={(anno) => {
                setSelectedZoneForSidePanel(anno);
                setIsZoneSidePanelOpen(true);
              }}
              onOpenZoneSidePanel={() => setIsZoneSidePanelOpen(true)}
            />
          </div>
        )}

        {isReadingFile && (
          <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-sm">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-zinc-300 font-mono text-sm animate-pulse">Processing Map Asset...</p>
          </div>
        )}
        {uploadError && !isReadingFile && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm font-mono flex items-center gap-3 backdrop-blur-md shadow-2xl">
            <AlertCircle className="w-5 h-5" />
            <div className="flex flex-col">
              <span className="font-bold uppercase text-[10px] tracking-tighter opacity-50">Upload Error</span>
              <span>{uploadError}</span>
            </div>
            <button onClick={() => setUploadError(null)} className="ml-4 p-1 hover:bg-white/10 rounded-full transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
        {!imageFile ? (
          <DashboardHomeHub
            onFileUpload={handleFileUpload}
            onUniversalVttUpload={handleFileUpload}
            onOpenLoadModal={() => setShowLoadCampaignModal(true)}
            onOpenCampaignManager={() => setShowCampaignBuilder(true)}
            onOpenMonsterCompendium={() => setShowMonsterCompendium(true)}
            onOpenCharacterCompendium={() => setShowCharacterCompendium(true)}
            onOpenAlliesCompendium={() => setShowAlliesCompendium(true)}
            onOpenDdbSync={() => setShowDdbModal(true)}
            onOpenBugReport={() => setIsBugReportModalOpen(true)}
            onLoadSceneFromCampaign={handleLoadSceneFromCampaign}
            campaignsList={campaignsList}
            lastActiveSession={lastActiveSession}
            unsavedSceneBackup={unsavedSceneBackup}
            unsavedSceneBackupWasCrash={unsavedSceneBackupWasCrash}
            onRestoreUnsavedScene={handleRestoreUnsavedScene}
            onDiscardUnsavedScene={handleDiscardUnsavedScene}
            isFirebaseConnected={isFirebaseConnected}
          />
        ) : (
          <div
            className={`flex-1 h-full relative ${isSpacePressed || isShiftPanActive || tool === 'pan' ? 'cursor-grab active:cursor-grabbing' : tool === 'select' ? 'cursor-default' : 'cursor-crosshair'}`}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
            }}
            onDrop={handleDropOnStage}
          >
            {(isSpacePressed || isShiftPanActive) && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[45] pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-emerald-500/50 backdrop-blur shadow-xl text-xs font-mono text-emerald-300 animate-in fade-in">
                <Hand className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pan / Move Map ({isShiftPressed ? 'Shift Held' : 'Spacebar Held'})</span>
              </div>
            )}
            <MainCampaignBar
                activeSceneInfo={activeSceneInfo}
                campaigns={campaignsList}
                tokenCount={tokens.length}
                onQuickSave={handleQuickSaveScene}
                isQuickSaving={isQuickSaving}
                onOpenSaveModal={() => setShowSaveToCampaignModal(true)}
                onOpenLoadModal={() => setShowLoadCampaignModal(true)}
                onOpenCampaignManager={() => setShowCampaignBuilder(true)}
                onOpenMonsterCompendium={() => setShowMonsterCompendium(true)}
                onOpenCharacterCompendium={() => setShowCharacterCompendium(true)}
                onOpenAlliesCompendium={() => {
                  setAlliesCompendiumInitialSearch('');
                  setShowAlliesCompendium(true);
                }}
                onOpenDdbSync={() => setShowDdbModal(true)}
                onOpenDndChatbot={() => setShowDndChatbot(true)}
                isFirebaseConnected={isFirebaseConnected}
                onRelinkMap={() => relinkMapFileInputRef.current?.click()}
                onForceSync={handleForceSyncToPlayers}
                campaignMode={campaignMode}
                onModeChange={handleModeChange}
                tool={tool}
                setTool={setTool}
                activeMapId={activeMapId}
                liveMapId={liveMapId}
                onMapSwitch={handleMapSwitch}
              />
            <input
              ref={relinkMapFileInputRef}
              type="file"
              className="hidden"
              accept="image/*,video/*,.m4v"
              onChange={handleRelinkMapImage}
            />
            <Stage
              width={dimensions.width - 64} // Subtract sidebar width (64px)
              height={dimensions.height}
              ref={stageRef}
              scaleX={stageScale}
              scaleY={stageScale}
              x={stagePos.x}
              y={stagePos.y}
              onWheel={handleWheel}
              onContextMenu={(e) => {
                e.evt.preventDefault();
                const stage = stageRef.current;
                if (!stage) return;
                const pointer = stage.getPointerPosition();
                if (!pointer) return;
                const mapX = (pointer.x - stagePos.x) / stageScale;
                const mapY = (pointer.y - stagePos.y) / stageScale;
                const dims = getMapDimensions();
                const mW = dims.width || 1;
                const mH = dims.height || 1;
                const pctX = (mapX / mW) * 100;
                const pctY = (mapY / mH) * 100;

                const clickedFeat = [...boardAnimatedFeatures].reverse().find(f => {
                  const dist = Math.hypot(f.x - pctX, f.y - pctY);
                  return dist <= f.radius;
                });

                if (clickedFeat) {
                  setEffectContextMenu({
                    data: { type: 'feature', feature: clickedFeat },
                    position: { x: e.evt.clientX, y: e.evt.clientY }
                  });
                }
              }}
              draggable={(tool === 'pan' || isSpacePressed || isShiftPanActive) && !isDraggingToken}
              onDragMove={(e) => {
                if (e.target === stageRef.current && !isDraggingTokenRef.current) {
                  const newX = e.target.x();
                  const newY = e.target.y();
                  const fx = document.getElementById('main-animated-fx-overlay');
                  if (fx) {
                    fx.style.left = `${newX}px`;
                    fx.style.top = `${newY}px`;
                  }
                  setStagePos({ x: newX, y: newY });
                }
              }}
              onDragEnd={(e) => {
                if (e.target === stageRef.current && !isDraggingTokenRef.current) {
                  const newX = e.target.x();
                  const newY = e.target.y();
                  const fx = document.getElementById('main-animated-fx-overlay');
                  if (fx) {
                    fx.style.left = `${newX}px`;
                    fx.style.top = `${newY}px`;
                  }
                  setStagePos({ x: newX, y: newY });
                }
              }}
              onMouseDown={handleStageMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onDblClick={handleStageDblClick}
            >
              <Layer ref={dmVideoLayerRef} listening={false}>
                {mapType === 'image' && image && (() => {
                  const { width: mapW, height: mapH } = getMapDimensions();
                  const isRotated = mapRotation % 180 !== 0;
                  const targetW = isRotated ? mapH : mapW;
                  const targetH = isRotated ? mapW : mapH;
                  return (
                    <KonvaImage
                      image={image}
                      width={targetW}
                      height={targetH}
                      {...getImageTransform(targetW, targetH, mapRotation)}
                    />
                  );
                })()}
                {mapType === 'video' && videoElement && (() => {
                  const { width: mapW, height: mapH } = getMapDimensions();
                  const isRotated = mapRotation % 180 !== 0;
                  const targetW = isRotated ? mapH : mapW;
                  const targetH = isRotated ? mapW : mapH;
                  return (
                    <KonvaImage
                      image={videoElement}
                      width={targetW}
                      height={targetH}
                      {...getImageTransform(targetW, targetH, mapRotation)}
                    />
                  );
                })()}
              </Layer>
              
              {/* Grid Layer */}
              {gridVisible && (
                <GridLayer
                  mapWidth={getMapDimensions().width}
                  mapHeight={getMapDimensions().height}
                  gridSize={gridSize}
                  gridOffsetX={gridOffsetX}
                  gridOffsetY={gridOffsetY}
                  gridOpacity={gridOpacity}
                  stageScale={stageScale}
                />
              )}

              {/* Tactical & Environmental Animated FX Layer (Tied Directly to Battlemap Surface in Konva) */}
              {boardAnimatedEnabled && (() => {
                const dims = getMapDimensions();
                if (dims.width <= 0 || dims.height <= 0) return null;
                const isRotated = mapRotation % 180 !== 0;
                const targetW = isRotated ? dims.height : dims.width;
                const targetH = isRotated ? dims.width : dims.height;
                return (
                  <Layer listening={false}>
                    <Group {...getImageTransform(targetW, targetH, mapRotation)}>
                      <AnimatedFeaturesKonvaImage
                        enabled={boardAnimatedEnabled}
                        features={boardAnimatedFeatures}
                        weatherEffect={boardWeatherEffect}
                        walls={walls}
                        mapDimensions={{ width: targetW, height: targetH }}
                      />
                    </Group>
                  </Layer>
                );
              })()}

              {/* Measurement Overlay */}
              {measureStart && measureEnd && (
                <Layer>
                  {(() => {
                    const dx = measureEnd.x - measureStart.x;
                    const dy = measureEnd.y - measureStart.y;
                    const distancePx = Math.sqrt(dx * dx + dy * dy);
                    const distanceFt = Math.round((distancePx / gridSize) * 5);
                    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                    
                    let shape = null;
                    let labelPos = { x: (measureStart.x + measureEnd.x) / 2, y: (measureStart.y + measureEnd.y) / 2 };
                    let labelText = `${distanceFt} ft`;

                    if (measureType === 'circle') {
                      shape = (
                        <Circle
                          x={measureStart.x}
                          y={measureStart.y}
                          radius={distancePx}
                          stroke="#10b981"
                          strokeWidth={2 / stageScale}
                          dash={[10 / stageScale, 5 / stageScale]}
                          fill="rgba(16, 185, 129, 0.1)"
                        />
                      );
                      labelPos = { x: measureStart.x, y: measureStart.y - distancePx - (20 / stageScale) };
                      labelText = `Radius: ${distanceFt} ft`;
                    } else if (measureType === 'square') {
                      const size = Math.max(Math.abs(dx), Math.abs(dy));
                      const x = dx > 0 ? measureStart.x : measureStart.x - size;
                      const y = dy > 0 ? measureStart.y : measureStart.y - size;
                      shape = (
                        <Rect
                          x={x}
                          y={y}
                          width={size}
                          height={size}
                          stroke="#10b981"
                          strokeWidth={2 / stageScale}
                          dash={[10 / stageScale, 5 / stageScale]}
                          fill="rgba(16, 185, 129, 0.1)"
                        />
                      );
                      const sizeFt = Math.round((size / gridSize) * 5);
                      labelPos = { x: x + size / 2, y: y + size / 2 };
                      labelText = `${sizeFt} x ${sizeFt} ft`;
                    } else if (measureType === 'rectangle') {
                      const x = Math.min(measureStart.x, measureEnd.x);
                      const y = Math.min(measureStart.y, measureEnd.y);
                      const w = Math.abs(dx);
                      const h = Math.abs(dy);
                      shape = (
                        <Rect
                          x={x}
                          y={y}
                          width={w}
                          height={h}
                          stroke="#10b981"
                          strokeWidth={2 / stageScale}
                          dash={[10 / stageScale, 5 / stageScale]}
                          fill="rgba(16, 185, 129, 0.1)"
                        />
                      );
                      const wFt = Math.round((w / gridSize) * 5);
                      const hFt = Math.round((h / gridSize) * 5);
                      labelPos = { x: x + w / 2, y: y + h / 2 };
                      labelText = `${wFt} x ${hFt} ft`;
                    } else if (measureType === 'cone') {
                      shape = (
                        <Wedge
                          x={measureStart.x}
                          y={measureStart.y}
                          radius={distancePx}
                          angle={60}
                          rotation={angle - 30}
                          stroke="#10b981"
                          strokeWidth={2 / stageScale}
                          dash={[10 / stageScale, 5 / stageScale]}
                          fill="rgba(16, 185, 129, 0.1)"
                        />
                      );
                      const rad = (angle * Math.PI) / 180;
                      labelPos = { 
                        x: measureStart.x + (distancePx / 2) * Math.cos(rad), 
                        y: measureStart.y + (distancePx / 2) * Math.sin(rad) 
                      };
                      labelText = `${distanceFt} ft Cone`;
                    } else {
                      // Default: Line
                      shape = (
                        <>
                          <Line
                            points={[measureStart.x, measureStart.y, measureEnd.x, measureEnd.y]}
                            stroke="#10b981"
                            strokeWidth={2 / stageScale}
                            dash={[10 / stageScale, 5 / stageScale]}
                          />
                          <Circle x={measureStart.x} y={measureStart.y} radius={4 / stageScale} fill="#10b981" />
                          <Circle x={measureEnd.x} y={measureEnd.y} radius={4 / stageScale} fill="#10b981" />
                        </>
                      );
                    }

                    return (
                      <Group
                        onContextMenu={(e) => {
                          e.evt.preventDefault();
                          setMeasureStart(null);
                          setMeasureEnd(null);
                        }}
                      >
                        {shape}
                        <Group x={labelPos.x} y={labelPos.y}>
                          <Rect
                            x={-40 / stageScale}
                            y={-15 / stageScale}
                            width={80 / stageScale}
                            height={30 / stageScale}
                            fill="rgba(0,0,0,0.7)"
                            cornerRadius={4 / stageScale}
                          />
                          <Text
                            text={labelText}
                            fontSize={12 / stageScale}
                            fill="white"
                            align="center"
                            verticalAlign="middle"
                            x={-40 / stageScale}
                            y={-15 / stageScale}
                            width={80 / stageScale}
                            height={30 / stageScale}
                          />
                        </Group>
                      </Group>
                    );
                  })()}
                </Layer>
              )}
              
              <DynamicLightingLayer
                mapDimensions={getMapDimensions()}
                gridSize={gridSize}
                stageScale={stageScale}
                walls={walls}
                tokens={tokens}
                isFogVisible={isFogVisible}
                reveals={reveals}
                polygonReveals={polygonReveals}
                visionConfig={visionConfig}
                isPlayerView={false}
                campaignMode={campaignMode}
                tool={tool}
                selectedWallId={selectedWallId}
                onSelectWall={(id) => setSelectedWallId(id)}
                onToggleDoor={handleToggleDoor}
                onDeleteWall={handleDeleteWall}
                onUpdateWall={handleUpdateWall}
                onSplitWall={handleSplitWall}
                wallDrawStart={wallDrawStart}
                mousePos={mousePos}
                snapToGridEnabled={snapToGridWalls}
                gridOffsetX={gridOffsetX}
                gridOffsetY={gridOffsetY}
                fogResetKey={fogResetKey}
                animatedFeatures={boardAnimatedFeatures}
              />

              {/* In-Progress Wall Erase / Cut Line Preview */}
              {tool === 'erase_wall' && wallEraseDragStart && wallEraseDragCurrent && (
                <Layer listening={false}>
                  <Line
                    points={[
                      wallEraseDragStart.x,
                      wallEraseDragStart.y,
                      wallEraseDragCurrent.x,
                      wallEraseDragCurrent.y
                    ]}
                    stroke="#ef4444"
                    strokeWidth={3 / stageScale}
                    dash={[6 / stageScale, 4 / stageScale]}
                    shadowColor="#ef4444"
                    shadowBlur={8 / stageScale}
                    lineCap="round"
                  />
                  <Circle
                    x={wallEraseDragStart.x}
                    y={wallEraseDragStart.y}
                    radius={4 / stageScale}
                    fill="#ef4444"
                  />
                  <Circle
                    x={wallEraseDragCurrent.x}
                    y={wallEraseDragCurrent.y}
                    radius={5 / stageScale}
                    fill="#ffffff"
                    stroke="#ef4444"
                    strokeWidth={2 / stageScale}
                  />
                </Layer>
              )}

              {(currentPolygonPoints.length > 0 || aiDescribeRect) && (
                <Layer>
                  {/* Current Polygon Preview */}
                  {currentPolygonPoints.length > 0 && (
                    <Group>
                      <Line
                        points={[
                          ...currentPolygonPoints,
                          mousePos.x,
                          mousePos.y
                        ]}
                        stroke="#10b981"
                        strokeWidth={2 / stageScale}
                        dash={[5 / stageScale, 5 / stageScale]}
                      />
                      {(() => {
                        const points = [];
                        for (let i = 0; i < currentPolygonPoints.length; i += 2) {
                          points.push(
                            <Circle
                              key={i}
                              x={currentPolygonPoints[i]}
                              y={currentPolygonPoints[i+1]}
                              radius={4 / stageScale}
                              fill="#10b981"
                            />
                          );
                        }
                        return points;
                      })()}
                      {(() => {
                        const lastX = currentPolygonPoints[currentPolygonPoints.length - 2];
                        const lastY = currentPolygonPoints[currentPolygonPoints.length - 1];
                        const dx = mousePos.x - lastX;
                        const dy = mousePos.y - lastY;
                        const distPx = Math.sqrt(dx * dx + dy * dy);
                        const distFt = Math.round((distPx / gridSize) * 5);
                        
                        // Calculate total perimeter so far
                        let totalDistPx = 0;
                        for (let i = 0; i < currentPolygonPoints.length - 2; i += 2) {
                          const x1 = currentPolygonPoints[i];
                          const y1 = currentPolygonPoints[i+1];
                          const x2 = currentPolygonPoints[i+2];
                          const y2 = currentPolygonPoints[i+3];
                          totalDistPx += Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                        }
                        totalDistPx += distPx;
                        const totalDistFt = Math.round((totalDistPx / gridSize) * 5);

                        return (
                          <Group x={mousePos.x + 15 / stageScale} y={mousePos.y + 15 / stageScale}>
                            <Rect
                              width={80 / stageScale}
                              height={40 / stageScale}
                              fill="rgba(0,0,0,0.8)"
                              cornerRadius={4 / stageScale}
                              stroke="#10b981"
                              strokeWidth={1 / stageScale}
                            />
                            <Text
                              text={`Seg: ${distFt}ft\nTotal: ${totalDistFt}ft`}
                              fontSize={10 / stageScale}
                              fill="white"
                              padding={5 / stageScale}
                              width={80 / stageScale}
                              align="center"
                            />
                          </Group>
                        );
                      })()}
                    </Group>
                  )}
                  
                  {aiDescribeRect && (
                    <Group>
                      <Rect
                        x={aiDescribeRect.w < 0 ? aiDescribeRect.x + aiDescribeRect.w : aiDescribeRect.x}
                        y={aiDescribeRect.h < 0 ? aiDescribeRect.y + aiDescribeRect.h : aiDescribeRect.y}
                        width={Math.abs(aiDescribeRect.w)}
                        height={Math.abs(aiDescribeRect.h)}
                        stroke="#818cf8"
                        strokeWidth={2 / stageScale}
                        dash={[10 / stageScale, 5 / stageScale]}
                        fill="rgba(99, 102, 241, 0.1)"
                      />
                      <Text
                        x={aiDescribeRect.w < 0 ? aiDescribeRect.x + aiDescribeRect.w : aiDescribeRect.x}
                        y={(aiDescribeRect.h < 0 ? aiDescribeRect.y + aiDescribeRect.h : aiDescribeRect.y) - (20 / stageScale)}
                        text="AI Analysis Frame"
                        fill="#818cf8"
                        fontSize={14 / stageScale}
                        fontStyle="bold"
                      />
                    </Group>
                  )}
                </Layer>
              )}

              {/* Campaign Map Zones & Interactive Hotspots Layer */}
              <Layer>
                <RoomHotspotLayer
                  annotations={roomAnnotations}
                  mapDimensions={getMapDimensions()}
                  stageScale={stageScale}
                  campaignMode={campaignMode}
                  isPlayerView={false}
                  selectedAnnotationId={selectedRoomAnnotation?.id || selectedZoneForSidePanel?.id || null}
                  hoveredAnnotationId={hoveredZoneId}
                  onHoverAnnotation={setHoveredZoneId}
                  onSelectAnnotation={(anno) => {
                    setSelectedRoomAnnotation(anno);
                    setSelectedZoneForSidePanel(anno);
                    setIsZoneSidePanelOpen(false);
                    setIsRoomDrawerOpen(true);
                  }}
                  onOpenBriefing={(anno) => {
                    setSelectedRoomAnnotation(anno);
                    setSelectedZoneForSidePanel(anno);
                    setIsZoneSidePanelOpen(false);
                    setIsRoomDrawerOpen(true);
                  }}
                />

                {/* Active Zone Polygon Drawing Preview */}
                {currentZonePolygonPoints.length > 0 && (
                  <Group>
                    {/* Semi-transparent filled preview polygon */}
                    {currentZonePolygonPoints.length >= 4 && (
                      <Line
                        points={[...currentZonePolygonPoints, mousePos.x, mousePos.y]}
                        closed={true}
                        fill="rgba(245, 158, 11, 0.2)"
                        stroke="#f59e0b"
                        strokeWidth={2 / stageScale}
                        dash={[6 / stageScale, 4 / stageScale]}
                      />
                    )}

                    {/* Rubberband line segment to mouse cursor */}
                    <Line
                      points={[
                        currentZonePolygonPoints[currentZonePolygonPoints.length - 2],
                        currentZonePolygonPoints[currentZonePolygonPoints.length - 1],
                        mousePos.x,
                        mousePos.y
                      ]}
                      stroke="#f59e0b"
                      strokeWidth={2 / stageScale}
                      dash={[4 / stageScale, 4 / stageScale]}
                    />

                    {/* Placed Vertices */}
                    {(() => {
                      const dots = [];
                      for (let i = 0; i < currentZonePolygonPoints.length; i += 2) {
                        const vx = currentZonePolygonPoints[i];
                        const vy = currentZonePolygonPoints[i + 1];
                        const isStart = i === 0;
                        dots.push(
                          <Circle
                            key={`zone-v-${i}`}
                            x={vx}
                            y={vy}
                            radius={(isStart ? 6 : 4.5) / stageScale}
                            fill={isStart ? '#f59e0b' : '#fbbf24'}
                            stroke="#ffffff"
                            strokeWidth={1.5 / stageScale}
                          />
                        );
                      }
                      return dots;
                    })()}

                    {/* Highlight start point target when mouse approaches */}
                    {currentZonePolygonPoints.length >= 6 && (() => {
                      const startX = currentZonePolygonPoints[0];
                      const startY = currentZonePolygonPoints[1];
                      const isNearStart = Math.hypot(mousePos.x - startX, mousePos.y - startY) < (24 / stageScale);
                      return (
                        <Circle
                          x={startX}
                          y={startY}
                          radius={(isNearStart ? 12 : 8) / stageScale}
                          fill={isNearStart ? 'rgba(16, 185, 129, 0.4)' : 'transparent'}
                          stroke={isNearStart ? '#10b981' : '#f59e0b'}
                          strokeWidth={(isNearStart ? 2.5 : 1.5) / stageScale}
                        />
                      );
                    })()}

                    {/* Floating Tooltip Near Cursor */}
                    {(() => {
                      const startX = currentZonePolygonPoints[0];
                      const startY = currentZonePolygonPoints[1];
                      const isNearStart = currentZonePolygonPoints.length >= 6 && Math.hypot(mousePos.x - startX, mousePos.y - startY) < (24 / stageScale);
                      const tip = isNearStart
                        ? '🎯 Click to Close Polygon & Save Zone'
                        : `Vertex ${(currentZonePolygonPoints.length / 2) + 1} (Double-click or connect to start)`;

                      return (
                        <Group x={mousePos.x + 14 / stageScale} y={mousePos.y + 14 / stageScale}>
                          <Rect
                            width={160 / stageScale}
                            height={32 / stageScale}
                            fill="rgba(15, 23, 42, 0.9)"
                            cornerRadius={5 / stageScale}
                            stroke={isNearStart ? '#10b981' : '#f59e0b'}
                            strokeWidth={1.5 / stageScale}
                          />
                          <Text
                            text={tip}
                            fontSize={9.5 / stageScale}
                            fontFamily="monospace"
                            fontStyle="bold"
                            fill={isNearStart ? '#6ee7b7' : '#fef08a'}
                            padding={4 / stageScale}
                            width={160 / stageScale}
                            align="center"
                            verticalAlign="middle"
                          />
                        </Group>
                      );
                    })()}
                  </Group>
                )}
              </Layer>

              {/* Tokens Layer */}
              <Layer>
                {tokens.map((token) => (
                  <TokenImage
                    key={token.id}
                    token={token}
                    gridSize={gridSize}
                    stageScale={stageScale}
                    isPlayerView={false}
                    isSelected={selectedTokenIds.includes(token.id)}
                    tool={tool}
                    isSpacePressed={isSpacePressed}
                    combatants={combatTrackerCombatants}
                    characters={compendiumCharacters}
                    onMouseEnter={handleTokenHoverEnter}
                    onMouseLeave={handleTokenHoverLeave}
                    onClick={(e: any) => {
                      setActiveMenu(null);
                      if (stageRef.current) {
                        const sx = stageRef.current.x();
                        const sy = stageRef.current.y();
                        setStagePos(prev => (prev.x === sx && prev.y === sy) ? prev : { x: sx, y: sy });
                      }
                      if (tool === 'select' || tool === 'pan' || isAutoSwitchedFromPanRef.current) {
                        if (e.evt?.shiftKey) {
                          setSelectedTokenIds(prev => 
                            prev.includes(token.id) ? prev.filter(id => id !== token.id) : [...prev, token.id]
                          );
                        } else {
                          setSelectedTokenIds([token.id]);
                        }
                      }
                    }}
                    onDblClick={() => {
                      if (tool === 'select' || tool === 'pan' || isAutoSwitchedFromPanRef.current) {
                        setSelectedTokenIds([token.id]);
                        handleStartRenameToken(token.id, token.name);
                      }
                    }}
                    onDragStart={() => {
                      isDraggingTokenRef.current = true;
                      setIsDraggingToken(true);
                      setActiveMenu(null);
                      if (stageRef.current) {
                        const sx = stageRef.current.x();
                        const sy = stageRef.current.y();
                        setStagePos(prev => (prev.x === sx && prev.y === sy) ? prev : { x: sx, y: sy });
                      }
                      if (!selectedTokenIds.includes(token.id)) {
                        setSelectedTokenIds([token.id]);
                      }
                      const posMap: Record<string, { x: number; y: number }> = {};
                      tokens.forEach(t => {
                        if (selectedTokenIds.includes(t.id) || t.id === token.id) {
                          posMap[t.id] = { x: t.x, y: t.y };
                        }
                      });
                      dragStartPositionsRef.current = posMap;
                    }}
                    onDragMove={(e: any) => {
                      const now = Date.now();
                      if (now - lastTokenMoveEmitTimeRef.current > 35) {
                        lastTokenMoveEmitTimeRef.current = now;
                        const rawX = e.target.x();
                        const rawY = e.target.y();
                        if (socketRef.current?.connected && (activeMapIdRef.current === liveMapIdRef.current)) {
                          socketRef.current.emit('MOVE_TOKEN', { id: token.id, x: rawX, y: rawY });
                        }
                      }
                    }}
                    onDragEnd={(e: any) => {
                      isDraggingTokenRef.current = false;
                      setIsDraggingToken(false);
                      if (stageRef.current) {
                        const sx = stageRef.current.x();
                        const sy = stageRef.current.y();
                        setStagePos(prev => (prev.x === sx && prev.y === sy) ? prev : { x: sx, y: sy });
                      }
                      const snappedX = Math.floor((e.target.x() - gridOffsetX) / gridSize) * gridSize + gridOffsetX;
                      const snappedY = Math.floor((e.target.y() - gridOffsetY) / gridSize) * gridSize + gridOffsetY;
                      
                      const startPos = dragStartPositionsRef.current[token.id] || { x: token.x, y: token.y };
                      const deltaX = snappedX - startPos.x;
                      const deltaY = snappedY - startPos.y;

                      let nextTokens: Token[];
                      if (selectedTokenIds.length > 1 && selectedTokenIds.includes(token.id)) {
                        nextTokens = tokens.map(t => {
                          if (selectedTokenIds.includes(t.id)) {
                            const init = dragStartPositionsRef.current[t.id] || { x: t.x, y: t.y };
                            return {
                              ...t,
                              x: init.x + deltaX,
                              y: init.y + deltaY
                            };
                          }
                          return t;
                        });
                      } else {
                        nextTokens = tokens.map(t => t.id === token.id ? { ...t, x: snappedX, y: snappedY } : t);
                      }
                      setTokens(nextTokens);
                      if (mapsDataRef.current[activeMapId]) {
                        mapsDataRef.current[activeMapId].tokens = nextTokens;
                      }
                      dragStartPositionsRef.current = {};

                      if (socketRef.current?.connected && (activeMapIdRef.current === liveMapIdRef.current)) {
                        if (selectedTokenIds.length > 1 && selectedTokenIds.includes(token.id)) {
                          selectedTokenIds.forEach(id => {
                            const tok = nextTokens.find(t => t.id === id);
                            if (tok) socketRef.current.emit('MOVE_TOKEN', { id: tok.id, x: tok.x, y: tok.y });
                          });
                        } else {
                          socketRef.current.emit('MOVE_TOKEN', { id: token.id, x: snappedX, y: snappedY });
                        }
                        socketRef.current.emit('SYNC_TOKENS', nextTokens);
                      }
                    }}
                    onDelete={() => {
                      const next = tokens.filter(t => t.id !== token.id);
                      setTokens(next);
                      setSelectedTokenIds(prev => prev.filter(id => id !== token.id));
                      if (mapsDataRef.current[activeMapId]) {
                        mapsDataRef.current[activeMapId].tokens = next;
                      }
                      if (socketRef.current?.connected && (activeMapIdRef.current === liveMapIdRef.current)) {
                        socketRef.current.emit('SYNC_TOKENS', next);
                      }
                    }}
                    onContextMenu={(e: any) => {
                      setActiveTokenMenu({ id: token.id, x: e.evt.clientX, y: e.evt.clientY });
                    }}
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

              {/* Marquee Selection Layer */}
              {tool === 'select' && selectionBox?.active && (
                <Layer listening={false}>
                  <Rect
                    x={Math.min(selectionBox.startX, selectionBox.currentX)}
                    y={Math.min(selectionBox.startY, selectionBox.currentY)}
                    width={Math.abs(selectionBox.currentX - selectionBox.startX)}
                    height={Math.abs(selectionBox.currentY - selectionBox.startY)}
                    fill="rgba(245, 158, 11, 0.15)"
                    stroke="#f59e0b"
                    strokeWidth={1.5 / stageScale}
                    dash={[5 / stageScale, 3 / stageScale]}
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
              tokens={tokens}
              combatants={combatTrackerCombatants}
              activeEquippedAsset={activeEquippedAsset}
              aimOrigin={aimOrigin}
              aimCurrent={aimCurrent}
            />

            {/* Environmental & Animated Map FX Overlay (Uploaded & Generated Maps) */}
            {(() => {
              const { width: mapWidth, height: mapHeight } = getMapDimensions();
              if (mapWidth <= 0 || mapHeight <= 0) return null;

              return (
                <div
                  id="main-animated-fx-overlay"
                  className={`absolute rounded-xl overflow-hidden ${
                    (boardPlacingAnimatedType || showBoardAnimatedControls) && !isShiftPanActive && !isSpacePressed
                      ? 'pointer-events-auto'
                      : 'pointer-events-none'
                  }`}
                  style={{
                    left: `${stagePos.x}px`,
                    top: `${stagePos.y}px`,
                    width: `${mapWidth * stageScale}px`,
                    height: `${mapHeight * stageScale}px`,
                    zIndex: 12
                  }}
                >
                  <AnimatedMapOverlay
                    enabled={boardAnimatedEnabled}
                    features={boardAnimatedFeatures}
                    weatherEffect={boardWeatherEffect}
                    placingType={boardPlacingAnimatedType}
                    placingTemplate={boardPlacingTemplate}
                    showPlacementControls={showBoardAnimatedControls}
                    walls={walls}
                    mapDimensions={getMapDimensions()}
                    renderCanvas={false}
                    isShiftPressed={isShiftPressed}
                    onDrawingStateChange={setBoardPolygonDrawingState}
                    onPanMap={(dx, dy) => {
                      const stage = stageRef.current;
                      if (stage) {
                        const curPos = stage.position();
                        const nextX = curPos.x + dx;
                        const nextY = curPos.y + dy;
                        stage.position({ x: nextX, y: nextY });
                        stage.batchDraw();
                        const fx = document.getElementById('main-animated-fx-overlay');
                        if (fx) {
                          fx.style.left = `${nextX}px`;
                          fx.style.top = `${nextY}px`;
                        }
                        setStagePos({ x: nextX, y: nextY });
                      }
                    }}
                    onWheel={(e) => {
                      e.preventDefault();
                      const scaleBy = 1.08;
                      const stage = stageRef.current;
                      if (!stage) return;
                      const oldScale = stageScale;
                      const stageBox = stage.container().getBoundingClientRect();
                      const pointerX = e.clientX - stageBox.left;
                      const pointerY = e.clientY - stageBox.top;

                      const mousePointTo = {
                        x: (pointerX - stagePos.x) / oldScale,
                        y: (pointerY - stagePos.y) / oldScale,
                      };

                      const newScale = e.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
                      const newPos = {
                        x: pointerX - mousePointTo.x * newScale,
                        y: pointerY - mousePointTo.y * newScale,
                      };
                      const fx = document.getElementById('main-animated-fx-overlay');
                      if (fx) {
                        const { width: mapW, height: mapH } = getMapDimensions();
                        fx.style.left = `${newPos.x}px`;
                        fx.style.top = `${newPos.y}px`;
                        fx.style.width = `${mapW * newScale}px`;
                        fx.style.height = `${mapH * newScale}px`;
                      }
                      setStageScale(newScale);
                      setStagePos(newPos);
                    }}
                    onAddFeature={(newFeat) => {
                      setBoardAnimatedFeatures(prev => [...prev, newFeat]);
                      setBoardAnimatedEnabled(true);
                      if (!boardPlacingTemplate) {
                        setBoardPlacingAnimatedType(null);
                        setBoardPolygonDrawingState(null);
                      }
                      toast.success(`Placed animated ${newFeat.type} on map`);
                    }}
                    onRemoveFeature={(id) => {
                      setBoardAnimatedFeatures(prev => prev.filter(f => f.id !== id));
                    }}
                    onUpdateFeature={(updated) => {
                      setBoardAnimatedFeatures(prev => prev.map(f => f.id === updated.id ? updated : f));
                    }}
                    onFeatureContextMenu={(feature, screenX, screenY) => {
                      setEffectContextMenu({
                        data: { type: 'feature', feature },
                        position: { x: screenX, y: screenY }
                      });
                    }}
                  />
                </div>
              );
            })()}

            {/* Active Placing & Polygon Drawing Banner */}
            {boardPlacingAnimatedType && (() => {
              const isPolygonDraw = (boardPlacingAnimatedType === 'water' || boardPlacingAnimatedType === 'lava') && !boardPlacingTemplate;
              const drawCount = boardPolygonDrawingState?.count || 0;
              const canFinish = boardPolygonDrawingState?.canFinish || false;
              const isWater = boardPlacingAnimatedType === 'water';
              const Icon = isWater ? Waves : Flame;
              const accentColor = isWater ? 'border-cyan-500 text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'border-orange-500 text-orange-200 shadow-[0_0_20px_rgba(249,115,22,0.4)]';

              return (
                <div
                  id="banner-placing-animated-fx"
                  className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-zinc-950/95 border ${accentColor} px-4 py-2 rounded-full backdrop-blur-md flex items-center gap-3 text-xs font-mono font-bold animate-in fade-in slide-in-from-top-3`}
                >
                  <Icon className={`w-4 h-4 shrink-0 animate-pulse ${isWater ? 'text-cyan-400' : 'text-orange-400'}`} />

                  {boardPlacingTemplate ? (
                    <>
                      <span>
                        Stamping modified <span className="uppercase text-amber-300 underline">{boardPlacingAnimatedType}</span> (Radius: {boardPlacingTemplate.radius}%, Intensity: {Math.round((boardPlacingTemplate.intensity || 1) * 100)}%) — Click map to stamp copies
                      </span>
                      <button
                        onClick={() => {
                          setBoardPlacingAnimatedType(null);
                          setBoardPlacingTemplate(null);
                          setBoardPolygonDrawingState(null);
                        }}
                        className="px-2.5 py-0.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors ml-1 text-[11px]"
                        title="Done / Cancel (Escape)"
                      >
                        Done (Esc)
                      </button>
                    </>
                  ) : isPolygonDraw ? (
                    drawCount > 0 ? (
                      <>
                        <span>
                          Drawing <span className="uppercase text-cyan-300 underline">{boardPlacingAnimatedType}</span>: <span className="bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full text-white">{drawCount} {drawCount === 1 ? 'pt' : 'pts'}</span>
                        </span>
                        <span className="text-zinc-400 font-normal text-[11px] hidden sm:inline flex items-center gap-1">
                          (Hold <kbd className="px-1.5 py-0.5 bg-zinc-800 text-amber-300 rounded border border-zinc-700 font-mono text-[10px]">Shift</kbd> to move map)
                        </span>

                        {/* Finish / Complete Polygon button */}
                        <button
                          onClick={() => {
                            if (canFinish && boardPolygonDrawingState) {
                              boardPolygonDrawingState.finish();
                            }
                          }}
                          disabled={!canFinish}
                          className={`px-3 py-1 rounded-full flex items-center gap-1 font-bold transition-all text-xs ${
                            canFinish
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)] cursor-pointer'
                              : 'bg-zinc-800/80 text-zinc-500 border border-zinc-700/50 cursor-not-allowed'
                          }`}
                          title={canFinish ? 'Finish and close polygon (↵ Enter or double-click)' : 'Need at least 3 points to complete polygon'}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{canFinish ? 'Finish (↵ Enter)' : 'Need ≥ 3 pts'}</span>
                        </button>

                        {/* Undo last vertex */}
                        <button
                          onClick={() => {
                            boardPolygonDrawingState?.undo();
                          }}
                          className="px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors text-[11px] flex items-center gap-1"
                          title="Undo last point (Backspace)"
                        >
                          <Undo2 className="w-3 h-3" />
                          <span>Undo</span>
                        </button>

                        {/* Clear drawn points */}
                        <button
                          onClick={() => {
                            boardPolygonDrawingState?.clear();
                          }}
                          className="px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors text-[11px]"
                          title="Clear points (Escape)"
                        >
                          Clear
                        </button>

                        {/* Cancel entire placement */}
                        <button
                          onClick={() => {
                            setBoardPlacingAnimatedType(null);
                            setBoardPlacingTemplate(null);
                            setBoardPolygonDrawingState(null);
                          }}
                          className="px-2.5 py-1 rounded-full bg-red-900/60 hover:bg-red-800/80 border border-red-700/50 text-red-200 transition-colors text-[11px]"
                          title="Cancel placement"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <span>
                          Click map to draw <span className="uppercase text-cyan-300 underline">{boardPlacingAnimatedType}</span> polygon
                        </span>
                        <span className="text-zinc-400 font-normal text-[11px] hidden sm:inline flex items-center gap-1">
                          (Hold <kbd className="px-1.5 py-0.5 bg-zinc-800 text-amber-300 rounded border border-zinc-700 font-mono text-[10px]">Shift</kbd> to move map)
                        </span>

                        {/* Quick stamp preset button */}
                        <button
                          onClick={() => {
                            const newFeat: AnimatedFeature = {
                              id: `anim-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                              type: boardPlacingAnimatedType,
                              x: 50,
                              y: 50,
                              radius: isWater ? 16 : 15,
                              intensity: 1.0,
                              speed: 1.0,
                              rotation: isWater ? 45 : 0,
                              shapePreset: isWater ? 'winding_river' : 'volcanic_chasm',
                              opacity: 1.0
                            };
                            setBoardAnimatedFeatures(prev => [...prev, newFeat]);
                            setBoardAnimatedEnabled(true);
                            setBoardPlacingAnimatedType(null);
                            setBoardPolygonDrawingState(null);
                            toast.success(`Placed preset ${boardPlacingAnimatedType} on map`);
                          }}
                          className="px-2.5 py-0.5 rounded-full bg-cyan-950 hover:bg-cyan-800 border border-cyan-600/70 text-cyan-200 hover:text-white transition-colors text-[11px]"
                          title="Place standard corridor preset at center instead of drawing custom outline"
                        >
                          Stamp Preset
                        </button>

                        <button
                          onClick={() => {
                            setBoardPlacingAnimatedType(null);
                            setBoardPlacingTemplate(null);
                            setBoardPolygonDrawingState(null);
                          }}
                          className="px-2.5 py-0.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors text-[11px]"
                          title="Done / Cancel (Escape)"
                        >
                          Done (Esc)
                        </button>
                      </>
                    )
                  ) : (
                    <>
                      <span>
                        Click on map to place animated <span className="uppercase text-cyan-300 underline">{boardPlacingAnimatedType}</span>
                      </span>
                      <button
                        onClick={() => {
                          setBoardPlacingAnimatedType(null);
                          setBoardPlacingTemplate(null);
                          setBoardPolygonDrawingState(null);
                        }}
                        className="px-2.5 py-0.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors ml-1 text-[11px]"
                        title="Done / Cancel (Escape)"
                      >
                        Done (Esc)
                      </button>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Selected Objects Floating Toolbar */}
            {selectedTokenIds.length > 0 && (() => {
              const singleSelectedToken = selectedTokenIds.length === 1
                ? tokens.find(t => t.id === selectedTokenIds[0])
                : null;
              const isRenamingSingle = Boolean(singleSelectedToken && editingTokenNameId === singleSelectedToken.id);
              const isRenamingBatch = editingTokenNameId === 'batch';

              return (
                <div
                  id="selected-objects-floating-hud"
                  className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 bg-zinc-950/95 backdrop-blur-md border border-amber-500/60 rounded-2xl px-4 py-2.5 flex items-center gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.8)] text-xs font-mono animate-in fade-in slide-in-from-bottom-3 duration-200"
                >
                  <div className="flex items-center gap-2 pr-3 border-r border-zinc-800">
                    <MousePointer className="w-4 h-4 text-amber-400 shrink-0" />
                    {isRenamingSingle && singleSelectedToken ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSaveTokenName(singleSelectedToken.id);
                        }}
                        className="flex items-center gap-1.5"
                      >
                        <input
                          id="input-token-rename-inline"
                          type="text"
                          value={editingTokenNameText}
                          onChange={(e) => setEditingTokenNameText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              e.stopPropagation();
                              setEditingTokenNameId(null);
                            }
                          }}
                          autoFocus
                          onBlur={() => {
                            if (editingTokenNameText.trim()) {
                              handleSaveTokenName(singleSelectedToken.id);
                            } else {
                              setEditingTokenNameId(null);
                            }
                          }}
                          className="bg-zinc-900 border border-amber-500 text-amber-200 font-bold px-2 py-0.5 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 w-36 sm:w-48 font-mono"
                          placeholder="Token name..."
                        />
                        <button
                          id="btn-save-token-name"
                          type="submit"
                          onMouseDown={(e) => e.preventDefault()}
                          className="p-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-white transition-colors"
                          title="Save Name (Enter)"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        </button>
                        <button
                          id="btn-cancel-token-name"
                          type="button"
                          onClick={() => setEditingTokenNameId(null)}
                          className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                          title="Cancel (Escape)"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    ) : isRenamingBatch ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSaveBatchTokenNames();
                        }}
                        className="flex items-center gap-1.5"
                      >
                        <input
                          id="input-token-rename-batch"
                          type="text"
                          value={editingTokenNameText}
                          onChange={(e) => setEditingTokenNameText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              e.stopPropagation();
                              setEditingTokenNameId(null);
                            }
                          }}
                          autoFocus
                          onBlur={() => {
                            if (editingTokenNameText.trim()) {
                              handleSaveBatchTokenNames();
                            } else {
                              setEditingTokenNameId(null);
                            }
                          }}
                          className="bg-zinc-900 border border-amber-500 text-amber-200 font-bold px-2 py-0.5 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 w-36 sm:w-48 font-mono"
                          placeholder="Base name (e.g. Goblin)..."
                        />
                        <button
                          id="btn-save-batch-token-name"
                          type="submit"
                          onMouseDown={(e) => e.preventDefault()}
                          className="p-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-white transition-colors"
                          title="Save Batch Names (Enter)"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        </button>
                        <button
                          id="btn-cancel-batch-token-name"
                          type="button"
                          onClick={() => setEditingTokenNameId(null)}
                          className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                          title="Cancel (Escape)"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    ) : (
                      <button
                        id="btn-rename-token-bottom-menu"
                        type="button"
                        onClick={() => {
                          if (singleSelectedToken) {
                            handleStartRenameToken(singleSelectedToken.id, singleSelectedToken.name);
                          } else {
                            setEditingTokenNameId('batch');
                            setEditingTokenNameText('');
                          }
                        }}
                        className="group flex items-center gap-1.5 px-2 py-1 -my-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-400/60 transition-all text-left cursor-pointer"
                        title={singleSelectedToken ? "Click on object name to change name" : "Click to batch rename selected tokens"}
                      >
                        <span className="font-bold text-amber-300 group-hover:text-amber-100 max-w-[150px] sm:max-w-[220px] truncate border-b border-dashed border-amber-500/40 group-hover:border-amber-300">
                          {singleSelectedToken ? singleSelectedToken.name : `${selectedTokenIds.length} Items Selected`}
                        </span>
                        <Edit2 className="w-3 h-3 text-amber-400/70 group-hover:text-amber-300 group-hover:scale-110 transition-transform shrink-0" />
                      </button>
                    )}
                  </div>

                  {/* Nudge controls */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-zinc-500 uppercase font-sans">Nudge:</span>
                    <button
                      onClick={() => handleNudgeSelected(0, -1)}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all"
                      title="Move Up (Arrow Up)"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleNudgeSelected(0, 1)}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all"
                      title="Move Down (Arrow Down)"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleNudgeSelected(-1, 0)}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all"
                      title="Move Left (Arrow Left)"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleNudgeSelected(1, 0)}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all"
                      title="Move Right (Arrow Right)"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Duplicate */}
                  <button
                    onClick={handleDuplicateSelected}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold text-[11px] flex items-center gap-1.5 transition-all"
                    title="Duplicate Selected Items"
                  >
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    Duplicate
                  </button>

                  {/* Delete */}
                  <button
                    onClick={handleDeleteSelected}
                    className="px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-bold text-[11px] flex items-center gap-1 transition-all"
                    title="Delete Selected Items (Delete or Backspace)"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>

                  {/* Deselect */}
                  <button
                    onClick={() => setSelectedTokenIds([])}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all"
                    title="Deselect (Escape)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })()}

            {/* Zoom Controls Overlay */}
            <div className="absolute bottom-8 right-8 flex flex-col gap-2 z-50 pointer-events-auto">
              <button 
                onClick={() => setMapRotation((prev) => (prev + 90) % 360)}
                className="p-3 bg-zinc-900/80 backdrop-blur border border-zinc-700 rounded-full text-zinc-300 hover:text-white transition-all shadow-xl"
                title="Rotate Map 90°"
              >
                <RotateCcw className="w-6 h-6" />
              </button>
              <button 
                onClick={zoomIn}
                className="p-3 bg-zinc-900/80 backdrop-blur border border-zinc-700 rounded-full text-zinc-300 hover:text-white transition-all shadow-xl"
              >
                <ZoomIn className="w-6 h-6" />
              </button>
              <button 
                onClick={zoomOut}
                className="p-3 bg-zinc-900/80 backdrop-blur border border-zinc-700 rounded-full text-zinc-300 hover:text-white transition-all shadow-xl"
              >
                <ZoomOut className="w-6 h-6" />
              </button>
              <button 
                onClick={() => fitWholeMapToScreen()}
                className="p-3 bg-zinc-900/80 backdrop-blur border border-zinc-700 rounded-full text-amber-400 hover:text-amber-200 hover:border-amber-500/50 transition-all shadow-xl"
                title="Fit Entire Map in DM View"
              >
                <Scan className="w-6 h-6" />
              </button>
            </div>

            {/* Status Bar */}
            <div className="absolute bottom-8 left-8 px-4 py-2 bg-zinc-900/80 backdrop-blur border border-zinc-700 rounded-lg text-[10px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${tool === 'reveal' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-700'}`} />
                <span>Tool: {tool}</span>
              </div>
              <div className="w-px h-3 bg-zinc-700" />
              <span>Scale: {Math.round(stageScale * 100)}%</span>
              <div className="w-px h-3 bg-zinc-700" />
              <span>Reveals: {reveals.length}</span>
              <div className="w-px h-3 bg-zinc-700" />
              <span className="text-emerald-500">27x15 Grid Active</span>
            </div>
          </div>
        )}


      {showCinematicMapGenerator && (
        <MapGenerator 
          onClose={() => setShowCinematicMapGenerator(false)} 
          onOpenApiKeyModal={() => setShowApiKeyModal(true)}
          onApply={(url, briefing, genFeatures, genWeather, genSizePreset) => {
            setImageFile(url);
            setMapType('image');
            setReveals([]);
            setPolygonReveals([]);
            setTokens([]);
            if (briefing?.readAloud) {
              setAIVoiceScript(briefing.readAloud);
            }
            if (genFeatures && genFeatures.length > 0) {
              setBoardAnimatedFeatures(genFeatures);
              setBoardAnimatedEnabled(true);
            }
            if (genWeather && genWeather !== 'none') {
              setBoardWeatherEffect(genWeather);
            }
            if (genSizePreset && genSizePreset !== 'custom') {
              const preset = MAP_SIZE_PRESETS[genSizePreset];
              const newGrid = Math.round(1920 / preset.width);
              setGridSize(newGrid);
              setGridVisible(true);
            }
            setShowCinematicMapGenerator(false);
            toast.success("Battlemap and animated FX applied to the board!");
          }}
        />
      )}

      {/* Gemini API Key Modal */}
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onKeySaved={() => setHasApiKey(true)}
      />

      {/* Settings & Secrets Vault Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => {
          setShowSettingsModal(false);
          checkApiKeyStatus().then(status => {
            setHasApiKey(status.hasKey);
          });
        }}
        initialTab={settingsInitialTab}
      />

      {showCombatTracker && (
        <CombatTracker 
          onClose={() => setShowCombatTracker(false)} 
          combatants={combatTrackerCombatants}
          setCombatants={setCombatTrackerCombatants}
          round={combatTrackerRound}
          setRound={setCombatTrackerRound}
          turnIndex={combatTrackerTurnIndex}
          setTurnIndex={setCombatTrackerTurnIndex}
          isMinimized={isCombatTrackerMinimized}
          setIsMinimized={setIsCombatTrackerMinimized}
          tokens={tokens}
          onUpdateToken={(id, updates) => {
            const matchedComb = combatTrackerCombatants.find(c => c.id === id || (c as any).tokenId === id);
            setTokens(prev => prev.map(t => {
              const isMatch = t.id === id ||
                (matchedComb && ((matchedComb as any).tokenId === t.id || (matchedComb.name && t.name && matchedComb.name.toLowerCase().trim() === t.name.toLowerCase().trim())));
              return isMatch ? { ...t, ...updates } : t;
            }));
          }}
          onPanToToken={(id) => setSelectedTokenIds([id])}
        />
      )}

      {/* 3D Physics Dice Table Overlay */}
      <DiceTableOverlay
        socket={socketInstance || socketRef.current}
        onCriticalHit={() => triggerShake(true)}
      />

      {/* Lore Ledger Modal/Panel - REMOVED */}
      {false && (
        <div className="fixed inset-y-0 right-0 w-[450px] bg-zinc-950 border-l border-orange-500/30 shadow-2xl z-[100] flex flex-col animate-in slide-in-from-right">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500" />
          
          <div className="p-6 pb-0 flex items-center justify-between border-b border-zinc-800">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
                <Book className="w-5 h-5 text-orange-400" />
                Lore Ledger
              </h2>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-4">World Bible & RAG Context</p>
            </div>
            <button
              onClick={() => setShowLoreLedger(false)}
              className="p-2 text-zinc-500 hover:text-white rounded-xl hover:bg-zinc-900 transition-colors self-start"
            >
              <RotateCcw className="w-5 h-5 rotate-45" />
            </button>
          </div>

          <div className="flex px-6 pt-4 border-b border-zinc-800">
            <button
              onClick={() => setLoreTab('sources')}
              className={`pb-3 px-4 font-bold text-sm tracking-wide transition-colors border-b-2 ${loreTab === 'sources' ? 'border-orange-500 text-orange-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
            >
              Knowledge Base
            </button>
            <button
              onClick={() => setLoreTab('chat')}
              className={`pb-3 px-4 font-bold text-sm tracking-wide transition-colors border-b-2 ${loreTab === 'chat' ? 'border-orange-500 text-orange-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
            >
              Ask the Oracle
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col relative custom-scrollbar-red">
            {loreTab === 'sources' && (
              <div className="p-6 flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-bold text-white mb-2">Sources ({loreSources.length})</h3>
                  {loreSources.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-zinc-700 text-zinc-500 text-xs text-center">
                      No lore added yet. Upload PDFs or add text below.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {loreSources.map(src => (
                        <div key={src.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${src.type === 'pdf' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                              {src.type === 'pdf' ? <Book className="w-4 h-4" /> : <SquareIcon className="w-4 h-4" />}
                            </div>
                            <span className="text-sm text-zinc-300 font-medium truncate max-w-[200px]">{src.name}</span>
                          </div>
                          <button
                            onClick={() => setLoreSources(loreSources.filter(s => s.id !== src.id))}
                            className="text-zinc-600 hover:text-red-400 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-4 pt-4 border-t border-zinc-800">
                  <h3 className="text-sm font-bold text-white">Add Lore Note</h3>
                  <input
                    type="text"
                    value={newLoreTitle}
                    onChange={e => setNewLoreTitle(e.target.value)}
                    placeholder="Note Title (e.g., 'NPC: Bob')"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-orange-500/50"
                  />
                  <textarea
                    value={newLoreText}
                    onChange={e => setNewLoreText(e.target.value)}
                    placeholder="Note Content..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-white resize-y min-h-[100px] focus:border-orange-500/50"
                  />
                  <button
                    onClick={handleAddTextLore}
                    disabled={!newLoreTitle.trim() || !newLoreText.trim()}
                    className="py-2 rounded-lg bg-zinc-800 text-zinc-300 font-bold text-sm hover:text-white hover:bg-zinc-700 disabled:opacity-50"
                  >
                    Save Note
                  </button>
                  
                  <div className="relative mt-2">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800"></div></div>
                    <div className="relative flex justify-center"><span className="bg-zinc-950 px-2 text-xs text-zinc-600 uppercase font-bold">OR</span></div>
                  </div>

                  <label className="flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed border-zinc-700 bg-zinc-900/30 text-zinc-400 hover:text-orange-400 hover:border-orange-500/30 hover:bg-orange-500/5 cursor-pointer transition-colors group">
                    <Upload className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                    <span className="text-sm font-bold">Upload PDF Document</span>
                    <input type="file" accept="application/pdf" className="hidden" onChange={handleAddPdfLore} />
                  </label>
                </div>
              </div>
            )}

            {loreTab === 'chat' && (
              <div className="flex-1 flex flex-col h-full">
                <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
                  {loreHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500 gap-4 opacity-50">
                      <Book className="w-16 h-16 text-zinc-700" />
                      <p className="text-sm">Ask the Lore Master anything about your specific campaign.</p>
                    </div>
                  ) : (
                    loreHistory.map((msg, i) => (
                      <div key={i} className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'self-end bg-orange-500/20 text-orange-100 border border-orange-500/30 rounded-t-2xl rounded-bl-2xl px-4 py-3' : 'self-start bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-t-2xl rounded-br-2xl px-4 py-3 shadow-lg'}`}>
                        <div className="text-sm font-serif leading-relaxed whitespace-pre-wrap flex-1">
                          {msg.parts[0]?.text}
                        </div>
                        {msg.role === 'model' && msg.parts[0]?.text && (
                          <div className="mt-2 flex justify-end">
                            <button
                              onClick={() => playTTS(msg.parts[0]?.text || '', 'Kore')}
                              disabled={isPlayingAudio}
                              className={`p-1 rounded-lg transition-colors ${isPlayingAudio ? 'text-orange-500/30 cursor-not-allowed' : 'text-zinc-500 hover:text-orange-400 hover:bg-zinc-800'}`}
                              title="Read Aloud"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  {isLoreChatting && (
                    <div className="self-start flex gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-2xl">
                      <div className="w-2 h-2 rounded-full bg-orange-500/50 animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-orange-500/50 animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 rounded-full bg-orange-500/50 animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  )}
                  {loreError && (
                    <div className="self-center p-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-xs font-mono max-w-[90%] text-center">
                      {loreError}
                    </div>
                  )}
                </div>
                
                <div className="p-4 bg-zinc-950 border-t border-zinc-800 shrink-0">
                  <form onSubmit={handleLoreChatSubmit} className="flex gap-2 relative">
                    <input
                      type="text"
                      value={loreChatInput}
                      onChange={e => setLoreChatInput(e.target.value)}
                      placeholder="Consult the Oracle..."
                      disabled={isLoreChatting}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={!loreChatInput.trim() || isLoreChatting}
                      className="px-4 bg-orange-500 hover:bg-orange-400 text-white rounded-xl font-bold shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0"
                    >
                      <Sparkles className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Describe Result Panel */}
      {(isAiDescribingLoading || aiDescribeResult || aiDescribeError) && (
        <div className="fixed bottom-12 right-12 w-96 bg-zinc-950/90 backdrop-blur-xl border border-indigo-500/30 rounded-2xl shadow-2xl z-[150] overflow-hidden animate-in slide-in-from-bottom-5">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
          <div className="p-5">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Scan className="w-4 h-4 text-indigo-400" />
                Dungeon Master Vision
              </h3>
              <button
                onClick={() => {
                  setAiDescribeResult(null);
                  setAiDescribeError(null);
                  setAiDescribeRect(null);
                }}
                className="text-zinc-500 hover:text-white font-mono text-xs px-2 py-1 bg-zinc-900 rounded-lg"
              >
                CLOSE
              </button>
            </div>
            
            <div className="text-sm text-zinc-300 leading-relaxed font-serif">
              {isAiDescribingLoading && (
                <div className="flex items-center gap-3 py-4 text-indigo-300 font-mono text-xs">
                  <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin shrink-0" />
                  Observing the area...
                </div>
              )}
              {aiDescribeError && (
                <div className="text-red-400 font-mono text-xs p-3 bg-red-500/10 rounded-xl">
                  {aiDescribeError}
                </div>
              )}
              {aiDescribeResult && !isAiDescribingLoading && (
                <div className="space-y-4">
                  <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800 italic">
                    "{aiDescribeResult}"
                  </div>
                  <div className="flex items-center gap-2">
                    <select 
                      className="bg-zinc-800 border border-zinc-700 rounded-lg text-[10px] text-zinc-300 px-2 py-1 focus:outline-none focus:border-indigo-500"
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'dm') return;
                        const token = tokens.find(t => t.id === val);
                        if (token) {
                           // Set voice or just use it on click
                        }
                      }}
                      id="speaker-select"
                    >
                      <option value="dm">Narrator (Default)</option>
                      {tokens.filter(t => t.voice && !t.isCondition).map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.voice})</option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const select = document.getElementById('speaker-select') as HTMLSelectElement;
                        const speakerId = select.value;
                        const voice = speakerId === 'dm' ? 'Kore' : tokens.find(t => t.id === speakerId)?.voice;
                        playTTS(aiDescribeResult, voice);
                      }}
                      disabled={isPlayingAudio}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50"
                    >
                      {isPlayingAudio ? (
                        <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      ) : <Volume2 className="w-4 h-4" />}
                      {isPlayingAudio ? 'SPEAKING...' : 'NARRATE'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Autonomous AI DM Panel - REMOVED */}
      {false && (
        <div className="fixed top-24 right-12 w-[400px] h-[600px] bg-zinc-950/95 backdrop-blur-xl border border-rose-500/30 rounded-2xl shadow-2xl z-[140] flex flex-col overflow-hidden animate-in slide-in-from-right-8">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500 to-orange-500" />
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
            <div className="flex flex-col">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-rose-400" />
                Autonomous Auto-DM
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <button 
                  onClick={() => setUseRulesEngine(!useRulesEngine)}
                  className={`text-[9px] px-1.5 py-0.5 rounded border transition-all font-mono uppercase tracking-tighter ${useRulesEngine ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}
                >
                  Strict Ref: {useRulesEngine ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowAutoDM(false)}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              <RotateCcw className="w-4 h-4 rotate-45" />
            </button>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 custom-scrollbar-orange relative">
            {atmosphere.ambientSound && (
              <div className="sticky top-0 z-10 p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center gap-2 mb-2 animate-in fade-in slide-in-from-top-2">
                <Volume2 className="w-3 h-3 text-indigo-400 animate-pulse" />
                <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest truncate">
                  Atmosphere: {atmosphere.ambientSound}
                </span>
                <button 
                  onClick={() => setAtmosphere(prev => ({ ...prev, ambientSound: '' }))}
                  className="ml-auto text-indigo-500 hover:text-indigo-300"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            )}
            
            {autoDMHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500 gap-4 opacity-50">
                <Users className="w-12 h-12 text-zinc-700" />
                <p className="text-sm font-mono">I am connected to the map state.<br/>Tell me what the players do!</p>
              </div>
            ) : (
              autoDMHistory.map((msg, i) => (
                <div key={i} className={`flex flex-col max-w-[90%] ${msg.role === 'user' ? 'self-end bg-rose-500/20 text-rose-100 border border-rose-500/30 rounded-t-2xl rounded-bl-2xl px-4 py-3' : 'self-start bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-t-2xl rounded-br-2xl px-4 py-3 shadow-lg'}`}>
                  <div className="text-sm font-serif leading-relaxed whitespace-pre-wrap">
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            {isAutoDMThinking && (
              <div className="self-start flex gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-2xl">
                <div className="w-2 h-2 rounded-full bg-rose-500/50 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-rose-500/50 animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 rounded-full bg-rose-500/50 animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            )}
          </div>
          
          <div className="p-4 bg-zinc-950 border-t border-zinc-800 shrink-0">
            <form onSubmit={handleAutoDMSubmit} className="flex gap-2">
              <input
                type="text"
                value={autoDMChatInput}
                onChange={e => setAutoDMChatInput(e.target.value)}
                placeholder="What do the players do?"
                disabled={isAutoDMThinking}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-rose-500/50 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!autoDMChatInput.trim() || isAutoDMThinking}
                className="w-12 flex items-center justify-center bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold shadow-lg shadow-rose-500/20 disabled:opacity-50 transition-all shrink-0"
              >
                <Sparkles className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Token Context Menu (Monster Compendium, Name, Voice Selection) */}
      {activeTokenMenu && (() => {
        const currentToken = tokens.find(t => t.id === activeTokenMenu.id);
        const isCharacter = currentToken?.category === 'character' || !currentToken?.isMonster;

        const matchingChar = isCharacter ? (
          compendiumCharacters.find(c => 
            c.name.toLowerCase() === currentToken?.name.toLowerCase() ||
            currentToken?.name.toLowerCase().includes(c.name.toLowerCase()) ||
            c.name.toLowerCase().includes(currentToken?.name.toLowerCase() || '')
          ) || DEFAULT_CHARACTERS.find(c => 
            c.name.toLowerCase() === currentToken?.name.toLowerCase() ||
            currentToken?.name.toLowerCase().includes(c.name.toLowerCase()) ||
            c.name.toLowerCase().includes(currentToken?.name.toLowerCase() || '')
          )
        ) : null;

        const displayAc = currentToken?.ac ?? matchingChar?.ac ?? 10;
        const displayHp = currentToken?.currentHp ?? currentToken?.hp ?? matchingChar?.hp ?? matchingChar?.maxHp ?? 10;
        const displayMaxHp = currentToken?.maxHp ?? matchingChar?.maxHp ?? matchingChar?.hp ?? 10;

        const menuX = Math.max(16, Math.min(activeTokenMenu.x, window.innerWidth - 300));
        const menuY = Math.max(16, Math.min(activeTokenMenu.y, window.innerHeight - 440));

        const handleUpdateDmToken = (updates: any) => {
          setTokens(prev => {
            const next = prev.map(t => t.id === activeTokenMenu.id ? { ...t, ...updates } : t);
            if (mapsDataRef.current[activeMapId]) {
              mapsDataRef.current[activeMapId].tokens = next;
            }
            if (socketRef.current?.connected && (activeMapIdRef.current === liveMapIdRef.current)) {
              socketRef.current.emit('SYNC_TOKENS', next);
            }
            return next;
          });
        };

        return (
          <div 
            id="token-context-menu-popup"
            className="fixed z-[300] bg-zinc-950/95 backdrop-blur-xl border border-zinc-700/80 rounded-xl shadow-2xl p-3.5 w-72 animate-in fade-in zoom-in-95"
            style={{ left: menuX, top: menuY }}
          >
            <div className="flex justify-between items-center mb-2.5 pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span className={`w-2 h-2 rounded-full ${isCharacter ? 'bg-emerald-400' : 'bg-amber-400'} shrink-0`} />
                <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest truncate font-mono">
                  {currentToken?.name || 'Token Settings'}
                </span>
              </div>
              <button 
                onClick={() => setActiveTokenMenu(null)} 
                className="text-zinc-500 hover:text-white text-base leading-none p-0.5"
                title="Close (Escape)"
              >
                ×
              </button>
            </div>
            
            <div className="flex items-center gap-1 mb-2 bg-zinc-900/90 p-1 rounded-lg border border-zinc-800">
              <button
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
                onClick={() => setTokenMenuTab('conditions')}
                className={`flex-1 py-1 rounded-md text-[10px] font-bold font-mono transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  tokenMenuTab === 'conditions'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Conditions
                {(currentToken?.conditions?.length || 0) > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                )}
              </button>
              <button
                onClick={() => setTokenMenuTab('auras')}
                className={`flex-1 py-1 rounded-md text-[10px] font-bold font-mono transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  tokenMenuTab === 'auras'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                <span>Auras</span>
                {((currentToken?.auraRadius && currentToken.auraRadius > 0) || (currentToken?.auras && currentToken.auras.length > 0)) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
                )}
              </button>
            </div>
            
            {tokenMenuTab === 'stats' && (
              <div className="space-y-2.5">
                 {/* View Compendium Button (Hero vs Ally vs Monster) */}
                 {isCharacter ? (
                   <button
                     id="btn-token-view-hero-compendium"
                     onClick={() => {
                       if (currentToken) {
                         const cleanName = currentToken.name.replace(/\s+\d+$/, '').trim();
                         setCharacterCompendiumInitialSearch(cleanName || currentToken.name);
                         setShowCharacterCompendium(true);
                         setActiveTokenMenu(null);
                       }
                     }}
                     className="w-full flex items-center justify-between py-2 px-2.5 bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-cyan-500/15 hover:from-emerald-500/25 hover:to-cyan-500/25 border border-emerald-500/40 hover:border-emerald-400 text-emerald-200 hover:text-emerald-100 rounded-lg text-xs font-bold transition-all shadow-sm group cursor-pointer"
                     title="View Hero Compendium character sheet, stats, spells and equipment"
                   >
                     <div className="flex items-center gap-2 overflow-hidden">
                       <Users className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
                       <span className="truncate">Hero Compendium</span>
                     </div>
                     <ChevronRight className="w-3.5 h-3.5 text-emerald-400/70 group-hover:translate-x-0.5 transition-transform shrink-0" />
                   </button>
                 ) : currentToken?.category === 'ally' ? (
                   <button
                     id="btn-token-view-allies-compendium"
                     onClick={() => {
                       if (currentToken) {
                         const cleanName = currentToken.name.replace(/\s+\d+$/, '').trim();
                         setAlliesCompendiumInitialSearch(cleanName || currentToken.name);
                         setShowAlliesCompendium(true);
                         setActiveTokenMenu(null);
                       }
                     }}
                     className="w-full flex items-center justify-between py-2 px-2.5 bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-teal-500/15 hover:from-amber-500/25 hover:to-emerald-500/25 border border-amber-500/40 hover:border-amber-400 text-amber-200 hover:text-amber-100 rounded-lg text-xs font-bold transition-all shadow-sm group cursor-pointer"
                     title="View Allies Compendium statblock, summon traits, and abilities"
                   >
                     <div className="flex items-center gap-2 overflow-hidden">
                       <Sparkles className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
                       <span className="truncate">Allies Compendium</span>
                     </div>
                     <ChevronRight className="w-3.5 h-3.5 text-amber-400/70 group-hover:translate-x-0.5 transition-transform shrink-0" />
                   </button>
                 ) : (
                   <button
                     id="btn-token-view-compendium"
                     onClick={() => {
                       if (currentToken) {
                         const cleanName = currentToken.name.replace(/\s+\d+$/, '').trim();
                         setCompendiumInitialSearch(cleanName || currentToken.name);
                         setShowMonsterCompendium(true);
                         setActiveTokenMenu(null);
                       }
                     }}
                     className="w-full flex items-center justify-between py-2 px-2.5 bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-red-500/15 hover:from-amber-500/25 hover:to-red-500/25 border border-amber-500/40 hover:border-amber-400 text-amber-200 hover:text-amber-100 rounded-lg text-xs font-bold transition-all shadow-sm group cursor-pointer"
                     title="View Monster Compendium stats, attacks, actions and statblock"
                   >
                     <div className="flex items-center gap-2 overflow-hidden">
                       <BookOpen className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
                       <span className="truncate">Monster Compendium</span>
                     </div>
                     <ChevronRight className="w-3.5 h-3.5 text-amber-400/70 group-hover:translate-x-0.5 transition-transform shrink-0" />
                   </button>
                 )}

                 <div className="flex flex-col gap-1">
                   <label className="text-[9px] text-zinc-400 uppercase font-bold tracking-tighter">Token Name</label>
                   <input
                     type="text"
                     className="bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200 px-2 py-1.5 focus:outline-none focus:border-amber-500 font-mono"
                     value={currentToken?.name || ''}
                     onChange={(e) => {
                       const val = e.target.value;
                       setTokens(prev => prev.map(t => t.id === activeTokenMenu.id ? { ...t, name: val } : t));
                     }}
                   />
                 </div>

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
                         setTokens(prev => prev.map(t => t.id === activeTokenMenu.id ? { ...t, ac: num } : t));
                         if (currentToken) {
                           setCombatTrackerCombatants(prev => prev.map(c => 
                             c.id === currentToken.id || c.name.toLowerCase() === currentToken.name.toLowerCase()
                               ? { ...c, ac: num }
                               : c
                           ));
                         }
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
                         setTokens(prev => prev.map(t => t.id === activeTokenMenu.id ? { ...t, currentHp: num, hp: num } : t));
                         if (currentToken) {
                           setCombatTrackerCombatants(prev => prev.map(c => 
                             c.id === currentToken.id || c.name.toLowerCase() === currentToken.name.toLowerCase()
                               ? { ...c, currentHp: num ?? c.currentHp }
                               : c
                           ));
                         }
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
                         setTokens(prev => prev.map(t => t.id === activeTokenMenu.id ? { ...t, maxHp: num } : t));
                         if (currentToken) {
                           setCombatTrackerCombatants(prev => prev.map(c => 
                             c.id === currentToken.id || c.name.toLowerCase() === currentToken.name.toLowerCase()
                               ? { ...c, maxHp: num ?? c.maxHp }
                               : c
                           ));
                         }
                       }}
                     />
                   </div>
                 </div>

                 <button 
                   onClick={() => {
                     setTokens(prev => prev.filter(t => t.id !== activeTokenMenu.id));
                     setActiveTokenMenu(null);
                   }}
                   className="w-full flex items-center gap-2 py-1.5 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer mt-1"
                 >
                   <Trash2 className="w-3.5 h-3.5" />
                   Delete Token
                 </button>
               </div>
            )}

            {tokenMenuTab === 'conditions' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[9px] font-mono text-zinc-400 uppercase font-bold tracking-tighter">D&D Status Conditions</span>
                  <span className="text-[9px] font-mono text-rose-400 font-bold">{(currentToken?.conditions || []).length} Active</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto sidebar-scrollbar pr-1">
                  {DND_CONDITIONS.map(cond => {
                    const activeConditions = currentToken?.conditions || [];
                    const isActive = activeConditions.includes(cond);
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => {
                          const nextConditions = isActive
                            ? activeConditions.filter(c => c !== cond)
                            : [...activeConditions, cond];
                          setTokens(prev => prev.map(t => t.id === activeTokenMenu.id ? { ...t, conditions: nextConditions } : t));
                          if (currentToken) {
                            setCombatTrackerCombatants(prev => prev.map(c =>
                              c.id === currentToken.id ||
                              (c as any).tokenId === currentToken.id ||
                              (c.name && currentToken.name && c.name.toLowerCase().trim() === currentToken.name.toLowerCase().trim())
                                ? { ...c, conditions: nextConditions }
                                : c
                            ));
                          }
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
                {((currentToken?.auraRadius && currentToken.auraRadius > 0) || (currentToken?.auras && currentToken.auras.length > 0)) ? (
                  <div className="bg-indigo-950/40 border border-indigo-500/40 rounded-xl p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div
                        className="w-4 h-4 rounded-full border border-white/50 shrink-0 shadow-sm"
                        style={{ backgroundColor: currentToken?.auraColor || 'rgba(234, 179, 8, 0.5)' }}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-bold text-indigo-200 truncate">
                          {currentToken?.auraName || 'Magical Aura'}
                        </span>
                        <span className="text-[9px] font-mono text-indigo-400">
                          Radius: {currentToken?.auraRadius || 10} ft
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleUpdateDmToken({
                          auraRadius: undefined,
                          auraColor: undefined,
                          auraName: undefined,
                          auraOpacity: undefined,
                          auras: []
                        });
                        toast.info(`Removed aura from ${currentToken?.name || 'token'}`);
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
                      const isActive = currentToken?.auraName === preset.name || 
                        (currentToken?.auraRadius === preset.radius && currentToken?.auraColor === preset.color);
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            handleUpdateDmToken({
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
                            handleUpdateDmToken({
                              auraRadius: r,
                              auraColor: currentToken?.auraColor || customAuraColorInput,
                              auraName: currentToken?.auraName || 'Custom Aura',
                              auraOpacity: currentToken?.auraOpacity ?? customAuraOpacityInput
                            });
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all border cursor-pointer ${
                            (currentToken?.auraRadius || customAuraRadiusInput) === r
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
                            handleUpdateDmToken({
                              auraColor: pal.color,
                              auraRadius: currentToken?.auraRadius || customAuraRadiusInput || 10,
                              auraName: currentToken?.auraName || 'Custom Aura',
                              auraOpacity: currentToken?.auraOpacity ?? customAuraOpacityInput
                            });
                          }}
                          className={`w-4 h-4 rounded-full border transition-all cursor-pointer ${
                            (currentToken?.auraColor || customAuraColorInput) === pal.color
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
                      value={currentToken?.auraOpacity ?? customAuraOpacityInput}
                      onChange={(e) => {
                        const op = parseFloat(e.target.value);
                        setCustomAuraOpacityInput(op);
                        if (currentToken?.auraRadius && currentToken.auraRadius > 0) {
                          handleUpdateDmToken({ auraOpacity: op });
                        }
                      }}
                      className="flex-1 accent-indigo-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                    <span className="text-[9px] font-mono text-zinc-400 w-8 text-right">
                      {Math.round((currentToken?.auraOpacity ?? customAuraOpacityInput) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Close menu when clicking away */}
      {activeTokenMenu && (
        <div 
          className="fixed inset-0 z-[299]" 
          onClick={() => setActiveTokenMenu(null)}
          onContextMenu={(e) => { e.preventDefault(); setActiveTokenMenu(null); }}
        />
      )}

      {/* Global Audio Controller */}
      {(isPlayingAudio || isAudioPaused) && lastAudioUrl && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 p-2.5 rounded-full shadow-2xl flex items-center gap-3 z-[250] animate-in slide-in-from-bottom-4">
           <div className="flex items-center gap-1.5 px-3">
             <div className={`w-1 h-3 rounded-full bg-indigo-500 ${!isAudioPaused ? 'animate-pulse' : 'opacity-50'}`} />
             <div className={`w-1 h-4 rounded-full bg-indigo-400 ${!isAudioPaused ? 'animate-pulse duration-700' : 'opacity-50'}`} />
             <div className={`w-1 h-3 rounded-full bg-indigo-500 ${!isAudioPaused ? 'animate-pulse delay-150' : 'opacity-50'}`} />
           </div>
           
           <button 
             onClick={toggleAudioPlayback}
             className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-white transition-all shadow-lg active:scale-95 border border-zinc-600"
             title={isAudioPaused ? "Play" : "Pause"}
           >
             {isAudioPaused ? (
               <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
             ) : (
               <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
             )}
           </button>
           
           <button 
             onClick={() => {
               audioNarration.stop();
               setLastAudioUrl(null);
             }}
             className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-red-900/50 hover:text-red-400 text-zinc-400 transition-all border border-zinc-700"
             title="Stop"
           >
             <SquareIcon className="w-4 h-4 fill-current" />
           </button>
        </div>
      )}

      {/* Campaign Builder & Scene Management Modal */}
      <CampaignBuilderModal
        isOpen={showCampaignBuilder}
        onClose={() => setShowCampaignBuilder(false)}
        currentTokens={tokens}
        currentMapUrl={imageFile || ''}
        currentGridSize={gridSize}
        currentGridOpacity={gridOpacity}
        currentIsFogVisible={isFogVisible}
        currentWalls={walls}
        currentVisionConfig={visionConfig}
        currentRoomAnnotations={roomAnnotations}
        onLoadScene={handleLoadSceneFromCampaign}
        activeSceneInfo={activeSceneInfo}
        savedMaps={uploadedMaps}
        currentActiveDmNotes={activeDmNotes}
      />

      {/* Save to Campaign Modal */}
      <SaveToCampaignModal
        isOpen={showSaveToCampaignModal}
        onClose={() => setShowSaveToCampaignModal(false)}
        campaigns={campaignsList}
        currentMapUrl={imageFile || ''}
        currentMapWidth={getMapDimensions().width}
        currentMapHeight={getMapDimensions().height}
        currentTokens={tokens}
        currentGridSize={gridSize}
        currentGridOpacity={gridOpacity}
        currentIsFogVisible={isFogVisible}
        currentWalls={walls}
        currentVisionConfig={visionConfig}
        currentRoomAnnotations={roomAnnotations}
        currentBoardAnimatedFeatures={boardAnimatedFeatures}
        currentBoardAnimatedEnabled={boardAnimatedEnabled}
        currentBoardWeatherEffect={boardWeatherEffect}
        activeSceneInfo={activeSceneInfo}
        activeDmNotes={activeDmNotes}
        onSceneSaved={handleSceneSaved}
      />

      {/* Zone & Room Hotspot Editor Modal (Zone Labeling & Data Capture) */}
      {editingZone && (() => {
        const activeCamp = campaignsList.find(c => c.campaignId === activeSceneInfo?.campaignId);
        const activeChap = activeCamp?.chapters.find(ch => ch.chapterId === activeSceneInfo?.chapterId);
        const activeChapterPdfDigest = activeChap?.pdfDigest;
        return (
          <RoomHotspotEditorModal
            isOpen={isZoneEditorOpen}
            initialAnnotation={editingZone}
            onClose={() => {
              setIsZoneEditorOpen(false);
              setEditingZone(null);
            }}
            onSave={handleSaveZone}
            onDelete={handleDeleteZone}
            chapterPdfDigest={activeChapterPdfDigest}
          />
        );
      })()}

      {/* Assign Polygon Room Modal (Direct PDF Room Linking on Polygon Completion) */}
      {isAssignRoomModalOpen && pendingZonePolygonData && (() => {
        let activeCamp = campaignsList.find(c => c.campaignId === activeSceneInfo?.campaignId);
        let activeChap = activeCamp?.chapters.find(ch => ch.chapterId === activeSceneInfo?.chapterId);
        let activeChapterPdfDigest = activeChap?.pdfDigest;
        if (!activeChapterPdfDigest) {
          for (const c of campaignsList) {
            for (const ch of c.chapters) {
              if (ch.pdfDigest) {
                activeChapterPdfDigest = ch.pdfDigest;
                break;
              }
            }
            if (activeChapterPdfDigest) break;
          }
        }

        return (
          <AssignPolygonRoomModal
            isOpen={isAssignRoomModalOpen}
            onClose={handleCancelAssignPolygonRoom}
            polygonPoints={pendingZonePolygonData.pctPolyPoints}
            bounds={pendingZonePolygonData.bounds}
            chapterPdfDigest={activeChapterPdfDigest}
            existingRoomAnnotations={roomAnnotations}
            onConfirm={handleConfirmAssignPolygonRoom}
          />
        );
      })()}

      {/* Room Briefing Side-Drawer & PDF Linkage (Option 1) */}
      <RoomBriefingDrawer
        isOpen={isRoomDrawerOpen}
        room={selectedRoomAnnotation || selectedZoneForSidePanel}
        onClose={() => {
          setIsRoomDrawerOpen(false);
          setSelectedRoomAnnotation(null);
          setIsZoneSidePanelOpen(false);
          setSelectedZoneForSidePanel(null);
        }}
        onUpdateRoom={handleUpdateRoomAnnotation}
        onDeleteRoom={(roomId) => {
          handleDeleteZone(roomId);
          setIsRoomDrawerOpen(false);
          setSelectedRoomAnnotation(null);
        }}
        onBroadcastReadAloud={handleBroadcastRoomReadAloud}
        campaignId={activeSceneInfo?.campaignId}
        chapterId={activeSceneInfo?.chapterId}
        sceneId={activeSceneInfo?.sceneId}
        activeSessionId="current"
        campaignPdfs={loreSources.filter((s) => s.type === 'pdf').map((s) => ({ id: s.id, name: s.name, url: (s as any).url }))}
        chapterPdfDigest={(() => {
          let activeCamp = campaignsList.find(c => c.campaignId === activeSceneInfo?.campaignId);
          let activeChap = activeCamp?.chapters.find(ch => ch.chapterId === activeSceneInfo?.chapterId);
          if (activeChap?.pdfDigest) return activeChap.pdfDigest;

          const activeAnno = selectedRoomAnnotation || selectedZoneForSidePanel;
          if (activeAnno?.campaignId) {
            activeCamp = campaignsList.find(c => c.campaignId === activeAnno.campaignId);
            activeChap = activeCamp?.chapters.find(ch => ch.scenes.some(s => s.sceneId === activeAnno.sceneId) || ch.pdfDigest);
            if (activeChap?.pdfDigest) return activeChap.pdfDigest;
          }

          for (const c of campaignsList) {
            for (const ch of c.chapters) {
              if (ch.pdfDigest) return ch.pdfDigest;
            }
          }
          return null;
        })()}
        availableMonsters={compendiumMonsters}
        onSpawnMonsterToken={handleSpawnMonsterToken}
      />

      {/* Zone Details Side Panel (Interactivity, Lore, Read-Aloud & PDF Linkage) */}
      <ZoneDetailsSidePanel
        isOpen={isZoneSidePanelOpen && !isRoomDrawerOpen}
        zone={selectedZoneForSidePanel}
        onClose={() => {
          setIsZoneSidePanelOpen(false);
          setSelectedZoneForSidePanel(null);
        }}
        onEdit={(zone) => {
          setEditingZone(zone);
          setIsZoneEditorOpen(true);
        }}
        onDelete={(zoneId) => handleDeleteZone(zoneId)}
        onSendToChat={handleSendBriefingToChat}
        onBroadcastReadAloud={handleBroadcastRoomReadAloud}
        onOpenBriefing={(zone) => {
          setSelectedRoomAnnotation(zone);
          setSelectedZoneForSidePanel(zone);
          setIsZoneSidePanelOpen(false);
          setIsRoomDrawerOpen(true);
        }}
      />

      {/* Load Campaign Modal */}
      <LoadCampaignModal
        isOpen={showLoadCampaignModal}
        onClose={() => setShowLoadCampaignModal(false)}
        campaigns={campaignsList}
        onLoadScene={handleLoadSceneFromCampaign}
        onOpenCampaignManager={() => setShowCampaignBuilder(true)}
        activeSceneInfo={activeSceneInfo}
        onDeleteScene={async (sceneId, campaignId, chapterId) => {
          const campaign = campaignsList.find(c => c.campaignId === campaignId);
          if (!campaign) return;
          const updatedChapters = campaign.chapters.map(chap => {
            if (chap.chapterId !== chapterId) return chap;
            return {
              ...chap,
              scenes: chap.scenes.filter(s => s.sceneId !== sceneId),
              updatedAt: Date.now()
            };
          });
          await saveCampaignDoc({
            ...campaign,
            chapters: updatedChapters,
            updatedAt: Date.now()
          });
          if (activeSceneInfo?.sceneId === sceneId) {
            setActiveSceneInfo(null);
          }
          toast.success('Scene deleted successfully');
        }}
      />

      {/* Monster Compendium Modal */}
      <MonsterCompendiumModal
        isOpen={showMonsterCompendium}
        onClose={() => {
          setShowMonsterCompendium(false);
          setCompendiumInitialSearch('');
        }}
        onSpawnTokenOnMap={handleSpawnMonsterToken}
        initialSearchQuery={compendiumInitialSearch}
      />

      {/* Character Compendium Modal */}
      <CharacterCompendiumModal
        isOpen={showCharacterCompendium}
        onClose={() => {
          setShowCharacterCompendium(false);
          setCharacterCompendiumInitialSearch('');
        }}
        onSpawnTokenOnMap={handleSpawnCharacterToken}
        initialSearchQuery={characterCompendiumInitialSearch}
      />

      {/* Allies & Summons Compendium Modal */}
      <AlliesCompendiumModal
        isOpen={showAlliesCompendium}
        onClose={() => {
          setShowAlliesCompendium(false);
          setAlliesCompendiumInitialSearch('');
        }}
        onSpawnTokenOnMap={handleSpawnAllyToken}
        initialSearchQuery={alliesCompendiumInitialSearch}
      />

      {/* D&D Beyond Campaign & Live HP Modal */}
      <DdbSyncModal
        isOpen={showDdbModal}
        onClose={() => setShowDdbModal(false)}
        initialTab="campaign"
        onCharacterImportedToCompendium={(newChar) => {
          setCompendiumCharacters(prev => {
            const idx = prev.findIndex(c => c.id === newChar.id || isDdbMatch(c.name, c.id, (c as any).ddbCharacterId, (newChar as any).ddbCharacterId, newChar.name));
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = newChar;
              return next;
            }
            return [...prev, newChar];
          });
        }}
      />

      {/* D&D AI Chatbot Modal */}
      <DndChatbotModal
        isOpen={showDndChatbot}
        onClose={() => setShowDndChatbot(false)}
        currentMapName={activeSceneInfo?.sceneTitle || (imageFile ? 'Tactical Battlemap' : 'Blank Battlemap')}
        combatantsCount={combatTrackerCombatants.length}
        activeRound={combatTrackerRound}
      />

      {/* Bug Report Submission Modal */}
      <BugReportModal
        isOpen={isBugReportModalOpen}
        onClose={() => setIsBugReportModalOpen(false)}
        onOpenManager={() => setIsBugManagerModalOpen(true)}
        environmentInfo={{
          activeSceneTitle: activeSceneInfo?.sceneTitle,
          activeCampaignTitle: campaignsList.find(c => c.campaignId === activeSceneInfo?.campaignId)?.campaignTitle,
          mapDimensions: imageFile ? `${getMapDimensions().width}x${getMapDimensions().height}` : undefined,
          tokenCount: tokens.length,
          wallCount: walls.length,
          zoneCount: roomAnnotations.length,
          screenResolution: `${window.innerWidth}x${window.innerHeight}`,
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        }}
      />

      {/* Bug Reports & DM Developer Notes Manager */}
      <BugReportManagerModal
        isOpen={isBugManagerModalOpen}
        onClose={() => setIsBugManagerModalOpen(false)}
        onOpenReportModal={() => setIsBugReportModalOpen(true)}
      />

      {/* Quota Exceeded Modal */}
      {isQuotaExceeded && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-900 border border-red-900 rounded-2xl p-8 max-w-lg w-full shadow-2xl text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-white">Firestore Quota Exceeded</h2>
            <p className="text-zinc-300 text-sm leading-relaxed">
              Your project has exceeded its daily free Firestore read quota. Real-time updates and database operations are currently paused to prevent further charges on the free tier.
            </p>
            <a
              href="https://console.firebase.google.com/project/gen-lang-client-0800395076/firestore/databases/ai-studio-mistwalker20-0d1b066f-0f5c-4269-bdde-98898ca59b88/data?openUpgradeDialog=true"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all"
            >
              Upgrade Firestore Plan
            </a>
            <button
              onClick={() => setIsQuotaExceeded(false)}
              className="text-zinc-500 hover:text-white text-xs font-mono underline"
            >
              Dismiss (Database will remain limited)
            </button>
          </div>
        </div>
      )}

      {/* Floating Effect Context Menu (Scalability & Customization for Tactical Features) */}
      <EffectContextMenu
        data={effectContextMenu?.data || null}
        position={effectContextMenu?.position || null}
        onClose={() => setEffectContextMenu(null)}
        onUpdateFeature={(updated) => {
          setBoardAnimatedFeatures(prev => prev.map(feat => feat.id === updated.id ? updated : feat));
          setEffectContextMenu(prev => prev ? { ...prev, data: { type: 'feature', feature: updated } } : null);
        }}
        onDeleteFeature={(id) => {
          setBoardAnimatedFeatures(prev => prev.filter(feat => feat.id !== id));
          setEffectContextMenu(null);
        }}
        onDuplicateFeature={handleDuplicateFeature}
        onStartStampingFeature={handleStartStampingFeature}
        gridSize={gridSize}
      />

      </main>
    </div>
    </>
  );
}
