import { useState, useEffect, useCallback } from 'react';
import { NarrationVoice, NARRATION_VOICES } from '../types';
import { generateTTS } from './aiService';
import { toast } from 'sonner';

export type { NarrationVoice };
export { NARRATION_VOICES };

/**
 * Resolves any voice identifier (id, display name, or Gemini prebuilt voice name)
 * to one of the 4 curated fantasy archetypes. Defaults to 'wizard' (Old Wizard).
 */
export function getNarrationVoice(voiceIdOrName?: string): NarrationVoice {
  if (!voiceIdOrName) return NARRATION_VOICES[0];
  const query = voiceIdOrName.toLowerCase().trim();

  const aliasMap: Record<string, string> = {
    henchman: 'villains_henchman',
    "villain's henchman": 'villains_henchman',
    'villians hencman': 'villains_henchman',
    boss: 'big_bad_boss',
    'big bad boss': 'big_bad_boss',
    'big bad boss guy': 'big_bad_boss',
    bbeg: 'big_bad_boss',
    'old wizard': 'wizard',
    elf: 'female_elf',
    'female elf': 'female_elf',
  };
  const targetId = aliasMap[query] || query;

  const found = NARRATION_VOICES.find(v =>
    v.id.toLowerCase() === targetId ||
    v.id.toLowerCase() === query ||
    v.name.toLowerCase() === query ||
    v.geminiVoice.toLowerCase() === query ||
    (v.elevenLabsVoiceId && v.elevenLabsVoiceId.toLowerCase() === query)
  );

  return found || NARRATION_VOICES[0];
}

/**
 * Converts raw PCM base64 or existing WAV base64 into a playable audio/wav Blob.
 * If the incoming stream lacks a RIFF header (typical 24kHz 16-bit Mono Linear PCM from Gemini),
 * a standard 44-byte RIFF/WAVE header is prepended to ensure reliable browser decoding.
 */
export function base64AudioToBlob(base64: string, sampleRate: number = 24000): Blob {
  const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
  const binaryString = atob(cleanBase64.replace(/\s/g, ''));
  const len = binaryString.length;

  // If MP3 formatted (ElevenLabs: ID3 tag or MPEG sync bytes 0xFF 0xFB/F3/F2)
  if (
    (len >= 3 && binaryString.slice(0, 3) === 'ID3') ||
    (len >= 2 && binaryString.charCodeAt(0) === 0xff && (binaryString.charCodeAt(1) & 0xe0) === 0xe0)
  ) {
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes.buffer], { type: 'audio/mpeg' });
  }

  // If already WAV formatted (has RIFF header)
  if (len >= 4 && binaryString.slice(0, 4) === 'RIFF') {
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes.buffer], { type: 'audio/wav' });
  }

  // Prepend standard 44-byte RIFF/WAVE header for 16-bit Mono Linear PCM
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const buffer = new ArrayBuffer(44 + len);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + len, true); // Chunk size
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1 size (16 for PCM)
  view.setUint16(20, 1, true); // Audio format (1 = PCM)
  view.setUint16(22, numChannels, true); // Mono = 1
  view.setUint32(24, sampleRate, true); // Sample rate (24000Hz)
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true); // 16 bits
  writeStr(36, 'data');
  view.setUint32(40, len, true); // Data size

  const bytes = new Uint8Array(buffer, 44);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export interface AudioNarrationState {
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  activeVoiceId: string | null;
  activeText: string | null;
  activeUrl: string | null;
}

export type NarrationListener = (state: AudioNarrationState) => void;

/**
 * Singleton service for managing unified audio narration across the entire app.
 * Guarantees that only one clip plays at a time and provides instant cancellation.
 */
class AudioNarrationService {
  private activeAudio: HTMLAudioElement | null = null;
  private activeUrl: string | null = null;
  private isPlaying = false;
  private isPaused = false;
  private isLoading = false;
  private activeVoiceId: string | null = null;
  private activeText: string | null = null;
  private listeners: Set<NarrationListener> = new Set();

  public getState(): AudioNarrationState {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      isLoading: this.isLoading,
      activeVoiceId: this.activeVoiceId,
      activeText: this.activeText,
      activeUrl: this.activeUrl,
    };
  }

  public subscribe(listener: NarrationListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((fn) => {
      try {
        fn(state);
      } catch (err) {
        console.error('[AudioNarration] Listener error:', err);
      }
    });
  }

  /**
   * Pauses the active audio playback.
   */
  public pause(): void {
    if (this.activeAudio && !this.activeAudio.paused) {
      try {
        this.activeAudio.pause();
      } catch {
        // ignore
      }
      this.isPlaying = false;
      this.isPaused = true;
      this.notify();
    }
  }

  /**
   * Resumes paused audio playback.
   */
  public resume(): void {
    if (this.activeAudio && this.activeAudio.paused && this.activeAudio.src) {
      try {
        this.activeAudio.play();
      } catch {
        // ignore
      }
      this.isPlaying = true;
      this.isPaused = false;
      this.notify();
    }
  }

  /**
   * Toggles play/pause for active audio.
   */
  public toggle(): void {
    if (this.isPlaying) {
      this.pause();
    } else if (this.isPaused) {
      this.resume();
    }
  }

  /**
   * Immediately stops any currently playing audio and releases object URLs.
   */
  public stop(): void {
    // Cancel browser speech synthesis if active
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }

    // Halt HTML5 Audio element
    if (this.activeAudio) {
      try {
        this.activeAudio.pause();
        this.activeAudio.currentTime = 0;
        this.activeAudio.src = '';
        this.activeAudio.load();
      } catch {
        // ignore
      }
      this.activeAudio = null;
    }

    // Revoke object URL
    if (this.activeUrl) {
      try {
        URL.revokeObjectURL(this.activeUrl);
      } catch {
        // ignore
      }
      this.activeUrl = null;
    }

    this.isPlaying = false;
    this.isPaused = false;
    this.isLoading = false;
    this.activeVoiceId = null;
    this.activeText = null;
    this.notify();
  }

  /**
   * Generates TTS and plays audio using the specified voice archetype.
   * Automatically stops any prior audio playback.
   */
  public async play(params: {
    text: string;
    voiceId?: string;
    onStart?: () => void;
    onEnded?: () => void;
    onError?: (err: any) => void;
  }): Promise<string> {
    const { text, voiceId, onStart, onEnded, onError } = params;

    // Immediately stop any currently playing narration
    this.stop();

    // Clean markdown syntax and symbols
    const cleanText = (text || '')
      .replace(/[*#_`>~]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .trim();

    if (!cleanText) {
      return '';
    }

    const voice = getNarrationVoice(voiceId);

    try {
      this.isLoading = true;
      this.isPlaying = true;
      this.activeVoiceId = voice.id;
      this.activeText = cleanText;
      this.notify();

      let base64Audio: string | null = null;
      try {
        base64Audio = await generateTTS(cleanText, voice.geminiVoice, voice.elevenLabsVoiceId);
      } catch (apiErr: any) {
        console.warn('[AudioNarration] Voice API error/quota depleted, activating offline speech synthesis:', apiErr?.message);
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          toast.info('Using offline speech synthesis (Voice API credit/quota limit)');
          return this.playSynthesisFallback(cleanText, voice, onStart, onEnded, onError);
        }
        throw apiErr;
      }

      if (!base64Audio) {
        throw new Error('No audio returned from model');
      }

      const blob = base64AudioToBlob(base64Audio, 24000);
      const audioUrl = URL.createObjectURL(blob);
      this.activeUrl = audioUrl;

      const audio = new Audio();
      this.activeAudio = audio;
      audio.src = audioUrl;

      // When ElevenLabs MPEG audio is returned, keep native studio fidelity and natural pitch
      const isMpeg = blob.type === 'audio/mpeg';
      if (isMpeg) {
        audio.playbackRate = 1.0;
        audio.preservesPitch = true;
      } else {
        // Apply pitch / tempo modulation for Gemini / synth
        (audio as any).preservesPitch = false;
        (audio as any).mozPreservesPitch = false;
        (audio as any).webkitPreservesPitch = false;
        audio.playbackRate = voice.playbackRate;
      }

      audio.onended = () => {
        this.stop();
        if (onEnded) onEnded();
      };

      audio.onerror = (e) => {
        console.error('[AudioNarration] Playback error:', e);
        this.stop();
        if (onError) onError(e);
      };

      this.isLoading = false;
      this.notify();

      await audio.play();
      if (onStart) onStart();

      return audioUrl;
    } catch (err: any) {
      console.error('[AudioNarration] Generation/playback error:', err);
      this.stop();
      if (onError) onError(err);
      throw err;
    }
  }

  /**
   * Seamless offline fallback using the browser Web Speech API
   * modulated to match the selected fantasy archetype.
   */
  private playSynthesisFallback(
    cleanText: string,
    voice: NarrationVoice,
    onStart?: () => void,
    onEnded?: () => void,
    onError?: (err: any) => void
  ): string {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.stop();
      if (onError) onError(new Error('Speech synthesis unsupported'));
      return '';
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);

      // Pitch and rate tailored to archetype
      if (voice.id === 'fiend') {
        utterance.pitch = 0.55;
        utterance.rate = 0.78;
      } else if (voice.id === 'wizard') {
        utterance.pitch = 0.75;
        utterance.rate = 0.85;
      } else if (voice.id === 'female_npc') {
        utterance.pitch = 1.15;
        utterance.rate = 0.98;
      } else {
        utterance.pitch = 0.92;
        utterance.rate = 0.95;
      }

      // Match system voice timbre if possible
      const sysVoices = window.speechSynthesis.getVoices();
      if (sysVoices && sysVoices.length > 0) {
        if (voice.id === 'female_npc') {
          const female = sysVoices.find(v => /female|woman|zira|samantha|victoria|karen/i.test(v.name));
          if (female) utterance.voice = female;
        } else {
          const male = sysVoices.find(v => /male|david|george|daniel/i.test(v.name));
          if (male) utterance.voice = male;
        }
      }

      utterance.onstart = () => {
        this.isLoading = false;
        this.isPlaying = true;
        this.notify();
        if (onStart) onStart();
      };

      utterance.onend = () => {
        this.stop();
        if (onEnded) onEnded();
      };

      utterance.onerror = (e) => {
        console.warn('[AudioNarration] Fallback speech error:', e);
        this.stop();
        if (onError) onError(e);
      };

      window.speechSynthesis.speak(utterance);
      return '';
    } catch (synthErr) {
      this.stop();
      if (onError) onError(synthErr);
      return '';
    }
  }
}

export const audioNarration = new AudioNarrationService();

/**
 * React hook for consuming narration state and controls with reactive updates.
 */
export function useAudioNarration() {
  const [state, setState] = useState<AudioNarrationState>(audioNarration.getState());

  useEffect(() => {
    return audioNarration.subscribe(setState);
  }, []);

  const play = useCallback((params: {
    text: string;
    voiceId?: string;
    onStart?: () => void;
    onEnded?: () => void;
    onError?: (err: any) => void;
  }) => {
    return audioNarration.play(params);
  }, []);

  const stop = useCallback(() => {
    audioNarration.stop();
  }, []);

  const pause = useCallback(() => {
    audioNarration.pause();
  }, []);

  const resume = useCallback(() => {
    audioNarration.resume();
  }, []);

  const toggle = useCallback(() => {
    audioNarration.toggle();
  }, []);

  return {
    ...state,
    play,
    stop,
    pause,
    resume,
    toggle,
    voices: NARRATION_VOICES,
  };
}
