import type { Campaign, Chapter, Scene, SceneToken } from '../lib/firebase';
import type { RoomAnnotation } from '../types';
import {
  CAMPAIGN_MAP_SPECS,
  compileCampaignMapToBlueprint,
  type DeclarativeCampaignMapSpec,
  type RoomSpec,
} from '@mistwalker/3d';
import { CHARACTER_TOKEN_IMAGES } from './defaultCharacters';
import { DEMO_GV_CAMPAIGN, DEMO_GV_CHAPTER, DEMO_GV_SCENE, DEMO_GV_ROOM_ZONES, DEMO_GV_TOKENS, DEMO_GV_PDF_DIGEST } from './demoCampaignGv';

const CELL_PX = 64;

/**
 * Generates an inline SVG token medallion for any monster or boss so 2D mode
 * always displays a crisp, color-coded portrait token while 3D mode renders
 * its GLB/STL miniature via `model3d`.
 */
function createMonsterBadgeDataUri(name: string, colorHex = '#ef4444', role = 'melee'): string {
  const clean = (name || 'Monster').replace(/\(.*?\)/g, '').trim();
  const words = clean.split(/[\s\-]+/).filter(Boolean);
  const initials =
    words.length >= 2
      ? `${words[0][0] || ''}${words[words.length - 1][0] || ''}`.toUpperCase()
      : (clean.slice(0, 2) || 'M').toUpperCase();
  const isBoss = role === 'boss';
  const ringColor = isBoss ? '#f59e0b' : colorHex;
  const bgInner = isBoss ? '#450a0a' : '#1e1b4b';
  const crownSvg = isBoss
    ? '<path d="M36 24 L44 34 L50 22 L56 34 L64 24 L61 38 L39 38 Z" fill="#fbbf24" stroke="#78350f" stroke-width="1.5"/>'
    : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="160" height="160">
    <defs>
      <radialGradient id="g" cx="50%" cy="38%" r="60%">
        <stop offset="0%" stop-color="${colorHex}" stop-opacity="0.95"/>
        <stop offset="70%" stop-color="${bgInner}" stop-opacity="0.98"/>
        <stop offset="100%" stop-color="#090d16" stop-opacity="1"/>
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="46" fill="url(#g)" stroke="${ringColor}" stroke-width="${isBoss ? 6 : 4}"/>
    <circle cx="50" cy="50" r="39" fill="none" stroke="#ffffff" stroke-opacity="0.22" stroke-width="1.5"/>
    ${crownSvg}
    <text x="50" y="${isBoss ? 66 : 59}" font-family="system-ui, sans-serif" font-size="${isBoss ? 28 : 30}" font-weight="800" fill="#ffffff" text-anchor="middle">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function mapFloorSurfaceToTileMaterial(floorMat: RoomSpec['floorMat']): string {
  switch (floorMat) {
    case 'wood':
      return 'wood';
    case 'crypt':
    case 'obsidian':
    case 'runic':
    case 'vortex_tiles':
    case 'crystal':
      return 'crypt';
    case 'volcanic':
    case 'crimson':
      return 'lava';
    case 'acid':
      return 'water';
    default:
      return 'stone';
  }
}

function parseRoomCodeAndTitle(rawName: string, fallbackIndex: number): { roomNumber: string; roomName: string; label: string } {
  const colonIdx = rawName.indexOf(':');
  if (colonIdx > 0 && colonIdx <= 14) {
    const roomNumber = rawName.slice(0, colonIdx).trim();
    const roomName = rawName.slice(colonIdx + 1).trim();
    return {
      roomNumber,
      roomName,
      label: `${roomNumber} - ${roomName}`,
    };
  }
  const roomNumber = `A${fallbackIndex + 1}`;
  return {
    roomNumber,
    roomName: rawName.trim(),
    label: rawName.trim(),
  };
}

/**
 * Compiles a DeclarativeCampaignMapSpec from @mistwalker/3d into a complete
 * 2D + 3D MistWalker Scene (with pixel-aligned walls, doors, secret doors,
 * percentage roomAnnotations, pre-placed tokens, and scene3d state).
 */
export function compileSpecToMistWalkerScene(
  spec: DeclarativeCampaignMapSpec,
  campaignId: string
): Scene {
  const bp = compileCampaignMapToBlueprint(spec, CELL_PX);
  const mapWidth = spec.gridW * CELL_PX;
  const mapHeight = spec.gridH * CELL_PX;

  // 1. Build RoomAnnotations (percentage coordinates 0..100 for 2D & 3D synchronization)
  const roomAnnotations: RoomAnnotation[] = spec.rooms.map((room, idx) => {
    const xPct = (room.gx / spec.gridW) * 100;
    const yPct = (room.gz / spec.gridH) * 100;
    const wPct = (room.w / spec.gridW) * 100;
    const hPct = (room.h / spec.gridH) * 100;
    const x2Pct = xPct + wPct;
    const y2Pct = yPct + hPct;

    const roomEnemies = spec.enemies.filter((e) => e.zoneId === room.id);
    const monsterCounts = new Map<string, number>();
    for (const enemy of roomEnemies) {
      monsterCounts.set(enemy.name, (monsterCounts.get(enemy.name) || 0) + 1);
    }
    const monstersList = Array.from(monsterCounts.entries()).map(([mName, count]) =>
      count > 1 ? `${count}x ${mName}` : mName
    );

    const roomInteractables = (spec.interactables || []).filter(
      (it) =>
        it.gx >= room.gx - 1 &&
        it.gx <= room.gx + room.w + 1 &&
        it.gz >= room.gz - 1 &&
        it.gz <= room.gz + room.h + 1
    );

    const dmNotesParts: string[] = [];
    if (room.isBossRoom) {
      dmNotesParts.push('BOSS ENCOUNTER CHAMBER.');
    }
    if (monstersList.length > 0) {
      dmNotesParts.push(`Creatures Present: ${monstersList.join(', ')}.`);
    }
    if (roomInteractables.length > 0) {
      dmNotesParts.push(
        `Points of Interest / Secrets:\n` +
          roomInteractables
            .map(
              (it) =>
                `• ${it.label}${it.dcPerception ? ` (Perception DC ${it.dcPerception})` : ''}${
                  it.rewardBuff ? ` — Reward: ${it.rewardBuff}` : ''
                }`
            )
            .join('\n')
      );
    }
    dmNotesParts.push(`Architecture: ${room.floorMat} floor, ${room.wallMat} walls.`);

    const { roomNumber, roomName, label } = parseRoomCodeAndTitle(room.name, idx);

    return {
      id: `zone_${spec.id}_${room.id}`,
      type: 'room',
      label,
      roomNumber,
      roomName,
      bounds: {
        x: xPct,
        y: yPct,
        width: wPct,
        height: hPct,
      },
      polygonPoints: [xPct, yPct, x2Pct, yPct, x2Pct, y2Pct, xPct, y2Pct],
      boxedText: room.narration,
      dmNotes: dmNotesParts.join('\n\n'),
      color: room.isBossRoom ? '#ef4444' : '#f59e0b',
      campaignId,
      sceneId: `scene-${spec.id}`,
      monsters: monstersList,
      hiddenMonsterNames: [],
    };
  });

  // 2. Build Tokens (2D top-left pixel coordinates: gx * CELL_PX, gz * CELL_PX)
  const heroAvatarLookup: Record<string, { avatarUrl: string; characterId: string }> = {
    hero_stavros: {
      avatarUrl: CHARACTER_TOKEN_IMAGES['stavros'],
      characterId: 'char_stavros',
    },
    hero_rowan: {
      avatarUrl: CHARACTER_TOKEN_IMAGES['rowan'],
      characterId: 'char_rowan',
    },
    hero_noctua: {
      avatarUrl: CHARACTER_TOKEN_IMAGES['noctua'],
      characterId: 'char_noctua',
    },
    hero_zaltan: {
      avatarUrl: CHARACTER_TOKEN_IMAGES['zaltan'],
      characterId: 'char_zaltan',
    },
  };

  const tokens: SceneToken[] = (bp ? bp.combatants : []).map((c) => {
    const isHero = c.team === 'hero';
    const heroMeta = heroAvatarLookup[c.id];
    const avatarUrl = isHero
      ? heroMeta?.avatarUrl || CHARACTER_TOKEN_IMAGES['stavros']
      : createMonsterBadgeDataUri(c.name, c.color || '#ef4444', c.role);

    const format = c.modelUrl?.toLowerCase().endsWith('.stl') ? 'stl' : 'glb';
    const tok: SceneToken & Record<string, any> = {
      id: `${spec.id}_${c.id}`,
      name: c.name,
      avatarUrl,
      url: avatarUrl,
      x: Math.round(c.gx * CELL_PX),
      y: Math.round(c.gz * CELL_PX),
      size: c.sizeSquares || 1,
      hp: c.maxHp,
      maxHp: c.maxHp,
      currentHp: c.maxHp,
      ac: c.ac,
      speed: c.speedFt,
      elevation: c.elevationFt || 0,
      isFlying: Boolean(c.elevationFt && c.elevationFt >= 10 && c.role !== 'hero'),
      isPlayer: isHero,
      isMonster: !isHero,
      category: isHero ? 'character' : 'monster',
      visionEnabled: isHero,
      visionRadius: c.visionRangeFt || 60,
      ...(heroMeta?.characterId ? { characterId: heroMeta.characterId } : {}),
      ...(c.modelUrl
        ? {
            model3d: {
              assetId: c.id,
              url: c.modelUrl,
              format,
              baseColor: c.color,
            },
          }
        : {}),
      customMonsterData: !isHero
        ? {
            isCustom: true,
            name: c.name,
            ac: c.ac,
            hp: c.maxHp,
            speed: `${c.speedFt} ft.`,
            avatarUrl,
            role: c.role,
            abilities: c.abilities,
          }
        : undefined,
    };
    return tok;
  });

  // 3. Build sparse 3D tile map + Scene3DState so 3D viewport renders platforms, water/lava, props, and relief
  const tiles: Record<string, string> = {};
  for (const room of spec.rooms) {
    const tileMat = mapFloorSurfaceToTileMaterial(room.floorMat);
    for (let gx = Math.floor(room.gx); gx < Math.ceil(room.gx + room.w); gx++) {
      for (let gz = Math.floor(room.gz); gz < Math.ceil(room.gz + room.h); gz++) {
        if (gx >= 0 && gx < spec.gridW && gz >= 0 && gz < spec.gridH) {
          tiles[`${gx},${gz}`] = tileMat;
        }
      }
    }
  }

  const primaryWallMat = spec.rooms[0]?.wallMat || 'ashlar_stone';
  const scene3d = {
    version: 1 as const,
    floorMode: 'map' as const,
    reliefStrength: spec.reliefScale ?? 0.35,
    gridW: spec.gridW,
    gridH: spec.gridH,
    cellPx: CELL_PX,
    tiles,
    props: bp?.props || spec.props || [],
    platforms: bp?.platforms || spec.platforms || [],
    waterMode: spec.waterMode || 'off',
    waterLevel: spec.waterLevel ?? -0.28,
    wallDisplayMode: 'cutaway' as const,
    defaultWallMaterial: primaryWallMat,
    defaultDoorMaterial: 'door_oak',
    moodLight: true,
    fogEnabled: true,
    updatedAt: 1700000000000,
  };

  const dmNotesHeader = [
    `ADVENTURE: ${spec.chapterLabel} — ${spec.title}`,
    `SUBTITLE: ${spec.subtitle}`,
    `GRID: ${spec.gridW}×${spec.gridH} squares (${mapWidth}×${mapHeight} px @ ${CELL_PX}px/grid)`,
    '',
    'ROOMS & ENCOUNTER ZONES:',
    ...spec.rooms.map((r) => `• ${r.name}: ${r.narration}`),
  ].join('\n');

  const scene: Scene & { scene3d?: any } = {
    sceneId: `scene-${spec.id}`,
    sceneTitle: `${spec.title} (${spec.subtitle})`,
    mapUrl: spec.mapUrl,
    mapWidth,
    mapHeight,
    dmNotes: dmNotesHeader,
    tokens,
    gridSize: CELL_PX,
    gridOpacity: 0.28,
    gridVisible: true,
    isFogVisible: true,
    walls: bp?.walls || [],
    visionConfig: {
      enabled: true,
      explorationMemory: true,
      darknessOpacity: 0.85,
      dimVisionOpacity: 0.4,
      ambientLight: false,
      dmPreviewMode: true,
      showDoorBadges: true,
    },
    roomAnnotations,
    scene3d,
    updatedAt: 1700000000000,
  };

  return scene;
}

const VEOR_CHAPTER_DEFS: Array<{
  chapterId: string;
  chapterLabelMatch: string[];
  chapterTitle: string;
  orderIndex: number;
}> = [
  {
    chapterId: 'veor-chap-7-tomb-of-wayward-souls',
    chapterLabelMatch: ['Eve of Ruin • Ch. 7'],
    chapterTitle: 'Chapter 7: Tomb of Wayward Souls (Oerth)',
    orderIndex: 0,
  },
  {
    chapterId: 'veor-chap-8-red-belvedere',
    chapterLabelMatch: ['Eve of Ruin • Ch. 8'],
    chapterTitle: 'Chapter 8: The Red Belvedere & Casino (Avernus)',
    orderIndex: 1,
  },
  {
    chapterId: 'veor-chap-9-pandesmos-outlook',
    chapterLabelMatch: ['Eve of Ruin • Ch. 9'],
    chapterTitle: 'Chapter 9: The Betrayer’s Pursuit (Pandemonium)',
    orderIndex: 2,
  },
  {
    chapterId: 'veor-chap-10-depths-of-pandemonium',
    chapterLabelMatch: ['Eve of Ruin • Ch. 10'],
    chapterTitle: 'Chapter 10: The Ruinous Citadel & Carapace Ridge (Pandemonium)',
    orderIndex: 3,
  },
  {
    chapterId: 'veor-chap-11-eve-of-ruin',
    chapterLabelMatch: ['Eve of Ruin • Ch. 11', 'Eve of Ruin • Ch. 11 Finale'],
    chapterTitle: 'Chapter 11: The Cave of Shattered Reflection (Finale)',
    orderIndex: 4,
  },
];

let cachedVeorCampaign: Campaign | null = null;
let cachedGoldenVaultCampaign: Campaign | null = null;

/**
 * Returns the complete prebuilt "Vecna: Eve of Ruin" campaign (Chapters 7–11, 15 battlemaps)
 * compiled from @mistwalker/3d's CAMPAIGN_MAP_SPECS when available.
 */
export function getPrebuiltVecnaCampaign(): Campaign | null {
  if (cachedVeorCampaign) return cachedVeorCampaign;
  const specs = Array.isArray(CAMPAIGN_MAP_SPECS)
    ? CAMPAIGN_MAP_SPECS.filter((s) => s.campaign === 'vecna-eve-of-ruin')
    : [];
  if (specs.length === 0) return null;

  const campaignId = 'vecna-eve-of-ruin';
  const chapters: Chapter[] = VEOR_CHAPTER_DEFS.map((def) => {
    const matchingSpecs = specs.filter((s) => def.chapterLabelMatch.includes(s.chapterLabel));
    return {
      chapterId: def.chapterId,
      chapterTitle: def.chapterTitle,
      orderIndex: def.orderIndex,
      scenes: matchingSpecs.map((spec) => compileSpecToMistWalkerScene(spec, campaignId)),
    };
  }).filter((ch) => ch.scenes.length > 0);

  cachedVeorCampaign = {
    campaignId,
    campaignTitle: 'Vecna: Eve of Ruin',
    description:
      'High-level multiverse campaign (Levels 16–20) across Oerth, Avernus, and Pandemonium to reassemble the Rod of Seven Parts, defeat Kas the Betrayer, and stop Vecna the Archlich in the Cave of Shattered Reflection. Includes 15 full 2D/3D tactical battlemaps with walls, doors, secret doors, room annotations, elevated platforms, and 3D miniatures.',
    createdAt: 1700000001000,
    updatedAt: 1700000001000,
    chapters,
  };

  return cachedVeorCampaign;
}

/**
 * Returns "Keys to the Golden Vault" enriched with Chapter 7: Axe from the Grave
 * (Skalderang Conservatory & Dartwild Cabin) alongside Masterpiece Imbroglio.
 */
export function getPrebuiltGoldenVaultCampaign(): Campaign {
  if (cachedGoldenVaultCampaign) return cachedGoldenVaultCampaign;
  const axeSpec = Array.isArray(CAMPAIGN_MAP_SPECS)
    ? CAMPAIGN_MAP_SPECS.find((s) => s.id === 'axe-conservatory')
    : undefined;

  if (!axeSpec) {
    return DEMO_GV_CAMPAIGN;
  }

  const axeScene = compileSpecToMistWalkerScene(axeSpec, DEMO_GV_CAMPAIGN.campaignId);
  const axeChapter: Chapter = {
    chapterId: 'chap-gv-axe-from-the-grave',
    chapterTitle: 'Chapter 7: Axe from the Grave (Skalderang Conservatory)',
    orderIndex: 1,
    scenes: [axeScene],
  };

  cachedGoldenVaultCampaign = {
    ...DEMO_GV_CAMPAIGN,
    chapters: [...DEMO_GV_CAMPAIGN.chapters, axeChapter],
  };
  return cachedGoldenVaultCampaign;
}

/**
 * Merges a single Firestore campaign with a prebuilt campaign definition so that:
 * 1. Any user-saved chapters and scenes in Firestore are preserved.
 * 2. Any prebuilt chapters or scenes not yet in the Firestore doc (such as Chapters 7–11 of Vecna
 *    or Chapter 7 Axe from the Grave in Golden Vault) are automatically appended.
 * 3. Prebuilt roomAnnotations, walls, tokens, and scene3d metadata are hydrated if missing on the saved scene.
 */
function mergeCampaignWithPrebuilt(saved: Campaign, prebuilt: Campaign): Campaign {
  const prebuiltChaptersById = new Map<string, Chapter>();
  for (const pch of prebuilt.chapters) {
    prebuiltChaptersById.set(pch.chapterId, pch);
  }

  const mergedChapters: Chapter[] = (saved.chapters || []).map((ch) => {
    const pch = prebuiltChaptersById.get(ch.chapterId);
    if (!pch) return ch;

    const prebuiltScenesById = new Map<string, Scene>();
    for (const psc of pch.scenes) {
      prebuiltScenesById.set(psc.sceneId, psc);
    }

    const mergedScenes: Scene[] = (ch.scenes || []).map((sc) => {
      const psc = prebuiltScenesById.get(sc.sceneId);
      if (!psc) return sc;
      return {
        ...psc,
        ...sc,
        walls: Array.isArray(sc.walls) && sc.walls.length > 0 ? sc.walls : psc.walls,
        roomAnnotations:
          Array.isArray(sc.roomAnnotations) && sc.roomAnnotations.length > 0
            ? sc.roomAnnotations
            : psc.roomAnnotations,
        tokens: Array.isArray(sc.tokens) && sc.tokens.length > 0 ? sc.tokens : psc.tokens,
        ...((sc as any).scene3d || (psc as any).scene3d
          ? { scene3d: (sc as any).scene3d || (psc as any).scene3d }
          : {}),
      };
    });

    // Append any prebuilt scenes in this chapter that aren't in Firestore yet
    for (const psc of pch.scenes) {
      if (!mergedScenes.some((s) => s.sceneId === psc.sceneId)) {
        mergedScenes.push(psc);
      }
    }

    return {
      ...pch,
      ...ch,
      pdfDigest: ch.pdfDigest || pch.pdfDigest || (ch.chapterId === DEMO_GV_CHAPTER.chapterId ? DEMO_GV_PDF_DIGEST : undefined),
      scenes: mergedScenes,
    };
  });

  // Append any prebuilt chapters that aren't in Firestore yet
  for (const pch of prebuilt.chapters) {
    if (!mergedChapters.some((ch) => ch.chapterId === pch.chapterId)) {
      mergedChapters.push(pch);
    }
  }

  return {
    ...prebuilt,
    ...saved,
    chapters: mergedChapters,
  };
}

/**
 * Enriches the Firestore campaigns list with all prebuilt 2D/3D campaigns:
 * - "Keys to the Golden Vault" (Masterpiece Imbroglio + Ch. 7 Axe from the Grave)
 * - "Vecna: Eve of Ruin" (Chapters 7–11, 15 full 2D+3D tactical maps)
 */
export function mergePrebuiltCampaigns(firestoreCampaigns: Campaign[]): Campaign[] {
  const gvPrebuilt = getPrebuiltGoldenVaultCampaign();
  const veorPrebuilt = getPrebuiltVecnaCampaign();

  const prebuilts: Campaign[] = [gvPrebuilt, ...(veorPrebuilt ? [veorPrebuilt] : [])];
  const prebuiltById = new Map<string, Campaign>();
  for (const p of prebuilts) {
    prebuiltById.set(p.campaignId, p);
  }

  const seenPrebuiltIds = new Set<string>();
  const mergedList: Campaign[] = firestoreCampaigns.map((c) => {
    // Match by campaignId OR by normalized title ("Vecna: Eve of Ruin")
    let matchedPrebuilt = prebuiltById.get(c.campaignId);
    if (!matchedPrebuilt && veorPrebuilt && c.campaignTitle?.trim().toLowerCase() === 'vecna: eve of ruin') {
      matchedPrebuilt = veorPrebuilt;
    }
    if (!matchedPrebuilt) return c;
    seenPrebuiltIds.add(matchedPrebuilt.campaignId);
    return mergeCampaignWithPrebuilt(c, matchedPrebuilt);
  });

  const missingPrebuilts = prebuilts.filter((p) => !seenPrebuiltIds.has(p.campaignId));
  return [...missingPrebuilts, ...mergedList];
}
