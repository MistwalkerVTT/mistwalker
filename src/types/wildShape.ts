import { HudActionItem } from './hud';

export interface WildShapeBeastForm {
  id: string;
  name: string;
  cr: string;
  crNum: number;
  size: 'Medium' | 'Large' | 'Huge';
  sizeMultiplier: number; // 1 for Medium (1x1), 2 for Large (2x2), 3 for Huge (3x3)
  avatarUrl: string;
  speed: string;
  walkSpeedFt: number;
  swimSpeedFt?: number;
  climbSpeedFt?: number;
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

export const GAIAH_WILD_SHAPE_FORMS: WildShapeBeastForm[] = [
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
    speed: '30 ft., burrow 10 ft.',
    walkSpeedFt: 30,
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
  }
];
