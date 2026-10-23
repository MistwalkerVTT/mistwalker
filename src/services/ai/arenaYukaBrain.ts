// src/services/ai/arenaYukaBrain.ts
// Goal-Oriented Action Planning (GOAP) & 5e Monster Tactical Brain powered by YUKA (yuka)

import * as YUKA from 'yuka';
import { HudActionItem, HudCharacterData } from '../../types/hud';
import {
  TacticalCombatantView,
  AiArchetypeRole,
  GridCoord,
  pxToGrid,
  computeGridDistanceFt,
  buildArenaWalkabilityGrid,
  findAStarPathSteps,
  estimateAverageDiceFormula
} from '../arenaTacticalAi';
import { decomposeMonsterMultiattack } from './arenaCombatMachine';
import { ArenaLineOfSightEngine } from './arenaScheduler';

export interface EvaluatedTacticalGoal {
  type: 'multiattack' | 'breath_weapon' | 'ranged_kite_and_cast' | 'melee_charge' | 'emergency_heal' | 'dash_advance';
  desirability: number;
  reason: string;
  targetId: string;
  targetName: string;
  attacksQueue: HudActionItem[];
  actionItem: HudActionItem | null;
  bonusActionItem: HudActionItem | null;
  plannedMovementFt: number;
  useDisengage: boolean;
  useDash: boolean;
  finalPositionPx: { x: number; y: number };
  pathWaypointsPx: Array<{ x: number; y: number }>;
}

/**
 * Checks whether an enemy is threatening the actor within 5ft melee reach
 */
export function checkThreatenedInMelee(
  actor: TacticalCombatantView,
  enemies: TacticalCombatantView[],
  gridSize: number
): { threatened: boolean; nearestEnemy: TacticalCombatantView | null } {
  const actorCell = pxToGrid(actor.x, actor.y, gridSize);
  let nearest: TacticalCombatantView | null = null;
  let minDist = Infinity;

  for (const enemy of enemies) {
    if (enemy.currentHp <= 0) continue;
    const enemyCell = pxToGrid(enemy.x, enemy.y, gridSize);
    const distFt = computeGridDistanceFt(
      actorCell.col,
      actorCell.row,
      actor.size || 1,
      enemyCell.col,
      enemyCell.row,
      enemy.size || 1
    );
    if (distFt < minDist) {
      minDist = distFt;
      nearest = enemy;
    }
  }

  return {
    threatened: minDist <= 5,
    nearestEnemy: nearest
  };
}

/**
 * YUKA Goal Evaluator for Emergency Healing / Potion Surge
 */
class EmergencyHealEvaluator extends YUKA.GoalEvaluator {
  calculateDesirability(actor: any): number {
    const hpRatio = actor.currentHp / Math.max(1, actor.maxHp);
    if (hpRatio <= 0.3) return 0.95;
    if (hpRatio <= 0.5 && actor.heals.length > 0) return 0.7;
    return 0.1;
  }

  setGoal(): void {}
}

/**
 * YUKA Goal Evaluator for Signature Recharge Breath Weapon / Area Effects
 */
class BreathWeaponEvaluator extends YUKA.GoalEvaluator {
  calculateDesirability(actor: any): number {
    if (actor.rechargedBreathAction) {
      return 0.92; // Top priority when charged!
    }
    return 0;
  }

  setGoal(): void {}
}

/**
 * YUKA Goal Evaluator for Full Multiattack Sequence
 */
class MultiattackEvaluator extends YUKA.GoalEvaluator {
  calculateDesirability(actor: any): number {
    if (actor.multiattackAttacks.length > 1) {
      return 0.85;
    }
    return 0.5;
  }

  setGoal(): void {}
}

/**
 * YUKA Goal Evaluator for Ranged Kiting & Disadvantage Avoidance
 */
class RangedKiteEvaluator extends YUKA.GoalEvaluator {
  calculateDesirability(actor: any): number {
    if (actor.threatenedInMelee && (actor.role === 'artillery' || actor.role === 'skirmisher')) {
      return 0.88; // High priority to disengage or retreat from 5ft disadvantage!
    }
    if (actor.role === 'artillery') return 0.75;
    return 0.3;
  }

  setGoal(): void {}
}

/**
 * High-level YUKA Brain for 5e Monster Decision Making
 */
export class YukaArenaMonsterBrain {
  private think: YUKA.Think;

  constructor() {
    this.think = new YUKA.Think();
    this.think.evaluators.push(new EmergencyHealEvaluator());
    this.think.evaluators.push(new BreathWeaponEvaluator());
    this.think.evaluators.push(new MultiattackEvaluator());
    this.think.evaluators.push(new RangedKiteEvaluator());
  }

  /**
   * Plans the turn according to D&D 5e monster rules:
   * - Checks 5ft melee disadvantage and uses Disengage / Kiting when needed.
   * - Prioritizes Recharge breath weapons when charged.
   * - Executes full Multiattack sequences rather than a single basic shot.
   * - Preserves spell slots and selects optimal targets.
   */
  public planTurn(
    actor: TacticalCombatantView,
    allCombatants: TacticalCombatantView[],
    hud: HudCharacterData,
    cols: number,
    rows: number,
    gridSize: number,
    rechargedAbilities: string[] = []
  ): EvaluatedTacticalGoal {
    const enemies = allCombatants.filter((c) => c.team !== actor.team && c.currentHp > 0);
    const allies = allCombatants.filter((c) => c.team === actor.team && c.currentHp > 0);
    const startCell = pxToGrid(actor.x, actor.y, gridSize);
    const walkGrid = buildArenaWalkabilityGrid(cols, rows, gridSize, actor, allCombatants);
    const maxWalkSteps = Math.max(1, Math.floor(actor.speedFt / 5));

    const { threatened, nearestEnemy } = checkThreatenedInMelee(actor, enemies, gridSize);

    // 1. Identify Recharge Breath Weapon
    const rechargeAction = hud.actions.find(
      (a) =>
        (a.name.toLowerCase().includes('breath') ||
          a.description.toLowerCase().includes('recharge 5-6') ||
          a.description.toLowerCase().includes('recharge 6')) &&
        (rechargedAbilities.includes(a.name) || !a.description.toLowerCase().includes('recharge'))
    ) || null;

    // 2. Identify Multiattack Sequence
    const multiattackAction = hud.actions.find((a) => a.name.toLowerCase().includes('multiattack'));
    const multiattackStrikes = multiattackAction
      ? decomposeMonsterMultiattack(multiattackAction.description, hud.attacks)
      : hud.attacks.length > 1
      ? hud.attacks.slice(0, 2)
      : hud.attacks;

    // 3. Identify Heals and Potions
    const emergencyHeal =
      hud.spells.find((s) => s.isHeal) ||
      hud.bonusActions.find((b) => b.isHeal) ||
      hud.items.find((i) => i.isHeal) ||
      null;

    // Target Selection: Focus lowest HP enemy or nearest enemy
    const targetEnemy =
      enemies.slice().sort((a, b) => a.currentHp - b.currentHp)[0] || nearestEnemy || enemies[0];

    if (!targetEnemy) {
      return {
        type: 'dash_advance',
        desirability: 0,
        reason: 'No living enemies remaining.',
        targetId: '',
        targetName: '',
        attacksQueue: [],
        actionItem: null,
        bonusActionItem: null,
        plannedMovementFt: 0,
        useDisengage: false,
        useDash: false,
        finalPositionPx: { x: actor.x, y: actor.y },
        pathWaypointsPx: []
      };
    }

    const targetCell = pxToGrid(targetEnemy.x, targetEnemy.y, gridSize);
    const currentDistFt = computeGridDistanceFt(
      startCell.col,
      startCell.row,
      actor.size || 1,
      targetCell.col,
      targetCell.row,
      targetEnemy.size || 1
    );

    // =========================================================================
    // CASE A: Emergency Healing / Potion (< 35% HP)
    // =========================================================================
    const hpRatio = actor.currentHp / Math.max(1, actor.maxHp);
    if (hpRatio <= 0.35 && emergencyHeal) {
      return {
        type: 'emergency_heal',
        desirability: 0.95,
        reason: `🩸 Critical HP (${actor.currentHp}/${actor.maxHp}) — using ${emergencyHeal.name} to survive!`,
        targetId: actor.id,
        targetName: actor.name,
        attacksQueue: [],
        actionItem: emergencyHeal.type === 'action' ? emergencyHeal : null,
        bonusActionItem: emergencyHeal.type === 'bonus_action' ? emergencyHeal : null,
        plannedMovementFt: 0,
        useDisengage: false,
        useDash: false,
        finalPositionPx: { x: actor.x, y: actor.y },
        pathWaypointsPx: []
      };
    }

    // =========================================================================
    // CASE B: Recharge Breath Weapon Ready (Dragons, Chimeras, Gorgons)
    // =========================================================================
    if (rechargeAction && (rechargedAbilities.includes(rechargeAction.name) || !rechargeAction.description.toLowerCase().includes('recharge'))) {
      const breathRange = rechargeAction.rangeFt || 30;
      if (currentDistFt <= breathRange + 10) {
        return {
          type: 'breath_weapon',
          desirability: 0.92,
          reason: `🔥 Signature recharge ability READY! Unleashing ${rechargeAction.name} on ${targetEnemy.name}!`,
          targetId: targetEnemy.id,
          targetName: targetEnemy.name,
          attacksQueue: [],
          actionItem: rechargeAction,
          bonusActionItem: null,
          plannedMovementFt: 0,
          useDisengage: false,
          useDash: false,
          finalPositionPx: { x: actor.x, y: actor.y },
          pathWaypointsPx: []
        };
      }
    }

    // =========================================================================
    // CASE C: Threatened within 5ft melee while wielding ranged attack (5e Disadvantage!)
    // Ranged shooters (Archers, Goblins, Mages) kite back or use Disengage
    // =========================================================================
    const hasMeleeOption = hud.attacks.some((a) => (a.rangeFt || 5) <= 10);
    const primaryRanged = hud.attacks.find((a) => (a.rangeFt || 5) >= 30) || hud.spells.find((s) => !s.isHeal && (s.rangeFt || 5) >= 30);

    if (threatened && primaryRanged && !hasMeleeOption) {
      // Find a safe cell away from the nearest melee threat
      let bestKiteCell: GridCoord = { ...startCell };
      let maxDistFromThreat = currentDistFt;

      for (let r = Math.max(0, startCell.row - maxWalkSteps); r <= Math.min(rows - 1, startCell.row + maxWalkSteps); r++) {
        for (let c = Math.max(0, startCell.col - maxWalkSteps); c <= Math.min(cols - 1, startCell.col + maxWalkSteps); c++) {
          const distToThreat = computeGridDistanceFt(c, r, actor.size || 1, targetCell.col, targetCell.row, targetEnemy.size || 1);
          if (distToThreat > maxDistFromThreat) {
            maxDistFromThreat = distToThreat;
            bestKiteCell = { col: c, row: r };
          }
        }
      }

      const steps = findAStarPathSteps(startCell.col, startCell.row, bestKiteCell.col, bestKiteCell.row, maxWalkSteps, walkGrid);
      const waypoints = steps.map((s) => ({ x: s.col * gridSize, y: s.row * gridSize }));
      const finalCell = steps.length > 0 ? steps[steps.length - 1] : startCell;

      return {
        type: 'ranged_kite_and_cast',
        desirability: 0.88,
        reason: `⚠️ Threatened within 5ft melee (Disadvantage on ranged shots)! Disengaging & kiting back to ${maxDistFromThreat} ft to shoot!`,
        targetId: targetEnemy.id,
        targetName: targetEnemy.name,
        attacksQueue: [primaryRanged],
        actionItem: primaryRanged,
        bonusActionItem: null,
        plannedMovementFt: steps.length * 5,
        useDisengage: true,
        useDash: false,
        finalPositionPx: { x: finalCell.col * gridSize, y: finalCell.row * gridSize },
        pathWaypointsPx: waypoints
      };
    }

    // =========================================================================
    // CASE D: Multiattack Sequence (D&D 5e Monster Standard)
    // Monster moves into reach and strikes 2–3 times!
    // =========================================================================
    if (multiattackStrikes.length > 1) {
      // If already in 5ft melee reach, unleash full sequence immediately
      if (currentDistFt <= 5) {
        return {
          type: 'multiattack',
          desirability: 0.89,
          reason: `⚔️ In melee range with ${targetEnemy.name}! Unleashing Multiattack (${multiattackStrikes.map((s) => s.name).join(' + ')})!`,
          targetId: targetEnemy.id,
          targetName: targetEnemy.name,
          attacksQueue: multiattackStrikes,
          actionItem: multiattackStrikes[0],
          bonusActionItem: null,
          plannedMovementFt: 0,
          useDisengage: false,
          useDash: false,
          finalPositionPx: { x: actor.x, y: actor.y },
          pathWaypointsPx: []
        };
      }

      // Find adjacent cell to target
      let bestEngageCell: GridCoord | null = null;
      let shortestStepsToReach = Infinity;

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const candC = targetCell.col + dc;
          const candR = targetCell.row + dr;
          if (candC >= 0 && candC < cols && candR >= 0 && candR < rows) {
            const steps = findAStarPathSteps(startCell.col, startCell.row, candC, candR, maxWalkSteps, walkGrid);
            if (steps.length > 0 && steps.length < shortestStepsToReach) {
              shortestStepsToReach = steps.length;
              bestEngageCell = { col: candC, row: candR };
            }
          }
        }
      }

      if (bestEngageCell && shortestStepsToReach <= maxWalkSteps) {
        const steps = findAStarPathSteps(startCell.col, startCell.row, bestEngageCell.col, bestEngageCell.row, maxWalkSteps, walkGrid);
        const waypoints = steps.map((s) => ({ x: s.col * gridSize, y: s.row * gridSize }));
        const finalCell = steps.length > 0 ? steps[steps.length - 1] : startCell;

        return {
          type: 'multiattack',
          desirability: 0.87,
          reason: `🏃 Closing distance to ${targetEnemy.name} (${steps.length * 5} ft) and executing Multiattack (${multiattackStrikes.length} strikes)!`,
          targetId: targetEnemy.id,
          targetName: targetEnemy.name,
          attacksQueue: multiattackStrikes,
          actionItem: multiattackStrikes[0],
          bonusActionItem: null,
          plannedMovementFt: steps.length * 5,
          useDisengage: false,
          useDash: false,
          finalPositionPx: { x: finalCell.col * gridSize, y: finalCell.row * gridSize },
          pathWaypointsPx: waypoints
        };
      }
    }

    // =========================================================================
    // CASE E: Standard Single Action Attack or Leveled Spell
    // =========================================================================
    const bestOffensive = hud.attacks[0] || hud.spells.find((s) => !s.isHeal) || hud.actions[0];
    const reachFt = bestOffensive?.rangeFt || 5;

    if (currentDistFt <= reachFt) {
      return {
        type: 'melee_charge',
        desirability: 0.8,
        reason: `🎯 Targeting ${targetEnemy.name} with ${bestOffensive?.name || 'Attack'}!`,
        targetId: targetEnemy.id,
        targetName: targetEnemy.name,
        attacksQueue: [bestOffensive],
        actionItem: bestOffensive,
        bonusActionItem: null,
        plannedMovementFt: 0,
        useDisengage: false,
        useDash: false,
        finalPositionPx: { x: actor.x, y: actor.y },
        pathWaypointsPx: []
      };
    }

    // Out of range: Dash advance along A* path towards target
    const steps = findAStarPathSteps(startCell.col, startCell.row, targetCell.col, targetCell.row, maxWalkSteps * 2, walkGrid);
    const waypoints = steps.map((s) => ({ x: s.col * gridSize, y: s.row * gridSize }));
    const finalCell = steps.length > 0 ? steps[steps.length - 1] : startCell;

    return {
      type: 'dash_advance',
      desirability: 0.65,
      reason: `⏩ Out of range (${currentDistFt} ft). Using Dash to advance ${steps.length * 5} ft towards ${targetEnemy.name}!`,
      targetId: targetEnemy.id,
      targetName: targetEnemy.name,
      attacksQueue: [],
      actionItem: null,
      bonusActionItem: null,
      plannedMovementFt: steps.length * 5,
      useDisengage: false,
      useDash: true,
      finalPositionPx: { x: finalCell.col * gridSize, y: finalCell.row * gridSize },
      pathWaypointsPx: waypoints
    };
  }
}
