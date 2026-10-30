import { Character } from '../types/character';

export interface CharacterCampaignInfo {
  campaignId: string;
  campaignTitle: string;
  isPrimaryCampaign?: boolean;
  playerName?: string;
}

export const KNOWN_DDB_CAMPAIGNS: Record<string, string> = {
  '6738033': 'Keys from the Golden Vault',
  '3290944': 'An Unspeakable Power (but this time with a vengeance)',
  '1773471': 'One Shots with the TapeS Clan',
  '1882472': 'Nocturne',
  '2227357': 'Waterdeep: Dragon Heist',
  '2563977': 'Aboard the Osmorton',
  '3926123': 'Strixhaven',
  '4820027': 'Acquisitions Incorporated',
  '7047029': 'The Black Soil',
  '7952458': 'Cabin 15',
  '463754': 'Tomb of Annihilation',
  '680213': 'Descent into Avernus Group 1',
  '1587424': 'Descent Into Avernus',
  '2737318': 'Wild Beyond the Witchlight',
  '3594196': "We Be Jammin'",
  '618958': 'Repentance',
  'custom': 'Custom & Pre-Gen Heroes'
};

export const KNOWN_DDB_CHARACTER_TO_CAMPAIGN: Record<string, { campaignId: string; campaignTitle: string; playerName?: string }> = {
  // Keys from the Golden Vault (6738033)
  '146614740': { campaignId: '6738033', campaignTitle: 'Keys from the Golden Vault', playerName: 'Scott' },
  '147334187': { campaignId: '6738033', campaignTitle: 'Keys from the Golden Vault', playerName: 'Player' },
  '158502126': { campaignId: '6738033', campaignTitle: 'Keys from the Golden Vault', playerName: 'TotoMojo' },
  '146533824': { campaignId: '6738033', campaignTitle: 'Keys from the Golden Vault', playerName: 'Perethorn' },
  '158983142': { campaignId: '6738033', campaignTitle: 'Keys from the Golden Vault', playerName: 'Arameng' },
  '152250633': { campaignId: '6738033', campaignTitle: 'Keys from the Golden Vault', playerName: 'NorahTheExplorah' },

  // An Unspeakable Power (but this time with a vengeance) (3290944)
  '27455124': { campaignId: '3290944', campaignTitle: 'An Unspeakable Power (but this time with a vengeance)', playerName: 'TotoMojo' },
  '27456605': { campaignId: '3290944', campaignTitle: 'An Unspeakable Power (but this time with a vengeance)', playerName: 'Arameng' },
  '27463658': { campaignId: '3290944', campaignTitle: 'An Unspeakable Power (but this time with a vengeance)', playerName: 'SWITCH540' },
  '27571081': { campaignId: '3290944', campaignTitle: 'An Unspeakable Power (but this time with a vengeance)', playerName: 'NorahTheExplorah' },
  '57022089': { campaignId: '3290944', campaignTitle: 'An Unspeakable Power (but this time with a vengeance)', playerName: 'Perethorn' },
  '80588084': { campaignId: '3290944', campaignTitle: 'An Unspeakable Power (but this time with a vengeance)', playerName: 'Cudder1' },

  // Repentance (618958)
  '11688233': { campaignId: '618958', campaignTitle: 'Repentance', playerName: 'Rasp' },
  '16228624': { campaignId: '618958', campaignTitle: 'Repentance', playerName: 'nazneenadrienne' },

  // Tomb of Annihilation (463754)
  '13220094': { campaignId: '463754', campaignTitle: 'Tomb of Annihilation', playerName: 'LostLemuria' },
  '15944420': { campaignId: '463754', campaignTitle: 'Tomb of Annihilation', playerName: 'YesterdaysPants' },
  '17960800': { campaignId: '463754', campaignTitle: 'Tomb of Annihilation', playerName: 'Cotillion37' },
  '25708557': { campaignId: '463754', campaignTitle: 'Tomb of Annihilation', playerName: 'LeafsNL' },

  // Descent into Avernus Group 1 (680213)
  '17388457': { campaignId: '680213', campaignTitle: 'Descent into Avernus Group 1', playerName: 'JrSponge' },
  '17629980': { campaignId: '680213', campaignTitle: 'Descent into Avernus Group 1', playerName: 'Fimbulveter' },
  '17630937': { campaignId: '680213', campaignTitle: 'Descent into Avernus Group 1', playerName: 'xxderpzxx' },
  '17650907': { campaignId: '680213', campaignTitle: 'Descent into Avernus Group 1', playerName: 'RiotPilot' },
  '17654052': { campaignId: '680213', campaignTitle: 'Descent into Avernus Group 1', playerName: 'Cariboux' },
  '17870450': { campaignId: '680213', campaignTitle: 'Descent into Avernus Group 1', playerName: 'TheCurryLord' },
  '18031598': { campaignId: '680213', campaignTitle: 'Descent into Avernus Group 1', playerName: 'Skyp' },
  '23878519': { campaignId: '680213', campaignTitle: 'Descent into Avernus Group 1', playerName: 'Player' },

  // Nocturne (1882472)
  '23986588': { campaignId: '1882472', campaignTitle: 'Nocturne', playerName: 'nazneenadrienne' },
  '49041027': { campaignId: '1882472', campaignTitle: 'Nocturne', playerName: 'Cotillion37' },
  '49105653': { campaignId: '1882472', campaignTitle: 'Nocturne', playerName: 'LostLemuria' },
  '49314669': { campaignId: '1882472', campaignTitle: 'Nocturne', playerName: 'RaLoggins' },
  '54764092': { campaignId: '1882472', campaignTitle: 'Nocturne', playerName: 'LeafsNL' },

  // Waterdeep: Dragon Heist (2227357)
  '36460526': { campaignId: '2227357', campaignTitle: 'Waterdeep: Dragon Heist', playerName: 'Rasp' },
  '56422605': { campaignId: '2227357', campaignTitle: 'Waterdeep: Dragon Heist', playerName: 'Ryo16052' },
  '56471065': { campaignId: '2227357', campaignTitle: 'Waterdeep: Dragon Heist', playerName: 'L_rae' },

  // One Shots with the TapeS Clan (1773471)
  '36705985': { campaignId: '1773471', campaignTitle: 'One Shots with the TapeS Clan', playerName: 'Player' },
  '44793221': { campaignId: '1773471', campaignTitle: 'One Shots with the TapeS Clan', playerName: 'LostLemuria' },
  '44852600': { campaignId: '1773471', campaignTitle: 'One Shots with the TapeS Clan', playerName: 'Cotillion37' },
  '45159586': { campaignId: '1773471', campaignTitle: 'One Shots with the TapeS Clan', playerName: 'McDooba' },
  '45347052': { campaignId: '1773471', campaignTitle: 'One Shots with the TapeS Clan', playerName: 'LeafsNL' },
  '46101468': { campaignId: '1773471', campaignTitle: 'One Shots with the TapeS Clan', playerName: 'Rasp' },
  '61909027': { campaignId: '1773471', campaignTitle: 'One Shots with the TapeS Clan', playerName: 'VanCut' },
  '61909204': { campaignId: '1773471', campaignTitle: 'One Shots with the TapeS Clan', playerName: 'NapalmCleric' },
  '78909374': { campaignId: '1773471', campaignTitle: 'One Shots with the TapeS Clan', playerName: 'JamborTheAmphibious' },

  // Wild Beyond the Witchlight (2737318)
  '56636188': { campaignId: '2737318', campaignTitle: 'Wild Beyond the Witchlight', playerName: 'LostLemuria' },
  '64330030': { campaignId: '2737318', campaignTitle: 'Wild Beyond the Witchlight', playerName: 'YesterdaysPants' },
  '68822848': { campaignId: '2737318', campaignTitle: 'Wild Beyond the Witchlight', playerName: 'Cotillion37' },
  '68862919': { campaignId: '2737318', campaignTitle: 'Wild Beyond the Witchlight', playerName: 'L_rae' },
  '68940407': { campaignId: '2737318', campaignTitle: 'Wild Beyond the Witchlight', playerName: 'NapalmCleric' },
  '71083629': { campaignId: '2737318', campaignTitle: 'Wild Beyond the Witchlight', playerName: 'Ryo16052' },

  // Acquisitions Incorporated (4820027)
  '64082024': { campaignId: '4820027', campaignTitle: 'Acquisitions Incorporated', playerName: 'Arameng' },
  '91780759': { campaignId: '4820027', campaignTitle: 'Acquisitions Incorporated', playerName: 'FrankWise' },
  '96875090': { campaignId: '4820027', campaignTitle: 'Acquisitions Incorporated', playerName: 'samgrincon' },
  '113111747': { campaignId: '4820027', campaignTitle: 'Acquisitions Incorporated', playerName: 'FrankWise' },
  '120788584': { campaignId: '4820027', campaignTitle: 'Acquisitions Incorporated', playerName: 'FrankWise' },
  '160760082': { campaignId: '4820027', campaignTitle: 'Acquisitions Incorporated', playerName: 'erinshreds' },
  '165251359': { campaignId: '4820027', campaignTitle: 'Acquisitions Incorporated', playerName: 'Player' },
  '169914414': { campaignId: '4820027', campaignTitle: 'Acquisitions Incorporated', playerName: 'FrankWise' },

  // Aboard the Osmorton (2563977)
  '64700252': { campaignId: '2563977', campaignTitle: 'Aboard the Osmorton', playerName: 'Rasp' },
  '64705483': { campaignId: '2563977', campaignTitle: 'Aboard the Osmorton', playerName: 'Cotillion37' },
  '64771104': { campaignId: '2563977', campaignTitle: 'Aboard the Osmorton', playerName: 'Ryo16052' },

  // Strixhaven (3926123)
  '92172901': { campaignId: '3926123', campaignTitle: 'Strixhaven', playerName: 'Rasp' },
  '95757190': { campaignId: '3926123', campaignTitle: 'Strixhaven', playerName: 'madsdemers' },
  '96740244': { campaignId: '3926123', campaignTitle: 'Strixhaven', playerName: 'GiddyMcQueen' },
  '97424409': { campaignId: '3926123', campaignTitle: 'Strixhaven', playerName: 'TheLost20' },
  '97426989': { campaignId: '3926123', campaignTitle: 'Strixhaven', playerName: 'Brrarr' },

  // We Be Jammin' (3594196)
  '103089141': { campaignId: '3594196', campaignTitle: "We Be Jammin'", playerName: 'GiddyMcQueen' },
  '112167583': { campaignId: '3594196', campaignTitle: "We Be Jammin'", playerName: 'TheLost20' },

  // The Black Soil (7047029)
  '153121111': { campaignId: '7047029', campaignTitle: 'The Black Soil', playerName: 'L_rae' },
  '153583626': { campaignId: '7047029', campaignTitle: 'The Black Soil', playerName: 'LostLemuria' },

  // Cabin 15 (7952458)
  '167788527': { campaignId: '7952458', campaignTitle: 'Cabin 15', playerName: 'LeafsNL' },
  '168493319': { campaignId: '7952458', campaignTitle: 'Cabin 15', playerName: 'Ryo16052' },
  '168509616': { campaignId: '7952458', campaignTitle: 'Cabin 15', playerName: 'Cotillion37' }
};

const GOLDEN_VAULT_NAMES = ['varrak', 'noctua', 'aggie', 'aggapanthus', 'rowan', 'sylas', "g'aiah", 'gaiah', 'brannoc', 'mayo'];
const UNSPEAKABLE_POWER_NAMES = ['aziza', 'burmi', 'stavros', 'etho', 'arameng', 'zal-tan', 'zaltan'];

/**
 * Resolves a character's D&D Beyond Campaign ID and Campaign Title from:
 * 1. Explicit ddbCampaignId / ddbCampaignTitle fields
 * 2. Known D&D Beyond character ID lookup table
 * 3. Notes string (e.g., `Campaign: Keys from the Golden Vault` or `Imported from D&D Beyond Campaign "..."`)
 * 4. Known party member names
 * 5. Fallback to "Custom & Pre-Gen Heroes"
 */
export function resolveCharacterCampaign(
  char: Partial<Character> | { id?: string | number; ddbCharacterId?: string | number; ddbCampaignId?: string; ddbCampaignTitle?: string; name?: string; notes?: string }
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
      isPrimaryCampaign: char.ddbCampaignId === '6738033' || char.ddbCampaignId === '3290944'
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
      isPrimaryCampaign: entry.campaignId === '6738033' || entry.campaignId === '3290944'
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
          isPrimaryCampaign: matchedEntry[0] === '6738033' || matchedEntry[0] === '3290944'
        };
      }
      return {
        campaignId: `camp_${extractedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
        campaignTitle: extractedTitle
      };
    }
  }

  // 4. Match by known hero name
  const lowerName = (char.name || '').toLowerCase().trim();
  if (GOLDEN_VAULT_NAMES.some(n => lowerName.includes(n))) {
    return {
      campaignId: '6738033',
      campaignTitle: 'Keys from the Golden Vault',
      isPrimaryCampaign: true
    };
  }
  if (UNSPEAKABLE_POWER_NAMES.some(n => lowerName.includes(n))) {
    return {
      campaignId: '3290944',
      campaignTitle: 'An Unspeakable Power (but this time with a vengeance)',
      isPrimaryCampaign: true
    };
  }

  return {
    campaignId: 'custom',
    campaignTitle: 'Custom & Pre-Gen Heroes',
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
 * Groups an array of characters or character choices by their D&D Beyond Campaign,
 * pinning primary campaigns ("Keys from the Golden Vault" & "An Unspeakable Power") at the top.
 */
export function groupCharactersByCampaign<T extends { id?: string | number; ddbCharacterId?: string | number; ddbCampaignId?: string; ddbCampaignTitle?: string; name?: string; notes?: string }>(
  items: T[]
): CampaignGroup<T>[] {
  const groupsMap = new Map<string, CampaignGroup<T>>();

  for (const item of items) {
    const info = resolveCharacterCampaign(item);
    const existing = groupsMap.get(info.campaignId);
    if (existing) {
      existing.items.push(item);
    } else {
      const list = [item];
      groupsMap.set(info.campaignId, {
        campaignId: info.campaignId,
        campaignTitle: info.campaignTitle,
        isPrimaryCampaign: Boolean(info.isPrimaryCampaign),
        items: list,
        characters: list
      });
    }
  }

  const priorityOrder: Record<string, number> = {
    '6738033': 1, // Keys from the Golden Vault
    '3290944': 2, // An Unspeakable Power (but this time with a vengeance)
    'custom': 99
  };

  return Array.from(groupsMap.values()).sort((a, b) => {
    const pA = priorityOrder[a.campaignId] ?? 10;
    const pB = priorityOrder[b.campaignId] ?? 10;
    if (pA !== pB) return pA - pB;
    return a.campaignTitle.localeCompare(b.campaignTitle);
  });
}
