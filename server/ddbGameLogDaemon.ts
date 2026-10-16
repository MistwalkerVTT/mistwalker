import { Server } from 'socket.io';
import { getDdbHeaders } from './ddbService';
import { DdbDiceRollEvent, DieResult } from '../src/types/dice';

export class DdbGameLogDaemon {
  private static instance: DdbGameLogDaemon;
  private io: Server | null = null;
  private activeCampaignId: string | null = null;
  private isPolling = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private processedEntryIds = new Set<string>();
  private maxStoredIds = 200;

  public static getInstance(): DdbGameLogDaemon {
    if (!DdbGameLogDaemon.instance) {
      DdbGameLogDaemon.instance = new DdbGameLogDaemon();
    }
    return DdbGameLogDaemon.instance;
  }

  public init(io: Server) {
    this.io = io;
    console.log('[DdbGameLogDaemon] Initialized with Socket.io server.');
  }

  public setMonitoredCampaign(campaignId: string) {
    this.activeCampaignId = campaignId;
    console.log(`[DdbGameLogDaemon] Monitoring D&D Beyond GameLog for campaign: ${campaignId}`);
    this.processedEntryIds.clear();
    this.startPolling();
  }

  public startPolling() {
    if (this.pollTimer) return;
    // Poll GameLog endpoint every 2.5 seconds
    this.pollTimer = setInterval(() => this.pollCycle(), 2500);
    this.pollCycle();
  }

  public stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async pollCycle() {
    if (!this.activeCampaignId || this.isPolling || !this.io) return;
    this.isPolling = true;

    try {
      const headers = getDdbHeaders();
      const url = `https://game-log-rest-live.dndbeyond.com/v1/campaigns/${this.activeCampaignId}`;
      const res = await fetch(url, { headers });

      if (res.ok) {
        const data = await res.json();
        const entries = Array.isArray(data) ? data : data?.data || data?.entries || [];

        for (const entry of entries) {
          const entryId = String(entry.id || entry.timestamp || Math.random());
          if (this.processedEntryIds.has(entryId)) continue;

          this.processedEntryIds.add(entryId);
          if (this.processedEntryIds.size > this.maxStoredIds) {
            const firstId = this.processedEntryIds.values().next().value;
            if (firstId) this.processedEntryIds.delete(firstId);
          }

          // Process roll entry
          const rollEvent = this.parseGameLogEntry(entry);
          if (rollEvent) {
            this.broadcastRoll(rollEvent);
          }
        }
      }
    } catch (err) {
      // GameLog stream polling error - safe backoff
    } finally {
      this.isPolling = false;
    }
  }

  private parseGameLogEntry(entry: any): DdbDiceRollEvent | null {
    if (!entry) return null;

    const payload = entry.data || entry;
    const action = payload.action || payload.name || 'Dice Roll';
    const characterName = payload.entityName || payload.characterName || 'Adventurer';
    const characterId = String(payload.characterId || payload.entityId || '');

    // Extract dice breakdown
    const rawRolls = payload.rolls || [];
    const dice: DieResult[] = [];
    let calculatedTotal = 0;

    if (Array.isArray(rawRolls)) {
      rawRolls.forEach((r: any) => {
        const sides = parseInt(r.diceType?.replace('d', '') || r.sides || '20', 10);
        const result = parseInt(r.result ?? r.value ?? 1, 10);
        dice.push({ sides, result, type: `d${sides}` });
        calculatedTotal += result;
      });
    }

    const modifier = parseInt(payload.modifier ?? payload.constant ?? 0, 10);
    const total = payload.total !== undefined ? parseInt(payload.total, 10) : calculatedTotal + modifier;

    const isCrit = payload.isCritical === true || dice.some(d => d.sides === 20 && d.result === 20);
    const isFumble = payload.isFumble === true || dice.some(d => d.sides === 20 && d.result === 1);

    // Map theme/skin if provided by DDB
    const theme = payload.theme || payload.diceTheme || 'default';
    const themeColor = payload.themeColor || undefined;

    return {
      id: String(entry.id || Date.now()),
      characterId: characterId || undefined,
      characterName,
      playerName: payload.playerName || undefined,
      avatarUrl: payload.avatarUrl || undefined,
      action,
      rollType: payload.rollType || 'attack',
      formula: payload.formula || (dice.length > 0 ? `${dice.map(d => `d${d.sides}`).join(' + ')}${modifier !== 0 ? ` + ${modifier}` : ''}` : '1d20'),
      diceNotation: dice.length > 0 ? dice.map(d => `d${d.sides}`).join('+') : '1d20',
      dice,
      modifier,
      total,
      isCritical: isCrit,
      isFumble,
      theme,
      themeColor,
      timestamp: entry.timestamp || Date.now(),
      source: 'dndbeyond'
    };
  }

  public broadcastRoll(rollEvent: DdbDiceRollEvent) {
    if (!this.io) return;
    console.log(`[DdbGameLogDaemon] 🎲 BROADCASTING ROLL: "${rollEvent.characterName}" rolled ${rollEvent.action} -> ${rollEvent.total}`);

    this.io.emit('DDB_DICE_ROLLED', rollEvent);

    // If critical hit, emit screen shake synchronization
    if (rollEvent.isCritical) {
      this.io.emit('SYNC_SHAKE', 1);
    }
  }

  public getStatus() {
    return {
      activeCampaignId: this.activeCampaignId,
      isPollingActive: !!this.pollTimer,
      processedRollsCount: this.processedEntryIds.size
    };
  }
}
