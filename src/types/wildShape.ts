import { HudActionItem } from './hud';
import wildShapeRulesJson from '../data/wildShapeRules.json';

export interface WildShapeBeastForm {
  id: string;
  name: string;
  cr: string;
  crNum: number;
  size: 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan';
  sizeMultiplier: number; // 1 for Tiny/Small/Medium (1x1), 2 for Large (2x2), 3 for Huge (3x3), 4 for Gargantuan (4x4)
  avatarUrl: string;
  speed: string;
  walkSpeedFt: number;
  swimSpeedFt?: number;
  climbSpeedFt?: number;
  flySpeedFt?: number;
  burrowSpeedFt?: number;
  senses?: string;
  minLevel: number;
  requiresFly?: boolean;
  tacticalRole?: string;
  baseAc: number; // Beast native AC
  nativeHp: number; // For lore/reference
  stats: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  traits: Array<{ name: string; description: string }>;
  attacks: HudActionItem[];
  description: string;
}

export interface ActiveWildShapeState {
  originalName: string;
  originalAvatarUrl: string;
  originalSize: number;
  originalAc: number;
  originalSpeed: string;
  originalWalkSpeedFt: number;
  beastFormId: string;
  beastName: string;
  tempHpGranted: number;
  startedAt: number;
  durationHours: number;
  canRadiantStrikes: boolean;
}

export interface MoonDruidLevelProgressionEntry {
  level: number;
  maxCR: number;
  maxCRLabel: string;
  knownForms: number;
  uses: number;
  tempHP: number;
  minAC: number;
  flyAllowed: boolean;
  movement: string;
  features: string;
}

export const MOON_DRUID_PROGRESSION_MATRIX: MoonDruidLevelProgressionEntry[] = [
  { level: 2,  maxCR: 0.25, maxCRLabel: '1/4', knownForms: 4, uses: 2, tempHP: 2,  minAC: 17, flyAllowed: false, movement: 'Land, Climb, Swim',    features: 'Base Wild Shape, Wild Companion' },
  { level: 3,  maxCR: 1,    maxCRLabel: '1',   knownForms: 4, uses: 2, tempHP: 9,  minAC: 17, flyAllowed: false, movement: 'Land, Climb, Swim',    features: 'Circle of the Moon: Max CR ⌊Lvl/3⌋, AC 17, 3×Lvl THP' },
  { level: 4,  maxCR: 1,    maxCRLabel: '1',   knownForms: 6, uses: 2, tempHP: 12, minAC: 17, flyAllowed: false, movement: 'Land, Climb, Swim',    features: '+2 Known Forms (ASI / Feat)' },
  { level: 5,  maxCR: 1,    maxCRLabel: '1',   knownForms: 6, uses: 2, tempHP: 15, minAC: 17, flyAllowed: false, movement: 'Land, Climb, Swim',    features: 'Wild Resurgence (convert spell slot ↔ Wild Shape)' },
  { level: 6,  maxCR: 2,    maxCRLabel: '2',   knownForms: 6, uses: 3, tempHP: 18, minAC: 17, flyAllowed: false, movement: 'Land, Climb, Swim',    features: 'Improved Circle Forms: Attacks deal Radiant; +4 to CON saves' },
  { level: 7,  maxCR: 2,    maxCRLabel: '2',   knownForms: 6, uses: 3, tempHP: 21, minAC: 17, flyAllowed: false, movement: 'Land, Climb, Swim',    features: 'Elemental Fury (+1d8 cold/fire/lightning/thunder 1/turn)' },
  { level: 8,  maxCR: 2,    maxCRLabel: '2',   knownForms: 8, uses: 3, tempHP: 24, minAC: 17, flyAllowed: true,  movement: 'Fly Unlocked',         features: 'Fly Speed Available; +2 Known Forms (8 max)' },
  { level: 9,  maxCR: 3,    maxCRLabel: '3',   knownForms: 8, uses: 3, tempHP: 27, minAC: 17, flyAllowed: true,  movement: 'All (Fly/Swim/Burrow)', features: 'CR 3 Forms Unlocked; Mass Cure Wounds prepared' },
  { level: 10, maxCR: 3,    maxCRLabel: '3',   knownForms: 8, uses: 3, tempHP: 30, minAC: 17, flyAllowed: true,  movement: 'All',                  features: 'Moonlight Step (30 ft. bonus action teleport + attack advantage)' },
  { level: 11, maxCR: 3,    maxCRLabel: '3',   knownForms: 8, uses: 3, tempHP: 33, minAC: 17, flyAllowed: true,  movement: 'All',                  features: '6th-level spell casting' },
  { level: 12, maxCR: 4,    maxCRLabel: '4',   knownForms: 8, uses: 3, tempHP: 36, minAC: 17, flyAllowed: true,  movement: 'All',                  features: 'CR 4 Forms Unlocked' },
  { level: 13, maxCR: 4,    maxCRLabel: '4',   knownForms: 8, uses: 3, tempHP: 39, minAC: 17, flyAllowed: true,  movement: 'All',                  features: '7th-level spell casting' },
  { level: 14, maxCR: 4,    maxCRLabel: '4',   knownForms: 8, uses: 3, tempHP: 42, minAC: 17, flyAllowed: true,  movement: 'All',                  features: 'Lunar Form (+2d10 Radiant 1/turn; share Moonlight Step)' },
  { level: 15, maxCR: 5,    maxCRLabel: '5',   knownForms: 8, uses: 3, tempHP: 45, minAC: 17, flyAllowed: true,  movement: 'All',                  features: 'CR 5 Forms Unlocked; Improved Elemental Fury (+2d8)' },
  { level: 16, maxCR: 5,    maxCRLabel: '5',   knownForms: 8, uses: 3, tempHP: 48, minAC: 17, flyAllowed: true,  movement: 'All',                  features: 'Ability Score Improvement / Epic Feat' },
  { level: 17, maxCR: 5,    maxCRLabel: '5',   knownForms: 8, uses: 4, tempHP: 51, minAC: 17, flyAllowed: true,  movement: 'All',                  features: '4 Wild Shape uses per rest; 9th-level spells' },
  { level: 18, maxCR: 6,    maxCRLabel: '6',   knownForms: 8, uses: 4, tempHP: 54, minAC: 17, flyAllowed: true,  movement: 'All',                  features: 'CR 6 Forms Unlocked; Beast Spells (cast nearly all spells in form)' },
  { level: 19, maxCR: 6,    maxCRLabel: '6',   knownForms: 8, uses: 4, tempHP: 57, minAC: 17, flyAllowed: true,  movement: 'All',                  features: 'Epic Boon Feat' },
  { level: 20, maxCR: 6,    maxCRLabel: '6',   knownForms: 8, uses: 4, tempHP: 60, minAC: 17, flyAllowed: true,  movement: 'All',                  features: 'Archdruid (regain 1 Wild Shape when rolling Initiative at 0)' }
];

export function computeMoonDruidProgression(druidLevel: number = 6, wisdomModifier: number = 4) {
  const clampedLevel = Math.max(2, Math.min(20, Math.round(druidLevel || 6)));
  const matrixRow =
    MOON_DRUID_PROGRESSION_MATRIX.find(r => r.level === clampedLevel) ||
    MOON_DRUID_PROGRESSION_MATRIX[4]; // Level 6 fallback

  const maxCR = clampedLevel >= 3 ? Math.floor(clampedLevel / 3) : 0.25;
  const tempHP = clampedLevel >= 3 ? clampedLevel * 3 : 2;
  const minAC = 13 + wisdomModifier;
  const flyAllowed = clampedLevel >= 8;
  const knownFormsLimit = clampedLevel >= 8 ? 8 : clampedLevel >= 4 ? 6 : 4;
  const usesPerRest = clampedLevel >= 17 ? 4 : clampedLevel >= 6 ? 3 : 2;

  return {
    level: clampedLevel,
    maxCR,
    maxCRLabel: maxCR === 0.25 ? '1/4' : String(maxCR),
    knownFormsLimit,
    usesPerRest,
    tempHP,
    minAC,
    flyAllowed,
    movement: matrixRow.movement,
    features: matrixRow.features,
    rulesSchema: wildShapeRulesJson
  };
}

export function isBeastFormEligibleForLevel(
  form: WildShapeBeastForm,
  druidLevel: number = 6
): { eligible: boolean; reason?: string } {
  const prog = computeMoonDruidProgression(druidLevel);
  if (form.requiresFly && !prog.flyAllowed) {
    return { eligible: false, reason: 'Requires Level 8 (Fly Speed)' };
  }
  if (form.crNum > prog.maxCR) {
    return { eligible: false, reason: `Requires Level ${form.minLevel} (CR ${form.cr})` };
  }
  if (druidLevel < form.minLevel) {
    return { eligible: false, reason: `Requires Level ${form.minLevel}` };
  }
  return { eligible: true };
}

export const DEFAULT_GAIAH_KNOWN_FORM_IDS: string[] = [
  'form_dire_wolf',
  'form_brown_bear',
  'form_saber_toothed_tiger',
  'form_giant_constrictor_snake',
  'form_giant_spider',
  'form_giant_badger'
];

const KNOWN_FORMS_STORAGE_KEY = 'mistwalker_gaiah_known_wild_shapes_v1';

export function loadKnownWildShapeFormIds(): string[] {
  if (typeof window === 'undefined') return [...DEFAULT_GAIAH_KNOWN_FORM_IDS];
  try {
    const raw = localStorage.getItem(KNOWN_FORMS_STORAGE_KEY);
    if (!raw) return [...DEFAULT_GAIAH_KNOWN_FORM_IDS];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const valid = parsed.filter(id =>
        typeof id === 'string' && GAIAH_WILD_SHAPE_FORMS.some(f => f.id === id)
      );
      if (valid.length > 0) return valid;
    }
  } catch {
    // Ignore storage error
  }
  return [...DEFAULT_GAIAH_KNOWN_FORM_IDS];
}

export function saveKnownWildShapeFormIds(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KNOWN_FORMS_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Ignore storage error
  }
}

/**
 * Master Beast Form Catalog (All 36 eligible standard 5e / 2024 Beast forms from CR 0 to CR 6)
 */
export const GAIAH_WILD_SHAPE_FORMS: WildShapeBeastForm[] = [
  // ==========================================================
  // G'AIAH'S 6 DEFAULT PREPARED FORMS (WITH CUSTOM TOKEN ART)
  // ==========================================================
  {
    id: 'form_dire_wolf',
    name: 'Dire Wolf',
    cr: '1',
    crNum: 1,
    size: 'Large',
    sizeMultiplier: 2,
    avatarUrl: '/tokens/wildshape/dire_wolf.jpg',
    speed: '50 ft.',
    walkSpeedFt: 50,
    senses: 'Keen Hearing/Smell, Passive Perception 13',
    minLevel: 3,
    tacticalRole: 'Pack Tactics (Advantage near allies); DC 13 STR prone bite',
    baseAc: 14,
    nativeHp: 37,
    stats: { str: 17, dex: 15, con: 15, int: 13, wis: 18, cha: 10 },
    traits: [
      {
        name: 'Pack Tactics',
        description: 'You have advantage on attack rolls against a creature if at least one of your allies is within 5 feet of the creature and the ally isn’t incapacitated.'
      },
      {
        name: 'Keen Hearing and Smell',
        description: 'You have advantage on Wisdom (Perception) checks that rely on hearing or smell.'
      }
    ],
    attacks: [
      {
        id: 'ws-direwolf-bite',
        name: 'Dire Wolf Bite',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Dire Wolf)',
        hitBonus: '+5',
        damageFormula: '2d6 + 3',
        damageType: 'piercing',
        rangeFt: 5,
        jb2aAssetId: 'attack_bite',
        description: 'Melee Attack: +5 to hit, reach 5 ft. Hit: 2d6 + 3 piercing or radiant damage. Target must succeed on a DC 13 Strength saving throw or be knocked prone.'
      }
    ],
    description: 'A swift, pack-hunting apex predator with devastating knockdown bites and 50 ft. movement.'
  },
  {
    id: 'form_brown_bear',
    name: 'Brown Bear',
    cr: '1',
    crNum: 1,
    size: 'Large',
    sizeMultiplier: 2,
    avatarUrl: '/tokens/wildshape/brown_bear.jpg',
    speed: '40 ft., climb 30 ft.',
    walkSpeedFt: 40,
    climbSpeedFt: 30,
    senses: 'Keen Smell, Passive Perception 13',
    minLevel: 3,
    tacticalRole: 'High-damage Multiattack brawler',
    baseAc: 11,
    nativeHp: 34,
    stats: { str: 19, dex: 10, con: 16, int: 13, wis: 18, cha: 10 },
    traits: [
      {
        name: 'Keen Smell',
        description: 'You have advantage on Wisdom (Perception) checks that rely on smell.'
      },
      {
        name: 'Climber',
        description: 'You have a climbing speed of 30 ft. allowing vertical mobility without extra movement penalty.'
      }
    ],
    attacks: [
      {
        id: 'ws-bear-bite',
        name: 'Bear Bite',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Multiattack 1/2)',
        hitBonus: '+5',
        damageFormula: '1d8 + 4',
        damageType: 'piercing',
        rangeFt: 5,
        jb2aAssetId: 'attack_bite',
        description: 'Melee Attack: +5 to hit, reach 5 ft. Hit: 1d8 + 4 piercing or radiant damage.'
      },
      {
        id: 'ws-bear-claws',
        name: 'Bear Claws',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Multiattack 2/2)',
        hitBonus: '+5',
        damageFormula: '2d6 + 4',
        damageType: 'slashing',
        rangeFt: 5,
        jb2aAssetId: 'attack_claw',
        description: 'Melee Attack: +5 to hit, reach 5 ft. Hit: 2d6 + 4 slashing or radiant damage.'
      }
    ],
    description: 'A hulking frontline brawler capable of multiattacking with bone-crushing claws and jaws.'
  },
  {
    id: 'form_saber_toothed_tiger',
    name: 'Saber-Toothed Tiger',
    cr: '2',
    crNum: 2,
    size: 'Large',
    sizeMultiplier: 2,
    avatarUrl: '/tokens/wildshape/saber_toothed_tiger.jpg',
    speed: '40 ft.',
    walkSpeedFt: 40,
    senses: 'Keen Smell, Passive Perception 13',
    minLevel: 6,
    tacticalRole: 'Pounce; bonus-action bite against prone targets; heavy burst',
    baseAc: 12,
    nativeHp: 52,
    stats: { str: 18, dex: 14, con: 15, int: 13, wis: 18, cha: 10 },
    traits: [
      {
        name: 'Keen Smell',
        description: 'Advantage on Wisdom (Perception) checks that rely on smell.'
      },
      {
        name: 'Pounce',
        description: 'If you move at least 20 ft. straight toward a creature and hit with a claw attack on the same turn, target must succeed on a DC 14 STR save or be knocked prone. If prone, you can make one bite attack as a bonus action.'
      }
    ],
    attacks: [
      {
        id: 'ws-tiger-claws',
        name: 'Tiger Claws (Pounce)',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Saber-Toothed Tiger)',
        hitBonus: '+6',
        damageFormula: '2d6 + 5',
        damageType: 'slashing',
        rangeFt: 5,
        jb2aAssetId: 'attack_claw',
        description: 'Melee Attack: +6 to hit, reach 5 ft. Hit: 2d6 + 5 slashing or radiant damage. Triggers Pounce DC 14 STR prone check if moved 20+ ft.'
      },
      {
        id: 'ws-tiger-bite',
        name: 'Tiger Bite',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Saber-Toothed Tiger)',
        hitBonus: '+6',
        damageFormula: '1d10 + 5',
        damageType: 'piercing',
        rangeFt: 5,
        jb2aAssetId: 'attack_bite',
        description: 'Melee Attack: +6 to hit, reach 5 ft. Hit: 1d10 + 5 piercing or radiant damage.'
      }
    ],
    description: 'An aggressive ambush predator with massive fangs and high-impact Pounce knockdown.'
  },
  {
    id: 'form_giant_constrictor_snake',
    name: 'Giant Constrictor Snake',
    cr: '2',
    crNum: 2,
    size: 'Huge',
    sizeMultiplier: 3,
    avatarUrl: '/tokens/wildshape/giant_constrictor_snake.jpg',
    speed: '30 ft., swim 30 ft.',
    walkSpeedFt: 30,
    swimSpeedFt: 30,
    senses: 'Blindsight 10 ft.',
    minLevel: 6,
    tacticalRole: 'Huge map presence; auto-restrain on hit (DC 14 escape)',
    baseAc: 12,
    nativeHp: 60,
    stats: { str: 19, dex: 14, con: 12, int: 13, wis: 18, cha: 10 },
    traits: [
      {
        name: 'Blindsight 10 ft.',
        description: 'You can perceive your surroundings within 10 ft. without relying on sight.'
      },
      {
        name: 'Amphibious Swimmer',
        description: 'Possesses a 30 ft. swim speed for aquatic operations and water combat.'
      }
    ],
    attacks: [
      {
        id: 'ws-snake-bite',
        name: 'Constrictor Bite',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Giant Snake)',
        hitBonus: '+6',
        damageFormula: '2d6 + 4',
        damageType: 'piercing',
        rangeFt: 10,
        jb2aAssetId: 'attack_bite',
        description: 'Melee Attack: +6 to hit, reach 10 ft. Hit: 2d6 + 4 piercing or radiant damage.'
      },
      {
        id: 'ws-snake-constrict',
        name: 'Constrict & Restrain',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Giant Snake)',
        hitBonus: '+6',
        damageFormula: '2d8 + 4',
        damageType: 'bludgeoning',
        rangeFt: 5,
        jb2aAssetId: 'entangle',
        description: 'Melee Attack: +6 to hit, reach 5 ft. Hit: 2d8 + 4 bludgeoning or radiant damage, and the target is grappled (escape DC 14) and restrained!'
      }
    ],
    description: 'A colossal 3x3 battlefield controller that automatically binds, crushes, and restrains enemy targets.'
  },
  {
    id: 'form_giant_spider',
    name: 'Giant Spider',
    cr: '1',
    crNum: 1,
    size: 'Large',
    sizeMultiplier: 2,
    avatarUrl: '/tokens/wildshape/giant_spider.jpg',
    speed: '30 ft., climb 30 ft.',
    walkSpeedFt: 30,
    climbSpeedFt: 30,
    senses: 'Blindsight 10 ft., Darkvision 60 ft.',
    minLevel: 3,
    tacticalRole: 'Spider Climb; Web Sense; ranged Web recharge restrain',
    baseAc: 14,
    nativeHp: 26,
    stats: { str: 14, dex: 16, con: 12, int: 13, wis: 18, cha: 10 },
    traits: [
      {
        name: 'Spider Climb',
        description: 'You can climb difficult surfaces, including upside down on ceilings, without needing an ability check.'
      },
      {
        name: 'Web Sense & Walker',
        description: 'You ignore movement restrictions from webs and know the location of creatures touching the same web.'
      }
    ],
    attacks: [
      {
        id: 'ws-spider-bite',
        name: 'Venomous Bite',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Giant Spider)',
        hitBonus: '+5',
        damageFormula: '1d8 + 3',
        damageType: 'piercing',
        rangeFt: 5,
        jb2aAssetId: 'attack_bite',
        description: 'Melee Attack: +5 to hit, reach 5 ft. Hit: 1d8 + 3 piercing + 2d8 poison damage (DC 11 CON save for half).'
      },
      {
        id: 'ws-spider-web',
        name: 'Web Restraint',
        category: 'attacks',
        type: 'action',
        subCategory: 'special',
        isAttack: true,
        sourceLabel: 'Wild Shape (Recharge 5-6)',
        hitBonus: '+5',
        damageFormula: '0',
        rangeFt: 60,
        jb2aAssetId: 'entangle',
        description: 'Ranged Weapon Attack: +5 to hit, range 30/60 ft. Target is restrained by webbing (DC 12 STR check to escape).'
      }
    ],
    description: 'An agile 3D infiltrator capable of wall and ceiling scaling with ranged webbing.'
  },
  {
    id: 'form_giant_badger',
    name: 'Giant Badger',
    cr: '1/4',
    crNum: 0.25,
    size: 'Medium',
    sizeMultiplier: 1,
    avatarUrl: '/tokens/wildshape/giant_badger.jpg',
    speed: '30 ft., burrow 10 ft., climb 10 ft.',
    walkSpeedFt: 30,
    burrowSpeedFt: 10,
    climbSpeedFt: 10,
    senses: 'Darkvision 30 ft., Keen Smell',
    minLevel: 2,
    tacticalRole: 'Keen Smell; subterranean bypass behind locked walls',
    baseAc: 10,
    nativeHp: 13,
    stats: { str: 13, dex: 10, con: 15, int: 13, wis: 18, cha: 10 },
    traits: [
      {
        name: 'Keen Smell',
        description: 'Advantage on Wisdom (Perception) checks that rely on smell.'
      },
      {
        name: 'Burrower (10 ft.)',
        description: 'Can dig through earth and sand at 10 ft. speed, allowing underground flanking and traversal.'
      }
    ],
    attacks: [
      {
        id: 'ws-badger-multiattack',
        name: 'Badger Bite & Claws',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Giant Badger)',
        hitBonus: '+3',
        damageFormula: '1d6 + 1',
        damageType: 'piercing',
        rangeFt: 5,
        jb2aAssetId: 'attack_claw',
        description: 'Multiattack: One bite (1d6+1 piercing) and one claw attack (2d4+1 slashing or radiant).'
      }
    ],
    description: 'Medium scout form capable of burrowing underground and digging tunnels.'
  },

  // ==========================================================
  // CR 0 BEAST FORMS
  // ==========================================================
  {
    id: 'form_spider',
    name: 'Spider',
    cr: '0',
    crNum: 0,
    size: 'Tiny',
    sizeMultiplier: 1,
    avatarUrl: '/tokens/wildshape/giant_spider.jpg',
    speed: '20 ft., climb 20 ft.',
    walkSpeedFt: 20,
    climbSpeedFt: 20,
    senses: 'Darkvision 30 ft.',
    minLevel: 2,
    tacticalRole: 'Spider Climb; stealth infiltrator; fits through keyholes',
    baseAc: 12,
    nativeHp: 1,
    stats: { str: 2, dex: 14, con: 8, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Spider Climb', description: 'Climb difficult surfaces, including upside down on ceilings, without an ability check.' },
      { name: 'Tiny Keyhole Infiltrator', description: 'Fits through 1-inch cracks, under doors, and through keyholes unnoticed.' }
    ],
    attacks: [
      {
        id: 'ws-tiny-spider-bite',
        name: 'Venomous Pinprick',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Spider)',
        hitBonus: '+4',
        damageFormula: '1 + 1d4',
        damageType: 'piercing',
        rangeFt: 5,
        jb2aAssetId: 'attack_bite',
        description: 'Melee Attack: +4 to hit, reach 5 ft. Hit: 1 piercing + 1d4 poison damage.'
      }
    ],
    description: 'Tiny stealth infiltrator capable of slipping through keyholes and scaling ceilings.'
  },
  {
    id: 'form_rat',
    name: 'Rat',
    cr: '0',
    crNum: 0,
    size: 'Tiny',
    sizeMultiplier: 1,
    avatarUrl: 'https://www.dndbeyond.com/avatars/43939/81/638607414147450285.png',
    speed: '20 ft., climb 20 ft.',
    walkSpeedFt: 20,
    climbSpeedFt: 20,
    senses: 'Darkvision 30 ft.',
    minLevel: 2,
    tacticalRole: 'Keen Smell; urban infiltration; ignores suspicion',
    baseAc: 10,
    nativeHp: 1,
    stats: { str: 2, dex: 11, con: 9, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Keen Smell', description: 'Advantage on Wisdom (Perception) checks that rely on smell.' },
      { name: 'Urban Infiltrator', description: 'Blends seamlessly into dungeons, cellars, and city streets without drawing alarm.' }
    ],
    attacks: [
      {
        id: 'ws-rat-bite',
        name: 'Rat Bite',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Rat)',
        hitBonus: '+2',
        damageFormula: '1',
        damageType: 'piercing',
        rangeFt: 5,
        jb2aAssetId: 'attack_bite',
        description: 'Melee Attack: +2 to hit, reach 5 ft. Hit: 1 piercing damage.'
      }
    ],
    description: 'Tiny urban scout with Keen Smell and Darkvision that moves through dungeons without raising suspicion.'
  },
  {
    id: 'form_octopus',
    name: 'Octopus',
    cr: '0',
    crNum: 0,
    size: 'Small',
    sizeMultiplier: 1,
    avatarUrl: 'https://www.dndbeyond.com/avatars/30783/698/638062015886859442.png',
    speed: '5 ft., swim 30 ft.',
    walkSpeedFt: 5,
    swimSpeedFt: 30,
    senses: 'Darkvision 30 ft.',
    minLevel: 2,
    tacticalRole: 'Underwater camouflage; Ink Cloud escape',
    baseAc: 12,
    nativeHp: 3,
    stats: { str: 4, dex: 15, con: 11, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Underwater Camouflage', description: 'Advantage on Dexterity (Stealth) checks made while underwater.' },
      { name: 'Ink Cloud (1/Rest)', description: 'A 5-foot-radius cloud of ink extends all around the octopus if it is underwater. The area is heavily obscured for 1 minute, and the octopus can Dash as a bonus action.' }
    ],
    attacks: [
      {
        id: 'ws-octopus-tentacles',
        name: 'Tentacles',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Octopus)',
        hitBonus: '+4',
        damageFormula: '1',
        damageType: 'bludgeoning',
        rangeFt: 5,
        jb2aAssetId: 'entangle',
        description: 'Melee Attack: +4 to hit, reach 5 ft. Hit: 1 bludgeoning damage, and the target is grappled (escape DC 10).'
      }
    ],
    description: 'Small aquatic scout with underwater camouflage and an Ink Cloud smokescreen escape.'
  },
  {
    id: 'form_owl',
    name: 'Owl',
    cr: '0',
    crNum: 0,
    size: 'Tiny',
    sizeMultiplier: 1,
    avatarUrl: 'https://www.dndbeyond.com/avatars/47158/951/638742837731128628.png',
    speed: '5 ft., fly 60 ft.',
    walkSpeedFt: 5,
    flySpeedFt: 60,
    senses: 'Darkvision 120 ft.',
    minLevel: 8,
    requiresFly: true,
    tacticalRole: 'Flyby (no opportunity attacks); supreme night scout',
    baseAc: 11,
    nativeHp: 1,
    stats: { str: 3, dex: 13, con: 8, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Flyby', description: 'Does not provoke opportunity attacks when flying out of an enemy’s reach.' },
      { name: 'Keen Hearing and Sight', description: 'Advantage on Wisdom (Perception) checks that rely on hearing or sight (120 ft. Darkvision).' }
    ],
    attacks: [
      {
        id: 'ws-owl-talons',
        name: 'Talons',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Owl)',
        hitBonus: '+3',
        damageFormula: '1',
        damageType: 'slashing',
        rangeFt: 5,
        jb2aAssetId: 'attack_claw',
        description: 'Melee Attack: +3 to hit, reach 5 ft. Hit: 1 slashing damage.'
      }
    ],
    description: 'Supreme nocturnal aerial scout with 120 ft. Darkvision and Flyby.'
  },

  // ==========================================================
  // CR 1/4 BEAST FORMS
  // ==========================================================
  {
    id: 'form_wolf',
    name: 'Wolf',
    cr: '1/4',
    crNum: 0.25,
    size: 'Medium',
    sizeMultiplier: 1,
    avatarUrl: 'https://www.dndbeyond.com/avatars/43939/948/638607435568755201.png',
    speed: '40 ft.',
    walkSpeedFt: 40,
    senses: 'Keen Hearing and Smell',
    minLevel: 2,
    tacticalRole: 'Pack Tactics; DC 11 STR bite to knock prone',
    baseAc: 13,
    nativeHp: 11,
    stats: { str: 12, dex: 15, con: 12, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Pack Tactics', description: 'Advantage on attack rolls if an ally is within 5 ft. of the target.' },
      { name: 'Keen Hearing and Smell', description: 'Advantage on Perception checks relying on hearing or smell.' }
    ],
    attacks: [
      {
        id: 'ws-wolf-bite',
        name: 'Wolf Bite',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Wolf)',
        hitBonus: '+4',
        damageFormula: '2d4 + 2',
        damageType: 'piercing',
        rangeFt: 5,
        jb2aAssetId: 'attack_bite',
        description: 'Melee Attack: +4 to hit, reach 5 ft. Hit: 2d4 + 2 piercing damage. Target must succeed on a DC 11 STR save or be knocked prone.'
      }
    ],
    description: 'Medium pack hunter with 40 ft. speed, Pack Tactics, and knockdown bites.'
  },
  {
    id: 'form_constrictor_snake',
    name: 'Constrictor Snake',
    cr: '1/4',
    crNum: 0.25,
    size: 'Large',
    sizeMultiplier: 2,
    avatarUrl: '/tokens/wildshape/giant_constrictor_snake.jpg',
    speed: '30 ft., swim 30 ft.',
    walkSpeedFt: 30,
    swimSpeedFt: 30,
    senses: 'Blindsight 10 ft.',
    minLevel: 2,
    tacticalRole: 'Large controller; auto-grapple/restrain on hit',
    baseAc: 12,
    nativeHp: 13,
    stats: { str: 15, dex: 14, con: 12, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Blindsight 10 ft.', description: 'Perceive surroundings within 10 ft. without sight.' }
    ],
    attacks: [
      {
        id: 'ws-csnake-constrict',
        name: 'Constrict',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Constrictor Snake)',
        hitBonus: '+4',
        damageFormula: '1d8 + 2',
        damageType: 'bludgeoning',
        rangeFt: 5,
        jb2aAssetId: 'entangle',
        description: 'Melee Attack: +4 to hit, reach 5 ft. Hit: 1d8 + 2 bludgeoning damage, and target is grappled (escape DC 12) and restrained.'
      }
    ],
    description: 'Large amphibious controller that automatically grapples and restrains on hit.'
  },
  {
    id: 'form_boar',
    name: 'Boar',
    cr: '1/4',
    crNum: 0.25,
    size: 'Medium',
    sizeMultiplier: 1,
    avatarUrl: 'https://www.dndbeyond.com/avatars/43939/899/638607434272563738.png',
    speed: '40 ft.',
    walkSpeedFt: 40,
    senses: 'Passive Perception 9',
    minLevel: 2,
    tacticalRole: 'Charge (extra damage + prone); Relentless (drops to 1 HP)',
    baseAc: 11,
    nativeHp: 11,
    stats: { str: 13, dex: 11, con: 12, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Charge', description: 'Move at least 20 ft. straight toward a target to deal +1d6 slashing damage and force a DC 11 STR save vs. prone.' },
      { name: 'Relentless (1/Rest)', description: 'If reduced to 0 HP by 7 damage or less, drop to 1 HP instead.' }
    ],
    attacks: [
      {
        id: 'ws-boar-tusk',
        name: 'Tusk Charge',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Boar)',
        hitBonus: '+3',
        damageFormula: '1d6 + 1',
        damageType: 'slashing',
        rangeFt: 5,
        jb2aAssetId: 'attack_bite',
        description: 'Melee Attack: +3 to hit, reach 5 ft. Hit: 1d6 + 1 slashing (+1d6 and DC 11 STR prone on 20 ft. Charge).'
      }
    ],
    description: 'Fierce charging striker with Relentless durability and knockdown tusks.'
  },
  {
    id: 'form_giant_bat',
    name: 'Giant Bat',
    cr: '1/4',
    crNum: 0.25,
    size: 'Large',
    sizeMultiplier: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/47158/985/638742838863997460.png',
    speed: '10 ft., fly 60 ft.',
    walkSpeedFt: 10,
    flySpeedFt: 60,
    senses: 'Blindsight 60 ft.',
    minLevel: 8,
    requiresFly: true,
    tacticalRole: 'Echolocation; immune to darkness/invisibility; mount',
    baseAc: 13,
    nativeHp: 22,
    stats: { str: 15, dex: 16, con: 11, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Echolocation (Blindsight 60 ft.)', description: 'Perceive invisible creatures and see through magical darkness within 60 ft.' },
      { name: 'Keen Hearing', description: 'Advantage on Wisdom (Perception) checks that rely on hearing.' }
    ],
    attacks: [
      {
        id: 'ws-giant-bat-bite',
        name: 'Bat Bite',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Giant Bat)',
        hitBonus: '+4',
        damageFormula: '1d6 + 2',
        damageType: 'piercing',
        rangeFt: 5,
        jb2aAssetId: 'attack_bite',
        description: 'Melee Attack: +4 to hit, reach 5 ft. Hit: 1d6 + 2 piercing damage.'
      }
    ],
    description: 'Large winged mount with 60 ft. Blindsight echolocation that counters darkness and invisibility.'
  },
  {
    id: 'form_giant_owl',
    name: 'Giant Owl',
    cr: '1/4',
    crNum: 0.25,
    size: 'Large',
    sizeMultiplier: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/16/535/636376331788287090.jpeg',
    speed: '5 ft., fly 60 ft.',
    walkSpeedFt: 5,
    flySpeedFt: 60,
    senses: 'Darkvision 120 ft.',
    minLevel: 8,
    requiresFly: true,
    tacticalRole: 'Flyby; large stealth aerial mount; understands Elvish',
    baseAc: 12,
    nativeHp: 19,
    stats: { str: 13, dex: 15, con: 12, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Flyby', description: 'Does not provoke opportunity attacks when flying out of an enemy’s reach.' },
      { name: 'Keen Hearing and Sight', description: 'Advantage on Perception checks relying on hearing or sight (120 ft. Darkvision).' }
    ],
    attacks: [
      {
        id: 'ws-giant-owl-talons',
        name: 'Giant Talons',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Giant Owl)',
        hitBonus: '+3',
        damageFormula: '2d6 + 1',
        damageType: 'slashing',
        rangeFt: 5,
        jb2aAssetId: 'attack_claw',
        description: 'Melee Attack: +3 to hit, reach 5 ft. Hit: 2d6 + 1 slashing damage.'
      }
    ],
    description: 'Large stealth aerial mount with 120 ft. Darkvision and Flyby mobility.'
  },

  // ==========================================================
  // CR 1/2 BEAST FORMS
  // ==========================================================
  {
    id: 'form_ape',
    name: 'Ape',
    cr: '1/2',
    crNum: 0.5,
    size: 'Medium',
    sizeMultiplier: 1,
    avatarUrl: '/tokens/wildshape/brown_bear.jpg',
    speed: '30 ft., climb 30 ft.',
    walkSpeedFt: 30,
    climbSpeedFt: 30,
    senses: 'Passive Perception 13',
    minLevel: 3,
    tacticalRole: 'Athletics brawler; possesses hands; ranged rock attack',
    baseAc: 12,
    nativeHp: 19,
    stats: { str: 16, dex: 14, con: 14, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Dexterous Hands', description: 'Possesses opposable thumbs and hands to open doors, pull levers, carry items, and hurl rocks.' },
      { name: 'Multiattack', description: 'Makes two Fist attacks per Attack action.' }
    ],
    attacks: [
      {
        id: 'ws-ape-fist',
        name: 'Ape Fist (Multiattack x2)',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Ape)',
        hitBonus: '+5',
        damageFormula: '1d6 + 3',
        damageType: 'bludgeoning',
        rangeFt: 5,
        jb2aAssetId: 'attack_claw',
        description: 'Melee Attack (2x per turn): +5 to hit, reach 5 ft. Hit: 1d6 + 3 bludgeoning or radiant damage.'
      },
      {
        id: 'ws-ape-rock',
        name: 'Hurled Rock',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Ape)',
        hitBonus: '+5',
        damageFormula: '1d6 + 3',
        damageType: 'bludgeoning',
        rangeFt: 50,
        jb2aAssetId: 'attack_claw',
        description: 'Ranged Weapon Attack: +5 to hit, range 25/50 ft. Hit: 1d6 + 3 bludgeoning damage.'
      }
    ],
    description: 'Agile climber and brawler with opposable thumbs for manipulating objects and throwing rocks.'
  },
  {
    id: 'form_black_bear',
    name: 'Black Bear',
    cr: '1/2',
    crNum: 0.5,
    size: 'Medium',
    sizeMultiplier: 1,
    avatarUrl: '/tokens/wildshape/brown_bear.jpg',
    speed: '40 ft., climb 30 ft., swim 30 ft.',
    walkSpeedFt: 40,
    climbSpeedFt: 30,
    swimSpeedFt: 30,
    senses: 'Keen Smell',
    minLevel: 3,
    tacticalRole: 'Early Multiattack (Bite + Claws) in Medium 1x1 size',
    baseAc: 11,
    nativeHp: 19,
    stats: { str: 15, dex: 10, con: 14, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'All-Terrain Mobility', description: 'Medium 1x1 size fits tight dungeon corridors with 40 ft. walk, 30 ft. climb, and 30 ft. swim.' }
    ],
    attacks: [
      {
        id: 'ws-blackbear-multi',
        name: 'Black Bear Bite & Claws',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Black Bear)',
        hitBonus: '+4',
        damageFormula: '2d4 + 2',
        damageType: 'slashing',
        rangeFt: 5,
        jb2aAssetId: 'attack_claw',
        description: 'Multiattack: Bite (1d6+2 piercing) and Claws (2d4+2 slashing).'
      }
    ],
    description: 'Medium all-terrain bear with climb and swim speeds that fits through narrow 5 ft. hallways.'
  },
  {
    id: 'form_crocodile',
    name: 'Crocodile',
    cr: '1/2',
    crNum: 0.5,
    size: 'Large',
    sizeMultiplier: 2,
    avatarUrl: '/tokens/wildshape/giant_constrictor_snake.jpg',
    speed: '20 ft., swim 30 ft.',
    walkSpeedFt: 20,
    swimSpeedFt: 30,
    senses: 'Hold Breath (15 min)',
    minLevel: 3,
    tacticalRole: 'Hold Breath; auto-grapple and restrain on bite',
    baseAc: 12,
    nativeHp: 19,
    stats: { str: 15, dex: 10, con: 13, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Hold Breath', description: 'Can hold its breath underwater for up to 15 minutes.' }
    ],
    attacks: [
      {
        id: 'ws-croc-bite',
        name: 'Death Roll Bite',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Crocodile)',
        hitBonus: '+4',
        damageFormula: '1d10 + 2',
        damageType: 'piercing',
        rangeFt: 5,
        jb2aAssetId: 'attack_bite',
        description: 'Melee Attack: +4 to hit, reach 5 ft. Hit: 1d10 + 2 piercing damage, and target is grappled (escape DC 12) and restrained.'
      }
    ],
    description: 'Aquatic ambush predator that clamps onto targets, automatically grappling and restraining them.'
  },
  {
    id: 'form_warhorse',
    name: 'Warhorse',
    cr: '1/2',
    crNum: 0.5,
    size: 'Large',
    sizeMultiplier: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/43939/915/638607434779874338.png',
    speed: '60 ft.',
    walkSpeedFt: 60,
    senses: 'Passive Perception 11',
    minLevel: 3,
    tacticalRole: '60 ft. sprint speed; trampling charge knockdown',
    baseAc: 11,
    nativeHp: 19,
    stats: { str: 18, dex: 12, con: 13, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Trampling Charge', description: 'Move at least 20 ft. straight toward a creature and hit with Hooves to force a DC 14 STR save vs. prone. If prone, make another Hooves attack as a bonus action.' }
    ],
    attacks: [
      {
        id: 'ws-warhorse-hooves',
        name: 'Trampling Hooves',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Warhorse)',
        hitBonus: '+6',
        damageFormula: '2d6 + 4',
        damageType: 'bludgeoning',
        rangeFt: 5,
        jb2aAssetId: 'attack_claw',
        description: 'Melee Attack: +6 to hit, reach 5 ft. Hit: 2d6 + 4 bludgeoning damage (triggers Trampling Charge DC 14 STR prone).'
      }
    ],
    description: 'High-velocity 60 ft. charger and party mount with bonus-action trampling hooves.'
  },
  {
    id: 'form_giant_wasp',
    name: 'Giant Wasp',
    cr: '1/2',
    crNum: 0.5,
    size: 'Medium',
    sizeMultiplier: 1,
    avatarUrl: '/tokens/wildshape/giant_spider.jpg',
    speed: '10 ft., fly 50 ft.',
    walkSpeedFt: 10,
    flySpeedFt: 50,
    senses: 'Passive Perception 10',
    minLevel: 8,
    requiresFly: true,
    tacticalRole: 'High flight mobility; sting poison with paralysis risk',
    baseAc: 12,
    nativeHp: 13,
    stats: { str: 10, dex: 14, con: 10, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Paralyzing Venom', description: 'Creatures reduced to 0 HP by Sting poison are stable but poisoned and paralyzed for 1 hour.' }
    ],
    attacks: [
      {
        id: 'ws-wasp-sting',
        name: 'Venomous Sting',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Giant Wasp)',
        hitBonus: '+4',
        damageFormula: '1d6 + 2',
        damageType: 'piercing',
        rangeFt: 5,
        jb2aAssetId: 'attack_bite',
        description: 'Melee Attack: +4 to hit, reach 5 ft. Hit: 1d6 + 2 piercing + 3d6 poison (DC 11 CON save for half).'
      }
    ],
    description: 'Fast 50 ft. aerial striker whose venomous sting can paralyze weakened targets.'
  },

  // ==========================================================
  // ADDITIONAL CR 1 BEAST FORMS
  // ==========================================================
  {
    id: 'form_giant_toad',
    name: 'Giant Toad',
    cr: '1',
    crNum: 1,
    size: 'Large',
    sizeMultiplier: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/30783/698/638062015886859442.png',
    speed: '20 ft., swim 40 ft.',
    walkSpeedFt: 20,
    swimSpeedFt: 40,
    senses: 'Darkvision 30 ft.',
    minLevel: 3,
    tacticalRole: 'Standing Leap; bite grapple; Swallow Whole mechanic',
    baseAc: 11,
    nativeHp: 39,
    stats: { str: 15, dex: 13, con: 13, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Standing Leap', description: 'Long jump up to 20 ft. and high jump up to 10 ft., with or without a running start.' },
      { name: 'Swallow Whole', description: 'Bite a Medium or smaller grappled target to swallow it (blinded, restrained, total cover, 3d6 acid damage at start of each turn).' }
    ],
    attacks: [
      {
        id: 'ws-toad-bite',
        name: 'Engulfing Bite & Swallow',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Giant Toad)',
        hitBonus: '+4',
        damageFormula: '1d10 + 2',
        damageType: 'piercing',
        rangeFt: 5,
        jb2aAssetId: 'attack_bite',
        description: 'Melee Attack: +4 to hit, reach 5 ft. Hit: 1d10 + 2 piercing + 1d10 poison, and target is grappled (escape DC 13) and restrained.'
      }
    ],
    description: 'Amphibious controller capable of leaping 20 ft. and swallowing Medium or smaller enemies whole.'
  },
  {
    id: 'form_giant_hyena',
    name: 'Giant Hyena',
    cr: '1',
    crNum: 1,
    size: 'Large',
    sizeMultiplier: 2,
    avatarUrl: '/tokens/wildshape/dire_wolf.jpg',
    speed: '50 ft.',
    walkSpeedFt: 50,
    senses: 'Passive Perception 13',
    minLevel: 3,
    tacticalRole: 'Rampage (bonus action move + bite when reducing to 0 HP)',
    baseAc: 12,
    nativeHp: 45,
    stats: { str: 16, dex: 14, con: 14, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Rampage', description: 'When you reduce a creature to 0 HP with a melee attack on your turn, you can take a bonus action to move up to half your speed and make a bite attack.' }
    ],
    attacks: [
      {
        id: 'ws-hyena-bite',
        name: 'Crushing Jaws',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Giant Hyena)',
        hitBonus: '+5',
        damageFormula: '2d6 + 3',
        damageType: 'piercing',
        rangeFt: 5,
        jb2aAssetId: 'attack_bite',
        description: 'Melee Attack: +5 to hit, reach 5 ft. Hit: 2d6 + 3 piercing or radiant damage. Triggers Rampage on takedown!'
      }
    ],
    description: 'Relentless 50 ft. pack skirmisher that chains bonus-action movement and bites on takedowns.'
  },
  {
    id: 'form_giant_octopus',
    name: 'Giant Octopus',
    cr: '1',
    crNum: 1,
    size: 'Large',
    sizeMultiplier: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/30783/698/638062015886859442.png',
    speed: '10 ft., swim 60 ft.',
    walkSpeedFt: 10,
    swimSpeedFt: 60,
    senses: 'Darkvision 60 ft.',
    minLevel: 3,
    tacticalRole: '15 ft. reach grapple tentacle; 20 ft. radius Ink Cloud',
    baseAc: 11,
    nativeHp: 52,
    stats: { str: 17, dex: 13, con: 13, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Hold Breath (1 Hour)', description: 'Out of water, the octopus can hold its breath for 1 hour.' },
      { name: 'Ink Cloud (1/Rest)', description: '20-foot-radius cloud heavily obscures underwater area for 1 minute; can Dash as a bonus action.' }
    ],
    attacks: [
      {
        id: 'ws-giant-octopus-tentacles',
        name: 'Reach Tentacles (15 ft.)',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Giant Octopus)',
        hitBonus: '+5',
        damageFormula: '2d6 + 3',
        damageType: 'bludgeoning',
        rangeFt: 15,
        jb2aAssetId: 'entangle',
        description: 'Melee Attack: +5 to hit, reach 15 ft. Hit: 2d6 + 3 bludgeoning damage, and target is grappled (escape DC 16) and restrained.'
      }
    ],
    description: 'Long-reach 15 ft. tentacle grappler with a 60 ft. swim speed and 1-hour breath retention on land.'
  },
  {
    id: 'form_deinonychus',
    name: 'Deinonychus',
    cr: '1',
    crNum: 1,
    size: 'Medium',
    sizeMultiplier: 1,
    avatarUrl: '/tokens/wildshape/saber_toothed_tiger.jpg',
    speed: '40 ft.',
    walkSpeedFt: 40,
    senses: 'Passive Perception 12',
    minLevel: 3,
    tacticalRole: 'Pounce knockdown; 3-attack multiattack routine',
    baseAc: 13,
    nativeHp: 26,
    stats: { str: 15, dex: 15, con: 14, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Multiattack (3 Strikes)', description: 'Makes three attacks: one Bite and two Claws.' },
      { name: 'Pounce', description: 'Move 20+ ft. straight toward a target and hit with a claw to force a DC 12 STR save vs. prone, granting a bonus-action Bite.' }
    ],
    attacks: [
      {
        id: 'ws-deinonychus-multi',
        name: 'Raptor Talons & Bite (3x)',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Deinonychus)',
        hitBonus: '+4',
        damageFormula: '1d8 + 2',
        damageType: 'piercing',
        rangeFt: 5,
        jb2aAssetId: 'attack_claw',
        description: 'Multiattack (1 Bite + 2 Claws): +4 to hit, reach 5 ft. Hit: 1d8 + 2 piercing/slashing each (up to 4 attacks with Pounce).'
      }
    ],
    description: 'Ferocious Medium raptor with a 3-attack Multiattack routine and Pounce bonus-action bite.'
  },
  {
    id: 'form_giant_eagle',
    name: 'Giant Eagle',
    cr: '1',
    crNum: 1,
    size: 'Large',
    sizeMultiplier: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/16/535/636376331788287090.jpeg',
    speed: '10 ft., fly 80 ft.',
    walkSpeedFt: 10,
    flySpeedFt: 80,
    senses: 'Keen Sight',
    minLevel: 8,
    requiresFly: true,
    tacticalRole: 'Large aerial mount; 80 ft. fly speed; Multiattack',
    baseAc: 13,
    nativeHp: 26,
    stats: { str: 16, dex: 17, con: 13, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Keen Sight', description: 'Advantage on Wisdom (Perception) checks that rely on sight.' },
      { name: 'Multiattack', description: 'Makes two attacks: one with Beak and one with Talons.' }
    ],
    attacks: [
      {
        id: 'ws-eagle-talons',
        name: 'Eagle Talons & Beak',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Giant Eagle)',
        hitBonus: '+5',
        damageFormula: '2d6 + 3',
        damageType: 'slashing',
        rangeFt: 5,
        jb2aAssetId: 'attack_claw',
        description: 'Multiattack: Talons (2d6+3 slashing) and Beak (1d6+3 piercing).'
      }
    ],
    description: 'Majestic Large aerial mount and striker with a blistering 80 ft. flying speed.'
  },
  {
    id: 'form_giant_vulture',
    name: 'Giant Vulture',
    cr: '1',
    crNum: 1,
    size: 'Large',
    sizeMultiplier: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/47158/985/638742838863997460.png',
    speed: '10 ft., fly 60 ft.',
    walkSpeedFt: 10,
    flySpeedFt: 60,
    senses: 'Keen Sight and Smell',
    minLevel: 8,
    requiresFly: true,
    tacticalRole: 'Pack Tactics flyer; Multiattack',
    baseAc: 10,
    nativeHp: 22,
    stats: { str: 15, dex: 10, con: 15, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Pack Tactics', description: 'Advantage on attack rolls when an ally is within 5 ft. of the target.' },
      { name: 'Multiattack', description: 'Makes two attacks: one with Beak and one with Talons.' }
    ],
    attacks: [
      {
        id: 'ws-vulture-multi',
        name: 'Vulture Beak & Talons',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Giant Vulture)',
        hitBonus: '+4',
        damageFormula: '2d4 + 2',
        damageType: 'piercing',
        rangeFt: 5,
        jb2aAssetId: 'attack_claw',
        description: 'Multiattack with Pack Tactics: Beak (2d4+2 piercing) and Talons (2d6+2 slashing).'
      }
    ],
    description: 'Flying Pack Tactics predator that attacks with advantage alongside frontline allies.'
  },

  // ==========================================================
  // ADDITIONAL CR 2 BEAST FORMS
  // ==========================================================
  {
    id: 'form_aurochs',
    name: 'Aurochs',
    cr: '2',
    crNum: 2,
    size: 'Large',
    sizeMultiplier: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/58417/88/639226713770809470.jpeg',
    speed: '50 ft.',
    walkSpeedFt: 50,
    senses: 'Passive Perception 11',
    minLevel: 6,
    tacticalRole: 'Trampling Charge (+2d8 damage and prone)',
    baseAc: 11,
    nativeHp: 38,
    stats: { str: 20, dex: 10, con: 19, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Charge', description: 'Move at least 20 ft. straight toward a target and hit with Gore on the same turn to deal an extra 2d8 piercing damage and force a DC 15 STR save vs. prone.' }
    ],
    attacks: [
      {
        id: 'ws-aurochs-gore',
        name: 'Gore Charge',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Aurochs)',
        hitBonus: '+7',
        damageFormula: '2d8 + 5',
        damageType: 'piercing',
        rangeFt: 5,
        jb2aAssetId: 'attack_bite',
        description: 'Melee Attack: +7 to hit, reach 5 ft. Hit: 2d8 + 5 piercing (+2d8 extra and DC 15 STR prone on 20 ft. Charge).'
      }
    ],
    description: 'Thundering CR 2 charger with 20 Strength, 50 ft. speed, and 4d8+5 Gore charges.'
  },
  {
    id: 'form_polar_bear',
    name: 'Polar / Cave Bear',
    cr: '2',
    crNum: 2,
    size: 'Large',
    sizeMultiplier: 2,
    avatarUrl: '/tokens/wildshape/brown_bear.jpg',
    speed: '40 ft., swim 30 ft.',
    walkSpeedFt: 40,
    swimSpeedFt: 30,
    senses: 'Darkvision 60 ft. (Cave Bear), Keen Smell',
    minLevel: 6,
    tacticalRole: 'Heavy dual-attack multiattack routine (Bite + Claw)',
    baseAc: 12,
    nativeHp: 42,
    stats: { str: 20, dex: 10, con: 16, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Keen Smell', description: 'Advantage on Wisdom (Perception) checks that rely on smell.' },
      { name: 'Multiattack', description: 'Makes two attacks: one with Bite and one with Claws using 20 Strength (+7 to hit).' }
    ],
    attacks: [
      {
        id: 'ws-polar-bite',
        name: 'Cave Bear Bite',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Multiattack 1/2)',
        hitBonus: '+7',
        damageFormula: '1d8 + 5',
        damageType: 'piercing',
        rangeFt: 5,
        jb2aAssetId: 'attack_bite',
        description: 'Melee Attack: +7 to hit, reach 5 ft. Hit: 1d8 + 5 piercing or radiant damage.'
      },
      {
        id: 'ws-polar-claws',
        name: 'Cave Bear Claws',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Multiattack 2/2)',
        hitBonus: '+7',
        damageFormula: '2d6 + 5',
        damageType: 'slashing',
        rangeFt: 5,
        jb2aAssetId: 'attack_claw',
        description: 'Melee Attack: +7 to hit, reach 5 ft. Hit: 2d6 + 5 slashing or radiant damage.'
      }
    ],
    description: 'Apex CR 2 bear with 20 Strength, 30 ft. swim speed, and heavy +7 Multiattack.'
  },
  {
    id: 'form_rhinoceros',
    name: 'Rhinoceros',
    cr: '2',
    crNum: 2,
    size: 'Large',
    sizeMultiplier: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/58417/88/639226713770809470.jpeg',
    speed: '40 ft.',
    walkSpeedFt: 40,
    senses: 'Passive Perception 11',
    minLevel: 6,
    tacticalRole: 'Charge (extra 2d8 gore damage and DC 15 prone)',
    baseAc: 11,
    nativeHp: 45,
    stats: { str: 21, dex: 8, con: 15, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Charge', description: 'Move at least 20 ft. straight toward a target and hit with Gore on the same turn to deal an extra 2d8 bludgeoning damage and force a DC 15 STR save vs. prone.' }
    ],
    attacks: [
      {
        id: 'ws-rhino-gore',
        name: 'Rhino Horn Gore',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Rhinoceros)',
        hitBonus: '+7',
        damageFormula: '2d8 + 5',
        damageType: 'bludgeoning',
        rangeFt: 5,
        jb2aAssetId: 'attack_bite',
        description: 'Melee Attack: +7 to hit, reach 5 ft. Hit: 2d8 + 5 bludgeoning (+2d8 and DC 15 STR prone on 20 ft. Charge).'
      }
    ],
    description: 'Armored CR 2 siege charger with 21 Strength that bowls over frontline defenders.'
  },
  {
    id: 'form_hunter_shark',
    name: 'Hunter Shark',
    cr: '2',
    crNum: 2,
    size: 'Large',
    sizeMultiplier: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/30783/698/638062015886859442.png',
    speed: '0 ft., swim 40 ft.',
    walkSpeedFt: 0,
    swimSpeedFt: 40,
    senses: 'Blindsight 30 ft.',
    minLevel: 6,
    tacticalRole: 'Blood Frenzy (Advantage against bloodied foes underwater)',
    baseAc: 12,
    nativeHp: 45,
    stats: { str: 18, dex: 13, con: 15, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Blood Frenzy', description: 'You have advantage on melee attack rolls against any creature that doesn’t have all its hit points.' },
      { name: 'Water Breathing', description: 'Can breathe only underwater.' }
    ],
    attacks: [
      {
        id: 'ws-shark-bite',
        name: 'Blood Frenzy Bite',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Hunter Shark)',
        hitBonus: '+6',
        damageFormula: '2d8 + 4',
        damageType: 'piercing',
        rangeFt: 5,
        jb2aAssetId: 'attack_bite',
        description: 'Melee Attack (Advantage vs. damaged targets): +6 to hit, reach 5 ft. Hit: 2d8 + 4 piercing damage.'
      }
    ],
    description: 'Deadly underwater apex predator with 30 ft. Blindsight and permanent advantage against wounded foes.'
  },
  {
    id: 'form_plesiosaurus',
    name: 'Plesiosaurus',
    cr: '2',
    crNum: 2,
    size: 'Large',
    sizeMultiplier: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/30783/698/638062015886859442.png',
    speed: '20 ft., swim 40 ft.',
    walkSpeedFt: 20,
    swimSpeedFt: 40,
    senses: 'Passive Perception 11',
    minLevel: 6,
    tacticalRole: '10 ft. reach bite attack; aquatic tank',
    baseAc: 13,
    nativeHp: 68,
    stats: { str: 18, dex: 15, con: 16, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Hold Breath (1 Hour)', description: 'Can hold its breath for 1 hour and operate on both land and water.' }
    ],
    attacks: [
      {
        id: 'ws-plesiosaur-bite',
        name: 'Long-Necked Bite (10 ft.)',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Plesiosaurus)',
        hitBonus: '+6',
        damageFormula: '3d6 + 4',
        damageType: 'piercing',
        rangeFt: 10,
        jb2aAssetId: 'attack_bite',
        description: 'Melee Attack: +6 to hit, reach 10 ft. Hit: 3d6 + 4 piercing or radiant damage.'
      }
    ],
    description: 'Prehistoric marine reptile with a 10 ft. reach bite that can also traverse land.'
  },
  {
    id: 'form_quetzalcoatlus',
    name: 'Quetzalcoatlus',
    cr: '2',
    crNum: 2,
    size: 'Huge',
    sizeMultiplier: 3,
    avatarUrl: 'https://www.dndbeyond.com/avatars/16/535/636376331788287090.jpeg',
    speed: '10 ft., fly 80 ft.',
    walkSpeedFt: 10,
    flySpeedFt: 80,
    senses: 'Passive Perception 13',
    minLevel: 8,
    requiresFly: true,
    tacticalRole: 'Huge pterosaur flyer; 80 ft. flight; Dive Attack (+3d6)',
    baseAc: 13,
    nativeHp: 30,
    stats: { str: 15, dex: 13, con: 13, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Flyby', description: 'Does not provoke opportunity attacks when flying out of an enemy’s reach.' },
      { name: 'Dive Attack', description: 'If flying and diving at least 30 ft. toward a target, the Bite attack deals an extra 3d6 piercing damage (total 6d6+2).' }
    ],
    attacks: [
      {
        id: 'ws-quetz-bite',
        name: 'Pterosaur Dive Bite (10 ft.)',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Quetzalcoatlus)',
        hitBonus: '+4',
        damageFormula: '6d6 + 2',
        damageType: 'piercing',
        rangeFt: 10,
        jb2aAssetId: 'attack_bite',
        description: 'Melee Attack: +4 to hit, reach 10 ft. Hit: 3d6 + 2 piercing (+3d6 on 30 ft. Dive Attack) with Flyby!'
      }
    ],
    description: 'Huge 80 ft. flying pterosaur with Flyby and devastating 6d6+2 Dive Attacks.'
  },

  // ==========================================================
  // CR 3 BEAST FORMS (UNLOCKED AT DRUID LEVEL 9)
  // ==========================================================
  {
    id: 'form_ankylosaurus',
    name: 'Ankylosaurus',
    cr: '3',
    crNum: 3,
    size: 'Huge',
    sizeMultiplier: 3,
    avatarUrl: '/tokens/wildshape/giant_constrictor_snake.jpg',
    speed: '30 ft.',
    walkSpeedFt: 30,
    senses: 'Passive Perception 11',
    minLevel: 9,
    tacticalRole: 'Tail strike knocks Huge or smaller targets prone (DC 14)',
    baseAc: 15,
    nativeHp: 68,
    stats: { str: 19, dex: 11, con: 15, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Armored Juggernaut', description: 'Huge 3x3 dinosaur with 10 ft. reach clubbed tail that topples Huge or smaller foes.' }
    ],
    attacks: [
      {
        id: 'ws-ankylo-tail',
        name: 'Clubbed Tail Sweep (10 ft.)',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Ankylosaurus)',
        hitBonus: '+7',
        damageFormula: '4d6 + 4',
        damageType: 'bludgeoning',
        rangeFt: 10,
        jb2aAssetId: 'attack_claw',
        description: 'Melee Attack: +7 to hit, reach 10 ft. Hit: 4d6 + 4 bludgeoning damage. Target must succeed on a DC 14 STR save or be knocked prone.'
      }
    ],
    description: 'Armored Huge dinosaur whose 10 ft. clubbed tail knocks even Huge monsters prone.'
  },
  {
    id: 'form_giant_scorpion',
    name: 'Giant Scorpion',
    cr: '3',
    crNum: 3,
    size: 'Large',
    sizeMultiplier: 2,
    avatarUrl: '/tokens/wildshape/giant_spider.jpg',
    speed: '40 ft.',
    walkSpeedFt: 40,
    senses: 'Blindsight 60 ft.',
    minLevel: 9,
    tacticalRole: '3 attacks (2 Claws that auto-grapple + high-damage Poison Sting)',
    baseAc: 15,
    nativeHp: 52,
    stats: { str: 15, dex: 13, con: 15, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Blindsight 60 ft.', description: 'Perceive invisible and obscured foes within 60 ft.' },
      { name: 'Multiattack (3 Strikes)', description: 'Makes three attacks: two with Claws (auto-grapple) and one with Sting.' }
    ],
    attacks: [
      {
        id: 'ws-scorpion-claw',
        name: 'Pincer Claw (x2 Auto-Grapple)',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Giant Scorpion)',
        hitBonus: '+4',
        damageFormula: '1d8 + 2',
        damageType: 'bludgeoning',
        rangeFt: 5,
        jb2aAssetId: 'attack_claw',
        description: 'Melee Attack (2x): +4 to hit, reach 5 ft. Hit: 1d8 + 2 bludgeoning, and target is grappled (escape DC 12).'
      },
      {
        id: 'ws-scorpion-sting',
        name: 'Venomous Tail Sting',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Giant Scorpion)',
        hitBonus: '+4',
        damageFormula: '1d10 + 2',
        damageType: 'piercing',
        rangeFt: 5,
        jb2aAssetId: 'attack_bite',
        description: 'Melee Attack: +4 to hit, reach 5 ft. Hit: 1d10 + 2 piercing + 4d10 poison (DC 12 CON save for half).'
      }
    ],
    description: 'Deadly 60 ft. Blindsight arachnid with 2 auto-grappling pincers and a lethal poison stinger.'
  },
  {
    id: 'form_killer_whale',
    name: 'Killer Whale (Orca)',
    cr: '3',
    crNum: 3,
    size: 'Huge',
    sizeMultiplier: 3,
    avatarUrl: 'https://www.dndbeyond.com/avatars/30783/698/638062015886859442.png',
    speed: '0 ft., swim 60 ft.',
    walkSpeedFt: 0,
    swimSpeedFt: 60,
    senses: 'Blindsight 120 ft.',
    minLevel: 9,
    tacticalRole: 'Echolocation; Keen Hearing; heavy aquatic striker',
    baseAc: 12,
    nativeHp: 90,
    stats: { str: 19, dex: 10, con: 13, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Echolocation (Blindsight 120 ft.)', description: 'Massive 120 ft. Blindsight radius underwater.' },
      { name: 'Hold Breath (30 Min)', description: 'Can hold its breath for 30 minutes.' }
    ],
    attacks: [
      {
        id: 'ws-orca-bite',
        name: 'Orca Jaws',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Killer Whale)',
        hitBonus: '+6',
        damageFormula: '5d6 + 4',
        damageType: 'piercing',
        rangeFt: 5,
        jb2aAssetId: 'attack_bite',
        description: 'Melee Attack: +6 to hit, reach 5 ft. Hit: 5d6 + 4 piercing or radiant damage.'
      }
    ],
    description: 'Huge oceanic apex predator with 120 ft. Blindsight and crushing 5d6+4 jaws.'
  },
  {
    id: 'form_giant_snapping_turtle',
    name: 'Giant Snapping Turtle',
    cr: '3',
    crNum: 3,
    size: 'Large',
    sizeMultiplier: 2,
    avatarUrl: '/tokens/wildshape/giant_badger.jpg',
    speed: '30 ft., swim 40 ft.',
    walkSpeedFt: 30,
    swimSpeedFt: 40,
    senses: 'Darkvision 60 ft.',
    minLevel: 9,
    tacticalRole: 'High natural durability; amphibious hold breath',
    baseAc: 17,
    nativeHp: 75,
    stats: { str: 19, dex: 10, con: 14, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Amphibious Shell', description: 'Natural 17 AC shell (12 when prone) and stable footing.' }
    ],
    attacks: [
      {
        id: 'ws-turtle-bite',
        name: 'Snapping Beak',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Giant Snapping Turtle)',
        hitBonus: '+6',
        damageFormula: '4d6 + 4',
        damageType: 'slashing',
        rangeFt: 5,
        jb2aAssetId: 'attack_bite',
        description: 'Melee Attack: +6 to hit, reach 5 ft. Hit: 4d6 + 4 slashing or radiant damage.'
      }
    ],
    description: 'Heavily armored amphibious tank with a devastating 4d6+4 snapping beak.'
  },

  // ==========================================================
  // CR 4 BEAST FORMS (UNLOCKED AT DRUID LEVEL 12)
  // ==========================================================
  {
    id: 'form_elephant',
    name: 'Elephant',
    cr: '4',
    crNum: 4,
    size: 'Huge',
    sizeMultiplier: 3,
    avatarUrl: 'https://www.dndbeyond.com/avatars/58417/88/639226713770809470.jpeg',
    speed: '40 ft.',
    walkSpeedFt: 40,
    senses: 'Passive Perception 11',
    minLevel: 12,
    tacticalRole: 'Trampling Charge; Gore (3d8+6) + Stomp bonus attack',
    baseAc: 12,
    nativeHp: 76,
    stats: { str: 22, dex: 9, con: 17, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Trampling Charge', description: 'Move at least 20 ft. straight toward a creature and hit with Gore to force a DC 12 STR save vs. prone. If prone, make one Stomp attack as a bonus action.' }
    ],
    attacks: [
      {
        id: 'ws-elephant-gore',
        name: 'Tusk Gore',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Elephant)',
        hitBonus: '+8',
        damageFormula: '3d8 + 6',
        damageType: 'piercing',
        rangeFt: 5,
        jb2aAssetId: 'attack_bite',
        description: 'Melee Attack: +8 to hit, reach 5 ft. Hit: 3d8 + 6 piercing damage.'
      },
      {
        id: 'ws-elephant-stomp',
        name: 'Crushing Stomp (Bonus vs. Prone)',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Elephant)',
        hitBonus: '+8',
        damageFormula: '3d10 + 6',
        damageType: 'bludgeoning',
        rangeFt: 5,
        jb2aAssetId: 'attack_claw',
        description: 'Melee Attack against prone creature: +8 to hit, reach 5 ft. Hit: 3d10 + 6 bludgeoning damage.'
      }
    ],
    description: 'Colossal CR 4 charger with 22 Strength, Gore tusks, and a 3d10+6 bonus Stomp.'
  },
  {
    id: 'form_stegosaurus',
    name: 'Stegosaurus',
    cr: '4',
    crNum: 4,
    size: 'Huge',
    sizeMultiplier: 3,
    avatarUrl: '/tokens/wildshape/giant_constrictor_snake.jpg',
    speed: '40 ft.',
    walkSpeedFt: 40,
    senses: 'Passive Perception 11',
    minLevel: 12,
    tacticalRole: 'Tail strike (4d6+5 piercing and DC 15 prone)',
    baseAc: 13,
    nativeHp: 76,
    stats: { str: 20, dex: 9, con: 17, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Spiked Thagomizer', description: '10 ft. reach spiked tail that deals heavy piercing damage.' }
    ],
    attacks: [
      {
        id: 'ws-stego-tail',
        name: 'Spiked Tail (10 ft.)',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Stegosaurus)',
        hitBonus: '+7',
        damageFormula: '6d6 + 5',
        damageType: 'piercing',
        rangeFt: 10,
        jb2aAssetId: 'attack_claw',
        description: 'Melee Attack: +7 to hit, reach 10 ft. Hit: 6d6 + 5 piercing or radiant damage.'
      }
    ],
    description: 'Huge armored dinosaur wielding a devastating 10 ft. spiked tail.'
  },
  {
    id: 'form_giant_subterranean_lizard',
    name: 'Giant Subterranean Lizard',
    cr: '4',
    crNum: 4,
    size: 'Huge',
    sizeMultiplier: 3,
    avatarUrl: '/tokens/wildshape/giant_constrictor_snake.jpg',
    speed: '30 ft., swim 50 ft.',
    walkSpeedFt: 30,
    swimSpeedFt: 50,
    senses: 'Blindsight 30 ft.',
    minLevel: 12,
    tacticalRole: 'Swallow whole; grapple on bite and tail sweep',
    baseAc: 14,
    nativeHp: 66,
    stats: { str: 21, dex: 9, con: 17, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Multiattack & Swallow', description: 'Makes one Bite (auto-grapple) and one Tail attack (or Swallow a grappled Medium or smaller creature).' }
    ],
    attacks: [
      {
        id: 'ws-sub-lizard-bite',
        name: 'Engulfing Jaws & Tail',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Subterranean Lizard)',
        hitBonus: '+7',
        damageFormula: '2d10 + 5',
        damageType: 'piercing',
        rangeFt: 10,
        jb2aAssetId: 'attack_bite',
        description: 'Multiattack: Bite (2d10+5 piercing + grapple DC 15) and Tail (2d6+5 bludgeoning + DC 15 STR prone).'
      }
    ],
    description: 'Underdark apex reptile with 30 ft. Blindsight, auto-grapple jaws, and Swallow Whole.'
  },

  // ==========================================================
  // CR 5 BEAST FORMS (UNLOCKED AT DRUID LEVEL 15)
  // ==========================================================
  {
    id: 'form_triceratops',
    name: 'Triceratops',
    cr: '5',
    crNum: 5,
    size: 'Huge',
    sizeMultiplier: 3,
    avatarUrl: 'https://www.dndbeyond.com/avatars/58417/88/639226713770809470.jpeg',
    speed: '50 ft.',
    walkSpeedFt: 50,
    senses: 'Passive Perception 11',
    minLevel: 15,
    tacticalRole: 'Trampling Charge (gore + stomp knockdown); heavy tank',
    baseAc: 13,
    nativeHp: 95,
    stats: { str: 22, dex: 9, con: 17, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Trampling Charge', description: 'Move at least 20 ft. straight toward a creature and hit with Gore to force a DC 13 STR save vs. prone and follow up with a bonus-action Stomp.' }
    ],
    attacks: [
      {
        id: 'ws-trike-gore',
        name: 'Triceratops Gore & Stomp',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Triceratops)',
        hitBonus: '+9',
        damageFormula: '4d8 + 6',
        damageType: 'piercing',
        rangeFt: 5,
        jb2aAssetId: 'attack_bite',
        description: 'Melee Attack: +9 to hit, reach 5 ft. Hit: 4d8 + 6 piercing (plus 3d10 + 6 bludgeoning bonus Stomp vs. prone).'
      }
    ],
    description: 'Three-horned CR 5 prehistoric juggernaut with 50 ft. speed and crushing trampling charges.'
  },
  {
    id: 'form_giant_crocodile',
    name: 'Giant Crocodile',
    cr: '5',
    crNum: 5,
    size: 'Huge',
    sizeMultiplier: 3,
    avatarUrl: '/tokens/wildshape/giant_constrictor_snake.jpg',
    speed: '30 ft., swim 50 ft.',
    walkSpeedFt: 30,
    swimSpeedFt: 50,
    senses: 'Hold Breath (30 min)',
    minLevel: 15,
    tacticalRole: 'Multiattack (Bite + Tail); auto-grapple on bite and tail prone',
    baseAc: 14,
    nativeHp: 85,
    stats: { str: 21, dex: 9, con: 17, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Multiattack Control', description: 'Makes two attacks: one Bite (auto-grapple + restrain DC 16) and one Tail attack (10 ft. reach, DC 16 STR prone) against a second target.' }
    ],
    attacks: [
      {
        id: 'ws-gcroc-bite',
        name: 'Titan Jaws (Restrain)',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Giant Crocodile)',
        hitBonus: '+8',
        damageFormula: '3d10 + 5',
        damageType: 'piercing',
        rangeFt: 5,
        jb2aAssetId: 'attack_bite',
        description: 'Melee Attack: +8 to hit, reach 5 ft. Hit: 3d10 + 5 piercing, and target is grappled (escape DC 16) and restrained.'
      },
      {
        id: 'ws-gcroc-tail',
        name: 'Tail Whip (10 ft. Prone)',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Giant Crocodile)',
        hitBonus: '+8',
        damageFormula: '2d8 + 5',
        damageType: 'bludgeoning',
        rangeFt: 10,
        jb2aAssetId: 'attack_claw',
        description: 'Melee Attack: +8 to hit, reach 10 ft. Hit: 2d8 + 5 bludgeoning, and target must succeed on a DC 16 STR save or be knocked prone.'
      }
    ],
    description: 'Supreme CR 5 battlefield controller that restrains one target with its jaws while knocking a second prone with its tail.'
  },
  {
    id: 'form_hulking_crab',
    name: 'Hulking Crab',
    cr: '5',
    crNum: 5,
    size: 'Huge',
    sizeMultiplier: 3,
    avatarUrl: '/tokens/wildshape/giant_spider.jpg',
    speed: '20 ft., swim 30 ft.',
    walkSpeedFt: 20,
    swimSpeedFt: 30,
    senses: 'Blindsight 30 ft.',
    minLevel: 15,
    tacticalRole: 'Dual pincer grapples; amphibious blindsight tank',
    baseAc: 17,
    nativeHp: 76,
    stats: { str: 19, dex: 8, con: 16, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Amphibious & Shell Camouflage', description: 'Breathes air and water; natural 17 AC chitinous shell.' },
      { name: 'Multiattack (2 Claws)', description: 'Makes two Claw attacks, each capable of grappling a Huge or smaller target (escape DC 15).' }
    ],
    attacks: [
      {
        id: 'ws-crab-claws',
        name: 'Siege Pincer (x2 Grapple)',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Hulking Crab)',
        hitBonus: '+7',
        damageFormula: '3d8 + 4',
        damageType: 'bludgeoning',
        rangeFt: 10,
        jb2aAssetId: 'attack_claw',
        description: 'Melee Attack (2x): +7 to hit, reach 10 ft. Hit: 3d8 + 4 bludgeoning, and target is grappled (escape DC 15).'
      }
    ],
    description: 'Huge 17 AC crustacean with 30 ft. Blindsight and dual 10 ft. reach grappling pincers.'
  },
  {
    id: 'form_brontosaurus',
    name: 'Brontosaurus',
    cr: '5',
    crNum: 5,
    size: 'Gargantuan',
    sizeMultiplier: 4,
    avatarUrl: '/tokens/wildshape/giant_constrictor_snake.jpg',
    speed: '30 ft.',
    walkSpeedFt: 30,
    senses: 'Passive Perception 10',
    minLevel: 15,
    tacticalRole: '20 ft. reach tail sweep (5d8+5 bludgeoning); colossal area control',
    baseAc: 15,
    nativeHp: 121,
    stats: { str: 21, dex: 9, con: 17, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Colossal Presence (4x4)', description: 'Gargantuan footprint dominates chokepoints with 20 ft. reach attacks.' }
    ],
    attacks: [
      {
        id: 'ws-bronto-stomp',
        name: 'Thunder Stomp (20 ft.)',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Brontosaurus)',
        hitBonus: '+8',
        damageFormula: '5d8 + 5',
        damageType: 'bludgeoning',
        rangeFt: 20,
        jb2aAssetId: 'attack_claw',
        description: 'Melee Attack: +8 to hit, reach 20 ft. Hit: 5d8 + 5 bludgeoning damage, and target must succeed on a DC 14 STR save or be knocked prone.'
      },
      {
        id: 'ws-bronto-tail',
        name: 'Colossal Tail Sweep (20 ft.)',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Brontosaurus)',
        hitBonus: '+8',
        damageFormula: '6d8 + 5',
        damageType: 'bludgeoning',
        rangeFt: 20,
        jb2aAssetId: 'attack_claw',
        description: 'Melee Attack: +8 to hit, reach 20 ft. Hit: 6d8 + 5 bludgeoning or radiant damage.'
      }
    ],
    description: 'Gargantuan 4x4 sauropod with 20 ft. reach tail sweeps and earth-shaking stomps.'
  },

  // ==========================================================
  // CR 6 BEAST FORMS (UNLOCKED AT DRUID LEVEL 18)
  // ==========================================================
  {
    id: 'form_mammoth',
    name: 'Mammoth',
    cr: '6',
    crNum: 6,
    size: 'Huge',
    sizeMultiplier: 3,
    avatarUrl: 'https://www.dndbeyond.com/avatars/58417/88/639226713770809470.jpeg',
    speed: '40 ft.',
    walkSpeedFt: 40,
    senses: 'Passive Perception 10',
    minLevel: 18,
    tacticalRole: 'Trampling Charge; Gore (4d8+7) + Stomp (4d10+7)',
    baseAc: 13,
    nativeHp: 126,
    stats: { str: 24, dex: 9, con: 21, int: 13, wis: 18, cha: 10 },
    traits: [
      { name: 'Trampling Charge (DC 18)', description: 'Move at least 20 ft. straight toward a creature and hit with Gore to force a DC 18 STR save vs. prone. If prone, make one Stomp attack (4d10+7) as a bonus action.' }
    ],
    attacks: [
      {
        id: 'ws-mammoth-gore',
        name: 'Mammoth Tusks (10 ft.)',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Mammoth)',
        hitBonus: '+10',
        damageFormula: '4d8 + 7',
        damageType: 'piercing',
        rangeFt: 10,
        jb2aAssetId: 'attack_bite',
        description: 'Melee Attack: +10 to hit, reach 10 ft. Hit: 4d8 + 7 piercing or radiant damage (triggers DC 18 STR prone on 20 ft. Charge).'
      },
      {
        id: 'ws-mammoth-stomp',
        name: 'Mammoth Stomp (Bonus vs. Prone)',
        category: 'attacks',
        type: 'action',
        subCategory: 'weapon',
        isAttack: true,
        sourceLabel: 'Wild Shape (Mammoth)',
        hitBonus: '+10',
        damageFormula: '4d10 + 7',
        damageType: 'bludgeoning',
        rangeFt: 5,
        jb2aAssetId: 'attack_claw',
        description: 'Melee Attack against prone creature: +10 to hit, reach 5 ft. Hit: 4d10 + 7 bludgeoning damage.'
      }
    ],
    description: 'The ultimate CR 6 Moon Druid form with 24 Strength, +10 to hit, and 4d8+7 Gore + 4d10+7 Stomp.'
  }
];
