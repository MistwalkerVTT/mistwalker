// src/effects/db/soundCatalog.ts
// Pure Web Audio API synthesized procedural sound engine for MistWalker 4.0

export type SoundEffectType =
  | 'fire_explosion'
  | 'fire_whoosh'
  | 'lightning_strike'
  | 'cold_frost'
  | 'eldritch_blast'
  | 'radiant_burst'
  | 'necrotic_pulse'
  | 'wind_gust'
  | 'water_splash'
  | 'shield_clash'
  | 'divine_chime'
  | 'teleport'
  | 'acid_burn'
  | 'generic_cast';

class EffectsSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.25, this.ctx.currentTime); // Safe default volume
        this.masterGain.connect(this.ctx.destination);
      }
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.25, this.ctx.currentTime);
    }
  }

  public play(type: SoundEffectType | string, customUrl?: string) {
    if (this.isMuted) return;

    // 1. Play custom audio file if provided
    if (customUrl && typeof Audio !== 'undefined') {
      try {
        const audio = new Audio(customUrl);
        audio.volume = 0.3;
        audio.play().catch(() => {});
        return;
      } catch (e) {}
    }

    // 2. Synthesize procedural sound with Web Audio API
    try {
      this.init();
      if (!this.ctx || !this.masterGain) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      const t = this.ctx.currentTime;
      switch (type) {
        case 'fire_explosion': {
          // Low boom + noise blast
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(140, t);
          osc.frequency.exponentialRampToValueAtTime(30, t + 0.6);
          gain.gain.setValueAtTime(0.8, t);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(t);
          osc.stop(t + 0.65);
          break;
        }

        case 'lightning_strike': {
          // Rapid high pitch crack down to zap
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(800, t);
          osc.frequency.exponentialRampToValueAtTime(80, t + 0.35);
          gain.gain.setValueAtTime(0.7, t);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(t);
          osc.stop(t + 0.4);
          break;
        }

        case 'eldritch_blast': {
          // Punchy cosmic zap + sweep
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(450, t);
          osc.frequency.exponentialRampToValueAtTime(70, t + 0.45);
          gain.gain.setValueAtTime(0.75, t);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.45);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(t);
          osc.stop(t + 0.5);
          break;
        }

        case 'cold_frost':
        case 'wind_gust': {
          // Sweeping low-pass whoosh
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(320, t);
          osc.frequency.linearRampToValueAtTime(180, t + 0.5);
          gain.gain.setValueAtTime(0.4, t);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(t);
          osc.stop(t + 0.55);
          break;
        }

        case 'radiant_burst':
        case 'divine_chime': {
          // Dual crystal bell chime
          [587.33, 880].forEach((freq) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.4, t);
            gain.gain.exponentialRampToValueAtTime(0.005, t + 0.8);
            osc.connect(gain);
            gain.connect(this.masterGain!);
            osc.start(t);
            osc.stop(t + 0.85);
          });
          break;
        }

        case 'teleport': {
          // Upward pitch warp
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(150, t);
          osc.frequency.exponentialRampToValueAtTime(900, t + 0.35);
          gain.gain.setValueAtTime(0.5, t);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(t);
          osc.stop(t + 0.4);
          break;
        }

        case 'shield_clash': {
          // Metallic resonance
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(340, t);
          osc.frequency.exponentialRampToValueAtTime(120, t + 0.25);
          gain.gain.setValueAtTime(0.5, t);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(t);
          osc.stop(t + 0.3);
          break;
        }

        default: {
          // Generic magical whoosh
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(260, t);
          osc.frequency.exponentialRampToValueAtTime(90, t + 0.3);
          gain.gain.setValueAtTime(0.5, t);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(t);
          osc.stop(t + 0.35);
          break;
        }
      }
    } catch (e) {
      // Audio playback fails gracefully without throwing
    }
  }
}

export const soundCatalog = new EffectsSoundEngine();
