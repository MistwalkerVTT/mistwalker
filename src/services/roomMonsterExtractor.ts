import { Monster } from '../types';
import {
  SRD_MONSTERS,
  isExactMonsterMatch,
  isNonCreatureStatOrItem,
  resolveMonster
} from '../data/srdMonstersCatalog';

export interface ExtractedRoomMonster {
  monster: Monster;
  count: number;
  source: 'manual' | 'digest' | 'dmNotes';
  matchedSnippet?: string;
}

const WORD_NUMBERS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20
};

/**
 * Decorative, inanimate, corpse, or illusion contexts immediately preceding a creature word.
 * e.g., "a stone statue of a gargoyle", "a painting of a red dragon", "the corpse of a guard".
 */
const DECORATIVE_OR_DEAD_PREFIX_REGEX =
  /\b(?:statues?|carvings?|sculptures?|paintings?|tapestr(?:y|ies)|murals?|reliefs?|fresco(?:es)?|portraits?|effig(?:y|ies)|figurines?|idols?|drawings?|depictions?|illustrations?|images?|pictures?|symbols?|crests?|emblems?|banners?|etchings?|engravings?|corpses?|bodies|body|bones?|skulls?|remains|carcass(?:es)?|pelts?|hides?|rugs?|troph(?:y|ies)|heads?|taxiderm(?:y|ied)|stuffed|dead|slain|deceased|lifeless|petrified|fossilized|illusion(?:s|\s+of)?|disguised\s+as|dressed\s+as|masquerading\s+as|posing\s+as|resembling|shaped\s+like|looks?\s+like|form\s+of|sound\s+of|smell\s+of|tracks?\s+of|footprints?\s+of)\s+(?:(?:a|an|the|two|three|four|five|six|\d+)\s+)?(?:[\w\-]+\s+){0,2}$/i;

/**
 * Game mechanics or item suffixes immediately following a matched word that prove it's not a creature encounter.
 * e.g. "dragonchess", "gargoyle mask", "giant strength", "intelligence check".
 */
const NON_CREATURE_SUFFIX_REGEX =
  /^\s*(?:check|checks|saving\s+throw|save|saves|modifier|score|bonus|penalty|damage|poison|venom|blood|scale|scales|hide|tooth|teeth|claw|claws|horn|horns|feather|feathers|egg|eggs|mask|masks|statue|statues|figurine|idol|amulet|ring|wand|staff|rod|potion|elixir|scroll|armor|shield|sword|longsword|shortsword|greatsword|dagger|axe|mace|bow|crossbow|spear|chess|dice|card|cards|coin|coins|key|lock|trap|rune|glyph|mark|sigil|tattoo|painting|portrait|tapestry|mural|carving|relief|rug|pelt|skull|bones|corpse|remains)\b/i;

/**
 * Checks whether a raw string from a PDF room's `monsters` array is a valid creature entry
 * rather than a weapon ("+1 longsword"), ability check ("DC 20 Intelligence"), or hazard.
 */
export function isValidExplicitMonsterEntry(raw: any): boolean {
  if (!raw) return false;
  if (isNonCreatureStatOrItem(raw)) return false;

  const str = typeof raw === 'string' ? raw.trim() : String(raw?.name || '').trim();
  if (!str || str.length < 2) return false;

  // Reject strings that contain DC checks, saving throws, or passive scores
  if (/\b(?:dc\s*\d+|saving\s+throw|ability\s+check|skill\s+check|passive\s+perception)\b/i.test(str)) {
    return false;
  }

  // Reject strings that start with a + or - modifier (e.g. "+1 Longsword", "+2 Shield")
  if (/^[+\-]\s*\d+/i.test(str)) {
    return false;
  }

  // Reject decorative descriptions accidentally placed in monsters array
  if (DECORATIVE_OR_DEAD_PREFIX_REGEX.test(str)) {
    return false;
  }

  return true;
}

/**
 * Sanitizes an array of raw monster strings (e.g. from Gemini PDF digestion)
 * and removes any weapons, items, ability checks, or duplicate entries.
 */
export function sanitizeMonsterStringList(rawList: any[]): string[] {
  if (!Array.isArray(rawList)) return [];
  const seen = new Set<string>();
  const valid: string[] = [];

  for (const item of rawList) {
    if (!isValidExplicitMonsterEntry(item)) continue;
    const str = (typeof item === 'string' ? item : String(item?.name || '')).trim();
    const key = str.toLowerCase().replace(/\s+/g, ' ');
    if (!seen.has(key)) {
      seen.add(key);
      valid.push(str);
    }
  }

  return valid;
}

/**
 * Builds a regex pattern for a canonical monster name, supporting standard 5e plural forms.
 */
function buildMonsterRegexPattern(monsterName: string): string {
  const mName = monsterName.trim();
  const escaped = mName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const lower = mName.toLowerCase();

  if (lower.endsWith('y') && !lower.endsWith('ey') && !lower.endsWith('ay') && !lower.endsWith('oy')) {
    const root = escaped.slice(0, -1);
    return `(?:${root}ies|${escaped})`;
  }
  if (lower.endsWith('f')) {
    const root = escaped.slice(0, -1);
    return `(?:${root}ves|${escaped}s?)`;
  }
  if (lower.endsWith('fe')) {
    const root = escaped.slice(0, -2);
    return `(?:${root}ves|${escaped}s?)`;
  }
  if (lower.endsWith('man')) {
    const root = escaped.slice(0, -3);
    return `(?:${root}men|${escaped}s?)`;
  }
  if (lower.endsWith('ch') || lower.endsWith('sh') || lower.endsWith('x') || lower.endsWith('s') || lower.endsWith('z')) {
    return `(?:${escaped}es|${escaped})`;
  }
  return `${escaped}s?`;
}

/**
 * Extracts all verified monsters from DM Notes using:
 * 1. Named NPC statblock patterns: e.g. "Guerthel (LN male human veteran)" or "uses the mage stat block"
 * 2. Longest-match span-masking dictionary scan against all Compendium + SRD monsters
 * 3. Linguistic context validation (rejecting statues, paintings, corpses, DC checks, and items)
 */
export function extractMonstersFromDmNotes(
  dmNotesText: string,
  allAvailableMonsters: Monster[],
  hiddenMonsterNames: string[] = []
): ExtractedRoomMonster[] {
  if (!dmNotesText || !dmNotesText.trim()) return [];

  // Normalize markdown bold/italic markers into spaces while preserving character positions/readability
  const cleanText = dmNotesText
    .replace(/\*\*+/g, '')
    .replace(/__+/g, '')
    .replace(/\r\n/g, '\n');

  // Track character spans that have already been matched so substrings ("Guard" inside "Guard Drake",
  // "Vampire" inside "Vampire Spawn") cannot double-match.
  const masked = new Uint8Array(cleanText.length);

  const markMasked = (start: number, end: number) => {
    for (let i = Math.max(0, start); i < Math.min(cleanText.length, end); i++) {
      masked[i] = 1;
    }
  };

  const isSpanMasked = (start: number, end: number): boolean => {
    for (let i = Math.max(0, start); i < Math.min(cleanText.length, end); i++) {
      if (masked[i] === 1) return true;
    }
    return false;
  };

  const hiddenSet = new Set(hiddenMonsterNames.map(n => n.toLowerCase().trim()));

  // Sort monsters by name length descending so compound names ("Adult Red Dragon", "Vampire Spawn", "Guard Drake")
  // always match and mask their span before shorter base names ("Dragon", "Vampire", "Guard").
  const catalog = [...allAvailableMonsters]
    .filter(m => m?.name && !isNonCreatureStatOrItem(m.name) && m.source !== 'Encounter Notes')
    .sort((a, b) => b.name.length - a.name.length);

  // Deduplicate catalog by lowercase monster name
  const uniqueCatalog: Monster[] = [];
  const seenCatalogNames = new Set<string>();
  for (const m of catalog) {
    const key = m.name.trim().toLowerCase();
    if (!seenCatalogNames.has(key)) {
      seenCatalogNames.add(key);
      uniqueCatalog.push(m);
    }
  }

  const results: ExtractedRoomMonster[] = [];

  // PASS 1: Named NPC + Statblock Alias Patterns
  // e.g. "Guerthel (a wraith)", "Markus (NE male human assassin)", "uses the archmage stat block"
  for (const m of uniqueCatalog) {
    if (hiddenSet.has(m.name.toLowerCase())) continue;
    const escapedName = m.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Pattern A: "<Proper Name> ([^)]{0,45}\b<MonsterName>)"
    const npcParenRegex = new RegExp(
      `\\b([A-Z][a-zA-Z'\\-]+(?:\\s+[A-Z][a-zA-Z'\\-]+)?)\\s*\\([^()]{0,45}\\b${escapedName}\\b[^()]{0,20}\\)`,
      'g'
    );

    let parenMatch: RegExpExecArray | null;
    while ((parenMatch = npcParenRegex.exec(cleanText)) !== null) {
      const matchStart = parenMatch.index;
      const matchEnd = matchStart + parenMatch[0].length;
      if (isSpanMasked(matchStart, matchEnd)) continue;

      const npcName = parenMatch[1].trim();
      // Ignore common non-name words at start of sentence
      if (/^(?:The|This|That|These|Those|Each|Every|One|Two|Three|Four|Five|Six|Area|Room|Chapter|Table|See|If|When|While|Although)$/i.test(npcName)) {
        continue;
      }
      if (isNonCreatureStatOrItem(npcName)) continue;

      const displayName = `${npcName} (${m.name})`;
      if (hiddenSet.has(displayName.toLowerCase())) continue;

      markMasked(matchStart, matchEnd);
      results.push({
        monster: {
          ...m,
          name: displayName
        },
        count: 1,
        source: 'dmNotes',
        matchedSnippet: parenMatch[0].trim()
      });
    }
  }

  // PASS 2: Multi-Monster Dictionary Scan with Span Masking & Context Validation
  for (const m of uniqueCatalog) {
    const mName = m.name.trim();
    const lowerName = mName.toLowerCase();
    if (hiddenSet.has(lowerName)) continue;

    // Skip ultra-ambiguous single words unless preceded by an explicit count or combat context
    const isAmbiguousSingleWord = /^(?:guard|spy|scout|noble|commoner|priest|mage|knight|veteran|assassin|bandit|cultist|thug|acolyte|gladiator|berserker|druid|archmage|champion|pirate|ghost|shadow|nightmare|mimic|shield\s+guardian)$/i.test(lowerName);

    const patternCore = buildMonsterRegexPattern(mName);

    // Optional count group before the monster name
    const countPattern = `(\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|a|an)`;
    const fullRegex = new RegExp(
      `(?:\\b${countPattern}\\s+(?:x\\s*)?(?:[a-z\\-]+\\s+){0,1})?\\b(${patternCore})\\b`,
      'gi'
    );

    let match: RegExpExecArray | null;
    while ((match = fullRegex.exec(cleanText)) !== null) {
      const fullMatchStr = match[0];
      const rawCountToken = match[1];
      const creatureWord = match[2];
      const matchStart = match.index;
      const matchEnd = matchStart + fullMatchStr.length;
      const creatureStart = matchEnd - creatureWord.length;

      // Skip if the creature word span was already matched by a longer monster name
      if (isSpanMasked(creatureStart, matchEnd)) continue;

      // Inspect surrounding context
      const prefixContext = cleanText.slice(Math.max(0, creatureStart - 55), creatureStart);
      const beforeFullMatch = cleanText.slice(Math.max(0, matchStart - 25), matchStart);
      const suffixContext = cleanText.slice(matchEnd, Math.min(cleanText.length, matchEnd + 35));

      // 1. Reject decorative, statue, painting, or dead/corpse contexts
      if (DECORATIVE_OR_DEAD_PREFIX_REGEX.test(prefixContext) || DECORATIVE_OR_DEAD_PREFIX_REGEX.test(beforeFullMatch)) {
        continue;
      }

      // 2. Reject non-creature suffixes (e.g. "dragonchess", "gargoyle mask", "giant strength")
      if (NON_CREATURE_SUFFIX_REGEX.test(suffixContext)) {
        continue;
      }

      // 3. Reject Idioms for "Guard" / "Shadow" / "Ghost" / "Nightmare"
      if (lowerName === 'guard') {
        if (/\b(?:stand|standing|stands|stood|on|off|keep|keeping|kept|mount|mounting|mounted|point|advance|rear|honor|royal|city|town|castle|temple|palace|prison|vault|body|coast|old|new|safe|mud|hand|cross|arm|leg|shin)\s*$/i.test(prefixContext)) {
          continue;
        }
        // "guard the door", "guards the chest" (used as a verb)
        if (/^\s+(?:the|a|an|this|that|these|those|their|his|her|its)\b/i.test(suffixContext) && !rawCountToken) {
          continue;
        }
      }
      if (lowerName === 'shadow') {
        if (/\b(?:cast|casts|casting|long|deep|dark|dim|faint|flickering|in\s+the|into\s+the|from\s+the|out\s+of\s+the|under\s+the)\s*$/i.test(prefixContext)) {
          continue;
        }
      }
      if (lowerName === 'spy') {
        if (/\b(?:to|can|may|might|could|would)\s*$/i.test(prefixContext)) {
          continue;
        }
      }

      // 4. Validate the count token (ensure it's not a DC, AC, CR, HP, +1, dice formula, or dimension)
      let count = 1;
      let hasExplicitValidCount = false;

      if (rawCountToken) {
        const isInvalidNumberContext =
          /(?:\b(?:dc|ac|cr|hp|level|lvl|page|pg|room|area|zone|chapter|part|table|roll|result|plus|minus|tier|rank|step|stage|phase|round|turn)\s*|[+\-d×x/]|^\d+d)\s*$/i.test(
            beforeFullMatch
          );

        if (isInvalidNumberContext) {
          // If the number was actually part of "DC 15" or "2d6" or "Area 4", do not treat it as a monster count
          continue;
        }

        const lowerCount = rawCountToken.toLowerCase();
        if (lowerCount === 'a' || lowerCount === 'an') {
          count = 1;
          hasExplicitValidCount = true;
        } else {
          const parsed = WORD_NUMBERS[lowerCount] || parseInt(lowerCount, 10);
          if (parsed && parsed > 0 && parsed <= 30) {
            count = parsed;
            hasExplicitValidCount = true;
          }
        }
      }

      // For ambiguous single-word humanoids/creatures ("guard", "spy", "scout", "shadow", "ghost", "noble"),
      // require either an explicit count ("two guards", "4 guards", "a spy") or explicit statblock/encounter phrasing
      if (isAmbiguousSingleWord && !hasExplicitValidCount) {
        const hasEncounterSignal =
          /\b(?:stat\s+block|hostile|attack|attacks|ambush|lurk|lurks|patrol|patrols|stationed|posted|present|occupy|occupies|creatures?|monsters?|enemies|foes?)\b/i.test(
            cleanText.slice(Math.max(0, creatureStart - 80), Math.min(cleanText.length, matchEnd + 80))
          );
        if (!hasEncounterSignal) {
          continue;
        }
      }

      // Mask the matched span so no substring creature or duplicate scan matches here
      markMasked(matchStart, matchEnd);

      const snippetStart = Math.max(0, matchStart - 20);
      const snippetEnd = Math.min(cleanText.length, matchEnd + 25);
      const snippet = cleanText.slice(snippetStart, snippetEnd).replace(/\s+/g, ' ').trim();

      results.push({
        monster: m,
        count,
        source: 'dmNotes',
        matchedSnippet: snippet
      });
    }
  }

  return results;
}

/**
 * High-level resolver for a room's monsters:
 * 1. If manualMonsters is non-empty, resolves those directly.
 * 2. Otherwise resolves explicit monsters from `roomMonsters` / `digestMonsters` (deduplicated so identical lists don't double-count).
 * 3. Scans `dmNotes` (never `boxedText`!) for any monsters mentioned in the DM encounter notes.
 * 4. Merges and deduplicates by monster name.
 */
export function extractAndResolveRoomMonsters(params: {
  manualMonsters?: any[];
  roomMonsters?: any[];
  digestMonsters?: any[];
  dmNotes?: string;
  digestDmNotes?: string;
  roomNumber?: string;
  roomName?: string;
  label?: string;
  allAvailableMonsters: Monster[];
  hiddenMonsterNames?: string[];
}): ExtractedRoomMonster[] {
  const {
    manualMonsters = [],
    roomMonsters = [],
    digestMonsters = [],
    dmNotes = '',
    digestDmNotes = '',
    roomNumber = '',
    roomName = '',
    label = '',
    allAvailableMonsters,
    hiddenMonsterNames = []
  } = params;

  const hiddenSet = new Set(hiddenMonsterNames.map(h => h.toLowerCase().trim()));
  const monsterMap = new Map<string, ExtractedRoomMonster>();

  const addOrMerge = (entry: ExtractedRoomMonster, sumIfSameSource: boolean) => {
    if (!entry.monster?.name) return;
    if (isNonCreatureStatOrItem(entry.monster.name)) return;
    const key = entry.monster.name.trim().toLowerCase();
    if (hiddenSet.has(key)) return;

    const existing = monsterMap.get(key);
    if (!existing) {
      monsterMap.set(key, { ...entry, count: Math.max(1, entry.count || 1) });
    } else if (sumIfSameSource && existing.source === entry.source) {
      existing.count += Math.max(1, entry.count || 1);
    }
  };

  // 1. If the DM has manually edited the room's monster list, respect manualMonsters
  if (manualMonsters.length > 0) {
    for (const raw of manualMonsters) {
      if (!raw || isNonCreatureStatOrItem(raw)) continue;
      const res = resolveMonster(raw, allAvailableMonsters);
      if (res?.monster?.name && !isNonCreatureStatOrItem(res.monster.name)) {
        addOrMerge({ monster: res.monster, count: res.count, source: 'manual' }, true);
      }
    }
    return Array.from(monsterMap.values());
  }

  // 2. Resolve explicit monsters from room.monsters and digestRoom.monsters
  // Deduplicate raw strings between roomMonsters and digestMonsters first so an identical
  // copied array doesn't double the monster count!
  const explicitSourceList =
    Array.isArray(roomMonsters) && roomMonsters.length > 0
      ? roomMonsters
      : Array.isArray(digestMonsters)
        ? digestMonsters
        : [];

  for (const raw of explicitSourceList) {
    if (!isValidExplicitMonsterEntry(raw)) continue;
    const res = resolveMonster(raw, allAvailableMonsters);
    if (res?.monster?.name && !isNonCreatureStatOrItem(res.monster.name)) {
      addOrMerge({ monster: res.monster, count: res.count, source: 'digest' }, true);
    }
  }

  // 3. Scan DM Notes (ONLY dmNotes, never player read-aloud boxedText)
  // If dmNotes and digestDmNotes are identical, only scan once!
  const trimmedDmNotes = (dmNotes || '').trim();
  const trimmedDigestDmNotes = (digestDmNotes || '').trim();
  const combinedDmNotes =
    trimmedDmNotes && trimmedDigestDmNotes && trimmedDmNotes !== trimmedDigestDmNotes
      ? `${trimmedDmNotes}\n${trimmedDigestDmNotes}`
      : trimmedDmNotes || trimmedDigestDmNotes;

  if (combinedDmNotes) {
    const notesExtracted = extractMonstersFromDmNotes(
      combinedDmNotes,
      allAvailableMonsters,
      hiddenMonsterNames
    );

    // Aggregate counts within dmNotes first, then add any monster not already in monsterMap
    const dmNotesAggregated = new Map<string, ExtractedRoomMonster>();
    for (const item of notesExtracted) {
      const baseKey = item.monster.name.trim().toLowerCase();
      // Also check if a named NPC's base statblock or exact name is already present
      const existingInNotes = dmNotesAggregated.get(baseKey);
      if (existingInNotes) {
        existingInNotes.count += item.count;
      } else {
        dmNotesAggregated.set(baseKey, { ...item });
      }
    }

    for (const [key, item] of dmNotesAggregated.entries()) {
      // Only add if not already defined by the explicit digest list
      const baseStatblockName = item.monster.name.replace(/^.*?\((.*?)\)$/, '$1').trim().toLowerCase();
      const alreadyExists =
        monsterMap.has(key) ||
        monsterMap.has(baseStatblockName) ||
        Array.from(monsterMap.keys()).some(k => isExactMonsterMatch(k, key) || isExactMonsterMatch(k, baseStatblockName));

      if (!alreadyExists) {
        addOrMerge(item, false);
      }
    }
  }

  // 4. Preserve special Curse of Strahd Area V8 Coffin Maker's Shop fallback if applicable
  const cleanRoomNum = (roomNumber || label || '')
    .toLowerCase()
    .replace(/^(area|room|zone)\s*/i, '')
    .replace(/[\s\-_:]/g, '');
  const isRoomV8 =
    cleanRoomNum === 'v8' ||
    (label || '').toLowerCase().includes('v8') ||
    (roomName || '').toLowerCase().includes('v8') ||
    (roomName || '').toLowerCase().includes('coffin maker');

  if (isRoomV8 && !hiddenSet.has('zombie')) {
    const hasZombie = Array.from(monsterMap.values()).some(
      r => isExactMonsterMatch(r.monster.name, 'zombie') || isExactMonsterMatch(r.monster.name, 'strahd zombie')
    );
    if (!hasZombie) {
      const zombie =
        allAvailableMonsters.find(m => isExactMonsterMatch(m.name, 'zombie')) ||
        SRD_MONSTERS.find(m => isExactMonsterMatch(m.name, 'zombie'));
      if (zombie) {
        addOrMerge({ monster: zombie, count: 9, source: 'dmNotes' }, false);
      }
    }
  }

  return Array.from(monsterMap.values());
}
