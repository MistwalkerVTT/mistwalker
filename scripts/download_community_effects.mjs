// scripts/download_community_effects.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const downloads = [
  // 1. Official JB2A upstream missing files
  {
    url: 'https://raw.githubusercontent.com/Jules-Bens-Aa/JB2A_DnD5e/main/Library/1st_Level/Detect_Magic/DetectMagicCircle_01_Regular_Blue_1200x1200.webm',
    dest: 'public/jb2a/Library/1st_Level/Detect_Magic/DetectMagicCircle_01_Regular_Blue_1200x1200.webm'
  },
  {
    url: 'https://raw.githubusercontent.com/Jules-Bens-Aa/JB2A_DnD5e/main/Library/1st_Level/Detect_Magic/DetectMagicCircle_01_Regular_Blue_Thumb.webp',
    dest: 'public/jb2a/Library/1st_Level/Detect_Magic/DetectMagicCircle_01_Regular_Blue_Thumb.webp'
  },
  {
    url: 'https://raw.githubusercontent.com/Jules-Bens-Aa/JB2A_DnD5e/main/Library/3rd_Level/Wind_Wall/WindWall_01_500x100.webm',
    dest: 'public/jb2a/Library/3rd_Level/Wind_Wall/WindWall_01_500x100.webm'
  },
  {
    url: 'https://raw.githubusercontent.com/Jules-Bens-Aa/JB2A_DnD5e/main/Library/3rd_Level/Wind_Wall/WindWall_01_Thumb.webp',
    dest: 'public/jb2a/Library/3rd_Level/Wind_Wall/WindWall_01_Thumb.webp'
  },

  // 2. Jinker's Animated Art (JAA) - Spells & Effects
  {
    url: 'https://raw.githubusercontent.com/jinkergm/JAA/master/AnimatedArt/Spells-Effects/MordenkainensMagnificentMansion.webm',
    dest: 'public/jb2a/Community/JAA/MordenkainensMagnificentMansion.webm'
  },
  {
    url: 'https://raw.githubusercontent.com/jinkergm/JAA/master/AnimatedArt/Spells-Effects/bladeBarrier.webm',
    dest: 'public/jb2a/Community/JAA/bladeBarrier.webm'
  },
  {
    url: 'https://raw.githubusercontent.com/jinkergm/JAA/master/AnimatedArt/Spells-Effects/glyphOfWarding.webm',
    dest: 'public/jb2a/Community/JAA/glyphOfWarding.webm'
  },
  {
    url: 'https://raw.githubusercontent.com/jinkergm/JAA/master/AnimatedArt/Spells-Effects/alarm.webm',
    dest: 'public/jb2a/Community/JAA/alarm.webm'
  },
  {
    url: 'https://raw.githubusercontent.com/jinkergm/JAA/master/AnimatedArt/Spells-Effects/chain1.webm',
    dest: 'public/jb2a/Community/JAA/chain1.webm'
  },
  {
    url: 'https://raw.githubusercontent.com/jinkergm/JAA/master/AnimatedArt/Spells-Effects/chain2.webm',
    dest: 'public/jb2a/Community/JAA/chain2.webm'
  },
  {
    url: 'https://raw.githubusercontent.com/jinkergm/JAA/master/AnimatedArt/Spells-Effects/arcaneEye.webm',
    dest: 'public/jb2a/Community/JAA/arcaneEye.webm'
  },
  {
    url: 'https://raw.githubusercontent.com/jinkergm/JAA/master/AnimatedArt/Spells-Effects/colorSpray.webm',
    dest: 'public/jb2a/Community/JAA/colorSpray.webm'
  },
  {
    url: 'https://raw.githubusercontent.com/jinkergm/JAA/master/AnimatedArt/Spells-Effects/circleOfDeath.webm',
    dest: 'public/jb2a/Community/JAA/circleOfDeath.webm'
  },
  {
    url: 'https://raw.githubusercontent.com/jinkergm/JAA/master/AnimatedArt/Spells-Effects/cloudKill.webm',
    dest: 'public/jb2a/Community/JAA/cloudKill.webm'
  },
  {
    url: 'https://raw.githubusercontent.com/jinkergm/JAA/master/AnimatedArt/Spells-Effects/IncendiaryCloud.webm',
    dest: 'public/jb2a/Community/JAA/IncendiaryCloud.webm'
  },
  {
    url: 'https://raw.githubusercontent.com/jinkergm/JAA/master/AnimatedArt/Spells-Effects/AuraofVitality.webm',
    dest: 'public/jb2a/Community/JAA/AuraofVitality.webm'
  },
  {
    url: 'https://raw.githubusercontent.com/jinkergm/JAA/master/AnimatedArt/Spells-Effects/auraOfLife.webm',
    dest: 'public/jb2a/Community/JAA/auraOfLife.webm'
  },
  {
    url: 'https://raw.githubusercontent.com/jinkergm/JAA/master/AnimatedArt/Spells-Effects/earthTremor.webm',
    dest: 'public/jb2a/Community/JAA/earthTremor.webm'
  },
  {
    url: 'https://raw.githubusercontent.com/jinkergm/JAA/master/AnimatedArt/Spells-Effects/destructiveWave.webm',
    dest: 'public/jb2a/Community/JAA/destructiveWave.webm'
  },
  {
    url: 'https://raw.githubusercontent.com/jinkergm/JAA/master/AnimatedArt/Spells-Effects/ensnaringStrike.webm',
    dest: 'public/jb2a/Community/JAA/ensnaringStrike.webm'
  },
  {
    url: 'https://raw.githubusercontent.com/jinkergm/JAA/master/AnimatedArt/Spells-Effects/InsectPlague.0.webm',
    dest: 'public/jb2a/Community/JAA/InsectPlague.0.webm'
  },
  {
    url: 'https://raw.githubusercontent.com/jinkergm/JAA/master/AnimatedArt/Spells-Effects/LeomundsTinyHut.0.webm',
    dest: 'public/jb2a/Community/JAA/LeomundsTinyHut.0.webm'
  },
  {
    url: 'https://raw.githubusercontent.com/jinkergm/JAA/master/AnimatedArt/Spells-Effects/vines4.webm',
    dest: 'public/jb2a/Community/JAA/vines4.webm'
  },

  // 3. Jack Kerouac Animated Spell Effects
  {
    url: 'https://raw.githubusercontent.com/jackkerouac/animated-spell-effects/master/spell-effects/ice/ice_shield_rotating_SQUARE_01.webm',
    dest: 'public/jb2a/Community/JackKerouac/ice_shield_rotating_SQUARE_01.webm'
  },
  {
    url: 'https://raw.githubusercontent.com/jackkerouac/animated-spell-effects/master/spell-effects/misc/lathander_symbol_CIRCLE_01.webm',
    dest: 'public/jb2a/Community/JackKerouac/lathander_symbol_CIRCLE_01.webm'
  },
  {
    url: 'https://raw.githubusercontent.com/jackkerouac/animated-spell-effects/master/spell-effects/misc/wings_RECTANGLE_01.webm',
    dest: 'public/jb2a/Community/JackKerouac/wings_RECTANGLE_01.webm'
  },
  {
    url: 'https://raw.githubusercontent.com/jackkerouac/animated-spell-effects/master/spell-effects/misc/skull_blast_CIRCLE_01.webm',
    dest: 'public/jb2a/Community/JackKerouac/skull_blast_CIRCLE_01.webm'
  },
  {
    url: 'https://raw.githubusercontent.com/jackkerouac/animated-spell-effects/master/spell-effects/misc/runes_CIRCLE_02.webm',
    dest: 'public/jb2a/Community/JackKerouac/runes_CIRCLE_02.webm'
  },
  {
    url: 'https://raw.githubusercontent.com/jackkerouac/animated-spell-effects/master/spell-effects/magic/magic_circle_CIRCLE_01.webm',
    dest: 'public/jb2a/Community/JackKerouac/magic_circle_CIRCLE_01.webm'
  },
  {
    url: 'https://raw.githubusercontent.com/jackkerouac/animated-spell-effects/master/spell-effects/energy/energy_quickburst_CIRCLE_01.webm',
    dest: 'public/jb2a/Community/JackKerouac/energy_quickburst_CIRCLE_01.webm'
  }
];

async function downloadFile(url, destRelative) {
  const fullPath = path.resolve(projectRoot, destRelative);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(fullPath)) {
    const stats = fs.statSync(fullPath);
    if (stats.size > 1000) {
      console.log(`[SKIP] Already exists (${(stats.size / 1024).toFixed(1)} KB): ${destRelative}`);
      return true;
    }
  }

  console.log(`[DOWNLOADING] ${url} -> ${destRelative}`);
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`[ERROR] Failed to fetch ${url} (HTTP ${res.status})`);
    return false;
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(fullPath, buffer);
  console.log(`[OK] Saved ${(buffer.length / 1024).toFixed(1)} KB to ${destRelative}`);
  return true;
}

async function main() {
  console.log(`Starting community effects download (${downloads.length} files)...`);
  let successCount = 0;
  for (const item of downloads) {
    try {
      const ok = await downloadFile(item.url, item.dest);
      if (ok) successCount++;
    } catch (err) {
      console.error(`[ERROR] ${item.dest}:`, err.message);
    }
  }
  console.log(`\nDownload summary: ${successCount} / ${downloads.length} successful.`);
}

main();
