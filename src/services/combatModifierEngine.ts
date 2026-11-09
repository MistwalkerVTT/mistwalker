// src/services/combatModifierEngine.ts
// Pure computation engine for temporary stat buffs, defensive wards, and combat modifications.

import { CombatModifier, ComputedCombatStats, StatModifierType } from '../types/combatModifiers';
import { ArenaCombatant } from '../components/PlayerArenaMode';

/**
 * Pure calculation to compute a combatant's effective stats given active combat modifiers
 * without ever mutating the base combatant data model.
 */
export function computeEffectiveCombatantStats(
  combatant: ArenaCombatant,
  allModifiers: CombatModifier[]
): ComputedCombatStats {
  const targetModifiers = allModifiers.filter((m) => m.targetCombatantId === combatant.id);

  const baseAc = combatant.ac;
  let totalAcBonus = 0;
  let minimumAc = 0;

  let baseSpeed = combatant.speedFt || 30;
  let speedBonus = 0;
  let speedMultiplier = 1;

  const attackDiceBonuses: string[] = [];
  const saveDiceBonuses: string[] = [];

  for (const mod of targetModifiers) {
    switch (mod.type) {
      case 'ac_bonus':
        totalAcBonus += mod.value;
        break;
      case 'ac_minimum':
        if (mod.value > minimumAc) {
          minimumAc = mod.value;
        }
        break;
      case 'speed_bonus':
        speedBonus += mod.value;
        break;
      case 'speed_multiplier':
        speedMultiplier *= mod.value;
        break;
      case 'attack_roll_dice':
        if (mod.diceFormula) attackDiceBonuses.push(mod.diceFormula);
        break;
      case 'saving_throw_dice':
        if (mod.diceFormula) saveDiceBonuses.push(mod.diceFormula);
        break;
      default:
        break;
    }
  }

  const effectiveAc = Math.max(baseAc + totalAcBonus, minimumAc);
  const effectiveSpeedFt = Math.max(0, Math.round((baseSpeed + speedBonus) * speedMultiplier));

  return {
    effectiveAc,
    baseAc,
    acBonus: effectiveAc - baseAc,
    effectiveSpeedFt,
    baseSpeedFt: baseSpeed,
    attackDiceBonuses,
    saveDiceBonuses,
    activeModifiers: targetModifiers
  };
}

/**
 * Creates a standard CombatModifier descriptor from a recognized spell or action.
 */
export function createModifierFromAction(
  actionName: string,
  casterId: string,
  targetId: string,
  currentRound: number,
  currentTurnIndex: number,
  castAtLevel: number = 1
): CombatModifier[] {
  const lower = actionName.toLowerCase().trim();
  const now = Date.now();
  const results: CombatModifier[] = [];

  if (lower === 'shield') {
    results.push({
      id: `mod_shield_${targetId}_${now}`,
      sourceSpellOrActionId: 'shield',
      sourceName: 'Shield',
      sourceCasterId: casterId,
      targetCombatantId: targetId,
      type: 'ac_bonus',
      value: 5,
      durationType: 'until_start_of_next_turn',
      appliedAtRound: currentRound,
      appliedAtTurnIndex: currentTurnIndex,
      badgeLabel: '+5 AC',
      badgeIcon: '🛡️',
      color: '#38bdf8'
    });
  } else if (lower.includes('shield of faith')) {
    results.push({
      id: `mod_shield_of_faith_${targetId}_${now}`,
      sourceSpellOrActionId: 'shield_of_faith',
      sourceName: 'Shield of Faith',
      sourceCasterId: casterId,
      targetCombatantId: targetId,
      type: 'ac_bonus',
      value: 2,
      durationType: 'concentration',
      remainingRounds: 100, // 10 minutes
      appliedAtRound: currentRound,
      appliedAtTurnIndex: currentTurnIndex,
      badgeLabel: '+2 AC',
      badgeIcon: '🛡️',
      color: '#eab308'
    });
  } else if (lower === 'haste') {
    results.push({
      id: `mod_haste_ac_${targetId}_${now}`,
      sourceSpellOrActionId: 'haste',
      sourceName: 'Haste (AC)',
      sourceCasterId: casterId,
      targetCombatantId: targetId,
      type: 'ac_bonus',
      value: 2,
      durationType: 'concentration',
      remainingRounds: 10, // 1 minute
      appliedAtRound: currentRound,
      appliedAtTurnIndex: currentTurnIndex,
      badgeLabel: '+2 AC',
      badgeIcon: '⚡',
      color: '#06b6d4'
    });
    results.push({
      id: `mod_haste_spd_${targetId}_${now}`,
      sourceSpellOrActionId: 'haste',
      sourceName: 'Haste (Speed)',
      sourceCasterId: casterId,
      targetCombatantId: targetId,
      type: 'speed_multiplier',
      value: 2,
      durationType: 'concentration',
      remainingRounds: 10,
      appliedAtRound: currentRound,
      appliedAtTurnIndex: currentTurnIndex,
      badgeLabel: '2x Speed',
      badgeIcon: '🏃',
      color: '#06b6d4'
    });
  } else if (lower.includes('barkskin')) {
    results.push({
      id: `mod_barkskin_${targetId}_${now}`,
      sourceSpellOrActionId: 'barkskin',
      sourceName: 'Barkskin',
      sourceCasterId: casterId,
      targetCombatantId: targetId,
      type: 'ac_minimum',
      value: 16,
      durationType: 'concentration',
      remainingRounds: 600, // 1 hour
      appliedAtRound: currentRound,
      appliedAtTurnIndex: currentTurnIndex,
      badgeLabel: 'AC ≥ 16',
      badgeIcon: '🪵',
      color: '#84cc16'
    });
  } else if (lower === 'bless') {
    results.push({
      id: `mod_bless_${targetId}_${now}`,
      sourceSpellOrActionId: 'bless',
      sourceName: 'Bless',
      sourceCasterId: casterId,
      targetCombatantId: targetId,
      type: 'attack_roll_dice',
      value: 0,
      diceFormula: '1d4',
      durationType: 'concentration',
      remainingRounds: 10,
      appliedAtRound: currentRound,
      appliedAtTurnIndex: currentTurnIndex,
      badgeLabel: '+1d4 Atk',
      badgeIcon: '✨',
      color: '#facc15'
    });
    results.push({
      id: `mod_bless_save_${targetId}_${now}`,
      sourceSpellOrActionId: 'bless',
      sourceName: 'Bless (Saves)',
      sourceCasterId: casterId,
      targetCombatantId: targetId,
      type: 'saving_throw_dice',
      value: 0,
      diceFormula: '1d4',
      durationType: 'concentration',
      remainingRounds: 10,
      appliedAtRound: currentRound,
      appliedAtTurnIndex: currentTurnIndex,
      badgeLabel: '+1d4 Saves',
      badgeIcon: '✨',
      color: '#facc15'
    });
  }

  return results;
}

/**
 * Progresses modifiers when turns advance in the combat tracker.
 * Returns:
 * - active: Remaining active modifiers
 * - expired: Modifiers that expired this turn (useful for combat logging)
 */
export function advanceCombatModifiers(
  modifiers: CombatModifier[],
  nextActiveCombatantId: string,
  newRound: number,
  isNewRound: boolean
): { active: CombatModifier[]; expired: CombatModifier[] } {
  const active: CombatModifier[] = [];
  const expired: CombatModifier[] = [];

  for (const mod of modifiers) {
    let hasExpired = false;

    // 1. Spells like Shield expire at the start of the caster's next turn
    if (mod.durationType === 'until_start_of_next_turn' && mod.targetCombatantId === nextActiveCombatantId) {
      hasExpired = true;
    } else if (mod.durationType === 'rounds') {
      if (isNewRound && mod.remainingRounds !== undefined) {
        const nextRemaining = mod.remainingRounds - 1;
        if (nextRemaining <= 0) {
          hasExpired = true;
        } else {
          mod.remainingRounds = nextRemaining;
        }
      }
    }

    if (hasExpired) {
      expired.push(mod);
    } else {
      active.push(mod);
    }
  }

  return { active, expired };
}
