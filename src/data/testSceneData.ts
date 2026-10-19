import guildhouseMainLevelImg from '../assets/images/guildhouse_main_level.jpg';
import { Scene, Chapter, Campaign, SceneToken } from '../lib/firebase';
import { WallSegment, RoomAnnotation } from '../types';
import { DEMO_GV_WALLS, DEMO_GV_PDF_DIGEST } from './demoCampaignGv';

/**
 * Preconfigured Feature Test Lab & Sandbox Scene
 * Designed specifically for testing features, bug fixes, and improvements:
 * - Dynamic Line of Sight (FOV), Wall Occlusion & Darkness
 * - Normal Walls, Open Doors, Closed Doors, Secret Doors, Windows
 * - D&D Beyond real-time HP polling and auto-refreshing
 * - Allies & Summons compendium token support
 * - Monster sheets, combat tracking, and DM Notes
 * - Dynamic lighting and animated features (Torches)
 */

export const TEST_SANDBOX_TOKENS: SceneToken[] = [
  // 1. D&D Beyond Linked Party Heroes
  {
    id: "token_varrak_test",
    name: "Varrak",
    characterId: "char_varrak",
    ddbCharacterId: 146614740,
    avatarUrl: "https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Varrak.png/:/rs=w:1440,h:1440",
    x: 1400,
    y: 1290,
    size: 1,
    hp: 59,
    maxHp: 59,
    currentHp: 59,
    ac: 17,
    isPlayer: true,
    isMonster: false,
    category: "character",
    visionEnabled: true,
    visionRadius: 60
  },
  {
    id: "token_noctua_test",
    name: "Noctua Shadowclaw",
    characterId: "char_noctua",
    ddbCharacterId: 147334187,
    avatarUrl: "https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Noctua.png/:/rs=w:1440,h:1440",
    x: 1550,
    y: 1300,
    size: 1,
    hp: 39,
    maxHp: 39,
    currentHp: 39,
    ac: 14,
    isPlayer: true,
    isMonster: false,
    category: "character",
    visionEnabled: true,
    visionRadius: 60
  },
  {
    id: "token_aggie_test",
    name: "Aggie",
    characterId: "char_aggie",
    ddbCharacterId: 158502126,
    avatarUrl: "https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Aggie.png/:/rs=w:1440,h:1440",
    x: 1500,
    y: 1300,
    size: 1,
    hp: 42,
    maxHp: 42,
    currentHp: 42,
    ac: 16,
    isPlayer: true,
    isMonster: false,
    category: "character",
    visionEnabled: true,
    visionRadius: 60
  },
  {
    id: "token_rowan_test",
    name: "Rowan",
    characterId: "char_rowan",
    ddbCharacterId: 146533824,
    avatarUrl: "https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Rowan.png/:/rs=w:1440,h:1440",
    x: 1450,
    y: 1300,
    size: 1,
    hp: 38,
    maxHp: 38,
    currentHp: 38,
    ac: 14,
    isPlayer: true,
    isMonster: false,
    category: "character",
    visionEnabled: true,
    visionRadius: 60
  },

  // 2. Allies & Summons (From Allies Compendium)
  {
    id: "token_ally_dire_wolf_test",
    name: "Dire Wolf (Druid Summon)",
    allyId: "ally_dire_wolf",
    avatarUrl: "https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/DireWolf.png/:/rs=w:1440,h:1440",
    x: 1350,
    y: 1280,
    size: 1,
    hp: 37,
    maxHp: 37,
    currentHp: 37,
    ac: 14,
    isPlayer: false,
    isMonster: false,
    category: "ally",
    visionEnabled: true,
    visionRadius: 40
  },
  {
    id: "token_ally_spiritual_weapon_test",
    name: "Spiritual Weapon",
    allyId: "ally_spiritual_weapon",
    avatarUrl: "https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/SpiritualWeapon.png/:/rs=w:1440,h:1440",
    x: 1350,
    y: 1220,
    size: 1,
    hp: 20,
    maxHp: 20,
    currentHp: 20,
    ac: 15,
    isPlayer: false,
    isMonster: false,
    category: "ally"
  },

  // 3. Monsters (Encounter Testing)
  {
    id: "token_jaymont_sinner_test",
    name: "Jaymont the Sinner",
    avatarUrl: "/uploads/file-1792077381663-439615846.png",
    x: 1680,
    y: 780,
    size: 1,
    hp: 52,
    maxHp: 52,
    currentHp: 52,
    ac: 14,
    isMonster: true,
    category: "monster"
  },
  {
    id: "token_thug_enforcer_test",
    name: "Thug Enforcer",
    avatarUrl: "/uploads/file-1792077380953-585139729.png",
    x: 860,
    y: 920,
    size: 1,
    hp: 32,
    maxHp: 32,
    currentHp: 32,
    ac: 11,
    isMonster: true,
    category: "monster"
  },
  {
    id: "token_skeleton_warrior_test",
    name: "Crypt Skeleton",
    avatarUrl: "https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Skeleton.png/:/rs=w:1440,h:1440",
    x: 1450,
    y: 880,
    size: 1,
    hp: 13,
    maxHp: 13,
    currentHp: 13,
    ac: 13,
    isMonster: true,
    category: "monster"
  }
];

// Enhanced test wall segments: normal walls + open door + closed door + secret door + window
export const TEST_SANDBOX_WALLS: WallSegment[] = [
  ...DEMO_GV_WALLS.map((w, idx) => {
    // Specifically enhance entrance walls for feature testing
    if (idx === 2) {
      return { ...w, id: 'test_wall_closed_door', wallType: 'door' as const, doorState: 'closed' as const };
    }
    return w;
  }),
  // Distinct Secret Door segment in entrance hall
  {
    id: 'test_wall_secret_door',
    wallType: 'secret_door' as const,
    doorState: 'closed' as const,
    p1: { x: 1300, y: 1200 },
    p2: { x: 1360, y: 1200 }
  },
  // Distinct Window segment in entrance hall
  {
    id: 'test_wall_window',
    wallType: 'window' as const,
    p1: { x: 1360, y: 1200 },
    p2: { x: 1420, y: 1200 }
  },
  // Open Door segment for direct comparison
  {
    id: 'test_wall_open_door',
    wallType: 'door' as const,
    doorState: 'open' as const,
    p1: { x: 1534, y: 815 },
    p2: { x: 1651, y: 812 }
  }
];

export const TEST_SANDBOX_ROOM_ZONES: RoomAnnotation[] = [
  {
    id: 'zone_sandbox_testing_grounds',
    name: '🧪 Feature Test Lab & Sandbox Proving Grounds',
    code: 'LAB-01',
    description: 'Central proving ground for MistWalker VTT features. Features full wall occlusion, closed/open doors, secret doors, windows, torches, dynamic lighting, and real-time D&D Beyond HP synchronization.',
    monsterNotes: '• Jaymont the Sinner: CR 3 (52 HP). Uses Multiattack with Rapier.\n• Crypt Skeleton: Vulnerable to bludgeoning damage.\n• Thugs: Pack Tactics grants advantage when allies are adjacent.',
    polygonPoints: [
      { x: 1280, y: 1100 },
      { x: 1650, y: 1100 },
      { x: 1650, y: 1380 },
      { x: 1280, y: 1380 }
    ],
    x: 1465,
    y: 1240,
    radius: 80,
    color: '#06b6d4',
    pdfPage: 1
  }
];

export const TEST_SANDBOX_SCENE: Scene = {
  sceneId: "scene_test_sandbox_lab",
  sceneTitle: "🧪 Feature Sandbox & Improvement Lab",
  mapUrl: guildhouseMainLevelImg,
  mapThumbnailUrl: guildhouseMainLevelImg,
  mapWidth: 2976,
  mapHeight: 1426,
  dmNotes: "🧪 MISTWALKER FEATURE TEST LAB & SANDBOX\n\nPURPOSE: Dedicated environment to test all VTT features & improvements:\n• Dynamic Line of Sight, Wall Occlusion & Darkness\n• Doors (Open, Closed), Secret Doors, and Windows\n• Player View vs DM View synchronization\n• D&D Beyond live character HP auto-refreshing\n• Allies & Summons compendium token behavior\n• Animated lighting / Torch rendering\n• Combat tracking & monster DM notes\n\nHEROES:\n- Varrak (Goliath Barbarian, DDB #146614740)\n- Rowan (Human Ranger, DDB #146533824)\n- Noctua Shadowclaw (Tabaxi Rogue, DDB #147334187)\n- Aggie (Tiefling Sorcerer, DDB #158502126)\n\nALLIES & SUMMONS:\n- Dire Wolf (Druid Summon)\n- Spiritual Weapon (Evocation Summon)\n\nMONSTERS:\n- Jaymont the Sinner (CR 3, 52 HP)\n- Thug Enforcer (CR 1/2, 32 HP)\n- Crypt Skeleton (CR 1/4, 13 HP)",
  tokens: TEST_SANDBOX_TOKENS,
  gridSize: 50,
  gridOpacity: 0.3,
  isFogVisible: true,
  walls: TEST_SANDBOX_WALLS,
  visionConfig: {
    enabled: true,
    explorationMemory: true,
    darknessOpacity: 0.85,
    dimVisionOpacity: 0.4,
    ambientLight: false,
    dmPreviewMode: true,
    showDoorBadges: true
  },
  roomAnnotations: TEST_SANDBOX_ROOM_ZONES,
  boardAnimatedFeatures: [
    {
      id: "torch_sandbox_courtyard",
      type: "torch",
      x: 1475,
      y: 1220,
      scale: 1.1,
      color: "#ffaa33",
      intensity: 0.9,
      radius: 40
    } as any
  ],
  boardAnimatedEnabled: true,
  pdfFilename: 'Keys_from_the_Golden_Vault_Masterpiece_Imbroglio.pdf',
  pdfDigest: DEMO_GV_PDF_DIGEST
};

export const TEST_SANDBOX_CHAPTER: Chapter = {
  chapterId: 'chap_test_sandbox',
  title: 'Feature Testing Laboratory',
  orderIndex: 0,
  pdfFilename: 'Keys_from_the_Golden_Vault_Masterpiece_Imbroglio.pdf',
  pdfDigest: DEMO_GV_PDF_DIGEST,
  scenes: [TEST_SANDBOX_SCENE]
};

export const TEST_SANDBOX_CAMPAIGN: Campaign = {
  campaignId: 'camp_test_sandbox',
  campaignTitle: 'Feature Test Lab & Sandbox',
  description: 'Preconfigured sandbox testing environment for features, improvements, dynamic lighting, wall occlusion, and D&D Beyond sync.',
  createdAt: 1700000000000,
  chapters: [TEST_SANDBOX_CHAPTER]
};
