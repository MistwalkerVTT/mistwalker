// scripts/downloadSpellSfx.mjs
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://raw.githubusercontent.com/JimHPerry/psfx/main/';
const OUTPUT_DIR = path.resolve('public', 'audio', 'sfx', 'spells');

const SFX_MAP = {
  'fire_explosion.ogg': 'library/3rd-level-spells/fireball/v1/fireball-explosion-01.ogg',
  'fire_whoosh.ogg': 'library/cantrips/fire-bolt/v1/fire-bolt-001-30ft.ogg',
  'lightning_strike.ogg': 'library/3rd-level-spells/call-lightning/v1/primary/lightning-strike-001.ogg',
  'lightning_blast.ogg': 'library/cantrips/shocking-grasp/v1/shocking-grasp-001.ogg',
  'thunder_boom.ogg': 'library/cantrips/thunderclap/v1/thunderclap-001.ogg',
  'cold_freeze.ogg': 'library/5th-level-spells/cone-of-cold/v1/cone-of-cold-00.ogg',
  'cold_blast.ogg': 'library/cantrips/ray-of-frost/v1/ray-of-frost-003.ogg',
  'frost_shatter.ogg': 'library/cantrips/ray-of-frost/v1/ray-of-frost-003.ogg',
  'eldritch_blast.ogg': 'library/cantrips/eldritch-blast/v1/eldritch-blast-001.ogg',
  'arcane_cast.ogg': 'library/1st-level-spells/magic-missile/v1/magic-missile-001-30ft.ogg',
  'magic_whoosh.ogg': 'library/1st-level-spells/magic-missile/v1/magic-missile-001-15ft.ogg',
  'magic_hum.ogg': 'library/1st-level-spells/detect-magic/v1/detect-magic-001.ogg',
  'magic_whisper.ogg': 'library/cantrips/toll-the-dead/v1/rasping-whispers-001.ogg',
  'magic_bell.ogg': 'library/cantrips/toll-the-dead/v1/ominous-bell-001.ogg',
  'magic_chime.ogg': 'library/1st-level-spells/bless/v1/bless-v1-001.ogg',
  'radiant_heal.ogg': 'library/1st-level-spells/cure-wounds/v1/cure-wounds-00.ogg',
  'radiant_burst.ogg': 'library/cantrips/sacred-flame/v1/sacred-flame-target-01.ogg',
  'holy_radiance.ogg': 'library/cantrips/sacred-flame/v1/sacred-flame-caster-01.ogg',
  'necrotic_drain.ogg': 'library/1st-level-spells/arms-of-hadar/v1/arms-of-hadar-00.ogg',
  'shield_barrier.ogg': 'library/1st-level-spells/shield-spell/v1/shield-spell-v1-intro-03.ogg',
  'shield_clash.ogg': 'library/1st-level-spells/shield-spell/v1/shield-spell-v1-intro-03.ogg',
  'teleport_whoosh.ogg': 'library/2nd-level-spells/misty-step/v1/complete/misty-step-complete-generic-001.ogg',
  'wind_whoosh.ogg': 'library/cantrips/gust/v1/gust-001.ogg',
  'acid_burn.ogg': 'library/cantrips/acid-splash/v1/acid-splash-003-30ft.ogg',
  'metal_clang.ogg': 'library/impacts/bludgeoning/v1/meleeattack-impacts-bludgeoning-01.ogg',
  'sword_slash.ogg': 'library/impacts/slashing/v1/meleeattack-impacts-slashing-01.ogg',
  'generic_cast.ogg': 'library/1st-level-spells/magic-missile/v1/magic-missile-001-05ft.ogg'
};

async function downloadAll() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log(`Starting download of ${Object.keys(SFX_MAP).length} studio sound effects...`);
  let successCount = 0;
  let totalBytes = 0;

  for (const [filename, relPath] of Object.entries(SFX_MAP)) {
    const dest = path.join(OUTPUT_DIR, filename);
    const url = BASE_URL + relPath;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(dest, buffer);
      totalBytes += buffer.byteLength;
      successCount++;
      console.log(`✓ [${successCount}/${Object.keys(SFX_MAP).length}] Saved ${filename} (${(buffer.byteLength / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.error(`✗ Failed to download ${filename} from ${url}:`, err.message);
    }
  }

  console.log(`\n🎉 Completed! Successfully saved ${successCount} sound files (${(totalBytes / 1024).toFixed(1)} KB total).`);
}

downloadAll();
