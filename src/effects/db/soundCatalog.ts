// src/effects/db/soundCatalog.ts
// Studio-quality sound engine for MistWalker 4.0 powered by ElevenLabs Neural SFX & Web Audio API

export type SoundEffectType =
  | 'fire_explosion'
  | 'fire_whoosh'
  | 'burning_hands'
  | 'scorching_ray'
  | 'wall_of_fire'
  | 'lightning_strike'
  | 'lightning_blast'
  | 'call_lightning'
  | 'witch_bolt'
  | 'thunder_boom'
  | 'thunder_crack'
  | 'thunder_blast'
  | 'cold_freeze'
  | 'cold_blast'
  | 'cold_frost'
  | 'frost_shatter'
  | 'eldritch_blast'
  | 'arcane_cast'
  | 'magic_whoosh'
  | 'magic_hum'
  | 'magic_whisper'
  | 'magic_bell'
  | 'magic_chime'
  | 'magic_explosion'
  | 'magic_shatter'
  | 'cloud_of_daggers'
  | 'disintegrate'
  | 'fog_cloud'
  | 'spider_web'
  | 'eldritch_tentacles'
  | 'bardic_lute'
  | 'vicious_mockery'
  | 'hunters_mark'
  | 'sleep_lullaby'
  | 'grease_splat'
  | 'dimension_door'
  | 'fey_shimmer'
  | 'shadow_step'
  | 'druid_bloom'
  | 'sunbeam_laser'
  | 'detect_magic'
  | 'glyph_ward'
  | 'binding_chains'
  | 'color_spray'
  | 'circle_of_death'
  | 'angelic_wings'
  | 'radiant_heal'
  | 'healing_incense'
  | 'radiant_burst'
  | 'holy_radiance'
  | 'divine_chime'
  | 'sacred_flame'
  | 'guiding_bolt'
  | 'spiritual_weapon'
  | 'moonbeam'
  | 'necrotic_drain'
  | 'necrotic_pulse'
  | 'curse'
  | 'shield_barrier'
  | 'shield_clash'
  | 'teleport_whoosh'
  | 'teleport'
  | 'wind_whoosh'
  | 'wind_gust'
  | 'acid_burn'
  | 'water_splash'
  | 'gas_leak'
  | 'earth_rumble'
  | 'nature_rustle'
  | 'insect_buzz'
  | 'whip_crack'
  | 'metal_clang'
  | 'sword_slash'
  | 'greatsword_cleave'
  | 'dagger_stab'
  | 'bow_arrow'
  | 'crossbow_shot'
  | 'claw_rip'
  | 'beast_bite'
  | 'unarmed_punch'
  | 'sneak_attack'
  | 'flurry_of_blows'
  | 'axe_cleave'
  | 'spear_thrust'
  | 'staff_strike'
  | 'generic_cast';

export interface SoundCatalogEntryMeta {
  key: SoundEffectType;
  label: string;
  category: 'fire' | 'lightning' | 'cold' | 'arcane' | 'radiant' | 'necrotic' | 'martial' | 'elemental';
  fileName: string;
  sourceEngine: 'elevenlabs' | 'studio';
  defaultPrompt: string;
}

// Map of sound effect keys to dedicated audio files in /audio/sfx/spells/
// Every single key maps to its own distinct audio asset (85 unique spell & combat sounds!)
export const SOUND_FILE_MAP: Record<string, string> = {
  // Fire
  fire_explosion: 'fire_explosion.mp3',
  fire_whoosh: 'fire_whoosh.ogg',
  burning_hands: 'burning_hands.mp3',
  scorching_ray: 'scorching_ray.mp3',
  wall_of_fire: 'wall_of_fire.mp3',

  // Lightning & Thunder
  lightning_strike: 'lightning_strike.ogg',
  lightning_blast: 'lightning_blast.ogg',
  call_lightning: 'call_lightning.mp3',
  witch_bolt: 'witch_bolt.mp3',
  thunder_boom: 'thunder_boom.mp3',
  thunder_crack: 'thunder_crack.mp3',
  thunder_blast: 'thunder_blast.mp3',

  // Cold & Ice
  cold_freeze: 'cold_freeze.ogg',
  cold_blast: 'cold_blast.ogg',
  cold_frost: 'cold_frost.mp3',
  frost_shatter: 'frost_shatter.mp3',

  // Arcane, Illusion, Conjuration & Enchantment
  eldritch_blast: 'eldritch_blast.mp3',
  arcane_cast: 'arcane_cast.mp3',
  magic_whoosh: 'magic_whoosh.mp3',
  magic_hum: 'magic_hum.ogg',
  magic_whisper: 'magic_whisper.ogg',
  magic_bell: 'magic_bell.ogg',
  magic_chime: 'magic_chime.ogg',
  magic_explosion: 'magic_explosion.mp3',
  magic_shatter: 'magic_shatter.mp3',
  cloud_of_daggers: 'cloud_of_daggers.mp3',
  disintegrate: 'disintegrate.mp3',
  fog_cloud: 'fog_cloud.mp3',
  spider_web: 'spider_web.mp3',
  eldritch_tentacles: 'eldritch_tentacles.mp3',
  bardic_lute: 'bardic_lute.mp3',
  vicious_mockery: 'vicious_mockery.mp3',
  hunters_mark: 'hunters_mark.mp3',
  sleep_lullaby: 'sleep_lullaby.mp3',
  grease_splat: 'grease_splat.mp3',
  dimension_door: 'dimension_door.mp3',
  fey_shimmer: 'fey_shimmer.mp3',
  shadow_step: 'shadow_step.mp3',
  druid_bloom: 'druid_bloom.mp3',
  sunbeam_laser: 'sunbeam_laser.mp3',
  detect_magic: 'detect_magic.mp3',
  glyph_ward: 'glyph_ward.mp3',
  binding_chains: 'binding_chains.mp3',
  color_spray: 'color_spray.mp3',
  circle_of_death: 'circle_of_death.mp3',
  angelic_wings: 'angelic_wings.mp3',

  // Radiant & Healing
  radiant_heal: 'radiant_heal.ogg',
  healing_incense: 'healing_incense.mp3',
  radiant_burst: 'radiant_burst.ogg',
  holy_radiance: 'holy_radiance.ogg',
  divine_chime: 'divine_chime.mp3',
  sacred_flame: 'sacred_flame.mp3',
  guiding_bolt: 'guiding_bolt.mp3',
  spiritual_weapon: 'spiritual_weapon.mp3',
  moonbeam: 'moonbeam.mp3',

  // Necrotic & Dark
  necrotic_drain: 'necrotic_drain.ogg',
  necrotic_pulse: 'necrotic_pulse.mp3',
  curse: 'curse.mp3',

  // Abjuration & Defense
  shield_barrier: 'shield_barrier.ogg',
  shield_clash: 'shield_clash.mp3',

  // Movement & Teleport
  teleport_whoosh: 'teleport_whoosh.ogg',
  teleport: 'teleport.mp3',

  // Environmental & Elemental Spells
  wind_whoosh: 'wind_whoosh.ogg',
  wind_gust: 'wind_gust.mp3',
  acid_burn: 'acid_burn.mp3',
  water_splash: 'water_splash.mp3',
  gas_leak: 'gas_leak.mp3',
  earth_rumble: 'earth_rumble.mp3',
  nature_rustle: 'nature_rustle.mp3',
  insect_buzz: 'insect_buzz.mp3',
  whip_crack: 'whip_crack.mp3',

  // Martial / Weapon Attacks
  metal_clang: 'metal_clang.mp3',
  sword_slash: 'sword_slash.mp3',
  greatsword_cleave: 'greatsword_cleave.mp3',
  dagger_stab: 'dagger_stab.mp3',
  bow_arrow: 'bow_arrow.mp3',
  crossbow_shot: 'crossbow_shot.mp3',
  claw_rip: 'claw_rip.mp3',
  beast_bite: 'beast_bite.mp3',
  unarmed_punch: 'unarmed_punch.mp3',
  sneak_attack: 'sneak_attack.mp3',
  flurry_of_blows: 'flurry_of_blows.mp3',
  axe_cleave: 'axe_cleave.mp3',
  spear_thrust: 'spear_thrust.mp3',
  staff_strike: 'staff_strike.mp3',

  // Fallback
  generic_cast: 'generic_cast.mp3'
};

export const SOUND_EFFECT_CATALOG_META: SoundCatalogEntryMeta[] = [
  // Fire Spells
  {
    key: 'fire_explosion',
    label: 'Fireball Explosion',
    category: 'fire',
    fileName: SOUND_FILE_MAP.fire_explosion,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Cinematic D&D Fireball spell detonation: whistling ember ignition followed by a massive roaring inferno explosion'
  },
  {
    key: 'fire_whoosh',
    label: 'Fire Bolt Projectile',
    category: 'fire',
    fileName: SOUND_FILE_MAP.fire_whoosh,
    sourceEngine: 'studio',
    defaultPrompt: 'Blazing magical fire bolt whooshing through the air with roaring flame trail'
  },
  {
    key: 'burning_hands',
    label: 'Burning Hands / Hellish Rebuke Cone',
    category: 'fire',
    fileName: SOUND_FILE_MAP.burning_hands,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Burning Hands spell: wide roaring cone of searing flames erupting from outstretched hands'
  },
  {
    key: 'scorching_ray',
    label: 'Scorching Ray Multi-Beam',
    category: 'fire',
    fileName: SOUND_FILE_MAP.scorching_ray,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Scorching Ray spell: three rapid-fire concentrated beams of searing fiery plasma firing in quick succession'
  },
  {
    key: 'wall_of_fire',
    label: 'Wall of Fire / Flaming Sphere',
    category: 'fire',
    fileName: SOUND_FILE_MAP.wall_of_fire,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Wall of Fire spell: towering curtain of roaring inferno flames igniting and blazing fiercely'
  },

  // Lightning & Thunder Spells
  {
    key: 'lightning_strike',
    label: 'Lightning Bolt Strike',
    category: 'lightning',
    fileName: SOUND_FILE_MAP.lightning_strike,
    sourceEngine: 'studio',
    defaultPrompt: 'High-voltage magical lightning bolt arc crackling and striking stone'
  },
  {
    key: 'lightning_blast',
    label: 'Chain Lightning Blast',
    category: 'lightning',
    fileName: SOUND_FILE_MAP.lightning_blast,
    sourceEngine: 'studio',
    defaultPrompt: 'Surging electric plasma discharge and crackling chain lightning burst'
  },
  {
    key: 'call_lightning',
    label: 'Call Lightning Sky Strike',
    category: 'lightning',
    fileName: SOUND_FILE_MAP.call_lightning,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Call Lightning spell: ominous storm cloud rumble overhead followed by a vertical sky-to-ground lightning bolt crash'
  },
  {
    key: 'witch_bolt',
    label: 'Witch Bolt Sustained Arc',
    category: 'lightning',
    fileName: SOUND_FILE_MAP.witch_bolt,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Witch Bolt spell: continuous crackling blue electrical arc humming and surging with high-voltage energy'
  },
  {
    key: 'thunder_boom',
    label: 'Thunder Step Boom',
    category: 'lightning',
    fileName: SOUND_FILE_MAP.thunder_boom,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Colossal rolling thunderclap boom shaking the earth with deep reverberating bass'
  },
  {
    key: 'thunder_crack',
    label: 'Thunder Crack',
    category: 'lightning',
    fileName: SOUND_FILE_MAP.thunder_crack,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Sharp deafening close-range lightning thunder crack and electric shockwave snap'
  },
  {
    key: 'thunder_blast',
    label: 'Thunderwave / Destructive Wave',
    category: 'lightning',
    fileName: SOUND_FILE_MAP.thunder_blast,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Concussive sonic boom thunderwave blast shattering air with deep sub-bass shockwave'
  },

  // Cold & Ice Spells
  {
    key: 'cold_freeze',
    label: 'Ray of Frost Freeze',
    category: 'cold',
    fileName: SOUND_FILE_MAP.cold_freeze,
    sourceEngine: 'studio',
    defaultPrompt: 'Deep glacial ice beam freezing target solid with crystalline crackle'
  },
  {
    key: 'cold_blast',
    label: 'Cone of Cold / Ice Storm',
    category: 'cold',
    fileName: SOUND_FILE_MAP.cold_blast,
    sourceEngine: 'studio',
    defaultPrompt: 'Roaring arctic blizzard cone of cold blast with freezing ice shards'
  },
  {
    key: 'cold_frost',
    label: 'Creeping Rime / Frost Area',
    category: 'cold',
    fileName: SOUND_FILE_MAP.cold_frost,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Crystalline creeping ice frost rapidly freezing over stone with arctic wind shimmer'
  },
  {
    key: 'frost_shatter',
    label: 'Armor of Agathys / Ice Shatter',
    category: 'cold',
    fileName: SOUND_FILE_MAP.frost_shatter,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Massive frozen ice crystal glacier violently shattering into razor shards with sub-zero impact'
  },

  // Arcane, Conjuration, Enchantment & Illusion Spells
  {
    key: 'eldritch_blast',
    label: 'Eldritch Blast',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.eldritch_blast,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Crackling dark purple warlock eldritch beam firing with a distorted otherworldly force impact'
  },
  {
    key: 'arcane_cast',
    label: 'Arcane Spell Weave',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.arcane_cast,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Deep wizard spell weave activation with shimmering astral chords and eldritch power surge'
  },
  {
    key: 'magic_whoosh',
    label: 'Magic Missile Dart',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.magic_whoosh,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Fast arcane projectile missile whooshing through the air with sparkling magical trail'
  },
  {
    key: 'magic_explosion',
    label: 'Arcane Force Detonation',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.magic_explosion,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Arcane force explosion detonation with resonant purple energy shockwave and crystalline debris'
  },
  {
    key: 'magic_shatter',
    label: 'Shatter / Counterspell / Dispel',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.magic_shatter,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'High-pitched resonant glass and arcane crystal barrier shattering into a thousand echoing fragments'
  },
  {
    key: 'cloud_of_daggers',
    label: 'Cloud of Daggers',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.cloud_of_daggers,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Cloud of Daggers spell: cyclone of dozens of razor-sharp steel daggers whirling and slicing rapidly in mid-air'
  },
  {
    key: 'disintegrate',
    label: 'Disintegrate Green Ray',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.disintegrate,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Disintegrate spell: high-energy green disintegration ray firing with a terrifying sub-bass hum and matter-vaporizing crackle'
  },
  {
    key: 'fog_cloud',
    label: 'Fog Cloud Billow',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.fog_cloud,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Fog Cloud spell: dense billowing bank of cold magical mist and vapor rushing outward across the ground'
  },
  {
    key: 'spider_web',
    label: 'Web Spell Restraint',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.spider_web,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Web spell: thick sticky giant spider webbing shooting out and stretching taut across a dungeon room'
  },
  {
    key: 'bardic_lute',
    label: 'Bardic Inspiration Flourish',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.bardic_lute,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Bardic Inspiration: uplifting heroic medieval bard acoustic lute and harp flourish chord with magical sparkle'
  },
  {
    key: 'vicious_mockery',
    label: 'Cutting Words / Vicious Mockery',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.vicious_mockery,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Vicious Mockery and Cutting Words: dissonant sharp bardic lute string snap and psychic mental shatter sting'
  },
  {
    key: 'hunters_mark',
    label: "Hunter's Mark Quarry Lock",
    category: 'arcane',
    fileName: SOUND_FILE_MAP.hunters_mark,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Hunters Mark spell: ranger predator focus lock-on with taut bowstring draw and sharp hawk cry resonance'
  },
  {
    key: 'sleep_lullaby',
    label: 'Sleep Dream Lullaby',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.sleep_lullaby,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Sleep spell: dreamy enchanting celesta and harp lullaby glissando with gentle sleepy fairy dust shimmer'
  },
  {
    key: 'grease_splat',
    label: 'Grease Slick Hazard',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.grease_splat,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Grease spell: bubbling slick oil and thick grease splashing across stone floor with a wet slippery squelch'
  },
  {
    key: 'dimension_door',
    label: 'Dimension Door / Vortex Warp',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.dimension_door,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Dimension Door spell: deep spatial rift door unlocking and folding reality with a golden cosmic resonance'
  },
  {
    key: 'fey_shimmer',
    label: 'Faerie Fire / Fey Step',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.fey_shimmer,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Faerie Fire and Fey Step: glittering pixie dust chimes and playful feywild butterfly wings fluttering'
  },
  {
    key: 'detect_magic',
    label: 'Detect Magic / Arcane Eye',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.detect_magic,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Detect Magic and Arcane Eye: sonar-like divination third-eye pulse ping echoing outward through the arcane weave'
  },
  {
    key: 'glyph_ward',
    label: 'Glyph of Warding / Tiny Hut',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.glyph_ward,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Glyph of Warding and Leomunds Tiny Hut: ancient glowing abjuration runes etching into stone and sealing with a deep protective hum'
  },
  {
    key: 'binding_chains',
    label: 'Hold Person / Binding Chains',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.binding_chains,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Hold Person spell: heavy spectral iron chains rattling, wrapping tightly around a target, and locking with a metallic clink'
  },
  {
    key: 'color_spray',
    label: 'Color Spray Prismatic Cone',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.color_spray,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Color Spray spell: dazzling prismatic burst of blinding rainbow light and crystalline crackle'
  },
  {
    key: 'angelic_wings',
    label: 'Fly Spectral Wings',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.angelic_wings,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Fly spell: powerful spectral eagle wings unfurling and flapping with a rush of wind and celestial shimmer'
  },
  {
    key: 'magic_hum',
    label: 'Magic Circle Aura Hum',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.magic_hum,
    sourceEngine: 'studio',
    defaultPrompt: 'Sustained mystical leyline aura hum and oscillating arcane resonance'
  },
  {
    key: 'magic_whisper',
    label: 'Illusion / Enchantment Whisper',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.magic_whisper,
    sourceEngine: 'studio',
    defaultPrompt: 'Hypnotic psychic enchantment whispers echoing in the mind'
  },
  {
    key: 'magic_bell',
    label: 'Toll the Dead / Alarm Bell',
    category: 'necrotic',
    fileName: SOUND_FILE_MAP.magic_bell,
    sourceEngine: 'studio',
    defaultPrompt: 'Solemn necromantic bronze bell tolling with dark reverberation'
  },
  {
    key: 'magic_chime',
    label: 'Mage Hand / Dancing Lights Chime',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.magic_chime,
    sourceEngine: 'studio',
    defaultPrompt: 'Clear shimmering crystal chime of magical warding and enchantment'
  },
  {
    key: 'teleport_whoosh',
    label: 'Misty Step Blink',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.teleport_whoosh,
    sourceEngine: 'studio',
    defaultPrompt: 'Swirling silver mist teleportation whoosh vanishing into the astral plane'
  },
  {
    key: 'teleport',
    label: 'Teleportation Circle Gate',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.teleport,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Instant dimensional blink teleportation pop with spatial vacuum implosion and arcane shimmer'
  },
  {
    key: 'generic_cast',
    label: 'Universal Spell Incantation',
    category: 'arcane',
    fileName: SOUND_FILE_MAP.generic_cast,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Mystical arcane spellcasting incantation whoosh with glowing runic energy discharge'
  },

  // Radiant & Healing Spells
  {
    key: 'radiant_heal',
    label: 'Cure Wounds / Aura of Vitality',
    category: 'radiant',
    fileName: SOUND_FILE_MAP.radiant_heal,
    sourceEngine: 'studio',
    defaultPrompt: 'Warm golden celestial healing aura with soothing angelic harp shimmer'
  },
  {
    key: 'healing_incense',
    label: "Devotee's Censer: Healing Incense",
    category: 'radiant',
    fileName: SOUND_FILE_MAP.healing_incense,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Golden brass censer swinging on chains with gentle metallic clink, releasing a warm billowing cloud of sacred aromatic healing incense smoke and soft divine choral shimmer'
  },
  {
    key: 'radiant_burst',
    label: 'Divine Smite / Healing Word',
    category: 'radiant',
    fileName: SOUND_FILE_MAP.radiant_burst,
    sourceEngine: 'studio',
    defaultPrompt: 'Explosive paladin Divine Smite radiant impact with searing golden light and holy thunder'
  },
  {
    key: 'holy_radiance',
    label: 'Spirit Guardians / Holy Aura',
    category: 'radiant',
    fileName: SOUND_FILE_MAP.holy_radiance,
    sourceEngine: 'studio',
    defaultPrompt: 'Majestic heavenly choir chord and blazing solar radiance aura'
  },
  {
    key: 'divine_chime',
    label: 'Bless / Aura of Life Chime',
    category: 'radiant',
    fileName: SOUND_FILE_MAP.divine_chime,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Celestial angelic choir harmonic bell chime and golden radiant blessing resonance'
  },
  {
    key: 'sacred_flame',
    label: 'Sacred Flame Radiant Pillar',
    category: 'radiant',
    fileName: SOUND_FILE_MAP.sacred_flame,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Sacred Flame cantrip: descending pillar of golden heavenly radiance roaring down from the sky with angelic chime'
  },
  {
    key: 'guiding_bolt',
    label: 'Guiding Bolt Celestial Comet',
    category: 'radiant',
    fileName: SOUND_FILE_MAP.guiding_bolt,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Guiding Bolt spell: high-velocity comet of celestial golden light whistling and exploding in glittering sparks'
  },
  {
    key: 'spiritual_weapon',
    label: 'Spiritual Weapon Spectral Strike',
    category: 'radiant',
    fileName: SOUND_FILE_MAP.spiritual_weapon,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Spiritual Weapon spell: ethereal floating divine warhammer materializing with a golden chime and swinging through the air'
  },
  {
    key: 'moonbeam',
    label: 'Moonbeam Silver Cylinder',
    category: 'radiant',
    fileName: SOUND_FILE_MAP.moonbeam,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Moonbeam spell: mystical cylinder of pale silver moonlight descending with shimmering lunar choir resonance'
  },
  {
    key: 'sunbeam_laser',
    label: 'Sunbeam Solar Ray',
    category: 'radiant',
    fileName: SOUND_FILE_MAP.sunbeam_laser,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Sunbeam spell: blinding concentrated solar beam roaring with searing ultraviolet radiance and angelic resonance'
  },

  // Necrotic & Dark Spells
  {
    key: 'necrotic_drain',
    label: 'Vampiric / Necrotic Drain',
    category: 'necrotic',
    fileName: SOUND_FILE_MAP.necrotic_drain,
    sourceEngine: 'studio',
    defaultPrompt: 'Sinister life-draining necrotic siphon with dark shadowy hiss'
  },
  {
    key: 'necrotic_pulse',
    label: 'Blight / Necrotic Pulse',
    category: 'necrotic',
    fileName: SOUND_FILE_MAP.necrotic_pulse,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Dark abyssal necrotic heartbeat pulse with bone-chilling shadow wraith exhale and soul drain'
  },
  {
    key: 'eldritch_tentacles',
    label: 'Arms of Hadar / Black Tentacles',
    category: 'necrotic',
    fileName: SOUND_FILE_MAP.eldritch_tentacles,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Evards Black Tentacles and Arms of Hadar: writhing dark void tentacles erupting from a rift with wet slithering lashes'
  },
  {
    key: 'shadow_step',
    label: 'Shadow Step / Darkness Void',
    category: 'necrotic',
    fileName: SOUND_FILE_MAP.shadow_step,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Shadow Step and Darkness spell: stealthy umbral shadow cloak whoosh dissolving into darkness with a phantom whisper'
  },
  {
    key: 'circle_of_death',
    label: 'Circle of Death Implosion',
    category: 'necrotic',
    fileName: SOUND_FILE_MAP.circle_of_death,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Circle of Death spell: massive necrotic negative energy shockwave implosion draining life with a terrifying lich shriek and sub-bass boom'
  },
  {
    key: 'curse',
    label: 'Bestow Curse / Dread Hex',
    category: 'necrotic',
    fileName: SOUND_FILE_MAP.curse,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Dark necromantic hex curse spell sting with dread sub-bass drop and chilling phantom exhale'
  },

  // Elemental & Nature Spells
  {
    key: 'wind_whoosh',
    label: 'Whirlwind / Wind Wall',
    category: 'elemental',
    fileName: SOUND_FILE_MAP.wind_whoosh,
    sourceEngine: 'studio',
    defaultPrompt: 'Rushing elemental air current sweeping across the battlefield'
  },
  {
    key: 'wind_gust',
    label: 'Gust of Wind Gale',
    category: 'elemental',
    fileName: SOUND_FILE_MAP.wind_gust,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Powerful cyclone wind gust vortex howling and sweeping leaves and dust across a battleground'
  },
  {
    key: 'acid_burn',
    label: 'Caustic Brew / Acid Splash',
    category: 'elemental',
    fileName: SOUND_FILE_MAP.acid_burn,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Caustic bubbling venom and corrosive acid splash sizzling and dissolving stone and metal'
  },
  {
    key: 'water_splash',
    label: 'Elementalism / Tidal Wave',
    category: 'elemental',
    fileName: SOUND_FILE_MAP.water_splash,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Magical high-pressure tidal water wave crash and deep liquid splash impact'
  },
  {
    key: 'gas_leak',
    label: 'Cloudkill Toxic Vapor',
    category: 'elemental',
    fileName: SOUND_FILE_MAP.gas_leak,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Deadly Cloudkill spell: billowing toxic green poison gas cloud hissing and bubbling with noxious fumes'
  },
  {
    key: 'earth_rumble',
    label: 'Earth Tremor Shockwave',
    category: 'elemental',
    fileName: SOUND_FILE_MAP.earth_rumble,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Earth Tremor spell: violent subterranean ground shockwave cracking stone floor with deep tectonic rumble'
  },
  {
    key: 'nature_rustle',
    label: 'Entangle / Ensnaring Vines',
    category: 'elemental',
    fileName: SOUND_FILE_MAP.nature_rustle,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Entangle and Ensnaring Strike spell: thick thorny vines and twisted tree roots bursting from the earth and wrapping tightly'
  },
  {
    key: 'druid_bloom',
    label: 'Druidcraft / Barkskin Foliage',
    category: 'elemental',
    fileName: SOUND_FILE_MAP.druid_bloom,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Druidcraft and Barkskin: verdant forest magic blooming with rustling oak leaves, creaking bark armor, and nature chime'
  },
  {
    key: 'insect_buzz',
    label: 'Insect Plague Swarm',
    category: 'elemental',
    fileName: SOUND_FILE_MAP.insect_buzz,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Insect Plague spell: deafening swarm of thousands of biting locusts buzzing and chittering aggressively'
  },
  {
    key: 'whip_crack',
    label: 'Thorn Whip Vine Lash',
    category: 'elemental',
    fileName: SOUND_FILE_MAP.whip_crack,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Thorn Whip cantrip: barbed magical vine lashing through the air with a sharp supersonic whip crack'
  },

  // Martial, Defense & Weapon Attacks
  {
    key: 'shield_barrier',
    label: 'Shield / Sanctuary / Force Dome',
    category: 'martial',
    fileName: SOUND_FILE_MAP.shield_barrier,
    sourceEngine: 'studio',
    defaultPrompt: 'Translucent force field barrier materializing with resonant crystalline deflection'
  },
  {
    key: 'shield_clash',
    label: 'Knight Shield Clash',
    category: 'martial',
    fileName: SOUND_FILE_MAP.shield_clash,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Heavy medieval steel broadsword slamming against a reinforced iron knight shield with metallic ring'
  },
  {
    key: 'sword_slash',
    label: 'Longsword / Scimitar Slash',
    category: 'martial',
    fileName: SOUND_FILE_MAP.sword_slash,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Razor-sharp medieval steel longsword swoosh and visceral armor-piercing slash impact'
  },
  {
    key: 'greatsword_cleave',
    label: 'Greatsword Heavy Cleave',
    category: 'martial',
    fileName: SOUND_FILE_MAP.greatsword_cleave,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Massive two-handed steel greatsword heavy swing whistling through the air and cleaving plate armor'
  },
  {
    key: 'axe_cleave',
    label: 'Greataxe / Battleaxe / Glaive Chop',
    category: 'martial',
    fileName: SOUND_FILE_MAP.axe_cleave,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Heavy barbarian two-handed greataxe swinging and chopping deeply into wood and iron shield'
  },
  {
    key: 'dagger_stab',
    label: 'Dagger Stab & Throw',
    category: 'martial',
    fileName: SOUND_FILE_MAP.dagger_stab,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Quick lethal rogue steel dagger unsheathing zip and sharp piercing stab impact'
  },
  {
    key: 'spear_thrust',
    label: 'Spear / Trident Thrust',
    category: 'martial',
    fileName: SOUND_FILE_MAP.spear_thrust,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Fast piercing polearm spear lunge whistling through the air and impaling armor'
  },
  {
    key: 'staff_strike',
    label: 'Quarterstaff Sweep & Thwack',
    category: 'martial',
    fileName: SOUND_FILE_MAP.staff_strike,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Solid hardwood quarterstaff spinning whoosh and resonant blunt thwack impact'
  },
  {
    key: 'metal_clang',
    label: 'Warhammer / Blade Barrier Clang',
    category: 'martial',
    fileName: SOUND_FILE_MAP.metal_clang,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Heavy forged warhammer and greataxe clanging against plate armor with sparks and metallic resonance'
  },
  {
    key: 'bow_arrow',
    label: 'Longbow / Shortbow Arrow Shot',
    category: 'martial',
    fileName: SOUND_FILE_MAP.bow_arrow,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Medieval longbow taut bowstring twang release followed by a feathered arrow whistling and thudding into target'
  },
  {
    key: 'crossbow_shot',
    label: 'Heavy Crossbow Bolt Shot',
    category: 'martial',
    fileName: SOUND_FILE_MAP.crossbow_shot,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Heavy iron crossbow mechanical trigger snap and high-velocity bolt whoosh and solid impact'
  },
  {
    key: 'claw_rip',
    label: 'Monster Claw Swipe',
    category: 'martial',
    fileName: SOUND_FILE_MAP.claw_rip,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Ferocious monster beast claws slashing and tearing with a vicious predator snarl'
  },
  {
    key: 'beast_bite',
    label: 'Monster Fang Bite',
    category: 'martial',
    fileName: SOUND_FILE_MAP.beast_bite,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Savage monster jaws snapping shut with wet fangs crunching and guttural growl'
  },
  {
    key: 'unarmed_punch',
    label: 'Unarmed Martial Strike',
    category: 'martial',
    fileName: SOUND_FILE_MAP.unarmed_punch,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Heavy martial arts monk fist punch impact with crisp air snap and bone-crushing thud'
  },
  {
    key: 'sneak_attack',
    label: 'Rogue Sneak Attack Strike',
    category: 'martial',
    fileName: SOUND_FILE_MAP.sneak_attack,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Rogue Sneak Attack: stealthy shadow blade backstab slice with a sharp lethal critical hit sting'
  },
  {
    key: 'flurry_of_blows',
    label: 'Monk Flurry of Blows',
    category: 'martial',
    fileName: SOUND_FILE_MAP.flurry_of_blows,
    sourceEngine: 'elevenlabs',
    defaultPrompt: 'Monk Flurry of Blows: rapid-fire combo of four lightning-fast martial arts punches and kicks with ki resonance'
  }
];

const OVERRIDES_STORAGE_KEY = 'mistwalker_sfx_overrides_v1';

class EffectsSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.55;
  private audioBufferCache: Map<string, AudioBuffer> = new Map();
  private loadingPromises: Map<string, Promise<AudioBuffer | null>> = new Map();
  private customUrlOverrides: Record<string, string> = {};

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(OVERRIDES_STORAGE_KEY);
        if (raw) {
          this.customUrlOverrides = JSON.parse(raw) || {};
        }
      } catch {}
    }
  }

  private initContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (typeof window === 'undefined') return null;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    } catch {
      // AudioContext unavailable
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public setCustomOverride(key: string, audioUrl: string) {
    const cleanKey = key.toLowerCase().trim();
    this.customUrlOverrides[cleanKey] = audioUrl;
    this.audioBufferCache.delete(audioUrl);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(this.customUrlOverrides));
      } catch {}
    }
  }

  public getCustomOverrides(): Record<string, string> {
    return { ...this.customUrlOverrides };
  }

  public resolveAudioUrl(type: SoundEffectType | string): string {
    const cleanKey = type.toLowerCase().trim();
    if (this.customUrlOverrides[cleanKey]) {
      return this.customUrlOverrides[cleanKey];
    }
    const fileName = SOUND_FILE_MAP[cleanKey] || SOUND_FILE_MAP['generic_cast'];
    return `/audio/sfx/spells/${fileName}`;
  }

  /**
   * Preload an audio file into Web Audio buffer cache for instant 0ms latency playback
   */
  private async loadBuffer(url: string): Promise<AudioBuffer | null> {
    if (this.audioBufferCache.has(url)) {
      return this.audioBufferCache.get(url)!;
    }

    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    const loadPromise = (async () => {
      try {
        const ctx = this.initContext();
        if (!ctx) return null;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arrayBuffer = await res.arrayBuffer();
        const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
        this.audioBufferCache.set(url, decodedBuffer);
        return decodedBuffer;
      } catch {
        return null;
      } finally {
        this.loadingPromises.delete(url);
      }
    })();

    this.loadingPromises.set(url, loadPromise);
    return loadPromise;
  }

  /**
   * Play a studio sound effect by key or custom URL
   */
  public play(type: SoundEffectType | string, customUrlOrVolume?: string | number) {
    if (this.isMuted) return;

    // 1. Play custom audio file if provided as URL string
    if (typeof customUrlOrVolume === 'string' && typeof Audio !== 'undefined') {
      try {
        const audio = new Audio(customUrlOrVolume);
        audio.volume = this.volume;
        audio.play().catch(() => {});
        return;
      } catch {}
    }

    const customVol = typeof customUrlOrVolume === 'number' ? customUrlOrVolume : 1;
    const audioUrl = this.resolveAudioUrl(type);

    const ctx = this.initContext();
    if (!ctx || !this.masterGain) {
      try {
        const audio = new Audio(audioUrl);
        audio.volume = Math.min(1, this.volume * customVol);
        audio.play().catch(() => {});
      } catch {}
      return;
    }

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Check if buffer is already cached for 0ms latency
    const cachedBuffer = this.audioBufferCache.get(audioUrl);
    if (cachedBuffer) {
      this.playBuffer(cachedBuffer, customVol);
      return;
    }

    // Buffer not loaded yet: load and play, with immediate HTML5 audio fallback
    this.loadBuffer(audioUrl).then((buf) => {
      if (buf) {
        this.playBuffer(buf, customVol);
      } else {
        try {
          const audio = new Audio(audioUrl);
          audio.volume = Math.min(1, this.volume * customVol);
          audio.play().catch(() => {});
        } catch {}
      }
    });
  }

  /**
   * Play an in-memory AudioBuffer with organic micro pitch variation (±3.5%)
   */
  private playBuffer(buffer: AudioBuffer, volumeScale: number = 1) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const source = this.ctx.createBufferSource();
      const gainNode = this.ctx.createGain();

      source.buffer = buffer;

      // Slight natural pitch variance (0.965 - 1.035) so repeat casts sound organic
      const randomPitch = 0.965 + Math.random() * 0.07;
      source.playbackRate.setValueAtTime(randomPitch, this.ctx.currentTime);

      gainNode.gain.setValueAtTime(Math.max(0.01, Math.min(1.5, volumeScale)), this.ctx.currentTime);

      source.connect(gainNode);
      gainNode.connect(this.masterGain);

      source.start();
    } catch {
      // Safe fallback
    }
  }

  /**
   * Preload common signature spell & combat sounds into memory
   */
  public preloadCommonSounds() {
    if (typeof window === 'undefined') return;
    const commonKeys = [
      'fire_explosion',
      'fire_whoosh',
      'burning_hands',
      'scorching_ray',
      'lightning_strike',
      'cold_freeze',
      'eldritch_blast',
      'radiant_heal',
      'radiant_burst',
      'guiding_bolt',
      'sacred_flame',
      'shield_barrier',
      'shield_clash',
      'sword_slash',
      'greatsword_cleave',
      'bow_arrow',
      'metal_clang',
      'teleport_whoosh',
      'thunder_boom'
    ];

    commonKeys.forEach((key) => {
      const url = this.resolveAudioUrl(key);
      this.loadBuffer(url).catch(() => {});
    });
  }
}

export const soundCatalog = new EffectsSoundEngine();
