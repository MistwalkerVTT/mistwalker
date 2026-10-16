import { Server } from 'socket.io';
import { getDdbHeaders } from './ddbService';
import { Character } from '../src/types/character';

export interface DdbCampaignSummary {
  id: string;
  title: string;
  characterCount: number;
  dm: string;
}

export interface DdbCampaignCharacter {
  id: string;
  name: string;
  race: string;
  classLevel: string;
  playerName: string;
  avatarUrl: string;
  currentHp: number;
  maxHp: number;
  tempHp: number;
  damage: number;
  ac: number;
  speed: string;
  stats: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  isPrivate: boolean;
  readonlyUrl: string;
  lastUpdated: number;
}

// Fetch all campaigns accessible to the user on D&D Beyond
export async function fetchDdbCampaigns(): Promise<DdbCampaignSummary[]> {
  const headers = getDdbHeaders();
  try {
    const res = await fetch('https://www.dndbeyond.com/my-campaigns', { headers });
    if (!res.ok) {
      console.warn(`[DdbCampaign] /my-campaigns returned status ${res.status}`);
      return [];
    }
    const html = await res.text();

    const re = /<li[^>]*class="[^"]*ddb-campaigns-list-item[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
    let m;
    const campaigns: DdbCampaignSummary[] = [];

    while ((m = re.exec(html)) !== null) {
      const itemHtml = m[1];
      const idMatch = itemHtml.match(/\/campaigns\/([0-9]+)/);
      const titleMatch = itemHtml.match(/<div class="ddb-campaigns-list-item-body-title">([\s\S]*?)<\/div>/i) ||
                         itemHtml.match(/<div class="ddb-campaigns-list-item-header-primary">([^<]+)<\/div>/i);
      const countMatch = itemHtml.match(/<div class="count">([0-9]+)<\/div>/i) ||
                         itemHtml.match(/([0-9]+)\s*Characters?/i);
      const dmMatch = itemHtml.match(/DM:\s*([^<]+)/i);

      if (idMatch) {
        campaigns.push({
          id: idMatch[1],
          title: titleMatch ? titleMatch[1].trim() : `Campaign ${idMatch[1]}`,
          characterCount: countMatch ? parseInt(countMatch[1], 10) : 0,
          dm: dmMatch ? dmMatch[1].trim() : 'DM'
        });
      }
    }

    return campaigns;
  } catch (err) {
    console.error('[DdbCampaign] Error fetching user campaigns:', err);
    return [];
  }
}

// Calculate 5e stats, Hit Points, and Armor Class according to D&D Beyond's data rules
function computeDdbCharacterSheet(c: any): {
  stats: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  maxHp: number;
  currentHp: number;
  tempHp: number;
  damage: number;
  ac: number;
  totalLevel: number;
} {
  const stats = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  const keys = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;

  // 1. Base ability scores
  if (Array.isArray(c.stats)) {
    c.stats.forEach((s: any, idx: number) => {
      if (s && typeof s.value === 'number' && keys[idx]) {
        stats[keys[idx]] = s.value;
      }
    });
  }

  // 2. Bonus ability scores
  if (Array.isArray(c.bonusStats)) {
    c.bonusStats.forEach((s: any, idx: number) => {
      if (s && typeof s.value === 'number' && keys[idx]) {
        stats[keys[idx]] += s.value;
      }
    });
  }

  // 3. Modifiers across all categories
  const allModifiers: any[] = [];
  if (c.modifiers && typeof c.modifiers === 'object') {
    for (const cat of Object.keys(c.modifiers)) {
      const list = c.modifiers[cat];
      if (Array.isArray(list)) {
        for (const m of list) {
          allModifiers.push({ category: cat, ...m });
        }
      }
    }
  }

  // Stat bonuses from modifiers (race, class, feat, item, background)
  const statNames = {
    str: 'strength-score',
    dex: 'dexterity-score',
    con: 'constitution-score',
    int: 'intelligence-score',
    wis: 'wisdom-score',
    cha: 'charisma-score'
  } as const;

  for (const k of keys) {
    const subTypeName = statNames[k];
    for (const m of allModifiers) {
      if (m.type === 'bonus' && m.subType === subTypeName) {
        stats[k] += (m.fixedValue ?? m.value ?? 0);
      }
    }
  }

  // Override stats (e.g. Belt of Giant Strength = 23, Amulet of Health = 19)
  if (Array.isArray(c.overrideStats)) {
    c.overrideStats.forEach((s: any, idx: number) => {
      if (s && typeof s.value === 'number' && keys[idx]) {
        stats[keys[idx]] = Math.max(stats[keys[idx]], s.value);
      }
    });
  }

  // Total character level
  const totalLevel = Array.isArray(c.classes)
    ? c.classes.reduce((sum: number, cl: any) => sum + (cl.level || 0), 0)
    : 1;

  // Constitution modifier
  const conModifier = Math.floor((stats.con - 10) / 2);

  // HP per level modifiers (e.g. Tough feat = +2/level, Hill Dwarf Dwarven Toughness = +1/level)
  let hpPerLevel = 0;
  for (const m of allModifiers) {
    if (m.subType === 'hit-points-per-level') {
      hpPerLevel += (m.fixedValue ?? m.value ?? 0);
    }
  }

  // Base, bonus and override HP
  const baseHp = c.baseHitPoints || 10;
  const bonusHp = c.bonusHitPoints || 0;
  const overrideHp = c.overrideHitPoints || 0;

  // Full 5e Max HP: baseHitPoints + (conModifier * totalLevel) + (hpPerLevel * totalLevel) + bonusHitPoints
  const maxHp = overrideHp > 0
    ? overrideHp
    : Math.max(1, baseHp + bonusHp + (conModifier * totalLevel) + (hpPerLevel * totalLevel));

  const damage = c.removedHitPoints || 0;
  const currentHp = Math.max(0, maxHp - damage);
  const tempHp = c.temporaryHitPoints || 0;

  // Armor Class calculation
  const dexMod = Math.floor((stats.dex - 10) / 2);
  const wisMod = Math.floor((stats.wis - 10) / 2);
  const conMod = conModifier;

  let baseAc = 10 + dexMod;
  const isMonk = Array.isArray(c.classes) && c.classes.some((cl: any) => cl.definition?.name === 'Monk');
  const isBarbarian = Array.isArray(c.classes) && c.classes.some((cl: any) => cl.definition?.name === 'Barbarian');
  
  if (isMonk) {
    baseAc = 10 + dexMod + wisMod;
  } else if (isBarbarian) {
    baseAc = 10 + dexMod + conMod;
  }

  let armorAc: number | null = null;
  let shieldAc = 0;

  if (Array.isArray(c.inventory)) {
    for (const item of c.inventory) {
      if (!item.equipped) continue;
      const def = item.definition;
      if (!def) continue;

      const typeId = def.armorTypeId;
      const rawItemAc = typeof def.armorClass === 'number' ? def.armorClass : 0;

      if (typeId === 4 || def.type === 'Shield') {
        shieldAc += rawItemAc || 2;
      } else if (typeId === 3 || def.type === 'Heavy Armor') {
        armorAc = rawItemAc;
      } else if (typeId === 2 || def.type === 'Medium Armor') {
        armorAc = rawItemAc + Math.min(2, dexMod);
      } else if (typeId === 1 || def.type === 'Light Armor') {
        armorAc = rawItemAc + dexMod;
      }
    }
  }

  // AC bonuses from modifiers (magical rings, cloaks, features)
  let acBonuses = 0;
  for (const m of allModifiers) {
    if (m.type === 'bonus' && (m.subType === 'armor-class' || m.subType === 'unarmored-armor-class')) {
      acBonuses += (m.fixedValue ?? m.value ?? 0);
    }
  }

  let finalAc = (armorAc !== null ? armorAc : baseAc) + shieldAc + acBonuses;
  if (typeof c.overrideArmorClass === 'number' && c.overrideArmorClass > 0) {
    finalAc = c.overrideArmorClass;
  } else if (typeof c.armorClass === 'number' && c.armorClass > 0) {
    finalAc = c.armorClass;
  }

  return {
    stats,
    maxHp,
    currentHp,
    tempHp,
    damage,
    ac: Math.max(1, finalAc),
    totalLevel
  };
}

// Fetch single character sheet from D&D Beyond character-service
export async function fetchDdbCharacterData(charId: string): Promise<Partial<DdbCampaignCharacter> | null> {
  const headers = getDdbHeaders();
  try {
    const res = await fetch(`https://character-service.dndbeyond.com/character/v5/character/${charId}`, { headers });
    if (!res.ok) {
      return null;
    }
    const json = await res.json();
    const c = json.data;
    if (!c) return null;

    const computed = computeDdbCharacterSheet(c);

    // Siphon avatar image from decorations or avatarUrl
    let avatarUrl = c.decorations?.avatarUrl || c.avatarUrl || '';
    if (avatarUrl && avatarUrl.includes('/thumbnails/')) {
      avatarUrl = avatarUrl.replace(/\/thumbnails\/([0-9]+)\/([0-9]+)\/[0-9]+\/[0-9]+\//, '/thumbnails/$1/$2/1000/1000/');
    }

    // Class level string
    const classLevel = Array.isArray(c.classes)
      ? c.classes.map((cl: any) => `${cl.definition?.name || 'Class'} ${cl.level || 1}`).join(' / ')
      : `Level ${computed.totalLevel}`;

    // Speed
    const walkSpeed = c.speed?.walk || 30;

    return {
      id: charId,
      name: c.name || 'Character',
      race: c.race?.fullName || 'Humanoid',
      classLevel,
      avatarUrl,
      currentHp: computed.currentHp,
      maxHp: computed.maxHp,
      tempHp: computed.tempHp,
      damage: computed.damage,
      ac: computed.ac,
      speed: `${walkSpeed} ft.`,
      stats: computed.stats,
      isPrivate: false,
      readonlyUrl: c.readonlyUrl || `https://www.dndbeyond.com/characters/${charId}`,
      lastUpdated: Date.now()
    };
  } catch (err) {
    console.warn(`[DdbCampaign] Error fetching character ${charId}:`, err);
    return null;
  }
}

// Fetch all characters in a D&D Beyond campaign
export async function fetchDdbCampaignCharacters(campaignId: string): Promise<{ campaignTitle: string; characters: DdbCampaignCharacter[] }> {
  const headers = getDdbHeaders();
  try {
    const res = await fetch(`https://www.dndbeyond.com/campaigns/${campaignId}`, { headers });
    if (!res.ok) {
      console.warn(`[DdbCampaign] Campaign ${campaignId} returned status ${res.status}`);
      return { campaignTitle: `Campaign ${campaignId}`, characters: [] };
    }
    const html = await res.text();

    const titleMatch = html.match(/<h1[^>]*class="[^"]*page-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) ||
                       html.match(/<title>([^<]+)<\/title>/i);
    const campaignTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : `Campaign ${campaignId}`;

    const re = /<li[^>]*class="[^"]*ddb-campaigns-character-card[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
    let match;
    const cards: Array<{
      id: string;
      name: string;
      meta: string;
      playerName: string;
    }> = [];

    while ((match = re.exec(html)) !== null) {
      const cardHtml = match[1];
      const nameM = cardHtml.match(/<div class="ddb-campaigns-character-card-header-upper-character-info-primary">([^<]+)<\/div>/i) ||
                    cardHtml.match(/<a[^>]*class="[^"]*character-name[^"]*"[^>]*>([^<]+)<\/a>/i);
      const metaM = cardHtml.match(/<div class="ddb-campaigns-character-card-header-upper-character-info-secondary">([^<]+)<\/div>/i);
      const playerM = cardHtml.match(/Player:\s*([^<]+)/i);
      const idM = cardHtml.match(/href="\/characters\/([0-9]+)"/i) ||
                  cardHtml.match(/characters\/([0-9]+)/i);

      if (idM && nameM) {
        cards.push({
          id: idM[1],
          name: nameM[1].trim(),
          meta: metaM ? metaM[1].trim() : '',
          playerName: playerM ? playerM[1].trim() : 'Player'
        });
      }
    }

    // Now query character-service for live stats
    const characters: DdbCampaignCharacter[] = [];

    for (const card of cards) {
      const liveData = await fetchDdbCharacterData(card.id);
      if (liveData) {
        characters.push({
          id: card.id,
          name: liveData.name || card.name,
          race: liveData.race || 'Character',
          classLevel: liveData.classLevel || card.meta,
          playerName: card.playerName,
          avatarUrl: liveData.avatarUrl || '',
          currentHp: liveData.currentHp ?? 20,
          maxHp: liveData.maxHp ?? 20,
          tempHp: liveData.tempHp ?? 0,
          damage: liveData.damage ?? 0,
          ac: liveData.ac ?? 14,
          speed: liveData.speed || '30 ft.',
          stats: liveData.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
          isPrivate: false,
          readonlyUrl: liveData.readonlyUrl || `https://www.dndbeyond.com/characters/${card.id}`,
          lastUpdated: Date.now()
        });
      } else {
        // Private character sheet fallback
        characters.push({
          id: card.id,
          name: card.name,
          race: 'Character',
          classLevel: card.meta,
          playerName: card.playerName,
          avatarUrl: '',
          currentHp: 20,
          maxHp: 20,
          tempHp: 0,
          damage: 0,
          ac: 12,
          speed: '30 ft.',
          stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
          isPrivate: true,
          readonlyUrl: `https://www.dndbeyond.com/characters/${card.id}`,
          lastUpdated: Date.now()
        });
      }
    }

    return { campaignTitle, characters };
  } catch (err) {
    console.error(`[DdbCampaign] Error fetching characters for campaign ${campaignId}:`, err);
    return { campaignTitle: `Campaign ${campaignId}`, characters: [] };
  }
}

// Global live sync state
interface ActiveHpState {
  currentHp: number;
  maxHp: number;
  tempHp: number;
  name: string;
}

export class DdbHpSyncDaemon {
  private static instance: DdbHpSyncDaemon;
  private io: Server | null = null;
  private timer: NodeJS.Timeout | null = null;
  private monitoredCharacters: Map<string, ActiveHpState> = new Map();
  private cachedCharacters: DdbCampaignCharacter[] = [];
  private activeCampaignId: string | null = null;
  private isPolling = false;

  private constructor() {}

  public static getInstance(): DdbHpSyncDaemon {
    if (!DdbHpSyncDaemon.instance) {
      DdbHpSyncDaemon.instance = new DdbHpSyncDaemon();
    }
    return DdbHpSyncDaemon.instance;
  }

  public init(io: Server) {
    this.io = io;
    console.log('[DdbHpSyncDaemon] Initialized with Socket.io server.');

    // Transmit current D&D Beyond HP state to newly connected DM and Player View clients
    this.io.on('connection', (socket) => {
      if (this.cachedCharacters.length > 0) {
        socket.emit('DDB_CAMPAIGN_SYNC_INIT', {
          campaignId: this.activeCampaignId,
          characters: this.cachedCharacters
        });
      }
    });
    
    // Auto-discover campaigns and start background monitoring if token exists
    this.startBackgroundMonitoring();
  }

  public async setMonitoredCampaign(campaignId: string) {
    this.activeCampaignId = campaignId;
    console.log(`[DdbHpSyncDaemon] Monitoring D&D Beyond campaign: ${campaignId}`);
    const data = await fetchDdbCampaignCharacters(campaignId);
    
    this.cachedCharacters = data.characters;
    this.monitoredCharacters.clear();
    for (const c of data.characters) {
      if (!c.isPrivate) {
        this.monitoredCharacters.set(c.id, {
          currentHp: c.currentHp,
          maxHp: c.maxHp,
          tempHp: c.tempHp,
          name: c.name
        });
      }
    }

    // Broadcast campaign characters and live HP to all connected sockets
    if (this.io) {
      this.io.emit('DDB_CAMPAIGN_SYNC_INIT', {
        campaignId,
        characters: this.cachedCharacters
      });
    }

    this.ensurePollingStarted();
    return {
      campaignId,
      campaignTitle: data.campaignTitle,
      monitoredCount: this.monitoredCharacters.size,
      characters: data.characters
    };
  }

  public registerCharacter(charId: string, name: string, currentHp: number, maxHp: number, tempHp = 0) {
    this.monitoredCharacters.set(charId, { currentHp, maxHp, tempHp, name });
    this.ensurePollingStarted();
  }

  private async startBackgroundMonitoring() {
    const campaigns = await fetchDdbCampaigns();
    if (campaigns.length > 0) {
      // Default to the first campaign found (e.g. 3290944)
      const primaryCamp = campaigns[0];
      console.log(`[DdbHpSyncDaemon] Auto-attaching to D&D Beyond Campaign: "${primaryCamp.title}" (${primaryCamp.id})`);
      await this.setMonitoredCampaign(primaryCamp.id);
    }
  }

  private ensurePollingStarted() {
    if (this.timer) return;
    console.log('[DdbHpSyncDaemon] Starting 3.5s real-time HP polling loop...');
    this.timer = setInterval(() => this.pollCycle(), 3500);
  }

  public async pollCycle() {
    if (this.isPolling || this.monitoredCharacters.size === 0) return;
    this.isPolling = true;

    try {
      for (const [charId, state] of this.monitoredCharacters.entries()) {
        const live = await fetchDdbCharacterData(charId);
        if (!live || live.currentHp === undefined || live.maxHp === undefined) continue;

        // Check for HP update
        if (live.currentHp !== state.currentHp || live.maxHp !== state.maxHp || (live.tempHp ?? 0) !== state.tempHp) {
          const oldHp = state.currentHp;
          const newHp = live.currentHp;
          const maxHp = live.maxHp;
          const tempHp = live.tempHp ?? 0;
          const charName = live.name || state.name;

          console.log(`[DdbHpSyncDaemon] ⚡ HP CHANGED on D&D Beyond for "${charName}": ${oldHp} -> ${newHp}/${maxHp} (temp: ${tempHp})`);

          // Update internal map
          this.monitoredCharacters.set(charId, {
            currentHp: newHp,
            maxHp,
            tempHp,
            name: charName
          });

          // Update cached characters list
          const cachedIdx = this.cachedCharacters.findIndex(c => c.id === charId);
          if (cachedIdx !== -1) {
            this.cachedCharacters[cachedIdx].currentHp = newHp;
            this.cachedCharacters[cachedIdx].maxHp = maxHp;
            this.cachedCharacters[cachedIdx].tempHp = tempHp;
            this.cachedCharacters[cachedIdx].lastUpdated = Date.now();
          }

          // Broadcast to all connected clients (DM and Player View)
          if (this.io) {
            this.io.emit('DDB_CHARACTER_HP_CHANGED', {
              characterId: charId,
              name: charName,
              currentHp: newHp,
              maxHp,
              tempHp,
              previousHp: oldHp,
              timestamp: Date.now()
            });
          }
        }
      }
    } catch (err) {
      console.error('[DdbHpSyncDaemon] Poll cycle error:', err);
    } finally {
      this.isPolling = false;
    }
  }

  public getStatus() {
    return {
      activeCampaignId: this.activeCampaignId,
      monitoredCharacters: Array.from(this.monitoredCharacters.entries()).map(([id, s]) => ({
        id,
        ...s
      })),
      cachedCharacters: this.cachedCharacters,
      isPollingActive: !!this.timer
    };
  }
}
