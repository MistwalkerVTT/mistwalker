import subterraneanMazeImg from '../assets/images/subterranean_maze_map_1788900151367.jpg';
import { Campaign, Scene, Chapter } from '../lib/firebase';
import { RoomAnnotation, WallSegment, ChapterPdfDigest } from '../types';

/**
 * Prebuilt Demo Campaign: "The Guild from GV"
 * Module: Keys from the Golden Vault - Chapter: Masterpiece Imbroglio
 * Adventure Location: The Agile Hand Thieves' Guildhouse
 */

export const DEMO_GV_WALLS: WallSegment[] = [
  // Outer perimeter walls
  { id: 'gv-wall-out-top', p1: { x: 120, y: 100 }, p2: { x: 880, y: 100 }, wallType: 'normal' },
  { id: 'gv-wall-out-right', p1: { x: 880, y: 100 }, p2: { x: 880, y: 720 }, wallType: 'normal' },
  { id: 'gv-wall-out-bottom', p1: { x: 880, y: 720 }, p2: { x: 120, y: 720 }, wallType: 'normal' },
  { id: 'gv-wall-out-left', p1: { x: 120, y: 720 }, p2: { x: 120, y: 100 }, wallType: 'normal' },

  // Interior dividing walls
  { id: 'gv-wall-div-vert1', p1: { x: 440, y: 100 }, p2: { x: 440, y: 380 }, wallType: 'normal' },
  { id: 'gv-wall-div-door1', p1: { x: 440, y: 380 }, p2: { x: 440, y: 460 }, wallType: 'door', doorState: 'closed' },
  { id: 'gv-wall-div-vert2', p1: { x: 440, y: 460 }, p2: { x: 440, y: 720 }, wallType: 'normal' },

  { id: 'gv-wall-div-horiz1', p1: { x: 120, y: 410 }, p2: { x: 440, y: 410 }, wallType: 'normal' },
  { id: 'gv-wall-div-horiz2', p1: { x: 440, y: 410 }, p2: { x: 880, y: 410 }, wallType: 'normal' }
];

export const DEMO_GV_ROOM_ZONES: RoomAnnotation[] = [
  {
    id: 'gv-zone-g10',
    label: 'G10 - Infiltration Entry Parlor',
    roomNumber: 'G10',
    roomName: 'Infiltration Entry Parlor',
    bounds: { x: 12, y: 10, width: 32, height: 31 },
    polygonPoints: [12, 10, 44, 10, 44, 41, 12, 41],
    boxedText: 'A heavy oak door creaks slightly under your touch. Beyond lies a dim parlor with velvet drapes drawn tightly over boarded windows. A faint odor of bitter almond lingers near the lockplate.',
    dmNotes: 'TRAP: Loose doorknob linked to poison gas vial (DC 12 Perception to spot, DC 15 Thieves Tools to disarm). If triggered, releases a 10-ft sphere cloud (DC 14 Con save, 16 poison damage). Master keys held by Guildmaster Dusk and Elix the Saint.',
    color: '#f59e0b',
    pdfSection: 'Keys from the Golden Vault - Chapter: Masterpiece Imbroglio (Area G10)',
    pdfPage: 12,
    monsters: [
      { name: 'Bandit', hp: 11, ac: 12, cr: '1/8' },
      { name: 'Spy', hp: 27, ac: 12, cr: '1' }
    ]
  },
  {
    id: 'gv-zone-g21',
    label: 'G21 - The Raven Master\'s Roost',
    roomNumber: 'G21',
    roomName: 'The Raven Master\'s Roost',
    bounds: { x: 44, y: 10, width: 44, height: 31 },
    polygonPoints: [44, 10, 88, 10, 88, 41, 44, 41],
    boxedText: 'Perches line the ceiling where three jet-black ravens tilt their heads, scrutinizing you with eerie intelligence. An elderly man in patched robes stirs a foul-smelling stew over an iron brazier.',
    dmNotes: 'SECRET: The old man is Gwish, an Oni disguised via Change Shape! He carries a master key and wears a Ring of Animal Influence. His chest contains gnawed bones and an encrypted note: "Constantori in danger. Cognoscenti retaliation imminent."',
    color: '#8b5cf6',
    pdfSection: 'Keys from the Golden Vault - Chapter: Masterpiece Imbroglio (Area G21)',
    pdfPage: 16,
    monsters: [
      { name: 'Oni', hp: 110, ac: 16, cr: '7' }
    ]
  },
  {
    id: 'gv-zone-g26',
    label: 'G26 - Guildmaster Dusk\'s Quarters',
    roomNumber: 'G26',
    roomName: 'Guildmaster Dusk\'s Quarters',
    bounds: { x: 12, y: 41, width: 32, height: 31 },
    polygonPoints: [12, 41, 44, 41, 44, 72, 12, 72],
    boxedText: 'Silk carpets cushion your footsteps before an ornate four-poster bed. In the shadows, a silver-haired half-elf sleeps lightly, a poisoned rapier resting within arm\'s reach on the bedside table.',
    dmNotes: 'Guildmaster Dusk is an assassin (Lawful Evil half-elf). Asleep with lover noble Dartinal Livereth. Dusk carries the golden master key and is attuned to Constantori\'s Portrait above in G27.',
    color: '#ef4444',
    pdfSection: 'Keys from the Golden Vault - Chapter: Masterpiece Imbroglio (Area G26)',
    pdfPage: 19,
    monsters: [
      { name: 'Assassin', hp: 78, ac: 15, cr: '8' },
      { name: 'Noble', hp: 9, ac: 15, cr: '1/8' }
    ]
  },
  {
    id: 'gv-zone-g27',
    label: 'G27 - Tower Peak (Constantori\'s Vault)',
    roomNumber: 'G27',
    roomName: 'Tower Peak (Constantori\'s Vault)',
    bounds: { x: 44, y: 41, width: 44, height: 31 },
    polygonPoints: [44, 41, 88, 41, 88, 72, 44, 72],
    boxedText: 'High in the rafters of the tower rests an ornate golden frame resting atop a velvet-draped easel. The portrait of a haughty nobleman blinks in the dim light, its painted eyes fixing upon you with cold disdain.',
    dmNotes: 'CONSTANTORI\'S PORTRAIT (Sentient Wondrous Item, LE, Int 14, Wis 12, Cha 8). Telepathically linked to Dusk. Expends charges to cast Magic Missile at intruders. Trapped with poison gas canisters behind the canvas (DC 15 Sleight of Hand to counterweight).',
    color: '#10b981',
    pdfSection: 'Keys from the Golden Vault - Chapter: Masterpiece Imbroglio (Area G27)',
    pdfPage: 21,
    monsters: [
      { name: 'Animated Armor', hp: 33, ac: 18, cr: '1' }
    ]
  }
];

export const DEMO_GV_PDF_DIGEST: ChapterPdfDigest = {
  pdfFilename: 'Keys_from_the_Golden_Vault_Masterpiece_Imbroglio.pdf',
  pdfUrl: '',
  adventureTitle: 'Keys from the Golden Vault',
  chapterTitle: 'Masterpiece Imbroglio',
  digestSummary: 'The Agile Hand thieves guild stole Constantori\'s Portrait from Cognoscenti Esoterica. Operatives must infiltrate the guildhouse, navigate poison gas traps, evade disguised monsters, and recover the sentient painting.',
  digestedAt: Date.now(),
  scenes: [
    {
      sceneTitle: 'Agile Hand Guildhouse (Ground Floor & Vault)',
      summary: 'Infiltrating the thieves guildhouse, bypassing security, and recovering Constantori\'s sentient painting.',
      keyNpcs: ['Guildmaster Dusk', 'Gwish (disguised Oni)', 'Jaymont the Sinner', 'Dartinal Livereth'],
      trapsAndHazards: ['G10 Poison Gas Doorknob', 'G27 Gas Canisters behind Frame', 'Floorboard Creaks (Disadvantage on Stealth)'],
      loot: ['Constantori\'s Portrait', 'Lantern of Revealing', 'Necklace of Fireballs', 'Gold Master Keys'],
      roomNumbers: ['G10', 'G21', 'G26', 'G27']
    }
  ],
  rooms: [
    {
      roomNumber: 'G10',
      roomName: 'Infiltration Entry Parlor',
      boxedText: 'A heavy oak door creaks slightly under your touch. Beyond lies a dim parlor with velvet drapes drawn tightly over boarded windows. A faint odor of bitter almond lingers near the lockplate.',
      dmNotes: 'TRAP: Loose doorknob linked to poison gas vial (DC 12 Perception to spot, DC 15 Thieves Tools to disarm). If triggered, releases a 10-ft sphere cloud (DC 14 Con save, 16 poison damage). Master keys held by Guildmaster Dusk and Elix the Saint.',
      monsters: ['Bandit', 'Spy'],
      treasure: ['25 sp', 'Deed to 2 draft horses']
    },
    {
      roomNumber: 'G21',
      roomName: 'The Raven Master\'s Roost',
      boxedText: 'Perches line the ceiling where three jet-black ravens tilt their heads, scrutinizing you with eerie intelligence. An elderly man in patched robes stirs a foul-smelling stew over an iron brazier.',
      dmNotes: 'SECRET: The old man is Gwish, an Oni disguised via Change Shape! He carries a master key and wears a Ring of Animal Influence. His chest contains gnawed bones and an encrypted note: "Constantori in danger. Cognoscenti retaliation imminent."',
      monsters: ['Oni'],
      treasure: ['Ring of Animal Influence', 'Master Key']
    },
    {
      roomNumber: 'G26',
      roomName: 'Guildmaster Dusk\'s Quarters',
      boxedText: 'Silk carpets cushion your footsteps before an ornate four-poster bed. In the shadows, a silver-haired half-elf sleeps lightly, a poisoned rapier resting within arm\'s reach on the bedside table.',
      dmNotes: 'Guildmaster Dusk is an assassin (Lawful Evil half-elf). Asleep with lover noble Dartinal Livereth. Dusk carries the golden master key and is attuned to Constantori\'s Portrait above in G27.',
      monsters: ['Assassin', 'Noble'],
      treasure: ['Golden Master Key', 'Poisoned Rapier', 'Gold signet ring (100 gp)']
    },
    {
      roomNumber: 'G27',
      roomName: 'Tower Peak (Constantori\'s Vault)',
      boxedText: 'High in the rafters of the tower rests an ornate golden frame resting atop a velvet-draped easel. The portrait of a haughty nobleman blinks in the dim light, its painted eyes fixing upon you with cold disdain.',
      dmNotes: 'CONSTANTORI\'S PORTRAIT (Sentient Wondrous Item, LE, Int 14, Wis 12, Cha 8). Telepathically linked to Dusk. Expends charges to cast Magic Missile at intruders. Trapped with poison gas canisters behind the canvas (DC 15 Sleight of Hand to counterweight).',
      monsters: ['Animated Armor'],
      treasure: ['Constantori\'s Portrait', 'Lantern of Revealing']
    }
  ]
};

export const DEMO_GV_SCENE: Scene = {
  sceneId: 'scene-gv-agile-hand-guildhouse',
  sceneTitle: 'Agile Hand Guildhouse (Ground Floor & Vault)',
  mapUrl: subterraneanMazeImg,
  dmNotes: 'ADVENTURE: Masterpiece Imbroglio (Keys from the Golden Vault)\nMISSION: Infiltrate the Agile Hand thieves guildhouse and recover Constantori\'s sentient painting.\nSECURITY: Master keys are carried by Guildmaster Dusk (G26) and Gwish (G21).\nSTEALTH: Warped hardwood floorboards give disadvantage on stealth checks in the upper quarters.',
  tokens: [
    {
      id: 'tok-gv-bandit-lookout',
      name: 'Agile Hand Lookout',
      avatarUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=150&q=80',
      x: 280,
      y: 220,
      hp: 11,
      ac: 12,
      size: 1,
      isMonster: true,
      category: 'monster'
    },
    {
      id: 'tok-gv-gwish-oni',
      name: 'Gwish (Disguised Oni)',
      avatarUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=150&q=80',
      x: 660,
      y: 240,
      hp: 110,
      ac: 16,
      size: 2,
      isMonster: true,
      category: 'monster'
    },
    {
      id: 'tok-gv-guildmaster-dusk',
      name: 'Guildmaster Dusk',
      avatarUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=150&q=80',
      x: 260,
      y: 560,
      hp: 78,
      ac: 15,
      size: 1,
      isMonster: true,
      category: 'monster'
    }
  ],
  gridSize: 50,
  gridOpacity: 0.25,
  isFogVisible: true,
  walls: DEMO_GV_WALLS,
  visionConfig: {
    enabled: true,
    explorationMemory: true,
    darknessOpacity: 0.85,
    dimVisionOpacity: 0.35,
    ambientLight: false,
    dmPreviewMode: true,
    showDoorBadges: true
  },
  roomAnnotations: DEMO_GV_ROOM_ZONES
};

export const DEMO_GV_CHAPTER: Chapter = {
  chapterId: 'chap-gv-masterpiece-imbroglio',
  chapterTitle: 'Masterpiece Imbroglio: Agile Hand Guildhouse',
  orderIndex: 0,
  pdfFilename: 'Keys_from_the_Golden_Vault_Masterpiece_Imbroglio.pdf',
  pdfDigest: DEMO_GV_PDF_DIGEST,
  scenes: [DEMO_GV_SCENE]
};

export const DEMO_GV_CAMPAIGN: Campaign = {
  campaignId: 'keys-from-golden-vault-agile-hand',
  campaignTitle: 'The Guild from GV (Agile Hand Guildhouse)',
  description: 'Keys from the Golden Vault: Masterpiece Imbroglio. Operatives infiltrate the Agile Hand thieves guildhouse to recover Constantori\'s occult sentient portrait.',
  createdAt: 1700000000000,
  chapters: [DEMO_GV_CHAPTER]
};
