import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, ensureAuth, IS_ENTERPRISE_BETA } from '../lib/firebase';
import { WallSegment } from '../types';
import { HazardZone, HAZARD_PRESETS } from '../types/hazard';
import { isPointInHazard, canCreatureBypassHazard } from '../lib/hazardGeometry';
import { Monster } from '../types/monster';
import { PRESET_BATTLEMAPS, PresetBattlemap } from '../data/presetBattlemaps';
import { DEFAULT_MONSTERS } from '../data/defaultMonsters';
import { segmentsIntersect } from '../lib/visionEngine';

export type ArenaMatchModeConfig =
  | '1v1'
  | '2v2'
  | '3v3'
  | '4v4'
  | '5v5'
  | '6v6'
  | 'vs_npcs'
  | 'random_encounter';
export type ArenaDifficultyConfig = 'standard' | 'hard' | 'deadly';
export type ArenaHazardType = 'none' | 'lava_eruption' | 'healing_sanctuary' | 'arcane_storm';

export interface ArenaConfig {
  defaultMatchMode: ArenaMatchModeConfig;
  defaultDifficulty: ArenaDifficultyConfig;
  defaultMapId: string;
  disabledMapIds: string[];
  deletedPresetMapIds?: string[];
  customMaps: PresetBattlemap[];
  mapWalls: Record<string, WallSegment[]>;
  enforceWalls: boolean;
  mapHazards?: Record<string, HazardZone[]>;
  enforceHazards?: boolean;
  gridOpacity: number;
  monsterHpMultiplier: number;
  monsterDamageMultiplier: number;
  startingPotionsCount: number;
  allowArenaSurge: boolean;
  allowPvP: boolean;
  environmentalHazard: ArenaHazardType;
  lockDmEncounter: boolean;
  pinnedEncounterMonsters: Monster[];
  disabledMonsterIds: string[];
  customArenaMonsters: Monster[];
  updatedAt: number;
}

const ARENA_CONFIG_STORAGE_KEY = 'mistwalker_arena_config_v1';
const ARENA_LOCAL_EVENT = 'mistwalker:arena-config-updated';

export const DEFAULT_ARENA_CONFIG: ArenaConfig = {
  defaultMatchMode: 'random_encounter',
  defaultDifficulty: 'standard',
  defaultMapId: PRESET_BATTLEMAPS[3]?.id || PRESET_BATTLEMAPS[0]?.id || 'lavapit',
  disabledMapIds: [],
  deletedPresetMapIds: [],
  customMaps: [],
  mapWalls: {},
  enforceWalls: true,
  mapHazards: {},
  enforceHazards: true,
  gridOpacity: 0.38,
  monsterHpMultiplier: 1.0,
  monsterDamageMultiplier: 1.0,
  startingPotionsCount: 2,
  allowArenaSurge: true,
  allowPvP: true,
  environmentalHazard: 'none',
  lockDmEncounter: false,
  pinnedEncounterMonsters: DEFAULT_MONSTERS.slice(0, 2),
  disabledMonsterIds: [],
  customArenaMonsters: [],
  updatedAt: 0
};

export function normalizeArenaWallSegment(w: WallSegment): WallSegment {
  const wx1 = Math.round(w.x1 ?? w.p1?.x ?? w.points?.[0] ?? 0);
  const wy1 = Math.round(w.y1 ?? w.p1?.y ?? w.points?.[1] ?? 0);
  const wx2 = Math.round(w.x2 ?? w.p2?.x ?? w.points?.[2] ?? 0);
  const wy2 = Math.round(w.y2 ?? w.p2?.y ?? w.points?.[3] ?? 0);

  const rawType = (w.wallType || w.type || 'normal') as string;
  const vttWallType =
    rawType === 'door'
      ? 'door'
      : rawType === 'secret_door' || rawType === 'secret'
      ? 'secret_door'
      : rawType === 'window'
      ? 'window'
      : rawType === 'terrain'
      ? 'terrain'
      : 'normal';

  const arenaType =
    vttWallType === 'door'
      ? 'door'
      : vttWallType === 'secret_door'
      ? 'secret_door'
      : vttWallType === 'window'
      ? 'window'
      : vttWallType === 'terrain'
      ? 'terrain'
      : 'solid';

  const isOpen = Boolean(w.isOpen || w.doorState === 'open');
  const doorState = (
    w.doorState || (vttWallType === 'door' || vttWallType === 'secret_door' ? (isOpen ? 'open' : 'closed') : undefined)
  ) as any;

  return {
    ...w,
    id: w.id || `arena_wall_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    p1: { x: wx1, y: wy1 },
    p2: { x: wx2, y: wy2 },
    x1: wx1,
    y1: wy1,
    x2: wx2,
    y2: wy2,
    points: [wx1, wy1, wx2, wy2],
    wallType: vttWallType as any,
    type: arenaType,
    doorState,
    isOpen,
    blocksLight: w.blocksLight !== undefined ? w.blocksLight : vttWallType !== 'window' && vttWallType !== 'terrain',
    blocksMovement: w.blocksMovement !== undefined ? w.blocksMovement : true
  };
}

export function normalizeArenaConfig(raw: any): ArenaConfig {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_ARENA_CONFIG };
  }
  const normalizedMapWalls: Record<string, WallSegment[]> = {};
  if (raw.mapWalls && typeof raw.mapWalls === 'object') {
    for (const [mId, list] of Object.entries(raw.mapWalls)) {
      if (Array.isArray(list)) {
        normalizedMapWalls[mId] = list.map((w) => normalizeArenaWallSegment(w));
      }
    }
  }
  return {
    defaultMatchMode: ['1v1', '2v2', '3v3', '4v4', '5v5', '6v6', 'vs_npcs', 'random_encounter'].includes(raw.defaultMatchMode)
      ? raw.defaultMatchMode
      : DEFAULT_ARENA_CONFIG.defaultMatchMode,
    defaultDifficulty: ['standard', 'hard', 'deadly'].includes(raw.defaultDifficulty)
      ? raw.defaultDifficulty
      : DEFAULT_ARENA_CONFIG.defaultDifficulty,
    defaultMapId: typeof raw.defaultMapId === 'string' && raw.defaultMapId
      ? raw.defaultMapId
      : DEFAULT_ARENA_CONFIG.defaultMapId,
    disabledMapIds: Array.isArray(raw.disabledMapIds) ? raw.disabledMapIds : [],
    deletedPresetMapIds: Array.isArray(raw.deletedPresetMapIds) ? raw.deletedPresetMapIds : [],
    customMaps: Array.isArray(raw.customMaps) ? raw.customMaps : [],
    mapWalls: normalizedMapWalls,
    enforceWalls: typeof raw.enforceWalls === 'boolean' ? raw.enforceWalls : true,
    mapHazards: raw.mapHazards && typeof raw.mapHazards === 'object' ? raw.mapHazards : {},
    enforceHazards: typeof raw.enforceHazards === 'boolean' ? raw.enforceHazards : true,
    gridOpacity: typeof raw.gridOpacity === 'number' ? Math.max(0, Math.min(1, raw.gridOpacity)) : 0.38,
    monsterHpMultiplier: typeof raw.monsterHpMultiplier === 'number' ? Math.max(0.25, Math.min(5, raw.monsterHpMultiplier)) : 1.0,
    monsterDamageMultiplier: typeof raw.monsterDamageMultiplier === 'number' ? Math.max(0.25, Math.min(4, raw.monsterDamageMultiplier)) : 1.0,
    startingPotionsCount: typeof raw.startingPotionsCount === 'number' ? Math.max(0, Math.min(10, Math.round(raw.startingPotionsCount))) : 2,
    allowArenaSurge: typeof raw.allowArenaSurge === 'boolean' ? raw.allowArenaSurge : true,
    allowPvP: typeof raw.allowPvP === 'boolean' ? raw.allowPvP : true,
    environmentalHazard: ['none', 'lava_eruption', 'healing_sanctuary', 'arcane_storm'].includes(raw.environmentalHazard)
      ? raw.environmentalHazard
      : 'none',
    lockDmEncounter: Boolean(raw.lockDmEncounter),
    pinnedEncounterMonsters: Array.isArray(raw.pinnedEncounterMonsters)
      ? raw.pinnedEncounterMonsters
      : DEFAULT_ARENA_CONFIG.pinnedEncounterMonsters,
    disabledMonsterIds: Array.isArray(raw.disabledMonsterIds) ? raw.disabledMonsterIds : [],
    customArenaMonsters: Array.isArray(raw.customArenaMonsters) ? raw.customArenaMonsters : [],
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now()
  };
}

export function loadArenaConfig(): ArenaConfig {
  try {
    const raw = localStorage.getItem(ARENA_CONFIG_STORAGE_KEY);
    if (raw) {
      return normalizeArenaConfig(JSON.parse(raw));
    }
  } catch (err) {
    console.warn('[ArenaConfig] Failed to read localStorage:', err);
  }
  return { ...DEFAULT_ARENA_CONFIG };
}

function stripUndefinedDeep(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(stripUndefinedDeep);
  }
  if (obj && typeof obj === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out;
  }
  return obj;
}

export async function saveArenaConfig(config: ArenaConfig, socket?: any): Promise<ArenaConfig> {
  const stamped: ArenaConfig = {
    ...normalizeArenaConfig(config),
    updatedAt: Date.now()
  };

  try {
    localStorage.setItem(ARENA_CONFIG_STORAGE_KEY, JSON.stringify(stamped));
  } catch (err) {
    console.warn('[ArenaConfig] localStorage save notice:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ARENA_LOCAL_EVENT, { detail: stamped }));
  }

  if (socket && socket.connected) {
    socket.emit('ARENA_CONFIG_UPDATE', stamped);
  }

  try {
    await ensureAuth();
    const cleanDoc = stripUndefinedDeep(stamped);
    const arenaDocId = IS_ENTERPRISE_BETA ? 'beta_arena_config' : 'arena_config';
    await setDoc(doc(db, 'activeSession', arenaDocId), cleanDoc, { merge: true });
  } catch (err) {
    console.warn('[ArenaConfig] Firestore sync notice:', err);
  }

  return stamped;
}

export function subscribeToArenaConfig(callback: (config: ArenaConfig) => void): () => void {
  const onLocalUpdate = (e: Event) => {
    const detail = (e as CustomEvent<ArenaConfig>).detail;
    if (detail) {
      callback(normalizeArenaConfig(detail));
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(ARENA_LOCAL_EVENT, onLocalUpdate);
  }

  let unsubFirestore: (() => void) | null = null;
  try {
    unsubFirestore = onSnapshot(
      doc(db, 'activeSession', IS_ENTERPRISE_BETA ? 'beta_arena_config' : 'arena_config'),
      (snap) => {
        if (snap.exists()) {
          const remote = normalizeArenaConfig(snap.data());
          try {
            localStorage.setItem(ARENA_CONFIG_STORAGE_KEY, JSON.stringify(remote));
          } catch {}
          callback(remote);
        }
      },
      (err) => {
        console.warn('[ArenaConfig] Firestore listener notice:', err);
      }
    );
  } catch (err) {
    console.warn('[ArenaConfig] Failed to attach Firestore listener:', err);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener(ARENA_LOCAL_EVENT, onLocalUpdate);
    }
    if (unsubFirestore) {
      unsubFirestore();
    }
  };
}

/**
 * Returns the merged list of enabled Preset + DM Custom Battlemaps for the Arena
 */
export function getAvailableArenaMaps(config: ArenaConfig): PresetBattlemap[] {
  const disabledSet = new Set(config.disabledMapIds || []);
  const deletedSet = new Set(config.deletedPresetMapIds || []);
  const combined: PresetBattlemap[] = [];
  const seenIds = new Set<string>();
  const presets = PRESET_BATTLEMAPS.filter((m) => !deletedSet.has(m.id));

  for (const m of [...presets, ...(config.customMaps || [])]) {
    if (!m || !m.id || seenIds.has(m.id)) continue;
    seenIds.add(m.id);
    if (!disabledSet.has(m.id)) {
      combined.push(m);
    }
  }

  return combined.length > 0 ? combined : PRESET_BATTLEMAPS;
}

/**
 * Checks whether movement between two world pixel coordinates is blocked by any closed Arena wall
 */
export function doesArenaWallBlockMovement(
  x1OrWalls: number | WallSegment[],
  y1OrX1: number,
  x2OrY1: number,
  y2OrX2: number,
  wallsOrY2?: WallSegment[] | number
): boolean {
  let x1: number, y1: number, x2: number, y2: number, walls: WallSegment[] | undefined;
  if (Array.isArray(x1OrWalls)) {
    walls = x1OrWalls;
    x1 = y1OrX1;
    y1 = x2OrY1;
    x2 = y2OrX2;
    y2 = typeof wallsOrY2 === 'number' ? wallsOrY2 : 0;
  } else {
    x1 = x1OrWalls;
    y1 = y1OrX1;
    x2 = x2OrY1;
    y2 = y2OrX2;
    walls = Array.isArray(wallsOrY2) ? wallsOrY2 : undefined;
  }
  if (!walls || walls.length === 0) return false;
  const p1 = { x: x1, y: y1 };
  const p2 = { x: x2, y: y2 };

  for (const w of walls) {
    const wType = w.type || w.wallType || 'solid';
    if ((wType === 'door' || wType === 'secret' || wType === 'secret_door') && (w.doorState === 'open' || w.isOpen)) {
      continue;
    }
    if (w.blocksMovement === false) {
      continue;
    }
    const wx1 = w.x1 ?? w.p1?.x ?? 0;
    const wy1 = w.y1 ?? w.p1?.y ?? 0;
    const wx2 = w.x2 ?? w.p2?.x ?? 0;
    const wy2 = w.y2 ?? w.p2?.y ?? 0;
    if (segmentsIntersect(p1, p2, { x: wx1, y: wy1 }, { x: wx2, y: wy2 })) {
      return true;
    }
  }
  return false;
}

/**
 * Checks whether Line of Sight between two world pixel coordinates is blocked by a solid Arena wall or closed door
 */
export function doesArenaWallBlockSight(
  x1OrWalls: number | WallSegment[],
  y1OrX1: number,
  x2OrY1: number,
  y2OrX2: number,
  wallsOrY2?: WallSegment[] | number
): boolean {
  let x1: number, y1: number, x2: number, y2: number, walls: WallSegment[] | undefined;
  if (Array.isArray(x1OrWalls)) {
    walls = x1OrWalls;
    x1 = y1OrX1;
    y1 = x2OrY1;
    x2 = y2OrX2;
    y2 = typeof wallsOrY2 === 'number' ? wallsOrY2 : 0;
  } else {
    x1 = x1OrWalls;
    y1 = y1OrX1;
    x2 = x2OrY1;
    y2 = y2OrX2;
    walls = Array.isArray(wallsOrY2) ? wallsOrY2 : undefined;
  }
  if (!walls || walls.length === 0) return false;
  const p1 = { x: x1, y: y1 };
  const p2 = { x: x2, y: y2 };

  for (const w of walls) {
    const wType = w.type || w.wallType || 'solid';
    if (wType === 'window' || wType === 'terrain') {
      continue; // Windows and cover allow line of sight
    }
    if ((wType === 'door' || wType === 'secret' || wType === 'secret_door') && (w.doorState === 'open' || w.isOpen)) {
      continue;
    }
    if (w.blocksLight === false) {
      continue;
    }
    const wx1 = w.x1 ?? w.p1?.x ?? 0;
    const wy1 = w.y1 ?? w.p1?.y ?? 0;
    const wx2 = w.x2 ?? w.p2?.x ?? 0;
    const wy2 = w.y2 ?? w.p2?.y ?? 0;
    if (segmentsIntersect(p1, p2, { x: wx1, y: wy1 }, { x: wx2, y: wy2 })) {
      return true;
    }
  }
  return false;
}

/**
 * Preset Wall Layout 1: 4 Tactical Colosseum Pillars (60px grid, 22x14 arena)
 */
export function generateColosseumPillarWalls(gridSize = 60): WallSegment[] {
  const pillars = [
    { col: 7, row: 3, w: 2, h: 2 },
    { col: 7, row: 9, w: 2, h: 2 },
    { col: 13, row: 3, w: 2, h: 2 },
    { col: 13, row: 9, w: 2, h: 2 }
  ];
  const segments: WallSegment[] = [];
  pillars.forEach((p, idx) => {
    const x1 = p.col * gridSize;
    const y1 = p.row * gridSize;
    const x2 = (p.col + p.w) * gridSize;
    const y2 = (p.row + p.h) * gridSize;
    const corners = [
      [x1, y1, x2, y1],
      [x2, y1, x2, y2],
      [x2, y2, x1, y2],
      [x1, y2, x1, y1]
    ];
    corners.forEach(([ax, ay, bx, by], sideIdx) => {
      segments.push({
        id: `arena_pillar_${idx}_${sideIdx}_${Date.now()}`,
        x1: ax,
        y1: ay,
        x2: bx,
        y2: by,
        type: 'solid',
        blocksLight: true,
        blocksMovement: true
      });
    });
  });
  return segments;
}

/**
 * Preset Wall Layout 2: Central Chokepoint Divide with Interactive Doors
 */
export function generateChokepointDivideWalls(gridSize = 60): WallSegment[] {
  const cx = 11 * gridSize;
  const now = Date.now();
  return [
    {
      id: `arena_div_top_${now}`,
      x1: cx,
      y1: 0,
      x2: cx,
      y2: 4 * gridSize,
      type: 'solid',
      blocksLight: true,
      blocksMovement: true
    },
    {
      id: `arena_div_door1_${now}`,
      x1: cx,
      y1: 4 * gridSize,
      x2: cx,
      y2: 6 * gridSize,
      type: 'door',
      doorState: 'closed',
      blocksLight: true,
      blocksMovement: true
    },
    {
      id: `arena_div_mid_${now}`,
      x1: cx,
      y1: 6 * gridSize,
      x2: cx,
      y2: 8 * gridSize,
      type: 'solid',
      blocksLight: true,
      blocksMovement: true
    },
    {
      id: `arena_div_door2_${now}`,
      x1: cx,
      y1: 8 * gridSize,
      x2: cx,
      y2: 10 * gridSize,
      type: 'door',
      doorState: 'closed',
      blocksLight: true,
      blocksMovement: true
    },
    {
      id: `arena_div_bot_${now}`,
      x1: cx,
      y1: 10 * gridSize,
      x2: cx,
      y2: 14 * gridSize,
      type: 'solid',
      blocksLight: true,
      blocksMovement: true
    }
  ];
}

/**
 * Preset Wall Layout 3: Tactical Cover Barricades & Flanking Lanes
 */
export function generateTacticalBarricadeWalls(gridSize = 60): WallSegment[] {
  const now = Date.now();
  return [
    // Left vanguard shield wall
    {
      id: `arena_bar_l1_${now}`,
      x1: 6 * gridSize,
      y1: 4 * gridSize,
      x2: 6 * gridSize,
      y2: 10 * gridSize,
      type: 'window',
      blocksLight: false,
      blocksMovement: true
    },
    // Right vanguard shield wall
    {
      id: `arena_bar_r1_${now}`,
      x1: 16 * gridSize,
      y1: 4 * gridSize,
      x2: 16 * gridSize,
      y2: 10 * gridSize,
      type: 'window',
      blocksLight: false,
      blocksMovement: true
    },
    // Center sanctum monolith
    {
      id: `arena_bar_c1_${now}`,
      x1: 10 * gridSize,
      y1: 6 * gridSize,
      x2: 12 * gridSize,
      y2: 6 * gridSize,
      type: 'solid',
      blocksLight: true,
      blocksMovement: true
    },
    {
      id: `arena_bar_c2_${now}`,
      x1: 10 * gridSize,
      y1: 8 * gridSize,
      x2: 12 * gridSize,
      y2: 8 * gridSize,
      type: 'solid',
      blocksLight: true,
      blocksMovement: true
    }
  ];
}

/**
 * Preset Lava Pit Hazard Zones for the Lavapit Arena Battlemap (22x14 grid, 1320x840 px)
 * Covers the molten lava streams in the cavern, with high stone bridges/islands in between.
 */
export function generateLavapitDefaultHazards(gridSize = 60, cols = 22, rows = 14): HazardZone[] {
  const mapW = cols * gridSize;
  const mapH = rows * gridSize;

  // Convert pixel coords to percentage bounds
  const toPct = (x: number, y: number, w: number, h: number) => ({
    x: Math.round((x / mapW) * 1000) / 10,
    y: Math.round((y / mapH) * 1000) / 10,
    width: Math.round((w / mapW) * 1000) / 10,
    height: Math.round((h / mapH) * 1000) / 10
  });

  return [
    // Magma Pool 1: Central-North bubbling pool (cols 7 to 14, rows 1 to 4)
    {
      id: 'hazard_lava_north',
      name: 'North Magma Pool',
      type: 'lava',
      severity: 'lethal',
      bounds: toPct(7 * gridSize, 1 * gridSize, 8 * gridSize, 3 * gridSize),
      polygonPoints: [
        (7 / cols) * 100, (1 / rows) * 100,
        (15 / cols) * 100, (1 / rows) * 100,
        (15 / cols) * 100, (4 / rows) * 100,
        (7 / cols) * 100, (4 / rows) * 100
      ],
      damageFormula: '10d10 fire',
      conditionInflicted: 'burning',
      color: '#ef4444',
      bypassRules: {
        requiresFlight: true,
        immuneDamageTypes: ['fire']
      },
      visibleToPlayers: true
    },
    // Magma Pool 2: South-East fissure stream (cols 13 to 21, rows 9 to 13)
    {
      id: 'hazard_lava_southeast',
      name: 'South-East Molten Trench',
      type: 'lava',
      severity: 'lethal',
      bounds: toPct(13 * gridSize, 9 * gridSize, 8 * gridSize, 4 * gridSize),
      polygonPoints: [
        (13 / cols) * 100, (9 / rows) * 100,
        (21 / cols) * 100, (9 / rows) * 100,
        (21 / cols) * 100, (13 / rows) * 100,
        (13 / cols) * 100, (13 / rows) * 100
      ],
      damageFormula: '10d10 fire',
      conditionInflicted: 'burning',
      color: '#ef4444',
      bypassRules: {
        requiresFlight: true,
        immuneDamageTypes: ['fire']
      },
      visibleToPlayers: true
    },
    // Magma Pool 3: South-West fissure stream (cols 1 to 8, rows 9 to 13)
    {
      id: 'hazard_lava_southwest',
      name: 'South-West Molten Trench',
      type: 'lava',
      severity: 'lethal',
      bounds: toPct(1 * gridSize, 9 * gridSize, 7 * gridSize, 4 * gridSize),
      polygonPoints: [
        (1 / cols) * 100, (9 / rows) * 100,
        (8 / cols) * 100, (9 / rows) * 100,
        (8 / cols) * 100, (13 / rows) * 100,
        (1 / cols) * 100, (13 / rows) * 100
      ],
      damageFormula: '10d10 fire',
      conditionInflicted: 'burning',
      color: '#ef4444',
      bypassRules: {
        requiresFlight: true,
        immuneDamageTypes: ['fire']
      },
      visibleToPlayers: true
    }
  ];
}

/**
 * Checks whether an arena coordinate is blocked by an unsafe hazard for a specific actor
 */
export function doesArenaHazardBlockMovement(
  hazards: HazardZone[] | undefined,
  x: number,
  y: number,
  actor?: { isFlying?: boolean; elevation?: number; damageImmunities?: string[] },
  mapW = 1320,
  mapH = 840
): { blocked: boolean; hazard?: HazardZone } {
  if (!hazards || hazards.length === 0) return { blocked: false };

  for (const h of hazards) {
    if (isPointInHazard(x, y, h, mapW, mapH)) {
      if (actor && canCreatureBypassHazard(actor, h)) {
        continue;
      }
      // Non-flying, non-immune ground creature in lethal or dangerous hazard
      if (h.severity === 'lethal' || h.severity === 'dangerous') {
        return { blocked: true, hazard: h };
      }
    }
  }

  return { blocked: false };
}

/**
 * Returns any hazard zone occupying a given world coordinate
 */
export function getArenaHazardAt(
  hazards: HazardZone[] | undefined,
  x: number,
  y: number,
  mapW = 1320,
  mapH = 840
): HazardZone | null {
  if (!hazards || hazards.length === 0) return null;
  return hazards.find((h) => isPointInHazard(x, y, h, mapW, mapH)) || null;
}
