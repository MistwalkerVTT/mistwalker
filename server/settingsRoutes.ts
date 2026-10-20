import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { getCobaltToken, getDmCobaltToken } from './ddbService';
import { GoogleGenAI } from '@google/genai';

export const settingsRouter = Router();

// Helper to remove or update an environment variable in root .env file
function updateEnvFile(key: string, value: string | null) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';

    const regex = new RegExp(`^${key}=.*(\r?\n|$)`, 'm');

    if (value === null) {
      // Remove variable
      if (regex.test(content)) {
        content = content.replace(regex, '');
      }
      delete process.env[key];
    } else {
      // Update or append variable
      const cleanVal = value.trim();
      process.env[key] = cleanVal;
      if (regex.test(content)) {
        content = content.replace(regex, `${key}="${cleanVal}"\n`);
      } else {
        content += (content.endsWith('\n') || content.length === 0 ? '' : '\n') + `${key}="${cleanVal}"\n`;
      }
    }

    fs.writeFileSync(envPath, content.trim() + '\n', 'utf-8');
    return true;
  } catch (err: any) {
    console.warn(`[Settings] Failed to update .env for key ${key}:`, err.message);
    return false;
  }
}

// GET /api/settings/status - Returns status of all credentials
settingsRouter.get('/status', (req: Request, res: Response) => {
  const cobalt = getCobaltToken();
  const dmCobalt = getDmCobaltToken();
  const campaignId = process.env.DND_BEYOND_CAMPAIGN_ID || null;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || null;
  const elevenKey = process.env.ELEVENLABS_API_KEY || null;

  res.json({
    cobalt: {
      hasDmToken: Boolean(dmCobalt && dmCobalt.trim().length > 15),
      dmTokenPreview: dmCobalt && dmCobalt.length > 8 ? `${dmCobalt.slice(0, 4)}...${dmCobalt.slice(-4)}` : null,
      hasToken: Boolean(cobalt && cobalt.trim().length > 15),
      tokenPreview: cobalt && cobalt.length > 8 ? `${cobalt.slice(0, 4)}...${cobalt.slice(-4)}` : null,
      campaignId: campaignId && campaignId.trim().length > 0 ? campaignId.trim() : null
    },
    gemini: {
      hasKey: Boolean(geminiKey && geminiKey.trim().length > 10 && !geminiKey.includes('PLACEHOLDER')),
      maskedKey: geminiKey && geminiKey.length > 8 ? `${geminiKey.slice(0, 4)}...${geminiKey.slice(-4)}` : null
    },
    elevenlabs: {
      hasKey: Boolean(elevenKey && elevenKey.trim().length > 10 && !elevenKey.includes('PLACEHOLDER')),
      maskedKey: elevenKey && elevenKey.length > 8 ? `${elevenKey.slice(0, 4)}...${elevenKey.slice(-4)}` : null
    }
  });
});

// POST /api/settings/test-cobalt - Validates a CobaltSession cookie against D&D Beyond Auth API
settingsRouter.post('/test-cobalt', async (req: Request, res: Response) => {
  try {
    const { token, isDmToken } = req.body;
    const testToken = (token && typeof token === 'string' && token.trim().length > 10)
      ? token.trim()
      : (isDmToken ? getDmCobaltToken() : getCobaltToken());

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
    // Minimal ping generation with fast model
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

    // If a full campaign URL was passed (e.g. https://www.dndbeyond.com/campaigns/1234567), extract the ID
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

// POST /api/settings/wipe-single - Wipes a single credential from .env & process.env
settingsRouter.post('/wipe-single', (req: Request, res: Response) => {
  try {
    const { target } = req.body;
    if (!target || typeof target !== 'string') {
      return res.status(400).json({ error: 'Target credential identifier required.' });
    }

    switch (target) {
      case 'dm_cobalt':
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
        updateEnvFile('API_KEY', null);
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
    updateEnvFile('DND_BEYOND_DM_COBALT_SESSION', null);
    updateEnvFile('DND_BEYOND_COBALT_SESSION', null);
    updateEnvFile('DND_BEYOND_CAMPAIGN_ID', null);
    updateEnvFile('GEMINI_API_KEY', null);
    updateEnvFile('API_KEY', null);
    updateEnvFile('ELEVENLABS_API_KEY', null);

    console.log('[Settings] All stored secrets and credentials wiped successfully.');
    return res.json({ success: true, message: 'All API keys, Cobalt sessions, and campaign credentials wiped.' });
  } catch (err: any) {
    console.error('[Settings] Error during wipe-all:', err);
    return res.status(500).json({ error: err.message || 'Failed to wipe credentials' });
  }
});
