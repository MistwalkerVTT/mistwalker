/**
 * Overhead 1" Square Architectural D&D Battlemap & Wall/Door Engine
 * Generates high-resolution, strictly 90-degree top-down orthographic battlemaps
 * where every wall, corridor, pillar, and doorway aligns to exact 1-inch (5ft) squares,
 * and returns the exact mathematical WallSegment[] array for VTT dynamic lighting and doors.
 */

export interface GeneratedWallSegment {
  id: string;
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  wallType: 'normal' | 'door' | 'secret_door' | 'window' | 'terrain';
  doorState?: 'closed' | 'open' | 'locked';
}

export interface MapOptions {
  biome: string;
  weather: string;
  timeOfDay: string;
  customPrompt?: string;
  seed?: number;
  gridW?: number;
  gridH?: number;
  cellPx?: number;
}

export interface GeneratedBattlemapResult {
  svg: string;
  walls: GeneratedWallSegment[];
  width: number;
  height: number;
  gridW: number;
  gridH: number;
  cellPx: number;
}

// Deterministic PRNG (Mulberry32)
function createPrng(seedVal: number) {
  let s = seedVal | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface GridRoom {
  id: number;
  gx: number;
  gy: number;
  gw: number;
  gh: number;
  label: string;
  isMain?: boolean;
}

export function generateArchitecturalBattlemap(opts: MapOptions): GeneratedBattlemapResult {
  const seed = opts.seed !== undefined ? opts.seed : Math.floor(Math.random() * 1000000);
  const rnd = createPrng(seed);

  const gridW = Math.max(16, Math.min(60, opts.gridW || 30));
  const gridH = Math.max(12, Math.min(45, opts.gridH || 20));
  const cellPx = opts.cellPx || 64; // 64px per 1-inch (5ft) square

  const width = gridW * cellPx;
  const height = gridH * cellPx;

  const biome = (opts.biome || 'dungeon').toLowerCase();
  const weather = (opts.weather || 'clear').toLowerCase();
  const timeOfDay = (opts.timeOfDay || 'midnight').toLowerCase();
  const prompt = (opts.customPrompt || '').toLowerCase();

  // Palettes tuned for high-contrast top-down D&D VTT legibility
  const palettes: Record<string, {
    voidBg: string;
    floorBase: string;
    floorAlt: string;
    grout: string;
    wallCore: string;
    wallCap: string;
    wallTrim: string;
    doorWood: string;
    doorIron: string;
    accent: string;
    water: string;
    waterEdge: string;
    gridColor: string;
    gridOpacity: number;
  }> = {
    dungeon: {
      voidBg: '#0c0d12',
      floorBase: '#2a2e39',
      floorAlt: '#343946',
      grout: '#181b22',
      wallCore: '#111318',
      wallCap: '#4a5264',
      wallTrim: '#68738c',
      doorWood: '#78350f',
      doorIron: '#94a3b8',
      accent: '#f59e0b',
      water: '#164e63',
      waterEdge: '#38bdf8',
      gridColor: '#ffffff',
      gridOpacity: 0.22,
    },
    cave: {
      voidBg: '#0e0b0a',
      floorBase: '#332b26',
      floorAlt: '#3f352f',
      grout: '#1e1916',
      wallCore: '#171210',
      wallCap: '#52433b',
      wallTrim: '#6e5a4f',
      doorWood: '#713f12',
      doorIron: '#a8a29e',
      accent: '#06b6d4',
      water: '#0f3942',
      waterEdge: '#22d3ee',
      gridColor: '#ffffff',
      gridOpacity: 0.20,
    },
    urban: {
      voidBg: '#18191e',
      floorBase: '#3c3f4a',
      floorAlt: '#4b4036',
      grout: '#23252c',
      wallCore: '#1a1c22',
      wallCap: '#5a6070',
      wallTrim: '#7e869b',
      doorWood: '#854d0e',
      doorIron: '#cbd5e1',
      accent: '#f59e0b',
      water: '#1e3a5f',
      waterEdge: '#60a5fa',
      gridColor: '#ffffff',
      gridOpacity: 0.20,
    },
    forest: {
      voidBg: '#121d10',
      floorBase: '#24381f',
      floorAlt: '#35492d',
      grout: '#182814',
      wallCore: '#291e14',
      wallCap: '#4c3a28',
      wallTrim: '#6c543c',
      doorWood: '#78350f',
      doorIron: '#94a3b8',
      accent: '#84cc16',
      water: '#1b4958',
      waterEdge: '#38bdf8',
      gridColor: '#ffffff',
      gridOpacity: 0.20,
    },
    volcanic: {
      voidBg: '#120909',
      floorBase: '#2b1e1e',
      floorAlt: '#382626',
      grout: '#170f0f',
      wallCore: '#0d0707',
      wallCap: '#4a3232',
      wallTrim: '#6e4949',
      doorWood: '#451a03',
      doorIron: '#fb923c',
      accent: '#f97316',
      water: '#c2410c',
      waterEdge: '#fde047',
      gridColor: '#ffffff',
      gridOpacity: 0.24,
    },
    snow: {
      voidBg: '#1e293b',
      floorBase: '#64748b',
      floorAlt: '#94a3b8',
      grout: '#334155',
      wallCore: '#1e293b',
      wallCap: '#475569',
      wallTrim: '#cbd5e1',
      doorWood: '#78350f',
      doorIron: '#e2e8f0',
      accent: '#38bdf8',
      water: '#0284c7',
      waterEdge: '#bae6fd',
      gridColor: '#0f172a',
      gridOpacity: 0.25,
    },
    desert: {
      voidBg: '#291d12',
      floorBase: '#85623e',
      floorAlt: '#9c754d',
      grout: '#5c4126',
      wallCore: '#422d19',
      wallCap: '#6e4d2c',
      wallTrim: '#b08254',
      doorWood: '#713f12',
      doorIron: '#fbbf24',
      accent: '#f59e0b',
      water: '#0369a1',
      waterEdge: '#38bdf8',
      gridColor: '#1c1917',
      gridOpacity: 0.22,
    },
    swamp: {
      voidBg: '#11170f',
      floorBase: '#263021',
      floorAlt: '#33402c',
      grout: '#161c13',
      wallCore: '#1c1813',
      wallCap: '#3d3429',
      wallTrim: '#574a3b',
      doorWood: '#422006',
      doorIron: '#84cc16',
      accent: '#a3e635',
      water: '#27381f',
      waterEdge: '#65a30d',
      gridColor: '#ffffff',
      gridOpacity: 0.20,
    },
  };

  const pal = palettes[biome] || palettes.dungeon;

  // 0 = solid wall / exterior, 1 = playable floor, 2 = corridor floor
  const grid: number[][] = Array.from({ length: gridH }, () => Array(gridW).fill(0));
  const rooms: GridRoom[] = [];

  // Build deterministic rooms aligned to 1" squares
  const margin = 2;
  const midX = Math.floor(gridW / 2);
  const midY = Math.floor(gridH / 2);

  // Create 5 to 7 well-proportioned tactical rooms on the grid
  const candidateConfigs = [
    // Central Sanctum / Main Encounter Hall
    {
      gx: Math.max(margin + 5, midX - Math.floor(gridW * 0.18)),
      gy: Math.max(margin + 2, midY - Math.floor(gridH * 0.22)),
      gw: Math.max(6, Math.floor(gridW * 0.36)),
      gh: Math.max(5, Math.floor(gridH * 0.44)),
      label: 'Central Sanctum',
      isMain: true,
    },
    // West Entry Hall
    {
      gx: margin,
      gy: Math.max(margin, midY - 3),
      gw: Math.max(4, Math.floor(gridW * 0.20)),
      gh: Math.max(5, Math.min(8, Math.floor(gridH * 0.36))),
      label: 'Entry Hall',
    },
    // East Vault / Shrine
    {
      gx: Math.min(gridW - margin - 5, midX + Math.floor(gridW * 0.18) + 2),
      gy: Math.max(margin, midY - 3),
      gw: Math.max(4, gridW - margin - (midX + Math.floor(gridW * 0.18) + 2)),
      gh: Math.max(5, Math.min(8, Math.floor(gridH * 0.36))),
      label: 'Inner Shrine',
    },
    // North Guardroom
    {
      gx: Math.max(margin + 2, midX - 4 + Math.floor((rnd() - 0.5) * 4)),
      gy: margin,
      gw: Math.max(5, Math.floor(gridW * 0.24)),
      gh: Math.max(3, midY - Math.floor(gridH * 0.22) - margin - 1),
      label: 'North Barracks',
    },
    // South Crypt / Armory
    {
      gx: Math.max(margin + 2, midX - 4 + Math.floor((rnd() - 0.5) * 4)),
      gy: Math.min(gridH - margin - 3, midY + Math.floor(gridH * 0.22) + 2),
      gw: Math.max(5, Math.floor(gridW * 0.24)),
      gh: Math.max(3, gridH - margin - (midY + Math.floor(gridH * 0.22) + 2)),
      label: 'South Crypt',
    },
  ];

  candidateConfigs.forEach((cfg, idx) => {
    const gx = Math.max(1, Math.min(gridW - 5, cfg.gx));
    const gy = Math.max(1, Math.min(gridH - 5, cfg.gy));
    const gw = Math.max(4, Math.min(gridW - gx - 1, cfg.gw));
    const gh = Math.max(3, Math.min(gridH - gy - 1, cfg.gh));

    // Check overlap before carving
    let overlaps = false;
    for (let y = gy - 1; y <= gy + gh; y++) {
      for (let x = gx - 1; x <= gx + gw; x++) {
        if (y >= 0 && y < gridH && x >= 0 && x < gridW && grid[y][x] !== 0) {
          overlaps = true;
        }
      }
    }

    if (!overlaps || idx === 0) {
      rooms.push({ id: idx + 1, gx, gy, gw, gh, label: cfg.label, isMain: cfg.isMain });
      for (let y = gy; y < gy + gh; y++) {
        for (let x = gx; x < gx + gw; x++) {
          grid[y][x] = 1;
        }
      }
    }
  });

  // Track doorway edges so we place exact 1-square or 2-square doors at room entrances
  // Key format: "H:x,y" for horizontal edge at top of (x,y), "V:x,y" for vertical edge at left of (x,y)
  const doorEdges = new Set<string>();

  // Connect rooms to the Central Sanctum (rooms[0]) with 2-square wide (10ft) or 1-square wide (5ft) corridors
  const mainRoom = rooms[0];
  for (let i = 1; i < rooms.length; i++) {
    const rm = rooms[i];
    const c1x = Math.floor(rm.gx + rm.gw / 2);
    const c1y = Math.floor(rm.gy + rm.gh / 2);
    const c2x = Math.floor(mainRoom.gx + mainRoom.gw / 2);
    const c2y = Math.floor(mainRoom.gy + mainRoom.gh / 2);

    // L-shaped 1-square or 2-square corridor
    const corrW = gridW >= 28 ? 2 : 1;

    // Horizontal leg from c1x to c2x at y = c1y
    const minX = Math.min(c1x, c2x);
    const maxX = Math.max(c1x, c2x);
    for (let x = minX; x <= maxX; x++) {
      for (let w = 0; w < corrW; w++) {
        const cy = Math.min(gridH - 2, c1y + w);
        if (grid[cy][x] === 0) {
          grid[cy][x] = 2;
        }
      }
    }

    // Vertical leg from c1y to c2y at x = c2x
    const minY = Math.min(c1y, c2y);
    const maxY = Math.max(c1y, c2y);
    for (let y = minY; y <= maxY; y++) {
      for (let w = 0; w < corrW; w++) {
        const cx = Math.min(gridW - 2, c2x + w);
        if (grid[y][cx] === 0) {
          grid[y][cx] = 2;
        }
      }
    }
  }

  // Identify all transitions between Room (1) and Corridor (2) to place exact Door segments!
  for (let y = 1; y < gridH - 1; y++) {
    for (let x = 1; x < gridW - 1; x++) {
      if (grid[y][x] === 1) {
        // Top neighbor is corridor
        if (grid[y - 1][x] === 2) doorEdges.add(`H:${x},${y}`);
        // Bottom neighbor is corridor
        if (grid[y + 1][x] === 2) doorEdges.add(`H:${x},${y + 1}`);
        // Left neighbor is corridor
        if (grid[y][x - 1] === 2) doorEdges.add(`V:${x},${y}`);
        // Right neighbor is corridor
        if (grid[y][x + 1] === 2) doorEdges.add(`V:${x + 1},${y}`);
      }
    }
  }

  // Also add an exterior entrance door on the Westmost room
  const westRoom = rooms.reduce((prev, curr) => (curr.gx < prev.gx ? curr : prev), rooms[0]);
  if (westRoom) {
    const doorY = Math.floor(westRoom.gy + westRoom.gh / 2);
    doorEdges.add(`V:${westRoom.gx},${doorY}`);
  }

  // Extract collinear WallSegments and DoorSegments from the 1" grid
  const walls: GeneratedWallSegment[] = [];
  let wallCounter = 1;

  // 1. Horizontal grid line scan (y from 1 to gridH - 1)
  for (let y = 1; y < gridH; y++) {
    let runStart: number | null = null;
    let runType: 'normal' | 'door' | null = null;

    for (let x = 0; x <= gridW; x++) {
      const abovePlayable = x < gridW && y > 0 && grid[y - 1][x] > 0;
      const belowPlayable = x < gridW && y < gridH && grid[y][x] > 0;
      const isBoundary = abovePlayable !== belowPlayable;
      const isDoor = x < gridW && doorEdges.has(`H:${x},${y}`);

      let currentEdge: 'normal' | 'door' | null = null;
      if (isDoor) {
        currentEdge = 'door';
      } else if (isBoundary) {
        currentEdge = 'normal';
      }

      if (currentEdge !== runType) {
        if (runStart !== null && runType !== null) {
          walls.push({
            id: `grid_wall_${seed}_${wallCounter++}`,
            p1: { x: runStart * cellPx, y: y * cellPx },
            p2: { x: x * cellPx, y: y * cellPx },
            wallType: runType,
            doorState: runType === 'door' ? 'closed' : undefined,
          });
        }
        runStart = currentEdge ? x : null;
        runType = currentEdge;
      }
    }
  }

  // 2. Vertical grid line scan (x from 1 to gridW - 1)
  for (let x = 1; x < gridW; x++) {
    let runStart: number | null = null;
    let runType: 'normal' | 'door' | null = null;

    for (let y = 0; y <= gridH; y++) {
      const leftPlayable = y < gridH && x > 0 && grid[y][x - 1] > 0;
      const rightPlayable = y < gridH && x < gridW && grid[y][x] > 0;
      const isBoundary = leftPlayable !== rightPlayable;
      const isDoor = y < gridH && doorEdges.has(`V:${x},${y}`);

      let currentEdge: 'normal' | 'door' | null = null;
      if (isDoor) {
        currentEdge = 'door';
      } else if (isBoundary) {
        currentEdge = 'normal';
      }

      if (currentEdge !== runType) {
        if (runStart !== null && runType !== null) {
          walls.push({
            id: `grid_wall_${seed}_${wallCounter++}`,
            p1: { x: x * cellPx, y: runStart * cellPx },
            p2: { x: x * cellPx, y: y * cellPx },
            wallType: runType,
            doorState: runType === 'door' ? 'closed' : undefined,
          });
        }
        runStart = currentEdge ? y : null;
        runType = currentEdge;
      }
    }
  }

  // Build SVG visual elements strictly aligned to the 1" grid
  let floorTilesSvg = '';
  let propsSvg = '';
  let wallSvg = '';
  let doorsSvg = '';
  let lightingSvg = '';

  // Render every playable 1" (5ft) floor tile with realistic flagstone bevels & subtle variations
  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const cell = grid[y][x];
      if (cell > 0) {
        const px = x * cellPx;
        const py = y * cellPx;
        const isAlt = (x + y) % 2 === 0;
        const fillCol = cell === 2 ? pal.floorBase : isAlt ? pal.floorBase : pal.floorAlt;

        // Subtle stone crack or moss detail on some tiles
        const detailRoll = (x * 37 + y * 13 + seed) % 11;
        floorTilesSvg += `<rect x="${px}" y="${py}" width="${cellPx}" height="${cellPx}" fill="${fillCol}" stroke="${pal.grout}" stroke-width="2"/>`;
        floorTilesSvg += `<rect x="${px + 3}" y="${py + 3}" width="${cellPx - 6}" height="${cellPx - 6}" fill="none" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/>`;

        if (detailRoll === 0) {
          floorTilesSvg += `<path d="M ${px + 12} ${py + 18} L ${px + 28} ${py + 34} L ${px + 45} ${py + 26}" fill="none" stroke="${pal.grout}" stroke-width="1.5" opacity="0.7"/>`;
        } else if (detailRoll === 3) {
          floorTilesSvg += `<circle cx="${px + cellPx * 0.7}" cy="${py + cellPx * 0.3}" r="4" fill="${pal.grout}" opacity="0.4"/>`;
        }
      }
    }
  }

  // Furnish rooms with strictly top-down 90-degree orthographic D&D props aligned to 1" squares
  rooms.forEach((rm, idx) => {
    const cx = Math.floor(rm.gx + rm.gw / 2);
    const cy = Math.floor(rm.gy + rm.gh / 2);

    if (rm.isMain) {
      // Symmetrical 1" corner pillars inside the main room if large enough
      if (rm.gw >= 8 && rm.gh >= 6) {
        const pillarCells = [
          { x: rm.gx + 1, y: rm.gy + 1 },
          { x: rm.gx + rm.gw - 2, y: rm.gy + 1 },
          { x: rm.gx + 1, y: rm.gy + rm.gh - 2 },
          { x: rm.gx + rm.gw - 2, y: rm.gy + rm.gh - 2 },
        ];
        pillarCells.forEach(p => {
          const px = p.x * cellPx;
          const py = p.y * cellPx;
          propsSvg += `
            <g filter="url(#aoShadow)">
              <rect x="${px + 6}" y="${py + 6}" width="${cellPx - 12}" height="${cellPx - 12}" rx="4" fill="${pal.wallCap}" stroke="${pal.wallTrim}" stroke-width="2"/>
              <circle cx="${px + cellPx / 2}" cy="${py + cellPx / 2}" r="${cellPx * 0.28}" fill="${pal.wallCore}" stroke="${pal.wallTrim}" stroke-width="1.5"/>
            </g>
          `;
        });
      }

      // Central top-down Altar / Arcane Dais aligned to the center 2x2 squares
      const daisPx = cx * cellPx;
      const daisPy = cy * cellPx;
      propsSvg += `
        <g filter="url(#aoShadow)">
          <!-- Outer 2x2 square stone dais step -->
          <rect x="${daisPx - cellPx}" y="${daisPy - cellPx}" width="${cellPx * 2}" height="${cellPx * 2}" rx="8" fill="${pal.floorAlt}" stroke="${pal.wallTrim}" stroke-width="3"/>
          <rect x="${daisPx - cellPx * 0.75}" y="${daisPy - cellPx * 0.75}" width="${cellPx * 1.5}" height="${cellPx * 1.5}" rx="4" fill="${pal.floorBase}" stroke="${pal.accent}" stroke-width="1.5" stroke-dasharray="8 4"/>
          <!-- Central 90-degree overhead altar slab -->
          <rect x="${daisPx - cellPx * 0.55}" y="${daisPy - cellPx * 0.35}" width="${cellPx * 1.1}" height="${cellPx * 0.7}" rx="3" fill="${pal.wallCap}" stroke="${pal.wallTrim}" stroke-width="2"/>
          <circle cx="${daisPx}" cy="${daisPy}" r="${cellPx * 0.22}" fill="${pal.accent}" opacity="0.85"/>
          <circle cx="${daisPx}" cy="${daisPy}" r="${cellPx * 0.12}" fill="#ffffff" opacity="0.9"/>
        </g>
      `;
      lightingSvg += `<circle cx="${daisPx}" cy="${daisPy}" r="${cellPx * 3.2}" fill="url(#magicLight)" opacity="0.75"/>`;
    } else if (idx === 1) {
      // Entry Hall: Overhead Stairs leading down into the dungeon
      const sx = rm.gx * cellPx + cellPx;
      const sy = (rm.gy + 1) * cellPx;
      const sw = cellPx * 2;
      const sh = cellPx * Math.min(3, rm.gh - 2);
      propsSvg += `
        <g>
          <rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="${pal.grout}" stroke="${pal.wallCap}" stroke-width="3"/>
          ${[0.2, 0.4, 0.6, 0.8].map(t => `<line x1="${sx + sw * t}" y1="${sy}" x2="${sx + sw * t}" y2="${sy + sh}" stroke="${pal.wallTrim}" stroke-width="2"/>`).join('')}
        </g>
      `;
    } else if (idx === 2) {
      // Shrine / Vault: Overhead Treasure Chest & Braziers aligned to grid squares
      const tx = cx * cellPx + cellPx * 0.15;
      const ty = cy * cellPx + cellPx * 0.25;
      propsSvg += `
        <g filter="url(#aoShadow)">
          <rect x="${tx}" y="${ty}" width="${cellPx * 0.7}" height="${cellPx * 0.5}" rx="3" fill="${pal.doorWood}" stroke="#f59e0b" stroke-width="2.5"/>
          <line x1="${tx}" y1="${ty + cellPx * 0.25}" x2="${tx + cellPx * 0.7}" y2="${ty + cellPx * 0.25}" stroke="#f59e0b" stroke-width="2"/>
          <rect x="${tx + cellPx * 0.28}" y="${ty + cellPx * 0.18}" width="${cellPx * 0.14}" height="${cellPx * 0.14}" fill="#fde047"/>
        </g>
      `;
    } else {
      // Guardroom / Crypt: Top-down wooden table or sarcophagus
      const bx = (cx - 1) * cellPx + 8;
      const by = cy * cellPx + 10;
      propsSvg += `
        <g filter="url(#aoShadow)">
          <rect x="${bx}" y="${by}" width="${cellPx * 2 - 16}" height="${cellPx - 20}" rx="4" fill="${idx % 2 === 0 ? pal.wallCap : pal.doorWood}" stroke="${pal.wallTrim}" stroke-width="2"/>
        </g>
      `;
    }

    // Place corner wall torches in every room
    const torchPositions = [
      { x: (rm.gx + 0.5) * cellPx, y: (rm.gy + 0.5) * cellPx },
      { x: (rm.gx + rm.gw - 0.5) * cellPx, y: (rm.gy + rm.gh - 0.5) * cellPx },
    ];
    torchPositions.forEach(tp => {
      propsSvg += `
        <circle cx="${tp.x}" cy="${tp.y}" r="7" fill="#451a03" stroke="#78350f" stroke-width="1.5"/>
        <circle cx="${tp.x}" cy="${tp.y}" r="4.5" fill="#f97316"/>
        <circle cx="${tp.x}" cy="${tp.y}" r="2" fill="#fef08a"/>
      `;
      lightingSvg += `<circle cx="${tp.x}" cy="${tp.y}" r="${cellPx * 2.5}" fill="url(#torchLight)" opacity="0.65"/>`;
    });
  });

  // Render every Wall and Door visually on the SVG at exact coordinates
  walls.forEach(w => {
    if (w.wallType === 'normal') {
      // Heavy architectural top-down masonry wall with beveled cap
      wallSvg += `
        <g filter="url(#aoShadow)">
          <line x1="${w.p1.x}" y1="${w.p1.y}" x2="${w.p2.x}" y2="${w.p2.y}" stroke="${pal.wallCore}" stroke-width="16" stroke-linecap="square"/>
          <line x1="${w.p1.x}" y1="${w.p1.y}" x2="${w.p2.x}" y2="${w.p2.y}" stroke="${pal.wallCap}" stroke-width="10" stroke-linecap="square"/>
          <line x1="${w.p1.x}" y1="${w.p1.y}" x2="${w.p2.x}" y2="${w.p2.y}" stroke="${pal.wallTrim}" stroke-width="2" stroke-dasharray="16 8" stroke-linecap="butt"/>
        </g>
      `;
    } else if (w.wallType === 'door') {
      // Top-down architectural doorway: stone jambs on ends + wooden door leaf & swing arc
      const isHoriz = Math.abs(w.p1.y - w.p2.y) < 1;
      const midX = (w.p1.x + w.p2.x) / 2;
      const midY = (w.p1.y + w.p2.y) / 2;
      const len = Math.hypot(w.p2.x - w.p1.x, w.p2.y - w.p1.y);

      if (isHoriz) {
        const minX = Math.min(w.p1.x, w.p2.x);
        const maxX = Math.max(w.p1.x, w.p2.x);
        doorsSvg += `
          <g filter="url(#aoShadow)">
            <!-- Threshold sill -->
            <rect x="${minX}" y="${midY - 8}" width="${len}" height="16" fill="${pal.floorAlt}" stroke="${pal.grout}" stroke-width="1.5"/>
            <!-- Door swing arc -->
            <path d="M ${minX + 6} ${midY} A ${len * 0.45} ${len * 0.45} 0 0 1 ${minX + 6 + len * 0.45} ${midY + len * 0.45}" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="1.5" stroke-dasharray="4 3"/>
            <!-- Wooden Door Leaf -->
            <rect x="${minX + 4}" y="${midY - 5}" width="${len - 8}" height="10" rx="2" fill="${pal.doorWood}" stroke="${pal.doorIron}" stroke-width="2"/>
            <!-- Iron Hinges & Handle -->
            <rect x="${minX + 6}" y="${midY - 6}" width="6" height="12" fill="${pal.doorIron}"/>
            <rect x="${maxX - 12}" y="${midY - 6}" width="6" height="12" fill="${pal.doorIron}"/>
            <circle cx="${midX}" cy="${midY}" r="3" fill="#fde047"/>
          </g>
        `;
      } else {
        const minY = Math.min(w.p1.y, w.p2.y);
        const maxY = Math.max(w.p1.y, w.p2.y);
        doorsSvg += `
          <g filter="url(#aoShadow)">
            <!-- Threshold sill -->
            <rect x="${midX - 8}" y="${minY}" width="16" height="${len}" fill="${pal.floorAlt}" stroke="${pal.grout}" stroke-width="1.5"/>
            <!-- Door swing arc -->
            <path d="M ${midX} ${minY + 6} A ${len * 0.45} ${len * 0.45} 0 0 1 ${midX + len * 0.45} ${minY + 6 + len * 0.45}" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="1.5" stroke-dasharray="4 3"/>
            <!-- Wooden Door Leaf -->
            <rect x="${midX - 5}" y="${minY + 4}" width="10" height="${len - 8}" rx="2" fill="${pal.doorWood}" stroke="${pal.doorIron}" stroke-width="2"/>
            <!-- Iron Hinges & Handle -->
            <rect x="${midX - 6}" y="${minY + 6}" width="12" height="6" fill="${pal.doorIron}"/>
            <rect x="${midX - 6}" y="${maxY - 12}" width="12" height="6" fill="${pal.doorIron}"/>
            <circle cx="${midX}" cy="${midY}" r="3" fill="#fde047"/>
          </g>
        `;
      }
    }
  });

  // 1-inch (5ft) Crisp Tactical Grid Overlay
  const gridPattern = `
    <pattern id="oneInchGrid" width="${cellPx}" height="${cellPx}" patternUnits="userSpaceOnUse">
      <path d="M ${cellPx} 0 L 0 0 0 ${cellPx}" fill="none" stroke="${pal.gridColor}" stroke-width="1.2" stroke-opacity="${pal.gridOpacity}"/>
      <circle cx="${cellPx}" cy="${cellPx}" r="1.5" fill="${pal.gridColor}" fill-opacity="${pal.gridOpacity * 1.6}"/>
    </pattern>
  `;

  // Exterior uncarved stone hatching pattern
  const voidPattern = `
    <pattern id="solidRockHatch" width="32" height="32" patternUnits="userSpaceOnUse">
      <rect width="32" height="32" fill="${pal.voidBg}"/>
      <path d="M 0 32 L 32 0 M -8 8 L 8 -8 M 24 40 L 40 24" stroke="#ffffff" stroke-width="1" stroke-opacity="0.04"/>
    </pattern>
  `;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
      <defs>
        <filter id="aoShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#000000" flood-opacity="0.85"/>
        </filter>
        <radialGradient id="torchLight" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fef08a" stop-opacity="0.7"/>
          <stop offset="35%" stop-color="#f59e0b" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="magicLight" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#a5f3fc" stop-opacity="0.75"/>
          <stop offset="40%" stop-color="#06b6d4" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
        </radialGradient>
        ${gridPattern}
        ${voidPattern}
      </defs>

      <!-- Solid Bedrock / Uncarved Exterior -->
      <rect width="${width}" height="${height}" fill="url(#solidRockHatch)"/>

      <!-- 1" (5ft) Floor Flagstone Tiles -->
      <g>${floorTilesSvg}</g>

      <!-- 1" Square Grid Overlay -->
      <rect width="${width}" height="${height}" fill="url(#oneInchGrid)"/>

      <!-- Furnishings, Pillars, Stairs, Altars -->
      <g>${propsSvg}</g>

      <!-- Architectural Walls (Aligned to 1" Grid Lines) -->
      <g>${wallSvg}</g>

      <!-- Architectural Doors (Aligned to 1" Grid Thresholds) -->
      <g>${doorsSvg}</g>

      <!-- Top-Down Torch & Arcane Illumination -->
      <g style="mix-blend-mode: screen;">${lightingSvg}</g>
    </svg>
  `.trim();

  return {
    svg,
    walls,
    width,
    height,
    gridW,
    gridH,
    cellPx,
  };
}

// Keep backward-compatible string return helper
export function generateCinematicBattlemap(opts: MapOptions): string {
  return generateArchitecturalBattlemap(opts).svg;
}
