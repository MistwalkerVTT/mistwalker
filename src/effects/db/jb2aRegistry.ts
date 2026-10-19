// src/effects/db/jb2aRegistry.ts
// Official Jules and Ben's Animated Assets (JB2A) Registry for MistWalker 4.0
// Verified against Jules-Bens-Aa/jb2a-databases/JB2A_DnD5e/json/animations-object.json
// Streamed through local /api/effects/asset with byte-range and video/webm MIME enforcement

import { Jb2aAssetDefinition } from '../types/effect';

export const JB2A_REGISTRY: Jb2aAssetDefinition[] = [
  {
    "id": "fireball",
    "name": "Fireball",
    "label": "Fireball (20ft Sphere)",
    "level": 3,
    "school": "evocation",
    "paradigm": "point",
    "shape": "circle",
    "defaultSizeFt": 20,
    "color": "#f97316",
    "webm": "/api/effects/asset?path=Library%2F3rd_Level%2FFireball%2FFireballExplosion_01_Orange_800x800.webm",
    "thumb": "/api/effects/asset?path=Library%2F3rd_Level%2FFireball%2FFireballExplosion_01_Orange_800x800_Thumb.webp",
    "projectileWebm": "/api/effects/asset?path=Library%2F3rd_Level%2FFireball%2FFireballBeam_01_Orange_30ft_1600x400.webm",
    "burstWebm": "/api/effects/asset?path=Library%2F3rd_Level%2FFireball%2FFireballExplosion_01_Orange_800x800.webm",
    "loopWebm": "/api/effects/asset?path=Library%2F3rd_Level%2FFireball%2FFireballLoop_01_Orange_800x800.webm",
    "isPersistent": false,
    "blendMode": "screen",
    "soundKey": "fire_explosion",
    "tags": [
      "fire",
      "blast",
      "aoe",
      "sphere",
      "evocation",
      "explosion"
    ]
  },
  {
    "id": "fire_bolt",
    "name": "Fire Bolt",
    "label": "Fire Bolt (Ranged Spell)",
    "level": 0,
    "school": "evocation",
    "paradigm": "projectile",
    "shape": "ray",
    "defaultSizeFt": 5,
    "color": "#ea580c",
    "webm": "/api/effects/asset?path=Library%2FCantrip%2FFire_Bolt%2FFireBolt_01_Regular_Orange_30ft_1600x400.webm",
    "thumb": "/api/effects/asset?path=Library%2FCantrip%2FFire_Bolt%2FFireBolt_01_Regular_Orange_30ft_1600x400_Thumb.webp",
    "projectileWebm": "/api/effects/asset?path=Library%2FCantrip%2FFire_Bolt%2FFireBolt_01_Regular_Orange_30ft_1600x400.webm",
    "burstWebm": "/api/effects/asset?path=Library%2FCantrip%2FFire_Bolt%2FFireBolt_01_Regular_Orange_30ft_1600x400.webm",
    "isPersistent": false,
    "blendMode": "screen",
    "soundKey": "fire_whoosh",
    "tags": [
      "fire",
      "cantrip",
      "projectile",
      "bolt",
      "evocation"
    ]
  },
  {
    "id": "burning_hands",
    "name": "Burning Hands",
    "label": "Burning Hands (15ft Cone)",
    "level": 1,
    "school": "evocation",
    "paradigm": "cone",
    "shape": "cone",
    "defaultSizeFt": 15,
    "color": "#f97316",
    "webm": "/api/effects/asset?path=Library%2F1st_Level%2FBurning_Hands%2FBurningHands_01_Regular_Orange_600x600.webm",
    "thumb": "/api/effects/asset?path=Library%2F1st_Level%2FBurning_Hands%2FBurningHands_01_Regular_Orange_600x600_Thumb.webp",
    "isPersistent": false,
    "blendMode": "screen",
    "soundKey": "fire_whoosh",
    "tags": [
      "fire",
      "cone",
      "evocation",
      "flames"
    ]
  },
  {
    "id": "cone_of_cold",
    "name": "Cone of Cold",
    "label": "Cone of Cold (60ft Cone)",
    "level": 5,
    "school": "evocation",
    "paradigm": "cone",
    "shape": "cone",
    "defaultSizeFt": 60,
    "color": "#38bdf8",
    "webm": "/api/effects/asset?path=Library%2F5th_Level%2FCone_Of_Cold%2FConeOfCold_01_Regular_Blue_600x600.webm",
    "thumb": "/api/effects/asset?path=Library%2F5th_Level%2FCone_Of_Cold%2FConeOfCold_01_Regular_Blue_600x600_Thumb.webp",
    "isPersistent": false,
    "blendMode": "screen",
    "soundKey": "cold_freeze",
    "tags": [
      "cold",
      "cone",
      "evocation",
      "frost",
      "ice"
    ]
  },
  {
    "id": "ray_of_frost",
    "name": "Ray of Frost",
    "label": "Ray of Frost (Beam)",
    "level": 0,
    "school": "evocation",
    "paradigm": "projectile",
    "shape": "ray",
    "defaultSizeFt": 5,
    "color": "#38bdf8",
    "webm": "/api/effects/asset?path=Library%2FCantrip%2FRay_Of_Frost%2FRayOfFrost_01_Regular_Blue_05ft_600x400.webm",
    "thumb": "/api/effects/asset?path=Library%2FCantrip%2FRay_Of_Frost%2FRayOfFrost_01_Regular_Blue_05ft_600x400_Thumb.webp",
    "projectileWebm": "/api/effects/asset?path=Library%2FCantrip%2FRay_Of_Frost%2FRayOfFrost_01_Regular_Blue_05ft_600x400.webm",
    "burstWebm": "/api/effects/asset?path=Library%2FCantrip%2FRay_Of_Frost%2FRayOfFrost_01_Regular_Blue_05ft_600x400.webm",
    "isPersistent": false,
    "blendMode": "screen",
    "soundKey": "cold_freeze",
    "tags": [
      "cold",
      "cantrip",
      "ray",
      "frost",
      "evocation"
    ]
  },
  {
    "id": "lightning_bolt",
    "name": "Lightning Bolt",
    "label": "Lightning Bolt (100ft Line)",
    "level": 3,
    "school": "evocation",
    "paradigm": "line",
    "shape": "line",
    "defaultSizeFt": 100,
    "color": "#3b82f6",
    "webm": "/api/effects/asset?path=Library%2F3rd_Level%2FLightning_Bolt%2FLightningBolt_01_Regular_Blue_4000x200.webm",
    "thumb": "/api/effects/asset?path=Library%2F3rd_Level%2FLightning_Bolt%2FLightningBolt_01_Regular_Blue_4000x200_Thumb.webp",
    "isPersistent": false,
    "blendMode": "screen",
    "soundKey": "lightning_strike",
    "tags": [
      "lightning",
      "line",
      "evocation",
      "shock"
    ]
  },
  {
    "id": "call_lightning",
    "name": "Call Lightning",
    "label": "Call Lightning (Storm Strike)",
    "level": 3,
    "school": "conjuration",
    "paradigm": "point",
    "shape": "circle",
    "defaultSizeFt": 10,
    "color": "#60a5fa",
    "webm": "/api/effects/asset?path=Library%2F3rd_Level%2FCall_Lightning%2FCallLightning_01_Blue_1000x1000.webm",
    "thumb": "/api/effects/asset?path=Library%2F3rd_Level%2FCall_Lightning%2FCallLightning_01_Blue_1000x1000_Thumb.webp",
    "isPersistent": false,
    "blendMode": "screen",
    "soundKey": "lightning_strike",
    "tags": [
      "lightning",
      "storm",
      "conjuration",
      "strike"
    ]
  },
  {
    "id": "chain_lightning",
    "name": "Chain Lightning",
    "label": "Chain Lightning (Arcing)",
    "level": 6,
    "school": "evocation",
    "paradigm": "projectile",
    "shape": "ray",
    "defaultSizeFt": 10,
    "color": "#3b82f6",
    "webm": "/api/effects/asset?path=Library%2F6th_Level%2FChain_Lightning%2FChainLightning_01_Regular_Blue_05ft_Primary_600x400.webm",
    "thumb": "/api/effects/asset?path=Library%2F6th_Level%2FChain_Lightning%2FChainLightning_01_Regular_Blue_05ft_Primary_600x400_Thumb.webp",
    "projectileWebm": "/api/effects/asset?path=Library%2F6th_Level%2FChain_Lightning%2FChainLightning_01_Regular_Blue_05ft_Primary_600x400.webm",
    "burstWebm": "/api/effects/asset?path=Library%2F6th_Level%2FChain_Lightning%2FChainLightning_01_Regular_Blue_05ft_Primary_600x400.webm",
    "isPersistent": false,
    "blendMode": "screen",
    "soundKey": "lightning_strike",
    "tags": [
      "lightning",
      "evocation",
      "chain"
    ]
  },
  {
    "id": "witch_bolt",
    "name": "Witch Bolt",
    "label": "Witch Bolt (Sustained Arc)",
    "level": 1,
    "school": "evocation",
    "paradigm": "line",
    "shape": "line",
    "defaultSizeFt": 30,
    "color": "#3b82f6",
    "webm": "/api/effects/asset?path=Library%2F1st_Level%2FWitch_Bolt%2FWitchBolt_01_Regular_Blue_05ft_600x400.webm",
    "thumb": "/api/effects/asset?path=Library%2F1st_Level%2FWitch_Bolt%2FWitchBolt_01_Regular_Blue_05ft_600x400_Thumb.webp",
    "projectileWebm": "/api/effects/asset?path=Library%2F1st_Level%2FWitch_Bolt%2FWitchBolt_01_Regular_Blue_05ft_600x400.webm",
    "isPersistent": false,
    "blendMode": "screen",
    "soundKey": "lightning_strike",
    "tags": [
      "lightning",
      "evocation",
      "beam"
    ]
  },
  {
    "id": "eldritch_blast",
    "name": "Eldritch Blast",
    "label": "Eldritch Blast (Force Beam)",
    "level": 0,
    "school": "evocation",
    "paradigm": "projectile",
    "shape": "ray",
    "defaultSizeFt": 5,
    "color": "#a855f7",
    "webm": "/api/effects/asset?path=Library%2FCantrip%2FEldritch_Blast%2FEldritchBlast_01_Regular_Purple_05ft_600x400.webm",
    "thumb": "/api/effects/asset?path=Library%2FCantrip%2FEldritch_Blast%2FEldritchBlast_01_Regular_Purple_05ft_600x400_Thumb.webp",
    "projectileWebm": "/api/effects/asset?path=Library%2FCantrip%2FEldritch_Blast%2FEldritchBlast_01_Regular_Purple_05ft_600x400.webm",
    "burstWebm": "/api/effects/asset?path=Library%2FCantrip%2FEldritch_Blast%2FEldritchBlast_01_Regular_Purple_05ft_600x400.webm",
    "isPersistent": false,
    "blendMode": "screen",
    "soundKey": "eldritch_blast",
    "tags": [
      "force",
      "cantrip",
      "warlock",
      "eldritch",
      "evocation"
    ]
  },
  {
    "id": "magic_missile",
    "name": "Magic Missile",
    "label": "Magic Missile (Force Dart)",
    "level": 1,
    "school": "evocation",
    "paradigm": "projectile",
    "shape": "ray",
    "defaultSizeFt": 5,
    "color": "#c084fc",
    "webm": "/api/effects/asset?path=Library%2F1st_Level%2FMagic_Missile%2FMagicMissile_01_Regular_Purple_05ft_01_600x400.webm",
    "thumb": "/api/effects/asset?path=Library%2F1st_Level%2FMagic_Missile%2FMagicMissile_01_Regular_Purple_05ft_01_600x400_Thumb.webp",
    "projectileWebm": "/api/effects/asset?path=Library%2F1st_Level%2FMagic_Missile%2FMagicMissile_01_Regular_Purple_05ft_01_600x400.webm",
    "burstWebm": "/api/effects/asset?path=Library%2F1st_Level%2FMagic_Missile%2FMagicMissile_01_Regular_Purple_05ft_01_600x400.webm",
    "isPersistent": false,
    "blendMode": "screen",
    "soundKey": "arcane_cast",
    "tags": [
      "force",
      "dart",
      "evocation",
      "magic missile"
    ]
  },
  {
    "id": "shield",
    "name": "Shield",
    "label": "Shield (Abjuration Barrier)",
    "level": 1,
    "school": "abjuration",
    "paradigm": "aura",
    "shape": "circle",
    "defaultSizeFt": 5,
    "color": "#38bdf8",
    "webm": "/api/effects/asset?path=Library%2F1st_Level%2FShield%2FShield_01_Regular_Blue_Complete_400x400.webm",
    "thumb": "/api/effects/asset?path=Library%2F1st_Level%2FShield%2FShield_01_Regular_Blue_Complete_400x400_Thumb.webp",
    "loopWebm": "/api/effects/asset?path=Library%2F1st_Level%2FShield%2FShield_01_Regular_Blue_Complete_400x400.webm",
    "isPersistent": true,
    "blendMode": "screen",
    "soundKey": "shield_barrier",
    "tags": [
      "abjuration",
      "shield",
      "defense",
      "barrier"
    ]
  },
  {
    "id": "cure_wounds",
    "name": "Cure Wounds",
    "label": "Cure Wounds (Healing Light)",
    "level": 1,
    "school": "evocation",
    "paradigm": "point",
    "shape": "circle",
    "defaultSizeFt": 5,
    "color": "#10b981",
    "webm": "/api/effects/asset?path=Library%2F1st_Level%2FCure_Wounds%2FCureWounds_01_Blue_200x200.webm",
    "thumb": "/api/effects/asset?path=Library%2F1st_Level%2FCure_Wounds%2FCureWounds_01_Blue_200x200_Thumb.webp",
    "isPersistent": false,
    "blendMode": "screen",
    "soundKey": "radiant_heal",
    "tags": [
      "healing",
      "cure wounds",
      "radiant",
      "evocation"
    ]
  },
  {
    "id": "bless",
    "name": "Bless",
    "label": "Bless (Divine Aura)",
    "level": 1,
    "school": "enchantment",
    "paradigm": "aura",
    "shape": "circle",
    "defaultSizeFt": 5,
    "color": "#fbbf24",
    "webm": "/api/effects/asset?path=Library%2F1st_Level%2FBless%2FBless_01_Regular_Yellow_Intro_200x200.webm",
    "thumb": "/api/effects/asset?path=Library%2F1st_Level%2FBless%2FBless_01_Regular_Yellow_Intro_200x200_Thumb.webp",
    "loopWebm": "/api/effects/asset?path=Library%2F1st_Level%2FBless%2FBless_01_Regular_Yellow_Loop_200x200.webm",
    "isPersistent": true,
    "blendMode": "screen",
    "soundKey": "radiant_heal",
    "tags": [
      "buff",
      "bless",
      "enchantment",
      "divine"
    ]
  },
  {
    "id": "sacred_flame",
    "name": "Sacred Flame",
    "label": "Sacred Flame (Radiant Pillar)",
    "level": 0,
    "school": "evocation",
    "paradigm": "point",
    "shape": "circle",
    "defaultSizeFt": 5,
    "color": "#fbbf24",
    "webm": "/api/effects/asset?path=Library%2FCantrip%2FSacred_Flame%2FSacredFlameSource_01_Regular_Yellow_400x400.webm",
    "thumb": "/api/effects/asset?path=Library%2FCantrip%2FSacred_Flame%2FSacredFlameSource_01_Regular_Yellow_400x400_Thumb.webp",
    "isPersistent": false,
    "blendMode": "screen",
    "soundKey": "radiant_heal",
    "tags": [
      "radiant",
      "sacred flame",
      "cantrip",
      "evocation"
    ]
  },
  {
    "id": "guiding_bolt",
    "name": "Guiding Bolt",
    "label": "Guiding Bolt (Radiant Blast)",
    "level": 1,
    "school": "evocation",
    "paradigm": "projectile",
    "shape": "ray",
    "defaultSizeFt": 5,
    "color": "#fbbf24",
    "webm": "/api/effects/asset?path=Library%2F1st_Level%2FGuiding_Bolt%2FGuidingBolt_01_Regular_BlueYellow_05ft_600x400.webm",
    "thumb": "/api/effects/asset?path=Library%2F1st_Level%2FGuiding_Bolt%2FGuidingBolt_01_Regular_BlueYellow_05ft_600x400_Thumb.webp",
    "projectileWebm": "/api/effects/asset?path=Library%2F1st_Level%2FGuiding_Bolt%2FGuidingBolt_01_Regular_BlueYellow_05ft_600x400.webm",
    "burstWebm": "/api/effects/asset?path=Library%2F1st_Level%2FGuiding_Bolt%2FGuidingBolt_01_Regular_BlueYellow_05ft_600x400.webm",
    "isPersistent": false,
    "blendMode": "screen",
    "soundKey": "radiant_heal",
    "tags": [
      "radiant",
      "guiding bolt",
      "projectile",
      "evocation"
    ]
  },
  {
    "id": "scorching_ray",
    "name": "Scorching Ray",
    "label": "Scorching Ray (Fire Beam)",
    "level": 2,
    "school": "evocation",
    "paradigm": "projectile",
    "shape": "ray",
    "defaultSizeFt": 5,
    "color": "#ea580c",
    "webm": "/api/effects/asset?path=Library%2F2nd_Level%2FScorching_Ray%2FScorchingRay_01_Regular_Orange_05ft_600x400.webm",
    "thumb": "/api/effects/asset?path=Library%2F2nd_Level%2FScorching_Ray%2FScorchingRay_01_Regular_Orange_05ft_600x400_Thumb.webp",
    "projectileWebm": "/api/effects/asset?path=Library%2F2nd_Level%2FScorching_Ray%2FScorchingRay_01_Regular_Orange_05ft_600x400.webm",
    "burstWebm": "/api/effects/asset?path=Library%2F2nd_Level%2FScorching_Ray%2FScorchingRay_01_Regular_Orange_05ft_600x400.webm",
    "isPersistent": false,
    "blendMode": "screen",
    "soundKey": "fire_whoosh",
    "tags": [
      "fire",
      "ray",
      "scorching ray",
      "evocation"
    ]
  },
  {
    "id": "misty_step",
    "name": "Misty Step",
    "label": "Misty Step (Arcane Blink)",
    "level": 2,
    "school": "conjuration",
    "paradigm": "point",
    "shape": "circle",
    "defaultSizeFt": 5,
    "color": "#818cf8",
    "webm": "/api/effects/asset?path=Library%2F2nd_Level%2FMisty_Step%2FMistyStep_01_Regular_Blue_400x400.webm",
    "thumb": "/api/effects/asset?path=Library%2F2nd_Level%2FMisty_Step%2FMistyStep_01_Regular_Blue_400x400_Thumb.webp",
    "isPersistent": false,
    "blendMode": "screen",
    "soundKey": "teleport_whoosh",
    "tags": [
      "teleport",
      "misty step",
      "conjuration",
      "escape"
    ]
  },
  {
    "id": "thunderwave",
    "name": "Thunderwave",
    "label": "Thunderwave (15ft Cube)",
    "level": 1,
    "school": "evocation",
    "paradigm": "cone",
    "shape": "cone",
    "defaultSizeFt": 15,
    "color": "#60a5fa",
    "webm": "/api/effects/asset?path=Library%2F1st_Level%2FThunderwave%2FThunderwave_01_Bright_Blue_BLeft_600x600.webm",
    "thumb": "/api/effects/asset?path=Library%2F1st_Level%2FThunderwave%2FThunderwave_01_Bright_Blue_BLeft_600x600_Thumb.webp",
    "isPersistent": false,
    "blendMode": "screen",
    "soundKey": "fire_explosion",
    "tags": [
      "thunder",
      "cube",
      "evocation",
      "wave"
    ]
  },
  {
    "id": "shatter",
    "name": "Shatter",
    "label": "Shatter (Resonant Blast)",
    "level": 2,
    "school": "evocation",
    "paradigm": "point",
    "shape": "circle",
    "defaultSizeFt": 10,
    "color": "#38bdf8",
    "webm": "/api/effects/asset?path=Library%2F2nd_Level%2FShatter%2FShatter_01_Blue_400x400.webm",
    "thumb": "/api/effects/asset?path=Library%2F2nd_Level%2FShatter%2FShatter_01_Blue_400x400_Thumb.webp",
    "isPersistent": false,
    "blendMode": "screen",
    "soundKey": "fire_explosion",
    "tags": [
      "thunder",
      "shatter",
      "evocation",
      "aoe"
    ]
  },
  {
    "id": "spirit_guardians",
    "name": "Spirit Guardians",
    "label": "Spirit Guardians (15ft Orbit)",
    "level": 3,
    "school": "conjuration",
    "paradigm": "aura",
    "shape": "circle",
    "defaultSizeFt": 15,
    "color": "#fbbf24",
    "webm": "/api/effects/asset?path=Library%2F3rd_Level%2FSpirit_Guardians%2FSpiritGuardians_01_Light_BlueYellow_600x600.webm",
    "thumb": "/api/effects/asset?path=Library%2F3rd_Level%2FSpirit_Guardians%2FSpiritGuardians_01_Light_BlueYellow_600x600_Thumb.webp",
    "loopWebm": "/api/effects/asset?path=Library%2F3rd_Level%2FSpirit_Guardians%2FSpiritGuardians_01_Light_BlueYellow_600x600.webm",
    "isPersistent": true,
    "blendMode": "screen",
    "soundKey": "radiant_heal",
    "tags": [
      "radiant",
      "aura",
      "conjuration",
      "guardians"
    ]
  },
  {
    "id": "spiritual_weapon",
    "name": "Spiritual Weapon",
    "label": "Spiritual Weapon (Spectral Mace)",
    "level": 2,
    "school": "evocation",
    "paradigm": "point",
    "shape": "circle",
    "defaultSizeFt": 5,
    "color": "#fbbf24",
    "webm": "/api/effects/asset?path=Library%2F2nd_Level%2FSpiritual_Weapon%2FSpiritualWeapon_Club01_02_Spectral_Green_400x400.webm",
    "thumb": "/api/effects/asset?path=Library%2F2nd_Level%2FSpiritual_Weapon%2FSpiritualWeapon_Club01_02_Spectral_Green_400x400_Thumb.webp",
    "isPersistent": true,
    "blendMode": "screen",
    "soundKey": "radiant_heal",
    "tags": [
      "force",
      "weapon",
      "evocation",
      "spectral"
    ]
  },
  {
    "id": "cloud_of_daggers",
    "name": "Cloud of Daggers",
    "label": "Cloud of Daggers (Spinning Blades)",
    "level": 2,
    "school": "conjuration",
    "paradigm": "point",
    "shape": "circle",
    "defaultSizeFt": 5,
    "color": "#94a3b8",
    "webm": "/api/effects/asset?path=Library%2F2nd_Level%2FCloud_Of_Daggers%2FCloudOfDaggers_01_Light_Blue_400x400.webm",
    "thumb": "/api/effects/asset?path=Library%2F2nd_Level%2FCloud_Of_Daggers%2FCloudOfDaggers_01_Light_Blue_400x400_Thumb.webp",
    "isPersistent": true,
    "blendMode": "screen",
    "soundKey": "arcane_cast",
    "tags": [
      "slashing",
      "daggers",
      "conjuration",
      "blades"
    ]
  },
  {
    "id": "arms_of_hadar",
    "name": "Arms of Hadar",
    "label": "Arms of Hadar (Dark Tentacles)",
    "level": 1,
    "school": "conjuration",
    "paradigm": "point",
    "shape": "circle",
    "defaultSizeFt": 10,
    "color": "#581c87",
    "webm": "/api/effects/asset?path=Library%2F1st_Level%2FArms_Of_Hadar%2FArmsOfHadar_01_Dark_Purple_500x500.webm",
    "thumb": "/api/effects/asset?path=Library%2F1st_Level%2FArms_Of_Hadar%2FArmsOfHadar_01_Dark_Purple_500x500_Thumb.webp",
    "isPersistent": false,
    "blendMode": "screen",
    "soundKey": "necrotic_drain",
    "tags": [
      "necrotic",
      "tentacles",
      "conjuration",
      "hadar"
    ]
  },
  {
    "id": "disintegrate",
    "name": "Disintegrate",
    "label": "Disintegrate (Green Ray)",
    "level": 6,
    "school": "transmutation",
    "paradigm": "line",
    "shape": "ray",
    "defaultSizeFt": 5,
    "color": "#22c55e",
    "webm": "/api/effects/asset?path=Library%2F6th_Level%2FDisintegrate%2FDisintegrate_01_Regular_Green01_05ft_600x400.webm",
    "thumb": "/api/effects/asset?path=Library%2F6th_Level%2FDisintegrate%2FDisintegrate_01_Regular_Green01_05ft_600x400_Thumb.webp",
    "projectileWebm": "/api/effects/asset?path=Library%2F6th_Level%2FDisintegrate%2FDisintegrate_01_Regular_Green01_05ft_600x400.webm",
    "isPersistent": false,
    "blendMode": "screen",
    "soundKey": "arcane_cast",
    "tags": [
      "force",
      "disintegrate",
      "transmutation",
      "green ray"
    ]
  },
  {
    "id": "darkness",
    "name": "Darkness",
    "label": "Darkness (15ft Magical Void)",
    "level": 2,
    "school": "evocation",
    "paradigm": "point",
    "shape": "circle",
    "defaultSizeFt": 15,
    "color": "#09090b",
    "webm": "/api/effects/asset?path=Library%2F2nd_Level%2FDarkness%2FDarkness_01_Black_600x600.webm",
    "thumb": "/api/effects/asset?path=Library%2F2nd_Level%2FDarkness%2FDarkness_01_Black_600x600_Thumb.webp",
    "isPersistent": true,
    "blendMode": "screen",
    "soundKey": "necrotic_drain",
    "tags": [
      "darkness",
      "void",
      "evocation",
      "shadow"
    ]
  },
  {
    "id": "fog_cloud",
    "name": "Fog Cloud",
    "label": "Fog Cloud (20ft Obscuring Fog)",
    "level": 1,
    "school": "conjuration",
    "paradigm": "point",
    "shape": "circle",
    "defaultSizeFt": 20,
    "color": "#cbd5e1",
    "webm": "/api/effects/asset?path=Library%2F1st_Level%2FFog_Cloud%2FFogCloud_01_White_800x800.webm",
    "thumb": "/api/effects/asset?path=Library%2F1st_Level%2FFog_Cloud%2FFogCloud_01_White_800x800_Thumb.webp",
    "isPersistent": true,
    "blendMode": "screen",
    "soundKey": "arcane_cast",
    "tags": [
      "fog",
      "cloud",
      "conjuration",
      "mist"
    ]
  },
  {
    "id": "web",
    "name": "Web",
    "label": "Web (20ft Sticky Webbing)",
    "level": 2,
    "school": "conjuration",
    "paradigm": "point",
    "shape": "circle",
    "defaultSizeFt": 20,
    "color": "#e2e8f0",
    "webm": "/api/effects/asset?path=Library%2FGeneric%2FTemplate%2FCircle%2FWeb%2F002%2FTemplate_Circle_WebComplete_002_001_White_5x5_1000.webm",
    "thumb": "/api/effects/asset?path=Library%2FGeneric%2FTemplate%2FCircle%2FWeb%2F002%2FTemplate_Circle_WebComplete_002_001_White_5x5_1000_Thumb.webp",
    "loopWebm": "/api/effects/asset?path=Library%2FGeneric%2FTemplate%2FCircle%2FWeb%2F002%2FTemplate_Circle_WebLoop_002_001_White_5x5_1000.webm",
    "isPersistent": true,
    "blendMode": "screen",
    "soundKey": "arcane_cast",
    "tags": [
      "web",
      "restraint",
      "conjuration"
    ]
  },
  {
    "id": "moonbeam",
    "name": "Moonbeam",
    "label": "Moonbeam (Silver Light Cylinder)",
    "level": 2,
    "school": "evocation",
    "paradigm": "point",
    "shape": "circle",
    "defaultSizeFt": 5,
    "color": "#e0e7ff",
    "webm": "/api/effects/asset?path=Library%2F2nd_Level%2FMoonbeam%2FMoonbeamComplete_01_Regular_Blue_400x400.webm",
    "thumb": "/api/effects/asset?path=Library%2F2nd_Level%2FMoonbeam%2FMoonbeamComplete_01_Regular_Blue_400x400_Thumb.webp",
    "isPersistent": true,
    "blendMode": "screen",
    "soundKey": "radiant_heal",
    "tags": [
      "radiant",
      "moonbeam",
      "cylinder",
      "evocation"
    ]
  },
  {
    "id": "whirlwind",
    "name": "Whirlwind",
    "label": "Whirlwind (10ft Vortex)",
    "level": 7,
    "school": "evocation",
    "paradigm": "point",
    "shape": "circle",
    "defaultSizeFt": 10,
    "color": "#94a3b8",
    "webm": "/api/effects/asset?path=Library%2F7th_Level%2FWhirlwind%2FWhirlwind_01_BlueGrey_01_400x400.webm",
    "thumb": "/api/effects/asset?path=Library%2F7th_Level%2FWhirlwind%2FWhirlwind_01_BlueGrey_01_400x400_Thumb.webp",
    "isPersistent": true,
    "blendMode": "screen",
    "soundKey": "teleport_whoosh",
    "tags": [
      "wind",
      "whirlwind",
      "vortex",
      "evocation"
    ]
  },
  {
    "id": "wall_of_fire",
    "name": "Wall of Fire",
    "label": "Wall of Fire (60ft Fiery Barrier)",
    "level": 4,
    "school": "evocation",
    "paradigm": "line",
    "shape": "line",
    "defaultSizeFt": 60,
    "color": "#f97316",
    "webm": "/api/effects/asset?path=Library%2F4th_Level%2FWall_Of_Fire%2FWallOfFire_01_Blue_100x100.webm",
    "thumb": "/api/effects/asset?path=Library%2F4th_Level%2FWall_Of_Fire%2FWallOfFire_01_Blue_100x100_Thumb.webp",
    "loopWebm": "/api/effects/asset?path=Library%2F4th_Level%2FWall_Of_Fire%2FWallOfFire_01_Blue_Ring_400x400.webm",
    "isPersistent": true,
    "blendMode": "screen",
    "soundKey": "fire_whoosh",
    "tags": [
      "fire",
      "wall",
      "evocation",
      "barrier"
    ]
  },
  {
    "id": "template_circle_fire",
    "name": "Circle Template (Fire)",
    "label": "Fire Area (Circle)",
    "level": 1,
    "school": "evocation",
    "paradigm": "point",
    "shape": "circle",
    "defaultSizeFt": 20,
    "color": "#f97316",
    "webm": "/api/effects/asset?path=Library%2F3rd_Level%2FFireball%2FFireballExplosion_01_Orange_800x800.webm",
    "thumb": "/api/effects/asset?path=Library%2F3rd_Level%2FFireball%2FFireballExplosion_01_Orange_800x800_Thumb.webp",
    "isPersistent": false,
    "blendMode": "screen",
    "soundKey": "fire_explosion",
    "tags": [
      "template",
      "fire",
      "circle"
    ]
  },
  {
    "id": "template_circle_cold",
    "name": "Circle Template (Frost)",
    "label": "Frost Area (Circle)",
    "level": 1,
    "school": "evocation",
    "paradigm": "point",
    "shape": "circle",
    "defaultSizeFt": 20,
    "color": "#38bdf8",
    "webm": "/api/effects/asset?path=Library%2F5th_Level%2FCone_Of_Cold%2FConeOfCold_01_Regular_Blue_600x600.webm",
    "thumb": "/api/effects/asset?path=Library%2F5th_Level%2FCone_Of_Cold%2FConeOfCold_01_Regular_Blue_600x600_Thumb.webp",
    "isPersistent": false,
    "blendMode": "screen",
    "soundKey": "cold_freeze",
    "tags": [
      "template",
      "cold",
      "circle"
    ]
  },
  {
    "id": "template_circle_radiant",
    "name": "Circle Template (Radiant)",
    "label": "Radiant Area (Circle)",
    "level": 1,
    "school": "evocation",
    "paradigm": "point",
    "shape": "circle",
    "defaultSizeFt": 15,
    "color": "#fbbf24",
    "webm": "/api/effects/asset?path=Library%2F3rd_Level%2FSpirit_Guardians%2FSpiritGuardians_01_Light_BlueYellow_600x600.webm",
    "thumb": "/api/effects/asset?path=Library%2F3rd_Level%2FSpirit_Guardians%2FSpiritGuardians_01_Light_BlueYellow_600x600_Thumb.webp",
    "isPersistent": false,
    "blendMode": "screen",
    "soundKey": "radiant_heal",
    "tags": [
      "template",
      "radiant",
      "circle"
    ]
  },
  {
    "id": "template_circle_necrotic",
    "name": "Circle Template (Necrotic)",
    "label": "Necrotic Area (Circle)",
    "level": 1,
    "school": "evocation",
    "paradigm": "point",
    "shape": "circle",
    "defaultSizeFt": 15,
    "color": "#581c87",
    "webm": "/api/effects/asset?path=Library%2F1st_Level%2FArms_Of_Hadar%2FArmsOfHadar_01_Dark_Purple_500x500.webm",
    "thumb": "/api/effects/asset?path=Library%2F1st_Level%2FArms_Of_Hadar%2FArmsOfHadar_01_Dark_Purple_500x500_Thumb.webp",
    "isPersistent": false,
    "blendMode": "screen",
    "soundKey": "necrotic_drain",
    "tags": [
      "template",
      "necrotic",
      "circle"
    ]
  },
  {
    "id": "template_cone_fire",
    "name": "Cone Template (Fire)",
    "label": "Fire Cone (15ft)",
    "level": 1,
    "school": "evocation",
    "paradigm": "cone",
    "shape": "cone",
    "defaultSizeFt": 15,
    "color": "#f97316",
    "webm": "/api/effects/asset?path=Library%2F1st_Level%2FBurning_Hands%2FBurningHands_01_Regular_Orange_600x600.webm",
    "thumb": "/api/effects/asset?path=Library%2F1st_Level%2FBurning_Hands%2FBurningHands_01_Regular_Orange_600x600_Thumb.webp",
    "isPersistent": false,
    "blendMode": "screen",
    "soundKey": "fire_whoosh",
    "tags": [
      "template",
      "fire",
      "cone"
    ]
  },
  {
    "id": "template_line_lightning",
    "name": "Line Template (Lightning)",
    "label": "Lightning Line (60ft)",
    "level": 1,
    "school": "evocation",
    "paradigm": "line",
    "shape": "line",
    "defaultSizeFt": 60,
    "color": "#3b82f6",
    "webm": "/api/effects/asset?path=Library%2F3rd_Level%2FLightning_Bolt%2FLightningBolt_01_Regular_Blue_4000x400.webm",
    "thumb": "/api/effects/asset?path=Library%2F3rd_Level%2FLightning_Bolt%2FLightningBolt_01_Regular_Blue_4000x400_Thumb.webp",
    "isPersistent": false,
    "blendMode": "screen",
    "soundKey": "lightning_strike",
    "tags": [
      "template",
      "lightning",
      "line"
    ]
  }
];

export const JB2A_SPELLS_MAP: Record<string, Jb2aAssetDefinition> = Object.fromEntries(
  JB2A_REGISTRY.map(a => [a.id, a])
);

export const findJb2aAsset = (idOrName: string): Jb2aAssetDefinition | undefined => {
  if (!idOrName) return undefined;
  if (JB2A_SPELLS_MAP[idOrName]) return JB2A_SPELLS_MAP[idOrName];
  const clean = idOrName.toLowerCase().replace(/[\s_-]+/g, '');
  return JB2A_REGISTRY.find(a => 
    a.id.toLowerCase().replace(/[\s_-]+/g, '') === clean ||
    a.name.toLowerCase().replace(/[\s_-]+/g, '') === clean
  );
};

export const getJb2aAssetById = (id: string): Jb2aAssetDefinition | undefined => findJb2aAsset(id);
