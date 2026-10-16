import fs from 'fs';
import path from 'path';
import type { Monster } from '../src/types/monster';

export interface DdbBookConfig {
  id: string;
  name: string;
  category: 'Core' | 'Expansion' | 'Adventure';
  baseUrl: string;
  chapters: string[];
  estimatedCount: number;
}

export const DDB_SUPPORTED_BOOKS: DdbBookConfig[] = [
  {
    id: 'mm',
    name: 'Monster Manual (2014)',
    category: 'Core',
    baseUrl: 'https://www.dndbeyond.com/sources/mm',
    chapters: [
      'monsters-a', 'monsters-b', 'monsters-c', 'monsters-d', 'monsters-e',
      'monsters-f', 'monsters-g', 'monsters-h', 'monsters-i', 'monsters-j',
      'monsters-k', 'monsters-l', 'monsters-m', 'monsters-n', 'monsters-o',
      'monsters-p', 'monsters-q', 'monsters-r', 'monsters-s', 'monsters-t',
      'monsters-u', 'monsters-v', 'monsters-w', 'monsters-x', 'monsters-y',
      'monsters-z', 'miscellaneous-creatures'
    ],
    estimatedCount: 450
  },
  {
    id: 'motm',
    name: 'Monsters of the Multiverse',
    category: 'Core',
    baseUrl: 'https://www.dndbeyond.com/sources/motm',
    chapters: ['bestiary'],
    estimatedCount: 262
  },
  {
    id: 'ftod',
    name: 'Fizban’s Treasury of Dragons',
    category: 'Expansion',
    baseUrl: 'https://www.dndbeyond.com/sources/ftod',
    chapters: ['bestiary'],
    estimatedCount: 80
  },
  {
    id: 'veor',
    name: 'Vecna: Eve of Ruin',
    category: 'Adventure',
    baseUrl: 'https://www.dndbeyond.com/sources/veor',
    chapters: ['bestiary'],
    estimatedCount: 45
  },
  {
    id: 'toa',
    name: 'Tomb of Annihilation',
    category: 'Adventure',
    baseUrl: 'https://www.dndbeyond.com/sources/toa',
    chapters: ['monsters-and-npcs'],
    estimatedCount: 55
  }
];

const COMPENDIUM_FILE_PATH = path.resolve(process.cwd(), 'public', 'data', 'dndbeyond_compendium.json');

export function getCobaltToken(): string {
  return process.env.DND_BEYOND_COBALT_SESSION || '';
}

export function getDdbHeaders(token?: string): Record<string, string> {
  const activeToken = token || getCobaltToken();
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Cookie': 'CobaltSession=' + activeToken,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8'
  };
}

// Load cached catalog from JSON file
export function loadCachedCompendium(): Monster[] {
  try {
    if (fs.existsSync(COMPENDIUM_FILE_PATH)) {
      const raw = fs.readFileSync(COMPENDIUM_FILE_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('[DdbService] Error reading compendium cache:', err);
  }
  return [];
}

// Save catalog to JSON file
export function saveCachedCompendium(monsters: Monster[]): void {
  try {
    const dir = path.dirname(COMPENDIUM_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(COMPENDIUM_FILE_PATH, JSON.stringify(monsters, null, 2), 'utf-8');

    // Also sync to dist/data if dist exists
    const distPath = path.resolve(process.cwd(), 'dist', 'data', 'dndbeyond_compendium.json');
    const distDir = path.dirname(distPath);
    if (fs.existsSync(distDir)) {
      fs.writeFileSync(distPath, JSON.stringify(monsters, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('[DdbService] Error saving compendium cache:', err);
  }
}


// Universal title regex matching both classic and modern DDB sourcebook formats
export const UNIVERSAL_TITLE_REGEX = /(?:<p class="Stat-Block-Styles_Stat-Block-Title"[^>]*>|<h[1-5][^>]*>(?:<a[^>]+aria-hidden="true"[^>]*><\/a>)?\s*)<a[^>]+href="\/monsters\/([0-9]+-[^"]+)"[^>]*>([^<]+)<\/a>/gi;

// Parse a single D&D Beyond HTML stat block into a clean Monster object
export function parseStatBlockHtml(blockHtml: string, sourceName: string): Monster | null {
  const titleRegex = /(?:<p class="Stat-Block-Styles_Stat-Block-Title"[^>]*>|<h[1-5][^>]*>(?:<a[^>]+aria-hidden="true"[^>]*><\/a>)?\s*)<a[^>]+href="\/monsters\/([0-9]+-[^"]+)"[^>]*>([^<]+)<\/a>/i;
  const titleMatch = blockHtml.match(titleRegex);
  if (!titleMatch) return null;

  const slug = titleMatch[1];
  const rawId = slug.split('-')[0];
  const name = titleMatch[2].trim();

  // Metadata: Size, type, subtype, alignment
  const metaMatch = blockHtml.match(/<p class="Stat-Block-Styles_Stat-Block-Metadata"[^>]*>([\s\S]*?)<\/p>/i) ||
                    blockHtml.match(/<p[^>]*>\s*([A-Za-z]+\s+(?:humanoid|fiend|undead|aberration|beast|construct|dragon|elemental|fey|giant|monstrosity|ooze|plant|celestial)[\s\S]*?)<\/p>/i);
  const metaText = metaMatch ? metaMatch[1].replace(/<[^>]+>/g, '').trim() : '';

  const sizeMatch = metaText.match(/^(Tiny|Small|Medium|Large|Huge|Gargantuan)/i);
  const size: any = sizeMatch ? sizeMatch[1] : 'Medium';

  let type = 'Humanoid';
  let alignment = 'Neutral';
  const metaParts = metaText.split(',');
  if (metaParts.length >= 2) {
    alignment = metaParts[metaParts.length - 1].trim();
    type = metaParts.slice(0, metaParts.length - 1).join(',').replace(/^(Tiny|Small|Medium|Large|Huge|Gargantuan)\s+/i, '').trim();
  } else if (metaParts.length === 1) {
    type = metaParts[0].replace(/^(Tiny|Small|Medium|Large|Huge|Gargantuan)\s+/i, '').trim();
  }

  function getDataField(fieldName: string): string {
    const regex = new RegExp(`<strong>${fieldName}<\\/strong>\\s*([\\s\\S]*?)<\\/p>`, 'i');
    const m = blockHtml.match(regex);
    if (!m) return '';
    return m[1].replace(/<[^>]+>/g, '').trim();
  }

  // Armor Class
  const acRaw = getDataField('Armor Class');
  const acNum = parseInt(acRaw.match(/[0-9]+/)?.[0] || '10', 10);
  const acNotes = acRaw.replace(/^[0-9]+\s*/, '').trim() || undefined;

  // Hit Points
  const hpRaw = getDataField('Hit Points');
  const hpNum = parseInt(hpRaw.match(/[0-9]+/)?.[0] || '10', 10);
  const hpFormulaMatch = hpRaw.match(/\(([^)]+)\)/);
  const hpFormula = hpFormulaMatch ? `(${hpFormulaMatch[1]})` : undefined;

  // Speed
  const speed = getDataField('Speed') || '30 ft.';

  // Ability Scores
  const stats: Record<string, number> = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  const statRegex = /<div class="stat-block-ability-scores-heading"[^>]*>([A-Z]{3})<\/div>[\s\S]*?<span class="stat-block-ability-scores-score"[^>]*>([0-9]+)<\/span>/gi;
  let sMatch;
  while ((sMatch = statRegex.exec(blockHtml)) !== null) {
    const key = sMatch[1].toLowerCase();
    if (stats[key] !== undefined) {
      stats[key] = parseInt(sMatch[2], 10);
    }
  }

  const savingThrows = getDataField('Saving Throws') || undefined;
  const skills = getDataField('Skills') || undefined;
  const damageResistances = getDataField('Damage Resistances') || undefined;
  const damageVulnerabilities = getDataField('Damage Vulnerabilities') || undefined;
  const damageImmunities = getDataField('Damage Immunities') || undefined;
  const conditionImmunities = getDataField('Condition Immunities') || undefined;
  const senses = getDataField('Senses') || undefined;
  const languages = getDataField('Languages') || undefined;
  const challengeRaw = getDataField('Challenge') || '1 (200 XP)';

  // Image extraction
  const imgMatch = blockHtml.match(/<a class="ddb-lightbox-outer[^"]*" href="([^"]+)"/i) || blockHtml.match(/<img[^>]+src="([^">]+avatars\/thumbnails\/[^">]+)"/i);
  let avatarUrl = imgMatch ? imgMatch[1] : undefined;
  if (avatarUrl && avatarUrl.includes('/thumbnails/')) {
    avatarUrl = avatarUrl.replace(/\/thumbnails\/([0-9]+)\/([0-9]+)\/[0-9]+\/[0-9]+\//, '/thumbnails/$1/$2/1000/1000/');
  }

  // Parse Traits, Actions, Reactions, Legendary Actions
  const traits: Array<{ name: string; description: string }> = [];
  const actions: Array<{ name: string; description: string }> = [];
  const reactions: Array<{ name: string; description: string }> = [];
  const legendaryActions: Array<{ name: string; description: string }> = [];
  let currentSection: 'traits' | 'actions' | 'reactions' | 'legendary' = 'traits';

  const chIdx = blockHtml.indexOf('Challenge');
  const bodyHtml = chIdx !== -1 ? blockHtml.slice(chIdx) : blockHtml;

  const elementRegex = /(?:<p class="Stat-Block-Styles_Stat-Block-(Heading|Body)"[^>]*>|<(h[2-5])[^>]*>|<(p)[^>]*>)([\s\S]*?)<\/(?:p|h[2-5])>/gi;
  let elem;
  while ((elem = elementRegex.exec(bodyHtml)) !== null) {
    const isHeadingClass = elem[1] === 'Heading';
    const isHeadingTag = !!elem[2];
    const rawContent = elem[4] || '';
    const textClean = rawContent.replace(/<[^>]+>/g, '').trim();

    if (isHeadingClass || isHeadingTag) {
      const headingLower = textClean.toLowerCase();
      if (headingLower.includes('action')) {
        currentSection = 'actions';
      } else if (headingLower.includes('reaction')) {
        currentSection = 'reactions';
      } else if (headingLower.includes('legendary')) {
        currentSection = 'legendary';
      }
      continue;
    }

    const nameMatch = rawContent.match(/<em><strong>([^<]+)<\/strong><\/em>/i) ||
                      rawContent.match(/<strong><em>([^<]+)<\/em><\/strong>/i) ||
                      rawContent.match(/<strong>([^<]+)<\/strong>/i);
    const itemName = nameMatch ? nameMatch[1].replace(/\.$/, '').trim() : '';
    const desc = textClean.replace(new RegExp(`^${itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.?\\s*`, 'i'), '').trim();

    if (!itemName && !desc) continue;
    if (textClean.startsWith('Challenge') || textClean.startsWith('Armor Class') || textClean.startsWith('Hit Points')) continue;

    const itemObj = {
      name: itemName || 'Special',
      description: desc || textClean
    };

    if (currentSection === 'traits') {
      traits.push(itemObj);
    } else if (currentSection === 'actions') {
      actions.push(itemObj);
    } else if (currentSection === 'reactions') {
      reactions.push(itemObj);
    } else if (currentSection === 'legendary') {
      legendaryActions.push(itemObj);
    }
  }

  return {
    monsterId: `ddb_${rawId}`,
    name,
    size,
    type,
    alignment,
    ac: acNum,
    acNotes,
    hp: hpNum,
    hpFormula,
    speed,
    initiativeBonus: Math.floor((stats.dex - 10) / 2),
    str: stats.str,
    dex: stats.dex,
    con: stats.con,
    int: stats.int,
    wis: stats.wis,
    cha: stats.cha,
    savingThrows,
    skills,
    damageResistances,
    damageVulnerabilities,
    damageImmunities,
    conditionImmunities,
    senses,
    languages,
    challenge: challengeRaw,
    proficiencyBonus: 2,
    avatarUrl,
    traits,
    actions,
    reactions: reactions.length > 0 ? reactions : undefined,
    legendaryActions: legendaryActions.length > 0 ? legendaryActions : undefined,
    source: sourceName
  };
}

// Fetch avatar from monster-service if not in stat block HTML
export async function fetchMonsterAvatarUrl(rawId: string, headers: Record<string, string>): Promise<string | undefined> {
  try {
    const res = await fetch(`https://monster-service.dndbeyond.com/v1/Monster/${rawId}`, { headers });
    if (res.ok) {
      const data = await res.json();
      return data.data?.largeAvatarUrl || data.data?.avatarUrl || undefined;
    }
  } catch (err) {
    // Ignore error
  }
  return undefined;
}

// Ingest an entire sourcebook
export async function ingestSourcebook(
  bookId: string,
  onProgress?: (progress: { currentChapter: string; totalChapters: number; currentChapterIndex: number; monstersParsed: number; currentMonsterName?: string }) => void
): Promise<Monster[]> {
  const book = DDB_SUPPORTED_BOOKS.find(b => b.id === bookId);
  if (!book) throw new Error(`Book configuration not found for id: ${bookId}`);

  const headers = getDdbHeaders();
  const allParsed: Monster[] = [];

  for (let cIdx = 0; cIdx < book.chapters.length; cIdx++) {
    const ch = book.chapters[cIdx];
    const chapterUrl = `${book.baseUrl}/${ch}`;
    
    if (onProgress) {
      onProgress({
        currentChapter: ch,
        totalChapters: book.chapters.length,
        currentChapterIndex: cIdx + 1,
        monstersParsed: allParsed.length
      });
    }

    try {
      const res = await fetch(chapterUrl, { headers });
      if (!res.ok) {
        console.warn(`[DdbService] Skipping chapter ${chapterUrl}: status ${res.status}`);
        continue;
      }

      const html = await res.text();
      const titleMatches = [...html.matchAll(UNIVERSAL_TITLE_REGEX)];

      for (let i = 0; i < titleMatches.length; i++) {
        const start = titleMatches[i].index!;
        const end = (i + 1 < titleMatches.length) ? titleMatches[i + 1].index! : html.length;
        const block = html.slice(start, end);
        const parsed = parseStatBlockHtml(block, book.name);

        if (parsed) {
          // If avatar missing, attempt monster-service lookup
          if (!parsed.avatarUrl) {
            const rawId = parsed.monsterId.replace('ddb_', '');
            const fetchedAvatar = await fetchMonsterAvatarUrl(rawId, headers);
            if (fetchedAvatar) {
              parsed.avatarUrl = fetchedAvatar;
            }
          }

          allParsed.push(parsed);

          if (onProgress) {
            onProgress({
              currentChapter: ch,
              totalChapters: book.chapters.length,
              currentChapterIndex: cIdx + 1,
              monstersParsed: allParsed.length,
              currentMonsterName: parsed.name
            });
          }
        }
      }

      // Small pause between chapters to respect DDB servers
      await new Promise(r => setTimeout(r, 400));
    } catch (err) {
      console.error(`[DdbService] Error ingesting chapter ${ch}:`, err);
    }
  }

  // Update cached compendium
  const existing = loadCachedCompendium();
  const monsterMap = new Map<string, Monster>();
  existing.forEach(m => monsterMap.set(m.monsterId, m));
  allParsed.forEach(m => monsterMap.set(m.monsterId, m));
  
  const merged = Array.from(monsterMap.values());
  saveCachedCompendium(merged);

  return allParsed;
}

// Mapping tables for D&D Beyond API IDs
export const DDB_CR_MAP: Record<number, { cr: string; xp: string; pb: number; defAc: number; defHp: number }> = {
  1: { cr: '0', xp: '10 XP', pb: 2, defAc: 13, defHp: 4 },
  2: { cr: '1/8', xp: '25 XP', pb: 2, defAc: 13, defHp: 9 },
  3: { cr: '1/4', xp: '50 XP', pb: 2, defAc: 13, defHp: 15 },
  4: { cr: '1/2', xp: '100 XP', pb: 2, defAc: 13, defHp: 24 },
  5: { cr: '1', xp: '200 XP', pb: 2, defAc: 13, defHp: 35 },
  6: { cr: '2', xp: '450 XP', pb: 2, defAc: 13, defHp: 50 },
  7: { cr: '3', xp: '700 XP', pb: 2, defAc: 13, defHp: 65 },
  8: { cr: '4', xp: '1,100 XP', pb: 2, defAc: 14, defHp: 85 },
  9: { cr: '5', xp: '1,800 XP', pb: 3, defAc: 15, defHp: 100 },
  10: { cr: '6', xp: '2,300 XP', pb: 3, defAc: 15, defHp: 115 },
  11: { cr: '7', xp: '2,900 XP', pb: 3, defAc: 15, defHp: 130 },
  12: { cr: '8', xp: '3,900 XP', pb: 3, defAc: 16, defHp: 145 },
  13: { cr: '9', xp: '5,000 XP', pb: 4, defAc: 16, defHp: 160 },
  14: { cr: '10', xp: '5,900 XP', pb: 4, defAc: 17, defHp: 180 },
  15: { cr: '11', xp: '7,200 XP', pb: 4, defAc: 17, defHp: 195 },
  16: { cr: '12', xp: '8,400 XP', pb: 4, defAc: 17, defHp: 210 },
  17: { cr: '13', xp: '10,000 XP', pb: 5, defAc: 18, defHp: 225 },
  18: { cr: '14', xp: '11,500 XP', pb: 5, defAc: 18, defHp: 240 },
  19: { cr: '15', xp: '13,000 XP', pb: 5, defAc: 18, defHp: 260 },
  20: { cr: '16', xp: '15,000 XP', pb: 5, defAc: 18, defHp: 280 },
  21: { cr: '17', xp: '18,000 XP', pb: 6, defAc: 19, defHp: 300 },
  22: { cr: '18', xp: '20,000 XP', pb: 6, defAc: 19, defHp: 320 },
  23: { cr: '19', xp: '22,000 XP', pb: 6, defAc: 19, defHp: 340 },
  24: { cr: '20', xp: '25,000 XP', pb: 6, defAc: 19, defHp: 360 },
  25: { cr: '21', xp: '33,000 XP', pb: 7, defAc: 19, defHp: 400 },
  26: { cr: '22', xp: '41,000 XP', pb: 7, defAc: 19, defHp: 450 },
  27: { cr: '23', xp: '50,000 XP', pb: 7, defAc: 19, defHp: 500 },
  28: { cr: '24', xp: '62,000 XP', pb: 7, defAc: 19, defHp: 550 },
  29: { cr: '25', xp: '75,000 XP', pb: 8, defAc: 19, defHp: 600 },
  30: { cr: '26', xp: '90,000 XP', pb: 8, defAc: 19, defHp: 650 },
  31: { cr: '27', xp: '105,000 XP', pb: 8, defAc: 19, defHp: 700 },
  32: { cr: '28', xp: '120,000 XP', pb: 8, defAc: 19, defHp: 750 },
  33: { cr: '29', xp: '135,000 XP', pb: 9, defAc: 19, defHp: 800 },
  34: { cr: '30', xp: '155,000 XP', pb: 9, defAc: 19, defHp: 850 }
};

export const DDB_SIZE_MAP: Record<number, 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan'> = {
  1: 'Tiny',
  2: 'Tiny',
  3: 'Small',
  4: 'Medium',
  5: 'Large',
  6: 'Huge',
  7: 'Gargantuan'
};

export const DDB_TYPE_MAP: Record<number, string> = {
  1: 'Aberration',
  2: 'Beast',
  3: 'Celestial',
  4: 'Construct',
  6: 'Dragon',
  7: 'Elemental',
  8: 'Fey',
  9: 'Fiend',
  10: 'Giant',
  11: 'Humanoid',
  13: 'Monstrosity',
  14: 'Ooze',
  15: 'Plant',
  16: 'Undead'
};

export const DDB_ALIGNMENT_MAP: Record<number, string> = {
  1: 'Lawful Good',
  2: 'Neutral Good',
  3: 'Chaotic Good',
  4: 'Lawful Neutral',
  5: 'Neutral',
  6: 'Chaotic Neutral',
  7: 'Lawful Evil',
  8: 'Neutral Evil',
  9: 'Chaotic Evil',
  10: 'Unaligned',
  11: 'Any Alignment'
};

export const DDB_SOURCE_MAP: Record<number, string> = {
  1: "Player's Handbook (2014)",
  2: 'Monster Manual (2014)',
  3: "Dungeon Master's Guide (2014)",
  4: 'Basic Rules',
  5: 'Curse of Strahd',
  6: "Storm King's Thunder",
  7: "Volo's Guide to Monsters",
  8: 'Tales from the Yawning Portal',
  9: 'Tomb of Annihilation',
  27: "Mordenkainen's Tome of Foes",
  33: 'Waterdeep: Dragon Heist',
  35: 'Waterdeep: Dungeon of the Mad Mage',
  38: "Guildmasters' Guide to Ravnica",
  40: 'Ghosts of Saltmarsh',
  44: "Baldur's Gate: Descent into Avernus",
  49: 'Eberron: Rising from the Last War',
  51: "Explorer's Guide to Wildemount",
  53: 'Mythic Odysseys of Theros',
  55: 'Icewind Dale: Rime of the Frostmaiden',
  59: "Tasha's Cauldron of Everything",
  60: 'Candlekeep Mysteries',
  61: 'The Wild Beyond the Witchlight',
  67: 'Monsters of the Multiverse',
  81: "Fizban's Treasury of Dragons",
  85: 'Critical Role: Call of the Netherdeep',
  95: 'Spelljammer: Adventures in Space',
  96: 'Dragonlance: Shadow of the Dragon Queen',
  106: 'Keys from the Golden Vault',
  110: 'Bigby Presents: Glory of the Giants',
  113: 'Phandelver and Below: The Shattered Obelisk',
  115: 'Planescape: Adventures in the Multiverse',
  120: 'Vecna: Eve of Ruin',
  121: 'Quests from the Infinite Staircase',
  145: "Player's Handbook (2024)",
  146: 'Monster Manual (2024)',
  147: "Dungeon Master's Guide (2024)"
};

// Helper: Parse HTML action/trait blocks into structured { name, description } items
export function parseHtmlDescription(html?: string): Array<{ name: string; description: string }> {
  if (!html) return [];
  const items: Array<{ name: string; description: string }> = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match;
  while ((match = pRegex.exec(html)) !== null) {
    const raw = match[1];
    const nameMatch = raw.match(/<(?:strong|b)>(?:<(?:em|i)>)?(.*?)(?:<\/(?:em|i)>)?<\/(?:strong|b)>\.?/i) ||
                      raw.match(/<(?:em|i)>(?:<(?:strong|b)>)?(.*?)(?:<\/(?:strong|b)>)?<\/(?:em|i)>\.?/i);
    const name = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, '').trim().replace(/\.$/, '') : '';
    let desc = raw.replace(/<[^>]+>/g, '').trim();
    if (name && desc.toLowerCase().startsWith(name.toLowerCase())) {
      desc = desc.slice(name.length).replace(/^[\.\s]+/, '').trim();
    }
    if (name) {
      items.push({ name, description: desc });
    } else if (items.length > 0 && desc) {
      items[items.length - 1].description += '\n' + desc;
    } else if (desc) {
      items.push({ name: 'Special', description: desc });
    }
  }
  return items;
}

// Convert any D&D Beyond API Monster object into a full MistWalker Monster
export function convertDdbApiMonsterToMonster(raw: any): Monster {
  const crInfo = DDB_CR_MAP[raw.challengeRatingId] || { cr: '1', xp: '200 XP', pb: 2, defAc: 13, defHp: 30 };
  const size = DDB_SIZE_MAP[raw.sizeId] || 'Medium';
  const type = DDB_TYPE_MAP[raw.typeId] || (raw.tags && raw.tags[0]) || 'Humanoid';
  const alignment = DDB_ALIGNMENT_MAP[raw.alignmentId] || 'Unaligned';

  // Stats
  const stats: Record<string, number> = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  if (Array.isArray(raw.stats) && raw.stats.length > 0) {
    const statKeyMap: Record<number, string> = { 1: 'str', 2: 'dex', 3: 'con', 4: 'int', 5: 'wis', 6: 'cha' };
    for (const s of raw.stats) {
      const k = statKeyMap[s.statId];
      if (k && typeof s.value === 'number') {
        stats[k] = s.value;
      }
    }
  }

  // Speed
  let speed = '30 ft.';
  if (Array.isArray(raw.movements) && raw.movements.length > 0) {
    const moveTypeMap: Record<number, string> = { 1: '', 2: 'burrow', 3: 'climb', 4: 'fly', 5: 'swim' };
    const speeds = raw.movements.map((m: any) => {
      const prefix = moveTypeMap[m.movementId] ? `${moveTypeMap[m.movementId]} ` : '';
      return `${prefix}${m.speed} ft.`;
    });
    speed = speeds.join(', ') || '30 ft.';
  }

  // Token Image (High-res upscaled thumbnail)
  let avatarUrl = raw.largeAvatarUrl || raw.avatarUrl || raw.basicAvatarUrl;
  if (avatarUrl && avatarUrl.includes('/thumbnails/')) {
    avatarUrl = avatarUrl.replace(/\/thumbnails\/([0-9]+)\/([0-9]+)\/[0-9]+\/[0-9]+\//, '/thumbnails/$1/$2/1000/1000/');
  }

  // AC & HP
  const ac = (raw.armorClass && raw.armorClass > 0) ? raw.armorClass : crInfo.defAc;
  const acNotes = raw.armorClassDescription || undefined;
  const hp = (raw.averageHitPoints && raw.averageHitPoints > 0) ? raw.averageHitPoints : crInfo.defHp;
  const hpFormula = raw.hitPointDice?.diceString ? `(${raw.hitPointDice.diceString})` : undefined;

  // Traits & Actions
  const traits = parseHtmlDescription(raw.specialTraitsDescription);
  const actions = parseHtmlDescription(raw.actionsDescription);
  const reactions = parseHtmlDescription(raw.reactionsDescription);
  const bonusActions = parseHtmlDescription(raw.bonusActionsDescription);
  const legendaryActions = parseHtmlDescription(raw.legendaryActionsDescription);

  if (actions.length === 0) {
    const attackBonus = crInfo.pb + Math.max(Math.floor((stats.str - 10) / 2), Math.floor((stats.dex - 10) / 2), 1);
    actions.push({
      name: 'Strike',
      description: `Melee Weapon Attack: +${attackBonus} to hit, reach 5 ft., one target. Hit: standard damage according to CR ${crInfo.cr}.`
    });
  }

  // Determine sourcebook name
  let sourceName = 'D&D Beyond';
  if (Array.isArray(raw.sources) && raw.sources.length > 0) {
    const sId = raw.sources[0]?.sourceId;
    if (sId && DDB_SOURCE_MAP[sId]) {
      sourceName = DDB_SOURCE_MAP[sId];
      if (raw.sources[0]?.pageNumber) {
        sourceName += ` (p. ${raw.sources[0].pageNumber})`;
      }
    } else if (sId) {
      sourceName = `D&D Beyond (Source #${sId})`;
    }
  }

  return {
    monsterId: `ddb_${raw.id}`,
    name: raw.name,
    size,
    type,
    alignment,
    ac,
    acNotes,
    hp,
    hpFormula,
    speed,
    initiativeBonus: typeof raw.initiativeBonus === 'number' ? raw.initiativeBonus : Math.floor((stats.dex - 10) / 2),
    str: stats.str,
    dex: stats.dex,
    con: stats.con,
    int: stats.int,
    wis: stats.wis,
    cha: stats.cha,
    savingThrows: raw.savingThrowsHtml || undefined,
    skills: raw.skillsHtml || undefined,
    senses: raw.sensesHtml || (raw.passivePerception ? `Passive Perception ${raw.passivePerception}` : undefined),
    languages: raw.languageDescription?.trim() || raw.languageNote?.trim() || undefined,
    challenge: `${crInfo.cr} (${crInfo.xp})`,
    proficiencyBonus: crInfo.pb,
    avatarUrl,
    traits: traits.length > 0 ? traits : undefined,
    actions,
    reactions: reactions.length > 0 ? reactions : undefined,
    bonusActions: bonusActions.length > 0 ? bonusActions : undefined,
    legendaryActions: legendaryActions.length > 0 ? legendaryActions : undefined,
    source: sourceName
  };
}

export interface DdbLiveSearchResult {
  monsters: Monster[];
  total: number;
  page: number;
  take: number;
  totalPages: number;
}

// Live search on D&D Beyond by query string with pagination across all 6,000+ monsters
export async function searchDdbLive(
  query: string = '',
  page: number = 1,
  take: number = 24
): Promise<DdbLiveSearchResult> {
  const headers = getDdbHeaders();
  const validPage = Math.max(1, page);
  const validTake = Math.min(50, Math.max(1, take));
  const skip = (validPage - 1) * validTake;

  let url = `https://monster-service.dndbeyond.com/v1/Monster?take=${validTake}&skip=${skip}`;
  if (query && query.trim()) {
    url += `&search=${encodeURIComponent(query.trim())}`;
  }

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.warn(`[DdbService] DDB API returned status ${res.status}`);
      return { monsters: [], total: 0, page: validPage, take: validTake, totalPages: 0 };
    }

    const data = await res.json();
    const rawList = data.data || [];
    const total = data.pagination?.total ?? rawList.length;
    const monsters = rawList.map((m: any) => convertDdbApiMonsterToMonster(m));

    return {
      monsters,
      total,
      page: validPage,
      take: validTake,
      totalPages: Math.ceil(total / validTake)
    };
  } catch (err) {
    console.error('[DdbService] Error searching live monsters:', err);
    return { monsters: [], total: 0, page: validPage, take: validTake, totalPages: 0 };
  }
}

// Fetch a single monster by ID from D&D Beyond API
export async function fetchSingleDdbMonster(id: number): Promise<Monster | null> {
  const headers = getDdbHeaders();
  try {
    const res = await fetch(`https://monster-service.dndbeyond.com/v1/Monster/${id}`, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.data) return null;
    return convertDdbApiMonsterToMonster(data.data);
  } catch (err) {
    console.error(`[DdbService] Error fetching single monster ${id}:`, err);
    return null;
  }
}

