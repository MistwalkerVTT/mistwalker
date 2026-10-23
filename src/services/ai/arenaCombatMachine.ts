// src/services/ai/arenaCombatMachine.ts
// D&D 5e Action Economy State Machine powered by XState (xstate v5)

import { createMachine, assign } from 'xstate';
import { HudActionItem } from '../../types/hud';

export interface CombatActionBudget {
  movementRemainingFt: number;
  hasAction: boolean;
  hasBonusAction: boolean;
  hasReaction: boolean;
  multiattackRemaining: number;
  multiattackQueue: HudActionItem[];
  rechargedAbilities: string[];
  spellSlots: Record<number, number>;
  isDisengaged: boolean;
  isDodging: boolean;
}

export interface ArenaTurnCombatantSnapshot {
  id: string;
  name: string;
  team: 'gold' | 'crimson';
  isAI: boolean;
  ac: number;
  currentHp: number;
  maxHp: number;
  speedFt: number;
  x: number;
  y: number;
  size: number;
  threatenedInMelee?: boolean;
}

export interface ArenaTurnMachineContext {
  combatant: ArenaTurnCombatantSnapshot;
  budget: CombatActionBudget;
  activeTargetId: string | null;
  currentTargetStrikeIndex: number;
  round: number;
  tacticalLog: string[];
}

export type ArenaTurnMachineEvent =
  | { type: 'START_TURN'; speedFt: number; rechargeEligible?: string[] }
  | { type: 'SPEND_MOVEMENT'; feet: number }
  | { type: 'USE_DASH' }
  | { type: 'USE_DISENGAGE' }
  | { type: 'USE_DODGE' }
  | { type: 'START_MULTIATTACK'; attacks: HudActionItem[]; targetId: string }
  | { type: 'RESOLVE_MULTIATTACK_STRIKE'; nextTargetId?: string }
  | { type: 'CAST_SPELL_ACTION'; action: HudActionItem; slotLevel?: number }
  | { type: 'EXECUTE_SINGLE_ATTACK'; action: HudActionItem; targetId: string }
  | { type: 'USE_BONUS_ACTION'; action: HudActionItem; targetId?: string }
  | { type: 'END_TURN' };

/**
 * Rolls 1d6 for abilities with (Recharge 5-6) or (Recharge 6)
 */
export function roll5eRechargeCheck(rechargeNotation = '5-6'): { recharged: boolean; roll: number } {
  const d6 = Math.floor(Math.random() * 6) + 1;
  const minRequired = rechargeNotation.includes('6') && !rechargeNotation.includes('5') ? 6 : 5;
  return {
    recharged: d6 >= minRequired,
    roll: d6
  };
}

/**
 * Parses Multiattack description text from SRD/DDB stat blocks into constituent strike counts.
 * e.g., "The dragon makes three attacks: one with its bite and two with its claws." -> { bite: 1, claw: 2 }
 */
export function decomposeMonsterMultiattack(
  multiattackDesc: string,
  availableAttacks: HudActionItem[]
): HudActionItem[] {
  if (!multiattackDesc || availableAttacks.length === 0) {
    return availableAttacks.slice(0, 1);
  }

  const desc = multiattackDesc.toLowerCase();
  const queue: HudActionItem[] = [];

  // Match specific named attacks mentioned in Multiattack text
  for (const atk of availableAttacks) {
    const atkNameLower = atk.name.toLowerCase();
    if (desc.includes(atkNameLower)) {
      // Check for quantity (two, three, twice)
      const twoRegex = new RegExp(`(two|2|twice)\\s+(with\\s+its\\s+)?${atkNameLower}`, 'i');
      const threeRegex = new RegExp(`(three|3)\\s+(with\\s+its\\s+)?${atkNameLower}`, 'i');
      if (threeRegex.test(desc)) {
        queue.push(atk, atk, atk);
      } else if (twoRegex.test(desc)) {
        queue.push(atk, atk);
      } else {
        queue.push(atk);
      }
    }
  }

  // If parsed cleanly, return the sequenced strikes
  if (queue.length > 0) {
    return queue;
  }

  // Fallback: Check general "two attacks" or "three attacks"
  if (desc.includes('three attacks') || desc.includes('makes three')) {
    const primary = availableAttacks[0];
    const secondary = availableAttacks[1] || primary;
    return [primary, secondary, secondary];
  } else if (desc.includes('two attacks') || desc.includes('makes two')) {
    const primary = availableAttacks[0];
    const secondary = availableAttacks[1] || primary;
    return [primary, secondary];
  }

  return availableAttacks.slice(0, 1);
}

/**
 * Creates an XState v5 State Machine enforcing the 5e Turn Lifecycle
 */
export function createArenaTurnMachine(initialContext: ArenaTurnMachineContext) {
  return createMachine({
    id: 'arenaTurnMachine',
    initial: 'turnReady',
    context: initialContext,
    states: {
      turnReady: {
        on: {
          START_TURN: {
            target: 'turnActive',
            actions: assign(({ context, event }) => {
              const recharged: string[] = [];
              const logs: string[] = [];

              if (event.rechargeEligible && event.rechargeEligible.length > 0) {
                for (const ab of event.rechargeEligible) {
                  const check = roll5eRechargeCheck('5-6');
                  if (check.recharged) {
                    recharged.push(ab);
                    logs.push(`🎲 Recharge check: rolled ${check.roll} (5-6) — ${ab} is READY!`);
                  } else {
                    logs.push(`🎲 Recharge check: rolled ${check.roll} (needs 5-6) — ${ab} not recharged.`);
                  }
                }
              }

              return {
                budget: {
                  ...context.budget,
                  movementRemainingFt: event.speedFt,
                  hasAction: true,
                  hasBonusAction: true,
                  hasReaction: true,
                  multiattackRemaining: 0,
                  multiattackQueue: [],
                  rechargedAbilities: recharged,
                  isDisengaged: false,
                  isDodging: false
                },
                tacticalLog: [...context.tacticalLog, ...logs]
              };
            })
          }
        }
      },

      turnActive: {
        initial: 'deciding',
        states: {
          deciding: {
            on: {
              SPEND_MOVEMENT: {
                actions: assign(({ context, event }) => ({
                  budget: {
                    ...context.budget,
                    movementRemainingFt: Math.max(0, context.budget.movementRemainingFt - event.feet)
                  }
                }))
              },

              USE_DASH: {
                guard: ({ context }) => context.budget.hasAction,
                actions: assign(({ context }) => ({
                  budget: {
                    ...context.budget,
                    hasAction: false,
                    movementRemainingFt: context.budget.movementRemainingFt + context.combatant.speedFt
                  },
                  tacticalLog: [...context.tacticalLog, `${context.combatant.name} used Dash (+${context.combatant.speedFt} ft movement)!`]
                }))
              },

              USE_DISENGAGE: {
                guard: ({ context }) => context.budget.hasAction || context.budget.hasBonusAction,
                actions: assign(({ context }) => ({
                  budget: {
                    ...context.budget,
                    hasAction: false,
                    isDisengaged: true
                  },
                  tacticalLog: [...context.tacticalLog, `${context.combatant.name} Disengaged (movement won't provoke opportunity attacks).`]
                }))
              },

              USE_DODGE: {
                guard: ({ context }) => context.budget.hasAction,
                actions: assign(({ context }) => ({
                  budget: {
                    ...context.budget,
                    hasAction: false,
                    isDodging: true
                  },
                  tacticalLog: [...context.tacticalLog, `${context.combatant.name} Dodges (attacks against have disadvantage).`]
                }))
              },

              START_MULTIATTACK: {
                guard: ({ context }) => context.budget.hasAction,
                target: 'resolvingMultiattack',
                actions: assign(({ context, event }) => ({
                  budget: {
                    ...context.budget,
                    hasAction: false,
                    multiattackRemaining: event.attacks.length,
                    multiattackQueue: [...event.attacks]
                  },
                  activeTargetId: event.targetId,
                  currentTargetStrikeIndex: 0,
                  tacticalLog: [
                    ...context.tacticalLog,
                    `⚔️ Multiattack declared: ${event.attacks.map((a) => a.name).join(' + ')} (${event.attacks.length} strikes)!`
                  ]
                }))
              },

              EXECUTE_SINGLE_ATTACK: {
                guard: ({ context }) => context.budget.hasAction,
                actions: assign(({ context, event }) => ({
                  budget: {
                    ...context.budget,
                    hasAction: false
                  },
                  tacticalLog: [...context.tacticalLog, `Single Action Attack: ${event.action.name}`]
                }))
              },

              CAST_SPELL_ACTION: {
                guard: ({ context }) => context.budget.hasAction,
                actions: assign(({ context, event }) => {
                  const slots = { ...context.budget.spellSlots };
                  const lvl = event.slotLevel ?? event.action.level ?? 0;
                  if (lvl > 0 && slots[lvl] !== undefined) {
                    slots[lvl] = Math.max(0, slots[lvl] - 1);
                  }
                  return {
                    budget: {
                      ...context.budget,
                      hasAction: false,
                      spellSlots: slots
                    },
                    tacticalLog: [
                      ...context.tacticalLog,
                      `Casts Spell: ${event.action.name}${lvl > 0 ? ` (consumed Level ${lvl} slot)` : ' (Cantrip)'}`
                    ]
                  };
                })
              },

              USE_BONUS_ACTION: {
                guard: ({ context }) => context.budget.hasBonusAction,
                actions: assign(({ context, event }) => ({
                  budget: {
                    ...context.budget,
                    hasBonusAction: false
                  },
                  tacticalLog: [...context.tacticalLog, `Bonus Action: ${event.action.name}`]
                }))
              },

              END_TURN: {
                target: '#arenaTurnMachine.turnEnded'
              }
            }
          },

          resolvingMultiattack: {
            on: {
              RESOLVE_MULTIATTACK_STRIKE: [
                {
                  // If strikes still remain, decrement and continue
                  guard: ({ context }) => context.budget.multiattackRemaining > 1,
                  actions: assign(({ context, event }) => ({
                    budget: {
                      ...context.budget,
                      multiattackRemaining: context.budget.multiattackRemaining - 1
                    },
                    activeTargetId: event.nextTargetId ?? context.activeTargetId,
                    currentTargetStrikeIndex: context.currentTargetStrikeIndex + 1
                  }))
                },
                {
                  // Final strike of Multiattack completed -> return to deciding
                  target: 'deciding',
                  actions: assign(({ context }) => ({
                    budget: {
                      ...context.budget,
                      multiattackRemaining: 0,
                      multiattackQueue: []
                    },
                    activeTargetId: null,
                    currentTargetStrikeIndex: 0
                  }))
                }
              ],
              END_TURN: {
                target: '#arenaTurnMachine.turnEnded'
              }
            }
          }
        }
      },

      turnEnded: {
        type: 'final'
      }
    }
  });
}
