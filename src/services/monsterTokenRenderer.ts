import { Monster } from '../types/monster';
import { DEFAULT_MONSTERS } from '../data/defaultMonsters';
import { isExactMonsterMatch } from '../data/srdMonstersCatalog';
import { saveMonster } from '../lib/firebase';
import { createThumbnailDataUrl } from '../lib/storageCache';

export const GENERIC_FALLBACK_AVATAR = '/uploads/file-1792077381663-439615846.png';

const inFlightRenders = new Map<string, Promise<Monster>>();
const renderedAvatarCache = new Map<string, string>();

function isTrulyGuardName(name?: string): boolean {
  const n = (name || '').toLowerCase().trim();
  return n === 'guard' || n === 'guards' || n === 'town guard' || n === 'city guard';
}

/**
 * Extracts the canonical creature name from a room monster string or display name
 * e.g. "1x Okuzor (Canopic Golem)" -> "Canopic Golem" (if Canopic Golem is the creature type)
 * or "1x Bandit Captain (Elix the Saint, during day)" -> "Bandit Captain"
 */
export function extractCanonicalCreatureCandidates(rawName: string): string[] {
  const cleaned = (rawName || '')
    .replace(/^\d+\s*x?\s+/i, '')
    .replace(/^(?:one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s+(?:x\s*)?/i, '')
    .trim();
  if (!cleaned) return [];

  const parenMatch = cleaned.match(/\((.*?)\)/);
  const parenContent = parenMatch ? parenMatch[1].split(',')[0].trim() : '';
  const outsideParen = cleaned.replace(/\(.*?\)/g, '').trim();

  const candidates: string[] = [];
  if (outsideParen) candidates.push(outsideParen);
  if (parenContent) candidates.push(parenContent);
  if (cleaned && !candidates.includes(cleaned)) candidates.push(cleaned);
  return candidates;
}

/**
 * Checks whether a monster's current avatarUrl is missing, a generic fallback,
 * a paywalled 403 URL, or an orphaned ephemeral /uploads/token_ path.
 */
export function needsMonsterTokenRender(monster: Partial<Monster> | null | undefined): boolean {
  if (!monster) return true;
  const url = String(monster.avatarUrl || (monster as any).url || '').trim();
  if (!url) return true;
  if (url === GENERIC_FALLBACK_AVATAR && !isTrulyGuardName(monster.name)) return true;
  if (url.startsWith('/uploads/token_') || url.startsWith('/uploads/avatar_')) return true;
  if (url.includes('media.dndbeyond.com/compendium-images/veor/')) return true;
  if (url.includes('images.unsplash.com/photo-1509198397868')) return true;
  if (url.startsWith('local:')) return true;
  return false;
}

/**
 * Looks up whether an authoritative default token exists in DEFAULT_MONSTERS
 */
export function findDefaultCompendiumMonster(monsterName: string): Monster | undefined {
  const candidates = extractCanonicalCreatureCandidates(monsterName);
  for (const candidate of candidates) {
    const found = DEFAULT_MONSTERS.find(
      d => isExactMonsterMatch(candidate, d.name) && !needsMonsterTokenRender(d)
    );
    if (found) return found;
  }
  return undefined;
}

/**
 * Client-side procedural circular RPG battle token SVG fallback
 */
export function generateClientProceduralTokenDataUrl(monsterName: string, creatureType?: string): string {
  const cleanName = (monsterName || 'Monster').replace(/[<>&"']/g, '').trim();
  const lowerName = cleanName.toLowerCase();
  const lowerType = (creatureType || 'creature').toLowerCase();

  let primary = '#d97706';
  let secondary = '#78350f';
  let glow = '#fbbf24';
  let bgDark = '#1c1208';
  let crestPaths = '';

  if (lowerName.includes('canopic') || lowerName.includes('golem') || lowerType.includes('construct')) {
    primary = '#eab308';
    secondary = '#0284c7';
    glow = '#38bdf8';
    bgDark = '#0c1926';
    crestPaths = `
      <polygon points="128,44 176,86 164,168 92,168 80,86" fill="#1e293b" stroke="${primary}" stroke-width="3.5"/>
      <polygon points="104,48 92,86 114,76" fill="${primary}" opacity="0.85"/>
      <polygon points="152,48 164,86 142,76" fill="${primary}" opacity="0.85"/>
      <circle cx="110" cy="104" r="8" fill="${glow}"/>
      <circle cx="146" cy="104" r="8" fill="${glow}"/>
      <path d="M112,134 L144,134 M104,148 L152,148 M128,74 L128,156" stroke="${primary}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="128" cy="68" r="6" fill="${glow}"/>
    `;
  } else if (lowerName.includes('mummy') || lowerName.includes('skeleton') || lowerName.includes('zombie') || lowerName.includes('wraith') || lowerType.includes('undead')) {
    primary = '#a855f7';
    secondary = '#3b0764';
    glow = '#4ade80';
    bgDark = '#0f0718';
    crestPaths = `
      <path d="M88,104 C88,68 168,68 168,104 C168,128 152,140 148,162 L108,162 C104,140 88,128 88,104 Z" fill="#1f1629" stroke="${primary}" stroke-width="3.5"/>
      <circle cx="112" cy="108" r="9" fill="${glow}"/>
      <circle cx="144" cy="108" r="9" fill="${glow}"/>
      <polygon points="128,120 121,134 135,134" fill="${glow}" opacity="0.8"/>
      <path d="M114,148 L142,148 M120,142 L120,156 M128,142 L128,156 M136,142 L136,156" stroke="${primary}" stroke-width="2.5"/>
    `;
  } else {
    crestPaths = `
      <path d="M128,48 L172,82 L158,154 L98,154 L84,82 Z" fill="#1f1916" stroke="${primary}" stroke-width="3.5"/>
      <circle cx="112" cy="102" r="7" fill="${glow}"/>
      <circle cx="144" cy="102" r="7" fill="${glow}"/>
      <path d="M108,132 Q128,118 148,132" fill="none" stroke="${glow}" stroke-width="3"/>
    `;
  }

  const label = cleanName.length > 18 ? cleanName.slice(0, 16) + '..' : cleanName;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
    <defs>
      <radialGradient id="tokBg" cx="50%" cy="45%" r="55%">
        <stop offset="0%" stop-color="${secondary}" stop-opacity="0.9"/>
        <stop offset="70%" stop-color="${bgDark}" stop-opacity="1"/>
        <stop offset="100%" stop-color="#050507" stop-opacity="1"/>
      </radialGradient>
      <linearGradient id="tokRim" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${glow}"/>
        <stop offset="50%" stop-color="${primary}"/>
        <stop offset="100%" stop-color="${secondary}"/>
      </linearGradient>
    </defs>
    <circle cx="128" cy="128" r="122" fill="url(#tokBg)" stroke="url(#tokRim)" stroke-width="8"/>
    <circle cx="128" cy="128" r="110" fill="none" stroke="${glow}" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.5"/>
    ${crestPaths}
    <rect x="28" y="182" width="200" height="32" rx="16" fill="#09090b" fill-opacity="0.92" stroke="url(#tokRim)" stroke-width="2.5"/>
    <text x="128" y="203" text-anchor="middle" fill="#f8fafc" font-family="Cinzel, Georgia, serif" font-weight="bold" font-size="14" letter-spacing="0.5">${label}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

/**
 * Ensures a monster has a valid token image.
 * - If a default token exists in DEFAULT_MONSTERS, repairs and saves it to Firestore.
 * - If NO default token exists for the monster, renders a bespoke token via /api/ai/render-monster-token
 *   and saves the monster with its rendered token permanently to the Firestore `monsters` collection.
 */
export async function ensureMonsterTokenRenderedAndSaved(
  monster: Monster,
  onUpdated?: (savedMonster: Monster) => void
): Promise<Monster> {
  if (!monster || !monster.name) return monster;

  const key = monster.name.trim().toLowerCase();

  // Check if already rendered in this session
  const cachedUrl = renderedAvatarCache.get(key);
  if (cachedUrl && !needsMonsterTokenRender({ ...monster, avatarUrl: cachedUrl })) {
    const updated = { ...monster, avatarUrl: cachedUrl };
    onUpdated?.(updated);
    return updated;
  }

  // Deduplicate concurrent renders for the same monster
  const existingPromise = inFlightRenders.get(key);
  if (existingPromise) {
    const res = await existingPromise;
    onUpdated?.(res);
    return res;
  }

  const work = (async (): Promise<Monster> => {
    try {
      // 1. Check if an official default token exists in DEFAULT_MONSTERS
      const defMatch = findDefaultCompendiumMonster(monster.name);
      if (defMatch?.avatarUrl && !needsMonsterTokenRender(defMatch)) {
        renderedAvatarCache.set(key, defMatch.avatarUrl);
        const healed: Monster = {
          ...defMatch,
          ...monster,
          avatarUrl: defMatch.avatarUrl,
          size: monster.size || defMatch.size
        };
        try {
          if (monster.monsterId && !monster.monsterId.startsWith('srd_') && !monster.monsterId.startsWith('ddb_')) {
            await saveMonster(healed);
          }
        } catch (e) {
          console.warn('[MonsterTokenRenderer] Notice saving healed default monster:', e);
        }
        onUpdated?.(healed);
        return healed;
      }

      // 2. No default token exists -> Render a bespoke token for this monster on the server
      const candidates = extractCanonicalCreatureCandidates(monster.name);
      const targetRenderName = candidates[candidates.length - 1] || monster.name;
      const traitDesc = Array.isArray(monster.traits) && monster.traits.length > 0
        ? monster.traits.map(t => `${t.name}: ${t.description}`).join('; ').slice(0, 160)
        : '';

      let renderedUrl = '';

      // If the monster is a placeholder from 'Encounter Notes' with generic stats, try full search-and-ingest first
      // so we get both its official 5e statblock AND its rendered token!
      if (monster.source === 'Encounter Notes') {
        try {
          const ingestRes = await fetch('/api/ai/search-and-ingest-monster', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ monsterName: targetRenderName })
          });
          if (ingestRes.ok) {
            const ingestData = await ingestRes.json();
            if (ingestData?.monster && ingestData.monster.avatarUrl && !needsMonsterTokenRender(ingestData.monster)) {
              let finalAvatar = ingestData.monster.avatarUrl;
              if (finalAvatar.startsWith('data:') && !finalAvatar.startsWith('data:image/svg+xml') && finalAvatar.length > 45000) {
                const compressed = await createThumbnailDataUrl(finalAvatar, 256, 0.85);
                if (compressed) finalAvatar = compressed;
              }
              const fullRenderedMonster: Monster = {
                ...ingestData.monster,
                name: monster.name,
                avatarUrl: finalAvatar
              };
              renderedAvatarCache.set(key, finalAvatar);
              const saved = await saveMonster(fullRenderedMonster);
              onUpdated?.(saved);
              return saved;
            }
          }
        } catch (ingestErr) {
          console.warn(`[MonsterTokenRenderer] Full ingest fallback notice for ${targetRenderName}:`, ingestErr);
        }
      }

      // Otherwise call dedicated /api/ai/render-monster-token endpoint
      try {
        const res = await fetch('/api/ai/render-monster-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            monsterName: targetRenderName,
            creatureType: monster.type,
            description: traitDesc
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.avatarUrl) {
            renderedUrl = data.avatarUrl;
          }
        }
      } catch (renderErr) {
        console.warn(`[MonsterTokenRenderer] Server render-monster-token notice for ${targetRenderName}:`, renderErr);
      }

      if (!renderedUrl) {
        renderedUrl = generateClientProceduralTokenDataUrl(targetRenderName, monster.type);
      }

      // Compress raster data URLs so they fit cleanly inside the Firestore monsters document
      if (renderedUrl.startsWith('data:') && !renderedUrl.startsWith('data:image/svg+xml') && renderedUrl.length > 45000) {
        try {
          const compressed = await createThumbnailDataUrl(renderedUrl, 256, 0.85);
          if (compressed && compressed.length > 100) {
            renderedUrl = compressed;
          }
        } catch {
          // keep renderedUrl
        }
      }

      renderedAvatarCache.set(key, renderedUrl);

      const cleanSlug = targetRenderName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const stableMonsterId =
        monster.monsterId && !monster.monsterId.startsWith('gen_') && !monster.monsterId.startsWith('semantic_')
          ? monster.monsterId
          : `monster_${cleanSlug}`;

      const updatedMonster: Monster = {
        ...monster,
        monsterId: stableMonsterId,
        avatarUrl: renderedUrl,
        source: monster.source === 'Encounter Notes' ? 'AI Rendered Compendium' : (monster.source || 'AI Rendered Compendium')
      };

      try {
        const saved = await saveMonster(updatedMonster);
        onUpdated?.(saved);
        return saved;
      } catch (saveErr) {
        console.warn(`[MonsterTokenRenderer] Could not persist rendered monster ${monster.name} to Firestore:`, saveErr);
        onUpdated?.(updatedMonster);
        return updatedMonster;
      }
    } finally {
      inFlightRenders.delete(key);
    }
  })();

  inFlightRenders.set(key, work);
  return work;
}
