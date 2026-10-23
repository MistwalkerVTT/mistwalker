// src/effects/db/soundCatalog.ts
// Studio-quality sound engine for MistWalker 4.0 powered by ElevenLabs Neural SFX & Web Audio API

export type SoundEffectType =
  | 'fire_explosion'
  | 'fire_whoosh'
  | 'lightning_strike'
  | 'lightning_blast'
  | 'thunder_boom'
  | 'thunder_crack'
  | 'thunder_blast'
  | 'cold_freeze'
  | 'cold_blast'
  | 'cold_frost'
  | 'frost_shatter'
  | 'eldritch_blast'
  | 'arcane_cast'
  | 'magic_whoosh'
  | 'magic_hum'
  | 'magic_whisper'
  | 'magic_bell'
  | 'magic_chime'
  | 'magic_explosion'
  | 'magic_shatter'
  | 'radiant_heal'
  | 'radiant_burst'
  | 'holy_radiance'
  | 'necrotic_drain'
  | 'necrotic_pulse'
  | 'shield_barrier'
  | 'shield_clash'
  | 'teleport_whoosh'
  | 'teleport'
  | 'wind_whoosh'
  | 'wind_gust'
  | 'acid_burn'
  | 'water_splash'
  | 'divine_chime'
  | 'metal_clang'
  | 'sword_slash'
  | 'generic_cast';

export interface SoundCatalogEntryMeta {
  key: SoundEffectType;
  label: string;
  category: 'fire' | 'lightning' | 'cold' | 'arcane' | 'radiant' | 'necrotic' | 'martial' | 'elemental';
  fileName: string;
  sourceEngine: 'elevenlabs' | 'studio';
  defaultPrompt: string;
}

// Map of sound effect keys to dedicated audio files in /audio/sfx/spells/
// Every single key now maps to its own distinct audio asset (zero duplicate aliases!)
export const SOUND_FILE_MAP: Record<string, string> = {
  // Fire (Upgraded with ElevenLabs)
  fire_explosion: 'fire_explosion.mp3',
  fire_whoosh: 'fire_whoosh.ogg',

  // Lightning & Thunder (Upgraded with ElevenLabs)
  lightning_strike: 'lightning_strike.ogg',
  lightning_blast: 'lightning_blast.ogg',
  thunder_boom: 'thunder_boom.mp3',
  thunder_crack: 'thunder_crack.mp3',
  thunder_blast: 'thunder_blast.mp3',

  // Cold & Ice (Upgraded with ElevenLabs)
  cold_freeze: 'cold_freeze.ogg',
  cold_blast: 'cold_blast.ogg',
  cold_frost: 'cold_frost.mp3',
  frost_shatter: 'frost_shatter.mp3',

  // Arcane & Force (Upgraded with ElevenLabs)
  eldritch_blast: 'eldritch_blast.mp3',
  arcane_cast: 'arcane_cast.mp3',
  magic_whoosh: 'magic_whoosh.mp3',
  magic_hum: 'magic_hum.ogg',
  magic_whisper: 'magic_whisper.ogg',
  magic_bell: 'magic_bell.ogg',
  magic_chime: 'magic_chime.ogg',
  magic_explosion: 'magic_explosion.mp3',
  magic_shatter: 'magic_shatter.mp3',

  // Radiant & Healing (Upgraded with ElevenLabs)
  radiant_heal: 'radiant_heal.ogg',
  radiant_burst: 'radiant_burst.ogg',
  holy_radiance: 'holy_radiance.ogg',
  divine_chime: 'divine_chime.mp3',

  // Necrotic & Dark (Upgraded with ElevenLabs)
  necrotic_drain: 'necrotic_drain.ogg',
  necrotic_pulse: 'necrotic_pulse.mp3',

  // Abjuration & Defense (Upgraded with ElevenLabs)
  shield_barrier: 'shield_barrier.ogg',
  shield_clash: 'shield_clash.mp3',

  // Movement & Teleport (Upgraded with ElevenLabs)
  teleport_whoosh: 'teleport_whoosh.ogg',
  teleport: 'teleport.mp3',

  // Environmental & Elemental (Upgraded with ElevenLabs)
  wind_whoosh: 'wind_whoosh.ogg',
  wind_gust: 'wind_gust.mp3',
  acid_burn: 'acid_burn.mp3',
  water_splash: 'water_splash.mp3',

  // Martial / Physical Impacts (Upgraded with ElevenLabs)
  metal_clang: 'metal_clang.mp3',
  sword_slash: 'sword_slash.mp3',

  // Fallback (Upgraded with ElevenLabs)
  generic_cast: 'generic_cast.mp3'
};

export const SOUND_EFFECT_CATALOG_META: SoundCatalogEntryMeta[] = [
  {
    key: 'fire_explosion',
    label: 'Fireball Explosion',
    category: 'fire',
    fileName: SOUND_FILE_MAP.fire_explosion,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Cinematic D&D Fireball spell detonation: whistling ember ignition followed by a massive roaring inferno explosion'
  },
  {
    key: 'fire_whoosh',
    label: 'Fire Bolt / Flame Whoosh',
    category: 'fire',
    fileName: SOUND_FILE_MAP.fire_whoosh,
    sourceEngine: 'studio',
    defaultPrompt: 'Blazing magical fire bolt whooshing through the air with roaring flame trail'
  },
  {
    key: 'lightning_strike',
    label: 'Lightning Bolt Strike',
    category: 'lightning',
    fileName: SOUND_FILE_MAP.lightning_strike,
    sourceEngine: 'studio',
    defaultPrompt: 'High-voltage magical lightning bolt arc crackling and striking stone'
  },
  {
    key: 'lightning_blast',
    label: 'Chain Lightning Blast',
    category: 'lightning',
    fileName: SOUND_FILE_MAP.lightning_blast,
    sourceEngine: 'studio',
    defaultPrompt: 'Surging electric plasma discharge and crackling chain lightning burst'
  },
  {
    key: 'thunder_boom',
    label: 'Thunder Boom',
    category: 'lightning',
    fileName: SOUND_FILE_MAP.thunder_boom,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Colossal rolling thunderclap boom shaking the earth with deep reverberating bass'
  },
  {
    key: 'thunder_crack',
    label: 'Thunder Crack',
    category: 'lightning',
    fileName: SOUND_FILE_MAP.thunder_crack,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Sharp deafening close-range lightning thunder crack and electric shockwave snap'
  },
  {
    key: 'thunder_blast',
    label: 'Thunderwave Sonic Blast',
    category: 'lightning',
    fileName: SOUND_FILE_MAP.thunder_blast,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Concussive sonic boom thunderwave blast shattering air with deep sub-bass shockwave'
  },
  {
    key: 'cold_freeze',
    label: 'Ray of Frost Freeze',
    category: 'cold',
    fileName: SOUND_FILE_MAP.cold_freeze,
    sourceEngine: 'studio',
    defaultPrompt: 'Deep glacial ice beam freezing target solid with crystalline crackle'
  },
  {
    key: 'cold_blast',
    label: 'Cone of Cold Blast',
    category: 'cold',
    fileName: SOUND_FILE_MAP.cold_blast,
    sourceEngine: 'studio',
    defaultPrompt: 'Roaring arctic blizzard cone of cold blast with freezing ice shards'
  },
  {
    key: 'cold_frost',
    label: 'Creeping Rime / Frost',
    category: 'cold',
    fileName: SOUND_FILE_MAP.cold_frost,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Crystalline creeping ice frost rapidly freezing over stone with arctic wind shimmer'
  },
  {
    key: 'frost_shatter',
    label: 'Ice Storm Shatter',
    category: 'cold',
    fileName: SOUND_FILE_MAP.frost_shatter,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Massive frozen ice crystal glacier violently shattering into razor shards with sub-zero impact'
  },
  {
    key: 'eldritch_blast',
    label: 'Eldritch Blast',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.eldritch_blast,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Crackling dark purple warlock eldritch beam firing with a distorted otherworldly force impact'
  },
  {
    key: 'arcane_cast',
    label: 'Arcane Spell Weave',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.arcane_cast,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Deep wizard spell weave activation with shimmering astral chords and eldritch power surge'
  },
  {
    key: 'magic_whoosh',
    label: 'Magic Missile Whoosh',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.magic_whoosh,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Fast arcane projectile missile whooshing through the air with sparkling magical trail'
  },
  {
    key: 'magic_explosion',
    label: 'Arcane Force Detonation',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.magic_explosion,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Arcane force explosion detonation with resonant purple energy shockwave and crystalline debris'
  },
  {
    key: 'magic_shatter',
    label: 'Shatter / Dispel Barrier',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.magic_shatter,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'High-pitched resonant glass and arcane crystal barrier shattering into a thousand echoing fragments'
  },
  {
    key: 'magic_hum',
    label: 'Arcane Aura Hum',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.magic_hum,
    sourceEngine: 'studio',
    defaultPrompt: 'Sustained mystical leyline aura hum and oscillating arcane resonance'
  },
  {
    key: 'magic_whisper',
    label: 'Illusion / Enchantment Whisper',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.magic_whisper,
    sourceEngine: 'studio',
    defaultPrompt: 'Hypnotic psychic enchantment whispers echoing in the mind'
  },
  {
    key: 'magic_bell',
    label: 'Toll the Dead Bell',
    category: 'necrotic',
    fileName: SOUND_FILE_MAP.magic_bell,
    sourceEngine: 'studio',
    defaultPrompt: 'Solemnnecromantic bronze bell tolling with dark reverberation'
  },
  {
    key: 'magic_chime',
    label: 'Abjuration / Bless Chime',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.magic_chime,
    sourceEngine: 'studio',
    defaultPrompt: 'Clear shimmering crystal chime of magical warding and enchantment'
  },
  {
    key: 'radiant_heal',
    label: 'Cure Wounds / Healing Word',
    category: 'radiant',
    fileName: SOUND_FILE_MAP.radiant_heal,
    sourceEngine: 'studio',
    defaultPrompt: 'Warm golden celestial healing aura with soothing angelic harp shimmer'
  },
  {
    key: 'radiant_burst',
    label: 'Divine Smite / Guiding Bolt',
    category: 'radiant',
    fileName: SOUND_FILE_MAP.radiant_burst,
    sourceEngine: 'studio',
    defaultPrompt: 'Explosive paladin Divine Smite radiant impact with searing golden light and holy thunder'
  },
  {
    key: 'holy_radiance',
    label: 'Spirit Guardians / Sunbeam',
    category: 'radiant',
    fileName: SOUND_FILE_MAP.holy_radiance,
    sourceEngine: 'studio',
    defaultPrompt: 'Majestic heavenly choir chord and blazing solar radiance aura'
  },
  {
    key: 'divine_chime',
    label: 'Celestial Blessing Chime',
    category: 'radiant',
    fileName: SOUND_FILE_MAP.divine_chime,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Celestial angelic choir harmonic bell chime and golden radiant blessing resonance'
  },
  {
    key: 'necrotic_drain',
    label: 'Vampiric / Necrotic Drain',
    category: 'necrotic',
    fileName: SOUND_FILE_MAP.necrotic_drain,
    sourceEngine: 'studio',
    defaultPrompt: 'Sinister life-draining necrotic siphon with dark shadowy hiss'
  },
  {
    key: 'necrotic_pulse',
    label: 'Blight / Necrotic Pulse',
    category: 'necrotic',
    fileName: SOUND_FILE_MAP.necrotic_pulse,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Dark abyssal necrotic heartbeat pulse with bone-chilling shadow wraith exhale and soul drain'
  },
  {
    key: 'shield_barrier',
    label: 'Arcane Shield Barrier',
    category: 'martial',
    fileName: SOUND_FILE_MAP.shield_barrier,
    sourceEngine: 'studio',
    defaultPrompt: 'Translucent force field barrier materializing with resonant crystalline deflection'
  },
  {
    key: 'shield_clash',
    label: 'Knight Shield Clash',
    category: 'martial',
    fileName: SOUND_FILE_MAP.shield_clash,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Heavy medieval steel broadsword slamming against a reinforced iron knight shield with metallic ring'
  },
  {
    key: 'sword_slash',
    label: 'Sword Slash & Cleave',
    category: 'martial',
    fileName: SOUND_FILE_MAP.sword_slash,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Razor-sharp medieval steel longsword swoosh and visceral armor-piercing slash impact'
  },
  {
    key: 'metal_clang',
    label: 'Heavy Weapon / Armor Clang',
    category: 'martial',
    fileName: SOUND_FILE_MAP.metal_clang,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Heavy forged warhammer and greataxe clanging against plate armor with sparks and metallic resonance'
  },
  {
    key: 'teleport_whoosh',
    label: 'Misty Step / Dimension Door',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.teleport_whoosh,
    sourceEngine: 'studio',
    defaultPrompt: 'Swirling silver mist teleportation whoosh vanishing into the astral plane'
  },
  {
    key: 'teleport',
    label: 'Arcane Blink Teleport',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.teleport,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Instant dimensional blink teleportation pop with spatial vacuum implosion and arcane shimmer'
  },
  {
    key: 'wind_whoosh',
    label: 'Whirlwind / Air Slash',
    category: 'elemental',
    fileName: SOUND_FILE_MAP.wind_whoosh,
    sourceEngine: 'studio',
    defaultPrompt: 'Rushing elemental air current sweeping across the battlefield'
  },
  {
    key: 'wind_gust',
    label: 'Gust of Wind Vortex',
    category: 'elemental',
    fileName: SOUND_FILE_MAP.wind_gust,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Powerful cyclone wind gust vortex howling and sweeping leaves and dust across a battleground'
  },
  {
    key: 'acid_burn',
    label: 'Acid Splash / Poison Spray',
    category: 'elemental',
    fileName: SOUND_FILE_MAP.acid_burn,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Caustic bubbling venom and corrosive acid splash sizzling and dissolving stone and metal'
  },
  {
    key: 'water_splash',
    label: 'Tidal Wave / Water Blast',
    category: 'elemental',
    fileName: SOUND_FILE_MAP.water_splash,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Magical high-pressure tidal water wave crash and deep liquid splash impact'
  },
  {
    key: 'generic_cast',
    label: 'Universal Spell Incantation',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.generic_cast,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Mystical arcane spellcasting incantation whoosh with glowing runic energy discharge'
  }
];

const OVERRIDES_STORAGE_KEY = 'mistwalker_sfx_overrides_v1';

class EffectsSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.55;
  private audioBufferCache: Map<string, AudioBuffer> = new Map();
  private loadingPromises: Map<string, Promise<AudioBuffer | null>> = new Map();
  private customUrlOverrides: Record<string, string> = {};

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(OVERRIDES_STORAGE_KEY);
        if (raw) {
          this.customUrlOverrides = JSON.parse(raw) || {};
        }
      } catch {}
    }
  }

  private initContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (typeof window === 'undefined') return null;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    } catch {
      // AudioContext unavailable
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public setCustomOverride(key: string, audioUrl: string) {
    const cleanKey = key.toLowerCase().trim();
    this.customUrlOverrides[cleanKey] = audioUrl;
    this.audioBufferCache.delete(audioUrl);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(this.customUrlOverrides));
      } catch {}
    }
  }

  public getCustomOverrides(): Record<string, string> {
    return { ...this.customUrlOverrides };
  }

  public resolveAudioUrl(type: SoundEffectType | string): string {
    const cleanKey = type.toLowerCase().trim();
    if (this.customUrlOverrides[cleanKey]) {
      return this.customUrlOverrides[cleanKey];
    }
    const fileName = SOUND_FILE_MAP[cleanKey] || SOUND_FILE_MAP['generic_cast'];
    return `/audio/sfx/spells/${fileName}`;
  }

  /**
   * Preload an audio file into Web Audio buffer cache for instant 0ms latency playback
   */
  private async loadBuffer(url: string): Promise<AudioBuffer | null> {
    if (this.audioBufferCache.has(url)) {
      return this.audioBufferCache.get(url)!;
    }

    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    const loadPromise = (async () => {
      try {
        const ctx = this.initContext();
        if (!ctx) return null;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arrayBuffer = await res.arrayBuffer();
        const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
        this.audioBufferCache.set(url, decodedBuffer);
        return decodedBuffer;
      } catch {
        return null;
      } finally {
        this.loadingPromises.delete(url);
      }
    })();

    this.loadingPromises.set(url, loadPromise);
    return loadPromise;
  }

  /**
   * Play a studio sound effect by key or custom URL
   */
  public play(type: SoundEffectType | string, customUrlOrVolume?: string | number) {
    if (this.isMuted) return;

    // 1. Play custom audio file if provided as URL string
    if (typeof customUrlOrVolume === 'string' && typeof Audio !== 'undefined') {
      try {
        const audio = new Audio(customUrlOrVolume);
        audio.volume = this.volume;
        audio.play().catch(() => {});
        return;
      } catch {}
    }

    const customVol = typeof customUrlOrVolume === 'number' ? customUrlOrVolume : 1;
    const audioUrl = this.resolveAudioUrl(type);

    const ctx = this.initContext();
    if (!ctx || !this.masterGain) {
      try {
        const audio = new Audio(audioUrl);
        audio.volume = Math.min(1, this.volume * customVol);
        audio.play().catch(() => {});
      } catch {}
      return;
    }

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Check if buffer is already cached for 0ms latency
    const cachedBuffer = this.audioBufferCache.get(audioUrl);
    if (cachedBuffer) {
      this.playBuffer(cachedBuffer, customVol);
      return;
    }

    // Buffer not loaded yet: load and play, with immediate HTML5 audio fallback
    this.loadBuffer(audioUrl).then((buf) => {
      if (buf) {
        this.playBuffer(buf, customVol);
      } else {
        try {
          const audio = new Audio(audioUrl);
          audio.volume = Math.min(1, this.volume * customVol);
          audio.play().catch(() => {});
        } catch {}
      }
    });
  }

  /**
   * Play an in-memory AudioBuffer with organic micro pitch variation (±3.5%)
   */
  private playBuffer(buffer: AudioBuffer, volumeScale: number = 1) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const source = this.ctx.createBufferSource();
      const gainNode = this.ctx.createGain();

      source.buffer = buffer;

      // Slight natural pitch variance (0.965 - 1.035) so repeat casts sound organic
      const randomPitch = 0.965 + Math.random() * 0.07;
      source.playbackRate.setValueAtTime(randomPitch, this.ctx.currentTime);

      gainNode.gain.setValueAtTime(Math.max(0.01, Math.min(1.5, volumeScale)), this.ctx.currentTime);

      source.connect(gainNode);
      gainNode.connect(this.masterGain);

      source.start();
    } catch {
      // Safe fallback
    }
  }

  /**
   * Preload common signature spell & combat sounds into memory
   */
  public preloadCommonSounds() {
    if (typeof window === 'undefined') return;
    const commonKeys = [
      'fire_explosion',
      'fire_whoosh',
      'lightning_strike',
      'cold_freeze',
      'eldritch_blast',
      'radiant_heal',
      'radiant_burst',
      'shield_barrier',
      'shield_clash',
      'sword_slash',
      'metal_clang',
      'teleport_whoosh',
      'thunder_boom'
    ];

    commonKeys.forEach((key) => {
      const url = this.resolveAudioUrl(key);
      this.loadBuffer(url).catch(() => {});
    });
  }
}

export const soundCatalog = new EffectsSoundEngine();
