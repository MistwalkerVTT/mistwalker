/**
 * Utility helper to extract D&D Beyond Character IDs and Campaign IDs
 * from raw user input, supporting direct numbers, full URLs, and shortlinks.
 */

export function extractDdbCharacterId(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') return null;
  const clean = input.trim();

  // 1. Direct digits (e.g. "146614740" or "char_ddb_146614740")
  const directMatch = clean.match(/^(?:char_ddb_)?([0-9]{4,12})$/i);
  if (directMatch) return directMatch[1];

  // 2. Full URL (e.g. "https://www.dndbeyond.com/characters/146614740" or with sub-paths like /builder)
  const urlMatch = clean.match(/dndbeyond\.com\/characters\/([0-9]+)/i);
  if (urlMatch) return urlMatch[1];

  // 3. Shortlink format (e.g. "ddb.ac/characters/146614740")
  const shortMatch = clean.match(/ddb\.ac\/characters\/([0-9]+)/i);
  if (shortMatch) return shortMatch[1];

  return null;
}

export function extractDdbCampaignId(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') return null;
  const clean = input.trim();

  // 1. Direct digits (e.g. "6738033")
  const directMatch = clean.match(/^([0-9]{4,10})$/);
  if (directMatch) return directMatch[1];

  // 2. Full Campaign URL (e.g. "https://www.dndbeyond.com/campaigns/6738033")
  const urlMatch = clean.match(/dndbeyond\.com\/campaigns\/([0-9]+)/i);
  if (urlMatch) return urlMatch[1];

  // 3. Join link format (e.g. "https://ddb.ac/campaigns/join/...")
  const joinMatch = clean.match(/campaigns\/join\/([A-Za-z0-9_-]+)/i);
  if (joinMatch) return joinMatch[1];

  return null;
}
