import { soundCatalog } from '../effects/db/soundCatalog';
import {
  AmbienceTrackDefinition,
  BUILTIN_AMBIENCE_TRACKS,
  BUILTIN_SOUNDBOARD_PADS,
  MapAudioSource
} from '../types/audioJukebox';

interface ActiveLoopInstance {
  key: string;
  trackId: string;
  gainNode: GainNode;
  muffleFilter: BiquadFilterNode;
  cleanupFns: Array<() => void>;
  targetVolume: number;
}

class JukeboxAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private activeLoops: Map<string, ActiveLoopInstance> = new Map();
  private audioBufferCache: Map<string, AudioBuffer> = new Map();
  private loadingBuffers: Map<string, Promise<AudioBuffer | null>> = new Map();

  private dmMasterVolume: number = 0.75;
  private dmMasterMuted: boolean = false;
  private localClientVolume: number = 0.85;
  private localClientMuted: boolean = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.computeEffectiveMasterGain(), this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      } catch {
        return null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private async loadAudioBuffer(url: string): Promise<AudioBuffer | null> {
    if (this.audioBufferCache.has(url)) {
      return this.audioBufferCache.get(url)!;
    }
    if (this.loadingBuffers.has(url)) {
      return this.loadingBuffers.get(url)!;
    }

    const promise = (async () => {
      try {
        const ctx = this.ensureContext();
        if (!ctx) return null;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arrayBuf = await res.arrayBuffer();
        const decoded = await ctx.decodeAudioData(arrayBuf);
        this.audioBufferCache.set(url, decoded);
        return decoded;
      } catch {
        return null;
      } finally {
        this.loadingBuffers.delete(url);
      }
    })();

    this.loadingBuffers.set(url, promise);
    return promise;
  }

  public invalidateCachedUrl(url: string) {
    this.audioBufferCache.delete(url);
  }

  private getPinkNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  private computeEffectiveMasterGain(): number {
    if (this.dmMasterMuted || this.localClientMuted) return 0;
    return Math.max(0, Math.min(1, this.dmMasterVolume * this.localClientVolume));
  }

  private updateMasterGainNode() {
    if (!this.ctx || !this.masterGain) return;
    const target = this.computeEffectiveMasterGain();
    this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
  }

  public setDmMasterState(volume: number, muted: boolean) {
    this.dmMasterVolume = Math.max(0, Math.min(1, volume));
    this.dmMasterMuted = muted;
    this.updateMasterGainNode();
  }

  public setLocalClientState(volume: number, muted: boolean) {
    this.localClientVolume = Math.max(0, Math.min(1, volume));
    this.localClientMuted = muted;
    this.updateMasterGainNode();
  }

  public getLocalClientVolume(): number {
    return this.localClientVolume;
  }

  private resolveTrackUrl(trackId: string, customTracks: AmbienceTrackDefinition[] = [], explicitUrl?: string): string | undefined {
    if (explicitUrl) return explicitUrl;
    const customDef = customTracks.find((t) => t.id === trackId);
    if (customDef?.customUrl) return customDef.customUrl;
    const builtinDef = BUILTIN_AMBIENCE_TRACKS.find((t) => t.id === trackId);
    return builtinDef?.customUrl;
  }

  /**
   * Synchronize global non-positional ambience tracks
   */
  public syncGlobalTracks(
    activeTrackVolumes: Record<string, number>,
    customTracks: AmbienceTrackDefinition[] = []
  ) {
    const desiredKeys = new Set<string>();

    Object.entries(activeTrackVolumes).forEach(([trackId, vol]) => {
      const clampedVol = Math.max(0, Math.min(1, Number(vol) || 0));
      const key = `global:${trackId}`;
      if (clampedVol > 0.01) {
        desiredKeys.add(key);
        const resolvedUrl = this.resolveTrackUrl(trackId, customTracks);
        this.setOrStartLoop(key, trackId, clampedVol, false, resolvedUrl);
      }
    });

    // Fade out any global loops no longer active
    Array.from(this.activeLoops.keys()).forEach((key) => {
      if (key.startsWith('global:') && !desiredKeys.has(key)) {
        this.stopLoop(key);
      }
    });
  }

  /**
   * Synchronize spatial / positional map audio emitters based on listener distance and wall occlusion
   */
  public syncSpatialSources(
    sources: MapAudioSource[],
    listenerPointsWorldPx: Array<{ x: number; y: number }>,
    gridSizePx: number,
    isOccludedFn?: (sx: number, sy: number, lx: number, ly: number) => boolean
  ) {
    const desiredKeys = new Set<string>();
    const safeGrid = Math.max(10, gridSizePx || 50);

    sources.forEach((src) => {
      if (src.muted || src.maxVolume <= 0.01 || src.radiusFt <= 0) return;

      let bestGain = 0;
      let bestMuffled = false;

      if (listenerPointsWorldPx.length === 0) {
        return;
      }

      for (const pt of listenerPointsWorldPx) {
        const distPx = Math.hypot(pt.x - src.x, pt.y - src.y);
        const distFt = (distPx / safeGrid) * 5;
        if (distFt < src.radiusFt) {
          const normalized = 1 - distFt / src.radiusFt;
          let candidateGain = src.maxVolume * Math.pow(normalized, 1.65);
          let occluded = false;
          if (src.muffledByWalls && isOccludedFn) {
            occluded = isOccludedFn(src.x, src.y, pt.x, pt.y);
            if (occluded) {
              candidateGain *= 0.42;
            }
          }
          if (candidateGain > bestGain) {
            bestGain = candidateGain;
            bestMuffled = occluded;
          }
        }
      }

      if (bestGain > 0.01) {
        const key = `spatial:${src.id}`;
        desiredKeys.add(key);
        const resolvedUrl = this.resolveTrackUrl(src.trackId, [], src.customUrl);
        this.setOrStartLoop(key, src.trackId, bestGain, bestMuffled, resolvedUrl);
      }
    });

    // Stop any spatial loops that are now out of earshot or deleted
    Array.from(this.activeLoops.keys()).forEach((key) => {
      if (key.startsWith('spatial:') && !desiredKeys.has(key)) {
        this.stopLoop(key);
      }
    });
  }

  public stopAllLoops() {
    Array.from(this.activeLoops.keys()).forEach((key) => this.stopLoop(key));
  }

  private setOrStartLoop(
    key: string,
    trackId: string,
    volume: number,
    muffled: boolean,
    customUrl?: string
  ) {
    const existing = this.activeLoops.get(key);
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const targetCutoff = muffled ? 420 : 18000;

    if (existing && existing.trackId === trackId) {
      existing.targetVolume = volume;
      existing.gainNode.gain.setTargetAtTime(volume, ctx.currentTime, 0.25);
      existing.muffleFilter.frequency.setTargetAtTime(targetCutoff, ctx.currentTime, 0.2);
      return;
    }

    if (existing) {
      this.stopLoop(key);
    }

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
    gainNode.gain.setTargetAtTime(volume, ctx.currentTime, 0.35);

    const muffleFilter = ctx.createBiquadFilter();
    muffleFilter.type = 'lowpass';
    muffleFilter.frequency.setValueAtTime(targetCutoff, ctx.currentTime);

    gainNode.connect(muffleFilter);
    muffleFilter.connect(this.masterGain);

    const cleanupFns = this.buildTrackGenerator(ctx, muffleFilter, gainNode, trackId, customUrl);

    this.activeLoops.set(key, {
      key,
      trackId,
      gainNode,
      muffleFilter,
      cleanupFns,
      targetVolume: volume
    });
  }

  private stopLoop(key: string) {
    const instance = this.activeLoops.get(key);
    if (!instance) return;
    this.activeLoops.delete(key);

    if (this.ctx) {
      try {
        instance.gainNode.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.2);
      } catch {}
    }

    setTimeout(() => {
      instance.cleanupFns.forEach((fn) => {
        try {
          fn();
        } catch {}
      });
      try {
        instance.gainNode.disconnect();
        instance.muffleFilter.disconnect();
      } catch {}
    }, 650);
  }

  /**
   * Builds ElevenLabs studio audio loop (with Web Audio BufferSource so spatial muffling & multi-instance work seamlessly)
   */
  private buildTrackGenerator(
    ctx: AudioContext,
    _filterNode: BiquadFilterNode,
    outputGain: GainNode,
    trackId: string,
    customUrl?: string
  ): Array<() => void> {
    const cleanups: Array<() => void> = [];
    let isCancelled = false;
    cleanups.push(() => {
      isCancelled = true;
    });

    const resolvedUrl = customUrl || this.resolveTrackUrl(trackId);

    // 1. Primary: ElevenLabs Studio Audio File / Custom Audio File via decoded AudioBufferSourceNode
    if (resolvedUrl) {
      const startFromBuffer = (buffer: AudioBuffer) => {
        if (isCancelled) return;
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        src.connect(outputGain);
        // Slight random offset for spatial sources so multiple emitters don't phase-comb
        const startOffset = buffer.duration > 2 ? Math.random() * (buffer.duration * 0.4) : 0;
        src.start(0, startOffset);
        cleanups.push(() => {
          try {
            src.stop();
            src.disconnect();
          } catch {}
        });
      };

      const cached = this.audioBufferCache.get(resolvedUrl);
      if (cached) {
        startFromBuffer(cached);
        return cleanups;
      }

      this.loadAudioBuffer(resolvedUrl).then((buf) => {
        if (isCancelled) return;
        if (buf) {
          startFromBuffer(buf);
        } else if (typeof Audio !== 'undefined') {
          // Fallback to HTML5 Audio element if fetch/decode failed
          const audioEl = new Audio(resolvedUrl);
          audioEl.loop = true;
          audioEl.volume = Math.min(1, this.computeEffectiveMasterGain() * 0.7);
          audioEl.play().catch(() => {});
          cleanups.push(() => {
            audioEl.pause();
            audioEl.src = '';
          });
        }
      });

      return cleanups;
    }

    // 2. Fallback: Procedural Web Audio synthesis if no URL exists
    const noiseBuffer = this.getPinkNoiseBuffer(ctx);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, ctx.currentTime);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.25, ctx.currentTime);
    src.connect(filter);
    filter.connect(subGain);
    subGain.connect(outputGain);
    src.start(0);
    cleanups.push(() => {
      try {
        src.stop();
        src.disconnect();
        filter.disconnect();
        subGain.disconnect();
      } catch {}
    });

    return cleanups;
  }

  /**
   * Play a One-Click Soundboard Pad using ElevenLabs Studio MP3 assets
   */
  public playSoundboardPad(padId: string, volume: number = 0.85, customUrl?: string) {
    const effectiveVol = volume * this.computeEffectiveMasterGain();
    if (effectiveVol <= 0.01) return;

    const builtinPad = BUILTIN_SOUNDBOARD_PADS.find((p) => p.id === padId);
    const resolvedUrl = customUrl || builtinPad?.customUrl || `/audio/jukebox/pads/${padId}.mp3`;

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) {
      if (typeof Audio !== 'undefined') {
        try {
          const audio = new Audio(resolvedUrl);
          audio.volume = Math.min(1, effectiveVol);
          audio.play().catch(() => {});
        } catch {}
      }
      return;
    }

    const playDecodedPad = (buffer: AudioBuffer) => {
      if (!this.ctx || !this.masterGain) return;
      try {
        const source = this.ctx.createBufferSource();
        const gainNode = this.ctx.createGain();
        source.buffer = buffer;
        // Subtle natural pitch variance (0.98 - 1.02)
        source.playbackRate.setValueAtTime(0.98 + Math.random() * 0.04, this.ctx.currentTime);
        gainNode.gain.setValueAtTime(Math.max(0.01, Math.min(1.5, volume)), this.ctx.currentTime);
        source.connect(gainNode);
        gainNode.connect(this.masterGain);
        source.start();
      } catch {}
    };

    const cached = this.audioBufferCache.get(resolvedUrl);
    if (cached) {
      playDecodedPad(cached);
      return;
    }

    this.loadAudioBuffer(resolvedUrl).then((buf) => {
      if (buf) {
        playDecodedPad(buf);
      } else {
        soundCatalog.play('generic_cast', effectiveVol);
      }
    });
  }
}

export const jukeboxAudioEngine = new JukeboxAudioEngine();
