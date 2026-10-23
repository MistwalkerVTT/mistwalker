export type AmbienceCategory = 'music' | 'environment' | 'weather';

export interface AmbienceTrackDefinition {
  id: string;
  name: string;
  category: AmbienceCategory;
  description: string;
  color: string;
  iconName: string;
  customUrl?: string;
  defaultPrompt?: string;
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
  defaultPrompt?: string;
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
  // Music & Melodic Soundtracks (ElevenLabs Music AI)
  {
    id: 'tavern_hearth',
    name: 'Tavern Hearth & Lute',
    category: 'music',
    description: 'ElevenLabs Music • Warm medieval lute, guitar, wooden flute & cozy inn',
    color: '#f59e0b',
    iconName: 'Music',
    customUrl: '/audio/jukebox/music/tavern_hearth.mp3',
    defaultPrompt: 'Warm medieval fantasy tavern instrumental music featuring acoustic lute, fingerpicked guitar, gentle wooden flute, and cozy hearth atmosphere, no vocals'
  },
  {
    id: 'crypt_catacombs',
    name: 'Crypt & Catacombs',
    category: 'music',
    description: 'ElevenLabs Music • Deep bowed cello drones & eerie gothic catacomb chimes',
    color: '#8b5cf6',
    iconName: 'Skull',
    customUrl: '/audio/jukebox/music/crypt_catacombs.mp3',
    defaultPrompt: 'Dark atmospheric dungeon exploration instrumental soundtrack with deep bowed cello drones, eerie gothic chimes, and suspenseful dark fantasy ambience, no vocals'
  },
  {
    id: 'boss_battle_pulse',
    name: 'Boss Battle Pulse',
    category: 'music',
    description: 'ElevenLabs Music • Epic orchestral war drums, staccato strings & dark brass',
    color: '#ef4444',
    iconName: 'Swords',
    customUrl: '/audio/jukebox/music/boss_battle_pulse.mp3',
    defaultPrompt: 'Epic dark fantasy RPG boss battle orchestral combat music with driving war drums, aggressive staccato strings, and menacing low brass, instrumental only'
  },
  {
    id: 'arcane_sanctum',
    name: 'Arcane Sanctum',
    category: 'music',
    description: 'ElevenLabs Music • Mystical celesta, astral harp arpeggios & glass pads',
    color: '#06b6d4',
    iconName: 'Sparkles',
    customUrl: '/audio/jukebox/music/arcane_sanctum.mp3',
    defaultPrompt: 'Mystical high-fantasy wizard sanctum instrumental music with ethereal celesta, shimmering harp arpeggios, and cosmic glass pads, no vocals'
  },
  {
    id: 'overland_frontier',
    name: 'Overland Wilderness',
    category: 'music',
    description: 'ElevenLabs Music • Sweeping pastoral strings, oboe & Celtic exploration harp',
    color: '#10b981',
    iconName: 'Compass',
    customUrl: '/audio/jukebox/music/overland_frontier.mp3',
    defaultPrompt: 'Sweeping tranquil fantasy wilderness exploration instrumental soundtrack with acoustic strings, pastoral oboe, and gentle Celtic harp, no vocals'
  },

  // Environmental Loops (ElevenLabs Seamless Loops)
  {
    id: 'crackling_campfire',
    name: 'Crackling Campfire',
    category: 'environment',
    description: 'ElevenLabs SFX • Roaring hearth logs crackling with snapping embers',
    color: '#f97316',
    iconName: 'Flame',
    customUrl: '/audio/jukebox/ambience/crackling_campfire.mp3',
    defaultPrompt: 'Warm cozy medieval tavern hearth and wilderness campfire logs crackling steadily with gentle popping embers'
  },
  {
    id: 'dungeon_drips',
    name: 'Dungeon Water Drips',
    category: 'environment',
    description: 'ElevenLabs SFX • Echoing subterranean stone cavern droplets & pools',
    color: '#38bdf8',
    iconName: 'Droplets',
    customUrl: '/audio/jukebox/ambience/dungeon_drips.mp3',
    defaultPrompt: 'Dark subterranean stone dungeon cavern ambience with echoing water droplets dripping into underground pools'
  },
  {
    id: 'tavern_crowd',
    name: 'Tavern Crowd Murmur',
    category: 'environment',
    description: 'ElevenLabs SFX • Lively common-room chatter, clinking tankards & laughter',
    color: '#eab308',
    iconName: 'Users',
    customUrl: '/audio/jukebox/ambience/tavern_crowd.mp3',
    defaultPrompt: 'Lively medieval fantasy inn common room ambience with warm background crowd murmur, clinking tankards, and distant laughter'
  },
  {
    id: 'whispering_souls',
    name: 'Whispering Altar',
    category: 'environment',
    description: 'ElevenLabs SFX • Haunted crypt spectral whispers & eldritch resonance',
    color: '#a855f7',
    iconName: 'Eye',
    customUrl: '/audio/jukebox/ambience/whispering_souls.mp3',
    defaultPrompt: 'Eerie haunted necromancer crypt altar with ghostly overlapping spectral whispers and dark eldritch resonance'
  },

  // Weather Loops (ElevenLabs Seamless Loops)
  {
    id: 'heavy_rain',
    name: 'Heavy Rain & Downpour',
    category: 'weather',
    description: 'ElevenLabs SFX • Steady rainstorm downpour on cobblestone & slate roofs',
    color: '#0ea5e9',
    iconName: 'CloudRain',
    customUrl: '/audio/jukebox/ambience/heavy_rain.mp3',
    defaultPrompt: 'Steady heavy rainstorm downpour pattering against medieval cobblestone, slate rooftops, and forest leaves'
  },
  {
    id: 'howling_wind',
    name: 'Howling Cavern Wind',
    category: 'weather',
    description: 'ElevenLabs SFX • Desolate mountain pass & deep stone cavern wind gusts',
    color: '#94a3b8',
    iconName: 'Wind',
    customUrl: '/audio/jukebox/ambience/howling_wind.mp3',
    defaultPrompt: 'Desolate howling mountain pass and deep cavern wind sweeping through ancient stone ruins'
  },
  {
    id: 'distant_thunder',
    name: 'Thunderstorm Rumbles',
    category: 'weather',
    description: 'ElevenLabs SFX • Rolling low-frequency storm thunder across dark skies',
    color: '#6366f1',
    iconName: 'Zap',
    customUrl: '/audio/jukebox/ambience/distant_thunder.mp3',
    defaultPrompt: 'Ominous dark storm ambience with low rolling distant thunder rumbles and brooding storm wind'
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
  // Dungeon & Doors (ElevenLabs Neural SFX)
  {
    id: 'pad_door_creak',
    name: 'Heavy Door Creak',
    category: 'dungeon',
    subtitle: 'Aged oak hinges groaning open',
    color: '#f59e0b',
    customUrl: '/audio/jukebox/pads/pad_door_creak.mp3',
    defaultPrompt: 'Heavy ancient medieval oak dungeon door slowly creaking open on rusty iron hinges in a stone hall'
  },
  {
    id: 'pad_portcullis_slam',
    name: 'Portcullis Slam',
    category: 'dungeon',
    subtitle: 'Iron gate crashing into stone',
    color: '#94a3b8',
    customUrl: '/audio/jukebox/pads/pad_portcullis_slam.mp3',
    defaultPrompt: 'Massive iron castle portcullis gate dropping chains and slamming violently onto a stone dungeon floor'
  },
  {
    id: 'pad_secret_stone',
    name: 'Secret Stone Slide',
    category: 'dungeon',
    subtitle: 'Heavy masonry grinding aside',
    color: '#a8a29e',
    customUrl: '/audio/jukebox/pads/pad_secret_stone.mp3',
    defaultPrompt: 'Heavy ancient stone wall secret door grinding and sliding open against rough masonry in a dark tomb'
  },
  {
    id: 'pad_lock_click',
    name: 'Lock / Tumbler Click',
    category: 'dungeon',
    subtitle: 'Crisp metallic mechanism unlock',
    color: '#fbbf24',
    customUrl: '/audio/jukebox/pads/pad_lock_click.mp3',
    defaultPrompt: 'Crisp medieval iron lock tumblers clicking and heavy bolt sliding open with thieves tools'
  },

  // Traps & Hazards
  {
    id: 'pad_trap_click',
    name: 'Trap Pressure Click',
    category: 'traps',
    subtitle: 'Deadly floor plate trigger snap',
    color: '#ef4444',
    customUrl: '/audio/jukebox/pads/pad_trap_click.mp3',
    defaultPrompt: 'Deadly dungeon stone floor pressure plate clicking down followed by a taut metallic spring trigger snap'
  },
  {
    id: 'pad_dart_volley',
    name: 'Arrow / Dart Trap',
    category: 'traps',
    subtitle: 'Whip-fast projectile volley & impact',
    color: '#f97316',
    customUrl: '/audio/jukebox/pads/pad_dart_volley.mp3',
    defaultPrompt: 'Volley of deadly poison darts and crossbow bolts firing from hidden wall slots and thudding into wood'
  },
  {
    id: 'pad_poison_gas',
    name: 'Poison Gas Hiss',
    category: 'traps',
    subtitle: 'Pressurized noxious vapor vent',
    color: '#22c55e',
    customUrl: '/audio/jukebox/pads/pad_poison_gas.mp3',
    defaultPrompt: 'High-pressure noxious poison gas trap venting and hissing loudly from hidden dungeon stone nozzles'
  },
  {
    id: 'pad_collapse_rumble',
    name: 'Collapsing Rubble',
    category: 'traps',
    subtitle: 'Crashing stone & ceiling tremor',
    color: '#d97706',
    customUrl: '/audio/jukebox/pads/pad_collapse_rumble.mp3',
    defaultPrompt: 'Violent subterranean cave-in with heavy stone boulders crashing down and rumbling dungeon tremor'
  },

  // Monsters & Combat
  {
    id: 'pad_dragon_roar',
    name: 'Dragon / Beast Roar',
    category: 'combat',
    subtitle: 'Earth-shaking apex predator roar',
    color: '#dc2626',
    customUrl: '/audio/jukebox/pads/pad_dragon_roar.mp3',
    defaultPrompt: 'Terrifying colossal ancient red dragon roaring with guttural fire-breathing resonance in a vast cavern'
  },
  {
    id: 'pad_undead_shriek',
    name: 'Banshee / Crypt Shriek',
    category: 'combat',
    subtitle: 'Chilling wraith wail from the dark',
    color: '#a855f7',
    customUrl: '/audio/jukebox/pads/pad_undead_shriek.mp3',
    defaultPrompt: 'Blood-curdling ghostly banshee wail and terrifying undead crypt shriek echoing in the dark'
  },
  {
    id: 'pad_war_horn',
    name: 'Dread War Horn',
    category: 'combat',
    subtitle: 'Deep brass battle horn across the valley',
    color: '#ea580c',
    customUrl: '/audio/jukebox/pads/pad_war_horn.mp3',
    defaultPrompt: 'Deep ancient Viking and fantasy dread war horn bellowing a long echoing battle call across a misty valley'
  },
  {
    id: 'pad_steel_clash',
    name: 'Swords & Shields Clash',
    category: 'combat',
    subtitle: 'Ringing steel-on-steel ambush',
    color: '#38bdf8',
    customUrl: '/audio/jukebox/pads/pad_steel_clash.mp3',
    defaultPrompt: 'Intense medieval melee ambush with multiple steel swords clashing against shields, armor, and battle cries'
  },

  // World & Table Moments
  {
    id: 'pad_thunderclap',
    name: 'Thunderclap Strike',
    category: 'world',
    subtitle: 'Deafening lightning bolt & boom',
    color: '#6366f1',
    customUrl: '/audio/jukebox/pads/pad_thunderclap.mp3',
    defaultPrompt: 'Blinding lightning bolt strike and immediate deafening thunderclap shaking the sky'
  },
  {
    id: 'pad_crowd_cheer',
    name: 'Tavern / Crowd Cheer',
    category: 'world',
    subtitle: 'Triumphant roar & raised tankards',
    color: '#10b981',
    customUrl: '/audio/jukebox/pads/pad_crowd_cheer.mp3',
    defaultPrompt: 'Boisterous medieval fantasy tavern crowd roaring in celebration, cheering, applause, and clinking ale tankards'
  },
  {
    id: 'pad_ominous_bell',
    name: 'Cathedral Bell Toll',
    category: 'world',
    subtitle: 'Deep resonant bronze doom bell',
    color: '#eab308',
    customUrl: '/audio/jukebox/pads/pad_ominous_bell.mp3',
    defaultPrompt: 'Deep gothic cathedral bronze doom bell tolling slowly in a foggy cursed graveyard'
  },
  {
    id: 'pad_arcane_portal',
    name: 'Arcane Portal Surge',
    category: 'world',
    subtitle: 'Reality-warping rift opening',
    color: '#06b6d4',
    customUrl: '/audio/jukebox/pads/pad_arcane_portal.mp3',
    defaultPrompt: 'Massive interdimensional arcane portal tearing open with swirling cosmic bass hum and crackling leyline lightning'
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
