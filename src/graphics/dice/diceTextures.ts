import * as THREE from 'three';

// Cache generated textures to avoid regenerating identical textures
const textureCache = new Map<string, THREE.CanvasTexture>();

export interface DiceThemeOptions {
  primaryColor?: string; // e.g. '#b45309' (amber gold)
  secondaryColor?: string; // e.g. '#78350f' (deep resin amber)
  numberColor?: string; // e.g. '#fef08a' (gold white)
  borderColor?: string; // e.g. '#f59e0b' (burnished gold)
}

const DEFAULT_THEME: Required<DiceThemeOptions> = {
  primaryColor: '#b45309',
  secondaryColor: '#451a03',
  numberColor: '#ffffff',
  borderColor: '#fbbf24'
};

/**
 * Generate a 20-face triangular atlas for d20
 * 5 columns x 4 rows of 512x512 equilateral triangle tiles (atlas: 2560 x 2048)
 */
export function createD20TextureAtlas(options: DiceThemeOptions = {}): THREE.CanvasTexture {
  const theme = { ...DEFAULT_THEME, ...options };
  const cacheKey = `d20_${theme.primaryColor}_${theme.numberColor}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const cols = 5;
  const rows = 4;
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

  for (let f = 0; f < 20; f++) {
    const col = f % cols;
    const row = Math.floor(f / cols);
    const val = f + 1; // 1 to 20

    const x = col * tileW;
    const y = row * tileH;
    const cx = x + tileW / 2;
    const cy = y + tileH / 2;

    // Draw equilateral triangle bounds inside tile
    // v0: bottom-left, v1: bottom-right, v2: top apex
    const pad = 36;
    const p0 = { x: x + pad, y: y + tileH - pad };
    const p1 = { x: x + tileW - pad, y: y + tileH - pad };
    const p2 = { x: cx, y: y + pad };

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p0.x, p0.y);
    ctx.closePath();
    ctx.clip();

    // Radial resin depth gradient
    const grad = ctx.createRadialGradient(cx, cy + 40, 40, cx, cy, tileW / 1.5);
    if (val === 20) {
      grad.addColorStop(0, '#d97706');
      grad.addColorStop(0.7, '#92400e');
      grad.addColorStop(1, '#451a03');
    } else if (val === 1) {
      grad.addColorStop(0, '#991b1b');
      grad.addColorStop(0.7, '#7f1d1d');
      grad.addColorStop(1, '#450a0a');
    } else {
      grad.addColorStop(0, theme.primaryColor);
      grad.addColorStop(0.7, '#78350f');
      grad.addColorStop(1, theme.secondaryColor);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, tileW, tileH);

    // Subtle metallic edge bevel
    ctx.strokeStyle = val === 20 ? '#fde047' : theme.borderColor;
    ctx.lineWidth = 14;
    ctx.stroke();

    ctx.restore();

    // Inner gold border
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p2.x, p2.y + 16);
    ctx.lineTo(p1.x - 12, p1.y - 10);
    ctx.lineTo(p0.x + 12, p0.y - 10);
    ctx.closePath();
    ctx.strokeStyle = val === 20 ? 'rgba(253, 224, 71, 0.85)' : 'rgba(251, 191, 36, 0.45)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();

    // Draw Face Number
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textY = cy + 45; // Offset slightly down to align with triangle visual centroid

    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 4;

    ctx.font = 'bold 150px "Cinzel", "Times New Roman", Georgia, serif';
    ctx.fillStyle = val === 20 ? '#fef08a' : (val === 1 ? '#fecaca' : theme.numberColor);
    
    let label = String(val);
    ctx.fillText(label, cx, textY);

    // Number underline for 6 and 9
    if (val === 6 || val === 9) {
      ctx.beginPath();
      ctx.arc(cx, textY + 68, 8, 0, Math.PI * 2);
      ctx.fillStyle = theme.numberColor;
      ctx.fill();
    }

    // Nat 20 flare
    if (val === 20) {
      ctx.font = 'bold 36px sans-serif';
      ctx.fillStyle = '#fef08a';
      ctx.fillText('CRIT', cx, textY - 95);
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
    grad.addColorStop(0.7, '#78350f');
    grad.addColorStop(1, theme.secondaryColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Gold border
    ctx.strokeStyle = theme.borderColor;
    ctx.lineWidth = 14;
    ctx.stroke();

    // Inner bevel
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(28, 28, size - 56, size - 56, radius - 8);
    ctx.stroke();

    // Number
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;
    ctx.font = 'bold 220px "Cinzel", "Times New Roman", Georgia, serif';
    ctx.fillStyle = theme.numberColor;
    ctx.fillText(String(val), size / 2, size / 2 + 10);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    materials.push(new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.22,
      metalness: 0.12
    }));
  }

  return materials;
}
