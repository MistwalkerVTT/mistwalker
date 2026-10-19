/**
 * Web Audio Procedural Sound Synthesizer for Spell Effects & VTT Audio
 * 100% Free, Zero-dependency, runs purely in-browser on Web Audio API.
 * Synthesizes cinematic RPG sound effects with zero latency and 0kb asset download.
 */

export type SpellSoundType =
  | 'explosion'
  | 'thunder'
  | 'lightning'
  | 'divine_chime'
  | 'ice_shatter'
  | 'whoosh'
  | 'dark_void'
  | 'teleport'
  | 'acid_sizzle'
  | 'radiant_ray'
  | 'shield_clash'
  | 'fire_whoosh';

class SpellSoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterVolume: number = 0.55;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  public getVolume(): number {
    return this.masterVolume;
  }

  /**
   * Play procedural sound effect by type
   */
  public play(type: SpellSoundType | string, customGain: number = 1.0) {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const gainNode = ctx.createGain();
    const finalVolume = this.masterVolume * customGain;
    gainNode.gain.setValueAtTime(finalVolume, ctx.currentTime);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
      case 'explosion':
        this.synthesizeExplosion(ctx, gainNode, now);
        break;
      case 'thunder':
        this.synthesizeThunder(ctx, gainNode, now);
        break;
      case 'lightning':
        this.synthesizeLightning(ctx, gainNode, now);
        break;
      case 'divine_chime':
        this.synthesizeDivineChime(ctx, gainNode, now);
        break;
      case 'ice_shatter':
        this.synthesizeIceShatter(ctx, gainNode, now);
        break;
      case 'whoosh':
      case 'fire_whoosh':
        this.synthesizeWhoosh(ctx, gainNode, now);
        break;
      case 'dark_void':
        this.synthesizeDarkVoid(ctx, gainNode, now);
        break;
      case 'teleport':
        this.synthesizeTeleport(ctx, gainNode, now);
        break;
      case 'acid_sizzle':
        this.synthesizeAcidSizzle(ctx, gainNode, now);
        break;
      case 'radiant_ray':
        this.synthesizeRadiantRay(ctx, gainNode, now);
        break;
      case 'shield_clash':
        this.synthesizeShieldClash(ctx, gainNode, now);
        break;
      default:
        this.synthesizeWhoosh(ctx, gainNode, now);
        break;
    }
  }

  // --- 1. EXPLOSION (Fireball, Meteor Swarm, Concussive Blast) ---
  private synthesizeExplosion(ctx: AudioContext, dest: GainNode, now: number) {
    // 1. Noise buffer for explosive blast
    const bufferSize = ctx.sampleRate * 1.8;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(45, now + 1.6);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(1.0, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.7);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(dest);

    // 2. Sub-bass punch oscillator (rumble)
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.8);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.9, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc.connect(oscGain);
    oscGain.connect(dest);

    whiteNoise.start(now);
    osc.start(now);
    whiteNoise.stop(now + 1.8);
    osc.stop(now + 1.3);
  }

  // --- 2. THUNDER (Thunderwave, Destructive Wave, Shatter) ---
  private synthesizeThunder(ctx: AudioContext, dest: GainNode, now: number) {
    const bufferSize = ctx.sampleRate * 2.2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    // Brown noise for deep heavy thunder rolling
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const brownNoise = ctx.createBufferSource();
    brownNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, now);
    filter.frequency.linearRampToValueAtTime(120, now + 0.3);
    filter.frequency.exponentialRampToValueAtTime(35, now + 2.1);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(1.0, now + 0.05); // sharp crack
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.1);

    brownNoise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    brownNoise.start(now);
    brownNoise.stop(now + 2.2);
  }

  // --- 3. LIGHTNING (Lightning Bolt, Shocking Grasp, Chain Lightning) ---
  private synthesizeLightning(ctx: AudioContext, dest: GainNode, now: number) {
    // High-voltage electric buzz + snap
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(110, now + 0.4);

    const osc2 = ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(440, now);
    osc2.frequency.setValueAtTime(780, now + 0.05);
    osc2.frequency.exponentialRampToValueAtTime(60, now + 0.5);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(1.0, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.55);
    osc2.stop(now + 0.55);

    // Follow with thunder rumble
    this.synthesizeThunder(ctx, dest, now + 0.08);
  }

  // --- 4. DIVINE CHIME (Cure Wounds, Healing Word, Bless, Spirit Guardians) ---
  private synthesizeDivineChime(ctx: AudioContext, dest: GainNode, now: number) {
    const freqs = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C major celestial chord (C5, E5, G5, C6, E6)
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      const oscGain = ctx.createGain();
      const delay = idx * 0.04;
      oscGain.gain.setValueAtTime(0.001, now + delay);
      oscGain.gain.linearRampToValueAtTime(0.3 / (idx + 1), now + delay + 0.03);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 2.2);

      osc.connect(oscGain);
      oscGain.connect(dest);

      osc.start(now + delay);
      osc.stop(now + delay + 2.3);
    });
  }

  // --- 5. ICE SHATTER (Cone of Cold, Ray of Frost, Ice Storm) ---
  private synthesizeIceShatter(ctx: AudioContext, dest: GainNode, now: number) {
    // High-pitched crystalline resonant clicks
    for (let i = 0; i < 4; i++) {
      const clickOsc = ctx.createOscillator();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(1800 + i * 450, now + i * 0.04);
      clickOsc.frequency.exponentialRampToValueAtTime(400, now + i * 0.04 + 0.15);

      const clickGain = ctx.createGain();
      clickGain.gain.setValueAtTime(0.4, now + i * 0.04);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.18);

      clickOsc.connect(clickGain);
      clickGain.connect(dest);

      clickOsc.start(now + i * 0.04);
      clickOsc.stop(now + i * 0.04 + 0.2);
    }

    // Freezing arctic wind whoosh
    const bufferSize = ctx.sampleRate * 1.2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.setValueAtTime(3.0, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 1.1);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(dest);

    noise.start(now);
    noise.stop(now + 1.2);
  }

  // --- 6. WHOOSH / FIRE WHOOSH (Fire Bolt, Projectiles, Burning Hands) ---
  private synthesizeWhoosh(ctx: AudioContext, dest: GainNode, now: number) {
    const bufferSize = ctx.sampleRate * 0.8;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(250, now);
    filter.frequency.exponentialRampToValueAtTime(1400, now + 0.25);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.75);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.7, now + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.78);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    noise.start(now);
    noise.stop(now + 0.8);
  }

  // --- 7. DARK VOID (Darkness, Shadow Grasp, Necrotic, Hex) ---
  private synthesizeDarkVoid(ctx: AudioContext, dest: GainNode, now: number) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.linearRampToValueAtTime(45, now + 1.2);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(98, now); // 3Hz beating dissonance
    osc2.frequency.linearRampToValueAtTime(47, now + 1.2);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.65, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 1.9);
    osc2.stop(now + 1.9);
  }

  // --- 8. TELEPORT (Misty Step, Dimension Door, Arcane Gate) ---
  private synthesizeTeleport(ctx: AudioContext, dest: GainNode, now: number) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.35);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(now);
    osc.stop(now + 0.7);

    // High shimmer burst
    const chime = ctx.createOscillator();
    chime.type = 'triangle';
    chime.frequency.setValueAtTime(1760, now + 0.2);
    chime.frequency.exponentialRampToValueAtTime(3520, now + 0.5);

    const chimeGain = ctx.createGain();
    chimeGain.gain.setValueAtTime(0.001, now + 0.2);
    chimeGain.gain.linearRampToValueAtTime(0.35, now + 0.25);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    chime.connect(chimeGain);
    chimeGain.connect(dest);

    chime.start(now + 0.2);
    chime.stop(now + 0.85);
  }

  // --- 9. ACID SIZZLE (Acid Pool, Melf's Acid Arrow, Vitriolic Sphere) ---
  private synthesizeAcidSizzle(ctx: AudioContext, dest: GainNode, now: number) {
    const bufferSize = ctx.sampleRate * 1.5;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2800, now);
    filter.Q.setValueAtTime(6.0, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    noise.start(now);
    noise.stop(now + 1.5);
  }

  // --- 10. RADIANT RAY (Guiding Bolt, Sunbeam, Moonbeam) ---
  private synthesizeRadiantRay(ctx: AudioContext, dest: GainNode, now: number) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, now); // E5
    osc.frequency.linearRampToValueAtTime(1318.51, now + 0.4); // E6

    const overtone = ctx.createOscillator();
    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(987.77, now); // B5 (harmonic fifth)
    overtone.frequency.linearRampToValueAtTime(1975.53, now + 0.4);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

    osc.connect(gain);
    overtone.connect(gain);
    gain.connect(dest);

    osc.start(now);
    overtone.start(now);
    osc.stop(now + 1.35);
    overtone.stop(now + 1.35);
  }

  // --- 11. SHIELD CLASH (Shield spell, Sanctuary, Mage Armor) ---
  private synthesizeShieldClash(ctx: AudioContext, dest: GainNode, now: number) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(293.66, now + 0.6);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(now);
    osc.stop(now + 0.95);
  }
}

export const spellSoundEngine = new SpellSoundEngine();
