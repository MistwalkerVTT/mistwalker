import skeletonCryptImg from '../assets/images/skeleton_crypt_map_1788900167836.jpg';
import { Scene, Chapter, Campaign, SceneToken } from '../lib/firebase';
import { WallSegment, RoomAnnotation } from '../types';

/**
 * Preconfigured Featured Test Scene: "Skeleton Crypt"
 * Chosen Map: Skeleton Crypt (1264 x 848)
 * Preloaded with:
 * - 1 Player Token (Varrak, Barbarian, D&D Beyond Linked #146614740, 59 HP)
 * - 1 Enemy Token (Crypt Skeleton Lord, CR 2, 35 HP, AC 14)
 * - Closed Door between Player & Enemy to test dynamic line of sight, occlusion & door opening
 * - Dynamic lighting, Fog of War, and animated torch
 */

export const TEST_SANDBOX_TOKENS: SceneToken[] = [
  // 1. Player Token
  {
    id: "token_test_player_varrak",
    name: "Varrak (Player)",
    characterId: "char_varrak",
    ddbCharacterId: 146614740,
    avatarUrl: "https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Varrak.png/:/rs=w:1440,h:1440",
    x: 632,
    y: 640,
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

  // 2. Enemy Token
  {
    id: "token_test_enemy_skeleton_lord",
    name: "Crypt Skeleton Lord (Enemy)",
    avatarUrl: "https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Skeleton.png/:/rs=w:1440,h:1440",
    x: 632,
    y: 260,
    size: 1,
    hp: 35,
    maxHp: 35,
    currentHp: 35,
    ac: 14,
    isPlayer: false,
    isMonster: true,
    category: "monster"
  }
];

// Walls: Perimeter walls + Interior dividing wall with an interactive closed door
export const TEST_SANDBOX_WALLS: WallSegment[] = [
  // Outer perimeter walls
  {
    id: 'wall_north_crypt',
    wallType: 'normal',
    p1: { x: 180, y: 100 },
    p2: { x: 1084, y: 100 }
  },
  {
    id: 'wall_east_crypt_upper',
    wallType: 'normal',
    p1: { x: 1084, y: 100 },
    p2: { x: 1084, y: 250 }
  },
  // Secret Door on East Alcove
  {
    id: 'wall_east_secret_door',
    wallType: 'secret_door',
    doorState: 'closed',
    p1: { x: 1084, y: 250 },
    p2: { x: 1084, y: 350 }
  },
  {
    id: 'wall_east_crypt_lower',
    wallType: 'normal',
    p1: { x: 1084, y: 350 },
    p2: { x: 1084, y: 748 }
  },
  {
    id: 'wall_south_crypt',
    wallType: 'normal',
    p1: { x: 1084, y: 748 },
    p2: { x: 180, y: 748 }
  },
  {
    id: 'wall_west_crypt_lower',
    wallType: 'normal',
    p1: { x: 180, y: 748 },
    p2: { x: 180, y: 350 }
  },
  // Window on West Alcove
  {
    id: 'wall_west_window',
    wallType: 'window',
    p1: { x: 180, y: 350 },
    p2: { x: 180, y: 250 }
  },
  {
    id: 'wall_west_crypt_upper',
    wallType: 'normal',
    p1: { x: 180, y: 250 },
    p2: { x: 180, y: 100 }
  },

  // Interior dividing wall separating player antechamber from enemy inner chamber
  {
    id: 'wall_dividing_left',
    wallType: 'normal',
    p1: { x: 180, y: 460 },
    p2: { x: 572, y: 460 }
  },
  // Center Closed Door (Intersects LOS between player at y:640 and enemy at y:260)
  {
    id: 'wall_center_door_test',
    wallType: 'door',
    doorState: 'closed',
    p1: { x: 572, y: 460 },
    p2: { x: 692, y: 460 }
  },
  {
    id: 'wall_dividing_right',
    wallType: 'normal',
    p1: { x: 692, y: 460 },
    p2: { x: 1084, y: 460 }
  }
];

export const TEST_SANDBOX_ROOM_ZONES: RoomAnnotation[] = [
  {
    id: 'zone_crypt_inner_sanctum',
    name: '💀 Inner Sarcophagus Chamber',
    code: 'CRYPT-01',
    description: 'Ancient octagonal tomb housing the Crypt Skeleton Lord. High stone pillars and stacks of ancient bone line the walls.',
    monsterNotes: '• Crypt Skeleton Lord: AC 14, 35 HP. Uses Greatsword +5 to hit (2d6+3 slashing). Vulnerable to bludgeoning damage.',
    polygonPoints: [
      { x: 200, y: 120 },
      { x: 1060, y: 120 },
      { x: 1060, y: 450 },
      { x: 200, y: 450 }
    ],
    x: 632,
    y: 280,
    radius: 70,
    color: '#e11d48',
    pdfPage: 1
  },
  {
    id: 'zone_crypt_entrance',
    name: '🛡️ Crypt Antechamber (Player Starting Area)',
    code: 'CRYPT-02',
    description: 'Entrance corridor leading into the sepulcher. Heavy iron-banded door blocks passage to the inner crypt.',
    monsterNotes: 'Safe resting threshold before breaching the inner sanctum.',
    polygonPoints: [
      { x: 200, y: 470 },
      { x: 1060, y: 470 },
      { x: 1060, y: 730 },
      { x: 200, y: 730 }
    ],
    x: 632,
    y: 600,
    radius: 70,
    color: '#06b6d4',
    pdfPage: 1
  }
];

export const TEST_SANDBOX_SCENE: Scene = {
  sceneId: "scene_test_sandbox_crypt",
  sceneTitle: "Featured Test Scene - Skeleton Crypt",
  mapUrl: skeletonCryptImg,
  mapThumbnailUrl: skeletonCryptImg,
  mapWidth: 1264,
  mapHeight: 848,
  dmNotes: "🧪 FEATURED TEST SCENE (SKELETON CRYPT)\n\nPreloaded testing environment with preconfigured player and enemy tokens:\n• Player Token: Varrak (Goliath Barbarian, 59 HP, D&D Beyond Linked #146614740)\n• Enemy Token: Crypt Skeleton Lord (CR 2, 35 HP, AC 14)\n\nFEATURES TO TEST:\n1. Door Occlusion: Closed door at (y: 460) blocks line-of-sight to the enemy. Click the door badge to open and reveal the Crypt Skeleton Lord.\n2. Dynamic Lighting & FOV: Move Varrak to test dynamic fog reveals and darkness.\n3. D&D Beyond Sync: Varrak's HP auto-syncs with D&D Beyond changes.\n4. Combat & HP: Roll attacks or change HP in the combat tracker / token sheet.\n5. Walls & Portals: Test secret door (East wall) and window (West wall).",
  tokens: TEST_SANDBOX_TOKENS,
  gridSize: 50,
  gridOpacity: 0.35,
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
      id: "torch_crypt_center",
      type: "torch",
      x: 632,
      y: 430,
      scale: 1.0,
      color: "#ffaa33",
      intensity: 0.9,
      radius: 45
    } as any
  ],
  boardAnimatedEnabled: true
};

export const TEST_SANDBOX_CHAPTER: Chapter = {
  chapterId: 'chap_test_sandbox',
  title: 'Featured Test Laboratory',
  orderIndex: 0,
  scenes: [TEST_SANDBOX_SCENE]
};

export const TEST_SANDBOX_CAMPAIGN: Campaign = {
  campaignId: 'camp_test_sandbox',
  campaignTitle: 'Featured Test Scene Lab',
  description: 'Preloaded featured testing scene with Skeleton Crypt map, player token, and enemy token for testing Fog of War, dynamic vision, and D&D Beyond HP syncing.',
  createdAt: 1700000000000,
  chapters: [TEST_SANDBOX_CHAPTER]
};
