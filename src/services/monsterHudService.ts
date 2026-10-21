// src/services/monsterHudService.ts
// Monster Action Parsing, Spellcasting Decomposition, and Tactical Normalization Engine

import { Monster, MonsterAction, MonsterTrait } from '../types/monster';
import {
  DmMonsterHudData,
  MonsterActionItem,
  DmMonsterActionCategory,
  TokenMonsterState,
  MonsterSpellSlotInfo
} from '../types/monsterHud';
import { SRD_MONSTERS, resolveMonster } from '../data/srdMonstersCatalog';
import { JB2A_REGISTRY, findJb2aAsset } from '../effects/db/jb2aRegistry';

// Standard 5e monster spell definitions database for instant damage/save/range/JB2A resolution
interface SpellProfile {
  level: number;
  school: string;
  rangeFt: number;
  castingTime: string;
  damageFormula?: string;
  damageType?: string;
  saveAbility?: string;
  isSelfAction?: boolean;
  isHeal?: boolean;
}

const COMMON_SPELLS_CATALOG: Record<string, SpellProfile> = {
  // Cantrips
  'fire bolt': { level: 0, school: 'evocation', rangeFt: 120, castingTime: '1 Action', damageFormula: '1d10', damageType: 'fire' },
  'eldritch blast': { level: 0, school: 'evocation', rangeFt: 120, castingTime: '1 Action', damageFormula: '1d10', damageType: 'force' },
  'ray of frost': { level: 0, school: 'evocation', rangeFt: 60, castingTime: '1 Action', damageFormula: '1d8', damageType: 'cold' },
  'shocking grasp': { level: 0, school: 'evocation', rangeFt: 5, castingTime: '1 Action', damageFormula: '1d8', damageType: 'lightning' },
  'sacred flame': { level: 0, school: 'evocation', rangeFt: 60, castingTime: '1 Action', damageFormula: '1d8', damageType: 'radiant', saveAbility: 'DEX' },
  'poison spray': { level: 0, school: 'conjuration', rangeFt: 10, castingTime: '1 Action', damageFormula: '1d12', damageType: 'poison', saveAbility: 'CON' },
  'toll the dead': { level: 0, school: 'necromancy', rangeFt: 60, castingTime: '1 Action', damageFormula: '1d12', damageType: 'necrotic', saveAbility: 'WIS' },
  'chill touch': { level: 0, school: 'necromancy', rangeFt: 120, castingTime: '1 Action', damageFormula: '1d8', damageType: 'necrotic' },
  'acid splash': { level: 0, school: 'conjuration', rangeFt: 60, castingTime: '1 Action', damageFormula: '1d6', damageType: 'acid', saveAbility: 'DEX' },
  'vicious mockery': { level: 0, school: 'enchantment', rangeFt: 60, castingTime: '1 Action', damageFormula: '1d4', damageType: 'psychic', saveAbility: 'WIS' },
  'mage hand': { level: 0, school: 'conjuration', rangeFt: 30, castingTime: '1 Action' },
  'minor illusion': { level: 0, school: 'illusion', rangeFt: 30, castingTime: '1 Action' },
  'prestidigitation': { level: 0, school: 'transmutation', rangeFt: 10, castingTime: '1 Action' },
  'thaumaturgy': { level: 0, school: 'transmutation', rangeFt: 30, castingTime: '1 Action' },
  'light': { level: 0, school: 'evocation', rangeFt: 5, castingTime: '1 Action' },
  'dancing lights': { level: 0, school: 'evocation', rangeFt: 120, castingTime: '1 Action' },
  'guidance': { level: 0, school: 'divination', rangeFt: 5, castingTime: '1 Action' },
  'resistance': { level: 0, school: 'abjuration', rangeFt: 5, castingTime: '1 Action' },

  // 1st Level
  'magic missile': { level: 1, school: 'evocation', rangeFt: 120, castingTime: '1 Action', damageFormula: '3d4 + 3', damageType: 'force' },
  'burning hands': { level: 1, school: 'evocation', rangeFt: 15, castingTime: '1 Action', damageFormula: '3d6', damageType: 'fire', saveAbility: 'DEX' },
  'cure wounds': { level: 1, school: 'evocation', rangeFt: 5, castingTime: '1 Action', damageFormula: '1d8 + 3', damageType: 'radiant', isHeal: true },
  'healing word': { level: 1, school: 'evocation', rangeFt: 60, castingTime: '1 Bonus Action', damageFormula: '1d4 + 3', damageType: 'radiant', isHeal: true },
  'shield': { level: 1, school: 'abjuration', rangeFt: 0, castingTime: '1 Reaction', isSelfAction: true },
  'mage armor': { level: 1, school: 'abjuration', rangeFt: 5, castingTime: '1 Action', isSelfAction: true },
  'thunderwave': { level: 1, school: 'evocation', rangeFt: 15, castingTime: '1 Action', damageFormula: '2d8', damageType: 'thunder', saveAbility: 'CON' },
  'guiding bolt': { level: 1, school: 'evocation', rangeFt: 120, castingTime: '1 Action', damageFormula: '4d6', damageType: 'radiant' },
  'inflict wounds': { level: 1, school: 'necromancy', rangeFt: 5, castingTime: '1 Action', damageFormula: '3d10', damageType: 'necrotic' },
  'hellish rebuke': { level: 1, school: 'evocation', rangeFt: 60, castingTime: '1 Reaction', damageFormula: '2d10', damageType: 'fire', saveAbility: 'DEX' },
  'faerie fire': { level: 1, school: 'evocation', rangeFt: 60, castingTime: '1 Action', saveAbility: 'DEX' },
  'fog cloud': { level: 1, school: 'conjuration', rangeFt: 120, castingTime: '1 Action' },
  'detect magic': { level: 1, school: 'divination', rangeFt: 0, castingTime: '1 Action', isSelfAction: true },
  'dissonant whispers': { level: 1, school: 'enchantment', rangeFt: 60, castingTime: '1 Action', damageFormula: '3d6', damageType: 'psychic', saveAbility: 'WIS' },

  // 2nd Level
  'scorching ray': { level: 2, school: 'evocation', rangeFt: 120, castingTime: '1 Action', damageFormula: '2d6', damageType: 'fire' },
  'misty step': { level: 2, school: 'conjuration', rangeFt: 30, castingTime: '1 Bonus Action', isSelfAction: true },
  'shatter': { level: 2, school: 'evocation', rangeFt: 60, castingTime: '1 Action', damageFormula: '3d8', damageType: 'thunder', saveAbility: 'CON' },
  'mirror image': { level: 2, school: 'illusion', rangeFt: 0, castingTime: '1 Action', isSelfAction: true },
  'invisibility': { level: 2, school: 'illusion', rangeFt: 5, castingTime: '1 Action', isSelfAction: true },
  'darkness': { level: 2, school: 'evocation', rangeFt: 60, castingTime: '1 Action' },
  'hold person': { level: 2, school: 'enchantment', rangeFt: 60, castingTime: '1 Action', saveAbility: 'WIS' },
  'spiritual weapon': { level: 2, school: 'evocation', rangeFt: 60, castingTime: '1 Bonus Action', damageFormula: '1d8 + 3', damageType: 'force' },
  'moonbeam': { level: 2, school: 'evocation', rangeFt: 120, castingTime: '1 Action', damageFormula: '2d10', damageType: 'radiant', saveAbility: 'CON' },
  'acid arrow': { level: 2, school: 'evocation', rangeFt: 90, castingTime: '1 Action', damageFormula: '4d4', damageType: 'acid' },
  'web': { level: 2, school: 'conjuration', rangeFt: 60, castingTime: '1 Action', saveAbility: 'DEX' },
  'barkskin': { level: 2, school: 'transmutation', rangeFt: 5, castingTime: '1 Action', isSelfAction: true },

  // 3rd Level
  'fireball': { level: 3, school: 'evocation', rangeFt: 150, castingTime: '1 Action', damageFormula: '8d6', damageType: 'fire', saveAbility: 'DEX' },
  'lightning bolt': { level: 3, school: 'evocation', rangeFt: 100, castingTime: '1 Action', damageFormula: '8d6', damageType: 'lightning', saveAbility: 'DEX' },
  'counterspell': { level: 3, school: 'abjuration', rangeFt: 60, castingTime: '1 Reaction' },
  'dispel magic': { level: 3, school: 'abjuration', rangeFt: 120, castingTime: '1 Action' },
  'fly': { level: 3, school: 'transmutation', rangeFt: 5, castingTime: '1 Action', isSelfAction: true },
  'spirit guardians': { level: 3, school: 'conjuration', rangeFt: 0, castingTime: '1 Action', damageFormula: '3d8', damageType: 'radiant', saveAbility: 'WIS', isSelfAction: true },
  'haste': { level: 3, school: 'transmutation', rangeFt: 30, castingTime: '1 Action', isSelfAction: true },
  'slow': { level: 3, school: 'transmutation', rangeFt: 120, castingTime: '1 Action', saveAbility: 'WIS' },
  'vampiric touch': { level: 3, school: 'necromancy', rangeFt: 5, castingTime: '1 Action', damageFormula: '3d6', damageType: 'necrotic' },
  'fear': { level: 3, school: 'illusion', rangeFt: 30, castingTime: '1 Action', saveAbility: 'WIS' },
  'call lightning': { level: 3, school: 'conjuration', rangeFt: 120, castingTime: '1 Action', damageFormula: '3d10', damageType: 'lightning', saveAbility: 'DEX' },

  // 4th Level
  'blight': { level: 4, school: 'necromancy', rangeFt: 30, castingTime: '1 Action', damageFormula: '8d8', damageType: 'necrotic', saveAbility: 'CON' },
  'ice storm': { level: 4, school: 'evocation', rangeFt: 300, castingTime: '1 Action', damageFormula: '2d8 + 4d6', damageType: 'cold', saveAbility: 'DEX' },
  'dimension door': { level: 4, school: 'conjuration', rangeFt: 500, castingTime: '1 Action', isSelfAction: true },
  'greater invisibility': { level: 4, school: 'illusion', rangeFt: 5, castingTime: '1 Action', isSelfAction: true },
  'banishment': { level: 4, school: 'abjuration', rangeFt: 60, castingTime: '1 Action', saveAbility: 'CHA' },
  'wall of fire': { level: 4, school: 'evocation', rangeFt: 120, castingTime: '1 Action', damageFormula: '5d8', damageType: 'fire', saveAbility: 'DEX' },
  'fire shield': { level: 4, school: 'evocation', rangeFt: 0, castingTime: '1 Action', damageFormula: '2d8', damageType: 'fire', isSelfAction: true },
  'stoneskin': { level: 4, school: 'abjuration', rangeFt: 5, castingTime: '1 Action', isSelfAction: true },

  // 5th Level
  'cone of cold': { level: 5, school: 'evocation', rangeFt: 60, castingTime: '1 Action', damageFormula: '8d8', damageType: 'cold', saveAbility: 'CON' },
  'flame strike': { level: 5, school: 'evocation', rangeFt: 60, castingTime: '1 Action', damageFormula: '4d6 + 4d6', damageType: 'fire', saveAbility: 'DEX' },
  'cloudkill': { level: 5, school: 'conjuration', rangeFt: 120, castingTime: '1 Action', damageFormula: '5d8', damageType: 'poison', saveAbility: 'CON' },
  'hold monster': { level: 5, school: 'enchantment', rangeFt: 90, castingTime: '1 Action', saveAbility: 'WIS' },
  'mass cure wounds': { level: 5, school: 'evocation', rangeFt: 60, castingTime: '1 Action', damageFormula: '3d8 + 5', damageType: 'radiant', isHeal: true },
  'teleportation circle': { level: 5, school: 'conjuration', rangeFt: 10, castingTime: '1 Minute' },
  'wall of force': { level: 5, school: 'evocation', rangeFt: 120, castingTime: '1 Action' },

  // 6th - 9th Level
  'chain lightning': { level: 6, school: 'evocation', rangeFt: 150, castingTime: '1 Action', damageFormula: '10d8', damageType: 'lightning', saveAbility: 'DEX' },
  'disintegrate': { level: 6, school: 'transmutation', rangeFt: 60, castingTime: '1 Action', damageFormula: '10d6 + 40', damageType: 'force', saveAbility: 'DEX' },
  'heal': { level: 6, school: 'evocation', rangeFt: 60, castingTime: '1 Action', damageFormula: '70', damageType: 'radiant', isHeal: true },
  'sunbeam': { level: 6, school: 'evocation', rangeFt: 60, castingTime: '1 Action', damageFormula: '6d8', damageType: 'radiant', saveAbility: 'CON' },
  'finger of death': { level: 7, school: 'necromancy', rangeFt: 60, castingTime: '1 Action', damageFormula: '7d8 + 30', damageType: 'necrotic', saveAbility: 'CON' },
  'fire storm': { level: 7, school: 'evocation', rangeFt: 150, castingTime: '1 Action', damageFormula: '7d10', damageType: 'fire', saveAbility: 'DEX' },
  'teleport': { level: 7, school: 'conjuration', rangeFt: 10, castingTime: '1 Action', isSelfAction: true },
  'sunburst': { level: 8, school: 'evocation', rangeFt: 150, castingTime: '1 Action', damageFormula: '12d6', damageType: 'radiant', saveAbility: 'CON' },
  'meteor swarm': { level: 9, school: 'evocation', rangeFt: 1000, castingTime: '1 Action', damageFormula: '20d6 + 20d6', damageType: 'fire', saveAbility: 'DEX' },
  'power word kill': { level: 9, school: 'enchantment', rangeFt: 60, castingTime: '1 Action' },
  'time stop': { level: 9, school: 'transmutation', rangeFt: 0, castingTime: '1 Action', isSelfAction: true }
};

/**
 * Extracts numeric range in feet from strings like "reach 5 ft.", "range 60/240 ft.", "120 ft."
 */
export function extractRangeInFeet(reachRange?: string, description?: string): number | undefined {
  const text = `${reachRange || ''} ${description || ''}`.toLowerCase();
  
  const rangeMatch = text.match(/range\s*(\d+)(?:\/\d+)?\s*ft/i);
  if (rangeMatch) return parseInt(rangeMatch[1], 10);

  const reachMatch = text.match(/reach\s*(\d+)\s*ft/i);
  if (reachMatch) return parseInt(reachMatch[1], 10);

  const generalFtMatch = text.match(/(\d+)\s*ft(?:\.|\s|$)/i);
  if (generalFtMatch) return parseInt(generalFtMatch[1], 10);

  if (text.includes('self') || text.includes('touch')) return 5;

  return undefined;
}

/**
 * Parses natural language 5e monster attack description into structured damage & bonuses
 */
export function parseMonsterAction(
  raw: MonsterAction | MonsterTrait,
  category: DmMonsterActionCategory,
  spellStats?: { dc?: number; attackBonus?: number },
  tokenState?: TokenMonsterState
): MonsterActionItem {
  const name = raw.name.trim();
  const desc = raw.description || '';
  const fullText = `${name} ${desc}`;

  // 1. Detect Recharge Mechanic
  let recharge: string | undefined;
  const rechargeMatch = fullText.match(/recharge\s*([0-9–\-]+)/i);
  if (rechargeMatch) {
    recharge = rechargeMatch[1].replace('–', '-');
  }

  // 2. Detect Legendary Action Cost
  let legendaryCost = 1;
  const costMatch = fullText.match(/\(costs\s*(\d+)\s*actions?\)/i);
  if (costMatch) {
    legendaryCost = parseInt(costMatch[1], 10) || 1;
  }

  // 3. Detect Saving Throw DC & Ability
  let saveDc: number | undefined;
  let saveAbility: string | undefined;
  const dcMatch = desc.match(/DC\s*(\d+)\s*(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma|STR|DEX|CON|INT|WIS|CHA)/i);
  if (dcMatch) {
    saveDc = parseInt(dcMatch[1], 10);
    const ab = dcMatch[2].toUpperCase().slice(0, 3);
    saveAbility = ab;
  }

  // 4. Detect Attack Hit Bonus
  let hitBonus: string | number | undefined;
  if ('attackBonus' in raw && raw.attackBonus !== undefined) {
    hitBonus = raw.attackBonus >= 0 ? `+${raw.attackBonus}` : `${raw.attackBonus}`;
  } else {
    const toHitMatch = desc.match(/([+-]\d+)\s*to\s*hit/i);
    if (toHitMatch) {
      hitBonus = toHitMatch[1];
    }
  }

  // 5. Detect Damage Formulas & Types
  let damageFormula: string | undefined;
  let damageType: string | undefined;
  let secondaryDamageFormula: string | undefined;
  let secondaryDamageType: string | undefined;

  // Primary damage from raw.damage or regex
  if ('damage' in raw && raw.damage) {
    const rawDam = String(raw.damage);
    const parenMatch = rawDam.match(/\(([^)]+)\)\s*([a-z]+)?/i);
    if (parenMatch) {
      damageFormula = parenMatch[1].trim();
      damageType = parenMatch[2]?.toLowerCase();
    } else {
      damageFormula = rawDam.replace(/\b(piercing|slashing|bludgeoning|fire|cold|lightning|necrotic|radiant|poison|acid|force|psychic|thunder)\b/gi, '').trim();
      const typeMatch = rawDam.match(/\b(piercing|slashing|bludgeoning|fire|cold|lightning|necrotic|radiant|poison|acid|force|psychic|thunder)\b/i);
      if (typeMatch) damageType = typeMatch[1].toLowerCase();
    }
  }

  // If still not found, parse Hit: from description
  if (!damageFormula) {
    const hitMatch = desc.match(/Hit:\s*(?:\d+\s*)?(?:\(([^)]+)\)|(\d+d\d+(?:\s*[+-]\s*\d+)?))\s*([a-z]+)?\s*damage/i);
    if (hitMatch) {
      damageFormula = (hitMatch[1] || hitMatch[2]).trim();
      damageType = hitMatch[3]?.toLowerCase();
    }
  }

  // Secondary damage (e.g. "plus 7 (2d6) fire damage")
  const plusMatch = desc.match(/plus\s*(?:\d+\s*)?(?:\(([^)]+)\)|(\d+d\d+(?:\s*[+-]\s*\d+)?))\s*([a-z]+)?\s*damage/i);
  if (plusMatch) {
    secondaryDamageFormula = (plusMatch[1] || plusMatch[2]).trim();
    secondaryDamageType = plusMatch[3]?.toLowerCase();
  }

  // Reach & Range
  const reachRange = 'reachRange' in raw ? raw.reachRange : undefined;
  const rangeFt = extractRangeInFeet(reachRange, desc);

  // Self Action Check
  const lowerName = name.toLowerCase();
  const lowerDesc = desc.toLowerCase();
  const isSelfAction =
    lowerName.includes('teleport') ||
    lowerName.includes('dash') ||
    lowerName.includes('dodge') ||
    lowerName.includes('disengage') ||
    lowerName.includes('hide') ||
    lowerName.includes('shapechanger') ||
    lowerName.includes('regeneration') ||
    lowerName.includes('misty step') ||
    lowerName.includes('shield') ||
    lowerName.includes('mage armor') ||
    rangeFt === 0 ||
    lowerDesc.includes('targets itself') ||
    lowerDesc.includes('on itself');

  // JB2A Visual Asset Matching
  const jb2aAsset = findJb2aAsset(name);
  const jb2aAssetId = jb2aAsset?.id;

  // Determine current recharge availability from state
  const isRecharged = recharge && tokenState
    ? tokenState.rechargeAvailable[name] ?? true
    : true;

  // Determine action type
  let type: MonsterActionItem['type'] = 'action';
  if ('type' in raw && raw.type) {
    type = raw.type as any;
  } else if (category === 'traits') {
    type = 'trait';
  } else if (category === 'reactions') {
    type = 'reaction';
  } else if (category === 'legendary') {
    type = 'legendary';
  } else if (hitBonus !== undefined || damageFormula !== undefined) {
    type = 'attack';
  }

  return {
    id: `act_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Math.random().toString(36).substr(2, 5)}`,
    name,
    category,
    type,
    description: desc,
    hitBonus,
    reachRange,
    rangeFt,
    damageFormula,
    damageType,
    secondaryDamageFormula,
    secondaryDamageType,
    saveDc: saveDc ?? spellStats?.dc,
    saveAbility,
    recharge,
    isRecharged,
    legendaryCost,
    jb2aAssetId,
    isSelfAction
  };
}

/**
 * Extracts and deconstructs spells from Monster Spellcasting traits into rollable spell actions
 */
export function extractMonsterSpells(
  monster: Monster,
  traits: MonsterTrait[],
  tokenState?: TokenMonsterState
): { spells: MonsterActionItem[]; spellSlots: Record<number, MonsterSpellSlotInfo>; spellSaveDc?: number; spellAttackBonus?: number } {
  const spells: MonsterActionItem[] = [];
  const spellSlots: Record<number, MonsterSpellSlotInfo> = {};

  // Find spellcasting trait
  const spellTrait = traits.find(t =>
    t.name.toLowerCase().includes('spellcasting') ||
    t.name.toLowerCase().includes('innate')
  );

  let spellSaveDc: number | undefined;
  let spellAttackBonus: number | undefined;

  if (spellTrait) {
    const dcMatch = spellTrait.description.match(/spell\s*save\s*DC\s*(\d+)/i);
    if (dcMatch) spellSaveDc = parseInt(dcMatch[1], 10);

    const hitMatch = spellTrait.description.match(/([+-]\d+)\s*to\s*hit\s*with\s*spell\s*attacks/i);
    if (hitMatch) spellAttackBonus = parseInt(hitMatch[1], 10);
  }

  // Helper to register spell
  const addSpell = (spellName: string, levelOverride?: number, castingFrequency?: string) => {
    const cleanName = spellName.replace(/\*+/g, '').trim();
    if (!cleanName) return;

    const lower = cleanName.toLowerCase();
    const profile = COMMON_SPELLS_CATALOG[lower];
    const jb2a = findJb2aAsset(cleanName);

    const level = levelOverride ?? profile?.level ?? 1;
    const rangeFt = profile?.rangeFt ?? (jb2a?.defaultSizeFt ? jb2a.defaultSizeFt * 3 : 60);

    spells.push({
      id: `spell_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      name: cleanName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '),
      category: 'spells',
      type: 'spell',
      level,
      school: profile?.school ?? jb2a?.school ?? 'evocation',
      rangeFt,
      castingTime: profile?.castingTime ?? '1 Action',
      hitBonus: spellAttackBonus !== undefined ? (spellAttackBonus >= 0 ? `+${spellAttackBonus}` : `${spellAttackBonus}`) : undefined,
      saveDc: spellSaveDc,
      saveAbility: profile?.saveAbility,
      damageFormula: profile?.damageFormula,
      damageType: profile?.damageType,
      jb2aAssetId: jb2a?.id,
      isSelfAction: profile?.isSelfAction ?? (rangeFt === 0),
      isHeal: profile?.isHeal ?? false,
      description: `${castingFrequency ? `Frequency: ${castingFrequency}. ` : ''}${cleanName} (Level ${level})`
    });
  };

  // 1. Process Structured MonsterSpellcasting if present
  if ((monster as any).spellcasting?.spells) {
    const structured = (monster as any).spellcasting;
    if (structured.dc) spellSaveDc = structured.dc;
    if (structured.attackBonus) spellAttackBonus = structured.attackBonus;

    for (const group of structured.spells) {
      const freq = group.frequency || '';
      let level = 1;
      const slotMatch = freq.match(/(\d+)(?:st|nd|rd|th)?\s*level\s*\((\d+)\s*slots?\)/i);
      if (slotMatch) {
        level = parseInt(slotMatch[1], 10);
        const slotsTotal = parseInt(slotMatch[2], 10);
        const used = tokenState?.spellSlotsUsed[level] || 0;
        spellSlots[level] = {
          level,
          total: slotsTotal,
          used,
          available: Math.max(0, slotsTotal - used)
        };
      } else if (freq.toLowerCase().includes('cantrip')) {
        level = 0;
      }

      for (const s of group.list) {
        addSpell(s, level, freq);
      }
    }
  }

  // 2. Parse unstructured Spellcasting text from trait
  if (spells.length === 0 && spellTrait) {
    const desc = spellTrait.description;

    // Line-by-line or semicolon-separated parsing
    const lines = desc.split(/[\n;]/).map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      // e.g. "Cantrips (at will): fire bolt, light, mage hand"
      const cantripMatch = line.match(/cantrips?\s*(?:\([^)]+\))?:\s*(.+)/i);
      if (cantripMatch) {
        const spellList = cantripMatch[1].split(',').map(s => s.trim());
        for (const s of spellList) addSpell(s, 0, 'At will');
        continue;
      }

      // e.g. "1st level (4 slots): detect magic, magic missile, shield"
      const slotMatch = line.match(/(\d+)(?:st|nd|rd|th)?\s*level\s*\((\d+)\s*slots?\):\s*(.+)/i);
      if (slotMatch) {
        const level = parseInt(slotMatch[1], 10);
        const total = parseInt(slotMatch[2], 10);
        const used = tokenState?.spellSlotsUsed[level] || 0;
        spellSlots[level] = {
          level,
          total,
          used,
          available: Math.max(0, total - used)
        };

        const spellList = slotMatch[3].split(',').map(s => s.trim());
        for (const s of spellList) addSpell(s, level, `${level}st Level (${total} slots)`);
        continue;
      }

      // e.g. "At will: dancing lights, darkness" or "1/day each: faerie fire, levitate"
      const innateMatch = line.match(/(at\s*will|\d+\/day(?:\s*each)?):\s*(.+)/i);
      if (innateMatch) {
        const freq = innateMatch[1];
        const spellList = innateMatch[2].split(',').map(s => s.trim());
        for (const s of spellList) addSpell(s, undefined, freq);
      }
    }
  }

  return { spells, spellSlots, spellSaveDc, spellAttackBonus };
}

/**
 * Normalizes any Token into complete DmMonsterHudData
 */
export function buildDmMonsterHudData(
  token: any,
  compendiumMonsters: Monster[] = []
): DmMonsterHudData | null {
  if (!token) return null;

  const rawName = String(token.name || '').trim();
  const cleanedName = rawName
    .replace(/\s+\d+$/, '')
    .replace(/\s+#[0-9]+$/, '')
    .replace(/\s+[A-Za-z]$/, '')
    .trim();

  const allMonsters = [...compendiumMonsters, ...SRD_MONSTERS];
  const exactMatch = allMonsters.find(m =>
    m.name.toLowerCase() === cleanedName.toLowerCase() ||
    m.name.toLowerCase() === rawName.toLowerCase()
  );

  const resolved = exactMatch
    ? { monster: exactMatch }
    : (resolveMonster(cleanedName || rawName, compendiumMonsters) || resolveMonster(rawName, compendiumMonsters));

  const monster: Monster | undefined = resolved?.monster || exactMatch;

  if (!monster) return null;

  // Initialize or read token state
  const state: TokenMonsterState = token.monsterState || {
    rechargeAvailable: {},
    spellSlotsUsed: {},
    legendaryActionsMax: 3,
    legendaryActionsUsed: 0
  };

  // Defenses & Traits
  const traits = monster.traits || [];
  const rawActions = monster.actions || [];
  const rawBonusActions = monster.bonusActions || [];
  const rawReactions = monster.reactions || [];
  const rawLegendaryActions = monster.legendaryActions || [];

  // Parse Spells & Spell Slots
  const { spells, spellSlots, spellSaveDc, spellAttackBonus } = extractMonsterSpells(monster, traits, state);
  const spellStats = { dc: spellSaveDc, attackBonus: spellAttackBonus };

  // Parse Action Categories
  const attacks: MonsterActionItem[] = [];
  const actions: MonsterActionItem[] = [];

  for (const raw of rawActions) {
    const parsed = parseMonsterAction(raw, 'actions', spellStats, state);
    if (parsed.type === 'attack' || parsed.damageFormula || parsed.hitBonus !== undefined) {
      attacks.push({ ...parsed, category: 'attacks' });
    } else {
      actions.push(parsed);
    }
  }

  const bonusActions: MonsterActionItem[] = rawBonusActions.map(ba =>
    parseMonsterAction(ba, 'bonus_actions', spellStats, state)
  );

  const reactions: MonsterActionItem[] = rawReactions.map(rx =>
    parseMonsterAction(rx, 'reactions', spellStats, state)
  );

  const legendaryActions: MonsterActionItem[] = rawLegendaryActions.map(la =>
    parseMonsterAction(la, 'legendary', spellStats, state)
  );

  const traitItems: MonsterActionItem[] = traits.map(tr =>
    parseMonsterAction(tr, 'traits', spellStats, state)
  );

  // Parse Legendary Actions description if present
  const legendaryDesc = monster.legendaryDescription || (rawLegendaryActions.length > 0 ? (
    `The ${monster.name} can take 3 legendary actions, choosing from the options below. Only one legendary action option can be used at a time and only at the end of another creature's turn. The ${monster.name} regains spent legendary actions at the start of its turn.`
  ) : undefined);

  return {
    tokenId: token.id,
    monsterId: monster.monsterId,
    name: token.name || monster.name,
    originalMonsterName: monster.name,
    avatarUrl: token.url || token.avatarUrl || monster.avatarUrl || '',
    size: monster.size || 'Medium',
    type: monster.type || 'Creature',
    alignment: monster.alignment || 'Unaligned',
    cr: monster.challenge || '1 (200 XP)',
    proficiencyBonus: monster.proficiencyBonus || 2,
    initiativeBonus: monster.initiativeBonus || Math.floor(((monster.dex || 10) - 10) / 2),

    // Current Token Vitals
    currentHp: token.currentHp !== undefined ? token.currentHp : (token.hp !== undefined ? token.hp : monster.hp),
    maxHp: token.maxHp !== undefined ? token.maxHp : monster.hp,
    tempHp: token.tempHp || 0,
    ac: token.ac !== undefined ? token.ac : monster.ac,
    acNotes: monster.acNotes,
    speed: monster.speed || '30 ft.',
    passivePerception: parseInt((monster.senses || '').match(/passive\s*perception\s*(\d+)/i)?.[1] || '10', 10),

    // Stats
    str: monster.str || 10,
    dex: monster.dex || 10,
    con: monster.con || 10,
    int: monster.int || 10,
    wis: monster.wis || 10,
    cha: monster.cha || 10,

    // Defenses & Senses
    senses: monster.senses,
    languages: monster.languages,
    damageResistances: monster.damageResistances,
    damageImmunities: monster.damageImmunities,
    damageVulnerabilities: monster.damageVulnerabilities,
    conditionImmunities: monster.conditionImmunities,
    savingThrows: monster.savingThrows,
    skills: monster.skills,

    spellSaveDc,
    spellAttackBonus,

    // Categorized Actions
    attacks,
    actions,
    bonusActions,
    reactions,
    legendaryActions,
    traits: traitItems,
    spells,

    spellSlots,
    state,
    legendaryDescription: legendaryDesc
  };
}
