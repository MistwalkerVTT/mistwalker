// src/data/criticalHitsTables.ts
// Complete Critical Hits Revisited data tables: Damage Charts, Minor/Major Injuries, and Insanities

export type DamageTypeCategory =
  | 'bludgeoning'
  | 'piercing'
  | 'slashing'
  | 'acid'
  | 'cold'
  | 'fire'
  | 'force'
  | 'lightning'
  | 'necrotic'
  | 'poison'
  | 'psychic'
  | 'radiant'
  | 'thunder';

export interface CriticalHitOutcome {
  range: [number, number]; // [min, max] on d20
  title: string;
  effect: string;
  tags?: string[];
  injuryChart?: 'minor' | 'major' | 'both' | 'insanity';
}

export interface CriticalDamageChart {
  id: DamageTypeCategory;
  name: string;
  category: 'weapon' | 'magic';
  description: string;
  color: string;
  accentClass: string;
  outcomes: CriticalHitOutcome[];
}

export interface InjuryOutcome {
  range: [number, number]; // [min, max] on d20
  title: string;
  effect: string;
  healingNotes: string;
}

export interface InsanityOutcome {
  d20: number;
  title: string;
  effect: string;
  dc?: number;
  stat?: 'Wisdom' | 'Constitution';
}

export const CRITICAL_HIT_DAMAGE_CHARTS: Record<DamageTypeCategory, CriticalDamageChart> = {
  bludgeoning: {
    id: 'bludgeoning',
    name: 'Bludgeoning',
    category: 'weapon',
    description: 'Blunt crushing force shattering bones, sending targets reeling, or knocking them prone.',
    color: '#f59e0b',
    accentClass: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
    outcomes: [
      {
        range: [1, 1],
        title: 'You call that a crit?',
        effect: 'Roll damage as normal.'
      },
      {
        range: [2, 3],
        title: 'Smashed off balance!',
        effect: 'Roll damage as normal and the next attack against the creature has advantage.'
      },
      {
        range: [4, 6],
        title: 'Good hit!',
        effect: 'Do not roll your damage dice, instead deal the maximum result possible with those dice.'
      },
      {
        range: [7, 8],
        title: 'Sent reeling!',
        effect: 'Do not roll your damage dice, instead deal the maximum result possible with those dice and push the creature up to 15 feet in any direction.'
      },
      {
        range: [9, 11],
        title: 'Great hit!',
        effect: 'Roll your damage dice twice and add them together.'
      },
      {
        range: [12, 13],
        title: 'Take a seat!',
        effect: 'Roll damage dice twice and add them together and the creature is knocked prone.'
      },
      {
        range: [14, 16],
        title: 'Rocked and rolled!',
        effect: 'Roll damage dice twice and add them together, push the creature up to 15 feet away, and the creature is knocked prone.'
      },
      {
        range: [17, 18],
        title: 'Grievous injury!',
        effect: 'Deal the maximum amount of damage from your normal damage dice then roll your damage dice and add the result. Then roll on the Minor Injury chart. If the creature is wearing heavy armor roll on the Major Injury chart instead.',
        injuryChart: 'minor'
      },
      {
        range: [19, 19],
        title: 'Crushed!',
        effect: 'Deal twice the maximum result of your damage dice and roll on the Major Injury chart.',
        injuryChart: 'major'
      },
      {
        range: [20, 20],
        title: 'Splat!',
        effect: 'Deal the maximum result of your damage dice twice, the creature is stunned until the end of your next turn, and roll on the Major Injury chart.',
        injuryChart: 'major'
      }
    ]
  },

  piercing: {
    id: 'piercing',
    name: 'Piercing',
    category: 'weapon',
    description: 'Precision thrusts puncturing vitals, piercing armor, and causing deep internal punctures.',
    color: '#06b6d4',
    accentClass: 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10',
    outcomes: [
      {
        range: [1, 1],
        title: 'You call that a crit?',
        effect: 'Roll damage as normal.'
      },
      {
        range: [2, 3],
        title: 'Lunge and thrust!',
        effect: 'Roll damage dice twice and use the higher result.'
      },
      {
        range: [4, 6],
        title: 'Good hit!',
        effect: 'Do not roll your damage dice, instead deal the maximum result possible with those dice.'
      },
      {
        range: [7, 8],
        title: 'Stabbed!',
        effect: 'Roll your damage dice twice and add them together.'
      },
      {
        range: [9, 11],
        title: 'Great hit!',
        effect: 'Roll your damage dice twice and add them together.'
      },
      {
        range: [12, 13],
        title: 'Swiss cheese!',
        effect: 'Roll twice as many damage dice as normal. Then roll twice on the minor injury chart and use the lower result.',
        injuryChart: 'minor'
      },
      {
        range: [14, 16],
        title: 'Punctured!',
        effect: 'Roll your damage dice twice and add them together and roll on the minor injury chart.',
        injuryChart: 'minor'
      },
      {
        range: [17, 18],
        title: 'Cruel prick!',
        effect: 'Roll your damage dice twice and add them together and roll on the major injury chart.',
        injuryChart: 'major'
      },
      {
        range: [19, 19],
        title: 'Run through!',
        effect: 'Deal twice the maximum result of your damage dice and roll on the major injury chart.',
        injuryChart: 'major'
      },
      {
        range: [20, 20],
        title: 'Pierce!',
        effect: 'Deal the maximum result of your damage dice twice, roll on the minor injury chart, and roll on the major injury chart.',
        injuryChart: 'both'
      }
    ]
  },

  slashing: {
    id: 'slashing',
    name: 'Slashing',
    category: 'weapon',
    description: 'Vicious sweeping blades cutting deep gashes, causing severe ongoing bleeding, and severing limbs.',
    color: '#ef4444',
    accentClass: 'text-rose-400 border-rose-500/40 bg-rose-500/10',
    outcomes: [
      {
        range: [1, 1],
        title: 'You call that a crit?',
        effect: 'Roll damage as normal.'
      },
      {
        range: [2, 3],
        title: 'Sliced and diced!',
        effect: 'Roll damage as normal and the creature loses 1d6 hit points at the start of its next turn.'
      },
      {
        range: [4, 6],
        title: 'Good hit!',
        effect: 'Do not roll your damage dice, instead deal the maximum result possible with those dice.'
      },
      {
        range: [7, 8],
        title: 'Open gash!',
        effect: 'Roll your damage dice as normal and the creature is bleeding. For the next minute the creature loses 1d4 damage at the start of each of its turns until it uses an action to staunch this wound.'
      },
      {
        range: [9, 11],
        title: 'Great hit!',
        effect: 'Roll your damage dice twice and add them together.'
      },
      {
        range: [12, 13],
        title: 'Deep slice!',
        effect: 'Roll your damage dice twice and add them together and the creature is bleeding. For the next minute the creature loses 1d8 hit points at the start of each of its turns until it uses an action to staunch this wound.'
      },
      {
        range: [14, 16],
        title: 'Lacerated!',
        effect: 'Roll your damage dice twice and add them together and the creature is bleeding. For the next minute the creature loses 1d12 hit points at the start of each of its turns until it uses an action to staunch this wound.'
      },
      {
        range: [17, 18],
        title: 'Severed!',
        effect: 'Deal the maximum amount of damage from your normal damage dice then roll your damage dice and add the result. Then roll on the Minor Injury chart. If the creature is wearing light or no armor roll on the Major Injury chart instead.',
        injuryChart: 'minor'
      },
      {
        range: [19, 19],
        title: 'Dissected!',
        effect: 'Deal twice the maximum result of your damage dice and roll on the major injury chart.',
        injuryChart: 'major'
      },
      {
        range: [20, 20],
        title: 'Slash!',
        effect: 'Deal the maximum result of your damage dice twice, roll on the major injury chart, and the creature is bleeding. For the next minute the creature loses 2d8 hit points at the start of each of its turns until it uses an action to staunch this wound.',
        injuryChart: 'major'
      }
    ]
  },

  acid: {
    id: 'acid',
    name: 'Acid',
    category: 'magic',
    description: 'Corrosive fluids melting skin, degrading or dissolving armor, and causing gruesome disfigurement.',
    color: '#84cc16',
    accentClass: 'text-lime-400 border-lime-500/40 bg-lime-500/10',
    outcomes: [
      {
        range: [1, 1],
        title: 'You call that a crit?',
        effect: 'Roll damage as normal.'
      },
      {
        range: [2, 3],
        title: 'Scalding bile!',
        effect: 'Roll damage as normal and the creature is scarred. While scarred the creature has disadvantage on all Charisma ability checks except Charisma (Intimidation). Being scarred can be healed in the same way as a minor injury.'
      },
      {
        range: [4, 6],
        title: 'Good hit!',
        effect: 'Do not roll your damage dice, instead deal the maximum result possible with those dice.'
      },
      {
        range: [7, 8],
        title: 'Melted flesh!',
        effect: 'Roll your damage as normal and the creature is disfigured. While disfigured the creature has disadvantage on all Charisma ability checks except Charisma (Intimidation). Being disfigured can be removed with the spell greater restoration.'
      },
      {
        range: [9, 11],
        title: 'Great hit!',
        effect: 'Roll your damage dice twice and add them together.'
      },
      {
        range: [12, 13],
        title: 'Boiling flesh!',
        effect: 'Roll twice as many damage dice as normal and if the creature is wearing armor its AC modifier is reduced by 1 until it can be repaired (for 1/4th the price of new armor of the same type) or cleaned (if the armor is magical). If the creature is not wearing armor, roll on the minor injury chart.',
        injuryChart: 'minor'
      },
      {
        range: [14, 16],
        title: 'Horrific mutilation!',
        effect: 'Roll twice as many damage dice as normal and roll on the minor injury chart. Additionally, the creature is disfigured. While disfigured the creature has disadvantage on all Charisma ability checks except Charisma (Intimidation). Being disfigured can be removed with the spell greater restoration.',
        injuryChart: 'minor'
      },
      {
        range: [17, 18],
        title: 'Caustic trauma!',
        effect: 'Deal the maximum amount of damage from your normal damage dice then roll your damage dice and add that result. If the creature is wearing armor, roll on the minor injury chart and its AC modifier is reduced by 2 until it can be repaired (for half the price of new armor of the same type) or cleaned (if the armor is magical). If the creature is not wearing armor, roll on the major injury chart.',
        injuryChart: 'minor'
      },
      {
        range: [19, 19],
        title: 'Vitriolic!',
        effect: 'Deal twice the maximum result of your damage dice and roll on the major injury chart.',
        injuryChart: 'major'
      },
      {
        range: [20, 20],
        title: 'Acid bath!',
        effect: 'Deal twice the maximum result of your damage dice. If the creature is wearing armor, the armor is destroyed (if non-magical) or rendered useless until cleaned during a long rest (if magical) and roll on the major injury chart. If the creature is not wearing armor, roll on the major injury chart and the creature is disfigured. While disfigured the creature has disadvantage on all Charisma ability checks except Charisma (Intimidation). Being disfigured can be removed with the spell greater restoration.',
        injuryChart: 'major'
      }
    ]
  },

  cold: {
    id: 'cold',
    name: 'Cold',
    category: 'magic',
    description: 'Numbing frost and subzero ice freezing blood, paralyzing targets, and encasing victims in solid ice.',
    color: '#38bdf8',
    accentClass: 'text-sky-300 border-sky-500/40 bg-sky-500/10',
    outcomes: [
      {
        range: [1, 1],
        title: 'You call that a crit?',
        effect: 'Roll damage as normal.'
      },
      {
        range: [2, 3],
        title: 'Chills!',
        effect: 'Roll damage as normal and the creature may only move half its movement speed on its next turn.'
      },
      {
        range: [4, 6],
        title: 'Good hit!',
        effect: 'Do not roll your damage dice, instead deal the maximum result possible with those dice.'
      },
      {
        range: [7, 8],
        title: 'Frosty!',
        effect: "Roll your damage as normal and the creature's movement speed is 0 until the end of its next turn."
      },
      {
        range: [9, 11],
        title: 'Great hit!',
        effect: 'Roll twice as many damage dice as normal.'
      },
      {
        range: [12, 13],
        title: 'Freezing!',
        effect: 'Roll twice as many damage dice as normal and the creature is paralyzed until the end of its next turn.'
      },
      {
        range: [14, 16],
        title: 'Frozen!',
        effect: 'Roll twice as many damage dice as normal and the creature is paralyzed until the end of its next turn. If the creature takes damage before the end of its next turn, roll on the minor injury chart.',
        injuryChart: 'minor'
      },
      {
        range: [17, 18],
        title: 'Ice block!',
        effect: 'Deal the maximum amount of damage from your normal damage dice then roll your damage dice and add that result. The creature is paralyzed until the end of its next turn and rolls on the minor injury chart.',
        injuryChart: 'minor'
      },
      {
        range: [19, 19],
        title: 'Glacial!',
        effect: 'Deal twice the maximum result of your damage dice and roll on the major injury chart.',
        injuryChart: 'major'
      },
      {
        range: [20, 20],
        title: 'Subzero!',
        effect: 'Deal twice the maximum result of your damage dice, roll on the major injury chart, and the creature is paralyzed for the next minute. The creature may attempt a saving throw at the end of each of its turns (DC 16) to end this effect. If it fails this saving throw three times it is frozen solid and becomes petrified (frozen solid in a block of ice rather than turned to stone).',
        injuryChart: 'major'
      }
    ]
  },

  fire: {
    id: 'fire',
    name: 'Fire',
    category: 'magic',
    description: 'Blazing infernos igniting clothing and flesh, stripping fire resistance, and setting creatures ablaze.',
    color: '#f97316',
    accentClass: 'text-orange-400 border-orange-500/40 bg-orange-500/10',
    outcomes: [
      {
        range: [1, 1],
        title: 'You call that a crit?',
        effect: 'Roll damage as normal.'
      },
      {
        range: [2, 3],
        title: 'Heat wave!',
        effect: 'Roll damage as normal and attack rolls for attacks that deal fire damage have advantage when made against the creature until the end of its next turn.'
      },
      {
        range: [4, 6],
        title: 'Good hit!',
        effect: 'Do not roll your damage dice, instead deal the maximum result possible with those dice.'
      },
      {
        range: [7, 8],
        title: 'Hot flash!',
        effect: 'Roll your damage as normal and the creature is on fire. While the creature is on fire it takes 2d4 fire damage at the start of each of its turns. The creature can end this condition by dropping prone and using 5 feet of movement to roll on the ground.'
      },
      {
        range: [9, 11],
        title: 'Great hit!',
        effect: 'Roll twice as many damage dice as normal.'
      },
      {
        range: [12, 13],
        title: 'Ablaze!',
        effect: 'Roll twice as many damage dice as normal and the creature is on fire. While the creature is on fire it takes 2d6 fire damage at the start of each of its turns. The creature can end this condition by dropping prone and using 5 feet of movement to roll on the ground.'
      },
      {
        range: [14, 16],
        title: 'Burnt to a crisp!',
        effect: 'Roll twice as many damage dice as normal and the creature is charred. If the creature has resistance to fire, it loses that resistance. If the creature does not have resistance to fire, it gains vulnerability to fire. Both of these effects can be ended the same as a minor injury.'
      },
      {
        range: [17, 18],
        title: 'Hellfire!',
        effect: 'Deal the maximum amount of damage from your normal damage dice then roll your damage dice and add that result then roll on the minor injury chart. Additionally, the creature is on fire. While the creature is on fire it takes 2d6 fire damage at the start of each of its turns. The creature can end this condition by dropping prone and using 5 feet of movement to roll on the ground.',
        injuryChart: 'minor'
      },
      {
        range: [19, 19],
        title: 'Combustion!',
        effect: 'Deal twice the maximum result of your damage dice and roll on the major injury chart.',
        injuryChart: 'major'
      },
      {
        range: [20, 20],
        title: 'Inferno!',
        effect: 'Deal twice the maximum result of your damage dice and roll on the major injury chart. Additionally, the creature is on fire. While the creature is on fire it takes 2d8 fire damage at the start of each of its turns. The creature can end this condition by dropping prone and using 5 feet of movement to roll on the ground.',
        injuryChart: 'major'
      }
    ]
  },

  force: {
    id: 'force',
    name: 'Force',
    category: 'magic',
    description: 'Pure concentrated magical energy leaving targets spellbound, vulnerable to spells, and warped.',
    color: '#a855f7',
    accentClass: 'text-purple-400 border-purple-500/40 bg-purple-500/10',
    outcomes: [
      {
        range: [1, 1],
        title: 'You call that a crit?',
        effect: 'Roll damage as normal.'
      },
      {
        range: [2, 3],
        title: 'Spellstruck!',
        effect: 'Roll damage as normal and the creature has disadvantage on saving throws against spells until the end of its next turn.'
      },
      {
        range: [4, 6],
        title: 'Good hit!',
        effect: 'Do not roll your damage dice, instead deal the maximum result possible with those dice.'
      },
      {
        range: [7, 8],
        title: 'Eldritch incandescence!',
        effect: 'Roll your damage as normal and spell attack rolls against the creature have advantage until the end of its next turn.'
      },
      {
        range: [9, 11],
        title: 'Great hit!',
        effect: 'Roll twice as many damage dice as normal.'
      },
      {
        range: [12, 13],
        title: 'Bewitching blow!',
        effect: 'Roll twice as many damage dice as normal and the creature is spellbound until the end of its next turn. While spellbound it makes saving throws against spells with disadvantage and spell attack rolls against it have advantage.'
      },
      {
        range: [14, 16],
        title: 'Mystic magnet!',
        effect: 'Roll twice as many damage dice as normal and the creature is spellbound for the next minute. While spellbound it makes saving throws against spells with disadvantage and spell attack rolls against it have advantage. At the end of each of the creature’s turns it can make an Intelligence saving throw (DC 14) to end this effect.'
      },
      {
        range: [17, 18],
        title: 'Ensorcelled!',
        effect: 'Deal the maximum amount of damage from your normal damage dice then roll your damage dice and add that result then roll on the minor injury chart. Additionally, the creature is spellbound for the next minute. While spellbound it makes saving throws against spells with disadvantage and spell attack rolls against it have advantage. At the end of each of the creature’s turns it can make an Intelligence saving throw (DC 16) to end this effect.',
        injuryChart: 'minor'
      },
      {
        range: [19, 19],
        title: 'Arcane injury!',
        effect: 'Deal twice the maximum result of your damage dice and roll on the major injury chart.',
        injuryChart: 'major'
      },
      {
        range: [20, 20],
        title: 'Magically mauled!',
        effect: 'Deal twice the maximum result of your damage dice and roll on the major injury chart. Additionally, the creature is spellbound for the next minute. While spellbound it makes saving throws against spells with disadvantage and spell attack rolls against it have advantage. At the end of each of the creature’s turns it can make an Intelligence saving throw (DC 18) to end this effect.',
        injuryChart: 'major'
      }
    ]
  },

  lightning: {
    id: 'lightning',
    name: 'Lightning',
    category: 'magic',
    description: 'Violent electricity shocking reflexes, arcing into nearby allies, and electrocuting metallic armor.',
    color: '#eab308',
    accentClass: 'text-yellow-300 border-yellow-500/40 bg-yellow-500/10',
    outcomes: [
      {
        range: [1, 1],
        title: 'You call that a crit?',
        effect: 'Roll damage as normal.'
      },
      {
        range: [2, 3],
        title: 'Shocking!',
        effect: 'Roll damage as normal and the creature cannot use reactions until the end of its next turn.'
      },
      {
        range: [4, 6],
        title: 'Good hit!',
        effect: 'Do not roll your damage dice, instead deal the maximum result possible with those dice.'
      },
      {
        range: [7, 8],
        title: 'Sparks fly!',
        effect: 'Roll your damage as normal and you may choose one other creature within 15 ft. of the victim. That creature must succeed on a Dexterity saving throw (DC 14) or take half as much damage.'
      },
      {
        range: [9, 11],
        title: 'Great hit!',
        effect: 'Roll twice as many damage dice as normal.'
      },
      {
        range: [12, 13],
        title: 'Electric arc!',
        effect: 'Roll twice as many damage dice as normal and you may choose one other creature within 15 ft. of the victim. That creature must succeed on a Dexterity saving throw (DC 18) or take half as much damage.'
      },
      {
        range: [14, 16],
        title: 'Fulminate!',
        effect: 'Roll twice as many damage dice as normal and roll on the minor injury chart. If the creature is wearing metal armor roll on the major injury chart instead.',
        injuryChart: 'minor'
      },
      {
        range: [17, 18],
        title: 'Lit up!',
        effect: 'Deal the maximum amount of damage from your normal damage dice then roll your damage dice and add that result. The creature and each creature you choose within 15 ft. of it cannot take reactions until the end of their next turn. Then roll on the minor injury chart.',
        injuryChart: 'minor'
      },
      {
        range: [19, 19],
        title: 'Electrocuted!',
        effect: 'Deal twice the maximum result of your damage dice and roll on the major injury chart.',
        injuryChart: 'major'
      },
      {
        range: [20, 20],
        title: 'Lightning rod!',
        effect: 'Deal twice the maximum result of your damage dice and you may choose one other creature within 15 ft. of the victim. That creature must succeed on a Dexterity saving throw (DC 20) or take half as much damage. Then roll on the major injury chart.',
        injuryChart: 'major'
      }
    ]
  },

  necrotic: {
    id: 'necrotic',
    name: 'Necrotic',
    category: 'magic',
    description: 'Withering dark energy draining vitality, halting HP regeneration, and permanently reducing max HP.',
    color: '#64748b',
    accentClass: 'text-slate-300 border-slate-500/40 bg-slate-500/10',
    outcomes: [
      {
        range: [1, 1],
        title: 'You call that a crit?',
        effect: 'Roll damage as normal.'
      },
      {
        range: [2, 3],
        title: 'Spoil!',
        effect: 'Roll damage as normal and the creature cannot regain hit points until the end of its next turn.'
      },
      {
        range: [4, 6],
        title: 'Good hit!',
        effect: 'Do not roll your damage dice, instead deal the maximum result possible with those dice.'
      },
      {
        range: [7, 8],
        title: 'Fester!',
        effect: 'Roll your damage as normal and the creature’s maximum hit points are reduced by the same amount.'
      },
      {
        range: [9, 11],
        title: 'Great hit!',
        effect: 'Roll twice as many damage dice as normal.'
      },
      {
        range: [12, 13],
        title: 'Decay!',
        effect: 'Roll twice as many damage dice as normal and the creature’s maximum hit points are reduced by the same amount.'
      },
      {
        range: [14, 16],
        title: 'Rot!',
        effect: 'Roll twice as many damage dice as normal and the creature cannot regain hit points for the next minute. It may make a saving throw (DC 16) at the end of each of its turns to end this effect.'
      },
      {
        range: [17, 18],
        title: 'Blight!',
        effect: 'Deal the maximum amount of damage from your normal damage dice then roll your damage dice and add that result. The creature’s maximum hit points are reduced by the same amount. Then roll on the minor injury chart.',
        injuryChart: 'minor'
      },
      {
        range: [19, 19],
        title: 'Atrophy!',
        effect: 'Deal twice the maximum result of your damage dice and roll on the major injury chart.',
        injuryChart: 'major'
      },
      {
        range: [20, 20],
        title: 'Putrefy!',
        effect: 'Deal twice the maximum result of your damage dice, the creature’s maximum hit points are reduced by the same amount, and the creature cannot regain hit points until the end of its next turn. Then roll on the major injury chart.',
        injuryChart: 'major'
      }
    ]
  },

  poison: {
    id: 'poison',
    name: 'Poison',
    category: 'magic',
    description: 'Virulent venom inducing debilitating nausea, systemic weakness, and biological collapse.',
    color: '#10b981',
    accentClass: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
    outcomes: [
      {
        range: [1, 1],
        title: 'You call that a crit?',
        effect: 'Roll damage as normal.'
      },
      {
        range: [2, 3],
        title: 'Nauseous!',
        effect: 'Roll damage as normal and the creature has disadvantage on its next ability check, attack roll, or saving throw.'
      },
      {
        range: [4, 6],
        title: 'Good hit!',
        effect: 'Do not roll your damage dice, instead deal the maximum result possible with those dice.'
      },
      {
        range: [7, 8],
        title: 'Sickened!',
        effect: 'Roll your damage as normal and the creature has disadvantage on all ability checks, attack rolls, and saving throws until the end of its next turn.'
      },
      {
        range: [9, 11],
        title: 'Great hit!',
        effect: 'Roll twice as many damage dice as normal.'
      },
      {
        range: [12, 13],
        title: 'Poisoned!',
        effect: 'Roll twice as many damage dice as normal and the creature is poisoned for the next minute. The creature may attempt a saving throw at the end of each of its turns (DC 12) to end this effect.'
      },
      {
        range: [14, 16],
        title: 'Contaminated!',
        effect: 'Roll twice as many damage dice as normal and the creature is poisoned for the next minute. The creature may attempt a saving throw at the end of each of its turns (DC 16) to end this effect.'
      },
      {
        range: [17, 18],
        title: 'Toxic shock!',
        effect: 'Deal the maximum amount of damage from your normal damage dice then roll your damage dice and add that result. Then roll on the minor injury chart and the creature is poisoned for the next minute. The creature may attempt a saving throw at the end of each of its turns (DC 12) to end this effect.',
        injuryChart: 'minor'
      },
      {
        range: [19, 19],
        title: 'System failure!',
        effect: 'Deal twice the maximum result of your damage dice and roll on the major injury chart.',
        injuryChart: 'major'
      },
      {
        range: [20, 20],
        title: 'Biological breakdown!',
        effect: 'Deal twice the maximum result of your damage dice, roll on the major injury chart, and the creature is poisoned for the next minute. The creature may attempt a saving throw at the end of each of its turns (DC 16) to end this effect.',
        injuryChart: 'major'
      }
    ]
  },

  psychic: {
    id: 'psychic',
    name: 'Psychic',
    category: 'magic',
    description: 'Mental onslaughts confusing thought, seizing control of movement or actions, and triggering insanity.',
    color: '#ec4899',
    accentClass: 'text-pink-400 border-pink-500/40 bg-pink-500/10',
    outcomes: [
      {
        range: [1, 1],
        title: 'You call that a crit?',
        effect: 'Roll damage as normal.'
      },
      {
        range: [2, 3],
        title: 'Disoriented!',
        effect: 'Roll your damage dice as normal and you control the creature’s movement on its next turn.'
      },
      {
        range: [4, 6],
        title: 'Confused!',
        effect: 'Roll your damage dice as normal and the creature cannot differentiate friend from foe until the end of its next turn.'
      },
      {
        range: [7, 8],
        title: 'Good hit!',
        effect: 'Do not roll your damage dice, instead deal the maximum result possible with those dice.'
      },
      {
        range: [9, 11],
        title: 'Great hit!',
        effect: 'Roll twice as many damage dice as normal.'
      },
      {
        range: [12, 13],
        title: 'Dominated!',
        effect: 'Roll twice as many damage dice as normal and you control the creature’s action on its next turn.'
      },
      {
        range: [14, 16],
        title: 'Psychological fracture!',
        effect: 'Roll twice as many damage dice as normal and roll on the Insanity chart with disadvantage.',
        injuryChart: 'insanity'
      },
      {
        range: [17, 18],
        title: 'Psychological break!',
        effect: 'Deal the maximum amount of damage from your normal damage dice then roll your damage dice and add that result. Then roll on the Insanity chart.',
        injuryChart: 'insanity'
      },
      {
        range: [19, 19],
        title: 'Madness!',
        effect: 'Deal twice the maximum result of your damage dice and roll on the Insanity chart.',
        injuryChart: 'insanity'
      },
      {
        range: [20, 20],
        title: 'Mind melt!',
        effect: 'Deal twice the maximum result of your damage dice and roll on the Insanity chart with advantage.',
        injuryChart: 'insanity'
      }
    ]
  },

  radiant: {
    id: 'radiant',
    name: 'Radiant',
    category: 'magic',
    description: 'Heavenly radiance terrifying foes, illuminating targets, and inflicting divine smites.',
    color: '#facc15',
    accentClass: 'text-amber-200 border-amber-300/40 bg-amber-300/10',
    outcomes: [
      {
        range: [1, 1],
        title: 'You call that a crit?',
        effect: 'Roll damage as normal.'
      },
      {
        range: [2, 3],
        title: 'Dazzled!',
        effect: 'Roll damage as normal and the creature cannot willingly move closer to you until the end of its next turn.'
      },
      {
        range: [4, 6],
        title: 'Good hit!',
        effect: 'Do not roll your damage dice, instead deal the maximum result possible with those dice.'
      },
      {
        range: [7, 8],
        title: 'Disheartening blast!',
        effect: 'Roll your damage as normal and the creature is frightened until the end of its next turn.'
      },
      {
        range: [9, 11],
        title: 'Great hit!',
        effect: 'Roll twice as many damage dice as normal.'
      },
      {
        range: [12, 13],
        title: 'Awed!',
        effect: 'Roll twice as many damage dice as normal and the creature is frightened until the end of its next turn.'
      },
      {
        range: [14, 16],
        title: 'Holy terror!',
        effect: 'Roll twice as many damage dice as normal and roll on the minor injury chart. Additionally, the creature is frightened for the next minute. It can make a Wisdom saving throw (DC 16) at the end of each of its turns to end this effect.',
        injuryChart: 'minor'
      },
      {
        range: [17, 18],
        title: 'Righteous mark!',
        effect: 'Deal the maximum amount of damage for your normal damage dice then roll your damage dice and add that result, then roll on the minor injury chart. Additionally, the creature glows for the next minute. While glowing it produces bright light up 10 feet and dim light up to 30 feet and all successful attacks against the creature deal an additional 1d4 radiant damage.',
        injuryChart: 'minor'
      },
      {
        range: [19, 19],
        title: 'Wrath of the gods!',
        effect: 'Deal twice the maximum result of your damage dice and roll on the major injury chart.',
        injuryChart: 'major'
      },
      {
        range: [20, 20],
        title: 'Smote!',
        effect: 'Deal twice the maximum result of your damage dice and roll on the major injury chart. Additionally, the creature glows for the next minute. While glowing it produces bright light up 10 feet and dim light up to 30 feet and all successful attacks against the creature deal an additional 1d6 radiant damage.',
        injuryChart: 'major'
      }
    ]
  },

  thunder: {
    id: 'thunder',
    name: 'Thunder',
    category: 'magic',
    description: 'Deafening acoustic blasts rupturing eardrums, stunning targets, and generating sonic shockwaves.',
    color: '#0284c7',
    accentClass: 'text-sky-400 border-sky-500/40 bg-sky-500/10',
    outcomes: [
      {
        range: [1, 1],
        title: 'You call that a crit?',
        effect: 'Roll damage as normal.'
      },
      {
        range: [2, 3],
        title: 'Boom!',
        effect: 'Roll damage as normal and the creature is deafened until the end of its next turn.'
      },
      {
        range: [4, 6],
        title: 'Good hit!',
        effect: 'Do not roll your damage dice, instead deal the maximum result possible with those dice.'
      },
      {
        range: [7, 8],
        title: 'Ka-boom!',
        effect: 'Roll your damage as normal and the creature is deafened for one minute.'
      },
      {
        range: [9, 11],
        title: 'Great hit!',
        effect: 'Roll twice as many damage dice as normal.'
      },
      {
        range: [12, 13],
        title: 'Thunder clap!',
        effect: 'Roll twice as many damage dice as normal and the creature is stunned until the start of its next turn and deafened for one minute.'
      },
      {
        range: [14, 16],
        title: 'Burst ear drums!',
        effect: 'Roll twice as many damage dice as normal and the creature is deafened permanently. Then roll on the minor injury chart.',
        injuryChart: 'minor'
      },
      {
        range: [17, 18],
        title: 'Concussive blast!',
        effect: 'Deal the maximum amount of damage from your normal damage dice then roll your damage dice and add that result. The creature stunned until the end of its next turn and deafened permanently. Then roll on the minor injury chart.',
        injuryChart: 'minor'
      },
      {
        range: [19, 19],
        title: 'Wall of sound!',
        effect: 'Deal twice the maximum result of your damage dice and roll on the major injury chart.',
        injuryChart: 'major'
      },
      {
        range: [20, 20],
        title: 'Sonic salvo!',
        effect: 'Deal twice the maximum result of your damage dice, the creature is deafened permanently, and stunned until the end of its next round. Then roll on the major injury chart.',
        injuryChart: 'major'
      }
    ]
  }
};

export const MINOR_INJURY_CHART: InjuryOutcome[] = [
  {
    range: [1, 3],
    title: 'Injured leg!',
    effect: 'The creature’s movement speed is reduced by 10 ft.',
    healingNotes: 'Healed by lesser restoration or the recuperating downtime activity (PHB p. 187).'
  },
  {
    range: [4, 8],
    title: 'Injured arm!',
    effect: 'Randomly determine one of the creature’s arms. That arm cannot be used to hold a shield and the creature has disadvantage on any rolls involving the use of that arm.',
    healingNotes: 'Healed by lesser restoration or the recuperating downtime activity.'
  },
  {
    range: [9, 11],
    title: 'Multiple injuries!',
    effect: 'The creature’s maximum hit points are reduced by an amount equivalent to half of the damage dealt by the attack.',
    healingNotes: 'Healed by lesser restoration or the recuperating downtime activity.'
  },
  {
    range: [12, 16],
    title: 'Badly beaten!',
    effect: 'The creature has disadvantage on Constitution saving throws.',
    healingNotes: 'Healed by lesser restoration or the recuperating downtime activity.'
  },
  {
    range: [17, 19],
    title: 'Ringing blow!',
    effect: 'The creature is stunned until the end of its next turn and deafened until it completes the recuperate downtime activity.',
    healingNotes: 'Deafness requires the recuperate downtime activity or lesser restoration.'
  },
  {
    range: [20, 20],
    title: 'Blow to the head!',
    effect: 'The creature is unconscious for 2d12 hours.',
    healingNotes: 'Resolves after 2d12 hours have elapsed or via lesser restoration.'
  }
];

export const MAJOR_INJURY_CHART: InjuryOutcome[] = [
  {
    range: [1, 3],
    title: 'Crippled leg!',
    effect: 'The creature’s movement speed is reduced by 10 feet and it has disadvantage on Dexterity saving throws.',
    healingNotes: 'Requires greater restoration.'
  },
  {
    range: [4, 8],
    title: 'Crippled arm!',
    effect: 'Randomly determine one of the creature’s arms. That arm cannot be used to hold an item and any ability check requiring that arm automatically fails or has disadvantage (DM’s choice).',
    healingNotes: 'Requires greater restoration.'
  },
  {
    range: [9, 11],
    title: 'Severely wounded!',
    effect: 'The creature’s maximum hit points are reduced by an amount equivalent to the damage dealt by the attack.',
    healingNotes: 'Requires greater restoration.'
  },
  {
    range: [12, 16],
    title: 'Edge of death!',
    effect: 'The creature has disadvantage on Constitution and death saving throws.',
    healingNotes: 'Requires greater restoration.'
  },
  {
    range: [17, 19],
    title: 'My eyes!',
    effect: 'The creature is blinded.',
    healingNotes: 'Requires greater restoration or regenerate.'
  },
  {
    range: [20, 20],
    title: 'Decapitated!',
    effect: 'The creature is dead.',
    healingNotes: 'Fatal. Cannot be healed with greater restoration (requires resurrection magic).'
  }
];

export const INSANITY_CHART: InsanityOutcome[] = [
  {
    d20: 1,
    title: 'Synesthesia',
    effect: 'You can hear colors, smell sounds, or taste textures. Regardless of the specific manifestation, you have disadvantage on all Perception and Investigation skill checks.'
  },
  {
    d20: 2,
    title: 'Kleptomania',
    effect: 'Once per day when you are in a personal residence or marketplace, the DM can call on you to succeed on a Wisdom saving throw (DC 12) or attempt to steal an item of insignificant practical and monetary value.',
    dc: 12,
    stat: 'Wisdom'
  },
  {
    d20: 3,
    title: 'Paranoia',
    effect: 'Once per day following an interaction with another creature (including other PCs) the DM can call on you to succeed on a Wisdom saving throw (DC 12) or you suspect that creature is secretly plotting against you.',
    dc: 12,
    stat: 'Wisdom'
  },
  {
    d20: 4,
    title: 'Obsession',
    effect: 'Choose a person or personal interest you are obsessed with. Once per day, when you are presented with an opportunity to interact with or learn more about the subject of your obsession the DM can call on you to succeed on a Wisdom saving throw (DC 14) or ignore everything else to obsess over the object of your fascination.',
    dc: 14,
    stat: 'Wisdom'
  },
  {
    d20: 5,
    title: 'Addiction',
    effect: 'Choose a behavior or substance you have used. Once per day, when you are presented with an opportunity to do the behavior or use the substance the DM can call on you to succeed on a Wisdom saving throw (DC 14) or ignore everything else to indulge in your vice.',
    dc: 14,
    stat: 'Wisdom'
  },
  {
    d20: 6,
    title: 'Odd Thinking',
    effect: 'Once per day when you hear a rational explanation for an event or occurrence, your DM may call on you to succeed on a Wisdom saving throw (DC 12) or you reject the rational explanation for a conspiratorial or fantastical explanation.',
    dc: 12,
    stat: 'Wisdom'
  },
  {
    d20: 7,
    title: 'Narcissism',
    effect: 'When you take an action or series of action that doesn’t directly benefit you, you must pass a Wisdom saving throw (DC 11) or you can’t take that action / series of actions. If any self-sacrifice on your part would be required the DC of the saving throw is increased to 16.',
    dc: 11,
    stat: 'Wisdom'
  },
  {
    d20: 8,
    title: 'Delusional',
    effect: 'When you gain this insanity the DM will tell you a belief that you have. No matter what evidence is presented to the contrary so long as you have this insanity you cannot be persuaded that this belief is not true.'
  },
  {
    d20: 9,
    title: 'Pica',
    effect: 'Once per day the DM can call on you to pass a Wisdom saving throw (DC 14) or immediately eat one non-food object (such as dirt, napkins, or a small piece of jewelry) of the DM’s choice.',
    dc: 14,
    stat: 'Wisdom'
  },
  {
    d20: 10,
    title: 'Retrograde amnesia',
    effect: 'You forget everything about your personal life prior to the moment you received this insanity.'
  },
  {
    d20: 11,
    title: 'Overwhelmed',
    effect: 'If you do not have immunity or resistance to psychic damage, you gain vulnerability to psychic damage. If you have resistance to psychic damage, you lose it. If you have immunity to psychic damage, you lose it but gain resistance to psychic damage.'
  },
  {
    d20: 12,
    title: 'Anterograde amnesia',
    effect: 'Whenever you try to recall a fact you learned since you received this insanity, make a Wisdom saving throw (DC 12). If you fail you cannot recall the fact.',
    dc: 12,
    stat: 'Wisdom'
  },
  {
    d20: 13,
    title: 'Dependence',
    effect: 'You must pass a Wisdom saving throw (DC 14) to take an action that one or more of your allies disapprove of.',
    dc: 14,
    stat: 'Wisdom'
  },
  {
    d20: 14,
    title: 'Anxious',
    effect: 'You have disadvantage on saving throws against being frightened. Additionally, once per day the DM can call on you to succeed a Wisdom saving throw (DC 14) or be frightened by a creature of the DM’s choosing for the next minute.',
    dc: 14,
    stat: 'Wisdom'
  },
  {
    d20: 15,
    title: 'Mute',
    effect: 'Whenever you wish to speak allowed (including casting a spell that has verbal components) you must succeed on a Wisdom saving throw (DC 13) to do so.',
    dc: 13,
    stat: 'Wisdom'
  },
  {
    d20: 16,
    title: 'Narcolepsy',
    effect: 'You have disadvantage on saving throws against sleeping or unconsciousness. Once per day the DM may call on you to succeed on a Constitution saving throw (DC 12) or fall unconscious for one minute or until you take damage or another creature spends their action trying to rouse you.',
    dc: 12,
    stat: 'Constitution'
  },
  {
    d20: 17,
    title: 'Insomnia',
    effect: 'You cannot take long rests and your short rests take 8 hours to complete.'
  },
  {
    d20: 18,
    title: 'Homicidal',
    effect: 'After each long rest you must pass a Wisdom saving throw (DC 14) or be overcome with the urge to end the life of a humanoid creature and you cannot benefit from another long rest until you do so.',
    dc: 14,
    stat: 'Wisdom'
  },
  {
    d20: 19,
    title: 'Suicidal',
    effect: 'After each long rest you must pass a Wisdom saving throw (DC 12) or make an attempt to end your own life.',
    dc: 12,
    stat: 'Wisdom'
  },
  {
    d20: 20,
    title: 'Catatonia',
    effect: 'You are unconscious for 10d10 years.'
  }
];

export const CRITICAL_HITS_RULES_SUMMARY = {
  title: 'Critical Hits Revisited (Benjamin Huffman)',
  overview:
    'Optional rules that expand the scope of critical hits in D&D 5e based on the attack’s damage type, increasing uncertainty, suspense, and the consequence of combat (including injury, death, and dismemberment).',
  coreMechanics: [
    'When you land a critical hit on a creature, instead of rolling damage dice twice and adding them together, roll a d20 and use the corresponding result on the critical hit chart determined by the damage type of your attack.',
    'When scoring a critical hit with an attack that deals multiple damage types, choose one of those damage types and roll on that critical chart.',
    'Half-Orc Savage Attacks and Barbarian Brutal Critical features continue to function as written (adding extra weapon damage dice).',
    'Minor injuries heal via Lesser Restoration or the Recuperating downtime activity (PHB p. 187).',
    'Major injuries and Insanities do not heal on their own and require Greater Restoration (except Decapitation, which is fatal).'
  ],
  selectiveUseOption:
    'To avoid sudden player character death against common foes, normal 5e critical hit rules can be used for low-threat monsters, reserving the Critical Hit tables for player characters and encounters of dramatic narrative importance.'
};
