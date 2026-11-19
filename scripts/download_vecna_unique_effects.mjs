// scripts/download_vecna_unique_effects.mjs
// Downloads unique, high-fidelity WebM animations so EVERY spell, weapon attack,
// and class feature of the 6 Vecna Campaign heroes (Aziza, Burmi, Stavros, Etho,
// Arameng, Zal-tan) has its own distinct animation with zero duplicates.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const JB2A = 'https://raw.githubusercontent.com/Jules-Bens-Aa/JB2A_DnD5e/main/';
const BOSSLOOT = 'https://raw.githubusercontent.com/boss-loot/boss-loot-assets-free/main/';
const JK = 'https://raw.githubusercontent.com/jackkerouac/animated-spell-effects/master/';

const downloads = [
  // JB2A Unique Healing, Weapons, Auras, Explosions & Borders
  { url: JB2A + 'Library/Generic/Healing/HealingAbility_01_Yellow_400x400.webm', dest: 'public/jb2a/Library/Generic/Healing/HealingAbility_01_Yellow_400x400.webm' },
  { url: JB2A + 'Library/Generic/Healing/HealingAbility_01_Purple_400x400.webm', dest: 'public/jb2a/Library/Generic/Healing/HealingAbility_01_Purple_400x400.webm' },
  { url: JB2A + 'Library/Generic/Healing/HealingAbility_02_Regular_GreenOrange_Burst_600x600.webm', dest: 'public/jb2a/Library/Generic/Healing/HealingAbility_02_Regular_GreenOrange_Burst_600x600.webm' },
  { url: JB2A + 'Library/Generic/Healing/HealingAbility_03_Regular_BlueGreen_600x600.webm', dest: 'public/jb2a/Library/Generic/Healing/HealingAbility_03_Regular_BlueGreen_600x600.webm' },
  { url: JB2A + 'Library/Generic/Weapon_Attacks/Melee/Group01/MeleeAttack01_MagicSword01_01_Regular_Yellow_800x600.webm', dest: 'public/jb2a/Library/Generic/Weapon_Attacks/Melee/Group01/MeleeAttack01_MagicSword01_01_Regular_Yellow_800x600.webm' },
  { url: JB2A + 'Library/Generic/Explosion/Explosion_03_Regular_BlueYellow_400x400.webm', dest: 'public/jb2a/Library/Generic/Explosion/Explosion_03_Regular_BlueYellow_400x400.webm' },
  { url: JB2A + 'Library/Generic/Template/Circle/Aura/AuraThemedInwardCompleteNature01_01_Regular_Green_700x700.webm', dest: 'public/jb2a/Library/Generic/Template/Circle/Aura/AuraThemedInwardCompleteNature01_01_Regular_Green_700x700.webm' },
  { url: JB2A + 'Library/Generic/Template/Circle/Aura/AuraThemedInwardLoopMetal01_01_Regular_Grey_700x700.webm', dest: 'public/jb2a/Library/Generic/Template/Circle/Aura/AuraThemedInwardLoopMetal01_01_Regular_Grey_700x700.webm' },
  { url: JB2A + 'Library/Generic/Token_Border/TokenBorderCircleSpin_02_Regular_Blue_400x400.webm', dest: 'public/jb2a/Library/Generic/Token_Border/TokenBorderCircleSpin_02_Regular_Blue_400x400.webm' },
  { url: JB2A + 'Library/Generic/Token_Border/TokenBorderCircleSpin_03_Regular_Blue_400x400.webm', dest: 'public/jb2a/Library/Generic/Token_Border/TokenBorderCircleSpin_03_Regular_Blue_400x400.webm' },
  { url: JB2A + 'Library/TMFX/Border/Circle/BorderInPulse_01_Circle_Normal_500.webm', dest: 'public/jb2a/Library/TMFX/Border/Circle/BorderInPulse_01_Circle_Normal_500.webm' },

  // BossLoot Unique Weapons & Arcane Casts
  { url: BOSSLOOT + 'artwork/01-weapon/rapier/Silent_Weaver_ATTACK_1_TRAIL_1_2400x1600.webm', dest: 'public/jb2a/Community/BossLoot/Silent_Weaver_Rapier.webm' },
  { url: BOSSLOOT + 'artwork/01-weapon/arrow/Vortex_Arrow_1_30ft_1600x400.webm', dest: 'public/jb2a/Community/BossLoot/Vortex_Arrow_1_30ft_1600x400.webm' },
  { url: BOSSLOOT + 'artwork/05-spell/homebrew/arcane/arrow/Arrow_Arcane_Shot_Blue_1_30ft_1600x400.webm', dest: 'public/jb2a/Community/BossLoot/Arrow_Arcane_Shot_Blue_1_30ft_1600x400.webm' },
  { url: BOSSLOOT + 'artwork/01-weapon/greatsword/Queens_Burden_ATTACK_1_TRAIL_1_1200x1200.webm', dest: 'public/jb2a/Community/BossLoot/Queens_Burden_Sword.webm' },
  { url: BOSSLOOT + 'artwork/01-weapon/greatclub/Greatclub_1_ATTACK_1_TRAIL_1_1200x1200_5ft.webm', dest: 'public/jb2a/Community/BossLoot/Greatclub_Mace_Attack.webm' },
  { url: BOSSLOOT + 'artwork/01-weapon/flail/toyama-madness-attack.webm', dest: 'public/jb2a/Community/BossLoot/Flail_Censer_Attack.webm' },
  { url: BOSSLOOT + 'artwork/05-spell/homebrew/cast/Spell_Cast_1_CIRCLES_1_BLUE_1_1200x1200.webm', dest: 'public/jb2a/Community/BossLoot/Spell_Cast_1_CIRCLES_1_BLUE_1_1200x1200.webm' },
  { url: BOSSLOOT + 'artwork/05-spell/homebrew/cast/Energy_1_Wipe_1_Radial_1_Smoke_1_ORANGE_1200x1200.webm', dest: 'public/jb2a/Community/BossLoot/Energy_1_Wipe_1_Radial_1_Smoke_1_ORANGE_1200x1200.webm' },
  { url: BOSSLOOT + 'artwork/05-spell/homebrew/impact/Explosion_2_Radial_PURPLE_1200x1200.webm', dest: 'public/jb2a/Community/BossLoot/Explosion_2_Radial_PURPLE_1200x1200.webm' },

  // Jack Kerouac Unique Shields, Portals, Lightning & Radiant Bursts
  { url: JK + 'spell-effects/energy/energy_shield_CIRCLE_02.webm', dest: 'public/jb2a/Community/JackKerouac/energy_shield_CIRCLE_02.webm' },
  { url: JK + 'spell-effects/energy/energy_shield_CIRCLE_03.webm', dest: 'public/jb2a/Community/JackKerouac/energy_shield_CIRCLE_03.webm' },
  { url: JK + 'spell-effects/energy/energy_shield_CIRCLE_04.webm', dest: 'public/jb2a/Community/JackKerouac/energy_shield_CIRCLE_04.webm' },
  { url: JK + 'spell-effects/energy/energy_portal_strange_CIRCLE.webm', dest: 'public/jb2a/Community/JackKerouac/energy_portal_strange_CIRCLE.webm' },
  { url: JK + 'spell-effects/energy/energy_quickburst_CIRCLE_04.webm', dest: 'public/jb2a/Community/JackKerouac/energy_quickburst_CIRCLE_04.webm' },
  { url: JK + 'spell-effects/energy/energy_quickburst_CIRCLE_06.webm', dest: 'public/jb2a/Community/JackKerouac/energy_quickburst_CIRCLE_06.webm' },
  { url: JK + 'spell-effects/energy/energy_quickburst_CIRCLE_07.webm', dest: 'public/jb2a/Community/JackKerouac/energy_quickburst_CIRCLE_07.webm' },
  { url: JK + 'spell-effects/air/clouds_lightning_CIRCLE_01.webm', dest: 'public/jb2a/Community/JackKerouac/clouds_lightning_CIRCLE_01.webm' },
];

async function downloadFile(item) {
  const fullPath = path.resolve(projectRoot, item.dest);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).size > 1000) return { status: 'skip', dest: item.dest };
  try {
    const res = await fetch(item.url, { headers: { 'User-Agent': 'MistWalker-VecnaFetcher' } });
    if (!res.ok) return { status: 'fail', dest: item.dest, error: `HTTP ${res.status}` };
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(fullPath, buf);
    return { status: 'ok', dest: item.dest, kb: (buf.length / 1024).toFixed(1) };
  } catch (err) {
    return { status: 'fail', dest: item.dest, error: err.message };
  }
}

async function main() {
  console.log(`Downloading ${downloads.length} unique Vecna party animations...`);
  let ok = 0, skip = 0, fail = 0;
  for (let i = 0; i < downloads.length; i += 6) {
    const results = await Promise.all(downloads.slice(i, i + 6).map(downloadFile));
    for (const r of results) {
      if (r.status === 'ok') { ok++; console.log(`[OK]   ${r.dest} (${r.kb} KB)`); }
      else if (r.status === 'skip') { skip++; }
      else { fail++; console.error(`[FAIL] ${r.dest} -> ${r.error}`); }
    }
  }
  console.log(`\nDone! Downloaded: ${ok}, Skipped: ${skip}, Failed: ${fail}`);
  if (fail > 0) process.exitCode = 1;
}
main();
