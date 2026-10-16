import "dotenv/config";
import express from "express";
import { GoogleGenAI, createPartFromUri } from "@google/genai";
import { generateCinematicBattlemap } from "./proceduralMapEngine";
import fs from "fs";
import path from "path";

export const aiRouter = express.Router();
aiRouter.use(express.json({ limit: "50mb" }));

// Helper to validate whether a key is real and not a template placeholder
function isValidGeminiKey(key?: string | null): boolean {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (trimmed.length < 15) return false;
  if (trimmed.includes('MY_GEMINI_API_KEY') || trimmed.includes('YOUR_API_KEY') || trimmed.includes('PLACEHOLDER')) return false;
  return true;
}

function isValidElevenLabsKey(key?: string | null): boolean {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (trimmed.length < 15) return false;
  if (trimmed.includes('YOUR_ELEVENLABS_KEY') || trimmed.includes('PLACEHOLDER')) return false;
  return true;
}

// Multi-key failover pool for Gemini API
let activeKeyPool: string[] = [];
let currentPoolIndex = 0;

export function initGeminiKeyPool(): string[] {
  const pool: string[] = [];

  // 1. Primary key starts first (for billing)
  const primary = (currentApiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || "").trim();
  if (isValidGeminiKey(primary)) {
    pool.push(primary);
  }

  // 2. Fallback keys from environment
  const fallbackEnv = (process.env.GEMINI_FALLBACK_KEYS || "").trim();
  const candidates = fallbackEnv ? fallbackEnv.split(",") : [];

  for (const c of candidates) {
    const clean = c.trim();
    if (isValidGeminiKey(clean) && !pool.includes(clean)) {
      pool.push(clean);
    }
  }

  activeKeyPool = pool;
  return activeKeyPool;
}

// Helper to detect quota / prepayment / rate-limit exhaustion or temporary 503 high demand spikes
function isQuotaOrBillingError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || "").toLowerCase();
  const status = err.status || err.code || err.statusCode;

  if (status === 402 || status === 429 || status === 403 || status === 503) return true;

  if (
    msg.includes("402") ||
    msg.includes("429") ||
    msg.includes("503") ||
    msg.includes("unavailable") ||
    msg.includes("high demand") ||
    msg.includes("spikes in demand") ||
    msg.includes("resource_exhausted") ||
    msg.includes("depleted") ||
    msg.includes("prepayment") ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("rate_limit") ||
    msg.includes("credits") ||
    msg.includes("billing")
  ) {
    return true;
  }

  try {
    const parsed = JSON.parse(err.message);
    if (
      parsed?.error?.code === 402 ||
      parsed?.error?.code === 429 ||
      parsed?.error?.code === 503 ||
      parsed?.error?.status === "RESOURCE_EXHAUSTED" ||
      parsed?.error?.status === "UNAVAILABLE"
    ) {
      return true;
    }
  } catch {}

  return false;
}

// Lazy init GoogleGenAI instance on the server
let aiClient: GoogleGenAI | null = null;
let currentApiKey: string | null = (process.env.GEMINI_API_KEY && isValidGeminiKey(process.env.GEMINI_API_KEY)) 
  ? process.env.GEMINI_API_KEY 
  : ((process.env.API_KEY && isValidGeminiKey(process.env.API_KEY)) ? process.env.API_KEY : null);

let currentElevenLabsApiKey: string | null = (process.env.ELEVENLABS_API_KEY && isValidElevenLabsKey(process.env.ELEVENLABS_API_KEY))
  ? process.env.ELEVENLABS_API_KEY
  : ((process.env.XI_API_KEY && isValidElevenLabsKey(process.env.XI_API_KEY)) ? process.env.XI_API_KEY : null);

export function getAI(overrideKey?: string): GoogleGenAI {
  if (overrideKey && isValidGeminiKey(overrideKey)) {
    return new GoogleGenAI({ apiKey: overrideKey });
  }

  if (activeKeyPool.length === 0) {
    initGeminiKeyPool();
  }

  const primaryKey = activeKeyPool[currentPoolIndex] || activeKeyPool[0];
  if (!primaryKey) {
    throw new Error("GEMINI_API_KEY is not configured. Please load your Gemini API Key in the AI Dungeon Master Menu.");
  }

  const baseClient = new GoogleGenAI({ apiKey: primaryKey });

  // Proxy interceptor to provide seamless automatic key rotation on quota exhaustion
  return new Proxy(baseClient, {
    get(target, prop, receiver) {
      if (prop === "models") {
        const modelsTarget = target.models;
        return new Proxy(modelsTarget, {
          get(mTarget, mProp) {
            if (mProp === "generateContent") {
              return async (...args: any[]) => {
                let lastError: any = null;
                const pool = activeKeyPool.length > 0 ? activeKeyPool : initGeminiKeyPool();
                const startIndex = currentPoolIndex;

                for (let attempt = 0; attempt < pool.length; attempt++) {
                  const keyIdx = (startIndex + attempt) % pool.length;
                  const keyToUse = pool[keyIdx];
                  const client = new GoogleGenAI({ apiKey: keyToUse });

                  try {
                    const result = await client.models.generateContent(...(args as [any]));
                    if (currentPoolIndex !== keyIdx) {
                      console.log(
                        `[AI Key Pool] Automatically switched to active Gemini key #${keyIdx + 1} (${keyToUse.slice(0, 4)}...${keyToUse.slice(-4)})`
                      );
                      currentPoolIndex = keyIdx;
                      currentApiKey = keyToUse;
                    }
                    return result;
                  } catch (err: any) {
                    lastError = err;
                    if (isQuotaOrBillingError(err) && pool.length > 1) {
                      console.warn(
                        `[AI Key Failover] Gemini Key #${keyIdx + 1} (${keyToUse.slice(0, 4)}...${keyToUse.slice(-4)}) quota/billing exhausted. Automatically rolling over to next key...`
                      );
                      continue;
                    }
                    throw err;
                  }
                }
                throw lastError;
              };
            }
            if (mProp === "generateImages") {
              return async (...args: any[]) => {
                let lastError: any = null;
                const pool = activeKeyPool.length > 0 ? activeKeyPool : initGeminiKeyPool();
                const startIndex = currentPoolIndex;

                for (let attempt = 0; attempt < pool.length; attempt++) {
                  const keyIdx = (startIndex + attempt) % pool.length;
                  const keyToUse = pool[keyIdx];
                  const client = new GoogleGenAI({ apiKey: keyToUse });

                  try {
                    const result = await (client.models as any).generateImages(...(args as [any]));
                    if (currentPoolIndex !== keyIdx) {
                      console.log(
                        `[AI Key Pool] Automatically switched to active Gemini key #${keyIdx + 1} (${keyToUse.slice(0, 4)}...${keyToUse.slice(-4)})`
                      );
                      currentPoolIndex = keyIdx;
                      currentApiKey = keyToUse;
                    }
                    return result;
                  } catch (err: any) {
                    lastError = err;
                    if (isQuotaOrBillingError(err) && pool.length > 1) {
                      console.warn(
                        `[AI Key Failover] Gemini Key #${keyIdx + 1} quota exhausted on generateImages. Trying next key...`
                      );
                      continue;
                    }
                    throw err;
                  }
                }
                throw lastError;
              };
            }
            return Reflect.get(mTarget, mProp);
          }
        });
      }

      if (prop === "interactions") {
        const interTarget = target.interactions;
        return new Proxy(interTarget, {
          get(iTarget, iProp) {
            if (iProp === "create") {
              return async (...args: any[]) => {
                let lastError: any = null;
                const pool = activeKeyPool.length > 0 ? activeKeyPool : initGeminiKeyPool();
                const startIndex = currentPoolIndex;

                for (let attempt = 0; attempt < pool.length; attempt++) {
                  const keyIdx = (startIndex + attempt) % pool.length;
                  const keyToUse = pool[keyIdx];
                  const client = new GoogleGenAI({ apiKey: keyToUse });

                  try {
                    const result = await client.interactions.create(...(args as [any, any?]));
                    if (currentPoolIndex !== keyIdx) {
                      currentPoolIndex = keyIdx;
                      currentApiKey = keyToUse;
                    }
                    return result;
                  } catch (err: any) {
                    lastError = err;
                    if (isQuotaOrBillingError(err) && pool.length > 1) {
                      console.warn(
                        `[AI Key Failover] Gemini Key #${keyIdx + 1} (${keyToUse.slice(0, 4)}...${keyToUse.slice(-4)}) quota exhausted on interaction. Trying next key...`
                      );
                      continue;
                    }
                    throw err;
                  }
                }
                throw lastError;
              };
            }
            return Reflect.get(iTarget, iProp);
          }
        });
      }

      return Reflect.get(target, prop, receiver);
    }
  });
}

/**
 * Resilient generateContent helper that attempts stable, high-throughput models
 * and automatically cascades to backup models if a model suffers temporary 503 spikes or deprecations.
 */
export async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
    preferredModel?: string;
  }
) {
  const modelsToTry = [
    params.preferredModel || "gemini-3.5-flash",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
    "gemini-3-flash-preview",
    "gemini-2.5-flash"
  ];
  const uniqueModels = [...new Set(modelsToTry)];


  let lastError: any = null;
  for (const model of uniqueModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const msg = (err.message || "").toLowerCase();
      const isDemandSpike = (err.status === 503) || msg.includes("503") || msg.includes("high demand") || msg.includes("unavailable") || msg.includes("not found") || msg.includes("no longer available");
      console.warn(`[AI Model Fallback] Model "${model}" failed (${isDemandSpike ? '503 High Demand / Unavailable' : err.message?.slice(0, 100)}). Trying next fallback model...`);
    }
  }
  throw lastError;
}

// Middleware to auto-capture client-provided API keys from headers
aiRouter.use((req, res, next) => {
  const headerKey = req.headers["x-gemini-api-key"] as string | undefined;
  if (headerKey && isValidGeminiKey(headerKey)) {
    const cleanKey = headerKey.trim();
    if (cleanKey !== currentApiKey) {
      currentApiKey = cleanKey;
      process.env.GEMINI_API_KEY = cleanKey;
      if (!activeKeyPool.includes(cleanKey)) {
        activeKeyPool = [cleanKey, ...activeKeyPool];
        currentPoolIndex = 0;
      }
    }
  }

  const elevenHeader = req.headers["x-elevenlabs-api-key"] as string | undefined;
  if (elevenHeader && isValidElevenLabsKey(elevenHeader)) {
    const cleanEleven = elevenHeader.trim();
    if (cleanEleven !== currentElevenLabsApiKey) {
      currentElevenLabsApiKey = cleanEleven;
      process.env.ELEVENLABS_API_KEY = cleanEleven;
    }
  }

  next();
});

// GET /api/ai/key-status - Check if a Gemini API key is currently active
aiRouter.get("/key-status", (req, res) => {
  if (activeKeyPool.length === 0) initGeminiKeyPool();
  const key = currentApiKey || activeKeyPool[currentPoolIndex] || activeKeyPool[0];
  if (isValidGeminiKey(key)) {
    const trimmed = key!.trim();
    const masked = trimmed.slice(0, 4) + "..." + trimmed.slice(-4);
    return res.json({
      hasKey: true,
      maskedKey: masked,
      poolCount: activeKeyPool.length,
      activeKeyIndex: currentPoolIndex + 1
    });
  }
  return res.json({ hasKey: false, maskedKey: null, poolCount: 0 });
});

// POST /api/ai/set-key - Set and persist the Gemini API key
aiRouter.post("/set-key", (req, res) => {
  try {
    const { apiKey } = req.body || {};
    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 8) {
      return res.status(400).json({ error: "Invalid API key format. Expected a valid Gemini API key." });
    }
    const cleanKey = apiKey.trim();
    currentApiKey = cleanKey;
    process.env.GEMINI_API_KEY = cleanKey;
    activeKeyPool = [cleanKey, ...activeKeyPool.filter((k) => k !== cleanKey)];
    currentPoolIndex = 0;

    // Persist to .env file in root so it survives server restarts
    try {
      const envPath = path.join(process.cwd(), ".env");
      let envContent = "";
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, "utf8");
        if (envContent.includes("GEMINI_API_KEY=")) {
          envContent = envContent.replace(/GEMINI_API_KEY=.*(\r?\n|$)/g, `GEMINI_API_KEY="${cleanKey}"$1`);
        } else {
          envContent += `\nGEMINI_API_KEY="${cleanKey}"\n`;
        }
      } else {
        envContent = `GEMINI_API_KEY="${cleanKey}"\nAPP_URL="http://localhost:3000"\n`;
      }
      fs.writeFileSync(envPath, envContent.trim() + "\n", "utf8");
      console.log(`[AI Server] Updated GEMINI_API_KEY in .env file successfully.`);
    } catch (fsErr: any) {
      console.warn(`[AI Server] Could not persist key to .env:`, fsErr.message);
    }

    res.json({ success: true, maskedKey: cleanKey.slice(0, 4) + "..." + cleanKey.slice(-4) });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to set Gemini API key" });
  }
});

// GET /api/ai/elevenlabs-status - Check if an ElevenLabs API key is currently active
aiRouter.get("/elevenlabs-status", (req, res) => {
  const key = currentElevenLabsApiKey || (isValidElevenLabsKey(process.env.ELEVENLABS_API_KEY) ? process.env.ELEVENLABS_API_KEY : null);
  if (isValidElevenLabsKey(key)) {
    const trimmed = key!.trim();
    const masked = trimmed.slice(0, 4) + "..." + trimmed.slice(-4);
    return res.json({ hasKey: true, maskedKey: masked });
  }
  return res.json({ hasKey: false, maskedKey: null });
});

// POST /api/ai/set-elevenlabs-key - Set and persist the ElevenLabs API key
aiRouter.post("/set-elevenlabs-key", (req, res) => {
  try {
    const { apiKey } = req.body || {};
    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 8) {
      return res.status(400).json({ error: "Invalid ElevenLabs API key format." });
    }
    const cleanKey = apiKey.trim();
    currentElevenLabsApiKey = cleanKey;
    process.env.ELEVENLABS_API_KEY = cleanKey;

    // Persist to .env file in root
    try {
      const envPath = path.join(process.cwd(), ".env");
      let envContent = "";
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, "utf8");
        if (envContent.includes("ELEVENLABS_API_KEY=")) {
          envContent = envContent.replace(/ELEVENLABS_API_KEY=.*(\r?\n|$)/g, `ELEVENLABS_API_KEY="${cleanKey}"$1`);
        } else {
          envContent += `\nELEVENLABS_API_KEY="${cleanKey}"\n`;
        }
      } else {
        envContent = `ELEVENLABS_API_KEY="${cleanKey}"\n`;
      }
      fs.writeFileSync(envPath, envContent.trim() + "\n", "utf8");
      console.log(`[AI Server] Updated ELEVENLABS_API_KEY in .env file successfully.`);
    } catch (fsErr) {
      console.warn(`[AI Server] Could not write .env file:`, fsErr);
    }

    const masked = cleanKey.slice(0, 4) + "..." + cleanKey.slice(-4);
    return res.json({ success: true, maskedKey: masked });
  } catch (err: any) {
    console.error("[AI Server] Error setting ElevenLabs key:", err);
    return res.status(500).json({ error: err.message || "Failed to set ElevenLabs key" });
  }
});

/**
 * Universal helper to resolve image data (data URI, local /uploads/ file path, or remote URL)
 * into Gemini SDK inlineData format for multimodal vision.
 */
async function resolveImageToInlineData(imageInput: string): Promise<{ inlineData: { mimeType: string; data: string } } | { fileData: { fileUri: string; mimeType: string } } | null> {
  if (!imageInput || typeof imageInput !== "string") return null;

  // 1. Base64 Data URI
  if (imageInput.startsWith("data:")) {
    const match = imageInput.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      return {
        inlineData: {
          mimeType: match[1],
          data: match[2]
        }
      };
    }
  }

  // 2. Relative Local /uploads/ or custom file path
  if (imageInput.startsWith("/uploads/") || imageInput.startsWith("uploads/") || imageInput.startsWith("./uploads/")) {
    try {
      const cleanPath = imageInput.replace(/^\.?\//, "");
      const fullPath = path.join(process.cwd(), cleanPath);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        let mimeType = "image/jpeg";
        if (fullPath.endsWith(".png")) mimeType = "image/png";
        else if (fullPath.endsWith(".webp")) mimeType = "image/webp";
        else if (fullPath.endsWith(".gif")) mimeType = "image/gif";
        else if (fullPath.endsWith(".svg")) mimeType = "image/svg+xml";
        else if (fullPath.endsWith(".pdf")) mimeType = "application/pdf";

        // Gemini inlineData payload is capped at 20MB. For larger files (like campaign PDFs), use the Files API.
        if (stats.size > 20 * 1024 * 1024) {
          console.log(`[resolveImageToInlineData] File ${fullPath} is ${(stats.size / (1024 * 1024)).toFixed(1)}MB (> 20MB inline limit). Uploading via Gemini Files API...`);
          const ai = getAI();
          const uploadResult = await ai.files.upload({
            file: fullPath,
            config: { mimeType }
          });
          return createPartFromUri(uploadResult.uri, uploadResult.mimeType || mimeType) as any;
        }

        const buffer = fs.readFileSync(fullPath);
        return {
          inlineData: {
            mimeType,
            data: buffer.toString("base64")
          }
        };
      }
    } catch (err: any) {
      console.warn("[resolveImageToInlineData] Local file read error:", err.message);
    }
  }

  // 3. Absolute HTTP / HTTPS URL
  if (imageInput.startsWith("http://") || imageInput.startsWith("https://")) {
    try {
      const fetchRes = await fetch(imageInput);
      let mimeType = fetchRes.headers.get("content-type") || "image/jpeg";
      const arrayBuf = await fetchRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      return {
        inlineData: {
          mimeType,
          data: buffer.toString("base64")
        }
      };
    } catch (fetchErr: any) {
      console.warn("[resolveImageToInlineData] Remote URL fetch error:", fetchErr.message);
    }
  }

  // 4. Any other relative static path (e.g. /presets/..., /maps/...)
  if (imageInput.startsWith("/")) {
    try {
      const possiblePaths = [
        path.join(process.cwd(), imageInput.slice(1)),
        path.join(process.cwd(), "public", imageInput.slice(1)),
        path.join(process.cwd(), "dist", imageInput.slice(1))
      ];
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          const buffer = fs.readFileSync(p);
          let mimeType = "image/jpeg";
          if (p.endsWith(".png")) mimeType = "image/png";
          else if (p.endsWith(".webp")) mimeType = "image/webp";
          return {
            inlineData: {
              mimeType,
              data: buffer.toString("base64")
            }
          };
        }
      }
    } catch (err: any) {
      console.warn("[resolveImageToInlineData] Static path resolve error:", err.message);
    }
  }

  return null;
}

/**
 * Procedural battlemap generator for tactical battlemaps
 */
export function generateProceduralBattlemapSVG(
  biome: string = "forest",
  weather: string = "clear",
  timeOfDay: string = "noon"
): string {
  return generateCinematicBattlemap({ biome, weather, timeOfDay });
}

let hasImageGenerationQuota = false; // Free-tier Gemini keys have quota limit 0 for image models


/**
 * POST /api/ai/generate-map
 * Generates high-resolution realistic battlemaps using Nano Banana Pro (gemini-3-pro-image)
 * with comprehensive prompt crafting and in-depth DM cinematic dossier.
 */
aiRouter.post("/generate-map", async (req, res) => {
  const clientKey = (req.headers["x-gemini-api-key"] as string) || req.body?.apiKey;
  const {
    prompt,
    biome = "forest",
    weather = "clear",
    timeOfDay = "noon",
    seed: reqSeed,
    engine = "nano-banana-pro", // "nano-banana-pro" | "nano-banana-2" | "procedural"
    imageSize = "2K", // "1K" | "2K" | "4K"
    aspectRatio = "16:9", // "16:9" | "4:3" | "1:1"
    style = "photorealistic", // "photorealistic" | "dark-fantasy" | "ethereal" | "classic"
    mapSize = { width: 30, height: 20, label: "Medium (30x20)" }
  } = req.body || {};

  const gridW = typeof mapSize.width === 'number' && mapSize.width > 0 ? mapSize.width : 30;
  const gridH = typeof mapSize.height === 'number' && mapSize.height > 0 ? mapSize.height : 20;
  const sizeLabel = mapSize.label || `${gridW}x${gridH}`;

  const seed = reqSeed !== undefined && !isNaN(Number(reqSeed)) ? Number(reqSeed) : Math.floor(Math.random() * 1000000);

  let imageUrl: string | null = null;
  let sourceEngine = engine;
  let generationError: string | null = null;
  let requiresPaidKey = false;

  // Build high-resolution, realistic top-down battlemap prompt
  const styleDescriptions: Record<string, string> = {
    photorealistic: "Photorealistic realism, natural wet stone, detailed dirt paths, mossy boulders, weathered timber, realistic foliage, volumetric lighting, realistic soft cast shadows, 8K ultra detail.",
    "dark-fantasy": "Dark gritty fantasy aesthetic, ancient crumbling gothic masonry, brooding shadows, flickering torch sconces, atmospheric fog, dried bloodstains, ominous ambient lighting.",
    ethereal: "High fantasy ethereal atmosphere, bioluminescent mushrooms, crystal veins glowing softly, shimmering water reflections with caustics, vibrant otherworldly flora.",
    classic: "Detailed tabletop RPG battlemap aesthetic, crisp terrain boundaries, rich painted textures, clear tactical cover, vibrant natural lighting."
  };

  const styleText = styleDescriptions[style] || styleDescriptions.photorealistic;

  const realisticPrompt = `A top-down bird's-eye orthographic tabletop RPG battlemap of a ${biome} setting, perfectly flat 90-degree overhead perspective.
Time of day: ${timeOfDay}. Weather: ${weather}.
Style and Atmosphere: ${styleText}
Tactical Map Dimensions & Scale: ${gridW}x${gridH} grid squares (${gridW * 5} feet by ${gridH * 5} feet total playable area). Room scale, corridor width, and obstacle density must correspond realistically to this ${sizeLabel} encounter size.
${prompt ? `Custom Features & Landmarks: ${prompt}.` : ""}
Tactical requirements: Pure top-down orthographic angle for a D&D 5e miniature grid, zero isometric tilt, no angled 3D camera view, flat playable battlefield surface, highly detailed ground materials and terrain textures, no player character figures, no tokens, no UI, no text or watermarks. Ultra-high resolution, crystal clear tactical clarity.`;

  // Start image generation promise
  const generateImagePromise = (async () => {
    if (engine === "nano-banana-pro" || engine === "nano-banana-2") {
      const modelToUse = engine === "nano-banana-pro" ? "gemini-3-pro-image" : "gemini-3.1-flash-image";
      try {
        const ai = getAI(clientKey);
        const validAspect = ["16:9", "4:3", "1:1"].includes(aspectRatio) ? aspectRatio : "16:9";
        
        const imageConfig: any = {
          aspectRatio: validAspect
        };
        // gemini-3-pro-image supports 1K, 2K, 4K
        if (engine === "nano-banana-pro") {
          imageConfig.imageSize = imageSize === "4K" ? "4K" : imageSize === "1K" ? "1K" : "2K";
        }

        const aiImageRes = await ai.models.generateContent({
          model: modelToUse,
          contents: realisticPrompt,
          config: {
            imageConfig
          }
        });

        const parts = aiImageRes.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            const mime = part.inlineData.mimeType || "image/png";
            return {
              url: `data:${mime};base64,${part.inlineData.data}`,
              engine
            };
          }
        }
        throw new Error("No image data returned from model.");
      } catch (err: any) {
        console.warn(`[MapGen] ${modelToUse} failed:`, err.status || err.message);
        if (err.status === 429 || (err.message && (err.message.includes("quota") || err.message.includes("RESOURCE_EXHAUSTED")))) {
          requiresPaidKey = true;
        }
        generationError = err.message || "AI image generation error.";
        return null;
      }
    }
    return null;
  })();

  // Start DM briefing promise concurrently
  const generateBriefingPromise = (async () => {
    try {
      const ai = getAI(clientKey);
      const briefingPrompt = `You are a master D&D Dungeon Master crafting a cinematic scene introduction.
Generate an in-depth cinematic briefing for a tactical battlemap with the following attributes:
- Biome: ${biome}
- Weather: ${weather}
- Time of Day: ${timeOfDay}
${prompt ? `- Custom Scene Elements: ${prompt}` : ""}

Provide a valid JSON response matching this exact schema:
{
  "title": "A dramatic, atmospheric title for this location",
  "readAloud": "2 to 3 evocative paragraphs in second-person ('You step into...') for the DM to read aloud to the players upon entering. Sensory-rich, cinematic, and immersive.",
  "atmosphere": {
    "sounds": "Specific ambient sounds (e.g. rushing water, skittering claws, hollow wind)",
    "smells": "Scents in the air (e.g. damp moss, ozone, brimstone, decaying leaves)",
    "temperature": "How the air feels on exposed skin",
    "lighting": "Play of shadow and illumination across the terrain"
  },
  "tacticalHazards": [
    {
      "name": "Environmental Hazard or Cover",
      "description": "Tactical mechanics and interactions",
      "check": "Relevant DC check (e.g. DC 13 Athletics or DC 14 Perception)"
    },
    {
      "name": "Strategic Chokepoint or Vantage",
      "description": "Elevated or fortified location mechanics",
      "check": "Tactical rule or benefit"
    },
    {
      "name": "Hidden Secret or Arcane Cache",
      "description": "Concealed treasure or lore discovery",
      "check": "DC 15 Investigation check"
    }
  ]
}`;

      const aiRes = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: briefingPrompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      if (aiRes.text) {
        return JSON.parse(aiRes.text);
      }
    } catch (e: any) {
      console.warn("[MapGen] briefing error:", e.message);
    }
    const capitalizedBiome = biome.charAt(0).toUpperCase() + biome.slice(1);
    return {
      title: `The ${timeOfDay.toUpperCase()} of ${capitalizedBiome}`,
      readAloud: `The mist parts as your boots touch the ground. A silence hangs over the ${biome} expanse, broken only by the whispers of ${weather} weather. Shadows stretch across ancient stone and earth, revealing a landscape steeped in forgotten history and immediate danger. Every angle of this battleground holds potential ambush or strategic triumph.`,
      atmosphere: {
        sounds: "Faint subterranean tremors and the rhythmic rustle of the wind",
        smells: "Ancient soil, ozone, and cold wet stone",
        temperature: timeOfDay === 'midnight' ? "A sharp, creeping frost" : "Warm, stifling air",
        lighting: `Dramatic ${timeOfDay} light casting deep tactical shadows`
      },
      tacticalHazards: [
        { name: "Unstable Footing", description: "Loose gravel and moss create areas of difficult terrain.", check: "DC 12 Acrobatics to dash without stumbling" },
        { name: "Fortified Cover", description: "Thick masonry and natural pillars grant +2 to AC and Dexterity saving throws.", check: "Half-cover mechanics" },
        { name: "Concealed Cache", description: "A weathered alcove hiding remnants of previous explorers.", check: "DC 14 Investigation" }
      ]
    };
  })();

  const [imageResult, briefingResult] = await Promise.all([generateImagePromise, generateBriefingPromise]);

  if (imageResult && imageResult.url) {
    imageUrl = imageResult.url;
    sourceEngine = imageResult.engine;
  } else {
    // Fallback to procedural high-detail engine if image generation failed or was explicitly requested
    const svg = generateCinematicBattlemap({
      biome,
      weather,
      timeOfDay,
      customPrompt: prompt,
      seed
    });
    const base64 = Buffer.from(svg).toString("base64");
    imageUrl = `data:image/svg+xml;base64,${base64}`;
    sourceEngine = engine === "procedural" ? "procedural" : "procedural-fallback";
  }

  const briefing = briefingResult;

  return res.json({
    success: true,
    imageUrl,
    briefing,
    seed,
    source: sourceEngine,
    resolution: imageSize,
    mapSize: { width: gridW, height: gridH, label: sizeLabel },
    requiresPaidKey,
    error: generationError
  });
});

function generateProceduralEffectSvg(name: string, shape: string, colorStr?: string, style?: string): string {
  // Determine primary accent colors
  const baseColor = colorStr && colorStr.startsWith('#') ? colorStr : '#ef4444';
  const isBlue = name.toLowerCase().includes('cold') || name.toLowerCase().includes('ice') || name.toLowerCase().includes('lightn') || name.toLowerCase().includes('water');
  const isGreen = name.toLowerCase().includes('poison') || name.toLowerCase().includes('acid') || name.toLowerCase().includes('nature');
  const isPurple = name.toLowerCase().includes('portal') || name.toLowerCase().includes('arcane') || name.toLowerCase().includes('dark') || name.toLowerCase().includes('void');
  const isGold = name.toLowerCase().includes('holy') || name.toLowerCase().includes('radiance') || name.toLowerCase().includes('spirit') || name.toLowerCase().includes('sun');

  const mainColor = isGold ? '#fbbf24' : isPurple ? '#a855f7' : isGreen ? '#22c55e' : isBlue ? '#3b82f6' : '#ef4444';
  const glowColor = isGold ? '#fef08a' : isPurple ? '#e9d5ff' : isGreen ? '#86efac' : isBlue ? '#93c5fd' : '#fca5a5';

  if (shape === 'line') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <defs>
        <radialGradient id="lineGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${glowColor}" stop-opacity="1" />
          <stop offset="30%" stop-color="${mainColor}" stop-opacity="0.8" />
          <stop offset="70%" stop-color="${mainColor}" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0" />
        </radialGradient>
        <filter id="blur">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>
      <rect width="512" height="512" fill="#000000" />
      <rect x="0" y="216" width="512" height="80" fill="url(#lineGlow)" opacity="0.9" />
      <line x1="0" y1="256" x2="512" y2="256" stroke="${glowColor}" stroke-width="12" filter="url(#blur)" />
      <line x1="0" y1="256" x2="512" y2="256" stroke="#ffffff" stroke-width="4" />
      <path d="M 0 256 Q 128 220 256 256 T 512 256" fill="none" stroke="${mainColor}" stroke-width="3" opacity="0.7" />
      <path d="M 0 256 Q 128 290 256 256 T 512 256" fill="none" stroke="${glowColor}" stroke-width="3" opacity="0.7" />
    </svg>`;
  }

  if (shape === 'cone') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <defs>
        <radialGradient id="coneGlow" cx="50%" cy="80%" r="70%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
          <stop offset="25%" stop-color="${glowColor}" stop-opacity="0.9" />
          <stop offset="60%" stop-color="${mainColor}" stop-opacity="0.5" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0" />
        </radialGradient>
        <filter id="coneBlur">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <rect width="512" height="512" fill="#000000" />
      <path d="M 256 460 L 64 60 A 240 240 0 0 1 448 60 Z" fill="url(#coneGlow)" opacity="0.85" />
      <path d="M 256 460 L 128 120 A 180 180 0 0 1 384 120 Z" fill="${glowColor}" opacity="0.4" filter="url(#coneBlur)" />
      <circle cx="256" cy="460" r="24" fill="#ffffff" filter="url(#coneBlur)" />
    </svg>`;
  }

  // Default: Circle / Burst
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <defs>
      <radialGradient id="burst" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
        <stop offset="20%" stop-color="${glowColor}" stop-opacity="0.95" />
        <stop offset="55%" stop-color="${mainColor}" stop-opacity="0.65" />
        <stop offset="85%" stop-color="${mainColor}" stop-opacity="0.2" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </radialGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <rect width="512" height="512" fill="#000000" />
    <circle cx="256" cy="256" r="230" fill="url(#burst)" />
    <circle cx="256" cy="256" r="170" fill="none" stroke="${glowColor}" stroke-width="2.5" stroke-dasharray="16, 8, 4, 8" opacity="0.8" filter="url(#glow)" />
    <circle cx="256" cy="256" r="140" fill="none" stroke="${mainColor}" stroke-width="1.5" stroke-dasharray="8, 12" opacity="0.6" />
    <circle cx="256" cy="256" r="60" fill="#ffffff" opacity="0.8" filter="url(#glow)" />
    <circle cx="256" cy="110" r="4" fill="${glowColor}" opacity="0.9" />
    <circle cx="370" cy="190" r="3" fill="#ffffff" opacity="0.9" />
    <circle cx="340" cy="350" r="5" fill="${glowColor}" opacity="0.8" />
    <circle cx="160" cy="330" r="4" fill="${glowColor}" opacity="0.9" />
    <circle cx="130" cy="180" r="3" fill="#ffffff" opacity="0.8" />
  </svg>`;
}

/**
 * POST /api/ai/generate-effect-image
 * Generates an isolated top-down RPG spell or environmental visual effect using Gemini
 */
aiRouter.post("/generate-effect-image", async (req, res) => {
  const { effectName, shape = 'circle', style, color, prompt: customPrompt } = req.body || {};
  if (!effectName && !customPrompt) {
    return res.status(400).json({ error: "Missing effectName or prompt" });
  }

  const clientKey = req.headers["x-gemini-key"] as string | undefined;
  const name = effectName || "Magical Spell Effect";
  
  // Construct targeted VTT / RPG effect prompt
  const shapeDesc = shape === 'cone' ? 'triangular spreading cone emission radiating from an apex' 
    : shape === 'line' ? 'straight directional linear beam of surging energy' 
    : 'circular magical aura, vortex, or ground burst';
  
  const effectPrompt = customPrompt || `A top-down 90-degree overhead orthographic tabletop RPG fantasy spell effect of ${name}. Shape: ${shapeDesc}. ${color ? `Color theme: ${color}.` : ''} ${style ? `Style: ${style}.` : ''} High-contrast magical particles, glowing runes, arcane energy vortex, ethereal visual VFX. Pure pitch-black (#000000) background for screen-blend transparency, no humanoid characters, no ground terrain tiles, no borders, no text, no icons, centered square composition, video game VFX asset style.`;

  try {
    const ai = getAI(clientKey);
    let imageUrl: string | null = null;
    let engineUsed = "gemini-3.1-flash-image";

    // 1. Try gemini-3.1-flash-image first (fast & reliable)
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image",
        contents: effectPrompt,
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          const mime = part.inlineData.mimeType || "image/png";
          imageUrl = `data:${mime};base64,${part.inlineData.data}`;
          break;
        }
      }
    } catch (flashErr: any) {
      console.warn("[generate-effect-image] gemini-3.1-flash-image attempt failed, trying imagen-3.0-generate-002:", flashErr?.message || flashErr);
    }

    // 2. Fallback to imagen-3.0-generate-002
    if (!imageUrl) {
      try {
        const imagenRes = await (ai.models as any).generateImages({
          model: "imagen-3.0-generate-002",
          prompt: effectPrompt,
          config: {
            numberOfImages: 1,
            aspectRatio: "1:1",
            outputMimeType: "image/png"
          }
        });
        const imgBytes = imagenRes.generatedImages?.[0]?.image?.imageBytes;
        if (imgBytes) {
          imageUrl = `data:image/png;base64,${imgBytes}`;
          engineUsed = "imagen-3.0-generate-002";
        }
      } catch (imagenErr: any) {
        console.warn("[generate-effect-image] imagen-3.0-generate-002 attempt failed:", imagenErr?.message || imagenErr);
      }
    }

    // 3. Fallback: Procedural Top-Down VFX Generator (guarantees instantaneous visual asset even if quota exhausted)
    if (!imageUrl) {
      console.log(`[generate-effect-image] Gemini quota exhausted or unavailable. Generating procedural top-down VFX fallback for ${name}...`);
      const svg = generateProceduralEffectSvg(name, shape, color, style);
      const base64 = Buffer.from(svg).toString("base64");
      imageUrl = `data:image/svg+xml;base64,${base64}`;
      engineUsed = "procedural-vfx-fallback";
    }

    // Optionally save locally to disk in /uploads/effects for clean static serving
    try {
      const uploadsDir = path.resolve(process.cwd(), 'uploads');
      const effectsDir = path.join(uploadsDir, 'effects');
      if (!fs.existsSync(effectsDir)) {
        fs.mkdirSync(effectsDir, { recursive: true });
      }
      const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const buffer = Buffer.from(matches[2], 'base64');
        const filename = `fx_${Date.now()}_${Math.round(Math.random() * 1e6)}.png`;
        const filePath = path.join(effectsDir, filename);
        fs.writeFileSync(filePath, buffer);
        const staticUrl = `/uploads/effects/${filename}`;
        return res.json({
          success: true,
          imageUrl: staticUrl,
          dataUrl: imageUrl,
          engine: engineUsed,
          prompt: effectPrompt
        });
      }
    } catch (saveErr) {
      console.warn("[generate-effect-image] Local save warning:", saveErr);
    }

    return res.json({
      success: true,
      imageUrl: imageUrl,
      engine: engineUsed,
      prompt: effectPrompt
    });
  } catch (error: any) {
    console.error("[generate-effect-image] Fatal error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate effect" });
  }
});

/**
 * POST /api/ai/describe
 */
aiRouter.post("/describe", async (req, res) => {
  const { imageBase64 } = req.body || {};
  if (!imageBase64) {
    return res.status(400).json({ error: "Missing imageBase64" });
  }

  try {
    const ai = getAI();
    const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;

    const descriptionPrompt = `Role: You are a master Dungeon Master analyzing a cropped section of a D&D battle map. 
Describe the framed area strictly within the context of a high-fantasy TTRPG scenario.
Focus deeply on atmosphere, lighting, sensory details, anomalies, and tactical points of interest. 
Do NOT mention "I am looking at an image" or "This picture shows". Describe it cinematically as if players just entered or perceived this area.
Keep the description punchy, evocative, and between 50 and 150 words.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: "image/png"
          }
        },
        "Describe this area cinematically."
      ],
      config: {
        systemInstruction: descriptionPrompt
      }
    });

    res.json({ text: response.text || "The area reveals nothing of importance." });
  } catch (err: any) {
    console.error("[AI] describe error:", err);
    res.status(500).json({ error: err.message || "Failed to describe area" });
  }
});

/**
 * POST /api/ai/chat-lore
 */
aiRouter.post("/chat-lore", async (req, res) => {
  const { history = [], message, loreSources = [] } = req.body || {};
  try {
    const ai = getAI();
    let systemText = "You are the Lore Master, an omniscient entity containing the World Bible of this campaign. Use the provided lore context to accurately answer questions about the world, NPCs, history, and rules. Never contradict the lore. If the answer is not in the lore, state that it is unknown to you, but you can speculate contextually.\n\n";

    const textSources = (loreSources as any[]).filter(s => s.type === 'text');
    textSources.forEach(s => {
      systemText += `--- SOURCE: ${s.name} ---\n${s.content}\n\n`;
    });

    const pdfSources = (loreSources as any[]).filter(s => s.type === 'pdf');
    const contents = JSON.parse(JSON.stringify(history));
    const currentMessageParts: any[] = [];

    if (pdfSources.length > 0 && history.length === 0) {
      pdfSources.forEach(s => {
        const base64Data = s.content.includes(',') ? s.content.split(',')[1] : s.content;
        currentMessageParts.push({
          inlineData: {
            data: base64Data,
            mimeType: 'application/pdf'
          }
        });
      });
    }

    currentMessageParts.push({ text: message });
    contents.push({ role: 'user', parts: currentMessageParts });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
      config: {
        systemInstruction: systemText
      }
    });

    res.json({ text: response.text || "The archives yield no answer." });
  } catch (err: any) {
    console.error("[AI] chat-lore error:", err);
    res.status(500).json({ error: err.message || "Failed to query lore" });
  }
});

/**
 * POST /api/ai/voice-script
 */
aiRouter.post("/voice-script", async (req, res) => {
  const { prompt, context } = req.body || {};
  try {
    const ai = getAI();
    const systemPrompt = `Role: You are a master TTRPG scriptwriter. 
Generate a short, punchy dialogue or narration script (max 250 characters) based on the user prompt.
Make it evocative, atmospheric, and suitable for a high-fantasy setting.
Only output the spoken text, no stage directions or speaker labels unless they are meant to be spoken.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: (context ? `CONTEXT: ${context}\n\n` : '') + `PROMPT: ${prompt}` }] }],
      config: {
        systemInstruction: systemPrompt
      }
    });

    res.json({ script: response.text || prompt });
  } catch (err: any) {
    console.error("[AI] voice-script error:", err);
    res.json({ script: prompt }); // Fallback to raw prompt
  }
});

/**
 * POST /api/ai/check-action
 */
aiRouter.post("/check-action", async (req, res) => {
  const { actionDescription, turnState } = req.body || {};
  try {
    const ai = getAI();
    const systemInstruction = `You are "The Ref", a strict D&D 5e Rules Engine. 
Your job is to validate if a proposed player or DM action follows the rules of D&D 5e.
Focus specifically on Action Economy:
- A player can only cast one leveled spell per turn.
- Only one Action and one Bonus Action per turn.
- Movement is limited by their speed.

Current Turn State:
${JSON.stringify(turnState)}

Respond in JSON format: { "allowed": boolean, "reason": string }`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Proposed Action: ${actionDescription}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json"
      }
    });

    const parsed = JSON.parse(response.text || '{"allowed": true, "reason": ""}');
    res.json(parsed);
  } catch (err: any) {
    console.error("[AI] check-action error:", err);
    res.json({ allowed: true, reason: "Rules check unavailable, proceeding with DM discretion." });
  }
});

/**
 * POST /api/ai/tts
 * Unified Text-to-Speech endpoint supporting curated fantasy archetypes
 * and all Gemini prebuilt voices.
 */
aiRouter.post("/tts", async (req, res) => {
  const { text, voiceName = "Charon" } = req.body || {};
  if (!text) {
    return res.status(400).json({ error: "Missing text" });
  }

  // Voice mapping dictionary supporting archetype IDs, friendly names, and prebuilt voices
  const VOICE_MAP: Record<string, string> = {
    wizard: 'Charon',
    'old wizard': 'Charon',
    villains_henchman: 'Puck',
    "villain's henchman": 'Puck',
    'villians hencman': 'Puck',
    henchman: 'Puck',
    ogre: 'Fenrir',
    big_bad_boss: 'Fenrir',
    'big bad boss guy': 'Fenrir',
    boss: 'Fenrir',
    bbeg: 'Fenrir',
    fiend: 'Fenrir',
    'fiend / dark entity': 'Fenrir',
    female_elf: 'Aoede',
    'female elf': 'Aoede',
    elf: 'Aoede',
    female_npc: 'Aoede',
    'female npc': 'Aoede',
    male_npc: 'Kore',
    'male npc': 'Kore',
    charon: 'Charon',
    fenrir: 'Fenrir',
    aoede: 'Aoede',
    kore: 'Kore',
    puck: 'Puck',
    zephyr: 'Zephyr',
  };

  const rawKey = String(voiceName || '').toLowerCase().trim();
  const elevenKey = currentElevenLabsApiKey || (isValidElevenLabsKey(process.env.ELEVENLABS_API_KEY) ? process.env.ELEVENLABS_API_KEY : null);

  // 1. If ElevenLabs is configured, prioritize ultra-realistic ElevenLabs neural voices
  if (elevenKey) {
    try {
      const ELEVEN_VOICE_MAP: Record<string, string> = {
        wizard: 'ER1QX78rEi0j9Vaeflmj',
        'old wizard': 'ER1QX78rEi0j9Vaeflmj',
        villains_henchman: 'Og5lqPvHfT1wPvp1MoOi',
        "villain's henchman": 'Og5lqPvHfT1wPvp1MoOi',
        'villians hencman': 'Og5lqPvHfT1wPvp1MoOi',
        henchman: 'Og5lqPvHfT1wPvp1MoOi',
        ogre: '6khSivLMlRIG93WYPvul',
        big_bad_boss: 'ywMiD451ukzMCfGTMdjH',
        'big bad boss guy': 'ywMiD451ukzMCfGTMdjH',
        boss: 'ywMiD451ukzMCfGTMdjH',
        bbeg: 'ywMiD451ukzMCfGTMdjH',
        fiend: 'VR6AewLTigWG4xSOukaG',
        'fiend / dark entity': 'VR6AewLTigWG4xSOukaG',
        female_elf: 'Wj7FjlFOGOU71BQgPJe5',
        'female elf': 'Wj7FjlFOGOU71BQgPJe5',
        elf: 'Wj7FjlFOGOU71BQgPJe5',
        female_npc: '21m00Tcm4TlvDq8ikWAM',
        'female npc': '21m00Tcm4TlvDq8ikWAM',
        male_npc: 'pNInz6obpgDQGcFmaJgB',
        'male npc': 'pNInz6obpgDQGcFmaJgB',
      };

      const elevenVoiceId = req.body?.elevenLabsVoiceId || ELEVEN_VOICE_MAP[rawKey] || (voiceName && voiceName.length >= 18 ? voiceName : 'ER1QX78rEi0j9Vaeflmj');
      
      const elRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenVoiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': elevenKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.25,
            use_speaker_boost: true
          }
        })
      });

      if (elRes.ok) {
        const buffer = await elRes.arrayBuffer();
        const base64Audio = Buffer.from(buffer).toString('base64');
        return res.json({ audioBase64: base64Audio, audio: base64Audio, engine: 'elevenlabs', format: 'mp3' });
      } else {
        const errorText = await elRes.text().catch(() => '');
        console.warn(`[AI Server] ElevenLabs returned status ${elRes.status}: ${errorText}. Falling back to Gemini TTS.`);
      }
    } catch (elErr: any) {
      console.warn('[AI Server] ElevenLabs request failed, falling back to Gemini TTS:', elErr?.message);
    }
  }

  // 2. Gemini TTS Engine (with prompt-level archetype style metadata)
  const targetVoice = VOICE_MAP[rawKey] || (rawKey ? rawKey.charAt(0).toUpperCase() + rawKey.slice(1) : 'Charon');

  const STYLE_MAP: Record<string, string> = {
    wizard: 'Ancient, mystical, deliberate pacing, speaking like an arcane scholar whispering forgotten lore',
    'old wizard': 'Ancient, mystical, deliberate pacing, speaking like an arcane scholar whispering forgotten lore',
    villains_henchman: 'Sneering, cunning, sniveling tone of a scheming minion or treacherous lackey',
    "villain's henchman": 'Sneering, cunning, sniveling tone of a scheming minion or treacherous lackey',
    'villians hencman': 'Sneering, cunning, sniveling tone of a scheming minion or treacherous lackey',
    henchman: 'Sneering, cunning, sniveling tone of a scheming minion or treacherous lackey',
    ogre: 'Brutish, thundering, deep, slow, and guttural roar of a hulking monster',
    big_bad_boss: 'Commanding, resonant, terrifying, and authoritative dark overlord',
    'big bad boss guy': 'Commanding, resonant, terrifying, and authoritative dark overlord',
    boss: 'Commanding, resonant, terrifying, and authoritative dark overlord',
    bbeg: 'Commanding, resonant, terrifying, and authoritative dark overlord',
    fiend: 'Deep, guttural, menacing rumbling with dark, sinister undertones',
    'fiend / dark entity': 'Deep, guttural, menacing rumbling with dark, sinister undertones',
    female_elf: 'Graceful, ethereal, melodious, and ancient elven cadence with poise and elegance',
    'female elf': 'Graceful, ethereal, melodious, and ancient elven cadence with poise and elegance',
    elf: 'Graceful, ethereal, melodious, and ancient elven cadence with poise and elegance',
    female_npc: 'Expressive, natural, lively adventurer with medieval fantasy inflection',
    'female npc': 'Expressive, natural, lively adventurer with medieval fantasy inflection',
    male_npc: 'Grounded, sturdy, natural medieval town guard or tavern keeper',
    'male npc': 'Grounded, sturdy, natural medieval town guard or tavern keeper',
  };
  const stylePrompt = STYLE_MAP[rawKey];

  try {
    const ai = getAI();
    let response: any;
    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [
          {
            parts: [
              stylePrompt
                ? { text: text, speechMetadata: { style: stylePrompt } }
                : { text: text }
            ] as any,
          },
        ],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: targetVoice },
            },
          },
        },
      });
    } catch (ttsErr: any) {
      console.warn("[AI] gemini-2.5-flash-preview-tts failed, trying gemini-3.8-flash-tts:", ttsErr?.message);
      response = await ai.models.generateContent({
        model: "gemini-3.8-flash-tts",
        contents: [
          {
            parts: [
              stylePrompt
                ? { text: text, speechMetadata: { style: stylePrompt } }
                : { text: text }
            ] as any,
          },
        ],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: targetVoice },
            },
          },
        },
      });
    }

    const base64Audio = response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      // Return both formats for full backwards compatibility
      return res.json({ audioBase64: base64Audio, audio: base64Audio, engine: 'gemini', format: 'pcm' });
    }
    throw new Error("No audio data returned from TTS");
  } catch (err: any) {
    console.error("[AI] tts error:", err);
    res.status(500).json({ error: err.message || "Failed to generate TTS" });
  }
});

const dmTools = [
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

/**
 * POST /api/ai/auto-dm
 */
aiRouter.post("/auto-dm", async (req, res) => {
  const { history = [], mapStateText = "" } = req.body || {};
  try {
    const ai = getAI();
    const systemInstruction = `You are an autonomous AI Dungeon Master running a D&D campaign in a VTT. 
Your goal is to narrate the game, act as the NPCs, and control the enemies.
You have the ability to move tokens, add magical effects to the map, and update HP.

Use the provided tools ONLY when it makes sense chronologically with your narration.
For example, if you say "The Goblin shoots an arrow at Varrak", you might want to update Varrak's HP if he didn't dodge. Or if a wizard casts fireball, use the add_effect tool.

CURRENT MAP STATE:
${mapStateText}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: history,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: dmTools } as any]
      }
    });

    const calls = response.functionCalls || [];
    res.json({
      text: response.text || "",
      functionCalls: calls.map(c => ({ name: c.name, args: c.args, id: c.id }))
    });
  } catch (err: any) {
    console.error("[AI] auto-dm error:", err);
    res.status(500).json({ error: err.message || "Failed to query Auto-DM" });
  }
});

/**
 * MASTERPIECE IMBROGLIO (Keys from the Golden Vault) Full Adventure Lore
 */
const MASTERPIECE_IMBROGLIO_LORE = `
ADVENTURE: Masterpiece Imbroglio (Keys from the Golden Vault, 5th-Level Characters)
PATRON: The Golden Vault or Cognoscenti Esoterica (represented by Adrisa Carimorte, neutral human mage, offering 2,000 gp for recovery).
MISSION BRIEFING:
A magical painting known as Constantori's Portrait was stolen from the Cognoscenti Esoterica vaults by the Agile Hand, a thieves' guild led by Guildmaster Dusk. The Cognoscenti suspects the painting has occult ties. If using the Golden Vault, operatives receive a golden key that opens a music box with a recorded mission briefing; the key vanishes when the lid closes. A coach brings characters to an old barn in dead cornfields to meet Adrisa.

CAPTIVE INFORMANT:
Grinky Brithwort (neutral evil human bandit), tied in the barn loft.
Grinky knows:
- Guildmaster Dusk leads Agile Hand; trained assassin with political ties.
- Windows are boarded up; doors locked. Master keys held by: Guildmaster Dusk (G26), Elix the Saint (G23), Jaymont the Sinner (G3), and Gwish the raven master (G21).
- Best chance for master key: Elix the Saint frequents the Tipsy Tankard tavern alone at sundown to flirt with bartender Karyssa.
- Late-night shifts are bullied onto lower-ranking members; most sleep late.
- Portrait location guess: Grinky wrongly guesses Dusk's bedroom or basement. (Actually in G27 Tower Peak above Dusk's room!).
- Supplies received at livery stables by Laris Drot.

KEY NPCS & VILLAINS:
- Guildmaster Dusk: Lawful evil half-elf assassin. Asleep in G26 with lover noble Dartinal Livereth. Carries a master key. Attuned to Constantori's Portrait and commanded it to defend itself.
- Gwish: Oni disguised as an old man in G21. Has 3 messenger ravens and a Ring of Animal Influence. His trunk contains gnawed humanoid bones. Carries a master key. Has a coded note from a spy: "Constantori in danger. Cognoscenti retaliation imminent. Be on high alert." (DC 20 Investigation or comprehend languages).
- Jaymont the Sinner: Doppelganger in G3 pretending to be a drunken guest wrapped in a blanket on the stairs (DC 15 Insight to spot awake). Carries a master key. If intruders pass, taps wall 3 times to alert Gwish, then alerts Dusk.
- Elix the Saint: Lawful evil bandit captain. Frequents Tipsy Tankard tavern (45-min walk). DC 10 Sleight of Hand (DC 15 in crowd) to pickpocket his master key. Works in G23 appraising stolen goods with a crowbar.
- Dury Sneeth: Neutral evil human spy locked in cell G34c for taking bribes from rival guild Velvet Glove. Has a hidden dagger; begs for release.
- Needly Pitts: Young stable hand sleeping in G2b hayloft; bangs pail if alarmed.
- Laris Drot: Stout stablemaster in G16; keys to stables and service room.
- Dartinal Livereth: Lawful evil human noble, Dusk's lover, smoking pipe in G26.

CONSTANTORI'S PORTRAIT (Magic Item, Wondrous Item, Very Rare, Requires Attunement):
- Depicts courtier Constantori, painted by famed artist Dkesii Kwan, commissioned by late crime lord Daiyani Grysthorn.
- Sentient Lawful Evil item: Int 14, Wis 12, Cha 8. Hearing 120 ft, darkvision 60 ft (cannot see behind itself). Speaks Common, Draconic, Elvish (mouth doesn't move). Eagerly eavesdrops and gathers secrets.
- Personality: Demanding, condescending, vain. Hates being covered or removed from gold frame.
- Telepathy: Attuned owner can telepathically contact it over any distance on same plane (requires concentration).
- Guardian Function: When a creature identified as an enemy starts turn in sight, painting expends 1 of 3 charges to cast Magic Missile (3 missiles, 1st level). Regains charges at dawn.
- Stats: Small object, AC 12, 20 HP, immune to poison. Mending heals 2d6 HP. Throwing a sheet over it prevents it from casting spells.
- Wealth of Information: Decades of observed secrets, plots, passwords.

TRAPS & SECURITY:
- Floor Creak: Upper floors, stable loft, and porches have warped hardwood planks; stealth checks made at DISADVANTAGE!
- Doors: DC 15 Dex (Thieves' Tools) or DC 15 Str (Athletics) to force. AC 15, 18 HP.
- Secret Doors: DC 15 Perception to spot.
- G10 Back Door Trap: Doorknob loose, connected to poison gas vial. DC 12 Perception to spot, DC 15 Dex to disable. If opened or forced: 10-ft sphere cloud, DC 14 Con save or 16 (3d10) poison damage and poisoned 1 min (half on save).
- G27 Tower Peak Trap (Around Portrait): Gas canisters behind painting. Removing painting without disabling releases gas: DC 12 Perception to spot holes behind frame (advantage if seen Dusk's diary sketch). DC 15 Sleight of Hand with counterweights or plugging holes to disable. Triggering forces DC 14 Con save, 36 (8d8) poison damage (half on save).
- G28-G33 Basement Thieves' Training Course:
  - G29 Murky Pool: 10-ft deep, 0 visibility. Nonmagical silver key on pool floor (DC 15 Investigation). Tiny keyhole on east wall (DC 15 Investigation). Inserting key opens flooded tunnel with Swarm of Quippers leading to G30 trapdoor.
  - G31 Hallway: Dummy skeletons with bows; 2 animated skeletons fire shortbows when entering center square (DC 15 Acrobatics to tumble and impose disadvantage).
  - G32 & G33 Breathing Mazes: Minor illusion breathing sounds. 3 pressure plates sinking 1 inch into floor (DC 13 Perception). Stepping on all 3 pressure plates simultaneously within 1 minute unlocks the north secret door to G28 Cellar!
  - G36 Storage: Wooden crate is a Mimic that loves salted butter! Dusk brings it butter; it attacks if butter is stolen but can chat in Common if given butter.

TREASURE & NOTABLE LOOT:
- G1 Drop box: 25 sp, deed to 2 horses.
- G12 Parlor: 65 cp, 35 sp, 11 gp.
- G18 Common room: Lantern of Revealing (magical, guild unaware).
- G22 Balcony: Spyglass worth 250 gp.
- G23 Stolen Goods: 6 casks elven wine (250 gp each), 6 poisoner's kits, 8 thieves' tools, 2 spyglasses (1,000 gp each), coffin with gold sun death mask (250 gp), copper holy symbol (25 gp), necklace of prayer beads.
- G35 Storage: 6 pieces costume jewelry (5 gp each), gold necklace with black pearl (750 gp), Necklace of Fireballs!
- Return reward: 2,000 gp from Adrisa (+500 gp for Elix's ledger; pair of Sending Stones if raven note deciphered; or Rare Magic Item of choice from Golden Vault).
`;

/**
 * VECNA & EVE OF RUIN Knowledge Base
 */
const VECNA_LORE = `
VECNA: THE WHISPERED ONE, THE UNDYING KING, ARCHLICH OF THE MULTIVERSE
Campaign: Vecna: Eve of Ruin (5e high-level campaign, levels 10-20)
Core Concept: Vecna seeks to unravel reality and remake the multiverse in his image using the Ritual of Remaking and Secrets of the Multiverse collected across planes.

VECNA THE ARCHLICH (CR 26 Undead):
- Armor Class: 18 (natural armor)
- Hit Points: 272 (32d8 + 128), Regains 80 HP at start of turn if at least 1 HP.
- Speed: 30 ft., fly 40 ft. (hover)
- Saves: Con +12, Int +17, Wis +12, Cha +15
- Skills: Arcana +27, History +17, Insight +12, Perception +12
- Damage Resistances: Cold, Lightning, Necrotic
- Damage Immunities: Poison; Bludgeoning, Piercing, and Slashing from Nonmagical Attacks
- Condition Immunities: Charmed, Exhaustion, Frightened, Paralyzed, Poisoned, Stunned
- Legendary Resistance: 5/Day
- Special Traits:
  - Undying: If destroyed, soul reforms within 1d100 years unless ritual or holy seal.
- Actions:
  - Multiattack: Uses Rotten Fate twice or attacks twice with Afterthought.
  - Afterthought: Melee Weapon Attack +13 to hit, reach 5 ft., 7 (1d4 + 5) piercing + 9 (2d8) necrotic. Target can't regain HP until start of Vecna's next turn.
  - Rotten Fate: Ranged Spell Attack +17 to hit, range 120 ft., 36 (8d8) necrotic damage. If reduced to 0 HP, creature dies and rises as a Zombie under Vecna's control at start of his next turn.
  - Spellcasting: At will: Detect Magic, Dispel Magic, Fly, Lightning Bolt, Mage Hand, Prestidigitation. 2/day each: Dimension Door, Invisibility, Scrying. 1/day each: Dominate Monster, Globe of Invulnerability, Plane Shift.
- Bonus Actions:
  - Vile Teleport: Vecna teleports up to 30 ft. to an unoccupied space he can see. Each creature within 5 ft. of the space he left takes 10 (3d6) psychic damage. Vecna gains 10 temporary HP.
- Reactions:
  - Dread Counterspell: When Vecna sees a creature within 60 ft. cast a spell, he interrupts it. The caster takes 27 (4d10 + 5) psychic damage and the spell fails (level 4 or lower fails automatically; level 5+ requires Vecna to make Int check DC 10 + spell level).

ARTIFACTS OF VECNA:
- Eye of Vecna: Replaces eye. Truesight 30ft, 8 charges (Clairvoyance, Crown of Madness, Disintegrate, Eyebite, Sunray). 5% chance Vecna tears soul away each time a spell is cast.
- Hand of Vecna: Replaces hand. Strength score becomes 20. Melee weapon attacks deal +2d8 cold damage. 8 charges (Finger of Death, Sleep, Slow, Telekinesis). Suggests evil acts.
- Combined Eye & Hand: Extra powers: Immunity to poison and disease, wish spell once every 30 days, Dread Visage.
- Book of Vile Darkness: Ultimate grim lore, corrupts readers, grants unholy boons.
- The Rod of Seven Parts: Ancient artifact of Law (Wind Dukes of Aaqa) needed to thwart Vecna's multiverse ritual. Characters must travel across the multiverse (Spelljammer, Ravenloft, Eberron, Greyhawk, Planescape) to assemble its seven fragments.
- Kas the Betrayer: Former vampire lieutenant who betrayed Vecna with the Sword of Kas; in Eve of Ruin, disguised as Mordenkainen ("The Weaver of Lies") to manipulate the party into defeating Vecna and claiming godhood for himself!
`;

/**
 * POST /api/ai/dnd-chat
 * Multi-turn omniscient D&D chatbot powered by Gemini
 */
aiRouter.post("/dnd-chat", async (req, res) => {
  const { 
    history = [], 
    message, 
    mode = "golden_vault", // 'golden_vault' | 'vecna' | 'rules' | 'dm_copilot'
    model = "gemini-2.5-flash",
    extraContext = "",
    chapterDigest = null
  } = req.body || {};

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: "Missing message in request body" });
  }

  try {
    const ai = getAI();

    // Determine role and knowledge based on mode
    let modePersona = "";
    let modeLore = "";

    if (mode === "golden_vault") {
      modePersona = `You are the Golden Vault Handler & Heist Mastermind, an omniscient authority on D&D 5e and specifically the official adventure "Keys from the Golden Vault", focusing on the chapter "Masterpiece Imbroglio".
You know every detail of the Agile Hand guildhouse, Guildmaster Dusk, Gwish the oni, Jaymont the Sinner, Elix the Saint, Grinky Brithwort, Constantori's Portrait (its sentience, stats, spells, personality, and eavesdropped secrets), room keys G1 through G37, traps, pressure plates, stealth rules, and tactical advice.
Always assist the DM with precise, lore-accurate, ready-to-run rulings, NPC dialogue, DC checks, read-aloud boxed text, and encounter advice.`;
      modeLore = MASTERPIECE_IMBROGLIO_LORE;
    } else if (mode === "vecna") {
      modePersona = `You are the Chronicler of the Multiverse and Keeper of Dark Secrets, an omniscient authority on Vecna, the Archlich of Greyhawk, and the epic high-level campaign "Vecna: Eve of Ruin".
You know Vecna's CR 26 stat block inside and out (Rotten Fate, Afterthought, Dread Counterspell, Vile Teleport), the artifacts (Eye of Vecna, Hand of Vecna, Book of Vile Darkness, Sword of Kas, Rod of Seven Parts), Kas the Betrayer / Weaver of Lies disguised as Mordenkainen, and strategies for running terrifying planar battles.
You speak with cold, ancient knowledge, providing precise 5e mechanical stats, tactical villain advice, epic narrative flavor, and counterplay tips for DMs.`;
      modeLore = VECNA_LORE;
    } else if (mode === "dm_copilot") {
      modePersona = `You are the Tactical DM Co-Pilot, an expert real-time tabletop assistant.
You specialize in instant improvisation: generating NPC names and quirks, balancing encounters on the fly, improvising DCs using the standard 5e scale (5 very easy, 10 easy, 15 medium, 20 hard, 25 very hard, 30 nearly impossible), generating atmospheric read-aloud descriptions with sensory details (smell, lighting, temperature), and formatting tactical rulings clearly.`;
      modeLore = `Core 5e Rules & Tabletop DC Guidelines.
Masterpiece Imbroglio & Vecna lore are also in your memory.
${MASTERPIECE_IMBROGLIO_LORE}
${VECNA_LORE}`;
    } else {
      // General 5e rules & sage advice
      modePersona = `You are the Omniscient 5e Sage and Rules Arbiter, possessing exhaustive knowledge of the official Dungeons & Dragons 5th Edition rules (Player's Handbook, Dungeon Master's Guide, Monster Manual, Xanathar's, Tasha's, and Sage Advice Compendium).
You answer rules queries with razor-sharp accuracy, citing official wording, explaining the action economy, bonus actions, reactions, concentration, surprise, cover (+2/+5/total), spell components, grappling, stealth vs. passive perception, and edge-case interactions.
When providing rulings, first give the RAW (Rules As Written) answer clearly, then offer practical RAI (Rules As Intended) or DM suggestions if relevant.`;
      modeLore = `Standard 5e Core Rules, Spells, Monsters, Combat, Conditions, Spellcasting, and Magic Items.
Also incorporates Keys from the Golden Vault and Vecna lore:
${MASTERPIECE_IMBROGLIO_LORE}
${VECNA_LORE}`;
    }

    let chapterDigestContext = "";
    if (chapterDigest && typeof chapterDigest === "object") {
      const digestScenes = Array.isArray(chapterDigest.scenes) ? chapterDigest.scenes : [];
      const digestRooms = Array.isArray(chapterDigest.rooms) ? chapterDigest.rooms : [];
      chapterDigestContext = `
=== UPLOADED & DIGESTED CHAPTER ADVENTURE MODULE ===
Adventure: ${chapterDigest.adventureTitle || "Campaign Adventure"}
Chapter: ${chapterDigest.chapterTitle || "Active Chapter"}
Chapter Summary: ${chapterDigest.digestSummary || "No summary available"}

Scenes in this Chapter:
${digestScenes.map((s: any) => `• Scene "${s.sceneTitle}": ${s.summary || ""} (Key NPCs: ${(s.keyNpcs || []).join(", ")}; Traps: ${(s.trapsAndHazards || []).join(", ")}; Rooms: ${(s.roomNumbers || []).join(", ")})`).join("\n")}

All Numbered Room Keys & Tactical Zones in this Chapter:
${digestRooms.map((r: any) => `[Room ${r.roomNumber}: ${r.roomName || "Unnamed"}]
- Read-Aloud Boxed Text: ${r.boxedText || "None"}
- DM Tactical Notes & Secrets: ${r.dmNotes || "None"}
- Monsters: ${(r.monsters || []).join(", ") || "None"}
- Treasure: ${(r.treasure || []).join(", ") || "None"}`).join("\n\n")}
`;
    }

    const systemInstruction = `${modePersona}

=== KNOWLEDGE BASE & LORE ===
${modeLore}

${chapterDigestContext ? `${chapterDigestContext}\n` : ""}
${extraContext ? `=== ADDITIONAL CAMPAIGN CONTEXT ===\n${extraContext}\n` : ""}

=== FORMATTING & INTERACTION GUIDELINES ===
1. Use clear, organized Markdown with bold headers, bullet points, and tables where helpful.
2. For read-aloud room/scene descriptions, format them as blockquotes (> ...).
3. For stat blocks or mechanics, clearly format AC, HP, Speed, DCs, and Damage formulas (e.g., 16 [3d10] poison damage).
4. If asked about NPCs or villains (like Guildmaster Dusk, Gwish, or Vecna), include roleplaying quotes or tactical behaviors.
5. If the DM asks for rolls or checks, give the exact skill and DC (e.g., "DC 15 Dexterity (Thieves' Tools) check").
6. Keep responses engaging, authoritative, and immediately useful at the gaming table!`;

    // Map conversation history
    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const item of history) {
        if (item.text || (item.parts && item.parts[0]?.text)) {
          contents.push({
            role: item.role === 'model' ? 'model' : 'user',
            parts: [{ text: item.text || item.parts[0]?.text }]
          });
        }
      }
    }

    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    // Use resilient model fallback cascade
    const response = await generateContentWithFallback(ai, {
      preferredModel: model || "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction
      }
    });

    const replyText = response.text || "The archives yield no answer.";
    res.json({ text: replyText, model: model || "gemini-2.5-flash", mode });
  } catch (err: any) {
    console.error("[AI] dnd-chat error:", err);
    res.status(500).json({ error: err.message || "Failed to query D&D AI Chatbot" });
  }
});

/**
 * POST /api/ai/parse-statblock
 * Takes an image (base64 data URL or remote/local URL) of a D&D monster stat-block
 * and parses it using Gemini into structured JSON with stats, traits, actions, etc.
 */
aiRouter.post("/parse-statblock", async (req, res) => {
  try {
    const { image, additionalNotes } = req.body;
    if (!image) {
      return res.status(400).json({ error: "Missing image data" });
    }

    const ai = getAI();

    // Prepare image part
    const inlineDataPart = await resolveImageToInlineData(image);

    if (!inlineDataPart) {
      return res.status(400).json({ error: "Could not decode image for stat-block digestion" });
    }

    const promptText = `
You are an expert tabletop RPG stat-block extraction parser specializing in D&D 5e / D&D 2024 / Beyond20 stat-blocks.
Analyze this uploaded screenshot of a creature or monster stat-block with extreme precision.
Extract every single field and return ONLY valid JSON matching this exact structure:

{
  "name": "string (e.g. Deadbark Dryad)",
  "size": "Tiny | Small | Medium | Large | Huge | Gargantuan",
  "type": "string (e.g. Fey, Undead, Monstrosity)",
  "alignment": "string (e.g. Typically Chaotic Evil)",
  "ac": number (e.g. 16),
  "acNotes": "string (e.g. natural armor)",
  "hp": number (e.g. 187),
  "hpFormula": "string (e.g. 22d8 + 88)",
  "speed": "string (e.g. 30 ft.)",
  "initiativeBonus": number (e.g. 3),
  "str": number (e.g. 17),
  "dex": number (e.g. 16),
  "con": number (e.g. 18),
  "int": number (e.g. 11),
  "wis": number (e.g. 16),
  "cha": number (e.g. 18),
  "savingThrows": "string (e.g. CON +9, CHA +9)",
  "skills": "string (e.g. Perception +8, Stealth +8)",
  "damageResistances": "string (e.g. Bludgeoning, Piercing, and Slashing from Nonmagical Attacks)",
  "damageImmunities": "string (e.g. Poison)",
  "conditionImmunities": "string (e.g. Poisoned)",
  "senses": "string (e.g. Darkvision 60 ft., Passive Perception 18)",
  "languages": "string (e.g. Elvish, Sylvan)",
  "challenge": "string (e.g. 13 (10,000 XP))",
  "proficiencyBonus": number (e.g. 5),
  "traits": [
    {
      "name": "string (e.g. Bramble Walk)",
      "description": "string"
    }
  ],
  "actions": [
    {
      "name": "string (e.g. Poisonous Thorn)",
      "type": "attack | multiattack | spell | special",
      "attackBonus": number (optional, e.g. 8),
      "reachRange": "string (optional, e.g. reach 5 ft. or range 120 ft.)",
      "damage": "string (optional, e.g. 13 (4d4 + 3) piercing plus 10 (3d6) poison)",
      "description": "string"
    }
  ],
  "bonusActions": [
    {
      "name": "string",
      "description": "string"
    }
  ],
  "reactions": [
    {
      "name": "string",
      "description": "string"
    }
  ],
  "legendaryActions": [
    {
      "name": "string",
      "description": "string"
    }
  ],
  "legendaryDescription": "string (optional overview of legendary actions)"
}

${additionalNotes ? `Additional user context: ${additionalNotes}` : ''}
Extract clean text without extra Markdown formatting around the JSON object (no \`\`\`json fences, just raw JSON).
`;

    const response = await generateContentWithFallback(ai, {
      preferredModel: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            inlineDataPart,
            { text: promptText }
          ]
        }
      ]
    });

    let rawText = response.text || "{}";
    rawText = rawText.trim();
    if (rawText.startsWith("```json")) {
      rawText = rawText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    let parsedData: any = {};
    try {
      parsedData = JSON.parse(rawText);
    } catch (parseErr) {
      console.warn("[parse-statblock] Direct JSON parse failed, attempting regex extract:", parseErr);
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Model response was not valid JSON");
      }
    }

    res.json({ success: true, monster: parsedData });
  } catch (err: any) {
    console.error("[AI] parse-statblock error:", err);
    res.status(500).json({ error: err.message || "Failed to digest stat-block screenshot" });
  }
});

/**
 * POST /api/ai/parse-character-sheet
 * Takes a PDF character sheet (D&D Beyond, Roll20, standard 5e PDF, 2024 revised, Pathfinder, etc.)
 * as base64 data URI, /uploads/*.pdf, or remote URL and uses Gemini 3.8 Flash to review all pages and extract
 * comprehensive DM-relevant stats, abilities, attacks, saving throws, resistances, immunities, roleplay lore, etc.
 */
aiRouter.post("/parse-character-sheet", async (req, res) => {
  try {
    const { pdf, pdfUrl, additionalNotes } = req.body || {};
    const input = pdf || pdfUrl;
    if (!input) {
      return res.status(400).json({ error: "Missing PDF character sheet data" });
    }

    const ai = getAI();
    const inlineDataPart = await resolveImageToInlineData(input);

    if (!inlineDataPart) {
      return res.status(400).json({ error: "Could not decode or load PDF document for character parsing" });
    }

    const promptText = `
You are an expert tabletop RPG Dungeon Master and character sheet digestion AI specializing in D&D 5e / D&D 2024 / D&D Beyond / Pathfinder character sheets.
Analyze this entire uploaded multi-page PDF character sheet with absolute precision.
Read all pages (Page 1 stats/attacks/defenses/skills, Page 2 class features/equipment, Page 3 feats/additional traits, Page 4 roleplay/backstory/bonds, Page 5 spellcasting if applicable).

Extract EVERY SINGLE PIECE of information that would be relevant to the Dungeon Master and players at the virtual tabletop.
Ensure all stats, HP, AC, speed, initiative, ability scores, saving throws (including active modifiers like Rage or Danger Sense), skills, damage resistances, condition immunities, weapon attacks with damage formulas and masteries, bonus actions, reactions, feats, background, equipment, gold currency, and roleplay traits are captured.

Return ONLY a valid JSON object matching this exact structure:

{
  "name": "string (character name, e.g. Varrak \\"Onikuma\\" of Sky Veil Clan)",
  "race": "string (species / race, e.g. Goliath)",
  "classLevel": "string (class and level, e.g. Barbarian 6)",
  "background": "string (e.g. Soldier)",
  "alignment": "string (e.g. Neutral, Chaotic Good)",
  "ac": 17,
  "hp": 59,
  "maxHp": 59,
  "tempHp": 0,
  "hitDice": "6d12",
  "speed": "45 ft.",
  "initiativeBonus": 2,
  "proficiencyBonus": 3,
  "passivePerception": 12,
  "passiveInsight": 9,
  "passiveInvestigation": 9,
  "stats": {
    "str": 20,
    "dex": 14,
    "con": 15,
    "int": 8,
    "wis": 8,
    "cha": 10
  },
  "savingThrows": {
    "str": "+8",
    "dex": "+2",
    "con": "+5",
    "int": "-1",
    "wis": "-1",
    "cha": "+0"
  },
  "savingThrowModifiers": "Advantage on STR while Rage is active. Advantage on DEX unless you are Incapacitated.",
  "skillsList": [
    { "name": "Acrobatics", "bonus": "+2", "proficient": false },
    { "name": "Animal Handling", "bonus": "-1", "proficient": false },
    { "name": "Arcana", "bonus": "-1", "proficient": false },
    { "name": "Athletics", "bonus": "+8", "proficient": true },
    { "name": "Deception", "bonus": "+0", "proficient": false },
    { "name": "History", "bonus": "-1", "proficient": false },
    { "name": "Insight", "bonus": "-1", "proficient": false },
    { "name": "Intimidation", "bonus": "+3", "proficient": true },
    { "name": "Investigation", "bonus": "-1", "proficient": false },
    { "name": "Medicine", "bonus": "-1", "proficient": false },
    { "name": "Nature", "bonus": "-1", "proficient": false },
    { "name": "Perception", "bonus": "+2", "proficient": true },
    { "name": "Performance", "bonus": "+0", "proficient": false },
    { "name": "Persuasion", "bonus": "+0", "proficient": false },
    { "name": "Religion", "bonus": "-1", "proficient": false },
    { "name": "Sleight of Hand", "bonus": "+2", "proficient": false },
    { "name": "Stealth", "bonus": "+2", "proficient": false },
    { "name": "Survival", "bonus": "+2", "proficient": true }
  ],
  "defenses": {
    "resistances": ["Bludgeoning (while raging)", "Piercing (while raging)", "Slashing (while raging)"],
    "immunities": ["Charmed (Mindless Rage)", "Frightened (Mindless Rage)", "Critical Hits (Adamantine Armor)"],
    "vulnerabilities": [],
    "conditionImmunities": ["Charmed", "Frightened"]
  },
  "proficiencies": {
    "armor": ["Light Armor", "Medium Armor", "Shields"],
    "weapons": ["Martial Weapons", "Simple Weapons"],
    "tools": ["Dice Set", "Smith's Tools"],
    "languages": ["Common", "Giant", "Gnomish"]
  },
  "actions": [
    {
      "name": "Greataxe, +1",
      "type": "melee",
      "hitBonus": "+9",
      "damage": "1d12+8 Slashing",
      "notes": "Martial, Heavy, Two-Handed, Cleave",
      "description": "Make a melee weapon attack. Cleave: Once per turn if you hit, make another melee attack against second creature within 5 ft."
    }
  ],
  "bonusActions": [
    {
      "name": "Activate Large Form",
      "source": "Goliath Species (1/Long Rest)",
      "description": "Change size to Large for 10 minutes. Advantage on Strength checks, Speed increases by 10 ft."
    },
    {
      "name": "Cloud's Jaunt",
      "source": "Cloud Giant Ancestry (3/Long Rest)",
      "description": "Magically teleport up to 30 ft. to an unoccupied space you can see."
    },
    {
      "name": "Rage (Enter)",
      "source": "Barbarian (4/Long Rest)",
      "description": "Enter rage as a bonus action. Advantage on STR checks/saves, +2 damage, resistance to bludgeoning, piercing, slashing."
    },
    {
      "name": "Extend Rage",
      "source": "Barbarian",
      "description": "Extend rage until the end of your next turn."
    }
  ],
  "reactions": [
    {
      "name": "Opportunity Attack",
      "description": "Make a melee attack when a hostile creature moves out of reach."
    }
  ],
  "specialFeatures": [
    {
      "category": "Barbarian Features",
      "name": "Reckless Attack",
      "description": "Advantage on melee weapon attack rolls using Strength during this turn; attacks against you have advantage until next turn."
    },
    {
      "category": "Barbarian Features",
      "name": "Frenzy (Path of the Berserker)",
      "description": "If Reckless Attack while Rage is active, deal extra 2d6 damage to the first target hit."
    },
    {
      "category": "Barbarian Features",
      "name": "Mindless Rage",
      "description": "Immunity to Charmed and Frightened conditions while Rage is active."
    },
    {
      "category": "Species Traits",
      "name": "Powerful Build",
      "description": "Advantage on checks to end Grappled condition. Count as one size larger for carrying capacity."
    },
    {
      "category": "Feats",
      "name": "Savage Attacker",
      "description": "Once per turn when hitting with a weapon, roll damage dice twice and use higher result."
    }
  ],
  "equipment": [
    { "name": "Stone of Good Luck (Luckstone)", "quantity": 1, "weight": "--", "isAttuned": true },
    { "name": "Adamantine Half Plate", "quantity": 1, "weight": "40 lb.", "isAttuned": false },
    { "name": "Greataxe, +1", "quantity": 1, "weight": "7 lb.", "isAttuned": false },
    { "name": "Potion of Healing", "quantity": 2, "weight": "1 lb.", "isAttuned": false },
    { "name": "Gem of Brightness", "quantity": 1, "weight": "--", "isAttuned": true },
    { "name": "Periapt of Wound Closure", "quantity": 1, "weight": "--", "isAttuned": true }
  ],
  "currency": {
    "cp": 0,
    "sp": 0,
    "ep": 0,
    "gp": 4335,
    "pp": 0
  },
  "roleplay": {
    "gender": "Male",
    "age": "27",
    "size": "Medium",
    "height": "8'0\\"",
    "weight": "340 lb",
    "faith": "Tempus",
    "skin": "Grey skin with tribal tattoos",
    "eyes": "Bright Blue",
    "hair": "None",
    "personalityTraits": "Thinking is for other people. I prefer action. I can stare down a hell hound without flinching. I enjoy being strong and like breaking things.",
    "ideals": "Sincerity. There's no good in pretending to be something I'm not.",
    "bonds": "I'll never forget the crushing defeat my company suffered or the enemies who dealt it.",
    "flaws": "My hatred of my enemies is blind and unreasoning.",
    "backstory": "Veteran soldier..."
  },
  "spellcasting": {
    "spellcastingClass": "",
    "spellcastingAbility": "",
    "spellSaveDc": 0,
    "spellAttackBonus": 0,
    "slots": {},
    "spellsList": []
  },
  "features": [
    "Rage (4/Long Rest)",
    "Reckless Attack",
    "Frenzy (+2d6 damage)",
    "Mindless Rage",
    "Extra Attack",
    "Fast Movement (+10 ft)",
    "Danger Sense",
    "Cloud's Jaunt (3/Long Rest)",
    "Large Form (1/Long Rest)",
    "Savage Attacker",
    "Weapon Mastery (Greataxe Cleave, Trident/Maul Topple)"
  ],
  "spells": [],
  "notes": "Stalwart frontline combatant with massive Greataxe damage, Adamantine armor critical hit immunity, and tactical teleportation."
}

${additionalNotes ? `Additional DM notes: ${additionalNotes}` : ''}
Extract clean text without markdown formatting outside the JSON (no \\\`\\\`\\\`json fences, just raw JSON).
`;

    const response = await generateContentWithFallback(ai, {
      preferredModel: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            inlineDataPart,
            { text: promptText }
          ]
        }
      ]
    });

    let rawText = response.text || "{}";
    rawText = rawText.trim();
    if (rawText.startsWith("```json")) {
      rawText = rawText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    let parsedData: any = {};
    try {
      parsedData = JSON.parse(rawText);
    } catch (parseErr) {
      console.warn("[parse-character-sheet] Direct JSON parse failed, attempting regex extract:", parseErr);
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Model response was not valid JSON");
      }
    }

    res.json({ success: true, character: parsedData });
  } catch (err: any) {
    console.error("[AI] parse-character-sheet error:", err);
    res.status(500).json({ error: err.message || "Failed to digest PDF character sheet" });
  }
});

/**
 * POST /api/ai/analyze-grid
 * AI Vision Analysis: Detects physical grid lines on a battlemap image,
 * counts column/row density, calculates exact pixel grid size and (X, Y) pixel alignment offsets.
 */
aiRouter.post("/analyze-grid", async (req, res) => {
  try {
    const { imageUrl, mapWidth, mapHeight } = req.body || {};

    if (!imageUrl) {
      return res.status(400).json({ error: "Missing required imageUrl parameter" });
    }

    const width = Number(mapWidth) > 0 ? Number(mapWidth) : 1500;
    const height = Number(mapHeight) > 0 ? Number(mapHeight) : 1000;
    const ai = getAI();

    const inlineDataPart = await resolveImageToInlineData(imageUrl);

    if (!inlineDataPart) {
      // Heuristic fallback if image couldn't be loaded as binary
      const estimatedCols = Math.max(10, Math.round(width / 70));
      const estimatedRows = Math.max(10, Math.round(height / 70));
      const estimatedSize = Math.round(width / estimatedCols);
      return res.json({
        success: true,
        hasGrid: true,
        cols: estimatedCols,
        rows: estimatedRows,
        gridSize: estimatedSize,
        gridOffsetX: 0,
        gridOffsetY: 0,
        confidence: 0.7,
        notes: "Calculated from aspect ratio heuristics."
      });
    }

    const promptText = `
You are an expert Virtual Tabletop (VTT) Cartographer and Computer Vision AI specialized in analyzing tactical battlemaps for D&D / RPG games.
Carefully examine this battlemap image to detect the printed physical grid lines (square tiles, stone floor grids, etched lines, crosshairs, or hex grids).

Map Image Dimensions:
- Width: ${width}px
- Height: ${height}px
- Aspect Ratio: ${(width / height).toFixed(3)}

Your Objective:
1. Detect whether this map image has visible printed grid lines or tile boundaries.
2. Count or calculate the total number of grid cells across the horizontal width (cols) and vertical height (rows). Standard battlemaps typically have between 15 and 60 squares across (e.g. 20x15, 24x18, 30x20, 32x18, 40x30, 48x27, 50x35, etc.).
3. Identify the pixel size of each grid square: gridSize = Math.round(${width} / cols).
4. Measure the starting top-left offset in pixels where the first grid line or border starts:
   - gridOffsetX: pixel distance from the left edge of the image to the first vertical grid line (0 to gridSize-1)
   - gridOffsetY: pixel distance from the top edge of the image to the first horizontal grid line (0 to gridSize-1)

Return ONLY a valid JSON object without markdown fences matching this exact schema:
{
  "hasGrid": true,
  "gridType": "square",
  "cols": number,
  "rows": number,
  "gridSize": number,
  "gridOffsetX": number,
  "gridOffsetY": number,
  "confidence": number,
  "notes": "string explaining how the grid was aligned"
}
`;

    const response = await generateContentWithFallback(ai, {
      preferredModel: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            inlineDataPart,
            { text: promptText }
          ]
        }
      ]
    });

    let rawText = response.text || "{}";
    rawText = rawText.trim();
    if (rawText.startsWith("```json")) {
      rawText = rawText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    let parsedData: any = {};
    try {
      parsedData = JSON.parse(rawText);
    } catch (parseErr) {
      console.warn("[analyze-grid] JSON parse failed, attempting regex extract:", parseErr);
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Model response was not valid JSON");
      }
    }

    const cols = Number(parsedData.cols) > 0 ? Number(parsedData.cols) : Math.round(width / 70);
    const rows = Number(parsedData.rows) > 0 ? Number(parsedData.rows) : Math.round(height / 70);
    let calculatedGridSize = Number(parsedData.gridSize) > 0 ? Number(parsedData.gridSize) : Math.round(width / cols);
    calculatedGridSize = Math.max(10, Math.min(400, calculatedGridSize));

    let offsetX = Number(parsedData.gridOffsetX) || 0;
    let offsetY = Number(parsedData.gridOffsetY) || 0;
    offsetX = ((offsetX % calculatedGridSize) + calculatedGridSize) % calculatedGridSize;
    offsetY = ((offsetY % calculatedGridSize) + calculatedGridSize) % calculatedGridSize;

    res.json({
      success: true,
      hasGrid: parsedData.hasGrid !== false,
      gridType: parsedData.gridType || "square",
      cols,
      rows,
      gridSize: calculatedGridSize,
      gridOffsetX: offsetX,
      gridOffsetY: offsetY,
      confidence: parsedData.confidence || 0.9,
      notes: parsedData.notes || "Grid successfully aligned using Gemini Vision AI"
    });
  } catch (err: any) {
    console.error("[AI] analyze-grid error:", err);
    res.status(500).json({ error: err.message || "Failed to analyze map grid" });
  }
});

/**
 * POST /api/ai/digest-chapter-pdf
 * Ingests and digests a D&D 5e adventure chapter PDF or document.
 * Extracts chapter narrative arc, scene associations, and all numbered room keys/zones
 * with their associated roomNumber, roomName, read-aloud boxedText, and dmNotes.
 */
aiRouter.post("/digest-chapter-pdf", async (req, res) => {
  const {
    pdfPath,
    pdfFilename,
    chapterTitle = "Chapter",
    campaignTitle = "Campaign",
    existingScenes = [],
    textSnippet = ""
  } = req.body || {};

  try {
    const ai = getAI();
    let contentsParts: any[] = [];

    if (pdfPath) {
      const resolved = await resolveImageToInlineData(pdfPath);
      if (resolved) {
        contentsParts.push(resolved);
      }
    }

    const sceneContext = Array.isArray(existingScenes) && existingScenes.length > 0
      ? `Existing scenes in this chapter:\n${existingScenes.map((s: any, idx: number) => `${idx + 1}. "${s.sceneTitle}" (ID: ${s.sceneId || idx})`).join("\n")}`
      : "No existing scenes yet defined in this chapter. Please identify and suggest recommended scenes from the chapter's locations and narrative progression.";

    const promptText = `You are a master Dungeons & Dragons 5e Cartographer and Dungeon Master AI Oracle.
Your task is to analyze and digest this D&D adventure module chapter document: "${chapterTitle}" (Campaign: "${campaignTitle}").

${sceneContext}

${textSnippet ? `Document text excerpt:\n${textSnippet.slice(0, 10000)}\n` : ""}

For ALL extracted text fields (including boxedText, dmNotes, digestSummary, and summaries), you MUST preserve the original document's formatting (bolding, italics, links, paragraph breaks, and spacing). Do not strip, summarize, or normalize the formatting.

Analyze the document with deep precision to extract:
1. "adventureTitle": Title of the adventure or campaign module (e.g. "Keys from the Golden Vault", "Vecna: Eve of Ruin", or chapter source).
2. "chapterTitle": The specific chapter title.
3. "digestSummary": A comprehensive 2-3 paragraph summary of this chapter: the main quest, narrative stakes, villain objectives, key allies, and major challenges.
4. "scenes": An array of scenes covering this chapter. For each existing scene (or newly discovered scene), provide:
   - "sceneId": existing sceneId if it matches an existing scene, or null
   - "sceneTitle": clear scene name (e.g. "Guildhouse Infiltration", "The Grand Ballroom Heist")
   - "summary": tactical & narrative overview of this scene
   - "keyNpcs": array of notable NPCs, monsters, or villains present
   - "trapsAndHazards": traps, environmental hazards, or alarm triggers
   - "loot": treasure, magic items, or clues
   - "suggestedDmNotes": markdown DM guide with DCs, perception checks, and enemy tactics
   - "boxedText": evocative read-aloud player boxed text
   - "roomNumbers": array of room numbers/keys located in this scene (e.g. ["G1", "G2", "G3"])
5. "rooms": A comprehensive array of EVERY numbered location / room key in this chapter (e.g. "G1", "G2", "Room 1", "Area 12", "T4", etc.).
   For EACH numbered room, provide:
   - "roomNumber": The exact identifier code/number (e.g. "G1", "1", "G10", "Area 5")
   - "roomName": The official name of the room/area (e.g. "The Parlor", "Guard Barracks", "Vault of the Sinner")
   - "boxedText": This MUST be the EXACT, verbatim read-aloud player boxed text transcribed word-for-word from the PDF source document. Do NOT summarize, paraphrase, or interpret. Must be 100% exact text.
   - "dmNotes": This MUST be the EXACT, verbatim room notes, descriptions, secrets, traps, DCs, tactics, and statistics transcribed word-for-word from the PDF source document. Do NOT summarize, synthesize, paraphrase, or interpret. We need EXACTLY what is written in the PDF, with zero interpretation or summary.
   - "monsters": Array of creatures in this room (e.g. ["3x Thug", "1x Spy"])
   - "treasure": Array of treasure in this room
   - "sceneTitle": Which scene this room best belongs to

Respond with ONLY valid JSON strictly adhering to this structure:
{
  "adventureTitle": "string",
  "chapterTitle": "string",
  "digestSummary": "string",
  "scenes": [
    {
      "sceneId": "string or null",
      "sceneTitle": "string",
      "summary": "string",
      "keyNpcs": ["string"],
      "trapsAndHazards": ["string"],
      "loot": ["string"],
      "suggestedDmNotes": "string",
      "boxedText": "string",
      "roomNumbers": ["string"]
    }
  ],
  "rooms": [
    {
      "roomNumber": "string",
      "roomName": "string",
      "boxedText": "string",
      "dmNotes": "string",
      "monsters": ["string"],
      "treasure": ["string"],
      "sceneTitle": "string"
    }
  ]
}`;

    contentsParts.push({ text: promptText });

    const response = await generateContentWithFallback(ai, {
      preferredModel: "gemini-2.5-flash",
      contents: { parts: contentsParts },
      config: {
        systemInstruction: "You are an expert RPG adventure module archivist. Your absolute core directive is VERBATIM ACCURACY. For every room/area in the document, you must transcribe the exact, word-for-word text from the PDF under both `boxedText` and `dmNotes`. Absolutely DO NOT summarize, interpret, paraphrase, synthesize, or add AI explanations. Provide the pure, original text exactly as written in the source document."
      }
    });

    let rawText = response.text || "{}";
    rawText = rawText.trim();
    if (rawText.startsWith("```json")) {
      rawText = rawText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    let digest: any = {};
    try {
      digest = JSON.parse(rawText);
    } catch (parseErr) {
      console.warn("[digest-chapter-pdf] JSON parse error, trying regex:", parseErr);
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        digest = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Gemini response could not be parsed into chapter digest JSON");
      }
    }

    digest.scenes = Array.isArray(digest.scenes) ? digest.scenes : [];
    digest.rooms = Array.isArray(digest.rooms) ? digest.rooms : [];
    digest.pdfFilename = pdfFilename || (pdfPath ? pdfPath.split('/').pop() : "chapter_adventure.pdf");
    digest.pdfUrl = pdfPath || "";
    digest.digestedAt = Date.now();

    res.json({
      success: true,
      digest
    });
  } catch (err: any) {
    console.error("[AI] digest-chapter-pdf error:", err);
    let errMsg = err.message || "Failed to digest chapter PDF";
    if (errMsg.includes("prepayment credits") || errMsg.includes("RESOURCE_EXHAUSTED") || err.status === 402) {
      errMsg = "Gemini API quota or prepayment credits are depleted for this API key. Please check your billing or credits on Google AI Studio (https://ai.studio/projects).";
    }
    res.status(err.status === 402 ? 402 : 500).json({ error: errMsg });
  }
});

/**
 * POST /api/ai/ingest-chapter-pdf
 * Comprehensive pipeline analysis for D&D chapter PDFs:
 * Extracts chapter title, scenes, battlemap page numbers, and all room annotations with normalized bounds.
 */
aiRouter.post("/ingest-chapter-pdf", async (req, res) => {
  const {
    pdfPath,
    pdfBase64,
    chapterTitle = "Adventure Chapter",
    campaignTitle = "Campaign"
  } = req.body || {};

  try {
    const ai = getAI();
    let contentsParts: any[] = [];

    if (pdfPath) {
      const resolved = await resolveImageToInlineData(pdfPath);
      if (resolved) {
        contentsParts.push(resolved);
      }
    } else if (pdfBase64) {
      let cleanData = pdfBase64;
      let mimeType = "application/pdf";
      if (cleanData.startsWith("data:")) {
        const matches = cleanData.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          cleanData = matches[2];
        }
      }
      contentsParts.push({
        inlineData: {
          mimeType,
          data: cleanData
        }
      });
    }

    if (contentsParts.length === 0) {
      return res.status(400).json({ error: "No PDF file path or base64 data provided" });
    }

    const promptText = `You are a master Dungeons & Dragons 5e Cartographer, Tactical Map Architect, and Dungeon Master AI Oracle.
Your task is to analyze this official D&D adventure module PDF: "${chapterTitle}" (Campaign: "${campaignTitle}").

Carefully inspect the entire document (pages, text, and battlemaps) to identify:
1. The chapter title ("chapterTitle").
2. Every scene or encounter area ("scenes").
   For each scene:
   - "sceneTitle": clear title of the location or battlemap (e.g. "The Sunken Vault", "Gilded Manor Ground Floor", "Catacombs of the Sinner").
   - "mapPageNumber": 1-based PDF page number where the battlemap or tactical floorplan appears in this PDF document (if applicable, e.g. 4 or 7).
   - "rooms": array of every distinct numbered or keyed room/chamber in this scene.
     For each room:
     - "roomNumber": exact room identifier (e.g. "1", "2", "G1", "T4", "Area A").
     - "roomName": descriptive room name (e.g. "Entry Hall", "Guard Barracks", "Torture Chamber").
     - "boxedText": EXACT, verbatim read-aloud boxed text intended to be read aloud to players when entering.
     - "dmNotes": verbatim or detailed DM instructions, traps, DC perception/investigation checks, secrets, puzzle clues, and enemy combat tactics.
     - "monsters": array of creatures/monsters present (e.g. ["2x Bugbear", "4x Goblin"]).
     - "approximateNormalizedBounds": normalized bounding rectangle { "x": number, "y": number, "width": number, "height": number } (values from 0 to 100 percentage) estimating where this room is located on the tactical battlemap image for this scene:
       - x: percentage from left edge (0 to 100)
       - y: percentage from top edge (0 to 100)
       - width: percentage width of the room (e.g. 15 to 35)
       - height: percentage height of the room (e.g. 15 to 30)

You MUST respond with ONLY a valid JSON object strictly matching this interface:
{
  "chapterTitle": "string",
  "allMonsters": [
    "string (deduplicated comprehensive array of every monster, foe, adversary, creature, or NPC statblock named or encountered in this chapter, e.g. 'Ghoul', 'Ghast', 'Shadow', 'Animated Armor')"
  ],
  "scenes": [
    {
      "sceneTitle": "string",
      "mapPageNumber": 1,
      "rooms": [
        {
          "roomNumber": "string",
          "roomName": "string",
          "boxedText": "string",
          "dmNotes": "string",
          "monsters": ["string"],
          "approximateNormalizedBounds": {
            "x": 10,
            "y": 15,
            "width": 25,
            "height": 20
          }
        }
      ]
    }
  ]
}`;

    contentsParts.push({ text: promptText });

    const response = await generateContentWithFallback(ai, {
      preferredModel: "gemini-2.5-flash",
      contents: { parts: contentsParts },
      config: {
        systemInstruction: "You are an expert RPG adventure cartographer. Your mission is to analyze D&D adventure PDFs and extract scenes, battlemap page locations, and room details with verbatim boxed text, DM notes, and approximate map coordinates.",
        responseMimeType: "application/json"
      }
    });

    let rawText = response.text || "{}";
    rawText = rawText.trim();
    if (rawText.startsWith("```json")) {
      rawText = rawText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    let parsedChapter: any = {};
    try {
      parsedChapter = JSON.parse(rawText);
    } catch (parseErr) {
      console.warn("[ingest-chapter-pdf] JSON parse error, trying regex:", parseErr);
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedChapter = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Gemini response could not be parsed into chapter JSON");
      }
    }

    if (!parsedChapter.chapterTitle) parsedChapter.chapterTitle = chapterTitle;
    if (!Array.isArray(parsedChapter.allMonsters)) parsedChapter.allMonsters = [];
    if (!Array.isArray(parsedChapter.scenes)) parsedChapter.scenes = [];

    // Sanitize rooms and bounds
    for (const scene of parsedChapter.scenes) {
      if (!Array.isArray(scene.rooms)) scene.rooms = [];
      for (const room of scene.rooms) {
        if (!room.monsters) room.monsters = [];
        if (!room.approximateNormalizedBounds) {
          room.approximateNormalizedBounds = { x: 20, y: 20, width: 25, height: 20 };
        } else {
          room.approximateNormalizedBounds.x = Number(room.approximateNormalizedBounds.x) || 10;
          room.approximateNormalizedBounds.y = Number(room.approximateNormalizedBounds.y) || 10;
          room.approximateNormalizedBounds.width = Number(room.approximateNormalizedBounds.width) || 20;
          room.approximateNormalizedBounds.height = Number(room.approximateNormalizedBounds.height) || 20;
        }
      }
    }

    res.json({
      success: true,
      parsedChapter
    });
  } catch (err: any) {
    console.error("[AI] ingest-chapter-pdf error:", err);
    res.status(500).json({ error: err.message || "Failed to ingest chapter PDF" });
  }
});

/**
 * Helper to download an image from a URL and save it locally on the server
 */
async function downloadAndSaveMonsterImage(imageUrl: string, prefix: string = 'token'): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('image')) return null;

    let ext = '.png';
    if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = '.jpg';
    else if (contentType.includes('webp')) ext = '.webp';

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length < 500) return null;

    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const filename = `${cleanPrefix}_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${filename}`;
  } catch (err: any) {
    console.warn(`[downloadAndSaveMonsterImage] Failed for ${imageUrl}:`, err.message);
    return null;
  }
}

/**
 * Helper to scrape D&D Beyond monster page for high-res official artwork
 */
async function fetchDndBeyondMonsterImage(dndBeyondUrl: string): Promise<string | null> {
  try {
    const res = await fetch(dndBeyondUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!res.ok) return null;
    const html = await res.text();

    // 1. High-res 1000x1000 thumbnail
    const thumbMatch = html.match(/https:\/\/(?:media|www)\.dndbeyond\.com\/avatars\/thumbnails\/\d+\/\d+\/1000\/1000\/\d+\.(?:png|jpg|jpeg)/i);
    if (thumbMatch) return thumbMatch[0];

    // 2. Standard avatar image
    const avatarMatch = html.match(/https:\/\/(?:media|www)\.dndbeyond\.com\/avatars\/\d+\/\d+\/\d+\.(?:png|jpg|jpeg)/i);
    if (avatarMatch) return avatarMatch[0];

    return null;
  } catch (err: any) {
    console.warn(`[fetchDndBeyondMonsterImage] Error on ${dndBeyondUrl}:`, err.message);
    return null;
  }
}

/**
 * Fallback to generate an official circular RPG battle token portrait via Imagen 3
 */
async function generateMonsterTokenImage(ai: GoogleGenAI, monsterName: string, creatureType?: string): Promise<string | null> {
  try {
    const prompt = `A top-down circular RPG tabletop battle token portrait of a ${monsterName} (${creatureType || 'creature'}), detailed fantasy character art, dramatic lighting, centered, isolated on dark background, fantasy tabletop RPG token portrait`;
    const imagenRes = await (ai.models as any).generateImages({
      model: "imagen-3.0-generate-002",
      prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: "1:1",
        outputMimeType: "image/png"
      }
    });
    const imgBytes = imagenRes.generatedImages?.[0]?.image?.imageBytes;
    if (imgBytes) {
      const buffer = Buffer.from(imgBytes, 'base64');
      const uploadsDir = path.resolve(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const cleanSlug = monsterName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const filename = `token_${cleanSlug}_${Date.now()}_${Math.round(Math.random() * 1e6)}.png`;
      fs.writeFileSync(path.join(uploadsDir, filename), buffer);
      return `/uploads/${filename}`;
    }
  } catch (err: any) {
    console.warn(`[generateMonsterTokenImage] Imagen generation failed for ${monsterName}:`, err?.message || err);
  }
  return null;
}

/**
 * POST /api/ai/search-and-ingest-monster
 * Searches Google for official 5e statblock, fetches/generates token image, and returns Monster object
 */
aiRouter.post("/search-and-ingest-monster", async (req, res) => {
  const { monsterName } = req.body || {};
  if (!monsterName || typeof monsterName !== 'string' || !monsterName.trim()) {
    return res.status(400).json({ error: "Missing monsterName in request body" });
  }

  const cleanName = monsterName.trim().replace(/^[\d\s]+x?\s*/i, '').replace(/^(a|an|the)\s+/i, '');

  try {
    const ai = getAI();

    const searchPrompt = `Search Google for "${cleanName} DND 5E" (focus on official 5th edition sources: D&D Beyond, 5e SRD, Roll20).
Extract the official 5th Edition D&D statblock and return a valid JSON object strictly matching this schema:
{
  "name": "${cleanName}",
  "size": "Tiny" | "Small" | "Medium" | "Large" | "Huge" | "Gargantuan",
  "type": "creature type (e.g. Undead, Fiend, Humanoid, Beast, Construct, Monstrosity)",
  "alignment": "e.g. Neutral Evil, Chaotic Evil, Unaligned",
  "ac": 12,
  "acNotes": "",
  "hp": 22,
  "hpFormula": "(5d8)",
  "speed": "30 ft., fly 60 ft.",
  "initiativeBonus": 2,
  "str": 13, "dex": 15, "con": 10, "int": 7, "wis": 10, "cha": 6,
  "savingThrows": "e.g. Wis +2 or empty string",
  "skills": "e.g. Perception +4, Stealth +6 or empty string",
  "damageResistances": "string",
  "damageVulnerabilities": "string",
  "damageImmunities": "string",
  "conditionImmunities": "string",
  "senses": "e.g. Darkvision 60 ft., Passive Perception 10",
  "languages": "string",
  "challenge": "1",
  "proficiencyBonus": 2,
  "traits": [
    { "name": "string", "description": "string" }
  ],
  "actions": [
    { "name": "string", "description": "string", "type": "attack", "attackBonus": 4, "damage": "string" }
  ],
  "bonusActions": [
    { "name": "string", "description": "string" }
  ],
  "reactions": [
    { "name": "string", "description": "string" }
  ],
  "legendaryActions": [
    { "name": "string", "description": "string" }
  ],
  "legendaryDescription": "string",
  "dndBeyondUrl": "https://www.dndbeyond.com/monsters/...",
  "directArtworkUrl": ""
}`;

    const response = await generateContentWithFallback(ai, {
      preferredModel: "gemini-3.5-flash",
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });


    let raw = response.text || "{}";
    raw = raw.trim();
    if (raw.startsWith("```json")) raw = raw.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    else if (raw.startsWith("```")) raw = raw.replace(/^```\s*/, "").replace(/\s*```$/, "");

    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    // Resolve monster token image
    let localTokenUrl: string | null = null;
    const cleanSlug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_');

    // 1. Try D&D Beyond page if found
    if (parsed.dndBeyondUrl && typeof parsed.dndBeyondUrl === 'string' && parsed.dndBeyondUrl.startsWith('http')) {
      const imgFromPage = await fetchDndBeyondMonsterImage(parsed.dndBeyondUrl);
      if (imgFromPage) {
        localTokenUrl = await downloadAndSaveMonsterImage(imgFromPage, `token_${cleanSlug}`);
      }
    }

    // 2. Try direct artwork URL if found
    if (!localTokenUrl && parsed.directArtworkUrl && typeof parsed.directArtworkUrl === 'string' && parsed.directArtworkUrl.startsWith('http')) {
      localTokenUrl = await downloadAndSaveMonsterImage(parsed.directArtworkUrl, `token_${cleanSlug}`);
    }

    // 3. Fallback to Imagen 3 battle token generation
    if (!localTokenUrl) {
      localTokenUrl = await generateMonsterTokenImage(ai, cleanName, parsed.type);
    }

    // 4. Ultimate fallback placeholder
    if (!localTokenUrl) {
      localTokenUrl = '/uploads/file-1792077381663-439615846.png';
    }

    const monsterId = `monster_${cleanSlug}_${Date.now()}`;
    const fullMonster = {
      monsterId,
      name: parsed.name || cleanName,
      size: parsed.size || 'Medium',
      type: parsed.type || 'Monstrosity',
      alignment: parsed.alignment || 'Unaligned',
      ac: Number(parsed.ac) || 10,
      acNotes: parsed.acNotes || '',
      hp: Number(parsed.hp) || 10,
      hpFormula: parsed.hpFormula || '',
      speed: parsed.speed || '30 ft.',
      initiativeBonus: Number(parsed.initiativeBonus) || 0,
      str: Number(parsed.str) || 10,
      dex: Number(parsed.dex) || 10,
      con: Number(parsed.con) || 10,
      int: Number(parsed.int) || 10,
      wis: Number(parsed.wis) || 10,
      cha: Number(parsed.cha) || 10,
      savingThrows: parsed.savingThrows || '',
      skills: parsed.skills || '',
      damageResistances: parsed.damageResistances || '',
      damageVulnerabilities: parsed.damageVulnerabilities || '',
      damageImmunities: parsed.damageImmunities || '',
      conditionImmunities: parsed.conditionImmunities || '',
      senses: parsed.senses || '',
      languages: parsed.languages || '',
      challenge: String(parsed.challenge || '1'),
      proficiencyBonus: Number(parsed.proficiencyBonus) || 2,
      avatarUrl: localTokenUrl,
      traits: Array.isArray(parsed.traits) ? parsed.traits : [],
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      bonusActions: Array.isArray(parsed.bonusActions) ? parsed.bonusActions : [],
      reactions: Array.isArray(parsed.reactions) ? parsed.reactions : [],
      legendaryActions: Array.isArray(parsed.legendaryActions) ? parsed.legendaryActions : [],
      legendaryDescription: parsed.legendaryDescription || '',
      source: 'Google Search / D&D Beyond 5e',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    res.json({
      success: true,
      monster: fullMonster
    });
  } catch (err: any) {
    console.error(`[AI] search-and-ingest-monster error for "${cleanName}":`, err);
    res.status(500).json({ error: err.message || `Failed to search and ingest monster ${cleanName}` });
  }
});

/**
 * POST /api/ai/batch-search-and-ingest-monsters
 * Ingests a list of monster names concurrently
 */
aiRouter.post("/batch-search-and-ingest-monsters", async (req, res) => {
  const { monsterNames } = req.body || {};
  if (!Array.isArray(monsterNames) || monsterNames.length === 0) {
    return res.json({ success: true, monsters: [] });
  }

  // Deduplicate names
  const uniqueNames = [...new Set(
    monsterNames
      .map(n => typeof n === 'string' ? n.trim().replace(/^[\d\s]+x?\s*/i, '').replace(/^(a|an|the)\s+/i, '') : '')
      .filter(n => n.length > 1)
  )];

  const results: any[] = [];
  const limit = 2;

  for (let i = 0; i < uniqueNames.length; i += limit) {
    const chunk = uniqueNames.slice(i, i + limit);
    const chunkResults = await Promise.allSettled(
      chunk.map(async (name) => {
        const fetchRes = await fetch(`http://localhost:3000/api/ai/search-and-ingest-monster`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ monsterName: name })
        });
        if (!fetchRes.ok) throw new Error(`Failed to ingest ${name}`);
        const data = await fetchRes.json();
        return data.monster;
      })
    );

    for (const r of chunkResults) {
      if (r.status === 'fulfilled' && r.value) {
        results.push(r.value);
      }
    }
  }

  res.json({
    success: true,
    monsters: results
  });
});

aiRouter.post("/antigravity", async (req, res) => {
  const { prompt, environment = "remote" } = req.body || {};
  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  try {
    const ai = getAI();
    const interaction = await ai.interactions.create({
      agent: "antigravity-preview-09-2026",
      input: prompt,
      environment: environment,
    }, { timeout: 300000 });

    let fullOutput = "";
    for (const step of interaction.steps) {
      if (step.type === 'model_output') {
        const textContent = step.content?.find(c => c.type === 'text');
        if (textContent && textContent.text) {
          fullOutput += textContent.text;
        }
      }
    }

    res.json({ text: fullOutput, steps: interaction.steps });
  } catch (err: any) {
    console.error("[AI] antigravity error:", err);
    res.status(500).json({ error: err.message || "Failed to interact with Antigravity agent" });
  }
});




