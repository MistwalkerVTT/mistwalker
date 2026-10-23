// src/services/ai/arenaScheduler.ts
// Turn-based Initiative Queue & Line-of-Sight Engine powered by ROT.js (rot-js)

import * as ROT from 'rot-js';

export interface SchedulerCombatantItem {
  id: string;
  name: string;
  initiative: number;
  speedFt: number;
  isAI: boolean;
  team: 'gold' | 'crimson';
}

export class ArenaTurnScheduler {
  private scheduler: any;
  private combatantMap: Map<string, SchedulerCombatantItem> = new Map();

  constructor() {
    this.scheduler = new ROT.Scheduler.Action();
  }

  /**
   * Initializes the scheduler with combatants sorted by initiative (descending)
   */
  public initialize(combatants: SchedulerCombatantItem[]) {
    this.scheduler.clear();
    this.combatantMap.clear();

    const sorted = [...combatants].sort((a, b) => b.initiative - a.initiative);
    for (const c of sorted) {
      this.combatantMap.set(c.id, c);
      // In ROT.js Action scheduler, lower action points or standard action duration acts as round cadence
      this.scheduler.add(c.id, true);
    }
  }

  /**
   * Gets the ID of the next combatant in the turn queue
   */
  public next(): string | null {
    return this.scheduler.next();
  }

  /**
   * Sets the action cost/duration spent on the current turn (default 1 round = 100 duration)
   */
  public setDuration(duration = 100) {
    this.scheduler.setDuration(duration);
  }

  /**
   * Removes a combatant (e.g. fallen in battle)
   */
  public remove(id: string) {
    this.scheduler.remove(id);
    this.combatantMap.delete(id);
  }

  /**
   * Returns all active combatants in registration order
   */
  public getActiveCombatants(): SchedulerCombatantItem[] {
    return Array.from(this.combatantMap.values());
  }

  public clear() {
    this.scheduler.clear();
    this.combatantMap.clear();
  }
}

/**
 * Line of Sight (LOS) and Field of View engine powered by ROT.js Precise Shadowcasting.
 * Ensures AI monsters respect 5e sight lines and cannot cast or shoot through solid obstacles.
 */
export class ArenaLineOfSightEngine {
  private cols: number;
  private rows: number;
  private fov: any;
  private transparencyCallback: (x: number, y: number) => boolean;

  constructor(
    cols: number,
    rows: number,
    isTransparent: (col: number, row: number) => boolean
  ) {
    this.cols = cols;
    this.rows = rows;
    this.transparencyCallback = (x: number, y: number) => {
      if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return false;
      return isTransparent(x, y);
    };
    this.fov = new ROT.FOV.PreciseShadowcasting(this.transparencyCallback);
  }

  /**
   * Checks whether origin has clear Line of Sight to target
   */
  public hasLineOfSight(
    fromCol: number,
    fromRow: number,
    toCol: number,
    toRow: number,
    maxDistanceFt = 120
  ): boolean {
    if (fromCol === toCol && fromRow === toRow) return true;

    const maxRadiusCells = Math.max(1, Math.ceil(maxDistanceFt / 5));
    let hasSight = false;

    this.fov.compute(fromCol, fromRow, maxRadiusCells, (x: number, y: number) => {
      if (x === toCol && y === toRow) {
        hasSight = true;
      }
    });

    return hasSight;
  }

  /**
   * Computes all visible cells within radius for a creature
   */
  public computeVisibleCells(
    originCol: number,
    originRow: number,
    radiusFt = 60
  ): Set<string> {
    const visible = new Set<string>();
    const maxRadiusCells = Math.max(1, Math.ceil(radiusFt / 5));

    this.fov.compute(originCol, originRow, maxRadiusCells, (x: number, y: number) => {
      visible.add(`${x},${y}`);
    });

    return visible;
  }
}
