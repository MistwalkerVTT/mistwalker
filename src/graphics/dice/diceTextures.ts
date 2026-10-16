import * as THREE from 'three';

// Cache generated textures to avoid regenerating identical textures
const textureCache = new Map<string, THREE.CanvasTexture>();

export function clearDiceTextureCache() {
  textureCache.forEach(tex => tex.dispose());
  textureCache.clear();
}

export interface DiceThemeOptions {
  primaryColor?: string; // e.g. '#b45309' (amber gold)
  secondaryColor?: string; // e.g. '#451a03' (deep resin amber)
  numberColor?: string; // e.g. '#ffffff' (crisp white)
  borderColor?: string; // e.g. '#fbbf24' (burnished gold)
}

export interface DiceColorPreset {
  id: string;
  name: string;
  description: string;
  theme: Required<DiceThemeOptions>;
  previewColor: string;
  previewGradient: string;
}

export const DICE_COLOR_PRESETS: DiceColorPreset[] = [
  {
    id: 'amber_gold',
    name: 'Gilded Amber',
    description: 'Classic D&D warm amber resin with burnished gold trim.',
    theme: {
      primaryColor: '#b45309',
      secondaryColor: '#451a03',
      borderColor: '#fbbf24',
      numberColor: '#ffffff'
    },
    previewColor: '#f59e0b',
    previewGradient: 'from-amber-600 to-amber-950'
  },
  {
    id: 'arcane_amethyst',
    name: 'Arcane Amethyst',
    description: 'Deep violet arcane crystal with glowing lilac edges.',
    theme: {
      primaryColor: '#7c3aed',
      secondaryColor: '#2e1065',
      borderColor: '#c084fc',
      numberColor: '#ffffff'
    },
    previewColor: '#a855f7',
    previewGradient: 'from-purple-600 to-indigo-950'
  },
  {
    id: 'ruby_magma',
    name: 'Hellfire Magma',
    description: 'Fiery crimson volcanic stone with incandescent white numerals.',
    theme: {
      primaryColor: '#dc2626',
      secondaryColor: '#450a0a',
      borderColor: '#f87171',
      numberColor: '#ffffff'
    },
    previewColor: '#ef4444',
    previewGradient: 'from-red-600 to-zinc-950'
  },
  {
    id: 'emerald_dragon',
    name: 'Emerald Dragon',
    description: 'Polished jade scales with mint-gold border trim.',
    theme: {
      primaryColor: '#059669',
      secondaryColor: '#022c22',
      borderColor: '#34d399',
      numberColor: '#ffffff'
    },
    previewColor: '#10b981',
    previewGradient: 'from-emerald-600 to-teal-950'
  },
  {
    id: 'sapphire_frost',
    name: 'Frostmaiden Ice',
    description: 'Glacial blue sapphire with frosty crystalline gleam.',
    theme: {
      primaryColor: '#0284c7',
      secondaryColor: '#082f49',
      borderColor: '#38bdf8',
      numberColor: '#ffffff'
    },
    previewColor: '#38bdf8',
    previewGradient: 'from-sky-500 to-cyan-950'
  },
  {
    id: 'shadow_obsidian',
    name: 'Shadow Obsidian',
    description: 'Dark obsidian glass with blood-crimson bevel accents.',
    theme: {
      primaryColor: '#18181b',
      secondaryColor: '#09090b',
      borderColor: '#ef4444',
      numberColor: '#ffffff'
    },
    previewColor: '#dc2626',
    previewGradient: 'from-zinc-800 to-black'
  },
  {
    id: 'celestial_ivory',
    name: 'Celestial Ivory',
    description: 'Polished divine ivory marble with crisp dark obsidian numerals.',
    theme: {
      primaryColor: '#fef3c7',
      secondaryColor: '#78350f',
      borderColor: '#d97706',
      numberColor: '#0f172a'
    },
    previewColor: '#fde68a',
    previewGradient: 'from-amber-200 to-amber-700'
  },
  {
    id: 'eldritch_teal',
    name: 'Eldritch Void',
    description: 'Bioluminescent deep-sea abyss with electric cyan runes.',
    theme: {
      primaryColor: '#0d9488',
      secondaryColor: '#042f2e',
      borderColor: '#2dd4bf',
      numberColor: '#ffffff'
    },
    previewColor: '#2dd4bf',
    previewGradient: 'from-teal-600 to-slate-950'
  }
];

export const DEFAULT_THEME: Required<DiceThemeOptions> = DICE_COLOR_PRESETS[0].theme;

/**
 * Generic high-resolution procedural canvas texture atlas generator
 */
export function createPolyhedralAtlas(
  cachePrefix: string,
  labels: string[],
  cols: number,
  rows: number,
  shape: 'triangle' | 'pentagon' | 'kite',
  options: DiceThemeOptions = {}
): THREE.CanvasTexture {
  const theme = { ...DEFAULT_THEME, ...options };
  const cacheKey = `${cachePrefix}_${theme.primaryColor}_${theme.secondaryColor}_${theme.borderColor}_${theme.numberColor}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const tileW = 512;
  const tileH = 512;
  const canvas = document.createElement('canvas');
  canvas.width = cols * tileW;
  canvas.height = rows * tileH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Background
  ctx.fillStyle = theme.secondaryColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let f = 0; f < labels.length; f++) {
    const col = f % cols;
    const row = Math.floor(f / cols);
    const label = labels[f];

    const x = col * tileW;
    const y = row * tileH;
    const cx = x + tileW / 2;
    const cy = y + tileH / 2;

    ctx.save();
    ctx.beginPath();

    if (shape === 'triangle') {
      const pad = 36;
      ctx.moveTo(cx, y + pad);
      ctx.lineTo(x + tileW - pad, y + tileH - pad);
      ctx.lineTo(x + pad, y + tileH - pad);
    } else if (shape === 'pentagon') {
      const r = tileW * 0.44;
      for (let i = 0; i < 5; i++) {
        const angle = -Math.PI / 2 + (i * Math.PI * 2) / 5;
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
    } else {
      // Kite / Deltoid (for d10)
      const pad = 32;
      ctx.moveTo(cx, y + pad);
      ctx.lineTo(x + tileW - pad, cy + 40);
      ctx.lineTo(cx, y + tileH - pad);
      ctx.lineTo(x + pad, cy + 40);
    }

    ctx.closePath();
    ctx.clip();

    // Radial resin depth gradient
    const grad = ctx.createRadialGradient(cx, cy + 30, 40, cx, cy, tileW / 1.4);
    grad.addColorStop(0, theme.primaryColor);
    grad.addColorStop(1, theme.secondaryColor);
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, tileW, tileH);

    // Subtle metallic edge bevel
    ctx.strokeStyle = theme.borderColor;
    ctx.lineWidth = 14;
    ctx.stroke();

    ctx.restore();

    // Inner border accent
    ctx.save();
    ctx.beginPath();
    if (shape === 'triangle') {
      ctx.moveTo(cx, y + 54);
      ctx.lineTo(x + tileW - 48, y + tileH - 46);
      ctx.lineTo(x + 48, y + tileH - 46);
    } else if (shape === 'pentagon') {
      const r = tileW * 0.39;
      for (let i = 0; i < 5; i++) {
        const angle = -Math.PI / 2 + (i * Math.PI * 2) / 5;
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
    } else {
      ctx.moveTo(cx, y + 46);
      ctx.lineTo(x + tileW - 44, cy + 36);
      ctx.lineTo(cx, y + tileH - 46);
      ctx.lineTo(x + 44, cy + 36);
    }
    ctx.closePath();
    ctx.strokeStyle = theme.borderColor;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();

    // Draw Face Number
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textY = shape === 'triangle' ? cy + 46 : (shape === 'kite' ? cy + 12 : cy);

    // Soft drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 4;

    const fontSize = label.length > 2 ? 110 : (label.length === 2 ? 130 : 155);
    ctx.font = `bold ${fontSize}px "Cinzel", "Times New Roman", Georgia, serif`;
    ctx.fillStyle = theme.numberColor;
    
    ctx.fillText(label, cx, textY);

    // Number underline dot for 6 and 9
    if (label === '6' || label === '9') {
      ctx.beginPath();
      ctx.arc(cx, textY + 68, 8, 0, Math.PI * 2);
      ctx.fillStyle = theme.numberColor;
      ctx.fill();
    }

    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  textureCache.set(cacheKey, texture);
  return texture;
}

export function createD20TextureAtlas(options: DiceThemeOptions = {}): THREE.CanvasTexture {
  const labels = Array.from({ length: 20 }, (_, i) => String(i + 1));
  return createPolyhedralAtlas('d20', labels, 5, 4, 'triangle', options);
}

export function createD12TextureAtlas(options: DiceThemeOptions = {}): THREE.CanvasTexture {
  const labels = Array.from({ length: 12 }, (_, i) => String(i + 1));
  return createPolyhedralAtlas('d12', labels, 4, 3, 'pentagon', options);
}

export function createD10TextureAtlas(isPercentile = false, options: DiceThemeOptions = {}): THREE.CanvasTexture {
  const labels = isPercentile
    ? ['00', '10', '20', '30', '40', '50', '60', '70', '80', '90']
    : ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  return createPolyhedralAtlas(isPercentile ? 'd100' : 'd10', labels, 5, 2, 'kite', options);
}

export function createD8TextureAtlas(options: DiceThemeOptions = {}): THREE.CanvasTexture {
  const labels = Array.from({ length: 8 }, (_, i) => String(i + 1));
  return createPolyhedralAtlas('d8', labels, 4, 2, 'triangle', options);
}

export function createD4TextureAtlas(options: DiceThemeOptions = {}): THREE.CanvasTexture {
  const labels = Array.from({ length: 4 }, (_, i) => String(i + 1));
  return createPolyhedralAtlas('d4', labels, 2, 2, 'triangle', options);
}

/**
 * Generate 6 face canvas textures for standard d6
 */
export function createD6Materials(options: DiceThemeOptions = {}): THREE.MeshStandardMaterial[] {
  const theme = { ...DEFAULT_THEME, ...options };
  const size = 512;
  const materials: THREE.MeshStandardMaterial[] = [];

  // d6 face order: 1 (+X), 6 (-X), 2 (+Y), 5 (-Y), 3 (+Z), 4 (-Z)
  const faceValues = [1, 6, 2, 5, 3, 4];

  for (const val of faceValues) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Rounded rectangle border
    const radius = 64;
    ctx.beginPath();
    ctx.roundRect(16, 16, size - 32, size - 32, radius);
    ctx.clip();

    // Resin gradient
    const grad = ctx.createRadialGradient(size / 2, size / 2, 30, size / 2, size / 2, size / 1.5);
    grad.addColorStop(0, theme.primaryColor);
    grad.addColorStop(1, theme.secondaryColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Border
    ctx.strokeStyle = theme.borderColor;
    ctx.lineWidth = 14;
    ctx.stroke();

    // Inner bevel
    ctx.save();
    ctx.strokeStyle = theme.borderColor;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(28, 28, size - 56, size - 56, radius - 8);
    ctx.stroke();
    ctx.restore();

    // Number
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 4;
    ctx.font = 'bold 220px "Cinzel", "Times New Roman", Georgia, serif';
    ctx.fillStyle = theme.numberColor;
    ctx.fillText(String(val), size / 2, size / 2 + 10);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    materials.push(new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.22,
      metalness: 0.12,
      transparent: true,
      opacity: 1.0
    }));
  }

  return materials;
}
