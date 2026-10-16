import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import type { Monster } from '../src/types/monster';
import {
  getCobaltToken,
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
  DdbHpSyncDaemon
} from './ddbCampaignService';

export const ddbRouter = Router();



// GET /api/ddb/status
ddbRouter.get('/status', (req: Request, res: Response) => {
  const token = getCobaltToken();
  const cached = loadCachedCompendium();

  res.json({
    hasToken: !!token && token.length > 20,
    tokenPreview: token ? `${token.slice(0, 4)}...${token.slice(-4)}` : null,
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

// POST /api/ddb/set-token - Update CobaltSession in .env
ddbRouter.post('/set-token', (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Valid token string required' });
  }

  try {
    process.env.DND_BEYOND_COBALT_SESSION = token.trim();
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, 'utf-8');
      if (content.includes('DND_BEYOND_COBALT_SESSION=')) {
        content = content.replace(/DND_BEYOND_COBALT_SESSION="[^"]*"/, `DND_BEYOND_COBALT_SESSION="${token.trim()}"`);
      } else {
        content += `\nDND_BEYOND_COBALT_SESSION="${token.trim()}"\n`;
      }
      fs.writeFileSync(envPath, content, 'utf-8');
    }
    res.json({ success: true, message: 'Cobalt token updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
