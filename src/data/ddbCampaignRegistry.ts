import { Character } from '../types/character';

export interface CharacterCampaignInfo {
  campaignId: string;
  campaignTitle: string;
  isPrimaryCampaign?: boolean;
  playerName?: string;
}

export const KNOWN_DDB_CAMPAIGNS: Record<string, string> = {
  custom: 'Custom & Pre-Gen Heroes'
};

export const KNOWN_DDB_CHARACTER_TO_CAMPAIGN: Record<
  string,
  { campaignId: string; campaignTitle: string; playerName?: string }
> = {};

export function registerKnownCampaign(campaignId: string, campaignTitle: string) {
  if (campaignId && campaignTitle) {
    KNOWN_DDB_CAMPAIGNS[campaignId] = campaignTitle;
  }
}

export function registerKnownCharacter(
  characterId: string,
  info: { campaignId: string; campaignTitle: string; playerName?: string }
) {
  if (characterId && info) {
    KNOWN_DDB_CHARACTER_TO_CAMPAIGN[characterId] = info;
  }
}

/**
 * Resolves a character's D&D Beyond Campaign ID and Campaign Title dynamically from:
 * 1. Explicit ddbCampaignId / ddbCampaignTitle fields
 * 2. Active campaign registration in KNOWN_DDB_CHARACTER_TO_CAMPAIGN
 * 3. Notes string (e.g. `Campaign: "My Campaign"` or `Imported from D&D Beyond`)
 * 4. Fallback to "Custom & Pre-Gen Heroes"
 */
export function resolveCharacterCampaign(
  char: Partial<Character> | {
    id?: string | number;
    ddbCharacterId?: string | number;
    ddbCampaignId?: string;
    ddbCampaignTitle?: string;
    name?: string;
    notes?: string;
    ddbUrl?: string;
    playerName?: string;
  }
): CharacterCampaignInfo {
  if (!char) {
    return { campaignId: 'custom', campaignTitle: 'Custom & Pre-Gen Heroes' };
  }

  // 1. Direct campaign fields
  if (char.ddbCampaignId && char.ddbCampaignTitle && char.ddbCampaignTitle !== 'My Campaigns') {
    const cleanTitle = char.ddbCampaignTitle
      .replace(/\s*-\s*Campaigns\s*-\s*D&D Beyond.*$/i, '')
      .replace(/&#x27;/g, "'")
      .trim();
    return {
      campaignId: String(char.ddbCampaignId),
      campaignTitle: cleanTitle,
      playerName: char.playerName,
      isPrimaryCampaign: true
    };
  }

  // 2. Lookup by DDB Character ID
  const rawDdbId = char.ddbCharacterId
    ? String(char.ddbCharacterId).replace(/^char_ddb_/, '').trim()
    : (String(char.id || '').startsWith('char_ddb_') ? String(char.id).replace(/^char_ddb_/, '').trim() : '');

  if (rawDdbId && KNOWN_DDB_CHARACTER_TO_CAMPAIGN[rawDdbId]) {
    const entry = KNOWN_DDB_CHARACTER_TO_CAMPAIGN[rawDdbId];
    return {
      campaignId: entry.campaignId,
      campaignTitle: entry.campaignTitle,
      playerName: entry.playerName || char.playerName,
      isPrimaryCampaign: true
    };
  }

  // 3. Parse from notes if present
  const notes = (char as any).notes || '';
  if (typeof notes === 'string' && notes.trim()) {
    const quotedMatch = notes.match(/Campaign\s+"([^"]+)"/i);
    const colonMatch = notes.match(/Campaign:\s*([^.\n]+)/i);
    const extractedTitle = (quotedMatch?.[1] || colonMatch?.[1] || '')
      .replace(/\s*-\s*Campaigns\s*-\s*D&D Beyond.*$/i, '')
      .replace(/&#x27;/g, "'")
      .trim();

    if (extractedTitle && extractedTitle !== 'My Campaigns') {
      const matchedEntry = Object.entries(KNOWN_DDB_CAMPAIGNS).find(
        ([, title]) => title.toLowerCase() === extractedTitle.toLowerCase() || extractedTitle.toLowerCase().includes(title.toLowerCase())
      );
      if (matchedEntry) {
        return {
          campaignId: matchedEntry[0],
          campaignTitle: matchedEntry[1],
          playerName: char.playerName,
          isPrimaryCampaign: true
        };
      }
      return {
        campaignId: 'custom',
        campaignTitle: extractedTitle,
        playerName: char.playerName,
        isPrimaryCampaign: false
      };
    }
  }

  return {
    campaignId: 'custom',
    campaignTitle: 'Custom & Pre-Gen Heroes',
    playerName: char.playerName,
    isPrimaryCampaign: false
  };
}

export interface CampaignGroup<T> {
  campaignId: string;
  campaignTitle: string;
  isPrimaryCampaign: boolean;
  items: T[];
  characters: T[];
}

/**
 * Groups an array of characters or character choices by their D&D Beyond Campaign.
 */
export function groupCharactersByCampaign<T extends {
  id?: string | number;
  ddbCharacterId?: string | number;
  ddbCampaignId?: string;
  ddbCampaignTitle?: string;
  name?: string;
  notes?: string;
}>(
  items: T[]
): CampaignGroup<T>[] {
  const groupsMap = new Map<string, CampaignGroup<T>>();

  for (const item of items) {
    const info = resolveCharacterCampaign(item);
    const existing = groupsMap.get(info.campaignId);
    if (existing) {
      existing.items.push(item);
      existing.characters.push(item);
    } else {
      groupsMap.set(info.campaignId, {
        campaignId: info.campaignId,
        campaignTitle: info.campaignTitle,
        isPrimaryCampaign: Boolean(info.isPrimaryCampaign),
        items: [item],
        characters: [item]
      });
    }
  }

  const groups = Array.from(groupsMap.values());
  groups.sort((a, b) => {
    if (a.campaignId === 'custom') return 1;
    if (b.campaignId === 'custom') return -1;
    return a.campaignTitle.localeCompare(b.campaignTitle);
  });

  return groups;
}
