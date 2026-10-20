import { Server } from 'socket.io';
import { getDdbHeaders } from './ddbService';
import { Character } from '../src/types/character';
import { DdbGameLogDaemon } from './ddbGameLogDaemon';

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

// Fetch raw character payload from D&D Beyond (supports both character-service v5 and characters/json fallback)
export async function fetchRawDdbCharacter(charId: string): Promise<any | null> {
  const headers = getDdbHeaders();
  try {
    let c: any = null;
    try {
      const res = await fetch(`https://character-service.dndbeyond.com/character/v5/character/${charId}`, { headers });
      if (res.ok) {
        const json = await res.json();
        c = json.data;
      }
    } catch (e) {
      // Primary fetch failed, try fallback
    }

    if (!c) {
      try {
        const fallbackRes = await fetch(`https://www.dndbeyond.com/characters/${charId}/json`, { headers });
        if (fallbackRes.ok) {
          const json = await fallbackRes.json();
          c = json.data || json;
        }
      } catch (e) {
        // Fallback fetch failed
      }
    }
    return c;
  } catch (err) {
    console.warn(`[DdbCampaign] Error fetching raw character ${charId}:`, err);
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

// Map spell names or common weapon attacks to JB2A asset IDs
function matchJb2aAssetId(name: string): string | undefined {
  if (!name) return undefined;
  const n = name.toLowerCase().trim();

  // Spell mapping
  if (n.includes('fireball')) return 'fireball';
  if (n.includes('fire bolt') || n.includes('firebolt')) return 'fire_bolt';
  if (n.includes('eldritch blast')) return 'eldritch_blast';
  if (n.includes('magic missile')) return 'magic_missile';
  if (n.includes('cure wounds')) return 'cure_wounds';
  if (n.includes('healing word')) return 'healing_word';
  if (n.includes('shield of faith')) return 'shield_of_faith';
  if (n.includes('shield')) return 'shield';
  if (n.includes('sacred flame')) return 'sacred_flame';
  if (n.includes('guiding bolt')) return 'guiding_bolt';
  if (n.includes('spiritual weapon')) return 'spiritual_weapon';
  if (n.includes('spirit guardians')) return 'spirit_guardians';
  if (n.includes('misty step')) return 'misty_step';
  if (n.includes('thunderwave')) return 'thunderwave';
  if (n.includes('lightning bolt')) return 'lightning_bolt';
  if (n.includes('hold person')) return 'hold_person';
  if (n.includes('bless')) return 'bless';
  if (n.includes('bane')) return 'bane';
  if (n.includes('toll the dead')) return 'toll_the_dead';
  if (n.includes('shatter')) return 'shatter';
  if (n.includes('moonbeam')) return 'moonbeam';
  if (n.includes('call lightning')) return 'call_lightning';
  if (n.includes('disintegrate')) return 'disintegrate';

  // Weapon & Martial mapping
  if (n.includes('sword') || n.includes('scimitar') || n.includes('rapier') || n.includes('slash')) return 'attack_sword_slash';
  if (n.includes('axe') || n.includes('halberd') || n.includes('glaive')) return 'attack_greataxe_cleave';
  if (n.includes('hammer') || n.includes('mace') || n.includes('flail') || n.includes('club')) return 'attack_warhammer_smash';
  if (n.includes('bow') || n.includes('arrow')) return 'attack_arrow_shot';
  if (n.includes('crossbow') || n.includes('bolt')) return 'attack_crossbow_bolt';
  if (n.includes('dagger') || n.includes('spear') || n.includes('javelin') || n.includes('pierce')) return 'attack_dagger_stab';
  if (n.includes('unarmed') || n.includes('punch') || n.includes('fist') || n.includes('martial arts')) return 'attack_unarmed';
  if (n.includes('bite')) return 'attack_bite';
  if (n.includes('claw')) return 'attack_claw';

  return undefined;
}

// Full D&D Beyond Character normalizer for BG3-Inspired Hero Bottom HUD
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

  // Passives
  const wisMod = Math.floor((computed.stats.wis - 10) / 2);
  const intMod = Math.floor((computed.stats.int - 10) / 2);
  const profBonus = Math.ceil(computed.totalLevel / 4) + 1;
  const passivePerception = 10 + wisMod + (c.characterValues?.some((v: any) => v.typeId === 2 && v.valueId === 14) ? profBonus : 0);
  const passiveInsight = 10 + wisMod;
  const passiveInvestigation = 10 + intMod;

  // Spellcasting metrics
  let spellSaveDc = 10 + profBonus;
  let spellAttackBonus = profBonus;
  if (Array.isArray(c.classes)) {
    for (const cl of c.classes) {
      const abilityId = cl.definition?.spellCastingAbilityId;
      if (abilityId) {
        const abilityMap: Record<number, keyof typeof computed.stats> = { 1: 'str', 2: 'dex', 3: 'con', 4: 'int', 5: 'wis', 6: 'cha' };
        const key = abilityMap[abilityId];
        if (key) {
          const mod = Math.floor((computed.stats[key] - 10) / 2);
          spellSaveDc = 8 + profBonus + mod;
          spellAttackBonus = profBonus + mod;
          break;
        }
      }
    }
  }

  const actions: any[] = [];
  const bonusActions: any[] = [];
  const spells: any[] = [];
  const items: any[] = [];

  // Standard 5e Actions
  actions.push({
    id: 'action-dash',
    name: 'Dash',
    category: 'actions',
    type: 'action',
    description: 'Gain extra movement equal to your speed for the current turn.',
    rangeFt: 0
  });
  actions.push({
    id: 'action-disengage',
    name: 'Disengage',
    category: 'actions',
    type: 'action',
    description: 'Your movement does not provoke opportunity attacks for the rest of the turn.',
    rangeFt: 0
  });
  actions.push({
    id: 'action-dodge',
    name: 'Dodge',
    category: 'actions',
    type: 'action',
    description: 'Attack rolls against you have disadvantage until the start of your next turn.',
    rangeFt: 0
  });
  actions.push({
    id: 'action-help',
    name: 'Help',
    category: 'actions',
    type: 'action',
    description: 'Lend aid to an ally, giving them advantage on their next ability check or attack roll.',
    rangeFt: 5
  });

  // Inventory / Weapons & Items
  if (Array.isArray(c.inventory)) {
    c.inventory.forEach((item: any, idx: number) => {
      const def = item.definition;
      if (!def) return;
      const itemName = def.name || 'Item';
      const isEquipped = !!item.equipped;
      const jb2aAssetId = matchJb2aAssetId(itemName);

      if (def.filterType === 'Weapon') {
        const dmgDice = def.damage?.diceString || '1d6';
        const dmgType = def.damageType?.toLowerCase() || 'physical';
        const isRanged = def.attackType === 2;
        const rangeFt = def.range || (isRanged ? 80 : 5);
        const strMod = Math.floor((computed.stats.str - 10) / 2);
        const dexMod = Math.floor((computed.stats.dex - 10) / 2);
        const weaponMod = isRanged ? dexMod : Math.max(strMod, def.properties?.some((p: any) => p.name === 'Finesse') ? dexMod : strMod);
        const hitBonus = profBonus + weaponMod;

        actions.push({
          id: `wpn-${idx}-${def.id || idx}`,
          name: itemName,
          category: 'actions',
          type: 'action',
          rangeFt,
          castingTime: '1 Action',
          hitBonus: `+${hitBonus}`,
          damageFormula: `${dmgDice} + ${weaponMod}`,
          damageType: dmgType,
          description: def.description || `Attack with ${itemName}`,
          jb2aAssetId: jb2aAssetId || (isRanged ? 'attack_arrow_shot' : 'attack_sword_slash'),
          iconUrl: def.avatarUrl
        });
      } else if (def.filterType === 'Potion' || def.filterType === 'Scroll' || def.canUse || itemName.toLowerCase().includes('potion')) {
        const isHealingPotion = itemName.toLowerCase().includes('healing');
        items.push({
          id: `item-${idx}-${def.id || idx}`,
          name: itemName,
          category: 'items',
          type: 'item',
          quantity: item.quantity || 1,
          description: def.description || 'Consumable item',
          jb2aAssetId: isHealingPotion ? 'cure_wounds' : undefined,
          isHeal: isHealingPotion,
          damageFormula: isHealingPotion ? (itemName.toLowerCase().includes('greater') ? '4d4 + 4' : '2d4 + 2') : undefined,
          iconUrl: def.avatarUrl
        });
      }
    });
  }

  // Spells extraction
  const rawSpellsList: any[] = [];
  if (Array.isArray(c.classSpells)) {
    c.classSpells.forEach((cs: any) => {
      if (Array.isArray(cs.spells)) {
        cs.spells.forEach((sp: any) => rawSpellsList.push(sp));
      }
    });
  }
  if (Array.isArray(c.spells?.race)) rawSpellsList.push(...c.spells.race);
  if (Array.isArray(c.spells?.class)) rawSpellsList.push(...c.spells.class);
  if (Array.isArray(c.spells?.feat)) rawSpellsList.push(...c.spells.feat);
  if (Array.isArray(c.spells?.item)) rawSpellsList.push(...c.spells.item);

  const seenSpellNames = new Set<string>();
  rawSpellsList.forEach((sp: any, idx: number) => {
    const def = sp.definition;
    if (!def) return;
    const name = def.name;
    if (seenSpellNames.has(name.toLowerCase())) return;
    seenSpellNames.add(name.toLowerCase());

    const level = def.level || 0;
    const school = def.school?.toLowerCase() || 'evocation';
    const rangeFt = def.range?.rangeValue || (def.range?.origin === 'Self' ? 0 : 30);
    const castingTime = def.activation?.activationType === 3 ? '1 Bonus Action' : def.activation?.activationType === 4 ? '1 Reaction' : '1 Action';
    const isBonusAction = def.activation?.activationType === 3;
    const jb2aAssetId = matchJb2aAssetId(name);
    const isHeal = name.toLowerCase().includes('cure') || name.toLowerCase().includes('heal') || name.toLowerCase().includes('restoration');

    const hudSpell = {
      id: `spell-${idx}-${def.id || idx}`,
      name,
      category: isBonusAction ? 'bonus_actions' : 'spells',
      type: isBonusAction ? 'bonus_action' : 'action',
      level,
      school,
      rangeFt,
      castingTime,
      spellSlotRequired: level > 0 ? level : undefined,
      description: def.description || '',
      jb2aAssetId,
      isHeal,
      isPrepared: sp.prepared || level === 0,
      damageFormula: isHeal ? (level === 1 ? '1d8 + 3' : '2d8 + 3') : undefined
    };

    spells.push(hudSpell);
    if (isBonusAction) {
      bonusActions.push(hudSpell);
    }
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

  return {
    id: charId,
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
    actions,
    bonusActions,
    spells,
    items,
    spellSlots,
    resources: [],
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
