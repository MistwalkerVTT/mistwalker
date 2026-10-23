import fs from 'fs';

const file = 'src/effects/db/jb2aRegistry.ts';
let txt = fs.readFileSync(file, 'utf8');

const SPELL_SOUND_KEY_MAP = {
  burning_hands: 'burning_hands',
  cone_of_cold: 'cold_blast',
  call_lightning: 'call_lightning',
  chain_lightning: 'lightning_blast',
  witch_bolt: 'witch_bolt',
  magic_missile: 'magic_whoosh',
  shield_of_faith: 'divine_chime',
  bless: 'divine_chime',
  sacred_flame: 'sacred_flame',
  guiding_bolt: 'guiding_bolt',
  scorching_ray: 'scorching_ray',
  fey_step: 'fey_shimmer',
  shadow_step: 'shadow_step',
  vortex_warp: 'dimension_door',
  thunderwave: 'thunder_blast',
  shatter: 'magic_shatter',
  spirit_guardians: 'holy_radiance',
  spiritual_weapon: 'spiritual_weapon',
  cloud_of_daggers: 'cloud_of_daggers',
  arms_of_hadar: 'eldritch_tentacles',
  disintegrate: 'disintegrate',
  darkness: 'shadow_step',
  fog_cloud: 'fog_cloud',
  web: 'spider_web',
  moonbeam: 'moonbeam',
  whirlwind: 'wind_whoosh',
  wall_of_fire: 'wall_of_fire',
  template_circle_cold: 'cold_frost',
  template_circle_radiant: 'holy_radiance',
  template_circle_necrotic: 'necrotic_pulse',
  template_cone_fire: 'burning_hands',
  attack_greatsword: 'greatsword_cleave',
  attack_slash: 'sword_slash',
  attack_dagger: 'dagger_stab',
  attack_hammer: 'metal_clang',
  attack_bow: 'bow_arrow',
  attack_crossbow: 'crossbow_shot',
  attack_claw: 'claw_rip',
  attack_bite: 'beast_bite',
  attack_unarmed: 'unarmed_punch',
  sneak_attack: 'sneak_attack',
  flurry_of_blows: 'flurry_of_blows',
  stunning_strike: 'thunder_crack',
  bardic_inspiration: 'bardic_lute',
  cutting_words: 'vicious_mockery',
  hunters_mark: 'hunters_mark',
  toll_the_dead: 'magic_bell',
  flaming_sphere: 'wall_of_fire',
  wall_of_force: 'shield_barrier',
  aid: 'divine_chime',
  sanctuary: 'shield_barrier',
  grease: 'grease_splat',
  sleep: 'sleep_lullaby',
  entangle: 'nature_rustle',
  black_tentacles: 'eldritch_tentacles',
  gust_of_wind: 'wind_gust',
  caustic_brew: 'acid_burn',
  hellish_rebuke: 'burning_hands',
  dimension_door: 'dimension_door',
  chromatic_orb: 'magic_explosion',
  attack_greataxe: 'axe_cleave',
  attack_battleaxe: 'axe_cleave',
  attack_spear: 'spear_thrust',
  attack_quarterstaff: 'staff_strike',
  attack_glaive: 'axe_cleave',
  druidcraft: 'druid_bloom',
  elementalism: 'water_splash',
  faerie_fire: 'fey_shimmer',
  light: 'divine_chime',
  sunbeam: 'sunbeam_laser',
  bonfire: 'wall_of_fire',
  teleport: 'teleport',
  barkskin: 'druid_bloom',
  detect_magic: 'detect_magic',
  mordenkainens_mansion: 'dimension_door',
  glyph_of_warding: 'glyph_ward',
  hold_person: 'binding_chains',
  arcane_eye: 'detect_magic',
  color_spray: 'color_spray',
  circle_of_death: 'circle_of_death',
  cloudkill: 'gas_leak',
  incendiary_cloud: 'wall_of_fire',
  aura_of_vitality: 'radiant_heal',
  aura_of_life: 'divine_chime',
  earth_tremor: 'earth_rumble',
  destructive_wave: 'thunder_blast',
  ensnaring_strike: 'nature_rustle',
  insect_plague: 'insect_buzz',
  tiny_hut: 'glyph_ward',
  thorn_whip: 'whip_crack',
  armor_of_agathys: 'frost_shatter',
  fly: 'angelic_wings',
  blight: 'necrotic_pulse',
  warding_bond: 'glyph_ward'
};

let updated = 0;
for (const [id, newSoundKey] of Object.entries(SPELL_SOUND_KEY_MAP)) {
  const re = new RegExp(`("id":\\s*"${id}"[\\s\\S]*?"soundKey":\\s*")([^"]+)(")`);
  const match = txt.match(re);
  if (match) {
    const oldKey = match[2];
    if (oldKey !== newSoundKey) {
      txt = txt.replace(re, `$1${newSoundKey}$3`);
      console.log(`Updated ${id.padEnd(26)}: ${oldKey.padEnd(18)} -> ${newSoundKey}`);
      updated++;
    }
  }
}

fs.writeFileSync(file, txt, 'utf8');
console.log(`Total spell & weapon soundKeys updated in jb2aRegistry.ts: ${updated}`);
