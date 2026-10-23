import * as PF from 'pathfinding';
import { BehaviourTree, State } from 'mistreevous';
import { HudActionItem, HudCharacterData } from '../types/hud';

export type AiArchetypeRole = 'brute' | 'artillery' | 'skirmisher' | 'support';

export interface TacticalCombatantView {
  id: string;
  name: string;
  team: 'gold' | 'crimson';
  isAI: boolean;
  ac: number;
  currentHp: number;
  maxHp: number;
  speedFt: number;
  remainingMoveFt: number;
  x: number;
  y: number;
  size: number; // 1 = Medium, 2 = Large, 3 = Huge
  isFlying?: boolean;
  elevation?: number;
}

export interface GridCoord {
  col: number;
  row: number;
}

export interface PlannedActionExecution {
  action: HudActionItem;
  targetId: string;
  expectedValue: number;
  reason: string;
}

export interface AiTurnPlan {
  role: AiArchetypeRole;
  roleLabel: string;
  tacticalThought: string;
  /** World pixel waypoints along the A* path for smooth tile-by-tile movement */
  pathWaypointsPx: Array<{ x: number; y: number }>;
  finalPositionPx: { x: number; y: number };
  movementSpentFt: number;
  useDash: boolean;
  primaryAction: PlannedActionExecution | null;
  bonusAction: PlannedActionExecution | null;
}

/**
 * Computes the mathematical average of a dice notation string like "2d6 + 4" or "8d6"
 */
export function estimateAverageDiceFormula(formula?: string): number {
  if (!formula) return 7;
  const clean = String(formula).trim();
  if (/^\d+$/.test(clean)) {
    return parseInt(clean, 10) || 7;
  }

  let totalAvg = 0;
  const diceRegex = /(\d+)d(\d+)/gi;
  let match: RegExpExecArray | null;
  while ((match = diceRegex.exec(clean)) !== null) {
    const count = Math.max(1, parseInt(match[1], 10));
    const sides = Math.max(2, parseInt(match[2], 10));
    totalAvg += count * ((sides + 1) / 2);
  }

  const withoutDice = clean.replace(/(\d+)d(\d+)/gi, '');
  const bonusMatch = withoutDice.match(/([+-]\s*\d+)/g);
  if (bonusMatch) {
    bonusMatch.forEach((b) => {
      const val = parseInt(b.replace(/\s+/g, ''), 10);
      if (!isNaN(val)) totalAvg += val;
    });
  }

  return Math.max(1, Math.round(totalAvg * 10) / 10);
}

/**
 * Classifies a combatant into a D&D 5e Tactical AI Archetype based on its HUD actions & stats
 */
export function classifyCombatantRole(
  combatant: TacticalCombatantView,
  hud: HudCharacterData
): { role: AiArchetypeRole; roleLabel: string } {
  const allActions = [...hud.attacks, ...hud.spells, ...hud.actions, ...hud.bonusActions];
  const hasRealHealSpell = hud.spells.some((s) => s.isHeal);
  const rangedCount = allActions.filter((a) => !a.isHeal && (a.rangeFt || 5) >= 30).length;
  const meleeCount = allActions.filter((a) => !a.isHeal && (a.rangeFt || 5) <= 10).length;

  const lowerName = combatant.name.toLowerCase();
  if (
    hasRealHealSpell ||
    lowerName.includes('cleric') ||
    lowerName.includes('priest') ||
    lowerName.includes('druid') ||
    lowerName.includes('bard')
  ) {
    return { role: 'support', roleLabel: '✨ Battle Healer' };
  }

  if (
    lowerName.includes('mage') ||
    lowerName.includes('wizard') ||
    lowerName.includes('sorcerer') ||
    lowerName.includes('warlock') ||
    lowerName.includes('lich') ||
    lowerName.includes('archer') ||
    (rangedCount > meleeCount && hud.spells.length >= 2)
  ) {
    return { role: 'artillery', roleLabel: '🏹 Arcane Artillery' };
  }

  if (
    lowerName.includes('rogue') ||
    lowerName.includes('assassin') ||
    lowerName.includes('goblin') ||
    lowerName.includes('wolf') ||
    lowerName.includes('monk') ||
    lowerName.includes('ranger') ||
    combatant.speedFt >= 40
  ) {
    return { role: 'skirmisher', roleLabel: '🗡️ Tactical Skirmisher' };
  }

  return { role: 'brute', roleLabel: '🛡️ Frontline Brute' };
}

/**
 * Converts world pixel coordinates to 0-indexed grid cell coordinates
 */
export function pxToGrid(x: number, y: number, gridSize: number): GridCoord {
  return {
    col: Math.max(0, Math.round(x / gridSize)),
    row: Math.max(0, Math.round(y / gridSize))
  };
}

/**
 * Chebyshev (5e standard 5ft diagonal) distance in feet between two footprints
 */
export function computeGridDistanceFt(
  colA: number,
  rowA: number,
  sizeA: number,
  colB: number,
  rowB: number,
  sizeB: number
): number {
  const minColA = colA;
  const maxColA = colA + Math.max(1, sizeA) - 1;
  const minRowA = rowA;
  const maxRowA = rowA + Math.max(1, sizeA) - 1;

  const minColB = colB;
  const maxColB = colB + Math.max(1, sizeB) - 1;
  const minRowB = rowB;
  const maxRowB = rowB + Math.max(1, sizeB) - 1;

  const dx = Math.max(0, minColA - maxColB, minColB - maxColA);
  const dy = Math.max(0, minRowA - maxRowB, minRowB - maxRowA);

  return Math.max(dx, dy) * 5;
}

/**
 * Builds a Pathfinding.js walkability grid where all OTHER living combatants block their cells
 */
export function buildArenaWalkabilityGrid(
  cols: number,
  rows: number,
  gridSize: number,
  actor: TacticalCombatantView,
  allCombatants: TacticalCombatantView[]
): PF.Grid {
  const matrix: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (const other of allCombatants) {
    if (other.id === actor.id || other.currentHp <= 0) continue;
    const { col, row } = pxToGrid(other.x, other.y, gridSize);
    const sz = Math.max(1, other.size || 1);
    for (let r = row; r < row + sz; r++) {
      for (let c = col; c < col + sz; c++) {
        if (r >= 0 && r < rows && c >= 0 && c < cols) {
          matrix[r][c] = 1; // Blocked by living token
        }
      }
    }
  }

  return new PF.Grid(matrix);
}

/**
 * Checks whether a token of size `tokenSize` can stand at `(col, row)` without overlapping walls or other tokens
 */
function canTokenFitAt(
  col: number,
  row: number,
  tokenSize: number,
  cols: number,
  rows: number,
  walkGrid: PF.Grid
): boolean {
  if (col < 0 || row < 0 || col + tokenSize > cols || row + tokenSize > rows) {
    return false;
  }
  for (let r = row; r < row + tokenSize; r++) {
    for (let c = col; c < col + tokenSize; c++) {
      if (!walkGrid.isWalkableAt(c, r)) return false;
    }
  }
  return true;
}

/**
 * Finds the A* path from actor's current cell to `(destCol, destRow)` and clamps to `maxSteps`
 */
export function findAStarPathSteps(
  startCol: number,
  startRow: number,
  destCol: number,
  destRow: number,
  maxSteps: number,
  walkGrid: PF.Grid
): GridCoord[] {
  if (startCol === destCol && startRow === destRow) return [];

  const finder = new PF.AStarFinder({
    allowDiagonal: true,
    dontCrossCorners: true
  });

  const cloned = walkGrid.clone();
  // Ensure start is walkable
  cloned.setWalkableAt(startCol, startRow, true);

  const rawPath = finder.findPath(startCol, startRow, destCol, destRow, cloned);
  if (!rawPath || rawPath.length <= 1) return [];

  // Slice off the starting cell [0] and clamp to maxSteps
  return rawPath.slice(1, 1 + Math.max(0, maxSteps)).map(([c, r]) => ({ col: c, row: r }));
}

/**
 * Utility AI Scorer: Evaluates an offensive action against a specific enemy target
 */
export function scoreOffensiveAction(
  actor: TacticalCombatantView,
  target: TacticalCombatantView,
  action: HudActionItem,
  role: AiArchetypeRole,
  allies: TacticalCombatantView[],
  gridSize: number
): { score: number; reason: string } {
  const avgDmg = estimateAverageDiceFormula(action.damageFormula);
  const rawHit = parseInt(String(action.hitBonus || '+6').replace('+', ''), 10) || 6;
  // Probability to hit target AC on a d20 (clamped between 5% and 95%)
  const hitChance = Math.max(0.05, Math.min(0.95, (21 - (target.ac - rawHit)) / 20));
  let expectedDamage = avgDmg * hitChance;

  let score = expectedDamage * 2.5;
  const reasons: string[] = [`EV ${expectedDamage.toFixed(1)} dmg (${Math.round(hitChance * 100)}% hit)`];

  // 1. Kill-Confirm / Execute Priority!
  if (avgDmg >= target.currentHp) {
    score += 48;
    reasons.push('💀 LETHAL FINISHER');
  } else if (target.currentHp / Math.max(1, target.maxHp) <= 0.4) {
    score += 18;
    reasons.push('🩸 Wounded target');
  }

  // 2. Role-specific tactical preferences
  if (role === 'skirmisher') {
    // Skirmishers love low-AC & wounded targets
    score += Math.max(0, (18 - target.ac) * 2.5);
    // Pack Tactics / Flanking bonus if an ally is adjacent to this target
    const targetCell = pxToGrid(target.x, target.y, gridSize);
    const allyAdjacent = allies.some((ally) => {
      if (ally.id === actor.id || ally.currentHp <= 0) return false;
      const allyCell = pxToGrid(ally.x, ally.y, gridSize);
      return (
        computeGridDistanceFt(
          allyCell.col,
          allyCell.row,
          ally.size || 1,
          targetCell.col,
          targetCell.row,
          target.size || 1
        ) <= 5
      );
    });
    if (allyAdjacent) {
      score += 14;
      reasons.push('🐺 Pack Flanking');
    }
  } else if (role === 'artillery') {
    // Artillery prefers ranged spells/attacks
    if ((action.rangeFt || 5) >= 30) {
      score += 16;
      reasons.push('🏹 Ranged spell/shot');
    }
  } else if (role === 'brute') {
    // Brutes prefer high-damage heavy strikes on nearby enemies
    const actorCell = pxToGrid(actor.x, actor.y, gridSize);
    const targetCell = pxToGrid(target.x, target.y, gridSize);
    const distFt = computeGridDistanceFt(
      actorCell.col,
      actorCell.row,
      actor.size || 1,
      targetCell.col,
      targetCell.row,
      target.size || 1
    );
    score += Math.max(0, 20 - distFt * 0.4);
  }

  return { score, reason: reasons.join(' • ') };
}

/**
 *Mistreevous Behavior Tree MDSL Definition for Turn-Based D&D 5e Tactical AI
 */
const ARENA_TACTICAL_BT_MDSL = `root {
  sequence {
    action [ClassifyAndScanBattlefield]
    selector {
      sequence {
        condition [NeedsEmergencyHeal]
        action [PlanEmergencyHealTurn]
      }
      sequence {
        condition [ShouldArtilleryKite]
        action [PlanArtilleryKiteTurn]
      }
      sequence {
        condition [CanMoveIntoAttackRange]
        action [PlanOptimalEngageAndAttack]
      }
      action [PlanDashAdvanceTurn]
    }
    action [EvaluateBonusActionFollowup]
  }
}`;

/**
 * Main Entry Point: Runs the Mistreevous Behavior Tree + Utility AI + A* Pathfinding
 * to produce a complete, intelligent turn plan for an AI combatant.
 */
export function computeTacticalAiTurnPlan(
  actor: TacticalCombatantView,
  allCombatants: TacticalCombatantView[],
  hud: HudCharacterData,
  cols: number,
  rows: number,
  gridSize: number
): AiTurnPlan {
  const { role, roleLabel } = classifyCombatantRole(actor, hud);
  const enemies = allCombatants.filter((c) => c.team !== actor.team && c.currentHp > 0);
  const allies = allCombatants.filter((c) => c.team === actor.team && c.currentHp > 0);

  const walkGrid = buildArenaWalkabilityGrid(cols, rows, gridSize, actor, allCombatants);
  const startCell = pxToGrid(actor.x, actor.y, gridSize);
  const maxWalkSteps = Math.max(1, Math.floor(actor.speedFt / 5));

  // Candidate actions from HUD
  const mainAttacksAndSpells = [
    ...hud.attacks,
    ...hud.spells.filter((s) => s.type !== 'bonus_action')
  ].filter((a) => !a.isHeal);

  const mainHeals = [
    ...hud.spells.filter((s) => s.isHeal && s.type !== 'bonus_action'),
    ...hud.actions.filter((a) => a.isHeal && a.type !== 'bonus_action')
  ];

  const bonusHeals = [
    ...hud.bonusActions.filter((b) => b.isHeal),
    ...hud.items.filter((i) => i.isHeal && i.type === 'bonus_action')
  ];

  const bonusAttacks = hud.bonusActions.filter((b) => !b.isHeal && (b.isAttack || b.damageFormula));

  // Mutable plan populated by the Behavior Tree agent
  const plan: AiTurnPlan = {
    role,
    roleLabel,
    tacticalThought: `${roleLabel} evaluating battlefield...`,
    pathWaypointsPx: [],
    finalPositionPx: { x: actor.x, y: actor.y },
    movementSpentFt: 0,
    useDash: false,
    primaryAction: null,
    bonusAction: null
  };

  if (enemies.length === 0) {
    plan.tacticalThought = 'No opposing combatants remaining.';
    return plan;
  }

  let currentEndCell: GridCoord = { ...startCell };

  // Helper to commit an A* path to `destCell`
  const commitMoveToCell = (destCell: GridCoord, stepBudget: number) => {
    const steps = findAStarPathSteps(
      startCell.col,
      startCell.row,
      destCell.col,
      destCell.row,
      stepBudget,
      walkGrid
    );
    if (steps.length > 0) {
      plan.pathWaypointsPx = steps.map((s) => ({
        x: s.col * gridSize,
        y: s.row * gridSize
      }));
      const last = steps[steps.length - 1];
      currentEndCell = last;
      plan.finalPositionPx = { x: last.col * gridSize, y: last.row * gridSize };
      plan.movementSpentFt = steps.length * 5;
    }
  };

  // Find all reachable cells within `maxWalkSteps` using BFS/A* distance check
  const reachableCells: GridCoord[] = [{ col: startCell.col, row: startCell.row }];
  for (let r = Math.max(0, startCell.row - maxWalkSteps); r <= Math.min(rows - 1, startCell.row + maxWalkSteps); r++) {
    for (let c = Math.max(0, startCell.col - maxWalkSteps); c <= Math.min(cols - 1, startCell.col + maxWalkSteps); c++) {
      if (c === startCell.col && r === startCell.row) continue;
      if (!canTokenFitAt(c, r, actor.size || 1, cols, rows, walkGrid)) continue;
      const steps = findAStarPathSteps(startCell.col, startCell.row, c, r, maxWalkSteps, walkGrid);
      if (steps.length > 0 && steps.length <= maxWalkSteps) {
        const end = steps[steps.length - 1];
        if (end.col === c && end.row === r) {
          reachableCells.push({ col: c, row: r });
        }
      }
    }
  }

  // Behavior Tree Agent bound to Mistreevous
  const btAgent = {
    ClassifyAndScanBattlefield: () => State.SUCCEEDED,

    // Priority 1: Emergency Main-Action Heal if Support ally is critical (<40% HP) or Self is critical (<30% HP) and no bonus heal
    NeedsEmergencyHeal: () => {
      if (mainHeals.length === 0) return false;
      if (role === 'support') {
        return allies.some((a) => a.currentHp / Math.max(1, a.maxHp) <= 0.45);
      }
      return actor.currentHp / Math.max(1, actor.maxHp) <= 0.28 && bonusHeals.length === 0;
    },

    PlanEmergencyHealTurn: () => {
      const healAction = mainHeals[0];
      const woundedAllies = [...allies].sort(
        (a, b) => a.currentHp / Math.max(1, a.maxHp) - b.currentHp / Math.max(1, b.maxHp)
      );
      const patient = healAction.isSelfAction ? actor : woundedAllies[0] || actor;
      const patientCell = pxToGrid(patient.x, patient.y, gridSize);
      const healRange = healAction.rangeFt || 5;

      // Find reachable cell within healRange of patient that is safest from enemies
      let bestCell = startCell;
      let bestSafety = -999;
      for (const cell of reachableCells) {
        const distToPatient = computeGridDistanceFt(
          cell.col,
          cell.row,
          actor.size || 1,
          patientCell.col,
          patientCell.row,
          patient.size || 1
        );
        if (patient.id === actor.id || distToPatient <= healRange) {
          const minEnemyDist = Math.min(
            ...enemies.map((e) => {
              const ec = pxToGrid(e.x, e.y, gridSize);
              return computeGridDistanceFt(cell.col, cell.row, actor.size || 1, ec.col, ec.row, e.size || 1);
            })
          );
          if (minEnemyDist > bestSafety) {
            bestSafety = minEnemyDist;
            bestCell = cell;
          }
        }
      }

      commitMoveToCell(bestCell, maxWalkSteps);
      plan.primaryAction = {
        action: healAction,
        targetId: patient.id,
        expectedValue: estimateAverageDiceFormula(healAction.damageFormula),
        reason: `Emergency rally on ${patient.name} (${patient.currentHp}/${patient.maxHp} HP)`
      };
      plan.tacticalThought = `${roleLabel}: Using ${healAction.name} to stabilize ${patient.name}!`;
      return State.SUCCEEDED;
    },

    // Priority 2: Artillery / Ranged Kiting when threatened in melee (<= 10 ft)
    ShouldArtilleryKite: () => {
      const hasRanged = mainAttacksAndSpells.some((a) => (a.rangeFt || 5) >= 25);
      if (!hasRanged) return false;
      const closestEnemyDist = Math.min(
        ...enemies.map((e) => {
          const ec = pxToGrid(e.x, e.y, gridSize);
          return computeGridDistanceFt(startCell.col, startCell.row, actor.size || 1, ec.col, ec.row, e.size || 1);
        })
      );
      return (role === 'artillery' || role === 'support') && closestEnemyDist <= 10;
    },

    PlanArtilleryKiteTurn: () => {
      const rangedOptions = mainAttacksAndSpells.filter((a) => (a.rangeFt || 5) >= 25);
      let bestCombo: {
        cell: GridCoord;
        action: HudActionItem;
        target: TacticalCombatantView;
        totalScore: number;
        reason: string;
      } | null = null;

      for (const cell of reachableCells) {
        const minEnemyDist = Math.min(
          ...enemies.map((e) => {
            const ec = pxToGrid(e.x, e.y, gridSize);
            return computeGridDistanceFt(cell.col, cell.row, actor.size || 1, ec.col, ec.row, e.size || 1);
          })
        );

        for (const action of rangedOptions) {
          const rangeFt = action.rangeFt || 60;
          for (const enemy of enemies) {
            const ec = pxToGrid(enemy.x, enemy.y, gridSize);
            const distToTarget = computeGridDistanceFt(
              cell.col,
              cell.row,
              actor.size || 1,
              ec.col,
              ec.row,
              enemy.size || 1
            );
            if (distToTarget <= rangeFt) {
              const { score, reason } = scoreOffensiveAction(actor, enemy, action, role, allies, gridSize);
              // Reward kiting away from melee range (ideal 20-40ft buffer)
              const kiteBonus = Math.min(30, minEnemyDist * 0.9);
              const total = score + kiteBonus;
              if (!bestCombo || total > bestCombo.totalScore) {
                bestCombo = { cell, action, target: enemy, totalScore: total, reason };
              }
            }
          }
        }
      }

      if (!bestCombo) return State.FAILED;

      commitMoveToCell(bestCombo.cell, maxWalkSteps);
      plan.primaryAction = {
        action: bestCombo.action,
        targetId: bestCombo.target.id,
        expectedValue: bestCombo.totalScore,
        reason: bestCombo.reason
      };
      plan.tacticalThought = `${roleLabel}: Kiting ${plan.movementSpentFt}ft to safe range → ${bestCombo.action.name} on ${bestCombo.target.name} (${bestCombo.reason})`;
      return State.SUCCEEDED;
    },

    // Priority 3: Standard Utility AI evaluation across all (Reachable Cell x Action x Enemy Target)
    CanMoveIntoAttackRange: () => {
      return mainAttacksAndSpells.some((action) => {
        const rangeFt = action.rangeFt || 5;
        return reachableCells.some((cell) =>
          enemies.some((e) => {
            const ec = pxToGrid(e.x, e.y, gridSize);
            return (
              computeGridDistanceFt(cell.col, cell.row, actor.size || 1, ec.col, ec.row, e.size || 1) <=
              rangeFt
            );
          })
        );
      });
    },

    PlanOptimalEngageAndAttack: () => {
      let bestOption: {
        cell: GridCoord;
        action: HudActionItem;
        target: TacticalCombatantView;
        score: number;
        reason: string;
      } | null = null;

      for (const action of mainAttacksAndSpells) {
        const rangeFt = action.rangeFt || 5;
        for (const enemy of enemies) {
          const ec = pxToGrid(enemy.x, enemy.y, gridSize);
          const { score: baseScore, reason } = scoreOffensiveAction(
            actor,
            enemy,
            action,
            role,
            allies,
            gridSize
          );

          for (const cell of reachableCells) {
            const distFt = computeGridDistanceFt(
              cell.col,
              cell.row,
              actor.size || 1,
              ec.col,
              ec.row,
              enemy.size || 1
            );
            if (distFt > rangeFt) continue;

            const moveSteps = Math.hypot(cell.col - startCell.col, cell.row - startCell.row);
            let positionalAdjust = -moveSteps * 0.6; // Slight preference for efficient paths

            if (rangeFt >= 30 && distFt >= 15) {
              positionalAdjust += 8; // Ranged attacks prefer not standing in melee
            }

            const finalScore = baseScore + positionalAdjust;
            if (!bestOption || finalScore > bestOption.score) {
              bestOption = {
                cell,
                action,
                target: enemy,
                score: finalScore,
                reason
              };
            }
          }
        }
      }

      if (!bestOption) return State.FAILED;

      commitMoveToCell(bestOption.cell, maxWalkSteps);
      plan.primaryAction = {
        action: bestOption.action,
        targetId: bestOption.target.id,
        expectedValue: bestOption.score,
        reason: bestOption.reason
      };
      plan.tacticalThought = `${roleLabel}: ${
        plan.movementSpentFt > 0 ? `A* path ${plan.movementSpentFt}ft → ` : ''
      }${bestOption.action.name} vs ${bestOption.target.name} (${bestOption.reason})`;
      return State.SUCCEEDED;
    },

    // Priority 4: Out of range of all attacks -> Use Dash (2x Speed) along A* path toward highest-value target
    PlanDashAdvanceTurn: () => {
      // Score enemies to pick the primary quarry to chase
      const defaultAtk = mainAttacksAndSpells[0];
      const rankedEnemies = [...enemies].sort((a, b) => {
        const scoreA = defaultAtk
          ? scoreOffensiveAction(actor, a, defaultAtk, role, allies, gridSize).score
          : 100 - a.currentHp;
        const scoreB = defaultAtk
          ? scoreOffensiveAction(actor, b, defaultAtk, role, allies, gridSize).score
          : 100 - b.currentHp;
        return scoreB - scoreA;
      });
      const quarry = rankedEnemies[0];
      const qc = pxToGrid(quarry.x, quarry.y, gridSize);

      // Find the empty cell adjacent to `quarry` with the shortest A* path
      let bestAdjacent: GridCoord = qc;
      let shortestLen = 999;

      for (let r = Math.max(0, qc.row - 2); r <= Math.min(rows - 1, qc.row + 2); r++) {
        for (let c = Math.max(0, qc.col - 2); c <= Math.min(cols - 1, qc.col + 2); c++) {
          if (!canTokenFitAt(c, r, actor.size || 1, cols, rows, walkGrid)) continue;
          const fullSteps = findAStarPathSteps(startCell.col, startCell.row, c, r, 40, walkGrid);
          if (fullSteps.length > 0 && fullSteps.length < shortestLen) {
            shortestLen = fullSteps.length;
            bestAdjacent = { col: c, row: r };
          }
        }
      }

      const dashMaxSteps = maxWalkSteps * 2;
      commitMoveToCell(bestAdjacent, dashMaxSteps);
      plan.useDash = true;
      plan.tacticalThought = `${roleLabel}: Target out of range — Dashing ${plan.movementSpentFt}ft along A* path toward ${quarry.name}!`;
      return State.SUCCEEDED;
    },

    // Step 5: Bonus Action Follow-up (Drink Healing Potion when <55% HP or execute Bonus Action strike)
    EvaluateBonusActionFollowup: () => {
      const hpRatio = actor.currentHp / Math.max(1, actor.maxHp);
      if (hpRatio <= 0.55 && bonusHeals.length > 0) {
        const potion = bonusHeals[0];
        plan.bonusAction = {
          action: potion,
          targetId: actor.id,
          expectedValue: estimateAverageDiceFormula(potion.damageFormula),
          reason: `Self-heal at ${Math.round(hpRatio * 100)}% HP`
        };
        return State.SUCCEEDED;
      }

      if (bonusAttacks.length > 0) {
        const bAtk = bonusAttacks[0];
        const bRange = bAtk.rangeFt || 5;
        const inRangeEnemy = enemies.find((e) => {
          const ec = pxToGrid(e.x, e.y, gridSize);
          return (
            computeGridDistanceFt(
              currentEndCell.col,
              currentEndCell.row,
              actor.size || 1,
              ec.col,
              ec.row,
              e.size || 1
            ) <= bRange
          );
        });
        if (inRangeEnemy) {
          plan.bonusAction = {
            action: bAtk,
            targetId: inRangeEnemy.id,
            expectedValue: estimateAverageDiceFormula(bAtk.damageFormula),
            reason: 'Bonus Action follow-up strike'
          };
        }
      }
      return State.SUCCEEDED;
    }
  };

  try {
    const tree = new BehaviourTree(ARENA_TACTICAL_BT_MDSL, btAgent);
    tree.step();
  } catch (err) {
    console.warn('[ArenaTacticalAI] BehaviorTree fallback triggered:', err);
    btAgent.PlanOptimalEngageAndAttack();
  }

  return plan;
}
