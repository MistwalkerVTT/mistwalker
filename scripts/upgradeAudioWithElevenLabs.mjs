import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const API_KEY = process.env.ELEVENLABS_API_KEY || process.env.XI_API_KEY;
if (!API_KEY) {
  console.error('Missing ELEVENLABS_API_KEY in .env');
  process.exit(1);
}

const SPELL_SFX_DIR = path.resolve('public/audio/sfx/spells');
const PADS_DIR = path.resolve('public/audio/jukebox/pads');
const AMBIENCE_DIR = path.resolve('public/audio/jukebox/ambience');
const MUSIC_DIR = path.resolve('public/audio/jukebox/music');

for (const dir of [SPELL_SFX_DIR, PADS_DIR, AMBIENCE_DIR, MUSIC_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

// 1. Missing, Duplicate, & Low-Quality Spell/Combat SFX to generate with ElevenLabs Sound Generation
const SPELL_SFX_JOBS = [
  // Missing / Previously Aliased Keys
  {
    key: 'water_splash',
    duration: 2.5,
    prompt: 'Magical high-pressure tidal water wave crash and deep liquid splash impact, fantasy RPG spell sound effect'
  },
  {
    key: 'thunder_crack',
    duration: 2.5,
    prompt: 'Sharp deafening close-range lightning thunder crack and electric shockwave snap, fantasy RPG spell'
  },
  {
    key: 'thunder_blast',
    duration: 3.0,
    prompt: 'Concussive sonic boom thunderwave blast shattering air with deep sub-bass shockwave, fantasy spell'
  },
  {
    key: 'cold_frost',
    duration: 2.5,
    prompt: 'Crystalline creeping ice frost rapidly freezing over stone with arctic wind shimmer, fantasy ice spell'
  },
  {
    key: 'frost_shatter',
    duration: 2.5,
    prompt: 'Massive frozen ice crystal glacier violently shattering into razor shards with sub-zero impact'
  },
  {
    key: 'magic_explosion',
    duration: 3.0,
    prompt: 'Arcane force explosion detonation with resonant purple energy shockwave and crystalline debris'
  },
  {
    key: 'magic_shatter',
    duration: 2.5,
    prompt: 'High-pitched resonant glass and arcane crystal barrier shattering into a thousand echoing fragments'
  },
  {
    key: 'divine_chime',
    duration: 3.0,
    prompt: 'Celestial angelic choir harmonic bell chime and golden radiant blessing resonance, paladin cleric spell'
  },
  {
    key: 'necrotic_pulse',
    duration: 3.0,
    prompt: 'Dark abyssal necrotic heartbeat pulse with bone-chilling shadow wraith exhale and soul drain'
  },
  {
    key: 'shield_clash',
    duration: 2.0,
    prompt: 'Heavy medieval steel broadsword slamming against a reinforced iron knight shield with metallic ring'
  },
  {
    key: 'teleport',
    duration: 2.0,
    prompt: 'Instant dimensional blink teleportation pop with spatial vacuum implosion and arcane shimmer'
  },
  {
    key: 'wind_gust',
    duration: 3.0,
    prompt: 'Powerful cyclone wind gust vortex howling and sweeping leaves and dust across a battleground'
  },
  // Low-Quality / Tiny Files to Upgrade
  {
    key: 'sword_slash',
    duration: 1.8,
    prompt: 'Razor-sharp medieval steel longsword swoosh and visceral armor-piercing slash impact'
  },
  {
    key: 'metal_clang',
    duration: 2.0,
    prompt: 'Heavy forged warhammer and greataxe clanging against plate armor with sparks and metallic resonance'
  },
  {
    key: 'generic_cast',
    duration: 2.5,
    prompt: 'Mystical arcane spellcasting incantation whoosh with glowing runic energy discharge'
  },
  {
    key: 'magic_whoosh',
    duration: 2.0,
    prompt: 'Fast arcane projectile missile whooshing through the air with sparkling magical trail'
  },
  {
    key: 'arcane_cast',
    duration: 2.8,
    prompt: 'Deep wizard spell weave activation with shimmering astral chords and eldritch power surge'
  },
  {
    key: 'acid_burn',
    duration: 2.8,
    prompt: 'Caustic bubbling venom and corrosive acid splash sizzling and dissolving stone and metal'
  },
  {
    key: 'thunder_boom',
    duration: 3.0,
    prompt: 'Colossal rolling thunderclap boom shaking the earth with deep reverberating bass'
  },
  {
    key: 'eldritch_blast',
    duration: 2.5,
    prompt: 'Crackling dark purple warlock eldritch beam firing with a distorted otherworldly force impact'
  },
  {
    key: 'fire_explosion',
    duration: 3.2,
    prompt: 'Cinematic D&D Fireball spell detonation: whistling ember ignition followed by a massive roaring inferno explosion'
  }
];

// 2. All 16 Built-in Soundboard Pads
const SOUNDBOARD_PAD_JOBS = [
  {
    key: 'pad_door_creak',
    duration: 3.5,
    prompt: 'Heavy ancient medieval oak dungeon door slowly creaking open on rusty iron hinges in a stone hall'
  },
  {
    key: 'pad_portcullis_slam',
    duration: 3.0,
    prompt: 'Massive iron castle portcullis gate dropping chains and slamming violently onto a stone dungeon floor'
  },
  {
    key: 'pad_secret_stone',
    duration: 4.0,
    prompt: 'Heavy ancient stone wall secret door grinding and sliding open against rough masonry in a dark tomb'
  },
  {
    key: 'pad_lock_click',
    duration: 2.0,
    prompt: 'Crisp medieval iron lock tumblers clicking and heavy bolt sliding open with thieves tools'
  },
  {
    key: 'pad_trap_click',
    duration: 2.0,
    prompt: 'Deadly dungeon stone floor pressure plate clicking down followed by a taut metallic spring trigger snap'
  },
  {
    key: 'pad_dart_volley',
    duration: 2.5,
    prompt: 'Volley of deadly poison darts and crossbow bolts firing from hidden wall slots and thudding into wood'
  },
  {
    key: 'pad_poison_gas',
    duration: 3.5,
    prompt: 'High-pressure noxious poison gas trap venting and hissing loudly from hidden dungeon stone nozzles'
  },
  {
    key: 'pad_collapse_rumble',
    duration: 4.0,
    prompt: 'Violent subterranean cave-in with heavy stone boulders crashing down and rumbling dungeon tremor'
  },
  {
    key: 'pad_dragon_roar',
    duration: 4.0,
    prompt: 'Terrifying colossal ancient red dragon roaring with guttural fire-breathing resonance in a vast cavern'
  },
  {
    key: 'pad_undead_shriek',
    duration: 3.5,
    prompt: 'Blood-curdling ghostly banshee wail and terrifying undead crypt shriek echoing in the dark'
  },
  {
    key: 'pad_war_horn',
    duration: 4.5,
    prompt: 'Deep ancient Viking and fantasy dread war horn bellowing a long echoing battle call across a misty valley'
  },
  {
    key: 'pad_steel_clash',
    duration: 3.5,
    prompt: 'Intense medieval melee ambush with multiple steel swords clashing against shields, armor, and battle cries'
  },
  {
    key: 'pad_thunderclap',
    duration: 3.5,
    prompt: 'Blinding lightning bolt strike and immediate deafening thunderclap shaking the sky'
  },
  {
    key: 'pad_crowd_cheer',
    duration: 4.0,
    prompt: 'Boisterous medieval fantasy tavern crowd roaring in celebration, cheering, applause, and clinking ale tankards'
  },
  {
    key: 'pad_ominous_bell',
    duration: 4.5,
    prompt: 'Deep gothic cathedral bronze doom bell tolling slowly in a foggy cursed graveyard'
  },
  {
    key: 'pad_arcane_portal',
    duration: 4.0,
    prompt: 'Massive interdimensional arcane portal tearing open with swirling cosmic bass hum and crackling leyline lightning'
  }
];

// 3. 7 Built-in Environmental & Weather Loops (loop: true)
const AMBIENCE_LOOP_JOBS = [
  {
    key: 'crackling_campfire',
    duration: 12.0,
    prompt: 'Warm cozy medieval tavern hearth and wilderness campfire logs crackling steadily with gentle popping embers'
  },
  {
    key: 'dungeon_drips',
    duration: 12.0,
    prompt: 'Dark subterranean stone dungeon cavern ambience with echoing water droplets dripping into underground pools'
  },
  {
    key: 'tavern_crowd',
    duration: 12.0,
    prompt: 'Lively medieval fantasy inn common room ambience with warm background crowd murmur, clinking tankards, and distant laughter'
  },
  {
    key: 'whispering_souls',
    duration: 12.0,
    prompt: 'Eerie haunted necromancer crypt altar with ghostly overlapping spectral whispers and dark eldritch resonance'
  },
  {
    key: 'heavy_rain',
    duration: 12.0,
    prompt: 'Steady heavy rainstorm downpour pattering against medieval cobblestone, slate rooftops, and forest leaves'
  },
  {
    key: 'howling_wind',
    duration: 12.0,
    prompt: 'Desolate howling mountain pass and deep cavern wind sweeping through ancient stone ruins'
  },
  {
    key: 'distant_thunder',
    duration: 12.0,
    prompt: 'Ominous dark storm ambience with low rolling distant thunder rumbles and brooding storm wind'
  }
];

// 4. 5 Built-in Music Tracks via ElevenLabs Music API (/v1/music)
const MUSIC_TRACK_JOBS = [
  {
    key: 'tavern_hearth',
    lengthMs: 25000,
    prompt: 'Warm medieval fantasy tavern instrumental music featuring acoustic lute, fingerpicked guitar, gentle wooden flute, and cozy hearth atmosphere, no vocals'
  },
  {
    key: 'crypt_catacombs',
    lengthMs: 25000,
    prompt: 'Dark atmospheric dungeon exploration instrumental soundtrack with deep bowed cello drones, eerie gothic chimes, and suspenseful dark fantasy ambience, no vocals'
  },
  {
    key: 'boss_battle_pulse',
    lengthMs: 25000,
    prompt: 'Epic dark fantasy RPG boss battle orchestral combat music with driving war drums, aggressive staccato strings, and menacing low brass, instrumental only'
  },
  {
    key: 'arcane_sanctum',
    lengthMs: 25000,
    prompt: 'Mystical high-fantasy wizard sanctum instrumental music with ethereal celesta, shimmering harp arpeggios, and cosmic glass pads, no vocals'
  },
  {
    key: 'overland_frontier',
    lengthMs: 25000,
    prompt: 'Sweeping tranquil fantasy wilderness exploration instrumental soundtrack with acoustic strings, pastoral oboe, and gentle Celtic harp, no vocals'
  }
];

async function generateSfx({ text, duration, loop = false, outFile }) {
  if (fs.existsSync(outFile) && fs.statSync(outFile).size > 10000) {
    console.log(`[SKIP] Already exists: ${path.basename(outFile)}`);
    return true;
  }
  const res = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
    method: 'POST',
    headers: {
      'xi-api-key': API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg'
    },
    body: JSON.stringify({
      text,
      duration_seconds: duration,
      prompt_influence: 0.45,
      loop
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`[FAIL] ${path.basename(outFile)} (${res.status}): ${errText}`);
    return false;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outFile, buf);
  console.log(`[OK] Generated ${path.basename(outFile)} (${(buf.length / 1024).toFixed(1)} KB)`);
  return true;
}

async function generateMusic({ prompt, lengthMs, outFile }) {
  if (fs.existsSync(outFile) && fs.statSync(outFile).size > 20000) {
    console.log(`[SKIP] Already exists: ${path.basename(outFile)}`);
    return true;
  }
  const res = await fetch('https://api.elevenlabs.io/v1/music', {
    method: 'POST',
    headers: {
      'xi-api-key': API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg'
    },
    body: JSON.stringify({
      prompt,
      music_length_ms: lengthMs,
      force_instrumental: true
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`[FAIL] Music ${path.basename(outFile)} (${res.status}): ${errText}`);
    return false;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outFile, buf);
  console.log(`[OK] Generated Music ${path.basename(outFile)} (${(buf.length / 1024).toFixed(1)} KB)`);
  return true;
}

async function runPool(items, worker, concurrency = 3) {
  let idx = 0;
  const runners = Array.from({ length: concurrency }, async () => {
    while (idx < items.length) {
      const current = items[idx++];
      try {
        await worker(current);
      } catch (err) {
        console.error('Worker error:', err);
      }
    }
  });
  await Promise.all(runners);
}

(async () => {
  console.log('=== 1. Generating 21 Upgraded Spell & Combat SFX via ElevenLabs ===');
  await runPool(
    SPELL_SFX_JOBS,
    (job) =>
      generateSfx({
        text: job.prompt,
        duration: job.duration,
        loop: false,
        outFile: path.join(SPELL_SFX_DIR, `${job.key}.mp3`)
      }),
    3
  );

  console.log('=== 2. Generating 16 Soundboard Pads via ElevenLabs ===');
  await runPool(
    SOUNDBOARD_PAD_JOBS,
    (job) =>
      generateSfx({
        text: job.prompt,
        duration: job.duration,
        loop: false,
        outFile: path.join(PADS_DIR, `${job.key}.mp3`)
      }),
    3
  );

  console.log('=== 3. Generating 7 Seamless Ambience & Weather Loops via ElevenLabs ===');
  await runPool(
    AMBIENCE_LOOP_JOBS,
    (job) =>
      generateSfx({
        text: job.prompt,
        duration: job.duration,
        loop: true,
        outFile: path.join(AMBIENCE_DIR, `${job.key}.mp3`)
      }),
    3
  );

  console.log('=== 4. Generating 5 Instrumental Fantasy Music Tracks via ElevenLabs Music ===');
  await runPool(
    MUSIC_TRACK_JOBS,
    (job) =>
      generateMusic({
        prompt: job.prompt,
        lengthMs: job.lengthMs,
        outFile: path.join(MUSIC_DIR, `${job.key}.mp3`)
      }),
    2
  );

  console.log('=== ALL ELEVENLABS AUDIO GENERATION COMPLETE ===');
})();
