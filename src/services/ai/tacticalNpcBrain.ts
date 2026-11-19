import type { SceneToken, RoomAnnotation } from '../../types';
import type { WildShapeBeastForm } from '../../types/wildShape';

export interface TacticalTurnDecision {
  actorId: string;
  targetTokenId: string | null;
  moveToPosition: { x: number; y: number };
  retreatToPosition?: { x: number; y: number };
  selectedAttackName: string;
  hasAdvantage: boolean;
  advantageReason?: string;
  triggeredCharge: boolean;
  usedFlybyRetreat: boolean;
  tacticalSummary: string;
}

export interface EvaluateNpcTurnParams {
  actor: SceneToken;
  allTokens: SceneToken[];
  annotations?: RoomAnnotation[];
  beastProfile?: WildShapeBeastForm | null;
  gridSize?: number;
  isAllyOfPlayers?: boolean;
}

/**
 * Ray-casting point-in-polygon check for flat [x1, y1, x2, y2, ...] hazard arrays
 */
function isPointInHazardPolygon(px: number, py: number, annotations: RoomAnnotation[] = []): boolean {
  for (const zone of annotations) {
    const isHazard =
      zone.type === 'hazard' ||
      zone.isHazard === true ||
      /hazard|spike|lava|acid|pit|trap/i.test(`${zone.label} ${zone.roomName ?? ''}`);
    if (!isHazard || !zone.polygonPoints || zone.polygonPoints.length < 6) continue;

    let inside = false;
    const pts = zone.polygonPoints;
    const numVertices = Math.floor(pts.length / 2);
    for (let i = 0, j = numVertices - 1; i < numVertices; j = i++) {
      const xi = pts[i * 2];
      const yi = pts[i * 2 + 1];
      const xj = pts[j * 2];
      const yj = pts[j * 2 + 1];
      const intersect =
        yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-10) + xi;
      if (intersect) inside = !inside;
    }
    if (inside) return true;
  }
  return false;
}

/**
 * Checks whether a straight-line segment between two center points crosses any hazard polygon.
 */
function segmentCrossesHazard(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  annotations: RoomAnnotation[],
  samples = 6
): boolean {
  if (annotations.length === 0) return false;
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const sx = ax + (bx - ax) * t;
    const sy = ay + (by - ay) * t;
    if (isPointInHazardPolygon(sx, sy, annotations)) {
      return true;
    }
  }
  return false;
}

/**
 * Returns center coordinates of a token in world pixels
 */
function getTokenCenter(token: SceneToken, gridSize: number): { x: number; y: number } {
  const half = ((token.size ?? 1) * gridSize) / 2;
  return { x: token.x + half, y: token.y + half };
}

/**
 * Distance in feet between two tokens (edge-to-edge approximation)
 */
function getDistanceFt(a: SceneToken, b: SceneToken, gridSize: number): number {
  const ca = getTokenCenter(a, gridSize);
  const cb = getTokenCenter(b, gridSize);
  const centerDistPx = Math.hypot(cb.x - ca.x, cb.y - ca.y);
  const combinedRadiiPx = (((a.size ?? 1) + (b.size ?? 1)) * gridSize) / 2;
  const edgeDistPx = Math.max(0, centerDistPx - combinedRadiiPx);
  return Math.round((edgeDistPx / gridSize) * 5);
}

/**
 * Checks if a creature has a specific trait by name in its beastProfile or customMonsterData
 */
function hasCreatureTrait(
  actor: SceneToken,
  beastProfile: WildShapeBeastForm | null | undefined,
  traitKeyword: string
): boolean {
  const lowerKey = traitKeyword.toLowerCase();
  if (beastProfile?.traits?.some((t) => t.name.toLowerCase().includes(lowerKey))) {
    return true;
  }
  const customTraits = (actor as any).customMonsterData?.traits || [];
  if (
    Array.isArray(customTraits) &&
    customTraits.some((t: any) => String(t?.name || '').toLowerCase().includes(lowerKey))
  ) {
    return true;
  }
  return false;
}

/**
 * Evaluates and returns the optimal D&D 2024 tactical movement and attack decision for an NPC or Summoned Companion.
 */
export function evaluateTacticalNpcTurn({
  actor,
  allTokens,
  annotations = [],
  beastProfile,
  gridSize = 70,
  isAllyOfPlayers = false,
}: EvaluateNpcTurnParams): TacticalTurnDecision {
  const speedFt = actor.speed ?? beastProfile?.walkSpeedFt ?? 30;
  const maxMovePx = (speedFt / 5) * gridSize;
  const isAirborne = Boolean(actor.isFlying || beastProfile?.flySpeedFt);

  const hasPackTactics = hasCreatureTrait(actor, beastProfile, 'pack tactics');
  const hasCharge =
    hasCreatureTrait(actor, beastProfile, 'charge') ||
    hasCreatureTrait(actor, beastProfile, 'pounce');
  const hasFlyby = hasCreatureTrait(actor, beastProfile, 'flyby');

  // 1. Partition alive enemies and allies
  const aliveTokens = allTokens.filter((t) => t.id !== actor.id && (t.currentHp ?? t.hp ?? 1) > 0);
  const enemies = aliveTokens.filter((t) => {
    const isPlayerOrAlly = Boolean((t as any).isPlayer || (t as any).claimedBy);
    return isAllyOfPlayers ? !isPlayerOrAlly : isPlayerOrAlly;
  });
  const allies = aliveTokens.filter((t) => !enemies.some((e) => e.id === t.id));

  // Fallback if no explicit faction tags exist: treat any other living token as valid opponent
  const candidateTargets = enemies.length > 0 ? enemies : aliveTokens;

  if (candidateTargets.length === 0) {
    return {
      actorId: actor.id,
      targetTokenId: null,
      moveToPosition: { x: actor.x, y: actor.y },
      selectedAttackName: 'Hold Position',
      hasAdvantage: false,
      triggeredCharge: false,
      usedFlybyRetreat: false,
      tacticalSummary: `${actor.name} scans the battlefield (no active targets).`,
    };
  }

  // 2. Score each target based on distance, remaining HP, and Pack Tactics synergy
  let bestTarget = candidateTargets[0];
  let bestScore = -Infinity;
  let packTacticsActiveOnBest = false;

  for (const target of candidateTargets) {
    const distFt = getDistanceFt(actor, target, gridSize);
    const targetHp = target.currentHp ?? target.hp ?? 20;

    // Base score favors reachable targets within 1 turn of movement
    let score = distFt <= speedFt + 5 ? 100 - distFt : 25 - distFt;

    // Bonus for finishing off low-HP targets
    if (targetHp <= 12) score += 20;

    // Pack Tactics Check: Is at least one conscious ally within 5 ft of this target?
    const allyAdjacent = allies.some((ally) => getDistanceFt(ally, target, gridSize) <= 5);
    if (hasPackTactics && allyAdjacent) {
      score += 45;
    }

    if (score > bestScore) {
      bestScore = score;
      bestTarget = target;
      packTacticsActiveOnBest = hasPackTactics && allyAdjacent;
    }
  }

  // 3. Compute optimal melee attack position around bestTarget (avoiding ground hazards if not flying)
  const actorCenter = getTokenCenter(actor, gridSize);
  const targetCenter = getTokenCenter(bestTarget, gridSize);
  const actorHalfPx = ((actor.size ?? 1) * gridSize) / 2;
  const desiredContactDistPx = (((actor.size ?? 1) + (bestTarget.size ?? 1)) * gridSize) / 2;

  const baseAngle = Math.atan2(actorCenter.y - targetCenter.y, actorCenter.x - targetCenter.x);
  const targetInHazard = !isAirborne && isPointInHazardPolygon(targetCenter.x, targetCenter.y, annotations);

  const angleOffsets = [
    0,
    Math.PI / 4,
    -Math.PI / 4,
    Math.PI / 2,
    -Math.PI / 2,
    (3 * Math.PI) / 4,
    -(3 * Math.PI) / 4,
    Math.PI,
  ];

  const minChargeRunUpPx = (20 / 5) * gridSize; // 20 ft straight-line run-up
  let chosenContactCenter: { x: number; y: number } | null = null;
  let chosenContactDistPx = Infinity;
  let avoidedHazard = false;

  for (const offset of angleOffsets) {
    const angle = baseAngle + offset;
    const candCx = targetCenter.x + Math.cos(angle) * desiredContactDistPx;
    const candCy = targetCenter.y + Math.sin(angle) * desiredContactDistPx;

    if (!isAirborne && !targetInHazard) {
      const endpointUnsafe = isPointInHazardPolygon(candCx, candCy, annotations);
      const pathUnsafe = segmentCrossesHazard(actorCenter.x, actorCenter.y, candCx, candCy, annotations);
      if (endpointUnsafe || pathUnsafe) {
        avoidedHazard = true;
        continue;
      }
    }

    const moveDistPx = Math.hypot(candCx - actorCenter.x, candCy - actorCenter.y);
    if (!chosenContactCenter || moveDistPx < chosenContactDistPx) {
      chosenContactCenter = { x: candCx, y: candCy };
      chosenContactDistPx = moveDistPx;
    }
  }

  // Fallback if all contact positions were inside/behind a hazard
  if (!chosenContactCenter) {
    chosenContactCenter = {
      x: targetCenter.x + Math.cos(baseAngle) * desiredContactDistPx,
      y: targetCenter.y + Math.sin(baseAngle) * desiredContactDistPx,
    };
    chosenContactDistPx = Math.hypot(
      chosenContactCenter.x - actorCenter.x,
      chosenContactCenter.y - actorCenter.y
    );
  }

  // Determine actual destination center within maxMovePx
  let moveCenter = { ...chosenContactCenter };
  let reachedMelee = chosenContactDistPx <= maxMovePx + 2;

  if (!reachedMelee && chosenContactDistPx > 0) {
    const dirAngle = Math.atan2(
      chosenContactCenter.y - actorCenter.y,
      chosenContactCenter.x - actorCenter.x
    );
    const steerOffsets = [0, Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2];
    let steered = false;

    for (const steer of steerOffsets) {
      const testAngle = dirAngle + steer;
      const stepCx = actorCenter.x + Math.cos(testAngle) * maxMovePx;
      const stepCy = actorCenter.y + Math.sin(testAngle) * maxMovePx;
      if (
        isAirborne ||
        targetInHazard ||
        (!isPointInHazardPolygon(stepCx, stepCy, annotations) &&
          !segmentCrossesHazard(actorCenter.x, actorCenter.y, stepCx, stepCy, annotations))
      ) {
        moveCenter = { x: stepCx, y: stepCy };
        if (steer !== 0) avoidedHazard = true;
        steered = true;
        break;
      }
    }

    if (!steered) {
      moveCenter = {
        x: actorCenter.x + Math.cos(dirAngle) * maxMovePx,
        y: actorCenter.y + Math.sin(dirAngle) * maxMovePx,
      };
    }
  }

  const moveDistUsedPx = Math.hypot(moveCenter.x - actorCenter.x, moveCenter.y - actorCenter.y);

  // 4. Charge / Pounce Momentum Vectoring (20-ft straight-line run-up into melee contact)
  const triggeredCharge =
    hasCharge &&
    reachedMelee &&
    moveDistUsedPx >= minChargeRunUpPx - 2 &&
    (isAirborne ||
      targetInHazard ||
      !segmentCrossesHazard(actorCenter.x, actorCenter.y, moveCenter.x, moveCenter.y, annotations));

  // 5. Flyby Hit-and-Run Retreat (use remaining movement to exit melee reach safely)
  let retreatToPosition: { x: number; y: number } | undefined;
  let usedFlybyRetreat = false;

  if (hasFlyby && isAirborne && reachedMelee) {
    const remainingMovePx = Math.max(0, maxMovePx - moveDistUsedPx);
    if (remainingMovePx >= gridSize) {
      const retreatAngle = Math.atan2(
        moveCenter.y - targetCenter.y,
        moveCenter.x - targetCenter.x
      );
      const retreatCx = moveCenter.x + Math.cos(retreatAngle) * remainingMovePx;
      const retreatCy = moveCenter.y + Math.sin(retreatAngle) * remainingMovePx;
      retreatToPosition = {
        x: Math.round(retreatCx - actorHalfPx),
        y: Math.round(retreatCy - actorHalfPx),
      };
      usedFlybyRetreat = true;
    }
  }

  // 6. Select primary attack name
  const selectedAttackName =
    beastProfile?.attacks?.[0]?.name ||
    (actor as any).customMonsterData?.actions?.[0]?.name ||
    'Melee Strike';

  const tacticalNotes: string[] = [];
  if (packTacticsActiveOnBest) tacticalNotes.push('Pack Tactics Advantage');
  if (triggeredCharge) tacticalNotes.push('20ft Charge Momentum');
  if (usedFlybyRetreat) tacticalNotes.push('Flyby Retreat');
  if (avoidedHazard) tacticalNotes.push('Hazard Avoidance');

  const tacticalSummary = `${actor.name} targets ${bestTarget.name} with ${selectedAttackName}${
    tacticalNotes.length > 0 ? ` (${tacticalNotes.join(', ')})` : ''
  }.`;

  return {
    actorId: actor.id,
    targetTokenId: bestTarget.id,
    moveToPosition: {
      x: Math.round(moveCenter.x - actorHalfPx),
      y: Math.round(moveCenter.y - actorHalfPx),
    },
    retreatToPosition,
    selectedAttackName,
    hasAdvantage: packTacticsActiveOnBest,
    advantageReason: packTacticsActiveOnBest ? 'Pack Tactics (ally within 5 ft)' : undefined,
    triggeredCharge,
    usedFlybyRetreat,
    tacticalSummary,
  };
}
