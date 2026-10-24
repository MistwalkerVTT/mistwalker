export interface RevealPoint {
  x: number;
  y: number;
  radius: number;
}

export interface Combatant {
  id: string;
  name: string;
  type: 'player' | 'enemy' | 'npc';
  initiative: number;
  maxHp: number;
  currentHp: number;
  ac: number;
  passivePerception: number;
  conditions: string[];
  tokenId?: string;
  avatarUrl?: string;
  initiativeBonus?: number;
}

export const CONDITIONS_LIST = [
  "Blinded",
  "Charmed",
  "Deafened",
  "Frightened",
  "Grappled",
  "Incapacitated",
  "Invisible",
  "Paralyzed",
  "Petrified",
  "Poisoned",
  "Prone",
  "Restrained",
  "Stunned",
  "Unconscious",
  "Exhaustion",
  "Concentrating"
];

export interface UploadedAsset {
  assetId: string;
  name: string;
  type: 'map' | 'token' | 'pdf' | 'audio' | 'other';
  url: string;
  thumbnailUrl?: string;
  fileType: string;
  width?: number;
  height?: number;
  size?: number; // for tokens (1, 2, 3, etc.)
  fileSizeBytes?: number;
  createdAt: number;
  updatedAt: number;
}

export interface AvailableTokenItem {
  name: string;
  url: string;
  category?: 'character' | 'monster' | 'ally' | 'custom';
  size?: number;
}

export const isMonsterToken = (token?: { name?: string; isPlayer?: boolean; isMonster?: boolean; category?: string; allyId?: string } | null): boolean => {
  if (!token) return false;
  if (token.category === 'ally' || (token as any).allyId) return false;
  if (token.isMonster === true) return true;
  if (token.category === 'monster') return true;
  if (token.isPlayer === false) return true;

  const lowerName = (token.name || '').toLowerCase().trim();

  // Explicit known player character names - never monsters unless isMonster is true
  const standardPlayers = [
    'varrak', 'brannoc', 'aziza', 'noctua', 'aggie', 'aggapanthus', 'burmi', 'rowan', 'stavros', 'mayo',
    "g'aiah", 'gaiah', 'g’aiah', 'sylas', 'etho', 'arameng', 'zal-tan', 'zaltan'
  ];
  if (standardPlayers.some(p => lowerName === p || lowerName.startsWith(p + ' ') || lowerName.includes(p))) {
    return false;
  }

  if (token.isPlayer === true || token.category === 'character') {
    return false;
  }

  // Comprehensive D&D monsters list (covers default monsters, compendium, and standard SRD creatures)
  const monsterKeywords = [
    'rosintar', 'deadbark dryad', 'dryad', 'archmage', 'mage', 'young red dragon', 'red dragon', 'dragon',
    'goblin', 'skeleton', 'orc warrior', 'orc', 'beholder', 'mimic', 'dire wolf', 'wolf',
    'zombie', 'mushu', 'aboleth', 'acolyte', 'animated armor', 'assassin', 'bandit',
    'bandit captain', 'banshee', 'basilisk', 'bat', 'bear', 'beast', 'berserker', 'boar',
    'bugbear', 'bulette', 'centaur', 'chimera', 'clay golem', 'cloaker', 'cockatrice',
    'cultist', 'darkmantle', 'death dog', 'death knight', 'demilich', 'demon', 'devil', 'displacer beast',
    'doppelganger', 'dracolich', 'drider', 'drow', 'duergar', 'elemental', 'ettin',
    'fiend', 'flesh golem', 'flumph', 'fomorian', 'gargoyle', 'gelatinous cube', 'ghast',
    'ghost', 'ghoul', 'giant', 'gibbering mouther', 'gladiator', 'gnoll', 'golem',
    'gorgon', 'gray ooze', 'grell', 'grick', 'griffon', 'grimlock', 'guard', 'hag',
    'harpy', 'hell hound', 'helmed horror', 'hippogriff', 'hobgoblin', 'homunculus',
    'hook horror', 'hydra', 'imp', 'incubus', 'invisible stalker', 'iron golem', 'jackal',
    'kenku', 'knight', 'kobold', 'kraken', 'kuo-toa', 'lamia', 'lemure', 'lich',
    'lizardfolk', 'magmin', 'mammoth', 'manticore', 'medusa', 'mephit', 'merfolk',
    'merrow', 'mind flayer', 'minotaur', 'mummy', 'myconid', 'naga', 'nightmare',
    'nothic', 'ochre jelly', 'ogre', 'oni', 'ooze', 'otyugh', 'owlbear', 'panther',
    'pegasus', 'peryton', 'phase spider', 'pit fiend', 'poisonous snake', 'priest',
    'pseudodragon', 'purple worm', 'quasit', 'rat', 'raven', 'remorhaz', 'revenant',
    'roc', 'roper', 'rust monster', 'sahuagin', 'salamander', 'satyr', 'scarecrow',
    'scorpion', 'scout', 'shadow', 'shambling mound', 'shield guardian', 'slaad',
    'specter', 'spider', 'spy', 'stirge', 'stone giant', 'stone golem', 'succubus',
    'swarm', 'tarrasque', 'thug', 'tiger', 'treant', 'troglodyte', 'troll',
    'umber hulk', 'undead', 'vampire', 'veteran', 'vrock', 'vulture', 'wight',
    'will-o\'-wisp', 'winter wolf', 'worg', 'wraith', 'wyvern', 'xorn', 'yeti',
    'yuan-ti', 'monster', 'foe', 'boss', 'creature'
  ];

  return monsterKeywords.some(m => lowerName === m || lowerName.includes(m));
};

export type AnimatedFeatureType = 'water' | 'lava' | 'torch' | 'arcane' | 'fog' | 'toxic';
export type WeatherEffectType = 'none' | 'rain' | 'snow' | 'fog' | 'embers' | 'spores';

export interface AnimatedFeature {
  id: string;
  type: AnimatedFeatureType;
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  radius: number; // radius in percentage of map width
  intensity?: number; // 0.5 to 2.0
  speed?: number; // 0.2 to 2.5
  rotation?: number; // for directional flow / orientation
  label?: string;
  polygonPoints?: number[]; // [dx0, dy0, dx1, dy1, ...] relative offsets in % from (x, y)
  shapePreset?: string;
  opacity?: number; // 0.1 to 1.0
  color?: string; // Hex color for lights / torches / auras
}

export type MapSizePresetKey = 'small' | 'medium' | 'large' | 'colossal' | 'custom';

export const MAP_SIZE_PRESETS: Record<
  Exclude<MapSizePresetKey, 'custom'>,
  { label: string; width: number; height: number; description: string }
> = {
  small: { label: 'Small Skirmish', width: 20, height: 15, description: '100×75 ft (Tavern, Ambush, Crypt)' },
  medium: { label: 'Medium Encounter', width: 30, height: 20, description: '150×100 ft (Dungeon Wing, Glade, Camp)' },
  large: { label: 'Large Stronghold', width: 45, height: 30, description: '225×150 ft (Caverns, Castle, Pass)' },
  colossal: { label: 'Colossal Battlefield', width: 60, height: 40, description: '300×200 ft (Siege, Open Realm, Volcano)' }
};

export type WallType = 'normal' | 'door' | 'secret_door' | 'window' | 'terrain' | 'solid';
export type DoorState = 'closed' | 'open' | 'locked';
export type CampaignMode = 'creator' | 'run';

export interface WallSegment {
  id: string;
  points?: number[];
  p1?: { x: number; y: number };
  p2?: { x: number; y: number };
  wallType?: WallType;
  doorState?: DoorState;
  isOpen?: boolean;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  type?: WallType | string;
  blocksLight?: boolean;
  blocksMovement?: boolean;
}

export interface VisionConfig {
  enabled: boolean;
  explorationMemory: boolean;
  darknessOpacity: number;
  dimVisionOpacity: number;
  ambientLight: boolean;
  dmPreviewMode: boolean;
  showDoorBadges?: boolean;
}

export type RoomAnnotationType = 'room' | 'label';

export interface RoomAnnotation {
  id: string;
  type?: RoomAnnotationType; // default 'room'
  label: string; // e.g. "G10 - The Parlor" or "Stairs up to Chapter 2" or "Ladder down to Cellar"
  roomNumber?: string; // e.g. "G10", "4", "Area 1"
  roomName?: string; // e.g. "The Parlor", "Guard Post"
  icon?: string; // e.g. "stairs-up", "stairs-down", "ladder", "portal", "door", "arrow-up", "arrow-down", "sign"
  visibleToPlayers?: boolean; // If true, label renders on player view screen too
  bounds: {
    x: number; // percentage (0 - 100)
    y: number; // percentage (0 - 100)
    width: number; // percentage (0 - 100)
    height: number; // percentage (0 - 100)
  };
  polygonPoints?: number[]; // percentage coordinates [x1, y1, x2, y2, ...] (0-100) for exact arbitrary room boundaries
  boxedText: string; // Read-aloud description for players
  dmNotes: string; // DM specific instructions (traps, DCs, tactics, secrets)
  color?: string; // Optional custom color accent
  pdfSection?: string; // Linked campaign notes or PDF section e.g. "Page 14 - Guard Post"
  pdfPage?: number;
  campaignId?: string;
  sceneId?: string;
  monsters?: any[];
  hiddenMonsterNames?: string[];
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Safely normalizes any RoomAnnotation (either a polygon room zone or a point-of-interest map label),
 * repairing any missing bounds, IDs, or type discriminators so the canvas and scene bundles never crash.
 */
export function normalizeRoomAnnotation(
  raw: any,
  idx: number = 0,
  fallbackSceneId?: string,
  fallbackCampaignId?: string
): RoomAnnotation {
  if (!raw || typeof raw !== 'object') {
    return {
      id: `room_${Date.now()}_${idx}`,
      type: 'room',
      label: `Room ${idx + 1}`,
      bounds: { x: 50, y: 50, width: 6, height: 3 },
      boxedText: '',
      dmNotes: '',
      sceneId: fallbackSceneId,
      campaignId: fallbackCampaignId,
    };
  }
  const isLabel =
    raw.type === 'label' ||
    Boolean(raw.icon) ||
    typeof raw.visibleToPlayers === 'boolean';
  const id =
    typeof raw.id === 'string' && raw.id.trim().length > 0
      ? raw.id
      : `${isLabel ? 'label' : 'room'}_${raw.createdAt || Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
  const rawBounds = raw.bounds && typeof raw.bounds === 'object' ? raw.bounds : {};
  const bounds = {
    x: typeof rawBounds.x === 'number' && !isNaN(rawBounds.x) ? rawBounds.x : 50,
    y: typeof rawBounds.y === 'number' && !isNaN(rawBounds.y) ? rawBounds.y : 50,
    width: typeof rawBounds.width === 'number' && !isNaN(rawBounds.width) ? rawBounds.width : (isLabel ? 8 : 6),
    height: typeof rawBounds.height === 'number' && !isNaN(rawBounds.height) ? rawBounds.height : (isLabel ? 4 : 3),
  };
  const label =
    (typeof raw.label === 'string' && raw.label.trim()) ||
    (typeof raw.roomName === 'string' && raw.roomName.trim()) ||
    (isLabel ? 'Map Label' : `Room ${raw.roomNumber || idx + 1}`);

  return {
    ...raw,
    id,
    type: isLabel ? 'label' : 'room',
    label,
    roomNumber: isLabel ? undefined : raw.roomNumber,
    roomName: raw.roomName || label,
    icon: isLabel ? (raw.icon || 'stairs-up') : raw.icon,
    visibleToPlayers: isLabel ? (raw.visibleToPlayers !== false) : raw.visibleToPlayers,
    bounds,
    polygonPoints: Array.isArray(raw.polygonPoints)
      ? raw.polygonPoints.map((n: any) => Number(n)).filter((n: number) => !isNaN(n))
      : undefined,
    boxedText: typeof raw.boxedText === 'string' ? raw.boxedText : '',
    dmNotes: typeof raw.dmNotes === 'string' ? raw.dmNotes : '',
    color: raw.color || '#f59e0b',
    sceneId: raw.sceneId || fallbackSceneId,
    campaignId: raw.campaignId || fallbackCampaignId,
  };
}

export function normalizeRoomAnnotations(
  list: any,
  fallbackSceneId?: string,
  fallbackCampaignId?: string
): RoomAnnotation[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter(item => item && typeof item === 'object')
    .map((item, idx) => normalizeRoomAnnotation(item, idx, fallbackSceneId, fallbackCampaignId));
}

export interface ChapterSceneAssociation {
  sceneId?: string;
  sceneTitle: string;
  summary: string;
  keyNpcs?: string[];
  trapsAndHazards?: string[];
  loot?: string[];
  suggestedDmNotes?: string;
  boxedText?: string;
  roomNumbers?: string[];
}

export interface ChapterRoomDetail {
  roomNumber: string; // e.g. "G1", "1", "Room 4", "Area 1"
  roomName: string; // e.g. "The Parlor", "Guard Barracks"
  boxedText: string; // Read-aloud description
  dmNotes: string; // DM tactical notes, traps, DCs, creature stats, secrets
  monsters?: string[];
  treasure?: string[];
  sceneTitle?: string;
  suggestedDimensions?: { widthFeet?: number; heightFeet?: number };
}

export interface ChapterStoryBeat {
  id: string;
  phase: 'hook' | 'arrival' | 'event' | 'climax' | 'conclusion';
  title: string;
  trigger?: string; // e.g. "At the start of the adventure", "When the alarm is raised", "At midnight"
  boxedText?: string; // Verbatim read-aloud player text for this non-room beat
  dmNotes: string; // Verbatim DM guidance, rules, consequences, or rewards
  monsters?: string[]; // Any creatures spawned during this story beat
  relatedRooms?: string[]; // e.g. ["G1", "G14"]
}

export interface ChapterGeneralFeature {
  category: 'doors' | 'lighting' | 'ceilings' | 'wards' | 'alarm' | 'environment' | 'other';
  title: string; // e.g. "Locked Oak Doors", "Arcane Forbiddance Ward"
  details: string; // Verbatim rule or description
  mechanics?: string; // e.g. "AC 15, HP 18, DC 15 Dexterity (Thieves' Tools)"
}

export interface ChapterRoamingEncounter {
  id: string;
  name: string; // e.g. "Clockwork Guard Patrol", "Rival Crew Ambush"
  routeOrTrigger: string; // e.g. "Patrols G2 -> G5 -> G8 every 15 minutes" or "Roll 1d6 every hour"
  description: string; // Tactical behavior, attitude, or schedule
  monsters: string[]; // Sanitized monster strings, e.g. ["2x Guard", "1x Veteran"]
  relatedRooms?: string[]; // e.g. ["G2", "G5", "G8"]
}

export interface ChapterNpcProfile {
  id: string;
  name: string; // e.g. "Guildmaster Dusk", "Dr. Cassee Dannell"
  role: string; // e.g. "Quest Patron", "Undercover Harper Agent", "Head Butler"
  statblock?: string; // Canonical 5e statblock name if combat-capable, e.g. "Spy", "Noble", "Mage"
  appearance?: string;
  personality?: string; // Ideals, bonds, flaws, mannerisms
  secretOrMotivation?: string; // What they want or what they know if questioned
  locationOrSchedule?: string; // Where they can be found or how they move around
  voicePreset?: string; // Suggested narration voice id
}

export interface ChapterPdfDigest {
  pdfFilename: string;
  pdfUrl?: string;
  digestSummary: string;
  adventureTitle?: string;
  chapterTitle?: string;
  scenes: ChapterSceneAssociation[];
  rooms: ChapterRoomDetail[];
  storyBeats?: ChapterStoryBeat[];
  generalFeatures?: ChapterGeneralFeature[];
  roamingEncounters?: ChapterRoamingEncounter[];
  npcs?: ChapterNpcProfile[];
  rawSnippet?: string;
  digestedAt: number;
}

export interface NarrationVoice {
  id: string;
  name: string;
  description: string;
  geminiVoice: 'Charon' | 'Fenrir' | 'Aoede' | 'Kore' | 'Puck';
  elevenLabsVoiceId?: string; // Pre-made ElevenLabs Voice ID for studio RPG voice acting
  playbackRate: number; // Pitch/tempo modulation
}

export const NARRATION_VOICES: NarrationVoice[] = [
  {
    id: 'wizard',
    name: 'Wizard',
    description: 'Ancient, mystical, deliberate, and arcane',
    geminiVoice: 'Charon',
    elevenLabsVoiceId: 'ER1QX78rEi0j9Vaeflmj',
    playbackRate: 0.90,
  },
  {
    id: 'villains_henchman',
    name: "Villain's Henchman",
    description: 'Sneering, cunning lackey or scheming subordinate',
    geminiVoice: 'Puck',
    elevenLabsVoiceId: 'Og5lqPvHfT1wPvp1MoOi',
    playbackRate: 1.05,
  },
  {
    id: 'ogre',
    name: 'Ogre',
    description: 'Brutish, hulking, slow and thundering guttural monster',
    geminiVoice: 'Fenrir',
    elevenLabsVoiceId: '6khSivLMlRIG93WYPvul',
    playbackRate: 0.75,
  },
  {
    id: 'big_bad_boss',
    name: 'Big Bad Boss Guy',
    description: 'Imposing, ruthless, booming, and commanding villain',
    geminiVoice: 'Fenrir',
    elevenLabsVoiceId: 'ywMiD451ukzMCfGTMdjH',
    playbackRate: 0.82,
  },
  {
    id: 'fiend',
    name: 'Fiend / Dark Entity',
    description: 'Deep, rumbling, and menacing underworld entity',
    geminiVoice: 'Fenrir',
    elevenLabsVoiceId: 'VR6AewLTigWG4xSOukaG',
    playbackRate: 0.80,
  },
  {
    id: 'female_elf',
    name: 'Female Elf',
    description: 'Graceful, ethereal, melodious, and ancient elven cadence',
    geminiVoice: 'Aoede',
    elevenLabsVoiceId: 'Wj7FjlFOGOU71BQgPJe5',
    playbackRate: 1.0,
  },
  {
    id: 'female_npc',
    name: 'Female NPC',
    description: 'Expressive and clear adventurer or townsfolk',
    geminiVoice: 'Aoede',
    elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM',
    playbackRate: 1.0,
  },
  {
    id: 'male_npc',
    name: 'Male NPC',
    description: 'Steady, grounded townsfolk, guard, or hero',
    geminiVoice: 'Kore',
    elevenLabsVoiceId: 'pNInz6obpgDQGcFmaJgB',
    playbackRate: 0.98,
  },
];

export type { Scene, Chapter, Campaign, SceneToken } from './lib/firebase';

export * from './types/aura';
export * from './types/monsterHud';
export type { Ally, AllyAction, AllyTrait } from './types/ally';

