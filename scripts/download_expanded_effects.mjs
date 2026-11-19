// scripts/download_expanded_effects.mjs
// Downloads curated, highest-fidelity D&D 5e spell, class feature, condition ring,
// and dragon breath WebM animations from 4 open-source VTT repositories:
//   1. JB2A Free (Jules-Bens-Aa/JB2A_DnD5e) - CC BY-NC-SA 4.0
//   2. Boss Loot Free (boss-loot/boss-loot-assets-free)
//   3. Jinker's Animated Art (jinkergm/JAA)
//   4. Jack Kerouac's Animated Spell Effects (jackkerouac/animated-spell-effects)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const JB2A = 'https://raw.githubusercontent.com/Jules-Bens-Aa/JB2A_DnD5e/main/';
const BOSSLOOT = 'https://raw.githubusercontent.com/boss-loot/boss-loot-assets-free/main/';
const JAA = 'https://raw.githubusercontent.com/jinkergm/JAA/master/';
const JK = 'https://raw.githubusercontent.com/jackkerouac/animated-spell-effects/master/';

const downloads = [
  // =========================================================================
  // 1. JB2A FREE — Unused Iconic Spells, 8 Magic Schools, Ice, Lightning, TMFX
  // =========================================================================
  // Iconic 5e Spells
  { url: JB2A + 'Library/2nd_Level/Flaming_Sphere/FlamingSphere_02_Orange_400x400.webm', dest: 'public/jb2a/Library/2nd_Level/Flaming_Sphere/FlamingSphere_02_Orange_400x400.webm' },
  { url: JB2A + 'Library/2nd_Level/Flaming_Sphere/FlamingSphere_01_Orange_Thumb.webp', dest: 'public/jb2a/Library/2nd_Level/Flaming_Sphere/FlamingSphere_01_Orange_Thumb.webp' },

  { url: JB2A + 'Library/2nd_Level/Gust_Of_Wind/GustOfWind_01_White_1200x200.webm', dest: 'public/jb2a/Library/2nd_Level/Gust_Of_Wind/GustOfWind_01_White_1200x200.webm' },
  { url: JB2A + 'Library/2nd_Level/Gust_Of_Wind/GustOfWind_01_White_Thumb.webp', dest: 'public/jb2a/Library/2nd_Level/Gust_Of_Wind/GustOfWind_01_White_Thumb.webp' },

  { url: JB2A + 'Library/2nd_Level/Divine_Smite/DivineSmite_01_Regular_BlueYellow_Target_400x400.webm', dest: 'public/jb2a/Library/2nd_Level/Divine_Smite/DivineSmite_01_Regular_BlueYellow_Target_400x400.webm' },
  { url: JB2A + 'Library/2nd_Level/Divine_Smite/DivineSmite_01_Regular_BlueYellow_Target_Thumb.webp', dest: 'public/jb2a/Library/2nd_Level/Divine_Smite/DivineSmite_01_Regular_BlueYellow_Target_Thumb.webp' },

  { url: JB2A + 'Library/3rd_Level/Sleet_Storm/SleetStorm_01_Blue_800x800.webm', dest: 'public/jb2a/Library/3rd_Level/Sleet_Storm/SleetStorm_01_Blue_800x800.webm' },
  { url: JB2A + 'Library/3rd_Level/Sleet_Storm/SleetStorm_01_Blue_Thumb.webp', dest: 'public/jb2a/Library/3rd_Level/Sleet_Storm/SleetStorm_01_Blue_Thumb.webp' },

  { url: JB2A + 'Library/5th_Level/Arcane_Hand/ArcaneHand_Human_01_Idle_Blue_400x400.webm', dest: 'public/jb2a/Library/5th_Level/Arcane_Hand/ArcaneHand_Human_01_Idle_Blue_400x400.webm' },
  { url: JB2A + 'Library/5th_Level/Arcane_Hand/ArcaneHand_Human_01_Idle_Blue_Thumb.webp', dest: 'public/jb2a/Library/5th_Level/Arcane_Hand/ArcaneHand_Human_01_Idle_Blue_Thumb.webp' },

  { url: JB2A + 'Library/Generic/Unarmed_Attacks/Flurry_Of_Blows/FlurryOfBlows_01_Regular_Blue_Magical01_800x600.webm', dest: 'public/jb2a/Library/Generic/Unarmed_Attacks/Flurry_Of_Blows/FlurryOfBlows_01_Regular_Blue_Magical01_800x600.webm' },
  { url: JB2A + 'Library/Generic/Unarmed_Attacks/Flurry_Of_Blows/FlurryOfBlows_01_Regular_Blue_Magical01_Thumb.webp', dest: 'public/jb2a/Library/Generic/Unarmed_Attacks/Flurry_Of_Blows/FlurryOfBlows_01_Regular_Blue_Magical01_Thumb.webp' },

  // Magic Signs (All 8 D&D Schools)
  { url: JB2A + 'Library/Generic/Magic_Signs/AbjurationCircleLoop_02_Regular_Blue_800x800.webm', dest: 'public/jb2a/Library/Generic/Magic_Signs/AbjurationCircleLoop_02_Regular_Blue_800x800.webm' },
  { url: JB2A + 'Library/Generic/Magic_Signs/AbjurationCircleLoop_02_Regular_Blue_Thumb.webp', dest: 'public/jb2a/Library/Generic/Magic_Signs/AbjurationCircleLoop_02_Regular_Blue_Thumb.webp' },
  { url: JB2A + 'Library/Generic/Magic_Signs/ConjurationCircleComplete_02_Regular_Yellow_800x800.webm', dest: 'public/jb2a/Library/Generic/Magic_Signs/ConjurationCircleComplete_02_Regular_Yellow_800x800.webm' },
  { url: JB2A + 'Library/Generic/Magic_Signs/Runes/DivinationRuneComplete_01_Regular_Blue_400x400.webm', dest: 'public/jb2a/Library/Generic/Magic_Signs/Runes/DivinationRuneComplete_01_Regular_Blue_400x400.webm' },
  { url: JB2A + 'Library/Generic/Magic_Signs/EnchantmentCircleComplete_02_Regular_Pink_800x800.webm', dest: 'public/jb2a/Library/Generic/Magic_Signs/EnchantmentCircleComplete_02_Regular_Pink_800x800.webm' },
  { url: JB2A + 'Library/Generic/Magic_Signs/Runes/EvocationRuneComplete_01_Regular_Red_400x400.webm', dest: 'public/jb2a/Library/Generic/Magic_Signs/Runes/EvocationRuneComplete_01_Regular_Red_400x400.webm' },
  { url: JB2A + 'Library/Generic/Magic_Signs/IllusionCircleComplete_02_Regular_Purple_800x800.webm', dest: 'public/jb2a/Library/Generic/Magic_Signs/IllusionCircleComplete_02_Regular_Purple_800x800.webm' },
  { url: JB2A + 'Library/Generic/Magic_Signs/Runes/IllusionRuneComplete_01_Regular_Purple_400x400.webm', dest: 'public/jb2a/Library/Generic/Magic_Signs/Runes/IllusionRuneComplete_01_Regular_Purple_400x400.webm' },
  { url: JB2A + 'Library/Generic/Magic_Signs/Runes/NecromancyRuneComplete_01_Regular_Green_400x400.webm', dest: 'public/jb2a/Library/Generic/Magic_Signs/Runes/NecromancyRuneComplete_01_Regular_Green_400x400.webm' },
  { url: JB2A + 'Library/Generic/Magic_Signs/TransmutationCircleComplete_02_Regular_Yellow_800x800.webm', dest: 'public/jb2a/Library/Generic/Magic_Signs/TransmutationCircleComplete_02_Regular_Yellow_800x800.webm' },
  { url: JB2A + 'Library/Generic/Magic_Signs/Runes/TransmutationRuneComplete_01_Regular_Yellow_400x400.webm', dest: 'public/jb2a/Library/Generic/Magic_Signs/Runes/TransmutationRuneComplete_01_Regular_Yellow_400x400.webm' },

  // Ice, Lightning, Stars, Token Borders & TMFX
  { url: JB2A + 'Library/Generic/Ice/SnowflakeBurst_01_Regular_BlueWhite_Burst_600x600.webm', dest: 'public/jb2a/Library/Generic/Ice/SnowflakeBurst_01_Regular_BlueWhite_Burst_600x600.webm' },
  { url: JB2A + 'Library/Generic/Ice/SnowflakeBurst_01_Regular_BlueWhite_Burst_Thumb.webp', dest: 'public/jb2a/Library/Generic/Ice/SnowflakeBurst_01_Regular_BlueWhite_Burst_Thumb.webp' },
  { url: JB2A + 'Library/Generic/Ice/IceSpikesRadialBurst_01_Regular_White_1000x1000.webm', dest: 'public/jb2a/Library/Generic/Ice/IceSpikesRadialBurst_01_Regular_White_1000x1000.webm' },
  { url: JB2A + 'Library/Generic/Ice/IceSpikesRadialBurst_01_Regular_White_Thumb.webp', dest: 'public/jb2a/Library/Generic/Ice/IceSpikesRadialBurst_01_Regular_White_Thumb.webp' },

  { url: JB2A + 'Library/Generic/Lightning/ElectricArc01_01_Regular_Blue_1600x500.webm', dest: 'public/jb2a/Library/Generic/Lightning/ElectricArc01_01_Regular_Blue_1600x500.webm' },
  { url: JB2A + 'Library/Generic/Lightning/ElectricArc_01_Regular_Blue_Thumb.webp', dest: 'public/jb2a/Library/Generic/Lightning/ElectricArc_01_Regular_Blue_Thumb.webp' },
  { url: JB2A + 'Library/Generic/Lightning/LightningBall_01_Regular_Blue_400x400.webm', dest: 'public/jb2a/Library/Generic/Lightning/LightningBall_01_Regular_Blue_400x400.webm' },
  { url: JB2A + 'Library/Generic/Lightning/LightningBall_01_Regular_Blue_Thumb.webp', dest: 'public/jb2a/Library/Generic/Lightning/LightningBall_01_Regular_Blue_Thumb.webp' },
  { url: JB2A + 'Library/Generic/Lightning/StaticElectricity_01_Regular_Blue_400x400.webm', dest: 'public/jb2a/Library/Generic/Lightning/StaticElectricity_01_Regular_Blue_400x400.webm' },
  { url: JB2A + 'Library/Generic/Lightning/StaticElectricity_01_Regular_Blue_Thumb.webp', dest: 'public/jb2a/Library/Generic/Lightning/StaticElectricity_01_Regular_Blue_Thumb.webp' },

  { url: JB2A + 'Library/Generic/Twinkling_Stars/TwinklingStars_04_Orange_100x100.webm', dest: 'public/jb2a/Library/Generic/Twinkling_Stars/TwinklingStars_04_Orange_100x100.webm' },
  { url: JB2A + 'Library/Generic/Twinkling_Stars/TwinklingStars_04_Thumb.webp', dest: 'public/jb2a/Library/Generic/Twinkling_Stars/TwinklingStars_04_Thumb.webp' },

  { url: JB2A + 'Library/Generic/Token_Border/TokenBorderCircleSpin_01_Regular_Blue_400x400.webm', dest: 'public/jb2a/Library/Generic/Token_Border/TokenBorderCircleSpin_01_Regular_Blue_400x400.webm' },
  { url: JB2A + 'Library/Generic/Token_Border/TokenBorderCircleSpin_01_Regular_Blue_Thumb.webp', dest: 'public/jb2a/Library/Generic/Token_Border/TokenBorderCircleSpin_01_Regular_Blue_Thumb.webp' },

  { url: JB2A + 'Library/TMFX/Border/Circle/BorderOutPulse_01_Circle_Normal_500.webm', dest: 'public/jb2a/Library/TMFX/Border/Circle/BorderOutPulse_01_Circle_Normal_500.webm' },
  { url: JB2A + 'Library/TMFX/Border/Circle/BorderOutPulse_01_Circle_Thumb.webp', dest: 'public/jb2a/Library/TMFX/Border/Circle/BorderOutPulse_01_Circle_Thumb.webp' },

  // =========================================================================
  // 2. BOSS LOOT FREE — High-Fidelity 1200x1200 Spell & Martial Effects
  // =========================================================================
  { url: BOSSLOOT + 'artwork/05-spell/homebrew/hypnotic/Spiral_Hypnotic_Purple_01_1200x1200.webm', dest: 'public/jb2a/Community/BossLoot/Spiral_Hypnotic_Purple_01_1200x1200.webm' },
  { url: BOSSLOOT + 'artwork/05-spell/homebrew/lightning/Radial_Lightning_Shock_01_1200x1200.webm', dest: 'public/jb2a/Community/BossLoot/Radial_Lightning_Shock_01_1200x1200.webm' },
  { url: BOSSLOOT + 'artwork/05-spell/homebrew/fire/FlameShield_1_ORANGE_LOOP_1200x1200.webm', dest: 'public/jb2a/Community/BossLoot/FlameShield_1_ORANGE_LOOP_1200x1200.webm' },
  { url: BOSSLOOT + 'artwork/05-spell/homebrew/air/Vortex_Hole_1_BLUE_PURPLE_1200x1200.webm', dest: 'public/jb2a/Community/BossLoot/Vortex_Hole_1_BLUE_PURPLE_1200x1200.webm' },
  { url: BOSSLOOT + 'artwork/05-spell/homebrew/arcane/sword/Mindflame_Incision_ATTACK_1_1200x1200.webm', dest: 'public/jb2a/Community/BossLoot/Mindflame_Incision_ATTACK_1_1200x1200.webm' },
  { url: BOSSLOOT + 'artwork/05-spell/homebrew/shock/Blood_1_Splatter_1_1200x1200.webm', dest: 'public/jb2a/Community/BossLoot/Blood_1_Splatter_1_1200x1200.webm' },
  { url: BOSSLOOT + 'artwork/01-weapon/arrow/Blood_Arrow_1_30ft_1600x400.webm', dest: 'public/jb2a/Community/BossLoot/Blood_Arrow_1_30ft_1600x400.webm' },
  { url: BOSSLOOT + 'artwork/05-spell/homebrew/heal/Heal_1_BLUE_GREEN_1200x1200.webm', dest: 'public/jb2a/Community/BossLoot/Heal_1_BLUE_GREEN_1200x1200.webm' },
  { url: BOSSLOOT + 'artwork/05-spell/homebrew/shock/Wave_1_Radial_1_WHITE_1200x1200.webm', dest: 'public/jb2a/Community/BossLoot/Wave_1_Radial_1_WHITE_1200x1200.webm' },
  { url: BOSSLOOT + 'artwork/05-spell/homebrew/cast/Bubble_1_Fire_Explosion_Front_RED_ORANGE_1200x1200.webm', dest: 'public/jb2a/Community/BossLoot/Bubble_1_Fire_Explosion_Front_RED_ORANGE_1200x1200.webm' },
  { url: BOSSLOOT + 'artwork/05-spell/homebrew/air/Dust_1_Burst_1_Snipe_1_WHITE_RANGE_15ft_1000x400.webm', dest: 'public/jb2a/Community/BossLoot/Dust_1_Burst_1_Snipe_1_WHITE_RANGE_15ft_1000x400.webm' },
  { url: BOSSLOOT + 'artwork/05-spell/homebrew/fire/Shockwave_1_Fire_1_ORANGE_1200x1200.webm', dest: 'public/jb2a/Community/BossLoot/Shockwave_1_Fire_1_ORANGE_1200x1200.webm' },

  // =========================================================================
  // 3. JINKER'S ANIMATED ART (JAA) — Sunburst, Shields, Condition Rings, Breaths
  // =========================================================================
  { url: JAA + 'AnimatedArt/Spells-Effects/sunburst.webm', dest: 'public/jb2a/Community/JAA/sunburst.webm' },
  { url: JAA + 'AnimatedArt/Spells-Effects/prismaticSprayMESSF.webm', dest: 'public/jb2a/Community/JAA/prismaticSpray.webm' },
  { url: JAA + 'AnimatedArt/Conditions/magicShield.webm', dest: 'public/jb2a/Community/JAA/magicShield.webm' },
  { url: JAA + 'AnimatedArt/Conditions/fireShield.webm', dest: 'public/jb2a/Community/JAA/fireShield.webm' },
  { url: JAA + 'AnimatedArt/Conditions/bloodDripsCircle.webm', dest: 'public/jb2a/Community/JAA/bloodDripsCircle.webm' },
  { url: JAA + 'AnimatedArt/Misc/guardianPortrait.webm', dest: 'public/jb2a/Community/JAA/guardianPortrait.webm' },

  // Dedicated D&D 5e Condition Rings (18 unique rings)
  ...[
    'blindedR.webm', 'charmedR.webm', 'frightenedR.webm', 'poisonedR.webm',
    'paralyzedR.webm', 'petrifiedR.webm', 'stunnedR.webm', 'unconsciousR.webm',
    'invisibleR.webm', 'restrainedR.webm', 'grappledR.webm', 'proneR.webm',
    'bleedingR.webm', 'ragingR.webm', 'concentratingR.webm', 'burningR.webm',
    'hexedR.webm', 'flyingR.webm'
  ].map(file => ({
    url: JAA + 'AnimatedArt/Conditions/Rings/' + file,
    dest: 'public/jb2a/Community/JAA/Rings/' + file
  })),

  // Dragon Breath Weapons (for DM Monster Encounters)
  { url: JAA + 'AnimatedArt/Breath%20Weapon/dragonBornGold-RedFire15Cone.webm', dest: 'public/jb2a/Community/JAA/Breaths/dragonFireCone.webm' },
  { url: JAA + 'AnimatedArt/Breath%20Weapon/dragonBornGreenPoison15Cone.webm', dest: 'public/jb2a/Community/JAA/Breaths/dragonPoisonCone.webm' },
  { url: JAA + 'AnimatedArt/Breath%20Weapon/dragonBorn15ConeNecroticBreath.webm', dest: 'public/jb2a/Community/JAA/Breaths/dragonNecroticCone.webm' },
  { url: JAA + 'AnimatedArt/Breath%20Weapon/dragonBorn15ConeRadiantBreath.webm', dest: 'public/jb2a/Community/JAA/Breaths/dragonRadiantCone.webm' },
  { url: JAA + 'AnimatedArt/Breath%20Weapon/dragonBornBlue-BronzeLightning30x5Line.webm', dest: 'public/jb2a/Community/JAA/Breaths/dragonLightningLine.webm' },
  { url: JAA + 'AnimatedArt/Breath%20Weapon/dragonBornBlack-CopperAcid30x5Line.webm', dest: 'public/jb2a/Community/JAA/Breaths/dragonAcidLine.webm' },

  // =========================================================================
  // 4. JACK KEROUAC CLASSIC — Energy Shield, Disintegration Ray, Smoke, Earth
  // =========================================================================
  { url: JK + 'spell-effects/energy/energy_shield_CIRCLE_01.webm', dest: 'public/jb2a/Community/JackKerouac/energy_shield_CIRCLE_01.webm' },
  { url: JK + 'spell-effects/energy/disintegration_beam_RAY_01.webm', dest: 'public/jb2a/Community/JackKerouac/disintegration_beam_RAY_01.webm' },
  { url: JK + 'spell-effects/air/air_whisps_CIRCLE_01.webm', dest: 'public/jb2a/Community/JackKerouac/air_whisps_CIRCLE_01.webm' },
  { url: JK + 'spell-effects/air/smoke_explosion_CIRCLE_01.webm', dest: 'public/jb2a/Community/JackKerouac/smoke_explosion_CIRCLE_01.webm' },
  { url: JK + 'spell-effects/earth/earth-cracks_SQUARE_01.webm', dest: 'public/jb2a/Community/JackKerouac/earth-cracks_SQUARE_01.webm' },
  { url: JK + 'spell-effects/air/shockwave_CIRCLE_01.webm', dest: 'public/jb2a/Community/JackKerouac/shockwave_CIRCLE_01.webm' },
];

async function downloadFile(item) {
  const fullPath = path.resolve(projectRoot, item.dest);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).size > 1000) {
    return { status: 'skip', dest: item.dest };
  }
  try {
    const res = await fetch(item.url, { headers: { 'User-Agent': 'MistWalker-AssetFetcher' } });
    if (!res.ok) {
      return { status: 'fail', dest: item.dest, error: `HTTP ${res.status} (${item.url})` };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(fullPath, buf);
    return { status: 'ok', dest: item.dest, kb: (buf.length / 1024).toFixed(1) };
  } catch (err) {
    return { status: 'fail', dest: item.dest, error: err.message };
  }
}

async function main() {
  console.log(`Downloading ${downloads.length} curated MistWalker 3.0 spell & condition animations...`);
  let ok = 0, skip = 0, fail = 0;
  const failures = [];
  const CONCURRENCY = 6;

  for (let i = 0; i < downloads.length; i += CONCURRENCY) {
    const batch = downloads.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(downloadFile));
    for (const r of results) {
      if (r.status === 'ok') { ok++; console.log(`[OK]   ${r.dest} (${r.kb} KB)`); }
      else if (r.status === 'skip') { skip++; }
      else { fail++; failures.push(r); console.error(`[FAIL] ${r.dest} -> ${r.error}`); }
    }
  }

  console.log(`\nDone! Downloaded: ${ok}, Skipped: ${skip}, Failed: ${fail}`);
  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main();
