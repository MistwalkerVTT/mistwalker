import { Server } from 'socket.io';
import { getCobaltToken } from './ddbService';
import { DdbHpSyncDaemon } from './ddbCampaignService';
import { DdbDiceRollEvent, DieResult } from '../src/types/dice';

export class DdbGameLogDaemon {
  private static instance: DdbGameLogDaemon;
  private io: Server | null = null;
  private activeCampaignId: string | null = null;
  private isPolling = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private processedEntryIds = new Set<string>();
  private isFirstSync = true;
  private maxStoredIds = 500;
  private cachedJwt: string | null = null;
  private jwtExpiresAt = 0;

  public static getInstance(): DdbGameLogDaemon {
    if (!DdbGameLogDaemon.instance) {
      DdbGameLogDaemon.instance = new DdbGameLogDaemon();
    }
    return DdbGameLogDaemon.instance;
  }

  public init(io: Server) {
    this.io = io;
    console.log('[DdbGameLogDaemon] Initialized with Socket.io server.');
    
    // Automatically monitor default campaign so live rolls start tracking on boot
    const defaultCampaignId = process.env.DND_BEYOND_CAMPAIGN_ID || '3290944';
    if (!this.activeCampaignId && defaultCampaignId) {
      this.setMonitoredCampaign(defaultCampaignId);
    }
  }

  public setMonitoredCampaign(campaignId: string) {
    if (this.activeCampaignId === campaignId && this.pollTimer) return;

    this.activeCampaignId = campaignId;
    this.processedEntryIds.clear();
    this.isFirstSync = true;
    console.log(`[DdbGameLogDaemon] Monitoring D&D Beyond GameLog for campaign: ${campaignId}`);

    this.startPolling();
  }

  public startPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
    // High-responsiveness polling interval: 1.5 seconds for instant roll feedback
    this.pollTimer = setInterval(() => this.pollCycle(), 1500);
    this.pollCycle();
  }

  public stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  // Obtain bearer JWT from auth-service using CobaltSession
  private async getBearerToken(): Promise<string | null> {
    if (this.cachedJwt && Date.now() < this.jwtExpiresAt) {
      return this.cachedJwt;
    }

    const cobalt = getCobaltToken();
    if (!cobalt) {
      return null;
    }

    try {
      const res = await fetch('https://auth-service.dndbeyond.com/v1/cobalt-token', {
        headers: {
          'Cookie': `CobaltSession=${cobalt}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!res.ok) {
        console.warn(`[DdbGameLogDaemon] Failed to obtain JWT from auth-service: HTTP ${res.status}`);
        return null;
      }

      const data = await res.json();
      if (data?.token) {
        this.cachedJwt = data.token;
        // Cache token for 5 minutes (or TTL minus 30s)
        const ttlSec = typeof data.ttl === 'number' ? data.ttl : 300;
        this.jwtExpiresAt = Date.now() + Math.max(60000, ttlSec * 1000 - 30000);
        return this.cachedJwt;
      }
      return null;
    } catch (err: any) {
      console.error('[DdbGameLogDaemon] Error fetching Cobalt JWT:', err.message);
      return null;
    }
  }

  private async pollCycle() {
    if (!this.activeCampaignId || this.isPolling || !this.io) return;
    this.isPolling = true;

    try {
      const jwt = await this.getBearerToken();
      if (!jwt) return;

      const url = `https://game-log-rest-live.dndbeyond.com/v1/getmessages?gameId=${this.activeCampaignId}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          // Token expired, invalidate cache
          this.cachedJwt = null;
          this.jwtExpiresAt = 0;
        }
        return;
      }

      const json = await res.json();
      const entries: any[] = json?.data || [];

      // Sort chronological by dateTime or ID
      entries.sort((a, b) => {
        const timeA = parseInt(a.dateTime || '0', 10);
        const timeB = parseInt(b.dateTime || '0', 10);
        return timeA - timeB;
      });

      if (this.isFirstSync) {
        // Seed initial history so previous days/hours rolls do not spam the screen on startup
        for (const entry of entries) {
          const entryId = String(entry.id || entry.dateTime);
          if (entryId) {
            this.processedEntryIds.add(entryId);
          }
        }
        this.isFirstSync = false;
        console.log(`[DdbGameLogDaemon] Initialized history for campaign ${this.activeCampaignId} (${this.processedEntryIds.size} historical rolls indexed). Ready for live rolls!`);
        return;
      }

      for (const entry of entries) {
        const entryId = String(entry.id || entry.dateTime);
        if (!entryId || this.processedEntryIds.has(entryId)) continue;

        this.processedEntryIds.add(entryId);
        if (this.processedEntryIds.size > this.maxStoredIds) {
          const firstId = this.processedEntryIds.values().next().value;
          if (firstId) this.processedEntryIds.delete(firstId);
        }

        // Only process dice roll events
        if (entry.eventType === 'dice/roll/fulfilled') {
          const rollEvent = this.parseRollMessage(entry);
          if (rollEvent) {
            this.broadcastRoll(rollEvent);
          }
        }
      }
    } catch (err: any) {
      // Safe poll cycle exception handling
    } finally {
      this.isPolling = false;
    }
  }

  private parseRollMessage(entry: any): DdbDiceRollEvent | null {
    try {
      const data = entry.data || {};
      const context = data.context || {};
      const characterName = context.name || 'Adventurer';
      const characterId = context.entityId ? String(context.entityId) : undefined;
      const action = data.action === 'custom' ? 'Manual Roll' : (data.action || 'Dice Roll');

      // Look up cached character portrait and player name
      let avatarUrl = context.avatarUrl;
      let playerName = context.playerName;
      if (characterId) {
        const cached = DdbHpSyncDaemon.getInstance().getCachedCharacter(characterId);
        if (cached) {
          if (!avatarUrl && cached.avatarUrl) avatarUrl = cached.avatarUrl;
          if (!playerName && cached.playerName) playerName = cached.playerName;
        }
      }

      const rawRolls = data.rolls || [];
      const dice: DieResult[] = [];
      let total = 0;
      let formula = '';
      const notationParts: string[] = [];

      for (const r of rawRolls) {
        const res = r.result || {};
        total += (res.total ?? 0);
        if (res.text) {
          formula = formula ? `${formula} + ${res.text}` : res.text;
        }

        const sets = r.diceNotation?.set || [];
        for (const s of sets) {
          const dieType = s.dieType || 'd20';
          const sides = parseInt(dieType.replace('d', ''), 10) || 20;
          notationParts.push(`${s.count || 1}${dieType}`);

          for (const d of (s.dice || [])) {
            dice.push({
              sides,
              result: d.dieValue,
              type: dieType
            });
          }
        }
      }

      if (!formula && dice.length > 0) {
        formula = dice.map(d => `${d.type} (${d.result})`).join(' + ');
      }

      const isCrit = dice.some(d => d.sides === 20 && d.result === 20);
      const isFumble = dice.some(d => d.sides === 20 && d.result === 1);

      // Standard basic D&D rendered dice (clean amber/gold)
      const theme = 'default';
      const themeColor = '#d97706';

      return {
        id: String(entry.id || Date.now()),
        characterId,
        characterName,
        playerName,
        avatarUrl,
        action,
        rollType: rawRolls[0]?.rollType || 'roll',
        formula: formula || String(total),
        diceNotation: notationParts.join('+') || (dice.length > 0 ? dice.map(d => d.type).join('+') : '1d20'),
        dice,
        total,
        isCritical: isCrit,
        isFumble,
        theme,
        themeColor,
        timestamp: parseInt(entry.dateTime || '0', 10) || Date.now(),
        source: 'dndbeyond'
      };
    } catch (err: any) {
      console.warn('[DdbGameLogDaemon] Failed to parse roll message:', err.message);
      return null;
    }
  }

  public broadcastRoll(rollEvent: DdbDiceRollEvent) {
    if (!this.io) return;
    console.log(`[DdbGameLogDaemon] 🎲 LIVE D&D BEYOND ROLL: "${rollEvent.characterName}" rolled ${rollEvent.action} -> ${rollEvent.total}`);

    this.io.emit('DDB_DICE_ROLLED', rollEvent);

    // If critical hit, synchronize screen shake across all views
    if (rollEvent.isCritical) {
      this.io.emit('SYNC_SHAKE', 1);
    }
  }

  public getStatus() {
    return {
      activeCampaignId: this.activeCampaignId,
      isPollingActive: !!this.pollTimer,
      processedRollsCount: this.processedEntryIds.size,
      hasCachedJwt: !!this.cachedJwt
    };
  }
}
