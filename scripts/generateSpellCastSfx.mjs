import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const API_KEY = process.env.ELEVENLABS_API_KEY || process.env.XI_API_KEY;
if (!API_KEY) {
  console.error('Missing ELEVENLABS_API_KEY in .env');
  process.exit(1);
}

const SPELL_SFX_DIR = path.resolve('public/audio/sfx/spells');
fs.mkdirSync(SPELL_SFX_DIR, { recursive: true });

const NEW_SPELL_SFX_JOBS = [
  // Group 1: Previously Missing Keys in jb2aRegistry.ts & tokenFxMap.ts
  {
    key: 'gas_leak',
    duration: 3.0,
    prompt: 'Deadly Cloudkill spell: billowing toxic green poison gas cloud hissing and bubbling with noxious fumes'
  },
  {
    key: 'earth_rumble',
    duration: 2.8,
    prompt: 'Earth Tremor spell: violent subterranean ground shockwave cracking stone floor with deep tectonic rumble'
  },
  {
    key: 'nature_rustle',
    duration: 2.8,
    prompt: 'Entangle and Ensnaring Strike spell: thick thorny vines and twisted tree roots bursting from the earth and wrapping tightly'
  },
  {
    key: 'insect_buzz',
    duration: 3.0,
    prompt: 'Insect Plague spell: deafening swarm of thousands of biting locusts buzzing and chittering aggressively'
  },
  {
    key: 'whip_crack',
    duration: 2.0,
    prompt: 'Thorn Whip cantrip: barbed magical vine lashing through the air with a sharp supersonic whip crack'
  },
  {
    key: 'curse',
    duration: 2.8,
    prompt: 'Dark necromantic hex curse spell sting with dread sub-bass drop and chilling phantom exhale'
  },

  // Group 2: Martial & Weapon Attacks (Replacing duplicate fire_whoosh)
  {
    key: 'greatsword_cleave',
    duration: 2.0,
    prompt: 'Massive two-handed steel greatsword heavy swing whistling through the air and cleaving plate armor'
  },
  {
    key: 'dagger_stab',
    duration: 1.6,
    prompt: 'Quick lethal rogue steel dagger unsheathing zip and sharp piercing stab impact'
  },
  {
    key: 'bow_arrow',
    duration: 2.0,
    prompt: 'Medieval longbow taut bowstring twang release followed by a feathered arrow whistling and thudding into target'
  },
  {
    key: 'crossbow_shot',
    duration: 2.0,
    prompt: 'Heavy iron crossbow mechanical trigger snap and high-velocity bolt whoosh and solid impact'
  },
  {
    key: 'claw_rip',
    duration: 2.0,
    prompt: 'Ferocious monster beast claws slashing and tearing with a vicious predator snarl'
  },
  {
    key: 'beast_bite',
    duration: 2.0,
    prompt: 'Savage monster jaws snapping shut with wet fangs crunching and guttural growl'
  },
  {
    key: 'unarmed_punch',
    duration: 1.6,
    prompt: 'Heavy martial arts monk fist punch impact with crisp air snap and bone-crushing thud'
  },
  {
    key: 'sneak_attack',
    duration: 2.2,
    prompt: 'Rogue Sneak Attack: stealthy shadow blade backstab slice with a sharp lethal critical hit sting'
  },
  {
    key: 'flurry_of_blows',
    duration: 2.4,
    prompt: 'Monk Flurry of Blows: rapid-fire combo of four lightning-fast martial arts punches and kicks with ki resonance'
  },
  {
    key: 'axe_cleave',
    duration: 2.2,
    prompt: 'Heavy barbarian two-handed greataxe swinging and chopping deeply into wood and iron shield'
  },
  {
    key: 'spear_thrust',
    duration: 1.8,
    prompt: 'Fast piercing polearm spear lunge whistling through the air and impaling armor'
  },
  {
    key: 'staff_strike',
    duration: 1.8,
    prompt: 'Solid hardwood quarterstaff spinning whoosh and resonant blunt thwack impact'
  },

  // Group 3: Distinct Spells (Replacing duplicate soundKeys across JB2A_REGISTRY)
  {
    key: 'burning_hands',
    duration: 2.8,
    prompt: 'Burning Hands spell: wide roaring cone of searing flames erupting from outstretched hands'
  },
  {
    key: 'scorching_ray',
    duration: 2.5,
    prompt: 'Scorching Ray spell: three rapid-fire concentrated beams of searing fiery plasma firing in quick succession'
  },
  {
    key: 'wall_of_fire',
    duration: 3.0,
    prompt: 'Wall of Fire spell: towering curtain of roaring inferno flames igniting and blazing fiercely'
  },
  {
    key: 'call_lightning',
    duration: 3.0,
    prompt: 'Call Lightning spell: ominous storm cloud rumble overhead followed by a vertical sky-to-ground lightning bolt crash'
  },
  {
    key: 'witch_bolt',
    duration: 2.8,
    prompt: 'Witch Bolt spell: continuous crackling blue electrical arc humming and surging with high-voltage energy'
  },
  {
    key: 'sacred_flame',
    duration: 2.5,
    prompt: 'Sacred Flame cantrip: descending pillar of golden heavenly radiance roaring down from the sky with angelic chime'
  },
  {
    key: 'guiding_bolt',
    duration: 2.5,
    prompt: 'Guiding Bolt spell: high-velocity comet of celestial golden light whistling and exploding in glittering sparks'
  },
  {
    key: 'spiritual_weapon',
    duration: 2.5,
    prompt: 'Spiritual Weapon spell: ethereal floating divine warhammer materializing with a golden chime and swinging through the air'
  },
  {
    key: 'moonbeam',
    duration: 2.8,
    prompt: 'Moonbeam spell: mystical cylinder of pale silver moonlight descending with shimmering lunar choir resonance'
  },
  {
    key: 'cloud_of_daggers',
    duration: 2.8,
    prompt: 'Cloud of Daggers spell: cyclone of dozens of razor-sharp steel daggers whirling and slicing rapidly in mid-air'
  },
  {
    key: 'disintegrate',
    duration: 3.0,
    prompt: 'Disintegrate spell: high-energy green disintegration ray firing with a terrifying sub-bass hum and matter-vaporizing crackle'
  },
  {
    key: 'fog_cloud',
    duration: 2.8,
    prompt: 'Fog Cloud spell: dense billowing bank of cold magical mist and vapor rushing outward across the ground'
  },
  {
    key: 'spider_web',
    duration: 2.5,
    prompt: 'Web spell: thick sticky giant spider webbing shooting out and stretching taut across a dungeon room'
  },
  {
    key: 'eldritch_tentacles',
    duration: 3.0,
    prompt: 'Evards Black Tentacles and Arms of Hadar: writhing dark void tentacles erupting from a rift with wet slithering lashes'
  },
  {
    key: 'bardic_lute',
    duration: 2.8,
    prompt: 'Bardic Inspiration: uplifting heroic medieval bard acoustic lute and harp flourish chord with magical sparkle'
  },
  {
    key: 'vicious_mockery',
    duration: 2.5,
    prompt: 'Vicious Mockery and Cutting Words: dissonant sharp bardic lute string snap and psychic mental shatter sting'
  },
  {
    key: 'hunters_mark',
    duration: 2.2,
    prompt: 'Hunters Mark spell: ranger predator focus lock-on with taut bowstring draw and sharp hawk cry resonance'
  },
  {
    key: 'sleep_lullaby',
    duration: 3.0,
    prompt: 'Sleep spell: dreamy enchanting celesta and harp lullaby glissando with gentle sleepy fairy dust shimmer'
  },
  {
    key: 'grease_splat',
    duration: 2.2,
    prompt: 'Grease spell: bubbling slick oil and thick grease splashing across stone floor with a wet slippery squelch'
  },
  {
    key: 'dimension_door',
    duration: 2.8,
    prompt: 'Dimension Door spell: deep spatial rift door unlocking and folding reality with a golden cosmic resonance'
  },
  {
    key: 'fey_shimmer',
    duration: 2.5,
    prompt: 'Faerie Fire and Fey Step: glittering pixie dust chimes and playful feywild butterfly wings fluttering'
  },
  {
    key: 'shadow_step',
    duration: 2.5,
    prompt: 'Shadow Step and Darkness spell: stealthy umbral shadow cloak whoosh dissolving into darkness with a phantom whisper'
  },
  {
    key: 'druid_bloom',
    duration: 2.8,
    prompt: 'Druidcraft and Barkskin: verdant forest magic blooming with rustling oak leaves, creaking bark armor, and nature chime'
  },
  {
    key: 'sunbeam_laser',
    duration: 3.0,
    prompt: 'Sunbeam spell: blinding concentrated solar beam roaring with searing ultraviolet radiance and angelic resonance'
  },
  {
    key: 'detect_magic',
    duration: 2.5,
    prompt: 'Detect Magic and Arcane Eye: sonar-like divination third-eye pulse ping echoing outward through the arcane weave'
  },
  {
    key: 'glyph_ward',
    duration: 2.8,
    prompt: 'Glyph of Warding and Leomunds Tiny Hut: ancient glowing abjuration runes etching into stone and sealing with a deep protective hum'
  },
  {
    key: 'binding_chains',
    duration: 2.8,
    prompt: 'Hold Person spell: heavy spectral iron chains rattling, wrapping tightly around a target, and locking with a metallic clink'
  },
  {
    key: 'color_spray',
    duration: 2.5,
    prompt: 'Color Spray spell: dazzling prismatic burst of blinding rainbow light and crystalline crackle'
  },
  {
    key: 'circle_of_death',
    duration: 3.2,
    prompt: 'Circle of Death spell: massive necrotic negative energy shockwave implosion draining life with a terrifying lich shriek and sub-bass boom'
  },
  {
    key: 'angelic_wings',
    duration: 2.5,
    prompt: 'Fly spell: powerful spectral eagle wings unfurling and flapping with a rush of wind and celestial shimmer'
  }
];

async function generateSfx({ text, duration, outFile }) {
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
      loop: false
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

async function runPool(items, worker, concurrency = 4) {
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
  console.log(`=== Generating ${NEW_SPELL_SFX_JOBS.length} Dedicated Spell & Combat SFX via ElevenLabs ===`);
  await runPool(
    NEW_SPELL_SFX_JOBS,
    (job) =>
      generateSfx({
        text: job.prompt,
        duration: job.duration,
        outFile: path.join(SPELL_SFX_DIR, `${job.key}.mp3`)
      }),
    4
  );
  console.log('=== ALL 48 SPELL & COMBAT SFX GENERATED ===');
})();
