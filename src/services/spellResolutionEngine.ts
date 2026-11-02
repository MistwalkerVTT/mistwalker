import type { SceneToken } from '../types';
import type { Character } from '../types/character';

export type SpellResolutionArchetype =
  | 'attack_roll'    // Needs 1d20 + spellAttackBonus vs Target AC (e.g. Starry Wisp, Fire Bolt, Guiding Bolt)
  | 'saving_throw'   // No caster d20! Targets roll 1d20 + Save vs Caster spellSaveDc (e.g. Moonbeam, Fireball, Entangle)
  | 'auto_hit'       // No d20 at all! Automatically deals damage (e.g. Magic Missile, Cloud of Daggers, Spike Growth)
  | 'healing_buff'   // No d20! Restores HP or grants Temp HP / AC (e.g. Cure Wounds, Healing Word, Barkskin)
  | 'utility_zone';  // No d20 and no direct HP math on cast (e.g. Fog Cloud, Pass Without Trace, Darkness)

export type SaveAbility = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';
export type SaveOutcomeRule = 'half_damage' | 'negates_all';

export interface ClassifiedSpellProfile {
  spellName: string;
  archetype: SpellResolutionArchetype;
  requiresAttackRoll: boolean;
  requiresTargetSave: boolean;
  saveAbility?: SaveAbility;
  saveOutcome?: SaveOutcomeRule;
  damageFormula?: string;
  damageType?: string;
  healingFormula?: string;
  flatHealing?: number;
  aoeShape?: 'cone' | 'sphere' | 'cube' | 'line' | 'cylinder';
  aoeSizeFt?: number;
  concentration?: boolean;
  jb2aSuggestedCategory: 'projectile' | 'aoe_explosion' | 'beam' | 'healing' | 'aura';
}

export interface TargetSaveResolution {
  tokenId: string;
  tokenName: string;
  saveAbility: SaveAbility;
  dc: number;
  d20Roll: number;
  saveBonus: number;
  totalRoll: number;
  succeeded: boolean;
  damageTaken: number;
}

/**
 * Curated Registry of Common D&D 2024 Druid / Cleric / Wizard Spells
 * Guarantees 100% mechanical accuracy for iconic spells before falling back to NLP text parsing.
 */
export const KNOWN_SPELL_OVERRIDES: Record<string, Partial<ClassifiedSpellProfile>> = {
  // Auto-Hit Spells (Never roll to hit, no save on cast)
  'magic missile': {
    archetype: 'auto_hit',
    requiresAttackRoll: false,
    requiresTargetSave: false,
    damageFormula: '3d4+3',
    damageType: 'force',
    jb2aSuggestedCategory: 'projectile',
  },
  'cloud of daggers': {
    archetype: 'auto_hit',
    requiresAttackRoll: false,
    requiresTargetSave: false,
    damageFormula: '4d4',
    damageType: 'slashing',
    aoeShape: 'cube',
    aoeSizeFt: 5,
    concentration: true,
    jb2aSuggestedCategory: 'aura',
  },
  'spike growth': {
    archetype: 'auto_hit',
    requiresAttackRoll: false,
    requiresTargetSave: false,
    damageFormula: '2d4',
    damageType: 'piercing',
    aoeShape: 'sphere',
    aoeSizeFt: 20,
    concentration: true,
    jb2aSuggestedCategory: 'aoe_explosion',
  },

  // Circle of the Moon / Core Druid Saving Throw Spells (Never roll caster d20 to hit!)
  'moonbeam': {
    archetype: 'saving_throw',
    requiresAttackRoll: false,
    requiresTargetSave: true,
    saveAbility: 'CON',
    saveOutcome: 'half_damage',
    damageFormula: '2d10',
    damageType: 'radiant',
    aoeShape: 'cylinder',
    aoeSizeFt: 5,
    concentration: true,
    jb2aSuggestedCategory: 'beam',
  },
  'call lightning': {
    archetype: 'saving_throw',
    requiresAttackRoll: false,
    requiresTargetSave: true,
    saveAbility: 'DEX',
    saveOutcome: 'half_damage',
    damageFormula: '3d10',
    damageType: 'lightning',
    aoeShape: 'sphere',
    aoeSizeFt: 5,
    concentration: true,
    jb2aSuggestedCategory: 'aoe_explosion',
  },
  'thunderwave': {
    archetype: 'saving_throw',
    requiresAttackRoll: false,
    requiresTargetSave: true,
    saveAbility: 'CON',
    saveOutcome: 'half_damage',
    damageFormula: '2d8',
    damageType: 'thunder',
    aoeShape: 'cube',
    aoeSizeFt: 15,
    jb2aSuggestedCategory: 'aoe_explosion',
  },
  'ice storm': {
    archetype: 'saving_throw',
    requiresAttackRoll: false,
    requiresTargetSave: true,
    saveAbility: 'DEX',
    saveOutcome: 'half_damage',
    damageFormula: '2d8+4d6',
    damageType: 'bludgeoning/cold',
    aoeShape: 'cylinder',
    aoeSizeFt: 20,
    jb2aSuggestedCategory: 'aoe_explosion',
  },
  'blight': {
    archetype: 'saving_throw',
    requiresAttackRoll: false,
    requiresTargetSave: true,
    saveAbility: 'CON',
    saveOutcome: 'half_damage',
    damageFormula: '8d8',
    damageType: 'necrotic',
    jb2aSuggestedCategory: 'aoe_explosion',
  },
  'fireball': {
    archetype: 'saving_throw',
    requiresAttackRoll: false,
    requiresTargetSave: true,
    saveAbility: 'DEX',
    saveOutcome: 'half_damage',
    damageFormula: '8d6',
    damageType: 'fire',
    aoeShape: 'sphere',
    aoeSizeFt: 20,
    jb2aSuggestedCategory: 'aoe_explosion',
  },
  'entangle': {
    archetype: 'saving_throw',
    requiresAttackRoll: false,
    requiresTargetSave: true,
    saveAbility: 'STR',
    saveOutcome: 'negates_all',
    aoeShape: 'cube',
    aoeSizeFt: 20,
    concentration: true,
    jb2aSuggestedCategory: 'aura',
  },
  'faerie fire': {
    archetype: 'saving_throw',
    requiresAttackRoll: false,
    requiresTargetSave: true,
    saveAbility: 'DEX',
    saveOutcome: 'negates_all',
    aoeShape: 'cube',
    aoeSizeFt: 20,
    concentration: true,
    jb2aSuggestedCategory: 'aura',
  },
  'sacred flame': {
    archetype: 'saving_throw',
    requiresAttackRoll: false,
    requiresTargetSave: true,
    saveAbility: 'DEX',
    saveOutcome: 'negates_all',
    damageFormula: '1d8',
    damageType: 'radiant',
    jb2aSuggestedCategory: 'beam',
  },
  'toll the dead': {
    archetype: 'saving_throw',
    requiresAttackRoll: false,
    requiresTargetSave: true,
    saveAbility: 'WIS',
    saveOutcome: 'negates_all',
    damageFormula: '1d12',
    damageType: 'necrotic',
    jb2aSuggestedCategory: 'aoe_explosion',
  },
  'poison spray': {
    // Note: In D&D 2024 rules, Poison Spray changed to a Ranged Spell Attack!
    archetype: 'attack_roll',
    requiresAttackRoll: true,
    requiresTargetSave: false,
    damageFormula: '1d12',
    damageType: 'poison',
    jb2aSuggestedCategory: 'projectile',
  },
  'starry wisp': {
    archetype: 'attack_roll',
    requiresAttackRoll: true,
    requiresTargetSave: false,
    damageFormula: '1d8',
    damageType: 'radiant',
    jb2aSuggestedCategory: 'projectile',
  },

  // Healing & Buff Spells (Never roll d20!)
  'cure wounds': {
    archetype: 'healing_buff',
    requiresAttackRoll: false,
    requiresTargetSave: false,
    healingFormula: '2d8', // D&D 2024 buffed Cure Wounds to 2d8 + mod!
    jb2aSuggestedCategory: 'healing',
  },
  'healing word': {
    archetype: 'healing_buff',
    requiresAttackRoll: false,
    requiresTargetSave: false,
    healingFormula: '2d4', // D&D 2024 buffed Healing Word to 2d4 + mod!
    jb2aSuggestedCategory: 'healing',
  },
  'fount of moonlight': {
    archetype: 'healing_buff',
    requiresAttackRoll: false,
    requiresTargetSave: false,
    concentration: true,
    jb2aSuggestedCategory: 'aura',
  },
  'barkskin': {
    archetype: 'healing_buff',
    requiresAttackRoll: false,
    requiresTargetSave: false,
    jb2aSuggestedCategory: 'aura',
  },
};

const ABILITY_MAP: Record<string, SaveAbility> = {
  strength: 'STR',
  str: 'STR',
  dexterity: 'DEX',
  dex: 'DEX',
  constitution: 'CON',
  con: 'CON',
  intelligence: 'INT',
  int: 'INT',
  wisdom: 'WIS',
  wis: 'WIS',
  charisma: 'CHA',
  cha: 'CHA',
};

/**
 * Classifies any spell object or description string into one of the 5 D&D 2024 Resolution Archetypes.
 */
export function classifySpellMechanics(input: {
  name: string;
  description?: string;
  attackType?: string;
  saveDcAbility?: string;
  saveDc?: number | string;
  damageFormula?: string;
  damageType?: string;
  isHealing?: boolean;
}): ClassifiedSpellProfile {
  const normalizedName = input.name.trim().toLowerCase();
  const desc = (input.description ?? '').toLowerCase();
  const override = KNOWN_SPELL_OVERRIDES[normalizedName];

  // 0. Curated Overrides always win first
  if (override && override.archetype) {
    return {
      spellName: input.name,
      archetype: override.archetype,
      requiresAttackRoll: Boolean(override.requiresAttackRoll),
      requiresTargetSave: Boolean(override.requiresTargetSave),
      saveAbility: override.saveAbility,
      saveOutcome: override.saveOutcome,
      damageFormula: input.damageFormula || override.damageFormula,
      damageType: input.damageType || override.damageType,
      healingFormula: override.healingFormula,
      flatHealing: override.flatHealing,
      aoeShape: override.aoeShape,
      aoeSizeFt: override.aoeSizeFt,
      concentration: override.concentration,
      jb2aSuggestedCategory: override.jb2aSuggestedCategory ?? 'projectile',
    };
  }

  // 1. Healing & Temp HP spells NEVER roll to hit
  if (
    input.isHealing ||
    /\b(regains?\s+\d+d\d+|regains?\s+hit\s+points|restore[sd]?\s+hit\s+points|temporary\s+hit\s+points)\b/i.test(desc)
  ) {
    const healDiceMatch = desc.match(/(\d+d\d+(?:\s*\+\s*\d+)?)/i);
    return {
      spellName: input.name,
      archetype: 'healing_buff',
      requiresAttackRoll: false,
      requiresTargetSave: false,
      healingFormula: input.damageFormula || healDiceMatch?.[1],
      jb2aSuggestedCategory: 'healing',
    };
  }

  // 2. Saving Throw Check MUST run BEFORE generic attackType flags!
  // Many DDB/SRD spells have isAttack=true or hitBonus populated erroneously even when they use a Save DC.
  const saveMatch = desc.match(
    /\b(strength|dexterity|constitution|intelligence|wisdom|charisma|str|dex|con|int|wis|cha)\s+saving\s+throw\b/i
  );

  if (saveMatch || input.saveDcAbility || input.saveDc) {
    const rawAbility = (input.saveDcAbility || saveMatch?.[1] || 'dex').toLowerCase();
    const saveAbility = ABILITY_MAP[rawAbility] ?? 'DEX';
    const isHalfOnSave = /\b(half\s+as\s+much\s+damage|half\s+damage)\b/i.test(desc);
    const dmgMatch = desc.match(/(\d+d\d+(?:\s*[+-]\s*\d+)?)\s+(\w+)\s+damage/i);

    return {
      spellName: input.name,
      archetype: 'saving_throw',
      requiresAttackRoll: false,
      requiresTargetSave: true,
      saveAbility,
      saveOutcome: isHalfOnSave ? 'half_damage' : 'negates_all',
      damageFormula: input.damageFormula || dmgMatch?.[1],
      damageType: input.damageType || dmgMatch?.[2],
      jb2aSuggestedCategory: 'aoe_explosion',
    };
  }

  // 3. Explicit Spell Attack Text in description ("ranged spell attack", "melee spell attack", "spell attack roll")
  const hasExplicitSpellAttackText =
    /\b(melee\s+spell\s+attack|ranged\s+spell\s+attack|spell\s+attack\s+roll|make\s+a\s+ranged\s+attack|make\s+a\s+melee\s+attack)\b/i.test(
      desc
    );

  // Only trust input.attackType if the description does NOT say "automatically hits" or lack attack wording
  const isAutoHitText = /\b(automatically\s+hits|darts?\s+hit\s+simultaneously|without\s+making\s+an\s+attack\s+roll)\b/i.test(desc);

  if (!isAutoHitText && (hasExplicitSpellAttackText || Boolean(input.attackType))) {
    const dmgMatch = desc.match(/(\d+d\d+(?:\s*[+-]\s*\d+)?)\s+(\w+)\s+damage/i);
    return {
      spellName: input.name,
      archetype: 'attack_roll',
      requiresAttackRoll: true,
      requiresTargetSave: false,
      damageFormula: input.damageFormula || dmgMatch?.[1],
      damageType: input.damageType || dmgMatch?.[2],
      jb2aSuggestedCategory: 'projectile',
    };
  }

  // 4. Auto-Hit Damage (Deals damage, no save, no attack roll — e.g. Magic Missile, Spike Growth, Cloud of Daggers)
  const autoDmgMatch = desc.match(/(\d+d\d+(?:\s*[+-]\s*\d+)?)\s+(\w+)\s+damage/i);
  if (input.damageFormula || autoDmgMatch) {
    return {
      spellName: input.name,
      archetype: 'auto_hit',
      requiresAttackRoll: false,
      requiresTargetSave: false,
      damageFormula: input.damageFormula || autoDmgMatch?.[1],
      damageType: input.damageType || autoDmgMatch?.[2],
      jb2aSuggestedCategory: 'projectile',
    };
  }

  // 5. Utility / Control Zone
  return {
    spellName: input.name,
    archetype: 'utility_zone',
    requiresAttackRoll: false,
    requiresTargetSave: false,
    jb2aSuggestedCategory: 'aura',
  };
}
/**
 * Resolves Saving Throws for one or more target tokens against a caster's Spell Save DC.
 */
export function resolveSpellSavingThrows(params: {
  caster: Character | null | undefined;
  targets: SceneToken[];
  profile: ClassifiedSpellProfile;
  rolledBaseDamage: number;
}): TargetSaveResolution[] {
  const { caster, targets, profile, rolledBaseDamage } = params;
  const wisMod = caster?.stats?.wis ? Math.floor((caster.stats.wis - 10) / 2) : (caster && typeof (caster as any).wis === 'number' ? Math.floor(((caster as any).wis - 10) / 2) : 3);
  const dc = caster?.spellcasting?.spellSaveDc ?? (caster as any)?.spellSaveDc ?? 8 + 3 + wisMod;
  const saveAbility = profile.saveAbility ?? 'DEX';

  return targets.map((target) => {
    const d20Roll = Math.floor(Math.random() * 20) + 1;
    // Default +2 save bonus if monster/token stat block isn't directly attached to SceneToken
    const saveBonus = 2;
    const totalRoll = d20Roll + saveBonus;
    const succeeded = totalRoll >= dc;

    let damageTaken = rolledBaseDamage;
    if (succeeded) {
      damageTaken =
        profile.saveOutcome === 'half_damage' ? Math.floor(rolledBaseDamage / 2) : 0;
    }

    return {
      tokenId: target.id,
      tokenName: target.name,
      saveAbility,
      dc,
      d20Roll,
      saveBonus,
      totalRoll,
      succeeded,
      damageTaken,
    };
  });
}
