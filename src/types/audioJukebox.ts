export type AmbienceCategory = 'music' | 'environment' | 'weather';

export interface AmbienceTrackDefinition {
  id: string;
  name: string;
  category: AmbienceCategory;
  description: string;
  color: string;
  iconName: string;
  customUrl?: string;
}

export interface SceneMoodPreset {
  id: string;
  name: string;
  subtitle: string;
  color: string;
  levels: Record<string, number>; // trackId -> volume (0 to 1)
}

export type SoundboardCategory = 'dungeon' | 'traps' | 'combat' | 'world';

export interface SoundboardPadDefinition {
  id: string;
  name: string;
  category: SoundboardCategory;
  subtitle: string;
  color: string;
  customUrl?: string;
}

export interface MapAudioSource {
  id: string;
  label: string;
  trackId: string;
  customUrl?: string;
  x: number; // world pixel X on battlemap
  y: number; // world pixel Y on battlemap
  radiusFt: number; // audible radius in feet (e.g. 20ft, 40ft, 60ft)
  maxVolume: number; // 0 to 1
  muffledByWalls: boolean;
  visibleToPlayers: boolean;
  muted?: boolean;
}

export interface JukeboxSyncState {
  masterVolume: number;
  isMasterMuted: boolean;
  activeTrackVolumes: Record<string, number>; // trackId -> volume (0..1), > 0 means playing
  customTracks: AmbienceTrackDefinition[];
  customPads: SoundboardPadDefinition[];
  mapAudioSources: MapAudioSource[];
  activeMoodId?: string | null;
  updatedAt: number;
}

export interface SoundboardTriggerPayload {
  padId: string;
  padName: string;
  volume: number;
  customUrl?: string;
  triggeredBy: string;
  timestamp: number;
}

export const BUILTIN_AMBIENCE_TRACKS: AmbienceTrackDefinition[] = [
  // Music & Melodic Drones
  {
    id: 'tavern_hearth',
    name: 'Tavern Hearth & Lute',
    category: 'music',
    description: 'Warm acoustic harmonic fifths & cozy inn resonance',
    color: '#f59e0b',
    iconName: 'Music'
  },
  {
    id: 'crypt_catacombs',
    name: 'Crypt & Catacombs',
    category: 'music',
    description: 'Deep sub-bass catacomb drone with eerie resonant chimes',
    color: '#8b5cf6',
    iconName: 'Skull'
  },
  {
    id: 'boss_battle_pulse',
    name: 'Boss Battle Pulse',
    category: 'music',
    description: 'Driving low war-drum pulse & dark brass tension',
    color: '#ef4444',
    iconName: 'Swords'
  },
  {
    id: 'arcane_sanctum',
    name: 'Arcane Sanctum',
    category: 'music',
    description: 'Crystalline astral shimmer & leyline harmonic hum',
    color: '#06b6d4',
    iconName: 'Sparkles'
  },
  {
    id: 'overland_frontier',
    name: 'Overland Wilderness',
    category: 'music',
    description: 'Open horizon wind-harp & tranquil modal chord pad',
    color: '#10b981',
    iconName: 'Compass'
  },

  // Environmental Loops
  {
    id: 'crackling_campfire',
    name: 'Crackling Campfire',
    category: 'environment',
    description: 'Warm hearth rumble with organic snapping embers',
    color: '#f97316',
    iconName: 'Flame'
  },
  {
    id: 'dungeon_drips',
    name: 'Dungeon Water Drips',
    category: 'environment',
    description: 'Echoing subterranean cavern droplets & damp stone',
    color: '#38bdf8',
    iconName: 'Droplets'
  },
  {
    id: 'tavern_crowd',
    name: 'Tavern Crowd Murmur',
    category: 'environment',
    description: 'Lively common-room chatter, tankards & distant laughter',
    color: '#eab308',
    iconName: 'Users'
  },
  {
    id: 'whispering_souls',
    name: 'Whispering Altar',
    category: 'environment',
    description: 'Otherworldly spectral whispers & eldritch static',
    color: '#a855f7',
    iconName: 'Eye'
  },

  // Weather Loops
  {
    id: 'heavy_rain',
    name: 'Heavy Rain & Downpour',
    category: 'weather',
    description: 'Steady rainfall wash & roof patter',
    color: '#0ea5e9',
    iconName: 'CloudRain'
  },
  {
    id: 'howling_wind',
    name: 'Howling Cavern Wind',
    category: 'weather',
    description: 'Sweeping mountain & cavern wind gusts',
    color: '#94a3b8',
    iconName: 'Wind'
  },
  {
    id: 'distant_thunder',
    name: 'Thunderstorm Rumbles',
    category: 'weather',
    description: 'Rolling low-frequency storm thunder across the sky',
    color: '#6366f1',
    iconName: 'Zap'
  }
];

export const SCENE_MOOD_PRESETS: SceneMoodPreset[] = [
  {
    id: 'cozy_tavern',
    name: 'Cozy Tavern',
    subtitle: 'Hearth music + crackling fire + crowd murmur',
    color: '#f59e0b',
    levels: {
      tavern_hearth: 0.55,
      crackling_campfire: 0.65,
      tavern_crowd: 0.45
    }
  },
  {
    id: 'haunted_crypt',
    name: 'Haunted Crypt',
    subtitle: 'Catacomb drone + echoing drips + spectral whispers',
    color: '#8b5cf6',
    levels: {
      crypt_catacombs: 0.6,
      dungeon_drips: 0.7,
      whispering_souls: 0.4,
      howling_wind: 0.25
    }
  },
  {
    id: 'stormy_camp',
    name: 'Stormy Encampment',
    subtitle: 'Heavy rain + distant thunder + crackling campfire',
    color: '#0ea5e9',
    levels: {
      heavy_rain: 0.7,
      distant_thunder: 0.55,
      crackling_campfire: 0.6,
      howling_wind: 0.35
    }
  },
  {
    id: 'boss_fight',
    name: 'Boss Encounter',
    subtitle: 'Driving battle pulse + thunder + arcane hum',
    color: '#ef4444',
    levels: {
      boss_battle_pulse: 0.8,
      distant_thunder: 0.5,
      arcane_sanctum: 0.35
    }
  },
  {
    id: 'arcane_vault',
    name: 'Arcane Sanctum',
    subtitle: 'Leyline shimmer + whispering souls + cavern drips',
    color: '#06b6d4',
    levels: {
      arcane_sanctum: 0.65,
      whispering_souls: 0.45,
      dungeon_drips: 0.35
    }
  },
  {
    id: 'wilderness_watch',
    name: 'Wilderness Watch',
    subtitle: 'Overland melody + gentle wind + warm campfire',
    color: '#10b981',
    levels: {
      overland_frontier: 0.55,
      crackling_campfire: 0.5,
      howling_wind: 0.25
    }
  }
];

export const BUILTIN_SOUNDBOARD_PADS: SoundboardPadDefinition[] = [
  // Dungeon & Doors
  {
    id: 'pad_door_creak',
    name: 'Heavy Door Creak',
    category: 'dungeon',
    subtitle: 'Aged oak hinges groaning open',
    color: '#f59e0b'
  },
  {
    id: 'pad_portcullis_slam',
    name: 'Portcullis Slam',
    category: 'dungeon',
    subtitle: 'Iron gate crashing into stone',
    color: '#94a3b8'
  },
  {
    id: 'pad_secret_stone',
    name: 'Secret Stone Slide',
    category: 'dungeon',
    subtitle: 'Heavy masonry grinding aside',
    color: '#a8a29e'
  },
  {
    id: 'pad_lock_click',
    name: 'Lock / Tumbler Click',
    category: 'dungeon',
    subtitle: 'Crisp metallic mechanism unlock',
    color: '#fbbf24'
  },

  // Traps & Hazards
  {
    id: 'pad_trap_click',
    name: 'Trap Pressure Click',
    category: 'traps',
    subtitle: 'Deadly floor plate trigger snap',
    color: '#ef4444'
  },
  {
    id: 'pad_dart_volley',
    name: 'Arrow / Dart Trap',
    category: 'traps',
    subtitle: 'Whip-fast projectile volley & impact',
    color: '#f97316'
  },
  {
    id: 'pad_poison_gas',
    name: 'Poison Gas Hiss',
    category: 'traps',
    subtitle: 'Pressurized noxious vapor vent',
    color: '#22c55e'
  },
  {
    id: 'pad_collapse_rumble',
    name: 'Collapsing Rubble',
    category: 'traps',
    subtitle: 'Crashing stone & ceiling tremor',
    color: '#d97706'
  },

  // Monsters & Combat
  {
    id: 'pad_dragon_roar',
    name: 'Dragon / Beast Roar',
    category: 'combat',
    subtitle: 'Earth-shaking apex predator roar',
    color: '#dc2626'
  },
  {
    id: 'pad_undead_shriek',
    name: 'Banshee / Crypt Shriek',
    category: 'combat',
    subtitle: 'Chilling wraith wail from the dark',
    color: '#a855f7'
  },
  {
    id: 'pad_war_horn',
    name: 'Dread War Horn',
    category: 'combat',
    subtitle: 'Deep brass battle horn across the valley',
    color: '#ea580c'
  },
  {
    id: 'pad_steel_clash',
    name: 'Swords & Shields Clash',
    category: 'combat',
    subtitle: 'Ringing steel-on-steel ambush',
    color: '#38bdf8'
  },

  // World & Table Moments
  {
    id: 'pad_thunderclap',
    name: 'Thunderclap Strike',
    category: 'world',
    subtitle: 'Deafening lightning bolt & boom',
    color: '#6366f1'
  },
  {
    id: 'pad_crowd_cheer',
    name: 'Tavern / Crowd Cheer',
    category: 'world',
    subtitle: 'Triumphant roar & raised tankards',
    color: '#10b981'
  },
  {
    id: 'pad_ominous_bell',
    name: 'Cathedral Bell Toll',
    category: 'world',
    subtitle: 'Deep resonant bronze doom bell',
    color: '#eab308'
  },
  {
    id: 'pad_arcane_portal',
    name: 'Arcane Portal Surge',
    category: 'world',
    subtitle: 'Reality-warping rift opening',
    color: '#06b6d4'
  }
];

export const DEFAULT_JUKEBOX_STATE: JukeboxSyncState = {
  masterVolume: 0.75,
  isMasterMuted: false,
  activeTrackVolumes: {},
  customTracks: [],
  customPads: [],
  mapAudioSources: [],
  activeMoodId: null,
  updatedAt: Date.now()
};
