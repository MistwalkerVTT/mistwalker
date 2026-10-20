import { Server } from 'socket.io';
import { getDdbHeaders, getDdbAuthHeaders } from './ddbService';
import { Character } from '../src/types/character';
import { DdbGameLogDaemon } from './ddbGameLogDaemon';
import { findJb2aAsset } from '../src/effects/db/jb2aRegistry';

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

const rawDdbCharacterCache = new Map<string, { data: any; timestamp: number }>();
const RAW_DDB_CACHE_TTL_MS = 12000;

// Fetch raw character payload from D&D Beyond (uses Bearer JWT for character-service v5 + characters/json fallback)
export async function fetchRawDdbCharacter(charId: string, forceRefresh = false): Promise<any | null> {
  const cleanId = String(charId).replace(/^char_ddb_/, '').trim();
  if (!cleanId) return null;

  if (!forceRefresh) {
    const cached = rawDdbCharacterCache.get(cleanId);
    if (cached && Date.now() - cached.timestamp < RAW_DDB_CACHE_TTL_MS) {
      return cached.data;
    }
  }

  try {
    let c: any = null;
    let authHeaders = await getDdbAuthHeaders(forceRefresh);

    try {
      let res = await fetch(`https://character-service.dndbeyond.com/character/v5/character/${cleanId}`, {
        headers: authHeaders
      });

      // If 401/403, refresh Bearer JWT once and retry
      if ((res.status === 401 || res.status === 403) && !forceRefresh) {
        authHeaders = await getDdbAuthHeaders(true);
        res = await fetch(`https://character-service.dndbeyond.com/character/v5/character/${cleanId}`, {
          headers: authHeaders
        });
      }

      if (res.ok) {
        const json = await res.json();
        c = json.data;
      }
    } catch (e) {
      // Primary fetch failed, try fallback
    }

    if (!c) {
      try {
        const fallbackRes = await fetch(`https://www.dndbeyond.com/characters/${cleanId}/json`, {
          headers: authHeaders
        });
        if (fallbackRes.ok) {
          const json = await fallbackRes.json();
          c = json.data || json;
        }
      } catch (e) {
        // Fallback fetch failed
      }
    }

    if (c) {
      rawDdbCharacterCache.set(cleanId, { data: c, timestamp: Date.now() });
    }
    return c;
  } catch (err) {
    console.warn(`[DdbCampaign] Error fetching raw character ${cleanId}:`, err);
    return null;
  }
}

// Fetch single character sheet from D&D Beyond character-service
export async function fetchDdbCharacterData(charId: string): Promise<Partial<DdbCampaignCharacter> | null> {
  try {
    const c = await fetchRawDdbCharacter(charId);
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

// Map spell names or common weapon attacks to authentic JB2A asset IDs (verified against JB2A_REGISTRY)
function matchJb2aAssetId(name: string): string | undefined {
  if (!name) return undefined;
  const n = name.toLowerCase().trim();

  // 1. Direct registry lookup by exact name, normalized id, or dedicated tag
  const direct = findJb2aAsset(name);
  if (direct) return direct.id;

  // 2. Specific spell phrases and cantrips (direct 1:1 authentic animations)
  if (n.includes('druidcraft')) return 'druidcraft';
  if (n.includes('elementalism')) return 'elementalism';
  if (n.includes('faerie fire')) return 'faerie_fire';
  if (n === 'light' || n.includes('daylight') || n.includes('guidance')) return 'light';
  if (n.includes('sunbeam')) return 'sunbeam';
  if (n.includes('create bonfire') || n === 'bonfire') return 'bonfire';
  if (n.includes('teleportation circle') || n === 'teleport') return 'teleport';
  if (n.includes('barkskin')) return 'barkskin';

  if (n.includes('fireball')) return 'fireball';
  if (n.includes('fire bolt') || n.includes('firebolt')) return 'fire_bolt';
  if (n.includes('burning hands')) return 'burning_hands';
  if (n.includes('cone of cold')) return 'cone_of_cold';
  if (n.includes('ray of frost') || n.includes('frostbite') || n.includes('ice knife')) return 'ray_of_frost';
  if (n.includes('eldritch blast')) return 'eldritch_blast';
  if (n.includes('magic missile')) return 'magic_missile';
  if (n.includes('healing word') || n.includes('mass healing word')) return 'healing_word';
  if (n.includes('cure wounds') || n.includes('mass cure wounds') || n.includes('preserve life') || n.includes('wholeness of body') || n.includes('quickened healing') || n.includes('second wind') || n === 'heal') return 'cure_wounds';
  if (n.includes('aid')) return 'aid';
  if (n.includes('sanctuary')) return 'sanctuary';
  if (n.includes('shield')) return 'shield';
  if (n.includes('sacred flame')) return 'sacred_flame';
  if (n.includes('guiding bolt')) return 'guiding_bolt';
  if (n.includes('chromatic orb')) return 'chromatic_orb';
  if (n.includes('scorching ray')) return 'scorching_ray';
  if (n.includes('hellish rebuke')) return 'hellish_rebuke';
  if (n.includes('spiritual weapon')) return 'spiritual_weapon';
  if (n.includes('spirit guardians')) return 'spirit_guardians';
  if (n.includes('misty step') || n.includes("cloud's jaunt") || n.includes('clouds jaunt')) return 'misty_step';
  if (n.includes('thunderwave') || n.includes('thunderclap')) return 'thunderwave';
  if (n.includes('lightning bolt')) return 'lightning_bolt';
  if (n.includes('call lightning')) return 'call_lightning';
  if (n.includes('chain lightning')) return 'chain_lightning';
  if (n.includes('witch bolt') || n.includes('shocking grasp') || n.includes('lightning launcher')) return 'witch_bolt';
  if (n.includes('bless')) return 'bless';
  if (n.includes('bardic inspiration') || n.includes('mantle of inspiration')) return 'bardic_inspiration';
  if (n.includes('cutting words') || n.includes('vicious mockery') || n.includes('dissonant whispers')) return 'cutting_words';
  if (n.includes("hunter's mark") || n.includes('hunters mark') || n.includes('hex')) return 'hunters_mark';
  if (n.includes('toll the dead')) return 'toll_the_dead';
  if (n.includes('arms of hadar') || n.includes('hunger of hadar')) return 'arms_of_hadar';
  if (n.includes('shatter')) return 'shatter';
  if (n.includes('moonbeam')) return 'moonbeam';
  if (n.includes('disintegrate')) return 'disintegrate';
  if (n.includes('cloud of daggers')) return 'cloud_of_daggers';
  if (n.includes('darkness')) return 'darkness';
  if (n.includes('fog cloud')) return 'fog_cloud';
  if (n.includes('grease')) return 'grease';
  if (n.includes('sleep')) return 'sleep';
  if (n.includes('entangle')) return 'entangle';
  if (n.includes('web')) return 'web';
  if (n.includes('ice storm') || n.includes('sleet storm')) return 'ice_storm';
  if (n.includes('black tentacles')) return 'black_tentacles';
  if (n.includes('gust of wind') || n.includes('zephyr strike')) return 'gust_of_wind';
  if (n.includes('caustic brew') || n.includes('acid stream')) return 'caustic_brew';
  if (n.includes('dimension door') || n.includes('vortex warp')) return 'dimension_door';
  if (n.includes('flaming sphere')) return 'flaming_sphere';
  if (n.includes('mage hand') || n.includes('arcane hand')) return 'mage_hand';
  if (n.includes('wall of force') || n.includes('forcecage')) return 'wall_of_force';
  if (n.includes('dancing lights')) return 'dancing_lights';
  if (n.includes('wall of fire')) return 'wall_of_fire';
  if (n.includes('whirlwind')) return 'whirlwind';

  // Explicitly ignore spells that have no authentic JB2A animation yet to prevent false substitutions
  if (
    n.includes('blade ward') ||
    n.includes('blade barrier') ||
    n.includes('glyph of warding') ||
    n.includes('warding bond') ||
    n.includes('hold monster') ||
    n.includes('mansion') ||
    n.includes('false life') ||
    n.includes('restoration') ||
    n.includes('holy weapon') ||
    n.includes('divine word') ||
    n.includes('fire storm') ||
    n.includes('holy aura') ||
    n.includes('magic circle') ||
    n.includes('blight') ||
    n.includes('flame strike') ||
    n.includes('power word') ||
    n.includes('wall of thorns') ||
    n.includes('true strike') ||
    n.includes('phantasmal') ||
    n.includes('protection from') ||
    n.includes('banishment')
  ) {
    return undefined;
  }

  // 3. Class Features & Weapon Attacks (Strict order prevents cross-substring collisions)
  if (n.includes('divine smite') || (n.includes('smite') && !n.includes('smith'))) return 'divine_smite';
  if (n.includes('sneak attack')) return 'sneak_attack';
  if (n.includes('flurry of blows')) return 'flurry_of_blows';
  if (n.includes('stunning strike')) return 'stunning_strike';

  // Crossbows MUST precede bows!
  if (n.includes('crossbow') || n.includes('bolt')) return 'attack_crossbow';
  if (n.includes('bow') || n.includes('arrow')) return 'attack_bow';

  // Polearms & Reach
  if (n.includes('glaive') || n.includes('halberd')) return 'attack_glaive';
  if (n.includes('greatsword') || n.includes('maul')) return 'attack_greatsword';
  if (n.includes('greataxe')) return 'attack_greataxe';
  if (n.includes('battleaxe') || n.includes('handaxe') || (n.includes('axe') && !n.includes('great'))) return 'attack_battleaxe';
  if (n.includes('quarterstaff') || n.includes('staff')) return 'attack_quarterstaff';
  if (n.includes('spear') || n.includes('javelin') || n.includes('trident')) return 'attack_spear';
  if (n.includes('hammer') || n.includes('mace') || n.includes('flail') || n.includes('club') || n.includes('topple')) return 'attack_hammer';
  if (n.includes('dagger') || n.includes('dart')) return 'attack_dagger';
  if (n.includes('sword') || n.includes('scimitar') || n.includes('rapier') || n.includes('slash') || n.includes('cleave')) return 'attack_slash';
  if (n.includes('unarmed') || n.includes('punch') || n.includes('fist') || n.includes('martial arts')) return 'attack_unarmed';
  if (n.includes('bite')) return 'attack_bite';
  if (n.includes('claw')) return 'attack_claw';

  return undefined;
}

const ABILITY_ID_TO_KEY: Record<number, 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'> = {
  1: 'str',
  2: 'dex',
  3: 'con',
  4: 'int',
  5: 'wis',
  6: 'cha'
};

const ABILITY_ID_TO_LABEL: Record<number, string> = {
  1: 'STR',
  2: 'DEX',
  3: 'CON',
  4: 'INT',
  5: 'WIS',
  6: 'CHA'
};

const RESET_TYPE_LABELS: Record<number, string> = {
  1: 'Short Rest',
  2: 'Long Rest',
  3: 'Dawn',
  4: 'Consumable'
};

// Clean HTML tags and resolve D&D Beyond snippet expressions ({{proficiency}}, {{classlevel}}, {{savedc:wis}}, etc.)
function cleanDdbText(
  rawText: string | undefined | null,
  context: {
    totalLevel: number;
    profBonus: number;
    mods: Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', number>;
    scaleValue?: string | number;
    limitedUseMax?: number;
    classLevelNum?: number;
  }
): string {
  if (!rawText) return '';
  let text = String(rawText)
    .replace(/<\/p>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&rsquo;|&#39;/gi, "'")
    .replace(/&ldquo;|&rdquo;|&quot;/gi, '"')
    .replace(/&mdash;|&ndash;/gi, '—')
    .replace(/&amp;/gi, '&')
    .replace(/&times;/gi, 'x');

  // Resolve {{...}} D&D Beyond snippet expressions
  text = text.replace(/\{\{([^}]+)\}\}/g, (_match, exprRaw: string) => {
    const expr = exprRaw.toLowerCase().trim();
    const isSigned = expr.includes('#signed');

    if (expr.startsWith('proficiency')) {
      return isSigned ? `+${context.profBonus}` : String(context.profBonus);
    }
    if (expr.startsWith('characterlevel')) {
      return String(context.totalLevel);
    }
    if (expr.startsWith('classlevel')) {
      return String(context.classLevelNum || context.totalLevel);
    }
    if (expr.startsWith('scalevalue')) {
      return context.scaleValue !== undefined ? String(context.scaleValue) : '';
    }
    if (expr.startsWith('limiteduse')) {
      return context.limitedUseMax !== undefined ? String(context.limitedUseMax) : '1';
    }
    if (expr.startsWith('savedc:')) {
      const statPart = expr.split(':')[1]?.split('#')[0]?.trim() || '';
      let maxMod = -10;
      for (const k of ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const) {
        if (statPart.includes(k)) {
          maxMod = Math.max(maxMod, context.mods[k]);
        }
      }
      if (maxMod > -10) {
        return String(8 + context.profBonus + maxMod);
      }
      return String(8 + context.profBonus);
    }
    if (expr.startsWith('modifier:')) {
      const statPart = expr.split(':')[1]?.split('#')[0]?.trim() || '';
      let maxMod = -10;
      for (const k of ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const) {
        if (statPart.includes(k)) {
          maxMod = Math.max(maxMod, context.mods[k]);
        }
      }
      if (maxMod > -10) {
        if (expr.includes('@min:1')) maxMod = Math.max(1, maxMod);
        return isSigned && maxMod >= 0 ? `+${maxMod}` : String(maxMod);
      }
    }
    if (expr.includes('classlevel') && expr.includes('modifier:')) {
      // e.g. (classlevel*5) or modifier+classlevel
      if (expr.includes('*5')) {
        return String((context.classLevelNum || context.totalLevel) * 5);
      }
    }
    return '';
  });

  return text.replace(/\s+/g, ' ').trim();
}

// Scale cantrip dice by character level (levels 5, 11, 17) and normalize "d6" -> "1d6"
function normalizeDiceString(diceString: string | undefined): string | undefined {
  if (!diceString) return undefined;
  const trimmed = diceString.trim();
  if (/^d\d+/i.test(trimmed)) {
    return `1${trimmed}`;
  }
  return trimmed;
}

function scaleCantripDiceString(diceString: string | undefined, totalLevel: number, canScale: boolean): string | undefined {
  const norm = normalizeDiceString(diceString);
  if (!norm) return undefined;
  if (!canScale) return norm;
  const m = norm.match(/^(\d+)d(\d+)(.*)$/i);
  if (!m) return norm;
  const baseCount = parseInt(m[1], 10) || 1;
  const dieFaces = m[2];
  const rest = m[3] || '';
  if (baseCount !== 1) return norm;
  const multiplier = totalLevel >= 17 ? 4 : totalLevel >= 11 ? 3 : totalLevel >= 5 ? 2 : 1;
  return `${multiplier}d${dieFaces}${rest}`;
}

function canonicalActionKey(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/[\u2018\u2019`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Full D&D Beyond Character normalizer for the MistWalker Tactical Character HUD
export function normalizeDdbCharacterToHud(c: any, charId: string): any {
  if (!c) return null;
  const computed = computeDdbCharacterSheet(c);

  let avatarUrl = c.decorations?.avatarUrl || c.avatarUrl || '';
  if (avatarUrl && avatarUrl.includes('/thumbnails/')) {
    avatarUrl = avatarUrl.replace(/\/thumbnails\/([0-9]+)\/([0-9]+)\/[0-9]+\/[0-9]+\//, '/thumbnails/$1/$2/1000/1000/');
  }

  const classLevel = Array.isArray(c.classes)
    ? c.classes.map((cl: any) => `${cl.definition?.name || 'Class'} ${cl.level || 1}`).join(' / ')
    : `Level ${computed.totalLevel}`;

  const walkSpeed = c.speed?.walk || 30;

  // Ability Modifiers
  const mods = {
    str: Math.floor((computed.stats.str - 10) / 2),
    dex: Math.floor((computed.stats.dex - 10) / 2),
    con: Math.floor((computed.stats.con - 10) / 2),
    int: Math.floor((computed.stats.int - 10) / 2),
    wis: Math.floor((computed.stats.wis - 10) / 2),
    cha: Math.floor((computed.stats.cha - 10) / 2)
  };

  const profBonus = Math.ceil(computed.totalLevel / 4) + 1;

  // Check skill proficiencies from c.modifiers for accurate Passive Perception / Insight / Investigation
  const allModifiers: any[] = [];
  if (c.modifiers && typeof c.modifiers === 'object') {
    for (const cat of Object.keys(c.modifiers)) {
      if (Array.isArray(c.modifiers[cat])) {
        allModifiers.push(...c.modifiers[cat]);
      }
    }
  }
  const hasProf = (subType: string) => allModifiers.some(m => m.type === 'proficiency' && m.subType === subType);
  const hasExp = (subType: string) => allModifiers.some(m => m.type === 'expertise' && m.subType === subType);

  const passivePerception = 10 + mods.wis + (hasExp('perception') ? profBonus * 2 : hasProf('perception') ? profBonus : 0);
  const passiveInsight = 10 + mods.wis + (hasExp('insight') ? profBonus * 2 : hasProf('insight') ? profBonus : 0);
  const passiveInvestigation = 10 + mods.int + (hasExp('investigation') ? profBonus * 2 : hasProf('investigation') ? profBonus : 0);

  // Class inspection for Monk Martial Arts, Rogue Sneak Attack, Artificer Int weapons, Warlock Pact weapons, and Spellcasting
  let monkLevel = 0;
  let rogueLevel = 0;
  let barbarianLevel = 0;
  let isArtificer = false;
  let isPactBlade = false;

  let spellSaveDc = 8 + profBonus + Math.max(mods.int, mods.wis, mods.cha);
  let spellAttackBonus = profBonus + Math.max(mods.int, mods.wis, mods.cha);
  let primarySpellMod = Math.max(mods.int, mods.wis, mods.cha);
  const classSpellAbilityMap = new Map<number, 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'>();

  if (Array.isArray(c.classes)) {
    for (const cl of c.classes) {
      const cName = (cl.definition?.name || '').toLowerCase();
      const lvl = cl.level || 1;
      if (cName.includes('monk')) monkLevel += lvl;
      if (cName.includes('rogue')) rogueLevel += lvl;
      if (cName.includes('barbarian')) barbarianLevel += lvl;
      if (cName.includes('artificer')) isArtificer = true;

      const abilityId = cl.definition?.spellCastingAbilityId || cl.subclassDefinition?.spellCastingAbilityId;
      if (abilityId && ABILITY_ID_TO_KEY[abilityId]) {
        const key = ABILITY_ID_TO_KEY[abilityId];
        const mod = mods[key];
        classSpellAbilityMap.set(cl.id, key);
        spellSaveDc = 8 + profBonus + mod;
        spellAttackBonus = profBonus + mod;
        primarySpellMod = mod;
      }
    }
  }

  // Check if character has Pact of the Blade
  if (Array.isArray(c.actions?.class)) {
    if (c.actions.class.some((a: any) => (a.name || '').toLowerCase().includes('pact of the blade'))) {
      isPactBlade = true;
    }
  }

  const attacks: any[] = [];
  const actions: any[] = [];
  const bonusActions: any[] = [];
  const spells: any[] = [];
  const reactions: any[] = [];
  const items: any[] = [];
  const resources: Array<{ name: string; total: number; available: number; resetType?: string }> = [];
  const seenResourceNames = new Set<string>();

  const snippetCtx = {
    totalLevel: computed.totalLevel,
    profBonus,
    mods,
    classLevelNum: computed.totalLevel
  };

  // =========================================================================
  // 1. WEAPON ATTACKS & CONSUMABLE ITEMS FROM INVENTORY
  // =========================================================================
  if (Array.isArray(c.inventory)) {
    // Sort equipped weapons first so equipped versions win deduplication
    const sortedInventory = [...c.inventory].sort((a, b) => (b.equipped ? 1 : 0) - (a.equipped ? 1 : 0));
    const seenWeaponNames = new Map<string, any>();

    sortedInventory.forEach((item: any, idx: number) => {
      const def = item.definition;
      if (!def) return;
      const itemName: string = (def.name || 'Item').trim();
      const lowerName = itemName.toLowerCase();
      const isEquipped = !!item.equipped;
      const jb2aAssetId = matchJb2aAssetId(itemName);

      if (def.filterType === 'Weapon') {
        // Skip ammunition (Crossbow Bolts, Arrows, Bullets, Blowgun Needles)
        if (
          def.subType === 'Ammunition' ||
          (!def.damage?.diceString && (lowerName.includes('bolt') || lowerName.includes('arrow') || lowerName.includes('bullet') || lowerName.includes('needle')))
        ) {
          return;
        }

        // Deduplicate identical weapons (aggregate quantity for thrown weapons like Handaxe x3)
        if (seenWeaponNames.has(lowerName)) {
          const existing = seenWeaponNames.get(lowerName);
          if (existing && typeof item.quantity === 'number' && item.quantity > 0) {
            existing.quantity = (existing.quantity || 1) + item.quantity;
          }
          return;
        }

        const dmgDice = def.damage?.diceString || '1d6';
        const dmgType = (def.damageType || 'physical').toLowerCase();
        const isRanged = def.attackType === 2;
        const rangeFt = def.range || (isRanged ? 80 : 5);
        const isFinesse = Array.isArray(def.properties) && def.properties.some((p: any) => p.name === 'Finesse');
        const isMonkWeapon = monkLevel > 0 && !def.properties?.some((p: any) => p.name === 'Heavy' || p.name === 'Two-Handed');

        // Determine best ability modifier for this weapon
        let weaponMod = isRanged ? mods.dex : mods.str;
        if (isFinesse || isMonkWeapon) {
          weaponMod = Math.max(mods.str, mods.dex);
        }
        if (isArtificer && (def.magic || lowerName.includes('+') || isEquipped)) {
          weaponMod = Math.max(weaponMod, mods.int);
        }
        if (isPactBlade && isEquipped && !isRanged) {
          weaponMod = Math.max(weaponMod, mods.cha);
        }

        // Detect Magic Bonus (+1, +2, +3) from grantedModifiers or weapon name
        let magicBonus = 0;
        if (Array.isArray(def.grantedModifiers)) {
          for (const gm of def.grantedModifiers) {
            if (gm.type === 'bonus' && gm.subType === 'magic') {
              magicBonus = Math.max(magicBonus, gm.fixedValue ?? gm.value ?? 0);
            }
          }
        }
        if (magicBonus === 0) {
          const nameBonusMatch = itemName.match(/\+\s*([123])\b/);
          if (nameBonusMatch) {
            magicBonus = parseInt(nameBonusMatch[1], 10);
          }
        }

        // Archery fighting style (+2 to ranged weapon attacks)
        const hasArchery = isRanged && allModifiers.some(m => m.type === 'bonus' && m.subType === 'ranged-weapon-attacks');
        const archeryBonus = hasArchery ? 2 : 0;

        const hitBonusVal = profBonus + weaponMod + magicBonus + archeryBonus;
        const dmgModVal = weaponMod + magicBonus;
        const dmgModStr = dmgModVal > 0 ? ` + ${dmgModVal}` : dmgModVal < 0 ? ` - ${Math.abs(dmgModVal)}` : '';

        // Properties & Mastery notes
        const propNames = Array.isArray(def.properties)
          ? def.properties.map((p: any) => p.name).filter(Boolean).join(', ')
          : '';

        const cleanDesc = cleanDdbText(def.description, snippetCtx);

        const weaponAction: any = {
          id: `wpn-${idx}-${def.id || idx}`,
          name: itemName,
          category: 'attacks',
          type: 'action',
          subCategory: 'weapon',
          isAttack: true,
          isEquipped,
          sourceLabel: isEquipped ? 'Equipped Weapon' : 'Weapon',
          rangeFt,
          castingTime: '1 Action',
          hitBonus: hitBonusVal >= 0 ? `+${hitBonusVal}` : `${hitBonusVal}`,
          damageFormula: `${dmgDice}${dmgModStr}`,
          damageType: dmgType,
          notes: propNames || undefined,
          quantity: item.quantity && item.quantity > 1 ? item.quantity : undefined,
          description: propNames
            ? `${isRanged ? 'Ranged' : 'Melee'} Weapon Attack (${propNames}). ${cleanDesc}`.trim()
            : cleanDesc || `Attack with ${itemName}.`,
          jb2aAssetId: jb2aAssetId || (isRanged ? 'attack_bow' : 'attack_slash'),
          iconUrl: def.avatarUrl
        };

        seenWeaponNames.set(lowerName, weaponAction);
        attacks.push(weaponAction);
        actions.push({ ...weaponAction, category: 'actions' });
      } else if (
        def.filterType === 'Potion' ||
        def.filterType === 'Scroll' ||
        def.filterType === 'Wondrous item' && (def.canUse || lowerName.includes('potion') || lowerName.includes('gem of brightness') || lowerName.includes('necklace of fireballs')) ||
        lowerName.includes('potion') ||
        lowerName.includes('elixir') ||
        lowerName.includes('scroll') ||
        lowerName.includes('healer')
      ) {
        const isHealingPotion = lowerName.includes('healing');
        let potionFormula: string | undefined;
        if (isHealingPotion) {
          if (lowerName.includes('supreme')) potionFormula = '10d4 + 20';
          else if (lowerName.includes('superior')) potionFormula = '8d4 + 8';
          else if (lowerName.includes('greater')) potionFormula = '4d4 + 4';
          else potionFormula = '2d4 + 2';
        }
        items.push({
          id: `item-${idx}-${def.id || idx}`,
          name: itemName,
          category: 'items',
          type: 'item',
          subCategory: 'item',
          sourceLabel: def.filterType || 'Item',
          quantity: item.quantity || 1,
          rangeFt: 5,
          description: cleanDdbText(def.description, snippetCtx) || 'Consumable or usable magic item.',
          jb2aAssetId: isHealingPotion ? 'cure_wounds' : jb2aAssetId,
          isHeal: isHealingPotion,
          damageFormula: potionFormula,
          iconUrl: def.avatarUrl
        });
      }
    });
  }

  // Always include Unarmed Strike in Attacks & Actions
  const unarmedMod = monkLevel > 0 ? Math.max(mods.str, mods.dex) : mods.str;
  const unarmedHit = profBonus + unarmedMod;
  const monkDie = monkLevel >= 17 ? '1d12' : monkLevel >= 11 ? '1d10' : monkLevel >= 5 ? '1d8' : monkLevel >= 1 ? '1d6' : '';
  const unarmedDmgFormula = monkDie
    ? `${monkDie}${unarmedMod >= 0 ? ` + ${unarmedMod}` : ` - ${Math.abs(unarmedMod)}`}`
    : `${Math.max(1, 1 + unarmedMod)}`;

  const unarmedAction: any = {
    id: 'attack-unarmed-strike',
    name: monkLevel > 0 ? 'Unarmed Strike (Martial Arts)' : 'Unarmed Strike',
    category: 'attacks',
    type: 'action',
    subCategory: 'unarmed',
    isAttack: true,
    isEquipped: true,
    sourceLabel: monkLevel > 0 ? 'Monk Martial Arts' : 'Unarmed',
    rangeFt: 5,
    castingTime: '1 Action',
    hitBonus: `+${unarmedHit}`,
    damageFormula: unarmedDmgFormula,
    damageType: 'bludgeoning',
    description: monkLevel > 0
      ? 'Melee Martial Arts Strike: Deal bludgeoning damage using your Martial Arts die, grapple, or shove.'
      : 'Melee Unarmed Strike: Deal bludgeoning damage equal to 1 + STR modifier, grapple, or shove.',
    jb2aAssetId: 'attack_unarmed'
  };
  attacks.push(unarmedAction);
  actions.push({ ...unarmedAction, category: 'actions' });

  // =========================================================================
  // 2. CLASS, SPECIES, FEAT, ITEM & CUSTOM ACTIONS (c.actions & c.customActions)
  // =========================================================================
  const actionBuckets: Array<{ sourceCat: string; sourceLabel: string; subCategory: string; list: any[] }> = [
    { sourceCat: 'class', sourceLabel: 'Class Feature', subCategory: 'class', list: Array.isArray(c.actions?.class) ? c.actions.class : [] },
    { sourceCat: 'race', sourceLabel: c.race?.fullName || 'Species Trait', subCategory: 'species', list: Array.isArray(c.actions?.race) ? c.actions.race : [] },
    { sourceCat: 'feat', sourceLabel: 'Feat / Mastery', subCategory: 'feat', list: Array.isArray(c.actions?.feat) ? c.actions.feat : [] },
    { sourceCat: 'item', sourceLabel: 'Magic Item', subCategory: 'item', list: Array.isArray(c.actions?.item) ? c.actions.item : [] },
    { sourceCat: 'background', sourceLabel: 'Background', subCategory: 'feat', list: Array.isArray(c.actions?.background) ? c.actions.background : [] },
    { sourceCat: 'custom', sourceLabel: 'Custom Action', subCategory: 'class', list: Array.isArray(c.customActions) ? c.customActions : [] }
  ];

  const seenFeatureActionNames = new Set<string>();
  // Avoid duplicating basic Unarmed Strike if already added as an action, unless it's the Monk Bonus Action Unarmed Strike
  seenFeatureActionNames.add('action:unarmed strike');

  actionBuckets.forEach(({ sourceCat, sourceLabel, subCategory, list }) => {
    list.forEach((act: any, idx: number) => {
      if (!act || !act.name) return;
      const rawName = String(act.name).trim();
      const lowerName = rawName.toLowerCase();

      // Skip internal D&D Beyond character-sheet bookkeeping toggles
      if (
        lowerName.includes('charge/drain magic item') ||
        lowerName === 'charge magic item' ||
        lowerName === 'drain magic item' ||
        lowerName === 'pact weapon' ||
        lowerName === 'unarmed strike (dex.)' ||
        lowerName.startsWith('infused item')
      ) {
        return;
      }

      const actTypeNum = act.activation?.activationType; // 1=Action, 2=No Action, 3=Bonus Action, 4=Reaction, 8=Special
      const canonName = canonicalActionKey(rawName);
      if (canonName === 'unarmed strike' && actTypeNum === 1) return;
      const dedupeKey = `${actTypeNum || 0}:${canonName}`;
      if (seenFeatureActionNames.has(dedupeKey)) return;
      seenFeatureActionNames.add(dedupeKey);

      // Extract Limited Uses if present
      let usesObj: { available: number; total: number; resetType?: string } | undefined;
      if (act.limitedUse && (act.limitedUse.maxUses > 0 || act.limitedUse.statModifierUsesId)) {
        const statId = act.limitedUse.statModifierUsesId;
        const statBonus = statId && ABILITY_ID_TO_KEY[statId] ? Math.max(1, mods[ABILITY_ID_TO_KEY[statId]]) : 0;
        const maxUses = (act.limitedUse.maxUses || 0) + (act.limitedUse.operator === 1 ? statBonus : (!act.limitedUse.maxUses ? statBonus : 0));
        if (maxUses > 0) {
          const used = act.limitedUse.numberUsed || 0;
          const available = Math.max(0, maxUses - used);
          const resetType = RESET_TYPE_LABELS[act.limitedUse.resetType] || undefined;
          usesObj = { available, total: maxUses, resetType };

          if (!seenResourceNames.has(lowerName)) {
            seenResourceNames.add(lowerName);
            resources.push({
              name: rawName,
              total: maxUses,
              available,
              resetType
            });
          }
        }
      }

      // Extract Damage / Healing Dice from act.dice or known class scaling
      let damageFormula: string | undefined = act.dice?.diceString || undefined;
      let damageType: string | undefined = act.damageTypeId
        ? ({ 1: 'bludgeoning', 2: 'piercing', 3: 'slashing', 4: 'lightning', 5: 'thunder', 6: 'poison', 7: 'cold', 8: 'radiant', 9: 'acid', 10: 'necrotic', 11: 'fire', 12: 'force', 13: 'psychic' }[act.damageTypeId as number])
        : undefined;

      // Special class damage formulas when DDB stores them in scaleValue
      if (!damageFormula) {
        if (lowerName.includes('sneak attack')) {
          const saDice = Math.max(1, Math.ceil((rogueLevel || 1) / 2));
          damageFormula = `${saDice}d6`;
          damageType = 'piercing';
        } else if (lowerName.includes('dreadful strike')) {
          damageFormula = '2d6';
          damageType = 'psychic';
        } else if (lowerName.includes('flurry of blows') || (lowerName === 'unarmed strike' && actTypeNum === 3)) {
          damageFormula = unarmedDmgFormula;
          damageType = 'bludgeoning';
        } else if (lowerName.includes('bardic inspiration')) {
          damageFormula = computed.totalLevel >= 15 ? '1d12' : computed.totalLevel >= 10 ? '1d10' : computed.totalLevel >= 5 ? '1d8' : '1d6';
        } else if (lowerName.includes('crimson rite')) {
          damageFormula = computed.totalLevel >= 11 ? '1d8' : computed.totalLevel >= 5 ? '1d6' : '1d4';
        } else if (lowerName.includes('wholeness of body')) {
          damageFormula = `${monkDie || '1d8'} + ${mods.wis}`;
        } else if (lowerName.includes('quickened healing')) {
          damageFormula = `${monkDie || '1d8'} + ${profBonus}`;
        } else if (lowerName.includes('preserve life')) {
          damageFormula = `${computed.totalLevel * 5}`;
        } else if (lowerName.includes('second wind')) {
          damageFormula = `1d10 + ${computed.totalLevel}`;
        }
      }

      // Check if this action is an attack roll (e.g. Lightning Launcher, Breath Weapon, Starry Form Archer)
      const isAttackAction = Boolean(
        act.isAttack ||
        act.attackTypeRange ||
        lowerName.includes('launcher') ||
        lowerName.includes('cleave') ||
        lowerName.includes('topple') ||
        lowerName.includes('sneak attack') ||
        lowerName.includes('dreadful strike') ||
        lowerName.includes('flurry of blows') ||
        (lowerName === 'unarmed strike' && actTypeNum === 3)
      );

      let hitBonus: string | undefined;
      if (act.isAttack || lowerName.includes('launcher')) {
        const statId = act.abilityModifierStatId;
        const atkMod = statId && ABILITY_ID_TO_KEY[statId]
          ? mods[ABILITY_ID_TO_KEY[statId]]
          : Math.max(mods.str, mods.dex, mods.int);
        const totalHit = (act.isProficient !== false ? profBonus : 0) + atkMod;
        hitBonus = `+${totalHit}`;
        if (damageFormula && !damageFormula.includes('+') && !damageFormula.includes('-')) {
          damageFormula = `${damageFormula}${atkMod >= 0 ? ` + ${atkMod}` : ` - ${Math.abs(atkMod)}`}`;
        }
      } else if (lowerName.includes('flurry of blows') || (lowerName === 'unarmed strike' && actTypeNum === 3)) {
        hitBonus = `+${unarmedHit}`;
      }

      // Save DC on feature action
      let saveDc: number | undefined;
      let saveAbility: string | undefined;
      if (act.saveStatId && ABILITY_ID_TO_LABEL[act.saveStatId]) {
        saveAbility = ABILITY_ID_TO_LABEL[act.saveStatId];
        const dcStatId = act.abilityModifierStatId;
        const dcMod = dcStatId && ABILITY_ID_TO_KEY[dcStatId]
          ? mods[ABILITY_ID_TO_KEY[dcStatId]]
          : Math.max(mods.str, mods.dex, mods.con, mods.int, mods.wis, mods.cha);
        saveDc = 8 + profBonus + dcMod;
      }

      const rangeFt = act.range?.range || act.range?.rangeValue || (lowerName.includes("cloud's jaunt") || lowerName.includes('jaunt') ? 30 : lowerName.includes('launcher') ? 90 : isAttackAction ? 5 : 0);

      const isHeal = Boolean(
        lowerName.includes('heal') ||
        lowerName.includes('preserve life') ||
        lowerName.includes('wholeness of body') ||
        lowerName.includes('second wind') ||
        lowerName.includes('mantle of inspiration') ||
        lowerName.includes('lay on hands')
      );

      const isSelfAction = Boolean(
        rangeFt === 0 &&
        !isAttackAction &&
        (lowerName.includes('rage') ||
          lowerName.includes('large form') ||
          lowerName.includes('patient defense') ||
          lowerName.includes('step of the wind') ||
          lowerName.includes('cunning action') ||
          lowerName.includes('crimson rite') ||
          lowerName.includes('harness divine power') ||
          lowerName.includes('second wind') ||
          lowerName.includes('wholeness of body') ||
          lowerName.includes('quickened healing'))
      );

      const descText = cleanDdbText(act.snippet || act.description, {
        ...snippetCtx,
        scaleValue: damageFormula,
        limitedUseMax: usesObj?.total
      }) || `${sourceLabel}: ${rawName}`;

      const castingTimeLabel =
        actTypeNum === 3 ? '1 Bonus Action' :
        actTypeNum === 4 ? '1 Reaction' :
        actTypeNum === 1 ? '1 Action' :
        'Special';

      const category: 'actions' | 'bonus_actions' | 'reactions' =
        actTypeNum === 3 ? 'bonus_actions' :
        actTypeNum === 4 ? 'reactions' :
        'actions';

      const hudAction: any = {
        id: `feat-${sourceCat}-${idx}-${act.id || idx}`,
        name: rawName,
        category,
        type: actTypeNum === 3 ? 'bonus_action' : actTypeNum === 4 ? 'reaction' : 'action',
        subCategory: lowerName.includes('cleave') || lowerName.includes('topple') || lowerName.includes('mastery') ? 'mastery' : subCategory,
        sourceLabel,
        rangeFt,
        castingTime: castingTimeLabel,
        hitBonus,
        saveDc,
        saveAbility,
        damageFormula,
        damageType,
        uses: usesObj,
        isHeal,
        isAttack: isAttackAction,
        isSelfAction,
        description: descText,
        jb2aAssetId: matchJb2aAssetId(rawName)
      };

      if (actTypeNum === 3) {
        bonusActions.push(hudAction);
        if (isAttackAction) {
          attacks.push({ ...hudAction, category: 'attacks' });
        }
      } else if (actTypeNum === 4) {
        reactions.push(hudAction);
      } else {
        // Action (1) or Special Combat Action (0 / 2 / 8)
        actions.push(hudAction);
        if (isAttackAction) {
          attacks.push({ ...hudAction, category: 'attacks' });
        }
      }
    });
  });

  // =========================================================================
  // 3. STANDARD 5E COMBAT ACTIONS & REACTIONS
  // =========================================================================
  actions.push(
    {
      id: 'action-dash',
      name: 'Dash',
      category: 'actions',
      type: 'action',
      subCategory: 'standard',
      sourceLabel: 'Standard Action',
      castingTime: '1 Action',
      isSelfAction: true,
      description: 'Gain extra movement equal to your speed for the current turn.',
      rangeFt: 0
    },
    {
      id: 'action-disengage',
      name: 'Disengage',
      category: 'actions',
      type: 'action',
      subCategory: 'standard',
      sourceLabel: 'Standard Action',
      castingTime: '1 Action',
      isSelfAction: true,
      description: 'Your movement does not provoke opportunity attacks for the rest of the turn.',
      rangeFt: 0
    },
    {
      id: 'action-dodge',
      name: 'Dodge',
      category: 'actions',
      type: 'action',
      subCategory: 'standard',
      sourceLabel: 'Standard Action',
      castingTime: '1 Action',
      isSelfAction: true,
      description: 'Attack rolls against you have disadvantage until the start of your next turn, and you make DEX saves with advantage.',
      rangeFt: 0
    },
    {
      id: 'action-help',
      name: 'Help',
      category: 'actions',
      type: 'action',
      subCategory: 'standard',
      sourceLabel: 'Standard Action',
      castingTime: '1 Action',
      description: 'Lend aid to an ally, giving them advantage on their next ability check or attack roll.',
      rangeFt: 5
    },
    {
      id: 'action-hide',
      name: 'Hide',
      category: 'actions',
      type: 'action',
      subCategory: 'standard',
      sourceLabel: 'Standard Action',
      castingTime: '1 Action',
      isSelfAction: true,
      description: 'Make a Dexterity (Stealth) check to become Hidden.',
      rangeFt: 0
    }
  );

  // Add Opportunity Attack to Reactions if not already present
  if (!reactions.some(r => r.name.toLowerCase().includes('opportunity'))) {
    const primaryWeapon = attacks[0];
    reactions.unshift({
      id: 'reaction-opportunity-attack',
      name: 'Opportunity Attack',
      category: 'reactions',
      type: 'reaction',
      subCategory: 'standard',
      sourceLabel: 'Standard Reaction',
      castingTime: '1 Reaction',
      isAttack: true,
      rangeFt: 5,
      hitBonus: primaryWeapon?.hitBonus || `+${unarmedHit}`,
      damageFormula: primaryWeapon?.damageFormula || unarmedDmgFormula,
      damageType: primaryWeapon?.damageType || 'slashing',
      description: 'Make one melee attack against a hostile creature that moves out of your reach.',
      jb2aAssetId: primaryWeapon?.jb2aAssetId || 'attack_slash'
    });
  }

  // =========================================================================
  // 4. SPELLS EXTRACTION (Cantrips + Leveled Spells + Damage/Save DC + Bonus/Reaction Routing)
  // =========================================================================
  const rawSpellsList: Array<{ sp: any; classAbilityKey?: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'; sourceTag: string }> = [];
  if (Array.isArray(c.classSpells)) {
    c.classSpells.forEach((cs: any) => {
      const abilityKey = classSpellAbilityMap.get(cs.characterClassId);
      if (Array.isArray(cs.spells)) {
        cs.spells.forEach((sp: any) => rawSpellsList.push({ sp, classAbilityKey: abilityKey, sourceTag: 'Class Spell' }));
      }
    });
  }
  if (Array.isArray(c.spells?.race)) {
    c.spells.race.forEach((sp: any) => rawSpellsList.push({ sp, sourceTag: c.race?.fullName || 'Species Spell' }));
  }
  if (Array.isArray(c.spells?.class)) {
    c.spells.class.forEach((sp: any) => rawSpellsList.push({ sp, sourceTag: 'Class Feature Spell' }));
  }
  if (Array.isArray(c.spells?.feat)) {
    c.spells.feat.forEach((sp: any) => rawSpellsList.push({ sp, sourceTag: 'Feat Spell' }));
  }
  if (Array.isArray(c.spells?.item)) {
    c.spells.item.forEach((sp: any) => rawSpellsList.push({ sp, sourceTag: 'Magic Item Spell' }));
  }

  const seenSpellNames = new Set<string>();
  rawSpellsList.forEach(({ sp, classAbilityKey, sourceTag }, idx: number) => {
    const def = sp?.definition;
    if (!def || !def.name) return;
    const name = String(def.name).trim();
    const lowerName = canonicalActionKey(name);
    if (seenSpellNames.has(lowerName)) return;
    seenSpellNames.add(lowerName);

    const level = typeof def.level === 'number' ? def.level : 0;
    const school = (def.school || 'evocation').toLowerCase();
    const rangeFt = def.range?.rangeValue || (def.range?.origin === 'Touch' ? 5 : def.range?.origin === 'Self' ? 0 : 30);
    const actType = def.activation?.activationType;
    const isBonusAction = actType === 3;
    const isReaction = actType === 4;
    const castingTime = isBonusAction ? '1 Bonus Action' : isReaction ? '1 Reaction' : '1 Action';
    const jb2aAssetId = matchJb2aAssetId(name);

    // Determine spellcasting ability modifier for this specific spell
    const spellStatId = sp.spellCastingAbilityId || def.spellCastingAbilityId;
    const spellAbilityKey = (spellStatId && ABILITY_ID_TO_KEY[spellStatId]) || classAbilityKey;
    const thisSpellMod = spellAbilityKey ? mods[spellAbilityKey] : primarySpellMod;
    const thisSpellAttack = profBonus + thisSpellMod;
    const thisSpellSaveDc = 8 + profBonus + thisSpellMod;

    // Extract Damage or Healing from def.modifiers
    let damageFormula: string | undefined;
    let damageType: string | undefined;
    let isHeal = lowerName.includes('cure') || lowerName.includes('heal') || lowerName.includes('restoration') || lowerName.includes('revivify') || lowerName.includes('aid');

    if (Array.isArray(def.modifiers)) {
      for (const m of def.modifiers) {
        if (m.type === 'damage') {
          const rawDice = normalizeDiceString(m.die?.diceString || (m.fixedValue ? String(m.fixedValue) : undefined));
          if (rawDice && !damageFormula) {
            damageFormula = level === 0
              ? scaleCantripDiceString(rawDice, computed.totalLevel, Boolean(def.canCastAtHigherLevel))
              : rawDice;
            damageType = m.subType ? String(m.subType).toLowerCase() : undefined;
            if (m.usePrimaryStat) {
              damageFormula = `${damageFormula}${thisSpellMod >= 0 ? ` + ${thisSpellMod}` : ` - ${Math.abs(thisSpellMod)}`}`;
            }
          }
        } else if (
          m.type === 'bonus' &&
          (m.subType === 'hit-points' || m.subType === 'regain-hit-points' || m.subType === 'temporary-hit-points')
        ) {
          isHeal = true;
          const rawDice = normalizeDiceString(m.die?.diceString || (m.fixedValue ? String(m.fixedValue) : undefined));
          if (rawDice && !damageFormula) {
            const addSpellMod = m.usePrimaryStat || lowerName.includes('cure wounds') || lowerName.includes('healing word');
            damageFormula = addSpellMod
              ? `${rawDice}${thisSpellMod >= 0 ? ` + ${thisSpellMod}` : ` - ${Math.abs(thisSpellMod)}`}`
              : rawDice;
            damageType = m.subType === 'temporary-hit-points' ? 'temp hp' : 'healing';
          }
        }
      }
    }

    // Fallback healing formula if not found in modifiers
    if (isHeal && !damageFormula) {
      if (lowerName.includes('healing word')) damageFormula = `1d4 + ${thisSpellMod}`;
      else if (lowerName.includes('cure wounds')) damageFormula = `1d8 + ${thisSpellMod}`;
    }

    const hitBonus = def.requiresAttackRoll ? `+${thisSpellAttack}` : undefined;
    const saveDc = def.requiresSavingThrow ? thisSpellSaveDc : undefined;
    const saveAbility = def.requiresSavingThrow && def.saveDcAbilityId ? ABILITY_ID_TO_LABEL[def.saveDcAbilityId] : undefined;

    // Limited uses on innate / item / feat spells
    let usesObj: { available: number; total: number; resetType?: string } | undefined;
    if (sp.limitedUse && sp.limitedUse.maxUses > 0) {
      const maxU = sp.limitedUse.maxUses;
      const usedU = sp.limitedUse.numberUsed || 0;
      usesObj = {
        available: Math.max(0, maxU - usedU),
        total: maxU,
        resetType: RESET_TYPE_LABELS[sp.limitedUse.resetType]
      };
    }

    const cleanDesc = cleanDdbText(def.description, snippetCtx);

    const hudSpell: any = {
      id: `spell-${idx}-${def.id || idx}`,
      name,
      category: 'spells',
      type: isBonusAction ? 'bonus_action' : isReaction ? 'reaction' : 'action',
      subCategory: 'spell',
      sourceLabel: level === 0 ? 'Cantrip' : `Level ${level} Spell (${sourceTag})`,
      level,
      school,
      rangeFt,
      castingTime,
      hitBonus,
      saveDc,
      saveAbility,
      damageFormula,
      damageType,
      uses: usesObj,
      spellSlotRequired: level > 0 && !sp.usesSpellSlot === false ? level : (level > 0 ? level : undefined),
      description: cleanDesc,
      jb2aAssetId,
      isHeal,
      isAttack: Boolean(def.requiresAttackRoll),
      isSelfAction: rangeFt === 0 && !def.requiresAttackRoll && !def.requiresSavingThrow,
      isPrepared: Boolean(sp.prepared || sp.alwaysPrepared || level === 0 || sourceTag !== 'Class Spell')
    };

    spells.push(hudSpell);

    // Cross-list Bonus Action Spells into Bonus Actions tab so they are immediately available there too!
    if (isBonusAction && !bonusActions.some(b => canonicalActionKey(b.name) === lowerName)) {
      bonusActions.push({
        ...hudSpell,
        id: `ba-spell-${idx}-${def.id || idx}`,
        category: 'bonus_actions'
      });
    }

    // Cross-list Reaction Spells into Reactions tab!
    if (isReaction && !reactions.some(r => canonicalActionKey(r.name) === lowerName)) {
      reactions.push({
        ...hudSpell,
        id: `rx-spell-${idx}-${def.id || idx}`,
        category: 'reactions'
      });
    }

    // Cross-list Attack Roll Cantrips/Spells into Attacks tab as Spell Attacks
    if (def.requiresAttackRoll && !attacks.some(a => canonicalActionKey(a.name) === lowerName)) {
      attacks.push({
        ...hudSpell,
        id: `atk-spell-${idx}-${def.id || idx}`,
        category: 'attacks',
        sourceLabel: level === 0 ? 'Spell Attack (Cantrip)' : `Spell Attack (L${level})`
      });
    }
  });

  // Sort spells by level ascending (Cantrips 0 first, then 1..9), then alphabetically
  spells.sort((a, b) => {
    const lvlA = a.level ?? 0;
    const lvlB = b.level ?? 0;
    if (lvlA !== lvlB) return lvlA - lvlB;
    return a.name.localeCompare(b.name);
  });

  // Spell Slots calculation
  const spellSlots: Record<number, any> = {};
  if (Array.isArray(c.spellSlots)) {
    c.spellSlots.forEach((slot: any, idx: number) => {
      const lvl = idx + 1;
      const total = slot.max || 0;
      const used = slot.used || 0;
      if (total > 0) {
        spellSlots[lvl] = {
          level: lvl,
          total,
          used,
          available: Math.max(0, total - used)
        };
      }
    });
  }

  // Pact Magic Slots
  if (Array.isArray(c.pactMagic)) {
    c.pactMagic.forEach((pact: any) => {
      if (pact.level && pact.max > 0) {
        const lvl = pact.level;
        const total = pact.max;
        const used = pact.used || 0;
        spellSlots[lvl] = {
          level: lvl,
          total: (spellSlots[lvl]?.total || 0) + total,
          used: (spellSlots[lvl]?.used || 0) + used,
          available: Math.max(0, ((spellSlots[lvl]?.total || 0) + total) - ((spellSlots[lvl]?.used || 0) + used))
        };
      }
    });
  }

  // Ensure spell slot levels exist if character has prepared/known leveled spells (e.g. DDB v5 sometimes stores default slots in class definition)
  if (Object.keys(spellSlots).length === 0 && spells.some(s => (s.level || 0) > 0) && Array.isArray(c.classes)) {
    for (const cl of c.classes) {
      const canCast = cl.definition?.canCastSpells || cl.subclassDefinition?.canCastSpells;
      const spellRules = cl.definition?.spellRules;
      if (canCast && spellRules && Array.isArray(spellRules.levelSpellSlots)) {
        const slotsForLevel = spellRules.levelSpellSlots[cl.level || 1];
        if (Array.isArray(slotsForLevel)) {
          const usedByLevel = Array.isArray(c.spellSlots) ? c.spellSlots : [];
          slotsForLevel.forEach((maxSlots: number, idx: number) => {
            if (maxSlots > 0) {
              const lvl = idx + 1;
              const used = usedByLevel[idx]?.used || 0;
              spellSlots[lvl] = {
                level: lvl,
                total: maxSlots,
                used,
                available: Math.max(0, maxSlots - used)
              };
            }
          });
        }
      }
    }
  }

  return {
    id: charId,
    ddbCharacterId: String(charId),
    isLiveSynced: true,
    name: c.name || 'Character',
    avatarUrl,
    race: c.race?.fullName || 'Humanoid',
    classLevel,
    totalLevel: computed.totalLevel,
    ac: computed.ac,
    currentHp: computed.currentHp,
    maxHp: computed.maxHp,
    tempHp: computed.tempHp,
    speed: `${walkSpeed} ft.`,
    walkSpeedFt: walkSpeed,
    passivePerception,
    passiveInsight,
    passiveInvestigation,
    spellSaveDc,
    spellAttackBonus,
    deathSaves: {
      successes: c.deathSaveInfo?.successCount || 0,
      failures: c.deathSaveInfo?.failCount || 0
    },
    attacks,
    actions,
    bonusActions,
    spells,
    reactions,
    items,
    spellSlots,
    resources,
    readonlyUrl: c.readonlyUrl || `https://www.dndbeyond.com/characters/${charId}`,
    lastUpdated: Date.now()
  };
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

  public async attachCampaign(campaignId: string) {
    if (!campaignId) return;
    try {
      DdbGameLogDaemon.getInstance().addCampaign(campaignId);
      const data = await fetchDdbCampaignCharacters(campaignId);
      for (const c of data.characters) {
        const existingIdx = this.cachedCharacters.findIndex(x => x.id === c.id);
        if (existingIdx !== -1) {
          this.cachedCharacters[existingIdx] = c;
        } else {
          this.cachedCharacters.push(c);
        }

        if (!c.isPrivate) {
          this.monitoredCharacters.set(c.id, {
            currentHp: c.currentHp,
            maxHp: c.maxHp,
            tempHp: c.tempHp,
            name: c.name
          });
        }
      }
      this.ensurePollingStarted();
      return data;
    } catch (err) {
      console.warn(`[DdbHpSyncDaemon] Error attaching campaign ${campaignId}:`, err);
      return null;
    }
  }

  public async setMonitoredCampaign(campaignId: string) {
    this.activeCampaignId = campaignId;
    console.log(`[DdbHpSyncDaemon] Monitoring D&D Beyond campaign: ${campaignId}`);
    try {
      DdbGameLogDaemon.getInstance().addCampaign(campaignId);
    } catch (e) {
      console.warn('[DdbCampaignService] GameLog daemon start note:', e);
    }
    const data = await fetchDdbCampaignCharacters(campaignId);
    
    // Merge into cachedCharacters and monitoredCharacters
    for (const c of data.characters) {
      const existingIdx = this.cachedCharacters.findIndex(x => x.id === c.id);
      if (existingIdx !== -1) {
        this.cachedCharacters[existingIdx] = c;
      } else {
        this.cachedCharacters.push(c);
      }

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
      characters: this.cachedCharacters
    };
  }

  public registerCharacter(charId: string, name: string, currentHp: number, maxHp: number, tempHp = 0) {
    this.monitoredCharacters.set(charId, { currentHp, maxHp, tempHp, name });
    this.ensurePollingStarted();
  }

  public async addMonitoredCharacter(rawId: string | number, initialName?: string): Promise<Partial<DdbCampaignCharacter> | null> {
    if (!rawId) return null;
    const charId = String(rawId).replace(/^char_ddb_/, '').trim();
    if (!charId || isNaN(Number(charId))) return null;

    if (!this.monitoredCharacters.has(charId)) {
      this.monitoredCharacters.set(charId, {
        currentHp: 20,
        maxHp: 20,
        tempHp: 0,
        name: initialName || `Character ${charId}`
      });
    }

    this.ensurePollingStarted();

    try {
      const live = await fetchDdbCharacterData(charId);
      if (live && live.currentHp !== undefined && live.maxHp !== undefined) {
        this.monitoredCharacters.set(charId, {
          currentHp: live.currentHp,
          maxHp: live.maxHp,
          tempHp: live.tempHp ?? 0,
          name: live.name || initialName || `Character ${charId}`
        });

        const existingIdx = this.cachedCharacters.findIndex(c => c.id === charId);
        if (existingIdx !== -1) {
          this.cachedCharacters[existingIdx] = {
            ...this.cachedCharacters[existingIdx],
            ...live
          } as DdbCampaignCharacter;
        } else {
          this.cachedCharacters.push(live as DdbCampaignCharacter);
        }

        return live;
      }
    } catch (err) {
      console.warn(`[DdbHpSyncDaemon] Error fetching initial data for character ${charId}:`, err);
    }
    return null;
  }

  public async addMonitoredCharacters(characterIds: (string | number)[]): Promise<any[]> {
    const results: any[] = [];
    if (!Array.isArray(characterIds)) return results;
    for (const rawId of characterIds) {
      const live = await this.addMonitoredCharacter(rawId);
      if (live) results.push(live);
    }
    this.ensurePollingStarted();
    return results;
  }

  public getCachedCharacter(characterId: string): DdbCampaignCharacter | undefined {
    return this.cachedCharacters.find(c => c.id === characterId);
  }

  private async startBackgroundMonitoring() {
    // 1. Always monitor default hero characters (Varrak, Noctua, Aggie, Rowan)
    const defaultHeroIds = ['146614740', '147334187', '158502126', '146533824'];
    for (const id of defaultHeroIds) {
      await this.addMonitoredCharacter(id);
    }

    // 2. Auto-discover user campaigns
    const campaignIds = new Set<string>(['3290944', '6738033']);
    if (process.env.DND_BEYOND_CAMPAIGN_ID) {
      process.env.DND_BEYOND_CAMPAIGN_ID.split(',').map(s => s.trim()).filter(Boolean).forEach(id => campaignIds.add(id));
    }
    try {
      const campaigns = await fetchDdbCampaigns();
      for (const c of campaigns) {
        if (c.id) campaignIds.add(c.id);
      }
    } catch (err: any) {
      console.warn('[DdbHpSyncDaemon] Auto-fetch campaigns note:', err.message);
    }

    console.log(`[DdbHpSyncDaemon] Auto-attaching to D&D Beyond Campaigns: ${Array.from(campaignIds).join(', ')}`);
    for (const campId of campaignIds) {
      await this.attachCampaign(campId);
    }

    this.ensurePollingStarted();

    if (this.io && this.cachedCharacters.length > 0) {
      this.io.emit('DDB_CAMPAIGN_SYNC_INIT', {
        campaignId: Array.from(campaignIds)[0],
        characters: this.cachedCharacters
      });
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
        try {
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
            } else {
              this.cachedCharacters.push(live as DdbCampaignCharacter);
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
        } catch (charErr) {
          // Individual character polling error - continue with next character
          console.warn(`[DdbHpSyncDaemon] Poll error for character ${charId}:`, charErr);
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
