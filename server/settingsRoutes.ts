import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import {
  getCobaltToken,
  getDmCobaltToken,
  getAllDmCobaltEntries,
  DmCobaltTokenEntry
} from './ddbService';
import { GoogleGenAI } from '@google/genai';
import { initGeminiKeyPool } from './aiRoutes';

export const settingsRouter = Router();

const RENDER_SERVICE_ID = process.env.RENDER_SERVICE_ID || 'srv-db93bu3bc2fs73cn795g';
const RENDER_API_KEY = process.env.RENDER_API_KEY || 'rnd_M6nAOrAtFKciTjyntqu8Q9ZsNxXz';

const PERSISTED_CREDENTIAL_KEYS = [
  'DND_BEYOND_DM_COBALT_SESSIONS',
  'DND_BEYOND_DM_COBALT_SESSION',
  'DND_BEYOND_COBALT_SESSION',
  'DND_BEYOND_CAMPAIGN_ID',
  'GEMINI_API_KEY',
  'GEMINI_FALLBACK_KEYS',
  'ELEVENLABS_API_KEY'
] as const;

// Asynchronously syncs a credential change to Render's persistent Environment Variables API
async function syncRenderEnvVar(key: string, value: string | null) {
  if (!RENDER_SERVICE_ID || !RENDER_API_KEY) return;
  try {
    const url = `https://api.render.com/v1/services/${RENDER_SERVICE_ID}/env-vars/${encodeURIComponent(key)}`;
    if (value === null) {
      await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${RENDER_API_KEY}`,
          'Accept': 'application/json'
        }
      });
      console.log(`[Settings] Removed ${key} from Render persistent environment variables.`);
    } else {
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${RENDER_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ value: value.trim() })
      });
      if (res.ok) {
        console.log(`[Settings] Persisted ${key} to Render environment variables.`);
      } else {
        console.warn(`[Settings] Render env-var sync returned HTTP ${res.status} for ${key}`);
      }
    }
  } catch (err: any) {
    console.warn(`[Settings] Failed to sync ${key} to Render env vars:`, err.message);
  }
}

// Asynchronously backs up current credential state to Firestore so container restarts never lose uploaded keys
async function syncCredentialsToFirestore() {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) return;
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const { initializeApp, getApps } = await import('firebase/app');
    const { getFirestore, doc, setDoc } = await import('firebase/firestore');
    const fbApp = getApps().length ? getApps()[0] : initializeApp(config);
    const db = getFirestore(fbApp, config.firestoreDatabaseId);

    const payload: Record<string, string | null> = {};
    for (const k of PERSISTED_CREDENTIAL_KEYS) {
      payload[k] = process.env[k] || null;
    }

    await setDoc(doc(db, 'activeSession', 'server_credentials_backup'), {
      credentials: payload,
      updatedAt: Date.now()
    }, { merge: true });
    console.log('[Settings] Backed up credentials to Firestore (activeSession/server_credentials_backup).');
  } catch (err: any) {
    console.warn('[Settings] Failed to back up credentials to Firestore:', err.message);
  }
}

// Hydrate any saved credentials from Firestore on server boot if missing from process.env
export async function hydratePersistedSettings() {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) return;
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const { initializeApp, getApps } = await import('firebase/app');
    const { getFirestore, doc, getDoc } = await import('firebase/firestore');
    const fbApp = getApps().length ? getApps()[0] : initializeApp(config);
    const db = getFirestore(fbApp, config.firestoreDatabaseId);

    const snap = await getDoc(doc(db, 'activeSession', 'server_credentials_backup'));
    if (!snap.exists()) return;
    const data = snap.data();
    const creds = data?.credentials;
    if (!creds || typeof creds !== 'object') return;

    let restoredCount = 0;
    for (const k of PERSISTED_CREDENTIAL_KEYS) {
      const savedVal = creds[k];
      if (typeof savedVal === 'string' && savedVal.trim().length > 0 && !process.env[k]) {
        process.env[k] = savedVal.trim();
        restoredCount++;
      }
    }
    if (restoredCount > 0) {
      console.log(`[Settings] Hydrated ${restoredCount} persisted credential(s) from Firestore backup.`);
      try {
        initGeminiKeyPool();
      } catch {
        // ignore
      }
    }
  } catch (err: any) {
    console.warn('[Settings] Failed to hydrate persisted settings from Firestore:', err.message);
  }
}

// Auto-run hydration on module load
hydratePersistedSettings();

// Helper to remove or update an environment variable in root .env file + Render API + Firestore backup
function updateEnvFile(key: string, value: string | null) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';

    const regex = new RegExp(`^${key}=.*(\r?\n|$)`, 'm');

    if (value === null) {
      if (regex.test(content)) {
        content = content.replace(regex, '');
      }
      delete process.env[key];
    } else {
      const cleanVal = value.trim();
      process.env[key] = cleanVal;
      if (regex.test(content)) {
        content = content.replace(regex, `${key}="${cleanVal}"\n`);
      } else {
        content += (content.endsWith('\n') || content.length === 0 ? '' : '\n') + `${key}="${cleanVal}"\n`;
      }
    }

    try {
      fs.writeFileSync(envPath, content.trim() + '\n', 'utf-8');
    } catch {
      // Ignore read-only filesystem errors in cloud containers
    }

    // Persist asynchronously to Render Environment Variables & Firestore backup
    void syncRenderEnvVar(key, value);
    void syncCredentialsToFirestore();

    return true;
  } catch (err: any) {
    console.warn(`[Settings] Failed to update .env for key ${key}:`, err.message);
    return false;
  }
}

// Helper to save the full list of DM Cobalt keys
function saveDmTokensList(entries: DmCobaltTokenEntry[]) {
  if (entries.length === 0) {
    updateEnvFile('DND_BEYOND_DM_COBALT_SESSIONS', null);
    updateEnvFile('DND_BEYOND_DM_COBALT_SESSION', null);
  } else {
    updateEnvFile('DND_BEYOND_DM_COBALT_SESSIONS', JSON.stringify(entries));
    // Set first key as primary legacy variable for backwards compatibility
    updateEnvFile('DND_BEYOND_DM_COBALT_SESSION', entries[0].token);
  }
}

// Helper to get fallback Gemini keys
function getGeminiFallbackKeys(): string[] {
  const env = (process.env.GEMINI_FALLBACK_KEYS || '').trim();
  if (!env) return [];
  return env.split(',').map(k => k.trim()).filter(k => k.length > 10);
}

// Helper to save fallback Gemini keys
function saveGeminiFallbackKeys(keys: string[]) {
  if (keys.length === 0) {
    updateEnvFile('GEMINI_FALLBACK_KEYS', null);
  } else {
    updateEnvFile('GEMINI_FALLBACK_KEYS', keys.join(','));
  }
  try {
    initGeminiKeyPool();
  } catch {
    // Ignore pool reload error
  }
}

// GET /api/settings/status - Returns status of all credentials and multiple keys
settingsRouter.get('/status', (req: Request, res: Response) => {
  const cobalt = getCobaltToken();
  const dmTokens = getAllDmCobaltEntries();
  const campaignId = process.env.DND_BEYOND_CAMPAIGN_ID || null;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || null;
  const geminiFallbacks = getGeminiFallbackKeys();
  const elevenKey = process.env.ELEVENLABS_API_KEY || null;

  res.json({
    cobalt: {
      dmTokens: dmTokens.map((e, idx) => ({
        id: e.id,
        label: e.label || `DM Key #${idx + 1}`,
        preview: e.token.length > 8 ? `${e.token.slice(0, 4)}...${e.token.slice(-4)}` : 'Active',
        hasToken: true
      })),
      hasDmToken: dmTokens.length > 0,
      dmTokenPreview: dmTokens[0]?.token ? `${dmTokens[0].token.slice(0, 4)}...${dmTokens[0].token.slice(-4)}` : null,
      hasToken: Boolean(cobalt && cobalt.trim().length > 15),
      tokenPreview: cobalt && cobalt.length > 8 ? `${cobalt.slice(0, 4)}...${cobalt.slice(-4)}` : null,
      campaignId: campaignId && campaignId.trim().length > 0 ? campaignId.trim() : null
    },
    gemini: {
      hasKey: Boolean(geminiKey && geminiKey.trim().length > 10 && !geminiKey.includes('PLACEHOLDER')),
      maskedKey: geminiKey && geminiKey.length > 8 ? `${geminiKey.slice(0, 4)}...${geminiKey.slice(-4)}` : null,
      fallbackKeys: geminiFallbacks.map((k, idx) => ({
        id: `fallback_${idx}`,
        label: `Fallback Key #${idx + 1}`,
        preview: `${k.slice(0, 4)}...${k.slice(-4)}`
      })),
      poolCount: (geminiKey ? 1 : 0) + geminiFallbacks.length
    },
    elevenlabs: {
      hasKey: Boolean(elevenKey && elevenKey.trim().length > 10 && !elevenKey.includes('PLACEHOLDER')),
      maskedKey: elevenKey && elevenKey.length > 8 ? `${elevenKey.slice(0, 4)}...${elevenKey.slice(-4)}` : null
    }
  });
});

// POST /api/settings/save-dm-token - Adds or updates a DM Cobalt token in the pool
settingsRouter.post('/save-dm-token', (req: Request, res: Response) => {
  try {
    const { id, label, token } = req.body;
    if (!token || typeof token !== 'string' || token.trim().length < 15) {
      return res.status(400).json({ error: 'Valid CobaltSession token string required (min 15 chars).' });
    }

    const cleanToken = token.trim();
    const cleanLabel = (label && typeof label === 'string' && label.trim().length > 0)
      ? label.trim()
      : undefined;

    const currentEntries = getAllDmCobaltEntries();

    if (id) {
      // Update existing entry
      const existingIdx = currentEntries.findIndex(e => e.id === id);
      if (existingIdx !== -1) {
        currentEntries[existingIdx].token = cleanToken;
        if (cleanLabel) currentEntries[existingIdx].label = cleanLabel;
      } else {
        currentEntries.push({
          id,
          label: cleanLabel || `DM Key #${currentEntries.length + 1}`,
          token: cleanToken
        });
      }
    } else {
      // Add new entry
      const newId = `dm_token_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      currentEntries.push({
        id: newId,
        label: cleanLabel || `DM Key #${currentEntries.length + 1}`,
        token: cleanToken
      });
    }

    saveDmTokensList(currentEntries);
    res.json({
      success: true,
      message: 'DM Cobalt token saved to active DM key pool.',
      totalDmTokens: currentEntries.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/delete-dm-token - Deletes a specific DM token by ID
settingsRouter.post('/delete-dm-token', (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Valid DM token ID required.' });
    }

    const currentEntries = getAllDmCobaltEntries();
    const filtered = currentEntries.filter(e => e.id !== id);

    saveDmTokensList(filtered);
    res.json({
      success: true,
      message: 'DM token removed from pool.',
      remainingDmTokens: filtered.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/save-gemini-fallback - Adds a fallback Gemini key
settingsRouter.post('/save-gemini-fallback', (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
      return res.status(400).json({ error: 'Valid Gemini API key required.' });
    }

    const clean = apiKey.trim();
    const current = getGeminiFallbackKeys();
    if (!current.includes(clean)) {
      current.push(clean);
      saveGeminiFallbackKeys(current);
    }

    res.json({ success: true, message: 'Fallback Gemini key added to pool.', totalKeys: current.length + 1 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/delete-gemini-fallback - Deletes a fallback Gemini key by index
settingsRouter.post('/delete-gemini-fallback', (req: Request, res: Response) => {
  try {
    const { index } = req.body;
    if (typeof index !== 'number') {
      return res.status(400).json({ error: 'Valid fallback key index required.' });
    }

    const current = getGeminiFallbackKeys();
    if (index >= 0 && index < current.length) {
      current.splice(index, 1);
      saveGeminiFallbackKeys(current);
    }

    res.json({ success: true, message: 'Fallback Gemini key removed.', totalKeys: current.length + 1 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/test-cobalt - Validates a CobaltSession cookie against D&D Beyond Auth API
settingsRouter.post('/test-cobalt', async (req: Request, res: Response) => {
  try {
    const { token, id, isDmToken } = req.body;
    let testToken = '';

    if (token && typeof token === 'string' && token.trim().length > 10) {
      testToken = token.trim();
    } else if (id) {
      const entry = getAllDmCobaltEntries().find(e => e.id === id);
      if (entry) testToken = entry.token;
    }

    if (!testToken) {
      testToken = isDmToken ? getDmCobaltToken() : getCobaltToken();
    }

    if (!testToken) {
      return res.status(400).json({ success: false, error: 'No CobaltSession token provided or configured.' });
    }

    const authRes = await fetch('https://auth-service.dndbeyond.com/v1/cobalt-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `CobaltSession=${testToken}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (authRes.ok) {
      const data = await authRes.json();
      if (data && data.token) {
        return res.json({
          success: true,
          message: 'CobaltSession token verified successfully! Connected to D&D Beyond.'
        });
      }
    }

    return res.status(401).json({
      success: false,
      error: `D&D Beyond rejected the token (HTTP ${authRes.status}). Please verify that you are logged into D&D Beyond and copied the full CobaltSession cookie.`
    });
  } catch (err: any) {
    console.error('[Settings] Error testing Cobalt token:', err);
    return res.status(500).json({ success: false, error: err.message || 'Network error verifying CobaltSession.' });
  }
});

// POST /api/settings/test-gemini - Validates a Gemini API Key
settingsRouter.post('/test-gemini', async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;
    const testKey = (apiKey && typeof apiKey === 'string' && apiKey.trim().length > 10)
      ? apiKey.trim()
      : (process.env.GEMINI_API_KEY || process.env.API_KEY);

    if (!testKey) {
      return res.status(400).json({ success: false, error: 'No Gemini API key provided or configured.' });
    }

    const ai = new GoogleGenAI({ apiKey: testKey });
    const testResult = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Ping test. Reply with: OK',
      config: { maxOutputTokens: 5 }
    });

    if (testResult && testResult.text) {
      return res.json({
        success: true,
        message: 'Gemini API Key is valid and active! Ready to power the AI Dungeon Master.'
      });
    }

    return res.json({ success: true, message: 'Gemini API Key verified successfully.' });
  } catch (err: any) {
    console.warn('[Settings] Error testing Gemini key:', err);
    return res.status(400).json({
      success: false,
      error: err.message || 'Gemini API Key rejected by Google AI Studio. Check that the key is active.'
    });
  }
});

// POST /api/settings/test-elevenlabs - Validates an ElevenLabs API Key
settingsRouter.post('/test-elevenlabs', async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;
    const testKey = (apiKey && typeof apiKey === 'string' && apiKey.trim().length > 10)
      ? apiKey.trim()
      : process.env.ELEVENLABS_API_KEY;

    if (!testKey) {
      return res.status(400).json({ success: false, error: 'No ElevenLabs API key provided or configured.' });
    }

    const userRes = await fetch('https://api.elevenlabs.io/v1/user', {
      method: 'GET',
      headers: {
        'xi-api-key': testKey
      }
    });

    if (userRes.ok) {
      const data = await userRes.json();
      const tier = data?.subscription?.tier || 'Free';
      const charCount = data?.subscription?.character_count ?? 0;
      const charLimit = data?.subscription?.character_limit ?? 0;
      return res.json({
        success: true,
        message: `ElevenLabs API Key is valid! Tier: ${tier} (${charCount}/${charLimit} characters used).`
      });
    }

    return res.status(401).json({
      success: false,
      error: `ElevenLabs rejected the API key (HTTP ${userRes.status}). Please check your key.`
    });
  } catch (err: any) {
    console.warn('[Settings] Error testing ElevenLabs key:', err);
    return res.status(500).json({ success: false, error: err.message || 'Network error verifying ElevenLabs key.' });
  }
});

// POST /api/settings/set-campaign-id - Sets active D&D Beyond campaign ID/URL
settingsRouter.post('/set-campaign-id', (req: Request, res: Response) => {
  try {
    const { campaignId } = req.body;
    let cleanId = typeof campaignId === 'string' ? campaignId.trim() : '';

    const urlMatch = cleanId.match(/campaigns\/([0-9]+)/i);
    if (urlMatch && urlMatch[1]) {
      cleanId = urlMatch[1];
    }

    if (cleanId) {
      updateEnvFile('DND_BEYOND_CAMPAIGN_ID', cleanId);
      res.json({ success: true, campaignId: cleanId, message: 'D&D Beyond Campaign ID updated.' });
    } else {
      updateEnvFile('DND_BEYOND_CAMPAIGN_ID', null);
      res.json({ success: true, campaignId: null, message: 'Campaign ID cleared.' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/wipe-single - Wipes a single credential category from .env & process.env
settingsRouter.post('/wipe-single', (req: Request, res: Response) => {
  try {
    const { target } = req.body;
    if (!target || typeof target !== 'string') {
      return res.status(400).json({ error: 'Target credential identifier required.' });
    }

    switch (target) {
      case 'dm_cobalt':
        updateEnvFile('DND_BEYOND_DM_COBALT_SESSIONS', null);
        updateEnvFile('DND_BEYOND_DM_COBALT_SESSION', null);
        break;
      case 'player_cobalt':
        updateEnvFile('DND_BEYOND_COBALT_SESSION', null);
        break;
      case 'campaign_id':
        updateEnvFile('DND_BEYOND_CAMPAIGN_ID', null);
        break;
      case 'gemini':
        updateEnvFile('GEMINI_API_KEY', null);
        updateEnvFile('GEMINI_FALLBACK_KEYS', null);
        updateEnvFile('API_KEY', null);
        initGeminiKeyPool();
        break;
      case 'elevenlabs':
        updateEnvFile('ELEVENLABS_API_KEY', null);
        break;
      default:
        return res.status(400).json({ error: `Unknown credential target: ${target}` });
    }

    return res.json({ success: true, message: `Successfully wiped ${target} credential.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/wipe-all - Nuclear wipe of all secrets & credentials
settingsRouter.post('/wipe-all', (req: Request, res: Response) => {
  try {
    updateEnvFile('DND_BEYOND_DM_COBALT_SESSIONS', null);
    updateEnvFile('DND_BEYOND_DM_COBALT_SESSION', null);
    updateEnvFile('DND_BEYOND_COBALT_SESSION', null);
    updateEnvFile('DND_BEYOND_CAMPAIGN_ID', null);
    updateEnvFile('GEMINI_API_KEY', null);
    updateEnvFile('GEMINI_FALLBACK_KEYS', null);
    updateEnvFile('API_KEY', null);
    updateEnvFile('ELEVENLABS_API_KEY', null);
    initGeminiKeyPool();

    console.log('[Settings] All stored secrets and credentials wiped successfully.');
    return res.json({ success: true, message: 'All API keys, Cobalt sessions, and campaign credentials wiped.' });
  } catch (err: any) {
    console.error('[Settings] Error during wipe-all:', err);
    return res.status(500).json({ error: err.message || 'Failed to wipe credentials' });
  }
});
