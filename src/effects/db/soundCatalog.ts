// src/effects/db/soundCatalog.ts
// Studio-quality sound engine for MistWalker 4.0 powered by Web Audio API and authentic fantasy SFX

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

// Map of sound effect keys to audio file names in /audio/sfx/spells/
const SOUND_FILE_MAP: Record<string, string> = {
  // Fire
  fire_explosion: 'fire_explosion.ogg',
  fire_whoosh: 'fire_whoosh.ogg',
  
  // Lightning & Thunder
  lightning_strike: 'lightning_strike.ogg',
  lightning_blast: 'lightning_blast.ogg',
  thunder_boom: 'thunder_boom.ogg',
  thunder_crack: 'thunder_boom.ogg',
  thunder_blast: 'thunder_boom.ogg',
  
  // Cold & Ice
  cold_freeze: 'cold_freeze.ogg',
  cold_blast: 'cold_blast.ogg',
  cold_frost: 'cold_freeze.ogg',
  frost_shatter: 'frost_shatter.ogg',
  
  // Arcane & Force
  eldritch_blast: 'eldritch_blast.ogg',
  arcane_cast: 'arcane_cast.ogg',
  magic_whoosh: 'magic_whoosh.ogg',
  magic_hum: 'magic_hum.ogg',
  magic_whisper: 'magic_whisper.ogg',
  magic_bell: 'magic_bell.ogg',
  magic_chime: 'magic_chime.ogg',
  magic_explosion: 'fire_explosion.ogg',
  magic_shatter: 'frost_shatter.ogg',
  
  // Radiant & Healing
  radiant_heal: 'radiant_heal.ogg',
  radiant_burst: 'radiant_burst.ogg',
  holy_radiance: 'holy_radiance.ogg',
  divine_chime: 'magic_chime.ogg',
  
  // Necrotic & Dark
  necrotic_drain: 'necrotic_drain.ogg',
  necrotic_pulse: 'necrotic_drain.ogg',
  
  // Abjuration & Defense
  shield_barrier: 'shield_barrier.ogg',
  shield_clash: 'shield_clash.ogg',
  
  // Movement & Teleport
  teleport_whoosh: 'teleport_whoosh.ogg',
  teleport: 'teleport_whoosh.ogg',
  
  // Environmental & Elemental
  wind_whoosh: 'wind_whoosh.ogg',
  wind_gust: 'wind_whoosh.ogg',
  acid_burn: 'acid_burn.ogg',
  water_splash: 'acid_burn.ogg',
  
  // Martial / Physical Impacts
  metal_clang: 'metal_clang.ogg',
  sword_slash: 'sword_slash.ogg',
  
  // Fallback
  generic_cast: 'generic_cast.ogg'
};

class EffectsSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.45;
  private audioBufferCache: Map<string, AudioBuffer> = new Map();
  private loadingPromises: Map<string, Promise<AudioBuffer | null>> = new Map();

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
      } catch (err) {
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
    const cleanKey = type.toLowerCase().trim();
    const fileName = SOUND_FILE_MAP[cleanKey] || SOUND_FILE_MAP['generic_cast'];
    const audioUrl = `/audio/sfx/spells/${fileName}`;

    const ctx = this.initContext();
    if (!ctx || !this.masterGain) {
      // Fallback to basic HTML5 Audio
      try {
        const audio = new Audio(audioUrl);
        audio.volume = this.volume * customVol;
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
        // Fallback to HTML5 audio element
        try {
          const audio = new Audio(audioUrl);
          audio.volume = this.volume * customVol;
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
   * Preload common signature spell sounds into memory
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
      'teleport_whoosh',
      'thunder_boom'
    ];

    commonKeys.forEach((key) => {
      const file = SOUND_FILE_MAP[key];
      if (file) {
        this.loadBuffer(`/audio/sfx/spells/${file}`).catch(() => {});
      }
    });
  }
}

export const soundCatalog = new EffectsSoundEngine();
