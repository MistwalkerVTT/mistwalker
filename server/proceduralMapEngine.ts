/**
 * Procedural TTRPG Battlemap Generator Engine
 * Generates ultra-detailed, high-resolution vector battlemaps with deterministic seeds,
 * realistic textures, organic features, atmospheric lighting, and tactical layouts.
 */

interface MapOptions {
  biome: string;
  weather: string;
  timeOfDay: string;
  customPrompt?: string;
  seed?: number;
}

// Simple deterministic PRNG (Linear Congruential Generator / Mulberry32)
function createPrng(seedVal: number) {
  let s = seedVal | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateCinematicBattlemap(opts: MapOptions): string {
  const seed = opts.seed !== undefined ? opts.seed : Math.floor(Math.random() * 1000000);
  const rnd = createPrng(seed);

  const width = 1600;
  const height = 900;
  const gridSize = 50;

  const biome = (opts.biome || 'forest').toLowerCase();
  const weather = (opts.weather || 'clear').toLowerCase();
  const timeOfDay = (opts.timeOfDay || 'noon').toLowerCase();
  const prompt = (opts.customPrompt || '').toLowerCase();

  // Color & Theme Palettes
  const palettes: Record<string, {
    ground: string;
    groundSecondary: string;
    wall: string;
    wallHighlight: string;
    accent: string;
    water?: string;
    waterGlow?: string;
    detail: string;
    gridOpacity: number;
  }> = {
    forest: {
      ground: "#1b2c18",
      groundSecondary: "#263e22",
      wall: "#38291c",
      wallHighlight: "#543e2b",
      accent: "#4d7339",
      water: "#1f4a5c",
      waterGlow: "#3b82a6",
      detail: "#2a4224",
      gridOpacity: 0.18,
    },
    dungeon: {
      ground: "#1e2129",
      groundSecondary: "#2b2f3a",
      wall: "#111317",
      wallHighlight: "#3f4657",
      accent: "#7c3aed",
      detail: "#171a21",
      gridOpacity: 0.22,
    },
    cave: {
      ground: "#231f1d",
      groundSecondary: "#332c29",
      wall: "#13100f",
      wallHighlight: "#473d39",
      accent: "#06b6d4",
      water: "#16343d",
      waterGlow: "#0ea5e9",
      detail: "#1a1715",
      gridOpacity: 0.2,
    },
    desert: {
      ground: "#a67c4e",
      groundSecondary: "#c49a64",
      wall: "#5e4327",
      wallHighlight: "#8c653b",
      accent: "#d97706",
      water: "#2b6b7f",
      waterGlow: "#38bdf8",
      detail: "#b88c56",
      gridOpacity: 0.16,
    },
    snow: {
      ground: "#94a8b8",
      groundSecondary: "#b8c9d9",
      wall: "#424e57",
      wallHighlight: "#687a87",
      accent: "#38bdf8",
      water: "#4a6c82",
      waterGlow: "#7dd3fc",
      detail: "#a1b5c4",
      gridOpacity: 0.2,
    },
    swamp: {
      ground: "#20281b",
      groundSecondary: "#2d3826",
      wall: "#251e18",
      wallHighlight: "#3b3027",
      accent: "#65a30d",
      water: "#2b3b24",
      waterGlow: "#84cc16",
      detail: "#192115",
      gridOpacity: 0.22,
    },
    volcanic: {
      ground: "#1f1818",
      groundSecondary: "#2b2020",
      wall: "#0f0b0b",
      wallHighlight: "#453232",
      accent: "#ea580c",
      water: "#c2410c", // lava
      waterGlow: "#fbbf24",
      detail: "#140f0f",
      gridOpacity: 0.24,
    },
    urban: {
      ground: "#32353e",
      groundSecondary: "#404450",
      wall: "#1e2025",
      wallHighlight: "#555b6b",
      accent: "#f59e0b",
      water: "#2d4452",
      waterGlow: "#38bdf8",
      detail: "#272930",
      gridOpacity: 0.2,
    },
  };

  const pal = palettes[biome] || palettes.forest;

  // Multi-stop Lighting Gradients & Patterns
  const defs = `
    <!-- Ambient Fog & Lighting Filter -->
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <filter id="dramaticShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="8" dy="12" stdDeviation="6" flood-color="#000000" flood-opacity="0.8" />
    </filter>

    <!-- Floor Texture Patterns -->
    <pattern id="flagstone" width="100" height="100" patternUnits="userSpaceOnUse">
      <rect width="100" height="100" fill="${pal.ground}" />
      <path d="M 0 50 L 100 50 M 50 0 L 50 100 M 25 0 L 25 50 M 75 50 L 75 100" stroke="${pal.detail}" stroke-width="2" stroke-opacity="0.6"/>
      <circle cx="25" cy="25" r="1.5" fill="#ffffff" opacity="0.08"/>
      <circle cx="75" cy="75" r="1.5" fill="#000000" opacity="0.15"/>
    </pattern>

    <pattern id="woodPlanks" width="100" height="25" patternUnits="userSpaceOnUse">
      <rect width="100" height="25" fill="${pal.ground}" />
      <line x1="0" y1="24" x2="100" y2="24" stroke="${pal.detail}" stroke-width="1.5"/>
      <line x1="50" y1="0" x2="50" y2="24" stroke="${pal.detail}" stroke-width="1"/>
    </pattern>

    <pattern id="cobblestones" width="60" height="60" patternUnits="userSpaceOnUse">
      <rect width="60" height="60" fill="${pal.ground}" />
      <circle cx="15" cy="15" r="11" fill="${pal.groundSecondary}" stroke="${pal.detail}" stroke-width="1.5"/>
      <circle cx="45" cy="15" r="12" fill="${pal.groundSecondary}" stroke="${pal.detail}" stroke-width="1.5"/>
      <circle cx="30" cy="40" r="13" fill="${pal.groundSecondary}" stroke="${pal.detail}" stroke-width="1.5"/>
    </pattern>

    <!-- Torch / Sconce Glow -->
    <radialGradient id="torchGlowWarm" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.95"/>
      <stop offset="25%" stop-color="#f59e0b" stop-opacity="0.6"/>
      <stop offset="60%" stop-color="#b45309" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="magicGlowCyan" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#a5f3fc" stop-opacity="0.95"/>
      <stop offset="30%" stop-color="#06b6d4" stop-opacity="0.65"/>
      <stop offset="70%" stop-color="#0369a1" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>

    <!-- Tactical Grid Pattern -->
    <pattern id="tacticalGrid" width="${gridSize}" height="${gridSize}" patternUnits="userSpaceOnUse">
      <path d="M ${gridSize} 0 L 0 0 0 ${gridSize}" fill="none" stroke="#ffffff" stroke-width="0.8" stroke-opacity="${pal.gridOpacity}"/>
      <circle cx="${gridSize}" cy="${gridSize}" r="1" fill="#ffffff" opacity="${pal.gridOpacity * 1.5}"/>
    </pattern>
  `;

  // Procedural Elements Generation
  let roomsAndTerrain = "";
  let propsAndDetails = "";
  let lightEmitters = "";

  if (biome === 'dungeon') {
    // Generate 4 to 6 connected rooms with varied dimensions
    const numRooms = 4 + Math.floor(rnd() * 3);
    const rooms: { x: number; y: number; w: number; h: number }[] = [];

    // Pre-calculate room positions with corridor overlaps
    const startX = 100 + Math.floor(rnd() * 100);
    const startY = 100 + Math.floor(rnd() * 80);
    rooms.push({ x: startX, y: startY, w: 450 + Math.floor(rnd() * 100), h: 320 + Math.floor(rnd() * 60) });

    const room2X = startX + rooms[0].w + 80 + Math.floor(rnd() * 60);
    const room2Y = 80 + Math.floor(rnd() * 100);
    rooms.push({ x: room2X, y: room2Y, w: 420 + Math.floor(rnd() * 80), h: 400 + Math.floor(rnd() * 80) });

    const room3X = startX + 50 + Math.floor(rnd() * 80);
    const room3Y = startY + rooms[0].h + 90 + Math.floor(rnd() * 50);
    rooms.push({ x: room3X, y: room3Y, w: 500 + Math.floor(rnd() * 100), h: 280 + Math.floor(rnd() * 40) });

    const room4X = room2X - 50 + Math.floor(rnd() * 60);
    const room4Y = room2Y + rooms[1].h + 70;
    rooms.push({ x: room4X, y: room4Y, w: 460 + Math.floor(rnd() * 60), h: 260 + Math.floor(rnd() * 50) });

    // Draw Corridors connecting rooms
    roomsAndTerrain += `
      <!-- Corridors -->
      <rect x="${rooms[0].x + rooms[0].w - 20}" y="${rooms[0].y + 120}" width="${rooms[1].x - (rooms[0].x + rooms[0].w) + 40}" height="100" fill="url(#flagstone)" stroke="${pal.wall}" stroke-width="12" />
      <rect x="${rooms[0].x + 180}" y="${rooms[0].y + rooms[0].h - 20}" width="100" height="${rooms[2].y - (rooms[0].y + rooms[0].h) + 40}" fill="url(#flagstone)" stroke="${pal.wall}" stroke-width="12" />
      <rect x="${rooms[2].x + rooms[2].w - 20}" y="${rooms[2].y + 80}" width="${rooms[3].x - (rooms[2].x + rooms[2].w) + 40}" height="100" fill="url(#flagstone)" stroke="${pal.wall}" stroke-width="12" />
    `;

    // Draw Room Chambers
    rooms.forEach((r, idx) => {
      roomsAndTerrain += `
        <!-- Chamber ${idx + 1} -->
        <rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="6" fill="url(#flagstone)" stroke="${pal.wall}" stroke-width="18" filter="url(#dramaticShadow)" />
        <rect x="${r.x + 12}" y="${r.y + 12}" width="${r.w - 24}" height="${r.h - 24}" fill="none" stroke="${pal.wallHighlight}" stroke-width="2" stroke-dasharray="40 10" opacity="0.4"/>
      `;

      // Pillars in larger rooms
      if (r.w >= 450 && r.h >= 300) {
        const pOffsets = [
          { px: r.x + 80, py: r.y + 70 },
          { px: r.x + r.w - 80, py: r.y + 70 },
          { px: r.x + 80, py: r.y + r.h - 70 },
          { px: r.x + r.w - 80, py: r.y + r.h - 70 },
        ];
        pOffsets.forEach(p => {
          propsAndDetails += `
            <g filter="url(#dramaticShadow)">
              <rect x="${p.px - 22}" y="${p.py - 22}" width="44" height="44" rx="6" fill="${pal.wall}" stroke="${pal.wallHighlight}" stroke-width="3"/>
              <circle cx="${p.px}" cy="${p.py}" r="12" fill="${pal.groundSecondary}"/>
            </g>
          `;
        });
      }

      // Sconces on chamber walls
      lightEmitters += `
        <circle cx="${r.x + 30}" cy="${r.y + 30}" r="130" fill="url(#torchGlowWarm)"/>
        <circle cx="${r.x + r.w - 30}" cy="${r.y + r.h - 30}" r="130" fill="url(#torchGlowWarm)"/>
      `;
    });

    // Central Boss / Altar Dais in Room 2
    const daisX = rooms[1].x + rooms[1].w / 2;
    const daisY = rooms[1].y + rooms[1].h / 2;
    propsAndDetails += `
      <!-- Ritual Dais & Magic Circle -->
      <circle cx="${daisX}" cy="${daisY}" r="95" fill="${pal.groundSecondary}" stroke="${pal.wallHighlight}" stroke-width="4" filter="url(#dramaticShadow)"/>
      <circle cx="${daisX}" cy="${daisY}" r="75" fill="none" stroke="#7c3aed" stroke-width="2" stroke-dasharray="12 6" opacity="0.8"/>
      <polygon points="${daisX},${daisY - 50} ${daisX + 43},${daisY + 25} ${daisX - 43},${daisY + 25}" fill="none" stroke="#a78bfa" stroke-width="2" opacity="0.7"/>
      <polygon points="${daisX},${daisY + 50} ${daisX + 43},${daisY - 25} ${daisX - 43},${daisY - 25}" fill="none" stroke="#a78bfa" stroke-width="2" opacity="0.7"/>
      <circle cx="${daisX}" cy="${daisY}" r="22" fill="#4c1d95" stroke="#c4b5fd" stroke-width="2"/>
    `;
    lightEmitters += `
      <circle cx="${daisX}" cy="${daisY}" r="160" fill="url(#magicGlowCyan)" opacity="0.85"/>
    `;

  } else if (biome === 'cave') {
    // Organic cavernous tunnels and cavern chambers
    roomsAndTerrain += `
      <!-- Base Cavern Floors -->
      <path d="M 120 120 Q 500 70 850 140 T 1480 120 Q 1540 460 1460 780 T 800 820 Q 220 860 120 760 Z" fill="${pal.ground}" stroke="${pal.wall}" stroke-width="36" filter="url(#dramaticShadow)"/>
      <!-- Inner chamber divider -->
      <path d="M 680 140 Q 720 380 620 520 T 710 820" fill="none" stroke="${pal.wall}" stroke-width="28"/>
      <!-- Subterranean Lake / Pool -->
      <path d="M 880 320 Q 1150 260 1320 400 T 1200 680 Q 950 720 880 500 Z" fill="${pal.water || '#16343d'}" stroke="${pal.waterGlow || '#0ea5e9'}" stroke-width="3" opacity="0.85"/>
      <ellipse cx="1100" cy="500" rx="90" ry="50" fill="${pal.waterGlow}" opacity="0.2" filter="url(#softGlow)"/>
    `;

    // Stalagmites & Crystals
    const rockClusters = [
      { x: 300, y: 320 }, { x: 420, y: 560 }, { x: 280, y: 680 },
      { x: 1000, y: 220 }, { x: 1380, y: 550 }, { x: 1200, y: 250 },
    ];
    rockClusters.forEach(rc => {
      propsAndDetails += `
        <g filter="url(#dramaticShadow)">
          <polygon points="${rc.x},${rc.y - 25} ${rc.x + 22},${rc.y + 15} ${rc.x - 22},${rc.y + 15}" fill="${pal.wall}" stroke="${pal.wallHighlight}" stroke-width="2"/>
          <!-- Glowing crystal shard -->
          <polygon points="${rc.x + 5},${rc.y - 12} ${rc.x + 14},${rc.y + 10} ${rc.x - 4},${rc.y + 10}" fill="#06b6d4" opacity="0.75"/>
        </g>
      `;
      lightEmitters += `
        <circle cx="${rc.x}" cy="${rc.y}" r="80" fill="url(#magicGlowCyan)" opacity="0.4"/>
      `;
    });

  } else if (biome === 'volcanic') {
    // Fractured obsidian ground with branching magma rivers
    roomsAndTerrain += `
      <rect width="${width}" height="${height}" fill="${pal.ground}"/>
      <!-- Magma River -->
      <path d="M 0 420 Q 400 300 800 500 T 1600 380" fill="none" stroke="#7c2d12" stroke-width="170" />
      <path d="M 0 420 Q 400 300 800 500 T 1600 380" fill="none" stroke="#c2410c" stroke-width="120" />
      <path d="M 0 420 Q 400 300 800 500 T 1600 380" fill="none" stroke="#f59e0b" stroke-width="50" filter="url(#softGlow)" />
      <path d="M 0 420 Q 400 300 800 500 T 1600 380" fill="none" stroke="#fef08a" stroke-width="18" opacity="0.9" />

      <!-- Natural Stone Crossing -->
      <circle cx="750" cy="460" r="45" fill="${pal.wall}" stroke="${pal.wallHighlight}" stroke-width="3" filter="url(#dramaticShadow)"/>
      <circle cx="840" cy="500" r="40" fill="${pal.wall}" stroke="${pal.wallHighlight}" stroke-width="3" filter="url(#dramaticShadow)"/>
      <circle cx="920" cy="470" r="42" fill="${pal.wall}" stroke="${pal.wallHighlight}" stroke-width="3" filter="url(#dramaticShadow)"/>
    `;
    lightEmitters += `
      <circle cx="800" cy="480" r="350" fill="url(#torchGlowWarm)" opacity="0.6"/>
    `;

  } else if (biome === 'urban') {
    // City intersection with detailed building footprints and stalls
    roomsAndTerrain += `
      <rect width="${width}" height="${height}" fill="url(#cobblestones)"/>
      <!-- Main thoroughfare road -->
      <rect x="0" y="380" width="${width}" height="180" fill="${pal.groundSecondary}" stroke="${pal.detail}" stroke-width="2"/>
      <rect x="680" y="0" width="180" height="${height}" fill="${pal.groundSecondary}" stroke="${pal.detail}" stroke-width="2"/>

      <!-- Northwest Tavern / Inn -->
      <rect x="60" y="50" width="560" height="280" rx="4" fill="${pal.wall}" stroke="${pal.wallHighlight}" stroke-width="12" filter="url(#dramaticShadow)"/>
      <rect x="75" y="65" width="530" height="250" fill="url(#woodPlanks)" opacity="0.9"/>

      <!-- Northeast Guard Post -->
      <rect x="920" y="50" width="620" height="280" rx="4" fill="${pal.wall}" stroke="${pal.wallHighlight}" stroke-width="12" filter="url(#dramaticShadow)"/>

      <!-- South Warehouse -->
      <rect x="60" y="620" width="560" height="230" rx="4" fill="${pal.wall}" stroke="${pal.wallHighlight}" stroke-width="12" filter="url(#dramaticShadow)"/>

      <!-- Southeast Merchant Emporium -->
      <rect x="920" y="620" width="620" height="230" rx="4" fill="${pal.wall}" stroke="${pal.wallHighlight}" stroke-width="12" filter="url(#dramaticShadow)"/>
    `;

    // Central Well & Market Stalls
    propsAndDetails += `
      <!-- Town Square Water Well -->
      <circle cx="770" cy="470" r="40" fill="${pal.wall}" stroke="${pal.wallHighlight}" stroke-width="5" filter="url(#dramaticShadow)"/>
      <circle cx="770" cy="470" r="28" fill="${pal.water || '#2d4452'}"/>

      <!-- Merchant Stalls -->
      <g filter="url(#dramaticShadow)">
        <rect x="520" y="420" width="90" height="50" rx="4" fill="#b45309" stroke="#78350f" stroke-width="2"/>
        <path d="M 520 420 L 610 420 L 600 460 L 530 460 Z" fill="#ef4444" opacity="0.9"/>
      </g>
      <g filter="url(#dramaticShadow)">
        <rect x="940" y="420" width="90" height="50" rx="4" fill="#b45309" stroke="#78350f" stroke-width="2"/>
        <path d="M 940 420 L 1030 420 L 1020 460 L 950 460 Z" fill="#3b82f6" opacity="0.9"/>
      </g>
    `;
    lightEmitters += `
      <circle cx="680" cy="380" r="120" fill="url(#torchGlowWarm)"/>
      <circle cx="860" cy="380" r="120" fill="url(#torchGlowWarm)"/>
      <circle cx="680" cy="560" r="120" fill="url(#torchGlowWarm)"/>
      <circle cx="860" cy="560" r="120" fill="url(#torchGlowWarm)"/>
    `;

  } else {
    // Forest / Wilderness / Desert / Snow / Swamp
    const hasWater = pal.water && (biome === 'forest' || biome === 'swamp' || biome === 'snow');
    roomsAndTerrain += `
      <rect width="${width}" height="${height}" fill="${pal.ground}"/>
      <!-- Winding Path / Dirt Road -->
      <path d="M 0 480 Q 450 360 850 520 T 1600 460" fill="none" stroke="${pal.groundSecondary}" stroke-width="140" />
      <path d="M 0 480 Q 450 360 850 520 T 1600 460" fill="none" stroke="${pal.detail}" stroke-width="10" stroke-dasharray="25 35" opacity="0.5"/>
    `;

    if (hasWater) {
      roomsAndTerrain += `
        <!-- Meandering River -->
        <path d="M 500 0 Q 680 450 600 900" fill="none" stroke="${pal.water}" stroke-width="160" opacity="0.85"/>
        <path d="M 500 0 Q 680 450 600 900" fill="none" stroke="${pal.waterGlow || '#3b82a6'}" stroke-width="20" opacity="0.4" filter="url(#softGlow)"/>
        <!-- Wooden Bridge Crossing -->
        <rect x="470" y="440" width="220" height="90" rx="4" fill="#452a16" stroke="#2a180b" stroke-width="5" filter="url(#dramaticShadow)"/>
        <line x1="470" y1="470" x2="690" y2="470" stroke="#714828" stroke-width="2"/>
        <line x1="470" y1="500" x2="690" y2="500" stroke="#714828" stroke-width="2"/>
      `;
    }

    // Dense Tree Canopies & Foliage
    const treeCoords = [
      { x: 180, y: 180, r: 100 }, { x: 320, y: 140, r: 85 }, { x: 1300, y: 190, r: 110 }, { x: 1450, y: 150, r: 95 },
      { x: 160, y: 720, r: 115 }, { x: 300, y: 780, r: 90 }, { x: 1320, y: 710, r: 125 }, { x: 1470, y: 750, r: 100 },
      { x: 800, y: 160, r: 95 }, { x: 1050, y: 760, r: 105 },
    ];
    treeCoords.forEach(tc => {
      propsAndDetails += `
        <!-- Canopy Cluster -->
        <g filter="url(#dramaticShadow)">
          <circle cx="${tc.x}" cy="${tc.y}" r="${tc.r}" fill="${pal.wall}" opacity="0.5"/>
          <circle cx="${tc.x - 5}" cy="${tc.y - 8}" r="${tc.r * 0.95}" fill="${pal.accent}"/>
          <circle cx="${tc.x - 12}" cy="${tc.y - 15}" r="${tc.r * 0.75}" fill="${pal.groundSecondary}" opacity="0.8"/>
          <!-- Trunk core -->
          <circle cx="${tc.x}" cy="${tc.y}" r="16" fill="#1c120c"/>
        </g>
      `;
    });

    // Campfire or Ruin feature
    propsAndDetails += `
      <!-- Wilderness Campsite -->
      <g filter="url(#dramaticShadow)" transform="translate(980, 320)">
        <!-- Tent -->
        <polygon points="0,0 70,-40 140,0" fill="#a16207" stroke="#713f12" stroke-width="2"/>
        <!-- Fire Pit -->
        <circle cx="70" cy="50" r="18" fill="#292524" stroke="#44403c" stroke-width="3"/>
        <circle cx="70" cy="50" r="10" fill="#ea580c"/>
        <circle cx="70" cy="50" r="5" fill="#fde047"/>
      </g>
    `;
    lightEmitters += `
      <circle cx="1050" cy="370" r="170" fill="url(#torchGlowWarm)"/>
    `;
  }

  // Dynamic Landmark from Custom Prompt if present
  let customLandmark = "";
  if (prompt.includes("watchtower") || prompt.includes("tower") || prompt.includes("fort")) {
    customLandmark = `
      <!-- Ruined Fortress Watchtower Landmark -->
      <g filter="url(#dramaticShadow)" transform="translate(800, 380)">
        <circle cx="0" cy="0" r="90" fill="${pal.wall}" stroke="${pal.wallHighlight}" stroke-width="10"/>
        <circle cx="0" cy="0" r="70" fill="${pal.groundSecondary}"/>
        <!-- Battlements -->
        <circle cx="0" cy="0" r="82" fill="none" stroke="${pal.wallHighlight}" stroke-width="6" stroke-dasharray="24 16"/>
        <!-- Inner trapdoor / staircase -->
        <rect x="-25" y="-25" width="50" height="50" fill="#000000" rx="4"/>
        <line x1="-25" y1="-10" x2="25" y2="-10" stroke="#71717a" stroke-width="2"/>
        <line x1="-25" y1="5" x2="25" y2="5" stroke="#71717a" stroke-width="2"/>
        <line x1="-25" y1="20" x2="25" y2="20" stroke="#71717a" stroke-width="2"/>
      </g>
    `;
    lightEmitters += `<circle cx="800" cy="380" r="160" fill="url(#torchGlowWarm)"/>`;
  } else if (prompt.includes("altar") || prompt.includes("statue") || prompt.includes("shrine") || prompt.includes("ritual")) {
    customLandmark = `
      <!-- Ancient Arcane Shrine Landmark -->
      <g filter="url(#dramaticShadow)" transform="translate(800, 420)">
        <rect x="-80" y="-50" width="160" height="100" rx="8" fill="${pal.wall}" stroke="${pal.wallHighlight}" stroke-width="6"/>
        <rect x="-60" y="-35" width="120" height="70" fill="${pal.groundSecondary}" stroke="#a855f7" stroke-width="2"/>
        <!-- Glowing runes -->
        <circle cx="0" cy="0" r="24" fill="none" stroke="#c084fc" stroke-width="3" stroke-dasharray="8 4"/>
        <polygon points="0,-16 14,10 -14,10" fill="#a855f7" opacity="0.8"/>
      </g>
    `;
    lightEmitters += `<circle cx="800" cy="420" r="180" fill="url(#magicGlowCyan)" opacity="0.9"/>`;
  }

  // Time of Day Lighting Shader Overlay
  let timeOfDayShader = "";
  if (timeOfDay === 'midnight') {
    timeOfDayShader = `<rect width="${width}" height="${height}" fill="#060b24" opacity="0.68" mix-blend-mode="multiply"/>`;
  } else if (timeOfDay === 'dusk') {
    timeOfDayShader = `<rect width="${width}" height="${height}" fill="#581c87" opacity="0.32" mix-blend-mode="color-burn"/>
                       <rect width="${width}" height="${height}" fill="#f97316" opacity="0.2" mix-blend-mode="screen"/>`;
  } else if (timeOfDay === 'dawn') {
    timeOfDayShader = `<rect width="${width}" height="${height}" fill="#f59e0b" opacity="0.22" mix-blend-mode="screen"/>
                       <rect width="${width}" height="${height}" fill="#ec4899" opacity="0.12" mix-blend-mode="overlay"/>`;
  }

  // Weather Overlays
  let weatherShader = "";
  if (weather === 'rain' || weather === 'storm') {
    weatherShader = `
      <pattern id="heavyRain" width="30" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(25)">
        <line x1="0" y1="0" x2="0" y2="18" stroke="#bae6fd" stroke-width="1.4" stroke-opacity="0.5"/>
      </pattern>
      <rect width="${width}" height="${height}" fill="url(#heavyRain)" opacity="0.75"/>
      <rect width="${width}" height="${height}" fill="#0284c7" opacity="0.08"/>
    `;
  } else if (weather === 'snow') {
    weatherShader = `
      <pattern id="snowFlurry" width="50" height="50" patternUnits="userSpaceOnUse">
        <circle cx="12" cy="18" r="2.5" fill="#ffffff" opacity="0.65"/>
        <circle cx="38" cy="38" r="1.8" fill="#ffffff" opacity="0.5"/>
        <circle cx="25" cy="45" r="1.2" fill="#ffffff" opacity="0.7"/>
      </pattern>
      <rect width="${width}" height="${height}" fill="url(#snowFlurry)"/>
      <rect width="${width}" height="${height}" fill="#e0f2fe" opacity="0.12"/>
    `;
  } else if (weather === 'fog') {
    weatherShader = `
      <radialGradient id="fogRadial" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stop-color="#cbd5e1" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="#64748b" stop-opacity="0.25"/>
      </radialGradient>
      <rect width="${width}" height="${height}" fill="url(#fogRadial)"/>
    `;
  }

  // Edge Vignette to frame the cinematic view
  const vignette = `
    <radialGradient id="mapVignette" cx="50%" cy="50%" r="70%">
      <stop offset="60%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.75"/>
    </radialGradient>
    <rect width="${width}" height="${height}" fill="url(#mapVignette)" pointer-events="none"/>
  `;

  // Watermark Badge
  const badge = `
    <g transform="translate(35, 35)" opacity="0.7" filter="url(#dramaticShadow)">
      <rect width="280" height="38" rx="8" fill="#09090b" opacity="0.85" stroke="#27272a" stroke-width="1"/>
      <circle cx="20" cy="19" r="6" fill="#f59e0b"/>
      <text x="35" y="24" fill="#fafafa" font-family="system-ui, sans-serif" font-size="11" font-weight="700" letter-spacing="1.5">
        MISTWALKER • ${biome.toUpperCase()} (${timeOfDay.toUpperCase()})
      </text>
    </g>
  `;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
      <defs>
        ${defs}
      </defs>

      <!-- Base Canvas Background -->
      <rect width="${width}" height="${height}" fill="${pal.ground}"/>

      <!-- Base Geometry & Rooms -->
      ${roomsAndTerrain}

      <!-- Custom Injected Landmarks -->
      ${customLandmark}

      <!-- Props, Furniture, Details -->
      ${propsAndDetails}

      <!-- Tactical 5ft Combat Grid -->
      <rect width="${width}" height="${height}" fill="url(#tacticalGrid)"/>

      <!-- Dynamic Light Blooms -->
      <g style="mix-blend-mode: screen;">
        ${lightEmitters}
      </g>

      <!-- Atmospheric Overlays & Weather -->
      ${timeOfDayShader}
      ${weatherShader}

      <!-- Vignette & Camera Framing -->
      ${vignette}

      <!-- Compass / Metadata Badge -->
      ${badge}
    </svg>
  `.trim();
}
