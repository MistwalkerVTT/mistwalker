import * as pdfjsLib from 'pdfjs-dist';
import { uploadAndRegisterAsset, saveSceneToCampaign, saveMonster, getMonstersList } from '../lib/firebase';
import { Scene, RoomAnnotation, WallSegment, UploadedAsset } from '../types';
import { Monster } from '../types/monster';
import { snapPointToGrid, snapToGrid } from '../lib/visionEngine';
import { getAiHeaders } from './aiService';

// Ensure PDF.js worker is properly configured
function ensurePdfWorker() {
  if (typeof window === 'undefined') return;
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();
    } catch {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    }
  }
}

export interface ParsedRoom {
  roomNumber: string;
  roomName: string;
  boxedText: string;
  dmNotes: string;
  monsters: string[];
  approximateNormalizedBounds: {
    x: number; // 0 to 100 percentage
    y: number; // 0 to 100 percentage
    width: number; // 0 to 100 percentage
    height: number; // 0 to 100 percentage
  };
}

export interface ParsedScene {
  sceneTitle: string;
  mapPageNumber?: number;
  rooms: ParsedRoom[];
}

export interface ParsedChapter {
  chapterTitle: string;
  allMonsters?: string[];
  scenes: ParsedScene[];
}

export interface ExtractedMapResult {
  file: File;
  dataUrl: string;
  width: number;
  height: number;
  numPages: number;
  pageNumber: number;
}

export interface IngestionPipelineStep {
  step: 'parsing_text' | 'extracting_maps' | 'locating_rooms' | 'generating_walls' | 'ingesting_monsters' | 'complete';
  message: string;
  progressPercent: number;
}

/**
 * Helper to convert browser File to base64 string
 */
export async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const commaIdx = res.indexOf(',');
      resolve(commaIdx !== -1 ? res.substring(commaIdx + 1) : res);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Step 1: Document Analysis with Gemini API
 * Calls Gemini multimodal API to analyze the PDF chapter and extract structured scenes,
 * room annotations, boxed text, DM notes, and approximate normalized coordinates.
 */
export async function parsePdfChapterWithGemini(
  pdfFile: File,
  options?: {
    chapterTitle?: string;
    campaignTitle?: string;
    onProgress?: (status: IngestionPipelineStep) => void;
  }
): Promise<ParsedChapter> {
  options?.onProgress?.({
    step: 'parsing_text',
    message: 'Uploading and analyzing adventure document with Gemini multimodal model...',
    progressPercent: 15
  });

  let pdfPath: string | undefined;
  let pdfBase64: string | undefined;

  // If the file is large (> 10MB), upload via server /api/upload first for disk stream ingestion
  if (pdfFile.size > 10 * 1024 * 1024) {
    options?.onProgress?.({
      step: 'parsing_text',
      message: 'Streaming large chapter PDF to high-throughput server cache...',
      progressPercent: 20
    });
    const formData = new FormData();
    formData.append('file', pdfFile);
    formData.append('type', 'pdf');
    const uploadRes = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    if (uploadRes.ok) {
      const uploadJson = await uploadRes.json();
      pdfPath = uploadJson.url;
    } else {
      pdfBase64 = await readFileAsBase64(pdfFile);
    }
  } else {
    pdfBase64 = await readFileAsBase64(pdfFile);
  }

  options?.onProgress?.({
    step: 'parsing_text',
    message: 'Gemini extracting narrative scenes, room keys, verbatim boxed text, and map coordinates...',
    progressPercent: 30
  });

  const headers = getAiHeaders();
  const res = await fetch('/api/ai/ingest-chapter-pdf', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      pdfPath,
      pdfBase64,
      chapterTitle: options?.chapterTitle || pdfFile.name.replace(/\.[^/.]+$/, ''),
      campaignTitle: options?.campaignTitle || 'Campaign'
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server returned status ${res.status} during chapter PDF parsing`);
  }

  const data = await res.json();
  if (!data.parsedChapter) {
    throw new Error('Gemini API did not return structured chapter data');
  }

  return data.parsedChapter as ParsedChapter;
}

/**
 * Step 2: Map Image Extraction via pdfjs-dist
 * Renders the battlemap page at full resolution (scale 2.0x+) to a clean PNG asset.
 */
export async function extractBattlemapPage(
  pdfData: File | ArrayBuffer | Uint8Array,
  pageNumber: number = 1,
  options?: {
    scale?: number;
    sceneTitle?: string;
    onProgress?: (status: IngestionPipelineStep) => void;
  }
): Promise<ExtractedMapResult> {
  ensurePdfWorker();

  options?.onProgress?.({
    step: 'extracting_maps',
    message: `Rendering high-resolution tactical battlemap from PDF (Page ${pageNumber})...`,
    progressPercent: 50
  });

  let arrayBuffer: ArrayBuffer;
  if (pdfData instanceof File) {
    arrayBuffer = await pdfData.arrayBuffer();
  } else if (pdfData instanceof Uint8Array) {
    arrayBuffer = pdfData.buffer;
  } else {
    arrayBuffer = pdfData;
  }

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: 'https://unpkg.com/pdfjs-dist@legacy/cmaps/',
    cMapPacked: true
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const safePageNum = Math.max(1, Math.min(numPages, pageNumber));

  const page = await pdfDoc.getPage(safePageNum);
  const scale = options?.scale ?? 2.0; // 2x gives 2000-3000px crisp tactical resolution
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not initialize 2D canvas for PDF map rendering');

  await page.render({
    canvasContext: ctx,
    viewport,
    canvas
  } as any).promise;

  const dataUrl = canvas.toDataURL('image/png', 0.95);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Failed to convert canvas to blob'));
    }, 'image/png', 0.95);
  });

  const cleanTitle = (options?.sceneTitle || 'Battlemap').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const filename = `${cleanTitle}_p${safePageNum}.png`;
  const file = new File([blob], filename, { type: 'image/png' });

  return {
    file,
    dataUrl,
    width: canvas.width,
    height: canvas.height,
    numPages,
    pageNumber: safePageNum
  };
}

/**
 * Step 3: Autonomous Geometry Generation
 * Converts approximateNormalizedBounds (0-100%) into RoomAnnotation objects for RoomHotspotLayer.
 */
export function generateRoomAnnotations(
  rooms: ParsedRoom[],
  sceneTitle: string,
  campaignId?: string,
  sceneId?: string
): RoomAnnotation[] {
  return rooms.map((room, idx) => {
    const rawX = room.approximateNormalizedBounds?.x ?? (10 + (idx * 16) % 64);
    const rawY = room.approximateNormalizedBounds?.y ?? (10 + Math.floor((idx * 16) / 64) * 20);
    const rawW = room.approximateNormalizedBounds?.width ?? 20;
    const rawH = room.approximateNormalizedBounds?.height ?? 18;

    const normX = Math.max(0, Math.min(95, Number(rawX) || 10));
    const normY = Math.max(0, Math.min(95, Number(rawY) || 10));
    const normW = Math.max(3, Math.min(100 - normX, Number(rawW) || 20));
    const normH = Math.max(3, Math.min(100 - normY, Number(rawH) || 18));

    const id = `room_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
    const label = room.roomNumber && room.roomName
      ? `${room.roomNumber}: ${room.roomName}`
      : room.roomNumber || room.roomName || `Area ${idx + 1}`;

    return {
      id,
      label,
      roomNumber: room.roomNumber || `${idx + 1}`,
      roomName: room.roomName || `Area ${idx + 1}`,
      bounds: {
        x: normX,
        y: normY,
        width: normW,
        height: normH
      },
      polygonPoints: [
        normX, normY,
        normX + normW, normY,
        normX + normW, normY + normH,
        normX, normY + normH
      ],
      boxedText: room.boxedText || '',
      dmNotes: room.dmNotes || '',
      monsters: room.monsters || [],
      color: '#f59e0b',
      pdfSection: `${sceneTitle} - ${label}`,
      campaignId,
      sceneId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  });
}

interface RoomPixelBox {
  roomId: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Step 3b: Autonomous Wall & Door Generation
 * Generates rectangular WallSegment arrays enclosing each room, grid-snapped via snapPointToGrid.
 * Where two room boundaries meet, generates a WallSegment with wallType: 'door' and doorState: 'closed'.
 */
export function generateBaselineWalls(
  rooms: ParsedRoom[],
  mapWidth: number,
  mapHeight: number,
  gridSize: number = 50
): WallSegment[] {
  if (!rooms || rooms.length === 0) return [];

  // Convert each room to grid-snapped pixel box
  const boxes: RoomPixelBox[] = rooms.map((room, idx) => {
    const rawX = (Number(room.approximateNormalizedBounds?.x || 10) / 100) * mapWidth;
    const rawY = (Number(room.approximateNormalizedBounds?.y || 10) / 100) * mapHeight;
    const rawW = (Number(room.approximateNormalizedBounds?.width || 20) / 100) * mapWidth;
    const rawH = (Number(room.approximateNormalizedBounds?.height || 20) / 100) * mapHeight;

    const pTL = snapPointToGrid(rawX, rawY, gridSize);
    const pBR = snapPointToGrid(rawX + rawW, rawY + rawH, gridSize);

    let left = pTL.x;
    let top = pTL.y;
    let right = pBR.x;
    let bottom = pBR.y;

    if (right <= left) right = left + gridSize;
    if (bottom <= top) bottom = top + gridSize;

    return {
      roomId: room.roomNumber || `r_${idx}`,
      left,
      right,
      top,
      bottom
    };
  });

  const wallSegments: WallSegment[] = [];
  const processedEdges = new Set<string>();

  const makeEdgeKey = (x1: number, y1: number, x2: number, y2: number) => {
    if (x1 < x2 || (x1 === x2 && y1 < y2)) {
      return `${Math.round(x1)},${Math.round(y1)}->${Math.round(x2)},${Math.round(y2)}`;
    }
    return `${Math.round(x2)},${Math.round(y2)}->${Math.round(x1)},${Math.round(y1)}`;
  };

  const addSegment = (
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    wallType: 'normal' | 'door' = 'normal'
  ) => {
    // Avoid zero length lines
    if (Math.abs(p1.x - p2.x) < 1 && Math.abs(p1.y - p2.y) < 1) return;

    const key = makeEdgeKey(p1.x, p1.y, p2.x, p2.y);
    if (processedEdges.has(key)) return;
    processedEdges.add(key);

    wallSegments.push({
      id: `wall_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      p1: { x: Math.round(p1.x), y: Math.round(p1.y) },
      p2: { x: Math.round(p2.x), y: Math.round(p2.y) },
      wallType,
      doorState: wallType === 'door' ? 'closed' : undefined
    });
  };

  // Find shared meeting boundaries between rooms to create doors
  interface MeetingBoundary {
    orientation: 'vertical' | 'horizontal';
    coord: number;
    start: number;
    end: number;
    roomA: string;
    roomB: string;
  }

  const meetingBoundaries: MeetingBoundary[] = [];

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const b1 = boxes[i];
      const b2 = boxes[j];

      // Check vertical meeting (b1.right touching b2.left, or b2.right touching b1.left)
      const isRightLeftTouch = Math.abs(b1.right - b2.left) <= gridSize;
      const isLeftRightTouch = Math.abs(b1.left - b2.right) <= gridSize;

      if (isRightLeftTouch || isLeftRightTouch) {
        const touchX = isRightLeftTouch ? b1.right : b1.left;
        const yStart = Math.max(b1.top, b2.top);
        const yEnd = Math.min(b1.bottom, b2.bottom);
        if (yEnd - yStart >= gridSize) {
          meetingBoundaries.push({
            orientation: 'vertical',
            coord: touchX,
            start: yStart,
            end: yEnd,
            roomA: b1.roomId,
            roomB: b2.roomId
          });
        }
      }

      // Check horizontal meeting (b1.bottom touching b2.top, or b2.bottom touching b1.top)
      const isBottomTopTouch = Math.abs(b1.bottom - b2.top) <= gridSize;
      const isTopBottomTouch = Math.abs(b1.top - b2.bottom) <= gridSize;

      if (isBottomTopTouch || isTopBottomTouch) {
        const touchY = isBottomTopTouch ? b1.bottom : b1.top;
        const xStart = Math.max(b1.left, b2.left);
        const xEnd = Math.min(b1.right, b2.right);
        if (xEnd - xStart >= gridSize) {
          meetingBoundaries.push({
            orientation: 'horizontal',
            coord: touchY,
            start: xStart,
            end: xEnd,
            roomA: b1.roomId,
            roomB: b2.roomId
          });
        }
      }
    }
  }

  // 1. Generate walls and doors for meeting boundaries
  for (const m of meetingBoundaries) {
    if (m.orientation === 'vertical') {
      const length = m.end - m.start;
      if (length <= gridSize * 1.5) {
        // Entire shared edge is a door
        addSegment({ x: m.coord, y: m.start }, { x: m.coord, y: m.end }, 'door');
      } else {
        // Place door of length 1 gridSize in the center of the shared boundary
        const midY = (m.start + m.end) / 2;
        const doorY1 = snapToGrid(midY - gridSize / 2, gridSize);
        const doorY2 = doorY1 + gridSize;

        // Solid wall above door
        if (doorY1 > m.start) {
          addSegment({ x: m.coord, y: m.start }, { x: m.coord, y: doorY1 }, 'normal');
        }
        // Door segment
        addSegment({ x: m.coord, y: doorY1 }, { x: m.coord, y: doorY2 }, 'door');
        // Solid wall below door
        if (m.end > doorY2) {
          addSegment({ x: m.coord, y: doorY2 }, { x: m.coord, y: m.end }, 'normal');
        }
      }
    } else {
      const length = m.end - m.start;
      if (length <= gridSize * 1.5) {
        // Entire shared edge is a door
        addSegment({ x: m.start, y: m.coord }, { x: m.end, y: m.coord }, 'door');
      } else {
        // Place door of length 1 gridSize in the center of the shared boundary
        const midX = (m.start + m.end) / 2;
        const doorX1 = snapToGrid(midX - gridSize / 2, gridSize);
        const doorX2 = doorX1 + gridSize;

        // Solid wall left of door
        if (doorX1 > m.start) {
          addSegment({ x: m.start, y: m.coord }, { x: doorX1, y: m.coord }, 'normal');
        }
        // Door segment
        addSegment({ x: doorX1, y: m.coord }, { x: doorX2, y: m.coord }, 'door');
        // Solid wall right of door
        if (m.end > doorX2) {
          addSegment({ x: doorX2, y: m.coord }, { x: m.end, y: m.coord }, 'normal');
        }
      }
    }
  }

  // 2. Generate remaining exterior walls for each room
  for (const b of boxes) {
    // Top edge: (b.left, b.top) -> (b.right, b.top)
    addSegment({ x: b.left, y: b.top }, { x: b.right, y: b.top }, 'normal');
    // Right edge: (b.right, b.top) -> (b.right, b.bottom)
    addSegment({ x: b.right, y: b.top }, { x: b.right, y: b.bottom }, 'normal');
    // Bottom edge: (b.left, b.bottom) -> (b.right, b.bottom)
    addSegment({ x: b.left, y: b.bottom }, { x: b.right, y: b.bottom }, 'normal');
    // Left edge: (b.left, b.top) -> (b.left, b.bottom)
    addSegment({ x: b.left, y: b.top }, { x: b.left, y: b.bottom }, 'normal');
  }

  return wallSegments;
}

/**
 * Builds a complete standard Scene object adhering to types in src/types/index.ts
 */
export function buildSceneFromParsedData(params: {
  sceneTitle: string;
  mapAsset: UploadedAsset;
  rooms: ParsedRoom[];
  gridSize?: number;
  campaignId?: string;
  chapterId?: string;
}): Scene {
  const { sceneTitle, mapAsset, rooms, gridSize = 50, campaignId, chapterId } = params;

  const mapWidth = mapAsset.width || 2048;
  const mapHeight = mapAsset.height || 1536;

  // 1. Generate Room Hotspots
  const roomAnnotations = generateRoomAnnotations(rooms, sceneTitle, campaignId);

  // 2. Generate Wall and Door Segments
  const walls = generateBaselineWalls(rooms, mapWidth, mapHeight, gridSize);

  // 3. Build overall formatted DM notes
  const roomNotesSummary = rooms
    .map(
      (r) =>
        `### ${r.roomNumber ? `${r.roomNumber} - ` : ''}${r.roomName}\n${
          r.boxedText ? `> *${r.boxedText.replace(/\n/g, '\n> ')}*\n\n` : ''
        }${r.dmNotes ? `${r.dmNotes}\n\n` : ''}${
          r.monsters && r.monsters.length > 0 ? `**Monsters:** ${r.monsters.join(', ')}\n` : ''
        }`
    )
    .join('\n---\n');

  const fullDmNotes = `# ${sceneTitle}\n**Imported from Adventure PDF**\n\n${
    roomNotesSummary || 'No specific room notes extracted.'
  }`;

  const scene: Scene = {
    sceneId: `scene_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    sceneTitle: sceneTitle || 'Imported Adventure Scene',
    mapUrl: mapAsset.url,
    mapThumbnailUrl: mapAsset.thumbnailUrl || mapAsset.url,
    mapWidth,
    mapHeight,
    dmNotes: fullDmNotes,
    tokens: [],
    gridSize,
    gridOpacity: 0.35,
    isFogVisible: true,
    walls,
    visionConfig: {
      enabled: true,
      explorationMemory: true,
      darknessOpacity: 0.95,
      dimVisionOpacity: 0.4,
      ambientLight: false,
      dmPreviewMode: true,
      showDoorBadges: true
    },
    roomAnnotations
  };

  return scene;
}

/**
 * Cleans and singularizes monster names extracted from adventure text
 * e.g. "4x Ghouls" -> "Ghoul", "three shadows" -> "Shadow", "a spectator" -> "Spectator"
 */
export function normalizeMonsterName(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  let clean = raw.trim();

  // Strip leading counters, numbers, or articles: "2x ", "4 ", "three ", "a ", "the "
  clean = clean.replace(/^(?:\d+x?\s*|(?:one|two|three|four|five|six|seven|eight|nine|ten|a|an|the)\s+)/i, '');
  // Strip trailing parentheticals: "Ghoul (paralyzed)" -> "Ghoul"
  clean = clean.replace(/\s*\(.*?\)/g, '');
  // Strip punctuation
  clean = clean.replace(/[,;:.!?]+$/g, '').trim();

  // Common singularizations
  const lower = clean.toLowerCase();
  if (lower.endsWith('ies')) {
    clean = clean.slice(0, -3) + 'y';
  } else if (lower.endsWith('ves')) {
    clean = clean.slice(0, -3) + 'f';
  } else if (lower.endsWith('s') && !lower.endsWith('ss') && !lower.endsWith('us') && clean.length > 3) {
    clean = clean.slice(0, -1);
  }

  // Proper Title Case
  clean = clean.replace(/\b\w/g, (c) => c.toUpperCase());
  return clean.trim();
}

/**
 * Extracts and deduplicates every monster named across all scenes, rooms, and chapter summary
 */
export function extractAllMonsterNamesFromParsedChapter(parsedChapter: ParsedChapter): string[] {
  const set = new Set<string>();

  // 1. From allMonsters array extracted directly from document
  if (Array.isArray(parsedChapter.allMonsters)) {
    for (const m of parsedChapter.allMonsters) {
      const norm = normalizeMonsterName(m);
      if (norm && norm.length > 2 && !set.has(norm.toLowerCase())) {
        set.add(norm);
      }
    }
  }

  // 2. From each room's monsters array
  if (Array.isArray(parsedChapter.scenes)) {
    for (const scene of parsedChapter.scenes) {
      if (Array.isArray(scene.rooms)) {
        for (const room of scene.rooms) {
          if (Array.isArray(room.monsters)) {
            for (const rm of room.monsters) {
              const norm = normalizeMonsterName(rm);
              if (norm && norm.length > 2 && !set.has(norm.toLowerCase())) {
                set.add(norm);
              }
            }
          }
        }
      }
    }
  }

  return [...set];
}

/**
 * Automatically searches Google for official 5e statblock and token artwork,
 * then saves each monster to the Firestore Monster Compendium.
 */
export async function autoIngestPdfMonstersToCompendium(
  monsterNames: string[],
  options?: {
    onProgress?: (status: IngestionPipelineStep) => void;
  }
): Promise<Monster[]> {
  if (!monsterNames || monsterNames.length === 0) return [];

  // Check existing compendium monsters to avoid duplicate web searches
  let existingMonsters: Monster[] = [];
  try {
    existingMonsters = await getMonstersList();
  } catch (err) {
    console.warn('[autoIngestPdfMonstersToCompendium] Could not fetch current monsters:', err);
  }

  const existingMap = new Map<string, Monster>();
  for (const m of existingMonsters) {
    if (m.name) existingMap.set(m.name.toLowerCase().trim(), m);
  }

  const resultMonsters: Monster[] = [];
  const total = monsterNames.length;

  for (let idx = 0; idx < monsterNames.length; idx++) {
    const rawName = monsterNames[idx];
    const clean = normalizeMonsterName(rawName);
    if (!clean) continue;

    const existing = existingMap.get(clean.toLowerCase());
    // If monster already exists with stats and token avatar, reuse it
    if (existing && existing.hp && existing.avatarUrl && !existing.avatarUrl.includes('placeholder')) {
      resultMonsters.push(existing);
      continue;
    }

    options?.onProgress?.({
      step: 'ingesting_monsters',
      message: `Searching Google & D&D Beyond for "${clean}" stats & token image (${idx + 1}/${total})...`,
      progressPercent: 90 + Math.round(((idx + 1) / total) * 9)
    });

    try {
      const headers = getAiHeaders();
      const res = await fetch('/api/ai/search-and-ingest-monster', {
        method: 'POST',
        headers,
        body: JSON.stringify({ monsterName: clean })
      });

      if (!res.ok) {
        console.warn(`[autoIngestPdfMonstersToCompendium] Server returned ${res.status} for "${clean}"`);
        continue;
      }

      const data = await res.json();
      if (data?.success && data?.monster) {
        const fetchedMonster: Monster = data.monster;
        // Automatically save to the Firestore Monster Compendium!
        const savedMonster = await saveMonster(fetchedMonster);
        resultMonsters.push(savedMonster);
        existingMap.set(clean.toLowerCase(), savedMonster);
      }
    } catch (err: any) {
      console.warn(`[autoIngestPdfMonstersToCompendium] Error ingesting "${clean}":`, err?.message || err);
    }
  }

  return resultMonsters;
}

/**
 * High-Level Orchestrator: Runs the full 5-stage ingestion pipeline
 */
export async function runPdfIngestionPipeline(
  pdfFile: File,
  options?: {
    campaignId?: string;
    chapterId?: string;
    gridSize?: number;
    onProgress?: (status: IngestionPipelineStep) => void;
  }
): Promise<{
  chapterTitle: string;
  scenes: Array<{
    sceneTitle: string;
    scene: Scene;
    mapAsset: UploadedAsset;
    mapPageNumber: number;
    rooms: ParsedRoom[];
  }>;
  ingestedMonsters: Monster[];
}> {
  // Step 1: Parsing Text
  options?.onProgress?.({
    step: 'parsing_text',
    message: 'Analyzing adventure PDF document with Gemini API...',
    progressPercent: 10
  });

  const parsedChapter = await parsePdfChapterWithGemini(pdfFile, {
    chapterTitle: pdfFile.name.replace(/\.[^/.]+$/, ''),
    onProgress: options?.onProgress
  });

  const scenesOut: Array<{
    sceneTitle: string;
    scene: Scene;
    mapAsset: UploadedAsset;
    mapPageNumber: number;
    rooms: ParsedRoom[];
  }> = [];

  const rawScenes = parsedChapter.scenes && parsedChapter.scenes.length > 0
    ? parsedChapter.scenes
    : [{ sceneTitle: parsedChapter.chapterTitle || 'Adventure Map', mapPageNumber: 1, rooms: [] }];

  // Step 2: Extracting Maps for each scene
  for (let idx = 0; idx < rawScenes.length; idx++) {
    const sc = rawScenes[idx];
    const pageNum = sc.mapPageNumber && sc.mapPageNumber > 0 ? sc.mapPageNumber : idx + 1;

    options?.onProgress?.({
      step: 'extracting_maps',
      message: `Extracting battlemap for "${sc.sceneTitle}" from PDF page ${pageNum}...`,
      progressPercent: 35 + Math.round((idx / rawScenes.length) * 20)
    });

    const mapResult = await extractBattlemapPage(pdfFile, pageNum, {
      sceneTitle: sc.sceneTitle,
      scale: 2.0,
      onProgress: options?.onProgress
    });

    // Upload & register asset
    const mapAsset = await uploadAndRegisterAsset(mapResult.file, 'map', {
      customName: `${sc.sceneTitle} Map`
    });

    // Make sure dimensions are set
    mapAsset.width = mapResult.width;
    mapAsset.height = mapResult.height;

    // Step 3: Locating Rooms
    options?.onProgress?.({
      step: 'locating_rooms',
      message: `Locating and anchoring ${sc.rooms.length} room hotspots on "${sc.sceneTitle}"...`,
      progressPercent: 60 + Math.round((idx / rawScenes.length) * 15)
    });

    // Step 4: Generating Walls & Doors
    options?.onProgress?.({
      step: 'generating_walls',
      message: `Generating dynamic lighting wall segments and doors aligned to grid...`,
      progressPercent: 75 + Math.round((idx / rawScenes.length) * 12)
    });

    const scene = buildSceneFromParsedData({
      sceneTitle: sc.sceneTitle,
      mapAsset,
      rooms: sc.rooms,
      gridSize: options?.gridSize || 50,
      campaignId: options?.campaignId,
      chapterId: options?.chapterId
    });

    scenesOut.push({
      sceneTitle: sc.sceneTitle,
      scene,
      mapAsset,
      mapPageNumber: mapResult.pageNumber,
      rooms: sc.rooms
    });
  }

  // Step 5: Automatically extract monsters, search Google 5e stats & token image, and add to Compendium
  const allMonsterNames = extractAllMonsterNamesFromParsedChapter(parsedChapter);
  let ingestedMonsters: Monster[] = [];

  if (allMonsterNames.length > 0) {
    options?.onProgress?.({
      step: 'ingesting_monsters',
      message: `Searching Google & D&D Beyond for ${allMonsterNames.length} named creature(s)...`,
      progressPercent: 88
    });

    ingestedMonsters = await autoIngestPdfMonstersToCompendium(allMonsterNames, {
      onProgress: options?.onProgress
    });
  }

  options?.onProgress?.({
    step: 'complete',
    message: `Adventure ingestion complete! Ready with ${scenesOut.length} scene(s) and ${ingestedMonsters.length} monster(s) in Compendium.`,
    progressPercent: 100
  });

  return {
    chapterTitle: parsedChapter.chapterTitle,
    scenes: scenesOut,
    ingestedMonsters
  };
}
