import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, ensureAuth } from '../lib/firebase';
import { WallSegment } from '../types';
import { Monster } from '../types/monster';
import { PRESET_BATTLEMAPS, PresetBattlemap } from '../data/presetBattlemaps';
import { DEFAULT_MONSTERS } from '../data/defaultMonsters';
import { segmentsIntersect } from '../lib/visionEngine';

export type ArenaMatchModeConfig = '1v1' | '2v2' | 'vs_npcs' | 'random_encounter';
export type ArenaDifficultyConfig = 'standard' | 'hard' | 'deadly';
export type ArenaHazardType = 'none' | 'lava_eruption' | 'healing_sanctuary' | 'arcane_storm';

export interface ArenaConfig {
  defaultMatchMode: ArenaMatchModeConfig;
  defaultDifficulty: ArenaDifficultyConfig;
  defaultMapId: string;
  disabledMapIds: string[];
  customMaps: PresetBattlemap[];
  mapWalls: Record<string, WallSegment[]>;
  enforceWalls: boolean;
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
  customMaps: [],
  mapWalls: {},
  enforceWalls: true,
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

export function normalizeArenaConfig(raw: any): ArenaConfig {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_ARENA_CONFIG };
  }
  return {
    defaultMatchMode: ['1v1', '2v2', 'vs_npcs', 'random_encounter'].includes(raw.defaultMatchMode)
      ? raw.defaultMatchMode
      : DEFAULT_ARENA_CONFIG.defaultMatchMode,
    defaultDifficulty: ['standard', 'hard', 'deadly'].includes(raw.defaultDifficulty)
      ? raw.defaultDifficulty
      : DEFAULT_ARENA_CONFIG.defaultDifficulty,
    defaultMapId: typeof raw.defaultMapId === 'string' && raw.defaultMapId
      ? raw.defaultMapId
      : DEFAULT_ARENA_CONFIG.defaultMapId,
    disabledMapIds: Array.isArray(raw.disabledMapIds) ? raw.disabledMapIds : [],
    customMaps: Array.isArray(raw.customMaps) ? raw.customMaps : [],
    mapWalls: raw.mapWalls && typeof raw.mapWalls === 'object' ? raw.mapWalls : {},
    enforceWalls: typeof raw.enforceWalls === 'boolean' ? raw.enforceWalls : true,
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
    await setDoc(doc(db, 'activeSession', 'arena_config'), cleanDoc, { merge: true });
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
      doc(db, 'activeSession', 'arena_config'),
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
  const combined: PresetBattlemap[] = [];
  const seenIds = new Set<string>();

  for (const m of [...PRESET_BATTLEMAPS, ...(config.customMaps || [])]) {
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
    if ((w.type === 'door' || w.type === 'secret') && (w.doorState === 'open' || w.isOpen)) {
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
    if (w.type === 'window' || w.type === 'terrain') {
      continue; // Windows and cover allow line of sight
    }
    if ((w.type === 'door' || w.type === 'secret') && (w.doorState === 'open' || w.isOpen)) {
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
