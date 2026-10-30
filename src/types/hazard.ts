// src/types/hazard.ts
// Definition of environmental hazards and unsafe zones for AI navigation and campaign play

export type HazardType =
  | 'lava'
  | 'chasm_fall'
  | 'acid_pool'
  | 'spike_pit'
  | 'deep_water'
  | 'poison_cloud'
  | 'difficult_ground'
  | 'custom';

export type HazardSeverity = 'lethal' | 'dangerous' | 'moderate' | 'difficult';

export interface HazardBypassRules {
  requiresFlight?: boolean;       // Flying or hovering bypasses ground hazards
  minElevationFt?: number;        // Elevation > 0 avoids ground pits
  immuneDamageTypes?: string[];   // e.g. ['fire'] ignores lava damage
  immuneCreatureTypes?: string[]; // e.g. ['undead'] ignores poison cloud
  requiresSpiderClimb?: boolean;  // Spider climb ignores pit/web terrain
}

export interface HazardZone {
  id: string;
  name: string;
  type: HazardType;
  severity: HazardSeverity;
  bounds: {
    x: number; // percentage (0 - 100)
    y: number; // percentage (0 - 100)
    width: number;
    height: number;
  };
  polygonPoints?: number[]; // percentage coordinates [x1, y1, x2, y2, ...]
  triggerTiming?: 'on_enter' | 'on_end_turn' | 'on_start_turn';
  damageFormula?: string;   // e.g. "10d10 fire", "4d6 bludgeoning"
  fallDepthFt?: number;     // e.g. 40 ft -> 4d6 bludgeoning + prone
  saveDc?: number;          // e.g. DC 15
  saveAbility?: 'dex' | 'con' | 'str';
  conditionInflicted?: string; // e.g. "prone", "burning", "poisoned", "restrained"
  bypassRules?: HazardBypassRules;
  color?: string;           // Visual border/fill accent
  visibleToPlayers?: boolean;
}

export interface HazardPresetDefinition {
  type: HazardType;
  label: string;
  severity: HazardSeverity;
  defaultDamageFormula: string;
  defaultFallDepthFt?: number;
  defaultSaveDc?: number;
  defaultSaveAbility?: 'dex' | 'con' | 'str';
  defaultCondition?: string;
  color: string;
  glyph: string;
  bypassRules: HazardBypassRules;
  description: string;
}

export const HAZARD_PRESETS: Record<HazardType, HazardPresetDefinition> = {
  lava: {
    type: 'lava',
    label: 'Lava / Magma Pit',
    severity: 'lethal',
    defaultDamageFormula: '10d10 fire',
    defaultCondition: 'burning',
    color: '#ef4444',
    glyph: '🔥',
    bypassRules: {
      requiresFlight: true,
      immuneDamageTypes: ['fire']
    },
    description: 'Molten magma causing lethal 10d10 fire damage. Impassable for ground creatures lacking fire immunity.'
  },
  chasm_fall: {
    type: 'chasm_fall',
    label: 'Chasm / Pit Fall',
    severity: 'lethal',
    defaultDamageFormula: '4d6 bludgeoning',
    defaultFallDepthFt: 40,
    defaultSaveDc: 15,
    defaultSaveAbility: 'dex',
    defaultCondition: 'prone',
    color: '#6366f1',
    glyph: '🕳️',
    bypassRules: {
      requiresFlight: true
    },
    description: 'A 40 ft. drop causing 4d6 fall damage and prone condition. Impassable for non-flying creatures.'
  },
  acid_pool: {
    type: 'acid_pool',
    label: 'Acid Pool',
    severity: 'dangerous',
    defaultDamageFormula: '4d6 acid',
    defaultSaveDc: 14,
    defaultSaveAbility: 'dex',
    color: '#84cc16',
    glyph: '🧪',
    bypassRules: {
      requiresFlight: true,
      immuneDamageTypes: ['acid']
    },
    description: 'Corrosive chemical pool causing 4d6 acid damage. AI will seek paths around unless cornered.'
  },
  spike_pit: {
    type: 'spike_pit',
    label: 'Spike Pit / Caltrops',
    severity: 'moderate',
    defaultDamageFormula: '2d10 piercing',
    defaultSaveDc: 13,
    defaultSaveAbility: 'dex',
    defaultCondition: 'half_speed',
    color: '#eab308',
    glyph: '⚔️',
    bypassRules: {
      requiresFlight: true
    },
    description: 'Iron spikes inflicting 2d10 piercing damage and reducing movement speed.'
  },
  poison_cloud: {
    type: 'poison_cloud',
    label: 'Poison Gas / Spores',
    severity: 'moderate',
    defaultDamageFormula: '2d8 poison',
    defaultSaveDc: 13,
    defaultSaveAbility: 'con',
    defaultCondition: 'poisoned',
    color: '#a855f7',
    glyph: '☁️',
    bypassRules: {
      immuneDamageTypes: ['poison'],
      immuneCreatureTypes: ['undead', 'construct']
    },
    description: 'Noxious fumes requiring a DC 13 Constitution save against 2d8 poison damage and poisoned condition.'
  },
  deep_water: {
    type: 'deep_water',
    label: 'Deep Water / Current',
    severity: 'difficult',
    defaultDamageFormula: '',
    defaultSaveDc: 12,
    defaultSaveAbility: 'str',
    defaultCondition: 'swim_cost',
    color: '#0ea5e9',
    glyph: '🌊',
    bypassRules: {
      requiresFlight: true
    },
    description: 'Submerged trench or swift current requiring swimming speed or Athletics check.'
  },
  difficult_ground: {
    type: 'difficult_ground',
    label: 'Difficult Terrain',
    severity: 'difficult',
    defaultDamageFormula: '',
    defaultCondition: 'half_speed',
    color: '#78716c',
    glyph: '🪨',
    bypassRules: {
      requiresFlight: true
    },
    description: 'Rubble, thick mud, or loose gravel costing 2x movement.'
  },
  custom: {
    type: 'custom',
    label: 'Custom Hazard',
    severity: 'dangerous',
    defaultDamageFormula: '3d6 force',
    defaultSaveDc: 14,
    defaultSaveAbility: 'dex',
    color: '#ec4899',
    glyph: '⚠️',
    bypassRules: {
      requiresFlight: true
    },
    description: 'Custom environmental hazard configured with unique parameters.'
  }
};
