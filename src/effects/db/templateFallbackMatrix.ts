// src/effects/db/templateFallbackMatrix.ts
// Automatic synthesis of JB2A elemental templates for unmapped 5e spells

import { Jb2aAssetDefinition, SpellSchool, EffectParadigm } from '../types/effect';
import { JB2A_REGISTRY } from './jb2aRegistry';

export interface SpellSynthesisContext {
  spellName: string;
  school?: string;
  damageType?: string;
  shape?: 'circle' | 'cone' | 'line' | 'ray' | 'aura';
  sizeFt?: number;
}

export function synthesizeElementalTemplate(ctx: SpellSynthesisContext): Jb2aAssetDefinition {
  const normDamage = (ctx.damageType || '').toLowerCase();
  const normSchool = (ctx.school || '').toLowerCase();
  const normShape = ctx.shape || 'circle';

  // 1. Direct Fire
  if (normDamage.includes('fire') || normDamage.includes('flame') || ctx.spellName.toLowerCase().includes('fire') || ctx.spellName.toLowerCase().includes('flame')) {
    if (normShape === 'cone') {
      return JB2A_REGISTRY.find(a => a.id === 'template_cone_fire') || JB2A_REGISTRY.find(a => a.id === 'burning_hands')!;
    }
    if (normShape === 'line') {
      return JB2A_REGISTRY.find(a => a.id === 'lightning_bolt')!; // Fallback line
    }
    return JB2A_REGISTRY.find(a => a.id === 'template_circle_fire') || JB2A_REGISTRY.find(a => a.id === 'fireball')!;
  }

  // 2. Cold / Ice
  if (normDamage.includes('cold') || normDamage.includes('ice') || normDamage.includes('frost')) {
    if (normShape === 'cone') {
      return JB2A_REGISTRY.find(a => a.id === 'cone_of_cold')!;
    }
    return JB2A_REGISTRY.find(a => a.id === 'ice_storm') || JB2A_REGISTRY.find(a => a.id === 'template_circle_cold') || JB2A_REGISTRY.find(a => a.id === 'cone_of_cold')!;
  }

  // 3. Acid / Poison
  if (normDamage.includes('acid') || normDamage.includes('poison') || normDamage.includes('toxic')) {
    if (normShape === 'line') {
      return JB2A_REGISTRY.find(a => a.id === 'caustic_brew') || JB2A_REGISTRY.find(a => a.id === 'lightning_bolt')!;
    }
    return JB2A_REGISTRY.find(a => a.id === 'template_circle_acid') || JB2A_REGISTRY.find(a => a.id === 'fog_cloud') || JB2A_REGISTRY[0];
  }

  // 4. Lightning / Shock
  if (normDamage.includes('lightning') || normDamage.includes('thunder') || normDamage.includes('shock')) {
    return JB2A_REGISTRY.find(a => a.id === 'lightning_bolt') || JB2A_REGISTRY.find(a => a.id === 'call_lightning') || JB2A_REGISTRY[0];
  }

  // 5. Radiant / Holy
  if (normDamage.includes('radiant') || normDamage.includes('holy') || normSchool === 'abjuration') {
    return JB2A_REGISTRY.find(a => a.id === 'divine_smite') || JB2A_REGISTRY.find(a => a.id === 'healing_word') || JB2A_REGISTRY.find(a => a.id === 'template_circle_radiant') || JB2A_REGISTRY.find(a => a.id === 'bless') || JB2A_REGISTRY.find(a => a.id === 'shield') || JB2A_REGISTRY[0];
  }

  // 6. Necrotic / Dark
  if (normDamage.includes('necrotic') || normDamage.includes('death') || normSchool === 'necromancy') {
    return JB2A_REGISTRY.find(a => a.id === 'toll_the_dead') || JB2A_REGISTRY.find(a => a.id === 'black_tentacles') || JB2A_REGISTRY.find(a => a.id === 'template_circle_necrotic') || JB2A_REGISTRY.find(a => a.id === 'arms_of_hadar') || JB2A_REGISTRY.find(a => a.id === 'darkness') || JB2A_REGISTRY[0];
  }

  // 7. General Arcane / Force / Illusion
  if (normSchool === 'illusion' || normSchool === 'enchantment') {
    return JB2A_REGISTRY.find(a => a.id === 'bless') || JB2A_REGISTRY.find(a => a.id === 'misty_step') || JB2A_REGISTRY[0];
  }

  // Universal Fallback: Fireball or first asset
  return JB2A_REGISTRY.find(a => a.id === 'fireball') || JB2A_REGISTRY[0];
}
