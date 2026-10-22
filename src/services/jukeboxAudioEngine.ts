import { soundCatalog } from '../effects/db/soundCatalog';
import { AmbienceTrackDefinition, MapAudioSource } from '../types/audioJukebox';

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

  private getPinkNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;
    const bufferSize = ctx.sampleRate * 4; // 4 second seamless loop buffer
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
        const customDef = customTracks.find(t => t.id === trackId);
        this.setOrStartLoop(key, trackId, clampedVol, false, customDef?.customUrl);
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

      // Find closest listener token
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
          // Smooth quadratic spatial rolloff
          let candidateGain = src.maxVolume * Math.pow(normalized, 1.65);
          let occluded = false;
          if (src.muffledByWalls && isOccludedFn) {
            occluded = isOccludedFn(src.x, src.y, pt.x, pt.y);
            if (occluded) {
              candidateGain *= 0.42; // Attenuate through closed doors/walls
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
        this.setOrStartLoop(key, src.trackId, bestGain, bestMuffled, src.customUrl);
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
   * Builds continuous procedural + sample hybrid generators for each ambience track
   */
  private buildTrackGenerator(
    ctx: AudioContext,
    _filterNode: BiquadFilterNode,
    outputGain: GainNode,
    trackId: string,
    customUrl?: string
  ): Array<() => void> {
    const cleanups: Array<() => void> = [];

    // 1. Custom uploaded audio file loop
    if (customUrl && typeof Audio !== 'undefined') {
      const audioEl = new Audio(customUrl);
      audioEl.crossOrigin = 'anonymous';
      audioEl.loop = true;
      try {
        const mediaSource = ctx.createMediaElementSource(audioEl);
        mediaSource.connect(outputGain);
        audioEl.play().catch(() => {});
        cleanups.push(() => {
          audioEl.pause();
          audioEl.src = '';
          mediaSource.disconnect();
        });
      } catch {
        audioEl.volume = 0.5;
        audioEl.play().catch(() => {});
        cleanups.push(() => {
          audioEl.pause();
          audioEl.src = '';
        });
      }
      return cleanups;
    }

    const noiseBuffer = this.getPinkNoiseBuffer(ctx);

    const createNoiseLoop = (filterType: BiquadFilterType, freq: number, q: number, subGainVal: number) => {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.setValueAtTime(freq, ctx.currentTime);
      filter.Q.setValueAtTime(q, ctx.currentTime);
      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(subGainVal, ctx.currentTime);

      src.connect(filter);
      filter.connect(subGain);
      subGain.connect(outputGain);
      src.start(0, Math.random() * 2);

      cleanups.push(() => {
        try {
          src.stop();
          src.disconnect();
          filter.disconnect();
          subGain.disconnect();
        } catch {}
      });

      return { src, filter, subGain };
    };

    const createDroneVoices = (freqs: number[], oscType: OscillatorType, voiceGain: number, filterCutoff = 550) => {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(filterCutoff, ctx.currentTime);
      lp.connect(outputGain);
      cleanups.push(() => lp.disconnect());

      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        osc.type = oscType;
        osc.frequency.setValueAtTime(f, ctx.currentTime);
        osc.detune.setValueAtTime((idx % 2 === 0 ? 1 : -1) * 4.5, ctx.currentTime);

        const g = ctx.createGain();
        g.gain.setValueAtTime(voiceGain, ctx.currentTime);

        osc.connect(g);
        g.connect(lp);
        osc.start();

        cleanups.push(() => {
          try {
            osc.stop();
            osc.disconnect();
            g.disconnect();
          } catch {}
        });
      });
    };

    switch (trackId) {
      case 'tavern_hearth': {
        // Warm D-dorian acoustic fifths + gentle lute-like plucked harmonics
        createDroneVoices([146.83, 220.0, 293.66, 329.63], 'triangle', 0.08, 620);
        createNoiseLoop('bandpass', 340, 1.2, 0.12);
        const timer = window.setInterval(() => {
          if (ctx.state !== 'running') return;
          const notes = [293.66, 329.63, 392.0, 440.0, 523.25, 587.33];
          const note = notes[Math.floor(Math.random() * notes.length)];
          const osc = ctx.createOscillator();
          const pluckGain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(note, ctx.currentTime);
          pluckGain.gain.setValueAtTime(0.001, ctx.currentTime);
          pluckGain.gain.linearRampToValueAtTime(0.09, ctx.currentTime + 0.03);
          pluckGain.gain.exponentialRampToValueAtTime(0.0008, ctx.currentTime + 1.8);
          osc.connect(pluckGain);
          pluckGain.connect(outputGain);
          osc.start();
          osc.stop(ctx.currentTime + 1.9);
        }, 1600);
        cleanups.push(() => window.clearInterval(timer));
        break;
      }

      case 'crypt_catacombs': {
        // Deep ominous C-minor catacomb sub-drone + cavern air
        createDroneVoices([65.41, 98.0, 130.81, 155.56], 'sawtooth', 0.06, 260);
        createNoiseLoop('lowpass', 180, 2.0, 0.35);
        break;
      }

      case 'boss_battle_pulse': {
        // Driving low war-drum pulse + tense minor brass drone
        createDroneVoices([73.42, 110.0, 146.83, 219.9], 'sawtooth', 0.065, 380);
        const timer = window.setInterval(() => {
          if (ctx.state !== 'running') return;
          const now = ctx.currentTime;
          const drumOsc = ctx.createOscillator();
          const drumGain = ctx.createGain();
          drumOsc.type = 'sine';
          drumOsc.frequency.setValueAtTime(105, now);
          drumOsc.frequency.exponentialRampToValueAtTime(38, now + 0.28);
          drumGain.gain.setValueAtTime(0.28, now);
          drumGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
          drumOsc.connect(drumGain);
          drumGain.connect(outputGain);
          drumOsc.start(now);
          drumOsc.stop(now + 0.36);
        }, 650);
        cleanups.push(() => window.clearInterval(timer));
        break;
      }

      case 'arcane_sanctum': {
        // Crystalline harmonic shimmer
        createDroneVoices([220.0, 330.0, 440.0, 659.25], 'sine', 0.07, 1400);
        createNoiseLoop('bandpass', 1200, 4.0, 0.08);
        break;
      }

      case 'overland_frontier': {
        // Open horizon modal chord pad
        createDroneVoices([130.81, 196.0, 261.63, 392.0], 'triangle', 0.075, 700);
        createNoiseLoop('bandpass', 480, 1.5, 0.14);
        break;
      }

      case 'crackling_campfire': {
        // Warm low-pass hearth rumble + stochastic ember pops
        createNoiseLoop('lowpass', 240, 0.9, 0.45);
        const timer = window.setInterval(() => {
          if (ctx.state !== 'running') return;
          if (Math.random() > 0.65) return;
          const now = ctx.currentTime;
          const popOsc = ctx.createOscillator();
          const popGain = ctx.createGain();
          popOsc.type = 'sawtooth';
          popOsc.frequency.setValueAtTime(1400 + Math.random() * 1800, now);
          popGain.gain.setValueAtTime(0.08 + Math.random() * 0.08, now);
          popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
          popOsc.connect(popGain);
          popGain.connect(outputGain);
          popOsc.start(now);
          popOsc.stop(now + 0.04);
        }, 180);
        cleanups.push(() => window.clearInterval(timer));
        break;
      }

      case 'dungeon_drips': {
        // Damp cavern air + resonant water droplet plinks
        createNoiseLoop('lowpass', 210, 1.5, 0.22);
        const timer = window.setInterval(() => {
          if (ctx.state !== 'running') return;
          if (Math.random() > 0.55) return;
          const now = ctx.currentTime;
          const dropOsc = ctx.createOscillator();
          const dropGain = ctx.createGain();
          const startFreq = 900 + Math.random() * 750;
          dropOsc.type = 'sine';
          dropOsc.frequency.setValueAtTime(startFreq, now);
          dropOsc.frequency.exponentialRampToValueAtTime(startFreq * 1.45, now + 0.09);
          dropGain.gain.setValueAtTime(0.12, now);
          dropGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.18);
          dropOsc.connect(dropGain);
          dropGain.connect(outputGain);
          dropOsc.start(now);
          dropOsc.stop(now + 0.2);
        }, 900);
        cleanups.push(() => window.clearInterval(timer));
        break;
      }

      case 'tavern_crowd': {
        // Warm vocal-formant bandpass murmur + occasional glass clinks
        const { filter } = createNoiseLoop('bandpass', 520, 1.4, 0.42);
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.setValueAtTime(0.35, ctx.currentTime);
        lfoGain.gain.setValueAtTime(140, ctx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();
        cleanups.push(() => {
          try {
            lfo.stop();
            lfo.disconnect();
            lfoGain.disconnect();
          } catch {}
        });
        break;
      }

      case 'whispering_souls': {
        // Eerie sweeping high-Q formant whispers
        const { filter } = createNoiseLoop('bandpass', 1450, 6.5, 0.35);
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.setValueAtTime(0.22, ctx.currentTime);
        lfoGain.gain.setValueAtTime(650, ctx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();
        cleanups.push(() => {
          try {
            lfo.stop();
            lfo.disconnect();
            lfoGain.disconnect();
          } catch {}
        });
        break;
      }

      case 'heavy_rain': {
        // Dual-layer rain wash + roof patter
        createNoiseLoop('bandpass', 1100, 0.7, 0.55);
        createNoiseLoop('highpass', 2600, 0.5, 0.22);
        break;
      }

      case 'howling_wind': {
        // Sweeping cavern wind
        const { filter } = createNoiseLoop('bandpass', 380, 3.2, 0.52);
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.setValueAtTime(0.14, ctx.currentTime);
        lfoGain.gain.setValueAtTime(220, ctx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();
        cleanups.push(() => {
          try {
            lfo.stop();
            lfo.disconnect();
            lfoGain.disconnect();
          } catch {}
        });
        break;
      }

      case 'distant_thunder': {
        // Low storm bed + periodic thunder rumbles
        createNoiseLoop('lowpass', 145, 0.8, 0.48);
        const timer = window.setInterval(() => {
          if (ctx.state !== 'running') return;
          if (Math.random() > 0.35) return;
          soundCatalog.play('thunder_boom', 0.35 * this.computeEffectiveMasterGain());
        }, 7500);
        cleanups.push(() => window.clearInterval(timer));
        break;
      }

      default: {
        createNoiseLoop('lowpass', 300, 1.0, 0.3);
        break;
      }
    }

    return cleanups;
  }

  /**
   * Play a One-Click Soundboard Pad (combines studio OGG SFX + sculpted Web Audio transients)
   */
  public playSoundboardPad(padId: string, volume: number = 0.85, customUrl?: string) {
    const effectiveVol = volume * this.computeEffectiveMasterGain();
    if (effectiveVol <= 0.01) return;

    if (customUrl) {
      soundCatalog.play('generic_cast', customUrl);
      return;
    }

    const ctx = this.ensureContext();
    const now = ctx ? ctx.currentTime : 0;

    switch (padId) {
      case 'pad_door_creak': {
        // Creaking wooden hinges groan
        if (ctx && this.masterGain) {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(115, now);
          osc.frequency.linearRampToValueAtTime(165, now + 0.45);
          osc.frequency.linearRampToValueAtTime(92, now + 1.15);
          const lp = ctx.createBiquadFilter();
          lp.type = 'bandpass';
          lp.frequency.setValueAtTime(420, now);
          lp.Q.setValueAtTime(3.5, now);
          g.gain.setValueAtTime(0.01, now);
          g.gain.linearRampToValueAtTime(effectiveVol * 0.45, now + 0.15);
          g.gain.exponentialRampToValueAtTime(0.001, now + 1.25);
          osc.connect(lp);
          lp.connect(g);
          g.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 1.3);
        }
        break;
      }

      case 'pad_portcullis_slam': {
        soundCatalog.play('metal_clang', effectiveVol);
        soundCatalog.play('shield_clash', effectiveVol * 0.9);
        break;
      }

      case 'pad_secret_stone': {
        soundCatalog.play('wind_whoosh', effectiveVol * 0.6);
        if (ctx && this.masterGain) {
          const src = ctx.createBufferSource();
          src.buffer = this.getPinkNoiseBuffer(ctx);
          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.setValueAtTime(190, now);
          const g = ctx.createGain();
          g.gain.setValueAtTime(effectiveVol * 0.85, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
          src.connect(lp);
          lp.connect(g);
          g.connect(this.masterGain);
          src.start(now);
          src.stop(now + 1.65);
        }
        break;
      }

      case 'pad_lock_click':
      case 'pad_trap_click': {
        soundCatalog.play('metal_clang', effectiveVol * 0.65);
        if (ctx && this.masterGain) {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(padId === 'pad_trap_click' ? 980 : 1420, now);
          osc.frequency.exponentialRampToValueAtTime(240, now + 0.06);
          g.gain.setValueAtTime(effectiveVol * 0.6, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
          osc.connect(g);
          g.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 0.08);
        }
        break;
      }

      case 'pad_dart_volley': {
        soundCatalog.play('sword_slash', effectiveVol);
        setTimeout(() => soundCatalog.play('sword_slash', effectiveVol * 0.85), 110);
        setTimeout(() => soundCatalog.play('shield_clash', effectiveVol * 0.75), 220);
        break;
      }

      case 'pad_poison_gas': {
        soundCatalog.play('acid_burn', effectiveVol);
        soundCatalog.play('wind_whoosh', effectiveVol * 0.7);
        break;
      }

      case 'pad_collapse_rumble': {
        soundCatalog.play('thunder_boom', effectiveVol);
        soundCatalog.play('fire_explosion', effectiveVol * 0.75);
        break;
      }

      case 'pad_dragon_roar': {
        soundCatalog.play('fire_explosion', effectiveVol * 0.85);
        if (ctx && this.masterGain) {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(140, now);
          osc.frequency.exponentialRampToValueAtTime(52, now + 1.5);
          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.setValueAtTime(320, now);
          g.gain.setValueAtTime(effectiveVol * 0.75, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
          osc.connect(lp);
          lp.connect(g);
          g.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 1.65);
        }
        break;
      }

      case 'pad_undead_shriek': {
        soundCatalog.play('necrotic_drain', effectiveVol);
        soundCatalog.play('magic_whisper', effectiveVol);
        break;
      }

      case 'pad_war_horn': {
        if (ctx && this.masterGain) {
          [110, 164.81, 220].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq * 0.96, now);
            osc.frequency.linearRampToValueAtTime(freq, now + 0.25);
            const lp = ctx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.setValueAtTime(480, now);
            g.gain.setValueAtTime(0.001, now);
            g.gain.linearRampToValueAtTime((effectiveVol * 0.28) / (idx + 1), now + 0.3);
            g.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
            osc.connect(lp);
            lp.connect(g);
            g.connect(this.masterGain!);
            osc.start(now);
            osc.stop(now + 2.25);
          });
        }
        break;
      }

      case 'pad_steel_clash': {
        soundCatalog.play('sword_slash', effectiveVol);
        setTimeout(() => soundCatalog.play('metal_clang', effectiveVol), 140);
        setTimeout(() => soundCatalog.play('shield_clash', effectiveVol * 0.9), 290);
        break;
      }

      case 'pad_thunderclap': {
        soundCatalog.play('lightning_strike', effectiveVol);
        setTimeout(() => soundCatalog.play('thunder_boom', effectiveVol), 90);
        break;
      }

      case 'pad_crowd_cheer': {
        soundCatalog.play('radiant_burst', effectiveVol * 0.7);
        if (ctx && this.masterGain) {
          const src = ctx.createBufferSource();
          src.buffer = this.getPinkNoiseBuffer(ctx);
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.setValueAtTime(750, now);
          bp.Q.setValueAtTime(1.1, now);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.01, now);
          g.gain.linearRampToValueAtTime(effectiveVol * 0.65, now + 0.2);
          g.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
          src.connect(bp);
          bp.connect(g);
          g.connect(this.masterGain);
          src.start(now);
          src.stop(now + 1.85);
        }
        break;
      }

      case 'pad_ominous_bell': {
        soundCatalog.play('magic_bell', effectiveVol);
        if (ctx && this.masterGain) {
          [196, 392, 587.33].forEach((f, i) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, now);
            g.gain.setValueAtTime((effectiveVol * 0.35) / (i + 1), now);
            g.gain.exponentialRampToValueAtTime(0.0008, now + 2.6);
            osc.connect(g);
            g.connect(this.masterGain!);
            osc.start(now);
            osc.stop(now + 2.65);
          });
        }
        break;
      }

      case 'pad_arcane_portal': {
        soundCatalog.play('teleport_whoosh', effectiveVol);
        setTimeout(() => soundCatalog.play('eldritch_blast', effectiveVol * 0.8), 160);
        break;
      }

      default: {
        soundCatalog.play('generic_cast', effectiveVol);
        break;
      }
    }
  }
}

export const jukeboxAudioEngine = new JukeboxAudioEngine();
