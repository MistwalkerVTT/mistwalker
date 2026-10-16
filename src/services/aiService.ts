// Client-side AI service proxying through the server /api/ai endpoints

export function isValidGeminiKey(key?: string | null): boolean {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (trimmed.length < 15) return false;
  if (trimmed.includes('MY_GEMINI_API_KEY') || trimmed.includes('YOUR_API_KEY') || trimmed.includes('PLACEHOLDER')) return false;
  return true;
}

export function getStoredGeminiKey(): string {
  if (typeof window === 'undefined') return '';
  const key = localStorage.getItem('gemini_api_key') || '';
  return isValidGeminiKey(key) ? key : '';
}

export function setStoredGeminiKey(key: string): void {
  if (typeof window === 'undefined') return;
  if (!key || !isValidGeminiKey(key)) {
    localStorage.removeItem('gemini_api_key');
  } else {
    localStorage.setItem('gemini_api_key', key.trim());
  }
}

export async function checkApiKeyStatus(): Promise<{ hasKey: boolean; maskedKey: string | null }> {
  try {
    const localKey = getStoredGeminiKey();
    const headers: Record<string, string> = {};
    if (localKey && isValidGeminiKey(localKey)) headers['x-gemini-api-key'] = localKey;
    const res = await fetch('/api/ai/key-status', { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.hasKey) return data;
    }
    if (localKey && isValidGeminiKey(localKey)) {
      return {
        hasKey: true,
        maskedKey: localKey.slice(0, 4) + '...' + localKey.slice(-4)
      };
    }
    return { hasKey: false, maskedKey: null };
  } catch (e) {
    const localKey = getStoredGeminiKey();
    return {
      hasKey: !!localKey && isValidGeminiKey(localKey),
      maskedKey: (localKey && isValidGeminiKey(localKey)) ? localKey.slice(0, 4) + '...' + localKey.slice(-4) : null
    };
  }
}

export async function saveGeminiApiKey(apiKey: string): Promise<{ success: boolean; maskedKey: string }> {
  const clean = apiKey.trim();
  setStoredGeminiKey(clean);
  const res = await fetch('/api/ai/set-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: clean })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server returned ${res.status}`);
  }
  return await res.json();
}

export function isValidElevenLabsKey(key?: string | null): boolean {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (trimmed.length < 15) return false;
  if (trimmed.includes('YOUR_ELEVENLABS_KEY') || trimmed.includes('PLACEHOLDER')) return false;
  return true;
}

export function getStoredElevenLabsKey(): string {
  if (typeof window === 'undefined') return '';
  const key = localStorage.getItem('elevenlabs_api_key') || '';
  return isValidElevenLabsKey(key) ? key : '';
}

export function setStoredElevenLabsKey(key: string): void {
  if (typeof window === 'undefined') return;
  if (!key || !isValidElevenLabsKey(key)) {
    localStorage.removeItem('elevenlabs_api_key');
  } else {
    localStorage.setItem('elevenlabs_api_key', key.trim());
  }
}

export async function checkElevenLabsStatus(): Promise<{ hasKey: boolean; maskedKey: string | null }> {
  try {
    const localKey = getStoredElevenLabsKey();
    const headers: Record<string, string> = {};
    if (localKey && isValidElevenLabsKey(localKey)) headers['x-elevenlabs-api-key'] = localKey;
    const res = await fetch('/api/ai/elevenlabs-status', { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.hasKey) return data;
    }
    if (localKey && isValidElevenLabsKey(localKey)) {
      return {
        hasKey: true,
        maskedKey: localKey.slice(0, 4) + '...' + localKey.slice(-4)
      };
    }
    return { hasKey: false, maskedKey: null };
  } catch (e) {
    const localKey = getStoredElevenLabsKey();
    return {
      hasKey: !!localKey && isValidElevenLabsKey(localKey),
      maskedKey: (localKey && isValidElevenLabsKey(localKey)) ? localKey.slice(0, 4) + '...' + localKey.slice(-4) : null
    };
  }
}

export async function saveElevenLabsKey(apiKey: string): Promise<{ success: boolean; maskedKey: string }> {
  const clean = apiKey.trim();
  setStoredElevenLabsKey(clean);
  const res = await fetch('/api/ai/set-elevenlabs-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: clean })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server returned ${res.status}`);
  }
  return await res.json();
}

export function getAiHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const key = getStoredGeminiKey();
  if (key) {
    headers["x-gemini-api-key"] = key;
  }
  const elevenKey = getStoredElevenLabsKey();
  if (elevenKey) {
    headers["x-elevenlabs-api-key"] = elevenKey;
  }
  return headers;
}

export async function generateDescription(imageBase64: string): Promise<string> {
  try {
    const res = await fetch("/api/ai/describe", {
      method: "POST",
      headers: getAiHeaders(),
      body: JSON.stringify({ imageBase64 })
    });
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }
    const data = await res.json();
    return data.text || "The area reveals nothing of importance.";
  } catch (error: any) {
    console.error("generateDescription error:", error);
    return "The shadows conceal whatever secrets lie in this chamber.";
  }
}

export async function chatWithLore(
  history: { role: 'user' | 'model', parts: {text?: string, inlineData?: {mimeType: string, data: string}}[] }[],
  message: string,
  loreSources: { name: string, type: 'text' | 'pdf', content: string }[]
): Promise<string> {
  try {
    const res = await fetch("/api/ai/chat-lore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history, message, loreSources })
    });
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }
    const data = await res.json();
    return data.text || "The archives yield no answer.";
  } catch (error: any) {
    console.error("chatWithLore error:", error);
    return "The lore archives are currently inaccessible.";
  }
}

export async function generateTTS(text: string, voiceName: string = 'Charon', elevenLabsVoiceId?: string): Promise<string> {
  try {
    const res = await fetch("/api/ai/tts", {
      method: "POST",
      headers: getAiHeaders(),
      body: JSON.stringify({ text, voiceName, elevenLabsVoiceId })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server returned ${res.status}`);
    }
    const data = await res.json();
    if (data.audioBase64) {
      return data.audioBase64;
    }
    if (data.audio) {
      return data.audio;
    }
    throw new Error("No audio returned from TTS endpoint");
  } catch (error: any) {
    console.error("generateTTS error:", error);
    throw error;
  }
}

export async function generateVoiceScript(prompt: string, context?: string): Promise<string> {
  try {
    const res = await fetch("/api/ai/voice-script", {
      method: "POST",
      headers: getAiHeaders(),
      body: JSON.stringify({ prompt, context })
    });
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }
    const data = await res.json();
    return data.script || prompt;
  } catch (error: any) {
    console.error("generateVoiceScript error:", error);
    return prompt;
  }
}

export const dmTools = [
  {
    name: "move_token",
    description: "Move a token to a new X, Y coordinate. Remember the grid size (usually 50-100 pixels per 5ft).",
    parameters: {
      type: "OBJECT",
      properties: {
        id: { type: "STRING", description: "The ID of the token to move" },
        x: { type: "NUMBER" },
        y: { type: "NUMBER" },
        reason: { type: "STRING", description: "Narrative reason for moving" },
      },
      required: ["id", "x", "y"],
    },
  },
  {
    name: "add_effect",
    description: "Add a magic effect or spell to the map.",
    parameters: {
      type: "OBJECT",
      properties: {
        type: { type: "STRING", description: "Effect type: fireball, cone, lightning, breath, custom, etc." },
        color: { type: "STRING", description: "CSS color, e.g. 'rgba(239, 68, 68, 0.4)'" },
        x: { type: "NUMBER" },
        y: { type: "NUMBER" },
        size: { type: "NUMBER", description: "Pixel size (radius/length)." },
        rotation: { type: "NUMBER" },
      },
      required: ["type", "x", "y", "size"],
    },
  },
  {
    name: "update_hp",
    description: "Update the HP or status of a character.",
    parameters: {
      type: "OBJECT",
      properties: {
        id: { type: "STRING", description: "Token ID" },
        hpDelta: { type: "NUMBER", description: "Change in HP (negative for damage, positive for healing)" },
        status: { type: "STRING", description: "A status text to apply to the token" }
      },
      required: ["id", "hpDelta"]
    }
  },
  {
    name: "set_atmosphere",
    description: "Change the lighting and ambient sounds of the scene.",
    parameters: {
      type: "OBJECT",
      properties: {
        lighting: { type: "STRING", description: "CSS color or hex for overlay (e.g. '#1a1a2e' for night, '#ff7f50' for sunset)" },
        brightness: { type: "NUMBER", description: "Overall brightness from 0.2 to 1.5" },
        ambientSound: { 
          type: "STRING", 
          description: "Description of the sound to play" 
        },
        isRaining: { type: "BOOLEAN" },
        isFoggy: { type: "BOOLEAN" }
      },
      required: ["lighting", "brightness"]
    }
  },
  {
    name: "speak_as",
    description: "Make a specific character/token speak. This will use their assigned voice.",
    parameters: {
      type: "OBJECT",
      properties: {
        id: { type: "STRING", description: "The ID of the character speaking" },
        text: { type: "STRING", description: "The dialogue they speak" }
      },
      required: ["id", "text"]
    }
  }
];

export async function checkActionRules(
  actionDescription: string,
  turnState: { leveledSpellCast: boolean, bonusActionUsed: boolean, actionUsed: boolean, movementRemaining: number }
): Promise<{ allowed: boolean, reason: string }> {
  try {
    const res = await fetch("/api/ai/check-action", {
      method: "POST",
      headers: getAiHeaders(),
      body: JSON.stringify({ actionDescription, turnState })
    });
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }
    return await res.json();
  } catch (error: any) {
    console.error("checkActionRules error:", error);
    return { allowed: true, reason: "Rules engine unavailable, proceeding with DM discretion." };
  }
}

export async function chatWithAutoDM(
  history: { role: 'user' | 'model', parts: any[] }[],
  mapStateText: string
): Promise<{ text: string, functionCalls: any[] }> {
  try {
    const res = await fetch("/api/ai/auto-dm", {
      method: "POST",
      headers: getAiHeaders(),
      body: JSON.stringify({ history, mapStateText })
    });
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }
    return await res.json();
  } catch (error: any) {
    console.error("chatWithAutoDM error:", error);
    return { text: "The DM considers the next move silently.", functionCalls: [] };
  }
}

import { ChapterPdfDigest } from '../types';

export interface DndChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp?: number;
  mode?: 'golden_vault' | 'vecna' | 'rules' | 'dm_copilot';
}

export async function chatWithDndBot(
  history: DndChatMessage[],
  message: string,
  mode: 'golden_vault' | 'vecna' | 'rules' | 'dm_copilot' = 'golden_vault',
  model: 'gemini-2.5-flash' | 'gemini-3.8-flash' | 'gemini-3.5-flash' | 'gemini-3.1-flash-lite' | string = 'gemini-2.5-flash',
  extraContext?: string,
  chapterDigest?: ChapterPdfDigest | null
): Promise<{ text: string; model: string; mode: string }> {
  try {
    const res = await fetch("/api/ai/dnd-chat", {
      method: "POST",
      headers: getAiHeaders(),
      body: JSON.stringify({
        history: history.map(h => ({ role: h.role, text: h.text })),
        message,
        mode,
        model,
        extraContext,
        chapterDigest
      })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status})`);
    }
    return await res.json();
  } catch (error: any) {
    console.error("chatWithDndBot error:", error);
    throw error;
  }
}

export async function digestChapterPdf(params: {
  pdfPath?: string;
  pdfFilename?: string;
  chapterTitle: string;
  campaignTitle?: string;
  existingScenes?: Array<{ sceneId: string; sceneTitle: string; dmNotes?: string }>;
  textSnippet?: string;
}): Promise<ChapterPdfDigest> {
  const res = await fetch("/api/ai/digest-chapter-pdf", {
    method: "POST",
    headers: getAiHeaders(),
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Server error (${res.status}) while digesting PDF`);
  }
  const data = await res.json();
  return data.digest;
}

export async function generateEffectImage(params: {
  effectName: string;
  shape?: 'circle' | 'cone' | 'line';
  style?: string;
  color?: string;
  prompt?: string;
}): Promise<{ imageUrl: string; dataUrl?: string; engine?: string; prompt?: string }> {
  const res = await fetch("/api/ai/generate-effect-image", {
    method: "POST",
    headers: getAiHeaders(),
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Server error (${res.status}) while generating effect image`);
  }
  return await res.json();
}
