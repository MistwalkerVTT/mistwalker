import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import type { Monster } from '../src/types/monster';
import {
  getCobaltToken,
  getDmCobaltToken,
  DDB_SUPPORTED_BOOKS,
  loadCachedCompendium,
  saveCachedCompendium,
  ingestSourcebook,
  searchDdbLive,
  fetchSingleDdbMonster
} from './ddbService';
import {
  fetchDdbCampaigns,
  fetchDdbCampaignCharacters,
  fetchDdbCharacterData,
  fetchRawDdbCharacter,
  normalizeDdbCharacterToHud,
  DdbHpSyncDaemon
} from './ddbCampaignService';
import { DdbGameLogDaemon } from './ddbGameLogDaemon';
import { DdbDiceRollEvent } from '../src/types/dice';

export const ddbRouter = Router();



// GET /api/ddb/status
ddbRouter.get('/status', (req: Request, res: Response) => {
  const token = getCobaltToken();
  const dmToken = getDmCobaltToken();
  const cached = loadCachedCompendium();

  res.json({
    hasToken: !!token && token.length > 20,
    tokenPreview: token ? `${token.slice(0, 4)}...${token.slice(-4)}` : null,
    hasDmToken: !!dmToken && dmToken.length > 20,
    dmTokenPreview: dmToken ? `${dmToken.slice(0, 4)}...${dmToken.slice(-4)}` : null,
    totalCachedMonsters: cached.length,
    booksAvailable: DDB_SUPPORTED_BOOKS.length
  });
});

// GET /api/ddb/books
ddbRouter.get('/books', (req: Request, res: Response) => {
  const cached = loadCachedCompendium();
  
  // Count monsters per source
  const sourceCounts: Record<string, number> = {};
  for (const m of cached) {
    const s = m.source || 'Other';
    sourceCounts[s] = (sourceCounts[s] || 0) + 1;
  }

  const booksWithStatus = DDB_SUPPORTED_BOOKS.map(b => ({
    ...b,
    syncedCount: sourceCounts[b.name] || 0,
    isSynced: (sourceCounts[b.name] || 0) > 0
  }));

  res.json({ books: booksWithStatus });
});

// GET /api/ddb/compendium - Query cached compendium
ddbRouter.get('/compendium', (req: Request, res: Response) => {
  const { search, book, cr, page = '1', limit = '50' } = req.query;
  let monsters = loadCachedCompendium();

  if (search && typeof search === 'string') {
    const q = search.toLowerCase().trim();
    monsters = monsters.filter(m => m.name.toLowerCase().includes(q) || m.type.toLowerCase().includes(q));
  }

  if (book && typeof book === 'string' && book !== 'all') {
    monsters = monsters.filter(m => m.source?.toLowerCase().includes(book.toLowerCase()));
  }

  if (cr && typeof cr === 'string' && cr !== 'all') {
    monsters = monsters.filter(m => m.challenge.toLowerCase().startsWith(cr.toLowerCase()));
  }

  const p = Math.max(1, parseInt(page as string, 10) || 1);
  const l = Math.min(200, Math.max(10, parseInt(limit as string, 10) || 50));
  const total = monsters.length;
  const paginated = monsters.slice((p - 1) * l, p * l);

  res.json({
    total,
    page: p,
    limit: l,
    totalPages: Math.ceil(total / l),
    monsters: paginated
  });
});

// POST /api/ddb/sync-book - Sync single book (Supports Server-Sent Events if requested, or JSON)
ddbRouter.post('/sync-book', async (req: Request, res: Response) => {
  const { bookId, sse } = req.body;
  if (!bookId) {
    return res.status(400).json({ error: 'bookId is required' });
  }

  if (sse) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const monsters = await ingestSourcebook(bookId, (progress) => {
        res.write(`data: ${JSON.stringify(progress)}\n\n`);
      });

      res.write(`data: ${JSON.stringify({ completed: true, totalIngested: monsters.length })}\n\n`);
      res.end();
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  } else {
    try {
      const monsters = await ingestSourcebook(bookId);
      res.json({ success: true, totalIngested: monsters.length, bookId });
    } catch (err: any) {
      console.error('[DdbRoutes] Sync error:', err);
      res.status(500).json({ error: err.message });
    }
  }
});

// GET /api/ddb/search - Live search all 6,000+ monsters across D&D Beyond
ddbRouter.get('/search', async (req: Request, res: Response) => {
  const { q = '', page = '1', limit = '24', cr, type, size } = req.query;

  try {
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const takeNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 24));
    const result = await searchDdbLive(typeof q === 'string' ? q : '', pageNum, takeNum);

    let filtered = result.monsters;
    if (cr && typeof cr === 'string' && cr !== 'all') {
      filtered = filtered.filter(m => m.challenge.toLowerCase().startsWith(cr.toLowerCase()));
    }
    if (type && typeof type === 'string' && type !== 'all') {
      filtered = filtered.filter(m => m.type.toLowerCase().includes(type.toLowerCase()));
    }
    if (size && typeof size === 'string' && size !== 'all') {
      filtered = filtered.filter(m => m.size.toLowerCase() === size.toLowerCase());
    }

    res.json({
      monsters: filtered,
      total: result.total,
      page: result.page,
      take: result.take,
      totalPages: result.totalPages
    });
  } catch (err: any) {
    console.error('[DdbRoutes] Search error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ddb/monster/:id - Fetch single monster details from D&D Beyond
ddbRouter.get('/monster/:id', async (req: Request, res: Response) => {
  const rawId = parseInt(req.params.id, 10);
  if (isNaN(rawId)) {
    return res.status(400).json({ error: 'Valid monster id required' });
  }

  try {
    const monster = await fetchSingleDdbMonster(rawId);
    if (!monster) {
      return res.status(404).json({ error: 'Monster not found' });
    }
    res.json({ monster });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ddb/cache-monster - Save monster into local compendium cache
ddbRouter.post('/cache-monster', (req: Request, res: Response) => {
  const { monster } = req.body;
  if (!monster || !monster.monsterId || !monster.name) {
    return res.status(400).json({ error: 'Valid monster object required' });
  }

  try {
    const existing = loadCachedCompendium();
    const map = new Map<string, Monster>();
    existing.forEach(m => map.set(m.monsterId, m));
    map.set(monster.monsterId, monster);
    const updated = Array.from(map.values());
    saveCachedCompendium(updated);
    res.json({ success: true, monster, total: updated.length });
  } catch (err: any) {
    console.error('[DdbRoutes] Cache monster error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ddb/campaigns - List user's D&D Beyond campaigns
ddbRouter.get('/campaigns', async (req: Request, res: Response) => {
  try {
    const campaigns = await fetchDdbCampaigns();
    res.json({ campaigns });
  } catch (err: any) {
    console.error('[DdbRoutes] Error fetching campaigns:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ddb/campaigns/:id/characters - List characters in campaign with live HP
ddbRouter.get('/campaigns/:id/characters', async (req: Request, res: Response) => {
  try {
    const data = await fetchDdbCampaignCharacters(req.params.id);
    res.json(data);
  } catch (err: any) {
    console.error(`[DdbRoutes] Error fetching characters for campaign ${req.params.id}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ddb/campaigns/select - Set active campaign to monitor for live HP changes
ddbRouter.post('/campaigns/select', async (req: Request, res: Response) => {
  const { campaignId } = req.body;
  if (!campaignId) {
    return res.status(400).json({ error: 'campaignId is required' });
  }

  try {
    const result = await DdbHpSyncDaemon.getInstance().setMonitoredCampaign(campaignId);
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error(`[DdbRoutes] Error setting monitored campaign ${campaignId}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ddb/campaigns/sync-status - Status of the real-time HP polling daemon
ddbRouter.get('/campaigns/sync-status', (req: Request, res: Response) => {
  const status = DdbHpSyncDaemon.getInstance().getStatus();
  res.json({ status });
});

// POST /api/ddb/campaigns/poll-now - Force an immediate HP poll cycle
ddbRouter.post('/campaigns/poll-now', async (req: Request, res: Response) => {
  try {
    await DdbHpSyncDaemon.getInstance().pollCycle();
    const status = DdbHpSyncDaemon.getInstance().getStatus();
    res.json({ success: true, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ddb/monitor-characters - Register active character IDs for continuous HP polling
ddbRouter.post('/monitor-characters', async (req: Request, res: Response) => {
  try {
    const { characterIds } = req.body;
    if (!Array.isArray(characterIds)) {
      return res.status(400).json({ error: 'characterIds array is required' });
    }
    const daemon = DdbHpSyncDaemon.getInstance();
    const added = await daemon.addMonitoredCharacters(characterIds);
    res.json({ success: true, count: added.length, characters: added });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ddb/characters/:id - Fetch live D&D Beyond data for a specific character
ddbRouter.get('/characters/:id', async (req: Request, res: Response) => {
  try {
    const charId = req.params.id;
    const data = await fetchDdbCharacterData(charId);
    if (!data) {
      return res.status(404).json({ error: `Character ${charId} not found on D&D Beyond` });
    }
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ddb/characters/:id/hud-data - Fetch normalized D&D Beyond tactical HUD payload
ddbRouter.get('/characters/:id/hud-data', async (req: Request, res: Response) => {
  try {
    const charId = String(req.params.id).replace(/^char_ddb_/, '').trim();
    const forceRefresh = req.query.refresh === 'true' || req.query.refresh === '1';
    const raw = await fetchRawDdbCharacter(charId, forceRefresh);
    if (!raw) {
      return res.status(404).json({ error: `Character ${charId} not found on D&D Beyond` });
    }
    const hudPayload = normalizeDdbCharacterToHud(raw, charId);
    if (hudPayload && typeof hudPayload.currentHp === 'number' && typeof hudPayload.maxHp === 'number') {
      DdbHpSyncDaemon.getInstance().registerCharacter(
        charId,
        hudPayload.name || `Character ${charId}`,
        hudPayload.currentHp,
        hudPayload.maxHp,
        hudPayload.tempHp || 0
      );
    }
    res.json(hudPayload);
  } catch (err: any) {
    console.error(`[DdbRoutes] Error generating HUD data for ${req.params.id}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ddb/set-token - Update CobaltSession in .env
ddbRouter.post('/set-token', (req: Request, res: Response) => {
  const { token, isDmToken } = req.body;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Valid token string required' });
  }

  const envKey = isDmToken ? 'DND_BEYOND_DM_COBALT_SESSION' : 'DND_BEYOND_COBALT_SESSION';

  try {
    process.env[envKey] = token.trim();
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, 'utf-8');
      if (content.includes(`${envKey}=`)) {
        content = content.replace(new RegExp(`${envKey}="[^"]*"`), `${envKey}="${token.trim()}"`);
      } else {
        content += `\n${envKey}="${token.trim()}"\n`;
      }
      fs.writeFileSync(envPath, content, 'utf-8');
    }
    res.json({ success: true, message: `${isDmToken ? 'DM' : 'Player'} Cobalt token updated successfully` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ddb/gamelog/status - Status of the live dice stream
ddbRouter.get('/gamelog/status', (req: Request, res: Response) => {
  const status = DdbGameLogDaemon.getInstance().getStatus();
  res.json({ status });
});

// POST /api/ddb/simulate-roll - Broadcast a test or simulated roll
ddbRouter.post('/simulate-roll', (req: Request, res: Response) => {
  const {
    characterName = 'Thorin Oakenshield',
    playerName = 'Player',
    action = 'Warhammer Attack',
    formula = '1d20 + 7',
    diceNotation = '1d20',
    dice = [{ sides: 20, result: 18, type: 'd20' }],
    modifier = 7,
    total = 25,
    isCritical = false,
    isFumble = false,
    theme = 'default',
    themeColor = '#d97706',
    avatarUrl
  } = req.body;

  const rollEvent: DdbDiceRollEvent = {
    id: `sim-${Date.now()}`,
    characterName,
    playerName,
    avatarUrl,
    action,
    rollType: 'attack',
    formula,
    diceNotation,
    dice,
    modifier,
    total,
    isCritical,
    isFumble,
    theme,
    themeColor,
    timestamp: Date.now(),
    source: 'simulation'
  };

  DdbGameLogDaemon.getInstance().broadcastRoll(rollEvent);
  res.json({ success: true, roll: rollEvent });
});
