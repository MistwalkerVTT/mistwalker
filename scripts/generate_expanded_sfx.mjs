// scripts/generate_expanded_sfx.mjs
// Generates 26 new studio-quality D&D 5e spell, signature weapon, class action,
// and dragon breath SFX via ElevenLabs Sound Generation API.

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

const JOBS = [
  // A. Divine, Celestial & Restoration
  {
    key: 'divine_smite',
    duration: 2.4,
    prompt: 'Crushing heavenly thunder bell and searing golden radiant hammer impact bursting with divine energy, fantasy RPG paladin smite'
  },
  {
    key: 'revivify_pulse',
    duration: 2.8,
    prompt: 'Dramatic celestial heartbeat pulse reviving a fallen hero with rising angelic choir swell and shimmering light, fantasy RPG spell'
  },
  {
    key: 'holy_decree',
    duration: 2.6,
    prompt: 'Deep echoing cathedral brass chord and commanding angelic shockwave resonance, powerful cleric divine word spell'
  },
  {
    key: 'celestial_starlight',
    duration: 2.5,
    prompt: 'Shimmering crystalline celestial harp arpeggio and twinkling cosmic comet chime, fantasy RPG starlight spell'
  },
  {
    key: 'divine_restoration',
    duration: 2.5,
    prompt: 'Warm golden harmonic healing wave washing away corruption with gentle crystalline chimes, fantasy restoration spell'
  },
  {
    key: 'flame_pillar',
    duration: 2.8,
    prompt: 'Roaring descending column of heavenly fire and solar plasma slamming into the earth, fantasy RPG flame strike spell'
  },

  // B. Arcane, Illusion, Psychic & Planar
  {
    key: 'hypnotic_swirl',
    duration: 2.8,
    prompt: 'Mesmerizing psychedelic crystal chimes and dreamlike swirling astral resonance, fantasy RPG hypnotic pattern illusion spell'
  },
  {
    key: 'banish_rift',
    duration: 2.6,
    prompt: 'Reality-tearing planar vacuum implosion with deep metallic dimensional warp snap, fantasy RPG banishment spell'
  },
  {
    key: 'dispel_unravel',
    duration: 2.2,
    prompt: 'Sharp descending arcane static unraveling and magical weave snapping apart cleanly, fantasy RPG dispel magic spell'
  },
  {
    key: 'invisibility_cloak',
    duration: 2.2,
    prompt: 'Ethereal glassy phase-shift whoosh softly fading into hushed ghostly silence, fantasy RPG invisibility spell'
  },
  {
    key: 'haste_surge',
    duration: 2.2,
    prompt: 'Accelerating clockwork tempo whoosh and crisp temporal wind burst speeding up time, fantasy RPG haste spell'
  },
  {
    key: 'polymorph_morph',
    duration: 2.4,
    prompt: 'Bubbling alchemical transmutation shimmer with whimsical magical pop transformation, fantasy RPG polymorph spell'
  },
  {
    key: 'void_hunger',
    duration: 2.8,
    prompt: 'Horrifying abyssal sub-bass black hole vacuum opening with distant eldritch whispers and icy static, fantasy warlock spell'
  },

  // C. Wards, Armor & Martial Defenses
  {
    key: 'arcane_ward',
    duration: 2.0,
    prompt: 'Crisp hexagonal arcane force field hum activating with crystalline abjuration chime, fantasy mage armor spell'
  },
  {
    key: 'heat_metal_sizzle',
    duration: 2.5,
    prompt: 'White-hot glowing iron hiss and crackling forge embers searing metal armor, fantasy RPG heat metal spell'
  },
  {
    key: 'ki_deflect',
    duration: 1.8,
    prompt: 'Calm resonant bronze zen chime followed by swift martial air parry swoosh, fantasy monk defensive stance'
  },

  // D. Signature Weapons & Class Actions
  {
    key: 'rapier_thrust',
    duration: 1.6,
    prompt: 'Lightning-fast needle-sharp steel rapier fencing lunge and crisp shadow cloak whip, fantasy rogue sneak attack'
  },
  {
    key: 'arcane_arrow',
    duration: 1.8,
    prompt: 'Taut longbow string twang releasing a whistling plasma-charged arcane arrow slicing through air, fantasy RPG'
  },
  {
    key: 'war_magic_cleave',
    duration: 2.0,
    prompt: 'Heavy enchanted steel longsword cleave trailing crackling blue arcane lightning sparks, fantasy eldritch knight'
  },
  {
    key: 'censer_flail',
    duration: 2.0,
    prompt: 'Rattling brass chains swinging a heavy burning incense censer flail with sacred bell chime and blunt impact, fantasy cleric'
  },
  {
    key: 'barbarian_rage',
    duration: 2.4,
    prompt: 'Visceral primal warrior battle roar with surging war drum bass heartbeat and crackling crimson fire, fantasy barbarian rage'
  },
  {
    key: 'cunning_dash',
    duration: 1.6,
    prompt: 'Agile leather boot sprint burst and sharp billowing cloak snap dashing across stone, fantasy rogue action'
  },
  {
    key: 'second_wind_breath',
    duration: 2.0,
    prompt: 'Deep heroic warrior inhale followed by invigorating warm adrenaline rush and subtle steel resolve chime, fantasy fighter'
  },
  {
    key: 'blood_curse',
    duration: 2.4,
    prompt: 'Visceral crimson hemocraft blade slash and eerie pulsing dark blood magic resonance, dark fantasy blood hunter'
  },

  // E. High-Level Focuses & Dragon Breaths
  {
    key: 'dragon_roar_breath',
    duration: 3.0,
    prompt: 'Ferocious monstrous dragon inhale erupting into a torrential elemental fire and energy breath roar, fantasy RPG boss'
  },
  {
    key: 'arcane_staff_blast',
    duration: 2.4,
    prompt: 'Resonant runic wizard staff slamming onto stone and releasing a booming shockwave of raw arcane power, fantasy RPG'
  }
];

async function generateOne(job) {
  const outFile = path.join(SPELL_SFX_DIR, `${job.key}.mp3`);
  if (fs.existsSync(outFile) && fs.statSync(outFile).size > 5000) {
    console.log(`[SKIP] ${job.key}.mp3 already exists`);
    return { key: job.key, status: 'skip' };
  }
  const res = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
    method: 'POST',
    headers: {
      'xi-api-key': API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg'
    },
    body: JSON.stringify({
      text: job.prompt,
      duration_seconds: job.duration,
      prompt_influence: 0.45,
      loop: false
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`[FAIL] ${job.key}.mp3 (${res.status}): ${errText.slice(0, 200)}`);
    return { key: job.key, status: 'fail' };
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outFile, buf);
  console.log(`[OK]   ${job.key}.mp3 (${(buf.length / 1024).toFixed(1)} KB)`);
  return { key: job.key, status: 'ok' };
}

async function main() {
  console.log(`Generating ${JOBS.length} new ElevenLabs Neural SFX...`);
  let ok = 0, skip = 0, fail = 0;
  let idx = 0;
  const CONCURRENCY = 3;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (idx < JOBS.length) {
      const job = JOBS[idx++];
      try {
        const r = await generateOne(job);
        if (r.status === 'ok') ok++;
        else if (r.status === 'skip') skip++;
        else fail++;
      } catch (e) {
        fail++;
        console.error(`[ERR]  ${job.key}:`, e.message);
      }
    }
  });
  await Promise.all(workers);
  console.log(`\nDone! Generated: ${ok}, Skipped: ${skip}, Failed: ${fail}`);
  if (fail > 0) process.exitCode = 1;
}

main();
